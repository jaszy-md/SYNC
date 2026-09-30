import { Platform } from '../../entities/objects/platform.js';
import { Door } from '../../entities/objects/door.js';
import { Trigger } from '../../entities/objects/trigger.js';
import { PressurePlate } from '../../entities/objects/pressurePlate.js';
import { Key } from '../../entities/objects/key.js';
import { Winch } from './objects/winch.js';
import { EnergySocket } from './objects/energySocket.js';
import { EnergyCell } from './objects/energyCell.js';
import { Gate } from './objects/gate.js';
import { energyPuzzleConfig } from './puzzles/energyPuzzle/energyPuzzleConfig.js';

export function initializeStage01ObjectSetup(stage) {
  stage.platforms = [
    new Platform(0, 600, 1200, 60, '#2a304c'),
    new Platform(210, 450, 200, 20),
    new Platform(645, 305, 175, 20),
    new Platform(660, 535, 105, 30),
  ];

  stage.bridge = new Platform(465, 370, 140, 18, '#52548b');
  stage.bridge.active = false;

  stage.gateA = new Gate(440, 450, 22, 150, '1');
  stage.gateB = new Gate(870, 350, 22, 250, '2');
  stage.platforms.push(stage.bridge, stage.gateA, stage.gateB);

  stage.plate = new PressurePlate(280, 442);
  stage.winch = new Winch(740, 263);

  // Maakt de energy sockets aan vanuit de configuratie
  stage.socketA = new EnergySocket(
    energyPuzzleConfig.energySockets.a.x,
    energyPuzzleConfig.energySockets.a.y,
    energyPuzzleConfig.energySockets.a.width,
    energyPuzzleConfig.energySockets.a.height,
    energyPuzzleConfig.energySockets.a.label,
  );

  stage.socketB = new EnergySocket(
    energyPuzzleConfig.energySockets.b.x,
    energyPuzzleConfig.energySockets.b.y,
    energyPuzzleConfig.energySockets.b.width,
    energyPuzzleConfig.energySockets.b.height,
    energyPuzzleConfig.energySockets.b.label,
  );

  // Maakt de batterij aan vanuit de configuratie
  stage.cell = new EnergyCell(
    energyPuzzleConfig.cell.x,
    energyPuzzleConfig.cell.y,
    energyPuzzleConfig.cell.width,
    energyPuzzleConfig.cell.height,
  );

  stage.chargePads = energyPuzzleConfig.chargePads.map(
    (pad) => new PressurePlate(pad.x, pad.y, pad.width),
  );

  stage.key = new Key(202, 284);
  stage.keyPlatform = new Platform(80, 320, 165, 20, '#52548b');
  stage.keyPlatform.active = true;
  // Powered return stair folds out after the reactor restart, forming an upper loop.
  stage.returnSteps = [new Platform(915, 505, 70, 18), new Platform(840, 410, 72, 18)];
  stage.returnSteps.forEach((p) => {
    p.active = false;
  });
  stage.platforms.push(...stage.returnSteps);
  stage.platforms.push(stage.keyPlatform);

  stage.door = new Door(1140, 510, 52, 90);
  stage.exit = new Trigger(1100, 490, 100, 110);
}
