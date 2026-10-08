import { PLAYER_WIDTH, PLAYER_HEIGHT } from '../../entities/player/playerConfig.js';
import { stage01LayoutConfig } from './stage01LayoutConfig.js';

export const stage01Config = {
  width: 1200,
  height: 660,
  enemies: { guardsEnabled: true },
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
  exitAnimation: { duration: 1.25 },
  spawn: {
    x: 30,
    y: stage01LayoutConfig.platforms.floor.y - PLAYER_HEIGHT,
    spacing: PLAYER_WIDTH + 7,
  },
};
