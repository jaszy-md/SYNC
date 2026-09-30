import { near, overlaps } from '../../../core/physics/collision.js';
import { stage01Config } from '../stage01Config.js';
import { stage01LayoutConfig } from '../stage01LayoutConfig.js';
import { stage01Image, drawStage01Image } from '../stage01Assets.js';

export class SecurityDrone {
  constructor() {
    this.reset();
  }

  reset() {
    const guard = stage01LayoutConfig.objects.guard;
    Object.assign(this, {
      x: guard.x,
      y: guard.y,
      w: guard.width,
      h: guard.height,
      direction: -1,
      disabled: 0,
      time: 0,
      active: false,
      cooldown: [0, 0],
      projectiles: [],
      shotTimer: 1.8,
      stagger: 0,
      retreat: 0,
      knockDirection: 0,
      moving: false,
      stompRetreat: 0,
      hitFlash: 0,
    });
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
    return { x: this.x, y: this.y + this.h - 72, w: this.w, h: 6 };
  }

  stomp(player) {
    if (this.disabled > 0) return;
    this.disabled = 4;
    this.projectiles = [];
    this.shotTimer = 1.8;
    this.stagger = 0;
    this.stompRetreat = 1.4;
    this.hitFlash = 0.65;
    const away = Math.sign(this.x + this.w / 2 - (player.x + player.w / 2));
    this.direction = away || -this.direction;
  }

  update(dt, players, enabled, solids = [], onHit = () => {}) {
    this.active = enabled;
    this.time += dt;
    this.disabled = Math.max(0, this.disabled - dt);
    this.hitFlash = Math.max(0, this.hitFlash - dt);
    this.cooldown = this.cooldown.map((value) => Math.max(0, value - dt));
    this.moving = false;
    if (!enabled) {
      this.projectiles = [];
      return;
    }
    if (this.stompRetreat > 0) {
      this.moving = true;
      this.movePatrol(this.direction * 65 * Math.min(dt, this.stompRetreat), solids);
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
        this.shotTimer = 1.8;
        return;
      }
      player.vy = -150;
      player.facilityStun = 0.45;
    }
    // Keep the original scan pause; a shove temporarily overrides it.
    this.moving = this.retreat > 0 || this.time % 5 >= 1.5;
    if (this.moving) {
      this.movePatrol(this.direction * 65 * dt, solids);
    }
    this.shotTimer -= dt;
    if (this.shotTimer <= 0 && this.retreat === 0) {
      const target = players
        .filter((player) => near(player, this, 250))
        .sort((a, b) => Math.abs(a.x - this.x) - Math.abs(b.x - this.x))[0];
      if (target) this.fire(target);
      this.shotTimer = 1.8;
    }
  }

  movePatrol(distance, solids) {
    const { patrolMin, patrolMax } = stage01LayoutConfig.objects.guard;
    const left = Math.max(0, patrolMin);
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
        // A gate can close over a guard: move him to the nearest side, never through it.
        nextX = this.x + this.w / 2 < solid.x + solid.w / 2 ? solid.x - this.w : solid.x + solid.w;
      }
    }
    if (nextX !== this.x + distance && !this.stagger) this.direction *= -1;
    this.x = Math.max(left, Math.min(right, nextX));
  }

  fire(player) {
    const x = this.x + this.w / 2,
      y = this.y + 15;
    const dx = player.x + player.w / 2 - x;
    const dy = player.y + player.h / 2 - y;
    const distance = Math.hypot(dx, dy) || 1;
    this.projectiles.push({
      x,
      y,
      w: 8,
      h: 8,
      vx: (dx / distance) * 190,
      vy: (dy / distance) * 190,
    });
  }

  updateProjectiles(dt, players, solids, onHit) {
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
    const image = stage01Image(this.moving ? 'guard_side' : 'guard_front');
    ctx.save();
    if (this.hitFlash > 0 && Math.floor(this.hitFlash * 16) % 2) {
      ctx.filter = 'sepia(1) saturate(8) hue-rotate(315deg)';
      ctx.shadowColor = '#ff526c';
      ctx.shadowBlur = 12;
    }
    const color =
      this.stagger > 0 ? '#ffe3a1' : !this.active || this.disabled > 0 ? '#76bda0' : '#edac62';
    ctx.fillStyle = '#050c1399';
    ctx.fillRect(this.x - 4, this.y + this.h - 3, this.w + 8, 7);
    if (image) {
      drawStage01Image(
        ctx,
        image,
        { x: this.x + this.w / 2 - 38, y: this.y + this.h - 73, w: 76, h: 76 },
        this.moving && this.direction < 0,
      );
    } else {
      ctx.fillStyle = '#748a96';
      ctx.fillRect(this.x, this.y, this.w, this.h);
      ctx.strokeStyle = '#d2ede4';
      ctx.strokeRect(this.x + 3, this.y + 3, this.w - 6, this.h - 6);
      ctx.fillStyle = color;
      ctx.fillRect(this.x + (this.direction < 0 ? 3 : 23), this.y + 8, 8, 5);
    }
    ctx.filter = 'none';
    ctx.shadowBlur = 0;
    // A bright muzzle warning precedes each slow shot.
    if (this.active && !this.disabled && !this.stagger && !this.retreat && this.shotTimer < 0.4) {
      ctx.fillStyle = '#ffac6e';
      ctx.beginPath();
      ctx.arc(this.x + this.w / 2, this.y + 15, 5 + Math.sin(this.time * 24) * 2, 0, Math.PI * 2);
      ctx.fill();
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
