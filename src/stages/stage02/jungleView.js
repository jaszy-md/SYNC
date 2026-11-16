const WIDTH = 400;
const HEIGHT = 220;
const HORIZON = 200;
let backdrop;

const noise = (seed) => {
  const n = Math.sin(seed * 91.73 + 17.2) * 43758.5453;
  return n - Math.floor(n);
};

function rect(ctx, color, x, y, w, h) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), w, h);
}

function drawTrees(ctx, color, light, spacing, base, seed) {
  for (let x = -12; x < WIDTH + 20; x += spacing) {
    const n = seed + x;
    const top = 10 + Math.round(noise(n) * 82);
    const trunk = 5 + Math.round(noise(n + 1) * 6);
    rect(ctx, color, x, top, trunk, base - top);
    rect(ctx, color, x - 4, base - 6, trunk + 8, 6);
    rect(ctx, color, x - 8, top + 21, trunk + 16, 4);
    rect(ctx, light, x + 2, top + 18, 2, base - top - 24);
    for (let i = 0; i < 8; i++) {
      const left = x - 18 + noise(n + i * 3) * 29;
      const y = top - 13 + noise(n + i * 3 + 1) * 34;
      rect(ctx, color, left, y, 15, 8);
      rect(ctx, color, left + 3, y - 3, 9, 14);
      rect(ctx, light, left + 3, y - 3, 9, 2);
    }
  }
}

function drawFern(ctx, x, y, size, color, flip) {
  for (let i = 0; i < 12; i++) {
    const t = i / 12;
    const stemX = x + flip * size * t;
    const stemY = y - size * (2 * t - 1.2 * t * t);
    const leaf = Math.ceil(size * (0.23 - t * 0.17));
    rect(ctx, color, stemX - leaf, stemY, leaf + 2, 2);
    rect(ctx, color, stemX, stemY, 2, leaf);
  }
}

export function getJungleBackdrop() {
  if (backdrop) return backdrop;
  backdrop = document.createElement('canvas');
  backdrop.width = WIDTH;
  backdrop.height = HEIGHT;
  const ctx = backdrop.getContext('2d');
  const sky = ctx.createRadialGradient(233, 66, 5, 233, 66, 238);
  sky.addColorStop(0, '#b7c87b');
  sky.addColorStop(0.35, '#718f67');
  sky.addColorStop(1, '#1c4b48');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  drawTrees(ctx, '#4a7160', '#587d65', 17, 152, 20);
  for (let y = 0; y < 172; y += 2) {
    rect(ctx, '#e5e9a21a', 230 - y * 0.72, y, 8 + y * 0.18, 2);
    rect(ctx, '#e5e9a212', 273 - y * 0.62, y, 4 + y * 0.14, 2);
  }
  drawTrees(ctx, '#254e44', '#335f49', 38, 174, 150);
  for (let x = -5; x < WIDTH; x += 5) {
    const y = 165 - Math.round(noise(x) * 13);
    rect(ctx, '#285746', x, y, 5, HORIZON - y);
    rect(ctx, '#214a3e', x, y + 13, 5, HORIZON - y - 13);
    rect(ctx, '#193b33', x, 186 - noise(x + 1) * 8, 5, 22);
  }
  for (let x = 13; x < WIDTH; x += 18) {
    const size = 9 + noise(x + 104) * 14;
    const y = 187 + noise(x + 1) * 11;
    drawFern(ctx, x, y, size, '#477551', 1);
    drawFern(ctx, x, y, size * 0.8, '#2c5b44', -1);
  }
  for (const [x, flip] of [
    [0, 1],
    [WIDTH, -1],
  ]) {
    ctx.save();
    ctx.translate(x, 0);
    ctx.scale(flip, 1);
    rect(ctx, '#122b28', 0, 0, 26, 190);
    rect(ctx, '#19382d', 11, 0, 6, 179);
    rect(ctx, '#122b28', 0, 179, 34, 11);
    rect(ctx, '#122b28', 0, 190, 47, 10);
    for (let root = 0; root < 9; root++) {
      rect(ctx, '#213f30', 19 + root * 4, 174 + root * 2, 8, 7);
    }
    for (let i = 0; i < 26; i++) {
      const left = noise(i + x) * 82;
      const y = noise(i + x + 18) * (45 - left * 0.42);
      rect(ctx, '#102d27', left, y, 17, 7);
      rect(ctx, '#1b4734', left + 2, y - 3, 12, 4);
    }
    ctx.restore();
  }

  rect(ctx, '#282d22', 0, HORIZON, WIDTH, HEIGHT - HORIZON);
  rect(ctx, '#5d7447', 0, HORIZON, WIDTH, 2);
  rect(ctx, '#435537', 0, HORIZON + 2, WIDTH, 3);
  for (let x = 0; x < WIDTH; x += 4) {
    rect(ctx, '#354235', x, HORIZON + 6 + noise(x) * 11, 3, 2);
    if (noise(x + 1) > 0.5) rect(ctx, '#7f8a52', x, HORIZON, 2, 1);
  }
  return backdrop;
}

export function drawJungle(ctx, width, height, time) {
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(getJungleBackdrop(), 0, 0, width, height);
  ctx.scale(width / WIDTH, height / HEIGHT);
  for (const [x, length] of [
    [30, 50],
    [58, 34],
    [341, 36],
    [373, 61],
  ]) {
    for (let y = 0; y < length; y += 2) {
      const swing = Math.sin(time * 0.85 + y * 0.1 + x) * (y / length) * 3;
      rect(ctx, '#254e37', x + swing, y, 2, 2);
      if (y % 8 === 0) rect(ctx, '#466746', x + swing - 2, y, 6, 2);
    }
  }
  for (let i = 0; i < 14; i++) {
    const x = 38 + noise(i) * 324 + Math.sin(time * 0.5 + i) * 5;
    const y = 57 + noise(i + 20) * 126 + Math.cos(time * 0.64 + i) * 4;
    ctx.globalAlpha = 0.4 + 0.3 * Math.sin(time + i);
    rect(ctx, '#dce496', x, y, 1, 1);
  }
  ctx.restore();
}
