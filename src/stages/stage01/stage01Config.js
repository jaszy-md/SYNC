export const stage01Config = {
  width: 1200,
  height: 660,
  enemies: { guardsEnabled: false },
  interactionHintOffsetY: 30,
  interactionVisuals: {
    robotSize: 86,
    terminalSize: 110,
    spriteHeightRatio: 0.92,
    chargeHintHeight: 40,
  },
  hints: {
    lockedMessage: 'Vind eerst mijn geheugenmodule in de wereld. Dan help ik jullie graag verder.',
    unlockMessage: 'Geheugenmodule verbonden! Spreek me aan als jullie vastlopen.',
  },
  opening: { duration: 1.5 },
  spawn: { x: 30, y: 554, spacing: 35 },
};
