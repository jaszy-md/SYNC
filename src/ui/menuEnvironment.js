// Programmatic, world-anchored props. Future bitmap illustrations can replace
// individual renderers here without changing the parallax or biome system.
export const environmentNoise = (n) => {
  const v = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return v - Math.floor(v);
};
export function environmentColor(b, palettes) {
  const weights = [b[0], b[1], b[2], 0.2];
  const sum = weights.reduce((a, v) => a + v, 0);
  return `rgb(${[0, 1, 2].map((c) => Math.round(palettes.reduce((a, p, i) => a + p[c] * weights[i], 0) / sum)).join(',')})`;
}
function polygon(ctx, points, fill) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
  ctx.fill();
}
function ellipse(ctx, x, y, rx, ry, fill) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}
function line(ctx, points, color, width = 2) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.stroke();
}
function leaf(ctx, x, y, length, angle, color, split = false) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(-length * 0.42, -length * 0.6, 0, -length);
  ctx.quadraticCurveTo(length * 0.42, -length * 0.6, 0, 0);
  ctx.fill();
  line(
    ctx,
    [
      [0, 0],
      [0, -length],
    ],
    '#b4d29850',
    1,
  );
  for (let j = 1; j < 5; j++)
    line(
      ctx,
      [
        [0, (-length * j) / 5],
        [length * 0.16, (-length * (j + 0.35)) / 5],
      ],
      '#152e362f',
      split ? 3 : 1,
    );
  ctx.restore();
}
function vines(ctx, x, top, length, seed) {
  for (let i = 0; i < 4; i++) {
    const px = x + i * 24,
      end = top + length * (0.6 + environmentNoise(seed + i) * 0.4);
    ctx.strokeStyle = '#487652';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(px, top);
    ctx.bezierCurveTo(px - 12, top + length * 0.3, px + 13, end - 24, px - 3, end);
    ctx.stroke();
    for (let y = top + 12; y < end; y += 17)
      ellipse(ctx, px + (Math.floor(y / 17) % 2 ? -5 : 5), y, 6, 3, '#5c8555');
  }
}
function facility(ctx, seed, b, time) {
  const h = 190 + environmentNoise(seed) * 95;
  // Flat-roof research wings overlap at cell boundaries. Connections are drawn
  // separately in world space so bridges/pipes genuinely meet adjacent wings.
  ctx.fillStyle = '#203942';
  ctx.fillRect(-68, -h, 136, h);
  ctx.fillStyle = '#294b52';
  ctx.fillRect(-61, -h + 8, 45, h - 8);
  ctx.fillStyle = '#172c36';
  ctx.fillRect(30, -h + 22, 31, h - 22);
  ctx.fillStyle = '#42626a';
  ctx.fillRect(-73, -h - 5, 146, 9);
  for (let j = 0; j < 4; j++) {
    const y = -h + 32 + j * 49;
    ctx.fillStyle = '#132b35';
    ctx.fillRect(-52, y, 99, 29);
    for (let k = 0; k < 5; k++) {
      ctx.fillStyle = environmentNoise(seed + j * 7 + k) > 0.9 ? '#ba9861' : '#5a8d914a';
      ctx.fillRect(-47 + k * 19, y + 4, 14, 18);
    }
    ctx.fillStyle = '#46646a';
    ctx.fillRect(-55, y + 31, 108, 3);
  }
  // Massive ventilation shaft and industrial ductwork.
  ctx.fillStyle = '#263f48';
  ctx.fillRect(-90, -h * 0.7, 30, h * 0.7);
  for (let j = 0; j < 9; j++)
    line(
      ctx,
      [
        [-89, -h * 0.7 + j * 15],
        [-61, -h * 0.7 + j * 15],
      ],
      '#6b89834a',
      3,
    );
  ellipse(ctx, 36, -68, 28, 28, '#101f2b');
  ctx.strokeStyle = '#49636b';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(36, -68, 28, 0, Math.PI * 2);
  ctx.stroke();
  for (let j = -2; j <= 2; j++)
    line(
      ctx,
      [
        [12, -68 + j * 8],
        [59, -68 + j * 8],
      ],
      '#486572',
      3,
    );
  line(
    ctx,
    [
      [-46, -h - 4],
      [-46, -h - 40],
      [-14, -h - 40],
      [-14, -h + 5],
    ],
    '#162e36',
    14,
  );
  line(
    ctx,
    [
      [-46, -h - 4],
      [-46, -h - 40],
      [-14, -h - 40],
      [-14, -h + 5],
    ],
    '#506b70',
    7,
  );
  ctx.fillStyle = '#101f2b';
  ctx.fillRect(-29, -46, 31, 46);
  ctx.fillStyle = '#617270';
  ctx.fillRect(-32, -49, 37, 5);
  ellipse(ctx, -18, -39, 2, 2, Math.sin(time * 2 + seed) > 0 ? '#d1aa71' : '#706950');
  ctx.fillStyle = '#467064';
  ctx.fillRect(-66, -h + 4, 80, 5);
  vines(ctx, -56, -h + 8, 55 + b[1] * 90, seed);
  vines(ctx, 13, -h * 0.45, 45 + b[1] * 55, seed + 7);
  leaf(ctx, -50, -4, 29, -0.5, '#527f55');
  if (b[1] > 0.25) leaf(ctx, 48, -h + 5, 38, 0.7, '#497f59', true);
  ellipse(ctx, -15, -h - 47 - Math.sin(time + seed) * 5, 21, 8, '#bdd6cc15');
}
function tropicalTree(ctx, seed, b, time) {
  const variant = Math.floor(environmentNoise(seed + 8) * 3);
  const lush = b[1],
    dry = 1 - lush;
  const sway = Math.sin(time * 0.8 + seed) * 0.025;
  if (variant === 0) {
    // Tall, thick buttress tree with spreading roots and layered canopy.
    polygon(
      ctx,
      [
        [-24, 0],
        [-12, -210],
        [12, -221],
        [23, -30],
        [57, 0],
        [14, -10],
        [-6, -16],
        [-51, 0],
      ],
      '#555945',
    );
    line(
      ctx,
      [
        [0, -155],
        [-49, -220],
      ],
      '#555945',
      13,
    );
    line(
      ctx,
      [
        [0, -170],
        [53, -237],
      ],
      '#555945',
      12,
    );
    for (let i = 0; i < 5; i++) {
      const x = (i - 2) * 32,
        y = -229 - (i % 2) * 28;
      ellipse(
        ctx,
        x,
        y,
        52,
        31,
        environmentColor(
          [0, lush, dry, 0],
          [
            [40, 80, 69],
            [35, 91, 62],
            [140, 126, 72],
            [34, 71, 66],
          ],
        ),
      );
      ellipse(ctx, x - 8, y - 12, 31, 13, '#78a96a38');
    }
    vines(ctx, -36, -221, 130, seed);
    line(
      ctx,
      [
        [-8, -190],
        [-2, -23],
        [23, -5],
      ],
      '#9ca27b30',
      3,
    );
  } else {
    // Palm and banana silhouettes use distinct curved stems and huge fronds.
    const h = variant === 1 ? 250 : 165;
    ctx.strokeStyle = '#77765a';
    ctx.lineWidth = variant === 1 ? 13 : 18;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(28, -h * 0.55, 9, -h);
    ctx.stroke();
    for (let j = 0; j < 7; j++) {
      const angle = -1.45 + j * 0.48 + sway;
      leaf(
        ctx,
        9,
        -h,
        variant === 1 ? 99 : 83,
        angle,
        j % 2 ? '#437e55' : '#5c9963',
        variant === 2,
      );
    }
    line(
      ctx,
      [
        [-22, 0],
        [0, -14],
        [20, 0],
      ],
      '#5b6649',
      8,
    );
    if (variant === 2) leaf(ctx, -11, -38, 72, -1.05, '#47794e', true);
  }
}
function pyramid(ctx) {
  polygon(
    ctx,
    [
      [-85, 0],
      [0, -118],
      [85, 0],
    ],
    '#d8ad76',
  );
  polygon(
    ctx,
    [
      [0, -118],
      [21, 0],
      [85, 0],
    ],
    '#af7951',
  );
  for (let j = 1; j < 8; j++)
    line(
      ctx,
      [
        [-85 + j * 10.3, -j * 14.5],
        [85 - j * 10.3, -j * 14.5],
      ],
      '#efcc9840',
      1,
    );
}
function monument(ctx, kind, b) {
  const stone = b[2] > 0.5 ? '#ba946c' : '#698173';
  if (kind === 'obelisk') {
    polygon(
      ctx,
      [
        [-12, 0],
        [-9, -116],
        [0, -136],
        [9, -116],
        [12, 0],
      ],
      stone,
    );
    polygon(
      ctx,
      [
        [0, -136],
        [9, -116],
        [12, 0],
        [3, 0],
      ],
      '#876e57',
    );
    ctx.fillStyle = '#816751';
    for (let j = 0; j < 5; j++) ctx.fillRect(-4, -103 + j * 17, 4, 8);
    ctx.fillStyle = stone;
    ctx.fillRect(-21, -9, 42, 9);
  } else if (kind === 'sphinx') {
    ellipse(ctx, -6, -29, 49, 22, stone);
    polygon(
      ctx,
      [
        [13, -31],
        [12, -75],
        [24, -95],
        [39, -86],
        [43, -42],
        [59, -19],
        [57, 0],
        [24, 0],
      ],
      stone,
    );
    polygon(
      ctx,
      [
        [13, -70],
        [18, -91],
        [39, -91],
        [48, -68],
      ],
      '#a9825d',
    );
    ctx.fillStyle = '#715d4c';
    ctx.fillRect(31, -80, 3, 3);
    ctx.fillStyle = stone;
    ctx.fillRect(-57, -13, 114, 13);
    line(
      ctx,
      [
        [29, -40],
        [35, -5],
        [64, -5],
      ],
      '#856b53',
      3,
    );
  } else if (kind === 'statue') {
    ctx.fillStyle = stone;
    ctx.fillRect(-26, -14, 52, 14);
    polygon(
      ctx,
      [
        [-18, -14],
        [-13, -72],
        [13, -72],
        [18, -14],
      ],
      stone,
    );
    ellipse(ctx, 0, -83, 13, 16, stone);
    polygon(
      ctx,
      [
        [-17, -78],
        [-13, -100],
        [13, -100],
        [17, -78],
      ],
      '#a18161',
    );
    line(
      ctx,
      [
        [-7, -69],
        [-7, -30],
        [7, -30],
        [7, -69],
      ],
      '#796650',
      3,
    );
  } else {
    ctx.fillStyle = stone;
    for (let i = 0; i < 4; i++) {
      const x = -63 + i * 40;
      ctx.fillRect(x, -67 + (i % 2) * 11, 13, 67 - (i % 2) * 11);
      ctx.fillRect(x - 4, -72 + (i % 2) * 11, 21, 9);
      ctx.fillRect(x - 3, -8, 19, 8);
    }
    ctx.fillRect(-70, -82, 147, 12);
    for (let j = 0; j < 5; j++)
      line(
        ctx,
        [
          [-62 + j * 27, -79],
          [-52 + j * 27, -73],
        ],
        '#816d5640',
        2,
      );
    if (b[1] > 0.3) vines(ctx, -55, -77, 65, 77);
  }
}
export function drawEnvironmentProp(ctx, kind, x, y, size, b, seed, time) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size, size);
  if (kind === 'factory') facility(ctx, seed, b, time);
  else if (kind === 'tree') tropicalTree(ctx, seed, b, time);
  else if (kind === 'pyramid') pyramid(ctx);
  else if (['ruin', 'obelisk', 'sphinx', 'statue'].includes(kind)) monument(ctx, kind, b);
  else {
    polygon(
      ctx,
      [
        [-30, 0],
        [-22, -21],
        [-4, -36],
        [23, -25],
        [35, 0],
      ],
      b[2] > 0.5 ? '#a78360' : '#526d61',
    );
    polygon(
      ctx,
      [
        [-22, -21],
        [-4, -36],
        [9, -20],
      ],
      '#ffffff18',
    );
    if (b[1] > 0.45) ellipse(ctx, -8, -25, 21, 7, '#557b53');
  }
  ctx.restore();
}

// Bounded per-renderer cache for immutable windows, trunks and leaf silhouettes.
// Ambient accents, portal effects and character poses remain animated.
export function createEnvironmentPainter() {
  const cache = new Map();
  const bounds = {
    tree: [140, 365, 280, 370],
    factory: [100, 350, 205, 355],
    pyramid: [88, 121, 176, 125],
    ruin: [82, 87, 164, 92],
    obelisk: [24, 141, 48, 145],
    sphinx: [70, 102, 140, 107],
    statue: [30, 104, 60, 109],
    rock: [38, 40, 76, 45],
  };
  return {
    draw(ctx, kind, x, y, size, b, seed, time) {
      if (typeof OffscreenCanvas === 'undefined') {
        drawEnvironmentProp(ctx, kind, x, y, size, b, seed, time);
        return;
      }
      const key = `${kind}|${seed}|${size}|${b.join(',')}`;
      let entry = cache.get(key);
      if (!entry) {
        const [left, top, w, h] = bounds[kind] ?? bounds.rock;
        const image = new OffscreenCanvas(Math.ceil(w * size) + 4, Math.ceil(h * size) + 4);
        const brush = image.getContext('2d');
        brush.translate(left * size + 2, top * size + 2);
        drawEnvironmentProp(brush, kind, 0, 0, size, b, seed, 0);
        entry = { image, left: left * size + 2, top: top * size + 2 };
        cache.set(key, entry);
        if (cache.size > 96) cache.delete(cache.keys().next().value);
      } else {
        cache.delete(key);
        cache.set(key, entry);
      }
      ctx.drawImage(entry.image, x - entry.left, y - entry.top);
      if (kind === 'tree') {
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(size, size);
        leaf(ctx, 18, -24, 22, 0.8 + Math.sin(time + seed) * 0.06, '#639864');
        ctx.restore();
      } else if (kind === 'factory') {
        ellipse(
          ctx,
          x - 18 * size,
          y - 39 * size,
          2 * size,
          2 * size,
          Math.sin(time * 2 + seed) > 0 ? '#d1aa71' : '#706950',
        );
        const roof = 190 + environmentNoise(seed) * 95;
        ellipse(
          ctx,
          x - 15 * size,
          y - (roof + 47 + Math.sin(time + seed) * 5) * size,
          21 * size,
          8 * size,
          '#bdd6cc15',
        );
      }
    },
    dispose() {
      cache.clear();
    },
  };
}

export function drawFacilityConnection(ctx, x, y, span, vegetation, seed) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = '#243d46';
  ctx.fillRect(-span * 0.1, -107, span * 1.2, 10);
  ctx.fillStyle = '#5c7372';
  ctx.fillRect(-span * 0.1, -108, span * 1.2, 3);
  line(
    ctx,
    [
      [-span * 0.1, -129],
      [span * 1.1, -129],
    ],
    '#8b8a68',
    2,
  );
  for (let j = -span * 0.1; j < span * 1.1; j += 19)
    line(
      ctx,
      [
        [j, -129],
        [j, -109],
      ],
      '#8b8a68',
      2,
    );
  line(
    ctx,
    [
      [-span * 0.1, -57],
      [span * 1.1, -57],
    ],
    '#203641',
    10,
  );
  line(
    ctx,
    [
      [-span * 0.1, -59],
      [span * 1.1, -59],
    ],
    '#6a827f',
    3,
  );
  ctx.strokeStyle = '#162c33';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, -97);
  ctx.quadraticCurveTo(span * 0.5, -61, span, -97);
  ctx.stroke();
  vines(ctx, span * 0.25, -106, 25 + vegetation * 70, seed);
  ctx.restore();
}

export function drawGroundDetails(ctx, { x, ground, step, height, b, seed, time }) {
  const [metal, green, sand] = b;
  // Alpha blends material coverage; no threshold-based switch of the floor.
  ctx.save();
  ctx.globalAlpha = metal;
  ctx.fillStyle = '#71898a25';
  ctx.fillRect(x + 2, ground + 9, step - 4, 20);
  line(
    ctx,
    [
      [x + 1, ground + 8],
      [x + 1, ground + 35],
      [x + step - 2, ground + 35],
    ],
    '#152c36',
    2,
  );
  for (let j = 0; j < 3; j++) {
    ellipse(ctx, x + 7 + (j * (step - 14)) / 2, ground + 14, 1.5, 1.5, '#a5ae98');
  }
  if (seed % 3 === 0) {
    ctx.fillStyle = '#172b34';
    ctx.fillRect(x + 16, ground + 12, step * 0.42, 17);
    for (let j = 0; j < 6; j++)
      line(
        ctx,
        [
          [x + 18 + j * 5, ground + 12],
          [x + 18 + j * 5, ground + 29],
        ],
        '#6c8484',
        1,
      );
  }
  line(
    ctx,
    [
      [x + step * 0.7, ground + 3],
      [x + step * 0.61, ground + 19],
      [x + step * 0.78, ground + 27],
    ],
    '#112b35',
    1,
  );
  ctx.restore();
  ctx.save();
  ctx.globalAlpha = Math.min(1, green + metal * 0.15);
  ellipse(ctx, x + step * 0.55, ground + 7, step * 0.23, 4, '#527e4c');
  ctx.strokeStyle = '#8a8057';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x - 1, ground + 18);
  ctx.bezierCurveTo(
    x + step * 0.3,
    ground + 3,
    x + step * 0.6,
    ground + 32,
    x + step + 1,
    ground + 17,
  );
  ctx.stroke();
  for (let j = 0; j < 5; j++) {
    const px = x + 9 + (j * step) / 5,
      len = 12 + environmentNoise(seed + j) * 20;
    leaf(ctx, px, ground + 3, len, -0.6 + j * 0.24, '#4d8759', j % 2 === 0);
  }
  for (let j = 0; j < 3; j++) leaf(ctx, x + j * 22, ground + 40, 10, -1.4, '#8c9c5a');
  ctx.restore();
  ctx.save();
  ctx.globalAlpha = sand;
  // Tiny sand drifts, deliberately no large terrain humps.
  ellipse(ctx, x + step * 0.7, ground + 6, step * 0.3, 5, '#ecd0984d');
  for (let j = 0; j < 7; j++) {
    const px = x + environmentNoise(seed + j * 11) * step,
      py = ground + 12 + environmentNoise(seed + j * 17) * Math.min(60, height - ground - 12);
    line(
      ctx,
      [
        [px, py],
        [px + 8, py - 1],
        [px + 16, py],
      ],
      '#f2d3a145',
      1,
    );
  }
  ctx.restore();
  if (environmentNoise(seed) > 0.72)
    drawEnvironmentProp(ctx, 'rock', x + step * 0.75, ground, 0.25, b, seed, time);
}
