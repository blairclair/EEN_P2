/* =========================================================================
 * ch15 "Right to Live": the finale (Fri 9 Feb 2084)
 *
 * Doll Room (the Judge opens the final private vote) -> blindfold walk
 * (Luna counts her steps in sevens) -> the Confessional (ballot: Annette;
 * the Isaiah option is locked in fiction: "I won't. Not him.") -> Doll Room
 * count (Annette 2, Isaiah 1 -> Luna vs Annette) -> thirty minutes of free
 * roam (Isaiah's apology, Annette, Ginerva "You promised.", bruised Trader)
 * -> the Gym courtroom: Annette's plea, Luna's plea (3 angles), Trader's
 * "Pay close attention", the SAVE count (Annette 1,263,104 / Luna 1,262,904)
 * -> the execution chair -> the Judge's taunt -> BANG -> three True Believers
 * -> Ginerva "Tray." -> Isaiah unties Luna (m_isaiah >= 60) or she works a
 * wrist free (mash) -> THE STANDOFF (custom persuasion minigame; options
 * gated by m_trader_insight / f_mem_penguin_arm / f_trader_note_left /
 * f_note3_decoded; 3 strikes = he fires -> in-chapter checkpoint retry)
 * -> the truth about Franchesca -> Annette "Do it" (lower the gun / shoot him
 * dead -> Alt B) -> the chips: knee shot or gun to Annette's temple -> the
 * glasses stomped for a lens shard -> CHIP REMOVAL (hold-still minigame) ->
 * the phone ("Try the top number") -> escape: Red Hall stealth -> kitchen &
 * pantry garden door -> garden floodlight stealth -> the fence gap -> the
 * night road (perimeter, dead streetlamp, OLD MILL RD) -> "Momma?"
 *
 * Source: D3b L4287-4405 (votes, pleas, count, the shot, the standoff,
 * Annette's lines), PLAN L18 (gun, chips, knee, phone), LONG L41 (strapped
 * chair, Isaiah unties). Canon edits per CHAPTERS.md ch15: blindfolded
 * Confessional, SAVE polarity, chips (not collars), execution chair (not the
 * Cage), Trader's murder reveal, Waverly is eleven.
 *
 * CROSS-CHAPTER FLAGS (CHAPTERS.md §2)
 *   Reads:  m_trader_insight (>=3 unlocks "Because she loved you..."),
 *           f_mem_penguin_arm, f_trader_note_left, f_note3_decoded,
 *           f_isaiah_reconciled, f_promised_ginerva, m_isaiah (>=60: he
 *           unties Luna), m_annette (>=50: "grit"), m_audience
 *   Sets:   f_killed_trader (Alt B), f_knee_shot, f_called_top_number,
 *           m_isaiah (+ in the apology), m_annette (+/-), m_audience (pleas),
 *           m_waverly (+5 on the call only; never lowered here)
 * Local flags: ch15_*
 *
 * SHARED LOCATIONS: house_gym_courtroom, house_kitchen, house_grounds come
 * from play/shared (marks used for staging). house_doll_room and
 * house_confessional use the shared map when it exists (entity positions
 * snapped to the nearest walkable tile), else a local layout. Local-only
 * maps: blind_walk (the blindfold corridor) and road (outside the fence).
 * ========================================================================= */
(function () {
  'use strict';

  /* ---------------------------------------------------------------------
   * CONSTANTS
   * ------------------------------------------------------------------- */
  var H = { doll: 'house_doll_room', conf: 'house_confessional', court: 'house_gym_courtroom', kitchen: 'house_kitchen', grounds: 'house_grounds' };
  var BLIND = 'blind_walk', ROAD = 'road';

  function marks(id) { return (G.shared && G.shared.data && G.shared.data.marks && G.shared.data.marks[id]) || {}; }
  function spawns(id) { return (G.shared && G.shared.data && G.shared.data.spawns && G.shared.data.spawns[id]) || {}; }
  function mk(id, name, fb) { var m = marks(id)[name]; return m ? [m[0], m[1]] : fb; }

  /* walkability test on a map def (default legend + its own legend) */
  function walker(def) {
    var leg = Object.assign({}, G.Map.LEGEND, def.legend || {});
    return function (x, y) {
      var row = def.tiles[y]; if (!row || x < 0) return false;
      var ch = row.charAt(x) || ' ', e = leg[ch];
      if (e === undefined) return false;
      var name = typeof e === 'string' ? e : (e.tile || 'floor');
      var td = G.lookup('tiles', name, 'ch15');
      return !!td && !td.solid;
    };
  }
  /** Snap [x,y] (given for a local W x H layout) into a shared map: scale, then nearest walkable free tile. */
  function fitter(def, srcW, srcH) {
    var ok = walker(def), used = {};
    var w = 0; def.tiles.forEach(function (r) { w = Math.max(w, r.length); });
    var h = def.tiles.length;
    return function (p) {
      var x = Math.round(p[0] * (w - 1) / (srcW - 1)), y = Math.round(p[1] * (h - 1) / (srcH - 1));
      for (var r = 0; r < 12; r++) {
        for (var dy = -r; dy <= r; dy++) for (var dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          var k = (x + dx) + ',' + (y + dy);
          if (!used[k] && ok(x + dx, y + dy)) { used[k] = 1; return [x + dx, y + dy]; }
        }
      }
      return [x, y];
    };
  }

  /* ---------------------------------------------------------------------
   * CUSTOM TILES & PROPS
   * ------------------------------------------------------------------- */
  function px(g, x, y, w, h, c) { g.fillStyle = c; g.fillRect(x, y, w, h); }
  var tiles = {
    dollshelf: { wall: true, solid: true, draw: function (g, x, y, info) {
      px(g, x, y, 16, 16, '#2a1a14'); px(g, x, y + 7, 16, 1, '#4a2e20'); px(g, x, y + 15, 16, 1, '#4a2e20');
      for (var i = 0; i < 3; i++) { var hx = x + 1 + i * 5, c = ['#e8d8c8', '#f0e0d0', '#d8c8b8'][(info.tx + i) % 3];
        px(g, hx, y + 2, 4, 4, c); px(g, hx + 1, y + 3, 1, 1, '#111'); px(g, hx + 3, y + 3, 1, 1, '#111');
        px(g, hx + 1, y + 4, 1, 3, '#8a1018'); px(g, hx, y + 9, 4, 5, ['#6a2a4a', '#2a4a6a', '#6a6a2a'][(info.ty + i) % 3]); px(g, hx + 1, y + 10, 2, 2, c); }
    } },
    leaderwall: { wall: true, solid: true, draw: function (g, x, y) {
      px(g, x, y, 16, 16, '#3a3428'); px(g, x + 2, y + 2, 12, 11, '#c9a24a'); px(g, x + 3, y + 3, 10, 9, '#6a7a8a');
      px(g, x + 6, y + 4, 4, 4, '#d8a878'); px(g, x + 6, y + 4, 4, 1, '#3a2a1a'); px(g, x + 5, y + 8, 6, 4, '#2a2a3a'); px(g, x + 7, y + 6, 2, 1, '#111');
    } },
    whitewall: { wall: true, solid: true, color: '#e8e6e0', color2: '#c8c6c0', pattern: 'plain' },
    treeline: { solid: true, wall: true, draw: function (g, x, y, info) {
      px(g, x, y, 16, 16, '#0a140c'); px(g, x + 2 + (info.tx % 3), y + 1, 9, 9, '#14281a'); px(g, x + 4, y + 3, 6, 5, '#1c3a24'); px(g, x + 7, y + 10, 2, 6, '#1a120c');
    } },
    nightgrass: { color: '#0e1a12', color2: '#14241a', pattern: 'noise' },
    nightroad: { color: '#14161c', color2: '#1c1e24', pattern: 'noise' }
  };
  var props = {
    samantha: function (g, x, y, t) { // the giant doll: palm-leaf red hair, icy blue eyes, beach-ball face, gavel
      px(g, x - 2, y - 10, 20, 10, '#b01828'); px(g, x - 4, y - 6, 4, 8, '#b01828'); px(g, x + 16, y - 6, 4, 8, '#b01828');
      px(g, x, y - 6, 16, 14, '#f4e4d4'); px(g, x + 3, y - 3, 3, 3, '#5ac8f0'); px(g, x + 10, y - 3, 3, 3, '#5ac8f0');
      if (Math.sin(t * 1.3) > 0.97) { px(g, x + 3, y - 3, 3, 3, '#f4e4d4'); px(g, x + 10, y - 3, 3, 3, '#f4e4d4'); }
      px(g, x + 5, y + 3, 6, 2, '#7a2a8a'); px(g, x + 2, y + 8, 12, 8, '#5a1a6a'); px(g, x + 14, y + 6, 4, 2, '#6a3a1a'); px(g, x + 16, y + 3, 3, 4, '#4a2a10');
    },
    throne: function (g, x, y) { px(g, x + 2, y - 6, 12, 20, '#c9a24a'); px(g, x + 4, y - 4, 8, 10, '#7a1020'); px(g, x + 3, y - 7, 2, 2, '#e83a5a'); px(g, x + 11, y - 7, 2, 2, '#3ac8e8'); px(g, x + 3, y + 8, 10, 4, '#7a1020'); },
    xchair: function (g, x, y) { // execution chair with straps
      px(g, x + 3, y - 4, 10, 10, '#2a2a30'); px(g, x + 2, y + 6, 12, 4, '#2a2a30'); px(g, x + 3, y + 10, 2, 5, '#1a1a1e'); px(g, x + 11, y + 10, 2, 5, '#1a1a1e');
      px(g, x + 2, y + 2, 12, 1, '#7a5a3a'); px(g, x + 2, y + 7, 12, 1, '#7a5a3a'); px(g, x + 14, y - 2, 1, 10, '#c8d0d8'); px(g, x + 13, y - 3, 3, 2, '#e8eef0');
    },
    needletray: function (g, x, y) { px(g, x + 3, y + 8, 10, 2, '#c8d0d8'); px(g, x + 5, y + 6, 6, 1, '#e8eef0'); px(g, x + 11, y + 5, 1, 2, '#9ad'); px(g, x + 7, y + 10, 2, 5, '#888'); },
    pistol: function (g, x, y) { px(g, x + 4, y + 9, 8, 2, '#1a1a1e'); px(g, x + 4, y + 11, 3, 3, '#2a2a30'); },
    shards: function (g, x, y, t) { px(g, x + 4, y + 10, 3, 1, '#aac'); px(g, x + 8, y + 11, 2, 1, '#ccd'); px(g, x + 10, y + 9, 1, 2, '#99a'); if (Math.sin(t * 4) > 0.6) px(g, x + 8, y + 11, 1, 1, '#fff'); },
    deadlamp: function (g, x, y) { px(g, x + 7, y - 14, 2, 30, '#3a3a40'); px(g, x + 3, y - 16, 10, 3, '#2a2a30'); px(g, x + 4, y - 13, 8, 1, '#1a1a1a'); },
    roadsign: function (g, x, y) { px(g, x + 7, y + 2, 2, 13, '#555'); px(g, x - 2, y - 4, 20, 7, '#1a5a2a'); px(g, x - 1, y - 3, 18, 5, '#2a7a3a'); g.fillStyle = '#e8f0e8'; g.font = '4px monospace'; g.textBaseline = 'top'; g.fillText('OLD MILL RD', x - 1, y - 3); },
    ballot: function (g, x, y) { px(g, x + 4, y + 4, 8, 6, '#f0ece0'); px(g, x + 5, y + 5, 6, 1, '#555'); px(g, x + 5, y + 7, 4, 1, '#555'); px(g, x + 11, y + 3, 1, 5, '#e8c15a'); },
    toaster: function (g, x, y) { px(g, x + 2, y + 5, 12, 9, '#b8bcc8'); px(g, x + 3, y + 4, 10, 1, '#d8dce8'); px(g, x + 5, y + 5, 2, 1, '#111'); px(g, x + 9, y + 5, 2, 1, '#111'); px(g, x + 6, y + 9, 4, 3, '#e8323c'); }
  };

  /* ---------------------------------------------------------------------
   * CAST (variants on top of the shared cast)
   * ------------------------------------------------------------------- */
  var cast = {
    trader_hurt: { extends: 'trader', name: 'Trader', accessory: ['tie', 'bandage'] },
    isaiah_bare: { extends: 'isaiah', name: 'Isaiah', accessory: null },
    luna_blind: { extends: 'luna', overlay: ['blindfold', 'freckles', 'watch'] },
    doctor: { extends: 'medic', name: 'Doctor' },
    mannequin_x: { name: 'Mannequin', skin: '#f2ece4', hair: '#e8323c', hairStyle: 'afro', outfit: '#2a2a3a', outfit2: '#2a2a3a', style: 'suit' }
  };

  /* ---------------------------------------------------------------------
   * MAPS
   * ------------------------------------------------------------------- */
  /* --- Doll Room (local layout 16x12; shared if loc_upstairs lands) --- */
  var DOLL_TILES = [
    'YYYYYYYYYYYWWYYY',
    'Y,,,,,,,,,,,,,,Y',
    'Y,,,,,,,,,,,,,,Y',
    'Y,,,,,c,,,c,,,,Y',
    'Y,,,,,,,,,,,,,,Y',
    'Y,,,,c,,RR,,c,,Y',
    'Y,,,,,,,RR,,,,,Y',
    'Y,,,,,c,,,c,,,,Y',
    'Y,,,,,,,,,,,,,,Y',
    'Y,,,,,,,,,,,,,,Y',
    'Y,,,,,,,,,,,,,,D',
    'YYYYYYYYYYYYYYYY'
  ];
  var DP = { arrive: [14, 10], judge: [9, 2], throne: [10, 1], samantha: [7, 1], tbk1: [5, 1], tbk2: [12, 2], trader: [14, 3], ginerva: [13, 7],
    isaiah: [5, 4], annette: [11, 4], luna: [6, 6], tbdoor: [14, 9], window: [11, 1], shelf: [1, 5], lunachair: [6, 5] };
  function dollRoom() {
    var shared = G.shared && G.shared.has(H.doll);
    var base = shared ? G.shared.map(H.doll, {}) : { name: 'The Doll Room', tiles: DOLL_TILES, legend: { Y: 'dollshelf' } };
    var P = {};
    if (shared) { var f = fitter(base, 16, 12); Object.keys(DP).forEach(function (k) { P[k] = f(DP[k]); }); } else P = DP;
    var npcs = [
      { id: 'c15_judge', spec: 'judge_robe', at: P.judge, facing: 'down', talk: [['judge_robe', 'Sit, Miss Luna. Your last walk is coming soon enough.', 'smug']] },
      { id: 'c15_trader', spec: 'trader_hurt', at: P.trader, facing: 'left', talk: async function (api) {
        await api.narrate('He doesn\'t look up. Deep purple bruises ring his eyes, and a single long cut runs across his cheek, so smooth it could only have been done with a blade.');
        await api.think('Whatever spark he had at the lie detector, his father has stamped it out.');
      }, again: [{ think: 'He stares at the floor like it owes him money.' }] },
      { id: 'c15_ginerva', spec: 'ginerva', at: P.ginerva, facing: 'left', talk: async function (api) {
        if (api.get('f_promised_ginerva')) {
          await api.say('ginerva', 'You promised.', { mood: 'sad' });
          await api.think('She means Trader. Repent to his father. As if his father would listen.');
          var c = await api.choice(['"I haven\'t forgotten."', '"Look at him, Ginerva. Look what Silas did."']);
          if (c === 0) await api.say('ginerva', 'See that you don\'t. There isn\'t much time left. For any of us.', { mood: 'tired' });
          else await api.say('ginerva', 'I see it every day, Miss Bartley. I have for twenty-four years.', { mood: 'sad' });
        } else {
          await api.say('ginerva', 'Sit down, Miss Bartley. This is not a social hour.', { mood: 'angry' });
          await api.think('Her ruler isn\'t in her hand today. Her hands won\'t stay still.');
        }
        api.set('ch15_talkGinerva', true);
      }, again: [['ginerva', 'Sit. Down.']] },
      { id: 'c15_annette', spec: 'annette', at: P.annette, facing: 'down', talk: async function (api) {
        await api.say('annette', 'Well, dear. Here we are. Just us girls and the boy.', { mood: 'smug' });
        var c = await api.choice(['"You don\'t deserve to walk out of here."', '"Good luck, Annette. You\'ll need it."', '(Say nothing.)']);
        if (c === 0) { api.add('m_annette', -3); await api.say('annette', 'Deserve. Such a big word for a little room. Nobody here deserves anything, sweetheart. We just get.', { mood: 'smug' }); }
        else if (c === 1) { api.add('m_annette', 5); await api.say('annette', 'Ha! There she is. You remind me of me, you know. Before the arthritis.', { mood: 'happy' }); }
        else await api.say('annette', 'The silent treatment. My late husband tried that too.', { mood: 'smug' });
      }, again: [['annette', 'Save your breath for the cameras, dear.', 'smug']] },
      { id: 'c15_isaiah', spec: 'isaiah', at: P.isaiah, facing: 'right' },
      { id: 'c15_tbk1', spec: 'tb_frog', at: P.tbk1, facing: 'down', talk: [{ narrate: 'A True Believer kneels beneath Samantha. The gold frog mask doesn\'t move.' }] },
      { id: 'c15_tbk2', spec: 'tb_mouse', at: P.tbk2, facing: 'down', talk: [{ narrate: 'Mouse. Tall and reedy. Kneeling like a statue under the dolls.' }] },
      { id: 'c15_tbdoor', spec: 'tb_dog', at: P.tbdoor, facing: 'left' }
    ];
    var objects = [
      { id: 'c15_samantha', at: P.samantha, prop: 'samantha', examine: [{ narrate: 'Samantha. Blood-red palm-leaf hair, icy blue eyes, puffy purple lips, a face like a beach ball. She holds a gavel.' }, { think: 'She\'s also the camera. She has seen every vote I ever cast.' }] },
      { id: 'c15_throne', at: P.throne, prop: 'throne', examine: 'The Judge\'s jeweled throne. It was carried up here for the final week, as if the dolls needed a king.' },
      { id: 'c15_window', at: P.window, solid: false, layer: 1, examine: [{ narrate: 'The window looks over the three-car lot. It\'s raining. It\'s always raining up here.' }, { think: 'Somewhere past the rain is a road, and somewhere past the road is Waverly. Hang on, baby. I\'m coming for you soon.' }] },
      { id: 'c15_shelf', at: P.shelf, solid: false, layer: 1, examine: 'Dolls, floor to ceiling. Red streaks trailing from hollow eyes. Rictus grins.' },
      { id: 'c15_lunachair', at: P.lunachair, solid: false, layer: -1, examine: 'Your folding chair. It squeaks when you breathe.' }
    ];
    if (shared) { base.npcs = (base.npcs || []).concat(npcs); base.objects = (base.objects || []).concat(objects); base.spawn = P.arrive; }
    else { base.npcs = npcs; base.objects = objects; base.spawn = P.arrive; base.ambient = 'tension'; base.tint = '#3a0a1a'; base.tintAlpha = 0.14; base.dark = 0.3; base.playerLight = 40;
      base.lights = [{ at: [7, 1], r: 46, flicker: true }, { at: [8, 6], r: 70 }, { at: [11, 0], r: 30 }]; }
    base.P = P;
    return base;
  }

  /* --- The blindfold walk (local, almost black) --- */
  var blindWalk = {
    name: 'Blindfolded',
    tiles: [
      '###########################',
      '#.........................#',
      '#.........................D',
      '#.........................#',
      '###########################'
    ],
    spawn: [1, 2], ambient: 'drone', dark: 0.96, playerLight: 12, vignette: 0.8, bg: '#000',
    zones: [
      { id: 'c15_step7', at: [8, 1], w: 1, h: 3, once: true, run: [{ think: 'Seven.' }, { narrate: 'A gloved hand on your elbow. Ridged leather. It steers you left, then lets go.' }] },
      { id: 'c15_step14', at: [15, 1], w: 1, h: 3, once: true, run: [{ think: 'Fourteen.' }, { think: 'John. Carol. Kessie. Delphin. Three times I\'ve walked to that table and sentenced someone so I could keep living.' }] },
      { id: 'c15_step21', at: [22, 1], w: 1, h: 3, once: true, run: [{ think: 'Twenty-one. Grandma\'s rule: count seven before you cry. I count, and I don\'t cry.' }] },
      { id: 'c15_booth', at: [25, 1], w: 2, h: 3 }
    ]
  };

  /* --- The Confessional (local 7x5; shared if it lands) --- */
  var CONF_TILES = [
    'ZZZZZZZ',
    'Z,,T,,Q',
    'Z,,,,,Q',
    'Z,,,,,Q',
    'ZZZDZZZ'
  ];
  var CP = { arrive: [3, 3], slip: [3, 1], box: [5, 1], cam: [1, 1] };
  function confessional() {
    var shared = G.shared && G.shared.has(H.conf);
    var base = shared ? G.shared.map(H.conf, {}) : { name: 'The Confessional', tiles: CONF_TILES, legend: { Z: 'leaderwall', Q: 'whitewall' } };
    var P = CP;
    if (shared) { var f = fitter(base, 7, 5); P = {}; Object.keys(CP).forEach(function (k) { P[k] = f(CP[k]); }); }
    var objects = [
      { id: 'c15_slip', at: P.slip, prop: 'ballot', solid: false },
      { id: 'c15_box', at: P.box, prop: 'toaster', examine: 'The ballot box is shaped like a toaster. Somebody in DPE thought that was funny.' },
      { id: 'c15_cam', at: P.cam, prop: 'camera', solid: false, layer: 1, examine: [{ think: 'A red light. The Great Leader on three walls, the nation on the fourth.' }] }
    ];
    base.objects = (base.objects || []).concat(objects);
    base.spawn = P.arrive;
    if (!shared) { base.ambient = 'hum'; base.dark = 0.25; base.playerLight = 30; base.tint = '#2a2010'; base.tintAlpha = 0.12; }
    base.P = P;
    return base;
  }

  /* --- The Gym courtroom (shared, staged with its marks) --- */
  var CRT = 'house_gym_courtroom';
  var CM = {
    luna: mk(CRT, 'defendant_left', [8, 8]), annette: mk(CRT, 'defendant_right', [12, 8]), judge: mk(CRT, 'judge_bench', [10, 2]),
    host: mk(CRT, 'host_floor', [10, 5]), isaiah: mk(CRT, 'contestant_1', [17, 4]), tbL: mk(CRT, 'tb_left', [7, 12]), tbR: mk(CRT, 'tb_right', [13, 12]),
    cage: mk(CRT, 'cage', [10, 13]), mic: mk(CRT, 'mic', [10, 7])
  };
  CM.xchair = [CM.cage[0] + 2, CM.cage[1]];
  CM.doctor = [CM.cage[0] + 3, CM.cage[1]];
  CM.tray = [CM.cage[0] + 3, CM.cage[1] - 1];
  CM.tbC = [CM.cage[0], CM.cage[1] - 2];
  CM.trader = [CM.isaiah[0] - 1, CM.isaiah[1] + 5];
  CM.ginerva = [CM.isaiah[0] - 2, CM.isaiah[1] + 1];
  CM.whisper = [CM.luna[0] - 1, CM.luna[1] - 1];
  function court() {
    var ext = {
      ambient: 'crowd',
      npcs: [
        { id: 'c15_judge', spec: 'judge_robe', at: CM.judge, facing: 'down' },
        { id: 'c15_annette', spec: 'annette', at: CM.annette, facing: 'down' },
        { id: 'c15_isaiah', spec: 'isaiah', at: CM.isaiah, facing: 'left' },
        { id: 'c15_trader', spec: 'trader_hurt', at: CM.trader, facing: 'left' },
        { id: 'c15_ginerva', spec: 'ginerva', at: CM.ginerva, facing: 'left' },
        { id: 'c15_tb1', spec: 'tb_boar', at: CM.tbL, facing: 'up' },
        { id: 'c15_tb2', spec: 'tb_hippo', at: CM.tbR, facing: 'up' },
        { id: 'c15_tb3', spec: 'tb_turtle', at: CM.tbC, facing: 'up' },
        { id: 'c15_doctor', spec: 'doctor', at: CM.doctor, facing: 'left' }
      ],
      objects: [
        { id: 'c15_xchair', at: CM.xchair, prop: 'xchair', solid: false, layer: -1, examine: 'A chair with leather straps at the wrists and ankles. It wasn\'t here last week.' },
        { id: 'c15_tray', at: CM.tray, prop: 'needletray', solid: false, layer: 1 }
      ],
      patch: { holoscreen: {
        left: function () { return G.Game.state.flags.ch15_holo ? 'LUNA' : null; },
        right: function () { return G.Game.state.flags.ch15_holo ? 'ANNETTE' : null; },
        leftVotes: function () { var v = G.Game.state.flags.ch15_holoL; return v == null ? '—' : Number(v).toLocaleString('en-US'); },
        rightVotes: function () { var v = G.Game.state.flags.ch15_holoR; return v == null ? '—' : Number(v).toLocaleString('en-US'); },
        title: 'THE FINAL VOTE', subtitle: 'RIGHT TO LIFE • VOTE SAVE'
      } }
    };
    return G.shared && G.shared.has(H.court) ? G.shared.map(H.court, ext) : { name: 'Courtroom (placeholder)', tiles: ['#'.repeat(24)].concat(Array(18).fill('#' + 'm'.repeat(22) + '#')).concat(['#'.repeat(24)]), spawn: [1, 9], npcs: ext.npcs, objects: ext.objects };
  }

  /* --- Kitchen (shared) + the pantry's garden door --- */
  var KIT = 'house_kitchen';
  var KM = { pantry: mk(KIT, 'pantry', [9, 8]), tea: mk(KIT, 'tea_station', [8, 2]), island: mk(KIT, 'island_west', [3, 5]), arrive: spawns(KIT).from_red_hall || [5, 1] };
  KM.door = [KM.pantry[0], KM.pantry[1] + 2];          // south wall of the walk-in pantry
  KM.annette = KM.tea;
  KM.isaiah = [KM.arrive[0] + 1, KM.arrive[1] + 1];
  function kitchen() {
    var ext = {
      ambient: 'hum', dark: 0.55, playerLight: 44,
      npcs: [
        { id: 'c15_annette', spec: 'annette', at: KM.annette, facing: 'up', talk: async function (api) {
          await api.narrate('Annette is rifling the counter. A paring knife disappears into her cardigan. Then, inexplicably, a banana.');
          await api.say('annette', 'A girl gets peckish on the lam. Don\'t look at me like that.', { mood: 'smug' });
        }, again: [['annette', 'The pantry, dear. Out the back. Do try to keep up.', 'smug']] },
        { id: 'c15_isaiah', spec: 'isaiah_bare', at: KM.isaiah, facing: 'down', talk: [['isaiah_bare', 'Everything is a blur. I\'m navigating by the smell of bleach.', 'fear']] }
      ],
      objects: [
        { id: 'c15_gardendoor', at: KM.door, solid: true, layer: 1, draw: function (g, x, y) { px(g, x + 2, y + 1, 12, 15, '#4a3a28'); px(g, x + 3, y + 2, 10, 13, '#5a4630'); px(g, x + 11, y + 8, 2, 2, '#c9a24a'); } }
      ]
    };
    return G.shared.map(H.kitchen, ext);
  }

  /* --- Grounds (shared): the garden walk to the fence gap --- */
  var GRD = 'house_grounds';
  var GM = { garden: spawns(GRD).garden || [30, 8], gap: mk(GRD, 'fence_gap', [44, 3]) };
  function grounds() {
    return G.shared.map(H.grounds, {
      ambient: 'drone', dark: 0.6,
      npcs: [{ id: 'c15_isaiah', spec: 'isaiah_bare', at: [GM.garden[0] - 1, GM.garden[1]], facing: 'up', talk: [['isaiah_bare', 'Is that the fence? Or a very tall, very thin man?', 'fear']] }],
      zones: [{ id: 'c15_gap', at: [GM.gap[0] - 1, GM.gap[1] - 1], w: 3, h: 2 }],
      remove: ['grounds_perimeter']
    });
  }

  /* --- The night road outside the fence (local, 40x12) --- */
  function roadTiles() {
    var rows = [];
    for (var y = 0; y < 12; y++) {
      var r = '';
      for (var x = 0; x < 40; x++) {
        var c;
        if (y === 0 || y === 11) c = 'Y';
        else if (x === 0) c = '|';
        else if (x < 12) c = (y >= 1 && y <= 2 && x >= 5 && x <= 6) ? 'X' : 'x';
        else if (y === 6 || y === 9) c = '-';
        else if (y === 7 || y === 8) c = '=';
        else c = (((x * 7 + y * 13) % 17) === 0) ? 'P' : 'v';
        r += c;
      }
      rows.push(r);
    }
    return rows;
  }
  var road = {
    name: 'Outside the Fence', tiles: roadTiles(), legend: { Y: 'treeline', v: 'nightgrass', '=': 'nightroad' },
    spawn: [2, 5], ambient: 'drone', dark: 0.8, playerLight: 44, tint: '#0a1030', tintAlpha: 0.2, vignette: 0.6, bg: '#020306',
    lights: [{ at: [6, 3], r: 20, flicker: true }],
    npcs: [{ id: 'c15_isaiah', spec: 'isaiah_bare', at: [2, 6], facing: 'right', talk: [['isaiah_bare', 'I can\'t see the road. I can feel it, though. Asphalt. We\'re out.', 'fear']] }],
    objects: [
      { id: 'c15_shed', at: [5, 1], solid: false, layer: 1, examine: 'The True Believers\' quarters shed. Dark. Someone left a pair of polished pointed shoes on the step.' },
      { id: 'c15_lamp', at: [32, 5], prop: 'deadlamp', examine: 'A dead streetlamp. The bulb is long gone. The only light out here is the stars.' },
      { id: 'c15_sign', at: [36, 5], prop: 'roadsign', examine: 'A green sign, half swallowed by ivy: OLD MILL RD.' }
    ],
    zones: [
      { id: 'c15_alley', at: [8, 1], w: 1, h: 10, once: true },
      { id: 'c15_perim', at: [22, 1], w: 1, h: 10, once: true },
      { id: 'c15_lampzone', at: [30, 1], w: 4, h: 10 }
    ]
  };

  /* ---------------------------------------------------------------------
   * MINIGAMES
   * ------------------------------------------------------------------- */
  function wrapLines(R, s, w, size) { return R.wrap(s, w, size || 7); }

  /* THE STANDOFF: persuasion under a gun. 3 strikes and he fires.
   * params: {insight, penguin, noteLeft, note3, attempt}
   * result: {success, strikes, used:[ids]} */
  var standoff = {
    autoSolve: function () { return { success: true, strikes: 0, used: ['loved'] }; },
    start: function (ctx) {
      var p = ctx.params || {}, R = ctx.R, P = ctx.PAL, I = ctx.input;
      var all = [
        { id: 'dunno', text: '"I dunno, Trader. I just don\'t know."', reply: 'Not good enough.', strike: true },
        { id: 'daughter', text: '"Because I have a daughter."', reply: 'So did she.', strike: true },
        { id: 'penguin', text: '"You raised her hand. You held her."', reply: '...Don\'t. Don\'t you dare.', strike: false, flinch: true, once: true, gate: !!p.penguin },
        { id: 'standup', text: '"Stand up, Trader."', reply: '(a bitter laugh) Was that you? The note? ...Cute. Doesn\'t change anything.', strike: false, once: true, gate: !!p.noteLeft },
        { id: 'loved', text: '"Because she loved you and you loved her and you know she wouldn\'t have wanted this."', reply: '', win: true, gate: (p.insight || 0) >= 3, glow: !!p.note3 }
      ];
      var opts = all.filter(function (o) { return o.gate !== false; });
      var sel = 0, strikes = 0, state = 'pick', line = 'So Luna, tell me, why should I let you live? If you can convince me, I\'ll let you go. Hell, I\'ll even throw in the gun.', said = '', stT = 0, fuse = 1, mood = 'angry', used = [], flinch = 0;
      var FUSE = 16;
      return new Promise(function (resolve) {
        function choose(o) {
          said = o.text; used.push(o.id); stT = ctx.t; ctx.sound('select');
          if (o.win) { state = 'win'; line = ''; mood = 'cry'; ctx.sound('reveal'); return; }
          line = o.reply;
          if (o.flinch) { flinch = 1; mood = 'sad'; ctx.sound('heartbeat'); } else mood = o.strike ? 'angry' : 'smug';
          if (o.strike) { strikes++; ctx.sound('miss'); }
          if (o.once) opts = opts.filter(function (x) { return x !== o; });
          if (strikes === 1 && o.strike && opts.indexOf(o) >= 0) { /* keep */ }
          sel = Math.min(sel, opts.length - 1);
          state = strikes >= 3 ? 'dead' : 'reply';
          if (strikes === 2 && state === 'reply') line += '   (His finger slides from the barrel to the trigger.)';
        }
        ctx.loop(function (dt) {
          flinch = Math.max(0, flinch - dt);
          if (state === 'pick') {
            fuse -= dt / FUSE;
            if (I.pressed('up')) { sel = (sel + opts.length - 1) % opts.length; ctx.sound('blip'); }
            if (I.pressed('down')) { sel = (sel + 1) % opts.length; ctx.sound('blip'); }
            if (I.pressed('ok')) choose(opts[sel]);
            else if (fuse <= 0) { said = '(You say nothing. Your throat has closed.)'; line = 'Better hurry up. Somebody\'s panic button is already pushed.'; strikes++; ctx.sound('miss'); mood = 'angry'; stT = ctx.t; state = strikes >= 3 ? 'dead' : 'reply'; }
          } else if (state === 'reply') {
            if (ctx.t - stT > 0.4 && I.pressed('ok')) { state = 'pick'; fuse = 1; if (strikes === 1 && !said.match(/Wait/)) said = ''; }
          } else if (state === 'win') {
            if (ctx.t - stT > 1.2 && I.pressed('ok')) resolve({ success: true, strikes: strikes, used: used });
          } else if (state === 'dead') {
            if (ctx.t - stT > 1.6) resolve({ success: false, strikes: strikes, used: used });
          }
        }, function (t) {
          var W = ctx.W, Hh = ctx.H;
          R.rect(0, 0, W, Hh, '#0c0406');
          R.rect(0, 0, W, Hh, '#3a0a10', 0.25 + 0.1 * Math.sin(t * 2) + strikes * 0.12);
          // Trader + the gun
          var sx = 14 + (flinch > 0 ? Math.sin(t * 60) * 2 : 0) + (strikes ? Math.sin(t * 23) * strikes * 0.4 : 0);
          R.panel(sx - 4, 30, 96, 104, { accent: P.red, bg: '#14080c' });
          R.img(ctx.portrait('trader_hurt', mood), sx + 4, 36, 2);
          R.text('TRADER', sx + 44, 120, { size: 7, align: 'center', color: P.dim });
          // gun barrel pointing at you
          R.rect(sx + 70, 92, 26, 7, '#1a1a1e'); R.rect(sx + 70, 92, 26, 1, '#4a4a52'); R.rect(sx + 94, 90, 3, 3, '#1a1a1e'); R.rect(sx + 72, 98, 7, 12, '#2a2a30');
          // trigger meter
          R.text('TRIGGER', 14, 140, { size: 7, color: P.dim });
          R.rect(14, 150, 88, 6, '#22161a');
          R.rect(14, 150, Math.min(88, 88 * (strikes / 3) + (state === 'pick' ? 6 * (1 - fuse) : 0)), 6, P.red);
          for (var k = 0; k < 3; k++) { R.rect(14 + k * 14, 162, 10, 10, k < strikes ? P.red : '#2a1a1e'); R.text(k < strikes ? 'x' : '', 19 + k * 14, 163, { size: 7, align: 'center', color: '#000' }); }
          R.text('chances', 58, 164, { size: 6, color: P.faint });
          // his line
          R.panel(118, 30, 256, 52, { accent: P.red });
          var ll = wrapLines(R, line || '...', 244, 8);
          ll.slice(0, 4).forEach(function (s, i) { R.text(s, 124, 36 + i * 11, { size: 8, color: P.text }); });
          if (state === 'pick') {
            R.rect(118, 84, 256 * Math.max(0, fuse), 2, fuse < 0.3 ? P.red : P.amber);
            var y = 92;
            opts.forEach(function (o, i) {
              var lines = wrapLines(R, o.text, 232, 7), on = i === sel;
              var hgt = lines.length * 9 + 4;
              if (on) R.rect(118, y - 2, 256, hgt, '#3a1218', 0.9);
              if (o.glow) R.rect(118, y - 2, 2, hgt, 'rgba(159,184,255,' + (0.5 + 0.5 * Math.sin(t * 4)) + ')');
              lines.forEach(function (s, j) { R.text((j === 0 ? (on ? '> ' : '  ') : '  ') + s, 124, y + j * 9, { size: 7, color: o.glow ? P.think : on ? '#fff' : P.dim, style: o.glow ? 'bold italic' : 'bold' }); });
              if (o.glow && on) R.text('Waverly\'s words', 370, y, { size: 6, align: 'right', color: P.think });
              y += hgt + 2;
            });
            ctx.footer('UP/DOWN choose   ENTER speak   (he won\'t wait forever)');
          } else if (state === 'reply') {
            R.panel(118, 92, 256, 60, { accent: P.think });
            wrapLines(R, 'You: ' + said, 244, 7).slice(0, 5).forEach(function (s, i) { R.text(s, 124, 98 + i * 10, { size: 7, color: P.think, style: 'italic' }); });
            ctx.footer('ENTER');
          } else if (state === 'win') {
            R.panel(118, 92, 256, 60, { accent: P.think });
            wrapLines(R, said, 244, 8).forEach(function (s, i) { R.text(s, 124, 98 + i * 11, { size: 8, color: P.think, style: 'bold italic' }); });
            if (ctx.t - stT > 1.2) ctx.footer('ENTER');
          } else if (state === 'dead') {
            R.rect(0, 0, W, Hh, '#fff', Math.max(0, 1 - (ctx.t - stT) * 2));
            R.text('BANG', W / 2, Hh / 2 - 14, { size: 26, font: 'title', style: '', align: 'center', color: P.red });
          }
          ctx.header('THE STANDOFF', 'Why should he let you live?');
          R.vignette(0.5);
        });
      });
    }
  };

  /* THE CHIP: hold still while Annette cuts with a lens shard.
   * Pain kicks push the marker; keep it in the centre with LEFT/RIGHT.
   * Never fails: a flinch costs progress. result {success, flinches} */
  var chipcut = {
    autoSolve: function () { return { success: true, flinches: 0 }; },
    start: function (ctx) {
      var R = ctx.R, P = ctx.PAL, I = ctx.input;
      var x = 0, v = 0, prog = 0, flinches = 0, kick = 0, nextKick = 1.2, msg = 'Hold still, girl. I\'ve done this on men twice your size.', msgT = 0, done = false, doneT = 0, flash = 0;
      var LINES = ['Steady, dear.', 'There\'s the little devil. Feel it?', 'Almost. Don\'t you dare twitch.'];
      return new Promise(function (resolve) {
        ctx.loop(function (dt) {
          if (done) { if (ctx.t - doneT > 1.4) resolve({ success: true, flinches: flinches }); return; }
          nextKick -= dt;
          if (nextKick <= 0) { kick = (Math.random() < 0.5 ? -1 : 1) * (1.2 + Math.random() * 1.4 + prog); nextKick = 0.7 + Math.random() * 1.1; flash = 0.3; ctx.sound('heartbeat'); }
          v += kick * dt * 3; kick *= Math.pow(0.02, dt);
          v += (Math.random() - 0.5) * dt * 2;
          var d = I.dir();
          if (I.down('left')) v -= dt * 3.2; if (I.down('right')) v += dt * 3.2; void d;
          v *= Math.pow(0.25, dt);
          x += v * dt;
          flash = Math.max(0, flash - dt);
          if (Math.abs(x) < 0.28) prog += dt * 0.14;
          if (Math.abs(x) > 1) {
            flinches++; prog = Math.max(0, prog - 0.18); x = 0; v = 0; kick = 0; ctx.sound('hit'); G.UI.flash('#e8323c', 250);
            msg = ['Hold STILL. Do you want me in an artery?', 'You flinch like a tourist.', 'Breathe, girl. Count to seven if it helps.'][flinches % 3]; msgT = ctx.t;
          }
          var stage = Math.min(2, Math.floor(prog * 3));
          if (ctx.t - msgT > 3 && prog > 0.05) { msg = LINES[stage]; }
          if (prog >= 1) { done = true; doneT = ctx.t; ctx.sound('success'); msg = 'There. A bit of metal in a bloody little puddle. You\'re welcome.'; }
        }, function (t) {
          var W = ctx.W;
          R.rect(0, 0, W, ctx.H, '#08060a');
          R.rect(0, 0, W, ctx.H, '#5a0a10', flash * 1.5 + 0.08 * Math.sin(t * 3) + 0.08);
          // the forearm
          var ay = 74;
          R.rect(40, ay, 300, 34, '#f2cdb0'); R.rect(40, ay, 300, 3, '#e0b898'); R.rect(40, ay + 31, 300, 3, '#d8a888');
          R.rect(330, ay - 4, 24, 42, '#f2cdb0'); // wrist
          R.rect(300, ay + 2, 26, 30, '#1a1a1e'); R.rect(304, ay + 6, 18, 18, '#2a3a4a'); // the watch
          var cx = 150, cw = 80;
          R.rect(cx, ay + 15, cw * Math.min(1, prog), 3, '#8a1018'); // the cut
          R.rect(cx + cw * Math.min(1, prog) - 2, ay + 8, 3, 14, '#c8d8f0'); // the shard
          R.rect(cx + 30, ay + 12, 10, 8, 'rgba(60,60,80,0.35)'); // the chip under the skin
          R.text('L', cx - 14, ay + 12, { size: 7, color: P.faint });
          // steadiness bar
          var by = 140, bw = 240, bx = (W - bw) / 2;
          R.rect(bx, by, bw, 10, '#1a1418');
          R.rect(bx + bw / 2 - bw * 0.14, by, bw * 0.28, 10, '#1f3a1a');
          R.rect(bx, by, 2, 10, P.red); R.rect(bx + bw - 2, by, 2, 10, P.red);
          var mx = bx + bw / 2 + Math.max(-1, Math.min(1, x)) * bw / 2;
          R.rect(mx - 2, by - 3, 4, 16, Math.abs(x) < 0.28 ? P.neon : P.amber);
          R.text('STEADY', W / 2, by + 14, { size: 6, align: 'center', color: P.dim });
          R.rect(bx, by + 26, bw, 4, '#1a1418'); R.rect(bx, by + 26, bw * Math.min(1, prog), 4, P.red);
          R.text('Annette: ' + msg, W / 2, 40, { size: 8, align: 'center', color: P.text });
          ctx.header('THE CHIP', 'Flinches ' + flinches);
          ctx.footer('Hold LEFT / RIGHT to stay in the green while she cuts');
          R.vignette(0.6);
        });
      });
    }
  };

  /* THE COUNT: SAVE counters leap, trade the lead, freeze at the canon totals. */
  var savecount = {
    autoSolve: function () { return { success: true }; },
    start: function (ctx) {
      var R = ctx.R, P = ctx.PAL, I = ctx.input, FL = 1262904, FA = 1263104, DUR = 9;
      return new Promise(function (resolve) {
        var L = 0, A = 0, done = false;
        ctx.loop(function (dt) {
          void dt;
          var k = Math.min(1, ctx.t / DUR), e = 1 - Math.pow(1 - k, 2.2);
          var wob = Math.sin(ctx.t * 7.3) * (1 - k) * 18000;
          L = Math.round(FL * e + wob); A = Math.round(FA * e - wob);
          if (k >= 1 && !done) { done = true; L = FL; A = FA; ctx.sound('sting'); }
          if (k > 0.2 && Math.floor(ctx.t * 8) % 3 === 0 && !done) ctx.sound('blip');
          if (done && ctx.t > DUR + 1 && I.pressed('ok')) resolve({ success: true });
          if (done && ctx.t > DUR + 5) resolve({ success: true });
        }, function (t) {
          var W = ctx.W;
          R.rect(0, 0, W, ctx.H, '#0a0612');
          R.rect(20, 34, W - 40, 140, '#160c22'); R.rect(20, 34, W - 40, 1, P.gold); R.rect(20, 173, W - 40, 1, P.gold);
          R.text('THE FINAL VOTE • SAVE', W / 2, 40, { size: 9, align: 'center', color: P.gold });
          var rem = Math.max(0, Math.ceil(DUR - ctx.t));
          R.text(done ? 'TIME' : (rem <= 6 ? 'TWENTY SECONDS' : 'LINES ARE OPEN'), W / 2, 54, { size: 7, align: 'center', color: done ? P.red : P.dim });
          [['luna', 'LUNA', L, 60], ['annette', 'ANNETTE', A, W - 140]].forEach(function (c) {
            R.img(ctx.portrait(c[0], done ? (c[0] === 'luna' ? 'shock' : 'smug') : 'neutral'), c[3] + 20, 70, 1.5);
            R.text(c[1], c[3] + 40, 134, { size: 8, align: 'center', color: '#fff' });
            R.text(Number(Math.max(0, c[2])).toLocaleString('en-US'), c[3] + 40, 148, { size: 12, align: 'center', color: P.neon, font: 'mono' });
          });
          R.text('VS', W / 2, 100, { size: 10, align: 'center', color: P.gold });
          if (done) R.text('MORE SAVES SURVIVES', W / 2, 186, { size: 7, align: 'center', color: P.dim });
          R.scanlines(0.2); R.static(0.04);
          ctx.header('CARNIVAL OF JUSTICE', 'LIVE');
          if (done) ctx.footer('ENTER');
        });
      });
    }
  };

  /* ---------------------------------------------------------------------
   * STEALTH MAPS (engine stealth minigame)
   * ------------------------------------------------------------------- */
  var HALL_STEALTH = {
    title: 'THE RED HALL', prompt: 'True Believers are sweeping the hall. Reach the service stair.',
    map: [
      '##########################',
      '#.k.#..k..#..k..#..k..#..#',
      '#@.......................#',
      '#RRRRRRRRRRRRRRRRRRRRRRRR#',
      '#RRRRRRRRRRRRRRRRRRRRRRRR#',
      '#........................#',
      '#..P...#....P...#...P..*.#',
      '##########################'
    ],
    guards: [{ path: [[5, 3], [19, 3]], speed: 24, range: 46, fov: 70, spec: 'tb_dog' }, { path: [[21, 5], [8, 5]], speed: 20, range: 42, fov: 70, spec: 'tb_deer' }],
    cameras: [{ at: [12, 1], angle: 90, sweep: 70, range: 40, speed: 0.7, fov: 34 }],
    lives: 3, playerSpec: 'luna'
  };
  var GARDEN_STEALTH = {
    title: 'THE GARDEN', prompt: 'Floodlights sweep the almond trees. Time it. Reach the fence.',
    legend: { '|': 'bars', 'P': 'plant' },
    map: [
      '|||||||||||||||||||*||||||',
      '|........................|',
      '|..P.....P.....P.....P...|',
      '|........................|',
      '|-------------------------|',
      '|....P......P.....P......|',
      '|........................|',
      '|..P.....P.....P.....P...|',
      '|........................|',
      '|@.......................|',
      '##########################'
    ],
    guards: [{ path: [[3, 4], [22, 4]], speed: 18, range: 40, fov: 70, spec: 'tb_boar' }],
    cameras: [{ at: [1, 9], angle: 300, sweep: 70, range: 110, speed: 0.6, fov: 22 }, { at: [24, 9], angle: 240, sweep: 70, range: 110, speed: 0.75, fov: 22 }],
    lives: 3, playerSpec: 'luna'
  };

  /* ---------------------------------------------------------------------
   * HELPERS
   * ------------------------------------------------------------------- */
  async function stealthLoop(api, params, skipLine) {
    for (var tries = 0; tries < 3; tries++) {
      var r = await api.minigame('stealth', params);
      if (r.success) return true;
      if (tries === 0) await api.say('annette', 'Again. Slower. They\'re men in masks, not owls.', { mood: 'angry' });
      else if (tries === 1) { await api.say('annette', skipLine, { mood: 'smug' }); return false; }
    }
    return false;
  }
  function bang(api, n) {
    api.sound('hit'); api.sound('buzzer'); api.flash('#ffffff', 220);
    return api.shake(380, n || 4);
  }

  /* ---------------------------------------------------------------------
   * CHAPTER
   * ------------------------------------------------------------------- */
  var DOLL = dollRoom(), CONF = confessional();
  var maps = {};
  maps[H.doll] = DOLL;
  maps[H.conf] = CONF;
  maps[BLIND] = blindWalk;
  maps[H.court] = court();
  maps[H.kitchen] = kitchen();
  maps[H.grounds] = grounds();
  maps[ROAD] = road;

  G.registerChapter({
    id: 'ch15',
    title: 'Right to Live',
    kicker: 'FRIDAY 9 FEBRUARY • THE FINALE',
    maps: maps,
    cast: cast,
    tiles: tiles,
    props: props,
    minigames: { standoff: standoff, chipcut: chipcut, savecount: savecount },
    testDefaults: {
      m_trader_insight: 5, f_mem_penguin_arm: true, f_trader_note_left: true, f_note3_decoded: true, f_note2_decoded: true,
      f_isaiah_reconciled: true, f_promised_ginerva: false, m_isaiah: 50, m_annette: 40, m_audience: 45, m_waverly: 60
    },

    start: async function (api) {
      api.setPlayer('luna');
      api.set({ ch15_holo: false, ch15_holoL: null, ch15_holoR: null });

      /* ============ 1. THE DOLL ROOM: the final private vote opens ============ */
      await api.goRoom(H.doll, { at: DOLL.P.arrive, facing: 'left' });
      await api.narrate('The final private vote. Millions of people are tuning in to find out who makes the final two. You even struggled out of bed and into the shower this morning.');
      await api.think('No matter how bad things are, I still have a goal. Hang on, Waverly. I\'m coming for you soon.');
      api.onAir(true); api.approval(true);
      api.lowerThird('RIGHT TO LIFE', 'The Final Private Vote • LIVE');
      await api.narrate('Isaiah won\'t look at you. He opens a thick book to somewhere in the middle as you step through the door. Annette smiles sweetly.');
      api.lockPlayer();
      await api.pan('c15_judge', 700);
      await api.say('judge_robe', ['It has been quite a ride to get here. You have all undergone many challenges to arrive at this point.', 'Your fellow contestants who were deemed unworthy of redemption have perished. One amongst you will soon join their number. The last one.'], { mood: 'smug' });
      await api.say('judge_robe', ['Alas, there can only be one winner and one runner up. Miss Luna lost the last competition, so her name will not appear on your slips.', 'Beginning with the winner, you will each be walked to the Confessional. Blindfolded. As tradition demands.'], { mood: 'neutral' });
      await api.pan('c15_trader', 600);
      await api.think('Trader stands against the wall in his subordinate pose. Bruises like thumbprints around both eyes. A long, clean cut across his cheek.');
      await api.cameraReset(500);
      api.lowerThird(null);
      await api.narrate('Annette goes first, a hood over her white tufts, cane tapping. Then Isaiah, his book left face-down on his chair. Then a gloved hand on your shoulder.');
      await api.say('tb_dog', 'Contestant Luna. Hold still.', { name: 'True Believer' });
      api.unlockPlayer();

      /* ============ 2. THE BLINDFOLD WALK ============ */
      await api.fadeOut(500);
      api.setPlayer('luna_blind');
      await api.goRoom(BLIND, { at: [1, 2], facing: 'right' });
      await api.think('The blindfold smells of other people\'s sweat. Last time they walked me like this, my head went back to the closet at Columbus.');
      await api.think('Not this time. This time I count. Sevens. Like Grandma taught me, like I taught Waverly.');
      api.objective('Walk. Count your steps.');
      await api.waitForZone('c15_booth');
      api.objective(null);

      /* ============ 3. THE CONFESSIONAL ============ */
      api.setPlayer('luna');
      await api.goRoom(H.conf, { at: CONF.P.arrive, facing: 'up' });
      await api.narrate('The blindfold comes off. The Great Leader smiles at you from three walls: reading to children, saluting soldiers, staring. The fourth wall is fresh white paint.');
      await api.think('A small table. A slip of paper. A camera with a red light. My third time choosing who dies.');
      api.objective('Cast your vote');
      await api.waitForInteract('c15_slip');
      api.objective(null);
      await api.narrate('The slip lists two names. ANNETTE. ISAIAH.');
      var voted = false;
      while (!voted) {
        var v = await api.choice([
          '(Write ANNETTE.)',
          '(Write ISAIAH.)',
          '(Hold the pencil. Think.)'
        ], { autoPick: 0 });
        if (v === 0) voted = true;
        else if (v === 1) {
          await api.narrate('The pencil touches the I. Your hand won\'t make the next stroke.');
          await api.think('I won\'t. Not him. Annette has to name him; she has no one else. If I name him too, he\'s the one in that chair beside me tonight.');
        } else {
          await api.think('John. Carol. Kessie. Delphin. I\'ll never stop feeling guilty about it. If I ever do, that will be the day I march myself straight to the execution chamber.');
        }
      }
      api.set('ch15_votedAnnette', true);
      await api.say('luna', 'Annette. Because she\'s the only person that competed on this show that deserves it, and if she wins then redemption means nothing.');
      api.approval('+3');
      await api.narrate('You fold the slip into the toaster-shaped box. It swallows it with a little ding.');

      /* ============ 4. THE COUNT ============ */
      await api.fadeOut(500);
      await api.goRoom(H.doll, { at: DOLL.P.luna, facing: 'up' });
      api.lockPlayer();
      await api.say('judge_robe', 'The votes are in. Let us hear them, in the order they were cast.', { mood: 'smug' });
      await api.say('annette', 'Isaiah. Much as I would prefer to vote for Luna, as she lost the competition, I have been given no choice.', { mood: 'smug' });
      await api.narrate('Her hands tremble slightly. Nerves, or palsy. With Annette you never know which.');
      await api.say('isaiah', ['Annette. It would have been her either way.', 'Luna\'s made plenty of mistakes, but Annette is a sociopath. If the people watching have any sense, they\'ll realise it\'s a far worse move to unleash a murderer back into society than a flawed woman who truly believes she is doing the right thing to protect her child.']);
      await api.think('My heart feels swollen to twice its size. Such a simple thing, the belief of another person.');
      await api.say('judge_robe', 'And Miss Luna: Annette. Two votes to one.', { mood: 'neutral' });
      await api.say('judge_robe', ['The terms have been set. The competitors have been chosen. It is time for the public to vote on one last execution.', 'Luna. Annette. I expect you both ready to present your arguments in thirty minutes.'], { mood: 'smug' });
      api.onAir(false);
      api.unlockPlayer();

      /* ============ 5. THIRTY MINUTES (free roam) ============ */
      api.onInteract('c15_isaiah', async function (api2) {
        if (api2.get('ch15_talkIsaiah')) { await api2.say('isaiah', 'We\'ll worry about the rest when we\'re in the viewing room watching Annette get what she deserves.'); return; }
        await api2.say('isaiah', 'Do you mind if I sit here?');
        await api2.narrate('He shifts from foot to foot, like the day you met in the library.');
        await api2.say('luna', 'Please.');
        if (api2.get('f_isaiah_reconciled')) {
          await api2.say('isaiah', ['I\'m sorry. I know it wasn\'t fair of me to judge you at the competition.', 'Only one of us can win this thing, after all. None of us can be trusted.'], { mood: 'sad' });
          var a = await api2.choice(['"You have nothing to apologise for. You\'re the only one of us who is actually a good person."', '"You were right to judge me."']);
          if (a === 0) {
            api2.add('m_isaiah', 10);
            await api2.say('isaiah', 'I don\'t know about that.', { mood: 'sad' });
            await api2.say('luna', 'It\'s true. I wish I could beat Annette and give up, let you win. But I\'m fighting for more than just myself.');
            await api2.say('isaiah', 'That doesn\'t matter. What matters right now is getting through this vote.');
            await api2.say('luna', 'Amen to that.');
          } else {
            api2.add('m_isaiah', 4);
            await api2.say('isaiah', 'Maybe. But I said it to hurt you. That part wasn\'t right.', { mood: 'sad' });
          }
        } else {
          await api2.say('isaiah', 'I don\'t forgive you. Not yet. But I don\'t want you to go into that room thinking I want you dead.', { mood: 'sad' });
          api2.add('m_isaiah', 5);
        }
        await api2.narrate('Silence grows over you both.');
        await api2.say('isaiah', 'You\'re a good mother. Better than mine, for sure. I hope you know that.');
        var b = await api2.choice(['"Forgive her someday. Your mother."', '(Squeeze his hand.)']);
        if (b === 0) {
          await api2.say('luna', ['I saw the video of your mother back in the maze. She cares about you more than you realise. Her eyes when she talked about you... it\'s like she was broken.', 'If you get out of here, you should try to forgive her. Not right away. But sometime.']);
          await api2.say('isaiah', 'I\'ll think about it.');
          await api2.say('luna', 'That\'s all you can do.');
          api2.add('m_isaiah', 3);
        } else {
          api2.add('m_isaiah', 5);
          await api2.narrate('He lets you. His palm is damp. Neither of you says anything for a long time.');
        }
        api2.set('ch15_talkIsaiah', true);
      });
      await api.until(function (f) { return f.ch15_talkIsaiah; }, { objective: 'Thirty minutes. Talk to Isaiah.', targets: ['c15_isaiah'] });
      await api.think('The rest of the wait passes far too quickly for my comfort.');
      api.objective('When you\'re ready, go to the door');
      await api.waitForInteract('c15_tbdoor');
      api.objective(null);
      await api.say('tb_dog', 'It\'s time.', { name: 'True Believer' });

      /* ============ 6. THE PUBLIC VOTE ============ */
      await api.fadeOut(500);
      await api.goRoom(H.court, { at: CM.luna, facing: 'down' });
      api.lockPlayer();
      api.onAir(true); api.approval(true);
      api.lowerThird('THE FINAL VOTE', 'Luna vs Annette • the public votes to SAVE');
      api.set('ch15_holo', true);
      await api.narrate('The gym courtroom. Every seat in the glass gallery is full; they paid for a finale. The mannequin jury stares with its painted tears. The holoscreen shows two faces.');
      await api.say('judge_robe', ['As this is the last vote, we\'ll break from tradition. The loser of the private vote will be the first to explain why she deserves to live.', 'Annette. It is your moment.'], { mood: 'smug' });
      api.lowerThird('ANNETTE', 'Contestant • 76');
      await api.say('annette', [
        'You\'ve all been watching us for some time now. I\'m not going to pretend to be some kind of saint. I\'ve made many mistakes, but I\'ve certainly had some fun along the way.',
        'I\'m an old lady now. Despite what that young man said, even if I do go free, I pose no threat to society in my current state.',
        'The woman I\'m facing has many long years of life ahead of her. She constantly justifies her crimes by hiding behind her daughter, an eleven-year-old child, and there is nothing more sickening than that.',
        'Which would you rather have pass you on the street: an old lady who is so weak that she will be dead within the next ten years, or a young woman who has killed before and will kill again?'
      ], { mood: 'smug' });
      api.approval('-3');
      api.lowerThird('LUNA', 'Contestant #3');
      await api.think('One more fight. It all comes down to this.');
      var plea = await api.choice([
        '"...A vote for me is a vote for your children, and against murderers."',
        '"You watched her poison Kessie\'s tea and laugh about it."',
        '"I\'m not sorry. I\'d do it all again for my daughter."'
      ]);
      if (plea === 0) {
        await api.say('luna', [
          'Annette is right, you have been watching us for a while now. You\'ve seen the kind of person she is. Time and time again she\'s hurt and manipulated those around her.',
          'She\'s playing you, can\'t you see? She acts harmless, but if you let her go she will kill again, and this time she won\'t get caught.',
          'My daughter is the most important person in the world to me, and I know there are thousands of parents out there who feel the same way. These are the people I\'m talking to right now.',
          'Please, vote for me, because a vote for me is a vote for your children and against murderers. Thank you.'
        ]);
        api.approval('+6');
      } else if (plea === 1) {
        await api.say('luna', ['She drugged Kessie. She drugged me. She sat in that kitchen pouring tea for people she\'d already decided to bury.', 'She told you she\'s harmless. You watched her. Believe your own eyes.'], { mood: 'angry' });
        api.approval('+2');
      } else {
        await api.say('luna', ['I\'m not going to beg. I did what I did to keep my little girl fed and safe.', 'I\'d do it again. Every mother watching knows she would too.'], { mood: 'angry' });
        api.approval('-2');
      }
      api.lowerThird(null);
      await api.think('I did the best I could. But will it be enough?');
      await api.say('judge_robe', 'It\'s time.', { mood: 'neutral' });
      // Trader slips over while the counters run
      await api.move('c15_trader', CM.whisper, { speed: 60 });
      api.face('c15_trader', 'player');
      await api.say('trader_hurt', 'Remember, people love a good show above all else. Expect more from them and you\'ll be disappointed.', { mood: 'smug' });
      await api.narrate('He shoots you a grin. The sparkle is back in his eyes for the first time since his father hijacked his dreams.');
      await api.say('trader_hurt', 'Pay close attention, Miss Luna. I think you\'ll be very interested in what happens next.', { mood: 'smug' });
      api.placeNpc('c15_trader', CM.trader, 'left');
      await api.narrate('When you look back, he\'s against the wall in his subordinate pose. Almost like he never left.');
      await api.minigame('savecount', {});
      api.set({ ch15_holoL: 1262904, ch15_holoR: 1263104 });
      await api.tv({ speaker: 'judge_robe', headline: 'THE FINAL VOTE', text: 'LUNA 1,262,904 SAVES  •  ANNETTE 1,263,104 SAVES', tag: 'LIVE', ticker: 'ANNETTE IS SAVED • LUNA FACES JUDGMENT • ' });
      await api.say('isaiah', 'No!', { mood: 'shock' });
      api.sound('applause');
      await api.say('annette', ['I didn\'t think they\'d actually do it.', 'They actually chose little old me over the martyr. Who\'d have thought?'], { mood: 'happy' });
      await api.think('This is the end, I tell myself, trying to tease out some kind of reaction. I am going to die.');
      await api.think('Nothing. Numbness. Maybe even a little relief. Perhaps death will be like going to sleep after being kept awake for a torturously long time.');
      await api.say('judge_robe', ['The viewers have spoken. Annette wins the public vote, and Luna will be executed.', 'No cage tonight. The audience paid for a finale. Doctor?'], { mood: 'smug' });

      /* ============ 7. THE CHAIR ============ */
      await api.move('c15_tb1', [CM.luna[0] - 1, CM.luna[1]], { speed: 50 });
      await api.narrate('Two True Believers take your arms. The carpet runs past the Cage to a chair you hadn\'t noticed. Leather straps at the wrists and ankles.');
      await api.fadeOut(300);
      api.teleport(CM.xchair, 'up');
      api.placeNpc('c15_tb1', [CM.xchair[0] - 1, CM.xchair[1] - 1], 'right');
      await api.fadeIn(300);
      api.sound('step');
      await api.narrate('The straps bite. A white-coated doctor taps a syringe and holds it up to the light, for the cameras.');
      await api.think('I won\'t beg. Not for them. Waverly is going to watch this one day, and she\'s going to see me face it.');
      await api.pan('c15_judge', 500);
      await api.move('c15_judge', [CM.host[0], CM.host[1] + 1], { speed: 40 });
      api.face('c15_judge', 'c15_trader');
      await api.say('judge_robe', [
        'How does it feel, boy? The woman you loved and her daughter, both slain on the set of the shows you purported to rule over.',
        'You should know by now that the only person who controls you is me, and you will never escape my grasp.'
      ], { mood: 'smug' });
      await api.pan('c15_trader', 400);
      await api.narrate('Trader raises his head. His expression is pure fury. He reaches into his pocket, pulls out a gun, and points it at his father.');
      api.addObject({ id: 'c15_gunglint', at: [CM.trader[0], CM.trader[1]], prop: 'sparkle', solid: false, layer: 1 });
      await api.say('judge_robe', 'You wouldn\'t. You\'ve always been a coward, just like your bitch of a mother -', { mood: 'angry' });
      await bang(api, 6);
      api.remove('c15_judge');
      api.addObject({ id: 'c15_blood1', at: [CM.host[0], CM.host[1] + 1], prop: 'blood', solid: false, layer: -1 });
      await api.narrate('BANG.');
      await api.think('With one little movement, anything can happen. Civilisations crumble. Families break apart.');
      await api.narrate('With one pull of the trigger, Trader kills his father: the potential next Great Leader, the head of the Department of Punitive Entertainment.');
      await bang(api, 3); api.remove('c15_tb1'); api.addObject({ id: 'c15_blood2', at: [CM.xchair[0] - 1, CM.xchair[1] - 1], prop: 'blood', solid: false, layer: -1 });
      await bang(api, 3); api.remove('c15_tb2'); api.addObject({ id: 'c15_blood3', at: CM.tbR, prop: 'blood', solid: false, layer: -1 });
      await bang(api, 3); api.remove('c15_tb3'); api.addObject({ id: 'c15_blood4', at: CM.tbC, prop: 'blood', solid: false, layer: -1 });
      await api.narrate('Three more pulls, and the True Believers rushing him drop where they stand. Behind the glass, the gallery screams and empties: shoes, programs, a child\'s balloon drifting against the ceiling.');
      api.ambient('tension');
      api.lowerThird(null);
      await api.move('c15_doctor', [CM.doctor[0] + 2, CM.doctor[1] + 2], { speed: 70 });
      api.remove('c15_doctor');
      await api.narrate('The doctor drops the syringe and runs. Then the barrel swings, and it\'s pointing at your head.');
      await api.cameraReset(400);
      await api.move('c15_ginerva', [CM.trader[0] - 1, CM.trader[1] - 1], { speed: 25 });
      await api.say('ginerva', 'It\'s going to be okay, Tray.', { mood: 'sad' });
      await api.say('trader_hurt', 'Shut up! I can\'t believe you betrayed me. And to him of all people. You know how he is. You know what he did to me.', { mood: 'angry' });
      await api.say('ginerva', 'I do. And I\'ve regretted it every day since.', { mood: 'cry' });
      if (api.get('f_promised_ginerva')) await api.think('She looks at me over his shoulder. You promised. I did. I just didn\'t think it would look like this.');
      await api.say('trader_hurt', 'If you\'ve ever cared about me... then wait for me to finish.', { mood: 'sad' });
      await api.say('ginerva', 'I will.', { mood: 'sad' });
      await api.say('annette', 'Don\'t be stupid, girl. Even if you ran now, the chip would have you dead by morning.', { mood: 'neutral' });
      await api.think('Right. The chip. Buried under my skin, so easy to forget until somebody\'s goes off.');

      /* --- the straps --- */
      if (api.get('m_isaiah') >= 60) {
        await api.narrate('In the panic, Isaiah has crept along the bench. Thin fingers find the buckle at your wrist, then your ankles. He doesn\'t say a word.');
        api.placeNpc('c15_isaiah', [CM.xchair[0] - 1, CM.xchair[1]], 'right');
        await api.say('isaiah', '(whispering) Don\'t thank me. Just don\'t die.', { mood: 'fear' });
        api.set('ch15_isaiahUntied', true);
      } else {
        await api.think('Isaiah is frozen on the bench. Nobody is coming. Fine. The left strap is looser. Thin wrists. Grandma used to say I had bird bones.');
        await api.minigame('qte', { mode: 'mash', target: 26, time: 6, decay: 6, title: 'THE STRAP', prompt: 'Work your wrist free. Mash SPACE.' });
        await api.narrate('Skin tears. The strap gives. You work the rest loose with your free hand while every eye is on the gun.');
      }

      /* ============ 8. THE STANDOFF ============ */
      await api.say('trader_hurt', [
        'Okay. Here\'s what we\'re going to do. I\'m the host of this show, and you\'re my contestants. We had an intruder for a bit, but he\'s been taken care of.',
        'Luna just lost the public vote, and so she needs to be executed -'
      ], { mood: 'angry' });
      await api.say('isaiah', 'No!', { mood: 'shock' });
      await api.say('trader_hurt', ['Did I finish? No? Then keep your mouth shut.', 'Like I said, Luna lost the vote. But as the host of the show, I have the right to add an extra step to the process. I\'m the king of this domain and my word is law.'], { mood: 'angry' });
      await api.think('How many times have I been forced to justify my existence? To a crowd. To my friends. To the world. And now to Trader.');
      var insight = api.get('m_trader_insight');
      var deaths = 0;
      while (true) {
        var st = await api.minigame('standoff', {
          insight: insight, penguin: !!api.get('f_mem_penguin_arm'), noteLeft: !!api.get('f_trader_note_left'), note3: !!api.get('f_note3_decoded'), attempt: deaths
        });
        if (st.success) break;
        deaths++;
        api.sound('fail');
        await api.slides([{ style: 'black', title: 'BANG', text: 'The world goes white, then nothing.\n\nThe last thing you think about is a fridge door, and a row of numbers in a little girl\'s handwriting.' }]);
        await api.slides([{ style: 'card', title: 'NOT YET', text: 'One day. But not today. Try again.' }]);
        if (insight < 3 && deaths >= 2) {
          // (constraint: m_trader_insight < 3 is unreachable on the canon path; never softlock the finale)
          await api.think('Think. What do you actually know about him? He hosted her show. He raised her hand. He screamed that the women in her family make you love them. He loved her.');
          insight = 3; api.set('ch15_insightFallback', true);
        }
        await api.say('trader_hurt', 'So Luna, tell me. Why should I let you live?', { mood: 'angry' });
      }
      api.set('ch15_standoffDeaths', deaths);
      await api.narrate('Trader\'s arm drops as if the gun has burned him.');
      await api.say('trader_hurt', [
        'She didn\'t kill herself. You hear me?',
        'I raised her hand and he had a man cut her throat while I was still holding it. Then they made the tape.'
      ], { mood: 'cry' });
      await api.think('I\'m so sorry, Luna. I love you. The tape. Twenty-four years of hating her for leaving me, and she never left. They took her.');
      await api.narrate('You stand. You walk to him. You take the gun out of his fingers, and he lets you.');
      api.addObject({ id: 'c15_dropped', at: [CM.trader[0], CM.trader[1] + 1], prop: 'pistol', solid: false, layer: -1 });
      api.remove('c15_dropped');
      await api.narrate('Ginerva folds him into her arms. He clutches her like a lifeline and weeps.');

      /* ============ 9. THE CHOICE ============ */
      await api.say('annette', 'Do it, girl. Kill him. Burn bright.', { mood: 'smug' });
      await api.think('After everything he\'s done to me. The hall that night. The pain button. My mother\'s show.');
      var kill = await api.choice([
        '(Lower the gun.) "No. I won\'t give them the pleasure."',
        '(Pull the trigger.)'
      ]);
      if (kill === 1) {
        api.set('f_killed_trader', true);
        api.set('f_knee_shot', false);
        await bang(api, 6);
        api.remove('c15_trader');
        api.addObject({ id: 'c15_blood5', at: CM.trader, prop: 'blood', solid: false, layer: -1 });
        await api.say('ginerva', 'TRAY!', { mood: 'cry' });
        await api.narrate('Ginerva sinks to the floor with him. She doesn\'t scream again. She doesn\'t look at you.');
        await api.say('annette', 'Well now. You\'ve done the hard part, dear. The rest is just plumbing.', { mood: 'happy' });
        api.add('m_annette', 5);
        await api.think('My hand won\'t stop shaking. I gave them the pleasure after all. The whole country, watching.');
      } else {
        api.set('f_killed_trader', false);
        await api.say('luna', 'No. I won\'t give them the pleasure.');
        api.approval('+5');
        await api.say('annette', 'Pity. It would have been very good television.', { mood: 'smug' });
      }

      /* ============ 10. THE CHIPS ============ */
      await api.say('annette', 'That\'s our cue. Let\'s go, kiddos.', { mood: 'smug' });
      await api.say('luna', 'Wait. What about the chips? You just finished telling me they\'d have me dead by morning.');
      await api.narrate('You turn the gun on Annette.');
      await api.say('luna', 'Cut them out. Your hands were good enough for all those men.', { mood: 'angry' });
      if (!api.get('f_killed_trader')) {
        await api.say('annette', 'And why would I do a thing like that, dear? You haven\'t got the guts.', { mood: 'smug' });
        var how = await api.choice([
          '(Shoot Trader in the knee.)',
          '(Step close. Press the barrel to her temple.)'
        ]);
        if (how === 0) {
          api.set('f_knee_shot', true);
          await bang(api, 4);
          await api.say('trader_hurt', 'AAAGH!', { mood: 'cry' });
          await api.say('isaiah', 'Luna!', { mood: 'shock' });
          await api.say('luna', 'Now he can\'t follow us.');
          await api.narrate('You swing the barrel back to Annette.');
          await api.say('annette', 'Well now.', { mood: 'happy' });
          api.add('m_annette', 5);
        } else {
          api.set('f_knee_shot', false);
          await api.narrate('You cross the floor in three steps and press the barrel to her papery temple. A long beat. The clock on the holoscreen ticks.');
          await api.say('annette', '...Fine. Fine! Goodness. All this fuss over a little surgery.', { mood: 'angry' });
          api.add('m_annette', -3);
        }
      } else {
        await api.say('annette', 'Oh, I was going to anyway, dear. A girl doesn\'t get to my age by waiting for the cavalry.', { mood: 'smug' });
      }
      if (api.get('m_annette') >= 50) await api.say('annette', 'You\'ve got grit, I\'ll give you that.', { mood: 'happy' });
      await api.say('annette', 'Glasses boy, how well can you see without them lenses?', { mood: 'smug' });
      await api.say('isaiah', 'Oh, um, my vision is moderately impaired, but it mostly just affects things like reading and -', { mood: 'fear' });
      await api.say('annette', 'Good enough.', { mood: 'smug' });
      api.sound('hit');
      api.setSpec('c15_isaiah', 'isaiah_bare');
      api.addObject({ id: 'c15_shards', at: [CM.luna[0], CM.luna[1] + 1], prop: 'shards', solid: false, layer: -1 });
      await api.narrate('She yanks the glasses off his face, drops them, and stomps. She comes up with a crescent of lens between two fingers.');
      await api.say('isaiah_bare', 'But why... my glasses?', { mood: 'shock' });
      await api.say('annette', 'Don\'t ask questions if you don\'t want to be left behind. Arm, girl. Left one. And keep that gun on me if it makes you feel better.', { mood: 'smug' });
      var cut = await api.minigame('chipcut', {});
      api.set('ch15_flinches', cut.flinches || 0);
      await api.narrate('A bead of metal no bigger than a grain of rice, sitting in a bloody little puddle on the floor. Annette does Isaiah next, then herself, without so much as a wince.');

      /* --- the phone --- */
      if (!api.get('f_killed_trader')) {
        await api.narrate('On the floor, Trader thumbs at his phone with bloody fingers.');
        await api.say('trader_hurt', 'Override\'s running. Ten minutes. Then they\'re just bits of metal in a bin.', { mood: 'cry' });
        await api.say('trader_hurt', 'Here. Try the top number.', { mood: 'sad' });
        await api.narrate('He holds it up to you. Ginerva doesn\'t stop him. She mouths one word at you: go.');
        api.set('ch15_hasPhone', true);
      } else {
        await api.say('annette', ['There\'s an override code. Older than the new system. A guard who liked to talk told it to me, back when I still had my looks.', 'It won\'t hush the alarm. It\'ll just stop the poison. Run fast.'], { mood: 'smug' });
        await api.narrate('She punches six digits into your watch. Somewhere in the House, a siren begins to wail.');
        api.sound('alarm');
      }
      api.onAir(false); api.approval(false);

      /* ============ 11. THE ESCAPE ============ */
      await api.slides([{ style: 'black', text: 'Out of the gym by the side door. Down the Red Hall toward the narrow service stair, the old one, with audio sensors only.' }]);
      var hallOk = await stealthLoop(api, HALL_STEALTH, 'Oh for heaven\'s sake. Follow me, and walk like you own the place.');
      if (!hallOk) await api.narrate('Annette walks straight down the middle of the hall. The True Believers are all running the other way, toward the gunshots. Nobody looks at a little old lady.');
      await api.goRoom(H.kitchen, { at: KM.arrive, facing: 'down' });
      await api.narrate('The service stair spits you out by the kitchen. The chandelier tinkles. The camera in the corner is dead, because it\'s Annette and of course she knew.');
      await api.think('The pantry. It has a back door to the garden. Kessie said so, a lifetime ago.');
      api.objective('The garden door, in the back of the walk-in pantry');
      await api.waitForInteract('c15_gardendoor');
      api.objective(null);
      await api.narrate('The bolt is stiff. You throw your shoulder into it and the night comes in: cold, wet, smelling of almond blossom.');
      var gardenOk = await stealthLoop(api, GARDEN_STEALTH, 'Enough. We\'ll go when the lights cross. On my word... now!');
      if (!gardenOk) await api.narrate('Annette grabs your wrist. When the two beams cross and flare, she pulls, and you run blind through the dazzle.');
      await api.goRoom(H.grounds, { at: GM.garden, facing: 'up' });
      api.objective('The gap in the fence');
      await api.waitForZone('c15_gap');
      api.objective(null);
      await api.narrate('The gap in the iron. You go through sideways. Isaiah follows, feeling for the bars.');

      /* ============ 12. OUTSIDE THE FENCE ============ */
      await api.goRoom(ROAD, { at: [2, 5], facing: 'right' });
      var hasPhone = !api.get('f_killed_trader');
      api.objective(hasPhone ? 'Override: 9:40. Get past the perimeter.' : 'The alarm is still screaming. Run.');
      api.onInteract('c15_alley', async function (a) {
        api.placeNpc('c15_isaiah', [a.playerTile().x - 1, a.playerTile().y], 'right');
        await a.think('Isaiah reaches for my hand. After a moment\'s hesitation, I let him take it.');
        await a.think('...Where\'s Annette?');
        await a.narrate('Behind you there\'s only the dark alley and the shed. No cane tapping. No cardigan. Annette Dunphy is simply gone.');
        api.set('ch15_annetteGone', true);
      });
      api.onInteract('c15_perim', async function (a) {
        api.placeNpc('c15_isaiah', [a.playerTile().x - 1, a.playerTile().y], 'right');
        api.sound('heartbeat');
        await a.think('About here. A hundred metres past the fence. The kill line. Every step, I wait for the burning.');
        if (hasPhone) { api.objective('Override: 6:12. Keep walking.'); await a.think('Nothing. Just my heart, and a hole in my arm where the chip used to be.'); }
        else { await a.think('Nothing. Annette\'s old code holds. Behind us the siren keeps screaming, getting smaller.'); }
      });
      await api.waitForZone('c15_lampzone');
      api.objective(null);
      api.placeNpc('c15_isaiah', [api.playerTile().x - 1, api.playerTile().y], 'right');
      await api.narrate('A dead streetlamp. A green sign half-swallowed by ivy: OLD MILL RD. The road runs downhill into the dark.');

      if (hasPhone) {
        /* ============ 13. THE CALL ============ */
        await api.think('Trader\'s phone. Cracked screen, smeared with his blood. One list of contacts.');
        await api.note({ title: 'CONTACTS', text: 'W\nG\nHQ - DO NOT ANSWER\nFATHER' });
        var call = 0;
        while (call !== 0) { /* unreachable: placeholder for readability */ }
        var c1 = await api.choice(['(Call the top number. W.)', '(Not yet. Breathe first.)']);
        if (c1 === 1) { await api.think('Seven seconds. One. Two. Three. Four. Five. Six. Seven.'); }
        api.set('f_called_top_number', true);
        api.sound('blip');
        await api.narrate('It rings once.');
        await api.say('waverly', 'Momma?', { name: 'Waverly (phone)' });
        await api.narrate('Your knees hit the road.');
        await api.say('waverly', 'I\'m at the gas station on Old Mill Road. Two miles. I\'ve got cocoa.', { name: 'Waverly (phone)' });
        await api.say('luna', '...Waverly?');
        api.add('m_waverly', 5);
        await api.say('isaiah_bare', 'Luna? Who is it? Luna, why are you crying?', { mood: 'fear' });
        await api.slides([{ style: 'black', text: 'Two miles. Downhill. In the dark.\n\nYou start walking.' }]);
      } else {
        api.set('f_called_top_number', false);
        await api.think('No phone. No number. No idea where Waverly is tonight, or who is holding her hand.');
        await api.say('isaiah_bare', 'Which way?', { mood: 'fear' });
        await api.say('luna', 'Away. Any way that\'s away.');
        await api.slides([{ style: 'black', text: 'You run, the two of you, down a road you can\'t see, toward nothing in particular.\n\nBehind you the siren gets smaller and smaller, and never quite stops.' }]);
      }
      api.completeChapter();
    }
  });
})();
