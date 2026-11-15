import { TAU, clamp, lerp, approach, rand, angleTo, dist } from './util.js';

export const CLASSES = {
  blade: {
    name: 'LAMPO', title: 'Lama della Frontiera', glyph: '⚔',
    maxHp: 120, maxSta: 100, maxMp: 90, atk: 1.0, speed: 252, crit: 0.16,
    coat: '#1d6a57', coat2: '#124b40', trim: '#9df5c8', leather: '#3a2c22',
    skin: '#f0c39a', hair: '#efe3c7', accent: '#ffd27a', weapon: '#d9f6ff',
    desc: 'Equilibrato. Combo rapidi e ottima mobilità.'
  },
  ronin: {
    name: 'RONIN', title: 'Spettro del Vento', glyph: '🗡',
    maxHp: 98, maxSta: 120, maxMp: 80, atk: 0.88, speed: 292, crit: 0.28,
    coat: '#752b39', coat2: '#4a1c29', trim: '#ffb27a', leather: '#2a2020',
    skin: '#e8bb92', hair: '#22202a', accent: '#ff8f6b', weapon: '#ffe9d6',
    desc: 'Fulmineo e letale. Colpi critici devastanti.'
  },
  guardian: {
    name: 'GUARDIANO', title: 'Ferro Vivente', glyph: '🛡',
    maxHp: 158, maxSta: 90, maxMp: 80, atk: 1.24, speed: 222, crit: 0.1,
    coat: '#3b4a5b', coat2: '#26313f', trim: '#ffcf6e', leather: '#2e2a26',
    skin: '#d9a578', hair: '#c9a227', accent: '#ffcf6e', weapon: '#e8f2ff',
    desc: 'Lento ma inarrestabile. Ogni colpo pesa.'
  },
};

export class Player {
  constructor(clsKey = 'blade') {
    this.cls = CLASSES[clsKey] || CLASSES.blade;
    this.clsKey = clsKey;
    this.x = 760; this.y = 1780;
    this.vx = 0; this.vy = 0;
    this.r = 15;
    this.facing = -0.4;
    this.moveDir = { x: 0, y: 0 };
    this.hp = this.cls.maxHp; this.maxHp = this.cls.maxHp;
    this.sta = this.cls.maxSta; this.maxSta = this.cls.maxSta;
    this.mp = this.cls.maxMp; this.maxMp = this.cls.maxMp;
    this.atk = this.cls.atk;
    this.speed = this.cls.speed;
    this.crit = this.cls.crit;
    this.level = 1; this.xp = 0; this.xpNext = 60;
    this.gold = 0; this.shards = 0;
    this.walk = 0; this.bob = 0;
    this.moving = false;
    this.attack = null; // {t, dur, combo, hit}
    this.attackCd = 0;
    this.dash = 0; this.dashCd = 0;
    this.dashDir = { x: 1, y: 0 };
    this.gear = { atk: 0, hp: 0, crit: 0, speed: 0 };
    this.skillCd = 0; this.ultCd = 0;
    this.invuln = 0;
    this.hurtFlash = 0;
    this.comboTimer = 0;
    this.swingT = 0;
    this.dead = false;
    this.kills = 0;
    this.time = 0;
    this.stepTimer = 0;
    this.lastSafe = { x: this.x, y: this.y };
    this.levelPulse = 0;
  }
  get atkPower() { return this.cls.atk * this.atk; }
  canAttack() { return !this.attack && this.attackCd <= 0 && !this.dead; }
  startAttack() {
    const combo = this.comboTimer > 0 ? (this.comboCount % 3) + 1 : 1;
    this.comboCount = combo;
    this.comboTimer = 1.1;
    this.attack = { t: 0, dur: combo === 3 ? 0.42 : 0.3, combo, hit: false, applied: false };
    this.attackCd = combo === 3 ? 0.26 : 0.06;
    return this.attack;
  }
  addXp(n, onLevel) {
    this.xp += n;
    while (this.xp >= this.xpNext) {
      this.xp -= this.xpNext; this.level++;
      this.xpNext = Math.round(60 + this.level * 42 + this.level ** 1.6 * 6);
      this.applyStats(true);
      this.hp = this.maxHp; this.sta = this.maxSta; this.mp = this.maxMp;
      this.levelPulse = 1;
      onLevel?.();
    }
  }
  applyStats(full = false) {
    const L = this.level - 1;
    this.maxHp = Math.round(this.cls.maxHp + L * 12 + this.gear.hp);
    this.maxSta = this.cls.maxSta + L * 3;
    this.maxMp = this.cls.maxMp + L * 5;
    this.atk = +(this.cls.atk * (1 + L * 0.10) * (1 + this.gear.atk)).toFixed(3);
    this.crit = Math.min(0.65, this.cls.crit + this.gear.crit);
    this.speed = this.cls.speed + this.gear.speed;
    if (full) {
      this.hp = Math.min(this.hp, this.maxHp);
      this.sta = Math.min(this.sta, this.maxSta);
      this.mp = Math.min(this.mp, this.maxMp);
    }
  }
  heal(n) {
    const before = this.hp;
    this.hp = clamp(this.hp + n, 0, this.maxHp);
    return this.hp - before;
  }
  update(dt, time, input) {
    this.time = time;
    if (this.dead) return;
    this.invuln = Math.max(0, this.invuln - dt);
    this.hurtFlash = Math.max(0, this.hurtFlash - dt * 3.2);
    this.attackCd = Math.max(0, this.attackCd - dt);
    this.dashCd = Math.max(0, this.dashCd - dt);
    this.skillCd = Math.max(0, this.skillCd - dt);
    this.ultCd = Math.max(0, this.ultCd - dt);
    this.comboTimer = Math.max(0, this.comboTimer - dt);
    if (this.comboTimer === 0) this.comboCount = 0;
    this.levelPulse = Math.max(0, this.levelPulse - dt);

    if (this.attack) {
      this.attack.t += dt;
      if (this.attack.t >= this.attack.dur) this.attack = null;
    }

    const mv = input.move;
    const len = Math.hypot(mv.x, mv.y);
    this.moving = len > 0.12;
    let sp = this.speed;
    if (this.attack) sp *= 0.34;
    if (this.dash > 0) {
      this.dash -= dt;
      this.invuln = Math.max(this.invuln, 0.03);
      sp = this.speed * 2.65;
      this.moving = true;
      if (len <= 0.12) {
        mv.x = this.dashDir.x; mv.y = this.dashDir.y;
      }
      if (Math.random() < 0.6) {
        input.onDashTrail?.();
      }
    }
    if (this.moving) {
      const nx = mv.x / (len || 1), ny = mv.y / (len || 1);
      this.facing = lerp(this.facing, Math.atan2(ny, nx), 1 - Math.exp(-18 * dt));
      this.vx = nx * sp;
      this.vy = ny * sp;
      this.walk += dt * (this.dash > 0 ? 16 : 11) * (sp / this.speed);
      this.stepTimer -= dt;
      if (this.stepTimer <= 0 && this.dash <= 0) { this.stepTimer = 0.26; input.onStep?.(); }
    } else {
      this.vx = approach(this.vx, 0, 1400 * dt);
      this.vy = approach(this.vy, 0, 1400 * dt);
      this.walk *= Math.pow(0.001, dt);
    }
    this.bob = this.moving ? Math.sin(this.walk) * 2.4 : Math.sin(time * 2.2) * 1.1;

    // regen
    if (this.dash <= 0) this.sta = Math.min(this.maxSta, this.sta + dt * 21);
    this.mp = Math.min(this.maxMp, this.mp + dt * 3.1);
    if (time - (this.lastHurt || -10) > 4) this.hp = Math.min(this.maxHp, this.hp + dt * 1.6);
  }
  hurt(n, game) {
    if (this.invuln > 0 || this.dead) return false;
    n = Math.round(n);
    this.hp -= n;
    this.hurtFlash = 1;
    this.lastHurt = this.time;
    this.invuln = 0.62;
    game?.onPlayerHurt?.(n);
    if (this.hp <= 0) { this.hp = 0; this.dead = true; }
    return true;
  }
  draw(ctx, time) {
    const c = this.cls;
    const flicker = this.invuln > 0 && Math.floor(time * 24) % 2 === 0;
    ctx.save();
    ctx.translate(this.x, this.y);
    // shadow
    ctx.fillStyle = 'rgba(3,8,6,.42)';
    ctx.beginPath(); ctx.ellipse(4, 2, 22, 8, 0, 0, TAU); ctx.fill();
    if (this.dead) {
      ctx.rotate(-1.2);
      ctx.globalAlpha = 0.7;
      drawBody(ctx, this, c, time, true);
      ctx.restore();
      return;
    }
    if (this.dash > 0) {
      ctx.globalAlpha *= 0.7;
    }
    if (flicker) ctx.globalAlpha *= 0.55;
    drawBody(ctx, this, c, time, false);
    ctx.restore();
    if (this.dash > 0) {
      // speed streaks
      ctx.save();
      ctx.strokeStyle = 'rgba(180,255,225,.26)';
      ctx.lineWidth = 2;
      for (let i = 0; i < 3; i++) {
        const a = this.facing + Math.PI + (i - 1) * 0.18;
        ctx.beginPath();
        ctx.moveTo(this.x + Math.cos(a) * 16, this.y + Math.sin(a) * 12 - 24);
        ctx.lineTo(this.x + Math.cos(a) * (44 + i * 12), this.y + Math.sin(a) * 30 - 28);
        ctx.stroke();
      }
      ctx.restore();
    }
  }
}

function drawBody(ctx, p, c, time, dead) {
  const bob = p.bob;
  const walk = p.walk;
  const swing = Math.sin(walk) * (p.moving ? 1 : 0);
  const facingX = Math.cos(p.facing);
  const facingY = Math.sin(p.facing);
  const flip = facingX < -0.1 ? -1 : 1;
  const lean = p.moving ? clamp(facingX, -1, 1) * 0.10 : 0;

  ctx.save();
  ctx.translate(0, bob);
  // cloak behind
  const capeSway = Math.sin(time * 3 + walk * 0.6) * 3;
  ctx.fillStyle = c.coat2;
  ctx.beginPath();
  ctx.moveTo(-11, -50);
  ctx.quadraticCurveTo(-22 - facingX * 6, -26 + capeSway, -16 - facingX * 9, -3 + capeSway * 0.4);
  ctx.lineTo(13 - facingX * 7, -2 - capeSway * 0.3);
  ctx.quadraticCurveTo(19 - facingX * 4, -28, 12, -50);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.24)'; ctx.lineWidth = 1; ctx.stroke();
  // legs
  ctx.strokeStyle = c.leather;
  ctx.lineCap = 'round';
  ctx.lineWidth = 8;
  ctx.beginPath(); ctx.moveTo(-5, -24); ctx.lineTo(-7 + swing * 6, -6); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(6, -24); ctx.lineTo(8 - swing * 6, -6); ctx.stroke();
  ctx.strokeStyle = '#1d1712'; ctx.lineWidth = 9;
  ctx.beginPath(); ctx.moveTo(-7 + swing * 6, -8); ctx.lineTo(-8 + swing * 8, -1); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(8 - swing * 6, -8); ctx.lineTo(9 - swing * 8, -1); ctx.stroke();
  // torso
  ctx.save();
  ctx.rotate(lean);
  const grd = ctx.createLinearGradient(-14, -54, 16, -24);
  grd.addColorStop(0, c.coat2);
  grd.addColorStop(0.55, c.coat);
  grd.addColorStop(1, c.coat2);
  ctx.fillStyle = grd;
  ctx.beginPath();
  ctx.moveTo(-12, -50);
  ctx.quadraticCurveTo(-16, -38, -12, -22);
  ctx.lineTo(-6, -18);
  ctx.lineTo(8, -18);
  ctx.lineTo(13, -24);
  ctx.quadraticCurveTo(15, -40, 10, -50);
  ctx.quadraticCurveTo(0, -56, -12, -50);
  ctx.closePath();
  ctx.fill();
  // chest armor plate / tunic detail
  ctx.fillStyle = c.leather;
  ctx.beginPath();
  ctx.moveTo(-8, -47); ctx.quadraticCurveTo(0, -52, 8, -47); ctx.lineTo(7, -33); ctx.quadraticCurveTo(0, -30, -7, -33); ctx.closePath(); ctx.fill();
  // belt
  ctx.fillStyle = '#241b14';
  ctx.fillRect(-12, -26, 25, 5);
  ctx.fillStyle = c.accent;
  ctx.fillRect(-2, -27, 5, 7);
  // collar trim
  ctx.strokeStyle = c.trim; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.moveTo(-9, -48); ctx.quadraticCurveTo(0, -43, 9, -48); ctx.stroke();
  // shoulder pads
  ctx.fillStyle = c.coat2;
  ctx.beginPath(); ctx.ellipse(-12, -46, 7, 6, -0.3, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.ellipse(11, -46, 7, 6, 0.3, 0, TAU); ctx.fill();
  ctx.fillStyle = c.trim; ctx.globalAlpha *= 0.55;
  ctx.beginPath(); ctx.ellipse(-12, -47, 3, 2, -0.3, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.ellipse(11, -47, 3, 2, 0.3, 0, TAU); ctx.fill();
  ctx.globalAlpha /= 0.55;

  // head
  const hx = facingX * 2.4;
  ctx.fillStyle = c.skin;
  ctx.beginPath(); ctx.arc(hx, -58, 9.5, 0, TAU); ctx.fill();
  // hair
  ctx.fillStyle = c.hair;
  if (p.clsKey === 'guardian') {
    ctx.beginPath(); ctx.arc(hx, -59, 10.4, Math.PI * 0.95, Math.PI * 2.05); ctx.fill();
    ctx.fillStyle = '#8794a0';
    ctx.beginPath(); ctx.arc(hx, -61, 10, Math.PI, TAU); ctx.fill();
    ctx.fillStyle = c.accent;
    ctx.fillRect(hx - 2, -70, 4, 8);
    ctx.fillStyle = 'rgba(255,220,140,.55)'; ctx.fillRect(hx - 8, -60, 16, 2);
  } else if (p.clsKey === 'ronin') {
    ctx.beginPath();
    ctx.arc(hx, -60, 10, Math.PI * 0.85, Math.PI * 2.15);
    ctx.fill();
    ctx.beginPath(); ctx.moveTo(hx - 9, -59); ctx.lineTo(hx - 15, -64); ctx.lineTo(hx - 7, -66); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#15141c';
    ctx.beginPath(); ctx.arc(hx + 1, -69, 5, 0, TAU); ctx.fill();
  } else {
    ctx.beginPath();
    ctx.moveTo(hx - 10, -58);
    ctx.quadraticCurveTo(hx - 12, -69, hx - 3, -70);
    ctx.quadraticCurveTo(hx + 8, -74, hx + 10, -63);
    ctx.lineTo(hx + 11, -57);
    ctx.lineTo(hx + 3, -62);
    ctx.lineTo(hx - 2, -56);
    ctx.lineTo(hx - 6, -62);
    ctx.closePath(); ctx.fill();
  }
  // eyes
  const ex = hx + facingX * 3.2;
  ctx.fillStyle = '#1a1410';
  ctx.beginPath(); ctx.arc(ex - 3.4 * flip, -58, 1.5, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(ex + 2.6 * flip, -58, 1.5, 0, TAU); ctx.fill();
  // scarf
  if (p.clsKey === 'ronin') {
    ctx.strokeStyle = '#b23a3a'; ctx.lineWidth = 3.4; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-6, -49);
    ctx.quadraticCurveTo(-14 - facingX * 4 + Math.sin(time * 5) * 2, -44, -20 - facingX * 6, -38 + Math.sin(time * 4) * 3);
    ctx.stroke();
  }

  // arms + weapon
  const attacking = p.attack;
  let weaponAng = p.facing;
  let hx2 = 12, hy2 = -36;
  if (attacking) {
    const t = clamp(attacking.t / attacking.dur, 0, 1);
    const back = attacking.combo === 2 ? -1.1 : -0.65;
    const end = attacking.combo === 2 ? 2.7 : 1.5;
    weaponAng = p.facing + lerp(back, end, t * t * (3 - 2 * t));
    hx2 = Math.cos(weaponAng) * 8;
    hy2 = -34 + Math.sin(weaponAng) * 3;
  } else if (p.moving) {
    weaponAng = p.facing + 0.8 + Math.sin(walk) * 0.12;
  } else {
    weaponAng = p.facing + 2.3;
  }
  // back arm
  ctx.strokeStyle = c.coat2; ctx.lineWidth = 6; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(10, -45); ctx.lineTo(15 + facingX * 2, -32); ctx.stroke();
  ctx.fillStyle = c.skin;
  ctx.beginPath(); ctx.arc(15 + facingX * 2, -31, 3.4, 0, TAU); ctx.fill();

  // weapon render
  drawSword(ctx, hx2, hy2, weaponAng, c, attacking, p);
  // front arm holding sword
  ctx.strokeStyle = c.coat; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.moveTo(-8, -45); ctx.lineTo(hx2 * 0.7, hy2 + 4); ctx.stroke();
  ctx.fillStyle = c.skin;
  ctx.beginPath(); ctx.arc(hx2 * 0.7 + 2, hy2 + 3, 3.2, 0, TAU); ctx.fill();

  // glow chest emblem
  ctx.fillStyle = c.trim; ctx.globalAlpha *= 0.85;
  ctx.beginPath(); ctx.arc(0, -37, 2.4, 0, TAU); ctx.fill();
  ctx.restore();
  ctx.restore();
  ctx.globalAlpha = 1;
}

function drawSword(ctx, hx, hy, ang, c, attacking, p) {
  ctx.save();
  ctx.translate(hx, hy);
  ctx.rotate(ang);
  const len = attacking ? 48 : 38;
  // blade
  const g = ctx.createLinearGradient(0, 0, len, 0);
  g.addColorStop(0, '#8fa7ab');
  g.addColorStop(0.25, c.weapon);
  g.addColorStop(0.8, '#ffffff');
  g.addColorStop(1, c.trim);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(6, -2.2);
  ctx.lineTo(len - 7, -1.8);
  ctx.lineTo(len, 0);
  ctx.lineTo(len - 7, 1.8);
  ctx.lineTo(6, 2.2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.moveTo(10, -0.6); ctx.lineTo(len - 6, -0.4); ctx.stroke();
  // hilt
  ctx.fillStyle = '#2b2118';
  ctx.fillRect(-4, -3.4, 10, 6.8);
  ctx.fillStyle = c.accent;
  ctx.fillRect(4, -5.4, 3, 10.8);
  ctx.beginPath(); ctx.arc(-6, 0, 2.6, 0, TAU); ctx.fill();
  ctx.restore();
  if (attacking) {
    const t = clamp(attacking.t / attacking.dur, 0, 1);
    ctx.save();
    ctx.translate(p.x, p.y - 30);
    ctx.rotate(p.facing);
    ctx.strokeStyle = `rgba(220,255,240,${0.5 * (1 - t)})`;
    ctx.lineWidth = 5 * (1 - t) + 1;
    ctx.beginPath();
    const sweep = attacking.combo === 2 ? 2.9 : 1.9;
    const a0 = p.facing - sweep * 0.5 + sweep * t;
    ctx.arc(0, 0, 50, a0 - 0.9, a0 + 0.2);
    ctx.stroke();
    ctx.strokeStyle = `rgba(157,245,200,${0.28 * (1 - t)})`;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(0, 0, 56, a0 - 0.9, a0 + 0.2); ctx.stroke();
    ctx.restore();
  }
}
