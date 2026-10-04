/* =========================================================================
 * shared/locations.js: THE HOUSE, ground floor (F1) + grounds. (CHAPTERS.md §3)
 * Upstairs/basement live in shared/loc_upstairs.js, the gym + redresses and off-site
 * places in shared/loc_gym_offsite.js.
 *
 * MAPS (key your chapter maps by these exact ids so exits connect):
 *   house_grounds  house_foyer  house_red_hall  house_lounge  house_library  house_arcade
 *   house_supply_closet  house_dining  house_kitchen (incl. walk-in pantry)  house_mirror_bath
 *   house_green_room  house_trader_office
 *
 *   maps: {
 *     house_foyer:    G.shared.map('house_foyer'),
 *     house_red_hall: G.shared.map('house_red_hall', { npcs: [...] })
 *   }
 *   api.goRoom('house_red_hall', { at: G.shared.at('house_red_hall', 'from_foyer') })
 *
 * CONVENTIONS (shared by all three map files):
 *  - exit ids 'to_<room>' (room = id without 'house_'), arrival points 'from_<room>' in def.spawns,
 *    mirrored in G.shared.data.spawns[mapId]. Named points in def.marks / G.shared.data.marks.
 *  - every exit is LOCKED (bounces, "won't open") when the running chapter did not register the
 *    target map, so a chapter never crashes on a door to a room it doesn't use. Override a door:
 *      G.shared.map('house_red_hall', { remove: ['to_gym'],
 *        exits: [G.shared.exit('house_red_hall', 'to_gym', { locked: '!ch03_ballOpen', lockedText: [...] })] })
 *  - toAt of each exit is resolved when the chapter copies the map (after all shared files loaded):
 *    target.spawns['from_<this room>'] || target default spawn.
 *  - cameras: def.cameras = [{ id, at, angle, sweep, range, fov, live }] (angle 0 = right, 90 = down)
 *    ready to feed the stealth minigame; matching wall props carry the same id.
 *    Solid red light (cam_rec) = recording; flashing (cam_live) = watched live. def.blindSpots = [{id, at, w, h}].
 *    Mirrored in G.shared.data.cameras / G.shared.data.blindSpots.
 *  - built-in entity ids are prefixed with the room (foyer_couch, kitchen_kettle...) so they are
 *    unique across a chapter (autoplay locates targets by id across all your maps).
 * ========================================================================= */
(function () {
  'use strict';
  var G = window.G;
  var D = G.shared.data;
  ['spawns', 'marks', 'cameras', 'blindSpots'].forEach(function (k) { D[k] = D[k] || {}; });

  /* ------------------------------------------------------------ helpers */
  function short(id) { return String(id).replace(/^house_/, ''); }
  /** G.shared.at(mapId, pointName) -> [x,y] from spawns or marks (null if missing). */
  if (!G.shared.at) G.shared.at = function (mapId, name) {
    var s = (D.spawns[mapId] || {})[name] || (D.marks[mapId] || {})[name];
    return s ? s.slice() : null;
  };
  /** G.shared.exit(mapId, exitId, overrides) -> a copy of a shared exit, merged with overrides. */
  if (!G.shared.exit) G.shared.exit = function (mapId, exitId, over) {
    var m = G.shared.maps[mapId], e = m && (m.exits || []).filter(function (x) { return x.id === exitId; })[0];
    if (!e) { G.reportError(new Error('G.shared.exit: no exit "' + exitId + '" in ' + mapId), 'shared'); return over || {}; }
    var c = G.cloneDef(e); Object.keys(over || {}).forEach(function (k) { c[k] = over[k]; }); return c;
  };

  /** Exit factory (cross-owner safe). from = this map id, to = full target id. */
  function door(from, at, to, o) {
    o = o || {};
    var e = {
      id: o.id || 'to_' + short(to), at: at, w: o.w || 1, h: o.h || 1, to: to, facing: o.facing,
      locked: function () { return !G.lookup('maps', to); },
      lockedText: o.lockedText || [{ narrate: o.lockedMsg || 'It won\'t open.' }]
    };
    if (o.toAt) e.toAt = o.toAt;
    else Object.defineProperty(e, 'toAt', {
      enumerable: true, configurable: true,
      get: function () { var s = D.spawns[to]; var p = s && (s['from_' + short(from)]); return p ? p.slice() : undefined; }
    });
    return e;
  }

  /** Tiny grid builder: rows of chars, edited by rect/set/line, then .rows(). */
  function Grid(w, h, fill) { this.w = w; this.h = h; this.c = []; for (var y = 0; y < h; y++) { this.c.push([]); for (var x = 0; x < w; x++) this.c[y].push(fill); } }
  Grid.prototype.set = function (x, y, ch) { if (y >= 0 && y < this.h && x >= 0 && x < this.w) this.c[y][x] = ch; return this; };
  Grid.prototype.rect = function (x, y, w, h, ch) { for (var j = 0; j < h; j++) for (var i = 0; i < w; i++) this.set(x + i, y + j, ch); return this; };
  Grid.prototype.frame = function (x, y, w, h, ch) { this.rect(x, y, w, 1, ch).rect(x, y + h - 1, w, 1, ch).rect(x, y, 1, h, ch).rect(x + w - 1, y, 1, h, ch); return this; };
  Grid.prototype.str = function (x, y, s) { for (var i = 0; i < s.length; i++) if (s[i] !== '?') this.set(x + i, y, s[i]); return this; };
  Grid.prototype.rows = function () { return this.c.map(function (r) { return r.join(''); }); };

  // house legend shared by all F1 maps
  var HL = {
    '#': 'h_wall', '.': 'h_parquet', 'r': 'h_redcarpet', '_': 'h_marble', ':': 'h_kitchen_tile',
    'D': 'h_door', 'J': 'h_door_jewel', 'U': 'h_door_blue', 'Y': 'h_door_gold', '2': 'h_door_double', 'Z': 'h_door_slat',
    '=': 'h_stairs', 'a': 'h_armchair', 'h': 'h_couch_leather', 'v': 'h_couch_velvet', 'i': 'h_island', 'n': 'h_bench_bolted',
    'T': 'h_banquet', 'k': 'h_shelf_tall', 'F': 'h_fridge_big', 'W': 'h_window_garden', 'M': 'h_mirror_strip',
    'E': 'h_screen_wall', 'I': 'h_leader_wall', 'y': 'h_gold_carpet', 'Q': 'h_wall_white', 'g': 'h_green_floor',
    'e': 'h_wall_green', 'j': 'h_toilet_auto',
    'w': 'h_vanity', 'q': 'h_bidet', 'z': 'h_shelf_supply', 'A': 'h_almond', '%': 'h_hedge',
    '+': 'h_fence', 'H': 'h_bush', '"': 'h_lawn', '-': 'h_gravel', 'x': 'h_path', '$': 'h_gate', 'B': 'h_wall_brick', '^': 'h_roof',
    'P': 'h_plant', 'L': 'h_lamp', 'c': 'h_chair'
  };   // NB: default-legend chars keep their engine meaning except # . _ : D h k F W M E I Q (house versions)
  function legend(extra) { var l = {}; Object.keys(HL).forEach(function (k) { l[k] = HL[k]; }); if (extra) Object.keys(extra).forEach(function (k) { l[k] = extra[k]; }); return l; }

  function cam(id, at, o) { o = o || {}; return { id: id, at: at, angle: o.angle != null ? o.angle : 90, sweep: o.sweep || 0, range: o.range || 72, fov: o.fov || 50, live: !!o.live, speed: o.speed || 0.6, prop: o.prop }; }

  /** Register a map + mirror spawns/marks/cameras into G.shared.data. Adds camera props. */
  function reg(id, def) {
    def.legend = legend(def.legend);
    def.spawns = def.spawns || {};
    def.marks = def.marks || {};
    def.cameras = def.cameras || [];
    def.blindSpots = def.blindSpots || [];
    if (!def.spawn) { var first = def.spawns[Object.keys(def.spawns)[0]]; if (first) def.spawn = first.slice(); }
    def.objects = def.objects || [];
    def.cameras.forEach(function (c) {
      if (c.prop === false) return;
      def.objects.push({ id: c.id, at: c.at.slice(), prop: c.prop || (c.live ? 'cam_live' : 'cam_rec'), facing: c.angle === 0 ? 'right' : c.angle === 180 ? 'left' : 'down', solid: false, layer: 1,
        examine: c.live ? [{ think: 'The red light is blinking. Someone is watching right now.' }] : [{ think: 'A steady red light. Recording. Somebody will watch this later, or a machine will.' }] });
    });
    D.spawns[id] = def.spawns; D.marks[id] = def.marks; D.cameras[id] = def.cameras; D.blindSpots[id] = def.blindSpots;
    def.npcs = def.npcs || []; def.zones = def.zones || []; def.exits = def.exits || []; def.lights = def.lights || [];
    G.shared.registerMap(id, def);
  }
  var HOUSE_TINT = '#2a1030';

  /* =================================================================== FOYER
   * 14x11. Jewel door south (to grounds), two leather couches facing each other over a rug,
   * floor-to-ceiling bookshelf, Great Leader portrait, main stair NE (up to F2), east to the Red Hall. */
  (function () {
    var g = new Grid(14, 11, '_').frame(0, 0, 14, 11, '#');
    g.rect(1, 1, 5, 1, 'k');                    // bookshelf to the ceiling (NW)
    g.rect(10, 1, 3, 3, '=');                   // main staircase (NE)
    g.set(10, 1, '#').set(10, 2, '#');          // banister wall
    g.rect(3, 4, 4, 1, 'h').rect(3, 7, 4, 1, 'h');   // couches facing each other
    g.rect(3, 5, 4, 2, 'R');                    // rug between them
    g.set(13, 5, 'r').set(13, 6, 'r');          // opening east into the Red Hall
    g.set(6, 10, 'J').set(7, 10, 'J');          // the jewel door
    reg('house_foyer', {
      name: 'Foyer', tiles: g.rows(), ambient: 'hum', tint: HOUSE_TINT, tintAlpha: 0.1, dark: 0.3, playerLight: 40,
      lights: [{ at: [6, 5], r: 80 }, { at: [11, 3], r: 40 }, { at: [12, 6], r: 36 }],
      spawns: { from_grounds: [6, 9], from_red_hall: [12, 5], from_bedroom_hall: [11, 4] },
      marks: { center: [6, 5], couch_north: [4, 3], couch_south: [4, 8], stair_foot: [11, 4], portrait: [8, 1] },
      cameras: [cam('foyer_stagecam', [9, 3], { angle: 135, sweep: 70, range: 90, fov: 50, live: true, prop: 'stagecam' })],
      objects: [
        { id: 'foyer_portrait', at: [8, 0], prop: 'portrait_leader', solid: false, layer: 1, examine: [{ narrate: 'The Great Leader, reading to children. Every child in the painting is smiling exactly the same smile.' }] },
        { id: 'foyer_penguin', at: [7, 0], prop: 'penguin_logo', solid: false, layer: 1, examine: [{ narrate: 'The DPE penguin. Department of Punitive Entertainment.' }] },
        { id: 'foyer_shelf', at: [2, 1], examine: [{ narrate: 'Shelves to the ceiling. The spines are real; the books are glued shut.' }] },
        { id: 'foyer_couch', at: [4, 4], examine: [{ narrate: 'Straight-backed leather. Built for posture, not comfort.' }] },
        { id: 'foyer_plant1', at: [1, 9], prop: 'candelabra', solid: true },
        { id: 'foyer_plant2', at: [12, 9], prop: 'candelabra', solid: true },
        { id: 'foyer_chandelier', at: [6, 4], prop: 'chandelier', solid: false, layer: 1 }
      ],
      exits: [
        door('house_foyer', [6, 10], 'house_grounds', { w: 2, facing: 'down', lockedMsg: 'The jewel-studded door is locked from outside.' }),
        door('house_foyer', [13, 5], 'house_red_hall', { h: 2, facing: 'right' }),
        door('house_foyer', [11, 1], 'house_bedroom_hall', { w: 2, facing: 'up', lockedMsg: 'Contestants go upstairs when they are told to.' })
      ]
    });
  })();

  /* ================================================================= RED HALL
   * 42x6 (40x4 carpet). The east-west spine. North doors: Lounge, Library, Arcade, Supply Closet,
   * service stair, gold door to Trader's Office (far east). South doors: Dining, Kitchen, Mirror Bathroom,
   * the blue door to the Green Room. West: Foyer. East: double doors to the Gym. Posters every 6 tiles. 3 cameras. */
  var RH = { lounge: 5, library: 12, arcade: 19, supply: 25, service: 33, trader: 38, dining: 6, kitchen: 13, bath: 21, green: 29 };
  (function () {
    var g = new Grid(42, 6, 'r').frame(0, 0, 42, 6, '#');
    g.set(0, 2, 'r').set(0, 3, 'r');                                  // west opening (foyer)
    g.set(41, 2, '2').set(41, 3, '2');                                // gym double doors
    g.set(RH.lounge, 0, 'D').set(RH.library, 0, 'D').set(RH.arcade, 0, 'D').set(RH.supply, 0, 'D');
    g.set(RH.service, 0, '=').set(RH.trader, 0, 'Y');
    g.set(RH.dining, 5, 'D').set(RH.kitchen, 5, 'D').set(RH.bath, 5, 'D').set(RH.green, 5, 'U');
    var posters = [];
    [3, 9, 15, 23, 30, 36].forEach(function (x, i) { posters.push({ id: 'hall_poster' + (i + 1), at: [x, 0], prop: i % 2 ? 'poster_private' : 'poster_obey', solid: false, layer: 1,
      examine: [{ narrate: i % 2 ? '"NOTHING YOU FEEL IS PRIVATE."' : '"OBEDIENCE IS BEAUTY."' }] }); });
    [8, 17, 26, 35].forEach(function (x, i) { posters.push({ id: 'hall_poster_s' + (i + 1), at: [x, 5], prop: 'portrait_leader', solid: false, layer: 1, examine: [{ narrate: 'The Great Leader again. His eyes follow you down the hall; it is a cheap trick and it works.' }] }); });
    reg('house_red_hall', {
      name: 'Red Hall', tiles: g.rows(), ambient: 'hum', tint: '#3a0a14', tintAlpha: 0.12, dark: 0.35, playerLight: 44,
      lights: [{ at: [4, 2], r: 46 }, { at: [12, 2], r: 46 }, { at: [20, 2], r: 46 }, { at: [28, 2], r: 46 }, { at: [36, 2], r: 46 }, { at: [40, 3], r: 40, flicker: true }],
      spawns: {
        from_foyer: [1, 3], from_gym: [40, 3],
        from_lounge: [RH.lounge, 1], from_library: [RH.library, 1], from_arcade: [RH.arcade, 1], from_supply_closet: [RH.supply, 1],
        from_service_stair: [RH.service, 1], from_trader_office: [RH.trader, 1],
        from_dining: [RH.dining, 4], from_kitchen: [RH.kitchen, 4], from_mirror_bath: [RH.bath, 4], from_green_room: [RH.green, 4]
      },
      marks: { west: [2, 2], center: [20, 2], east: [39, 2], outside_blue_door: [RH.green, 3], outside_gold_door: [RH.trader, 2], outside_gym: [39, 3], elephant_post: [16, 2] },
      cameras: [
        cam('hall_cam1', [10, 0], { angle: 90, sweep: 80, range: 72, live: false }),
        cam('hall_cam2', [24, 0], { angle: 90, sweep: 80, range: 72, live: true }),
        cam('hall_cam3', [37, 0], { angle: 135, sweep: 50, range: 72, live: false })
      ],
      objects: posters.concat([
        { id: 'hall_gold_plaque', at: [RH.trader + 1, 0], solid: false, layer: 1, draw: function (gg, x, y) { gg.fillStyle = '#c9a24a'; gg.fillRect(x + 2, y + 6, 12, 4); gg.fillStyle = '#3a2a0a'; gg.fillRect(x + 3, y + 7, 10, 1); gg.fillRect(x + 3, y + 9, 7, 1); },
          examine: [{ narrate: 'A gold plaque: "EXECUTIVE SWEET".' }, { think: 'Sweet. Of course.' }] },
        { id: 'hall_blue_door', at: [RH.green, 5], examine: [{ narrate: 'A plain blue door, out of place among all the red.' }] }
      ]),
      exits: [
        door('house_red_hall', [0, 2], 'house_foyer', { h: 2, facing: 'left' }),
        door('house_red_hall', [41, 2], 'house_gym', { h: 2, facing: 'right', lockedMsg: 'The double doors to the gym are locked.' }),
        door('house_red_hall', [RH.lounge, 0], 'house_lounge', { facing: 'up' }),
        door('house_red_hall', [RH.library, 0], 'house_library', { facing: 'up' }),
        door('house_red_hall', [RH.arcade, 0], 'house_arcade', { facing: 'up' }),
        door('house_red_hall', [RH.supply, 0], 'house_supply_closet', { facing: 'up' }),
        door('house_red_hall', [RH.service, 0], 'house_service_stair', { facing: 'up', lockedMsg: 'The narrow service stair. A chain across it.' }),
        door('house_red_hall', [RH.trader, 0], 'house_trader_office', { facing: 'up', lockedMsg: 'The gold door is sealed.' }),
        door('house_red_hall', [RH.dining, 5], 'house_dining', { facing: 'down' }),
        door('house_red_hall', [RH.kitchen, 5], 'house_kitchen', { facing: 'down' }),
        door('house_red_hall', [RH.bath, 5], 'house_mirror_bath', { facing: 'down' }),
        door('house_red_hall', [RH.green, 5], 'house_green_room', { facing: 'down', lockedMsg: 'The blue door is locked.' })
      ]
    });
  })();

  /* ================================================================== LOUNGE
   * 14x10. Velvet couches with embroidered pillows, a wall screen, a full-length mirror (added Day 4:
   * remove 'lounge_mirror' before ch05), 2 cameras. Door south to the Red Hall. */
  (function () {
    var g = new Grid(14, 10, '.').frame(0, 0, 14, 10, '#');
    g.rect(4, 0, 6, 1, 'E');                              // wall screen
    g.rect(3, 3, 3, 1, 'v').rect(8, 3, 3, 1, 'v');        // couches facing the screen
    g.rect(3, 6, 3, 1, 'v').rect(8, 6, 3, 1, 'v');
    g.rect(5, 4, 4, 2, 'R');
    g.set(1, 1, 'P').set(12, 1, 'P').set(1, 8, 'L').set(12, 8, 'P');
    g.set(6, 9, 'D');
    reg('house_lounge', {
      name: 'Lounge', tiles: g.rows(), ambient: 'hum', tint: '#2a0a3a', tintAlpha: 0.12, dark: 0.3, playerLight: 40,
      lights: [{ at: [6, 1], r: 70 }, { at: [1, 8], r: 40 }],
      spawns: { from_red_hall: [6, 8] },
      marks: { center: [6, 4], mirror_front: [12, 5], screen_front: [6, 2] },
      cameras: [cam('lounge_cam1', [2, 0], { angle: 45, sweep: 40, live: true }), cam('lounge_cam2', [11, 0], { angle: 135, sweep: 40 })],
      objects: [
        { id: 'lounge_pillow1', at: [3, 3], examine: [{ narrate: 'An embroidered pillow: "CRY PRETTY".' }] },
        { id: 'lounge_pillow2', at: [10, 6], examine: [{ narrate: 'An embroidered pillow: "BETRAY, BUT MAKE IT ART".' }] },
        { id: 'lounge_screen', at: [6, 0], examine: [{ narrate: 'Yesterday\'s highlights, on a loop. You, from an angle you never saw.' }] },
        { id: 'lounge_mirror', at: [12, 4], solid: true, draw: function (gg, x, y) { gg.fillStyle = '#c9a24a'; gg.fillRect(x + 3, y - 12, 10, 27); gg.fillStyle = '#9ab0c0'; gg.fillRect(x + 4, y - 11, 8, 25); gg.fillStyle = 'rgba(255,255,255,0.45)'; gg.fillRect(x + 5, y - 10, 2, 8); },
          examine: [{ narrate: 'A full-length mirror. New. Someone wanted two women to see themselves side by side.' }] }
      ],
      exits: [door('house_lounge', [6, 9], 'house_red_hall', { facing: 'down' })]
    });
  })();

  /* ================================================================= LIBRARY
   * 12x12. Carved shelves on three walls, four squashy armchairs, reading nook NE (camera blind behind
   * the nook armchair; the camera is hidden in a book spine), the fluorescent-blue rules sign,
   * children's section (Falsville, The Newberry Twins). Door south. Luna and Isaiah's sanctuary. */
  (function () {
    var g = new Grid(12, 12, '.').frame(0, 0, 12, 12, '#');
    g.rect(1, 1, 10, 1, 'k');                 // north shelves
    g.rect(1, 2, 1, 8, 'k');                  // west shelves
    g.rect(10, 4, 1, 6, 'k');                 // east shelves (nook takes the NE corner)
    g.set(9, 2, 'a');                         // the nook armchair (blind spot behind it at [10,2]/[10,3])
    g.set(4, 5, 'a').set(7, 5, 'a').set(4, 8, 'a').set(7, 8, 'a');
    g.rect(5, 6, 2, 2, 'R');
    g.set(2, 10, 'L');
    g.set(6, 11, 'D');
    reg('house_library', {
      name: 'Library', tiles: g.rows(), ambient: 'hum', tint: '#1a2a3a', tintAlpha: 0.12, dark: 0.4, playerLight: 42,
      lights: [{ at: [2, 10], r: 46 }, { at: [6, 6], r: 50 }, { at: [9, 3], r: 30 }],
      spawns: { from_red_hall: [6, 10] },
      marks: { nook: [10, 2], nook_chair: [9, 2], reading_spot: [5, 6], childrens_section: [3, 2], isaiah_chair: [7, 6], sign: [6, 2] },
      cameras: [cam('library_cam', [7, 1], { angle: 90, sweep: 0, range: 80, fov: 60, prop: 'cam_eye' })],   // hidden in a book spine
      blindSpots: [{ id: 'library_nook_blind', at: [10, 2], w: 1, h: 2 }],
      objects: [
        { id: 'library_sign', at: [8, 11], prop: 'sign_library', solid: false, layer: 1,
          examine: [{ narrate: '"BOOKS MAY NOT BE REMOVED FROM THE LIBRARY. VIOLATORS WILL FACE PUNITIVE MEASURES."' }] },
        { id: 'library_falsville', at: [3, 1], examine: [{ narrate: 'The children\'s section. A whole row of Falsville. Next to it, The Newberry Twins, books one to twelve.' }] },
        { id: 'library_newberry', at: [4, 1], examine: [{ narrate: 'The Newberry Twins, Book 9: The Newberry Twins Meet a Lion.' }] },
        { id: 'library_nook', at: [9, 2], examine: [{ narrate: 'A squashy armchair wedged into the corner. The lamp throws its shadow right into the angle of the shelves.' }] }
      ],
      zones: [{ id: 'library_nook_zone', at: [10, 2], w: 1, h: 2 }],
      exits: [door('house_library', [6, 11], 'house_red_hall', { facing: 'down' })]
    });
  })();

  /* ================================================================== ARCADE
   * 12x10. Wheel of fortune, the propaganda shooting booth, Isaiah's number-pattern table with the
   * claw keyboard, a dance machine, pinball, the jackpot machine. Door south. */
  (function () {
    var g = new Grid(12, 10, 'g').frame(0, 0, 12, 10, '#');
    g.set(6, 9, 'D');
    reg('house_arcade', {
      name: 'Arcade', tiles: g.rows(), ambient: 'hum', legend: { 'g': 'vr' }, tint: '#200a30', tintAlpha: 0.1, dark: 0.5, playerLight: 38,
      lights: [{ at: [2, 2], r: 36, flicker: true }, { at: [9, 2], r: 36 }, { at: [6, 5], r: 40 }, { at: [2, 7], r: 30 }],
      spawns: { from_red_hall: [6, 8] },
      marks: { wheel: [2, 2], shooting: [5, 2], number_table: [6, 5], dance: [9, 6], pinball: [9, 2], jackpot: [2, 6] },
      cameras: [cam('arcade_cam', [10, 0], { angle: 135, sweep: 30, live: true })],
      objects: [
        { id: 'arcade_wheel', at: [2, 1], prop: 'wheel_fortune', examine: [{ narrate: 'A wheel of fortune. Half the wedges say PRIZE. The other half say LESSON.' }] },
        { id: 'arcade_shooting', at: [5, 1], draw: function (gg, x, y) { gg.fillStyle = '#5a1a2a'; gg.fillRect(x - 3, y, 22, 14); gg.fillStyle = '#e8c15a'; gg.fillRect(x - 3, y, 22, 2); for (var i = 0; i < 3; i++) { gg.fillStyle = '#f2efe8'; gg.fillRect(x - 1 + i * 7, y + 4, 5, 7); gg.fillStyle = '#c8202c'; gg.fillRect(x + 1 + i * 7, y + 6, 1, 3); } },
          examine: [{ narrate: 'A shooting booth. The paper targets read "I OPPOSE THE GREAT LEADER". Every one is shot through the mouth.' }] },
        { id: 'arcade_numbers', at: [6, 5], draw: function (gg, x, y, t) { gg.fillStyle = '#1a1a24'; gg.fillRect(x - 4, y + 2, 24, 11); gg.fillStyle = '#3fc1c9'; for (var i = 0; i < 5; i++) gg.fillRect(x - 2 + i * 4, y + 4, 3, 3); gg.fillStyle = '#e8c15a'; gg.fillRect(x - 2 + (Math.floor(t * 2) % 5) * 4, y + 9, 3, 2); },
          examine: [{ narrate: 'A number-pattern table with a clumsy claw keyboard. The high score belongs to "I.B."' }] },
        { id: 'arcade_dance', at: [9, 6], draw: function (gg, x, y, t) { var c = ['#e8323c', '#3fc1c9', '#e8c15a', '#7ae83a']; for (var i = 0; i < 4; i++) { gg.fillStyle = Math.floor(t * 4) % 4 === i ? c[i] : '#2a2a34'; gg.fillRect(x + (i % 2) * 8, y + Math.floor(i / 2) * 8, 7, 7); } },
          solid: false, examine: [{ narrate: 'A dance machine. The arrows flash in time to a song about gratitude.' }] },
        { id: 'arcade_pinball', at: [9, 1], prop: 'pinball', examine: [{ narrate: 'Pinball: "SCARED STRAIGHT". The flippers are shaped like hands.' }] },
        { id: 'arcade_jackpot', at: [2, 6], prop: 'jackpot', examine: [{ narrate: 'A jackpot machine. Every pull: "CONGRATULATIONS, WINNER". It never pays.' }] }
      ],
      exits: [door('house_arcade', [6, 9], 'house_red_hall', { facing: 'down' })]
    });
  })();

  /* ============================================================ SUPPLY CLOSET
   * 3x4 inside (5x6). Mops, buckets, bleach shelf. NO camera (blind). Door south. Used ch13. */
  (function () {
    var g = new Grid(5, 6, '_').frame(0, 0, 5, 6, '#');
    g.rect(1, 1, 3, 1, 'z');
    g.set(2, 5, 'D');
    reg('house_supply_closet', {
      name: 'Supply Closet', tiles: g.rows(), ambient: null, legend: { '_': 'concrete' }, dark: 0.7, playerLight: 30,
      lights: [{ at: [2, 2], r: 22, flicker: true }],
      spawns: { from_red_hall: [2, 4] },
      marks: { shelf: [2, 2], hiding: [1, 3], note_spot: [3, 2] },
      blindSpots: [{ id: 'closet_blind', at: [1, 1], w: 3, h: 4 }],
      objects: [
        { id: 'closet_mop', at: [1, 3], prop: 'mop', solid: true, examine: [{ narrate: 'A mop, stiff with old bleach.' }] },
        { id: 'closet_bucket', at: [3, 3], prop: 'bucket', examine: [{ narrate: 'A bucket. Empty.' }] },
        { id: 'closet_shelf', at: [2, 1], examine: [{ narrate: 'Bleach, gloves, sponges, and no camera. The only place on this floor nobody is watching.' }] }
      ],
      exits: [door('house_supply_closet', [2, 5], 'house_red_hall', { facing: 'down' })]
    });
  })();

  /* ================================================================== DINING
   * 14x8. A long oak banquet table for 10 (blind spot underneath), candles, a chandelier, 1 camera.
   * Door north (Red Hall). */
  (function () {
    var g = new Grid(14, 8, '.').frame(0, 0, 14, 8, '#');
    g.set(6, 0, 'D');
    g.rect(2, 3, 10, 2, 'T');
    g.set(1, 1, 'P').set(12, 1, 'P').set(1, 6, 'P').set(12, 6, 'P');
    for (var x = 2; x < 12; x += 2) { g.set(x, 2, 'c').set(x, 5, 'c'); }
    reg('house_dining', {
      name: 'Dining Room', tiles: g.rows(), ambient: 'hum', tint: HOUSE_TINT, tintAlpha: 0.12, dark: 0.4, playerLight: 40,
      lights: [{ at: [4, 3], r: 44, flicker: true }, { at: [9, 3], r: 44, flicker: true }, { at: [6, 4], r: 70 }],
      spawns: { from_red_hall: [6, 1] },
      marks: { head_west: [1, 4], head_east: [12, 4], under_table: [6, 4], seat_n1: [2, 2], seat_s1: [2, 5] },
      cameras: [cam('dining_cam', [11, 0], { angle: 135, sweep: 30 })],
      blindSpots: [{ id: 'dining_under_table', at: [2, 3], w: 10, h: 2 }],
      objects: [
        { id: 'dining_chandelier', at: [6, 3], prop: 'chandelier', solid: false, layer: 1 },
        { id: 'dining_candles1', at: [4, 3], prop: 'candelabra', solid: false, layer: 1 },
        { id: 'dining_candles2', at: [9, 3], prop: 'candelabra', solid: false, layer: 1 },
        { id: 'dining_table', at: [7, 4], examine: [{ narrate: 'Oak, long enough for ten. The tablecloth hangs almost to the floor.' }, { think: 'Nobody films the underside of a table.' }] }
      ],
      exits: [door('house_dining', [6, 0], 'house_red_hall', { facing: 'up' })]
    });
  })();

  /* ================================================================= KITCHEN
   * 12x10 + the walk-in pantry (4x4 SE, slatted door you can see out of, no camera, not filmed before
   * 06:00). Two marble islands, three bolted-down benches, a huge fridge with real meat, a chandelier,
   * Annette's tea station by the kettle. 1 camera (inactive 23:00-06:00). Door north. */
  (function () {
    var g = new Grid(12, 11, ':').frame(0, 0, 12, 11, '#');
    g.set(5, 0, 'D');
    g.rect(1, 1, 3, 1, 'K').set(4, 1, 'O').set(6, 1, 'S').set(7, 1, 'K').set(8, 1, 'K');  // counters, stove, sink, tea station
    g.rect(9, 1, 2, 1, 'F');                    // the huge fridge (2 wide)
    g.rect(2, 3, 3, 2, 'i').rect(6, 3, 3, 1, 'i'); // two marble islands
    g.rect(1, 6, 3, 1, 'n').rect(5, 6, 3, 1, 'n').rect(1, 8, 3, 1, 'n'); // three bolted benches
    // pantry SE: interior walls at x=7 and y=6, slatted door at (7,8)
    g.rect(7, 6, 4, 1, '#').rect(7, 6, 1, 4, '#').set(7, 8, 'Z');
    g.rect(8, 7, 3, 3, '_');
    g.set(10, 7, 'z').set(10, 9, 'z');
    reg('house_kitchen', {
      name: 'Kitchen', tiles: g.rows(), ambient: 'hum', legend: { '_': 'concrete' }, tint: '#102030', tintAlpha: 0.08, dark: 0.25, playerLight: 40,
      lights: [{ at: [5, 4], r: 80 }, { at: [8, 1], r: 36 }],
      spawns: { from_red_hall: [5, 1] },
      marks: { tea_station: [8, 2], kettle: [8, 1], fridge: [9, 2], island_west: [3, 5], pantry: [9, 8], pantry_peek: [8, 8], bench: [2, 7], stove: [4, 2] },
      cameras: [cam('kitchen_cam', [0, 2], { angle: 0, sweep: 50, range: 90 })],   // inactive 23:00-06:00 (chapters decide)
      blindSpots: [{ id: 'kitchen_pantry_blind', at: [8, 7], w: 3, h: 3 }],
      objects: [
        { id: 'kitchen_kettle', at: [8, 1], prop: 'kettle', solid: false, layer: 1, examine: [{ narrate: 'Annette\'s tea station: a kettle, a tin of loose leaf, a row of little unlabelled jars.' }] },
        { id: 'kitchen_fridge', at: [9, 1], examine: [{ narrate: 'Real meat. Steaks, a whole chicken. More food than you and Waverly saw in a year.' }] },
        { id: 'kitchen_chandelier', at: [5, 3], prop: 'chandelier', solid: false, layer: 1 },
        { id: 'kitchen_pantry_door', at: [7, 8], examine: [{ narrate: 'A slatted door. From inside you can see out through the slats.' }] },
        { id: 'kitchen_pantry_shelf', at: [10, 7], examine: [{ narrate: 'Sacks of flour, tins, a jar of pickled eggs. No camera in here.' }] }
      ],
      zones: [{ id: 'kitchen_pantry_zone', at: [8, 7], w: 3, h: 3 }],
      exits: [door('house_kitchen', [5, 0], 'house_red_hall', { facing: 'up' })]
    });
  })();

  /* ============================================================ MIRROR BATHROOM
   * 6x6 inside (8x8). Wraparound strip mirror with a red button (forest / throne room / fairy
   * reflections), automated toilets in stalls, a bidet, a stool by the sink (for Annette). Door north. */
  (function () {
    var g = new Grid(8, 8, '_').frame(0, 0, 8, 8, '#');
    g.set(3, 0, 'D');
    g.rect(0, 1, 1, 6, 'Q').rect(7, 1, 1, 6, 'Q').rect(0, 7, 8, 1, 'Q');
    g.rect(1, 1, 2, 1, 'M').rect(4, 1, 3, 1, 'M');          // the strip mirror (north wall face)
    g.str(1, 2, 'ww???w');                                 // vanity sinks under it
    g.rect(1, 5, 1, 2, 'Q').set(3, 5, 'Q').set(5, 5, 'Q');   // stall partitions
    g.set(2, 6, 'j').set(4, 6, 'j').set(6, 6, 'q');
    reg('house_mirror_bath', {
      name: 'Mirror Bathroom', tiles: g.rows(), ambient: 'hum', legend: { 'M': 'h_mirror_strip' }, tint: '#3a3040', tintAlpha: 0.06, dark: 0.15,
      lights: [{ at: [3, 2], r: 60 }],
      spawns: { from_red_hall: [3, 1] },
      marks: { sink: [3, 3], stool_spot: [5, 3], stall1: [2, 5], stall2: [4, 5], button: [6, 3] },
      cameras: [cam('bath_cam', [0, 3], { angle: 0, sweep: 0, range: 50, prop: 'cam_eye' })],   // filmed, never aired
      objects: [
        { id: 'bath_button', at: [6, 2], prop: 'red_button', examine: [{ narrate: 'A red button beside the mirror. The reflection behind you turns into a forest, then a throne room, then a fairy glade.' }] },
        { id: 'bath_stool', at: [5, 3], prop: 'stool', examine: [{ narrate: 'A little step stool by the sink.' }] }
      ],
      exits: [door('house_mirror_bath', [3, 0], 'house_red_hall', { facing: 'up' })]
    });
  })();

  /* ============================================================== GREEN ROOM
   * 6x6 inside (8x8), behind the blue door. All green: walls, floor, ceiling. No furniture.
   * A confessional set built and never used: NO cameras, NO mics. Kessie's confession (ch08). */
  (function () {
    var g = new Grid(8, 8, 'g').frame(0, 0, 8, 8, 'e');
    g.set(3, 0, 'U');
    reg('house_green_room', {
      name: 'Green Room', tiles: g.rows(), ambient: null, tint: '#0a3a14', tintAlpha: 0.15, dark: 0.45, playerLight: 46,
      lights: [{ at: [4, 4], r: 50, flicker: true }],
      spawns: { from_red_hall: [3, 1] },
      marks: { center: [4, 4], corner: [6, 6], kessie_spot: [4, 5] },
      blindSpots: [{ id: 'green_room_all', at: [1, 1], w: 6, h: 6 }],
      objects: [{ id: 'green_corner', at: [6, 6], solid: false, examine: [{ narrate: 'Green walls, green floor, green ceiling. No lens anywhere. You check three times.' }] }],
      exits: [door('house_green_room', [3, 0], 'house_red_hall', { facing: 'up' })]
    });
  })();

  /* ============================================================ TRADER'S OFFICE
   * 10x8. Everything gold: oversized gold desk and chair, a child-sized guest chair, gold chandelier,
   * plush couches, trophies, photos with politicians, the dish of antique keys, a closet.
   * Trader can switch the cameras off (toggle under the desk: object 'office_cam_toggle'). Door south. */
  (function () {
    var g = new Grid(10, 9, 'y').frame(0, 0, 10, 9, 'O');
    g.set(4, 8, 'Y');
    g.rect(3, 2, 4, 1, 'd');                    // the oversized gold desk
    g.set(1, 1, 'D');                           // the closet door (decor; chapters may add an exit)
    g.rect(1, 5, 1, 2, 'v').rect(8, 5, 1, 2, 'v');
    g.set(8, 1, 'k');
    reg('house_trader_office', {
      name: 'Trader\'s Office', tiles: g.rows(), ambient: 'hum', legend: { 'O': 'h_wall_gold', 'd': 'h_desk_gold' }, tint: '#3a2a0a', tintAlpha: 0.12, dark: 0.3, playerLight: 40,
      lights: [{ at: [4, 3], r: 70 }],
      spawns: { from_red_hall: [4, 7] },
      marks: { desk_chair: [5, 1], guest_chair: [4, 3], phone: [3, 2], couch_west: [2, 5], couch_east: [7, 5], closet: [1, 2] },
      cameras: [cam('office_cam', [7, 0], { angle: 135, sweep: 0, range: 80 })],
      objects: [
        { id: 'office_chandelier', at: [4, 4], prop: 'chandelier', solid: false, layer: 1 },
        { id: 'office_trader_chair', at: [5, 1], solid: true, draw: function (gg, x, y) { gg.fillStyle = '#c9a24a'; gg.fillRect(x + 2, y - 6, 12, 18); gg.fillStyle = '#e8c15a'; gg.fillRect(x + 3, y - 5, 10, 8); gg.fillStyle = '#8a1a2a'; gg.fillRect(x + 4, y + 4, 8, 6); } },
        { id: 'office_guest_chair', at: [4, 3], solid: false, draw: function (gg, x, y) { gg.fillStyle = '#c9a24a'; gg.fillRect(x + 5, y + 5, 6, 7); gg.fillStyle = '#8a1a2a'; gg.fillRect(x + 6, y + 8, 4, 3); },
          examine: [{ narrate: 'A gold guest chair, sized for a child.' }] },
        { id: 'office_keys', at: [3, 2], prop: 'key_dish', solid: false, layer: 1, examine: [{ narrate: 'A dish of antique keys. You try one in the desk drawer. None of them open anything.' }] },
        { id: 'office_trophy', at: [6, 2], prop: 'trophy', solid: false, layer: 1, examine: [{ narrate: 'Broadcasting awards. "Most Watched Execution, Three Years Running."' }] },
        { id: 'office_photos', at: [3, 0], prop: 'photo_wall', solid: false, layer: 1, examine: [{ narrate: 'Trader shaking hands with senators, judges, the President. The same smile in every frame.' }] },
        { id: 'office_cam_toggle', at: [4, 2], solid: false, examine: [{ narrate: 'Under the lip of the desk, a small switch. The camera in the corner has a little red light above it.' }] },
        { id: 'office_closet', at: [1, 1], examine: [{ narrate: 'A closet. Suits, all white.' }] }
      ],
      exits: [door('house_trader_office', [4, 8], 'house_red_hall', { facing: 'down' })]
    });
  })();

  /* ================================================================= GROUNDS
   * 60x32 around the House. North: the garden under Luna's window (pink almond trees, gravel path,
   * bushes; snapping twigs), the 3 m iron fence with a gap onto the alley and the True Believers'
   * quarters shed. South: manicured lawn with gnomes, the gravel drive, the iron gate with the DPE
   * penguin. The House block sits in the middle; the jewel door (foyer, west end) is on its south face
   * with the keypad beside it. 2 floodlights. */
  (function () {
    var W = 60, H = 32;
    var g = new Grid(W, H, '"');
    g.rect(0, 0, W, 2, 'x');                         // the alley (north of the fence)
    g.rect(0, 2, W, 1, '+');                         // the fence
    g.set(44, 2, '"').set(45, 2, '"');               // the gap in the fence
    g.rect(40, 0, 4, 2, 'B');                        // True Believers' quarters shed (front)
    g.set(43, 1, 'D');                              // shed door faces the alley path (east)
    g.rect(0, 2, 1, H - 2, '+').rect(W - 1, 2, 1, H - 2, '+').rect(0, H - 1, W, 1, '+');
    // house block (brick shell; interior is the foyer/hall maps)
    g.rect(8, 11, 44, 11, 'B').rect(8, 11, 44, 10, '^');   // slate roof, brick south face
    for (var wx = 12; wx < 50; wx += 5) g.set(wx, 21, 'W');   // ground-floor windows on the south face
    g.set(12, 21, 'B').set(13, 21, 'J').set(14, 21, 'J');     // jewel door (foyer)
    // garden north of the house
    g.rect(2, 7, 56, 1, '-');                         // gravel path
    for (var ax = 4; ax < 56; ax += 5) { g.set(ax, 4, 'A'); if (ax + 2 < 56) g.set(ax + 2, 9, 'A'); }
    g.set(20, 5, 'H').set(33, 5, 'H').set(50, 5, 'H').set(10, 9, 'H').set(27, 9, 'H');
    g.rect(2, 8, 1, 14, '-').rect(57, 8, 1, 14, '-'); // side paths
    // front: drive + gate
    g.rect(13, 22, 2, 9, '-');
    g.rect(2, 26, 56, 1, '%').set(13, 26, '-').set(14, 26, '-');   // a low hedge with a gap for the drive
    g.set(13, 31, '$').set(14, 31, '$');
    g.rect(15, 22, 8, 2, '-');
    reg('house_grounds', {
      name: 'The Grounds', tiles: g.rows(), ambient: 'drone', tint: '#0a1428', tintAlpha: 0.15, dark: 0.35, playerLight: 46, bg: '#05080c',
      lights: [{ at: [6, 22], r: 60 }, { at: [53, 22], r: 60 }, { at: [13, 23], r: 50 }, { at: [30, 8], r: 40 }, { at: [42, 2], r: 30, flicker: true }],
      spawns: { from_foyer: [13, 23], from_gate: [13, 30], from_alley: [44, 1], garden: [30, 8], from_street: [13, 30] },
      marks: { gate: [13, 30], jewel_door: [13, 22], keypad: [15, 21], luna_window: [30, 10], under_luna_window: [30, 8], fence_gap: [44, 3], shed: [43, 1],
        kessie_fence_spot: [46, 3], drive: [13, 25], lawn_east: [40, 24], garden_west: [6, 6], garden_east: [52, 6] },
      cameras: [
        cam('grounds_cam_gate', [16, 30], { angle: 270, sweep: 60, range: 90, prop: false }),
        cam('grounds_cam_garden_w', [10, 11], { angle: 270, sweep: 80, range: 96, prop: false }),
        cam('grounds_cam_garden_e', [48, 11], { angle: 270, sweep: 80, range: 96, prop: false })
      ],
      objects: [
        { id: 'grounds_keypad', at: [15, 21], prop: 'keypad', solid: false, layer: 1, examine: [{ narrate: 'A keypad beside the door. Four digits. You never see anyone use it.' }] },
        { id: 'grounds_flood_w', at: [6, 22], prop: 'floodlight' },
        { id: 'grounds_flood_e', at: [53, 22], prop: 'floodlight' },
        { id: 'grounds_gnome1', at: [9, 24], prop: 'gnome', examine: [{ narrate: 'A garden gnome with a fishing rod. Its smile has been repainted recently.' }] },
        { id: 'grounds_gnome2', at: [19, 25], prop: 'gnome' },
        { id: 'grounds_gnome3', at: [26, 23], prop: 'gnome' },
        { id: 'grounds_gnome4', at: [5, 28], prop: 'gnome' },
        { id: 'grounds_gate_sign', at: [15, 30], prop: 'penguin_logo', solid: false, examine: [{ narrate: 'The DPE penguin, worked into the iron of the gate.' }] },
        { id: 'grounds_jewel_door', at: [14, 22], solid: false, examine: [{ narrate: 'The door is like a gaping maw, jewels scattered around the knob like crooked teeth.' }] },
        { id: 'grounds_cam_gate', at: [16, 29], prop: 'cam_rec', solid: false, layer: 1 },
        { id: 'grounds_cam_garden_w', at: [10, 10], prop: 'cam_rec', solid: false, layer: 1 },
        { id: 'grounds_cam_garden_e', at: [48, 10], prop: 'cam_rec', solid: false, layer: 1 },
        { id: 'grounds_luna_window', at: [30, 10], solid: false, layer: 1, draw: function (gg, x, y) { gg.fillStyle = '#c9a24a'; gg.fillRect(x + 3, y + 4, 10, 10); gg.fillStyle = '#e8c890'; gg.fillRect(x + 4, y + 5, 8, 8); gg.fillStyle = '#c9a24a'; gg.fillRect(x + 7, y + 5, 1, 8); },
          examine: [{ narrate: 'A lit window on the second floor. Room No. 3.' }] }
      ],
      zones: [
        { id: 'grounds_perimeter', at: [0, 0], w: W, h: 2 },            // past the fence: the chip kill-line begins ~100 m out
        { id: 'grounds_twigs', at: [20, 4], w: 16, h: 2 }               // snapping twigs (noise hazard) under the trees
      ],
      exits: [
        door('house_grounds', [13, 21], 'house_foyer', { w: 2, facing: 'up', lockedMsg: 'The jewel door is locked.' })
      ]
    });
    // the drive's exit to the street is chapter business (ch03 arrives by van; ch15 walks out).
  })();
})();
