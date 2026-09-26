import { updateCharacterAvatars } from './components/avatar.js';
import { completeView } from './screens/completeScreen.js';
import { menuView } from './screens/menuScreen.js';
import { rolesView } from './screens/rolesScreen.js';
import { characterSelectView } from './screens/characterSelectScreen.js';
import { readyView } from './screens/readyScreen.js';
import { pauseView } from './screens/pauseScreen.js';
import { controlsView } from './screens/controlsScreen.js';
import { controllersView, deviceCardsView } from './screens/controllersScreen.js';
import { State } from '../core/gameState.js';
import { CHARACTERS } from '../entities/player/characters.js';

// UI-only navigation lives here; the central GameState still owns play/pause.
export function createUI({ state, input, selected, start, resume, getStage }) {
  const screen = document.querySelector('#screen'),
    game = document.querySelector('#game');
  let panel = null,
    setupStep = 0,
    activePlayer = 0,
    typingTimer;
  const refreshAvatars = () => updateCharacterAvatars(screen, refreshAvatars);
  const bind = (id, fn) => document.getElementById(id)?.addEventListener('click', fn);
  // Shrink only when a compact panel still exceeds a short viewport. Transform
  // does not affect measured layout size, so ResizeObserver cannot oscillate.
  const fitPanel = () => {
    const sheet = screen.querySelector('.sheet');
    if (!sheet || screen.hidden) return;
    const style = getComputedStyle(screen);
    const height =
      screen.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom) - 8;
    const width =
      screen.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight) - 8;
    const scale = Math.min(1, height / sheet.offsetHeight, width / sheet.offsetWidth);
    sheet.style.transform = `scale(${Math.max(0.1, scale)})`;
  };
  const resizeObserver = new ResizeObserver(fitPanel);
  const open = (name) => {
    panel = name;
    render();
  };
  const closePanel = () => {
    if (!panel) return false;
    panel = null;
    render();
    return true;
  };
  function render() {
    resizeObserver.disconnect();
    clearInterval(typingTimer);
    input.clear();
    const playing = state.current === State.PLAYING,
      paused = state.current === State.PAUSED;
    game.hidden = !playing && !paused;
    document.querySelector('#pause').hidden = !playing;
    screen.hidden = playing;
    screen.className = paused ? 'overlay' : '';
    screen.setAttribute('role', paused ? 'dialog' : 'region');
    if (paused) screen.setAttribute('aria-modal', 'true');
    else screen.removeAttribute('aria-modal');
    if (playing) {
      screen.innerHTML = '';
      document.activeElement?.blur();
      return;
    }
    if (panel) renderPanel();
    else if (state.current === State.MENU) renderMenu();
    else if (state.current === State.SETUP) renderSetup();
    else if (paused) renderPause();
    else if (state.current === State.STAGE_COMPLETE) {
      screen.innerHTML = completeView();
      bind('replay', start);
      bind('main-menu', mainMenu);
    }
    refreshAvatars();
    bind('panel-back', closePanel);
    fitPanel();
    resizeObserver.observe(screen);
    const sheet = screen.querySelector('.sheet');
    if (sheet) resizeObserver.observe(sheet);
    screen.querySelector('button:not(:disabled)')?.focus({ preventScroll: true });
  }
  function mainMenu() {
    panel = null;
    state.set(State.MENU);
  }
  function renderMenu() {
    screen.innerHTML = menuView();
    const phrase = 'Can technology bring us back together?';
    const typed = document.querySelector('#typed');
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) typed.textContent = phrase;
    else {
      let index = 0;
      typingTimer = setInterval(() => {
        typed.textContent = phrase.slice(0, ++index);
        if (index === phrase.length) clearInterval(typingTimer);
      }, 42);
    }
    bind('start', () => {
      setupStep = 0;
      state.set(State.SETUP);
    });
    bind('controls', () => open('controls'));
    bind('controllers', () => open('controllers'));
  }
  function renderSetup() {
    if (setupStep === 0) {
      screen.innerHTML = rolesView();
    } else if (setupStep === 1) {
      screen.innerHTML = characterSelectView(selected, activePlayer);
      selected.forEach((_, i) =>
        bind(`player-${i}`, () => {
          activePlayer = i;
          render();
        }),
      );
      CHARACTERS.forEach((_, i) =>
        bind(`character-${i}`, () => {
          selected[activePlayer] = i;
          render();
          document.getElementById(`character-${i}`).focus();
        }),
      );
    } else {
      screen.innerHTML = readyView(selected, input.assignments);
      bind('controls', () => open('controls'));
      bind('controllers', () => open('controllers'));
      bind('play', start);
    }
    bind('back', () => {
      if (setupStep === 0) mainMenu();
      else {
        setupStep--;
        render();
      }
    });
    bind('next', () => {
      setupStep++;
      render();
    });
  }
  function renderPause() {
    screen.innerHTML = pauseView();
    bind('resume', resume);
    bind('hint', () => {
      getStage().requestHint();
      resume();
    });
    bind('controls', () => open('controls'));
    bind('controllers', () => open('controllers'));
    bind('restart', start);
    bind('main-menu', mainMenu);
  }
  let controlsTab = 'keyboard';
  function renderPanel() {
    if (panel === 'controls') renderControls();
    else renderControllers();
  }

  function renderControls() {
    const rows =
      controlsTab === 'keyboard'
        ? [
            ['A / D', 'W', 'S', 'E'],
            ['← / →', '↑', '↓', 'Enter'],
          ]
        : [
            ['Stick / D-pad', 'A / ✕', 'D-pad ↓', 'X / □'],
            ['Stick / D-pad', 'A / ✕', 'D-pad ↓', 'X / □'],
          ];
    screen.innerHTML = controlsView(rows, controlsTab);
    ['keyboard', 'gamepad'].forEach((t) =>
      bind(`tab-${t}`, () => {
        controlsTab = t;
        render();
        document.getElementById(`tab-${t}`).focus();
      }),
    );
    bind('devices', () => open('controllers'));
  }

  function renderControllers() {
    screen.innerHTML = controllersView();
    renderPads();
    bind('scan', renderPads);
    bind('save-pads', () => {
      const values = [...document.querySelectorAll('.device-select')].map((e) =>
        e.value === '' ? null : Number(e.value),
      );
      const message = document.querySelector('#device-message');
      if (values[0] !== null && values[0] === values[1]) {
        message.textContent = 'Koppel één controller aan maximaal één speler.';
        return;
      }
      input.assignments = values;
      renderPads();
      message.textContent = 'Opgeslagen. Keyboard blijft voor beide spelers beschikbaar.';
    });
  }
  function renderPads() {
    const pads = input.pads();
    document.querySelector('#pads').innerHTML = deviceCardsView(selected, input.assignments, pads);
  }
  window.addEventListener('gamepaddisconnected', () => {
    if (panel === 'controllers') {
      document.querySelector('#device-message').textContent =
        'Controller losgekoppeld. Keyboard blijft beschikbaar; detecteer opnieuw voor de actuele lijst.';
    }
  });
  window.addEventListener('gamepadconnected', () => {
    if (panel === 'controllers')
      document.querySelector('#device-message').textContent =
        'Controller gevonden. Klik Detecteren om de lijst bij te werken.';
  });
  // Keep keyboard focus in the pause overlay; Escape is handled by the main loop.
  screen.addEventListener('keydown', (event) => {
    if (event.key !== 'Tab' || state.current !== State.PAUSED) return;
    const nodes = [...screen.querySelectorAll('button:not(:disabled),select')];
    const first = nodes[0],
      last = nodes.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  });
  return {
    render,
    closePanel,
    resetPanel: () => {
      panel = null;
    },
  };
}
