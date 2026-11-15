import { TAU, clamp, lerp, rand, randInt, pick, dist, angleTo, shortAngle, chance, safeLocalGet, safeLocalSet, safeLocalDel } from './util.js';
import { world, generateWorld, isSafe, zoneAt, CAMP, CAMPFIRE, NPC, BOARD, ARENA, LAKES, inLake, WORLD } from './world.js';
import { Player, CLASSES } from './player.js';
import { Enemy } from './enemies.js';
import { Effects } from './effects.js';
import { renderGame } from './render.js';

const SAVE_KEY = 'frontiera_save_v1';
const RELICS = [
  { name: 'Anello del Colosso', stat: 'atk', value: 0.06, desc: '+6% Attacco' },
  { name: 'Amuleto del Bosco', stat: 'hp', value: 20, desc: '+20 Vita' },
  { name: 'Occhio di Aether', stat: 'crit', value: 0.05, desc: '+5% Critico' },
  { name: 'Stivali del Vento', stat: 'speed', value: 14, desc: '+14 Velocità' },
  { name: 'Lacrima di Verbena', stat: 'atk', value: 0.1, desc: '+10% Attacco' },
];

const QUEST_DATA = [
  { name: 'Il risveglio del Bosco', obj: 'Abbatti 6 creature del Bosco Sospeso', total: 6 },
  { name: 'Le Ossa del Passato', obj: 'Distruggi 8 non-morti alle Rovine di Aether', total: 8 },
  { name: 'La via del Colosso', obj: 'Raggiungi l\'Arena Radicata a est', total: 1 },
  { name: 'Il Colosso Radicato', obj: 'Sconfiggi VERBENA, il Colosso Radicato', total: 1 },
];

export class Game {
  constructor(canvas, minimap, audio, ui) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.minimap = minimap;
    this.mctx = minimap.getContext('2d');
    this.audio = audio;
    this.ui = ui;
    this.player = null;
    this.enemies = [];
    this.projectiles = [];
    this.hazards = [];
    this.drops = [];
    this.pendingStrikes = [];
    this.respawns = [];
    this.effects = new Effects();
    this.cam = { x: CAMP.x, y: CAMP.y, scale: 1, vw: 1200, vh: 800 };
    this.started = false;
    this.paused = false;
    this.time = 0;
    this.realTime = 0;
    this.shakeAmt = 0;
    this.hitStop = 0;
    this.questStage = 0;
    this.qKills = 0;
    this.qTotal = 6;
    this.combo = 0;
    this.comboTimer = 0;
    this.boss = null;
    this.bossIntro = 0;
    this.victory = false;
    this.victoryTimer = 0;
    this.deathTimer = 0;
    this.endShown = false;
    this.stats = { kills: 0, deaths: 0, time: 0, goldEarned: 0, relics: [] };
    this.keys = new Set();
    this.touchMove = { x: 0, y: 0 };
    this.attackHeld = false;
    this.interactHint = null;
    this.barrierCd = 0;
    this.autosaveT = 0;
    this.hudT = 0;
    this.zone = '';
    this._last = 0;
    this._raf = null;
    this._loop = this._loop.bind(this);
    this.bindInput();
    this.resize();
  }

  bindInput() {
    window.addEventListener('keydown', e => {
      if (!this.started) return;
      if (e.code === 'Escape') { this.ui.togglePause?.(); return; }
      if (this.ui.isBlocking?.()) return;
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
      this.keys.add(e.code);
      if (e.repeat) return;
      if (e.code === 'Space' || e.code === 'KeyJ') this.tryAttack();
      else if (e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.code === 'KeyK') this.tryDash();
      else if (e.code === 'KeyQ') this.useSkill(1);
      else if (e.code === 'KeyE') this.useSkill(2);
      else if (e.code === 'KeyF') this.interact();
    }, { passive: false });
    window.addEventListener('keyup', e => { this.keys.delete(e.code); });
    window.addEventListener('blur', () => { this.keys.clear(); this.touchMove.x = 0; this.touchMove.y = 0; });
    window.addEventListener('contextmenu', e => e.preventDefault());
    this.canvas.addEventListener('pointerdown', e => {
      if (e.pointerType === 'mouse' && this.started && !this.ui.isBlocking()) this.tryAttack();
    });
  }

  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.dpr = dpr;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.vw = w; this.vh = h;
    const base = Math.min(w, h);
    this.cam.scale = clamp(base / 800, 0.6, 1.08);
    if (w > 1000 && h > 640) this.cam.scale = clamp(Math.min(w / 1250, h / 780), 0.82, 1.12);
    this.cam.vw = w / this.cam.scale;
    this.cam.vh = h / this.cam.scale;
    this.clampCamera();
  }

  clampCamera() {
    const { vw, vh } = this.cam;
    this.cam.x = vw >= WORLD.w ? WORLD.w / 2 : clamp(this.cam.x, vw / 2, WORLD.w - vw / 2);
    this.cam.y = vh >= WORLD.h ? WORLD.h / 2 : clamp(this.cam.y, vh / 2, WORLD.h - vh / 2);
  }

  start(clsKey, save = null) {
    if (!world.trees.length) { generateWorld(); }
    this.player = new Player(clsKey);
    this.enemies.length = 0; this.projectiles.length = 0; this.hazards.length = 0;
    this.drops.length = 0; this.pendingStrikes.length = 0; this.respawns.length = 0;
    this.effects.clear();
    this.questStage = 0; this.qKills = 0; this.qTotal = 6;
    this.combo = 0; this.comboTimer = 0; this.boss = null; this.bossIntro = 0;
    this.victory = false; this.victoryTimer = 0; this.deathTimer = 0; this.endShown = false;
    this.stats = { kills: 0, deaths: 0, time: 0, goldEarned: 0, relics: [] };
    this.time = 0; this.realTime = 0; this.shakeAmt = 0; this.hitStop = 0;
    this.autosaveT = 0; this.barrierCd = 0;
    if (save) this.restore(save);
    this.spawnInitial();
    this.cam.x = this.player.x; this.cam.y = this.player.y;
    this.clampCamera();
    this.started = true; this.paused = false;
    this.zone = zoneAt(this.player.x, this.player.y).name;
    this.ui.quest?.(this);
    this.ui.bossBar?.(this, false);
    this.save();
  }

  spawnInitial() {
    const roster = [
      ['slime', 1460, 1470], ['slime', 1580, 1550], ['slime', 1690, 1430], ['slime', 1530, 1650],
      ['wolf', 1880, 1720], ['wolf', 2050, 1560], ['wolf', 2220, 1840], ['wolf', 2150, 2150],
      ['skeleton', 2720, 1080], ['skeleton', 2850, 1210], ['skeleton', 3020, 980], ['skeleton', 3150, 1150],
      ['wisp', 2820, 1330], ['warden', 2930, 880],
    ];
    for (const [type, x, y] of roster) {
      const spot = this.findSpot(x, y);
      this.enemies.push(new Enemy(type, spot.x, spot.y));
    }
    if (this.questStage >= 3 && !this.victory) {
      this.boss = new Enemy('boss', ARENA.x, ARENA.y);
      this.boss.awake = true;
      this.boss.awake = true;
      this.enemies.push(this.boss);
    }
  }

  findSpot(x, y) {
    for (let i = 0; i < 14; i++) {
      const s = i === 0 ? { x, y } : { x: x + rand(-70, 70), y: y + rand(-70, 70) };
      if (this.isFree(s.x, s.y, 22)) return s;
    }
    return { x, y };
  }

  restore(s) {
    const p = this.player;
    p.level = s.level || 1;
    p.xp = s.xp || 0;
    p.xpNext = s.xpNext || 60;
    p.gear = { atk: 0, hp: 0, crit: 0, speed: 0, ...(s.gear || {}) };
    p.applyStats();
    p.hp = s.hp ?? p.maxHp;
    p.gold = s.gold || 0;
    p.shards = s.shards || 0;
    p.kills = s.kills || 0;
    p.x = s.x ?? 760; p.y = s.y ?? 1780;
    this.questStage = s.questStage ?? 0;
    this.qKills = s.qKills ?? 0;
    this.qTotal = QUEST_DATA[this.questStage]?.total || 6;
    this.stats = { kills: 0, deaths: 0, time: 0, goldEarned: 0, relics: [], ...(s.stats || {}) };
    if (s.victory) {
      this.victory = true;
    }
    if (s.pos) { p.x = s.pos.x; p.y = s.pos.y; }
  }

  save() {
    if (!this.player) return;
    const p = this.player;
    safeLocalSet(SAVE_KEY, {
      v: 1, cls: p.clsKey, level: p.level, xp: p.xp, xpNext: p.xpNext, gear: p.gear,
      hp: p.hp, gold: p.gold, shards: p.shards, kills: p.kills,
      questStage: this.questStage, qKills: this.qKills, stats: this.stats,
      victory: this.victory, pos: { x: p.x, y: p.y },
      savedAt: Date.now(),
    });
  }

  static loadSave() { return safeLocalGet(SAVE_KEY); }
  static clearSave() { safeLocalDel(SAVE_KEY); }

  _loop(ts) {
    this._raf = requestAnimationFrame(this._loop);
    if (!this.started) return;
    const dtReal = Math.min(0.05, (ts - this._last) / 1000 || 0.016);
    this._last = ts;
    this.realTime += dtReal;
    if (!this.paused) this.update(dtReal);
    renderGame(this);
    this.hudT -= dtReal;
    if (this.hudT <= 0) { this.hudT = 0.06; this.ui.update?.(this); }
  }

  run() {
    if (!this._raf) { this._last = performance.now(); this._raf = requestAnimationFrame(this._loop); }
  }

  update(dt) {
    this.time += dt;
    this.stats.time += dt;
    this.shakeAmt *= Math.pow(0.0015, dt);
    this.barrierCd = Math.max(0, this.barrierCd - dt);
    this.bossIntro = Math.max(0, this.bossIntro - dt);
    this.comboTimer = Math.max(0, this.comboTimer - dt);
    if (this.comboTimer === 0) this.combo = 0;
    this.interactHint = null;

    if (this.hitStop > 0) {
      this.hitStop -= dt;
      this.effects.update(dt * 0.25);
      return;
    }
    const p = this.player;
    if (this.victory) {
      this.victoryTimer += dt;
      this.effects.update(dt * 0.5);
      this.updateCamera(dt);
      if (this.victoryTimer > 2.4 && !this.endShown) {
        this.endShown = true;
        this.ui.end?.(true, this);
      }
      return;
    }

    // movement input
    const mv = { x: 0, y: 0 };
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) mv.x -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) mv.x += 1;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) mv.y -= 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) mv.y += 1;
    mv.x += this.touchMove.x; mv.y += this.touchMove.y;
    const len = Math.hypot(mv.x, mv.y);
    if (len > 1) { mv.x /= len; mv.y /= len; }
    if (this.attackHeld) this.tryAttack();

    p.update(dt, this.time, {
      move: mv,
      onDashTrail: () => this.effects.dashGhost(p.x, p.y, p.facing, p.cls),
      onStep: () => {
        this.audio.footstep();
        if (Math.random() < 0.5) this.effects.particles.push({
          type: 'smoke', x: p.x - p.vx * 0.02, y: p.y - 1, vx: rand(-10, 10), vy: rand(-16, -4),
          life: 0.4, max: 0.4, size: 3, color: '#9fb99f', drag: 2,
        });
      },
    });
    this.moveEntity(p, p.vx * dt, p.vy * dt);

    // safe camp regen
    if (isSafe(p.x, p.y)) {
      p.hp = Math.min(p.maxHp, p.hp + dt * 9);
      p.mp = Math.min(p.maxMp, p.mp + dt * 7);
    }
    this.applyBarrier();

    // player attack hit
    if (p.attack && !p.attack.hit && p.attack.t > p.attack.dur * 0.28) {
      p.attack.hit = true;
      this.meleeDamage(p.attack.combo, p.attack.dur);
    }
    // pending lightning
    for (let i = this.pendingStrikes.length - 1; i >= 0; i--) {
      const s = this.pendingStrikes[i];
      s.t -= dt;
      if (s.t <= 0) {
        this.pendingStrikes.splice(i, 1);
        this.strikeLightning(s.x, s.y, s.mult);
      }
    }

    // enemies
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      e.update(dt, this);
      if (e.dead && e.deathT > 0.95) {
        this.enemies.splice(i, 1);
        if (e === this.boss) this.boss = null;
      }
    }
    // separation
    for (let i = 0; i < this.enemies.length; i++) {
      const a = this.enemies[i];
      if (a.dead) continue;
      for (let j = i + 1; j < this.enemies.length; j++) {
        const b = this.enemies[j];
        if (b.dead) continue;
        const dx = b.x - a.x, dy = b.y - a.y;
        const dd = Math.hypot(dx, dy) || 1;
        const min = a.r + b.r;
        if (dd < min) {
          const push = (min - dd) * 0.5;
          a.x -= dx / dd * push; a.y -= dy / dd * push;
          b.x += dx / dd * push; b.y += dy / dd * push;
        }
      }
    }
    // respawns
    for (let i = this.respawns.length - 1; i >= 0; i--) {
      const r = this.respawns[i];
      r.t -= dt;
      if (r.t <= 0) {
        this.respawns.splice(i, 1);
        if (dist(this.player, r) > 500) {
          const spot = this.findSpot(r.x, r.y);
          this.enemies.push(new Enemy(r.type, spot.x, spot.y, { elite: r.elite }));
        } else r.t = 6;
      }
    }

    this.updateProjectiles(dt);
    this.updateHazards(dt);
    this.updateDrops(dt);
    this.effects.update(dt);
    this.updateCamera(dt);
    this.updateQuestProgress();
    this.updateInteractions();
    this.audio.muted = this.audio.muted;
    if (this.autosaveT > 0) this.autosaveT -= dt;
    else { this.autosaveT = 14; this.save(); }
    if (p.dead && !this.endShown) {
      this.deathTimer += dt;
      if (this.deathTimer > 1.5) { this.endShown = true; this.ui.end?.(false, this); }
    }
  }

  updateCamera(dt) {
    const p = this.player;
    const look = p.dead ? 0 : 34;
    const tx = p.x + Math.cos(p.facing) * look;
    const ty = p.y - 16 + Math.sin(p.facing) * look * 0.6;
    const k = 1 - Math.exp(-5.4 * dt);
    this.cam.x = lerp(this.cam.x, tx, k);
    this.cam.y = lerp(this.cam.y, ty, k);
    this.clampCamera();
  }

  applyBarrier() {
    if (this.questStage >= 2) return;
    const p = this.player;
    if (p.x > 3525 && p.y > 1360 && p.y < 2200) {
      p.x = 3525;
      if (this.barrierCd <= 0) {
        this.barrierCd = 2.4;
        this.ui.toast('Un sigillo antico ti respinge. Completa le missioni.', 'violet');
        this.audio.play('deny');
        this.effects.ring(3590, p.y, 20, 130, 'rgba(190,150,255,.7)', 0.6, 4);
      }
    }
  }

  updateQuestProgress() {
    const p = this.player;
    if (this.questStage === 2) {
      const d = Math.hypot(p.x - ARENA.x, p.y - ARENA.y);
      if (d < ARENA.r - 40) this.startBossFight();
    }
    const z = zoneAt(p.x, p.y);
    if (z.name !== this.zone) {
      this.zone = z.name;
      this.ui.zone?.(this.zone);
    }
  }

  startBossFight() {
    this.questStage = 3;
    this.qKills = 0;
    this.qTotal = 1;
    this.boss = new Enemy('boss', ARENA.x, ARENA.y - 20);
    this.boss.hp += this.player.level * 55;
    this.boss.maxHp = this.boss.hp;
    this.boss.awake = true;
    this.enemies.push(this.boss);
    this.bossIntro = 2.2;
    this.shake(14);
    this.audio.play('boss');
    this.ui.toast('VERBENA, IL COLOSSO RADICATO SI RISVEGLIA', 'rose');
    this.ui.quest?.(this);
    this.ui.bossBar?.(this, true);
    this.save();
  }

  onBossPhase(n) {
    this.ui.toast('VERBENA È INFURIATA — FASE II', 'rose');
    this.audio.play('roar');
    this.shake(18);
    this.effects.ring(this.boss.x, this.boss.y, 20, 320, 'rgba(255,140,70,.8)', 0.8, 5);
    this.boss.hp += 0;
  }

  spawnMinion(type, x, y) {
    const e = new Enemy(type, x, y);
    e.aggro = true;
    e.spawnT = 0.5;
    this.enemies.push(e);
    this.effects.ring(x, y, 8, 60, 'rgba(200,150,255,.6)', 0.4, 2);
  }

  // ---------------- combat ----------------
  tryAttack() {
    if (this.paused || !this.player || this.player.dead || this.victory) return;
    const p = this.player;
    if (!p.canAttack()) return;
    // soft aim assist
    const target = this.nearestEnemy(165);
    if (target) {
      const a = angleTo(p, target);
      if (Math.abs(shortAngle(p.facing, a)) < 1.5) p.facing = lerp(p.facing, a, 0.65);
    }
    const atk = p.startAttack();
    this.audio.play(atk.combo === 3 ? 'swing2' : 'swing');
    const step = atk.combo === 3 ? 12 : 7;
    this.moveEntity(p, Math.cos(p.facing) * step, Math.sin(p.facing) * step);
    this.effects.slash(p.x, p.y - 30, p.facing, atk.combo === 3 ? 'rgba(255,235,180,.85)' : 'rgba(220,255,240,.75)', atk.combo === 3 ? 62 : 50, atk.combo === 3 ? 2.6 : 1.9);
    if (atk.combo === 3) this.shake(2);
  }

  meleeDamage(combo, dur) {
    const p = this.player;
    const range = combo === 3 ? 112 : 96;
    const arc = combo === 3 ? TAU * 0.86 : TAU * 0.42;
    let hits = 0;
    for (const e of this.enemies) {
      if (e.dead || e.spawnT > 0) continue;
      const d = dist(p, e);
      if (d > range + e.r) continue;
      const a = angleTo(p, e);
      const diff = Math.abs(shortAngle(p.facing, a));
      if (diff > arc / 2) continue;
      const crit = Math.random() < p.crit;
      let dmg = (13 + p.level * 1.5) * p.atkPower * (1 + (combo - 1) * 0.13) * rand(0.92, 1.08);
      if (crit) dmg *= 1.85;
      dmg = Math.round(dmg);
      e.hurt(dmg, this, crit, p.x, p.y);
      this.stats.dmgDealt = (this.stats.dmgDealt || 0) + dmg;
      this.combo++; this.comboTimer = 2.8;
      this.effects.hitBurst(e.x, e.y - 34 * (e.scale || 1), crit ? '#ffcf6e' : '#ffe3a0', crit);
      this.effects.text(e.x + rand(-8, 8), e.y - 46 * (e.scale || 1), (crit ? '✦ ' : '') + dmg, crit ? '#ffd166' : '#fff3d0', crit ? 23 : 16);
      this.hitStop = Math.max(this.hitStop, crit ? 0.055 : 0.032);
      this.shake(crit ? 5 : 3);
      this.audio.play(crit ? 'crit' : 'hit');
      hits++;
      if (e.type === 'boss') {
        this.ui.bossBar?.(this, true);
      }
    }
    if (hits > 0) p.comboHits = (p.comboHits || 0) + hits;
  }

  tryDash() {
    const p = this.player;
    if (!p || p.dead || this.paused || p.dash > 0 || p.dashCd > 0) return;
    if (p.sta < 24) { this.audio.play('deny'); return; }
    p.sta -= 24;
    const mv = { x: 0, y: 0 };
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) mv.x -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) mv.x += 1;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) mv.y -= 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) mv.y += 1;
    mv.x += this.touchMove.x; mv.y += this.touchMove.y;
    const l = Math.hypot(mv.x, mv.y);
    if (l > 0.2) p.facing = Math.atan2(mv.y, mv.x);
    p.dashDir = { x: Math.cos(p.facing), y: Math.sin(p.facing) };
    p.dash = 0.18;
    p.dashCd = 0.55;
    p.invuln = 0.3;
    this.audio.play('dash');
    this.effects.ring(p.x, p.y, 8, 46, 'rgba(180,255,220,.6)', 0.35, 2);
  }

  useSkill(n) {
    const p = this.player;
    if (!p || p.dead || this.paused || this.victory) return;
    if (n === 1) {
      if (p.skillCd > 0) { this.audio.play('deny'); return; }
      if (p.mp < 26) { this.ui.toast('Energia insufficiente', 'violet'); this.audio.play('deny'); return; }
      p.mp -= 26; p.skillCd = 5.5; p.invuln = Math.max(p.invuln, 0.3);
      this.audio.play('skill');
      this.shake(7);
      this.effects.ring(p.x, p.y, 20, 170, 'rgba(157,245,200,.8)', 0.5, 4);
      for (let i = 0; i < 4; i++) {
        this.effects.slash(p.x, p.y - 30, p.facing + i * TAU / 4, 'rgba(200,255,230,.8)', 74, 2.2);
      }
      for (const e of this.enemies) {
        if (e.dead) continue;
        if (dist(p, e) > 150 + e.r) continue;
        let dmg = Math.round((21 + p.level * 2.1) * p.atkPower * rand(0.95, 1.1));
        const crit = Math.random() < p.crit;
        if (crit) dmg = Math.round(dmg * 1.85);
        e.hurt(dmg, this, crit, p.x, p.y);
        this.effects.text(e.x, e.y - 50, dmg, crit ? '#ffd166' : '#e4ffe9', crit ? 22 : 17);
        this.combo++; this.comboTimer = 2.8;
      }
      this.hitStop = 0.05;
    } else if (n === 2) {
      if (p.ultCd > 0) { this.audio.play('deny'); return; }
      if (p.mp < 55) { this.ui.toast('Energia insufficiente', 'violet'); this.audio.play('deny'); return; }
      p.mp -= 55; p.ultCd = 16; p.invuln = 0.9;
      this.audio.play('ult');
      this.shake(10);
      this.ui.toast('FURIA DEL CIELO', 'gold');
      for (let i = 0; i < 6; i++) {
        const a = rand(0, TAU), rr = i === 0 ? 40 : rand(60, 230);
        let x = p.x + Math.cos(a) * rr, y = p.y + Math.sin(a) * rr;
        const target = this.nearestEnemy(280);
        if (target && i < 3) {
          x = target.x + rand(-30, 30); y = target.y + rand(-20, 20);
          if (dist({ x, y }, p) > 300) { x = p.x + (x - p.x) * 0.5; y = p.y + (y - p.y) * 0.5; }
        }
        this.pendingStrikes.push({ x, y, t: 0.15 + i * 0.11, mult: i === 0 ? 2.6 : 2.2 });
      }
    }
  }

  strikeLightning(x, y, mult) {
    this.effects.bolt(x, y);
    this.audio.play('hit');
    this.shake(5);
    for (const e of this.enemies) {
      if (e.dead) continue;
      if (dist({ x, y }, e) > 92 + e.r) continue;
      const crit = Math.random() < this.player.crit;
      let dmg = Math.round((19 + this.player.level * 2) * this.player.atkPower * mult * rand(0.9, 1.1));
      if (crit) dmg = Math.round(dmg * 1.8);
      e.hurt(dmg, this, crit, x, y);
      this.effects.text(e.x, e.y - 48, dmg, '#fff0b0', 20);
      this.combo++; this.comboTimer = 2.8;
    }
    this.hitStop = 0.04;
  }

  hurtPlayer(dmg, source) {
    const p = this.player;
    if (!p || p.dead) return;
    if (p.invuln > 0) return;
    const applied = p.hurt(dmg, this);
    if (!applied) return;
    this.shake(9);
    this.combo = 0; this.comboTimer = 0;
    this.effects.hitBurst(p.x, p.y - 34, '#ff8a96', false);
    this.effects.text(p.x, p.y - 60, '-' + Math.round(dmg), '#ff8a96', 19);
    this.audio.play('hurt');
    this.hitStop = Math.max(this.hitStop, 0.05);
    if (p.dead) {
      this.onPlayerDeath();
    }
  }

  onPlayerDeath() {
    const p = this.player;
    this.stats.deaths++;
    this.audio.play('death');
    this.shake(16);
    this.effects.deathBurst(p.x, p.y, '#ff9aa6');
    this.effects.ring(p.x, p.y, 10, 140, 'rgba(255,120,130,.6)', 0.8, 4);
    this.deathTimer = 0;
    this.save();
  }

  onPlayerHurt() { /* player-side hook */ }

  enemyMelee(e, range, arc, dmg) {
    const p = this.player;
    if (p.dead) return;
    const d = dist(e, p);
    if (d > range + p.r) return;
    const a = angleTo(e, p);
    if (Math.abs(shortAngle(e.facing, a)) > arc / 2) return;
    this.hurtPlayer(dmg, e);
  }

  spawnProjectile(cfg) {
    this.projectiles.push({
      x: cfg.x, y: cfg.y, vx: Math.cos(cfg.ang) * cfg.speed, vy: Math.sin(cfg.ang) * cfg.speed,
      r: cfg.r || 8, dmg: cfg.dmg || 10, color: cfg.color || '#c7a4ff', life: cfg.life || 3,
      from: cfg.from || 'enemy', kind: cfg.kind || 'orb', t: 0,
    });
  }

  updateProjectiles(dt) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const b = this.projectiles[i];
      b.t += dt; b.life -= dt;
      b.x += b.vx * dt; b.y += b.vy * dt;
      if (b.life <= 0) { this.projectiles.splice(i, 1); continue; }
      if (Math.random() < 0.4) this.effects.particles.push({
        type: 'glow', x: b.x, y: b.y, vx: rand(-10, 10), vy: rand(-10, 10), life: 0.25, max: 0.25,
        size: b.r * 1.2, color: b.color, drag: 2,
      });
      if (b.from === 'enemy' && dist(b, this.player) < b.r + this.player.r) {
        this.hurtPlayer(b.dmg, b);
        this.effects.ring(b.x, b.y, 4, 30, b.color, 0.3, 2);
        this.projectiles.splice(i, 1);
      }
    }
  }

  addHazard(cfg) {
    this.hazards.push({
      x: cfg.x, y: cfg.y, r: cfg.r, delay: cfg.delay ?? 0.5, dur: cfg.dur ?? 0.2,
      dmg: cfg.dmg, type: cfg.type || 'slam', t: 0, triggered: false, hit: false,
    });
  }

  updateHazards(dt) {
    for (let i = this.hazards.length - 1; i >= 0; i--) {
      const h = this.hazards[i];
      h.t += dt;
      if (!h.triggered && h.t >= h.delay) {
        h.triggered = true;
        if (!h.hit && dist(h, this.player) < h.r + this.player.r * 0.6) {
          h.hit = true;
          this.hurtPlayer(h.dmg, h);
        }
        if (h.type === 'root') {
          for (let k = 0; k < 8; k++) {
            this.effects.particles.push({
              type: 'spark', x: h.x + rand(-h.r * 0.6, h.r * 0.6), y: h.y + rand(-6, 6),
              vx: rand(-60, 60), vy: rand(-190, -80), life: rand(0.3, 0.6), max: 0.6,
              size: rand(1.5, 3.5), color: '#8fb069', drag: 2.4, grav: 360,
            });
          }
          this.effects.ring(h.x, h.y, 8, h.r * 1.3, 'rgba(160,210,120,.6)', 0.4, 3);
        } else if (h.type === 'bossSlam') {
          this.effects.ring(h.x, h.y, 10, h.r * 1.5, 'rgba(255,150,80,.8)', 0.5, 5);
          this.effects.hitBurst(h.x, h.y, '#ffb066', false);
        } else if (h.type === 'slam') {
          this.effects.ring(h.x, h.y, 8, h.r * 1.2, 'rgba(255,140,100,.7)', 0.4, 3);
        }
        this.shake(4);
        this.audio.play('hit');
      }
      if (h.t > h.delay + h.dur) this.hazards.splice(i, 1);
    }
  }

  spawnDrop(x, y, kind, value, extra = {}) {
    const n = kind === 'gold' ? randInt(2, 4) : 1;
    for (let i = 0; i < n; i++) {
      this.drops.push({
        x: x + rand(-14, 14), y: y + rand(-10, 10), vx: rand(-70, 70), vy: rand(-130, -40),
        z: 8, vz: rand(60, 150), kind, value: kind === 'gold' ? Math.max(1, Math.round(value / n)) : value,
        life: 40, phase: rand(0, TAU), ...extra,
      });
    }
  }

  updateDrops(dt) {
    const p = this.player;
    for (let i = this.drops.length - 1; i >= 0; i--) {
      const d = this.drops[i];
      d.life -= dt;
      d.phase += dt * 3;
      if (d.z > 0) {
        d.vz -= 520 * dt;
        d.z += d.vz * dt;
        if (d.z <= 0) { d.z = 0; if (d.vz < -40) { d.vz *= -0.42; } else d.vz = 0; }
        d.x += d.vx * dt; d.y += d.vy * dt;
        d.vx *= Math.exp(-4 * dt); d.vy *= Math.exp(-4 * dt);
      } else {
        const distP = dist(d, p);
        if (distP < 170 && !p.dead) {
          const a = angleTo(d, p);
          const sp = 300 + (170 - distP) * 2.4;
          d.x += Math.cos(a) * sp * dt;
          d.y += Math.sin(a) * sp * dt;
        }
        if (distP < 26 && !p.dead) {
          this.collectDrop(d);
          this.drops.splice(i, 1);
          continue;
        }
      }
      if (d.life <= 0) this.drops.splice(i, 1);
    }
  }

  collectDrop(d) {
    const p = this.player;
    if (d.kind === 'gold') {
      p.gold += d.value; this.stats.goldEarned += d.value;
      this.audio.play('coin');
      this.effects.text(p.x + rand(-10, 10), p.y - 58, '+' + d.value + ' ◈', '#ffcf6e', 13, -36);
      this.effects.particles.push({ type: 'glow', x: d.x, y: d.y - 8, vx: 0, vy: -40, life: 0.3, max: 0.3, size: 10, color: '#ffcf6e' });
    } else if (d.kind === 'shard') {
      p.shards += d.value;
      this.audio.play('pickup');
      this.ui.toast('Frammento di Aether +' + d.value, 'violet');
      this.effects.text(p.x, p.y - 62, '+' + d.value + ' ✦', '#d9c4ff', 15, -40);
    } else if (d.kind === 'relic') {
      this.applyRelic(d.relic);
    }
  }

  applyRelic(relic) {
    const p = this.player;
    p.gear[relic.stat] = (p.gear[relic.stat] || 0) + relic.value;
    p.applyStats();
    if (relic.stat === 'hp') p.hp = Math.min(p.maxHp, p.hp + relic.value);
    this.stats.relics.push(relic.name);
    this.audio.play('quest');
    this.ui.toast('RELIQUIA · ' + relic.name + ' — ' + relic.desc, 'gold');
    this.effects.heal(p.x, p.y);
    this.save();
  }

  onEnemyKilled(e) {
    this.stats.kills++;
    this.player.kills++;
    this.effects.deathBurst(e.x, e.y, e.type === 'skeleton' || e.type === 'warden' ? '#d9d3ba' : e.type === 'wisp' ? '#c7a4ff' : '#a8e07a');
    this.audio.play('death');
    const xp = e.cfg.xp;
    this.effects.text(e.x, e.y - 60, '+' + xp + ' EXP', '#a8f0c8', 13, -34);
    this.player.addXp(xp, () => this.onLevelUp());
    this.spawnDrop(e.x, e.y, 'gold', e.cfg.gold);
    if (chance(0.09) || e.elite) this.spawnDrop(e.x, e.y, 'shard', e.elite ? 3 : 1);
    if (e.elite && chance(0.9)) this.spawnDrop(e.x, e.y, 'relic', 0, { relic: pick(RELICS) });
    if (e.type === 'boss') {
      this.onBossDefeated(e);
      return;
    }
    this.respawns.push({ t: 24, x: e.home.x, y: e.home.y, type: e.type, elite: e.elite });
    this.countQuestKill(e);
    this.ui.bossBar?.(this, !!this.boss);
  }

  countQuestKill(e) {
    let valid = false;
    if (this.questStage === 0 && (e.type === 'slime' || e.type === 'wolf')) valid = true;
    if (this.questStage === 1 && (e.type === 'skeleton' || e.type === 'wisp' || e.type === 'warden')) valid = true;
    if (!valid) return;
    this.qKills++;
    this.save();
    if (this.qKills >= this.qTotal) this.completeQuest();
    else this.ui.quest?.(this);
  }

  completeQuest() {
    const p = this.player;
    const reward = 80 + this.questStage * 70;
    p.gold += reward;
    p.shards += 1;
    this.stats.goldEarned += reward;
    p.addXp(50 + this.questStage * 30, () => this.onLevelUp());
    this.questStage++;
    this.qKills = 0;
    this.qTotal = QUEST_DATA[this.questStage]?.total || 1;
    this.audio.play('quest');
    this.ui.toast('MISSIONE COMPLETATA · +' + reward + ' ◈  +1 ✦', 'gold');
    this.ui.quest?.(this);
    this.effects.heal(p.x, p.y);
    this.save();
    if (this.questStage === 2) {
      setTimeout(() => this.ui.toast('La via per l\'Arena Radicata è aperta. Vai a est.', 'violet'), 600);
    }
  }

  onLevelUp() {
    const p = this.player;
    this.audio.play('level');
    this.ui.toast('LIVELLO ' + p.level + ' · Vita e Attacco aumentati', 'gold');
    this.effects.heal(p.x, p.y);
    this.effects.ring(p.x, p.y, 10, 100, 'rgba(255,220,140,.8)', 0.7, 4);
    this.effects.text(p.x, p.y - 80, 'LIVELLO ' + p.level, '#ffe6a8', 24, -50);
    this.save();
  }

  onBossDefeated(e) {
    const p = this.player;
    this.victory = true;
    this.victoryTimer = 0;
    this.audio.play('win');
    this.shake(24);
    this.hitStop = 0.25;
    this.effects.deathBurst(e.x, e.y, '#ffe3a0');
    for (let i = 0; i < 5; i++) {
      this.effects.ring(e.x, e.y, 20, 240 + i * 90, 'rgba(255,210,130,.7)', 1.2, 4);
    }
    this.effects.heal(p.x, p.y);
    p.gold += 500;
    this.stats.goldEarned += 500;
    p.shards += 5;
    p.addXp(500, () => this.onLevelUp());
    this.applyRelic({ name: 'Cuore di Verbena', stat: 'atk', value: 0.15, desc: '+15% Attacco' });
    this.ui.bossBar?.(this, false);
    this.ui.toast('IL COLOSSO È CADUTO — LA FRONTIERA È LIBERA', 'gold');
    this.save();
  }

  // ---------------- physics ----------------
  isFree(x, y, r = 16) {
    if (x < 50 || y < 50 || x > WORLD.w - 50 || y > WORLD.h - 50) return false;
    if (inLake(x, y, r * 0.4)) return false;
    for (const o of world.obstacles) {
      const rr = o.r + r * 0.7;
      const dx = x - o.x, dy = y - o.y;
      if (dx * dx + dy * dy < rr * rr) return false;
    }
    return true;
  }

  moveEntity(e, dx, dy) {
    if (!dx && !dy) return;
    const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 10));
    const ox = dx / steps, oy = dy / steps;
    for (let i = 0; i < steps; i++) {
      if (this.isFree(e.x + ox, e.y, e.r)) e.x += ox;
      if (this.isFree(e.x, e.y + oy, e.r)) e.y += oy;
    }
  }

  nearestEnemy(maxDist = 99999) {
    let best = null, bd = maxDist;
    for (const e of this.enemies) {
      if (e.dead || e.spawnT > 0.2) continue;
      const d = dist(this.player, e);
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  }

  shake(a) { this.shakeAmt = Math.min(28, this.shakeAmt + a); }

  addEffect(type, o) {
    if (type === 'hit') this.effects.hitBurst(o.x, o.y, o.crit ? '#ffcf6e' : '#ffe3a0', o.crit);
    else if (type === 'slash') this.effects.slash(o.x, o.y, o.ang, o.color, o.size, o.arc || 1.8);
    else if (type === 'shock') this.effects.ring(o.x, o.y, o.r, o.maxR, o.color, 0.5, 3);
    else if (type === 'spikes') {
      this.effects.ring(o.x, o.y, 6, o.size * 1.4, 'rgba(160,210,120,.5)', 0.35, 2);
      for (let i = 0; i < 6; i++) {
        this.effects.particles.push({
          type: 'spark', x: o.x + rand(-o.size * 0.5, o.size * 0.5), y: o.y,
          vx: rand(-50, 50), vy: rand(-160, -60), life: rand(0.25, 0.55), max: 0.55,
          size: rand(2, 4), color: '#a8c47a', drag: 2, grav: 320,
        });
      }
    }
  }

  // ---------------- interactions ----------------
  updateInteractions() {
    const p = this.player;
    if (p.dead || this.victory) { this.ui.setInteract?.(null); return; }
    let hint = null;
    if (Math.hypot(p.x - CAMPFIRE.x, p.y - CAMPFIRE.y) < 90) {
      hint = { text: p.hp < p.maxHp ? 'Riposa al fuoco — cura completa' : 'Riposa al fuoco', act: 'rest' };
    } else if (Math.hypot(p.x - NPC.x, p.y - NPC.y) < 78) {
      hint = { text: 'Parla con Mira', act: 'talk' };
    } else if (Math.hypot(p.x - BOARD.x, p.y - BOARD.y) < 72) {
      hint = { text: 'Leggi il bando di missione', act: 'board' };
    } else if (Math.hypot(p.x - 2860, p.y - 760) < 110) {
      hint = { text: 'Osserva la statua di Aether', act: 'statue' };
    }
    if (hint?.act !== this.interactHint?.act) this.ui.setInteract?.(hint ? hint.text : null);
    this.interactHint = hint;
  }

  interact() {
    if (!this.interactHint || this.paused) return;
    const p = this.player;
    const act = this.interactHint.act;
    if (act === 'rest') {
      p.hp = p.maxHp; p.mp = p.maxMp; p.sta = p.maxSta;
      this.effects.heal(p.x, p.y);
      this.audio.play('heal');
      this.ui.toast('Hai riposato. Vita, energia e vigore ripristinati.', 'gold');
      this.save();
    } else if (act === 'talk') {
      const lines = [
        'Sei tornato, <b>Viandante</b>. Il Bosco Sospeso è inquieto: le melme sono scese dai sentieri alti e i lupi seguono la luna sbagliata.<br><br>Se vuoi farti un nome, comincia dalle <b>6 creature</b> del bosco. Io osserverò da qui, al sicuro.',
        'Le <b>Rovine di Aether</b> sono a nord-est. Le sentinelle d\'ossa non dormono da secoli... e il loro <b>Guardiano</b> custodisce una reliquia. Otto non-morti, e la strada si aprirà.',
        'La <b>via del Colosso</b> è a est, oltre il sigillo. Verbena dorme sotto l\'Arena Radicata. Quando lo affronterai, ricorda: le sue radici colpiscono dove sei stato, non dove sei. <b>Scatta</b> fuori dal cerchio.',
        'Il Colosso è caduto. La Frontiera ricorderà il tuo nome, <b>%NAME%</b>. E io... io ricorderò che ti ho visto barcollare contro una melma.',
      ];
      const idx = clamp(this.questStage, 0, 3);
      this.ui.dialog?.('MIRA · CUSTODE DEL CAMPO', lines[idx].replace('%NAME%', p.cls.name), '📖');
      this.audio.play('ui');
    } else if (act === 'board') {
      const q = QUEST_DATA[this.questStage] || QUEST_DATA[3];
      const body = `<h3>${q.name}</h3><p>${q.obj}</p>` +
        (this.questStage < 3 ? `<p style="margin-top:10px;color:#9df5c8">Prossima tappa: ${QUEST_DATA[this.questStage + 1]?.name || 'Vittoria'}</p>` : '') +
        `<p style="margin-top:12px;color:#93a9a4">Ricompense: monete, frammenti di Aether e reliquie rare.</p>`;
      this.ui.dialog?.('BANDO DELLA FRONTIERA', body, '📜');
      this.audio.play('ui');
    } else if (act === 'statue') {
      this.ui.dialog?.('STATUA DI AETHER', '<p>Le rune raccontano di un patto tra il Bosco e gli Dei: finché il Colosso veglia, nessuna strada porta fuori dalla valle.</p><p style="margin-top:8px;color:#ffcf6e">«Chi spezza le radici spezza il cielo.»</p>', '🗿');
      this.audio.play('ui');
    }
  }

  respawnPlayer() {
    const p = this.player;
    p.dead = false; p.hp = Math.round(p.maxHp * 0.65); p.mp = Math.round(p.maxMp * 0.5); p.sta = p.maxSta;
    p.x = 700; p.y = 1790; p.invuln = 2.2;
    this.deathTimer = 0; this.endShown = false; this.combo = 0;
    this.cam.x = p.x; this.cam.y = p.y;
    for (const e of this.enemies) {
      if (e === this.boss) continue;
      e.aggro = false; e.state = 'idle'; e.hp = e.maxHp; e.dead = false; e.deathT = 0;
      e.x = e.home.x; e.y = e.home.y;
    }
    if (this.boss) {
      this.boss.awake = false;
      this.enemies = this.enemies.filter(e => e !== this.boss);
      this.boss = null;
      this.questStage = 2;
      this.qKills = 0;
      this.qTotal = 1;
      this.ui.quest?.(this);
    }
    this.hazards.length = 0;
    this.projectiles.length = 0;
    this.ui.bossBar?.(this, false);
    this.effects.heal(p.x, p.y);
    this.audio.play('heal');
    this.ui.toast('Sei risorto al Campo della Valle', 'gold');
    this.save();
  }

  resetToTitle() {
    this.started = false;
    this.paused = false;
    this.keys.clear();
    this.touchMove.x = 0; this.touchMove.y = 0;
    this.ui.bossBar?.(this, false);
  }
}
