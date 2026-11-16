import { Player } from '../../entities/player/createPlayer.js';
import { PLAYER_HEIGHT } from '../../entities/player/playerConfig.js';
import { createSessionState } from '../../core/gameState.js';
import { drawHealth } from '../../ui/components/healthPortrait.js';
import { getCharacterImage } from '../../entities/player/characterAssets.js';
import { drawJungle } from './jungleView.js';

const WIDTH = 1200;
const HEIGHT = 660;
const GROUND = 600;
const STANDARD_ABILITIES = { jumpSpeed: 500 };
export const STAGE2_BACKGROUND = '/assets/images/stage2/stage2-background.png';

function drawBackground(ctx) {
  const image = getCharacterImage(STAGE2_BACKGROUND);
  if (!image) {
    drawJungle(ctx, WIDTH, HEIGHT, 0);
    return;
  }
  // Align the walkable trail in the source image with the floor while covering the entire canvas.
  const trailY = image.naturalHeight * 0.81;
  const scale = Math.max(
    WIDTH / image.naturalWidth,
    GROUND / trailY,
    (HEIGHT - GROUND) / (image.naturalHeight - trailY),
  );
  const width = image.naturalWidth * scale;
  ctx.drawImage(
    image,
    (WIDTH - width) / 2,
    GROUND - trailY * scale,
    width,
    image.naturalHeight * scale,
  );
}

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
    drawBackground(ctx);
    ctx.save();
    ctx.globalAlpha *= this.opening?.playerOpacity ?? 1;
    this.players.forEach((player) => player.draw(ctx));
    ctx.restore();
    drawHealth(ctx, this);
    this.opening?.draw(ctx, this.players);
    if (debug) {
      ctx.strokeStyle = '#ff7493';
      [...this.solids, ...this.players].forEach(({ x, y, w, h }) => ctx.strokeRect(x, y, w, h));
    }
  }
}
