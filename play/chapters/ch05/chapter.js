/* =========================================================================
 * ch05 "The Tribunal"  (Tue 9 Jan to Fri 12 Jan 2084, week 1)
 *
 * House days with secret watch tasks (3 days x free slots), Tuesday dinner
 * (Carol and John), Wednesday's lounge fight + the Felton pitch + the
 * showdown, the codes overheard in the arcade, Thursday's mirror fight, the
 * window at night, Friday lockdown, PRIVATE VOTE 1 in the gym courtroom,
 * the count in the Doll Room, John in the Cage, the 30-minute break and the
 * eavesdrop, PUBLIC VOTE 1 (a vote to SAVE).
 *
 * CROSS-CHAPTER FLAGS (CHAPTERS.md §2)
 *   reads : f_helped_waiter (Carol extra hostile), f_jemessa_triangle (Delphin
 *           -5 + a snide line), f_vr_self_sacrifice (Isaiah's remark),
 *           m_audience (via api.approval), m_delphin, m_isaiah, m_kessie,
 *           m_annette, m_waverly
 *   sets  : f_refused_vote_bloc, f_comforted_john, m_delphin, m_isaiah,
 *           m_kessie, m_annette, m_waverly, m_audience (api.approval only)
 *
 * PRIVATE VOTE ARITHMETIC (verified for every player choice):
 *   fixed NPC ballots: Annette -> "Luna" (SPOILED: the competition winner
 *   can't be named), Carol -> Delphin, John -> Delphin, Kessie -> Carol,
 *   Isaiah -> Carol, Delphin -> Carol.  John (loser) and Luna (winner) are
 *   ineligible; Delphin is not offered to Luna (arbiter: no 3-3 tie).
 *     Luna -> Carol   : Carol 4, Delphin 2, spoiled 1         (canon)
 *     Luna -> Kessie  : Carol 3, Delphin 2, Kessie 1, spoiled 1
 *     Luna -> Annette : Carol 3, Delphin 2, Annette 1, spoiled 1
 *     Luna -> Isaiah  : Carol 3, Delphin 2, Isaiah 1, spoiled 1
 *   Carol always strictly leads -> Carol faces John. No tie is reachable.
 * PUBLIC VOTE (SAVE polarity, §0.1): Carol 200,649 saved, John 200,521 condemned.
 *
 * Rooms: shared House maps keyed by their shared ids (ROOMS below) with a
 * minimal fallback when a shared map is not registered yet. Movement between
 * rooms is driven by the watch (day-slot menu), so shared exits to rooms this
 * chapter doesn't load simply stay locked.
 * ========================================================================= */
(function () {
  'use strict';

  /* ------------------------------------------------------------------ *
   * ONE constants object for the shared room ids
   * ------------------------------------------------------------------ */
  var ROOMS = {
    luna: 'house_luna_room',
    library: 'house_library',
    kitchen: 'house_kitchen',
    dining: 'house_dining',
    lounge: 'house_lounge',
    arcade: 'house_arcade',
    court: 'house_gym_courtroom',
    dolls: 'house_doll_room'
  };

  var DEF = { m_delphin: 15, m_isaiah: 30, m_kessie: 25, m_annette: 40, m_waverly: 60 };

  /* ------------------------------------------------------------------ *
   * Shared-map helper: use G.shared.map when it exists, else a fallback.
   * On a shared layout, this chapter's entities and staging spots are
   * moved to the nearest free walkable tile (or to a named shared mark).
   * ------------------------------------------------------------------ */
  function mergeExt(base, ext) {
    var m = G.cloneDef(base);
    Object.keys(ext).forEach(function (k) {
      if (k === 'spots') return;
      var v = G.cloneDef(ext[k]);
      if (['npcs', 'objects', 'zones', 'exits', 'lights'].indexOf(k) >= 0) m[k] = (m[k] || []).concat(v || []);
      else if (k === 'legend') m.legend = Object.assign({}, m.legend || {}, v);
      else m[k] = v;
    });
    return m;
  }
  function xyOf(v) { return Array.isArray(v) ? { x: v[0], y: v[1] } : v && v.x != null ? { x: v.x, y: v.y } : null; }

  function fitShared(name, m, ext) {
    var built = G.Map.build(m);
    var taken = {};
    function key(x, y) { return x + ',' + y; }
    var mine = {};
    (ext.npcs || []).concat(ext.objects || []).forEach(function (e) { mine[e.id] = true; });
    (m.npcs || []).concat(m.objects || []).forEach(function (e) { if (!mine[e.id] && e.at) taken[key(e.at[0], e.at[1])] = true; });
    (m.exits || []).forEach(function (e) { if (e.at) taken[key(e.at[0], e.at[1])] = true; });
    function free(x, y) { return x >= 0 && y >= 0 && x < built.w && y < built.h && !G.Map.solidAt(built, x, y) && !taken[key(x, y)]; }
    function nearest(x, y) {
      x = Math.max(0, Math.min(built.w - 1, x)); y = Math.max(0, Math.min(built.h - 1, y));
      var seen = {}, q = [[x, y]]; seen[key(x, y)] = 1;
      while (q.length) {
        var c = q.shift();
        if (free(c[0], c[1])) return c;
        [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) {
          var nx = c[0] + d[0], ny = c[1] + d[1];
          if (nx < 0 || ny < 0 || nx >= built.w || ny >= built.h || seen[key(nx, ny)]) return;
          seen[key(nx, ny)] = 1; q.push([nx, ny]);
        });
      }
      return [x, y];
    }
    // fallback-only decoration (wall-mounted / furniture examines) is dropped on a shared layout
    m.objects = (m.objects || []).filter(function (o) { return !(mine[o.id] && o.fb); });
    (m.objects || []).forEach(function (o) {
      if (!mine[o.id]) return;
      if (o.sharedProp) o.prop = o.sharedProp;
      var p = nearest(o.at[0], o.at[1]); o.at = p; taken[key(p[0], p[1])] = true;
    });
    var marks = (G.shared.data && G.shared.data.marks && G.shared.data.marks[name]) || {};
    var spawns = (G.shared.data && G.shared.data.spawns && G.shared.data.spawns[name]) || {};
    var spots = {};
    Object.keys(ext.spots || {}).forEach(function (k) {
      var s = ext.spots[k];
      var at = Array.isArray(s) ? s : s.at, mk = Array.isArray(s) ? null : s.mark;
      var p = null;
      if (mk && marks[mk]) p = xyOf(marks[mk]);
      else if (mk && built.markers && built.markers[mk]) p = built.markers[mk][0];
      if (!p && k === 'entry') {
        var sk = Object.keys(spawns)[0];
        p = sk ? xyOf(spawns[sk]) : built.spawn;
      }
      var r = p ? [p.x, p.y] : nearest(at[0], at[1]);
      if (!p) taken[key(r[0], r[1])] = true;
      spots[k] = r;
    });
    m.ch05Spots = spots;
  }

  function house(k, ext, fallback) {
    var name = ROOMS[k];
    var m;
    if (G.shared.has(name)) {
      var ext2 = {}; Object.keys(ext).forEach(function (kk) { if (kk !== 'spots') ext2[kk] = ext[kk]; });
      m = G.shared.map(name, ext2);
      try { fitShared(name, m, ext); } catch (e) { G.warn('ch05: could not fit entities onto ' + name + ': ' + e.message); m.ch05Spots = G.cloneDef(ext.spots || {}); }
    } else {
      m = mergeExt(fallback, ext);
      var sp = {};
      Object.keys(ext.spots || {}).forEach(function (kk) { var s = ext.spots[kk]; sp[kk] = Array.isArray(s) ? s.slice() : s.at.slice(); });
      m.ch05Spots = sp;
    }
    return m;
  }

  /* ------------------------------------------------------------------ *
   * Custom tiles and props (used by the fallback maps / this chapter)
   * ------------------------------------------------------------------ */
  var TILES = {
    rubber: { color: '#25222b', color2: '#2d2a35', pattern: 'noise' },
    dollshelf: {
      solid: true, base: 'floor',
      draw: function (g, x, y, info) {
        g.fillStyle = '#3a2418'; g.fillRect(x, y, 16, 16);
        g.fillStyle = '#5a3a26'; g.fillRect(x, y + 7, 16, 2); g.fillRect(x, y + 15, 16, 1);
        var seed = (info.tx * 7 + info.ty * 3) % 4;
        for (var i = 0; i < 3; i++) {
          var dx = x + 1 + i * 5;
          g.fillStyle = ['#e9d8cc', '#f0e2d6', '#dccbbd'][(i + seed) % 3]; g.fillRect(dx, y + 2, 4, 5);
          g.fillStyle = ['#b03030', '#e8d24a', '#2a1a12', '#c46a2a'][(i + seed) % 4]; g.fillRect(dx, y + 1, 4, 2);
          g.fillStyle = '#111'; g.fillRect(dx + 1, y + 4, 1, 1); g.fillRect(dx + 3, y + 4, 1, 1);
          g.fillStyle = '#a01818'; g.fillRect(dx + 1, y + 5, 1, 2);
          g.fillStyle = ['#7a3a8a', '#3a6a9a', '#9a2a3a'][(i + seed) % 3]; g.fillRect(dx, y + 9, 4, 6);
          g.fillStyle = '#e9d8cc'; g.fillRect(dx + 1, y + 8, 2, 1);
        }
      }
    }
  };

  var PROPS = {
    ch05book: function (g, x, y) {
      g.fillStyle = '#2a4a7a'; g.fillRect(x + 4, y + 6, 9, 6);
      g.fillStyle = '#e9dfc4'; g.fillRect(x + 4, y + 11, 9, 1);
      g.fillStyle = '#f2b33d'; g.fillRect(x + 6, y + 8, 5, 1);
    },
    ch05cab: function (g, x, y, t, obj) {
      var c = (obj && obj.def && obj.def.color) || '#7a2a8a';
      g.fillStyle = '#111'; g.fillRect(x + 2, y - 8, 12, 24);
      g.fillStyle = c; g.fillRect(x + 3, y - 7, 10, 22);
      g.fillStyle = '#0a0a12'; g.fillRect(x + 4, y - 4, 8, 7);
      var on = Math.floor((t || 0) * 3) % 2;
      g.fillStyle = on ? '#b6f24a' : '#3fc1c9'; g.fillRect(x + 5, y - 3, 6, 5);
      g.fillStyle = '#e8323c'; g.fillRect(x + 5, y + 6, 2, 2);
      g.fillStyle = '#f2b33d'; g.fillRect(x + 9, y + 6, 2, 2);
    },
    ch05cage: function (g, x, y) {
      g.fillStyle = 'rgba(20,20,24,0.35)'; g.fillRect(x - 3, y - 14, 22, 30);
      g.fillStyle = '#8a8a96';
      for (var i = 0; i < 6; i++) g.fillRect(x - 3 + i * 4, y - 14, 1, 30);
      g.fillRect(x - 3, y - 14, 22, 2); g.fillRect(x - 3, y + 14, 22, 2);
      g.fillStyle = '#3a3a44'; g.fillRect(x - 3, y + 16, 3, 2); g.fillRect(x + 16, y + 16, 3, 2);
    },
    ch05samantha: function (g, x, y) {
      g.fillStyle = '#c0182a'; g.fillRect(x - 2, y - 14, 20, 8); g.fillRect(x - 4, y - 10, 4, 10); g.fillRect(x + 16, y - 10, 4, 10);
      g.fillStyle = '#f4dcd0'; g.fillRect(x, y - 8, 16, 14);
      g.fillStyle = '#6ad4ff'; g.fillRect(x + 3, y - 4, 3, 3); g.fillRect(x + 10, y - 4, 3, 3);
      g.fillStyle = '#111'; g.fillRect(x + 4, y - 3, 1, 1); g.fillRect(x + 11, y - 3, 1, 1);
      g.fillStyle = '#7a2a9a'; g.fillRect(x + 5, y + 2, 6, 2);
      g.fillStyle = '#9a1020'; g.fillRect(x + 4, y - 1, 1, 3); g.fillRect(x + 11, y - 1, 1, 3);
      g.fillStyle = '#5a2a6a'; g.fillRect(x + 2, y + 6, 12, 9);
      g.fillStyle = '#c9a24a'; g.fillRect(x + 13, y + 4, 2, 8); g.fillRect(x + 11, y + 3, 6, 3);
    },
    ch05mirror: function (g, x, y, t) {
      g.fillStyle = '#c9a24a'; g.fillRect(x + 2, y - 10, 12, 26);
      g.fillStyle = '#9fb8cc'; g.fillRect(x + 4, y - 8, 8, 22);
      g.fillStyle = 'rgba(255,255,255,0.5)'; g.fillRect(x + 5, y - 6, 2, 10);
    },
    ch05toaster: function (g, x, y) {
      g.fillStyle = '#b8bcc4'; g.fillRect(x + 2, y + 4, 12, 9);
      g.fillStyle = '#7a7e86'; g.fillRect(x + 2, y + 12, 12, 2);
      g.fillStyle = '#222'; g.fillRect(x + 4, y + 5, 3, 1); g.fillRect(x + 9, y + 5, 3, 1);
      g.fillStyle = '#e9dfc4'; g.fillRect(x + 5, y + 2, 2, 3);
    }
  };

  /* ------------------------------------------------------------------ *
   * Fallback maps (minimal; used only until the shared House maps land)
   * ------------------------------------------------------------------ */
  var FB = {};
  FB.luna = {
    name: "Luna's Room (No. 3)",
    tiles: [
      '####WW####',
      '#V,,,,Tbb#',
      '#,,,,,,bb#',
      '#,,,,,,,,#',
      '#,,,RR,,,#',
      '#,,,RR,,,#',
      '#d,,,,,,,#',
      '#k,,,,,,P#',
      '#####D####'
    ],
    ambient: 'hum', tint: '#3a2030', tintAlpha: 0.1
  };
  FB.library = {
    name: 'Library',
    tiles: [
      '##############',
      '#kkkkkkkkkkkk#',
      '#,,,,,,,,,,,c#',
      '#,cc,,,,,,,,,#',
      '#,,,,,TT,,,,,#',
      '#,,,,,TT,,cc,#',
      '#k,,,,,,,,,,k#',
      '#k,,,,,,,,,,k#',
      '#k,cc,,,,,,,k#',
      '#k,,,,,,,,,,k#',
      '#k,,,,,,,,,,P#',
      '#P,,,,,,,,,,,#',
      '######D#######'
    ],
    ambient: 'hum', tint: '#30281a', tintAlpha: 0.12
  };
  FB.kitchen = {
    name: 'Kitchen',
    tiles: [
      '##############',
      '#KKSKKOOKK.FF#',
      '#::::::::::::#',
      '#::KKKK::KKK:#',
      '#::::::::::::#',
      '#::nnnn::nnn:#',
      '#::::::::::::#',
      '#:::::::::XX:#',
      '#:::::::::XX:#',
      '#P:::::::::::#',
      '######D#######'
    ],
    ambient: 'hum'
  };
  FB.dining = {
    name: 'Dining Room',
    tiles: [
      '################',
      '#P.....LL.....P#',
      '#..............#',
      '#..cccccccccc..#',
      '#..TTTTTTTTTT..#',
      '#..cccccccccc..#',
      '#..............#',
      '#P.............#',
      '#######D########'
    ],
    ambient: 'hum', tint: '#40281a', tintAlpha: 0.1
  };
  FB.lounge = {
    name: 'Lounge',
    tiles: [
      '################',
      '#V.....,,....P.#',
      '#..............#',
      '#..hhh....hhh..#',
      '#......TT......#',
      '#..hhh....hhh..#',
      '#..............#',
      '#,,,,,,,,,,,,,,#',
      '#..............#',
      '#P............P#',
      '#######D########'
    ],
    ambient: 'hum'
  };
  FB.arcade = {
    name: 'Arcade',
    tiles: [
      '##############',
      '#::::::::::::#',
      '#::::::::::::#',
      '#::::::::::::#',
      '#::::::::::::#',
      '#::::::::::::#',
      '#::TT::::::::#',
      '#::::::::::::#',
      '#::::::::::::#',
      '#P:::::::::::#',
      '######D#######'
    ],
    ambient: 'hum', tint: '#301040', tintAlpha: 0.15
  };
  FB.court = {
    name: 'Gymnasium: the Courtroom',
    legend: { 'r': 'rubber' },
    tiles: [
      'EEEEEEEEEEEEEEEEEEEEEEEE',
      '#rrrrrrrrrpppprrrrrrrrrG',
      '#rrrrrrrrrpppprrrrrrrrrG',
      '#rrrrrrrrrrrrrrrrrrrrrrG',
      '#rrrrrrrrrrrrrrrrrrrrrrG',
      '#rrrrrrrrrrffrrrrrrrrrrG',
      '#rrrrrcrrrrffrrrrrcrrrrG',
      '#rrrrrrRRRRRRRRRRRRRRRrG',
      '#rrrrrrrrrrrrrrrrrrrrrrG',
      '#rrrrrcccccccccrrrrrrrrG',
      '#rrrrrrrrrrrrrrrrrrrrrrG',
      '#nnnnnnnnnnrnnnnnnnnnnnG',
      '#rrrrrrrrrrrrrrrrrrrrrrG',
      '#nnnnnnnnnnrnnnnnnnnnnnG',
      '###########D############'
    ],
    ambient: 'crowd', dark: 0.35,
    lights: [{ at: [11, 5], r: 60 }, { at: [21, 6], r: 30, flicker: true }, { at: [11, 2], r: 44 }]
  };
  FB.dolls = {
    name: 'The Doll Room',
    legend: { 'q': 'dollshelf' },
    tiles: [
      '#######WW#########',
      '#qqqqqqq.qqqqqqqq#',
      '#q..............q#',
      '#q..............q#',
      '#q...c.c.c.c....q#',
      '#q..............q#',
      '#q..............q#',
      '#q..............q#',
      '#q...c.c.c.c....q#',
      '#q..............q#',
      '#qqqqqqq.qqqqqqqq#',
      '########D#########'
    ],
    ambient: 'tension', tint: '#401018', tintAlpha: 0.12
  };

  /* ------------------------------------------------------------------ *
   * Rooms: chapter objects + staging spots on top of the shared maps
   * ------------------------------------------------------------------ */
  var MAPS = {};
  MAPS[ROOMS.luna] = house('luna', {
    objects: [
      { id: 'ch05_window', at: [4, 0], sharedProp: 'sparkle', solid: false, examine: [{ think: 'The window is sealed. Down below, almond blossoms. Pink, in January. Everything here is pretty on purpose.' }] },
      { id: 'ch05_photo', at: [6, 1], prop: 'photo', examine: [{ think: 'Waverly. Brown curls sticking out like static. Eleven years old and already braver than me.' }] },
      { id: 'ch05_tablet', at: [1, 1], fb: true, examine: [{ think: 'The wall tablet. "Curated memories" of Waverly on a loop. Someone at DPE picked which of my daughter\'s faces I get to see.' }] },
      { id: 'ch05_desk', at: [1, 6], fb: true, examine: 'A DPE pen and the penguin booklet. "Rule 4: Gratitude is the first step to Redemption."' },
      { id: 'ch05_eye', at: [8, 0], prop: 'camera', fb: true, examine: [{ think: 'The smoke detector has a lens. I\'ve started calling it Eye. Good night, Eye.' }] }
    ],
    spots: { entry: [4, 3], window: [4, 1], door: [5, 7], bed: [6, 2] }
  }, FB.luna);

  MAPS[ROOMS.library] = house('library', {
    objects: [
      { id: 'ch05_newberry', at: [6, 4], prop: 'ch05book', examine: [{ think: 'The Newberry Twins. I read the first three in a few hours before I realised I\'d have to slow down to make them last.' }, { think: 'Does it matter? I might not be alive this time next week.' }] },
      { id: 'ch05_sign', at: [10, 11], prop: 'sign', examine: '"Books may not be removed from the library. Violators will face punitive measures." The letters glow fluorescent blue.' },
      { id: 'ch05_falsville', at: [2, 1], fb: true, examine: [{ think: 'The Falsville series. Waverly made me do all the voices.' }] },
      { id: 'ch05_spine', at: [10, 1], fb: true, examine: [{ think: 'One spine has no title. Just a tiny glass eye where the title should be. Even the books are watching.' }] }
    ],
    spots: { entry: [6, 11], isaiah: [3, 3], luna: [2, 4], ginerva: [6, 11], ginervaStop: [6, 9], read: [5, 4] }
  }, FB.library);

  MAPS[ROOMS.kitchen] = house('kitchen', {
    objects: [
      { id: 'ch05_kettle', at: [9, 1], prop: 'teacup', examine: [{ think: 'Annette\'s tea station. Eleven tins, all labelled in her spidery hand. One just says "for later".' }] },
      { id: 'ch05_fridge', at: [11, 1], fb: true, examine: 'Real meat. Steaks, a whole ham, sausages in a glass drawer. Waverly and I lived on bread heels for a month last winter.' },
      { id: 'ch05_bleach', at: [1, 4], prop: 'bucket', examine: [{ think: 'Two squirts of bleach, a quick wipe, and you have yourself a gleaming countertop. Years of tiny sticky hands taught me that.' }] },
      { id: 'ch05_kcam', at: [7, 0], prop: 'camera', fb: true, examine: [{ think: 'One camera. A little red dot that never blinks.' }] }
    ],
    spots: { entry: [6, 9], kessie: [4, 4], annette: [9, 2], kessieTea: [11, 4], luna: [6, 4] }
  }, FB.kitchen);

  MAPS[ROOMS.dining] = house('dining', {
    objects: [
      { id: 'ch05_stew', at: [8, 4], fb: true, examine: [{ think: 'Kessie\'s stew. Meaty, with a tinge of spice. I have to stop myself tipping the whole bowl into my mouth.' }] }
    ],
    spots: { entry: [8, 6], luna: [8, 5], carol: [6, 3], john: [7, 3], delphin: [9, 3], annette: [11, 5], isaiah: [5, 5], kessie: [13, 4] }
  }, FB.dining);

  MAPS[ROOMS.lounge] = house('lounge', {
    objects: [
      { id: 'ch05_poster', at: [3, 0], prop: 'poster', examine: [{ think: '"Mercy will be granted to those that atone." The Great Leader stands above the words. Somebody has drawn him a very small pair of horns.' }] },
      { id: 'ch05_mirror', at: [11, 1], prop: 'ch05mirror', if: 'ch05_day >= 2', examine: [{ think: 'A full-length mirror, new since yesterday. A producer must have decided we weren\'t polling pretty enough.' }] },
      { id: 'ch05_lcam', at: [14, 0], prop: 'camera', fb: true, examine: [{ think: 'The red dot in the corner of the ceiling. Blinking. Someone is watching live.' }] }
    ],
    spots: { entry: [7, 9], delphin: [5, 6], kessie: [9, 6], carol: [7, 6], john: [1, 8], lunaJohn: [2, 8], chair: [8, 6], luna: [7, 7], mirror: [11, 2] }
  }, FB.lounge);

  MAPS[ROOMS.arcade] = house('arcade', {
    objects: [
      { id: 'ch05_wheel', at: [2, 1], prop: 'ch05cab', color: '#c9a24a', examine: 'A wheel of fortune. Every slice says a different word for "grateful".' },
      { id: 'ch05_booth', at: [5, 1], prop: 'ch05cab', color: '#7a1218' },
      { id: 'ch05_jackpot', at: [8, 1], prop: 'ch05cab', color: '#2a6a3a' },
      { id: 'ch05_dance', at: [11, 1], prop: 'ch05cab', color: '#7a2a8a' },
      { id: 'ch05_pinball', at: [11, 5], prop: 'ch05cab', color: '#2a4a8a', examine: 'Pinball. The flippers are shaped like little gavels.' }
    ],
    spots: { entry: [6, 9], isaiah: [3, 7], delphin: [5, 2], luna: [7, 4], overhear: [8, 7] }
  }, FB.arcade);

  var MANNEQUIN = { name: 'Mannequin', skin: '#efe6e0', hair: '#d22a2a', hairStyle: 'curly', outfit: '#b02a3a', outfit2: '#202028', style: 'suit' };
  MAPS[ROOMS.court] = house('court', {
    npcs: [
      { id: 'ch05_jury1', at: [2, 2], spec: MANNEQUIN, facing: 'right', turn: false, talk: 'Painted tears. A clown smile. It doesn\'t blink.' },
      { id: 'ch05_jury2', at: [3, 2], spec: MANNEQUIN, facing: 'right', turn: false, talk: '...' },
      { id: 'ch05_jury3', at: [2, 4], spec: MANNEQUIN, facing: 'right', turn: false, talk: '...' },
      { id: 'ch05_jury4', at: [3, 4], spec: MANNEQUIN, facing: 'right', turn: false, talk: '...' },
      { id: 'ch05_aud1', at: [2, 12], spec: G.shared.extra ? G.shared.extra('audience', 51) : G.Sprites.randomSpec(51), facing: 'up', turn: false },
      { id: 'ch05_aud2', at: [6, 12], spec: G.shared.extra ? G.shared.extra('audience', 52) : G.Sprites.randomSpec(52), facing: 'up', turn: false },
      { id: 'ch05_aud3', at: [9, 12], spec: G.shared.extra ? G.shared.extra('audience', 53) : G.Sprites.randomSpec(53), facing: 'up', turn: false },
      { id: 'ch05_aud4', at: [14, 12], spec: G.shared.extra ? G.shared.extra('audience', 54) : G.Sprites.randomSpec(54), facing: 'up', turn: false },
      { id: 'ch05_aud5', at: [18, 12], spec: G.shared.extra ? G.shared.extra('audience', 55) : G.Sprites.randomSpec(55), facing: 'up', turn: false },
      { id: 'ch05_aud6', at: [21, 12], spec: G.shared.extra ? G.shared.extra('audience', 56) : G.Sprites.randomSpec(56), facing: 'up', turn: false }
    ],
    objects: [
      { id: 'ch05_mic', at: [12, 5], prop: 'mic', solid: false, examine: 'The microphone. Seven of us will stand here today and name someone to die.' },
      { id: 'ch05_cage', at: [21, 6], prop: 'ch05cage', layer: 1, if: 'ch05_cageInCourt', examine: [{ think: 'A cage fit for a Saint Bernard. On wheels. Chains at each corner.' }] },
      { id: 'ch05_box', at: [13, 4], prop: 'ch05toaster', examine: 'A ballot box shaped like a toaster. Somebody thought that was funny.' }
    ],
    spots: {
      entry: [11, 12], mic: [11, 5], trader: { at: [11, 2], mark: 'judge_bench' },
      defLeft: { at: [6, 6], mark: 'defendant_left' }, defRight: { at: [17, 6], mark: 'defendant_right' },
      cage: { at: [21, 6], mark: 'cage' },
      seat_annette: [6, 9], seat_carol: [7, 9], seat_john: [8, 9], seat_kessie: [9, 9], seat_isaiah: [10, 9], seat_delphin: [11, 9], seat_luna: [12, 9],
      line1: [11, 13], ginerva: [4, 9], tb1: [20, 5], tb2: [20, 8], camera: [13, 7]
    }
  }, FB.court);

  MAPS[ROOMS.dolls] = house('dolls', {
    objects: [
      { id: 'ch05_samantha', at: [8, 1], prop: 'ch05samantha', examine: [{ say: 'delphin', text: 'Careful. She bites. Only on Tuesdays.' }] },
      { id: 'ch05_dwindow', at: [7, 0], fb: true, examine: 'A window over a three-car parking lot. It\'s raining. It\'s always raining up here.' },
      { id: 'ch05_cage2', at: [13, 6], prop: 'ch05cage', layer: 1, if: 'ch05_cageInDolls', examine: [{ think: 'John hangs from the centre like a cricket splayed on a spider\'s web.' }] },
      { id: 'ch05_toaster', at: [9, 6], prop: 'ch05toaster', examine: 'The toaster ballot box from the courtroom, carried up here like a relic.' }
    ],
    spots: {
      entry: [8, 9], trader: [8, 6], cage: [13, 6], door: [8, 10],
      seat_annette: [5, 4], seat_carol: [7, 4], seat_john: [9, 4], seat_kessie: [11, 4],
      seat_isaiah: [5, 8], seat_delphin: [7, 8], seat_luna: [9, 8], seat_x: [11, 8],
      tb1: [12, 5], tb2: [12, 7], tbL: [7, 2], tbR: [9, 2], top: [9, 2], camera: [14, 8]
    }
  }, FB.dolls);

  function spot(roomKey, name) {
    var m = MAPS[ROOMS[roomKey]];
    var s = m && m.ch05Spots && m.ch05Spots[name];
    return s ? [s[0], s[1]] : [1, 1];
  }

  /* ------------------------------------------------------------------ *
   * Small helpers
   * ------------------------------------------------------------------ */
  function meter(api, k, d) {
    var v = api.get(k, DEF[k]);
    if (typeof v !== 'number') v = DEF[k];
    v = Math.max(0, Math.min(100, v + d));
    api.set(k, v);
    return v;
  }

  /** Put NPCs into a room (replaces whatever this chapter staged there before). */
  var staged = {};
  function stage(api, roomKey, list) {
    var mapId = ROOMS[roomKey];
    (staged[mapId] || []).forEach(function (id) { api.remove(id, mapId); });
    var st = G.World && G.World.roomState && G.World.roomState[G.lookupKey('maps', mapId) || mapId];
    staged[mapId] = [];
    list.forEach(function (n) {
      var def = {};
      Object.keys(n).forEach(function (k) { if (k !== 'spot') def[k] = n[k]; });
      def.at = n.at || spot(roomKey, n.spot || n.id);
      if (st && st.moved) delete st.moved[def.id];
      api.addNpc(def, mapId);
      staged[mapId].push(def.id);
    });
  }
  async function go(api, roomKey, where, facing) {
    await api.goRoom(ROOMS[roomKey], { at: spot(roomKey, where || 'entry'), facing: facing || 'up' });
  }
  async function shock(api, hard) {
    api.sound('buzzer');
    api.flash('#e8323c', hard ? 400 : 220);
    await api.shake(hard ? 500 : 280, hard ? 3 : 1.5);
  }
  async function watch(api, title, text) {
    api.sound('blip');
    await api.slides([{ style: 'screen', title: title, text: text }]);
  }

  /* ------------------------------------------------------------------ *
   * Secret tasks (CANON §4.11: two a day; +5 audience; fail = mild shock;
   * telling a contestant = "punishable by execution" warning, then greyed)
   * ------------------------------------------------------------------ */
  var TASKS = {
    read_aloud: 'Read aloud in the library.',
    carol_voice: 'Get Carol to raise her voice on camera.',
    arcade_win: 'Hit the jackpot in the arcade.',
    cry: 'Make someone cry.',
    praise: 'Praise the Great Leader where a camera can hear you.',
    annette_secret: 'Get Annette to tell you a secret.'
  };
  var DAY_TASKS = [['read_aloud', 'carol_voice'], ['arcade_win', 'cry'], ['praise', 'annette_secret']];
  function tflag(t) { return 'ch05_task_' + t; }
  function active(t) { return 'ch05_task_' + t + ' == active'; }
  async function completeTask(api, t) {
    if (api.get(tflag(t)) !== 'active') return;
    api.set(tflag(t), 'done');
    api.add('ch05_tasksDone');
    api.sound('success');
    api.lowerThird('TASK COMPLETE', TASKS[t], 2600);
    api.approvalAdd(5);
  }
  async function disclose(api, who) {
    await api.say('luna', who + ', the watch gave me a task this morning, it says I have to -');
    api.sound('alarm');
    await shock(api, true);
    await watch(api, 'WARNING', 'CRIMINAL BARTLEY.\n\nDisclosure of tasks is punishable by execution.\n\nThis is your only warning.');
    api.set('ch05_warned', true);
    await api.think('My wrist is on fire. Fine. Message received. The tasks are between me and the people who write them.');
  }
  var DISCLOSE = { text: '(Tell them about your secret task.)', if: '!ch05_warned' };

  /* ------------------------------------------------------------------ *
   * Custom minigames
   * ------------------------------------------------------------------ */
  var R0 = function () { return G.Render; };

  // --- EAVESDROP: climb the doll stands while Carol keeps looking back ---
  var EAVES_LINES = [
    [0, 'carol', 'You\'ve got to tell them not to vote for you.'],
    [1, 'john', 'What?'],
    [2, 'carol', 'You heard me. Tell them not to save you. It\'s the only way.'],
    [3, 'john', 'How could you ask me to do something like that?'],
    [4, 'carol', 'John. Johnny. Love. Don\'t you love me?'],
    [5, 'john', 'Of course I do. But this is too much for anyone.'],
    [6, 'carol', 'If you loved me you\'d do this one thing. One little speech.'],
    [7, 'john', 'Care-bear... please don\'t make me.']
  ];
  var eavesdrop = {
    autoSolve: function () { return { success: true, spotted: 0, heard: EAVES_LINES.length }; },
    start: function (ctx) {
      var R = ctx.R, P = ctx.PAL, W = ctx.W, H = ctx.H;
      var N = 8, DOLL = { 0: 1, 2: 1, 4: 1, 6: 1, 8: 1 };
      var step = 0, from = 0, moveT = 0, moving = false;
      var state = 'away', stT = 0, stDur = 2.2, susp = 0, lives = 3, spotted = 0, msg = '', msgT = 0, done = null, doneT = 0;
      var heard = 0, rng = G.util.rng(505);
      function stepPos(i) { return { x: 70 + i * 26, y: 186 - i * 15 }; }
      function setState(s) { state = s; stT = 0; stDur = s === 'away' ? 1.3 + rng() * 1.6 : s === 'warn' ? 0.6 : 1.4; }
      function caught(why) {
        lives--; spotted++; ctx.sound('buzzer'); msg = why; msgT = 2.0; susp = 0;
        var back = Math.max(0, step - 1); while (back > 0 && !DOLL[back]) back--; step = back; moving = false;
        setState('away'); stDur += 1.2;
        if (lives <= 0) { done = { success: false, spotted: spotted, heard: heard }; doneT = 0; msg = 'Carol: "What the hell are you doing? We\'re trying to have a private conversation here."'; msgT = 9; }
      }
      return new Promise(function (resolve) {
        ctx.loop(function (dt) {
          var I = ctx.input;
          if (msgT > 0) msgT -= dt;
          if (done) { doneT += dt; if (doneT > 1.6 && (I.pressed('ok') || doneT > 6)) { I.consume('ok'); resolve(done); } return; }
          stT += dt;
          if (stT > stDur) setState(state === 'away' ? 'warn' : state === 'warn' ? 'look' : 'away');
          if (moving) {
            moveT += dt;
            if (state === 'look') { caught('Carol turns. You\'re caught mid-step.'); return; }
            if (moveT > 0.32) { moving = false; }
          } else {
            if (I.pressed('up') && step < N) { from = step; step++; moving = true; moveT = 0; ctx.sound('step'); }
            else if (I.pressed('down') && step > 0) { from = step; step--; moving = true; moveT = 0; ctx.sound('step'); }
          }
          if (state === 'look' && !moving && !DOLL[step]) { susp += dt * 1.1; if (susp > 1) caught('Standing on a bare step, staring. Carol glares straight at you.'); }
          else susp = Math.max(0, susp - dt * 0.5);
          while (heard < EAVES_LINES.length && EAVES_LINES[heard][0] <= step && !moving) { heard++; if (heard > 1) ctx.sound('blip'); }
          if (step >= N && !moving) { done = { success: true, spotted: spotted, heard: EAVES_LINES.length }; heard = EAVES_LINES.length; doneT = 0; ctx.sound('success'); msg = 'You reach Samantha. Delphin slings an arm around the giant doll.'; msgT = 9; }
        }, function (t) {
          var g = R.ctx;
          var grad = g.createLinearGradient(0, 0, 0, H); grad.addColorStop(0, '#2a0c14'); grad.addColorStop(1, '#0a0508');
          g.fillStyle = grad; g.fillRect(0, 0, W, H);
          // back wall of dolls
          for (var yy = 28; yy < 120; yy += 18) for (var xx = 8; xx < W; xx += 14) {
            var a = 0.18 + 0.1 * ((xx * 7 + yy) % 3);
            R.rect(xx, yy, 8, 9, '#e9d8cc', a); R.rect(xx + 2, yy + 3, 1, 1, '#000', a * 2); R.rect(xx + 5, yy + 3, 1, 1, '#000', a * 2); R.rect(xx + 2, yy + 5, 1, 3, '#a01818', a * 2);
          }
          // steps
          for (var i = 0; i <= N; i++) {
            var p = stepPos(i);
            R.rect(p.x - 18, p.y, 44, 6, i % 2 ? '#4a3a40' : '#5a4650'); R.rect(p.x - 18, p.y + 6, 44, 200, '#1a1218', 0.85);
            if (DOLL[i] && i < N) { R.rect(p.x + 14, p.y - 9, 7, 8, '#efe0d4'); R.rect(p.x + 15, p.y - 10, 5, 2, '#c0182a'); R.rect(p.x + 15, p.y - 6, 1, 1, '#111'); R.rect(p.x + 18, p.y - 6, 1, 1, '#111'); R.rect(p.x + 15, p.y - 5, 1, 3, '#a01818'); }
          }
          // Samantha + Carol + John at the top
          var top = stepPos(N);
          R.rect(top.x + 34, top.y - 54, 30, 22, '#c0182a'); R.rect(top.x + 38, top.y - 44, 22, 22, '#f4dcd0'); R.rect(top.x + 42, top.y - 38, 4, 4, '#6ad4ff'); R.rect(top.x + 52, top.y - 38, 4, 4, '#6ad4ff'); R.rect(top.x + 45, top.y - 28, 8, 3, '#7a2a9a');
          var cdir = state === 'look' ? 'down' : state === 'warn' ? (Math.floor(t * 8) % 2 ? 'left' : 'up') : 'up';
          R.img(ctx.sprite('john', 'up', 0), top.x + 18, top.y - 50, 1.6);
          R.img(ctx.sprite('carol', cdir, 0), top.x + 2, top.y - 52, 1.6);
          if (state === 'warn') R.text('?', top.x + 14, top.y - 66, { size: 12, color: P.amber, align: 'center' });
          if (state === 'look') {
            g.save(); g.globalAlpha = 0.18; g.fillStyle = P.red; g.beginPath(); g.moveTo(top.x + 14, top.y - 30); g.lineTo(20, H); g.lineTo(top.x - 40, H); g.closePath(); g.fill(); g.restore();
            R.text('!', top.x + 14, top.y - 68, { size: 14, color: P.red, align: 'center' });
          }
          // Luna + Delphin
          var a0 = stepPos(from), a1 = stepPos(step), k = moving ? Math.min(1, moveT / 0.32) : 1;
          var lx = a0.x + (a1.x - a0.x) * k, ly = a0.y + (a1.y - a0.y) * k;
          var d = stepPos(Math.max(0, step - 1));
          R.img(ctx.sprite('delphin', 'up', 0), d.x - 20, d.y - 44, 1.6);
          R.img(ctx.sprite('luna', 'up', moving ? 1 + Math.floor(t * 8) % 2 : 0), lx - 6, ly - 44, 1.6);
          if (susp > 0.05) { R.rect(lx - 6, ly - 52, 26, 3, '#000', 0.6); R.rect(lx - 6, ly - 52, 26 * Math.min(1, susp), 3, P.red); }
          ctx.header('THE BREAK: EAVESDROP', 'SPOTTED ' + spotted + ' / 3');
          // transcript
          R.panel(196, 30, 182, 98, { alpha: 0.85 });
          R.text('OVERHEARD', 202, 34, { size: 7, color: P.dim });
          var shown = EAVES_LINES.slice(Math.max(0, heard - 4), heard), yy2 = 46;
          shown.forEach(function (l) {
            var lines = R.wrap((l[1] === 'carol' ? 'CAROL: ' : 'JOHN: ') + l[2], 168, 7, 'sans', '');
            lines.forEach(function (ln) { R.text(ln, 202, yy2, { size: 7, font: 'sans', style: '', color: l[1] === 'carol' ? '#ffb0c8' : '#d8d0b0' }); yy2 += 9; });
            yy2 += 2;
          });
          if (heard < EAVES_LINES.length) R.text('...closer...', 202, Math.min(yy2, 118), { size: 7, color: P.faint, style: 'italic' });
          if (msgT > 0 && msg) {
            var ml = R.wrap(msg, W - 40, 8, 'sans', '');
            R.rect(0, H - 40, W, 12 + ml.length * 10, '#000', 0.8);
            ml.forEach(function (ln, j) { R.text(ln, W / 2, H - 36 + j * 10, { size: 8, align: 'center', font: 'sans', style: '', color: '#fff' }); });
          }
          ctx.footer('UP/DOWN climb  ·  Move only while her back is turned  ·  When she turns, be on a DOLL step');
        });
      });
    }
  };

  // --- COUNT: Trader pulls slips out of the toaster box (Doll Room) ---
  var count = {
    autoSolve: function () { return { success: true }; },
    start: function (ctx) {
      var R = ctx.R, P = ctx.PAL, W = ctx.W, H = ctx.H, p = ctx.params;
      var idx = p.from, t0 = 0, finished = false;
      return new Promise(function (resolve) {
        ctx.loop(function (dt) {
          var I = ctx.input; t0 += dt;
          if (!finished && (t0 > 1.9 || (t0 > 0.4 && I.pressed('ok')))) {
            I.consume('ok'); idx++; t0 = 0; ctx.sound(idx >= p.to ? 'sting' : 'heartbeat');
            if (idx >= p.to) finished = true;
          } else if (finished && t0 > 0.6 && I.pressed('ok')) { I.consume('ok'); resolve({ success: true }); }
        }, function (t) {
          var g = R.ctx;
          var grad = g.createLinearGradient(0, 0, 0, H); grad.addColorStop(0, '#2a0a12'); grad.addColorStop(1, '#08040a');
          g.fillStyle = grad; g.fillRect(0, 0, W, H);
          ctx.header('PRIVATE VOTE: THE COUNT', 'Slips ' + Math.min(idx, p.slips.length) + ' / ' + p.slips.length);
          // toaster
          R.rect(30, 110, 70, 46, '#b8bcc4'); R.rect(30, 150, 70, 8, '#7a7e86'); R.rect(42, 112, 18, 3, '#222'); R.rect(70, 112, 18, 3, '#222');
          R.text('DPE', 65, 128, { size: 10, font: 'title', align: 'center', color: '#5a5e66', shadow: false });
          // current slip
          var cur = finished ? p.slips[p.to - 1] : p.slips[idx];
          if (cur && (!finished || true)) {
            var k = finished ? 1 : Math.min(1, t0 * 3);
            var sy = 108 - 50 * k;
            g.save(); g.translate(110 + 20 * k, sy); g.rotate(-0.06);
            R.rect(0, 0, 104, 44, P.paper); R.rect(0, 0, 104, 1, '#c8bca0');
            R.text('I vote for:', 6, 4, { size: 7, color: '#6a5a4a', shadow: false, style: '' });
            R.text(cur.text, 52, 18, { size: 14, font: 'hand', align: 'center', color: P.paperInk, shadow: false, style: '' });
            if (cur.col === 'spoiled' && (finished || t0 > 0.8)) { R.rect(4, 26, 96, 2, P.red); R.text('SPOILED', 52, 30, { size: 7, align: 'center', color: P.red, shadow: false }); }
            g.restore();
          }
          // tally board
          R.panel(246, 30, 130, 22 + p.cols.length * 22, { alpha: 0.9 });
          var counts = {};
          for (var i = 0; i < Math.min(idx + (finished ? 0 : 0), p.slips.length); i++) counts[p.slips[i].col] = (counts[p.slips[i].col] || 0) + 1;
          if (!finished && t0 > 0.9 && idx < p.slips.length) counts[p.slips[idx].col] = (counts[p.slips[idx].col] || 0) + 1;
          p.cols.forEach(function (c, j) {
            var y = 38 + j * 22, n = counts[c.id] || 0;
            R.text(c.name, 254, y + 3, { size: 8, color: c.id === 'spoiled' ? P.faint : '#fff' });
            for (var q = 0; q < n; q++) R.rect(320 + q * 9, y + 1, 6, 12, c.id === 'spoiled' ? P.faint : c.id === 'carol' ? P.red : P.amber);
          });
          if (finished) {
            R.rect(0, H - 40, W, 22, P.red, Math.min(1, t0 * 3));
            R.text(p.result || '', W / 2, H - 36, { size: 11, font: 'sans', align: 'center', color: '#fff' });
          }
          R.scanlines(0.12); R.vignette(0.4);
          ctx.footer(finished ? '[SPACE] continue' : '[SPACE] next slip');
        });
      });
    }
  };

  // --- SAVECOUNT: the public vote on the 20-ft holoscreen ---
  function fmt(n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
  var savecount = {
    autoSolve: function (p) { return { success: true, left: p.left.final, right: p.right.final }; },
    start: function (ctx) {
      var R = ctx.R, P = ctx.PAL, W = ctx.W, H = ctx.H, p = ctx.params;
      var T = 0, DUR = p.dur || 10, lead = 2.4, over = false;
      function val(side, tt) {
        var f = side.final, u = Math.max(0, Math.min(1, (tt - lead) / DUR));
        var e = 1 - Math.pow(1 - u, 2.2);
        var wob = Math.sin(tt * (side.phase || 3.1)) * 2600 * (1 - u) * Math.min(1, u * 6);
        return u >= 1 ? f : Math.max(0, f * e + wob);
      }
      return new Promise(function (resolve) {
        ctx.loop(function (dt) {
          T += dt;
          if (!over && T > lead + DUR) { over = true; ctx.sound('reveal'); }
          if (over && T > lead + DUR + 0.8 && ctx.input.pressed('ok')) { ctx.input.consume('ok'); resolve({ success: true, left: p.left.final, right: p.right.final }); }
        }, function (t) {
          var g = R.ctx;
          g.fillStyle = '#050308'; g.fillRect(0, 0, W, H);
          R.rect(16, 18, W - 32, 160, '#0a1a2a'); R.stroke(16, 18, W - 32, 160, '#3fc1c9', 1);
          R.static(0.06, 16, 18, W - 32, 160);
          R.text('RIGHT TO LIFE  ·  PUBLIC VOTE  ·  PRESS  SAVE', W / 2, 24, { size: 8, align: 'center', color: '#3fc1c9' });
          [p.left, p.right].forEach(function (s, i) {
            var cx = i === 0 ? 112 : 272;
            var v = val(s, T);
            var lose = over && s.final < (i === 0 ? p.right.final : p.left.final);
            R.rect(cx - 34, 42, 68, 68, lose ? P.red : '#3fc1c9');
            R.img(ctx.portrait(s.id, over ? (lose ? 'fear' : 'shock') : (s.mood || 'neutral')), cx - 30, 46, 1.5);
            R.text(s.name, cx, 116, { size: 10, font: 'sans', align: 'center', color: '#fff' });
            R.text(T < lead ? '0' : fmt(v), cx, 132, { size: 16, font: 'mono', align: 'center', color: lose ? P.red : P.neon });
            R.text('SAVES', cx, 152, { size: 7, align: 'center', color: P.dim });
          });
          if (T < lead) {
            var word = T < 0.8 ? 'READY...' : T < 1.6 ? 'SET...' : 'GOOOOO!';
            R.text(word, W / 2, 84, { size: 18, font: 'title', align: 'center', color: P.amber });
          }
          if (over) {
            var loser = p.left.final < p.right.final ? p.left : p.right;
            R.rect(0, H - 36, W, 20, P.red, Math.min(1, (T - lead - DUR) * 3));
            R.text('TIME. ' + loser.name + ' HAS THE FEWEST SAVES', W / 2, H - 32, { size: 11, font: 'sans', align: 'center', color: '#fff' });
          }
          R.scanlines(0.15); R.vignette(0.4);
          ctx.footer(over ? '[SPACE] continue' : 'The nation is voting. You can only watch.');
        });
      });
    }
  };

  /* ------------------------------------------------------------------ *
   * Window scene drawing (Thursday night)
   * ------------------------------------------------------------------ */
  function drawWindow(t, s, a) {
    var R = G.Render, g = R.ctx, W = G.W, H = G.H;
    g.save(); g.globalAlpha = a;
    g.fillStyle = '#05060c'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#0c1020'; g.fillRect(40, 20, W - 80, 150);
    // fence
    for (var x = 44; x < W - 44; x += 8) { g.fillStyle = '#1a1c24'; g.fillRect(x, 96, 2, 50); }
    g.fillStyle = '#1a1c24'; g.fillRect(40, 100, W - 80, 2);
    // trees
    [[90, 70], [200, 60], [300, 72]].forEach(function (tr) {
      g.fillStyle = '#1a1014'; g.fillRect(tr[0] - 2, tr[1], 5, 70);
      g.fillStyle = 'rgba(200,120,150,0.35)'; g.beginPath(); g.arc(tr[0], tr[1], 26, 0, 7); g.fill();
    });
    // two figures under the blossoms
    var fx = 188;
    g.fillStyle = '#08080a'; g.fillRect(fx, 118, 9, 26); g.fillStyle = '#cfc2a8'; g.fillRect(fx + 2, 113, 5, 6); // TB, hood down
    g.fillStyle = 'rgba(200,196,186,0.55)'; g.fillRect(fx + 14, 112, 14, 33); g.fillStyle = 'rgba(30,30,30,0.8)'; g.fillRect(fx + 17, 106, 8, 7); // big pale robe
    // falling blossoms
    for (var i = 0; i < 28; i++) {
      var bx = 40 + ((i * 53 + t * 18 * (1 + (i % 3) * 0.3)) % (W - 80));
      var by = 20 + ((i * 37 + t * 22) % 150);
      g.fillStyle = 'rgba(255,170,200,0.7)'; g.fillRect(bx, by, 2, 2);
    }
    // window frame
    g.fillStyle = '#2a1e18'; g.fillRect(36, 16, W - 72, 4); g.fillRect(36, 168, W - 72, 4); g.fillRect(36, 16, 4, 156); g.fillRect(W - 40, 16, 4, 156); g.fillRect(W / 2 - 2, 16, 4, 156);
    g.restore();
    R.text(s.text || '', W / 2, 182, { size: 8, align: 'center', font: 'serif', style: 'italic', color: '#d8d0e8' });
  }

  /* ================================================================== *
   *  SCENES
   * ================================================================== */
  var DAYS = [
    { name: 'Tuesday', date: 'Tuesday 9 January 2084' },
    { name: 'Wednesday', date: 'Wednesday 10 January 2084' },
    { name: 'Thursday', date: 'Thursday 11 January 2084' }
  ];

  // ---------- LIBRARY: Isaiah ----------
  async function sceneLibrary(api, n, day) {
    stage(api, 'library', [{ id: 'isaiah', facing: 'right' }]);
    await go(api, 'library');
    if (n === 0) await api.think('The library. Books, as always, are little flickers of light in the dark.');
    api.objective('Sit with Isaiah');
    await api.waitForInteract('isaiah');
    api.objective(null);
    if (n === 0) {
      await api.run([
        'Isaiah hovers by the shelves, shuffling his feet, staring at the floor. It took him two days to come back in here.',
        ['isaiah', 'Oh. Hello. I can... I can go, if you want the room.', 'fear'],
        { think: 'The first night I ran out on him in the middle of a sentence. He hasn\'t forgotten.' }
      ]);
      var c = await api.choice([
        'I\'m sorry I ran off on you the other night. It wasn\'t you.',
        'In my defence, the book was calling me. Loudly.',
        DISCLOSE
      ], { showDisabled: true });
      if (c === 0) {
        meter(api, 'm_isaiah', 5);
        await api.run([['isaiah', 'Oh. That\'s... thank you. Statistically, most people don\'t apologise to me. They just stop talking.', 'happy']]);
      } else if (c === 1) {
        meter(api, 'm_isaiah', 5); api.approvalAdd(2);
        await api.run([['isaiah', 'Books don\'t call. But I understand the metaphor. I\'ve answered a few myself.', 'happy']]);
      } else {
        await disclose(api, 'Isaiah');
        await api.run([['isaiah', 'Please don\'t... please don\'t get us killed. I just got here.', 'fear']]);
      }
      await api.narrate('We spend hours side by side in plushy reading chairs. Me with my magical world, Isaiah with whatever oversized tome looked fascinating. He weaves math and logic out of horror and pain, and somehow still sounds naive.');
    } else if (n === 1) {
      await api.run([
        ['isaiah', 'I\'ve been ranking everyone. For the vote. It\'s easier if it\'s numbers.'],
        ['luna', 'And where do I rank?'],
        ['isaiah', 'You\'re ineligible. You won. That makes you the only person here I don\'t have to calculate.', 'tired'],
        { if: 'f_vr_self_sacrifice', then: [['isaiah', 'Your solution in the simulation was... elegant. Nobody picks themselves. It isn\'t in the probability tables.']] }
      ]);
      meter(api, 'm_isaiah', 5);
    } else {
      await api.narrate('We read in silence. Isaiah turns a page every forty seconds, exactly. It\'s weirdly comforting.');
      meter(api, 'm_isaiah', 5);
    }
    // the read-aloud task (Tuesday) or a quiet read
    var r = await api.choice([
      { text: '(Read aloud from the Newberry Twins.)', if: active('read_aloud') },
      '(Read quietly.)'
    ]);
    if (r === 0) {
      await api.run([
        ['luna', '"The twins crept to the edge of the lion\'s den, and Tilly whispered: brave isn\'t the same as not scared."', 'neutral'],
        ['isaiah', '...Could you keep going? Nobody\'s read to me since I was six.', 'sad'],
        { think: 'I do all the voices. Waverly would roll her eyes at the lion. Isaiah doesn\'t.' }
      ]);
      await completeTask(api, 'read_aloud');
    } else {
      await api.think('For an hour, nobody dies. That\'s what a library is for.');
    }
  }

  // ---------- KITCHEN: cleaning with Kessie ----------
  async function sceneKitchen(api, n) {
    stage(api, 'kitchen', [{ id: 'kessie', facing: 'up' }]);
    await go(api, 'kitchen');
    api.objective('Help Kessie clean');
    await api.waitForInteract('kessie');
    api.objective(null);
    if (n === 0) {
      await api.run([['kessie', 'Grab a sponge, baby. These counters won\'t wipe themselves, and Lord knows Carol won\'t.']]);
      var q = await api.minigame('qte', { mode: 'mash', target: 26, time: 5, title: 'TWO SQUIRTS OF BLEACH', prompt: 'Scrub the marble island (mash SPACE)' });
      if (q.success) meter(api, 'm_kessie', 2);
      await api.run([
        ['kessie', 'You strike me as someone who knows her way around a kitchen.'],
        ['luna', 'My daughter can make a mess just by looking at something. I\'ve had to get good at this. She\'s not great at cleaning up after herself, but we\'ve been working on it.'],
        'Kessie blanches. She runs a hand through her hair, tugging at the strands.',
        ['kessie', 'I didn\'t know you had a child. What\'s her name?', 'shock'],
        ['luna', 'Her name is Waverly. She\'s eleven. Strong-willed, just like her momma. She loves animals. Once we found an injured bird and she made me promise we\'d save it. She did all the work herself...', 'happy'],
        ['kessie', 'She sounds like a great kid. I wish I could have met her.'],
        ['kessie', 'Including putting yourself through this whole show, right?'],
        { think: 'If it had just been me, if there was no one to come back to, would I have taken Trader\'s offer? I don\'t know.' },
        ['kessie', 'That\'s okay. You\'ll find the answer.']
      ]);
      meter(api, 'm_kessie', 5);
      var c = await api.choice([
        'Do you have kids, Kessie?',
        { text: '(Push her about her family, on camera, until it hurts.)', if: active('cry') },
        DISCLOSE
      ], { showDisabled: true });
      if (c === 0) {
        await api.run([['kessie', 'I had a boy. A long time ago.', 'sad'], 'She scrubs the clean counter harder. That\'s all I get.']);
      } else if (c === 1) {
        await api.run([
          ['luna', 'You had a family. What happened to them? Do they know where you are? Are they watching?'],
          ['kessie', 'Stop. Please, baby, stop.', 'cry'],
          'Her eyes fill. She turns away from the camera so it only gets her back. It gets enough.'
        ]);
        meter(api, 'm_kessie', -5);
        await completeTask(api, 'cry');
        await api.think('Congratulations, Luna. You made a kind woman cry for points. Waverly, turn off the TV.');
      } else {
        await disclose(api, 'Kessie');
        await api.run([['kessie', 'Don\'t you ever do that again. Not for me. Not for anybody.', 'angry']]);
      }
    } else if (n === 1) {
      await api.run([
        'Two squirts of bleach, another quick wipe. We work in rhythm for a while.',
        ['kessie', 'Luna. Can I ask you something? It\'s about your past.', 'sad'],
        { think: 'My past. Columbus. My mother on a screen. I can\'t. Not today.' },
        ['luna', 'I\'m really tired, Kessie.', 'tired'],
        ['kessie', 'Alright, baby. Another time.'],
        'She backs off. She\'s learned not to touch me. After the first few times I jumped, she stopped trying.'
      ]);
      meter(api, 'm_kessie', 5);
      if (api.check(active('cry'))) {
        var c2 = await api.choice(['(Let it go.)', { text: '(Ask her why she flinches at the word "child".)', if: active('cry') }]);
        if (c2 === 1) {
          await api.run([['kessie', 'Because I had one. And I lost him. Are you happy now?', 'cry'], 'She cries into a dishcloth. The camera loves it.']);
          meter(api, 'm_kessie', -5);
          await completeTask(api, 'cry');
        }
      }
    } else {
      await api.narrate('Kessie hums a hymn I half remember from Columbus. We clean counters that were already clean.');
      meter(api, 'm_kessie', 5);
    }
  }

  // ---------- LOUNGE: Delphin ----------
  async function sceneLounge(api, n) {
    stage(api, 'lounge', [{ id: 'delphin', facing: 'up' }]);
    await go(api, 'lounge');
    api.objective('Talk to Delphin');
    await api.waitForInteract('delphin');
    api.objective(null);
    if (n === 0) {
      await api.run([
        ['delphin', 'You hiding from the fan club already? Come on. Let\'s pretend this place has charm.', 'smug'],
        ['luna', 'I thought we agreed not to pretend we\'re still friends.'],
        ['delphin', 'Correction: you decided and announced your intentions. I never agreed.'],
        'He hums to himself, pulls a pen from his pocket, and draws a pair of horns on the Great Leader poster.',
        ['luna', 'Are you trying to get yourself killed?'],
        ['delphin', 'I\'m trying to have some fun. Dead-eyed obedience won\'t win votes. The audience loves a little drama.', 'smug']
      ]);
      if (api.get('f_jemessa_triangle', false) && !api.get('ch05_triangleLine')) {
        api.set('ch05_triangleLine', true);
        meter(api, 'm_delphin', -5);
        await api.run([['delphin', 'Oh, and a little pink-haired bird tells me you\'re "thinking about" a love triangle. With me. I\'m flattered. Truly. Do let me know which side I\'m on.', 'smug'], { think: 'Jemessa. Of course she told him.' }]);
      }
      var c = await api.choice(['(Laugh despite yourself.)', 'I don\'t need you to make me look interesting.', DISCLOSE], { showDisabled: true });
      if (c === 0) { meter(api, 'm_delphin', 5); api.approvalAdd(2); await api.run([['delphin', 'There she is. I knew the sniveling little girl I left behind would sharpen into a blade.', 'happy']]); }
      else if (c === 1) { await api.run([['delphin', 'Hide in your room and you\'ll be voted out the first chance they get. I want a real challenge. So come play with me.', 'smug']]); }
      else { await disclose(api, 'Delphin'); await api.run([['delphin', 'Red. Breathe. Whatever it is, don\'t say it in here.', 'shock']]); meter(api, 'm_delphin', 2); }
    } else if (n === 1) {
      await api.run([
        'Delphin spins in a slow circle on the rug, ranting about the lack of government spending on adequate playground equipment.',
        ['delphin', 'A nation that won\'t fund a decent slide deserves the citizens it gets. Am I wrong? I\'m not wrong.'],
        { think: 'The worst part about being around him is how easy it is. His humour fits mine like it always did. That\'s the trap.' }
      ]);
      meter(api, 'm_delphin', 5);
    } else {
      await api.run([['delphin', 'Back again? Careful, red. People will start to talk.', 'smug'], { think: 'People already talk. That\'s the whole show.' }]);
      meter(api, 'm_delphin', 5);
    }
    // The praise task can be done at the poster (Thursday)
    if (api.check(active('praise'))) {
      var p = await api.choice(['(Leave the poster alone.)', '(Face the poster and the camera. Praise the Great Leader.)']);
      if (p === 1) {
        await api.run([
          ['luna', 'Mercy will be granted to those that atone. Thank you, Great Leader, for... for the chance to atone.'],
          ['delphin', 'Oh, that was physically painful to watch. Encore.', 'smug']
        ]);
        await completeTask(api, 'praise');
      }
    }
  }

  // ---------- ARCADE ----------
  async function sceneArcade(api, n) {
    stage(api, 'arcade', [{ id: 'isaiah', facing: 'up' }, { id: 'delphin', facing: 'up' }]);
    api.onInteract('isaiah', [['isaiah', 'The pattern table. It gives you a sequence and you guess the next number. I\'ve never lost. It\'s a little sad, actually.']]);
    api.onInteract('delphin', [['delphin', 'The targets say "I OPPOSE THE GREAT LEADER". You get points for shooting them. I keep missing on purpose.', 'smug']]);
    api.onInteract('ch05_booth', async function (api) {
      var q = await api.minigame('qte', { mode: 'timing', rounds: 3, title: 'LOYALTY RANGE', prompt: 'Shoot the "I OPPOSE THE GREAT LEADER" targets' });
      await api.think(q.success ? 'Bullseye. The machine plays the anthem. I feel sick.' : 'I miss. The machine boos. A recorded voice says "Disappointing."');
    });
    api.onInteract('ch05_dance', async function (api) {
      var q = await api.minigame('qte', { mode: 'sequence', rounds: 3, length: 4, time: 3, title: 'DANCE OF GRATITUDE', prompt: 'Hit the arrows' });
      if (q.success) api.approvalAdd(1);
      await api.think(q.success ? 'The screen flashes GRATEFUL! GRATEFUL! Somewhere a producer marks me down as "fun".' : 'I trip over my own feet. Delphin applauds.');
    });
    await go(api, 'arcade');
    if (n === 0) await api.think('The arcade. Flashing lights, cheerful jingles, and every machine is a loyalty test.');
    api.objective('Play the jackpot machine (or look around)');
    await api.waitForInteract('ch05_jackpot');
    api.objective(null);
    var j = await api.minigame('qte', { mode: 'timing', rounds: 3, speed: 1.2, title: 'JACKPOT', prompt: 'Pull the lever on the stars' });
    if (j.success) {
      api.sound('applause');
      await api.narrate('The machine erupts: CONGRATULATIONS, WINNER. Coins that aren\'t real pour into a tray that doesn\'t open.');
      await completeTask(api, 'arcade_win');
    } else {
      await api.narrate('Three penguins and a skull. The machine laughs at me in Trader\'s voice.');
    }
    meter(api, 'm_isaiah', 2); meter(api, 'm_delphin', 2);
  }

  // ---------- TEA: Annette (and Kessie) ----------
  async function sceneTea(api, n) {
    stage(api, 'kitchen', [{ id: 'annette', spot: 'annette', facing: 'down' }, { id: 'kessie', spot: 'kessieTea', facing: 'left' }]);
    await go(api, 'kitchen');
    api.objective('Tea with Annette');
    await api.waitForInteract('annette');
    api.objective(null);
    if (n === 0) {
      await api.run([
        ['annette', 'There you are, dear. Sit. Chamomile tonight. You look like a wet cat.', 'happy'],
        'A piping hot cup and a plate of cookies. Annette calls me dear and asks about my day, like the grandmother I wished I\'d had.',
        ['kessie', 'Two cookies, Annette, not five. You\'ll be up all night.'],
        ['annette', 'At my age, dear, being up all night is a victory.', 'smug']
      ]);
    } else if (n === 1) {
      await api.run([
        'We talk about simple things. Recipes. Cleaning techniques. Venting about men.',
        ['annette', 'You remind me of me, you know. Before the world sanded all the soft bits off.'],
        ['luna', 'Is that a compliment?'],
        ['annette', 'It\'s a warning, dear. Drink your tea.', 'smug']
      ]);
    } else {
      await api.run([['annette', 'Another night, another cup. Mind the bottom, it\'s bitter.'], { think: 'It is a little bitter. I drink it anyway.' }]);
    }
    meter(api, 'm_annette', 5);
    if (api.check(active('annette_secret'))) {
      var c = await api.choice(['(Just enjoy the tea.)', 'Annette, tell me something you\'ve never told anyone.']);
      if (c === 1) {
        await api.run([
          ['annette', 'Hmm. A secret.', 'smug'],
          'She leans in. Kessie leans in too. The camera, I swear, leans in.',
          ['annette', 'I\'ve always hated chamomile. Tastes like hay. I only make it because you two drink it.', 'happy'],
          ['kessie', 'Annette!'],
          ['annette', 'And I\'ve outlived three men who said I couldn\'t cook. Make of that what you will, dear.', 'smug']
        ]);
        await completeTask(api, 'annette_secret');
      }
    }
  }

  // ---------- YOUR ROOM ----------
  async function sceneRoom(api) {
    stage(api, 'luna', []);
    await go(api, 'luna');
    api.objective('Rest (look at the photo of Waverly)');
    await api.waitForInteract('ch05_photo');
    api.objective(null);
    await api.run([
      { think: 'Waverly. If I could hear her voice once. Just once. I wouldn\'t dare be greedier than that.' },
      'I lie on the too-soft mattress and watch the ceiling until the watch decides I\'ve rested enough.'
    ]);
  }

  var PLACES = [
    { key: 'library', text: 'Library (Isaiah)', run: sceneLibrary },
    { key: 'kitchen', text: 'Kitchen (clean with Kessie)', run: sceneKitchen },
    { key: 'lounge', text: 'Lounge (Delphin)', run: sceneLounge },
    { key: 'arcade', text: 'Arcade', run: sceneArcade },
    { key: 'tea', text: 'Tea with Annette', run: sceneTea, evening: true },
    { key: 'room', text: 'Your room (rest)', run: sceneRoom, last: true }
  ];

  async function freeSlot(api, dayIdx, part) {
    var evening = part === 'Evening';
    var list = PLACES.filter(function (p) { return !p.evening || evening; });
    list = list.map(function (p, i) { return { p: p, i: i, v: api.get('ch05_v_' + p.key, 0) }; });
    list.sort(function (a, b) {
      if (a.p.last !== b.p.last) return a.p.last ? 1 : -1;
      if (evening && (a.p.evening || b.p.evening) && a.v === 0 && b.v === 0) return a.p.evening ? -1 : 1;
      return a.v - b.v || a.i - b.i;
    });
    await api.say('watch', DAYS[dayIdx].name + ', ' + part.toLowerCase() + '. FREE PERIOD. Your tasks: ' + taskList(api), { name: 'WATCH', portrait: false });
    var idx = await api.choice(list.map(function (l) { return l.p.text + (l.v ? '' : '  •'); }));
    var place = list[idx].p, n = list[idx].v;
    api.set('ch05_v_' + place.key, n + 1);
    await place.run(api, n, dayIdx);
    await api.fadeOut(400);
    await api.fadeIn(400);
  }

  function taskList(api) {
    var out = [];
    Object.keys(TASKS).forEach(function (t) {
      var s = api.get(tflag(t));
      if (s === 'active') out.push('[ ] ' + TASKS[t]);
    });
    return out.length ? out.join('  ') : 'all done.';
  }

  async function morningTasks(api, dayIdx) {
    var ts = DAY_TASKS[dayIdx];
    ts.forEach(function (t) { api.set(tflag(t), 'active'); });
    await watch(api, 'SECRET TASKS: ' + DAYS[dayIdx].name.toUpperCase(),
      '1. ' + TASKS[ts[0]] + '\n2. ' + TASKS[ts[1]] + '\n\nCompletion will be rewarded.\nFailure will be corrected.\nDisclosure of tasks is punishable by execution.');
  }
  async function endDay(api, dayIdx) {
    var failed = DAY_TASKS[dayIdx].filter(function (t) { return api.get(tflag(t)) === 'active'; });
    failed.forEach(function (t) { api.set(tflag(t), 'failed'); });
    if (failed.length) {
      await api.say('watch', 'TASK FAILED: ' + failed.map(function (t) { return TASKS[t]; }).join(' / ') + '  Correction applied.', { name: 'WATCH', portrait: false });
      await shock(api, false);
      await api.think('A little jolt up the arm, like a slap from a polite stranger.');
    }
  }
  async function ranking(api, dayIdx) {
    var aud = api.approval();
    var lunaPos = aud >= 55 ? 2 : 3;
    var names = ['Carol', 'Delphin', 'Luna', 'Kessie', 'Isaiah', 'Annette', 'John'];
    if (lunaPos === 2) names = ['Carol', 'Luna', 'Delphin', 'Kessie', 'Isaiah', 'Annette', 'John'];
    await watch(api, 'AUDIENCE RANKINGS UPDATED', names.map(function (nm, i) { return (i + 1) + '. ' + nm; }).join('\n'));
    if (dayIdx === 2) await api.think('Of course Carol is first. People love a villain, and she knows it.');
  }

  /* ---------- SCRIPTED: Tuesday dinner (Carol and John) ---------- */
  async function dinner(api) {
    stage(api, 'dining', [
      { id: 'carol', facing: 'down' }, { id: 'john', facing: 'down' }, { id: 'delphin', facing: 'down' },
      { id: 'annette', facing: 'up' }, { id: 'isaiah', facing: 'up' }, { id: 'kessie', facing: 'left' }
    ]);
    await api.titleCard('Tuesday night', 'Dinner');
    await go(api, 'dining', 'luna');
    api.lockPlayer();
    await api.run([
      ['kessie', 'Stew. Self-serve. We should also talk about a chore rotation, since we\'ll be here a while.'],
      ['carol', 'Chores? No thanks. I didn\'t come here to scrub dishes.', 'smug'],
      ['delphin', 'Funny, I assumed you joined for the same reason the rest of us did. Mortality begging to be left intact. I\'ll cook tomorrow. Delphin\'s famous spaghetti. A privilege for you all.'],
      ['kessie', 'Thank you, Delphin. That\'s very mature of you.', 'happy'],
      ['isaiah', 'I-  I\'ll clean after. Hygiene\'s important.', 'fear'],
      ['carol', 'Hygiene\'s important. Aren\'t you some kind of genius? How do we know you won\'t add bacteria to the dishes instead?', 'smug'],
      ['carol', 'You think so too, don\'t you, Johnny?'],
      ['john', 'What\'s... bacteria?'],
      'Carol slides closer to John and trails a finger up his arm.',
      ['carol', 'You\'re tense. You should let someone take care of that. It\'s what the viewers want, right?'],
      ['john', 'Um... I like to relax?'],
      'Her fingers crawl to his hair. John leans forward, breathing fast.',
      ['john', 'I feel... funny.', 'fear'],
      { think: 'John is a child in a grown man\'s body. If anyone ever touched Waverly like that against her will...' },
      { if: 'f_helped_waiter', then: [['carol', 'Something to say, waiter-girl? Go on. Kneel down and help him up, like you did at the ball.', 'smug']] },
      ['annette', 'Young lady. There\'s a difference between wielding your sexuality and dry-humping a trauma case.', 'smug'],
      ['carol', 'Aren\'t we past the stage where society shames women for using their power? You\'re no model, Luna, but you\'ve got a body. Nothing\'s stopping you from trying the same.', 'angry']
    ]);
    var c = await api.choice([
      'Even if I did, I wouldn\'t choose someone who can\'t understand what\'s being proposed. That\'s not power. It\'s just preying on someone who can\'t fight back.',
      '(Stay out of it. Eat your stew.)'
    ]);
    if (c === 0) {
      meter(api, 'm_annette', 5);
      api.approvalAdd(3);
      await api.run([
        ['carol', 'Excuse ME? Who asked you, you freckled little nobody?!', 'angry'],
        'Carol smiles too wide, but her eyes are ice. John turns even redder.',
        ['annette', 'Mm. That\'s what I thought.', 'smug']
      ]);
      await completeTask(api, 'carol_voice');
    } else {
      await api.run([
        'I keep my eyes on the bowl. The stew is perfect. It tastes like nothing.',
        ['annette', 'Mm. That\'s what I thought.', 'tired']
      ]);
    }
    api.unlockPlayer();
  }

  /* ---------- SCRIPTED: Wednesday morning, lounge fight + Felton + showdown ---------- */
  async function wednesdayMorning(api) {
    stage(api, 'library', []);
    await go(api, 'library', 'luna');
    await api.think('I\'ve just settled down with a book when the watch buzzes.');
    await api.say('watch', 'PROCEED TO LOUNGE IMMEDIATELY.', { name: 'WATCH', portrait: false });
    var pulses = 0;
    while (true) {
      var c = await api.choice(['(Go to the lounge.)', '(Ignore it. "Try me.")'], { autoPick: 0 });
      if (c === 0) break;
      pulses++;
      await shock(api, pulses > 1);
      if (pulses === 1) await api.think('The next jolt runs up my arm like fire caught in a wire.');
      else { await api.say('luna', 'Okay, okay! I\'m going.', { mood: 'angry' }); break; }
    }
    stage(api, 'lounge', [
      { id: 'carol', spot: 'carol', facing: 'right' }, { id: 'kessie', spot: 'kessie', facing: 'left' },
      { id: 'delphin', spot: 'delphin', facing: 'right' }, { id: 'john', spot: 'john', facing: 'down' }
    ]);
    await go(api, 'lounge');
    await api.run([
      { ambient: 'tension' },
      ['carol', 'You think you\'re so much better than everyone else!', 'angry'],
      'Carol\'s finger jabs at Kessie\'s chest, then swings toward Delphin. Kessie\'s jaw is clenched so tight I can see the muscle twitch. In the corner, John cowers with his fingers in his ears.',
      { think: 'The watch purrs on my wrist. Get involved, or next time the shocks won\'t stop.' }
    ]);
    api.objective('Check on John');
    await api.waitForInteract('john');
    api.objective(null);
    await api.run([
      ['luna', 'Hey. John. What\'s happening?'],
      'His eyes dart to me, wide and glassy. His lips move, but nothing comes out.',
      ['luna', 'It\'s okay. Try breathing. Then tell me.'],
      'He rocks back and forth like a child locked in a closet. Waverly used to do this at four, in the neighbourhood where gunshots were a nightly symphony. She was sure that if she closed her eyes, I\'d be dead when she woke.',
      'I put my hand on his shoulder. He flinches like I slapped him.',
      ['carol', 'You think this is over? Oh, just you wait.', 'angry'],
      ['carol', 'John. Come. Now.'],
      'He scrambles up and follows her out like a kicked dog chasing its owner.'
    ]);
    api.remove('carol'); api.remove('john');
    await api.run([
      ['kessie', 'You sure looked comfortable just standing there. You could have at least said something.', 'angry'],
      ['luna', 'I tried to talk to John.'],
      ['delphin', 'What exactly would you have had her do?'],
      ['luna', 'I don\'t need your help.'],
      ['kessie', 'I shouldn\'t have snapped. You didn\'t do anything wrong. Either of you. Carol is the one causing drama.', 'tired'],
      ['delphin', 'She certainly does enjoy stirring up a fuss. And this is coming from someone who lives for the show. We haven\'t finished our first week and she\'s made enemies of over half the house.'],
      ['delphin', 'Do you remember that asshole from Columbus who used to mess with the younger kids by peeing on their sheets?'],
      ['luna', 'Felton.'],
      ['delphin', 'Bingo. You remember what happened to him?', 'smug'],
      { think: 'Felton picked on Salina. Delphin\'s little sister. My best friend. One word from Delphin and nobody in the home would trade with Felton, swap chores, even say hello. Feared tyrant to bottom feeder in a day.' },
      ['delphin', 'Stacked pressure. A quiet coup. No violence needed. I think we should do the same thing here.'],
      ['delphin', 'If you, me, and Kessie all use our private votes on Carol, that\'s almost half the group. Add in Isaiah and we\'re set.']
    ]);
    var c = await api.choice([
      'Why in the world would I ever go along with one of your plans?',
      'I\'m in.'
    ]);
    if (c === 0) {
      api.set('f_refused_vote_bloc', true);
      meter(api, 'm_delphin', -5);
      await api.run([
        'Delphin\'s smirk falters. Something raw flickers behind his eyes before he recovers.',
        ['delphin', 'Brutal. But ultimately fair.'],
        ['kessie', 'You two knew each other before this, right?'],
        ['delphin', 'Luna and I have the kind of bond that forms when you lock eyes across a ballroom and see a beautiful man steal a hot dog off a rich bastard\'s plate.', 'smug'],
        ['luna', 'We grew up in the same group home. But we\'re not friends.'],
        ['delphin', 'Yes, you\'ve made that abundantly clear.', 'tired'],
        ['kessie', 'I\'m not fully opposed to stacking votes against Carol. But I\'d like to hear why you\'re so against it.'],
        ['luna', 'Only one of us walks free in the end. Partnering up could get someone hurt. Or worse.'],
        'That time, Delphin looks down.',
        ['kessie', 'I agree. This is not the place to be making friends. Not many would admit that out loud.']
      ]);
    } else {
      api.set('f_refused_vote_bloc', false);
      meter(api, 'm_delphin', -10);
      await api.run([
        'Delphin\'s eyes narrow. Just a fraction. As if it was too easy.',
        ['delphin', 'Well. That was quick. No haggling, no lecture? You\'ve changed, red. Or you\'re playing me.', 'smug'],
        ['luna', 'We grew up in the same group home. But we\'re not friends. This is arithmetic.'],
        ['delphin', 'Yes, you\'ve made that abundantly clear.', 'tired'],
        ['kessie', 'I\'m not fully opposed to stacking votes against Carol. But I\'m not joining a club.']
      ]);
    }
    await api.run([
      ['kessie', 'I don\'t think this changes anything. I was already planning to vote for Carol, and not being part of a group won\'t change my mind unless something drastic happens.'],
      ['kessie', 'I\'m gonna wipe down the kitchen. That John sure knows how to make a mess but not how to clean one.']
    ]);
    api.remove('kessie');
    // --- the showdown ---
    await api.run([
      'Then it\'s just the two of us. The air is heavy with everything we\'ve left unsaid.',
      ['delphin', 'You wanna talk about it?']
    ]);
    var s = await api.choice(['Not really. But we should, before it explodes.', 'No.']);
    if (s === 1) await api.say('delphin', 'Liar. You\'ve been wanting to since the ballroom.', { mood: 'smug' });
    await api.run([
      ['delphin', 'Fine. Go ahead and ask whatever you like. Just don\'t forget the world is watching.'],
      { pan: [spot('lounge', 'chair')[0] + 6, 0], ms: 700 },
      'I glance at the blinking red light in the corner of the ceiling. Delphin follows my gaze. His jaw tightens. The memory of that night flashes between us like lightning. Some stories aren\'t meant for strangers\' entertainment.',
      { pan: 'player', ms: 500 },
      ['luna', 'You can\'t keep acting like this. It\'s been eighteen years. Even if things hadn\'t turned out the way they did, we couldn\'t just pick up where we left off.'],
      ['delphin', 'Maybe I just enjoy your company.', 'smug'],
      ['luna', 'Or maybe you just enjoy acting unpredictable. I know you\'re calculating something. If you won\'t share, fine. But stop trying to act like I owe you friendship.', 'angry'],
      ['delphin', 'You used to be afraid to question me.']
    ]);
    var last = await api.choice([
      'And you used to be someone worth fearing. Now you\'re just a jester pretending you\'re still a giant.',
      'I was twelve. You were the biggest thing in my world. Then you weren\'t.'
    ]);
    if (last === 1) meter(api, 'm_delphin', 3);
    await api.run([
      { think: 'The tree line. That night, in the rain. I saw him there.' },
      ['luna', 'I\'m leaving. Stop trying to act like we\'re still friends. If you can do that, I\'ll keep your secret for now.', 'angry'],
      'Delphin doesn\'t answer. The weight of his stare presses between my shoulder blades with every step I take.',
      { ambient: 'hum' }
    ]);
  }

  /* ---------- SCRIPTED: Wednesday afternoon, codes overheard ---------- */
  async function codesOverheard(api) {
    stage(api, 'arcade', [{ id: 'isaiah', facing: 'up' }, { id: 'delphin', spot: 'overhear', facing: 'left' }]);
    await go(api, 'arcade', 'luna', 'left');
    await api.run([
      'On my way past the arcade I hear Delphin\'s voice, low for once. He\'s at the pattern table with Isaiah.',
      ['delphin', 'You know any codes?'],
      ['isaiah', 'Codes? Like for computers?'],
      ['delphin', 'No, like for secret messages and such.'],
      'Isaiah glances at the camera before answering. You never know how much they\'re paying attention.',
      ['isaiah', 'In the late 1900s people often spoke in code so spies couldn\'t understand them. Nowadays such techniques are almost entirely useless due to technological advances in decryption.'],
      ['delphin', 'Interesting. You\'re an interesting guy, Isaiah. We should hang out sometime. Shoot the shit.', 'smug'],
      { think: 'Codes. The fridge door at home. A is eight. Seven seconds, Grandma\'s rule, Waverly\'s game. Almost entirely useless, Isaiah says.' },
      { think: 'Unless nobody is looking for it.' }
    ]);
  }

  /* ---------- SCRIPTED: Thursday, the mirror fight ---------- */
  async function mirrorFight(api) {
    stage(api, 'lounge', [
      { id: 'carol', spot: 'mirror', facing: 'up' }, { id: 'kessie', spot: 'kessie', facing: 'right' },
      { id: 'delphin', spot: 'delphin', facing: 'right' }
    ]);
    await go(api, 'lounge');
    await api.run([
      { ambient: 'tension' },
      'Kessie is putting away her supplies, having just finished yet another room. Carol drags a finger down the new mirror and holds up a speck of dust.',
      ['carol', 'This mirror is filthy. Do it better.', 'smug'],
      'Kessie throws down the broom.',
      ['kessie', 'If you\'d like to have it done differently, then I suggest you do it yourself.', 'angry'],
      ['carol', 'Now why would I do that when the help is standing right here?', 'smug'],
      ['delphin', 'Wow. Brainless and a bigot. It\'s like watching a mannequin learn to talk, but worse.', 'angry'],
      { if: 'f_helped_waiter', then: [['carol', 'And you can wipe that look off your face, waiter-girl. I saw you on your knees for the help at the ball. Born to serve, the lot of you.', 'angry']] }
    ]);
    var c = await api.choice([
      'Kessie isn\'t your maid, Carol. Nobody here is.',
      '(Say nothing. Stand by Kessie.)'
    ]);
    if (c === 0) { meter(api, 'm_kessie', 5); api.approvalAdd(2); }
    else meter(api, 'm_kessie', 3);
    await api.run([
      ['carol', 'Oh, just you wait, you fucking bitches. I\'m only getting started.', 'angry'],
      'She storms out. The mirror shows four of us, all a little smaller than we were this morning.',
      ['kessie', 'Thank you, baby.', 'tired'],
      { ambient: 'hum' }
    ]);
  }

  /* ---------- SCRIPTED: Thursday night, the window ---------- */
  async function windowNight(api) {
    stage(api, 'luna', []);
    await api.goRoom(ROOMS.luna, { at: spot('luna', 'entry'), facing: 'up' });
    await api.run([{ ambient: 'drone' }]);
    await ranking(api, 2);
    await api.think('Tomorrow is the private vote. And after that, the first execution. I pace faster. It doesn\'t help.');
    api.objective('Look out of the window');
    await api.waitForInteract('ch05_window');
    api.objective(null);
    await api.slides([
      { style: 'black', text: 'The trees sway. Pink blossoms float down, leaving the branches bare.', draw: drawWindow },
      { style: 'black', text: 'Two shadows at the fence. One pulls down a hood: a True Believer, outside, at night.', draw: drawWindow },
      { style: 'black', text: 'The other is big, in a pale robe. Staff? A contestant? I can\'t tell.', draw: drawWindow }
    ]);
    await api.think('How did they get out? Why a True Believer? What could they be talking about? Schemes and plots. Plots and schemes.');
    api.sound('door');
    await api.think('My door doesn\'t budge. Locked in my gilded cage, like every night.');
    await api.run([
      'The questions spin faster and faster until the room blurs at the edges. My lungs seize. The floor pitches like a ship in a storm.',
      { sound: 'heartbeat' }, { shake: 600, mag: 2 }
    ]);
    var b = await api.minigame('qte', { mode: 'timing', rounds: 3, need: 2, speed: 0.8, zone: 0.22, title: 'BREATHE', prompt: 'In. Out. Stop the marker on each breath.' });
    var c = await api.choice([
      '(Find Waverly\'s photo. Look at her.)',
      '(Curl up and count your breaths alone.)'
    ]);
    if (c === 0) {
      meter(api, 'm_waverly', 5);
      await api.run([
        { think: 'Her hollow eyes look straight through me. A silent accusation. I can almost hear her screaming at me not to give up. To fight for her.' },
        ['luna', 'Oh, Waverly. I\'m so sorry, baby.', 'cry'],
        { think: 'No. It\'s still too early to give up. Not while she\'s waiting for me.' }
      ]);
    } else {
      await api.run([{ think: b.success ? 'In. Out. In. Out. Proof of life. The only gift I can give myself.' : 'In. Out. It barely works. It works enough.' }]);
    }
    await api.narrate('I curl into an egg and rock until the moon crosses the window and the dreaded day begins.');
  }

  /* ---------- FRIDAY: lockdown, the courtroom vote ---------- */
  var VOTE_OPTS = [
    { id: 'carol', text: 'Carol', why: 'My vote is for Carol. I wish I didn\'t have to choose anyone, but that\'s not the world I\'m living in. This show is supposed to be about redemption, and Carol has made it clear she\'s only interested in stirring up more trouble.' },
    { id: 'kessie', text: 'Kessie', why: 'Kessie. She... she hides something. In here, secrets get people killed.' },
    { id: 'annette', text: 'Annette', why: 'Annette. She smiles while she swings that cane. I don\'t trust anyone who enjoys this.' },
    { id: 'isaiah', text: 'Isaiah', why: 'Isaiah. He\'s young. He keeps to himself. I don\'t know him. That\'s... that\'s my reason.' }
  ];

  async function friday(api) {
    await api.titleCard('Friday', '12 January 2084  ·  Private Vote', 2600, { kicker: 'WEEK 1' });
    stage(api, 'library', []);
    await go(api, 'library', 'luna');
    await api.run([
      { think: 'Vote morning. Confined to rooms; the watch staggers our departures so we never meet in the halls. Mine says LIBRARY. I don\'t argue.' },
      { think: 'I still hope with all my heart that Waverly isn\'t watching. I know better.' }
    ]);
    api.objective('Read until you\'re called');
    await api.waitForInteract('ch05_newberry');
    api.objective(null);
    await api.run([
      'The Newberry Twins, Book 9: The Newberry Twins Meet a Lion. I make it four pages before the door opens.',
      { sound: 'door' }
    ]);
    stage(api, 'library', [{ id: 'ginerva', spot: 'ginerva', facing: 'up' }]);
    await api.move('ginerva', spot('library', 'ginervaStop'));
    api.face('player', 'ginerva');
    await api.run([
      ['ginerva', 'Criminal Bartley. Books may not be removed from the library. Put it down.', 'angry'],
      ['ginerva', 'You are wanted in the gymnasium. Walk in front of me. Do not dawdle.']
    ]);
  }

  async function courtroomVote(api) {
    // lineup at the gym doors
    var seats = ['annette', 'carol', 'kessie', 'isaiah', 'delphin'];
    stage(api, 'court', [
      { id: 'trader', spot: 'trader', facing: 'down' },
      { id: 'ginerva', spot: 'ginerva', facing: 'right' },
      { id: 'tb_hippo', spot: 'tb1', facing: 'left', turn: false },
      { id: 'tb_boar', spot: 'tb2', facing: 'left', turn: false },
      { id: 'cameraman', spot: 'camera', facing: 'up' },
      { id: 'john', spot: 'seat_john', facing: 'up' }
    ].concat(seats.map(function (s) { return { id: s, spot: 'seat_' + s, facing: 'up' }; })));
    await api.fadeOut(300);
    await go(api, 'court', 'seat_luna', 'up');
    api.lockPlayer();
    await api.run([
      'The gym has been dressed as a courtroom. A two-storey judge\'s bench. A jury box of painted mannequins with clown smiles. Two chairs centre stage, one with handcuffs on the arm. And my own face, twenty feet tall on the screen, pupils dilated with fear.',
      { think: 'Before we walked in, Trader clipped a mic inside my collar. His hand rested on my collarbone a second too long. Like I was a prop that needed positioning.' },
      ['delphin', 'Hate is easier than fear.'],
      { think: 'For once, he\'s right. How lucky that these people make themselves so easy to hate.' },
      { sound: 'applause' }
    ]);
    api.onAir(true);
    api.approval(true);
    api.lowerThird('RIGHT TO LIFE', 'Private Vote · Week 1 · LIVE');
    await api.run([
      ['trader', 'Welcome, ladies and gentlemen! How is everyone feeling tonight?', 'happy'],
      { sound: 'applause' },
      ['trader', 'Y\'all are the first group to test out this voting system. Excited? Each contestant will name one amongst them to face off against John in the public vote.', 'happy'],
      { sound: 'sting' },
      'Three sharp knocks of the gavel. In the jury box, a mannequin\'s head tilts, slowly, an inch further than a head should go.',
      ['trader', 'Our competition winner votes last. Mrs. Dunphy! Ladies first. Come on down to the mic.']
    ]);
    api.lowerThird(null);
    var mic = spot('court', 'mic');

    async function walkUp(id) { await api.move(id, mic); api.face(id, 'down'); }
    async function walkBack(id) { await api.move(id, spot('court', 'seat_' + id)); api.face(id, 'up'); }

    // Annette
    await walkUp('annette');
    await api.run([
      ['trader', 'Mrs. Dunphy. Who is not serious enough about their redemption?'],
      ['annette', 'Oh, I wrote it down, dearie. Don\'t make an old woman read in this light.', 'smug'],
      'She waves the folded slip, drops it in the toaster-shaped box, and pats Trader\'s cheek on the way past. The crowd howls.'
    ]);
    await walkBack('annette');
    // Carol
    await walkUp('carol');
    await api.run([
      ['carol', 'Delphin. Obviously. He drew horns on the Great Leader. Did everybody see that? Disrespectful. He thinks everything is a joke.', 'smug'],
      ['delphin', 'Everything IS a joke. You\'re the punchline.', 'smug']
    ]);
    await walkBack('carol');
    // John
    await walkUp('john');
    await api.run([
      ['john', 'I vote for... for Delphin. Because he is a bad... a bad influence on the house. And on... um...', 'fear'],
      'His eyes flick to Carol. She mouths the rest. He says it a beat behind her, like a dubbed movie.',
      ['john', '...on the moral... fibre. Of the house.']
    ]);
    await walkBack('john');
    // Kessie
    await walkUp('kessie');
    await api.run([['kessie', 'Carol. She\'s made enemies of half this house in a week, and she treats people like servants. Redemption starts with how you treat people.']]);
    await walkBack('kessie');
    // Isaiah
    await walkUp('isaiah');
    await api.run([
      ['isaiah', 'I assigned each eligible contestant a weighted score: remorse, cooperation, risk to others. Carol scores lowest on all three. So... Carol. Sorry. It\'s just the numbers.', 'fear']
    ]);
    await walkBack('isaiah');
    // Delphin
    await walkUp('delphin');
    await api.run([
      'Delphin strolls up in his orange LET ME OUT shirt and does a little bow to the mannequins.',
      ['delphin', 'Carol. For crimes against fashion, joy, and the gentleman to her left. Also, she called me a scamp in my own head. I could feel it.', 'smug'],
      { sound: 'applause' }
    ]);
    await walkBack('delphin');
    // Luna
    await api.say('trader', 'And finally, Miss Luna, our competition winner. Come on down.', { mood: 'smug' });
    api.unlockPlayer();
    api.objective('Walk to the microphone');
    await api.waitForInteract('ch05_mic');
    api.objective(null);
    api.lockPlayer();
    await api.movePlayer(mic);
    api.face('player', 'down');
    await api.move('trader', [mic[0] + 1, mic[1]]);
    api.lowerThird('LUNA BARTLEY', 'Contestant · Competition winner');
    await api.run([
      'Trader puts his arm around my shoulders. I try to shrug him off. He only squeezes tighter.',
      ['trader', 'How are you feeling?']
    ]);
    var f = await api.choice([
      'It\'s been a tough transition, living with other adults. I thought my eleven-year-old was a tough roommate, but compared to Carol, she\'s a piece of cake.',
      '(Grimace.) Tired.'
    ]);
    if (f === 0) { api.approvalAdd(3); await api.run([{ sound: 'applause' }, 'Laughter. The rush of it is horrible. It feels so good. What\'s wrong with me?']); }
    else await api.run([['trader', 'That good, huh? I suppose that\'s understandable.', 'smug'], 'The audience laughs anyway.']);
    await api.run([
      ['trader', 'You mentioned your daughter. You talk about her quite often. Do you think she\'s watching right now?'],
      ['luna', 'I hope not. But if I know Waverly, she definitely is.'],
      ['trader', 'Is there anything you\'d like to say to her?']
    ]);
    var w = await api.choice([
      '(Look square into the camera.) "Waverly, I hope you know that I don\'t want to hurt anyone..."',
      '(Look away from the lens.) No. Not here.'
    ]);
    if (w === 0) {
      api.approvalAdd(5);
      await api.run([
        ['luna', 'Waverly, I hope you know that I don\'t want to hurt anyone. I never have. And I never will. Some of the things you see might be upsetting. If that\'s the case, then I hope you turn off the tv. Be strong. Remember what we\'ve talked about. I love you.', 'sad'],
        'You could hear a pin drop. Several women in the bleachers look close to tears.'
      ]);
    } else {
      api.approvalAdd(-5);
      await api.run([['trader', 'Camera-shy! The mystery deepens, folks.', 'smug'], { think: 'Nothing I say to her here belongs to her. It belongs to them.' }]);
    }
    await api.run([['trader', 'One more question, the reason we\'re here. Who are you voting for, and why?']]);
    var opts = VOTE_OPTS.map(function (o) { return o.text; });
    opts.splice(1, 0, { text: 'Delphin', if: function () { return false; } });
    var vi = await api.choice(opts, { showDisabled: true, autoPick: 0 });
    var pick = vi === 0 ? VOTE_OPTS[0] : VOTE_OPTS[vi - 1];
    api.set('ch05_lunaVote', pick.id);
    await api.think('Not Delphin. Whatever he did eighteen years ago, I won\'t hand him a death sentence over a grudge.');
    await api.say('luna', pick.why);
    if (pick.id === 'carol') {
      await api.run([['trader', 'I understand. Thank you so much for being honest with us. Let\'s give her a hand, everyone!', 'happy'], { sound: 'applause' }, 'The crowd roars. Carol\'s glare burns into the back of my neck.']);
    } else {
      meter(api, 'm_' + pick.id, -10);
      await api.run([
        ['trader', 'Ooh! A twist! Let\'s give her a hand, everyone!', 'happy'], { sound: 'applause' },
        { if: 'ch05_lunaVote == kessie', then: [['kessie', '...', 'sad'], 'Kessie looks at me like I\'ve slapped her.'] },
        { if: 'ch05_lunaVote == annette', then: [['annette', 'Ha! Good girl. Grit.', 'smug'], 'Annette laughs. It doesn\'t reach her eyes.'] },
        { if: 'ch05_lunaVote == isaiah', then: ['Isaiah stares at his shoes. His lips move: recalculating.'] }
      ]);
    }
    api.lowerThird(null);
    api.onAir(false);
    api.unlockPlayer();
  }

  /* ---------- the Doll Room: count, cage, break, eavesdrop ---------- */
  function slipsFor(lunaPick) {
    var nm = { carol: 'Carol', kessie: 'Kessie', annette: 'Annette', isaiah: 'Isaiah' };
    return [
      { text: 'Carol', col: 'carol' }, { text: 'Carol', col: 'carol' },
      { text: 'Delphin', col: 'delphin' }, { text: 'Delphin', col: 'delphin' },
      { text: 'Carol', col: 'carol' },
      { text: 'Luna', col: 'spoiled' },
      { text: nm[lunaPick] || 'Carol', col: lunaPick || 'carol' }
    ];
  }
  /** Tally the slips; used both for the board and for the sanity check. */
  function tally(slips) { var t = {}; slips.forEach(function (s) { t[s.col] = (t[s.col] || 0) + 1; }); return t; }

  async function dollRoom(api) {
    var pick = api.get('ch05_lunaVote', 'carol');
    var slips = slipsFor(pick);
    var t = tally(slips);
    // sanity: Carol must strictly lead every other eligible name
    Object.keys(t).forEach(function (k) { if (k !== 'carol' && k !== 'spoiled' && t[k] >= t.carol) G.reportError(new Error('ch05: impossible private-vote tally ' + JSON.stringify(t)), 'ch05'); });
    var cols = [{ id: 'carol', name: 'CAROL' }, { id: 'delphin', name: 'DELPHIN' }];
    if (pick !== 'carol') cols.push({ id: pick, name: pick.toUpperCase() });
    cols.push({ id: 'spoiled', name: 'SPOILED' });
    var result = 'CAROL ' + t.carol + '  ·  DELPHIN ' + t.delphin + (pick !== 'carol' ? '  ·  ' + pick.toUpperCase() + ' 1' : '') + '  ·  1 SPOILED';

    api.set('ch05_cageInDolls', false);
    stage(api, 'dolls', [
      { id: 'trader', spot: 'trader', facing: 'down' },
      { id: 'tb_elephant', spot: 'tbL', facing: 'down', turn: false },
      { id: 'tb_frog', spot: 'tbR', facing: 'down', turn: false },
      { id: 'cameraman', spot: 'camera', facing: 'left' },
      { id: 'annette', spot: 'seat_annette', facing: 'down' }, { id: 'carol', spot: 'seat_carol', facing: 'down' },
      { id: 'kessie', spot: 'seat_kessie', facing: 'down' }, { id: 'isaiah', spot: 'seat_isaiah', facing: 'up' },
      { id: 'delphin', spot: 'seat_delphin', facing: 'up' }
    ]);
    await api.fadeOut(400);
    await go(api, 'dolls', 'seat_luna', 'up');
    api.lockPlayer();
    api.onAir(true);
    api.approval(true);
    await api.run([
      'The top floor. Contestants only come up here escorted. Floor-to-ceiling shelves of dolls, red streaks trailing from hollow eyes. Rictus grins. It\'s sauna-hot, and outside the window it\'s raining.',
      'On the top shelf of the north wall sits a giant doll: blood-red palm-leaf hair, icy blue eyes, puffy purple lips, a face like a beach ball. She holds a gavel. Two True Believers kneel on either side of her.',
      ['delphin', 'This one is called Samantha now. She looks scary, but she\'s really just misunderstood.', 'smug'],
      ['trader', 'It\'s time to count the votes! No time to waste, so I\'ll just get started.', 'happy']
    ]);
    await api.minigame('count', { slips: slips, from: 0, to: 2, cols: cols });
    await api.run([
      ['trader', 'Carol. That\'s two for Carol.'],
      'A cameraman shoves his lens into Carol\'s face.',
      ['carol', 'Hey! Don\'t I get to say anything about this? You know, like, defend myself?', 'angry'],
      ['trader', 'Soon. Sit quietly until all the votes have been counted. There\'s still a chance you won\'t be chosen.']
    ]);
    await api.minigame('count', { slips: slips, from: 2, to: 4, cols: cols });
    await api.run([
      ['delphin', 'Me? Who the hell voted for me? I\'m the loveable scamp.', 'shock'],
      ['carol', 'Scamp my ass. You cause just as much trouble as me, but people like you for it since you\'re a man.', 'angry'],
      ['delphin', 'I dare you to say that again!', 'angry'],
      ['trader', 'Quiet. Next to speak out of turn gets a shock.']
    ]);
    await api.minigame('count', { slips: slips, from: 4, to: 6, cols: cols });
    await api.run([
      'Trader draws the next slip and pauses. A distant, unfocused smile spreads across his face as he looks up for the first time since he opened the box.',
      ['trader', 'The next vote is for... Luna.', 'smug'],
      'The camera zooms in on me. That feeling, the up, the down, the pain. I never thought I\'d feel that exact cocktail again.',
      ['trader', 'Spoiled, of course. The winner can\'t be named. But noted.', 'smug'],
      { think: 'Who? Who would waste a vote just to say my name out loud?' }
    ]);
    await api.minigame('count', { slips: slips, from: 6, to: 7, cols: cols, result: result });
    if (pick === 'carol') await api.say('trader', 'Carol. That\'s four for Carol. I believe we have a winner!', { mood: 'happy' });
    else {
      await api.say('trader', G.util.cap(pick) + '. One for ' + G.util.cap(pick) + '. Still: I believe we have a winner! Carol, three!', { mood: 'happy' });
      if (pick === 'kessie') await api.run([['kessie', 'I heard you at the mic, baby. I\'m not deaf. I just thought...', 'sad'], { think: 'She thought I was the kind one. So did I.' }]);
      if (pick === 'annette') await api.run([['annette', 'One for me! Look at that. I\'m a contender.', 'happy'], 'She says it lightly. She knits faster.']);
      if (pick === 'isaiah') await api.run([['isaiah', 'One. That\'s... an outlier. I\'ll factor it in.', 'sad']]);
    }
    await api.run([
      'I let out a breath I didn\'t know I was holding. I feel like a horrible person for thinking it, but thank God it wasn\'t me.',
      ['carol', 'Which of you assholes voted for me?', 'angry'],
      ['delphin', 'Like anyone would tell you.', 'smug']
    ]);

    // --- the Cage ---
    api.sound('door');
    api.set('ch05_cageInDolls', true);
    stage(api, 'dolls', [
      { id: 'trader', spot: 'trader', facing: 'down' },
      { id: 'tb_elephant', spot: 'tbL', facing: 'down', turn: false }, { id: 'tb_frog', spot: 'tbR', facing: 'down', turn: false },
      { id: 'tb_hippo', spot: 'tb1', facing: 'left', turn: false }, { id: 'tb_boar', spot: 'tb2', facing: 'left', turn: false },
      { id: 'john', spot: 'cage', facing: 'down', turn: false },
      { id: 'cameraman', spot: 'camera', facing: 'left' },
      { id: 'annette', spot: 'seat_annette', facing: 'down' }, { id: 'carol', spot: 'seat_carol', facing: 'down' },
      { id: 'kessie', spot: 'seat_kessie', facing: 'down' }, { id: 'isaiah', spot: 'seat_isaiah', facing: 'up' },
      { id: 'delphin', spot: 'seat_delphin', facing: 'up' }
    ]);
    api.addObject({ id: 'ch05_cageNow', at: spot('dolls', 'cage'), prop: 'ch05cage', layer: 1, solid: false });
    await api.pan('john', 700);
    await api.run([
      'Wheels pound against the floor. Two True Believers drag in a cage fit for a Saint Bernard. John hangs from the centre, wrists and ankles chained to each corner, like a cricket splayed on a spider\'s web.',
      'A glove print on his cheek, ridges and all. And his nails: gnawed down past the skin, scabbed and pink, as if every finger was held over a shredder.',
      ['delphin', 'What the fuck, Trader?', 'angry'],
      ['kessie', 'I have to agree. Was all of this really necessary?', 'angry'],
      'Trader steps back from the cage, eyes wide. He glances at the True Believers, then darts his gaze away as if afraid they\'ll catch him looking. Then the smirk snaps back into place.',
      ['trader', 'He\'s a criminal. He lost the competition, and this is the punishment fate has chosen for him?'],
      { think: 'Did his voice just lilt up at the end? Like a question.' },
      'Annette laughs. She grabs her cane and smacks it against the bars. The clang rings through the room.',
      ['john', 'Stop it...', 'cry'],
      'She only laughs harder, and draws her arm all the way back for a second swing.'
    ]);
    await api.cameraReset(400);
    var g = await api.choice([
      '(Get up. Stand between Annette and the cage.)',
      '(Stay in your seat.)'
    ]);
    if (g === 0) {
      api.set('f_comforted_john', true);
      meter(api, 'm_annette', -5);
      await api.move('player', [spot('dolls', 'cage')[0] - 1, spot('dolls', 'cage')[1]]);
      api.face('player', 'left');
      await api.run([
        'Before I can think about what I\'m doing, I\'m in front of the cage with my arms spread wide. I don\'t even like the guy.',
        ['kessie', 'Annette!', 'shock'],
        ['annette', 'What? The boy deserves it. Didn\'t you see all those people who suffered for his indecision?', 'smug'],
        ['annette', 'Oh for goodness\' sake, girl. I\'m all finished. You can sit that heroic butt of yours down now. Just don\'t blame me for how bad you feel when you find out exactly who it is you\'re defending.', 'smug']
      ]);
      await api.move('player', spot('dolls', 'seat_luna'));
    } else {
      await api.run([
        'The second blow lands. The cage rocks. John doesn\'t even lift his head.',
        ['kessie', 'Annette!', 'shock'],
        ['annette', 'What? The boy deserves it. Didn\'t you see all those people who suffered for his indecision?', 'smug'],
        'She looks right at me, as if I\'d said something.',
        ['annette', 'Just don\'t any of you blame me for how bad you feel when you find out exactly who it is you\'re defending.', 'smug'],
        { think: 'Who it is we\'re defending?' }
      ]);
    }
    await api.run([
      ['trader', 'Enough. John\'s punishment has been carried out by those who determined it. It\'s not for any of you to interfere or add to. So sit down.'],
      'This time I catch a flash of anger in his eyes, aimed at the masks. Gone so fast I might have imagined it.',
      ['trader', 'Open up your apps, ladies and gentlemen! We\'re going to pause for thirty minutes so John and Carol can prepare, but we\'ll be seeing you soon here on Right to Life!', 'happy'],
      'He winks at the camera and makes a slashing motion with his hand. The ever-present whir slows to silence.',
      ['trader', 'That\'s a wrap. Take this time to prepare your case. You\'ll each have five minutes to tell the audience why you deserve to live.', 'tired']
    ]);
    api.onAir(false);
    api.approval(false);
    // Trader unlocks the cage and leaves
    api.remove('ch05_cageNow');
    api.set('ch05_cageInDolls', false);
    await api.run([
      'He fishes a toothbrush-shaped key out of his breast pocket and unlocks the cage. John stumbles out and collapses into an empty chair.',
      'Trader herds the True Believers and the camera crew into the hall. Muffled shouting through the door. A bang. Then silence.'
    ]);
    api.remove('tb_hippo'); api.remove('tb_boar'); api.remove('cameraman'); api.remove('trader');
    api.placeNpc('john', spot('dolls', 'seat_x'), 'up');
    await api.run([
      ['carol', 'Holy shit. Holy fucking shit, what am I going to do?', 'fear'],
      'She whirls on John, curled up in his chair.',
      ['carol', 'You\'ve got to tell them not to vote for you.', 'angry'],
      ['john', 'What?'],
      { think: 'In this show a vote saves you. She wants him to ask the country to let him die.' },
      'Across the circle, Kessie shakes her head at the same time I do. A silent question: should we do something? Kessie breaks eye contact first. The moment passes.',
      'Carol notices me staring. Her eyes narrow.',
      ['carol', 'Let\'s take a minute.', 'angry'],
      'She drags John up the stands at the back of the room, to the top bench by Samantha.'
    ]);
    api.remove('carol'); api.remove('john');
    await api.run([
      ['delphin', 'You\'re sure being polite.', 'smug'],
      ['luna', 'And here I thought my eavesdropping was completely obvious.'],
      ['delphin', 'Oh, it absolutely is. Picking up much?'],
      ['luna', 'Not a word.'],
      ['delphin', 'Why not turn up the volume?'],
      ['luna', 'Like with a remote?'],
      ['delphin', 'Did you know that back in the old days, they didn\'t have remotes? If people wanted to hear the show, they had to move closer to the television.', 'happy'],
      ['luna', 'You know, I don\'t remember Trader telling us we had to stay away from them.'],
      ['delphin', 'I can assure you that at no point did Trader utter the words: you may not follow the two competitors who are trying to have a private conversation.', 'smug'],
      ['luna', 'Fair enough.']
    ]);
    api.unlockPlayer();
    var e = await api.minigame('eavesdrop', {});
    api.set('ch05_eavesOk', !!e.success);
    stage(api, 'dolls', [
      { id: 'carol', spot: 'tbL', facing: 'down' }, { id: 'john', spot: 'top', facing: 'down' },
      { id: 'tb_elephant', at: [1, 2], visible: false }, { id: 'delphin', spot: 'tbR', facing: 'left' },
      { id: 'annette', spot: 'seat_annette', facing: 'down' }, { id: 'kessie', spot: 'seat_kessie', facing: 'down' },
      { id: 'isaiah', spot: 'seat_isaiah', facing: 'up' }
    ]);
    api.remove('tb_frog');
    api.teleport([spot('dolls', 'top')[0], spot('dolls', 'top')[1] + 1], 'up');
    if (e.success) {
      await api.run([
        'We reach the top step. Carol and John are holding hands, heads practically bumping. Carol looks up.',
        ['carol', 'What the hell are you doing? We\'re trying to have a private conversation here.', 'angry']
      ]);
    } else {
      await api.run(['Carol has seen us coming for three steps. She doesn\'t even pretend to be surprised.', ['carol', 'Are you two deaf, or just stupid? Private. Conversation.', 'angry']]);
    }
    await api.run([
      'Delphin slings an arm around the giant doll.',
      ['delphin', 'Just paying a visit to my old friend Samantha. How are you, Sam-Sam?', 'smug'],
      ['john', 'Can you give us a second?', 'cry'],
      ['luna', 'Sorry. But I can\'t do that.'],
      { think: 'I feel like a corpse looter. But whatever Carol is planning, John deserves a fair shake.' },
      ['carol', 'You need to go now. Because if you don\'t, I\'ll make you regret it.', 'angry'],
      ['john', 'Stop! Just stop.'],
      'John pushes himself to his feet. He traces a delicate line down Carol\'s cheek with his pinkie. She flinches, but doesn\'t move.',
      ['john', 'I don\'t think you\'re a bad person. Maybe that\'s just me being stupid still, but I really don\'t.'],
      ['carol', 'Of course I\'m not. I love you!', 'fear'],
      ['john', 'No you don\'t. You never have. A part of me knew it all along. But it was just so nice to have someone, anyone, pay that kind of attention to me.', 'sad'],
      ['delphin', 'Oooh. Juicy.', 'smug'],
      ['john', 'You\'re not a bad person. You\'re scared. And scared people do scary things.'],
      ['john', 'Look, we both know you\'ve been using me. Enough is enough, Care-bear.'],
      'The pet name is the last straw. Carol\'s glare turns her into something out of a horror novel.',
      ['carol', 'You\'ll regret this. All of you will.', 'angry'],
      { sound: 'hit' },
      'She stalks down the stands without bothering to step over the dolls. They squeak as they\'re crushed. Doll arms come away from doll bodies under her heels.',
      ['delphin', 'Oh, the carnage. Try not to murder any families, yeah?', 'smug'],
      ['carol', 'Aaauugh! Will you all just shut up and let me think!', 'angry']
    ]);
    api.remove('carol');
    await api.run([
      'John starts to cry again. Delphin picks his way over the doll parts and hands him a piece of fabric. On closer inspection, it\'s a doll sleeve.',
      ['delphin', 'Here, chief. Blow into this.'],
      ['john', 'Thanks. But I\'m screwed. I did something really dumb.', 'cry'],
      'He gestures for us to lean in. Three heads in a triangle.',
      ['john', 'I threw the competition. Carol promised me she had a plan. And I believed her. And now there\'s no way I can beat her.', 'cry'],
      ['delphin', 'You think that\'s a secret? Everyone already knew you threw the competition for Care-bear over there.', 'smug'],
      'I slap him on the leg, hard.',
      ['delphin', 'Ow! What was that for?', 'angry'],
      ['john', 'I don\'t know how you can be so brave. I\'ve never been very good at that.', 'sad']
    ]);
    var pt = await api.choice([
      'Can I tell you about my daughter? About the girls at school and her hair?',
      'Tell them what Carol did. Show the world you won\'t let the bully win.'
    ]);
    if (pt === 0) {
      api.set('f_comforted_john', true);
      meter(api, 'm_waverly', 5);
      await api.run([
        ['luna', 'When Waverly was eight, the girls at school called her hair a dust mop. Every day. She came home and cut a chunk off with the kitchen scissors.'],
        ['luna', 'The next morning she wore it wild anyway. Told them it was full of lightning and they\'d better stand back. They stood back.'],
        ['luna', 'She was terrified the whole time. She told me so. Brave isn\'t not being scared, John. It\'s walking in with the lightning anyway.'],
        ['john', 'Lightning.', 'happy'],
        'Delphin waves his arms in a giant X behind John\'s head. I ignore him.'
      ]);
    } else {
      await api.run([
        ['luna', 'It\'s not too late for you. You can still appeal to the audience. Tell them what she did.'],
        ['delphin', 'I like the sound of that.'],
        ['john', 'I\'ve always been a loser, and I still am. I\'ve got no one. Nothing. At forty-three years old.', 'cry'],
        ['delphin', 'Yo, you\'re forty-three? Then get your shit together, man. This could be your last chance. Get on with your middle-aged self and defend yourself.']
      ]);
    }
    await api.run([
      'John looks at us like he\'s seeing us for the first time. He bends down and picks up a detached doll hand, pushing all the fingers down except one.',
      ['john', 'I got this. I can do this.', 'happy'],
      ['delphin', 'Hell yeah, you can. Go get it.', 'happy'],
      ['john', 'I got this.'],
      'Middle finger saluting the room, he descends the stands, crushing a few doll legs on the way.',
      ['delphin', 'He\'s doomed.'],
      ['luna', 'Yeah. He sure is.'],
      { think: 'John opened himself up to love. Wrong place, wrong time, worst possible person. It was still an act of insane bravery. I\'ll always remember this moment.' }
    ]);
  }

  /* ---------- PUBLIC VOTE 1 (courtroom, SAVE polarity) ---------- */
  async function publicVote(api) {
    api.set('ch05_cageInCourt', true);
    var seats = ['annette', 'kessie', 'isaiah', 'delphin'];
    stage(api, 'court', [
      { id: 'trader', spot: 'trader', facing: 'down' },
      { id: 'tb_hippo', spot: 'tb1', facing: 'left', turn: false },
      { id: 'tb_boar', spot: 'tb2', facing: 'left', turn: false },
      { id: 'cameraman', spot: 'camera', facing: 'up' },
      { id: 'john', spot: 'defLeft', facing: 'down' },
      { id: 'carol', spot: 'defRight', facing: 'down' }
    ].concat(seats.map(function (s) { return { id: s, spot: 'seat_' + s, facing: 'up' }; })));
    await api.fadeOut(400);
    await go(api, 'court', 'seat_luna', 'up');
    api.lockPlayer();
    api.onAir(true);
    api.approval(true);
    api.sound('applause');
    api.lowerThird('RIGHT TO LIFE', 'Public Vote · Week 1 · LIVE · PRESS SAVE');
    await api.run([
      ['trader', 'Let\'s talk about regret. Every single one of you has hurt someone to end up here today. Do you feel that burning in your heart when you think about it?'],
      ['trader', 'Earlier, Isaiah admitted that he was sorry for what he\'d done. If the show were ending today, Isaiah would be the winner.'],
      'Isaiah closes his eyes and breathes in deeply through his nose.',
      ['trader', 'But it\'s not over.', 'smug'],
      ['trader', 'Ladies and gentlemen, you are about to be given a choice. You\'ve watched these people for a week. It\'s up to you to decide who has the greatest potential for redemption. And who will spend their last hour marred with regret.'],
      'True Believers unroll a red carpet, slowly, like peeling an egg, from the defendants\' chairs all the way to the Cage. John pales when he sees where it stops.',
      ['trader', 'Pick a number, one to ten! Lowest goes first. John?'],
      ['john', 'Um. One?'],
      ['trader', 'Of course it is. Go ahead, John. Walk the red carpet and show us what you\'ve learned.', 'smug']
    ]);
    api.lowerThird(null);
    // John's speech
    await api.run([
      { sound: 'select' },
      'Folk music floods the room, a man singing about losing his dear car. John walks the carpet stiff as a robot. At the end of it, the music stops.',
      ['trader', 'You have five minutes. Tell the audience why you deserve to live.'],
      ['john', 'I\'ve always been a loser.', 'sad'],
      ['cameraman', 'Louder, please. And look into the camera.', { name: 'Cameraman' }],
      ['john', 'I\'ve always been a loser. Pretty much ever since I was a little kid. Bullied as a kid, and tortured as an adult. That\'s been my time on this world.'],
      'He picks up two dolls from the floor: one porcelain and perfect, one with a boot print on its face and a hand missing.',
      ['john', 'There was this guy. He was perfect, just like this doll. A finance executive. Smart, handsome, funny. He passed my begging spot every day on his way to work.'],
      ['john', 'This one is me. Sad, ugly, and alone all the time.'],
      ['john', 'A few weeks ago, my perfect man finally noticed me. He screamed at me. Called me a waste of space. Then he punched me in the stomach, and when I fell he kicked me over and over.'],
      ['john', 'I lost it. I blacked out. When I came to, he was on the ground next to me, and he wasn\'t perfect anymore.', 'cry'],
      'He stomps the perfect doll. Its head flies off and rolls to Trader\'s feet.',
      ['john', 'It only took the court a few hours. And then I met Carol. She was the nicest any woman has ever been to me. People warned me she was using me. I didn\'t care.'],
      'Carol, of all things, blushes.',
      ['john', 'I\'m tired of living a life of pain. I don\'t think things will get better for me. So please, don\'t vote for me. Put me out of my misery.', 'cry']
    ]);
    var sh = await api.choice([
      '(Shout.) "No! You deserve so much more than that."',
      '(Stay silent.)'
    ]);
    if (sh === 0) {
      api.approvalAdd(4);
      await api.run([
        ['luna', 'No. No, you deserve so much more than that. You\'re not bad, John. It\'s this fucked-up world that made you feel that way.', 'angry'],
        'The True Believers make a beeline for me.',
        ['luna', 'Don\'t give up! ...Okay, okay. I\'ll stop. No need to do anything drastic.', 'fear']
      ]);
    } else {
      await api.think('I bite down on my tongue until it bleeds. Waverly is watching. I can\'t be gagged on camera. I can\'t.');
    }
    // Carol's speech
    await api.run([
      ['trader', 'And that\'s our time. Thank you, John. That was quite... illuminating. Next up, the lovely Miss Carol!'],
      'Punk music, a song about never letting the world break you down. Carol sashays down the carpet like a windup doll.',
      ['carol', 'Listen up, everyone!', 'happy'],
      ['carol', 'First off, thank you, John. That was a really beautiful speech, and just know that I appreciate the sacrifice you\'re making.'],
      { think: 'Fucking self-entitled little... She\'s not grateful at all.' },
      ['carol', 'Ever since I was a little kid, I\'ve wanted to be a star. Well, I sure am on screens now. Just not the way I thought.'],
      ['carol', 'Growing up poor, and as a woman, I had to go into everything swinging. I still believe that.'],
      ['carol', 'John asked you all not to vote for him. He\'s given up, not just on this show but on life. I\'ve been smacked around by the universe over and over, but I\'ve never given up and I never will. Keep me on, and you\'ll follow the journey of a spirited, powerful woman who fights to the end.', 'angry'],
      ['carol', 'Don\'t waste your vote on someone who doesn\'t want to live. Spend it on someone who\'s determined to.'],
      { think: 'I hate that her point is valid. She wants to live, and he doesn\'t. The math isn\'t hard. Assuming he said it of his own free will.' },
      ['trader', 'Excellent! It\'s time to pull out your apps, ladies and gentlemen. Go to the voting tab and press SAVE on John or Carol. Remember: the contestant with the most saves lives to redeem another day.', 'happy'],
      'Two cameramen kneel, one before Carol and one before John. Carol offers a tight smile. John covers his face with both hands.',
      ['trader', 'Ready... Set...', 'smug'],
      ['trader', 'Gooooo!', 'happy']
    ]);
    api.lowerThird(null);
    await api.minigame('savecount', {
      left: { id: 'john', name: 'JOHN', final: 200521, phase: 2.7 },
      right: { id: 'carol', name: 'CAROL', final: 200649, phase: 3.3 },
      dur: 9
    });
    await api.run([
      'Mid-count, John had peeked through his fingers and lowered his hands, transfixed.',
      ['john', 'I can\'t believe this many people are supporting me.'],
      ['kessie', 'Your story resonates. There\'s plenty of people out there with experiences like yours. This is their way of supporting you.'],
      ['carol', 'Then why are they still saving him? He asked to die. I heard it. You heard it. Why can\'t they hear it?', 'fear'],
      ['luna', 'They did. But they care enough about what he said not to listen.']
    ]);
    api.sound('sting');
    api.flash('#ffffff', 300);
    await api.tv({ speaker: 'trader', headline: 'PUBLIC VOTE · WEEK 1', text: 'CAROL: 200,649 SAVES.  JOHN: 200,521 SAVES.  Carol lives to redeem another day!', tag: 'LIVE', ticker: 'THE PEOPLE HAVE SPOKEN • 128 VOTES • JOHN MCDOHUE FACES JUDGMENT TOMORROW • ' });
    api.set('ch05_publicVote', { carol: 200649, john: 200521 });
    await api.run([
      ['luna', 'Nooo...', 'sad'],
      'One hundred and twenty-eight votes. Carol pumps her fist and spreads her fingers in a V for victory.',
      'I look to John, expecting him to be crushed. He isn\'t. His eyes shine. A small, relieved smile, like someone just forgave all his debts.',
      'Then the True Believers flank him, and his smile stretches until it takes up far too much of his face.',
      ['john', 'Not back in the cage. I can\'t go back in there. It\'s too lonely.', 'fear'],
      { move: 'tb_hippo', to: [spot('court', 'defLeft')[0] + 1, spot('court', 'defLeft')[1]] },
      ['john', 'No! Just do it here! Do it anywhere. Please, don\'t put me back in that cage.', 'cry'],
      { shake: 400, mag: 2 },
      'His heels screech on the floor. His legs catch on doll parts and drag them with him. It\'s depressing. It\'s disgusting. It\'s pathetic. It\'s mercy.',
      'It\'s painful.'
    ]);
    await api.move('john', spot('court', 'cage'));
    api.face('john', 'down');
    await api.run([
      'The moment his head crosses the threshold he stops fighting. He crumples to the floor, tucks his knees to his chest, and rocks. Back and forth. Over and over.',
      { think: 'My heart burns alongside his. All the way home.' }
    ]);
    api.onAir(false);
    api.approval(false);
    api.unlockPlayer();
  }

  /* ================================================================== *
   *  REGISTRATION
   * ================================================================== */
  G.registerChapter({
    id: 'ch05',
    title: 'The Tribunal',
    kicker: 'WEEK 1',
    maps: MAPS,
    tiles: TILES,
    props: PROPS,
    minigames: { eavesdrop: eavesdrop, count: count, savecount: savecount },
    testDefaults: {
      m_audience: 40, m_delphin: 15, m_isaiah: 30, m_kessie: 25, m_annette: 40, m_waverly: 60,
      f_helped_waiter: true, f_jemessa_triangle: false, f_vr_self_sacrifice: true
    },

    start: async function (api) {
      api.set({ ch05_day: 0, ch05_tasksDone: 0, ch05_warned: false, ch05_cageInCourt: false, ch05_cageInDolls: false });
      ['library', 'kitchen', 'lounge', 'arcade', 'tea', 'room'].forEach(function (k) { api.set('ch05_v_' + k, 0); });
      Object.keys(TASKS).forEach(function (t) { api.set(tflag(t), 'none'); });

      /* ===== TUESDAY ===== */
      api.set('ch05_day', 1);
      stage(api, 'luna', []);
      await api.goRoom(ROOMS.luna, { at: spot('luna', 'bed'), facing: 'down' });
      await api.titleCard('Tuesday', DAYS[0].date, 2400);
      await api.run([
        'Fatigue sits on my shoulders like a coat. My left eye is still swollen from the simulation; the True Believers copied that elbow onto my real face with professional care.',
        { think: 'Day three. Get through the week. Get through the vote. Get home to Waverly.' }
      ]);
      api.approval(true);
      await morningTasks(api, 0);
      await api.think('Two little chores from the people who want me dead. And if I tell anyone what they are, they kill me. Lovely.');
      api.sound('door');
      stage(api, 'luna', [{ id: 'delphin', spot: 'door', facing: 'up' }]);
      await api.run([
        'A knock. I ignore it. Another, louder. Then pounding, faster and harder. That combination of persistence and annoying can only belong to one person.'
      ]);
      api.objective('Answer the door');
      await api.waitForInteract('delphin');
      api.objective(null);
      await api.run([
        ['delphin', 'Rise and shine, red. The house is your oyster, and the oyster has an arcade. Come play.', 'smug'],
        ['luna', 'We\'ll find out soon enough which of us gets eliminated. Why rush it?'],
        ['delphin', 'Too easy. Hide in your room and you\'ll be voted out the first chance they get. Check your watch. Free period.', 'smug']
      ]);
      api.remove('delphin');
      await api.think('Much as I hate to admit it, he has a point about singling myself out. My watch gives me three free periods a day. Where I spend them is the only choice that\'s mine.');

      await freeSlot(api, 0, 'Morning');
      await freeSlot(api, 0, 'Afternoon');
      await dinner(api);
      await freeSlot(api, 0, 'Evening');
      await endDay(api, 0);
      stage(api, 'luna', []);
      await api.goRoom(ROOMS.luna, { at: spot('luna', 'bed'), facing: 'down' });
      await ranking(api, 0);

      /* ===== WEDNESDAY ===== */
      api.set('ch05_day', 2);
      await api.titleCard('Wednesday', DAYS[1].date, 2400);
      await morningTasks(api, 1);
      await wednesdayMorning(api);
      await codesOverheard(api);
      await freeSlot(api, 1, 'Afternoon');
      await freeSlot(api, 1, 'Evening');
      await endDay(api, 1);
      stage(api, 'luna', []);
      await api.goRoom(ROOMS.luna, { at: spot('luna', 'bed'), facing: 'down' });
      await ranking(api, 1);

      /* ===== THURSDAY ===== */
      api.set('ch05_day', 3);
      await api.titleCard('Thursday', DAYS[2].date, 2400);
      await morningTasks(api, 2);
      await freeSlot(api, 2, 'Morning');
      await mirrorFight(api);
      await freeSlot(api, 2, 'Afternoon');
      await freeSlot(api, 2, 'Evening');
      await endDay(api, 2);
      await windowNight(api);

      /* ===== FRIDAY ===== */
      api.set('ch05_day', 4);
      await friday(api);
      await courtroomVote(api);
      await dollRoom(api);
      await publicVote(api);

      await api.slides([
        { style: 'montage', title: 'Friday night', text: 'John spends the night in the Cage. Tomorrow, the people will watch him die.' }
      ]);
      api.completeChapter();
    }
  });
})();
