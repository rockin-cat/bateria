// Entrada: bateria electrònica per MIDI (Web MIDI), tecles de l'ordinador i
// clics sobre la bateria dibuixada. Tot acaba en onHit({ piece, vel, perf, note, source }),
// amb `perf` al rellotge de performance.now() (el mateix que fan servir les notes MIDI).

// Notes General MIDI i les que envien els mòduls Roland V-Drums (vores, campanes…).
export const DEFAULT_MAP = {
  35: 'kk', 36: 'kk',
  38: 'sn', 40: 'sn', 37: 'sn', 39: 'sn',
  42: 'hh', 22: 'hh', 46: 'oh', 26: 'oh', 44: 'pedal', 21: 'pedal',
  49: 'crash', 55: 'crash', 57: 'crash', 52: 'crash',
  51: 'ride', 59: 'ride', 53: 'ride',
  48: 't1', 50: 't1',
  45: 't2', 47: 't2',
  43: 't3', 58: 't3', 41: 't3',
};

export const KEY_MAP = {
  ' ': 'kk', b: 'kk',
  f: 'sn', d: 'sn',
  j: 'hh', k: 'oh',
  l: 'ride', u: 'crash', i: 'crash',
  r: 't1', t: 't2', y: 't3',
};
export const KEY_LABEL = { kk: 'Espai', sn: 'F', hh: 'J · K obert', oh: 'K', ride: 'L', crash: 'U', t1: 'R', t2: 'T', t3: 'Y' };

export function createInput({ onHit, onDevices, getCustomMap, keysOn = () => true }) {
  let learner = null; // quan s'aprèn la bateria, el següent cop va aquí
  let access = null;
  const state = { devices: [], supported: !!navigator.requestMIDIAccess, error: null, lastNote: null };

  const mapNote = (note) => getCustomMap?.()[note] ?? DEFAULT_MAP[note] ?? null;

  function emit(msg) {
    if (learner) {
      const l = learner;
      learner = null;
      l(msg);
      return;
    }
    onHit(msg);
  }

  async function connect() {
    if (!state.supported) {
      state.error = 'Aquest navegador no pot llegir la bateria (Web MIDI). Fes servir Chrome o Edge.';
      onDevices?.(state);
      return state;
    }
    const waiting = setTimeout(() => { if (!access) { state.error = 'Esperant permís per fer servir la bateria (MIDI)…'; onDevices?.(state); } }, 2500);
    try {
      access = await navigator.requestMIDIAccess({ sysex: false });
      clearTimeout(waiting);
    } catch (e) {
      clearTimeout(waiting);
      state.error = 'El navegador no ha donat permís per llegir la bateria. Es pot jugar amb el teclat.';
      onDevices?.(state);
      return state;
    }
    const bind = () => {
      state.devices = [];
      for (const input of access.inputs.values()) {
        state.devices.push(input.name);
        input.onmidimessage = (ev) => {
          const [status, note, vel = 0] = ev.data;
          const cmd = status & 0xf0;
          if (cmd !== 0x90 || vel === 0) return;
          state.lastNote = note;
          const piece = mapNote(note);
          emit({ piece, note, vel: vel / 127, perf: ev.timeStamp || performance.now(), source: 'midi', device: input.name });
        };
      }
      state.error = null;
      onDevices?.(state);
    };
    access.onstatechange = (e) => { if (e.port.type === 'input') bind(); };
    bind();
    return state;
  }

  // Tecles de l'ordinador
  const held = new Set();
  window.addEventListener('keydown', (ev) => {
    if (ev.metaKey || ev.ctrlKey || ev.altKey) return;
    if (ev.target.closest?.('input[type="text"], input[type="number"], textarea, select')) return;
    const key = ev.key.toLowerCase();
    const piece = KEY_MAP[key];
    if (!piece || !keysOn()) return;
    ev.preventDefault();
    if (ev.repeat || held.has(key)) return;
    held.add(key);
    emit({ piece, note: null, vel: ev.shiftKey ? 0.4 : 0.85, perf: ev.timeStamp || performance.now(), source: 'teclat' });
  });
  window.addEventListener('keyup', (ev) => held.delete(ev.key.toLowerCase()));

  return {
    state,
    connect,
    /** Clic sobre un pad dibuixat. */
    tap(piece, perf = performance.now()) {
      emit({ piece, note: null, vel: 0.85, perf, source: 'clic' });
    },
    /** El següent cop es lliura a `fn` en lloc del joc (per aprendre quina nota envia cada pad). */
    learnNext(fn) { learner = fn; },
    cancelLearn() { learner = null; },
    mapNote,
  };
}
