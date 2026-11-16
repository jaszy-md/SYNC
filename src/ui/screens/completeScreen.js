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

const IDLE_MS = 180;
const DEPARTURE_DURATION = entryDuration(2) + ENTRY.glow;

export function jungleEntrance({ button, ground, scale, spriteWidths, waitAt }) {
  const walkSpeed = 128 * scale;
  const fallGravity = 620 * scale;
  const gravity = 1050 * scale;
  const jumpSpeed = 175 * scale;
  const fall = Math.sqrt((2 * button.top) / fallGravity);
  const jump =
    (jumpSpeed + Math.sqrt(jumpSpeed ** 2 + 2 * gravity * (ground - button.top))) / gravity;
  const [rearWidth, leadWidth] = spriteWidths;
  const rearX = button.left + 12 + rearWidth / 2;
  const leadX = rearX + (rearWidth + leadWidth) / 2 + 12;
  // Keep room for the drop and the walk to the queue on narrower panels.
  const approachRoom = waitAt[0] - leadX;
  const jumpDistance = Math.min(walkSpeed * jump, approachRoom * 0.55);
  const edge = Math.min(button.right - 8, waitAt[0] - jumpDistance - approachRoom * 0.18);
  const lowerLanding = edge + jumpDistance;
  const jumpPace = jumpDistance / jump;
  // Rightmost traveler (Player 1) leads. Both follow the same edge without crossing.
  const travelers = waitAt.map((endX, i) => {
    const lead = i === 1;
    const x = lead ? leadX : rearX;
    const delay = lead ? 0 : 0.26;
    const approachEdge = (edge - x) / walkSpeed;
    const walkAt = fall + 0.58 + (lead ? 0 : 0.08 + jump - jumpDistance / walkSpeed);
    const jumpAt = walkAt + approachEdge;
    const landAt = jumpAt + jump;
    const waitFrom = landAt + (endX - lowerLanding) / walkSpeed;
    return {
      waitFrom,
      sample(time) {
        if (time < delay) return null;
        if (time < delay + fall)
          return { x, y: (fallGravity * (time - delay) ** 2) / 2, grounded: false, distance: 0 };
        if (time < walkAt) return { x, y: button.top, grounded: true, distance: 0 };
        if (time < jumpAt) {
          const distance = (time - walkAt) * walkSpeed;
          return { x: x + distance, y: button.top, grounded: true, distance };
        }
        if (time < landAt) {
          const t = time - jumpAt;
          return {
            x: edge + jumpPace * t,
            y: button.top - jumpSpeed * t + (gravity * t ** 2) / 2,
            grounded: false,
            distance: 0,
          };
        }
        if (time < waitFrom) {
          const distance = (time - landAt) * walkSpeed;
          return { x: lowerLanding + distance, y: ground, grounded: true, distance };
        }
        return { x: endX, y: ground, grounded: true, distance: 0 };
      },
    };
  });
  return { edge, travelers, duration: Math.max(...travelers.map(({ waitFrom }) => waitFrom)) };
}

export function completeView() {
  return (
    '<div class="sheet jungle-intro">' +
    '<canvas id="jungle-intro-scene" width="1200" height="660" aria-hidden="true"></canvas>' +
    '<canvas id="jungle-intro-crew" aria-hidden="true"></canvas>' +
    '<div class="jungle-intro-copy"><h2>STAGE 1 COMPLETED!</h2>' +
    '<p><strong>Jullie hebben Stage 1 gehaald!</strong></p>' +
    '<p>De volgende uitdaging wacht op jullie, diep verborgen in de jungle.</p>' +
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
  const travelerPoses = travelers.map((player) =>
    ['idle', 'walkLeft', 'walkRight', 'jump'].map((pose) => getPlayerSpriteBounds(player, pose)),
  );
  const poses = travelerPoses.flat();
  const spriteWidths = travelerPoses.map((bounds) => Math.max(...bounds.map(({ w }) => w)));
  const spriteWidth = Math.max(...poses.map(({ w }) => w));
  const spriteHeight = Math.max(...poses.map(({ h }) => h));
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const started = performance.now();
  const startButton = crew.parentElement?.querySelector('#start-stage-2');
  let frame;
  let layout;
  let requestedAt;
  let departureAt;
  let onDepart;

  function measureCrew() {
    if (!crewCtx) return;
    const width = Math.max(1, crew.clientWidth);
    const height = Math.max(1, crew.clientHeight);
    if (crew.width !== width) crew.width = width;
    if (crew.height !== height) crew.height = height;
    // Match the horizon of the bottom-aligned, cover-sized scene behind the crew.
    const sceneScale = Math.max(width / scene.width, scene.clientHeight / scene.height);
    const groundInset = Math.round(60 * sceneScale);
    const ground = height - groundInset;
    const portalScale = Math.max(
      0.25,
      Math.min(1.25, width / (spriteWidth * 5), (190 - groundInset - 8) / (spriteHeight * 1.45)),
    );
    const door = portalGeometry({ width, ground, spriteHeight: spriteHeight * portalScale });
    const scale = Math.min(portalScale, door.x / (spriteWidth * 6 + 130));
    const spacing = spriteWidth * scale + 16;
    const queue = { left: door.x - spacing * 1.65, spacing };
    const waitAt = travelers.map(
      (_, i) => travelerEntry(queue, i, null, door.entryX, travelers.length).x,
    );
    const canvasRect = crew.getBoundingClientRect();
    const buttonRect = startButton.getBoundingClientRect();
    const button = {
      left: ((buttonRect.left - canvasRect.left) * width) / canvasRect.width,
      right: ((buttonRect.right - canvasRect.left) * width) / canvasRect.width,
      top: ((buttonRect.top - canvasRect.top) * height) / canvasRect.height,
    };
    const description = startButton.previousElementSibling.getBoundingClientRect();
    const copyBottom = ((description.bottom - canvasRect.top) * height) / canvasRect.height;
    const entrance = jungleEntrance({
      button,
      ground,
      scale,
      spriteWidths: spriteWidths.map((w) => w * scale),
      waitAt,
    });
    layout = { width, height, ground, copyBottom, door, scale, queue, entrance };
  }

  function drawCrew(elapsed, entryElapsed, reduced) {
    const { width, height, ground, copyBottom, door, scale, queue, entrance } = layout;
    crewCtx.clearRect(0, 0, width, height);
    crewCtx.imageSmoothingEnabled = false;
    drawEnergyPortal(crewCtx, { door, time: elapsed / 1000, activity: 1, reduced });

    for (const [i, player] of travelers.entries()) {
      const entry = travelerEntry(queue, i, entryElapsed, door.entryX, travelers.length);
      if (entry.entered) continue;
      const pose =
        reduced || entryElapsed !== null
          ? { x: entry.x, y: ground, grounded: true, distance: 0 }
          : entrance.travelers[i].sample(elapsed / 1000);
      if (!pose) continue;
      player.grounded = pose.grounded;
      player.vx = entryElapsed !== null || pose.distance > 0 ? 128 : 0;
      // Cycle the walk frames by distance, so the steps stay tied to the translation.
      const walkTime =
        entryElapsed === null ? (pose.distance / (128 * scale)) * 1000 : entryElapsed * 1000;
      player.walkElapsedMs = (walkTime + i * 85) % (2 * WALK_FRAME_INTERVAL_MS);
      crewCtx.save();
      const behindCopy = Math.max(0, Math.min(1, (pose.y - copyBottom) / (spriteHeight * scale)));
      crewCtx.globalAlpha = entryElapsed === null ? 0.55 + 0.45 * behindCopy : entry.opacity;
      if (entryElapsed !== null) {
        // Same energy plane as the homepage. Hide each sprite as it crosses the portal.
        crewCtx.beginPath();
        crewCtx.rect(0, 0, door.entryX, height);
        crewCtx.clip();
      }
      crewCtx.translate(pose.x, pose.y);
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
    const readyAt = started + (layout?.entrance.duration ?? 0) * 1000 + IDLE_MS;
    if (onDepart && departureAt === undefined && (reduced || now >= readyAt)) {
      departureAt = reduced ? requestedAt : Math.max(requestedAt, readyAt);
    }
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
  const resize = new ResizeObserver(() => {
    measureCrew();
    restart();
  });
  resize.observe(crew);
  if (startButton) resize.observe(startButton);
  measureCrew();
  restart();
  return {
    teleport(finish) {
      if (onDepart) return;
      requestedAt = performance.now();
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
