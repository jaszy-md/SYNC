import { stage01Config } from '../src/stages/stage01/stage01Config.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { Stage1 } from '../src/stages/stage01/stage01.js';
import { CHARACTERS } from '../src/entities/player/characters.js';
import { SecurityDrone } from '../src/stages/stage01/objects/securityDrone.js';
import { Winch } from '../src/stages/stage01/objects/winch.js';

const make = () => new Stage1([CHARACTERS[0], CHARACTERS[1]], () => 0.6);
const initialGuardsEnabled = stage01Config.enemies.guardsEnabled;
// These tests verify enabled guards independently from development defaults.
test.before(() => {
  stage01Config.enemies.guardsEnabled = true;
});
test.after(() => {
  stage01Config.enemies.guardsEnabled = initialGuardsEnabled;
});
const idle = () => ({ move: 0, jump: false, crouch: false, interact: false, interactHeld: false });
const tick = (stage, inputs = [idle(), idle()], frames = 1) => {
  for (let i = 0; i < frames; i++) stage.update(1 / 120, inputs);
};

test('Stage 1 has no repair/restart blockers and charging reveals the key, not an unlocked door', () => {
  const stage = make();
  for (const name of ['coolingRepair', 'archiveRepair', 'restartPuzzle', 'wiringPuzzle'])
    assert.equal(stage[name], undefined);
  stage.phase = 'CHARGE';
  stage.cell.state = 'SOCKET_B';
  stage.players.forEach((player, index) =>
    Object.assign(player, { x: stage.chargePads[index].x + 4, y: 554, grounded: true }),
  );
  tick(
    stage,
    [
      { ...idle(), interactHeld: true },
      { ...idle(), interactHeld: true },
    ],
    310,
  );
  assert.equal(stage.phase, 'KEY');
  assert.equal(stage.key.state, 'VISIBLE');
  assert.equal(stage.door.state, 'LOCKED');
});

test('closed battery cage has a solid top and sides; solving releases both collision and cell', () => {
  const stage = make();
  const player = stage.players[1];
  const cage = stage.cell.cage;
  Object.assign(player, { x: cage.x + 8, y: cage.y - 90, vy: 0 });
  tick(stage, undefined, 80);
  assert.equal(player.y + player.h, cage.y);
  assert.ok(player.grounded);
  Object.assign(player, { x: cage.x - player.w - 10, y: 554 });
  tick(stage, [idle(), { ...idle(), move: 1 }], 30);
  assert.equal(player.x + player.w, cage.x);
  Object.assign(stage.players[0], { x: stage.symbolPuzzle.clue.x, y: stage.symbolPuzzle.clue.y });
  stage.interact(stage.players[0]);
  for (const symbol of stage.symbolPuzzle.code) {
    player.x = stage.symbolPuzzle.symbolBlocks.find((block) => block.symbol === symbol).x + 8;
    stage.interact(player);
  }
  assert.equal(stage.cell.state, 'LOOSE');
  assert.ok(!stage.solids.some((solid) => solid.x === cage.x && solid.y === cage.y));
  player.x = stage.cell.x;
  stage.interact(player);
  assert.equal(stage.cell.state, 'CARRIED');
});

test('guard fires aimed slow projectiles; hits, walls and world edges remove them', () => {
  const stage = make(),
    guard = stage.guardian,
    player = stage.players[1];
  Object.assign(player, { x: 1010, y: 554 });
  guard.update(1.81, [player], true);
  assert.equal(guard.projectiles.length, 1);
  const shot = guard.projectiles[0];
  assert.ok(Math.abs(Math.hypot(shot.vx, shot.vy) - 190) < 0.01);
  let hits = 0;
  guard.updateProjectiles(2, [player], [], () => hits++);
  assert.equal(hits, 1);
  assert.equal(guard.projectiles.length, 0);
  guard.projectiles.push({ x: 0, y: 0, w: 8, h: 8, vx: 190, vy: 0 });
  guard.updateProjectiles(1, [], [{ x: 20, y: 0, w: 10, h: 20 }], () => {});
  assert.equal(guard.projectiles.length, 0);
  guard.projectiles.push({ x: 1199, y: 200, w: 8, h: 8, vx: 190, vy: 0 });
  guard.updateProjectiles(0.1, [], [], () => {});
  assert.equal(guard.projectiles.length, 0);
});

test('projectile damage is independent per player, protected briefly, and death fully resets Stage 1', () => {
  const stage = make();
  stage.phase = 'TRANSFER';
  stage.cell.state = 'CARRIED';
  const player = stage.players[1];
  Object.assign(player, { x: 1000, y: 554 });
  const shootAtPlayer = () =>
    stage.guardian.projectiles.push({ x: player.x, y: player.y + 10, w: 8, h: 8, vx: 0, vy: 0 });
  shootAtPlayer();
  tick(stage);
  assert.equal(stage.health[1].value, 3);
  assert.equal(stage.health[0].value, 4);
  assert.ok(stage.health[1].invulnerable > 0);
  shootAtPlayer();
  tick(stage);
  assert.equal(stage.health[1].value, 3);
  assert.equal(stage.guardian.projectiles.length, 0);
  for (let hit = 0; hit < 3; hit++) {
    stage.health[1].invulnerable = 0;
    shootAtPlayer();
    tick(stage);
  }
  assert.equal(stage.phase, 'SYMBOLS');
  assert.equal(stage.cell.state, 'CAGED');
  assert.equal(stage.key.state, 'HIDDEN');
  assert.equal(stage.guardian.projectiles.length, 0);
  assert.deepEqual(
    stage.health.map((health) => health.value),
    [4, 4],
  );
  assert.equal(stage.players[1].character, CHARACTERS[1]);
  assert.equal(stage.energyPuzzle.stage, stage);
  stage.requestHint();
  stage.reset();
  assert.equal(stage.helpMarker, null);
  assert.equal(stage.guardian.stagger, 0);
});

test('running into or onto the guard staggers, knocks back and reverses its patrol without new inputs', () => {
  const stage = make();
  stage.phase = 'CHARGE';
  stage.cell.state = 'SOCKET_B';
  const guard = stage.guardian;
  guard.x = 830;
  guard.time = 0;
  Object.assign(stage.players[1], { x: 935, y: 554, grounded: true });
  tick(stage, [idle(), { ...idle(), move: -1 }], 42);
  assert.ok(guard.stagger > 0);
  assert.equal(stage.players[1].facilityStun, 0);
  const beforeX = guard.x,
    beforeDirection = guard.direction;
  guard.update(0.4, [], true);
  assert.ok(guard.x < beforeX);
  assert.equal(guard.direction, -beforeDirection);
  assert.ok(guard.retreat > 0);
  guard.update(0.2, [], true);
  assert.equal(guard.moving, true);
  guard.update(1.5, [], true);
  assert.equal(guard.retreat, 0);
  guard.reset();
  const player = stage.players[0];
  Object.assign(player, { x: guard.x, y: guard.y - 40, vy: 150, vx: 240, stage01Rushing: true });
  guard.update(0.01, [player], true);
  assert.ok(guard.stagger > 0, 'jumping onto the guard while running also works');
});

test('Tech bypass and forgiving contact cooldown remain available', () => {
  const stage = make(),
    guard = stage.guardian,
    tech = stage.players[1];
  Object.assign(tech, { x: guard.x, y: guard.y });
  guard.update(0.01, [tech], true);
  assert.ok(tech.facilityStun > 0);
  tech.facilityStun = 0;
  guard.update(0.01, [tech], true);
  assert.equal(tech.facilityStun, 0);
  assert.equal(guard.interact(tech, true), guard);
  guard.interact(tech);
  const x = guard.x;
  guard.update(1, [tech], true);
  assert.equal(guard.x, x);
  assert.equal(guard.disabled, 3);
  guard.reset();
  assert.deepEqual(guard, new SecurityDrone());
});

test('robot, held switch and patrol/front sprites render with fallbacks and correct direction', (t) => {
  const previous = globalThis.Image;
  let available = false;
  globalThis.Image = class {
    constructor() {
      this.complete = true;
      this.naturalHeight = 1254;
    }
    get naturalWidth() {
      return available ? 1254 : 0;
    }
  };
  t.after(() => {
    if (previous === undefined) delete globalThis.Image;
    else globalThis.Image = previous;
  });
  const calls = [];
  const ctx = new Proxy(
    {
      canvas: { width: 1200 },
      createLinearGradient: () => ({ addColorStop() {} }),
      measureText: (text) => ({ width: text.length * 7 }),
    },
    { get: (target, key) => target[key] ?? ((...args) => calls.push([key, ...args])) },
  );
  const stage = make();
  const drawn = new Set();
  for (const [name, object] of Object.entries({
    player1: stage.players[0],
    player2: stage.players[1],
    symbols: stage.symbolPuzzle,
    switch: stage.winch,
    guard: stage.guardian,
    battery: stage.cell,
    socketA: stage.socketA,
    socketB: stage.socketB,
    key: stage.key,
  })) {
    const draw = object.draw.bind(object);
    object.draw = (...args) => {
      drawn.add(name);
      return draw(...args);
    };
  }
  stage.draw(ctx);
  assert.equal(drawn.size, 9, 'the first frame reaches every gameplay renderer before assets load');
  assert.ok(
    !calls.some(([name, label]) => name === 'fillText' && label === 'EXIT / AUTHORIZATION'),
  );
  assert.ok(
    calls.some(([name]) => name === 'ellipse'),
    'portal arch replaces the door panel',
  );
  assert.ok(
    calls.some(([name]) => name === 'fillRect'),
    'unavailable assets still render',
  );
  available = true;
  calls.length = 0;
  stage.draw(ctx);
  assert.ok(
    calls.some(
      ([name, image]) =>
        name === 'drawImage' && image.src === '/assets/images/stage01/background_test_facility.png',
    ),
  );
  assert.ok(
    !calls.some(([name, label]) => name === 'fillText' && label === 'MERIDIAN / TEST FACILITY'),
    'loaded background replaces fallback',
  );
  for (const phase of ['SYMBOLS', 'ENTRY', 'TRANSFER', 'CHARGE', 'KEY', 'EXIT']) {
    stage.phase = phase;
    drawn.clear();
    stage.draw(ctx);
    assert.equal(
      drawn.size,
      9,
      `${phase} still renders every gameplay object without removed repairs`,
    );
  }
  assert.ok(!calls.some(([name, label]) => name === 'fillText' && label === 'AUX GENERATOR'));
  calls.length = 0;
  stage.draw(ctx);
  assert.equal(
    calls.filter(([name, image]) => name === 'drawImage' && image.src.endsWith('symbol_robot.png'))
      .length,
    3,
  );
  assert.equal(
    calls.filter(([name, image]) => name === 'drawImage' && image.src.endsWith('symbol_screen.png'))
      .length,
    1,
  );
  const clue = stage.symbolPuzzle.clue;
  const center = calls.find(([name, text]) => name === 'fillText' && text === '···');
  assert.equal(center[2], clue.x + clue.w / 2);
  assert.ok(Math.abs(center[3] - (clue.y + clue.h - 110 * 0.92 + 110 * 0.32)) < 0.001);
  assert.ok(calls.some(([name, text]) => name === 'fillText' && text === '△'));
  assert.ok(calls.some(([name, text]) => name === 'fillText' && text === 'P1'));
  const winch = new Winch(0, 0);
  winch.draw(ctx, 0);
  assert.ok(
    calls.some(([name, image]) => name === 'drawImage' && image.src.endsWith('switch_off.png')),
  );
  winch.active = true;
  winch.draw(ctx, 0);
  assert.ok(
    calls.some(([name, image]) => name === 'drawImage' && image.src.endsWith('switch_on.png')),
  );
  stage.guardian.moving = true;
  stage.guardian.direction = -1;
  calls.length = 0;
  stage.guardian.draw(ctx);
  assert.ok(
    calls.some(([name, image]) => name === 'drawImage' && image.src.endsWith('guard_side.png')),
  );
  assert.ok(calls.some(([name, x]) => name === 'scale' && x === -1));
  stage.guardian.direction = 1;
  calls.length = 0;
  stage.guardian.draw(ctx);
  assert.ok(!calls.some(([name, x]) => name === 'scale' && x === -1));
  stage.guardian.moving = false;
  calls.length = 0;
  stage.guardian.draw(ctx);
  assert.ok(
    calls.some(([name, image]) => name === 'drawImage' && image.src.endsWith('guard_front.png')),
  );
});

test('guard patrol and knockback respect closed gates but ignore non-solid equipment', () => {
  const stage = make(),
    guard = stage.guardian;
  guard.x = 910;
  guard.time = 2;
  guard.update(1, [], true, stage.solids);
  assert.equal(guard.x, stage.gateB.x + stage.gateB.w);
  assert.equal(guard.direction, 1);
  guard.stagger = 0.35;
  guard.knockDirection = -1;
  guard.update(0.35, [], true, stage.solids);
  assert.ok(guard.x >= stage.gateB.x + stage.gateB.w);
  stage.gateB.active = false;
  guard.direction = -1;
  guard.stagger = 0;
  guard.time = 2;
  guard.update(1, [], true, stage.solids);
  assert.ok(guard.x < stage.gateB.x, 'open gate is traversable');
  for (let i = 0; i < 1200; i++) guard.update(1 / 120, [], true, stage.solids);
  assert.ok(guard.x >= 780 && guard.x <= 925);
  assert.ok(!stage.solids.includes(stage.socketB), 'equipment is not a wall');
});

test('removed duct has no collision and AUTH/duct labels are not rendered', () => {
  const stage = make();
  assert.ok(!stage.platforms.some((p) => p.x === 660 && p.y === 535));
  assert.equal(stage.keyPlatform.x, 24);
  assert.equal(stage.keyPlatform.y, 288);
  const labels = [];
  const ctx = new Proxy(
    {
      canvas: { width: 1200 },
      createLinearGradient: () => ({ addColorStop() {} }),
      measureText: () => ({ width: 10 }),
      fillText: (label) => labels.push(label),
    },
    { get: (target, key) => target[key] ?? (() => {}) },
  );
  stage.draw(ctx);
  assert.ok(!labels.includes('AUTH'));
  assert.ok(!labels.some((label) => label.includes('SERVICE DUCT')));
});

test('landing on guard head supports the player, silences fire for four seconds and retreats', () => {
  const stage = make(),
    guard = stage.guardian,
    player = stage.players[0];
  stage.phase = 'CHARGE';
  stage.cell.state = 'SOCKET_B';
  guard.active = true;
  guard.x = 910;
  const headY = guard.topSurface.y;
  Object.assign(player, { x: guard.x + 3, y: headY - player.h - 2, vy: 100, grounded: false });
  guard.fire(stage.players[1]);
  tick(stage, undefined, 3);
  assert.ok(guard.disabled > 3.98);
  assert.equal(player.y + player.h, headY);
  assert.equal(player.grounded, true);
  assert.equal(guard.projectiles.length, 0);
  assert.ok(guard.hitFlash > 0);
  assert.ok(guard.stompRetreat > 0);
  const afterLandingX = guard.x;
  guard.update(0.1, [], true, stage.solids);
  assert.notEqual(guard.x, afterLandingX, 'stomp disable does not freeze the retreat');
  guard.update(guard.disabled - 0.01, [player], true, stage.solids);
  assert.ok(guard.disabled > 0);
  assert.equal(guard.projectiles.length, 0);
  guard.update(0.02, [player], true, stage.solids);
  assert.equal(guard.disabled, 0);
  Object.assign(player, { x: 1010, y: 554 });
  guard.update(1.81, [player], true, stage.solids);
  assert.equal(guard.projectiles.length, 1, 'normal firing resumes');
  stage.reset();
  assert.equal(stage.guardian.stompRetreat, 0);
  assert.equal(stage.guardian.hitFlash, 0);
});
