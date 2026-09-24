# SYNC · Level 1 · Stage 1: Ontdekken

Eerste local co-op Canvas-prototype, gebaseerd op het SYNC-projectplan (23 september 2026). Alleen twee lokale spelers; geen backend of externe assets.

## Starten

Node.js 20.19+ of 22.12+.

```sh
npm install
npm run dev
npm test
npm run build
```

Open de URL die Vite toont. `npm run preview` bekijkt de productiebuild. Voeg `?debug=true` toe voor FPS, posities, collision boxes, gamepads en objectstates. Er is geen lint-tool ingericht; de tests gebruiken de ingebouwde Node test runner.

## Spelen

START → player setup → character select → controls → Stage 1 → STAGE 1 COMPLETE.

| Actie | Player 1 | Player 2 |
|---|---|---|
| Bewegen | A / D | ← / → |
| Springen | W | ↑ |
| Bukken | S | ↓ |
| Interactie | E | Enter |
| Pauze | Esc | Esc |

Gamepad is optioneel: druk een knop op de controller, detecteer hem op het controls-scherm en koppel hem aan een speler. Standaard Gamepad API-layout: stick/D-pad bewegen, onderste knop springen, linker knop interactie, D-pad omlaag bukken. Keyboard blijft beschikbaar. Niet-standaard controllers kunnen andere knoppen hebben. Bij focusverlies pauzeert het spel.

P1 is deze stage de verkenner, P2 de bediener, onafhankelijk van hun gekozen character. P1 springt op het hoge linker platform en leest de hint met E. P1 blijft bij de hint en vertelt het symbool aan P2. P2 bedient beneden de juiste schakelaar met Enter. Een platform en sleutel verschijnen. P1 springt via het groene platform naar de sleutel en pakt die met E. Beide spelers gaan rechts naar de deur en houden samen E en Enter vast. De lage balk kan bukkend gepasseerd worden.

Een enkel avatar kan de puzzel niet oplossen: lezen/sleutel en schakelaars vereisen verschillende abilities, de schakelaar vereist de aanwezigheid van de verkenner, en de uitgang vereist beide spelers. Op één gedeeld scherm is informatie niet letterlijk privé; alleen de verkenner kan de hint onthullen. Of dit daadwerkelijk gesprekken uitlokt, vraagt een playtest met twee mensen. Keyboard rollover verschilt per toetsenbord; bij gemiste gelijktijdige toetsen kan een speler een gamepad gebruiken.

## Structuur

- `src/main.js`: schermflow, requestAnimationFrame, delta time met vaste 120 Hz physics-substappen, Canvas-rendering.
- `src/gameState.js`: centrale MENU / SETUP / PLAYING / PAUSED / STAGE_COMPLETE state. Setup heeft drie schermstappen.
- `src/input.js`: keyboard mappings en eenvoudige controllerkoppeling.
- `src/player.js`: Player met apart characterprofiel en stage-abilityconfiguratie.
- `src/collision.js`: rechthoekcollision per as, inclusief vrije ruimte bij opstaan.
- `src/objects.js`: Platform, Hint, Switch, Key, Door en Trigger met eigen states.
- `src/stageManager.js` + `src/stages/stage1.js`: stageconstructie en puzzelvoorwaarden.
- `test/game.test.js`: movement, bereikbaarheid, objectstates en co-opvoorwaarden.

Alle graphics zijn Canvas-placeholders. Vervang later `Player.draw()` en de object-`draw()`-methodes door spriteweergave; behoud de gameplayrechthoeken en abilities. Plaats toekomstige bestanden bijvoorbeeld in `public/assets/characters`, `objects`, `backgrounds`, `audio/music` en `audio/sfx`. Er is nog geen assetloader of audio nodig.

Een volgende stage implementeert hetzelfde kleine contract (`players`, `message`, `complete`, `update`, `draw`) en krijgt een entry in `stageManager.js`. Stel abilities en objecten in zijn constructor in. Stage 2 en 3 zijn bewust niet geïmplementeerd.

## Korte handmatige controle

Kies C voor P1 en A voor P2; probeer gelijktijdig lopen/springen/bukken. Probeer een verkeerde schakelaar en een schakelaar zonder P1 bij de hint. Haal de sleutel, ga eerst met één speler naar de uitgang en voltooi daarna samen. Controleer pauze, hervatten en opnieuw starten. Fysieke gamepads en communicatie tussen echte spelers vragen een lokale playtest.
