import { Player } from '../../entities/player/createPlayer.js';
import { PLAYER_HEIGHT } from '../../entities/player/playerConfig.js';
import { createSessionState } from '../../core/gameState.js';
import { drawHealth } from '../../ui/components/healthPortrait.js';
import { getCharacterImage } from '../../entities/player/characterAssets.js';
import { drawJungle } from './jungleView.js';
import { LAND, WORLD } from './stage02Layout.js';
import { drawJungleTerrain } from './stage02View.js';

const { width: WIDTH, height: HEIGHT, trailY: GROUND } = WORLD;
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

function spawnPlayer(id, character, x, surface) {
  const player = new Player(
    id,
    character,
    { x, y: surface.y - PLAYER_HEIGHT },
    { ...STANDARD_ABILITIES },
  );
  player.grounded = true;
  return player;
}

export class Stage2 {
  id = 2;

  constructor(characters, _random, session = createSessionState()) {
    this.session = session;
    this.complete = false;
    this.time = 0;
    this.motion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)');
    this.solids = Object.values(LAND);
    this.players = characters.map((character, index) =>
      spawnPlayer(index, character, 156 + index * 70, LAND.entrance),
    );
    this.health = this.players.map(() => ({ value: 4, max: 4, invulnerable: 0 }));
  }

  update(dt, inputs) {
    this.time += dt;
    this.players.forEach((player, index) => {
      const { move, jump, crouch } = inputs[index];
      player.update({ move, jump, crouch }, dt, this.solids, WIDTH);
      if (player.y >= HEIGHT) {
        this.players[index] = spawnPlayer(
          index,
          player.character,
          LAND.nearBank.x + 12 + index * 38,
          LAND.nearBank,
        );
      }
    });
  }

  draw(ctx, debug = false) {
    drawBackground(ctx);
    drawJungleTerrain(ctx, this.motion?.matches ? 0 : this.time);
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
