// L'Inspirador d'estils: estils de música, les seves cartes de patró (noves,
// dibuixades amb l'estil de les cartes ROCKIN) i la banda que els acompanya.
// També s'hi afegeixen les cartes ROCKIN que ja existeixen i hi encaixen.
//
// Posicions: grid 16 = semicorxeres (0, 4, 8, 12 són els temps); grid 12 = tresets (0, 3, 6, 9 són els temps).
// Peces: hh charles · oh charles obert · ride · crash · sn caixa · ghost caixa fluixa · rim baqueta creuada
//        kk bombo · t1/t2/t3 toms · pedal (charles amb el peu: surt a la carta però el joc no el jutja).

import { drawnCard, registerCards } from './cards.js';

const HH8 = [0, 2, 4, 6, 8, 10, 12, 14];
const HH16 = [...Array(16).keys()];
/** Semicorxeres alternant D-E: on cau la caixa (amb la dreta), el charles calla. */
const HH16_BUT = (...holes) => HH16.filter((st) => !holes.includes(st));
const Q = [0, 4, 8, 12];
const OFF8 = [2, 6, 10, 14];
const SHUF = [0, 2, 3, 5, 6, 8, 9, 11]; // ternari: 1 . a 2 . a …
const TRIP = [...Array(12).keys()];
const RIDE_SWING = [0, 3, 5, 6, 9, 11]; // «tin, tin-ta-tin, tin-ta»

export const STYLE_BOX = '#7b5ea7';

/** Definició dels estils. `cards`: [nom curt, notes, grid?]. `also`: cartes ROCKIN que hi encaixen. */
const DEFS = [
  {
    id: 'rock', name: 'Rock', band: 'rock', tempo: 100, era: 'Anys 50 fins avui',
    text: 'Corxeres rectes al charles, el bombo als temps forts i la caixa ben forta al 2 i al 4 (el «backbeat»). És la base de gairebé tot el que ve després.',
    listen: 'AC/DC, «Back in Black» · Queen',
    cards: [
      ['Rock 1', { hh: HH8, sn: [4, 12], kk: [0, 8, 10] }],
      ['Rock 2 · ride', { ride: HH8, sn: [4, 12], kk: [0, 7, 8] }],
      ['Rock 3 · mitja part', { hh: HH8, sn: [8], kk: [0, 6, 10] }],
    ],
    also: ['p5', 'p9', 'p10', 'p7'],
  },
  {
    id: 'pop', name: 'Pop', band: 'pop', tempo: 100, era: 'Anys 60 fins avui',
    text: 'Com el rock però més suau i ballable. Sovint el bombo fa els quatre temps («four on the floor») o una síncopa just abans del 3.',
    listen: 'Moltes cançons de la ràdio d’avui',
    cards: [
      ['Pop 1 · quatre temps', { hh: HH8, sn: [4, 12], kk: Q }],
      ['Pop 2 · síncopa', { hh: HH8, sn: [4, 12], kk: [0, 6, 8] }],
    ],
    also: ['p8', 'p2', 'p21'],
  },
  {
    id: 'punk', name: 'Punk', band: 'punk', tempo: 160, era: 'Anys 70',
    text: 'Ràpid i directe. El patró típic és el «skank»: bombo a cada temps i caixa a cada contratemps, com una polca a tota velocitat.',
    listen: 'Ramones, «Blitzkrieg Bop»',
    cards: [
      ['Punk 1 · skank', { hh: Q, sn: OFF8, kk: Q }],
      ['Punk 2 · corxeres', { hh: HH8, sn: [4, 12], kk: [0, 2, 8, 10] }],
    ],
    also: ['p1', 'p16'],
  },
  {
    id: 'funk', name: 'Funk', band: 'funk', tempo: 95, era: 'Anys 60–70',
    text: 'Tot gira al voltant de les semicorxeres. Bombo sincopat, caixa al 2 i al 4 i moltes notes fantasma que donen el «groove».',
    listen: 'James Brown · Bruno Mars, «Uptown Funk»',
    cards: [
      ['Funk 1 · semicorxeres', { hh: HH16_BUT(4, 12), sn: [4, 12], kk: [0, 6, 10] }],
      ['Funk 2 · fantasma', { hh: HH8, sn: [4, 12], ghost: [7, 9, 15], kk: [0, 3, 10] }],
      ['Funk 3 · obert', { hh: [0, 4, 6, 8, 12, 14], oh: [2, 10], sn: [4, 12], kk: [0, 7, 10] }],
    ],
    also: ['p5', 'p25', 'p26'],
  },
  {
    id: 'disco', name: 'Disco', band: 'disco', tempo: 118, era: 'Anys 70',
    text: 'Bombo a tots els temps i el charles obert a cada «i»: tsss-tsss… És el ritme de la música de ball, avantpassat de l’electrònica.',
    listen: 'Bee Gees, «Stayin’ Alive» · Chic',
    cards: [
      ['Disco 1', { hh: Q, oh: OFF8, sn: [4, 12], kk: Q }],
      ['Disco 2 · semicorxeres', { hh: [0, 1, 3, 5, 7, 8, 9, 11, 13, 15], oh: OFF8, sn: [4, 12], kk: Q }],
    ],
    also: ['p18'],
  },
  {
    id: 'reggae', name: 'Reggae', band: 'reggae', tempo: 76, era: 'Jamaica, anys 60–70',
    text: 'El «one drop»: el temps 1 queda buit i el bombo cau al 3, junt amb la caixa tocada amb la baqueta creuada (rim). La guitarra fa els contratemps.',
    listen: 'Bob Marley, «Three Little Birds»',
    cards: [
      ['Reggae 1 · one drop', { hh: HH8, rim: [8], kk: [8] }],
      ['Reggae 2 · rockers', { hh: OFF8, rim: [4, 12], kk: Q }],
    ],
    also: [],
  },
  {
    id: 'ska', name: 'Ska', band: 'festa', tempo: 150, era: 'Jamaica, anys 60 · ska-punk, anys 90',
    text: 'Més ràpid que el reggae: el charles o la guitarra marquen tots els contratemps. Al ska-punk català (Obrint Pas, La Pegatina…) és el pa de cada dia.',
    listen: 'The Skatalites · Obrint Pas, «La Flama»',
    cards: [
      ['Ska 1', { hh: OFF8, sn: [4, 12], kk: [0, 8] }],
      ['Ska 2 · ràpid', { ride: HH8, sn: [4, 12], kk: [0, 6, 8] }],
    ],
    also: ['p17', 'p19'],
  },
  {
    id: 'reggaeton', name: 'Reggaeton', band: 'reggaeton', tempo: 92, era: 'Puerto Rico, anys 90',
    text: 'El «dembow»: bombo a tots els temps i la caixa a la darrera semicorxera del 1 i a la «i» del 2 (bum, ... ta, bum-ta …).',
    listen: 'Daddy Yankee, «Gasolina»',
    cards: [
      ['Reggaeton 1 · dembow', { sn: [3, 6, 11, 14], kk: Q }],
      ['Reggaeton 2 · amb charles', { hh: HH8, sn: [3, 6, 11, 14], kk: Q }],
    ],
    also: [],
  },
  {
    id: 'rumba', name: 'Rumba catalana', band: 'rumba', tempo: 110, era: 'Barcelona, anys 50–60',
    text: 'Nascuda al barri de Gràcia i al Raval. La guitarra fa el «ventilador» i la bateria imita les palmes: caixa (o rim) al 2 i al 4 i bombo sincopat.',
    listen: 'Peret, «Borriquito» · Gipsy Kings',
    cards: [
      ['Rumba 1', { hh: HH8, rim: [4, 12], kk: [0, 6, 8, 14] }],
      ['Rumba 2 · palmes', { hh: HH8, sn: [4, 12], ghost: [7, 15], kk: [0, 3, 8, 11] }],
    ],
    also: ['p19'],
  },
  {
    id: 'cumbia', name: 'Cúmbia', band: 'cumbia', tempo: 95, era: 'Colòmbia, segle XX',
    text: 'El charles fa de güira (ch-chk-chk), el bombo marca l’1 i el 3 i la caixa respon a la «i» del 2 i del 4.',
    listen: '«La pollera colorá»',
    cards: [
      ['Cúmbia 1', { hh: [0, 2, 3, 4, 6, 7, 8, 10, 11, 12, 14, 15], rim: [6, 14], kk: [0, 8] }],
      ['Cúmbia 2', { hh: OFF8, sn: [6, 14], kk: Q }],
    ],
    also: [],
  },
  {
    id: 'shuffle', name: 'Blues shuffle', band: 'shuffle', tempo: 90, era: 'Estats Units, anys 40–50',
    text: 'En ternari: cada temps es divideix en tres i el charles fa llarg-curt, llarg-curt (1 . a 2 . a). És el balanceig del blues i del rock and roll.',
    listen: 'Stevie Ray Vaughan, «Pride and Joy»',
    cards: [
      ['Shuffle 1', { hh: SHUF, sn: [3, 9], kk: [0, 6] }, 12],
      ['Shuffle 2 · fantasma', { hh: SHUF, sn: [3, 9], ghost: [2, 8], kk: [0, 5, 6] }, 12],
    ],
    also: ['s1', 's2', 's3'],
  },
  {
    id: 'swing', name: 'Swing i jazz', band: 'swing', tempo: 120, era: 'Estats Units, anys 30',
    text: 'El ride fa el «tin, tin-ta-tin, tin-ta» i el charles es tanca amb el peu al 2 i al 4. La caixa i el bombo només comenten (el joc no et jutja el peu).',
    listen: 'Count Basie · Duke Ellington, «Take the A Train»',
    cards: [
      ['Swing 1', { ride: RIDE_SWING, pedal: [3, 9] }, 12],
      ['Swing 2 · comping', { ride: RIDE_SWING, pedal: [3, 9], sn: [5], kk: [11] }, 12],
    ],
    also: [],
  },
  {
    id: 'bossa', name: 'Bossa nova', band: 'bossa', tempo: 120, era: 'Brasil, anys 50–60',
    text: 'Suau i elegant. El bombo fa un ostinato (bum . . bum bum . . bum) i la baqueta creuada dibuixa la clave de bossa.',
    listen: 'Antônio Carlos Jobim, «Garota de Ipanema»',
    cards: [
      ['Bossa 1', { hh: HH8, rim: [0, 3, 6, 10, 12], kk: [0, 3, 4, 7, 8, 11, 12, 15] }],
      ['Bossa 2 · ride', { ride: HH8, rim: [0, 3, 6, 10, 12], kk: [0, 3, 4, 7, 8, 11, 12, 15] }],
    ],
    also: [],
  },
  {
    id: 'samba', name: 'Samba', band: 'samba', tempo: 100, era: 'Brasil, segle XX',
    text: 'Molta energia: el charles fa semicorxeres com el ganzá i el bombo imita el surdo, amb el cop fort al 2 de cada meitat.',
    listen: 'Jorge Ben, «Mas que nada»',
    cards: [
      ['Samba 1', { hh: HH16, kk: [0, 3, 4, 7, 8, 11, 12, 15] }],
      ['Samba 2 · partido alto', { hh: HH8, rim: [0, 3, 6, 10, 11, 14], kk: [0, 3, 4, 7, 8, 11, 12, 15] }],
    ],
    also: [],
  },
  {
    id: 'hiphop', name: 'Hip-hop', band: 'hiphop', tempo: 88, era: 'Nova York, anys 80–90',
    text: 'El «boom bap»: bombo greu i sincopat, caixa seca al 2 i al 4 i tempo tranquil perquè hi càpiga el rap.',
    listen: 'El rap dels anys 90',
    cards: [
      ['Hip-hop 1 · boom bap', { hh: HH8, sn: [4, 12], kk: [0, 3, 8, 10] }],
      ['Hip-hop 2 · obert', { hh: [0, 2, 4, 6, 8, 10, 12], oh: [14], sn: [4, 12], kk: [0, 7, 10] }],
    ],
    also: ['p24'],
  },
  {
    id: 'trap', name: 'Trap', band: 'trap', tempo: 70, era: 'Atlanta, anys 2000',
    text: 'Sensació lenta: la caixa només al 3 («mitja part») i el charles fa ràfegues de semicorxeres. El bombo va lliure, com els 808.',
    listen: 'El trap i el rap d’avui',
    cards: [
      ['Trap 1', { hh: [0, 2, 4, 6, 8, 10, 12, 13, 14, 15], sn: [8], kk: [0, 6, 11] }],
      ['Trap 2 · semicorxeres', { hh: HH16_BUT(8), sn: [8], kk: [0, 3, 10] }],
    ],
    also: [],
  },
  {
    id: 'metal', name: 'Metal', band: 'metal', tempo: 150, era: 'Anglaterra, anys 70 fins avui',
    text: 'Guitarres distorsionades i bateria potent. Aquí tot amb un sol bombo: el «thrash» (bombo als temps, caixa als contratemps) i el galop.',
    listen: 'Metallica · Iron Maiden',
    cards: [
      ['Metal 1 · thrash', { crash: [0], hh: [4, 8, 12], sn: OFF8, kk: Q }],
      ['Metal 2 · galop', { hh: HH8, sn: [4, 12], kk: [0, 2, 3, 8, 10, 11] }],
      ['Metal 3 · pesat', { crash: [0, 8], sn: [8], kk: [0, 3, 6, 10, 11] }],
    ],
    also: [],
  },
];

export const STYLES = DEFS.map((d) => {
  const cards = d.cards.map(([name, notes, grid = 16], i) => drawnCard({
    id: `e-${d.id}-${i + 1}`,
    num: `${d.name.split(' ')[0].slice(0, 2).toUpperCase()}${i + 1}`,
    title: name,
    name,
    notes,
    grid,
    box: STYLE_BOX,
    style: d.id,
  }));
  return { ...d, cards };
});
registerCards(STYLES.flatMap((s) => s.cards));

export const styleOf = (cardId) => STYLES.find((s) => s.cards.some((c) => c.id === cardId)) ?? null;
void TRIP;
