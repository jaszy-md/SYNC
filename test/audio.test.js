import test from 'node:test';
import assert from 'node:assert/strict';
import { GameplayAudio, gameplayAudio } from '../src/core/audio.js';
import { Stage1 } from '../src/stages/stage01/stage01.js';
import { CHARACTERS } from '../src/entities/player/characters.js';
import { idle } from '../test-support/stage.js';

function environment() {
  const paths = [],
    voices = [];
  class AudioContext {
    state = 'suspended';
    destination = {};
    async resume() {
      this.state = 'running';
    }
    async decodeAudioData(data) {
      return { data };
    }
    createBufferSource() {
      const voice = {
        connect() {},
        disconnect() {},
        start() {
          voices.push(this);
        },
      };
      return voice;
    }
  }
  return {
    paths,
    voices,
    AudioContext,
    async fetch(path) {
      paths.push(path);
      return {
        ok: true,
        async arrayBuffer() {
          return new ArrayBuffer(8);
        },
      };
    },
  };
}

test('preloads once, unlocks on gesture, overlaps voices and releases ended sources', async () => {
  const env = environment();
  const audio = new GameplayAudio(env);
  const listeners = new Map();
  audio.initialize({ addEventListener: (name, callback) => listeners.set(name, callback) });
  await audio.preload();
  audio.play('jump');
  assert.equal(env.voices.length, 0);
  listeners.get('pointerdown')();
  audio.play('jump');
  audio.play('jump');
  audio.play('shoot');
  audio.play('shoot');
  assert.equal(env.voices.length, 4);
  assert.equal(new Set(env.voices).size, 4);
  assert.equal(env.voices[0].buffer, env.voices[1].buffer);
  let disconnected = false;
  env.voices[0].disconnect = () => {
    disconnected = true;
  };
  env.voices[0].onended();
  assert.ok(disconnected);
  await audio.preload();
  assert.deepEqual(env.paths, ['/assets/sounds/jump.flac', '/assets/sounds/laser.wav']);
});

test('unavailable audio, failed fetches, unsupported codecs and rejected unlock are harmless', async () => {
  for (const failure of ['unavailable', 'fetch', 'decode', 'resume']) {
    const env = environment();
    if (failure === 'unavailable') env.AudioContext = undefined;
    if (failure === 'fetch')
      env.fetch = async () => {
        throw Error('missing');
      };
    if (failure === 'decode')
      env.AudioContext.prototype.decodeAudioData = async () => {
        throw Error('codec');
      };
    if (failure === 'resume')
      env.AudioContext.prototype.resume = async () => {
        throw Error('blocked');
      };
    const audio = new GameplayAudio(env);
    await audio.preload();
    audio.unlock();
    audio.play('jump');
    audio.play('shoot');
    await Promise.resolve();
    assert.equal(env.voices.length, 0);
  }
});

test('Stage 1 emits only actual jumps and projectiles, for every character and after restart', (t) => {
  const sounds = [];
  t.mock.method(gameplayAudio, 'play', (name) => sounds.push(name));
  for (const character of CHARACTERS) {
    for (let run = 0; run < 2; run++) {
      const stage = new Stage1([character, character], () => 0.6);
      for (const player of stage.players) {
        Object.assign(player, { x: 230, y: 400, grounded: true });
        player.update({ ...idle(), jump: true }, 1 / 120, [], 2000);
      }
      assert.deepEqual(sounds.splice(0), ['jump', 'jump']);
      for (const player of stage.players) {
        player.update({ ...idle(), jump: true }, 1 / 120, [], 2000);
        player.grounded = true;
        player.update({ ...idle(), jump: true, crouch: true }, 1 / 120, [], 2000);
      }
      assert.deepEqual(sounds, []);
      const player = stage.players[1];
      Object.defineProperty(stage, 'solids', { value: [], writable: true });
      stage.blaster.owner = player.id;
      stage.blaster.shoot(stage.players[0]);
      assert.deepEqual(sounds, []);
      stage.blaster.shoot(player);
      stage.blaster.shoot(player); // cooldown rejects the second request
      stage.blaster.cooldown = 0;
      stage.blaster.shoot(player);
      assert.deepEqual(sounds.splice(0), ['shoot', 'shoot']);
      stage.blaster.cooldown = 0;
      stage.solids = [{ x: 0, y: 0, w: 2000, h: 2000 }];
      stage.blaster.shoot(player); // blocked barrel creates no projectile
      assert.deepEqual(sounds, []);
    }
  }
});
