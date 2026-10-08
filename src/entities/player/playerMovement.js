import { overlaps } from '../../core/physics/collision.js';
import { moveBody } from '../../core/physics/movement.js';
import { PLAYER_HEIGHT, PLAYER_CROUCH_HEIGHT } from './playerConfig.js';

export function updatePlayerMovement(player, input, dt, solids, worldWidth) {
  const height = input.crouch ? PLAYER_CROUCH_HEIGHT : PLAYER_HEIGHT;
  const next = { ...player, y: player.y + player.h - height, h: height };
  if (height < player.h || !solids.some((s) => overlaps(next, s))) {
    player.y = next.y;
    player.h = height;
  }
  player.crouched = player.h === PLAYER_CROUCH_HEIGHT;
  player.vx = input.move * (player.crouched ? 125 : 240);
  if (input.jump && player.grounded && !player.crouched) player.vy = -player.abilities.jumpSpeed;
  player.vy = Math.min(1000, player.vy + 1600 * dt);
  moveBody(player, dt, solids);
  player.x = Math.max(0, Math.min(worldWidth - player.w, player.x));
}
