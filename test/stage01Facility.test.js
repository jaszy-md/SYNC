import test from 'node:test';
import assert from 'node:assert/strict';
import { Stage1 } from '../src/stages/stage01/stage01.js';
import { CHARACTERS } from '../src/entities/player/characters.js';
import { RestartPuzzle } from '../src/stages/stage01/puzzles/restartPuzzle.js';
import { SecurityDrone } from '../src/stages/stage01/objects/securityDrone.js';

const make = () => new Stage1([CHARACTERS[0], CHARACTERS[1]], () => 0.6);
const idle = () => ({ move: 0, jump: false, crouch: false, interact: false, interactHeld: false });
test('repair panel uses separate operator inputs and held remote diagnosis; mistakes and cancel preserve progress', () => {
  const s = make(),
    repair = s.coolingRepair;
  s.phase = 'TRANSFER';
  const [reader, tech] = s.players;
  Object.assign(reader, { x: 660, y: 259 });
  Object.assign(tech, { x: 810, y: 554 });
  const before = JSON.stringify(repair);
  assert.equal(s.interact(tech, true), repair.terminal);
  assert.equal(JSON.stringify(repair), before);
  s.interact(tech);
  assert.equal(repair.owner, 1);
  repair.update(0.01, [idle(), { ...idle(), interact: true }], s.players, true);
  assert.equal(repair.index, 0);
  for (const target of repair.code) {
    repair.selection = (target + 1) % 4;
    repair.update(
      0.01,
      [
        { ...idle(), interactHeld: true },
        { ...idle(), interact: true },
      ],
      s.players,
      true,
    );
    const index = repair.index;
    assert.match(repair.feedback, /VERKEERD/);
    repair.selection = target;
    repair.update(
      0.01,
      [
        { ...idle(), interactHeld: true },
        { ...idle(), interact: true },
      ],
      s.players,
      true,
    );
    assert.equal(repair.index, index + 1);
  }
  assert.equal(repair.complete, true);
  assert.equal(repair.owner, null);
  repair.reset();
  s.interact(tech);
  repair.update(0.01, [idle(), { ...idle(), crouch: true }], s.players, true);
  assert.equal(repair.owner, null);
  assert.equal(s.wiringPuzzle, undefined);
});

test('restart requires warmup, a fresh Explorer switch and Tech confirmation before sustained charging', () => {
  const restart = new RestartPuzzle();
  const pads = [{ active: true }, { active: true }];
  restart.update(3, [{ interactHeld: true }, { interactHeld: true }], pads, true);
  assert.equal(restart.state, 'OFF', 'holding alone cannot bypass the sequence');
  restart.update(0.01, [{ interact: true }, {}], pads, true);
  restart.update(0.2, [{ interact: true }, { interact: true }], pads, true);
  assert.equal(restart.state, 'WARMUP');
  restart.update(1.1, [{}, {}], pads, true);
  restart.update(0.01, [{}, { interact: true }], pads, true);
  assert.equal(restart.state, 'GREEN', 'Tech cannot replace Explorer');
  restart.update(0.01, [{ interact: true }, {}], pads, true);
  pads[1].active = false;
  restart.update(0.01, [{}, { interact: true }], pads, true);
  assert.equal(restart.state, 'CONFIRM');
  pads[1].active = true;
  restart.update(0.01, [{}, { interact: true }], pads, true);
  assert.equal(restart.state, 'READY');
  restart.reset();
  assert.equal(restart.state, 'OFF');
});

test('guardian only wakes after repair, respects Tech bypass and has a forgiving hit cooldown', () => {
  const stage = make();
  const drone = stage.guardian;
  const tech = stage.players[1];
  drone.update(2, stage.players, false);
  assert.equal(drone.active, false);
  Object.assign(tech, { x: drone.x, y: drone.y });
  drone.update(0.01, stage.players, true);
  assert.ok(tech.facilityStun > 0);
  tech.facilityStun = 0;
  drone.update(0.01, stage.players, true);
  assert.equal(tech.facilityStun, 0, 'cannot chain-stun');
  assert.equal(drone.interact(tech, true), drone);
  assert.equal(drone.disabled, 0);
  drone.interact(tech);
  const x = drone.x;
  drone.update(1, stage.players, true);
  assert.equal(drone.x, x);
  assert.equal(drone.disabled, 3);
  drone.update(3.1, stage.players, true);
  assert.equal(drone.disabled, 0);
  drone.reset();
  assert.deepEqual(drone, new SecurityDrone());
});

test('reloading Stage 1 clears every repair, stun and guardian state', () => {
  const stage = make();
  stage.coolingRepair.complete = true;
  stage.restartPuzzle.state = 'READY';
  stage.guardian.disabled = 4;
  stage.players[1].facilityStun = 0.45;
  const fresh = new Stage1(
    stage.players.map((player) => player.character),
    () => 0.6,
  );
  fresh.update(1 / 120, [idle(), idle()]);
  assert.equal(fresh.phase, 'SYMBOLS');
  assert.equal(fresh.coolingRepair.complete, false);
  assert.equal(fresh.restartPuzzle.state, 'OFF');
  assert.equal(fresh.guardian.disabled, 0);
  assert.equal(fresh.guardian.active, false);
  assert.equal(fresh.players[1].facilityStun, 0);
});

test('repair captures only operator movement, debounces stick input, and releases on stun', () => {
  const s = make();
  s.phase = 'TRANSFER';
  Object.assign(s.players[0], { x: 660, y: 259 });
  Object.assign(s.players[1], { x: 810, y: 554 });
  s.interact(s.players[1]);
  for (let i = 0; i < 8; i++)
    s.update(1 / 120, [
      { ...idle(), move: -1 },
      { ...idle(), move: 1 },
    ]);
  assert.ok(s.players[0].x < 660, 'partner keeps moving');
  assert.equal(s.players[1].x, 810, 'operator stays at console');
  assert.equal(s.coolingRepair.selection, 1, 'held stick advances once');
  s.update(1 / 120, [idle(), idle()]);
  s.update(1 / 120, [idle(), { ...idle(), move: -1 }]);
  assert.equal(s.coolingRepair.selection, 0);
  s.players[1].facilityStun = 0.4;
  s.update(1 / 120, [idle(), idle()]);
  assert.equal(s.coolingRepair.owner, null);
});

test('repair overlay renders mapped confirm, choices and cancellation without revealing remote solution', () => {
  const s = make();
  s.phase = 'TRANSFER';
  Object.assign(s.players[1], { x: 810, y: 554 });
  s.interact(s.players[1]);
  const text = [];
  const ctx = new Proxy(
    {
      canvas: { width: 1200 },
      createLinearGradient: () => ({ addColorStop() {} }),
      measureText: (label) => ({ width: label.length * 7 }),
      fillText: (label) => text.push(label),
    },
    { get: (target, key) => target[key] ?? (() => {}) },
  );
  const before = JSON.stringify(s.coolingRepair);
  s.draw(ctx, false, [
    { label: 'E', kind: 'keyboard' },
    { label: 'X', kind: 'controller' },
  ]);
  assert.equal(JSON.stringify(s.coolingRepair), before);
  assert.ok(text.some((label) => label.includes('X: reset')));
  assert.ok(text.some((label) => label.includes('Bukken: sluiten')));
  assert.ok(text.includes('KOELER'));
  assert.equal(s.coolingRepair.linked, false);
});

test('existing gamepad mapping opens, selects and closes the Stage 1 panel', async (t) => {
  const { InputManager } = await import('../src/core/input.js');
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  const pad = {
    index: 5,
    id: 'Panel test',
    connected: true,
    axes: [0, 0],
    buttons: Array.from({ length: 17 }, () => ({ pressed: false })),
  };
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: { getGamepads: () => [pad] },
  });
  t.after(() => {
    if (descriptor) Object.defineProperty(globalThis, 'navigator', descriptor);
    else delete globalThis.navigator;
  });
  const input = new InputManager(new EventTarget());
  input.assignments = [null, 5];
  const s = make();
  s.phase = 'TRANSFER';
  Object.assign(s.players[0], { x: 660, y: 259 });
  Object.assign(s.players[1], { x: 810, y: 554 });
  const frame = () => {
    s.update(1 / 120, input.sample());
    input.endFrame();
  };
  frame();
  pad.buttons[2].pressed = true;
  frame();
  assert.equal(s.coolingRepair.owner, 1);
  pad.buttons[2].pressed = false;
  pad.axes[0] = 1;
  frame();
  frame();
  assert.equal(s.coolingRepair.selection, 1);
  assert.equal(s.players[1].x, 810);
  pad.buttons[1].pressed = true;
  frame();
  assert.equal(s.coolingRepair.owner, null);
});
