import { TAU, rand, clamp, ease } from './util.js';

export class Effects {
  constructor() {
    this.particles = [];
    this.texts = [];
    this.arcs = [];
    this.rings = [];
    this.bolts = [];
    this.ghosts = [];
    this.petals = [];
  }
  clear() {
    this.particles.length = 0; this.texts.length = 0; this.arcs.length = 0;
    this.rings.length = 0; this.bolts.length = 0; this.ghosts.length = 0;
  }
  hitBurst(x, y, color = '#ffe3a0', crit = false) {
    const n = crit ? 18 : 10;
    for (let i = 0; i < n; i++) {
      const a = rand(0, TAU), sp = rand(60, crit ? 380 : 240);
      this.particles.push({
        type: 'spark', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40,
        life: rand(0.2, 0.55), max: 0.55, size: rand(1, crit ? 3 : 2.2), color, drag: 3.2, grav: 260,
      });
    }
    for (let i = 0; i < 4; i++) {
      const a = rand(0, TAU);
      this.particles.push({
        type: 'glow', x, y, vx: Math.cos(a) * 30, vy: Math.sin(a) * 30 - 20,
        life: rand(0.2, 0.4), max: 0.4, size: rand(10, 26), color, drag: 4,
      });
    }
  }
  deathBurst(x, y, color = '#9dd9a0') {
    for (let i = 0; i < 26; i++) {
      const a = rand(0, TAU), sp = rand(40, 260);
      this.particles.push({
        type: i % 3 === 0 ? 'smoke' : 'spark', x, y: y - 20, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 70,
        life: rand(0.4, 1.1), max: 1.1, size: rand(2, 6), color, drag: 2.4, grav: 120,
      });
    }
    this.ring(x, y - 16, 10, 80, color, 0.5);
  }
  ring(x, y, r, maxR, color, life = 0.5, width = 3) {
    this.rings.push({ x, y, r, maxR, color, life, max: life, width });
  }
  slash(x, y, ang, color = 'rgba(220,255,240,.8)', size = 52, arc = 1.9) {
    this.arcs.push({ x, y, ang, color, size, arc, life: 0.22, max: 0.22 });
  }
  bolt(x, y, color = '#fff3c4') {
    const seg = [];
    let sy = -140;
    let sx = x + rand(-20, 20);
    const steps = 7;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      seg.push({ x: sx + rand(-14, 14) * (1 - t * 0.4), y: sy + (y + 6 - sy) * t });
    }
    this.bolts.push({ seg, life: 0.3, max: 0.3, color });
    this.ring(x, y, 8, 120, color, 0.45, 4);
    for (let i = 0; i < 14; i++) {
      const a = rand(0, TAU), sp = rand(60, 300);
      this.particles.push({
        type: 'spark', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 80, life: rand(0.25, 0.7), max: 0.7,
        size: rand(1.4, 3), color, drag: 3, grav: 300,
      });
    }
  }
  heal(x, y) {
    for (let i = 0; i < 16; i++) {
      const a = rand(0, TAU), rr = rand(10, 34);
      this.particles.push({
        type: 'glow', x: x + Math.cos(a) * rr, y: y + rand(-20, 20), vx: 0, vy: rand(-70, -30),
        life: rand(0.4, 0.9), max: 0.9, size: rand(4, 9), color: '#a8ffcc', drag: 0.5,
      });
    }
  }
  dashGhost(x, y, facing, cls) {
    this.ghosts.push({ x, y, facing, life: 0.32, max: 0.32, cls });
  }
  text(x, y, txt, color = '#fff2cf', size = 16, vy = -46) {
    this.texts.push({ x, y, txt, color, size, life: 0.95, max: 0.95, vy });
  }
  petalBurst(x, y, n = 6) {
    for (let i = 0; i < n; i++) {
      this.particles.push({
        type: 'petal', x, y, vx: rand(-40, 40), vy: rand(-60, -10), life: rand(1, 2), max: 2,
        size: rand(2, 4), color: i % 2 ? '#ffc9d2' : '#ffa8b8', drag: 0.6, grav: 20, spin: rand(-4, 4), rot: rand(0, TAU),
      });
    }
  }
  update(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) { this.particles.splice(i, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt;
      const d = Math.exp(-(p.drag || 0) * dt);
      p.vx *= d; p.vy *= d;
      if (p.grav) p.vy += p.grav * dt;
      if (p.rot !== undefined) p.rot += p.spin * dt;
    }
    for (let i = this.texts.length - 1; i >= 0; i--) {
      const t = this.texts[i];
      t.life -= dt;
      if (t.life <= 0) { this.texts.splice(i, 1); continue; }
      t.y += t.vy * dt;
      t.vy *= Math.exp(-2.6 * dt);
    }
    for (let i = this.arcs.length - 1; i >= 0; i--) {
      this.arcs[i].life -= dt;
      if (this.arcs[i].life <= 0) this.arcs.splice(i, 1);
    }
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i];
      r.life -= dt;
      if (r.life <= 0) this.rings.splice(i, 1);
      else r.r = r.maxR * ease.outCubic(1 - r.life / r.max);
    }
    for (let i = this.bolts.length - 1; i >= 0; i--) {
      this.bolts[i].life -= dt;
      if (this.bolts[i].life <= 0) this.bolts.splice(i, 1);
    }
    for (let i = this.ghosts.length - 1; i >= 0; i--) {
      this.ghosts[i].life -= dt;
      if (this.ghosts[i].life <= 0) this.ghosts.splice(i, 1);
    }
  }
  drawGround(ctx) {
    for (const g of this.ghosts) {
      const a = g.life / g.max;
      ctx.save();
      ctx.globalAlpha = a * 0.3;
      ctx.fillStyle = g.cls?.trim || '#9df5c8';
      ctx.beginPath(); ctx.ellipse(g.x, g.y - 30, 16, 26, 0, 0, TAU); ctx.fill();
      ctx.restore();
    }
    for (const r of this.rings) {
      const a = clamp(r.life / r.max, 0, 1);
      ctx.save();
      ctx.globalAlpha = a * 0.85;
      ctx.strokeStyle = r.color;
      ctx.lineWidth = r.width * a + 0.6;
      ctx.beginPath(); ctx.ellipse(r.x, r.y, r.r, r.r * 0.55, 0, 0, TAU); ctx.stroke();
      ctx.restore();
    }
  }
  draw(ctx) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const p of this.particles) {
      const a = clamp(p.life / p.max, 0, 1);
      if (p.type === 'spark') {
        ctx.globalAlpha = a;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = p.size;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * 0.014, p.y - p.vy * 0.014);
        ctx.stroke();
      } else if (p.type === 'glow') {
        ctx.globalAlpha = a * 0.75;
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * (1.6 - a * 0.6));
        g.addColorStop(0, p.color);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.fillRect(p.x - p.size * 2, p.y - p.size * 2, p.size * 4, p.size * 4);
      } else if (p.type === 'smoke') {
        ctx.globalAlpha = a * 0.3;
        ctx.fillStyle = '#b8cbb8';
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (2.2 - a), 0, TAU); ctx.fill();
      }
    }
    ctx.globalCompositeOperation = 'source-over';
    for (const p of this.particles) {
      if (p.type !== 'petal') continue;
      const a = clamp(p.life / p.max, 0, 1);
      ctx.save();
      ctx.globalAlpha = a * 0.8;
      ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.ellipse(0, 0, p.size, p.size * 0.45, 0, 0, TAU); ctx.fill();
      ctx.restore();
    }
    for (const arc of this.arcs) {
      const a = clamp(arc.life / arc.max, 0, 1);
      ctx.save();
      ctx.globalAlpha = a * 0.9;
      ctx.translate(arc.x, arc.y);
      ctx.rotate(arc.ang);
      ctx.strokeStyle = arc.color;
      ctx.lineWidth = 6 * a + 1;
      ctx.lineCap = 'round';
      const sweep = arc.arc;
      ctx.beginPath();
      ctx.arc(0, 0, arc.size, -sweep / 2 + (1 - a) * 0.6, sweep / 2 + (1 - a) * 0.6);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.5)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(0, 0, arc.size + 7, -sweep / 2 + (1 - a) * 0.6, sweep / 2 + (1 - a) * 0.6);
      ctx.stroke();
      ctx.restore();
    }
    ctx.globalCompositeOperation = 'lighter';
    for (const b of this.bolts) {
      const a = clamp(b.life / b.max, 0, 1);
      ctx.globalAlpha = a;
      ctx.strokeStyle = b.color;
      ctx.lineWidth = 4 * a + 1;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(b.seg[0].x, b.seg[0].y);
      for (let i = 1; i < b.seg.length; i++) ctx.lineTo(b.seg[i].x, b.seg[i].y);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.85)';
      ctx.lineWidth = 1.4;
      ctx.stroke();
    }
    ctx.restore();
    for (const t of this.texts) {
      const a = clamp(t.life / t.max, 0, 1);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.font = `700 ${t.size}px "Trebuchet MS", system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(4,8,8,.7)';
      ctx.strokeText(t.txt, t.x, t.y);
      if (t.size > 20) {
        ctx.shadowColor = t.color; ctx.shadowBlur = 14;
      }
      ctx.fillStyle = t.color;
      ctx.fillText(t.txt, t.x, t.y);
      ctx.restore();
    }
  }
}
