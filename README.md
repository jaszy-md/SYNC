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
