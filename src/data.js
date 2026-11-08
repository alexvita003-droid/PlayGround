// ---------------------------------------------------------------------------
// INFINITE WORLD — content definitions
// ---------------------------------------------------------------------------
export const RARITY = {
  common:   { name: 'Common',    color: '#c9c4b8', mult: 1 },
  uncommon: { name: 'Uncommon',  color: '#7fd6a1', mult: 1.25 },
  rare:     { name: 'Rare',      color: '#6fb6ff', mult: 1.7 },
  epic:     { name: 'Epic',      color: '#c08bff', mult: 2.4 },
  legendary:{ name: 'Legendary', color: '#ffb454', mult: 3.6 },
  mythic:   { name: 'Mythic',    color: '#ff6f91', mult: 5.2 },
};

export const ITEMS = {
  rusty_sword:  { name: 'Notched Longsword', type: 'weapon', icon: '🗡', rarity: 'common', atk: 8, value: 12, desc: 'A blade with more stories than edge. It will do.' },
  oak_staff:    { name: 'Oakheart Staff', type: 'weapon', icon: '🪄', rarity: 'common', atk: 7, mag: 7, value: 14, desc: 'The grain still remembers the tree. Magic listens to it.' },
  wolf_fang:    { name: 'Fang Knife', type: 'weapon', icon: '🔪', rarity: 'uncommon', atk: 12, crit: 0.06, value: 42, desc: 'Short, cruel, and quick. Favoured by those who strike first.' },
  iron_blade:   { name: 'Vale Iron Blade', type: 'weapon', icon: '⚔', rarity: 'uncommon', atk: 17, value: 90, desc: 'Forged in Aurovale, dependable as the mountain it came from.' },
  emberfang:    { name: 'Emberfang, the Sunken Oath', type: 'weapon', icon: '🔥', rarity: 'legendary', atk: 38, crit: 0.14, fire: 12, value: 2400, desc: 'A blade quenched in dragonfire and buried by the last knight who refused to kneel. It hums near hidden things.' },
  void_touch:   { name: 'Touch of the Hollow', type: 'weapon', icon: '🜏', rarity: 'epic', atk: 27, mag: 16, value: 980, desc: 'A staff of blackened bone. The stars look away when it is raised.' },
  hunter_bow:   { name: 'Yew Hunter Bow', type: 'weapon', icon: '🏹', rarity: 'uncommon', atk: 14, crit: 0.05, value: 76, desc: 'Silent, patient, unerring.' },
  leather_vest: { name: 'Trailworn Vest', type: 'armor', icon: '🥋', rarity: 'common', def: 4, hp: 15, value: 22, desc: 'Smells of pine smoke and long roads.' },
  iron_mail:    { name: 'Vale Iron Mail', type: 'armor', icon: '🛡', rarity: 'uncommon', def: 11, hp: 35, value: 110, desc: 'Every dent is a debt the world paid you back.' },
  shadow_cloak:{ name: 'Cloak of Quiet Steps', type: 'armor', icon: '🧥', rarity: 'rare', def: 8, hp: 28, crit: 0.05, value: 320, desc: 'Woven from the hush between heartbeats.' },
  rune_ring:    { name: 'Runebound Ring', type: 'trinket', icon: '💍', rarity: 'rare', mag: 10, mp: 20, value: 260, desc: 'A circle of silver etched with a word no living tongue remembers.' },
  hp_potion:    { name: 'Crimson Draught', type: 'consumable', icon: '⚗', rarity: 'common', value: 14, heal: 45, desc: 'Tastes of iron and wild berries. Restores 45 health.' },
  mp_potion:    { name: 'Aether Draught', type: 'consumable', icon: '🧪', rarity: 'common', value: 16, mana: 40, desc: 'Cold on the tongue, warm in the mind. Restores 40 mana.' },
  wolf_pelt:    { name: 'Grey Wolf Pelt', type: 'material', icon: '🐺', rarity: 'common', value: 9, desc: 'Thick, warm, and still faintly growling.' },
  boar_tusk:    { name: 'Boar Tusk', type: 'material', icon: '🦷', rarity: 'common', value: 11, desc: 'Proof of a bad decision made in the brush.' },
  iron_ore:     { name: 'Iron Ore', type: 'material', icon: '⛏', rarity: 'common', value: 8, desc: 'Raw metal, heavy with promise.' },
  moonpetal:    { name: 'Moonpetal', type: 'material', icon: '🌿', rarity: 'uncommon', value: 15, desc: 'A herb that opens only under moonlight. Alchemists pay well.' },
  ember_dust:   { name: 'Ember Dust', type: 'material', icon: '✨', rarity: 'rare', value: 60, desc: 'Ground from a falling star. Still warm after a year.' },
  ancient_sigil:{ name: 'Ancient Sigil', type: 'quest', icon: '⛭', rarity: 'epic', value: 0, desc: 'A key shaped like a question. Somewhere, a lock is listening.' },
  dragon_scale: { name: 'Dragon Scale', type: 'material', icon: '🐉', rarity: 'epic', value: 440, desc: 'It reflects a sky that is not this one.' },
  hollow_crown: { name: 'Crown of the Hollow King', type: 'quest', icon: '👑', rarity: 'mythic', value: 0, desc: 'Cold iron, colder memory. Proof that you walked where kings failed.' },
  sun_shard:    { name: 'Shard of the First Sun', type: 'quest', icon: '☀', rarity: 'legendary', value: 0, desc: 'A fragment of the light that made the world. It is still soft to the touch.' },
  cooked_meat:  { name: 'Campfire Stew', type: 'consumable', icon: '🍲', rarity: 'common', value: 20, heal: 30, stamina: 40, desc: 'Simple food, honestly made. Restores health and stamina.' },
  silver_ring:  { name: 'Silver Band', type: 'trinket', icon: '◌', rarity: 'uncommon', hp: 12, value: 48, desc: 'A wedding band from a drowned village. Nobody came for it.' },
};

export const ORIGINS = {
  blade: {
    name: 'Blade of the Border', glyph: '⚔', weapon: 'rusty_sword', color: 0x8a3b3b,
    desc: 'You grew up on the wrong side of a border that moved twice a year. You know how a hilt feels before you know how a plow does.',
    stats: { STR: 5, AGI: 4, INT: 1, VIT: 4, LUK: 2 }, skills: ['cleave'],
    perk: '+1 melee technique at start',
  },
  arcane: {
    name: 'Runaway Apprentice', glyph: '✧', weapon: 'oak_staff', color: 0x3b5d8a,
    desc: 'The tower taught you the names of things. You left before it taught you the reasons. The names still work.',
    stats: { STR: 1, AGI: 3, INT: 7, VIT: 3, LUK: 2 }, skills: ['spark'],
    perk: 'Begin with Spark and a deeper mana pool',
  },
  shadow: {
    name: 'Nameless Courier', glyph: '☾', weapon: 'wolf_fang', color: 0x3a3a4a,
    desc: 'You moved letters across a warzone for coin. Some letters were orders. You read them all, and delivered none twice.',
    stats: { STR: 2, AGI: 7, INT: 3, VIT: 2, LUK: 4 }, skills: ['shadowstep'],
    perk: 'Begin with Shadowstep and keener criticals',
  },
  hearth: {
    name: 'Hearthwarden', glyph: '❋', weapon: 'rusty_sword', color: 0x6b5a34,
    desc: 'You kept a village fed through three winters. The world is bigger than a hearth, but the same rules apply: shelter, food, and people worth protecting.',
    stats: { STR: 3, AGI: 2, INT: 3, VIT: 6, LUK: 3 }, skills: ['tend'],
    perk: 'Begin with Tend and +20 max health',
  },
};

// skill definitions ---------------------------------------------------------
export const SKILLS = {
  cleave:      { name: 'Cleave', icon: '⚡', cost: 0, cd: 0.9, school: 'blade', desc: 'A wide, committed swing that strikes everything in front of you.', req: null },
  spark:       { name: 'Spark', icon: '✷', cost: 8, cd: 1.4, school: 'arcane', desc: 'A bolt of raw aether. Cheap, fast, and honest.', req: null },
  shadowstep:  { name: 'Shadowstep', icon: '❂', cost: 12, cd: 6, school: 'shadow', desc: 'Blink through the veil, leaving a trail of cold smoke.', req: null },
  tend:        { name: 'Tend', icon: '❁', cost: 14, cd: 8, school: 'life', desc: 'Close a wound with green light. Restores health over a moment.', req: null },
  fireball:    { name: 'Ember Lance', icon: '🔥', cost: 16, cd: 2.2, school: 'arcane', desc: 'A spear of fire that erupts on impact.', req: null },
  whirlwind:   { name: 'Whirlwind', icon: '🌀', cost: 18, cd: 6, school: 'blade', desc: 'Spin with your weapon extended, cutting all who dare stand close.', req: null },
  shadowstrike:{ name: 'Umbral Strike', icon: '🗡', cost: 20, cd: 7, school: 'shadow', desc: 'A strike from behind the world. Deals heavy damage and bleeds.', req: null },
  sanctuary:   { name: 'Sanctuary', icon: '⛨', cost: 24, cd: 14, school: 'life', desc: 'A ring of wardlight that shields you and burns the unholy.', req: null },
  stormcall:   { name: 'Stormcall', icon: '🌩', cost: 30, cd: 11, school: 'arcane', desc: 'Call lightning down on your target. Scales with intellect.', req: null },
  voidrift:    { name: 'Void Rift', icon: '🜏', cost: 38, cd: 16, school: 'void', desc: 'Tear a hole in the world. Enemies near it are pulled and unmade.', req: 'voidwalker' },
};

export const PATHS = {
  blade:      { name: 'Blademaster', glyph: '⚔', color: '#e0a0a0', req: 'Land 120 melee hits', desc: 'The blade is not a tool. It is a conversation, and you have stopped being polite.' },
  arcane:     { name: 'Arcanist', glyph: '✧', color: '#8fb8ff', req: 'Cast 60 spells', desc: 'You have learned that reality is a sentence, and you know where the commas go.' },
  shadow:     { name: 'Shadowblade', glyph: '☾', color: '#a9a0d8', req: 'Perform 40 dodges', desc: 'They see a blur. You see an opening.' },
  life:       { name: 'Warden of the Green', glyph: '❁', color: '#8fe0a8', req: 'Heal 500 total health', desc: 'The wild answers when you call. It has decided you are worth answering.' },
  craft:      { name: 'Grand Artisan', glyph: '⚒', color: '#e6c07a', req: 'Craft 12 items', desc: 'Your hands remember what your mind forgets. The guilds whisper your mark.' },
  beast:      { name: 'Beastheart', glyph: '🐾', color: '#c0d88a', req: 'Tame 2 creatures', desc: 'Fangs lowered, heads bowed. You are followed by the forest itself.' },
  voidwalker: { name: 'Voidwalker', glyph: '🜏', color: '#c08bff', secret: true, req: '??? — the stones whisper at night, in rain', desc: 'You stepped outside the story. The world has not forgiven you, but it also cannot forget.' },
};

export const MONSTERS = {
  wolf:      { name: 'Grey Wolf', type: 'beast', hp: 42, dmg: 7, xp: 22, speed: 4.2, sight: 20, model: 'wolf', loot: ['wolf_pelt'], gold: [2,8], level: 2 },
  boar:      { name: 'Tusk Boar', type: 'beast', hp: 70, dmg: 10, xp: 30, speed: 3.2, sight: 16, model: 'boar', loot: ['boar_tusk'], gold: [2,9], level: 3 },
  goblin:    { name: 'Cinder Goblin', type: 'humanoid', hp: 58, dmg: 9, xp: 34, speed: 3.6, sight: 22, model: 'goblin', loot: ['iron_ore', 'hp_potion'], gold: [5,16], level: 3 },
  skeleton:  { name: 'Hollow Sentinel', type: 'undead', hp: 88, dmg: 13, xp: 52, speed: 2.8, sight: 24, model: 'skeleton', loot: ['iron_ore', 'ancient_sigil'], gold: [8,22], level: 5 },
  treant:    { name: 'Mossbound Ancient', type: 'plant', hp: 180, dmg: 17, xp: 95, speed: 2.1, sight: 18, model: 'treant', loot: ['moonpetal'], gold: [12,30], level: 8, elite: true },
  golem:     { name: 'Runestone Golem', type: 'construct', hp: 260, dmg: 22, xp: 140, speed: 2.4, sight: 22, model: 'golem', loot: ['iron_ore', 'ember_dust'], gold: [18,40], level: 10, elite: true },
  drake:     { name: 'Ember Drake', type: 'dragon', hp: 520, dmg: 28, xp: 420, speed: 5.6, sight: 30, model: 'drake', loot: ['dragon_scale', 'ember_dust'], gold: [60,120], level: 14, elite: true },
  hollowking:{ name: 'The Hollow King', type: 'undead', hp: 1500, dmg: 34, xp: 1600, speed: 3.0, sight: 40, model: 'hollowking', loot: ['hollow_crown'], gold: [260,400], level: 18, boss: true },
  bear:      { name: 'Old Cave Bear', type: 'beast', hp: 150, dmg: 16, xp: 80, speed: 3.4, sight: 18, model: 'bear', loot: ['wolf_pelt', 'cooked_meat'], gold: [8,20], level: 7, elite: true },
};

export const RECIPES = {
  iron_blade:   { name: 'Vale Iron Blade', out: 'iron_blade', need: { iron_ore: 3, wolf_pelt: 1 }, gold: 12, prof: 'smithing', reqLvl: 1 },
  leather_vest: { name: 'Trailworn Vest', out: 'leather_vest', need: { wolf_pelt: 2 }, gold: 5, prof: 'tailoring', reqLvl: 1 },
  hp_potion:    { name: 'Crimson Draught', out: 'hp_potion', need: { moonpetal: 1 }, gold: 4, prof: 'alchemy', reqLvl: 1 },
  mp_potion:    { name: 'Aether Draught', out: 'mp_potion', need: { moonpetal: 1, ember_dust: 1 }, gold: 10, prof: 'alchemy', reqLvl: 3 },
  cooked_meat:  { name: 'Campfire Stew', out: 'cooked_meat', need: { boar_tusk: 1, moonpetal: 1 }, gold: 3, prof: 'cooking', reqLvl: 1 },
  rune_ring:    { name: 'Runebound Ring', out: 'rune_ring', need: { iron_ore: 2, ember_dust: 2, ancient_sigil: 1 }, gold: 80, prof: 'smithing', reqLvl: 6 },
};

export const SECRETS = {
  stones: {
    name: 'The Whispering Stones', glyph: '◉', hint: 'Nine stones in a ring, north of the vale. They only speak when the sky weeps at night.',
    text: 'The stones remembered a word older than the world. You spoke it, and the world opened like a door.',
    reward: 'Secret path: VOIDWALKER', region: 'Whispering Woods',
  },
  oath: {
    name: 'The Sunken Oath', glyph: '🔥', hint: 'A knight buried his oath rather than break it. Seek the pale shore where the river dies, and dig where three stones keep watch.',
    text: 'Your fingers closed around a hilt still warm from a fire that died four hundred years ago. The blade knows your name.',
    reward: 'Legendary weapon: Emberfang', region: 'Ashen Shore',
  },
  hollow: {
    name: 'Hollow of the Forgotten', glyph: '🜏', hint: 'The hill east of the vale has a mouth when the mist is low. The villagers do not speak of it.',
    text: 'A stair of wet stone descended into a dark that had been waiting a very long time. Somewhere below, a crown turned on its throne.',
    reward: 'Secret dungeon: Crypt of the Hollow King', region: 'Barrow Hill',
  },
  firstsun: {
    name: 'Shard of the First Sun', glyph: '☀', hint: 'On the highest white peak, where the air forgets to breathe, something fallen still burns.',
    text: 'The shard did not glow. It simply made everything around it remember what light was.',
    reward: 'Relic: Shard of the First Sun', region: 'Crown of the World',
  },
  nameless: {
    name: 'The Nameless Table', glyph: '⚑', hint: 'Speak kindly to the keeper of the Aurovale inn. Buy a drink. Listen. Be patient.',
    text: 'The innkeeper lifted the bar, and behind it was a door that had no business existing. Inside, five adventurers raised their cups without a word.',
    reward: 'Guild charter: The Nameless', region: 'Aurovale',
  },
};

export const TITLES = {
  firstblood: { name: 'Firstblood', desc: 'Slay your first creature.', check: (s) => s.deeds.kills >= 1 },
  wanderer:   { name: 'Wanderer', desc: 'Walk 5,000 meters.', check: (s) => s.deeds.distance >= 5000 },
  worldwalker:{ name: 'Worldwalker', desc: 'Walk 25,000 meters.', check: (s) => s.deeds.distance >= 25000 },
  beastfriend:{ name: 'Beastfriend', desc: 'Tame a creature.', check: (s) => s.deeds.tames >= 1 },
  stormchaser:{ name: 'Stormchaser', desc: 'Survive a storm in the wild.', check: (s) => s.deeds.storms >= 1 },
  delve:      { name: 'Delver', desc: 'Enter a secret dungeon.', check: (s) => s.deeds.dungeons >= 1 },
  kingslayer: { name: 'Kingslayer', desc: 'Defeat the Hollow King.', check: (s) => s.deeds.bossKills >= 1 },
  artisan:    { name: 'Maker', desc: 'Craft 12 items.', check: (s) => s.deeds.crafts >= 12 },
  voidtouched:{ name: 'Voidtouched', desc: 'Uncover the Whispering Stones.', check: (s) => s.secretsFound.includes('stones') },
  sunbearer:  { name: 'Sunbearer', desc: 'Recover the First Sun.', check: (s) => s.secretsFound.includes('firstsun') },
};

export const FACTIONS = {
  vale:    { name: 'Kingdom of the Vale', color: '#8fd0a0' },
  ember:   { name: 'Emberhold Imperium', color: '#e09070' },
  marches: { name: 'The Free Marches', color: '#8fb8e0' },
};

export const LANDMARKS = [
  { id: 'aurovale', name: 'Aurovale', type: 'village', x: 26, z: -52, radius: 46, faction: 'vale' },
  { id: 'emberhold', name: 'Emberhold', type: 'castle', x: 330, z: 240, radius: 58, faction: 'ember' },
  { id: 'ruins', name: 'Sunken Ruins', type: 'ruins', x: -210, z: 150, radius: 30, faction: null },
  { id: 'camp', name: 'Free Company Camp', type: 'camp', x: 190, z: -210, radius: 24, faction: 'marches' },
  { id: 'barrow', name: 'Barrow Hill', type: 'barrow', x: 240, z: 60, radius: 26, faction: null },
  { id: 'stones', name: 'Whispering Stones', type: 'stones', x: -140, z: -230, radius: 20, faction: null },
  { id: 'shore', name: 'Ashen Shore', type: 'shore', x: -340, z: -60, radius: 34, faction: null },
  { id: 'peak', name: 'Crown of the World', type: 'peak', x: -380, z: 330, radius: 40, faction: null },
];

export const CHAT_NAMES = ['Sylvaine', 'Kaelthar', 'Oddjob', 'Merrow', 'Bramble', 'Vex', 'Iolanthe', 'Grimm', 'Nyx', 'Tallow', 'Rook', 'Sable', 'Pip', 'Isolde', 'Harrow'];
export const CHAT_LINES = [
  'anyone seen a silver stag near the north ridge?',
  'WTB moonpetal x10, paying 30g each',
  'the stones north of the vale are humming again...',
  'lfg crypt run, need a healer',
  'found a chest behind the waterfall at the old ruins',
  'guild war starts at dusk. Free Company, you are warned.',
  'does anyone else hear singing in the barrow?',
  'sold my first legendary today. hands still shaking.',
  'there is a door in the inn that was not there yesterday',
  'careful at the shore. the tide brought something in.',
];
