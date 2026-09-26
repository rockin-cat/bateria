// Què es guarda al navegador: qui juga, les estrelles de cada repte i la
// configuració de la bateria. Si el navegador no deixa guardar (mode privat),
// el joc funciona igual i només s'oblida en tancar.

const KEY = 'rockin.bateria.v1';

const blank = () => ({ players: {}, current: null, settings: { latency: 0, map: {}, mySound: null, metronome: true, lowLatency: true } });

let data = blank();
try {
  const raw = localStorage.getItem(KEY);
  if (raw) data = { ...blank(), ...JSON.parse(raw) };
  data.settings = { ...blank().settings, ...(data.settings ?? {}) };
} catch {
  data = blank();
}

export function save() {
  try { localStorage.setItem(KEY, JSON.stringify(data)); } catch { /* sense lloc on guardar */ }
}

export const settings = () => data.settings;
export const players = () => Object.keys(data.players).sort((a, b) => a.localeCompare(b, 'ca'));
export const currentName = () => data.current;

export function player(name = data.current) {
  if (!name) return null;
  const p = (data.players[name] ??= { missions: {}, supports: {}, poorStreak: {}, bands: {}, created: Date.now() });
  p.missions ??= {}; p.supports ??= {}; p.poorStreak ??= {}; p.bands ??= {}; p.history ??= []; p.styleCards ??= {}; p.tempoBest ??= null;
  return p;
}

export function setCurrent(name) {
  data.current = name;
  player(name);
  save();
}

export function removePlayer(name) {
  delete data.players[name];
  if (data.current === name) data.current = null;
  save();
}

/** Guarda un intent. Torna el registre del repte. */
export function recordAttempt(cardId, { stars, score, tempo }) {
  const p = player();
  if (!p) return null;
  const m = (p.missions[cardId] ??= { stars: 0, score: 0, tempo: 0, attempts: 0, lastTempo: 0 });
  m.attempts++;
  m.lastTempo = tempo;
  if (stars > m.stars || (stars === m.stars && tempo > m.tempo)) { m.stars = stars; m.tempo = tempo; }
  m.score = Math.max(m.score, score);
  save();
  return m;
}

export const mission = (cardId) => player()?.missions[cardId] ?? null;

/** Guarda una avaluació a l'historial del perfil (les 400 últimes). */
export function addHistory(entry) {
  const p = player();
  if (!p) return;
  p.history.push({ t: Date.now(), ...entry });
  if (p.history.length > 400) p.history.splice(0, p.history.length - 400);
  save();
}
