// La mètrica del compàs, com al Taller de creació:
//   4/4 i 3/4 (i 2/4): pols de negra, subdivisió binària → cartes binàries (graella de 16)
//   6/8, 9/8 i 12/8: pols de negra amb punt, subdivisió ternària → cartes de tresets (graella de 12)
// El tempo sempre és el del pols. Les cartes de 4 polsos, en un compàs de 2 o 3 polsos, només toquen els primers.
// Una carta binària en un compàs ternari es passa a tresets (com un shuffle), i a l'inrevés.

import { drawnCard } from './cards.js';

export const METRES = {
  '4/4': { bpb: 4, div: 2, num: 4, den: 4 },
  '3/4': { bpb: 3, div: 2, num: 3, den: 4 },
  '2/4': { bpb: 2, div: 2, num: 2, den: 4 },
  '6/8': { bpb: 2, div: 3, num: 6, den: 8 },
  '9/8': { bpb: 3, div: 3, num: 9, den: 8 },
  '12/8': { bpb: 4, div: 3, num: 12, den: 8 },
};
export const METRE_NAMES = ['4/4', '3/4', '6/8', '9/8', '12/8'];
for (const [k, m] of Object.entries(METRES)) m.name = k;

let cur = METRES['4/4'];
export const metre = () => cur;
export function setMetre(name) { cur = METRES[name] ?? METRES['4/4']; return cur; }
export const isMetre = (name) => !!METRES[name ?? '4/4'];

const cache = new Map();
/** La carta tal com sona en aquesta mètrica (la mateixa carta si no cal canviar res). */
export function cardForMetre(card, M = cur) {
  if (!card) return card;
  const per0 = card.grid / 4;
  const wantGrid = M.div === 3 ? 12 : 16;
  const toGrid = card.grid === wantGrid ? card.grid : wantGrid;
  const per = toGrid / 4;
  const max = per * M.bpb;
  const needConvert = toGrid !== card.grid;
  const needCut = Object.values(card.notes).some((arr) => arr.some((st) => Math.floor(st / per0) >= M.bpb));
  if (!needConvert && !needCut) return card;
  const key = `${card.id}@${M.name}`;
  if (cache.has(key)) return cache.get(key);
  const notes = {};
  for (const [p, steps] of Object.entries(card.notes)) {
    const out = new Set();
    // Charles o ride a corxeres (els dos cops de cada temps) → els tres tresets: el groove clàssic de 6/8 i 12/8
    if (needConvert && toGrid === 12 && ['hh', 'ride', 'oh'].includes(p)) {
      for (let beat = 0; beat < M.bpb; beat++) {
        if (steps.includes(beat * per0) && steps.includes(beat * per0 + per0 / 2)) [0, 1, 2].forEach((k) => out.add(beat * 3 + k));
      }
    }
    for (const st of steps) {
      if (needConvert && toGrid === 12 && ['hh', 'ride', 'oh'].includes(p) && out.has(Math.floor(st / per0) * 3)) continue;
      const beat = Math.floor(st / per0);
      const r = st % per0;
      let r2 = r;
      if (needConvert && toGrid === 12) r2 = r === 0 ? 0 : r === 2 ? 2 : r === 1 ? 1 : 2; // semicorxeres i corxeres → tresets
      if (needConvert && toGrid === 16) r2 = r === 0 ? 0 : 2; // tresets → corxeres
      const s2 = beat * per + r2;
      if (s2 < max) out.add(s2);
    }
    if (out.size) notes[p] = [...out].sort((a, b) => a - b);
  }
  const c = drawnCard({ id: key, num: card.num, title: card.title, notes, grid: toGrid, brk: card.brk, box: card.box ?? '#a98a5a', style: card.style, name: card.name, pulses: M.bpb });
  c.base = card.id;
  cache.set(key, c);
  return c;
}
export const baseId = (id) => String(id).split('@')[0];

/** Els esdeveniments de la banda (escrits per a 4 temps binaris) adaptats a la mètrica. */
export function bandForMetre(evs, M = cur) {
  if (M.bpb === 4 && M.div === 2) return evs;
  const swing = (b) => { const i = Math.floor(b + 1e-6); const f = b - i; return i + (f < 0.01 ? 0 : f < 0.42 ? 1 / 3 : 2 / 3); };
  return evs
    .map((e) => (M.div === 3 ? { ...e, beat: swing(e.beat) } : e))
    .filter((e) => e.beat < M.bpb - 1e-6)
    .map((e) => ({ ...e, dur: Math.min(e.dur, M.bpb - e.beat) }));
}
