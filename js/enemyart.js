import { TAU, clamp, lerp, rand, mulberry32 } from './util.js';

export function drawEnemyArt(ctx, e, time) {
  const spawn = e.spawnT > 0 ? clamp(1 - e.spawnT / 0.6, 0, 1) : 1;
  const death = e.dead ? clamp(e.deathT / 0.7, 0, 1) : 0;
  ctx.save();
  ctx.globalAlpha *= spawn * (1 - death * 0.85);
  ctx.translate(e.x, e.y);
  if (death > 0) ctx.scale(1 - death * 0.3, 1 - death * 0.3);
  if (e.flash > 0) {
    const g = ctx.createRadialGradient(0, -30 * e.scale, 0, 0, -30 * e.scale, 55 * e.scale);
    g.addColorStop(0, `rgba(255,255,255,${0.35 * e.flash})`);
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(-70, -110 * e.scale, 140, 140);
  }
  ctx.scale(e.scale, e.scale);
  if (e.type === 'slime') slime(ctx, e, time);
  else if (e.type === 'wolf') wolf(ctx, e, time);
  else if (e.type === 'skeleton') skeleton(ctx, e, time);
  else if (e.type === 'wisp') wisp(ctx, e, time);
  else if (e.type === 'warden') warden(ctx, e, time);
  else if (e.type === 'boss') boss(ctx, e, time);
  else skeleton(ctx, e, time);
  ctx.restore();
  // ground telegraph
  if (!e.dead && e.aggro && (e.state === 'windup' || e.state === 'cast' || e.state === 'slamWindup') && e.type !== 'boss') {
    const pulse = 0.35 + Math.sin(time * 26) * 0.2;
    ctx.save();
    ctx.strokeStyle = `rgba(255,110,90,${pulse})`;
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 7]);
    ctx.beginPath(); ctx.arc(e.x, e.y, e.cfg.reach + 14, 0, TAU); ctx.stroke();
    ctx.restore();
  }
}

function shadowEllipse(ctx, rx, ry, a = 0.36) {
  ctx.fillStyle = `rgba(3,8,6,${a})`;
  ctx.beginPath(); ctx.ellipse(3, 2, rx, ry, 0, 0, TAU); ctx.fill();
}

function slime(ctx, e, time) {
  const wob = Math.sin(time * 4 + e.id) * 0.08;
  const hop = e.state === 'hop' ? 6 : 0;
  const wind = e.state === 'windup' ? 0.75 : 1;
  shadowEllipse(ctx, 24, 9);
  const bx = 0, by = -16 - hop;
  ctx.save();
  ctx.translate(bx, by);
  ctx.scale(1 + wob + (1 - wind) * 0.2, wind - wob * 0.6);
  const g = ctx.createRadialGradient(-7, -9, 2, 0, 0, 30);
  g.addColorStop(0, '#c9ff86');
  g.addColorStop(0.45, '#83d94a');
  g.addColorStop(1, '#377a2c');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-26, 12);
  ctx.bezierCurveTo(-30, -10, -14, -26, 0, -26);
  ctx.bezierCurveTo(16, -26, 30, -10, 26, 12);
  ctx.quadraticCurveTo(0, 20, -26, 12);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(28,66,24,.55)'; ctx.lineWidth = 1.5; ctx.stroke();
  // glossy highlights
  ctx.fillStyle = 'rgba(235,255,190,.6)';
  ctx.beginPath(); ctx.ellipse(-8, -15, 9, 5, -0.5, 0, TAU); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,220,.35)';
  ctx.beginPath(); ctx.ellipse(7, -5, 4, 2.4, 0.3, 0, TAU); ctx.fill();
  // eyes
  const ex = Math.cos(e.facing) * 4;
  ctx.fillStyle = '#f7ffe8';
  ctx.beginPath(); ctx.ellipse(ex - 8, -10, 5.4, 6, 0, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.ellipse(ex + 8, -10, 5.4, 6, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#152a12';
  const lx = clamp(Math.cos(e.facing) * 2, -2.5, 2.5);
  ctx.beginPath(); ctx.arc(ex - 8 + lx, -9, 2.8, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(ex + 8 + lx, -9, 2.8, 0, TAU); ctx.fill();
  ctx.strokeStyle = '#2b4c1f'; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.arc(ex, -1, 5, 0.15, Math.PI - 0.15); ctx.stroke();
  // sprout
  ctx.strokeStyle = '#3f7a2e'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, -24); ctx.quadraticCurveTo(3, -34, 10, -35); ctx.stroke();
  ctx.fillStyle = '#7ac454';
  ctx.beginPath(); ctx.ellipse(13, -36, 7, 3.4, -0.4, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.ellipse(-6, -33, 5, 2.6, 0.6, 0, TAU); ctx.fill();
  // core glint
  ctx.fillStyle = 'rgba(220,255,150,.4)';
  ctx.beginPath(); ctx.arc(0, 1, 6, 0, TAU); ctx.fill();
  ctx.restore();
}

function wolf(ctx, e, time) {
  const dir = Math.cos(e.facing) < 0 ? -1 : 1;
  const walk = e.walk;
  shadowEllipse(ctx, 28, 8);
  ctx.save();
  ctx.scale(dir, 1);
  const bounce = e.state === 'charge' ? -3 : Math.sin(walk * 1.4) * 1.4;
  ctx.translate(0, bounce);
  // tail
  ctx.strokeStyle = '#2e3533'; ctx.lineWidth = 5; ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-24, -20);
  ctx.quadraticCurveTo(-40, -26 + Math.sin(time * 3) * 4, -36, -38);
  ctx.stroke();
  ctx.strokeStyle = '#465049'; ctx.lineWidth = 2.4;
  ctx.beginPath(); ctx.moveTo(-24, -20); ctx.quadraticCurveTo(-38, -26, -36, -36); ctx.stroke();
  // legs
  ctx.strokeStyle = '#262e2b'; ctx.lineWidth = 4.5;
  for (let i = 0; i < 4; i++) {
    const lx = -18 + i * 12;
    const ph = Math.sin(walk * 2 + i * 1.9) * (e.state === 'charge' ? 7 : 4);
    ctx.beginPath(); ctx.moveTo(lx, -16); ctx.lineTo(lx + ph, -2); ctx.stroke();
  }
  // body
  const bg = ctx.createLinearGradient(0, -34, 0, -12);
  bg.addColorStop(0, '#59635a');
  bg.addColorStop(0.6, '#3d4741');
  bg.addColorStop(1, '#242c28');
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.ellipse(-2, -22, 27, 14, -0.06, 0, TAU); ctx.fill();
  // fur ridge
  ctx.fillStyle = '#525d52';
  ctx.beginPath();
  ctx.moveTo(-22, -30); ctx.lineTo(-14, -38); ctx.lineTo(-8, -31);
  ctx.lineTo(-2, -39); ctx.lineTo(4, -31); ctx.lineTo(10, -36); ctx.lineTo(16, -29);
  ctx.closePath(); ctx.fill();
  // neck + head
  ctx.fillStyle = '#39433d';
  ctx.beginPath(); ctx.ellipse(20, -30, 11, 10, 0.2, 0, TAU); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(20, -40);
  ctx.quadraticCurveTo(36, -40, 40, -30);
  ctx.quadraticCurveTo(34, -22, 22, -23);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#2d3530';
  ctx.beginPath(); ctx.ellipse(39, -27, 6, 4.4, 0.1, 0, TAU); ctx.fill();
  // ears
  ctx.fillStyle = '#333d37';
  ctx.beginPath(); ctx.moveTo(17, -40); ctx.lineTo(16, -51); ctx.lineTo(25, -43); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(26, -41); ctx.lineTo(30, -51); ctx.lineTo(33, -41); ctx.closePath(); ctx.fill();
  // eyes
  const glow = 0.7 + Math.sin(time * 4 + e.id) * 0.3;
  ctx.fillStyle = `rgba(255,190,80,${glow})`;
  ctx.beginPath(); ctx.arc(31, -33, 2.4, 0, TAU); ctx.fill();
  ctx.fillStyle = 'rgba(255,220,140,.22)';
  ctx.beginPath(); ctx.arc(31, -33, 7, 0, TAU); ctx.fill();
  // fangs
  ctx.fillStyle = '#e8e6d8';
  ctx.beginPath(); ctx.moveTo(40, -24); ctx.lineTo(43, -20); ctx.lineTo(38, -22); ctx.closePath(); ctx.fill();
  // collar / mark
  ctx.strokeStyle = 'rgba(255,150,80,.35)'; ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.arc(-6, -22, 9, 0.3, 2.6); ctx.stroke();
  ctx.restore();
}

function skeleton(ctx, e, time) {
  const dir = Math.cos(e.facing) < 0 ? -1 : 1;
  const walk = e.walk;
  shadowEllipse(ctx, 20, 7);
  ctx.save();
  ctx.scale(dir, 1);
  const bob = Math.sin(walk * 1.2) * 1.2;
  ctx.translate(0, bob);
  // tattered cape
  ctx.fillStyle = 'rgba(38,44,52,.85)';
  ctx.beginPath();
  ctx.moveTo(-10, -48);
  ctx.quadraticCurveTo(-24 - Math.sin(time * 2) * 3, -26, -16, -4);
  ctx.lineTo(-4, -8); ctx.lineTo(2, -2);
  ctx.quadraticCurveTo(4, -28, 2, -48);
  ctx.closePath(); ctx.fill();
  // legs
  ctx.strokeStyle = '#cfc8ad'; ctx.lineWidth = 3.4; ctx.lineCap = 'round';
  for (let i = 0; i < 2; i++) {
    const lx = -4 + i * 9;
    const ph = Math.sin(walk * 2 + i * Math.PI) * 5;
    ctx.beginPath(); ctx.moveTo(lx, -24); ctx.lineTo(lx + ph, -12); ctx.lineTo(lx + ph * 1.4, -1); ctx.stroke();
    ctx.fillStyle = '#35453a';
    ctx.beginPath(); ctx.ellipse(lx + ph * 1.4, -1, 5, 3, 0, 0, TAU); ctx.fill();
  }
  // spine + ribs
  ctx.strokeStyle = '#d9d3ba'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(0, -24); ctx.lineTo(0, -52); ctx.stroke();
  ctx.strokeStyle = '#c4bda2'; ctx.lineWidth = 2;
  for (let i = 0; i < 4; i++) {
    const yy = -46 + i * 5.5;
    ctx.beginPath(); ctx.moveTo(0, yy); ctx.quadraticCurveTo(-11, yy + 3, -8, yy + 8); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, yy); ctx.quadraticCurveTo(10, yy + 3, 8, yy + 8); ctx.stroke();
  }
  // shoulder bones
  ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(-10, -51); ctx.lineTo(10, -51); ctx.stroke();
  // skull
  ctx.fillStyle = '#e2dcc4';
  ctx.beginPath(); ctx.arc(2, -60, 9.5, 0, TAU); ctx.fill();
  ctx.fillRect(0, -56, 7, 6);
  ctx.fillStyle = '#22251d';
  ctx.beginPath(); ctx.ellipse(0, -61, 2.6, 3.2, 0, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.ellipse(6, -61, 2.6, 3.2, 0, 0, TAU); ctx.fill();
  const gl = 0.6 + Math.sin(time * 3 + e.id) * 0.3;
  ctx.fillStyle = `rgba(255,170,80,${gl})`;
  ctx.beginPath(); ctx.arc(0, -61, 1.3, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(6, -61, 1.3, 0, TAU); ctx.fill();
  ctx.fillStyle = '#2b2d24';
  ctx.fillRect(1.5, -53, 4.5, 1.4);
  // shield (front)
  ctx.save();
  ctx.translate(11, -36);
  ctx.fillStyle = '#4b4434';
  ctx.beginPath();
  ctx.moveTo(-8, -14); ctx.lineTo(8, -12); ctx.lineTo(7, 8); ctx.lineTo(0, 15); ctx.lineTo(-7, 8);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#7b6c4a'; ctx.lineWidth = 1.6; ctx.stroke();
  ctx.strokeStyle = '#b8a06a'; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(0, 9); ctx.stroke();
  ctx.restore();
  // sword arm
  ctx.strokeStyle = '#cfc8ad'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(-10, -45); ctx.lineTo(-18, -32); ctx.stroke();
  ctx.strokeStyle = '#9b9078'; ctx.lineWidth = 3.4;
  ctx.beginPath(); ctx.moveTo(-18, -32); ctx.lineTo(-26, -60); ctx.stroke();
  ctx.strokeStyle = '#5b4a33'; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(-21, -38); ctx.lineTo(-28, -34); ctx.stroke();
  ctx.restore();
}

function wisp(ctx, e, time) {
  const bob = Math.sin(time * 2.4 + e.id) * 5;
  const y = -36 + bob;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(0, y, 2, 0, y, 34);
  g.addColorStop(0, 'rgba(230,210,255,.95)');
  g.addColorStop(0.25, 'rgba(170,130,255,.7)');
  g.addColorStop(0.6, 'rgba(120,80,220,.26)');
  g.addColorStop(1, 'rgba(100,60,200,0)');
  ctx.fillStyle = g;
  ctx.fillRect(-40, y - 40, 80, 80);
  // core
  ctx.fillStyle = 'rgba(255,250,255,.95)';
  ctx.beginPath(); ctx.arc(0, y, 7, 0, TAU); ctx.fill();
  ctx.fillStyle = 'rgba(210,180,255,.8)';
  ctx.beginPath(); ctx.arc(0, y, 12, 0, TAU); ctx.fill();
  // motes
  for (let i = 0; i < 4; i++) {
    const a = time * 1.6 + i * TAU / 4;
    const rr = 20 + Math.sin(time * 2 + i) * 4;
    ctx.fillStyle = `rgba(220,190,255,${0.5 + Math.sin(time * 3 + i) * 0.3})`;
    ctx.beginPath(); ctx.arc(Math.cos(a) * rr, y + Math.sin(a) * rr * 0.6, 2.6, 0, TAU); ctx.fill();
  }
  // trailing flame
  ctx.strokeStyle = 'rgba(180,140,255,.4)'; ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, y + 10);
  ctx.quadraticCurveTo(Math.sin(time * 4) * 8, y + 24, Math.sin(time * 3) * 12, y + 32);
  ctx.stroke();
  ctx.restore();
  // eyes
  ctx.fillStyle = 'rgba(70,30,110,.9)';
  ctx.beginPath(); ctx.arc(-4, y - 1, 1.8, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(4, y - 1, 1.8, 0, TAU); ctx.fill();
}

function warden(ctx, e, time) {
  const dir = Math.cos(e.facing) < 0 ? -1 : 1;
  shadowEllipse(ctx, 34, 11, 0.42);
  ctx.save();
  ctx.scale(dir, 1);
  const bob = Math.sin(time * 1.4 + e.id) * 1.4;
  ctx.translate(0, bob);
  // cape
  ctx.fillStyle = '#2a1c24';
  ctx.beginPath();
  ctx.moveTo(-16, -78);
  ctx.quadraticCurveTo(-36, -40, -26, -6);
  ctx.lineTo(-6, -12); ctx.lineTo(4, -4);
  ctx.quadraticCurveTo(10, -46, 4, -78);
  ctx.closePath(); ctx.fill();
  // legs armored
  ctx.strokeStyle = '#343b44'; ctx.lineWidth = 8; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-9, -34); ctx.lineTo(-12, -6); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(9, -34); ctx.lineTo(12, -6); ctx.stroke();
  ctx.fillStyle = '#4c5660';
  ctx.beginPath(); ctx.ellipse(-13, -4, 8, 5, 0, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.ellipse(13, -4, 8, 5, 0, 0, TAU); ctx.fill();
  // torso armor
  const g = ctx.createLinearGradient(-24, -84, 24, -30);
  g.addColorStop(0, '#5a6670');
  g.addColorStop(0.5, '#39434d');
  g.addColorStop(1, '#232a31');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-22, -76);
  ctx.quadraticCurveTo(-28, -48, -16, -30);
  ctx.lineTo(16, -30);
  ctx.quadraticCurveTo(28, -48, 22, -76);
  ctx.quadraticCurveTo(0, -88, -22, -76);
  ctx.closePath(); ctx.fill();
  // ribs armor plates
  ctx.strokeStyle = 'rgba(120,135,145,.5)'; ctx.lineWidth = 2;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath(); ctx.arc(0, -66 + i * 10, 18, 0.3, Math.PI - 0.3); ctx.stroke();
  }
  // glowing core
  const pulse = 0.6 + Math.sin(time * 3) * 0.3;
  ctx.fillStyle = `rgba(255,150,70,${pulse})`;
  ctx.beginPath(); ctx.arc(0, -56, 5, 0, TAU); ctx.fill();
  ctx.fillStyle = `rgba(255,120,60,${0.2 * pulse})`;
  ctx.beginPath(); ctx.arc(0, -56, 14, 0, TAU); ctx.fill();
  // pauldrons
  ctx.fillStyle = '#4a545e';
  ctx.beginPath(); ctx.ellipse(-24, -74, 10, 8, -0.4, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.ellipse(24, -74, 10, 8, 0.4, 0, TAU); ctx.fill();
  // helmet skull
  ctx.fillStyle = '#d6d0b8';
  ctx.beginPath(); ctx.arc(0, -92, 10, 0, TAU); ctx.fill();
  ctx.fillStyle = '#38424a';
  ctx.beginPath(); ctx.arc(0, -96, 11, Math.PI, TAU); ctx.fill();
  // horns
  ctx.strokeStyle = '#c7b891'; ctx.lineWidth = 3.4;
  ctx.beginPath(); ctx.moveTo(-8, -99); ctx.quadraticCurveTo(-16, -112, -22, -108); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(8, -99); ctx.quadraticCurveTo(16, -112, 22, -108); ctx.stroke();
  // eyes
  ctx.fillStyle = `rgba(255,170,80,${0.7 + pulse * 0.3})`;
  ctx.beginPath(); ctx.arc(-4, -91, 2.2, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(4, -91, 2.2, 0, TAU); ctx.fill();
  // greatsword
  ctx.save();
  ctx.translate(26, -46);
  ctx.rotate(-0.35 + Math.sin(time * 1.2) * 0.05);
  ctx.fillStyle = '#8e99a2';
  ctx.beginPath();
  ctx.moveTo(-3, 0); ctx.lineTo(3, 0); ctx.lineTo(4, -68); ctx.lineTo(0, -78); ctx.lineTo(-4, -68);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,220,170,.4)';
  ctx.fillRect(-1, -64, 1.5, 60);
  ctx.fillStyle = '#5c4226';
  ctx.fillRect(-8, 0, 16, 4);
  ctx.fillRect(-2.5, 4, 5, 14);
  ctx.restore();
  ctx.restore();
}

function boss(ctx, e, time) {
  const sway = Math.sin(time * 0.8) * 3;
  const walk = Math.sin(e.walk * 1.6) * 4;
  const p2 = e.phase === 2;
  const active = e.state === 'attack' || e.bossAttack;
  // shadow
  ctx.fillStyle = 'rgba(2,6,4,.5)';
  ctx.beginPath(); ctx.ellipse(4, 6, 90, 26, 0, 0, TAU); ctx.fill();
  // root legs
  ctx.strokeStyle = '#2b2a20'; ctx.lineWidth = 22; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-34, -20); ctx.quadraticCurveTo(-56, 0, -72, 6); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(30, -20); ctx.quadraticCurveTo(52, 0, 70, 6); ctx.stroke();
  ctx.strokeStyle = '#46442f'; ctx.lineWidth = 13;
  ctx.beginPath(); ctx.moveTo(-34, -20); ctx.quadraticCurveTo(-54, -2, -68, 4); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(30, -20); ctx.quadraticCurveTo(50, -2, 66, 4); ctx.stroke();

  // body mass
  const g = ctx.createLinearGradient(-60, -190, 70, -20);
  g.addColorStop(0, '#5a5b42');
  g.addColorStop(0.4, '#3c3f2e');
  g.addColorStop(0.75, '#2c2f22');
  g.addColorStop(1, '#1d2118');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-58, -32);
  ctx.bezierCurveTo(-84, -70, -72, -130, -40, -156);
  ctx.bezierCurveTo(-14, -178, 20, -178, 44, -154);
  ctx.bezierCurveTo(74, -128, 82, -66, 54, -30);
  ctx.bezierCurveTo(30, -12, -30, -12, -58, -32);
  ctx.closePath(); ctx.fill();

  // bark ridges
  ctx.strokeStyle = 'rgba(20,22,15,.5)'; ctx.lineWidth = 2.5;
  const rng = mulberry32(88);
  for (let i = 0; i < 9; i++) {
    const x = -46 + i * 11 + rng() * 4;
    ctx.beginPath();
    ctx.moveTo(x, -40 - rng() * 20);
    ctx.bezierCurveTo(x + 8, -80, x - 6, -110, x + 4, -150 + rng() * 20);
    ctx.stroke();
  }
  // moss
  ctx.fillStyle = 'rgba(70,120,60,.3)';
  ctx.beginPath(); ctx.ellipse(-38, -140, 24, 12, -0.5, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.ellipse(20, -70, 18, 26, 0.2, 0, TAU); ctx.fill();

  // arms (branch claws)
  const armSwing = active ? Math.sin(time * 6) * 10 : Math.sin(time * 1.1) * 3;
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.translate(side * 58, -128);
    ctx.rotate(side * (0.35 + (active ? 0.5 : 0)) + armSwing * 0.02);
    ctx.strokeStyle = '#2f3224'; ctx.lineWidth = 20; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(side * 20, 40, side * 12, 88); ctx.stroke();
    ctx.strokeStyle = '#464a34'; ctx.lineWidth = 11;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(side * 20, 40, side * 12, 86); ctx.stroke();
    // claws
    ctx.strokeStyle = '#8a8260'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(side * 12, 84);
      ctx.quadraticCurveTo(side * (18 + i * 3), 98, side * (10 + i * 8), 108);
      ctx.stroke();
    }
    ctx.restore();
  }

  // chest core
  const pulse = 0.65 + Math.sin(time * 2.4) * 0.25 + (active ? 0.15 : 0);
  const cg = ctx.createRadialGradient(0, -104, 2, 0, -104, 46);
  cg.addColorStop(0, `rgba(255,240,190,${0.95 * pulse})`);
  cg.addColorStop(0.18, `rgba(255,170,80,${0.85 * pulse})`);
  cg.addColorStop(0.5, `rgba(220,90,40,${0.28 * pulse})`);
  cg.addColorStop(1, 'rgba(200,60,20,0)');
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = cg;
  ctx.fillRect(-50, -154, 100, 100);
  ctx.globalCompositeOperation = 'source-over';
  // core cracks
  ctx.strokeStyle = `rgba(255,190,110,${0.5 + pulse * 0.4})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-20, -120); ctx.lineTo(-6, -110); ctx.lineTo(-10, -94); ctx.lineTo(8, -86);
  ctx.moveTo(4, -130); ctx.lineTo(14, -114); ctx.lineTo(6, -100);
  ctx.stroke();
  ctx.fillStyle = `rgba(255,220,150,${0.7 * pulse})`;
  ctx.beginPath(); ctx.arc(0, -104, 8, 0, TAU); ctx.fill();

  // head
  const hy = -176 + sway * 0.4;
  ctx.fillStyle = '#3c3f2c';
  ctx.beginPath();
  ctx.moveTo(-30, hy + 12);
  ctx.quadraticCurveTo(-34, hy - 18, 0, hy - 26);
  ctx.quadraticCurveTo(34, hy - 18, 30, hy + 12);
  ctx.quadraticCurveTo(0, hy + 26, -30, hy + 12);
  ctx.closePath(); ctx.fill();
  // mask face
  ctx.fillStyle = '#22251a';
  ctx.beginPath(); ctx.ellipse(0, hy + 2, 20, 12, 0, 0, TAU); ctx.fill();
  // eyes
  const eg = 0.7 + Math.sin(time * 3.1) * 0.3;
  ctx.fillStyle = `rgba(255,180,90,${eg})`;
  ctx.beginPath(); ctx.arc(-8, hy - 2, 3, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(8, hy - 2, 3, 0, TAU); ctx.fill();
  ctx.fillStyle = `rgba(255,140,60,${0.2 * eg})`;
  ctx.beginPath(); ctx.arc(-8, hy - 2, 10, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(8, hy - 2, 10, 0, TAU); ctx.fill();
  // antlers / branches
  ctx.strokeStyle = '#6d6446'; ctx.lineWidth = 5; ctx.lineCap = 'round';
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(side * 14, hy - 16);
    ctx.quadraticCurveTo(side * 34, hy - 52, side * 58, hy - 58);
    ctx.stroke();
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(side * 32, hy - 42); ctx.lineTo(side * 44, hy - 66); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(side * 46, hy - 54); ctx.lineTo(side * 66, hy - 48); ctx.stroke();
    ctx.lineWidth = 5;
  }
  // leaves on antlers
  ctx.fillStyle = 'rgba(90,150,70,.6)';
  ctx.beginPath(); ctx.ellipse(-52, hy - 62, 10, 4, -0.5, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.ellipse(52, hy - 64, 10, 4, 0.5, 0, TAU); ctx.fill();
  // phase 2 fire
  if (p2) {
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 9; i++) {
      const a = time * 1.6 + i * 1.9;
      const x = Math.sin(a) * 52, y = -80 - ((time * 60 + i * 37) % 120);
      const fg = ctx.createRadialGradient(x, y, 0, x, y, 16);
      fg.addColorStop(0, 'rgba(255,210,120,.32)');
      fg.addColorStop(1, 'rgba(255,110,40,0)');
      ctx.fillStyle = fg;
      ctx.fillRect(x - 16, y - 16, 32, 32);
    }
    ctx.globalCompositeOperation = 'source-over';
  }
  // health petals / aura when enraged
  if (e.state === 'enrage') {
    ctx.globalCompositeOperation = 'lighter';
    const rg = ctx.createRadialGradient(0, -90, 20, 0, -90, 160);
    rg.addColorStop(0, 'rgba(255,150,60,.28)');
    rg.addColorStop(1, 'rgba(255,80,30,0)');
    ctx.fillStyle = rg; ctx.fillRect(-170, -250, 340, 340);
    ctx.globalCompositeOperation = 'source-over';
  }
}
