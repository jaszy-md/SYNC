import {Stage1} from './stages/stage1.js';
const stages = {1:Stage1};
export class StageManager {
  load(id,characters) {
    const Stage = stages[id];
    if(!Stage)throw new Error(`Stage ${id} bestaat nog niet`);
    this.current=new Stage(characters);
    return this.current;
  }
}
