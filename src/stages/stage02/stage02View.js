import { CROSSING, LAND, WORLD } from './stage02Layout.js';

function drawRavine(ctx) {
  const { left, right } = CROSSING;
  const top = LAND.farBank.y;
  const depth = ctx.createLinearGradient(0, top, 0, WORLD.height);
  depth.addColorStop(0, '#173b3700');
  depth.addColorStop(0.28, '#112f34da');
  depth.addColorStop(0.62, '#0c2529');
  depth.addColorStop(1, '#09191d');
  ctx.fillStyle = depth;
  ctx.fillRect(left, top, right - left, WORLD.height - top);

  ctx.fillStyle = '#1e3635';
  for (const [x, direction] of [
    [left, 1],
    [right, -1],
  ]) {
    ctx.beginPath();
    ctx.moveTo(x, top);
    ctx.lineTo(x + direction * 10, top + 30);
    ctx.lineTo(x + direction * 8, top + 62);
    ctx.lineTo(x + direction * 22, top + 114);
    ctx.lineTo(x + direction * 34, WORLD.height);
    ctx.lineTo(x, WORLD.height);
    ctx.fill();
  }
  ctx.fillStyle = '#668c801c';
  ctx.fillRect(left + 18, 610, right - left - 39, 9);
  ctx.fillRect(left + 27, 635, right - left - 44, 12);
}

function drawStone(ctx, { x, y, w, h }) {
  ctx.fillStyle = '#333e37';
  ctx.fillRect(x, y, w, h);
  for (let row = 8; row < h - 3; row += 17) {
    for (let col = (row * 5) % 15; col < w - 4;) {
      const stoneWidth = 19 + ((row * 3 + col * 7 + x) % 25);
      const inset = (row + col) % 4;
      const width = Math.min(stoneWidth, w - col - 2);
      const height = Math.min(14 - inset, h - row - inset);
      ctx.fillStyle = (row + col) % 3 === 0 ? '#465244' : '#293831';
      ctx.fillRect(x + col, y + row + inset, width, height);
      ctx.fillStyle = '#54624a';
      ctx.fillRect(x + col + 2, y + row + inset, Math.max(0, width - 7), 1);
      col += stoneWidth + 3;
    }
  }
  drawMoss(ctx, x, y, w);
}

function drawMoss(ctx, x, y, w) {
  ctx.fillStyle = '#546738';
  ctx.fillRect(x, y, w, 5);
  ctx.fillStyle = '#97a957';
  ctx.fillRect(x, y, w, 2);
  ctx.fillStyle = '#6f8744';
  for (let dx = 7; dx < w - 5; dx += 21) {
    ctx.fillRect(x + dx, y + 4, 7, 3 + (dx % 4));
  }
}

function drawLog(ctx, surface) {
  const { x, y, w, h } = surface;
  drawStone(ctx, surface);
  ctx.fillStyle = '#503e2d';
  ctx.fillRect(x, y, w, Math.min(h, 31));
  ctx.fillStyle = '#785738';
  for (let i = 0; i < 3; i++) ctx.fillRect(x + 5 + i * 7, y + 10 + i * 7, w - 16 - i * 10, 2);
  ctx.fillStyle = '#8e6941';
  ctx.fillRect(x + w - 7, y + 6, 7, 20);
  drawMoss(ctx, x, y, w);
}

function drawVine(ctx, { x, y, length }, time) {
  const bend = Math.sin(time * 0.95 + x * 0.03) * 7;
  ctx.strokeStyle = '#355432';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x - 9, y + length * 0.56, x + bend, y + length);
  ctx.stroke();
  for (let i = 1; i < 6; i++) {
    const t = i / 6;
    const leafX = x - 18 * (1 - t) * t + bend * t * t;
    ctx.fillStyle = i % 2 ? '#557743' : '#72964b';
    ctx.fillRect(Math.round(leafX + (i % 2 ? -8 : 0)), Math.round(y + length * t), 8, 3);
  }
}

function drawFern(ctx, x, y, time) {
  const sway = Math.sin(time * 1.3 + x) * 2;
  for (const direction of [-1, 1]) {
    for (let i = 0; i < 6; i++) {
      const reach = i * 3 * direction + sway * (i / 5);
      ctx.fillStyle = i % 2 ? '#526f3b' : '#83a450';
      ctx.fillRect(Math.round(x + reach), y - i * 4 - 3, 7 - Math.floor(i / 2), 3);
    }
  }
}

function drawBrokenBridge(ctx, time) {
  for (const [x, y, direction] of [
    [CROSSING.left - 3, LAND.nearBank.y, 1],
    [CROSSING.right + 4, LAND.farBank.y, -1],
  ]) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(direction, 1);
    ctx.fillStyle = '#443123';
    ctx.fillRect(-9, -26, 7, 33);
    ctx.fillStyle = '#a18152';
    ctx.fillRect(-10, -19, 9, 4);
    ctx.strokeStyle = '#a18152';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-4, -16);
    ctx.lineTo(15, 7);
    ctx.lineTo(28, 36);
    ctx.quadraticCurveTo(30, 52, 32 + Math.sin(time * 1.15 + direction) * 4, 61);
    ctx.stroke();
    ctx.translate(3, -1);
    ctx.rotate(0.62);
    for (let plank = 0; plank < 3; plank++) {
      const offset = plank * 12;
      ctx.fillStyle = '#745337';
      ctx.fillRect(offset, plank * 2, 10, 12);
      ctx.fillStyle = '#bc925c';
      ctx.fillRect(offset, plank * 2, 10, 2);
    }
    ctx.restore();
  }
}

export function drawJungleTerrain(ctx, time) {
  ctx.save();
  drawVine(ctx, { x: 377, y: 255, length: 144 }, time);
  drawVine(ctx, CROSSING.vine, time);
  drawRavine(ctx);
  Object.values(LAND).forEach((surface) => {
    if (surface === LAND.low) drawLog(ctx, surface);
    else drawStone(ctx, surface);
  });
  for (const [x, y] of [
    [86, LAND.entrance.y],
    [279, LAND.entrance.y],
    [392, LAND.low.y],
    [484, LAND.high.y],
    [675, LAND.lower.y],
    [716, LAND.nearBank.y],
    [1137, LAND.farBank.y],
  ])
    drawFern(ctx, x, y, time);

  // Left-side supports reserve space for a future winch and upper attachment.
  const { x, y } = CROSSING.mechanism;
  ctx.fillStyle = '#593f2c';
  ctx.fillRect(x - 15, y - 6, 30, 6);
  ctx.fillRect(x - 12, y - 24, 5, 20);
  ctx.fillRect(x + 8, y - 24, 5, 20);
  ctx.fillStyle = '#a38152';
  ctx.fillRect(x - 9, y - 20, 19, 8);
  ctx.fillStyle = '#735b3f';
  ctx.fillRect(CROSSING.vine.x - 4, LAND.perch.y - 12, 8, 12);
  const signX = LAND.nearBank.x + 11;
  ctx.fillStyle = '#54402c';
  ctx.fillRect(signX + 7, y - 23, 4, 23);
  ctx.fillRect(signX, y - 30, 101, 16);
  ctx.fillStyle = '#e5cd91';
  ctx.font = 'bold 10px monospace';
  ctx.fillText('ANCIENT CROSSING', signX + 3, y - 19);
  drawBrokenBridge(ctx, time);
  ctx.restore();
}
