import { CROSSING, LAND, QUICKSAND, WORLD } from './stage02Layout.js';

export function drawQuicksand(ctx, time, sinking, elapsed) {
  const { x, y, w } = QUICKSAND;
  const depth = ctx.createLinearGradient(0, y, 0, WORLD.height);
  depth.addColorStop(0, '#88713d');
  depth.addColorStop(0.18, '#65542f');
  depth.addColorStop(1, '#302e24');
  ctx.fillStyle = depth;
  ctx.fillRect(x, y, w, WORLD.height - y);
  ctx.fillStyle = '#aa8b51';
  ctx.fillRect(x, y, w, 2);

  for (let i = 0; i < 11; i++) {
    const left = x + 7 + ((i * 29) % (w - 40));
    const wave = Math.sin(time * 1.4 + i);
    const row = y + 4 + ((i * 7) % 21) + Math.round(wave * 2);
    ctx.fillStyle = i % 2 ? '#977b47' : '#756339';
    ctx.fillRect(left, row, 14 + Math.round(wave * 5), 2);
    ctx.fillRect(left + 4, row + 2, 6, 1);
  }

  for (let i = 0; i < 3; i++) {
    const phase = (time * 0.32 + i / 3) % 1;
    if (phase > 0.29) continue;
    const bubbleX = x + 28 + i * 51;
    const bubbleY = y + 14 - Math.round(phase * 20);
    ctx.fillStyle = '#b59657';
    ctx.fillRect(bubbleX, bubbleY, 3, 2);
    ctx.fillStyle = '#695635';
    ctx.fillRect(bubbleX, bubbleY + 2, 3, 1);
  }

  ctx.save();
  ctx.strokeStyle = '#c3a66b';
  ctx.lineWidth = 1.5;
  for (const entry of sinking) {
    if (!entry) continue;
    const age = elapsed - entry.at;
    if (age >= 0.65) continue;
    const spread = 8 + age * 37;
    const left = Math.max(x, entry.x - spread);
    const right = Math.min(x + w, entry.x + spread);
    ctx.globalAlpha = 1 - age / 0.65;
    ctx.beginPath();
    ctx.moveTo(left, y + 3);
    ctx.quadraticCurveTo((left + right) / 2, y + 9 + age * 7, right, y + 3);
    ctx.stroke();
  }
  ctx.restore();
}

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

const LEAF_COLORS = ['#45653a', '#72964b', '#557743'];

function drawVineLeaves(ctx, start, control, end, positions) {
  positions.forEach((t, index) => {
    const u = 1 - t;
    const x = u * u * start.x + 2 * u * t * control.x + t * t * end.x;
    const y = u * u * start.y + 2 * u * t * control.y + t * t * end.y;
    const side = index % 2 ? 1 : -1;
    const reach = 6 + (index % 3) * 2;
    const rise = 4 + (index % 2);
    ctx.fillStyle = LEAF_COLORS[index % LEAF_COLORS.length];
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + side * 2, y - rise);
    ctx.lineTo(x + side * (reach - 2), y - rise - 1);
    ctx.lineTo(x + side * reach, y - rise - 3);
    ctx.lineTo(x + side * (reach - 1), y - 2);
    ctx.lineTo(x + side * (reach - 3), y + 1);
    ctx.fill();
  });
}

function drawVineTip(ctx, { x, y }) {
  ctx.fillStyle = LEAF_COLORS[2];
  ctx.beginPath();
  ctx.moveTo(x, y - 2);
  ctx.lineTo(x + 3, y + 1);
  ctx.lineTo(x + 3, y + 4);
  ctx.lineTo(x + 1, y + 7);
  ctx.lineTo(x - 2, y + 4);
  ctx.lineTo(x - 3, y + 1);
  ctx.fill();
}

function drawVine(ctx, { x, y, length }, time) {
  const bend = Math.sin(time * 0.95 + x * 0.03) * 7;
  const top = { x: x - 8, y: -1 };
  const pivot = { x, y };
  const tip = { x: x + bend, y: y + length };
  const lowerControl = { x: x - 9, y: y + length * 0.56 };
  const upperControl = { x: x + 9 * 0.18, y: y - length * 0.56 * 0.18 };
  ctx.strokeStyle = '#355432';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(top.x, top.y);
  ctx.quadraticCurveTo(upperControl.x, upperControl.y, pivot.x, pivot.y);
  ctx.quadraticCurveTo(lowerControl.x, lowerControl.y, tip.x, tip.y);
  ctx.stroke();
  drawVineLeaves(ctx, top, upperControl, pivot, [0.14, 0.33, 0.46, 0.7, 0.87]);
  drawVineLeaves(ctx, pivot, lowerControl, tip, [0.14, 0.35, 0.58, 0.72, 1]);
  drawVineTip(ctx, tip);
}

function drawSwingingVine(ctx, { x, grip }, shake) {
  const top = { x: x - 8, y: -1 };
  const control = { x: top.x + (grip.x - top.x) * 0.25 + shake, y: (top.y + grip.y) / 2 };
  ctx.strokeStyle = '#355432';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(top.x, top.y);
  ctx.quadraticCurveTo(control.x, control.y, grip.x, grip.y);
  ctx.stroke();
  drawVineLeaves(
    ctx,
    top,
    control,
    grip,
    [0.12, 0.23, 0.37, 0.48, 0.56, 0.67, 0.76, 0.88, 0.98, 1],
  );
  drawVineTip(ctx, grip);
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

export function drawJungleTerrain(ctx, time, vine, vineShake = 0) {
  ctx.save();
  drawSwingingVine(ctx, vine, vineShake);
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
    [675, LAND.lower.y],
    [716, LAND.nearBank.y],
    [1137, LAND.farBank.y],
  ])
    drawFern(ctx, x, y, time);

  ctx.fillStyle = '#735b3f';
  ctx.fillRect(CROSSING.vine.x - 4, LAND.perch.y - 12, 8, 12);
  const { y } = LAND.nearBank;
  const signX = LAND.nearBank.x + 11;
  ctx.fillStyle = '#54402c';
  ctx.fillRect(signX + 7, y - 23, 4, 23);
  ctx.fillRect(signX + 90, y - 23, 4, 23);
  ctx.fillRect(signX, y - 30, 101, 16);
  ctx.fillStyle = '#e5cd91';
  ctx.font = 'bold 10px monospace';
  ctx.fillText('ANCIENT CROSSING', signX + 3, y - 19);
  drawBrokenBridge(ctx, time);
  ctx.restore();
}
