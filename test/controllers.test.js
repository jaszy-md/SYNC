import test from 'node:test';
import assert from 'node:assert/strict';
import { InputManager, inputMethods, KEYBOARD } from '../src/core/input.js';
import { directionalTarget } from '../src/ui/ui.js';

const nodeAt = (left, top, width = 80, height = 40) => ({
  getBoundingClientRect: () => ({
    left,
    top,
    right: left + width,
    bottom: top + height,
    width,
    height,
  }),
});
const padAt = (index, id = 'Wireless Controller') => ({
  index,
  id,
  connected: true,
  axes: [0, 0],
  buttons: Array.from({ length: 17 }, () => ({ pressed: false })),
});
function setup(t, pads) {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: { getGamepads: () => pads },
  });
  t.after(() => {
    if (descriptor) Object.defineProperty(globalThis, 'navigator', descriptor);
    else delete globalThis.navigator;
  });
  const target = new EventTarget();
  const input = new InputManager(target);
  input.pads();
  const emit = (type, gamepad) => {
    const event = new Event(type);
    event.gamepad = gamepad;
    target.dispatchEvent(event);
  };
  return {
    input,
    emit,
    key: (code) => {
      const event = new Event('keydown', { cancelable: true });
      event.code = code;
      target.dispatchEvent(event);
    },
  };
}

test('spatial focus follows all four directions independent of DOM order and does not wrap', () => {
  const a = nodeAt(0, 0),
    b = nodeAt(100, 0),
    c = nodeAt(0, 60),
    d = nodeAt(100, 60);
  const nodes = [d, c, b, a];
  assert.equal(directionalTarget(nodes, a, 'right'), b);
  assert.equal(directionalTarget(nodes, a, 'down'), c);
  assert.equal(directionalTarget(nodes, b, 'left'), a);
  assert.equal(directionalTarget(nodes, b, 'down'), d);
  assert.equal(directionalTarget(nodes, d, 'up'), b);
  assert.equal(directionalTarget(nodes, c, 'right'), d);
  assert.equal(directionalTarget(nodes, a, 'up'), undefined);
  assert.equal(directionalTarget(nodes, a, 'left'), undefined);
  const below = nodeAt(0, 200),
    diagonal = nodeAt(100, 80);
  assert.equal(directionalTarget([a, diagonal, below], a, 'down'), below);
});

test('D-pad and dominant stick axis expose four directional edges; action mappings stay intact', (t) => {
  const pad = padAt(3);
  const { input, key } = setup(t, [pad]);
  for (const [index, direction] of [
    [12, 'up'],
    [13, 'down'],
    [14, 'left'],
    [15, 'right'],
  ]) {
    pad.buttons[index].pressed = true;
    assert.equal(input.sampleUI().direction, direction);
    assert.equal(input.sampleUI().direction, 0);
    pad.buttons[index].pressed = false;
    input.sampleUI();
  }
  for (const [axes, direction] of [
    [[0.2, -0.9], 'up'],
    [[0, 0.9], 'down'],
    [[-0.9, 0.2], 'left'],
    [[0.9, 0], 'right'],
  ]) {
    pad.axes = axes;
    assert.equal(input.sampleUI().direction, direction);
    pad.axes = [0, 0];
    input.sampleUI();
  }
  input.assignments = [3, null];
  pad.buttons[0].pressed = pad.buttons[1].pressed = pad.buttons[9].pressed = true;
  assert.deepEqual(input.sampleUI(), { direction: 0, confirm: true, back: true, menu: true });
  assert.equal(input.sample()[0].crouch, true);
  pad.buttons[1].pressed = false;
  key('KeyS');
  assert.equal(input.sample()[0].crouch, false);
});

test('equal-name controllers remain independent and disconnect clears only the matching assignment', (t) => {
  const first = padAt(2),
    second = padAt(5);
  const pads = [null, null, first, null, null, second];
  const { input, emit } = setup(t, pads);
  input.assignments = [2, 5];
  pads[2] = null;
  emit('gamepaddisconnected', first);
  assert.deepEqual(input.assignments, [null, 5]);
  pads[7] = padAt(7);
  emit('gamepadconnected', pads[7]);
  assert.deepEqual(input.assignments, [7, 5]);
  pads[7] = padAt(7, 'Different controller');
  input.pads();
  assert.deepEqual(input.assignments, [7, 5]);
  pads[5] = null;
  input.pads();
  assert.deepEqual(input.assignments, [7, null]);
  pads[7] = null;
  input.pads();
  assert.deepEqual(input.assignments, [null, null]);
});

test('first detected controller is assigned automatically without replacing or duplicating assignments', (t) => {
  const pads = [padAt(2)];
  const { input, emit } = setup(t, pads);
  assert.deepEqual(input.assignments, [2, null]);
  pads.push(padAt(5));
  emit('gamepadconnected', pads[1]);
  assert.deepEqual(input.assignments, [2, null]);
  input.assignments = [5, 2];
  pads.push(padAt(8));
  emit('gamepadconnected', pads[2]);
  assert.deepEqual(input.assignments, [5, 2]);
  input.assignments[0] = null;
  pads.push(padAt(9));
  emit('gamepadconnected', pads[3]);
  assert.deepEqual(input.assignments, [5, 2]);
});

test('assignments determine one input source and unique keyboard layouts for every combination', (t) => {
  const pads = [padAt(2), padAt(5)];
  const { input, key } = setup(t, pads);
  const idle = { move: 0, jump: false, crouch: false, interact: false, interactHeld: false };
  for (const [assignments, layouts] of [
    [
      [null, null],
      [0, 1],
    ],
    [
      [2, null],
      [null, 1],
    ],
    [
      [null, 5],
      [1, null],
    ],
    [
      [2, 5],
      [null, null],
    ],
  ]) {
    input.assignments = assignments;
    assert.deepEqual(
      inputMethods(assignments).map((method) => method.layout ?? null),
      layouts,
    );
    const activeLayouts = layouts.filter((layout) => layout !== null);
    assert.equal(new Set(activeLayouts).size, activeLayouts.length);
    input.clear();
    for (const mapping of KEYBOARD) {
      for (const action of ['right', 'jump', 'crouch', 'interact']) {
        key(mapping[action]);
      }
    }
    const actions = input.sample();
    layouts.forEach((layout, player) => {
      assert.deepEqual(
        actions[player],
        layout === null
          ? idle
          : {
              move: 1,
              jump: true,
              crouch: true,
              interact: true,
              interactHeld: true,
            },
      );
    });
    input.clear();
    key('KeyD');
    assert.deepEqual(
      input.sample().map((action) => action.move),
      layouts.map((layout) => (layout === 0 ? 1 : 0)),
    );
    input.clear();
    key('ArrowRight');
    assert.deepEqual(
      input.sample().map((action) => action.move),
      layouts.map((layout) => (layout === 1 ? 1 : 0)),
    );
  }
  input.clear();
  input.assignments = [2, 5];
  pads[0].axes[0] = 1;
  pads[0].buttons[0].pressed = pads[0].buttons[1].pressed = pads[0].buttons[2].pressed = true;
  const actions = input.sample();
  assert.deepEqual(actions[0], {
    move: 1,
    jump: true,
    crouch: true,
    interact: true,
    interactHeld: true,
  });
  assert.deepEqual(actions[1], idle);
});

test('disconnect restores Arrow Keys for the remaining keyboard player and WASD/arrows when both disconnect', (t) => {
  const first = padAt(2),
    second = padAt(5);
  const pads = [first, second];
  const { input, emit, key } = setup(t, pads);
  input.assignments = [2, 5];
  pads[0] = null;
  emit('gamepaddisconnected', first);
  key('ArrowRight');
  assert.deepEqual(inputMethods(input.assignments), [
    { type: 'keyboard', layout: 1 },
    { type: 'controller', index: 5 },
  ]);
  assert.deepEqual(
    input.sample().map((action) => action.move),
    [1, 0],
  );
  pads[1] = null;
  emit('gamepaddisconnected', second);
  assert.deepEqual(inputMethods(input.assignments), [
    { type: 'keyboard', layout: 0 },
    { type: 'keyboard', layout: 1 },
  ]);
  assert.deepEqual(
    input.sample().map((action) => action.move),
    [0, 1],
  );
});
