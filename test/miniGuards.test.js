import test from 'node:test';
import assert from 'node:assert/strict';
import { makeStage, idle, placeAt } from '../test-support/stage.js';
import { overlaps } from '../src/core/physics/collision.js';
import { getBlasterPlacement } from '../src/stages/stage01/objects/energyBlaster.js';
import {
  MINI_GUARD,
  MINI_GUARD_SPAWN_DELAY,
  GUARD_SHUTDOWN_DURATION,
  GUARD_MAX_HEALTH,
} from '../src/stages/stage01/stage01CombatConfig.js';

function defeatGuard(stage) {
  stage.guardian.spawn(stage.keyPlatform);
  stage.guardian.takeDamage(GUARD_MAX_HEALTH);
  stage.guardian.update(GUARD_SHUTDOWN_DURATION, stage.players, true, stage.solids);
  stage.blaster.update(0, [idle(), idle()]);
  stage.updateMiniSpawns(0);
}

test('death starts two staggered mini entries and only the last mini death drops the gem', () => {
  const stage = makeStage();
  assert.deepEqual(stage.miniGuards, []);
  stage.updateMiniSpawns(1);
  assert.deepEqual(stage.miniGuards, []);
  stage.guardian.spawn(stage.keyPlatform);
  stage.guardian.takeDamage(GUARD_MAX_HEALTH);
  stage.updateMiniSpawns(1);
  assert.deepEqual(stage.miniGuards, [], 'shutdown animation must finish first');
  stage.guardian.update(GUARD_SHUTDOWN_DURATION, [], true, stage.solids);
  stage.blaster.update(0, [idle(), idle()]);
  stage.updateMiniSpawns(0);
  assert.equal(stage.blaster.gem.state, 'hidden');
  const [a, b] = stage.miniGuards;
  assert.equal(a.state, 'entering');
  assert.equal(b.state, 'inactive');
  assert.equal(a.x, -a.w);
  assert.equal(a.y + a.h, stage.keyPlatform.y);
  assert.equal(a.w, stage.guardian.w * MINI_GUARD.scale);
  assert.equal(a.h, stage.guardian.h * MINI_GUARD.scale);
  assert.equal(a.health, 2);
  a.update(0.25, [], true, stage.solids);
  assert.ok(a.x > -a.w);
  stage.updateMiniSpawns(MINI_GUARD_SPAWN_DELAY);
  assert.equal(b.state, 'entering');
  assert.equal(b.x, -b.w);
  assert.ok(a.x > b.x);
  a.takeDamage(2);
  a.update(GUARD_SHUTDOWN_DURATION, [], true, stage.solids);
  stage.updateMiniSpawns(10);
  assert.equal(a.state, 'dead');
  assert.equal(b.health, 2);
  stage.blaster.update(0, [idle(), idle()]);
  assert.equal(stage.blaster.gem.state, 'hidden');
  Object.assign(b, { x: 700, y: 600 - b.h });
  b.takeDamage(2);
  stage.blaster.update(0, [idle(), idle()]);
  assert.equal(stage.blaster.gem.state, 'hidden', 'wait for final shutdown');
  b.update(GUARD_SHUTDOWN_DURATION, [], true, stage.solids);
  stage.blaster.update(0, [idle(), idle()]);
  const gem = stage.blaster.gem;
  assert.equal(gem.state, 'available');
  assert.equal(gem.x + gem.w / 2, b.x + b.w / 2);
  assert.equal(gem.y + gem.h, b.y + b.h);
  stage.blaster.update(0, [idle(), idle()]);
  assert.equal(stage.blaster.gem, gem);
  assert.equal(stage.miniGuards.length, 2);
  stage.reset();
  assert.deepEqual(stage.miniGuards, []);
  assert.equal(stage.miniSpawnElapsed, null);
  assert.equal(stage.lastMiniDefeated, null);
});

test('minis follow and shoot only their assigned player even when the other is closer', () => {
  const stage = makeStage();
  defeatGuard(stage);
  stage.updateMiniSpawns(MINI_GUARD_SPAWN_DELAY);
  for (const [index, mini] of stage.miniGuards.entries()) {
    assert.equal(mini.targetPlayerId, index);
    Object.assign(mini, { state: 'chasing', x: 500, y: 400, time: 2 });
    Object.assign(stage.players[index], { x: 700, y: 400 });
    Object.assign(stage.players[1 - index], { x: 490, y: 400 });
    mini.update(0.01, stage.players, true, []);
    assert.equal(mini.direction, 1);
    mini.fire(stage.players[1 - index]);
    assert.equal(mini.projectiles.length, 0);
    mini.fire(stage.players[index]);
    assert.equal(mini.projectiles.length, 1);
    assert.ok(mini.projectiles[0].vx > 0);
    const other = stage.players[1 - index];
    mini.projectiles = [{ x: other.x, y: other.y, w: 8, h: 8, vx: 0, vy: 0 }];
    let hit = false;
    mini.updateProjectiles(0, stage.players, [], () => {
      hit = true;
    });
    assert.equal(hit, false, 'other player is not attacked');
  }
});

test('minis take independent blaster damage, retain stomp and respect energy walls', () => {
  const stage = makeStage();
  defeatGuard(stage);
  stage.updateMiniSpawns(MINI_GUARD_SPAWN_DELAY);
  const [a, b] = stage.miniGuards;
  Object.assign(a, { state: 'chasing', x: 300, y: 600 - a.h });
  Object.assign(b, { state: 'chasing', x: 400, y: 600 - b.h });
  for (const guard of [a, b]) {
    stage.blaster.projectiles.push({ x: guard.x + 1, y: guard.y + 1, w: 8, h: 8, vx: 0, age: 0 });
    stage.blaster.update(0, [idle(), idle()]);
    assert.equal(guard.health, 1);
  }
  a.stomp(stage.players[0]);
  assert.equal(a.disabled, 4);
  assert.equal(b.disabled, 0);
  a.takeDamage(1);
  assert.equal(a.state, 'dying');
  assert.equal(b.state, 'chasing');
  assert.equal(stage.session.gems.blue, false);
  for (const guard of [a, b]) {
    Object.assign(guard, { x: stage.gateB.x - guard.w - 2, y: 600 - guard.h });
    guard.movePatrol(100, stage.solids);
    assert.ok(guard.x + guard.w <= stage.gateB.x);
    assert.equal(overlaps(guard, stage.gateB), false);
  }
});

test('mini healthbars use each robot health and scaled width', () => {
  const stage = makeStage();
  defeatGuard(stage);
  stage.updateMiniSpawns(MINI_GUARD_SPAWN_DELAY);
  const widths = [];
  const ctx = new Proxy(
    {
      globalAlpha: 1,
      fillRect(x, y, w, h) {
        if (h === 5 && stage.miniGuards.some((guard) => y === guard.topSurface.y - 12))
          widths.push(w);
      },
    },
    { get: (target, key) => target[key] ?? (() => {}) },
  );
  stage.miniGuards[1].takeDamage(1);
  stage.miniGuards.forEach((guard) => guard.draw(ctx));
  assert.deepEqual(widths, [44 * MINI_GUARD.scale, 22 * MINI_GUARD.scale]);
});

test('real standing and crouched shots hit grounded and moving airborne minis and unlock the gem', () => {
  const stage = makeStage();
  const tech = stage.players[1];
  const floor = stage.platforms[0];
  const dt = 1 / 120;
  placeAt(tech, stage.blaster);
  stage.interact(tech);
  Object.assign(tech, { x: 230, y: floor.y - tech.h, facing: 1 });
  defeatGuard(stage);
  stage.updateMiniSpawns(MINI_GUARD_SPAWN_DELAY);
  const [first, second] = stage.miniGuards;
  Object.assign(first, { state: 'chasing', x: 350, y: floor.y - first.h, disabled: 5 });
  Object.assign(second, { state: 'chasing', x: 398, y: floor.y - second.h, disabled: 5 });

  const step = (action = idle()) => stage.update(dt, [idle(), action]);
  const waitUntil = (done, action = idle()) => {
    for (let i = 0; i < 200 && !done(); i++) step(action);
    assert.ok(done());
  };
  const standingY = getBlasterPlacement(tech).muzzleY;
  step({ ...idle(), shoot: true });
  const shot = stage.blaster.projectiles[0];
  assert.equal(shot.y + 4, standingY);
  assert.ok(shot.y + shot.h <= first.y, 'normal shot is above the old movement body');
  assert.ok(shot.y + shot.h > first.projectileHitbox.y, 'visible head is in its path');
  waitUntil(() => first.health === 1);
  assert.ok(first.hitFlash > 0);
  assert.equal(stage.blaster.projectiles.length, 0);
  waitUntil(() => stage.blaster.cooldown === 0);

  Object.assign(first, { disabled: 0, vy: -165, time: 2 });
  const crouch = { ...idle(), crouch: true };
  const startX = first.x;
  step({ ...crouch, shoot: true });
  const lowShot = stage.blaster.projectiles[0];
  assert.ok(tech.crouched && lowShot.vx > 0);
  assert.equal(lowShot.y + 4, getBlasterPlacement(tech).muzzleY);
  assert.ok(lowShot.y + 4 > standingY);
  waitUntil(() => first.state === 'dying', crouch);
  assert.notEqual(first.x, startX);
  assert.ok(first.y + first.h < floor.y, 'hit before the jumping mini lands');
  assert.ok(tech.crouched);
  assert.equal(stage.blaster.gem.state, 'hidden');

  for (let hp = second.health; hp > 0; hp--) {
    waitUntil(() => stage.blaster.cooldown === 0, crouch);
    step({ ...crouch, shoot: true });
    waitUntil(() => second.health < hp, crouch);
  }
  waitUntil(() => stage.blaster.gem.state === 'available');
  assert.equal(first.state, 'dead');
  assert.equal(second.state, 'dead');
  placeAt(tech, stage.blaster.gem);
  stage.interact(tech);
  waitUntil(() => stage.session.gems.blue);
});
