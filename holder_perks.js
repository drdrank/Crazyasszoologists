'use strict';
// ================================================================
//  HOLDER PERKS MODULE
//  Exposes: window.HolderPerks
//
//  Called by wallet.js after NFT collection detection.
//  Game modules query this for active multipliers/bonuses.
//  Deliberately has NO direct dependency on game.js internals.
// ================================================================

// ── Per-collection perk definitions ──────────────────────────────
const PERK_DEFS = {
  donkey: {
    badge:      '🫏',
    badgeLabel: 'Donkey Holder',
    color:      '#9E9E9E',
    perks: [
      'Donkey Barn decorative unlock',
      'Donkey exhibits +10% happiness bonus',
      'Donkey-themed cosmetic badge',
    ],
    // Multiplier applied to appeal of this animal type near visitors
    animalMultiplier: { type: 'donkey', bonus: 0.10 },
    decorativeUnlock: 'donkey_barn',
  },

  mega_donkey: {
    badge:      '🐴',
    badgeLabel: 'Mega Donkey Holder',
    color:      '#5D4037',
    perks: [
      'Mega Donkey statue unlock',
      'Rare crowd-attraction event (Mega Donkey Parade)',
      'Mega Donkey badge',
    ],
    animalMultiplier: { type: 'mega_donkey', bonus: 0.15 },
    decorativeUnlock: 'mega_donkey_statue',
    eventUnlock:      'mega_donkey_parade',
  },

  cheetah: {
    badge:      '🐆',
    badgeLabel: 'Cheetah Holder',
    color:      '#FFA726',
    perks: [
      'Cheetah Track cosmetic unlock',
      'Cheetah exhibits +10% attraction bonus',
      'Cheetah badge',
    ],
    animalMultiplier: { type: 'cheetah', bonus: 0.10 },
    decorativeUnlock: 'cheetah_track',
  },

  puffin: {
    badge:      '🐧',
    badgeLabel: 'Poppin Puffins Holder',
    color:      '#37474F',
    perks: [
      'Puffin Paradise decorative unlock',
      'All visitors stay 5% longer (family happiness bonus)',
      'Puffin badge',
    ],
    // Bonus added to visitor lifetime multiplier (additive)
    visitorLifetimeBonus: 0.05,
    animalMultiplier: { type: 'puffin', bonus: 0.10 },
    decorativeUnlock: 'puffin_paradise',
  },
};

// ── Combination (combo) perk tiers ───────────────────────────────
const COMBO_TIERS = [
  { count: 2, badge: '✨', label: 'Duo Holder',         reward: 'Special profile frame'                      },
  { count: 3, badge: '⭐', label: 'Trio Holder',        reward: 'Exclusive decorative unlock'                 },
  { count: 4, badge: '🦁', label: 'Master Zoologist',  reward: 'Legendary cosmetic + Master Zoologist badge' },
];

// ── Module ────────────────────────────────────────────────────────
window.HolderPerks = (() => {
  let _flags       = {};   // { donkey: bool, mega_donkey: bool, cheetah: bool, puffin: bool }
  let _animalMults = {};   // { 'donkey': 1.10, 'cheetah': 1.10, … }
  let _visitorBonus = 0;   // additive lifetime multiplier
  let _eventUnlocks = [];
  let _comboBadge   = null;

  // ── Apply new collection flags (called by wallet.js) ─────────────
  function apply(collectionFlags) {
    _flags        = { ...collectionFlags };
    _animalMults  = {};
    _visitorBonus = 0;
    _eventUnlocks = [];
    _comboBadge   = null;

    for (const [key, def] of Object.entries(PERK_DEFS)) {
      if (!_flags[key]) continue;
      if (def.animalMultiplier) {
        _animalMults[def.animalMultiplier.type] =
          1 + (def.animalMultiplier.bonus);
      }
      if (def.visitorLifetimeBonus) _visitorBonus += def.visitorLifetimeBonus;
      if (def.eventUnlock)          _eventUnlocks.push(def.eventUnlock);
    }

    // Highest applicable combo tier
    const count = Object.values(_flags).filter(Boolean).length;
    for (const tier of [...COMBO_TIERS].reverse()) {
      if (count >= tier.count) { _comboBadge = tier; break; }
    }

    _notifyUnlocks();
  }

  function _notifyUnlocks() {
    const active = getActiveBadges();
    if (!active.length) return;
    const lines = active.map(b => `${b.badge} ${b.label}`).join('\n');
    // flash() is defined in game.js; guard in case perks apply before the game starts
    if (typeof window.flash === 'function') {
      window.flash(`🎉 NFT Perks Active!\n${lines}`);
    }
  }

  // ── Gameplay queries (called by game.js) ──────────────────────────

  // Multiplier for a specific animal type's appeal near visitors.
  // Returns 1.0 (no change) if the perk isn't active.
  function getAnimalIncomeMultiplier(animalType) {
    return _animalMults[animalType] ?? 1.0;
  }

  // Additive fraction to extend visitor lifetime (e.g. 0.05 = +5%)
  function getVisitorLifetimeBonus() {
    return _visitorBonus;
  }

  function isEventUnlocked(eventKey) {
    return _eventUnlocks.includes(eventKey);
  }

  // ── Badge queries (called by leaderboard.js) ──────────────────────

  // Returns array of { badge, label, key, color } for active collections + combo
  function getActiveBadges() {
    const result = [];
    for (const [key, def] of Object.entries(PERK_DEFS)) {
      if (_flags[key]) result.push({ badge: def.badge, label: def.badgeLabel, key, color: def.color });
    }
    if (_comboBadge) {
      result.push({ badge: _comboBadge.badge, label: _comboBadge.label, key: 'combo', color: '#ffd700' });
    }
    return result;
  }

  // Compact badge string for a given set of collection flags (for leaderboard rows)
  function badgesForFlags(flagsObj) {
    if (!flagsObj) return '';
    let out = '';
    for (const [key, def] of Object.entries(PERK_DEFS)) {
      if (flagsObj[key]) out += def.badge;
    }
    const count = Object.values(flagsObj).filter(Boolean).length;
    for (const tier of [...COMBO_TIERS].reverse()) {
      if (count >= tier.count) { out += tier.badge; break; }
    }
    return out;
  }

  // ── Getters ───────────────────────────────────────────────────────
  function getActiveFlags() { return { ..._flags }; }

  // Human-readable perk list for the UI
  function getPerkList() {
    const lines = [];
    for (const [key, def] of Object.entries(PERK_DEFS)) {
      if (_flags[key]) {
        lines.push(`${def.badge} ${def.badgeLabel}:`);
        def.perks.forEach(p => lines.push(`  · ${p}`));
      }
    }
    if (_comboBadge) {
      lines.push(`${_comboBadge.badge} ${_comboBadge.label}: ${_comboBadge.reward}`);
    }
    return lines;
  }

  // Expose static defs so UI can render perk descriptions before connecting
  function getPerkDefs()  { return PERK_DEFS; }
  function getComboTiers(){ return COMBO_TIERS; }

  return {
    apply,
    getAnimalIncomeMultiplier,
    getVisitorLifetimeBonus,
    isEventUnlocked,
    getActiveBadges,
    badgesForFlags,
    getActiveFlags,
    getPerkList,
    getPerkDefs,
    getComboTiers,
  };
})();
