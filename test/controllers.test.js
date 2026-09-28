import test from 'node:test';
import assert from 'node:assert/strict';
import { InputManager } from '../src/core/input.js';
import { directionalTarget } from '../src/ui/ui.js';
import {
  connectedPadsView,
  deviceCardsView,
  controllerStatus,
} from '../src/ui/screens/controllersScreen.js';

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
  return { input, emit };
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
  const { input } = setup(t, [pad]);
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
  input.keys.add('KeyS');
  assert.equal(input.sample()[0].crouch, true);
});

test('two equal-name controllers have separate sessions; disconnect clears only the matching assignment', (t) => {
  const first = padAt(2),
    second = padAt(5);
  const pads = [null, null, first, null, null, second];
  const { input, emit } = setup(t, pads);
  input.assignments = [2, 5];
  const original = input.padSessions.get(2).serial;
  pads[2] = null;
  emit('gamepaddisconnected', first);
  assert.deepEqual(input.assignments, [null, 5]);
  pads[7] = padAt(7);
  emit('gamepadconnected', pads[7]);
  assert.notEqual(input.padSessions.get(7).serial, original);
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

test('reconnecting an identical id starts a new session and auto-assigns only the empty Player 1', (t) => {
  const pad = padAt(0);
  const { input, emit } = setup(t, [pad]);
  input.assignments = [null, 0];
  const serial = input.padSessions.get(0).serial;
  emit('gamepaddisconnected', pad);
  assert.deepEqual(input.assignments, [null, null]);
  emit('gamepadconnected', pad);
  assert.deepEqual(input.assignments, [0, null]);
  assert.notEqual(input.padSessions.get(0).serial, serial);
});

test('connected panel renders actual safe API names and separate player assignments', () => {
  const html = connectedPadsView(
    [2, 5],
    [padAt(2, 'USB <Controller>'), padAt(5, 'Bluetooth & Pad')],
  );
  assert.match(html, /USB &lt;Controller&gt;/);
  assert.match(html, /Bluetooth &amp; Pad/);
  assert.match(html, /Verbonden · Geselecteerd · Player 1/);
  assert.match(html, /Verbonden · Geselecteerd · Player 2/);
  assert.match(connectedPadsView([null, null], []), /Geen controllers verbonden/);
});

test('controller setup keeps an empty tile, omits the duplicate count, and cleans select names', () => {
  const empty = connectedPadsView([null, null], []);
  assert.match(empty, /class="connected-controller"/);
  assert.match(empty, /Klik op Detecteren/);
  const html = deviceCardsView(
    [0, 1],
    [0, null],
    [padAt(0, 'Xbox C260 Controller (STANDARD GAMEPAD Vendor: 045e Product: 028e)')],
  );
  const dropdown = html.match(/<div id="device-options-0"[^>]*>(.*?)<\/div>/s)[1];
  assert.match(dropdown, />Xbox C260 Controller<\/button>/);
  assert.doesNotMatch(dropdown, /STANDARD GAMEPAD|Vendor:|Product:/);
  assert.doesNotMatch(html, /controller\(s\) verbonden|class="note"|Maximaal 2 spelers/);
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

test('dropdowns omit the other player controller and status includes the two-player limit', () => {
  const html = deviceCardsView([0, 1], [2, 5], [padAt(2, 'Pad A'), padAt(5, 'Pad B')]);
  const first = html.match(/<div id="device-options-0"[^>]*>(.*?)<\/div>/s)[1];
  const second = html.match(/<div id="device-options-1"[^>]*>(.*?)<\/div>/s)[1];
  assert.match(first, /Pad A/);
  assert.doesNotMatch(first, /Pad B/);
  assert.match(second, /Pad B/);
  assert.doesNotMatch(second, /Pad A/);
  assert.equal(controllerStatus(0), 'Geen controllers verbonden (max. 2)');
  assert.equal(controllerStatus(1), '1 controller verbonden (max. 2)');
  assert.equal(controllerStatus(2), '2 controllers verbonden (max. 2)');
});
