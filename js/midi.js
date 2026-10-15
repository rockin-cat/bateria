// Cançons des d'un fitxer MIDI (com al DrumTutor): el joc toca el MIDI sense la bateria (la melodia ben clara)
// i en treu el tempo, els acords de cada compàs i, si en té, les parts (marcadors).
//
// El fitxer es guarda dins de la cançó (base64) i es torna a llegir cada cop. Les notes es col·loquen per temps
// (no per segons): així el control de tempo del joc també alenteix el MIDI.

// ---- Lector de fitxers MIDI estàndard (SMF 0 i 1) ----------------------------------------------------------------
export function parseMidi(buf) {
  const d = new DataView(buf instanceof ArrayBuffer ? buf : buf.buffer);
  let p = 0;
  const str = (n) => { let s = ''; for (let i = 0; i < n; i++) s += String.fromCharCode(d.getUint8(p + i)); return s; };
  if (str(4) !== 'MThd') throw new Error('No és un fitxer MIDI.');
  const hlen = d.getUint32(4);
  const ntrk = d.getUint16(10);
  const div = d.getUint16(12);
  if (div & 0x8000) throw new Error('Aquest MIDI fa servir temps SMPTE: no es pot llegir.');
  p = 8 + hlen;
  const tracks = [];
  for (let t = 0; t < ntrk && p < d.byteLength; t++) {
    const id = str(4);
    const len = d.getUint32(p + 4);
    p += 8;
    const end = p + len;
    if (id !== 'MTrk') { p = end; continue; }
    const tr = { name: '', notes: [], meta: [], programs: [] };
    const open = new Map();
    let tick = 0;
    let run = 0;
    const vlq = () => { let v = 0, b; do { b = d.getUint8(p++); v = (v << 7) | (b & 0x7f); } while (b & 0x80); return v; };
    while (p < end) {
      tick += vlq();
      let st = d.getUint8(p);
      if (st & 0x80) p++; else st = run;
      if (st === 0xff) {
        const type = d.getUint8(p++);
        const l = vlq();
        const bytes = new Uint8Array(d.buffer, d.byteOffset + p, l);
        p += l;
        if (type === 0x51) tr.meta.push({ tick, tempo: (bytes[0] << 16) | (bytes[1] << 8) | bytes[2] });
        else if (type === 0x58) tr.meta.push({ tick, num: bytes[0], den: 2 ** bytes[1] });
        else if (type === 0x03) tr.name ||= new TextDecoder('latin1').decode(bytes).trim();
        else if (type === 0x06 || type === 0x01) tr.meta.push({ tick, text: new TextDecoder('latin1').decode(bytes).trim(), marker: type === 0x06 });
        else if (type === 0x2f) break;
        continue;
      }
      if (st === 0xf0 || st === 0xf7) { p += vlq(); continue; }
      run = st;
      const cmd = st & 0xf0;
      const ch = st & 0x0f;
      const a = d.getUint8(p++);
      const b = cmd === 0xc0 || cmd === 0xd0 ? 0 : d.getUint8(p++);
      if (cmd === 0x90 && b > 0) {
        const k = ch * 128 + a;
        if (open.has(k)) close(k, tick);
        open.set(k, { tick, ch, pitch: a, vel: b });
      } else if (cmd === 0x80 || (cmd === 0x90 && b === 0)) {
        close(ch * 128 + a, tick);
      } else if (cmd === 0xc0) tr.programs.push({ tick, ch, program: a });
    }
    for (const k of [...open.keys()]) close(k, tick);
    function close(k, at) {
      const n = open.get(k);
      if (!n) return;
      open.delete(k);
      tr.notes.push({ ...n, dur: Math.max(1, at - n.tick) });
    }
    tracks.push(tr);
    p = end;
  }
  return { ppq: div, tracks };
}

// ---- De MIDI a cançó del joc ------------------------------------------------------------------------------------------
const NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const isDrumCh = (ch) => ch === 9;
const MELODY_NAME = /(melod|vocal|voice|veu|voz|lead|cant|sing|tema)/i;

function instFor(program, isMelody) {
  if (isMelody) return 'lead';
  if (program >= 32 && program <= 39) return 'baix';
  if (program >= 29 && program <= 31) return 'guitarra_dist';
  if (program >= 24 && program <= 28) return 'acustica';
  return 'rhodes';
}
const GAIN = { lead: 0.2, baix: 0.55, guitarra_dist: 0.14, acustica: 0.18, rhodes: 0.13 };

/**
 * Llegeix el MIDI i en fa la cançó: { tempo, metre, bars: n, chords: ['C', …], parts: [{ name, bar }], melody, events: [[…], …] }
 * `partsText` (opcional): «Intro 4, Estrofa 8, Tornada 8» si el MIDI no porta marcadors.
 */
export function songFromMidi(buf, partsText = '') {
  const m = parseMidi(buf);
  const ppq = m.ppq;
  const meta = m.tracks.flatMap((t) => t.meta).sort((a, b) => a.tick - b.tick);
  const tempoEv = meta.find((e) => e.tempo);
  const tempo = Math.round(60000000 / (tempoEv?.tempo ?? 500000));
  const ts = meta.find((e) => e.num);
  const metre = ts ? `${ts.num}/${ts.den}` : '4/4';
  // Notes amb canal i programa
  const progOf = (ch, tick) => {
    let prog = 0;
    for (const t of m.tracks) for (const pc of t.programs) if (pc.ch === ch && pc.tick <= tick) prog = pc.program;
    return prog;
  };
  const voices = []; // una veu = pista + canal
  m.tracks.forEach((t, ti) => {
    const byCh = new Map();
    for (const n of t.notes) { if (!byCh.has(n.ch)) byCh.set(n.ch, []); byCh.get(n.ch).push(n); }
    for (const [ch, notes] of byCh) voices.push({ key: `${ti}:${ch}`, name: t.name, ch, notes, program: progOf(ch, notes[0]?.tick ?? 0) });
  });
  const tonal = voices.filter((v) => !isDrumCh(v.ch) && v.notes.length);
  if (!tonal.length) throw new Error('Aquest MIDI no té notes (o només té bateria).');
  // La melodia: la veu que es diu «melodia/veu/lead», o la més aguda i gairebé monofònica
  const mono = (v) => {
    const ns = [...v.notes].sort((a, b) => a.tick - b.tick);
    let over = 0;
    for (let i = 1; i < ns.length; i++) if (ns[i].tick < ns[i - 1].tick + ns[i - 1].dur * 0.8) over++;
    return 1 - over / Math.max(1, ns.length);
  };
  const avg = (v) => v.notes.reduce((a, n) => a + n.pitch, 0) / v.notes.length;
  let melody = tonal.find((v) => MELODY_NAME.test(v.name));
  if (!melody) {
    const cands = tonal.filter((v) => !(v.program >= 32 && v.program <= 39) && mono(v) > 0.75 && avg(v) > 57 && v.notes.length > 16);
    melody = cands.sort((a, b) => avg(b) - avg(a))[0] ?? null;
  }
  const barTicks = ppq * 4;
  const lastTick = Math.max(...tonal.flatMap((v) => v.notes.map((n) => n.tick + n.dur)));
  const nBars = Math.max(1, Math.min(160, Math.ceil(lastTick / barTicks - 0.05)));
  const events = Array.from({ length: nBars }, () => []);
  const weights = Array.from({ length: nBars }, () => new Array(12).fill(0));
  const lowest = Array.from({ length: nBars }, () => 999);
  for (const v of tonal) {
    const isMel = v === melody;
    const inst = instFor(v.program, isMel);
    for (const n of v.notes) {
      const bar = Math.floor(n.tick / barTicks);
      if (bar >= nBars) continue;
      const beat = (n.tick - bar * barTicks) / ppq;
      const dur = Math.min(4, n.dur / ppq);
      events[bar].push({ inst, pitch: n.pitch, beat, dur, gain: GAIN[inst] * (0.5 + 0.5 * n.vel / 127) });
      if (!isMel) {
        // acords: pes per durada dins del compàs; el baix compta el doble
        const w = Math.min(dur, 4 - beat) * (inst === 'baix' ? 2 : 1);
        weights[bar][n.pitch % 12] += w;
        if (beat < 2) lowest[bar] = Math.min(lowest[bar], n.pitch);
      }
    }
  }
  const chords = weights.map((w, i) => detectChord(w, lowest[i]) ?? null);
  for (let i = 0; i < chords.length; i++) chords[i] ??= chords[i - 1] ?? 'C';
  // Parts: marcadors del MIDI, o el text, o una sola part
  let parts = meta.filter((e) => e.marker && e.text).map((e) => ({ name: e.text, bar: Math.round(e.tick / barTicks) }));
  if (!parts.length && partsText.trim()) {
    parts = [];
    let bar = 0;
    for (const chunk of partsText.split(/[,;\n]+/)) {
      const mm = /^\s*(.+?)\s+(\d+)\s*$/.exec(chunk);
      if (!mm) continue;
      parts.push({ name: mm[1], bar });
      bar += Number(mm[2]);
    }
  }
  if (!parts.length) parts = autoParts(chords);
  if (!parts.length || parts[0].bar > 0) parts.unshift({ name: parts.length ? 'Intro' : 'Cançó', bar: 0 });
  parts = parts.filter((pt, i) => pt.bar < nBars && (i === 0 || pt.bar > parts[i - 1].bar));
  return { tempo, metre, bars: nBars, chords, parts, melody: melody ? (melody.name || `canal ${melody.ch + 1}`) : null, events };
}

/**
 * Parts automàtiques (quan el MIDI no porta marcadors): es busquen les frases que es repeteixen.
 * Es prova amb frases de 8 i de 4 compassos i amb un desplaçament inicial (una introducció o una anacrusi);
 * guanya la combinació on més frases es repeteixen. Cada frase diferent rep una lletra (A, B, C…),
 * les frases iguals seguides fan una sola part, els compassos d'abans són la Intro i els que sobren, el Final.
 */
export function autoParts(chords) {
  const n = chords.length;
  if (n < 8) return [];
  // Dues frases són «la mateixa» si coincideixen en 3/4 dels compassos (una frase i la seva variant)
  const group = (phr, L) => {
    const reps = [];
    return phr.map((p) => {
      let g = reps.findIndex((r) => r.filter((c, k) => c !== p[k]).length <= Math.floor(L / 4));
      if (g < 0) { reps.push(p); g = reps.length - 1; }
      return g;
    });
  };
  let best = null;
  for (const L of [8, 4]) {
    for (let off = 0; off < Math.min(L, n - L); off++) {
      const phr = [];
      for (let b = off; b + L <= n; b += L) phr.push(chords.slice(b, b + L));
      if (phr.length < 2) continue;
      const g = group(phr, L);
      const size = new Map();
      for (const x of g) size.set(x, (size.get(x) ?? 0) + 1);
      const rep = g.filter((x) => size.get(x) > 1).length / g.length;
      // les frases solen començar amb un canvi d'acord
      const starts = phr.map((_, i) => off + i * L).filter((b) => b > 0);
      const align = starts.length ? starts.filter((b) => chords[b] !== chords[b - 1]).length / starts.length : 0;
      // …i amb l'acord de casa (el primer de la cançó)
      const home = phr.filter((p) => p[0] === chords[0]).length / phr.length;
      const score = rep + align * 0.2 + home * 0.4 - off * 0.01 + (L === 8 ? 0.05 : 0);
      if (!best || score > best.score) best = { score, L, off, g };
    }
  }
  if (!best) return [];
  const parts = [];
  if (best.off > 0) parts.push({ name: 'Intro', bar: 0 });
  // Cada frase és una part (A, B…): així el guió queda en frases i els breaks cauen al final de cada frase
  best.g.forEach((x, i) => {
    const name = String.fromCharCode(65 + Math.min(x, 25));
    const last = parts[parts.length - 1];
    // dues frases curtes iguals seguides fan una part de 8 compassos
    if (best.L === 4 && last && last.name === name && best.off + i * best.L - last.bar < 8) return;
    parts.push({ name, bar: best.off + i * best.L });
  });
  const end = best.off + best.g.length * best.L;
  if (end < n) parts.push({ name: 'Final', bar: end });
  return parts;
}

/** Acord d'un compàs a partir del pes de cada nota (tríades majors i menors). */
function detectChord(w, low) {
  const total = w.reduce((a, b) => a + b, 0);
  if (total < 0.2) return null;
  let best = null;
  for (let r = 0; r < 12; r++) {
    for (const [q, third] of [['', 4], ['m', 3]]) {
      const tones = [r, (r + third) % 12, (r + 7) % 12];
      let sc = w[r] * 1.2 + w[tones[1]] + w[tones[2]] * 0.8;
      for (let k = 0; k < 12; k++) if (!tones.includes(k)) sc -= w[k] * 0.5;
      if (low < 999 && low % 12 === r) sc += total * 0.15;
      if (!best || sc > best.sc) best = { sc, name: NAMES[r] + q };
    }
  }
  return best.name;
}

/** De la cançó MIDI a «[Part] C | G | …», el format de totes les cançons del joc. */
export function progFromMidiSong(ms) {
  const starts = new Map(ms.parts.map((p) => [p.bar, p.name]));
  return ms.chords.map((c, i) => `${starts.has(i) ? `[${starts.get(i)}] ` : ''}${c}`).join(' | ');
}

export const toBase64 = (buf) => {
  const bytes = new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
};
export const fromBase64 = (b64) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)).buffer;

const cache = new Map();
/** Les notes per compàs d'una cançó MIDI guardada (amb memòria cau). */
export function midiEventsOf(raw) {
  if (!raw?.midi) return null;
  if (!cache.has(raw.id)) cache.set(raw.id, songFromMidi(fromBase64(raw.midi), raw.parts ?? '').events);
  return cache.get(raw.id);
}

/** Les notes d'un compàs per al joc. En una marca (nivell 9) només sonen les notes que cauen als cops. */
export function midiBarEvents(events, bar, { stop = false, beats = [0] } = {}) {
  const evs = events[bar] ?? [];
  if (!stop) return evs;
  return evs.filter((e) => beats.some((b) => Math.abs(e.beat - b) < 0.15)).map((e) => ({ ...e, dur: Math.min(e.dur, 0.5) }));
}

