import { near, overlaps } from '../../../core/physics/collision.js';

export class SecurityDrone {
  constructor() {
    this.reset();
  }
  reset() {
    Object.assign(this, {
      x: 910,
      y: 566,
      w: 34,
      h: 26,
      direction: -1,
      disabled: 0,
      time: 0,
      active: false,
      cooldown: [0, 0],
    });
  }
  interact(player, preview = false) {
    if (
      !this.active ||
      this.disabled > 0 ||
      !player.abilities.operateSwitch ||
      !near(player, this, 65)
    )
      return null;
    if (preview) return this;
    this.disabled = 4;
    return 'HANDLED';
  }
  update(dt, players, enabled) {
    this.active = enabled;
    this.time += dt;
    this.disabled = Math.max(0, this.disabled - dt);
    this.cooldown = this.cooldown.map((value) => Math.max(0, value - dt));
    if (!enabled || this.disabled > 0) return;
    // Visible warning pause each patrol cycle gives both players a safe crossing window.
    if (this.time % 5 < 1.5) return;
    this.x += this.direction * 65 * dt;
    if (this.x < 780 || this.x > 925) {
      this.x = Math.max(780, Math.min(925, this.x));
      this.direction *= -1;
    }
    players.forEach((player) => {
      if (!this.cooldown[player.id] && overlaps(player, this)) {
        this.cooldown[player.id] = 2;
        player.vy = -150;
        player.facilityStun = 0.45;
      }
    });
  }
  draw(ctx) {
    const color = !this.active || this.disabled > 0 ? '#76bda0' : '#edac62';
    ctx.fillStyle = '#141c1d';
    ctx.fillRect(this.x - 4, this.y + 22, 42, 7);
    ctx.fillStyle = '#53605a';
    ctx.fillRect(this.x, this.y, this.w, this.h);
    ctx.strokeStyle = '#92998a';
    ctx.strokeRect(this.x + 3, this.y + 3, this.w - 6, this.h - 6);
    ctx.fillStyle = color;
    ctx.fillRect(this.x + (this.direction < 0 ? 3 : 23), this.y + 8, 8, 5);
    ctx.font = '10px monospace';
    ctx.fillText(this.disabled > 0 ? 'BYPASS' : 'SEC-04', this.x - 3, this.y - 8);
    if (this.active && !this.disabled) {
      ctx.fillStyle = '#e8ab5520';
      ctx.beginPath();
      ctx.moveTo(this.x + 17, this.y + 12);
      ctx.lineTo(this.x + 17 + this.direction * 70, this.y - 10);
      ctx.lineTo(this.x + 17 + this.direction * 70, this.y + 28);
      ctx.closePath();
      ctx.fill();
    }
  }
}
