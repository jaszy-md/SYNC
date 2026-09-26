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

Open de URL die Vite toont. `npm run preview` bekijkt de productiebuild. Voeg `?debug=true` toe voor FPS, posities, collision boxes, gamepads en objectstates. De tests gebruiken de ingebouwde Node test runner.

## Codekwaliteit

Dit project is **SYNC Level 1**, met Stage 1, Stage 2 en Stage 3 als afzonderlijke stages. Alleen Stage 1 is momenteel geïmplementeerd.

```sh
npm run format       # Prettier schrijft consistente opmaak
npm run format:check # Controleert opmaak zonder wijzigingen
npm run lint         # ESLint flat config + recommended regels
npm run lint:fix     # Alleen automatisch oplosbare lintproblemen
npm run check        # Lint, opmaak, tests en productiebuild
```

Prettier gebruikt puntkomma's, enkele quotes, twee spaties en een richtbreedte van 100 tekens. Gegenereerde mappen worden overgeslagen.

- `src/ui/ui.js` bevat navigatie en event handlers; `src/ui/screens/` bevat de schermtemplates en `src/ui/components/` de gedeelde HTML-functies.
- `src/style.css` bevat de vormgeving; dynamische characterkleuren en viewport-schaling blijven runtime-waarden.
- `src/stages/stage01/stage01.js` bevat de puzzelregels; `stage01View.js` in dezelfde map tekent de wereld op Canvas. `stage01Config.js`, `players/abilities.js` en `stage01ObjectSetup.js` bevatten de stageconfiguratie, spelerabilities en objectplaatsing.
- `src/core/` bevat gamestate, input en stagekeuze; `src/core/physics/` bevat collisiondetectie en bewegingsresolutie.
- `src/entities/player/` bevat de bestaande playerclass, beweging en rendering; `src/entities/objects/` bevat één bestand per bestaand objecttype.
- `public/assets/characters/character-a/` t/m `character-d/` zijn bedoeld voor `select.png`, `idle.png`, `walk.png`, `jump.png` en `crouch.png`. Ontbrekende poses gebruiken de bestaande vormen als fallback. Voeg bestanden toe vóór het bouwen; herlaad de pagina na het toevoegen van eerder ontbrekende bestanden.
- `public/assets/images/home/group-characters.png` bevat de homepage-afbeelding.
