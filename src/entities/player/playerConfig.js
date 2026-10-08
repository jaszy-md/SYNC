// Shared standing collision size. Change these to resize all players.
export const PLAYER_WIDTH = 28;
export const PLAYER_HEIGHT = 56;
export const PLAYER_CROUCH_HEIGHT = Math.round(PLAYER_HEIGHT * (26 / 46));

// Uniform visual scale relative to standing height, including crouched poses.
export const PLAYER_SPRITE_SCALE = 1.2;
// Shared source-pixel reference (Maikel's idle height), never normalized per character.
export const PLAYER_SPRITE_REFERENCE_HEIGHT = 1156;
