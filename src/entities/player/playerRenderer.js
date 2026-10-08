import { getCharacterImage } from './characterAssets.js';
import {
  PLAYER_HEIGHT,
  PLAYER_SPRITE_SCALE,
  PLAYER_SPRITE_REFERENCE_HEIGHT,
} from './playerConfig.js';

export const WALK_FRAME_INTERVAL_MS = 200;

export function drawPlayer(player, ctx) {
  const { x, y, w, h } = player;
  const pose =
    player.interactPoseMs > 0
      ? 'back'
      : !player.grounded
        ? 'jump'
        : player.crouched
          ? 'crouch'
          : Math.abs(player.vx) > 0.1
            ? player.walkElapsedMs < WALK_FRAME_INTERVAL_MS
              ? 'walkLeft'
              : 'walkRight'
            : 'idle';
  const image = getCharacterImage(player.character.sprites[pose]);
  // All characters and poses share one source-pixel scale, preserving natural proportions.
  const spriteScale = (PLAYER_HEIGHT * PLAYER_SPRITE_SCALE) / PLAYER_SPRITE_REFERENCE_HEIGHT;
  const drawHeight = image
    ? image.naturalHeight * spriteScale
    : PLAYER_HEIGHT * PLAYER_SPRITE_SCALE;
  const drawY = y + h - drawHeight;
  if (image) {
    const drawWidth = image.naturalWidth * spriteScale;
    const drawX = x + (w - drawWidth) / 2;
    ctx.save();
    // Source sprites face left; mirror only when facing right.
    if (player.facing > 0) {
      ctx.translate(drawX + drawWidth, drawY);
      ctx.scale(-1, 1);
      ctx.drawImage(image, 0, 0, drawWidth, drawHeight);
    } else ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);
    ctx.restore();
  } else {
    ctx.save();
    ctx.translate(x + w / 2, y + h);
    ctx.scale(PLAYER_SPRITE_SCALE, PLAYER_SPRITE_SCALE);
    ctx.translate(-x - w / 2, -y - h);
    drawFallbackPlayer(player, ctx);
    ctx.restore();
  }
}

function drawFallbackPlayer(player, ctx) {
  const {
    x,
    y,
    w,
    h,
    character: { fallback: c },
  } = player;
  ctx.fillStyle = c.color;
  ctx.fillRect(x + 4, y + 14, w - 8, h - 14);
  ctx.beginPath();
  if (c.shape === 'circle') ctx.arc(x + w / 2, y + 9, 10, 0, Math.PI * 2);
  else if (c.shape === 'square') ctx.rect(x + 4, y, w - 8, 18);
  else {
    ctx.moveTo(x + w / 2, y - 2);
    ctx.lineTo(x + w, y + 16);
    if (c.shape === 'diamond') ctx.lineTo(x + w / 2, y + 22);
    ctx.lineTo(x, y + 16);
    ctx.closePath();
  }
  ctx.fill();
  ctx.fillStyle = '#101829';
  ctx.fillRect(x + 9, y + 7, 3, 3);
  ctx.fillRect(x + 17, y + 7, 3, 3);
}
