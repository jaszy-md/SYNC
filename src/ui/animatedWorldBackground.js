import { getCharacterImage } from '../entities/player/characterAssets.js';
import {
  createEnvironmentPainter,
  drawFacilityConnection,
  drawGroundDetails,
  environmentNoise as random,
  environmentColor as color,
} from './menuEnvironment.js';
import { TRAVELERS, drawTravelers, travelerLayout } from './menuTravelers.js';
import {
  journeyPortalState,
  journeyCycleDuration,
  portalGeometry,
  drawEnergyPortal,
  drawPortalEntryGlow,
  drawPortalVeil,
} from './portalEffect.js';

export const JOURNEY = { length: 8400, duration: 56, characters: true };
// Spatial blends are continuous within the journey. The only discontinuity is
// the intentional Sahara-to-facility portal reset, hidden under an opaque veil.
export const BIOMES = [
  [0, 1, 0.2, 0, 0],
  [0.16, 1, 0.3, 0, 0],
  [0.3, 0.45, 0.85, 0, 0],
  [0.43, 0, 1, 0, 0],
  [0.56, 0, 0.65, 0.3, 0],
  [0.68, 0, 0.12, 1, 0],
  [0.78, 0, 0, 1, 0.35],
  [0.86, 0, 0, 1, 1],
  [0.94, 0, 0, 1, 0.6],
  [1, 0, 0, 1, 0.35],
];
export const wrap = (x, length = JOURNEY.length) => ((x % length) + length) % length;
export function biomeAt(x, length = JOURNEY.length) {
  const phase = Math.max(0, Math.min(1, x / length));
  if (phase === 1) return BIOMES.at(-1).slice(1);
  const i = BIOMES.findIndex((key) => key[0] > phase);
  const a = BIOMES[i - 1],
    b = BIOMES[i];
  let t = (phase - a[0]) / (b[0] - a[0]);
  t = t * t * (3 - 2 * t);
  return a.slice(1).map((v, j) => v + (b[j + 1] - v) * t);
}

export function environmentKind(b, seed, layer) {
  const n = random(seed);
  if (b[0] > 0.7 || n < b[0] * 0.8) return 'factory';
  if (n < b[0] * 0.8 + b[1] * 0.85) return 'tree';
  if (layer === 0) return b[3] > 0.15 && n < b[3] * 0.6 ? 'pyramid' : null;
  if (b[2] > 0.6 && n > 0.65)
    return ['obelisk', 'sphinx', 'statue', 'ruin'][Math.floor(random(seed + 18) * 4)];
  return n > 0.82 ? 'ruin' : n > 0.42 ? 'rock' : null;
}

export function createAnimatedWorldBackground(_selected, config = JOURNEY) {
  const canvas = document.createElement('canvas');
  canvas.id = 'menu-world';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.prepend(canvas);
  const ctx = canvas.getContext('2d', { alpha: false });
  const painter = createEnvironmentPainter();
  const drawProp = (...args) => painter.draw(ctx, ...args);
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let active = false,
    home = false,
    frame = 0,
    last = 0,
    position = 0,
    timelineTime = 0,
    cycle = 0,
    width = 1200,
    height = 700;
  let layout = travelerLayout(width, height);
  let reportedSecond = -1,
    reportedPhase = '';
  const sample = (x) => biomeAt(x, config.length);
  const assetReady = () => {
    if (active) draw();
  };
  // Stable listener identity prevents a new image listener on every frame.
  if (config.characters)
    TRAVELERS.forEach((character) => {
      for (const pose of ['idle', 'walkLeft', 'walkRight', 'jump'])
        getCharacterImage(character.sprites[pose], assetReady);
    });
  function measureTravelers() {
    const copy = document.querySelector?.('.hero-copy');
    const bounds = copy?.getBoundingClientRect();
    let bottom = bounds?.bottom ?? height * 0.64;
    const links = copy?.querySelector('.menu-links')?.getBoundingClientRect();
    const note = copy?.querySelector('.journey-note')?.getBoundingClientRect();
    if (links) bottom = Math.max(links.bottom, note?.height ? note.bottom : 0);
    // Use the occupied title/text/button boxes, rather than the wider empty
    // hero-copy box, to keep the crew visible on short landscape screens.
    const occupied = copy
      ? [...copy.querySelectorAll('h1, .escape-title, .typing, button')].map(
          (node) => node.getBoundingClientRect().right,
        )
      : [];
    const menuRight = occupied.length ? Math.max(...occupied) : (bounds?.right ?? width * 0.44);
    layout = travelerLayout(width, height, bottom, menuRight);
  }
  const ellipse = (x, y, rx, ry, fill) => {
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
  };
  function draw() {
    const time = timelineTime,
      ground = height * 0.87;
    const sky = ctx.createLinearGradient(0, 0, 0, height);
    const b = sample(position);
    sky.addColorStop(
      0,
      color(b, [
        [30, 54, 79],
        [51, 112, 117],
        [220, 153, 104],
        [69, 84, 104],
      ]),
    );
    sky.addColorStop(
      1,
      color(b, [
        [138, 164, 169],
        [170, 204, 166],
        [255, 223, 159],
        [154, 169, 178],
      ]),
    );
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, height);
    ellipse(width * 0.79, height * 0.22, 35, 35, '#ffe1a980');
    // Periodic sky drift and dust have the same closing phase as the landscape.
    for (let i = 0; i < 7; i++) {
      const skyLength = config.length * 0.25;
      const x = wrap((i * skyLength) / 7 - position * 0.25, skyLength) - 100;
      const y = height * (0.14 + random(i + 70) * 0.18);
      ellipse(x, y, 55, 10, '#e1efde20');
      ellipse(x + 20, y - 8, 31, 14, '#e1efde20');
    }
    // Same world-position/parallax system; each cell owns immutable props.
    const portal = journeyPortalState(time, config.duration, motion.matches, TRAVELERS.length);
    portal.door = portalGeometry(layout, portal.activity);
    if (reportedPhase !== portal.phase) {
      reportedPhase = portal.phase;
      canvas.setAttribute('data-journey-phase', portal.phase);
    }
    if (reportedSecond !== Math.floor(time)) {
      reportedSecond = Math.floor(time);
      canvas.setAttribute('data-journey-second', String(reportedSecond));
    }
    for (const [layer, speed, spacing] of [
      [0, 0.22, 170],
      [1, 0.48, 190],
      [2, 0.78, 205],
      [3, 1, 85],
    ]) {
      const length = config.length * speed,
        camera = position * speed;
      const count = Math.round(length / spacing),
        step = length / count;
      const base = ground - (3 - layer) * height * 0.065;
      if (layer < 3) {
        // Flat receding ground planes anchor roots and building foundations.
        // Depth comes from parallax and color, never from the removed hills.
        const plane = ctx.createLinearGradient(0, base, width, base);
        for (let stop = 0; stop <= 8; stop++) {
          plane.addColorStop(
            stop / 8,
            color(sample((camera + (width * stop) / 8) / speed), [
              [34, 53, 61],
              [44, 72, 51],
              [160, 125, 83],
              [56, 70, 69],
            ]),
          );
        }
        ctx.fillStyle = plane;
        ctx.fillRect(0, base, width, height - base);
      }
      // Include wide props outside both screen edges; never cull a visible wing.
      const first = Math.floor((camera - 200) / step);
      const lastCell = Math.ceil((camera + width + 200) / step);
      for (let cell = first; cell <= lastCell; cell++) {
        const wx = cell * step,
          x = wx - camera;
        const seed = cell + layer * 900,
          local = sample(wx / speed);
        const n = random(seed),
          size = (layer === 0 ? 0.64 : layer === 1 ? 0.94 : 1.18) * (0.82 + n * 0.36);
        if (layer < 3) {
          const kind = environmentKind(local, seed, layer);
          ctx.save();
          if (layer === 0) ctx.globalAlpha = 0.48;
          // Palms peek out behind the complex from the start of the expedition.
          if (kind === 'factory') {
            drawProp('tree', x + step * 0.6, base, size * 0.92, [0, 0.8, 0, 0], seed + 31, time);
            const next = sample((wx + step) / speed);
            if (environmentKind(next, seed + 1, layer) === 'factory')
              drawFacilityConnection(ctx, x + step * 0.4, base, step, local[1], seed);
          }
          if (kind) drawProp(kind, x + step * 0.4, base, size, local, seed, time);
          ctx.restore();
        } else {
          const groundColors = [
            [46, 64, 70],
            [51, 63, 40],
            [185, 142, 89],
            [61, 72, 78],
          ];
          const surfaceColors = [
            [99, 126, 127],
            [88, 128, 63],
            [228, 190, 125],
            [115, 131, 130],
          ];
          const next = sample((wx + step) / speed);
          const groundGradient = ctx.createLinearGradient(x, 0, x + step, 0);
          groundGradient.addColorStop(0, color(local, groundColors));
          groundGradient.addColorStop(1, color(next, groundColors));
          ctx.fillStyle = groundGradient;
          ctx.fillRect(x - 1, ground, step + 2, height - ground);
          const rim = ctx.createLinearGradient(x, 0, x + step, 0);
          rim.addColorStop(0, color(local, surfaceColors));
          rim.addColorStop(1, color(next, surfaceColors));
          ctx.fillStyle = rim;
          ctx.fillRect(x - 1, ground, step + 2, 5);
          drawGroundDetails(ctx, { x, ground, step, height, b: local, seed, time });
          if (local[2] > 0.5)
            ellipse(x + 40, ground - 15 + Math.sin(time + seed) * 6, 2, 1, '#ffdfab70');
          else if (local[1] > 0.5)
            ellipse(x + 30, ground - 48 + Math.sin(time + seed) * 9, 1.5, 1.5, '#e9ed9a80');
        }
      }
      if (layer === 1) {
        // One landmark pyramid per trip, anchored to one coordinate. It crosses
        // the center late in Sahara; smaller pyramids stay in the distant layer.
        const landmarkX = config.length * 0.89 * speed - camera + 420;
        if (landmarkX > -310 && landmarkX < width + 310) {
          ctx.save();
          ctx.globalAlpha = Math.min(1, b[2]);
          drawProp('pyramid', landmarkX, base, 2.65, [0, 0, 1, 1], 77, time);
          ctx.restore();
        }
      }
    }
    // Portal background/frame first, travelers in front, then local entry glow.
    // No opaque frame pass over the approaching characters.
    if (home)
      drawEnergyPortal(ctx, {
        door: portal.door,
        time,
        activity: portal.activity,
        reduced: motion.matches,
      });
    if (home && config.characters)
      drawTravelers(ctx, layout, time, cycle, motion.matches, portal, assetReady);
    if (home && !motion.matches) {
      drawPortalEntryGlow(ctx, portal.door, portal.exitElapsed, TRAVELERS.length);
      drawPortalVeil(ctx, width, height, portal.veil);
    }
  }
  function tick(now) {
    frame = 0;
    if (!active || document.hidden) return;
    const dt = last ? Math.min((now - last) / 1000, 0.05) : 0;
    last = now;
    timelineTime = Math.round((timelineTime + dt) * 1e9) / 1e9;
    const duration = journeyCycleDuration(config.duration, TRAVELERS.length);
    if (timelineTime >= duration) {
      cycle++;
      timelineTime = Math.round((timelineTime - duration) * 1e9) / 1e9;
    }
    const portal = journeyPortalState(timelineTime, config.duration, false, TRAVELERS.length);
    position = (portal.worldSeconds * config.length) / config.duration;
    draw();
    frame = requestAnimationFrame(tick);
  }
  function sync() {
    cancelAnimationFrame(frame);
    frame = 0;
    last = 0;
    if (active && !document.hidden) {
      draw();
      if (home && !motion.matches) frame = requestAnimationFrame(tick);
    }
  }
  function resize() {
    width = innerWidth;
    height = innerHeight;
    const scale = Math.min(devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    measureTravelers();
    if (active) draw();
  }
  window.addEventListener('resize', resize);
  document.addEventListener('visibilitychange', sync);
  motion.addEventListener('change', sync);
  resize();
  return {
    setView(visible, isHome) {
      active = visible;
      home = isHome;
      canvas.hidden = !visible;
      document.body.classList.toggle('journey-menu', visible);
      document.body.classList.toggle('journey-home', visible && isHome);
      // UI.render calls this before replacing its HTML, so measure on the next
      // frame after the existing fitPanel has positioned the unchanged menu.
      queueMicrotask(() => {
        if (active) {
          measureTravelers();
          draw();
        }
      });
      sync();
    },
    destroy() {
      active = false;
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', sync);
      motion.removeEventListener('change', sync);
      painter.dispose();
      document.body.classList.toggle('journey-menu', false);
      document.body.classList.toggle('journey-home', false);
      canvas.remove();
    },
  };
}
