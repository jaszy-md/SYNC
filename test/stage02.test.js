import test from 'node:test';
import assert from 'node:assert/strict';
import { Stage2, STAGE2_BACKGROUND } from '../src/stages/stage02/stage02.js';
import { PortalOpening } from '../src/stages/stage01/portalOpening.js';
import { CHARACTERS } from '../src/entities/player/characters.js';
import { preloadImage } from '../src/entities/player/characterAssets.js';
import { idle, makeStage } from '../test-support/stage.js';

test('both jungle players use the normal movement, jump and collision loop on one floor', () => {
  const characters = CHARACTERS.slice(2, 4);
  const stage = new Stage2(characters);
  const start = stage.players.map((player) => player.x);
  assert.equal(stage.solids.length, 1);
  assert.deepEqual(
    stage.players.map((p) => p.character),
    characters,
  );
  const move = [
    { ...idle(), move: -1 },
    { ...idle(), move: 1 },
  ];
  stage.update(1 / 120, move);
  assert.ok(stage.players.every((player) => player.grounded && player.walkElapsedMs > 0));
  assert.equal(stage.players[0].vx, -stage.players[1].vx);
  assert.deepEqual(
    stage.players.map((player) => player.facing),
    [-1, 1],
  );
  stage.update(
    1 / 120,
    move.map((input) => ({ ...input, jump: true, shoot: true, interact: true })),
  );
  assert.ok(stage.players[0].x < start[0] && stage.players[1].x > start[1]);
  assert.ok(stage.players.every((p) => !p.grounded && p.vy < 0 && p.interactPoseMs === 0));
  assert.deepEqual(
    stage.players.map((p) => p.abilities),
    [{ jumpSpeed: 500 }, { jumpSpeed: 500 }],
  );
  const facility = makeStage();
  assert.ok(facility.players[0].abilities.jumpSpeed > facility.players[1].abilities.jumpSpeed);
  assert.equal(stage.blaster, undefined);
  assert.equal(stage.symbolPuzzle, undefined);
  assert.equal(stage.energyPuzzle, undefined);
  for (let i = 0; i < 600; i++) {
    stage.update(1 / 120, move);
    assert.equal(stage.players[0].y, stage.players[1].y);
  }
  assert.deepEqual(
    stage.players.map((player) => player.x),
    [0, 1200 - stage.players[1].w],
  );
  assert.ok(stage.players.every((p) => p.grounded && p.y + p.h === stage.solids[0].y));
  assert.equal(stage.complete, false);
});

test('gameplay draws a jungle fallback, then uses the loaded image behind the players with the trail at floor height', async (t) => {
  const stage = new Stage2(CHARACTERS.slice(0, 2));
  const calls = [];
  const raster = {
    getContext: () => ({
      createRadialGradient: () => ({ addColorStop() {} }),
      fillRect() {},
      save() {},
      restore() {},
      translate() {},
      scale() {},
    }),
  };
  const saved = new Map(
    ['document', 'Image'].map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]),
  );
  t.after(() => {
    for (const [key, descriptor] of saved) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  });
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: { createElement: () => raster },
  });
  const ctx = {
    globalAlpha: 1,
    drawImage(...args) {
      calls.push(args);
    },
    fillRect() {},
    save() {},
    restore() {},
    strokeRect() {},
    scale() {},
  };
  stage.players.forEach((player) => {
    player.draw = () => calls.push(player.id);
  });
  stage.draw(ctx);
  assert.deepEqual(calls.slice(0, 3), [[raster, 0, 0, 1200, 660], 0, 1]);

  Object.defineProperty(globalThis, 'Image', {
    configurable: true,
    value: class {
      naturalWidth = 1672;
      naturalHeight = 941;
      set src(path) {
        this.path = path;
        this.onload();
      }
    },
  });
  const loaded = await preloadImage(STAGE2_BACKGROUND);
  calls.length = 0;
  stage.draw(ctx);
  const [image, x, y, w, h] = calls[0];
  assert.equal(image, loaded);
  assert.equal(image.path, '/assets/images/stage2/stage2-background.png');
  assert.ok(Math.abs(w / h - 1672 / 941) < 1e-10);
  assert.ok(x <= 0 && Math.abs(y) < 1e-9 && x + w >= 1200 && y + h >= 660);
  assert.ok(Math.abs(y + h * 0.81 - stage.solids[0].y) < 1e-9);
  assert.deepEqual(calls.slice(1, 3), [0, 1]);

  const portals = [];
  Object.assign(ctx, {
    canvas: { width: 1200, height: 660 },
    beginPath() {},
    stroke() {},
    ellipse(x, y) {
      portals.push([x, y]);
    },
  });
  stage.opening = new PortalOpening();
  stage.opening.update(0.6);
  stage.draw(ctx);
  assert.deepEqual(
    portals,
    stage.players.map((p) => [p.x + p.w / 2, p.y + p.h / 2]),
  );
});
