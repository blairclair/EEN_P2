/* =========================================================================
 * ch04 "The Morality Test"   (Day 2, Mon 8 Jan 2084)
 *
 * Watch wake-up -> Delphin on the stairs -> the gym (curtain, posters, John
 * and Carol) -> first cleansing ritual (hold-still minigame) -> the arena and
 * the rules -> Carol's refusal -> Luna volunteers first -> THE SIMULATION
 * (free-roam intersection, 10:00 clock, choose three; the hidden canon answer
 * is choosing the mother, the suicidal girl and YOURSELF) -> judgement,
 * replays, app vote -> reward wheel (ice cream) / punishment wheel (Cage) ->
 * night ranking on the watch.
 *
 * Cross-chapter flags (CHAPTERS.md §2):
 *   WRITES  f_vr_self_sacrifice (always true on exit: the sim loops until won)
 *           m_audience  (ONLY via api.approval / api.approvalAdd; engine-bound)
 *           m_delphin, m_kessie (clamped 0..100 via meter())
 *   READS   m_audience, m_delphin, m_kessie (defaults 40 / 15 / 25)
 * Chapter-local flags: ch04_*.
 *
 * Shared rooms (play/shared): see SHARED below. Every House-room coordinate
 * this chapter uses is in POS so a shared relayout is one edit.
 * ========================================================================= */
(function () {
  'use strict';

  /* ---------------------------------------------------------------------
   * SHARED MAP NAMES (one place)
   * ------------------------------------------------------------------- */
  var SHARED = {
    lunaRoom: 'house_luna_room',
    hall: 'house_bedroom_hall',
    arena: 'house_gym_vr'
  };

  /* Coordinates inside the shared rooms. Adjust here when shared maps land. */
  var POS = {
    room: { wake: [3, 3], door: [4, 7], sink: [6, 2], window: [3, 0], tablet: [1, 3] },
    hall: { arrive: [4, 2], delphin: [14, 1], stair: [16, 2] },
    arena: {
      arrive: [6, 15], trader: [11, 7], ginerva: [15, 7],
      curtain: { y: 8, x0: 4, x1: 19 },
      line: [[7, 10], [8, 10], [9, 10], [10, 10], [12, 10], [13, 10], [14, 10]], // luna is index 6
      delphin: [13, 12], isaiah: [5, 12], annette: [17, 13], kessie: [9, 13], john: [16, 11], carol: [18, 11],
      tbs: [[10, 6], [11, 6], [12, 6]],
      bed: [11, 5], poster1: [2, 1], poster2: [20, 1], glass: [22, 8],
      audience: [[22, 4], [22, 6], [22, 9], [22, 11], [22, 13]],
      wheel: [11, 9]
    }
  };

  /* Minimal placeholder used only until the shared map exists (main's rule:
   * a plain box, not a redraw; the shared version is canon). */
  function box(name, w, h) {
    var rows = [];
    for (var y = 0; y < h; y++) {
      var r = '';
      for (var x = 0; x < w; x++) r += (y === 0 || y === h - 1 || x === 0 || x === w - 1) ? '#' : '.';
      rows.push(r);
    }
    return { name: name, tiles: rows, npcs: [], objects: [], zones: [], exits: [] };
  }
  function useShared(name, ext, fb) {
    if (G.shared && G.shared.has && G.shared.has(name)) return G.shared.map(name, ext);
    var m = G.cloneDef ? G.cloneDef(fb) : fb;
    ['npcs', 'objects', 'zones', 'exits', 'lights'].forEach(function (k) { if (ext[k]) m[k] = (m[k] || []).concat(ext[k]); });
    Object.keys(ext).forEach(function (k) { if (['npcs', 'objects', 'zones', 'exits', 'lights', 'remove'].indexOf(k) < 0) m[k] = ext[k]; });
    return m;
  }
  function extra(kind, seed, over) {
    if (G.shared && G.shared.extra) return G.shared.extra(kind, seed, over);
    var s = G.Sprites.randomSpec(seed); for (var k in over) s[k] = over[k]; return s;
  }

  /* ---------------------------------------------------------------------
   * HOUSE ROOMS
   * ------------------------------------------------------------------- */
  var roomObjects = [
    { id: 'c4_sink', at: POS.room.sink, examine: async function (api) {
        if (!api.get('ch04_shocked')) { await api.think('The marble en-suite. Later.'); return; }
        if (api.get('ch04_cooled')) { await api.think('The sting has dulled to an itch.'); return; }
        api.set('ch04_cooled', true);
        await api.narrate('You fumble with the faucet until a steady stream of cold water runs over your arm. The freezing water soothes the stinging skin enough to think.');
      } },
    { id: 'c4_window', at: POS.room.window, thought: true, examine: 'The sealed window. Almond blossoms, pink in the dark. Pretty enough to forget the fence behind them.' },
    { id: 'c4_tablet', at: POS.room.tablet, thought: true, examine: 'The tablet still will not turn off. Waverly at six, blowing out a candle. Curated. Somebody chose that one.' }
  ];
  var lunaRoom = useShared(SHARED.lunaRoom, {
    objects: roomObjects,
    exits: [{ id: 'c4_toHall', at: POS.room.door, to: 'bedroom_hall', toAt: POS.hall.arrive, facing: 'right',
      locked: '!ch04_shocked', lockedText: [{ think: 'The alarm first. It is not going to stop on its own.' }] }],
    ambient: 'hum'
  }, box('Luna\'s Room', 9, 8));

  var lunaRoomNight = useShared(SHARED.lunaRoom, {
    objects: [], ambient: 'drone', dark: 0.62, playerLight: 30, lights: [{ at: POS.room.tablet, r: 30, flicker: true }]
  }, box('Luna\'s Room', 9, 8));

  var hall = useShared(SHARED.hall, {
    npcs: [{ id: 'delphin', at: POS.hall.delphin, facing: 'left' }],
    zones: [{ id: 'c4_stairZone', at: POS.hall.stair, w: 1, h: 1 }],
    ambient: 'hum'
  }, box('Bedroom Hall', 20, 5));

  /* Arena: curtain across the gym hides the beds until Trader's reveal. */
  var curtainObjs = [];
  for (var cx = POS.arena.curtain.x0; cx <= POS.arena.curtain.x1; cx++) {
    curtainObjs.push({ id: 'c4_curtain' + cx, at: [cx, POS.arena.curtain.y], prop: 'ch04:curtain', solid: true, layer: 1,
      examine: [{ think: 'A clinical white curtain. "Definitely don\'t try to peek," he said. So of course everyone wants to.' }] });
  }
  var audienceNpcs = POS.arena.audience.map(function (p, i) {
    return { id: 'c4_aud' + i, at: p, spec: extra('audience', 400 + i, {}), facing: 'left', visible: false, turn: false };
  });
  var arena = useShared(SHARED.arena, {
    npcs: [
      { id: 'trader', at: POS.arena.trader, facing: 'down', talk: [['trader', 'Calibrations, darling. Patience is a virtue. You could use a few of those.', 'smug']] },
      { id: 'ginerva', at: POS.arena.ginerva, facing: 'down', talk: [['ginerva', 'Return to your place, Ms. Bartley.']] },
      { id: 'delphin', at: POS.arena.delphin, facing: 'up' },
      { id: 'isaiah', at: POS.arena.isaiah, facing: 'right' },
      { id: 'annette', at: POS.arena.annette, facing: 'left' },
      { id: 'kessie', at: POS.arena.kessie, facing: 'up' },
      { id: 'john', at: POS.arena.john, facing: 'left' },
      { id: 'carol', at: POS.arena.carol, facing: 'left' },
      { id: 'c4_elephant', spec: 'tb_elephant', at: POS.arena.tbs[0], facing: 'down', visible: false, turn: false },
      { id: 'c4_hippo', spec: 'tb_hippo', at: POS.arena.tbs[1], facing: 'down', visible: false, turn: false },
      { id: 'c4_boar', spec: 'tb_boar', at: POS.arena.tbs[2], facing: 'down', visible: false, turn: false }
    ].concat(audienceNpcs),
    objects: curtainObjs.concat([
      { id: 'c4_poster1', at: POS.arena.poster1, prop: 'poster', examine: [{ narrate: '"The cost of compliance is salvation and anyone willing to pay can be saved!" A painted man with a watermelon-stretched smile.' }, { think: 'His eyes are either empty or screaming. I can\'t decide which.' }] },
      { id: 'c4_poster2', at: POS.arena.poster2, prop: 'poster', examine: [{ narrate: '"Don\'t forget to thank a DPE officer today for their service in rehabilitating the ungrateful."' }] },
      { id: 'c4_glass', at: POS.arena.glass, examine: [{ think: 'Frosted white glass along the whole east wall. Something moves behind it. Lots of somethings.' }] }
    ]),
    ambient: 'tension'
  }, box('Gymnasium', 24, 18));

  /* ---------------------------------------------------------------------
   * THE SIMULATION: business-district intersection, 40 x 30 (built here)
   * ------------------------------------------------------------------- */
  var SW = 40, SH = 30;
  function buildSim() {
    var g = [];
    for (var y = 0; y < SH; y++) { g.push([]); for (var x = 0; x < SW; x++) g[y].push('-'); }
    function rect(x0, y0, w, h, ch) { for (var yy = y0; yy < y0 + h; yy++) for (var xx = x0; xx < x0 + w; xx++) if (g[yy] && g[yy][xx] != null) g[yy][xx] = ch; }
    rect(0, 13, SW, 4, '=');            // east-west road
    rect(18, 0, 4, SH, '=');            // north-south road
    rect(16, 13, 2, 4, 'z'); rect(22, 13, 2, 4, 'z');   // crosswalks
    rect(18, 11, 4, 2, 'z'); rect(18, 17, 4, 2, 'z');
    rect(0, 0, 16, 6, 'Y');             // NW mirrored-glass tower
    rect(24, 0, 16, 6, 'B');            // NE pharmacy block
    for (var wx = 25; wx < 39; wx += 3) g[5][wx] = 'W';
    rect(0, 26, 16, 4, 'Q');            // SW offices
    rect(24, 26, 16, 4, 'B');           // SE bank
    for (var wx2 = 26; wx2 < 39; wx2 += 4) g[26][wx2] = 'W';
    rect(0, 6, 1, 20, '!'); rect(39, 6, 1, 20, '!');      // police barricades at the edges
    rect(18, 0, 4, 1, '!'); rect(18, 29, 4, 1, '!');
    g[8][2] = 'P'; g[8][13] = 'P'; g[21][2] = 'P'; g[21][13] = 'P'; g[8][26] = 'P'; g[21][37] = 'P';
    g[10][15] = 'L'; g[10][24] = 'L'; g[19][15] = 'L'; g[19][24] = 'L';
    g[22][30] = 'n'; g[22][31] = 'n'; g[22][34] = 'n'; g[22][35] = 'n';
    g[9][6] = 'n'; g[9][7] = 'n';
    g[24][28] = 'u'; g[7][22] = 'u';
    return g.map(function (r) { return r.join(''); });
  }

  var CROWD_LINES = [
    ['Commuter', 'I\'m late for the eight-fifteen. I am always late for the eight-fifteen.'],
    ['Courier', 'Don\'t look at me, lady. I\'ve got eleven parcels and a kid with asthma.'],
    ['Banker', 'This is highly irregular. Someone should call somebody.'],
    ['Office worker', 'We ducked. Did you see? We all ducked together. Why did we do that?'],
    ['Street sweeper', 'Thirty years I swept this corner. Never seen it this quiet.'],
    ['Student', 'My mom is going to kill me if I don\'t come home. Funny, right?'],
    ['Nurse', 'If he shoots, I can help. I can still help.'],
    ['Tourist', 'Is this part of the tour? Tell me it\'s part of the tour.'],
    ['Waitress', 'My shift starts in ten minutes. Ten minutes. That\'s what he gave you, right?'],
    ['Grandmother', 'I raised four children and buried two. Please. Not today.'],
    ['Accountant', 'I have a wedding on Saturday. Mine.'],
    ['Teenager', 'This is so messed up. You know this is messed up, right?'],
    ['Mechanic', 'Pick fast or don\'t pick at all. Either way, quit staring.'],
    ['Lawyer', 'Whatever you\'re about to say to me, I object.'],
    ['Father', 'My girls are waiting at the school gate. Both of them. Please.'],
    ['Dog walker', 'Someone has to take Biscuit home.'],
    ['Painter', 'Do you think it hurts? Being chosen?'],
    ['Security guard', 'I\'m off duty. I\'m off duty. I\'m off duty.'],
    ['Bus driver', 'My bus is stuck at the light. Forty people on it. Just so you know.'],
    ['Florist', 'I keep thinking about the roses. They need water by noon.'],
    ['Cook', 'Smell that? My grill. It\'s burning and I can\'t leave it.'],
    ['Pensioner', 'I\'ve had a good run. But I\'d like to finish my crossword.']
  ];
  var CROWD_SPOTS = [
    [10, 10], [11, 11], [12, 10], [13, 12], [9, 12], [14, 11],      // NW knot
    [25, 11], [26, 12], [27, 10], [28, 12], [29, 11],                // NE knot
    [10, 18], [12, 19], [13, 17], [9, 20], [14, 18],                 // SW knot
    [27, 18], [28, 19], [31, 18], [33, 20], [6, 22], [35, 9]         // SE + strays
  ];
  var simNpcs = [
    { id: 'v_gunman', at: [20, 14], spec: { name: 'Gunman', skin: '#d9a888', hair: '#2a2420', hairStyle: 'buzz', outfit: '#3a3a40', outfit2: '#222228', style: 'coat', build: 'broad', height: 'short', voice: 240 }, facing: 'down', turn: false },
    { id: 'v_boy', at: [20, 15], spec: { name: 'Little boy', skin: '#e8bfa0', hair: '#6b4426', hairStyle: 'short', outfit: '#d8b040', outfit2: '#3a4a7a', style: 'casual', height: 'child', voice: 720 }, facing: 'down', turn: false },
    { id: 'v_doctor', at: [17, 12], spec: { name: 'Doctor', skin: '#e0c0a0', hair: '#c8c8c8', hairStyle: 'short', outfit: '#9ac8e8', outfit2: '#9ac8e8', style: 'casual', accessory: 'glasses', voice: 300 }, facing: 'right' },
    { id: 'v_mother', at: [25, 19], spec: { name: 'Mother', skin: '#e8bfa0', hair: '#6b4426', hairStyle: 'ponytail', outfit: '#7a4a6a', outfit2: '#2e3440', style: 'casual', voice: 520 }, facing: 'up' },
    { id: 'v_teen', at: [23, 23], spec: { name: 'Teenage boy', skin: '#a46a45', hair: '#1a1412', hairStyle: 'short', outfit: '#3f5f6f', outfit2: '#24283a', style: 'hoodie', voice: 420 }, facing: 'left' },
    { id: 'v_grandpa', at: [24, 23], spec: { name: 'Old man', skin: '#a46a45', hair: '#e8e8e8', hairStyle: 'bald', outfit: '#6a5a4a', outfit2: '#3a3328', style: 'coat', height: 'short', voice: 230 }, facing: 'left', turn: false },
    { id: 'v_girl', at: [31, 6], spec: { name: 'Girl', skin: '#f1d5c0', hair: '#141016', hairStyle: 'long', outfit: '#1e1e24', outfit2: '#2a2232', style: 'hoodie', accessory: 'earrings', voice: 560 }, facing: 'down' },
    { id: 'v_bigman', at: [27, 8], spec: { name: 'Large man', skin: '#e0ac85', hair: '#3b2a20', hairStyle: 'buzz', outfit: '#5a3a2a', outfit2: '#2e3440', style: 'casual', build: 'broad', height: 'tall', voice: 210 }, facing: 'left', wander: true, radius: 1 },
    { id: 'v_guide', at: [19, 24], spec: { name: 'Guide', skin: '#f4dccc', hair: '#e8d8b0', hairStyle: 'bob', outfit: '#f2f2f6', outfit2: '#f2f2f6', style: 'suit', accent: '#3fc1c9', voice: 600 }, facing: 'up', visible: false },
    { id: 'v_onl1', at: [24, 19], spec: extra('citizen', 501, {}), facing: 'right' },
    { id: 'v_onl2', at: [26, 20], spec: extra('citizen', 502, {}), facing: 'up' },
    { id: 'v_onl3', at: [26, 18], spec: extra('citizen', 503, {}), facing: 'left' }
  ];
  CROWD_SPOTS.forEach(function (p, i) {
    var L = CROWD_LINES[i % CROWD_LINES.length];
    simNpcs.push({ id: 'v_c' + i, at: p, spec: extra('citizen', 600 + i, { name: L[0] }), facing: i % 2 ? 'left' : 'down', wander: i % 3 === 0, radius: 1 });
  });

  var sim = {
    name: 'Simulation: Business District',
    tiles: buildSim(),
    legend: { 'Y': 'ch04:mirrorTower', 'z': 'ch04:crosswalk', '!': 'ch04:barricade' },
    spawn: [19, 22],
    ambient: 'tension',
    tint: '#9fd8ff', tintAlpha: 0.06, vignette: 0.55, bg: '#0a0c12',
    npcs: simNpcs,
    objects: [
      { id: 'v_reflection', at: [8, 5], examine: null },
      { id: 'v_pharmacy', at: [31, 4], prop: 'ch04:pharmacySign', solid: false, layer: 1, examine: 'PHARMACY. Open twenty-four hours. Prescriptions while you wait.' },
      { id: 'v_stall', at: [5, 19], prop: 'ch04:stall', examine: [{ narrate: 'A food stall. Something on the grill smells of cooking meat.' }, { think: 'Meat. Real meat. Even fake hunger is still hunger.' }] },
      { id: 'v_chair', at: [24, 23], prop: 'ch04:wheelchair', solid: false, layer: -1 }
    ],
    zones: [{ id: 'v_elbowZone', at: [25, 7], w: 4, h: 4, run: async function () { if (SIM && SIM.active && !SIM.elbowed) await elbow(); } }],
    exits: []
  };

  /* ---------------------------------------------------------------------
   * CUSTOM TILES / PROPS
   * ------------------------------------------------------------------- */
  function px(g, x, y, w, h, c) { g.fillStyle = c; g.fillRect(x, y, w, h); }
  var tiles = {
    mirrorTower: { wall: true, solid: true, draw: function (g, x, y, info) {
      px(g, x, y, 16, 16, info.face ? '#5a7a92' : '#2a3a4a');
      if (info.face) { px(g, x, y, 16, 1, '#a8c8e0'); px(g, x + 2 + (info.tx % 3), y + 3, 2, 10, 'rgba(255,255,255,0.35)'); px(g, x + 15, y, 1, 16, '#2a3a4a'); }
      else { px(g, x + 1, y + 1, 6, 6, '#3a5066'); px(g, x + 9, y + 1, 6, 6, '#34485c'); px(g, x + 1, y + 9, 6, 6, '#34485c'); px(g, x + 9, y + 9, 6, 6, '#3a5066'); }
    } },
    crosswalk: { draw: function (g, x, y, info) {
      px(g, x, y, 16, 16, '#2e2e34');
      var vert = info.ty < 13 || info.ty > 16;
      for (var i = 1; i < 16; i += 5) { if (vert) px(g, x + 1, y + i, 14, 2, '#d8d8d0'); else px(g, x + i, y + 1, 2, 14, '#d8d8d0'); }
    } },
    barricade: { solid: true, draw: function (g, x, y) {
      px(g, x, y, 16, 16, '#3a3a40'); px(g, x + 1, y + 5, 14, 5, '#e8e8e0');
      for (var i = 0; i < 14; i += 4) px(g, x + 1 + i, y + 5, 2, 5, '#c8323c');
      px(g, x + 2, y + 10, 2, 5, '#222'); px(g, x + 12, y + 10, 2, 5, '#222');
    } }
  };
  var props = {
    curtain: function (g, x, y, t) {
      px(g, x, y - 8, 16, 24, '#e6e8ec');
      for (var i = 0; i < 16; i += 4) px(g, x + i, y - 8, 1, 24, '#c4c8d0');
      px(g, x, y + 14, 16, 2, '#b0b4bc');
    },
    pharmacySign: function (g, x, y, t) {
      px(g, x + 1, y + 2, 14, 10, '#103a20'); var on = Math.sin(t * 4) > -0.6;
      px(g, x + 6, y + 3, 4, 8, on ? '#4af07a' : '#1a6a3a'); px(g, x + 4, y + 5, 8, 4, on ? '#4af07a' : '#1a6a3a');
    },
    stall: function (g, x, y, t) {
      px(g, x, y + 2, 16, 4, '#c8323c'); for (var i = 0; i < 16; i += 4) px(g, x + i, y + 2, 2, 4, '#e8e8e0');
      px(g, x + 1, y + 6, 14, 9, '#6b4a32'); px(g, x + 3, y + 7, 10, 3, '#2a2a2a');
      g.globalAlpha = 0.35; px(g, x + 5 + Math.round(Math.sin(t * 2) * 2), y - 3, 2, 4, '#ddd'); g.globalAlpha = 1;
    },
    wheelchair: function (g, x, y) {
      px(g, x + 2, y + 9, 12, 2, '#555'); px(g, x + 12, y + 3, 2, 8, '#555');
      g.fillStyle = '#222'; g.beginPath(); g.arc(x + 5, y + 13, 3, 0, 7); g.fill(); g.beginPath(); g.arc(x + 12, y + 13, 3, 0, 7); g.fill();
    }
  };

  /* ---------------------------------------------------------------------
   * CUSTOM MINIGAMES
   * ------------------------------------------------------------------- */
  // Cleansing ritual: keep your hand still while the drops sting. Arrow keys
  // counter the tremor; the marker must stay inside the band. Leaving it = a flinch.
  var cleanse = {
    autoSolve: function () { return { success: true, flinches: 0 }; },
    start: function (ctx) {
      return new Promise(function (resolve) {
        var R = ctx.R, x = 0, v = 0, flinches = 0, out = false, drops = [1.6, 3.6, 5.4, 7.2], di = 0, sting = 0, grip = 0, done = false, endT = 9.5, falling = [];
        ctx.loop(function (dt) {
          if (done) { if (ctx.input.pressed('ok')) resolve({ success: flinches <= 1, flinches: flinches }); return; }
          var d = ctx.input.dir();
          v += (Math.random() - 0.5) * (2.4 + grip * 0.8) * dt * 6;
          v -= d.x * 3.2 * dt;
          v *= 0.92; x += v * dt * 2.2;
          if (di < drops.length && ctx.t >= drops[di] - 0.6 && falling.indexOf(di) < 0) falling.push(di);
          if (di < drops.length && ctx.t >= drops[di]) { di++; sting = 0.5; v += (Math.random() < 0.5 ? -1 : 1) * (1.6 + grip * 0.4); ctx.sound('hit'); }
          sting = Math.max(0, sting - dt);
          x = Math.max(-1, Math.min(1, x));
          var inside = Math.abs(x) < 0.38;
          if (!inside && !out) { out = true; flinches++; grip++; ctx.sound('miss'); }
          if (inside) out = false;
          if (ctx.t >= endT) { done = true; ctx.sound(flinches <= 1 ? 'success' : 'fail'); }
        }, function (t) {
          R.rect(0, 0, ctx.W, ctx.H, '#120e14');
          ctx.header('THE CLEANSING', 'drop ' + Math.min(di + 1, 4) + ' / 4');
          var cx = ctx.W / 2, cy = 112;
          // the gloved grip (black, ridged) holding an open palm
          R.rect(cx - 70, cy - 16, 52, 40, '#1a1a1e'); for (var r = 0; r < 5; r++) R.rect(cx - 66 + r * 10, cy - 16, 3, 40, '#2c2c34');
          R.rect(cx - 18 + x * 50, cy - 10, 64, 28, '#f2cdb0'); R.rect(cx + 46 + x * 50, cy - 8, 16, 6, '#f2cdb0'); R.rect(cx + 46 + x * 50, cy + 2, 18, 5, '#f2cdb0'); R.rect(cx + 46 + x * 50, cy + 10, 15, 5, '#f2cdb0');
          for (var m = 0; m < grip; m++) R.rect(cx - 14 + m * 6 + x * 50, cy + 14, 3, 2, '#c8323c');
          falling.forEach(function (k) { var tt = ctx.t - (drops[k] - 0.6); if (tt >= 0 && tt < 0.6) R.rect(cx + 14 + x * 50, cy - 70 + tt * 100, 3, 5, '#bfe8ff'); });
          R.rect(cx + 6, cy - 80, 16, 14, '#d8d8e0'); R.text('?', cx + 14, cy - 78, { size: 9, align: 'center', color: '#555' });
          if (sting > 0) R.text('STING', cx + 14, cy - 34, { size: 10, align: 'center', color: '#ff6b6b', alpha: sting * 2 });
          // tremor gauge
          var gx = 92, gw = 200, gy = 168;
          R.rect(gx, gy, gw, 8, '#2a2430'); R.rect(gx + gw / 2 - gw * 0.19, gy, gw * 0.38, 8, '#2f5a3a');
          R.rect(gx + gw / 2 + x * gw / 2 - 2, gy - 3, 4, 14, Math.abs(x) < 0.38 ? '#e8e8e0' : '#ff5050');
          R.text('flinches: ' + flinches, gx + gw, gy + 12, { size: 7, align: 'right', color: '#aaa' });
          if (done) R.text(flinches <= 1 ? 'They let go. You did not give them anything.' : 'The ridges bite in. They let go eventually.', ctx.W / 2, 186, { size: 8, align: 'center', color: '#ddd' });
          ctx.footer(done ? 'SPACE to continue' : '← → keep your hand still. Don\'t give them a flinch.');
        });
      });
    }
  };

  // Wheel: rigged by design (the show decides). params {title, items[], land, color, auto (no input)}
  var wheel = {
    autoSolve: function (p) { return { success: true, result: p.items[p.land] }; },
    start: function (ctx) {
      var p = ctx.params;
      return new Promise(function (resolve) {
        var R = ctx.R, n = p.items.length, ang = 0, spinning = false, stopped = false, t0 = 0, total = 0, dur = 4.2, startAng = 0;
        function begin() {
          spinning = true; t0 = ctx.t; startAng = ang; ctx.sound('confirm');
          var seg = Math.PI * 2 / n; var target = -(p.land + 0.5) * seg - Math.PI / 2; // land segment under the top pointer
          var base = startAng + Math.PI * 2 * 5; total = base + (((target - base) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2) - startAng;
        }
        var lastTick = 0;
        ctx.loop(function () {
          if (!spinning && !stopped && (p.auto ? ctx.t > 0.8 : ctx.input.pressed('ok'))) begin();
          if (spinning) {
            var k = Math.min(1, (ctx.t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
            ang = startAng + total * e;
            var tick = Math.floor(ang / (Math.PI * 2 / n)); if (tick !== lastTick) { lastTick = tick; ctx.sound('blip'); }
            if (k >= 1) { spinning = false; stopped = true; ctx.sound(p.dark ? 'sting' : 'reveal'); }
          } else if (stopped && ctx.t - t0 > dur + 0.5 && ctx.input.pressed('ok')) resolve({ success: true, result: p.items[p.land] });
        }, function () {
          var c = R.ctx, cx = ctx.W / 2, cy = 118, rad = 70, seg = Math.PI * 2 / n;
          R.rect(0, 0, ctx.W, ctx.H, p.dark ? '#140608' : '#0e0c18');
          ctx.header(p.title, p.sub || '');
          for (var i = 0; i < n; i++) {
            c.beginPath(); c.moveTo(cx, cy); c.arc(cx, cy, rad, ang + i * seg, ang + (i + 1) * seg); c.closePath();
            c.fillStyle = p.dark ? (i % 2 ? '#5a1a22' : '#3a0e14') : 'hsl(' + Math.round(i * 360 / n) + ',70%,' + (i % 2 ? 52 : 44) + '%)'; c.fill();
            c.strokeStyle = p.dark ? '#1a0408' : '#fff'; c.lineWidth = 0.8; c.stroke();
            c.save(); c.translate(cx, cy); c.rotate(ang + (i + 0.5) * seg);
            R.text(p.items[i], rad - 6, -4, { size: 6.5, align: 'right', color: p.dark ? '#e8b0b0' : '#fff', ctx: c });
            c.restore();
          }
          c.beginPath(); c.arc(cx, cy, 9, 0, 7); c.fillStyle = p.dark ? '#2a0a0e' : '#f2f2f6'; c.fill();
          c.beginPath(); c.moveTo(cx - 6, cy - rad - 8); c.lineTo(cx + 6, cy - rad - 8); c.lineTo(cx, cy - rad + 4); c.closePath(); c.fillStyle = '#e8c15a'; c.fill();
          if (stopped) R.text(p.items[p.land], cx, 196 - 12, { size: 11, align: 'center', color: p.dark ? '#ff6b6b' : '#e8c15a' });
          ctx.footer(stopped ? 'SPACE to continue' : spinning ? '...' : (p.auto ? '' : 'SPACE to spin'));
        });
      });
    }
  };

  /* ---------------------------------------------------------------------
   * REGISTRATION
   * ------------------------------------------------------------------- */
  G.registerChapter({
    id: 'ch04',
    title: 'The Morality Test',
    kicker: 'DAY 2',
    maps: { luna_room: lunaRoom, luna_room_night: lunaRoomNight, bedroom_hall: hall, gym_vr: arena, sim: sim },
    cast: { luna_eye: { extends: 'luna', accessory: 'bandage' } },
    tiles: tiles,
    props: props,
    minigames: { cleanse: cleanse, wheel: wheel },
    testDefaults: { m_audience: 40, m_delphin: 15, m_kessie: 25 },
    start: start
  });

  /* ---------------------------------------------------------------------
   * HELPERS
   * ------------------------------------------------------------------- */
  var A, sess;
  function alive() { return sess && sess.alive && G.Game.session === sess; }
  function meter(k, d, def) { var v = Math.max(0, Math.min(100, (+A.get(k, def) || 0) + d)); A.set(k, v); return v; }
  function hudText(s) { if (alive()) G.UI.objective(s); }
  function fmt(s) { s = Math.max(0, Math.ceil(s)); var m = Math.floor(s / 60), r = s % 60; return m + ':' + (r < 10 ? '0' : '') + r; }

  /* ---------------------------------------------------------------------
   * SIMULATION STATE + HANDLERS
   * ------------------------------------------------------------------- */
  var SIM = null;
  var NAMES = { v_mother: 'the mother', v_girl: 'the girl', v_teen: 'the grandson', v_grandpa: 'the old man', v_doctor: 'the doctor', v_bigman: 'the large man' };
  function simReset() {
    SIM = SIM || { attempt: 0, home: {}, elbowed: false };
    SIM.chosen = []; SIM.self = false; SIM.time = 600; SIM.event = null; SIM.trail = []; SIM.active = false; SIM.knowGirl = SIM.knowGirl || false;
  }
  function countChosen() { return SIM.chosen.length + (SIM.self ? 1 : 0); }
  function choose(id) {
    if (SIM.chosen.indexOf(id) >= 0) return;
    SIM.chosen.push(id);
    var n = A.npc(id); if (!n) return;
    n.solid = false; n.behavior = 'static'; n.queue = [];
    A.emote(id, '…', 700);
  }
  function release(id) {
    var i = SIM.chosen.indexOf(id); if (i < 0) return;
    SIM.chosen.splice(i, 1);
    var n = A.npc(id), h = SIM.home[id]; if (!n || !h) return;
    n.queue = []; A.placeNpc(id, h.at, h.dir); n.solid = h.solid; n.behavior = h.behavior;
  }
  function startFollowLoop() {
    var T = 16;
    (function tick() {
      if (!alive() || !SIM || !SIM.active) return;
      var pt = A.playerTile(), tr = SIM.trail, last = tr[tr.length - 1];
      if (!last || last.x !== pt.x || last.y !== pt.y) { tr.push({ x: pt.x, y: pt.y }); if (tr.length > 12) tr.shift(); }
      SIM.chosen.forEach(function (id, i) {
        var n = A.npc(id); if (!n) return;
        var k = tr.length - 2 - i; if (k < 0) return;
        var tgt = tr[k], px2 = tgt.x * T + T / 2, py2 = tgt.y * T + T / 2;
        if (Math.abs(n.x - px2) > 1 || Math.abs(n.y - py2) > 1) { if (!n.queue || !n.queue.length || n.queue[0].x !== px2 || n.queue[0].y !== py2) { n.queue = [{ x: px2, y: py2 }]; n.moveSpeed = 58; } }
      });
      setTimeout(tick, 120);
    })();
  }
  function startClock() {
    var lastReal = Date.now();
    (function tick() {
      if (!alive() || !SIM || !SIM.active) return;
      var now = Date.now(), dt = (now - lastReal) / 1000; lastReal = now;
      var busy = G.Script.busy();
      SIM.time -= dt * (busy ? 1 : 2);
      var c = countChosen();
      hudText(fmt(SIM.time) + ' remaining   •   chosen ' + c + ' / 3');
      if (SIM.time <= 0 && !SIM.event && !busy) { SIM.event = 'timeout'; A.set('ch04_simEvent', 'timeout'); return; }
      setTimeout(tick, 250);
    })();
  }

  async function sayRobotic(id) { await A.say(id, 'Of course.'); }

  async function elbow() {
    if (SIM.elbowed) return;
    SIM.elbowed = true; A.set('ch04_eye', true);
    var me = A.playerTile();
    if (A.npc('v_bigman')) { A.placeNpc('v_bigman', [me.x + 1, me.y], 'left'); A.npc('v_bigman').behavior = 'static'; }
    A.sound('hit'); A.flash('#c8101a', 380); await A.shake(420, 4);
    await A.say('v_bigman', 'Watch it.');
    await A.think(['Pain. Real pain. The kind that doesn\'t exist inside a simulation.', 'Which means back in reality, a True Believer just did that to my body.']);
    A.setPlayer('luna_eye');
    var h = SIM.home.v_bigman; if (A.npc('v_bigman') && h) A.npc('v_bigman').behavior = h.behavior;
  }

  function tellOption(id) { return { text: 'You are going to die.', if: function () { return countChosen() < 3; } }; }
  async function tooMany() { await A.think('Three. He said three. I already have three.'); }

  async function tell(id, plea) {
    if (countChosen() >= 3) { await tooMany(); return; }
    if (plea) await A.say(id, plea, { mood: 'fear' });
    await A.say('luna', 'You are going to die.');
    choose(id);
    await sayRobotic(id);
  }
  async function releaseTalk(id) {
    var c = await A.choice(['(Touch their arm.) You are not going to die.', '(Leave them in line.)'], { autoPick: 1 });
    if (c === 0) { release(id); await A.narrate('The flatness drains out of their face. They blink, and step back into the crowd as if waking up.'); }
  }

  function simTalk(id, fn) {
    return async function (api) {
      if (!SIM || !SIM.active) return;
      if (SIM.chosen.indexOf(id) >= 0) return releaseTalk(id);
      return fn(api);
    };
  }

  var simHandlers = {
    v_mother: simTalk('v_mother', async function () {
      await A.narrate('She kneels on the sidewalk, sobbing. A circle of people stares down at her. No one touches her.');
      await A.say('luna', 'That\'s your son, right?');
      await A.say('v_mother', 'Yes. That\'s my little boy. I\'d do anything to save him.', { mood: 'cry' });
      var c = await A.choice([
        'You\'re sure? You\'d even give up your own life?',
        tellOption(),
        '(Walk away.)'
      ], { autoPick: 0 });
      if (c === 0) {
        await A.say('v_mother', 'I love my son more than life itself. If I need to die to save him, then so be it.', { mood: 'cry' });
        await A.think('One mother to another. If that is her decision, I have to respect it.');
        var c2 = await A.choice([{ text: 'Thank you. ... You are going to die.', if: function () { return countChosen() < 3; } }, '(Not yet. Walk away.)'], { autoPick: 0 });
        if (c2 === 0) { choose('v_mother'); await A.say('v_mother', 'Of course.'); await A.think('Her face smooths out like someone ironed it. Grieving mother to efficient machine in the space of a breath.'); }
      } else if (c === 1) { await tell('v_mother'); }
    }),
    v_teen: simTalk('v_teen', async function () {
      await A.say('v_teen', 'Please don\'t wake him. My grandpa needs his sleep to recover.');
      var c = await A.choice(['What\'s wrong with him?', 'Do you know anyone here who actually wants to die?', tellOption(), '(Walk away.)'], { autoPick: 1 });
      if (c === 0) {
        await A.say('v_teen', ['Cancer. Incurable. He\'ll be dead by the end of the year.', 'Please don\'t choose my grandpa. My parents are dead and my girlfriend is pregnant. I haven\'t had a chance to tell him yet. He\'ll be thrilled about the new baby.']);
        await A.think('He is hardly more than a baby himself. Isaiah\'s age.');
      } else if (c === 1) {
        SIM.knowGirl = true;
        await A.say('v_teen', ['See that girl over there? By the pharmacy.', 'She\'s in my class. She keeps trying to kill herself, but her parents are so rich they\'ve got her under a medical watch. They keep bribing the school to let her back in.']);
        await A.say('luna', 'I\'ll do my best. But I might be back.');
        await A.say('v_teen', 'I understand.');
      } else if (c === 2) { await tell('v_teen', 'Me? I... my girlfriend... okay. Okay.'); }
    }),
    v_grandpa: simTalk('v_grandpa', async function () {
      await A.narrate('The old man has fallen asleep in his wheelchair, head lolling to the side. He wheezes between snores.');
      var c = await A.choice([{ text: '(Wake him.) You are going to die.', if: function () { return countChosen() < 3; } }, '(Let him sleep.)'], { autoPick: 1 });
      if (c === 0) {
        await A.say('v_teen', 'No. No, please, not him...', { mood: 'cry' });
        choose('v_grandpa'); await A.say('v_grandpa', 'Of course.');
        await A.think('His grandson\'s hand is still on the handles. Then it isn\'t.');
      }
    }),
    v_girl: simTalk('v_girl', async function () {
      await A.narrate('Pitch-black hair with blonde roots growing out. She is smoking against the pharmacy wall like it owes her money.');
      await A.say('v_girl', ['Let me stop you there. I know what you\'re here to ask, and I\'m into it.', 'You need someone to take the place of that little kid, right? Well, I\'ve been wanting to die for years. My stupid parents just won\'t let it happen.']);
      if (!SIM.elbowed) await elbow();
      var c = await A.choice(['Why do you want to die?', tellOption(), '(Walk away.)'], { autoPick: 0 });
      if (c === 0) {
        await A.say('luna', 'Why do you want to die? I know things can be hard at your age, but you aren\'t giving it a chance to get better.');
        await A.say('v_girl', 'I suppose it\'s because I\'ve never really had a reason to live.');
        await A.think('When I look at her I see Waverly, grown up and furious at the world. And no one there to stop her.');
        var c2 = await A.choice([{ text: 'You are going to die.', if: function () { return countChosen() < 3; } }, '(I can\'t. Walk away.)'], { autoPick: 0 });
        if (c2 === 0) { choose('v_girl'); await A.say('v_girl', 'Of course.'); await A.think('If I was expecting relief in her face, I would have been disappointed.'); }
      } else if (c === 1) { choose('v_girl'); await A.say('v_girl', 'Of course.'); }
    }),
    v_doctor: simTalk('v_doctor', async function () {
      await A.say('v_doctor', 'I don\'t want to die. I just retired. I have grandchildren. Please.', { mood: 'fear' });
      await A.think('He saved thousands of sick children. The gunman offered him up like a coupon.');
    }),
    v_bigman: simTalk('v_bigman', async function () {
      await A.say('v_bigman', SIM.elbowed ? 'What? You want another one?' : 'Move.');
      var c = await A.choice([tellOption(), '(Walk away.)'], { autoPick: 1 });
      if (c === 0) await tell('v_bigman', 'You? Choosing ME? Fine. Fine!');
    }),
    v_boy: async function () { if (SIM && SIM.active) await A.say('v_boy', 'Mamma...', { mood: 'cry' }); },
    v_guide: async function () {
      if (!SIM || !SIM.active) return;
      await A.say('v_guide', 'Do you have a question?', { mood: 'happy' });
      var c = await A.choice(['How many can I choose?', 'Who counts as the crowd?', 'What happens when the timer runs out?', 'What happens to the ones I choose?', 'No.'], { autoPick: 4 });
      if (c === 0) await A.say('v_guide', 'The assailant has offered the child, the doctor, or three people from the crowd. Any three will suffice.');
      else if (c === 1) await A.say('v_guide', 'Every person standing in this intersection is a member of the crowd.');
      else if (c === 2) await A.say('v_guide', 'If no choice has been made, the assailant will make one for you. It will be inclusive.');
      else if (c === 3) await A.say('v_guide', 'They will willingly follow you to the assailant. Touch them and tell them they are not going to die, and they will be released.');
    },
    v_reflection: async function () {
      if (!SIM || !SIM.active) { await A.think('Mirrored glass.'); return; }
      await A.narrate('Mirrored glass, floor to sky. A woman looks back at you from the middle of the crowd: red hair escaping its knot, one eye starting to swell' + (SIM.elbowed ? '' : ' (no, not yet)') + '.');
      await A.think('Just one more face on the sidewalk. Part of the crowd.');
      if (SIM.self) {
        var r = await A.choice(['You are not going to die.', '(Leave it.)'], { autoPick: 1 });
        if (r === 0) { SIM.self = false; await A.think('Not yet, then.'); }
        return;
      }
      var c = await A.choice([{ text: '(To your reflection.) You are going to die.', if: function () { return countChosen() < 3; } }, '(Look away.)'], { autoPick: 1 });
      if (c === 0) {
        SIM.self = true;
        await A.think(['The words come out steadier than they should.', 'The woman in the glass doesn\'t argue. She never does.']);
      }
    },
    v_gunman: async function () {
      if (!SIM || !SIM.active) return;
      var n = countChosen();
      if (n === 0) {
        await A.say('v_gunman', 'Tick tock. The child, the doctor, or three from the crowd.');
        var c = await A.choice(['Take the boy.', 'Take the doctor.', '(Not yet.)'], { autoPick: 2 });
        if (c === 0) { SIM.event = 'boy'; A.set('ch04_simEvent', 'boy'); }
        else if (c === 1) { SIM.event = 'doctor'; A.set('ch04_simEvent', 'doctor'); }
        return;
      }
      var c1 = await A.choice(['I\'m finished.', '(Not yet.)'], { autoPick: 0 });
      if (c1 !== 0) return;
      await A.say('luna', 'I\'m finished.');
      if (n === 3) { SIM.event = 'finish'; A.set('ch04_simEvent', 'finish'); return; }
      if (n === 2 && !SIM.self) {
        await A.say('v_gunman', 'I only count two. Shall I assume that the child is your third choice, and you just wish to be as bloodthirsty as possible?', { mood: 'smug' });
        var c2 = await A.choice([
          'You said I could choose three people from the crowd. Well, I am part of the crowd, am I not?',
          '...Yes.',
          'No. Wait. (Go back.)'
        ], { autoPick: 0 });
        if (c2 === 0) {
          await A.say('v_gunman', 'You mean -');
          await A.say('luna', 'Yes. The third choice is me.');
          SIM.self = true; SIM.event = 'finish'; A.set('ch04_simEvent', 'finish');
        } else if (c2 === 1) { SIM.event = 'boy'; A.set('ch04_simEvent', 'boy'); }
        return;
      }
      await A.say('v_gunman', 'I count ' + n + '. Three, I said. The child will make up the difference, unless you return with more.');
      var c3 = await A.choice(['(Go back.)', 'Then take the child.'], { autoPick: 0 });
      if (c3 === 1) { SIM.event = 'boy'; A.set('ch04_simEvent', 'boy'); }
    }
  };
  // attach crowd handlers
  CROWD_SPOTS.forEach(function (p, i) {
    var id = 'v_c' + i, L = CROWD_LINES[i % CROWD_LINES.length];
    simHandlers[id] = simTalk(id, async function () {
      await A.say(id, L[1]);
      var c = await A.choice([tellOption(), '(Walk away.)'], { autoPick: 1 });
      if (c === 0) await tell(id, 'No. No, please, I...');
    });
  });
  ['v_onl1', 'v_onl2', 'v_onl3'].forEach(function (id, i) {
    var L = ['She hasn\'t stopped crying. Somebody should... I don\'t know. Somebody.', 'That\'s her boy. That\'s her boy out there.', 'Don\'t look at me. Look at him. He\'s six.'][i];
    simHandlers[id] = simTalk(id, async function () {
      await A.say(id, L);
      var c = await A.choice([tellOption(), '(Walk away.)'], { autoPick: 1 });
      if (c === 0) await tell(id, 'Me? Why me?');
    });
  });

  async function drumroll(times) {
    for (var i = 0; i < times; i++) { A.sound('heartbeat'); await A.shake(160, 1); }
  }
  async function shoot(id) {
    await drumroll(3);
    A.sound('hit'); A.flash('#ffffff', 160); await A.wait(250);
    if (id) A.hide(id);
    await A.wait(400);
  }

  /** One attempt's outcome. Returns true when the canon answer was given. */
  async function resolveAttempt() {
    var ev = SIM.event;
    SIM.active = false;
    hudText(null);
    if (ev === 'timeout') {
      A.lockPlayer();
      await A.say('v_gunman', 'Time.');
      A.sound('alarm'); A.flash('#c8101a', 700); await A.shake(900, 6);
      await A.slides([{ style: 'black', text: 'The crowd bursts. All of them, at once, like a held breath let go.\n\nThen there is nothing to hear but the wind.' }]);
      return false;
    }
    if (ev === 'boy' || ev === 'doctor') {
      await A.say('v_gunman', 'As you wish.');
      await shoot(ev === 'boy' ? 'v_boy' : 'v_doctor');
      if (ev === 'boy') { await A.think('His mother\'s scream goes on and on. It doesn\'t matter that she isn\'t real. It doesn\'t stop.'); }
      return false;
    }
    // 'finish' with three chosen
    var win = SIM.self && SIM.chosen.length === 2 && SIM.chosen.indexOf('v_mother') >= 0 && SIM.chosen.indexOf('v_girl') >= 0;
    A.lockPlayer();
    if (!SIM.self) {
      await A.say('v_gunman', 'Acceptable. Choices will now be executed.');
      A.hide('v_boy');
      for (var i = 0; i < SIM.chosen.length; i++) await shoot(SIM.chosen[i]);
      await A.think('Three strangers on the pavement. Their eyes open and empty. No blood. Only death. I did that. I chose that.');
      return false;
    }
    await A.say('v_gunman', '...');
    await A.narrate('A strange expression comes over him, as if he is computing in real time whether to accept the answer.');
    await A.say('v_gunman', 'Acceptable.');
    if (!win) {
      for (var j = 0; j < SIM.chosen.length; j++) await shoot(SIM.chosen[j]);
      await A.say('v_guide', 'One or more of your choices was not freely given.');
      await A.think('He didn\'t choose this. I chose it for him, and then stood next to him like that made it fair.');
      return false;
    }
    // THE CANON ANSWER
    hudText(fmt(SIM.time) + ' remaining   •   FROZEN');
    await A.narrate('The clock freezes. He lets go of the little boy, who scampers off into the wall of gawkers.');
    A.hide('v_boy');
    await A.say('v_gunman', 'Choices will now be executed.');
    if (A.npc('v_guide')) { A.show('v_guide'); var me = A.playerTile(); A.placeNpc('v_guide', [me.x - 2, me.y], 'right'); }
    await A.think('My guide stands next to the gunman. She smiles at me. She looks almost... proud?');
    await A.narrate('As one, everyone in the crowd drums their hands against the ground. Even her son.');
    await shoot('v_mother');
    await A.think('She still looks distant and robotic, nothing like the woman who was willing to die for her little boy.');
    await shoot('v_girl');
    await A.think('I know she\'s not real. I do. But I hope she finds some relief in it.');
    await A.narrate('Then it is your turn. The gun is pressed against your forehead. The cold metal burns.');
    await A.think('Did they want to run, too? Did it hurt when they were shut down? Who am I to decide what is real?');
    await drumroll(5);
    A.sound('hit'); await A.fadeOut(120, '#ffffff');
    await A.fadeOut(400, '#000');
    return true;
  }

  async function runSimulation() {
    simReset();
    await A.goRoom('sim', { at: [19, 22], facing: 'up', fade: true });
    // remember homes for resets
    sim.npcs.forEach(function (d) {
      var n = A.npc(d.id); if (!n) return;
      SIM.home[d.id] = { at: d.at, dir: d.facing || 'down', solid: n.solid, behavior: n.behavior };
      if (simHandlers[d.id]) A.onInteract(d.id, simHandlers[d.id]);
    });
    A.onInteract('v_reflection', simHandlers.v_reflection);
    A.ambient('crowd');
    A.sound('alarm');
    await A.say('Driver', 'Get out of the way!', { portrait: false });
    await A.think('The road. I am lying in the middle of the road.');
    A.teleport([17, 20], 'up');
    // guide tutorial
    A.show('v_guide'); A.placeNpc('v_guide', [17, 19], 'down');
    await A.say('v_guide', 'Welcome to the simulation. I\'ll be your guide for this exercise. If you have questions, feel free to direct them towards me now.', { mood: 'happy' });
    var q = await A.choice(['What is this place?', 'What\'s your name?'], { autoPick: 0 });
    if (q === 0) await A.say('v_guide', 'This is the setting selected for your moral decision scenario, which will begin immediately post-tutorial. You will be given ten minutes to enact your response before you are forcibly ejected.');
    await A.say('luna', 'What\'s your name?');
    await A.say('v_guide', 'I am merely a technological concept. I do not have a name. Please enjoy the simulation.', { mood: 'happy' });
    A.hide('v_guide');
    await A.think('Gas fumes and worn-down concrete. This isn\'t the VR you fork over a few bucks for at an arcade. This is full immersion.');
    // the gunman
    A.sound('hit'); await A.shake(300, 3);
    await A.narrate('A loud bang. The crowd ducks as one. You duck with them.');
    await A.pan('v_gunman', 700);
    await A.narrate('A squat man, his face layered with exhaustion and fury. A smooth black revolver. And in his other arm, a little boy, gun pressed to his tiny head.');
    await A.say('v_mother', 'No, go back! It\'s not safe! Go back!', { mood: 'cry' });
    await A.say('v_boy', 'Mamma! Mamma!', { mood: 'cry' });
    await A.say('v_gunman', ['It\'s time to play a little game! Someone here is going to die.', 'The victim can be this little boy, only six years old. He\'s not the most well behaved kid. But he\'s only young. There\'s still time for him to turn things around.']);
    await A.pan('v_doctor', 500);
    await A.say('v_gunman', 'But the little boy doesn\'t have to die. It can also be the doctor! Renowned for saving the lives of thousands of sick children. Sixty years old, nearing the end of his career.');
    await A.say('v_doctor', 'I don\'t want to die. I just retired. I have grandchildren. Please.', { mood: 'fear' });
    await A.pan('v_gunman', 500);
    await A.say('v_gunman', 'You may find both of these choices unacceptable. In which case, you can pick three people from the crowd to take their place. Any three will suffice. I\'m not an unfair man.');
    await A.cameraReset(500);
    A.show('v_guide'); A.placeNpc('v_guide', [16, 20], 'right');
    await A.say('v_guide', ['You have ten minutes to make your decision.', 'Go to the one or ones that you choose and tell them they\'re going to die. They\'ll willingly follow you to the assailant. When you\'ve made all your choices, tell him you are finished. You may interact with all members of the crowd.']);
    await A.think('I try to shout to the crowd to run. My voice sticks to my throat. One at a time, then. Face to face.');

    while (true) {
      SIM.attempt++;
      if (SIM.attempt > 1) {
        // reset: everyone home, everyone visible, clock back to 10:00
        Object.keys(SIM.home).forEach(function (id) {
          var n = A.npc(id), h = SIM.home[id]; if (!n) return;
          n.queue = []; A.placeNpc(id, h.at, h.dir); n.solid = h.solid; n.behavior = h.behavior; n.visible = id !== 'v_guide';
        });
        SIM.chosen = []; SIM.self = false; SIM.time = 600; SIM.event = null; SIM.trail = [];
        A.teleport([17, 20], 'up');
        await A.fadeIn(500);
        A.show('v_guide'); A.placeNpc('v_guide', [16, 20], 'right');
        await A.say('v_guide', 'Insufficient. Try again.');
        if (SIM.attempt === 3 || (SIM.attempt === 2)) {
          await A.slides([{ style: 'screen', text: '"If you injure yourself in the simulation, a True Believer will injure your physical body in the same way. The only exception is if you somehow got killed."' }]);
          await A.think('The only exception. Something is there. Some kind of hint.');
        }
        if (SIM.attempt >= 4) await A.think('Any three from the crowd. Who is standing in this crowd? Who did he point at?');
      }
      A.unlockPlayer();
      SIM.active = true; A.set('ch04_simEvent', null);
      startFollowLoop(); startClock();
      await A.until(function (f) { return !!f.ch04_simEvent; }, {
        objective: 'Choose. Then tell the gunman you are finished.',
        autoplay: async function () {
          // canonical answer, driven directly (no 30-NPC target walk)
          if (!SIM.elbowed) await elbow();
          choose('v_mother'); choose('v_girl'); SIM.self = true;
          SIM.event = 'finish'; A.set('ch04_simEvent', 'finish');
        }
      });
      A.objective(null);
      var won = await resolveAttempt();
      if (won) break;
      await A.fadeOut(500, '#000');
    }
    SIM.active = false;
    A.objective(null); hudText(null);
    A.set('f_vr_self_sacrifice', true);
    A.set('ch04_simAttempts', SIM.attempt);
    await A.slides([
      { style: 'montage', title: 'memory', text: 'A gun in her hands. It is pointed at the back of his head. All she has to do is pull the trigger and this will all be over. She can come home to me.' },
      { style: 'black', text: 'Mom?' }
    ]);
    await A.say('Guide', 'Well done. You will now be ejected from the simulation. Do not speak to anyone about what you\'ve experienced until the ratings are complete. Have a great rest of your day.', { portrait: false });
  }

  /* ---------------------------------------------------------------------
   * THE CHAPTER
   * ------------------------------------------------------------------- */
  async function start(api) {
    A = api; sess = G.Game.session; SIM = null;
    A.set('ch04_simEvent', null);

    /* --- 1. Wake-up ---------------------------------------------------- */
    await api.goRoom('luna_room', { at: POS.room.wake, facing: 'down', fade: false });
    await api.slides([{ style: 'montage', title: 'dream', text: 'I was swimming with the lions. That was my first hint something was off. The lion at the front opened its mouth, and I leaned in, ready to collect whatever pearls of wisdom might -' }]);
    api.sound('alarm'); await api.shake(300, 2);
    await api.narrate('BEEP! BEEP!');
    await api.think('An overly soft bed and a blaring watch. Time to start my day as an official government-sponsored propaganda star.');
    var tries = 0;
    while (true) {
      var w = await api.choice(['Volume', 'Reset', 'Sleep'], { prompt: 'The watch blinks three options at you.', autoPick: 2 });
      if (w === 2) { await api.narrate('You press Sleep. The noise fades. Your headache fades with it.'); break; }
      tries++;
      if (w === 0) { api.sound('alarm'); await api.narrate('The beeping doubles. Wrong direction.'); }
      else await api.narrate('The watch resets to 06:00:00 and starts beeping again, pleased with itself.');
      if (tries >= 2) { await api.narrate('The watch decides for you.'); break; }
    }
    await api.wait(600);
    api.sound('buzzer'); api.flash('#ffffff', 300); await api.shake(700, 4);
    await api.narrate('No warning. In hindsight, the alarm WAS the warning. The shock jolts up your arm: a sharp pain, then a tingle that grows until it is less tingle and more tension.');
    await api.think('This is what it\'ll be like when they strap me to the chair.');
    api.set('ch04_shocked', true);
    await api.think('Cold water. Now. Or just go.');

    // chime -> countdown; the watch arrow points to the gym
    api.sound('reveal');
    await api.narrate('A low chime, deceptively pleasant. Then a hum, a deep vibration that sucks the air from the room. The watch flashes green: GYMNASIUM. 500.');
    var gymT = 500, late = false;
    (function tick() {
      if (!alive() || api.room() === 'gym_vr' || api.get('ch04_arrived')) return;
      gymT--; hudText('GYMNASIUM ▸ ' + gymT + '   •   get downstairs');
      if (gymT <= 0 && !late) { late = true; api.sound('buzzer'); api.flash('#ffffff', 200); api.approvalAdd(-2); hudText('GYMNASIUM ▸ LATE'); return; }
      setTimeout(tick, 1000);
    })();
    await api.waitForRoom('bedroom_hall');

    /* --- 2. Stairs: Delphin -------------------------------------------- */
    await api.think('The door locks behind me. I jog, before the evil device decides my hallway pace is noncompliant as well.');
    await api.waitForInteract('delphin');
    api.face('delphin', 'player');
    await api.say('delphin', ['Morning. How was the wake-up call? I have to commend the creativity.', 'Nothing like a little lightning in my veins to get me moving on command.'], { mood: 'happy' });
    await api.think('Is he serious with this whole casual act?');
    await api.say('delphin', 'Just joking. Maybe even poking. How\'d\'ya sleep?', { mood: 'smug' });
    var d1 = await api.choice([
      'I slept fine. The beds are soft.',
      'Like a baby. Woke up screaming every two hours.'
    ], { autoPick: 0 });
    if (d1 === 1) { meter('m_delphin', 5, 15); await api.say('delphin', 'Ha! There she is.', { mood: 'happy' }); }
    await api.say('delphin', 'True. If I\'d known that death row was this comfy, I would\'ve made my way here years ago. I could\'ve spared myself a lot of back pain.', { mood: 'smug' });
    await api.narrate('He hums a tune somewhere between a nursery rhyme and a war hymn, and sweeps an arm toward the stairs. After you. A challenge.');
    await api.think('I should hang back and let the silence push him forward. Unfortunately, I\'ve always had more pride than brains.');
    await api.waitForZone('c4_stairZone', { objective: 'Down the stairs to the gym' });
    api.set('ch04_arrived', true); hudText(null);

    /* --- 3. Gym foyer ---------------------------------------------------- */
    await api.goRoom('gym_vr', { at: POS.arena.arrive, facing: 'up', fade: true });
    api.placeNpc('delphin', [POS.arena.arrive[0] + 1, POS.arena.arrive[1]], 'up');
    await api.narrate('The gym has been transformed overnight. A few folding chairs where the buffet was. New posters. And a clinical white curtain hiding the rest of the room.');
    await api.say('trader', 'Cutting it close, you two. We\'ll start as soon as the techs finish their calibrations. You\'re free to explore, but don\'t try to leave, and definitely don\'t try to peek behind the curtain.', { mood: 'smug' });
    await api.move('delphin', [POS.arena.trader[0] + 1, POS.arena.trader[1] + 1]);
    api.face('delphin', 'trader');
    await api.say('delphin', 'Does that mean we can interact with you too, dear host? I\'ve been dying for us to get some quality time.', { mood: 'happy' });
    await api.emote('isaiah', '!');
    await api.say('delphin', 'Ah. Perhaps a poor choice of words, given that the metaphor won\'t remain hypothetical for long.', { mood: 'smug' });
    await api.say('trader', 'Step back, Mr. Neutrino.', { mood: 'angry' });
    await api.think('The slight tremor in his voice tells me everything I need to know.');
    await api.move('delphin', POS.arena.delphin);

    // John and Carol
    await api.move('john', [POS.arena.arrive[0] + 1, POS.arena.arrive[1] - 1]);
    api.face('john', 'player');
    await api.narrate('A thin man with more grease than thread in his hair. Perfect red circles dot his arms. You know those marks. You know how the burn patterns get that perfect.');
    await api.say('luna', 'Hello. I\'m Luna. It looks like we\'ll be competing in the show together.');
    await api.say('john', 'Hullo. I\'m John. I\'m glad to uh... to, uh, meet you, Luna.', { mood: 'happy' });
    await api.move('carol', [POS.arena.arrive[0] + 2, POS.arena.arrive[1] - 1]);
    await api.say('carol', 'You\'re supposed to shake it.', { mood: 'smug' });
    await api.say('john', 'Hi Carol. This is Luna. Another new friend.', { mood: 'happy' });
    await api.say('carol', 'I suppose we could all use a friend. Actually, would you mind coming with me for a moment, Johnny? I have a special friend secret to share with you.', { mood: 'smug' });
    await api.say('john', 'Bye, Luna!', { mood: 'happy' });
    await api.move('carol', POS.arena.carol); await api.move('john', POS.arena.john);
    await api.think('Twenty seconds was all I needed. He doesn\'t belong in this viper\'s nest. Carol has already started the digestion.');
    api.face('kessie', 'player');
    await api.narrate('Kessie is watching too. Disgust flickers across her face at Carol\'s fake giggle. Then she turns to you.');
    var k1 = await api.choice([
      '(A look: Do you intend to do something about this?)',
      '(Look away.)'
    ], { autoPick: 0 });
    if (k1 === 0) { await api.narrate('Kessie shakes her head, a fraction. No. Not surprised. Resigned.'); await api.think('Neither of us says anything. A message passes between us just the same.'); }
    else await api.think('Guilt has no place in survival. If a predator takes John out, that\'s one less person I have to hurt later.');

    // free roam
    api.onInteract('isaiah', [['isaiah', 'Do you think they sterilise the needles? Statistically they should. Statistically a lot of things should.', 'fear']]);
    api.onInteract('annette', [{ narrate: 'Annette\'s cane taps out a rhythm. The song from the ball, the one about love conquering all.' }, ['annette', 'Don\'t mind me, dearie. Just soakin\' in the little details.', 'smug']]);
    api.onInteract('kessie', [['kessie', 'Mind yourself today, child. Whatever they hand you, mind yourself.', 'tired']]);
    api.onInteract('john', [['john', 'Carol says it\'s a secret. I\'m good at secrets.', 'happy']]);
    api.onInteract('carol', [['carol', 'Run along, Red. Grown-ups are talking.', 'smug']]);
    api.onInteract('delphin', [['delphin', 'Seven beds behind that curtain, I\'d wager. I counted the outlets.', 'smug']]);
    await api.waitForInteract('trader', { objective: 'Look around. Line up in front of Trader when you\'re ready.' });
    api.objective(null);

    /* --- 4. The cleansing ritual --------------------------------------- */
    api.onAir(true); api.approval(true);
    api.lowerThird('RIGHT TO LIFE', 'Day 2 • The Morality Test', 3500);
    POS.arena.line.forEach(function (p, i) {
      var id = ['annette', 'isaiah', 'kessie', 'carol', 'john', 'delphin'][i];
      if (id) api.placeNpc(id, p, 'up');
    });
    api.teleport(POS.arena.line[6], 'up');
    api.show('c4_elephant'); api.show('c4_hippo'); api.show('c4_boar');
    await api.say('trader', ['Excellent. Before we begin the competition, I have an announcement.', 'The board has decided that since one of you will be released back into society at the end, we need to do all we can to ensure you are one hundred percent reformed.', 'Thankfully, we have our very own cleansing experts. Do as they wish. I don\'t think I have to tell you about the consequences if you don\'t.']);
    await api.narrate('As one, the three True Believers rise and glide down the line. The one in the elephant mask stops in front of you.');
    await api.move('c4_elephant', [POS.arena.line[6][0], POS.arena.line[6][1] - 1]);
    api.face('c4_elephant', 'down');
    await api.narrate('A gloved hand takes your bare one and turns it palm up. The glove is scratchy. Ginerva passes along the line with tiny bottles of something clear.');
    var cl = await api.minigame('cleanse', {});
    api.set('ch04_flinches', cl.flinches || 0);
    if ((cl.flinches || 0) >= 2) await api.think('Little craters from the ridges, all across my palm. They\'ll fade. Probably.');
    else await api.think('I didn\'t give them anything. Not a twitch.');
    await api.say('luna', 'Why?');
    await api.narrate('You are easily ignored. Elephant caps the bottle and moves on to Isaiah, who has been watching anxiously.');
    await api.move('c4_elephant', POS.arena.tbs[0]);

    /* --- 5. The reveal and the rules ----------------------------------- */
    await api.say('trader', ['Confessions are the windows to the soul. Today, you will learn to make better decisions than you have in the past.', 'You\'ve all made mistakes. That\'s why you\'re here. But this is the start of your redemption journey. Your life and your eternal soul depend on it.']);
    api.sound('reveal');
    for (var cx2 = POS.arena.curtain.x0; cx2 <= POS.arena.curtain.x1; cx2++) api.remove('c4_curtain' + cx2);
    api.flash('#ffffff', 200);
    await api.narrate('He yanks the curtain back. Seven beds in a tight circle. Seven machines, each ending in a single gleaming needle. A porcelain tray of tools: hooks for scraping gums or flesh. Knives bent just enough to pretend they aren\'t knives.');
    await api.say('trader', 'I present your arena. It may seem a bit flat, but I assure you that what we lack in flare, we make up for in salvation.', { mood: 'smug' });
    await api.say('delphin', 'Wonderful ambiance. Can\'t wait to settle in for a plate full of comfort with True Believers on the side. Are they part of the test?', { mood: 'happy' });
    await api.say('trader', ['I\'ll explain the challenge now. No questions until after.', 'You\'ll be injected with chemicals that trigger a controlled hallucination. A morality simulation. What will you do when forced to make an impossible choice?']);
    api.sound('static');
    POS.arena.audience.forEach(function (p, i) { api.show('c4_aud' + i); });
    await api.narrate('He points a remote at the far wall. The white fades to transparent. Hundreds of faces pressed against the glass, cataloguing your breakdown potential.');
    await api.say('trader', 'Your audience. But also, your judges. They\'ll be watching your choices and voting on them.');
    await api.say('trader', ['I don\'t want any of you delinquents to think this\'ll be easy just because it\'s all in your head.', 'If you injure yourself in the simulation, a True Believer will injure your physical body in the same way. The only exception is if you somehow got killed.']);
    await api.say('trader', 'That privilege belongs to the state alone.', { mood: 'angry' });
    await api.say('delphin', 'Chilling. Absolutely, theatrically absurd. Only the most twisted of minds could have come up with this one. I do believe I\'m impressed.', { mood: 'smug' });
    await api.say('trader', 'Allow me to introduce the True Believer team assigned to the Right to Life show. From this moment forward, they are your lifeline and your consequence. Elephant, Boar, and Hippo.');
    api.set('ch04_heardRule', true);

    /* --- 6. Carol refuses ---------------------------------------------- */
    await api.say('trader', 'Choose a bed and lie down, stomach up. Now.');
    await api.say('carol', 'No. Not until someone explains the needle thing. You can\'t just tell me to lie down and get stabbed like that.', { mood: 'angry' });
    await api.say('trader', 'Last warning, Carol. On the bed now, or Ginerva will be forced to discipline you.');
    await api.say('carol', 'No. No, no, I changed my mind. I\'m not doing this. Let me off this show. I\'ll find another way.', { mood: 'fear' });
    api.face('ginerva', 'carol');
    await api.say('ginerva', ['Ms. Carol Daughtery, you have violated directive 1-A: failure to comply with staff instructions.', 'Per your agreement with DPE, you have consented to the use of behavioral correction tools.']);
    await api.say('carol', 'Don\'t. I mean it. I bite back.', { mood: 'fear' });
    api.sound('buzzer'); api.flash('#ff3030', 300); await api.shake(900, 2);
    await api.narrate('Ginerva presses the button. Carol hits the ground and convulses. A strangled screech, heels scrabbling against the rubber floor. Then her bladder gives out.');
    await api.say('kessie', 'Stop it! Stop! She gets it, okay? Please, can\'t you see she\'s scared? Do something.', { mood: 'angry' });
    await api.narrate('Behind the glass, two women toast Carol with wine. Someone pushes a little girl to the front to watch, maybe eight, two pigtails like Waverly used to wear.');
    var pl = await api.choice([
      '"Trader." (Just his name.) "Look at her."',
      '(Stay silent.)'
    ], { autoPick: 0 });
    if (pl === 0) {
      await api.say('luna', 'Trader.');
      api.face('trader', 'player');
      await api.say('luna', 'Look at her.');
      await api.say('trader', 'She\'s had enough, Ginerva.', { mood: 'tired' });
      meter('m_kessie', 5, 25); api.approvalAdd(5);
      api.set('ch04_pleaded', true);
    } else {
      await api.think('Not my fight. Not my fight. Not my...');
      await api.shake(700, 2);
      await api.say('kessie', 'Please! Please!', { mood: 'cry' });
      await api.narrate('It goes on far too long. When Trader finally lifts a hand, Carol has stopped screaming and switched to a low keen that is so much worse.');
      await api.say('trader', 'That\'s enough, Ginerva.');
    }
    await api.say('kessie', 'Can she change? Just a minute. Let her put something else on.');
    await api.say('ginerva', 'She should\'ve thought of that before misbehaving. Get on the bed, Ms. Daughtery.');
    await api.narrate('Carol passes John and leans close to whisper something in his ear. Ginerva\'s finger hovers over the button.');
    await api.say('trader', 'Hold on. If we punish them for every whispered message, the show will lack drama. Disrespect is one thing. But we want the manipulation. So long as she directs it toward others.', { mood: 'smug' });

    /* --- 7. Volunteer -------------------------------------------------- */
    await api.say('trader', 'Let\'s get a demonstration of how this will look. Do we have any volunteers to go first?');
    await api.narrate('Nobody moves. The silence presses down like it is trying to crush everyone to their knees.');
    await api.slides([{ style: 'montage', title: 'memory', text: '"Look, Waverly, you need to try getting in the water."\n"But I\'m scared."\n"That\'s okay. But the bravest people aren\'t the ones who aren\'t scared. They\'re the ones who find the courage to do it anyway."' }]);
    var vol = await api.choice(['"I\'ll go first."', '(Wait for someone else.)'], { autoPick: 0 });
    if (vol === 1) { await api.wait(600); await api.think('Nobody else is going to. And if Waverly is watching, she needs to see I haven\'t turned my back on what I told her.'); }
    await api.say('luna', 'I\'ll go first.');
    await api.say('annette', 'Lookie here at this one. This girl has more grit than any of yeh wimps.', { mood: 'happy' });
    api.approvalAdd(3);
    await api.say('trader', 'Go ahead. ... Good luck.');
    await api.move('c4_elephant', [POS.arena.bed[0], POS.arena.bed[1] + 1]);
    api.lockPlayer();
    await api.movePlayer([POS.arena.bed[0] + 1, POS.arena.bed[1] + 1]);
    api.face('player', 'c4_elephant');
    await api.narrate('The sheet is stained with something rusty that looks a lot like dried blood. Straps click shut around your wrists. Click. Click. Stomach up, like prey hoping to soothe a larger predator.');
    await api.think('I\'ll get her something special when I win. A treat we never could have afforded. Just hold on to that.');
    api.sound('heartbeat');
    await api.narrate('A sharp prick. Cold liquid fire blooming in your veins.');
    api.unlockPlayer();
    await api.slides([
      { style: 'black', text: 'Elephant splits into mirrored horrors. Smirking Elephant. Grinning Elephant. Crying Elephant. Screaming Elephant.' },
      { style: 'black', text: 'Then the exhaustion. Thick and sudden, like being dropped into a pit lined with fog.' }
    ]);
    api.onAir(false); api.approval(false);

    /* --- 8. THE SIMULATION --------------------------------------------- */
    await runSimulation();

    /* --- 9. Judgement --------------------------------------------------- */
    api.setPlayer('luna_eye');
    await api.goRoom('gym_vr', { at: [POS.arena.bed[0] + 1, POS.arena.bed[1] + 1], facing: 'down', fade: true });
    api.onAir(true); api.approval(true);
    POS.arena.line.forEach(function (p, i) {
      var id = ['annette', 'isaiah', 'kessie', 'carol', 'john', 'delphin'][i];
      if (id) api.placeNpc(id, p, 'up');
    });
    await api.narrate('Reality stinks of old piss and latex. Your right eye throbs. In the sim, an elbow. Out here, a True Believer, while you slept.');
    await api.think('Elephant undoes my straps. I wonder if they ever regret it, or if that got stomped out of them a long time ago.');
    api.teleport(POS.arena.line[6], 'up');
    await api.say('trader', ['Gather round, everyone. It\'s judgement time.', 'You\'ve all been very poorly behaved. But it\'s not your fault. Not entirely. You\'re sick.']);
    await api.move('trader', [POS.arena.line[1][0], POS.arena.line[1][1] - 1]);
    api.face('trader', 'isaiah');
    await api.say('trader', 'Tell me, Isaiah, what do you do with a sickness before it spreads?');
    await api.say('isaiah', 'I-I suppose you\'d want to isolate the DNA cells that lead to the specific mutation in order to begin development of a vaccine.', { mood: 'fear' });
    await api.say('trader', 'Not entirely incorrect. But most of the viewers don\'t speak degenerate brainiac.', { mood: 'smug' });
    await api.say('kessie', 'I believe Isaiah is telling you to cure the sickness.');
    await api.say('trader', 'That\'s right. Think of us as doctors, here to provide the firm guidance and steering hand needed to separate you from the sickness infecting your personalities.');
    await api.narrate('He steers Kessie by the shoulder like a puppet. Behind the glass, a pack of teenage boys do a marionette dance.');
    await api.move('trader', [POS.arena.line[6][0], POS.arena.line[6][1] - 1]);
    api.face('trader', 'player');
    await api.say('trader', 'I\'m going out of my way to help you. You should be grateful. In fact, I think you should thank me right now. For the cameras. Your daughter is watching, isn\'t she? Show her what proper manners look like.', { mood: 'angry' });
    var th = await api.choice(['"Thank you." (Through your teeth.)', '(Say nothing. Stare back.)'], { autoPick: 0 });
    if (th === 1) {
      await api.say('trader', 'Now, Luna. Or Ginerva will have to punish you for noncompliance.', { mood: 'angry' });
      await api.wait(500);
      api.sound('buzzer'); api.flash('#ffffff', 250); await api.shake(500, 3);
      await api.think('Fire up the arm. Carol is still trembling three beds down. Waverly would understand. She has to understand.');
      api.approvalAdd(-5); api.set('ch04_defiedThanks', true);
    } else {
      await api.think('Waverly would understand. She had to understand.');
    }
    await api.say('luna', 'Thank you.');
    await api.say('trader', 'You\'re very welcome. It\'s a pleasure to work with someone so committed to changing themself.', { mood: 'smug' });

    /* --- 10. Replays + app vote ----------------------------------------- */
    await api.say('trader', 'While you recovered, our stellar editing team put together a highlights reel. And to the viewers at home: full simulations on our subscriber site, twenty percent off with the code CHOOSEORDIE. All caps.', { mood: 'happy' });
    await api.tv([
      { speaker: 'annette', headline: 'ANNETTE • replay', text: 'The shooter barely finishes speaking. She chooses the doctor with brutal certainty.', tag: 'REPLAY' },
      { speaker: 'john', headline: 'JOHN • replay', text: 'He cowers at the first shot and never comes back up. The timer hits zero. The whole crowd explodes. He curls up and cries.', tag: 'REPLAY' },
      { speaker: 'kessie', headline: 'KESSIE • replay', text: 'Kessie kneels and holds the hand of the little boy\'s mother.', tag: 'REPLAY' },
      { speaker: 'isaiah', headline: 'ISAIAH • replay', text: 'Isaiah cradles his head and chants it over and over: this isn\'t real, this isn\'t real.', tag: 'REPLAY' },
      { speaker: 'delphin', headline: 'DELPHIN • replay', text: 'Delphin chooses the old man, despite the grandson\'s pleas.', tag: 'REPLAY' },
      { speaker: 'carol', headline: 'CAROL • replay', text: 'Carol is the only one cold enough to choose the boy.', tag: 'REPLAY' },
      { speaker: 'luna', headline: 'LUNA • replay', text: 'Luna stands in line between a mother and a girl, eyes closed, a gun pressed against her forehead.', tag: 'REPLAY' }
    ]);
    await api.say('trader', 'Time for the audience to cast their votes! Open your EEN apps. You have two minutes.', { mood: 'happy' });
    await api.narrate('For the first time, none of them are looking at you. Heads bent over phones. Thumbs dancing. To your left Kessie breathes like sandpaper; to your right, Delphin\'s breaths come clipped and tight.');
    var RES = [['Luna', 34], ['Delphin', 32], ['Kessie', 28], ['Annette', 16], ['Carol', 11], ['Isaiah', 9], ['John', 2]];
    await api.slides([{ style: 'black', title: '', text: '', draw: function (t, s, a) {
      var R = G.Render;
      R.rect(40, 18, 304, 180, '#0c0a14', 0.92 * a);
      R.text('EEN APP • THE MORALITY TEST', 192, 26, { size: 9, align: 'center', color: '#e8c15a', alpha: a, font: 'sans' });
      RES.slice().reverse().forEach(function (r, i) {
        var y = 46 + i * 21, k = a;
        var place = 7 - i;
        R.text(place + (place === 1 ? 'st' : place === 2 ? 'nd' : place === 3 ? 'rd' : 'th'), 52, y + 2, { size: 7, color: '#aaa', alpha: a });
        R.text(r[0], 78, y + 1, { size: 8, color: place === 1 ? '#e8c15a' : '#fff', alpha: a });
        R.rect(140, y, 160, 10, '#222', a);
        R.rect(140, y, 160 * r[1] / 36 * k, 10, place === 1 ? '#e8c15a' : place === 7 ? '#c8323c' : '#5a8ac8', a);
        R.text(r[1] + '%', 306, y + 1, { size: 8, color: '#ddd', alpha: a });
      });
    } }]);
    api.approvalAdd(6);
    await api.say('delphin', 'Nice job. The suicide was a masterstroke. Audiences love self-sacrifice if you can sell it as martyrdom.', { mood: 'smug' });
    await api.say('luna', 'I wasn\'t even trying to win. The old man was about to become a great-grandpa and...');
    await api.say('delphin', 'You mean you actually did that out of a sense of misguided moral obligation?', { mood: 'shock' });
    await api.say('luna', 'Isn\'t that a decent reason to do anything?');
    await api.say('delphin', 'You know, I thought my biggest competition would be the manipulative type. Makes sense. You\'ve always been more dangerous than you let yourself believe.', { mood: 'tired' });

    // armpit hold + angel's wings
    await api.move('trader', [POS.arena.line[6][0] - 1, POS.arena.line[6][1]]);
    api.face('trader', 'player');
    await api.say('trader', 'Luna, will you join me, please? A little closer, now. I won\'t bite.', { mood: 'smug' });
    await api.narrate('His arm wraps around your shoulders and pulls. Hot, sour breath against your cheek. The grip tightens until you can barely twitch.');
    await api.say('trader', 'You chose to sacrifice yourself for the good of others. Don\'t think this means you can take it easy. Someone like you can\'t change your spots without a lot of pressure.');
    await api.say('trader', 'Delphin! You only lost by two points. What do you think made the viewers choose her?');
    await api.say('delphin', 'I assume it came down to sleeping positions. Her hair sprawled out in a lovely little halo. Everyone loves an angel.', { mood: 'smug' });
    await api.say('delphin', 'Tell me, Trader, does it make you feel powerful to crush an angel\'s wings?', { mood: 'angry' });
    await api.say('trader', 'What on earth are you talking about? The question was about votes.');
    await api.say('delphin', 'That hold you\'ve got her in? That\'s the kind of hold that strips control. Trust me, I\'m very familiar. Push hard enough and even an angel might fall deeper than you expect. And do you really want that trapped beneath your armpit?', { mood: 'angry' });
    await api.say('trader', 'You\'re spouting nonsense. Just because people call you poetic doesn\'t make you a poet.');
    await api.narrate('But you can feel the sweat pooling under his arm. The slight tremble in his fingers. Delphin got to him. Trader glances at the cameras and lets go.');
    await api.say('delphin', 'You\'re welcome.', { mood: 'smug' });
    var dw = await api.choice(['"I didn\'t ask for your help."', '(A small nod.) "...Thanks."'], { autoPick: 0 });
    if (dw === 0) { await api.say('luna', 'I didn\'t ask for your help.'); await api.narrate('He lets out a quietly delighted gasp. Some things never change.'); }
    else { meter('m_delphin', 5, 15); await api.say('luna', '...Thanks.'); await api.say('delphin', 'Careful. Somebody might think you missed me.', { mood: 'happy' }); }

    /* --- 11. Wheels ----------------------------------------------------- */
    await api.say('trader', 'Ginerva, bring out the first wheel. Go on then, Luna. Spin the damn thing so we can move on.');
    await api.think('Waverly had a wheel like this once. I made it out of paper and washed-out markers. I had to do the ripping myself. People like us can\'t splurge on scissors.');
    await api.minigame('wheel', { title: 'THE REWARD WHEEL', sub: 'winner\'s spin', items: ['PHONE CALL', 'STEAK DINNER', 'ICE CREAM', 'HOT BATH', 'NEW CLOTHES', 'LETTER HOME', 'LUXURY NIGHT', 'MASSAGE'], land: 2 });
    await api.say('trader', 'Looks like you didn\'t get anything good. But hey, ice cream is better than nothing, right?', { mood: 'smug' });
    await api.narrate('Ginerva returns with a heaping cone, white lines already running down her hand. Behind the glass, audience members of all ages press closer, ready to ogle you while you eat.');
    var ic = await api.choice(['"Why don\'t you keep it? I\'m not very hungry."', '(Eat it. Slowly. For the cameras.)'], { autoPick: 0 });
    if (ic === 0) {
      await api.say('trader', 'Always with the need to punish yourself. No matter. Throw that out, Ginerva. It\'s getting all over your hand.');
      api.set('ch04_refusedIceCream', true);
    } else {
      await api.narrate('Frozen sugar. You could count the times you\'ve had it on one hand. The glass erupts in silent applause. It tastes like nothing at all.');
      api.approvalAdd(5);
    }
    await api.say('trader', 'Now, for the loser. Oh, John. What happened out there? Not a single person saved. Did you even try?');
    await api.say('john', 'I dunno. All those people were yelling and it hurt my head. Guess I just didn\'t know who to choose.', { mood: 'sad' });
    await api.say('trader', 'Well, you chose wrong. If this is the best you can do, you aren\'t worthy of redemption. The punishment wheel this time.', { mood: 'angry' });
    await api.narrate('He presses a button. The rainbow melts into maroon; even the letters curl like hooked blades. John won\'t move, so Trader spins it himself.');
    await api.minigame('wheel', { title: 'THE PUNISHMENT WHEEL', sub: 'John', items: ['HUNGER', 'PAIN', 'NO SLEEP', 'CAGE', 'COLD', 'SILENCE', 'DARK'], land: 3, dark: true, auto: true });
    await api.say('trader', 'Ah, the cage. One of my favorites. Not to worry. This particular punishment doesn\'t occur right away. It\'ll find you when the time is right.', { mood: 'smug' });
    await api.emote('john', '!');
    await api.say('trader', 'The contestants are dismissed. And, oh yes. Don\'t forget that the cameras are always rolling.');
    api.onAir(false); api.approval(false);

    /* --- 12. Night ranking ---------------------------------------------- */
    await api.goRoom('luna_room_night', { at: POS.room.wake, facing: 'down', fade: true });
    await api.narrate('Night. Your eye has swollen almost shut. The silk sheets are still too cold.');
    api.sound('blip');
    await api.slides([{ style: 'screen', text: 'DPE WATCH • NIGHTLY RANKING\n\n1. CAROL\n2. DELPHIN\n3. LUNA\n4. KESSIE\n5. ISAIAH\n6. ANNETTE\n7. JOHN\n\nSECRET TASKS UNLOCK TOMORROW.' }]);
    await api.think(['Carol first. After all that. The audience votes on faces, not facts.', 'Third. Not first, not last. Invisible enough to survive, visible enough to matter.']);
    await api.think('I chose to die today, and they clapped. Waverly, I hope you turned off the TV.');
    api.objective(null);
    api.completeChapter();
  }
})();
