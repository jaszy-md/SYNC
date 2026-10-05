import { stage01Config } from './stage01Config.js';

// Presentation-only entry portal. Replace this renderer with portal assets later.
export class PortalOpening {
  constructor() {
    this.elapsed = 0;
    this.duration = stage01Config.opening.duration;
  }
  get active() {
    return this.elapsed < this.duration;
  }
  update(dt) {
    this.elapsed = Math.min(this.duration, this.elapsed + dt);
  }
  get playerOpacity() {
    return Math.max(0, Math.min(1, (this.elapsed - 0.55) / 0.45));
  }
  draw(ctx, players) {
    if (!this.active) return;
    const reduced = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const t = this.elapsed / this.duration;
    ctx.save();
    ctx.fillStyle = '#030b17';
    ctx.globalAlpha = Math.max(0, 1 - this.elapsed / 0.5);
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    if (this.elapsed > 0.2) {
      const opacity = Math.min(1, (this.elapsed - 0.2) / 0.25) * Math.min(1, (1 - t) * 4);
      players.forEach((player) => {
        const x = stage01Config.spawn.x + player.id * stage01Config.spawn.spacing + player.w / 2,
          y = stage01Config.spawn.y + player.h / 2;
        ctx.globalAlpha = opacity;
        ctx.strokeStyle = '#91efff';
        ctx.lineWidth = 3;
        ctx.shadowColor = '#38cfff';
        ctx.shadowBlur = 18;
        ctx.beginPath();
        ctx.ellipse(x, y, 21, 38, 0, 0, Math.PI * 2);
        ctx.stroke();
        if (!reduced) {
          for (let i = 0; i < 12; i++) {
            const angle = (i * Math.PI) / 6 + this.elapsed * 2;
            ctx.fillStyle = '#c2f7ff';
            ctx.fillRect(x + Math.cos(angle) * (24 + t * 12), y + Math.sin(angle) * 42, 2, 2);
          }
        }
      });
      if (!reduced) {
        ctx.globalAlpha = Math.max(0, 1 - Math.abs(this.elapsed - 0.6) / 0.14) * 0.35;
        ctx.fillStyle = '#c9f5ff';
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      }
    }
    ctx.restore();
  }
}
