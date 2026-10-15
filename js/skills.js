// «Què sé fer» (la motxilla): el que s'ha desbloquejat al full de ruta i què vol dir quan toques amb la teva banda.
// Com al joc de guitarra i baix.

import { ROUTE } from './route.js';

/** Què pots fer a la banda quan tens un nivell. */
export const BANDA = {
  1: 'Pots portar el ritme de la cançó amb un patró base: la banda té on recolzar-se.',
  2: 'Pots marcar l’inici de cada part amb el crash i el bombo: la banda sap en quin punt de la cançó és.',
  3: 'Pots tocar la mateixa cançó amb patrons diferents perquè cada part soni diferent.',
  4: 'Pots comptar i cantar mentre toques: pots donar l’entrada a la banda o fer cors.',
  5: 'Pots fer breaks per avisar la banda que canvia la part.',
  6: 'Pots obrir el charles per donar més energia a les tornades.',
  7: 'Pots fer variacions perquè la cançó creixi i no sigui sempre igual.',
  8: 'Pots triar el patró i el break que van millor a la cançó del grup: fas l’arranjament de bateria.',
  9: 'Pots fer marques junt amb la banda, on ho demana la melodia o la lletra.',
  10: 'Pots fer un solo quan la banda et deixa un espai, i tornar a entrar a temps.',
};

/** El nivell 1 depèn del pas més avançat que et surt. */
const LEVEL1 = {
  d1a: 'Marques el pols amb el bombo: la banda ja té el cor de la cançó.',
  d1b: 'Fas bombo i caixa: la banda ja sona amb un ritme de veritat.',
  d1c: 'Toques charles, bombo i caixa: portes el ritme de la cançó.',
  d1d: 'Toques el patró base de rock: portes el ritme de tota la cançó.',
};

/**
 * Resum nivell a nivell. `state(id)` → 'ok' | 'gairebe' | null; `rec(id)` → el registre del pas.
 */
export function summary({ state, rec }) {
  return ROUTE.map((L) => {
    const ok = L.passos.filter((p) => state(p.id) === 'ok');
    const almost = L.passos.filter((p) => state(p.id) === 'gairebe');
    let banda = BANDA[L.n];
    if (L.n === 1) banda = ok.length ? LEVEL1[ok[ok.length - 1].id] : '';
    const tempos = ok.map((p) => rec(p.id)?.tempo).filter(Boolean);
    return { level: L, ok, almost, banda, unlocked: ok.length > 0, done: ok.length === L.passos.length, tempo: tempos.length ? Math.max(...tempos) : null };
  });
}
