import { Player } from '../../entities/player/createPlayer.js';
import { PLAYER_HEIGHT } from '../../entities/player/playerConfig.js';
import { createSessionState } from '../../core/gameState.js';
import { drawHealth } from '../../ui/components/healthPortrait.js';
import { drawJungle } from './jungleView.js';

const WIDTH = 1200;
const HEIGHT = 660;
const GROUND = 600;
const JUMP_SPEEDS = [760, 500];

export class Stage2 {
  id = 2;

  constructor(characters, _random, session = createSessionState()) {
    this.session = session;
    this.time = 0;
    this.complete = false;
    this.solids = [{ x: 0, y: GROUND, w: WIDTH, h: HEIGHT - GROUND }];
    this.players = characters.map((character, index) => {
      const player = new Player(
        index,
        character,
        { x: 156 + index * 70, y: GROUND - PLAYER_HEIGHT },
        { jumpSpeed: JUMP_SPEEDS[index] },
      );
      player.grounded = true;
      return player;
    });
    this.health = this.players.map(() => ({ value: 4, max: 4, invulnerable: 0 }));
  }

  update(dt, inputs) {
    this.time += dt;
    this.players.forEach((player, index) => {
      const { move, jump, crouch } = inputs[index];
      player.update({ move, jump, crouch }, dt, this.solids, WIDTH);
    });
  }

  draw(ctx, debug = false) {
    drawJungle(ctx, WIDTH, HEIGHT, this.time);
    this.players.forEach((player) => player.draw(ctx));
    drawHealth(ctx, this);
    if (debug) {
      ctx.strokeStyle = '#ff7493';
      [...this.solids, ...this.players].forEach(({ x, y, w, h }) => ctx.strokeRect(x, y, w, h));
    }
  }
}
