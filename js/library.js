// The shared library of the ROCKIN diagram generator
// (https://rockin-cat.github.io/Generador-diagrames/): songs that teachers share
// there, kept in a Google Drive folder behind a small Apps Script. This module
// talks to that script and turns a generator song into a song for the drum game.
//
// The script answers, with the teachers' code:
//   GET  ?codi=…          -> { ok, llista: [{ id, nom, data, titol, artista, autor, nivell, instruments }] }
//   GET  ?codi=…&id=…     -> { ok, canco: { titol, artista, acords, estructura: { to, mode, temps, estil, tempo, ordre, parts: [{ nom, acords, compassos }] }, items } }
// and { ok: false, error: 'codi' | 'no-trobada' | 'format' } when something is wrong.

import { parseChord } from './theory.js';
import { drawnCard, card as cardById } from './cards.js';

// The same web app the generator uses (Implementa → Aplicació web).
export const LIBRARY_URL = 'https://script.google.com/macros/s/AKfycbw2lhxNhxvT2EJGhQhpFlOAhT3M_RIrqN_tDQS0oChLULzyeX5dOP_HZLehm6SfXeWS/exec';
const CODE_KEY = 'rockin.play.biblio.codi'; // el mateix codi que el joc de teclat

export const LEVEL_COLOURS = { 0: '#2f9e44', 1: '#f08c00', 2: '#c92a2a' };

export function savedCode() {
  try {
    return localStorage.getItem(CODE_KEY) ?? '';
  } catch {
    return '';
  }
}

export function saveCode(code) {
  try {
    if (code) localStorage.setItem(CODE_KEY, code);
    else localStorage.removeItem(CODE_KEY);
  } catch {
    // private mode: the code is asked again next time
  }
}

async function ask(params) {
  const q = new URLSearchParams(params);
  let response;
  try {
    response = await fetch(`${LIBRARY_URL}?${q}`);
  } catch {
    throw new Error('xarxa');
  }
  let json;
  try {
    json = await response.json();
  } catch {
    throw new Error('xarxa');
  }
  if (!json.ok) {
    if (json.error === 'codi') saveCode('');
    throw new Error(json.error || 'error');
  }
  return json;
}

/** Every song shared in the library, newest first. */
export async function listLibrary(code) {
  const json = await ask({ codi: code });
  return (json.llista ?? []).slice().sort((a, b) => String(b.data).localeCompare(String(a.data)));
}

/** One song, as the generator saved it. */
export async function loadLibrarySong(code, id) {
  const json = await ask({ codi: code, id });
  return json.canco;
}

export function errorText(error) {
  return {
    codi: 'El codi del professorat no és correcte.',
    'sense-codi': 'Cal el codi del professorat per obrir la biblioteca.',
    'no-trobada': 'Aquesta cançó ja no és a la biblioteca.',
    format: 'Aquesta cançó no té acords que el joc pugui tocar.',
    xarxa: 'No s\'ha pogut connectar amb la biblioteca. Comprova la connexió a internet.',
  }[error?.message] ?? 'No s\'ha pogut obrir la biblioteca.';
}

// ---- De cançó del Generador a cançó del joc de bateria ----------------------------------------------

const NOTES_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/** A chord as the generator writes it ("D-", "F#m", "A5", "Bº") to what the game reads. */
export function gameChord(text) {
  const m = /^([A-Ga-g])([#b♯♭]?)(.*)$/.exec(String(text ?? '').trim());
  if (!m) return null;
  const letter = m[1].toUpperCase();
  const accidental = m[2] === '♯' ? '#' : m[2] === '♭' ? 'b' : m[2];
  const rest = m[3].trim();
  let suffix = '';
  if (/^(°|º|o|dim)/.test(rest)) suffix = 'dim';
  else if (/^(-|m(?!aj)|min)/.test(rest)) suffix = /7/.test(rest) ? 'm7' : 'm';
  else if (/^5/.test(rest)) suffix = ''; // a power chord: the game plays the triad
  else if (/^(maj7|M7|Δ)/.test(rest)) suffix = 'maj7';
  else if (/^7/.test(rest)) suffix = '7';
  else if (/^sus2/.test(rest)) suffix = 'sus2';
  else if (/^sus/.test(rest)) suffix = 'sus4';
  const symbol = `${letter}${accidental}${suffix}`;
  try {
    parseChord(symbol);
    return symbol;
  } catch {
    return null;
  }
}

/** The chord that fills most of a generator bar ({ div, cells }); the first one on a tie. */
function barChord(bar) {
  const cells = Array.isArray(bar?.cells) ? bar.cells : [];
  const count = new Map();
  for (const c of cells) {
    const symbol = gameChord(c);
    if (symbol) count.set(symbol, (count.get(symbol) ?? 0) + 1);
  }
  let best = null;
  for (const [symbol, n] of count) if (!best || n > best.n) best = { symbol, n };
  return best?.symbol ?? null;
}

/** "C | G Am | F" or "C G Am F" (the generator's chord text) -> one chord per bar. */
function barsFromText(text) {
  const out = [];
  for (const chunk of String(text ?? '').split('|')) {
    const tokens = chunk.split(/[\s,]+/).filter((t) => t && t !== '.' && t !== '_');
    const chords = tokens.map(gameChord).filter(Boolean);
    if (chords.length) out.push(chords[0]);
  }
  return out;
}

/** The generator's part name as the game shows it: "PART A" -> "A", "tornada" -> "Tornada". */
function shortName(name) {
  const m = /^PART\s+(.+)$/i.exec(String(name ?? ''));
  if (m) return m[1].toUpperCase();
  const n = String(name ?? '').trim();
  return n ? n.charAt(0).toUpperCase() + n.slice(1) : 'A';
}



/** Número de patró del Generador (imatge «dors patrons de bateria n») → carta del joc. */
export function cardForPatternNumber(n) {
  n = Number(n);
  if (n >= 1 && n <= 32) return cardById(`p${n}`);
  if (n >= 33 && n <= 35) return cardById(`s${n - 32}`);
  if (n >= 36 && n <= 42) return cardById(`break${n - 35}`);
  return null;
}

/** Un patró del seqüenciador del Generador ({ steps: { HH, SN, BD } }, 16 passos) → carta dibuixada. */
export function cardFromSequence(item, id) {
  const pick = (arr) => (Array.isArray(arr) ? arr.map((v, i) => (v ? i : -1)).filter((i) => i >= 0 && i < 16) : []);
  const notes = { hh: pick(item.steps?.HH), sn: pick(item.steps?.SN), kk: pick(item.steps?.BD) };
  for (const k of Object.keys(notes)) if (!notes[k].length) delete notes[k];
  if (!Object.keys(notes).length) return null;
  return drawnCard({ id, num: 'C', title: item.nom || 'Patró de la cançó', notes });
}

const BAND_WORDS = [
  ['punk', 'punk'], ['funk', 'funk'], ['soul', 'rnb'], ['r&b', 'rnb'], ['rnb', 'rnb'], ['disco', 'funk'],
  ['reggae', 'festa'], ['ska', 'festa'], ['rumba', 'festa'], ['cumbia', 'festa'], ['cúmbia', 'festa'],
  ['electr', 'dance'], ['dance', 'dance'], ['edm', 'dance'], ['house', 'dance'],
  ['indie', 'indie'], ['balada', 'balada12'], ['ballad', 'balada12'], ['lent', 'pop'], ['pop', 'pop'], ['rock', 'rock'],
];

/**
 * Una cançó de la biblioteca a punt per tocar: { title, artist, tempo, band, bars: [{ chord, part }], groove, brk, notes }.
 * Llança 'format' si no hi ha acords.
 */
export function songFromLibrary(song, entry, { chordFromSymbol }) {
  const est = song?.estructura ?? {};
  const ternary = String(est.temps) === '6';
  const parts = [];
  for (const part of est.parts ?? []) {
    const bars = Array.isArray(part.compassos) && part.compassos.length ? part.compassos.map(barChord).filter(Boolean) : barsFromText(part.acords);
    if (bars.length) parts.push({ name: shortName(part.nom), bars });
  }
  let order = [];
  if (parts.length) {
    const wanted = String(est.ordre ?? '').split(/[–\-—>,]+/).map((s) => s.trim()).filter(Boolean);
    for (const w of wanted) {
      const hit = parts.find((p) => p.name.toLowerCase() === w.toLowerCase()) ?? parts.find((p) => p.name.toLowerCase().startsWith(w.toLowerCase()));
      if (hit) order.push(hit);
    }
    if (!order.length) order = parts;
  } else {
    const chords = String(song?.acords ?? '').split(/[\s,\/|]+/).map(gameChord).filter(Boolean);
    if (!chords.length) throw new Error('format');
    order = [{ name: 'A', bars: [...chords, ...chords] }];
  }
  const bars = [];
  for (const p of order) {
    p.bars.forEach((sym, i) => {
      const chord = chordFromSymbol(sym);
      if (chord) bars.push({ chord, part: p.name, partStart: i === 0, partEnd: i === p.bars.length - 1 });
    });
  }
  if (!bars.length) throw new Error('format');
  const limited = bars.slice(0, 128);

  // Bateria de la cançó
  let groove = null;
  let brk = null;
  const drumItems = (song?.items ?? []).filter((it) => it?.inst === 'bateria');
  drumItems.forEach((it, k) => {
    const c = it.tipus === 'seq' ? cardFromSequence(it, `lib-${entry?.id ?? 'x'}-${k}`) : cardForPatternNumber(it.num);
    if (!c) return;
    if (c.brk) brk ??= c;
    else groove ??= c;
  });
  const defaulted = !groove;
  groove ??= cardById(ternary ? 's1' : 'p5');

  const text = String(est.estil ?? '').toLowerCase();
  let band = ternary ? 'balada12' : 'rock';
  for (const [w, id] of BAND_WORDS) if (text.includes(w)) { band = ternary && id !== 'funk' ? 'balada12' : id; break; }

  return {
    id: `biblio:${entry?.id}`,
    title: song?.titol || entry?.titol || entry?.nom || 'Cançó de la biblioteca',
    artist: song?.artista || entry?.artista || '',
    tempo: Math.max(40, Math.min(200, parseInt(est.tempo, 10) || 90)),
    band,
    bars: limited,
    groove,
    brk,
    defaulted,
    truncated: bars.length > limited.length,
  };
}
