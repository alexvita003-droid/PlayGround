import { Game } from './game.js';
import { CLASSES } from './player.js';
import { Audio } from './audio.js';
import { TitleScene } from './title.js';

const $ = id => document.getElementById(id);
const elements = {
  canvas: $('game'), minimap: $('minimap'), hud: $('hud'), title: $('title'),
  modal: $('modal'), pause: $('pause'), end: $('endScreen'),
};
const audio = new Audio();
const titleScene = new TitleScene($('titleCanvas'));
let selectedClass = 'blade';
let toastId = 0;

const hide = el => el?.classList.add('hidden');
const show = el => el?.classList.remove('hidden');
const percent = (value, max) => `${Math.max(0, Math.min(100, max ? value / max * 100 : 0))}%`;

const ui = {
  isBlocking() {
    return !elements.modal.classList.contains('hidden') ||
      !elements.pause.classList.contains('hidden') ||
      !elements.end.classList.contains('hidden');
  },
  update(game) {
    const p = game.player;
    if (!p) return;
    $('playerName').textContent = p.cls.name;
    $('portraitGlyph').textContent = p.cls.glyph;
    $('playerLevel').textContent = `Lv.${p.level}`;
    $('hpFill').style.width = percent(p.hp, p.maxHp);
    $('staFill').style.width = percent(p.sta, p.maxSta);
    $('mpFill').style.width = percent(p.mp, p.maxMp);
    $('xpFill').style.width = percent(p.xp, p.xpNext);
    $('hpText').textContent = `${Math.ceil(p.hp)}/${p.maxHp}`;
    $('xpText').textContent = `${p.xp}/${p.xpNext} EXP`;
    $('goldText').textContent = p.gold;
    $('shardText').textContent = p.shards;
    $('comboCount').textContent = game.combo;
    if (game.combo > 1 && game.comboTimer > 0) show($('combo'));
    else hide($('combo'));
    const cooldowns = { btnDash: [p.dashCd, 1.15], btnSkill1: [p.skillCd, 7], btnSkill2: [p.ultCd, 16] };
    for (const [id, [current, duration]] of Object.entries(cooldowns)) {
      const button = $(id);
      if (button) button.style.setProperty('--cd', `${Math.max(0, Math.min(1, current / duration)) * 360}deg`);
    }
    if (!elements.pause.classList.contains('hidden')) {
      $('pauseStats').textContent = `Lv. ${p.level} · ${game.stats.kills} uccisioni · ${p.gold} ◈`;
    }
  },
  quest(game) {
    const quests = [
      ['Il risveglio del Bosco', 'Abbatti 6 creature del Bosco Sospeso', 6],
      ['Le Ossa del Passato', 'Distruggi 8 non-morti alle Rovine di Aether', 8],
      ['La via del Colosso', 'Raggiungi l’Arena Radicata a est', 1],
      ['Il Colosso Radicato', 'Sconfiggi VERBENA, il Colosso Radicato', 1],
    ];
    const q = quests[Math.min(game.questStage, quests.length - 1)];
    $('questKicker').textContent = game.questStage >= 4 ? 'LEGGENDA' : `MISSIONE ${game.questStage + 1}/4`;
    $('questName').textContent = game.questStage >= 4 ? 'La Frontiera è libera' : q[0];
    $('questObjective').textContent = game.questStage >= 4 ? 'La tua leggenda vivrà per sempre' : q[1];
    $('questProgress').firstElementChild.style.width = game.questStage >= 4
      ? '100%' : percent(game.qKills, game.qTotal || q[2]);
  },
  bossBar(game, active) {
    if (!active || !game.boss || game.boss.dead) { hide($('bossBar')); return; }
    show($('bossBar'));
    $('bossName').textContent = game.boss.name || 'VERBENA';
    $('bossFill').style.width = percent(game.boss.hp, game.boss.maxHp);
    $('bossPhase').textContent = game.boss.phase > 1 ? 'FASE II · RADICI INFEROCITE' : 'IL COLOSSO RADICATO';
  },
  end(victory, game) {
    show(elements.end);
    $('endGlyph').textContent = victory ? '✦' : '☠';
    $('endTitle').textContent = victory ? 'LA FRONTIERA È LIBERA' : 'SEI CADUTO';
    $('endText').textContent = victory
      ? 'Verbena è caduta. Il tuo nome riecheggia tra le isole sospese.'
      : 'Il bosco reclama i suoi eroi. Ma la frontiera è ancora lì.';
    $('endStats').textContent = `Livello ${game.player.level} · ${game.stats.kills} creature sconfitte · ${game.player.gold} ◈`;
    $('reviveBtn').classList.toggle('hidden', victory);
    $('endQuitBtn').textContent = victory ? 'TORNA AL TITOLO' : 'TORNA AL TITOLO';
  },
  togglePause() {
    if (!elements.modal.classList.contains('hidden')) { hide(elements.modal); return; }
    if (!elements.end.classList.contains('hidden')) return;
    game.paused = !game.paused;
    if (game.paused) { ui.update(game); show(elements.pause); }
    else hide(elements.pause);
  },
  toast(message, type = '') {
    const node = document.createElement('div');
    node.className = `toast ${type}`.trim();
    node.textContent = message;
    $('toastWrap').append(node);
    while ($('toastWrap').children.length > 4) $('toastWrap').firstElementChild.remove();
    const id = ++toastId;
    window.setTimeout(() => { if (node.isConnected) node.remove(); }, 3300 + id % 2 * 120);
  },
  zone(name) { $('zoneTag').textContent = name; },
  setInteract(text) {
    if (!text) { hide($('interactPrompt')); return; }
    $('interactText').textContent = text;
    show($('interactPrompt'));
  },
  dialog(title, body, icon = '📜') {
    $('modalTitle').textContent = title;
    $('modalIcon').textContent = icon;
    $('modalBody').innerHTML = body;
    show(elements.modal);
  },
};

const game = new Game(elements.canvas, elements.minimap, audio, ui);
game.run();
titleScene.start();

function refreshContinue() {
  const save = Game.loadSave();
  $('continueBtn').classList.toggle('hidden', !save || !CLASSES[save.cls]);
  return save;
}
function startGame(save = null) {
  audio.init();
  titleScene.stop();
  hide(elements.title);
  hide(elements.modal);
  hide(elements.pause);
  hide(elements.end);
  show(elements.hud);
  game.start(save?.cls || selectedClass, save);
  ui.update(game);
}
function returnToTitle() {
  game.resetToTitle();
  hide(elements.hud);
  hide(elements.pause);
  hide(elements.end);
  hide(elements.modal);
  show(elements.title);
  refreshContinue();
  titleScene.start();
}

for (const card of document.querySelectorAll('.classCard')) {
  card.addEventListener('click', () => {
    selectedClass = card.dataset.class;
    for (const other of document.querySelectorAll('.classCard')) other.classList.toggle('selected', other === card);
  });
}
$('startBtn').addEventListener('click', () => {
  Game.clearSave();
  startGame();
});
$('continueBtn').addEventListener('click', () => {
  const save = refreshContinue();
  if (save && CLASSES[save.cls]) startGame(save);
});
$('howBtn').addEventListener('click', () => ui.dialog('COME SI GIOCA',
  '<p><b>Muoviti</b> con WASD o la levetta virtuale. Attacca con SPAZIO/J o il pulsante ⚔.</p>' +
  '<p><b>Scatto:</b> SHIFT/K o SCATTO. <b>Arte:</b> Q. <b>Furia:</b> E.</p>' +
  '<p>Avvicinati ai personaggi e agli oggetti del Campo, poi premi <b>F</b> (o tocca il suggerimento). Completa le missioni, raccogli ricompense e raggiungi l’arena a est.</p>' +
  '<p>Su Android, usa la levetta a sinistra e i pulsanti d’azione a destra. Il progresso si salva automaticamente su questo dispositivo.</p>', '⚔'));
$('modalClose').addEventListener('click', () => hide(elements.modal));
$('resumeBtn').addEventListener('click', () => { game.paused = false; hide(elements.pause); });
$('guideBtn').addEventListener('click', () => ui.dialog('COMANDI',
  '<p><b>WASD</b> movimento · <b>SPAZIO/J</b> attacco · <b>SHIFT/K</b> scatto.</p><p><b>Q</b> arte · <b>E</b> furia · <b>F</b> interazione · <b>ESC</b> pausa.</p>', '⌨'));
$('quitBtn').addEventListener('click', returnToTitle);
$('reviveBtn').addEventListener('click', () => { hide(elements.end); game.respawnPlayer(); });
$('endQuitBtn').addEventListener('click', returnToTitle);
$('interactPrompt').addEventListener('click', () => game.interact());
window.addEventListener('keydown', event => {
  if (event.code === 'Escape' && !elements.modal.classList.contains('hidden')) {
    hide(elements.modal);
    event.stopPropagation();
  }
}, true);

// Mobile touch support, including the virtual stick and held attack button.
if (window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0) document.body.classList.add('touch');
const stickZone = $('stickZone');
const stick = $('stick');
const knob = $('stickKnob');
let stickPointer = null;
function moveStick(event) {
  const rect = stick.getBoundingClientRect();
  const radius = Math.max(1, rect.width * 0.39);
  const dx = event.clientX - (rect.left + rect.width / 2);
  const dy = event.clientY - (rect.top + rect.height / 2);
  const length = Math.hypot(dx, dy);
  const scale = length > radius ? radius / length : 1;
  const x = dx * scale, y = dy * scale;
  knob.style.transform = `translate(${x}px, ${y}px)`;
  game.touchMove.x = Math.max(-1, Math.min(1, x / radius));
  game.touchMove.y = Math.max(-1, Math.min(1, y / radius));
}
function clearStick() {
  stickPointer = null;
  game.touchMove.x = 0; game.touchMove.y = 0;
  knob.style.transform = '';
}
stickZone.addEventListener('pointerdown', event => {
  if (!game.started || game.paused) return;
  event.preventDefault();
  stickPointer = event.pointerId;
  stickZone.setPointerCapture(event.pointerId);
  moveStick(event);
});
stickZone.addEventListener('pointermove', event => { if (event.pointerId === stickPointer) moveStick(event); });
stickZone.addEventListener('pointerup', event => { if (event.pointerId === stickPointer) clearStick(); });
stickZone.addEventListener('pointercancel', clearStick);

for (const button of document.querySelectorAll('[data-act]')) {
  const action = button.dataset.act;
  button.addEventListener('pointerdown', event => {
    if (!game.started || game.paused || !elements.end.classList.contains('hidden')) return;
    event.preventDefault();
    button.classList.add('pressed');
    if (action === 'attack') game.attackHeld = true;
    else if (action === 'dash') game.tryDash();
    else if (action === 'skill1') game.useSkill(1);
    else if (action === 'skill2') game.useSkill(2);
  });
  const release = () => {
    button.classList.remove('pressed');
    if (action === 'attack') game.attackHeld = false;
  };
  button.addEventListener('pointerup', release);
  button.addEventListener('pointercancel', release);
  button.addEventListener('lostpointercapture', release);
}
window.addEventListener('resize', () => { if (game.started) game.resize(); });
window.addEventListener('beforeunload', () => { if (game.started) game.save(); });
refreshContinue();
