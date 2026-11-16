import test from 'node:test';
import assert from 'node:assert/strict';
import { Stage2 } from '../src/stages/stage02/stage02.js';
import { CHARACTERS } from '../src/entities/player/characters.js';
import { idle } from '../test-support/stage.js';

test('both jungle players use the normal movement, jump and collision loop on one floor', () => {
  const characters = CHARACTERS.slice(2, 4);
  const stage = new Stage2(characters);
  const start = stage.players.map((player) => player.x);
  assert.equal(stage.solids.length, 1);
  assert.deepEqual(
    stage.players.map((p) => p.character),
    characters,
  );
  const move = [
    { ...idle(), move: -1 },
    { ...idle(), move: 1 },
  ];
  stage.update(1 / 120, move);
  assert.ok(stage.players.every((player) => player.grounded && player.walkElapsedMs > 0));
  assert.deepEqual(
    stage.players.map((player) => player.facing),
    [-1, 1],
  );
  stage.update(
    1 / 120,
    move.map((input) => ({ ...input, jump: true, shoot: true, interact: true })),
  );
  assert.ok(stage.players[0].x < start[0] && stage.players[1].x > start[1]);
  assert.ok(stage.players.every((p) => !p.grounded && p.vy < 0 && p.interactPoseMs === 0));
  assert.equal(stage.blaster, undefined);
  assert.equal(stage.symbolPuzzle, undefined);
  assert.equal(stage.energyPuzzle, undefined);
  for (let i = 0; i < 600; i++) stage.update(1 / 120, move);
  assert.deepEqual(
    stage.players.map((player) => player.x),
    [0, 1200 - stage.players[1].w],
  );
  assert.ok(stage.players.every((p) => p.grounded && p.y + p.h === stage.solids[0].y));
  assert.equal(stage.complete, false);
});
