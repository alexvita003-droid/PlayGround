import { TAU, mulberry32, clamp, rand, makeCanvas, hash2 } from './util.js';

export const WORLD = { w: 4600, h: 3000 };

export const CAMP = { x: 720, y: 1750, r: 360 };
export const ARENA = { x: 3920, y: 1780, r: 380 };
export const RUINS = { x: 2860, y: 1060 };

export const ZONES = [
  { name: 'VALLE VERDE · CAMPO', x: 0, y: 0, w: 1080, h: 3000, safe: true },
  { name: 'BOSCO SOSPESO', x: 1080, y: 0, w: 1380, h: 3000 },
  { name: 'ROVINE DI AETHER', x: 2460, y: 0, w: 1000, h: 3000 },
  { name: 'ARENA RADICATA', x: 3460, y: 0, w: 1140, h: 3000 },
];

export function zoneAt(x, y) {
  for (const z of ZONES) if (x >= z.x && x < z.x + z.w) return z;
  return ZONES[1];
}

// main road through the valley
export const PATH = [
  [700, 1830], [980, 1810], [1240, 1740], [1520, 1660], [1780, 1590],
  [2040, 1470], [2260, 1370], [2500, 1300], [2760, 1260], [3050, 1240],
  [3320, 1300], [3560, 1430], [3760, 1600], [3880, 1800],
];
export const RUIN_PATH = [[2540, 1290], [2600, 1080], [2720, 880], [2860, 760]];

function segDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const t = clamp(((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy || 1), 0, 1);
  return Math.hypot(px - (ax + dx * t), py - (ay + dy * t));
}
export function pathDist(x, y) {
  let d = 1e9;
  for (const line of [PATH, RUIN_PATH]) {
    for (let i = 0; i < line.length - 1; i++) {
      d = Math.min(d, segDist(x, y, line[i][0], line[i][1], line[i + 1][0], line[i + 1][1]));
    }
  }
  return d;
}

export const LAKES = [
  { x: 1420, y: 2510, rx: 560, ry: 300, rot: -0.12 },
  { x: 290, y: 620, rx: 330, ry: 190, rot: 0.3 },
];

export function inLake(x, y, pad = 0) {
  return LAKES.some(l => {
    const c = Math.cos(-l.rot), s = Math.sin(-l.rot);
    const dx = x - l.x, dy = y - l.y;
    const lx = dx * c - dy * s, ly = dx * s + dy * c;
    return (lx / (l.rx + pad)) ** 2 + (ly / (l.ry + pad)) ** 2 < 1;
  });
}

export function isSafe(x, y) {
  return Math.hypot(x - CAMP.x, y - CAMP.y) < CAMP.r + 40;
}

export const CAMPFIRE = { x: 660, y: 1760, r: 74 };
export const NPC = { x: 800, y: 1670, r: 62, name: 'MIRA' };
export const BOARD = { x: 600, y: 1655, r: 58 };
export const GATE = { x: 3600, y: 1560, r: 0 };

export const world = {
  obstacles: [],
  trees: [],
  rocks: [],
  bushes: [],
  ruins: [],
  campProps: [],
  decals: [],
  fireflies: [],
  runes: [],
  arenaStones: [],
  seed: 20261115,
};

function addObstacle(x, y, r, kind) { world.obstacles.push({ x, y, r, kind }); }

export function generateWorld(seed = 20261115) {
  world.seed = seed;
  const R = mulberry32(seed);
  world.obstacles.length = 0;
  for (const k of ['trees', 'rocks', 'bushes', 'ruins', 'campProps', 'decals', 'fireflies', 'runes', 'arenaStones']) world[k].length = 0;

  const blocked = (x, y, pad = 0) =>
    Math.hypot(x - CAMP.x, y - CAMP.y) < CAMP.r + 60 + pad ||
    Math.hypot(x - ARENA.x, y - ARENA.y) < ARENA.r + 30 + pad ||
    pathDist(x, y) < 88 + pad ||
    inLake(x, y, 30 + pad) ||
    x < 120 || y < 120 || x > WORLD.w - 120 || y > WORLD.h - 120;

  // ---------------- trees ----------------
  for (let i = 0; i < 2200 && world.trees.length < 260; i++) {
    const x = 140 + R() * (WORLD.w - 280);
    const y = 140 + R() * (WORLD.h - 280);
    if (blocked(x, y, 20)) continue;
    const nearRuins = Math.hypot(x - RUINS.x, y - RUINS.y) < 420;
    if (nearRuins && R() < 0.7) continue;
    if (world.trees.some(t => Math.hypot(t.x - x, t.y - y) < 105)) continue;
    const sc = 0.72 + R() * 0.85;
    const t = { kind: 'tree', x, y, s: sc, seed: (R() * 9999) | 0, hue: R() };
    world.trees.push(t);
    addObstacle(x, y, 13 * sc + 5, 'tree');
  }
  // border forest wall
  for (let i = 0; i < 90; i++) {
    const edge = i % 4;
    const x = edge === 0 ? 90 + R() * 80 : edge === 1 ? WORLD.w - 90 - R() * 80 : 100 + R() * (WORLD.w - 200);
    const y = edge === 2 ? 90 + R() * 80 : edge === 3 ? WORLD.h - 90 - R() * 80 : 100 + R() * (WORLD.h - 200);
    const t = { kind: 'tree', x, y, s: 0.9 + R() * 0.8, seed: (R() * 9999) | 0, hue: R() };
    world.trees.push(t); addObstacle(x, y, 16, 'tree');
  }

  // ---------------- rocks & bushes ----------------
  for (let i = 0; i < 500 && world.rocks.length < 54; i++) {
    const x = 160 + R() * (WORLD.w - 320), y = 160 + R() * (WORLD.h - 320);
    if (blocked(x, y, 10) || world.rocks.some(r => Math.hypot(r.x - x, r.y - y) < 130)) continue;
    const s = 0.6 + R() * 1.1;
    const rock = { kind: 'rock', x, y, s, seed: (R() * 999) | 0 };
    world.rocks.push(rock); addObstacle(x, y, 22 * s, 'rock');
  }
  for (let i = 0; i < 800 && world.bushes.length < 130; i++) {
    const x = 130 + R() * (WORLD.w - 260), y = 130 + R() * (WORLD.h - 260);
    if (blocked(x, y, 0) || R() < 0.25) continue;
    world.bushes.push({ kind: 'bush', x, y, s: 0.55 + R() * 0.8, seed: (R() * 999) | 0 });
  }

  // ---------------- ruins ----------------
  const Rx = RUINS.x, Ry = RUINS.y;
  world.ruins.push({ kind: 'ruinFloor', x: Rx, y: Ry, r: 430 });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU + 0.2;
    const x = Rx + Math.cos(a) * 330, y = Ry + Math.sin(a) * 285;
    world.ruins.push({ kind: 'pillar', x, y, h: 90 + R() * 90, seed: (R() * 999) | 0, broken: R() < 0.45 });
    addObstacle(x, y, 26, 'pillar');
  }
  for (let i = 0; i < 4; i++) {
    const x = Rx + (R() - 0.5) * 520, y = Ry + 150 + R() * 260;
    world.ruins.push({ kind: 'wall', x, y, w: 80 + R() * 120, rot: R() * TAU, seed: (R() * 999) | 0 });
  }
  world.ruins.push({ kind: 'arch', x: Rx - 40, y: Ry - 330, seed: 7 });
  world.ruins.push({ kind: 'statue', x: Rx + 190, y: Ry - 40, seed: 12 });
  world.ruins.push({ kind: 'statue', x: Rx - 210, y: Ry + 90, seed: 15 });
  for (let i = 0; i < 22; i++) {
    const x = Rx + (R() - 0.5) * 720, y = Ry + (R() - 0.5) * 620;
    if (Math.hypot(x - CAMP.x, y - CAMP.y) < CAMP.r) continue;
    world.decals.push({ kind: 'rubble', x, y, s: 0.5 + R() * 1.1, seed: (R() * 999) | 0 });
  }

  // ---------------- arena ----------------
  world.arenaStones.push({ kind: 'arenaRing', x: ARENA.x, y: ARENA.y, r: ARENA.r });
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * TAU;
    if (Math.abs(a - Math.PI) < 0.32) continue; // west entrance
    const x = ARENA.x + Math.cos(a) * (ARENA.r - 8);
    const y = ARENA.y + Math.sin(a) * (ARENA.r - 8);
    world.arenaStones.push({ kind: 'monolith', x, y, h: 100 + R() * 110, seed: (R() * 999) | 0 });
    addObstacle(x, y, 30, 'monolith');
  }
  for (let i = 0; i < 26; i++) {
    const a = R() * TAU, rr = 60 + R() * (ARENA.r - 90);
    world.decals.push({ kind: 'arenaCrack', x: ARENA.x + Math.cos(a) * rr, y: ARENA.y + Math.sin(a) * rr, s: 0.6 + R() * 1.4, seed: (R() * 999) | 0 });
  }
  for (let i = 0; i < 7; i++) {
    const a = R() * TAU, rr = 120 + R() * 260;
    world.runes.push({ x: ARENA.x + Math.cos(a) * rr, y: ARENA.y + Math.sin(a) * rr, s: 18 + R() * 30, rot: R() * TAU, seed: (R() * 99) | 0 });
  }

  // ---------------- camp ----------------
  world.campProps.push(
    { kind: 'tent', x: 540, y: 1840, s: 1.1, seed: 3 },
    { kind: 'tentSmall', x: 860, y: 1870, s: 0.8, seed: 8 },
    { kind: 'board', x: BOARD.x, y: BOARD.y, s: 1, seed: 1 },
    { kind: 'anvil', x: 830, y: 1770, s: 0.9, seed: 4 },
    { kind: 'banner', x: 520, y: 1670, s: 1.1, seed: 5 },
    { kind: 'banner', x: 930, y: 1620, s: 0.9, seed: 9 },
    { kind: 'crates', x: 620, y: 1900, s: 0.9, seed: 2 },
    { kind: 'crates', x: 780, y: 1910, s: 0.75, seed: 6 },
    { kind: 'well', x: 920, y: 1720, s: 0.9, seed: 11 },
  );
  addObstacle(540, 1840, 52, 'tent');
  addObstacle(860, 1870, 40, 'tent');
  addObstacle(BOARD.x, BOARD.y, 24, 'board');
  addObstacle(830, 1770, 22, 'anvil');
  addObstacle(620, 1900, 26, 'crate');
  addObstacle(780, 1910, 24, 'crate');
  addObstacle(920, 1720, 30, 'well');
  addObstacle(520, 1670, 8, 'banner');
  addObstacle(930, 1620, 8, 'banner');

  // camp circle stones + logs
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * TAU + 0.15;
    world.campProps.push({ kind: 'glowstone', x: CAMPFIRE.x + Math.cos(a) * 54, y: CAMPFIRE.y + Math.sin(a) * 38, s: 0.6 + R() * 0.3, seed: i });
  }

  // ---------------- decals ----------------
  for (let i = 0; i < 520; i++) {
    const x = 120 + R() * (WORLD.w - 240), y = 120 + R() * (WORLD.h - 240);
    if (inLake(x, y, 10) || pathDist(x, y) < 60) continue;
    const kind = R() < 0.62 ? 'tuft' : R() < 0.8 ? 'flower' : R() < 0.92 ? 'leaf' : 'mushroom';
    world.decals.push({ kind, x, y, s: 0.55 + R() * 1.1, seed: (R() * 999) | 0, tint: R() });
  }
  for (let i = 0; i < 100; i++) {
    const x = 150 + R() * (WORLD.w - 300), y = 150 + R() * (WORLD.h - 300);
    if (blocked(x, y, 0)) continue;
    world.fireflies.push({ x, y, s: 0.5 + R(), seed: R() * 100, ph: R() * TAU });
  }
  for (let i = 0; i < 30; i++) {
    const x = CAMP.x + (R() - 0.5) * 300, y = CAMP.y + (R() - 0.5) * 260;
    world.fireflies.push({ x, y, s: 0.6 + R() * 0.8, seed: R() * 100, ph: R() * TAU, camp: true });
  }
  return world;
}

// ---------- cached textures ----------
let grassPattern = null;
let dirtPattern = null;
let blobTextures = null;

function makeGrassTile() {
  const c = makeCanvas(256, 256), g = c.getContext('2d');
  g.fillStyle = '#173526'; g.fillRect(0, 0, 256, 256);
  const R = mulberry32(99);
  for (let i = 0; i < 420; i++) {
    const x = R() * 256, y = R() * 256;
    const v = R();
    g.strokeStyle = v < 0.4 ? 'rgba(32,78,50,.5)' : v < 0.75 ? 'rgba(52,104,62,.32)' : 'rgba(14,40,30,.45)';
    g.lineWidth = 0.8 + R() * 1.2;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + (R() - 0.5) * 5, y - 3 - R() * 5); g.stroke();
  }
  for (let i = 0; i < 40; i++) {
    g.fillStyle = `rgba(${70 + R() * 50},${120 + R() * 60},${60 + R() * 40},.08)`;
    g.beginPath(); g.arc(R() * 256, R() * 256, 8 + R() * 26, 0, TAU); g.fill();
  }
  return c;
}
function makeDirtTile() {
  const c = makeCanvas(128, 128), g = c.getContext('2d');
  g.fillStyle = '#584a35'; g.fillRect(0, 0, 128, 128);
  const R = mulberry32(7);
  for (let i = 0; i < 240; i++) {
    g.fillStyle = `rgba(${R() < 0.5 ? '30,25,18' : '120,101,70'},${0.05 + R() * 0.14})`;
    g.beginPath(); g.ellipse(R() * 128, R() * 128, 1 + R() * 3, 1 + R() * 2, R() * TAU, 0, TAU); g.fill();
  }
  return c;
}

export function initTextures(ctx) {
  if (!grassPattern) {
    grassPattern = ctx.createPattern(makeGrassTile(), 'repeat');
    dirtPattern = ctx.createPattern(makeDirtTile(), 'repeat');
    blobTextures = [
      makeBlob('rgba(60,120,80,.30)'), makeBlob('rgba(20,52,42,.45)'), makeBlob('rgba(90,140,70,.18)'),
      makeBlob('rgba(120,150,80,.14)'), makeBlob('rgba(20,40,32,.5)'),
    ];
  }
}
function makeBlob(color) {
  const c = makeCanvas(256, 256), g = c.getContext('2d');
  const grd = g.createRadialGradient(128, 128, 8, 128, 128, 124);
  grd.addColorStop(0, color);
  grd.addColorStop(0.6, color.replace(/[\d.]+\)$/, '0.14)'));
  grd.addColorStop(1, color.replace(/[\d.]+\)$/, '0)'));
  g.fillStyle = grd; g.fillRect(0, 0, 256, 256);
  return c;
}

export function drawGround(ctx, cam, time, seen) {
  const W = cam.vw, H = cam.vh;
  const x0 = cam.x - W / 2, y0 = cam.y - H / 2;
  ctx.fillStyle = '#0e2018';
  ctx.fillRect(x0 - 4, y0 - 4, W + 8, H + 8);
  if (grassPattern) {
    ctx.save();
    ctx.fillStyle = grassPattern;
    ctx.fillRect(x0, y0, W, H);
    ctx.restore();
  }
  // large soft tone patches
  if (blobTextures) {
    const step = 340;
    const gx0 = Math.floor(x0 / step) * step, gy0 = Math.floor(y0 / step) * step;
    for (let gx = gx0; gx < x0 + W + step; gx += step) {
      for (let gy = gy0; gy < y0 + H + step; gy += step) {
        const h = hash2(gx / step, gy / step, 5);
        if (h < 0.42) continue;
        const tex = blobTextures[(h * 97 | 0) % blobTextures.length];
        const s = 240 + h * 260;
        ctx.globalAlpha = 0.55;
        ctx.drawImage(tex, gx + h * 90 - s / 2, gy + (1 - h) * 120 - s / 2, s, s);
      }
    }
    ctx.globalAlpha = 1;
  }

  // lakes
  for (const l of LAKES) {
    if (l.x + l.rx < x0 - 40 || l.x - l.rx > x0 + W + 40 || l.y + l.ry < y0 - 40 || l.y - l.ry > y0 + H + 40) continue;
    drawLake(ctx, l, time);
  }

  // paths
  drawPath(ctx, PATH, 104, time);
  drawPath(ctx, RUIN_PATH, 70, time, true);

  // camp ground
  if (x0 < CAMP.x + CAMP.r + 80 && x0 + W > CAMP.x - CAMP.r - 80 && y0 < CAMP.y + CAMP.r + 80 && y0 + H > CAMP.y - CAMP.r - 80) {
    drawCampGround(ctx, time);
  }
  // ruins floor
  if (x0 < RUINS.x + 520 && x0 + W > RUINS.x - 520 && y0 < RUINS.y + 520 && y0 + H > RUINS.y - 520) {
    drawRuinsFloor(ctx, time);
  }
  // arena floor
  if (x0 < ARENA.x + ARENA.r + 120 && x0 + W > ARENA.x - ARENA.r - 120 && y0 < ARENA.y + ARENA.r + 120 && y0 + H > ARENA.y - ARENA.r - 120) {
    drawArenaFloor(ctx, time);
  }

  // decals
  for (const d of world.decals) {
    if (d.x < x0 - 60 || d.x > x0 + W + 60 || d.y < y0 - 60 || d.y > y0 + H + 60) continue;
    drawDecal(ctx, d, time);
  }

  // ground glows (camp fire, arena runes)
  const campDist = Math.hypot(cam.x - CAMPFIRE.x, cam.y - CAMPFIRE.y);
  if (campDist < 1100) {
    const g = ctx.createRadialGradient(CAMPFIRE.x, CAMPFIRE.y, 10, CAMPFIRE.x, CAMPFIRE.y, 330);
    g.addColorStop(0, 'rgba(255,170,80,.20)');
    g.addColorStop(0.4, 'rgba(255,140,60,.07)');
    g.addColorStop(1, 'rgba(255,120,40,0)');
    ctx.fillStyle = g; ctx.fillRect(CAMPFIRE.x - 340, CAMPFIRE.y - 340, 680, 680);
  }
  for (const r of world.runes) {
    if (r.x < x0 - 100 || r.x > x0 + W + 100 || r.y < y0 - 100 || r.y > y0 + H + 100) continue;
    const pulse = 0.5 + Math.sin(time * 1.6 + r.seed) * 0.3;
    ctx.save();
    ctx.translate(r.x, r.y); ctx.rotate(r.rot);
    ctx.strokeStyle = `rgba(255,150,90,${0.18 + pulse * 0.2})`;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, r.s, 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, r.s * 0.62, 0, TAU); ctx.stroke();
    for (let k = 0; k < 3; k++) {
      const a = time * 0.3 + k * TAU / 3;
      ctx.beginPath(); ctx.arc(Math.cos(a) * r.s * 0.82, Math.sin(a) * r.s * 0.82, 2.2, 0, TAU); ctx.stroke();
    }
    ctx.restore();
  }
}

function drawPath(ctx, pts, width, time, narrow = false) {
  if (!dirtPattern) return;
  ctx.save();
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(20,24,18,.5)';
  ctx.lineWidth = width + 18;
  strokePolyline(ctx, pts);
  ctx.strokeStyle = dirtPattern;
  ctx.lineWidth = width;
  strokePolyline(ctx, pts);
  ctx.strokeStyle = 'rgba(133,115,80,.16)';
  ctx.lineWidth = width * 0.55;
  strokePolyline(ctx, pts);
  ctx.restore();
}
function strokePolyline(ctx, pts) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length - 1; i++) {
    const xc = (pts[i][0] + pts[i + 1][0]) / 2, yc = (pts[i][1] + pts[i + 1][1]) / 2;
    ctx.quadraticCurveTo(pts[i][0], pts[i][1], xc, yc);
  }
  ctx.lineTo(pts[pts.length - 1][0], pts[pts.length - 1][1]);
  ctx.stroke();
}

function drawLake(ctx, l, time) {
  ctx.save();
  ctx.translate(l.x, l.y); ctx.rotate(l.rot);
  const g = ctx.createRadialGradient(-l.rx * 0.2, -l.ry * 0.25, 10, 0, 0, l.rx);
  g.addColorStop(0, '#1b4b52'); g.addColorStop(0.6, '#123a42'); g.addColorStop(1, '#0b2830');
  ctx.fillStyle = '#2a3a2e';
  ctx.beginPath(); ctx.ellipse(0, 0, l.rx + 26, l.ry + 20, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.ellipse(0, 0, l.rx, l.ry, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = 'rgba(150,230,220,.12)'; ctx.lineWidth = 2;
  for (let i = 0; i < 9; i++) {
    const yy = -l.ry * 0.72 + i * l.ry * 0.18;
    const off = Math.sin(time * 0.7 + i) * 14;
    ctx.beginPath();
    ctx.ellipse(off, yy, l.rx * (0.34 + i * 0.055), 3 + i * 0.4, 0, 0.15, Math.PI - 0.15);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(180,240,210,.14)';
  for (let i = 0; i < 5; i++) {
    const a = time * 0.2 + i * 1.7;
    ctx.beginPath(); ctx.ellipse(Math.cos(a) * l.rx * 0.5, Math.sin(a * 0.7) * l.ry * 0.6, 6, 2, 0, 0, TAU); ctx.fill();
  }
  ctx.restore();
}

function drawCampGround(ctx, time) {
  const g = ctx.createRadialGradient(CAMP.x, CAMP.y, 40, CAMP.x, CAMP.y, CAMP.r + 70);
  g.addColorStop(0, 'rgba(96,78,52,.78)');
  g.addColorStop(0.55, 'rgba(80,68,46,.55)');
  g.addColorStop(0.85, 'rgba(64,60,40,.22)');
  g.addColorStop(1, 'rgba(60,60,40,0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.ellipse(CAMP.x, CAMP.y, CAMP.r + 60, CAMP.r * 0.82 + 50, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = 'rgba(30,32,22,.3)'; ctx.lineWidth = 3;
  for (let i = 0; i < 5; i++) {
    const a = i * 1.3 + 0.4;
    ctx.beginPath();
    ctx.ellipse(CAMP.x + Math.cos(a) * 60, CAMP.y + Math.sin(a) * 50, 180, 120, a, 0.2, 2.3);
    ctx.stroke();
  }
  // firepit
  ctx.fillStyle = '#2a1e16';
  ctx.beginPath(); ctx.ellipse(CAMPFIRE.x, CAMPFIRE.y, 52, 38, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = '#5e4b38'; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.ellipse(CAMPFIRE.x, CAMPFIRE.y, 52, 38, 0, 0, TAU); ctx.stroke();
  // animated flame
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 5; i++) {
    const f = Math.sin(time * 8 + i * 1.7) * 0.5 + 0.5;
    const h = 30 + f * 40, w = 16 + f * 8;
    const fg = ctx.createLinearGradient(0, CAMPFIRE.y - h, 0, CAMPFIRE.y);
    fg.addColorStop(0, 'rgba(255,220,130,0)');
    fg.addColorStop(0.35, 'rgba(255,180,80,.55)');
    fg.addColorStop(1, 'rgba(255,90,40,.7)');
    ctx.fillStyle = fg;
    ctx.beginPath();
    ctx.moveTo(CAMPFIRE.x - w / 2 + (i - 2) * 6, CAMPFIRE.y + 4);
    ctx.quadraticCurveTo(CAMPFIRE.x - w * 0.7 + (i - 2) * 6, CAMPFIRE.y - h * 0.5, CAMPFIRE.x + (i - 2) * 4, CAMPFIRE.y - h);
    ctx.quadraticCurveTo(CAMPFIRE.x + w * 0.7 + (i - 2) * 6, CAMPFIRE.y - h * 0.5, CAMPFIRE.x + w / 2 + (i - 2) * 6, CAMPFIRE.y + 4);
    ctx.fill();
  }
  ctx.restore();
}

function drawRuinsFloor(ctx, time) {
  const R = RUINS;
  ctx.save();
  ctx.beginPath(); ctx.ellipse(R.x, R.y, 460, 410, 0, 0, TAU); ctx.clip();
  ctx.fillStyle = 'rgba(32,44,38,.6)';
  ctx.beginPath(); ctx.ellipse(R.x, R.y, 460, 410, 0, 0, TAU); ctx.fill();
  const rng = mulberry32(31);
  for (let i = 0; i < 46; i++) {
    const a = rng() * TAU, rr = Math.sqrt(rng()) * 430;
    const x = R.x + Math.cos(a) * rr, y = R.y + Math.sin(a) * rr * 0.9;
    const w = 40 + rng() * 70, h = 24 + rng() * 46;
    ctx.save(); ctx.translate(x, y); ctx.rotate(rng() * TAU);
    ctx.fillStyle = rng() < 0.5 ? 'rgba(76,86,80,.5)' : 'rgba(58,70,64,.45)';
    ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.strokeStyle = 'rgba(20,28,24,.35)'; ctx.lineWidth = 1; ctx.strokeRect(-w / 2, -h / 2, w, h);
    ctx.fillStyle = 'rgba(90,130,80,.16)';
    if (rng() < 0.4) { ctx.beginPath(); ctx.arc(0, 0, Math.min(w, h) * 0.4, 0, TAU); ctx.fill(); }
    ctx.restore();
  }
  ctx.restore();
}

function drawArenaFloor(ctx, time) {
  const A = ARENA;
  ctx.save();
  ctx.beginPath(); ctx.arc(A.x, A.y, A.r + 30, 0, TAU); ctx.clip();
  ctx.fillStyle = 'rgba(38,42,34,.55)';
  ctx.fillRect(A.x - A.r - 40, A.y - A.r - 40, (A.r + 40) * 2, (A.r + 40) * 2);
  // concentric rings
  for (let i = 0; i < 4; i++) {
    ctx.strokeStyle = `rgba(${i % 2 ? '120,110,86' : '80,80,64'},${0.2 - i * 0.02})`;
    ctx.lineWidth = 14 - i * 2;
    ctx.beginPath(); ctx.arc(A.x, A.y, 100 + i * 78, 0, TAU); ctx.stroke();
  }
  // moss blotches
  const rng = mulberry32(77);
  for (let i = 0; i < 28; i++) {
    const a = rng() * TAU, rr = Math.sqrt(rng()) * A.r;
    ctx.fillStyle = `rgba(60,100,60,${0.04 + rng() * 0.08})`;
    ctx.beginPath(); ctx.ellipse(A.x + Math.cos(a) * rr, A.y + Math.sin(a) * rr, 30 + rng() * 70, 16 + rng() * 40, rng() * TAU, 0, TAU); ctx.fill();
  }
  // glowing sigil
  const pulse = 0.5 + Math.sin(time * 0.9) * 0.2;
  ctx.strokeStyle = `rgba(255,140,70,${0.10 + pulse * 0.10})`;
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(A.x, A.y, 250, 0, TAU); ctx.stroke();
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 8; i++) {
    const a0 = (i / 8) * TAU;
    ctx.beginPath();
    ctx.moveTo(A.x + Math.cos(a0) * 214, A.y + Math.sin(a0) * 214);
    ctx.lineTo(A.x + Math.cos(a0 + 0.6) * 286, A.y + Math.sin(a0 + 0.6) * 286);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawDecal(ctx, d, time) {
  const x = d.x, y = d.y, s = d.s;
  if (d.kind === 'tuft') {
    const sway = Math.sin(time * 1.6 + d.seed) * 2.2;
    ctx.strokeStyle = d.tint < 0.4 ? 'rgba(64,120,72,.62)' : d.tint < 0.75 ? 'rgba(84,140,74,.5)' : 'rgba(40,88,58,.6)';
    ctx.lineWidth = 1.4;
    for (let i = 0; i < 4; i++) {
      const off = (i - 1.5) * 3.4 * s;
      ctx.beginPath();
      ctx.moveTo(x + off, y);
      ctx.quadraticCurveTo(x + off + sway * 0.5, y - 8 * s, x + off + sway + (i - 1.5) * 2, y - 13 * s - i);
      ctx.stroke();
    }
  } else if (d.kind === 'flower') {
    ctx.fillStyle = d.tint < 0.33 ? 'rgba(210,235,255,.5)' : d.tint < 0.66 ? 'rgba(255,205,120,.5)' : 'rgba(220,160,255,.42)';
    for (let i = 0; i < 3; i++) {
      const a = i * 2.1 + d.seed;
      ctx.beginPath(); ctx.arc(x + Math.cos(a) * 5 * s, y + Math.sin(a) * 3 * s, 1.8 * s, 0, TAU); ctx.fill();
    }
    ctx.strokeStyle = 'rgba(70,120,70,.4)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 6 * s); ctx.stroke();
  } else if (d.kind === 'leaf') {
    ctx.fillStyle = d.tint < 0.5 ? 'rgba(150,120,60,.4)' : 'rgba(90,130,70,.36)';
    ctx.beginPath(); ctx.ellipse(x, y, 4 * s, 2 * s, d.tint * 6, 0, TAU); ctx.fill();
  } else if (d.kind === 'mushroom') {
    ctx.fillStyle = 'rgba(120,210,180,.28)';
    ctx.beginPath(); ctx.ellipse(x, y - 3, 4 * s, 2.4 * s, 0, Math.PI, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(190,255,230,.35)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x, y - 3); ctx.lineTo(x, y + 2 * s); ctx.stroke();
  } else if (d.kind === 'rubble') {
    ctx.fillStyle = 'rgba(64,72,66,.55)';
    ctx.beginPath(); ctx.ellipse(x, y, 12 * s, 7 * s, d.seed, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(38,44,40,.5)';
    ctx.beginPath(); ctx.ellipse(x + 5 * s, y + 4 * s, 7 * s, 4 * s, 0, 0, TAU); ctx.fill();
  } else if (d.kind === 'arenaCrack') {
    ctx.strokeStyle = 'rgba(16,18,14,.4)'; ctx.lineWidth = 1.4 * s;
    ctx.beginPath();
    ctx.moveTo(x - 22 * s, y);
    ctx.lineTo(x - 8 * s, y - 5 * s);
    ctx.lineTo(x + 4 * s, y + 3 * s);
    ctx.lineTo(x + 20 * s, y - 2 * s);
    ctx.stroke();
  }
}

// fireflies & pollen drawn in screen world space
export function drawFireflies(ctx, cam, time) {
  const x0 = cam.x - cam.vw / 2 - 40, x1 = cam.x + cam.vw / 2 + 40;
  const y0 = cam.y - cam.vh / 2 - 40, y1 = cam.y + cam.vh / 2 + 40;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const f of world.fireflies) {
    if (f.x < x0 || f.x > x1 || f.y < y0 || f.y > y1) continue;
    const bob = Math.sin(time * 0.7 + f.ph) * 12;
    const fade = 0.3 + (Math.sin(time * 1.7 + f.ph) * 0.5 + 0.5) * 0.7;
    const x = f.x + Math.sin(time * 0.3 + f.seed) * 20, y = f.y + bob;
    const r = f.s * 14;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(190,255,190,${0.55 * fade})`);
    g.addColorStop(0.35, `rgba(140,240,160,${0.18 * fade})`);
    g.addColorStop(1, 'rgba(120,220,140,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  ctx.restore();
}
