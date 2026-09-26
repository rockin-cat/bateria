# ROCKIN · Bateria

Joc web per aprendre a tocar la bateria amb les **cartes de patrons de bateria ROCKIN**.
Publicat a <https://rockin-cat.github.io/bateria/>.

1. **La carta diu què toques** (rodona blava: bombo · verda: caixa · groga: charles · petites: cops fluixos).
2. **Primer escoltes**: el joc toca la carta amb la banda i les rodones arriben a la línia groga de la pista.
3. **Ara tu**: quatre baquetes d'entrada; la banda (baix, teclat i guitarra) continua i la bateria la fas tu.
4. **A cada cop** surt si ha anat bé (perfecte, aviat, tard, peça equivocada, cop de més) sobre la pista, sobre la bateria dibuixada i sobre la mateixa carta.
5. **Al final**: estrelles de precisió, peça a peça, control del temps (avançat / endarrerit) i consells. Si ha anat malament, el botó gran és «♪ T'ho ensenyo i tornem-hi» (torna la demostració i baixa el tempo).

## Com es juga

- **Bateria electrònica** per USB, amb **Chrome o Edge** (Web MIDI). Notes General MIDI i les de Roland V-Drums ja reconegudes; «Aprèn la meva bateria» (⚙️) guarda les notes de qualsevol mòdul.
- **Sense bateria**: teclat de l'ordinador (`Espai` bombo, `F` caixa, `J` charles, `K` obert, `L` ride, `U` crash, `R T Y` toms; amb `Maj` el cop és fluix) o clics sobre els pads.
- **Retard del so**: prova de 8 clics a ⚙️ per ajustar-lo (altaveus Bluetooth).

## Parts del joc

- **El camí**: 7 nivells amb les 45 cartes (i 3 escalfaments): les peces i el pols · el ritme de rock · contratemps i síncopes · notes fantasma · semicorxeres · shuffle i tresets · toms i breaks. «Et toca» marca el primer repte sense ★★.
- **Toca amb la banda**: qualsevol carta, sense final, amb l'opció «Compte en silenci» (la banda calla dos compassos de cada quatre).
- **Cançons de la biblioteca**: les cançons del Generador de diagrames (mateix codi del professorat que el joc de teclat). Agafa l'estructura, els acords i el tempo; si la fitxa té bateria (seqüenciador o imatge «Patró n»), la fa servir, i si hi ha un break, el toca al final de cada part.
- **Entrenador de tempo**: la banda toca 4 compassos i calla 1, 2, 3, 4, 6, 8, 12, 16 compassos. Mentre calla, res a la pantalla marca el temps. Si en tornar vas a temps (≥ 60 % dels cops al lloc i l'últim compàs dins de ±12 % d'un temps), el silenci següent és més llarg; dues fallades seguides acaben la partida. Rècord per jugador.
- **Inspirador d'estils**: 17 estils (rock, pop, punk, funk, disco, reggae, ska, reggaeton, rumba catalana, cúmbia, blues shuffle, swing, bossa nova, samba, hip-hop, trap, metal amb un sol bombo), cadascun amb una explicació, 2–3 cartes noves dibuixades a l'estil ROCKIN, la seva banda i les cartes ROCKIN que hi encaixen. Les cartes noves per imprimir són a `imprimir/cartes-estils-rockin.pdf` (88 × 63 mm, 8 per A4, amb marques de tall; es generen amb `tools/cartes-estils.html`).
- **El meu perfil**: cada partida es guarda (peces, temps, errors). El perfil resumeix la precisió peça a peça, el control del temps, el tipus de carta que costa més, l'evolució i les últimes partides, i proposa què practicar amb un botó que hi porta.
- **Ajudes que es retiren**: pista i pads que s'encenen → només la pista → només la carta. Dues vegades malament seguides les tornen a posar; tres estrelles en treuen una.

## Arquitectura

HTML + mòduls ES, sense dependències ni bundler (Web Audio directe).

| Fitxer | Què fa |
|---|---|
| `js/app.js` | Pantalles i flux (inici, camí, partida, resultat, configuració, biblioteca). |
| `js/session.js` | Línia de temps (demostració → compte → toques → final), programador d'àudio i jutge. |
| `js/judge.js` | Jutge per peça: finestra per rodona, veredictes, resum i consells. |
| `js/band.js` | La banda sense bateria: estils (rock, pop, funk, festa, electrònica, R&B, balada en tresets…). |
| `js/audio.js` | AudioContext, mostres, bateria, clic, temps «sentit» (corregeix la latència). |
| `js/input.js` | Web MIDI, teclat i clics; mapa de notes. |
| `js/lanes.js` · `js/kit.js` · `js/cardview.js` | Pista, bateria dibuixada i carta amb la pilota i les marques. |
| `js/cards.js` | Peces, cartes, nivells i banda per defecte de cada carta. |
| `js/styles.js` | Estils, cartes noves i cartes ROCKIN relacionades. |
| `js/trainer.js` | Entrenador de tempo (pla de silencis i avaluació). |
| `js/notation.js` | Partitura convencional per pàgines de dos compassos. |
| `js/library.js` | Biblioteca compartida del Generador. |
| `data/cartes.js` | Les cartes: patró per peça i on és cada rodona a la imatge (generat amb `tools/build-data.py` des de `Cartes-rockin/dades.js`). |
| `assets/sons/` | Mostres MIT (vegeu `assets/sons/LLICENCIA.txt`). |

Per provar-lo en local: `python3 tools/serve.py` (obre <http://localhost:8000>).

Dades guardades al navegador: `rockin.bateria.v1` (jugadors, estrelles, configuració) i `rockin.play.biblio.codi` (codi de la biblioteca, compartit amb el joc de teclat).

## Llicència

© 2026 Rockin.cat SCCL. CC BY-NC-SA 4.0 (vegeu `LICENSE.md`). Les mostres de so són MIT (vegeu `assets/sons/LLICENCIA.txt`).
