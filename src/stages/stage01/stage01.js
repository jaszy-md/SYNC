import { drawStage1 } from './stage01View.js';
import { Player } from '../../entities/player/createPlayer.js';
import { HelpMarker } from '../../entities/objects/helpMarker.js';
import { near, overlaps } from '../../core/physics/collision.js';
import { stage01Config } from './stage01Config.js';
import { playerAbilities } from './players/abilities.js';
import { initializeStage01ObjectSetup } from './stage01ObjectSetup.js';
import { SymbolPuzzle } from './puzzles/symbolPuzzle/symbolPuzzle.js';
import { EnergyPuzzle } from './puzzles/energyPuzzle/energyPuzzle.js';
import { getStage01Hint } from './hints/stage01Hints.js';

// Energy relay: the same physical cell must be moved between two sockets.
// Opening a passage requires a partner to remain at a remote control.
export class Stage1 {
  constructor(characters, random = Math.random) {
    this.players = characters.map(
      (character, index) =>
        new Player(
          index,
          character,
          {
            x: stage01Config.spawn.x + index * stage01Config.spawn.spacing,
            y: stage01Config.spawn.y,
          },
          { ...(index === 0 ? playerAbilities.player1 : playerAbilities.player2) },
        ),
    );

    initializeStage01ObjectSetup(this);

    this.symbolPuzzle = new SymbolPuzzle(random);
    this.energyPuzzle = new EnergyPuzzle(this);

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
    return this.platforms.filter((platform) => platform.active);
  }

  update(dt, inputs) {
    this.time += dt;

    this.players.forEach((player, index) => {
      player.update(inputs[index], dt, this.solids, stage01Config.width);
    });

    this.players.forEach((player, index) => {
      if (inputs[index].interact) this.interact(player);
    });

    this.updateRoutes(inputs);
    this.energyPuzzle.updateCarriedCell();
    this.energyPuzzle.updateCharging(dt, inputs);
    this.updateExit(inputs);
    this.updateRequestedHint();
  }

  updateRoutes(inputs) {
    const explorer = this.players.find((player) => player.abilities.operateWinch);

    this.plate.update([explorer]);

    const transferred = ['TRANSFER', 'CHARGE', 'KEY', 'EXIT'].includes(this.phase);
    const delivered = ['CHARGE', 'KEY', 'EXIT'].includes(this.phase);

    this.winch.active = this.canOperateWinch(explorer) && inputs[explorer.id].interactHeld;

    this.setGate(this.gateA, transferred || this.plate.active);
    this.setGate(this.gateB, delivered || this.winch.active);

    // De batterij in socket A activeert de brug
    this.bridge.active = this.cell.state === 'SOCKET_A';
  }

  canOperateWinch(player) {
    return (
      ['TRANSFER', 'CHARGE', 'KEY', 'EXIT'].includes(this.phase) &&
      player.abilities.operateWinch &&
      near(player, this.winch, 12)
    );
  }

  canExit() {
    return this.phase === 'EXIT' && this.players.every((player) => this.exit.contains(player));
  }

  updateExit(inputs) {
    if (this.canExit() && this.door.open(this.players, inputs)) {
      this.complete = true;
    }
  }

  updateRequestedHint() {
    if (!this.helpMarker) return;

    const point = getStage01Hint(this);

    if (point.id !== this.helpMarker.id) {
      this.helpMarker = new HelpMarker(point);
    }

    const reached = this.players.some((player) => this.helpMarker.contains(player));

    if (!reached) {
      this.helpMarker.ready = true;
    } else if (this.helpMarker.ready) {
      this.message = this.helpMarker.text;
      this.helpMarker = null;
    }
  }

  setGate(gate, open) {
    // Sluit een sluis nooit door een speler heen
    gate.active = !open && !this.players.some((player) => overlaps(player, gate));
  }

  // Preview gebruikt dezelfde voorwaarden zonder de game state te wijzigen
  interact(player, preview = false) {
    if (this.phase === 'SYMBOLS') {
      const result = this.symbolPuzzle.interact(player, this.players, preview);

      if (preview && result) {
        return typeof result === 'object' ? result : null;
      }

      if (result === 'COMPLETE') {
        this.cell.state = 'LOOSE';
        this.phase = 'ENTRY';
      } else if (result === 'WRONG') {
        this.ping = {
          ...this.symbolPuzzle.ping,
          until: this.time + 0.7,
        };
      }

      if (result) return;
    }

    if (
      this.phase === 'KEY' &&
      (preview ? this.key.canCollect(player) : this.key.collect(player))
    ) {
      if (preview) return this.key;

      this.keyCarrier = player.id;
      this.phase = 'EXIT';
      return;
    }

    if (this.phase === 'EXIT' && player.id === this.keyCarrier && near(player, this.door, 40)) {
      if (preview) {
        return this.door.state === 'LOCKED' ? this.door : null;
      }

      this.door.unlock();
      return;
    }

    // De energypuzzel handelt batterij- en socketinteracties af
    return this.energyPuzzle.interact(player, preview);
  }

  requestHint() {
    this.helpMarker = new HelpMarker(getStage01Hint(this));
  }

  draw(ctx, debug = false, bindings = []) {
    drawStage1(ctx, this, debug, bindings);
  }
}
