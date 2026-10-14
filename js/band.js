// La banda que acompanya: baix, teclat (rhodes) i guitarra, SENSE bateria,
// perquè la bateria la toca l'alumnat. Cada estil diu què toca cada
// instrument en un compàs, a partir de l'acord d'aquell compàs.
// Els temps es compten en negres des de l'inici del compàs (0–4).

import { parseChord, mod } from './theory.js';

const NOTE = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
const NAMES = ['Do', 'Do#', 'Re', 'Mi♭', 'Mi', 'Fa', 'Fa#', 'Sol', 'La♭', 'La', 'Si♭', 'Si'];

export const BANDS = {
  rock: { name: 'Rock', key: 'E', minor: false, progs: ['I V vi IV', 'I IV V IV'], feel: 16 },
  rockmenor: { name: 'Rock en menor', key: 'A', minor: true, progs: ['i VI III VII', 'i iv VI v'], feel: 16 },
  punk: { name: 'Punk-rock', key: 'A', minor: false, progs: ['I IV V IV', 'I V vi IV'], feel: 16 },
  pop: { name: 'Pop', key: 'C', minor: false, progs: ['vi IV I V', 'I V vi IV'], feel: 16 },
  indie: { name: 'Indie lent', key: 'G', minor: true, progs: ['i VI iv v', 'i VII VI v'], feel: 16 },
  stomp: { name: 'Estadi', key: 'E', minor: true, progs: ['i i VI VII'], feel: 16 },
  funk: { name: 'Funk', key: 'D', minor: true, progs: ['i IV', 'i i IV IV'], feel: 16 },
  festa: { name: 'Festa (ska)', key: 'G', minor: false, progs: ['I IV V I', 'I vi IV V'], feel: 16 },
  dance: { name: 'Electrònica', key: 'F', minor: true, progs: ['i VI III VII'], feel: 16 },
  rnb: { name: 'R&B suau', key: 'F', minor: false, progs: ['IV V iii vi', 'I vi ii V'], feel: 16, sevenths: true },
  balada12: { name: 'Balada en tresets', key: 'C', minor: false, progs: ['I vi IV V', 'I IV I V'], feel: 12 },
  disco: { name: 'Disco', key: 'A', minor: true, progs: ['i IV i IV', 'i iv VII III'], feel: 16, sevenths: true },
  reggae: { name: 'Reggae', key: 'G', minor: false, progs: ['I IV I V', 'I V vi IV'], feel: 16 },
  reggaeton: { name: 'Reggaeton', key: 'A', minor: true, progs: ['i VI III VII'], feel: 16 },
  rumba: { name: 'Rumba catalana', key: 'A', minor: true, progs: ['i VII VI V', 'i iv V i'], feel: 16 },
  cumbia: { name: 'Cúmbia', key: 'D', minor: false, progs: ['I IV V I', 'I V V I'], feel: 16 },
  shuffle: { name: 'Blues shuffle', key: 'A', minor: false, progs: ['I I I I IV IV I I V IV I V'], feel: 12, blues: true },
  swing: { name: 'Swing', key: 'F', minor: false, progs: ['ii V I I', 'I vi ii V'], feel: 12, sevenths: true },
  bossa: { name: 'Bossa nova', key: 'F', minor: false, progs: ['I vi ii V', 'ii V I I'], feel: 16, sevenths: true },
  samba: { name: 'Samba', key: 'F', minor: false, progs: ['I VI ii V'], feel: 16, sevenths: true },
  hiphop: { name: 'Hip-hop', key: 'C', minor: true, progs: ['i iv VI v'], feel: 16, sevenths: true },
  trap: { name: 'Trap', key: 'F#', minor: true, progs: ['i i VI VII'], feel: 16 },
  metal: { name: 'Metal', key: 'E', minor: true, progs: ['i VI VII i', 'i i VI VII'], feel: 16 },
};
export const BAND_IDS = Object.keys(BANDS);

/** Mostres que fa servir cada estil (per carregar-les abans de començar). */
export const BAND_SETS = ['baix', 'rhodes', 'guitarra_dist', 'acustica'];

const MAJOR_SCALE = [0, 2, 4, 5, 7, 9, 11];
const MINOR_SCALE = [0, 2, 3, 5, 7, 8, 10];
const ROMAN = { i: 0, ii: 1, iii: 2, iv: 3, v: 4, vi: 5, vii: 6 };

function romanChord(token, keyPc, minorKey) {
  const m = /^(b?)([ivIV]+)(7?)$/.exec(token);
  if (!m) return null;
  const deg = ROMAN[m[2].toLowerCase()];
  const scale = minorKey ? MINOR_SCALE : MAJOR_SCALE;
  const root = mod(keyPc + scale[deg] - (m[1] ? 1 : 0), 12);
  const minor = m[2] === m[2].toLowerCase();
  return { root, third: minor ? 3 : 4, seventh: minor ? 10 : deg === 4 && !minorKey ? 10 : 11, name: `${NAMES[root]}${minor ? 'm' : ''}` };
}

/** Els acords (un per compàs) de la banda `id`, progressió número `n`. */
export function bandChords(id, n = 0) {
  const b = BANDS[id] ?? BANDS.rock;
  const prog = b.progs[mod(n, b.progs.length)];
  return prog.split(/\s+/).map((t) => romanChord(t, NOTE[b.key], b.minor)).filter(Boolean);
}

export function bandKeyName(id) {
  const b = BANDS[id] ?? BANDS.rock;
  return `${NAMES[NOTE[b.key]]} ${b.minor ? 'menor' : 'major'}`;
}

/** Un acord escrit ("Am", "F#", "Bb7", "D-") a la forma que fa servir la banda. */
export function chordFromSymbol(symbol) {
  try {
    const c = parseChord(String(symbol).replace(/-$/, 'm').replace(/-(7)$/, 'm$1').replace(/5$/, ''));
    const third = mod(c.triad[1] - c.root, 12);
    const has7 = c.tones.find((t) => [10, 11].includes(mod(t - c.root, 12)));
    return { root: c.root, third: third === 3 || third === 4 ? third : 4, seventh: has7 != null ? mod(has7 - c.root, 12) : third === 3 ? 10 : 11, name: c.symbol };
  } catch {
    return null;
  }
}

// ---- Veus -------------------------------------------------------------------------------------------------

const inRange = (pc, low) => low + mod(pc - low, 12);
const bassRoot = (c) => inRange(c.root, 28); // Mi1 – Re#2
const fifth = (c) => bassRoot(c) + 7;

function keys(c, sevenths = false) {
  const pcs = [c.root, c.root + c.third, c.root + 7];
  if (sevenths) pcs.push(c.root + c.seventh);
  let best = null;
  for (let r = 0; r < pcs.length; r++) {
    const rot = [...pcs.slice(r), ...pcs.slice(0, r)];
    const notes = [];
    let low = 55;
    for (const pc of rot) {
      const n = inRange(mod(pc, 12), low);
      notes.push(n);
      low = n + 1;
    }
    const centre = notes.reduce((a, b) => a + b, 0) / notes.length;
    if (!best || Math.abs(centre - 64) < best.d) best = { notes, d: Math.abs(centre - 64) };
  }
  return best.notes;
}

const power = (c) => { const r = inRange(c.root, 40); return [r, r + 7, r + 12]; };
const strumNotes = (c) => { const r = inRange(c.root, 40); return [r, r + 7, r + 12, r + 12 + c.third, r + 19]; };

// ---- Estils ------------------------------------------------------------------------------------------------
// Cada estil torna una llista d'esdeveniments { inst, beat, dur, notes, gain, strum }.
// strum: segons entre corda i corda (positiu avall, negatiu amunt).

const ev = (inst, beat, dur, notes, gain, extra = {}) => ({ inst, beat, dur, notes: Array.isArray(notes) ? notes : [notes], gain, ...extra });
const EIGHTHS = [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5];

const STYLE = {
  rock(c) {
    return [
      ...EIGHTHS.map((b) => ev('baix', b, 0.42, bassRoot(c), b % 1 ? 0.42 : 0.55)),
      ...EIGHTHS.map((b) => ev('guitarra_dist', b, b === 0 ? 0.45 : 0.3, power(c), b % 1 ? 0.13 : 0.17, { strum: 0.006 })),
    ];
  },
  rockmenor(c) { return STYLE.rock(c); },
  punk(c) {
    return [
      ...EIGHTHS.map((b) => ev('baix', b, 0.4, bassRoot(c), 0.55)),
      ...EIGHTHS.map((b) => ev('guitarra_dist', b, 0.42, power(c), 0.17, { strum: 0.005 })),
    ];
  },
  pop(c) {
    const pattern = [[0, 1, 1], [1, 0.5, 1], [1.5, 0.5, -1], [2.5, 0.5, -1], [3, 0.5, 1], [3.5, 0.45, -1]];
    return [
      ev('baix', 0, 1.4, bassRoot(c), 0.6), ev('baix', 1.5, 0.45, bassRoot(c), 0.45),
      ev('baix', 2, 0.9, bassRoot(c), 0.55), ev('baix', 3, 0.45, fifth(c), 0.45), ev('baix', 3.5, 0.45, bassRoot(c) + 12, 0.4),
      ...pattern.map(([b, d, dir]) => ev('acustica', b, d, dir > 0 ? strumNotes(c) : strumNotes(c).slice(1).reverse(), dir > 0 ? 0.22 : 0.15, { strum: 0.012 })),
      ev('rhodes', 0, 3.9, keys(c), 0.1),
    ];
  },
  indie(c) {
    return [
      ev('baix', 0, 1.9, bassRoot(c), 0.6), ev('baix', 2.5, 1.4, bassRoot(c), 0.5),
      ev('guitarra_dist', 0, 1.8, power(c), 0.2, { strum: 0.01 }), ev('guitarra_dist', 2.5, 0.4, power(c), 0.16, { strum: 0.008 }),
      ev('rhodes', 0, 3.9, keys(c), 0.08),
    ];
  },
  stomp(c) {
    return [ev('baix', 0, 3.6, bassRoot(c), 0.55), ev('guitarra_dist', 0, 3.8, power(c), 0.14, { strum: 0.015 })];
  },
  funk(c) {
    const r = bassRoot(c);
    return [
      ev('baix', 0, 0.3, r, 0.65), ev('baix', 0.75, 0.2, r + 12, 0.45), ev('baix', 1.5, 0.2, r, 0.5),
      ev('baix', 2, 0.4, r, 0.6), ev('baix', 2.75, 0.2, r + 10, 0.45), ev('baix', 3, 0.2, r, 0.5), ev('baix', 3.5, 0.2, r + 7, 0.5),
      ...[0.5, 1.75, 2.5, 3.75].map((b) => ev('rhodes', b, 0.18, keys(c, true), 0.2)),
      ...[1, 3].map((b) => ev('acustica', b, 0.1, strumNotes(c).slice(1), 0.14, { strum: 0.006 })),
    ];
  },
  festa(c) {
    const r = bassRoot(c);
    return [
      ev('baix', 0, 0.8, r, 0.6), ev('baix', 1, 0.8, r + 7, 0.5), ev('baix', 2, 0.8, r + 12, 0.5), ev('baix', 3, 0.8, r + 7, 0.5),
      ...[0.5, 1.5, 2.5, 3.5].map((b) => ev('acustica', b, 0.14, strumNotes(c).slice(1).reverse(), 0.22, { strum: 0.006 })),
      ...[0.5, 1.5, 2.5, 3.5].map((b) => ev('rhodes', b, 0.14, keys(c), 0.12)),
    ];
  },
  dance(c) {
    const r = bassRoot(c);
    const k = keys(c);
    const arp = [k[0] + 12, k[1] + 12, k[2] + 12, k[1] + 12];
    return [
      ...[0.5, 1.5, 2.5, 3.5].map((b) => ev('baix', b, 0.4, r, 0.6)),
      ev('rhodes', 0, 3.9, k, 0.13),
      ...EIGHTHS.map((b, i) => ev('rhodes', b, 0.3, arp[i % 4], 0.09)),
    ];
  },
  rnb(c) {
    const r = bassRoot(c);
    const k = keys(c, true);
    return [
      ev('rhodes', 0, 1.4, k, 0.2), ev('rhodes', 1.5, 0.4, k, 0.14), ev('rhodes', 2.5, 1.3, k, 0.18),
      ev('baix', 0, 0.7, r, 0.6), ev('baix', 0.75, 0.2, r, 0.4), ev('baix', 2.5, 0.7, r, 0.55), ev('baix', 3.5, 0.4, r + 7, 0.45),
    ];
  },
  disco(c) {
    const r = bassRoot(c);
    return [
      ...EIGHTHS.map((b, i) => ev('baix', b, 0.3, i % 2 ? r + 12 : r, i % 2 ? 0.45 : 0.6)),
      ...[0.5, 1.5, 2.5, 3.5].map((b) => ev('rhodes', b, 0.3, keys(c, true), 0.14)),
      ...[0.25, 0.75, 1.25, 1.75, 2.25, 2.75, 3.25, 3.75].map((b) => ev('acustica', b, 0.08, strumNotes(c).slice(2), 0.08, { strum: 0.004 })),
    ];
  },
  reggae(c) {
    const r = bassRoot(c);
    return [
      ev('baix', 1, 0.7, r, 0.65), ev('baix', 1.75, 0.2, r, 0.45), ev('baix', 2, 0.6, r + 7, 0.55), ev('baix', 3, 0.4, r + 12, 0.5), ev('baix', 3.5, 0.4, r + 10, 0.45),
      ...[0.5, 1.5, 2.5, 3.5].map((b) => ev('acustica', b, 0.12, strumNotes(c).slice(2), 0.2, { strum: 0.004 })),
      ...[0.75, 1.75, 2.75, 3.75].map((b) => ev('rhodes', b, 0.12, keys(c), 0.07)),
    ];
  },
  reggaeton(c) {
    const r = bassRoot(c);
    return [
      ev('baix', 0, 1.4, r, 0.65), ev('baix', 1.5, 0.4, r, 0.5), ev('baix', 2, 1.4, r, 0.6), ev('baix', 3.5, 0.4, r + 7, 0.5),
      ...[0, 0.75, 1.5, 2, 2.75, 3.5].map((b) => ev('rhodes', b, 0.22, keys(c), 0.13)),
    ];
  },
  rumba(c) {
    const r = bassRoot(c);
    const down = strumNotes(c);
    const up = strumNotes(c).slice(1).reverse();
    return [
      ev('baix', 0, 0.9, r, 0.6), ev('baix', 1.5, 0.4, r + 7, 0.5), ev('baix', 2, 0.9, r, 0.55), ev('baix', 3.5, 0.4, r + 7, 0.5),
      // «ventilador»: rasgueig fort a cada temps, apagat a la «i» i un cop amunt
      ...[0, 1, 2, 3].flatMap((b) => [
        ev('acustica', b, 0.3, down, 0.24, { strum: 0.01 }),
        ev('acustica', b + 0.5, 0.06, down.slice(2), 0.12, { strum: 0.004 }),
        ev('acustica', b + 0.75, 0.2, up, 0.13, { strum: 0.008 }),
      ]),
    ];
  },
  cumbia(c) {
    const r = bassRoot(c);
    return [
      ev('baix', 0, 0.9, r, 0.6), ev('baix', 1.5, 0.4, r + 7, 0.45), ev('baix', 2, 0.9, r + 7, 0.55), ev('baix', 3.5, 0.4, r, 0.45),
      ...[0.5, 1.5, 2.5, 3.5].map((b) => ev('rhodes', b, 0.2, keys(c), 0.13)),
      ...[0.5, 1.5, 2.5, 3.5].map((b) => ev('acustica', b, 0.1, strumNotes(c).slice(2), 0.12, { strum: 0.004 })),
    ];
  },
  shuffle(c) {
    // baix de boogie: fonamental, 3a, 5a, 6a, en llarg-curt
    const r = bassRoot(c);
    const walk = [r, r + c.third, r + 7, r + 9];
    return [
      ...[0, 1, 2, 3].flatMap((b) => [ev('baix', b, 0.6, walk[b], 0.6), ev('baix', b + 2 / 3, 0.3, walk[b], 0.4)]),
      ...[1, 3].flatMap((b) => [ev('rhodes', b, 0.5, keys({ ...c, seventh: 10 }, true), 0.13), ev('rhodes', b + 2 / 3, 0.25, keys({ ...c, seventh: 10 }, true), 0.08)]),
    ];
  },
  swing(c) {
    const r = bassRoot(c);
    const walk = [r, r + (c.third === 3 ? 3 : 4), r + 7, r + 9];
    return [
      ...walk.map((m, b) => ev('baix', b, 0.9, m, 0.55)),
      ev('rhodes', 0, 0.5, keys(c, true), 0.14), ev('rhodes', 1 + 2 / 3, 0.35, keys(c, true), 0.12),
    ];
  },
  bossa(c) {
    const r = bassRoot(c);
    return [
      ev('baix', 0, 1.4, r, 0.55), ev('baix', 1.5, 0.45, r + 7, 0.45), ev('baix', 2, 1.4, r + 7, 0.5), ev('baix', 3.5, 0.45, r, 0.45),
      ...[0, 0.75, 1.5, 2.5, 3.25].map((b) => ev('acustica', b, 0.4, strumNotes(c).slice(1), 0.14, { strum: 0.008 })),
      ev('rhodes', 0, 3.9, keys(c, true), 0.07),
    ];
  },
  samba(c) {
    const r = bassRoot(c);
    return [
      ev('baix', 0, 0.45, r, 0.6), ev('baix', 1, 0.4, r + 7, 0.55), ev('baix', 1.75, 0.2, r, 0.45),
      ev('baix', 2, 0.45, r, 0.6), ev('baix', 3, 0.4, r + 7, 0.55), ev('baix', 3.75, 0.2, r, 0.45),
      ...[0.5, 0.75, 1.5, 2.25, 2.5, 3.5].map((b) => ev('acustica', b, 0.12, strumNotes(c).slice(2), 0.15, { strum: 0.004 })),
      ev('rhodes', 0, 3.9, keys(c, true), 0.06),
    ];
  },
  hiphop(c) {
    const r = bassRoot(c);
    return [
      ev('rhodes', 0, 1.9, keys(c, true), 0.17), ev('rhodes', 2, 1.9, keys(c, true), 0.15),
      ev('baix', 0, 0.6, r, 0.65), ev('baix', 0.75, 0.2, r, 0.45), ev('baix', 2.5, 0.5, r, 0.55), ev('baix', 3.5, 0.3, r + 7, 0.45),
    ];
  },
  trap(c) {
    const r = bassRoot(c);
    return [
      ev('baix', 0, 1.4, r, 0.7), ev('baix', 1.5, 0.4, r, 0.55), ev('baix', 2.75, 1.1, r, 0.6),
      ev('rhodes', 0, 3.9, keys(c), 0.1),
      ...[0, 1, 2, 3].map((b) => ev('rhodes', b + 0.5, 0.3, keys(c)[2] + 12, 0.06)),
    ];
  },
  metal(c) {
    const r = bassRoot(c);
    const gallop = [0, 0.5, 0.75, 1, 1.5, 1.75, 2, 2.5, 2.75, 3, 3.5, 3.75];
    return [
      ...gallop.map((b) => ev('guitarra_dist', b, 0.22, power(c), b % 1 ? 0.13 : 0.18, { strum: 0.004 })),
      ...gallop.map((b) => ev('baix', b, 0.22, r, b % 1 ? 0.45 : 0.6)),
    ];
  },
  balada12(c) {
    const k = keys(c);
    const arp = [k[0], k[1], k[2], k[0] + 12, k[2], k[1]];
    const r = bassRoot(c);
    return [
      ev('baix', 0, 1.9, r, 0.6), ev('baix', 2, 1.4, r, 0.5), ev('baix', 3 + 2 / 3, 0.3, r + 7, 0.4),
      ...Array.from({ length: 12 }, (_, i) => ev('rhodes', i / 3, 0.6, arp[i % 6], i % 3 ? 0.1 : 0.15)),
    ];
  },
};

/** El final: tothom toca l'acord i el deixa sonar. */
/** Marques (nivell 9): tota la banda fa un cop curt a cada `beat` i calla. */
function stopHits(c, beats) {
  return beats.flatMap((b) => [ev('baix', b, 0.45, bassRoot(c), 0.65), ev('rhodes', b, 0.5, keys(c), 0.2), ev('acustica', b, 0.4, strumNotes(c), 0.22, { strum: 0.012 })]);
}
function ending(c) {
  return [ev('baix', 0, 3, bassRoot(c), 0.6), ev('rhodes', 0, 3.2, keys(c), 0.18), ev('acustica', 0, 3.2, strumNotes(c), 0.2, { strum: 0.02 })];
}

/**
 * Què toca la banda en un compàs. `kind`: 'play' (normal), 'end' (acord final).
 * Torna esdeveniments amb `beat` relatiu a l'inici del compàs.
 */
export function barEvents(bandId, chord, kind = 'play', opts = {}) {
  if (!chord) return [];
  if (kind === 'end') return ending(chord);
  if (kind === 'stop') return stopHits(chord, opts.beats ?? [0]);
  const evs = (STYLE[bandId] ?? STYLE.rock)(chord, BANDS[bandId]);
  return opts.role || opts.pickup ? arrange(evs, chord, opts.role, opts.pickup) : evs;
}

/**
 * La banda marca l'estructura de la cançó (com en un assaig, on el bateria es guia per la banda):
 *   intro: baix llarg i teclat, molt suau · estrofa: més buida (la guitarra distorsionada només als temps 1 i 3, la resta més fluix)
 *   tornada: tot, i un coixí de teclat al damunt · pickup: l'últim compàs de la part acaba amb una pujada al temps 4.
 */
function arrange(evs, c, role, pickup) {
  let out = evs;
  if (role === 'intro') out = [ev('baix', 0, 3.8, bassRoot(c), 0.42), ev('rhodes', 0, 3.9, keys(c), 0.13)];
  else if (role === 'verse') {
    out = evs.filter((e) => e.inst !== 'guitarra_dist' || e.beat % 2 === 0).map((e) => (e.inst === 'baix' ? e : { ...e, gain: e.gain * 0.6 }));
  } else if (role === 'chorus') {
    out = [...evs.map((e) => ({ ...e, gain: e.gain * 1.1 })), ev('rhodes', 0, 3.9, keys(c), 0.11)];
    if (!evs.some((e) => e.inst === 'guitarra_dist')) out.push(...[0, 2].map((b) => ev('acustica', b, 0.9, strumNotes(c), 0.16, { strum: 0.01 })));
  }
  if (pickup) {
    out = out.filter((e) => e.beat < 3).map((e) => ({ ...e, dur: Math.min(e.dur, 3 - e.beat) }));
    out.push(ev('baix', 3, 0.45, bassRoot(c), 0.6), ev('baix', 3.5, 0.45, bassRoot(c) + 12, 0.6));
    out.push(ev('acustica', 3, 0.4, strumNotes(c), 0.2, { strum: 0.01 }), ev('acustica', 3.5, 0.4, strumNotes(c), 0.26, { strum: 0.01 }));
    out.push(ev('rhodes', 3, 0.9, keys(c), 0.16));
  }
  return out;
}
