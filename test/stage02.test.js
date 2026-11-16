import test from 'node:test';
import assert from 'node:assert/strict';
import { Stage2, STAGE2_BACKGROUND } from '../src/stages/stage02/stage02.js';
import { CROSSING, LAND } from '../src/stages/stage02/stage02Layout.js';
import { PortalOpening } from '../src/stages/stage01/portalOpening.js';
import { CHARACTERS } from '../src/entities/player/characters.js';
import { preloadImage } from '../src/entities/player/characterAssets.js';
import { idle, makeStage } from '../test-support/stage.js';

const STEP = 1 / 120;

function advance(stage, id, target, jump = false) {
  // Steer through the normal fixed-step player loop and wait for landing.
  for (let frame = 0; frame < 160; frame++) {
    const player = stage.players[id];
    const difference = target - player.x;
    if (frame > 0 && player.grounded && Math.abs(difference) <= 1) return;
    const inputs = [idle(), idle()];
    Object.assign(inputs[id], {
      move: Math.abs(difference) <= 1 ? 0 : Math.sign(difference),
      jump: jump && frame === 0,
    });
    stage.update(STEP, inputs);
  }
  assert.fail(`Player ${id + 1} could not land at x=${target}`);
}

function assertOn(player, surface) {
  assert.ok(player.grounded);
  assert.equal(player.y + player.h, surface.y);
  assert.ok(player.x < surface.x + surface.w && player.x + player.w > surface.x);
}

test('both jungle players retain the same neutral movement, jump and facing', () => {
  const characters = CHARACTERS.slice(2, 4);
  const stage = new Stage2(characters);
  const start = stage.players.map((player) => player.x);
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
  for (let i = 0; i < 80; i++) {
    stage.update(STEP, [idle(), idle()]);
    assert.equal(stage.players[0].y, stage.players[1].y);
  }
  stage.players.forEach((player) => assertOn(player, LAND.entrance));
  assert.equal(stage.complete, false);
});

test('both players can land on every mandatory parkour step and the upper perch', () => {
  const stage = new Stage2(CHARACTERS.slice(2, 4));
  for (const player of stage.players) {
    advance(stage, player.id, 278);
    advance(stage, player.id, 346, true);
    assertOn(player, LAND.low);
    advance(stage, player.id, 385);
    advance(stage, player.id, 446, true);
    assertOn(player, LAND.high);
    advance(stage, player.id, 480);
    advance(stage, player.id, 616, true);
    assertOn(player, LAND.lower);
    advance(stage, player.id, 643);
    advance(stage, player.id, 710, true);
    assertOn(player, LAND.nearBank);
    advance(stage, player.id, 760, true);
    assertOn(player, LAND.perch);
  }
});

test('a missed parkour jump can be recovered from the basin via the foothold', () => {
  const stage = new Stage2(CHARACTERS.slice(0, 2));
  const player = stage.players[0];
  Object.assign(player, { x: 478, y: LAND.high.y - player.h });
  advance(stage, player.id, 518);
  assertOn(player, LAND.basin);
  advance(stage, player.id, 561, true);
  assertOn(player, LAND.foothold);
  advance(stage, player.id, 611, true);
  assertOn(player, LAND.lower);
});

test('the broken crossing has no collision and only the fallen player respawns', () => {
  const stage = new Stage2(CHARACTERS.slice(0, 2));
  const partner = stage.players[0];
  const player = stage.players[1];
  stage.session.gems.blue = true;
  assert.ok(stage.solids.every(({ x, w }) => x + w <= CROSSING.left || x >= CROSSING.right));
  Object.assign(player, { x: CROSSING.left - 2, y: LAND.nearBank.y - player.h });
  const before = [partner.x, partner.y];
  let enteredGap = false;
  let fellBelowBank = false;
  for (let frame = 0; frame < 160 && stage.players[1] === player; frame++) {
    stage.update(STEP, [idle(), { ...idle(), jump: frame === 0, move: 1 }]);
    enteredGap ||= player.x >= CROSSING.left && player.x + player.w < CROSSING.right;
    fellBelowBank ||= enteredGap && player.y + player.h > LAND.nearBank.y && !player.grounded;
  }
  assert.ok(enteredGap && fellBelowBank);
  assert.notEqual(stage.players[1], player);
  assert.equal(stage.players[1].character, player.character);
  assertOn(stage.players[1], LAND.nearBank);
  assert.deepEqual([partner.x, partner.y], before);
  assert.equal(stage.players[0], partner);
  assert.equal(stage.session.gems.blue, true);
  assert.deepEqual(
    stage.health.map(({ value }) => value),
    [4, 4],
  );
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
    fillText() {},
    save() {},
    restore() {},
    strokeRect() {},
    scale() {},
    createLinearGradient: () => ({ addColorStop() {} }),
    beginPath() {},
    moveTo() {},
    lineTo() {},
    quadraticCurveTo() {},
    stroke() {},
    fill() {},
    translate() {},
    rotate() {},
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
