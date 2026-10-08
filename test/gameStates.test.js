import test from 'node:test';
import assert from 'node:assert/strict';
import { GameState, State } from '../src/core/gameState.js';
import { StageManager } from '../src/core/stageManager.js';
import { CHARACTERS } from '../src/entities/player/characters.js';
import { createUI } from '../src/ui/ui.js';
import { installUiDom } from '../test-support/uiDom.js';
function setup(t, onHint) {
  const dom = installUiDom(t),
    manager = new StageManager(),
    selected = [0, 1];
  let ui, stage;
  const state = new GameState(() => ui.render());
  ui = createUI({
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
  app.click('next');
  app.click('play');
}

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

test('home advances through roles, character selection and team ready before loading Stage 01', (t) => {
  const app = setup(t);
  assert.equal(app.state.current, State.MENU);
  assert.ok(!app.screen.hidden && app.game.hidden);
  app.click('start');
  assert.equal(app.state.current, State.SETUP);
  assert.equal(app.stage, undefined);
  app.click('next');
  app.click('player-0');
  app.click('character-2');
  app.click('player-1');
  app.click('character-3');
  assert.deepEqual(app.selected, [2, 3]);
  app.click('next');
  assert.equal(app.stage, undefined, 'team ready has not started gameplay');
  app.click('back');
  assert.equal(app.state.current, State.SETUP);
  assert.deepEqual(app.selected, [2, 3]);
  app.click('next');
  app.click('play');
  assert.equal(app.state.current, State.PLAYING);
  assert.ok(app.screen.hidden && !app.game.hidden);
  assert.deepEqual(
    app.stage.players.map((p) => p.character),
    [CHARACTERS[2], CHARACTERS[3]],
  );
  assert.equal(app.stage.phase, 'SYMBOLS');
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
});
