import { button } from '../components/button.js';
import { Player } from '../../entities/player/createPlayer.js';
import {
  getPlayerSpriteBounds,
  WALK_FRAME_INTERVAL_MS,
} from '../../entities/player/playerRenderer.js';
import { drawJungle, getJungleBackdrop } from '../../stages/stage02/jungleView.js';
import { drawPortalVeil, ENTRY } from '../portalEffect.js';

const WALK_MS = 1600;
const IDLE_MS = 180;
const TELEPORT_MS = (ENTRY.absorption + ENTRY.glow * 2) * 1000;

export function completeView() {
  return (
    '<div class="sheet jungle-intro">' +
    '<canvas id="jungle-intro-scene" width="1200" height="660" aria-hidden="true"></canvas>' +
    '<canvas id="jungle-intro-crew" aria-hidden="true"></canvas>' +
    '<div id="jungle-intro-copy" class="jungle-intro-copy"><h2>STAGE 1 COMPLETED!</h2>' +
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

export function animateJungleIntro(scene, crew, copy, characters, app) {
  const sceneCtx = scene.getContext?.('2d');
  const crewCtx = crew.getContext?.('2d');
  if (sceneCtx && !app.style.getPropertyValue('--jungle-backdrop')) {
    app.style.setProperty('--jungle-backdrop', `url("${getJungleBackdrop().toDataURL()}")`);
  }
  const travelers = characters.map((character, index) => {
    const player = new Player(index, character, { x: 0, y: 0 }, {});
    player.grounded = true;
    const poses = ['idle', 'walkLeft', 'walkRight'].map((pose) =>
      getPlayerSpriteBounds(player, pose),
    );
    return {
      player,
      width: Math.max(...poses.map(({ w }) => w)),
      height: Math.max(...poses.map(({ h }) => h)),
    };
  });
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const started = performance.now();
  let frame;
  let departureAt;
  let onDepart;

  function drawCrew(elapsed, progress, reduced) {
    const width = Math.max(1, crew.clientWidth);
    const height = Math.max(1, crew.clientHeight);
    if (crew.width !== width) crew.width = width;
    if (crew.height !== height) crew.height = height;
    crewCtx.clearRect(0, 0, width, height);
    if (progress === 1) return;
    crewCtx.imageSmoothingEnabled = false;
    const gap = 24;
    const spriteWidth = travelers[0].width + travelers[1].width;
    // Match the horizon of the bottom-aligned, cover-sized scene behind the crew.
    const sceneScale = Math.max(width / scene.width, scene.clientHeight / scene.height);
    const feet = height - Math.round(60 * sceneScale);
    const scale = Math.min(
      1.35,
      (copy.offsetWidth - gap) / spriteWidth,
      (feet - 7) / Math.max(...travelers.map((traveler) => traveler.height)),
    );
    const center = copy.offsetLeft + copy.offsetWidth / 2;
    const left = center - (spriteWidth * scale + gap) / 2;
    const walking = !reduced && elapsed < WALK_MS;
    let edge = left;
    for (const { player, width: sprite, height: spriteHeight } of travelers) {
      const radius = (sprite * scale) / 2;
      const target = edge + radius;
      const x =
        target -
        (walking ? (center + (spriteWidth * scale + gap) / 2) * (1 - elapsed / WALK_MS) : 0);
      edge += radius * 2 + gap;
      player.vx = walking ? 240 : 0;
      player.walkElapsedMs = elapsed % (2 * WALK_FRAME_INTERVAL_MS);
      const fade = Math.max(0, Math.min(1, (progress - 0.22) / 0.55));
      crewCtx.save();
      crewCtx.globalAlpha = 1 - fade;
      crewCtx.translate(Math.round(x), feet);
      crewCtx.scale(scale, scale);
      crewCtx.translate(-player.w / 2, -player.h);
      player.draw(crewCtx);
      crewCtx.restore();
      if (progress <= 0) continue;
      const glow = Math.sin(progress * Math.PI) * (reduced ? 0.24 : 0.78);
      crewCtx.save();
      crewCtx.beginPath();
      crewCtx.ellipse(
        x,
        feet - (spriteHeight * scale) / 2,
        radius + 7,
        (spriteHeight * scale) / 2 + 6,
        0,
        0,
        Math.PI * 2,
      );
      crewCtx.clip();
      drawPortalVeil(crewCtx, width, height, glow);
      crewCtx.restore();
    }
  }

  function draw(now) {
    const elapsed = Math.max(0, now - started);
    const reduced = motion.matches;
    const progress = onDepart
      ? Math.max(0, Math.min(1, (now - departureAt) / (reduced ? 320 : TELEPORT_MS)))
      : 0;
    if (sceneCtx) drawJungle(sceneCtx, scene.width, scene.height, reduced ? 0 : elapsed / 1000);
    if (crewCtx) drawCrew(elapsed, progress, reduced);
    if (progress === 1) {
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
