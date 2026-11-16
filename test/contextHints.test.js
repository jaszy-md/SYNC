import test from 'node:test';
import assert from 'node:assert/strict';
import { getStage01ControlHints } from '../src/stages/stage01/hints/controlHints.js';
import {
  getStage01Communication,
  getStage01Hint,
} from '../src/stages/stage01/hints/stage01Hints.js';
import { interactionBindings } from '../src/core/input.js';
import { drawControlHints } from '../src/ui/controlHints.js';
import { stage01Config } from '../src/stages/stage01/stage01Config.js';
import { makeStage, placeAt, moveAway, solveSymbols } from '../test-support/stage.js';
import { energyPuzzleConfig } from '../src/stages/stage01/puzzles/energyPuzzle/energyPuzzleConfig.js';
const hints = (stage) => getStage01ControlHints(stage, interactionBindings([null, null]));

test('shared hints render single-key circles and longer pills using only the current label', () => {
  const stage = { time: 0 };
  const players = [{ id: 0 }, { id: 1 }];
  const grip = { x: 377, y: 445, w: 0, h: 0 };
  const calls = [];
  const ctx = new Proxy(
    { canvas: { width: 1200 }, measureText: (label) => ({ width: label.length * 6 }) },
    {
      get: (target, key) => target[key] ?? ((...args) => calls.push([key, ...args])),
    },
  );
  const draw = (bindings) =>
    drawControlHints(
      ctx,
      stage,
      bindings.map((binding, id) => ({
        object: grip,
        player: players[id],
        binding,
        align: 'left',
      })),
    );
  draw(interactionBindings([null, null]));
  stage.time += 0.05;
  draw(interactionBindings([null, null]));
  assert.deepEqual(
    calls.filter(([name]) => name === 'fillText').map(([, label]) => label),
    ['E', 'Enter'],
  );
  assert.ok(calls.some(([name, x, y, r]) => name === 'arc' && x === 0 && y === 0 && r === 11));
  assert.ok(calls.some(([name, , , , h, r]) => name === 'roundRect' && h === 22 && r === 11));
  assert.ok(
    calls.filter(([name]) => name === 'translate').every(([, x, y]) => x < grip.x && y < grip.y),
  );
  calls.length = 0;
  stage.time += 0.05;
  draw(interactionBindings([0, null], null, new Map([[0, { id: 'DualSense' }]])));
  assert.deepEqual(
    calls.filter(([name]) => name === 'fillText').map(([, label]) => label),
    ['□', 'Enter'],
  );
  assert.ok(calls.some(([name]) => name === 'arc'));
  calls.length = 0;
  stage.time += 0.01;
  draw([]);
  assert.ok(
    calls.some(([name]) => name === 'fillText'),
    'fade-out still paints on the first frame',
  );
  for (let i = 0; i < 3; i++) {
    stage.time += 0.05;
    draw([]);
  }
  calls.length = 0;
  draw([]);
  assert.ok(!calls.some(([name]) => name === 'fillText'));
});

test('symbol hints require range and the correct role and disappear after completion', () => {
  const stage = makeStage(),
    [explorer, tech] = stage.players,
    clue = stage.symbolPuzzle.clue;
  stage.players.forEach((player) => moveAway(player, clue));
  assert.deepEqual(hints(stage), []);
  placeAt(tech, clue);
  assert.deepEqual(hints(stage), []);
  placeAt(explorer, clue);
  assert.ok(hints(stage).some((h) => h.player === explorer && h.object === clue));
  stage.interact(explorer);
  assert.ok(!hints(stage).some((h) => h.object === clue));
  const block = stage.symbolPuzzle.symbolBlocks.find(
    (b) => b.symbol === stage.symbolPuzzle.code[0],
  );
  placeAt(tech, block);
  assert.ok(hints(stage).some((h) => h.player === tech && h.object === block));
  moveAway(explorer, clue);
  assert.ok(!hints(stage).some((h) => h.object === block));
  solveSymbols(stage);
  assert.ok(!hints(stage).some((h) => stage.symbolPuzzle.symbolBlocks.includes(h.object)));
});
test('usable battery, winch and exit hints follow role, input assignment and progression', () => {
  const stage = makeStage(),
    [explorer, tech] = stage.players;
  solveSymbols(stage);
  stage.players.forEach((player) => placeAt(player, stage.cell));
  assert.ok(hints(stage).some((h) => h.player === tech && h.object === stage.cell));
  assert.ok(!hints(stage).some((h) => h.player === explorer && h.object === stage.cell));
  stage.interact(tech);
  assert.ok(!hints(stage).some((h) => h.object === stage.cell));
  placeAt(tech, stage.socketA);
  stage.interact(tech);
  placeAt(explorer, stage.winch);
  const bindings = interactionBindings([2, null]);
  const winchHint = getStage01ControlHints(stage, bindings).find((h) => h.object === stage.winch);
  assert.equal(winchHint.player, explorer);
  assert.deepEqual(winchHint.binding, bindings[explorer.id]);
  moveAway(explorer, stage.winch);
  assert.ok(!hints(stage).some((h) => h.object === stage.winch));
  stage.interact(tech);
  placeAt(tech, stage.socketB);
  stage.interact(tech);
  stage.players.forEach((player, i) => placeAt(player, stage.chargePads[i]));
  stage.energyPuzzle.updateCharging(energyPuzzleConfig.chargeDuration, [
    { interactHeld: true },
    { interactHeld: true },
  ]);
  placeAt(explorer, stage.key);
  stage.interact(explorer);
  placeAt(explorer, stage.door);
  placeAt(tech, stage.door);
  assert.ok(hints(stage).some((h) => h.object === stage.door && h.player === explorer));
  stage.interact(explorer);
  assert.ok(hints(stage).some((h) => h.object === stage.door && h.player === tech));
  stage.updateExit([{ interactHeld: true }, { interactHeld: true }]);
  assert.deepEqual(hints(stage), []);
});
test('Mica unlock requires collecting the device and world hints reveal only on entering their range', () => {
  for (const role of [0, 1]) {
    const stage = makeStage(),
      player = stage.players[role];
    assert.equal(stage.requestHint(), stage01Config.hints.lockedMessage);
    assert.equal(stage.helpMarker.id, 'memory');
    moveAway(player, stage.hintDevice);
    stage.interact(player);
    assert.equal(stage.progress.hintUnlocked, false);
    placeAt(player, stage.hintDevice);
    assert.equal(stage.interact(player, true), stage.hintDevice);
    assert.equal(stage.progress.hintUnlocked, false, 'preview does not collect');
    stage.interact(player);
    assert.ok(stage.progress.hintUnlocked);
    stage.interact(player);
    assert.equal(stage.phase, 'SYMBOLS');
    assert.equal(stage.cell.state, 'CAGED');
    const beforeInvestigation = getStage01Communication(stage);
    placeAt(stage.players[0], stage.symbolPuzzle.clue);
    stage.interact(stage.players[0]);
    assert.notEqual(getStage01Communication(stage), beforeInvestigation);
    assert.equal(getStage01Communication(stage), getStage01Hint(stage).text);
    stage.requestHint();
    const marker = stage.helpMarker;
    stage.players.forEach((p) => moveAway(p, marker));
    stage.updateRequestedHint();
    assert.equal(stage.helpMarker, marker);
    assert.equal(stage.message, '');
    placeAt(player, marker);
    stage.updateRequestedHint();
    assert.equal(stage.helpMarker, null);
    assert.equal(stage.message, marker.text);
  }
});
