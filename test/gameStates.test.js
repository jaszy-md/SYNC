import test from 'node:test';
import assert from 'node:assert/strict';
import { GameState, State } from '../src/core/gameState.js';
import { StageManager } from '../src/core/stageManager.js';
import { CHARACTERS } from '../src/entities/player/characters.js';
import { createUI } from '../src/ui/ui.js';
import { installUiDom } from '../test-support/uiDom.js';
import { HomepageMusic } from '../src/core/audio.js';
import { musicEnvironment } from '../test-support/musicEnvironment.js';
function setup(t, onHint, music = new HomepageMusic(musicEnvironment())) {
  const dom = installUiDom(t),
    manager = new StageManager(),
    selected = [0, 1];
  let ui, stage;
  const state = new GameState(() => ui.render());
  t.after(() => music.dispose());
  ui = createUI({
    homepageMusic: music,
    // Navigation tests use the DOM adapter; the renderer has its own lifecycle tests.
    createBackground: () => ({ setView() {} }),
    state,
    input: { assignments: [null, null], clear() {} },
    selected,
    start: () => {
      stage = manager.load(
        1,
        selected.map((i) => CHARACTERS[i]),
      );
      ui.resetPanel();
      state.set(State.PLAYING);
    },
    resume: () => {
      ui.resetPanel();
      state.set(State.PLAYING);
    },
    getStage: () => stage,
    onHint,
  });
  ui.render();
  return {
    ...dom,
    music,
    state,
    ui,
    selected,
    get stage() {
      return stage;
    },
  };
}
function startGame(app) {
  app.click('start');
  app.click('next');
  app.click('play');
}

test('real UI handlers pause/reset the owned music and hide the button outside exact home', async (t) => {
  const env = musicEnvironment(),
    music = new HomepageMusic(env);
  const app = setup(t, undefined, music);
  const button = app.document.getElementById('home-music');
  const attributes = new Map();
  button.setAttribute = (name, value) => attributes.set(name, value);
  await Promise.resolve();
  const audio = env.instances[0];
  assert.equal(audio.paused, false);
  assert.equal(audio.volume, 0.35);
  assert.equal(button.hidden, false);
  for (let i = 0; i < 4; i++) {
    audio.currentTime = 15;
    app.click('home-music');
    assert.equal(audio.paused, true);
    assert.equal(audio.muted, true);
    assert.equal(attributes.get('data-playing'), 'false');
    assert.equal(attributes.get('aria-pressed'), 'true');
    app.ui.render();
    app.click('home-music');
    await Promise.resolve();
    assert.equal(audio.paused, false);
    assert.equal(audio.muted, false);
    assert.equal(attributes.get('data-playing'), 'true');
  }
  app.click('controls');
  assert.equal(audio.paused, true);
  assert.equal(audio.currentTime, 0);
  assert.equal(button.hidden, true);
  app.ui.closePanel();
  assert.equal(audio.paused, false);
  app.click('start');
  assert.equal(audio.paused, true);
  assert.equal(audio.currentTime, 0);
  assert.equal(button.hidden, true);
  app.click('character-2');
  app.click('next');
  app.click('play');
  app.ui.render();
  music.play();
  assert.equal(audio.paused, true);
  assert.equal(button.hidden, true);
  app.state.set(State.MENU);
  assert.equal(audio.paused, false);
  app.click('home-music');
  app.click('start');
  app.state.set(State.MENU);
  assert.equal(button.hidden, false);
  assert.equal(audio.paused, true, 'muted home return stays paused');
  assert.equal(audio.currentTime, 0);
  assert.equal(env.instances.length, 1);
});

test('menu hint closes the overlay before requesting the module exactly once', (t) => {
  let app;
  app = setup(t, () => app.stage.requestHint());
  startGame(app);
  const original = app.stage.requestHint.bind(app.stage);
  let requests = 0;
  app.stage.requestHint = () => {
    requests++;
    assert.equal(app.state.current, State.PLAYING);
    assert.ok(app.screen.hidden);
    original();
  };
  app.state.set(State.PAUSED);
  app.click('hint');
  assert.equal(requests, 1);
  assert.equal(app.stage.hintDevice.appearedAt, 0);
});

test('home advances through character selection and stage briefing before loading Stage 01', (t) => {
  const app = setup(t);
  assert.equal(app.state.current, State.MENU);
  assert.ok(!app.screen.hidden && app.game.hidden);
  app.click('start');
  assert.equal(app.state.current, State.SETUP);
  assert.equal(app.stage, undefined);
  assert.match(app.screen.innerHTML, /CHOOSE YOUR LOOK/);
  app.click('player-0');
  app.click('character-2');
  app.click('player-1');
  app.click('character-3');
  assert.deepEqual(app.selected, [2, 3]);
  app.click('next');
  assert.equal(app.stage, undefined, 'briefing has not started gameplay');
  assert.match(app.screen.innerHTML, /TEAM UP/);
  assert.match(app.screen.innerHTML, /data-character="max"/);
  assert.match(app.screen.innerHTML, /data-character="lucas"/);
  assert.match(app.screen.innerHTML, /HIGH JUMP/);
  assert.match(app.screen.innerHTML, /SHOOTING/);
  app.click('setup-menu');
  assert.match(app.screen.innerHTML, /Systeem en instellingen/);
  app.click('controls');
  app.click('save-controls');
  assert.match(app.screen.innerHTML, /Systeem en instellingen/);
  app.click('panel-back');
  assert.match(app.screen.innerHTML, /TEAM UP/);
  app.click('setup-menu');
  app.click('controls');
  app.ui.navigate({ back: true });
  assert.match(app.screen.innerHTML, /Systeem en instellingen/);
  app.ui.navigate({ back: true });
  assert.match(app.screen.innerHTML, /TEAM UP/);
  assert.deepEqual(app.selected, [2, 3]);
  assert.equal(app.stage, undefined);
  app.click('back');
  assert.equal(app.state.current, State.SETUP);
  assert.deepEqual(app.selected, [2, 3]);
  assert.match(app.screen.innerHTML, /CHOOSE YOUR LOOK/);
  app.click('next');
  app.click('play');
  assert.equal(app.state.current, State.PLAYING);
  assert.ok(app.screen.hidden && !app.game.hidden);
  assert.deepEqual(
    app.stage.players.map((p) => p.character),
    [CHARACTERS[2], CHARACTERS[3]],
  );
  assert.equal(app.stage.phase, 'SYMBOLS');
  assert.ok(app.document.getElementById('app').classList.contains('facility-session'));
});
test('TEAM UP menu returns home without starting a stage or losing character choices', (t) => {
  const app = setup(t);
  app.click('start');
  app.click('character-4');
  app.click('next');
  app.click('setup-menu');
  app.click('main-menu');
  assert.equal(app.state.current, State.MENU);
  assert.equal(app.stage, undefined);
  assert.equal(app.selected[0], 4);
  assert.ok(app.game.hidden);
});

test('pause controls save/back and resume preserve the stage while main menu returns home', (t) => {
  const app = setup(t);
  startGame(app);
  const stage = app.stage;
  stage.progress.hintUnlocked = true;
  app.state.set(State.PAUSED);
  assert.ok(!app.screen.hidden && !app.game.hidden);
  app.click('controls');
  app.click('save-controls');
  assert.equal(app.state.current, State.PAUSED);
  assert.equal(app.stage, stage);
  app.click('controls');
  app.ui.navigate({ back: true });
  assert.equal(app.state.current, State.PAUSED);
  app.ui.navigate({ back: true });
  assert.equal(app.state.current, State.PLAYING);
  assert.equal(app.stage, stage);
  assert.ok(stage.progress.hintUnlocked);
  app.state.set(State.PAUSED);
  app.click('resume');
  assert.equal(app.state.current, State.PLAYING);
  assert.equal(app.stage, stage);
  app.state.set(State.PAUSED);
  app.click('main-menu');
  assert.equal(app.state.current, State.MENU);
  assert.ok(app.game.hidden && !app.screen.hidden);
  assert.ok(!app.document.getElementById('app').classList.contains('facility-session'));
});
