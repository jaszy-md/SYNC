import { Stage1 } from '../stages/stage01/stage01.js';
import { createSessionState } from './gameState.js';
const stages = { 1: Stage1 };
export class StageManager {
  constructor() {
    this.session = createSessionState();
  }
  load(id, characters) {
    const Stage = stages[id];
    if (!Stage) throw new Error(`Stage ${id} bestaat nog niet`);
    this.current = new Stage(characters, Math.random, this.session);
    return this.current;
  }
  newRun(id, characters) {
    this.session = createSessionState();
    return this.load(id, characters);
  }
}
