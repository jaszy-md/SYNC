import { Trigger } from './trigger.js';

export class HelpMarker extends Trigger {
  constructor({ id, x, y, text }) {
    super(x, y, 24, 32);
    Object.assign(this, { id, text, ready: false });
  }
}
