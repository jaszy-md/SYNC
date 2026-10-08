import test from 'node:test';
import assert from 'node:assert/strict';
import { getStage01ControlHints } from '../src/stages/stage01/hints/controlHints.js';
import {
  getStage01Communication,
  getStage01Hint,
} from '../src/stages/stage01/hints/stage01Hints.js';
import { interactionBindings } from '../src/core/input.js';
import { stage01Config } from '../src/stages/stage01/stage01Config.js';
import { makeStage, placeAt, moveAway, solveSymbols } from '../test-support/stage.js';
import { energyPuzzleConfig } from '../src/stages/stage01/puzzles/energyPuzzle/energyPuzzleConfig.js';
const hints = (stage) => getStage01ControlHints(stage, interactionBindings([null, null]));

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
