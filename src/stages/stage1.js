import { drawStage1 } from './stage1View.js';
import { Player } from '../player.js';
import {
  Platform,
  Door,
  Trigger,
  HelpMarker,
  PressurePlate,
  Hint,
  Switch,
  Key,
} from '../objects.js';
import { near, overlaps } from '../collision.js';

// Energy relay: the same physical cell must be moved between two sockets.
// Opening a passage requires a partner to remain at a remote control.
export class Stage1 {
  constructor(characters, random = Math.random) {
    this.players = characters.map(
      (c, i) =>
        new Player(
          i,
          c,
          { x: 70 + i * 65, y: 554 },
          i === 0
            ? {
                jumpSpeed: 760,
                operateWinch: true,
                readHint: true,
                collectKey: true,
                role: 'Explorer',
              }
            : { jumpSpeed: 500, carryCell: true, operateSwitch: true, role: 'Tech' },
        ),
    );
    this.platforms = [
      new Platform(0, 600, 1200, 60, '#2a304c'),
      new Platform(210, 450, 200, 20),
      new Platform(645, 305, 175, 20),
      new Platform(660, 535, 105, 30),
    ];
    this.bridge = new Platform(465, 370, 140, 18, '#52548b');
    this.bridge.active = false;
    this.gateA = new Platform(440, 450, 22, 150, '#673554');
    this.gateB = new Platform(870, 350, 22, 250, '#673554');
    this.platforms.push(this.bridge, this.gateA, this.gateB);
    this.plate = new PressurePlate(280, 442);
    this.winch = { x: 740, y: 263, w: 40, h: 42, active: false };
    this.socketA = { x: 550, y: 561, w: 44, h: 39 };
    this.socketB = { x: 970, y: 561, w: 44, h: 39 };
    this.cell = { x: 185, y: 572, w: 24, h: 26, state: 'CAGED' };
    const symbols = ['○', '△', '□'],
      first = Math.floor(random() * 3);
    this.code = [symbols[first], symbols[(first + 1 + Math.floor(random() * 2)) % 3]];
    this.symbolHint = new Hint(335, 398, this.code.join(' '));
    this.symbolHint.w = 78;
    this.symbolSwitches = symbols.map((symbol, i) => new Switch(245 + i * 65, 566, symbol));
    this.matchIndex = 0;
    this.key = new Key(1000, 414);
    this.keyCarrier = null;
    this.keyPlatform = new Platform(965, 450, 135, 18, '#52548b');
    this.keyPlatform.active = false;
    this.platforms.push(this.keyPlatform);
    this.chargePads = [new PressurePlate(1025, 592, 45), new PressurePlate(1090, 592, 45)];
    this.door = new Door(1140, 510, 52, 90);
    this.exit = new Trigger(1100, 490, 100, 110);
    this.phase = 'SYMBOLS';
    this.charge = 0;
    this.time = 0;
    this.complete = false;
    this.helpMarker = null;
    this.message = '';
    this.ping = null;
  }
  get solids() {
    return this.platforms.filter((p) => p.active);
  }
  update(dt, inputs) {
    this.time += dt;
    this.players.forEach((p, i) => p.update(inputs[i], dt, this.solids));
    this.players.forEach((p, i) => {
      if (inputs[i].interact) this.interact(p);
    });
    this.updateRoutes(inputs);
    this.updateCarriedCell();
    this.updateCharging(dt, inputs);
    this.updateExit(inputs);
    this.updateRequestedHint();
  }
  updateRoutes(inputs) {
    const explorer = this.players.find((p) => p.abilities.operateWinch);
    this.plate.update([explorer]);
    const transferred = ['TRANSFER', 'CHARGE', 'KEY', 'EXIT'].includes(this.phase);
    const delivered = ['CHARGE', 'KEY', 'EXIT'].includes(this.phase);
    this.winch.active =
      transferred && near(explorer, this.winch, 12) && inputs[explorer.id].interactHeld;
    this.setGate(this.gateA, transferred || this.plate.active);
    this.setGate(this.gateB, delivered || this.winch.active);
    this.bridge.active = this.cell.state === 'SOCKET_A';
  }
  updateCarriedCell() {
    if (this.cell.state === 'CARRIED') {
      const carrier = this.players.find((p) => p.abilities.carryCell);
      this.cell.x = carrier.x + carrier.w - 3;
      this.cell.y = carrier.y + 8;
    }
  }
  updateCharging(dt, inputs) {
    this.chargePads.forEach((pad, i) => pad.update([this.players[i]]));
    if (this.phase === 'CHARGE') {
      const together =
        this.chargePads.every((p) => p.active) && inputs.every((i) => i.interactHeld);
      this.charge = together ? Math.min(2.5, this.charge + dt) : 0;
      if (this.charge >= 2.5) {
        this.phase = 'KEY';
        this.key.reveal();
        this.keyPlatform.active = true;
      }
    }
  }
  updateExit(inputs) {
    if (
      this.phase === 'EXIT' &&
      this.players.every((p) => this.exit.contains(p)) &&
      this.door.open(this.players, inputs)
    )
      this.complete = true;
  }
  updateRequestedHint() {
    if (this.helpMarker) {
      const point = this.hintPoint();
      if (point.id !== this.helpMarker.id) this.helpMarker = new HelpMarker(point);
      const reached = this.players.some((p) => this.helpMarker.contains(p));
      if (!reached) this.helpMarker.ready = true;
      else if (this.helpMarker.ready) {
        this.message = this.helpMarker.text;
        this.helpMarker = null;
      }
    }
  }

  setGate(gate, open) {
    // Never close a sluice through a player. Leaving it closes it safely.
    gate.active = !open && !this.players.some((p) => overlaps(p, gate));
  }
  interact(player) {
    if (this.phase === 'SYMBOLS' && this.interactWithSymbols(player)) return;
    if (this.phase === 'KEY' && this.key.collect(player)) {
      this.keyCarrier = player.id;
      this.phase = 'EXIT';
      return;
    }
    if (this.phase === 'EXIT' && player.id === this.keyCarrier && near(player, this.door, 40)) {
      this.door.unlock();
      return;
    }
    if (!player.abilities.carryCell) {
      if (
        near(player, this.cell, 20) ||
        near(player, this.socketA, 18) ||
        near(player, this.socketB, 18)
      )
        this.ping = { x: player.x + 14, y: player.y - 25, until: this.time + 0.7 };
      return;
    }
    if (this.cell.state === 'LOOSE' && near(player, this.cell, 20)) {
      this.cell.state = 'CARRIED';
      return;
    }
    if (near(player, this.socketA, 18)) {
      if (this.cell.state === 'CARRIED' && ['ENTRY', 'TRANSFER'].includes(this.phase)) {
        this.cell.state = 'SOCKET_A';
        this.phase = 'TRANSFER';
      } else if (this.cell.state === 'SOCKET_A') this.cell.state = 'CARRIED';
      return;
    }
    if (
      near(player, this.socketB, 18) &&
      this.cell.state === 'CARRIED' &&
      this.phase === 'TRANSFER'
    ) {
      this.cell.state = 'SOCKET_B';
      this.phase = 'CHARGE';
    }
  }
  interactWithSymbols(player) {
    if (near(player, this.symbolHint, 18)) {
      this.symbolHint.read(player);
      return true;
    }
    const target = this.symbolSwitches.find((s) => near(player, s, 14));
    if (target) {
      const reader = this.players.find((p) => p.abilities.readHint);
      if (
        !player.abilities.operateSwitch ||
        this.symbolHint.state !== 'READ' ||
        !near(reader, this.symbolHint, 25)
      )
        return true;
      if (target.activate(player, target.symbol === this.code[this.matchIndex]) === 'ON') {
        if (++this.matchIndex === this.code.length) {
          this.cell.state = 'LOOSE';
          this.phase = 'ENTRY';
        }
      } else {
        this.matchIndex = 0;
        this.symbolSwitches.forEach((s) => (s.state = 'OFF'));
        this.ping = { x: target.x + 12, y: target.y - 15, until: this.time + 0.7 };
      }
      return true;
    }

    return false;
  }
  hintPoint() {
    if (this.phase === 'SYMBOLS')
      return {
        id: 'symbols',
        x: 215,
        y: 562,
        text: 'Explorer: spring naar de hoge terminal en lees de twee symbolen met interactie. Blijf erbij. Tech: match beneden beide symbolen in volgorde om de batterij-kooi te openen.',
      };
    if (this.phase === 'ENTRY')
      return {
        id: 'entry',
        x: 215,
        y: 562,
        text: 'Tech: pak de gele energiecel met interactie. Explorer: spring vanaf de start op het linker platform en blijf op de drukplaat. Tech kan dan door sluis 1 en de cel in aansluiting I zetten.',
      };
    if (this.phase === 'TRANSFER' && this.cell.state === 'SOCKET_A')
      return {
        id: 'climb',
        x: 670,
        y: 267,
        text: 'Explorer: spring via de gevoede brug naar dit vaste platform. Ga naar de lier rechts en houd interactie vast. Tech kan de cel nu weer meenemen; de brug verdwijnt.',
      };
    if (this.phase === 'TRANSFER')
      return {
        id: 'transfer',
        x: 798,
        y: 562,
        text: 'Explorer: houd de lier vast om sluis 2 open te houden. Tech: kruip met de cel onder de balk door en zet hem in aansluiting II rechts. Laat de lier pas los wanneer je partner erdoor is.',
      };
    if (this.phase === 'CHARGE')
      return {
        id: 'charge',
        x: 1017,
        y: 559,
        text: 'Ga op jullie eigen gemarkeerde vloercontact staan: P1 links, P2 rechts. Houd allebei interactie vast tot de ring gevuld is. Daarmee verschijnen het sleutelplatform en de sleutel, niet een open deur.',
      };
    if (this.phase === 'KEY')
      return {
        id: 'key',
        x: 922,
        y: 562,
        text: 'Explorer: neem links van het nieuwe platform een aanloop en spring naar de sleutel. Pak hem met interactie. Neem hem mee naar de deur en ontgrendel die daar.',
      };
    return {
      id: 'exit',
      x: 1135,
      y: 559,
      text: 'De Explorer draagt de sleutel: gebruik interactie bij de deur om te ontgrendelen. Kom daarna allebei bij de uitgang en houd samen interactie vast.',
    };
  }
  requestHint() {
    this.helpMarker = new HelpMarker(this.hintPoint());
  }
  draw(ctx, debug = false) {
    drawStage1(ctx, this, debug);
  }
}
