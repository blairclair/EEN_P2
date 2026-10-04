/* =========================================================================
 * ch02 "Prisoner 739"
 *
 * White room (Dr. Jan, confession) -> montage -> death row C block (three
 * days asking for Waverly) -> "Columbus House" -> panic flashbacks (Columbus
 * rations at 12, the closet at 8) -> playable birth of Waverly (alley behind a
 * diner, 2073; breathing-rhythm minigame that only works once Luna gives up and
 * holds her) -> the neighbour -> EEN application -> execution morning ->
 * Trader in the visitation room -> fine-print contract minigame -> chip
 * injected (left forearm) -> cold open: Senator Humbert recruits a hidden
 * woman (Kessie, never shown).
 *
 * Cross-chapter flags (CHAPTERS.md §2):
 *   WRITES  m_audience  (+5 sarcastic opener to Trader, -5 if Trader has to point
 *                        out the hidden clauses; via api.approval('+N'))
 *           m_waverly   (+5 if Luna takes Waverly's photo)
 *           f_kept_photo (true if she takes the photo, false if she refuses;
 *                        ch07 tears it)
 *   READS   none (first chapter in prison; m_waverly is read with default 60)
 * Chapter-local: ch02_*.
 * Sources: D3b L164-318, EFP L243-319, 2D L18-30, AB L127-133, SHORT L2-14,
 *          RD L15-90, TE L172, BACK2 L33 (notes 01 §2 item 30).
 * ========================================================================= */
(function () {
  'use strict';

  /* Runtime visual state (mutated only inside start(); read by overlay props). */
  var FX = { dread: 0, dreadTarget: 0 };

  /* ---------------------------------------------------------------------
   * Overlay "objects" (full-canvas washes drawn from an object's draw()).
   * Place them on the bottom row with layer 1 so they draw over actors.
   * ------------------------------------------------------------------- */
  function drawRain(g, x, y, t) {
    g.save();
    g.strokeStyle = 'rgba(170,190,230,0.32)';
    g.lineWidth = 1;
    g.beginPath();
    for (var i = 0; i < 110; i++) {
      var rx = ((i * 53.7 + t * 38) % 404) - 10;
      var ry = ((i * 97.3 + t * 250) % 236) - 12;
      g.moveTo(rx, ry); g.lineTo(rx - 2, ry + 6);
    }
    g.stroke();
    g.restore();
  }
  function drawDread(g) {
    // Trader's arrival: the world drains of colour (canvas 'saturation' blend).
    FX.dread += (FX.dreadTarget - FX.dread) * 0.03;
    if (FX.dread < 0.01) return;
    g.save();
    g.globalCompositeOperation = 'saturation';
    g.fillStyle = 'rgba(128,128,128,' + Math.min(0.85, FX.dread).toFixed(3) + ')';
    g.fillRect(0, 0, 384, 216);
    g.restore();
  }

  /* ---------------------------------------------------------------------
   * Custom tiles
   * ------------------------------------------------------------------- */
  var tiles = {
    wr_wall: { color: '#e4e9ec', color2: '#d3d9dd', wall: true, solid: true, pattern: 'tiles' },
    wr_floor: { color: '#f1f4f5', color2: '#e5e9ec', pattern: 'tiles' },
    wr_door: { color: '#dfe5e8', wall: true, solid: true, draw: function (g, x, y) {
      g.fillStyle = '#cfd6da'; g.fillRect(x + 2, y + 1, 12, 15);
      g.fillStyle = '#e8eef0';
      for (var i = 0; i < 3; i++) for (var j = 0; j < 2; j++) g.fillRect(x + 3 + j * 6, y + 2 + i * 5, 5, 4);
      g.fillStyle = '#9aa4aa'; g.fillRect(x + 6, y + 7, 4, 2);
    } },
    cb_wall: { color: '#55565c', color2: '#45464c', wall: true, solid: true, pattern: 'bricks' },
    cb_stair: { color: '#5a4030', solid: true, draw: function (g, x, y, info) {
      g.fillStyle = '#4a3226'; g.fillRect(x, y, 16, 16);
      for (var i = 0; i < 4; i++) { g.fillStyle = i % 2 ? '#6a4a36' : '#5c3e2e'; g.fillRect(x, y + i * 4, 16, 3); }
      void info;
    } },
    cb_closet: { color: '#3a2a20', solid: true, wall: true, draw: function (g, x, y) {
      g.fillStyle = '#2a1c14'; g.fillRect(x + 2, y + 2, 12, 14);
      g.fillStyle = '#4a3424'; g.fillRect(x + 3, y + 3, 10, 13);
      g.fillStyle = '#c9a24a'; g.fillRect(x + 10, y + 9, 2, 2);
      g.fillStyle = '#1a120c'; g.fillRect(x + 5, y + 5, 6, 1); g.fillRect(x + 5, y + 7, 6, 1);
    } },
    al_ground: { color: '#26282e', color2: '#30323a', pattern: 'noise' },
    al_puddle: { color: '#26282e', anim: true, draw: function (g, x, y, info) {
      g.fillStyle = '#26282e'; g.fillRect(x, y, 16, 16);
      g.fillStyle = '#1a2436'; g.fillRect(x + 2, y + 5, 12, 6);
      var r = (info.t * 6 + info.tx * 3) % 6;
      g.strokeStyle = 'rgba(160,180,220,0.45)'; g.lineWidth = 1;
      g.strokeRect(x + 8 - r, y + 8 - r / 2, r * 2, r);
    } },
    al_dumpster: { solid: true, base: 'al_ground', draw: function (g, x, y) {
      g.fillStyle = '#1e4a2e'; g.fillRect(x + 1, y + 3, 14, 12);
      g.fillStyle = '#163a24'; g.fillRect(x, y + 2, 16, 3);
      g.fillStyle = '#2c6a42'; g.fillRect(x + 2, y + 6, 12, 1);
      g.fillStyle = '#0c0c0c'; g.fillRect(x + 2, y + 15, 2, 1); g.fillRect(x + 12, y + 15, 2, 1);
    } },
    al_door: { color: '#6a3a2a', wall: true, solid: true, draw: function (g, x, y) {
      g.fillStyle = '#5a3a2e'; g.fillRect(x, y, 16, 16);
      g.fillStyle = '#8a8a90'; g.fillRect(x + 3, y + 2, 10, 14);
      g.fillStyle = '#6a6a70'; g.fillRect(x + 4, y + 3, 8, 12);
      g.fillStyle = '#f2d080'; g.fillRect(x + 6, y, 4, 2);
      g.fillStyle = '#2a2a2a'; g.fillRect(x + 10, y + 9, 2, 1);
    } }
  };

  /* ---------------------------------------------------------------------
   * Custom props
   * ------------------------------------------------------------------- */
  var props = {
    flap: function (g, x, y) {
      g.fillStyle = '#3a3a42'; g.fillRect(x + 3, y + 8, 10, 5);
      g.fillStyle = '#5a5a64'; g.fillRect(x + 4, y + 9, 8, 3);
      g.fillStyle = '#9a9aa4'; g.fillRect(x + 7, y + 10, 2, 1);
    },
    carving: function (g, x, y) {
      g.fillStyle = 'rgba(20,20,24,0.65)';
      for (var i = 0; i < 4; i++) g.fillRect(x + 2 + i * 3, y + 6, 1, 5);
      g.fillRect(x + 1, y + 8, 13, 1);
      g.fillRect(x + 3, y + 12, 9, 1);
    },
    tray: function (g, x, y) {
      g.fillStyle = '#8a8a90'; g.fillRect(x + 2, y + 8, 12, 6);
      g.fillStyle = '#c8b070'; g.fillRect(x + 4, y + 9, 4, 3);
      g.fillStyle = '#7a6a4a'; g.fillRect(x + 9, y + 9, 3, 3);
    },
    books: function (g, x, y) {
      var c = ['#7a2a2a', '#2a4a7a', '#7a6a2a'];
      for (var i = 0; i < 3; i++) { g.fillStyle = c[i]; g.fillRect(x + 2 + i, y + 11 - i * 3, 11, 3); g.fillStyle = '#e8dcc0'; g.fillRect(x + 3 + i, y + 12 - i * 3, 9, 1); }
    },
    drain: function (g, x, y) {
      g.fillStyle = '#c4ccd0'; g.fillRect(x + 5, y + 5, 6, 6);
      g.fillStyle = '#8a949a'; for (var i = 0; i < 3; i++) g.fillRect(x + 6, y + 6 + i * 2, 4, 1);
    },
    stain: function (g, x, y) {
      g.fillStyle = 'rgba(120,20,24,0.55)'; g.fillRect(x + 4, y + 6, 6, 3); g.fillRect(x + 7, y + 8, 4, 3);
    },
    baby: function (g, x, y, t, o) {
      g.fillStyle = '#5a4a40'; g.fillRect(x + 3, y + 8, 10, 6);
      g.fillStyle = (o && o.def && o.def.pink) ? '#e8a8a0' : '#9aa6b8';
      g.fillRect(x + 4, y + 6, 5, 5);
      g.fillStyle = '#3a2a24'; g.fillRect(x + 5, y + 8, 1, 1); g.fillRect(x + 7, y + 8, 1, 1);
    },
    glass: function (g, x, y, t) {
      var tw = 0.5 + 0.5 * Math.sin(t * 3 + x);
      g.fillStyle = 'rgba(200,230,255,' + (0.35 + 0.4 * tw).toFixed(2) + ')';
      g.fillRect(x + 4, y + 10, 2, 1); g.fillRect(x + 9, y + 12, 3, 1); g.fillRect(x + 6, y + 6, 1, 2);
    },
    woman: function (g, x, y) {
      // A big woman in shadow on the far side of the table. Face never shown.
      g.fillStyle = '#0d0d12'; g.fillRect(x + 1, y - 14, 22, 30);           // body in darkness
      g.fillStyle = '#08080b'; g.fillRect(x + 6, y - 24, 12, 11);           // head: pure shadow
      // forearms on the table, scarred, yellow cleaning gloves
      g.fillStyle = '#5a3a28'; g.fillRect(x - 12, y + 2, 16, 4); g.fillRect(x - 12, y + 9, 16, 4);
      g.fillStyle = '#8a6250';
      for (var i = 0; i < 4; i++) { g.fillRect(x - 10 + i * 4, y + 3 + (i % 2), 2, 1); g.fillRect(x - 9 + i * 4, y + 10 + ((i + 1) % 2), 2, 1); }
      g.fillStyle = '#e8d040'; g.fillRect(x - 17, y + 1, 6, 6); g.fillRect(x - 17, y + 8, 6, 6);
      g.fillStyle = '#c8b030'; g.fillRect(x - 17, y + 6, 6, 1); g.fillRect(x - 17, y + 13, 6, 1);
    },
    rain: drawRain,
    dread: drawDread
  };

  /* ---------------------------------------------------------------------
   * MAPS
   * ------------------------------------------------------------------- */
  var whiteRoom = {
    name: 'The White Room',
    tiles: [
      'wwwwwwww',
      'woooooow',
      'woooooow',
      'woooooow',
      'woooooow',
      'woooooow',
      'woooooow',
      'wwwPwwww'
    ],
    legend: { w: 'wr_wall', o: 'wr_floor', P: 'wr_door' },
    spawn: [3, 3],
    ambient: 'hum',
    tint: '#ffffff', tintAlpha: 0.08,
    vignette: 0.25,
    bg: '#f4f6f7',
    objects: [
      { id: 'wr_cam', at: [6, 0], prop: 'camera', examine: [{ think: 'A lens in the corner. Even here. Especially here.' }, { sound: 'camera' }] },
      { id: 'wr_door', at: [3, 7], examine: 'Padded. No handle on this side. No window.' },
      { id: 'wr_drain', at: [5, 5], prop: 'drain', solid: false, examine: [{ think: 'A drain in the floor. Rooms only need drains when they expect to be hosed down.' }] },
      { id: 'wr_wall', at: [1, 0], examine: [{ think: 'Back when I was a kid, I had this strange fascination with reading about government-sponsored atrocities. Rooms purposely designed without colour or stimulation.' }, { think: 'Strip someone down until the only part left is raw nerve endings.' }] },
      { id: 'wr_light', at: [4, 0], examine: 'Fluorescent lights glare overhead, buzzing faintly. The stench of antiseptic roams through the air.' }
    ]
  };

  // C block: six cells (Luna's is #3, interior x9-11 y1-3), corridor, guard desk east, door west.
  var cblock = {
    name: 'C Block (Death Row)',
    tiles: [
      '#########################',
      '#b__#b__#b__#b__#b__#b__#',
      '#___#___#___#___#___#___#',
      '#__t#__t#__t#__t#__t#__t#',
      '#|||#|||#|||#|||#|||#|||#',
      '#____________________Vdd#',
      '#_______________________#',
      '#D#######################'
    ],
    spawn: [10, 2],
    ambient: 'drone',
    tint: '#304048', tintAlpha: 0.18,
    dark: 0.45,
    lights: [{ at: [2, 2], r: 26 }, { at: [6, 2], r: 26 }, { at: [10, 2], r: 34 }, { at: [14, 2], r: 26 }, { at: [18, 2], r: 26 }, { at: [22, 2], r: 26 },
      { at: [22, 5], r: 44, flicker: true }, { at: [11, 6], r: 30 }],
    playerLight: 22,
    npcs: [
      { id: 'inmate1', at: [2, 2], spec: 'ch02:inmate_a', facing: 'down', talk: 'She doesn\'t look up.' },
      { id: 'inmate2', at: [6, 1], spec: 'ch02:inmate_b', facing: 'down' },
      { id: 'neighbour', at: [14, 2], spec: 'ch02:neighbour', facing: 'left' },
      { id: 'inmate5', at: [22, 2], spec: 'ch02:inmate_c', facing: 'down' }
    ],
    objects: [
      { id: 'carving', at: [10, 0], prop: 'carving', examine: async function (api) {
        var n = api.add('ch02_carvingReads');
        var lines = [
          'Every defiant word carved into the wall. MAMA I\'M SORRY. Under it, in a different hand: SHE KNOWS.',
          'INNOCENT. Then, smaller, as if the author lost their nerve: MOSTLY.',
          'Tally marks. Forty-one of them. Then nothing.',
          'In the darkness of night, when no one is watching, I run my fingers over them and picture the poor souls who came before me.'
        ];
        await api.narrate(lines[(n - 1) % lines.length]);
      } },
      { id: 'cot', at: [9, 1], examine: 'A threadbare cot. It smells like the last woman who slept here.' },
      { id: 'toilet', at: [11, 3], examine: [{ think: 'A lidless toilet. No dignity. No hiding.' }, { think: 'If I had a penny for every time a guard eagerly rushed over at the sound of a soft tinkle, they\'d probably take it from me just like everything else.' }] },
      { id: 'flap', at: [10, 4], prop: 'flap', examine: 'The food flap. Locked from the outside.' },
      { id: 'nwall', at: [12, 2], examine: [{ think: 'Cell four is on the other side of this wall. Sometimes she hums.' }] },
      { id: 'cb_tv', at: [21, 5], examine: async function (api) {
        await api.tv([
          { speaker: 'ch02:anchor', headline: 'EEN Tonight', text: 'Coming this January from the Department of Punitive Entertainment: a brand-new season of Redemption Survivor!', tag: 'PROMO' },
          { speaker: 'ch02:anchor', headline: 'Right to Life', text: 'Seven sinners. One house. Your vote decides who deserves to live. Stay tuned, citizens!', tag: 'PROMO' }
        ]);
      } },
      { id: 'cb_cam', at: [16, 0], prop: 'camera', examine: [{ think: 'The red dot never blinks off.' }] }
    ],
    exits: [
      { id: 'to_visit', at: [1, 7], to: 'visit', toAt: [7, 8], facing: 'up' }
    ]
  };

  // Columbus House, a corridor under the main stair: rations line (Luna at 12).
  var columbus = {
    name: 'Columbus House',
    tiles: [
      'BBBBBWBBBBBWBB',
      'B,,,,,,,,,,SSB',
      'B,,,,,,,,,,SSB',
      'B,,TT,,,,,,ZSB',
      'B,,TT,,,,,,,,B',
      'B,,,,,,,,,,,,B',
      'Bhh,,,,,,,,,VB',
      'BBBBBBBBBBBBBB'
    ],
    legend: { S: 'cb_stair', Z: 'cb_closet' },
    spawn: [2, 5],
    ambient: 'tension',
    tint: '#802020', tintAlpha: 0.22,
    vignette: 0.8,
    npcs: [
      { id: 'felton', at: [7, 3], spec: 'ch02:felton', facing: 'left' },
      { id: 'kidA', at: [8, 2], spec: 'ch02:kid_a', facing: 'left' },
      { id: 'kidB', at: [8, 4], spec: 'ch02:kid_b', facing: 'left' }
    ],
    objects: [
      { id: 'cb_tvset', at: [12, 6], examine: 'The wall TV. It is always on. It is always EEN.' },
      { id: 'cb_closetdoor', at: [11, 3], examine: [{ think: 'The closet under the stairs. Everyone knows what it smells like.' }] }
    ],
    zones: [
      { id: 'rationsline', at: [5, 2], w: 1, h: 3 }
    ]
  };

  // The punishment closet (local fallback; shared 'columbus_closet' is used if it exists).
  var closetLocal = {
    name: 'The Closet',
    tiles: [
      '####',
      '#__#',
      '#__#',
      '####'
    ],
    spawn: [1, 2],
    ambient: 'drone',
    dark: 0.9, playerLight: 14,
    tint: '#301010', tintAlpha: 0.2,
    objects: [{ id: 'cl_door', at: [2, 3], examine: 'Locked.' }]
  };

  // The alley behind the diner, 2073. Rain.
  var alley = {
    name: 'Alley Behind the Diner',
    tiles: [
      'BBBBBBBBBBBBBBBBBB',
      'BBBByBBBBBBBBBBBBB',
      'aaaaaaaaaaaaaaaaaa',
      'aJJaaaaaaaapaaJJaa',
      'aaaaaaaaaaaaaaaaaa',
      'aaapaaaaaaaaaaaaaa',
      'aaaaaaaaaaaaaapaaa',
      'BBBBBBBBBBBBBBBBBB'
    ],
    legend: { a: 'al_ground', p: 'al_puddle', J: 'al_dumpster', y: 'al_door' },
    spawn: [7, 5],
    ambient: 'static',
    tint: '#1a2440', tintAlpha: 0.2,
    dark: 0.55,
    lights: [{ at: [4, 2], r: 52, flicker: true }, { at: [16, 5], r: 20 }],
    playerLight: 30,
    objects: [
      { id: 'al_trash1', at: [3, 3], prop: 'bag', examine: 'Trash bags. They were my pillows an hour ago.' },
      { id: 'al_glass1', at: [9, 4], prop: 'glass', solid: false, layer: -1 },
      { id: 'al_glass2', at: [12, 6], prop: 'glass', solid: false, layer: -1 },
      { id: 'al_glass3', at: [6, 2], prop: 'glass', solid: false, layer: -1 },
      { id: 'al_bag', at: [16, 5], prop: 'bag', examine: 'My bag. Everything I own since the landlord threw my stuff to the curb.' },
      { id: 'al_doorx', at: [4, 1], examine: 'The diner\'s back door. Grease, laughter, the smell of fry oil. No hospital would admit a new mother without insurance.' },
      { id: 'al_rain', at: [0, 7], draw: drawRain, solid: false, layer: 1 }
    ],
    zones: [
      { id: 'hide', at: [14, 4], w: 2, h: 1 }
    ]
  };

  // Visitation room. Luna's table is at the far east end.
  var visit = {
    name: 'Visitation Room',
    tiles: [
      '####W######W####',
      '#______________#',
      '#_TT__TT__TT___#',
      '#_cc__cc__cc___#',
      '#______________#',
      '#___________cTc#',
      '#_TT__TT__TT___#',
      '#_cc__cc__cc___#',
      '#______________#',
      '#######D########'
    ],
    spawn: [7, 8],
    ambient: 'hum',
    tint: '#404850', tintAlpha: 0.15,
    dark: 0.35,
    lights: [{ at: [7, 4], r: 70, flicker: true }, { at: [13, 5], r: 40 }],
    objects: [
      { id: 'books', at: [14, 1], prop: 'books', examine: async function (api) {
        await api.narrate('Three dog-eared children\'s books. No doubt donated by some do-gooder with genuinely decent intentions.');
        await api.narrate('They\'re nearly in shreds. Someone has drawn something very lewd on the top cover.');
        await api.think('Reality can be cruel sometimes.');
      } },
      { id: 'stain1', at: [2, 2], prop: 'stain', examine: 'Red stains in the grain of the table. Somebody scrubbed. Somebody gave up.' },
      { id: 'stain2', at: [10, 6], prop: 'stain', examine: 'More red. The whole place sags with the depression of the damned.' },
      { id: 'bulb', at: [7, 0], examine: 'A single bulb in a cage, flickering. The room is massive enough to hold a hundred people. Today it holds me.' },
      { id: 'v_cam', at: [11, 0], prop: 'camera', examine: [{ think: 'A camera, pointed at the far table. Pointed at my table.' }] },
      { id: 'v_dread', at: [0, 9], draw: drawDread, solid: false, layer: 1 }
    ],
    zones: [
      { id: 'sit', at: [12, 5], w: 1, h: 1 }
    ],
    exits: []
  };

  // Prison infirmary.
  var infirm = {
    name: 'Prison Infirmary',
    tiles: [
      'QQQQQWQQQQ',
      'Qb:::::ddQ',
      'Q::::::::Q',
      'Qb:::::::Q',
      'Q::::::::Q',
      'Q::::::::Q',
      'QQQQQQQQDQ'
    ],
    spawn: [6, 4],
    ambient: 'hum',
    tint: '#d0e0e8', tintAlpha: 0.1,
    npcs: [
      { id: 'nurse', at: [3, 2], spec: 'medic', facing: 'right', talk: 'Sleeve up, left arm.' }
    ],
    objects: [
      { id: 'i_cam', at: [2, 0], prop: 'camera' },
      { id: 'i_tray', at: [6, 1], examine: 'A steel tray. A syringe as thick as a marker. A tiny black capsule in a sealed bag.' }
    ],
    zones: [{ id: 'leave', at: [8, 6], w: 1, h: 1 }]
  };

  // Cold open: gated prison interview room, 24x6 (letterboxed by the black bg).
  var interview = {
    name: 'Interview Room 2',
    tiles: [
      'QQQQQWQQQQQQQQQQQQWQQQQQ',
      'Q______________________Q',
      'Q_________TTTT_________Q',
      'Q_________TTTT_________Q',
      'Q______________________Q',
      'QQQQQQQQQQQQQQQQQQQQQQQQ'
    ],
    spawn: [2, 4],
    ambient: 'drone',
    bg: '#000',
    dark: 0.82,
    lights: [{ at: [12, 2], r: 46 }, { at: [12, 3], r: 30 }],
    playerLight: 0,
    vignette: 0.7,
    npcs: [
      { id: 'humbert', at: [9, 3], spec: 'humbert', facing: 'right', turn: false }
    ],
    objects: [
      { id: 'ir_woman', at: [15, 3], prop: 'woman', solid: true },
      { id: 'ir_cam', at: [21, 0], prop: 'camera' }
    ]
  };

  /* ---------------------------------------------------------------------
   * CUSTOM MINIGAMES
   * ------------------------------------------------------------------- */

  /* breath: compress / breathe rhythm that cannot succeed until Luna stops and
   * just holds her baby (SHORT L3). Result {success:true, held, cycles, hits}. */
  var breath = {
    autoSolve: function () { return { success: true, held: true, cycles: 3, hits: 21 }; },
    start: function (ctx) {
      var R = ctx.R, P = ctx.PAL, W = ctx.W;
      var BEAT = 0.62, WIN = 0.22, HITX = 110, SPD = 120;
      var pattern = ['ok', 'ok', 'ok', 'ok', 'ok', 'up', 'up'];
      var notes = [], cycles = 0, extra = 0, hits = 0, misses = 0;
      var state = 'intro', stT = 0, msg = '', msgT = -9, lastBeat = 0, pink = 0;
      function newCycle() {
        notes = [];
        var t0 = ctx.t + 1.2;
        pattern.forEach(function (k, i) { notes.push({ t: t0 + i * BEAT + (k === 'up' ? 0.35 : 0), k: k, s: 0 }); });
        state = 'play';
      }
      function flash(m) { msg = m; msgT = ctx.t; }
      return new Promise(function (resolve) {
        ctx.loop(function () {
          var I = ctx.input, t = ctx.t;
          if (state === 'intro') { if (t > 2.2 || (t > 0.5 && I.pressed('ok'))) { I.consume('ok'); newCycle(); } return; }
          if (state === 'play') {
            var pressed = I.pressed('ok') ? 'ok' : I.pressed('up') ? 'up' : null;
            if (pressed) {
              I.consume(pressed);
              var best = null;
              notes.forEach(function (n) { if (n.s === 0 && Math.abs(n.t - t) <= WIN && (!best || Math.abs(n.t - t) < Math.abs(best.t - t))) best = n; });
              if (best) {
                if (best.k === pressed) { best.s = 1; hits++; ctx.sound(pressed === 'ok' ? 'hit' : 'blip'); flash(pressed === 'ok' ? 'COMPRESS' : 'BREATHE'); }
                else { best.s = 2; misses++; ctx.sound('miss'); flash('WRONG'); }
              }
            }
            notes.forEach(function (n) { if (n.s === 0 && t > n.t + WIN) { n.s = 2; misses++; flash('MISSED'); } });
            if (notes.every(function (n) { return n.s !== 0; }) && t > notes[notes.length - 1].t + 0.6) {
              cycles++;
              ctx.sound('heartbeat');
              if (cycles < 3) newCycle();
              else { state = 'still'; stT = t; }
            }
            return;
          }
          if (state === 'still') {
            if (t - stT < 1.2) return;
            if (extra < 2 && I.pressed('ok')) { I.consume('ok'); extra++; newCycle(); return; }
            if (I.pressed('down')) { I.consume('down'); state = 'hold'; stT = t; lastBeat = t; }
            return;
          }
          if (state === 'hold') {
            if (t - lastBeat > 1.1) { lastBeat = t; ctx.sound('heartbeat'); }
            if (t - stT > 4) { state = 'gasp'; stT = t; ctx.sound('reveal'); }
            return;
          }
          if (state === 'gasp') {
            pink = Math.min(1, (t - stT) / 1.2);
            if (t - stT > 4 || (t - stT > 1.5 && I.pressed('ok'))) { I.consume('ok'); resolve({ success: true, held: true, cycles: cycles, hits: hits, misses: misses }); }
          }
        }, function (t) {
          var dim = state === 'hold' ? Math.min(0.75, (ctx.t - stT) / 4 * 0.75) : state === 'gasp' ? Math.max(0, 0.75 - (ctx.t - stT) * 0.6) : 0;
          R.rect(0, 0, W, ctx.H, '#0a0c14');
          // rain
          var g = R.ctx; g.save(); g.strokeStyle = 'rgba(160,180,220,0.18)'; g.beginPath();
          for (var i = 0; i < 70; i++) { var rx = ((i * 53.7 + t * 30) % 400) - 8, ry = ((i * 97.3 + t * 220) % 230) - 10; g.moveTo(rx, ry); g.lineTo(rx - 2, ry + 7); }
          g.stroke(); g.restore();
          // the baby, held against Luna
          var bx = W / 2 + 70, by = 92;
          g.save();
          g.fillStyle = '#3a2e28'; g.beginPath(); g.ellipse(bx + 4, by + 16, 40, 22, -0.15, 0, Math.PI * 2); g.fill();   // Luna's shirt / arms
          g.fillStyle = '#6a5a4c'; g.beginPath(); g.ellipse(bx + 8, by + 14, 24, 13, -0.15, 0, Math.PI * 2); g.fill();  // the bundle
          g.fillStyle = '#c8a088'; g.fillRect(bx + 22, by + 4, 16, 6); g.fillRect(bx - 34, by + 22, 18, 6);            // Luna's hands
          g.restore();
          var c0 = [154, 166, 184], c1 = [236, 170, 164];
          var col = 'rgb(' + c0.map(function (v, k) { return Math.round(v + (c1[k] - v) * pink); }).join(',') + ')';
          g.save(); g.fillStyle = col; g.beginPath(); g.arc(bx - 8, by + 8, 9, 0, Math.PI * 2); g.fill();
          g.fillStyle = '#2a1e1a'; g.fillRect(bx - 12, by + 7, 2, 1); g.fillRect(bx - 6, by + 7, 2, 1);
          if (pink > 0.3) { g.fillRect(bx - 10, by + 11, 4, 2); }
          g.restore();
          if (state === 'play' || state === 'intro') {
            // the track
            R.rect(16, 150, W - 32, 26, '#000', 0.6);
            R.rect(HITX - 1, 146, 2, 34, P.amber);
            notes.forEach(function (n) {
              var x = HITX + (n.t - ctx.t) * SPD;
              if (x < 10 || x > W - 10) return;
              var cc = n.s === 1 ? P.neon : n.s === 2 ? P.red : (n.k === 'ok' ? '#e8e4d8' : P.teal);
              R.rect(x - 8, 154, 16, 18, cc, n.s ? 0.4 : 0.95);
              R.text(n.k === 'ok' ? 'E' : '↑', x, 157, { size: 10, align: 'center', color: '#111', shadow: false });
            });
            R.text('PUSH ON HER CHEST [E]   ·   BREATHE INTO HER [↑]', W / 2, 182, { size: 7, align: 'center', color: P.dim });
          }
          ctx.header('SHE ISN\'T BREATHING', state === 'play' ? 'Cycle ' + Math.min(cycles + 1, 3 + extra) : '');
          if (ctx.t - msgT < 0.5 && state === 'play') R.text(msg, HITX, 128, { size: 10, font: 'title', style: '', align: 'center', color: msg === 'COMPRESS' || msg === 'BREATHE' ? P.neon : P.red });
          if (state === 'intro') {
            R.text('My breath shook as I puffed air into her little lungs.', 24, 60, { size: 8, font: 'serif', style: 'italic', color: '#e8e4d8' });
            R.text('Each second of silence stretched for hours.', 24, 76, { size: 8, font: 'serif', style: 'italic', color: '#e8e4d8' });
          }
          if (state === 'play') R.text('Five pushes. Two breaths. Again.', 24, 60, { size: 8, font: 'serif', style: 'italic', color: P.dim });
          if (state === 'still' && ctx.t - stT > 0.4) {
            R.text('Nothing. Her doll-like body limp against my heart.', 24, 60, { size: 8, font: 'serif', style: 'italic', color: '#e8e4d8' });
            if (ctx.t - stT > 1.2) {
              if (extra < 2) R.text('[E]  Keep trying', 40, 150, { size: 9, color: '#e8e4d8' });
              R.text('[↓]  Stop. Just hold her close.', 40, extra < 2 ? 166 : 150, { size: 9, color: P.think });
            }
          }
          if (dim > 0) R.rect(0, 0, W, ctx.H, '#000', dim);
          if (state === 'hold') R.text('In the end, I hugged her close.', W / 2, 40, { size: 9, font: 'serif', style: 'italic', align: 'center', color: '#e8e4d8', alpha: Math.min(1, (ctx.t - stT) / 1.5) });
          if (state === 'gasp') {
            if (ctx.t - stT < 0.3) R.rect(0, 0, W, ctx.H, '#ffd8d8', 0.6 - (ctx.t - stT) * 2);
            R.text('I\'ll never forget her first gasp.', W / 2, 40, { size: 10, font: 'serif', style: 'italic', align: 'center', color: '#ffe8e0' });
          }
          R.vignette(0.6);
        });
      });
    }
  };

  /* contract: scroll the fine print, tap legal terms for definitions, squint at
   * the margins to find the two hidden clauses (prize + second place), sign.
   * Result {success: foundBoth, found, defs, signed:true}. */
  var CONTRACT = [
    { t: 'DEPARTMENT OF PUNITIVE ENTERTAINMENT. PARTICIPANT AGREEMENT, FORM 47A9-R. "RIGHT TO LIFE" (REDEMPTION SURVIVOR, SEASON ONE).', head: true },
    { t: '1. The Participant, Inmate 739 (hereafter "the Contestant"), surrenders custody of her person to the DPE for the duration of the Program.' },
    { t: '2. This agreement is EXECUTORY in nature and binds the Contestant from the moment of signature.', term: 'EXECUTORY', def: 'Executory: not yet fully performed. My side of the bargain is all still to come.' },
    { t: '3. Failure to succeed permits the DPE any action it deems fit, including, but not limited to, permanent termination of life.' },
    { t: '(margin, 4pt) §12a. The victor shall receive a full pardon, a wiped slate and a cash award of $5,000,000.', hidden: 'prize', note: 'FIRST PLACE: freedom AND $5,000,000.' },
    { t: '4. The Contestant waives all right to appeal, clemency or trial DE NOVO.', term: 'DE NOVO', def: 'De novo: "from the new". A fresh trial. I just signed away ever getting one.' },
    { t: '5. The Contestant consents to be recorded, broadcast and rebroadcast IN PERPETUITY.', term: 'IN PERPETUITY', def: 'In perpetuity: forever. My worst day, on a loop, for good.' },
    { t: '6. The Contestant shall INDEMNIFY the DPE against any injury, death or emotional distress arising from the Program.', term: 'INDEMNIFY', def: 'Indemnify: I pay for anything that happens to me. Even dying.' },
    { t: '7. Implanted monitoring devices remain the property of the State. Tampering constitutes a fresh capital offence.' },
    { t: '8. The DPE\'s obligations are suspended in any event of FORCE MAJEURE, including civil unrest and audience preference.', term: 'FORCE MAJEURE', def: 'Force majeure: acts of God. Here, apparently, the audience counts as God.' },
    { t: '(footnote, 4pt) §12b. Second place: sentence commuted to life imprisonment without parole.', hidden: 'second', note: 'SECOND PLACE: life without parole.' },
    { t: '9. The Contestant affirms she has read and understood every word of this agreement.' },
    { t: 'SIGNATURE: ______________________  (Inmate 739)', sign: true }
  ];
  var contract = {
    autoSolve: function () { return { success: true, found: 2, defs: 5, signed: true }; },
    start: function (ctx) {
      var R = ctx.R, P = ctx.PAL;
      var sel = 1, scroll = 0, found = {}, defs = {}, panel = null, warned = false;
      var PX = 10, PY = 28, PW = 236, PH = 168, TX = PX + 16, TW = PW - 26;
      var SX = 252, SW = 122;
      function nFound() { return Object.keys(found).length; }
      function entryStyle(e) {
        if (e.hidden && !found[e.hidden]) return { size: 3.5, lh: 5, color: '#8a8070', alpha: 0.55, style: '' };
        if (e.hidden) return { size: 7, lh: 9, color: '#a8461c', alpha: 1, style: 'bold' };
        if (e.head) return { size: 7, lh: 9, color: '#2a2420', alpha: 1, style: 'bold' };
        if (e.sign) return { size: 8, lh: 10, color: '#2a2420', alpha: 1, style: 'bold' };
        return { size: 7, lh: 9, color: '#2a2420', alpha: 1, style: '' };
      }
      function layout() {
        var y = 0;
        return CONTRACT.map(function (e) {
          var st = entryStyle(e);
          var lines = R.wrap(e.t, TW, st.size, 'serif', st.style);
          var h = lines.length * st.lh + 5;
          var it = { e: e, st: st, lines: lines, y: y, h: h };
          y += h;
          return it;
        });
      }
      return new Promise(function (resolve) {
        ctx.loop(function () {
          var I = ctx.input;
          if (I.repeat('down')) { sel = Math.min(CONTRACT.length - 1, sel + 1); ctx.sound('blip'); panel = null; }
          if (I.repeat('up')) { sel = Math.max(0, sel - 1); ctx.sound('blip'); panel = null; }
          if (I.pressed('ok')) {
            I.consume('ok');
            var e = CONTRACT[sel];
            if (e.term) { defs[e.term] = true; panel = { title: e.term, text: e.def, c: P.teal }; ctx.sound('select'); }
            else if (e.hidden) {
              if (!found[e.hidden]) { found[e.hidden] = true; ctx.sound('reveal'); panel = { title: 'SQUINT', text: 'Printed in the margin, small enough to miss. ' + e.note, c: P.amber }; }
              else panel = { title: 'NOTED', text: e.note, c: P.amber };
            } else if (e.sign) {
              if (nFound() < 2 && !warned) { warned = true; panel = { title: 'SIGN?', text: 'Have I really read every word? [E] again to sign anyway.', c: P.red }; ctx.sound('cancel'); }
              else { ctx.sound('confirm'); resolve({ success: nFound() >= 2, found: nFound(), defs: Object.keys(defs).length, signed: true }); }
            } else { panel = { title: 'CLAUSE ' + sel, text: 'Plain enough. Plain and ugly.', c: P.dim }; }
          }
        }, function (t) {
          R.rect(0, 0, ctx.W, ctx.H, '#121016');
          var L = layout();
          var cur = L[sel];
          if (cur.y - scroll < 6) scroll = Math.max(0, cur.y - 6);
          if (cur.y + cur.h - scroll > PH - 8) scroll = cur.y + cur.h - PH + 8;
          // paper
          R.rect(PX + 3, PY + 3, PW, PH, '#000', 0.5);
          R.rect(PX, PY, PW, PH, P.paper);
          var g = R.ctx;
          g.save(); g.beginPath(); g.rect(PX, PY + 2, PW, PH - 4); g.clip();
          L.forEach(function (it, i) {
            var y0 = PY + 6 + it.y - scroll;
            if (y0 > PY + PH || y0 + it.h < PY) return;
            if (i === sel) { R.rect(PX + 4, y0 - 2, PW - 8, it.h, P.amber, 0.22); R.text('▶', PX + 6, y0, { size: 7, color: '#7a3a1a', shadow: false }); }
            if (it.e.hidden && !found[it.e.hidden]) {
              // specks of print: unreadable until Luna squints
              var rr = 0;
              for (var sx = TX; sx < TX + TW - 20; sx += 3) { rr = (rr * 31 + sx) % 7; R.rect(sx, y0 + 1 + (rr % 2), rr > 1 ? 2 : 1, 1, '#8a7a60', 0.6); }
              return;
            }
            it.lines.forEach(function (ln, k) {
              var ly = y0 + k * it.st.lh;
              R.text(ln, TX, ly, { size: it.st.size, font: 'serif', style: it.st.style, color: it.st.color, alpha: it.st.alpha, shadow: false });
              if (it.e.term) {
                var ix = ln.indexOf(it.e.term);
                if (ix >= 0) {
                  var x0 = R.measure(ln.slice(0, ix), it.st.size, 'serif', it.st.style), w = R.measure(it.e.term, it.st.size, 'serif', it.st.style);
                  R.rect(TX + x0, ly + it.st.size + 1, w, 1, defs[it.e.term] ? P.teal : '#4a6aa8');
                }
              }
            });
          });
          g.restore();
          // scrollbar
          var total = L[L.length - 1].y + L[L.length - 1].h;
          var bh = Math.max(16, PH * Math.min(1, PH / total));
          R.rect(PX + PW - 5, PY + 2 + (PH - 4 - bh) * Math.min(1, scroll / Math.max(1, total - PH + 12)), 3, bh, '#8a7a5a');
          // side panel
          R.panel(SX, PY, SW, PH, { accent: P.red });
          R.text('THE CONTRACT', SX + 8, PY + 6, { size: 8, color: '#fff' });
          R.text('Small text fills every', SX + 8, PY + 20, { size: 7, color: P.dim, style: '' });
          R.text('inch of the margins.', SX + 8, PY + 29, { size: 7, color: P.dim, style: '' });
          R.text('Terms checked: ' + Object.keys(defs).length + '/5', SX + 8, PY + 44, { size: 7, color: P.teal });
          var ny = PY + 56;
          Object.keys(found).forEach(function (k) { var e = CONTRACT.filter(function (x) { return x.hidden === k; })[0]; R.wrap(e.note, SW - 16, 7).forEach(function (l) { R.text(l, SX + 8, ny, { size: 7, color: P.amber }); ny += 9; }); ny += 2; });
          var cs = CONTRACT[sel];
          var tip = panel || (cs.hidden && !found[cs.hidden] ? { title: '...', text: 'Specks of print in the margin, too small to read. [E] Squint.', c: P.amber }
            : cs.term && !defs[cs.term] ? { title: cs.term, text: '[E] What does that even mean?', c: P.teal }
            : cs.sign ? { title: 'SIGN', text: '[E] Sign with the marker.', c: '#fff' } : null);
          if (tip) {
            var lines = R.wrap(tip.text, SW - 16, 7, 'sans', '');
            var ty = PY + PH - 14 - lines.length * 9;
            R.rect(SX + 4, ty - 14, SW - 8, lines.length * 9 + 22, '#000', 0.45);
            R.text(tip.title, SX + 8, ty - 11, { size: 7, color: tip.c });
            lines.forEach(function (l, i) { R.text(l, SX + 8, ty + i * 9, { size: 7, font: 'sans', style: '', color: '#e8e4d8' }); });
          }
          ctx.header('FINE PRINT', 'Trader is watching you read');
          ctx.footer('↑↓ read   ·   E  inspect / squint   ·   sign at the bottom');
          void t;
        });
      });
    }
  };

  /* ---------------------------------------------------------------------
   * Helpers
   * ------------------------------------------------------------------- */
  // (constraint: W.autoReach stands the player BELOW a target first, so autoplay
  // interacting with the food flap on the bars puts Luna in the corridor. Put her back.)
  function backInCell(api) { api.teleport([10, 3], 'down'); }

  async function guardComes(api, id, spec) {
    api.addNpc({ id: id, at: [23, 6], spec: spec, facing: 'left' });
    await api.move(id, [10, 5], { speed: 50 });
    api.face(id, 'up');
  }
  async function guardLeaves(api, id) {
    await api.move(id, [23, 6], { speed: 55 });
    api.remove(id);
  }

  /* ---------------------------------------------------------------------
   * REGISTRATION
   * ------------------------------------------------------------------- */
  G.registerChapter({
    id: 'ch02',
    title: 'Prisoner 739',
    kicker: 'OCTOBER 2083',
    tiles: tiles,
    props: props,
    minigames: { breath: breath, contract: contract },
    maps: {
      whiteroom: whiteRoom,
      cblock: cblock,
      columbus: columbus,
      closet: (G.shared && G.shared.has && G.shared.has('columbus_closet')) ? G.shared.map('columbus_closet', {}) : closetLocal,
      alley: alley,
      visit: visit,
      infirm: infirm,
      interview: interview
    },
    cast: {
      luna_gown_hurt: { extends: 'luna_gown', accessory: 'bandage' },
      luna_prison_hurt: { extends: 'luna_prison', accessory: ['number', 'bandage'] },
      luna_twelve: { extends: 'luna_child_columbus', height: 'short', voice: 640 },
      neighbour: { name: 'Neighbour', skin: '#7a4a30', hair: '#1a1410', hairStyle: 'afro', outfit: '#d9692b', outfit2: '#d9692b', style: 'jumpsuit', accessory: 'number', build: 'broad', voice: 300 },
      inmate_a: { extends: 'inmate', skin: '#e0b898', hair: '#6a4a2a', hairStyle: 'long' },
      inmate_b: { extends: 'inmate', skin: '#a06a48', hair: '#1a1a1a', hairStyle: 'bun' },
      inmate_c: { extends: 'inmate', skin: '#d8a888', hair: '#c8c0b0', hairStyle: 'bob' },
      guard_f: { extends: 'guard', name: 'Guard', hairStyle: 'bun', skin: '#e0b898', voice: 420 },
      guard_kind: { extends: 'guard', name: 'Guard', skin: '#8a5a3a', hair: '#3a3a3a', accessory: ['badge'], voice: 240 },
      guard_morning: { extends: 'guard', name: 'Guard', skin: '#e8c0a0', hair: '#5a3a1a', hairStyle: 'short', voice: 260 },
      lawyer: { name: 'Lawyer', skin: '#e8c8a8', hair: '#8a7a6a', hairStyle: 'short', outfit: '#4a4a52', outfit2: '#3a3a40', style: 'suit', accessory: ['tie', 'glasses'], voice: 320 },
      felton: { name: 'Felton', skin: '#e0b090', hair: '#3a2a1a', hairStyle: 'buzz', outfit: '#8a8a8a', outfit2: '#5a5a62', style: 'casual', height: 'normal', build: 'broad', voice: 360 },
      kid_a: { extends: 'kid', name: 'Kid', height: 'short', skin: '#e8c8a8', hair: '#6a3a1a', hairStyle: 'short' },
      kid_b: { extends: 'kid', name: 'Kid', height: 'short' },
      staff: { name: 'Staff', skin: '#d8b090', hair: '#3a3a3a', hairStyle: 'bun', outfit: '#5a6a5a', outfit2: '#3a3a3a', style: 'uniform', voice: 380 },
      anchor: { name: 'EEN Anchor', skin: '#f0d0b0', hair: '#e8d070', hairStyle: 'bob', outfit: '#c83a4a', outfit2: '#1a1a20', style: 'suit', accessory: 'earrings', voice: 520 }
    },
    testDefaults: { m_audience: 40, m_waverly: 60 },

    start: async function (api) {
      FX.dread = 0; FX.dreadTarget = 0;

      /* ================= 1. THE WHITE ROOM ================= */
      api.setPlayer('luna_gown');
      await api.goRoom('whiteroom', { at: [3, 3], facing: 'down', fade: false });
      await api.slides([
        { style: 'black', text: 'Voices swam around me.' },
        { style: 'black', text: '"Two liters of AB, stat."   "Stable."   "The child will need to be moved."' },
        { style: 'black', text: '"Mom! Mommy, come back! Please, I need you!"' }
      ]);
      api.flash('#ffffff', 600);
      await api.say('luna_gown', 'Waverly!', { mood: 'shock' });
      await api.narrate('Disorientation. The feeling of waking up somewhere so unfamiliar that it takes a moment to realize you\'re not still dreaming.');
      await api.narrate('An endless void of white so stark my head throbbed.');

      api.objective('Get out', { target: 'wr_door' });
      await api.waitForInteract('wr_door');
      api.objective(null);
      await api.narrate('My fingers fumbled at the handle. No luck. I yanked harder. Nothing. Not even a rattle.');
      await api.say('luna_gown', 'Hey! Let me out of here.', { mood: 'angry' });
      await api.narrate('My voice ricocheted off the blank walls, swallowed by silence.');
      await api.think('Something snapped. Not in the room but in me. Because I was here and she wasn\'t and that meant someone had taken her. My Waverly.');
      await api.minigame('qte', { mode: 'mash', target: 34, time: 6, decay: 6, title: 'POUND ON THE DOOR', prompt: 'Hit it over and over until your knuckles split.' });
      // Scripted either way: the knuckles split.
      api.shake(500, 3); api.sound('hit');
      api.setPlayer('ch02:luna_gown_hurt');
      api.set('ch02_knucklesSplit', true);
      await api.narrate('I pounded and I screamed and I kicked and I shouted. My knuckles split, and even then I didn\'t stop.');
      await api.narrate('No one came. My strength bled out. I sagged to the floor.');
      await api.fadeOut(900);
      await api.wait(500);

      // Dr. Jan. Stonewalling loops "a day later" until Luna confesses (capped).
      api.addNpc({ id: 'jan', at: [3, 5], spec: 'dr_jan', facing: 'up' });
      api.teleport([3, 3], 'down');
      await api.fadeIn(900);
      await api.narrate('The next time I opened my eyes, I wasn\'t alone. A man stood over me, notebook in hand, wire-rimmed glasses balanced on the edge of his nose. A professor\'s face: composed, clinical, slightly detached.');
      await api.say('dr_jan', 'Good morning. I\'m Dr. Jan. Psychiatrist for this institution.');
      await api.say('luna_gown', 'My daughter. Where is she?', { mood: 'fear' });
      await api.say('dr_jan', ['She\'s somewhere safe.', 'Don\'t concern yourself with that for now.']);
      await api.say('luna_gown', 'Don\'t concern myself? You don\'t have kids, do you?', { mood: 'angry' });
      await api.say('dr_jan', 'Do you understand the severity of your current situation?');
      await api.say('luna_gown', 'The situation? My child is missing. Taken by you people, I assume. And you want to know if I understand the situation?', { mood: 'angry' });
      await api.say('dr_jan', ['Miss Bartley. The enforcers have found more than enough evidence to charge you with the murder of an innocent baby.', 'You\'re in deep trouble, and if you want to see your daughter again, I suggest you show me some respect.']);
      await api.narrate('I sank to the floor and wrapped my arms around my knees.');
      await api.say('luna_gown', 'What do you want from me?', { mood: 'sad' });
      await api.say('dr_jan', 'The truth. What were you doing last night, and why?');

      var stonewalls = 0;
      for (;;) {
        var c = await api.choice([
          { text: 'Tell him everything.' },
          { text: '"I want a lawyer. And my daughter."', if: function () { return stonewalls < 2; } }
        ]);
        if (c === 0) break;
        stonewalls++;
        await api.say('dr_jan', 'Then we\'ll try again tomorrow, Miss Bartley. The door isn\'t going anywhere. Neither are you.');
        await api.move('jan', [3, 6]);
        api.hide('jan');
        await api.fadeOut(700);
        await api.slides([{ style: 'black', text: stonewalls === 1 ? 'A day later. Nobody brought news. Nobody brought her.' : 'Another day. The lights never go off. I have started to count the buzz.' }]);
        api.show('jan'); api.placeNpc('jan', [3, 5], 'up');
        await api.fadeIn(700);
        await api.say('dr_jan', 'Good morning, Miss Bartley. Shall we try again? What were you doing that night, and why?');
      }
      api.set('ch02_stonewalls', stonewalls);
      await api.say('luna_gown', 'I don\'t know where to even start.', { mood: 'tired' });
      await api.say('dr_jan', 'At the beginning, please.');
      await api.slides([
        { style: 'montage', title: 'The truth', text: 'So I told him. Growing up in the group home, never knowing where my next meal would come from. The true believers taking my own mother away.' },
        { style: 'montage', title: 'The truth', text: 'All those mornings, opening the fridge and knowing there was nothing I could do to make it magically full. Watching my daughter become hollow no matter how many meals I chose to forgo.' },
        { style: 'montage', title: 'The truth', text: 'The one time I did get a job, only to find the boss was interested in something far less appropriate than my work ethic. When everything is for your child, refusing power doesn\'t put food on the table.' }
      ]);
      await api.say('dr_jan', 'And the procedure. Where was it performed? Who performed it?');
      await api.think('The cat mask. "If I were a True Believer, I\'d be killed for that." The ladder. Dr. Fienle\'s crumbs.');
      await api.choice([{ text: '(Tell him about the alley, the hatch, the tunnels, the clinic.)', set: { ch02_namedClinic: true } }]);
      await api.narrate('I did so without hesitation. With every word that slithered from my tongue, I pictured the true believers inching closer to the cave.');
      await api.think('I knew it was all for Waverly\'s sake. Still, the words left a sour taste in my mouth.');
      await api.say('dr_jan', ['That was very enlightening. I\'ll do what I can, but you\'ve committed a serious crime.', 'I hope you can find peace. Wherever you may end up.']);
      await api.move('jan', [3, 6]);
      api.remove('jan');
      await api.think('I had a feeling that would be the last time I\'d ever see Doctor Jan.');
      await api.fadeOut(900);

      /* ================= 2. MONTAGE ================= */
      await api.slides([
        { style: 'montage', title: 'November', text: 'The next few weeks blended together in a fog of interviews and evaluations. "Where is my daughter?" "Where am I?" "For fuck\'s sake, where is Waverly?" No one bothered to answer.' },
        { style: 'montage', title: 'The lawyer', text: 'He told me they were pushing for the death penalty. Would I mind going over my childhood traumas one more time? I stared at him, empty. Life in prison? Even execution sounded like mercy compared to that.' },
        { style: 'montage', title: 'Clemency', text: 'Denied. I was to be transferred to prison posthaste and await my execution. It didn\'t matter. Nothing mattered anymore. Not without her.' },
        { style: 'montage', title: 'C block', text: 'Duly processed and deposited into a private cell. A privilege reserved only for those on death row. Wouldn\'t want to risk someone doing the state\'s job for them.' }
      ]);

      /* ================= 3. DEATH ROW: THREE DAYS ================= */
      api.setPlayer('ch02:luna_prison_hurt');
      await api.goRoom('cblock', { at: [10, 2], facing: 'down', fade: false });
      await api.fadeIn(800);
      await api.titleCard('C Block', 'Death Row · Cell 3', 2200);
      await api.narrate('They say a person\'s room is the window to their soul. If my cell counts as my room, then all I can say is that my soul is cold and empty.');
      await api.narrate('A cold stone floor. A threadbare cot. A lidless toilet. Fresh meat, nice and tender, marched straight to the execution block.');
      await api.think('The only thing that cuts through the fog is Waverly.');

      // Day 1: an android.
      api.objective('Call through the food flap', { target: 'flap' });
      await api.waitForInteract('flap');
      backInCell(api);
      api.objective(null);
      await guardComes(api, 'g1', 'guard_android');
      await api.say('luna_prison', ['Please, just tell me where she is...', 'That\'s all I want. I swear, I\'ll do anything if you can just tell me where.'], { mood: 'cry' });
      await api.say('guard_android', 'INMATE 739. THAT INFORMATION IS RESTRICTED. STEP BACK FROM THE FLAP.');
      await api.choice(['(Step back.)', '"Then find someone who isn\'t restricted!"']);
      await api.think('At one point, my pride would have stopped me from begging. But those days were long gone.');
      await guardLeaves(api, 'g1');
      api.objective('Lie down on the cot', { target: 'cot' });
      await api.waitForInteract('cot');
      api.objective(null);
      await api.fadeOut(800);
      await api.slides([{ style: 'black', text: 'Every thought, every memory, burned like peeling off my nails inch by inch. She was my reason for life and my reason for death.' }]);
      api.teleport([10, 2], 'down');
      api.addObject({ id: 'tray', at: [11, 2], prop: 'tray', solid: false });
      await api.fadeIn(800);

      // Day 2: a human guard, and the shouting.
      await api.narrate('Day two. A tray has come through the flap while I slept.');
      api.objective('Ask again', { target: 'flap' });
      api.onInteract('tray', async function (api2) {
        if (api2.get('ch02_trayDone')) { await api2.narrate('An empty tray.'); return; }
        var t = await api2.choice(['(Eat.)', '(Leave it.)'], { prompt: 'Grey paste. A slice of something.' });
        api2.set('ch02_trayDone', true);
        await api2.think(t === 0 ? 'Eat. She needs me alive to keep asking.' : 'I push it away. They\'re drugging it. Or they will be.');
      });
      api.onInteract('nwall', [{ think: 'She\'s singing on the other side of the wall. Something about a train. I don\'t know the words.' }]);
      await api.waitForInteract('flap');
      backInCell(api);
      api.objective(null);
      await guardComes(api, 'g2', 'ch02:guard_f');
      await api.say('luna_prison', 'Where is my daughter? Waverly Bartley. Eleven years old. Brown curls. Please.', { mood: 'cry' });
      await api.say('ch02:guard_f', 'You know I can\'t tell you that. Eat your tray.');
      await guardLeaves(api, 'g2');
      var shout = await api.choice(['(Shout it down the block.)', '(Sit on the floor.)']);
      if (shout === 0) {
        api.shake(300, 2);
        await api.say('luna_prison', 'Where is she? Where\'s Waverly!', { mood: 'angry' });
        await api.say('inmate1', 'Shut UP, 739! Some of us are trying to die in peace!');
        await api.think('I became a single-note woman. The kind I used to despise, with only one thing on her mind.');
      } else {
        await api.think('Asking anyone who would listen and anyone who would not. The novelty of my talking diminished when they realized I only had one thing to say.');
      }
      api.objective('Lie down on the cot', { target: 'cot' });
      await api.waitForInteract('cot');
      api.objective(null);
      await api.fadeOut(800);
      api.remove('tray');
      await api.slides([{ style: 'black', text: 'A few days later.' }]);
      api.teleport([10, 2], 'down');
      await api.fadeIn(800);

      // Day 3: the kind guard.
      api.objective('Call through the food flap', { target: 'flap' });
      await api.waitForInteract('flap');
      backInCell(api);
      api.objective(null);
      await guardComes(api, 'g3', 'ch02:guard_kind');
      await api.say('luna_prison', 'Where is she?', { mood: 'tired' });
      await api.narrate('A man of few words. I think he felt sorry for us.');
      await api.say('ch02:guard_kind', 'Sit down. I\'ll answer the questions you\'ve been slinging around like stones.');
      await api.movePlayer([10, 2]);
      api.face('player', 'down');
      await api.narrate('I obeyed, knees knocking together. His mournful expression warned me this wouldn\'t be pleasant.');
      await api.say('ch02:guard_kind', 'Your daughter is safe. She\'s been placed into public accommodations for children.');
      await api.say('luna_prison', 'Which one?', { mood: 'fear' });
      await api.think('Two words. Eight letters. One question. Such a small sum couldn\'t possibly contain anything of importance. And yet, the answer meant everything.');
      await api.say('ch02:guard_kind', ['All local places were full, so they had to send her further out. Let me see if I can remember the name.', 'That\'s right. It\'s called the Curmumbus House.']);
      api.sound('sting');
      await api.say('luna_prison', 'You mean the Columbus House?', { mood: 'shock' });
      await api.say('ch02:guard_kind', 'That\'s the one.');
      api.ambient('tension');
      await api.narrate('His mouth kept moving, but I couldn\'t hear him over the high-pitched ringing in my ears.');
      await api.think('Waverly in the house that taught me to never trust another soul? My sweet, loving Waverly in the place where softness led to suffering and kindness bred cruelty?');
      api.sound('heartbeat');
      api.flash('#801010', 500);
      await api.shake(700, 4);
      api.set('ch02_learnedColumbus', true);

      /* ================= 4a. PANIC: COLUMBUS AT TWELVE ================= */
      api.setPlayer('ch02:luna_twelve');
      await api.goRoom('columbus', { at: [2, 3], facing: 'right', fade: true });
      await api.lowerThird('COLUMBUS HOUSE', 'Luna, age 12', 3000);
      await api.narrate('Me, at twelve. A tray in my hands. The older kids at the end of the hall, waiting.');
      api.objective('Walk past them', { target: 'rationsline' });
      await api.waitForZone('rationsline');
      api.objective(null);
      api.lockPlayer();
      await api.say('ch02:felton', 'Rations, True Believer. Half. Same as always.', { mood: 'smug' });
      await api.say('ch02:kid_a', 'True believer! True believer!');
      await api.say('ch02:kid_b', 'True believer! True believer!');
      var beg = await api.choice(['(Get on your knees and beg.)', '(Refuse.)']);
      if (beg === 1) {
        await api.say('ch02:luna_twelve', 'No. It\'s mine.', { mood: 'angry' });
        await api.move('felton', [6, 3]);
        api.sound('hit'); await api.shake(400, 3);
        await api.narrate('The tray hits the floor before I do.');
      }
      await api.say('ch02:luna_twelve', 'Please. Just half. Please.', { mood: 'cry' });
      await api.narrate('Me, at twelve, on my knees in front of the older kids, forced to beg for half my rations.');
      api.unlockPlayer();
      api.flash('#ffffff', 300);
      await api.think('Waverly, stuck in one of those baggy, sweat-stained uniforms, tears streaking down her face.');

      /* ================= 4b. PANIC: THE CLOSET AT EIGHT ================= */
      api.remove('felton'); api.remove('kidA'); api.remove('kidB');
      api.setPlayer('luna_child_columbus');
      api.teleport([9, 4], 'right');
      api.addNpc({ id: 'staff', at: [10, 4], spec: 'ch02:staff', facing: 'left' });
      await api.lowerThird('COLUMBUS HOUSE', 'Luna, age 8', 3000);
      await api.say('luna_child_columbus', 'I want my mom. They took my mom. Please, I want to call her.', { mood: 'cry' });
      await api.say('ch02:staff', ['Your mother isn\'t taking calls. You\'re a ward of the state now.', 'Toughen up.'], { mood: 'angry' });
      await api.narrate('Pleading with one of the few adults in charge. Never receiving help. Being told to toughen up.');
      await api.fadeOut(500, '#000');
      await api.goRoom('closet', { fade: false });
      api.remove('staff');
      await api.fadeIn(500);
      api.sound('door');
      await api.narrate('The closet under the main stair. It smells of urine. The door locks from the outside.');
      await api.think('Mom said seven seconds. Seven seconds to get past the first thing you feel.');
      var count = await api.choice(['(Count to seven.)', '(Pound on the door.)']);
      if (count === 1) { api.sound('hit'); await api.shake(300, 2); await api.narrate('Nobody comes. So I count.'); }
      await api.slides([{ style: 'black', text: 'One. Two. Three. Four. Five. Six. Seven.' }]);
      await api.think('Waverly, growing hard. Joining a gang. Ending up in the exact position I\'m in now.');
      await api.think('No. Not Columbus. Not that. Think of her. Think of the day she came.');

      /* ================= 4c. THE BIRTH (2073) ================= */
      await api.fadeOut(800, '#000');
      api.setPlayer('luna_young');
      await api.goRoom('alley', { at: [7, 5], facing: 'up', fade: false });
      await api.slides([
        { style: 'black', title: '2073', text: 'I gave birth to my daughter alone in an alley behind a diner, littered with broken glass and old burger wrappers.' },
        { style: 'black', text: 'It wasn\'t the place I\'d have chosen. But my landlord had thrown my stuff to the curb the week before, and no hospital would admit a new mother without insurance.' }
      ]);
      await api.fadeIn(900);
      await api.lowerThird('THE ALLEY', 'Luna, age 21', 3000);
      api.sound('heartbeat');
      await api.shake(500, 2);
      await api.think('Another one. Breathe. The back door is right there. If anyone comes out for a smoke...');
      api.objective('Get out of sight behind the dumpsters', { target: 'hide' });
      await api.waitForZone('hide');
      api.objective(null);
      api.lockPlayer();
      api.face('player', 'left');
      api.addNpc({ id: 'waiter', at: [4, 2], spec: 'waiter', facing: 'down' });
      api.sound('door');
      await api.move('waiter', [6, 2]);
      api.face('waiter', 'down');
      await api.narrate('A waiter almost caught me during his break. He whistled as he lit a cigarette.');
      await api.emote('waiter', '…', 900);
      var quiet = await api.minigame('qte', { mode: 'timing', rounds: 3, need: 2, speed: 0.8, zone: 0.2, title: 'BITE DOWN', prompt: 'Bite down on your arm. Hold back the scream with each contraction.' });
      if (!quiet.success) {
        api.face('waiter', 'right');
        await api.emote('waiter', '?', 900);
        await api.say('waiter', 'Somebody back there?');
        await api.wait(600);
        await api.say('waiter', 'Rats the size of dogs back here, I swear.');
      } else {
        await api.narrate('My pregnant belly heaved in sync with each puff of smoke.');
      }
      await api.move('waiter', [4, 2]);
      api.sound('door');
      api.remove('waiter');
      api.unlockPlayer();
      await api.fadeOut(1000);
      await api.slides([
        { style: 'black', text: 'But I was lucky. Long past the dinner rush, I remained in that trash-covered alley, convulsing with each contraction.' },
        { style: 'black', text: 'She emerged pale and beautiful. The smallest creature I\'d ever seen.' }
      ]);
      api.addObject({ id: 'baby', at: [13, 5], prop: 'baby', solid: false });
      api.teleport([14, 5], 'left');
      await api.fadeIn(900);
      await api.narrate('My body ached from head to toe and I couldn\'t stop trembling.');
      api.objective('Get the garden shears from your bag', { target: 'al_bag' });
      await api.waitForInteract('al_bag');
      api.objective(null);
      await api.narrate('The garden shears I used to cut the cord felt like they weighed fifty pounds.');
      api.teleport([14, 5], 'left');
      await api.minigame('qte', { mode: 'mash', target: 24, time: 7, decay: 5, title: 'CUT THE CORD', prompt: 'Sweat and blood blended into a pink soup.' });
      await api.narrate('Then, a terrible realization.');
      api.ambient(null);
      await api.wait(500);
      await api.think('She was too quiet.');
      await api.narrate('I hauled her up. The trash-filled bags that once acted as my pillows became obstacles. But I gritted my teeth and brought her head to my ear.');
      await api.think('My baby wasn\'t breathing.');
      var br = await api.minigame('ch02:breath', {});
      api.set('ch02_heldHer', !!br.held);
      api.remove('baby');
      api.addObject({ id: 'baby2', at: [13, 5], prop: 'baby', solid: false, pink: true });
      api.ambient('static');
      await api.narrate('The way her cheeks flushed pink as she screamed herself into the world. The way the ground swooned underneath me as the start of her breath marked the return of my own.');
      await api.narrate('I tucked her into my shirt and held her against my skin. She felt warm.');
      await api.say('luna_young', ['Waverly.', 'Waverly. I\'m here for you.'], { mood: 'cry' });
      await api.narrate('Her name passed through my lips like leaves fluttering in the wind.');
      await api.fadeOut(1500, '#ffffff');

      /* ================= 5. BACK IN THE CELL / THE NEIGHBOUR ================= */
      api.setPlayer('ch02:luna_prison_hurt');
      await api.goRoom('cblock', { at: [10, 2], facing: 'down', fade: false });
      await api.slides([
        { style: 'black', text: 'I choked. They worked together to restrain me as I became a rabid racoon, clawing and screaming and biting at everything within eyesight.' },
        { style: 'black', text: 'The doctor jabbed a needle into my thigh. And then, for the first time since I\'d left home, everything turned silent.' },
        { style: 'montage', title: 'December', text: 'I floated through my last few days in a haze. I suspected they were drugging my food to keep me docile, but I didn\'t care. I was going to lose her and she me.' }
      ]);
      api.ambient('drone');
      await api.fadeIn(1000);
      api.face('neighbour', 'left');
      await api.say('ch02:neighbour', ['You gotta toughen up, girl.', 'What would Waverly think if she could see you now? That little baby of yours is gonna grow up one day and when she does, she might go looking for answers.', 'What do you want her to find out when she does?']);
      await api.think('Her words hit hard. She was right.');
      api.onInteract('nwall', null);
      api.objective('Talk to your neighbour through the wall', { target: 'nwall' });
      await api.waitForInteract('nwall');
      api.objective(null);
      await api.say('luna_prison', 'Hey. Cell four. You still there?');
      await api.say('ch02:neighbour', 'Where else would I be, baby? They\'re not letting me out for good behaviour.');
      var nb = await api.choice(['"Thank you. For snapping me out of it."', '"How long have you got?"', '"Why do you care?"']);
      if (nb === 0) await api.say('ch02:neighbour', 'Don\'t thank me. Brush that hair. You look like something they fished out of a drain.');
      else if (nb === 1) await api.say('ch02:neighbour', 'Long enough to listen to you cry every night. Short enough I\'d rather you didn\'t.');
      else await api.say('ch02:neighbour', 'Because somebody did it for me once. Now hush. Guard\'s coming.');
      await api.narrate('I ran my fingers through my filthy hair. I began to engage with those around me, just a little at first. Nothing too close, of course. We all knew how the story would end.');

      // The lawyer, the date, the application.
      await guardComes(api, 'lawyer', 'ch02:lawyer');
      await api.say('ch02:lawyer', 'They\'ve given me a date, Miss Bartley. It\'s soon. Five days.');
      await api.think('Five days. I\'d run out of time. But I wasn\'t completely out of chances.');
      await api.think('The screens outside. The ones that blasted sick entertainment to the masses. Most people would rather die than feature on an EEN show. Myself included. Especially after what happened to my mother.');
      await api.choice([{ text: '"Put in an application. For one of the EEN shows."', set: { ch02_appliedEEN: true } }]);
      await api.say('ch02:lawyer', 'It\'s not likely to process before your execution date. You understand that.');
      await api.say('luna_prison', 'A chance. That\'s all I want.', { mood: 'tired' });
      await api.say('ch02:lawyer', 'Fine. I\'ll submit the forms. But it\'s wasted time.');
      await guardLeaves(api, 'lawyer');
      await api.think('I love you, Waverly. No matter where you are. No matter what you do. I\'ll always love you, even if I\'m not here anymore.');
      await api.fadeOut(1000);

      /* ================= 6. EXECUTION MORNING ================= */
      await api.titleCard('Saturday, 6 January 2084', 'Execution day', 2600, { kicker: 'PRISONER 739' });
      api.teleport([10, 2], 'up');
      await api.fadeIn(900);
      await api.narrate('Silence is rare here in C block. But for me, mornings are a haven. The only time I can be alone with my thoughts.');
      await api.think('Baby Waverly taking her first steps, her chubby legs trembling from effort. Years later, Waverly snuggled against me, her head floating atop my chest. All the times she drove me crazy and all the times she kept me sane.');
      await guardComes(api, 'g4', 'ch02:guard_morning');
      await api.say('ch02:guard_morning', 'Congratulations. You\'ve got a visitor. Must be someone pretty special to pull off a meeting this early.', { mood: 'smug' });
      await api.say('luna_prison', 'You\'ve got the wrong cell. I never get visitors.');
      await api.say('ch02:guard_morning', 'You do today. Wrists.');
      var wrists = await api.choice(['(Stick your arms through the bars.)', '(Make him wait.)']);
      if (wrists === 1) {
        await api.narrate('I wait just long enough to make him tense up. His fingers find his taser.');
        await api.think('Today\'s the big day, and dancing the electric tango is not on my bucket list.');
      }
      api.sound('door');
      await api.narrate('He attaches the cuffs. I pretend that I don\'t hear the lock clicking shut echoing a thousand times over.');
      await api.think('The only person who would want to visit me is Waverly, and there\'s no way Columbus would spare someone to bring her. I know this for certain. But I can\'t help the small bundle of hope rising in my chest.');
      await api.fadeOut(500);
      api.teleport([10, 5], 'left');
      api.placeNpc('g4', [11, 5], 'left');
      await api.fadeIn(500);
      api.objective('Walk to the visitation room', { target: 'to_visit' });
      await api.waitForRoom('visit');
      api.objective(null);

      /* ================= 7. THE VISITATION ROOM ================= */
      api.addNpc({ id: 'g5', at: [8, 8], spec: 'ch02:guard_morning', facing: 'up' });
      await api.narrate('The room is massive enough to hold at least a hundred people. With only the guard and I present, I have the feeling that if I screamed, the room would swallow me whole.');
      api.objective('Sit at the small table at the end of the room', { target: 'sit' });
      await api.waitForZone('sit');
      api.objective(null);
      api.lockPlayer();
      api.face('player', 'right');
      await api.move('g5', [12, 6]);
      api.face('g5', 'up');
      api.sound('door');
      await api.narrate('The guard wordlessly cuffs my legs to the chair but releases my hands.');
      await api.move('g5', [14, 8]);
      api.face('g5', 'left');
      await api.narrate('I stare down at the table, tracing the lines with my eyes until the door creaks open.');

      api.addNpc({ id: 'trader', at: [7, 9], spec: 'trader', facing: 'up' });
      api.sound('door');
      FX.dreadTarget = 0.55;
      api.ambient('tension');
      await api.pan('trader', 700);
      await api.move('trader', [[7, 4], [14, 4], [14, 5]], { speed: 34 });
      api.face('trader', 'left');
      await api.cameraReset(500);
      api.lowerThird('TRADER JOHNSON', 'Department of Punitive Entertainment', 3500);
      await api.narrate('A total stranger. Sandy-blond hair. Eyes like oceans. Teeth too perfect to be his own. A small embroidered penguin grins from his shirt. The Department of Punitive Entertainment\'s signature emblem.');
      await api.think('A slow, creeping anxiety crawled up my spine. My instincts were telling me to get as far away from this man as possible. A difficult task, given that I was attached to a table twice my weight.');
      await api.say('trader', 'Good morning. Miss Luna, I presume?', { mood: 'smug' });
      var open = await api.choice([
        '"The one and only. If you\'re here for an autograph, you\'ll have to get in line behind the executioner."',
        '"Just Luna."',
        '(Say nothing.)'
      ]);
      api.set('ch02_traderOpener', ['sarcastic', 'flat', 'silent'][open]);
      if (open === 0) {
        await api.say('luna_prison', 'He promised me a better rope if I don\'t lower the value by spreading it around.', { mood: 'smug' });
        await api.narrate('He stares at me for a second, probably trying to figure out if I\'m joking. Then he laughs.');
        await api.say('trader', 'They didn\'t tell me you were funny.', { mood: 'happy' });
        api.approval('+5');
      } else if (open === 1) {
        await api.say('trader', 'Well, my dear Luna. How would you like to be famous?', { mood: 'happy' });
      } else {
        await api.say('trader', 'The silent type. Don\'t worry, darling. The cameras will cure you of that.', { mood: 'smug' });
      }
      await api.say('trader', 'My name is Trader Johnson. I know you must be busy, but I\'ve got a proposal that I think you\'ll find very interesting.');
      await api.emote('g5', '…', 700);
      await api.think('DPE personnel love to play games. And the only way out of a DPE standstill is to play along. And win.');
      await api.say('luna_prison', 'My request from last week.');
      await api.say('trader', 'You catch on fast. That\'ll be useful.', { mood: 'smug' });
      await api.say('luna_prison', 'Listen, Mr. Johnson -');
      await api.say('trader', 'Please, call me Trader.');
      await api.say('luna_prison', 'Trader.');
      await api.narrate('His name is a rusted penny pressed against my tongue.');
      await api.say('luna_prison', 'I\'m sorry to disappoint you after coming all this way. But I\'m withdrawing my request. I\'m not interested anymore.');
      await api.narrate('His smile fades. He leans forward, elbows on the table. Too close. I tilt back as far as my cuffs allow.');
      await api.say('trader', 'Tell me. How much time do you have left?');
      await api.say('luna_prison', 'Not even a day. They\'ve got me written in for this afternoon.', { mood: 'tired' });
      await api.say('trader', 'And are you looking forward to it?', { mood: 'smug' });
      await api.say('luna_prison', ['Of course not. But I\'ve watched enough DPE shows to know my chances.', 'I\'ve seen people go in just trying to survive. But by the time the season\'s over...']);
      api.flash('#801010', 250);
      await api.think('My mother. The look on her face as her knife pierced through an unsuspecting back.');
      await api.narrate('Trader blanches and scratches his neck.');
      await api.say('trader', 'Of course. I\'m aware of your, shall we say, personal affiliations with the department. It\'s part of why you were chosen. But the way I see it, you don\'t have much choice.');

      // Questions hub (each asked once; the last option moves on).
      for (;;) {
        var q = await api.choice([
          { text: '"Why me?"', if: '!ch02_askWhy' },
          { text: '"How many of us do you kill a month?"', if: '!ch02_askCount' },
          { text: '"What is the show?"', if: '!ch02_askShow' },
          { text: '(Enough. Let him show his hand.)' }
        ]);
        if (q === 3) break;
        if (q === 0) {
          api.set('ch02_askWhy', true);
          await api.say('trader', 'There were plenty of choices for contestants. You made the list because it was decided that you would bring something to the show that nobody else can.');
          await api.say('luna_prison', 'And just what is that?');
          await api.say('trader', 'You\'ll find out soon enough.', { mood: 'smug' });
        } else if (q === 1) {
          api.set('ch02_askCount', true);
          await api.say('trader', 'At least fifteen people a month, and that\'s just in the state of California. Somewhere like Texas can have numbers as high as one hundred.');
          await api.say('luna_prison', 'Yeah, well. Texas has always been a bastion of progress like that.', { mood: 'smug' });
          await api.narrate('Trader laughs. Like most of what he does, it\'s overdramatic. Even a stupid joke has him slapping his knee.');
          await api.say('trader', 'I have some Texan friends who would string you up for that. And a few more who would compliment you on your good taste.', { mood: 'happy' });
        } else {
          api.set('ch02_askShow', true);
          await api.say('trader', ['It\'s called Right to Life. Punitive and educational, so it\'ll go over well with families.', 'I can\'t give you all the details. Part of the entertainment is seeing your reactions when you hear the rules. No spoilers.'], { mood: 'happy' });
          await api.say('trader', 'Let\'s just say you\'ll be living in a house with the other contestants, and those who can make allies quickly will have the advantage.');
          await api.say('luna_prison', 'I don\'t know if you\'ve noticed, but I\'m not exactly the best at making friends.');
        }
      }

      // The photo.
      await api.narrate('He fishes in his breast pocket and extracts a crumpled photo. Without looking at me, he slides it across the table.');
      await api.say('luna_prison', 'Waverly!', { mood: 'shock' });
      await api.narrate('It was her, but she didn\'t look like the vibrant pre-teen I remembered. Her cheeks had hollowed, her eyes sunken into hopeless rings. I knew that face. I\'d seen it in the mirror.');
      await api.say('trader', 'Your daughter. She\'s in a bad state. Those group homes can be brutal, as I\'m sure you\'re aware.');
      await api.narrate('His whole body is practically glowing. He looks like an angel. He sounds like a demon.');
      await api.say('luna_prison', 'Where did you get this picture?', { mood: 'angry' });
      await api.say('trader', 'Would you like to keep it?');
      var photo = await api.choice(['(Snatch it and hold it to your chest.)', '(Push it back across the table.)']);
      if (photo === 0) {
        api.set('f_kept_photo', true);
        api.set('m_waverly', Math.min(100, (+api.get('m_waverly', 60) || 0) + 5));
        await api.narrate('I snatch the photo and cradle it to my chest.');
      } else {
        api.set('f_kept_photo', false);
        await api.say('luna_prison', 'I don\'t take gifts from men who starve children for leverage.', { mood: 'angry' });
        await api.narrate('He shrugs and leaves it on the table, face up, where I can\'t stop looking at it.');
      }
      await api.say('luna_prison', 'Did you see her?');
      await api.say('trader', 'No. But I\'m receiving regular reports.');
      await api.say('luna_prison', 'Let me see her. Please.', { mood: 'cry' });
      await api.say('trader', ['I\'m afraid I can\'t do that. You\'ve committed a serious crime. It would be irresponsible to allow you anywhere near an innocent child.', 'However, if you were to redeem yourself, that would be a different matter.']);
      await api.say('luna_prison', 'You mean through the show.');
      await api.say('trader', 'Precisely. But you, my friend, are running low on time for this visit. So make a decision. Are you in?', { mood: 'happy' });
      await api.think('I\'ve never been an evil person. But only those who have lived through hell can truly understand the choices one must make to survive. I\'ve stolen. I\'ve beaten and been beaten. I\'ve hurt.');
      await api.think('I wasn\'t an evil person. But I wasn\'t a good one either.');
      await api.say('luna_prison', 'Let me see that contract.');
      await api.say('trader', 'Join us, Luna. Sign this contract and you can live another day. Or you can refuse and die a pointless death. But I doubt poor Waverly will last long on her own.', { mood: 'smug' });

      /* ================= 8. THE CONTRACT ================= */
      var k = await api.minigame('ch02:contract', {});
      api.set('ch02_clausesFound', k.found || 0);
      if (k.success) {
        await api.say('luna_prison', 'This changes things. Why didn\'t you mention the other prizes?');
        await api.say('trader', 'Five million is a lot of money. It\'s important that the victor be worthy of spotting the spoils.', { mood: 'smug' });
        await api.say('luna_prison', 'You were testing me.');
        await api.say('trader', 'And you passed. I had a feeling you would.', { mood: 'happy' });
      } else {
        await api.narrate('Trader reaches over and taps the margin, then the footnote, with one long, callus-free finger.');
        await api.say('trader', ['Five million to the victor. And a little consolation prize for second place.', 'Most don\'t find those.'], { mood: 'smug' });
        await api.think('He watched me miss them. He enjoyed it.');
        api.approval('-5');
      }
      await api.think('With five million in my pocket, nothing would stop Waverly and me from escaping the country. A house on the beach. The one we dreamed about every night before bed.');
      await api.say('luna_prison', 'And this part about second place -');
      await api.say('trader', 'Ah yes. What do you think of our little consolation prize?');
      await api.say('luna_prison', 'I hardly consider life in prison a prize.');
      await api.say('trader', 'They may never see the outside of a cell again, but anything is better than dying, eh?', { mood: 'happy' });
      await api.think('Both paths end with death. Only one increases the time I have left.');
      await api.say('luna_prison', 'I suppose death is death no matter who\'s holding the needle. Got a pen?');
      await api.say('g5', 'No writing utensils aside from non-permanent markers.');
      await api.say('trader', ['I\'m well aware. This is the third prison I\'ve visited today.', 'I just called you over to make sure you witnessed this pivotal moment in history. Stay tuned. This one\'s gonna be a real show stopper.'], { mood: 'happy' });
      await api.narrate('He produces a marker with a flourish worthy of a professional showman. I uncap it. The smell takes me back to Columbus, when sniffing markers was the only way for a kid to get buzzed.');
      api.sound('confirm');
      await api.narrate('I sign my name at the bottom.');
      api.set('ch02_signed', true);
      await api.narrate('Trader\'s eyes light up. The warning bells clang through my head again, louder this time.');
      await api.say('luna_prison', 'I just can\'t wait.', { mood: 'smug' });
      await api.think('Thinking back, I wonder who I was trying to convince. Him or me?');
      await api.say('trader', 'Then welcome to the game, Miss Luna. I can\'t wait to see what you become.', { mood: 'happy' });
      await api.narrate('And he meant it, too. That was the worst part.');
      api.approval(false);
      api.unlockPlayer();
      await api.fadeOut(900);
      FX.dreadTarget = 0; FX.dread = 0;

      /* ================= 9. THE INFIRMARY: THE CHIP ================= */
      await api.goRoom('infirm', { at: [6, 4], facing: 'left', fade: false });
      api.addNpc({ id: 'escort', at: [8, 5], spec: 'guard_android', facing: 'up' });
      await api.fadeIn(700);
      api.objective('Go to the nurse', { target: 'nurse' });
      await api.waitForInteract('nurse');
      api.objective(null);
      await api.say('medic', 'Left forearm. Sleeve up. It\'s a tracking chip, so don\'t look so scared. It\'s a precaution and punishment in equal measures.', { name: 'Nurse' });
      var inj = await api.minigame('qte', { mode: 'timing', rounds: 2, need: 1, speed: 0.9, zone: 0.22, title: 'DON\'T FLINCH', prompt: 'The needle is as thick as a marker.' });
      if (!inj.success) await api.say('medic', 'Flinch again and it goes in twice.', { name: 'Nurse' });
      api.sound('hit');
      api.flash('#ff4040', 200);
      await api.narrate('A hot, deep pinch in my left forearm. A bead of blood. A bump under the skin, smaller than a fingernail.');
      await api.say('guard_android', 'INMATE 739. TRANSFER AUTHORIZED. PROCEED TO THE VEHICLE.');
      await api.move('escort', [8, 4]);
      api.objective('Follow the escort out', { target: 'leave' });
      await api.waitForZone('leave');
      api.objective(null);
      await api.fadeOut(800);
      await api.slides([
        { style: 'black', text: 'A transport van with no windows. My arm aches where they injected the chip. I rub at it absently. It does nothing to ease the discomfort.' },
        { style: 'black', text: 'Somewhere out there, a house is waiting. And somewhere much further away, so is Waverly.' }
      ]);

      /* ================= 10. COLD OPEN: SENATOR HUMBERT ================= */
      await api.slides([{ style: 'black', title: 'Elsewhere', text: 'Late December. A women\'s prison north of Sacramento. Interview Room 2.' }]);
      await api.goRoom('interview', { at: [2, 4], fade: false });
      api.player.visible = false;
      api.lockPlayer();
      api.ambient('drone');
      await api.fadeIn(1200);
      await api.wait(600);
      await api.narrate('A gated interview room. One bulb. A man in a navy suit with a silver side-part and a dove pin on his lapel. Across the table, a large woman sits just outside the light. Only her forearms show: zigzag scars, yellow cleaning gloves.');
      await api.say('humbert', 'You know who I am. Good. Then I\'ll skip the speech.', { mood: 'happy' });
      api.addObject({ id: 'ir_photo', at: [11, 3], prop: 'photo', solid: false });
      await api.wait(400);
      api.remove('ir_photo');
      api.addObject({ id: 'ir_photo2', at: [13, 3], prop: 'photo', solid: false });
      await api.narrate('He slides a photograph across the table. A toddler. A boy, three years old at most, laughing at whoever held the camera.');
      await api.narrate('The gloved hands do not move. Then one of them closes, very slowly, over the photo.');
      await api.say('humbert', ['Rebecca will be in touch.', 'Get yourself on Trader Johnson\'s list. I\'m told a bank will do.']);
      await api.say('???', 'And my boy?', { portrait: false });
      await api.say('humbert', 'Finish the job and you\'ll have him.', { mood: 'smug' });
      await api.fadeOut(1400, '#000');
      api.player.visible = true;
      api.unlockPlayer();
      api.completeChapter();
    }
  });
})();
