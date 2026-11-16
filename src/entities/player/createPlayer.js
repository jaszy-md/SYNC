import { updatePlayerMovement } from './playerMovement.js';
import { drawPlayer, walkPose, WALK_FRAME_INTERVAL_MS } from './playerRenderer.js';
import { CROUCH_TRANSITION_MS, PLAYER_WIDTH, PLAYER_HEIGHT } from './playerConfig.js';
export const INTERACT_POSE_DURATION_MS = 250;

export class Player {
  constructor(id, character, spawn, abilities) {
    Object.assign(this, {
      id,
      character,
      abilities,
      x: spawn.x,
      y: spawn.y,
      w: PLAYER_WIDTH,
      h: PLAYER_HEIGHT,
      vx: 0,
      vy: 0,
      grounded: false,
      crouched: false,
      crouchBlendMs: 0,
      facing: 1,
      walkElapsedMs: 0,
      interactPoseMs: 0,
      shootPoseMs: 0,
    });
  }
  update(input, dt, solids, worldWidth = Infinity) {
    const startsMovingCrouch = !this.crouched && this.grounded && (this.vx || input.move);
    updatePlayerMovement(this, input, dt, solids, worldWidth);
    if (this.crouched && this.grounded && startsMovingCrouch) {
      this.crouchFromPose = walkPose(this.walkElapsedMs);
      this.crouchBlendMs = CROUCH_TRANSITION_MS;
    } else this.crouchBlendMs = this.crouched ? Math.max(0, this.crouchBlendMs - dt * 1000) : 0;
    if (input.move) this.facing = input.move < 0 ? -1 : 1;
    this.interactPoseMs = Math.max(0, this.interactPoseMs - dt * 1000);
    this.shootPoseMs = Math.max(0, this.shootPoseMs - dt * 1000);
    if (input.interact || input.interactHeld) this.interactPoseMs = INTERACT_POSE_DURATION_MS;
    this.walkElapsedMs =
      this.grounded && !this.crouched && Math.abs(this.vx) > 0.1 && !this.interactPoseMs
        ? (this.walkElapsedMs + dt * 1000) % (WALK_FRAME_INTERVAL_MS * 2)
        : 0;
  }
  draw(ctx) {
    drawPlayer(this, ctx);
  }
}
