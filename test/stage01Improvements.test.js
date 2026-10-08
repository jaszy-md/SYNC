import test from 'node:test';
import assert from 'node:assert/strict';
import { makeStage, idle, collectKey, placeAt } from '../test-support/stage.js';
import { overlaps } from '../src/core/physics/collision.js';
import { Platform } from '../src/entities/objects/platform.js';
import { stage01Config } from '../src/stages/stage01/stage01Config.js';
import { stage01LayoutConfig } from '../src/stages/stage01/stage01LayoutConfig.js';
import { getStage01ControlHints } from '../src/stages/stage01/hints/controlHints.js';
import { interactionBindings } from '../src/core/input.js';
import { drawEnergyPuzzle } from '../src/stages/stage01/puzzles/energyPuzzle/energyPuzzleView.js';
import { preloadCharacterSprites } from '../src/entities/player/characterAssets.js';
import { drawSymbolPuzzle } from '../src/stages/stage01/puzzles/symbolPuzzle/symbolPuzzleView.js';
import { HelpMarker } from '../src/entities/objects/helpMarker.js';

test('clue replaces only confirmed symbols with green checks and preserves them after mistakes', () => {
  const stage = makeStage();
  const puzzle = stage.symbolPuzzle;
  const [reader, operator] = stage.players;
  placeAt(reader, puzzle.clue);
  stage.interact(reader);
  let text = [];
  const ctx = new Proxy(
    {
      fillText(value) {
        if (['○', '△', '□', '✓', '···'].includes(value))
          text.push({ value, color: this.fillStyle });
      },
      createLinearGradient() {
        return { addColorStop() {} };
      },
    },
    {
      get: (target, key) => target[key] ?? (() => {}),
    },
  );
  const screen = () => {
    text = [];
    drawSymbolPuzzle(ctx, puzzle, stage.players);
    return text.slice(0, puzzle.code.length);
  };
  assert.deepEqual(
    screen().map(({ value }) => value),
    puzzle.code,
  );
  placeAt(
    operator,
    puzzle.symbolBlocks.find((block) => block.symbol === puzzle.code[0]),
  );
  stage.interact(operator);
  const confirmed = screen();
  assert.deepEqual(
    confirmed.map(({ value }) => value),
    ['✓', puzzle.code[1]],
  );
  assert.equal(confirmed[0].color, '#64ef92');
  stage.interact(operator);
  assert.deepEqual(screen(), confirmed, 'reusing confirmed robot preserves progress');
  placeAt(
    operator,
    puzzle.symbolBlocks.find((block) => !puzzle.code.includes(block.symbol)),
  );
  stage.interact(operator);
  assert.deepEqual(screen(), confirmed, 'mistake preserves display');
  placeAt(
    operator,
    puzzle.symbolBlocks.find((block) => block.symbol === puzzle.code[1]),
  );
  stage.interact(operator);
  assert.deepEqual(
    screen().map(({ value }) => value),
    ['✓', '✓'],
  );
  reader.x = 1000;
  assert.ok(screen().every(({ value, color }) => value === '✓' && color === '#64ef92'));
});

test('hint trigger has no diamond, question mark or label renderer', () => {
  const stage = makeStage();
  stage.requestHint();
  assert.ok(stage.helpMarker instanceof HelpMarker);
  assert.equal(stage.helpMarker.draw, undefined);
  assert.deepEqual([stage.hintDevice.x, stage.hintDevice.y], [70, 286]);
});

test('access objects have outer margins, aligned feet and no overlap at spawn', () => {
  const stage = makeStage();
  const bar = stage.platforms[1];
  const clue = stage.symbolPuzzle.clue;
  assert.ok(clue.x > bar.x && clue.x + clue.w < stage.plate.x);
  assert.ok(stage.plate.x + stage.plate.w < bar.x + bar.w);
  assert.equal(stage.plate.y + stage.plate.h, bar.y);
  const terminalSize = stage01Config.interactionVisuals.terminalSize;
  assert.ok(clue.x + clue.w / 2 - terminalSize / 2 > bar.x);
  assert.ok(clue.x + clue.w / 2 + terminalSize / 2 < stage.plate.x);
  stage.players.forEach((player) => {
    assert.equal(player.y + player.h, stage.platforms[0].y);
    assert.ok(!stage.solids.some((solid) => overlaps(player, solid)));
  });
  assert.equal(overlaps(...stage.players), false);
  const ring = stage01LayoutConfig.objects.chargeIndicator;
  const bounds = {
    x: ring.x - ring.radius - 5,
    y: ring.y - ring.radius - 5,
    w: (ring.radius + 5) * 2,
    h: (ring.radius + 5) * 2,
  };
  assert.ok(!stage.platforms.some((platform) => overlaps(bounds, platform)));
  assert.equal(stage.door.y + stage.door.h, stage.portalPlatform.y);
});

test('robots stay aligned below the access bar with clear cage and spawn margins', () => {
  const stage = makeStage();
  const blocks = stage.symbolPuzzle.symbolBlocks;
  const size = stage01Config.interactionVisuals.robotSize;
  const firstLeft = blocks[0].x + blocks[0].w / 2 - size / 2;
  const lastRight = blocks.at(-1).x + blocks.at(-1).w / 2 + size / 2;
  const bar = stage.platforms[1];
  assert.ok(firstLeft >= bar.x - 30 && lastRight <= bar.x + bar.w);
  assert.ok(firstLeft - (stage.cell.cage.x + stage.cell.cage.w) >= 20);
  blocks.forEach((block, i) => {
    assert.equal(block.x, blocks[0].x + i * stage01LayoutConfig.objects.symbolBlocks.spacing);
    assert.equal(block.y + block.h, stage.platforms[0].y);
  });
  assert.ok(stage.players.every((player) => !overlaps(player, stage.cell.cage)));
});

test('exit steps remain absent through charging and appear only after the Explorer unlocks the portal', () => {
  const stage = makeStage();
  const absent = () => {
    assert.ok(stage.exitSteps.every((step) => !step.active));
    assert.ok(stage.exitSteps.every((step) => !stage.solids.includes(step)));
  };
  absent();
  collectKey(stage);
  stage.updateRoutes([idle(), idle()]);
  absent();
  const explorer = stage.players[0];
  Object.assign(explorer, { x: stage.door.x, y: 600 - explorer.h, grounded: true, vy: 0 });
  // Actual jump and collision simulation: no hidden steps are needed to unlock it.
  for (let frame = 0; frame < 180 && stage.door.state === 'LOCKED'; frame++) {
    stage.update(1 / 120, [{ ...idle(), jump: frame === 0, interact: true }, idle()]);
  }
  assert.equal(stage.door.state, 'UNLOCKED');
  assert.ok(stage.exitSteps.every((step) => step.active && stage.solids.includes(step)));
  stage.reset();
  absent();
});

test('memory module appears only on request and remains collectible afterwards', () => {
  const stage = makeStage();
  placeAt(stage.players[0], stage.hintDevice);
  const hints = () => getStage01ControlHints(stage, interactionBindings([null, null]));
  assert.equal(stage.helpMarker, null);
  assert.ok(!hints().some((hint) => hint.object === stage.hintDevice));
  stage.requestHint();
  assert.equal(stage.helpMarker.id, 'memory');
  assert.ok(hints().some((hint) => hint.object === stage.hintDevice));
  stage.interact(stage.players[0]);
  assert.ok(stage.progress.hintUnlocked);
  stage.reset();
  placeAt(stage.players[0], stage.hintDevice);
  stage.interact(stage.players[0]);
  assert.equal(stage.progress.hintUnlocked, false, 'hidden module cannot be collected');
  assert.equal(stage.hintDevice.appearedAt, null);
});

test('memory module fades and flashes once, then keeps its normal rendering', () => {
  const stage = makeStage();
  const device = stage.hintDevice;
  let alpha = 1;
  let rectangles = [];
  const ctx = {
    get globalAlpha() {
      return alpha;
    },
    set globalAlpha(value) {
      alpha = value;
    },
    save() {},
    restore() {
      alpha = 1;
    },
    translate() {},
    fillRect(...rect) {
      rectangles.push({ rect, alpha });
    },
    strokeRect() {},
  };
  device.draw(ctx, stage.progress, 0);
  assert.equal(rectangles.length, 0);
  stage.time = 2;
  stage.requestHint();
  device.draw(ctx, stage.progress, 2.25);
  assert.ok(rectangles.every(({ alpha }) => alpha > 0 && alpha < 1));
  assert.ok(
    rectangles.some(({ rect }) => rect[0] < 0),
    'materialization flash',
  );
  stage.time = 3;
  stage.requestHint();
  assert.equal(device.appearedAt, 2, 'repeated hint does not restart appearance');
  rectangles = [];
  device.draw(ctx, stage.progress, 3);
  assert.ok(rectangles.every(({ alpha }) => alpha === 1));
  assert.ok(
    rectangles.every(({ rect }) => rect[0] >= 0),
    'flash has finished',
  );
  placeAt(stage.players[0], device);
  stage.interact(stage.players[0]);
  rectangles = [];
  device.draw(ctx, stage.progress, 4);
  assert.equal(rectangles.length, 0, 'collected module stays absent');
});

test('gate closure avoids a blocked side, preserves feet and deals exactly one hit', () => {
  const stage = makeStage();
  const player = stage.players[1];
  const gate = stage.gateA;
  stage.setGate(gate, true);
  stage.platforms.push(new Platform(gate.x - player.w - 8, 600 - player.h, player.w + 8, player.h));
  Object.assign(player, { x: gate.x - 5, y: 600 - player.h });
  const y = player.y;
  stage.setGate(gate, false);
  assert.ok(gate.active && player.x >= gate.x + gate.w);
  assert.equal(player.y, y);
  assert.ok(!stage.solids.some((solid) => overlaps(player, solid)));
  assert.equal(stage.health[player.id].value, 3);
  assert.ok(player.damageFlashUntil > stage.time);
  stage.health[player.id].invulnerable = 0;
  for (let i = 0; i < 10; i++) stage.setGate(gate, false);
  assert.equal(stage.health[player.id].value, 3);
  stage.setGate(gate, true);
  Object.assign(player, { x: gate.x, y });
  stage.health[player.id].invulnerable = 1;
  stage.setGate(gate, false);
  assert.equal(stage.health[player.id].value, 3, 'existing hit protection is respected');
  assert.ok(!overlaps(player, gate));
});

test('gate closure at zero HP resets normally and only the winch gate stays unlocked after delivery', () => {
  const stage = makeStage();
  stage.setGate(stage.gateA, true);
  Object.assign(stage.players[1], { x: stage.gateA.x, y: 600 - stage.players[1].h });
  stage.health[1].value = 1;
  stage.update(1 / 120, [idle(), idle()]);
  assert.ok(stage.health.every((health) => health.value === 4));
  assert.equal(stage.phase, 'SYMBOLS');
  stage.phase = 'CHARGE';
  stage.updateRoutes([idle(), idle()]);
  assert.ok(stage.gateA.active && !stage.gateB.active);
  Object.assign(stage.players[1], { x: stage.gateB.x, y: 600 - stage.players[1].h });
  stage.updateRoutes([idle(), idle()]);
  assert.equal(stage.health[1].value, 4);
  assert.equal(stage.gateB.active, false);
});

test('exit animation locks both players in back pose and completes only after its timer', () => {
  const stage = makeStage();
  collectKey(stage);
  stage.players.forEach((player) => placeAt(player, stage.door));
  stage.players[1].x += 30;
  stage.interact(stage.players[0]);
  stage.updateExit([{ interactHeld: true }, { interactHeld: true }]);
  const animation = stage.exitAnimation;
  assert.equal(animation.starts.length, 2);
  assert.notEqual(animation.starts[0].x, animation.starts[1].x);
  const positions = stage.players.map(({ x, y }) => ({ x, y }));
  for (let frame = 0; frame < 100; frame++) {
    stage.update(
      1 / 120,
      stage.players.map(() => ({ ...idle(), move: 1, jump: true, crouch: true, interact: true })),
    );
    assert.ok(
      stage.players.every(
        (player) => player.interactPoseMs > 0 && player.vx === 0 && player.vy === 0,
      ),
    );
    assert.equal(stage.complete, false);
  }
  assert.deepEqual(
    stage.players.map(({ x, y }) => ({ x, y })),
    positions,
  );
  assert.equal(stage.interact(stage.players[0], true), null);
  stage.updateExit([{ interactHeld: true }, { interactHeld: true }]);
  assert.equal(stage.exitAnimation, animation);
  stage.update(stage01Config.exitAnimation.duration, [idle(), idle()]);
  assert.equal(stage.complete, true);
  const time = stage.time;
  stage.update(1, [idle(), idle()]);
  assert.equal(stage.time, time, 'completed stage cannot restart its animation');
});

test('powered energy ring reuses moving cyan conduit pulses', () => {
  const stage = makeStage();
  const offsets = [];
  const colors = [];
  const ctx = new Proxy(
    {},
    {
      get: () => () => {},
      set: (_, key, value) => {
        if (key === 'lineDashOffset') offsets.push(value);
        if (key === 'shadowColor') colors.push(value);
        return true;
      },
    },
  );
  stage.socketA.draw = stage.socketB.draw = () => {};
  drawEnergyPuzzle(ctx, stage);
  assert.deepEqual(offsets, []);
  stage.cell.state = 'SOCKET_B';
  stage.time = 1;
  drawEnergyPuzzle(ctx, stage);
  stage.time = 2;
  drawEnergyPuzzle(ctx, stage);
  assert.deepEqual(offsets, [-48, -96]);
  assert.ok(colors.includes('#64e4ff'));
});

test('both back sprites move into the portal, shrink and fade through the actual stage renderer', async (t) => {
  const previous = globalThis.Image;
  t.after(() => {
    globalThis.Image = previous;
  });
  globalThis.Image = class {
    naturalWidth = 480;
    naturalHeight = 1064;
    complete = false;
    set src(path) {
      this.path = path;
      this.onload?.();
    }
  };
  const stage = makeStage();
  await preloadCharacterSprites(stage.players.map((player) => player.character));
  collectKey(stage);
  stage.players.forEach((player) => placeAt(player, stage.door));
  stage.players[1].x += 30;
  stage.interact(stage.players[0]);
  stage.updateExit([{ interactHeld: true }, { interactHeld: true }]);
  let transform = { a: 1, d: 1, x: 0, y: 0, alpha: 1 };
  const stack = [];
  let images = [];
  const methods = {
    canvas: { width: 1200, height: 660 },
    save() {
      stack.push({ ...transform });
    },
    restore() {
      transform = stack.pop();
    },
    translate(x, y) {
      transform.x += transform.a * x;
      transform.y += transform.d * y;
    },
    scale(x, y) {
      transform.a *= x;
      transform.d *= y;
    },
    createLinearGradient() {
      return { addColorStop() {} };
    },
    drawImage(image, x, y, w, h) {
      if (!image.path?.endsWith('/back.png')) return;
      images.push({
        centerX: transform.x + transform.a * (x + w / 2),
        feetY: transform.y + transform.d * (y + h),
        width: Math.abs(transform.a * w),
        alpha: transform.alpha,
      });
    },
  };
  const ctx = new Proxy(methods, {
    get: (target, key) => (key === 'globalAlpha' ? transform.alpha : (target[key] ?? (() => {}))),
    set: (target, key, value) => {
      if (key === 'globalAlpha') transform.alpha = value;
      else target[key] = value;
      return true;
    },
  });
  stage.draw(ctx);
  const starts = images;
  assert.equal(starts.length, 2);
  assert.ok(starts.every((image) => image.alpha === 1 && image.width > 0));
  assert.notEqual(starts[0].centerX, starts[1].centerX);
  stage.update(stage01Config.exitAnimation.duration / 2, [idle(), idle()]);
  images = [];
  stage.draw(ctx);
  assert.equal(images.length, 2);
  const center = stage.door.x + stage.door.w / 2;
  images.forEach((image, i) => {
    assert.ok(image.alpha > 0 && image.alpha < 1);
    assert.ok(image.width < starts[i].width);
    assert.ok(image.feetY < starts[i].feetY);
    assert.ok(Math.abs(image.centerX - center) < Math.abs(starts[i].centerX - center));
  });
});

test('charging accepts swapped players but still needs two separate occupants holding interaction', () => {
  const stage = makeStage();
  stage.phase = 'CHARGE';
  stage.cell.state = 'SOCKET_B';
  placeAt(stage.players[0], stage.chargePads[1]);
  placeAt(stage.players[1], stage.chargePads[0]);
  const both = [{ interactHeld: true }, { interactHeld: true }];
  stage.energyPuzzle.updateCharging(0.5, both);
  assert.equal(stage.charge, 0.5);
  const hints = getStage01ControlHints(stage, interactionBindings([null, null]));
  assert.ok(
    hints.some((hint) => hint.player === stage.players[0] && hint.object === stage.chargePads[1]),
  );
  assert.ok(
    hints.some((hint) => hint.player === stage.players[1] && hint.object === stage.chargePads[0]),
  );
  stage.energyPuzzle.updateCharging(0.1, [idle(), both[1]]);
  assert.equal(stage.charge, 0);
  stage.players[1].x = 900;
  // A single 28px body can span the 20px gap, but cannot count as two players.
  Object.assign(stage.players[0], {
    x: stage.chargePads[0].x + stage.chargePads[0].w - 2,
    y: 600 - stage.players[0].h,
    grounded: true,
  });
  stage.energyPuzzle.updateCharging(0.5, both);
  assert.ok(stage.chargePads.every((pad) => pad.active));
  assert.equal(stage.charge, 0);
  stage.players.forEach((player) => placeAt(player, stage.chargePads[0]));
  stage.energyPuzzle.updateCharging(0.5, both);
  assert.equal(stage.charge, 0);
});

test('powered portal steps leave the right floor route free for both players', () => {
  const stage = makeStage();
  collectKey(stage);
  placeAt(stage.players[0], stage.door);
  stage.interact(stage.players[0]);
  stage.updateRoutes([idle(), idle()]);
  assert.equal(stage.exitSteps.length, 3);
  assert.ok(stage.exitSteps.every((step) => step.active));
  for (const player of stage.players) {
    Object.assign(player, {
      x: stage01Config.width - player.w,
      y: 600 - player.h,
      vy: 0,
      grounded: true,
    });
    for (let frame = 0; frame < 160; frame++) {
      player.update({ ...idle(), move: -1 }, 1 / 120, stage.solids, stage01Config.width);
      assert.ok(!stage.solids.some((solid) => overlaps(player, solid)));
    }
    assert.ok(player.x < stage.portalStep.x, 'player can walk out from the right');
    assert.equal(player.y + player.h, 600);
  }
  assert.ok(
    stage.exitSteps.every(
      (step) =>
        !stage.chargePads.some((pad) =>
          overlaps(step, {
            x: pad.x,
            y: 600 - stage.players[0].h,
            w: pad.w,
            h: stage.players[0].h,
          }),
        ),
    ),
  );
});

test('maintenance route cannot bypass the battery bridge but stays reachable after powering it', () => {
  for (const source of ['access', 'gateA', 'bridge']) {
    const stage = makeStage();
    const player = stage.players[0];
    const start = source === 'access' ? stage.platforms[1] : stage[source];
    const target = stage.platforms[2];
    if (source === 'bridge') {
      stage.cell.state = 'SOCKET_A';
      stage.phase = 'TRANSFER';
      stage.updateRoutes([idle(), idle()]);
    }
    Object.assign(player, {
      x: start.x + start.w - 1,
      y: start.y - player.h,
      grounded: true,
      vy: 0,
    });
    let reached = false;
    for (let frame = 0; frame < 180; frame++) {
      player.update(
        { ...idle(), jump: frame === 0, move: player.x < target.x + 10 ? 1 : 0 },
        1 / 120,
        stage.solids,
        stage01Config.width,
      );
      if (player.grounded && player.y + player.h === target.y) reached = true;
    }
    assert.equal(reached, source === 'bridge', source);
  }
});

test('charge ring is centered over the final battery socket with a straight vertical conduit', () => {
  const layout = stage01LayoutConfig;
  const ring = layout.objects.chargeIndicator;
  const socket = layout.objects.sockets.b;
  assert.equal(ring.x, socket.x + socket.width / 2);
  assert.ok(ring.y < 430);
  assert.deepEqual(layout.connections.charge, [
    [ring.x, socket.y],
    [ring.x, ring.y + ring.radius],
  ]);
  assert.equal('returnSteps' in layout.platforms, false);
});
