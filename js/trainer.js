// Entrenador de tempo: la banda toca 4 compassos i calla uns quants. Si en
// tornar la banda encara vas a temps, el silenci següent és més llarg.
// Dues fallades seguides amb el mateix silenci acaben la partida.
//
// El pla es va construint a mesura que la sessió demana compassos (ho fa uns
// 3 compassos per endavant). Com que entre silenci i silenci hi ha 4 compassos
// amb banda, sempre hi ha temps d'avaluar el silenci abans de decidir el següent.

export const LENS = [1, 2, 3, 4, 6, 8, 12, 16];
const ON = 4;

export function createTrainer() {
  const segs = []; // { start, len, quiet, done, pass, rate, drift }
  let idx = 0;
  let fails = 0;
  let record = 0;
  let over = false;
  let session = null;
  const T = {
    message: null,
    get record() { return record; },
    get over() { return over; },
    get rounds() { return segs.filter((g) => g.quiet && g.done); },
    get nextLen() { return LENS[idx]; },

    quietAt(j) {
      while (!segs.length || segs[segs.length - 1].start + segs[segs.length - 1].len <= j) {
        const last = segs[segs.length - 1];
        if (!last) segs.push({ start: 0, len: ON, quiet: false });
        else if (last.quiet || over) segs.push({ start: last.start + last.len, len: ON, quiet: false });
        else {
          // abans de decidir el silenci, avalua l'anterior (si encara no s'ha fet)
          const prev = [...segs].reverse().find((g) => g.quiet && !g.done);
          if (prev && session) evaluate(prev);
          segs.push({ start: last.start + last.len, len: over ? ON : LENS[idx], quiet: !over });
        }
      }
      const g = segs.find((x) => j >= x.start && j < x.start + x.len);
      return !!g?.quiet;
    },

    /** Es crida a cada fotograma: avalua els silencis que ja han acabat. */
    check(s, pos) {
      session = s;
      for (const g of segs) {
        if (!g.quiet || g.done) continue;
        const endBar = s.D + 1 + g.start + g.len; // índex de compàs a la línia de temps
        if (pos.x > endBar + 0.3) evaluate(g);
      }
    },
  };

  function evaluate(g) {
    const s = session;
    g.done = true;
    const exps = s.judge.expected.filter((e) => e.bar >= g.start && e.bar < g.start + g.len && e.status !== 'pending' && e.status !== 'skip');
    const ok = exps.filter((e) => ['perfect', 'good', 'near'].includes(e.status)).length;
    g.rate = exps.length ? ok / exps.length : 0;
    const last = exps.filter((e) => e.bar === g.start + g.len - 1 && e.dt != null);
    g.drift = last.length ? (last.reduce((a, e) => a + e.dt, 0) / last.length) * 1000 : null;
    const tol = Math.max(60, 0.12 * s.spb * 1000);
    g.pass = g.rate >= 0.6 && g.drift != null && Math.abs(g.drift) <= tol;
    const where = g.drift == null ? '' : Math.abs(g.drift) < 20 ? ' i has tornat clavat' : ` i has tornat ${Math.round(Math.abs(g.drift))} ms ${g.drift < 0 ? 'avançat' : 'endarrerit'}`;
    const bars = (n) => `${n} ${n === 1 ? 'compàs' : 'compassos'}`;
    if (g.pass) {
      record = Math.max(record, g.len);
      fails = 0;
      idx = Math.min(idx + 1, LENS.length - 1);
      T.message = `<b>✓ Aguantat ${bars(g.len)}</b>${where}. El proper silenci: ${bars(LENS[idx])}.`;
    } else {
      fails++;
      if (fails >= 2) {
        over = true;
        T.message = `<b>T’has despistat</b> (${Math.round(g.rate * 100)} % dels cops al lloc${where}). Fins aquí!`;
        s.finishSoon();
      } else {
        T.message = `<b>Gairebé!</b> ${Math.round(g.rate * 100)} % dels cops al lloc${where}. Tornem a provar ${bars(g.len)}.`;
      }
    }
  }

  return T;
}
