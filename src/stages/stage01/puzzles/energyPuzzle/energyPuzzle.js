import { near } from '../../../../core/physics/collision.js';
import { energyPuzzleConfig } from './energyPuzzleConfig.js';

export class EnergyPuzzle {
  constructor(stage) {
    this.stage = stage;
  }

  updateCarriedCell() {
    const { stage } = this;

    if (stage.cell.state !== 'CARRIED') return;

    const carrier = stage.players.find((player) => player.abilities.carryCell);
    if (!carrier) return;

    // Bepaalt de positie van de batterij wanneer deze gedragen wordt
    stage.cell.x = carrier.x + carrier.w - 3;
    stage.cell.y = carrier.y + 8;
  }

  canCharge() {
    const { stage } = this;

    return stage.phase === 'CHARGE' && stage.chargePads.every((pad) => pad.active);
  }

  updateCharging(dt, inputs) {
    const { stage } = this;

    // Werkt beide laadplaten bij met de bijbehorende speler
    stage.chargePads.forEach((pad, index) => {
      pad.update([stage.players[index]]);
    });

    if (stage.phase !== 'CHARGE') return;

    const bothPlayersCharging = this.canCharge() && inputs.every((input) => input.interactHeld);

    stage.charge = bothPlayersCharging
      ? Math.min(energyPuzzleConfig.chargeDuration, stage.charge + dt)
      : 0;

    if (stage.charge < energyPuzzleConfig.chargeDuration) return;

    // Rondt de energypuzzel af en maakt de sleutel beschikbaar
    stage.phase = 'KEY';
    stage.key.reveal();
    stage.keyPlatform.active = true;
  }

  interact(player, preview = false) {
    const { stage } = this;

    if (!player.abilities.carryCell) {
      if (preview) return null;

      if (
        near(player, stage.cell, 20) ||
        near(player, stage.socketA, 18) ||
        near(player, stage.socketB, 18)
      ) {
        stage.ping = {
          x: player.x + 14,
          y: player.y - 25,
          until: stage.time + 0.7,
        };
      }

      return 'HANDLED';
    }

    if (stage.cell.state === 'LOOSE' && near(player, stage.cell, 20)) {
      if (preview) return stage.cell;

      stage.cell.state = 'CARRIED';
      return 'HANDLED';
    }

    if (near(player, stage.socketA, 18)) {
      if (stage.cell.state === 'CARRIED' && ['ENTRY', 'TRANSFER'].includes(stage.phase)) {
        if (preview) return stage.socketA;

        stage.cell.state = 'SOCKET_A';
        stage.phase = 'TRANSFER';
      } else if (stage.cell.state === 'SOCKET_A') {
        if (preview) return stage.socketA;

        stage.cell.state = 'CARRIED';
      }

      return 'HANDLED';
    }

    if (
      near(player, stage.socketB, 18) &&
      stage.cell.state === 'CARRIED' &&
      stage.phase === 'TRANSFER'
    ) {
      if (preview) return stage.socketB;

      stage.cell.state = 'SOCKET_B';
      stage.phase = 'CHARGE';
      return 'HANDLED';
    }

    return null;
  }
}
