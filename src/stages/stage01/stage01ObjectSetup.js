import { Platform } from '../../entities/objects/platform.js';
import { Door } from '../../entities/objects/door.js';
import { Trigger } from '../../entities/objects/trigger.js';
import { PressurePlate } from '../../entities/objects/pressurePlate.js';
import { Key } from '../../entities/objects/key.js';
import { Winch } from './objects/winch.js';
import { Socket } from './objects/socket.js';
import { EnergyCell } from './objects/energyCell.js';
import { Gate } from './objects/gate.js';

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
  stage.socketA = new Socket(550, 561, 'I');
  stage.socketB = new Socket(970, 561, 'II');
  stage.cell = new EnergyCell(185, 572);
  stage.key = new Key(1000, 414);
  stage.keyPlatform = new Platform(965, 450, 135, 18, '#52548b');
  stage.keyPlatform.active = false;
  stage.platforms.push(stage.keyPlatform);
  stage.chargePads = [new PressurePlate(1025, 592, 45), new PressurePlate(1090, 592, 45)];
  stage.door = new Door(1140, 510, 52, 90);
  stage.exit = new Trigger(1100, 490, 100, 110);
}
