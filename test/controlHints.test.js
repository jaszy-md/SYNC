import test from 'node:test';
import assert from 'node:assert/strict';
import { Stage1 } from '../src/stages/stage01/stage01.js';
import { CHARACTERS } from '../src/entities/player/characters.js';
import {
  InputManager,
  interactionBindings,
  GAMEPAD_INTERACT,
  KEYBOARD,
} from '../src/core/input.js';
import {
  getStage01ControlHints,
  drawStage01ControlHints,
} from '../src/stages/stage01/hints/controlHints.js';

const make = () => new Stage1([CHARACTERS[0], CHARACTERS[1]], () => 0);
const place = (player, x, y = 554) => Object.assign(player, { x, y, grounded: true });
const hints = (stage, assignments = [null, null]) => {
  const before = JSON.stringify(stage, (key, value) => (key === 'stage' ? undefined : value));
  const result = getStage01ControlHints(stage, interactionBindings(assignments));
  assert.equal(
    JSON.stringify(stage, (key, value) => (key === 'stage' ? undefined : value)),
    before,
    'query never mutates gameplay',
  );
  return result;
};

test('assigned controller keeps driving Stage1 across update and render frames after puzzle extraction', (t) => {
  const pad = {
    index: 3,
    id: 'Controller',
    connected: true,
    axes: [0, 0],
    buttons: Array.from({ length: 17 }, () => ({ pressed: false })),
  };
  const navigatorDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: { getGamepads: () => [null, null, null, pad] },
  });
  t.after(() => {
    if (navigatorDescriptor) Object.defineProperty(globalThis, 'navigator', navigatorDescriptor);
    else delete globalThis.navigator;
  });
  const input = new InputManager(new EventTarget());
  const stage = make();
  const ctx = new Proxy(
    {
      createLinearGradient: () => ({ addColorStop() {} }),
      canvas: { width: 1200 },
      measureText: (text) => ({ width: text.length * 7 }),
    },
    {
      get: (target, name) => (name in target ? target[name] : () => {}),
    },
  );
  const frame = () => {
    stage.update(1 / 120, input.sample());
    stage.draw(ctx, false, interactionBindings(input.assignments));
    input.endFrame();
  };
  for (let i = 0; i < 30; i++) frame();
  assert.deepEqual(input.assignments, [3, null]);
  const x = stage.players[0].x;
  pad.axes[0] = 1;
  for (let i = 0; i < 12; i++) frame();
  assert.ok(stage.players[0].x > x);
  pad.axes[0] = 0;
  pad.buttons[0].pressed = true;
  frame();
  assert.ok(stage.players[0].vy < 0);
  pad.buttons[0].pressed = false;
  pad.buttons[1].pressed = true;
  frame();
  assert.equal(stage.players[0].h, 26);
  pad.buttons[1].pressed = false;
  Object.assign(stage.players[0], { x: 340, y: 404, h: 46, vy: 0, grounded: true });
  pad.buttons[2].pressed = true;
  frame();
  assert.equal(stage.symbolPuzzle.clue.state, 'READ');
  place(stage.players[1], stage.socketA.x);
  assert.equal(hints(stage).length, 0, 'HANDLED is a status, not a renderable target');
});

test('hints use the active mapping, including Arrow Keys when the other player has a controller', () => {
  assert.deepEqual(interactionBindings([null, null]), [
    { kind: 'keyboard', label: KEYBOARD[0].interact.replace(/^Key/, '') },
    { kind: 'keyboard', label: KEYBOARD[1].interact },
  ]);
  assert.deepEqual(interactionBindings([null, 4]), [
    { kind: 'keyboard', label: 'Enter' },
    { kind: 'controller', label: GAMEPAD_INTERACT.label },
  ]);
  assert.equal(GAMEPAD_INTERACT.button, 2);
});

test('symbol reader/switch hints respect roles, reader presence, existing priority and completion', () => {
  const stage = make(),
    [reader, tech] = stage.players;
  assert.equal(hints(stage).length, 0);
  place(reader, 340, 404);
  place(tech, 340, 404);
  assert.deepEqual(
    hints(stage).map((hint) => hint.player.id),
    [0],
  );
  assert.equal(hints(stage)[0].object, stage.symbolPuzzle.clue);
  stage.interact(reader);
  assert.equal(hints(stage).length, 0, 'reading is complete');
  place(tech, 253);
  assert.equal(hints(stage)[0].object, stage.symbolPuzzle.symbolBlocks[0]);
  place(reader, 70);
  assert.equal(hints(stage).length, 0, 'switch is unavailable without reader');
  place(reader, 253);
  assert.equal(hints(stage).length, 0, 'wrong role cannot operate switches');
  place(reader, 340, 404);
  for (const symbol of stage.symbolPuzzle.code) {
    const target = stage.symbolPuzzle.symbolBlocks.find((item) => item.symbol === symbol);
    place(tech, target.x + 8);
    assert.equal(hints(stage)[0].object, target);
    stage.interact(tech);
  }
  assert.equal(stage.phase, 'ENTRY');
  assert.equal(hints(stage).length, 0, 'no switch hint after puzzle completion');
});

test('cell and sockets show only usable actions for the carrier role', () => {
  const stage = make(),
    [reader, tech] = stage.players;
  place(reader, 185);
  place(tech, 185);
  assert.equal(hints(stage).length, 0, 'caged cell is unavailable');
  stage.phase = 'ENTRY';
  stage.cell.state = 'LOOSE';
  assert.deepEqual(
    hints(stage).map((hint) => hint.player.id),
    [1],
  );
  assert.equal(hints(stage)[0].object, stage.cell);
  stage.interact(tech);
  assert.equal(hints(stage).length, 0, 'pickup hint vanishes');
  place(tech, 560);
  assert.equal(hints(stage)[0].object, stage.socketA);
  stage.interact(tech);
  assert.equal(stage.cell.state, 'SOCKET_A');
  assert.equal(hints(stage)[0].object, stage.socketA, 'undocking remains a valid interaction');
  stage.interact(tech);
  place(tech, 980);
  assert.equal(hints(stage)[0].object, stage.socketB);
  stage.interact(tech);
  assert.equal(stage.cell.state, 'SOCKET_B');
  assert.equal(hints(stage).length, 0, 'final socket cannot be undocked');
});

test('winch and two charging contacts reuse stage eligibility and keep player inputs independent', () => {
  const stage = make(),
    [reader, tech] = stage.players;
  place(reader, 740, 259);
  place(tech, 740, 259);
  assert.equal(hints(stage).length, 0);
  stage.phase = 'TRANSFER';
  stage.wiringPuzzle.complete = true;
  assert.deepEqual(
    hints(stage).map((hint) => hint.player.id),
    [0],
  );
  assert.equal(hints(stage)[0].object, stage.winch);
  place(reader, 700, 259);
  assert.equal(hints(stage).length, 0, 'outside the exact winch range');
  stage.phase = 'CHARGE';
  place(reader, 1035);
  place(tech, 1100);
  stage.chargePads.forEach((pad, i) => pad.update([stage.players[i]]));
  const mixed = hints(stage, [0, null]);
  assert.deepEqual(
    mixed.map((hint) => hint.binding),
    [
      { kind: 'controller', label: 'X' },
      { kind: 'keyboard', label: 'Enter' },
    ],
  );
  assert.deepEqual(
    mixed.map((hint) => hint.object),
    stage.chargePads,
  );
  place(tech, 900);
  stage.chargePads[1].update([tech]);
  assert.equal(hints(stage).length, 1, 'occupied start station remains available for restart');
  place(tech, 1100);
  stage.chargePads[1].update([tech]);
  stage.restartPuzzle.state = 'READY';
  stage.energyPuzzle.updateCharging(2.6, [{ interactHeld: true }, { interactHeld: true }]);
  assert.equal(stage.phase, 'KEY');
  assert.equal(hints(stage).length, 0);
});

test('key, unlock and exit hints follow exact ranges, ownership and completed state', () => {
  const stage = make(),
    [reader, tech] = stage.players;
  stage.phase = 'KEY';
  place(reader, 1000, 404);
  place(tech, 1000, 404);
  assert.equal(hints(stage).length, 0, 'hidden key is unavailable');
  stage.key.reveal();
  assert.deepEqual(
    hints(stage).map((hint) => hint.player.id),
    [0],
  );
  place(reader, stage.key.x + stage.key.w + 20, 404);
  assert.equal(hints(stage).length, 0, 'exact range edge is excluded');
  reader.x -= 0.1;
  assert.equal(hints(stage)[0].object, stage.key);
  stage.interact(reader);
  assert.equal(hints(stage).length, 0);
  place(reader, 1120);
  place(tech, 1150);
  assert.deepEqual(
    hints(stage).map((hint) => hint.player.id),
    [0],
    'only carrier can unlock',
  );
  stage.interact(reader);
  assert.equal(stage.door.state, 'UNLOCKED');
  assert.deepEqual(
    hints(stage).map((hint) => hint.object),
    [stage.door, stage.door],
  );
  place(tech, 900);
  assert.equal(hints(stage).length, 0, 'exit requires both players');
  place(tech, 1150);
  stage.updateExit([{ interactHeld: true }, { interactHeld: true }]);
  assert.equal(stage.complete, true);
  assert.equal(hints(stage).length, 0);
});

test('all phase queries preserve gameplay state even for denied interactions', () => {
  const stage = make();
  for (const phase of ['SYMBOLS', 'ENTRY', 'TRANSFER', 'CHARGE', 'KEY', 'EXIT']) {
    stage.phase = phase;
    for (const object of [
      stage.cell,
      stage.socketA,
      stage.socketB,
      stage.winch,
      stage.key,
      stage.door,
      stage.symbolPuzzle.clue,
      ...stage.symbolPuzzle.symbolBlocks,
    ]) {
      stage.players.forEach((player) => place(player, object.x, object.y));
      hints(stage);
    }
  }
});

test('rendering draws only mapped labels, circle/keycap shapes and bounded fade/pulse without changing the stage', () => {
  const stage = make();
  stage.phase = 'TRANSFER';
  stage.wiringPuzzle.complete = true;
  stage.cell.state = 'SOCKET_A';
  place(stage.players[0], 740, 259);
  place(stage.players[1], 560);
  const calls = [];
  const ctx = new Proxy(
    { canvas: { width: 1200 }, measureText: (text) => ({ width: text.length * 7 }) },
    {
      get: (target, name) =>
        name in target ? target[name] : (...args) => calls.push([name, ...args]),
      set: (target, name, value) => {
        target[name] = value;
        calls.push([name, value]);
        return true;
      },
    },
  );
  const draw = () => {
    const before = JSON.stringify(stage, (key, value) => (key === 'stage' ? undefined : value));
    drawStage01ControlHints(ctx, stage, interactionBindings([0, null]));
    assert.equal(
      JSON.stringify(stage, (key, value) => (key === 'stage' ? undefined : value)),
      before,
    );
  };
  draw();
  assert.equal(calls.filter(([name]) => name === 'fillText').length, 0, 'starts transparent');
  for (let i = 0; i < 4; i++) {
    stage.time += 0.05;
    draw();
  }
  assert.deepEqual(
    [...new Set(calls.filter(([name]) => name === 'fillText').map(([, label]) => label))],
    ['X', 'Enter'],
  );
  assert.ok(calls.some(([name]) => name === 'arc'));
  assert.ok(calls.some(([name]) => name === 'roundRect'));
  assert.ok(calls.some(([name, alpha]) => name === 'globalAlpha' && alpha > 0 && alpha < 1));
  assert.ok(
    calls.filter(([name]) => name === 'scale').every(([, scale]) => scale >= 0.94 && scale <= 1.05),
  );
  calls.length = 0;
  stage.winch.x += 5;
  stage.players[0].x += 5;
  stage.time += 0.02;
  draw();
  assert.ok(
    calls.some(([name, x]) => name === 'translate' && x === stage.winch.x + stage.winch.w / 2),
  );
  stage.phase = 'CHARGE';
  stage.cell.state = 'SOCKET_B';
  calls.length = 0;
  stage.time += 0.05;
  draw();
  assert.ok(
    calls.some(([name, alpha]) => name === 'globalAlpha' && alpha > 0 && alpha < 1),
    'fades out',
  );
  for (let i = 0; i < 3; i++) {
    calls.length = 0;
    stage.time += 0.05;
    draw();
  }
  assert.equal(calls.filter(([name]) => name === 'fillText').length, 0);
});
