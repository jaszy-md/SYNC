import { updatePlayerMovement } from './playerMovement.js';
import { drawPlayer, WALK_FRAME_INTERVAL_MS } from './playerRenderer.js';
import { PLAYER_WIDTH, PLAYER_HEIGHT } from './playerConfig.js';
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
      facing: 1,
      walkElapsedMs: 0,
      interactPoseMs: 0,
      shootPoseMs: 0,
    });
  }
  update(input, dt, solids, worldWidth = Infinity) {
    updatePlayerMovement(this, input, dt, solids, worldWidth);
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
