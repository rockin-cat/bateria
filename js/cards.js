// Les cartes de bateria ROCKIN, les peces de la bateria i el camí (nivells i reptes).

import RAW from '../data/cartes.js';

// ---- Peces ---------------------------------------------------------------------------------------------
// `lane`: carril on es dibuixa. `cls`: el que el jutge compara (una nota fantasma de caixa és caixa).
export const PIECES = {
  crash: { name: 'Plat crash', short: 'Crash', color: '#d9536a', lane: 'crash', cls: 'crash' },
  ride: { name: 'Plat ride', short: 'Ride', color: '#f59f00', lane: 'ride', cls: 'ride' },
  hh: { name: 'Charles', short: 'Charles', color: '#ffd84d', lane: 'hh', cls: 'hh' },
  oh: { name: 'Charles obert', short: 'Obert', color: '#ffd84d', lane: 'hh', cls: 'oh', open: true },
  t1: { name: 'Tom 1 (agut)', short: 'Tom 1', color: '#5fb3b8', lane: 't1', cls: 't1' },
  sn: { name: 'Caixa', short: 'Caixa', color: '#79cf5a', lane: 'sn', cls: 'sn' },
  ghost: { name: 'Caixa fluixa', short: 'Caixa', color: '#79cf5a', lane: 'sn', cls: 'sn', ghost: true },
  rim: { name: 'Caixa amb la baqueta creuada', short: 'Rim', color: '#79cf5a', lane: 'sn', cls: 'sn', rim: true },
  t2: { name: 'Tom 2 (mitjà)', short: 'Tom 2', color: '#9a9a9a', lane: 't2', cls: 't2' },
  t3: { name: 'Tom 3 (de terra)', short: 'Tom 3', color: '#b08968', lane: 't3', cls: 't3' },
  kk: { name: 'Bombo', short: 'Bombo', color: '#3fb4ff', lane: 'kk', cls: 'kk' },
  ghostkk: { name: 'Bombo fluix', short: 'Bombo', color: '#3fb4ff', lane: 'kk', cls: 'kk', ghost: true },
  pedal: { name: 'Pedal del charles', short: 'Pedal', color: '#ffd84d', lane: 'hh', cls: 'pedal' },
};
export const CLS_NAME = { crash: 'el crash', ride: 'el ride', hh: 'el charles', oh: 'el charles obert', t1: 'el tom 1', sn: 'la caixa', t2: 'el tom 2', t3: 'el tom 3', kk: 'el bombo', pedal: 'el pedal del charles' };
export const LANE_ORDER = ['crash', 'ride', 'hh', 't1', 'sn', 't2', 't3', 'kk'];
export const LANE_LABEL = { crash: 'Crash', ride: 'Ride', hh: 'Charles', t1: 'Tom 1', sn: 'Caixa', t2: 'Tom 2', t3: 'Tom 3', kk: 'Bombo' };
export const LANE_COLOR = { crash: '#d9536a', ride: '#f59f00', hh: '#ffd84d', t1: '#5fb3b8', sn: '#79cf5a', t2: '#9a9a9a', t3: '#b08968', kk: '#3fb4ff' };

// ---- Cartes ---------------------------------------------------------------------------------------------

/** Carta dibuixada pel joc (escalfaments i patrons de la biblioteca), amb la mateixa geometria que les imatges. */
const DRAWN_GEO = { x1: 0.2, dx: 0.19, ytop: 0.26 };
const ROW_Y = { crash: 0.37, ride: 0.41, hh: 0.41, oh: 0.41, t1: 0.49, sn: 0.57, ghost: 0.57, rim: 0.57, t2: 0.63, t3: 0.69, kk: 0.76, ghostkk: 0.76, pedal: 0.84 };

export function drawnCard({ id, num = '', title = '', notes, grid = 16, brk = false, box = '#a98a5a', style = null, name = '' }) {
  const marks = {};
  const per = grid / 4;
  // Charles en semicorxeres: es toca alternant mans (D-E). Com a les cartes ROCKIN 30–32.
  const hh16 = grid === 16 && (notes.hh ?? []).filter((st) => st % 2 === 1).length >= 4;
  for (const [p, steps] of Object.entries(notes)) {
    for (const s of steps) {
      const small = PIECES[p]?.ghost || p === 'pedal' || (grid === 16 && (hh16 ? s % 4 !== 0 : s % 2 === 1) && ['hh', 'oh', 'ride'].includes(p)) || (grid === 12 && s % 3 !== 0 && ['hh', 'oh', 'ride'].includes(p));
      marks[`${p}:${s}`] = [DRAWN_GEO.x1 + (s / per) * DRAWN_GEO.dx, ROW_Y[p] ?? 0.6, small ? 0.012 : 0.022];
    }
  }
  return { id, num, title, grid, brk, notes, img: null, drawn: true, geo: DRAWN_GEO, marks, box, style, name, sticking: hh16 };
}

const WARMUPS = [
  drawnCard({ id: 'w1', num: 'E1', title: 'Només el bombo', notes: { kk: [0, 4, 8, 12] } }),
  drawnCard({ id: 'w2', num: 'E2', title: 'Bombo i caixa', notes: { sn: [4, 12], kk: [0, 8] } }),
  drawnCard({ id: 'w3', num: 'E3', title: 'Charles, bombo i caixa', notes: { hh: [0, 4, 8, 12], sn: [4, 12], kk: [0, 8] } }),
];

export const CARDS = new Map([...WARMUPS, ...RAW].map((c) => [c.id, c]));
/** Afegeix cartes noves (les dels estils) al catàleg. */
export function registerCards(list) { for (const c of list) CARDS.set(c.id, c); }
export const card = (id) => CARDS.get(id);

export function cardLabel(c) {
  if (!c) return '';
  if (c.style) return c.name;
  if (c.drawn && c.id.startsWith('w')) return `Escalfament ${c.num}`;
  if (c.brk) return c.num;
  if (c.id.startsWith('s')) return `Shuffle ${c.num.split(' ')[0]}`;
  if (c.id.startsWith('toms')) return 'Toms 1';
  if (c.id.startsWith('lib')) return 'Patró de la cançó';
  return `Patró ${c.num}`;
}

/** Les peces que surten a la carta (per saber quins carrils cal dibuixar). */
export function lanesOf(...cards) {
  const used = new Set();
  for (const c of cards) for (const [p, s] of Object.entries(c?.notes ?? {})) if (s.length) used.add(PIECES[p].lane);
  for (const base of ['hh', 'sn', 'kk']) used.add(base);
  return LANE_ORDER.filter((l) => used.has(l));
}

/** Notes d'un compàs de la carta: [{ piece, step, beat }] ordenades per temps. `beat` en negres (0–4). */
export function barNotes(c) {
  const per = c.grid / 4;
  const out = [];
  for (const [piece, steps] of Object.entries(c.notes)) for (const step of steps) out.push({ piece, step, beat: step / per });
  return out.sort((a, b) => a.beat - b.beat);
}

// ---- El camí ---------------------------------------------------------------------------------------------

export const LEVELS = [
  {
    id: 1, name: 'Les peces i el pols', band: 'Trobes les peces i mantens el pols',
    tempo: 80, target: 100, supports: 2,
    missions: ['w1', 'w2', 'w3', 'p3', 'p2', 'p1'],
    intro: 'Comença pel bombo (el peu dret) i la caixa (la mà esquerra). El charles el toca la mà dreta.',
  },
  {
    id: 2, name: 'El ritme de rock', band: 'Toques el patró bàsic sense perdre’t',
    tempo: 85, target: 110, supports: 2,
    missions: ['p5', 'p8', 'p9', 'p10', 'p12', 'p13', 'p4', 'p7', 'p15', 'p6', 'p16'],
    intro: 'El charles fa corxeres (1 i 2 i 3 i 4 i) i el bombo i la caixa s’hi van posant a sota.',
  },
  {
    id: 3, name: 'Contratemps i síncopes', band: 'Els cops fora del temps no et fan caure',
    tempo: 85, target: 110, supports: 1,
    missions: ['p17', 'p18', 'p19', 'p11', 'p14', 'p20', 'p21', 'p21b', 'p22', 'p23'],
    intro: 'Ara hi ha cops a les «i»: entre temps i temps. Compta en veu baixa: 1 i 2 i 3 i 4 i.',
  },
  {
    id: 4, name: 'Notes fantasma', band: 'Toques fort i fluix a la vegada',
    tempo: 80, target: 100, supports: 1,
    missions: ['p24', 'p25', 'p26', 'p27', 'p27b', 'p28', 'p29'],
    intro: 'Les rodones petites són notes fantasma: cops molt fluixos, gairebé no se senten però donen swing.',
  },
  {
    id: 5, name: 'Semicorxeres', band: 'Les dues mans alternen al charles',
    tempo: 70, target: 90, supports: 1,
    missions: ['p30', 'p31', 'p32'],
    intro: 'Quatre cops per temps al charles: D E D E (dreta, esquerra). Al 2 i al 4 la dreta se’n va a la caixa: en aquell cop el charles calla.',
  },
  {
    id: 6, name: 'Shuffle i tresets', band: 'Toques en ternari',
    tempo: 60, target: 75, supports: 1,
    missions: ['s1', 's2', 's3'],
    intro: 'Cada temps es divideix en tres: 1-i-a 2-i-a… Les balades lentes sovint van així.',
  },
  {
    id: 7, name: 'Toms i breaks', band: 'Fas un break al final de la frase',
    tempo: 80, target: 105, supports: 1,
    missions: ['toms1', 'break1', 'break2', 'break3', 'break4', 'break5', 'break6', 'break7'],
    intro: 'Un break és el compàs que avisa que canvia la part. Toques 3 compassos de ritme i el 4t fas el break.',
  },
];

export const levelOf = (cardId) => LEVELS.find((l) => l.missions.includes(cardId)) ?? null;
export const ALL_MISSIONS = LEVELS.flatMap((l) => l.missions);

/** La banda que acompanya cada carta per defecte (es pot canviar). */
const BAND_FOR = {
  p1: 'punk', p3: 'indie', p4: 'stomp', p5: 'funk', p8: 'pop', p9: 'pop', p12: 'pop', p14: 'rockmenor', p16: 'punk',
  p17: 'festa', p18: 'dance', p19: 'festa', p20: 'pop', p21: 'pop', p21b: 'pop', p22: 'pop', p23: 'pop',
  p24: 'funk', p25: 'funk', p26: 'funk', p27: 'funk', p27b: 'funk', p28: 'funk', p29: 'rockmenor',
  p30: 'rnb', p31: 'rnb', p32: 'rnb', s1: 'balada12', s2: 'balada12', s3: 'balada12',
};
export const defaultBand = (cardId) => BAND_FOR[cardId] ?? 'rock';

/** Per als breaks: el ritme que es toca els tres primers compassos. */
export const GROOVE_FOR_BREAK = 'p5';
