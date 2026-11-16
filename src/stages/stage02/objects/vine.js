import { overlaps } from '../../../core/physics/collision.js';
import { PLAYER_HEIGHT } from '../../../entities/player/playerConfig.js';

export const MAX_SWING_ANGLE = 0.76;
export const MAX_SWING_SPEED = 2.25;
export const MAX_LAUNCH_X = 280;
export const MAX_LAUNCH_Y = 90;
export const HINT_REACH = 82;
const GRAVITY = 1050;
const clamp = (value, limit) => Math.max(-limit, Math.min(limit, value));

function drive(angle, velocity, input) {
  const nearRest = Math.abs(angle) < 0.055 && Math.abs(velocity) < 0.14;
  const withSwing = input * velocity > 0;
  const push = Math.max(
    withSwing ? Math.min(1, Math.abs(velocity) / 0.38) : 0,
    nearRest ? 0.42 : 0,
  );
  return input * 3.5 * push * Math.max(0, 1 - (angle / 0.5) ** 4);
}

export class Vine {
  constructor({ x, y, length, reach = 24, active = true }) {
    Object.assign(this, { x, y, length, reach, active });
    this.angle = 0;
    this.angularVelocity = 0;
    this.time = 0;
    this.grip = { x, y: y + length, w: 0, h: 0 };
    this.occupant = null;
  }

  tipAt(angle) {
    return { x: this.x + Math.sin(angle) * this.length, y: this.y + Math.cos(angle) * this.length };
  }

  hangingBounds(player, grip = this.grip) {
    return {
      x: grip.x + player.facing * 8 - player.w / 2,
      y: grip.y - 12,
      w: player.w,
      h: PLAYER_HEIGHT,
    };
  }

  gripOffset(player) {
    return {
      x: player.x + player.w / 2 - player.facing * 8 - this.grip.x,
      y: player.y + 12 - this.grip.y,
    };
  }

  distanceToGrip(player) {
    const { x, y } = this.gripOffset(player);
    return Math.hypot(x, y);
  }

  canGrab(player, solids, previousOffset) {
    if (!this.active || this.occupant || player.hanging) return false;
    const { x, y } = this.gripOffset(player);
    const distance = Math.hypot(x, y);
    if (distance > this.reach) {
      // Accept a grazing crossing within the fixed step, with at most 5 px of extra snap.
      if (!previousOffset || distance > this.reach + 5) return false;
      const dx = x - previousOffset.x;
      const dy = y - previousOffset.y;
      const lengthSquared = dx * dx + dy * dy;
      if (!lengthSquared) return false;
      const t = Math.max(
        0,
        Math.min(1, -(previousOffset.x * dx + previousOffset.y * dy) / lengthSquared),
      );
      if (Math.hypot(previousOffset.x + t * dx, previousOffset.y + t * dy) > this.reach)
        return false;
    }
    const target = this.hangingBounds(player);
    const left = Math.min(player.x, target.x);
    const top = Math.min(player.y, target.y);
    const path = {
      x: left,
      y: top,
      w: Math.max(player.x + player.w, target.x + target.w) - left,
      h: Math.max(player.y + player.h, target.y + target.h) - top,
    };
    return !solids.some((solid) => overlaps(path, solid));
  }

  grab(player, solids, previousOffset) {
    if (!this.canGrab(player, solids, previousOffset)) return false;
    const approachSpeed = player.vx * Math.cos(this.angle) - player.vy * Math.sin(this.angle);
    this.angularVelocity = clamp(
      this.angularVelocity + (approachSpeed * 0.6) / this.length,
      MAX_SWING_SPEED,
    );
    this.occupant = player;
    Object.assign(player, this.hangingBounds(player), {
      hanging: this,
      vx: 0,
      vy: 0,
      swingMomentum: 0,
      swingControlTime: 0,
      grounded: false,
      crouched: false,
      crouchBlendMs: 0,
      walkElapsedMs: 0,
      interactPoseMs: 0,
    });
    return true;
  }

  update(dt, move, solids, wind = true) {
    this.time += dt;
    const occupied = this.occupant !== null;
    const target = wind ? Math.sin(this.time * 0.95) * 0.085 : 0;
    const outward = Math.sign(this.angle) * this.angularVelocity > 0;
    const brake = outward
      ? Math.sign(this.angle) * Math.max(0, Math.abs(this.angle) - 0.43) * 35
      : 0;
    const acceleration = occupied
      ? -(GRAVITY / this.length) * Math.sin(this.angle) +
        drive(this.angle, this.angularVelocity, move) -
        brake
      : (target - this.angle) * 10;
    const damping = occupied ? 0.65 : 4.8;
    this.angularVelocity = clamp(
      (this.angularVelocity + acceleration * dt) * Math.exp(-damping * dt),
      MAX_SWING_SPEED,
    );
    const next = clamp(this.angle + this.angularVelocity * dt, MAX_SWING_ANGLE);
    const tip = this.tipAt(next);
    if (
      occupied &&
      solids.some((solid) => overlaps(this.hangingBounds(this.occupant, tip), solid))
    ) {
      this.angularVelocity *= -0.2;
      return;
    }
    if (Math.abs(next) === MAX_SWING_ANGLE && Math.sign(this.angularVelocity) === Math.sign(next))
      this.angularVelocity *= -0.28;
    this.angle = next;
    Object.assign(this.grip, tip);
    if (occupied) Object.assign(this.occupant, this.hangingBounds(this.occupant));
  }

  release(player, jumping) {
    if (this.occupant !== player) return 0;
    const tangential = this.length * this.angularVelocity;
    if (jumping) {
      player.swingMomentum = clamp(Math.cos(this.angle) * tangential * 0.85, MAX_LAUNCH_X);
    }
    this.occupant = null;
    player.hanging = null;
    return jumping ? clamp(-Math.sin(this.angle) * tangential * 0.55, MAX_LAUNCH_Y) : 0;
  }
}
