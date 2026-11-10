// Connecta el joc de bateria amb la classe del portal Rockin: el docent veu el full de ruta i el temps de pràctica.
import { connectaClasse } from '/classe/classe.js';
import * as store from './store.js';
import { ROUTE } from './route.js';
import { BANDA } from './skills.js';
import { card, cardLabel } from './cards.js';

// Com al joc: 3 estrelles «Ja ho tens!», 2 «A prop» (el pas ja compta com a fet), menys «En procés»
const veu = (pas, r) => !pas.voice || r.voiceOk;

function resum() {
  const p = store.player();
  if (!p) return null;
  const route = p.route ?? {};
  let fet = 0, total = 0, intents = 0, darrer = 0;
  const costa = [];
  const blocs = ROUTE.map((L) => {
    const items = L.passos.map((pas) => {
      const r = route[pas.id];
      total++;
      if (r) { intents += r.attempts ?? 0; darrer = Math.max(darrer, r.last ?? 0); }
      const e = !r?.attempts ? null : r.stars >= 3 && veu(pas, r) ? 'ok' : r.stars >= 2 && veu(pas, r) ? 'gairebe' : 'no';
      if (e === 'ok' || e === 'gairebe') fet++;
      if (r && r.attempts >= 3 && e !== 'ok') costa.push(`${pas.titol} (${r.attempts} intents)`);
      return { t: pas.titol, e, n: r?.attempts ?? 0, tempo: r?.tempo || null };
    });
    const fets = items.filter((x) => x.e === 'ok' || x.e === 'gairebe').length;
    return { titol: `Nivell ${L.n} · ${L.titol}`, fet: items.filter((x) => x.e === 'ok' || x.e === 'gairebe').length, total: items.length, banda: fets ? BANDA[L.n] : null, items };
  });
  const nivell = blocs.reduce((m, b, i) => (b.fet ? i + 1 : m), 0);
  // les cartes de patrons fetes fora del full de ruta
  const cartes = Object.entries(p.missions ?? {}).filter(([, m]) => m.stars >= 3).map(([id]) => { const c = card(id); return c ? cardLabel(c) : id; });
  for (const m of Object.values(p.missions ?? {})) intents += m.attempts ?? 0;
  for (const h of p.history ?? []) darrer = Math.max(darrer, h.t ?? 0);
  return { v: 1, app: 'bateria', titol: 'Full de ruta de bateria', fet, total, nivell, intents, darrer: darrer || null, costa: costa.slice(0, 5),
           extra: cartes.length ? `Cartes de patrons amb «Ja ho tens!»: ${cartes.length}` : null, blocs };
}

connectaClasse({
  app: 'bateria',
  perfil: () => { const n = store.currentName(); return n ? { id: n, nom: n } : null; },
  resum,
  lloc: { bottom: '46px' },   // per sobre del peu amb les dreceres de teclat
});
