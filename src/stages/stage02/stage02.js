import { Player } from '../../entities/player/createPlayer.js';
import { jumpPlayer } from '../../entities/player/playerMovement.js';
import { PLAYER_HEIGHT } from '../../entities/player/playerConfig.js';
import { createSessionState } from '../../core/gameState.js';
import { drawHealth } from '../../ui/components/healthPortrait.js';
import { drawSpeechBubble } from '../../ui/components/speechBubble.js';
import { drawControlHints } from '../../ui/controlHints.js';
import { getCharacterImage } from '../../entities/player/characterAssets.js';
import { drawJungle } from './jungleView.js';
import { LAND, PARKOUR_VINE, QUICKSAND, WORLD } from './stage02Layout.js';
import { drawJungleTerrain, drawQuicksand } from './stage02View.js';
import { HINT_REACH, Vine } from './objects/vine.js';
import { PortalOpening } from '../stage01/portalOpening.js';

const { width: WIDTH, height: HEIGHT, trailY: GROUND } = WORLD;
const STANDARD_ABILITIES = { jumpSpeed: 500 };
const FALL_Y = HEIGHT + 24;
const RESPAWN_ANIMATION_SPEED = 2;
const GRAB_BUFFER = 0.15;
const REGRAB_DELAY = 0.15;
const SLIP_TIME = 0.46;
const SLIP_MESSAGE_TIME = 3;
const SINK_SPEED = 58;
const SLIP_MESSAGE = 'Ohh... ik moet blijkbaar op een andere manier oversteken!';
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
    this.sinking = this.players.map(() => null);
    this.vineInput = this.players.map(() => ({
      grabUntil: 0,
      regrabAt: 0,
      slipAt: 0,
      failedSwing: false,
    }));
    this.slipMessage = null;
    this.health = this.players.map(() => ({ value: 4, max: 4, invulnerable: 0 }));
  }

  tryGrab(player, offset) {
    if (this.sinking[player.id] || !this.vine.grab(player, this.solids, offset)) return false;
    const request = this.vineInput[player.id];
    request.grabUntil = 0;
    return true;
  }

  respawn(player) {
    const { id, character } = player;
    const health = this.health[id];
    health.value = Math.max(0, health.value - 1);
    if (health.value === 0) {
      this.reset();
      return true;
    }
    const request = this.vineInput[id];
    const failedSwing = Boolean(request.failedSwing && this.sinking[id]);
    Object.assign(request, { grabUntil: 0, regrabAt: 0, slipAt: 0, failedSwing });
    this.sinking[id] = null;
    this.players[id] = spawnPlayer(id, character);
    this.respawns[id] = new PortalOpening({ local: true });
    return false;
  }

  reset() {
    const characters = this.players.map((player) => player.character);
    Object.assign(this, new Stage2(characters, undefined, this.session));
    this.opening = new PortalOpening();
  }

  update(dt, inputs) {
    if (this.opening?.active) return;
    this.time += dt;
    const pendingGrabs = [];
    for (const [index, player] of this.players.entries()) {
      const request = this.vineInput[index];
      const respawn = this.respawns[index];
      if (respawn) {
        respawn.update(dt * RESPAWN_ANIMATION_SPEED);
        if (!respawn.active) {
          this.respawns[index] = null;
          if (request.failedSwing)
            this.slipMessage ??= { index, until: this.time + SLIP_MESSAGE_TIME };
          request.failedSwing = false;
        }
        continue;
      }
      if (this.sinking[index]) {
        player.y += SINK_SPEED * dt;
        if (player.y >= QUICKSAND.y + 16 && this.respawn(player)) return;
        continue;
      }
      const { move, jump, crouch, interact } = inputs[index];
      const { hanging } = player;
      let jumping = jump;
      if (hanging) {
        if (hanging.active && hanging === this.vine && index !== PARKOUR_VINE.swingPlayerId) {
          if (!request.slipAt) {
            if (hanging.angle >= 0.18 && hanging.angularVelocity >= 0.45)
              request.slipAt = this.time + SLIP_TIME;
            continue;
          }
          if (this.time < request.slipAt) continue;
          request.slipAt = 0;
          // Release only on a rightward pass with the player's body already over the sand.
          if (hanging.angularVelocity <= 0 || player.x < QUICKSAND.x) continue;
          jumping = false;
          request.failedSwing = true;
          player.swingMomentum = Math.min(45, hanging.length * hanging.angularVelocity);
        } else if (hanging.active && !jump && !interact) continue;
        request.grabUntil = 0;
        request.regrabAt = this.time + REGRAB_DELAY;
        const verticalMomentum = hanging.release(player, jumping);
        if (jumping) jumpPlayer(player, verticalMomentum);
      } else {
        if (interact && !request.failedSwing && this.time >= request.regrabAt)
          request.grabUntil = this.time + GRAB_BUFFER;
        if (request.grabUntil > this.time) {
          if (this.tryGrab(player)) continue;
          pendingGrabs.push({ player, offset: this.vine.gripOffset(player) });
        }
      }
      player.update(
        request.failedSwing
          ? { move: 0, jump: false, crouch: false }
          : { move, jump: jumping, crouch: hanging && jumping ? false : crouch },
        dt,
        this.solids,
        WIDTH,
      );
      if (player.grounded) request.failedSwing = false;
      if (
        !player.grounded &&
        player.y + player.h >= QUICKSAND.y &&
        player.x + player.w > QUICKSAND.x &&
        player.x < QUICKSAND.x + QUICKSAND.w
      ) {
        player.y = QUICKSAND.y - player.h;
        player.vx = player.vy = player.swingMomentum = 0;
        request.grabUntil = 0;
        this.sinking[index] = { at: this.time, x: player.x + player.w / 2 };
      } else if (player.y >= FALL_Y && this.respawn(player)) return;
    }
    const rider = this.vine.occupant?.id;
    const losingGrip = this.vineInput[rider]?.slipAt;
    // Slow this pass just enough for the grip animation to finish over the sand.
    this.vine.update(
      losingGrip ? dt * 0.5 : dt,
      inputs[rider]?.move ?? 0,
      this.solids,
      !this.motion?.matches,
    );
    for (const { player, offset } of pendingGrabs) {
      const request = this.vineInput[player.id];
      if (request.grabUntil > this.time) this.tryGrab(player, offset);
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
        this.sinking[player.id] ||
        this.vineInput[player.id].failedSwing ||
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
      return 'Spring vanaf de boomstam en pak de liaan vast. Stuur mee met de zwaai. Spring op het juiste moment los om het drijfzand over te steken.';
    }
    return 'Jungleverbinding actief. Jullie kunnen samen op verkenning.';
  }

  draw(ctx, debug = false, bindings = []) {
    drawBackground(ctx);
    const sceneryTime = this.motion?.matches ? 0 : this.time;
    const rider = this.vine.occupant;
    const slipAt = this.vineInput[rider?.id]?.slipAt;
    const slip =
      slipAt && !this.motion?.matches ? Math.max(0, 1 - (slipAt - this.time) / SLIP_TIME) : 0;
    const wobble = Math.sin(slip * Math.PI) * Math.sin(slip * Math.PI * 8);
    drawQuicksand(ctx, sceneryTime, this.sinking, this.time);
    drawJungleTerrain(ctx, sceneryTime, this.vine, wobble * 10);
    this.players.forEach((player, index) => {
      const respawn = this.respawns[index];
      ctx.save();
      ctx.globalAlpha *= respawn?.playerOpacity ?? this.opening?.playerOpacity ?? 1;
      if (this.sinking[index]) {
        ctx.beginPath();
        ctx.rect(0, 0, WIDTH, QUICKSAND.y);
        ctx.clip();
      }
      if (slip && player === rider) {
        const { x, y } = this.vine.grip;
        ctx.translate(x, y + Math.max(0, slip - 0.6) * 5);
        ctx.rotate(player.facing * slip ** 2 * 0.26 + wobble * 0.16);
        ctx.translate(-x, -y);
      }
      player.draw(ctx);
      ctx.restore();
      respawn?.draw(ctx, [player]);
    });
    drawControlHints(ctx, this, this.getVineHints(bindings), undefined, 72);
    this.players.forEach((player, index) => {
      if (!this.vineInput[index].failedSwing || this.sinking[index] || this.respawns[index]) return;
      const clearance = QUICKSAND.y - (player.y + player.h);
      if (clearance > 8) {
        drawSpeechBubble(ctx, player, 'Aaahh!', Math.min(1, (clearance - 8) / 24), WORLD, {
          pointer: true,
          beside: true,
        });
      }
    });
    if (this.slipMessage?.until > this.time && !this.respawns[this.slipMessage.index]) {
      const { index, until } = this.slipMessage;
      drawSpeechBubble(
        ctx,
        this.players[index],
        SLIP_MESSAGE,
        Math.min(1, (until - this.time) * 5),
        WORLD,
        { pointer: true },
      );
    }
    drawHealth(ctx, this);
    this.opening?.draw(ctx, this.players);
    if (debug) {
      ctx.strokeStyle = '#ff7493';
      [...this.solids, ...this.players].forEach(({ x, y, w, h }) => ctx.strokeRect(x, y, w, h));
    }
  }
}
