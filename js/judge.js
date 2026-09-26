// El jutge: compara cada cop de l'alumnat amb les rodones de la carta.
//
// Cada rodona esperada té la seva finestra de temps (el 45 % de la distància
// fins a la rodona veïna de la mateixa peça, entre 60 i 130 ms). Un cop dins la
// finestra:
//   perfect  a menys de 35 ms          good   més lluny però dins (aviat / tard)
//   near     peça semblant (charles en lloc de ride, un tom per un altre)
// Fora de tota finestra de la mateixa peça:
//   wrong    hi havia una altra peça en aquell moment («tocava el bombo»)
//   extra    no hi havia res («cop de més»)
// I quan una rodona passa sense cop: missed.

import { PIECES, CLS_NAME } from './cards.js';

const PERFECT = 0.035;
const CYMBALS = new Set(['hh', 'oh', 'ride', 'crash']);
const TOMS = new Set(['t1', 't2', 't3']);
const isNear = (a, b) => (CYMBALS.has(a) && CYMBALS.has(b)) || (TOMS.has(a) && TOMS.has(b));
const FLAM = 0.035; // dos senyals del mateix pad tan junts són un sol cop (doble disparador)

export function createJudge() {
  const expected = []; // { id, piece, cls, time, win, bar, step, card, ghost, status, dt, got }
  const hits = []; // cops de l'alumnat { piece, cls, time, vel, kind, dt }
  const lastByCls = new Map();
  let nextId = 0;

  function add(note) {
    const e = { id: nextId++, status: 'pending', ...note, cls: PIECES[note.piece].cls, ghost: !!PIECES[note.piece].ghost };
    expected.push(e);
    return e;
  }

  /** Un cop. `time` en temps d'àudio «sentit». Torna el veredicte. */
  function hit(piece, time, vel = 1) {
    const cls = PIECES[piece]?.cls;
    if (!cls || cls === 'pedal') return null;
    const last = lastByCls.get(cls);
    if (last != null && time - last < FLAM) return null;
    lastByCls.set(cls, time);

    let best = null;
    let near = null;
    let other = null;
    for (const e of expected) {
      if (e.status !== 'pending') continue;
      const dt = time - e.time;
      if (Math.abs(dt) > e.win) continue;
      if (e.cls === cls) {
        if (!best || Math.abs(dt) < Math.abs(best.dt)) best = { e, dt };
      } else if (isNear(e.cls, cls)) {
        if (!near || Math.abs(dt) < Math.abs(near.dt)) near = { e, dt };
      } else if (!other || Math.abs(dt) < Math.abs(other.dt)) other = { e, dt };
    }
    let result;
    if (best) {
      const { e, dt } = best;
      e.status = Math.abs(dt) <= PERFECT ? 'perfect' : 'good';
      e.dt = dt;
      e.loud = e.ghost && vel > 0.8;
      result = { kind: e.status, dt, exp: e, piece };
    } else if (near) {
      const { e, dt } = near;
      e.status = 'near';
      e.dt = dt;
      e.got = cls;
      result = { kind: 'near', dt, exp: e, piece };
    } else if (other) {
      other.e.wrongWith = cls;
      result = { kind: 'wrong', dt: other.dt, exp: other.e, piece };
    } else {
      result = { kind: 'extra', piece };
    }
    hits.push({ piece, cls, time, vel, kind: result.kind, dt: result.dt ?? null, bar: result.exp?.bar ?? null });
    return result;
  }

  /** Marca com a perdudes les rodones que ja han passat. Torna les noves. */
  function tick(now) {
    const out = [];
    for (const e of expected) {
      if (e.status === 'pending' && now > e.time + e.win) {
        e.status = 'missed';
        out.push(e);
      }
    }
    return out;
  }

  function summary() {
    const done = expected.filter((e) => e.status !== 'pending' && e.status !== 'skip');
    const n = done.length || 1;
    const count = (s) => done.filter((e) => e.status === s).length;
    const perfect = count('perfect');
    const good = count('good');
    const near = count('near');
    const missed = count('missed');
    const extras = hits.filter((h) => h.kind === 'extra').length;
    const wrongCount = hits.filter((h) => h.kind === 'wrong').length;
    // Una peça equivocada ja deixa la rodona sense tocar: només resta una mica més.
    const score = Math.max(0, Math.min(1, (perfect + 0.85 * good + 0.5 * near - 0.5 * extras - 0.2 * wrongCount) / n));
    const stars = score >= 0.9 ? 3 : score >= 0.75 ? 2 : score >= 0.55 ? 1 : 0;

    // Per peça
    const byCls = {};
    for (const e of done) {
      const s = (byCls[e.cls] ??= { total: 0, ok: 0 });
      s.total++;
      if (e.status === 'perfect' || e.status === 'good') s.ok++;
      else if (e.status === 'near') s.ok += 0.5;
    }
    // Compassos nets
    const bars = new Map();
    for (const e of done) {
      const b = bars.get(e.bar) ?? { ok: true };
      if (!['perfect', 'good'].includes(e.status)) b.ok = false;
      bars.set(e.bar, b);
    }
    for (const h of hits) if ((h.kind === 'extra' || h.kind === 'wrong') && bars.has(h.bar)) bars.get(h.bar).ok = false;
    const cleanBars = [...bars.values()].filter((b) => b.ok).length;

    // Control del temps
    const dts = done.filter((e) => e.dt != null).map((e) => e.dt * 1000);
    const mean = dts.length ? dts.reduce((a, b) => a + b, 0) / dts.length : 0;
    const sd = dts.length > 1 ? Math.sqrt(dts.reduce((a, b) => a + (b - mean) ** 2, 0) / (dts.length - 1)) : 0;
    const loud = done.filter((e) => e.loud).length;
    const ghosts = done.filter((e) => e.ghost).length;

    // Peça que més costa
    let worst = null;
    for (const [cls, s] of Object.entries(byCls)) {
      const r = s.ok / s.total;
      if (r < 0.75 && (!worst || r < worst.r)) worst = { cls, r };
    }
    const wrongs = hits.filter((h) => h.kind === 'wrong');

    return {
      total: done.length, perfect, good, near, missed, extras, score, stars,
      byCls, cleanBars, bars: bars.size, meanMs: mean, sdMs: sd, dts, loud, ghosts, worst, wrongs: wrongs.length,
      tips: tips({ mean, sd, missed, extras, worst, loud, ghosts, wrongs, n: done.length, dts }),
    };
  }

  return { add, hit, tick, summary, expected, hits };
}

function tips({ mean, sd, missed, extras, worst, loud, ghosts, wrongs, n, dts }) {
  const out = [];
  if (dts.length >= 6) {
    if (mean < -22) out.push('Vas una mica avançat: escolta el baix i deixa que el cop caigui amb ell.');
    else if (mean > 22) out.push('Vas una mica endarrerit: prepara el cop abans, el braç ja ha d’estar a dalt.');
    else if (sd < 18) out.push('El temps és molt regular. Molt bé!');
  }
  if (worst) out.push(`El que més costa és ${CLS_NAME[worst.cls]}: fixa-t’hi a la carta abans de tornar-hi.`);
  if (wrongs.length >= 2) {
    const c = new Map();
    for (const w of wrongs) c.set(w.cls, (c.get(w.cls) ?? 0) + 1);
    const [cls] = [...c.entries()].sort((a, b) => b[1] - a[1])[0];
    out.push(`De vegades toques ${CLS_NAME[cls]} quan tocava una altra peça.`);
  }
  if (extras > Math.max(2, n * 0.15)) out.push('Hi ha cops de més: toca només les rodones de la carta.');
  if (ghosts && loud > ghosts / 2) out.push('Les notes fantasma (rodones petites) han de ser molt fluixes: gairebé acariciar la caixa.');
  if (missed > n * 0.3) out.push('Moltes rodones han passat sense cop: prova-ho més a poc a poc.');
  return out;
}
