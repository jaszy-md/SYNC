import { Platform } from '../../entities/objects/platform.js';
import { Door } from '../../entities/objects/door.js';
import { Trigger } from '../../entities/objects/trigger.js';
import { PressurePlate } from '../../entities/objects/pressurePlate.js';
import { Key } from '../../entities/objects/key.js';
import { Winch } from './objects/winch.js';
import { EnergySocket } from './objects/energySocket.js';
import { EnergyCell } from './objects/energyCell.js';
import { Gate } from './objects/gate.js';
import { stage01LayoutConfig as layout } from './stage01LayoutConfig.js';
import { energyPuzzleConfig } from './puzzles/energyPuzzle/energyPuzzleConfig.js';

export function initializeStage01ObjectSetup(stage) {
  const platform = ({ x, y, width, height }) => new Platform(x, y, width, height);
  const gate = (rect, label) => new Gate(rect.x, rect.y, rect.width, rect.height, label);
  stage.platforms = ['floor', 'access', 'maintenance', 'duct'].map((name) =>
    platform(layout.platforms[name]),
  );
  stage.bridge = platform(layout.platforms.bridge);
  stage.bridge.active = false;
  stage.gateA = gate(layout.gates.a, '1');
  stage.gateB = gate(layout.gates.b, '2');
  stage.platforms.push(stage.bridge, stage.gateA, stage.gateB);
  stage.plate = new PressurePlate(layout.objects.plate.x, layout.objects.plate.y);
  stage.winch = new Winch(layout.objects.winch.x, layout.objects.winch.y);

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

  stage.key = new Key(layout.objects.key.x, layout.objects.key.y);
  stage.keyPlatform = platform(layout.platforms.key);
  stage.keyPlatform.active = true;
  // Powered return stair folds out after charging, forming an upper loop.
  stage.returnSteps = layout.platforms.returnSteps.map(platform);
  stage.returnSteps.forEach((p) => {
    p.active = false;
  });
  stage.platforms.push(...stage.returnSteps);
  stage.platforms.push(stage.keyPlatform);

  const { door, exit } = layout.objects;
  stage.door = new Door(door.x, door.y, door.width, door.height);
  stage.exit = new Trigger(exit.x, exit.y, exit.width, exit.height);
}
