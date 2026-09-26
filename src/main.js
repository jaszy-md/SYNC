import { State, GameState } from './core/gameState.js';
import { InputManager } from './core/input.js';
import { CHARACTERS } from './entities/player/characters.js';
import { StageManager } from './core/stageManager.js';
import { createUI } from './ui/ui.js';

const canvas = document.querySelector('canvas'),
  ctx = canvas.getContext('2d');
const hintToast = document.querySelector('#hint-toast');
const input = new InputManager(),
  manager = new StageManager();
const debug = new URLSearchParams(location.search).get('debug') === 'true';
const selected = [0, 1];
const FIXED_STEP = 1 / 120;
let stage,
  accumulator = 0,
  lastTime = 0,
  hintSeconds = 0;
const state = new GameState(() => ui.render());
function start() {
  input.clear();
  accumulator = 0;
  hintSeconds = 0;
  hintToast.hidden = true;
  stage = manager.load(
    1,
    selected.map((i) => CHARACTERS[i]),
  );
  ui.resetPanel();
  state.set(State.PLAYING);
}
function resume() {
  ui.resetPanel();
  state.set(State.PLAYING);
}
const ui = createUI({ state, input, selected, start, resume, getStage: () => stage });
function pause() {
  if (state.current === State.PLAYING) state.set(State.PAUSED);
}
document.querySelector('#pause').addEventListener('click', pause);
document.querySelector('.brand').addEventListener('click', (event) => {
  event.preventDefault();
  if (state.current === State.PLAYING) pause();
  else if (state.current !== State.PAUSED) {
    ui.resetPanel();
    state.set(State.MENU);
  }
});
window.addEventListener('blur', pause);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) pause();
});
function updateSimulation() {
  // Fixed substeps keep AABB collision stable; button edges are consumed once.
  if (accumulator >= FIXED_STEP) {
    const actions = input.sample();
    while (accumulator >= FIXED_STEP) {
      const requestedHint = stage.helpMarker;
      stage.update(FIXED_STEP, actions);
      // Only collecting an explicitly requested marker may display text.
      if (requestedHint && !stage.helpMarker) {
        hintToast.textContent = requestedHint.text;
        hintSeconds = 10;
      }
      accumulator -= FIXED_STEP;
      actions.forEach((a) => {
        a.jump = false;
        a.interact = false;
      });
      if (stage.complete) {
        state.set(State.STAGE_COMPLETE);
        break;
      }
    }
    input.endFrame();
  }
}

function renderGame(elapsed) {
  stage.draw(ctx, debug);
  hintSeconds = Math.max(0, hintSeconds - elapsed);
  hintToast.hidden = hintSeconds === 0;
  if (debug) drawDebugOverlay(elapsed);
}

function drawDebugOverlay(elapsed) {
  ctx.fillStyle = '#050912e8';
  ctx.fillRect(12, 12, 900, 95);
  ctx.fillStyle = '#fff';
  ctx.font = '14px monospace';
  [
    `FPS ${Math.round(1 / (elapsed || 1))} | ${state.current} | gamepads ${input.pads().length}`,
    stage.players
      .map(
        (p) => `P${p.id + 1}: ${p.x.toFixed(0)},${p.y.toFixed(0)} ${p.grounded ? 'ground' : 'air'}`,
      )
      .join(' | '),
    `phase ${stage.phase} | cell ${stage.cell.state} | charge ${stage.charge.toFixed(1)} | door ${stage.door.state}`,
    `bridge ${stage.bridge.active} | sluices ${stage.gateA.active} / ${stage.gateB.active} | help ${!!stage.helpMarker}`,
  ].forEach((line, i) => ctx.fillText(line, 24, 34 + i * 21));
}

function frame(time) {
  const elapsed = Math.min((time - lastTime) / 1000, 0.05);
  lastTime = time;
  if (input.pressed.has('Escape')) {
    if (state.current === State.PLAYING) pause();
    else if (!ui.closePanel() && state.current === State.PAUSED) resume();
  }
  if (state.current === State.PLAYING) {
    accumulator += elapsed;
    updateSimulation();
    renderGame(elapsed);
  } else {
    accumulator = 0;
    input.endFrame();
  }
  requestAnimationFrame(frame);
}
ui.render();
requestAnimationFrame(frame);
