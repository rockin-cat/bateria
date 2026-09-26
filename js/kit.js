// La bateria dibuixada (vista des de dalt, com la veu qui toca). Cada pad
// s'encén quan el toques, quan la demostració el toca i, amb les ajudes
// posades, una mica abans que te toqui.

import { PIECES } from './cards.js';
import { KEY_LABEL } from './input.js';

// cx, cy, r en un viewBox de 420 × 250
const PADS = [
  { id: 'crash', x: 62, y: 58, r: 46, cymbal: true },
  { id: 'ride', x: 360, y: 64, r: 50, cymbal: true },
  { id: 'hh', x: 72, y: 150, r: 40, cymbal: true },
  { id: 't1', x: 168, y: 72, r: 32 },
  { id: 't2', x: 248, y: 72, r: 33 },
  { id: 'sn', x: 158, y: 168, r: 38 },
  { id: 't3', x: 318, y: 172, r: 42 },
  { id: 'kk', x: 238, y: 196, r: 48, kick: true },
];
const PIECE_PAD = { oh: 'hh', pedal: 'hh', ghost: 'sn', rim: 'sn', ghostkk: 'kk' };

export function createKit(root, { onTap } = {}) {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 420 250');
  svg.setAttribute('class', 'kit-svg');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', 'Bateria');
  const els = {};
  // L'ordre de dibuix: el bombo sota de tot
  for (const pad of [...PADS].sort((a, b) => (b.kick ? 1 : 0) - (a.kick ? 1 : 0))) {
    const p = PIECES[pad.id];
    const gEl = document.createElementNS(ns, 'g');
    gEl.setAttribute('class', `pad pad-${pad.id}${pad.cymbal ? ' cymbal' : ''}`);
    gEl.style.setProperty('--c', p.color);
    const shape = document.createElementNS(ns, pad.kick ? 'ellipse' : 'circle');
    if (pad.kick) {
      shape.setAttribute('cx', pad.x); shape.setAttribute('cy', pad.y); shape.setAttribute('rx', pad.r * 1.15); shape.setAttribute('ry', pad.r * 0.62);
    } else {
      shape.setAttribute('cx', pad.x); shape.setAttribute('cy', pad.y); shape.setAttribute('r', pad.r);
    }
    shape.setAttribute('class', 'pad-shape');
    gEl.appendChild(shape);
    if (pad.cymbal) {
      const bell = document.createElementNS(ns, 'circle');
      bell.setAttribute('cx', pad.x); bell.setAttribute('cy', pad.y); bell.setAttribute('r', pad.r * 0.22);
      bell.setAttribute('class', 'pad-bell');
      gEl.appendChild(bell);
    }
    const label = document.createElementNS(ns, 'text');
    label.setAttribute('x', pad.x); label.setAttribute('y', pad.y + (pad.kick ? 8 : 4));
    label.setAttribute('class', 'pad-label');
    label.textContent = p.short;
    gEl.appendChild(label);
    const key = document.createElementNS(ns, 'text');
    key.setAttribute('x', pad.x); key.setAttribute('y', pad.y + (pad.kick ? 22 : 17));
    key.setAttribute('class', 'pad-key');
    key.textContent = KEY_LABEL[pad.id] ?? '';
    gEl.appendChild(key);
    gEl.addEventListener('pointerdown', (ev) => {
      ev.preventDefault();
      onTap?.(pad.id, ev.timeStamp || performance.now());
    });
    svg.appendChild(gEl);
    els[pad.id] = gEl;
  }
  root.innerHTML = '';
  root.appendChild(svg);

  const timers = new Map();
  function flash(piece, cls, ms = 180) {
    const id = PIECE_PAD[piece] ?? piece;
    const el = els[id];
    if (!el) return;
    const key = `${id}:${cls}`;
    el.classList.add(cls);
    clearTimeout(timers.get(key));
    timers.set(key, setTimeout(() => el.classList.remove(cls), ms));
  }

  return {
    /** kind: 'me' (el teu cop), 'good', 'bad', 'demo', 'hint' */
    flash,
    hint(piece) { flash(piece, 'hint', 240); },
    setUsed(pieces) {
      const used = new Set(pieces.map((p) => PIECE_PAD[p] ?? p));
      for (const [id, el] of Object.entries(els)) el.classList.toggle('unused', !used.has(id));
    },
    showKeys(v) { svg.classList.toggle('show-keys', v); },
  };
}
