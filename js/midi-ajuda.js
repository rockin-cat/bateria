// Perquè el MIDI i el so funcionin a la primera (Rockin, compartit entre el joc de teclat i el de bateria).
//  · El permís de MIDI: si Chrome el pregunta, una franja diu on prémer; si està bloquejat, com desbloquejar-lo.
//  · El so: el navegador no deixa sonar res fins al primer clic o tecla (una nota MIDI no compta),
//    així que el primer gest de la pàgina engega l'àudio.

const STYLE = `
.rk-midi-bar { position: fixed; left: 50%; top: 12px; transform: translateX(-50%); z-index: 9999; display: flex; align-items: center; gap: 12px;
  max-width: min(720px, calc(100vw - 24px)); padding: 12px 16px; border-radius: 14px; background: #ffd23f; color: #1d1d1f;
  font: 600 16px/1.35 system-ui, sans-serif; box-shadow: 0 10px 30px rgb(0 0 0 / 25%); }
.rk-midi-bar .ic { font-size: 28px; line-height: 1; }
.rk-midi-bar small { display: block; font-weight: 500; font-size: 14px; }
.rk-midi-bar button { font: inherit; font-size: 14px; padding: 6px 12px; border-radius: 9px; border: 1px solid rgb(0 0 0 / 25%); background: #fff; color: #1d1d1f; cursor: pointer; white-space: nowrap; }
.rk-midi-bar .x { border: 0; background: transparent; font-size: 20px; padding: 2px 6px; }
.rk-midi-bar.bad { background: #ffb4a8; }`;

let bar = null;
function show(icon, text, sub = '', { bad = false, actions = [] } = {}) {
  if (!document.getElementById('rk-midi-style')) {
    const st = document.createElement('style');
    st.id = 'rk-midi-style';
    st.textContent = STYLE;
    document.head.append(st);
  }
  bar ??= document.createElement('div');
  bar.className = `rk-midi-bar${bad ? ' bad' : ''}`;
  bar.setAttribute('role', 'status');
  bar.innerHTML = `<span class="ic" aria-hidden="true">${icon}</span><span>${text}${sub ? `<small>${sub}</small>` : ''}</span>`;
  for (const [label, fn] of actions) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = label;
    b.addEventListener('click', fn);
    bar.append(b);
  }
  const x = document.createElement('button');
  x.type = 'button';
  x.className = 'x';
  x.title = 'Tanca';
  x.textContent = '×';
  x.addEventListener('click', hide);
  bar.append(x);
  if (!bar.isConnected) document.body.append(bar);
}
export function hide() { bar?.remove(); }

/**
 * Vigila el permís de MIDI i ho explica amb una franja a dalt.
 * @param {object} o
 * @param {string} o.what       «el teclat» / «la bateria»
 * @param {() => void} [o.openHelp]  obre l'ajuda (? Ajuda)
 */
export async function watchMidiPermission({ what = 'el teclat', openHelp } = {}) {
  const help = openHelp ? [['? Com ho faig', openHelp]] : [];
  if (!navigator.requestMIDIAccess) {
    show('🌐', `Aquest navegador no llegeix ${what} (MIDI).`, 'Obre aquesta pàgina amb Google Chrome o Microsoft Edge.', { bad: true, actions: help });
    return;
  }
  let status = null;
  try { status = await navigator.permissions.query({ name: 'midi' }); } catch { return; }
  const paint = () => {
    if (status.state === 'granted') { hide(); return; }
    if (status.state === 'denied') {
      show('🔒', `El navegador té bloquejat ${what}.`, 'Clica el cadenat 🔒 al costat de l\'adreça → «Dispositius MIDI» → Permet. Després, torna a carregar.', {
        bad: true, actions: [['↻ Torna a carregar', () => location.reload()], ...help],
      });
      return;
    }
    // «prompt»: Chrome ho pregunta dalt a l'esquerra, i és fàcil no veure-ho
    setTimeout(() => {
      if (status.state !== 'prompt') return;
      show('⬆️', `Chrome et pregunta si pot fer servir ${what}: prem «Permet».`, 'La pregunta surt dalt a l\'esquerra, sota l\'adreça.', { actions: help });
    }, 1200);
  };
  status.onchange = paint;
  paint();
}

/** Engega l'àudio amb el primer clic o tecla de la pàgina (les notes MIDI no compten com a gest). */
export function unlockAudioOnFirstGesture(start) {
  const go = () => {
    Promise.resolve().then(start).catch(() => {});
    removeEventListener('pointerdown', go, true);
    removeEventListener('keydown', go, true);
  };
  addEventListener('pointerdown', go, true);
  addEventListener('keydown', go, true);
}
