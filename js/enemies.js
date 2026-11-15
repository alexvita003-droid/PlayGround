import { TAU, clamp, lerp, rand, dist, angleTo, mulberry32 } from './util.js';
import { drawEnemyArt } from './enemyart.js';

export const ENEMY_TYPES = {
  slime: {
    name: 'Melma Verdegrigia', hp: 48, speed: 66, dmg: 9, r: 19, xp: 16, gold: 7,
    aggro: 320, windup: 0.55, recover: 1.05, reach: 44, kind: 'slime',
  },
  wolf: {
    name: 'Lupo Crepuscolare', hp: 64, speed: 128, dmg: 12, r: 17, xp: 22, gold: 9,
    aggro: 430, windup: 0.4, recover: 0.82, reach: 40, kind: 'wolf',
  },
  skeleton: {
    name: 'Sentinella d\'Ossa', hp: 96, speed: 74, dmg: 15, r: 17, xp: 34, gold: 15,
    aggro: 400, windup: 0.52, recover: 0.9, reach: 52, kind: 'skeleton', ranged: true,
  },
  wisp: {
    name: 'Fuoco Fatuo', hp: 40, speed: 92, dmg: 11, r: 15, xp: 26, gold: 12,
    aggro: 440, windup: 0.7, recover: 1.3, reach: 300, kind: 'wisp', ranged: true,
  },
  warden: {
    name: 'Guardiano Sepolto', hp: 280, speed: 78, dmg: 21, r: 24, xp: 110, gold: 60,
    aggro: 460, windup: 0.72, recover: 1.1, reach: 66, kind: 'warden', elite: true,
  },
  boss: {
    name: 'VERBENA', hp: 1500, speed: 60, dmg: 24, r: 72, xp: 800, gold: 400,
    aggro: 700, kind: 'boss',
  },
};

let uid = 1;

export class Enemy {
  constructor(type, x, y, opts = {}) {
    const cfg = ENEMY_TYPES[type];
    this.id = uid++;
    this.type = type;
    this.cfg = cfg;
    this.x = x; this.y = y;
    this.home = { x, y };
    this.hp = cfg.hp * (opts.hpMult || 1);
    this.maxHp = this.hp;
    this.r = cfg.r;
    this.speed = cfg.speed;
    this.dmg = cfg.dmg;
    this.elite = !!cfg.elite || !!opts.elite;
    this.scale = this.elite ? 1.28 : 1;
    this.state = 'idle';
    this.timer = rand(0, 1.2);
    this.facing = rand(0, TAU);
    this.vx = 0; this.vy = 0;
    this.walk = rand(0, 10);
    this.flash = 0;
    this.hurtStun = 0;
    this.dead = false;
    this.deathT = 0;
    this.spawnT = 0.6;
    this.aggro = false;
    this.attackCd = rand(0.4, 1.4);
    this.wander = { x, y };
    this.barT = 0;
    this.telegraph = 0;
    this.phase = 1;
    this.pattern = 0;
    this.bossTimer = 0;
    this.awake = false;
    this.bossAttack = null;
    this.hazardDone = false;
    this.chargeDir = { x: 0, y: 0 };
    this.temp = 0;
  }

  hurt(n, game, crit = false, fromX = 0, fromY = 0) {
    if (this.dead) return;
    this.hp -= n;
    this.flash = 1;
    this.hurtStun = this.type === 'boss' ? 0.02 : 0.22;
    this.barT = 3;
    if (this.type !== 'boss') {
      const a = Math.atan2(this.y - fromY, this.x - fromX);
      const kb = this.elite ? 60 : 170;
      this.vx += Math.cos(a) * kb;
      this.vy += Math.sin(a) * kb;
    }
    this.aggro = true;
    game?.addEffect?.('hit', { x: this.x, y: this.y - 34, crit });
    if (this.hp <= 0) {
      this.hp = 0;
      this.die(game);
    }
  }

  die(game) {
    this.dead = true;
    this.deathT = 0;
    this.state = 'dead';
    game?.onEnemyKilled?.(this);
  }

  update(dt, game) {
    if (this.dead) { this.deathT += dt; return; }
    this.flash = Math.max(0, this.flash - dt * 4);
    this.barT = Math.max(0, this.barT - dt);
    this.hurtStun = Math.max(0, this.hurtStun - dt);
    this.spawnT = Math.max(0, this.spawnT - dt);
    this.attackCd = Math.max(0, this.attackCd - dt);
    this.timer -= dt;
    this.telegraph = Math.max(0, this.telegraph - dt);
    // knockback decay
    this.vx *= Math.pow(0.002, dt);
    this.vy *= Math.pow(0.002, dt);
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    if (this.type === 'boss') { this.updateBoss(dt, game); return; }
    if (this.spawnT > 0 || this.hurtStun > 0) return;

    const p = game.player;
    const d = dist(this, p);
    const safe = game.isPlayerSafe;
    if (this.aggro && (safe || p.dead || d > this.cfg.aggro * 1.8)) {
      this.aggro = false;
      this.state = 'idle';
      this.timer = rand(0.5, 1.5);
    }
    if (!this.aggro && !safe && d < this.cfg.aggro) {
      this.aggro = true;
      this.state = 'chase';
      this.timer = 0;
    }

    if (!this.aggro) {
      // gentle wander around home
      if (this.timer <= 0) {
        this.timer = rand(1.6, 3.4);
        const a = rand(0, TAU), rr = rand(20, 90);
        this.wander = {
          x: clamp(this.home.x + Math.cos(a) * rr, 80, 4520),
          y: clamp(this.home.y + Math.sin(a) * rr, 80, 2920),
        };
      }
      const dx = this.wander.x - this.x, dy = this.wander.y - this.y;
      const dd = Math.hypot(dx, dy);
      if (dd > 8) {
        this.move(dx / dd * this.speed * 0.22 * dt, dy / dd * this.speed * 0.22 * dt, game);
        this.facing = Math.atan2(dy, dx);
        this.walk += dt * 2.5;
      }
      return;
    }

    this.facing = Math.atan2(p.y - this.y, p.x - this.x);

    switch (this.state) {
      case 'idle':
      case 'chase': {
        const keep = this.type === 'wisp' ? 240 : this.type === 'skeleton' && this.attackCd > 1.2 ? 150 : this.cfg.reach * 0.72;
        if (d > keep) {
          const sp = this.speed * (this.state === 'idle' ? 0.6 : 1);
          this.move((p.x - this.x) / d * sp * dt, (p.y - this.y) / d * sp * dt, game);
          this.walk += dt * sp / 34;
        } else if (this.type === 'wisp') {
          this.move(-(p.x - this.x) / d * this.speed * 0.5 * dt, -(p.y - this.y) / d * this.speed * 0.5 * dt, game);
        }
        if (this.attackCd <= 0) this.beginAttack(d, game);
        break;
      }
      case 'windup': {
        this.telegraph = 1;
        if (this.timer <= 0) this.releaseAttack(d, game);
        break;
      }
      case 'cast':
      case 'slamWindup':
      case 'slam':
      case 'charge':
      case 'hop':
        this.updateAction(dt, game);
        break;
      case 'recover': {
        if (this.timer <= 0) this.state = 'chase';
        break;
      }
      default: this.state = 'chase';
    }
  }

  draw(ctx, time) {
    drawEnemyArt(ctx, this, time);
    if (!this.dead && this.barT > 0 && this.type !== 'boss') {
      const w = this.elite ? 74 : 46;
      const yy = this.y - (this.type === 'slime' ? 52 : this.type === 'wisp' ? 74 : 74) * this.scale;
      ctx.fillStyle = 'rgba(4,9,7,.72)';
      ctx.fillRect(this.x - w / 2, yy, w, 5);
      ctx.fillStyle = this.elite ? '#ffc46b' : '#ff7a8a';
      ctx.fillRect(this.x - w / 2 + 1, yy + 1, (w - 2) * (this.hp / this.maxHp), 3);
    }
  }

  beginAttack(d, game) {
    this.state = 'windup';
    this.timer = this.cfg.windup;
    this.telegraph = 1;
    this.attackCd = this.cfg.recover + rand(0.5, 1.3);
    const p = game.player;
    if (this.type === 'wolf') {
      this.chargeDir = { x: (p.x - this.x) / (d || 1), y: (p.y - this.y) / (d || 1) };
    }
    if (this.type === 'skeleton' && d > 110 && d < 420 && Math.random() < 0.55) {
      this.state = 'cast';
      this.timer = 0.62;
      this.temp = 1;
      this.attackCd = 1.9;
    }
    if (this.type === 'warden') {
      this.state = 'slamWindup';
      this.timer = 1.0;
      this.temp = 0;
    }
    game.audio?.play('deny');
  }

  releaseAttack(d, game) {
    const p = game.player;
    if (this.type === 'wolf') {
      this.state = 'charge';
      this.timer = 0.34;
      this.dashSpeed = 560;
      this.hitPlayer = false;
      game.audio?.play('swing');
    } else if (this.type === 'slime') {
      this.state = 'hop';
      this.timer = 0.34;
      this.dashSpeed = 330;
      this.hitPlayer = false;
      game.audio?.play('swing');
    } else if (this.type === 'skeleton') {
      this.state = 'recover';
      this.timer = this.cfg.recover;
      game.enemyMelee(this, 54, Math.PI * 0.8, this.dmg);
      game.addEffect('slash', { x: this.x, y: this.y - 26, ang: this.facing, color: 'rgba(255,170,140,.7)', size: 42 });
      game.audio?.play('swing2');
    } else if (this.type === 'wisp') {
      this.state = 'recover';
      this.timer = this.cfg.recover;
      for (let i = -1; i <= 1; i++) {
        game.spawnProjectile({
          x: this.x, y: this.y - 26, ang: this.facing + i * 0.18, speed: 220, dmg: this.dmg,
          color: '#c6a4ff', r: 8, life: 3.4, from: 'enemy',
        });
      }
      game.audio?.play('skill');
    } else if (this.type === 'warden') {
      this.state = 'recover';
      this.timer = this.cfg.recover;
      game.addHazard({ x: p.x, y: p.y, r: 82, delay: 0.65, dur: 0.18, dmg: this.dmg, type: 'slam' });
      game.audio?.play('hit');
    }
  }

  move(dx, dy, game) {
    game.moveEntity(this, dx, dy);
  }

  updateAction(dt, game) {
    const p = game.player;
    switch (this.state) {
      case 'cast': {
        if (this.timer <= 0) {
          this.state = 'recover';
          this.timer = 0.8;
          game.spawnProjectile({ x: this.x, y: this.y - 34, ang: this.facing, speed: 300, dmg: this.dmg, color: '#ffe0a0', r: 7, life: 3, from: 'enemy', kind: 'bone' });
        }
        break;
      }
      case 'slamWindup': {
        this.telegraph = 1;
        if (this.timer <= 0) {
          this.state = 'slam';
          this.timer = 0.25;
          game.addHazard({ x: this.x + Math.cos(this.facing) * 60, y: this.y + Math.sin(this.facing) * 60, r: 70, delay: 0.15, dur: 0.16, dmg: this.dmg, type: 'slam' });
          game.shake(7);
          game.audio?.play('hit');
        }
        break;
      }
      case 'slam': {
        if (this.timer <= 0) { this.state = 'recover'; this.timer = 0.9; }
        break;
      }
      case 'charge':
      case 'hop': {
        const sp = this.dashSpeed;
        this.move(this.chargeDir ? this.chargeDir.x * sp * dt : Math.cos(this.facing) * sp * dt, this.chargeDir ? this.chargeDir.y * sp * dt : Math.sin(this.facing) * sp * dt, game);
        this.walk += dt * 12;
        if (!this.hitPlayer && dist(this, p) < this.r + p.r + 12) {
          this.hitPlayer = true;
          game.hurtPlayer(this.dmg, this);
        }
        if (this.timer <= 0) { this.state = 'recover'; this.timer = this.cfg.recover; }
        break;
      }
      default: break;
    }
  }

  // ---------- BOSS ----------
  updateBoss(dt, game) {
    const p = game.player;
    if (!this.awake) return;
    this.bossTimer -= dt;
    this.walk += dt;
    const hpFrac = this.hp / this.maxHp;
    const newPhase = hpFrac < 0.55 ? 2 : 1;
    if (newPhase !== this.phase) {
      this.phase = newPhase;
      this.state = 'enrage';
      this.timer = 1.4;
      game.onBossPhase?.(newPhase);
    }
    if (this.state === 'enrage') {
      this.timer -= dt;
      if (this.timer <= 0) this.state = 'chase';
      return;
    }
    if (this.bossAttack) {
      this.updateBossAttack(dt, game);
      return;
    }
    // reposition
    const d = dist(this, p);
    if (d > 240) {
      this.move((p.x - this.x) / d * 46 * dt, (p.y - this.y) / d * 46 * dt, game);
    } else if (d < 150) {
      this.move(-(p.x - this.x) / d * 34 * dt, -(p.y - this.y) / d * 34 * dt, game);
    }
    this.facing = lerp(this.facing, Math.atan2(p.y - this.y, p.x - this.x), 1 - Math.exp(-3 * dt));
    if (this.bossTimer <= 0) {
      this.startBossAttack(game);
    }
  }

  startBossAttack(game) {
    const p = game.player;
    const patterns = this.phase === 1
      ? ['slam', 'roots', 'slam', 'summon', 'sweep']
      : ['slam', 'roots', 'nova', 'sweep', 'summon', 'slam'];
    const type = patterns[this.pattern % patterns.length];
    this.pattern++;
    this.bossAttack = { type, t: 0, stage: 0, points: [] };
    this.bossTimer = this.phase === 1 ? 3.2 : 2.45;
    this.state = 'attack';
    game.audio?.play('roar');
    game.shake(5);
    if (type === 'slam') {
      const px = clamp(p.x, 3560, 4280), py = clamp(p.y, 1440, 2120);
      this.bossAttack.points = [{ x: px, y: py, r: 100, delay: 1.05, dur: 0.22, dmg: this.dmg }];
      if (this.phase === 2) {
        for (let i = 0; i < 3; i++) {
          const a = rand(0, TAU), rr = rand(120, 220);
          this.bossAttack.points.push({ x: clamp(px + Math.cos(a) * rr, 3580, 4260), y: clamp(py + Math.sin(a) * rr, 1460, 2100), r: 74, delay: 1.55 + i * 0.16, dur: 0.2, dmg: this.dmg * 0.8 });
        }
      }
    } else if (type === 'roots') {
      const a = Math.atan2(p.y - this.y, p.x - this.x);
      for (let i = 0; i < 7; i++) {
        const xx = this.x + Math.cos(a) * (110 + i * 52);
        const yy = this.y + Math.sin(a) * (90 + i * 45);
        this.bossAttack.points.push({ x: xx, y: yy, r: 54, delay: 0.55 + i * 0.12, dur: 0.18, dmg: this.dmg * 0.9 });
      }
      this.bossAttack.points.push({ x: p.x, y: p.y, r: 72, delay: 1.5, dur: 0.2, dmg: this.dmg });
    } else if (type === 'sweep') {
      const a0 = Math.atan2(p.y - this.y, p.x - this.x);
      for (let i = 0; i < 10; i++) {
        const a = a0 + (i / 10) * TAU;
        this.bossAttack.points.push({ x: this.x + Math.cos(a) * 200, y: this.y + Math.sin(a) * 170, r: 60, delay: 0.7 + i * 0.045, dur: 0.24, dmg: this.dmg * 0.8 });
      }
    } else if (type === 'nova') {
      this.bossAttack.rings = true;
      this.bossAttack.ringT = [0, 0.55, 1.1, 1.65].map((t, i) => ({ t, done: false, r: 120 + i * 90 }));
    } else if (type === 'summon') {
      this.bossAttack.summoned = false;
    }
  }

  updateBossAttack(dt, game) {
    const A = this.bossAttack;
    A.t += dt;
    const p = game.player;
    if (A.type === 'slam') {
      for (const pt of A.points) {
        if (!pt.spawned && A.t >= pt.delay) {
          pt.spawned = true;
          game.addHazard({ x: pt.x, y: pt.y, r: pt.r, delay: 0, dur: pt.dur, dmg: pt.dmg, type: 'bossSlam' });
          game.shake(10);
          game.audio?.play('hit');
          game.addEffect('shock', { x: pt.x, y: pt.y, r: 20, maxR: pt.r * 1.4, color: 'rgba(255,150,80,.6)' });
        }
      }
      if (A.t > 1.2) this.endBossAttack();
    } else if (A.type === 'roots') {
      let all = true;
      for (const pt of A.points) {
        if (!pt.spawned && A.t >= pt.delay) {
          pt.spawned = true;
          game.addHazard({ x: pt.x, y: pt.y, r: pt.r, delay: 0, dur: pt.dur + 0.1, dmg: pt.dmg, type: 'root' });
          game.addEffect('spikes', { x: pt.x, y: pt.y, size: pt.r * 0.8 });
          game.audio?.play('swing');
        }
      }
      if (A.t > 2.1) this.endBossAttack();
    } else if (A.type === 'sweep') {
      for (const pt of A.points) {
        if (!pt.spawned && A.t >= pt.delay) {
          pt.spawned = true;
          game.addHazard({ x: pt.x, y: pt.y, r: pt.r, delay: 0.12, dur: 0.18, dmg: pt.dmg, type: 'root' });
          game.addEffect('spikes', { x: pt.x, y: pt.y, size: pt.r * 0.7 });
        }
      }
      if (A.t > 2.2) this.endBossAttack();
    } else if (A.type === 'nova') {
      for (const ring of A.rings2 || []) { /* unused */ }
      for (const ring of A.rings) {
        if (!ring.done && A.t >= ring.t) {
          ring.done = true;
          game.addEffect('shock', { x: this.x, y: this.y, r: 30, maxR: ring.r + 120, color: 'rgba(255,120,90,.65)', ring: true });
          // ring damage check
          const dd = dist(this, p);
          if (Math.abs(dd - (ring.r + 100)) < 46) game.hurtPlayer(this.dmg * 0.7, this);
          game.audio?.play('ult');
          game.shake(8);
        }
      }
      if (A.t > 2.3) this.endBossAttack();
    } else if (A.type === 'summon') {
      if (!A.summoned && A.t > 0.8) {
        A.summoned = true;
        for (let i = 0; i < 2; i++) {
          const a = rand(0, TAU), rr = rand(160, 250);
          game.spawnMinion('wisp', this.x + Math.cos(a) * rr, this.y + Math.sin(a) * rr);
        }
        game.addEffect('shock', { x: this.x, y: this.y, r: 20, maxR: 180, color: 'rgba(200,150,255,.5)' });
      }
      if (A.t > 1.6) this.endBossAttack();
    }
  }

  endBossAttack() {
    this.bossAttack = null;
    this.state = 'chase';
  }
}
