// World pixels (1200 × 660). Keep controls on top of their supporting platform.
export const stage01LayoutConfig = {
  platforms: {
    floor: {
      x: 0,
      y: 600,
      width: 1200,
      height: 60,
    },
    access: {
      x: 210,
      y: 438,
      width: 200,
      height: 20,
    },
    maintenance: {
      x: 675,
      y: 293,
      width: 175,
      height: 20,
    },
    bridge: {
      x: 465,
      y: 358,
      width: 140,
      height: 18,
    },
    key: {
      x: 24,
      y: 310,
      width: 140,
      height: 20,
    },
    portal: {
      x: 1120,
      y: 430,
      width: 80,
      height: 18,
    },
    portalStep: {
      x: 935,
      y: 535,
      width: 52,
      height: 8,
    },
    portalApproach: {
      x: 1005,
      y: 500,
      width: 34,
      height: 8,
    },
    portalFinalStep: {
      x: 1060,
      y: 465,
      width: 34,
      height: 8,
    },
  },
  gates: {
    a: {
      x: 440,
      y: 438,
      width: 22,
      height: 162,
    },
    b: {
      x: 870,
      y: 338,
      width: 22,
      height: 262,
    },
  },
  objects: {
    plate: {
      x: 336,
      y: 430,
    },
    winch: {
      x: 770,
      y: 251,
    },
    key: {
      x: 126,
      y: 282,
    },
    door: {
      x: 1130,
      y: 340,
      width: 64,
      height: 90,
    },
    exit: {
      x: 1090,
      y: 320,
      width: 110,
      height: 110,
    },
    chargeIndicator: {
      x: 992,
      y: 390,
      radius: 29,
    },
    hintDevice: {
      x: 70,
      y: 286,
      width: 20,
      height: 24,
    },
    cell: {
      x: 120,
      y: 572,
      width: 24,
      height: 26,
    },
    sockets: {
      a: {
        x: 550,
        y: 561,
        width: 44,
        height: 39,
        label: 'I',
      },
      b: {
        x: 970,
        y: 561,
        width: 44,
        height: 39,
        label: 'II',
      },
    },
    chargePads: [
      {
        x: 1025,
        y: 592,
        width: 45,
      },
      {
        x: 1090,
        y: 592,
        width: 45,
      },
    ],
    clue: {
      x: 238,
      y: 386,
      width: 78,
      height: 44,
    },
    symbolBlocks: {
      startX: 205,
      y: 566,
      spacing: 65,
      width: 44,
      height: 34,
    },
    symbolProgress: {
      x: 280,
      y: 511,
    },
    guard: {
      x: 110,
      y: 256,
      width: 34,
      height: 54,
      patrolMin: 0,
      patrolMax: 1166,
    },
  },
  connections: {
    access: [
      [368, 438],
      [368, 493],
      [451, 493],
    ],
    bridge: [
      [572, 568],
      [572, 390],
      [535, 390],
      [535, 358],
    ],
    maintenance: [
      [788, 293],
      [788, 330],
      [881, 330],
      [881, 343],
    ],
    portal: [
      [992, 580],
      [1182, 580],
      [1182, 449],
      [1110, 449],
      [1110, 385],
      [1130, 385],
    ],
    charge: [
      [992, 561],
      [992, 419],
    ],
  },
};
