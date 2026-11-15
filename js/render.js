import { TAU, clamp, lerp, rand, hash2, mulberry32, ease } from './util.js';
import { world, initTextures, drawGround, drawFireflies, drawDecal, CAMP, CAMPFIRE, NPC, ARENA, RUINS, PATH, RUIN_PATH, LAKES, inLake, ZONES, WORLD } from './world.js';
import { drawProp } from './props.js';

let texturesReady = false;
let ambientSeeds = null;

function getSeeds() {
  if (ambientSeeds) return ambientSeeds;
  const R = mulberry32(4242);
  ambientSeeds = [];
  for (let i = 0; i < 46; i++) {
    ambientSeeds.push({
      x: R(), y: R(), s: 0.4 + R() * 1.1, sp: 6 + R() * 24, ph: R() * TAU,
      sw: 10 + R() * 40, type: R() < 0.55 ? 'leaf' : 'mote', rot: R() * TAU, spin: (R() - 0.5) * 2,
    });
  }
  return ambientSeeds;
}

export function renderGame(g) {
  const ctx = g.ctx;
  const dpr = g.dpr || 1;
  const W = g.vw, H = g.vh;
  if (!texturesReady) { initTextures(ctx); texturesReady = true; }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = '#0a1913';
  ctx.fillRect(0, 0, W, H);

  const cam = g.cam;
  const shake = g.shakeAmt;
  const ox = shake > 0.2 ? rand(-shake, shake) : 0;
  const oy = shake > 0.2 ? rand(-shake, shake) * 0.7 : 0;
  const time = g.time;
  const p = g.player;

  // camera follow with clamp
  cam.x = clamp(cam.x, cam.vw / 2, WORLD.w - cam.vw / 2);
  cam.y = clamp(cam.y, cam.vh / 2, WORLD.h - cam.vh / 2);

  ctx.save();
  ctx.translate(W / 2 + ox, H / 2 + oy);
  ctx.scale(cam.scale, cam.scale);
  ctx.translate(-cam.x, -cam.y);

  // ------- ground -------
  drawGround(ctx, cam, time, g);

  // barrier before the arena
  if (g.questStage < 2) drawBarrier(ctx, time);

  // ------- hazard telegraphs -------
  for (const h of g.hazards) drawHazard(ctx, h, time);

  // ------- drops -------
  for (const d of g.drops) drawDrop(ctx, d, time);

  // ------- sorted world drawables -------
  const drawables = [];
  const margin = 360;
  const x0 = cam.x - cam.vw / 2 - margin, x1 = cam.x + cam.vw / 2 + margin;
  const y0 = cam.y - cam.vh / 2 - margin, y1 = cam.y + cam.vh / 2 + margin;
  const push = (x, y, fn) => { if (x > x0 && x < x1 && y > y0 && y < y1 + 300) drawables.push({ y, fn }); };

  for (const t of world.trees) push(t.x, t.y, () => drawProp(ctx, t, time));
  for (const r of world.rocks) push(r.x, r.y, () => drawProp(ctx, r, time));
  for (const b of world.bushes) push(b.x, b.y, () => drawProp(ctx, b, time));
  for (const r of world.ruins) if (r.kind !== 'ruinFloor') push(r.x, r.y, () => drawProp(ctx, r, time));
  for (const c of world.campProps) push(c.x, c.y, () => drawProp(ctx, c, time));
  for (const a of world.arenaStones) if (a.kind !== 'arenaRing') push(a.x, a.y, () => drawProp(ctx, a, time));

  push(NPC.x, NPC.y, () => drawNpc(ctx, time, g));
  for (const e of g.enemies) push(e.x, e.y, () => e.draw(ctx, time));
  if (g.player) push(g.player.x, g.player.y, () => g.player.draw(ctx, time));

  drawables.sort((a, b) => a.y - b.y);
  for (const d of drawables) d.fn();

  // ------- effects -------
  g.effects.drawGround(ctx);
  drawFireflies(ctx, cam, time);
  g.effects.draw(ctx);

  // projectiles
  for (const b of g.projectiles) drawProjectile(ctx, b, time);

  // boss telegraph glow under feet
  if (g.boss && !g.boss.dead) drawBossAura(ctx, g.boss, time);

  // barrier ripple at arena
  ctx.restore();

  // ------- ambient screen particles -------
  drawAmbient(ctx, g, time);

  // ------- contextual glow / vignette -------
  if (g.boss && !g.boss.dead && g.boss.awake) {
    const grd = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.25, W / 2, H / 2, Math.max(W, H) * 0.72);
    grd.addColorStop(0, 'rgba(0,0,0,0)');
    grd.addColorStop(1, g.boss.phase === 2 ? 'rgba(60,10,6,.34)' : 'rgba(30,12,4,.22)');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, W, H);
  }
  if (g.player && g.player.dead) {
    ctx.fillStyle = `rgba(30,0,4,${clamp(g.deathTimer / 1.4, 0, .55)})`;
    ctx.fillRect(0, 0, W, H);
  }
  if (g.victory) {
    const a = clamp(g.victoryTimer / 2.4, 0, 1);
    const grd = ctx.createRadialGradient(W / 2, H / 2, 20, W / 2, H / 2, Math.max(W, H) * 0.6);
    grd.addColorStop(0, `rgba(255,220,150,${0.10 + a * 0.08})`);
    grd.addColorStop(1, 'rgba(255,200,120,0)');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, W, H);
  }
  drawMinimap(g);
}

function drawBarrier(ctx, time) {
  const ctxA = ARENA;
  const a0 = Math.PI - 0.46, a1 = Math.PI + 0.46;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const pulse = 0.35 + Math.sin(time * 1.8) * 0.1;
  for (let i = 0; i < 3; i++) {
    ctx.strokeStyle = `rgba(190,150,255,${pulse * (0.5 - i * 0.12)})`;
    ctx.lineWidth = 18 - i * 5;
    ctx.beginPath();
    ctx.arc(ctxA.x, ctxA.y, ctxA.r + 4 + i * 10, a0, a1);
    ctx.stroke();
  }
  ctx.strokeStyle = `rgba(240,220,255,${pulse})`;
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(ctxA.x, ctxA.y, ctxA.r + 2, a0, a1); ctx.stroke();
  for (let i = 0; i < 7; i++) {
    const a = a0 + ((i / 6) * (a1 - a0));
    const rr = ctxA.r + 4;
    const x = ctxA.x + Math.cos(a) * rr, y = ctxA.y + Math.sin(a) * rr;
    const h = 40 + Math.sin(time * 2.4 + i) * 12;
    const grd = ctx.createLinearGradient(x, y, x, y - h);
    grd.addColorStop(0, 'rgba(190,150,255,.34)');
    grd.addColorStop(1, 'rgba(190,150,255,0)');
    ctx.fillStyle = grd;
    ctx.fillRect(x - 3, y - h, 6, h);
  }
  ctx.restore();
}

function drawHazard(ctx, h, time) {
  const prog = clamp(h.t / h.delay, 0, 1);
  const root = h.type === 'root';
  const col = root ? [150, 210, 120] : [255, 120, 80];
  ctx.save();
  const a = h.triggered ? clamp(1 - (h.t - h.delay) / Math.max(0.01, h.dur), 0, 1) : 0.5 + prog * 0.5;
  const g = ctx.createRadialGradient(h.x, h.y, h.r * 0.2, h.x, h.y, h.r);
  g.addColorStop(0, `rgba(${col[0]},${col[1]},${col[2]},${(h.triggered ? 0.3 : 0.10 + prog * 0.12) * a})`);
  g.addColorStop(0.8, `rgba(${col[0]},${col[1]},${col[2]},${0.12 * a})`);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.ellipse(h.x, h.y, h.r, h.r * 0.6, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = `rgba(${col[0]},${col[1]},${col[2]},${0.45 + prog * 0.3})`;
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(h.x, h.y, h.r, h.r * 0.6, 0, 0, TAU); ctx.stroke();
  if (!h.triggered) {
    ctx.strokeStyle = `rgba(255,240,230,${0.25 + prog * 0.5})`;
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(h.x, h.y, h.r * prog, h.r * 0.6 * prog, 0, 0, TAU); ctx.stroke();
  } else {
    ctx.strokeStyle = `rgba(${col[0]},${col[1]},${col[2]},${a * 0.9})`;
    ctx.lineWidth = 5 * a;
    ctx.beginPath(); ctx.ellipse(h.x, h.y, h.r, h.r * 0.6, 0, 0, TAU); ctx.stroke();
  }
  ctx.restore();
}

function drawBossAura(ctx, boss, time) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const pulse = 0.4 + Math.sin(time * 1.4) * 0.2;
  const g = ctx.createRadialGradient(boss.x, boss.y, 20, boss.x, boss.y, 260);
  g.addColorStop(0, `rgba(255,130,60,${0.10 + pulse * 0.08})`);
  g.addColorStop(1, 'rgba(255,90,40,0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.ellipse(boss.x, boss.y, 260, 150, 0, 0, TAU); ctx.fill();
  ctx.restore();
}

function drawProjectile(ctx, b, time) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r * 2.8);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.25, b.color);
  g.addColorStop(0.7, b.color.replace(')', ',.25)').replace('rgb', 'rgba'));
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(b.x - b.r * 3, b.y - b.r * 3, b.r * 6, b.r * 6);
  if (b.kind === 'bone') {
    ctx.globalCompositeOperation = 'source-over';
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(Math.atan2(b.vy, b.vx));
    ctx.fillStyle = '#e8e2cc';
    ctx.fillRect(-9, -2, 18, 4);
    ctx.beginPath(); ctx.arc(-9, -3, 3, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(-9, 3, 3, 0, TAU); ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

function drawDrop(ctx, d, time) {
  const bob = Math.sin(d.phase) * 2.5;
  const y = d.y - d.z - 6 + bob;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const col = d.kind === 'gold' ? 'rgba(255,200,90,' : d.kind === 'shard' ? 'rgba(190,150,255,' : 'rgba(255,240,180,';
  const g = ctx.createRadialGradient(d.x, y, 0, d.x, y, d.kind === 'relic' ? 34 : 16);
  g.addColorStop(0, col + '0.7)');
  g.addColorStop(1, col + '0)');
  ctx.fillStyle = g;
  ctx.fillRect(d.x - 36, y - 36, 72, 72);
  ctx.globalCompositeOperation = 'source-over';
  if (d.kind === 'gold') {
    ctx.fillStyle = '#ffd166';
    ctx.beginPath();
    ctx.moveTo(d.x, y - 6); ctx.lineTo(d.x + 5, y); ctx.lineTo(d.x, y + 6); ctx.lineTo(d.x - 5, y);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fff3c4';
    ctx.fillRect(d.x - 1.5, y - 3, 3, 3);
  } else if (d.kind === 'shard') {
    ctx.fillStyle = '#c7a4ff';
    ctx.beginPath();
    ctx.moveTo(d.x, y - 9); ctx.lineTo(d.x + 5, y - 2); ctx.lineTo(d.x + 2, y + 7); ctx.lineTo(d.x - 4, y + 6); ctx.lineTo(d.x - 6, y - 2);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.8)';
    ctx.fillRect(d.x - 1, y - 5, 2, 6);
  } else {
    ctx.fillStyle = '#ffe9ad';
    ctx.beginPath(); ctx.arc(d.x, y, 9, 0, TAU); ctx.fill();
    ctx.fillStyle = '#b98523';
    ctx.beginPath(); ctx.arc(d.x, y, 5, 0, TAU); ctx.fill();
    ctx.fillStyle = '#fff7d6';
    ctx.beginPath(); ctx.arc(d.x - 2, y - 2, 2, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(255,230,160,.5)';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(d.x, d.y + 2, 12, 4, 0, 0, TAU); ctx.stroke();
  }
  ctx.restore();
}

function drawNpc(ctx, time, g) {
  const x = NPC.x, y = NPC.y;
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = 'rgba(3,8,6,.4)';
  ctx.beginPath(); ctx.ellipse(4, 2, 20, 7, 0, 0, TAU); ctx.fill();
  // lantern glow
  ctx.globalCompositeOperation = 'lighter';
  const lg = ctx.createRadialGradient(-24, -44, 2, -24, -44, 46);
  lg.addColorStop(0, `rgba(255,200,110,${0.35 + Math.sin(time * 2.2) * 0.08})`);
  lg.addColorStop(1, 'rgba(255,180,90,0)');
  ctx.fillStyle = lg;
  ctx.fillRect(-70, -90, 92, 92);
  ctx.globalCompositeOperation = 'source-over';
  // robe
  const bob = Math.sin(time * 1.3) * 1.2;
  ctx.translate(0, bob);
  ctx.fillStyle = '#3f2f4c';
  ctx.beginPath();
  ctx.moveTo(-17, 0); ctx.quadraticCurveTo(-14, -44, -8, -54); ctx.lineTo(8, -54);
  ctx.quadraticCurveTo(15, -42, 18, 0); ctx.quadraticCurveTo(0, 5, -17, 0);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#563f66';
  ctx.beginPath();
  ctx.moveTo(-12, -2); ctx.quadraticCurveTo(-10, -40, -4, -52); ctx.lineTo(0, -52);
  ctx.quadraticCurveTo(0, -24, 0, -2); ctx.closePath(); ctx.fill();
  // shawl
  ctx.fillStyle = '#2b2036';
  ctx.beginPath(); ctx.ellipse(0, -52, 15, 7, 0, 0, TAU); ctx.fill();
  // head + hood
  ctx.fillStyle = '#e8c49d';
  ctx.beginPath(); ctx.arc(0, -62, 8, 0, TAU); ctx.fill();
  ctx.fillStyle = '#463152';
  ctx.beginPath(); ctx.arc(0, -64, 10, Math.PI * 0.88, Math.PI * 2.12); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-10, -63); ctx.quadraticCurveTo(-18, -52, -14, -40); ctx.lineTo(-6, -50); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#2a1d33';
  ctx.beginPath(); ctx.arc(0, -64, 7, Math.PI, TAU); ctx.fill();
  // eyes
  ctx.fillStyle = '#20161f';
  ctx.beginPath(); ctx.arc(-3, -62, 1.2, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(3, -62, 1.2, 0, TAU); ctx.fill();
  // staff
  ctx.strokeStyle = '#5a4128'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(-24, 2); ctx.lineTo(-24, -96); ctx.stroke();
  ctx.fillStyle = '#8a6b3e';
  ctx.beginPath(); ctx.arc(-24, -100, 5, 0, TAU); ctx.fill();
  ctx.fillStyle = '#ffcf6e';
  ctx.beginPath(); ctx.arc(-24, -100, 2.6, 0, TAU); ctx.fill();
  // hanging lantern
  ctx.strokeStyle = '#3b2c20'; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.moveTo(-24, -88); ctx.lineTo(-27, -78); ctx.stroke();
  ctx.fillStyle = '#ffd98f';
  ctx.beginPath(); ctx.arc(-27, -73, 4, 0, TAU); ctx.fill();
  // quest marker
  if (!g.victory) {
    const float = Math.sin(time * 2.4) * 3;
    ctx.fillStyle = 'rgba(255,220,140,.95)';
    ctx.font = '700 20px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(255,200,90,.8)'; ctx.shadowBlur = 12;
    ctx.fillText(g.questStage >= 3 ? '★' : '!', 0, -128 + float);
    ctx.shadowBlur = 0;
  }
  ctx.restore();
  // name
  ctx.save();
  ctx.font = '600 9px "Trebuchet MS", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(240,225,255,.7)';
  ctx.fillText('MIRA', x, y + 16);
  ctx.restore();
}

function drawAmbient(ctx, g, time) {
  const W = g.vw, H = g.vh;
  const seeds = getSeeds();
  ctx.save();
  // light rays
  ctx.globalCompositeOperation = 'lighter';
  const rayA = 0.035 + Math.sin(time * 0.23) * 0.012;
  for (let i = 0; i < 4; i++) {
    const seed = seeds[i];
    const x = ((seed.x * W * 1.4 + time * 6) % (W * 1.4)) - W * 0.2;
    ctx.save();
    ctx.translate(x, -30);
    ctx.rotate(0.42 + i * 0.03);
    const grd = ctx.createLinearGradient(0, 0, 0, H * 0.9);
    grd.addColorStop(0, `rgba(210,255,225,${rayA})`);
    grd.addColorStop(0.55, `rgba(190,255,210,${rayA * 0.4})`);
    grd.addColorStop(1, 'rgba(190,255,210,0)');
    ctx.fillStyle = grd;
    ctx.fillRect(-30 - i * 12, 0, 60 + i * 24, H * 0.9);
    ctx.restore();
  }
  // floating leaves / motes
  for (const s of seeds) {
    const t = time * s.sp;
    const margin = 40;
    const x = ((s.x * (W + margin * 2) + t + Math.sin(time * 0.5 + s.ph) * s.sw) % (W + margin * 2)) - margin;
    const y = ((s.y * (H + margin * 2) + t * 0.6 + Math.sin(time * 0.8 + s.ph * 2) * 14) % (H + margin * 2)) - margin;
    const a = 0.18 + (Math.sin(time * 0.7 + s.ph) * 0.5 + 0.5) * 0.4;
    if (s.type === 'leaf') {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(s.rot + time * s.spin);
      ctx.fillStyle = `rgba(150,205,130,${a * 0.5})`;
      ctx.beginPath(); ctx.ellipse(0, 0, 4 * s.s, 1.8 * s.s, 0, 0, TAU); ctx.fill();
      ctx.restore();
    } else {
      ctx.fillStyle = `rgba(220,255,220,${a * 0.35})`;
      ctx.beginPath(); ctx.arc(x, y, 1.2 * s.s, 0, TAU); ctx.fill();
    }
  }
  // bottom mist
  const mist = ctx.createLinearGradient(0, H * 0.72, 0, H);
  mist.addColorStop(0, 'rgba(120,180,150,0)');
  mist.addColorStop(1, 'rgba(120,180,150,.045)');
  ctx.fillStyle = mist;
  ctx.fillRect(0, H * 0.72, W, H * 0.28);
  ctx.restore();
}

function drawMinimap(g) {
  const ctx = g.mctx;
  const S = 180;
  const p = g.player;
  if (!p) return;
  const R = 860;
  const sc = S / (R * 2);
  ctx.clearRect(0, 0, S, S);
  ctx.save();
  ctx.beginPath(); ctx.arc(S / 2, S / 2, S / 2, 0, TAU); ctx.clip();
  ctx.fillStyle = '#0b1a14';
  ctx.fillRect(0, 0, S, S);
  // water
  for (const l of LAKES) {
    ctx.fillStyle = 'rgba(30,80,90,.75)';
    ctx.beginPath();
    ctx.ellipse(S / 2 + (l.x - p.x) * sc, S / 2 + (l.y - p.y) * sc, l.rx * sc, l.ry * sc, l.rot, 0, TAU);
    ctx.fill();
  }
  // camp area
  ctx.fillStyle = 'rgba(180,150,80,.16)';
  ctx.beginPath(); ctx.arc(S / 2 + (CAMP.x - p.x) * sc, S / 2 + (CAMP.y - p.y) * sc, CAMP.r * sc, 0, TAU); ctx.fill();
  // path
  ctx.strokeStyle = 'rgba(200,180,130,.35)';
  ctx.lineWidth = Math.max(1.5, 9 * sc * 8);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const path of [PATH, RUIN_PATH]) {
    ctx.beginPath();
    ctx.moveTo(S / 2 + (path[0][0] - p.x) * sc, S / 2 + (path[0][1] - p.y) * sc);
    for (let i = 1; i < path.length; i++) ctx.lineTo(S / 2 + (path[i][0] - p.x) * sc, S / 2 + (path[i][1] - p.y) * sc);
    ctx.stroke();
  }
  // arena
  ctx.strokeStyle = g.questStage >= 2 ? 'rgba(255,170,90,.6)' : 'rgba(190,150,255,.5)';
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(S / 2 + (ARENA.x - p.x) * sc, S / 2 + (ARENA.y - p.y) * sc, ARENA.r * sc, 0, TAU); ctx.stroke();
  // ruins
  ctx.fillStyle = 'rgba(160,170,160,.25)';
  ctx.fillRect(S / 2 + (RUINS.x - p.x) * sc - 16, S / 2 + (RUINS.y - p.y) * sc - 16, 32, 32);
  // trees
  const pxs = p.x, pys = p.y;
  ctx.fillStyle = 'rgba(60,120,80,.5)';
  for (const t of world.trees) {
    const dx = t.x - pxs, dy = t.y - pys;
    if (Math.abs(dx) > R || Math.abs(dy) > R) continue;
    ctx.beginPath(); ctx.arc(S / 2 + dx * sc, S / 2 + dy * sc, 1.1, 0, TAU); ctx.fill();
  }
  // drops
  ctx.fillStyle = 'rgba(255,205,110,.9)';
  for (const d of g.drops) {
    const dx = d.x - pxs, dy = d.y - pys;
    if (Math.abs(dx) > R || Math.abs(dy) > R) continue;
    ctx.fillRect(S / 2 + dx * sc - 1, S / 2 + dy * sc - 1, 2, 2);
  }
  // enemies
  for (const e of g.enemies) {
    if (e.dead) continue;
    const dx = e.x - pxs, dy = e.y - pys;
    if (Math.abs(dx) > R || Math.abs(dy) > R) continue;
    const isBoss = e.type === 'boss';
    ctx.fillStyle = isBoss ? '#ffcf6e' : e.elite ? '#ffa06e' : '#ff6f7f';
    ctx.beginPath(); ctx.arc(S / 2 + dx * sc, S / 2 + dy * sc, isBoss ? 5 : 2.3, 0, TAU); ctx.fill();
    if (isBoss) {
      ctx.strokeStyle = 'rgba(255,200,110,.6)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(S / 2 + dx * sc, S / 2 + dy * sc, 8, 0, TAU); ctx.stroke();
    }
  }
  // player arrow
  ctx.save();
  ctx.translate(S / 2, S / 2);
  ctx.rotate(p.facing + Math.PI / 2);
  ctx.fillStyle = '#eafff4';
  ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(4.6, 5); ctx.lineTo(0, 2.4); ctx.lineTo(-4.6, 5); ctx.closePath(); ctx.fill();
  ctx.shadowColor = 'rgba(157,245,200,.9)'; ctx.shadowBlur = 6;
  ctx.restore();
  ctx.restore();
  // compass
  ctx.fillStyle = 'rgba(200,240,225,.5)';
  ctx.font = '700 8px "Trebuchet MS", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('N', S / 2, 12);
  // outer ring
  ctx.strokeStyle = 'rgba(200,245,224,.2)';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(S / 2, S / 2, S / 2 - 2, 0, TAU); ctx.stroke();
}
