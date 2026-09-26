import { updatePlayerMovement } from './playerMovement.js';
import { drawPlayer } from './playerRenderer.js';
export class Player {
  constructor(id, character, spawn, abilities) {
    Object.assign(this, {
      id,
      character,
      abilities,
      x: spawn.x,
      y: spawn.y,
      w: 28,
      h: 46,
      vx: 0,
      vy: 0,
      grounded: false,
      crouched: false,
    });
  }
  update(input, dt, solids, worldWidth = Infinity) {
    updatePlayerMovement(this, input, dt, solids, worldWidth);
  }
  draw(ctx) {
    drawPlayer(this, ctx);
  }
}
