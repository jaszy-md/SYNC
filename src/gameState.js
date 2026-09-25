export const State = Object.freeze({
  MENU: 'MENU',
  SETUP: 'SETUP',
  PLAYING: 'PLAYING',
  PAUSED: 'PAUSED',
  STAGE_COMPLETE: 'STAGE_COMPLETE',
});
export class GameState {
  constructor(onChange) {
    this.current = State.MENU;
    this.onChange = onChange;
  }
  set(next) {
    if (!Object.values(State).includes(next)) throw new Error(`Unknown state: ${next}`);
    this.current = next;
    this.onChange(next);
  }
}
