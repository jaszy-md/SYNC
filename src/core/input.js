export const KEYBOARD = [
  { left: 'KeyA', right: 'KeyD', jump: 'KeyW', crouch: 'KeyS', interact: 'KeyE' },
  {
    left: 'ArrowLeft',
    right: 'ArrowRight',
    jump: 'ArrowUp',
    crouch: 'ArrowDown',
    interact: 'Enter',
  },
];
export const GAMEPAD_INTERACT = { button: 2, label: 'X' };

export function interactionBindings(assignments) {
  return inputMethods(assignments).map((method) =>
    method.type === 'controller'
      ? { kind: 'controller', label: GAMEPAD_INTERACT.label }
      : { kind: 'keyboard', label: KEYBOARD[method.layout].interact.replace(/^Key/, '') },
  );
}
export function inputMethods(assignments) {
  const hasController = assignments.some((index) => index !== null);
  return assignments.map((index, player) =>
    index !== null
      ? { type: 'controller', index }
      : { type: 'keyboard', layout: hasController ? 1 : player },
  );
}

export function inputMethodLabel(method) {
  return method.type === 'controller'
    ? `Controller ${method.index + 1}`
    : `Keyboard · ${method.layout === 0 ? 'WASD' : 'Pijltjestoetsen'}`;
}

export class InputManager {
  constructor(target = window) {
    this.keys = new Set();
    this.pressed = new Set();
    this.previousPads = new Map();
    this.previousUI = new Map();
    this.assignments = [null, null];
    this.padSessions = new Map();
    this.nextPadSession = 0;
    target.addEventListener('gamepaddisconnected', ({ gamepad }) => {
      if (this.padSessions.get(gamepad.index)?.id === gamepad.id) this.forgetPad(gamepad.index);
    });
    target.addEventListener('gamepadconnected', ({ gamepad }) => {
      this.forgetPad(gamepad.index);
      this.pads();
    });
    const codes = new Set([...KEYBOARD.flatMap((m) => Object.values(m)), 'Escape']);
    target.addEventListener('keydown', (e) => {
      if (
        !codes.has(e.code) ||
        (e.code !== 'Escape' && /SELECT|INPUT|BUTTON/.test(e.target?.tagName))
      )
        return;
      e.preventDefault();
      if (!this.keys.has(e.code)) this.pressed.add(e.code);
      this.keys.add(e.code);
    });
    target.addEventListener('keyup', (e) => this.keys.delete(e.code));
    target.addEventListener('blur', () => this.clear());
  }
  pads() {
    const pads = Array.from(navigator.getGamepads?.() ?? []).filter(
      (pad) => pad && pad.connected !== false,
    );
    for (const [index, session] of this.padSessions) {
      if (!pads.some((pad) => pad.index === index && pad.id === session.id)) this.forgetPad(index);
    }
    let detected = false;
    for (const pad of pads) {
      if (!this.padSessions.has(pad.index)) {
        this.padSessions.set(pad.index, { id: pad.id, serial: ++this.nextPadSession });
        detected = true;
      }
    }
    if (detected && this.assignments[0] === null) {
      this.assignments[0] =
        pads.find((pad) => !this.assignments.includes(pad.index))?.index ?? null;
    }
    return pads;
  }
  forgetPad(index) {
    this.assignments = this.assignments.map((assigned, player) => {
      if (assigned !== index) return assigned;
      this.previousPads.delete(player);
      return null;
    });
    this.padSessions.delete(index);
    this.previousUI.delete(index);
  }
  sampleUI() {
    const pads = this.pads();
    const actions = { direction: 0, confirm: false, back: false, menu: false };
    const previous = this.previousUI;
    this.previousUI = new Map();
    for (const pad of pads) {
      const buttons = pad.buttons.map((button) => button.pressed);
      const direction = buttons[12]
        ? 'up'
        : buttons[13]
          ? 'down'
          : buttons[14]
            ? 'left'
            : buttons[15]
              ? 'right'
              : Math.max(Math.abs(pad.axes[0] ?? 0), Math.abs(pad.axes[1] ?? 0)) <= 0.5
                ? 0
                : Math.abs(pad.axes[0] ?? 0) > Math.abs(pad.axes[1] ?? 0)
                  ? pad.axes[0] < 0
                    ? 'left'
                    : 'right'
                  : pad.axes[1] < 0
                    ? 'up'
                    : 'down';
      const last = previous.get(pad.index);
      if (direction && direction !== last?.direction) actions.direction = direction;
      actions.confirm ||= !!buttons[0] && !last?.buttons[0];
      actions.back ||= !!buttons[1] && !last?.buttons[1];
      actions.menu ||= !!buttons[9] && !last?.buttons[9];
      this.previousUI.set(pad.index, { buttons, direction });
    }
    return actions;
  }
  sample() {
    const pads = this.pads();
    return inputMethods(this.assignments).map((method, index) => {
      const pad = method.type === 'controller' ? pads.find((p) => p.index === method.index) : null;
      const mapping = method.type === 'keyboard' ? KEYBOARD[method.layout] : null;
      const held = (action) => !!mapping && this.keys.has(mapping[action]);
      const pressed = (action) => !!mapping && this.pressed.has(mapping[action]);
      const buttons = pad?.buttons.map((b) => b.pressed) ?? [];
      const previous = this.previousPads.get(index) ?? [];
      this.previousPads.set(index, buttons);
      const axis = pad?.axes[0] ?? 0;
      const padMove = Math.abs(axis) > 0.22 ? axis : (buttons[15] ? 1 : 0) - (buttons[14] ? 1 : 0);
      return {
        move: Math.max(-1, Math.min(1, Number(held('right')) - Number(held('left')) + padMove)),
        jump: pressed('jump') || !!(buttons[0] && !previous[0]),
        crouch: held('crouch') || !!buttons[1] || !!buttons[13],
        interact:
          pressed('interact') ||
          !!(buttons[GAMEPAD_INTERACT.button] && !previous[GAMEPAD_INTERACT.button]),
        interactHeld: held('interact') || !!buttons[GAMEPAD_INTERACT.button],
      };
    });
  }
  endFrame() {
    this.pressed.clear();
  }
  clear() {
    this.keys.clear();
    this.pressed.clear();
    this.previousPads.clear();
  }
}
