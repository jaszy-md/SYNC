import { near } from '../../../core/physics/collision.js';

// Configurable stations; the reader and operator must remain at different stations.
export class WiringPuzzle {
  constructor(
    random = Math.random,
    monitor = { x: 650, y: 259, w: 64, h: 44 },
    panel = { x: 800, y: 550, w: 54, h: 50 },
  ) {
    this.monitor = monitor;
    this.panel = panel;
    const ports = [1, 2, 3, 4];
    this.code = [0, 1, 2].map(() => ports.splice(Math.floor(random() * ports.length), 1)[0]);
    this.reset();
  }

  reset() {
    this.index = 0;
    this.selection = 1;
    this.complete = false;
    this.status = 'WACHT OP LEZER';
  }

  readerPresent(players) {
    return players.some((p) => p.abilities.readHint && near(p, this.monitor, 18));
  }

  interact(player, players, preview = false) {
    if (this.complete) return null;
    const reader = player.abilities.readHint && near(player, this.monitor, 18);
    const operator = player.abilities.operateSwitch && near(player, this.panel, 18);
    if (!reader && !operator) return null;
    if (preview) return reader ? this.monitor : this.panel;
    if (operator) {
      this.selection = (this.selection % 4) + 1;
      this.status = 'LEZER: BEVESTIG';
    } else if (players.some((p) => p.abilities.operateSwitch && near(p, this.panel, 18))) {
      if (this.selection === this.code[this.index]) {
        this.index++;
        this.selection = 1;
        this.complete = this.index === this.code.length;
        this.status = this.complete ? 'CIRCUITS ONLINE' : 'VERBINDING OK';
      } else {
        this.status = 'GEEN CONTACT • PROBEER OPNIEUW';
      }
    } else this.status = 'TECH: NAAR JUNCTION';
    return 'HANDLED';
  }
}
