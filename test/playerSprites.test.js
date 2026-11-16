import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getCharacterImage,
  preloadCharacterSprites,
} from '../src/entities/player/characterAssets.js';
import { drawPlayer } from '../src/entities/player/playerRenderer.js';
import {
  CROUCH_TRANSITION_MS,
  PLAYER_WIDTH,
  PLAYER_HEIGHT,
  PLAYER_CROUCH_HEIGHT,
  PLAYER_SPRITE_SCALE,
  PLAYER_SPRITE_REFERENCE_HEIGHT,
} from '../src/entities/player/playerConfig.js';
import { CHARACTERS } from '../src/entities/player/characters.js';
import { makeStage, idle } from '../test-support/stage.js';
import { Player } from '../src/entities/player/createPlayer.js';
import { shouldMirrorSprite } from '../src/entities/player/spriteOrientation.js';
import { preloadTravelerSprites, TRAVELERS } from '../src/ui/menuTravelers.js';

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
    [{ grounded: false, facing: 1 }, 'jump.png'],
    [
      {
        crouched: true,
        facing: 1,
        h: PLAYER_CROUCH_HEIGHT,
        y: 100 + PLAYER_HEIGHT - PLAYER_CROUCH_HEIGHT,
      },
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
      'pose retains its correct source orientation',
    );
  }
  calls = [];
  drawPlayer({ ...player, facing: 1, vx: 240 }, ctx);
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

test('both players retain facing on vertical jumps and turn immediately in the air for every character', () => {
  for (const character of CHARACTERS) {
    for (const id of [0, 1]) {
      const stage = makeStage();
      const player = new Player(id, character, { x: 300, y: 50 }, stage.players[id].abilities);
      for (const move of [1, 0, -1, 0, 1]) {
        const before = player.facing;
        player.update({ ...idle(), move }, 1 / 120, [], 1200);
        assert.equal(player.facing, move ? Math.sign(move) : before);
        assert.equal(player.grounded, false);
        assert.equal(shouldMirrorSprite('jump', player.facing), player.facing < 0);
        assert.equal(shouldMirrorSprite('crouch', player.facing), player.facing < 0);
        for (const pose of ['walkLeft', 'walkRight'])
          assert.equal(shouldMirrorSprite(pose, player.facing), player.facing > 0);
      }
    }
  }
});

test('every hanging sprite rotates and mirrors around the moving vine grip', async (t) => {
  const previous = globalThis.Image;
  t.after(() => {
    globalThis.Image = previous;
  });
  globalThis.Image = class {
    naturalWidth = 500;
    naturalHeight = 900;
    set src(path) {
      this.path = path;
      this.onload();
    }
  };
  for (const character of CHARACTERS) {
    const fixture = { ...character, sprites: { jump: `/vine-pose${character.sprites.jump}` } };
    await preloadCharacterSprites([fixture]);
    const player = new Player(0, fixture, { x: 100, y: 100 }, { jumpSpeed: 500 });
    for (const facing of [-1, 1]) {
      player.facing = facing;
      for (const angle of [-0.42, 0.21]) {
        player.hanging = { angle, grip: { x: 382, y: 429 } };
        const calls = [];
        const ctx = new Proxy(
          {},
          {
            get:
              (_, name) =>
              (...args) =>
                calls.push([name, ...args]),
          },
        );
        drawPlayer(player, ctx);
        assert.deepEqual(calls.slice(0, 4), [
          ['save'],
          ['translate', 382, 429],
          ['rotate', facing * 0.35 - angle * 0.36],
          ['scale', facing, 1],
        ]);
        const [, image, x, y, w, h] = calls[4];
        assert.equal(image.path, fixture.sprites.jump);
        assert.ok(-x / w >= 0.07 && -x / w <= 0.1);
        assert.ok(-y / h >= 0.3 && -y / h <= 0.42);
        assert.deepEqual(calls.at(-1), ['restore']);
      }
    }
  }
});

test('crouch changes the hitbox immediately and blends a moving pose while keeping foot height', () => {
  const floor = { x: 0, y: 100, w: 500, h: 40 };
  const ceiling = { x: 0, y: 48, w: 100, h: 11 };
  for (const [id, character] of CHARACTERS.entries()) {
    const player = new Player(
      id % 2,
      character,
      { x: 110, y: floor.y - PLAYER_HEIGHT },
      { jumpSpeed: 500 },
    );
    player.grounded = true;
    player.update({ ...idle(), move: -1 }, 1 / 120, [floor, ceiling]);
    player.update({ ...idle(), crouch: true }, 1 / 120, [floor, ceiling]);
    assert.equal(player.facing, -1);
    assert.ok(shouldMirrorSprite('crouch', player.facing));
    assert.equal(player.crouchBlendMs, CROUCH_TRANSITION_MS);
    assert.equal(player.h, PLAYER_CROUCH_HEIGHT);
    assert.equal(player.y + player.h, floor.y);
    for (let i = 0; i < 36; i++)
      player.update({ ...idle(), crouch: true, move: -1 }, 1 / 120, [floor, ceiling]);
    assert.equal(player.crouchBlendMs, 0);
    assert.ok(player.x < ceiling.w);
    player.update(idle(), 1 / 120, [floor, ceiling]);
    assert.ok(player.crouched, 'standing expansion waits for overhead clearance');
    player.update({ ...idle(), crouch: true, move: 1 }, 1 / 120, [floor, ceiling]);
    assert.equal(player.facing, 1);
    assert.equal(shouldMirrorSprite('crouch', player.facing), false);
    for (let i = 0; i < 35; i++) player.update({ ...idle(), move: 1 }, 1 / 120, [floor, ceiling]);
    assert.equal(player.crouched, false);
    assert.equal(player.h, PLAYER_HEIGHT);
    assert.equal(player.y + player.h, floor.y);
    player.update(idle(), 1 / 120, [floor]);
    player.update({ ...idle(), crouch: true }, 1 / 120, [floor]);
    assert.equal(player.crouchBlendMs, 0, 'stationary crouch does not animate a walk');
  }
});

test('homepage readiness waits for every traveler pose and reuses decoded images on return', async (t) => {
  const previous = globalThis.Image;
  t.after(() => {
    globalThis.Image = previous;
  });
  const created = [];
  globalThis.Image = class {
    naturalWidth = 40;
    naturalHeight = 100;
    constructor() {
      created.push(this);
    }
    set src(path) {
      this.path = path;
    }
  };
  let ready = false;
  const loading = preloadTravelerSprites().then(() => {
    ready = true;
  });
  assert.equal(created.length, TRAVELERS.length * 4);
  created[0].onerror();
  for (const image of created.slice(1, -1)) await image.onload();
  assert.equal(ready, false);
  await created.at(-1).onload();
  await loading;
  assert.equal(ready, true, 'a failed pose does not block the homepage');
  await preloadTravelerSprites();
  assert.equal(created.length, TRAVELERS.length * 4);
  const calls = [];
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
  for (const character of TRAVELERS) {
    for (const id of [0, 1]) {
      for (const facing of [-1, 1]) {
        for (const vy of [-200, 200]) {
          calls.length = 0;
          const player = {
            id,
            character,
            x: 50,
            y: 100,
            w: PLAYER_WIDTH,
            h: PLAYER_HEIGHT,
            grounded: false,
            facing,
            vx: 0,
            vy,
          };
          const before = { ...player };
          drawPlayer(player, ctx);
          assert.ok(calls.find(([key]) => key === 'drawImage')[1].path.endsWith('/jump.png'));
          assert.equal(
            calls.some(([key]) => key === 'scale'),
            facing < 0,
          );
          assert.deepEqual(
            player,
            before,
            'rendering cannot change positions, velocity or hitboxes',
          );
        }
      }
    }
  }
});

test('stalled sprite requests settle and ignore late completion instead of popping in', async (t) => {
  const previous = {
    Image: globalThis.Image,
    setTimeout: globalThis.setTimeout,
    clearTimeout: globalThis.clearTimeout,
  };
  t.after(() => Object.assign(globalThis, previous));
  let expire, image;
  globalThis.setTimeout = (callback) => {
    expire = callback;
    return 1;
  };
  globalThis.clearTimeout = () => {};
  globalThis.Image = class {
    naturalWidth = 40;
    naturalHeight = 100;
    constructor() {
      image = this;
    }
    set src(_) {}
  };
  const character = { sprites: { jump: '/stalled-test.png' } };
  const ready = preloadCharacterSprites([character]);
  expire();
  await ready;
  await image.onload();
  assert.equal(getCharacterImage(character.sprites.jump), null);
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
