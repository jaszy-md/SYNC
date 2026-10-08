import test from 'node:test';
import assert from 'node:assert/strict';
import { Player } from '../src/entities/player/createPlayer.js';
import { CHARACTERS } from '../src/entities/player/characters.js';
import { Platform } from '../src/entities/objects/platform.js';
import { overlaps } from '../src/core/physics/collision.js';
import { makeStage, idle } from '../test-support/stage.js';
const makePlayer = () => new Player(0, CHARACTERS[0], { x: 50, y: 100 }, { jumpSpeed: 500 });
const simulate = (player, action, solids, seconds = 1) => {
  for (let elapsed = 0; elapsed < seconds; elapsed += 1 / 120)
    player.update(action, 1 / 120, solids);
};

test('selected characters initialize independent players with Explorer and Tech abilities', () => {
  const stage = makeStage();
  const [explorer, tech] = stage.players;
  assert.equal(explorer.character, CHARACTERS[0]);
  assert.equal(tech.character, CHARACTERS[1]);
  assert.notEqual(explorer, tech);
  assert.notEqual(explorer.abilities, tech.abilities);
  assert.ok(
    explorer.abilities.readHint && explorer.abilities.collectKey && explorer.abilities.operateWinch,
  );
  assert.ok(tech.abilities.carryCell && tech.abilities.operateSwitch);
  assert.ok(!tech.abilities.readHint && !explorer.abilities.carryCell);
  assert.ok(explorer.abilities.jumpSpeed > tech.abilities.jumpSpeed);
  explorer.vx = 20;
  assert.equal(tech.vx, 0);
});
test('movement follows input direction and releasing input stops horizontal movement', () => {
  const player = makePlayer();
  const start = player.x;
  simulate(player, { ...idle(), move: 1 }, [], 0.1);
  assert.ok(player.x > start);
  const right = player.x;
  simulate(player, { ...idle(), move: -1 }, [], 0.1);
  assert.ok(player.x < right);
  const released = player.x;
  simulate(player, idle(), [], 0.1);
  assert.equal(player.x, released);
  assert.equal(player.vx, 0);
});
test('gravity makes an airborne player fall and landing clears vertical velocity', () => {
  const player = makePlayer();
  const platform = new Platform(0, 300, 500, 20);
  const start = player.y;
  player.update(idle(), 1 / 120, [platform]);
  assert.ok(player.y > start && player.vy > 0);
  simulate(player, idle(), [platform]);
  assert.equal(player.y + player.h, platform.y);
  assert.ok(player.grounded);
  assert.equal(player.vy, 0);
  assert.ok(!overlaps(player, platform));
});
test('jumping requires ground contact and landing permits another jump', () => {
  const player = makePlayer();
  const floor = new Platform(0, 300, 500, 20);
  player.update({ ...idle(), jump: true }, 1 / 120, [floor]);
  assert.ok(player.vy >= 0, 'no air jump');
  simulate(player, idle(), [floor]);
  player.update({ ...idle(), jump: true }, 1 / 120, [floor]);
  assert.ok(player.vy < 0 && !player.grounded);
  const rising = player.vy;
  player.update({ ...idle(), jump: true }, 1 / 120, [floor]);
  assert.ok(player.vy > rising, 'air input does not restart jump');
  simulate(player, idle(), [floor]);
  assert.ok(player.grounded);
  player.update({ ...idle(), jump: true }, 1 / 120, [floor]);
  assert.ok(player.vy < 0);
});
test('solid walls and ceilings prevent crossing and stop blocked vertical movement', () => {
  const player = makePlayer();
  const wall = new Platform(player.x + player.w + 5, 0, 20, 500);
  simulate(player, { ...idle(), move: 1 }, [wall], 0.3);
  assert.ok(player.x + player.w <= wall.x && !overlaps(player, wall));
  const ceiling = new Platform(0, player.y - 10, 500, 10);
  player.vy = -player.abilities.jumpSpeed;
  player.update(idle(), 1 / 120, [ceiling]);
  assert.ok(player.y >= ceiling.y + ceiling.h);
  assert.equal(player.vy, 0);
});
test('crouching keeps feet planted and standing waits until overhead clearance is available', () => {
  const player = makePlayer();
  const floor = new Platform(0, 300, 500, 20);
  simulate(player, idle(), [floor]);
  const standingHeight = player.h,
    feet = player.y + player.h;
  player.update({ ...idle(), crouch: true }, 1 / 120, [floor]);
  assert.ok(player.crouched && player.h < standingHeight);
  assert.equal(player.y + player.h, feet);
  const ceiling = new Platform(
    player.x - 10,
    feet - standingHeight,
    player.w + 20,
    (standingHeight - player.h) / 2,
  );
  player.update(idle(), 1 / 120, [floor, ceiling]);
  assert.ok(player.crouched && !overlaps(player, ceiling));
  player.update(idle(), 1 / 120, [floor]);
  assert.ok(!player.crouched);
  assert.equal(player.h, standingHeight);
  assert.equal(player.y + player.h, feet);
});
