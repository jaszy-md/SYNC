import test from 'node:test';
import assert from 'node:assert/strict';
import { makeStage, placeAt, idle } from '../test-support/stage.js';
import { StageManager } from '../src/core/stageManager.js';
import { CHARACTERS } from '../src/entities/player/characters.js';
import { overlaps } from '../src/core/physics/collision.js';
import { getBlasterPlacement } from '../src/stages/stage01/objects/energyBlaster.js';
import { preloadImage, preloadCharacterSprites } from '../src/entities/player/characterAssets.js';
import { getPlayerSpriteBounds } from '../src/entities/player/playerRenderer.js';
import {
  BLASTER_COOLDOWN_MS,
  BLASTER_DAMAGE,
  GUARD_MAX_HEALTH,
  GUARD_SHUTDOWN_DURATION,
  GEM_FLIGHT_DURATION,
  BLASTER_VISUAL,
  BLASTER_GUN_SPRITE,
  GUARD_REACTION_DELAY,
  GUARD_ATTACK_INTERVAL,
  GUARD_PROJECTILE_SPEED,
} from '../src/stages/stage01/stage01CombatConfig.js';

function armedStage() {
  const stage = makeStage();
  const tech = stage.players[1];
  placeAt(tech, stage.blaster);
  stage.interact(tech);
  Object.assign(tech, { x: 230, y: 600 - tech.h, facing: 1 });
  stage.guardian.spawn(stage.keyPlatform);
  Object.assign(stage.guardian, { state: 'chasing', x: 300, y: 600 - stage.guardian.h });
  return stage;
}

function defeatMinis(stage) {
  stage.updateMiniSpawns(0);
  stage.updateMiniSpawns(0.5);
  for (const mini of stage.miniGuards) {
    Object.assign(mini, { x: stage.guardian.x, y: stage.guardian.y + stage.guardian.h - mini.h });
    mini.takeDamage(mini.maxHealth);
    mini.update(GUARD_SHUTDOWN_DURATION, stage.players, true, stage.solids);
  }
}

test('new run clears all gems and combat state while ordinary loads retain the session', () => {
  const manager = new StageManager();
  const stage = manager.load(1, CHARACTERS.slice(0, 2));
  Object.assign(manager.session.gems, { blue: true, green: true, gold: true });
  stage.blaster.gem.state = 'flying';
  stage.guardian.state = 'dead';
  const transition = manager.load(1, CHARACTERS.slice(0, 2));
  assert.deepEqual(transition.session.gems, { blue: true, green: true, gold: true });
  const fresh = manager.newRun(1, CHARACTERS.slice(0, 2));
  assert.deepEqual(fresh.session.gems, { blue: false, green: false, gold: false });
  assert.equal(fresh.blaster.gem.state, 'hidden');
  assert.equal(fresh.blaster.gem.elapsed, undefined);
  assert.equal(fresh.blaster.owner, null);
  assert.equal(fresh.guardian.state, 'inactive');
  fresh.guardian.spawn(fresh.keyPlatform);
  assert.equal(fresh.guardian.state, 'entering');
  fresh.guardian.takeDamage(GUARD_MAX_HEALTH);
  fresh.guardian.update(GUARD_SHUTDOWN_DURATION, fresh.players, true, fresh.solids);
  defeatMinis(fresh);
  fresh.blaster.update(0, [idle(), idle()]);
  assert.equal(fresh.blaster.gem.state, 'available');
  assert.equal(fresh.session.gems.blue, false, 'a drop alone is not collection');
});

test('guard reacts sooner, leads moving targets and remains vulnerable while disabled', () => {
  const stage = armedStage();
  const guard = stage.guardian;
  const player = stage.players[1];
  guard.shotTimer = GUARD_ATTACK_INTERVAL;
  guard.update(0.01, [player], true, stage.solids);
  assert.ok(guard.shotTimer <= GUARD_REACTION_DELAY);
  assert.equal(guard.targetInRange, true);
  guard.projectiles = [];
  player.vx = 200;
  player.vy = 0;
  guard.fire(player);
  const shot = guard.projectiles[0];
  assert.ok(Math.abs(Math.hypot(shot.vx, shot.vy) - GUARD_PROJECTILE_SPEED) < 0.001);
  const originX = guard.x + guard.w / 2;
  const originY = guard.y + 15;
  const aimedX = originX + (shot.vx / shot.vy) * (player.y + player.h / 2 - originY);
  assert.ok(aimedX > player.x + player.w / 2);
  guard.stomp(player);
  assert.equal(guard.disabled, 4);
  assert.equal(guard.projectiles.length, 0);
  guard.fire(player);
  assert.equal(guard.projectiles.length, 0);
  assert.ok(guard.takeDamage(BLASTER_DAMAGE));
  assert.equal(guard.health, GUARD_MAX_HEALTH - BLASTER_DAMAGE);
});

test('discovery bubble repeats only after leaving reset range and stops after pickup', () => {
  const stage = makeStage();
  const tech = stage.players[1];
  const weapon = stage.blaster;
  placeAt(tech, weapon);
  weapon.update(0, [idle(), idle()]);
  assert.equal(weapon.speech.get(tech.id).elapsedMs, 0);
  stage.time = 4;
  weapon.update(3, [idle(), idle()]);
  assert.equal(weapon.speech.has(tech.id), false);
  tech.x = weapon.x - 200;
  weapon.update(3, [idle(), idle()]);
  placeAt(tech, weapon);
  weapon.update(0, [idle(), idle()]);
  assert.equal(weapon.speech.get(tech.id).text, 'Hey! Dat is mijn verloren wapen!');
  stage.interact(tech);
  assert.equal(weapon.speech.get(tech.id).text, 'Oh ja! Met Ctrl kan ik schieten!');
  stage.time = 8;
  tech.x = weapon.x - 200;
  weapon.update(3, [idle(), idle()]);
  placeAt(tech, weapon);
  weapon.update(0, [idle(), idle()]);
  assert.equal(weapon.speech.has(tech.id), false);
});

test('speech uses dt, fades, replaces messages and expires after a stage reset', () => {
  const stage = makeStage();
  const weapon = stage.blaster;
  const player = stage.players[1];
  weapon.say(player, 'Eerste bericht');
  weapon.updateSpeech(2.8);
  const bubble = weapon.speech.get(player.id);
  assert.equal(bubble.opacity, 1);
  weapon.say(player, 'Eerste bericht');
  assert.equal(bubble.elapsedMs, 2800, 'repeated message does not restart');
  player.x += 100;
  weapon.updateSpeech(0.1);
  assert.ok(Math.abs(bubble.opacity - 0.5) < 0.001);
  weapon.updateSpeech(0);
  assert.equal(bubble.elapsedMs, 2900, 'paused simulation does not advance time');
  weapon.say(player, 'Nieuw bericht');
  assert.equal(weapon.speech.get(player.id).elapsedMs, 0);
  weapon.updateSpeech(3);
  assert.equal(weapon.speech.size, 0);
  weapon.say(player, 'Actief bij reset');
  stage.reset();
  assert.equal(stage.blaster.speech.size, 0);
  assert.equal(stage.blaster.stage, stage);
  stage.blaster.say(stage.players[1], 'Na reset');
  stage.blaster.updateSpeech(3);
  assert.equal(stage.blaster.speech.size, 0);
  stage.blaster.say(stage.players[1], 'Tijdens vertrek');
  stage.exitAnimation = { elapsed: 0 };
  stage.blaster.updateSpeech(2.9);
  stage.update(0.1, [idle(), idle()]);
  assert.equal(stage.blaster.speech.size, 0);
});

test('weapon belongs to the Tech ability, preview is inert, speech expires without restarting', () => {
  const stage = makeStage();
  const [explorer, tech] = stage.players;
  placeAt(explorer, stage.blaster);
  assert.equal(stage.interact(explorer, true), stage.blaster);
  assert.equal(stage.blaster.speech.size, 0);
  stage.interact(explorer);
  assert.equal(stage.blaster.owner, null);
  assert.equal(stage.blaster.speech.get(explorer.id).text, 'Oh, dit is blijkbaar jouw wapen...');
  placeAt(tech, stage.blaster);
  stage.blaster.update(0, [idle(), idle()]);
  assert.equal(stage.blaster.speech.get(tech.id).text, 'Hey! Dat is mijn verloren wapen!');
  const bubble = stage.blaster.speech.get(tech.id);
  stage.time = 1;
  stage.blaster.update(1, [idle(), idle()]);
  assert.equal(stage.blaster.speech.get(tech.id), bubble);
  assert.equal(bubble.elapsedMs, 1000);
  stage.interact(tech);
  assert.equal(stage.blaster.owner, tech.id);
  assert.equal(stage.interact(tech, true), null);
  stage.time = 4;
  stage.blaster.update(3, [idle(), idle()]);
  assert.equal(stage.blaster.speech.size, 0);
  stage.reset();
  assert.equal(stage.blaster.owner, null);
});

test('shooting follows facing, requires ownership and observes the 450ms cooldown', () => {
  const stage = armedStage();
  const [explorer, tech] = stage.players;
  assert.equal(stage.blaster.shoot(explorer), false);
  tech.facing = -1;
  assert.equal(stage.blaster.shoot(tech), true);
  assert.ok(stage.blaster.projectiles[0].vx < 0);
  assert.equal(stage.blaster.shoot(tech), false);
  stage.blaster.update((BLASTER_COOLDOWN_MS - 1) / 1000, [idle(), idle()]);
  assert.equal(stage.blaster.shoot(tech), false);
  stage.blaster.update(0.002, [idle(), idle()]);
  assert.equal(stage.blaster.shoot(tech), true);
});

test('energy shots damage only the guard and terminate on solids or expiry', () => {
  const stage = armedStage();
  const tech = stage.players[1];
  Object.assign(stage.players[0], { x: 270, y: tech.y });
  const health = stage.health.map((item) => item.value);
  stage.blaster.shoot(tech);
  stage.blaster.update(0.2, [idle(), idle()]);
  assert.equal(stage.guardian.health, GUARD_MAX_HEALTH - BLASTER_DAMAGE);
  assert.ok(stage.guardian.hitFlash > 0);
  assert.deepEqual(
    stage.health.map((item) => item.value),
    health,
  );
  assert.equal(stage.blaster.projectiles.length, 0);
  Object.assign(tech, { x: 400 });
  stage.guardian.x = 500;
  stage.blaster.cooldown = 0;
  stage.blaster.shoot(tech);
  stage.blaster.update(1, [idle(), idle()]);
  assert.equal(stage.guardian.health, GUARD_MAX_HEALTH - BLASTER_DAMAGE, 'closed gate blocks shot');
  assert.equal(stage.blaster.projectiles.length, 0);
  stage.blaster.projectiles.push({ x: 10, y: 100, w: 8, h: 8, vx: 0, age: 0 });
  stage.blaster.update(5, [idle(), idle()]);
  assert.equal(stage.blaster.projectiles.length, 0);
});

test('five hits stop guard attacks and defeating both minis drops exactly one reachable gem', () => {
  const stage = armedStage();
  const guard = stage.guardian;
  for (let shot = 0; shot < GUARD_MAX_HEALTH; shot++) {
    stage.blaster.cooldown = 0;
    stage.blaster.shoot(stage.players[1]);
    stage.blaster.update(0.2, [idle(), idle()]);
  }
  assert.equal(guard.health, 0);
  assert.equal(guard.state, 'dying');
  assert.equal(guard.active, false);
  assert.equal(guard.interact(stage.players[1]), null);
  guard.fire(stage.players[0]);
  assert.equal(guard.projectiles.length, 0);
  assert.equal(stage.blaster.gem.state, 'hidden');
  const position = { x: guard.x, y: guard.y };
  guard.update(GUARD_SHUTDOWN_DURATION, stage.players, true, stage.solids);
  assert.deepEqual({ x: guard.x, y: guard.y }, position);
  stage.blaster.update(0, [idle(), idle()]);
  assert.equal(stage.blaster.gem.state, 'hidden');
  defeatMinis(stage);
  stage.blaster.update(0.01, [idle(), idle()]);
  const gem = stage.blaster.gem;
  assert.equal(gem.state, 'available');
  assert.ok(!stage.solids.some((solid) => overlaps(gem, solid)));
  stage.blaster.update(1, [idle(), idle()]);
  assert.equal(stage.blaster.gem, gem);
  assert.equal(gem.y + gem.h, 600);
  assert.equal(guard.takeDamage(1), false);
});

test('either player collects blue gem through flight before the shared session records it', () => {
  for (const id of [0, 1]) {
    const manager = new StageManager();
    const stage = manager.load(1, CHARACTERS.slice(0, 2));
    Object.assign(stage.blaster.gem, {
      state: 'available',
      x: 700,
      y: 582,
      w: 18,
      h: 18,
      vx: 0,
      vy: 0,
    });
    placeAt(stage.players[id], stage.blaster.gem);
    assert.equal(stage.interact(stage.players[id], true), stage.blaster.gem);
    stage.interact(stage.players[id]);
    assert.equal(stage.blaster.gem.state, 'flying');
    assert.equal(manager.session.gems.blue, false);
    stage.blaster.updateGemFlight(GEM_FLIGHT_DURATION / 2);
    assert.equal(manager.session.gems.blue, false);
    stage.blaster.updateGemFlight(GEM_FLIGHT_DURATION / 2);
    assert.deepEqual(manager.session.gems, { blue: true, green: false, gold: false });
    stage.reset();
    assert.equal(stage.blaster.gem.state, 'collected');
    const next = manager.load(1, CHARACTERS.slice(0, 2));
    assert.equal(next.session, manager.session);
    assert.equal(next.blaster.gem.state, 'collected');
  }
});

test('guard healthbar reflects actual health', () => {
  const stage = armedStage();
  const widths = [];
  const ctx = new Proxy(
    {
      globalAlpha: 1,
      fillRect(x, y, w, h) {
        if (h === 5 && y === stage.guardian.topSurface.y - 12) widths.push(w);
      },
    },
    { get: (target, key) => target[key] ?? (() => {}) },
  );
  stage.guardian.draw(ctx);
  stage.guardian.takeDamage(1);
  stage.guardian.draw(ctx);
  assert.deepEqual(widths, [44, (44 * (GUARD_MAX_HEALTH - 1)) / GUARD_MAX_HEALTH]);
});

test('shutdown gem stays clear when an energy wall closes over the defeated guard', () => {
  const stage = armedStage();
  const guard = stage.guardian;
  guard.x = stage.gateA.x;
  stage.setGate(stage.gateA, true);
  guard.takeDamage(GUARD_MAX_HEALTH);
  stage.setGate(stage.gateA, false);
  guard.update(GUARD_SHUTDOWN_DURATION, stage.players, true, stage.solids);
  defeatMinis(stage);
  stage.blaster.update(0.01, [idle(), idle()]);
  const gem = stage.blaster.gem;
  assert.equal(gem.state, 'available');
  assert.ok(!stage.solids.some((solid) => overlaps(gem, solid)));
  assert.ok(Math.abs(gem.x - guard.x) < 60, 'gem remains nearby');
});

test('shoot cannot bypass stage stun or exit lock and projectile count remains bounded', () => {
  const stage = armedStage();
  stage.players[1].facilityStun = 1;
  stage.update(1 / 120, [idle(), { ...idle(), shoot: true }]);
  assert.equal(stage.blaster.projectiles.length, 0);
  stage.players[1].facilityStun = 0;
  stage.exitAnimation = {
    elapsed: 0,
    starts: stage.players.map((player) => ({ x: player.x, y: player.y })),
  };
  stage.update(1 / 120, [idle(), { ...idle(), shoot: true }]);
  assert.equal(stage.blaster.projectiles.length, 0);
  stage.exitAnimation = null;
  for (let i = 0; i < 30; i++) {
    stage.blaster.cooldown = 0;
    stage.blaster.shoot(stage.players[1]);
  }
  assert.equal(stage.blaster.projectiles.length, 16);
});

test('gun lies on the floor with a safe margin left of the second energy wall', () => {
  const stage = makeStage();
  assert.ok(stage.blaster.x > stage.gateA.x + stage.gateA.w);
  assert.ok(stage.blaster.x + stage.blaster.w < stage.gateB.x - 20);
  assert.equal(stage.blaster.y + stage.blaster.h, stage.platforms[0].y);
  for (const player of stage.players) {
    placeAt(player, stage.blaster);
    assert.equal(stage.interact(player, true), stage.blaster);
  }
});

test('pickup instructions use the current method once for three seconds and interaction stays available', () => {
  for (const [method, instruction] of [
    [{ type: 'keyboard', layout: 0 }, 'F'],
    [{ type: 'keyboard', layout: 1 }, 'Ctrl'],
    [{ type: 'controller', controllerId: 'Xbox Wireless' }, 'X of RT'],
    [{ type: 'controller', controllerId: 'Sony DualSense' }, '□ of R2'],
    [{ type: 'controller', controllerId: 'Nintendo Switch Pro' }, 'Y of ZR'],
    [{ type: 'controller', controllerId: 'Unknown' }, 'X-knop of rechter trigger'],
  ]) {
    const stage = makeStage();
    const tech = stage.players[1];
    tech.inputMethod = method;
    placeAt(tech, stage.blaster);
    stage.interact(tech);
    assert.equal(
      stage.blaster.speech.get(tech.id).text,
      `Oh ja! Met ${instruction} kan ik schieten!`,
    );
    assert.equal(stage.blaster.speech.get(tech.id).elapsedMs, 0);
    stage.time = 3.1;
    stage.blaster.update(3, [idle(), idle()]);
    assert.equal(stage.blaster.speech.has(tech.id), false);
    stage.cell.state = 'LOOSE';
    placeAt(tech, stage.cell);
    stage.interact(tech);
    assert.equal(stage.cell.state, 'CARRIED', 'armed player can still operate puzzle');
    assert.equal(stage.blaster.speech.has(tech.id), false, 'pickup instruction does not replay');
  }
});

test('gun preloads and shares its image cache; side pose and hand grip follow natural character sizes', async (t) => {
  const previous = globalThis.Image;
  t.after(() => {
    globalThis.Image = previous;
  });
  const created = [];
  globalThis.Image = class {
    naturalWidth = 328;
    naturalHeight = 208;
    complete = true;
    set src(path) {
      this.path = path;
      created.push(this);
      if (!path.endsWith('/gun.png')) {
        this.naturalWidth = 600;
        this.naturalHeight = path.includes('jaszy') ? 950 : 1156;
      }
      this.onload();
    }
  };
  await preloadImage(BLASTER_GUN_SPRITE);
  await preloadImage(BLASTER_GUN_SPRITE);
  assert.equal(created.filter((image) => image.path.endsWith('/gun.png')).length, 1);
  await preloadCharacterSprites(CHARACTERS);
  const stage = armedStage();
  const player = stage.players[1];
  for (const character of CHARACTERS) {
    player.character = character;
    for (const facing of [-1, 1]) {
      Object.assign(player, {
        facing,
        shootPoseMs: BLASTER_VISUAL.shootPoseMs,
        interactPoseMs: 250,
        grounded: false,
      });
      let transform = { x: 0, y: 0, sx: 1, sy: 1 };
      const stack = [],
        draws = [];
      const ctx = new Proxy(
        {
          globalAlpha: 1,
          save() {
            stack.push({ ...transform });
          },
          restore() {
            transform = stack.pop();
          },
          translate(x, y) {
            transform.x += transform.sx * x;
            transform.y += transform.sy * y;
          },
          scale(x, y) {
            transform.sx *= x;
            transform.sy *= y;
          },
          drawImage(image, x, y, w, h) {
            draws.push({ image, x, y, w, h, transform: { ...transform } });
          },
        },
        { get: (target, key) => target[key] ?? (() => {}) },
      );
      player.draw(ctx);
      stage.blaster.draw(ctx);
      assert.ok(draws[0].image.path.endsWith('/walk-left.png'), 'shooting locks side pose');
      const gun = draws.find((draw) => draw.image.path.endsWith('/gun.png'));
      assert.ok(gun);
      assert.equal(gun.transform.sx, facing === 1 ? -1 : 1);
      assert.equal(gun.w / gun.h, 328 / 208, 'gun retains aspect ratio');
      const sprite = getPlayerSpriteBounds(player);
      const handX =
        sprite.x + sprite.w * (facing > 0 ? 1 - BLASTER_VISUAL.handX : BLASTER_VISUAL.handX);
      const handY = sprite.y + sprite.h * BLASTER_VISUAL.handY;
      const gripX = gun.transform.x + gun.transform.sx * (gun.x + gun.w * BLASTER_VISUAL.gripX);
      const gripY = gun.transform.y + gun.y + gun.h * BLASTER_VISUAL.gripY;
      assert.ok(Math.abs(gripX - handX) < 0.00001 && Math.abs(gripY - handY) < 0.00001);
      stage.blaster.projectiles = [];
      stage.blaster.cooldown = 0;
      stage.blaster.shoot(player);
      const placement = getBlasterPlacement(player);
      assert.equal(stage.blaster.projectiles[0].x + 4, placement.muzzleX);
      assert.equal(stage.blaster.projectiles[0].y + 4, placement.muzzleY);
      assert.ok(stage.blaster.projectiles[0].vx * facing > 0);
    }
  }
  assert.equal(created.filter((image) => image.path.endsWith('/gun.png')).length, 1);
});
