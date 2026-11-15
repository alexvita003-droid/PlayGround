export class TitleScene {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.t = 0;
    this.running = false;
    this.raf = null;
    this.dpr = 1;
    this.petals = [];
    this.embers = [];
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this._loop = this._loop.bind(this);
  }
  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.dpr = dpr;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.w = w; this.h = h;
    if (!this.petals.length) {
      for (let i = 0; i < 46; i++) {
        this.petals.push({ x: Math.random() * w, y: Math.random() * h, s: 0.5 + Math.random() * 1.4, sp: 8 + Math.random() * 26, sw: 12 + Math.random() * 40, ph: Math.random() * 6.28, rot: Math.random() * 6.28, spin: (Math.random() - .5) * 2, type: Math.random() < .6 ? 'petal' : 'mote' });
      }
    }
  }
  start() {
    this.running = true;
    if (!this.raf) this.raf = requestAnimationFrame(this._loop);
  }
  stop() {
    this.running = false;
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = null;
  }
  _loop(ts) {
    if (!this.running) { this.raf = null; return; }
    this.raf = requestAnimationFrame(this._loop);
    const dt = Math.min(0.05, (ts - (this.last || ts)) / 1000);
    this.last = ts;
    this.t += dt;
    this.draw();
  }
  draw() {
    const { ctx, w, h, t } = this;
    const dpr = this.dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // sky
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#061013');
    sky.addColorStop(0.4, '#0a1d1e');
    sky.addColorStop(0.72, '#173029');
    sky.addColorStop(1, '#0a1512');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);
    // moon
    const mx = w * 0.18, my = h * 0.2, mr = Math.min(w, h) * 0.11;
    const moonGlow = ctx.createRadialGradient(mx, my, 2, mx, my, mr * 3.4);
    moonGlow.addColorStop(0, 'rgba(255,235,185,.30)');
    moonGlow.addColorStop(0.25, 'rgba(210,240,210,.10)');
    moonGlow.addColorStop(1, 'rgba(180,230,200,0)');
    ctx.fillStyle = moonGlow;
    ctx.fillRect(mx - mr * 3.4, my - mr * 3.4, mr * 6.8, mr * 6.8);
    ctx.fillStyle = '#e9f0d8';
    ctx.beginPath(); ctx.arc(mx, my, mr * 0.55, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(150,180,150,.18)';
    ctx.beginPath(); ctx.arc(mx - mr * .12, my - mr * .08, mr * .14, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(mx + mr * .16, my + mr * .14, mr * .1, 0, Math.PI * 2); ctx.fill();

    // distant mountains
    this.mountains(ctx, w, h, h * 0.6, 'rgba(16,40,38,.75)', 3, 0.55);
    this.mountains(ctx, w, h, h * 0.7, 'rgba(11,30,29,.9)', 5, 0.35);

    // floating islands
    for (let i = 0; i < 4; i++) {
      const ix = w * (0.12 + i * 0.23) + Math.sin(t * 0.13 + i) * 14;
      const iy = h * (0.33 + (i % 2) * 0.09) + Math.cos(t * 0.17 + i) * 8;
      const iw = 46 + i * 26;
      ctx.save();
      ctx.translate(ix, iy);
      ctx.fillStyle = 'rgba(26,52,44,.6)';
      ctx.beginPath();
      ctx.moveTo(-iw / 2, 0);
      ctx.quadraticCurveTo(0, -iw * 0.22, iw / 2, 0);
      ctx.lineTo(iw * 0.14, iw * 0.5);
      ctx.lineTo(-iw * 0.1, iw * 0.62);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(52,96,68,.5)';
      ctx.beginPath(); ctx.ellipse(0, -1, iw * 0.5, iw * 0.11, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(180,230,230,.18)';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(iw * 0.05, iw * 0.1); ctx.lineTo(iw * 0.02, iw * 0.9); ctx.stroke();
      ctx.fillStyle = 'rgba(22,46,38,.7)';
      ctx.beginPath(); ctx.arc(-iw * 0.18, -iw * 0.13, iw * 0.07, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#0f2723';
      ctx.beginPath(); ctx.arc(-iw * 0.18, -iw * 0.22, iw * 0.14, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    // giant world tree
    this.worldTree(ctx, w, h, t);

    // ground haze
    const haze = ctx.createLinearGradient(0, h * 0.66, 0, h);
    haze.addColorStop(0, 'rgba(8,22,18,0)');
    haze.addColorStop(0.45, 'rgba(8,20,17,.72)');
    haze.addColorStop(1, 'rgba(4,10,9,.98)');
    ctx.fillStyle = haze;
    ctx.fillRect(0, h * 0.66, w, h * 0.34);

    // foreground cliffs
    ctx.fillStyle = 'rgba(4,12,10,.9)';
    ctx.beginPath();
    ctx.moveTo(0, h);
    ctx.lineTo(0, h * 0.86);
    ctx.quadraticCurveTo(w * 0.16, h * 0.8, w * 0.3, h * 0.93);
    ctx.quadraticCurveTo(w * 0.46, h * 0.98, w * 0.58, h * 0.9);
    ctx.quadraticCurveTo(w * 0.76, h * 0.8, w, h * 0.88);
    ctx.lineTo(w, h);
    ctx.closePath(); ctx.fill();

    // sword in stone
    this.sword(ctx, w * 0.085, h * 0.86, Math.min(w, h) * 0.18, t);

    // mist bands
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 3; i++) {
      const yy = h * (0.62 + i * 0.08);
      const off = ((t * (8 + i * 5)) % (w + 400)) - 200;
      const g = ctx.createLinearGradient(0, yy, w, yy);
      g.addColorStop(0, 'rgba(160,220,200,0)');
      g.addColorStop(0.35, `rgba(160,220,200,${0.035 - i * 0.008})`);
      g.addColorStop(0.7, `rgba(160,220,200,${0.045 - i * 0.008})`);
      g.addColorStop(1, 'rgba(160,220,200,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(w * 0.45 + off * 0.36, yy, w * 0.55, 12 + i * 8, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // petals
    ctx.save();
    for (const p of this.petals) {
      const y = ((p.y + t * p.sp) % (h + 60)) - 30;
      const x = p.x + Math.sin(t * 0.7 + p.ph) * p.sw;
      if (p.type === 'petal') {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(p.rot + t * p.spin);
        ctx.fillStyle = `rgba(255,${170 + p.s * 30},${180 + p.s * 20},${0.25 + p.s * 0.2})`;
        ctx.beginPath(); ctx.ellipse(0, 0, 3.4 * p.s, 1.5 * p.s, 0, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      } else {
        ctx.fillStyle = `rgba(190,255,210,${0.2 + p.s * 0.24})`;
        ctx.beginPath(); ctx.arc(x, y, 1.2 * p.s, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.restore();

    // bottom fade for text
    const bottom = ctx.createLinearGradient(0, h * 0.52, 0, h);
    bottom.addColorStop(0, 'rgba(3,9,10,0)');
    bottom.addColorStop(0.5, 'rgba(3,9,10,.34)');
    bottom.addColorStop(1, 'rgba(2,6,7,.72)');
    ctx.fillStyle = bottom;
    ctx.fillRect(0, h * 0.52, w, h * 0.48);
  }
  mountains(ctx, w, h, base, color, n, roughness) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, h);
    const step = w / (n * 2);
    for (let i = 0; i <= n * 2; i++) {
      const x = i * step;
      const peak = base - (i % 2 === 0 ? 0 : (0.12 + ((i * 37) % 10) / 60) * h * roughness);
      ctx.lineTo(x, peak);
    }
    ctx.lineTo(w, h);
    ctx.closePath(); ctx.fill();
  }
  worldTree(ctx, w, h, t) {
    const cx = w * 0.72, base = h * 0.82;
    const sway = Math.sin(t * 0.2) * 2;
    ctx.save();
    // glow behind
    const g = ctx.createRadialGradient(cx, base - h * 0.4, 20, cx, base - h * 0.4, Math.min(w, h) * 0.62);
    g.addColorStop(0, 'rgba(150,255,190,.10)');
    g.addColorStop(0.45, 'rgba(100,220,160,.045)');
    g.addColorStop(1, 'rgba(80,200,140,0)');
    ctx.fillStyle = g;
    ctx.fillRect(cx - Math.min(w, h) * 0.65, 0, Math.min(w, h) * 1.3, h);
    // roots
    ctx.strokeStyle = 'rgba(8,24,20,.95)';
    ctx.lineCap = 'round';
    const rootSpan = Math.min(w, h) * 0.38;
    for (let i = 0; i < 7; i++) {
      ctx.lineWidth = 18 - i * 2;
      ctx.beginPath();
      ctx.moveTo(cx + (i - 3) * 18, base - 40);
      ctx.quadraticCurveTo(cx + (i - 3) * 60, base + 10, cx + (i - 3) * rootSpan * 0.8, base + 50);
      ctx.stroke();
    }
    // trunk
    const trunkW = Math.min(w, h) * 0.085;
    const tg = ctx.createLinearGradient(cx - trunkW, 0, cx + trunkW, 0);
    tg.addColorStop(0, 'rgba(9,26,22,1)');
    tg.addColorStop(0.45, 'rgba(16,40,32,1)');
    tg.addColorStop(1, 'rgba(7,20,17,1)');
    ctx.fillStyle = tg;
    ctx.beginPath();
    ctx.moveTo(cx - trunkW * 0.55, base);
    ctx.quadraticCurveTo(cx - trunkW * 0.8, base - h * 0.28, cx - trunkW * 0.28 + sway, base - h * 0.52);
    ctx.lineTo(cx + trunkW * 0.26 + sway, base - h * 0.52);
    ctx.quadraticCurveTo(cx + trunkW * 0.82, base - h * 0.26, cx + trunkW * 0.62, base);
    ctx.closePath(); ctx.fill();
    // branches
    ctx.strokeStyle = 'rgba(8,24,20,.95)';
    for (let i = 0; i < 6; i++) {
      const y = base - h * (0.3 + i * 0.055);
      const dir = i % 2 ? 1 : -1;
      ctx.lineWidth = 12 - i * 1.4;
      ctx.beginPath();
      ctx.moveTo(cx, y);
      ctx.quadraticCurveTo(cx + dir * Math.min(w, h) * 0.14, y - h * 0.05, cx + dir * Math.min(w, h) * (0.22 + i * 0.03), y - h * 0.10);
      ctx.stroke();
    }
    // canopy
    const canopyY = base - h * 0.6;
    const cr = Math.min(w, h) * 0.34;
    ctx.fillStyle = 'rgba(10,32,25,.96)';
    const blobs = [[0, 0, 1], [-0.55, 0.12, 0.72], [0.5, 0.08, 0.78], [-0.25, -0.22, 0.6], [0.28, -0.26, 0.66], [0.02, 0.28, 0.8], [-0.8, 0.32, 0.4], [0.8, 0.28, 0.44]];
    for (const [ox, oy, rr] of blobs) {
      ctx.beginPath();
      ctx.arc(cx + ox * cr + sway, canopyY + oy * cr, cr * rr, 0, Math.PI * 2);
      ctx.fill();
    }
    // canopy glow rim
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = 'rgba(150,240,180,.10)';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(cx + sway, canopyY - cr * 0.1, cr * 0.82, Math.PI * 1.05, Math.PI * 1.75); ctx.stroke();
    // hanging lights
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 + t * 0.02;
      const rr = cr * (0.55 + (i % 3) * 0.14);
      const lx = cx + Math.cos(a) * rr * 0.9;
      const ly = canopyY + Math.sin(a) * rr * 0.5 + Math.sin(t * 0.8 + i) * 4;
      const lg = ctx.createRadialGradient(lx, ly, 0, lx, ly, 14);
      lg.addColorStop(0, 'rgba(180,255,210,.5)');
      lg.addColorStop(1, 'rgba(120,240,180,0)');
      ctx.fillStyle = lg;
      ctx.fillRect(lx - 14, ly - 14, 28, 28);
    }
    ctx.globalCompositeOperation = 'source-over';
    // runes on trunk
    ctx.strokeStyle = 'rgba(150,255,200,.14)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 5; i++) {
      const y = base - h * (0.1 + i * 0.07);
      ctx.beginPath();
      ctx.moveTo(cx - 8, y); ctx.lineTo(cx + 4, y - 7); ctx.lineTo(cx - 2, y - 14);
      ctx.stroke();
    }
    ctx.restore();
  }
  sword(ctx, x, y, size, t) {
    ctx.save();
    ctx.translate(x, y);
    // rock
    ctx.fillStyle = 'rgba(10,22,18,.98)';
    ctx.beginPath(); ctx.ellipse(0, 0, size * 0.5, size * 0.2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(24,42,34,.95)';
    ctx.beginPath(); ctx.ellipse(-4, -6, size * 0.4, size * 0.13, 0, 0, Math.PI * 2); ctx.fill();
    // blade
    const sh = size * 0.45;
    ctx.rotate(-0.06);
    ctx.fillStyle = '#9fb4b0';
    ctx.beginPath();
    ctx.moveTo(-size * 0.03, 0); ctx.lineTo(-size * 0.015, -sh); ctx.lineTo(0, -sh - size * 0.1);
    ctx.lineTo(size * 0.02, -sh); ctx.lineTo(size * 0.045, 0);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(220,255,240,.35)';
    ctx.fillRect(-size * 0.012, -sh + 4, size * 0.012, sh - 12);
    // guard
    ctx.fillStyle = '#7c6a45';
    ctx.fillRect(-size * 0.12, -size * 0.02, size * 0.24, size * 0.035);
    ctx.fillRect(-size * 0.035, -size * 0.24, size * 0.07, size * 0.24);
    // glow
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(0, -sh * 0.6, 0, 0, -sh * 0.6, size * 0.5);
    g.addColorStop(0, `rgba(170,255,220,${0.07 + Math.sin(t * 1.4) * 0.02})`);
    g.addColorStop(1, 'rgba(140,255,210,0)');
    ctx.fillStyle = g;
    ctx.fillRect(-size * 0.5, -sh - size * 0.3, size, size);
    ctx.restore();
    // grass
    ctx.strokeStyle = 'rgba(20,50,36,.9)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 9; i++) {
      const gx = x + (i - 4) * size * 0.1;
      ctx.beginPath();
      ctx.moveTo(gx, y + 4);
      ctx.quadraticCurveTo(gx + Math.sin(t + i) * 3, y - size * 0.08, gx + Math.sin(t + i) * 6, y - size * 0.15);
      ctx.stroke();
    }
  }
}
