import { TAU, mulberry32, hash2 } from './util.js';

const shadow = (ctx, x, y, rx, ry, a = 0.28) => {
  ctx.fillStyle = `rgba(4,10,8,${a})`;
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU); ctx.fill();
};

function tree(ctx, p, time) {
  const s = p.s;
  const sway = Math.sin(time * 0.55 + p.seed) * 3.2 * s;
  shadow(ctx, p.x + 6 * s, p.y + 2, 42 * s, 16 * s, 0.34);
  // trunk
  ctx.fillStyle = '#2a2018';
  ctx.beginPath();
  ctx.moveTo(p.x - 9 * s, p.y + 4);
  ctx.quadraticCurveTo(p.x - 5 * s, p.y - 34 * s, p.x - 3 * s + sway * 0.4, p.y - 78 * s);
  ctx.lineTo(p.x + 4 * s + sway * 0.4, p.y - 78 * s);
  ctx.quadraticCurveTo(p.x + 7 * s, p.y - 34 * s, p.x + 11 * s, p.y + 4);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(92,72,50,.35)';
  ctx.fillRect(p.x - 2 * s, p.y - 60 * s, 2 * s, 46 * s);
  // roots
  ctx.strokeStyle = '#241c14'; ctx.lineWidth = 5 * s; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(p.x - 6 * s, p.y); ctx.lineTo(p.x - 22 * s, p.y + 7 * s); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(p.x + 6 * s, p.y); ctx.lineTo(p.x + 24 * s, p.y + 6 * s); ctx.stroke();

  const cx = p.x + sway, cy = p.y - 96 * s;
  const r = 56 * s;
  const tone = p.hue;
  const dark = tone < 0.25 ? '#123a2c' : tone < 0.6 ? '#173f2c' : '#10331f';
  const mid = tone < 0.25 ? '#1c5238' : tone < 0.6 ? '#205c3b' : '#18492c';
  const light = tone < 0.25 ? '#2f7a4c' : tone < 0.6 ? '#348752' : '#2a6c41';
  ctx.fillStyle = dark;
  for (const [ox, oy, rr] of [[-22, 6, 0.78], [24, 2, 0.72], [0, -10, 0.9], [-6, 24, 0.62], [30, 22, 0.5], [-34, 24, 0.48]]) {
    ctx.beginPath(); ctx.arc(cx + ox * s, cy + oy * s, r * rr, 0, TAU); ctx.fill();
  }
  ctx.fillStyle = mid;
  for (const [ox, oy, rr] of [[-14, -8, 0.62], [18, -6, 0.58], [0, 8, 0.68], [-26, 14, 0.4], [28, 12, 0.36]]) {
    ctx.beginPath(); ctx.arc(cx + ox * s, cy + oy * s, r * rr, 0, TAU); ctx.fill();
  }
  ctx.fillStyle = light;
  ctx.beginPath(); ctx.arc(cx - 12 * s, cy - 16 * s, r * 0.42, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(cx + 10 * s, cy - 8 * s, r * 0.3, 0, TAU); ctx.fill();
  // rim light from upper-left
  ctx.strokeStyle = 'rgba(160,220,150,.16)'; ctx.lineWidth = 2 * s;
  ctx.beginPath(); ctx.arc(cx - 6 * s, cy - 10 * s, r * 0.86, Math.PI * 0.95, Math.PI * 1.55); ctx.stroke();
  // leaf dots
  ctx.fillStyle = 'rgba(100,190,110,.2)';
  const rng = mulberry32(p.seed + 3);
  for (let i = 0; i < 7; i++) {
    const a = rng() * TAU, rr = rng() * r * 0.9;
    ctx.beginPath(); ctx.arc(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.7, 1.8 * s, 0, TAU); ctx.fill();
  }
}

function rock(ctx, p) {
  const s = p.s;
  shadow(ctx, p.x + 3, p.y + 3, 26 * s, 10 * s, 0.3);
  const rng = mulberry32(p.seed);
  ctx.fillStyle = '#4a5148';
  ctx.beginPath();
  const n = 7;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    const rr = (17 + rng() * 9) * s;
    const x = p.x + Math.cos(a) * rr, y = p.y - 9 * s + Math.sin(a) * rr * 0.72;
    if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
  }
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#616a5c';
  ctx.beginPath(); ctx.ellipse(p.x - 5 * s, p.y - 15 * s, 13 * s, 8 * s, -0.3, 0, TAU); ctx.fill();
  ctx.fillStyle = 'rgba(140,160,130,.24)';
  ctx.beginPath(); ctx.ellipse(p.x - 8 * s, p.y - 18 * s, 6 * s, 3 * s, -0.4, 0, TAU); ctx.fill();
  ctx.fillStyle = 'rgba(70,110,70,.3)';
  ctx.beginPath(); ctx.ellipse(p.x + 6 * s, p.y - 6 * s, 8 * s, 4 * s, 0.2, 0, TAU); ctx.fill();
}

function bush(ctx, p, time) {
  const s = p.s;
  const sway = Math.sin(time * 1.1 + p.seed) * 1.4 * s;
  shadow(ctx, p.x + 2, p.y + 2, 22 * s, 8 * s, 0.26);
  ctx.fillStyle = '#123f2a';
  for (const [ox, oy, rr] of [[-8, -2, 12], [8, 0, 11], [0, -9, 14]]) {
    ctx.beginPath(); ctx.arc(p.x + ox * s + sway * 0.3, p.y + oy * s, rr * s, 0, TAU); ctx.fill();
  }
  ctx.fillStyle = '#1d5c39';
  for (const [ox, oy, rr] of [[-5, -6, 8], [5, -7, 7], [0, -14, 8]]) {
    ctx.beginPath(); ctx.arc(p.x + ox * s + sway * 0.5, p.y + oy * s, rr * s, 0, TAU); ctx.fill();
  }
  ctx.fillStyle = '#2d7a48';
  ctx.beginPath(); ctx.arc(p.x - 4 * s + sway, p.y - 12 * s, 5 * s, 0, TAU); ctx.fill();
  if (p.seed % 3 === 0) {
    ctx.fillStyle = 'rgba(255,190,120,.7)';
    for (let i = 0; i < 3; i++) {
      ctx.beginPath(); ctx.arc(p.x + (i * 7 - 7) * s, p.y - (4 + (i % 2) * 6) * s, 1.6 * s, 0, TAU); ctx.fill();
    }
  }
}

function pillar(ctx, p) {
  const s = 1;
  const h = p.h;
  shadow(ctx, p.x + 8, p.y + 4, 30, 12, 0.3);
  ctx.fillStyle = '#4d554d';
  ctx.beginPath(); ctx.moveTo(p.x - 24, p.y); ctx.lineTo(p.x - 20, p.y - 14); ctx.lineTo(p.x + 20, p.y - 14); ctx.lineTo(p.x + 25, p.y); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#69726a';
  ctx.fillRect(p.x - 15, p.y - h, 30, h - 10);
  ctx.fillStyle = '#7b857b';
  ctx.fillRect(p.x - 15, p.y - h, 10, h - 10);
  ctx.fillStyle = 'rgba(30,38,32,.35)';
  for (let i = 0; i < 5; i++) ctx.fillRect(p.x - 14 + i * 7, p.y - h, 1.4, h - 12);
  if (!p.broken) {
    ctx.fillStyle = '#59635a'; ctx.fillRect(p.x - 20, p.y - h - 14, 40, 15);
    ctx.fillStyle = '#7d887c'; ctx.fillRect(p.x - 20, p.y - h - 14, 40, 5);
  } else {
    ctx.fillStyle = '#4d554d';
    ctx.beginPath();
    ctx.moveTo(p.x - 15, p.y - h + 6);
    ctx.lineTo(p.x - 4, p.y - h - 9);
    ctx.lineTo(p.x + 6, p.y - h + 2);
    ctx.lineTo(p.x + 15, p.y - h + 10);
    ctx.lineTo(p.x + 15, p.y - h + 6);
    ctx.lineTo(p.x - 15, p.y - h + 6);
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(80,130,80,.34)';
  ctx.beginPath(); ctx.ellipse(p.x - 8, p.y - 22, 12, 7, 0.3, 0, TAU); ctx.fill();
  ctx.fillStyle = 'rgba(80,130,80,.24)';
  ctx.beginPath(); ctx.ellipse(p.x + 7, p.y - h * 0.6, 8, 18, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = 'rgba(30,36,30,.5)'; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(p.x + 4, p.y - h * 0.75); ctx.lineTo(p.x + 8, p.y - h * 0.5); ctx.lineTo(p.x + 3, p.y - h * 0.3); ctx.stroke();
}

function wall(ctx, p) {
  shadow(ctx, p.x, p.y + 4, p.w * 0.6, 12, 0.3);
  ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
  ctx.fillStyle = 'rgba(46,54,48,.85)';
  ctx.fillRect(-p.w / 2, -26, p.w, 26);
  ctx.fillStyle = 'rgba(90,100,88,.7)';
  ctx.fillRect(-p.w / 2, -26, p.w, 5);
  ctx.strokeStyle = 'rgba(24,30,26,.5)'; ctx.lineWidth = 1;
  const rng = mulberry32(p.seed);
  for (let i = 0; i < p.w / 18; i++) {
    const x = -p.w / 2 + i * 18;
    ctx.beginPath(); ctx.moveTo(x, -26); ctx.lineTo(x, 0); ctx.stroke();
    if (rng() < 0.6) { ctx.beginPath(); ctx.moveTo(x, -13); ctx.lineTo(x + 18, -13); ctx.stroke(); }
  }
  ctx.fillStyle = 'rgba(80,130,80,.24)';
  ctx.fillRect(-p.w / 2, -6, p.w, 6);
  ctx.restore();
}

function arch(ctx, p) {
  const s = 1.25;
  shadow(ctx, p.x, p.y + 4, 70, 16, 0.3);
  for (const sx of [-1, 1]) {
    const x = p.x + sx * 56;
    ctx.fillStyle = '#59635a'; ctx.fillRect(x - 14, p.y - 150, 28, 150);
    ctx.fillStyle = '#78837a'; ctx.fillRect(x - 14, p.y - 150, 9, 150);
    ctx.fillStyle = '#4a534b'; ctx.fillRect(x - 20, p.y - 8, 40, 10);
    ctx.fillStyle = 'rgba(80,130,80,.3)';
    ctx.fillRect(x - 14, p.y - 40, 28, 14);
  }
  ctx.fillStyle = '#5c665c';
  ctx.beginPath();
  ctx.moveTo(p.x - 76, p.y - 150);
  ctx.quadraticCurveTo(p.x, p.y - 208, p.x + 76, p.y - 150);
  ctx.lineTo(p.x + 76, p.y - 172);
  ctx.quadraticCurveTo(p.x, p.y - 232, p.x - 76, p.y - 172);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#7c877c';
  ctx.beginPath(); ctx.quadraticCurveTo(p.x, p.y - 232, p.x + 76, p.y - 172); ctx.lineTo(p.x + 76, p.y - 163); ctx.quadraticCurveTo(p.x, p.y - 222, p.x - 76, p.y - 163); ctx.closePath(); ctx.fill();
  // missing chunk
  ctx.fillStyle = 'rgba(12,22,17,.85)';
  ctx.beginPath(); ctx.moveTo(p.x + 22, p.y - 214); ctx.lineTo(p.x + 52, p.y - 191); ctx.lineTo(p.x + 34, p.y - 176); ctx.lineTo(p.x + 16, p.y - 200); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,160,90,.55)';
  ctx.beginPath(); ctx.arc(p.x, p.y - 200, 4, 0, TAU); ctx.fill();
  ctx.fillStyle = 'rgba(255,160,90,.16)';
  ctx.beginPath(); ctx.arc(p.x, p.y - 200, 14, 0, TAU); ctx.fill();
}

function statue(ctx, p, time) {
  const s = 1.15;
  shadow(ctx, p.x, p.y + 3, 34, 12, 0.3);
  ctx.fillStyle = '#4a544b';
  ctx.fillRect(p.x - 26, p.y - 18, 52, 20);
  ctx.fillStyle = '#5e695f';
  ctx.fillRect(p.x - 22, p.y - 26, 44, 10);
  // robed figure
  ctx.fillStyle = '#58645b';
  ctx.beginPath();
  ctx.moveTo(p.x - 20, p.y - 18);
  ctx.lineTo(p.x - 12, p.y - 92);
  ctx.lineTo(p.x + 12, p.y - 92);
  ctx.lineTo(p.x + 20, p.y - 18);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#6d796e';
  ctx.beginPath(); ctx.moveTo(p.x - 20, p.y - 18); ctx.lineTo(p.x - 12, p.y - 92); ctx.lineTo(p.x - 2, p.y - 92); ctx.lineTo(p.x - 4, p.y - 18); ctx.closePath(); ctx.fill();
  // hood/head
  ctx.fillStyle = '#4c574e';
  ctx.beginPath(); ctx.arc(p.x, p.y - 104, 17, 0, TAU); ctx.fill();
  ctx.fillStyle = '#20281f';
  ctx.beginPath(); ctx.ellipse(p.x, p.y - 100, 11, 13, 0, 0, TAU); ctx.fill();
  // glowing eyes
  const fl = 0.6 + Math.sin(time * 2 + p.seed) * 0.4;
  ctx.fillStyle = `rgba(255,170,90,${0.55 + fl * 0.4})`;
  ctx.beginPath(); ctx.arc(p.x - 4, p.y - 103, 1.8, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(p.x + 4, p.y - 103, 1.8, 0, TAU); ctx.fill();
  // sword planted
  ctx.strokeStyle = '#7d8a7c'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(p.x + 22, p.y - 12); ctx.lineTo(p.x + 22, p.y - 92); ctx.stroke();
  ctx.strokeStyle = '#3c463c'; ctx.lineWidth = 7;
  ctx.beginPath(); ctx.moveTo(p.x + 14, p.y - 64); ctx.lineTo(p.x + 30, p.y - 64); ctx.stroke();
  ctx.fillStyle = 'rgba(80,130,80,.3)';
  ctx.beginPath(); ctx.ellipse(p.x - 8, p.y - 30, 10, 8, 0, 0, TAU); ctx.fill();
}

function monolith(ctx, p, time) {
  const h = p.h;
  shadow(ctx, p.x + 8, p.y + 4, 34, 13, 0.34);
  ctx.fillStyle = '#30352f';
  ctx.beginPath();
  ctx.moveTo(p.x - 22, p.y);
  ctx.lineTo(p.x - 17, p.y - h);
  ctx.lineTo(p.x + 5, p.y - h - 20);
  ctx.lineTo(p.x + 20, p.y - h + 8);
  ctx.lineTo(p.x + 25, p.y);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(120,130,110,.25)';
  ctx.beginPath();
  ctx.moveTo(p.x - 22, p.y);
  ctx.lineTo(p.x - 17, p.y - h);
  ctx.lineTo(p.x - 6, p.y - h - 8);
  ctx.lineTo(p.x - 8, p.y);
  ctx.closePath(); ctx.fill();
  // glowing cracks
  const fl = 0.5 + Math.sin(time * 1.3 + p.seed) * 0.35;
  ctx.strokeStyle = `rgba(255,150,80,${0.35 + fl * 0.4})`;
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(p.x - 4, p.y - h * 0.92);
  ctx.lineTo(p.x + 2, p.y - h * 0.7);
  ctx.lineTo(p.x - 3, p.y - h * 0.48);
  ctx.lineTo(p.x + 4, p.y - h * 0.24);
  ctx.stroke();
  ctx.fillStyle = `rgba(255,160,80,${0.2 + fl * 0.2})`;
  ctx.beginPath(); ctx.arc(p.x + 1, p.y - h * 0.6, 12, 0, TAU); ctx.fill();
  ctx.fillStyle = 'rgba(70,110,70,.28)';
  ctx.beginPath(); ctx.ellipse(p.x + 6, p.y - 6, 16, 6, 0.2, 0, TAU); ctx.fill();
}

function tent(ctx, p) {
  const s = p.s;
  shadow(ctx, p.x + 6, p.y + 3, 62 * s, 18 * s, 0.3);
  ctx.fillStyle = '#2c2620';
  ctx.beginPath(); ctx.moveTo(p.x - 66 * s, p.y); ctx.lineTo(p.x - 52 * s, p.y - 82 * s); ctx.lineTo(p.x + 52 * s, p.y - 82 * s); ctx.lineTo(p.x + 66 * s, p.y); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#6f5a44';
  ctx.beginPath(); ctx.moveTo(p.x - 58 * s, p.y); ctx.lineTo(p.x - 48 * s, p.y - 76 * s); ctx.lineTo(p.x, p.y - 104 * s); ctx.lineTo(p.x + 48 * s, p.y - 76 * s); ctx.lineTo(p.x + 58 * s, p.y); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#85704f';
  ctx.beginPath(); ctx.moveTo(p.x - 58 * s, p.y); ctx.lineTo(p.x - 48 * s, p.y - 76 * s); ctx.lineTo(p.x, p.y - 104 * s); ctx.lineTo(p.x - 6 * s, p.y); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#55432f';
  ctx.beginPath(); ctx.moveTo(p.x + 6 * s, p.y); ctx.lineTo(p.x + 40 * s, p.y - 84 * s); ctx.lineTo(p.x + 58 * s, p.y); ctx.closePath(); ctx.fill();
  // flap opening
  ctx.fillStyle = '#241f18';
  ctx.beginPath(); ctx.moveTo(p.x + 10 * s, p.y); ctx.lineTo(p.x + 16 * s, p.y - 66 * s); ctx.lineTo(p.x + 40 * s, p.y - 82 * s); ctx.lineTo(p.x + 46 * s, p.y); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,180,90,.28)';
  ctx.beginPath(); ctx.ellipse(p.x + 28 * s, p.y - 18 * s, 12 * s, 14 * s, 0, 0, TAU); ctx.fill();
  // poles
  ctx.strokeStyle = '#3c2f22'; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(p.x - 58 * s, p.y); ctx.lineTo(p.x, p.y - 112 * s); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(p.x + 58 * s, p.y); ctx.lineTo(p.x, p.y - 112 * s); ctx.stroke();
  ctx.fillStyle = '#a8895d';
  ctx.beginPath(); ctx.arc(p.x, p.y - 114 * s, 3 * s, 0, TAU); ctx.fill();
  // hanging pennant
  ctx.fillStyle = '#b8402f';
  ctx.beginPath(); ctx.moveTo(p.x + 4 * s, p.y - 108 * s); ctx.lineTo(p.x + 26 * s, p.y - 102 * s); ctx.lineTo(p.x + 22 * s, p.y - 88 * s); ctx.lineTo(p.x + 4 * s, p.y - 92 * s); ctx.closePath(); ctx.fill();
}

function tentSmall(ctx, p) {
  const s = p.s;
  shadow(ctx, p.x, p.y + 2, 40 * s, 12 * s, 0.26);
  ctx.fillStyle = '#4b4234';
  ctx.beginPath(); ctx.moveTo(p.x - 40 * s, p.y); ctx.lineTo(p.x, p.y - 62 * s); ctx.lineTo(p.x + 40 * s, p.y); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#7a694d';
  ctx.beginPath(); ctx.moveTo(p.x - 34 * s, p.y); ctx.lineTo(p.x + 2 * s, p.y - 56 * s); ctx.lineTo(p.x + 34 * s, p.y); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#2a231b';
  ctx.beginPath(); ctx.moveTo(p.x - 2 * s, p.y); ctx.lineTo(p.x + 2 * s, p.y - 42 * s); ctx.lineTo(p.x + 22 * s, p.y); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#332a1e'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(p.x - 40 * s, p.y); ctx.lineTo(p.x, p.y - 66 * s); ctx.stroke();
}

function board(ctx, p, time) {
  shadow(ctx, p.x + 4, p.y + 3, 34, 10, 0.28);
  ctx.strokeStyle = '#3c2e20'; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.moveTo(p.x - 20, p.y); ctx.lineTo(p.x - 20, p.y - 78); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(p.x + 20, p.y); ctx.lineTo(p.x + 20, p.y - 78); ctx.stroke();
  ctx.fillStyle = '#5c4630';
  ctx.fillRect(p.x - 34, p.y - 96, 68, 52);
  ctx.fillStyle = '#71583c';
  ctx.fillRect(p.x - 34, p.y - 96, 68, 5);
  ctx.strokeStyle = '#3a2c1e'; ctx.lineWidth = 2; ctx.strokeRect(p.x - 34, p.y - 96, 68, 52);
  ctx.fillStyle = '#d9cfae';
  ctx.save(); ctx.translate(p.x - 18, p.y - 82); ctx.rotate(-0.06); ctx.fillRect(-11, -8, 22, 27); ctx.restore();
  ctx.fillStyle = '#c9b98f';
  ctx.save(); ctx.translate(p.x + 16, p.y - 86); ctx.rotate(0.08); ctx.fillRect(-10, -8, 20, 24); ctx.restore();
  ctx.strokeStyle = 'rgba(90,70,45,.7)'; ctx.lineWidth = 1;
  for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(p.x - 26, p.y - 88 + i * 5); ctx.lineTo(p.x - 8, p.y - 88 + i * 5); ctx.stroke(); }
  // glowing quest sigil
  ctx.fillStyle = 'rgba(255,200,110,.5)';
  ctx.beginPath(); ctx.arc(p.x + 20, p.y - 70, 3, 0, TAU); ctx.fill();
}

function anvil(ctx, p) {
  shadow(ctx, p.x, p.y + 2, 24, 8, 0.3);
  ctx.fillStyle = '#3c332c'; ctx.fillRect(p.x - 9, p.y - 8, 18, 8);
  ctx.fillStyle = '#57493c'; ctx.fillRect(p.x - 18, p.y - 22, 36, 14);
  ctx.fillStyle = '#6a5a4a'; ctx.fillRect(p.x - 16, p.y - 24, 32, 4);
  ctx.fillStyle = '#57493c';
  ctx.beginPath(); ctx.moveTo(p.x + 18, p.y - 20); ctx.lineTo(p.x + 34, p.y - 26); ctx.lineTo(p.x + 32, p.y - 19); ctx.lineTo(p.x + 18, p.y - 12); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#6f5e4c'; ctx.fillRect(p.x - 22, p.y - 34, 6, 10);
  ctx.fillStyle = 'rgba(255,150,70,.5)';
  ctx.beginPath(); ctx.arc(p.x + 4, p.y - 30, 3, 0, TAU); ctx.fill();
}

function banner(ctx, p, time) {
  const s = p.s;
  const wave = Math.sin(time * 1.4 + p.seed) * 4;
  shadow(ctx, p.x, p.y + 2, 10, 4, 0.3);
  ctx.strokeStyle = '#3a2c20'; ctx.lineWidth = 4 * s;
  ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + 1, p.y - 160 * s); ctx.stroke();
  ctx.fillStyle = '#a98a55';
  ctx.beginPath(); ctx.arc(p.x + 1, p.y - 162 * s, 4 * s, 0, TAU); ctx.fill();
  // cloth
  ctx.fillStyle = '#72322c';
  ctx.beginPath();
  ctx.moveTo(p.x + 2, p.y - 154 * s);
  ctx.quadraticCurveTo(p.x + 22 * s + wave, p.y - 140 * s, p.x + 20 * s + wave, p.y - 106 * s);
  ctx.lineTo(p.x + 12 * s + wave * 0.6, p.y - 116 * s);
  ctx.lineTo(p.x + 6 * s + wave * 0.4, p.y - 104 * s);
  ctx.lineTo(p.x + 2, p.y - 112 * s);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(240,200,140,.4)';
  ctx.beginPath(); ctx.moveTo(p.x + 8 * s, p.y - 146 * s); ctx.lineTo(p.x + 10 * s, p.y - 132 * s); ctx.lineTo(p.x + 4 * s, p.y - 138 * s); ctx.closePath(); ctx.fill();
}

function crates(ctx, p) {
  const s = p.s;
  shadow(ctx, p.x + 3, p.y + 3, 30 * s, 10 * s, 0.28);
  ctx.fillStyle = '#5a4630'; ctx.fillRect(p.x - 24 * s, p.y - 30 * s, 30 * s, 30 * s);
  ctx.fillStyle = '#6d573c'; ctx.fillRect(p.x - 24 * s, p.y - 30 * s, 30 * s, 5 * s);
  ctx.strokeStyle = '#3b2e20'; ctx.lineWidth = 2;
  ctx.strokeRect(p.x - 24 * s, p.y - 30 * s, 30 * s, 30 * s);
  ctx.beginPath(); ctx.moveTo(p.x - 24 * s, p.y - 30 * s); ctx.lineTo(p.x + 6 * s, p.y); ctx.moveTo(p.x + 6 * s, p.y - 30 * s); ctx.lineTo(p.x - 24 * s, p.y); ctx.stroke();
  ctx.fillStyle = '#4d3c28'; ctx.fillRect(p.x + 2 * s, p.y - 20 * s, 20 * s, 20 * s);
  ctx.strokeStyle = '#33281c'; ctx.strokeRect(p.x + 2 * s, p.y - 20 * s, 20 * s, 20 * s);
}

function well(ctx, p) {
  shadow(ctx, p.x, p.y + 4, 34, 11, 0.3);
  ctx.fillStyle = '#4b554c';
  ctx.beginPath(); ctx.ellipse(p.x, p.y - 12, 30, 16, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#616d62';
  ctx.beginPath(); ctx.ellipse(p.x, p.y - 18, 27, 14, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#101c18';
  ctx.beginPath(); ctx.ellipse(p.x, p.y - 19, 20, 10, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = '#43362a'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(p.x - 26, p.y - 20); ctx.lineTo(p.x - 26, p.y - 74); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(p.x + 26, p.y - 20); ctx.lineTo(p.x + 26, p.y - 74); ctx.stroke();
  ctx.fillStyle = '#5c4630';
  ctx.beginPath(); ctx.moveTo(p.x - 36, p.y - 72); ctx.lineTo(p.x, p.y - 92); ctx.lineTo(p.x + 36, p.y - 72); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#3a2c20'; ctx.fillRect(p.x - 4, p.y - 68, 8, 20);
  ctx.fillStyle = '#7c6a4c'; ctx.fillRect(p.x - 8, p.y - 50, 16, 6);
}

function glowstone(ctx, p, time) {
  const s = p.s;
  const fl = 0.55 + Math.sin(time * 2.4 + p.seed) * 0.3;
  const g = ctx.createRadialGradient(p.x, p.y - 8, 0, p.x, p.y - 8, 30 * s);
  g.addColorStop(0, `rgba(255,190,120,${0.35 * fl})`);
  g.addColorStop(1, 'rgba(255,160,90,0)');
  ctx.fillStyle = g; ctx.fillRect(p.x - 34 * s, p.y - 42 * s, 68 * s, 68 * s);
  ctx.fillStyle = '#4d574c';
  ctx.beginPath(); ctx.ellipse(p.x, p.y - 5, 12 * s, 8 * s, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#6b7668';
  ctx.beginPath(); ctx.ellipse(p.x - 2, p.y - 9, 8 * s, 5 * s, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = `rgba(255,200,130,${0.6 + fl * 0.4})`;
  ctx.beginPath(); ctx.arc(p.x, p.y - 16, 2.6 * s, 0, TAU); ctx.fill();
}

const drawers = {
  tree, rock, bush, pillar, wall, arch, statue, monolith,
  tent, tentSmall, board, anvil, banner, crates, well, glowstone,
};

export function propDrawer(kind) { return drawers[kind]; }
export function drawProp(ctx, p, time) {
  const d = drawers[p.kind];
  if (d) d(ctx, p, time);
}
