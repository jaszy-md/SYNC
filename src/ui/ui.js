import { updateCharacterAvatars } from './components/avatar.js';
import { completeView } from './screens/completeScreen.js';
import { menuView } from './screens/menuScreen.js';
import { rolesView } from './screens/rolesScreen.js';
import { characterSelectView } from './screens/characterSelectScreen.js';
import { readyView } from './screens/readyScreen.js';
import { pauseView } from './screens/pauseScreen.js';
import { controlsView } from './screens/controlsScreen.js';
import { controllersView, deviceCardsView, controllerStatus } from './screens/controllersScreen.js';
import { State } from '../core/gameState.js';
import { CHARACTERS } from '../entities/player/characters.js';

export function directionalTarget(nodes, current, direction) {
  if (!nodes.includes(current)) return nodes[0];
  const origin = current.getBoundingClientRect();
  const horizontal = direction === 'left' || direction === 'right';
  const sign = direction === 'left' || direction === 'up' ? -1 : 1;
  const candidates = nodes
    .filter((node) => node !== current)
    .map((node) => {
      const rect = node.getBoundingClientRect();
      const dx = (rect.left + rect.right - origin.left - origin.right) / 2;
      const dy = (rect.top + rect.bottom - origin.top - origin.bottom) / 2;
      const forward = sign * (horizontal ? dx : dy);
      const sideways = Math.abs(horizontal ? dy : dx);
      const overlap = horizontal
        ? Math.min(rect.bottom, origin.bottom) - Math.max(rect.top, origin.top)
        : Math.min(rect.right, origin.right) - Math.max(rect.left, origin.left);
      const aligned =
        overlap >=
        0.5 *
          (horizontal ? Math.min(rect.height, origin.height) : Math.min(rect.width, origin.width));
      return { node, forward, sideways, aligned, distance: dx * dx + dy * dy };
    });
  return candidates
    .filter(({ forward, sideways, aligned }) => forward > 1 && (aligned || forward >= sideways))
    .sort((a, b) => Number(b.aligned) - Number(a.aligned) || a.distance - b.distance)[0]?.node;
}

// UI-only navigation lives here; the central GameState still owns play/pause.
export function createUI({ state, input, selected, start, resume, getStage }) {
  const screen = document.querySelector('#screen'),
    game = document.querySelector('#game');
  let panel = null,
    returnPanel = null,
    editingSelect = null,
    setupStep = 0,
    activePlayer = 0,
    typingTimer,
    scanTimer,
    deviceDraft = [null, null],
    deviceSessions = new Map();
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
    returnPanel = panel;
    panel = name;
    render();
  };
  const closePanel = () => {
    if (!panel) return false;
    if (editingSelect) {
      closeDeviceSelect(true);
      return true;
    }
    const returningFromControllers = panel === 'controllers';
    panel = returnPanel;
    returnPanel = null;
    render();
    if (returningFromControllers) focusReturnAction();
    return true;
  };
  function focusReturnAction() {
    (
      screen.querySelector('button.primary:not(:disabled)') ??
      screen.querySelector('button:not(:disabled)')
    )?.focus({ preventScroll: true });
  }
  function render() {
    closeDeviceSelect(true);
    resizeObserver.disconnect();
    clearInterval(typingTimer);
    clearTimeout(scanTimer);
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
    focusReturnAction();
  }
  function mainMenu() {
    panel = null;
    returnPanel = null;
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
            ['Stick / D-pad', 'A / ✕', 'B / ○', 'X / □'],
            ['Stick / D-pad', 'A / ✕', 'B / ○', 'X / □'],
          ];
    screen.innerHTML = controlsView(rows, controlsTab);
    ['keyboard', 'gamepad'].forEach((t) =>
      bind(`tab-${t}`, () => {
        controlsTab = t;
        render();
        document.getElementById(`tab-${t}`).focus();
      }),
    );
    bind('save-controls', saveControls);
  }

  function saveControls() {
    // The underlying GameState and setupStep retain the view that opened Controls.
    panel = null;
    returnPanel = null;
    render();
    focusReturnAction();
  }

  function openDeviceSelect(node) {
    if (editingSelect?.node === node) return closeDeviceSelect(true);
    closeDeviceSelect(true);
    const list = document.getElementById(node.getAttribute('aria-controls'));
    const options = [...list.querySelectorAll('[role="option"]')];
    editingSelect = {
      node,
      list,
      options,
      index: Math.max(
        0,
        options.findIndex((option) => option.getAttribute('aria-selected') === 'true'),
      ),
    };
    node.setAttribute('aria-expanded', 'true');
    list.showPopover();
    positionDeviceSelect();
    moveDeviceOption(0);
  }
  function positionDeviceSelect() {
    if (!editingSelect) return;
    const { node, list } = editingSelect;
    const rect = node.getBoundingClientRect();
    list.style.width = `${Math.min(rect.width, innerWidth - 16)}px`;
    list.style.left = `${Math.max(8, Math.min(rect.left, innerWidth - list.offsetWidth - 8))}px`;
    const below = innerHeight - rect.bottom - 12;
    const above = rect.top - 12;
    const openBelow = below >= Math.min(list.scrollHeight, 220) || below >= above;
    list.style.maxHeight = `${Math.max(40, Math.min(220, openBelow ? below : above))}px`;
    list.style.top = `${openBelow ? rect.bottom + 6 : Math.max(8, rect.top - list.offsetHeight - 6)}px`;
  }
  function moveDeviceOption(step) {
    const editing = editingSelect;
    editing.index = Math.max(0, Math.min(editing.options.length - 1, editing.index + step));
    editing.options[editing.index].focus({ preventScroll: true });
    editing.options[editing.index].scrollIntoView({ block: 'nearest' });
  }
  function closeDeviceSelect(cancel = false) {
    if (!editingSelect) return;
    const { node, list, options, index } = editingSelect;
    editingSelect = null;
    list.hidePopover();
    node.setAttribute('aria-expanded', 'false');
    node.focus({ preventScroll: true });
    if (!cancel) {
      const value = options[index].dataset.value;
      const player = Number(node.id.slice(-1));
      const assigned = value === '' ? null : Number(value);
      if (
        assigned !== null &&
        (deviceDraft[1 - player] === assigned ||
          !input.pads().some((pad) => pad.index === assigned))
      )
        return;
      deviceDraft[player] = assigned;
      renderPads();
    }
  }
  document.addEventListener('pointerdown', (event) => {
    if (
      editingSelect &&
      !editingSelect.list.contains(event.target) &&
      !editingSelect.node.contains(event.target)
    )
      closeDeviceSelect(true);
  });
  document.addEventListener('focusin', (event) => {
    if (editingSelect && !editingSelect.list.contains(event.target)) moveDeviceOption(0);
  });
  window.addEventListener('resize', positionDeviceSelect);
  document.addEventListener('scroll', positionDeviceSelect, true);

  function renderControllers() {
    screen.innerHTML = controllersView();
    input.pads();
    deviceDraft = [...input.assignments];
    deviceSessions = new Map(input.padSessions);
    renderPads();
    detectPads();
    bind('scan', detectPads);
    bind('save-pads', () => {
      refreshPads();
      const values = [...deviceDraft];
      const message = document.querySelector('#device-message');
      if (values[0] !== null && values[0] === values[1]) {
        message.textContent = 'Koppel één controller aan maximaal één speler.';
        return;
      }
      input.assignments = values;
      saveControls();
    });
  }
  function detectPads() {
    clearTimeout(scanTimer);
    const status = document.querySelector('#detection-status');
    status.setAttribute('aria-busy', 'true');
    status.querySelector('span').textContent = 'Controllers detecteren...';
    scanTimer = setTimeout(() => {
      if (panel !== 'controllers') return;
      refreshPads();
      status.setAttribute('aria-busy', 'false');
      status.querySelector('span').textContent = controllerStatus(input.pads().length);
    }, 400);
  }
  function renderPads() {
    const pads = input.pads();
    const focusId = editingSelect?.node.id ?? document.activeElement?.id;
    closeDeviceSelect(true);
    document.querySelector('#pads').innerHTML = deviceCardsView(selected, deviceDraft, pads);
    screen.querySelectorAll('.device-select').forEach((node) => {
      node.addEventListener('click', () => openDeviceSelect(node));
      node.addEventListener('keydown', (event) => {
        if (!['ArrowDown', 'ArrowUp'].includes(event.key)) return;
        event.preventDefault();
        openDeviceSelect(node);
      });
    });
    screen.querySelectorAll('.device-options').forEach((list) => {
      list.querySelectorAll('[role="option"]').forEach((option, index) => {
        option.addEventListener('focus', () => {
          if (editingSelect?.list === list) editingSelect.index = index;
        });
        option.addEventListener('click', () => closeDeviceSelect());
      });
      list.addEventListener('keydown', (event) => {
        if (
          ![
            'ArrowUp',
            'ArrowDown',
            'ArrowLeft',
            'ArrowRight',
            'Home',
            'End',
            'Tab',
            'Escape',
          ].includes(event.key)
        )
          return;
        event.preventDefault();
        event.stopPropagation();
        if (event.key === 'Escape') closeDeviceSelect(true);
        else if (event.key === 'Home') moveDeviceOption(-Infinity);
        else if (event.key === 'End') moveDeviceOption(Infinity);
        else if (event.key === 'ArrowUp' || (event.key === 'Tab' && event.shiftKey))
          moveDeviceOption(-1);
        else if (event.key === 'ArrowDown' || event.key === 'Tab') moveDeviceOption(1);
      });
    });
    fitPanel();
    if (focusId?.startsWith('device-')) {
      document.getElementById(focusId)?.focus({ preventScroll: true });
    }
  }
  function refreshPads() {
    input.pads();
    if (panel !== 'controllers') return;
    const sessions = input.padSessions;
    if (
      sessions.size === deviceSessions.size &&
      [...sessions].every(
        ([index, session]) => session.serial === deviceSessions.get(index)?.serial,
      )
    )
      return;
    deviceDraft = deviceDraft.map((index) =>
      index !== null &&
      sessions.get(index)?.serial === deviceSessions.get(index)?.serial &&
      sessions.has(index)
        ? index
        : null,
    );
    const detected = [...sessions].some(
      ([index, session]) => session.serial !== deviceSessions.get(index)?.serial,
    );
    if (detected && deviceDraft[0] === null) {
      deviceDraft[0] = input.pads().find((pad) => pad.index !== deviceDraft[1])?.index ?? null;
    }
    deviceSessions = new Map(sessions);
    renderPads();
    const status = document.querySelector('#detection-status');
    if (status.getAttribute('aria-busy') !== 'true') {
      status.querySelector('span').textContent = controllerStatus(sessions.size);
    }
  }
  window.addEventListener('gamepaddisconnected', refreshPads);
  window.addEventListener('gamepadconnected', refreshPads);
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
    navigate({ direction, confirm, back, menu }) {
      if (panel === 'controllers') refreshPads();
      if (editingSelect) {
        if (back || confirm) closeDeviceSelect(back);
        else if (direction === 'up' || direction === 'down') {
          moveDeviceOption(direction === 'up' ? -1 : 1);
        }
        return;
      }
      if (back) {
        if (!closePanel()) {
          if (state.current === State.PAUSED) resume();
          else screen.querySelector('#back, #main-menu')?.click();
        }
        return;
      }
      if (menu && state.current === State.PAUSED && !panel) {
        resume();
        return;
      }
      const nodes = [
        ...document.querySelectorAll('#screen button, #screen select, header a'),
      ].filter((node) => !node.disabled && node.getClientRects().length);
      if (direction) {
        directionalTarget(nodes, document.activeElement, direction)?.focus();
      }
      if (confirm) {
        const node = document.activeElement;
        if (!nodes.includes(node)) nodes[0]?.focus();
        else node.click();
      }
    },
    resetPanel: () => {
      panel = null;
      returnPanel = null;
    },
  };
}
