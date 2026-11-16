import { getCharacterImage } from './characterAssets.js';
import { shouldMirrorSprite } from './spriteOrientation.js';
import {
  CROUCH_TRANSITION_MS,
  PLAYER_HEIGHT,
  PLAYER_CROUCH_HEIGHT,
  PLAYER_SPRITE_SCALE,
  PLAYER_SPRITE_REFERENCE_HEIGHT,
} from './playerConfig.js';

export const WALK_FRAME_INTERVAL_MS = 200;
export const walkPose = (elapsed) => (elapsed < WALK_FRAME_INTERVAL_MS ? 'walkLeft' : 'walkRight');

// Rear hand in each source jump frame, normalized to the image dimensions.
const GRIP_IN_JUMP_POSE = {
  enes: [0.07, 0.39],
  jaszy: [0.08, 0.37],
  koen: [0.08, 0.38],
  lucas: [0.08, 0.38],
  maikel: [0.09, 0.31],
  max: [0.09, 0.41],
  tim: [0.08, 0.33],
};

export function getPlayerSpriteBounds(player, pose = 'walkLeft') {
  const image = getCharacterImage(player.character.sprites[pose]);
  const scale = (PLAYER_HEIGHT * PLAYER_SPRITE_SCALE) / PLAYER_SPRITE_REFERENCE_HEIGHT;
  const w = image ? image.naturalWidth * scale : player.w * PLAYER_SPRITE_SCALE;
  const h = image
    ? image.naturalHeight * scale
    : (pose === 'crouch' ? PLAYER_CROUCH_HEIGHT : PLAYER_HEIGHT) * PLAYER_SPRITE_SCALE;
  return { x: player.x + (player.w - w) / 2, y: player.y + player.h - h, w, h };
}

export function drawPlayer(player, ctx) {
  if (player.hanging) {
    drawHangingPlayer(player, ctx);
    return;
  }
  const pose =
    player.shootPoseMs > 0
      ? player.crouched
        ? 'crouch'
        : 'walkLeft'
      : player.interactPoseMs > 0
        ? 'back'
        : !player.grounded
          ? 'jump'
          : player.crouched
            ? 'crouch'
            : Math.abs(player.vx) > 0.1
              ? walkPose(player.walkElapsedMs)
              : 'idle';
  if (
    pose === 'crouch' &&
    !player.shootPoseMs &&
    player.crouchBlendMs > 0 &&
    !globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  ) {
    const blend = player.crouchBlendMs / CROUCH_TRANSITION_MS;
    ctx.save();
    ctx.globalAlpha *= blend * 0.65;
    drawPose(player, ctx, player.crouchFromPose);
    ctx.restore();
    ctx.save();
    ctx.globalAlpha *= 1 - blend * 0.65;
    drawPose(player, ctx, pose);
    ctx.restore();
    return;
  }
  drawPose(player, ctx, pose);
}

function drawHangingPlayer(player, ctx) {
  const image = getCharacterImage(player.character.sprites.jump);
  if (!image) {
    drawPose(player, ctx, 'jump');
    return;
  }
  const { w, h } = getPlayerSpriteBounds(player, 'jump');
  const [handX, handY] = GRIP_IN_JUMP_POSE[player.character.id] ?? [0.08, 0.37];
  const { grip, angle } = player.hanging;
  ctx.save();
  ctx.translate(grip.x, grip.y);
  ctx.rotate(player.facing * 0.35 - angle * 0.36);
  ctx.scale(player.facing, 1);
  ctx.drawImage(image, -w * handX, -h * handY, w, h);
  ctx.restore();
}

function drawPose(player, ctx, pose) {
  const { x, y, w, h } = player;
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
    if (shouldMirrorSprite(pose, player.facing)) {
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
