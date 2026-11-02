import test from 'node:test';
import assert from 'node:assert/strict';
import { HomepageMusic } from '../src/core/audio.js';
import { musicEnvironment as environment } from '../test-support/musicEnvironment.js';

test('homepage loops at 35%, stops/reset on exit and reuses one element on return', () => {
  const env = environment(),
    music = new HomepageMusic(env);
  music.setActive(true);
  const audio = env.instances[0];
  assert.equal(audio.src, '/assets/sounds/Escape_the_Chain.mp3');
  assert.equal(audio.loop, true);
  assert.equal(audio.volume, 0.35);
  assert.equal(audio.paused, false);
  music.setActive(true);
  music.play();
  assert.equal(audio.calls, 1);
  audio.currentTime = 42;
  music.setActive(false);
  assert.equal(audio.paused, true);
  assert.equal(audio.currentTime, 0);
  music.play();
  assert.equal(audio.calls, 1);
  music.setActive(true);
  assert.equal(audio.calls, 2);
  assert.equal(audio.currentTime, 0);
  assert.equal(env.instances.length, 1);
});

test('blocked autoplay retries on interaction only while home is active; listeners install once', async () => {
  const env = environment(),
    music = new HomepageMusic(env);
  music.initialize(env);
  music.initialize(env);
  env.blocked = true;
  music.setActive(true);
  await Promise.resolve();
  const audio = env.instances[0];
  assert.equal(audio.paused, true);
  env.blocked = false;
  env.gesture();
  assert.equal(audio.paused, false);
  music.setActive(false);
  const attempts = audio.calls;
  env.gesture('keydown');
  assert.equal(audio.calls, attempts);
});

test('mute persists across home visits and page reloads within the session', () => {
  const env = environment(),
    music = new HomepageMusic(env);
  music.setActive(true);
  music.toggleMuted();
  assert.equal(music.muted, true);
  assert.equal(env.instances[0].muted, true);
  assert.equal(env.instances[0].paused, true);
  music.setActive(false);
  music.setActive(true);
  assert.equal(env.instances[0].muted, true);
  assert.equal(env.instances[0].paused, true);
  const reloaded = new HomepageMusic(env);
  reloaded.setActive(true);
  assert.equal(env.instances.length, 1, 'muted return never starts a new element');
  assert.equal(reloaded.audio, null);
  reloaded.toggleMuted();
  assert.equal(env.instances[1].muted, false);
  assert.equal(env.storage.get('sync.homeMusicMuted'), 'false');
});

test('unavailable media and denied session storage do not interrupt navigation', () => {
  const env = {
    get sessionStorage() {
      throw Error('denied');
    },
  };
  const music = new HomepageMusic(env);
  assert.doesNotThrow(() => {
    music.setActive(true);
    music.toggleMuted();
    music.setActive(false);
  });
  assert.equal(music.muted, true);
});

test('mute pauses immediately, preserves position and repeated unmute resumes the same voice', async () => {
  const env = environment(),
    music = new HomepageMusic(env);
  music.initialize(env);
  music.setActive(true);
  await Promise.resolve();
  const audio = env.instances[0];
  audio.currentTime = 23;
  for (let i = 0; i < 10; i++) {
    music.toggleMuted();
    assert.equal(audio.paused, true);
    assert.equal(audio.muted, true);
    assert.equal(audio.currentTime, 23);
    const calls = audio.calls;
    env.gesture();
    music.play();
    assert.equal(audio.calls, calls, 'gestures cannot restart muted music');
    music.toggleMuted();
    await Promise.resolve();
    assert.equal(audio.paused, false);
    assert.equal(audio.muted, false);
    assert.equal(audio.volume, 0.35);
    assert.equal(audio.currentTime, 23);
    assert.equal(env.instances.filter((a) => !a.paused).length, 1);
  }
  assert.equal(env.instances.length, 1);
});

test('late asynchronous play cannot escape mute, navigation or disposal', async () => {
  for (const action of ['mute', 'leave', 'dispose']) {
    const env = environment(),
      music = new HomepageMusic(env);
    env.deferred = true;
    music.initialize(env);
    music.setActive(true);
    music.play();
    assert.equal(env.requests.length, 1, 'only one pending play request');
    const audio = env.instances[0];
    audio.currentTime = 9;
    if (action === 'mute') music.toggleMuted();
    else if (action === 'leave') music.setActive(false);
    else music.dispose();
    assert.equal(audio.paused, true);
    env.requests.shift()();
    await Promise.resolve();
    assert.equal(audio.paused, true, action);
    assert.equal(audio.muted, true, action);
    assert.equal(audio.currentTime, action === 'mute' ? 9 : 0);
    assert.equal(env.instances.filter((a) => !a.paused).length, 0);
  }
});

test('rapid home transitions reuse one element and remove inactive gesture listeners', async () => {
  const env = environment(),
    music = new HomepageMusic(env);
  env.deferred = true;
  music.initialize(env);
  for (let i = 0; i < 8; i++) {
    music.setActive(true);
    music.setActive(false);
    assert.ok(
      ['pointerdown', 'keydown', 'touchend', 'click'].every(
        (name) => !env.listeners.get(name)?.size,
      ),
    );
    env.gesture();
  }
  for (const complete of env.requests.splice(0)) complete();
  await Promise.resolve();
  assert.equal(env.instances.length, 1);
  assert.equal(env.instances[0].paused, true);
  assert.equal(env.instances[0].currentTime, 0);
  env.deferred = false;
  music.setActive(true);
  await Promise.resolve();
  assert.equal(env.instances[0].paused, false);
  assert.ok([...env.listeners.values()].every((handlers) => handlers.size === 1));
  music.dispose();
  assert.equal(env.instances[0].paused, true);
  assert.equal(env.instances[0].removed, true);
  assert.ok([...env.listeners.values()].every((handlers) => handlers.size === 0));
});

test('Chrome navigation or mute cannot leave an unfocused VS Code homepage playing', async () => {
  const chrome = environment(),
    preview = environment();
  const browserMusic = new HomepageMusic(chrome),
    previewMusic = new HomepageMusic(preview);
  browserMusic.initialize(chrome);
  previewMusic.initialize(preview);
  preview.setFocus(false);
  browserMusic.setActive(true);
  previewMusic.setActive(true);
  await Promise.resolve();
  assert.equal(browserMusic.playing, true);
  assert.equal(preview.instances.length, 0, 'background preview does not create a playing source');
  browserMusic.toggleMuted();
  assert.equal(chrome.instances[0].paused, true);
  assert.equal(previewMusic.playing, false);
  browserMusic.toggleMuted();
  await Promise.resolve();
  browserMusic.setActive(false); // character selection in Chrome
  preview.gesture();
  previewMusic.play();
  assert.equal(chrome.instances[0].paused, true);
  assert.equal(chrome.instances[0].currentTime, 0);
  assert.equal(previewMusic.playing, false, 'preview still on Home cannot continue in background');
  chrome.setFocus(false);
  preview.setFocus(true);
  await Promise.resolve();
  assert.equal(previewMusic.playing, true);
  preview.instances[0].currentTime = 17;
  preview.setFocus(false);
  chrome.setFocus(true);
  assert.equal(preview.instances[0].paused, true);
  assert.equal(preview.instances[0].muted, true);
  assert.equal(preview.instances[0].currentTime, 17, 'background pause preserves position');
  assert.equal(browserMusic.playing, false, 'Chrome is still on character selection');
  assert.equal([...chrome.instances, ...preview.instances].filter((a) => !a.paused).length, 0);
  browserMusic.dispose();
  previewMusic.dispose();
});

test('hidden tabs and late play requests stay silent; focus preserves user mute and stage gating', async () => {
  const env = environment(),
    music = new HomepageMusic(env);
  env.deferred = true;
  music.initialize(env);
  music.setActive(true);
  env.setFocus(false);
  env.requests.shift()();
  await Promise.resolve();
  assert.equal(env.instances[0].paused, true);
  env.deferred = false;
  env.setFocus(true);
  assert.equal(env.instances[0].paused, false);
  env.setHidden(true);
  assert.equal(env.instances[0].paused, true);
  music.play();
  assert.equal(env.instances[0].paused, true);
  env.setHidden(false);
  assert.equal(env.instances[0].paused, false);
  music.toggleMuted();
  env.setFocus(false);
  env.setFocus(true);
  assert.equal(env.instances[0].paused, true);
  music.toggleMuted();
  music.setActive(false);
  env.setFocus(false);
  env.setFocus(true);
  assert.equal(env.instances[0].paused, true);
  assert.equal(env.instances[0].currentTime, 0);
  music.dispose();
  assert.ok([...env.listeners.values()].every((handlers) => handlers.size === 0));
});
