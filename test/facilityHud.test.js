import test from 'node:test';
import assert from 'node:assert/strict';
import { createFacilityHud } from '../src/ui/facilityHud.js';
import { GameState, State } from '../src/core/gameState.js';
import { Stage1 } from '../src/stages/stage01/stage01.js';
import { CHARACTERS } from '../src/entities/player/characters.js';

// Small DOM adapter: exercises the actual HUD handlers with controller UI actions.
function setup(t) {
  const document = { activeElement: null };
  const nodes = new Map();
  function node(id) {
    const classes = new Set(),
      attributes = new Map(),
      listeners = new Map();
    const element = {
      id,
      hidden: false,
      open: false,
      style: { setProperty() {} },
      offsetWidth: 100,
      classList: {
        add: (value) => classes.add(value),
        remove: (value) => classes.delete(value),
        toggle(value, enabled) {
          if (enabled) classes.add(value);
          else classes.delete(value);
        },
        contains: (value) => classes.has(value),
      },
      setAttribute: (key, value) => attributes.set(key, value),
      getAttribute: (key) => attributes.get(key),
      addEventListener: (event, listener) => listeners.set(event, listener),
      click: () => listeners.get('click')?.({ currentTarget: element, target: element }),
      emit: (event, properties = {}) =>
        listeners.get(event)?.({
          target: element,
          preventDefault() {},
          stopPropagation() {},
          ...properties,
        }),
      focus() {
        document.activeElement = element;
      },
      getBoundingClientRect: () => ({ x: 0, y: 0, left: 0, top: 0, width: 1200, height: 660 }),
      showModal() {
        element.open = true;
      },
      close() {
        element.open = false;
      },
      querySelector: (selector) => nodes.get(selector),
    };
    nodes.set(id, element);
    return element;
  }
  for (const selector of [
    '#facility-hud',
    '#gem-flight',
    '#gem-blue',
    '#gem-green',
    '#gem-gold',
    'canvas',
    '#game-controls',
    '#helper',
    '#helper-bubble',
    '#helper-text',
    '#helper-announcement',
    '#facility-map',
    '#map',
    '#pause',
    '#close-map',
    '#close-speech',
    '.map-document',
    '.hud-map-image',
    '.map-icon-fallback',
    '#map-image',
    '#map-fallback',
  ])
    node(selector);
  const controls = nodes.get('#game-controls');
  controls.querySelectorAll = () =>
    ['#helper', '#map', '#pause'].map((selector) => nodes.get(selector));
  controls.contains = (element) => controls.querySelectorAll().includes(element);
  document.querySelector = (selector) => nodes.get(selector);
  const saved = new Map(
    ['document', 'matchMedia', 'ResizeObserver'].map((name) => [
      name,
      Object.getOwnPropertyDescriptor(globalThis, name),
    ]),
  );
  Object.defineProperty(globalThis, 'document', { configurable: true, value: document });
  Object.defineProperty(globalThis, 'matchMedia', {
    configurable: true,
    value: () => ({ matches: false }),
  });
  Object.defineProperty(globalThis, 'ResizeObserver', {
    configurable: true,
    value: class {
      observe() {}
    },
  });
  t.after(() => {
    for (const [name, descriptor] of saved) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else delete globalThis[name];
    }
  });
  const state = new GameState(() => {});
  state.set(State.PLAYING);
  const stage = new Stage1(CHARACTERS.slice(0, 2), () => 0);
  const hud = createFacilityHud({
    state,
    getStage: () => stage,
    returnToWorld: () => nodes.get('canvas').focus(),
  });
  return { hud, stage, state, nodes, document };
}

test('map navigation, Escape and outside clicks close the overlay and restore world focus', (t) => {
  const { hud, state, nodes, document } = setup(t);
  hud.focusControls();
  assert.equal(hud.controlsFocused, true);
  hud.navigate({ direction: 'right' });
  assert.equal(document.activeElement, nodes.get('#map'));
  hud.navigate({ confirm: true });
  assert.equal(state.current, State.MAP);
  assert.equal(nodes.get('#facility-map').open, true);
  assert.equal(document.activeElement, nodes.get('#close-map'));
  hud.navigate({ direction: 'right' });
  assert.equal(state.current, State.MAP);
  hud.navigate({ back: true });
  assert.equal(state.current, State.PLAYING);
  assert.equal(nodes.get('#facility-map').open, false);
  assert.equal(document.activeElement, nodes.get('canvas'));
  assert.equal(hud.controlsFocused, false);
  assert.equal(nodes.get('#map').getAttribute('aria-expanded'), 'false');
  nodes.get('#map').click();
  nodes.get('#facility-map').emit('click', { target: nodes.get('#map-image') });
  assert.equal(state.current, State.MAP, 'map image clicks preserve the overlay');
  nodes.get('#facility-hud').emit('keydown', { code: 'Escape' });
  assert.equal(state.current, State.PLAYING);
  assert.equal(document.activeElement, nodes.get('canvas'));
  nodes.get('#map').click();
  nodes.get('#facility-map').click();
  assert.equal(state.current, State.PLAYING);
  assert.equal(document.activeElement, nodes.get('canvas'));
});

test('helper confirm and HUD back return to game without requiring a mouse', (t) => {
  const { hud, nodes, document, state, stage } = setup(t);
  assert.equal(stage.hintDevice.appearedAt, null);
  hud.focusControls();
  hud.navigate({ confirm: true });
  assert.equal(stage.hintDevice.appearedAt, 0);
  stage.time = 1;
  nodes.get('#helper').click();
  assert.equal(stage.hintDevice.appearedAt, 0);
  assert.match(nodes.get('#helper-announcement').textContent, /geheugenmodule/);
  assert.equal(state.current, State.PLAYING);
  assert.equal(document.activeElement, nodes.get('canvas'));
  hud.focusControls();
  hud.navigate({ back: true });
  assert.equal(document.activeElement, nodes.get('canvas'));
});

test('gem flight maps canvas coordinates to HUD slot and lights only the collected blue slot', (t) => {
  const { hud, stage, nodes } = setup(t);
  nodes.get('canvas').getBoundingClientRect = () => ({
    left: 100,
    top: 50,
    width: 600,
    height: 330,
  });
  nodes.get('#gem-blue').getBoundingClientRect = () => ({
    left: 350,
    top: 400,
    width: 20,
    height: 20,
  });
  Object.assign(stage.blaster.gem, { state: 'flying', x: 590, y: 310, w: 20, h: 20, elapsed: 0 });
  hud.update(0);
  assert.equal(nodes.get('#gem-flight').hidden, false);
  assert.equal(nodes.get('#gem-flight').style.left, '400px');
  assert.equal(nodes.get('#gem-flight').style.top, '210px');
  stage.blaster.gem.elapsed = 0.35;
  hud.update(0);
  assert.equal(nodes.get('#gem-flight').style.left, '380px');
  stage.blaster.updateGemFlight(0.35);
  hud.update(0);
  assert.equal(nodes.get('#gem-flight').hidden, true);
  assert.ok(nodes.get('#gem-blue').classList.contains('collected'));
  assert.ok(!nodes.get('#gem-green').classList.contains('collected'));
  assert.ok(!nodes.get('#gem-gold').classList.contains('collected'));
});
