import test from 'node:test';
import assert from 'node:assert/strict';
import { Stage2, STAGE2_BACKGROUND } from '../src/stages/stage02/stage02.js';
import { CROSSING, LAND } from '../src/stages/stage02/stage02Layout.js';
import {
  HINT_REACH,
  MAX_LAUNCH_X,
  MAX_SWING_ANGLE,
  MAX_SWING_SPEED,
  Vine,
} from '../src/stages/stage02/objects/vine.js';
import { PortalOpening } from '../src/stages/stage01/portalOpening.js';
import { CHARACTERS } from '../src/entities/player/characters.js';
import { preloadImage } from '../src/entities/player/characterAssets.js';
import { interactionBindings } from '../src/core/input.js';
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

test('both players must jump from the log to grab the swayable vine', () => {
  const stage = new Stage2(CHARACTERS.slice(0, 2));
  const bindings = interactionBindings([null, null]);
  const [first, second] = stage.players;
  const vine = stage.vine;
  const step = (id, action) =>
    stage.update(
      STEP,
      [0, 1].map((i) => (i === id ? { ...idle(), ...action } : idle())),
    );
  advance(stage, 0, 285);
  const originalX = vine.grip.x;
  for (let i = 0; i < 95; i++) {
    step(first.id, { jump: i === 0, move: i < 42 ? 1 : 0 });
    assert.equal(vine.canGrab(first, stage.solids), false);
  }
  assert.notEqual(vine.grip.x, originalX);
  assertOn(first, LAND.low);
  advance(stage, second.id, 278);
  advance(stage, second.id, 368, true);
  const grab = (player) => {
    advance(stage, player.id, Math.round(vine.grip.x - 6));
    assert.equal(vine.canGrab(player, stage.solids), false);
    assert.ok(
      stage
        .getVineHints(bindings)
        .some((hint) => hint.player === player && hint.binding.label === bindings[player.id].label),
    );
    step(player.id, { jump: true });
    for (let i = 0; i < 50 && !vine.canGrab(player, stage.solids); i++) step(player.id, {});
    assert.ok(
      stage
        .getVineHints(bindings)
        .some((hint) => hint.player === player && hint.object === vine.grip),
    );
    step(player.id, { interact: true });
  };
  grab(first);
  assert.equal(first.hanging, stage.vine);
  assert.ok(!second.hanging);
  assert.deepEqual(stage.getVineHints(bindings), []);
  step(first.id, { interact: true });
  for (let i = 0; i < 70; i++) step(first.id, { interactHeld: true });
  assert.equal(first.hanging, null);
  assertOn(first, LAND.low);
  grab(second);
  assert.equal(second.hanging, stage.vine);
  for (let i = 0; i < 120; i++) {
    step(second.id, { move: 1 });
    assert.equal(second.y + 12, vine.grip.y);
    assert.equal(second.vy, 0);
  }
  for (let i = 0; i < 900; i++) step(second.id, {});
  assert.ok(Math.abs(vine.angle) < 0.03);
  for (let i = 0; i < 34; i++) step(second.id, { move: 1 });
  assert.ok(vine.angularVelocity > 0.3);
  step(second.id, { jump: true });
  assert.equal(second.hanging, null);
  assert.ok(second.vx > 0 && second.vx <= MAX_LAUNCH_X && second.vy < 0);
  const momentum = second.swingMomentum;
  step(second.id, { interactHeld: true, move: -0.2 });
  assert.ok(second.swingMomentum < momentum && second.vx < momentum);
  for (let i = 0; i < 130; i++) step(second.id, { interactHeld: true });
  assert.ok(second.grounded && !second.hanging);
  assert.equal(second.swingMomentum, 0);
});

test('an early press is consumed on approach during ascent, descent, and horizontal travel', () => {
  for (const { dx, dy, vy, move } of [
    { dx: 0, dy: 41, vy: -280, move: 0 },
    { dx: 0, dy: -41, vy: 220, move: 0 },
    { dx: -38, dy: -6, vy: 0, move: 1 },
  ]) {
    const stage = new Stage2(CHARACTERS.slice(0, 2));
    stage.motion = { matches: true };
    const player = stage.players[0];
    const { vine } = stage;
    Object.assign(player, {
      x: vine.grip.x - 6 + dx,
      y: vine.grip.y - 12 + dy,
      vy,
      grounded: false,
    });
    assert.equal(vine.canGrab(player, stage.solids), false);
    stage.update(STEP, [{ ...idle(), move, interact: true }, idle()]);
    assert.ok(!player.hanging);
    for (let i = 0; i < 15 && !player.hanging; i++)
      stage.update(STEP, [{ ...idle(), move }, idle()]);
    assert.equal(player.hanging, vine);
    assert.equal(player.y + 12, vine.grip.y);
    stage.update(STEP, [{ ...idle(), interact: true }, idle()]);
    stage.update(STEP, [{ ...idle(), interact: true }, idle()]);
    assert.equal(player.hanging, null, 'an immediate second press after release does not regrab');
  }
});

test('an expired press and a held key cannot attach, while a new press works near the apex', () => {
  const stage = new Stage2(CHARACTERS.slice(0, 2));
  stage.motion = { matches: true };
  const [player] = stage.players;
  stage.update(STEP, [{ ...idle(), interact: true }, idle()]);
  for (let i = 0; i < 20; i++) stage.update(STEP, [{ ...idle(), interactHeld: true }, idle()]);
  const { vine } = stage;
  Object.assign(player, { x: vine.grip.x - 6, y: vine.grip.y - 12 + 17, vy: 0, grounded: false });
  stage.update(STEP, [{ ...idle(), interactHeld: true }, idle()]);
  assert.ok(!player.hanging);
  stage.update(STEP, [{ ...idle(), interact: true }, idle()]);
  assert.equal(player.hanging, vine);
});

test('a short grazing pass can grab, but an obstructed snap cannot', () => {
  const vine = new Vine({ x: 100, y: 100, length: 190 });
  const player = { x: 97, y: 301.9, w: 28, h: 56, facing: 1, grounded: false };
  const previousOffset = { x: -3, y: 23.9 };
  assert.equal(vine.canGrab(player, []), false);
  assert.equal(vine.canGrab(player, [], previousOffset), true);
  assert.equal(vine.canGrab(player, [{ x: 90, y: 285, w: 50, h: 10 }], previousOffset), false);
  Object.assign(player, { x: 94, y: 286, grounded: true });
  assert.equal(vine.canGrab(player, [{ x: 70, y: 342, w: 80, h: 10 }]), true);
});

test('hint range has hysteresis and stays wider than the actual reach', () => {
  const stage = new Stage2(CHARACTERS.slice(0, 2));
  const player = stage.players[0];
  const bindings = interactionBindings([null, null]);
  const aim = (distance) =>
    Object.assign(player, {
      x: stage.vine.grip.x - 6,
      y: stage.vine.grip.y + distance - 12,
      grounded: false,
    });
  aim(HINT_REACH + 5);
  assert.deepEqual(stage.getVineHints(bindings), []);
  aim(HINT_REACH - 1);
  assert.equal(stage.getVineHints(bindings)[0].binding.label, 'E');
  assert.equal(stage.vine.canGrab(player, stage.solids), false);
  aim(HINT_REACH + 5);
  assert.equal(stage.getVineHints(bindings).length, 1);
  aim(HINT_REACH + 11);
  assert.deepEqual(stage.getVineHints(bindings), []);
});

test('a held direction swings through both sides and timed input builds more speed', () => {
  function sample(policy) {
    const vine = new Vine({ x: 0, y: 0, length: 190 });
    vine.occupant = { facing: 1, w: 28 };
    const samples = [];
    for (let i = 0; i < 1600; i++) {
      vine.update(STEP, policy(vine), []);
      if (i >= 800) samples.push([vine.angle, vine.angularVelocity]);
    }
    assert.ok(
      samples.every(
        ([angle, velocity]) =>
          Math.abs(angle) < MAX_SWING_ANGLE && Math.abs(velocity) <= MAX_SWING_SPEED,
      ),
    );
    return samples;
  }
  const held = sample(() => 1);
  const heldLeft = sample(() => -1);
  const timed = sample((vine) => Math.sign(vine.angularVelocity || 1));
  assert.ok(held.some(([angle, speed]) => angle > 0.35 && speed < -0.4));
  assert.ok(held.some(([angle, speed]) => angle < -0.25 && speed > 0.4));
  assert.ok(heldLeft.some(([angle, speed]) => angle < -0.35 && speed > 0.4));
  assert.ok(heldLeft.some(([angle, speed]) => angle > 0.25 && speed < -0.4));
  const peak = (samples) => Math.max(...samples.map(([, speed]) => Math.abs(speed)));
  assert.ok(peak(timed) > peak(held) + 0.2);
});

test('release uses both tangent components and extends a jump past the normal range', () => {
  for (const direction of [-1, 1]) {
    const stage = new Stage2(CHARACTERS.slice(0, 2));
    const player = stage.players[0];
    const { vine } = stage;
    vine.angle = direction * 0.22;
    Object.assign(vine.grip, vine.tipAt(vine.angle));
    Object.assign(player, vine.hangingBounds(player), { grounded: false });
    assert.ok(vine.grab(player, stage.solids));
    vine.angularVelocity = direction * 1.9;
    const startX = player.x;
    const baseline = new Stage2(CHARACTERS.slice(0, 2));
    const walker = baseline.players[0];
    Object.assign(walker, { x: startX, y: player.y, grounded: true });
    baseline.update(STEP, [{ ...idle(), jump: true, move: direction }, idle()]);
    for (let i = 0; i < 120 && !walker.grounded; i++) {
      baseline.update(STEP, [{ ...idle(), move: direction }, idle()]);
    }
    stage.update(STEP, [{ ...idle(), jump: true, move: -direction }, idle()]);
    assert.equal(Math.sign(player.vx), direction, 'opposite input does not reverse the release');
    assert.ok(player.vy < -500 + 1600 * STEP, 'upward swing adds to the launch');
    for (let i = 0; i < 120 && !player.grounded; i++) {
      stage.update(STEP, [{ ...idle(), move: direction }, idle()]);
    }
    assert.ok(player.grounded);
    assert.ok(
      (player.x - walker.x) * direction > 65,
      'exceeds a normal running jump from the same point',
    );
    if (direction === 1) assertOn(player, LAND.nearBank);
  }
});

test('either player loses exactly one pip, then returns to their start while their partner stays in play', () => {
  for (const id of [0, 1]) {
    const stage = new Stage2(CHARACTERS.slice(0, 2));
    const partner = stage.players[1 - id];
    const player = stage.players[id];
    const originalSpawn = player.x;
    const session = stage.session;
    stage.session.gems.blue = true;
    assert.ok(stage.solids.every(({ x, w }) => x + w <= CROSSING.left || x >= CROSSING.right));
    Object.assign(player, { x: CROSSING.left - 2, y: LAND.nearBank.y - player.h });
    const before = [partner.x, partner.y];
    let enteredGap = false;
    let fellBelowBank = false;
    for (let frame = 0; frame < 160 && stage.players[id] === player; frame++) {
      stage.update(
        STEP,
        [0, 1].map((index) => (index === id ? { ...idle(), jump: frame === 0, move: 1 } : idle())),
      );
      enteredGap ||= player.x >= CROSSING.left && player.x + player.w < CROSSING.right;
      fellBelowBank ||= enteredGap && player.y + player.h > LAND.nearBank.y && !player.grounded;
    }
    assert.ok(enteredGap && fellBelowBank);
    assert.ok(player.y >= 684);
    const returned = stage.players[id];
    assert.notEqual(returned, player);
    assert.equal(returned.character, player.character);
    assert.equal(returned.x, originalSpawn);
    assertOn(returned, LAND.entrance);
    assert.deepEqual([partner.x, partner.y], before);
    assert.equal(stage.players[1 - id], partner);
    assert.equal(stage.session, session);
    assert.equal(stage.session.gems.blue, true);
    assert.equal(stage.health[id].value, 3);
    assert.equal(stage.health[1 - id].value, 4);
    assert.equal(stage.respawns[id].playerOpacity, 0);
    for (let frame = 0; frame < 50; frame++)
      stage.update(STEP, [
        { ...idle(), move: -1 },
        { ...idle(), move: -1 },
      ]);
    assert.equal(returned.x, originalSpawn, 'input is locked during the local effect');
    assert.ok(partner.x < before[0], 'partner can continue moving');
    for (let frame = 0; frame < 45; frame++) stage.update(STEP, [idle(), idle()]);
    assert.equal(stage.respawns[id], null);
    assert.equal(stage.health[id].value, 3);
    stage.update(STEP, [
      { ...idle(), move: 1 },
      { ...idle(), move: 1 },
    ]);
    assert.ok(returned.x > originalSpawn);
  }
});

test('zero HP remains visible until the fallen player returns, then only that player is replenished', () => {
  const stage = new Stage2(CHARACTERS.slice(0, 2));
  stage.health[0].value = 1;
  stage.health[1].value = 2;
  stage.players[0].y = 685;
  stage.update(STEP, [idle(), idle()]);
  assert.equal(stage.health[0].value, 0);
  for (let i = 0; i < 120; i++) stage.update(STEP, [idle(), idle()]);
  assert.deepEqual(
    stage.health.map(({ value }) => value),
    [4, 2],
  );
});

test('a local portal draws one arrival ring without dimming or flashing the canvas', () => {
  const portal = new PortalOpening({ local: true });
  const rings = [],
    fills = [];
  portal.update(0.6);
  portal.draw(
    {
      canvas: { width: 1200, height: 660 },
      save() {},
      restore() {},
      beginPath() {},
      stroke() {},
      ellipse(x, y) {
        rings.push([x, y]);
      },
      fillRect(x, y, w, h) {
        fills.push([x, y, w, h]);
      },
    },
    [{ x: 156, y: 544, w: 28, h: 56 }],
  );
  assert.deepEqual(rings, [[170, 572]]);
  assert.ok(fills.every(([, , w, h]) => w === 2 && h === 2));
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
