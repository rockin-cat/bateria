// «? Ajuda»: el mateix botó i el mateix tauler a totes les eines Rockin (teclat, bateria, guitarra i baix).
// A dalt, com està ara mateix l'ordinador (permís, instrument, so); a sota, les preguntes de sempre, amb símbols.

// Les tecles de cada eina (el que surt a «⌨️ Amb el teclat de l'ordinador»)
const KEYS = {
  teclat: [['Espai', 'Següent / comença'], ['Esc', 'enrere'], ['1 2 3 4', 'els quatre botons grans del resultat'], ['F', 'pantalla completa'],
    ['A W S E D F T G Y H U J K', 'les tecles del piano (amb «Tocar amb l\'ordinador» a ⚙ Com toco; A = Do)'], ['Z X', 'una octava avall / amunt']],
  bateria: [['↑↓←→', 'moure\'t pels botons'], ['Enter', 'tria / comença'], ['Esc', 'enrere'], ['1 2 3 4', 'els quatre botons grans del resultat'],
    ['Espai F J', 'bombo, caixa i charles (sense bateria)'], ['O', 'opcions']],
  guitarra: [['Espai', 'toca / pausa'], ['Esc', 'enrere'], ['1 2 3 4', 'els quatre botons grans del resultat'], ['Tab', 'moure\'t pels botons']],
};

const WORDS = {
  teclat: { inst: 'el teclat', Inst: 'El teclat', icon: '🎹', mine: '«Sentir les meves notes» (a ⚙ Com toco)' },
  bateria: { inst: 'la bateria', Inst: 'La bateria', icon: '🥁', mine: '«Sentir els meus cops» (a dalt)' },
  guitarra: { inst: 'la guitarra', Inst: 'La guitarra', icon: '🎸', mine: '«So d\'ampli» (a 🔌 Connecta la guitarra)' },
};

const STYLE = `
.rk-help-btn { position: fixed; right: 14px; bottom: 14px; z-index: 9000; display: inline-flex; align-items: center; gap: 6px; padding: 10px 16px;
  border-radius: 999px; border: 0; background: #1d1d1f; color: #fff; font: 700 15px system-ui, sans-serif; cursor: pointer; box-shadow: 0 6px 18px rgb(0 0 0 / 25%); }
.rk-help-btn b { display: inline-grid; place-items: center; width: 22px; height: 22px; border-radius: 50%; background: #ffd23f; color: #1d1d1f; }
body.is-playing .rk-help-btn, body.rk-help-hide .rk-help-btn { opacity: .25; }
.rk-help { width: min(760px, calc(100vw - 24px)); max-height: calc(100vh - 40px); padding: 0; border: 0; border-radius: 18px; background: #fff; color: #1d1d1f;
  font: 16px/1.45 system-ui, sans-serif; box-shadow: 0 20px 60px rgb(0 0 0 / 35%); }
.rk-help::backdrop { background: rgb(0 0 0 / 45%); }
.rk-help header { position: sticky; top: 0; display: flex; align-items: center; justify-content: space-between; padding: 14px 18px; background: #ffd23f; }
.rk-help header h2 { margin: 0; font-size: 22px; }
.rk-help header button { font: inherit; font-weight: 700; padding: 6px 14px; border-radius: 10px; border: 0; background: #1d1d1f; color: #fff; cursor: pointer; }
.rk-help .body { padding: 14px 18px 20px; }
.rk-help .diag { display: grid; gap: 6px; margin: 0 0 14px; padding: 10px 12px; border-radius: 12px; background: #f3f1ec; }
.rk-help .diag div { display: flex; gap: 10px; align-items: center; }
.rk-help .diag .st { font-size: 20px; width: 26px; text-align: center; }
.rk-help details { border-top: 1px solid #e4e1da; }
.rk-help summary { display: flex; align-items: center; gap: 12px; padding: 12px 2px; cursor: pointer; font-weight: 700; font-size: 17px; list-style: none; }
.rk-help summary::-webkit-details-marker { display: none; }
.rk-help summary .ic { font-size: 28px; width: 36px; text-align: center; }
.rk-help details > div { padding: 0 4px 12px 48px; }
.rk-help ol { margin: 4px 0; padding-left: 20px; }
.rk-help li { margin: 3px 0; }
.rk-help .phase { display: inline-block; padding: 2px 10px; border-radius: 8px; font-weight: 700; }
.rk-help .row { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
.rk-help table.keys { border-collapse: collapse; margin-top: 6px; }
.rk-help table.keys td { padding: 4px 10px 4px 0; vertical-align: top; }
.rk-help kbd { display: inline-block; min-width: 20px; padding: 2px 6px; margin: 1px 0; border-radius: 6px; border: 1px solid #ccc; border-bottom-width: 2px; background: #fff; font: 700 13px system-ui, sans-serif; text-align: center; }
.rk-help .row button { font: inherit; font-size: 14px; font-weight: 600; padding: 6px 12px; border-radius: 9px; border: 1px solid #ccc; background: #fff; color: #1d1d1f; cursor: pointer; }`;

/**
 * Posa el botó «? Ajuda» i torna la funció que obre el tauler.
 * @param {object} o
 * @param {'teclat'|'bateria'|'guitarra'} o.app
 * @param {() => Promise<Array<[boolean|null, string]>>|Array} [o.diagnose]  com està ara: [bé?, text]
 * @param {Array<[string, () => void]>} [o.more]  botons propis (p. ex. «Com es llegeix la carta»)
 */
export function installHelp({ app = 'teclat', diagnose = () => [], more = [] } = {}) {
  const w = WORDS[app] ?? WORDS.teclat;
  if (!document.getElementById('rk-help-style')) {
    const st = document.createElement('style');
    st.id = 'rk-help-style';
    st.textContent = STYLE;
    document.head.append(st);
  }
  const midi = app !== 'guitarra';
  const sections = [
    midi && ['🔌', `Connectar ${w.inst}`, `<ol>
      <li>Connecta ${w.inst} per USB <b>abans</b> d'obrir la pàgina (si no, torna a carregar-la).</li>
      <li>Fes servir <b>Google Chrome</b> o <b>Microsoft Edge</b> (Safari i Firefox no llegeixen MIDI).</li>
      <li>Si Chrome pregunta si pot fer servir dispositius MIDI, prem <b>Permet</b>. La pregunta surt dalt a l'esquerra.</li>
      <li>Al Windows, tanca els altres programes de música (un altre programa pot tenir ${w.inst} ocupat).</li></ol>
      <p>Sense ${w.inst}? ${app === 'bateria' ? 'Toca amb el teclat de l\'ordinador: <b>Espai</b> bombo, <b>F</b> caixa, <b>J</b> charles.' : 'Activa «Tocar amb l\'ordinador» a ⚙ Com toco: <b>A</b> és el Do.'}</p>`],
    midi && ['🔒', 'He premut «Bloqueja» (o no surt la pregunta)', `<ol>
      <li>Clica el <b>cadenat 🔒</b> (o la icona de configuració) que hi ha a l'esquerra de l'adreça.</li>
      <li>A «Dispositius MIDI» tria <b>Permet</b>.</li>
      <li>Torna a carregar la pàgina.</li></ol>
      <div class="row"><button type="button" data-reload>↻ Torna a carregar</button></div>`],
    !midi && ['🔌', 'Connectar la guitarra o el baix', `<ol>
      <li>Cable jack → USB (o l'ampli per USB) a l'ordinador.</li>
      <li>Prem <b>🔌 Connecta la guitarra</b>, tria el cable i prem <b>Connecta</b>. Si el navegador demana el micròfon, prem <b>Permet</b>.</li>
      <li>Toca una corda: la barra s'ha de moure i la sentiràs per l'ordinador, com amb un ampli.</li></ol>
      <p>El joc <b>no et corregeix</b>: serveix per escoltar la banda i sentir-te. Ho valores tu en acabar.</p>`],
    ['🔇', 'No sento res', `<ol>
      <li>Clica una vegada a la pàgina: el navegador no deixa sonar res fins al primer clic.</li>
      <li>Puja el volum de l'ordinador i mira que no estigui en silenci.</li>
      <li>${app === 'guitarra' ? 'Amb el cable USB connectat, l\'ordinador pot enviar el so al cable: a 🔌 Connecta la guitarra, tria a «Sortida» els altaveus o els auriculars.' : `No sents les teves notes? Activa ${w.mine}. Si ${w.inst} ja té altaveus, deixa-ho apagat.`}</li></ol>`],
    ['🎧', 'Quan escolto i quan toco?', `<p><span class="phase" style="background:#5b8def;color:#fff">🎧 Escolta</span> No toquis: el joc t'ho ensenya.</p>
      <p><span class="phase" style="background:#ffd23f">✋ Prepara't</span> Compte enrere: mans a punt.</p>
      <p><span class="phase" style="background:#ff7a1a;color:#fff">🎸 Ara tu</span> Toca.</p>`],
    ['🃏', 'Què faig després de tocar?', `<p>Mira <b>què t'ha faltat</b> i tria un dels quatre botons grans:</p>
      <p>🐢 Més lent · 🎧 Torna-ho a intentar · 💡 Ajuda · ⏮️ Pas anterior</p>
      <p>A sota: ↻ Repetir igual i ⏭️ Pas següent. «Ja ho tens!» només compta quan et surt sense ajuda.</p>
      <p>Amb el teclat de l'ordinador: <kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd> <kbd>4</kbd> per als quatre botons grans.</p>`],
    ['⌨️', 'Amb el teclat de l\'ordinador', `<p>Ho pots fer tot sense ratolí. A baix de la pantalla surten les tecles que funcionen en cada moment.</p>
      <table class="keys">${(KEYS[app] ?? []).map(([k, t]) => `<tr><td>${k.split(' ').map((x) => `<kbd>${x}</kbd>`).join(' ')}</td><td>${t}</td></tr>`).join('')}</table>`],
    ['🛠️', 'Altres problemes', `<ol>
      <li>Torna a carregar la pàgina (Ctrl + R, o Cmd + R al Mac).</li>
      <li>Fes-la servir en una sola pestanya.</li>
      <li>Si va a batzegades, tanca altres pestanyes i programes.</li></ol>`],
  ].filter(Boolean);

  let dlg = null;
  async function open(sectionIcon = null) {
    dlg?.remove();
    dlg = document.createElement('dialog');
    dlg.className = 'rk-help';
    let diag = [];
    try { diag = await diagnose(); } catch { /* res */ }
    dlg.innerHTML = `<header><h2>? Ajuda</h2><button type="button" data-close>Tanca</button></header>
      <div class="body">
        ${diag.length ? `<div class="diag">${diag.map(([ok, t]) => `<div><span class="st">${ok === true ? '✅' : ok === false ? '❌' : '⏳'}</span><span>${t}</span></div>`).join('')}</div>` : ''}
        ${more.length ? `<div class="row" style="margin:0 0 10px">${more.map(([l], i) => `<button type="button" data-more="${i}">${l}</button>`).join('')}</div>` : ''}
        ${sections.map(([ic, t, html]) => `<details${ic === sectionIcon ? ' open' : ''}><summary><span class="ic" aria-hidden="true">${ic}</span>${t}</summary><div>${html}</div></details>`).join('')}
      </div>`;
    dlg.addEventListener('click', (e) => {
      if (e.target === dlg || e.target.closest('[data-close]')) dlg.close();
      if (e.target.closest('[data-reload]')) location.reload();
      const m = e.target.closest('[data-more]');
      if (m) { dlg.close(); more[Number(m.dataset.more)][1](); }
    });
    // mentre l'ajuda és oberta, les dreceres de l'eina callen (Esc, Enter i Tab segueixen funcionant dins del tauler)
    const shield = (e) => { if (dlg?.open) e.stopImmediatePropagation(); };
    addEventListener('keydown', shield, true);
    dlg.addEventListener('close', () => { removeEventListener('keydown', shield, true); dlg?.remove(); });
    document.body.append(dlg);
    dlg.showModal();
  }

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'rk-help-btn';
  btn.innerHTML = '<b>?</b> Ajuda';
  btn.title = 'Ajuda: connectar l\'instrument, el so, què vol dir cada cosa';
  btn.addEventListener('click', () => open());
  document.body.append(btn);
  return open;
}

/** Com està el permís de MIDI ara mateix: [bé?, text] */
export async function midiDiagnose(what, devices = () => []) {
  const out = [];
  if (!navigator.requestMIDIAccess) return [[false, 'Aquest navegador no llegeix MIDI: obre la pàgina amb Chrome o Edge.']];
  let state = 'prompt';
  try { state = (await navigator.permissions.query({ name: 'midi' })).state; } catch { /* res */ }
  out.push(state === 'granted' ? [true, 'El navegador deixa fer servir el MIDI.'] : state === 'denied' ? [false, 'El MIDI està bloquejat: mira «He premut Bloqueja».'] : [null, 'El navegador encara no ha preguntat pel MIDI (o no s\'ha respost).']);
  const d = devices();
  out.push(d.length ? [true, `Connectat: ${d.join(', ')}.`] : [false, `No trobo ${what}: comprova el cable USB i torna a carregar la pàgina.`]);
  return out;
}
