// Controllable media boundary: UI and controller stay real in integration tests.
export function musicEnvironment() {
  const instances = [],
    storage = new Map(),
    requests = [];
  const listeners = new Map();
  const document = new EventTarget();
  let focused = true;
  document.hidden = false;
  document.hasFocus = () => focused;
  const env = {
    document,
    setFocus(value) {
      focused = value;
      this.gesture(value ? 'focus' : 'blur');
    },
    setHidden(value) {
      document.hidden = value;
      document.dispatchEvent(new Event('visibilitychange'));
    },
    instances,
    storage,
    requests,
    listeners,
    blocked: false,
    deferred: false,
    addEventListener(name, callback) {
      const handlers = listeners.get(name) ?? new Set();
      handlers.add(callback);
      listeners.set(name, handlers);
    },
    removeEventListener(name, callback) {
      listeners.get(name)?.delete(callback);
    },
    gesture(name = 'pointerdown') {
      for (const callback of [...(listeners.get(name) ?? [])]) callback({});
    },
    sessionStorage: {
      getItem: (key) => storage.get(key),
      setItem: (key, value) => storage.set(key, value),
    },
    Audio: class extends EventTarget {
      paused = true;
      muted = false;
      currentTime = 0;
      calls = 0;
      pauses = 0;
      constructor(src) {
        super();
        this.src = src;
        instances.push(this);
      }
      play() {
        this.calls++;
        if (env.blocked) return Promise.reject(Error('autoplay blocked'));
        if (env.deferred)
          return new Promise((resolve) =>
            requests.push(() => {
              this.paused = false;
              this.dispatchEvent(new Event('playing'));
              resolve();
            }),
          );
        this.paused = false;
        this.dispatchEvent(new Event('playing'));
        return Promise.resolve();
      }
      pause() {
        this.pauses++;
        this.paused = true;
      }
      remove() {
        this.removed = true;
      }
    },
  };
  return env;
}
