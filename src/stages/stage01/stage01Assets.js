const images = new Map();

// Public assets load lazily; a missing image leaves the Canvas fallback available.
export function stage01Image(name) {
  if (typeof Image === 'undefined') return null;
  if (!images.has(name)) {
    const image = new Image();
    image.src = `/assets/images/stage01/${name}.png`;
    images.set(name, image);
  }
  const image = images.get(name);
  return image.complete && image.naturalWidth > 0 ? image : null;
}

export function drawStage01Image(ctx, image, rect, flip = false) {
  const scale = Math.min(rect.w / image.naturalWidth, rect.h / image.naturalHeight);
  const width = image.naturalWidth * scale;
  const height = image.naturalHeight * scale;
  ctx.save();
  ctx.translate(rect.x + rect.w / 2, rect.y + rect.h / 2);
  ctx.scale(flip ? -1 : 1, 1);
  ctx.drawImage(image, -width / 2, -height / 2, width, height);
  ctx.restore();
}
