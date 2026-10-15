// El full de ruta de bateria: els 10 nivells del pòster «Bateria · Percussió · Full de ruta · Nivells»
// (versió de Rockin). Tots els passos es fan sobre la cançó triada: la cançó no canvia mai,
// el que canvia és què hi toca la bateria.
//
// Cada pas té un `plan` que diu, compàs a compàs, quina carta es toca:
//   groove: la carta de base
//   first: { card, every: 'part' | 4 }        la carta del primer compàs (crash i bombo al temps 1)
//   fill:  { card, every: 'part' | 4 | 8 }    break al darrer compàs de cada part (o cada 4 / 8)
//   vary:  { card, every: 4 }                 variació al darrer compàs de cada 4
//   parts: [cardA, cardB]                     una carta per a l'estrofa (i la resta) i una altra per a la tornada
//   stop:  { card }                           marca: tothom colpeja junt (la banda també) al darrer compàs de la part
//   solo:  { bars, every: 'part' | 8 }        compassos lliures (no es jutgen) al final de cada part o cada 8
//   choose: true                              tries tu la carta i el break
//   voice: 'count' | 'count8' | 'sing'        instrucció de veu (al final es pregunta si ho has pogut fer)

import { drawnCard, registerCards, card as cardById } from './cards.js';

// Cartes de marques (nivell 9): la banda i la bateria colpegen junts
const MARKS = [
  drawnCard({ id: 'mq1', num: 'M1', title: 'Marca al temps 1', name: 'Marca 1', notes: { crash: [0], kk: [0] }, box: '#ef4444' }),
  drawnCard({ id: 'mq2', num: 'M2', title: 'Marques a l’1 i a la «i» del 2', name: 'Marca 2', notes: { crash: [0, 6], kk: [0, 6] }, box: '#ef4444' }),
  drawnCard({ id: 'mq3', num: 'M3', title: 'Marques a l’1, al 2 i al 3', name: 'Marca 3', notes: { crash: [0, 4, 8], kk: [0, 4, 8], sn: [12, 13, 14, 15] }, box: '#ef4444' }),
  // Crash al primer temps sobre el patró de negres (nivell 2)
  drawnCard({ id: 'cr1', num: 'C1', title: 'Crash al temps 1', name: 'Crash i bombo', notes: { crash: [0], hh: [4, 8, 12], sn: [4, 12], kk: [0, 8] }, box: '#ef4444' }),
];
registerCards(MARKS);

export const ROUTE = [
  {
    n: 1, titol: 'Patró rítmic senzill', sub: 'Tocar la cançó amb un patró base', icon: 'drum',
    passos: [
      { id: 'd1a', titol: 'Només el bombo', text: 'El bombo marca els quatre temps de cada compàs de la cançó. És el cor de la banda.', com: ['Peu dret, cop sec i el taló avall.', 'Escolta el baix: sovint fa el mateix que tu.'], plan: { groove: 'w1' }, tempoMax: 90 },
      { id: 'd1b', titol: 'Bombo i caixa', text: 'Bombo a l’1 i al 3, caixa al 2 i al 4. Ja sona com una bateria.', com: ['Caixa amb la mà esquerra.', 'Compta en veu baixa: bum, ta, bum, ta.'], plan: { groove: 'w2' }, tempoMax: 95 },
      { id: 'd1c', titol: 'Charles, bombo i caixa', text: 'La mà dreta marca els quatre temps al charles, a sobre del bombo i la caixa.', com: ['El charles sempre sona: és el que no para.'], plan: { groove: 'p1' } },
      { id: 'd1d', titol: 'El patró base', text: 'Charles a corxeres (1 i 2 i 3 i 4 i), bombo a l’1 i al 3, caixa al 2 i al 4. Toca tota la cançó amb aquest patró.', com: ['La mà dreta va el doble de ràpid que abans.', 'Si et perds, torna al charles a negres.'], plan: { groove: 'p5' } },
    ],
  },
  {
    n: 2, titol: 'Marcar el primer temps', sub: 'Amb el crash i el bombo a la roda d’acords', icon: 'target',
    passos: [
      { id: 'd2a', titol: 'Crash a l’inici de cada part', text: 'El primer compàs de cada part comença amb crash i bombo junts. Així la banda sap que comença una part nova.', com: ['La mà dreta va del charles al crash i torna.', 'Mira l’estructura: el crash cau on canvia el nom de la part.'], plan: { groove: 'p5', first: { card: 'p7', every: 'part' } } },
      { id: 'd2b', titol: 'Crash a cada roda', text: 'Crash i bombo al temps 1 cada vegada que torna a començar la roda d’acords (cada 4 compassos).', com: ['Compta els compassos: 1, 2, 3, 4… i crash!'], plan: { groove: 'p5', first: { card: 'p7', every: 4 } } },
      { id: 'd2c', titol: 'Crash amb el patró de negres', text: 'El mateix amb el charles a negres, per poder-hi pensar més.', com: ['Si el patró base costa, comença per aquí.'], plan: { groove: 'p1', first: { card: 'cr1', every: 4 } } },
    ],
  },
  {
    n: 3, titol: 'Altres patrons rítmics', sub: 'Aplicables a una mateixa cançó', icon: 'layers',
    passos: [
      { id: 'd3a', titol: 'Bombo a tots els temps', text: 'El bombo fa els quatre temps i la caixa el 2 i el 4: més empenta.', com: ['El peu no s’atura.'], plan: { groove: 'p8' } },
      { id: 'd3b', titol: 'Bombo a la «i» del 3', text: 'Un cop de bombo afegit just després del 3.', com: ['Compta «3 i»: el bombo cau a la «i».'], plan: { groove: 'p9' } },
      { id: 'd3c', titol: 'Bombo a la «i» de l’1', text: 'Dos cops de bombo seguits al començament.', com: ['Bum-bum, ta…'], plan: { groove: 'p10' } },
      { id: 'd3d', titol: 'Bombo a la «i» del 4', text: 'El bombo avisa del compàs següent.', com: ['Prepara el peu al 4.'], plan: { groove: 'p12' } },
      { id: 'd3e', titol: 'Bombo abans del 3', text: 'Un cop de bombo a la «i» del 2.', com: ['Ta-bum, bum…'], plan: { groove: 'p13' } },
    ],
  },
  {
    n: 4, titol: 'Cantar i tocar', sub: 'Coordinació de veu i bateria', icon: 'mic',
    passos: [
      { id: 'd4a', titol: 'Compta en veu alta', text: 'Toca el patró de negres i compta en veu alta: u, dos, tres, quatre.', com: ['Cada número, un cop de charles.'], plan: { groove: 'p1' }, voice: 'count' },
      { id: 'd4b', titol: 'Compta les corxeres', text: 'Patró base comptant «u i dos i tres i quatre i».', com: ['La veu va amb la mà dreta.'], plan: { groove: 'p5' }, voice: 'count8' },
      { id: 'd4c', titol: 'Canta la cançó', text: 'Toca el patró base i canta la tornada (o la part que sàpigues).', com: ['Primer tararejant, després amb la lletra.', 'Si es desquadra, para de cantar i torna-hi al compàs següent.'], plan: { groove: 'p5' }, voice: 'sing' },
      { id: 'd4d', titol: 'Canta amb un altre patró', text: 'El mateix amb el bombo a tots els temps.', com: ['Com més fàcil el patró, més pots pensar en la veu.'], plan: { groove: 'p8' }, voice: 'sing' },
    ],
  },
  {
    n: 5, titol: 'Incorporar breaks', sub: 'Afegir algun break a la cançó', icon: 'bolt',
    passos: [
      { id: 'd5a', titol: 'Break de caixa i toms', text: 'L’últim compàs de cada part és un break: caixa, tom 1, tom 2 i tom 3.', com: ['Pensa-hi abans: el break avisa que canvia la part.', 'Després del break, crash o patró al temps 1!'], plan: { groove: 'p5', fill: { card: 'break1', every: 'part' } } },
      { id: 'd5b', titol: 'Un break curt', text: 'El ritme continua i només l’últim temps és de caixa.', com: ['És el break més fàcil d’encaixar.'], plan: { groove: 'p5', fill: { card: 'break5', every: 'part' } } },
      { id: 'd5c', titol: 'Break amb silencis', text: 'Un break amb forats: no toquis on no hi ha rodona.', com: ['Els silencis també es compten.'], plan: { groove: 'p5', fill: { card: 'break3', every: 'part' } } },
      { id: 'd5d', titol: 'Break cada 4 compassos', text: 'Ara el break surt al final de cada roda.', com: ['Compta: 1, 2, 3… i break.'], plan: { groove: 'p5', fill: { card: 'break7', every: 4 } } },
    ],
  },
  {
    n: 6, titol: 'Hi-hat obert', sub: 'Incorporar el so al patró rítmic', icon: 'ring',
    passos: [
      { id: 'd6a', titol: 'Obert a la darrera «i»', text: 'El charles s’obre a la darrera corxera i es tanca al temps 1.', com: ['Aixeca el peu del pedal just en aquell cop.', 'Al temps 1, peu avall i el charles es tanca.'], plan: { groove: 'p15' } },
      { id: 'd6b', titol: 'Obert a totes les «i»', text: 'El so de la música disco: tancat al temps, obert a la «i».', com: ['El peu puja i baixa a cada temps.'], plan: { groove: 'e-disco-1' } },
      { id: 'd6c', titol: 'Charles obert a negres', text: 'Un so més obert i potent, per a les tornades.', com: ['Deixa el pedal una mica aixecat.'], plan: { groove: 'p16' } },
      { id: 'd6d', titol: 'Tornada amb el charles obert', text: 'Les estrofes amb el patró base i les tornades amb el charles obert.', com: ['Mira l’estructura: on canvia la part, canvia el so.'], plan: { parts: ['p5', 'p6'] } },
    ],
  },
  {
    n: 7, titol: 'Variacions rítmiques', sub: 'A bombo, caixa o plats oberts', icon: 'sliders',
    passos: [
      { id: 'd7a', titol: 'Variació al bombo', text: 'Cada quatre compassos, l’últim té un cop de bombo de més.', com: ['Tres compassos iguals i el quart canvia.'], plan: { groove: 'p5', vary: { card: 'p11', every: 4 } } },
      { id: 'd7b', titol: 'Variació a la caixa', text: 'L’últim compàs de cada quatre té una caixa desplaçada.', com: ['La caixa avança mig temps.'], plan: { groove: 'p5', vary: { card: 'p20', every: 4 } } },
      { id: 'd7c', titol: 'Estrofa i tornada diferents', text: 'Un patró per a l’estrofa i un altre per a la tornada.', com: ['La tornada amb el bombo a tots els temps sona més forta.'], plan: { parts: ['p5', 'p8'] } },
      { id: 'd7d', titol: 'Plats oberts a la tornada', text: 'A la tornada, el ride en lloc del charles.', com: ['La mà dreta va al ride per a tota la part.'], plan: { parts: ['p5', 'e-rock-2'] } },
    ],
  },
  {
    n: 8, titol: 'Cartes de patrons', sub: 'Utilitzar tots els patrons i breaks', icon: 'cards',
    passos: [
      { id: 'd8a', titol: 'Notes fantasma', text: 'Cops molt fluixos a la caixa que donen balanceig.', com: ['Les rodones petites són gairebé un frec.'], plan: { groove: 'p25' } },
      { id: 'd8b', titol: 'Semicorxeres', text: 'Charles a semicorxeres alternant mans: D E D E.', com: ['Al 2 i al 4, la dreta va a la caixa.'], plan: { groove: 'p30' } },
      { id: 'd8c', titol: 'El patró de l’estil', text: 'Un patró de l’estil de la cançó (de l’Inspirador d’estils).', com: ['Escolta com canvia la cançó amb un altre estil.'], plan: { groove: 'style' } },
      { id: 'd8d', titol: 'Tria tu la carta i el break', text: 'Tria qualsevol carta de patró i un break per a la teva cançó.', com: ['Amb ←→ canvies la carta abans de començar.'], plan: { choose: true } },
    ],
  },
  {
    n: 9, titol: 'Marques melòdiques', sub: 'Relacionades amb la melodia o la lletra', icon: 'note',
    passos: [
      { id: 'd9a', titol: 'Atura’t amb la banda', text: 'L’últim compàs de cada part, tota la banda fa un sol cop al temps 1 i calla. Tu també: crash i bombo.', com: ['Deixa sonar el crash i espera el compàs següent.'], plan: { groove: 'p5', stop: { card: 'mq1' } } },
      { id: 'd9b', titol: 'Marca l’inici i el final', text: 'Crash a l’inici de cada part i marca al final.', com: ['La cançó queda emmarcada per les teves marques.'], plan: { groove: 'p5', first: { card: 'p7', every: 'part' }, stop: { card: 'mq1' } } },
      { id: 'd9c', titol: 'Marques amb la melodia', text: 'Al final de cada part, la banda i tu feu dues marques: a l’1 i a la «i» del 2.', com: ['Són com els accents de la lletra.'], plan: { groove: 'p5', stop: { card: 'mq2' } } },
      { id: 'd9d', titol: 'Marques i break', text: 'Tres marques i un redoble de caixa per entrar a la part següent.', com: ['El redoble són quatre semicorxeres al 4.'], plan: { groove: 'p5', stop: { card: 'mq3' } } },
    ],
  },
  {
    n: 10, titol: 'Improvisar solos', sub: 'Solos de bateria per una cançó', icon: 'pen',
    passos: [
      { id: 'd10a', titol: 'Un compàs de solo', text: 'L’últim compàs de cada part és teu: toca el que vulguis. La banda continua i al compàs següent tornes al patró.', com: ['El solo no es puntua; el que compta és tornar a entrar a temps.'], plan: { groove: 'p5', solo: { bars: 1, every: 'part' } } },
      { id: 'd10b', titol: 'Dos compassos de solo', text: 'Els dos últims compassos de cada part són teus.', com: ['Compta els temps mentre improvises.'], plan: { groove: 'p5', solo: { bars: 2, every: 'part' } } },
      { id: 'd10c', titol: 'Quatre i quatre', text: 'Quatre compassos de patró i quatre de solo, tota la cançó.', com: ['Com fan els bateries de jazz: «trading fours».'], plan: { groove: 'p5', solo: { bars: 4, every: 8 } } },
    ],
  },
];

/** Els passos on l'estructura de la cançó importa (inici o final de part, estrofa/tornada, marques, solos per part). */
export function needsForm(step) {
  const p = step.plan;
  return p.first?.every === 'part' || p.fill?.every === 'part' || !!p.parts || !!p.stop || p.solo?.every === 'part' || !!p.choose;
}

/**
 * La cançó tal com es toca en un pas. Si el pas no necessita l'estructura, només la roda d'acords
 * (la primera part que no és la introducció) repetida fins a 8 compassos (16 si el pas ho demana).
 */
export function stepSong(step, song) {
  if (needsForm(step)) return { ...song, form: true };
  const parts = [];
  song.bars.forEach((b, j) => { if (b.partStart || j === 0) parts.push([]); parts[parts.length - 1].push(b); });
  const main = parts.find((pt) => !/^intro/i.test(pt[0]?.part ?? '')) ?? parts[0];
  const roda = main.slice(0, 8);
  const len = step.plan.solo?.every === 8 ? 16 : 8;
  const bars = Array.from({ length: Math.max(len, roda.length) }, (_, j) => ({ ...roda[j % roda.length], partStart: j === 0, partEnd: false }));
  bars[bars.length - 1].partEnd = true;
  return { ...song, bars, form: false, roda: roda.map((b) => b.sym ?? b.chord?.name), rodaPart: main[0]?.part ?? '' };
}

export const ALL_STEPS = ROUTE.flatMap((l) => l.passos.map((p) => ({ ...p, level: l })));
export const stepById = (id) => ALL_STEPS.find((s) => s.id === id);

export const isChorus = (part) => /^(b|tornada|chorus|estribillo|coro)\b/i.test(String(part ?? '').trim());

/** Patró de l’estil de la cançó (nivell 8). */
const STYLE_CARD = { reggae: 'e-reggae-1', rumba: 'e-rumba-1', festa: 'e-ska-1', funk: 'e-funk-2', disco: 'e-disco-1', reggaeton: 'e-reggaeton-1', cumbia: 'e-cumbia-1', rock: 'e-rock-1', punk: 'e-punk-1', pop: 'e-pop-2', hiphop: 'e-hiphop-1', bossa: 'e-bossa-1', samba: 'e-samba-1', metal: 'e-metal-2', trap: 'e-trap-1', shuffle: 'e-shuffle-1', swing: 'e-swing-1' };

/**
 * Compassos d’un pas sobre una cançó: [{ card, chord, part, partStart, partEnd, solo, stop }].
 * `choice` (nivell 8, «tria tu»): { groove, brk }.
 */
export function stepBars(step, song, choice = {}) {
  const plan = step.plan;
  const bars = song.bars;
  // índex de part i posició dins de la part
  let partIdx = -1;
  const info = bars.map((b, j) => {
    if (b.partStart || j === 0) partIdx++;
    return { ...b, partIdx };
  });
  const partLen = [];
  info.forEach((b) => { partLen[b.partIdx] = (partLen[b.partIdx] ?? 0) + 1; });
  const posInPart = [];
  const counter = {};
  info.forEach((b, j) => { posInPart[j] = counter[b.partIdx] = (counter[b.partIdx] ?? -1) + 1; });

  let grooveId = plan.groove;
  if (grooveId === 'style') grooveId = STYLE_CARD[song.band] ?? 'e-rock-1';
  if (plan.choose) grooveId = choice.groove ?? song.groove?.id ?? 'p5';
  const groove = cardById(grooveId) ?? song.groove ?? cardById('p5');
  const fill = plan.choose ? (choice.brk ? { card: choice.brk, every: 'part' } : null) : plan.fill;

  // Estrofa / tornada (nivells 6 i 7): les parts que es diuen B, Tornada o Chorus són la tornada.
  // Si la cançó no en té cap amb aquest nom, s'alternen les parts.
  const hasChorus = info.some((b) => isChorus(b.part));
  const chorusOf = (b) => (hasChorus ? (isChorus(b.part) ? 1 : 0) : b.partIdx % 2);

  return info.map((b, j) => {
    const last = j === bars.length - 1;
    const endOfPart = b.partEnd && !last;
    const pos = posInPart[j];
    let card = groove;
    if (plan.parts) card = cardById(plan.parts[chorusOf(b)]) ?? groove;
    let solo = false;
    let stop = false;
    if (plan.first) {
      const isFirst = plan.first.every === 'part' ? pos === 0 : j % plan.first.every === 0;
      if (isFirst) card = cardById(plan.first.card);
    }
    if (plan.vary && j % plan.vary.every === plan.vary.every - 1 && !last) card = cardById(plan.vary.card);
    if (fill && !last) {
      const at = fill.every === 'part' ? endOfPart : j % fill.every === fill.every - 1;
      if (at) card = cardById(fill.card);
    }
    if (plan.stop && endOfPart) { card = cardById(plan.stop.card); stop = true; }
    if (plan.solo && !last) {
      const n = plan.solo.bars;
      if (plan.solo.every === 'part') solo = pos >= partLen[b.partIdx] - n && partLen[b.partIdx] > n;
      else solo = j % plan.solo.every >= plan.solo.every - n;
      if (solo) card = null;
    }
    return { card, chord: b.chord, part: b.part, partStart: b.partStart, partEnd: b.partEnd, solo, stop, idx: b.idx ?? j };
  });
}

/** Les cartes diferents que surten en un pas (per mostrar-les). */
export function stepCards(step, song, choice) {
  const seen = new Map();
  for (const b of stepBars(step, song, choice)) if (b.card && !seen.has(b.card.id)) seen.set(b.card.id, b.card);
  return [...seen.values()];
}
