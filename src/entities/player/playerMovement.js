import { overlaps } from '../../core/physics/collision.js';
import { moveBody } from '../../core/physics/movement.js';
import { PLAYER_HEIGHT, PLAYER_CROUCH_HEIGHT } from './playerConfig.js';
import { gameplayAudio } from '../../core/audio.js';

const SWING_STEER_DELAY = 0.18;
const MAX_AIR_SPEED = 390;

export function jumpPlayer(player, verticalMomentum = 0) {
  player.vy = -player.abilities.jumpSpeed + verticalMomentum;
  if (Math.abs(player.swingMomentum ?? 0) > 1) player.swingControlTime = SWING_STEER_DELAY;
  gameplayAudio.play('jump');
}

export function updatePlayerMovement(player, input, dt, solids, worldWidth) {
  const height = input.crouch ? PLAYER_CROUCH_HEIGHT : PLAYER_HEIGHT;
  const next = { ...player, y: player.y + player.h - height, h: height };
  if (height < player.h || !solids.some((s) => overlaps(next, s))) {
    player.y = next.y;
    player.h = height;
  }
  player.crouched = player.h === PLAYER_CROUCH_HEIGHT;
  const steer = 1 - (player.swingControlTime ?? 0) / SWING_STEER_DELAY;
  const speed = input.move * (player.crouched ? 125 : 240) * steer;
  const momentum = player.swingMomentum ?? 0;
  player.vx = momentum
    ? Math.max(-MAX_AIR_SPEED, Math.min(MAX_AIR_SPEED, speed + momentum))
    : speed;
  if (input.jump && player.grounded && !player.crouched) jumpPlayer(player);
  player.vy = Math.min(1000, player.vy + 1600 * dt);
  moveBody(player, dt, solids);
  if (player.swingMomentum) {
    player.swingMomentum = player.grounded ? 0 : player.swingMomentum * Math.exp(-dt * 1.1);
    player.swingControlTime = player.grounded ? 0 : Math.max(0, player.swingControlTime - dt);
  }
  player.x = Math.max(0, Math.min(worldWidth - player.w, player.x));
}
