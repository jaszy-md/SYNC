import { near, overlaps } from '../../../core/physics/collision.js';
import { moveBody } from '../../../core/physics/movement.js';
import { stage01LayoutConfig } from '../stage01LayoutConfig.js';
import { stage01Config } from '../stage01Config.js';
import { getCharacterImage } from '../../../entities/player/characterAssets.js';
import { getPlayerSpriteBounds } from '../../../entities/player/playerRenderer.js';
import { drawStage01Image } from '../stage01Assets.js';
import { shootInstruction } from '../../../core/input.js';
import {
  BLASTER_COOLDOWN_MS,
  BLASTER_DAMAGE,
  BLASTER_PROJECTILE_SPEED,
  BLASTER_PROJECTILE_LIFETIME,
  SPEECH_BUBBLE_DURATION_MS,
  SPEECH_BUBBLE_FADE_MS,
  GEM_FLIGHT_DURATION,
  BLASTER_GUN_SPRITE,
  BLASTER_VISUAL,
} from '../stage01CombatConfig.js';

export function getBlasterPlacement(player) {
  const sprite = getPlayerSpriteBounds(player);
  const image = getCharacterImage(BLASTER_GUN_SPRITE);
  const w = BLASTER_VISUAL.width;
  const h = w * (image ? image.naturalHeight / image.naturalWidth : 208 / 328);
  const right = player.facing > 0;
  const handX = sprite.x + sprite.w * (right ? 1 - BLASTER_VISUAL.handX : BLASTER_VISUAL.handX);
  const handY = sprite.y + sprite.h * BLASTER_VISUAL.handY;
  const x = handX - w * (right ? 1 - BLASTER_VISUAL.gripX : BLASTER_VISUAL.gripX);
  const y = handY - h * BLASTER_VISUAL.gripY;
  return {
    x,
    y,
    w,
    h,
    flip: right,
    handX,
    muzzleX:
      x +
      w * (right ? 1 - BLASTER_VISUAL.muzzleX : BLASTER_VISUAL.muzzleX) +
      player.facing * BLASTER_VISUAL.projectileOffset,
    muzzleY: y + h * BLASTER_VISUAL.muzzleY,
  };
}

function drawGun(ctx, rect, flip = false) {
  const image = getCharacterImage(BLASTER_GUN_SPRITE);
  if (image) {
    drawStage01Image(ctx, image, rect, flip);
    return;
  }
  // Only a genuinely missing asset uses the existing pixel fallback.
  ctx.save();
  ctx.translate(rect.x + (flip ? rect.w : 0), rect.y);
  ctx.scale(flip ? -1 : 1, 1);
  ctx.fillStyle = '#829da6';
  ctx.fillRect(3, 0, rect.w - 3, rect.h * 0.55);
  ctx.fillStyle = '#233a47';
  ctx.fillRect(rect.w * 0.72, rect.h * 0.5, rect.w * 0.22, rect.h * 0.5);
  ctx.fillStyle = '#73edff';
  ctx.fillRect(0, rect.h * 0.2, 7, 5);
  ctx.restore();
}

export class EnergyBlaster {
  constructor(stage) {
    this.stage = stage;
    const { x, y } = stage01LayoutConfig.objects.blaster;
    const image = getCharacterImage(BLASTER_GUN_SPRITE);
    const w = BLASTER_VISUAL.width;
    const h = w * (image ? image.naturalHeight / image.naturalWidth : 208 / 328);
    Object.assign(this, { x, y: y - h, w, h, owner: null, noticed: false, cooldown: 0 });
    this.projectiles = [];
    this.speech = new Map();
    this.gem = { state: stage.session.gems.blue ? 'collected' : 'hidden' };
  }

  say(player, text) {
    const current = this.speech.get(player.id);
    if (current?.text === text) return;
    this.speech.set(player.id, { text, elapsedMs: 0, opacity: 1 });
  }

  updateSpeech(dt) {
    for (const [id, bubble] of this.speech) {
      bubble.elapsedMs += dt * 1000;
      bubble.opacity = Math.max(
        0,
        Math.min(1, (SPEECH_BUBBLE_DURATION_MS - bubble.elapsedMs) / SPEECH_BUBBLE_FADE_MS),
      );
      if (bubble.elapsedMs >= SPEECH_BUBBLE_DURATION_MS) this.speech.delete(id);
    }
  }

  interact(player, preview = false) {
    if (this.gem.state === 'available' && near(player, this.gem, 20)) {
      if (preview) return this.gem;
      this.gem.state = 'flying';
      this.gem.elapsed = 0;
      return 'HANDLED';
    }
    if (this.owner !== null || !near(player, this, 18)) return null;
    if (preview) return this;
    if (player.abilities.useBlaster) {
      this.owner = player.id;
      this.say(player, shootInstruction(player.inputMethod));
    } else {
      this.say(player, 'Oh, dit is blijkbaar jouw wapen...');
    }
    return 'HANDLED';
  }

  shoot(player) {
    if (
      !player.abilities.useBlaster ||
      this.owner !== player.id ||
      this.cooldown > 0 ||
      this.projectiles.length >= 16
    )
      return false;
    const direction = player.facing;
    const gun = getBlasterPlacement(player);
    player.shootPoseMs = BLASTER_VISUAL.shootPoseMs;
    this.cooldown = BLASTER_COOLDOWN_MS / 1000;
    // A barrel reaching through a thin wall must not allow shots to bypass it.
    const barrel = {
      x: Math.min(gun.handX, gun.muzzleX) - 4,
      y: gun.muzzleY - 4,
      w: Math.abs(gun.muzzleX - gun.handX) + 8,
      h: 8,
    };
    if (this.stage.solids.some((solid) => overlaps(barrel, solid))) return true;
    this.projectiles.push({
      x: gun.muzzleX - 4,
      y: gun.muzzleY - 4,
      w: 8,
      h: 8,
      vx: direction * BLASTER_PROJECTILE_SPEED,
      age: 0,
    });
    return true;
  }

  update(dt, inputs) {
    const { stage } = this;
    this.updateSpeech(dt);
    this.cooldown = Math.max(0, this.cooldown - dt);
    for (const player of stage.players) {
      if (this.owner === null && player.abilities.useBlaster && !near(player, this, 65))
        this.noticed = false;
      if (
        !this.noticed &&
        this.owner === null &&
        player.abilities.useBlaster &&
        near(player, this, 45)
      ) {
        this.noticed = true;
        this.speech.delete(player.id);
        this.say(player, 'Hey! Dat is mijn verloren wapen!');
      }
      if (inputs[player.id]?.shoot && !player.facilityStun) this.shoot(player);
    }
    const solids = stage.solids;
    this.projectiles = this.projectiles.filter((shot) => {
      shot.age += dt;
      if (shot.age >= BLASTER_PROJECTILE_LIFETIME) return false;
      const steps = Math.max(1, Math.ceil(dt / (1 / 120)));
      for (let step = 0; step < steps; step++) {
        shot.x += (shot.vx * dt) / steps;
        if (
          shot.x < -shot.w ||
          shot.x > stage01Config.width ||
          solids.some((solid) => overlaps(shot, solid))
        )
          return false;
        const hit = stage.guards.find((guard) => guard.active && overlaps(shot, guard));
        if (hit) {
          hit.takeDamage(BLASTER_DAMAGE);
          return false;
        }
      }
      return true;
    });
    if (
      stage.guardian.state === 'dead' &&
      stage.miniGuards.length === 2 &&
      stage.miniGuards.every((guard) => guard.state === 'dead') &&
      stage.lastMiniDefeated &&
      this.gem.state === 'hidden'
    ) {
      const guard = stage.lastMiniDefeated;
      Object.assign(this.gem, {
        state: 'available',
        x: guard.x + guard.w / 2 - 9,
        y: guard.y + guard.h - 18,
        w: 18,
        h: 18,
        vx: 0,
        vy: 0,
      });
      // Use nearby free obstacle edges if a gate closed during the shutdown.
      if (solids.some((solid) => overlaps(this.gem, solid))) {
        const candidates = solids.flatMap((solid) => [
          solid.x - this.gem.w - 1,
          solid.x + solid.w + 1,
        ]);
        const safeX = candidates
          .filter(
            (x) =>
              x >= 0 &&
              x + this.gem.w <= stage01Config.width &&
              !solids.some((solid) => overlaps({ ...this.gem, x }, solid)),
          )
          .sort((a, b) => Math.abs(a - this.gem.x) - Math.abs(b - this.gem.x))[0];
        if (safeX !== undefined) this.gem.x = safeX;
      }
    }
    if (this.gem.state === 'available') {
      const steps = Math.max(1, Math.ceil(dt / (1 / 120)));
      for (let step = 0; step < steps; step++) {
        this.gem.vy = Math.min(1000, this.gem.vy + (1600 * dt) / steps);
        moveBody(this.gem, dt / steps, solids);
      }
    }
    this.updateGemFlight(dt);
  }

  updateGemFlight(dt) {
    if (this.gem.state !== 'flying') return;
    this.gem.elapsed = Math.min(GEM_FLIGHT_DURATION, this.gem.elapsed + dt);
    if (this.gem.elapsed >= GEM_FLIGHT_DURATION) {
      this.gem.state = 'collected';
      this.stage.session.gems.blue = true;
    }
  }

  draw(ctx) {
    ctx.save();
    if (this.owner === null) {
      drawGun(ctx, this);
    } else {
      const player = this.stage.players[this.owner];
      if (player.shootPoseMs > 0 && !this.stage.exitAnimation) {
        const gun = getBlasterPlacement(player);
        drawGun(ctx, gun, gun.flip);
      }
    }
    ctx.shadowColor = '#64e4ff';
    ctx.shadowBlur = 9;
    for (const shot of this.projectiles) {
      ctx.fillStyle = '#73edff';
      ctx.beginPath();
      ctx.arc(shot.x + 4, shot.y + 4, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#e6ffff';
      ctx.fillRect(shot.x + 2, shot.y + 2, 3, 2);
    }
    if (this.gem.state === 'available') {
      const { x, y, w } = this.gem;
      const lift = Math.sin(this.stage.time * 3) * 2;
      ctx.fillStyle = '#64d8ff';
      ctx.beginPath();
      ctx.moveTo(x + w / 2, y - 3 + lift);
      ctx.lineTo(x + w, y + 7 + lift);
      ctx.lineTo(x + w / 2, y + 17 + lift);
      ctx.lineTo(x, y + 7 + lift);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#e6ffff';
      ctx.fillRect(x + 5, y + 3 + lift, 3, 3);
      ctx.fillRect(x + w + 3, y + 2 + Math.sin(this.stage.time * 5) * 4, 2, 2);
    }
    ctx.shadowBlur = 0;
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const player of this.stage.players) {
      const bubble = this.speech.get(player.id);
      if (!bubble) continue;
      ctx.globalAlpha = bubble.opacity;
      const lines = bubble.text.split(' ').reduce((result, word) => {
        const last = result.length - 1;
        if (last < 0 || result[last].length + word.length + 1 > 22) result.push(word);
        else result[last] += ' ' + word;
        return result;
      }, []);
      const width = 170;
      const height = lines.length * 16 + 6;
      const x = Math.max(
        4,
        Math.min(stage01Config.width - width - 4, player.x + player.w / 2 - width / 2),
      );
      const y = Math.max(4, Math.min(stage01Config.height - height - 10, player.y - height - 14));
      ctx.fillStyle = '#0c202bee';
      ctx.fillRect(x, y, width, height);
      ctx.strokeStyle = '#8cbdbb';
      ctx.strokeRect(x, y, width, height);
      const tailX = Math.max(x + 8, Math.min(x + width - 12, player.x + player.w / 2));
      ctx.fillStyle = '#8cbdbb';
      ctx.fillRect(tailX, y + height, 6, 3);
      ctx.fillRect(tailX, y + height + 3, 3, 3);
      ctx.fillStyle = '#e4f8ef';
      lines.forEach((line, index) =>
        ctx.fillText(line, x + width / 2, y + 11 + index * 16, width - 12),
      );
    }
    ctx.restore();
  }
}
