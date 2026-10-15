// Partitura convencional de bateria, per pàgines de dos compassos amb un
// pilota que bota de temps en temps, com a la carta.
//
// Pentagrama de percussió (clau neutra). Posicions habituals:
//   crash: línia addicional de dalt (x)   charles: sobre el pentagrama (x, «o» si és obert)
//   ride: 5a línia (x)   tom 1: 4t espai   tom 2: 4a línia   caixa: 3r espai
//   tom de terra: 2n espai   bombo: 1r espai   pedal del charles: sota el pentagrama (x)
// Totes les pliques amunt (una sola veu), que és com es llegeix als primers anys.
// Les notes fantasma van entre parèntesis.

import { PIECES, barNotes } from './cards.js';
import { metre } from './metre.js';

const POS = { crash: 10, hh: 9, oh: 9, ride: 8, t1: 7, t2: 6, sn: 5, ghost: 5, rim: 5, t3: 3, kk: 1, ghostkk: 1, pedal: -1 };
const XHEAD = new Set(['crash', 'hh', 'oh', 'ride', 'pedal', 'rim']);
const INK = '#221f20';
const STATUS = { perfect: '#1f9d55', good: '#1f9d55', near: '#f08c00', missed: '#d64545' };
const PIECE_INK = { rim: '#3f9a25', hh: '#c99700', oh: '#c99700', ride: '#d98200', crash: '#c43a52', sn: '#3f9a25', ghost: '#3f9a25', kk: '#1a8fd6', ghostkk: '#1a8fd6', t1: '#2f8f94', t2: '#6f6f6f', t3: '#8a6440', pedal: '#c99700' };

const W = 780;
const H = 178;
const LINE = 10; // distància entre línies
const BOTTOM = 120; // y de la 1a línia (a dalt queda lloc per a la pilota)
const yOf = (pos) => BOTTOM - (pos * LINE) / 2;
const LEFT = 58;
// Temps → posició: la MATEIXA escala per a tota la pàgina, també a través de la barra de compàs,
// perquè el cursor avanci sempre a la mateixa velocitat (si no, sembla que s'acceleri i fa avançar el cop).
const X0 = LEFT + 16; // on cau el primer temps
// Pulsos per compàs segons la mètrica (4/4: 4; 3/4: 3; 6/8: 2…)
const BPB = () => metre().bpb;
const BEAT_W_ = () => (W - 12 - X0) / (2 * BPB() - 0.125);
const barlineX = (k) => X0 + (BPB() * k - 0.125) * BEAT_W_(); // la barra, entre la darrera subdivisió i el temps 1
const barStartX = (slot) => (slot === 0 ? LEFT : barlineX(slot));

export function createNotation(root) {
  root.innerHTML = '';
  const holder = document.createElement('div');
  holder.className = 'notation';
  root.appendChild(holder);
  holder.style.position = 'relative';
  const ball = document.createElement('div');
  ball.className = 'notation-ball';
  const BALL_REST = 19; // on toca la pilota (y del viewBox)
  const BALL_UP = 15; // quant s'enlaira entre temps i temps
  let pageKey = null;
  let colors = true;

  /** x (en unitats del viewBox) d'un temps dins del compàs `slot` (0 o 1 de la pàgina). */
  const xAt = (slot, beat) => X0 + (slot * BPB() + beat) * BEAT_W_();

  function render(bars, { hits = [], labels = [] } = {}) {
    let s = `<svg viewBox="0 0 ${W} ${H}" class="notation-svg" role="img" aria-label="Partitura">`;
    // Pentagrama
    for (let i = 0; i < 5; i++) s += `<line x1="8" x2="${W - 8}" y1="${yOf(i * 2)}" y2="${yOf(i * 2)}" stroke="${INK}" stroke-width="1.2"/>`;
    // Clau de percussió i compàs
    s += `<rect x="16" y="${yOf(6)}" width="5" height="${LINE * 2}" fill="${INK}"/><rect x="25" y="${yOf(6)}" width="5" height="${LINE * 2}" fill="${INK}"/>`;
    s += `<text x="44" y="${yOf(5) - 1}" class="ts">${metre().num}</text><text x="44" y="${yOf(1) - 1}" class="ts">${metre().den}</text>`;
    // Barres de compàs
    for (let k = 0; k <= 2; k++) {
      const x = k === 0 ? LEFT : barlineX(k);
      if (k > 0) s += `<line x1="${x}" x2="${x}" y1="${yOf(8)}" y2="${yOf(0)}" stroke="${INK}" stroke-width="${k === 2 ? 2.5 : 1.4}"/>`;
    }
    bars.forEach((bar, slot) => {
      const label = labels[slot];
      if (label) s += `<text x="${barStartX(slot) + 6}" y="${H - 5}" class="bar-label">${label}</text>`;
      if (!bar?.card || !bar.notes?.length) {
        // compàs de compte o buit: silenci de rodona
        s += `<rect x="${xAt(slot, 1.8) - 10}" y="${yOf(6)}" width="20" height="5" fill="${INK}"/>`;
        return;
      }
      s += renderBar(bar, slot);
    });
    // Cops de l'alumnat: una X a la línia de la peça que has tocat, just al moment en què l'has tocat.
    // Si cau sobre la nota, has anat a temps; si queda a la dreta, tard; a l'esquerra, aviat.
    for (const h of hits) {
      // Un cop avançat al temps 1 es dibuixa just a l'esquerra de la nota (sense trepitjar el compàs 4/4 ni la barra)
      const x = xAt(h.slot, Math.max(h.beat, -0.18));
      const y = yOf(POS[h.piece] ?? 5);
      const c = h.kind === 'extra' || h.kind === 'wrong' ? '#d64545' : h.kind === 'perfect' ? '#1f9d55' : '#f08c00';
      s += `<g class="hit-x" opacity=".85"><path d="M${x - 6} ${y - 6} L${x + 6} ${y + 6} M${x + 6} ${y - 6} L${x - 6} ${y + 6}" stroke="#fff" stroke-width="6" stroke-linecap="round"/><path d="M${x - 6} ${y - 6} L${x + 6} ${y + 6} M${x + 6} ${y - 6} L${x - 6} ${y + 6}" stroke="${c}" stroke-width="3" stroke-linecap="round"/></g>`;
    }
    s += '</svg>';
    holder.innerHTML = s;
    holder.appendChild(ball);
  }

  function renderBar(bar, slot) {
    const grid = bar.card.grid;
    const per = grid / 4;
    // Notes per posició
    const at = new Map();
    for (const n of bar.notes) {
      const list = at.get(n.step) ?? [];
      list.push(n);
      at.set(n.step, list);
    }
    let s = '';
    for (let b = 0; b < BPB(); b++) {
      const onsets = [];
      for (let q = 0; q < per; q++) if (at.has(b * per + q)) onsets.push(q);
      if (!onsets.length) { s += quarterRest(xAt(slot, b + 0.35)); continue; }
      const items = []; // { q, dur, notes } en unitats de la graella
      if (grid === 12) {
        for (let q = 0; q < 3; q++) items.push({ q, dur: 1, notes: at.get(b * 3 + q) ?? null });
      } else {
        if (onsets[0] > 0) {
          const lead = onsets[0];
          if (lead >= 2) items.push({ q: 0, dur: 2, notes: null });
          if (lead % 2 === 1) items.push({ q: lead - 1, dur: 1, notes: null });
        }
        onsets.forEach((q, i) => items.push({ q, dur: (onsets[i + 1] ?? 4) - q, notes: at.get(b * 4 + q) }));
      }
      const notes = items.filter((it) => it.notes);
      // Silencis dins del temps
      for (const it of items.filter((x) => !x.notes)) s += it.dur >= 2 ? eighthRest(xAt(slot, b + it.q / per)) : sixteenthRest(xAt(slot, b + it.q / per));
      // Caps i pliques
      const stems = notes.map((it) => {
        const x = xAt(slot, b + it.q / per);
        const ps = it.notes.map((n) => POS[n.piece] ?? 5);
        let top = Math.max(...ps);
        let low = Math.min(...ps);
        let heads = '';
        for (const n of it.notes) heads += head(n, x);
        const units = grid === 12 ? 2 : it.dur;
        return { x, top, low, heads, units, dotted: grid !== 12 && it.dur === 3, open: it.notes.some((n) => n.piece === 'oh') };
      });
      if (!stems.length) continue;
      const beamY = Math.min(...stems.map((st) => yOf(st.top))) - 30;
      // Charles obert: una «o» per sobre de la plica / el barrat
      const openMark = (st, yTop) => (st.open ? `<circle cx="${st.x + 5.8}" cy="${yTop - 9}" r="4.2" fill="none" stroke="${INK}" stroke-width="1.8"/>` : '');
      if (stems.length === 1) {
        const st = stems[0];
        s += openMark(st, Math.min(yOf(st.top) - 30, yOf(8) - 6));
        s += st.heads;
        const y1 = yOf(st.top) - 30;
        s += stem(st.x, yOf(st.low), Math.min(y1, yOf(8) - 6));
        const flags = st.units === 4 ? 0 : st.units === 1 ? 2 : 1;
        for (let f = 0; f < flags; f++) s += `<path d="M${st.x + 6} ${Math.min(y1, yOf(8) - 6) + f * 7} q 12 8 6 20" fill="none" stroke="${INK}" stroke-width="2.2"/>`;
        if (st.dotted) s += `<circle cx="${st.x + 14}" cy="${yOf(st.low) - 2}" r="2" fill="${INK}"/>`;
      } else {
        for (const st of stems) {
          s += openMark(st, beamY);
          s += st.heads;
          s += stem(st.x, yOf(st.low), beamY);
          if (st.dotted) s += `<circle cx="${st.x + 14}" cy="${yOf(st.low) - 2}" r="2" fill="${INK}"/>`;
        }
        const x0 = stems[0].x + 6;
        const x1 = stems[stems.length - 1].x + 6;
        s += `<rect x="${x0 - 1}" y="${beamY}" width="${x1 - x0 + 2}" height="4.5" fill="${INK}"/>`;
        // Segon barrat per a les semicorxeres
        stems.forEach((st, i) => {
          if (st.units !== 1) return;
          const next = stems[i + 1];
          const prev = stems[i - 1];
          if (next && next.units === 1) s += `<rect x="${st.x + 5}" y="${beamY + 7}" width="${next.x - st.x + 2}" height="4.5" fill="${INK}"/>`;
          else if (!(prev && prev.units === 1)) {
            const dir = next ? 1 : -1;
            s += `<rect x="${dir > 0 ? st.x + 5 : st.x - 5}" y="${beamY + 7}" width="11" height="4.5" fill="${INK}"/>`;
          }
        });
        if (grid === 12 && metre().div !== 3) s += `<text x="${(x0 + x1) / 2}" y="${beamY - 5}" class="tuplet">3</text>`;
      }
    }
    return s;
  }

  function head(n, x) {
    const p = POS[n.piece] ?? 5;
    const y = yOf(p);
    const st = n.exp?.status;
    const judged = st && st !== 'pending' && st !== 'skip';
    const ink = judged ? STATUS[st] ?? INK : colors ? PIECE_INK[n.piece] ?? INK : INK;
    let s = '';
    // línies addicionals
    if (p >= 10) s += `<line x1="${x - 9}" x2="${x + 9}" y1="${yOf(10)}" y2="${yOf(10)}" stroke="${INK}" stroke-width="1.2"/>`;
    if (p <= -2) s += `<line x1="${x - 9}" x2="${x + 9}" y1="${yOf(-2)}" y2="${yOf(-2)}" stroke="${INK}" stroke-width="1.2"/>`;
    if (XHEAD.has(n.piece)) {
      s += `<path d="M${x - 5} ${y - 5} L${x + 5} ${y + 5} M${x + 5} ${y - 5} L${x - 5} ${y + 5}" stroke="${ink}" stroke-width="2.6" stroke-linecap="round"/>`;
      if (n.piece === 'rim') s += `<circle cx="${x}" cy="${y}" r="8" fill="none" stroke="${ink}" stroke-width="1.4"/>`;
    } else {
      s += `<ellipse cx="${x}" cy="${y}" rx="6.2" ry="4.4" transform="rotate(-20 ${x} ${y})" fill="${ink}"/>`;
    }
    if (PIECES[n.piece]?.ghost) s += `<text x="${x - 13}" y="${y + 4}" class="paren">(</text><text x="${x + 8}" y="${y + 4}" class="paren">)</text>`;
    if (judged && st === 'missed') s += `<circle cx="${x}" cy="${y}" r="9" fill="none" stroke="${STATUS.missed}" stroke-width="2"/>`;
    return s;
  }

  const stem = (x, yLow, yTop) => `<line x1="${x + 5.8}" x2="${x + 5.8}" y1="${yLow - 1}" y2="${yTop}" stroke="${INK}" stroke-width="1.6"/>`;
  const quarterRest = (x) => `<path d="M${x - 2} ${yOf(7)} l6 7 l-6 6 l6 7 q-8 -3 -4 6" fill="none" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"/>`;
  const eighthRest = (x) => `<circle cx="${x - 2}" cy="${yOf(5)}" r="2.8" fill="${INK}"/><path d="M${x - 2} ${yOf(5) + 1} q5 1 7 -3 l-6 17" fill="none" stroke="${INK}" stroke-width="1.8"/>`;
  const sixteenthRest = (x) => `${eighthRest(x)}<circle cx="${x - 4}" cy="${yOf(3)}" r="2.6" fill="${INK}"/><path d="M${x - 4} ${yOf(3) + 1} q4 1 6 -3" fill="none" stroke="${INK}" stroke-width="1.8"/>`;

  return {
    /** Pàgina actual: els dos compassos de la línia de temps que comencen a `first` (parell). */
    update(session, pos, { force = false, hitsVersion = 0, statusVersion = 0 } = {}) {
      const first = Math.max(0, Math.floor(Math.max(0, pos.bar) / 2) * 2);
      const key = `${first}:${hitsVersion}:${statusVersion}`;
      if (force || key !== pageKey) {
        pageKey = key;
        const bars = [session.bars[first] ?? session.generate?.(first), session.bars[first + 1] ?? session.generate?.(first + 1)];
        const labels = bars.map((b) => (!b ? '' : b.kind === 'demo' ? 'ESCOLTA' : b.kind === 'count' ? (b.entryBreak ? 'BREAK · ENTRADA' : 'PREPARA’T') : b.kind === 'end' ? 'FINAL' : b.quiet ? 'EN SILENCI' : b.part ? b.part.toUpperCase() : b.card?.brk ? 'BREAK' : `${b.j + 1}`));
        const hits = [];
        for (const h of session.judge?.hits ?? []) {
          const x = (h.time - session.t0) / session.barDur;
          // Un cop una mica avançat al temps 1 pertany al compàs següent: es dibuixa just abans de la seva nota
          // (si no, quedaria a l'altra banda de la barra de compàs, o fins i tot a la pàgina anterior).
          let bar = Math.floor(x);
          let beat = (x - bar) * BPB();
          if (beat > BPB() - 0.5) { bar += 1; beat -= BPB(); }
          if (bar === first || bar === first + 1) hits.push({ slot: bar - first, beat, kind: h.kind, piece: h.piece });
        }
        render(bars, { hits, labels });
      }
      // Pilota: avança i bota; toca a baix just a cada temps
      const slot = pos.bar - first;
      const visible = pos.bar >= 0 && slot >= 0 && slot < 2;
      const beat = Math.max(0, Math.min(BPB() - 0.001, pos.beat));
      const x = xAt(slot, beat);
      const y = BALL_REST - BALL_UP * Math.sin(Math.PI * (beat % 1));
      ball.style.left = `${(x / W) * 100}%`;
      ball.style.top = `${(y / H) * 100}%`;
      ball.style.opacity = visible ? '1' : '0';
    },
    /** Vista quieta (abans de començar): la carta tal com sona. */
    still(cards) {
      pageKey = null;
      const bars = [0, 1].map((i) => {
        const c = cards.length > 1 && i === 1 ? cards[1] : cards[0];
        return { kind: 'play', card: c, notes: barNotes(c).map((n) => ({ ...n })) };
      });
      render(bars, { labels: cards.length > 1 ? ['RITME', 'BREAK'] : ['', ''] });
      ball.style.opacity = '0';
    },
    set colors(v) { colors = v; pageKey = null; },
  };
}
