// ROCKIN · Bateria: pantalles i flux del joc.

import { audioContext, resumeAudio, loadSet, drum, setExtraLatency, outputLatencyMs, heardTime, click, stopAll, outputLevel } from './audio.js';
import { BANDS, BAND_IDS, BAND_SETS, bandChords, bandKeyName, chordFromSymbol } from './band.js';
import { CARDS, card as cardById, cardLabel, PIECES, CLS_NAME, LEVELS, levelOf, ALL_MISSIONS, defaultBand, GROOVE_FOR_BREAK, lanesOf, barNotes, LANE_LABEL, LANE_COLOR } from './cards.js';
import { createSession } from './session.js';
import { createTrainer, LENS } from './trainer.js';
import { createInput } from './input.js';
import { createLanes } from './lanes.js';
import { createKit } from './kit.js';
import { createCardView, renderCardSVG } from './cardview.js';
import { createNotation } from './notation.js';
import * as store from './store.js';
import { STYLES, styleOf } from './styles.js';
import { savedCode, saveCode, listLibrary, loadLibrarySong, errorText, songFromLibrary } from './library.js';

const $ = (id) => document.getElementById(id);
const esc = (t) => String(t ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ---- Estat ------------------------------------------------------------------------------------------------
const S = {
  view: 'home',
  prevView: 'home',
  play: null, // configuració de la partida oberta
  session: null,
  raf: null,
  hasMidi: false,
  lastPoorFor: null,
};
window.rockinDrums = S; // per a les proves (vegeu tools/)

// ---- Entrada --------------------------------------------------------------------------------------------
const input = createInput({
  onHit: handleHit,
  onDevices: showDevices,
  getCustomMap: () => store.settings().map,
});

function mySoundOn() {
  const v = store.settings().mySound;
  return v == null ? !S.hasMidi : v;
}

function handleHit(msg) {
  // El so del cop, el primer de tot: cap altra feina abans.
  if (msg.piece && mySoundOn()) drum(msg.piece, audioContext().currentTime, { vel: msg.vel, dest: 'me' });
  resumeAudio();
  if (!msg.piece) {
    $('setup-last').textContent = `Nota ${msg.note}: el joc no sap quina peça és. Fes «Aprèn la meva bateria».`;
    toast(`Nota MIDI ${msg.note} desconeguda: configura la bateria (⚙️).`);
    return;
  }
  if (S.view === 'setup') {
    setupKit.flash(msg.piece, 'me');
    $('setup-last').textContent = `${msg.note != null ? `Nota ${msg.note} → ` : ''}${PIECES[msg.piece].name}${msg.vel < 0.5 ? ' (fluix)' : ''}`;
    latencyTap(msg);
  }
  if (S.view !== 'play') return;
  kit.flash(msg.piece, 'me', 140);
  const s = S.session;
  if (!s || s.finished) return;
  const r = s.hit(msg.piece, msg.perf, msg.vel);
  if (!r) return;
  if (r.kind === 'free') return;
  lanes.addMark(msg.piece, r.time, r.kind);
  S.judged = (S.judged ?? 0) + 1;
  // Mentre la banda calla a l'entrenador de tempo, cap pista: ni veredictes ni colors.
  if (S.hiding) return;
  showVerdict(r);
  if (r.exp) {
    const cv = viewFor(r.exp.card);
    cv?.markAt(r.exp.piece, r.exp.step, r.kind === 'wrong' ? 'wrong' : r.kind);
    if (r.dt != null && r.kind !== 'wrong') pushTimeDot(r.dt * 1000, r.kind);
  }
  kit.flash(msg.piece, r.kind === 'perfect' || r.kind === 'good' ? 'good' : 'bad', 220);
}

function showDevices(st) {
  S.hasMidi = st.devices.length > 0;
  const pill = $('midi-pill');
  pill.classList.toggle('ok', S.hasMidi);
  pill.querySelector('span').textContent = S.hasMidi ? st.devices.join(', ') : st.error ? 'Sense bateria MIDI' : 'Sense bateria: teclat';
  $('setup-devices').textContent = st.error ?? (S.hasMidi ? `Connectada: ${st.devices.join(', ')}.` : 'No hi ha cap bateria connectada. Connecta-la per USB i espera uns segons (o fes servir el teclat).');
  $('my-sound').checked = mySoundOn();
  kit.showKeys(!S.hasMidi);
}

// ---- Vistes -------------------------------------------------------------------------------------------------
function go(view) {
  if (view === 'back') view = S.prevView && S.prevView !== 'setup' ? S.prevView : 'home';
  if (S.view === 'play' && view !== 'play') stopSession();
  if (view !== S.view) S.prevView = S.view;
  S.view = view;
  for (const v of document.querySelectorAll('.view')) v.hidden = v.id !== `v-${view}`;
  window.scrollTo(0, 0);
  if (view === 'home') renderHome();
  if (view === 'map') renderMap();
  if (view === 'free') renderFree();
  if (view === 'lib') renderLib();
  if (view === 'setup') renderSetup();
  if (view === 'tempo') renderTempo();
  if (view === 'styles') renderStyles();
  if (view === 'profile') renderProfile();
  if (view === 'play') requestAnimationFrame(() => { lanes.resize(); drawIdle(); });
  requestAnimationFrame(() => focusStart(view));
}

document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-go]');
  if (b) { e.preventDefault(); go(b.dataset.go); }
});
$('home-link').addEventListener('click', (e) => { e.preventDefault(); go('home'); });
$('midi-pill').addEventListener('click', () => go('setup'));
$('player-chip').addEventListener('click', () => { S.changing = true; go('home'); $('who-name').focus(); });
$('my-sound').addEventListener('change', (e) => { store.settings().mySound = e.target.checked; store.save(); });

let toastTimer = null;
function toast(text) {
  let t = document.querySelector('.toast');
  if (!t) { t = document.createElement('div'); t.className = 'toast'; document.body.appendChild(t); }
  t.textContent = text;
  t.classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('on'), Math.max(3200, text.length * 55));
}

// ---- Inici --------------------------------------------------------------------------------------------------
function renderHome() {
  const cur = store.currentName();
  const list = $('who-list');
  list.innerHTML = '';
  for (const name of store.players()) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `who-btn${name === cur ? ' on' : ''}`;
    const stars = Object.values(store.player(name).missions).reduce((a, m) => a + (m.stars || 0), 0);
    b.innerHTML = `<b>${esc(name)}</b><small>${stars} ★</small>`;
    b.addEventListener('click', () => { store.setCurrent(name); S.changing = false; renderHome(); focusDoors(); });
    list.appendChild(b);
  }
  $('who').hidden = !!cur && !S.changing;
  $('who-short').hidden = !cur || S.changing;
  $('who-current').textContent = cur ?? '';
  $('doors').hidden = !cur || S.changing;
  $('menu-keys').hidden = !cur || S.changing;
  const chip = $('player-chip');
  chip.hidden = !cur;
  chip.querySelector('span').textContent = cur ?? '';
  if (cur) {
    const next = recommended();
    const c = cardById(next);
    const lv = levelOf(next);
    $('door-continue-sub').textContent = `${cur}, et toca: nivell ${lv.id} · ${cardLabel(c)}${c.title ? ' · ' + c.title : ''}`;
  }
}

$('who-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const name = $('who-name').value.trim();
  if (!name) return;
  store.setCurrent(name);
  S.changing = false;
  $('who-name').value = '';
  renderHome();
  focusDoors();
});
$('who-change').addEventListener('click', () => { S.changing = true; renderHome(); $('who-name').focus(); });
function focusDoors() {
  $('doors').scrollIntoView({ behavior: 'smooth', block: 'center' });
  $('door-continue').focus({ preventScroll: true });
}
$('door-continue').addEventListener('click', () => openMission(recommended()));

/** El camí: el primer repte que encara no té dues estrelles. */
function recommended() {
  for (const id of ALL_MISSIONS) if ((store.mission(id)?.stars ?? 0) < 2) return id;
  return ALL_MISSIONS[ALL_MISSIONS.length - 1];
}

// ---- Camí -----------------------------------------------------------------------------------------------------
function thumb(c) {
  return c.img ? `<img src="${c.img}" alt="" loading="lazy">` : renderCardSVG(c);
}
const starText = (n) => '★'.repeat(n) + '☆'.repeat(3 - n);
/** Un patró queda desbloquejat quan l'has tocat amb ★★ o més (al camí o a l'Inspirador d'estils). */
function starsFor(id) {
  const p = store.player();
  return Math.max(p?.missions[id]?.stars ?? 0, p?.styleCards?.[id]?.stars ?? 0);
}
const unlocked = (id) => starsFor(id) >= 2;
const ALL_PATTERNS = () => [...ALL_MISSIONS, ...STYLES.flatMap((st) => st.cards.map((c) => c.id))];
const lockClass = (id) => (unlocked(id) ? ' unlocked' : ' locked');
const lockBadge = (id) => (unlocked(id) ? '<span class="lock-badge" title="Patró desbloquejat">🔓</span>' : '');

function renderMap() {
  const next = recommended();
  const lv = levelOf(next);
  $('level-pill').innerHTML = `El teu nivell · <b>${lv.id} de ${LEVELS.length}</b> · ${esc(lv.name)}`;
  $('level-pill').onclick = () => document.getElementById(`lv-${lv.id}`)?.scrollIntoView({ behavior: 'smooth' });
  const root = $('map-levels');
  root.innerHTML = '';
  for (const L of LEVELS) {
    const done = L.missions.filter((id) => (store.mission(id)?.stars ?? 0) >= 2).length;
    const sec = document.createElement('section');
    sec.className = 'level';
    sec.id = `lv-${L.id}`;
    sec.innerHTML = `<header><h2><span class="lv-num">${L.id}</span> ${esc(L.name)}</h2><p>${esc(L.intro)}</p><p class="muted small">Amb el teu grup: ${esc(L.band)} · ${done} de ${L.missions.length} reptes amb ★★</p></header>`;
    const grid = document.createElement('div');
    grid.className = 'tiles';
    for (const id of L.missions) {
      const c = cardById(id);
      const m = store.mission(id);
      const t = document.createElement('button');
      t.type = 'button';
      t.className = `tile${id === next ? ' next' : ''}${m?.stars ? ' done' : ''}${lockClass(id)}`;
      t.innerHTML = `<div class="tile-img">${thumb(c)}${lockBadge(id)}</div><div class="tile-txt"><b>${esc(cardLabel(c))}</b><small>${esc(c.title || '')}</small><span class="tile-stars">${starText(m?.stars ?? 0)}${m?.tempo ? ` · ${m.tempo}` : ''}</span></div>${id === next ? '<span class="badge">Et toca</span>' : ''}`;
      t.addEventListener('click', () => openMission(id));
      grid.appendChild(t);
    }
    sec.appendChild(grid);
    root.appendChild(sec);
  }
}

// ---- Toca amb la banda ------------------------------------------------------------------------------------------
function renderFree() {
  const root = $('free-cards');
  root.innerHTML = '';
  for (const L of LEVELS) {
    const h = document.createElement('h3');
    h.textContent = `${L.id} · ${L.name}`;
    root.appendChild(h);
    const grid = document.createElement('div');
    grid.className = 'tiles small';
    for (const id of L.missions) {
      const c = cardById(id);
      const t = document.createElement('button');
      t.type = 'button';
      t.className = `tile${lockClass(id)}`;
      t.innerHTML = `<div class="tile-img">${thumb(c)}${lockBadge(id)}</div><div class="tile-txt"><b>${esc(cardLabel(c))}</b><small>${esc(c.title || '')}</small></div>`;
      t.addEventListener('click', () => openFree(id));
      grid.appendChild(t);
    }
    root.appendChild(grid);
  }  const h = document.createElement('h3');
  h.textContent = 'Estils';
  root.appendChild(h);
  cardTiles(root, STYLES.flatMap((st) => st.cards.map((c) => c.id)), (id) => { openFree(id); const st = styleOf(id); if (st) { S.play.band = st.band; $('band-sel').value = st.band; } });
}

// ---- Biblioteca -------------------------------------------------------------------------------------------------
function renderLib() {
  $('lib-code').value = savedCode();
  if (savedCode() && !$('lib-list').children.length) openLibrary(savedCode());
}
$('lib-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const code = $('lib-code').value.trim();
  if (!code) { $('lib-msg').textContent = errorText(new Error('sense-codi')); return; }
  openLibrary(code);
});

async function openLibrary(code) {
  $('lib-msg').textContent = 'Obrint la biblioteca…';
  $('lib-list').innerHTML = '';
  try {
    const list = await listLibrary(code);
    saveCode(code);
    $('lib-msg').textContent = list.length ? `${list.length} cançons. Les que tenen 🥁 porten patró de bateria.` : 'La biblioteca és buida.';
    for (const it of list) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'lib-item';
      const drums = (it.instruments ?? []).includes('bateria');
      b.innerHTML = `<b>${esc(it.titol || it.nom)}</b><small>${esc(it.artista || '')}${it.autor ? ' · ' + esc(it.autor) : ''}</small>${drums ? '<span class="lib-drums" title="Té patró de bateria">🥁</span>' : ''}`;
      b.addEventListener('click', async () => {
        $('lib-msg').textContent = `Obrint «${it.titol || it.nom}»…`;
        try {
          const song = await loadLibrarySong(code, it.id);
          const spec = songFromLibrary(song, it, { chordFromSymbol });
          $('lib-msg').textContent = '';
          openSong(spec);
        } catch (err) {
          $('lib-msg').textContent = errorText(err);
        }
      });
      $('lib-list').appendChild(b);
    }
  } catch (err) {
    $('lib-msg').textContent = errorText(err);
  }
}

// ---- Configuració ------------------------------------------------------------------------------------------------
let setupKit = null;
const LEARN_ORDER = ['kk', 'sn', 'hh', 'oh', 'crash', 'ride', 't1', 't2', 't3', 'pedal'];
let learnIdx = -1;

function renderSetup() {
  $('lat-range').value = store.settings().latency;
  $('lat-val').textContent = `${store.settings().latency} ms`;
  try { $('lat-base').textContent = outputLatencyMs(); } catch { /* */ }
  $('low-lat').checked = store.settings().lowLatency !== false;
}

$('learn-start').addEventListener('click', () => { learnIdx = 0; learnStep(); });
$('learn-skip').addEventListener('click', () => { learnIdx++; learnStep(); });
$('learn-cancel').addEventListener('click', () => { learnIdx = -1; input.cancelLearn(); $('learn-box').hidden = true; });
$('learn-reset').addEventListener('click', () => { store.settings().map = {}; store.save(); toast('Tornem a les notes de fàbrica (General MIDI i Roland).'); });

function learnStep() {
  if (learnIdx < 0 || learnIdx >= LEARN_ORDER.length) {
    $('learn-box').hidden = true;
    if (learnIdx >= LEARN_ORDER.length) toast('Fet! El joc ja coneix la teva bateria.');
    learnIdx = -1;
    return;
  }
  const piece = LEARN_ORDER[learnIdx];
  $('learn-box').hidden = false;
  $('learn-text').innerHTML = `Toca <b>${esc(CLS_NAME[PIECES[piece].cls] ?? PIECES[piece].name)}</b>${piece === 'oh' ? ' amb el pedal aixecat (obert)' : piece === 'pedal' ? ' (trepitja el pedal)' : ''}. <small>(${learnIdx + 1} de ${LEARN_ORDER.length})</small>`;
  setupKit.flash(piece, 'hint', 1200);
  input.learnNext((msg) => {
    if (msg.note != null) {
      store.settings().map[msg.note] = piece;
      store.save();
      $('setup-last').textContent = `Nota ${msg.note} → ${PIECES[piece].name} ✓`;
    }
    learnIdx++;
    learnStep();
  });
}

// Prova de retard: 4 clics d'avís + 8 per tocar.
let latTest = null;
$('lat-test').addEventListener('click', async () => {
  await resumeAudio();
  await loadSet('bateria');
  const ctx = audioContext();
  const spb = 60 / 90;
  const t0 = ctx.currentTime + 0.4;
  const times = [];
  for (let i = 0; i < 12; i++) {
    const t = t0 + i * spb;
    if (i < 4) drum('stick', t); else { click(t, true); times.push(t); }
  }
  latTest = { times, offsets: [] };
  $('lat-status').textContent = 'Escolta els 4 d’avís i toca la caixa amb els 8 següents…';
  setTimeout(() => {
    const o = latTest?.offsets ?? [];
    latTest = null;
    if (o.length < 5) { $('lat-status').textContent = 'No han arribat prou cops. Torna-ho a provar.'; return; }
    o.sort((a, b) => a - b);
    const median = o[Math.floor(o.length / 2)];
    const val = Math.round((store.settings().latency + median) / 5) * 5;
    store.settings().latency = Math.max(-60, Math.min(300, val));
    store.save();
    setExtraLatency(store.settings().latency);
    renderSetup();
    $('lat-status').textContent = Math.abs(median) < 15 ? `Perfecte: el retard ja estava bé (${Math.round(median)} ms).` : `Ajustat: ${store.settings().latency} ms.`;
  }, (0.4 + 12 * spb + 0.8) * 1000);
});
function latencyTap(msg) {
  if (!latTest) return;
  const t = heardTime(msg.perf);
  let best = null;
  for (const x of latTest.times) if (!best || Math.abs(t - x) < Math.abs(t - best)) best = x;
  if (best != null && Math.abs(t - best) < 0.3) latTest.offsets.push((t - best) * 1000);
}
$('low-lat').addEventListener('change', (e) => { store.settings().lowLatency = e.target.checked; store.save(); toast('Recarrega la pàgina (Cmd+R) perquè el canvi faci efecte.'); });
$('lat-range').addEventListener('input', (e) => {
  store.settings().latency = Number(e.target.value);
  store.save();
  setExtraLatency(store.settings().latency);
  $('lat-val').textContent = `${store.settings().latency} ms`;
});

// ---- Partida -------------------------------------------------------------------------------------------------------
const lanes = createLanes($('lanes'));
const notation = createNotation($('score-wrap'));
const kit = createKit($('kit'), { onTap: (piece, perf) => input.tap(piece, perf) });
let cardViews = []; // [{ id, view, el }]
const viewFor = (cardId) => cardViews.find((v) => v.id === cardId)?.view ?? null;
window.addEventListener('resize', () => { lanes.resize(); if (!S.session) drawIdle(); });

for (const id of BAND_IDS) {
  const o = document.createElement('option');
  o.value = id;
  o.textContent = `${BANDS[id].name} · ${bandKeyName(id)}`;
  $('band-sel').appendChild(o);
}

/** Obre un repte del camí. */
function openMission(cardId) {
  const c = cardById(cardId);
  const L = levelOf(cardId);
  const p = store.player();
  const m = store.mission(cardId);
  const brk = c.brk;
  S.play = {
    mode: 'mission',
    cardId,
    level: L,
    cards: brk ? [cardById(GROOVE_FOR_BREAK), c] : [c],
    tempo: m?.lastTempo || L.tempo,
    band: p?.bands[cardId] ?? defaultBand(cardId),
    supports: p?.supports[L.id] ?? L.supports,
    viewType: p?.viewType ?? 'score',
    metronome: L.id <= 1,
    quiet: false,
    title: `${cardLabel(c)}${c.title ? ' · ' + c.title : ''}`,
    sub: `Nivell ${L.id} · ${L.name}`,
    demoBars: brk ? 4 : 2,
    playBars: 8,
  };
  preparePlay();
}

/** Toca amb la banda (sense final). */
function openFree(cardId) {
  const c = cardById(cardId);
  const L = levelOf(cardId);
  S.play = {
    mode: 'free',
    cardId,
    level: L,
    cards: c.brk ? [cardById(GROOVE_FOR_BREAK), c] : [c],
    tempo: store.mission(cardId)?.lastTempo || L?.tempo || Math.min(110, styleOf(cardId)?.tempo ?? 90),
    band: store.player()?.bands[cardId] ?? defaultBand(cardId),
    supports: 1,
    viewType: store.player()?.viewType ?? 'score',
    metronome: false,
    quiet: false,
    title: `${cardLabel(c)}${c.title ? ' · ' + c.title : ''}`,
    sub: 'Toca amb la banda · sense final',
    demoBars: 1,
    playBars: Infinity,
  };
  preparePlay();
}

/** Entrenador de tempo amb una carta. */
function openTempo(cardId) {
  const c = cardById(cardId);
  const L = levelOf(cardId);
  const st = styleOf(cardId);
  S.play = {
    mode: 'tempo',
    cardId,
    level: L,
    cards: [c],
    tempo: store.mission(cardId)?.lastTempo || L?.tempo || Math.min(110, st?.tempo ?? 90),
    band: st?.band ?? store.player()?.bands[cardId] ?? defaultBand(cardId),
    supports: 1,
    viewType: store.player()?.viewType ?? 'score',
    metronome: false,
    quiet: false,
    title: `Entrenador de tempo · ${cardLabel(c)}${c.title && !c.style ? ' · ' + c.title : ''}`,
    sub: 'La banda entra i surt. Quan calli, aguanta el tempo.',
    playBars: Infinity,
  };
  preparePlay();
}

/** Una carta de l'Inspirador d'estils. */
function openStyleCard(cardId) {
  const c = cardById(cardId);
  const st = styleOf(cardId) ?? STYLES.find((x) => x.also.includes(cardId));
  const p = store.player();
  const saved = p?.styleCards?.[cardId];
  const start = Math.min(st?.tempo ?? 100, Math.round(((st?.tempo ?? 100) * 0.85) / 5) * 5, 120);
  S.play = {
    mode: 'style',
    style: st,
    cardId,
    level: levelOf(cardId),
    cards: c.brk ? [cardById(GROOVE_FOR_BREAK), c] : [c],
    tempo: saved?.lastTempo || start,
    styleTempo: st?.tempo ?? 100,
    band: st?.band ?? defaultBand(cardId),
    supports: 1,
    viewType: p?.viewType ?? 'score',
    metronome: false,
    quiet: false,
    title: `${st?.name ?? 'Estil'} · ${cardLabel(c)}${c.title && !c.style ? ' · ' + c.title : ''}`,
    sub: `Inspirador d'estils · tempo típic de l'estil: ${st?.tempo ?? '—'}`,
    playBars: 8,
  };
  preparePlay();
}

/** Una cançó de la biblioteca. */
function openSong(spec) {
  S.play = {
    mode: 'song',
    song: spec,
    cardId: spec.groove.id,
    level: null,
    cards: spec.brk ? [spec.groove, spec.brk] : [spec.groove],
    tempo: Math.min(spec.tempo, 120),
    songTempo: spec.tempo,
    band: spec.band,
    supports: 1,
    viewType: store.player()?.viewType ?? 'score',
    metronome: false,
    quiet: false,
    fill: spec.brk ? 'part' : 'none',
    brkCard: spec.brk ?? cardById('break1'),
    askBreaks: true,
    title: `${spec.title}${spec.artist ? ' · ' + spec.artist : ''}`,
    sub: `Cançó de la biblioteca · ${spec.bars.length} compassos${spec.defaulted ? ' · la fitxa no té bateria: fem el patró 5' : ''}`,
    demoBars: 2,
    playBars: spec.bars.length,
  };
  preparePlay();
}

function preparePlay() {
  stopSession();
  const P = S.play;
  $('play-title').textContent = P.title;
  $('play-sub').textContent = P.sub;
  $('tempo-val').textContent = P.tempo;
  $('band-sel').value = P.band;
  applyView();
  $('metro').checked = P.metronome;
  $('quiet').checked = P.quiet;
  $('quiet-wrap').hidden = P.mode === 'song';
  $('fill-wrap').hidden = P.mode !== 'song';
  if (P.mode === 'song') syncBreaks();
  $('brk-ask').hidden = !(P.mode === 'song' && P.askBreaks);
  $('result').hidden = true;
  $('play-back').dataset.target = { mission: 'map', free: 'free', song: 'lib', tempo: 'tempo', style: 'styles' }[P.mode] ?? 'home';
  $('quiet-wrap').hidden = P.mode === 'song' || P.mode === 'tempo';
  buildCards();
  lanes.setLanes(lanesOf(...P.cards));
  kit.setUsed(P.cards.flatMap((c) => Object.keys(c.notes)));
  resetTimeDots();
  setCoach(P.mode === 'tempo' ? 'Escoltes tres compassos, entres, i després la banda començarà a callar. <b>Continua tocant</b> quan calli!' : P.mode === 'style' && P.style ? esc(P.style.text) : P.level && P.mode === 'mission' ? P.level.intro : 'Escolta la carta i entra quan sonin les quatre baquetes.');
  setGoButton('idle');
  go('play');
  // Carregar sons mentre es mira la carta
  loadSounds();
}

function buildCards() {
  const root = $('cards');
  root.innerHTML = '';
  cardViews = S.play.cards.map((c, i) => {
    const el = document.createElement('div');
    el.className = 'card-slot';
    root.appendChild(el);
    const view = createCardView(el);
    const caption = S.play.cards.length > 1 ? (i === 0 ? (S.play.mode === 'song' ? 'Ritme de la cançó' : 'Compassos 1, 2 i 3: ritme') : (S.play.mode === 'song' ? ({ part: 'Break: últim compàs de cada part', 4: 'Break: cada 4 compassos', 8: 'Break: cada 8 compassos' }[S.play.fill] ?? 'Break') : 'Compàs 4: break')) : '';
    view.show(c, { caption });
    return { id: c.id, view, el };
  });
  root.classList.toggle('two', cardViews.length > 1);
}

let soundsPromise = null;
function loadSounds() {
  audioContext();
  soundsPromise ??= Promise.all([loadSet('bateria'), ...BAND_SETS.map(loadSet)]);
  $('load-msg').textContent = 'Carregant els sons…';
  soundsPromise.then(() => { $('load-msg').textContent = ''; });
  return soundsPromise;
}

$('play-back').addEventListener('click', () => go($('play-back').dataset.target || 'home'));
$('tempo-down').addEventListener('click', () => setTempo(S.play.tempo - 5));
$('tempo-up').addEventListener('click', () => setTempo(S.play.tempo + 5));
function setTempo(t) {
  S.play.tempo = Math.max(40, Math.min(200, t));
  $('tempo-val').textContent = S.play.tempo;
}
$('band-sel').addEventListener('change', (e) => {
  S.play.band = e.target.value;
  const p = store.player();
  if (p && S.play.mode !== 'song') { p.bands[S.play.cardId] = S.play.band; store.save(); }
});
$('hints').addEventListener('change', (e) => {
  S.play.supports = e.target.checked ? 2 : 1;
  saveSupports();
  applyView();
});
for (const b of document.querySelectorAll('.vt')) {
  b.addEventListener('click', () => {
    const vt = b.dataset.vt;
    if (vt === 'none') S.play.supports = 0;
    else {
      S.play.viewType = vt;
      if (S.play.supports === 0) S.play.supports = 1;
      const p = store.player();
      if (p) { p.viewType = vt; store.save(); }
    }
    saveSupports();
    applyView();
  });
}
$('note-colors').addEventListener('change', (e) => { notation.colors = e.target.checked; if (!S.session) drawIdle(); });
function saveSupports() {
  const p = store.player();
  if (p && S.play.level && S.play.mode === 'mission') { p.supports[S.play.level.id] = S.play.supports; store.save(); }
}
/** Què es veu al costat de la carta: partitura, pista o res. */
function applyView() {
  const P = S.play;
  const vt = P.supports === 0 ? 'none' : P.viewType;
  document.querySelector('.stage').dataset.vt = vt;
  for (const b of document.querySelectorAll('.vt')) b.setAttribute('aria-pressed', String(b.dataset.vt === vt));
  $('hints').checked = P.supports >= 2;
  $('hints').disabled = P.supports === 0 || !!(S.session && !S.session.finished);
  requestAnimationFrame(() => { lanes.resize(); if (!S.session || S.session.finished) drawIdle(); });
}
$('metro').addEventListener('change', (e) => { S.play.metronome = e.target.checked; });
$('quiet').addEventListener('change', (e) => { S.play.quiet = e.target.checked; });
// ---- Breaks a les cançons ----
const BREAKS = [1, 2, 3, 4, 5, 6, 7].map((n) => cardById(`break${n}`));
for (const c of BREAKS) {
  const o = document.createElement('option');
  o.value = c.id;
  o.textContent = c.num;
  $('brk-sel').appendChild(o);
  const b = document.createElement('button');
  b.type = 'button';
  b.dataset.brk = c.id;
  b.innerHTML = `<img src="${c.img}" alt=""><span>${esc(c.num)}</span>`;
  b.addEventListener('click', () => setBreaks(S.play.fill, c));
  $('brk-pick').appendChild(b);
}
for (const b of document.querySelectorAll('[data-fill]')) b.addEventListener('click', () => setBreaks(b.dataset.fill, S.play.brkCard));
$('fill-sel').addEventListener('change', (e) => setBreaks(e.target.value, S.play.brkCard));
$('brk-sel').addEventListener('change', (e) => setBreaks(S.play.fill === 'none' ? 'part' : S.play.fill, cardById(e.target.value) ?? S.play.song.brk));
$('brk-ok').addEventListener('click', () => { S.play.askBreaks = false; $('brk-ask').hidden = true; $('btn-go').focus(); });

function setBreaks(fill, brkCard) {
  const P = S.play;
  P.fill = fill;
  P.brkCard = brkCard;
  syncBreaks();
  buildCards();
  lanes.setLanes(lanesOf(...P.cards));
  kit.setUsed(P.cards.flatMap((c) => Object.keys(c.notes)));
  drawIdle();
}
function syncBreaks() {
  const P = S.play;
  const on = P.fill !== 'none';
  P.cards = on ? [P.song.groove, P.brkCard] : [P.song.groove];
  $('fill-sel').value = P.fill;
  // el break propi de la cançó també es pot triar
  if (P.song.brk && !$('brk-sel').querySelector(`option[value="${P.song.brk.id}"]`)) {
    const o = document.createElement('option'); o.value = P.song.brk.id; o.textContent = `${P.song.brk.num} (de la cançó)`; $('brk-sel').prepend(o);
  }
  $('brk-sel').value = P.brkCard.id;
  $('brk-sel').hidden = !on;
  for (const b of document.querySelectorAll('[data-fill]')) b.setAttribute('aria-pressed', String(b.dataset.fill === P.fill));
  for (const b of document.querySelectorAll('[data-brk]')) b.setAttribute('aria-pressed', String(b.dataset.brk === P.brkCard.id));
  $('brk-pick-wrap').hidden = !on;
}
$('btn-full').addEventListener('click', () => {
  const el = $('v-play');
  if (document.fullscreenElement) document.exitFullscreen?.();
  else el.requestFullscreen?.().catch(() => {});
});
document.addEventListener('fullscreenchange', () => setTimeout(() => lanes.resize(), 50));

$('btn-go').addEventListener('click', () => {
  if (S.session && !S.session.finished) {
    if (S.play.mode === 'free') { S.session.finishSoon(); setGoButton('ending'); }
    else { stopSession(); setGoButton('idle'); setCoach('Aturat. Quan vulguis, torna-hi.'); drawIdle(); }
    return;
  }
  startSession();
});

function setGoButton(state) {
  const b = $('btn-go');
  b.disabled = state === 'ending';
  b.classList.toggle('running', state === 'running');
  b.textContent = state === 'running' ? (S.play?.mode === 'free' ? '■ Prou, ja he acabat' : '■ Para') : state === 'ending' ? 'Acabant…' : '▶ Escolta i toca';
  for (const el of document.querySelectorAll('#play-controls select, #play-controls input, #play-controls .step')) el.disabled = state !== 'idle';
}

async function startSession(opts = {}) {
  const P = S.play;
  if (P.askBreaks) { P.askBreaks = false; $('brk-ask').hidden = true; }
  await resumeAudio();
  setExtraLatency(store.settings().latency);
  if (!soundsPromise || $('load-msg').textContent) {
    $('btn-go').disabled = true;
    await loadSounds();
    $('btn-go').disabled = false;
  }
  $('result').hidden = true;
  for (const v of cardViews) v.view.clearMarks();
  lanes.clearMarks();
  resetTimeDots();

  let chords;
  let playBar;
  if (P.mode === 'song') {
    const bars = P.song.bars;
    const [groove, brk] = P.cards;
    playBar = (j) => {
      const b = bars[j % bars.length];
      const where = P.fill === 'part' ? b.partEnd : P.fill === '4' ? j % 4 === 3 : P.fill === '8' ? j % 8 === 7 : false;
      const useBreak = brk && where && j < bars.length - 1;
      return { card: useBreak ? brk : groove, chord: b.chord, part: b.partStart ? b.part : '' };
    };
    chords = bars.map((b) => b.chord);
  } else {
    chords = bandChords(P.band, Math.max(0, ALL_MISSIONS.indexOf(P.cardId)));
    const [first, second] = P.cards;
    playBar = (j) => ({ card: second && j % 4 === 3 ? second : first, chord: chords[j % chords.length] });
    if (P.mode === 'tempo') {
      S.trainer = createTrainer();
      playBar = (j) => ({ card: first, chord: chords[j % chords.length], quiet: S.trainer.quietAt(j) });
    }
  }
  // La frase: escoltes els compassos 1-2-3 i el 4t és l'entrada (baquetes, o el break si n'hi toca).
  // Així, quan entres, la progressió torna a començar i no es perd l'ordre dels acords.
  let phrase = chords.length;
  if (P.mode === 'song') {
    const bars = P.song.bars;
    phrase = bars.findIndex((b, i) => i > 0 && b.partStart);
    if (phrase < 0) phrase = bars.length;
  }
  const L = phrase === 3 ? 3 : 4;
  const cfg = {
    tempo: P.tempo,
    band: P.band,
    demoBars: opts.quick ? 0 : L - 1,
    playBars: P.playBars,
    playBar,
    countBar: playBar(L - 1),
    endChord: chords[0],
    metronome: P.metronome,
    quiet: P.quiet && P.mode !== 'song',
  };
  S.session = createSession(cfg, {
    onMiss: (e) => {
      S.judged = (S.judged ?? 0) + 1;
      if (!S.hiding) viewFor(e.card)?.markAt(e.piece, e.step, 'missed');
    },
    onFinish: (sum) => finish(sum),
  });
  S.judged = 0;
  S.wasUnlocked = unlocked(P.cardId);
  if (!S.warnedLatency && outputLatencyMs() > 60) {
    S.warnedLatency = true;
    toast(`El so surt amb ${outputLatencyMs()} ms de retard: sembla que fas servir auriculars o un altaveu sense fil. Amb cable o amb els altaveus de l'ordinador, els cops sonaran a l'instant.`);
  }
  notation.colors = $('note-colors').checked; // força a redibuixar la partitura
  S.session.start();
  S.lastBarShown = null;
  setGoButton('running');
  loop();
}

function stopSession() {
  S.hiding = false;
  document.querySelector('.stage')?.classList.remove('hiding');
  if (S.session) S.session.stop();
  S.session = null;
  cancelAnimationFrame(S.raf);
  stopAll();
  setGoButton('idle');
}

// Bucle de dibuix
function loop() {
  const s = S.session;
  if (!s) return;
  const pos = s.position();
  const info = pos.info;
  const P = S.play;
  // Text del compte
  let big = null;
  if (info?.kind === 'count' && !info.entryBreak) big = String(Math.min(4, Math.floor(pos.beat) + 1));
  // Entrenador de tempo: mentre la banda calla, res marca el temps
  const hiding = P.mode === 'tempo' && info?.kind === 'play' && !!info.quiet;
  if (hiding !== S.hiding) { S.hiding = hiding; document.querySelector('.stage').classList.toggle('hiding', hiding); }
  if (P.mode === 'tempo' && S.trainer) S.trainer.check(s, pos);
  const vt = P.supports === 0 ? 'none' : P.viewType;
  if (hiding) { /* res */ } else if (vt === 'lanes') lanes.draw(s, pos, { big });
  else if (vt === 'score') notation.update(s, pos, { hitsVersion: s.judge.hits.length, statusVersion: S.judged });

  // Cartes: pilota a la carta activa
  const activeId = info?.card?.id;
  for (const v of cardViews) {
    const active = !hiding && v.id === activeId && (info?.kind === 'demo' || info?.kind === 'play' || info?.kind === 'count');
    v.view.update(pos.beat, active);
    v.el.classList.toggle('active', v.id === activeId || cardViews.length === 1);
  }

  // Ajudes: el pad s'encén una mica abans del cop (i sempre amb la demostració)
  const lead = 0.12;
  for (let b = Math.max(0, pos.bar); b <= pos.bar + 1; b++) {
    const bi = s.bars[b];
    if (!bi) continue;
    for (const n of bi.notes) {
      if (n._lit) continue;
      if (n.kind === 'demo' && pos.heard >= n.time) { n._lit = true; kit.flash(n.piece, 'demo', 160); }
      else if (n.kind === 'play' && P.supports >= 2 && !hiding && pos.heard >= n.time - lead) { n._lit = true; kit.hint(n.piece); }
    }
  }

  // Coach per compàs
  if (info && S.lastBarShown !== pos.bar) {
    S.lastBarShown = pos.bar;
    if (info.kind === 'demo') setCoach(`<b>Escolta.</b> El joc toca ${P.cards.length > 1 && info.card.brk ? 'el break' : 'la carta'}: mira com les rodones arriben a la línia groga.`, 'demo');
    else if (info.kind === 'count') setCoach(info.entryBreak ? '<b>Prepara’t.</b> El break t’avisa: al compàs següent entres tu!' : '<b>Prepara’t.</b> Quatre baquetes i entres tu!', 'count');
    else if (info.kind === 'play' && P.mode === 'tempo') {
      setCoach(info.quiet ? '<b>🤫 La banda calla.</b> Continua tocant la carta, sense parar.' : S.trainer?.message ?? '<b>Ara tu!</b> Toca amb la banda.', info.quiet ? 'count' : 'play');
    } else if (info.kind === 'play') {
      const total = Number.isFinite(P.playBars) ? ` · compàs ${info.j + 1} de ${P.playBars}` : ` · compàs ${info.j + 1}`;
      const extra = info.quiet ? ' La banda calla: mantén el temps tu.' : info.card?.brk ? ' Ara el break!' : '';
      setCoach(`<b>Ara tu!</b>${total}.${extra}`, 'play');
    } else if (info.kind === 'end') setCoach('Final!', 'end');
  }
  S.raf = requestAnimationFrame(loop);
}

function drawIdle() {
  lanes.resize();
  // Pista quieta amb la primera carta, perquè es vegi què vindrà
  const P = S.play;
  if (!P) return;
  const fake = {
    barDur: (240 / P.tempo),
    spb: 60 / P.tempo,
    bars: [],
    barStart: (i) => i * (240 / P.tempo),
  };
  for (let i = 0; i < 3; i++) {
    const c = P.cards.length > 1 && i === 2 ? P.cards[1] : P.cards[0];
    fake.bars[i] = { kind: 'play', card: c, notes: barNotes(c).map((n) => ({ ...n, kind: 'demo', time: i * fake.barDur + n.beat * fake.spb })) };
  }
  lanes.draw(fake, { heard: -fake.spb * 0.5, bar: 0, beat: 0 }, {});
  notation.still(P.cards);
  for (const v of cardViews) v.view.update(0, false);
}

function setCoach(html, kind = '') {
  const c = $('coach');
  c.innerHTML = html;
  c.dataset.kind = kind;
}

// Veredictes sobre la pista
const VERDICT = {
  perfect: () => 'Perfecte!',
  good: (r) => (r.dt < 0 ? 'Una mica aviat' : 'Una mica tard'),
  near: (r) => `Gairebé: era ${CLS_NAME[r.exp.cls]}`,
  wrong: (r) => `Era ${CLS_NAME[r.exp.cls]}`,
  extra: (r) => `Cop de més (${PIECES[r.piece].short.toLowerCase()})`,
};
function showVerdict(r) {
  const box = $('verdicts');
  if (document.querySelector('.stage').dataset.vt !== 'lanes') box.innerHTML = '';
  const d = document.createElement('div');
  d.className = `verdict v-${r.kind}`;
  d.textContent = VERDICT[r.kind]?.(r) ?? '';
  const lane = PIECES[r.piece]?.lane;
  const i = lanes.lanes.indexOf(lane);
  if (document.querySelector('.stage').dataset.vt === 'lanes') d.style.top = `${Math.max(0, i) / Math.max(1, lanes.lanes.length) * 100}%`;
  box.appendChild(d);
  setTimeout(() => d.remove(), 800);
  while (box.children.length > 4) box.firstChild.remove();
}

// Control del temps (punts)
function resetTimeDots() { $('tc-dots').innerHTML = ''; $('tc-needle').style.left = '50%'; S.dts = []; }
function pushTimeDot(ms, kind) {
  S.dts.push(ms);
  const dot = document.createElement('i');
  dot.className = `tc-dot k-${kind}`;
  dot.style.left = `${tcPos(ms)}%`;
  $('tc-dots').appendChild(dot);
  while ($('tc-dots').children.length > 16) $('tc-dots').firstChild.remove();
  const recent = S.dts.slice(-12);
  $('tc-needle').style.left = `${tcPos(recent.reduce((a, b) => a + b, 0) / recent.length)}%`;
}
const tcPos = (ms) => 50 + Math.max(-1, Math.min(1, ms / 90)) * 48;

// ---- Resultat ---------------------------------------------------------------------------------------------------------
function finish(sum) {
  const P = S.play;
  setGoButton('idle');
  cancelAnimationFrame(S.raf);
  setTimeout(() => { if (S.session?.finished) { stopAll(); } }, 3500);
  for (const v of cardViews) v.view.summaryMarks(S.session.judge.expected);

  const p = store.player();
  let rec = null;
  if (P.mode === 'mission' && sum.total) rec = store.recordAttempt(P.cardId, { stars: sum.stars, score: sum.score, tempo: P.tempo });
  const T = P.mode === 'tempo' ? S.trainer : null;
  const wasUnlocked = S.wasUnlocked;
  if (sum.total && p) {
    const byCls = Object.fromEntries(Object.entries(sum.byCls).map(([k, v]) => [k, [Math.round(v.ok * 10) / 10, v.total]]));
    store.addHistory({
      mode: P.mode, card: P.cardId, style: P.style?.id ?? styleOf(P.cardId)?.id ?? null, tempo: P.tempo,
      score: Math.round(sum.score * 100) / 100, stars: sum.stars, total: sum.total, extras: sum.extras, missed: sum.missed, wrongs: sum.wrongs,
      mean: Math.round(sum.meanMs), sd: Math.round(sum.sdMs), bars: sum.bars, clean: sum.cleanBars, ghosts: sum.ghosts, loud: sum.loud, byCls,
      ...(T ? { quietBest: T.record } : {}),
    });
  }
  if (P.mode === 'style' && p && sum.total) {
    const m = (p.styleCards[P.cardId] ??= { stars: 0, tempo: 0, lastTempo: 0 });
    m.lastTempo = P.tempo;
    if (sum.stars > m.stars || (sum.stars === m.stars && P.tempo > m.tempo)) { m.stars = sum.stars; m.tempo = P.tempo; }
    store.save();
  }
  let newRecord = false;
  if (T && p) {
    if (!p.tempoBest || T.record > p.tempoBest.bars || (T.record === p.tempoBest.bars && P.tempo > p.tempoBest.tempo)) {
      if (T.record > 0) { p.tempoBest = { bars: T.record, tempo: P.tempo, card: P.cardId, t: Date.now() }; newRecord = true; }
    }
    store.save();
  }

  // Patró desbloquejat?
  const nowUnlocked = (P.mode === 'mission' || P.mode === 'style') && !wasUnlocked && unlocked(P.cardId);
  const ub = $('res-unlock');
  ub.hidden = !nowUnlocked;
  if (nowUnlocked) {
    const c = cardById(P.cardId);
    const all = ALL_PATTERNS();
    ub.innerHTML = `<div class="unlock-card">${thumb(c)}</div><div><b>🔓 Patró desbloquejat!</b><span>${esc(cardLabel(c))}${c.title && !c.style ? ' · ' + esc(c.title) : ''}</span><small>Ja en tens ${all.filter(unlocked).length} de ${all.length}. Els veuràs tots al teu perfil.</small></div>`;
  }
  $('res-stars').innerHTML = T
    ? `<div class="big-record">${T.record ? `Has aguantat ${T.record} ${T.record === 1 ? 'compàs' : 'compassos'} en silenci` : 'Encara no has aguantat cap silenci'}</div>${newRecord ? '<p class="muted" style="text-align:center;margin:0">El teu rècord!</p>' : ''}<ul class="tempo-rounds">${T.rounds.map((g) => `<li class="${g.pass ? 'ok' : 'ko'}">${g.pass ? '✓' : '✗'} ${g.len} c.${g.drift != null ? ` · ${g.drift > 0 ? '+' : ''}${Math.round(g.drift)} ms` : ''}</li>`).join('')}</ul>`
    : [0, 1, 2].map((i) => `<span class="${i < sum.stars ? 'on' : ''}">★</span>`).join('');
  $('res-pct').textContent = sum.total ? `${Math.round(sum.score * 100)} %` : '—';
  const bars = sum.bars ? `${sum.cleanBars} de ${sum.bars} compassos nets` : 'No hi ha hagut prou compassos per jutjar.';
  $('res-line').textContent = sum.total ? `${bars} · ${sum.perfect + sum.good} cops bé de ${sum.total}${sum.extras ? ` · ${sum.extras} de més` : ''} · tempo ${P.tempo}` : bars;

  const rows = Object.entries(sum.byCls).map(([cls, s]) => {
    const lane = PIECES[cls === 'oh' ? 'oh' : cls]?.lane ?? cls;
    const r = s.ok / s.total;
    return `<div class="res-piece"><span class="dot" style="background:${LANE_COLOR[lane]}"></span><span class="nm">${esc(cls === 'oh' ? 'Charles obert' : LANE_LABEL[lane])}</span><span class="bar"><i style="width:${Math.round(r * 100)}%;background:${r >= 0.75 ? '#1f9d55' : r >= 0.4 ? '#f08c00' : '#d64545'}"></i></span><b>${Math.round(r * 100)} %</b></div>`;
  });
  $('res-pieces').innerHTML = rows.join('');
  $('res-dots').innerHTML = sum.dts.map((ms) => `<i class="tc-dot" style="left:${tcPos(ms)}%"></i>`).join('');
  $('res-needle').style.left = `${tcPos(sum.meanMs)}%`;
  $('res-mean').textContent = sum.dts.length ? (Math.abs(sum.meanMs) < 12 ? 'Al seu lloc' : `${sum.meanMs < 0 ? 'Avançat' : 'Endarrerit'} ${Math.round(Math.abs(sum.meanMs))} ms`) : '';

  const tips = [...sum.tips];
  // Si tots els cops van desplaçats igual, és el retard de l'equip (teclat, altaveus), no de qui toca.
  const deviceLag = sum.dts.length >= 10 && Math.abs(sum.meanMs) > 35 && sum.sdMs < 45 ? Math.round(sum.meanMs) : 0;
  if (deviceLag) tips.splice(0, tips.length, ...tips.filter((t) => !/avançat|endarrerit/.test(t)));
  if (deviceLag) tips.unshift(`Tots els cops cauen uns ${Math.abs(deviceLag)} ms ${deviceLag > 0 ? 'tard' : 'aviat'}, i tots igual: segurament és el retard de l'ordinador o dels altaveus, no teu. Prem «Compensa el retard».`);
  // Adaptació: ajudes i tempo
  const poor = sum.stars === 0 || sum.cleanBars < sum.bars / 2;
  const actions = [];
  if (P.mode === 'mission' && p) {
    const L = P.level;
    const streak = (p.poorStreak[P.cardId] = poor ? (p.poorStreak[P.cardId] ?? 0) + 1 : 0);
    if (poor && streak >= 2 && P.supports < 2) {
      P.supports++;
      p.supports[L.id] = P.supports;
      applyView();
      tips.unshift(P.supports === 1 ? 'He tornat a posar la partitura al costat de la carta.' : 'He posat més ajudes: ara la bateria dibuixada t’avisa de cada cop.');
    } else if (sum.stars === 3 && P.supports > 0 && P.supports >= L.supports) {
      P.supports--;
      p.supports[L.id] = P.supports;
      applyView();
      tips.push(P.supports === 0 ? 'Molt bé! La propera vegada, prova-ho llegint només la carta (pots tornar a mostrar la partitura quan vulguis).' : 'Molt bé! Traiem una ajuda: els pads ja no s’encenen abans.');
    }
    store.save();
  }

  const again = (label, fn, primary = false) => actions.push({ label, fn, primary });
  const idx = ALL_MISSIONS.indexOf(P.cardId);
  if (P.mode === 'mission') {
    if (poor) {
      again('♪ T’ho ensenyo i tornem-hi', () => { setTempo(P.tempo - 8); $('result').hidden = true; startSession(); }, true);
      again('Torna-hi', () => { $('result').hidden = true; startSession({ quick: true }); });
    } else {
      if (sum.stars >= 2 && idx < ALL_MISSIONS.length - 1) again('Següent repte →', () => openMission(ALL_MISSIONS[idx + 1]), true);
      again('Torna-hi', () => { $('result').hidden = true; startSession({ quick: true }); }, sum.stars < 2);
      if (sum.stars >= 2) again(`Més ràpid (${P.tempo + 8})`, () => { setTempo(P.tempo + 8); $('result').hidden = true; startSession({ quick: true }); });
    }
    if (rec && rec.stars === sum.stars && sum.stars > 0 && rec.tempo === P.tempo && rec.attempts > 1) tips.push('És el teu millor resultat en aquest repte!');
  } else if (P.mode === 'tempo') {
    again('Torna-hi', () => { $('result').hidden = true; startSession({ quick: true }); }, true);
    again(`Més ràpid (${P.tempo + 8})`, () => { setTempo(P.tempo + 8); $('result').hidden = true; startSession({ quick: true }); });
    again(`Més lent (${P.tempo - 8})`, () => { setTempo(P.tempo - 8); $('result').hidden = true; startSession({ quick: true }); });
    again('Canvia de carta', () => go('tempo'));
  } else if (P.mode === 'style') {
    const list = [...(P.style?.cards ?? []).map((c) => c.id), ...(P.style?.also ?? [])];
    const k = list.indexOf(P.cardId);
    if (!poor && k >= 0 && k < list.length - 1) again('Següent carta de l’estil →', () => openStyleCard(list[k + 1]), true);
    again('Torna-hi', () => { $('result').hidden = true; startSession({ quick: true }); }, poor || k === list.length - 1);
    if (!poor && P.tempo < P.styleTempo) again(`Més ràpid (${Math.min(P.styleTempo, P.tempo + 8)})`, () => { setTempo(Math.min(P.styleTempo, P.tempo + 8)); $('result').hidden = true; startSession({ quick: true }); });
    if (poor) again('♪ T’ho ensenyo i tornem-hi', () => { setTempo(P.tempo - 8); $('result').hidden = true; startSession(); });
  } else if (P.mode === 'song') {
    again('Torna-hi', () => { $('result').hidden = true; startSession({ quick: true }); }, true);
    if (P.tempo < P.songTempo) again(`Més ràpid (${Math.min(P.songTempo, P.tempo + 8)})`, () => { setTempo(Math.min(P.songTempo, P.tempo + 8)); $('result').hidden = true; startSession({ quick: true }); });
  } else {
    again('Torna-hi', () => { $('result').hidden = true; startSession({ quick: true }); }, true);
  }
  if (deviceLag) again(`Compensa el retard (${Math.abs(deviceLag)} ms)`, () => {
    store.settings().latency = Math.max(-60, Math.min(300, Math.round((store.settings().latency + deviceLag) / 5) * 5));
    store.save();
    setExtraLatency(store.settings().latency);
    toast(`Fet: ara el joc compensa ${store.settings().latency} ms. Es pot canviar a ⚙️.`);
    $('result').hidden = true;
  });
  again('Mira la carta', () => { $('result').hidden = true; });
  $('res-tips').innerHTML = tips.map((t) => `<li>${esc(t)}</li>`).join('');
  const box = $('res-actions');
  box.innerHTML = '';
  for (const a of actions) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `btn${a.primary ? ' btn-primary' : ' btn-ghost'}`;
    b.textContent = a.label;
    b.addEventListener('click', a.fn);
    box.appendChild(b);
  }
  $('result').hidden = false;
  box.querySelector('.btn-primary')?.focus();
}

// ---- Entrenador de tempo (tria de carta) ------------------------------------------------------------------------------
function cardTiles(root, ids, onPick, { stars } = {}) {
  const grid = document.createElement('div');
  grid.className = 'tiles small';
  for (const id of ids) {
    const c = cardById(id);
    if (!c) continue;
    const t = document.createElement('button');
    t.type = 'button';
    t.className = `tile${lockClass(id)}`;
    const st = stars?.(id);
    t.innerHTML = `<div class="tile-img">${thumb(c)}${lockBadge(id)}</div><div class="tile-txt"><b>${esc(cardLabel(c))}</b><small>${esc(c.style ? '' : c.title || '')}</small>${st != null ? `<span class="tile-stars">${starText(st)}</span>` : ''}</div>`;
    t.addEventListener('click', () => onPick(id));
    grid.appendChild(t);
  }
  root.appendChild(grid);
}

function renderTempo() {
  const best = store.player()?.tempoBest;
  $('tempo-record').textContent = best ? `El teu rècord: ${best.bars} ${best.bars === 1 ? 'compàs' : 'compassos'} en silenci (tempo ${best.tempo}, ${cardLabel(cardById(best.card))}).` : 'Encara no tens rècord. Comença amb una carta fàcil!';
  const root = $('tempo-cards');
  root.innerHTML = '';
  const groups = [
    ['Per començar', ['w2', 'w3', 'p1', 'p2', 'p5', 'p8']],
    ['Una mica més', ['p9', 'p10', 'p12', 'p13', 'p17', 'p18', 'p11', 'p14']],
    ['Estils', STYLES.map((st) => st.cards[0].id)],
    ['Shuffle', ['s1', 's2']],
  ];
  for (const [name, ids] of groups) {
    const h = document.createElement('h3');
    h.textContent = name;
    root.appendChild(h);
    cardTiles(root, ids, openTempo);
  }
}

// ---- Inspirador d'estils ------------------------------------------------------------------------------------------------
function renderStyles(openId = null) {
  const list = $('styles-list');
  const detail = $('style-detail');
  const p = store.player();
  const starsOf = (id) => (styleOf(id) ? p?.styleCards?.[id]?.stars : store.mission(id)?.stars) ?? 0;
  if (!openId) {
    $('styles-title').textContent = "Inspirador d'estils";
    $('styles-lead').hidden = false;
    list.hidden = false;
    detail.hidden = true;
    $('styles-back').onclick = () => go('home');
    list.innerHTML = '';
    for (const st of STYLES) {
      const done = st.cards.filter((c) => (p?.styleCards?.[c.id]?.stars ?? 0) >= 2).length;
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'style-tile';
      b.innerHTML = `<b>${esc(st.name)}</b><small>${esc(st.era)}</small><span>${esc(st.text.split('. ')[0])}.</span><span class="st-stars">${done} de ${st.cards.length} cartes amb ★★</span>`;
      b.addEventListener('click', () => renderStyles(st.id));
      list.appendChild(b);
    }
    return;
  }
  const st = STYLES.find((x) => x.id === openId);
  $('styles-title').textContent = st.name;
  $('styles-lead').hidden = true;
  list.hidden = true;
  detail.hidden = false;
  $('styles-back').onclick = () => renderStyles();
  detail.innerHTML = `<div class="panel"><div class="style-meta"><span>${esc(st.era)}</span><span>Tempo típic: ${st.tempo}</span><span>Banda: ${esc(BANDS[st.band]?.name ?? '')} · ${esc(bandKeyName(st.band))}</span></div><p class="lead">${esc(st.text)}</p><p><b>Escolta-hi:</b> ${esc(st.listen)}</p></div><h2>Cartes noves</h2><div id="st-new"></div>${st.also.length ? '<h2>Cartes ROCKIN que també hi encaixen</h2><div id="st-also"></div>' : ''}`;
  cardTiles($('st-new'), st.cards.map((c) => c.id), openStyleCard, { stars: starsOf });
  requestAnimationFrame(() => document.querySelector('#st-new .tile')?.focus());
  if (st.also.length) cardTiles($('st-also'), st.also, (id) => { S.styleFor = st.id; openStyleCardFor(id, st); }, { stars: starsOf });
  window.scrollTo(0, 0);
}
function openStyleCardFor(cardId, st) {
  openStyleCard(cardId);
  if (S.play && st) {
    S.play.style = st;
    S.play.band = st.band;
    $('band-sel').value = st.band;
    S.play.styleTempo = st.tempo;
    S.play.title = `${st.name} · ${cardLabel(cardById(cardId))}`;
    $('play-title').textContent = S.play.title;
  }
}

// ---- Perfil ----------------------------------------------------------------------------------------------------------------
const FEATURE_NAME = {
  sincopes: 'Síncopes i contratemps', fantasma: 'Notes fantasma', semicorxeres: 'Semicorxeres', ternari: 'Tresets i shuffle',
  toms: 'Toms i breaks', obert: 'Charles obert', estils: 'Estils',
};
function features(c) {
  const f = new Set();
  if (!c) return f;
  const n = c.notes;
  if (c.grid === 12) f.add('ternari');
  else {
    const off = (arr = []) => arr.some((st) => st % 4 !== 0);
    if (off(n.kk) || off(n.sn) || off(n.rim) || (n.hh && n.hh.every((st) => st % 4 === 2))) f.add('sincopes');
    if (Object.values(n).some((arr) => arr.some((st) => st % 2 === 1))) f.add('semicorxeres');
  }
  if (n.ghost || n.ghostkk) f.add('fantasma');
  if (n.t1 || n.t2 || n.t3 || c.brk) f.add('toms');
  if (n.oh) f.add('obert');
  if (c.style) f.add('estils');
  return f;
}

function renderProfile() {
  const name = store.currentName();
  const p = store.player();
  $('profile-title').textContent = name ? `El perfil de ${name}` : 'El meu perfil';
  const root = $('profile-body');
  const H = (p?.history ?? []).filter((h) => h.total > 0);
  if (!H.length) {
    root.innerHTML = `<div class="panel"><p class="lead">Encara no hi ha cap partida guardada. Cada cop que acabis un repte, una carta d'estil o l'entrenador de tempo, aquí veuràs com vas i què et convé practicar.</p><button type="button" class="btn btn-primary" id="prof-start">▶ Continua el camí</button></div>`;
    $('prof-start').onclick = () => openMission(recommended());
    return;
  }
  const recent = H.slice(-30);
  const avg = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);
  // Peces
  const piece = {};
  for (const h of recent) for (const [cls, [ok, tot]] of Object.entries(h.byCls ?? {})) {
    const s = (piece[cls] ??= { ok: 0, tot: 0 });
    s.ok += ok; s.tot += tot;
  }
  const pieceRows = Object.entries(piece).filter(([, v]) => v.tot >= 4).map(([cls, v]) => ({ cls, r: v.ok / v.tot })).sort((a, b) => a.r - b.r);
  // Temps
  const means = recent.filter((h) => h.total >= 8).map((h) => h.mean);
  const sds = recent.filter((h) => h.total >= 8).map((h) => h.sd);
  const mean = avg(means);
  const sd = avg(sds);
  // Habilitats (per tipus de carta)
  const feat = {};
  for (const h of H.slice(-60)) for (const f of features(cardById(h.card))) (feat[f] ??= []).push(h.score);
  const featRows = Object.entries(feat).filter(([, v]) => v.length >= 1).map(([f, v]) => ({ f, r: avg(v.slice(-8)), n: v.length })).sort((a, b) => a.r - b.r);
  // Recomanacions
  const recs = [];
  const weakPiece = pieceRows.find((x) => x.r < 0.8);
  const bestFor = (pred) => ALL_MISSIONS.find((id) => pred(cardById(id)) && (store.mission(id)?.stars ?? 0) < 3) ?? ALL_MISSIONS.find((id) => pred(cardById(id)));
  if (weakPiece) {
    const cls = weakPiece.cls;
    const id = bestFor((c) => Object.keys(c.notes).some((k) => PIECES[k]?.cls === cls) && !c.brk);
    recs.push({ text: `<b>${esc(CLS_NAME[cls][0].toUpperCase() + CLS_NAME[cls].slice(1))}</b> és la peça que més falla (${Math.round(weakPiece.r * 100)} % bé). Toca a poc a poc una carta on surti molt.`, label: cardLabel(cardById(id)), fn: () => openMission(id) });
  }
  if (means.length >= 3 && Math.abs(mean) > 25) recs.push({ text: `De mitjana vas <b>${Math.round(Math.abs(mean))} ms ${mean < 0 ? 'avançat' : 'endarrerit'}</b>. Si tots els cops van igual de desplaçats pot ser el retard de l’equip (fes la prova a ⚙️); si no, practica amb el metrònom i escolta el baix.`, label: 'Prova de retard', fn: () => go('setup') });
  if (sds.length >= 3 && sd > 30) recs.push({ text: `Els cops són poc regulars (varien uns ${Math.round(sd)} ms). L’Entrenador de tempo t’ajudarà a tenir un pols més estable.`, label: 'Entrenador de tempo', fn: () => go('tempo') });
  const weakFeat = featRows.find((x) => x.r < 0.75 && x.f !== 'estils');
  if (weakFeat) {
    const id = bestFor((c) => features(c).has(weakFeat.f));
    if (id) recs.push({ text: `Et costen més les cartes de <b>${esc(FEATURE_NAME[weakFeat.f].toLowerCase())}</b> (${Math.round(weakFeat.r * 100)} % de mitjana).`, label: cardLabel(cardById(id)), fn: () => openMission(id) });
  }
  const ghostH = recent.filter((h) => h.ghosts);
  if (ghostH.length && avg(ghostH.map((h) => h.loud / h.ghosts)) > 0.5) recs.push({ text: 'Les <b>notes fantasma</b> et surten massa fortes: han de ser gairebé un frec.', label: cardLabel(cardById('p25')), fn: () => openMission('p25') });
  if (!p.tempoBest) recs.push({ text: 'Encara no has provat l’<b>Entrenador de tempo</b>: és la millor manera de saber si el pols el portes tu.', label: 'Prova-ho', fn: () => go('tempo') });
  if (!recs.length) recs.push({ text: 'Tot va molt bé! Continua el camí o prova un estil nou.', label: 'Continua el camí', fn: () => openMission(recommended()) });

  const minutes = Math.round(H.reduce((a, h) => a + (h.bars || 8) * (240 / (h.tempo || 90)), 0) / 60);
  const spark = sparkline(H.slice(-40).map((h) => h.score));
  const MODE = { mission: 'Camí', free: 'Amb la banda', song: 'Cançó', tempo: 'Tempo', style: 'Estil' };
  root.innerHTML = `
    <div class="prof-kpis">
      <div class="kpi"><b>${H.length}</b><span>partides</span></div>
      <div class="kpi"><b>${minutes}</b><span>minuts tocant</span></div>
      <div class="kpi"><b>${Math.round(avg(recent.map((h) => h.score)) * 100)} %</b><span>precisió (últimes ${recent.length})</span></div>
      <div class="kpi"><b>${p.tempoBest ? p.tempoBest.bars : '—'}</b><span>compassos en silenci (rècord)</span></div>
    </div>
    <div class="panel" style="margin-bottom:12px"><h2>Què et convé practicar</h2><ul class="practice" id="prof-recs"></ul></div>
    <div class="prof-grid">
      <div class="panel"><h2>Peça a peça</h2><p class="muted small">Les últimes ${recent.length} partides.</p>${pieceRows.map(({ cls, r }) => `<div class="res-piece"><span class="dot" style="background:${LANE_COLOR[PIECES[cls]?.lane ?? cls] ?? '#999'}"></span><span class="nm">${esc(cls === 'oh' ? 'Charles obert' : LANE_LABEL[PIECES[cls]?.lane ?? cls] ?? cls)}</span><span class="bar"><i style="width:${Math.round(r * 100)}%;background:${r >= 0.75 ? '#1f9d55' : r >= 0.4 ? '#f08c00' : '#d64545'}"></i></span><b>${Math.round(r * 100)} %</b></div>`).join('')}</div>
      <div class="panel"><h2>Control del temps</h2><div class="tc-bar big"><div class="tc-zone"></div><div class="tc-center"></div><div class="tc-dots">${means.map((m) => `<i class="tc-dot" style="left:${tcPos(m)}%"></i>`).join('')}</div><div class="tc-needle" style="left:${tcPos(mean)}%"></div></div><div class="tc-label"><span>Aviat</span><span>${means.length ? (Math.abs(mean) < 12 ? 'Al seu lloc' : `${mean < 0 ? 'Avançat' : 'Endarrerit'} ${Math.round(Math.abs(mean))} ms`) : ''}</span><span>Tard</span></div><p class="muted small">Cada punt és la mitjana d’una partida. Regularitat: els cops varien uns ${Math.round(sd)} ms.</p></div>
      <div class="panel"><h2>Per tipus de carta</h2>${featRows.map(({ f, r, n }) => `<div class="res-piece"><span></span><span class="nm">${esc(FEATURE_NAME[f])}</span><span class="bar"><i style="width:${Math.round(r * 100)}%;background:${r >= 0.75 ? '#1f9d55' : r >= 0.5 ? '#f08c00' : '#d64545'}"></i></span><b>${Math.round(r * 100)} %</b></div>`).join('') || '<p class="muted">Encara hi ha poques partides.</p>'}</div>
      <div class="panel"><h2>Evolució</h2>${spark}<p class="muted small">Precisió de les últimes ${Math.min(40, H.length)} partides.</p></div>
    </div>
    <div class="panel" style="margin-bottom:12px"><h2>Patrons desbloquejats: ${ALL_PATTERNS().filter(unlocked).length} de ${ALL_PATTERNS().length}</h2><p class="muted small">Un patró es desbloqueja quan el toques amb ★★ (75 % de precisió o més). Els grisos encara no els tens: els pots tocar igualment.</p><div id="prof-coll"></div></div>
    <div class="panel"><h2>Últimes partides</h2><table class="hist"><thead><tr><th>Quan</th><th>Què</th><th>Carta</th><th>Tempo</th><th>Precisió</th></tr></thead><tbody>${H.slice(-15).reverse().map((h) => `<tr><td>${new Date(h.t).toLocaleString('ca', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</td><td>${MODE[h.mode] ?? h.mode}</td><td>${esc(cardLabel(cardById(h.card)) || h.card)}</td><td>${h.tempo}</td><td>${Math.round(h.score * 100)} %${h.quietBest != null ? ` · ${h.quietBest} c. en silenci` : ''}</td></tr>`).join('')}</tbody></table></div>`;
  const coll = $('prof-coll');
  for (const L of LEVELS) {
    const h = document.createElement('h3');
    h.textContent = `${L.id} · ${L.name} (${L.missions.filter(unlocked).length}/${L.missions.length})`;
    coll.appendChild(h);
    cardTiles(coll, L.missions, openMission, { stars: starsFor });
  }
  const hs = document.createElement('h3');
  const styleIds = STYLES.flatMap((st) => st.cards.map((c) => c.id));
  hs.textContent = `Estils (${styleIds.filter(unlocked).length}/${styleIds.length})`;
  coll.appendChild(hs);
  cardTiles(coll, styleIds, openStyleCard, { stars: starsFor });
  const ul = $('prof-recs');
  for (const r of recs.slice(0, 4)) {
    const li = document.createElement('li');
    li.innerHTML = `<p>${r.text}</p>`;
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn btn-ghost';
    b.textContent = r.label;
    b.addEventListener('click', r.fn);
    li.appendChild(b);
    ul.appendChild(li);
  }
}

function sparkline(vals) {
  if (vals.length < 2) return '<p class="muted">Cal més d’una partida.</p>';
  const w = 300;
  const h = 90;
  const pts = vals.map((v, i) => `${((i / (vals.length - 1)) * (w - 10) + 5).toFixed(1)},${(h - 8 - v * (h - 16)).toFixed(1)}`);
  return `<svg class="spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><line x1="0" x2="${w}" y1="${h - 8 - 0.75 * (h - 16)}" y2="${h - 8 - 0.75 * (h - 16)}" stroke="#e2ddd3" stroke-dasharray="4 4"/><polyline points="${pts.join(' ')}" fill="none" stroke="#221f20" stroke-width="2"/>${pts.map((pt) => `<circle cx="${pt.split(',')[0]}" cy="${pt.split(',')[1]}" r="2.5" fill="#fdbe10"/>`).join('')}</svg>`;
}

// ---- Dreceres de teclat (pantalla de joc) -------------------------------------------------------------------------------
// Enter: comença / para (i, al resultat, el botó principal) · Esc: tanca el resultat, para o torna enrere
// ↑ ↓: tempo · ← →: repte anterior / següent · 1 2 3: partitura / pista / només la carta · M: metrònom
window.addEventListener('keydown', (e) => {
  if (S.view !== 'play' || e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.target.closest?.('input[type="text"], textarea, select')) return;
  const P = S.play;
  const running = !!(S.session && !S.session.finished);
  const resultOpen = !$('result').hidden;
  const idle = !running;
  const k = e.key;
  let handled = true;
  if (k === 'Enter') {
    if (resultOpen) ($('res-actions').querySelector('.btn-primary') ?? $('res-actions').querySelector('button'))?.click();
    else if (!$('brk-ask').hidden) $('brk-ok').click();
    else $('btn-go').click();
  } else if (k === 'Escape') {
    if (resultOpen) $('result').hidden = true;
    else if (running) $('btn-go').click();
    else $('play-back').click();
  } else if (resultOpen && k.startsWith('Arrow')) {
    moveFocus(k, $('result'));
  } else if ((k === 'ArrowUp' || k === '+') && idle && !resultOpen) setTempo(P.tempo + 5);
  else if ((k === 'ArrowDown' || k === '-') && idle && !resultOpen) setTempo(P.tempo - 5);
  else if ((k === 'ArrowRight' || k === 'ArrowLeft') && idle && P.mode === 'mission') {
    const i = ALL_MISSIONS.indexOf(P.cardId) + (k === 'ArrowRight' ? 1 : -1);
    if (i >= 0 && i < ALL_MISSIONS.length) openMission(ALL_MISSIONS[i]);
  } else if ((k === 'ArrowRight' || k === 'ArrowLeft') && idle && P.mode === 'style' && P.style) {
    const list = [...P.style.cards.map((c) => c.id), ...P.style.also];
    const i = list.indexOf(P.cardId) + (k === 'ArrowRight' ? 1 : -1);
    if (i >= 0 && i < list.length) openStyleCardFor(list[i], P.style);
  } else if (k === '1' || k === '2' || k === '3') {
    document.querySelector(`.vt[data-vt="${{ 1: 'score', 2: 'lanes', 3: 'none' }[k]}"]`)?.click();
  } else if ((k === 'm' || k === 'M') && idle) {
    $('metro').checked = !$('metro').checked;
    P.metronome = $('metro').checked;
    toast(P.metronome ? 'Metrònom encès' : 'Metrònom apagat');
  } else handled = false;
  if (handled) e.preventDefault();
});

// ---- Menús amb teclat: fletxes per moure's, Enter per entrar, Esc per tornar ----------------------------------------------
const FOCUSABLE = 'button:not([disabled]), a[href], input:not([type="hidden"]):not([disabled]), select:not([disabled])';
function visibleIn(root) {
  return [...root.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null && !el.closest('[hidden]'));
}
/** Mou el focus a l'element més proper en la direcció de la fletxa. */
function moveFocus(key, root) {
  const items = visibleIn(root);
  if (!items.length) return;
  const cur = document.activeElement;
  if (!cur || !root.contains(cur) || cur === document.body) { items[0].focus(); return; }
  const a = cur.getBoundingClientRect();
  const ax = a.left + a.width / 2;
  const ay = a.top + a.height / 2;
  let best = null;
  for (const el of items) {
    if (el === cur) continue;
    const b = el.getBoundingClientRect();
    const bx = b.left + b.width / 2;
    const by = b.top + b.height / 2;
    const dx = bx - ax;
    const dy = by - ay;
    let main;
    let side;
    if (key === 'ArrowRight') { main = dx; side = Math.abs(dy); }
    else if (key === 'ArrowLeft') { main = -dx; side = Math.abs(dy); }
    else if (key === 'ArrowDown') { main = dy; side = Math.abs(dx); }
    else { main = -dy; side = Math.abs(dx); }
    if (main <= 4) continue;
    const score = main + side * 2.5;
    if (!best || score < best.score) best = { el, score };
  }
  if (best) {
    best.el.focus();
    best.el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
}
/** On comença el focus en entrar a cada pantalla. */
function focusStart(view) {
  const pick = {
    home: () => (store.currentName() ? $('door-continue') : $('who-name')),
    map: () => document.querySelector('#map-levels .tile.next') ?? document.querySelector('#map-levels .tile'),
    free: () => document.querySelector('#free-cards .tile'),
    tempo: () => document.querySelector('#tempo-cards .tile'),
    styles: () => document.querySelector('#styles-list:not([hidden]) .style-tile') ?? document.querySelector('#style-detail .tile'),
    profile: () => document.querySelector('#prof-recs button') ?? $('prof-start'),
    lib: () => document.querySelector('#lib-list .lib-item') ?? $('lib-code'),
    setup: () => $('learn-start'),
    play: () => $('btn-go'),
  }[view]?.();
  pick?.focus({ preventScroll: view !== 'map' });
  if (view === 'map') pick?.scrollIntoView({ block: 'center', behavior: 'smooth' });
}
window.addEventListener('keydown', (e) => {
  if (e.defaultPrevented || S.view === 'play' || e.metaKey || e.ctrlKey || e.altKey) return;
  const inText = e.target.closest?.('input[type="text"], textarea, select');
  if (e.key === 'Escape') {
    if (S.view === 'styles' && !$('style-detail').hidden) renderStyles();
    else if (S.view !== 'home') document.querySelector(`#v-${S.view} .btn-back`)?.click();
    requestAnimationFrame(() => focusStart(S.view));
    e.preventDefault();
    return;
  }
  if (inText && e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
  if (inText && e.target.tagName === 'SELECT') return;
  if (e.key.startsWith('Arrow')) {
    moveFocus(e.key, $(`v-${S.view}`));
    e.preventDefault();
  }
});

// ---- Arrencada ----------------------------------------------------------------------------------------------------------
setupKit = createKit($('setup-kit'), { onTap: (piece, perf) => input.tap(piece, perf) });
$('my-sound').checked = mySoundOn();
kit.showKeys(true);
setExtraLatency(store.settings().latency);
input.connect();
// El primer clic desbloqueja l'àudio (els navegadors ho demanen).
window.addEventListener('pointerdown', () => { audioContext(); resumeAudio(); }, { once: true });
window.addEventListener('keydown', () => { audioContext(); resumeAudio(); }, { once: true });
go('home');
S.tap = (piece, perf, vel) => input.tap(piece, perf, vel);
S.heardTime = heardTime;
S.outputLevel = outputLevel;
S.openMission = openMission;
S.openFree = openFree;
S.openSong = openSong;
S.go = go;
S.openTempo = openTempo;
S.openStyleCard = openStyleCard;
window.__rockinReady = true;
