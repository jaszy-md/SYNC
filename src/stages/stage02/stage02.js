import { Player } from '../../entities/player/createPlayer.js';
import { PLAYER_HEIGHT } from '../../entities/player/playerConfig.js';
import { createSessionState } from '../../core/gameState.js';
import { drawHealth } from '../../ui/components/healthPortrait.js';

const WIDTH = 1200;
const HEIGHT = 660;
const GROUND = 600;
const STANDARD_ABILITIES = { jumpSpeed: 500 };

export class Stage2 {
  id = 2;

  constructor(characters, _random, session = createSessionState()) {
    this.session = session;
    this.complete = false;
    this.solids = [{ x: 0, y: GROUND, w: WIDTH, h: HEIGHT - GROUND }];
    this.players = characters.map((character, index) => {
      const player = new Player(
        index,
        character,
        { x: 156 + index * 70, y: GROUND - PLAYER_HEIGHT },
        { ...STANDARD_ABILITIES },
      );
      player.grounded = true;
      return player;
    });
    this.health = this.players.map(() => ({ value: 4, max: 4, invulnerable: 0 }));
  }

  update(dt, inputs) {
    this.players.forEach((player, index) => {
      const { move, jump, crouch } = inputs[index];
      player.update({ move, jump, crouch }, dt, this.solids, WIDTH);
    });
  }

  draw(ctx, debug = false) {
    ctx.fillStyle = '#102b22';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    const floor = this.solids[0];
    ctx.fillStyle = '#293d2e';
    ctx.fillRect(floor.x, floor.y, floor.w, floor.h);
    this.players.forEach((player) => player.draw(ctx));
    drawHealth(ctx, this);
    if (debug) {
      ctx.strokeStyle = '#ff7493';
      [...this.solids, ...this.players].forEach(({ x, y, w, h }) => ctx.strokeRect(x, y, w, h));
    }
  }
}
