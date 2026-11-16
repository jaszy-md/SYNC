import test from 'node:test';
import assert from 'node:assert/strict';
import { Stage2 } from '../src/stages/stage02/stage02.js';
import { CHARACTERS } from '../src/entities/player/characters.js';
import { idle, makeStage } from '../test-support/stage.js';

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
  assert.equal(stage.players[0].vx, -stage.players[1].vx);
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
  assert.deepEqual(
    stage.players.map((p) => p.abilities),
    [{ jumpSpeed: 500 }, { jumpSpeed: 500 }],
  );
  const facility = makeStage();
  assert.ok(facility.players[0].abilities.jumpSpeed > facility.players[1].abilities.jumpSpeed);
  assert.equal(stage.blaster, undefined);
  assert.equal(stage.symbolPuzzle, undefined);
  assert.equal(stage.energyPuzzle, undefined);
  for (let i = 0; i < 600; i++) {
    stage.update(1 / 120, move);
    assert.equal(stage.players[0].y, stage.players[1].y);
  }
  assert.deepEqual(
    stage.players.map((player) => player.x),
    [0, 1200 - stage.players[1].w],
  );
  assert.ok(stage.players.every((p) => p.grounded && p.y + p.h === stage.solids[0].y));
  assert.equal(stage.complete, false);
});

test('jungle gameplay paints a single flat background and its floor before the players and HUD', () => {
  const stage = new Stage2(CHARACTERS.slice(0, 2));
  const calls = [];
  const ctx = {
    fillRect(...bounds) {
      calls.push([this.fillStyle, ...bounds]);
    },
    save() {},
    restore() {},
    strokeRect() {},
  };
  stage.players.forEach((player) => {
    player.draw = () => calls.push(player.id);
  });
  stage.draw(ctx);
  assert.deepEqual(calls.slice(0, 4), [
    ['#102b22', 0, 0, 1200, 660],
    ['#293d2e', 0, 600, 1200, 60],
    0,
    1,
  ]);
});
