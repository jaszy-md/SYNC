import test from 'node:test';
import assert from 'node:assert/strict';
import { PressurePlate } from '../src/entities/objects/pressurePlate.js';
import { overlaps } from '../src/core/physics/collision.js';
import { energyPuzzleConfig } from '../src/stages/stage01/puzzles/energyPuzzle/energyPuzzleConfig.js';
import { stage01Config } from '../src/stages/stage01/stage01Config.js';
import {
  makeStage,
  idle,
  placeAt,
  moveAway,
  solveSymbols,
  dockFirst,
  dockFinal,
  charge,
  collectKey,
} from '../test-support/stage.js';

test('PressurePlate activates for grounded contact and releases when contact is lost', () => {
  const stage = makeStage(),
    player = stage.players[0],
    plate = new PressurePlate(200, 300);
  placeAt(player, plate);
  assert.ok(plate.update([player]));
  player.grounded = false;
  assert.equal(plate.update([player]), false);
  player.grounded = true;
  moveAway(player, plate);
  assert.equal(plate.update([player]), false);
});
test('Gate opens from the Explorer plate and cannot close through a player', () => {
  const stage = makeStage(),
    [explorer, tech] = stage.players;
  placeAt(tech, stage.plate);
  stage.updateRoutes([idle(), idle()]);
  assert.ok(stage.gateA.active, 'Tech cannot open gate');
  placeAt(explorer, stage.plate);
  stage.updateRoutes([idle(), idle()]);
  assert.equal(stage.gateA.active, false);
  moveAway(explorer, stage.plate);
  placeAt(tech, stage.gateA);
  stage.updateRoutes([idle(), idle()]);
  assert.equal(stage.gateA.active, false, 'occupied gate remains open');
  moveAway(tech, stage.gateA);
  stage.updateRoutes([idle(), idle()]);
  assert.ok(stage.gateA.active);
});
test('Winch requires the Explorer in range holding interaction during transfer', () => {
  const stage = makeStage(),
    [explorer, tech] = stage.players;
  placeAt(explorer, stage.winch);
  stage.updateRoutes([{ interactHeld: true }, idle()]);
  assert.equal(stage.winch.active, false);
  dockFirst(stage);
  moveAway(explorer, stage.winch);
  placeAt(tech, stage.winch);
  stage.updateRoutes([idle(), { interactHeld: true }]);
  assert.equal(stage.winch.active, false);
  placeAt(explorer, stage.winch);
  moveAway(tech, stage.gateB);
  stage.updateRoutes([{ interactHeld: true }, idle()]);
  assert.ok(stage.winch.active);
  assert.equal(stage.gateB.active, false);
  stage.updateRoutes([idle(), idle()]);
  assert.equal(stage.winch.active, false);
  assert.ok(stage.gateB.active);
});
test('symbol controls require the correct roles, a read clue and a present reader', () => {
  const stage = makeStage(),
    [explorer, tech] = stage.players,
    puzzle = stage.symbolPuzzle;
  const first = puzzle.symbolBlocks.find((block) => block.symbol === puzzle.code[0]);
  placeAt(tech, puzzle.clue);
  stage.interact(tech);
  assert.equal(puzzle.clue.state, 'UNREAD');
  placeAt(tech, first);
  stage.interact(tech);
  assert.equal(puzzle.matchIndex, 0);
  placeAt(explorer, puzzle.clue);
  stage.interact(explorer);
  assert.equal(puzzle.clue.state, 'READ');
  placeAt(explorer, first);
  stage.interact(explorer);
  assert.equal(puzzle.matchIndex, 0, 'Explorer cannot operate switches');
  moveAway(explorer, puzzle.clue);
  stage.interact(tech);
  assert.equal(puzzle.matchIndex, 0, 'reader must remain present');
  assert.equal(stage.cell.state, 'CAGED');
  assert.equal(stage.phase, 'SYMBOLS');
});
test('a wrong symbol resets partial progress and permits a successful retry', () => {
  const stage = makeStage(),
    [explorer, tech] = stage.players,
    puzzle = stage.symbolPuzzle;
  placeAt(explorer, puzzle.clue);
  stage.interact(explorer);
  placeAt(
    tech,
    puzzle.symbolBlocks.find((block) => block.symbol === puzzle.code[0]),
  );
  stage.interact(tech);
  assert.ok(puzzle.matchIndex > 0);
  placeAt(
    tech,
    puzzle.symbolBlocks.find((block) => !puzzle.code.includes(block.symbol)),
  );
  stage.interact(tech);
  assert.equal(puzzle.matchIndex, 0);
  assert.ok(puzzle.symbolBlocks.every((block) => block.state === 'OFF'));
  assert.equal(stage.phase, 'SYMBOLS');
  solveSymbols(stage);
  assert.equal(stage.phase, 'ENTRY');
});
test('completing symbols releases the cell and repeated switches cannot reset progression', () => {
  const stage = makeStage();
  solveSymbols(stage);
  assert.equal(stage.phase, 'ENTRY');
  assert.equal(stage.cell.state, 'LOOSE');
  stage.symbolPuzzle.symbolBlocks.forEach((block) => {
    placeAt(stage.players[1], block);
    stage.interact(stage.players[1]);
  });
  assert.equal(stage.phase, 'ENTRY');
  assert.equal(stage.cell.state, 'LOOSE');
  assert.ok(
    !stage.solids.some((solid) => overlaps(solid, stage.cell)),
    'released cell has no cage collision',
  );
});
test('EnergyCell is carried only by Tech after release and follows its carrier', () => {
  const stage = makeStage(),
    [explorer, tech] = stage.players;
  placeAt(tech, stage.cell);
  stage.interact(tech);
  assert.equal(stage.cell.state, 'CAGED');
  solveSymbols(stage);
  placeAt(explorer, stage.cell);
  stage.interact(explorer);
  assert.equal(stage.cell.state, 'LOOSE');
  placeAt(tech, stage.cell);
  tech.facilityStun = 1;
  stage.interact(tech);
  assert.equal(stage.cell.state, 'LOOSE');
  tech.facilityStun = 0;
  stage.interact(tech);
  assert.equal(stage.cell.state, 'CARRIED');
  stage.energyPuzzle.updateCarriedCell();
  const before = { x: stage.cell.x, y: stage.cell.y };
  const movement = { x: tech.w * 2, y: -tech.h };
  tech.x += movement.x;
  tech.y += movement.y;
  stage.energyPuzzle.updateCarriedCell();
  assert.equal(stage.cell.x - before.x, movement.x);
  assert.equal(stage.cell.y - before.y, movement.y);
});
test('Socket routing requires the first socket and final delivery cannot be undone', () => {
  const stage = makeStage(),
    tech = stage.players[1];
  solveSymbols(stage);
  placeAt(tech, stage.cell);
  stage.interact(tech);
  placeAt(tech, stage.socketB);
  stage.interact(tech);
  assert.equal(stage.phase, 'ENTRY');
  assert.equal(stage.cell.state, 'CARRIED');
  placeAt(tech, stage.socketA);
  stage.interact(tech);
  stage.updateRoutes([idle(), idle()]);
  assert.equal(stage.phase, 'TRANSFER');
  assert.equal(stage.cell.state, 'SOCKET_A');
  assert.ok(stage.bridge.active);
  stage.interact(tech);
  stage.updateRoutes([idle(), idle()]);
  assert.equal(stage.cell.state, 'CARRIED');
  assert.equal(stage.bridge.active, false);
  stage.interact(tech);
  stage.updateRoutes([idle(), idle()]);
  assert.ok(stage.bridge.active);
  stage.interact(tech);
  placeAt(tech, stage.socketB);
  stage.interact(tech);
  assert.equal(stage.phase, 'CHARGE');
  assert.equal(stage.cell.state, 'SOCKET_B');
  stage.interact(tech);
  assert.equal(stage.cell.state, 'SOCKET_B');
  assert.equal(stage.phase, 'CHARGE');
});
test('charging requires both assigned contacts and sustained interaction and resets on interruption', () => {
  const stage = makeStage();
  dockFinal(stage);
  const duration = energyPuzzleConfig.chargeDuration;
  stage.players.forEach((player) => placeAt(player, stage.chargePads[0]));
  const both = [{ interactHeld: true }, { interactHeld: true }];
  stage.energyPuzzle.updateCharging(duration, both);
  assert.equal(stage.charge, 0);
  assert.equal(stage.key.state, 'HIDDEN');
  stage.players.forEach((player, i) => placeAt(player, stage.chargePads[i]));
  stage.energyPuzzle.updateCharging(duration, [{ interactHeld: true }, idle()]);
  assert.equal(stage.charge, 0);
  stage.energyPuzzle.updateCharging(duration / 2, both);
  assert.ok(stage.charge > 0 && stage.phase === 'CHARGE');
  stage.energyPuzzle.updateCharging(1, [idle(), idle()]);
  assert.equal(stage.charge, 0);
  stage.energyPuzzle.updateCharging(duration / 2, both);
  moveAway(stage.players[1], stage.chargePads[1]);
  stage.energyPuzzle.updateCharging(1, both);
  assert.equal(stage.charge, 0);
});
test('completed charging reveals the Key once while keeping the portal locked', () => {
  const stage = makeStage();
  charge(stage);
  assert.equal(stage.phase, 'KEY');
  assert.equal(stage.key.state, 'VISIBLE');
  assert.equal(stage.door.state, 'LOCKED');
  stage.energyPuzzle.updateCharging(energyPuzzleConfig.chargeDuration, [idle(), idle()]);
  assert.equal(stage.phase, 'KEY');
  assert.equal(stage.key.state, 'VISIBLE');
  assert.equal(stage.door.state, 'LOCKED');
});
test('only a nearby Explorer can collect a revealed Key and collection is idempotent', () => {
  const stage = makeStage(),
    [explorer, tech] = stage.players;
  placeAt(explorer, stage.key);
  assert.equal(stage.key.collect(explorer), false, 'hidden key cannot be collected');
  charge(stage);
  placeAt(tech, stage.key);
  stage.interact(tech);
  assert.equal(stage.phase, 'KEY');
  moveAway(explorer, stage.key);
  stage.interact(explorer);
  assert.equal(stage.key.state, 'VISIBLE');
  placeAt(explorer, stage.key);
  stage.interact(explorer);
  assert.equal(stage.key.state, 'COLLECTED');
  assert.equal(stage.phase, 'EXIT');
  assert.equal(stage.keyCarrier, explorer.id);
  assert.equal(stage.key.collect(explorer), false);
  stage.interact(explorer);
  assert.equal(stage.key.state, 'COLLECTED');
});
test('Door unlock needs its key carrier and exit Trigger requires both players interacting', () => {
  const stage = makeStage(),
    [explorer, tech] = stage.players;
  collectKey(stage);
  placeAt(tech, stage.door);
  stage.interact(tech);
  assert.equal(stage.door.state, 'LOCKED');
  placeAt(explorer, stage.door);
  stage.interact(explorer);
  assert.equal(stage.door.state, 'UNLOCKED');
  moveAway(tech, stage.exit);
  assert.equal(stage.exit.contains(tech), false);
  stage.updateExit([{ interactHeld: true }, { interactHeld: true }]);
  assert.equal(stage.complete, false);
  placeAt(tech, stage.door);
  assert.ok(stage.exit.contains(explorer) && stage.exit.contains(tech));
  stage.updateExit([{ interactHeld: true }, idle()]);
  assert.equal(stage.complete, false);
  stage.updateExit([{ interactHeld: true }, { interactHeld: true }]);
  assert.ok(stage.complete);
  assert.equal(stage.door.state, 'OPEN');
  stage.updateExit([{ interactHeld: true }, { interactHeld: true }]);
  assert.ok(stage.complete);
});
test('both roles can climb the current raised portal route and finish the energy relay', (t) => {
  const previous = stage01Config.enemies.guardsEnabled;
  stage01Config.enemies.guardsEnabled = false;
  t.after(() => {
    stage01Config.enemies.guardsEnabled = previous;
  });
  const stage = makeStage();
  collectKey(stage);
  const floor = stage.platforms.find((p) => p.y === Math.max(...stage.platforms.map((s) => s.y)));
  function jumpTo(player, target) {
    for (let frame = 0; frame < 160; frame++) {
      const actions = stage.players.map(idle);
      actions[player.id] = {
        ...idle(),
        jump: frame === 0,
        move: Math.abs(player.x - target) > 2 ? Math.sign(target - player.x) : 0,
      };
      stage.update(1 / 120, actions);
    }
  }
  for (const player of stage.players) {
    Object.assign(player, {
      x: stage.portalStep.x - player.w - 8,
      y: floor.y - player.h,
      vy: 0,
      grounded: true,
    });
    jumpTo(player, stage.portalStep.x + stage.portalStep.w / 3);
    assert.ok(
      player.grounded && player.y + player.h === stage.portalStep.y,
      'role lands on the step',
    );
    jumpTo(player, stage.door.x + (player.id ? player.w / 2 : 0));
    assert.ok(
      player.grounded && player.y + player.h === stage.portalPlatform.y,
      'role lands on portal platform',
    );
  }
  stage.interact(stage.players[0]);
  stage.updateExit([{ interactHeld: true }, { interactHeld: true }]);
  assert.equal(stage.complete, true);
});
test('stage reset restores progression, entities and hint lock while preserving character choices', () => {
  const stage = makeStage(),
    characters = stage.players.map((p) => p.character);
  collectKey(stage);
  stage.progress.hintUnlocked = true;
  stage.requestHint();
  stage.complete = true;
  stage.door.unlock();
  stage.reset();
  assert.deepEqual(
    stage.players.map((p) => p.character),
    characters,
  );
  assert.equal(stage.phase, 'SYMBOLS');
  assert.equal(stage.cell.state, 'CAGED');
  assert.equal(stage.key.state, 'HIDDEN');
  assert.equal(stage.door.state, 'LOCKED');
  assert.equal(stage.keyCarrier, null);
  assert.equal(stage.complete, false);
  assert.equal(stage.charge, 0);
  assert.equal(stage.progress.hintUnlocked, false);
  assert.equal(stage.helpMarker, null);
  assert.ok(stage.health.every((h) => h.value === h.max));
  solveSymbols(stage);
  assert.equal(stage.phase, 'ENTRY', 'reset stage can progress again');
});
