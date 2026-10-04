/* =========================================================================
 * ch03 "Right to Life": Day 1 at the House (Sun 7 Jan 2084)
 *
 * Gate and jewel door -> Ginerva's ruler -> guided tour (follow her) -> the
 * watch -> Luna's room (booklet codex, Delphin's page) -> Jemessa ("Lunar")
 * -> the keyhole and Delphin's laughing reunion -> the ball (Mr. I Never,
 * the noose fountain, John, the waiter + Carol + Kessie, the selfie flash,
 * PANIC minigame) -> mirror bathroom (mirror toy, Annette, Carol) -> Trader
 * lets her leave, once -> Elephant in the hall -> library (light switch,
 * Falsville, Isaiah) -> PLAYABLE MEMORY: the arrest, 2060 -> Isaiah's door
 * -> the DPE nightgown, the lullaby. End.
 *
 * Source: D3b L320-607 (arrival, ball, bathroom, leave, Elephant, library,
 * memory), AB L29-73 (Jemessa), NO L88-91 (memory meaning, Isaiah's door),
 * 2D L471-474 (ballroom art). Canon edits: SAVE-vote booklet wording, Waverly
 * is eleven, Delphin estranged childhood friend (CHAPTERS §0).
 *
 * CROSS-CHAPTER FLAGS (CHAPTERS.md §2)
 *   Reads:  m_audience, m_delphin, m_kessie, m_annette, m_isaiah (defaults)
 *   Sets:   f_helped_waiter (bool), f_jemessa_triangle (bool; ch05 applies
 *                        the -5 m_delphin)
 *           m_audience  (HUD approval meter; api.approval() writes it)
 *           m_delphin   (+10 take his hand, +3 "Later, then", -3 Salina jab)
 *           m_kessie    (+5 helped the waiter)
 *           m_annette   (+5 stool, +2 laughed at her joke)
 *           m_isaiah    (+10 warm in the library, +10 knocked on door 7)
 * Local flags: ch03_*
 *
 * SHARED LOCATIONS: every House room comes from play/shared via G.shared.map,
 * registered under the SAME local id as the shared name so the shared exits
 * ('to_<room>' -> 'house_<room>') resolve. If a shared room is missing, a
 * MINIMAL grey placeholder box is used (CHAPTER_BRIEF: placeholder fallback).
 * The only room drawn here is the 2060 memory flat ('memflat').
 * ========================================================================= */
(function () {
  'use strict';

  /* ---------------------------------------------------------------------
   * CONSTANTS: shared names (one place to change)
   * ------------------------------------------------------------------- */
  var H = {
    grounds: 'house_grounds',
    foyer: 'house_foyer',
    hall: 'house_red_hall',
    bedhall: 'house_bedroom_hall',
    room: 'house_luna_room',
    ball: 'house_gym_ballroom',
    bath: 'house_mirror_bath',
    library: 'house_library'
  };
  var MEM = 'memflat';
  var LOCAL_IDS = [H.grounds, H.foyer, H.hall, H.bedhall, H.room, H.ball, H.bath, H.library, MEM];

  /* Tile positions per room for ch03's own NPCs / objects / zones.
   * `stub` = coordinates inside the placeholder box. Replace with shared
   * layout coordinates once the room exists. */
  var POS = {
    // shared house_grounds (60x32): jewel door [13,21], gate [13,30]
    grounds: { arrive: [13, 29], ginerva: [13, 22], knock: [12, 23], enforcer: [14, 29], van: [9, 29] },
    // shared house_foyer (14x11)
    foyer: { arrive: [6, 9], ginerva: [8, 8], stair: [11, 4] },
    // shared house_red_hall (42x6): gym double doors [41,2..3]
    hall: { arrive: [1, 3], tour: [[5, 2], [13, 3], [21, 3], [38, 3]], keyhole: [40, 3], fromBall: [40, 3], fromLibrary: [12, 1] },
    // placeholder until house_bedroom_hall exists
    bedhall: { arrive: [3, 2], tourStop: [12, 2], isaiahDoor: [24, 1], lunaDoor: [14, 1], moanDoor: [19, 0] },
    // placeholder until house_luna_room exists
    room: { arrive: [4, 8], jemessa: [4, 5], nightgown: [6, 3] },
    // shared house_gym_ballroom (24x20): door_in [1,9], fountain [4,11], stage x9-13 y5-7
    ball: {
      arrive: [1, 9], delphin: [2, 10], inever: [6, 8], john: [5, 12],
      waiterDrop: [15, 9], carol: [17, 8], kessieFrom: [19, 13], selfie: [9, 12],
      trader: [11, 8], fan1: [10, 9], fan2: [12, 9], fan3: [9, 8],
      kid: [7, 14], bettor1: [17, 12], bettor2: [18, 12], blue: [5, 5], odds: [10, 1]
    },
    // shared house_mirror_bath (8x8): door [3,0], stalls [2,5]/[4,5], button [6,2], stool [5,3]
    bath: { arrive: [3, 1], annetteOut: [4, 5], carolStall: [2, 5] },
    // shared house_library (12x12): door [6,11]
    library: { arrive: [6, 10], switch: [5, 10], shelfA: [8, 1], shelfB: [10, 5], chair: [4, 5], sit: [5, 6], isaiahChair: [7, 6] }
  };
  /* The Luna-room / bedroom-hall placeholders connect through the foyer stair. */
  var STUB = {
    bedhall: { w: 40, h: 5, floor: 'R', exits: [
      { id: 'to_foyer', at: [0, 2], to: H.foyer, toAt: [11, 4], facing: 'down' },
      { id: 'to_luna_room', at: [14, 0], to: H.room, toAt: [3, 6], facing: 'up' }] },
    room: { w: 8, h: 8, floor: ',', exits: [{ id: 'to_bedroom_hall', at: [3, 7], to: H.bedhall, toAt: [14, 1], facing: 'down' }] }
  };
  function stubTiles(s) {
    var rows = [];
    for (var y = 0; y < s.h; y++) {
      var r = '';
      for (var x = 0; x < s.w; x++) r += (y === 0 || y === s.h - 1 || x === 0 || x === s.w - 1) ? '#' : s.floor;
      rows.push(r);
    }
    s.exits.forEach(function (e) { var row = rows[e.at[1]]; rows[e.at[1]] = row.slice(0, e.at[0]) + 'D' + row.slice(e.at[0] + 1); });
    return rows;
  }
  /** House room: the shared map extended with ch03 content, or a MINIMAL placeholder box. */
  function house(key, ext) {
    var name = H[key];
    if (G.shared && G.shared.has(name)) return G.shared.map(name, ext);
    var s = STUB[key];
    if (!s) { G.reportError(new Error('ch03: shared map ' + name + ' missing and no placeholder'), 'ch03'); s = { w: 8, h: 6, floor: '.', exits: [] }; }
    var m = { name: name + ' (placeholder)', tiles: stubTiles(s), spawn: POS[key].arrive, bg: '#07070a' };
    Object.keys(ext).forEach(function (k) { if (k !== 'remove') m[k] = ext[k]; });
    m.exits = s.exits.concat(ext.exits || []);
    m.placeholder = true;
    return m;
  }
  /** Spawn point in a shared room ('from_<room>'), else the fallback. */
  function spawnAt(mapId, from, fallback) {
    var s = G.shared && G.shared.data && G.shared.data.spawns && G.shared.data.spawns[mapId];
    return (s && s[from]) ? s[from].slice() : fallback;
  }

  /* Gate exits: during scripted phases, doors the player must not take yet.
   * Applied to every exit after the maps are built: exits that point at a map
   * ch03 doesn't have are locked with a thought; others get phase gates. */
  var NOT_NOW = {
    house_kitchen: 'The smell of real meat. Later. If there is a later.',
    house_lounge: 'Embroidered pillows and a wall screen. Not now.',
    house_gym: 'The gym.',
    house_doll_room: 'Upstairs is off limits unless invited.',
    _default: 'Not now. I have to keep my head down today.'
  };
  function gateExits(maps) {
    Object.keys(maps).forEach(function (id) {
      var m = maps[id];
      (m.exits || []).forEach(function (e) {
        if (!e.to) return;
        if (LOCAL_IDS.indexOf(e.to) < 0) {
          var txt = NOT_NOW[e.to] || NOT_NOW._default;
          e.locked = function () { return true; };
          e.lockedText = [{ think: txt }];
          return;
        }
        var gate = GATES[e.to];
        if (gate) {
          var prev = e.locked;
          e.locked = function (f, api) { return gate.cond(f, api) || (prev ? G.Script.check(prev) : false); };
          e.lockedText = function (api) { return api.think(typeof gate.text === 'function' ? gate.text(api.flags) : gate.text); };
        }
      });
    });
  }
  /* A destination is locked while cond() holds. */
  var GATES = {};
  GATES[H.ball] = { cond: function (f) { return !f.ch03_lateForBall || !f.ch03_atBall || f.ch03_leftBall; }, text: function (f) { return f.ch03_leftBall ? 'Trader let me go once. I am not walking back into that.' : f.ch03_lateForBall ? 'Late already. A quick peek through the keyhole first.' : 'Ginerva said the gym is off limits until six.'; } };
  GATES[H.bath] = { cond: function () { return true; }, text: 'Somebody is in there. Never mind.' };
  GATES[H.library] = { cond: function (f) { return !f.ch03_elephantDone || f.ch03_memoryDone; }, text: function (f) { return f.ch03_memoryDone ? 'Not back in there. Not tonight.' : 'Books. Later. Ginerva is still talking.'; } };
  GATES[H.grounds] = { cond: function (f) { return f.ch03_inside; }, text: 'Any attempt to escape will lead to your death. She said it like a breakfast menu.' };
  GATES[H.bedhall] = {
    cond: function (f) { return !f.ch03_tourHallDone || (f.ch03_inRoomPhase && !f.ch03_lateForBall); },
    text: function (f) { return !f.ch03_tourHallDone ? 'Ginerva is not finished with the ground floor.' : 'The lock clicked behind her. Read the booklet. Rest.'; }
  };
  GATES[H.room] = { cond: function (f) { return f.ch03_memoryDone && !f.ch03_door7Done; }, text: 'Someone is crying down the hall. I can\'t pretend I don\'t hear it.' };

  /* ---------------------------------------------------------------------
   * CAST: only characters shared/cast.js doesn't already define.
   * ------------------------------------------------------------------- */
  /* Shared cast (play/shared/cast.js) supplies ginerva, jemessa, tb_elephant,
   * tb, franchesca, luna_child/ball/night, waiter, trader_ball, *_ball,
   * guest, guest_lady, kid_fancy, band. Only one-off ball guests are local
   * (named variants of the shared guest specs). */
  var cast = {
    inever: { extends: 'guest', name: 'Mr. I Never', hairStyle: 'bald', hair: '#bdbdbd', build: 'broad', accessory: ['tie', 'glasses'], accent: '#a02020', voice: 250 },
    selfie: { extends: 'guest_lady', name: 'Guest', outfit: '#d8a028', outfit2: '#d8a028', build: 'broad', accessory: 'earrings', voice: 600 },
    peacock: { extends: 'guest_lady', name: 'Guest', outfit: '#1a6a9a', outfit2: '#1a6a9a', voice: 560 },
    kid_hat: { extends: 'kid_fancy', name: 'Kid in a Hat' },
    bettor: { extends: 'guest', name: 'Bettor', voice: 300 },
    bettor_b: { extends: 'guest', name: 'Bettor', outfit: '#2a3a5a', hair: '#1a1a1a', voice: 280 },
    singer: { extends: 'band', name: 'Singer', outfit: '#2a4ac8', outfit2: '#2a4ac8', style: 'dress', hairStyle: 'long', accessory: 'mic', voice: 520 },
    fan: { extends: 'guest_lady', name: 'Admirer', outfit: '#c83a6a', outfit2: '#c83a6a', voice: 580 },
    mom: { extends: 'franchesca', name: 'Mom' }
  };

  /* ---------------------------------------------------------------------
   * PROPS (pixel art drawn on the 16 px tile)
   * ------------------------------------------------------------------- */
  function px(g, x, y, w, h, c) { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), w, h); }
  var props = {
    gnome: function (g, x, y) { px(g, x + 5, y + 3, 6, 5, '#c83a3a'); px(g, x + 7, y + 1, 2, 2, '#c83a3a'); px(g, x + 5, y + 8, 6, 3, '#f0d0b0'); px(g, x + 5, y + 10, 6, 3, '#f0f0f0'); px(g, x + 4, y + 11, 8, 4, '#3a6ac8'); px(g, x + 6, y + 9, 1, 1, '#222'); px(g, x + 9, y + 9, 1, 1, '#222'); },
    van: function (g, x, y) { px(g, x - 8, y + 1, 32, 14, '#d8d8dc'); px(g, x - 8, y + 1, 32, 2, '#aab'); px(g, x - 6, y + 4, 8, 5, '#2a3a4a'); px(g, x + 14, y + 4, 8, 5, '#2a3a4a'); px(g, x + 3, y + 6, 10, 3, '#e8323c'); px(g, x - 5, y + 14, 6, 3, '#111'); px(g, x + 15, y + 14, 6, 3, '#111'); },
    keypad: function (g, x, y, t) { px(g, x + 5, y + 4, 6, 8, '#2a2a30'); for (var i = 0; i < 3; i++) for (var j = 0; j < 3; j++) px(g, x + 6 + i * 2, y + 5 + j * 2, 1, 1, '#8ac'); px(g, x + 7, y + 11, 2, 1, Math.sin(t * 4) > 0 ? '#3f3' : '#151'); },
    penguin: function (g, x, y) { px(g, x + 4, y + 3, 8, 10, '#c9a24a'); px(g, x + 5, y + 4, 6, 8, '#16161c'); px(g, x + 6, y + 6, 4, 6, '#f0f0f0'); px(g, x + 7, y + 5, 2, 1, '#e8a020'); },
    booklet: function (g, x, y) { px(g, x + 3, y + 5, 10, 8, '#f0f0f0'); px(g, x + 3, y + 5, 10, 2, '#e8323c'); px(g, x + 7, y + 8, 3, 4, '#16161c'); px(g, x + 8, y + 10, 1, 2, '#fff'); },
    tablet: function (g, x, y, t) { px(g, x + 2, y + 3, 12, 9, '#111'); px(g, x + 3, y + 4, 10, 7, Math.sin(t * 1.3) > 0 ? '#e8b878' : '#d89868'); px(g, x + 6, y + 6, 3, 3, '#5a3220'); },
    eye: function (g, x, y, t) { px(g, x + 5, y + 9, 6, 3, '#e8e8e8'); px(g, x + 7, y + 10, 2, 1, Math.floor(t * 2) % 2 ? '#f33' : '#600'); },
    shower: function (g, x, y, t) { px(g, x + 3, y + 2, 10, 12, '#c8d8e0'); px(g, x + 4, y + 3, 8, 5, '#1a3a4a'); px(g, x + 5, y + 4, 6, 1, '#4af'); px(g, x + 5, y + 6, 4, 1, Math.sin(t * 5) > 0 ? '#4af' : '#1a3a4a'); },
    nightgown: function (g, x, y) { px(g, x + 3, y + 6, 10, 8, '#e8e0ee'); px(g, x + 6, y + 6, 4, 2, '#c8c0ce'); px(g, x + 5, y + 9, 6, 1, '#5a3a7a'); },
    fountain: function (g, x, y, t) { // the noose: a chocolate loop on a pedestal
      px(g, x + 2, y + 12, 12, 4, '#c9a24a'); px(g, x + 6, y + 4, 4, 9, '#5a3018');
      g.strokeStyle = '#6a3a1a'; g.lineWidth = 2; g.beginPath(); g.arc(x + 8, y - 2, 5, 0, Math.PI * 2); g.stroke();
      px(g, x + 7, y + 2, 2, 3, '#6a3a1a');
      var d = Math.floor(t * 6) % 4; px(g, x + 4 + d, y + 6 + d, 1, 2, '#7a4a2a'); px(g, x + 11 - d, y + 7 + d, 1, 2, '#7a4a2a');
    },
    stars: function (g, x, y, t) { for (var i = 0; i < 4; i++) { var a = 0.5 + 0.5 * Math.sin(t * 2 + i * 1.7); g.globalAlpha = a; px(g, x + 2 + i * 4, y + 2 + (i % 2) * 6, 1, 1, '#fff6c0'); } g.globalAlpha = 1; },
    rovecam: function (g, x, y, t) { // tall-necked wheeled camera
      px(g, x + 4, y + 13, 8, 2, '#222'); px(g, x + 4, y + 14, 2, 2, '#555'); px(g, x + 10, y + 14, 2, 2, '#555');
      px(g, x + 7, y + 2, 2, 11, '#444'); px(g, x + 3 + Math.round(Math.sin(t) * 1), y - 2, 9, 5, '#2a2a30'); px(g, x + 3, y - 1, 2, 2, '#8ac'); px(g, x + 10, y - 2, 1, 1, Math.floor(t * 3) % 2 ? '#f33' : '#600');
    },
    leaderphoto: function (g, x, y) { px(g, x + 2, y + 1, 12, 12, '#c9a24a'); px(g, x + 3, y + 2, 10, 10, '#3a3a4a'); px(g, x + 6, y + 4, 4, 4, '#d8a888'); px(g, x + 5, y + 8, 6, 4, '#222'); },
    glass: function (g, x, y, t) { for (var i = 0; i < 5; i++) px(g, x + 2 + i * 3, y + 9 + (i % 2) * 3, 2, 1, Math.sin(t * 4 + i) > 0 ? '#e8f8ff' : '#9ab'); px(g, x + 5, y + 12, 4, 2, '#ddd'); },
    oddsboard: function (g, x, y, t) { px(g, x, y + 1, 32, 14, '#0a0a12'); px(g, x + 1, y + 2, 30, 12, '#141428'); var s = Math.floor(t * 2) % 6; for (var i = 0; i < 4; i++) px(g, x + 3, y + 4 + i * 3, 4 + ((i + s) * 5) % 22, 1, i === 1 ? '#e8323c' : '#4aff8a'); },
    redbutton: function (g, x, y, t) { px(g, x + 5, y + 8, 6, 5, '#ddd'); px(g, x + 6, y + 9, 4, 3, Math.sin(t * 3) > 0 ? '#ff3a3a' : '#c81a1a'); },
    stool: function (g, x, y) { px(g, x + 3, y + 8, 10, 3, '#8a5a2a'); px(g, x + 4, y + 11, 2, 4, '#6a3a1a'); px(g, x + 10, y + 11, 2, 4, '#6a3a1a'); },
    lightswitch: function (g, x, y) { px(g, x + 6, y + 5, 4, 6, '#ddd'); px(g, x + 7, y + 6, 2, 2, '#888'); },
    bluesign: function (g, x, y, t) { g.globalAlpha = 0.8 + 0.2 * Math.sin(t * 8); px(g, x - 6, y + 3, 28, 8, '#2ac8ff'); g.globalAlpha = 1; px(g, x - 4, y + 5, 24, 1, '#0a2a4a'); px(g, x - 4, y + 8, 18, 1, '#0a2a4a'); },
    falsville: function (g, x, y, t) { px(g, x + 4, y + 6, 8, 8, '#e8a020'); px(g, x + 5, y + 8, 2, 2, '#c83a3a'); px(g, x + 9, y + 8, 2, 2, '#3a8ac8'); if (Math.sin(t * 4) > 0.6) px(g, x + 12, y + 4, 1, 1, '#fff'); },
    stairs: function (g, x, y) { for (var i = 0; i < 4; i++) px(g, x, y + i * 4, 16, 3, i % 2 ? '#5a3a24' : '#6a4a2e'); }
  };

  /* ---------------------------------------------------------------------
   * The 2060 memory flat (own room: not a recurring location)
   * ------------------------------------------------------------------- */
  var memflat = {
    name: 'Home, 2060',
    tiles: [
      '######W######BBBBBBBB',
      '#k..b.....k#B,,,,,,,B',
      '#...b......#B,,,,h,,B',
      '#..........#B,,,,,,,B',
      '#,,,,,,,,,,ssss,,,,,B',
      '#,,,,,,,,,,#B,,,,,,,B',
      '############B,,,,,,,B',
      '            BBBBDBBBB'
    ],
    legend: { 'b': 'ch03:kidbed', 's': 'ch03:stair' },
    ambient: 'hum',
    tint: '#b07040', tintAlpha: 0.18,
    vignette: 0.7,
    dark: 0.35, lights: [{ at: [5, 1], r: 50 }, { at: [16, 3], r: 46, flicker: true }],
    npcs: [
      { id: 'mom', spec: 'mom', at: [5, 2], facing: 'left', turn: false }
    ],
    objects: [
      { id: 'mem_book', at: [6, 1], prop: 'falsville', solid: false, examine: [{ think: 'Falsville. Three children and a tiger. She does all the voices.' }] },
      { id: 'mem_window', at: [6, 0], examine: [{ think: 'Dark outside. The streetlight hums like it always does.' }] },
      { id: 'mem_frontdoor', at: [16, 6], examine: '' }
    ],
    zones: [
      { id: 'mem_stairs', at: [11, 4], w: 2, h: 1, if: 'ch03_memWait', run: [{ set: { ch03_memLook: true } }] }
    ],
    exits: []
  };

  /* ---------------------------------------------------------------------
   * ROOM CONTENT (ch03 entities on top of the shared rooms)
   * ------------------------------------------------------------------- */
  var P = POS;
  var maps = {};

  maps[H.grounds] = house('grounds', {
    ambient: 'drone',
    npcs: [
      { id: 'ginerva', at: P.grounds.ginerva, facing: 'down', visible: false, if: '!ch03_inside' },
      { id: 'ch03_enforcer', spec: 'enforcer', at: P.grounds.enforcer, facing: 'up', if: '!ch03_enforcerGone' }
    ],
    zones: [
      { id: 'knockzone', at: P.grounds.knock, w: 3, h: 1 }
    ],
    objects: [
      { id: 'ch03_van', at: P.grounds.van, prop: 'van', solid: false, layer: -1, examine: [{ think: 'The van that brought me. Leaving it felt like a single thread unravelling.' }] }
    ]
  });

  maps[H.foyer] = house('foyer', {
    npcs: [
      { id: 'ginerva_f', spec: 'ginerva', at: P.foyer.ginerva, facing: 'up', if: '!ch03_tourHall' },
      { id: 'ginerva_fs', spec: 'ginerva', at: P.foyer.stair, facing: 'down', if: 'ch03_tourHallDone && !ch03_tourDone' }
    ],
    zones: [
      { id: 'stairzone', at: [P.foyer.stair[0] - 2, P.foyer.stair[1] - 1], w: 3, h: 3, if: 'ch03_tourHallDone && !ch03_tourDone' }
    ]
  });

  var hallFull = function (x, id, cond) { return { id: id, at: [x - 1, 1], w: 3, h: 4, if: cond }; };
  maps[H.hall] = house('hall', {
    npcs: [
      { id: 'ginerva_h', spec: 'ginerva', at: P.hall.tour[0], facing: 'right', if: 'ch03_tourHall && !ch03_tourHallDone' },
      { id: 'elephant', spec: 'tb_elephant', at: [10, 2], facing: 'right', turn: false, visible: false, if: 'ch03_leftBall && !ch03_elephantDone' }
    ],
    objects: [
      { id: 'ch03_keyhole', at: P.hall.keyhole, prop: 'sparkle', solid: false, if: 'ch03_lateForBall && !ch03_atBall' }
    ],
    zones: [
      hallFull(P.hall.tour[0][0], 'tour1', 'ch03_tourHall && !ch03_tourHallDone'),
      hallFull(P.hall.tour[1][0], 'tour2', 'ch03_tourHall && !ch03_tourHallDone'),
      hallFull(P.hall.tour[2][0], 'tour3', 'ch03_tourHall && !ch03_tourHallDone'),
      hallFull(P.hall.tour[3][0], 'tour4', 'ch03_tourHall && !ch03_tourHallDone'),
      { id: 'elezone', at: [13, 1], w: 2, h: 4, if: 'ch03_leftBall && !ch03_elephantDone' }
    ],
    remove: ['to_gym'],
    exits: G.shared && G.shared.has(H.hall) ? [G.shared.exit(H.hall, 'to_gym', { to: H.ball, toAt: P.ball.arrive })] : []
  });

  maps[H.bedhall] = house('bedhall', {
    ambient: 'drone',
    npcs: [{ id: 'ginerva_b', spec: 'ginerva', at: P.bedhall.tourStop, facing: 'down', if: 'ch03_tourDone && !ch03_watchOn' }],
    objects: [
      { id: 'ch03_door7', at: P.bedhall.isaiahDoor, prop: 'sparkle', solid: false, if: 'ch03_memoryDone && !ch03_door7Done' },
      { id: 'ch03_moan', at: P.bedhall.moanDoor, examine: [{ think: 'Muffled moans from under the door. Somebody already found out what this place is.' }] }
    ],
    zones: [
      { id: 'door7zone', at: [P.bedhall.isaiahDoor[0] - 1, 1], w: 3, h: 3, if: 'ch03_memoryDone && !ch03_door7Done' },
      { id: 'bedTourZone', at: [P.bedhall.tourStop[0] - 1, 1], w: 3, h: 3, if: 'ch03_tourDone && !ch03_watchOn' }
    ]
  });

  maps[H.room] = house('room', {
    npcs: [{ id: 'jemessa', at: P.room.jemessa, facing: 'up', if: 'ch03_jemessaIn && !ch03_jemessaGone' }],
    objects: [
      { id: 'ch03_nightgown', at: P.room.nightgown, prop: 'up_nightgown', solid: false, if: 'ch03_door7Done' }
    ]
  });

  var BALL_GUESTS = [
    { id: 'inever', at: P.ball.inever, facing: 'left' },
    { id: 'fan1', spec: 'fan', at: P.ball.fan1, facing: 'up' },
    { id: 'fan2', spec: 'fan', at: P.ball.fan2, facing: 'up' },
    { id: 'fan3', spec: 'fan', at: P.ball.fan3, facing: 'right' },
    { id: 'kid_hat', at: P.ball.kid, wander: true, radius: 2 },
    { id: 'bettor1', spec: 'bettor', at: P.ball.bettor1, facing: 'right' },
    { id: 'bettor2', spec: 'bettor_b', at: P.ball.bettor2, facing: 'left' },
    { id: 'peacock', at: P.ball.blue, wander: true, radius: 2 }
  ];
  maps[H.ball] = house('ball', {
    npcs: [
      { id: 'delphin', spec: 'delphin_ball', at: P.ball.delphin, facing: 'left' },
      { id: 'trader', spec: 'trader_ball', at: P.ball.trader, facing: 'down' },
      { id: 'john', spec: 'john_ball', at: P.ball.john, facing: 'up' },
      { id: 'carol', spec: 'carol_ball', at: P.ball.carol, facing: 'down', if: '!ch03_waiterDone || ch03_bathDone' },
      { id: 'kessie', spec: 'kessie_ball', at: P.ball.kessieFrom, facing: 'up', if: '!ch03_kessieGone' },
      { id: 'waiter', at: P.ball.waiterDrop, facing: 'down', if: '!ch03_waiterGone' },
      { id: 'selfie', at: P.ball.selfie, facing: 'left', if: '!ch03_panicDone' }
    ].concat(BALL_GUESTS),
    objects: [
      { id: 'ch03_glass', at: [P.ball.waiterDrop[0], P.ball.waiterDrop[1] + 1], prop: 'glass', solid: false, if: 'ch03_glassDropped && !ch03_waiterDone' },
      { id: 'ch03_odds', at: P.ball.odds, prop: 'oddsboard', if: 'ch03_bathDone', examine: '' }
    ],
    remove: ['to_red_hall'],
    exits: [{ id: 'to_red_hall', at: [0, 9], h: 2, to: H.hall, toAt: P.hall.fromBall, facing: 'left' }]
  });

  maps[H.bath] = house('bath', {
    ambient: null,
    npcs: [
      { id: 'annette', spec: 'annette_ball', at: P.bath.annetteOut, facing: 'up', visible: false, if: '!ch03_annetteGone' },
      { id: 'carol_b', spec: 'carol_ball', at: P.bath.carolStall, facing: 'up', visible: false, if: '!ch03_bathDone' }
    ]
  });

  maps[H.library] = house('library', {
    ambient: null,
    dark: 0.9, playerLight: 26,
    npcs: [{ id: 'isaiah', at: P.library.isaiahChair, facing: 'left', visible: false }],
    objects: [
      { id: 'ch03_switch', at: P.library.switch, prop: 'lightswitch', solid: false, layer: 1, examine: '' },
      { id: 'ch03_shelfA', at: P.library.shelfA, examine: '' },
      { id: 'ch03_shelfB', at: P.library.shelfB, examine: '' },
      { id: 'ch03_armchair', at: P.library.chair, examine: '', if: 'ch03_foundBook && !ch03_sat' }
    ]
  });

  maps[MEM] = memflat;
  gateExits(maps);

  /* ---------------------------------------------------------------------
   * PANIC minigame: cross the ballroom to the door before the panic fills.
   * Faces = gaze cones. Standing in one fills the meter fast. Hold SHIFT to
   * breathe (slow walk, meter drains). Flashes from phones spike it.
   * ------------------------------------------------------------------- */
  var panicGame = {
    autoSolve: function () { return { success: true, panic: 60, time: 0 }; },
    start: function (ctx) {
      var p = ctx.params, T = G.TILE || 16, R = ctx.R;
      var room = G.Map.build({ id: 'ch03_panic', tiles: p.map, legend: { '*': { tile: G.registry.tiles.gx_ballfloor ? 'gx_ballfloor' : 'floor', marker: 'goal' }, 'm': G.registry.tiles.gx_ballfloor ? 'gx_ballfloor' : 'floor', 'X': 'table' }, ns: 'ch03' });
      var start = room.spawn, goal = (room.markers.goal || [{ x: room.w - 2, y: 1 }])[0];
      function solid(tx, ty) { return G.Map.solidAt(room, tx, ty); }
      var pl = { x: start.x * T + 8, y: start.y * T + 12, dir: 'right', frame: 0, at: 0 };
      var faces = (p.guests || []).map(function (gd, i) {
        return { x: gd[0] * T + 8, y: gd[1] * T + 12, base: (gd[2] || 0) * Math.PI / 180, sweep: 1.2, speed: 0.5 + (i % 3) * 0.25, ph: i * 1.3, range: 40, fov: 50 * Math.PI / 180, spec: G.Sprites.randomSpec(100 + i), ang: 0 };
      });
      var panic = p.startPanic || 25, state = 'play', stT = 0, flashT = 0, nextFlash = 2.2, cam = { x: 0, y: 0 }, whisper = '', wT = 0;
      var WH = ['is she recording me?', 'why does he keep looking', 'less than ten percent', 'is that the murderer?', 'smile!', 'aren\'t you just the cutest'];
      function free(x, y) { return [[x - 4, y - 4], [x + 3, y - 4], [x - 4, y], [x + 3, y]].every(function (q) { return !solid(Math.floor(q[0] / T), Math.floor(q[1] / T)); }); }
      function seen(s) {
        var dx = pl.x - s.x, dy = pl.y - s.y, d = Math.hypot(dx, dy);
        if (d > s.range) return false;
        var a = Math.atan2(dy, dx), diff = Math.atan2(Math.sin(a - s.ang), Math.cos(a - s.ang));
        return Math.abs(diff) <= s.fov / 2;
      }
      return new Promise(function (resolve) {
        ctx.loop(function (dt) {
          var I = ctx.input;
          if (state !== 'play') { if (ctx.t - stT > 1.6) resolve({ success: state === 'win', panic: Math.round(panic), time: Math.round(ctx.t) }); return; }
          var breathing = I.keysHeld.ShiftLeft || I.keysHeld.ShiftRight;
          var d = I.dir(), sp = 46 * dt * (breathing ? 0.4 : 1);
          if (d.x || d.y) {
            var l = Math.hypot(d.x, d.y);
            if (free(pl.x + d.x / l * sp, pl.y)) pl.x += d.x / l * sp;
            if (free(pl.x, pl.y + d.y / l * sp)) pl.y += d.y / l * sp;
            pl.dir = Math.abs(d.x) > Math.abs(d.y) ? (d.x > 0 ? 'right' : 'left') : (d.y > 0 ? 'down' : 'up');
            pl.at += dt; pl.frame = [1, 0, 2, 0][Math.floor(pl.at / 0.14) % 4];
          } else pl.frame = 0;
          faces.forEach(function (f) { f.ang = f.base + Math.sin(ctx.t * f.speed + f.ph) * f.sweep; });
          var stared = faces.filter(seen).length;
          panic += dt * (3.5 + stared * 22) - (breathing ? dt * 14 : 0);
          if (stared && wT <= 0) { whisper = WH[Math.floor(Math.random() * WH.length)]; wT = 1.4; }
          wT -= dt;
          nextFlash -= dt;
          if (nextFlash <= 0) { nextFlash = 2.5 + Math.random() * 2.5; flashT = 0.25; panic += 6; ctx.sound('camera'); }
          flashT = Math.max(0, flashT - dt);
          panic = Math.max(0, panic);
          var pt = { x: Math.floor(pl.x / T), y: Math.floor((pl.y - 2) / T) };
          if (Math.abs(pt.x - goal.x) + Math.abs(pt.y - goal.y) === 0) { state = 'win'; stT = ctx.t; ctx.sound('door'); }
          else if (panic >= 100) { panic = 100; state = 'fail'; stT = ctx.t; ctx.sound('heartbeat'); }
          var rw = room.w * T, rh = room.h * T;
          cam.x = rw <= G.W ? (rw - G.W) / 2 : U(pl.x - G.W / 2, 0, rw - G.W);
          cam.y = rh <= G.H - 24 ? (rh - G.H) / 2 - 6 : U(pl.y - G.H / 2, -24, rh - G.H);
          function U(v, a, b) { return Math.max(a, Math.min(b, v)); }
        }, function (t) {
          var g = ctx.px, cx = Math.round(cam.x), cy = Math.round(cam.y);
          g.setTransform(1, 0, 0, 1, 0, 0);
          g.fillStyle = '#050507'; g.fillRect(0, 0, G.W, G.H);
          var wob = panic > 60 ? Math.sin(t * 9) * (panic - 60) / 20 : 0;
          G.Map.draw(g, room, cx + Math.round(wob), cy, t);
          g.fillStyle = 'rgba(182,242,74,' + (0.35 + 0.25 * Math.sin(t * 5)) + ')';
          g.fillRect(goal.x * T - cx + 2, goal.y * T - cy + 2, T - 4, T - 4);
          faces.forEach(function (s) {
            g.fillStyle = 'rgba(255,240,200,0.13)'; g.beginPath(); g.moveTo(s.x - cx, s.y - 6 - cy);
            for (var i = 0; i <= 10; i++) { var a = s.ang - s.fov / 2 + s.fov * i / 10; g.lineTo(s.x + Math.cos(a) * s.range - cx, s.y - 6 + Math.sin(a) * s.range - cy); }
            g.closePath(); g.fill();
          });
          var actors = faces.map(function (f) { var c = Math.cos(f.ang), s2 = Math.sin(f.ang); return { x: f.x, y: f.y, spec: f.spec, dir: Math.abs(c) > Math.abs(s2) ? (c > 0 ? 'right' : 'left') : (s2 > 0 ? 'down' : 'up'), frame: 0 }; });
          actors.push({ x: pl.x, y: pl.y, spec: p.playerSpec || 'luna', dir: pl.dir, frame: pl.frame });
          actors.sort(function (a, b) { return a.y - b.y; }).forEach(function (a) {
            g.drawImage(G.Sprites.get(a.spec, a.dir, a.frame), Math.round(a.x) - cx - 8, Math.round(a.y) - cy - G.Sprites.H + 1);
          });
          // tunnel vision
          var rad = Math.max(30, 220 - panic * 1.9);
          var gr = g.createRadialGradient(pl.x - cx, pl.y - 8 - cy, rad * 0.4, pl.x - cx, pl.y - 8 - cy, rad);
          gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,0.92)');
          g.fillStyle = gr; g.fillRect(0, 0, G.W, G.H);
          if (flashT > 0) { g.fillStyle = 'rgba(255,255,255,' + (flashT * 3) + ')'; g.fillRect(0, 0, G.W, G.H); }
          ctx.blitPx();
          ctx.header(p.title || 'BREATHE', 'hold SHIFT to breathe');
          R.rect(G.W / 2 - 80, 28, 160, 7, '#000', 0.7);
          R.rect(G.W / 2 - 79, 29, Math.round(158 * panic / 100), 5, panic > 75 ? '#e8323c' : panic > 45 ? '#e8a020' : '#6ac8a8');
          R.text('PANIC', G.W / 2 - 84, 28, { size: 7, align: 'right', color: '#ccc' });
          if (wT > 0 && whisper) R.text(whisper, G.W / 2, 44, { size: 8, font: 'serif', style: 'italic', align: 'center', color: '#e8d8d8', alpha: Math.min(1, wT) });
          if (state === 'win') R.text('A DOOR', G.W / 2, G.H / 2 - 10, { size: 20, font: 'title', style: '', align: 'center', color: '#b6f24a' });
          if (state === 'fail') { R.rect(0, 0, G.W, G.H, '#000', Math.min(1, (ctx.t - stT) * 1.5)); }
          ctx.footer('Find the door. Stay out of their eyes.');
        });
      });
    }
  };

  /* ---------------------------------------------------------------------
   * Helpers
   * ------------------------------------------------------------------- */
  function aud(api, d) { // audience meter: api.approval* reads/writes m_audience
    api.approvalAdd(d, { show: G.UI.hud.approval.show });
  }
  function meter(api, k, d, def) { var v = api.get(k, def) + d; api.set(k, Math.max(0, Math.min(100, v))); return v; }

  /* Booklet: the codex of bios, drawn with portraits. */
  var BIOS = [
    { id: 'isaiah', name: 'Isaiah Blueford', age: 18, crime: 'Sodomy', bio: 'A mathematically-minded high school graduate who excels at patterns and puzzles. Grew up in San Francisco, where he became the youngest winner of the National Competition for the Future of Robotics.' },
    { id: 'annette', name: 'Annette Dunphy', age: 76, crime: 'Murder', bio: 'Has spent her life working in a series of service positions. Known for her skills in cooking and homemaking. Little is known about her previous living situations.' },
    { id: 'carol', name: 'Carol Daughtery', age: 28, crime: 'Armed robbery (3 counts)', bio: 'A former model with a taste for the finer things. Her victims were jewellers. She has expressed a wish to be "a star".' },
    { id: 'kessie', name: 'Kessie Burgington', age: 54, crime: 'Bank robbery', bio: 'A homemaker with a passion for cleaning and cooking. Her smile has been described as "like melting cheese".' },
    { id: 'john', name: 'John Mcdohue', age: 43, crime: 'Murder (second degree)', bio: 'Former street vendor. Volunteered for the show. Likes birds.' },
    { id: 'delphin', name: 'Delphin Neutrino', age: 34, crime: 'Arson, manslaughter', bio: 'Raised at the Columbus House. A self-described artist and musician whose fires took four lives at a company Christmas party.' },
    { id: 'luna', name: 'Luna Bartley', age: 32, crime: 'Murder', bio: 'Grew up in a group home called the Columbus House, where she received the standard Edu-TV education. Has an eleven-year-old daughter (currently residing in an unnamed group home) that she has stated is her reason for fighting.' }
  ];
  function bioSlide(b) {
    return {
      style: 'black', text: '', title: '',
      draw: function (t, s, a) {
        var R = G.Render;
        R.rect(30, 18, G.W - 60, G.H - 36, '#f2eee4', a);
        R.rect(30, 18, G.W - 60, 14, '#e8323c', a);
        R.text('RIGHT TO LIFE • CONTESTANT FILE', G.W / 2, 21, { size: 7, align: 'center', color: '#fff', alpha: a, shadow: false });
        R.rect(42, 42, 76, 76, '#c8c4b8', a);
        R.img(G.Sprites.portrait(b.id, b.id === 'luna' ? 'tired' : 'neutral'), 44, 44, 2);
        R.text('Name: ' + b.name, 128, 44, { size: 9, font: 'serif', color: '#1a1a1a', alpha: a, shadow: false });
        R.text('Age: ' + b.age, 128, 58, { size: 8, font: 'serif', color: '#1a1a1a', alpha: a, shadow: false });
        R.text('Crime: ' + b.crime, 128, 70, { size: 8, font: 'serif', color: '#8a1a1a', alpha: a, shadow: false });
        R.wrap(b.bio, 200, 7, 'serif').forEach(function (l, i) { R.text(l, 128, 86 + i * 11, { size: 7, font: 'serif', color: '#333', alpha: a, shadow: false }); });
        R.text('Odds of survival: pending', 44, 124, { size: 6, color: '#777', alpha: a, shadow: false });
      }
    };
  }
  function mirrorSlide(kind) {
    var cap = { forest: 'THE FOREST', throne: 'THE THRONE ROOM', fairy: 'THE FAIRY', plain: 'THE BATHROOM' }[kind];
    return {
      style: 'black', text: '', ms: 0,
      draw: function (t, s, a) {
        var R = G.Render, g = R.ctx;
        var bg = { forest: ['#0e2a14', '#2a5a2a'], throne: ['#2a1a10', '#5a3a1a'], fairy: ['#3a2a5a', '#e8a8d8'], plain: ['#d8dce0', '#f0f2f4'] }[kind];
        var gr = g.createLinearGradient(0, 0, 0, G.H); gr.addColorStop(0, bg[0]); gr.addColorStop(1, bg[1]);
        g.globalAlpha = a; g.fillStyle = gr; g.fillRect(20, 14, G.W - 40, G.H - 40); g.globalAlpha = 1;
        var i;
        if (kind === 'forest') { for (i = 0; i < 9; i++) R.rect(30 + i * 38, 14, 8, 150, '#1a3a1a', a); for (i = 0; i < 6; i++) R.rect(40 + i * 60 + Math.sin(t + i) * 4, 30 + i * 9, 3, 40, '#fff6c0', 0.12 * a); R.rect(250 + Math.sin(t * 2) * 40, 146, 6, 5, '#d8c8b8', a); }
        if (kind === 'throne') { R.rect(150, 60, 84, 90, '#7a1a1a', a); R.rect(160, 70, 64, 70, '#c9a24a', a); for (i = 0; i < 9; i++) R.rect(120 + i * 16, 156, 10, 6, '#e8c15a', a); }
        if (kind === 'fairy') { for (i = 0; i < 7; i++) R.rect(40 + i * 46, 30 + (i % 2) * 6, 40, 4, ['#e83a3a', '#e8a020', '#e8e03a', '#3ac83a', '#3a8ae8', '#6a3ae8', '#c83ae8'][i], 0.6 * a); for (i = 0; i < 20; i++) R.rect((i * 53 + t * 20) % (G.W - 50) + 25, 40 + (i * 31) % 120, 1, 1, '#fff', a); }
        var sp = kind === 'throne' ? { extends: 'luna', outfit: '#8a1a3a', outfit2: '#8a1a3a', style: 'dress' } : kind === 'fairy' ? { extends: 'luna', outfit: '#e8a8d8', outfit2: '#e8a8d8', style: 'dress' } : G.World.player.spec;
        if (kind === 'fairy') { R.rect(G.W / 2 - 40, 70 + Math.sin(t * 8) * 3, 24, 30, '#ffffff', 0.35 * a); R.rect(G.W / 2 + 16, 70 + Math.sin(t * 8) * 3, 24, 30, '#ffffff', 0.35 * a); }
        R.img(G.Sprites.portrait(sp, 'neutral'), G.W / 2 - 36, 54 + (kind === 'fairy' ? Math.sin(t * 2) * 4 : 0), 2);
        R.rect(20, G.H - 26, G.W - 40, 12, '#000', 0.6 * a);
        R.text(cap, G.W / 2, G.H - 24, { size: 7, align: 'center', color: '#fff', alpha: a });
      }
    };
  }

  /* ---------------------------------------------------------------------
   * CHAPTER
   * ------------------------------------------------------------------- */
  G.registerChapter({
    id: 'ch03',
    title: 'Right to Life',
    kicker: 'DAY 1 • SUNDAY 7 JANUARY 2084',
    maps: maps,
    cast: cast,
    props: props,
    tiles: {
      kidbed: { base: 'floor', solid: false, draw: function (g, x, y) { px(g, x + 1, y + 1, 14, 14, '#7a4a3a'); px(g, x + 2, y + 2, 12, 12, '#e8d8e8'); px(g, x + 3, y + 2, 10, 3, '#f8f0f8'); } },
      stair: { base: 'floor', draw: function (g, x, y) { for (var i = 0; i < 4; i++) px(g, x + i * 4, y, 3, 16, i % 2 ? '#5a3a24' : '#7a5a3e'); } }
    },
    minigames: { panic: panicGame },
    testDefaults: { m_audience: 40, m_delphin: 15, m_kessie: 25, m_annette: 40, m_isaiah: 30 },

    start: async function (api) {
      var F = api.flags;
      ['m_audience', 'm_delphin', 'm_kessie', 'm_annette', 'm_isaiah'].forEach(function (k) {
        if (F[k] == null) F[k] = { m_audience: 40, m_delphin: 15, m_kessie: 25, m_annette: 40, m_isaiah: 30 }[k];
      });
      api.setPlayer('luna');

      /* ============ 1. THE GATE ============ */
      await api.slides([{ style: 'montage', title: 'Sunday, 7 January 2084', text: 'The hills outside Sacramento. Almond trees blooming pink in January, because someone paid for them to.' }]);
      await api.goRoom(H.grounds, { at: P.grounds.arrive, facing: 'up' });
      await api.think('My arm still aches where they injected the chip. "A precaution and punishment in equal measures."');
      await api.think('When do the cameras start rolling on these shows? The second I left my cell? Am I already being watched?');
      await api.think('A door like a gaping maw, jewels scattered around the knob like crooked teeth. A keypad beside it. The DPE penguin grins from the gate.');
      api.onInteract('ch03_keypad', [{ think: 'A keypad. Four digits. The little light blinks green at me like it knows something.' }]);
      api.objective('Knock on the jewel door');
      await api.waitForZone('knockzone');
      api.objective(null);
      api.lockPlayer();
      api.sound('door');
      await api.narrate('No use delaying the inevitable. You knock, and step back, nearly colliding with the enforcer behind you. He exhales sharply.');
      api.show('ginerva');
      api.face('player', 'up');
      await api.narrate('The door swings open. A stern woman, frown lines stretched taut, hair wound into a painful-looking bun. A slim wooden ruler in one hand.');
      api.lowerThird('GINERVA MALCONT', 'House Manager', 3500);
      await api.say('ginerva', 'I shall receive the prisoner from here. You may go now.');
      await api.narrate('The enforcer salutes and returns to the van without a word.');
      await api.choice(['(Watch him go.)', '(Look at the van. The road. Anywhere but her.)']);
      await api.think('Seeing him leave feels like a single thread unravelling. The prison guards were cruel, but I knew their methods. Now I\'m staring down the barrel of an entirely new set of rules.');
      await api.narrate('She clears her throat, a sound as scratchy as her face. You keep your eyes on the van.');
      api.sound('hit'); api.flash('#ffffff', 120); await api.shake(300, 4);
      await api.narrate('A sharp crack splits the air. Pain bursts across your arm.');
      await api.think('It isn\'t the pain that turns my stomach. It\'s the ease of the strike. Mask up. No weakness to exploit.');
      await api.say('ginerva', 'I expect your full attention to be on me at all times when I am addressing your person. Do you understand?');
      await api.think('Swallow the first three retorts. Think of Waverly. It\'s all for Waverly.');
      var und = await api.choice([
        { text: '"I understand." (Mutter it.)' },
        { text: '(Say nothing.)' }
      ]);
      if (und === 1) {
        await api.say('ginerva', 'I am afraid I did not quite catch that.');
        await api.narrate('The ruler swings between you, not making contact, never letting you forget it.');
        await api.say('luna', 'I understand.');
      }
      await api.say('ginerva', 'Good. Obey the rules and we will get along splendidly. Cause trouble and —');
      api.sound('hit'); await api.shake(250, 3);
      await api.narrate('The ruler slams against the door frame, inches from your nose. If you had flinched, you would have taken it in the face. Your expression stays clear. Your hands tremble.');
      await api.say('ginerva', 'I believe we have an understanding. Let me make one thing clear. Any attempt to escape will lead to your death. The tracking chip implanted in you while you were still in prison will see to that.');
      await api.say('ginerva', 'What are you waiting for, girl? Hurry up, then.');
      api.lowerThird(null);
      api.hide('ginerva');
      api.unlockPlayer();
      api.objective('Follow her inside');
      await api.waitForRoom(H.foyer);

      /* ============ 2. THE FOYER ============ */
      api.set('ch03_inside', true);
      api.objective(null);
      await api.think('Two straight-backed leather couches facing each other. A bookshelf to the ceiling. A portrait of the Great Leader reading to children. And a camera, watching me look at it.');
      await api.say('ginerva', 'You will call me Miss Ginerva or Miss Malcont. I shall be responsible for the care of you and the rest of the inmates for the duration of the show.');
      await api.think('Lovely. I have a feeling she and I have very different ideas about the word "care".');
      await api.say('ginerva', 'Follow me. Do not touch anything. Do not dawdle.');
      api.set('ch03_tourHall', true);
      api.objective('Follow Ginerva');
      await api.waitForRoom(H.hall);
      await api.run([{ think: 'The carpet is a distinct shade of red. One might even call it blood-like, if one were not afraid of being struck by a ruler-wielding maniac.' }]);

      /* ============ 3. THE TOUR (follow her from stop to stop) ============ */
      var TOUR = [
        [['ginerva', 'This is the lounge area. Participants are free to congregate here during daytime hours, provided there are no scheduled activities occurring at the time.'],
          { think: 'Fluffy pillows. Oval lampshades. A rich wooden table. Criminals, living like this.' }],
        [['ginerva', 'The kitchen. You will be responsible for preparing your own meals. The only exception is when dining as a group is required for the show\'s purposes.'],
          { think: 'Through the door: a fridge overflowing with fruit, cheese and REAL meat. Waverly is starving in a state group home, and they can afford to stuff a fridge with steak.' },
          { choice: [
            { text: '"So I can take food from here any time I want?"', then: [['ginerva', 'You may take food at any point during the daylight hours. Participants are confined to quarters after lights out.'], { think: 'Already I am thinking about how to smuggle food out to Waverly. All men can be bought for the right price.' }] },
            { text: '(Say nothing. Swallow.)', then: [{ think: 'My stomach screams in protest, then quietens. Like always.' }] }
          ] }],
        [['ginerva', 'The washroom. You will find it adequately equipped.'],
          { think: 'A toilet with more buttons than I could press in a day, and a wall of mirror. Of course there is a wall of mirror.' }],
        [['ginerva', 'The gymnasium. It is closed until this evening.'],
          { think: 'The double door is propped open a crack. Men drag equipment around inside. One looks up, meets my eyes, then quickly looks away.' },
          ['ginerva', 'You will have open access to all unlocked spaces. The rest of the building is off limits unless you have been invited by Mr. Johnson or myself.'],
          ['ginerva', 'You are expected to clean any messes you create. Failure to comply will lead to escalating sanctions.'],
          { think: 'A broom and a dustpan lean against the wall. Clean your own mess. Noted.' }]
      ];
      for (var i = 0; i < TOUR.length; i++) {
        api.lockPlayer();
        await api.move('ginerva_h', P.hall.tour[i], { speed: 60 });
        api.face('ginerva_h', 'player');
        api.unlockPlayer();
        api.objective('Follow Ginerva');
        await api.waitForZone('tour' + (i + 1));
        api.face('ginerva_h', 'player');
        await api.run(TOUR[i]);
      }
      await api.say('ginerva', 'Upstairs. Hurry up, then.');
      api.hide('ginerva_h');
      api.set('ch03_tourHallDone', true);
      api.objective('Back to the foyer stairs');
      await api.waitForZone('stairzone');
      await api.think('A winding staircase, the kind that makes you feel you\'ll spend the rest of your life climbing in circles.');
      api.set('ch03_tourDone', true);
      api.hide('ginerva_fs');
      api.objective('Go upstairs');
      await api.waitForRoom(H.bedhall);

      /* ============ 4. THE WATCH ============ */
      api.objective('Follow Ginerva');
      await api.waitForZone('bedTourZone');
      api.face('ginerva_b', 'player');
      await api.say('ginerva', 'This floor contains only private bedrooms. You are not to enter anyone else\'s bedroom without their permission.');
      await api.choice([
        { text: '"When do I get to meet the other contestants?" (smile)', set: { ch03_smiledGinerva: true } },
        { text: '"Which one is mine?"' }
      ]);
      await api.say('ginerva', 'Arm.');
      await api.say('luna', 'I beg your pardon?');
      await api.say('ginerva', 'Hold out your arm. Do not make me repeat myself.');
      var arm = await api.choice(['(Hold out your arm.)', '(Consider offering her a finger instead.)']);
      if (arm === 1) {
        await api.think('The ruler waves menacingly in front of my face. I think twice.');
      }
      api.sound('confirm');
      await api.think('She grabs my wrist and snaps a black watch onto it, tightening the strap until it leaves indents. Bitch!');
      await api.say('ginerva', 'This device will function as a personal assistant to the participating competitors. It will display your schedule, pass on messages from any member of the staff, and incentivise you when you dawdle.');
      await api.screen({ title: 'DPE WATCH v4', text: 'WELCOME, CONTESTANT #3: LUNA\n\nSCHEDULE: 18:00 INTRODUCTORY BALL (GYMNASIUM)\nRANKING: --\nTASKS: 0 PENDING\n\nHAVE A PRODUCTIVE DAY.' });
      await api.say('ginerva', 'You are expected in the gymnasium for an introductory ball at six sharp. Until then, you will find a booklet detailing the competition rules and brief biographies of each contestant. I suggest you use the time to review it.');
      api.set('ch03_watchOn', true);
      api.hide('ginerva_b');
      api.objective('Go to your room (No. 3)');
      await api.waitForRoom(H.room);
      api.set('ch03_inRoomPhase', true);
      api.sound('door');
      await api.think('The lock clicks behind her with quiet finality.');

      /* ============ 5. LUNA'S ROOM ============ */
      api.onInteract('bed', [{ think: 'A queen bed. A fluffy pink comforter. Silk sheets so cold they feel wet. It is way too soft.' }]);
      api.onInteract('window', async function (api) {
        await api.think('Sealed shut.');
        var c = await api.choice(['(Tug on it anyway.)', '(Look down at the garden.)']);
        if (c === 0) { await api.shake(300, 2); await api.think('I tug for dear life. Nothing. Not even a rattle.'); }
        else await api.think('Rows of pink almond trees. A gravel path. An iron fence. Somewhere past it, a line I can\'t see that would kill me if I crossed it.');
      });
      api.onInteract('tablet', async function (api) {
        await api.slides([{ style: 'screen', title: 'CURATED MEMORIES', text: 'NOW PLAYING: "WAVERLY, AGE 7"\n\n(a stock clip of a smiling girl on a swing)\n\nTHIS DEVICE CANNOT BE TURNED OFF.' }]);
        await api.think('That isn\'t her. That isn\'t even her hair. They don\'t know her. They only know what will make me cry on camera.');
      });
      api.onInteract('shower', async function (api) {
        if (api.has('ch03_shower')) { await api.think('Not touching that again.'); return; }
        api.set('ch03_shower', true);
        await api.narrate('A touchscreen glows beside the marble shower: "WELCOME LUNA". You press it, just once.');
        api.sound('static'); api.flash('#c8e8ff', 300);
        await api.shake(600, 2);
        await api.narrate('STEAM LEVEL TEN. The speakers erupt into rock music. Water fires sideways from three nozzles.');
        await api.think('Five frantic minutes of jabbing later, it stops. Somewhere, a producer is laughing.');
        aud(api, +1);
      });
      api.onInteract('smoke_detector', [{ think: 'The smoke detector. There\'s a tiny red light that blinks a little too often for a smoke detector.' }, { think: 'Hello, Eye. I need to figure out where all of you are. Fast. Before I lose my mind guessing.' }]);

      api.objective('Read the booklet on the desk');
      await api.waitForInteract('booklet');
      api.sound('select');
      await api.note({ title: 'Welcome, Luna!', text: 'Thank you for participating in our groundbreaking new show, Right to Life. Every week, you will complete activities consisting of four stages, each geared towards your eventual rehabilitation. The winner will receive their freedom, a large sum of money, and emerge a new person!' });
      await api.slides([
        { style: 'black', title: 'Stage 1: The Competition', text: 'Contestants participate in a challenge that will push you to your limits. The winner receives an advantage for later in the games. The loser is automatically placed in the public vote.' },
        { style: 'black', title: 'Stage 2: The Private Vote', text: 'Each competitor votes for someone they believe is not serious enough about their redemption. The competitor with the most votes faces the competition loser in the public vote.' },
        { style: 'black', title: 'Stage 3: The Public Vote', text: 'Audience members around the world use their apps to vote to SAVE one of the two competitors. The competitor with the FEWEST saves will be taken straight to the execution chamber.' },
        { style: 'black', title: 'Questions?', text: 'Please direct them to your host, Trader Johnson, or his assistant, Ginerva Malcont. Have a great day and good luck! Turn the page for the other competitors.' }
      ]);
      await api.think('Four stages, it says. It only lists three. Nobody needs the fourth written down.');
      await api.slides([bioSlide(BIOS[0])]);
      await api.think('San Francisco. Richtown. I\'d assumed everyone here would be like me. People whose poverty forced them to make tough choices. Assumptions can be dangerous.');
      await api.slides([bioSlide(BIOS[1])]);
      await api.think('Murder. Her? A poke would send her flying.');
      await api.slides([bioSlide(BIOS[2]), bioSlide(BIOS[3]), bioSlide(BIOS[4])]);
      await api.slides([bioSlide(BIOS[5])]);
      api.sound('reveal');
      await api.think('Delphin.');
      await api.think('For a moment I struggle to believe it. I thought my life couldn\'t get any more messed up. He\'s here. Finally, the chance I\'ve waited eighteen years for.');
      await api.think('Except instead of a conversation, we\'ll broadcast our reunion littered with cruelty and corpses.');
      await api.think('The way he looked at me that night is burned into my mind. Like he wanted to set me on fire so he could sweep away the ashes. I haven\'t spoken to him since.');
      await api.think('We grew up together. He taught me so much of what I know about manipulation and survival. Based on how we were as kids, I\'m not sure I can win against him.');
      await api.slides([bioSlide(BIOS[6])]);
      await api.think('Between my frizzy hair and oily skin, I look like a cross between a surly teen and an overgrown poodle. And the whole world has seen it.');
      api.set('ch03_readBooklet', true);
      api.remove('booklet');
      await api.think('If I want to stand any chance of winning this competition, then I need to be like a cloud. To convince people that I\'m light and sweet like a flower in bloom. But underneath, I\'ll be charging up a strike.');

      api.objective('Rest on the bed (or look around first)');
      await api.waitForInteract('bed');
      api.onInteract('bed', [{ think: 'Too soft. In all the worst ways.' }]);
      await api.fadeOut(800);
      await api.wait(400);
      await api.fadeIn(300);

      /* ============ 6. JEMESSA ============ */
      api.sound('door');
      api.set('ch03_jemessaIn', true);
      api.addNpc({ id: 'jemessa', at: P.room.jemessa, facing: 'up' });
      await api.emote('player', '!');
      await api.say('jemessa', 'Good morning, Lunar! I hope you\'re as excited as I am to plan out your win!', { mood: 'happy' });
      await api.think('A young woman. Mid-twenties, I want to say, but with de-aging tech there\'s no way to be sure. She practically dances toward me.');
      await api.say('jemessa', 'I\'m Jemessa! I\'m a huge fan, really. The way you looked at that picture of your daughter when Trader was trying to get you to sign? Pure gold. Mwah!', { mood: 'happy' });
      var jq = await api.choice(['"No offence, but what are you doing here?"', '"Did you just call me Lunar?"']);
      if (jq === 1) {
        await api.say('jemessa', 'You like? No offense, but Luna just doesn\'t feel like a winner\'s name, you know? Moons are pretty and all, but they don\'t actually DO much. But Lunar, that\'s a name with some sparkle to it.', { mood: 'happy' });
        await api.think('I try not to be offended. Her not realising that "lunar" also means the moon helps, somewhat.');
      }
      await api.say('jemessa', 'I work for DPE! I\'m your handler, silly. My job is to help you out on the show. Figure out how to make you more popular and stuff.');
      await api.say('luna', 'Jemessa. Focus. How are you going to make me more popular?');
      await api.say('jemessa', 'How would you feel about a love triangle? There\'s this other competitor, Delphin. His handler and I have been talking about it.', { mood: 'happy' });
      var tri = await api.choice([
        { text: '"No love triangles."', set: { f_jemessa_triangle: false } },
        { text: '"...I\'ll think about it."', set: { f_jemessa_triangle: true } }
      ]);
      if (tri === 0) {
        await api.say('jemessa', 'I can\'t help you if you\'re not willing to help yourself.', { mood: 'sad' });
        await api.say('luna', 'I have to prepare, and you\'re not helping. Out.');
        await api.say('jemessa', 'You\'re sooo mean, Lunar.', { mood: 'sad' });
      } else {
        await api.emote('jemessa', '♥');
        await api.say('jemessa', 'EEEE! Okay, okay, I won\'t tell anyone. Except his handler. And the writers.', { mood: 'happy' });
        aud(api, +5);
        await api.think('What have I done.');
      }
      await api.say('jemessa', 'Oh! And wear this. Teal is SO your colour. Also: that old lady with the cranky eyelids asked me to tell you all the contestants are gathering in the gym at six.');
      await api.screen({ title: 'DPE WATCH', text: '18:15\n\nYOU ARE LATE.\nINCENTIVE PENDING.' });
      await api.say('luna', 'Jemessa!', { mood: 'angry' });
      await api.say('jemessa', 'Don\'t yell at me! I\'m doing my best!', { mood: 'cry' });
      api.set('ch03_jemessaGone', true);
      api.remove('jemessa');
      api.setPlayer('luna_ball');
      await api.narrate('A teal gown, already your size. You change in thirty seconds flat and run.');
      api.set('ch03_lateForBall', true);

      /* ============ 7. THE KEYHOLE / DELPHIN ============ */
      api.objective('Get to the gym. Now.');
      await api.waitForRoom(H.hall);
      api.objective('The gym doors (east end of the hall)');
      await api.waitForInteract('ch03_keyhole');
      await api.think('I\'m already late. A few extra minutes won\'t change that. And I don\'t want to miss the chance to do a little snooping.');
      await api.narrate('You crouch and press your eye to the keyhole. A blob of well-dressed guests sliding around each other. You press closer...');
      api.sound('door'); await api.shake(250, 2);
      await api.goRoom(H.ball, { at: P.ball.arrive, facing: 'right' });
      api.objective(null);
      api.set('ch03_atBall', true);
      api.placeNpc('delphin', P.ball.delphin, 'left');
      api.lockPlayer();
      await api.say('delphin', 'Luna?', { mood: 'shock' });
      await api.emote('delphin', '!');
      await api.narrate('And then he begins to laugh. Like he has just been told the world\'s funniest joke, and the best part is that no one else understands the punch line.');
      await api.think('He\'s come a long way from the scowling teenager in all black. Bright blue hair. Purple eyeshadow like bruises. Toxic-green nail polish. He holds out his hand.');
      api.lowerThird('DELPHIN NEUTRINO', 'Contestant • Arson, manslaughter', 4000);
      var hand = await api.choice([
        { text: '"Delphin. It\'s been a while." (Ignore his hand.)', set: { ch03_tookHand: false } },
        { text: '(Take his hand.)', set: { ch03_tookHand: true } }
      ]);
      if (hand === 1) {
        meter(api, 'm_delphin', +10, 15);
        await api.think('My hand is in his before I can stop it. Warm. Familiar. Stupid, Luna. Stupid.');
      } else {
        await api.think('I glance at the clock, pointedly ignoring his outstretched hand.');
      }
      await api.say('delphin', 'My bad. Everything seems so funny to me today. Can\'t imagine why.', { mood: 'smug' });
      await api.say('delphin', 'Now, why would a lovely lady like you be hiding behind a door when you could be sharing your charms with the world? You wouldn\'t happen to be spying, would you?', { mood: 'smug' });
      await api.say('luna', 'Spying? No, I was just... adjusting my hair. I didn\'t want to make a bad first impression.');
      await api.say('delphin', 'Looks like you\'ve got it. Shall we?', { mood: 'happy' });
      await api.say('delphin', 'I know that look. That\'s your Not-ready-but-gonna-do-it-anyway-to-prove-myself face. I\'m quite familiar. But if you need a moment, there\'s no shame in not being the bravest person in the room.');
      await api.think('His elbow. For a second it shrinks into the same elbow he held out so many times when we were kids. Not today. Not ever.');
      api.unlockPlayer();
      await api.move('player', [P.ball.arrive[0] + 3, P.ball.arrive[1]]);

      /* ============ 8. THE BALLROOM ============ */
      api.onAir(true);
      api.approval(api.get('m_audience', 40));
      await api.narrate('Thousands of shimmering stars dangle from an impossibly high ceiling. Portraits of the Great Leader on all four walls: a speech to saluting soldiers, reading to children, distributing food to the poor, staring at nothing in particular.');
      await api.narrate('A band plays from the centre stage. The singer, a tall woman in a long blue gown, sways and sings about the power of love to conquer all.');
      await api.think('Ironic.');
      api.move('delphin', [P.ball.arrive[0] + 2, P.ball.arrive[1]]);
      await api.say('delphin', 'Fancy, ain\'t it? And it\'s all for us.', { mood: 'smug' });
      await api.say('luna', 'This isn\'t for us. We\'re their shiny new puppets and they\'ve lined up to watch us play.');
      await api.say('delphin', 'Well, at least the food\'s good.');
      // Mr. I Never
      api.lockPlayer();
      await api.move('inever', [P.ball.arrive[0] + 4, P.ball.arrive[1] + 1]);
      api.face('delphin', 'inever');
      await api.narrate('Without looking away from you, Delphin\'s arm lashes out and snatches the last mini hot dog off a passing guest\'s plate.');
      await api.say('inever', 'Well, I never! Such disrespect. Do you have any idea who I am?', { mood: 'angry' });
      await api.say('delphin', 'Not a clue. But I\'m one of the stars here, so I\'m pretty sure I outrank you, Mr. I Never.', { mood: 'smug' });
      await api.say('inever', 'You insolent—', { mood: 'angry' });
      await api.say('delphin', 'Look, if you\'ve got a problem with the way I do things, you can take it up with Mr. Johnson. He\'s responsible for our care while we\'re here. I\'m sure he\'d be happy to assist.');
      await api.say('inever', 'Enjoy your meal. One of the stars, you say? I imagine you\'ll want to savour the taste while you can.');
      await api.move('inever', P.ball.inever);
      await api.say('delphin', 'What\'s he gonna do? Execute me?', { mood: 'happy' });
      aud(api, +2);
      api.unlockPlayer();
      var dl = await api.choice([
        '"You really think it\'s a good idea to piss these people off? They\'re the ones voting for us."',
        '(Bite your tongue to keep from laughing.)'
      ]);
      if (dl === 0) await api.say('delphin', 'Oh please. Someone like that would never support me anyway. My fans will be far higher calibre. People who recognise true genius when it performs for them.', { mood: 'smug' });
      else await api.think('He always did this. Pissed me off like nothing else, then flipped my mood with one absurd action. Strangely nostalgic.');
      await api.say('delphin', 'By the way, we should try to catch up later. It\'s good to have an old friend here.');
      await api.say('luna', 'Old friend? How can you say that so easily?');
      await api.emote('delphin', '…');
      await api.say('delphin', 'Look, I only found out you were here an hour ago. Admittedly, this is marvellously awkward. Truly a tragedy for the ages. But we\'re competitors now. No point trying to talk things out when only one of us can go free.');
      await api.say('delphin', 'And do we really want to give them the pleasure of watching us hash out our personal drama on screen? I\'d rather grit my teeth and play nice with the person I know has my back despite how much she hates me than run arms open into a pack of unknown wolves.');
      var dch = await api.choice([
        { text: '"This is a lot. I need some time to think. Just give me some space, okay? We can talk later."' },
        { text: '"Later, then. I mean it."' },
        { text: '"You don\'t get to call me a friend. Not after Salina."' }
      ]);
      if (dch === 1) { meter(api, 'm_delphin', +3, 15); await api.say('delphin', 'Better hurry. Later will be here before you know it.', { mood: 'happy' }); }
      else if (dch === 2) { meter(api, 'm_delphin', -3, 15); await api.say('delphin', '...Fair.', { mood: 'sad' }); await api.think('His face closes like a door. Good. Then why does it hurt?'); }
      else await api.say('delphin', 'Better hurry. Later will be here before you know it.');
      await api.think('I can\'t stop picturing his body flat on a cold slab, eyes empty of their teasing lilt.');
      api.lowerThird(null);
      api.move('delphin', [P.ball.delphin[0] + 4, P.ball.delphin[1] + 3]);

      // FREE ROAM part 1: the fountain is required; the rest is optional
      api.onInteract('fountain', async function (api) {
        if (api.has('ch03_fountain')) { await api.think('The noose. Still bubbling. I\'m not touching it again.'); return; }
        await api.narrate('The fountain bubbles below you, warming you with chocolatey steam. You skip the bowls, pick up the ladle and drink straight from it. Smooth. Buttery. The perfect temperature.');
        await api.narrate('A knot of men in ill-fitting suits laugh and point at the fountain. You follow their gaze.');
        await api.think('An elegant loop. A mockery of my future. The fountain is shaped like a noose, and I\'ve been eagerly sticking my head in the knot.');
        await api.think('Of course it is.');
        await api.think('The chocolate sours in my mouth. A betrayal. Of myself. Of my poor, starving Waverly.');
        api.set('ch03_fountain', true);
      });
      api.onInteract('john', async function (api) {
        if (api.has('ch03_metJohn')) { await api.say('john', 'Hullo again, Luna. I like the stars.', { mood: 'happy' }); return; }
        api.set('ch03_metJohn', true);
        api.lowerThird('JOHN MCDOHUE', 'Contestant • Murder (2nd degree)', 3500);
        await api.say('john', 'Hullo. I\'m John. I\'m glad to uh-', { mood: 'happy' });
        await api.think('He looks down at his fingers like they could give him the words he\'s searching for.');
        await api.say('john', 'To, uh, meet you, Luna.', { mood: 'happy' });
        var c = await api.choice(['(Shake his hand.) "Nice to meet you too, John."', '"How do you know my name?"']);
        if (c === 0) { await api.say('john', 'You\'re nice. Not everybody is nice.', { mood: 'happy' }); aud(api, +1); }
        else await api.say('john', 'It\'s in the book. I can read. I read it three times.', { mood: 'sad' });
        await api.think('A forty-three-year-old man with the voice of a child, and perfect round burn scars up his arms. Somebody did that to him on purpose.');
      });
      api.onInteract('kid_hat', [['kid_hat', 'My dad bet a whole month\'s rations that the old lady goes first. Are you the baby murderer?'], { think: 'He can\'t be older than Waverly. His hat has a feather in it.' }, { choice: [
        { text: '"Shouldn\'t you be in bed?"', then: [['kid_hat', 'It\'s a SCHOOL NIGHT and I\'m HERE. That\'s how rich we are.']] },
        { text: '(Smile and say nothing.)', then: [{ think: 'Light and sweet. A cloud. Even for him.' }, { approvalAdd: 1 }] }
      ] }]);
      api.onInteract('bettor1', [['bettor1', 'Number three! The redhead. We were just saying, you\'ve got the face of a week-two exit.'], ['bettor2', 'Week one, if the crowd smells fear. Do you smell like fear, sweetheart?'], { think: 'They\'re betting on how long I live, out loud, to my face.' }]);
      api.onInteract('bettor2', [['bettor2', 'Don\'t mind him. I\'ve got you at fifteen to one. Make me rich, Lunar.'], { think: 'Lunar. Jemessa works fast.' }]);
      api.onInteract('peacock', [['peacock', 'Aren\'t you DARLING. Is it true you did it with a coat hanger?'], { think: 'She doesn\'t wait for an answer. She cackles and twirls away in peacock blue.' }]);
      api.onInteract('singer', [{ think: 'She sings with her eyes closed. Maybe that\'s the only way to sing in here.' }]);
      api.onInteract('trader', [['trader', 'Miss Luna! Later, darlin\'. I\'m being adored.', 'smug']]);
      api.onInteract('carol', [['carol', 'Can I help you?', 'smug'], { think: 'Carol. The jewellery thief. Potentially the dumbest reason to end up on an EEN show.' }]);
      api.onInteract('kessie', [['kessie', 'Busy night, hun.'], { think: 'She won\'t look at me.' }]);
      api.onInteract('waiter', [['waiter', 'Champagne, miss? Oh. You\'re one of... I beg your pardon.']]);
      api.onInteract('selfie', [{ think: 'Golden moon earrings. She\'s holding a camera like a weapon.' }]);
      api.onInteract('delphin', [['delphin', 'Back so soon? I knew you missed me.', 'smug']]);
      api.onInteract('inever', [['inever', 'I have nothing to say to your kind.', 'angry']]);
      BALL_GUESTS.forEach(function (g) { if (/^fan/.test(g.id)) api.onInteract(g.id, [['fan', 'Shh! He\'s talking about the COMPETITIONS.'], { think: 'They orbit Trader like moths.' }]); });

      await api.until(function (f) { return f.ch03_fountain; }, {
        objective: 'Mingle. Find something to do with your hands (the fountain).',
        targets: ['john', 'fountain']
      });

      /* ============ 9. THE WAITER, CAROL, KESSIE ============ */
      api.objective(null);
      api.sound('hit'); api.sound('miss');
      api.set('ch03_glassDropped', true);
      await api.shake(300, 2);
      await api.pan('waiter', 500);
      await api.narrate('A crash, then the sound of shattered glass. Next to the stage, a server is on his hands and knees. A circle of guests forms around him.');
      await api.say('waiter', 'I\'m so sorry for the disturbance. Please allow me just a moment to clean up, and I\'ll return with further refreshments.', { mood: 'fear' });
      await api.narrate('A tinkling laugh, like metal against silver.');
      await api.pan('carol', 400);
      api.lowerThird('CAROL DAUGHTERY', 'Contestant • Armed robbery', 3500);
      await api.say('carol', 'Looks like the help prefers to be on his knees in front of others.', { mood: 'smug' });
      await api.narrate('A pause. A single chuckle. Scattered laughter swells into applause. Carol beams. The server keeps cleaning, eyes fixed on the floor, hands shaking more with every piece.');
      await api.cameraReset(400);
      await api.think('If I ever caught Waverly talking to someone like that... I need to keep playing the quiet game. But his hands are shaking.');
      var help = await api.choice([
        { text: '(Kneel and help him gather the glass.)', set: { f_helped_waiter: true } },
        { text: '(Stay out of it. Keep your head down.)', set: { f_helped_waiter: false } }
      ], { timer: 8, timeoutPick: 1 });
      if (help === 0) {
        meter(api, 'm_kessie', +5, 25);
        api.set('ch03_carolSnub', true);
        await api.move('player', [P.ball.waiterDrop[0] - 1, P.ball.waiterDrop[1] + 1]);
        await api.narrate('You don\'t rebuke anyone. You just kneel beside him and start picking up glass. He shoots you a confused look that softens into gratitude so potent it hurts.');
        await api.say('waiter', 'Thank you.', { mood: 'sad' });
        await api.narrate('Carol bends over and jerks her arms side to side in a wonky little dance. It takes you a moment to realise she\'s imitating you.');
        await api.say('carol', 'Can you believe she just bent down in front of everyone? She must really love being on her knees.', { mood: 'smug' });
        aud(api, -3);
        await api.narrate('The crowd roars. Then a large woman shoves through the throng with a determined stride and kneels next to you.');
        await api.move('kessie', [P.ball.waiterDrop[0] + 1, P.ball.waiterDrop[1] + 1]);
        api.face('kessie', 'player');
        await api.say('kessie', 'Don\'t listen to them. I\'m Kessie, by the way.');
        api.lowerThird('KESSIE BURGINGTON', 'Contestant • Bank robbery', 3500);
        await api.say('luna', 'Luna. I\'d say it\'s nice to meet you, but given the circumstances...');
        await api.say('kessie', 'I understand. It\'s a shame, the situation we\'ve found ourselves in.');
        await api.narrate('She reaches for a jagged piece of glass. It slices her thumb cleanly. She sucks in a sharp breath and brings it to her mouth.');
        await api.say('kessie', 'Women like that, though, if you let them get away with insulting you once, they\'ll disrespect you for a lifetime.');
        var back = await api.choice([
          '(Louder) "I\'m not worried. I have an eleven-year-old daughter back home. Trust me, no grown woman can out-sass a preteen girl."',
          '(To Carol) "Careful. Kneeling is how you pick up the pieces. You\'ll learn."'
        ]);
        api.sound('applause');
        if (back === 0) { aud(api, +7); await api.narrate('Laughter ripples through the guests. A moment ago they were egging Carol on. Now they\'ve flipped to you. Good to know.'); }
        else { aud(api, +4); await api.narrate('A few guests "ooh". Carol\'s smile goes strained, lips pressed so tight they barely form a line.'); }
        await api.say('kessie', 'Unbelievable.', { mood: 'neutral' });
        var kq = await api.choice(['"Have we met before?"', '"Thanks for the backup."']);
        if (kq === 0) {
          await api.emote('kessie', '!');
          await api.say('kessie', 'No... I just like to help people.', { mood: 'fear' });
          await api.think('Too fast. She answered too fast.');
          api.set('ch03_askedKessie', true);
        } else {
          await api.say('kessie', 'Anytime, sweetie.');
        }
        await api.say('kessie', 'Well, you folks seem like you\'ve got this. Nice to meet you, Luna. I\'m sure we\'ll be seeing each other around.');
        await api.say('luna', 'Couldn\'t miss it even if I wanted to.');
        await api.move('kessie', P.ball.kessieFrom);
        api.hide('kessie'); api.set('ch03_kessieGone', true);
        await api.say('waiter', 'Thank you, miss. Truly.');
      } else {
        await api.think('I stay where I am. The quiet game. He finishes alone while they laugh, and Carol soaks in every cheer.');
        aud(api, +1);
        await api.narrate('Across the circle, a large woman in a sky-blue dress kneels to help him instead. She cuts her thumb on the glass. When she looks up and sees you watching, she flinches like she\'s seen a ghost and hurries away.');
        api.hide('kessie'); api.set('ch03_kessieGone', true);
        await api.think('Kessie. From the booklet. Why would she look at me like that?');
      }
      api.set('ch03_waiterDone', true);
      api.hide('waiter'); api.set('ch03_waiterGone', true);
      api.lowerThird(null);

      /* ============ 10. THE SELFIE / PANIC ============ */
      await api.narrate('A woman in peacock blue throws her head back and cackles. A man slaps his thigh, his mouth wide enough to show a gold molar. Your head throbs.');
      api.lockPlayer();
      await api.move('selfie', [api.playerTile().x + 1, api.playerTile().y]);
      api.face('selfie', 'player');
      await api.say('selfie', 'Omygeeez, you\'re one of the contestants! Aren\'t you just the cutest? Here, look at my new camera. This\'ll net me thousands of followers. Smile!', { mood: 'happy' });
      api.sound('camera'); api.flash('#ffffff', 600);
      await api.shake(400, 1);
      api.unlockPlayer();
      api.sound('heartbeat');
      await api.narrate('Stars dance before your eyes. When your vision clears, every pair of eyes in the room is on you. Is the woman in red recording? Why does the businessman by the window keep glancing over?');
      await api.think('Each voice bleeds into the next. Pressure on all sides. Breathe. Find a door. Any door.');
      var pr = await api.minigame('panic', {
        title: 'THE WEIGHT OF THEIR STARES',
        playerSpec: 'luna_ball',
        startPanic: 30,
        map: [
          '##########################',
          '#mmmmmmmmmmmmmmmmmmmmmmm*#',
          '#mmmmXXmmmmmmmmmmmXXmmmmm#',
          '#mmmmmmmmmmTTmmmmmmmmmmmm#',
          '#mmmmmmmmmmTTmmmmmmmmmmmm#',
          '#mm@mmmmmmmmmmmmmmmmXXmmm#',
          '#mmmmmmmmXXmmmmmmmmmmmmmm#',
          '#mmmmmmmmmmmmmmmmmmmmmmmm#',
          '##########################'
        ],
        guests: [[6, 2, 90], [9, 5, 0], [12, 6, 270], [14, 2, 180], [16, 4, 90], [18, 6, 0], [21, 3, 180], [22, 6, 270], [7, 7, 300], [19, 1, 90]]
      });
      api.set('ch03_panicDone', true);
      api.set('ch03_panicFainted', !pr.success);
      api.hide('selfie');
      api.onAir(false); api.approval(false);
      if (!pr.success) {
        aud(api, -2);
        await api.slides([{ style: 'black', text: 'The floor tilts. Your fingertips scrape textured wallpaper, fumbling forward until they catch on the cool metal of a doorknob.' }]);
      } else {
        await api.think('My fingers catch the cool metal of a doorknob. A quick glance confirms my hopes. A bathroom. Thank God.');
      }

      /* ============ 11. THE MIRROR BATHROOM ============ */
      await api.goRoom(H.bath, { at: P.bath.arrive, facing: 'up' });
      await api.narrate('The door swings shut behind you with a soft thud that seals out the noise. The white floor tiles feel cool against your cheek.');
      await api.think('Silence has always been a sanctuary for me. Most people fold under its weight. I stretch through it.');
      await api.think('A seamless strip of mirror runs corner to corner. Every angle of me. Pale, sweaty, eyes wide. Even for a bathroom, this feels cruel. I\'d bet the men\'s room doesn\'t have a mirror like this.');
      var mirrorIdx = 0, MIR = ['forest', 'throne', 'fairy', 'plain'];
      var MIRT = [
        'A baby bunny bounds across the forest floor. I reach out to touch it. My fingers only brush the glass. A mockery of escape.',
        'Stone walls, tapestries. My sweaty clothes become an evening gown. My reflection reclines on a throne with a pile of gold at her feet.',
        'Wings flutter from my back. A me that could take flight and escape anywhere she chose. Once upon a time I dreamed in fairy tales.',
        'The image fades back to white tiles. Still alone. Still trapped. Everyone has to wake up sometime.'
      ];
      api.onInteract('bath_button', async function (api) {
        var k = MIR[mirrorIdx % 4];
        api.sound('select');
        await api.slides([mirrorSlide(k)]);
        if (mirrorIdx < 4) await api.think(MIRT[mirrorIdx]);
        mirrorIdx++;
        api.set('ch03_mirrorPresses', mirrorIdx);
      });
      api.onInteract('bath_stool', [{ think: 'A little step stool by the sink. For short people. Or children.' }]);
      await api.until(function (f) { return (f.ch03_mirrorPresses || 0) >= 3; }, {
        objective: 'Press the red button under the faucet',
        targets: ['bath_button', 'bath_button', 'bath_button']
      });
      api.objective(null);
      api.sound('door');
      await api.narrate('A toilet flushes behind you.');
      await api.think('No one came in while I was at the mirror. Whoever is in that stall was there before me. Watching?');
      api.show('annette');
      await api.emote('annette', '♪');
      await api.narrate('The rightmost stall swings open. A tiny, wrinkled elf of an old lady pops out, no more than four-foot-nine, her black cane tapping sharp on the tile. Gravity-defying white tufts.');
      api.lowerThird('ANNETTE DUNPHY', 'Contestant • Murder', 3500);
      await api.say('annette', 'Sure is a nice washroom. Wasn\'t expecting the breeze up my fanny, though. To tell you the truth, dear, it felt real good.', { mood: 'happy' });
      var laugh = await api.choice(['(Laugh. You can\'t help it.)', '(Keep a straight face.)']);
      if (laugh === 0) { meter(api, 'm_annette', +2, 40); await api.narrate('Her grin stretches so wide it takes up half her doll-sized head.'); }
      await api.say('annette', 'Do me a solid, young lady. Kick that stool this way. Bending down ain\'t as easy as it used to be.');
      await api.narrate('A pointed tap of her cane on the floor.');
      api.objective('The stool');
      await api.waitForInteract('bath_stool');
      var st = await api.choice([
        { text: '(Kick it over to her, like she asked.)', set: { ch03_stool: 'kick' } },
        { text: '(Carry it over and set it down for her.)', set: { ch03_stool: 'carry' } },
        { text: '(Pretend you didn\'t hear.)', set: { ch03_stool: 'ignore' } }
      ]);
      if (st === 2) {
        await api.say('annette', 'Young folks these days. Ain\'t nobody raised ye right.', { mood: 'angry' });
        await api.narrate('She hooks the stool with the crook of her cane and drags it over herself, never taking her eyes off you.');
      } else {
        meter(api, 'm_annette', +5, 40);
        api.remove('bath_stool');
        await api.say('luna', 'Here you go.');
        await api.say('annette', st === 0 ? 'Ha! Thass better. Ye got a good leg on ye.' : 'Thank you kindly. Somebody raised ye right.', { mood: 'happy' });
      }
      api.objective(null);
      await api.narrate('She pushes herself up onto the stool and, instead of washing her hands, clambers right onto the sink and settles next to the faucet, feet dangling.');
      await api.say('annette', 'What\'s this?');
      api.sound('select');
      await api.slides([mirrorSlide('forest')]);
      await api.narrate('She laughs and claps her hands when the forest appears behind her.');
      api.sound('door');
      api.show('carol_b');
      await api.narrate('The door creaks open. Carol steps in, sees the two of you and freezes. Then she squares her shoulders and strides into a stall, letting the door bang shut.');
      api.hide('carol_b');
      await api.say('annette', 'Now that one ain\'t playing.');
      await api.move('annette', [P.bath.carolStall[0], P.bath.carolStall[1] - 1]);
      api.face('annette', 'down');
      api.sound('hit'); await api.shake(200, 2);
      await api.say('annette', 'Manners!', { mood: 'angry' });
      await api.narrate('Her cane slams against Carol\'s stall. Carol\'s feet jump. Annette limps out without another word.');
      api.hide('annette'); api.set('ch03_annetteGone', true);
      api.lowerThird(null);
      await api.think('I could hide in here all night. But I don\'t want to be here when Carol comes out.');
      api.set('ch03_bathDone', true);

      /* ============ 12. LEAVE EARLY ============ */
      await api.goRoom(H.ball, { at: [P.ball.odds[0] + 1, P.ball.odds[1] + 2], facing: 'up' });
      api.onAir(true); api.approval(api.get('m_audience', 40));
      await api.narrate('The noise slaps you full force. The guests have gone from tipsy to manic. A paunchy man in a red tie nearly crashes into you. "\'Scuse me."');
      api.onInteract('ch03_odds', async function (api) {
        await api.tv({ headline: 'SURVIVAL ODDS • LIVE', text: 'ANNETTE 31% • CAROL 24% • KESSIE 17% • DELPHIN 12% • ISAIAH 9% • LUNA 8% • JOHN 6%', ticker: 'PREDICTED EXIT: WEEK 2 • PLACE YOUR BETS', tag: 'ODDS' });
        await api.think('Less than ten percent chance of survival. That\'s what they give me. A chill presses against the base of my spine.');
        api.set('ch03_sawOdds', true);
      });
      api.onInteract('trader', async function () {});
      await api.until(function (f) { return f.ch03_sawOdds; }, { objective: 'Somebody unveiled a giant screen while you were gone', target: 'ch03_odds' });
      api.objective('Find Trader. Ask to leave.');
      await api.waitForInteract('trader');
      await api.say('trader', 'Why yes, I did personally design some of the competitions. True art can only be perfected when one\'s vision is left untouched.', { mood: 'smug' });
      await api.narrate('You push through the tangle of sweaty bodies and find yourself in the centre of his circle. Everyone stares. Your cheeks burn.');
      await api.say('trader', 'Excuse us for a moment, folks.', { mood: 'happy' });
      await api.say('trader', 'Enjoying the party?');
      await api.think('A flicker of concern in his eyes. Brief. Strangled. But there.');
      await api.say('luna', 'Is there going to be trouble if I leave? I\'m not doing myself any favours here.');
      await api.say('trader', 'That depends. Do you want these people to think you don\'t find them worth your time? Leaving now could cost you votes when you need them.');
      var lv = await api.choice([
        '"This isn\'t me. They\'ll realise that soon enough anyway. I\'m tired. Can I please just go lie down?"',
        '"Then tell them I was overwhelmed by the honour." (Smile for the cameras.)'
      ]);
      if (lv === 1) { aud(api, +3); await api.say('trader', 'Ha! She learns fast, folks!', { mood: 'happy' }); }
      await api.say('trader', 'Alright. But don\'t expect special treatment like this in the future. This is the only time I\'ll make an exception for you.');
      await api.think('He waits. I know what he wants.');
      await api.say('luna', 'Thank you.');
      await api.think('The words taste bitter. He waves me off and returns to his adoring crowd.');
      api.set('ch03_leftBall', true);
      api.onAir(false); api.approval(false);
      api.objective('Leave the ballroom');
      await api.waitForRoom(H.hall);

      /* ============ 13. ELEPHANT ============ */
      api.objective(null);
      await api.narrate('Outside the ballroom the world goes still without mercy. Footsteps echo. Portraits of old men in tight suits glare silent accusations.');
      api.lockPlayer();
      var pt = api.playerTile();
      api.placeNpc('elephant', [pt.x - 1, pt.y], 'right');
      api.face('player', 'left');
      api.sound('heartbeat');
      await api.narrate('A quiet shuffling. Hot breath on your neck. You turn your head and nearly bash it into a golden elephant mask.');
      await api.think('Here\'s the thing about True Believers: they\'re creepy. The flowing black robes. The ridged gloves. The pointed shoes that never lose their shine. And the masks. Always golden. Always an animal.');
      await api.wait(900);
      var lines = [
        '"Is there something you need from me?"',
        '"You must be popular at parties." (laugh weakly)',
        '"Okay, then. I\'m going to go now. That\'s okay, right? If not, maybe shake your head or something..."'
      ];
      for (var e = 0; e < 3; e++) {
        await api.choice([lines[e], '(Say nothing. Stare back.)']);
        await api.emote('elephant', '…', 800);
      }
      await api.think('Two long minutes. Each tick of the clock louder than the last. Not even a twitch.');
      api.unlockPlayer();
      api.set('ch03_elephantDone', true);
      api.objective('Back away (the door behind you: the library)');
      await api.waitForRoom(H.library);

      /* ============ 14. THE LIBRARY ============ */
      api.objective(null);
      await api.think('Pitch black. I\'ve always hated the dark. My hands scramble along the wall for a switch.');
      api.onInteract('to_red_hall', null);
      api.objective('Find the light switch');
      await api.waitForInteract('ch03_switch');
      api.sound('confirm');
      var lib = G.World.room && G.World.room.def;
      if (lib) { lib.dark = 0; lib.playerLight = 0; }
      await api.narrate('Light floods the room. Your hands are shaking. You don\'t care.');
      await api.think('Somehow, of all the rooms on set, I ended up in the one full of books. That musty smell. For the first time since I arrived in this circus from hell, I finally got lucky.');
      var SHELF = {
        ch03_shelfA: 'History of the Great Leader, volumes one through forty. Every spine is pristine. Nobody has ever opened one.',
        ch03_shelfB: 'The shelves are smoother than any wood I\'ve ever felt. The carving is so light it doesn\'t change the texture. A spine here is slightly too thick... no. Just a book. Just a book.',
        library_falsville: null
      };
      Object.keys(SHELF).forEach(function (id) {
        api.onInteract(id, async function (api) {
          if (SHELF[id]) { await api.think(SHELF[id]); return; }
          if (api.has('ch03_foundBook')) { await api.think('The children\'s section. Falsville, all twelve. The Newberry Twins.'); return; }
          await api.narrate('Three children grinning while they chase a tiger. Falsville.');
          await api.think('Waverly was obsessed with this one when she was too young to read but too smart for the condescending picture books. I must have read it to her fifty times.');
          await api.think('I touch the photo in my pocket, right where her head is. "Soon."');
          api.set('ch03_foundBook', true);
        });
      });
      await api.until(function (f) { return f.ch03_foundBook; }, {
        objective: 'Look through the shelves',
        targets: ['ch03_shelfA', 'ch03_shelfB', 'library_falsville']
      });
      api.objective('Sit down with the book');
      await api.waitForInteract('ch03_armchair');
      api.set('ch03_sat', true);
      await api.letter({ title: 'Falsville', text: 'Once upon a time, there were three fantastically clever children who loved to play games.\n\nEvery weekend, the children would rise from their beds and go on an adventure in the magical woods called Falsville.' });
      await api.think('Six-year-old Waverly balanced on the edge of my chair, her head on my shoulder.');
      api.sound('door');
      api.show('isaiah');
      api.placeNpc('isaiah', P.library.arrive, 'up');
      await api.narrate('The door creaks open. A gangly boy with glasses far too big for his face shuffles in the doorway.');
      api.lowerThird('ISAIAH BLUEFORD', 'Contestant • Sodomy', 3500);
      await api.say('isaiah', 'I\'m sorry. I didn\'t realise this room was occupied. I\'ll go.', { mood: 'fear' });
      await api.think('Eighteen. His "crime" is thinly veiled politi-speak for refusing to love in a box. My heart burns for him.');
      var iz = await api.choice([
        { text: '"That\'s okay. We\'re going to be living together, so we should get used to running into each other. Do you want to come in? You don\'t have to talk."' },
        { text: '"It\'s fine." (Go back to your book.)' }
      ]);
      if (iz === 0) {
        meter(api, 'm_isaiah', +10, 30);
        api.set('ch03_warmIsaiah', true);
        await api.narrate('He takes a step back, pauses, scans the room. When he sees the loaded shelves his face goes from wide-eyed to hungry.');
      } else {
        await api.narrate('He hovers a long moment, then edges in like the floor might bite.');
      }
      await api.move('isaiah', P.library.isaiahChair);
      api.face('isaiah', 'left');
      await api.narrate('He pulls a thick tome off a shelf and folds into a stiff-backed chair. "Statistical Analysis of Crime Through the Ages." You can feel the heat of him, inches away. Concentration is impossible.');
      await api.say('isaiah', 'Sorry to disturb you. Would you mind if I asked what you\'re reading? Only, I really love books, and I always wonder what people are reading. But if it\'s a bother, that\'s completely understandable.', { mood: 'fear' });
      await api.say('isaiah', 'Sorry.');
      var bk = await api.choice([
        '"It\'s just a silly kid\'s story. Nothing complicated. Not like... statistical analysis of crime through the ages?"',
        '(Hold up the cover without a word.)'
      ]);
      if (bk === 0) await api.say('isaiah', 'Actually, plenty of studies have proven the positive effect reading has on youth and adults, particularly in empathetic development. Children\'s fiction is a valid form of engagement for readers of all ages.');
      await api.narrate('He leans closer and squints at the cover. His vision really is terrible. Then his face lights up, awkward academic to enthusiastic boy in one second.');
      await api.say('isaiah', 'Oh, I know that series! My mom and I used to read it together when I was a kid.', { mood: 'happy' });
      await api.say('luna', 'Really? I did the same with my daughter. Actually —');
      api.lowerThird(null);
      api.sound('static');
      api.flash('#ffffff', 500);
      await api.fadeOut(500, '#fff');

      /* ============ 15. THE MEMORY: 2060 ============ */
      await api.titleCard('2060', 'Luna, age 8', 1800);
      api.setPlayer('luna_child');
      await api.goRoom(MEM, { at: [4, 2], facing: 'right' });
      await api.fadeIn(600);
      await api.narrate('Back when life still felt warm and cozy and safe. The reason for that is lying next to you.');
      await api.say('mom', 'The three children loved the forest very much, but not nearly as much as they loved each other.', { mood: 'happy' });
      await api.narrate('She runs her fingers through your hair.');
      await api.say('mom', 'Not nearly as much as I love you, Luna-Loo.', { mood: 'happy' });
      await api.choice(['"Read it again."', '"Do the tiger voice."']);
      await api.say('mom', 'Rrrrraaa. Tomorrow, baby. Sleep now.', { mood: 'happy' });
      api.sound('hit'); await api.shake(250, 3); api.sound('hit');
      await api.narrate('A loud knock on the door downstairs.');
      await api.emote('mom', '!');
      await api.say('mom', 'Don\'t look.', { mood: 'fear' });
      await api.move('mom', [[10, 4], [13, 4], [16, 5]], { speed: 60 });
      api.face('mom', 'down');
      api.set('ch03_memWait', true);
      api.onInteract('mem_book', async function (api) {
        await api.think('Under the covers. Under the covers. She said don\'t look.');
        api.set('ch03_memHid', true);
      });
      await api.until(function (f) { return f.ch03_memLook || f.ch03_memHid; }, {
        objective: 'Stay in bed (the book)... or look (the stairs)',
        targets: ['mem_stairs']
      });
      var looked = !!api.get('ch03_memLook');
      api.set('ch03_memWait', false);
      api.objective(null);
      api.set('ch03_lookedAtArrest', looked);
      api.addNpc({ id: 'tb1', spec: 'tb', at: [16, 6], facing: 'up' });
      api.addNpc({ id: 'tb2', spec: 'tb', at: [15, 5], facing: 'up' });
      api.sound('alarm');
      await api.shake(400, 3);
      if (looked) {
        api.teleport([12, 4], 'right');
        await api.narrate('Shouts and bangs. The ball in your chest expands until you can barely breathe. You run down the stairs.');
        await api.think('What could make the bravest person I know that afraid? I have to find out.');
        await api.move('player', [14, 4]);
        await api.say('luna_child', 'Stop!', { mood: 'angry', name: 'Luna' });
        await api.narrate('You slam your hands against a True Believer\'s chest. Gold mask. Black gloves. They bat you away like debris in the wind. You hit the floor.');
        api.flash('#ffffff', 200); await api.shake(300, 4);
      } else {
        await api.narrate('You pull the blanket over your head. Shouts. Bangs. A sound you will never be able to describe. Your mother screaming.');
        await api.think('She said don\'t look. She said don\'t look. She said don\'t —');
      }
      await api.say('mom', 'I love you. Never forget that.', { mood: 'cry' });
      await api.narrate('One of them stuffs a cloth into her mouth. Gold masks. Black gloves. The door.');
      api.hide('mom'); api.hide('tb1'); api.hide('tb2');
      api.sound('door');
      await api.fadeOut(900);
      api.set('ch03_memoryDone', true);

      /* ============ 16. BACK IN THE LIBRARY ============ */
      api.setPlayer('luna_ball');
      await api.goRoom(H.library, { at: [P.library.chair[0], P.library.chair[1] + 1], facing: 'right', fade: false });
      var lib2 = G.World.room && G.World.room.def; if (lib2) { lib2.dark = 0; lib2.playerLight = 0; }
      await api.fadeIn(400);
      await api.say('isaiah', 'Are you okay? You seem to be distressed. I\'m sorry if I\'m wrong. I can\'t always tell these things.', { mood: 'fear' });
      await api.think('Was that... the night they took her? It could have been anyone at the door. But I know. Why did it come back now?');
      await api.think('And Waverly. When they took me, did she look at the door the way I did?');
      await api.narrate('You jump to your feet. Isaiah jerks back as if he expects to be struck. You know that reflex.');
      await api.choice(['(Back slowly toward the door. Don\'t look at him.)', '"I\'m sorry. It\'s not you." (Then go.)']);
      await api.narrate('Your fingers touch the metal handle. You pivot and sprint.');
      api.remove('isaiah');
      await api.goRoom(H.bedhall, { at: P.bedhall.arrive, facing: 'left' });
      await api.narrate('The halls blur into a tunnel. Your feet know the way your mind can\'t. Stairs. Then your floor.');

      /* ============ 17. DOOR 7 (night) ============ */
      await api.think('My door is right there. But down the hall, past it, someone is making a sound I know too well.');
      api.objective('Down the hall (door 7)');
      await api.waitForZone('door7zone');
      api.objective(null);
      api.lockPlayer();
      await api.narrate('Behind door 7, someone is crying. Muffled. Trying not to be heard.');
      await api.say('isaiah', 'Mommy...', { name: 'Behind door 7', portrait: false });
      await api.think('Isaiah. A scared kid who wants his mother. And one of the people standing between me and my daughter.');
      var d7 = await api.choice([
        { text: '(Knock softly.)' },
        { text: '(Put your hand to the door. Then to your heart. Walk away.)' }
      ]);
      api.unlockPlayer();
      if (d7 === 0) {
        meter(api, 'm_isaiah', +10, 30);
        api.set('ch03_knockedDoor7', true);
        api.sound('door');
        await api.narrate('The crying stops dead.');
        await api.say('isaiah', 'I\'m fine. I\'m fine. Thank you. Goodnight.', { name: 'Behind door 7', portrait: false });
        await api.think('He isn\'t. Neither am I.');
      } else {
        api.set('ch03_knockedDoor7', false);
        await api.narrate('You lay your palm flat on the wood. Then on your chest. Then you walk away.');
      }
      api.set('ch03_door7Done', true);
      await api.waitForRoom(H.room, { objective: 'Your room (No. 3)' });

      /* ============ 18. NIGHT ============ */
      api.objective('Something is on your bed');
      await api.waitForInteract('ch03_nightgown');
      await api.narrate('A plastic bag. A threadbare nightgown with DPE SLEEPWEAR embroidered across the chest.');
      await api.think('Is this really what my life has come to? A walking advertisement for my future executioners?');
      await api.think('Comfort wins out over pride. It always does.');
      api.remove('ch03_nightgown');
      api.setPlayer('luna_night');
      await api.think('Way too low-cut. I tug at the neckline and the hem rides up. I\'d care less if I knew how many people were watching. I need to find every camera. Fast.');
      api.objective('Put Waverly\'s photo on the nightstand');
      api.onInteract('bed', async function () {});
      await api.waitForInteract('bed');
      api.objective(null);
      await api.narrate('You set Waverly\'s photo on the nightstand, so she\'ll be the first thing you see when you wake. She isn\'t smiling. She\'s still your Waverly.');
      await api.fadeOut(1200);
      api.ambient(null);
      api.sound('reveal');
      await api.slides([
        { style: 'black', title: '00:00', text: 'At midnight, a lullaby plays from somewhere in the walls.' },
        { style: 'black', text: 'Sleep comes quicker than expected in this prison full of pleasures.' }
      ]);
      api.completeChapter();
    }
  });
})();
