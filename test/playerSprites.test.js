import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getCharacterImage,
  preloadCharacterSprites,
} from '../src/entities/player/characterAssets.js';
import { drawPlayer } from '../src/entities/player/playerRenderer.js';
import {
  PLAYER_WIDTH,
  PLAYER_HEIGHT,
  PLAYER_CROUCH_HEIGHT,
  PLAYER_SPRITE_SCALE,
  PLAYER_SPRITE_REFERENCE_HEIGHT,
} from '../src/entities/player/playerConfig.js';
import { CHARACTERS } from '../src/entities/player/characters.js';
import { makeStage, idle } from '../test-support/stage.js';

test('preloading waits for decoding, settles missing files and reuses the cache', async (t) => {
  const created = [];
  const previous = globalThis.Image;
  t.after(() => {
    globalThis.Image = previous;
  });
  globalThis.Image = class {
    naturalWidth = 40;
    naturalHeight = 100;
    constructor() {
      created.push(this);
      this.decoding = new Promise((resolve) => {
        this.finishDecode = resolve;
      });
    }
    decode() {
      return this.decoding;
    }
    set src(path) {
      this.path = path;
    }
  };
  const sprites = Object.fromEntries(
    Object.entries(CHARACTERS[0].sprites).map(([key, path]) => [key, '/preload-test' + path]),
  );
  const character = { sprites };
  let ready = false;
  const loading = preloadCharacterSprites([character, character]).then(() => {
    ready = true;
  });
  assert.equal(created.length, 6, 'select and idle share one image');
  const back = created.find((image) => image.path.endsWith('/back.png'));
  created.forEach((image) => {
    if (image.path.endsWith('/jump.png')) image.onerror();
    else {
      image.onload();
      if (image !== back) image.finishDecode();
    }
  });
  await Promise.resolve();
  assert.equal(ready, false);
  assert.equal(getCharacterImage(sprites.back), null, 'undecoded image is not renderable');
  back.finishDecode();
  await loading;
  assert.equal(getCharacterImage(sprites.back), back);
  assert.equal(getCharacterImage(sprites.jump), null);
  await preloadCharacterSprites([character]);
  assert.equal(created.length, 6, 'state switches and restarts never reload images');
});

test('all poses share one pixel scale, preserve aspect ratio and remain anchored at the feet', async (t) => {
  const previous = globalThis.Image;
  t.after(() => {
    globalThis.Image = previous;
  });
  let count = 0;
  globalThis.Image = class {
    naturalWidth = 40;
    naturalHeight = 100;
    constructor() {
      count++;
    }
    set src(path) {
      this.path = path;
      if (path.endsWith('crouch.png')) this.naturalHeight = 60;
      if (path.endsWith('jump.png')) this.naturalHeight = 80;
      if (path.endsWith('walk-right.png')) this.naturalWidth = 55;
      this.onload();
    }
  };
  const character = {
    ...CHARACTERS[0],
    sprites: Object.fromEntries(
      Object.entries(CHARACTERS[0].sprites).map(([key, path]) => [key, '/render-test' + path]),
    ),
  };
  await preloadCharacterSprites([character]);
  const player = {
    id: 0,
    character,
    x: 50,
    y: 100,
    w: PLAYER_WIDTH,
    h: PLAYER_HEIGHT,
    grounded: true,
    crouched: false,
    vx: 0,
    facing: -1,
    walkElapsedMs: 0,
    interactPoseMs: 0,
  };
  let calls;
  const ctx = new Proxy(
    {},
    {
      get:
        (_, key) =>
        (...args) =>
          calls.push([key, ...args]),
      set: () => true,
    },
  );
  const poses = [
    [{}, 'idle.png'],
    [{ vx: 240 }, 'walk-left.png'],
    [{ vx: 240, walkElapsedMs: 200 }, 'walk-right.png'],
    [{ grounded: false }, 'jump.png'],
    [
      { crouched: true, h: PLAYER_CROUCH_HEIGHT, y: 100 + PLAYER_HEIGHT - PLAYER_CROUCH_HEIGHT },
      'crouch.png',
    ],
    [{ interactPoseMs: 250, grounded: false, crouched: true }, 'back.png'],
  ];
  const scale = (PLAYER_HEIGHT * PLAYER_SPRITE_SCALE) / PLAYER_SPRITE_REFERENCE_HEIGHT;
  for (const [pose, filename] of poses) {
    const state = { ...player, ...pose };
    calls = [];
    drawPlayer(state, ctx);
    const [, image, x, y, w, h] = calls.find(([key]) => key === 'drawImage');
    assert.ok(image.path.endsWith(filename));
    assert.equal(w / image.naturalWidth, scale);
    assert.equal(h / image.naturalHeight, scale);
    assert.ok(Math.abs(y + h - (state.y + state.h)) < 1e-9);
    assert.ok(Math.abs(x + w / 2 - (state.x + state.w / 2)) < 1e-9);
    assert.equal(
      calls.some(([key]) => key === 'fillRect'),
      false,
      'first pose switch never shows a fallback',
    );
    assert.equal(
      calls.some(([key]) => key === 'scale'),
      false,
      'left retains original orientation',
    );
  }
  calls = [];
  drawPlayer({ ...player, facing: 1 }, ctx);
  assert.deepEqual(
    calls.find(([key]) => key === 'scale'),
    ['scale', -1, 1],
  );
  assert.equal(count, 6);
  calls = [];
  assert.doesNotThrow(() =>
    drawPlayer({ ...player, character: { ...character, sprites: {} } }, ctx),
  );
  assert.ok(
    calls.some(([key]) => key === 'fillRect'),
    'genuinely missing sprite uses fallback',
  );
});

test('spawn, standing and crouched collision sizes use central config with stable feet', () => {
  const stage = makeStage();
  for (const player of stage.players) {
    assert.equal(player.w, PLAYER_WIDTH);
    assert.equal(player.h, PLAYER_HEIGHT);
    assert.equal(player.grounded, true, 'spawn uses idle during the portal opening');
    const feet = player.y + player.h;
    player.update({ ...idle(), crouch: true }, 1 / 120, stage.solids);
    assert.equal(player.h, PLAYER_CROUCH_HEIGHT);
    assert.equal(player.y + player.h, feet);
    player.update(idle(), 1 / 120, stage.solids);
    assert.equal(player.h, PLAYER_HEIGHT);
    assert.equal(player.y + player.h, feet);
  }
  stage.reset();
  assert.ok(stage.players.every((player) => player.h === PLAYER_HEIGHT && player.grounded));
});

test('Jaszy and Maikel retain their source height and build ratios at the same scale', async (t) => {
  const previous = globalThis.Image;
  t.after(() => {
    globalThis.Image = previous;
  });
  globalThis.Image = class {
    set src(path) {
      this.naturalWidth = path.includes('jaszy') ? 460 : 488;
      this.naturalHeight = path.includes('jaszy') ? 1064 : 1156;
      this.onload();
    }
  };
  const characters = CHARACTERS.slice(0, 2).map((character) => ({
    ...character,
    sprites: Object.fromEntries(
      Object.entries(character.sprites).map(([key, path]) => [key, '/proportion-test' + path]),
    ),
  }));
  await preloadCharacterSprites(characters);
  const sizes = [];
  const ctx = new Proxy(
    {},
    {
      get:
        (_, key) =>
        (...args) => {
          if (key === 'drawImage') sizes.push({ x: args[1], y: args[2], w: args[3], h: args[4] });
        },
      set: () => true,
    },
  );
  for (const character of characters) {
    drawPlayer(
      {
        id: 0,
        character,
        x: 50,
        y: 100,
        w: PLAYER_WIDTH,
        h: PLAYER_HEIGHT,
        grounded: true,
        crouched: false,
        vx: 0,
        facing: -1,
        walkElapsedMs: 0,
        interactPoseMs: 0,
      },
      ctx,
    );
  }
  const [jaszy, maikel] = sizes;
  assert.ok(jaszy.h < maikel.h);
  assert.ok(Math.abs(jaszy.h / maikel.h - 1064 / 1156) < 1e-9);
  assert.ok(Math.abs(jaszy.w / maikel.w - 460 / 488) < 1e-9);
  assert.equal(
    maikel.h,
    PLAYER_HEIGHT * PLAYER_SPRITE_SCALE,
    'reference character keeps its current overall size',
  );
  for (const size of sizes) {
    assert.ok(Math.abs(size.y + size.h - (100 + PLAYER_HEIGHT)) < 1e-9);
    assert.ok(Math.abs(size.x + size.w / 2 - (50 + PLAYER_WIDTH / 2)) < 1e-9);
  }
});
