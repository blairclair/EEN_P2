/* =========================================================================
 * ch16 "They Saved Each Other": the final chapter.
 *
 * ENDING GATE (CHAPTERS.md §5, evaluated once at the top of start()):
 *   1. f_killed_trader == true  -> Alternate B "Annette's Lesson"   (runAltB)
 *   2. else m_waverly < 35      -> Alternate A "The New Leader"     (runAltA)
 *   3. else                     -> Canonical "They Saved Each Other" (runCanon)
 * Each branch ends with an ending card + a short in-fiction roll, then
 * api.completeChapter(). The engine then shows THE END + the manifest credits
 * and returns to the title (on ?chapter=ch16&auto=1 it goes straight to title).
 *
 * Canonical structure:
 *   Part 1 (as Waverly, third-person limited): Columbus House, 14 Jan - 8 Feb.
 *     Calls with Trader (the "steering" dialogue minigame, hidden trust bar
 *     ch16_trust), the phone parcel, bathroom-stall stealth, the interview
 *     question test, the HQ search fit (mash QTE), Momma's counting reply
 *     (decode), "Grandma is the key", encoding Notes 2 and 3 (custom encode
 *     minigame), the last call ("Stand up to your bully"), the escape (stealth),
 *     Markus at the fence, the trucker, the gas station.
 *   Part 2 (as Luna): reunion, sirens, standing together, the squad car
 *     (custom latch minigame), the woods.
 *   Epilogue (spring 2086): the cabin, "Uncle Zey", the banana headline, the
 *     resistance meeting, the password door, the unmasking.
 *
 * Cross-chapter flags READ (CHAPTERS §2 registry; none are written, end of game):
 *   m_waverly, f_killed_trader, f_called_top_number, f_code_reply_sent,
 *   f_note2_decoded, f_note3_decoded, f_trader_note_left, f_markus_deal,
 *   f_salina_forgiven, f_comforted_john, m_audience, m_isaiah
 * Chapter-local flags: ch16_* (ch16_trust = hidden Trader trust bar, ch16_day,
 *   ch16_learn_*, ch16_ending, ...).
 *
 * Testing all three endings: in dev or autoplay mode, the URL param
 *   ch16preset=canon | A | B | lean | full
 * overrides the gate flags before the gate runs (see applyPreset).
 *
 * Shared maps: SHARED_STATUS fixes columbus_dorm / columbus_office /
 * columbus_yard / dpe_hq_lobby but they do not exist yet. The ids are kept in
 * ROOM below; this chapter registers its own staged versions under those ids
 * (positions are scene-critical, see the report to main).
 * ========================================================================= */
(function () {
  'use strict';

  /* Room ids (shared ids where SHARED_STATUS defines one). */
  var ROOM = {
    dorm: 'columbus_dorm', lounge: 'columbus_lounge', office: 'columbus_office', yard: 'columbus_yard', hq: 'dpe_hq_lobby',
    bath: 'columbus_bathroom', station: 'gas_station', shop: 'gas_shop', woods: 'woods',
    cabin: 'cabin', lot: 'warehouse_lot', hall: 'resistance_hall', stage: 'inauguration'
  };

  /* ---------------------------------------------------------------------
   * Custom tiles
   * ------------------------------------------------------------------- */
  var tiles = {
    fence: { solid: true, draw: function (g, x, y) {
      g.fillStyle = '#1c2a1c'; g.fillRect(x, y, 16, 16);
      g.fillStyle = '#7a8088';
      for (var i = 0; i < 16; i += 4) { g.fillRect(x + i, y + 2, 1, 14); }
      for (var j = 3; j < 16; j += 4) { g.fillRect(x, y + j, 16, 1); }
      g.fillStyle = '#a0a6ae'; g.fillRect(x, y + 1, 16, 1);
    } },
    tree: { solid: true, draw: function (g, x, y, info) {
      g.fillStyle = '#0e1a10'; g.fillRect(x, y, 16, 16);
      g.fillStyle = '#183020'; g.fillRect(x + 1, y + 1, 14, 11);
      g.fillStyle = '#21402a'; g.fillRect(x + 3, y + 2, 9, 7);
      g.fillStyle = '#3a2a1c'; g.fillRect(x + 7, y + 12, 3, 4);
      if (info.r > 0.6) { g.fillStyle = '#2a5034'; g.fillRect(x + 4, y + 3, 3, 2); }
    } },
    meadow: { draw: function (g, x, y, info) {
      g.fillStyle = '#4a7a3a'; g.fillRect(x, y, 16, 16);
      g.fillStyle = '#5a8a44'; g.fillRect(x + 2, y + 5, 2, 1); g.fillRect(x + 10, y + 11, 2, 1);
      var cols = ['#f2d24a', '#e8e4f0', '#c86ad8', '#f27a6a'];
      g.fillStyle = cols[Math.floor(info.r * 4)]; g.fillRect(x + 4 + Math.floor(info.r * 8), y + 3 + Math.floor(info.r * 9), 2, 2);
      g.fillStyle = cols[Math.floor(info.r * 7) % 4]; g.fillRect(x + 11 - Math.floor(info.r * 6), y + 9, 1, 1);
    } },
    pump: { solid: true, draw: function (g, x, y) {
      g.fillStyle = '#3a3a40'; g.fillRect(x, y, 16, 16);
      g.fillStyle = '#6a2a2a'; g.fillRect(x + 4, y + 1, 8, 14);
      g.fillStyle = '#1a1a1a'; g.fillRect(x + 5, y + 3, 6, 4);
      g.fillStyle = '#8a8a8a'; g.fillRect(x + 12, y + 6, 2, 6);
    } },
    vending: { solid: true, anim: true, draw: function (g, x, y, info) {
      g.fillStyle = '#20242c'; g.fillRect(x, y, 16, 16);
      g.fillStyle = '#c83a2a'; g.fillRect(x + 1, y, 14, 16);
      var a = 0.75 + 0.25 * Math.sin(info.t * 2.3);
      g.fillStyle = 'rgba(255,240,200,' + a + ')'; g.fillRect(x + 3, y + 2, 7, 10);
      g.fillStyle = '#2a1a10'; g.fillRect(x + 4, y + 3, 2, 2); g.fillRect(x + 7, y + 3, 2, 2); g.fillRect(x + 4, y + 7, 2, 2); g.fillRect(x + 7, y + 7, 2, 2);
      g.fillStyle = '#e8e4d8'; g.fillRect(x + 11, y + 4, 2, 4);
    } },
    asphalt: { color: '#1e1f24', color2: '#26272e', pattern: 'noise' },
    steeldoor: { solid: false, door: true, draw: function (g, x, y) {
      g.fillStyle = '#3a3e46'; g.fillRect(x, y, 16, 16);
      g.fillStyle = '#5a5e66'; g.fillRect(x + 2, y + 1, 12, 15);
      g.fillStyle = '#2a2c30'; g.fillRect(x + 3, y + 5, 10, 1); g.fillRect(x + 11, y + 9, 2, 2);
    } },
    planks: { color: '#5a4030', color2: '#4a3424', pattern: 'planks' },
    hqtile: { color: '#2a5a8a', color2: '#3a6a9a', pattern: 'tiles' }
  };

  /* ---------------------------------------------------------------------
   * Props
   * ------------------------------------------------------------------- */
  var props = {
    squadcar: function (g, x, y, t) {
      g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(x - 6, y + 13, 44, 4);
      g.fillStyle = '#e8e4dc'; g.fillRect(x - 4, y + 2, 40, 12);
      g.fillStyle = '#1a1a20'; g.fillRect(x - 4, y + 7, 40, 3);
      g.fillStyle = '#2a3a4a'; g.fillRect(x + 6, y - 3, 18, 6);
      var on = Math.floor(t * 6) % 2;
      g.fillStyle = on ? '#ff2a2a' : '#5a1010'; g.fillRect(x + 9, y - 6, 5, 3);
      g.fillStyle = on ? '#1a2a5a' : '#3a6aff'; g.fillRect(x + 15, y - 6, 5, 3);
      g.fillStyle = '#0a0a0a'; g.fillRect(x, y + 12, 6, 4); g.fillRect(x + 26, y + 12, 6, 4);
    },
    truck: function (g, x, y) {
      g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(x - 20, y + 13, 56, 4);
      g.fillStyle = '#7a5a2a'; g.fillRect(x - 20, y - 6, 34, 20);
      g.fillStyle = '#2a4a6a'; g.fillRect(x + 14, y - 2, 18, 16);
      g.fillStyle = '#9ac8e8'; g.fillRect(x + 22, y + 1, 8, 5);
      g.fillStyle = '#f2e28a'; g.fillRect(x + 30, y + 8, 2, 3);
      g.fillStyle = '#0a0a0a'; g.fillRect(x - 14, y + 12, 7, 4); g.fillRect(x + 20, y + 12, 7, 4);
    },
    streetlamp: function (g, x, y, t, obj) {
      g.fillStyle = '#3a3a40'; g.fillRect(x + 7, y - 14, 2, 30);
      g.fillStyle = '#5a5a60'; g.fillRect(x + 3, y - 16, 10, 3);
      if (obj && obj.lit) { g.fillStyle = 'rgba(255,220,140,0.9)'; g.fillRect(x + 4, y - 13, 8, 1); }
    },
    roadsign: function (g, x, y) {
      g.fillStyle = '#5a5a60'; g.fillRect(x + 7, y + 2, 2, 14);
      g.fillStyle = '#1a6a3a'; g.fillRect(x - 2, y - 4, 20, 8);
      g.fillStyle = '#e8e4dc'; g.fillRect(x, y - 2, 16, 1); g.fillRect(x, y + 1, 10, 1);
    },
    gallows: function (g, x, y) {
      g.fillStyle = '#3a2a1c'; g.fillRect(x - 8, y + 4, 32, 4);
      g.fillStyle = '#4a3424'; g.fillRect(x - 6, y - 26, 3, 30); g.fillRect(x - 6, y - 26, 22, 3);
      g.fillStyle = '#b8a07a'; g.fillRect(x + 12, y - 23, 1, 14);
      g.fillStyle = '#b8a07a'; g.fillRect(x + 10, y - 10, 5, 4);
    },
    gobag: function (g, x, y) {
      g.fillStyle = '#3a4a2a'; g.fillRect(x + 3, y + 5, 10, 10);
      g.fillStyle = '#2a3a1c'; g.fillRect(x + 5, y + 3, 6, 3);
      g.fillStyle = '#1a1a10'; g.fillRect(x + 3, y + 9, 10, 1);
    },
    stone: function (g, x, y) {
      g.fillStyle = '#8a8a90'; g.fillRect(x + 4, y + 7, 8, 7);
      g.fillStyle = '#9a9aa0'; g.fillRect(x + 5, y + 3, 2, 5); g.fillRect(x + 9, y + 3, 2, 5);
      g.fillStyle = '#e8e0f0'; g.fillRect(x + 6, y + 13, 4, 1);
    },
    candle: function (g, x, y, t) {
      g.fillStyle = '#e8e4d8'; g.fillRect(x + 7, y + 8, 3, 6);
      g.fillStyle = (Math.floor(t * 8) % 2) ? '#f2b33d' : '#f2d24a'; g.fillRect(x + 8, y + 5, 1, 3);
    },
    mouse: function (g, x, y, t) {
      var dx = Math.floor((t * 3) % 6);
      g.fillStyle = '#7a6a5a'; g.fillRect(x + 4 + dx, y + 11, 4, 3);
      g.fillStyle = '#5a4a3a'; g.fillRect(x + 3 + dx, y + 12, 1, 1); g.fillRect(x + 8 + dx, y + 12, 3, 1);
    },
    newspaper: function (g, x, y) {
      g.fillStyle = '#d8d0c0'; g.fillRect(x + 3, y + 6, 10, 7);
      g.fillStyle = '#4a4a4a'; g.fillRect(x + 4, y + 7, 8, 1); g.fillRect(x + 4, y + 9, 5, 1); g.fillRect(x + 4, y + 11, 7, 1);
    },
    cocoa: function (g, x, y) {
      g.fillStyle = '#e8e4d8'; g.fillRect(x + 6, y + 8, 4, 5);
      g.fillStyle = '#6a3a1a'; g.fillRect(x + 6, y + 8, 4, 1);
    }
  };

  /* ---------------------------------------------------------------------
   * Cast additions (shared ids are used for everyone recurring)
   * ------------------------------------------------------------------- */
  var cast = {
    martha: { name: 'Martha Thompson', skin: '#f0d0b8', hair: '#c89048', hairStyle: 'ponytail', outfit: '#8a8a8a', outfit2: '#5a5a62', style: 'casual', height: 'short', build: 'broad', voice: 640 },
    director: { name: 'The Director', skin: '#e0b090', hair: '#5a5a5a', hairStyle: 'bald', outfit: '#5a5a4a', outfit2: '#3a3a3a', style: 'suit', accessory: ['glasses', 'tie'], build: 'broad', voice: 300 },
    trucker: { name: 'Trucker', skin: '#c89070', hair: '#6a4a2a', hairStyle: 'short', outfit: '#8a3a2a', outfit2: '#2a3a5a', style: 'casual', accessory: ['cap', 'beard'], build: 'broad', voice: 240 },
    waverly13: { extends: 'waverly', name: 'Waverly', outfit: '#d8b84a', outfit2: '#4a5a7a', height: 'short' },
    isaiah_zey: { extends: 'isaiah', accessory: ['glasses', 'beard'], outfit: '#4a5a4a', outfit2: '#2a2a30', style: 'coat' },
    isaiah_run: { extends: 'isaiah', accessory: null },
    luna_free: { extends: 'luna', outfit: '#5a6a5a', outfit2: '#3a3a44', style: 'casual', overlay: ['freckles'] },
    luna_mask: { extends: 'luna', outfit: '#2a2a30', outfit2: '#2a2a30', style: 'coat', overlay: ['mask_plain'] },
    waverly_mask: { extends: 'waverly', outfit: '#d8b84a', outfit2: '#4a5a7a', overlay: ['mask_plain'] },
    zey_mask: { extends: 'isaiah', accessory: ['beard'], outfit: '#4a5a4a', outfit2: '#2a2a30', style: 'coat', overlay: ['mask_plain'] },
    doorman: { name: 'Doorman', skin: '#a46a45', hair: '#1a1412', hairStyle: 'buzz', outfit: '#1a1a20', outfit2: '#1a1a20', style: 'coat', height: 'tall', build: 'broad', voice: 200, overlay: ['mask_plain'] },
    rhost: { name: 'Masked Host', skin: '#e8c0a0', hair: '#2a1a12', hairStyle: 'long', outfit: '#1a1a20', outfit2: '#1a1a20', style: 'dress', voice: 520, overlay: ['mask_plain'] },
    newsman: { name: 'EEN Anchor', skin: '#f0d0b8', hair: '#2a2a2a', hairStyle: 'slick', outfit: '#1a2a4a', outfit2: '#1a2a4a', style: 'suit', accessory: ['tie', 'mic'], voice: 320 },
    tb_isaiah: { extends: 'tb', name: 'True Believer', overlay: ['mask_mouse', 'gloves_black'] }
  };

  function masked(seed) { var s = G.shared && G.shared.extra ? G.shared.extra('citizen', 'ch16res' + seed) : { name: 'Member' }; s.name = 'Member'; s.overlay = ['mask_plain']; return s; }
  function kidSpec(seed, name) { var s = G.shared && G.shared.extra ? G.shared.extra('kid', 'ch16kid' + seed) : { height: 'child' }; if (name) s.name = name; return s; }
  function citizen(seed) { return G.shared && G.shared.extra ? G.shared.extra('citizen', 'ch16cit' + seed) : { name: 'Citizen' }; }

  /* ---------------------------------------------------------------------
   * MAPS
   * ------------------------------------------------------------------- */
  // Columbus House dorm: classroom-sized, 20 bunks, a wall TV.
  // Columbus House: SHARED maps (play/shared/loc_gym_offsite.js) dressed for ch16.
  // Topology: dorm -> lounge -> office / yard; the bathrooms are up the lounge stairs (chapter map).
  var LOCK_TXT = [{ think: 'Not now. Someone would notice.', name: 'Waverly' }];
  // G.shared.map applies `remove` AFTER appending ext lists, so a same-id replacement would be stripped too.
  // Remove first, then append our entities ourselves.
  function sharedOr(id, ext, fallback) {
    if (!(G.shared && G.shared.has && G.shared.has(id))) return fallback;
    var m = G.shared.map(id, { remove: ext.remove || [] });
    Object.keys(ext).forEach(function (k) {
      if (k === 'remove') return;
      if (['npcs', 'objects', 'zones', 'exits', 'lights'].indexOf(k) >= 0) m[k] = (m[k] || []).concat(ext[k]);
      else m[k] = ext[k];
    });
    return m;
  }
  var MINI = { name: 'Columbus House', tiles: ['##########', '#........#', '#........#', '#........#', '####D#####'] };

  var dorm = sharedOr(ROOM.dorm, {
    name: 'Columbus House: Dorm',
    remove: ['bunk_luna', 'dorm_tv', 'to_columbus_lounge'],
    npcs: [
      { id: 'martha', spec: 'martha', at: [9, 4], facing: 'down', if: 'ch16_day == 1' },
      { id: 'crony1', spec: kidSpec(1, 'Older Girl'), at: [8, 5], facing: 'right', if: 'ch16_day == 1' },
      { id: 'crony2', spec: kidSpec(2, 'Older Girl'), at: [10, 5], facing: 'left', if: 'ch16_day == 1' },
      { id: 'markus', spec: 'markus', at: [12, 5], facing: 'left', if: 'ch16_day <= 3' },
      { id: 'kid_a', spec: kidSpec(3, 'Little Kid'), at: [11, 8], wander: true, radius: 1, if: 'ch16_day <= 3',
        talk: [['kid_a', 'Your mom\'s on the TV. Is it true she\'s a murderer?'], { think: 'She isn\'t. She isn\'t she isn\'t she isn\'t.', name: 'Waverly' }] },
      { id: 'kid_b', spec: kidSpec(4, 'Kid'), at: [5, 8], wander: true, radius: 2, if: 'ch16_day <= 3',
        talk: [['kid_b', 'Don\'t use the second-floor bathrooms. The big kids charge.']] },
      { id: 'care', spec: 'care_android', at: [8, 7], facing: 'down', if: 'ch16_day == 1',
        talk: [['care', 'Resident 1144. Your attendance is required in the director\'s office.']] }
    ],
    objects: [
      { id: 'dorm_tv', at: [8, 1], examine: async function (api) {
          await api.tv({ speaker: 'trader_host', headline: 'RIGHT TO LIFE', text: 'Seven sinners, one way out! Tune in nightly, citizens. Your vote is your voice!', tag: 'LIVE' });
          await api.think('Momma is in there somewhere. Behind all the lights.', { name: 'Waverly' });
          api.set('ch16_d1_looked', true);
        } },
      { id: 'my_bunk', at: [2, 3], examine: async function (api) {
          if (!api.has('ch16_bunk_seen')) { api.set('ch16_bunk_seen', true); await api.think('Someone scratched L.B. into the bed frame a long time ago. Waverly likes to pretend it stands for "Lions, Bartley".', { name: 'Waverly' }); }
          await notebook(api); api.set('ch16_d1_looked', true); if (api.get('ch16_day', 0) === 2) api.set('ch16_d2_bunk', true);
        } },
      { id: 'martha_bunk', at: [14, 3], examine: 'Martha Thompson\'s bunk. Three blankets. Everyone else gets one.' }
    ],
    exits: [{ id: 'to_columbus_lounge', at: [8, 11], to: ROOM.lounge, toAt: [3, 2], facing: 'down', locked: 'ch16_lockOffice && ch16_lockBath', lockedText: LOCK_TXT }]
  }, MINI);

  var lounge = sharedOr(ROOM.lounge, {
    name: 'Columbus House: Lounge',
    remove: ['to_columbus_dorm', 'to_columbus_office', 'to_columbus_yard', 'to_columbus_closet'],
    objects: [{ id: 'stairs_up', at: [3, 2], examine: 'Up the stairs: the second floor and the bathrooms. The good ones cost money. The bad ones are free.' }],
    exits: [
      { id: 'to_columbus_dorm', at: [2, 1], to: ROOM.dorm, toAt: [8, 10], facing: 'up', locked: 'ch16_lockDorm', lockedText: [{ think: 'Not yet.', name: 'Waverly' }] },
      { id: 'to_columbus_bathroom', at: [3, 1], to: ROOM.bath, toAt: [6, 5], facing: 'up', locked: 'ch16_lockBath', lockedText: LOCK_TXT },
      { id: 'to_columbus_office', at: [13, 5], to: ROOM.office, toAt: [1, 3], facing: 'right', locked: 'ch16_lockOffice', lockedText: LOCK_TXT },
      { id: 'to_columbus_closet', at: [5, 1], to: ROOM.lounge, toAt: [5, 2], locked: function () { return true; }, lockedText: [{ think: 'The punishment closet. Momma got locked in there once. Three days. Waverly doesn\'t go near it.', name: 'Waverly' }] },
      { id: 'to_columbus_yard', at: [7, 9], to: ROOM.yard, toAt: [9, 12], locked: function () { return true; }, lockedText: [{ think: 'The back door is alarmed after nine. Not yet.', name: 'Waverly' }] }
    ]
  }, MINI);

  var office = sharedOr(ROOM.office, {
    name: 'Columbus House: Director\'s Office',
    remove: ['to_columbus_lounge'],
    npcs: [{ id: 'director', spec: 'director', at: [5, 1], facing: 'down', talk: [['director', 'Don\'t touch anything. Take the call. Go back to bed.']] }],
    objects: [{ id: 'certificate', at: [6, 1], examine: 'A certificate: COLUMBUS HOUSE, FORTY YEARS OF CARE. Someone has drawn a moustache on the governor.' }],
    exits: [{ id: 'to_columbus_lounge', at: [0, 3], to: ROOM.lounge, toAt: [12, 5], facing: 'left', locked: 'ch16_lockDorm', lockedText: [{ think: 'The phone first.', name: 'Waverly' }] }]
  }, { name: 'Office', tiles: ['########', '#..d...#', '#......#', '########'], objects: [{ id: 'house_phone', at: [4, 1], prop: 'phone' }] });

  var bath = {
    name: 'Columbus House: Bad Bathroom',
    tiles: [
      'QQQQQQQQQQQQ',
      'Qt:Qt:Qt:QMQ',
      'Q::Q::Q::Q:Q',
      'Q::::::::::Q',
      'Q::::::::::Q',
      'QSS:SS:::::Q',
      'QQQQQQDQQQQQ'
    ],
    ambient: 'drone', tint: '#203040', tintAlpha: 0.2, dark: 0.45, lights: [{ at: [6, 3], r: 60, flicker: true }], playerLight: 30,
    objects: [
      { id: 'stall', at: [7, 2], prop: 'sparkle', solid: false },
      { id: 'mirror', at: [10, 1] },
      { id: 'sinks', at: [1, 5], examine: 'One tap works. It runs brown for ten seconds, then clear. Like counting to seven, Momma would say.' }
    ],
    exits: [{ id: 'to_columbus_lounge', at: [6, 6], to: ROOM.lounge, toAt: [3, 2], facing: 'down', locked: 'ch16_lockDorm', lockedText: [{ think: 'Not yet.', name: 'Waverly' }] }]
  };

  var yard = sharedOr(ROOM.yard, {
    name: 'Columbus House: Back Yard',
    remove: ['to_woods', 'to_columbus_lounge'],
    ambient: 'static', dark: 0.72, tint: '#102030', tintAlpha: 0.3, playerLight: 34, lights: [{ at: [9, 12], r: 40 }],
    npcs: [{ id: 'markus_y', spec: 'markus', at: [14, 3], facing: 'down' }],
    exits: [
      { id: 'to_woods', at: [14, 0], to: ROOM.woods, toAt: [0, 3], facing: 'right', locked: '!ch16_overFence', lockedText: [{ think: 'Nine feet of wire. Not alone.', name: 'Waverly' }] },
      { id: 'to_columbus_lounge', at: [9, 13], to: ROOM.lounge, toAt: [7, 8], locked: function () { return true; }, lockedText: [{ think: 'No. Not back in there. Not ever.', name: 'Waverly' }] }
    ]
  }, MINI);


  var hq = {
    name: 'DPE Headquarters: Lobby',
    tiles: [
      'QQQQQQQQQQQQQQ',
      'Qqqqqqqqqqqqqq',
      'Qqqqqppqqqqqqq',
      'Qqqqqqqqqqqqqq',
      'Qqqqqqqqqqqqqq',
      'Qqqqqqqqqqqqqq',
      'QQQQQQQDQQQQQQ'
    ],
    legend: { 'q': 'ch16:hqtile' },
    ambient: 'hum', tint: '#1a2a4a', tintAlpha: 0.1,
    npcs: [
      { id: 'ginerva', spec: 'ginerva', at: [6, 3], facing: 'down' },
      { id: 'trader_hq', spec: 'trader', at: [9, 2], facing: 'left' },
      { id: 'fam1', spec: citizen(1), at: [2, 4], facing: 'up' },
      { id: 'fam2', spec: citizen(2), at: [11, 4], facing: 'up' },
      { id: 'guard_hq', spec: 'guard_android', at: [12, 1], facing: 'down' }
    ],
    objects: [
      { id: 'hq_sign', at: [3, 0], examine: 'TRESPASSING ON GOVERNMENT PROPERTY MAY BE PUNISHED WITH PARTICIPATION IN MANDATORY PUNITIVE ENTERTAINMENT.' }
    ]
  };

  // Gas station on Old Mill Road, 22x14 (canon: 20x14 + a verge).
  var station = {
    name: 'Old Mill Road: Gas Station',
    tiles: [
      '""BBBBWWBBDBBBBBB"""""',
      '""B_____________vB""""',
      '""______________n_""""',
      '""________________""""',
      '""____P_____P_____""""',
      '""________________""""',
      '""____P_____P_____""""',
      '""________________""""',
      '""________________""""',
      '----------------------',
      '======================',
      '======================',
      '----------------------',
      'AAAAAAAAAAAAAAAAAAAAAA'
    ],
    legend: { 'P': 'ch16:pump', 'v': 'ch16:vending', 'A': 'ch16:tree', '_': 'ch16:asphalt' },
    ambient: 'drone', dark: 0.6, tint: '#101828', tintAlpha: 0.25, playerLight: 36,
    lights: [{ at: [16, 2], r: 52 }],
    npcs: [],
    objects: [
      { id: 'vend', at: [16, 1] },
      { id: 'bench', at: [16, 2] },
      { id: 'shopwin', at: [6, 0], examine: 'CLOSED. The shelves inside are bare except for a calendar from four years ago.' },
      { id: 'shopdoor', at: [10, 0], examine: 'Chained shut. A sign: NO RESTROOM. NO EXCEPTIONS.' },
      { id: 'pump1', at: [6, 4], examine: 'The pump reads $0.00 and has for a long time.' },
      { id: 'pump2', at: [12, 6], examine: 'Someone has taped a flyer to it: VOTE TO SAVE. YOUR VOICE, THEIR LIFE.' },
      { id: 'lamp', at: [19, 8], prop: 'streetlamp', solid: true, examine: 'A dead streetlamp. The bulb is long gone.' },
      { id: 'sign', at: [1, 8], prop: 'roadsign', solid: true, examine: 'OLD MILL RD. Someone has shot three holes through the O.' }
    ]
  };

  var shop = {
    name: 'Gas Station: Inside',
    tiles: [
      '##########',
      '#kKK..KKk#',
      '#........#',
      '#..K..K..#',
      '#........#',
      '####D#####'
    ],
    ambient: 'tension', dark: 0.5, tint: '#1a1020', tintAlpha: 0.2, lights: [{ at: [5, 2], r: 50 }],
    npcs: [
      { id: 'humbert', spec: 'humbert', at: [5, 2], facing: 'down' },
      { id: 'hman1', spec: 'tb_boar', at: [2, 2], facing: 'down' },
      { id: 'hman2', spec: 'tb_hippo', at: [8, 2], facing: 'down' }
    ]
  };

  var woods = {
    name: 'The Woods',
    tiles: [
      'AAAAAAAAAAAAAAAAAAAAAAAA',
      'AA"""A"""""AA"""""A"""AA',
      '"""""""""A""""""A"""""""',
      '""A""""""""""A""""""A"""',
      '""""""A""""""""""""""""""'.slice(0, 24),
      '"A""""""""A"""""A"""""A"',
      'AAA"""A"""""AA"""""A""AA',
      'AAAAAAAAAAAAAAAAAAAAAAAA'
    ],
    legend: { 'A': 'ch16:tree' },
    ambient: 'static', dark: 0.75, tint: '#08101a', tintAlpha: 0.35, playerLight: 40,
    zones: [{ id: 'treeline', at: [23, 2], w: 1, h: 4 }]
  };

  // Cabin: interior (left) + meadow (right).
  var cabin = {
    name: 'The Cabin',
    tiles: [
      '###W##W###""""""""""""',
      '#KOS....b#mmmmmmmmmmmm',
      '#.......b#mmmmmmmmmmmm',
      '#........Dmmmmmmmmmmmm',
      '#..TT..b.#mmmmmmmmmmmm',
      '#..TT..b.#mmmmmmmmmAmm',
      '#........#mmmmmmmmmmmm',
      '##########mmmmmmmmmmmm'
    ],
    legend: { 'm': 'ch16:meadow', 'A': 'ch16:tree' },
    ambient: null, tint: '#f2d8a0', tintAlpha: 0.06,
    npcs: [],
    objects: [
      { id: 'gobag', at: [8, 3], prop: 'gobag', solid: true, examine: 'The go-bag. Two changes of clothes, water, a map, cash in a sock. It never gets unpacked.' },
      { id: 'cots', at: [8, 1], examine: 'Two cots. Waverly\'s has a stuffed bear on it. Bartholomew made it out. Isaiah went back for him.' },
      { id: 'cwin', at: [3, 0], examine: 'The window looks out on the meadow. No cameras. Luna still checks for them every morning.' },
      { id: 'stove', at: [2, 1] },
      { id: 'candle', at: [5, 1], prop: 'candle', solid: false, if: 'f_comforted_john', examine: async function (api) {
          await api.think('A candle for John. He wanted someone to tell him it was okay to stop being afraid. I told him. I hope it counted.');
        } },
      { id: 'bunnystone', at: [19, 2], prop: 'stone', if: 'f_salina_forgiven', examine: async function (api) {
          await api.think('A stone shaped like a bunny\'s ears. Salina\'s marker, as near as I can make it. Delphin would have laughed at it. Then he\'d have cried.');
          await api.think('We forgave each other, in the end. That has to be worth something to the dead.');
        } },
      { id: 'mouse', at: [15, 4], prop: 'mouse', solid: false }
    ]
  };

  var lot = {
    name: 'A Lot, an Hour Away',
    tiles: [
      'BBBBBBBBBBBBBBBB',
      'BBBBBBB$BBBBBBBB',
      '________________',
      '________________',
      '________________',
      '________________',
      '----------------'
    ],
    legend: { '_': 'ch16:asphalt', '$': 'ch16:steeldoor' },
    ambient: 'drone', dark: 0.55, tint: '#101018', tintAlpha: 0.25, lights: [{ at: [7, 2], r: 40, flicker: true }],
    npcs: [{ id: 'doorman', spec: 'doorman', at: [7, 2], facing: 'down' }],
    objects: [{ id: 'car', at: [3, 4], prop: 'squadcar', draw: function (g, x, y) {
      g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(x - 6, y + 13, 44, 4);
      g.fillStyle = '#4a4a3a'; g.fillRect(x - 4, y + 2, 40, 12); g.fillStyle = '#2a3a4a'; g.fillRect(x + 6, y - 3, 18, 6);
      g.fillStyle = '#0a0a0a'; g.fillRect(x, y + 12, 6, 4); g.fillRect(x + 26, y + 12, 6, 4);
    }, examine: 'Isaiah\'s car. Third-hand, beige, deliberately forgettable.' }]
  };

  function hallTiles() {
    return [
      '################',
      '#ssssssssssssss#',
      '#sssssspsssssss#',
      '#..............#',
      '#.cc.cc..cc.cc.#',
      '#..............#',
      '#.cc.cc..cc.cc.#',
      '#..............#',
      '#.cc.cc..cc.cc.#',
      '#..............#',
      '#X............X#',
      '#######D########'
    ];
  }
  var hall = {
    name: 'Warehouse: The Meeting',
    tiles: hallTiles(),
    ambient: 'crowd', dark: 0.35, lights: [{ at: [7, 2], r: 70 }],
    npcs: [
      { id: 'rhost', spec: 'rhost', at: [6, 1], facing: 'down' },
      { id: 'mem1', spec: masked(1), at: [2, 5], facing: 'up', talk: [['mem1', 'First time? Don\'t say your name. Don\'t ask anyone else\'s.']] },
      { id: 'mem2', spec: masked(2), at: [5, 7], facing: 'up', talk: [['mem2', 'They change the place every month. Last month was a laundromat.']] },
      { id: 'mem3', spec: masked(3), at: [10, 5], facing: 'up', talk: [['mem3', 'My brother was on Season Zero. Before it had a name. Nobody voted for him.']] },
      { id: 'mem4', spec: masked(4), at: [13, 7], facing: 'up', talk: [['mem4', 'Viva la Johnsonlution. Funny, huh? Named after the man who held the remote.']] },
      { id: 'mem5', spec: masked(5), at: [3, 9], facing: 'up', if: 'm_audience >= 70', talk: [['mem5', 'Never seen it this full. Word got round someone special was speaking.']] },
      { id: 'mem6', spec: masked(6), at: [12, 9], facing: 'up', if: 'm_audience >= 70' },
      { id: 'mem7', spec: masked(7), at: [8, 9], facing: 'up', if: 'm_audience >= 70' },
      { id: 'mem8', spec: masked(8), at: [1, 7], facing: 'right', if: 'm_audience >= 70' },
      { id: 'markus_h', spec: { extends: 'markus', name: 'Masked Teen', overlay: ['mask_plain'] }, at: [14, 5], facing: 'left', if: 'f_markus_deal' }
    ],
    objects: [{ id: 'hall_mic', at: [7, 2] }]
  };

  var stage = {
    name: 'Inauguration Square',
    tiles: [
      'EEEEEEEEEEEEEEEEEEEE',
      'ssssssssssssssssssss',
      'sssssssspsssssssssss',
      'ssssssssssssssssssss',
      '____________________',
      '____________________',
      '____________________',
      '____________________',
      '____________________',
      '--------------------'
    ],
    legend: { '_': 'ch16:asphalt' },
    ambient: 'crowd', tint: '#e8e8f0', tintAlpha: 0.06,
    npcs: [
      { id: 'humbert_s', spec: 'humbert', at: [8, 3], facing: 'down' },
      { id: 'tb_s1', spec: 'tb_boar', at: [14, 3], facing: 'down' },
      { id: 'tb_s2', spec: 'tb_isaiah', at: [3, 5], facing: 'up' },
      { id: 'waverly_s', spec: 'waverly', at: [5, 5], facing: 'up' },
      { id: 'cr1', spec: citizen(11), at: [2, 7], facing: 'up' }, { id: 'cr2', spec: citizen(12), at: [7, 8], facing: 'up' },
      { id: 'cr3', spec: citizen(13), at: [11, 7], facing: 'up' }, { id: 'cr4', spec: citizen(14), at: [15, 8], facing: 'up' },
      { id: 'cr5', spec: citizen(15), at: [18, 6], facing: 'up' }, { id: 'cr6', spec: citizen(16), at: [9, 6], facing: 'up' }
    ],
    objects: [{ id: 'gallows', at: [12, 2], prop: 'gallows', solid: true }]
  };

  var maps = {};
  maps[ROOM.dorm] = dorm; maps[ROOM.lounge] = lounge; maps[ROOM.office] = office; maps[ROOM.bath] = bath; maps[ROOM.yard] = yard;
  maps[ROOM.hq] = hq; maps[ROOM.station] = station; maps[ROOM.shop] = shop; maps[ROOM.woods] = woods;
  maps[ROOM.cabin] = cabin; maps[ROOM.lot] = lot; maps[ROOM.hall] = hall; maps[ROOM.stage] = stage;

  /* ---------------------------------------------------------------------
   * Custom minigames
   * ------------------------------------------------------------------- */
  // ENCODE: Waverly writes a message in the Seven Code (letter number + 7).
  var encodeGame = {
    autoSolve: function (p) { return { success: true, mistakes: 0, message: String(p.message || '').toUpperCase() }; },
    start: function (ctx) {
      var p = ctx.params, R = ctx.R, P = ctx.PAL, W = ctx.W, H = ctx.H;
      var msg = String(p.message || 'HI').toUpperCase();
      var letters = [];
      msg.split(/\s+/).forEach(function (w, wi) {
        w.replace(/[^A-Z]/g, '').split('').forEach(function (c) { letters.push({ ch: c, word: wi, val: null, miss: 0 }); });
      });
      function code(c) { return c.charCodeAt(0) - 64 + 7; }
      var cw = 15, lh = 32, maxW = W - 40;
      // layout by words
      (function () {
        var words = [], cur = [];
        letters.forEach(function (L, i) { if (i && L.word !== letters[i - 1].word) { words.push(cur); cur = []; } cur.push(L); });
        if (cur.length) words.push(cur);
        var lines = [[]], x = 0;
        words.forEach(function (wd) {
          var w = wd.length * cw;
          if (x + w > maxW && lines[lines.length - 1].length) { lines.push([]); x = 0; }
          lines[lines.length - 1].push(wd); x += w + 10;
        });
        lines.forEach(function (ln, li) {
          var tot = 0; ln.forEach(function (wd, i) { tot += wd.length * cw + (i ? 10 : 0); });
          var xx = W / 2 - tot / 2;
          ln.forEach(function (wd) { wd.forEach(function (L) { L.x = xx; L.y = 46 + li * lh; xx += cw; }); xx += 10; });
        });
      })();
      var sel = 0, cur = 8, buf = '', mistakes = 0, doneT = -1, bad = 0, msgLine = '';
      function nextOpen() { for (var k = 0; k < letters.length; k++) { var n = (sel + k) % letters.length; if (letters[n].val == null) return n; } return -1; }
      return new Promise(function (resolve) {
        ctx.loop(function (dt) {
          var I = ctx.input;
          if (doneT >= 0) { if (ctx.t - doneT > 1.5) resolve({ success: true, mistakes: mistakes, message: msg }); return; }
          if (bad > 0) bad -= dt;
          if (I.repeat('up')) { cur = Math.min(40, cur + 1); buf = ''; ctx.sound('blip'); }
          if (I.repeat('down')) { cur = Math.max(1, cur - 1); buf = ''; ctx.sound('blip'); }
          if (I.repeat('right')) { var n = sel; do { n = (n + 1) % letters.length; } while (letters[n].val != null && n !== sel); sel = n; ctx.sound('select'); }
          if (I.repeat('left')) { var m = sel; do { m = (m - 1 + letters.length) % letters.length; } while (letters[m].val != null && m !== sel); sel = m; ctx.sound('select'); }
          I.typed.forEach(function (k) {
            if (/^[0-9]$/.test(k)) { buf += k; cur = parseInt(buf, 10); if (buf.length >= 2) buf = ''; }
            if (k === 'Backspace') { buf = ''; }
          });
          if (I.pressed('ok')) {
            var L = letters[sel];
            if (L.val == null) {
              if (cur === code(L.ch)) {
                L.val = cur; ctx.sound('confirm'); msgLine = '';
                var nx = nextOpen();
                if (nx < 0) { doneT = ctx.t; ctx.sound('success'); } else sel = nx;
              } else {
                mistakes++; L.miss++; bad = 0.5; ctx.sound('buzzer');
                var pos = L.ch.charCodeAt(0) - 64;
                if (L.miss === 2) msgLine = L.ch + ' is letter number ' + pos + '. Add seven.';
                else if (L.miss >= 3) { L.val = code(L.ch); msgLine = 'Her hand remembers: ' + L.ch + ' = ' + code(L.ch) + '.'; var nx2 = nextOpen(); if (nx2 < 0) { doneT = ctx.t; } else sel = nx2; }
                else msgLine = 'That\'s not it. Count again.';
              }
            }
            buf = '';
          }
          if (I.pressed('tab')) { letters.forEach(function (L) { L.val = code(L.ch); }); resolve({ success: false, gaveUp: true, mistakes: mistakes, message: msg }); }
        }, function (t) {
          R.rect(0, 0, W, H, '#14100c');
          R.rect(14, 28, W - 28, H - 46, P.paper);
          for (var ly = 40; ly < H - 22; ly += 12) R.rect(14, ly, W - 28, 1, '#cfc2a2');
          ctx.header(p.title || 'WRITE IT IN THE CODE', p.sub || 'Grandma\'s rule: add seven');
          letters.forEach(function (L, i) {
            var isSel = i === sel && doneT < 0;
            if (isSel) R.rect(L.x, L.y - 2, cw - 1, 27, bad > 0 ? '#e8323c' : '#3a6aff', bad > 0 ? 0.35 : 0.16 + 0.08 * Math.sin(t * 6));
            R.text(L.ch, L.x + cw / 2, L.y, { size: 9, align: 'center', color: '#5a4a3a', shadow: false, font: 'hand' });
            R.rect(L.x + 2, L.y + 22, cw - 5, 1, '#7a6a5a');
            var shown = L.val != null ? String(L.val) : (isSel ? String(cur) : '');
            if (shown) R.text(shown, L.x + cw / 2, L.y + 12, { size: 7, align: 'center', color: L.val != null ? '#1a3a8a' : '#8a6a5a', shadow: false });
          });
          // key strip: A=8 is all she gets; the rest she counts herself
          var kx = 22, ky = H - 46, kw = (W - 44) / 26;
          R.rect(18, ky - 3, W - 36, 22, '#d8cdb0');
          for (var li = 0; li < 26; li++) {
            var LL = String.fromCharCode(65 + li);
            var known = li === 0 || letters.some(function (L) { return L.ch === LL && L.val != null; });
            R.text(LL, kx + li * kw + kw / 2, ky, { size: 6, align: 'center', color: known ? '#2a2420' : '#9a8a70', shadow: false });
            R.text(known ? String(li + 8) : '·', kx + li * kw + kw / 2, ky + 8, { size: 6, align: 'center', color: known ? '#1a3a8a' : '#9a8a70', shadow: false });
          }
          if (msgLine) R.text(msgLine, W / 2, H - 58, { size: 7, align: 'center', color: '#8a1a20', shadow: false, style: 'italic' });
          if (p.plain) R.text(p.plain, 26, 32, { size: 8, color: '#8a1a20', shadow: false, font: 'hand' });
          if (doneT >= 0) {
            var a = Math.min(1, (ctx.t - doneT) * 3);
            R.rect(W / 2 - 60, H / 2 - 12, 120, 24, '#1a2a4a', 0.9 * a);
            R.text('WRITTEN', W / 2, H / 2 - 6, { size: 12, font: 'sans', align: 'center', color: '#9fb8ff', alpha: a });
          }
          ctx.footer('←→ letter   ↑↓ or type the number   ENTER write it   [TAB] let her hand do it');
        });
      });
    }
  };

  // LATCH: follow Isaiah's whispered instructions in order (a fixed sequence, not random).
  var latchGame = {
    autoSolve: function () { return { success: true, strikes: 0 }; },
    start: function (ctx) {
      var p = ctx.params, R = ctx.R, P = ctx.PAL, W = ctx.W, H = ctx.H;
      var steps = p.steps || [];
      var i = 0, strikes = 0, max = p.strikes || 3, state = 'play', stT = 0, stepT = 0, flash = 0, flashC = '#e8323c', note = '';
      var names = { up: '↑', down: '↓', left: '←', right: '→', ok: 'SPACE' };
      var isa = ctx.portrait('isaiah', 'neutral');
      return new Promise(function (resolve) {
        ctx.loop(function (dt) {
          var I = ctx.input;
          if (flash > 0) flash -= dt;
          if (state !== 'play') { if (ctx.t - stT > 1.6) resolve({ success: state === 'win', strikes: strikes }); return; }
          stepT += dt;
          var lim = p.time || 6;
          var pressed = null;
          ['up', 'down', 'left', 'right', 'ok'].forEach(function (a) { if (!pressed && I.pressed(a)) pressed = a; });
          if (pressed) {
            if (pressed === steps[i].act) { i++; stepT = 0; flash = 0.25; flashC = '#b6f24a'; ctx.sound('confirm'); note = steps[i - 1].ok || ''; if (i >= steps.length) { state = 'win'; stT = ctx.t; ctx.sound('door'); } }
            else { strikes++; stepT = 0; flash = 0.4; flashC = '#e8323c'; ctx.sound('buzzer'); note = steps[i].bad || 'The android\'s head turns. Freeze.'; }
          } else if (stepT > lim) { strikes++; stepT = 0; flash = 0.4; flashC = '#e8323c'; ctx.sound('miss'); note = 'Too slow. The light is still red. Again.'; }
          if (strikes >= max && state === 'play') { state = 'fail'; stT = ctx.t; ctx.sound('fail'); }
        }, function (t) {
          R.rect(0, 0, W, H, '#07080c');
          // car interior: cage, seat, door
          R.rect(0, 120, W, 96, '#14161c');
          R.rect(40, 40, W - 80, 4, '#2a2c34');
          for (var gx = 60; gx < W - 60; gx += 12) R.rect(gx, 40, 2, 70, '#2a2c34');
          R.rect(W - 110, 60, 70, 100, '#1e2028'); R.rect(W - 104, 100, 22, 6, '#3a3c44');
          // traffic light glow through the windscreen
          var red = state !== 'win';
          R.rect(30, 50, 22, 22, red ? '#ff2a2a' : '#2aff6a', 0.25 + 0.1 * Math.sin(t * 3));
          R.rect(37, 57, 8, 8, red ? '#ff4a4a' : '#4aff8a');
          if (flash > 0) R.rect(0, 0, W, H, flashC, flash * 0.5);
          ctx.header(p.title || 'THE REAR DOOR', 'Step ' + Math.min(i + 1, steps.length) + '/' + steps.length + '   Strikes ' + strikes + '/' + max);
          R.panel(16, 140, W - 32, 50, { accent: P.teal });
          R.img(isa, 22, 145, 1);
          var s = steps[Math.min(i, steps.length - 1)];
          var lines = R.wrap(state === 'win' ? 'The latch gives. Cold air. GO.' : state === 'fail' ? 'The android turns around in its seat. Hands where it can see them.' : '"' + s.text + '"', W - 110, 8, 'sans', '');
          lines.forEach(function (ln, k) { R.text(ln, 70, 148 + k * 11, { size: 8, color: P.text }); });
          if (note && state === 'play') R.text(note, W / 2, 120, { size: 7, align: 'center', color: P.dim, style: 'italic' });
          if (state === 'play') { var frac = Math.max(0, 1 - stepT / (p.time || 6)); R.rect(70, 184, (W - 100) * frac, 2, P.amber); }
          ctx.footer('Do what Isaiah says:  ← ↑ → ↓  or SPACE');
          void names;
        });
      });
    }
  };

  /* ---------------------------------------------------------------------
   * Helpers
   * ------------------------------------------------------------------- */
  function T(api, text, mood) { return api.say('trader', text, { name: 'Trader (phone)', mood: mood || 'neutral' }); }
  function Wv(api, text, mood) { return api.say('waverly', text, { mood: mood || 'neutral' }); }
  function WT(api, text) { return api.think(text, { name: 'Waverly' }); }
  function N(api, text) { return api.narrate(text); }

  // Waverly's notebook: THINGS I KNOW ABOUT TRADER, filled in as she learns.
  async function notebook(api) {
    var lines = [];
    if (api.has('ch16_learn_silence')) lines.push('1. If I stay quiet, he talks MORE.');
    if (api.has('ch16_learn_father')) lines.push('2. He is scared of his dad.');
    if (api.has('ch16_learn_question')) lines.push('3. He does what I ask if he thinks it was his idea.');
    if (api.has('ch16_learn_grandma')) lines.push('4. GRANDMA. He loved her. Grandma is the key.');
    if (!lines.length) lines.push('(Nothing yet. Just a drawing of a cat.)');
    await api.note({ title: 'THINGS I KNOW ABOUT TRADER', text: lines.join('\n') });
  }

  /* The STEERING minigame: one call = several rounds. Each round Trader says
   * something; Waverly can stay silent (option 0, the canonical tactic), be
   * sweet, or ask. Results move the hidden ch16_trust bar and can teach a
   * lesson (ch16_learn_*). Lessons the player misses are taught by a scripted
   * fallback afterwards, so the notes never block (constraint: --pick=random). */
  async function steer(api, rounds) {
    for (var r = 0; r < rounds.length; r++) {
      var rd = rounds[r];
      if (rd.pre) await T(api, rd.pre[0], rd.pre[1]);
      var opts = [
        { text: rd.silentText || '(Say nothing. Let the quiet sit there.)' },
        { text: rd.sweet.text },
        { text: rd.ask.text }
      ];
      var i = await api.choice(opts);
      var res = [rd.silent, rd.sweet, rd.ask][i];
      if (i === 0) await api.emote('player', '…', 700);
      else if (res.say) await Wv(api, res.say, res.mood);
      if (res.reply) for (var k = 0; k < res.reply.length; k++) await T(api, res.reply[k][0], res.reply[k][1]);
      if (res.trust) api.add('ch16_trust', res.trust);
      if (res.learn && !api.has('ch16_learn_' + res.learn)) {
        api.set('ch16_learn_' + res.learn, true);
        api.sound('reveal');
        if (res.lesson) await WT(api, res.lesson);
      }
    }
  }

  async function stealthUntilSafe(api, params, failText) {
    for (var tries = 0; tries < 6; tries++) {
      var r = await api.minigame('stealth', params);
      if (r.success) return true;
      await N(api, failText);
    }
    await N(api, 'In the end the care unit\'s battery runs low, and it parks itself in the corner to charge. Waverly walks right past it.');
    return false;
  }

  async function endCard(api, endingName, roll) {
    api.hud(false);
    await api.fadeOut(900);
    await api.titleCard('EXECUTION ENTERTAINMENT NETWORK', '', 2600);
    await api.titleCard(endingName, 'Ending', 3000, { kicker: 'RIGHT TO LIFE' });
    await api.slides(roll.map(function (r) { return { style: 'black', title: r[0], text: r[1], ms: 3800 }; }));
  }

  // Dev / autoplay only: force a gate preset from the URL, e.g. ?chapter=ch16&dev=1&ch16preset=A
  function applyPreset(api) {
    if (!(api.dev || api.auto)) return null;
    var m = null;
    try { m = /[?&]ch16preset=([A-Za-z]+)/.exec(window.location.search || ''); } catch (e) { m = null; }
    if (!m) return null;
    var p = m[1].toLowerCase();
    if (p === 'a') api.set({ m_waverly: 20, f_killed_trader: false, f_called_top_number: true });
    else if (p === 'b') api.set({ f_killed_trader: true, f_called_top_number: false, m_waverly: 60 });
    else if (p === 'canon') api.set({ m_waverly: 60, f_killed_trader: false, f_called_top_number: true });
    else if (p === 'lean') api.set({ m_waverly: 36, f_killed_trader: false, f_code_reply_sent: false, f_note2_decoded: false, f_note3_decoded: false,
      f_trader_note_left: false, f_markus_deal: false, f_salina_forgiven: false, f_comforted_john: false, m_audience: 20, m_isaiah: 30 });
    else if (p === 'full') api.set({ m_waverly: 90, f_killed_trader: false, f_code_reply_sent: true, f_note2_decoded: true, f_note3_decoded: true,
      f_trader_note_left: true, f_markus_deal: true, f_salina_forgiven: true, f_comforted_john: true, m_audience: 80, m_isaiah: 70 });
    api.log('ch16 preset ' + p);
    return p;
  }

  /* =====================================================================
   * CANONICAL ENDING: "They Saved Each Other"
   * =================================================================== */
  async function partWaverlyCalls(api) {
    /* ---- Sun 14 Jan: the dorm ------------------------------------- */
    api.set({ ch16_day: 1, ch16_lockOffice: true, ch16_lockBath: true, ch16_lockDorm: true });
    api.setPlayer('waverly');
    await api.slides([{ style: 'black', title: 'Waverly', text: 'Columbus House, outside Sacramento.\nSunday, the fourteenth of January. Week two.' }]);
    await api.goRoom(ROOM.dorm, { at: [2, 4], facing: 'up' });
    await N(api, 'Waverly Bartley had been at Columbus House for eleven weeks. She had learned three things: the TV is never off, the second-floor bathrooms cost money, and it is bad at the bottom.');
    await N(api, 'Tonight the TV showed her mother. Everyone watched Waverly watch it.');
    api.lockPlayer();
    await api.move('martha', [3, 4]);
    api.face('player', 'martha');
    await api.say('martha', 'Nice sweater, Bartley. Yellow\'s not your colour. It\'s mine.', { mood: 'smug' });
    await Wv(api, 'Momma taught me to say please and thank you, so please go away. Thank you.', 'angry');
    await api.say('martha', 'Murderer\'s kid has a mouth.', { mood: 'smug' });
    api.flash('#ffffff', 120);
    await api.shake(250, 2);
    api.setPlayer('waverly_columbus');
    await N(api, 'Two of the older girls hold her arms. Martha pulls the sweater over her head and pulls her hair with it.');
    await api.move('markus', [2, 5]);
    await api.say('markus', 'Give it back, Martha.', { mood: 'angry' });
    await api.say('martha', 'Or what, lifer?');
    await api.say('markus', 'Or the second floor\'s closed to you till Easter. I know who runs the toilets.', { mood: 'smug' });
    await api.say('martha', '…Whatever. It stinks like a dead woman anyway.', { mood: 'angry' });
    await api.move('martha', [12, 8]);
    api.hide('crony1'); api.hide('crony2');
    api.setPlayer('waverly');
    api.face('markus', 'player');
    await api.say('markus', 'You okay, kid?');
    var c = await api.choice([
      { text: '"Lions?"', set: { ch16_lions: true } },
      { text: '"I didn\'t need help."' },
      { text: '"Why did you do that?"' }
    ]);
    if (c === 0) {
      await api.say('markus', 'Lions. Yeah. Like on the nature show. Lions stick together.', { mood: 'happy' });
      await Wv(api, 'Lions.', 'happy');
    } else if (c === 1) {
      await api.say('markus', 'Sure you didn\'t. Lions don\'t need help either. They still hunt in a pack.', { mood: 'smug' });
    } else {
      await api.say('markus', 'Your mom\'s on TV fighting for her life so she can come get you. Least I can do is keep your sweater on you.');
    }
    api.unlockPlayer();
    await api.until(function (f) { return f.ch16_d1_looked; }, {
      objective: 'Look around the dorm (your bunk, the TV)',
      targets: ['dorm_tv', 'my_bunk'],
      autoplay: async function (a) { a.set('ch16_d1_looked', true); }
    }).catch(function () {});
    api.objective(null);
    await api.move('care', [3, 5]);
    api.face('care', 'player');
    await api.say('care', 'Resident 1144, Bartley. Report to the director\'s office. You have a telephone call.');
    await WT(api, 'A call. Nobody calls here. Nobody calls anybody here.');
    api.set('ch16_lockOffice', false);
    api.objective('Go to the director\'s office', { target: 'to_columbus_lounge' });
    await api.waitForRoom(ROOM.office);
    api.objective(null);

    /* ---- The first call -------------------------------------------- */
    await api.say('director', 'Bartley. Phone. Five minutes. Somebody important, so don\'t embarrass the House.', { mood: 'tired' });
    api.objective('Pick up the phone');
    await api.waitForInteract('house_phone');
    api.objective(null);
    api.sound('select');
    await T(api, 'Well, hello there. Is this Miss Waverly?', 'happy');
    await WT(api, 'That voice. The TV voice. The one that says "Simply stupendous" when people are crying.');
    var c1 = await api.choice([
      '"You\'re the man from the show. You\'re Trader."',
      '"Who is this?"'
    ]);
    if (c1 === 0) await T(api, 'Ha! Sharp as a tack. Like your mother. Yes, sweetheart, it\'s Trader. Call me Trader, I insist.', 'smug');
    else { await T(api, 'Just a friend of your mother\'s.', 'smug'); await Wv(api, 'No you\'re not. You\'re Trader. I know your voice from the TV.', 'angry'); await T(api, '…Well. Sharp as a tack.', 'shock'); }
    await T(api, 'I\'d like to get to know you a little. So I can give your mother better interviews. Make her look good for the folks at home.');
    await Wv(api, 'There\'s no way I\'m helping you hurt my mother more. Goodbye.', 'angry');
    await T(api, 'Wait! Wait. Don\'t hang up.', 'fear');
    await T(api, 'No more questions about her. All right? None. Can we just… talk for a few minutes? About anything.', 'sad');
    await WT(api, 'His voice went funny. Like when Momma burned dinner and pretended she meant to.');
    await steer(api, [
      { pre: ['So. Columbus House. How\'s the food?', 'neutral'],
        silent: { trust: 1, reply: [['…Terrible, I bet. I ate at a place like that once. For a story. I had to throw my tie away after.', 'neutral'], ['You don\'t say much, do you? That\'s all right. I say plenty. My father always said I could talk the ears off a statue.', 'smug']], learn: 'silence', lesson: 'When I didn\'t say anything, he filled it up. He talked MORE.' },
        sweet: { text: '"It\'s okay. There\'s cereal on Sundays."', say: 'It\'s okay. There\'s cereal on Sundays.', trust: 2, reply: [['Cereal on Sundays. Well. That\'s something to look forward to.', 'happy']] },
        ask: { text: '"Why do you care?"', say: 'Why do you care?', mood: 'angry', trust: 0, reply: [['…That\'s a fair question. I don\'t know. I suppose I just wanted to talk to someone who isn\'t on the payroll.', 'sad']] } },
      { pre: ['Your mother has a temper, you know. She nearly took my head off on day one.', 'smug'],
        silent: { trust: 1, reply: [['…That was a joke. You\'re supposed to laugh.', 'neutral'], ['Hello? Still there? Don\'t do that. Say something. Anything.', 'fear'], ['It\'s just, it gets so quiet at night in that office. I don\'t like it quiet.', 'sad']], learn: 'silence', lesson: 'He hates the quiet. He got upset when I wouldn\'t talk. Like the quiet is a person standing behind him.' },
        sweet: { text: '"She gets mad when she\'s scared."', say: 'She gets mad when she\'s scared. Then she makes pancakes.', trust: 2, reply: [['Pancakes. Hm. I\'ll have to remember that.', 'happy']] },
        ask: { text: '"Did you make her mad on purpose?"', say: 'Did you make her mad on purpose?', trust: 0, reply: [['Everything on my show is on purpose, sweetheart. That\'s what makes it a show.', 'smug']] } }
    ]);
    if (!api.has('ch16_learn_silence')) {
      await T(api, 'Hello? You went quiet on me. Don\'t do that, it makes me… Never mind.', 'fear');
      api.set('ch16_learn_silence', true);
      await WT(api, 'He got upset when I didn\'t talk. I\'m going to remember that.');
    }
    await api.say('director', 'Time\'s up.', { mood: 'tired' });
    await T(api, 'I\'ll call again. If that\'s all right. Goodnight, Miss Waverly.', 'neutral');
    await N(api, 'The line clicked. Waverly stood holding the phone until the director took it out of her hand.');
    await WT(api, 'He called to hurt Momma. And then he forgot he was supposed to.');
  }

  async function partWaverlyPhone(api) {
    /* ---- Wed 17 Jan: the parcel --------------------------------------- */
    api.set({ ch16_day: 2, ch16_lockDorm: true });
    await api.slides([{ style: 'black', title: 'Wednesday, 17 January', text: 'He called again on Monday. And Tuesday. He did most of the talking.' }]);
    await api.goRoom(ROOM.office, { at: [4, 3], facing: 'up' });
    await api.say('director', 'This came for you. Don\'t ask me who from. It\'s paid for, and that\'s all I care about.', { mood: 'tired' });
    await N(api, 'A padded envelope. Inside, a cheap flip phone on a string, with one number saved in it. No name. Just a T.');
    api.setPlayer('waverly_phone');
    await WT(api, 'A phone. My own phone. He bought me a phone so he could talk to me whenever he wanted.');
    await WT(api, 'Which means I can talk to him whenever I want, too.');
    await api.say('director', 'If the care unit catches you with it after lights out, it\'s confiscated. I never saw it.', { mood: 'smug' });
    api.set('ch16_lockDorm', false);
    api.objective('Go back to the dorm', { target: 'to_columbus_lounge' });
    await api.waitForRoom(ROOM.dorm);
    api.objective(null);
    await api.until(function (f) { return f.ch16_d2_bunk; }, {
      objective: 'Hide the phone in your bunk',
      targets: ['my_bunk'],
      autoplay: async function (a) { a.set('ch16_d2_bunk', true); }
    });
    api.objective(null);

    /* ---- That night: the bathroom stall ------------------------------- */
    await N(api, 'Lights out is nine o\'clock. The phone buzzes at nine forty, under her pillow, like a heart.');
    await stealthUntilSafe(api, {
      title: 'LIGHTS OUT', prompt: 'Reach the bad bathroom without the care unit seeing you', playerSpec: 'waverly_phone',
      map: [
        '####################',
        '#@.b.b.b....b.b.b..#',
        '#..b.b.b....b.b.b..#',
        '#..................#',
        '#..b.b.b....b.b.b..#',
        '#..b.b.b....b.b.b..#',
        '#..................#',
        '#..b.b.b....b.b.b..#',
        '#..............l..*#',
        '####################'
      ],
      guards: [{ path: [[17, 3], [2, 3]], speed: 22, range: 52, fov: 60, spec: 'care_android' },
               { path: [[2, 6], [17, 6]], speed: 20, range: 48, fov: 60, spec: 'care_android' }],
      lives: 3
    }, 'The care unit\'s red eyes find her. "Resident 1144. Return to your bunk." She waits an hour and tries again.');
    await api.goRoom(ROOM.bath, { at: [6, 5], facing: 'up' });
    api.objective('Lock yourself in the end stall', { target: 'stall' });
    await api.waitForInteract('stall');
    api.objective(null);
    api.teleport([7, 2], 'down');
    await N(api, 'The end stall has a lock that works if you hold it. Waverly holds it with her foot.');
    await T(api, 'There she is. Did I wake you? No, you were waiting. Weren\'t you.', 'happy');
    await steer(api, [
      { pre: ['Long day. My father came by the studio. He doesn\'t usually. He watched from the dark the whole time.', 'tired'],
        silent: { trust: 1, reply: [['He never says it\'s good. He never says anything. He just writes in a little book. Thirty years he\'s been writing in that little book.', 'sad'], ['Do you know what it\'s like when someone\'s quiet at you, and you know exactly what the quiet means?', 'angry']], learn: 'father', lesson: 'He\'s scared of his dad. Not like scared of a dog. Scared like a kid.' },
        sweet: { text: '"That sounds lonely."', say: 'That sounds lonely.', trust: 2, reply: [['…It is, a bit. Isn\'t that silly. A grown man.', 'sad'], ['He took me hunting once, when I was your age. On his island. I don\'t eat meat any more.', 'tired']], learn: 'father', lesson: 'He\'s scared of his dad. Not like scared of a dog. Scared like a kid.' },
        ask: { text: '"Is your dad mean?"', say: 'Is your dad mean?', trust: 1, reply: [['My father is the most respected man in this country, sweetheart. Ask anyone.', 'smug'], ['…Don\'t ask me.', 'sad']], learn: 'father', lesson: 'He\'s scared of his dad. Not like scared of a dog. Scared like a kid.' } },
      { pre: ['Anyway! Enough about me. What do you want to be when you grow up?', 'happy'],
        silent: { trust: 1, reply: [['Too big a question. I never knew either. I just knew what I was going to be. Different thing.', 'neutral']] },
        sweet: { text: '"An artist. I draw cats."', say: 'An artist. I draw cats. And sometimes Momma.', trust: 2, reply: [['Draw me something sometime. I\'ll hang it in my office. Not the one with the cameras.', 'happy']] },
        ask: { text: '"What do YOU want to be?"', say: 'What do you want to be?', trust: 2, reply: [['…Nobody\'s asked me that in a very long time.', 'shock']] } }
    ]);
    // The test: can she make him do something?
    await WT(api, 'Now. Find out how far it goes.');
    var q = await api.choice([
      { text: '"Will you ask Momma something for me? On the show. What she\'d do with the prize money."', set: { ch16_qMoney: true } },
      { text: '"Will you tell Momma I said hi?"' }
    ]);
    if (q === 0) {
      await T(api, 'The prize money? That\'s… actually not bad. Folks love a money question. Human interest.', 'neutral');
      await T(api, 'Sure. Why not. I\'ll slip it in on Friday.', 'smug');
    } else {
      await T(api, 'Can\'t do that, sweetheart. Rules are rules. Contestants get no outside contact.', 'neutral');
      await WT(api, 'Too much. Too straight. He has to think it\'s his.');
      await Wv(api, 'Then ask her what she\'d do with the prize money. That\'s not contact. That\'s just a question.');
      await T(api, '…Huh. Human interest. Folks love a money question. Fine. Friday.', 'smug');
    }
    api.set('ch16_learn_question', true);
    await T(api, 'Goodnight, Miss Waverly. Sleep tight.', 'happy');
    api.sound('select');
    await N(api, 'Waverly sat on the closed toilet lid in the dark for a long time, holding the phone in both hands.');
  }

  async function partWaverlyTest(api) {
    /* ---- Fri 19 Jan: the question airs; practise the fit -------------- */
    api.set({ ch16_day: 3, ch16_lockBath: true, ch16_lockOffice: true });
    await api.slides([{ style: 'black', title: 'Friday, 19 January', text: 'The whole dorm watches the Friday show. Waverly sits at the very front.' }]);
    await api.goRoom(ROOM.dorm, { at: [8, 2], facing: 'up' });
    api.onAir(true);
    await api.tv([
      { speaker: 'trader_host', headline: 'ONE ON ONE: LUNA', text: 'Miss Luna! A little human-interest question for the folks at home. If you won. What would you do with the prize money?', tag: 'LIVE' },
      { speaker: 'luna', mood: 'tired', headline: 'ONE ON ONE: LUNA', text: '…That\'s a weird question. I\'d buy my daughter a home. With a door that locks from the inside. And all the books she wants.', tag: 'LIVE' }
    ]);
    api.onAir(false);
    await WT(api, 'He did it. He actually did it.');
    await WT(api, 'Momma thought it was a weird question. She doesn\'t know it was mine. She doesn\'t know I\'m in there with her.');
    api.sound('reveal');
    await api.say('markus', 'Why are you smiling? Your mom looks like she wants to bite him.', { mood: 'neutral' });
    var mk = await api.choice([
      { text: '"No reason."' },
      { text: '"I asked him to ask that."' }
    ]);
    if (mk === 1) { await api.say('markus', 'Sure you did. And I\'m the Great Leader.', { mood: 'smug' }); await WT(api, 'Good. Nobody believes kids. That\'s the trick.'); }
    await N(api, 'That night Trader is happy. Giddy. He\'s bringing the families in for interviews on Tuesday, he says. He can\'t wait to meet her in person.');
    await WT(api, 'In person. Momma will be right there. I could give her something. A note.');
    await WT(api, 'They\'ll search me. They search everybody. Unless I make them not want to.');
    api.set('ch16_lockBath', false);
    api.objective('Practise in the bathroom mirror', { target: 'to_columbus_bathroom' });
    await api.waitForRoom(ROOM.bath);
    api.objective('Practise in the mirror', { target: 'mirror' });
    await api.waitForInteract('mirror');
    api.objective(null);
    await N(api, 'Waverly is eleven. She looks nine. She practises looking seven.');
    var prac = 0;
    for (var i = 0; i < 3; i++) {
      var pr = await api.choice([
        { text: 'Bottom lip out. Shake.', if: '!ch16_p0' },
        { text: '"I don\'t WANT to be touched!" (loud)', if: '!ch16_p1' },
        { text: 'Hug yourself and scream for Momma.', if: '!ch16_p2' }
      ], { prompt: 'The fit' });
      api.set('ch16_p' + pr, true); prac++;
      if (pr === 0) await WT(api, 'Lip out. Shake. Not too much. Little kids don\'t overdo it, they just mean it.');
      else if (pr === 1) await WT(api, 'Loud enough that the grown-ups look at the person who touched me, not at me.');
      else await WT(api, 'Momma. That one\'s not pretend. That one\'s easy.');
    }
    await WT(api, 'Ready. Now the note.');
    api.set('ch16_lockBath', true);
    await api.goRoom(ROOM.dorm, { at: [2, 4], facing: 'up' });
    api.objective('Write the note at your bunk', { target: 'my_bunk' });
    await api.waitForInteract('my_bunk');
    api.objective(null);
    await WT(api, 'No time for the code. It has to be fast. She has to understand it in one look.');
    await api.note({ title: 'Note (folded very small)', text: 'I want to help! Creepy Trader keeps calling me. I think he likes me. I can use that to help you escape.' });
    await N(api, 'She folds it eight times, until it is the size of a tooth.');
  }

  async function partWaverlyHQ(api) {
    /* ---- Tue 23 Jan: DPE HQ, the search, the fit ---------------------- */
    await api.slides([{ style: 'black', title: 'Tuesday, 23 January', text: 'DPE Headquarters. Family and friends.' }]);
    await api.goRoom(ROOM.hq, { at: [6, 5], facing: 'up' });
    await N(api, 'A lobby of smooth blue tiles. Other families stand in a line with their arms out. A woman in plum with a ruler pats them down like luggage.');
    await api.say('ginerva', 'Next. Arms up, child. Turn out your pockets.', { mood: 'neutral' });
    await WT(api, 'Now.');
    var fit = await api.minigame('qte', { mode: 'mash', title: 'THROW A FIT', prompt: 'Make them not want to touch you', target: 26, time: 5, decay: 7 });
    if (fit.success) {
      await Wv(api, 'DON\'T TOUCH ME! I don\'t WANT to be touched! MOMMAAA!', 'cry');
      api.add('ch16_trust', 1);
    } else {
      await Wv(api, 'D-don\'t… don\'t touch me. Please.', 'fear');
      await WT(api, 'Too quiet. Louder. LOUDER.');
      await Wv(api, 'DON\'T TOUCH ME!', 'cry');
    }
    await api.say('ginerva', 'Rules are rules, Miss Bartley. Everyone is searched.', { mood: 'angry' });
    await api.move('trader_hq', [7, 4]);
    await api.say('trader', 'Ginny. She\'s a child. Look at her. Leave it.', { mood: 'neutral' });
    await api.say('ginerva', 'Tray, if your father hears…', { mood: 'angry' });
    await api.say('trader', 'Then he\'ll hear I was kind to a little girl on camera. Ratings, Ginny. Let her through.', { mood: 'smug' });
    await api.say('ginerva', '…As you like.', { mood: 'neutral' });
    api.face('trader_hq', 'player');
    await api.say('trader', 'Hello, Miss Waverly. You\'re smaller than you sound.', { mood: 'happy' });
    await WT(api, 'He stuck up for me. In front of her. He\'s never stuck up for anybody.');
    await api.slides([
      { style: 'montage', title: 'The interview', text: 'Momma\'s hair is shorter. She is thinner. She tries so hard not to cry on camera that she cries anyway.' },
      { style: 'montage', title: 'The goodbye', text: 'At the end Waverly throws the biggest fit of her life. Momma hugs her. The tooth-sized note goes from one hand to the other.' }
    ]);

    /* ---- That evening: Momma's counting reply ------------------------ */
    await N(api, 'That evening the house phone rings in the director\'s office. Five minutes, the director says. It\'s your mother.');
    if (api.get('f_code_reply_sent', true)) {
      await api.say('luna', 'Hey, baby. Do you still remember how to count? Count with me. Twenty-one. Twenty-two.', { name: 'Momma (phone)', mood: 'sad' });
      await api.say('luna', 'Twenty-six, twenty-seven, eight, thirty-two. Twenty-six, eight, thirteen, twelve. Good girl.', { name: 'Momma (phone)', mood: 'sad' });
      await WT(api, 'She taught me to count to one hundred. Everybody listening thinks that\'s all it is.');
      var dec = await api.minigame('cipher', { mode: 'seven', ciphertext: '21-22/26-27-8-32/26-8-13-12', title: 'MOMMA\'S COUNTING', prompt: 'What Momma really said', hint: 'A = 8. Grandma\'s rule: add seven.' });
      await WT(api, dec.success ? 'NO. STAY SAFE.' : 'No… stay… safe. I know what it says. I knew before she finished.');
      await Wv(api, 'No!', 'angry');
      await WT(api, 'No, Momma. You don\'t get to say no. You\'re in a house full of cameras. I\'m the only one who isn\'t.');
    } else {
      await api.say('luna', 'Waverly, listen to me. Stay out of it. You hear me? You\'re a kid. You\'ll only make things worse.', { name: 'Momma (phone)', mood: 'angry' });
      await WT(api, 'She sounds like she hates me. She doesn\'t. She sounds like that when she\'s the most scared.');
      await Wv(api, 'No.', 'angry');
      await WT(api, 'You\'re not the only one who gets to be brave.');
    }
  }

  async function partWaverlyGrandma(api) {
    /* ---- Thu 25 Jan: the Judge takes over; Grandma is the key --------- */
    api.set({ ch16_day: 4, ch16_lockBath: true, ch16_lockOffice: true });
    await api.slides([{ style: 'black', title: 'Thursday, 25 January', text: 'The red room. The dorm goes quiet when the Judge walks on stage.' }]);
    await api.goRoom(ROOM.dorm, { at: [8, 2], facing: 'up' });
    api.onAir(true);
    await api.tv([
      { speaker: 'judge', mood: 'smug', headline: 'A WORD FROM THE JUDGE', text: 'My son has embarrassed this Department for the last time. Do not call me father. From tonight, this show is mine.', tag: 'LIVE' },
      { speaker: 'judge', mood: 'smug', headline: 'JUSTICE', text: 'And did you know, citizens, that my son hosted Franchesca Bartley\'s show? Her MOTHER\'S show. The apple, the tree.', tag: 'LIVE' }
    ]);
    api.onAir(false);
    await N(api, 'Then the fire. Markus gets up and turns the TV to the wall before it gets bad. Nobody stops him.');
    await WT(api, 'Grandma was on a show. Trader hosted it. Momma never told me. Maybe she didn\'t know.');
    await stealthUntilSafe(api, {
      title: 'THE STALL AGAIN', prompt: 'The care unit doubled its rounds after Kessie. Get to the bathroom.', playerSpec: 'waverly_phone',
      map: [
        '####################',
        '#@.b.b.b....b.b.b..#',
        '#..b.b.b....b.b.b..#',
        '#..................#',
        '#..b.b.b....b.b.b..#',
        '#..b.b.b....b.b.b..#',
        '#........u.........#',
        '#..b.b.b....b.b.b..#',
        '#..............l..*#',
        '####################'
      ],
      guards: [{ path: [[17, 3], [2, 3]], speed: 26, range: 52, fov: 60, spec: 'care_android' },
               { path: [[2, 6], [17, 6]], speed: 24, range: 48, fov: 60, spec: 'care_android' }],
      cameras: [{ at: [10, 1], angle: 90, sweep: 90, range: 70, speed: 0.7, fov: 36 }],
      lives: 3
    }, '"Resident 1144. Return to your bunk." She lies awake counting in sevens and tries again.');
    await api.goRoom(ROOM.bath, { at: [7, 2], facing: 'down' });
    await N(api, 'He calls at two in the morning. He has been drinking. He has been crying, or he is about to.');
    await T(api, 'Did you see it? Did you see what he did to me? In front of everyone. In front of the whole country.', 'cry');
    await steer(api, [
      { pre: ['He slapped me. Like I was twelve. And then he told them about her.', 'angry'],
        silent: { trust: 1, reply: [['Franchesca. Your grandmother. You look like her, you know. Around the eyes. Your mother looks just like her. It\'s… it\'s hard to look at her sometimes.', 'sad'], ['She was the only person who ever asked me about my father. Not about the show. About him. About me.', 'cry']], learn: 'grandma', lesson: 'Grandma. He loved Grandma. That\'s why he picked Momma. That\'s why he calls me.' },
        sweet: { text: '"You didn\'t deserve that."', say: 'You didn\'t deserve that. Nobody deserves that.', trust: 2, reply: [['She used to say that. Exactly that. "Nobody deserves that, Trey."', 'cry'], ['Franchesca. Your grandmother. She was the only person who ever asked me about my father.', 'sad']], learn: 'grandma', lesson: 'Grandma. He loved Grandma. That\'s why he picked Momma. That\'s why he calls me.' },
        ask: { text: '"Did you know my grandma?"', say: 'Did you know my grandma? The Judge said you did her show.', trust: 1, reply: [['…I knew her. I knew her better than anyone. And I…', 'sad'], ['Don\'t. Don\'t ask me about her. Not tonight.', 'angry']] } },
      { pre: ['He\'s taken my show. He\'ll take everything. He always does.', 'tired'],
        silent: { trust: 1, reply: [['Say something. Please. I can\'t stand it when you go quiet like that.', 'fear']] },
        sweet: { text: '"You can get it back."', say: 'You can get it back. You\'re the host. It\'s YOUR show.', trust: 2, reply: [['…You think so?', 'neutral']] },
        ask: { text: '"What would Grandma say?"', say: 'What would my grandma say? If she was here?', trust: 2, reply: [['She\'d say "stand up, Trey." She always said that.', 'cry']], learn: 'grandma', lesson: 'Grandma. He loved Grandma. That\'s why he picked Momma. That\'s why he calls me.' } }
    ]);
    if (!api.has('ch16_learn_grandma')) {
      await T(api, 'You know who you sound like? Her. Franchesca. She was the only person who ever asked me about my father.', 'sad');
      api.set('ch16_learn_grandma', true);
      await WT(api, 'Grandma. He loved Grandma. That\'s why he picked Momma.');
    }
    await WT(api, 'Grandma is the key. Grandma is his weak point. Momma has to know.');
    // The deal: notes that "ask Momma to help him"
    await Wv(api, 'Momma could help you. Get your show back. She\'s smart. Smarter than your dad.', 'neutral');
    await T(api, 'Your mother would sooner spit on me.', 'tired');
    await Wv(api, 'Not if I ask her. I could write to her. In our code, so the cameras can\'t read it. You could give it to her.', 'neutral');
    var trust = api.get('ch16_trust', 0);
    if (trust >= 5) {
      await T(api, '…You\'d do that? For me?', 'shock');
    } else {
      await T(api, 'Smuggle notes? If my father found out…', 'fear');
      await api.emote('player', '…', 900);
      await T(api, '…No. No, you\'re right. He won\'t find out. He doesn\'t look at me long enough to find out anything.', 'tired');
    }
    await T(api, 'What would it say? Your note.', 'neutral');
    var cov = await api.choice([
      { text: '"MOMMA, HELP TRADER."', set: { ch16_cover: true } },
      { text: '"Just that I love her."' }
    ]);
    if (cov === 0) {
      await T(api, 'Momma, help Trader. Ha. Ha. All right. All right, kid.', 'happy');
    } else {
      await T(api, 'That\'s it? You want me to risk my neck for "I love you"?', 'angry');
      await Wv(api, 'And "Momma, help Trader." That too. I promise.', 'neutral');
      await T(api, '…All right.', 'tired');
      api.set('ch16_cover', true);
    }
    await WT(api, 'He believes it because he wants to. That\'s the biggest secret about grown-ups.');
    await N(api, 'The next night Trader asks to see what "help Trader" looks like in code, just so he\'d know. She shows him.');
    await api.note({ title: 'for Trader', text: '20-22-20-20-8 / 15-12-19-23 / 27-25-8-11-12-25\n\n(MOMMA, HELP TRADER)' });
    await N(api, 'Then, on the back of a crayon drawing of a cat, she writes the real one.');
    await N(api, 'First, in plain letters, on purpose, so Momma knows she heard her: No!');
    var e2 = await api.minigame('encode', { message: 'GRANDMA IS TRADERS WEAK POINT', plain: 'No!', title: 'NOTE 2', sub: 'Grandma\'s rule: add seven' });
    api.set('ch16_note2_written', true);
    if (!e2.success) await WT(api, 'My hand knows it even when my head doesn\'t. Grandma\'s rule.');
    await api.note({ title: 'Note 2 (back of a crayon cat)', text: 'No!\n14-25-8-21-11-20-8 / 16-26 / 27-25-8-11-12-25-26 / 30-12-8-18 / 23-22-16-21-27' });
  }

  async function partWaverlyNote3(api) {
    /* ---- Sun 4 Feb: Note 3 ------------------------------------------- */
    api.set({ ch16_day: 5, ch16_lockBath: true, ch16_lockOffice: true });
    await api.slides([{ style: 'black', title: 'Sunday, 4 February', text: 'Delphin Neutrino was hanged yesterday. Waverly didn\'t watch. Markus told her Momma held his hand till the end.' }]);
    await api.goRoom(ROOM.dorm, { at: [2, 4], facing: 'up' });
    await T(api, 'She got your drawing. The cat.', 'neutral');
    if (api.get('f_note2_decoded', true)) {
      await T(api, 'She sat on her bed and counted on her fingers for an hour. Then she looked right at the camera. Right at me. I don\'t know what you wrote, kid, but it worked.', 'shock');
      await WT(api, 'She read it. She knows.');
    } else {
      await T(api, 'She folded it up and put it in her pocket. Didn\'t even look at it. Your mother\'s stubborn.', 'tired');
      await WT(api, 'She didn\'t read it. Then I\'ll write another one. Shorter. One she can\'t ignore.');
    }
    await T(api, 'They\'ve got me mopping floors now. Me. Mopping. Someone left me a note in the supply closet. Never mind.', 'tired');
    await WT(api, 'He needs to hear it from her. From Grandma. He can\'t, so Momma has to say it for her.');
    api.objective('Write Note 3 at your bunk', { target: 'my_bunk' });
    await api.waitForInteract('my_bunk');
    api.objective(null);
    var e3 = await api.minigame('encode', { message: 'TELL HIM SHE LOVED HIM', title: 'NOTE 3', sub: 'Slipped inside the Falsville book' });
    api.set('ch16_note3_written', true);
    if (!e3.success) await WT(api, 'There. Grandma\'s rule.');
    await api.note({ title: 'Note 3 (inside the Falsville book)', text: '27-12-19-19 / 15-16-20 / 26-15-12 / 19-22-29-12-11 / 15-16-20' });
    await N(api, 'Trader returns the book to Momma the same day. He thinks it says Momma, help Trader. In a way, it does.');
    await api.objective('Look at your notebook (optional), then sleep', { target: 'my_bunk' });
    await api.waitForInteract('my_bunk');
    api.objective(null);
    await notebook(api);
  }

  async function partWaverlyLastCall(api) {
    /* ---- Thu 8 Feb: the last call -------------------------------------- */
    api.set({ ch16_day: 6, ch16_lockBath: false, ch16_lockOffice: true });
    await api.slides([{ style: 'black', title: 'Thursday, 8 February', text: 'Three contestants left. Tomorrow is the final vote. Momma lost the lie detector.\nTonight, for the first time, Waverly calls him.' }]);
    await api.goRoom(ROOM.dorm, { at: [8, 10], facing: 'down' });
    api.objective('Go to the bathroom stall and call Trader', { target: 'to_columbus_bathroom' });
    await api.waitForRoom(ROOM.bath);
    api.objective('Lock yourself in the end stall', { target: 'stall' });
    await api.waitForInteract('stall');
    api.objective(null);
    api.teleport([7, 2], 'down');
    api.sound('select');
    await N(api, 'One number. One T. It rings four times.');
    await T(api, '…Waverly? You never call me. Is something wrong?', 'fear');
    await Wv(api, 'I\'m tired of watching you get hurt.', 'sad');
    await T(api, '…', 'shock');
    await Wv(api, 'He hits you. He laughs at you on TV. He makes you mop. And you let him, because you think you\'re supposed to.', 'sad');
    var lc = await api.choice([
      { text: '"Stand up to your bully."' },
      { text: '"Do it for Grandma."' }
    ]);
    if (lc === 1) await Wv(api, 'Do it for Grandma. She would have wanted you to.', 'sad');
    await Wv(api, 'Stand up to your bully. Tomorrow. At the vote. Where everybody can see.', 'angry');
    if (api.get('f_trader_note_left', true)) {
      await T(api, 'You sound like someone else I got a note from. "Stand up." Everybody wants me to stand up.', 'tired');
      await T(api, 'Maybe everybody\'s right.', 'neutral');
    }
    await T(api, 'I stand up to my father, I\'m a dead man, kid. You understand that?', 'fear');
    await Wv(api, 'I stand up to Martha Thompson every day. I\'m not dead.', 'neutral');
    await T(api, '…Ha. Ha.', 'cry');
    await T(api, 'All right. Tomorrow.', 'neutral');
    await T(api, 'Waverly? Thank you. For talking to me. Nobody… Goodnight.', 'sad');
    await WT(api, 'He\'s going to do something tomorrow. Something big. And Momma is going to need me close.');
    await WT(api, 'I\'m not waiting here for the TV to tell me what happened to my mother.');
  }

  async function partWaverlyEscape(api) {
    /* ---- That night: the escape --------------------------------------- */
    await N(api, 'It starts to rain around midnight. Momma ran away from this place in the rain once. Momma told her so, when she was little, on a night she thought Waverly was asleep.');
    await stealthUntilSafe(api, {
      title: 'THE NIGHT IN THE RAIN', prompt: 'Out through the dorm to the yard door', playerSpec: 'waverly_phone',
      map: [
        '######################',
        '#@.b.b.b......b.b.b..#',
        '#..b.b.b......b.b.b..#',
        '#....................#',
        '#..b.b.b......b.b.b..#',
        '#..b.b.b......b.b.b..#',
        '#....................#',
        '#..b.b.b..ll..b.b.b..#',
        '#...................*#',
        '######################'
      ],
      guards: [{ path: [[19, 3], [2, 3], [2, 6], [19, 6]], speed: 26, range: 56, fov: 64, spec: 'care_android' }],
      cameras: [{ at: [10, 1], angle: 90, sweep: 100, range: 72, speed: 0.6, fov: 34 }],
      lives: 3
    }, 'A red eye swings toward her bunk. She lies flat and pretends to sleep until it passes. Again.');
    api.setPlayer('waverly_phone');
    await api.goRoom(ROOM.yard, { at: [9, 12], facing: 'up' });
    await N(api, 'The yard is all rain and black. The oak tree. The fence. Beyond it, the woods.');
    api.objective('Get to the fence', { target: 'markus_y' });
    await api.waitForInteract('markus_y');
    api.objective(null);
    await api.say('markus', 'Took you long enough. Figured you\'d go tonight. You\'ve been weird all day.', { mood: 'smug' });
    await Wv(api, 'You can\'t stop me.', 'angry');
    await api.say('markus', 'Stop you? Kid, I\'m your boost. That fence is nine feet.', { mood: 'happy' });
    if (api.get('f_markus_deal', true)) await api.say('markus', 'Your mom said I\'d be rich. I\'ll hold her to it.', { mood: 'smug' });
    await api.say('markus', 'Go. Lions.', { mood: 'neutral' });
    await Wv(api, 'Lions.', 'happy');
    var boost = await api.minigame('qte', { mode: 'timing', title: 'OVER THE FENCE', prompt: 'Jump when Markus lifts', rounds: 3, need: 2, speed: 0.9, zone: 0.2 });
    if (!boost.success) { await api.say('markus', 'Again. I got you. I GOT you.', { mood: 'angry' }); await N(api, 'On the fourth try her fingers catch the top wire. She swings over. Her sleeve stays behind.'); }
    else await N(api, 'Markus lifts. Waverly climbs. The wire bites her palm and she doesn\'t make a sound.');
    api.set('ch16_overFence', true);
    api.teleport([14, 2], 'up');
    await N(api, 'She drops on the far side into wet leaves. When she looks back, Markus is already walking to the house with his hands in his pockets, like nothing happened.');
    await api.goRoom(ROOM.woods, { at: [0, 3], facing: 'right' });
    api.objective('Through the woods to the road', { target: 'treeline' });
    await api.waitForZone('treeline');
    api.objective(null);

    /* ---- The trucker -------------------------------------------------- */
    await api.goRoom(ROOM.station, { at: [3, 10], facing: 'right' });
    api.addObject({ id: 'truck', at: [6, 11], prop: 'truck', solid: true });
    await N(api, 'The highway. Then a smaller road. Then a truck with its hazards on, and a man taking a leak behind it who nearly falls over when he sees her.');
    api.addNpc({ id: 'trucker', spec: 'trucker', at: [9, 10], facing: 'left' });
    await api.say('trucker', 'Jesus, kid. It\'s three in the morning. Where\'s your people?', { mood: 'shock' });
    var lie = await api.choice([
      { text: '"I\'m visiting my grandma. She lives by the old mill. I missed the bus."' },
      { text: '"I ran away."' }
    ]);
    if (lie === 0) {
      await api.say('trucker', 'Your grandma lets you walk the highway at night?', { mood: 'neutral' });
      await Wv(api, 'She\'s got Alzheimer\'s. She forgets. Please, mister. She\'ll be worried.', 'sad');
      await api.say('trucker', '…Get in. I\'ll take you to the turnoff. Not a step past it, I got a schedule.', { mood: 'tired' });
    } else {
      await api.say('trucker', 'Yeah. I figured.', { mood: 'tired' });
      await api.say('trucker', 'I didn\'t see you. You didn\'t see me. Get in. I\'ll take you as far as the turnoff.', { mood: 'neutral' });
    }
    await api.slides([
      { style: 'montage', title: 'The cab', text: 'The cab smells of coffee and dog. A little plastic penguin bobs on the dashboard. The radio is playing the show\'s jingle. The trucker turns it off without a word.' },
      { style: 'montage', title: 'The turnoff', text: 'He drops her at OLD MILL RD. He gives her a dollar for the machine. "For cocoa. Kids like cocoa." Then his tail lights go.' }
    ]);
    api.remove('trucker'); api.remove('truck');
    api.teleport([3, 9], 'up');
    await N(api, 'A gas station that has been closed for years. Dead pumps. A dead streetlamp. One vending machine still lit, humming to itself.');
    api.objective('Get cocoa from the machine', { target: 'vend' });
    await api.waitForInteract('vend');
    api.objective(null);
    api.sound('confirm');
    await N(api, 'Clunk. Whirr. The cocoa comes out in a paper cup, too hot, too sweet. Perfect.');
    api.addObject({ id: 'cocoa_cup', at: [17, 2], prop: 'cocoa', solid: false });
    api.objective('Sit on the bench and wait', { target: 'bench' });
    await api.waitForInteract('bench');
    api.objective(null);
    api.teleport([16, 3], 'down');
    await N(api, 'She waits. The rain stops. Somewhere far off, behind the hills, something that might be the House is lit up like a birthday cake.');
    await WT(api, 'Momma\'s there. Trader\'s there. It\'s happening right now and I can\'t see it.');
    await WT(api, 'Count to seven. Then think the second thought.');
    await N(api, 'An hour. Two. The cocoa goes cold. Then the phone on the string around her neck rings. Not the T. A number she doesn\'t know.');
    api.sound('alarm');
    await Wv(api, 'Momma?', 'shock');
    await api.say('luna', '…Waverly?', { name: 'Momma (phone)', mood: 'shock' });
    await Wv(api, 'Momma, would you still love me if I had a big secret? Even if it was as big as a horse?', 'cry');
    await api.say('luna', 'Baby, I\'d love you if it was as big as a house. Where are you?', { name: 'Momma (phone)', mood: 'cry' });
    await Wv(api, 'I\'m at the gas station on Old Mill Road. Two miles. I\'ve got cocoa.', 'happy');
  }

  async function partReunion(api) {
    /* ---- Part 2: as Luna --------------------------------------------- */
    api.set({ ch16_part2: true });
    await api.fadeOut(700);
    await api.slides([{ style: 'black', title: 'Luna', text: 'Two miles. Isaiah\'s glasses are gone and he walks with one hand on my shoulder. Annette is gone. My arm is bandaged with my own sleeve where the chip used to be.' }]);
    api.setPlayer('luna');
    api.addNpc({ id: 'waverly', spec: 'waverly_phone', at: [16, 3], facing: 'down' }, ROOM.station);
    api.addNpc({ id: 'isaiah', spec: 'isaiah_run', at: [2, 10], facing: 'right' }, ROOM.station);
    await api.goRoom(ROOM.station, { at: [3, 10], facing: 'right' });
    await api.think('There. On the bench. Under the only light for a mile. Small. Yellow sweater. Static hair.');
    api.objective('Go to Waverly', { target: 'waverly' });
    await api.waitForInteract('waverly');
    api.objective(null);
    api.lockPlayer();
    api.face('waverly', 'player');
    await api.emote('waverly', '♥', 900);
    await api.narrate('I don\'t remember crossing the forecourt. I remember the weight of her, and that she smells like cocoa and wet leaves, and that she is shaking, or I am.');
    await api.say('luna', 'Thank you. Thank you, baby. Thank you.', { mood: 'cry' });
    await Wv(api, 'We saved each other.', 'cry');
    await api.move('isaiah', [14, 4]);
    api.face('isaiah', 'waverly');
    await api.say('isaiah', '…I\'m sorry, what?', { mood: 'shock' });
    var tell = await api.choice([
      { text: '"Tell him, baby. Tell us both."' },
      { text: '"Later. Right now I just want to hold her."' }
    ]);
    if (tell === 0) {
      await Wv(api, 'Trader called me. Since week two. He wanted to vent. I let him.', 'neutral');
      await Wv(api, 'When I didn\'t talk, he talked more. So I learned to not talk. Then I learned to ask for things like they were his idea.', 'neutral');
      await Wv(api, 'The prize-money question was mine. The notes were mine. I told him they said "Momma, help Trader."', 'smug');
      await Wv(api, 'And last night I told him to stand up to his bully.', 'sad');
      await api.say('luna', 'You… That was you. All of it.', { mood: 'shock' });
      await api.say('isaiah', 'An eleven-year-old ran the most-watched man in the country like a puppet. With a flip phone.', { mood: 'shock' });
      await api.say('isaiah', 'I want it noted that I am both horrified and deeply impressed.', { mood: 'happy' });
    } else {
      await Wv(api, 'Okay, Momma. Later. It\'s a long story. It has a horse in it.', 'happy');
      await api.say('isaiah', 'It has a WHAT in it?', { mood: 'shock' });
    }
    api.unlockPlayer();

    /* ---- Sirens ------------------------------------------------------ */
    api.sound('alarm');
    api.ambient('tension');
    await api.narrate('Then the sirens. Red and blue on the hill road, from both directions. Then from a third.');
    api.flash('#ff2a2a', 300);
    await api.think('Nowhere to run. Not with her. Not again.');
    api.addObject({ id: 'standmark', at: [16, 5], prop: 'sparkle', solid: false });
    api.objective('Stand in front of your daughter', { target: 'standmark' });
    await api.waitForInteract('standmark');
    api.objective(null);
    api.remove('standmark');
    api.teleport([16, 5], 'down');
    api.lockPlayer();
    await api.narrate('I step in front of her. Like I always have.');
    await api.move('waverly', [17, 5]);
    api.face('waverly', 'down');
    await api.narrate('And Waverly steps out from behind me, and stands next to me instead.');
    await api.move('isaiah', [18, 5]);
    api.face('isaiah', 'down');
    await api.narrate('Then Isaiah, squinting without his glasses, comes to stand on her other side.');
    api.flash('#3a6aff', 250);
    api.addObject({ id: 'car1', at: [8, 10], prop: 'squadcar', solid: true });
    api.addObject({ id: 'car2', at: [14, 11], prop: 'squadcar', solid: true });
    api.addNpc({ id: 'enf1', spec: 'enforcer', at: [9, 9], facing: 'up' });
    api.addNpc({ id: 'enf2', spec: 'enforcer', at: [15, 9], facing: 'up' });
    api.addNpc({ id: 'enf3', spec: 'enforcer', at: [12, 9], facing: 'up' });
    await api.move('enf3', [16, 7]);
    await api.say('enf3', 'ON THE GROUND. HANDS WHERE THEY CAN BE SEEN. COMPLIANCE IS MANDATORY.', { mood: 'neutral' });
    await Wv(api, 'We didn\'t do anyth—', 'angry');
    await api.shake(300, 2);
    await api.narrate('I push her down and cover her with my whole body. Someone wrenches my hands behind my back. I don\'t let go of her until they make me.');
    api.unlockPlayer();
  }

  async function partSquadCar(api) {
    await api.fadeOut(600);
    await api.slides([
      { style: 'black', title: 'The squad car', text: 'They put the three of us in the back of an old patrol car. A cage between us and the front seat. One android drives; the others stay behind to search the station.' },
      { style: 'black', text: 'Waverly rests her head on my shoulder. "What next, Momma?"\n"I don\'t know, baby. But we\'re together."' }
    ]);
    await api.say('isaiah', 'Do either of you know the history of these cars?', { mood: 'neutral' });
    await api.say('luna', 'Isaiah. Not now.', { mood: 'tired' });
    await api.say('isaiah', 'No, listen. This is a 2061 Sentinel. They recalled them because the rear door\'s child lock fails if you lean on the hinge side and lift the inner handle while the frame is under load.', { mood: 'neutral' });
    await api.say('isaiah', 'Three million units. The DPE bought the recalled stock at a discount. I wrote a report on it in ninth grade. I got a B. The teacher said it was "not relevant".', { mood: 'smug' });
    if (api.get('m_isaiah', 30) >= 60) await api.say('isaiah', 'For the record, Luna, I trust you with my life. I\'ve sort of already been doing that.', { mood: 'happy' });
    await api.narrate('I look at my daughter, so young and so much older than she should have to be. Her eyes are already on the door.');
    await api.say('luna', 'Isaiah. What are we waiting for?', { mood: 'angry' });
    await api.narrate('The car stops at a red light.');
    var steps = [
      { act: 'left', text: 'Lean left. All your weight on the hinge side. Slowly.', ok: 'The frame creaks. The android doesn\'t turn.', bad: 'Wrong way! Hinge side. LEFT.' },
      { act: 'down', text: 'Now get your heel down on the sill. Press. Keep pressing.', ok: 'Something in the door clicks.', bad: 'Your heel, Luna. Down.' },
      { act: 'up', text: 'Inner handle. Lift it UP. Gently, like it\'s a bird.', ok: 'The handle gives a quarter inch.', bad: 'Up! Lift, don\'t push.' },
      { act: 'ok', text: 'Now. SHOVE.', ok: '', bad: 'NOW, Luna!' }
    ];
    for (var tries = 0; tries < 5; tries++) {
      var r = await api.minigame('latch', { steps: steps, time: 6, strikes: 3, title: 'THE 2061 SENTINEL' });
      if (r.success) break;
      await api.narrate('The android turns its whole head round to look at us. We sit very still. Two more red lights go by before we dare try again.');
    }
    api.sound('door');
    await api.slides([{ style: 'black', text: 'The door swings open on the green. Cold air. Pine. Waverly is out first. Of course she is.' }]);
    api.setPlayer('luna');
    api.addNpc({ id: 'waverly_w', spec: 'waverly_phone', at: [2, 3], facing: 'right' }, ROOM.woods);
    api.addNpc({ id: 'isaiah_w', spec: 'isaiah_run', at: [1, 4], facing: 'right' }, ROOM.woods);
    await api.goRoom(ROOM.woods, { at: [0, 3], facing: 'right' });
    api.ambient('static');
    await api.say('isaiah', 'Into the trees! Androids lose GPS lock under canopy, that\'s in the report too!', { mood: 'fear' });
    api.objective('Run for the treeline', { target: 'treeline' });
    await api.waitForZone('treeline');
    api.objective(null);
    await api.narrate('We run until the sirens are a rumour, and then we keep running.');
  }

  async function partEpilogue(api) {
    api.hud(false);
    await api.fadeOut(900);
    await api.titleCard('Epilogue', 'Spring, 2086', 3000);
    api.setPlayer('luna_free');
    api.addNpc({ id: 'waverly_c', spec: 'waverly13', at: [14, 4], facing: 'down' }, ROOM.cabin);
    await api.goRoom(ROOM.cabin, { at: [3, 2], facing: 'down' });
    await api.narrate('Almost two years. A cabin in the woods we\'ve called home for one of them. Cozy, and sparse, because we could be forced to run at a moment\'s notice.');
    api.sound('sting');
    await api.say('waverly', 'EEEEEEE!', { name: 'Waverly (outside)', mood: 'shock' });
    await api.think('Waverly.');
    api.objective('Get to Waverly. NOW.', { target: 'waverly_c' });
    await api.waitForInteract('waverly_c');
    api.objective(null);
    await api.say('luna', 'Waverly? What\'s wrong? Did something happen? Should I grab our go-bag? Did you see—', { mood: 'fear' });
    await api.emote('waverly_c', '!', 700);
    await api.narrate('Waverly holds a finger up to her lips. I smile and copy the gesture.');
    await api.say('waverly13', 'It\'s okay, Momma. I just saw a mouse and got excited.', { mood: 'happy' });
    await api.say('luna', 'You scared me, baby.', { mood: 'sad' });
    await api.say('waverly13', 'I know. I\'m sorry.', { mood: 'sad' });
    await api.narrate('I hold her tight. There are still days when I wake up unable to believe that we\'re together again.');
    await api.say('luna', 'That\'s okay. Maybe that\'s enough outside time for today, eh? Want to help me bake cookies? It would be a very special treat to have dessert as well.', { mood: 'happy' });
    await api.say('waverly13', 'Yes!', { mood: 'happy' });
    // Optional wandering before the cookies
    api.objective('Look around (optional), then the stove', { target: 'stove' });
    await api.waitForInteract('stove');
    api.objective(null);
    api.placeNpc('waverly_c', [3, 2], 'up');
    await api.narrate('Waverly takes the job of stirring. I knead the dough. It gives me something to punch into submission.');
    var dough = await api.minigame('qte', { mode: 'mash', title: 'KNEAD THE DOUGH', prompt: 'Punch it into submission', target: 24, time: 5, decay: 5 });
    await api.think(dough.success ? 'The nights after we make cookies, I hardly ever wake up screaming.' : 'Lumpy. Waverly says lumpy cookies are the best kind. The nights after we make cookies, I hardly ever wake up screaming.');
    await api.narrate('The same cannot be said for all other nights.');
    api.sound('door');
    await api.narrate('The door. Waverly perks up. I stiffen, and put my arm out in front of her.');
    api.addNpc({ id: 'zey', spec: 'isaiah_zey', at: [9, 3], facing: 'left' });
    await api.say('isaiah_zey', 'It\'s okay. It\'s just me.', { name: 'Isaiah' });
    await api.move('waverly_c', [8, 3]);
    await api.say('waverly13', 'Uncle Zey! Did ya bring us the good stuff.', { mood: 'happy' });
    await api.say('isaiah_zey', 'You know I did.', { name: 'Isaiah', mood: 'happy' });
    await api.say('isaiah_zey', 'Now can you be a super good helper and put the food away so your mom and I can talk for a second?', { name: 'Isaiah' });
    await api.say('waverly13', 'I wanna talk, too.', { mood: 'angry' });
    await api.say('isaiah_zey', 'And so you shall. After you put the groceries away.', { name: 'Isaiah', mood: 'smug' });
    await api.say('waverly13', 'Fine.', { mood: 'tired' });
    await api.move('waverly_c', [2, 2]);
    api.objective('Step outside with Isaiah', { target: 'zey' });
    await api.waitForInteract('zey');
    api.objective(null);
    api.placeNpc('zey', [11, 4], 'left');
    api.teleport([11, 3], 'down');
    await api.say('luna', 'You want to tell me what\'s going on?', { mood: 'neutral' });
    await api.say('isaiah_zey', 'I picked up a copy of the news today.', { name: 'Isaiah', mood: 'tired' });
    await api.slides([
      { style: 'card', title: 'MURDEROUS GRANDMA RECAPTURED WHILE ATTEMPTING A BANK ROBBERY WITH A BANANA', text: 'EXPERTS SAY ALZHEIMER IS LIKELY CAUSE OF DELUSIONAL BEHAVIOR.\n(A photograph of Annette with a tragically confused expression.)' },
      { style: 'card', title: 'TRADER JOHNSON EXECUTED FOR PATRICIDE', text: 'Page 4. Two paragraphs. No photograph.' },
      { style: 'card', title: 'PRESIDENT HUMBERT\'S FIRST YEAR: "A KINDER JUSTICE"', text: 'Page 1, below the fold. A dove pin. A warm smile.' }
    ]);
    await api.say('isaiah_zey', 'I\'d like to say that she deserves it.', { name: 'Isaiah', mood: 'sad' });
    await api.say('luna', 'She does.', { mood: 'angry' });
    await api.narrate('He turns his wrist over to look at the scars where the chip came out. I know what he\'s thinking.');
    await api.say('luna', 'Just because she helped us out back then doesn\'t absolve her of what she did. I admit that we couldn\'t have escaped without her and I\'ll always be grateful for that but that doesn\'t mean I forgive her.', { mood: 'neutral' });
    await api.say('isaiah_zey', 'You\'re right.', { name: 'Isaiah' });
    await api.think('Trader. Page four. He gave me the phone. He held my mother\'s hand while they… I don\'t know what I feel. Maybe I never will.');
    await api.say('isaiah_zey', 'Anyway, I hear a little bird creeping this way, ready to eavesdrop her heart out.', { name: 'Isaiah', mood: 'smug' });
    api.placeNpc('waverly_c', [10, 4], 'right');
    await api.say('waverly13', 'All done.', { mood: 'happy' });
    await api.say('isaiah_zey', 'That\'s good. Because if we don\'t leave now, we\'ll be late for the meeting.', { name: 'Isaiah' });
    await api.say('luna', 'Do we really have to do that?', { mood: 'tired' });
    await api.say('isaiah_zey', 'We don\'t have to do anything you don\'t want to, but I thought we both agreed that it could do a lot of good if we did.', { name: 'Isaiah' });
    await api.say('luna', 'I know. It just seems like such a risk.', { mood: 'sad' });
    await api.say('isaiah_zey', 'These people are very discreet. Not to mention they\'re over an hour away from us. Let\'s costume up then and go.', { name: 'Isaiah', mood: 'happy' });
    api.onInteract('zey', async function (a) { a.set('ch16_ready', true); });
    var visit = [];
    if (api.get('f_salina_forgiven', true)) visit.push('bunnystone');
    if (api.get('f_comforted_john', true)) visit.push('candle');
    if (visit.length) {
      await api.until(function (f) { return f.ch16_ready; }, {
        objective: 'Before you go: ' + (visit.indexOf('bunnystone') >= 0 ? 'Salina\'s stone in the meadow' : '') + (visit.length === 2 ? ' / ' : '') + (visit.indexOf('candle') >= 0 ? 'John\'s candle' : '') + ' (or the car)',
        targets: visit.concat(['zey']),
        autoplay: async function (a) { a.set('ch16_ready', true); }
      });
    }
    api.onInteract('zey', async function (a) { a.set('ch16_ready', true); });
    if (!api.has('ch16_ready')) { api.objective('Tell Isaiah you\'re ready', { target: 'zey' }); await api.waitForInteract('zey'); }
    api.objective(null);
  }

  async function partMeeting(api) {
    await api.fadeOut(600);
    await api.slides([{ style: 'black', text: 'We pile into the car: the mother, the child, the boy who\'d become a man. Isaiah\'s disguise is a brown beard that completely changes his face. The first time he wore it, Waverly declared him a beardy good man.' }]);
    api.setPlayer('luna_free');
    api.addNpc({ id: 'zey_l', spec: 'isaiah_zey', at: [6, 4], facing: 'up' }, ROOM.lot);
    api.addNpc({ id: 'wav_l', spec: 'waverly13', at: [8, 4], facing: 'up' }, ROOM.lot);
    await api.goRoom(ROOM.lot, { at: [7, 5], facing: 'up' });
    api.objective('Knock on the steel door', { target: 'doorman' });
    await api.waitForInteract('doorman');
    api.objective(null);
    api.sound('door');
    await api.say('doorman', 'Password?', { mood: 'neutral', name: 'Voice' });
    var pw = 0, guesses = 0;
    while (true) {
      pw = await api.choice([
        { text: '"Viva la Johnsonlution."' },
        { text: '"Open sesame."', if: '!ch16_pw1' },
        { text: '"Right to Life."', if: '!ch16_pw2' }
      ]);
      if (pw === 0) break;
      guesses++;
      api.set('ch16_pw' + pw, true);
      await api.say('doorman', pw === 1 ? 'Nope.' : 'Funny. Real funny. Try again before I stop being polite.', { mood: 'angry', name: 'Voice' });
      if (guesses === 1) await api.say('isaiah_zey', '(whispering) Luna. The Trader one. The pun.', { name: 'Isaiah' });
    }
    api.sound('door');
    await api.say('doorman', 'Welcome, friends. We ask that you please take a mask as you enter, as protecting the identity of our members is our highest priority.', { mood: 'happy' });
    api.setPlayer('luna_mask');
    await api.narrate('A large bear of a man, grinning from behind a black mask. I have to help Waverly with hers, pulling the straps tight behind her ears.');
    await api.say('doorman', 'Straight through the hall, first door to the left. I\'m the watcher tonight, so you can trust I\'ll look out for you.');
    await api.slides([
      { style: 'black', text: 'The hall is cold and dark. I clutch Waverly\'s hand.\n"This place gives me the creeps."\n"They change location every month," Isaiah says. "Maybe the next one will be less creepy."' }
    ]);
    await api.say('waverly_mask', 'I don\'t like it. It reminds me of being locked in the closet.', { name: 'Waverly', mood: 'sad' });
    await api.think('Whenever she says things like that about the group home, it feels like my heart is breaking.');
    await api.say('luna_mask', 'We can leave right now if you want.', { name: 'Luna', mood: 'sad' });
    await api.say('waverly_mask', 'No. I\'m brave and I want to stay.', { name: 'Waverly', mood: 'neutral' });
    await api.say('luna_mask', 'Yes you are, my girl. You are the bravest kid in the whole wide world.', { name: 'Luna', mood: 'happy' });
    api.addNpc({ id: 'wav_h', spec: 'waverly_mask', at: [7, 3], facing: 'up' }, ROOM.hall);
    api.addNpc({ id: 'zey_h', spec: 'zey_mask', at: [9, 3], facing: 'up' }, ROOM.hall);
    await api.goRoom(ROOM.hall, { at: [7, 10], facing: 'up' });
    await api.narrate(api.get('m_audience', 40) >= 70
      ? 'The room is packed. People stand along the walls, masked, murmuring. Word got round that someone special was speaking.'
      : 'People, about twenty of them, mill around plastic chairs, chatting. Most of them seem to already know each other.');
    if (api.get('f_markus_deal', true)) {
      await api.narrate('A tall masked teenager by the wall lifts two fingers to his mask when Waverly passes. She lifts two fingers back. Lions.');
    }
    api.objective('Find a seat in the front row (talk to people if you like)', { target: 'wav_h' });
    await api.waitForInteract('wav_h');
    api.objective(null);
    api.teleport([8, 3], 'up');
    await api.say('rhost', 'Excuse me. If everyone could please quiet down and take your seats, we\'ll be getting started in just a moment.');
    await api.say('rhost', 'Thank you to all our returning members and welcome to all our newcomers. None of you would be here today if you hadn\'t already put forth significant effort to enact change.');
    api.sound('applause');
    await api.narrate('Everyone claps. Even warned, I flinch at the noise. At least three other people within eyesight flinch too.');
    await api.say('rhost', 'We have a very special guest with us today. She couldn\'t tell her story without us knowing who she is, so we are so grateful she agreed to come.');
    await api.say('rhost', 'An absolute inspiration, not only surviving against all odds, but a legacy: the daughter of one of the most effective revolutionaries of her generation. Show her the utmost respect.');
    await api.narrate('The crowd mutters, wondering who this mystery woman could be. The host beckons me up.');
    api.addObject({ id: 'mark_mic', at: [7, 2], prop: 'sparkle', solid: false });
    api.move('rhost', [4, 1]);
    api.objective('Go up to the microphone', { target: 'mark_mic' });
    await api.waitForInteract('mark_mic');
    api.objective(null);
    api.remove('mark_mic');
    api.teleport([7, 2], 'down');
    await api.narrate('Hands shaking but resolute. I stare down into all those masked faces. These people are about to know who I am. There\'s no point in hiding like this.');
    var un = await api.choice([{ text: '(Lower the mask.)' }, { text: '(Keep it on a moment longer.)' }]);
    if (un === 1) await api.think('Count to seven. Then the second thought.');
    api.setPlayer('luna_free');
    api.flash('#ffffff', 200);
    await api.say('luna', 'Thank you for having me. My name is Luna Bartley and I am a survivor and escapee of the Right to Life show. This is my story…', { mood: 'neutral' });
    await api.fadeOut(1400);
  }

  async function runCanon(api) {
    api.set('ch16_ending', 'canon');
    await partWaverlyCalls(api);
    await partWaverlyPhone(api);
    await partWaverlyTest(api);
    await partWaverlyHQ(api);
    await partWaverlyGrandma(api);
    await partWaverlyNote3(api);
    await partWaverlyLastCall(api);
    await partWaverlyEscape(api);
    await partReunion(api);
    await partSquadCar(api);
    await partEpilogue(api);
    await partMeeting(api);
    await endCard(api, 'They Saved Each Other', [
      ['Luna Bartley', 'Speaks at resistance meetings in a different town every month. Bakes cookies. Sleeps through most nights.'],
      ['Waverly Bartley', 'Thirteen. Draws cats, and maps. Keeps a notebook titled THINGS I KNOW ABOUT GROWN-UPS.'],
      ['Isaiah Blueford', '"Uncle Zey". Drives carefully. Has read every book in three counties. Still has the B.'],
      ['Viva la Johnsonlution', 'Named for the man who held the remote, and finally put it down.']
    ]);
    api.completeChapter();
  }

  /* =====================================================================
   * ALTERNATE A: "The New Leader"  (m_waverly < 35)
   * =================================================================== */
  async function runAltA(api) {
    api.set({ ch16_ending: 'A', ch16_day: 2, ch16_lockDorm: true });
    api.setPlayer('waverly_phone');
    await api.slides([{ style: 'black', title: 'Waverly', text: 'Columbus House. Momma doesn\'t want her help. Momma said so.\nOther people call, now. Not just Trader.' }]);
    await api.goRoom(ROOM.office, { at: [4, 3], facing: 'up' });
    await api.say('director', 'Bartley. Phone. The senator\'s office. Mind your manners.', { mood: 'tired' });
    api.objective('Pick up the phone');
    await api.waitForInteract('house_phone');
    api.objective(null);
    await api.say('humbert', 'Hello, Waverly. You don\'t know me. I\'m a friend. I wear a little dove pin, so you\'ll know me when we meet.', { name: 'The nice man (phone)', mood: 'happy' });
    await api.say('humbert', 'Your mother is very angry right now. Angry people make mistakes. But your mother will be safe if you do as I say.', { name: 'The nice man (phone)', mood: 'neutral' });
    await api.choice([{ text: '"…Okay."' }, { text: '"Momma doesn\'t want my help."' }]);
    await api.say('humbert', 'She doesn\'t know what she wants, sweetheart. Grown-ups rarely do. That\'s why she has you. And you have me.', { name: 'The nice man (phone)', mood: 'smug' });
    await N(api, 'Trader still calls too. Waverly lets him talk. She tells the nice man everything Trader says. The nice man is always so pleased.');
    await api.think('Momma said no. The nice man says yes. The nice man never yells.', { name: 'Waverly' });
    await N(api, 'On the eighth of February a car comes for her. Not a trucker. A long black car with a dove on the bonnet.');
    await api.goRoom(ROOM.station, { at: [16, 3], facing: 'down' });
    api.sound('alarm');
    await Wv(api, 'Momma?', 'neutral');
    await api.say('luna', '…Waverly?', { name: 'Momma (phone)', mood: 'shock' });
    await Wv(api, 'Momma, would you still love me if I had a big secret? Even if it was as big as a horse?', 'neutral');
    await api.say('luna', 'Baby… of course. What secret?', { name: 'Momma (phone)', mood: 'fear' });
    await Wv(api, '…I\'m at the gas station on Old Mill Road. Two miles.', 'neutral');

    // Luna arrives
    await api.fadeOut(600);
    api.setPlayer('luna');
    api.addNpc({ id: 'waverly', spec: 'waverly_phone', at: [10, 1], facing: 'down' }, ROOM.station);
    api.addNpc({ id: 'isaiah', spec: 'isaiah_run', at: [2, 10], facing: 'right' }, ROOM.station);
    await api.goRoom(ROOM.station, { at: [3, 10], facing: 'right' });
    await api.think('She\'s standing by the shop door. Not on the bench. Not running to me. Just standing.');
    api.objective('Go to Waverly', { target: 'waverly' });
    await api.waitForInteract('waverly');
    api.objective(null);
    await api.say('luna', 'Baby. Baby, come here.', { mood: 'cry' });
    await Wv(api, 'Come inside, Momma. It\'s warm in there.', 'neutral');
    await api.think('Her eyes. Glassy. Like the kids at Columbus who\'d stopped expecting anything.');
    await api.move('isaiah', [8, 2]);
    await api.say('isaiah', 'Luna. That shop\'s been closed for years. Who unlocked it?', { mood: 'fear' });
    var fa = await api.choice([
      { text: 'Follow her in. You will not lose her again.' },
      { text: 'Grab her and run.' }
    ]);
    if (fa === 1) {
      await Wv(api, 'If you touch me, I\'ll run. And you\'ll never find me. Come inside.', 'angry');
      await api.think('She means it. I can hear that she means it. I am not losing her again. Not for anything.');
    }
    await api.say('isaiah', 'I\'m not walking into that. I\'m sorry, Luna. I\'m so sorry.', { mood: 'sad' });
    await api.move('isaiah', [0, 10]);
    api.remove('isaiah');
    await api.narrate('He\'s gone into the dark. I take my daughter\'s hand. It is cold and it does not hold mine back.');
    await api.goRoom(ROOM.shop, { at: [4, 4], facing: 'up' });
    await api.say('humbert', 'Miss Bartley. Thank you, Waverly. Well done. Go and stand by the door, sweetheart.', { mood: 'happy' });
    await api.say('humbert', 'Senator Jeremy Humbert. We\'ve not been introduced, but I feel I know you. Your daughter talks about you all the time.', { mood: 'smug' });
    await api.say('humbert', 'Trader didn\'t kill his father because of you, you know. Or not only. I\'d been whispering to him for months. A man that broken only needs a little nudge.', { mood: 'smug' });
    await api.say('humbert', 'And when the Judge was dead, someone had to have done it. Who better than Franchesca Bartley\'s rebellious little girl, with her motive, and her history, and the cameras so mysteriously disabled?', { mood: 'smug' });
    await api.say('humbert', 'Trader will perish before anyone can ask him anything. Tragic. And catching you will be the first act of my career.', { mood: 'happy' });
    await api.say('luna', 'You used my daughter.', { mood: 'angry' });
    await api.say('humbert', 'I listened to your daughter, Miss Bartley. Someone had to.', { mood: 'sad' });
    await api.shake(300, 2);

    // Months later; first person present (the author's rule for this ending)
    await api.fadeOut(900);
    await api.slides([
      { style: 'black', title: 'Months later', text: 'I am kept in a cell with no TV. The authorities scramble to work out what happened that day. The cameras were disabled. Nobody can ask Trader anything any more.' },
      { style: 'black', text: 'They come for me on the morning of the inauguration. It is bright. It is so bright.' }
    ]);
    api.setPlayer('luna_prison');
    await api.goRoom(ROOM.stage, { at: [10, 7], facing: 'up' });
    api.onAir(true);
    await api.tv({ speaker: 'humbert', mood: 'sad', headline: 'PRESIDENT HUMBERT SWORN IN', text: 'My dear friend Judge Johnson was taken from us by hatred. It is with a heavy heart, and in his memory, that my first act is one of justice. Gentle justice. Kind justice.', tag: 'LIVE' });
    await api.narrate('He is oozing sympathy. Every word of it fake. The crowd loves him.');
    api.addObject({ id: 'steps', at: [12, 3], prop: 'sparkle', solid: false });
    api.objective('Climb the steps', { target: 'steps' });
    await api.waitForInteract('steps');
    api.objective(null);
    api.teleport([12, 3], 'down');
    await api.narrate('I climb the steps. I do not beg. I count them in sevens.');
    await api.narrate('Waverly is in the front row in a white dress. A ward of the state\'s mercy. She stares at the gallows the way she used to stare at the TV.');
    api.lockPlayer();
    await api.emote('waverly_s', '!', 900);
    await api.narrate('And then she blinks. And then she is herself. I watch it happen, the way you watch the sun come out.');
    await api.say('waverly_s', 'MOMMA!', { name: 'Waverly', mood: 'cry' });
    await api.move('waverly_s', [9, 4]);
    await api.move('tb_s2', [8, 4]);
    await api.narrate('A True Believer catches her before the stage. She kicks. He lifts her like she weighs nothing and drags her back into the crowd.');
    await api.narrate('Then, where only I can see, he lifts his mask. Just an inch.');
    await api.say('tb_s2', '(a wink)', { name: 'Isaiah', mood: 'smug' });
    await api.think('Isaiah. He couldn\'t save me. But he can save her.');
    api.unlockPlayer();
    await api.slides([
      { style: 'montage', title: '', text: 'A fridge door with a note on it. 9-8-10-18 / 26-22-22-21.' },
      { style: 'montage', title: '', text: 'An alley behind a diner. A baby who would not breathe, and then did.' },
      { style: 'montage', title: '', text: 'My mother, red hair, in a nurse\'s blue scrubs, saying seven seconds. That\'s all it takes.' },
      { style: 'montage', title: '', text: 'They pull a mask down over my face. Gold. Smiling.' },
      { style: 'black', text: 'I am proud that I never fully conformed.\n\nWaverly will be all right. Waverly will be better off than I was.\n\nI did my absolute best. Just like my mother before me.' }
    ]);
    api.onAir(false);
    await endCard(api, 'The New Leader', [
      ['Luna Bartley', 'Executed on the first day of the new administration. The broadcast drew the highest ratings in EEN history.'],
      ['Waverly Bartley', 'Disappeared from state care three weeks later. A True Believer was reported missing the same night.'],
      ['President Jeremy Humbert', '"A kinder justice."']
    ]);
    api.completeChapter();
  }

  /* =====================================================================
   * ALTERNATE B: "Annette's Lesson"  (f_killed_trader)
   * =================================================================== */
  async function runAltB(api) {
    api.set('ch16_ending', 'B');
    api.setPlayer('luna');
    await api.slides([
      { style: 'black', title: 'No phone', text: 'Trader is dead. I did that. There is no phone, and no top number.' },
      { style: 'black', text: 'Annette knew an older override code, from "a guard who liked to talk". The perimeter alarm screamed anyway. We ran.' }
    ]);
    api.addNpc({ id: 'isaiah_b', spec: 'isaiah_run', at: [1, 4], facing: 'right' }, ROOM.woods);
    await api.goRoom(ROOM.woods, { at: [0, 3], facing: 'right' });
    await api.say('isaiah', 'Luna. Annette. She was right behind us.', { mood: 'fear' });
    await api.think('Of course she\'s gone. She got what she wanted. She always does.');
    await stealthUntilSafe(api, {
      title: 'THE TREELINE', prompt: 'Drone searchlights sweep the woods. Get Isaiah to the river.', playerSpec: 'luna',
      map: [
        '########################',
        '#@.....P.....P.....P...#',
        '#..P......P.....P......#',
        '#......P.....P.....P..*#',
        '#..P......P.....P......#',
        '#......P.....P.........#',
        '########################'
      ],
      legend: { 'P': 'ch16:tree' },
      cameras: [{ at: [6, 0], angle: 90, sweep: 110, range: 80, speed: 0.8, fov: 30 }, { at: [16, 6], angle: 270, sweep: 110, range: 80, speed: 0.7, fov: 30 }],
      lives: 3
    }, 'The light finds us. We drop into the ferns and lie still until it slides away.');
    await api.narrate('We reach the river by dawn. We wash the blood off in it. Some of it is Trader\'s.');
    api.objective('Keep going', { target: 'treeline' });
    await api.waitForZone('treeline');
    api.objective(null);

    await api.fadeOut(900);
    await api.titleCard('Epilogue', 'Spring, 2086', 3000);
    api.setPlayer('luna_free');
    api.addNpc({ id: 'zey_b', spec: 'isaiah_zey', at: [5, 2], facing: 'down' }, ROOM.cabin);
    api.addObject({ id: 'stolen_tv', at: [3, 4], prop: 'tvset', solid: true }, ROOM.cabin);
    await api.goRoom(ROOM.cabin, { at: [2, 2], facing: 'down' });
    await api.narrate('A cabin in the woods. Two cots. One of them is mine and one is Isaiah\'s. There was supposed to be a third.');
    api.objective('Turn on the stolen TV', { target: 'stolen_tv' });
    await api.waitForInteract('stolen_tv');
    api.objective(null);
    await api.tv([
      { speaker: 'humbert', mood: 'happy', headline: 'PRESIDENT HUMBERT SWORN IN', text: 'Today we turn the page on cruelty. A kinder justice, for a kinder nation.', tag: 'LIVE' },
      { speaker: 'waverly', mood: 'neutral', headline: 'A WARD OF THE STATE\'S MERCY', text: '(Waverly, in a white dress, holding the new President\'s hand. She doesn\'t smile. She doesn\'t look at the camera.)', tag: 'LIVE' }
    ]);
    await api.say('isaiah_zey', 'Luna… turn it off. Please.', { name: 'Isaiah', mood: 'sad' });
    await api.think('She\'s taller. Her hair is straightened. Someone taught her to stand like that.');
    await api.think('She\'s not looking at the camera. She never looks at the camera. That\'s my girl.');
    await api.say('luna', 'One day.', { mood: 'angry' });
    await api.say('luna', 'But not today.', { mood: 'sad' });
    await endCard(api, 'Annette\'s Lesson', [
      ['Luna Bartley', 'Learned what Annette was trying to teach her: that a gun answers one question and creates a hundred more.'],
      ['Isaiah Blueford', 'Taught himself to forge papers. He is getting very good at it.'],
      ['Waverly Bartley', 'A ward of Senator, now President, Humbert. She keeps a notebook nobody has ever seen.']
    ]);
    api.completeChapter();
  }

  /* ---------------------------------------------------------------------
   * REGISTRATION
   * ------------------------------------------------------------------- */
  G.registerChapter({
    id: 'ch16',
    title: 'They Saved Each Other',
    kicker: 'THE FINAL CHAPTER',
    maps: maps,
    cast: cast,
    tiles: tiles,
    props: props,
    minigames: { encode: encodeGame, latch: latchGame },
    testDefaults: {
      m_waverly: 60, m_audience: 40, m_isaiah: 30,
      f_killed_trader: false, f_called_top_number: true, f_code_reply_sent: true,
      f_note2_decoded: true, f_note3_decoded: true, f_trader_note_left: true,
      f_markus_deal: true, f_salina_forgiven: true, f_comforted_john: true
    },

    start: async function (api) {
      applyPreset(api);
      // Clear chapter-local state from any earlier attempt (Continue restarts from start flags anyway).
      ['ch16_trust', 'ch16_ready', 'ch16_pw1', 'ch16_pw2', 'ch16_p0', 'ch16_p1', 'ch16_p2', 'ch16_d1_looked', 'ch16_d2_bunk'].forEach(function (k) { delete api.flags[k]; });
      api.set('ch16_trust', 0);
      // ---- THE ENDING GATE (CHAPTERS.md §5; B outranks A) ----
      var killed = api.get('f_killed_trader', false) === true;
      var bond = api.get('m_waverly', 60);
      api.log('ending gate: f_killed_trader=' + killed + ' m_waverly=' + bond);
      if (killed) return runAltB(api);
      if (bond < 35) return runAltA(api);
      return runCanon(api);
    }
  });
})();
