import { near } from '../../../core/physics/collision.js';

const MATERIALIZE_DURATION = 0.5;

// An optional collectible: never a blocker for the existing puzzle chain.
export class HintDevice {
  constructor({ x, y, width, height }) {
    Object.assign(this, { x, y, w: width, h: height });
    this.appearedAt = null;
  }
  reveal(time) {
    if (this.appearedAt === null) this.appearedAt = time;
  }
  canActivate(player, progress) {
    return this.appearedAt !== null && !progress.hintUnlocked && near(player, this, 16);
  }
  activate(player, progress) {
    if (!this.canActivate(player, progress)) return false;
    progress.hintUnlocked = true;
    return true;
  }
  draw(ctx, progress, time) {
    if (this.appearedAt === null || progress.hintUnlocked) return;
    const reduced = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const fade = reduced
      ? 1
      : Math.min(1, Math.max(0, (time - this.appearedAt) / MATERIALIZE_DURATION));
    const float = reduced ? 0 : Math.sin(time * 2.5) * 2;
    ctx.save();
    ctx.translate(this.x, this.y + float);
    ctx.globalAlpha *= fade;
    ctx.shadowColor = '#8edee0';
    ctx.shadowBlur = 8 + (1 - fade) * 14;
    ctx.fillStyle = '#182b34';
    ctx.fillRect(2, 2, this.w - 4, this.h - 4);
    ctx.strokeStyle = '#a2c8c5';
    ctx.lineWidth = 1;
    ctx.strokeRect(2, 2, this.w - 4, this.h - 4);
    ctx.fillStyle = '#a8ded1';
    ctx.fillRect(6, 6, 8, 7);
    ctx.fillStyle = '#283d43';
    ctx.fillRect(8, 8, 4, 3);
    ctx.fillStyle = '#a8ded1';
    ctx.fillRect(6, 17, 2, 2);
    ctx.fillRect(12, 17, 2, 2);
    if (fade < 1) {
      ctx.globalAlpha *= 1 - fade;
      ctx.fillStyle = '#d9ffff';
      ctx.fillRect(-4, this.h / 2 - 2, this.w + 8, 4);
      ctx.strokeRect(-3, -3, this.w + 6, this.h + 6);
    }
    ctx.restore();
  }
}
