const SOUND_PATHS = {
  jump: '/assets/sounds/jump.flac',
  shoot: '/assets/sounds/laser.wav',
};

// One decoded buffer per sound, with an independent voice for every action.
// This service survives stage restarts and can be shared by any future stage.
export class GameplayAudio {
  constructor(environment = globalThis) {
    this.environment = environment;
    this.context = null;
    this.buffers = new Map();
    this.loading = null;
  }

  preload() {
    if (this.loading) return this.loading;
    try {
      const Context = this.environment.AudioContext || this.environment.webkitAudioContext;
      if (!Context) return Promise.resolve();
      this.context ??= new Context({ latencyHint: 'interactive' });
      this.loading = Promise.all(
        Object.entries(SOUND_PATHS).map(async ([name, path]) => {
          try {
            const response = await this.environment.fetch(path);
            if (!response.ok) return;
            const buffer = await this.context.decodeAudioData(await response.arrayBuffer());
            this.buffers.set(name, buffer);
          } catch {
            // Missing assets or unsupported codecs must never interrupt gameplay.
          }
        }),
      );
      return this.loading;
    } catch {
      return Promise.resolve();
    }
  }

  unlock() {
    void this.preload();
    try {
      if (this.context && this.context.state !== 'running')
        void this.context.resume().catch(() => {});
    } catch {
      // A later user gesture can retry browser audio activation.
    }
  }

  play(name) {
    const buffer = this.buffers.get(name);
    if (!buffer || this.context?.state !== 'running') return;
    try {
      const source = this.context.createBufferSource();
      source.buffer = buffer;
      source.connect(this.context.destination);
      source.onended = () => source.disconnect();
      source.start();
    } catch {
      // Audio is optional; never queue delayed sounds for rejected actions.
    }
  }

  initialize(target) {
    void this.preload();
    // Keep listeners so returning to a suspended tab can unlock audio again.
    for (const event of ['pointerdown', 'keydown', 'touchend'])
      target.addEventListener(event, () => this.unlock(), { capture: true, passive: true });
  }
}

export const gameplayAudio = new GameplayAudio();

// A single streaming element owns homepage music; gameplay audio is independent.
export class HomepageMusic {
  constructor(environment = globalThis) {
    this.environment = environment;
    this.active = false;
    this.muted = false;
    this.audio = null;
    this.target = null;
    this.listening = false;
    this.pending = null;
    this.disposed = false;
    this.foreground = this.documentFocused();
    this.subscribers = new Set();
    this.onFocus = () => {
      this.foreground = true;
      this.syncForeground();
    };
    this.onBlur = () => {
      this.foreground = false;
      this.syncForeground();
    };
    this.onVisibilityChange = () => {
      this.foreground = this.documentFocused();
      this.syncForeground();
    };
    this.onGesture = (event) => {
      // The button's own handler decides whether this click means mute or unmute.
      if (event?.target?.closest?.('#home-music')) return;
      this.play();
    };
    this.onMediaChange = () => {
      if (!this.allowed && this.audio && !this.audio.paused) this.stop(!this.active);
      this.notify();
    };
    try {
      this.muted = environment.sessionStorage?.getItem('sync.homeMusicMuted') === 'true';
    } catch {
      // Storage can be disabled; retain the preference in memory.
    }
  }

  get allowed() {
    return (
      this.active && !this.muted && !this.disposed && this.foreground && this.documentFocused()
    );
  }
  get playing() {
    return this.allowed && !!this.audio && !this.audio.paused && !this.audio.muted;
  }

  subscribe(callback) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  notify() {
    for (const callback of this.subscribers) callback();
  }

  documentFocused() {
    const document = this.environment.document;
    return !document?.hidden && (document?.hasFocus?.() ?? true);
  }

  syncForeground() {
    this.syncListeners();
    if (this.allowed) this.play();
    else this.stop(!this.active);
    this.notify();
  }

  removeFocusListeners() {
    this.target?.removeEventListener('focus', this.onFocus);
    this.target?.removeEventListener('blur', this.onBlur);
    this.target?.removeEventListener('pagehide', this.onBlur);
    this.environment.document?.removeEventListener('visibilitychange', this.onVisibilityChange);
  }

  initialize(target) {
    if (this.target === target || this.disposed) return;
    this.syncListeners(false);
    this.removeFocusListeners();
    this.target = target;
    this.foreground = this.documentFocused();
    target.addEventListener('focus', this.onFocus);
    target.addEventListener('blur', this.onBlur);
    target.addEventListener('pagehide', this.onBlur);
    this.environment.document?.addEventListener('visibilitychange', this.onVisibilityChange);
    this.syncListeners();
  }

  syncListeners(enable = this.allowed) {
    if (!this.target || this.listening === enable) return;
    for (const event of ['pointerdown', 'keydown', 'touchend', 'click']) {
      if (enable)
        this.target.addEventListener(event, this.onGesture, { capture: true, passive: true });
      else this.target.removeEventListener(event, this.onGesture, true);
    }
    this.listening = enable;
  }

  setActive(active) {
    if (this.disposed) return;
    const entering = active && !this.active;
    this.active = active;
    this.syncListeners();
    // Always enforce silence off-home, even if a previous play is still settling.
    if (!active) this.stop(true);
    else if (this.muted) this.stop(false);
    else if (entering) this.play();
    this.notify();
  }

  stop(reset) {
    this.pending = null;
    if (!this.audio) return;
    // Muting as well as pausing prevents a late media start from being audible.
    this.audio.muted = true;
    this.audio.pause();
    if (reset) {
      try {
        this.audio.currentTime = 0;
      } catch {
        /* Metadata may not yet be available. */
      }
    }
  }

  play() {
    if (!this.allowed) return;
    try {
      if (!this.audio) {
        this.audio = new this.environment.Audio('/assets/sounds/Escape_the_Chain.mp3');
        this.audio.id = 'homepage-music-audio';
        this.audio.hidden = true;
        this.audio.loop = true;
        this.audio.volume = 0.35;
        this.audio.preload = 'auto';
        for (const event of ['play', 'playing', 'pause', 'volumechange', 'error'])
          this.audio.addEventListener?.(event, this.onMediaChange);
        // Keeping the owned element in the DOM makes its real media state inspectable.
        this.environment.document?.body?.append?.(this.audio);
      }
      this.audio.muted = false;
      if (!this.audio.paused || this.pending) return;
      const attempt = {};
      this.pending = attempt;
      const settled = () => {
        if (this.pending === attempt) this.pending = null;
        if (!this.allowed) this.stop(!this.active);
        this.notify();
      };
      Promise.resolve(this.audio.play()).then(settled, settled);
      this.notify();
    } catch {
      this.pending = null;
      this.notify();
    }
  }

  toggleMuted() {
    this.muted = !this.muted;
    try {
      this.environment.sessionStorage?.setItem('sync.homeMusicMuted', String(this.muted));
    } catch {
      /* In-memory preference still works. */
    }
    this.syncListeners();
    if (this.muted) this.stop(false);
    else this.play();
    this.notify();
  }

  dispose() {
    this.disposed = true;
    this.active = false;
    this.stop(true);
    this.syncListeners(false);
    this.removeFocusListeners();
    if (this.audio) {
      for (const event of ['play', 'playing', 'pause', 'volumechange', 'error'])
        this.audio.removeEventListener?.(event, this.onMediaChange);
      this.audio.remove?.();
    }
    this.target = null;
    this.subscribers.clear();
  }
}

export const homepageMusic = new HomepageMusic();
// Stop the old instance and its listeners before Vite replaces this module.
if (import.meta.hot) import.meta.hot.dispose(() => homepageMusic.dispose());
