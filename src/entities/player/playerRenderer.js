import { getCharacterImage } from './characterAssets.js';

export function drawPlayer(player, ctx) {
  const { x, y, w, h } = player;
  const pose = !player.grounded
    ? 'jump'
    : player.crouched
      ? 'crouch'
      : Math.abs(player.vx) > 0.1
        ? 'walk'
        : 'idle';
  const image = getCharacterImage(player.character.sprites[pose]);
  if (image) ctx.drawImage(image, x, y, w, h);
  else drawFallbackPlayer(player, ctx);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 14px system-ui';
  ctx.textAlign = 'center';
  ctx.fillText(`P${player.id + 1}`, x + w / 2, y - 12);
  ctx.textAlign = 'left';
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
