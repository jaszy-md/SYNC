export const BLASTER_COOLDOWN_MS = 450;
export const BLASTER_DAMAGE = 1;
export const BLASTER_PROJECTILE_SPEED = 350;
export const BLASTER_PROJECTILE_LIFETIME = 4;
export const GUARD_MAX_HEALTH = 5;
export const GUARD_SHUTDOWN_DURATION = 0.6;
export const GUARD_ATTACK_INTERVAL = 1.5; // Previously 1.8 seconds: 20% more shots.
export const GUARD_REACTION_DELAY = 0.6;
export const GUARD_SCAN_PAUSE = 0.8;
export const GUARD_ATTACK_RANGE = 250;
export const GUARD_AIM_LEAD_SECONDS = 0.2;
export const GUARD_PROJECTILE_SPEED = 190;
export const GUARD_WARNING_DURATION = 0.4;
export const GUARD_MOVE_SPEED = 65;
export const MINI_GUARD = {
  scale: 0.6,
  health: 2,
  speed: GUARD_MOVE_SPEED * 1.15,
  attackInterval: 1.8,
};
export const MINI_GUARD_SPAWN_DELAY = 0.5;
export const GEM_FLIGHT_DURATION = 0.7;
export const SPEECH_BUBBLE_DURATION_MS = 3000;
export const SPEECH_BUBBLE_FADE_MS = 200;
export const BLASTER_GUN_SPRITE = '/assets/images/stage01/gun.png';
// Fractions refer to the side sprite and the original left-facing gun image.
export const BLASTER_VISUAL = {
  width: 32,
  handX: 0.23,
  handY: 0.52,
  gripX: 0.84,
  gripY: 0.78,
  muzzleX: 0.06,
  muzzleY: 0.32,
  projectileOffset: 2,
  shootPoseMs: 500,
};
