import { near, overlaps } from '../../../core/physics/collision.js';
import { moveBody } from '../../../core/physics/movement.js';
import { stage01Config } from '../stage01Config.js';
import { stage01LayoutConfig } from '../stage01LayoutConfig.js';
import { stage01Image, drawStage01Image } from '../stage01Assets.js';
import {
  GUARD_MAX_HEALTH,
  GUARD_SHUTDOWN_DURATION,
  GUARD_ATTACK_INTERVAL,
  GUARD_REACTION_DELAY,
  GUARD_SCAN_PAUSE,
  GUARD_ATTACK_RANGE,
  GUARD_AIM_LEAD_SECONDS,
  GUARD_PROJECTILE_SPEED,
  GUARD_WARNING_DURATION,
  GUARD_MOVE_SPEED,
} from '../stage01CombatConfig.js';

export class SecurityDrone {
  constructor({
    scale = 1,
    health = GUARD_MAX_HEALTH,
    speed = GUARD_MOVE_SPEED,
    attackInterval = GUARD_ATTACK_INTERVAL,
    targetPlayerId = null,
    onDefeated = () => {},
  } = {}) {
    Object.assign(this, {
      scale,
      maxHealth: health,
      speed,
      attackInterval,
      targetPlayerId,
      onDefeated,
    });
    this.reset();
  }

  reset() {
    const guard = stage01LayoutConfig.objects.guard;
    Object.assign(this, {
      x: guard.x,
      y: guard.y,
      w: guard.width * this.scale,
      h: guard.height * this.scale,
      direction: -1,
      disabled: 0,
      time: 0,
      active: false,
      state: 'inactive',
      health: this.maxHealth,
      deathElapsed: 0,
      cooldown: [0, 0],
      projectiles: [],
      shotTimer: this.attackInterval,
      targetInRange: false,
      stagger: 0,
      retreat: 0,
      knockDirection: 0,
      moving: false,
      vx: 0,
      vy: 0,
      grounded: true,
      stompRetreat: 0,
      hitFlash: 0,
    });
  }

  spawn(platform) {
    if (this.state !== 'inactive') return;
    this.state = 'entering';
    this.active = true;
    this.x = -this.w;
    this.y = platform.y - this.h;
    this.entryX = platform.x + this.w;
    this.direction = 1;
    this.moving = true;
  }

  takeDamage(amount) {
    if (!this.active || !['entering', 'chasing'].includes(this.state)) return false;
    this.health = Math.max(0, this.health - amount);
    this.hitFlash = 0.25;
    if (this.health === 0) {
      this.state = 'dying';
      this.active = false;
      this.projectiles = [];
      this.moving = false;
      this.vx = this.vy = 0;
      this.onDefeated(this);
    }
    return true;
  }

  interact(player, preview = false) {
    if (
      !this.active ||
      this.disabled > 0 ||
      !player.abilities.operateSwitch ||
      !near(player, this, 65)
    )
      return null;
    if (preview) return this;
    this.disabled = 4;
    return 'HANDLED';
  }

  get topSurface() {
    // Match the sprite's head, which extends above the patrol collision body.
    return { x: this.x, y: this.y + this.h - 72 * this.scale, w: this.w, h: 6 };
  }

  stomp(player) {
    if (!this.active || this.disabled > 0) return;
    this.disabled = 4;
    this.projectiles = [];
    this.shotTimer = this.attackInterval;
    this.stagger = 0;
    this.stompRetreat = 1.4;
    this.hitFlash = 0.65;
    const away = Math.sign(this.x + this.w / 2 - (player.x + player.w / 2));
    this.direction = away || -this.direction;
  }

  update(dt, players, enabled, solids = [], onHit = () => {}) {
    if (this.targetPlayerId !== null)
      players = players.filter((player) => player.id === this.targetPlayerId);
    if (this.state === 'dying') {
      this.deathElapsed = Math.min(GUARD_SHUTDOWN_DURATION, this.deathElapsed + dt);
      if (this.deathElapsed >= GUARD_SHUTDOWN_DURATION) this.state = 'dead';
      return;
    }
    if (this.state === 'dead') return;
    this.active = enabled && this.state !== 'inactive';
    this.time += dt;
    this.disabled = Math.max(0, this.disabled - dt);
    this.hitFlash = Math.max(0, this.hitFlash - dt);
    this.cooldown = this.cooldown.map((value) => Math.max(0, value - dt));
    this.moving = false;
    if (!this.active) {
      this.projectiles = [];
      return;
    }
    if (this.state === 'entering') {
      if (this.disabled > 0) return;
      this.moving = true;
      this.direction = 1;
      this.movePatrol(Math.min(this.speed * dt, this.entryX - this.x), solids);
      if (this.x >= this.entryX) this.state = 'chasing';
      return;
    }
    const target = [...players].sort(
      (a, b) => Math.hypot(a.x - this.x, a.y - this.y) - Math.hypot(b.x - this.x, b.y - this.y),
    )[0];
    const steps = Math.max(1, Math.ceil(dt / (1 / 120)));
    // Reuse world collision and gravity so pursuit cannot float through platforms.
    for (let step = 0; step < steps; step++) {
      this.vy = Math.min(1000, this.vy + (1600 * dt) / steps);
      moveBody(this, dt / steps, solids);
    }
    if (this.stompRetreat > 0) {
      this.moving = true;
      this.movePatrol(this.direction * this.speed * Math.min(dt, this.stompRetreat), solids);
      this.stompRetreat = Math.max(0, this.stompRetreat - dt);
      return;
    }
    this.updateProjectiles(dt, players, solids, onHit);
    if (this.disabled > 0) return;
    if (this.stagger > 0) {
      this.movePatrol(this.knockDirection * 90 * Math.min(dt, this.stagger), solids);
      this.stagger = Math.max(0, this.stagger - dt);
      if (this.stagger === 0) {
        this.direction *= -1;
        this.retreat = 1.4;
      }
      return;
    }
    this.retreat = Math.max(0, this.retreat - dt);
    // Full-speed running is the existing movement state; no extra sprint binding.
    for (const player of players) {
      if (this.cooldown[player.id] || !overlaps(player, this)) continue;
      this.cooldown[player.id] = 2;
      if (player.stage01Rushing) {
        this.stagger = 0.35;
        this.knockDirection = Math.sign(player.vx) || -this.direction;
        this.shotTimer = this.attackInterval;
        return;
      }
      player.vy = -150;
      player.facilityStun = 0.45;
    }
    const inRange = !!target && near(target, this, GUARD_ATTACK_RANGE);
    if (inRange && !this.targetInRange)
      this.shotTimer = Math.min(this.shotTimer, GUARD_REACTION_DELAY);
    this.targetInRange = inRange;
    this.moving = this.retreat > 0 || this.time % 5 >= GUARD_SCAN_PAUSE;
    if (this.moving) {
      if (target && this.retreat === 0)
        this.direction =
          Math.sign(target.x + target.w / 2 - (this.x + this.w / 2)) || this.direction;
      this.movePatrol(this.direction * this.speed * dt, solids);
    }
    this.shotTimer -= dt;
    if (this.shotTimer <= 0 && this.retreat === 0) {
      const target = players
        .filter((player) => near(player, this, GUARD_ATTACK_RANGE))
        .sort((a, b) => Math.abs(a.x - this.x) - Math.abs(b.x - this.x))[0];
      if (target) this.fire(target);
      this.shotTimer = this.attackInterval;
    }
  }

  movePatrol(distance, solids) {
    const { patrolMin, patrolMax } = stage01LayoutConfig.objects.guard;
    const left = this.state === 'entering' ? -this.w : Math.max(0, patrolMin);
    const right = Math.min(stage01Config.width - this.w, patrolMax);
    let nextX = Math.max(left, Math.min(right, this.x + distance));
    for (const solid of solids) {
      if (this.y >= solid.y + solid.h || this.y + this.h <= solid.y) continue;
      // Sweep the horizontal edge, so knockback and large steps cannot tunnel through gates.
      if (distance > 0 && this.x + this.w <= solid.x && nextX + this.w > solid.x)
        nextX = Math.min(nextX, solid.x - this.w);
      else if (distance < 0 && this.x >= solid.x + solid.w && nextX < solid.x + solid.w)
        nextX = Math.max(nextX, solid.x + solid.w);
      else if (overlaps(this, solid)) {
        this.resolveWall(solid, solids);
        nextX = this.x;
      }
    }
    if (nextX !== this.x + distance && !this.stagger) this.direction *= -1;
    this.x = Math.max(left, Math.min(right, nextX));
  }

  resolveWall(wall, solids) {
    if (!overlaps(this, wall)) return;
    const onLeft = this.x + this.w / 2 < wall.x + wall.w / 2;
    const candidates = [
      0,
      stage01Config.width - this.w,
      ...solids.flatMap((solid) => [solid.x - this.w - 0.01, solid.x + solid.w + 0.01]),
    ];
    const safeX = candidates
      .filter(
        (x) =>
          x >= 0 &&
          x + this.w <= stage01Config.width &&
          (onLeft ? x + this.w <= wall.x : x >= wall.x + wall.w) &&
          !solids.some((solid) => overlaps({ ...this, x }, solid)),
      )
      .sort((a, b) => Math.abs(a - this.x) - Math.abs(b - this.x))[0];
    if (safeX !== undefined) this.x = safeX;
    this.vx = 0;
  }

  fire(player) {
    if (this.targetPlayerId !== null && player.id !== this.targetPlayerId) return;
    if (!this.active || this.state !== 'chasing' || this.disabled > 0) return;
    const x = this.x + this.w / 2,
      y = this.y + 15 * this.scale;
    // A small lead rewards changing direction; projectiles never home after firing.
    const dx = player.x + player.w / 2 + (player.vx || 0) * GUARD_AIM_LEAD_SECONDS - x;
    const dy = player.y + player.h / 2 + (player.vy || 0) * GUARD_AIM_LEAD_SECONDS - y;
    const distance = Math.hypot(dx, dy) || 1;
    this.projectiles.push({
      x,
      y,
      w: 8,
      h: 8,
      vx: (dx / distance) * GUARD_PROJECTILE_SPEED,
      vy: (dy / distance) * GUARD_PROJECTILE_SPEED,
    });
  }

  updateProjectiles(dt, players, solids, onHit) {
    if (this.targetPlayerId !== null)
      players = players.filter((player) => player.id === this.targetPlayerId);
    this.projectiles = this.projectiles.filter((shot) => {
      // Small steps also prevent tunneling when tests or a slow frame use a larger dt.
      const steps = Math.max(1, Math.ceil(dt / (1 / 120)));
      for (let step = 0; step < steps; step++) {
        shot.x += (shot.vx * dt) / steps;
        shot.y += (shot.vy * dt) / steps;
        if (
          shot.x < -8 ||
          shot.x > 1200 ||
          shot.y < -8 ||
          shot.y > 660 ||
          solids.some((solid) => overlaps(shot, solid))
        )
          return false;
        const hit = players.find((player) => overlaps(shot, player));
        if (hit) {
          onHit(hit);
          return false;
        }
      }
      return true;
    });
  }

  draw(ctx) {
    if (!this.active && this.state !== 'dying') return;
    const image = stage01Image(this.moving ? 'guard_side' : 'guard_front');
    ctx.save();
    if (this.state === 'dying') ctx.globalAlpha *= 1 - this.deathElapsed / GUARD_SHUTDOWN_DURATION;
    if (this.hitFlash > 0 && Math.floor(this.hitFlash * 16) % 2) {
      ctx.filter = 'sepia(1) saturate(8) hue-rotate(315deg)';
      ctx.shadowColor = '#ff526c';
      ctx.shadowBlur = 12;
    }
    const color =
      this.stagger > 0 ? '#ffe3a1' : !this.active || this.disabled > 0 ? '#76bda0' : '#edac62';
    if (image) {
      drawStage01Image(
        ctx,
        image,
        {
          x: this.x + this.w / 2 - 38 * this.scale,
          y: this.y + this.h - 73 * this.scale,
          w: 76 * this.scale,
          h: 76 * this.scale,
        },
        this.moving && this.direction < 0,
      );
    } else {
      ctx.fillStyle = '#748a96';
      ctx.fillRect(this.x, this.y, this.w, this.h);
      ctx.strokeStyle = '#d2ede4';
      ctx.strokeRect(this.x + 3, this.y + 3, this.w - 6, this.h - 6);
      ctx.fillStyle = color;
      ctx.fillRect(
        this.x + (this.direction < 0 ? 3 : 23) * this.scale,
        this.y + 8 * this.scale,
        8 * this.scale,
        5 * this.scale,
      );
    }
    ctx.filter = 'none';
    ctx.shadowBlur = 0;
    const barWidth = 44 * this.scale;
    const barX = this.x + this.w / 2 - barWidth / 2;
    const barY = this.topSurface.y - 12;
    ctx.fillStyle = '#071620';
    ctx.fillRect(barX - 1, barY - 1, barWidth + 2, 7);
    ctx.fillStyle = '#ef9264';
    ctx.fillRect(barX, barY, barWidth * (this.health / this.maxHealth), 5);
    if (this.state === 'dying') {
      ctx.strokeStyle = '#9bffff';
      ctx.shadowColor = '#64e4ff';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      for (let i = 0; i < 7; i++) {
        const x = this.x + (i % 2 ? this.w + 6 : -6);
        const y = this.y + (i * this.h) / 6;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    // A bright muzzle warning precedes each slow shot.
    if (
      this.active &&
      this.targetInRange &&
      !this.disabled &&
      !this.stagger &&
      !this.retreat &&
      this.shotTimer < GUARD_WARNING_DURATION
    ) {
      ctx.shadowColor = '#ff9867';
      ctx.shadowBlur = 12;
      ctx.fillStyle = '#ffac6e';
      ctx.beginPath();
      ctx.arc(
        this.x + this.w / 2,
        this.y + 15 * this.scale,
        5 + Math.sin(this.time * 24) * 2,
        0,
        Math.PI * 2,
      );
      ctx.fill();
      ctx.strokeStyle = '#ffe4a0';
      ctx.beginPath();
      ctx.arc(this.x + this.w / 2, this.y + 15 * this.scale, 10, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
    if (this.disabled > 0 || this.stagger > 0) {
      ctx.strokeStyle = color;
      ctx.beginPath();
      ctx.ellipse(this.x + this.w / 2, this.y - 15, 17, 4, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.shadowColor = '#ff9867';
    ctx.shadowBlur = 9;
    for (const shot of this.projectiles) {
      ctx.fillStyle = '#ffe4a0';
      ctx.beginPath();
      ctx.arc(shot.x + 4, shot.y + 4, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}
