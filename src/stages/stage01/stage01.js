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
import { RepairPanel } from './puzzles/repairPanel.js';
import { RestartPuzzle } from './puzzles/restartPuzzle.js';
import { SecurityDrone } from './objects/securityDrone.js';

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
    this.coolingRepair = new RepairPanel(
      {
        title: 'KOELING RESET',
        terminal: { x: 796, y: 550, w: 68, h: 50 },
        monitor: { x: 642, y: 259, w: 88, h: 44 },
        labels: ['VENT', 'POMP', 'FILTER', 'KOELER'],
      },
      random,
    );
    this.archiveRepair = new RepairPanel(
      {
        title: 'ARCHIEF HERSTEL',
        terminal: { x: 90, y: 546, w: 86, h: 54 },
        monitor: { x: 92, y: 272, w: 96, h: 48 },
        labels: ['SCAN', 'CACHE', 'SEAL', 'AUTH'],
      },
      random,
    );
    this.restartPuzzle = new RestartPuzzle();
    this.energyPuzzle = new EnergyPuzzle(this, this.restartPuzzle, () => {
      this.phase = 'ARCHIVE';
    });
    this.guardian = new SecurityDrone();

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

  get activeRepair() {
    return this.phase === 'TRANSFER'
      ? this.coolingRepair
      : this.phase === 'ARCHIVE'
        ? this.archiveRepair
        : null;
  }

  update(dt, inputs) {
    this.time += dt;
    const panelOwner = this.activeRepair?.owner;
    this.coolingRepair.update(dt, inputs, this.players, this.phase === 'TRANSFER');
    this.archiveRepair.update(dt, inputs, this.players, this.phase === 'ARCHIVE');
    if (this.phase === 'ARCHIVE' && this.archiveRepair.complete) {
      this.phase = 'KEY';
      this.key.reveal();
    }
    const effectiveInputs = inputs.map((input, index) => {
      const player = this.players[index];
      player.facilityStun = Math.max(0, (player.facilityStun || 0) - dt);
      return player.facilityStun > 0 || index === panelOwner
        ? { ...input, move: 0, jump: false, interact: false, interactHeld: false }
        : input;
    });

    this.players.forEach((player, index) => {
      player.update(effectiveInputs[index], dt, this.solids, stage01Config.width);
    });

    this.players.forEach((player, index) => {
      if (effectiveInputs[index].interact) this.interact(player);
    });

    this.updateRoutes(effectiveInputs, dt);
    this.energyPuzzle.updateCarriedCell();
    this.energyPuzzle.updateCharging(dt, effectiveInputs);
    this.guardian.update(dt, this.players, ['TRANSFER', 'CHARGE'].includes(this.phase));
    this.updateExit(effectiveInputs);
    this.updateRequestedHint();
  }

  updateRoutes(inputs, dt = 1 / 120) {
    const explorer = this.players.find((player) => player.abilities.operateWinch);

    this.plate.update([explorer]);

    const transferred = ['TRANSFER', 'CHARGE', 'ARCHIVE', 'KEY', 'EXIT'].includes(this.phase);
    const delivered = ['CHARGE', 'ARCHIVE', 'KEY', 'EXIT'].includes(this.phase);

    this.winch.active = this.canOperateWinch(explorer) && inputs[explorer.id].interactHeld;

    this.setGate(this.gateA, transferred || this.plate.active);
    this.setGate(this.gateB, delivered || this.winch.active);

    // De batterij in socket A activeert de brug
    this.bridge.active =
      this.cell.state === 'SOCKET_A' || ['ARCHIVE', 'KEY', 'EXIT'].includes(this.phase);
    this.returnSteps.forEach((p) => {
      p.active = ['ARCHIVE', 'KEY', 'EXIT'].includes(this.phase);
    });
    for (const gate of [this.gateA, this.gateB])
      gate.slide = Math.max(0, Math.min(1, (gate.slide ?? 0) + (gate.active ? -1 : 1) * dt * 3));
  }

  canOperateWinch(player) {
    return (
      ['TRANSFER', 'CHARGE', 'ARCHIVE', 'KEY', 'EXIT'].includes(this.phase) &&
      this.coolingRepair.complete &&
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
    if (player.facilityStun > 0) return null;
    if (this.activeRepair) {
      if (this.activeRepair.owner === player.id) return null;
      const result = this.activeRepair.interact(player, preview);
      if (result) return result;
    }
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
    const energy = this.energyPuzzle.interact(player, preview);
    if (energy) return energy;
    return this.guardian.interact(player, preview);
  }

  requestHint() {
    this.helpMarker = new HelpMarker(getStage01Hint(this));
  }

  draw(ctx, debug = false, bindings = []) {
    drawStage1(ctx, this, debug, bindings);
  }
}
