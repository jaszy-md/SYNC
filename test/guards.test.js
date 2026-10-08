import test from 'node:test';
import assert from 'node:assert/strict';
import { stage01Config } from '../src/stages/stage01/stage01Config.js';
import { overlaps } from '../src/core/physics/collision.js';
import { makeStage, idle, placeAt, collectKey, charge, dockFirst } from '../test-support/stage.js';
function spawnForCombat(stage) {
  stage.guardian.spawn(stage.keyPlatform);
  stage.guardian.state = 'chasing';
  stage.guardian.x = 110;
}
function enabled(t, value = true) {
  const previous = stage01Config.enemies.guardsEnabled;
  stage01Config.enemies.guardsEnabled = value;
  t.after(() => {
    stage01Config.enemies.guardsEnabled = previous;
  });
}

test('guard cannot jump toward a higher player but walks off platforms and lands without overlap', () => {
  const stage = makeStage();
  spawnForCombat(stage);
  const guard = stage.guardian;
  const upper = { x: 0, y: 310, w: 180, h: 20 };
  const floor = { x: 0, y: 600, w: 1200, h: 60 };
  const player = stage.players[0];
  Object.assign(guard, { x: 50, y: upper.y - guard.h, time: 2 });
  Object.assign(player, { x: 800, y: 100 });
  const startY = guard.y;
  let fell = false;
  for (let frame = 0; frame < 900; frame++) {
    guard.update(1 / 120, [player], true, [upper, floor]);
    assert.ok(guard.vy >= 0, 'guard never generates upward velocity');
    assert.ok(guard.y >= startY);
    assert.ok(!overlaps(guard, upper) && !overlaps(guard, floor));
    if (guard.y > startY) fell = true;
  }
  assert.ok(fell, 'pursuit takes guard off the ledge');
  assert.equal(guard.y + guard.h, floor.y);
  assert.ok(guard.grounded);
});

test('stomp silences attacks for four seconds and existing attacks resume afterwards', () => {
  const stage = makeStage();
  spawnForCombat(stage);
  const guard = stage.guardian;
  const player = stage.players[0];
  const floor = { x: 0, y: 600, w: 1200, h: 60 };
  Object.assign(guard, { x: 500, y: 600 - guard.h });
  Object.assign(player, { x: 600, y: 600 - player.h });
  guard.fire(player);
  assert.equal(guard.projectiles.length, 1);
  guard.stomp(player);
  assert.equal(guard.disabled, 4);
  for (let frame = 0; frame < 39; frame++) {
    guard.update(0.1, [player], true, [floor]);
    guard.fire(player);
    assert.ok(guard.disabled > 0);
    assert.equal(guard.projectiles.length, 0);
  }
  guard.update(0.11, [player], true, [floor]);
  assert.equal(guard.disabled, 0);
  guard.fire(player);
  assert.equal(guard.projectiles.length, 1);
});

test('guard renderer omits the ground shadow while keeping body rendering', () => {
  const stage = makeStage();
  spawnForCombat(stage);
  const rectangles = [];
  const ctx = new Proxy(
    {
      fillRect(...rect) {
        rectangles.push(rect);
      },
    },
    {
      get: (target, key) => target[key] ?? (() => {}),
    },
  );
  stage.guardian.draw(ctx);
  const guard = stage.guardian;
  assert.ok(
    rectangles.some(
      ([x, y, w, h]) => x === guard.x && y === guard.y && w === guard.w && h === guard.h,
    ),
  );
  assert.ok(
    !rectangles.some(
      ([x, y, w, h]) =>
        x === guard.x - 4 && y === guard.y + guard.h - 3 && w === guard.w + 8 && h === 7,
    ),
  );
});

test('key reveal spawns one guard entering from the left on the key platform', () => {
  const stage = makeStage();
  const guard = stage.guardian;
  assert.equal(guard.state, 'inactive');
  guard.draw(
    new Proxy(
      {},
      {
        get() {
          throw new Error('inactive guard must not draw');
        },
      },
    ),
  );
  guard.fire(stage.players[0]);
  assert.deepEqual(guard.projectiles, []);
  const earlyStage = makeStage();
  dockFirst(earlyStage);
  earlyStage.update(1 / 120, [idle(), idle()]);
  assert.equal(earlyStage.guardian.active, false);
  assert.equal(earlyStage.guardian.state, 'inactive');
  charge(stage);
  assert.equal(stage.key.state, 'VISIBLE');
  assert.equal(guard.state, 'entering');
  assert.ok(guard.x < 0);
  assert.equal(guard.y + guard.h, stage.keyPlatform.y);
  const y = guard.y;
  while (guard.state === 'entering') {
    guard.update(1 / 120, stage.players, true, stage.solids);
    assert.equal(guard.y, y);
    assert.deepEqual(guard.projectiles, []);
  }
  assert.ok(guard.x >= stage.keyPlatform.x);
  const x = guard.x;
  stage.energyPuzzle.updateCharging(10, [{ interactHeld: true }, { interactHeld: true }]);
  guard.spawn(stage.keyPlatform);
  assert.equal(guard.x, x);
  assert.equal(guard.state, 'chasing');
  stage.reset();
  assert.equal(stage.guardian.state, 'inactive');
  assert.equal(stage.guardian.active, false);
});

test('spawned guard pursues outside the old patrol zone and respects walls', () => {
  const stage = makeStage();
  spawnForCombat(stage);
  const guard = stage.guardian;
  const keyBar = stage.platforms.find((platform) => platform.x === 24);
  assert.equal(guard.y + guard.h, keyBar.y);
  const floor = { x: 0, y: 600, w: 1200, h: 60 };
  Object.assign(guard, { x: 940, y: 600 - guard.h, time: 2 });
  const player = stage.players[0];
  Object.assign(player, { x: 1150, y: 600 - player.h });
  for (let frame = 0; frame < 120; frame++) guard.update(1 / 120, [player], true, [floor]);
  assert.ok(guard.x > 980, 'pursues beyond old right boundary');
  const wall = { x: guard.x + guard.w + 10, y: 0, w: 20, h: 600 };
  for (let frame = 0; frame < 240; frame++) guard.update(1 / 120, [player], true, [floor, wall]);
  assert.ok(guard.x + guard.w <= wall.x);
  assert.ok(!overlaps(guard, wall));
  guard.reset();
  assert.equal(guard.y + guard.h, keyBar.y);
});

test('floor plate alone controls the wall after battery delivery and key reveal for either player', () => {
  for (const phase of ['TRANSFER', 'CHARGE', 'KEY', 'EXIT']) {
    for (const playerId of [0, 1]) {
      const stage = makeStage();
      stage.phase = phase;
      stage.cell.state = phase === 'TRANSFER' ? 'SOCKET_A' : 'SOCKET_B';
      const player = stage.players[playerId];
      placeAt(player, stage.plate);
      stage.updateRoutes([idle(), idle()]);
      assert.equal(stage.gateA.active, false, `${phase}: either player opens wall`);
      player.x = 0;
      stage.updateRoutes([idle(), idle()]);
      assert.equal(stage.gateA.active, true, `${phase}: release closes wall`);
    }
  }
});

test('closing wall keeps guard on either side, resolves overlaps and reopening resumes pursuit', () => {
  for (const onLeft of [true, false]) {
    const stage = makeStage();
    spawnForCombat(stage);
    const guard = stage.guardian;
    const gate = stage.gateA;
    const player = stage.players[0];
    Object.assign(guard, {
      x: onLeft ? gate.x - guard.w - 2 : gate.x + gate.w + 2,
      y: 600 - guard.h,
      time: 2,
    });
    Object.assign(player, { x: onLeft ? 550 : 350, y: 600 - player.h });
    stage.setGate(gate, true);
    stage.setGate(gate, false);
    for (let frame = 0; frame < 240; frame++) guard.update(1 / 120, [player], true, stage.solids);
    assert.ok(onLeft ? guard.x + guard.w <= gate.x : guard.x >= gate.x + gate.w);
    assert.ok(!overlaps(guard, gate));
    stage.setGate(gate, true);
    // Closing over the guard must push to the same nearby side without damage.
    guard.x = onLeft ? gate.x - guard.w + 5 : gate.x + gate.w - 5;
    const y = guard.y;
    stage.setGate(gate, false);
    assert.equal(guard.y, y);
    assert.ok(onLeft ? guard.x + guard.w <= gate.x : guard.x >= gate.x + gate.w);
    assert.ok(!stage.solids.some((solid) => overlaps(guard, solid)));
    placeAt(stage.players[1], stage.plate);
    stage.updateRoutes([idle(), idle()]);
    assert.equal(gate.active, false);
    for (let frame = 0; frame < 180; frame++) guard.update(1 / 120, [player], true, stage.solids);
    assert.ok(onLeft ? guard.x > gate.x + gate.w : guard.x + guard.w < gate.x);
  }
});

test('guard hits reduce only the victim health and temporary invulnerability prevents double damage', () => {
  const stage = makeStage(),
    victim = stage.players[1],
    guard = stage.guardian;
  spawnForCombat(stage);
  placeAt(victim, guard);
  const before = stage.health.map((h) => h.value);
  const hit = () => {
    guard.fire(victim);
    guard.updateProjectiles(0.1, [victim], [], (player) => stage.damagePlayer(player));
  };
  hit();
  assert.ok(stage.health[victim.id].value < before[victim.id]);
  assert.equal(stage.health[0].value, before[0]);
  const damaged = stage.health[victim.id].value;
  hit();
  assert.equal(stage.health[victim.id].value, damaged);
  const duration = stage.health[victim.id].invulnerable;
  for (let time = 0; time <= duration; time += 1 / 120) stage.update(1 / 120, [idle(), idle()]);
  placeAt(victim, guard);
  hit();
  assert.ok(stage.health[victim.id].value < damaged);
});
test('zero health triggers a fresh playable stage preserving selected characters', (t) => {
  enabled(t, false);
  const stage = makeStage();
  collectKey(stage);
  const characters = stage.players.map((p) => p.character);
  const victim = stage.players[0];
  while (stage.health[victim.id].value > 0) {
    stage.health[victim.id].invulnerable = 0;
    stage.damagePlayer(victim);
  }
  stage.update(1 / 120, [idle(), idle()]);
  assert.ok(stage.health.every((h) => h.value === h.max));
  assert.equal(stage.phase, 'SYMBOLS');
  assert.equal(stage.cell.state, 'CAGED');
  assert.equal(stage.key.state, 'HIDDEN');
  assert.equal(stage.door.state, 'LOCKED');
  assert.equal(stage.complete, false);
  assert.deepEqual(
    stage.players.map((p) => p.character),
    characters,
  );
  assert.deepEqual(stage.guardian.projectiles, []);
});
test('guard patrol and projectiles cannot cross an intervening solid wall', () => {
  const stage = makeStage(),
    guard = stage.guardian,
    victim = stage.players[1];
  spawnForCombat(stage);
  guard.x = stage.gateB.x - stage.gateB.w - guard.w;
  guard.direction = 1;
  guard.time = 2;
  const wall = { x: guard.x + guard.w + 10, y: guard.y - 10, w: 10, h: guard.h + 20 };
  const floor = { x: 0, y: guard.y + guard.h, w: 1200, h: 60 };
  placeAt(victim, { x: wall.x + wall.w + guard.w, y: guard.y, w: victim.w, h: victim.h });
  for (let i = 0; i < 60; i++) guard.update(1 / 120, [], true, [wall, floor]);
  assert.ok(guard.x + guard.w <= wall.x);
  assert.ok(!overlaps(guard, wall));
  guard.fire(victim);
  let hit = false;
  guard.updateProjectiles(2, [victim], [wall], () => {
    hit = true;
  });
  assert.equal(hit, false);
  assert.deepEqual(guard.projectiles, []);
});
test('Tech interaction and landing on a guard temporarily silence attacks before recovery', () => {
  const stage = makeStage(),
    [explorer, tech] = stage.players,
    guard = stage.guardian;
  spawnForCombat(stage);
  guard.update(0, [tech], true);
  placeAt(explorer, guard);
  placeAt(tech, guard);
  assert.equal(guard.interact(explorer), null);
  assert.equal(guard.interact(tech, true), guard);
  assert.equal(guard.disabled, 0);
  guard.interact(tech);
  assert.ok(guard.disabled > 0);
  guard.update(guard.disabled / 2, [tech], true);
  assert.deepEqual(guard.projectiles, []);
  guard.update(guard.disabled + 0.01, [], true);
  assert.equal(guard.disabled, 0);
  guard.reset();
  spawnForCombat(stage);
  Object.assign(explorer, {
    x: guard.x,
    y: guard.topSurface.y - explorer.h - 1,
    vy: 100,
    grounded: false,
  });
  const previous = stage01Config.enemies.guardsEnabled;
  stage01Config.enemies.guardsEnabled = true;
  try {
    stage.phase = 'TRANSFER';
    for (let frame = 0; frame < 10 && !explorer.grounded; frame++)
      stage.update(1 / 120, [idle(), idle()]);
  } finally {
    stage01Config.enemies.guardsEnabled = previous;
  }
  assert.ok(explorer.grounded, 'real falling player lands on guard');
  assert.ok(guard.disabled > 0);
  assert.deepEqual(guard.projectiles, []);
});
test('disabled enemies cannot damage players or participate in stage interactions', (t) => {
  enabled(t, false);
  const stage = makeStage(),
    tech = stage.players[1],
    guard = stage.guardian;
  stage.phase = 'TRANSFER';
  spawnForCombat(stage);
  placeAt(tech, guard);
  guard.fire(tech);
  const health = stage.health.map((h) => h.value),
    position = guard.x;
  stage.update(0.1, [idle(), idle()]);
  assert.deepEqual(
    stage.health.map((h) => h.value),
    health,
  );
  assert.equal(guard.x, position);
  assert.equal(stage.interact(tech, true), null);
  stage.interact(tech);
  assert.equal(guard.disabled, 0);
});
