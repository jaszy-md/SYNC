import { Player } from '../../entities/player/createPlayer.js';
import { jumpPlayer } from '../../entities/player/playerMovement.js';
import { PLAYER_HEIGHT } from '../../entities/player/playerConfig.js';
import { createSessionState } from '../../core/gameState.js';
import { drawHealth } from '../../ui/components/healthPortrait.js';
import { drawControlHints } from '../../ui/controlHints.js';
import { getCharacterImage } from '../../entities/player/characterAssets.js';
import { drawJungle } from './jungleView.js';
import { LAND, PARKOUR_VINE, WORLD } from './stage02Layout.js';
import { drawJungleTerrain } from './stage02View.js';
import { HINT_REACH, Vine } from './objects/vine.js';
import { PortalOpening } from '../stage01/portalOpening.js';

const { width: WIDTH, height: HEIGHT, trailY: GROUND } = WORLD;
const STANDARD_ABILITIES = { jumpSpeed: 500 };
const FALL_Y = HEIGHT + 24;
const RESPAWN_ANIMATION_SPEED = 2;
const GRAB_BUFFER = 0.15;
const REGRAB_DELAY = 0.15;
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

function spawnPlayer(id, character) {
  const player = new Player(
    id,
    character,
    { x: 156 + id * 70, y: LAND.entrance.y - PLAYER_HEIGHT },
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
    this.vine = new Vine(PARKOUR_VINE);
    this.vineHints = new WeakSet();
    this.players = characters.map((character, index) => spawnPlayer(index, character));
    this.respawns = this.players.map(() => null);
    this.vineInput = this.players.map(() => ({ grabUntil: 0, regrabAt: 0 }));
    this.health = this.players.map(() => ({ value: 4, max: 4, invulnerable: 0 }));
  }

  update(dt, inputs) {
    this.time += dt;
    const pendingGrabs = [];
    this.players.forEach((player, index) => {
      const respawn = this.respawns[index];
      if (respawn) {
        respawn.update(dt * RESPAWN_ANIMATION_SPEED);
        if (!respawn.active) {
          this.respawns[index] = null;
          const health = this.health[index];
          if (!health.value) health.value = health.max;
        }
        return;
      }
      const { move, jump, crouch, interact } = inputs[index];
      const { hanging } = player;
      const request = this.vineInput[index];
      if (hanging) {
        if (hanging.active && !jump && !interact) return;
        request.grabUntil = 0;
        request.regrabAt = this.time + REGRAB_DELAY;
        const verticalMomentum = hanging.release(player, jump);
        if (jump) jumpPlayer(player, verticalMomentum);
      } else {
        if (interact && this.time >= request.regrabAt) request.grabUntil = this.time + GRAB_BUFFER;
        if (request.grabUntil > this.time) {
          if (this.vine.grab(player, this.solids)) {
            request.grabUntil = 0;
            return;
          }
          pendingGrabs.push({ player, offset: this.vine.gripOffset(player) });
        }
      }
      player.update(
        { move, jump, crouch: hanging && jump ? false : crouch },
        dt,
        this.solids,
        WIDTH,
      );
      if (player.y >= FALL_Y) {
        request.grabUntil = 0;
        request.regrabAt = 0;
        const health = this.health[index];
        health.value = Math.max(0, health.value - 1);
        this.players[index] = spawnPlayer(index, player.character);
        this.respawns[index] = new PortalOpening({ local: true });
      }
    });
    this.vine.update(
      dt,
      inputs[this.vine.occupant?.id]?.move ?? 0,
      this.solids,
      !this.motion?.matches,
    );
    for (const { player, offset } of pendingGrabs) {
      const request = this.vineInput[player.id];
      if (request.grabUntil > this.time && this.vine.grab(player, this.solids, offset)) {
        request.grabUntil = 0;
      }
    }
  }

  getVineHints(bindings) {
    if (this.opening?.active) return [];
    return this.players.flatMap((player) => {
      const binding = bindings[player.id];
      const reach = HINT_REACH + (this.vineHints.has(player) ? 10 : 0);
      if (
        !binding ||
        this.respawns[player.id] ||
        !this.vine.active ||
        this.vine.occupant ||
        this.vine.distanceToGrip(player) > reach
      ) {
        this.vineHints.delete(player);
        return [];
      }
      this.vineHints.add(player);
      return [{ player, object: this.vine.grip, binding, align: 'left' }];
    });
  }

  getHintMessage() {
    if (
      this.vine.occupant ||
      this.players.some((player) => this.vine.distanceToGrip(player) <= HINT_REACH)
    ) {
      return 'Spring naar de liaan en druk op de getoonde knop om vast te pakken. Stuur mee met je zwaai. Spring op het juiste moment los!';
    }
    return 'Jungleverbinding actief. Jullie kunnen samen op verkenning.';
  }

  draw(ctx, debug = false, bindings = []) {
    drawBackground(ctx);
    drawJungleTerrain(ctx, this.motion?.matches ? 0 : this.time, this.vine);
    this.players.forEach((player, index) => {
      const respawn = this.respawns[index];
      ctx.save();
      ctx.globalAlpha *= respawn?.playerOpacity ?? this.opening?.playerOpacity ?? 1;
      player.draw(ctx);
      ctx.restore();
      respawn?.draw(ctx, [player]);
    });
    drawControlHints(ctx, this, this.getVineHints(bindings), undefined, 72);
    drawHealth(ctx, this);
    this.opening?.draw(ctx, this.players);
    if (debug) {
      ctx.strokeStyle = '#ff7493';
      [...this.solids, ...this.players].forEach(({ x, y, w, h }) => ctx.strokeRect(x, y, w, h));
    }
  }
}
