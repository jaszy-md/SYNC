import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { CHARACTERS } from '../src/entities/player/characters.js';
import { Player } from '../src/entities/player/createPlayer.js';
import { drawPlayer } from '../src/entities/player/playerRenderer.js';
import { getCharacterImage } from '../src/entities/player/characterAssets.js';
import { avatar, updateCharacterAvatars } from '../src/ui/components/avatar.js';

function context() {
  const calls = [];
  const ctx = new Proxy(
    {},
    {
      get: (target, name) =>
        name in target ? target[name] : (...args) => calls.push([name, ...args]),
      set: (target, name, value) => {
        target[name] = value;
        calls.push([name, value]);
        return true;
      },
    },
  );
  return { ctx, calls };
}

test('fallback Canvas output matches the original renderer for every character and pose', () => {
  const expected = JSON.parse(
    readFileSync(new URL('./fixtures/player-fallback.json', import.meta.url)),
  );
  const actual = [];
  for (const character of CHARACTERS) {
    for (const h of [46, 26]) {
      const player = new Player(0, character, { x: 70, y: 554 }, { jumpSpeed: 760 });
      player.h = h;
      const { ctx, calls } = context();
      drawPlayer(player, ctx);
      actual.push(createHash('sha256').update(JSON.stringify(calls)).digest('hex'));
    }
  }
  assert.deepEqual(actual, expected);
});

test('shared cache loads each pose once and updates avatars only after successful loading', (t) => {
  const requests = [];
  class FakeImage {
    constructor() {
      requests.push(this);
      this.naturalWidth = 0;
    }
    load() {
      this.naturalWidth = 100;
      this.onload();
    }
    cloneNode() {
      return { src: this.src };
    }
  }
  const original = globalThis.Image;
  globalThis.Image = FakeImage;
  t.after(() => {
    if (original === undefined) delete globalThis.Image;
    else globalThis.Image = original;
  });
  const player = new Player(0, CHARACTERS[0], { x: 70, y: 554 }, { jumpSpeed: 760 });
  const render = () => {
    const { ctx, calls } = context();
    drawPlayer(player, ctx);
    return calls;
  };
  render();
  assert.equal(requests.at(-1).src, CHARACTERS[0].sprites.jump);
  requests.at(-1).onerror();
  const failedFallback = render();
  for (let i = 0; i < 120; i++) assert.deepEqual(render(), failedFallback);
  assert.equal(requests.length, 1);
  player.grounded = true;
  render();
  const idle = requests.at(-1);
  assert.equal(idle.src, CHARACTERS[0].sprites.idle);
  assert.equal(
    render().some(([name]) => name === 'drawImage'),
    false,
  );
  idle.load();
  assert.deepEqual(render()[0], ['drawImage', idle, 70, 554, 28, 46]);
  player.vx = 240;
  render();
  assert.equal(requests.at(-1).src, CHARACTERS[0].sprites.walk);
  player.crouched = true;
  render();
  assert.equal(requests.at(-1).src, CHARACTERS[0].sprites.crouch);
  player.grounded = false;
  assert.deepEqual(render(), failedFallback);
  assert.equal(requests.length, 4);
  assert.equal(player.w, 28);
  assert.equal(player.h, 46);

  const elements = CHARACTERS.map((character) => ({
    dataset: { character: character.id },
    child: '<i></i>',
    sprite: false,
    replaceChildren(child) {
      this.child = child;
    },
    classList: { add() {} },
  }));
  elements.forEach((element) => {
    element.classList.add = () => {
      element.sprite = true;
    };
  });
  const root = { querySelectorAll: () => elements.filter((e) => !e.sprite) };
  const refresh = () => updateCharacterAvatars(root, refresh);
  refresh();
  const selects = requests.slice(4);
  assert.equal(selects.length, 4);
  refresh();
  assert.equal(requests.length, 8);
  assert.equal(elements[0].child, '<i></i>');
  selects[0].load();
  assert.equal(elements[0].child.src, CHARACTERS[0].sprites.select);
  assert.equal(elements[0].sprite, true);
  selects.slice(1).forEach((image) => image.onerror());
  for (let i = 0; i < 120; i++) refresh();
  assert.equal(requests.length, 8);
  assert.ok(elements.slice(1).every((e) => e.child === '<i></i>' && !e.sprite));
  assert.equal(getCharacterImage(CHARACTERS[0].sprites.jump), null);
  assert.equal(getCharacterImage(CHARACTERS[0].sprites.idle), idle);
});

test('UI avatars retain the original fallback shapes and colors', () => {
  for (const character of CHARACTERS) {
    assert.equal(
      avatar(character).replace(` data-character="${character.id}"`, ''),
      `<span class="avatar ${character.fallback.shape}" style="--character:${character.fallback.color}" aria-hidden="true"><i></i></span>`,
    );
  }
});
