import { PortalOpening } from './stages/stage01/portalOpening.js';
import { createFacilityHud } from './ui/facilityHud.js';
import './ui/facilityHud.css';
import { State, GameState } from './core/gameState.js';
import { InputManager, interactionBindings } from './core/input.js';
import { CHARACTERS } from './entities/player/characters.js';
import { preloadCharacterSprites } from './entities/player/characterAssets.js';
import { StageManager } from './core/stageManager.js';
import { createUI } from './ui/ui.js';

const canvas = document.querySelector('canvas'),
  ctx = canvas.getContext('2d');
const input = new InputManager(),
  manager = new StageManager();
const debug = new URLSearchParams(location.search).get('debug') === 'true';
const selected = [0, 1];
const FIXED_STEP = 1 / 120;
let stage,
  accumulator = 0,
  lastTime = 0;
const state = new GameState(() => {
  ui.render();
  hud.sync(state.current);
});
const hud = createFacilityHud({ state, getStage: () => stage, returnToWorld });
let starting = false;
async function start() {
  if (starting) return;
  starting = true;
  const startingState = state.current;
  const characters = selected.map((i) => CHARACTERS[i]);
  try {
    await preloadCharacterSprites(characters);
    if (state.current !== startingState) return;
    input.clear();
    accumulator = 0;
    stage = manager.load(1, characters);
    stage.opening = new PortalOpening();
    hud.reset();
    ui.resetPanel();
    state.set(State.PLAYING);
  } finally {
    starting = false;
  }
}
function resume() {
  ui.resetPanel();
  state.set(State.PLAYING);
  returnToWorld();
}
function returnToWorld() {
  canvas.focus({ preventScroll: true });
  input.clear();
  input.sample();
  input.endFrame();
  accumulator = 0;
}
const ui = createUI({
  state,
  input,
  selected,
  start,
  resume,
  getStage: () => stage,
  onHint: () => hud.requestHint(),
});
function pause() {
  if (state.current === State.PLAYING) state.set(State.PAUSED);
}
canvas.tabIndex = -1;
canvas.addEventListener('pointerdown', () => {
  canvas.focus({ preventScroll: true });
  input.clear();
});
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
        hud.speak(requestedHint.text);
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
  stage.draw(ctx, debug, interactionBindings(input.assignments));
  hud.update(elapsed);
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

let panelButtonHeld = false;
function frame(time) {
  const elapsed = Math.min((time - lastTime) / 1000, 0.05);
  lastTime = time;
  const navigation = input.sampleUI();
  const panelButton = input.pads().some((pad) => pad.buttons[8]?.pressed);
  if (state.current === State.PLAYING && panelButton && !panelButtonHeld) {
    if (hud.controlsFocused) returnToWorld();
    else {
      hud.focusControls();
      input.clear();
    }
  }
  panelButtonHeld = panelButton;
  if (state.current === State.MAP) hud.navigate(navigation);
  else if (state.current === State.PLAYING) {
    if (navigation.menu) document.querySelector('#pause').click();
  } else ui.navigate(navigation);
  if (input.pressed.has('Escape')) {
    if (state.current === State.MAP) hud.closeMap();
    else if (state.current === State.PLAYING && hud.controlsFocused) returnToWorld();
    else if (state.current === State.PLAYING && hud.speechVisible) hud.dismissSpeech();
    else if (state.current === State.PLAYING) pause();
    else if (!ui.closePanel() && state.current === State.PAUSED) resume();
  }
  if (state.current === State.PLAYING) {
    const controlsFocused = hud.controlsFocused;
    if (stage.opening?.active) {
      stage.opening.update(elapsed);
      accumulator = 0;
      input.sample();
      input.endFrame();
      if (!stage.opening.active) input.clear();
    } else if (controlsFocused) {
      hud.navigate(navigation);
      accumulator = 0;
      input.sample();
      input.endFrame();
    } else {
      accumulator += elapsed;
      updateSimulation();
    }
    renderGame(elapsed);
  } else {
    accumulator = 0;
    input.endFrame();
  }
  requestAnimationFrame(frame);
}
ui.render();
requestAnimationFrame(frame);
