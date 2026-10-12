import { drawPortalGate } from '../stages/stage01/powerNetworkView.js';
import { stage01LayoutConfig } from '../stages/stage01/stage01LayoutConfig.js';

const clamp = (v) => Math.max(0, Math.min(1, v));
const smooth = (v) => {
  const t = clamp(v);
  return t * t * (3 - 2 * t);
};
export const ENTRY = { first: 0.9, spacing: 0.8, absorption: 0.45, glow: 0.25 };
export const entryArrival = (index, count = 7) => ENTRY.first + (count - 1 - index) * ENTRY.spacing;
export const entryDuration = (count = 7) => entryArrival(0, count) + ENTRY.absorption;
export const journeyCycleDuration = (duration = 56, count = 7) =>
  duration + entryDuration(count) + ENTRY.glow * 2;

// The landscape clock freezes while the queue enters. Reset only follows the
// final completed entry, under a brief restrained glow (no initial-page flash).
export function journeyPortalState(seconds, duration = 56, reduced = false, count = 7) {
  const finish = duration + entryDuration(count),
    reset = finish + ENTRY.glow;
  let phase =
    seconds < duration
      ? 'travel'
      : seconds < finish
        ? 'enter'
        : seconds < reset
          ? 'depart'
          : 'arrive';
  const worldSeconds = phase === 'arrive' ? 0 : Math.min(seconds, duration);
  let veil =
    phase === 'depart'
      ? smooth((seconds - finish) / (ENTRY.glow - 0.05))
      : phase === 'arrive'
        ? 1 - smooth((seconds - reset - 0.05) / (ENTRY.glow - 0.05))
        : 0;
  const activity = phase === 'arrive' ? 0 : smooth((seconds - duration + 3) / 3);
  const exitElapsed =
    phase === 'enter' || phase === 'depart'
      ? Math.min(seconds - duration, entryDuration(count))
      : null;
  if (reduced) {
    phase = 'travel';
    veil = 0;
  }
  return { phase, worldSeconds, veil, activity, exitElapsed: reduced ? null : exitElapsed };
}

export function portalGeometry(layout, activity = 1) {
  const { width: nativeW, height: nativeH } = stage01LayoutConfig.objects.door;
  const h = Math.max(38, layout.spriteHeight * 1.3);
  const scale = h / nativeH,
    w = nativeW * scale;
  const finalLeft = layout.width - w - Math.max(12, layout.width * 0.025);
  const x = finalLeft + (1 - activity) * (w + layout.width * 0.04);
  return { x, y: layout.ground - h, w, h, scale, entryX: x + w / 2 };
}

export function drawEnergyPortal(ctx, { door, time, activity, reduced = false }) {
  if (activity <= 0) return;
  const { width: w, height: h } = stage01LayoutConfig.objects.door;
  ctx.save();
  ctx.translate(door.x, door.y);
  ctx.scale(door.scale, door.scale);
  // Exact Stage 1 mechanical arch, side indicators and native 64:90 proportions.
  drawPortalGate(ctx, {
    door: { x: 0, y: 0, w, h, state: 'OPEN' },
    phase: 'EXIT',
    time: reduced ? 0 : time,
  });
  ctx.strokeStyle = '#bed2c8';
  ctx.lineWidth = 1;
  ctx.strokeRect(1, 11, 7, h - 12);
  ctx.strokeRect(w - 8, 11, 7, h - 12);
  ctx.fillStyle = '#1b303a';
  ctx.fillRect(4, h - 4, w - 8, 4);
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(w / 2, h / 2 + 3, w / 2 - 12, h / 2 - 10, 0, 0, Math.PI * 2);
  ctx.clip();
  const energy = ctx.createLinearGradient(12, 0, w - 12, h);
  energy.addColorStop(0, '#275777');
  energy.addColorStop(0.5, '#3e949f');
  energy.addColorStop(1, '#3f467b');
  ctx.fillStyle = energy;
  ctx.fillRect(10, 8, w - 20, h - 8);
  for (let band = 0; band < 7; band++) {
    const y = ((((band * 16 - (reduced ? 0 : time * 24)) % 112) + 112) % 112) - 12;
    ctx.strokeStyle = band % 2 ? '#9de9df99' : '#9eb3e780';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(10, y);
    ctx.bezierCurveTo(24, y - 12, 39, y + 12, w - 10, y - 3);
    ctx.stroke();
  }
  ctx.restore();
  ctx.strokeStyle = '#b0f1e7';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.ellipse(w / 2, h / 2 + 3, w / 2 - 12, h / 2 - 10, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

export function drawPortalEntryGlow(ctx, door, elapsed, count = 7) {
  if (elapsed === null) return;
  let intensity = 0;
  for (let i = 0; i < count; i++) {
    const t = (elapsed - entryArrival(i, count)) / ENTRY.absorption;
    if (t >= 0 && t < 1) intensity = Math.sin(t * Math.PI) * 0.45;
  }
  if (!intensity) return;
  ctx.save();
  ctx.globalAlpha = intensity;
  ctx.fillStyle = '#b2f7e7';
  ctx.beginPath();
  ctx.ellipse(door.entryX, door.y + door.h * 0.54, door.w * 0.25, door.h * 0.39, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawPortalVeil(ctx, width, height, opacity) {
  if (opacity <= 0) return;
  ctx.save();
  ctx.globalAlpha = opacity;
  const glow = ctx.createLinearGradient(0, height, width, 0);
  glow.addColorStop(0, '#8193bf');
  glow.addColorStop(0.55, '#91b6cf');
  glow.addColorStop(1, '#b5c7d6');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}
