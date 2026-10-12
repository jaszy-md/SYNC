import { CHARACTERS } from '../entities/player/characters.js';
import { getCharacterImage } from '../entities/player/characterAssets.js';
import { ENTRY, entryArrival } from './portalEffect.js';

export const TRAVELERS = [...new Map(CHARACTERS.map((c) => [c.id, c])).values()];
const noise = (n) => {
  const v = Math.sin(n * 127.1 + 71.7) * 43758.5453;
  return v - Math.floor(v);
};

export function travelerPose(time, index, cycle = 0, reduced = false, approach = 0) {
  // Idle source portraits face the camera. Freeze a right-facing side pose
  // instead when motion is disabled, keeping the journey's facing consistent.
  if (reduced) return { pose: 'walkRight', lift: 0 };
  const slot = Math.floor(time / 3.2);
  // Randomize each round's offset, then visit every unique traveler once. This
  // avoids both synchronized jumps and unlucky characters that never jump.
  const offset = Math.floor(
    noise(Math.floor(slot / TRAVELERS.length) + cycle * 113) * TRAVELERS.length,
  );
  const owner = (slot * 3 + offset) % TRAVELERS.length;
  const start = 0.8 + noise(slot + cycle * 19 + 7) * 0.4;
  const progress = ((time % 3.2) - start) / 0.86;
  const jumping = owner === index && progress > 0 && progress < 1 && approach === 0;
  return {
    pose: jumping
      ? 'jump'
      : Math.floor(time * (4.7 + index * 0.11) + index * 0.41) % 2
        ? 'walkRight'
        : 'walkLeft',
    lift: jumping ? 4 * progress * (1 - progress) : 0,
  };
}

export function travelerLayout(width, height, menuBottom = 0, menuRight = 0) {
  const ground = height * 0.87;
  const besideMenu = width >= 700 && width - menuRight > 160;
  const left = besideMenu ? Math.max(width * 0.55, menuRight + 35) : width * 0.08;
  const right = width * 0.88;
  const spacing = (right - left) / (TRAVELERS.length - 1);
  // Reserve both sprite height and the maximum leap above the shared ground.
  const available = besideMenu ? height * 0.22 : Math.max(12, ground - menuBottom - 12);
  const spriteHeight = Math.max(8, Math.min(92, height * 0.15, spacing * 1.35, available / 1.45));
  return { left, spacing, spriteHeight, ground, width, leap: spriteHeight * 0.38 };
}

// Jump sources were visually verified for every character: they face right.
// Both walk poses face left; idle is front-facing and can remain unmirrored.
export const travelerMirror = (pose) => pose === 'walkLeft' || pose === 'walkRight';

export function travelerEntry(layout, index, elapsed, entryX) {
  const start =
    layout.left + index * layout.spacing + ((index % 3) - 1) * Math.min(4, layout.spacing * 0.08);
  if (elapsed === null) return { x: start, opacity: 1, entered: false };
  const arrival = entryArrival(index, TRAVELERS.length);
  const absorption = Math.max(0, Math.min(1, (elapsed - arrival) / ENTRY.absorption));
  return {
    x: start + ((entryX - start) * elapsed) / arrival,
    opacity: 1 - absorption,
    entered: absorption >= 1,
  };
}

export function drawTravelers(ctx, layout, time, cycle, reduced, portal, onLoad) {
  TRAVELERS.forEach((character, i) => {
    const entry = travelerEntry(layout, i, portal.exitElapsed, portal.door.entryX);
    if (entry.entered) return;
    const { pose, lift } = travelerPose(
      time,
      i,
      cycle,
      reduced,
      portal.exitElapsed === null ? 0 : 1,
    );
    let renderedPose = pose;
    let image = getCharacterImage(character.sprites[pose], onLoad);
    if (!image) {
      renderedPose = 'walkRight';
      image = getCharacterImage(character.sprites.walkRight, onLoad);
    }
    if (!image) return;
    const x = entry.x;
    const foot = layout.ground - 1 - (i % 3);
    ctx.save();
    ctx.globalAlpha = entry.opacity;
    // The portal is already drawn behind us. Clip only at its energy plane,
    // never against the opaque frame: heads enter first, feet/body follow.
    if (portal.exitElapsed !== null) {
      ctx.beginPath();
      ctx.rect(0, 0, portal.door.entryX, layout.ground + 10);
      ctx.clip();
    }
    ctx.fillStyle = '#11293450';
    ctx.beginPath();
    ctx.ellipse(
      x,
      layout.ground + 3,
      layout.spriteHeight * 0.2 * (1 - lift * 0.3),
      3,
      0,
      0,
      Math.PI * 2,
    );
    ctx.fill();
    // A fixed source-pixel scale across poses preserves proportions when jumping.
    const sourceScale = layout.spriteHeight / 1300;
    const w = image.naturalWidth * sourceScale,
      h = image.naturalHeight * sourceScale;
    const mirror = travelerMirror(renderedPose);
    ctx.translate(x + (mirror ? w / 2 : -w / 2), foot - lift * layout.leap);
    if (mirror) ctx.scale(-1, 1);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(image, 0, -h, w, h);
    ctx.restore();
  });
}
