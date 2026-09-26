import { overlaps } from '../../core/physics/collision.js';

export class Trigger {
  constructor(x, y, w, h) {
    Object.assign(this, { x, y, w, h });
  }
  contains(player) {
    return overlaps(this, player);
  }
}
