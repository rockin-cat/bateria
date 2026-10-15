// Una sessió de joc: la línia de temps (demostració → compte → toques → final),
// el programador d'àudio i el jutge. Tot va amb el rellotge de l'AudioContext.
//
// Compassos:  0 … D-1  demostració (la bateria del joc toca la carta)
//             D        compte d'entrada (baquetes a cada temps)
//             D+1 …    toques tu (la banda continua, la bateria calla)
//             darrer   final (acord llarg)

import { audioContext, drum, click, tone, stopAll, heardTime, busGain } from './audio.js';
import { barEvents } from './band.js';
import { barNotes, PIECES } from './cards.js';
import { createJudge } from './judge.js';
import { metre, bandForMetre } from './metre.js';

const LOOKAHEAD = 0.25; // s d'àudio programats per endavant
const VISUAL_AHEAD = 3; // compassos generats per endavant per a la pista

/**
 * cfg: {
 *   tempo, band, demoBars, playBars (Infinity = lliure),
 *   playBar(j) -> { card (null = solo), chord, part?, stop? },  demoBar(j): el mateix per a la demostració,   // què toca el compàs j de la part «toques tu»
 *   countBar: { card, chord },   // el compàs d'entrada (l'últim de la frase: si és un break, el toca el joc)
 *   endChord,
 *   metronome: bool, quiet: bool (compte silenciós), demoInPlay: bool (la bateria del joc també sona mentre toques)
 * }
 */
export function createSession(cfg, hooks = {}) {
  const ctx = audioContext();
  const M = metre(); // la mètrica (pulsos per compàs i subdivisió)
  const bpb = M.bpb;
  const spb = 60 / cfg.tempo;
  const barDur = bpb * spb;
  const D = cfg.demoBars ?? 0;
  const P = cfg.playBars ?? 8;
  const t0 = ctx.currentTime + 0.35;
  const judge = createJudge();
  const bars = []; // generades
  let scheduledUpTo = -1;
  let timer = null;
  let raf = null;
  let finished = false;
  let stopBarIndex = D + 1 + P; // compàs final

  const barStart = (i) => t0 + i * barDur;

  function info(i) {
    if (i < D) return { kind: 'demo', j: i, ...(cfg.demoBar ?? cfg.playBar)(i) };
    if (i === D) {
      const cb = cfg.countBar ?? { card: cfg.playBar(0).card, chord: cfg.playBar(0).chord };
      return { kind: 'count', j: -1, card: cb.card, chord: cb.chord, songBar: cb.songBar, role: cb.role, pickup: cb.pickup, stop: cb.stop, entryBreak: !!cb.card?.brk };
    }
    if (i < stopBarIndex) {
      const j = i - D - 1;
      const pb = cfg.playBar(j);
      const quiet = pb.quiet ?? (cfg.quiet && j % 4 >= 2);
      return { kind: 'play', j, ...pb, quiet };
    }
    if (i === stopBarIndex) return { kind: 'end', j: -1, chord: cfg.endChord ?? cfg.playBar(0).chord };
    return null;
  }

  // Genera un compàs: notes (per a la pista i el jutge) i esdeveniments d'àudio.
  function generate(i) {
    if (bars[i]) return bars[i];
    const b = info(i);
    if (!b) return null;
    const start = barStart(i);
    b.index = i;
    b.start = start;
    b.notes = [];
    if (b.card && (b.kind === 'demo' || b.kind === 'play' || (b.kind === 'count' && b.entryBreak))) {
      const list = barNotes(b.card).filter((n) => n.beat < bpb - 1e-6);
      for (const n of list) {
        const note = { piece: n.piece, step: n.step, beat: n.beat, time: start + n.beat * spb, kind: b.kind === 'count' ? 'demo' : b.kind, card: b.card, bar: b.j };
        if (b.kind === 'play' && PIECES[n.piece].cls !== 'pedal') {
          note.win = windowFor(b.card, n, spb, bpb);
          note.exp = judge.add({ piece: n.piece, time: note.time, win: note.win, bar: b.j, step: n.step, card: b.card.id });
        }
        b.notes.push(note);
      }
    }
    bars[i] = b;
    return b;
  }

  function scheduleAudio(i) {
    const b = generate(i);
    if (!b) return;
    const start = b.start;
    // Banda
    const kind = b.kind === 'end' ? 'end' : b.stop ? 'stop' : 'play';
    const beats = b.stop && b.card ? [...new Set((b.card.notes.crash ?? [0]).map((st) => st / (b.card.grid / 4)))] : undefined;
    // Cançó d'un MIDI: sona el MIDI (sense la bateria) en lloc de la banda generada
    const midiEvs = cfg.midiBar && b.songBar != null && b.kind !== 'end' && !(b.kind === 'play' && b.quiet) ? cfg.midiBar(b.songBar, { stop: b.stop, beats }) : null;
    if (midiEvs) {
      for (const e of midiEvs) tone(e.inst, e.pitch, start + e.beat * spb, e.dur * spb, { gain: e.gain });
    } else if (!(b.kind === 'play' && b.quiet)) {
      for (const e of bandForMetre(barEvents(cfg.band, b.chord, kind, { beats, role: b.role, pickup: b.pickup && !b.stop }), M)) {
        const t = start + e.beat * spb;
        const dur = e.dur * spb;
        e.notes.forEach((m, k) => {
          const off = e.strum ? Math.abs(e.strum) * k : 0;
          tone(e.inst, m, t + off, dur - off, { gain: e.gain * (1 - k * 0.04) });
        });
      }
    }
    // Bateria del joc
    const drumsOn = b.kind === 'demo' || (b.kind === 'count' && b.entryBreak) || (b.kind === 'play' && cfg.demoInPlay);
    if (drumsOn) {
      for (const n of b.notes) drum(n.piece, n.time, { vel: PIECES[n.piece].ghost ? 0.5 : 1 });
    }
    if (b.kind === 'end') {
      drum('crash', start); drum('kk', start);
    }
    // Compte i metrònom
    if (b.kind === 'count' && !b.entryBreak) {
      for (let k = 0; k < bpb; k++) drum('stick', start + k * spb, { vel: k === 0 ? 1 : 0.8 });
    }
    if (b.kind === 'play' && cfg.metronome && !b.quiet) {
      for (let k = 0; k < bpb; k++) click(start + k * spb, k === 0);
    }
  }

  function pump() {
    const now = ctx.currentTime;
    while (true) {
      const next = scheduledUpTo + 1;
      if (next > stopBarIndex) break;
      if (barStart(next) > now + LOOKAHEAD) break;
      scheduleAudio(next);
      scheduledUpTo = next;
    }
    // Generar compassos per a la pista per endavant
    const heard = heardTime();
    const cur = Math.floor((heard - t0) / barDur);
    for (let i = Math.max(0, cur); i <= Math.min(stopBarIndex, cur + VISUAL_AHEAD); i++) generate(i);
    // Rodones que ja han passat
    for (const e of judge.tick(heard)) hooks.onMiss?.(e);
    if (!finished && heard > barStart(stopBarIndex) + 0.2) {
      finished = true;
      hooks.onFinish?.(judge.summary());
    }
    if (heard > barStart(stopBarIndex + 1) + 0.5) stopTimers();
  }

  function stopTimers() {
    clearInterval(timer);
    timer = null;
    cancelAnimationFrame(raf);
  }

  /** Posició actual (el que se sent ara): { bar, beat, info } */
  function position(perf = performance.now()) {
    const heard = heardTime(perf);
    const x = (heard - t0) / barDur;
    const bar = Math.floor(x);
    return { heard, bar, beat: (x - bar) * bpb, info: bar >= 0 ? generate(bar) : null, x };
  }

  /** Un cop de l'alumnat (perf = timeStamp de l'esdeveniment). */
  function hit(piece, perf, vel) {
    const t = heardTime(perf);
    const pos = (t - t0) / barDur;
    // Només es jutja durant «toques tu» (més un marge al voltant).
    if (pos < D + 1 - 0.1 || pos > stopBarIndex + 0.05) return { kind: 'free', piece, time: t };
    const r = judge.hit(piece, t, vel);
    if (r) r.time = t;
    return r;
  }

  const api = {
    t0, spb, barDur, D, judge, bars, bpb, div: M.div,
    get stopBar() { return stopBarIndex; },
    barStart, position, hit, generate,
    start() {
      busGain('band')?.setValueAtTime(0.85, ctx.currentTime);
      pump();
      timer = setInterval(pump, 25);
    },
    /** Acaba al final del compàs següent (mode lliure: «Prou, ja he acabat»). */
    finishSoon() {
      const cur = Math.floor((heardTime() - t0) / barDur);
      stopBarIndex = Math.max(D + 2, Math.min(stopBarIndex, cur + 1));
      // Els compassos ja generats després del final no es jutgen
      for (const e of judge.expected) if (e.status === 'pending' && e.time >= barStart(stopBarIndex)) e.status = 'skip';
      for (let i = stopBarIndex; i < bars.length; i++) delete bars[i];
      scheduledUpTo = Math.min(scheduledUpTo, stopBarIndex - 1);
    },
    stop() {
      stopTimers();
      stopAll();
      finished = true;
    },
    get finished() { return finished; },
  };
  return api;
}

/** Finestra de temps d'una rodona: el 45 % de la distància a la rodona veïna de la mateixa classe. */
function windowFor(card, n, spb, bpb = 4) {
  const cls = PIECES[n.piece].cls;
  const beats = [];
  for (const [p, steps] of Object.entries(card.notes)) if (PIECES[p].cls === cls) for (const s of steps) beats.push(s / (card.grid / 4));
  let gap = 4;
  for (const b of beats) {
    if (Math.abs(b - n.beat) < 1e-6) continue;
    const d = Math.min(Math.abs(b - n.beat), bpb - Math.abs(b - n.beat));
    gap = Math.min(gap, d);
  }
  return Math.max(0.06, Math.min(0.13, 0.45 * gap * spb));
}
