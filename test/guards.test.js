import test from 'node:test';
import assert from 'node:assert/strict';
import { stage01Config } from '../src/stages/stage01/stage01Config.js';
import { overlaps } from '../src/core/physics/collision.js';
import { makeStage, idle, placeAt, collectKey } from '../test-support/stage.js';
function enabled(t, value = true) {
  const previous = stage01Config.enemies.guardsEnabled;
  stage01Config.enemies.guardsEnabled = value;
  t.after(() => {
    stage01Config.enemies.guardsEnabled = previous;
  });
}

test('guard hits reduce only the victim health and temporary invulnerability prevents double damage', () => {
  const stage = makeStage(),
    victim = stage.players[1],
    guard = stage.guardian;
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
  guard.x = stage.gateB.x - stage.gateB.w - guard.w;
  guard.direction = 1;
  guard.time = 2;
  const wall = { x: guard.x + guard.w + 10, y: guard.y - 10, w: 10, h: guard.h + 20 };
  placeAt(victim, { x: wall.x + wall.w + guard.w, y: guard.y, w: victim.w, h: victim.h });
  for (let i = 0; i < 60; i++) guard.update(1 / 120, [], true, [wall]);
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
  guard.active = true;
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
  guard.active = true;
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
