export const WORLD = { width: 1200, height: 660, trailY: 600 };

// Both players use the existing 500 px/s jump, 1600 px/s² gravity and 240 px/s walk.
// At the fixed simulation step this gives ~76 px of rise and ~146 px of level travel.
export const LAND = {
  entrance: { x: 0, y: WORLD.trailY, w: 320, h: 60 },
  low: { x: 320, y: 561, w: 100, h: 99 },
  lower: { x: 592, y: 531, w: 96, h: 129 },
  nearBank: { x: 688, y: 483, w: 164, h: 177 },
  perch: { x: 749, y: 415, w: 66, h: 11 },
  farBank: { x: 1066, y: 475, w: 134, h: 185 },
};

export const CROSSING = {
  left: LAND.nearBank.x + LAND.nearBank.w,
  right: LAND.farBank.x,
  mechanism: { x: 815, y: LAND.nearBank.y },
  vine: { x: 784, y: 272, length: 112 },
};

const logEdge = LAND.low.x + LAND.low.w;
// The 172 px gap and 30 px higher shore exceed a running jump, including player width.
export const QUICKSAND = { x: logEdge, y: 588, w: LAND.lower.x - logEdge };
export const PARKOUR_VINE = { x: logEdge - 10, y: 255, length: 190, swingPlayerId: 1 };
