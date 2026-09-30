import { near } from '../../../core/physics/collision.js';

// Stage-local input consumer. Only the terminal operator is captured; the partner keeps moving.
export class RepairPanel {
  constructor({ title, terminal, monitor, labels }, random = Math.random) {
    Object.assign(this, { title, terminal, monitor, labels });
    const choices = labels.map((_, index) => index);
    this.code = Array.from(
      { length: 3 },
      () => choices.splice(Math.floor(random() * choices.length), 1)[0],
    );
    this.reset();
  }
  reset() {
    Object.assign(this, {
      owner: null,
      index: 0,
      selection: 0,
      complete: false,
      linked: false,
      axis: 0,
      feedback: 'DIAGNOSE NODIG',
      flash: 0,
    });
  }
  interact(player, preview = false) {
    if (!this.complete && player.abilities.readHint && near(player, this.monitor, 18))
      return preview ? this.monitor : 'HANDLED';
    if (this.complete || !player.abilities.operateSwitch || !near(player, this.terminal, 18))
      return null;
    if (preview) return this.terminal;
    this.owner = player.id;
    this.axis = 0;
    return 'HANDLED';
  }
  update(dt, inputs, players, enabled) {
    this.flash = Math.max(0, this.flash - dt);
    const reader = players.find((p) => p.abilities.readHint);
    this.linked =
      enabled &&
      !!reader &&
      near(reader, this.monitor, 18) &&
      inputs[reader.id].interactHeld &&
      !reader.facilityStun;
    if (this.owner === null) return;
    const operator = players[this.owner];
    const input = inputs[this.owner];
    if (
      !enabled ||
      operator.facilityStun > 0 ||
      !near(operator, this.terminal, 25) ||
      input.crouch
    ) {
      this.owner = null;
      return;
    }
    const axis = Math.abs(input.move) > 0.5 ? Math.sign(input.move) : 0;
    if (axis && axis !== this.axis)
      this.selection = (this.selection + axis + this.labels.length) % this.labels.length;
    this.axis = axis;
    if (!input.interact) return;
    if (!this.linked) {
      this.feedback = 'P1: HOUD DIAGNOSE ACTIEF';
      return;
    }
    this.flash = 0.6;
    if (this.selection !== this.code[this.index]) {
      this.feedback = 'VERKEERD SUBSYSTEEM • PROBEER OPNIEUW';
      return;
    }
    this.index++;
    this.feedback = 'STORING VERHOLPEN';
    this.complete = this.index === this.code.length;
    if (this.complete) this.owner = null;
  }
}
