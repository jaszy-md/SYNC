function drawPointedBubble(ctx, x, y, width, height, speakerX, above) {
  const right = x + width;
  const bottom = y + height;
  const radius = 6;
  const base = Math.max(x + radius + 7, Math.min(right - radius - 7, speakerX));
  ctx.save();
  if (!above) {
    ctx.translate(0, y + bottom);
    ctx.scale(1, -1);
  }
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(right - radius, y);
  ctx.quadraticCurveTo(right, y, right, y + radius);
  ctx.lineTo(right, bottom - radius);
  ctx.quadraticCurveTo(right, bottom, right - radius, bottom);
  ctx.lineTo(base + 6, bottom);
  ctx.lineTo(speakerX, bottom + 9);
  ctx.lineTo(base - 6, bottom);
  ctx.lineTo(x + radius, bottom);
  ctx.quadraticCurveTo(x, bottom, x, bottom - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

export function drawSpeechBubble(ctx, player, text, opacity, world, { pointer = false } = {}) {
  ctx.save();
  ctx.shadowBlur = 0;
  ctx.globalAlpha = opacity;
  ctx.font = '12px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const lines = text.split(' ').reduce((result, word) => {
    const last = result.length - 1;
    if (last < 0 || result[last].length + word.length + 1 > 22) result.push(word);
    else result[last] += ' ' + word;
    return result;
  }, []);
  const width = 170;
  const height = lines.length * 16 + 6;
  const speakerX = player.x + player.w / 2;
  const x = Math.max(4, Math.min(world.width - width - 4, speakerX - width / 2));
  const above = !pointer || player.y >= height + 18;
  const preferredY = above ? player.y - height - 14 : player.y + player.h + 14;
  const y = Math.max(4, Math.min(world.height - height - 10, preferredY));
  ctx.fillStyle = '#0c202bee';
  ctx.strokeStyle = '#8cbdbb';
  if (pointer) {
    drawPointedBubble(ctx, x, y, width, height, speakerX, above);
  } else {
    ctx.fillRect(x, y, width, height);
    ctx.strokeRect(x, y, width, height);
    const tailX = Math.max(x + 8, Math.min(x + width - 12, speakerX));
    ctx.fillStyle = '#8cbdbb';
    ctx.fillRect(tailX, y + height, 6, 3);
    ctx.fillRect(tailX, y + height + 3, 3, 3);
  }
  ctx.fillStyle = '#e4f8ef';
  lines.forEach((line, index) =>
    ctx.fillText(line, x + width / 2, y + 11 + index * 16, width - 12),
  );
  ctx.restore();
}
