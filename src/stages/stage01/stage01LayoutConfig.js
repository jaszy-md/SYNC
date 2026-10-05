// World pixels (1200 × 660). Keep controls on top of their supporting platform.
export const stage01LayoutConfig = {
  platforms: {
    floor: { x: 0, y: 600, width: 1200, height: 60 },
    access: { x: 210, y: 438, width: 200, height: 20 },
    maintenance: { x: 645, y: 293, width: 175, height: 20 },
    bridge: { x: 465, y: 358, width: 140, height: 18 },
    key: { x: 24, y: 288, width: 165, height: 20 },
    returnSteps: [
      { x: 915, y: 493, width: 70, height: 18 },
      { x: 840, y: 398, width: 72, height: 18 },
    ],
  },
  gates: {
    a: { x: 440, y: 438, width: 22, height: 162 },
    b: { x: 870, y: 338, width: 22, height: 262 },
  },
  objects: {
    plate: { x: 280, y: 430 },
    winch: { x: 740, y: 251 },
    key: { x: 146, y: 252 },
    door: { x: 1140, y: 510, width: 52, height: 90 },
    exit: { x: 1100, y: 490, width: 100, height: 110 },
    hintDevice: { x: 70, y: 264, width: 20, height: 24 },
    cell: { x: 185, y: 572, width: 24, height: 26 },
    sockets: {
      a: { x: 550, y: 561, width: 44, height: 39, label: 'I' },
      b: { x: 970, y: 561, width: 44, height: 39, label: 'II' },
    },
    chargePads: [
      { x: 1025, y: 592, width: 45 },
      { x: 1090, y: 592, width: 45 },
    ],
    clue: { x: 335, y: 386, width: 78, height: 44 },
    symbolBlocks: { startX: 245, y: 566, spacing: 65, width: 44, height: 34 },
    symbolProgress: { x: 320, y: 511 },
    guard: { x: 910, y: 546, width: 34, height: 54, patrolMin: 780, patrolMax: 925 },
  },
};
