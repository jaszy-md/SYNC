import test from 'node:test';
import assert from 'node:assert/strict';
import { Stage1 } from '../src/stages/stage01/stage01.js';
import { CHARACTERS } from '../src/entities/player/characters.js';
import { stage01Config } from '../src/stages/stage01/stage01Config.js';
import { getStage01Communication } from '../src/stages/stage01/hints/stage01Hints.js';
import { PortalOpening } from '../src/stages/stage01/portalOpening.js';
const make = () => new Stage1(CHARACTERS.slice(0, 2), () => 0);

test('disabled guards skip AI, projectiles, interaction, rendering and collision', () => {
  const before = stage01Config.enemies.guardsEnabled;
  try {
    stage01Config.enemies.guardsEnabled = false;
    const stage = make();
    stage.phase = 'TRANSFER';
    stage.guardian.active = true;
    for (const method of ['update', 'draw', 'interact', 'stomp']) {
      stage.guardian[method] = () => assert.fail('disabled guard called ' + method);
    }
    stage.players[0].x = stage.guardian.x;
    stage.players[0].y = stage.guardian.topSurface.y - stage.players[0].h;
    stage.update(
      1 / 120,
      stage.players.map(() => ({ move: 0 })),
    );
    stage.interact(stage.players[0], true);
    const ctx = new Proxy(
      { canvas: { width: 1200, height: 660 }, createLinearGradient: () => ({ addColorStop() {} }) },
      { get: (target, key) => (key in target ? target[key] : () => {}) },
    );
    stage.draw(ctx);
    assert.deepEqual(
      stage.health.map((health) => health.value),
      [4, 4],
    );
  } finally {
    stage01Config.enemies.guardsEnabled = before;
  }
});

test('communication requires investigating the clue and follows later progression', () => {
  const stage = make();
  assert.match(getStage01Communication(stage), /geheugenmodule/);
  stage.progress.hintUnlocked = true;
  assert.match(getStage01Communication(stage), /onderzoeken/);
  stage.symbolPuzzle.clue.state = 'READ';
  assert.match(getStage01Communication(stage), /match/);
  stage.phase = 'CHARGE';
  assert.match(getStage01Communication(stage), /opgeladen/);
});

test('portal opening releases players only after its bounded entry duration', () => {
  const opening = new PortalOpening();
  assert.equal(opening.active, true);
  assert.equal(opening.playerOpacity, 0);
  opening.update(0.7);
  assert.ok(opening.playerOpacity > 0 && opening.playerOpacity < 1);
  opening.update(10);
  assert.equal(opening.active, false);
  assert.equal(opening.playerOpacity, 1);
  assert.equal(opening.elapsed, stage01Config.opening.duration);
});

test('both roles can collect the hint device; previews, denied and repeated interactions preserve progression', () => {
  for (const playerId of [0, 1]) {
    const stage = make();
    const player = stage.players[playerId];
    assert.match(stage.requestHint(), /geheugenmodule/);
    assert.equal(
      stage.helpMarker,
      null,
      'locked hints cannot be bypassed through the old menu path',
    );
    stage.interact(player);
    assert.equal(stage.progress.hintUnlocked, false, 'spawn is outside collection range');
    Object.assign(player, {
      x: stage.hintDevice.x,
      y: stage.hintDevice.y + stage.hintDevice.h - player.h,
    });
    assert.equal(stage.interact(player, true), stage.hintDevice);
    assert.equal(stage.progress.hintUnlocked, false);
    stage.interact(player);
    assert.equal(stage.progress.hintUnlocked, true);
    assert.equal(stage.phase, 'SYMBOLS');
    assert.equal(stage.cell.state, 'CAGED');
    assert.equal(
      stage.interact(player, true),
      null,
      'collected device no longer offers interaction',
    );
    assert.match(getStage01Communication(stage), /onderzoeken/);
    stage.requestHint();
    assert.ok(stage.helpMarker, 'unlocked world markers remain available');
    stage.reset();
    assert.equal(stage.progress.hintUnlocked, false);
    assert.equal(stage.helpMarker, null);
  }
});

test('elevated hint device requires traversal and is reachable before solving the symbol puzzle', () => {
  const stage = make();
  const explorer = stage.players[0];
  const idle = () => ({
    move: 0,
    jump: false,
    crouch: false,
    interact: false,
    interactHeld: false,
  });
  const tick = (action = idle()) => stage.update(1 / 120, [action, idle()]);
  tick();
  for (let frame = 0; frame < 20; frame++) tick({ ...idle(), move: 1 });
  function jumpTo(x) {
    for (let frame = 0; frame < 160; frame++)
      tick({
        ...idle(),
        jump: frame === 0,
        move: Math.abs(explorer.x - x) > 2 ? Math.sign(x - explorer.x) : 0,
      });
  }
  assert.equal(stage.progress.hintUnlocked, false);
  jumpTo(stage.symbolPuzzle.clue.x);
  assert.equal(explorer.y + explorer.h, stage.platforms[1].y);
  jumpTo(stage.hintDevice.x);
  assert.equal(explorer.y + explorer.h, stage.keyPlatform.y);
  assert.equal(stage.hintDevice.y + stage.hintDevice.h, stage.keyPlatform.y);
  assert.ok(
    stage.hintDevice.x >= stage.keyPlatform.x &&
      stage.hintDevice.x + stage.hintDevice.w <= stage.keyPlatform.x + stage.keyPlatform.w,
  );
  assert.equal(stage.interact(explorer, true), stage.hintDevice);
  stage.interact(explorer);
  assert.equal(stage.progress.hintUnlocked, true);
  assert.equal(stage.phase, 'SYMBOLS');
  assert.equal(stage.cell.state, 'CAGED');
});
