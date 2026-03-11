'use strict';

// ================================================================
//  CRAZY-ASS ZOOLOGISTS: NFT Zoo Tycoon  — v2
//  Pure Canvas · No external deps · Runs from index.html
//
//  World:  40 × 30 tiles  @  32 px  =  1280 × 960 px
//  Viewport: dynamic (fills browser window minus sidebar + topbar)
//  Camera:   scrolls through world via WASD / arrow keys / drag
// ================================================================

// ── Constants ────────────────────────────────────────────────────
const TILE_SIZE  = 32;
const GRID_W     = 40;
const GRID_H     = 30;
const WORLD_W    = GRID_W * TILE_SIZE; // 1280
const WORLD_H    = GRID_H * TILE_SIZE; //  960

// Tile type IDs
const TILE = {
  GRASS: 0, FENCE: 1, PATH: 2, WATER: 3, ENTRANCE: 4,
  RESTAURANT: 5, ICE_CREAM: 6, GIFT_SHOP: 7, SNACK_STAND: 8,
  // Landscaping (beauty tiles)
  GRASS_FLOWER: 9, GRASS_TREE: 10,
  // Large multi-tile buildings (all share one tile type; building data in gs.largeBuildings)
  LARGE_BLDG: 11,
};

// Building income bonuses (per visitor tick, per nearby tile)
const BUILDING_APPEAL = {
  [TILE.RESTAURANT]:  10,
  [TILE.ICE_CREAM]:    6,
  [TILE.GIFT_SHOP]:    7,
  [TILE.SNACK_STAND]:  3,
  [TILE.LARGE_BLDG]:  14, // glass house / aquarium / reptile house
  [TILE.GRASS_FLOWER]: 1,
  [TILE.GRASS_TREE]:   2,
};

// ── Animal definitions ───────────────────────────────────────────
const ANIMAL_DEFS = {
  // ── NFT Originals ──────────────────────────────────────────────
  donkey: {
    name: 'Donkey',      emoji: '🫏', cost: 50,  speed: 0.5, appeal: 5,  color: '#9E9E9E', radius: 10,
    memeLines: ['HODL forever', 'wen moon ser?', 'ngmi 😭', 'to the moon 🚀', 'ser pls'],
  },
  mega_donkey: {
    name: 'Mega Donkey', emoji: '🐴', cost: 200, speed: 0.3, appeal: 20, color: '#5D4037', radius: 18,
    memeLines: ['IYKYK', 'WAGMI bro', 'floor is lava 🔥', 'NGMI if u miss', 'YOLO 100x'],
  },
  cheetah: {
    name: 'Cheetah',     emoji: '🐆', cost: 150, speed: 3.0, appeal: 15, color: '#FFA726', radius: 9,
    memeLines: ['GER 💨', 'SPEEEEED', 'LFG LFG LFG', 'zoom zoom', 'wen lambo'],
  },
  puffin: {
    name: 'Puffin',      emoji: '🐧', cost: 80,  speed: 0.6, appeal: 12, color: '#37474F', radius: 9,
    memeLines: ['diamond flippers 💎', 'vibes only ✨', 'wagmi puffin', 'brrr 🥶', 'rare drop'],
  },

  // ── Exotic Roster ──────────────────────────────────────────────
  lion: {
    name: 'Lion',        emoji: '🦁', cost: 250, speed: 0.8, appeal: 25, color: '#D4A017', radius: 13,
    memeLines: ['king of degens', 'ROAR to the moon', 'NGMI prey 🍖', 'alpha ser'],
  },
  tiger: {
    name: 'Tiger',       emoji: '🐯', cost: 300, speed: 1.2, appeal: 28, color: '#E55B00', radius: 13,
    memeLines: ['tiger blood 🩸', 'GRR ser', 'winning always', 'stripes = gains'],
  },
  elephant: {
    name: 'Elephant',    emoji: '🐘', cost: 400, speed: 0.2, appeal: 30, color: '#78909C', radius: 20,
    memeLines: ['never forget (to buy)', 'TRUNK full of ETH', 'big brain only', 'long memory = long term'],
  },
  giraffe: {
    name: 'Giraffe',     emoji: '🦒', cost: 200, speed: 0.4, appeal: 20, color: '#F5A623', radius: 12,
    memeLines: ['high conviction 📈', 'long neck = long term', 'up only ☝️', 'see further than u'],
  },
  zebra: {
    name: 'Zebra',       emoji: '🦓', cost: 150, speed: 1.0, appeal: 15, color: '#424242', radius: 11,
    memeLines: ['black & white thinking', 'NGMI or WAGMI', 'stripe gang 🦓', 'no grey areas'],
  },
  monkey: {
    name: 'Monkey',      emoji: '🐒', cost: 120, speed: 1.5, appeal: 12, color: '#8D6E63', radius: 10,
    memeLines: ['aping in 🐒', 'send it ser', 'monkey see monkey buy', 'banana bags'],
  },
  panda: {
    name: 'Panda',       emoji: '🐼', cost: 350, speed: 0.3, appeal: 35, color: '#ECEFF1', radius: 14,
    memeLines: ['rare trait 🐼', 'bamboo portfolio', 'vibing in B&W', '1/1 ser'],
  },
  penguin: {
    name: 'Penguin',     emoji: '🐧', cost: 100, speed: 0.7, appeal: 10, color: '#263238', radius: 10,
    memeLines: ['waddle to wealth', 'fren 🐧', 'chill ser', 'cold wallets only'],
  },
  crocodile: {
    name: 'Croc',        emoji: '🐊', cost: 250, speed: 0.6, appeal: 22, color: '#388E3C', radius: 12,
    memeLines: ['snappin deals 🐊', 'see you later alligator', 'CROC to the top', 'in a while defi'],
  },
  flamingo: {
    name: 'Flamingo',    emoji: '🦩', cost: 175, speed: 0.9, appeal: 18, color: '#F06292', radius: 10,
    memeLines: ['standing on one leg = conviction', 'pink gang 💖', 'pretty fly for a bird', 'aesthetic portfolio'],
  },

  // ── Glass House residents ───────────────────────────────────────
  butterfly: {
    name: 'Butterfly',   emoji: '🦋', cost: 60,  speed: 1.4, appeal: 8,  color: '#CE93D8', radius: 8,
    memeLines: ['flutter to the moon', 'pretty wings = pretty gains', 'metamorphosis ser'],
  },
  spider: {
    name: 'Spider',      emoji: '🕷',  cost: 40,  speed: 0.9, appeal: 6,  color: '#6A1B9A', radius: 7,
    memeLines: ['web3 🕸', 'caught in the web of gains', 'NGMI flies'],
  },
  snake: {
    name: 'Snake',       emoji: '🐍', cost: 80,  speed: 0.7, appeal: 10, color: '#33691E', radius: 8,
    memeLines: ['slither to profits', 'ssssser', 'cold blooded alpha'],
  },

  // ── Aquarium residents ──────────────────────────────────────────
  fish: {
    name: 'Fish',        emoji: '🐟', cost: 50,  speed: 1.6, appeal: 7,  color: '#1976D2', radius: 7,
    memeLines: ['school of gains', 'swimming in alpha', 'just keep buying'],
  },
  dolphin: {
    name: 'Dolphin',     emoji: '🐬', cost: 300, speed: 2.0, appeal: 30, color: '#0288D1', radius: 14,
    memeLines: ['sonar on the chart', 'WAGMI dolphins', 'click click moon'],
  },
  shark: {
    name: 'Shark',       emoji: '🦈', cost: 400, speed: 1.8, appeal: 35, color: '#455A64', radius: 15,
    memeLines: ['market maker 🦈', 'feeding frenzy', 'ser I am the liquidity'],
  },
};

const ANIMAL_KEYS = new Set(Object.keys(ANIMAL_DEFS));

// Building key → tile type (single-tile shops)
const BUILDING_TILE = {
  restaurant:  TILE.RESTAURANT,
  ice_cream:   TILE.ICE_CREAM,
  gift_shop:   TILE.GIFT_SHOP,
  snack_stand: TILE.SNACK_STAND,
};
const BUILDING_KEYS = new Set(Object.keys(BUILDING_TILE));

// Large multi-tile building definitions
const LARGE_BLDG_DEFS = {
  glass_house:   { name: 'Glass House',    emoji: '🏛', cost: 500, w: 3, h: 2, color: '#90CAF9', accentColor: '#42A5F5', minLevel: 2 },
  aquarium:      { name: 'Aquarium',       emoji: '🐠', cost: 800, w: 4, h: 3, color: '#1565C0', accentColor: '#1E88E5', minLevel: 3 },
  reptile_house: { name: 'Reptile House',  emoji: '🦎', cost: 600, w: 3, h: 2, color: '#2E7D32', accentColor: '#43A047', minLevel: 2 },
};
const LARGE_BLDG_KEYS = new Set(Object.keys(LARGE_BLDG_DEFS));

// Tool tile types (for grid painting — includes landscaping)
const TOOL_TILE = {
  fence: TILE.FENCE, path: TILE.PATH, water: TILE.WATER,
  grass_flower: TILE.GRASS_FLOWER, grass_tree: TILE.GRASS_TREE,
};

// All costs in one place
const TOOL_COST = {
  fence: 10, path: 5, water: 15,
  grass_flower: 8, grass_tree: 20,
  restaurant: 300, ice_cream: 150, gift_shop: 200, snack_stand: 100,
  glass_house: 500, aquarium: 800, reptile_house: 600,
  donkey: 50, mega_donkey: 200, cheetah: 150, puffin: 80,
  lion: 250, tiger: 300, elephant: 400, giraffe: 200, zebra: 150,
  monkey: 120, panda: 350, penguin: 100, crocodile: 250, flamingo: 175,
  butterfly: 60, spider: 40, snake: 80, fish: 50, dolphin: 300, shark: 400,
};

// Tool hints shown in sidebar
const TOOL_HINTS = {
  fence:      'Drag to paint fence tiles ($10 each). Enclose an area to cage animals!',
  path:       'Drag to paint path tiles ($5 each). Visitors walk on paths.',
  water:      'Click to place water ($15). Penguins & Puffins love it!',
  restaurant: 'Place a Restaurant on grass ($300). Boosts visitor income nearby.',
  ice_cream:  'Place Ice Cream shop on grass ($150). Visitors spend more!',
  gift_shop:  'Place a Gift Shop on grass ($200). Increases souvenir income.',
  snack_stand:'Place Snack Stand on grass ($100). Small but affordable income boost.',
  donkey:     'Place Donkey inside a fenced cage ($50). Wanderer. Meme lord.',
  mega_donkey:'Place Mega Donkey in cage ($200). Slow but MASSIVE appeal.',
  cheetah:    'Place Cheetah in cage ($150). Blazingly fast. Visitors love the speed.',
  puffin:     'Place Puffin near water ($80). Chill vibes. Good family appeal.',
  lion:       'Place Lion in cage ($250). King of the zoo. High appeal.',
  tiger:      'Place Tiger in cage ($300). Powerful & fast. Top earner.',
  elephant:   'Place Elephant in cage ($400). Huge appeal, slow mover. Worth it.',
  giraffe:    'Place Giraffe in cage ($200). Tall, graceful, popular.',
  zebra:      'Place Zebra in cage ($150). Stripy and chaotic.',
  monkey:     'Place Monkey in cage ($120). Hyperactive. Kids love monkeys.',
  panda:      'Place Panda in cage ($350). Rarest appeal. Almost 1-of-1.',
  penguin:    'Place Penguin near water ($100). Adorable. Budget pick.',
  crocodile:  'Place Croc in cage ($250). Scary = exciting = income.',
  flamingo:   'Place Flamingo ($175). Pink tax in effect. High aesthetic.',
  // Landscaping
  grass_flower:'Paint flower tiles ($8). Beautifies the zoo, boosts visitor happiness.',
  grass_tree:  'Paint tree tiles ($20). Trees give 2× beauty and shade for visitors.',
  // Large buildings
  glass_house:  'Place Glass House (3×2, $500). Houses butterflies, spiders & snakes.',
  aquarium:     'Place Aquarium (4×3, $800). Houses fish, dolphins & sharks.',
  reptile_house:'Place Reptile House (3×2, $600). Houses crocs, snakes & lizards.',
  // Aquarium/glass house animals
  butterfly:   'Place Butterfly in Glass House ($60). Delicate, fluttery, beloved.',
  spider:      'Place Spider in Glass House ($40). Creepy = profitable.',
  snake:       'Place Snake in Glass House or Reptile House ($80). ssssale.',
  fish:        'Place Fish in Aquarium ($50). Schools of profit.',
  dolphin:     'Place Dolphin in Aquarium ($300). Stars of the show.',
  shark:       'Place Shark in Aquarium ($400). Absolute unit. Max appeal.',
};

// ── Level progression ────────────────────────────────────────────
// xpToNext: XP needed to reach this level FROM the previous one
const LEVEL_DEFS = [
  { level: 1, xpToNext: 80,  unlockedCols: 20, label: 'Zoo Apprentice',   unlocks: '' },
  { level: 2, xpToNext: 200, unlockedCols: 25, label: 'Junior Keeper',    unlocks: 'Glass House & Reptile House unlocked!' },
  { level: 3, xpToNext: 450, unlockedCols: 30, label: 'Zoo Manager',      unlocks: 'Aquarium unlocked! Map expanded!' },
  { level: 4, xpToNext: 900, unlockedCols: 35, label: 'Zoo Director',     unlocks: 'All exotics & mega animals unlocked! Map expanded!' },
  { level: 5, xpToNext: 99999, unlockedCols: 40, label: 'Legendary Zoologist', unlocks: 'Full map unlocked! You win!' },
];

// ── Random events pool ───────────────────────────────────────────
const RANDOM_EVENTS = [
  {
    title: '🫏 DONKEY ESCAPE!',
    body: 'A Donkey said "ser I quit" and bolted!\nChaos mode: ACTIVATED.',
    color: '#c0392b',
    effect(gs) {
      const targets = gs.animals.filter(a => a.type === 'donkey' && !a.escaped);
      if (targets.length) {
        const d = targets[Math.floor(Math.random() * targets.length)];
        d.escaped = true;
        d.tx = Math.random() * WORLD_W;
        d.ty = Math.random() * WORLD_H;
      }
    },
  },
  {
    title: '🐧 PUFFIN PARTY! 🎉',
    body: 'Puffins went viral on TikTok!\n+10 Visitors flood the zoo!',
    color: '#2980b9',
    effect(gs) { for (let i = 0; i < 10; i++) spawnVisitor(); },
  },
  {
    title: '🐴 MEGA DONKEY RAMPAGE!',
    body: 'The Mega Donkey saw its portfolio go 100x!\nRAMPAGING for 10 seconds!',
    color: '#8e44ad',
    effect(gs) {
      const mega = gs.animals.find(a => a.type === 'mega_donkey');
      if (mega) { mega.rampageTimer = 10_000; mega.speed = ANIMAL_DEFS.mega_donkey.speed * 10; mega.escaped = true; }
    },
  },
  {
    title: '📉 NFT MARKET CRASH!',
    body: 'Rug pulled! The floor collapsed!\nLose $75. NGMI.',
    color: '#c0392b',
    effect(gs) { gs.money = Math.max(0, gs.money - 75); },
  },
  {
    title: '🚀 MOON PUMP!',
    body: 'Zoo NFTs are mooning!\nInstant +$150 airdrop!',
    color: '#27ae60',
    effect(gs) { gs.money += 150; },
  },
  {
    title: '🎠 SCHOOL TRIP!',
    body: 'A bus of excited kids arrived!\n+15 Visitors!',
    color: '#e67e22',
    effect(gs) { for (let i = 0; i < 15; i++) spawnVisitor(); },
  },
  {
    title: '💎 DIAMOND HANDS DAY!',
    body: 'Every visitor tips double!\n+$200 instant bonus!',
    color: '#16a085',
    effect(gs) { gs.money += 200; },
  },
  {
    title: '🦁 LION ROAR EVENT!',
    body: 'Lion roared so hard visitors came running!\n+8 Visitors!',
    color: '#D4A017',
    effect(gs) {
      if (gs.animals.find(a => a.type === 'lion')) {
        for (let i = 0; i < 8; i++) spawnVisitor();
      } else {
        gs.money += 50;
      }
    },
  },
  {
    title: '🐘 ELEPHANT STAMPEDE!',
    body: 'Elephant got excited and broke a fence!\nBut everyone loved it. +$120!',
    color: '#607D8B',
    effect(gs) { gs.money += 120; },
  },
  {
    title: '🐼 PANDA GOES VIRAL!',
    body: 'Panda posted its first NFT.\nInstant celeb. +$300!',
    color: '#9b59b6',
    effect(gs) { gs.money += 300; },
  },
];

// ================================================================
//  APP STATE MACHINE
//  'menu' | 'playing' | 'paused'
// ================================================================
let appState = 'menu';

// ================================================================
//  GAME STATE
// ================================================================
function createGameState() {
  return {
    money: 500,
    totalEarned: 0,
    runId: crypto.randomUUID(), // unique ID per game session — used by leaderboard
    buildingCount: 0,
    selectedTool: null,
    grid: [],
    animals: [],
    visitors: [],
    floatingTexts: [],
    largeBuildings: [], // { type, gx, gy, w, h } for multi-tile buildings

    // Undo system: each entry is { type, data } describing how to reverse the action
    actionHistory: [],

    // Level / XP system
    level: 1,
    xp: 0,
    xpToNext: LEVEL_DEFS[0].xpToNext,
    beauty: 0,             // computed each second from landscaping tiles

    // Zone: tiles with x >= unlockedCols are locked/dim
    unlockedCols: LEVEL_DEFS[0].unlockedCols,

    // Timers (ms)
    visitorSpawnTimer: 4000,
    randomEventTimer: 30_000,
    eventDisplayTimer: 0,
    incomeRateTimer: 1000,
    incomeThisSec: 0,
    incomeRate: 0,
    beautyTimer: 3000, // recompute beauty every 3s

    // Mouse
    mouseGX: -1,
    mouseGY: -1,
    isDragging: false,
    isPanDragging: false,
    panStartX: 0,
    panStartY: 0,
    panCamStartX: 0,
    panCamStartY: 0,
  };
}

let gs = createGameState();

// ── Camera ───────────────────────────────────────────────────────
const camera = { x: 0, y: 0, angle: 0 };
const CAM_SPEED  = 320;          // pixels per second
const CAM_ROT_SPEED = Math.PI;   // radians per second (180°/s)

// Keys held down
const keysDown = new Set();

// ================================================================
//  SOUND MANAGER  (Web Audio API — no external files needed)
//  All sounds are procedurally generated oscillators.
// ================================================================
const SFX = (() => {
  let actx = null;
  let masterGain = null;
  let musicGain = null;
  let sfxEnabled  = true;
  let musicEnabled = true;
  let musicTimer   = null;
  let noteIdx      = 0;

  // Happy-zoo melody: two-bar loop in C major pentatonic
  const MELODY = [
    261,329,392,523,  440,392,329,261,   // bar 1: C E G C — A G E C
    293,369,440,587,  523,440,329,261,   // bar 2: D F# A D — C A E C
  ];
  const NOTE_DUR = 0.38; // seconds per note

  function getCtx() {
    if (!actx) {
      actx = new (window.AudioContext || window.webkitAudioContext)();
      masterGain = actx.createGain();
      masterGain.gain.value = 1;
      masterGain.connect(actx.destination);
      musicGain = actx.createGain();
      musicGain.gain.value = 0.22;
      musicGain.connect(masterGain);
    }
    if (actx.state === 'suspended') actx.resume();
    return actx;
  }

  // Low-level tone generator
  function tone(freq, dur, type = 'sine', vol = 0.28, dest = null) {
    if (!sfxEnabled) return;
    try {
      const ctx  = getCtx();
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(dest || masterGain);
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(vol, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + dur + 0.01);
    } catch (_) {}
  }

  // Public sound effects
  function click()   { tone(880, 0.04, 'square', 0.15); }

  function place() {
    tone(520, 0.06, 'sine',   0.22);
    setTimeout(() => tone(740, 0.06, 'sine', 0.14), 55);
  }

  function buildingPlace() {
    [440, 554, 659].forEach((f, i) => setTimeout(() => tone(f, 0.1, 'triangle', 0.2), i * 70));
  }

  function money() {
    tone(1047, 0.05, 'sine', 0.12);
    setTimeout(() => tone(1319, 0.05, 'sine', 0.12), 50);
  }

  function fanfare() {
    [[261,0],[329,120],[392,240],[523,360],[659,500],[784,640],[1047,820]].forEach(([f,d]) =>
      setTimeout(() => tone(f, 0.25, 'triangle', 0.3), d)
    );
  }

  function pauseSound()  { tone(300, 0.18, 'sine', 0.2); }
  function resumeSound() {
    tone(440, 0.1, 'sine', 0.2);
    setTimeout(() => tone(660, 0.15, 'sine', 0.2), 80);
  }

  function eventSound(positive = true) {
    if (positive) { tone(523, 0.08, 'sine', 0.18); setTimeout(() => tone(659, 0.12, 'sine', 0.18), 70); }
    else          { tone(220, 0.15, 'sawtooth', 0.14); setTimeout(() => tone(165, 0.2, 'sawtooth', 0.12), 120); }
  }

  function animalSound(type) {
    const freqMap = {
      donkey:10, mega_donkey:80, cheetah:600, puffin:900,
      lion:120, tiger:140, elephant:70, giraffe:350,
      zebra:400, monkey:700, panda:500, penguin:850, crocodile:90, flamingo:780,
    };
    const f = freqMap[type] || 440;
    tone(f, 0.12, type === 'elephant' || type === 'lion' || type === 'tiger' ? 'sawtooth' : 'sine', 0.18);
  }

  // Background music — simple melody looper
  function playNextNote() {
    if (!musicEnabled) return;
    try {
      const ctx  = getCtx();
      const freq = MELODY[noteIdx % MELODY.length];
      noteIdx++;

      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(musicGain);
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.5, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + NOTE_DUR * 0.9);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + NOTE_DUR);
    } catch (_) {}
    musicTimer = setTimeout(playNextNote, NOTE_DUR * 1000);
  }

  function startMusic() {
    if (!musicEnabled || musicTimer) return;
    playNextNote();
  }

  function stopMusic() {
    clearTimeout(musicTimer);
    musicTimer = null;
  }

  function toggleMusic() {
    musicEnabled = !musicEnabled;
    const btn = document.getElementById('btn-sound-music');
    if (musicEnabled) { if (btn) btn.textContent = '🎵'; startMusic(); }
    else              { if (btn) btn.textContent = '🔇'; stopMusic(); }
    return musicEnabled;
  }

  function toggleSFX() {
    sfxEnabled = !sfxEnabled;
    const btn = document.getElementById('btn-sound-sfx');
    if (btn) btn.textContent = sfxEnabled ? '🔊' : '🔈';
    return sfxEnabled;
  }

  return { click, place, buildingPlace, money, fanfare, pauseSound, resumeSound, eventSound, animalSound, startMusic, stopMusic, toggleMusic, toggleSFX };
})();

// ── Expose toggles to HTML buttons ──────────────────────────────
function toggleSFX()   { SFX.toggleSFX(); }
function toggleMusic() { SFX.toggleMusic(); }

// ================================================================
//  CANVAS + MINIMAP SETUP
// ================================================================
const canvas      = document.getElementById('gameCanvas');
const ctx         = canvas.getContext('2d');
const mmCanvas    = document.getElementById('minimapCanvas');
const mmCtx       = mmCanvas.getContext('2d');

const MM_SCALE    = 3; // each world tile → 3×3 minimap pixels (but we'll use 2px for 40×30)
const MM_W        = GRID_W * 2; // 80px
const MM_H        = GRID_H * 2; // 60px
mmCanvas.width    = MM_W;
mmCanvas.height   = MM_H;

function resizeCanvas() {
  const wrap = document.getElementById('canvas-wrap');
  canvas.width  = wrap.clientWidth  || 800;
  canvas.height = wrap.clientHeight || 600;
  clampCamera();
}

function clampCamera() {
  camera.x = Math.max(0, Math.min(WORLD_W - canvas.width,  camera.x));
  camera.y = Math.max(0, Math.min(WORLD_H - canvas.height, camera.y));
}

// Camera nudge (used by arrow buttons)
function nudgeCamera(dx, dy) {
  camera.x += dx * TILE_SIZE * 3;
  camera.y += dy * TILE_SIZE * 3;
  clampCamera();
}

function centerCamera() {
  camera.x = WORLD_W / 2 - canvas.width  / 2;
  camera.y = WORLD_H / 2 - canvas.height / 2;
  clampCamera();
}

// ================================================================
//  GRID INITIALISATION  (40 × 30)
// ================================================================
function initGrid() {
  gs.grid = [];
  for (let y = 0; y < GRID_H; y++) {
    gs.grid[y] = new Array(GRID_W).fill(TILE.GRASS);
  }
  // Zoo starts empty — just the entrance tile at left edge, row 15
  gs.grid[15][0] = TILE.ENTRANCE;
}

// ── Animal factory helper ────────────────────────────────────────
function makeAnimal(type, gx, gy) {
  const def = ANIMAL_DEFS[type];
  const px  = gx * TILE_SIZE + TILE_SIZE / 2;
  const py  = gy * TILE_SIZE + TILE_SIZE / 2;
  return {
    id: Math.random(), type, def,
    x: px, y: py, tx: px, ty: py,
    speed: def.speed,
    escaped: false,
    rampageTimer: 0,
    wanderTimer: 0,
    memeTimer: 0,
    memeShowTimer: 0,
    currentMeme: '',
    homeX: px, homeY: py,
  };
}

// ================================================================
//  APP STATE FUNCTIONS
// ================================================================

function startGame() {
  // First-time or restart from menu
  gs = createGameState();
  initGrid();

  // Start with camera centred on the entrance (col 0, row 15)
  camera.x = 0;
  camera.y = Math.max(0, TILE_SIZE * 15 - canvas.height / 2);
  clampCamera();

  appState = 'playing';
  document.getElementById('main-menu').classList.add('hidden');
  document.getElementById('pause-overlay').classList.add('hidden');
  document.getElementById('canvas-wrap').classList.remove('is-paused');

  SFX.fanfare();
  SFX.startMusic();
  refreshLockedButtons();
  updateUI();

  setTimeout(() => showEventPopup(
    '🎮 Welcome, Zoologist!\n\nYour zoo is EMPTY — build it from scratch!\n\n① Place paths from the entrance\n② Build fences to cage animals\n③ Buy animals & shops to earn money\n\n[F]ence [P]ath [W]ater  WASD/arrows pan\nRight-click drag to pan  [Z]=undo',
    '#27ae60'
  ), 600);

  console.log('🦁 Crazy-ASS Zoologists v2 — Game Started');
}

function pauseGame() {
  if (appState !== 'playing') return;
  appState = 'paused';
  document.getElementById('pause-overlay').classList.remove('hidden');
  document.getElementById('canvas-wrap').classList.add('is-paused');
  document.getElementById('btn-pause').textContent = '▶';
  SFX.pauseSound();
}

function resumeGame() {
  if (appState !== 'paused') return;
  appState = 'playing';
  document.getElementById('pause-overlay').classList.add('hidden');
  document.getElementById('canvas-wrap').classList.remove('is-paused');
  document.getElementById('btn-pause').textContent = '⏸';
  SFX.resumeSound();
}

function togglePause() {
  SFX.click();
  if (appState === 'playing') pauseGame();
  else if (appState === 'paused') resumeGame();
}

function newGame() {
  SFX.click();
  // Offer score submission if a real game session is in progress
  if ((appState === 'playing' || appState === 'paused') && gs.totalEarned > 0) {
    ScoreModal.offer('newgame');
    return;
  }
  _startGameFinal();
}

function _startGameFinal() {
  if (appState === 'paused') document.getElementById('pause-overlay').classList.add('hidden');
  document.getElementById('canvas-wrap').classList.remove('is-paused');
  gs.selectedTool = null;
  refreshToolButtons();
  startGame();
}

function exitToMenu() {
  SFX.click();
  // Offer score submission if a real game session is in progress
  if ((appState === 'playing' || appState === 'paused') && gs.totalEarned > 0) {
    ScoreModal.offer('menu');
    return;
  }
  _exitToMenuFinal();
}

function _exitToMenuFinal() {
  appState = 'menu';
  SFX.stopMusic();
  document.getElementById('main-menu').classList.remove('hidden');
  document.getElementById('pause-overlay').classList.add('hidden');
  document.getElementById('canvas-wrap').classList.remove('is-paused');
  document.getElementById('btn-pause').textContent = '⏸';
  gs.selectedTool = null;
  refreshToolButtons();
  document.getElementById('event-popup').classList.add('hidden');
  document.getElementById('event-ticker').textContent = '';
}

// ================================================================
//  TOOL SELECTION
// ================================================================
function selectTool(tool) {
  if (appState !== 'playing') return;
  SFX.click();
  if (gs.selectedTool === tool) {
    gs.selectedTool = null;
    refreshToolButtons();
    setHint('Select a tool, then click the map!');
    return;
  }
  gs.selectedTool = tool;
  refreshToolButtons();
  setHint(TOOL_HINTS[tool] || '');
}

function refreshToolButtons() {
  document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
  if (gs.selectedTool) {
    const btn = document.getElementById(`btn-${gs.selectedTool}`);
    if (btn) btn.classList.add('active');
  }
}

function setHint(text) {
  document.getElementById('tool-hint').textContent = text;
}

// ================================================================
//  PLACEMENT
// ================================================================
function handleTileAction(gx, gy) {
  if (appState !== 'playing') return;
  if (gx < 0 || gx >= GRID_W || gy < 0 || gy >= GRID_H) return;
  // Zone lock: tiles beyond unlockedCols are inaccessible
  if (gx >= gs.unlockedCols) { flash(`🔒 Level up to unlock this area! (Level ${gs.level})`); return; }

  const tool = gs.selectedTool;
  if (!tool) return;

  const cost = TOOL_COST[tool] ?? 0;
  if (gs.money < cost) { flash('Not enough money! 💸'); return; }

  if (ANIMAL_KEYS.has(tool)) {
    placeAnimal(gx, gy, tool);
  } else if (LARGE_BLDG_KEYS.has(tool)) {
    placeLargeBuilding(gx, gy, tool);
  } else if (BUILDING_KEYS.has(tool)) {
    placeBuilding(gx, gy, tool);
  } else if (TOOL_TILE[tool] !== undefined) {
    const t = TOOL_TILE[tool];
    if (gs.grid[gy][gx] === TILE.ENTRANCE) return;
    if (gs.grid[gy][gx] === t) return;
    // Push undo before modifying
    pushUndo({ kind: 'tile', gx, gy, prev: gs.grid[gy][gx] });
    gs.grid[gy][gx] = t;
    spend(cost);
    SFX.place();
  }
}

function placeBuilding(gx, gy, type) {
  const cost = TOOL_COST[type];
  if (gs.money < cost) { flash('Not enough money! 💸'); return; }
  const tile = gs.grid[gy][gx];
  if (tile !== TILE.GRASS) { flash('Buildings go on grass only!'); return; }
  pushUndo({ kind: 'tile', gx, gy, prev: tile });
  gs.grid[gy][gx] = BUILDING_TILE[type];
  spend(cost);
  gs.buildingCount++;
  gainXP(15);
  SFX.buildingPlace();
  addFloat(gx * TILE_SIZE + 16, gy * TILE_SIZE, '🏗 Built!', '#88ddff');
}

function placeLargeBuilding(gx, gy, type) {
  const def = LARGE_BLDG_DEFS[type];
  if (!def) return;
  if (gs.level < def.minLevel) { flash(`🔒 Reach Level ${def.minLevel} to build ${def.name}!`); return; }
  const cost = def.cost;
  if (gs.money < cost) { flash('Not enough money! 💸'); return; }
  // Check all tiles in footprint are within bounds, unlocked, and grass
  for (let dy = 0; dy < def.h; dy++) {
    for (let dx = 0; dx < def.w; dx++) {
      const nx = gx + dx, ny = gy + dy;
      if (nx >= GRID_W || ny >= GRID_H || nx >= gs.unlockedCols) { flash('Not enough space here!'); return; }
      if (gs.grid[ny][nx] !== TILE.GRASS) { flash(`${def.name} needs ${def.w}×${def.h} empty grass tiles!`); return; }
    }
  }
  // Capture undo snapshot of all tiles in footprint
  const prevTiles = [];
  for (let dy = 0; dy < def.h; dy++)
    for (let dx = 0; dx < def.w; dx++)
      prevTiles.push({ gx: gx+dx, gy: gy+dy, prev: gs.grid[gy+dy][gx+dx] });
  pushUndo({ kind: 'large_bldg', prevTiles, bldgIndex: gs.largeBuildings.length, cost });
  // Mark footprint tiles
  for (let dy = 0; dy < def.h; dy++)
    for (let dx = 0; dx < def.w; dx++)
      gs.grid[gy+dy][gx+dx] = TILE.LARGE_BLDG;
  gs.largeBuildings.push({ type, gx, gy, w: def.w, h: def.h });
  spend(cost);
  gs.buildingCount++;
  gainXP(30);
  SFX.buildingPlace();
  addFloat(gx * TILE_SIZE + def.w * TILE_SIZE / 2, gy * TILE_SIZE, `🏗 ${def.name}!`, '#88ddff');
}

function placeAnimal(gx, gy, type) {
  const def  = ANIMAL_DEFS[type];
  const cost = def.cost;
  if (gs.money < cost) { flash('Not enough money! 💸'); return; }
  const tile = gs.grid[gy][gx];
  if (tile === TILE.FENCE || tile === TILE.ENTRANCE) {
    flash("Can't place animals on fences or the entrance!");
    return;
  }
  const a = makeAnimal(type, gx, gy);
  pushUndo({ kind: 'animal', animalId: a.id });
  gs.animals.push(a);
  spend(cost);
  gainXP(10);
  SFX.animalSound(type);
  addFloat(a.x, a.y - 22, `${def.emoji} +${def.name}!`, '#ffd700');
}

// ================================================================
//  VISITOR SPAWNING
// ================================================================
function spawnVisitor() {
  if (gs.visitors.length >= 50) return;

  // Find the entrance tile
  let ex = 0, ey = 15;
  outer: for (let y = 0; y < GRID_H; y++)
    for (let x = 0; x < GRID_W; x++)
      if (gs.grid[y][x] === TILE.ENTRANCE) { ex = x; ey = y; break outer; }

  const px = ex * TILE_SIZE + TILE_SIZE / 2;
  const py = ey * TILE_SIZE + TILE_SIZE / 2;

  const baseLifetime = 60_000 + Math.random() * 40_000;
  const lifetimeBonus = window.HolderPerks?.getVisitorLifetimeBonus() ?? 0;
  gs.visitors.push({
    id: Math.random(),
    x: px, y: py, tx: px, ty: py,
    speed: 0.7 + Math.random() * 0.7,
    lifetime: baseLifetime * (1 + lifetimeBonus),
    incomeTimer: 2500 + Math.random() * 1000,
    color: `hsl(${Math.floor(Math.random() * 360)},80%,65%)`,
  });
}

// ================================================================
//  UPDATE — CAMERA
// ================================================================
function updateCamera(dt) {
  const spd = CAM_SPEED * (dt / 1000);
  if (keysDown.has('ArrowLeft')  || keysDown.has('a') || keysDown.has('A')) camera.x -= spd;
  if (keysDown.has('ArrowRight') || keysDown.has('d') || keysDown.has('D')) camera.x += spd;
  if (keysDown.has('ArrowUp')    || keysDown.has('w') || keysDown.has('W')) camera.y -= spd;
  if (keysDown.has('ArrowDown')  || keysDown.has('s') || keysDown.has('S')) camera.y += spd;

  // Q / E  — rotate view
  const rot = CAM_ROT_SPEED * (dt / 1000);
  if (keysDown.has('q') || keysDown.has('Q')) camera.angle -= rot;
  if (keysDown.has('e') || keysDown.has('E')) camera.angle += rot;

  clampCamera();
}

// ================================================================
//  UPDATE — ANIMALS
// ================================================================
function updateAnimals(dt) {
  for (const a of gs.animals) {
    // Rampage countdown
    if (a.rampageTimer > 0) {
      a.rampageTimer -= dt;
      if (a.rampageTimer <= 0) {
        a.rampageTimer = 0;
        a.speed   = a.def.speed;
        a.escaped = false;
      }
    }

    // Wander target refresh
    a.wanderTimer -= dt;
    if (a.wanderTimer <= 0) {
      pickAnimalTarget(a);
      a.wanderTimer = 1200 + Math.random() * 2800;
    }

    // Meme speech cycle
    a.memeTimer -= dt;
    if (a.memeTimer <= 0) {
      const lines = a.def.memeLines;
      a.currentMeme   = lines[Math.floor(Math.random() * lines.length)];
      a.memeShowTimer = 3000 + Math.random() * 2000;
      a.memeTimer     = 5000 + Math.random() * 9000;
    }
    if (a.memeShowTimer > 0) a.memeShowTimer -= dt;

    // Move toward wander target
    const dx   = a.tx - a.x;
    const dy   = a.ty - a.y;
    const dist = Math.hypot(dx, dy);

    if (dist > 2) {
      const step = a.speed * (dt / 16);
      const nx   = a.x + (dx / dist) * step;
      const ny   = a.y + (dy / dist) * step;
      const ngx  = Math.floor(nx / TILE_SIZE);
      const ngy  = Math.floor(ny / TILE_SIZE);

      if (ngx >= 0 && ngx < GRID_W && ngy >= 0 && ngy < GRID_H) {
        if (gs.grid[ngy][ngx] === TILE.FENCE) {
          pickAnimalTarget(a);
          a.wanderTimer = 600 + Math.random() * 1000;
        } else {
          a.x = nx; a.y = ny;
          // Escape detection: animal wandered far onto a PATH tile
          if (!a.escaped && gs.grid[ngy][ngx] === TILE.PATH) {
            const dHome = Math.hypot(a.x - a.homeX, a.y - a.homeY);
            if (dHome > TILE_SIZE * 4.5) {
              a.escaped = true;
              triggerEventMessage(`⚠️ ${a.def.name} has ESCAPED!`, '#e74c3c');
            }
          }
        }
      }
    } else {
      pickAnimalTarget(a);
    }

    // Keep within world bounds
    a.x = Math.max(a.def.radius, Math.min(WORLD_W - a.def.radius, a.x));
    a.y = Math.max(a.def.radius, Math.min(WORLD_H - a.def.radius, a.y));
  }
}

function pickAnimalTarget(a) {
  if (a.escaped) {
    a.tx = Math.random() * WORLD_W;
    a.ty = Math.random() * WORLD_H;
    return;
  }
  const wanderPx = (a.type === 'mega_donkey' || a.type === 'elephant' ? 4.5 : 3) * TILE_SIZE;

  for (let attempt = 0; attempt < 30; attempt++) {
    const angle = Math.random() * Math.PI * 2;
    const r     = Math.random() * wanderPx;
    const tx    = a.homeX + Math.cos(angle) * r;
    const ty    = a.homeY + Math.sin(angle) * r;
    const tgx   = Math.floor(tx / TILE_SIZE);
    const tgy   = Math.floor(ty / TILE_SIZE);
    if (tgx >= 0 && tgx < GRID_W && tgy >= 0 && tgy < GRID_H) {
      const t = gs.grid[tgy][tgx];
      if (t !== TILE.FENCE && t !== TILE.ENTRANCE) {
        a.tx = tx; a.ty = ty; return;
      }
    }
  }
  a.tx = a.homeX + (Math.random() - 0.5) * TILE_SIZE;
  a.ty = a.homeY + (Math.random() - 0.5) * TILE_SIZE;
}

// ================================================================
//  UPDATE — VISITORS
// ================================================================
function updateVisitors(dt) {
  const keep = [];
  for (const v of gs.visitors) {
    v.lifetime -= dt;
    if (v.lifetime <= 0) continue;

    // Income tick
    v.incomeTimer -= dt;
    if (v.incomeTimer <= 0) {
      v.incomeTimer = 2500 + Math.random() * 500;
      const earned = calcVisitorIncome(v);
      if (earned > 0) {
        gs.money         += earned;
        gs.totalEarned   += earned;
        gs.incomeThisSec += earned;
        // Only show float sometimes to avoid visual clutter
        gainXP(Math.ceil(earned / 5)); // XP from income
        if (Math.random() < 0.35) {
          addFloat(v.x, v.y - 12, `+$${earned}`, '#2ecc71');
          SFX.money();
        }
      }
    }

    // Move — visitors must stay on path tiles
    const dx   = v.tx - v.x;
    const dy   = v.ty - v.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 3) {
      pickVisitorTarget(v);
    } else {
      const step = v.speed * (dt / 16);
      const nx = v.x + (dx / dist) * step;
      const ny = v.y + (dy / dist) * step;
      // Only commit move if destination tile is PATH or ENTRANCE
      const ngx = Math.floor(nx / TILE_SIZE);
      const ngy = Math.floor(ny / TILE_SIZE);
      const onPath = ngx >= 0 && ngx < GRID_W && ngy >= 0 && ngy < GRID_H &&
        (gs.grid[ngy][ngx] === TILE.PATH || gs.grid[ngy][ngx] === TILE.ENTRANCE);
      if (onPath) {
        v.x = nx; v.y = ny;
      } else {
        // Redirect: pick a new path target instead of walking into grass
        pickVisitorTarget(v);
      }
    }
    v.x = Math.max(0, Math.min(WORLD_W, v.x));
    v.y = Math.max(0, Math.min(WORLD_H, v.y));
    keep.push(v);
  }
  gs.visitors = keep;
}

function calcVisitorIncome(v) {
  const animalRange   = TILE_SIZE * 5.5;
  const buildingRange = TILE_SIZE * 4;
  let appeal = 0;

  // Nearby animals
  for (const a of gs.animals) {
    if (Math.hypot(a.x - v.x, a.y - v.y) < animalRange) {
      const mult = window.HolderPerks?.getAnimalIncomeMultiplier(a.type) ?? 1;
      appeal += a.def.appeal * mult;
    }
  }

  // Nearby buildings
  const vgx = Math.floor(v.x / TILE_SIZE);
  const vgy = Math.floor(v.y / TILE_SIZE);
  const BR  = Math.ceil(buildingRange / TILE_SIZE);
  for (let dy = -BR; dy <= BR; dy++) {
    for (let dx = -BR; dx <= BR; dx++) {
      const nx = vgx + dx, ny = vgy + dy;
      if (nx >= 0 && nx < GRID_W && ny >= 0 && ny < GRID_H) {
        const bonus = BUILDING_APPEAL[gs.grid[ny][nx]];
        if (bonus) appeal += bonus;
      }
    }
  }

  return 1 + Math.floor(appeal / 9);
}

function pickVisitorTarget(v) {
  const vgx = Math.floor(v.x / TILE_SIZE);
  const vgy = Math.floor(v.y / TILE_SIZE);
  const paths = [];
  const R = 9;

  for (let dy = -R; dy <= R; dy++) {
    for (let dx = -R; dx <= R; dx++) {
      const nx = vgx + dx, ny = vgy + dy;
      if (nx >= 0 && nx < GRID_W && ny >= 0 && ny < GRID_H) {
        const t = gs.grid[ny][nx];
        if (t === TILE.PATH || t === TILE.ENTRANCE) {
          paths.push({ x: nx * TILE_SIZE + TILE_SIZE / 2, y: ny * TILE_SIZE + TILE_SIZE / 2 });
        }
      }
    }
  }
  if (paths.length) {
    const p = paths[Math.floor(Math.random() * paths.length)];
    v.tx = p.x; v.ty = p.y;
  } else {
    v.tx = v.x + (Math.random() - 0.5) * TILE_SIZE * 6;
    v.ty = v.y + (Math.random() - 0.5) * TILE_SIZE * 6;
  }
}

// ================================================================
//  UPDATE — VISITOR SPAWNING
// ================================================================
function updateVisitorSpawn(dt) {
  const animalBonus = Math.min(gs.animals.length * 1000, 7000);
  const interval    = Math.max(4000, 11_000 - animalBonus);
  gs.visitorSpawnTimer -= dt;
  if (gs.visitorSpawnTimer <= 0) {
    gs.visitorSpawnTimer = interval;
    spawnVisitor();
  }
}

// ================================================================
//  UPDATE — RANDOM EVENTS
// ================================================================
function updateRandomEvents(dt) {
  gs.randomEventTimer -= dt;
  if (gs.randomEventTimer <= 0) {
    gs.randomEventTimer = 20_000 + Math.random() * 20_000;
    if (gs.animals.length > 0) {
      const ev = RANDOM_EVENTS[Math.floor(Math.random() * RANDOM_EVENTS.length)];
      ev.effect(gs);
      const positive = !ev.title.includes('CRASH') && !ev.title.includes('ESCAPE');
      SFX.eventSound(positive);
      showEventPopup(`${ev.title}\n${ev.body}`, ev.color);
    }
  }
  // Dismiss popup timer
  if (gs.eventDisplayTimer > 0) {
    gs.eventDisplayTimer -= dt;
    if (gs.eventDisplayTimer <= 0) {
      document.getElementById('event-popup').classList.add('hidden');
      document.getElementById('event-ticker').textContent = '';
    }
  }
}

// ================================================================
//  UPDATE — INCOME RATE
// ================================================================
function updateIncomeRate(dt) {
  gs.incomeRateTimer -= dt;
  if (gs.incomeRateTimer <= 0) {
    gs.incomeRateTimer  = 1000;
    gs.incomeRate       = gs.incomeThisSec;
    gs.incomeThisSec    = 0;
  }
}

// ================================================================
//  FLOATING TEXTS
// ================================================================
function addFloat(x, y, text, color) {
  gs.floatingTexts.push({ x, y, text, color, life: 1300, maxLife: 1300 });
}

function updateFloatingTexts(dt) {
  gs.floatingTexts = gs.floatingTexts.filter(f => {
    f.y   -= dt * 0.032;
    f.life -= dt;
    return f.life > 0;
  });
}

// ================================================================
//  EVENT / UI HELPERS
// ================================================================
function showEventPopup(msg, color) {
  const el = document.getElementById('event-popup');
  el.textContent       = msg;
  el.style.borderColor = color || '#ffd700';
  el.classList.remove('hidden');
  gs.eventDisplayTimer = 5000;
  document.getElementById('event-ticker').textContent = msg.split('\n')[0];
}

function triggerEventMessage(msg, color) { showEventPopup(msg, color); }

function flash(msg) {
  const hint = document.getElementById('tool-hint');
  const prev = hint.textContent;
  hint.style.color = '#ff6644';
  hint.textContent = msg;
  setTimeout(() => { hint.style.color = ''; hint.textContent = prev; }, 2000);
}

function updateUI() {
  document.getElementById('money-display').textContent   = `💰 $${Math.floor(gs.money)}`;
  document.getElementById('visitor-display').textContent = `👥 ${gs.visitors.length}`;
  document.getElementById('income-display').textContent  = `📈 $${gs.incomeRate}/s`;
  document.getElementById('stat-animals').textContent    = gs.animals.length;
  document.getElementById('stat-visitors').textContent   = gs.visitors.length;
  document.getElementById('stat-buildings').textContent  = gs.buildingCount;
  document.getElementById('stat-earned').textContent     = `$${Math.floor(gs.totalEarned)}`;
  // Level / XP
  const ldef = LEVEL_DEFS[gs.level - 1] || LEVEL_DEFS[LEVEL_DEFS.length - 1];
  const xpEl = document.getElementById('stat-level');
  if (xpEl) xpEl.textContent = `Lv${gs.level} — ${ldef.label}`;
  const xpBar = document.getElementById('xp-bar-fill');
  if (xpBar) xpBar.style.width = `${Math.min(100, (gs.xp / gs.xpToNext) * 100)}%`;
  const xpNum = document.getElementById('stat-xp');
  if (xpNum) xpNum.textContent = `${gs.xp}/${gs.xpToNext} XP`;
  // Beauty
  const beautyEl = document.getElementById('stat-beauty');
  if (beautyEl) beautyEl.textContent = gs.beauty;
  // Undo availability
  const undoBtn = document.getElementById('btn-undo');
  if (undoBtn) undoBtn.disabled = gs.actionHistory.length === 0;
}

function spend(amount) { gs.money -= amount; updateUI(); }

// ================================================================
//  SCORE COMPUTATION
// ================================================================
// Composite score: money earned + level bonus + beauty bonus
function computeScore() {
  return Math.floor(gs.totalEarned)
    + (gs.level  * 1000)
    + (gs.beauty * 10);
}

// ================================================================
//  SCORE MODAL BRIDGE
//  The only interface between game.js and wallet/leaderboard modules.
//  leaderboard.js calls ScoreModal.getPayload() — it never touches gs directly.
// ================================================================
const ScoreModal = {
  _intent: null,  // 'menu' | 'newgame'

  offer(intent) {
    this._intent = intent;
    const score = computeScore();
    const overlay = document.getElementById('score-overlay');
    if (!overlay) { this._proceed(); return; }

    // Populate score summary line
    const summaryEl = document.getElementById('score-summary');
    if (summaryEl) {
      summaryEl.innerHTML =
        `<strong style="color:#ffd700">$${score.toLocaleString()}</strong>` +
        ` &nbsp;·&nbsp; Lv${gs.level}` +
        ` &nbsp;·&nbsp; ${gs.animals.length} animals`;
    }

    // Clear previous errors / reset submit button
    const errEl = document.getElementById('submit-error');
    if (errEl) { errEl.textContent = ''; errEl.style.display = 'none'; }
    const btn = document.getElementById('btn-submit-score');
    if (btn) { btn.disabled = !window.WalletAPI?.isConnected(); btn.textContent = '📤 Submit Score'; }

    overlay.classList.remove('hidden');

    // Kick off top-10 load in the background
    if (window.LeaderboardAPI) LeaderboardAPI.loadTop10();
  },

  skip() {
    document.getElementById('score-overlay')?.classList.add('hidden');
    this._proceed();
  },

  complete() {
    document.getElementById('score-overlay')?.classList.add('hidden');
    this._proceed();
  },

  _proceed() {
    if (this._intent === 'menu')    _exitToMenuFinal();
    if (this._intent === 'newgame') _startGameFinal();
    this._intent = null;
  },

  // Snapshot of the current game state for leaderboard submission.
  // Called by leaderboard.js — never let external modules read gs directly.
  getPayload() {
    return {
      runId:       gs.runId,
      score:       computeScore(),
      totalEarned: Math.floor(gs.totalEarned),
      level:       gs.level,
      beauty:      gs.beauty,
      animals:     gs.animals.length,
    };
  },
};

// ================================================================
//  RENDERING
// ================================================================

// Deterministic "random" for stable grass texture (no per-frame change)
function drand(seed) {
  const s = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

function render() {
  const vw = canvas.width;
  const vh = canvas.height;
  ctx.clearRect(0, 0, vw, vh);

  if (appState === 'menu') {
    drawMenuBackground();
    return;
  }

  // ── World-space drawing (translated + rotated by camera) ────
  ctx.save();
  // Rotate around the viewport centre, then apply pan offset
  ctx.translate(vw / 2, vh / 2);
  ctx.rotate(camera.angle);
  ctx.translate(-vw / 2 - camera.x, -vh / 2 - camera.y);

  // Visible tile range: when rotated expand bounds by the viewport diagonal
  let tStartX, tStartY, tEndX, tEndY;
  if (camera.angle === 0) {
    tStartX = Math.max(0, Math.floor(camera.x / TILE_SIZE));
    tStartY = Math.max(0, Math.floor(camera.y / TILE_SIZE));
    tEndX   = Math.min(GRID_W - 1, Math.ceil((camera.x + vw) / TILE_SIZE));
    tEndY   = Math.min(GRID_H - 1, Math.ceil((camera.y + vh) / TILE_SIZE));
  } else {
    // Compute world-space AABB of the 4 rotated viewport corners
    const c = Math.cos(-camera.angle), s = Math.sin(-camera.angle);
    const corners = [
      [0, 0], [vw, 0], [0, vh], [vw, vh]
    ].map(([sx, sy]) => {
      const dx = sx - vw / 2, dy = sy - vh / 2;
      return [dx * c - dy * s + vw / 2 + camera.x,
              dx * s + dy * c + vh / 2 + camera.y];
    });
    const wxs = corners.map(p => p[0]), wys = corners.map(p => p[1]);
    tStartX = Math.max(0, Math.floor(Math.min(...wxs) / TILE_SIZE) - 1);
    tStartY = Math.max(0, Math.floor(Math.min(...wys) / TILE_SIZE) - 1);
    tEndX   = Math.min(GRID_W - 1, Math.ceil(Math.max(...wxs) / TILE_SIZE) + 1);
    tEndY   = Math.min(GRID_H - 1, Math.ceil(Math.max(...wys) / TILE_SIZE) + 1);
  }

  drawTiles(tStartX, tStartY, tEndX, tEndY);
  drawGridLines(tStartX, tStartY, tEndX, tEndY);
  drawLargeBuildings();
  drawLockedZone();
  drawHoverHighlight();
  drawAnimals();
  drawVisitors();
  drawFloatingTexts();

  ctx.restore();

  // ── Rotation HUD (screen-space) ─────────────────────────────
  if (camera.angle !== 0) {
    const deg  = ((camera.angle * 180 / Math.PI) % 360 + 360) % 360;
    const label = `⟳ ${Math.round(deg)}°  Q/E to rotate`;
    const tw = label.length * 6.5 + 12;
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(vw / 2 - tw / 2, 6, tw, 18);
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 10px Courier New';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(label, vw / 2, 15);
  }

  // ── Minimap (screen-space) ───────────────────────────────────
  drawMinimap();
}

// ── Menu background (animated) ──────────────────────────────────
function drawMenuBackground() {
  const vw = canvas.width;
  const vh = canvas.height;
  const t  = Date.now() / 1000;

  // Dark animated gradient
  const grad = ctx.createRadialGradient(vw/2, vh/2, 0, vw/2, vh/2, Math.max(vw, vh));
  grad.addColorStop(0, '#1a0035');
  grad.addColorStop(1, '#040810');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, vw, vh);

  // Floating emojis as decoration
  const emojis = ['🦁','🐯','🐘','🦒','🐼','🦩','🐆','🐒','🐊','🦓'];
  ctx.font = '32px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  emojis.forEach((em, i) => {
    const x = ((i / emojis.length) * vw + t * 18 * (i % 2 === 0 ? 1 : -1)) % vw;
    const y = vh * 0.1 + (i % 3) * (vh * 0.3) + Math.sin(t * 0.6 + i) * 18;
    ctx.globalAlpha = 0.12 + Math.sin(t * 0.4 + i * 0.8) * 0.06;
    ctx.fillText(em, x, y);
  });
  ctx.globalAlpha = 1;
}

// ── Tile rendering ───────────────────────────────────────────────
function drawTiles(sx, sy, ex, ey) {
  for (let y = sy; y <= ey; y++) {
    for (let x = sx; x <= ex; x++) {
      const t  = gs.grid[y][x];
      const px = x * TILE_SIZE;
      const py = y * TILE_SIZE;
      switch (t) {
        case TILE.GRASS:       drawGrass(px, py, x, y);      break;
        case TILE.FENCE:       drawFence(px, py);             break;
        case TILE.PATH:        drawPath(px, py, x, y);        break;
        case TILE.WATER:       drawWater(px, py, x, y);       break;
        case TILE.ENTRANCE:    drawEntrance(px, py);          break;
        case TILE.RESTAURANT:  drawBuilding(px, py, '🍽', '#c0392b', '#e74c3c'); break;
        case TILE.ICE_CREAM:   drawBuilding(px, py, '🍦', '#c0749f', '#e91e8c'); break;
        case TILE.GIFT_SHOP:   drawBuilding(px, py, '🎁', '#6a0dad', '#9b59b6'); break;
        case TILE.SNACK_STAND: drawBuilding(px, py, '🌭', '#d97c00', '#f39c12'); break;
        case TILE.GRASS_FLOWER: drawFlower(px, py, x, y);    break;
        case TILE.GRASS_TREE:   drawTree(px, py, x, y);      break;
        case TILE.LARGE_BLDG:   drawGrass(px, py, x, y);    break; // base; large bldg drawn on top separately
      }
    }
  }
}

// 6 grass base/blade colour pairs for natural-looking terrain variation
const GRASS_VARS = [
  { base: '#3a7a38', blade: '#4a9e4a' },
  { base: '#3d7a3d', blade: '#52a44a' },
  { base: '#417d3c', blade: '#4da050' },
  { base: '#3c7840', blade: '#479c4c' },
  { base: '#45823f', blade: '#56a84e' },
  { base: '#387a42', blade: '#4ba055' },
];

function drawGrass(px, py, gx, gy) {
  const v = GRASS_VARS[Math.floor(drand(gx * 73 + gy * 53) * GRASS_VARS.length)];
  ctx.fillStyle = v.base;
  ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);

  // Grass blades
  ctx.fillStyle = v.blade;
  for (let i = 0; i < 4; i++) {
    const bx = Math.floor(drand(gx * 31 + gy * 17 + i * 7) * (TILE_SIZE - 4));
    const by = Math.floor(drand(gx * 11 + gy * 37 + i * 13) * (TILE_SIZE - 6));
    ctx.fillRect(px + bx, py + by, 2, drand(gx + gy + i) > 0.5 ? 5 : 3);
  }

  // Tiny pebble (≈10% of tiles, deterministic per position)
  if (drand(gx * 101 + gy * 67 + 999) < 0.10) {
    const rx = px + 4 + Math.floor(drand(gx * 41 + gy * 23) * (TILE_SIZE - 8));
    const ry = py + 4 + Math.floor(drand(gx * 19 + gy * 83) * (TILE_SIZE - 8));
    ctx.fillStyle = '#7a6b5a';
    ctx.beginPath(); ctx.ellipse(rx, ry, 3, 2, drand(gx * 7) * Math.PI, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#9a8a7a';
    ctx.beginPath(); ctx.ellipse(rx - 1, ry - 1, 2, 1, 0, 0, Math.PI * 2); ctx.fill();
  }

  // Tiny grass clump (≈8% of tiles, independent roll)
  if (drand(gx * 61 + gy * 89 + 777) < 0.08) {
    const cx2 = px + 6 + Math.floor(drand(gx * 29 + gy * 43) * (TILE_SIZE - 12));
    const cy2 = py + 6 + Math.floor(drand(gx * 47 + gy * 31) * (TILE_SIZE - 12));
    ctx.strokeStyle = '#2d6b2d';
    ctx.lineWidth = 1;
    for (let j = 0; j < 3; j++) {
      ctx.beginPath();
      ctx.moveTo(cx2 + j * 3 - 3, cy2 + 4);
      ctx.lineTo(cx2 + j * 3 - 3 + (drand(gx + j) - 0.5) * 3, cy2 - 3 + drand(gy + j) * 2);
      ctx.stroke();
    }
  }
}

function drawFence(px, py) {
  // Drop shadow
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.fillRect(px + 3, py + 3, TILE_SIZE, TILE_SIZE);
  ctx.fillStyle = '#7B4F2E';
  ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
  ctx.fillStyle = '#9B6B3A';
  ctx.fillRect(px + 3, py + 3,  TILE_SIZE - 6, 5);
  ctx.fillRect(px + 3, py + TILE_SIZE - 8, TILE_SIZE - 6, 5);
  ctx.fillRect(px + 6,  py + 3, 5, TILE_SIZE - 6);
  ctx.fillRect(px + TILE_SIZE - 11, py + 3, 5, TILE_SIZE - 6);
  ctx.strokeStyle = 'rgba(0,0,0,0.4)';
  ctx.lineWidth = 1;
  ctx.strokeRect(px + 1, py + 1, TILE_SIZE - 2, TILE_SIZE - 2);
}

function drawPath(px, py, gx, gy) {
  // Auto-tile: check which of the 4 neighbours are also path/entrance
  const _p = (x, y) => x >= 0 && x < GRID_W && y >= 0 && y < GRID_H &&
    (gs.grid[y][x] === TILE.PATH || gs.grid[y][x] === TILE.ENTRANCE);
  const cN = _p(gx, gy - 1), cS = _p(gx, gy + 1),
        cW = _p(gx - 1, gy), cE = _p(gx + 1, gy);

  // Base gravel fill
  ctx.fillStyle = '#C8A96E';
  ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);

  // Stone texture dots
  ctx.fillStyle = '#B89658';
  for (let row = 0; row < 3; row++)
    for (let col = 0; col < 4; col++)
      ctx.fillRect(px + 4 + col * 7, py + 4 + row * 10, 4, 4);

  // Raised kerb edges on unconnected sides
  const CURB = '#8B6940', C = 3;
  ctx.fillStyle = CURB;
  if (!cN) ctx.fillRect(px,                    py,                    TILE_SIZE, C);
  if (!cS) ctx.fillRect(px,                    py + TILE_SIZE - C,    TILE_SIZE, C);
  if (!cW) ctx.fillRect(px,                    py,                    C, TILE_SIZE);
  if (!cE) ctx.fillRect(px + TILE_SIZE - C,    py,                    C, TILE_SIZE);
}

function drawWater(px, py, gx, gy) {
  ctx.fillStyle = '#1a6fd4';
  ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);

  // Animated waves
  const t   = Date.now() / 900;
  const off = Math.sin(t + gx * 0.9) * 3;
  ctx.strokeStyle = 'rgba(120,210,255,0.5)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(px + 3,  py + 10 + off);
  ctx.bezierCurveTo(px + 10, py + 6  + off, px + 20, py + 14 + off, px + 29, py + 10 + off);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(px + 3,  py + 20 - off);
  ctx.bezierCurveTo(px + 10, py + 16 - off, px + 20, py + 24 - off, px + 29, py + 20 - off);
  ctx.stroke();

  // Occasional sparkle dot
  const sparkPhase = (t * 1.7 + gx * 3.1 + gy * 2.3) % (Math.PI * 2);
  if (sparkPhase < 0.4) {
    const sx = px + 6 + Math.floor(drand(gx * 7 + gy * 13) * (TILE_SIZE - 12));
    const sy = py + 4 + Math.floor(drand(gx * 11 + gy * 7)  * (TILE_SIZE - 8));
    ctx.fillStyle = `rgba(200,240,255,${0.5 + Math.sin(sparkPhase * 8) * 0.3})`;
    ctx.beginPath(); ctx.arc(sx, sy, 1.5, 0, Math.PI * 2); ctx.fill();
  }
}

function drawEntrance(px, py) {
  ctx.fillStyle = '#cc4400';
  ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
  ctx.fillStyle = '#ff8800';
  ctx.fillRect(px + 3, py + 3, TILE_SIZE - 6, TILE_SIZE - 6);
  // Pulsing arrow
  const pulse = 0.7 + Math.sin(Date.now() / 400) * 0.3;
  ctx.globalAlpha = pulse;
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 10px sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('IN', px + TILE_SIZE / 2, py + TILE_SIZE / 2);
  ctx.globalAlpha = 1;
}

function drawFlower(px, py, gx, gy) {
  // Base: lush green
  ctx.fillStyle = '#4caf50';
  ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
  // Flowers: small coloured circles
  const hue = ((gx * 53 + gy * 37) % 360);
  const colours = [`hsl(${hue},90%,65%)`, `hsl(${(hue+120)%360},90%,65%)`, `hsl(${(hue+240)%360},90%,65%)`];
  for (let i = 0; i < 5; i++) {
    const fx = px + 4 + Math.floor(drand(gx*7+gy*11+i*3) * (TILE_SIZE-8));
    const fy = py + 4 + Math.floor(drand(gx*13+gy*5+i*7) * (TILE_SIZE-8));
    ctx.fillStyle = colours[i % colours.length];
    ctx.beginPath(); ctx.arc(fx, fy, 3, 0, Math.PI * 2); ctx.fill();
    // Stem
    ctx.strokeStyle = '#2e7d32'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(fx, fy+3); ctx.lineTo(fx, fy+7); ctx.stroke();
  }
}

function drawTree(px, py, gx, gy) {
  // Base: dark green ground
  ctx.fillStyle = '#388e3c';
  ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
  // Ground shadow cast by canopy
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.beginPath(); ctx.ellipse(px + TILE_SIZE/2 + 3, py + 24, 10, 5, 0, 0, Math.PI*2); ctx.fill();
  // Trunk
  ctx.fillStyle = '#6D4C41';
  ctx.fillRect(px + TILE_SIZE/2 - 3, py + 18, 6, 12);
  // Canopy (two circles for depth)
  const cx = px + TILE_SIZE/2, cy = py + 14;
  ctx.fillStyle = '#1B5E20';
  ctx.beginPath(); ctx.arc(cx, cy+2, 11, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#2E7D32';
  ctx.beginPath(); ctx.arc(cx, cy, 10, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#43A047';
  ctx.beginPath(); ctx.arc(cx-2, cy-2, 6, 0, Math.PI*2); ctx.fill();
}

function drawLargeBuildings() {
  for (const lb of gs.largeBuildings) {
    const def = LARGE_BLDG_DEFS[lb.type];
    if (!def) continue;
    const px = lb.gx * TILE_SIZE;
    const py = lb.gy * TILE_SIZE;
    const bw = lb.w * TILE_SIZE;
    const bh = lb.h * TILE_SIZE;

    // Drop shadow
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(px + 6, py + 6, bw, bh);
    // Walls
    ctx.fillStyle = def.color;
    ctx.fillRect(px, py + bh * 0.35, bw, bh * 0.65);
    // Roof
    ctx.fillStyle = def.accentColor;
    ctx.beginPath();
    ctx.moveTo(px - 4, py + bh * 0.38);
    ctx.lineTo(px + bw/2, py + 2);
    ctx.lineTo(px + bw + 4, py + bh * 0.38);
    ctx.closePath();
    ctx.fill();
    // Windows
    ctx.fillStyle = 'rgba(200,240,255,0.55)';
    const winCount = lb.w;
    for (let i = 0; i < winCount; i++) {
      const wx = px + 8 + i * (bw / winCount) - 2;
      const wy = py + bh * 0.5;
      ctx.fillRect(wx, wy, 10, 10);
    }
    // Door
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(px + bw/2 - 6, py + bh - 14, 12, 14);
    // Label
    ctx.font = `${Math.min(16, bh * 0.28)}px serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText(def.emoji, px + bw/2, py + bh * 0.42);
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${Math.min(10, bh * 0.14)}px Courier New`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    ctx.fillText(def.name, px + bw/2, py + bh - 2);
    // Border
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(px + 1, py + 1, bw - 2, bh - 2);
  }
}

function drawBuilding(px, py, emoji, bgColor, accentColor) {
  // Drop shadow
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.fillRect(px + 4, py + 4, TILE_SIZE, TILE_SIZE);
  // Roof
  ctx.fillStyle = bgColor;
  ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
  // Walls
  ctx.fillStyle = accentColor;
  ctx.fillRect(px + 2, py + 10, TILE_SIZE - 4, TILE_SIZE - 12);
  // Roof triangle
  ctx.fillStyle = bgColor;
  ctx.beginPath();
  ctx.moveTo(px,              py + 12);
  ctx.lineTo(px + TILE_SIZE,  py + 12);
  ctx.lineTo(px + TILE_SIZE / 2, py + 2);
  ctx.closePath();
  ctx.fill();
  // Door
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.fillRect(px + TILE_SIZE / 2 - 4, py + TILE_SIZE - 10, 8, 10);
  // Emoji sign
  ctx.font = '13px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(emoji, px + TILE_SIZE / 2, py + 17);
  // Border
  ctx.strokeStyle = 'rgba(255,255,255,0.2)';
  ctx.lineWidth = 1;
  ctx.strokeRect(px + 1, py + 1, TILE_SIZE - 2, TILE_SIZE - 2);
}

// ── Grid lines ───────────────────────────────────────────────────
function drawGridLines(sx, sy, ex, ey) {
  ctx.strokeStyle = 'rgba(0,0,0,0.10)';
  ctx.lineWidth   = 0.5;
  for (let x = sx; x <= ex + 1; x++) {
    const px = x * TILE_SIZE;
    ctx.beginPath(); ctx.moveTo(px, sy * TILE_SIZE); ctx.lineTo(px, (ey + 1) * TILE_SIZE); ctx.stroke();
  }
  for (let y = sy; y <= ey + 1; y++) {
    const py = y * TILE_SIZE;
    ctx.beginPath(); ctx.moveTo(sx * TILE_SIZE, py); ctx.lineTo((ex + 1) * TILE_SIZE, py); ctx.stroke();
  }
}

// ── Hover highlight ──────────────────────────────────────────────
function drawHoverHighlight() {
  const { mouseGX: gx, mouseGY: gy, selectedTool: tool } = gs;
  if (!tool || gx < 0 || gx >= GRID_W || gy < 0 || gy >= GRID_H) return;

  const px = gx * TILE_SIZE;
  const py = gy * TILE_SIZE;

  // Colour the highlight based on tool category
  const isBuilding = BUILDING_KEYS.has(tool);
  const isAnimal   = ANIMAL_KEYS.has(tool);
  ctx.fillStyle = isBuilding ? 'rgba(52,152,219,0.35)' :
                  isAnimal   ? 'rgba(255,215,0,0.30)'  :
                               'rgba(255,255,255,0.28)';
  ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);

  ctx.strokeStyle = isBuilding ? 'rgba(52,152,219,0.9)' : 'rgba(255,215,0,0.9)';
  ctx.lineWidth   = 2;
  ctx.strokeRect(px + 1, py + 1, TILE_SIZE - 2, TILE_SIZE - 2);

  // Cost label
  const cost = TOOL_COST[tool];
  if (cost != null) {
    const label = `$${cost}`;
    const lw    = label.length * 6.5 + 8;
    ctx.fillStyle = 'rgba(0,0,0,0.8)';
    ctx.fillRect(px, py - 18, lw, 16);
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 10px Courier New';
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText(label, px + 3, py - 16);
  }
}

// ── Animals ──────────────────────────────────────────────────────
function drawAnimals() {
  const now = Date.now();
  for (const a of gs.animals) {
    const { x, def, escaped, rampageTimer, currentMeme, memeShowTimer } = a;
    const r = def.radius;
    // Idle bounce: gentle sine offset; rampaging animals vibrate faster
    const freq = rampageTimer > 0 ? 14 : 3.5;
    const amp  = rampageTimer > 0 ? 2.5 : 1.5;
    const y = a.y + Math.sin(now / (1000 / freq) + a.id * 10) * amp;

    // Shadow (stays on ground, not affected by bounce)
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.beginPath();
    ctx.ellipse(a.x + 2, a.y + r - 1, r * 0.85, r * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body
    ctx.fillStyle = rampageTimer > 0 ? '#ff4400' : escaped ? '#ff2222' : def.color;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();

    ctx.strokeStyle = (escaped || rampageTimer > 0) ? '#ff0000' : 'rgba(0,0,0,0.4)';
    ctx.lineWidth   = rampageTimer > 0 ? 3 : 1.5;
    ctx.stroke();

    // Emoji
    ctx.font = `${r * 1.55}px serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(def.emoji, x, y);

    // Status tag
    const tag = escaped ? '⚠ ESCAPED' : (rampageTimer > 0 ? '🔥 RAMPAGE' : def.name);
    const tw  = tag.length * 5 + 8;
    ctx.fillStyle = escaped || rampageTimer > 0 ? 'rgba(160,0,0,0.9)' : 'rgba(0,0,0,0.65)';
    ctx.fillRect(x - tw / 2, y + r + 2, tw, 12);
    ctx.fillStyle = '#fff'; ctx.font = '8px Courier New';
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText(tag, x, y + r + 3);

    // Meme bubble
    if (currentMeme && memeShowTimer > 0) {
      const alpha = Math.min(1, memeShowTimer / 600);
      const bw    = currentMeme.length * 5.2 + 14;
      const bh    = 15;
      const bx    = x - bw / 2;
      const by    = y - r - bh - 6;
      ctx.globalAlpha = alpha;
      ctx.fillStyle   = 'rgba(255,255,240,0.96)';
      ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 4); ctx.fill();
      ctx.strokeStyle = '#bbb'; ctx.lineWidth = 0.8; ctx.stroke();
      // Tail
      ctx.fillStyle = 'rgba(255,255,240,0.96)';
      ctx.beginPath();
      ctx.moveTo(x - 3, by + bh); ctx.lineTo(x + 3, by + bh); ctx.lineTo(x, by + bh + 5);
      ctx.fill();
      // Text
      ctx.fillStyle = '#111'; ctx.font = '8px Courier New';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(currentMeme, x, by + bh / 2);
      ctx.globalAlpha = 1;
    }
  }
}

// ── Visitors ─────────────────────────────────────────────────────
function drawVisitors() {
  for (const v of gs.visitors) {
    const { x, y, color } = v;
    const r = 5;
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath(); ctx.ellipse(x + 1, y + r, r * 0.7, r * 0.28, 0, 0, Math.PI * 2); ctx.fill();
    // Body
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.65)'; ctx.lineWidth = 1; ctx.stroke();
    // Highlight
    ctx.fillStyle = 'rgba(255,255,255,0.38)';
    ctx.beginPath(); ctx.arc(x - 1.5, y - 1.5, 2, 0, Math.PI * 2); ctx.fill();
  }
}

// ── Floating texts ───────────────────────────────────────────────
function drawFloatingTexts() {
  for (const f of gs.floatingTexts) {
    ctx.globalAlpha = f.life / f.maxLife;
    ctx.fillStyle   = f.color;
    ctx.font        = 'bold 11px Courier New';
    ctx.textAlign   = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(f.text, f.x, f.y);
  }
  ctx.globalAlpha = 1;
}

// ── Minimap ───────────────────────────────────────────────────────
function drawLockedZone() {
  if (gs.unlockedCols >= GRID_W) return; // fully unlocked
  const lx = gs.unlockedCols * TILE_SIZE;
  // Dim overlay
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(lx, 0, WORLD_W - lx, WORLD_H);
  // Dashed boundary line
  ctx.setLineDash([8, 6]);
  ctx.strokeStyle = 'rgba(255,215,0,0.6)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(lx, 0); ctx.lineTo(lx, WORLD_H);
  ctx.stroke();
  ctx.setLineDash([]);
  // Label
  const labelY = camera.y + canvas.height / 2;
  const labelX = lx + 12;
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.fillRect(labelX - 4, labelY - 14, 120, 20);
  ctx.fillStyle = '#ffd700';
  ctx.font = 'bold 11px Courier New';
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillText(`🔒 Level up to expand`, labelX, labelY - 4);
}

const MINIMAP_TILE_COLORS = {
  [TILE.GRASS]:       '#3d7a3d',
  [TILE.FENCE]:       '#7B4F2E',
  [TILE.PATH]:        '#C8A96E',
  [TILE.WATER]:       '#1a6fd4',
  [TILE.ENTRANCE]:    '#FF6600',
  [TILE.RESTAURANT]:  '#c0392b',
  [TILE.ICE_CREAM]:   '#c0749f',
  [TILE.GIFT_SHOP]:   '#6a0dad',
  [TILE.SNACK_STAND]:    '#d97c00',
  [TILE.GRASS_FLOWER]:   '#a5d6a7',
  [TILE.GRASS_TREE]:     '#1b5e20',
  [TILE.LARGE_BLDG]:     '#90caf9',
};

function drawMinimap() {
  if (appState === 'menu') return;
  const mw = mmCanvas.width;
  const mh = mmCanvas.height;
  const tw = mw / GRID_W; // pixels per tile on minimap
  const th = mh / GRID_H;

  mmCtx.clearRect(0, 0, mw, mh);

  // Draw tiles
  for (let y = 0; y < GRID_H; y++) {
    for (let x = 0; x < GRID_W; x++) {
      const t = gs.grid[y][x];
      mmCtx.fillStyle = MINIMAP_TILE_COLORS[t] || '#3d7a3d';
      mmCtx.fillRect(x * tw, y * th, Math.ceil(tw), Math.ceil(th));
    }
  }

  // Draw animals as tiny dots
  mmCtx.fillStyle = '#ff0';
  for (const a of gs.animals) {
    const mx = (a.x / WORLD_W) * mw;
    const my = (a.y / WORLD_H) * mh;
    mmCtx.fillRect(mx - 1, my - 1, 2.5, 2.5);
  }

  // Draw viewport rectangle
  const vx = (camera.x / WORLD_W) * mw;
  const vy = (camera.y / WORLD_H) * mh;
  const vw = (canvas.width  / WORLD_W) * mw;
  const vh = (canvas.height / WORLD_H) * mh;
  mmCtx.strokeStyle = 'rgba(255,255,255,0.8)';
  mmCtx.lineWidth   = 1;
  mmCtx.strokeRect(vx, vy, vw, vh);
}

// ================================================================
//  INPUT HANDLING
// ================================================================
canvas.addEventListener('mousedown', e => {
  if (e.button === 2) {
    // Right-click = pan drag start
    gs.isPanDragging  = true;
    gs.panStartX      = e.clientX;
    gs.panStartY      = e.clientY;
    gs.panCamStartX   = camera.x;
    gs.panCamStartY   = camera.y;
    canvas.style.cursor = 'grabbing';
    return;
  }
  gs.isDragging = true;
  const { gx, gy } = getGridPos(e);
  handleTileAction(gx, gy);
});

canvas.addEventListener('mousemove', e => {
  if (gs.isPanDragging) {
    const dsx = e.clientX - gs.panStartX;
    const dsy = e.clientY - gs.panStartY;
    // Pan in screen space regardless of rotation angle
    const c = Math.cos(camera.angle), s = Math.sin(camera.angle);
    camera.x = gs.panCamStartX - dsx * c - dsy * s;
    camera.y = gs.panCamStartY + dsx * s - dsy * c;
    clampCamera();
    return;
  }
  const { gx, gy } = getGridPos(e);
  gs.mouseGX = gx;
  gs.mouseGY = gy;
  if (gs.isDragging) {
    const tool = gs.selectedTool;
    if (tool === 'fence' || tool === 'path' || tool === 'water') handleTileAction(gx, gy);
  }
});

canvas.addEventListener('mouseup', e => {
  if (e.button === 2) { gs.isPanDragging = false; canvas.style.cursor = 'crosshair'; return; }
  gs.isDragging = false;
});

canvas.addEventListener('mouseleave', () => {
  gs.isDragging = gs.isPanDragging = false;
  gs.mouseGX = gs.mouseGY = -1;
  canvas.style.cursor = 'crosshair';
});

canvas.addEventListener('contextmenu', e => {
  e.preventDefault();
  if (gs.selectedTool) {
    gs.selectedTool = null;
    refreshToolButtons();
    setHint('Select a tool, then click the map!');
    SFX.click();
  }
});

document.addEventListener('keydown', e => {
  keysDown.add(e.key);

  if (e.key === 'Escape') {
    if (gs.selectedTool) {
      gs.selectedTool = null;
      refreshToolButtons();
      setHint('Select a tool, then click the map!');
      SFX.click();
    } else if (appState === 'playing') {
      pauseGame();
    } else if (appState === 'paused') {
      resumeGame();
    }
    return;
  }

  // Don't fire tool shortcuts when user is typing or game is not playing
  if (appState !== 'playing') return;
  if (e.ctrlKey || e.metaKey || e.altKey) return;

  if (e.key === 'z' || e.key === 'Z') { undo(); return; }

  const shortcuts = {
    f: 'fence', p: 'path', w: 'water',
    '1': 'donkey', '2': 'mega_donkey', '3': 'cheetah', '4': 'puffin',
    '5': 'lion',   '6': 'tiger',       '7': 'elephant','8': 'giraffe',
    '9': 'zebra',
    r: 'restaurant', i: 'ice_cream', g: 'gift_shop', n: 'snack_stand',
  };
  if (shortcuts[e.key]) selectTool(shortcuts[e.key]);
});

document.addEventListener('keyup', e => keysDown.delete(e.key));

// Convert mouse-event screen position → world grid position
function getGridPos(e) {
  const rect   = canvas.getBoundingClientRect();
  const scaleX = canvas.width  / rect.width;
  const scaleY = canvas.height / rect.height;
  // Canvas-pixel position of the cursor
  const sx = (e.clientX - rect.left) * scaleX;
  const sy = (e.clientY - rect.top)  * scaleY;
  // Undo the rotation that was applied around the viewport centre
  const vw = canvas.width, vh = canvas.height;
  const dx = sx - vw / 2, dy = sy - vh / 2;
  const c  = Math.cos(-camera.angle), s = Math.sin(-camera.angle);
  const rx = dx * c - dy * s;
  const ry = dx * s + dy * c;
  const wx = rx + vw / 2 + camera.x;
  const wy = ry + vh / 2 + camera.y;
  return { gx: Math.floor(wx / TILE_SIZE), gy: Math.floor(wy / TILE_SIZE) };
}

// ================================================================
//  UNDO SYSTEM
// ================================================================
const MAX_UNDO = 50;

function pushUndo(record) {
  gs.actionHistory.push(record);
  if (gs.actionHistory.length > MAX_UNDO) gs.actionHistory.shift();
}

function undo() {
  if (appState !== 'playing') return;
  if (!gs.actionHistory.length) { flash('Nothing to undo!'); return; }
  const record = gs.actionHistory.pop();
  SFX.click();

  if (record.kind === 'tile') {
    // Refund cost if we can determine it (approximate from tile type placed)
    const placed = gs.grid[record.gy][record.gx];
    const refundMap = {
      [TILE.FENCE]: TOOL_COST.fence,
      [TILE.PATH]: TOOL_COST.path,
      [TILE.WATER]: TOOL_COST.water,
      [TILE.RESTAURANT]: TOOL_COST.restaurant,
      [TILE.ICE_CREAM]: TOOL_COST.ice_cream,
      [TILE.GIFT_SHOP]: TOOL_COST.gift_shop,
      [TILE.SNACK_STAND]: TOOL_COST.snack_stand,
      [TILE.GRASS_FLOWER]: TOOL_COST.grass_flower,
      [TILE.GRASS_TREE]: TOOL_COST.grass_tree,
    };
    const refund = refundMap[placed] ?? 0;
    if (refund && placed !== record.prev) {
      gs.money += refund;
      if ([TILE.RESTAURANT, TILE.ICE_CREAM, TILE.GIFT_SHOP, TILE.SNACK_STAND].includes(placed)) gs.buildingCount = Math.max(0, gs.buildingCount - 1);
    }
    gs.grid[record.gy][record.gx] = record.prev;

  } else if (record.kind === 'large_bldg') {
    // Restore all tiles in footprint
    for (const t of record.prevTiles) gs.grid[t.gy][t.gx] = t.prev;
    // Remove building from array
    gs.largeBuildings.splice(record.bldgIndex, 1);
    gs.buildingCount = Math.max(0, gs.buildingCount - 1);
    // Refund
    const lb = gs.largeBuildings[record.bldgIndex]; // already removed, get def by guessing – refund stored cost
    // We refund based on the bldgIndex snapshot data not being available after splice,
    // so we store it in the undo record itself
    if (record.cost) gs.money += record.cost;

  } else if (record.kind === 'animal') {
    const idx = gs.animals.findIndex(a => a.id === record.animalId);
    if (idx !== -1) {
      const a = gs.animals[idx];
      gs.money += a.def.cost; // refund
      gs.animals.splice(idx, 1);
    }
  }
  updateUI();
  addFloat(canvas.width / 2 + camera.x, canvas.height / 3 + camera.y, '↩ Undone', '#aaa');
}

// ================================================================
//  LEVEL & XP SYSTEM
// ================================================================
function gainXP(amount) {
  gs.xp += amount;
  checkLevelUp();
}

function checkLevelUp() {
  if (gs.level >= LEVEL_DEFS.length) return; // max level
  if (gs.xp >= gs.xpToNext) {
    gs.xp -= gs.xpToNext;
    gs.level++;
    const ldef = LEVEL_DEFS[gs.level - 1] || LEVEL_DEFS[LEVEL_DEFS.length - 1];
    gs.xpToNext   = ldef.xpToNext;
    gs.unlockedCols = ldef.unlockedCols;
    SFX.fanfare();
    showEventPopup(`🎉 LEVEL UP! You are now Level ${gs.level}\n${ldef.label}\n\n${ldef.unlocks || ''}`, '#ffd700');
    refreshLockedButtons();
    updateUI();
    checkLevelUp(); // chain in case multiple levels gained at once
  }
}

// ================================================================
//  BEAUTY CALCULATION
// ================================================================
function updateBeauty(dt) {
  gs.beautyTimer -= dt;
  if (gs.beautyTimer > 0) return;
  gs.beautyTimer = 3000;
  let b = 0;
  for (let y = 0; y < GRID_H; y++)
    for (let x = 0; x < gs.unlockedCols; x++) {
      if (gs.grid[y][x] === TILE.GRASS_FLOWER) b += 1;
      if (gs.grid[y][x] === TILE.GRASS_TREE)   b += 2;
    }
  gs.beauty = b;
  // Beauty gives passive XP trickle
  if (b > 0) gainXP(Math.floor(b / 5));
}

// ================================================================
//  LOCKED BUTTON REFRESH
// ================================================================
function refreshLockedButtons() {
  // Large buildings gated by level
  for (const [key, def] of Object.entries(LARGE_BLDG_DEFS)) {
    const btn = document.getElementById(`btn-${key}`);
    if (!btn) continue;
    const locked = gs.level < def.minLevel;
    btn.disabled = locked;
    btn.classList.toggle('locked', locked);
    if (locked) btn.title = `🔒 Requires Level ${def.minLevel}`;
    else         btn.title = '';
  }
}

// ================================================================
//  MAIN GAME LOOP
// ================================================================
let lastTs = 0;

function gameLoop(ts) {
  const dt = Math.min(ts - lastTs, 100); // cap at 100ms to avoid spiral of death
  lastTs = ts;

  if (appState === 'playing') {
    updateCamera(dt);
    updateAnimals(dt);
    updateVisitors(dt);
    updateFloatingTexts(dt);
    updateVisitorSpawn(dt);
    updateRandomEvents(dt);
    updateIncomeRate(dt);
    updateBeauty(dt);
    updateUI();
  }

  render();
  requestAnimationFrame(gameLoop);
}

// ================================================================
//  INIT  (runs once on page load)
// ================================================================
function init() {
  // Size canvas to fill its container
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  // Start the render loop — appState is 'menu' so only drawMenuBackground fires
  requestAnimationFrame(ts => { lastTs = ts; gameLoop(ts); });

  // Attach tooltip titles to all tool buttons from TOOL_HINTS
  document.querySelectorAll('.tool-btn[id^="btn-"]').forEach(btn => {
    const toolKey = btn.id.replace('btn-', '');
    const hint = TOOL_HINTS[toolKey];
    if (hint) btn.title = hint;
  });

  console.log('🦁 Crazy-ASS Zoologists v2 loaded. Press Start to play!');
  console.log('Shortcuts: F=Fence P=Path W=Water 1-9=Animals R=Restaurant I=IceCream G=GiftShop N=SnackStand WASD=Pan');
}

window.addEventListener('load', init);
