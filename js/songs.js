// La cançó amb què treballes: sempre s'aprèn a partir d'una cançó (com al joc de guitarra i baix).
//
// Fonts:
//  · el Llibre ROCKIN obert (data/llibre-obert.js: còpia de la biblioteca del Generador, sense codi)
//  · la biblioteca compartida del Generador (amb el codi del professorat)
//  · una cançó escrita a mà: «[Estrofa] Am | F | C | G | [Tornada] C | G | Am | F»
//
// Es guarda com { id, titol, artista, prog, metre, tempo, estil, font, groove? } i es converteix
// en { title, artist, tempo, songTempo, band, metre, bars: [{ chord, sym, part, partStart, partEnd }] }.

import { LLIBRE_OBERT } from '../data/llibre-obert.js';
import { chordFromSymbol } from './band.js';
import { drawnCard } from './cards.js';

export const BOOK = LLIBRE_OBERT;

/** «[A] C | G | Am | F | [B] …» → [{ sym, part }] */
export function parseProg(prog) {
  const out = [];
  let part = '';
  for (const raw of String(prog ?? '').split('|')) {
    let chunk = raw.trim();
    const m = /^\[([^\]]+)\]\s*(.*)$/.exec(chunk);
    if (m) { part = m[1].trim(); chunk = m[2].trim(); }
    if (!chunk) continue;
    const sym = chunk.split(/\s+/)[0];
    out.push({ sym, part });
  }
  return out;
}

const PART_NAMES = { A: 'Estrofa', B: 'Tornada' };
export const partLabel = (p) => {
  const t = String(p ?? '').trim();
  if (!t) return '';
  return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
};

/** Estil de la cançó → banda del joc de bateria. */
const BAND_OF = { reggae: 'reggae', pop: 'pop', rumba: 'rumba', balada: 'pop', rock: 'rock', reggaeton: 'reggaeton', funk: 'funk', shuffle: 'shuffle', ska: 'festa', punk: 'punk', disco: 'disco', cumbia: 'cumbia', bossa: 'bossa', swing: 'swing', hiphop: 'hiphop', trap: 'trap', metal: 'metal' };

export function canPlay(raw) {
  return raw && (raw.metre === '4/4' || raw.metre === '2/4' || !raw.metre) && parseProg(raw.prog).length > 0;
}

/** Converteix la cançó guardada al format que fa servir el joc. */
export function toSpec(raw) {
  const items = parseProg(raw.prog);
  const bars = [];
  items.forEach((it, i) => {
    const chord = chordFromSymbol(it.sym) ?? chordFromSymbol('C');
    const prev = items[i - 1];
    const next = items[i + 1];
    const partStart = i === 0 || (it.part && prev?.part !== it.part) || (it.part && raw.prog && isMarkerAt(raw.prog, i));
    bars.push({ chord, sym: it.sym, part: it.part, partStart, partEnd: false });
    void next;
  });
  // fi de part: el compàs abans d'un inici de part (i el darrer)
  for (let i = 0; i < bars.length; i++) bars[i].partEnd = i === bars.length - 1 || bars[i + 1].partStart;
  // Tempos molt ràpids (200 al Generador) solen ser comptats a la meitat per a la bateria
  const t = Number(raw.tempo) || 90;
  const songTempo = t > 150 ? Math.round(t / 2) : t;
  return {
    id: raw.id,
    title: raw.titol,
    artist: raw.artista ?? '',
    tempo: songTempo,
    songTempo,
    band: BAND_OF[raw.estil] ?? 'pop',
    metre: raw.metre ?? '4/4',
    bars: bars.slice(0, 96),
    groove: raw.groove ? drawnCard(raw.groove) : null,
  };
}

/** Si al text hi ha una marca [Part] just davant del compàs i (així dues parts seguides amb el mateix nom es distingeixen). */
function isMarkerAt(prog, index) {
  let k = 0;
  for (const raw of String(prog).split('|')) {
    const chunk = raw.trim();
    const m = /^\[([^\]]+)\]\s*(.*)$/.exec(chunk);
    const has = m ? m[2].trim() : chunk;
    if (!has) continue;
    if (k === index) return !!m;
    k++;
  }
  return false;
}

/** Les parts de la cançó, per mostrar l'estructura: [{ name, bars: ['C','G',…] }] */
export function structure(raw) {
  const out = [];
  for (const it of parseProg(raw.prog)) {
    const last = out[out.length - 1];
    if (!last || last.name !== it.part) out.push({ name: it.part, bars: [it.sym] });
    else last.bars.push(it.sym);
  }
  return out;
}

/** Una cançó de la biblioteca (ja convertida per library.js) → format guardat. */
export function rawFromLibrarySpec(spec, entry, metre = '4/4') {
  let prog = '';
  let lastPart = null;
  const chunks = [];
  for (const b of spec.bars) {
    const name = b.part || 'A';
    const mark = b.partStart || name !== lastPart ? `[${name}] ` : '';
    chunks.push(`${mark}${b.chord.name.replace('♭', 'b')}`);
    lastPart = name;
  }
  prog = chunks.join(' | ');
  const g = spec.groove && !spec.defaulted ? { id: spec.groove.id, num: spec.groove.num || 'C', title: spec.groove.title || 'Patró de la cançó', notes: spec.groove.notes, grid: spec.groove.grid } : null;
  return { id: `biblio:${entry?.id}`, titol: spec.title, artista: spec.artist, prog, metre, tempo: spec.tempo, estil: Object.entries(BAND_OF).find(([, v]) => v === spec.band)?.[0] ?? 'pop', font: 'biblioteca', groove: g };
}

/** Una cançó escrita a mà. */
export function customSong({ titol, prog, tempo, estil }) {
  return { id: `meva:${Date.now()}`, titol: titol || 'La meva cançó', artista: '', prog, metre: '4/4', tempo: Number(tempo) || 90, estil: estil || 'pop', font: 'meva' };
}
export { PART_NAMES };
