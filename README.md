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

### Menu journey

The homepage keeps its existing world-position, delta-time and four-layer parallax system in `src/ui/animatedWorldBackground.js`. `BIOMES` defines `[phase, facility, vegetation, sand, pyramids]` spatial keyframes. Ground palettes and materials blend within the landscape. Sahara persists to the end; the only deliberate discontinuity is the portal return to the facility. `JOURNEY.duration` controls the default 56-second trip; `JOURNEY.characters` can hide the travelers.

- `src/ui/menuEnvironment.js`: connected industrial wings, ducts/catwalks, tropical tree variants, ruins, Egyptian monuments, pyramid props and ground materials. Replace individual prop renderers with future illustrations without changing the journey system.
- `src/ui/menuTravelers.js`: all unique playable characters, original cached sprites, staggered walking, one randomized jumper at a time, shared ground contact and responsive bounds below/beside the menu. Character selection remains independent.
- `src/ui/portalEffect.js`: reuses the original Stage 1 mechanical portal renderer and its 64:90 frame proportions, adding clipped streaming energy and beveled edges. After the 56-second landscape trip the world position freezes; all seven travelers walk into the energy plane in rightmost-first order, with at most one absorbing at a time. Only after the final disappearance does a brief 0.5-second glow mask the return to the facility. Characters draw in front of the frame and are clipped only at the opening. Reduced motion freezes a right-facing side pose and suppresses entries/glow. No Stage 1 code or source sprites are changed. Jump sprites already face right and remain unmirrored; both left-facing walk poses are mirrored.

Secondary views freeze the journey; gameplay hides it; hidden tabs/reduced motion stop scheduling. The background has a `destroy()` lifecycle hook for listener/animation cleanup. `test/menuWorld.test.js` checks biome continuity, landmark distribution, unique travelers and jumps, mobile bounds, full-reset masking, repeat geometry and animation lifecycle. The menu HTML, CSS, navigation and Stage 1 remain unchanged by V2.
