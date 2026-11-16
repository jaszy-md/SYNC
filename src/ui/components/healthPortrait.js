import { getCharacterImage } from '../../entities/player/characterAssets.js';

// Crop the original front-facing sprite; the asset cache is shared with the players.
export function drawHealthPortrait(ctx, character, x, y) {
  ctx.save();
  ctx.fillStyle = '#162d40';
  ctx.fillRect(x, y, 24, 24);
  ctx.strokeStyle = '#79aeb9';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, 23, 23);
  const image = getCharacterImage(character?.sprites.idle);
  if (image) {
    const crop = Math.min(image.naturalWidth, image.naturalHeight * 0.3);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(
      image,
      (image.naturalWidth - crop) / 2,
      image.naturalHeight * 0.01,
      crop,
      crop,
      x + 2,
      y + 2,
      20,
      20,
    );
  }
  ctx.restore();
}

export function drawHealth(ctx, stage) {
  ctx.save();
  stage.health.forEach((health, index) => {
    const x = 18 + index * 170;
    ctx.fillStyle = '#0b1725e6';
    ctx.fillRect(x, 14, 154, 30);
    drawHealthPortrait(ctx, stage.players[index]?.character, x + 5, 17);
    for (let pip = 0; pip < health.max; pip++) {
      ctx.fillStyle =
        pip < health.value ? (health.invulnerable > 0 ? '#ffbe79' : '#a9dfd5') : '#33434e';
      ctx.fillRect(x + 36 + pip * 27, 22, 22, 14);
    }
  });
  ctx.restore();
}
