import test from 'node:test';
import assert from 'node:assert/strict';
import { Stage2, STAGE2_BACKGROUND } from '../src/stages/stage02/stage02.js';
import { CROSSING, LAND, QUICKSAND } from '../src/stages/stage02/stage02Layout.js';
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

function stepPlayer(stage, id, action = {}) {
  stage.update(
    STEP,
    [0, 1].map((i) => (i === id ? { ...idle(), ...action } : idle())),
  );
}

function grabFromLog(stage, id) {
  const player = stage.players[id];
  const { vine } = stage;
  advance(stage, id, 278);
  advance(stage, id, 374, true);
  advance(stage, id, Math.min(414, Math.round(vine.grip.x - 6)));
  assertOn(player, LAND.low);
  assert.equal(vine.canGrab(player, stage.solids), false);
  const bindings = interactionBindings([null, null]);
  assert.ok(stage.getVineHints(bindings).some((hint) => hint.player === player));
  stepPlayer(stage, id, { jump: true });
  for (let i = 0; i < 50 && !vine.canGrab(player, stage.solids); i++) stepPlayer(stage, id);
  stepPlayer(stage, id, { interact: true });
  assert.equal(player.hanging, vine);
  assert.equal(player.y + 12, vine.grip.y);
  return player;
}

test('a running jump from the very edge falls short and sinks before a local respawn', () => {
  for (const id of [0, 1]) {
    const stage = new Stage2(CHARACTERS.slice(0, 2));
    stage.session.gems.blue = true;
    const player = stage.players[id];
    const partner = stage.players[1 - id];
    const partnerPosition = [partner.x, partner.y];
    const spawnX = player.x;
    const health = stage.health[id];
    advance(stage, id, 278);
    advance(stage, id, 376, true);
    advance(stage, id, QUICKSAND.x - 1);
    assertOn(player, LAND.low);
    stepPlayer(stage, id, { move: 1, jump: true });
    for (let i = 0; i < 110 && !stage.sinking[id]; i++) stepPlayer(stage, id, { move: 1 });
    assert.ok(stage.sinking[id]);
    assert.equal(player.y + player.h, QUICKSAND.y);
    const { x, y } = player;
    for (let i = 0; i < 45; i++) stepPlayer(stage, id, { move: 1, jump: true, interact: true });
    assert.equal(player.x, x);
    assert.ok(player.y > y + 15 && player.y < y + player.h);
    assert.equal(health.value, 4);
    assert.equal(stage.players[id], player);
    for (let i = 0; i < 160 && !stage.respawns[id]; i++) stepPlayer(stage, id);
    assert.ok(stage.respawns[id]?.active);
    assert.equal(health.value, 3);
    assert.equal(stage.players[id].x, spawnX);
    assertOn(stage.players[id], LAND.entrance);
    for (let i = 0; i < 120; i++) stepPlayer(stage, id);
    assert.equal(health.value, 3);
    assert.equal(stage.respawns[id], null);
    assert.equal(stage.sinking[id], null);
    assert.equal(stage.health[1 - id].value, 4);
    assert.equal(stage.players[1 - id], partner);
    assert.deepEqual([partner.x, partner.y], partnerPosition);
    assert.equal(stage.session.gems.blue, true);
    assert.equal(stage.complete, false);
  }
});

test('Player 2 reaches the far shore from the log using only jump, grab and swing inputs', () => {
  const stage = new Stage2(CHARACTERS.slice(2, 4).reverse());
  const { vine } = stage;
  const player = grabFromLog(stage, 1);
  for (let i = 0; i < 140 && !(vine.angle > 0.25 && vine.angularVelocity > 0.35); i++) {
    stepPlayer(stage, 1, { move: 1 });
    assert.equal(player.y + 12, vine.grip.y);
  }
  assert.ok(vine.angle > 0.25 && vine.angularVelocity > 0.35);
  stepPlayer(stage, 1, { move: 1, jump: true });
  assert.equal(player.hanging, null);
  assert.ok(player.swingMomentum > 0 && player.vy < 0);
  assert.ok(player.vx > 0 && player.vx <= MAX_LAUNCH_X);
  for (let i = 0; i < 140 && !player.grounded; i++) stepPlayer(stage, 1, { move: 1 });
  assertOn(player, LAND.lower);
  advance(stage, 1, 646);
  advance(stage, 1, 710, true);
  assertOn(player, LAND.nearBank);
  advance(stage, 1, 760, true);
  assertOn(player, LAND.perch);
});

test('Player 1 loses grip on a right swing and speaks only after her first quicksand respawn', () => {
  const stage = new Stage2(CHARACTERS.slice(2, 4));
  stage.motion = { matches: true };
  stage.session.gems.blue = true;
  const partner = stage.players[1];
  const partnerPosition = [partner.x, partner.y];
  const health = stage.health[0];
  const runAttempt = () => {
    const player = grabFromLog(stage, 0);
    for (let i = 0; i < 50; i++) stepPlayer(stage, 0);
    assert.equal(player.hanging, stage.vine);
    assert.equal(stage.vineInput[0].slipAt, 0);
    for (let i = 0; i < 160 && stage.vine.angle > -0.18; i++) stepPlayer(stage, 0, { move: -1 });
    assert.ok(stage.vine.angle <= -0.18);
    assert.equal(player.hanging, stage.vine);
    assert.equal(stage.vineInput[0].slipAt, 0);

    const earlierSpeech = stage.slipMessage;
    for (let i = 0; i < 280 && !stage.vineInput[0].slipAt; i++) stepPlayer(stage, 0, { move: 1 });
    assert.ok(stage.vineInput[0].slipAt > stage.time);
    assert.ok(stage.vine.angle > 0 && stage.vine.angularVelocity > 0);
    assert.equal(player.y + 12, stage.vine.grip.y);
    for (let i = 0; i < 25 && player.hanging; i++)
      stepPlayer(stage, 0, { move: -1, jump: true, interact: true });
    assert.equal(player.hanging, null);
    assert.ok(player.x >= QUICKSAND.x && player.y + player.h < QUICKSAND.y);
    assert.ok(player.vy > 0, 'the player starts falling under gravity');
    assert.equal(stage.sinking[0], null);
    assert.equal(stage.slipMessage, earlierSpeech);

    const before = health.value;
    for (let i = 0; i < 80 && !stage.sinking[0]; i++) {
      stepPlayer(stage, 0, { move: -1, jump: true, interact: true });
      assert.equal(stage.slipMessage, earlierSpeech);
    }
    assert.ok(stage.sinking[0]);
    assert.equal(player.y + player.h, QUICKSAND.y);
    for (let i = 0; i < 30; i++) stepPlayer(stage, 0, { move: 1, jump: true });
    assert.equal(health.value, before);
    assert.ok(player.y + player.h > QUICKSAND.y);
    for (let i = 0; i < 140 && !stage.respawns[0]; i++) stepPlayer(stage, 0);
    assert.ok(stage.respawns[0]?.active);
    assert.equal(health.value, before - 1);
    assert.equal(stage.slipMessage, earlierSpeech);
    while (stage.respawns[0]?.active) {
      assert.equal(stage.slipMessage, earlierSpeech);
      stepPlayer(stage, 0);
    }
    assertOn(stage.players[0], LAND.entrance);
    assert.deepEqual([partner.x, partner.y], partnerPosition);
    assert.equal(stage.players[1], partner);
    assert.equal(stage.health[1].value, 4);
    assert.equal(stage.session.gems.blue, true);
  };
  runAttempt();
  const reply = stage.slipMessage;
  assert.equal(reply.index, 0);
  assert.equal(reply.until - stage.time, 3);
  while (stage.time < reply.until + STEP) stepPlayer(stage, 0);
  runAttempt();
  assert.equal(stage.slipMessage, reply);
  assert.ok(reply.until < stage.time);
});

test('the Ancient Crossing keeps its existing coordinates and collision surfaces', () => {
  const stage = new Stage2(CHARACTERS.slice(0, 2));
  assert.deepEqual(
    stage.solids.filter(({ x, w }) => x + w > 699),
    [
      { x: 688, y: 483, w: 164, h: 177 },
      { x: 749, y: 415, w: 66, h: 11 },
      { x: 1066, y: 475, w: 134, h: 185 },
    ],
  );
  assert.deepEqual(CROSSING, {
    left: 852,
    right: 1066,
    mechanism: { x: 815, y: 483 },
    vine: { x: 784, y: 272, length: 112 },
  });
});

test('an early press is consumed on approach during ascent, descent, and horizontal travel', () => {
  for (const { dx, dy, vy, move } of [
    { dx: 0, dy: 41, vy: -280, move: 0 },
    { dx: 0, dy: -41, vy: 220, move: 0 },
    { dx: -38, dy: -6, vy: 0, move: 1 },
  ]) {
    const stage = new Stage2(CHARACTERS.slice(0, 2));
    stage.motion = { matches: true };
    const player = stage.players[1];
    const { vine } = stage;
    Object.assign(player, {
      x: vine.grip.x - 6 + dx,
      y: vine.grip.y - 12 + dy,
      vy,
      grounded: false,
    });
    assert.equal(vine.canGrab(player, stage.solids), false);
    stepPlayer(stage, 1, { move, interact: true });
    assert.ok(!player.hanging);
    for (let i = 0; i < 15 && !player.hanging; i++) stepPlayer(stage, 1, { move });
    assert.equal(player.hanging, vine);
    assert.equal(player.y + 12, vine.grip.y);
    stepPlayer(stage, 1, { interact: true });
    stepPlayer(stage, 1, { interact: true });
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
    const player = stage.players[1];
    const { vine } = stage;
    vine.angle = direction * 0.22;
    Object.assign(vine.grip, vine.tipAt(vine.angle));
    Object.assign(player, vine.hangingBounds(player), { grounded: false });
    assert.ok(vine.grab(player, stage.solids));
    vine.angularVelocity = direction * 1.9;
    const startX = player.x;
    const baseline = new Stage2(CHARACTERS.slice(0, 2));
    const walker = baseline.players[1];
    Object.assign(walker, { x: startX, y: player.y, grounded: true });
    stepPlayer(baseline, 1, { jump: true, move: direction });
    for (let i = 0; i < 120 && !walker.grounded; i++) {
      stepPlayer(baseline, 1, { move: direction });
    }
    stepPlayer(stage, 1, { jump: true, move: -direction });
    assert.equal(Math.sign(player.vx), direction, 'opposite input does not reverse the release');
    assert.ok(player.vy < -500 + 1600 * STEP, 'upward swing adds to the launch');
    for (let i = 0; i < 120 && !player.grounded; i++) {
      stepPlayer(stage, 1, { move: direction });
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
