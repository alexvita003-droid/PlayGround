import * as THREE from 'three';
import { clamp, damp, fbm, hashString, mulberry32 } from './noise.js';
import { ITEMS, ORIGINS, SKILLS, PATHS, MONSTERS, RECIPES, SECRETS, TITLES, FACTIONS, LANDMARKS, CHAT_NAMES, CHAT_LINES } from './data.js';

const $ = (id) => document.getElementById(id);
const el = (sel, root = document) => root.querySelector(sel);
const all = (sel, root = document) => [...root.querySelectorAll(sel)];
const sceneCanvas = $('scene');
const state = {
  name: 'Wanderer', origin: 'blade', seed: 'AURORA', seedNum: hashString('AURORA'),
  level: 1, xp: 0, xpNext: 100, hp: 100, maxHp: 100, mp: 60, maxMp: 60, stamina: 100,
  gold: 34, inventory: { rusty_sword: 1, hp_potion: 3, wolf_pelt: 1, iron_ore: 2, moonpetal: 1 },
  equipped: { weapon: 'rusty_sword', armor: null, trinket: null },
  stats: { STR: 5, AGI: 4, INT: 1, VIT: 4, LUK: 2 }, skillList: ['cleave'], skillCooldowns: {},
  deeds: { kills: 0, distance: 0, tames: 0, storms: 0, dungeons: 0, bossKills: 0, crafts: 0, melee: 0, spells: 0, dodges: 0, healed: 0, talks: 0 },
  secretsFound: [], titles: [], factionRep: { vale: 0, ember: 0, marches: 0 },
  questDone: [], activeQuest: 0, inventorySelection: 'rusty_sword', playTime: 0,
};
const quests = [
  { name: 'A Hand in Aurovale', desc: 'Speak with the folk of Aurovale. Even a small kindness can open a road.', objective: 'Meet a villager', done: (s) => s.deeds.talks > 0, reward: '25 gold · 40 experience', xp: 40, gold: 25 },
  { name: 'A Wolf at the Door', desc: 'The western trail has grown dangerous. Thin the pack and bring back proof.', objective: 'Defeat 3 creatures', done: (s) => s.deeds.kills >= 3, reward: '60 gold · 90 experience', xp: 90, gold: 60 },
  { name: 'Old Things, New Uses', desc: 'Gather ore and pelt to forge something worthy of the Vale.', objective: 'Craft an item', done: (s) => s.deeds.crafts > 0, reward: 'Aurovale standing · 120 experience', xp: 120, gold: 0 },
];
let renderer, scene, camera, clock, terrain, player, playerMesh, sun, ambient, worldGroup, npcGroup, enemyGroup;
let yaw = 0, pitch = 0.26, camDistance = 8, locked = false, running = false, lastFrame = 0;
let keys = {}, entities = [], npcs = [], particles = [], interactTarget = null, target = null, selectedNPC = null;
let weather = 'Clear', dayTime = 9, worldDay = 1, eventTimer = 80, eventActive = false, random;
const tmpV = new THREE.Vector3();
const mat = (color, roughness = .9, extra = {}) => {
  if (typeof roughness === 'object') { extra = roughness; roughness = extra.roughness ?? .9; }
  return new THREE.MeshStandardMaterial({ color, roughness, ...extra });
};

function groundHeight(x, z) {
  const broad = fbm((x + state.seedNum % 97) / 420, (z - state.seedNum % 53) / 420, 5, state.seedNum) - .5;
  const detail = fbm(x / 92, z / 92, 3, state.seedNum + 82) - .5;
  const ridge = Math.max(0, fbm(x / 250, z / 250, 3, state.seedNum + 420) - .63);
  return 3 + broad * 25 + detail * 7 + ridge * 50;
}
function addMesh(parent, geometry, material, x, y, z, scale = [1,1,1]) {
  const mesh = new THREE.Mesh(geometry, material); mesh.position.set(x,y,z); mesh.scale.set(...scale); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
}
function makeTree(x,z,scale=1) {
  const y=groundHeight(x,z), group=new THREE.Group(); group.position.set(x,y,z); worldGroup.add(group);
  const trunk=mat(0x5c402c), leaves=[mat(0x27483a),mat(0x315640),mat(0x3c6046)][Math.floor(random()*3)];
  addMesh(group,new THREE.CylinderGeometry(.22,.38,3.8,7),trunk,0,1.9,0,[scale,scale,scale]);
  addMesh(group,new THREE.ConeGeometry(1.7,3.9,7),leaves,0,4.0,0,[scale,scale,scale]);
  addMesh(group,new THREE.ConeGeometry(1.35,3.2,7),leaves,0,5.6,0,[scale,scale,scale]);
}
function makeLandmark(lm) {
  const g=new THREE.Group(), y=groundHeight(lm.x,lm.z); g.position.set(lm.x,y,lm.z); worldGroup.add(g);
  const stone=mat(lm.type==='stones'?0x777d78:0x696a61), wood=mat(0x64482e), roof=mat(0x693e32), gold=mat(0xb4995e,{metalness:.25});
  if(lm.type==='village'){
    addMesh(g,new THREE.CylinderGeometry(3.2,4,0.22,8),mat(0x8c785a),0,.12,0,[2.8,1,2.1]);
    [[-9,-3],[8,-6],[-5,9],[12,7]].forEach(([x,z],i)=>{const h=4+(i%2);addMesh(g,new THREE.BoxGeometry(4,h,4),i===0?mat(0x9b8160):mat(0x826b50),x,h/2,z);addMesh(g,new THREE.ConeGeometry(3.5,2.6,4),roof,x,h+1.1,z).rotation.y=Math.PI/4;});
    const sign=addMesh(g,new THREE.BoxGeometry(.14,2,.8),gold,0,1.2,4); sign.rotation.z=.1;
  } else if(lm.type==='castle'){
    addMesh(g,new THREE.BoxGeometry(20,10,16),stone,0,5,0); [[-10,-8],[10,-8],[-10,8],[10,8]].forEach(([x,z])=>{addMesh(g,new THREE.CylinderGeometry(2.4,2.7,15,8),stone,x,7.5,z);addMesh(g,new THREE.ConeGeometry(2.7,4,8),roof,x,17,z);});
    addMesh(g,new THREE.BoxGeometry(3,5,.3),mat(0x34281d),0,2.5,8.2);
  } else if(lm.type==='ruins'){
    for(let i=0;i<8;i++){let a=i*Math.PI/4; let h=2+random()*5; const c=addMesh(g,new THREE.CylinderGeometry(.65,.8,h,5),stone,Math.cos(a)*9,h/2,Math.sin(a)*9);c.rotation.z=(random()-.5)*.24;}
    addMesh(g,new THREE.TorusGeometry(9,.35,6,24),mat(0x827b6d),0,3.4,0).rotation.x=Math.PI/2;
  } else if(lm.type==='camp'){
    addMesh(g,new THREE.ConeGeometry(3.5,4,4),mat(0x8d6743),-5,2,0).rotation.y=.7;
    addMesh(g,new THREE.ConeGeometry(2.8,3.2,4),mat(0x7d6044),4,1.6,2).rotation.y=.2;
    addMesh(g,new THREE.CylinderGeometry(.8,1,.25,8),mat(0xc87839,{emissive:0x713010,emissiveIntensity:.7}),0,.18,0);
  } else if(lm.type==='stones'){
    for(let i=0;i<9;i++){let a=i*Math.PI*2/9;let h=2.3+random()*1.7;const s=addMesh(g,new THREE.BoxGeometry(1.1,h,.65),mat(0x77827d,{emissive:0x1d3c3a,emissiveIntensity:.18}),Math.cos(a)*7,h/2,Math.sin(a)*7);s.rotation.y=-a;s.rotation.z=(random()-.5)*.12;}
  } else if(lm.type==='barrow'){
    addMesh(g,new THREE.SphereGeometry(12,18,12),mat(0x45473c),0,0,0,[1,.42,.8]);
    addMesh(g,new THREE.BoxGeometry(3,4,.5),mat(0x262b29),0,1.2,8);
  } else if(lm.type==='shore'){
    addMesh(g,new THREE.CylinderGeometry(2.5,3.2,.35,8),mat(0x9c9b8a),-5,.2,0);addMesh(g,new THREE.CylinderGeometry(2,2.7,.3,8),mat(0xaaa593),0,.16,0);addMesh(g,new THREE.CylinderGeometry(1.8,2.3,.28,8),mat(0x827d70),5,.14,0);
  } else if(lm.type==='peak'){
    addMesh(g,new THREE.ConeGeometry(18,30,7),mat(0x767a78),0,14,0);addMesh(g,new THREE.ConeGeometry(8,12,7),mat(0xd0d1c7),0,28,0);
  }
  g.userData.landmark=lm; return g;
}
function makeHumanoid(name, role, x,z, color, icon='✦') {
  const group=new THREE.Group(); group.position.set(x,groundHeight(x,z),z); npcGroup.add(group);
  const robe=mat(color), skin=mat(0xd1ad8a), dark=mat(0x302a25);
  addMesh(group,new THREE.CylinderGeometry(.35,.52,1.45,8),robe,0,.95,0);
  addMesh(group,new THREE.SphereGeometry(.34,12,10),skin,0,1.95,0);
  addMesh(group,new THREE.ConeGeometry(.42,.7,8),dark,0,2.4,0);
  const label=document.createElement('div'); label.className='world-label'; label.innerHTML=`<b>${name}</b><span>${role}</span>`; document.body.appendChild(label);
  const npc={name,role,group,label,x,z,icon}; npcs.push(npc); return npc;
}
function makeEnemy(type,x,z,scale=1) {
  const def=MONSTERS[type], group=new THREE.Group(); group.position.set(x,groundHeight(x,z),z); enemyGroup.add(group);
  const hide=mat(type==='wolf'?0x77766b:type==='boar'?0x6a4930:type==='goblin'?0x729348:type==='skeleton'?0xc6bda8:0x456349);
  if(type==='wolf'||type==='boar'||type==='bear'){
    addMesh(group,new THREE.SphereGeometry(.65,12,9),hide,0,.72,0,[1.45,.75,.72]);
    addMesh(group,new THREE.SphereGeometry(.4,10,8),hide,.67,.9,-.08,[.85,.75,.8]);
    for(const [a,b] of [[-.4,-.4],[.4,-.4],[-.4,.4],[.4,.4]])addMesh(group,new THREE.CylinderGeometry(.11,.16,.65,6),hide,a,.34,b);
    if(type==='wolf')addMesh(group,new THREE.ConeGeometry(.12,.6,6),mat(0xb8a77c),1.02,.52,-.08).rotation.z=-Math.PI/2;
  }else{
    addMesh(group,new THREE.CylinderGeometry(.38,.48,1.25,8),hide,0,.95,0);
    addMesh(group,new THREE.SphereGeometry(.38,10,8),hide,0,1.8,0);
    addMesh(group,new THREE.BoxGeometry(.16,.78,.2),hide,-.56,1.05,0).rotation.z=-.22;
    addMesh(group,new THREE.BoxGeometry(.16,.78,.2),hide,.56,1.05,0).rotation.z=.22;
    if(type==='skeleton'){addMesh(group,new THREE.BoxGeometry(.56,.08,.08),mat(0x28251f),0,1.82,.33);}
  }
  if(def.elite||def.boss){const ring=addMesh(group,new THREE.TorusGeometry(1.25,.04,5,24),mat(0xca7255,{emissive:0x562010,emissiveIntensity:.5}),0,.04,0);ring.rotation.x=Math.PI/2;}
  const enemy={type,def,group,x,z,hp:def.hp,maxHp:def.hp,alive:true,aggro:false,attack:0,roam:random()*Math.PI*2,scale}; entities.push(enemy); return enemy;
}
function setupWorld(seed) {
  state.seed=seed||'AURORA';state.seedNum=hashString(state.seed);random=mulberry32(state.seedNum);
  scene=new THREE.Scene();scene.background=new THREE.Color(0x8ca9ac);scene.fog=new THREE.Fog(0x93aaad,90,620);
  camera=new THREE.PerspectiveCamera(62,innerWidth/innerHeight,.1,1200);
  if(!renderer)renderer=new THREE.WebGLRenderer({canvas:sceneCanvas,antialias:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
  clock=new THREE.Clock();
  ambient=new THREE.HemisphereLight(0xd5e4ec,0x35402f,1.5);scene.add(ambient);
  sun=new THREE.DirectionalLight(0xffe6bd,2.1);sun.position.set(-90,150,60);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-120;sun.shadow.camera.right=120;sun.shadow.camera.top=120;sun.shadow.camera.bottom=-120;scene.add(sun);
  worldGroup=new THREE.Group();npcGroup=new THREE.Group();enemyGroup=new THREE.Group();scene.add(worldGroup,npcGroup,enemyGroup);
  buildTerrain();
  LANDMARKS.forEach(makeLandmark);
  for(let i=0;i<450;i++){
    const x=(random()-.5)*700,z=(random()-.5)*700;
    if(Math.hypot(x,z)<16||LANDMARKS.some(l=>Math.hypot(x-l.x,z-l.z)<l.radius+9))continue;
    const edge=Math.min(Math.hypot(x,z),...LANDMARKS.map(l=>Math.hypot(x-l.x,z-l.z)));
    if(edge<28)continue; makeTree(x,z,.65+random()*.8);
  }
  makeHumanoid('Mira','Village keeper',24,-50,0x657d63,'✦');
  makeHumanoid('Old Fen','Smith',32,-47,0x79614b,'⚒');
  makeHumanoid('Tallow','Trader',20,-57,0x806548,'⚖');
  makeHumanoid('Sister Elowen','Waykeeper',29,-60,0x567d72,'❁');
  for(let i=0;i<11;i++){let a=random()*Math.PI*2,r=38+random()*100;makeEnemy(i<6?'wolf':i<9?'boar':'goblin',Math.cos(a)*r,Math.sin(a)*r);}
  makeEnemy('skeleton',-220,150);makeEnemy('treant',-147,-222);makeEnemy('bear',239,56);makeEnemy('golem',-202,146);makeEnemy('drake',-370,320);makeEnemy('hollowking',244,62);
  player=new THREE.Vector3(0,groundHeight(0,0)+.1,0);playerMesh=makePlayer();
  return true;
}
function buildTerrain(){
  const size=900, segments=220, geo=new THREE.PlaneGeometry(size,size,segments,segments);geo.rotateX(-Math.PI/2);
  const pos=geo.attributes.position, colors=[];const c1=new THREE.Color(0x435f43),c2=new THREE.Color(0x77805b),c3=new THREE.Color(0x85877a);
  for(let i=0;i<pos.count;i++){
    const x=pos.getX(i),z=pos.getZ(i),h=groundHeight(x,z);pos.setY(i,h);
    const n=fbm(x/26,z/26,2,state.seedNum+9), col=c1.clone().lerp(c2,clamp((h-8)/55,0,.72)).lerp(c3,clamp((h-55)/35,0,.7));col.multiplyScalar(.88+n*.25);colors.push(col.r,col.g,col.b);
  }
  geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geo.computeVertexNormals();
  const m=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({vertexColors:true,roughness:1}));m.receiveShadow=true;worldGroup.add(m);terrain=m;
  const water=addMesh(worldGroup,new THREE.PlaneGeometry(1100,1100),mat(0x426e78,.28,{transparent:true,opacity:.66}),0,groundHeight(-340,-60)-1,-60);water.rotation.x=-Math.PI/2;
}
function makePlayer(){
  const group=new THREE.Group();scene.add(group);const coat=mat(0x344c50),trim=mat(0xc1a366),skin=mat(0xd7b28d),dark=mat(0x242729);
  addMesh(group,new THREE.CylinderGeometry(.32,.43,1.1,9),coat,0,1.05,0);
  addMesh(group,new THREE.SphereGeometry(.28,12,10),skin,0,1.82,0);
  addMesh(group,new THREE.ConeGeometry(.34,.55,8),dark,0,2.15,0);
  addMesh(group,new THREE.BoxGeometry(.12,.9,.13),trim,.42,1.15,.05).rotation.z=-.18;
  group.userData.coat=coat;return group;
}

let started=false, gameTime=0, attackTimer=0, jumpVelocity=0, dodgeTimer=0, saveTimer=0, dialogueNPC=null, shopMode='buy', activePanel=null, lastPlayerPos=null, zoneName='Verdant Reach';
const skillBySlot=['cleave','spark','fireball','whirlwind','tend'];
const landmarkSeen=new Set();
const fmt=(n)=>Math.floor(n).toLocaleString();
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const itemCount=(id)=>state.inventory[id]||0;
function toast(title, text='', kind=''){
  const box=$('toasts'); if(!box)return;
  const node=document.createElement('div');node.className=`toast ${kind}`;node.innerHTML=`<b>${title}</b>${text?`<span>${text}</span>`:''}`;box.append(node);setTimeout(()=>node.remove(),3800);
}
function log(text,channel='system'){
  const logBox=$('chat-log');if(!logBox)return;
  const line=document.createElement('div');line.className=`chat-line ${channel}`;line.innerHTML=`<span>${channel==='combat'?'⚔':channel==='world'?'◉':'✦'}</span> ${text}`;logBox.append(line);logBox.scrollTop=logBox.scrollHeight;
  while(logBox.children.length>35)logBox.firstChild.remove();
}
function show(id,on=true){$(id)?.classList.toggle('hidden',!on);}
function openPanel(name){
  if(!started)return;
  if(activePanel===name){closePanel();return;}
  closePanel();activePanel=name;show('panel-layer',true);$(`panel-${name}`)?.classList.add('open');
  if(name==='map')drawMap(); if(name==='inventory')renderInventory();if(name==='character')renderCharacter();if(name==='skills')renderSkills();if(name==='quests')renderQuests();if(name==='guild')renderGuild();if(name==='codex')renderCodex();if(name==='craft')renderCraft();
}
function closePanel(){all('.panel').forEach(p=>p.classList.remove('open'));show('panel-layer',false);activePanel=null;}
function startJourney(load=false){
  if(started&&renderer){npcs.forEach(npc=>npc.label.remove());particles.forEach(p=>p.remove());}
  entities=[];npcs=[];particles=[];landmarkSeen.clear();state.name=$('name-input')?.value.trim().slice(0,18)||state.name||'Wanderer';
  const origin=ORIGINS[state.origin]||ORIGINS.blade;
  if(!load){state.stats={...origin.stats};state.skillList=[...origin.skills];state.equipped.weapon=origin.weapon;state.level=1;state.xp=0;state.xpNext=100;state.hp=100+(state.origin==='hearth'?20:0);state.maxHp=state.hp;state.mp=state.origin==='arcane'?90:60;state.maxMp=state.mp;state.stamina=100;state.gold=34;state.inventory={ [origin.weapon]:1,hp_potion:3,wolf_pelt:1,iron_ore:2,moonpetal:1 };state.equipped={weapon:origin.weapon,armor:null,trinket:null};state.deeds={kills:0,distance:0,tames:0,storms:0,dungeons:0,bossKills:0,crafts:0,melee:0,spells:0,dodges:0,healed:0,talks:0};state.secretsFound=[];state.titles=[];state.factionRep={vale:0,ember:0,marches:0};state.questDone=[];state.activeQuest=0;}
  const seed=load?state.seed:($('seed-input')?.value.trim()||state.seed||'AURORA');setupWorld(seed);
  if(load&&loadedSave){player.set(loadedSave.position?.x||0,groundHeight(loadedSave.position?.x||0,loadedSave.position?.z||0)+.1,loadedSave.position?.z||0);dayTime=loadedSave.dayTime??9;worldDay=loadedSave.worldDay??1;weather=loadedSave.weather||'Clear';}
  show('title-screen',false);show('creation-screen',false);show('loading',false);show('hud',true);started=true;gameTime=0;lastPlayerPos=player.clone();
  if(!load){state.activeQuest=0;log(`The road opens before ${state.name}.`);toast('The Unbound',`Welcome to ${state.seed}.`);}
  refreshUI();animate();
}
function refreshUI(){
  if(!started)return;
  $('char-name').textContent=state.name;$('level-badge').textContent=state.level;$('char-path').textContent=state.path?PATHS[state.path]?.name||'Unbound':'Unbound';
  $('hp-fill').style.width=`${100*state.hp/state.maxHp}%`;$('hp-text').textContent=`${fmt(state.hp)} / ${state.maxHp}`;
  $('mp-fill').style.width=`${100*state.mp/state.maxMp}%`;$('mp-text').textContent=`${fmt(state.mp)} / ${state.maxMp}`;
  $('xp-fill').style.width=`${100*state.xp/state.xpNext}%`;$('xp-text').textContent=`${fmt(state.xp)} / ${state.xpNext}`;$('stamina-fill').style.width=`${state.stamina}%`;
  $('potion-count').textContent=itemCount('hp_potion');$('weapon-icon').textContent=ITEMS[state.equipped.weapon]?.icon||'⚔';
  $('clock-day').textContent=`Day ${worldDay}`;$('clock-weather').textContent=weather;$('clock-time').textContent=`${String(Math.floor(dayTime)).padStart(2,'0')}:${String(Math.floor((dayTime%1)*60)).padStart(2,'0')}`;
  $('weather-icon').textContent=weather==='Rain'?'☂':weather==='Storm'?'ϟ':dayTime<6||dayTime>19?'☾':'☀';$('moon-icon').textContent=dayTime<6||dayTime>19?'◕':'◐';
  $('minimap-coords').textContent=`${Math.round(player.x)}, ${Math.round(player.z)}`;$('minimap-zone').textContent=zoneName;
  const q=quests[state.activeQuest];if(q){$('quest-tracker-body').innerHTML=`<div class="qt-name">${q.name}</div><div class="qt-desc">${q.objective}</div>`;}else{$('quest-tracker-body').innerHTML='<div class="qt-name">No active calling</div><div class="qt-desc">Explore, craft, and make your own legend.</div>';}
  drawMinimap();drawPortrait();
}
function drawPortrait(){const c=$('portrait');if(!c)return;const ctx=c.getContext('2d');ctx.clearRect(0,0,c.width,c.height);ctx.fillStyle='#19232b';ctx.fillRect(0,0,96,96);ctx.fillStyle='#344c50';ctx.beginPath();ctx.ellipse(48,75,31,34,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#d7b28d';ctx.beginPath();ctx.arc(48,39,20,0,Math.PI*2);ctx.fill();ctx.fillStyle='#242729';ctx.beginPath();ctx.moveTo(25,36);ctx.lineTo(48,8);ctx.lineTo(70,36);ctx.closePath();ctx.fill();ctx.strokeStyle='#c1a366';ctx.lineWidth=3;ctx.strokeRect(4,4,88,88);}
function drawMinimap(){const c=$('minimap');if(!c||!player)return;const ctx=c.getContext('2d'),w=c.width,h=c.height,r=75;ctx.clearRect(0,0,w,h);ctx.save();ctx.beginPath();ctx.arc(w/2,h/2,r,0,Math.PI*2);ctx.clip();ctx.fillStyle='#34483d';ctx.fillRect(0,0,w,h);ctx.strokeStyle='rgba(200,190,150,.25)';for(let i=-2;i<=2;i++){ctx.beginPath();ctx.moveTo(w/2+i*30,0);ctx.lineTo(w/2+i*30,h);ctx.stroke();ctx.beginPath();ctx.moveTo(0,h/2+i*30);ctx.lineTo(w,h/2+i*30);ctx.stroke();}
  const scale=.38;LANDMARKS.forEach(l=>{const x=w/2+(l.x-player.x)*scale,y=h/2+(l.z-player.z)*scale;if(x>w/2-r&&x<w/2+r&&y>h/2-r&&y<h/2+r){ctx.fillStyle=l.type==='village'?'#d9c181':'#a7a394';ctx.beginPath();ctx.arc(x,y,l.type==='village'?3.5:2,0,Math.PI*2);ctx.fill();}});
  entities.filter(e=>e.alive&&distance(player,e)<90).forEach(e=>{ctx.fillStyle='#d76e62';ctx.fillRect(w/2+(e.x-player.x)*scale-1,h/2+(e.z-player.z)*scale-1,3,3);});ctx.restore();ctx.fillStyle='#f0d58f';ctx.beginPath();ctx.arc(w/2,h/2,4,0,Math.PI*2);ctx.fill();}
function renderCharacter(){const b=$('character-body');const origin=ORIGINS[state.origin];b.innerHTML=`<div class="character-card"><div class="big-glyph">${origin?.glyph||'✦'}</div><div><h2>${state.name}</h2><p>${origin?.name||'Wanderer'} · Level ${state.level}</p><small>${state.path?PATHS[state.path]?.desc:'Your path is still unwritten.'}</small></div></div><div class="stat-grid">${Object.entries(state.stats).map(([k,v])=>`<div><span>${k}</span><b>${v}</b></div>`).join('')}</div><div class="panel-section"><h4>Journey</h4><p>${fmt(state.deeds.distance)} m traveled · ${state.deeds.kills} victories · ${state.deeds.crafts} crafts</p><p>Gold <b>◈ ${state.gold}</b> · Title <b>${state.title||'Unbound'}</b></p></div><div class="panel-section"><h4>Factions</h4>${Object.entries(FACTIONS).map(([id,f])=>`<p style="color:${f.color}">${f.name}<span class="float-right">${state.factionRep[id]||0} standing</span></p>`).join('')}</div>`;}
function renderInventory(){const b=$('inventory-body'),ids=Object.keys(state.inventory).filter(id=>state.inventory[id]>0);b.innerHTML=`<div class="inventory-layout"><div class="item-list">${ids.map(id=>{const it=ITEMS[id];return `<button class="item-row ${state.inventorySelection===id?'selected':''}" data-item="${id}"><span>${it?.icon||'◈'}</span><b>${it?.name||id}</b><small>×${state.inventory[id]}</small></button>`;}).join('')||'<p>Your satchel is empty.</p>'}</div><div class="item-detail">${(()=>{const id=state.inventorySelection,it=ITEMS[id];return it?`<div class="big-glyph">${it.icon}</div><h3>${it.name}</h3><p>${it.desc}</p><p class="rarity">${it.rarity||'Common'} · ${it.type}</p>${['weapon','armor','trinket'].includes(it.type)?`<button class="btn-primary" data-equip="${id}">${state.equipped[it.type]===id?'Equipped':'Equip'}</button>`:it.type==='consumable'?`<button class="btn-primary" data-use="${id}">Use item</button>`:''}`:'<p>Select an item to inspect it.</p>';})()}</div></div><div class="panel-actions"><button class="btn-ghost" data-open-craft>Open workshop</button><span>◈ ${state.gold} gold</span></div>`;}
function renderSkills(){const b=$('skills-body');b.innerHTML=`<p class="panel-intro">Skills emerge from what you practice. Equip up to five techniques, then use 1–5 in the world.</p><div class="skill-grid">${Object.entries(SKILLS).map(([id,s])=>`<article class="skill-card ${state.skillList.includes(id)?'learned':''}"><div class="skill-icon">${s.icon}</div><h4>${s.name}</h4><p>${s.desc}</p><small>${state.skillList.includes(id)?'Learned':`${s.cost} mana · ${s.cd}s cooldown`}</small><button class="btn-ghost small" data-skill="${id}">${state.skillList.includes(id)?'Unequip':'Learn · 80 XP'}</button></article>`).join('')}</div>`;}
function renderQuests(){const b=$('quests-body');b.innerHTML=quests.map((q,i)=>`<article class="quest-card ${state.questDone.includes(i)?'done':''}"><div class="quest-mark">${state.questDone.includes(i)?'✓':'✦'}</div><div><h4>${q.name}</h4><p>${q.desc}</p><small>${state.questDone.includes(i)?'Completed':q.objective} · ${q.reward}</small></div><button class="btn-ghost small" data-quest="${i}" ${state.questDone.includes(i)?'disabled':''}>${state.activeQuest===i?'Tracking':'Track'}</button></article>`).join('');}
function renderCraft(){const b=$('craft-body');b.innerHTML=`<p class="panel-intro">A portable kit is enough to make useful things. Recipes improve with practice.</p><div class="recipe-list">${Object.entries(RECIPES).map(([id,r])=>{const out=ITEMS[r.out],can=state.level>=r.reqLvl&&Object.entries(r.need).every(([k,n])=>itemCount(k)>=n)&&state.gold>=r.gold;return `<article class="recipe-card"><span class="recipe-icon">${out.icon}</span><div><h4>${r.name}</h4><p>${Object.entries(r.need).map(([k,n])=>`${ITEMS[k]?.icon||'◈'} ${n} ${ITEMS[k]?.name||k}`).join(' · ')}</p><small>◈ ${r.gold} · ${r.prof} · level ${r.reqLvl}</small></div><button class="btn-primary small" data-craft="${id}" ${can?'':'disabled'}>Craft</button></article>`;}).join('')}</div>`;}
function renderGuild(){const b=$('guild-body');b.innerHTML=`<div class="guild-banner"><div class="big-glyph">⚑</div><div><h2>${state.guild?'The Nameless':'No banner but your own'}</h2><p>${state.guild?'A small charter, a large horizon.':'Guilds are made by deeds, not menus. Discover the Nameless Table in Aurovale.'}</p></div></div><div class="panel-section"><h4>Realm standings</h4>${Object.entries(FACTIONS).map(([id,f])=>`<div class="faction-row"><span style="color:${f.color}">◆ ${f.name}</span><b>${state.factionRep[id]||0}</b></div>`).join('')}</div><div class="panel-section"><h4>World activity</h4><p>${weather==='Storm'?'A storm is moving across the Reach.':`The ${weather.toLowerCase()} skies are quiet for now.`} The day is ${dayTime<6||dayTime>19?'dark':'young'}.</p></div><button class="btn-ghost" data-open-craft>Open workshop</button>`;}
function renderCodex(){const b=$('codex-body');b.innerHTML=`<p class="panel-intro">Fragments of rumor, mapped against your own discoveries. The world does not mark its secrets for you.</p><div class="codex-grid">${Object.entries(SECRETS).map(([id,s])=>`<article class="secret-card ${state.secretsFound.includes(id)?'found':''}"><div class="skill-icon">${state.secretsFound.includes(id)?s.glyph:'?'}</div><h4>${state.secretsFound.includes(id)?s.name:'Unrecorded mystery'}</h4><p>${state.secretsFound.includes(id)?s.text:s.hint}</p><small>${state.secretsFound.includes(id)?s.reward:s.region}</small></article>`).join('')}</div>`;}
function drawMap(){const c=$('worldmap');if(!c||!player)return;const ctx=c.getContext('2d'),w=c.width,h=c.height;ctx.fillStyle='#19241f';ctx.fillRect(0,0,w,h);for(let y=0;y<h;y+=8){for(let x=0;x<w;x+=8){const wx=(x/w-.5)*900,wz=(y/h-.5)*900,n=fbm(wx/70,wz/70,3,state.seedNum);ctx.fillStyle=n>.58?'#68745a':n<.43?'#38545a':'#455c45';ctx.globalAlpha=.35;ctx.fillRect(x,y,8,8);}}ctx.globalAlpha=1;LANDMARKS.forEach(l=>{const x=(l.x/900+.5)*w,y=(l.z/900+.5)*h;ctx.fillStyle=l.type==='village'?'#d8be78':'#ddd5be';ctx.beginPath();ctx.arc(x,y,l.type==='village'?7:4,0,Math.PI*2);ctx.fill();ctx.fillStyle='#eee';ctx.font='13px Inter';ctx.fillText(l.name,x+8,y-6);});ctx.fillStyle='#65d9c0';ctx.beginPath();ctx.arc((player.x/900+.5)*w,(player.z/900+.5)*h,7,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#e3c782';ctx.stroke();}
function gainXP(amount){state.xp+=amount;while(state.xp>=state.xpNext){state.xp-=state.xpNext;state.level++;state.xpNext=Math.round(state.xpNext*1.35);state.maxHp+=12;state.maxMp+=5;state.hp=state.maxHp;state.mp=state.maxMp;state.stats.VIT++;$('lvl-num').textContent=state.level;show('levelup');setTimeout(()=>show('levelup',false),2300);toast('Level attained',`You are now level ${state.level}.`);log(`You reached level ${state.level}.`);}}
function setItem(id,n=1){state.inventory[id]=(state.inventory[id]||0)+n;if(state.inventory[id]<=0)delete state.inventory[id];}
function useItem(id){const it=ITEMS[id];if(!it||!itemCount(id))return false;if(it.heal){const amt=Math.min(it.heal,state.maxHp-state.hp);state.hp+=amt;state.deeds.healed+=amt;}if(it.mana)state.mp=Math.min(state.maxMp,state.mp+it.mana);if(it.stamina)state.stamina=Math.min(100,state.stamina+it.stamina);setItem(id,-1);toast('Used item',it.name);refreshUI();return true;}
function equipItem(id){const it=ITEMS[id];if(!it||!['weapon','armor','trinket'].includes(it.type))return;state.equipped[it.type]=id;toast('Equipped',it.name);renderInventory();refreshUI();}
function craft(id){const r=RECIPES[id];if(!r||state.level<r.reqLvl||state.gold<r.gold||!Object.entries(r.need).every(([k,n])=>itemCount(k)>=n))return;Object.entries(r.need).forEach(([k,n])=>setItem(k,-n));state.gold-=r.gold;setItem(r.out);state.deeds.crafts++;gainXP(18);toast('Crafted',r.name);log(`${state.name} crafted ${r.name}.`);checkProgress();renderCraft();refreshUI();}
function checkProgress(){
  quests.forEach((q,i)=>{if(q.done(state)&&!state.questDone.includes(i)){state.questDone.push(i);state.gold+=q.gold;gainXP(q.xp);if(i===2)state.factionRep.vale+=10;toast('Calling complete',q.name);log(`Calling complete: ${q.name}.`);if(state.activeQuest===i)state.activeQuest=quests.findIndex((x,j)=>j>i&&!state.questDone.includes(j));}});
  Object.entries(TITLES).forEach(([id,t])=>{if(t.check(state)&&!state.titles.includes(id)){state.titles.push(id);state.title=t.name;toast('Title earned',t.name);}});
  for(const [id,req] of [['blade',120],['arcane',60],['shadow',40],['life',500],['craft',12],['beast',2]]){const val={blade:state.deeds.melee,arcane:state.deeds.spells,shadow:state.deeds.dodges,life:state.deeds.healed,craft:state.deeds.crafts,beast:state.deeds.tames}[id];if(val>=req&&!state.path){state.path=id;toast('A path emerges',PATHS[id].name);}}
  refreshUI();
}
function discover(id){if(state.secretsFound.includes(id))return;const s=SECRETS[id];if(!s)return;state.secretsFound.push(id);state.deeds.dungeons+=id==='hollow'?1:0;const rewards={stones:()=>{state.skillList.push('voidrift');state.path='voidwalker';},oath:()=>setItem('emberfang'),hollow:()=>{setItem('ancient_sigil');},firstsun:()=>setItem('sun_shard'),nameless:()=>{state.guild=true;}};rewards[id]?.();$('disc-kicker').textContent='SECRET DISCOVERED';$('disc-glyph').textContent=s.glyph;$('disc-title').textContent=s.name;$('disc-text').textContent=s.text;$('disc-reward').textContent=s.reward;show('discovery');setTimeout(()=>show('discovery',false),5000);toast('Discovery',s.name);checkProgress();saveGame();}
function checkSecrets(){
  const x=player.x,z=player.z,near=(lx,lz,r)=>Math.hypot(x-lx,z-lz)<r;
  if(near(-140,-230,15)&&dayTime>=20||near(-140,-230,15)&&dayTime<5){if(weather==='Rain'||weather==='Storm')discover('stones');}
  if(near(-340,-60,18))discover('oath');if(near(240,60,15))discover('hollow');if(near(-380,330,19))discover('firstsun');
}
function showDialogue(npc){dialogueNPC=npc;state.deeds.talks++;const text=npc.name==='Mira'?'The vale is small, but the roads beyond it are not. If you have time, lend a hand.':npc.role==='Smith'?'A good blade is a promise you make to your future self. Bring me iron and hide.':npc.role==='Trader'?'The road brings strange things. I buy what you find and sell what keeps you alive.':'The weather has a memory. The stones remember more.';$('dlg-avatar').textContent=npc.icon;$('dlg-name').textContent=npc.name;$('dlg-role').textContent=npc.role;$('dlg-text').textContent=text;
  const opts=$('dlg-options');opts.innerHTML='';const add=(label,fn)=>{const b=document.createElement('button');b.className='btn-ghost';b.textContent=label;b.onclick=fn;opts.append(b);};
  if(npc.name==='Mira'&&!state.questDone.includes(0))add('Ask about work',()=>{state.activeQuest=0;toast('Calling accepted',quests[0].name);closeDialogue();});
  if(npc.role==='Smith')add('Use the workshop',()=>{closeDialogue();openPanel('craft');});
  if(npc.role==='Trader')add('Browse wares',()=>{closeDialogue();openShop(npc);});
  add('Tell me about the region',()=>{$('dlg-text').textContent='Follow the river west for the old shore. The stones to the north only speak in rain, and never by day.';});
  if(npc.name==='Mira')add('Stay and listen',()=>{discover('nameless');$('dlg-text').textContent='A quiet knock answers from beneath the inn floor. The Nameless Table has found you.';});
  add('Leave',closeDialogue);show('dialogue');}
function closeDialogue(){show('dialogue',false);dialogueNPC=null;checkProgress();}
function openShop(npc){$('shop-name').textContent=npc.name;$('shop-gold').textContent=state.gold;show('shop');renderShop();}
function renderShop(){const list=$('shop-list');if(shopMode==='buy'){const stock=['hp_potion','mp_potion','leather_vest','oak_staff','hunter_bow','hp_potion'];list.innerHTML=stock.map(id=>{const it=ITEMS[id],price=it.value;return `<div class="shop-item"><span>${it.icon}</span><div><b>${it.name}</b><small>◈ ${price}</small></div><button data-buy="${id}" ${state.gold>=price?'':'disabled'}>Buy</button></div>`;}).join('');}else{list.innerHTML=Object.entries(state.inventory).filter(([id,n])=>n>0&&ITEMS[id]?.value>0&&ITEMS[id]?.type!=='quest').map(([id,n])=>`<div class="shop-item"><span>${ITEMS[id].icon}</span><div><b>${ITEMS[id].name}</b><small>×${n} · ◈ ${Math.max(1,Math.floor(ITEMS[id].value*.55))}</small></div><button data-sell="${id}">Sell</button></div>`).join('')||'<p>Nothing to sell just yet.</p>';}}
function enemyAtAttack(damage,radius,spell=false){
  let hits=0;for(const e of entities){if(!e.alive)continue;const d=distance(player,e);if(d>radius)continue;if(!spell){const dir=new THREE.Vector3(e.x-player.x,0,e.z-player.z).normalize(),facing=new THREE.Vector3(Math.sin(yaw),0,Math.cos(yaw));if(dir.dot(facing)<-.2)continue;}const dealt=Math.max(1,damage-Math.floor(e.def.level*.6));e.hp-=dealt;e.aggro=true;hits++;floatText(e.group,`-${dealt}`,spell?'#a9a0ff':'#f2d18a');if(e.hp<=0)killEnemy(e);}
  if(!hits)log('Your strike cuts only air.','combat');return hits;
}
function floatText(parent,text,color){const d=document.createElement('div');d.className='world-label damage-float';d.textContent=text;d.style.color=color;document.body.append(d);d.userData={parent,life:1};particles.push(d);}
function basicAttack(){if(!started||activePanel||!$('dialogue').classList.contains('hidden')||attackTimer>0)return;attackTimer=.55;state.deeds.melee++;const w=ITEMS[state.equipped.weapon],dmg=(w?.atk||8)+state.stats.STR*1.6+state.level*2;enemyAtAttack(dmg,4.2);playerMesh.rotation.y=yaw;playerMesh.userData.attack=1;checkProgress();}
function castSkill(slot){const id=skillBySlot[slot]||state.skillList[slot],skill=SKILLS[id];if(!skill||!state.skillList.includes(id))return toast('Technique unknown','Learn it in the Techniques panel.');if((state.skillCooldowns[id]||0)>0)return; if(state.mp<skill.cost)return toast('Not enough mana');state.mp-=skill.cost;state.skillCooldowns[id]=skill.cd;state.deeds.spells++;
  if(id==='tend'){const amt=Math.min(38+state.stats.INT*3,state.maxHp-state.hp);state.hp+=amt;state.deeds.healed+=amt;toast('Tend',`Restored ${amt} health.`);}else if(id==='shadowstep'){player.x+=Math.sin(yaw)*8;player.z+=Math.cos(yaw)*8;player.y=groundHeight(player.x,player.z)+.1;state.deeds.dodges++;}else if(id==='sanctuary'){state.hp=Math.min(state.maxHp,state.hp+18);enemyAtAttack(24+state.stats.INT*2,8,true);}else if(id==='stormcall'||id==='voidrift'){enemyAtAttack(30+state.stats.INT*4,24,true);}else if(id==='fireball'||id==='spark'){enemyAtAttack((id==='fireball'?26:18)+state.stats.INT*3,18,true);}else if(id==='whirlwind'){enemyAtAttack(20+state.stats.STR*3,7,true);}else if(id==='shadowstrike'){enemyAtAttack(34+state.stats.AGI*3,6,true);}else{enemyAtAttack(22+state.stats.STR*3,5);}
  log(`${skill.name} answered your call.`,'combat');checkProgress();refreshUI();}
function killEnemy(e){e.alive=false;e.group.visible=false;state.deeds.kills++;if(e.def.boss)state.deeds.bossKills++;const loot=e.def.loot[Math.floor(random()*e.def.loot.length)];if(loot)setItem(loot);const gold=e.def.gold[0]+Math.floor(random()*(e.def.gold[1]-e.def.gold[0]+1));state.gold+=gold;gainXP(e.def.xp);toast(`${e.def.name} defeated`,`+${e.def.xp} XP · ◈ ${gold} · ${ITEMS[loot]?.name||'loot'}`);log(`Defeated ${e.def.name}.`,'combat');checkProgress();}
function targetNext(){const living=entities.filter(e=>e.alive).sort((a,b)=>distance(player,a)-distance(player,b));target=living[0]||null;if(target){$('tf-name').textContent=target.def.name;$('tf-level').textContent=`Lv. ${target.def.level}`;$('tf-tag').textContent=target.def.elite?'Elite':target.def.boss?'World Boss':target.def.type;$('tf-hp').style.width=`${100*target.hp/target.maxHp}%`;show('target-frame');}else show('target-frame',false);}

let loadedSave=null, raf=0, lastUISync=0, lastAutoSave=0, eventBannerTimer=0;
const SAVE_KEY='infinite-world-era-unbound';
function saveGame(){
  if(!started||!player)return;
  const payload={version:1,state,position:{x:player.x,z:player.z},dayTime,worldDay,weather,zoneName};
  try{localStorage.setItem(SAVE_KEY,JSON.stringify(payload));$('save-note').textContent=`Journey saved · ${state.name} · Level ${state.level}`;return true;}catch(err){console.warn('Could not save journey',err);toast('Save unavailable','Your browser storage is full or disabled.');return false;}
}
function readSave(){
  try{const raw=localStorage.getItem(SAVE_KEY);if(!raw)return null;const save=JSON.parse(raw);if(!save||!save.state||!save.position)return null;return save;}catch{return null;}
}
function applySave(save){
  if(!save?.state)return;
  const source=save.state;
  Object.keys(state).forEach(key=>{if(source[key]!==undefined)state[key]=source[key];});
  state.stats={...state.stats,...source.stats};state.deeds={...state.deeds,...source.deeds};state.inventory={...source.inventory};state.equipped={...state.equipped,...source.equipped};state.factionRep={...state.factionRep,...source.factionRep};
  loadedSave=save;
}
function renderOrigins(){
  const wrap=$('origins');if(!wrap)return;
  wrap.innerHTML=Object.entries(ORIGINS).map(([id,o])=>`<button class="origin-card ${state.origin===id?'selected':''}" data-origin="${id}"><span>${o.glyph}</span><b>${o.name}</b></button>`).join('');
  const o=ORIGINS[state.origin];$('origin-detail').innerHTML=`<div class="origin-glyph">${o.glyph}</div><h3>${o.name}</h3><p>${o.desc}</p><small>${o.perk}</small><div class="origin-stats">${Object.entries(o.stats).map(([k,v])=>`<span>${k} <b>${v}</b></span>`).join('')}</div>`;
}
function showCreation(){show('title-screen',false);show('creation-screen',true);renderOrigins();}
function setWeather(next){weather=next;$('clock-weather').textContent=weather;$('weather-icon').textContent=weather==='Rain'?'☂':weather==='Storm'?'ϟ':dayTime<6||dayTime>19?'☾':'☀';}
function triggerEvent(){
  eventActive=true;eventTimer=100+random()*100;const events=[['Wild Hunt','The creatures gather beneath a red sky.'],['Aetherfall','Bright fragments descend beyond the ridgeline.'],['Wayfarer’s Market','A traveling merchant is said to be near Aurovale.']];
  const e=events[Math.floor(random()*events.length)];$('eb-title').textContent=e[0];$('eb-sub').textContent=e[1];show('event-banner');clearTimeout(eventBannerTimer);eventBannerTimer=setTimeout(()=>show('event-banner',false),7000);toast('World event',e[0]);log(`${e[0]} stirs across the Reach.`,'world');
  if(e[0]==='Wild Hunt')entities.filter(x=>x.alive&&!x.def.boss).forEach(x=>{x.aggro=true;});
}
function updateEnvironment(dt){
  dayTime+=dt*.035;if(dayTime>=24){dayTime-=24;worldDay++;}
  eventTimer-=dt;if(eventTimer<=0){triggerEvent();}
  if(Math.random()<dt*.0015){const options=['Clear','Clear','Rain','Storm','Mist'];setWeather(options[Math.floor(Math.random()*options.length)]);if(weather==='Storm'){state.deeds.storms++;if(Math.hypot(player.x,player.z)>70)checkProgress();}}
  const phase=(dayTime/24)*Math.PI*2, daylight=clamp((Math.sin(phase-Math.PI/2)+.18)*1.25, .12,1);
  sun.position.set(Math.cos(phase)*130,Math.max(20,Math.sin(phase)*180),60);sun.intensity=.25+daylight*1.9;ambient.intensity=.35+daylight*1.25;
  const sky=new THREE.Color().setHSL(.52,.18,.12+daylight*.42);scene.background=sky;scene.fog.color.copy(sky);
  if(weather==='Rain'||weather==='Storm'){scene.fog.density=.0015;sun.intensity*=weather==='Storm'?.55:.78;}else scene.fog.density=0;
}
function movePlayer(dt){
  const forward=(keys.KeyW||keys.ArrowUp?1:0)-(keys.KeyS||keys.ArrowDown?1:0),side=(keys.KeyD||keys.ArrowRight?1:0)-(keys.KeyA||keys.ArrowLeft?1:0);
  const moving=forward!==0||side!==0;if(moving){const speed=keys.ShiftLeft||keys.ShiftRight?10:6.4;const fx=Math.sin(yaw),fz=Math.cos(yaw),rx=Math.cos(yaw),rz=-Math.sin(yaw);const len=Math.hypot(forward,side)||1;player.x+=(fx*forward+rx*side)/len*speed*dt;player.z+=(fz*forward+rz*side)/len*speed*dt;state.stamina=clamp(state.stamina-(speed>7?18:0)*dt,0,100);player.y=groundHeight(player.x,player.z)+.1;playerMesh.rotation.y=yaw;playerMesh.userData.walk=(playerMesh.userData.walk||0)+dt*10;playerMesh.position.y=player.y+Math.abs(Math.sin(playerMesh.userData.walk))*.06;}
  else{state.stamina=clamp(state.stamina+22*dt,0,100);playerMesh.position.y=player.y;}
  if(jumpVelocity!==0||keys.Space){if(keys.Space&&player.y<=groundHeight(player.x,player.z)+.12)jumpVelocity=7.8;jumpVelocity-=19*dt;player.y+=jumpVelocity*dt;const floor=groundHeight(player.x,player.z)+.1;if(player.y<=floor){player.y=floor;jumpVelocity=0;}}
  if(dodgeTimer>0){dodgeTimer-=dt;$('speedlines').style.opacity=String(Math.min(.6,dodgeTimer*1.5));}else $('speedlines').style.opacity='0';
  playerMesh.position.x=player.x;playerMesh.position.z=player.z;playerMesh.position.y=player.y;
  const moved=lastPlayerPos?distance(player,lastPlayerPos):0;if(moved>0){state.deeds.distance+=moved;lastPlayerPos.copy(player);}
  const desired=new THREE.Vector3(player.x-Math.sin(yaw)*camDistance,player.y+3.1+pitch*5,player.z-Math.cos(yaw)*camDistance);
  camera.position.lerp(desired,1-Math.exp(-7*dt));camera.lookAt(player.x,player.y+1.25,player.z);
}
function updateCreatures(dt){
  for(const e of entities){if(!e.alive)continue;e.attack=Math.max(0,e.attack-dt);const d=distance(player,e);const aggro=e.aggro||d<13;
    if(aggro&&d<38){e.aggro=true;if(d>2.2){const dx=(player.x-e.x)/(d||1),dz=(player.z-e.z)/(d||1);e.x+=dx*dt*(e.def.boss?2.2:3.1);e.z+=dz*dt*(e.def.boss?2.2:3.1);e.group.rotation.y=Math.atan2(dx,dz);}else if(e.attack<=0){e.attack=e.def.boss?1.6:2.1;const armor=ITEMS[state.equipped.armor]?.def||0;const hit=Math.max(2,e.def.damage+Math.floor(e.def.level*.6)-armor);state.hp-=hit;floatText(playerMesh,`-${hit}`,'#f08b83');if(state.hp<=0){state.hp=state.maxHp;state.mp=state.maxMp;player.set(0,groundHeight(0,0)+.1,0);toast('Fallen, not finished','You wake at Aurovale, your carried goods intact.');log('The road brought you back to Aurovale.');}}
    }else{e.roam+=dt*(.24+e.def.level*.01);if(Math.random()<dt*.08){e.x+=Math.cos(e.roam)*dt*1.6;e.z+=Math.sin(e.roam)*dt*1.6;}}
    e.group.position.set(e.x,groundHeight(e.x,e.z),e.z);
  }
  for(const n of npcs){n.roam=(n.roam||0)+dt;if(n.roam>5){n.roam=0;n.x+=(Math.random()-.5)*2;n.z+=(Math.random()-.5)*2;}n.group.position.set(n.x,groundHeight(n.x,n.z)+Math.sin(gameTime*2+n.x)*.025,n.z);}
}
function updateInteraction(){
  let nearest=null,best=5.5;for(const n of npcs){const d=distance(player,n);if(d<best){best=d;nearest=n;}}
  interactTarget=nearest?{type:'npc',data:nearest}:null;
  if(!nearest){for(const l of LANDMARKS){const d=Math.hypot(player.x-l.x,player.z-l.z);if(d<Math.max(4,l.radius*.32)&&d<best){best=d;interactTarget={type:'landmark',data:l};}}}
  const prompt=$('interact-prompt');if(interactTarget){$('interact-text').textContent=interactTarget.type==='npc'?`Speak with ${interactTarget.data.name}`:`Explore ${interactTarget.data.name}`;prompt.classList.remove('hidden');}else prompt.classList.add('hidden');
  let zone=LANDMARKS.find(l=>Math.hypot(player.x-l.x,player.z-l.z)<l.radius);zoneName=zone?.name||'Verdant Reach';
}
function interact(){if(!interactTarget)return;if(interactTarget.type==='npc')showDialogue(interactTarget.data);else{const lm=interactTarget.data;toast(lm.name,lm.type==='village'?'A safe place for weary travelers.':'The old stones hold their silence.');if(lm.type==='ruins'||lm.type==='barrow')state.deeds.dungeons++;}}
function projectLabels(){
  const project=(obj,elNode)=>{const p=obj.group.position.clone();p.y+=obj.role?2.7:obj.def?.boss?3.5:2.3;p.project(camera);if(p.z>1||Math.abs(p.x)>1.15||Math.abs(p.y)>1.15){elNode.style.display='none';return;}elNode.style.display='block';elNode.style.left=`${(p.x*.5+.5)*innerWidth}px`;elNode.style.top=`${(-p.y*.5+.5)*innerHeight}px`;};
  npcs.forEach(n=>project(n,n.label));particles=particles.filter(d=>{d.userData.life-=clock.getDelta?0:0;const u=d.userData;u.life-=Math.min(.04,1/60);if(u.life<=0){d.remove();return false;}const v=u.parent.position.clone();v.y+=2.8;v.project(camera);d.style.left=`${(v.x*.5+.5)*innerWidth}px`;d.style.top=`${(-v.y*.5+.5)*innerHeight}px`;d.style.opacity=String(Math.max(0,u.life));return true;});
}
function updateHotbar(){all('[data-skill]').forEach(slot=>{const index=Number(slot.dataset.skill),id=state.skillList[index],skill=SKILLS[id];slot.querySelector('.slot-icon').textContent=skill?.icon||'·';const cd=slot.querySelector('.slot-cd');if(cd)cd.textContent=state.skillCooldowns[id]>0?Math.ceil(state.skillCooldowns[id]):'';});}
function animate(){if(!started)return;raf=requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.05);gameTime+=dt;attackTimer=Math.max(0,attackTimer-dt);for(const id in state.skillCooldowns)state.skillCooldowns[id]=Math.max(0,state.skillCooldowns[id]-dt);updateEnvironment(dt);movePlayer(dt);updateCreatures(dt);checkSecrets();updateInteraction();projectLabels();
  if(target?.alive){$('tf-hp').style.width=`${100*target.hp/target.maxHp}%`;if(distance(player,target)>55){target=null;show('target-frame',false);}}
  if(gameTime-lastUISync>1){lastUISync=gameTime;refreshUI();updateHotbar();}if(gameTime-lastAutoSave>45){lastAutoSave=gameTime;saveGame();}
  if(playerMesh.userData.attack>0){playerMesh.userData.attack-=dt;playerMesh.rotation.y=yaw+Math.sin(gameTime*25)*.35;}
  renderer.render(scene,camera);
}
function chooseTarget(){if(!entities.some(e=>e.alive))return;const living=entities.filter(e=>e.alive).sort((a,b)=>distance(player,a)-distance(player,b));let i=living.indexOf(target);target=living[(i+1)%living.length];$('tf-name').textContent=target.def.name;$('tf-level').textContent=`Lv. ${target.def.level}`;$('tf-tag').textContent=target.def.boss?'World Boss':target.def.elite?'Elite':target.def.type;$('tf-hp').style.width=`${100*target.hp/target.maxHp}%`;show('target-frame');}
function dodge(){if(state.stamina<22||dodgeTimer>0)return;state.stamina-=22;dodgeTimer=.42;player.x+=Math.sin(yaw)*4;player.z+=Math.cos(yaw)*4;player.y=groundHeight(player.x,player.z)+.1;state.deeds.dodges++;checkProgress();}
function bindUI(){
  $('btn-play').onclick=()=>{const save=readSave();if(save){applySave(save);$('name-input').value=state.name;startJourney(true);}else showCreation();};$('btn-new').onclick=showCreation;
  $('btn-enter').onclick=()=>startJourney(false);$('btn-back-title').onclick=()=>{show('creation-screen',false);show('title-screen',true);};$('seed-random').onclick=()=>{$('seed-input').value=Math.random().toString(36).slice(2,8).toUpperCase();};
  $('origins').addEventListener('click',e=>{const b=e.target.closest('[data-origin]');if(!b)return;state.origin=b.dataset.origin;renderOrigins();});
  $('btn-map-mini').onclick=()=>openPanel('map');all('[data-panel]').forEach(b=>b.onclick=()=>openPanel(b.dataset.panel));all('.close-panel').forEach(b=>b.onclick=()=>{closePanel();closeDialogue();show('shop',false);});
  $('panel-layer').addEventListener('click',e=>{if(e.target===e.currentTarget)closePanel();});$('dialogue').addEventListener('click',e=>{if(e.target===e.currentTarget)closeDialogue();});$('dlg-close').onclick=closeDialogue;$('shop-close').onclick=()=>show('shop',false);
  $('panel-layer').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
    if(b.dataset.item){state.inventorySelection=b.dataset.item;renderInventory();}if(b.dataset.equip)equipItem(b.dataset.equip);if(b.dataset.use){useItem(b.dataset.use);renderInventory();}if(b.dataset.skill){const id=b.dataset.skill;if(state.skillList.includes(id)){state.skillList=state.skillList.filter(x=>x!==id);}else if(state.xp>=80&&state.skillList.length<5){state.xp-=80;state.skillList.push(id);toast('Technique learned',SKILLS[id].name);}else toast('Not ready','You need 80 XP and an open technique slot.');renderSkills();refreshUI();}if(b.dataset.quest!==undefined){state.activeQuest=Number(b.dataset.quest);renderQuests();refreshUI();}if(b.dataset.craft)craft(b.dataset.craft);if(b.hasAttribute('data-open-craft'))openPanel('craft');
  });
  $('shop').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.stab){shopMode=b.dataset.stab;all('[data-stab]').forEach(x=>x.classList.toggle('active',x===b));renderShop();}if(b.dataset.buy){const id=b.dataset.buy,it=ITEMS[id];if(state.gold>=it.value){state.gold-=it.value;setItem(id);renderShop();$('shop-gold').textContent=state.gold;}}if(b.dataset.sell){const id=b.dataset.sell,it=ITEMS[id];if(itemCount(id)){setItem(id,-1);state.gold+=Math.max(1,Math.floor(it.value*.55));renderShop();$('shop-gold').textContent=state.gold;}}});
  $('chat').addEventListener('click',e=>{const b=e.target.closest('[data-ch]');if(!b)return;all('[data-ch]').forEach(x=>x.classList.toggle('active',x===b));all('.chat-line').forEach(line=>line.style.display=b.dataset.ch==='all'||line.classList.contains(b.dataset.ch)?'':'none');});
  $('btn-save').onclick=()=>{saveGame();toast('Journey saved','Your progress is safe in this browser.');};$('btn-title').onclick=()=>{saveGame();started=false;cancelAnimationFrame(raf);closePanel();show('hud',false);show('title-screen',true);};$('btn-wipe').onclick=()=>{if(confirm('Erase the saved journey from this browser?')){localStorage.removeItem(SAVE_KEY);loadedSave=null;$('save-note').textContent='No journey recorded';toast('Save erased');}};
  $('opt-shadows').onchange=e=>renderer.shadowMap.enabled=e.target.checked;$('opt-dist').oninput=e=>{camDistance=Number(e.target.value)+4;};$('opt-sens').oninput=e=>{mouseSensitivity=Number(e.target.value);};
  window.addEventListener('resize',()=>{if(!renderer||!camera)return;camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
  window.addEventListener('keydown',e=>{if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();keys[e.code]=true;if(!started)return;if(e.repeat)return;
    if(e.code==='Escape'){if(activePanel)closePanel();else if(! $('dialogue').classList.contains('hidden'))closeDialogue();else if(!$('shop').classList.contains('hidden'))show('shop',false);else openPanel('settings');}
    if(e.code==='KeyE')interact();if(e.code==='Tab'){e.preventDefault();chooseTarget();}if(e.code==='KeyQ')dodge();if(e.code==='KeyR')useItem('hp_potion');if(e.code==='Space'&&player.y<=groundHeight(player.x,player.z)+.12)jumpVelocity=7.8;
    if(e.code.startsWith('Digit')){const n=Number(e.code.slice(5))-1;if(n>=0&&n<5)castSkill(n);}const panelKeys={KeyC:'character',KeyI:'inventory',KeyK:'skills',KeyJ:'quests',KeyG:'guild',KeyN:'codex',KeyM:'map'};if(panelKeys[e.code])openPanel(panelKeys[e.code]);
  });window.addEventListener('keyup',e=>{keys[e.code]=false;});window.addEventListener('blur',()=>keys={});
  sceneCanvas.addEventListener('click',()=>{if(started&&!activePanel&&$('dialogue').classList.contains('hidden')&&$('shop').classList.contains('hidden'))basicAttack();});
  sceneCanvas.addEventListener('contextmenu',e=>e.preventDefault());sceneCanvas.addEventListener('mousedown',e=>{if(e.button===2)rightDragging=true;});window.addEventListener('mouseup',()=>rightDragging=false);
  window.addEventListener('mousemove',e=>{if(rightDragging&&started){yaw-=e.movementX*.003*mouseSensitivity;pitch=clamp(pitch-e.movementY*.002*mouseSensitivity,-.15,.85);}});
  all('[data-skill]').forEach(b=>b.addEventListener('click',()=>castSkill(Number(b.dataset.skill))));all('[data-action="potion"]').forEach(b=>b.addEventListener('click',()=>useItem('hp_potion')));
}
let mouseSensitivity=1,rightDragging=false;
function init(){
  bindUI();const save=readSave();if(save){$('save-note').textContent=`Journey recorded · ${save.state.name||'Wanderer'} · Level ${save.state.level||1}`;}else $('save-note').textContent='No journey recorded';
  $('loading').classList.add('hidden');show('title-screen',true);showCreationPreview();
}
function showCreationPreview(){state.origin='blade';renderOrigins();}
init();

