import { drawStage1 } from './stage01View.js';
import { Player } from '../../entities/player/createPlayer.js';
import { HelpMarker } from '../../entities/objects/helpMarker.js';
import { near, overlaps } from '../../core/physics/collision.js';
import { stage01Config } from './stage01Config.js';
import { playerAbilities } from './players/abilities.js';
import { initializeStage01ObjectSetup } from './stage01ObjectSetup.js';
import { SymbolPuzzle } from './puzzles/symbolPuzzle/symbolPuzzle.js';
import { EnergyPuzzle } from './puzzles/energyPuzzle/energyPuzzle.js';
import { getStage01Hint, getStage01Communication } from './hints/stage01Hints.js';
import { SecurityDrone } from './objects/securityDrone.js';
import { EnergyBlaster } from './objects/energyBlaster.js';
import { createSessionState } from '../../core/gameState.js';
import { MINI_GUARD, MINI_GUARD_SPAWN_DELAY } from './stage01CombatConfig.js';

// Energy relay: the same physical cell must be moved between two sockets.
// Opening a passage requires a partner to remain at a remote control.
export class Stage1 {
  constructor(characters, random = Math.random, session = createSessionState()) {
    this.session = session;
    this.players = characters.map(
      (character, index) =>
        new Player(
          index,
          character,
          {
            x: stage01Config.spawn.x + index * stage01Config.spawn.spacing,
            y: stage01Config.spawn.y,
          },
          { ...(index === 0 ? playerAbilities.player1 : playerAbilities.player2) },
        ),
    );

    initializeStage01ObjectSetup(this);
    // The opening freezes physics, so establish the supported idle pose at spawn.
    this.players.forEach((player) => {
      player.grounded = this.solids.some(
        (solid) =>
          Math.abs(player.y + player.h - solid.y) < 0.01 &&
          player.x + player.w > solid.x &&
          player.x < solid.x + solid.w,
      );
    });

    this.symbolPuzzle = new SymbolPuzzle(random);
    this.energyPuzzle = new EnergyPuzzle(this);
    this.guardian = new SecurityDrone();
    this.miniGuards = [];
    this.miniSpawnElapsed = null;
    this.lastMiniDefeated = null;
    this.blaster = new EnergyBlaster(this);

    this.random = random;
    this.health = this.players.map(() => ({ value: 4, max: 4, invulnerable: 0 }));
    this.runTime = this.players.map(() => 0);
    this.keyCarrier = null;
    this.progress = { hintUnlocked: false };
    this.phase = 'SYMBOLS';
    this.charge = 0;
    this.time = 0;
    this.complete = false;
    this.exitAnimation = null;
    this.hintRequested = false;
    this.helpMarker = null;
    this.message = '';
    this.ping = null;
  }

  get guardsEnabled() {
    return stage01Config.enemies.guardsEnabled;
  }

  get guards() {
    return [this.guardian, ...this.miniGuards];
  }

  updateMiniSpawns(dt) {
    if (!this.guardsEnabled || this.guardian.state !== 'dead') return;
    if (this.miniSpawnElapsed === null) {
      this.miniSpawnElapsed = 0;
      this.miniGuards = [0, 1].map(
        (targetPlayerId) =>
          new SecurityDrone({
            ...MINI_GUARD,
            targetPlayerId,
            onDefeated: (guard) => {
              this.lastMiniDefeated = guard;
            },
          }),
      );
    } else this.miniSpawnElapsed += dt;
    this.miniGuards.forEach((guard, index) => {
      if (this.miniSpawnElapsed >= index * MINI_GUARD_SPAWN_DELAY) guard.spawn(this.keyPlatform);
    });
  }

  get solids() {
    const solids = this.platforms.filter((platform) => platform.active);
    if (this.cell.state === 'CAGED') solids.push(this.cell.cage);
    return solids;
  }

  update(dt, inputs) {
    if (this.complete) return;
    this.time += dt;
    this.symbolPuzzle.update(dt);
    if (this.exitAnimation) {
      this.blaster.updateSpeech(dt);
      this.blaster.updateGemFlight(dt);
      this.exitAnimation.elapsed = Math.min(
        stage01Config.exitAnimation.duration,
        this.exitAnimation.elapsed + dt,
      );
      this.players.forEach((player) => {
        player.interactPoseMs = 250;
        player.shootPoseMs = 0;
      });
      if (this.exitAnimation.elapsed >= stage01Config.exitAnimation.duration) this.complete = true;
      return;
    }
    const effectiveInputs = inputs.map((input, index) => {
      const player = this.players[index];
      player.facilityStun = Math.max(0, (player.facilityStun || 0) - dt);
      return player.facilityStun > 0
        ? { ...input, move: 0, jump: false, interact: false, interactHeld: false, shoot: false }
        : input;
    });

    this.players.forEach((player, index) => {
      this.health[index].invulnerable = Math.max(0, this.health[index].invulnerable - dt);
      const feetBefore = player.y + player.h;
      const wasGrounded = player.grounded;
      const landableGuards = this.guardsEnabled
        ? this.guards.filter(
            (guard) => guard.active && player.vy >= 0 && feetBefore <= guard.topSurface.y,
          )
        : [];
      player.update(
        effectiveInputs[index],
        dt,
        [...this.solids, ...landableGuards.map((guard) => guard.topSurface)],
        stage01Config.width,
      );
      for (const guard of landableGuards) {
        const guardTop = guard.topSurface;
        if (
          !wasGrounded &&
          player.grounded &&
          Math.abs(player.y + player.h - guardTop.y) < 0.01 &&
          player.x + player.w > guardTop.x &&
          player.x < guardTop.x + guardTop.w
        ) {
          guard.stomp(player);
        }
      }
      this.runTime[index] =
        !player.crouched && Math.abs(player.vx) >= 220 ? this.runTime[index] + dt : 0;
      player.stage01Rushing = this.runTime[index] >= 0.25;
    });

    this.players.forEach((player, index) => {
      if (effectiveInputs[index].interact) this.interact(player);
    });

    this.updateRoutes(effectiveInputs, dt);
    this.energyPuzzle.updateCarriedCell();
    this.energyPuzzle.updateCharging(dt, effectiveInputs);
    if (this.guardsEnabled)
      this.guards.forEach((guard) =>
        guard.update(dt, this.players, this.guardsEnabled, this.solids, (player) =>
          this.damagePlayer(player),
        ),
      );
    this.blaster.update(dt, effectiveInputs);
    this.updateMiniSpawns(dt);
    if (this.health.some((health) => health.value === 0)) {
      this.reset();
      return;
    }
    this.updateExit(effectiveInputs);
    this.updateRequestedHint();
  }

  updateRoutes(inputs, dt = 1 / 120) {
    const explorer = this.players.find((player) => player.abilities.operateWinch);

    this.plate.update(this.players);

    if (this.canOperateWinch(explorer) && inputs[explorer.id].interact)
      this.winch.active = !this.winch.active;

    this.setGate(this.gateA, this.plate.active);
    this.setGate(this.gateB, this.winch.active);

    // De batterij in socket A activeert de brug
    this.bridge.active = this.cell.state === 'SOCKET_A' || ['KEY', 'EXIT'].includes(this.phase);
    this.exitSteps.forEach((p) => {
      p.active = this.phase === 'EXIT' && this.door.state !== 'LOCKED';
    });
    for (const gate of [this.gateA, this.gateB])
      gate.slide = Math.max(0, Math.min(1, (gate.slide ?? 0) + (gate.active ? -1 : 1) * dt * 3));
  }

  canOperateWinch(player) {
    return (
      ['TRANSFER', 'CHARGE', 'KEY', 'EXIT'].includes(this.phase) &&
      player.abilities.operateWinch &&
      near(player, this.winch, 12)
    );
  }

  canExit() {
    return this.phase === 'EXIT' && this.players.every((player) => this.exit.contains(player));
  }

  updateExit(inputs) {
    if (this.exitAnimation || this.complete) return;
    if (this.canExit() && this.door.open(this.players, inputs)) {
      this.exitAnimation = {
        elapsed: 0,
        starts: this.players.map((player) => ({
          x: player.x + player.w / 2,
          y: player.y + player.h,
        })),
      };
      this.players.forEach((player) => {
        player.vx = 0;
        player.vy = 0;
        player.interactPoseMs = 250;
        player.shootPoseMs = 0;
      });
    }
  }

  updateRequestedHint() {
    if (!this.helpMarker) return;

    const point = getStage01Hint(this);

    if (point.id !== this.helpMarker.id) {
      this.helpMarker = new HelpMarker(point);
    }

    const reached = this.players.some((player) => this.helpMarker.contains(player));

    if (!reached) {
      this.helpMarker.ready = true;
    } else if (this.helpMarker.ready) {
      this.message = this.helpMarker.text;
      this.helpMarker = null;
    }
  }

  setGate(gate, open) {
    if (open) {
      gate.active = false;
      return;
    }
    if (gate.active) return;
    gate.active = true;
    if (this.guardsEnabled)
      this.guards
        .filter((guard) => guard.active)
        .forEach((guard) => guard.resolveWall(gate, this.solids));
    for (const player of this.players) {
      if (!overlaps(player, gate)) continue;
      const solids = this.solids;
      // Search horizontal obstacle edges at the same height; never move through the floor.
      const candidates = [
        0,
        stage01Config.width - player.w,
        ...solids.flatMap((solid) => [solid.x - player.w - 0.01, solid.x + solid.w + 0.01]),
      ];
      const safeX = candidates
        .filter(
          (x) =>
            x >= 0 &&
            x + player.w <= stage01Config.width &&
            !solids.some((solid) => overlaps({ ...player, x }, solid)),
        )
        .sort((a, b) => Math.abs(a - player.x) - Math.abs(b - player.x))[0];
      if (safeX !== undefined) {
        player.x = safeX;
        player.vx = 0;
      }
      this.damagePlayer(player);
    }
  }

  // Preview gebruikt dezelfde voorwaarden zonder de game state te wijzigen
  interact(player, preview = false) {
    if (this.exitAnimation || this.complete) return null;
    if (player.facilityStun > 0) return null;
    const blaster = this.blaster.interact(player, preview);
    if (blaster) return preview ? blaster : undefined;
    if (this.hintDevice.canActivate(player, this.progress)) {
      if (preview) return this.hintDevice;
      this.hintDevice.activate(player, this.progress);
      return;
    }
    if (this.phase === 'SYMBOLS') {
      const result = this.symbolPuzzle.interact(player, this.players, preview);

      if (preview && result) {
        return typeof result === 'object' ? result : null;
      }

      if (result === 'COMPLETE') {
        this.cell.state = 'LOOSE';
        this.phase = 'ENTRY';
      }

      if (result) return;
    }

    if (
      this.phase === 'KEY' &&
      (preview ? this.key.canCollect(player) : this.key.collect(player))
    ) {
      if (preview) return this.key;

      this.keyCarrier = player.id;
      this.phase = 'EXIT';
      return;
    }

    if (this.phase === 'EXIT' && player.id === this.keyCarrier && near(player, this.door, 40)) {
      if (preview) {
        return this.door.state === 'LOCKED' ? this.door : null;
      }

      this.door.unlock();
      return;
    }

    // De energypuzzel handelt batterij- en socketinteracties af
    const energy = this.energyPuzzle.interact(player, preview);
    if (energy) return energy;
    if (this.guardsEnabled)
      for (const guard of this.guards) {
        const interaction = guard.interact(player, preview);
        if (interaction) return interaction;
      }
    return null;
  }

  damagePlayer(player) {
    const health = this.health[player.id];
    if (health.invulnerable > 0) return;
    health.value = Math.max(0, health.value - 1);
    health.invulnerable = 1.2;
    player.damageFlashUntil = this.time + 0.4;
  }

  reset() {
    const fresh = new Stage1(
      this.players.map((player) => player.character),
      this.random,
      this.session,
    );
    Object.assign(this, fresh);
    this.energyPuzzle.stage = this;
    this.blaster.stage = this;
  }

  requestHint() {
    if (this.exitAnimation || this.complete) return;
    this.hintRequested = true;
    this.hintDevice.reveal(this.time);
    this.helpMarker = new HelpMarker(getStage01Hint(this));
    if (!this.progress.hintUnlocked) return getStage01Communication(this);
  }

  draw(ctx, debug = false, bindings = []) {
    drawStage1(ctx, this, debug, bindings);
  }
}
