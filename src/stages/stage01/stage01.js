import { drawStage1 } from './stage01View.js';
import { Player } from '../../entities/player/createPlayer.js';
import { HelpMarker } from '../../entities/objects/helpMarker.js';
import { near, overlaps } from '../../core/physics/collision.js';
import { stage01Config } from './stage01Config.js';
import { playerAbilities } from './players/abilities.js';
import { initializeStage01ObjectSetup } from './stage01ObjectSetup.js';
import { SymbolPuzzle } from './puzzles/symbolPuzzle.js';
import { getStage01Hint } from './hints/stage01Hints.js';

// Energy relay: the same physical cell must be moved between two sockets.
// Opening a passage requires a partner to remain at a remote control.
export class Stage1 {
  constructor(characters, random = Math.random) {
    this.players = characters.map(
      (c, i) =>
        new Player(
          i,
          c,
          { x: stage01Config.spawn.x + i * stage01Config.spawn.spacing, y: stage01Config.spawn.y },
          { ...(i === 0 ? playerAbilities.player1 : playerAbilities.player2) },
        ),
    );
    initializeStage01ObjectSetup(this);
    this.symbolPuzzle = new SymbolPuzzle(random);
    this.keyCarrier = null;
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
    this.players.forEach((p, i) => p.update(inputs[i], dt, this.solids, stage01Config.width));
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
      const point = getStage01Hint(this);
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
    if (this.phase === 'SYMBOLS') {
      const result = this.symbolPuzzle.interact(player, this.players);
      if (result === 'COMPLETE') {
        this.cell.state = 'LOOSE';
        this.phase = 'ENTRY';
      } else if (result === 'WRONG') {
        this.ping = { ...this.symbolPuzzle.ping, until: this.time + 0.7 };
      }
      if (result) return;
    }
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
  requestHint() {
    this.helpMarker = new HelpMarker(getStage01Hint(this));
  }
  draw(ctx, debug = false) {
    drawStage1(ctx, this, debug);
  }
}
