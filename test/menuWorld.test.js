import test from 'node:test';
import assert from 'node:assert/strict';
import {
  biomeAt,
  JOURNEY,
  createAnimatedWorldBackground,
  environmentKind,
} from '../src/ui/animatedWorldBackground.js';
import {
  travelerPose,
  travelerLayout,
  travelerMirror,
  travelerEntry,
  TRAVELERS,
} from '../src/ui/menuTravelers.js';
import {
  journeyPortalState,
  journeyCycleDuration,
  entryDuration,
  entryArrival,
  portalGeometry,
} from '../src/ui/portalEffect.js';
import { stage01LayoutConfig } from '../src/stages/stage01/stage01LayoutConfig.js';
import { CHARACTERS } from '../src/entities/player/characters.js';
import { createEnvironmentPainter } from '../src/ui/menuEnvironment.js';

test('biomes blend continuously; Sahara persists until the intentional portal reset', () => {
  for (let x = 0; x <= JOURNEY.length; x += 1) {
    const a = biomeAt(x),
      b = biomeAt(x + 1);
    assert.ok(a.every((v, i) => Math.abs(v - b[i]) < 0.003));
  }
  assert.deepEqual(biomeAt(-100), biomeAt(0));
  assert.deepEqual(biomeAt(JOURNEY.length + 100), biomeAt(JOURNEY.length));
  assert.equal(biomeAt(JOURNEY.length)[2], 1);
  assert.equal(biomeAt(JOURNEY.length)[0], 0);
  assert.ok(biomeAt(JOURNEY.length * 0.43)[1] > 0.95);
  assert.ok(biomeAt(JOURNEY.length * 0.86)[3] > 0.95);
});

test('world geometry repeats after the portal veil clears; hidden tabs, submenus and reduced motion stop scheduling', (t) => {
  const names = [
    'document',
    'window',
    'matchMedia',
    'innerWidth',
    'innerHeight',
    'devicePixelRatio',
    'requestAnimationFrame',
    'cancelAnimationFrame',
  ];
  const saved = names.map((name) => [name, Object.getOwnPropertyDescriptor(globalThis, name)]);
  t.after(() =>
    saved.forEach(([name, d]) =>
      d ? Object.defineProperty(globalThis, name, d) : delete globalThis[name],
    ),
  );
  let calls = [],
    pending = null;
  const ctx = new Proxy(
    {},
    {
      get(_, key) {
        if (key === 'createLinearGradient')
          return (...args) => {
            calls.push([key, ...args]);
            return {
              addColorStop(...v) {
                calls.push(['stop', ...v]);
              },
            };
          };
        return (...args) => calls.push([key, ...args]);
      },
      set(_, key, value) {
        calls.push([key, typeof value === 'object' ? 'gradient' : value]);
        return true;
      },
    },
  );
  const canvas = { setAttribute() {}, getContext: () => ctx, remove() {} };
  const doc = new EventTarget();
  doc.body = { prepend() {}, classList: { toggle() {} } };
  doc.createElement = () => canvas;
  const motion = new EventTarget();
  motion.matches = false;
  const values = {
    document: doc,
    window: new EventTarget(),
    matchMedia: () => motion,
    innerWidth: 1200,
    innerHeight: 700,
    devicePixelRatio: 1,
    requestAnimationFrame: (fn) => {
      pending = fn;
      return 1;
    },
    cancelAnimationFrame: () => {
      pending = null;
    },
  };
  Object.entries(values).forEach(([name, value]) =>
    Object.defineProperty(globalThis, name, { configurable: true, value }),
  );
  const world = createAnimatedWorldBackground([0, 1], { ...JOURNEY, characters: false });
  world.setView(true, true);
  calls = [];
  pending(100);
  for (let i = 1; i <= 20; i++) {
    calls = [];
    pending(100 + i * 50);
  }
  const opening = calls;
  const cycleSteps = Math.round(journeyCycleDuration() / 0.05);
  for (let i = 21; i <= cycleSteps + 20; i++) {
    calls = [];
    pending(100 + i * 50);
    if (i === 1247 || i === 1248 || i === 1249) {
      assert.deepEqual(
        calls.at(-2),
        ['fillRect', 0, 0, 1200, 700],
        'the final draw operation fully covers the world before and after reset',
      );
      assert.equal(calls.at(-1)[0], 'restore');
    }
  }
  assert.deepEqual(
    calls,
    opening,
    'full world geometry, colors and ambient poses match after one cycle',
  );
  doc.hidden = true;
  doc.dispatchEvent(new Event('visibilitychange'));
  assert.equal(pending, null);
  doc.hidden = false;
  doc.dispatchEvent(new Event('visibilitychange'));
  assert.ok(pending);
  world.setView(true, false);
  assert.equal(pending, null);
  world.setView(true, true);
  motion.matches = true;
  motion.dispatchEvent(new Event('change'));
  assert.equal(pending, null);
  world.setView(false, false);
  assert.equal(canvas.hidden, true);
  assert.equal(pending, null);
  world.destroy();
});

test('scroll freezes for all seven entries; reset follows the last character under a short glow', () => {
  const finish = 56 + entryDuration();
  for (let t = 56; t < finish; t += 0.01) {
    const s = journeyPortalState(t);
    assert.equal(s.phase, 'enter');
    assert.equal(s.worldSeconds, 56);
    assert.equal(s.veil, 0);
  }
  for (const t of [finish + 0.21, finish + 0.25, finish + 0.29])
    assert.equal(journeyPortalState(t).veil, 1);
  assert.equal(journeyPortalState(finish + 0.24).worldSeconds, 56);
  assert.equal(journeyPortalState(finish + 0.26).worldSeconds, 0);
  assert.equal(journeyPortalState(0).veil, 0);
  const reduced = journeyPortalState(finish + 0.25, 56, true);
  assert.equal(reduced.veil, 0);
  assert.equal(reduced.exitElapsed, null);
});

test('entry queue disappears in order only inside the energy plane and fits the Stage 1 frame', () => {
  for (const [w, h] of [
    [320, 578],
    [1280, 800],
    [844, 390],
  ]) {
    const layout = travelerLayout(w, h, h * 0.65, w * 0.4),
      door = portalGeometry(layout);
    const native = stage01LayoutConfig.objects.door;
    assert.ok(Math.abs(door.w / door.h - native.width / native.height) < 1e-10);
    assert.ok(door.x + door.w < w);
    let previousCount = 0;
    for (let t = 0; t < entryDuration() + 0.1; t += 0.01) {
      const crew = TRAVELERS.map((_, i) => travelerEntry(layout, i, t, door.entryX));
      assert.ok(crew.filter((c) => c.opacity > 0 && c.opacity < 1).length <= 1);
      const count = crew.filter((c) => c.entered).length;
      assert.ok(count >= previousCount);
      previousCount = count;
      crew.forEach((c) => {
        if (c.opacity < 1) assert.ok(c.x >= door.entryX);
      });
    }
    assert.equal(previousCount, 7);
    for (let i = 0; i < 7; i++)
      assert.ok(
        Math.abs(travelerEntry(layout, i, entryArrival(i), door.entryX).x - door.entryX) < 1e-8,
      );
  }
});

test('right-facing jump sources remain unmirrored; left-facing walks and fixed idle side pose mirror', () => {
  for (let i = 0; i < TRAVELERS.length; i++) {
    assert.equal(travelerMirror('jump'), false);
    assert.equal(travelerMirror('walkLeft'), true);
    assert.equal(travelerMirror('walkRight'), true);
    const idle = travelerPose(0, i, 0, true);
    assert.equal(idle.pose, 'walkRight');
    assert.equal(travelerMirror(idle.pose), true);
  }
});

test('all unique playable characters walk, stagger jumps and land before the next leap', () => {
  assert.equal(TRAVELERS.length, CHARACTERS.length);
  assert.equal(new Set(TRAVELERS.map((c) => c.id)).size, TRAVELERS.length);
  const jumping = new Set();
  for (let t = 0; t < 52; t += 0.02) {
    const states = TRAVELERS.map((_, i) => travelerPose(t, i));
    const airborne = states.flatMap((s, i) => (s.lift > 0 ? [i] : []));
    assert.ok(airborne.length <= 1);
    airborne.forEach((i) => jumping.add(i));
    assert.ok(states.every((s) => s.lift >= 0 && s.lift <= 1));
  }
  assert.equal(jumping.size, TRAVELERS.length);
  for (let i = 0; i < TRAVELERS.length; i++) {
    assert.equal(travelerPose(3.19, i).lift, 0);
    assert.equal(travelerPose(10, i, 0, true).pose, 'walkRight');
    assert.equal(travelerPose(10, i, 0, false, 0.2).lift, 0);
  }
});

test('crew bounds stay on screen and below mobile menu actions, including maximum jumps', () => {
  for (const [width, height, bottom, right] of [
    [320, 578, 400, 290],
    [390, 844, 525, 350],
    [1280, 800, 640, 610],
    [844, 390, 275, 490],
  ]) {
    const layout = travelerLayout(width, height, bottom, right);
    assert.ok(layout.left - layout.spriteHeight * 0.4 > 0);
    assert.ok(layout.left + layout.spacing * 6 + layout.spriteHeight * 0.4 < width);
    if (layout.left < right)
      assert.ok(layout.ground - layout.spriteHeight - layout.leap >= bottom + 8);
  }
});

test('facility core is connected industrial wings and Sahara contains varied monuments', () => {
  const core = biomeAt(0),
    desert = biomeAt(JOURNEY.length * 0.86);
  for (let seed = 0; seed < 30; seed++) assert.equal(environmentKind(core, seed, 1), 'factory');
  const kinds = new Set(Array.from({ length: 100 }, (_, seed) => environmentKind(desert, seed, 2)));
  for (const kind of ['obelisk', 'sphinx', 'statue', 'ruin']) assert.ok(kinds.has(kind));
});

test('immutable environment props reuse their raster and release it on disposal', (t) => {
  const saved = Object.getOwnPropertyDescriptor(globalThis, 'OffscreenCanvas');
  t.after(() =>
    saved
      ? Object.defineProperty(globalThis, 'OffscreenCanvas', saved)
      : delete globalThis.OffscreenCanvas,
  );
  let builds = 0,
    blits = 0;
  const brush = new Proxy({}, { get: () => () => {}, set: () => true });
  class Raster {
    constructor(w, h) {
      builds++;
      assert.ok(w < 400 && h < 450);
    }
    getContext() {
      return brush;
    }
  }
  Object.defineProperty(globalThis, 'OffscreenCanvas', { configurable: true, value: Raster });
  const ctx = new Proxy(
    {},
    { get: (_, key) => (key === 'drawImage' ? () => blits++ : () => {}), set: () => true },
  );
  const painter = createEnvironmentPainter();
  for (let frame = 0; frame < 10; frame++)
    painter.draw(ctx, 'factory', frame, 500, 1, [1, 0.2, 0, 0], 42, frame / 60);
  assert.equal(builds, 1, 'scrolling and ambient time reuse the same expensive leaf/window paths');
  assert.equal(blits, 10);
  painter.dispose();
  painter.draw(ctx, 'factory', 0, 500, 1, [1, 0.2, 0, 0], 42, 1);
  assert.equal(builds, 2, 'disposed rasters are no longer retained');
  painter.dispose();
});
