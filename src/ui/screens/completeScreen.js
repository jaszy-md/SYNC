import { button } from '../components/button.js';
import { Player } from '../../entities/player/createPlayer.js';
import {
  getPlayerSpriteBounds,
  WALK_FRAME_INTERVAL_MS,
} from '../../entities/player/playerRenderer.js';
import { drawJungle, getJungleBackdrop } from '../../stages/stage02/jungleView.js';
import { travelerEntry } from '../menuTravelers.js';
import {
  drawEnergyPortal,
  drawPortalEntryGlow,
  entryDuration,
  ENTRY,
  portalGeometry,
} from '../portalEffect.js';

const WALK_MS = 3000;
const IDLE_MS = 180;
const DEPARTURE_DURATION = entryDuration(2) + ENTRY.glow;

export function completeView() {
  return (
    '<div class="sheet jungle-intro">' +
    '<canvas id="jungle-intro-scene" width="1200" height="660" aria-hidden="true"></canvas>' +
    '<canvas id="jungle-intro-crew" aria-hidden="true"></canvas>' +
    '<div class="jungle-intro-copy"><h2>STAGE 1 COMPLETED!</h2>' +
    '<p><strong>Jullie hebben Stage 1 gehaald!</strong></p>' +
    '<p>De volgende uitdaging wacht op jullie, diep verborgen in de jungle.</p>' +
    '<p><strong>Zijn jullie klaar voor Stage 2?</strong></p>' +
    button('start-stage-2', 'START STAGE 2', 'primary') +
    '<div class="jungle-intro-links">' +
    button('replay', 'Nog een ronde ↗', 'ghost') +
    button('main-menu', 'Hoofdmenu', 'ghost') +
    '</div></div></div>'
  );
}

export function animateJungleIntro(scene, crew, characters, app) {
  const sceneCtx = scene.getContext?.('2d');
  const crewCtx = crew.getContext?.('2d');
  if (sceneCtx && !app.style.getPropertyValue('--jungle-backdrop')) {
    app.style.setProperty('--jungle-backdrop', `url("${getJungleBackdrop().toDataURL()}")`);
  }
  // The homepage entry sends the rightmost traveler in first. Player 1 leads.
  const travelers = characters
    .map((character, index) => new Player(index, character, { x: 0, y: 0 }, {}))
    .reverse();
  const poses = travelers.flatMap((player) =>
    ['idle', 'walkLeft', 'walkRight', 'jump'].map((pose) => getPlayerSpriteBounds(player, pose)),
  );
  const spriteWidth = Math.max(...poses.map(({ w }) => w));
  const spriteHeight = Math.max(...poses.map(({ h }) => h));
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const started = performance.now();
  let frame;
  let departureAt;
  let onDepart;

  function drawCrew(elapsed, entryElapsed, reduced) {
    const width = Math.max(1, crew.clientWidth);
    const height = Math.max(1, crew.clientHeight);
    if (crew.width !== width) crew.width = width;
    if (crew.height !== height) crew.height = height;
    crewCtx.clearRect(0, 0, width, height);
    crewCtx.imageSmoothingEnabled = false;
    // Match the horizon of the bottom-aligned, cover-sized scene behind the crew.
    const sceneScale = Math.max(width / scene.width, scene.clientHeight / scene.height);
    const feet = height - Math.round(60 * sceneScale);
    const scale = Math.max(
      0.25,
      Math.min(1.25, width / (spriteWidth * 5), (feet - 8) / (spriteHeight * 1.45)),
    );
    const door = portalGeometry({ width, ground: feet, spriteHeight: spriteHeight * scale });
    const spacing = spriteWidth * scale + 16;
    const layout = { left: door.x - spacing * 1.65, spacing };
    drawEnergyPortal(crewCtx, { door, time: elapsed / 1000, activity: 1, reduced });
    const approach = reduced ? 1 : Math.min(1, elapsed / WALK_MS);

    for (const [i, player] of travelers.entries()) {
      const entry = travelerEntry(layout, i, entryElapsed, door.entryX, travelers.length);
      if (entry.entered) continue;
      const x = entry.x - (1 - approach) * (layout.left - (spriteWidth * scale) / 2 - 12);
      const jump = (approach - (player.id === 0 ? 0.23 : 0.52)) / 0.23;
      const lift = jump > 0 && jump < 1 ? 4 * jump * (1 - jump) * spriteHeight * scale * 0.36 : 0;
      player.grounded = lift === 0;
      player.vx = approach < 1 || entryElapsed !== null ? 240 : 0;
      const walkTime = entryElapsed === null ? elapsed : entryElapsed * 1000;
      player.walkElapsedMs = (walkTime + i * 85) % (2 * WALK_FRAME_INTERVAL_MS);
      crewCtx.save();
      crewCtx.globalAlpha = entry.opacity;
      if (entryElapsed !== null) {
        // Same energy plane as the homepage. Hide each sprite as it crosses the portal.
        crewCtx.beginPath();
        crewCtx.rect(0, 0, door.entryX, height);
        crewCtx.clip();
      }
      crewCtx.translate(Math.round(x), feet - lift);
      crewCtx.scale(scale, scale);
      crewCtx.translate(-player.w / 2, -player.h);
      player.draw(crewCtx);
      crewCtx.restore();
    }
    drawPortalEntryGlow(crewCtx, door, entryElapsed, travelers.length);
  }

  function draw(now) {
    const elapsed = Math.max(0, now - started);
    const reduced = motion.matches;
    const entryElapsed =
      onDepart && now >= departureAt
        ? (now - departureAt) * (reduced ? DEPARTURE_DURATION / 320 : 1 / 1000)
        : null;
    if (sceneCtx) drawJungle(sceneCtx, scene.width, scene.height, reduced ? 0 : elapsed / 1000);
    if (crewCtx) drawCrew(elapsed, entryElapsed, reduced);
    if (entryElapsed >= DEPARTURE_DURATION) {
      const finish = onDepart;
      onDepart = null;
      finish();
    } else if (!reduced || onDepart) frame = requestAnimationFrame(draw);
  }
  const restart = () => {
    cancelAnimationFrame(frame);
    draw(performance.now());
  };
  motion.addEventListener?.('change', restart);
  const resize = new ResizeObserver(restart);
  resize.observe(crew);
  restart();
  return {
    teleport(finish) {
      if (onDepart) return;
      const now = performance.now();
      departureAt = motion.matches ? now : Math.max(now, started + WALK_MS + IDLE_MS);
      onDepart = finish;
      restart();
    },
    stop() {
      cancelAnimationFrame(frame);
      resize.disconnect();
      motion.removeEventListener?.('change', restart);
      onDepart = null;
    },
  };
}
