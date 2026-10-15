// ROCKIN · Bateria: pantalles i flux del joc.
// Tot cap a la pantalla i es fa amb el teclat: fletxes per moure's, Enter per triar, Esc per tornar enrere.

import { audioContext, resumeAudio, loadSet, drum, setExtraLatency, outputLatencyMs, heardTime, click, stopAll, outputLevel, tone } from './audio.js';
import { BANDS, BAND_IDS, BAND_SETS, bandChords, bandKeyName, chordFromSymbol, barEvents } from './band.js';
import { card as cardById, cardLabel, PIECES, CLS_NAME, LEVELS, levelOf, ALL_MISSIONS, defaultBand, GROOVE_FOR_BREAK, lanesOf, barNotes, LANE_LABEL, LANE_COLOR } from './cards.js';
import { createSession } from './session.js';
import { createTrainer } from './trainer.js';
import { createInput } from './input.js';
import { createLanes } from './lanes.js';
import { createKit } from './kit.js';
import { createCardView, renderCardSVG } from './cardview.js';
import { createNotation } from './notation.js';
import * as store from './store.js';
import { STYLES, styleOf } from './styles.js';
import { savedCode, saveCode, listLibrary, loadLibrarySong, errorText, songFromLibrary } from './library.js';
import { BOOK, canPlay, toSpec, structure, rawFromLibrarySpec, customSong, partLabel } from './songs.js';
import { ROUTE, ALL_STEPS, stepById, stepBars as rawStepBars, stepCards as rawStepCards, stepSong, isChorus } from './route.js';
import { songFromMidi, progFromMidiSong, toBase64, fromBase64, midiEventsOf, midiBarEvents } from './midi.js';
import { summary as skillSummary } from './skills.js';

// Cada pas es toca sobre la roda de la cançó o, si cal l'estructura, sobre la cançó sencera.
const stepBars = (step, song, choice) => rawStepBars(step, stepSong(step, song), choice);
// Les cartes d'un pas, la que més es toca primer (la gran)
const stepCards = (step, song, choice) => {
  const bars = rawStepBars(step, stepSong(step, song), choice);
  const n = (c) => bars.filter((b) => b.card?.id === c.id).length;
  return rawStepCards(step, stepSong(step, song), choice).sort((a, b) => n(b) - n(a));
};

const $ = (id) => document.getElementById(id);
const esc = (t) => String(t ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ---- Icones (traç, com les del pòster) ----------------------------------------------------------------------
const ICON_PATHS = {
  drum: '<ellipse cx="12" cy="7" rx="8" ry="3"/><path d="M4 7v9c0 1.7 3.6 3 8 3s8-1.3 8-3V7"/><path d="M4 11l4 3.5 4-3.5 4 3.5 4-3.5"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/>',
  layers: '<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>',
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
  bolt: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
  ring: '<ellipse cx="12" cy="9" rx="9" ry="2.5"/><ellipse cx="12" cy="14" rx="9" ry="2.5"/><path d="M12 3v18"/>',
  sliders: '<path d="M5 3v18M12 3v18M19 3v18"/><rect x="3" y="7" width="4" height="3"/><rect x="10" y="13" width="4" height="3"/><rect x="17" y="5" width="4" height="3"/>',
  cards: '<rect x="3" y="6" width="12" height="15" rx="2"/><path d="M8 3h11a2 2 0 0 1 2 2v13"/>',
  note: '<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>',
  pen: '<path d="M4 20l4-1 11-11-3-3L5 16z"/><path d="M14 6l3 3"/>',
  map: '<path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2z"/><path d="M9 4v14M15 6v14"/>',
  clock: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2M9 2h6"/>',
  palette: '<path d="M12 3a9 9 0 1 0 0 18c1 0 1.5-.8 1.5-1.5 0-1.2-1-1.5-1-2.5s.8-2 2-2H17a4 4 0 0 0 4-4c0-4.4-4-8-9-8z"/><circle cx="7.5" cy="11" r="1"/><circle cx="10" cy="7" r="1"/><circle cx="15" cy="7" r="1"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/>',
  book: '<path d="M4 4h6a2 2 0 0 1 2 2v14a2 2 0 0 0-2-2H4zM20 4h-6a2 2 0 0 0-2 2v14a2 2 0 0 1 2-2h6z"/>',
  cloud: '<path d="M7 18a4 4 0 0 1 0-8 6 6 0 0 1 11.5 1.5A3.5 3.5 0 0 1 18 18z"/>',
  play: '<path d="M7 4l13 8-13 8z"/>',
  check: '<path d="M4 12l5 5L20 6"/>',
  bag: '<path d="M6 9a6 6 0 0 1 12 0v11a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1z"/><path d="M9 4.5V3h6v1.5M6 13h12M10 13v3h4v-3"/>',
  star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
};
const icon = (name) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON_PATHS[name] ?? ''}</svg>`;

// ---- Estat ------------------------------------------------------------------------------------------------
const S = {
  view: null,
  params: {},
  stack: [],
  play: null, // configuració de la partida oberta
  session: null,
  raf: null,
  hasMidi: false,
  screenKeys: null,
};
window.rockinDrums = S; // per a les proves (vegeu tools/)

// ---- Entrada --------------------------------------------------------------------------------------------
const input = createInput({
  onHit: handleHit,
  onDevices: showDevices,
  getCustomMap: () => store.settings().map,
  // Les tecles de la bateria només sonen al joc i a la configuració (als menús, les tecles serveixen per navegar).
  keysOn: () => S.view === 'play' || S.view === 'setup',
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
    toast(`Nota MIDI ${msg.note} desconeguda: configura la bateria.`);
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
  // Mentre la banda calla a l'entrenador de tempo, o durant un solo, cap veredicte.
  if (S.hiding || S.inSolo) return;
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
  pill.querySelector('span').textContent = S.hasMidi ? st.devices.join(', ') : st.error ? 'Sense bateria MIDI' : 'Teclat';
  $('setup-devices').textContent = st.error ?? (S.hasMidi ? `Connectada: ${st.devices.join(', ')}.` : 'No hi ha cap bateria connectada. Connecta-la per USB i espera uns segons (o fes servir el teclat).');
  $('my-sound').checked = mySoundOn();
  kit.showKeys(!S.hasMidi);
}

let toastTimer = null;
function toast(text) {
  let t = document.querySelector('.toast');
  if (!t) { t = document.createElement('div'); t.className = 'toast'; document.body.appendChild(t); }
  t.textContent = text;
  t.classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('on'), Math.max(3200, text.length * 55));
}

// ---- Dades del jugador ---------------------------------------------------------------------------------------
const player = () => store.player();
const currentSong = () => {
  const raw = player()?.song ?? null;
  // Cançons MIDI carregades abans de la v32: es tornen a dividir en frases (parts automàtiques)
  if (raw?.midi && !raw.parts && raw.auto !== 2) {
    try { raw.prog = progFromMidiSong(songFromMidi(fromBase64(raw.midi), '')); raw.auto = 2; store.save(); } catch { raw.auto = 2; }
  }
  return raw;
};
function routeRec(id) { return player()?.route?.[id] ?? null; }
function stepDone(id) {
  const r = routeRec(id);
  const st = stepById(id);
  return !!r && r.stars >= 2 && (!st?.voice || r.voiceOk);
}
/** El full de ruta: el primer pas que encara no està fet. */
function recommended() {
  return (ALL_STEPS.find((s) => !stepDone(s.id)) ?? ALL_STEPS[ALL_STEPS.length - 1]).id;
}
const levelDone = (L) => L.passos.filter((p) => stepDone(p.id)).length;
const stepsDone = () => ALL_STEPS.filter((s) => stepDone(s.id)).length;
const stepCode = (st) => (st.id === 'canco' ? '♪' : `${st.level.n}${st.id.slice(-1)}`);

function setSong(raw) {
  const p = player();
  if (!p) return;
  p.song = raw;
  p.mySongs = [raw, ...(p.mySongs ?? []).filter((s) => s.id !== raw.id)].slice(0, 12);
  store.save();
  updateTop();
}

// Patrons desbloquejats (com abans: una carta tocada amb ★★)
function thumb(c) {
  if (!c) return '';
  return c.img ? `<img src="${c.img}" alt="" loading="lazy">` : renderCardSVG(c);
}
const starText = (n) => '★'.repeat(n) + '☆'.repeat(3 - n);
function starsFor(id) {
  const p = player();
  return Math.max(p?.missions[id]?.stars ?? 0, p?.styleCards?.[id]?.stars ?? 0);
}
const unlocked = (id) => starsFor(id) >= 2;
const ALL_PATTERNS = () => [...ALL_MISSIONS, ...STYLES.flatMap((st) => st.cards.map((c) => c.id))];
const lockClass = (id) => (unlocked(id) ? ' unlocked' : ' locked');
const lockBadge = (id) => (unlocked(id) ? '<span class="lock-badge" title="Patró desbloquejat">🔓</span>' : '');

// ---- Navegació -------------------------------------------------------------------------------------------------
const STATIC = new Set(['setup', 'play']);
const SCREENS = {};

function nav(name, params = {}, { push = true } = {}) {
  if (S.view === 'play' && name !== 'play') stopSession();
  stopPreview();
  if (name === 'home' || name === 'who') S.stack = [];
  else if (push && S.view && S.view !== name) {
    S.stack.push({ name: S.view, params: { ...S.params, focusKey: undefined }, focusKey: document.activeElement?.dataset?.key });
  }
  S.view = name;
  S.params = params;
  S.screenKeys = null;
  for (const v of document.querySelectorAll('.view')) v.hidden = STATIC.has(name) ? v.id !== `v-${name}` : v.id !== 'v-screen';
  if (!STATIC.has(name)) {
    const root = $('v-screen');
    root.className = `view screen scr-${name}`;
    SCREENS[name](root, params);
  }
  if (name === 'setup') { renderSetup(); setKeys([['↑↓←→', 'moure'], ['Enter', 'tria'], ['Esc', 'enrere'], ['Espai F J', 'prova les tecles']]); }
  if (name === 'play') requestAnimationFrame(() => { lanes.resize(); drawIdle(); });
  updateTop();
  requestAnimationFrame(() => focusStart(params.focusKey));
}
function back() {
  const e = S.stack.pop();
  if (!e) { nav(store.currentName() ? 'home' : 'who', {}, { push: false }); return; }
  nav(e.name, { ...e.params, focusKey: e.focusKey }, { push: false });
}
/** Focus inicial: l'element guardat, el marcat amb data-autofocus o el primer que es pugui triar. */
function focusStart(key) {
  const root = STATIC.has(S.view) ? $(`v-${S.view}`) : $('v-screen');
  let el = key ? root.querySelector(`[data-key="${CSS.escape(key)}"]`) : null;
  if (S.view === 'play') el = $('btn-go');
  el ??= root.querySelector('[data-autofocus]') ?? visibleIn(root)[0];
  el?.focus({ preventScroll: true });
  el?.scrollIntoView?.({ block: 'nearest' });
}

function setKeys(list) {
  $('keys').innerHTML = list.map(([k, t]) => `<span>${k.split(' ').map((x) => `<kbd>${esc(x)}</kbd>`).join('')} ${esc(t)}</span>`).join('');
}

function updateTop() {
  const name = store.currentName();
  const chip = $('player-chip');
  chip.hidden = !name;
  chip.querySelector('span').textContent = name ?? '';
  const song = currentSong();
  const sc = $('song-chip');
  sc.hidden = !song || !name;
  if (song) sc.querySelector('span').textContent = `${song.titol}${song.artista ? ' · ' + song.artista : ''}`;
}

$('home-link').addEventListener('click', (e) => { e.preventDefault(); nav(store.currentName() ? 'home' : 'who'); });
$('midi-pill').addEventListener('click', () => nav('setup'));
$('player-chip').addEventListener('click', () => nav('who'));
$('song-chip').addEventListener('click', () => nav('song'));
$('my-sound').addEventListener('change', (e) => { store.settings().mySound = e.target.checked; store.save(); });
document.addEventListener('click', (e) => { if (e.target.closest('[data-back]')) { e.preventDefault(); back(); } });

/** Lliga els botons amb data-act a les funcions. */
function bind(root, acts) {
  root.querySelectorAll('[data-act]').forEach((el) => {
    const fn = acts[el.dataset.act];
    if (!fn) return;
    el.addEventListener(el.tagName === 'FORM' ? 'submit' : 'click', (e) => { e.preventDefault(); fn(el, e); });
  });
}
const head = (title, sub = '', right = '') => `<div class="scr-head"><button type="button" class="back" data-back tabindex="-1">← Enrere</button><h1>${esc(title)}</h1><span class="scr-sub">${sub}</span>${right ? `<div class="right">${right}</div>` : ''}</div>`;

// ---- Qui toca --------------------------------------------------------------------------------------------------
SCREENS.who = (root) => {
  const names = store.players();
  const cur = store.currentName();
  root.innerHTML = `<div class="who-wrap"><div class="who-box">
    <div class="who-logo"><div class="w1">PERCUSSIÓ</div><div class="w2">BATERIA</div><div class="w3">FULL DE RUTA · NIVELLS</div></div>
    <div class="panel col">
      <h2>Qui toca?</h2>
      ${names.length ? `<div class="list scroll who-list">${names.map((n) => {
        const pl = store.player(n);
        const done = ALL_STEPS.filter((s) => { const r = pl.route?.[s.id]; return r && r.stars >= 2 && (!s.voice || r.voiceOk); }).length;
        return `<button type="button" class="item" data-act="pick" data-name="${esc(n)}" data-key="p:${esc(n)}"${n === cur ? ' data-autofocus' : ''}><span class="ic">${icon('user')}</span><span class="tx"><b>${esc(n)}</b><small>${done} de ${ALL_STEPS.length} passos del full de ruta${pl.song ? ' · ' + esc(pl.song.titol) : ''}</small></span></button>`;
      }).join('')}</div>` : '<p class="muted">Escriu el teu nom per començar.</p>'}
      <form class="who-form" data-act="new"><input id="who-name" type="text" maxlength="24" placeholder="${names.length ? 'O escriu un nom nou' : 'El teu nom'}" autocomplete="off" ${names.length ? '' : 'data-autofocus'}><button type="submit" class="btn btn-red">Som-hi</button></form>
    </div></div></div>`;
  bind(root, {
    pick: (el) => { store.setCurrent(el.dataset.name); nav('home'); },
    new: () => { const n = $('who-name').value.trim(); if (!n) return; store.setCurrent(n); if (!player().seenHowto) nav('howto', { first: true }); else nav(currentSong() ? 'home' : 'song', currentSong() ? {} : { first: true }); },
  });
  setKeys([['↑↓', 'tria'], ['Enter', 'som-hi'], ['Tab', 'nom nou']]);
};

// ---- Inici -----------------------------------------------------------------------------------------------------
SCREENS.home = (root) => {
  if (!store.currentName()) { nav('who', {}, { push: false }); return; }
  const raw = currentSong();
  const song = raw ? toSpec(raw) : null;
  const st = stepById(recommended());
  const L = st.level;
  const cards = song ? stepCards(st, song, routeRec(st.id)?.choice) : [];
  const hasSolo = song && stepBars(st, song).some((b) => b.solo);
  const parts = raw ? structure(raw) : [];
  const done = stepsDone();
  const r = routeRec(st.id);
  const menu = [
    ['map', 'R', 'Full de ruta', `Els 10 nivells del pòster · ${done} de ${ALL_STEPS.length} passos`, () => nav('map')],
    ['bag', 'Q', 'Què sé fer', 'La motxilla: el que pots fer a la banda', () => nav('skills')],
    ['note', 'C', 'La cançó', raw ? `Ara: ${raw.titol}` : 'Tria amb quina cançó aprens', () => nav('song')],
    ['drum', 'B', 'Toca amb la banda', 'Qualsevol carta, sense final', () => nav('cards', { mode: 'free' })],
    ['clock', 'T', 'Entrenador de tempo', 'La banda calla: aguanta el pols', () => nav('cards', { mode: 'tempo' })],
    ['palette', 'E', "Inspirador d'estils", 'Del rock a la bossa nova', () => nav('styles')],
    ['chart', 'P', 'El meu perfil', 'Com vas i què et convé practicar', () => nav('profile')],
    ['gear', 'S', 'Configuració', 'La bateria i el retard del so', () => nav('setup')],
    ['book', 'A', 'Com es juga', 'La carta, escoltar i tocar', () => nav('howto')],
  ];
  root.innerHTML = `<div class="scr-body home">
    <div class="panel next-panel">
      ${raw ? `<div class="song-box"><div class="disc"></div><div class="t"><small>La teva cançó</small><b>${esc(raw.titol)}</b><span>${esc(raw.artista || 'Cançó pròpia')} · tempo ${song.songTempo} · ${esc(BANDS[song.band]?.name ?? song.band)}</span><div class="parts">${parts.slice(0, 10).map((p) => `<span class="part">${esc(partLabel(p.name) || '—')}<i>${p.bars.length}</i></span>`).join('')}${parts.length > 10 ? '<span class="part">…</span>' : ''}</div></div><div class="row" style="margin:0"><button type="button" class="btn" data-act="whole" data-key="whole">▶ Toca-la sencera <kbd>G</kbd></button><button type="button" class="btn btn-ghost" data-act="song" data-key="song">Canvia <kbd>C</kbd></button></div></div>`
        : `<div class="song-box"><div class="disc"></div><div class="t"><small>Primer de tot</small><b>Tria la teva cançó</b><span>Tot el full de ruta es fa sobre una cançó: la que toqueu amb el grup.</span></div></div>`}
      <div class="step-head">
        <span class="lvl-tag"><span class="num">${L.n}</span>Nivell ${L.n} · ${esc(L.titol)}</span>
        <h2>${esc(stepCode(st))} · ${esc(st.titol)}${r ? ` <span class="stars-big">${[0, 1, 2].map((i) => `<span class="${i < r.stars ? '' : 'off'}">★</span>`).join('')}</span>` : ''}</h2>
        <p>${esc(st.text)}</p>
        ${st.voice ? `<span class="voice-tag">${icon('mic').replace('<svg', '<svg width="16" height="16"')} ${st.voice === 'sing' ? 'Canta mentre toques' : 'Compta en veu alta mentre toques'}</span>` : ''}
      </div>
      <div class="np-cards"><div class="thumbs big-first n${Math.min(4, cards.length + (hasSolo ? 1 : 0))}">${cards.slice(0, 3).map((c) => `<div class="thumb">${thumb(c)}</div>`).join('')}${hasSolo ? '<div class="thumb thumb-solo">SOLO</div>' : ''}</div></div>
      <div class="np-side">
        <div class="home-map">
          <h3>Com fer-ho</h3>
          <ul class="howto-tips">${(st.com ?? []).map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
          ${raw && stepSong(st, song).form ? `<h3>On canvia la bateria a la cançó</h3>${songMap(st, song, r?.choice)}` : ''}
          <h3>Nivell ${L.n}: els passos</h3>
          <ol class="lvl-steps">${L.passos.map((p) => `<li class="${stepDone(p.id) ? 'ok' : p.id === st.id ? 'now' : ''}"><span>${stepDone(p.id) ? '✓' : p.id.slice(-1).toUpperCase()}</span>${esc(p.titol)}</li>`).join('')}</ol>
        </div>
        <div class="np-bottom">
          <div class="progress">Nivell ${L.n}: ${levelDone(L)} de ${L.passos.length}<span class="bar"><i style="width:${(levelDone(L) / L.passos.length) * 100}%"></i></span></div>
          <div class="progress">Full de ruta: ${done} de ${ALL_STEPS.length}<span class="bar"><i style="width:${(done / ALL_STEPS.length) * 100}%"></i></span></div>
          <div class="go-row">
            <button type="button" class="btn btn-red btn-go-big" data-act="go" data-key="go" data-autofocus>▶ ${raw ? 'Continua' : 'Tria la cançó'} <kbd>Enter</kbd></button>
            <button type="button" class="btn" data-act="map" data-key="map2">Tria un altre pas <kbd>R</kbd></button>
          </div>
        </div>
      </div>
    </div>
    <div class="panel menu-panel">
      <div class="who-line"><span>Hola, <b>${esc(store.currentName())}</b>!</span><button type="button" class="back" data-act="who" tabindex="-1">Canvia de jugador <kbd>J</kbd></button></div>
      <div class="list">${menu.map(([ic, k, t, sub], i) => `<button type="button" class="item" data-act="m${i}" data-key="m${i}"><span class="ic">${icon(ic)}</span><span class="tx"><b>${esc(t)}</b><small>${esc(sub)}</small></span><kbd class="k">${k}</kbd></button>`).join('')}</div>
    </div>
  </div>`;
  const acts = { go: () => (raw ? openStep(st.id) : nav('song')), song: () => nav('song'), whole: () => openStep('canco'), map: () => nav('map'), who: () => nav('who') };
  menu.forEach((m, i) => { acts[`m${i}`] = m[4]; });
  bind(root, acts);
  S.screenKeys = Object.fromEntries([...menu.map((m) => [m[1].toLowerCase(), m[4]]), ['j', () => nav('who')], ['g', () => (raw ? openStep('canco') : nav('song'))]]);
  setKeys([['Enter', raw ? 'continua el full de ruta' : 'tria la cançó'], ['↑↓←→', 'moure'], ['G', 'cançó sencera'], ['R Q C B T E P S A', 'dreceres']]);
};

// ---- Com es juga (la primera vegada, i des de l'inici amb A) ------------------------------------------------------
SCREENS.howto = (root, params) => {
  const c = cardById('p5');
  root.innerHTML = `<div class="howto"><div class="howto-box">
    <div class="scr-head"><button type="button" class="back" data-back tabindex="-1">← Enrere</button><h1>Com es juga</h1><span class="scr-sub">Tres coses i ja pots començar.</span></div>
    <div class="howto-steps">
      <div class="panel"><span class="num">1</span><h2>La carta diu què toques</h2><p>Cada columna és un temps (1 2 3 4). Blau: bombo, amb el peu dret. Verd: caixa. Groc: charles. Les rodones petites són cops fluixos.</p><div class="thumb">${thumb(c)}</div></div>
      <div class="panel"><span class="num">2</span><h2>Primer escoltes</h2><p>La banda i el joc toquen la carta tres compassos. La pilota vermella salta de temps en temps: mira on cau. Després sonen quatre baquetes (o un break) i…</p><p class="small">Sempre toques sobre la teva cançó: la que assageu amb el grup.</p></div>
      <div class="panel"><span class="num">3</span><h2>Ara tu!</h2><p>La banda continua i la bateria la fas tu. A cada cop et diu si ha anat bé. Al final, les estrelles diuen la precisió: amb ★★ el pas queda fet.</p><p class="small">${S.hasMidi ? 'Toca amb la bateria electrònica.' : 'Sense bateria: <kbd>Espai</kbd> bombo · <kbd>F</kbd> caixa · <kbd>J</kbd> charles.'}</p></div>
    </div>
    <div class="howto-foot"><button type="button" class="btn btn-red btn-go-big" data-act="ok" data-autofocus>${params.first ? 'Som-hi: tria la cançó' : 'Entesos'} <kbd>Enter</kbd></button><span>Ho pots tornar a veure des de l'inici (<kbd>A</kbd>). Mentre toques, el botó <b>? Ajuda</b> explica la carta i la partitura.</span></div>
  </div></div>`;
  bind(root, { ok: () => { const p = player(); if (p) { p.seenHowto = true; store.save(); } if (params.first) nav(currentSong() ? 'home' : 'song', currentSong() ? {} : { first: true }); else back(); } });
  setKeys([['Enter', params.first ? 'som-hi' : 'entesos'], ['Esc', 'enrere']]);
};

// ---- Escolta la cançó abans de triar-la -------------------------------------------------------------------------------
let previewTimer = null;
function stopPreview() {
  if (!previewTimer) return;
  clearTimeout(previewTimer);
  previewTimer = null;
  stopAll();
  const b = document.getElementById('song-listen');
  if (b) b.innerHTML = '▶ Escolta <kbd>E</kbd>';
}
/** Toca la roda de la cançó (4 compassos) amb la banda i la bateria, o el MIDI si en té. */
async function playPreview(raw) {
  if (previewTimer) { stopPreview(); return; }
  await resumeAudio();
  await loadSounds();
  const sp = toSpec(raw);
  const roda = stepSong(stepById('d1d'), sp).bars.slice(0, 4);
  let midi = null;
  try { midi = midiEventsOf(raw); } catch { midi = null; }
  const groove = sp.groove ?? cardById('p5');
  const ctx = audioContext();
  const spb = 60 / sp.songTempo;
  const t0 = ctx.currentTime + 0.15;
  roda.forEach((b, i) => {
    const start = t0 + i * 4 * spb;
    if (midi) for (const e of midiBarEvents(midi, b.idx)) tone(e.inst, e.pitch, start + e.beat * spb, e.dur * spb, { gain: e.gain });
    else {
      for (const e of barEvents(sp.band, b.chord, 'play')) e.notes.forEach((m, k) => { const off = e.strum ? Math.abs(e.strum) * k : 0; tone(e.inst, m, start + e.beat * spb + off, e.dur * spb - off, { gain: e.gain * (1 - k * 0.04) }); });
      for (const n of barNotes(groove)) drum(n.piece, start + n.beat * spb, { vel: PIECES[n.piece].ghost ? 0.5 : 0.85 });
    }
  });
  const btn = document.getElementById('song-listen');
  if (btn) btn.innerHTML = '■ Para <kbd>E</kbd>';
  previewTimer = setTimeout(stopPreview, (roda.length * 4 * spb + 0.6) * 1000);
}

// ---- La cançó ----------------------------------------------------------------------------------------------------
const ESTILS = ['pop', 'rock', 'reggae', 'rumba', 'funk', 'disco', 'punk', 'ska', 'reggaeton', 'cumbia', 'shuffle', 'swing', 'bossa', 'hiphop', 'trap', 'metal', 'balada'];
SCREENS.song = (root, params) => {
  const p = player();
  const mine = (p?.mySongs ?? []).filter((s) => s.font !== 'llibre');
  const src = params.src ?? (mine.length && currentSong()?.font !== 'llibre' ? 'mine' : 'book');
  const sources = [
    ['book', 'book', 'Llibre ROCKIN obert', `${BOOK.length} cançons per començar`],
    ['biblio', 'cloud', 'Biblioteca del professorat', 'Les del Generador (amb codi)'],
    ['write', 'pen', 'Escriu-la tu', 'Els acords i les parts'],
    ['midi', 'note', 'Carrega un MIDI', 'Sona la cançó amb la melodia'],
    ...(mine.length ? [['mine', 'note', 'Les meves cançons', `${mine.length} fetes servir`]] : []),
  ];
  root.innerHTML = `${head('La cançó', params.first ? 'Tot el full de ruta es fa sobre la cançó que tries: la que toqueu amb el grup.' : 'El full de ruta es fa sempre sobre aquesta cançó.')}
    <div class="scr-body songs">
      <div class="panel col"><h3>D'on la treus</h3><div class="list">${sources.map(([id, ic, t, sub]) => `<button type="button" class="item${id === src ? ' sel' : ''}" data-act="src" data-src="${id}" data-key="src:${id}"><span class="ic">${icon(ic)}</span><span class="tx"><b>${t}</b><small>${sub}</small></span></button>`).join('')}</div></div>
      <div class="panel col" id="song-mid"></div>
      <div class="panel col preview scroll" id="song-prev"></div>
    </div>`;
  bind(root, { src: (el) => nav('song', { ...params, src: el.dataset.src }, { push: false }) });
  const mid = $('song-mid');
  const prev = $('song-prev');
  let shown = null;
  const choose = (raw) => {
    if (!canPlay(raw)) { toast('Aquesta cançó és en 6/8: de moment el joc de bateria només fa 4/4.'); return; }
    setSong(raw);
    toast(`Cançó: ${raw.titol}`);
    if (params.after?.step) openStep(params.after.step);
    else if (params.first || !S.stack.length) nav('home');
    else back();
  };
  const preview = (raw) => {
    if (shown !== raw) stopPreview();
    shown = raw;
    if (!raw) { prev.innerHTML = '<p class="muted">Tria una cançó per veure com és.</p>'; return; }
    const ok = canPlay(raw);
    const sp = ok ? toSpec(raw) : null;
    const parts = structure(raw);
    prev.innerHTML = `<h3>La cançó</h3><div class="big">${esc(raw.titol)}</div><div class="muted">${esc(raw.artista || '')}</div>
      <div class="meta"><span>Tempo ${esc(raw.tempo)}${sp && sp.songTempo !== Number(raw.tempo) ? ` (per a la bateria, ${sp.songTempo})` : ''}</span><span>${esc(raw.metre || '4/4')}</span><span>${esc(raw.estil || 'pop')}${sp ? ' → banda ' + esc(BANDS[sp.band]?.name ?? sp.band) : ''}</span>${sp ? `<span>${sp.bars.length} compassos</span>` : ''}</div>
      ${raw.midi ? `<p class="small muted">🎹 Del MIDI: sona la cançó sense bateria${raw.melodia ? `, amb la melodia (${esc(raw.melodia)}) ben clara` : ' (no he trobat quina pista és la melodia)'}.</p>` : ''}
      ${ok ? '' : '<p class="muted">És en 6/8: de moment el joc de bateria només fa compassos de 4/4.</p>'}
      ${sp ? (() => {
        // El patró amb què la tocaràs: el del pas que et toca ara (i el patró propi de la cançó, si en porta)
        const st = stepById(recommended());
        const cs = stepCards(st, sp, routeRec(st.id)?.choice);
        const solo = stepBars(st, sp).some((b) => b.solo);
        return `<h3>El patró · pas ${esc(stepCode(st))}: ${esc(st.titol)}</h3>
          <div class="pv-cards n${Math.min(3, cs.length + (solo ? 1 : 0))}">${cs.slice(0, 3).map((c, i) => `<div class="pv-card${i ? '' : ' main'}"><div class="thumb">${thumb(c)}</div><small>${esc(cardLabel(c))}${c.title && !c.style ? ' · ' + esc(c.title) : ''}</small></div>`).join('')}${solo ? '<div class="pv-card"><div class="thumb thumb-solo">SOLO</div><small>Solo</small></div>' : ''}</div>
          ${sp.groove ? `<h3>Patró de bateria de la cançó (biblioteca)</h3><div class="pv-cards n1"><div class="pv-card"><div class="thumb">${thumb(sp.groove)}</div></div></div>` : ''}
          <h3>Parts</h3><div class="parts">${parts.map((pt) => `<span class="part" title="${esc(pt.bars.join(' '))}">${esc(partLabel(pt.name) || '—')}<i>${pt.bars.length}</i></span>`).join('')}</div>`;
      })() : `<h3>Estructura</h3><div class="parts">${parts.map((pt) => `<span class="part">${esc(partLabel(pt.name) || '—')}<i>${pt.bars.length}</i></span>`).join('')}</div>`}
      ${ok ? '<div class="song-listen"><button type="button" class="btn" id="song-listen" tabindex="-1">▶ Escolta <kbd>E</kbd></button><button type="button" class="btn btn-red" id="song-pick" style="flex:1">Tria aquesta cançó <kbd>Enter</kbd></button></div>' : ''}`;
    $('song-pick')?.addEventListener('click', () => choose(raw));
    $('song-listen')?.addEventListener('click', () => playPreview(raw));
  };
  /** Llista de cançons: el focus mostra la cançó i Enter la tria (amb el ratolí, doble clic o el botó). */
  const songList = (list, title) => {
    mid.innerHTML = `<h3>${esc(title)}</h3><div class="list scroll" id="song-items">${list.map((raw, i) => `<button type="button" class="item${canPlay(raw) ? '' : ' off'}${currentSong()?.id === raw.id ? ' sel' : ''}" data-i="${i}" data-key="s:${esc(raw.id)}"><span class="ic">${icon('note')}</span><span class="tx"><b>${esc(raw.titol)}</b><small>${esc(raw.artista || '')}${raw.tempo ? ` · ${esc(raw.tempo)}` : ''}${raw.estil ? ` · ${esc(raw.estil)}` : ''}${canPlay(raw) ? '' : ' · 6/8'}</small></span><span class="st" title="Dificultat">${'●'.repeat(Math.min(3, (raw.nivell ?? 0) + 1))}</span></button>`).join('') || '<p class="muted">No hi ha cap cançó.</p>'}</div>`;
    mid.querySelectorAll('[data-i]').forEach((el) => {
      const raw = list[Number(el.dataset.i)];
      el.addEventListener('focus', () => preview(raw));
      // Teclat: Enter tria. Ratolí: el primer clic mostra la cançó, el segon la tria.
      let wasShown = false;
      el.addEventListener('pointerdown', () => { wasShown = shown === raw; });
      el.addEventListener('click', (e) => { if (e.detail === 0 || wasShown) choose(raw); else preview(raw); });
      el.addEventListener('dblclick', () => choose(raw));
    });
    preview(list.find((r) => r.id === currentSong()?.id) ?? list[0] ?? null);
  };
  if (src === 'book') songList(BOOK.map((b) => ({ ...b, font: 'llibre' })), 'Llibre ROCKIN obert');
  else if (src === 'mine') songList(mine, 'Les meves cançons');
  else if (src === 'write') {
    const draft = S.songDraft ?? { titol: '', prog: '[Estrofa] Am | F | C | G | Am | F | C | G | [Tornada] C | G | Am | F | C | G | Am | F', tempo: 90, estil: 'pop' };
    mid.innerHTML = `<h3>Escriu-la tu</h3><form class="song-form" id="song-form">
      <label>Títol <input type="text" id="sf-title" value="${esc(draft.titol)}" placeholder="La nostra cançó" autocomplete="off"></label>
      <label>Acords: un per compàs, separats per «|». Les parts entre claudàtors. <textarea id="sf-prog" spellcheck="false">${esc(draft.prog)}</textarea></label>
      <div class="two"><label>Tempo <input type="number" id="sf-tempo" min="50" max="200" value="${esc(draft.tempo)}"></label>
      <label>Estil <select id="sf-estil">${ESTILS.map((e) => `<option${e === draft.estil ? ' selected' : ''}>${e}</option>`).join('')}</select></label></div>
      <button type="submit" class="btn btn-red">Fes servir aquesta cançó</button></form>`;
    const read = () => ({ titol: $('sf-title').value.trim(), prog: $('sf-prog').value, tempo: Number($('sf-tempo').value) || 90, estil: $('sf-estil').value });
    const upd = () => { S.songDraft = read(); preview(customSong(S.songDraft)); };
    mid.querySelectorAll('input, textarea, select').forEach((el) => el.addEventListener('input', upd));
    $('song-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const raw = customSong(read());
      if (!toSpec(raw).bars.length) { toast('Escriu almenys un acord.'); return; }
      choose(raw);
    });
    upd();
  } else if (src === 'midi') {
    mid.innerHTML = `<h3>Carrega un MIDI</h3><form class="song-form" id="midi-form">
      <label>Fitxer MIDI (.mid) <input type="file" id="mf-file" accept=".mid,.midi,audio/midi"></label>
      <label>Títol <input type="text" id="mf-title" placeholder="El nom de la cançó" autocomplete="off"></label>
      <label>Parts (si el MIDI no en porta): nom i compassos <input type="text" id="mf-parts" placeholder="Intro 4, Estrofa 8, Tornada 8, Estrofa 8, Tornada 8" autocomplete="off"></label>
      <label>Estil <select id="mf-estil">${ESTILS.map((e) => `<option>${e}</option>`).join('')}</select></label>
      <p class="muted small" id="mf-msg">El joc toca el MIDI sense la bateria: la bateria la poses tu. Funciona amb MIDI de 4/4 (en trobaràs de karaoke de moltes cançons). Si el MIDI té marcadors de part, els fa servir.</p>
      <button type="submit" class="btn btn-red" id="mf-use" disabled>Fes servir aquesta cançó</button></form>`;
    let buf = null;
    let made = null;
    const build = () => {
      if (!buf || !$('mf-msg')) return;
      try {
        const ms = songFromMidi(buf, $('mf-parts').value);
        const titol = $('mf-title').value.trim() || ($('mf-file').files[0]?.name ?? 'Cançó MIDI').replace(/\.midi?$/i, '');
        made = { auto: 2, id: made?.id ?? `midi:${Date.now()}`, titol, artista: '', prog: progFromMidiSong(ms), metre: ms.metre === '4/4' || ms.metre === '2/4' ? ms.metre : ms.metre, tempo: ms.tempo, estil: $('mf-estil').value, font: 'midi', midi: toBase64(buf), parts: $('mf-parts').value, melodia: ms.melody };
        $('mf-msg').textContent = `${ms.bars} compassos · tempo ${ms.tempo} · ${ms.metre}${ms.parts.length > 1 ? ` · ${ms.parts.length} parts` : ' · sense parts (escriu-les a dalt si cal)'}${ms.melody ? ` · melodia: ${ms.melody}` : ' · no he trobat la melodia'}`;
        $('mf-use').disabled = !canPlay(made);
        if (!canPlay(made)) $('mf-msg').textContent += ' · de moment només es poden fer servir MIDI de 4/4.';
        preview(made);
      } catch (err) { $('mf-msg').textContent = `No s'ha pogut llegir: ${err.message}`; $('mf-use').disabled = true; }
    };
    $('mf-file').addEventListener('change', async () => {
      const f = $('mf-file').files[0];
      if (!f) return;
      if (f.size > 400000) { $('mf-msg').textContent = 'El fitxer és massa gran (més de 400 kB).'; return; }
      buf = await f.arrayBuffer();
      if (!$('mf-title')) return;
      if (!$('mf-title').value) $('mf-title').value = f.name.replace(/\.midi?$/i, '');
      build();
    });
    for (const id of ['mf-title', 'mf-parts', 'mf-estil']) $(id).addEventListener('change', build);
    $('midi-form').addEventListener('submit', (e) => { e.preventDefault(); if (made && canPlay(made)) choose(made); });
    preview(null);
  } else if (src === 'biblio') {
    const code = savedCode();
    mid.innerHTML = `<h3>Biblioteca del professorat</h3><form class="song-form" id="lib-form"><label>Codi del professorat <input type="text" id="lib-code" value="${esc(code)}" autocomplete="off"></label><button type="submit" class="btn">Obre la biblioteca</button></form><p id="lib-msg" class="muted small"></p><div class="list scroll" id="lib-list"></div>`;
    // La biblioteca respon tard: si mentrestant s'ha canviat de pantalla, no es toca res
    const libMsg = (t) => { const e = $('lib-msg'); if (e) e.textContent = t; };
    const open = async (c) => {
      libMsg('Obrint la biblioteca…');
      try {
        const list = await listLibrary(c);
        saveCode(c);
        libMsg(list.length ? `${list.length} cançons. 🥁 = porta patró de bateria.` : 'La biblioteca és buida.');
        if (!$('lib-list')) return;
        $('lib-list').innerHTML = list.map((it, i) => `<button type="button" class="item" data-i="${i}" data-key="b:${esc(it.id)}"><span class="ic">${icon('cloud')}</span><span class="tx"><b>${esc(it.titol || it.nom)}</b><small>${esc(it.artista || '')}${it.autor ? ' · ' + esc(it.autor) : ''}</small></span>${(it.instruments ?? []).includes('bateria') ? '<span class="k">🥁</span>' : ''}</button>`).join('');
        const loaded = new Map();
        const load = async (it) => {
          if (loaded.has(it.id)) return loaded.get(it.id);
          const song = await loadLibrarySong(c, it.id);
          const spec = songFromLibrary(song, it, { chordFromSymbol });
          const raw = rawFromLibrarySpec(spec, it, song?.metre ?? song?.compas ?? '4/4');
          loaded.set(it.id, raw);
          return raw;
        };
        $('lib-list').querySelectorAll('[data-i]').forEach((el) => {
          const it = list[Number(el.dataset.i)];
          const go = async (pick) => {
            libMsg(`Obrint «${it.titol || it.nom}»…`);
            try { const raw = await load(it); libMsg(''); if (pick) choose(raw); else if (document.activeElement === el || !pick) preview(raw); } catch (err) { libMsg(errorText(err)); }
          };
          el.addEventListener('click', (e) => go(e.detail === 0));
          el.addEventListener('dblclick', () => go(true));
        });
        $('lib-list').querySelector('.item')?.focus();
      } catch (err) { libMsg(errorText(err)); }
    };
    $('lib-form').addEventListener('submit', (e) => { e.preventDefault(); const c = $('lib-code').value.trim(); if (!c) { libMsg(errorText(new Error('sense-codi'))); return; } open(c); });
    preview(null);
    if (code) open(code);
  }
  // El focus comença a la llista (o a la font si no n'hi ha)
  if (!params.focusKey) {
    const first = mid.querySelector('.item.sel') ?? mid.querySelector('.item') ?? mid.querySelector('input, textarea');
    first?.setAttribute('data-autofocus', '');
  }
  setKeys([['↑↓', 'cançó'], ['←→', 'font / llista'], ['E', 'escolta-la'], ['Enter', 'tria la cançó'], ['Esc', 'enrere']]);
  S.screenKeys = { e: () => { if (shown && canPlay(shown)) playPreview(shown); } };
};

// ---- Full de ruta (el pòster) ------------------------------------------------------------------------------------
SCREENS.map = (root, params) => {
  const cur = stepById(recommended()).level.n;
  root.classList.add('poster-scr');
  root.innerHTML = `<div class="poster">
    <div class="poster-head"><button type="button" class="back" data-back tabindex="-1">← Enrere</button><span class="w1">PERCUSSIÓ</span><span class="w2">BATERIA</span><span class="w3">FULL DE RUTA · NIVELLS</span></div>
    <div class="poster-grid">${ROUTE.map((L) => {
      const d = levelDone(L);
      return `<button type="button" class="ptile${L.n === cur ? ' cur' : ''}${d === L.passos.length ? ' done' : ''}" data-act="lv" data-n="${L.n}" data-key="lv${L.n}"${L.n === cur ? ' data-autofocus' : ''}><span class="num">${d === L.passos.length ? '✓' : L.n}</span><b>${esc(L.titol)}</b><small>${esc(L.sub)}</small><span class="pb"><span class="bar"><i style="width:${(d / L.passos.length) * 100}%"></i></span>${d}/${L.passos.length}</span><span class="pi">${icon(L.icon)}</span></button>`;
    }).join('')}</div>
    <div class="poster-foot"><span>ROCKIN · [R]EVOLUCIONEM LA MÚSICA${currentSong() ? ' · ' + esc(currentSong().titol.toUpperCase()) : ''}</span><em>Pugem de nivell?</em></div>
  </div>`;
  bind(root, { lv: (el) => nav('level', { n: Number(el.dataset.n) }) });
  setKeys([['↑↓←→', 'nivell'], ['Enter', 'obre el nivell'], ['Esc', 'enrere']]);
  void params;
};

// ---- Un nivell -------------------------------------------------------------------------------------------------------
SCREENS.level = (root, params) => {
  const L = ROUTE.find((x) => x.n === params.n) ?? ROUTE[0];
  const raw = currentSong();
  const song = raw ? toSpec(raw) : null;
  const rec = recommended();
  const startId = params.step ?? (L.passos.find((p) => p.id === rec)?.id ?? L.passos.find((p) => !stepDone(p.id))?.id ?? L.passos[0].id);
  root.innerHTML = `${head(`Nivell ${L.n} · ${L.titol}`, esc(L.sub), `<span class="muted small">${levelDone(L)} de ${L.passos.length} passos fets</span>`)}
    <div class="scr-body level">
      <div class="panel col"><h3>Passos</h3><div class="list scroll">${L.passos.map((p) => {
        const r = routeRec(p.id);
        const ok = stepDone(p.id);
        return `<button type="button" class="item${ok ? ' done' : ''}" data-act="play" data-id="${p.id}" data-key="st:${p.id}"${p.id === startId ? ' data-autofocus' : ''}><span class="ic">${ok ? icon('check') : `<b>${p.id.slice(-1).toUpperCase()}</b>`}</span><span class="tx"><b>${esc(p.titol)}</b><small>${r ? `${r.tempo ? 'tempo ' + r.tempo : ''}${r.attempts ? ` · ${r.attempts} ${r.attempts === 1 ? 'intent' : 'intents'}` : ''}` : p.id === rec ? 'Et toca' : 'Encara no'}</small></span><span class="st">${r ? starText(r.stars) : ''}</span></button>`;
      }).join('')}</div></div>
      <div class="panel level-detail" id="lv-detail"></div>
    </div>`;
  const detail = $('lv-detail');
  const show = (id) => {
    const p = L.passos.find((x) => x.id === id);
    const st = stepById(id);
    const r = routeRec(id);
    const cards = song ? stepCards(st, song, r?.choice) : [];
    const solo = song && stepBars(st, song).some((b) => b.solo);
    detail.innerHTML = `<div class="ld-head"><span class="lvl-tag"><span class="num">${L.n}</span>Pas ${esc(stepCode(st))}</span><h2>${esc(p.titol)}</h2></div>
      <div class="ld-text"><p>${esc(p.text)}</p><ul>${(p.com ?? []).map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
        ${p.voice ? `<span class="voice-tag">${icon('mic').replace('<svg', '<svg width="16" height="16"')} ${p.voice === 'sing' ? 'Canta mentre toques: al final et preguntarà si ho has pogut fer.' : 'Compta en veu alta: al final et preguntarà si ho has pogut fer.'}</span>` : ''}
        ${!raw ? '<p class="muted">Primer tria la cançó.</p>' : stepSong(st, song).form ? `<h3>On canvia la bateria a ${esc(raw.titol)}</h3>${songMap(st, song, r?.choice)}` : `<p class="muted small">Es toca sobre la roda de ${esc(raw.titol)} (${stepSong(st, song).bars.length} compassos).</p>`}</div>
      <div class="ld-cards"><div class="thumbs big-first n${Math.min(4, cards.length + (solo ? 1 : 0))}">${cards.slice(0, 3).map((c) => `<div class="thumb">${thumb(c)}</div>`).join('')}${solo ? '<div class="thumb thumb-solo">SOLO</div>' : ''}</div></div>
      <div class="ld-foot"><span class="stars-big">${[0, 1, 2].map((i) => `<span class="${i < (r?.stars ?? 0) ? '' : 'off'}">★</span>`).join('')}</span><span class="muted small">${r?.tempo ? `Millor: tempo ${r.tempo}` : 'Per fer-lo: ★★ (75 % de precisió)'}</span><button type="button" class="btn btn-red" data-play="${id}" tabindex="-1" style="margin-left:auto">▶ Toca <kbd>Enter</kbd></button></div>`;
    detail.querySelector('[data-play]').addEventListener('click', () => openStep(id));
  };
  // Teclat: Enter toca. Ratolí: el primer clic mostra el pas, el segon el toca (com a totes les llistes).
  let shownId = null;
  root.querySelectorAll('[data-act="play"]').forEach((el) => {
    let wasShown = false;
    el.addEventListener('focus', () => { show(el.dataset.id); shownId = el.dataset.id; });
    el.addEventListener('pointerdown', () => { wasShown = shownId === el.dataset.id; });
    el.addEventListener('click', (e) => { if (e.detail === 0 || wasShown) openStep(el.dataset.id); });
  });
  show(params.focusKey?.startsWith('st:') ? params.focusKey.slice(3) : startId);
  const goLevel = (d) => { const n = L.n + d; if (n >= 1 && n <= ROUTE.length) nav('level', { n }, { push: false }); };
  S.screenKeys = { arrowleft: () => goLevel(-1), arrowright: () => goLevel(1) };
  setKeys([['↑↓', 'pas'], ['Enter', 'toca'], ['←→', 'nivell anterior / següent'], ['Esc', 'full de ruta']]);
};

// ---- Què sé fer (la motxilla) ----------------------------------------------------------------------------------------
const stepState = (id) => (stepDone(id) ? 'ok' : (routeRec(id)?.stars ?? 0) >= 1 ? 'gairebe' : null);
SCREENS.skills = (root, params) => {
  const levels = skillSummary({ state: stepState, rec: routeRec });
  const on = levels.filter((x) => x.unlocked);
  const nx = stepById(recommended());
  const k = Math.min(9, params.k ?? Math.max(0, nx.level.n - 1));
  const raw = currentSong();
  root.innerHTML = `${head('Què sé fer', 'El que has desbloquejat al full de ruta i què vol dir quan toques amb la teva banda.', '<button type="button" class="btn btn-ghost" data-act="print" tabindex="-1">Imprimeix <kbd>I</kbd></button>')}
    <div class="scr-body skills">
      <div class="panel col"><h3>Nivells</h3><div class="list scroll">${levels.map((x, i) => `<button type="button" class="item${x.done ? ' done' : ''}${x.unlocked ? '' : ' dim'}${i === k ? ' sel' : ''}" data-act="lv" data-k="${i}" data-key="sk${i}"${i === k ? ' data-autofocus' : ''}><span class="ic">${x.done ? icon('check') : `<b>${x.level.n}</b>`}</span><span class="tx"><b>${esc(x.level.titol)}</b><small>${x.ok.length} de ${x.level.passos.length} passos${x.tempo ? ` · fins a ${x.tempo} bpm` : ''}</small></span><span class="st">${x.done ? '✓' : x.unlocked ? '◐' : '🔒'}</span></button>`).join('')}</div></div>
      <div class="panel col skill-detail scroll" id="sk-detail"></div>
      <div class="panel col scroll bag">
        <div class="bag-top"><div><small>Cançó</small><b>${esc(raw?.titol ?? '—')}</b></div><div><small>Nivells desbloquejats</small><b>${on.length} de 10</b></div><div><small>Ara treballes</small><b>${esc(stepCode(nx))} · ${esc(nx.titol)}</b></div></div>
        <h3>${icon('bag').replace('<svg', '<svg width="15" height="15"')} A la banda ja pots…</h3>
        ${on.length ? `<ul>${on.map((x) => `<li><span class="num">${x.level.n}</span>${esc(x.banda)}</li>`).join('')}</ul>` : '<p class="muted">Encara res: comença pel nivell 1. Un pas compta quan el toques amb ★★.</p>'}
      </div>
    </div>`;
  const show = (i) => {
    const x = levels[i];
    S.params = { ...S.params, k: i };
    root.querySelectorAll('[data-act="lv"]').forEach((el) => el.classList.toggle('sel', Number(el.dataset.k) === i));
    const cards = [...new Set(x.ok.flatMap((p) => { const b = p.plan; return [b.groove, b.first?.card, b.fill?.card, b.vary?.card, b.stop?.card, ...(b.parts ?? [])]; }).filter((id) => id && id !== 'style' && cardById(id)))];
    $('sk-detail').innerHTML = `<span class="lvl-tag"><span class="num">${x.level.n}</span>Nivell ${x.level.n}</span><h2 class="sk-title">${esc(x.level.titol)}</h2><p class="muted">${esc(x.level.sub)}</p>
      <p class="sk-banda${x.unlocked ? '' : ' off'}">${x.unlocked ? esc(x.banda) : `🔒 ${esc(BANDA_TXT(x.level.n))}`}</p>
      <ul class="sk-steps">${x.level.passos.map((p) => { const st = stepState(p.id); return `<li class="${st ?? ''}">${st === 'ok' ? '✓' : st === 'gairebe' ? '◐' : '·'} ${esc(p.titol)}${routeRec(p.id) ? ` <span class="st">${starText(routeRec(p.id).stars)}</span>` : ''}</li>`; }).join('')}</ul>
      ${cards.length ? `<h3>Cartes que ja toques</h3><div class="sk-cards">${cards.map((id) => `<div class="thumb">${thumb(cardById(id))}</div>`).join('')}</div>` : ''}`;
  };
  root.querySelectorAll('[data-act="lv"]').forEach((el) => el.addEventListener('focus', () => show(Number(el.dataset.k))));
  bind(root, { lv: (el) => nav('level', { n: levels[Number(el.dataset.k)].level.n }), print: () => window.print() });
  show(k);
  S.screenKeys = { i: () => window.print() };
  setKeys([['↑↓', 'nivell'], ['Enter', 'obre el nivell'], ['I', 'imprimeix'], ['Esc', 'enrere']]);
};
const BANDA_TXT = (n) => `Quan el desbloquegis: ${skillSummary({ state: () => 'ok', rec: () => null })[n - 1].banda.charAt(0).toLowerCase()}${skillSummary({ state: () => 'ok', rec: () => null })[n - 1].banda.slice(1)}`;

// ---- Tria de carta (toca amb la banda / entrenador de tempo) -------------------------------------------------------
function cardTiles(ids, act, { stars } = {}) {
  return `<div class="tiles">${ids.map((id) => {
    const c = cardById(id);
    if (!c) return '';
    const st = stars?.(id);
    return `<button type="button" class="tile${lockClass(id)}" data-act="${act}" data-id="${id}" data-key="c:${id}"><div class="tile-img">${thumb(c)}${lockBadge(id)}</div><div class="tile-txt"><b>${esc(cardLabel(c))}</b><small>${esc(c.style ? '' : c.title || '')}</small>${st != null ? `<span class="tile-stars">${starText(st)}</span>` : ''}</div></button>`;
  }).join('')}</div>`;
}
const STYLE_IDS = () => STYLES.flatMap((st) => st.cards.map((c) => c.id));
SCREENS.cards = (root, params) => {
  const tempo = params.mode === 'tempo';
  const groups = tempo
    ? [['Per començar', ['w2', 'w3', 'p1', 'p2', 'p5', 'p8']], ['Una mica més', ['p9', 'p10', 'p12', 'p13', 'p17', 'p18', 'p11', 'p14']], ['Estils', STYLES.map((st) => st.cards[0].id)], ['Shuffle', ['s1', 's2']]]
    : [...LEVELS.map((L) => [L.name, L.missions]), ['Estils', STYLE_IDS()]];
  const g = Math.min(groups.length - 1, params.g ?? 0);
  const best = player()?.tempoBest;
  const sub = tempo
    ? (best ? `La banda calla i tu aguantes. Rècord: ${best.bars} ${best.bars === 1 ? 'compàs' : 'compassos'} en silenci (tempo ${best.tempo}).` : 'La banda toca, calla i torna: tu no paris. Si aguantes, el silenci següent és més llarg.')
    : 'Tria una carta: la banda tocarà fins que diguis prou.';
  root.innerHTML = `${head(tempo ? 'Entrenador de tempo' : 'Toca amb la banda', esc(sub))}
    <div class="scr-body picker">
      <div class="panel col"><h3>Cartes</h3><div class="list scroll">${groups.map(([name, ids], i) => `<button type="button" class="item${i === g ? ' sel' : ''}" data-act="g" data-g="${i}" data-key="g${i}"${i === g ? ' data-autofocus' : ''}><span class="tx"><b>${esc(name)}</b><small>${ids.length} cartes · ${ids.filter(unlocked).length} desbloquejades</small></span></button>`).join('')}</div></div>
      <div class="panel col scroll" id="pick-grid">${cardTiles(groups[g][1], 'card')}</div>
    </div>`;
  const open = (id) => {
    if (tempo) openTempo(id);
    else {
      openFree(id);
      const st = styleOf(id);
      if (st) { S.play.band = st.band; $('band-sel').value = st.band; }
    }
  };
  bind(root, { g: (el) => $('pick-grid').querySelector('.tile')?.focus() || void el, card: (el) => open(el.dataset.id) });
  root.querySelectorAll('[data-act="g"]').forEach((el) => el.addEventListener('focus', () => {
    const i = Number(el.dataset.g);
    if (i === S.params.g || (S.params.g == null && i === 0)) return;
    S.params = { ...S.params, g: i };
    root.querySelectorAll('[data-act="g"]').forEach((x) => x.classList.toggle('sel', x === el));
    $('pick-grid').innerHTML = cardTiles(groups[i][1], 'card');
    $('pick-grid').querySelectorAll('[data-act="card"]').forEach((t) => t.addEventListener('click', () => open(t.dataset.id)));
  }));
  setKeys([['↑↓', 'grup'], ['→', 'a les cartes'], ['Enter', 'toca'], ['Esc', 'enrere']]);
};

// ---- Inspirador d'estils ------------------------------------------------------------------------------------------------
SCREENS.styles = (root, params) => {
  const p = player();
  const starsOf = (id) => (styleOf(id) ? p?.styleCards?.[id]?.stars : store.mission(id)?.stars) ?? 0;
  const k = Math.min(STYLES.length - 1, params.k ?? 0);
  root.innerHTML = `${head("Inspirador d'estils", 'Cada estil té la seva manera de tocar la bateria.', '<a class="btn btn-ghost" href="imprimir/cartes-estils-rockin.pdf" target="_blank" rel="noopener" tabindex="-1">Cartes per imprimir (PDF)</a>')}
    <div class="scr-body styles">
      <div class="panel col"><h3>Estils</h3><div class="list scroll">${STYLES.map((st, i) => {
        const done = st.cards.filter((c) => (p?.styleCards?.[c.id]?.stars ?? 0) >= 2).length;
        return `<button type="button" class="item${i === k ? ' sel' : ''}" data-act="st" data-k="${i}" data-key="st${i}"${i === k ? ' data-autofocus' : ''}><span class="tx"><b>${esc(st.name)}</b><small>${esc(st.era)}</small></span><span class="st">${done}/${st.cards.length}</span></button>`;
      }).join('')}</div></div>
      <div class="panel style-detail scroll" id="st-detail"></div>
    </div>`;
  const show = (i) => {
    const st = STYLES[i];
    S.params = { ...S.params, k: i };
    root.querySelectorAll('[data-act="st"]').forEach((x) => x.classList.toggle('sel', Number(x.dataset.k) === i));
    $('st-detail').innerHTML = `<div class="big">${esc(st.name)}</div><div class="meta"><span>${esc(st.era)}</span><span>Tempo típic: ${st.tempo}</span><span>Banda: ${esc(BANDS[st.band]?.name ?? '')} · ${esc(bandKeyName(st.band))}</span></div><p class="lead">${esc(st.text)}</p><p class="small"><b>Escolta-hi:</b> ${esc(st.listen)}</p><h3>Cartes noves</h3>${cardTiles(st.cards.map((c) => c.id), 'new', { stars: starsOf })}${st.also.length ? `<h3>Cartes ROCKIN que també hi encaixen</h3>${cardTiles(st.also, 'also', { stars: starsOf })}` : ''}`;
    $('st-detail').querySelectorAll('[data-act="new"]').forEach((t) => t.addEventListener('click', () => openStyleCard(t.dataset.id)));
    $('st-detail').querySelectorAll('[data-act="also"]').forEach((t) => t.addEventListener('click', () => openStyleCardFor(t.dataset.id, st)));
  };
  root.querySelectorAll('[data-act="st"]').forEach((el) => {
    el.addEventListener('focus', () => show(Number(el.dataset.k)));
    el.addEventListener('click', () => $('st-detail').querySelector('.tile')?.focus());
  });
  show(k);
  setKeys([['↑↓', 'estil'], ['→ Enter', 'a les cartes'], ['Enter', 'toca'], ['Esc', 'enrere']]);
};

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

/** Un pas del full de ruta, sobre la cançó triada. */
function openStep(id, opts = {}) {
  const step = stepById(id);
  const raw = currentSong();
  if (!raw) { nav('song', { after: { step: id }, first: true }); return; }
  const song = toSpec(raw);
  const p = player();
  const rec = routeRec(id);
  const choice = opts.choice ?? rec?.choice ?? (step.plan.choose ? { groove: song.groove?.id ?? 'p5', brk: 'break1' } : {});
  const bars = stepBars(step, song, choice);
  const cards = stepCards(step, song, choice);
  const groove = bars.find((b) => b.card && !b.card.brk && !b.stop)?.card ?? cards[0];
  const tempo = rec?.lastTempo || Math.min(song.songTempo, step.tempoMax ?? 120);
  const form = stepSong(step, song).form;
  let midiEvents = null;
  try { midiEvents = midiEventsOf(raw); } catch { midiEvents = null; }
  // La banda marca l'estructura (només quan es toca la cançó sencera i no hi ha MIDI)
  const roles = [];
  if (form && !midiEvents) {
    const hasChorus = bars.some((b) => isChorus(b.part));
    let pi = -1;
    bars.forEach((b, j) => {
      if (b.partStart || j === 0) pi++;
      roles[j] = /^intro/i.test(b.part ?? '') ? 'intro' : (hasChorus ? isChorus(b.part) : pi % 2 === 1) ? 'chorus' : 'verse';
    });
  }
  S.play = {
    mode: 'route',
    step,
    song,
    raw,
    choice,
    bars,
    cards,
    hasSolo: bars.some((b) => b.solo),
    groove,
    cardId: groove.id,
    level: null,
    tempo,
    songTempo: song.songTempo,
    band: song.band,
    supports: p?.routeSupports ?? 1,
    viewType: step.id === 'canco' ? 'guio' : (p?.viewType === 'guio' ? 'score' : p?.viewType ?? 'score'),
    metronome: step.level.n === 1 && !rec,
    quiet: false,
    title: `${stepCode(step)} · ${step.titol}`,
    sub: `${song.title}${song.artist ? ' · ' + song.artist : ''}${midiEvents ? ' (MIDI)' : ''} · ${stepSong(step, song).form ? 'tota la cançó' : 'la roda de la cançó'}${step.level.n ? ` · Nivell ${step.level.n}: ${step.level.titol}` : ''}`,
    playBars: bars.length,
    form,
    roles,
    midiEvents,
  };
  preparePlay();
}

/** Practica una carta (des del perfil): 8 compassos amb la banda. */
function openMission(cardId) {
  const c = cardById(cardId);
  const L = levelOf(cardId);
  const p = player();
  const m = store.mission(cardId);
  const brk = c.brk;
  S.play = {
    mode: 'mission',
    cardId,
    level: L,
    cards: brk ? [cardById(GROOVE_FOR_BREAK), c] : [c],
    tempo: m?.lastTempo || L?.tempo || 85,
    band: p?.bands[cardId] ?? defaultBand(cardId),
    supports: (L && p?.supports[L.id]) ?? L?.supports ?? 1,
    viewType: p?.viewType ?? 'score',
    metronome: false,
    quiet: false,
    title: `${cardLabel(c)}${c.title ? ' · ' + c.title : ''}`,
    sub: 'Practica la carta · 8 compassos amb la banda',
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
    band: player()?.bands[cardId] ?? defaultBand(cardId),
    supports: 1,
    viewType: player()?.viewType ?? 'score',
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
    band: st?.band ?? player()?.bands[cardId] ?? defaultBand(cardId),
    supports: 1,
    viewType: player()?.viewType ?? 'score',
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
  const p = player();
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

function preparePlay() {
  stopSession();
  toggleOpts(false);
  $('help').hidden = true;
  const P = S.play;
  $('play-title').textContent = P.title;
  $('play-sub').textContent = P.sub;
  $('tempo-val').textContent = P.tempo;
  $('band-sel').value = P.band;
  applyView();
  $('metro').checked = P.metronome;
  $('quiet').checked = P.quiet;
  $('result').hidden = true;
  $('quiet-wrap').hidden = P.mode === 'route' || P.mode === 'tempo';
  buildCards();
  buildStrip();
  buildGuio();
  if (P.viewType === 'guio' && !(P.mode === 'route' && P.form)) { P.viewType = 'score'; applyView(); }
  syncChoose();
  lanes.setLanes(lanesOf(...P.cards));
  kit.setUsed(P.cards.flatMap((c) => Object.keys(c.notes)));
  resetTimeDots();
  setCoach(introText());
  setGoButton('idle');
  if (S.view === 'play') { requestAnimationFrame(() => { lanes.resize(); drawIdle(); }); $('btn-go').focus(); } else nav('play');
  setKeys(playKeys());
  loadSounds();
}

function introText() {
  const P = S.play;
  if (P.mode === 'route') {
    const st = P.step;
    const v = st.voice ? ` <b>${st.voice === 'sing' ? 'I canta!' : 'I compta en veu alta!'}</b>` : '';
    return `${esc(st.text)}${v}`;
  }
  if (P.mode === 'tempo') return 'Escoltes tres compassos, entres, i després la banda començarà a callar. <b>Continua tocant</b> quan calli!';
  if (P.mode === 'style' && P.style) return esc(P.style.text);
  if (P.mode === 'mission' && P.level) return esc(P.level.intro);
  return 'Escolta la carta i entra quan sonin les quatre baquetes.';
}
function playKeys() {
  const P = S.play;
  const list = [['Enter', 'comença / para'], ['↑↓', 'tempo']];
  if (P?.mode === 'route' && P.step.plan.choose) list.push(['←→', 'carta'], ['B', 'break']);
  else if (P?.mode === 'route') list.push(['←→', 'pas']);
  list.push([P?.form ? '1 2 3 4' : '1 2 3', 'vista'], ['O', 'opcions'], ['?', 'ajuda'], ['Esc', 'enrere']);
  if (!S.hasMidi) list.unshift(['Espai F J', 'bombo · caixa · charles']);
  return list;
}

/** El paper de cada carta dins del pas (el text de sota la carta). */
function routeCaption(c) {
  const P = S.play;
  const plan = P.step.plan;
  if (plan.first && c.id === plan.first.card) return plan.first.every === 'part' ? 'Primer compàs de cada part' : 'Primer compàs de cada roda';
  if (plan.fill && c.id === plan.fill.card) return plan.fill.every === 'part' ? 'Break: últim compàs de cada part' : `Break: cada ${plan.fill.every} compassos`;
  if (plan.choose && c.id === P.choice.brk) return 'Break: últim compàs de cada part';
  if (plan.vary && c.id === plan.vary.card) return `Variació: cada ${plan.vary.every} compassos`;
  if (plan.stop && c.id === plan.stop.card) return 'Marca amb la banda: final de part';
  if (plan.parts) { const k = plan.parts.indexOf(c.id); if (k >= 0) return k === 0 ? 'Estrofa i altres parts' : 'Tornada'; }
  return 'Ritme';
}

function buildCards() {
  const root = $('cards');
  root.innerHTML = '';
  const P = S.play;
  const list = [...P.cards];
  cardViews = list.map((c, i) => {
    const el = document.createElement('div');
    el.className = 'card-slot';
    root.appendChild(el);
    const view = createCardView(el);
    let caption = '';
    if (P.mode === 'route') caption = routeCaption(c);
    else if (list.length > 1) caption = i === 0 ? 'Compassos 1, 2 i 3: ritme' : 'Compàs 4: break';
    view.show(c, { caption });
    return { id: c.id, view, el };
  });
  if (P.hasSolo) {
    const el = document.createElement('div');
    el.className = 'card-slot';
    const sb = P.step.plan.solo;
    el.innerHTML = `<div class="cardview"><div class="solo-card"><b>SOLO</b><span>Toca el que vulguis</span></div><div class="card-caption">Solo: ${sb.every === 'part' ? `${sb.bars === 1 ? 'últim compàs' : `últims ${sb.bars} compassos`} de cada part` : `${sb.bars} de cada ${sb.every} compassos`}</div></div>`;
    root.appendChild(el);
    cardViews.push({ id: 'solo', view: { update() {}, markAt() {}, clearMarks() {}, summaryMarks() {} }, el });
  }
  const multi = cardViews.length > 1;
  root.classList.toggle('multi', multi);
  setBig(cardViews[0]?.id, null);
}
/** La carta gran (la que es toca o la que ve) i la petita que avisa de la següent. */
function setBig(bigId, nextId) {
  for (const v of cardViews) {
    v.el.classList.toggle('big', v.id === bigId);
    v.el.classList.toggle('next', !!nextId && v.id === nextId && v.id !== bigId);
  }
}

/** Què es toca en un pas: la roda o la cançó sencera. */
function formText(step, song) {
  const ss = stepSong(step, song);
  return ss.form ? `tota la cançó (${ss.bars.length} compassos)` : `la roda (${ss.bars.length} compassos)`;
}

/** Tipus de compàs dins d'un pas (per pintar la tira i el mapa de la cançó). */
function barKind(plan, b) {
  if (b.solo) return 's';
  if (b.stop) return 'm';
  if (b.card?.brk) return 'f';
  if (plan.vary && b.card?.id === plan.vary.card) return 'v';
  if ((plan.first && b.card?.id === plan.first.card) || (plan.parts && b.card?.id === plan.parts[1])) return 'c';
  return '';
}
/** Què fa la bateria en un compàs especial, en una paraula (els compassos de ritme no en porten). */
function barWord(plan, b) {
  const k = barKind(plan, b);
  if (k === 's') return 'solo';
  if (k === 'm') return 'marca';
  if (k === 'f') return 'break';
  if (k === 'v') return 'variació';
  if (k === 'c') return plan.parts ? 'tornada' : 'crash';
  return '';
}
/** El mapa de la cançó en aquest pas: una fila per part, una casella per compàs amb l'acord.
 *  Els compassos on la bateria fa una cosa diferent del ritme porten la paraula (crash, break, solo…). */
function songMap(step, song, choice) {
  const bars = stepBars(step, song, choice);
  const rows = [];
  bars.forEach((b, j) => { if (b.partStart || !rows.length) rows.push({ part: b.part, bars: [] }); rows[rows.length - 1].bars.push({ ...b, j }); });
  // Llegenda: cada tipus de compàs amb la carta que s'hi toca
  const legend = new Map();
  for (const b of bars) {
    const w = barWord(step.plan, b);
    if (!legend.has(w)) legend.set(w, { k: barKind(step.plan, b), card: b.solo ? null : b.card });
  }
  const what = (w, card) => `${w ? `<b>${esc(w)}</b>: ` : '<b>ritme</b>: '}${card ? esc(cardLabel(card)) : 'toques el que vulguis'}`;
  return `<div class="smap">${rows.map((r) => `<div class="smap-row"><b>${esc(partLabel(r.part) || '—')}</b><div class="smap-bars">${r.bars.map((b) => { const w = barWord(step.plan, b); return `<span class="k-${barKind(step.plan, b) || 'g'}" title="Compàs ${b.j + 1} · ${esc(b.solo ? 'Solo' : cardLabel(b.card))}">${esc(b.chord?.name ?? '')}${w ? `<i>${esc(w)}</i>` : ''}</span>`; }).join('')}</div></div>`).join('')}</div>
    <div class="smap-legend">${[...legend].map(([w, { k, card }]) => `<em><span class="k-${k || 'g'}"></span>${what(w, card)}</em>`).join('')}</div>`;
}

/** La tira de compassos de la cançó (a dalt de la partitura). */
function buildStrip() {
  const P = S.play;
  const strip = $('bar-strip');
  if (P.mode !== 'route') { strip.innerHTML = ''; return; }
  const plan = P.step.plan;
  strip.innerHTML = P.bars.map((b, j) => {
    const k = barKind(plan, b);
    return `<i class="${k}${b.partStart && j ? ' ps' : ''}" title="${esc(partLabel(b.part))} · compàs ${j + 1} · ${barWord(plan, b) || 'ritme'}"></i>`;
  }).join('');
}
/** El guió: l'estructura de la cançó, part per part, com a la biblioteca (acords i què fa la bateria). */
function buildGuio() {
  const P = S.play;
  const box = $('guio-wrap');
  const on = P.mode === 'route' && P.form;
  $('vt-guio').hidden = !on;
  if (!on) { box.innerHTML = ''; return; }
  const plan = P.step.plan;
  const rows = [];
  P.bars.forEach((b, j) => { if (b.partStart || !rows.length) rows.push({ part: b.part, bars: [] }); rows[rows.length - 1].bars.push({ ...b, j }); });
  // Cada part en frases de 4 compassos (una fila per frase), com un guió de cançó
  const cell = (b) => { const w = barWord(plan, b); return `<span class="k-${barKind(plan, b) || 'g'}" data-j="${b.j}">${esc(b.chord?.name ?? '')}${w ? `<i>${esc(w)}</i>` : ''}</span>`; };
  const phrases = (bars) => { const out = []; for (let i = 0; i < bars.length; i += 4) out.push(bars.slice(i, i + 4)); return out; };
  box.innerHTML = rows.map((r, ri) => `<div class="guio-part" data-row="${ri}"><b>${esc(partLabel(r.part) || '—')}<small>${r.bars.length} c.</small></b><div class="guio-rows">${phrases(r.bars).map((ph) => `<div class="guio-bars">${ph.map(cell).join('')}</div>`).join('')}</div></div>`).join('');
}
function stripAt(j) {
  for (const el of $('guio-wrap').querySelectorAll('[data-j]')) {
    const k = Number(el.dataset.j);
    el.classList.toggle('now', k === j);
    el.classList.toggle('past', j != null && k < j);
    if (k === j) el.scrollIntoView({ block: 'nearest' });
  }
  const items = $('bar-strip').children;
  for (let i = 0; i < items.length; i++) {
    items[i].classList.toggle('now', i === j);
    items[i].classList.toggle('past', j != null && i < j);
  }
}

/** Nivell 8 («tria tu»): quina carta i quin break. */
const CHOOSE_GROOVES = () => [...ALL_MISSIONS.filter((id) => !cardById(id).brk), ...STYLE_IDS()];
const CHOOSE_BREAKS = [null, 'break1', 'break2', 'break3', 'break4', 'break5', 'break6', 'break7'];
function syncChoose() {
  const P = S.play;
  const box = $('choose-bar');
  const on = P.mode === 'route' && !!P.step.plan.choose;
  box.hidden = !on;
  if (!on) return;
  const g = cardById(P.choice.groove);
  const b = P.choice.brk ? cardById(P.choice.brk) : null;
  box.innerHTML = `<span><kbd>←</kbd><kbd>→</kbd> Carta: <b>${esc(cardLabel(g))}${g?.title && !g.style ? ' · ' + esc(g.title) : ''}</b></span><span><kbd>B</kbd> Break: <b>${b ? esc(cardLabel(b)) : 'cap'}</b></span>`;
}
function changeChoice({ groove = 0, brk = 0 }) {
  const P = S.play;
  const list = CHOOSE_GROOVES();
  const choice = { ...P.choice };
  if (groove) { const i = Math.max(0, list.indexOf(choice.groove)); choice.groove = list[(i + groove + list.length) % list.length]; }
  if (brk) { const i = CHOOSE_BREAKS.indexOf(choice.brk ?? null); choice.brk = CHOOSE_BREAKS[(i + 1) % CHOOSE_BREAKS.length]; }
  const tempo = P.tempo;
  openStep(P.step.id, { choice });
  S.play.tempo = tempo;
  $('tempo-val').textContent = tempo;
}

let soundsPromise = null;
function loadSounds() {
  audioContext();
  soundsPromise ??= Promise.all([loadSet('bateria'), ...BAND_SETS.map(loadSet)]);
  let done = false;
  soundsPromise.then(() => { done = true; $('load-msg').textContent = ''; if (!S.session) setGoButton('idle'); });
  if (!done) { $('load-msg').textContent = ''; if (!S.session) setGoButton('loading'); }
  return soundsPromise;
}

$('play-back').addEventListener('click', () => back());
$('tempo-down').addEventListener('click', () => setTempo(S.play.tempo - 5));
$('tempo-up').addEventListener('click', () => setTempo(S.play.tempo + 5));
function setTempo(t) {
  S.play.tempo = Math.max(40, Math.min(200, t));
  $('tempo-val').textContent = S.play.tempo;
}
$('band-sel').addEventListener('change', (e) => {
  S.play.band = e.target.value;
  const p = player();
  if (p && (S.play.mode === 'mission' || S.play.mode === 'free')) { p.bands[S.play.cardId] = S.play.band; store.save(); }
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
      const p = player();
      if (p) { p.viewType = vt; store.save(); }
    }
    saveSupports();
    applyView();
  });
}
$('note-colors').addEventListener('change', (e) => { notation.colors = e.target.checked; if (!S.session) drawIdle(); });
function saveSupports() {
  const p = player();
  if (!p) return;
  if (S.play.mode === 'route') { p.routeSupports = S.play.supports; store.save(); }
  if (S.play.level && S.play.mode === 'mission') { p.supports[S.play.level.id] = S.play.supports; store.save(); }
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
$('btn-full').addEventListener('click', () => {
  if (document.fullscreenElement) document.exitFullscreen?.();
  else document.documentElement.requestFullscreen?.().catch(() => {});
});
document.addEventListener('fullscreenchange', () => setTimeout(() => { lanes.resize(); if (!S.session) drawIdle(); }, 80));

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
  b.classList.toggle('loading', state === 'loading');
  b.textContent = state === 'running' ? (S.play?.mode === 'free' ? '■ Prou, ja he acabat' : '■ Para') : state === 'ending' ? 'Acabant…' : state === 'loading' ? 'Carregant els sons…' : '▶ Escolta i toca';
  for (const el of document.querySelectorAll('#play-controls select, #play-controls input, #play-controls .step')) el.disabled = state !== 'idle';
}

async function startSession(opts = {}) {
  const P = S.play;
  await resumeAudio();
  toggleOpts(false);
  if (audioContext().state !== 'running') toast('El navegador no deixa sonar el joc: clica a qualsevol lloc de la pàgina i torna-ho a provar.');
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
  let demoBar;
  let phrase;
  if (P.mode === 'route') {
    const bars = P.bars;
    playBar = (j) => {
      const b = bars[j % bars.length];
      const k = j % bars.length;
      const pickup = P.form && b.partEnd && k < bars.length - 1;
      return { card: b.card, chord: b.chord, part: b.partStart ? partLabel(b.part) : '', solo: b.solo, stop: b.stop, songBar: P.midiEvents ? b.idx : null, role: P.roles[k] ?? null, pickup };
    };
    // A la demostració, els compassos de solo els toca el joc amb el ritme
    demoBar = (j) => { const b = playBar(j); return b.card ? b : { ...b, card: P.groove, solo: false }; };
    chords = bars.map((b) => b.chord);
    phrase = P.bars.findIndex((b, i) => i > 0 && b.partStart);
    if (phrase < 0) phrase = bars.length;
  } else {
    chords = bandChords(P.band, Math.max(0, ALL_MISSIONS.indexOf(P.cardId)));
    const [first, second] = P.cards;
    playBar = (j) => ({ card: second && j % 4 === 3 ? second : first, chord: chords[j % chords.length] });
    if (P.mode === 'tempo') {
      S.trainer = createTrainer();
      playBar = (j) => ({ card: first, chord: chords[j % chords.length], quiet: S.trainer.quietAt(j) });
    }
    phrase = chords.length;
  }
  // La frase: escoltes els compassos 1-2-3 i el 4t és l'entrada (baquetes, o el break si n'hi toca).
  // Així, quan entres, la progressió torna a començar i no es perd l'ordre dels acords.
  const L = phrase === 3 ? 3 : 4;
  // La cançó sencera: sense demostració, un compàs d'entrada de baquetes (la banda calla) i comença des del primer compàs
  const whole = P.mode === 'route' && P.step.id === 'canco';
  const countBar = whole ? { card: null, chord: null } : (demoBar ?? playBar)(L - 1);
  const cfg = {
    tempo: P.tempo,
    band: P.band,
    demoBars: opts.quick || whole ? 0 : L - 1,
    playBars: P.playBars,
    playBar,
    demoBar,
    countBar,
    midiBar: P.mode === 'route' && P.midiEvents ? (bar, o) => midiBarEvents(P.midiEvents, bar, o) : null,
    endChord: chords[0],
    metronome: P.metronome,
    quiet: P.quiet && P.mode !== 'route',
  };
  S.session = createSession(cfg, {
    onMiss: (e) => {
      S.judged = (S.judged ?? 0) + 1;
      if (!S.hiding) viewFor(e.card)?.markAt(e.piece, e.step, 'missed');
    },
    onFinish: (sum) => finish(sum),
  });
  S.judged = 0;
  S.wasUnlocked = new Set(P.cards.map((c) => c.id).filter(unlocked));
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
  S.inSolo = false;
  document.querySelector('.stage')?.classList.remove('hiding', 'solo');
  if (S.session) S.session.stop();
  S.session = null;
  cancelAnimationFrame(S.raf);
  stopAll();
  setGoButton('idle');
  if (S.play?.mode === 'route') stripAt(null);
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
  const solo = info?.kind === 'play' && !!info.solo;
  if (solo !== S.inSolo) { S.inSolo = solo; document.querySelector('.stage').classList.toggle('solo', solo); }
  if (P.mode === 'tempo' && S.trainer) S.trainer.check(s, pos);
  const vt = P.supports === 0 ? 'none' : P.viewType;
  if (hiding) { /* res */ } else if (vt === 'lanes') lanes.draw(s, pos, { big });
  else if (vt === 'score') notation.update(s, pos, { hitsVersion: s.judge.hits.length, statusVersion: S.judged });

  // Cartes: pilota a la carta activa; la gran és la que es toca (o, a l'últim temps, la que ve)
  const activeId = info?.solo ? 'solo' : info?.card?.id;
  for (const v of cardViews) {
    const active = !hiding && v.id === activeId && (info?.kind === 'demo' || info?.kind === 'play' || info?.kind === 'count');
    v.view.update(pos.beat, active);
  }
  if (cardViews.length > 1) {
    const nx = pos.bar >= 0 ? s.generate(pos.bar + 1) : null;
    const nextId = nx && (nx.kind === 'play' || nx.kind === 'demo' || (nx.kind === 'count' && nx.entryBreak)) ? (nx.solo ? 'solo' : nx.card?.id) : null;
    const bigId = (pos.beat >= 3 && nextId) ? nextId : (activeId ?? cardViews[0].id);
    setBig(bigId, nextId !== activeId ? nextId : null);
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
    if (P.mode === 'route') stripAt(info.kind === 'play' ? info.j % P.bars.length : null);
    if (info.kind === 'demo') setCoach(`<b>Escolta.</b> El joc toca ${info.card?.brk ? 'el break' : 'la carta'} amb la banda: mira com la pilota salta per la carta.`, 'demo');
    else if (info.kind === 'count') setCoach(info.entryBreak ? '<b>Prepara’t.</b> El break t’avisa: al compàs següent entres tu!' : '<b>Prepara’t.</b> Quatre baquetes i entres tu!', 'count');
    else if (info.kind === 'play' && P.mode === 'tempo') {
      setCoach(info.quiet ? '<b>🤫 La banda calla.</b> Continua tocant la carta, sense parar.' : S.trainer?.message ?? '<b>Ara tu!</b> Toca amb la banda.', info.quiet ? 'count' : 'play');
    } else if (info.kind === 'play') {
      const total = Number.isFinite(P.playBars) ? ` · compàs ${info.j + 1} de ${P.playBars}` : ` · compàs ${info.j + 1}`;
      const part = info.part ? ` <b>${esc(info.part)}</b> ·` : '';
      if (info.solo) setCoach(`<b>SOLO!</b>${total}. Toca el que vulguis i torna a entrar a temps.`, 'solo');
      else {
        let extra = info.quiet ? ' La banda calla: mantén el temps tu.' : info.stop ? ' Marca amb la banda!' : info.card?.brk ? ' Ara el break!' : '';
        const nb = P.mode === 'route' && P.form ? P.bars[(info.j + 1) % P.bars.length] : null;
        if (nb?.partStart && info.j + 1 < P.bars.length) extra += ` <b>→ Ve: ${esc(partLabel(nb.part) || 'part nova')}</b>`;
        setCoach(`<b>Ara tu!</b>${part}${total}.${extra}${P.step?.voice ? (P.step.voice === 'sing' ? ' 🎤 Canta!' : ' 🎤 Compta!') : ''}`, 'play');
      }
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
  const idleCards = P.mode === 'route' ? [P.groove, P.cards.find((c) => c.id !== P.groove.id)].filter(Boolean) : P.cards;
  for (let i = 0; i < 3; i++) {
    const c = idleCards.length > 1 && i === 2 ? idleCards[1] : idleCards[0];
    fake.bars[i] = { kind: 'play', card: c, notes: barNotes(c).map((n) => ({ ...n, kind: 'demo', time: i * fake.barDur + n.beat * fake.spb })) };
  }
  lanes.draw(fake, { heard: -fake.spb * 0.5, bar: 0, beat: 0 }, {});
  notation.still(idleCards);
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
const starsOfScore = (score) => (score >= 0.9 ? 3 : score >= 0.75 ? 2 : score >= 0.55 ? 1 : 0); // com judge.js

// ---- Resultat ---------------------------------------------------------------------------------------------------------
function finish(sum) {
  const P = S.play;
  setGoButton('idle');
  cancelAnimationFrame(S.raf);
  document.querySelector('.stage').classList.remove('solo', 'hiding');
  S.inSolo = false;
  setTimeout(() => { if (S.session?.finished) { stopAll(); } }, 3500);
  for (const v of cardViews) v.view.summaryMarks(S.session.judge.expected);
  if (P.mode === 'route') stripAt(null);

  const p = player();
  let rec = null;
  if (P.mode === 'mission' && sum.total) rec = store.recordAttempt(P.cardId, { stars: sum.stars, score: sum.score, tempo: P.tempo });
  const T = P.mode === 'tempo' ? S.trainer : null;
  // Full de ruta: el pas i, carta per carta, els patrons (perquè es continuïn desbloquejant)
  let wasDone = false;
  if (P.mode === 'route' && p && sum.total) {
    p.route ??= {};
    wasDone = stepDone(P.step.id);
    const r = (p.route[P.step.id] ??= { stars: 0, score: 0, tempo: 0, attempts: 0, lastTempo: 0 });
    r.attempts++;
    r.lastTempo = P.tempo;
    if (sum.stars > r.stars || (sum.stars === r.stars && P.tempo > r.tempo)) { r.stars = sum.stars; r.tempo = P.tempo; }
    r.score = Math.max(r.score, sum.score);
    r.song = P.raw.titol;
    if (P.step.plan.choose) r.choice = P.choice;
    rec = r;
    const per = new Map();
    for (const e of S.session.judge.expected) {
      if (e.status === 'pending' || e.status === 'skip') continue;
      const a = per.get(e.card) ?? { ok: 0, n: 0 };
      a.n++;
      if (e.status === 'perfect' || e.status === 'good') a.ok++;
      else if (e.status === 'near') a.ok += 0.5;
      per.set(e.card, a);
    }
    for (const [id, a] of per) {
      if (a.n < 8) continue;
      const score = a.ok / a.n;
      if (ALL_MISSIONS.includes(id)) store.recordAttempt(id, { stars: starsOfScore(score), score, tempo: P.tempo });
      else if (styleOf(id)) {
        const m = (p.styleCards[id] ??= { stars: 0, tempo: 0, lastTempo: 0 });
        m.lastTempo = P.tempo;
        const stc = starsOfScore(score);
        if (stc > m.stars || (stc === m.stars && P.tempo > m.tempo)) { m.stars = stc; m.tempo = P.tempo; }
      }
    }
    store.save();
  }
  if (sum.total && p) {
    const byCls = Object.fromEntries(Object.entries(sum.byCls).map(([k, v]) => [k, [Math.round(v.ok * 10) / 10, v.total]]));
    store.addHistory({
      mode: P.mode, card: P.cardId, step: P.step?.id ?? null, song: P.raw?.titol ?? null, style: P.style?.id ?? styleOf(P.cardId)?.id ?? null, tempo: P.tempo,
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
  const newly = P.cards.map((c) => c.id).filter((id) => !S.wasUnlocked?.has(id) && unlocked(id));
  const ub = $('res-unlock');
  ub.hidden = !newly.length;
  if (newly.length) {
    const c = cardById(newly[0]);
    const all = ALL_PATTERNS();
    ub.innerHTML = `<div class="unlock-card">${thumb(c)}</div><div><b>🔓 Patró desbloquejat!</b><span>${esc(cardLabel(c))}${c.title && !c.style ? ' · ' + esc(c.title) : ''}${newly.length > 1 ? ` (i ${newly.length - 1} més)` : ''}</span><small>Ja en tens ${all.filter(unlocked).length} de ${all.length}. Els veuràs al teu perfil.</small></div>`;
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
    return `<div class="res-piece"><span class="dot" style="background:${LANE_COLOR[lane]}"></span><span class="nm">${esc(cls === 'oh' ? 'Charles obert' : LANE_LABEL[lane])}</span><span class="bar"><i style="width:${Math.round(r * 100)}%;background:${r >= 0.75 ? 'var(--ok)' : r >= 0.4 ? 'var(--mig)' : 'var(--ko)'}"></i></span><b>${Math.round(r * 100)} %</b></div>`;
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
  // Adaptació: ajudes
  // Cap cop: segurament la bateria no envia notes (o no s'han fet servir les tecles)
  if (sum.total >= 8 && !S.session.judge.hits.length) tips.unshift(S.hasMidi ? 'No ha arribat cap cop de la bateria. Revisa el cable USB i, a la configuració, toca un pad per veure si s\'encén.' : 'No ha arribat cap cop. Sense bateria, toca amb el teclat: Espai bombo, F caixa, J charles.');
  const poor = sum.stars === 0 || sum.cleanBars < sum.bars / 2;
  const actions = [];
  if ((P.mode === 'mission' && P.level) || P.mode === 'route') {
    const key = P.mode === 'route' ? P.step.id : P.cardId;
    const streak = (p.poorStreak[key] = poor ? (p.poorStreak[key] ?? 0) + 1 : 0);
    const minSup = P.mode === 'route' ? 0 : P.level.supports;
    if (poor && streak >= 2 && P.supports < 2) {
      P.supports++;
      saveSupports();
      applyView();
      tips.unshift(P.supports === 1 ? 'He tornat a posar la partitura al costat de la carta.' : 'He posat més ajudes: ara la bateria dibuixada t’avisa de cada cop.');
    } else if (sum.stars === 3 && P.supports > 0 && P.supports >= minSup && P.mode === 'mission') {
      P.supports--;
      saveSupports();
      applyView();
      tips.push(P.supports === 0 ? 'Molt bé! La propera vegada, prova-ho llegint només la carta.' : 'Molt bé! Traiem una ajuda: els pads ja no s’encenen abans.');
    }
    store.save();
  }

  const again = (label, fn, primary = false) => actions.push({ label, fn, primary });
  const retry = (quick = true) => { $('result').hidden = true; startSession({ quick }); };
  const voiceBox = $('res-voice');
  voiceBox.hidden = true;
  if (P.mode === 'route' && P.step.id === 'canco') {
    again('Torna-hi', () => retry(), true);
    if (P.tempo < P.songTempo) again(`Més ràpid (${Math.min(P.songTempo, P.tempo + 8)})`, () => { setTempo(Math.min(P.songTempo, P.tempo + 8)); retry(); });
  } else if (P.mode === 'route') {
    const st = P.step;
    const i = ALL_STEPS.findIndex((x) => x.id === st.id);
    const next = ALL_STEPS[i + 1];
    const goNext = () => (next ? openStep(next.id) : nav('map'));
    const needVoice = st.voice && sum.stars >= 2 && !rec?.voiceOk;
    if (needVoice) {
      voiceBox.hidden = false;
      voiceBox.innerHTML = `<p>🎤 ${st.voice === 'sing' ? 'Has pogut cantar mentre tocaves?' : 'Has pogut comptar en veu alta mentre tocaves?'}</p><span class="muted small">Sigues sincer/a: el pas es dona per fet quan ho has pogut fer alhora.</span>`;
      again(`Sí, ho he fet! ${next ? 'Següent pas →' : 'Full de ruta'}`, () => { rec.voiceOk = true; store.save(); goNext(); }, true);
      again('Encara no: torna-hi', () => retry());
    } else if (sum.stars >= 2) {
      if (P.tempo < P.songTempo) tips.push(`Per acostar-te al tempo de la cançó (${P.songTempo}), tanca el resultat (Esc) i puja el tempo amb ↑.`);
      again(next ? `Següent pas: ${stepCode(next)} →` : 'Full de ruta →', goNext, true);
      again('Torna-hi', () => retry());
      if (P.tempo < P.songTempo) again(`Més ràpid (${Math.min(P.songTempo, P.tempo + 8)})`, () => { setTempo(Math.min(P.songTempo, P.tempo + 8)); retry(); });
    } else if (poor) {
      again('♪ T’ho ensenyo i tornem-hi', () => { setTempo(P.tempo - 8); retry(false); }, true);
      again('Torna-hi', () => retry());
    } else {
      again('Torna-hi', () => retry(), true);
      if (P.tempo > 60) again(`Més lent (${P.tempo - 8})`, () => { setTempo(P.tempo - 8); retry(); });
    }
    if (!wasDone && stepDone(st.id)) tips.unshift(`Pas ${stepCode(st)} fet! ${levelDone(st.level) === st.level.passos.length ? `Has acabat el nivell ${st.level.n}! 🎉` : ''}`);
    again('Nivell', () => nav('level', { n: st.level.n, step: st.id }));
  } else if (P.mode === 'mission') {
    if (poor) {
      again('♪ T’ho ensenyo i tornem-hi', () => { setTempo(P.tempo - 8); retry(false); }, true);
      again('Torna-hi', () => retry());
    } else {
      again('Torna-hi', () => retry(), sum.stars < 3);
      if (sum.stars >= 2) again(`Més ràpid (${P.tempo + 8})`, () => { setTempo(P.tempo + 8); retry(); }, sum.stars === 3);
    }
    if (rec && rec.stars === sum.stars && sum.stars > 0 && rec.tempo === P.tempo && rec.attempts > 1) tips.push('És el teu millor resultat amb aquesta carta!');
  } else if (P.mode === 'tempo') {
    again('Torna-hi', () => retry(), true);
    again(`Més ràpid (${P.tempo + 8})`, () => { setTempo(P.tempo + 8); retry(); });
    again(`Més lent (${P.tempo - 8})`, () => { setTempo(P.tempo - 8); retry(); });
    again('Canvia de carta', () => back());
  } else if (P.mode === 'style') {
    const list = [...(P.style?.cards ?? []).map((c) => c.id), ...(P.style?.also ?? [])];
    const k = list.indexOf(P.cardId);
    if (!poor && k >= 0 && k < list.length - 1) again('Següent carta de l’estil →', () => openStyleCardFor(list[k + 1], P.style), true);
    again('Torna-hi', () => retry(), poor || k === list.length - 1);
    if (!poor && P.tempo < P.styleTempo) again(`Més ràpid (${Math.min(P.styleTempo, P.tempo + 8)})`, () => { setTempo(Math.min(P.styleTempo, P.tempo + 8)); retry(); });
    if (poor) again('♪ T’ho ensenyo i tornem-hi', () => { setTempo(P.tempo - 8); retry(false); });
  } else {
    again('Torna-hi', () => retry(), true);
  }
  if (deviceLag) actions.push({ lag: true, label: `Compensa el retard (${Math.abs(deviceLag)} ms)`, fn: () => {
    store.settings().latency = Math.max(-60, Math.min(300, Math.round((store.settings().latency + deviceLag) / 5) * 5));
    store.save();
    setExtraLatency(store.settings().latency);
    toast(`Fet: ara el joc compensa ${store.settings().latency} ms. Es pot canviar a la configuració.`);
    $('result').hidden = true;
  } });
  // Com a molt tres botons: el principal, un altre (o compensar el retard) i «Mira la carta»
  const main = actions.filter((a) => !a.lag);
  const lag = actions.find((a) => a.lag);
  actions.splice(0, actions.length, ...[main[0], lag ?? main[1]].filter(Boolean));
  again('Mira la carta', () => { $('result').hidden = true; $('btn-go').focus(); setKeys(playKeys()); });
  $('res-tips').innerHTML = tips.slice(0, 4).map((t) => `<li>${esc(t)}</li>`).join('');
  const box = $('res-actions');
  box.innerHTML = '';
  for (const a of actions) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `btn${a.primary ? ' btn-primary' : ''}`;
    b.textContent = a.label;
    b.addEventListener('click', a.fn);
    box.appendChild(b);
  }
  $('result').hidden = false;
  setKeys([['Enter', 'botó vermell'], ['←→', 'tria'], ['Esc', 'mira la carta']]);
  if (P.mode === 'route') setKeys([['Enter', 'botó vermell'], ['←→', 'tria'], ['Esc', 'mira la carta'], ['Esc Esc', 'tornar al nivell']]);
  (box.querySelector('.btn-primary') ?? box.querySelector('button'))?.focus();
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
const pieceRow = (cls, r) => `<div class="res-piece"><span class="dot" style="background:${LANE_COLOR[PIECES[cls]?.lane ?? cls] ?? '#999'}"></span><span class="nm">${esc(cls === 'oh' ? 'Charles obert' : LANE_LABEL[PIECES[cls]?.lane ?? cls] ?? cls)}</span><span class="bar"><i style="width:${Math.round(r * 100)}%;background:${r >= 0.75 ? 'var(--ok)' : r >= 0.4 ? 'var(--mig)' : 'var(--ko)'}"></i></span><b>${Math.round(r * 100)} %</b></div>`;

SCREENS.profile = (root, params) => {
  const name = store.currentName();
  const p = player();
  const tab = params.tab ?? 'resum';
  const H = (p?.history ?? []).filter((h) => h.total > 0);
  const tabs = [['resum', 'Resum'], ['coll', 'Col·lecció'], ['hist', 'Historial']];
  root.innerHTML = `${head(`El perfil de ${name ?? ''}`, `${stepsDone()} de ${ALL_STEPS.length} passos del full de ruta · ${ALL_PATTERNS().filter(unlocked).length} patrons desbloquejats`, `<div class="tabs" role="tablist">${tabs.map(([id, t], i) => `<button type="button" class="tab" role="tab" aria-selected="${id === tab}" data-act="tab" data-tab="${id}" data-key="tab:${id}"><kbd>${i + 1}</kbd> ${t}</button>`).join('')}</div>`)}
    <div class="scr-body" id="prof-body" style="grid-template-rows:minmax(0,1fr)"></div>`;
  bind(root, { tab: (el) => nav('profile', { tab: el.dataset.tab, focusKey: `tab:${el.dataset.tab}` }, { push: false }) });
  S.screenKeys = { 1: () => nav('profile', { tab: 'resum' }, { push: false }), 2: () => nav('profile', { tab: 'coll' }, { push: false }), 3: () => nav('profile', { tab: 'hist' }, { push: false }) };
  setKeys([['1 2 3', 'resum / col·lecció / historial'], ['↑↓←→', 'moure'], ['Enter', 'tria'], ['Esc', 'enrere']]);
  const body = $('prof-body');
  const MODE = { route: 'Full de ruta', mission: 'Carta', free: 'Amb la banda', song: 'Cançó', tempo: 'Tempo', style: 'Estil' };

  if (tab === 'coll') {
    const groups = [...LEVELS.map((L) => [L.name, L.missions, openMission]), ['Estils', STYLE_IDS(), openStyleCard]];
    body.innerHTML = `<div class="panel col scroll">${groups.map(([nm, ids], gi) => `<h3>${esc(nm)} (${ids.filter(unlocked).length}/${ids.length})</h3>${cardTiles(ids, `c${gi}`, { stars: starsFor })}`).join('')}</div>`;
    groups.forEach(([, , fn], gi) => body.querySelectorAll(`[data-act="c${gi}"]`).forEach((t) => t.addEventListener('click', () => fn(t.dataset.id))));
    body.querySelector('.tile')?.setAttribute('data-autofocus', '');
    return;
  }
  if (tab === 'hist') {
    body.innerHTML = `<div class="panel col scroll">${H.length ? `<table class="hist"><thead><tr><th>Quan</th><th>Què</th><th>Pas / carta</th><th>Cançó</th><th>Tempo</th><th>Precisió</th></tr></thead><tbody>${H.slice(-80).reverse().map((h) => `<tr><td>${new Date(h.t).toLocaleString('ca', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</td><td>${MODE[h.mode] ?? h.mode}</td><td>${h.step ? esc(`${stepCode(stepById(h.step))} · ${stepById(h.step)?.titol ?? ''}`) : esc(cardLabel(cardById(h.card)) || h.card)}</td><td>${esc(h.song ?? '')}</td><td>${h.tempo}</td><td>${Math.round(h.score * 100)} %${h.quietBest != null ? ` · ${h.quietBest} c. en silenci` : ''}</td></tr>`).join('')}</tbody></table>` : '<p class="muted">Encara no hi ha cap partida.</p>'}</div>`;
    return;
  }
  if (!H.length) {
    body.innerHTML = `<div class="panel col"><p class="lead">Encara no hi ha cap partida guardada. Cada cop que acabis un pas del full de ruta, una carta d'estil o l'entrenador de tempo, aquí veuràs com vas i què et convé practicar.</p><button type="button" class="btn btn-red" id="prof-start" data-autofocus style="align-self:flex-start">▶ Continua el full de ruta</button></div>`;
    $('prof-start').onclick = () => openStep(recommended());
    return;
  }
  const recent = H.slice(-30);
  const avg = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);
  const piece = {};
  for (const h of recent) for (const [cls, [ok, tot]] of Object.entries(h.byCls ?? {})) {
    const s = (piece[cls] ??= { ok: 0, tot: 0 });
    s.ok += ok; s.tot += tot;
  }
  const pieceRows = Object.entries(piece).filter(([, v]) => v.tot >= 4).map(([cls, v]) => ({ cls, r: v.ok / v.tot })).sort((a, b) => a.r - b.r);
  const means = recent.filter((h) => h.total >= 8).map((h) => h.mean);
  const sds = recent.filter((h) => h.total >= 8).map((h) => h.sd);
  const mean = avg(means);
  const sd = avg(sds);
  const feat = {};
  for (const h of H.slice(-60)) for (const f of features(cardById(h.card))) (feat[f] ??= []).push(h.score);
  const featRows = Object.entries(feat).map(([f, v]) => ({ f, r: avg(v.slice(-8)), n: v.length })).sort((a, b) => a.r - b.r);
  // Recomanacions
  const recs = [];
  const nextSt = stepById(recommended());
  recs.push({ text: `El següent pas del full de ruta: <b>${esc(stepCode(nextSt))} · ${esc(nextSt.titol)}</b> (nivell ${nextSt.level.n}).`, label: '▶ Continua', fn: () => openStep(nextSt.id) });
  const weakPiece = pieceRows.find((x) => x.r < 0.8);
  const bestFor = (pred) => ALL_MISSIONS.find((id) => pred(cardById(id)) && (store.mission(id)?.stars ?? 0) < 3) ?? ALL_MISSIONS.find((id) => pred(cardById(id)));
  if (weakPiece) {
    const cls = weakPiece.cls;
    const id = bestFor((c) => Object.keys(c.notes).some((k) => PIECES[k]?.cls === cls) && !c.brk);
    recs.push({ text: `<b>${esc(CLS_NAME[cls][0].toUpperCase() + CLS_NAME[cls].slice(1))}</b> és la peça que més falla (${Math.round(weakPiece.r * 100)} % bé). Practica a poc a poc una carta on surti molt.`, label: `Practica ${cardLabel(cardById(id))}`, fn: () => openMission(id) });
  }
  if (means.length >= 3 && Math.abs(mean) > 25) recs.push({ text: `De mitjana vas <b>${Math.round(Math.abs(mean))} ms ${mean < 0 ? 'avançat' : 'endarrerit'}</b>. Si tots els cops van igual de desplaçats pot ser el retard de l’equip; si no, practica amb el metrònom i escolta el baix.`, label: 'Prova de retard', fn: () => nav('setup') });
  if (sds.length >= 3 && sd > 30) recs.push({ text: `Els cops són poc regulars (varien uns ${Math.round(sd)} ms). L’Entrenador de tempo t’ajudarà a tenir un pols més estable.`, label: 'Entrenador de tempo', fn: () => nav('cards', { mode: 'tempo' }) });
  const weakFeat = featRows.find((x) => x.r < 0.75 && x.f !== 'estils');
  if (weakFeat) {
    const id = bestFor((c) => features(c).has(weakFeat.f));
    if (id) recs.push({ text: `Et costen més les cartes de <b>${esc(FEATURE_NAME[weakFeat.f].toLowerCase())}</b> (${Math.round(weakFeat.r * 100)} % de mitjana).`, label: `Practica ${cardLabel(cardById(id))}`, fn: () => openMission(id) });
  }
  const ghostH = recent.filter((h) => h.ghosts);
  if (ghostH.length && avg(ghostH.map((h) => h.loud / h.ghosts)) > 0.5) recs.push({ text: 'Les <b>notes fantasma</b> et surten massa fortes: han de ser gairebé un frec.', label: `Practica ${cardLabel(cardById('p25'))}`, fn: () => openMission('p25') });
  if (!p.tempoBest) recs.push({ text: 'Encara no has provat l’<b>Entrenador de tempo</b>: és la millor manera de saber si el pols el portes tu.', label: 'Prova-ho', fn: () => nav('cards', { mode: 'tempo' }) });

  const minutes = Math.round(H.reduce((a, h) => a + (h.bars || 8) * (240 / (h.tempo || 90)), 0) / 60);
  body.innerHTML = `<div class="prof-grid">
    <div class="kpis">
      <div class="kpi"><b>${stepsDone()}/${ALL_STEPS.length}</b><span>passos del full de ruta</span></div>
      <div class="kpi"><b>${minutes}</b><span>minuts tocant · ${H.length} partides</span></div>
      <div class="kpi"><b>${Math.round(avg(recent.map((h) => h.score)) * 100)} %</b><span>precisió (últimes ${recent.length})</span></div>
      <div class="kpi"><b>${p.tempoBest ? p.tempoBest.bars : '—'}</b><span>compassos en silenci (rècord)</span></div>
    </div>
    <div class="panel col scroll"><h2>Què et convé practicar</h2><ul class="practice" id="prof-recs"></ul></div>
    <div class="panel col scroll"><h2>Peça a peça</h2>${pieceRows.map(({ cls, r }) => pieceRow(cls, r)).join('') || '<p class="muted">Encara hi ha poques partides.</p>'}
      <h2 style="margin-top:12px">Control del temps</h2><div class="tc-bar big"><div class="tc-zone"></div><div class="tc-center"></div><div class="tc-dots">${means.map((m) => `<i class="tc-dot" style="left:${tcPos(m)}%"></i>`).join('')}</div><div class="tc-needle" style="left:${tcPos(mean)}%"></div></div><div class="tc-label"><span>Aviat</span><span>${means.length ? (Math.abs(mean) < 12 ? 'Al seu lloc' : `${mean < 0 ? 'Avançat' : 'Endarrerit'} ${Math.round(Math.abs(mean))} ms`) : ''}</span><span>Tard</span></div><p class="muted small">Cada punt és la mitjana d’una partida. Regularitat: els cops varien uns ${Math.round(sd)} ms.</p></div>
    <div class="panel col scroll"><h2>Evolució</h2>${sparkline(H.slice(-40).map((h) => h.score))}<p class="muted small">Precisió de les últimes ${Math.min(40, H.length)} partides.</p>
      <h2 style="margin-top:8px">Per tipus de carta</h2>${featRows.map(({ f, r }) => `<div class="res-piece"><span></span><span class="nm">${esc(FEATURE_NAME[f])}</span><span class="bar"><i style="width:${Math.round(r * 100)}%;background:${r >= 0.75 ? 'var(--ok)' : r >= 0.5 ? 'var(--mig)' : 'var(--ko)'}"></i></span><b>${Math.round(r * 100)} %</b></div>`).join('') || '<p class="muted">Encara hi ha poques partides.</p>'}</div>
  </div>`;
  const ul = $('prof-recs');
  recs.slice(0, 4).forEach((r, i) => {
    const li = document.createElement('li');
    li.innerHTML = `<p>${r.text}</p>`;
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `btn${i === 0 ? ' btn-red' : ''}`;
    b.textContent = r.label;
    b.dataset.key = `rec${i}`;
    if (i === 0) b.dataset.autofocus = '';
    b.addEventListener('click', r.fn);
    li.appendChild(b);
    ul.appendChild(li);
  });
};

function sparkline(vals) {
  if (vals.length < 2) return '<p class="muted">Cal més d’una partida.</p>';
  const w = 300;
  const h = 80;
  const pts = vals.map((v, i) => `${((i / (vals.length - 1)) * (w - 10) + 5).toFixed(1)},${(h - 8 - v * (h - 16)).toFixed(1)}`);
  const y75 = h - 8 - 0.75 * (h - 16);
  return `<svg class="spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><line x1="0" x2="${w}" y1="${y75}" y2="${y75}" stroke="#3a4b6c" stroke-dasharray="4 4"/><polyline points="${pts.join(' ')}" fill="none" stroke="#ef4444" stroke-width="2"/>${pts.map((pt) => `<circle cx="${pt.split(',')[0]}" cy="${pt.split(',')[1]}" r="2.5" fill="#fdbe10"/>`).join('')}</svg>`;
}

// ---- Opcions i ajuda de la pantalla de joc ----------------------------------------------------------------------------
function toggleOpts(on) {
  const pop = $('opts-pop');
  const show = on ?? pop.hidden;
  pop.hidden = !show;
  $('btn-opts').setAttribute('aria-expanded', String(show));
}
function toggleHelp(on) {
  $('help').hidden = !on;
  if (on) { toggleOpts(false); $('help-close').focus(); } else $('btn-go').focus();
}
$('btn-opts').addEventListener('click', () => toggleOpts());
$('btn-help').addEventListener('click', () => toggleHelp(true));
$('help-close').addEventListener('click', () => toggleHelp(false));
document.addEventListener('pointerdown', (e) => { if (!$('opts-pop').hidden && !e.target.closest('#opts-pop, #btn-opts')) toggleOpts(false); });

// ---- Dreceres de teclat (pantalla de joc) -------------------------------------------------------------------------------
// Enter: comença / para (i, al resultat, el botó principal) · Esc: tanca el resultat, para o torna enrere
// ↑ ↓: tempo · ← →: pas anterior / següent (al nivell 8, la carta) · 1 2 3: vistes · M metrònom · H pads · Q silenci · B break
window.addEventListener('keydown', (e) => {
  if (S.view !== 'play' || e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.target.closest?.('input[type="text"], textarea, select')) return;
  const P = S.play;
  const running = !!(S.session && !S.session.finished);
  const resultOpen = !$('result').hidden;
  const idle = !running;
  const k = e.key;
  let handled = true;
  // Ajuda oberta: Esc, Enter o ? la tanquen
  if (!$('help').hidden) {
    if (k === 'Escape' || k === 'Enter' || k === '?') { toggleHelp(false); e.preventDefault(); }
    return;
  }
  if (k === 'Escape' && !$('opts-pop').hidden) { toggleOpts(false); e.preventDefault(); return; }
  if (k === '?' && !running) { toggleHelp(true); e.preventDefault(); return; }
  if ((k === 'o' || k === 'O') && !running && !resultOpen) { toggleOpts(); e.preventDefault(); return; }
  if (k === 'Enter') {
    if (resultOpen) (document.activeElement?.closest('#res-actions') ? document.activeElement : $('res-actions').querySelector('.btn-primary') ?? $('res-actions').querySelector('button'))?.click();
    else $('btn-go').click();
  } else if (k === 'Escape') {
    if (resultOpen) { $('result').hidden = true; setKeys(playKeys()); $('btn-go').focus(); }
    else if (running) $('btn-go').click();
    else back();
  } else if (resultOpen && k.startsWith('Arrow')) {
    moveFocus(k, $('result'));
  } else if ((k === 'ArrowUp' || k === '+') && idle && !resultOpen) setTempo(P.tempo + 5);
  else if ((k === 'ArrowDown' || k === '-') && idle && !resultOpen) setTempo(P.tempo - 5);
  else if ((k === 'ArrowRight' || k === 'ArrowLeft') && idle && P.mode === 'route') {
    if (P.step.plan.choose) changeChoice({ groove: k === 'ArrowRight' ? 1 : -1 });
    else {
      const i = ALL_STEPS.findIndex((x) => x.id === P.step.id) + (k === 'ArrowRight' ? 1 : -1);
      if (i >= 0 && i < ALL_STEPS.length) openStep(ALL_STEPS[i].id);
    }
  } else if ((k === 'b' || k === 'B') && idle && P.mode === 'route' && P.step.plan.choose) changeChoice({ brk: 1 });
  else if ((k === 'ArrowRight' || k === 'ArrowLeft') && idle && P.mode === 'mission') {
    const i = ALL_MISSIONS.indexOf(P.cardId) + (k === 'ArrowRight' ? 1 : -1);
    if (i >= 0 && i < ALL_MISSIONS.length) openMission(ALL_MISSIONS[i]);
  } else if ((k === 'ArrowRight' || k === 'ArrowLeft') && idle && P.mode === 'style' && P.style) {
    const list = [...P.style.cards.map((c) => c.id), ...P.style.also];
    const i = list.indexOf(P.cardId) + (k === 'ArrowRight' ? 1 : -1);
    if (i >= 0 && i < list.length) openStyleCardFor(list[i], P.style);
  } else if (k === '1' || k === '2' || k === '3' || k === '4') {
    const b = document.querySelector(`.vt[data-vt="${{ 1: 'score', 2: 'lanes', 3: 'none', 4: 'guio' }[k]}"]`);
    if (b && !b.hidden) b.click();
  } else if ((k === 'm' || k === 'M') && idle) {
    $('metro').checked = !$('metro').checked;
    P.metronome = $('metro').checked;
    toast(P.metronome ? 'Metrònom encès' : 'Metrònom apagat');
  } else if ((k === 'h' || k === 'H') && idle && P.supports > 0) {
    $('hints').click();
    toast($('hints').checked ? 'Els pads s’encenen abans de cada cop' : 'Pads sense avís');
  } else if ((k === 'q' || k === 'Q') && idle && !$('quiet-wrap').hidden) {
    $('quiet').click();
    toast($('quiet').checked ? 'Compte en silenci: la banda calla 2 de cada 4 compassos' : 'Sense silencis');
  } else handled = false;
  if (handled) e.preventDefault();
});

// ---- Menús amb teclat: fletxes per moure's, Enter per entrar, Esc per tornar ----------------------------------------------
const FOCUSABLE = 'button:not([disabled]):not([tabindex="-1"]), a[href]:not([tabindex="-1"]), input:not([type="hidden"]):not([disabled]):not([tabindex="-1"]), select:not([disabled]):not([tabindex="-1"]), textarea:not([disabled])';
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
    // distància des de la vora (no des del centre), perquè les columnes de mida diferent funcionin
    const dx = key === 'ArrowRight' ? b.left - a.right : key === 'ArrowLeft' ? a.left - b.right : bx - ax;
    const dy = key === 'ArrowDown' ? b.top - a.bottom : key === 'ArrowUp' ? a.top - b.bottom : by - ay;
    let main;
    let side;
    if (key === 'ArrowRight' || key === 'ArrowLeft') { main = dx; side = Math.max(0, Math.max(b.top, a.top) - Math.min(b.bottom, a.bottom)); }
    else { main = dy; side = Math.max(0, Math.max(b.left, a.left) - Math.min(b.right, a.right)); }
    if (main < -4) continue;
    const score = main + side * 3;
    if (!best || score < best.score) best = { el, score };
  }
  if (best) {
    best.el.focus({ preventScroll: true });
    best.el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }
}
window.addEventListener('keydown', (e) => {
  if (e.defaultPrevented || S.view === 'play' || e.metaKey || e.ctrlKey || e.altKey) return;
  const t = e.target;
  const inText = t.closest?.('input[type="text"], input[type="number"], textarea, select');
  const k = e.key;
  if (k === 'Escape') {
    if (inText) { t.blur(); visibleIn($(STATIC.has(S.view) ? `v-${S.view}` : 'v-screen'))[0]?.focus(); e.preventDefault(); return; }
    if (S.view !== 'home' && S.view !== 'who') back();
    else if (S.view === 'who' && store.currentName()) nav('home');
    e.preventDefault();
    return;
  }
  if (k === 'Enter' && t.type === 'checkbox') { t.click(); e.preventDefault(); return; }
  if (t.type === 'range' && (k === 'ArrowLeft' || k === 'ArrowRight')) return;
  if (inText) {
    // dins d'un camp de text, les fletxes amunt/avall serveixen per sortir-ne (no en una àrea de text ni en un desplegable)
    if (t.tagName === 'TEXTAREA' || t.tagName === 'SELECT') return;
    if (k !== 'ArrowDown' && k !== 'ArrowUp') return;
  }
  const sk = S.screenKeys?.[k.toLowerCase()];
  if (sk && !inText) { sk(); e.preventDefault(); return; }
  if (k.startsWith('Arrow')) {
    moveFocus(k, $(STATIC.has(S.view) ? `v-${S.view}` : 'v-screen'));
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
nav(store.currentName() ? (currentSong() ? 'home' : 'song') : 'who', currentSong() ? {} : { first: true });
Object.assign(S, {
  tap: (piece, perf, vel) => input.tap(piece, perf, vel),
  heardTime, outputLevel, openMission, openFree, openTempo, openStyleCard, openStep, nav, back, setSong, go: nav,
});
window.__rockinReady = true;
