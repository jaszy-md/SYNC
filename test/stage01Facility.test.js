import test from 'node:test';
import assert from 'node:assert/strict';
import { Stage1 } from '../src/stages/stage01/stage01.js';
import { CHARACTERS } from '../src/entities/player/characters.js';
import { WiringPuzzle } from '../src/stages/stage01/puzzles/wiringPuzzle.js';
import { RestartPuzzle } from '../src/stages/stage01/puzzles/restartPuzzle.js';
import { SecurityDrone } from '../src/stages/stage01/objects/securityDrone.js';

const make = () => new Stage1([CHARACTERS[0], CHARACTERS[1]], () => 0.6);
const idle = () => ({ move: 0, jump: false, crouch: false, interact: false, interactHeld: false });
test('wiring splits reading, selecting and confirming; mistakes keep repaired circuits and preview is pure', () => {
  const stage = make();
  const puzzle = stage.wiringPuzzle;
  const [reader, tech] = stage.players;
  stage.phase = 'TRANSFER';
  Object.assign(reader, { x: puzzle.monitor.x, y: puzzle.monitor.y });
  Object.assign(tech, { x: puzzle.panel.x, y: 554 });
  assert.equal(new Set(puzzle.code).size, 3);
  const before = JSON.stringify(puzzle);
  assert.equal(stage.interact(reader, true), puzzle.monitor);
  assert.equal(stage.interact(tech, true), puzzle.panel);
  assert.equal(JSON.stringify(puzzle), before);
  assert.equal(stage.canOperateWinch(reader), false);
  stage.interact(reader);
  assert.equal(puzzle.index, 0, 'wrong cable does not advance');
  for (const port of puzzle.code) {
    while (puzzle.selection !== port) stage.interact(tech);
    reader.x = 20;
    stage.interact(tech);
    assert.equal(puzzle.readerPresent(stage.players), false);
    while (puzzle.selection !== port) stage.interact(tech);
    reader.x = puzzle.monitor.x;
    stage.interact(reader);
  }
  assert.ok(puzzle.complete);
  puzzle.reset();
  assert.equal(puzzle.complete, false);
  assert.equal(puzzle.index, 0);
  assert.deepEqual(new WiringPuzzle(() => 0).code, [1, 2, 3]);
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
  stage.wiringPuzzle.complete = true;
  stage.restartPuzzle.state = 'READY';
  stage.guardian.disabled = 4;
  stage.players[1].facilityStun = 0.45;
  const fresh = new Stage1(
    stage.players.map((player) => player.character),
    () => 0.6,
  );
  fresh.update(1 / 120, [idle(), idle()]);
  assert.equal(fresh.phase, 'SYMBOLS');
  assert.equal(fresh.wiringPuzzle.complete, false);
  assert.equal(fresh.restartPuzzle.state, 'OFF');
  assert.equal(fresh.guardian.disabled, 0);
  assert.equal(fresh.guardian.active, false);
  assert.equal(fresh.players[1].facilityStun, 0);
});
