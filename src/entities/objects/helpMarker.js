import { Trigger } from './trigger.js';

export class HelpMarker extends Trigger {
  constructor({ id, x, y, text }) {
    super(x, y, 24, 32);
    Object.assign(this, { id, text, ready: false });
  }
  draw(ctx, time) {
    const lift = Math.sin(time * 4) * 4;
    ctx.save();
    ctx.translate(this.x + 12, this.y + 12 + lift);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = '#ffdc79';
    ctx.shadowBlur = 18;
    ctx.shadowColor = '#ffdc79';
    ctx.fillRect(-12, -12, 24, 24);
    ctx.restore();
    ctx.fillStyle = '#17203b';
    ctx.font = 'bold 20px system-ui';
    ctx.fillText('?', this.x + 6, this.y + 19 + lift);
    ctx.fillStyle = '#ffdc79';
    ctx.font = '11px system-ui';
    ctx.fillText('HINT', this.x - 2, this.y - 12 + lift);
  }
}
