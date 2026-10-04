/* =========================================================================
 * ch12 "The Night in the Rain"
 *
 * Tue 30 Jan -> Fri 2 Feb 2084. Luna wakes drugged after the Maze, talks
 * Delphin into his stitches, and the talk about Salina opens the PLAYABLE
 * FLASHBACK of the night in the rain (Columbus House, 18 years ago): packing,
 * sneaking past the dorm android, the storm in the woods following Salina's
 * flashlight, the lightning, the silhouette at the tree line, Norman's
 * abandoned park, the roller coaster that shreds the photo, the walk back at
 * dawn and Delphin's slap. Back in the infirmary Delphin tells his secret.
 * Annette is confronted. A quiet week (camera storytelling hub). Friday: the
 * open vote in the Doll Room ties 2-2 and the Judge breaks it with CHECKERS
 * (a real rules-correct checkers game with an AI; if the player wins on the
 * board the Judge, as host, reviews the footage and voids the game).
 *
 * Cross-chapter flags (CHAPTERS.md §2):
 *   READS : m_delphin (15)  >=50 -> Delphin volunteers the secret
 *           m_audience (40) >=60 -> Luxury Room night (if !f_luxury_used)
 *           f_luxury_used (false), f_attacked_annette (true: bruise line)
 *           f_carried_delphin (true: "your trailing foot"), m_isaiah (30), m_annette (40)
 *           f_kessie_secret_told (true)
 *   SETS  : f_delphin_secret, f_salina_forgiven, m_audience (+5 per camera story,
 *           show beats), m_isaiah +15 (checkers reveal), f_luxury_used,
 *           m_delphin (+), m_annette (+/-)
 * Chapter-local flags: ch12_*.
 *
 * Shared maps: map keys equal the shared ids (CHAPTER_BRIEF convention) so the
 * shared to_<room> exits connect. Each falls back to a minimal placeholder
 * while G.shared.has(id) is false. Entity tiles on shared maps are snapped to
 * the nearest free floor tile at load time (layouts not known in advance).
 * ========================================================================= */
(function () {
  'use strict';

  var CH = 'ch12';
  var ROOM = {
    lunaRoom: 'house_luna_room', hall: 'house_bedroom_hall', infirmary: 'house_infirmary',
    redHall: 'house_red_hall', lounge: 'house_lounge', kitchen: 'house_kitchen', arcade: 'house_arcade',
    library: 'house_library', luxury: 'house_luxury_room', doll: 'house_doll_room',
    dorm: 'columbus_dorm', yard: 'columbus_yard', closet: 'columbus_closet',
    woods: 'rain_woods', park: 'norman_park'          // chapter-only (off-site, no prefix)
  };
  var MARK = {};          // MARK[mapKey][name] -> [x,y] resolved tile
  var SHARED_USED = {};   // mapKey -> true when the shared map was used

  /* ---------------------------------------------------------------------
   * Helpers: free-tile snapping and shared/placeholder selection
   * ------------------------------------------------------------------- */
  function rng(seed) { var s = seed >>> 0; return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

  function freeTile(room, def, pref, taken) {
    var blocked = {};
    (def.exits || []).forEach(function (e) { for (var dx = 0; dx < (e.w || 1); dx++) for (var dy = 0; dy < (e.h || 1); dy++) blocked[(e.at[0] + dx) + ',' + (e.at[1] + dy)] = 1; });
    (def.objects || []).forEach(function (o) { if (o.at) blocked[o.at[0] + ',' + o.at[1]] = 1; });
    (def.npcs || []).forEach(function (n) { if (n.at) blocked[n.at[0] + ',' + n.at[1]] = 1; });
    var px = Math.max(1, Math.min(room.w - 2, pref[0])), py = Math.max(1, Math.min(room.h - 2, pref[1]));
    for (var r = 0; r < Math.max(room.w, room.h); r++) {
      for (var dy2 = -r; dy2 <= r; dy2++) for (var dx2 = -r; dx2 <= r; dx2++) {
        if (Math.max(Math.abs(dx2), Math.abs(dy2)) !== r) continue;
        var x = px + dx2, y = py + dy2, k = x + ',' + y;
        if (x < 0 || y < 0 || x >= room.w || y >= room.h) continue;
        if (blocked[k] || taken[k]) continue;
        if (G.Map.solidAt(room, x, y)) continue;
        return [x, y];
      }
    }
    return pref;
  }

  /**
   * use(key, placeholder, ext): shared copy if it exists, else the placeholder.
   * ext: { npcs, objects, zones, marks:{name:[x,y]}, patch:{id:{...}}, remove:[], placeholderOnly:{exits...}, ...fields }
   * For the shared copy every npc/object/zone/mark position is snapped to a free tile.
   */
  function use(key, placeholder, ext) {
    ext = ext || {};
    var marks = ext.marks || {};
    var res = MARK[key] = {};
    if (G.shared && G.shared.has(key)) {
      SHARED_USED[key] = true;
      var probe = G.shared.map(key, { remove: ext.remove || [] });
      var room = G.Map.build(probe);
      var taken = {};
      ['npcs', 'objects', 'zones'].forEach(function (k) {
        (ext[k] || []).forEach(function (e) {
          if (e.keepAt) return;
          e.at = freeTile(room, probe, e.at, taken); taken[e.at[0] + ',' + e.at[1]] = 1;
        });
      });
      Object.keys(marks).forEach(function (n) { res[n] = freeTile(room, probe, marks[n], taken); });
      var ids = {};
      ['npcs', 'objects', 'zones', 'exits'].forEach(function (k) { (probe[k] || []).forEach(function (e) { if (e.id) ids[e.id] = e; }); });
      var patch = {};
      Object.keys(ext.patch || {}).forEach(function (id) { if (ids[id]) patch[id] = ext.patch[id]; });
      var e2 = {};
      Object.keys(ext).forEach(function (k) { if (k !== 'marks' && k !== 'patch' && k !== 'placeholderOnly' && k !== 'onlyPlaceholderNpcs') e2[k] = ext[k]; });
      e2.patch = patch;
      return G.shared.map(key, e2);
    }
    // placeholder: concat lists, override other fields, apply patch by id
    var m = placeholder;
    ['npcs', 'objects', 'zones', 'exits', 'lights'].forEach(function (k) { m[k] = (m[k] || []).concat(ext[k] || []).concat((ext.placeholderOnly && ext.placeholderOnly[k]) || []); });
    m.npcs = m.npcs.concat(ext.onlyPlaceholderNpcs || []);
    Object.keys(ext).forEach(function (k) {
      if (['npcs', 'objects', 'zones', 'exits', 'lights', 'marks', 'patch', 'remove', 'placeholderOnly', 'onlyPlaceholderNpcs'].indexOf(k) >= 0) return;
      m[k] = ext[k];
    });
    Object.keys(ext.patch || {}).forEach(function (id) {
      ['npcs', 'objects', 'zones', 'exits'].forEach(function (k) { m[k].forEach(function (e) { if (e.id === id) Object.assign(e, ext.patch[id]); }); });
    });
    Object.keys(marks).forEach(function (n) { res[n] = marks[n]; });
    return m;
  }
  function mk(key, name, fallback) { return (MARK[key] && MARK[key][name]) || fallback; }

  /* ---------------------------------------------------------------------
   * Custom tiles and props
   * ------------------------------------------------------------------- */
  var TILES = {
    mud:    { color: '#1a2016', color2: '#252e1e', pattern: 'noise' },
    gravel: { color: '#34322f', color2: '#45423d', pattern: 'dots' },
    tree: { solid: true, draw: function (g, x, y, info) {
      g.fillStyle = '#141a12'; g.fillRect(x, y, 16, 16);
      g.fillStyle = '#2a1e14'; g.fillRect(x + 6, y + 9, 4, 7);
      var s = info.r;
      g.fillStyle = s > 0.5 ? '#1e3020' : '#203626'; g.fillRect(x + 1, y + 1, 14, 10);
      g.fillStyle = '#2c4a30'; g.fillRect(x + 3, y + 2, 7, 4);
      g.fillStyle = '#10180f'; g.fillRect(x + 1, y + 10, 14, 1);
    } },
    ravine: { solid: true, draw: function (g, x, y, info) {
      g.fillStyle = '#020204'; g.fillRect(x, y, 16, 16);
      g.fillStyle = '#0c0d12'; g.fillRect(x + (info.r * 8 | 0), y, 3, 16);
      if (info.r > 0.7) { g.fillStyle = '#1a1e26'; g.fillRect(x + 4, y + 6, 2, 2); }
    } },
    log: { draw: function (g, x, y) {
      g.fillStyle = '#020204'; g.fillRect(x, y, 16, 16);
      g.fillStyle = '#4a3420'; g.fillRect(x, y + 4, 16, 8);
      g.fillStyle = '#6a4a2c'; g.fillRect(x, y + 5, 16, 2);
      g.fillStyle = '#2a1c10'; g.fillRect(x + 5, y + 4, 1, 8); g.fillRect(x + 11, y + 4, 1, 8);
    } },
    fence: { solid: true, draw: function (g, x, y) {
      g.fillStyle = '#1e2a1a'; g.fillRect(x, y, 16, 16);
      g.fillStyle = '#5a5048'; g.fillRect(x, y + 4, 16, 2); g.fillRect(x, y + 10, 16, 2);
      g.fillStyle = '#7a6e62'; for (var i = 1; i < 16; i += 5) g.fillRect(x + i, y + 1, 2, 14);
    } },
    rail: { solid: true, draw: function (g, x, y, info) {
      g.fillStyle = '#0e1014'; g.fillRect(x, y, 16, 16);
      g.fillStyle = '#5a3a30'; g.fillRect(x + 2, y, 2, 16); g.fillRect(x + 12, y, 2, 16);
      g.fillStyle = '#7a5040'; g.fillRect(x + 2, y + (info.ty % 2 ? 3 : 11), 12, 2);
      g.fillStyle = '#8a8a90'; g.fillRect(x + 6, y, 1, 16); g.fillRect(x + 9, y, 1, 16);
    } },
    platform: { solid: true, color: '#3a3438', color2: '#2a2428', pattern: 'plates' },
    dollshelf: { wall: true, solid: true, draw: function (g, x, y, info) {
      g.fillStyle = '#3a1c1c'; g.fillRect(x, y, 16, 16);
      g.fillStyle = '#5a2a22'; g.fillRect(x, y + 7, 16, 2); g.fillRect(x, y + 15, 16, 1);
      for (var i = 0; i < 3; i++) {
        var dx = x + 1 + i * 5;
        g.fillStyle = '#e8d8c8'; g.fillRect(dx, y + 2, 4, 4);
        g.fillStyle = '#000'; g.fillRect(dx, y + 3, 1, 1); g.fillRect(dx + 2, y + 3, 1, 1);
        g.fillStyle = '#a01818'; g.fillRect(dx, y + 4, 1, 2); g.fillRect(dx + 1, y + 5, 2, 1);
      }
      if (!info.face) return;
      g.fillStyle = '#2a1414'; g.fillRect(x, y + 9, 16, 6);
    } }
  };

  function drawRain(g, t, alpha) {
    g.save();
    g.strokeStyle = 'rgba(170,190,235,' + (alpha || 0.38) + ')';
    g.lineWidth = 1;
    g.beginPath();
    for (var i = 0; i < 110; i++) {
      var sp = 1 + (i % 5) * 0.14;
      var sx = ((i * 53.7 + t * 30 * sp) % (G.W + 40)) - 20;
      var sy = ((i * 97.3 + t * 300 * sp) % (G.H + 30)) - 15;
      g.moveTo(Math.round(sx), Math.round(sy)); g.lineTo(Math.round(sx - 2), Math.round(sy + 7));
    }
    g.stroke();
    g.restore();
  }

  var PROPS = {
    rain: function (g, x, y, t) { drawRain(g, t, 0.36); },
    samantha: function (g, x, y, t, o) {
      var bob = o && o.bob ? Math.sin(t * 9) * o.bob : 0;
      var cx = x + 8 + bob;
      g.fillStyle = '#5a1a8a'; g.fillRect(x + 2, y + 6, 12, 10);           // dress
      g.fillStyle = '#f2dcc8'; g.beginPath(); g.arc(cx, y - 2, 8, 0, Math.PI * 2); g.fill(); // beach-ball face
      g.fillStyle = '#c01818'; for (var i = -8; i <= 8; i += 3) g.fillRect(cx + i, y - 12 + Math.abs(i) / 3, 2, 6); // red palm-leaf hair
      g.fillStyle = '#7ad8ff'; g.fillRect(cx - 5, y - 4, 3, 3); g.fillRect(cx + 2, y - 4, 3, 3);
      g.fillStyle = '#000'; g.fillRect(cx - 4, y - 3, 1, 1); g.fillRect(cx + 3, y - 3, 1, 1);
      g.fillStyle = '#7a2a8a'; g.fillRect(cx - 3, y + 1, 6, 2);
      g.fillStyle = '#6a4a2a'; g.fillRect(x + 13, y + 4, 2, 8); g.fillRect(x + 11, y + 3, 6, 3); // gavel
      g.fillStyle = (Math.floor(t * 2) % 2) ? '#e8323c' : '#7a1218'; g.fillRect(cx - 1, y - 9, 2, 2); // camera eye
    },
    throne: function (g, x, y) {
      g.fillStyle = '#7a5a1a'; g.fillRect(x + 2, y - 8, 12, 22);
      g.fillStyle = '#c9a24a'; g.fillRect(x + 3, y - 7, 10, 20);
      g.fillStyle = '#6a1020'; g.fillRect(x + 4, y + 4, 8, 6);
      g.fillStyle = '#4ad8e8'; g.fillRect(x + 7, y - 6, 2, 2);
      g.fillStyle = '#e83a6a'; g.fillRect(x + 4, y - 3, 2, 2); g.fillRect(x + 10, y - 3, 2, 2);
    },
    board: function (g, x, y) {
      g.fillStyle = '#2a1a10'; g.fillRect(x, y + 2, 16, 12);
      for (var r = 0; r < 4; r++) for (var c = 0; c < 6; c++) { g.fillStyle = (r + c) % 2 ? '#c8b89a' : '#3a2018'; g.fillRect(x + 2 + c * 2, y + 4 + r * 2, 2, 2); }
      g.fillStyle = '#c8323c'; g.fillRect(x + 3, y + 4, 1, 1); g.fillRect(x + 9, y + 4, 1, 1);
      g.fillStyle = '#111'; g.fillRect(x + 5, y + 10, 1, 1); g.fillRect(x + 11, y + 10, 1, 1);
    },
    carousel: function (g, x, y, t) {
      g.fillStyle = '#2a3a22'; g.beginPath(); g.ellipse(x + 8, y + 10, 22, 12, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#4a6a2a'; for (var i = 0; i < 9; i++) g.fillRect(x - 12 + i * 5, y + 4 + (i % 3), 3, 3); // moss
      g.fillStyle = '#6a5a48'; g.fillRect(x + 7, y - 18, 2, 28);
      g.fillStyle = '#7a3a3a'; g.beginPath(); g.moveTo(x - 14, y - 10); g.lineTo(x + 8, y - 22); g.lineTo(x + 30, y - 10); g.fill();
      for (var h = 0; h < 4; h++) { var hx = x - 8 + h * 9; g.fillStyle = '#c8c0a8'; g.fillRect(hx, y - 4 + (h % 2) * 2, 6, 4); g.fillStyle = '#3a6a2a'; g.fillRect(hx, y - 4 + (h % 2) * 2, 3, 2); g.fillStyle = '#8a8070'; g.fillRect(hx + 2, y - 12, 1, 8); }
    },
    tiltawhirl: function (g, x, y) {
      g.fillStyle = '#3a2a30'; g.save(); g.translate(x + 8, y + 8); g.rotate(0.35);
      g.fillRect(-20, -6, 40, 12); g.restore();
      g.fillStyle = '#c86a2a'; g.fillRect(x - 8, y + 1, 9, 7); g.fillRect(x + 12, y + 8, 9, 7);
      g.fillStyle = '#d8d0c0'; g.fillRect(x - 6, y + 2, 5, 3); g.fillRect(x + 14, y + 9, 5, 3); // cotton/trash
      g.fillStyle = '#5a5a40'; g.fillRect(x + 2, y + 6, 4, 2);
    },
    booth: function (g, x, y) {
      g.fillStyle = '#5a3a2a'; g.fillRect(x, y - 6, 16, 20);
      g.fillStyle = '#c83a3a'; g.fillRect(x - 1, y - 8, 18, 4);
      g.fillStyle = '#e8e0d0'; g.fillRect(x - 1, y - 8, 3, 4); g.fillRect(x + 5, y - 8, 3, 4); g.fillRect(x + 11, y - 8, 3, 4);
      g.fillStyle = '#3ad8a8'; g.fillRect(x + 2, y, 5, 1); g.fillRect(x + 4, y + 2, 7, 1); // graffiti
      g.fillStyle = '#d83ad8'; g.fillRect(x + 8, y + 4, 5, 1);
    },
    speaker: function (g, x, y, t) {
      g.fillStyle = '#4a4a50'; g.fillRect(x + 7, y - 4, 2, 18);
      g.fillStyle = '#6a6a72'; g.fillRect(x + 2, y - 10, 12, 8);
      g.fillStyle = '#e8c15a'; var p = Math.sin(t * 6) > 0 ? 1 : 0; g.fillRect(x + 5 - p, y - 8 - p, 6 + 2 * p, 4 + 2 * p);
    },
    car: function (g, x, y) {
      g.fillStyle = '#b8202a'; g.fillRect(x + 1, y + 3, 14, 9);
      g.fillStyle = '#e8c15a'; g.fillRect(x + 1, y + 3, 14, 2);
      g.fillStyle = '#1a1a1a'; g.fillRect(x + 3, y + 12, 3, 3); g.fillRect(x + 10, y + 12, 3, 3);
    },
    lantern: function (g, x, y, t) {
      g.fillStyle = '#3a3020'; g.fillRect(x + 6, y + 2, 4, 2);
      g.fillStyle = 'rgba(255,200,90,' + (0.7 + 0.3 * Math.sin(t * 7)) + ')'; g.fillRect(x + 5, y + 4, 6, 7);
    },
    oak: function (g, x, y) {
      g.fillStyle = '#2a1e14'; g.fillRect(x + 5, y - 6, 6, 22);
      g.fillStyle = '#1c2c1a'; g.beginPath(); g.arc(x + 8, y - 12, 18, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#28402a'; g.beginPath(); g.arc(x + 2, y - 16, 9, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.arc(x + 15, y - 9, 8, 0, Math.PI * 2); g.fill();
    },
    pillow: function (g, x, y) { g.fillStyle = '#d8d8d0'; g.fillRect(x + 3, y + 3, 10, 5); g.fillStyle = '#a8a8a0'; g.fillRect(x + 3, y + 7, 10, 1); }
  };

  /* ---------------------------------------------------------------------
   * Maps: placeholders for shared House / Columbus rooms
   * ------------------------------------------------------------------- */
  function lockedDoor(id, at, text) { return { id: id, at: at, to: ROOM.hall, locked: function () { return true; }, lockedText: [{ think: text }] }; }

  var lunaRoom = use(ROOM.lunaRoom, {
    name: "Luna's Room (No. 3)",
    tiles: [
      '####W#####',
      '#,,,,,,bb#',
      '#,,,,,,bb#',
      '#,,,,,,,,#',
      '#,,,,,,,,#',
      '#,,,,,,,,#',
      '#dc,,,,,P#',
      '####D#####'
    ],
    spawn: [6, 3], ambient: 'hum', tint: '#3a2030', tintAlpha: 0.1,
    exits: [{ id: 'to_bedroom_hall', at: [4, 7], to: ROOM.hall, toAt: [9, 1], facing: 'down' }]
  }, {
    marks: { wake: [6, 3], ginerva: [4, 6] },
    objects: [
      { id: 'ch12_window', at: [4, 0], examine: [{ think: 'The garden below. Pink almond blossoms, in January. Even the trees are on contract.' }] },
      { id: 'ch12_eye', at: [7, 0], prop: 'camera', examine: [{ think: 'The Eye in the smoke detector. Good morning to you too.' }, { sound: 'camera' }] },
      { id: 'ch12_tablet', at: [8, 4], prop: 'monitor', examine: [{ narrate: 'The wall tablet cycles its "curated memories": Waverly at six, Waverly at nine, a Waverly they have smiled into someone else.' }, { think: 'They never once caught her real laugh.' }] },
      { id: 'ch12_desk', at: [1, 6], examine: [{ narrate: 'A DPE pen and the penguin booklet. Page one: "Gratitude is the first step to redemption."' }] }
    ]
  });

  var hall = use(ROOM.hall, {
    name: 'Bedroom Hall',
    tiles: [
      '###D#####D#####D#####D######',
      '#,,,,,,,,,,,,,,,,,,,,,,,,,,#',
      'D,,,,,,,,,,,,,,,,,,,,,,,,,,D',
      '#,,,,,,,,,,,,,,,,,,,,,,,,,,#',
      '######D#####D#####D#####D###'
    ],
    spawn: [9, 1], ambient: 'hum', tint: '#20203a', tintAlpha: 0.1,
    exits: [
      { id: 'to_luna_room', at: [9, 0], to: ROOM.lunaRoom, toAt: [4, 6], facing: 'up' },
      { id: 'to_infirmary', at: [0, 2], to: ROOM.infirmary, toAt: [8, 3], facing: 'left' },
      { id: 'to_luxury_room', at: [27, 2], to: ROOM.luxury, toAt: [1, 3], facing: 'right' },
      { id: 'to_red_hall', at: [24, 4], to: ROOM.redHall, toAt: [24, 3], facing: 'down' },
      lockedDoor('door_1', [3, 0], 'No. 1. Annette. I would rather sleep in the cage.'),
      lockedDoor('door_5', [15, 0], "No. 5. Kessie's door. Somebody has already stripped the name plate."),
      lockedDoor('door_7', [21, 0], "No. 7. Isaiah. I knock. Nothing."),
      lockedDoor('door_2', [6, 4], "No. 2. Carol's. Sealed."),
      lockedDoor('door_4', [12, 4], "No. 4. John's. Sealed."),
      lockedDoor('door_6', [18, 4], "No. 6. Delphin's. Empty while he's in the infirmary.")
    ]
  }, {
    objects: [
      { id: 'ch12_hallcam', at: [13, 0], prop: 'camera', examine: [{ think: 'Two cameras on this hall. I wave. Somebody, somewhere, gets paid to watch me wave.' }] },
      { id: 'ch12_poster', at: [18, 0], prop: 'poster', examine: [{ narrate: 'A poster: "NOTHING YOU FEEL IS PRIVATE."' }] }
    ],
    patch: { to_luxury_room: { locked: '!ch12_luxuryNight', lockedText: [{ think: 'The Luxury Room. Only for whoever is number one tonight.' }] } },
    placeholderOnly: {}
  });
  // the placeholder luxury door is also locked unless it's our night
  (hall.exits || []).forEach(function (e) { if (e.id === 'to_luxury_room') { e.locked = '!ch12_luxuryNight'; e.lockedText = [{ think: 'The Luxury Room. Only for whoever is number one tonight.' }]; } });

  var infirmary = use(ROOM.infirmary, {
    name: 'Infirmary',
    tiles: [
      '####W#####',
      '#b.b.b.dk#',
      '#........#',
      '#........D',
      '#........#',
      '#b.b.b.T.#',
      '#........#',
      '##########'
    ],
    spawn: [8, 3], ambient: 'hum', tint: '#c8e8e0', tintAlpha: 0.06,
    exits: [{ id: 'to_bedroom_hall', at: [9, 3], to: ROOM.hall, toAt: [1, 2], facing: 'right' }]
  }, {
    marks: { door: [8, 3], bedside: [4, 2], ginerva: [6, 3] },
    npcs: [
      { id: 'delphin', at: [3, 2], spec: 'delphin', facing: 'down', if: '!ch12_delphinGone', talk: function (api) { return delphinTalk(api); } },
      { id: 'medic', at: [7, 2], spec: 'medic', facing: 'left', if: '!ch12_medicOut', talk: function (api) { return medicTalk(api); } }
    ],
    objects: [
      { id: 'ch12_mats', at: [5, 5], examine: [{ narrate: 'Branded blood-absorbent mats under every cot. "SOAK IT UP."' }] },
      { id: 'ch12_medoffice', at: [8, 1], examine: [{ narrate: 'A door: MEDICAL OFFICE. Somebody behind it is humming the network jingle.' }] }
    ]
  });

  var redHall = use(ROOM.redHall, {
    name: 'Red Hall',
    tiles: [
      '####D#####D#####D#############',
      '#RRRRRRRRRRRRRRRRRRRRRRRRRRRR#',
      '#RRRRRRRRRRRRRRRRRRRRRRRRRRRR#',
      '#RRRRRRRRRRRRRRRRRRRRRRRRRRRR#',
      '#######D########D#######D#####'
    ],
    spawn: [24, 3], ambient: 'hum', tint: '#3a0a10', tintAlpha: 0.12,
    exits: [
      { id: 'to_lounge', at: [4, 0], to: ROOM.lounge, toAt: [5, 7], facing: 'up' },
      { id: 'to_library', at: [10, 0], to: ROOM.library, toAt: [5, 7], facing: 'up' },
      { id: 'to_arcade', at: [16, 0], to: ROOM.arcade, toAt: [5, 6], facing: 'up' },
      { id: 'to_kitchen', at: [7, 4], to: ROOM.kitchen, toAt: [5, 1], facing: 'down' },
      { id: 'to_bedroom_hall', at: [24, 4], to: ROOM.hall, toAt: [24, 3], facing: 'up' },
      { id: 'to_dining', at: [16, 4], to: ROOM.hall, locked: function () { return true; }, lockedText: [{ think: 'The dining room. Nobody eats together anymore.' }] }
    ]
  }, {
    objects: [
      { id: 'ch12_poster2', at: [22, 0], prop: 'poster', examine: [{ narrate: 'A poster: "OBEDIENCE IS BEAUTY."' }] },
      { id: 'ch12_redcam', at: [12, 0], prop: 'camera', examine: [{ think: 'Three cameras on the spine of this house. Its eyes run down its back.' }] }
    ]
  });

  var lounge = use(ROOM.lounge, {
    name: 'Lounge',
    tiles: [
      '####M##V####',
      '#,,,,,,,,,,#',
      '#hh,,,,,,hh#',
      '#,,,,RR,,,,#',
      '#,,,,RR,,,,#',
      '#hh,,,,,,hh#',
      '#,,,,,,,,,P#',
      '#,,,,,,,,,,#',
      '#####D######'
    ],
    spawn: [5, 7], ambient: 'hum',
    exits: [{ id: 'to_red_hall', at: [5, 8], to: ROOM.redHall, toAt: [4, 1], facing: 'down' }]
  }, {
    npcs: [{ id: 'annette', at: [3, 2], spec: 'annette', facing: 'down', talk: function (api) { return annetteTalk(api); } }],
    objects: [
      { id: 'ch12_pillows', at: [10, 2], examine: [{ narrate: 'Embroidered pillows: "CRY PRETTY." "BETRAY, BUT MAKE IT ART."' }] },
      { id: 'ch12_mirror', at: [4, 0], examine: [{ think: 'The mirror from the Carol and Kessie fight. Somebody polished it. Somebody always polishes it.' }] }
    ]
  });

  var kitchen = use(ROOM.kitchen, {
    name: 'Kitchen',
    tiles: [
      'QQQQQDQQQQQQ',
      'QOSKKK::F::Q',
      'Q::::::::::Q',
      'Q::KK::KK::Q',
      'Q::::::::::Q',
      'Q:nnn::nnn:Q',
      'Q::::::::::Q',
      'Q::::::::::Q',
      'QQQQQQQQQQQQ'
    ],
    spawn: [5, 1], ambient: 'hum',
    exits: [{ id: 'to_red_hall', at: [5, 0], to: ROOM.redHall, toAt: [7, 3], facing: 'up' }]
  }, {
    objects: [
      { id: 'ch12_kcam', at: [10, 0], prop: 'camera', examine: function (api) { return storyCamera(api); } },
      { id: 'ch12_kettle', at: [3, 1], examine: [{ think: "Annette's tea station. I don't even look at the kettle anymore." }] },
      { id: 'ch12_fridge', at: [8, 1], examine: [{ narrate: 'Real meat. Real butter. A real chandelier over it all, as if the onions need mood lighting.' }] }
    ]
  });

  var arcade = use(ROOM.arcade, {
    name: 'Arcade',
    tiles: [
      '#VVV##VV#VV#',
      '#,,,,,,,,,,#',
      '#,X,,,,,,X,#',
      '#,,,,,,,,,,#',
      '#,X,,,,,,X,#',
      '#,,,,,,,,,,#',
      '#,,,,,,,,,,#',
      '#####D######'
    ],
    spawn: [5, 6], ambient: 'crowd', tint: '#3a1a4a', tintAlpha: 0.12,
    exits: [{ id: 'to_red_hall', at: [5, 7], to: ROOM.redHall, toAt: [16, 1], facing: 'down' }]
  }, {
    objects: [
      { id: 'ch12_gallery', at: [2, 2], examine: function (api) { return arcadeGallery(api); } },
      { id: 'ch12_wheel', at: [9, 2], examine: [{ narrate: 'A wheel of fortune. Every wedge says "GRATITUDE".' }] },
      { id: 'ch12_jackpot', at: [9, 4], examine: [{ narrate: 'The jackpot machine flashes CONGRATULATIONS, WINNER at nobody.' }] },
      { id: 'ch12_isaiahtable', at: [2, 4], examine: [{ think: "Isaiah's number-pattern table. He's left a sequence half finished. He never leaves things half finished." }] }
    ]
  });

  var library = use(ROOM.library, {
    name: 'Library',
    tiles: [
      '#kkkkkkkkkk#',
      'k,,,,,,,,,,k',
      'k,c,,,,,,c,k',
      'k,,,,,,,,,,k',
      'k,,,,RR,,,,k',
      'k,c,,,,,,c,k',
      'k,,,,,,,,,,k',
      'k,,,,,,,,,,k',
      '#####D######'
    ],
    spawn: [5, 7], ambient: 'hum', tint: '#2a3a5a', tintAlpha: 0.08,
    exits: [{ id: 'to_red_hall', at: [5, 8], to: ROOM.redHall, toAt: [10, 1], facing: 'down' }]
  }, {
    npcs: [{ id: 'isaiah', at: [8, 3], spec: 'isaiah', facing: 'left', if: 'ch12_phase == hub', talk: function (api) { return isaiahAvoid(api); } }],
    objects: [
      { id: 'ch12_sign', at: [5, 0], examine: [{ narrate: 'Fluorescent blue: "Books may not be removed from the library. Violators will face punitive measures."' }] },
      { id: 'ch12_falsville', at: [1, 4], examine: [{ think: 'The Falsville series. Waverly would have read all twelve by now and complained about the ending.' }] }
    ]
  });

  var luxury = use(ROOM.luxury, {
    name: 'Luxury Room',
    tiles: [
      '##########',
      '#P,,,,,bbW',
      '#,,,,,,bb#',
      'D,,,,,,,,#',
      '#,,RRRR,,#',
      '#,,RRRR,,#',
      '#P,,,,,,P#',
      '##########'
    ],
    spawn: [1, 3], ambient: null, tint: '#e8c890', tintAlpha: 0.08,
    exits: [{ id: 'to_bedroom_hall', at: [0, 3], to: ROOM.hall, toAt: [26, 2], facing: 'left' }]
  }, {
    objects: [{ id: 'ch12_luxbed', at: [7, 2], examine: function (api) { return luxuryBed(api); } }]
  });

  var samanthaDef = { prop: 'samantha', examine: function (api) { return bopSamantha(api); } };
  var dollRoom = use(ROOM.doll, {
    name: 'Doll Room',
    tiles: [
      'qqqqqqqqqqqqqqqq',
      'q..............q',
      'q..............q',
      'q..c........c..W',
      'q..............q',
      'q.c...........cq',
      'q......TT......q',
      'q.c...........cq',
      'q..............q',
      'q..c........c..q',
      'q..............q',
      'qqqqqqqqDqqqqqqq'
    ],
    legend: { q: 'dollshelf' },
    spawn: [8, 10], ambient: 'tension', tint: '#5a1a10', tintAlpha: 0.14,
    exits: [{ id: 'to_bedroom_hall', at: [8, 11], to: ROOM.hall, locked: function () { return true; }, lockedText: [{ think: 'The door is locked behind us. Of course it is.' }] }],
    objects: [Object.assign({ id: 'samantha', at: [7, 1] }, samanthaDef)],
    npcs: [
      { id: 'ch12_tbl', at: [5, 1], spec: 'tb', facing: 'down' },
      { id: 'ch12_tbr', at: [10, 1], spec: 'tb', facing: 'down' }
    ]
  }, {
    marks: { luna: [8, 9], lunaSeat: [7, 7], annetteSeat: [7, 5], delphin: [4, 7], isaiah: [11, 7], judge: [9, 2], trader: [8, 9], ballot: [7, 4], wait: [5, 4] },
    patch: { samantha: samanthaDef },
    objects: [
      { id: 'ch12_throne', at: [8, 1], prop: 'throne' },
      { id: 'ch12_board', at: [7, 6], prop: 'board', solid: true, layer: 1 },
      { id: 'ch12_window2', at: [15, 3], examine: [{ think: 'Rain on the parking lot. It is always raining out of this window.' }] }
    ],
    npcs: [
      { id: 'judge', at: [9, 2], spec: 'judge', facing: 'down', visible: false },
      { id: 'trader', at: [8, 10], spec: 'trader', facing: 'up', visible: false },
      { id: 'delphin2', at: [4, 7], spec: 'delphin', facing: 'right', visible: false },
      { id: 'isaiah2', at: [11, 7], spec: 'isaiah', facing: 'left', visible: false },
      { id: 'annette2', at: [7, 5], spec: 'annette', facing: 'down', visible: false }
    ]
  });

  /* --- Columbus House, 18 years ago --- */
  var dorm = use(ROOM.dorm, {
    name: 'Columbus House: Girls\' Dorm',
    tiles: [
      '####W####W####W#####',
      '#b.b.b.b.b.b.b.b.ll#',
      '#..................#',
      '#b.b.b.b.b.b.b.b...#',
      '#..................D',
      '#b.b.b.b.b.b.b.b...#',
      '#..................#',
      '#V.......X.....u...#',
      '####################'
    ],
    spawn: [2, 6], ambient: 'drone', dark: 0.62, playerLight: 34, tint: '#101830', tintAlpha: 0.18,
    lights: [{ at: [4, 0], r: 26 }, { at: [9, 0], r: 26 }, { at: [14, 0], r: 26 }]
  }, {
    marks: { start: [2, 6], door: [18, 4] },
    npcs: [
      { id: 'salina', at: [17, 4], spec: 'salina_child', facing: 'left', talk: function (api) { return salinaDorm(api); } },
      { id: 'ch12_android', at: [8, 2], spec: 'care_android', path: [[2, 2], [16, 2], [16, 6], [2, 6]], pause: 1.2, speed: 22,
        talk: [{ narrate: 'The care android\'s red eye sweeps past you. "LIGHTS OUT WAS AT TWENTY-ONE HUNDRED. RETURN TO YOUR BUNK."' }] }
    ],
    objects: [
      { id: 'ch12_pillow', at: [1, 5], prop: 'pillow', solid: true, examine: function (api) { return packItem(api, 'photo'); } },
      { id: 'ch12_locker', at: [17, 1], examine: function (api) { return packItem(api, 'cans'); } },
      { id: 'ch12_basket', at: [9, 7], examine: function (api) { return packItem(api, 'jacket'); } },
      { id: 'ch12_dormtv', at: [1, 7], examine: [{ narrate: 'The dorm TV, off for once. Your reflection in it is fourteen and very serious.' }] }
    ]
  });

  var yard = use(ROOM.yard, {
    name: 'Columbus House: Back Yard',
    tiles: [
      '^^^^^^^^^^^^^^;^^^^^^^',
      'HHHHHHHHHHHHHH;HHHHHHH',
      '""""""""""""""""""""""',
      '""""""""""""""""""""""',
      '""""""""""""""""""""""',
      '""""""""""""""""""""""',
      '""""""""""""""""""""""',
      '""""""""""""""""""""""',
      '""""""""""""""""""""""',
      '""""""""""""""""""""""',
      '""""""""""""""""""""""',
      'BBBBBBBBBDBBBBBBBBBBBB'
    ],
    legend: { '^': 'tree', ';': 'mud', H: 'fence' },
    spawn: [9, 10], ambient: 'static', dark: 0.55, playerLight: 30, tint: '#0a1428', tintAlpha: 0.2,
    lights: [{ at: [9, 10], r: 30, flicker: true }],
    exits: [
      { id: 'to_woods', at: [14, 0], to: ROOM.woods, toAt: [1, 12], facing: 'right', if: '!ch12_dawn' },
      { id: 'to_dorm', at: [9, 11], to: ROOM.yard, locked: function () { return true; }, lockedText: [{ think: 'Not back. Not yet.' }] }
    ]
  }, {
    marks: { door: [9, 10], gap: [14, 2], delphin: [12, 6], dawnLuna: [14, 3] },
    npcs: [
      { id: 'salina_y', at: [14, 3], spec: 'salina_child', facing: 'up', visible: false },
      { id: 'delphin_teen', at: [12, 6], spec: 'delphin_teen', facing: 'up', visible: false },
      { id: 'staffer', at: [9, 10], spec: 'caseworker', facing: 'up', visible: false }
    ],
    objects: [
      { id: 'ch12_oak', at: [5, 5], prop: 'oak', solid: true, examine: [{ think: 'My reading tree. I have read every book in the donation box up there, twice. Tonight I am going to live one.' }] },
      { id: 'ch12_sensor', at: [10, 10], examine: [{ narrate: 'The door sensor blinks green. Delphin taught us: hold the latch up, count to seven, let it fall.' }] },
      { id: 'ch12_rain_y', at: [21, 10], prop: 'rain', solid: false, layer: 1 }
    ]
  });

  var closet = use(ROOM.closet, {
    name: 'The Closet Under the Stairs',
    tiles: ['####', '#..#', '#..#', '####'],
    spawn: [1, 1], ambient: 'drone', dark: 0.85, playerLight: 18
  }, {});

  /* --- the woods (procedural, deterministic) --- */
  var WOODS_PATH = [[1, 12], [4, 12], [7, 12], [10, 7], [16, 6], [20, 11], [23, 12], [26, 10]];
  var WOODS_ON = [[23, 12], [23, 20], [33, 20], [38, 17], [39, 17]];
  var WP = [[7, 12], [10, 7], [16, 6], [20, 11], [23, 12]];  // zones the player reaches
  var SALINA_AT = [[4, 12], [10, 7], [16, 6], [20, 11], [23, 12], [26, 10]];
  function buildWoods() {
    var Wd = 40, Hd = 24, grid = [], x, y, i;
    for (y = 0; y < Hd; y++) { grid.push([]); for (x = 0; x < Wd; x++) grid[y].push(';'); }
    var carved = {};
    function carve(a, b) {
      var cx = a[0], cy = a[1];
      function mark(px, py) { for (var dy = 0; dy <= 1; dy++) for (var dx = 0; dx <= 1; dx++) carved[(px + dx) + ',' + (py + dy)] = 1; carved[(px - 1) + ',' + py] = 1; }
      while (cx !== b[0]) { mark(cx, cy); cx += cx < b[0] ? 1 : -1; }
      while (cy !== b[1]) { mark(cx, cy); cy += cy < b[1] ? 1 : -1; }
      mark(cx, cy);
    }
    for (i = 0; i < WOODS_PATH.length - 1; i++) carve(WOODS_PATH[i], WOODS_PATH[i + 1]);
    for (i = 0; i < WOODS_ON.length - 1; i++) carve(WOODS_ON[i], WOODS_ON[i + 1]);
    for (y = 2; y <= 4; y++) for (x = 17; x <= 20; x++) carved[x + ',' + y] = 1;  // the tree-line clearing
    var r = rng(1212);
    for (y = 0; y < Hd; y++) for (x = 0; x < Wd; x++) {
      var edge = x === 0 || y === 0 || x === Wd - 1 || y === Hd - 1;
      if (carved[x + ',' + y] && !(edge && !(x === 39 && (y === 17 || y === 18)) && !(x === 0 && (y === 12 || y === 13)))) continue;
      if (edge || r() < 0.34) grid[y][x] = '^';
    }
    for (y = 0; y < Hd; y++) for (x = 27; x <= 28; x++) grid[y][x] = (y === 20 || y === 21) ? '=' : 'v';
    grid[12][0] = '^'; grid[13][0] = '^';
    return grid.map(function (row) { return row.join(''); });
  }
  var salinaLight = { on: false };
  var woods = {
    name: 'The Woods',
    tiles: buildWoods(),
    legend: { '^': 'tree', ';': 'mud', v: 'ravine', '=': 'log' },
    spawn: [1, 12], ambient: 'static', dark: 0.82, playerLight: 26, bg: '#020304', tint: '#0a1428', tintAlpha: 0.2,
    lights: [{ at: { get x() { var n = G.World && G.World.npc && G.World.npc('salina_w'); return n ? n.x / 16 - 0.5 : 0; }, get y() { var n = G.World && G.World.npc && G.World.npc('salina_w'); return n ? n.y / 16 - 1.2 : 0; } },
      get r() { return salinaLight.on ? 58 : 1; } }],
    npcs: [
      { id: 'salina_w', at: [3, 12], spec: 'salina_child', facing: 'right', turn: false, solid: false },
      { id: 'delphin_shadow', at: [18, 3], spec: { extends: 'delphin_teen', skin: '#0a0c10', hair: '#05060a', outfit: '#0a0c10', outfit2: '#0a0c10', eyes: '#0a0c10' }, facing: 'right', visible: false }
    ],
    zones: WP.map(function (p, i) { return { id: 'ch12_wz' + i, at: [p[0] - 1, p[1] - 1], w: 3, h: 3 }; }).concat([
      { id: 'ch12_logzone', at: [26, 19], w: 1, h: 3, once: true, run: [{ think: 'A fallen tree across the ravine. I do not look down. I do not look down.' }] }
    ]),
    objects: [{ id: 'ch12_rain_w', at: [38, 23], prop: 'rain', solid: false, layer: 1 }],
    exits: [{ id: 'to_park', at: [39, 17], h: 2, to: ROOM.park, toAt: [1, 9], facing: 'right', if: 'ch12_lostSalina' }]
  };

  /* --- Norman's abandoned park --- */
  function buildPark() {
    var Wp = 32, Hp = 18, rows = [], x, y;
    for (y = 0; y < Hp; y++) {
      var s = '';
      for (x = 0; x < Wp; x++) {
        var ch = '.';
        if (y === 0 || y === Hp - 1 || x === Wp - 1 || (x === 0 && y !== 9)) ch = '^';
        else if (x >= 27 && x <= 30 && y >= 1 && y <= 16) ch = (y === 8 && x === 27) ? 's' : 'r';
        else if (x >= 7 && x <= 9 && y >= 3 && y <= 5) ch = 'p';
        else if (x >= 15 && x <= 17 && y >= 11 && y <= 12) ch = 'p';
        else if ((x === 4 || x === 6) && y === 13) ch = 'p';
        s += ch;
      }
      rows.push(s);
    }
    return rows;
  }
  var park = {
    name: 'The Abandoned Park',
    tiles: buildPark(),
    legend: { '^': 'tree', '.': 'gravel', r: 'rail', p: 'platform', s: 'stage' },
    spawn: [1, 9], ambient: 'static', dark: 0.5, playerLight: 30, bg: '#020304', tint: '#1a1028', tintAlpha: 0.18,
    lights: [{ at: [8, 2], r: 40, flicker: true }, { at: [13, 3], r: 30, flicker: true }, { at: [24, 8], r: 46 }, { at: [16, 10], r: 30, flicker: true }, { at: [5, 12], r: 26, flicker: true }],
    npcs: [{ id: 'norman', at: [20, 8], spec: 'norman', facing: 'left', visible: false, talk: [['norman', 'Easy now, lassie. Easy.']] }],
    objects: [
      { id: 'ch12_carousel', at: [8, 5], prop: 'carousel', solid: true, examine: function (api) { return parkLook(api, 'carousel'); } },
      { id: 'ch12_tilt', at: [16, 12], prop: 'tiltawhirl', solid: true, examine: function (api) { return parkLook(api, 'tilt'); } },
      { id: 'ch12_booth1', at: [4, 13], prop: 'booth', solid: true, examine: function (api) { return parkLook(api, 'booth'); } },
      { id: 'ch12_booth2', at: [6, 13], prop: 'booth', solid: true, examine: [{ narrate: 'COTTON CAND. The Y is somewhere in the weeds.' }] },
      { id: 'ch12_speaker', at: [13, 2], prop: 'speaker', solid: true, examine: function (api) { return parkLook(api, 'music'); } },
      { id: 'ch12_lantern', at: [24, 7], prop: 'lantern', solid: true },
      { id: 'ch12_car', at: [28, 8], prop: 'car', solid: true },
      { id: 'ch12_rain_p', at: [30, 17], prop: 'rain', solid: false, layer: 1 }
    ]
  };

  /* ---------------------------------------------------------------------
   * CHECKERS: real American checkers rules + alpha-beta AI (Annette = red)
   * ------------------------------------------------------------------- */
  var CK = (function () {
    function init() { var b = []; for (var r = 0; r < 8; r++) for (var c = 0; c < 8; c++) { var v = 0; if ((r + c) % 2 === 1) { if (r < 3) v = 'r'; else if (r > 4) v = 'b'; } b.push(v); } return b; }
    function side(p) { return p ? p.toLowerCase() : 0; }
    function isKing(p) { return p === 'R' || p === 'B'; }
    function dirs(p) { if (isKing(p)) return [[1, 1], [1, -1], [-1, 1], [-1, -1]]; return p === 'r' ? [[1, 1], [1, -1]] : [[-1, 1], [-1, -1]]; }
    function kingRow(p, r) { return (p === 'r' && r === 7) || (p === 'b' && r === 0); }
    function jumpsFrom(b, sq, p, path, caps, out) {
      var r = sq >> 3, c = sq & 7, found = false;
      dirs(p).forEach(function (d) {
        var mr = r + d[0], mc = c + d[1], lr = r + 2 * d[0], lc = c + 2 * d[1];
        if (lr < 0 || lr > 7 || lc < 0 || lc > 7) return;
        var m = mr * 8 + mc, l = lr * 8 + lc;
        if (b[l] !== 0 || !b[m] || side(b[m]) === side(p) || caps.indexOf(m) >= 0) return;
        found = true;
        var crowned = !isKing(p) && kingRow(p, lr);
        var nb = b.slice(); nb[sq] = 0; nb[l] = p;
        if (crowned) out.push({ from: path[0], path: path.concat([l]), caps: caps.concat([m]) });   // crowning ends the move
        else jumpsFrom(nb, l, p, path.concat([l]), caps.concat([m]), out);
      });
      if (!found && caps.length) out.push({ from: path[0], path: path.slice(), caps: caps.slice() });
    }
    function legal(b, s) {
      var jumps = [], steps = [];
      for (var i = 0; i < 64; i++) {
        var p = b[i]; if (!p || side(p) !== s) continue;
        jumpsFrom(b, i, p, [i], [], jumps);
        if (jumps.length) continue;
        dirs(p).forEach(function (d) { var r = (i >> 3) + d[0], c = (i & 7) + d[1]; if (r < 0 || r > 7 || c < 0 || c > 7) return; var t = r * 8 + c; if (b[t] === 0) steps.push({ from: i, path: [i, t], caps: [] }); });
      }
      return jumps.length ? jumps : steps;          // captures are mandatory
    }
    function apply(b, mv) {
      var nb = b.slice(), p = nb[mv.from]; nb[mv.from] = 0;
      mv.caps.forEach(function (c) { nb[c] = 0; });
      var to = mv.path[mv.path.length - 1];
      if (!isKing(p) && kingRow(p, to >> 3)) p = p.toUpperCase();
      nb[to] = p; return nb;
    }
    function evalB(b) {
      var s = 0;
      for (var i = 0; i < 64; i++) {
        var p = b[i]; if (!p) continue;
        var r = i >> 3, c = i & 7, v = isKing(p) ? 170 : 100;
        if (!isKing(p)) v += (p === 'r' ? r : 7 - r) * 4;
        if (c >= 2 && c <= 5 && r >= 2 && r <= 5) v += 5;
        if ((p === 'r' && r === 0) || (p === 'b' && r === 7)) v += 8;   // back-row guard
        s += side(p) === 'r' ? v : -v;
      }
      return s;
    }
    function search(b, s, depth, alpha, beta) {
      var ms = legal(b, s);
      if (!ms.length) return s === 'r' ? -100000 - depth : 100000 + depth;
      if (depth <= 0) return evalB(b);
      var i, v, best;
      if (s === 'r') { best = -1e9; for (i = 0; i < ms.length; i++) { v = search(apply(b, ms[i]), 'b', depth - 1, alpha, beta); if (v > best) best = v; if (best > alpha) alpha = best; if (alpha >= beta) break; } return best; }
      best = 1e9; for (i = 0; i < ms.length; i++) { v = search(apply(b, ms[i]), 'r', depth - 1, alpha, beta); if (v < best) best = v; if (best < beta) beta = best; if (alpha >= beta) break; } return best;
    }
    function aiMove(b, depth, rand) {
      var ms = legal(b, 'r'); if (!ms.length) return null;
      var best = null, bv = -1e12;
      ms.forEach(function (m) { var v = search(apply(b, m), 'b', depth - 1, -1e9, 1e9) + rand() * 7; if (v > bv) { bv = v; best = m; } });
      return best;
    }
    function count(b, s) { var n = 0; for (var i = 0; i < 64; i++) if (b[i] && side(b[i]) === s) n++; return n; }
    return { init: init, legal: legal, apply: apply, aiMove: aiMove, count: count, isKing: isKing, side: side };
  })();

  function newCheckersState() { return { b: CK.init(), turn: 'r', redMoves: 0, quiet: 0, last: null, taunted: [], plies: 0 }; }

  var checkersGame = {
    autoSolve: function () { return { success: false, done: true, winner: 'r', reason: 'auto' }; },
    start: function (ctx) {
      var R = ctx.R, P = ctx.PAL, inp = ctx.input, p = ctx.params || {};
      var st = p.state || newCheckersState();
      var pauseAt = p.pauseAt || [];
      var rand = rng(7 + st.plies * 31);
      var SQ = 21, BX = Math.round((ctx.W - SQ * 8) / 2), BY = 26;
      var cursor = 5 * 8 + 0, sel = null, prefix = [], moves = null, msg = '', msgT = 0;
      var aiT = 0, clock = 45, flash = 0;
      function sqXY(i) { return { x: BX + (i & 7) * SQ, y: BY + (i >> 3) * SQ }; }
      // the cursor starts on a movable piece
      function refresh() { moves = CK.legal(st.b, 'b'); if (moves.length && !sel) cursor = moves[0].from; }
      if (st.turn === 'b') refresh();
      return new Promise(function (resolve) {
        var done = false;
        function finish(res) { if (done) return; done = true; res.state = st; resolve(res); }
        function endCheck() {
          var side = st.turn;
          if (!CK.legal(st.b, side).length) { finish({ success: side === 'r', done: true, winner: side === 'r' ? 'b' : 'r', reason: CK.count(st.b, side) ? 'blocked' : 'captured' }); return true; }
          if (st.quiet >= 50) { finish({ success: false, done: true, winner: 'draw', reason: 'stall' }); return true; }
          return false;
        }
        function doMove(mv, who) {
          st.b = CK.apply(st.b, mv); st.last = mv; st.plies++;
          st.quiet = mv.caps.length ? 0 : st.quiet + 1;
          ctx.sound(mv.caps.length ? 'hit' : 'blip');
          if (mv.caps.length) flash = 0.25;
          st.turn = who === 'r' ? 'b' : 'r';
          sel = null; prefix = []; clock = 45;
          if (who === 'r') {
            st.redMoves++;
            if (endCheck()) return;
            if (pauseAt.indexOf(st.redMoves) >= 0 && st.taunted.indexOf(st.redMoves) < 0) { st.taunted.push(st.redMoves); finish({ success: false, done: false, pause: st.redMoves }); return; }
            refresh();
          } else { aiT = 0; endCheck(); }
        }
        ctx.loop(function update(dt) {
          if (done) return;
          if (msgT > 0) msgT -= dt;
          if (flash > 0) flash -= dt;
          if (st.turn === 'r') {
            aiT += dt;
            if (aiT > 0.75) { var mv = CK.aiMove(st.b, 5, rand); if (!mv) { endCheck(); return; } doMove(mv, 'r'); }
            return;
          }
          if (!moves) refresh();
          clock -= dt;
          if (clock <= 0) { var auto = moves[Math.floor(rand() * moves.length)]; msg = 'The clock runs out. Your hand moves before your mind does.'; msgT = 2.5; ctx.sound('buzzer'); doMove(auto, 'b'); return; }
          var r0 = cursor >> 3, c0 = cursor & 7;
          if (inp.pressed('left')) c0 = Math.max(0, c0 - 1);
          if (inp.pressed('right')) c0 = Math.min(7, c0 + 1);
          if (inp.pressed('up')) r0 = Math.max(0, r0 - 1);
          if (inp.pressed('down')) r0 = Math.min(7, r0 + 1);
          if (r0 * 8 + c0 !== cursor) { cursor = r0 * 8 + c0; ctx.sound('blip'); }
          if (inp.pressed('back') || inp.pressed('tab')) { if (prefix.length <= 1) { sel = null; prefix = []; } }
          if (inp.pressed('ok')) {
            if (sel === null) {
              if (moves.some(function (m) { return m.from === cursor; })) { sel = cursor; prefix = [cursor]; ctx.sound('select'); }
              else { ctx.sound('buzzer'); msg = moves.length && moves[0].caps.length ? 'You must jump. A capture is on the board.' : 'That piece has no move.'; msgT = 1.8; }
            } else if (cursor === sel && prefix.length === 1) { sel = null; prefix = []; ctx.sound('cancel'); }
            else {
              var cands = moves.filter(function (m) { if (m.path.length <= prefix.length) return false; for (var k = 0; k < prefix.length; k++) if (m.path[k] !== prefix[k]) return false; return m.path[prefix.length] === cursor; });
              if (!cands.length) {
                if (prefix.length === 1 && moves.some(function (m) { return m.from === cursor; })) { sel = cursor; prefix = [cursor]; ctx.sound('select'); }
                else { ctx.sound('buzzer'); msg = prefix.length > 1 ? 'Keep jumping. The same piece must finish the capture.' : 'Not a legal square.'; msgT = 1.8; }
              } else {
                prefix.push(cursor);
                var full = cands.filter(function (m) { return m.path.length === prefix.length; });
                if (full.length) doMove(full[0], 'b'); else ctx.sound('select');
              }
            }
          }
        }, function draw(t) {
          R.rect(0, 0, ctx.W, ctx.H, '#140808');
          R.rect(0, 0, ctx.W, ctx.H, '#3a0a0a', 0.35);
          ctx.header('CHECKERS: THE TIEBREAK', 'Annette (red) vs Luna (black)');
          var g = R.ctx;
          R.rect(BX - 4, BY - 4, SQ * 8 + 8, SQ * 8 + 8, '#4a2a18');
          R.rect(BX - 2, BY - 2, SQ * 8 + 4, SQ * 8 + 4, '#1a0e08');
          var legalTo = {};
          if (st.turn === 'b' && moves) {
            moves.forEach(function (m) {
              var ok = m.path.length > prefix.length; for (var k = 0; k < prefix.length && ok; k++) if (m.path[k] !== prefix[k]) ok = false;
              if (ok && prefix.length) legalTo[m.path[prefix.length]] = 1;
            });
          }
          for (var i = 0; i < 64; i++) {
            var q = sqXY(i), dark = ((i >> 3) + (i & 7)) % 2 === 1;
            R.rect(q.x, q.y, SQ, SQ, dark ? '#5a2a20' : '#d8c4a0');
            if (st.last && (st.last.from === i || st.last.path[st.last.path.length - 1] === i)) R.rect(q.x, q.y, SQ, SQ, '#e8c15a', 0.22);
            if (legalTo[i]) { R.rect(q.x + 8, q.y + 8, 5, 5, '#b6f24a', 0.85); }
            var pc = st.b[i];
            if (pc) {
              var cx = q.x + SQ / 2, cy = q.y + SQ / 2, red = CK.side(pc) === 'r';
              g.fillStyle = 'rgba(0,0,0,0.5)'; g.beginPath(); g.arc(cx + 1, cy + 1.5, 8, 0, Math.PI * 2); g.fill();
              g.fillStyle = red ? '#c8323c' : '#1c1c24'; g.beginPath(); g.arc(cx, cy, 8, 0, Math.PI * 2); g.fill();
              g.strokeStyle = red ? '#ff7a7a' : '#6a6a7a'; g.lineWidth = 1; g.beginPath(); g.arc(cx, cy, 5.5, 0, Math.PI * 2); g.stroke();
              if (CK.isKing(pc)) { g.fillStyle = '#e8c15a'; g.fillRect(cx - 4, cy - 2, 8, 4); g.fillRect(cx - 4, cy - 4, 2, 2); g.fillRect(cx - 1, cy - 5, 2, 3); g.fillRect(cx + 2, cy - 4, 2, 2); }
              if (sel === i) { g.strokeStyle = '#b6f24a'; g.lineWidth = 1.5; g.beginPath(); g.arc(cx, cy, 9.5, 0, Math.PI * 2); g.stroke(); }
            }
          }
          if (st.turn === 'b') { var cq = sqXY(cursor); var pulse = 0.6 + 0.4 * Math.sin(t * 8); g.strokeStyle = 'rgba(242,179,61,' + pulse + ')'; g.lineWidth = 2; g.strokeRect(cq.x + 1, cq.y + 1, SQ - 2, SQ - 2); }
          if (flash > 0) R.rect(BX, BY, SQ * 8, SQ * 8, '#fff', flash);
          // side panels
          var pw = 84;
          R.panel(8, 30, pw, 92, { accent: '#c8323c' });
          R.img(ctx.portrait('annette', st.turn === 'r' ? 'smug' : 'neutral'), 8 + (pw - 48) / 2, 36, 1);
          R.text('ANNETTE', 8 + pw / 2, 88, { size: 8, align: 'center', color: '#ff8a8a' });
          R.text('pieces ' + CK.count(st.b, 'r'), 8 + pw / 2, 100, { size: 7, align: 'center', color: P.dim });
          if (st.turn === 'r') R.text('thinking' + '...'.slice(0, 1 + Math.floor(t * 3) % 3), 8 + pw / 2, 110, { size: 7, align: 'center', color: P.amber });
          var rx = ctx.W - 8 - pw;
          R.panel(rx, 30, pw, 92, { accent: '#6c8cff' });
          R.img(ctx.portrait('luna', st.turn === 'b' ? 'neutral' : 'tired'), rx + (pw - 48) / 2, 36, 1);
          R.text('LUNA', rx + pw / 2, 88, { size: 8, align: 'center', color: '#9fb8ff' });
          R.text('pieces ' + CK.count(st.b, 'b'), rx + pw / 2, 100, { size: 7, align: 'center', color: P.dim });
          if (st.turn === 'b') R.text('clock ' + Math.max(0, Math.ceil(clock)), rx + pw / 2, 110, { size: 8, align: 'center', color: clock < 10 ? P.red : P.text });
          R.panel(8, 128, pw, 62, { accent: false, alpha: 0.7 });
          R.wrap('Red moves first. Captures are mandatory; keep jumping with the same piece. Reach the far row to crown a king.', pw - 10, 6, 'sans', '').forEach(function (ln, j) { R.text(ln, 13, 132 + j * 8, { size: 6, font: 'sans', style: '', color: P.dim }); });
          if (msgT > 0 && msg) { R.panel(BX - 10, BY + SQ * 8 - 26, SQ * 8 + 20, 18, { accent: P.amber }); R.text(msg, ctx.W / 2, BY + SQ * 8 - 21, { size: 7, align: 'center', color: P.amber }); }
          ctx.footer('ARROWS move   SPACE select / move   BACKSPACE cancel');
        });
      });
    }
  };

  /* ---------------------------------------------------------------------
   * COASTER: rail QTE (lean with the curves; the photo is always lost)
   * ------------------------------------------------------------------- */
  var coasterGame = {
    autoSolve: function () { return { success: true, hits: 3, misses: 0, photoLost: true }; },
    start: function (ctx) {
      var R = ctx.R, P = ctx.PAL, inp = ctx.input;
      var KEYS = [[3.2, 'left'], [5.6, 'right'], [8.0, 'left']], WIN = 1.1, DUR = 16.5;
      var hits = 0, misses = 0, prompt = null, shake = 0, shreds = [], grip = 0, gripStart = 10.6, dropAt = 12.2;
      var pts = [[0, 168], [40, 150], [80, 165], [120, 128], [160, 150], [200, 110], [240, 132], [270, 46], [292, 40], [300, 44], [330, 196], [360, 150], [384, 160]];
      function trackY(x) { for (var i = 0; i < pts.length - 1; i++) { var a = pts[i], b = pts[i + 1]; if (x >= a[0] && x <= b[0]) { var u = (x - a[0]) / (b[0] - a[0]); u = u * u * (3 - 2 * u); return a[1] + (b[1] - a[1]) * u; } } return 160; }
      function cartX(t) {
        if (t < 10.4) return 20 + (270 - 20) * (t / 10.4);
        if (t < dropAt) return 270 + 26 * ((t - 10.4) / (dropAt - 10.4));
        var u = Math.min(1, (t - dropAt) / 2.6); return 296 + (380 - 296) * u * u;
      }
      return new Promise(function (resolve) {
        var done = false;
        ctx.loop(function update(dt) {
          var t = ctx.t;
          if (shake > 0) shake -= dt;
          KEYS.forEach(function (k) { if (!k.done && t >= k[0]) { k.done = true; prompt = { dir: k[1], t0: t }; } });
          if (prompt) {
            var ans = ['left', 'right', 'up', 'down'].filter(function (d) { return inp.pressed(d); })[0];
            if (ans) { if (ans === prompt.dir) { hits++; ctx.sound('hit'); } else { misses++; shake = 0.4; ctx.sound('miss'); } prompt = null; }
            else if (t - prompt.t0 > WIN) { misses++; shake = 0.4; ctx.sound('miss'); prompt = null; }
          }
          if (t > gripStart && t < dropAt && inp.pressed('ok')) { grip = Math.min(1, grip + 0.12); ctx.sound('blip'); }
          if (t >= dropAt && !shreds.length) {
            ctx.sound('fail'); shake = 0.8;
            for (var i = 0; i < 14; i++) shreds.push({ x: cartX(t), y: trackY(cartX(t)) - 14, vx: -20 + Math.random() * 60, vy: -40 - Math.random() * 50, r: Math.random() * 6 });
          }
          shreds.forEach(function (s) { s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 60 * dt; s.r += dt * 6; });
          if (t > DUR && !done) { done = true; resolve({ success: true, hits: hits, misses: misses, grip: grip, photoLost: true }); }
        }, function draw(t) {
          var ox = shake > 0 ? (Math.random() * 2 - 1) * 3 : 0, oy = shake > 0 ? (Math.random() * 2 - 1) * 3 : 0;
          var g = R.ctx;
          var sky = g.createLinearGradient(0, 0, 0, ctx.H); sky.addColorStop(0, '#05060e'); sky.addColorStop(1, '#1a1830');
          g.fillStyle = sky; g.fillRect(0, 0, ctx.W, ctx.H);
          g.save(); g.translate(ox, oy);
          g.fillStyle = '#0a0f0a'; for (var i = 0; i < 20; i++) { var tx = i * 21 - 4; g.beginPath(); g.moveTo(tx, 200); g.lineTo(tx + 10, 150 + (i * 37 % 30)); g.lineTo(tx + 20, 200); g.fill(); }
          g.strokeStyle = '#3a2420'; g.lineWidth = 1;
          for (var x = 0; x <= 384; x += 12) { g.beginPath(); g.moveTo(x, trackY(x)); g.lineTo(x, 216); g.stroke(); }
          g.strokeStyle = '#8a5a48'; g.lineWidth = 2; g.beginPath(); for (x = 0; x <= 384; x += 3) { if (x === 0) g.moveTo(x, trackY(x)); else g.lineTo(x, trackY(x)); } g.stroke();
          g.fillStyle = '#e8c15a'; g.fillRect(14, 150, 22, 16); g.fillStyle = '#2a2018'; g.fillRect(18, 154, 14, 6);   // Norman's booth
          var cx = cartX(t), cy = trackY(cx);
          var ang = Math.atan2(trackY(cx + 3) - trackY(cx - 3), 6);
          g.save(); g.translate(cx, cy); g.rotate(ang);
          var spr = ctx.sprite('luna_teen', 'right', 0); g.imageSmoothingEnabled = false; g.drawImage(spr, -8, -spr.height + 2);
          g.fillStyle = '#b8202a'; g.fillRect(-12, -8, 24, 9); g.fillStyle = '#e8c15a'; g.fillRect(-12, -8, 24, 2);
          if (t < dropAt) { g.fillStyle = '#f2ede0'; g.fillRect(4, -16, 6, 5); }  // the photo, in her hand
          g.restore();
          shreds.forEach(function (s) { g.save(); g.translate(s.x, s.y); g.rotate(s.r); g.fillStyle = '#f2ede0'; g.fillRect(-2, -1.5, 4, 3); g.restore(); });
          g.restore();
          drawRainUI(g, t);
          ctx.header('THE COASTER', 'Leans ' + hits + '/' + KEYS.length);
          if (prompt) {
            var left = Math.max(0, WIN - (t - prompt.t0));
            R.panel(ctx.W / 2 - 60, 40, 120, 34, { accent: P.amber });
            R.text('LEAN ' + ({ left: '←', right: '→', up: '↑', down: '↓' })[prompt.dir], ctx.W / 2, 46, { size: 14, align: 'center', color: P.amber });
            R.rect(ctx.W / 2 - 50, 66, 100 * left / WIN, 3, P.amber);
          }
          if (t < 2.5) R.text('Lean into the curves with the ARROW keys.', ctx.W / 2, 84, { size: 8, align: 'center', color: P.text, alpha: Math.min(1, 2.5 - t) });
          if (t > gripStart && t < dropAt) {
            R.panel(ctx.W / 2 - 92, 40, 184, 40, { accent: P.red });
            R.text('THE TOP. HOLD ON TO THE PHOTO.', ctx.W / 2, 45, { size: 9, align: 'center', color: '#fff' });
            R.text('mash SPACE', ctx.W / 2, 58, { size: 7, align: 'center', color: P.dim });
            R.rect(ctx.W / 2 - 60, 69, 120, 5, '#333'); R.rect(ctx.W / 2 - 60, 69, 120 * grip, 5, P.neon);
          }
          if (t >= dropAt && t < dropAt + 3.6) R.text('The photo tears loose. The spokes take it.', ctx.W / 2, 50, { size: 9, align: 'center', color: '#f2ede0', font: 'serif', style: 'italic' });
          ctx.footer('ARROWS lean   SPACE hold on');
        });
      });
    }
  };
  function drawRainUI(g, t) {
    g.save(); g.strokeStyle = 'rgba(170,190,235,0.3)'; g.lineWidth = 0.7; g.beginPath();
    for (var i = 0; i < 90; i++) { var sp = 1 + (i % 5) * 0.14; var sx = ((i * 53.7 + t * 30 * sp) % (G.W + 40)) - 20, sy = ((i * 97.3 + t * 300 * sp) % (G.H + 30)) - 15; g.moveTo(sx, sy); g.lineTo(sx - 2, sy + 7); }
    g.stroke(); g.restore();
  }

  /* ---------------------------------------------------------------------
   * Sounds (registered at chapter start, not at load)
   * ------------------------------------------------------------------- */
  function registerSounds() {
    var A = G.Audio && G.Audio.custom; if (!A) return;
    A['ch12:thunder'] = function (t) { t.noise(1.6, 0.35, 260, { type: 'lowpass' }); t.tone('sine', 48, 1.4, 0.2, { slide: 30 }); };
    A['ch12:calliope'] = function (t) {
      var notes = [392, 523, 659, 523, 587, 494, 392, 440, 523, 392];
      notes.forEach(function (f, i) { t.tone('triangle', f, 0.24, 0.06, { delay: i * 0.27 }); t.tone('square', f / 2, 0.12, 0.02, { delay: i * 0.27 }); });
    };
    A['ch12:slap'] = function (t) { t.noise(0.08, 0.5, 3000, { type: 'highpass' }); };
  }
  async function thunder(api, big) {
    api.sound('ch12:thunder');
    api.flash('#dfe8ff', big ? 380 : 220);
    if (big) await api.shake(400, 3);
  }

  /* ---------------------------------------------------------------------
   * Entity handlers (free roam)
   * ------------------------------------------------------------------- */
  async function medicTalk(api) {
    await api.say('medic', 'Twenty minutes, Miss Bartley. Then I start picking out a good rock.', { mood: 'tired' });
  }

  async function delphinTalk(api) {
    var ph = api.get('ch12_phase');
    if (ph === 'hub') return hubDelphinVisit(api);
    await api.say('delphin', "Don't hover, red. It makes my leg nervous.", { mood: 'smug' });
  }

  async function annetteTalk(api) {
    if (api.get('ch12_phase') === 'hub') {
      await api.say('annette', 'Luna, dear. Come and sit. My needles could use the company.', { mood: 'happy' });
      await api.think('Not a chance. I back out of the room like a little kid peering round corners.');
      return;
    }
    await api.say('annette', 'Hello, dear.', { mood: 'happy' });
  }

  async function isaiahAvoid(api) {
    if (api.get('ch12_isaiahTried')) { await api.think('He turns a page he has not read.'); return; }
    api.set('ch12_isaiahTried', true);
    await api.say('luna', 'Isaiah. About Kessie. About what she said at the end.');
    await api.say('isaiah', "I can't. Not right now.", { mood: 'sad' });
    await api.narrate('He closes his book on his finger and leaves by the long way round, so he never has to pass me.');
    await api.think('Either he is avoiding me, likely, or he just happens to never be in the same room as me. Less likely.');
  }

  async function packItem(api, what) {
    var key = 'ch12_pack_' + what;
    if (api.get(key)) { await api.think('Already packed.'); return; }
    api.set(key, true);
    if (what === 'photo') {
      await api.narrate('Under the pillow: the last picture of my parents. Arm in arm, smiling like they had no idea their life was about to come to an abrupt end.');
      await api.think('It goes in my shirt pocket. Closest to me.');
    } else if (what === 'cans') {
      await api.narrate('In the locker, behind the winter socks: two cans of beans, snatched from the kitchen when chef\'s back was turned. Months of squirrelling.');
    } else {
      await api.narrate('The donation basket. A threadbare jacket, strings begging to be snipped. I got to it before any of the older girls staked their claim.');
    }
    api.sound('confirm');
  }

  async function salinaDorm(api) {
    if (!api.get('ch12_pack_photo') || !api.get('ch12_pack_cans') || !api.get('ch12_pack_jacket')) {
      await api.say('salina_child', 'Pack first, Luna! Photo, food, jacket. I already did mine. Twice.', { mood: 'happy' });
      return;
    }
    api.set('ch12_readyToGo', true);
  }

  var PARK_LINES = {
    carousel: [{ narrate: 'A carousel with all the horses drowning in moss. One of them still has a painted smile.' }],
    tilt: [{ narrate: 'A Tilt-a-Whirl tilted all the way down, seats overflowing with trash and cotton.' }],
    booth: [{ narrate: 'Snack booths scribbled all over and torn apart, the parts scattered around like a shrine.' }],
    music: [{ narrate: 'The speaker crackles. Music, somehow. The sweet sounding chords that pulled me through the rain.' }, { sound: 'ch12:calliope' }]
  };
  async function parkLook(api, what) {
    await api.run(PARK_LINES[what]);
    api.set('ch12_park_' + what, true);
  }

  async function bopSamantha(api) {
    var n = api.add('ch12_bops', 1);
    var o = G.World.find('samantha');
    if (n === 1) {
      if (o) o.bob = 2;
      await api.narrate('For reasons I could not articulate, I reach out and bop Samantha on the head. She bobs back and forth like she is rocking herself.');
      await api.wait(500); if (o) o.bob = 0;
    } else if (n === 2) {
      if (o) o.bob = 4;
      await api.narrate('I chuckle and do it again. Then again, harder.');
      await api.wait(400); if (o) o.bob = 0;
    } else {
      api.sound('hit'); await api.shake(350, 3);
      await api.narrate('Samantha shoots forward, her head slamming against the floor before popping back up.');
    }
  }

  async function luxuryBed(api) {
    if (api.get('ch12_luxurySlept')) { await api.think('Silk. Real silk.'); return; }
    api.set('ch12_luxurySlept', true);
  }

  /* --- quiet-week hub activities --- */
  var STORIES = [
    { id: 'wall', label: 'The scribbled bathroom wall', lines: [
      'So Waverly, when she was four, takes a purple crayon to our entire bathroom wall. Floor to ceiling.',
      'And when I find it, she does not cry. She tapes a drawing over the worst of it. The two of us, holding hands. Then she says "There. Now it\'s art."'] },
    { id: 'duck', label: 'Feeding her lunch to a duck', lines: [
      'We had a picnic once. Real grass. Waverly takes her whole food allowance and tries to feed it to a passing duck.',
      'Boy, was I mad. We were always hurting for food, and here she was wasting it on an animal so stupid it honked. She said the duck looked hungrier than us.'] },
    { id: 'soap', label: 'The soap in the bath', lines: [
      'Waverly decided one winter that soap was a fish. She would not take a bath until it had a name.',
      'Its name was Captain. Captain lived for nine days. Waverly held a funeral when the last sliver went down the drain, and I had to give a eulogy.'] }
  ];
  async function storyCamera(api) {
    if (api.get('ch12_phase') !== 'hub') { await api.think('A camera in the corner. Of course.'); return; }
    if (api.get('ch12_slotUsed')) { await api.think('Not again today. Even I can hear when I am performing.'); return; }
    var left = STORIES.filter(function (s) { return !api.get('ch12_story_' + s.id); });
    if (!left.length) { await api.think('I have told them all my best ones. The rest are just mine.'); return; }
    api.onAir(true); api.approval(true);
    await api.narrate('I make breakfast and talk to the empty corner where I think a camera is. Not about missing her. That is old news.');
    var opts = left.map(function (s) { return s.label; });
    var i = await api.choice(opts, { prompt: 'Tell the cameras a Waverly story' });
    var s = left[i];
    api.set('ch12_story_' + s.id, true);
    for (var k = 0; k < s.lines.length; k++) await api.say('luna', s.lines[k], { mood: k ? 'happy' : 'neutral' });
    api.approvalAdd(5);
    api.add('ch12_storiesTold', 1);
    await api.think(api.get('ch12_storiesTold') === 1
      ? 'I hoped it would endear me to the viewers. It does something else too. It makes me feel closer to myself.'
      : 'Since the night I slipped out to the clinic I have called myself a terrible mother. Telling these, I remember: I was doing the best I could.');
    api.onAir(false);
    api.set('ch12_slotUsed', true);
  }

  async function arcadeGallery(api) {
    if (api.get('ch12_phase') !== 'hub' || api.get('ch12_slotUsed')) { await api.narrate('A shooting booth. The targets read: I OPPOSE THE GREAT LEADER.'); return; }
    api.onAir(true); api.approval(true);
    await api.narrate('The propaganda shooting booth. Cardboard citizens pop up holding signs: I OPPOSE THE GREAT LEADER.');
    await api.think('Add a little flavour, Luna. They are watching how you play.');
    var r = await api.minigame('qte', { mode: 'timing', title: 'PATRIOT GALLERY', prompt: 'Hit the dissenters. Smile while you do it.', rounds: 3, need: 2 });
    if (r.success) { api.approvalAdd(3); await api.think('A bell rings. A recorded voice says "Patriotism pays!" I feel sick and I keep smiling.'); }
    else { api.approvalAdd(-1); await api.think('I miss. Maybe on purpose. I will never know.'); }
    api.onAir(false);
    api.set('ch12_slotUsed', true);
  }

  async function hubDelphinVisit(api) {
    if (api.get('ch12_slotUsed')) { await api.say('medic', 'One hour a day. You have had your hour.', { mood: 'angry' }); return; }
    var n = api.add('ch12_visits', 1);
    if (n === 1) {
      await api.say('delphin', "I swear I'm fine to leave. This bastard is refusing to discharge me because he knows it pisses me off.", { mood: 'angry' });
      await api.say('luna', 'Probably for the best.');
      await api.narrate('I pass him the book he asked for yesterday.');
      await api.say('delphin', 'Look at what I\'ve become. Reading a book for entertainment. Is there anything more depressing?', { mood: 'tired' });
      await api.narrate('He flips through the pages dramatically and stops on one, eyebrows raised.');
      await api.say('delphin', 'Whoa. This dude is a serious fighter.', { mood: 'shock' });
      await api.say('luna', 'I thought books weren\'t entertaining.');
      await api.say('delphin', 'Exceptions can be made for true art in any field.', { mood: 'smug' });
    } else {
      await api.say('delphin', 'Red. Tell me something that isn\'t about this place.', { mood: 'tired' });
      await api.say('luna', 'Salina used to put her bunny in your bunk when you had nightmares. You thought it was the staff.');
      await api.say('delphin', '...It was her? That little sneak.', { mood: 'sad' });
      await api.narrate('He laughs until it turns into something else, and I pretend not to notice.');
    }
    api.set('m_delphin', Math.min(100, api.get('m_delphin', 15) + 3));
    api.set('ch12_slotUsed', true);
  }

  /* ---------------------------------------------------------------------
   * CHAPTER
   * ------------------------------------------------------------------- */
  var maps = {};
  maps[ROOM.lunaRoom] = lunaRoom; maps[ROOM.hall] = hall; maps[ROOM.infirmary] = infirmary;
  maps[ROOM.redHall] = redHall; maps[ROOM.lounge] = lounge; maps[ROOM.kitchen] = kitchen;
  maps[ROOM.arcade] = arcade; maps[ROOM.library] = library; maps[ROOM.luxury] = luxury;
  maps[ROOM.doll] = dollRoom; maps[ROOM.dorm] = dorm; maps[ROOM.yard] = yard; maps[ROOM.closet] = closet;
  maps[ROOM.woods] = woods; maps[ROOM.park] = park;

  G.registerChapter({
    id: CH,
    title: 'The Night in the Rain',
    kicker: 'WEEK 4',
    maps: maps,
    tiles: TILES,
    props: PROPS,
    minigames: { checkers: checkersGame, coaster: coasterGame },
    cast: {
      medic: { name: 'Medic', hairStyle: 'short', outfit: '#6a9a9a', outfit2: '#6a9a9a', style: 'uniform' }
    },
    testDefaults: {
      m_audience: 40, m_delphin: 15, m_isaiah: 30, m_annette: 40,
      f_luxury_used: false, f_attacked_annette: true, f_carried_delphin: true, f_kessie_secret_told: true
    },

    start: async function (api) {
      registerSounds();
      await partWake(api);
      await partInfirmary(api);
      await partFlashback(api);
      await partSecret(api);
      await partAnnette(api);
      await partQuietWeek(api);
      await partDollRoom(api);
      await partCheckers(api);
      await partEnding(api);
      api.completeChapter();
    }
  });

  /* ======================= 1. WAKE (Tue 30 Jan) ======================== */
  async function partWake(api) {
    api.set('ch12_phase', 'tuesday');
    api.setPlayer('luna');
    await api.goRoom(ROOM.lunaRoom, { at: mk(ROOM.lunaRoom, 'wake', [6, 3]), facing: 'down', fade: false });
    await api.titleCard('Tuesday, 30 January', 'The morning after the Maze');
    await api.narrate('I wake up in my room at the mansion, soaked in sweat. I pray for unconsciousness to swallow me again, and jolt upright at Ginerva\'s customary one knock and door opening.');
    api.addNpc({ id: 'ginerva', at: mk(ROOM.lunaRoom, 'ginerva', [4, 6]), spec: 'ginerva', facing: 'up' });
    await api.say('luna', 'You know, you really could wait a minute after knocking before you walk into someone\'s room.', { mood: 'tired' });
    await api.say('ginerva', 'Criminals such as yourself have no right to privacy. Had you not been taken on by this generous organization, you would be in a cell with a public-facing lavatory and no door to close at all.');
    await api.think('Nothing like a little moral philosophy right after waking up. My head is fuzz, glued on tight.');
    await api.say('ginerva', 'I am in need of your assistance. Your ally requires medical intervention and is ostentatiously refusing treatment. You will need to talk some sense into him.');
    await api.say('luna', 'Delphin? What happened to him?', { mood: 'shock' });
    await api.think('Images come through the fog. Me kicking the door down. Delphin shattering a vase. The screaming, the videos, the rooms dedicated to crimes.');
    var c = await api.choice([
      'You drugged us, didn\'t you? Is that even allowed?',
      'You\'re sick. All of you. This is just an excuse to torture people.',
      '(Say nothing. Get out of bed.)'
    ]);
    if (c === 0) {
      await api.say('luna', 'That\'s why my head is all messed up and why I can\'t remember getting back here last night.', { mood: 'angry' });
      await api.narrate('I know it\'s a stupid question as soon as I ask it. Ginerva blows a noisy breath through pursed lips.');
    } else if (c === 1) {
      await api.say('luna', 'You\'re sick. All of you.', { mood: 'angry' });
      await api.narrate('Her foot taps the floor. I have never seen her so flustered.');
    }
    await api.say('ginerva', 'Mr. Neutrino is waiting in the infirmary. Follow or do not, but failure to do so may result in his rapid degradation.');
    api.remove('ginerva');
    await api.think('My ankle still throbs, but I can put weight on it. Still in yesterday\'s jeans. Someone tucked the covers up to my chin. I shudder.');
    api.objective('Go to the infirmary (west end of the bedroom hall)');
    await api.waitForRoom(ROOM.infirmary);
    api.objective(null);
  }

  /* ======================= 2. INFIRMARY ================================ */
  async function partInfirmary(api) {
    await api.narrate('The infirmary is coated in the heavy smell of antiseptic. Prison-style cots line the floor. More cots than the number of people we started out with.');
    await api.think('What do they use this mansion for when there is no show? I don\'t want to know.');
    api.lockPlayer();
    api.face('medic', 'player');
    await api.say('medic', 'There. Your compatriot has arrived. He needs stitches, and if he continues to cause a ruckus, I won\'t hesitate to knock him out beforehand.', { mood: 'angry' });
    await api.say('delphin', 'So why don\'t you just do it then, asshole?', { mood: 'smug' });
    await api.say('delphin', 'You can\'t, can you? Not after that last trip you took us on. Too much anesthetic. Not good for the growing mind.');
    await api.say('medic', 'Oh, I think you\'ll find there are ways to put patients to sleep that require no anesthetic at all.', { mood: 'tired' });
    await api.say('medic', 'Twenty minutes. Then I start picking out a good rock.');
    api.set('ch12_medicOut', true);
    api.remove('medic');
    api.unlockPlayer();
    api.objective('Talk to Delphin');
    await api.waitForInteract('delphin');
    api.objective(null);
    await api.say('delphin', 'Well hey there red. Have you come to witness my grand debut as the one legged wonder?', { mood: 'smug' });
    await api.say('delphin', 'Feel free to make yourself comfortable. As usual, no expense has been spared. It\'s so luxurious, we\'re drowning in it.');
    await api.say('luna', 'What are you doing, dude? Why not just let the guy stitch you up?');
    await api.say('delphin', 'No one from DPE is going to touch me while I\'m capable of preventing it. That\'s a guarantee.', { mood: 'angry' });
    var tries = 0, opened = false;
    var pitch = [
      { text: 'This is free health care. You know how many people need that?', reply: ['Truly a once in a lifetime opportunity, given that said lifetime is quite limited.', 'tired'] },
      { text: 'You could win the whole thing.', reply: ['Oh, please. You\'ve done your civic duty. Now leave me to rot in peace.', 'angry'] },
      { text: 'Tell me about your sister.', open: true }
    ];
    while (!opened) {
      var avail = pitch.filter(function (p) { return !p.used; });
      var idx = await api.choice(avail.map(function (p) { return p.text; }), { autoPick: avail.length - 1 });
      var pick = avail[idx]; pick.used = true;
      if (pick.open) { opened = true; break; }
      await api.say('luna', pick.text);
      await api.say('delphin', pick.reply[0], { mood: pick.reply[1] });
      if (++tries === 2) await api.think('He has his back to me now. Twenty minutes. I hate what I\'m about to do to him, but it might be the only thing he\'ll listen to.');
    }
    await api.say('luna', 'Tell me about your sister.');
    await api.say('delphin', 'Whatever do you wish to talk about? Perhaps your own wounds. The one in your leg or the one in your heart.', { mood: 'smug' });
    await api.say('luna', 'What happened to her?');
    await api.narrate('His head drops. When he answers, his voice is stripped of its usual bravado.');
    await api.say('delphin', 'She was twelve. We\'d been in the group home her whole life and most of mine. She used to have this stupid stuffed bunny that she loved so much. Carried it everywhere until it practically had stuffing dripping out its eyes.', { mood: 'sad' });
    // topics: the bunny, the raincoat, that night
    var topics = [
      { id: 'bunny', text: 'The bunny.' },
      { id: 'coat', text: 'Her yellow raincoat.' },
      { id: 'night', text: 'That night.' }
    ];
    while (true) {
      var left = topics.filter(function (t) { return !t.used; });
      var ti = await api.choice(left.map(function (t) { return t.text; }), { prompt: 'Talk about Salina' });
      var tp = left[ti]; tp.used = true;
      if (tp.id === 'bunny') {
        await api.narrate('He pulls up the leg of his tattered pants. On his calf: a cartoonish bunny with wide, innocent eyes.');
        await api.say('delphin', 'I got this for her. Stole the money to pay for it, but it was worth it. She thought it was the coolest thing ever.', { mood: 'sad' });
        await api.say('luna', 'She must\'ve loved it.');
        await api.say('delphin', 'They found her in the woods a week later. Still holding that goddamn bunny.', { mood: 'cry' });
      } else if (tp.id === 'coat') {
        await api.say('luna', 'She wore that yellow raincoat even when it was sunny. She said it made her easy to find.');
        await api.say('delphin', '...It didn\'t, though. Did it.', { mood: 'sad' });
      } else {
        await api.say('luna', 'That night, Delphin. I was there. You know I was there.');
        await api.say('delphin', 'They said she wandered off. She didn\'t. Someone took her.', { mood: 'angry' });
        await api.think('Eighteen years, and I can still hear the rain.');
        break;
      }
    }
    api.rel('delphin', 0);
  }

  /* ======================= 3. FLASHBACK ================================ */
  async function partFlashback(api) {
    api.set('ch12_phase', 'flashback');
    await api.fadeOut(900, '#000');
    await api.slides([
      { style: 'montage', title: 'EIGHTEEN YEARS AGO', text: 'Columbus House. I am fourteen. Salina is twelve. We have a plan, a flashlight, and a rumour: somewhere past the woods, an amusement park that never stopped running.' }
    ]);
    api.setPlayer('luna_teen');
    await api.goRoom(ROOM.dorm, { at: mk(ROOM.dorm, 'start', [2, 6]), facing: 'right', fade: false });
    await api.fadeIn(800);
    await api.narrate('Twenty bunks, twenty breathing shapes. The care android hums down the aisle on its rounds.');
    await api.think('Pack. Then Salina. Then out the back before its next sweep.');
    await api.until(function (f) { return f.ch12_pack_photo && f.ch12_pack_cans && f.ch12_pack_jacket; }, {
      objective: 'Pack: the photo, the cans, a jacket',
      targets: ['ch12_pillow', 'ch12_locker', 'ch12_basket']
    });
    api.objective('Meet Salina at the back door');
    await api.waitForInteract('salina');
    await api.say('salina_child', 'Ready? I have the flashlight. And she\'s coming too.', { mood: 'happy' });
    await api.narrate('She holds up her grey stuffed bunny like a ticket.');
    await api.say('luna_teen', 'The android is doing its loop. We go when its back is turned.', { name: 'Luna' });
    await api.say('salina_child', 'Delphin taught us how to get past the door sensor, remember? Hold the latch up. Count to seven.', { mood: 'happy' });
    var c = await api.choice(['Does Delphin know we\'re going?', 'Stay right behind me.']);
    if (c === 0) await api.say('salina_child', 'He\'d only make a fuss. We\'ll be back with a balloon for him. A big one.', { mood: 'happy' });
    else await api.say('salina_child', 'You stay right behind ME. I\'m the one with the light.', { mood: 'smug' });
    api.objective(null);
    // the sneak
    var ok = false;
    for (var attempt = 0; attempt < 2 && !ok; attempt++) {
      var s = await api.minigame('stealth', {
        title: 'LIGHTS OUT AT COLUMBUS', prompt: 'Reach the back door. Stay out of the android\'s light.',
        playerSpec: 'luna_teen',
        map: [
          '####################',
          '#@.b.b.b.b.b.b.b...#',
          '#..................#',
          '#.b.b.b.b.b.b.b.b..#',
          '#..................#',
          '#.b.b.b.b.b.b.b.b.*#',
          '#..................#',
          '####################'
        ],
        guards: [{ path: [[2, 2], [17, 2], [17, 4], [2, 4]], speed: 24, range: 46, fov: 60, spec: 'care_android' }],
        lives: 3
      });
      ok = !!s.success;
      if (!ok && attempt === 0) {
        await api.narrate('"RETURN TO YOUR BUNK." The android steers you both back by the shoulders and rolls on. You lie still and count to three hundred.');
        await api.think('Again. Slower.');
      }
    }
    if (!ok) await api.narrate('On the third try the android docks to charge, its eye going amber. You walk past it like it\'s furniture.');
    await api.narrate('Salina holds the latch up. We count to seven together, in whispers. The sensor never blinks.');
    // the yard, the rain begins
    await api.goRoom(ROOM.yard, { at: mk(ROOM.yard, 'door', [9, 10]), facing: 'up' });
    api.show('salina_y');
    await thunder(api, false);
    await api.narrate('Outside, it has started to rain. Not much. Enough to smell.');
    await api.say('salina_child', 'The gap in the fence is by the big pine. Come ON, Luna.', { mood: 'happy' });
    api.hide('salina_y');
    api.objective('Slip through the gap in the back fence');
    await api.waitForRoom(ROOM.woods);
    api.objective(null);
    await partWoods(api);
    await partPark(api);
    await partDawn(api);
  }

  async function salinaWalk(api, to) {
    var n = G.World.npc('salina_w'); if (!n) return;
    G.World.walkTo(n, { x: to[0], y: to[1] }, { speed: 34 });
  }

  async function partWoods(api) {
    salinaLight.on = true;
    api.placeNpc('salina_w', SALINA_AT[0], 'right');
    await api.narrate('The woods swallow the house in ten steps. Salina\'s flashlight is the only thing in the world that is not rain.');
    await api.say('salina_child', 'Follow the light! If you lose me, shout and I\'ll wave it.', { mood: 'happy' });
    salinaWalk(api, SALINA_AT[1]);
    for (var i = 0; i < WP.length; i++) {
      api.objective('Follow Salina\'s flashlight');
      await api.waitForZone('ch12_wz' + i);
      if (i === 0) {
        await api.think('The trees all blend together like a five-year-old\'s painting. The constellations I taught myself are gone behind the clouds.');
      } else if (i === 1) {
        await thunder(api, true);
        await api.say('salina_child', 'Luna! Did you hear that? That was SO close!', { mood: 'shock' });
        var c1 = await api.choice(['Salina, slow down!', 'Keep the light on the path!']);
        await api.say('salina_child', c1 === 0 ? 'I AM slow! You\'re just short!' : 'I am! The path keeps moving!', { mood: 'happy' });
      } else if (i === 2) {
        await api.narrate('The rain thickens until it is less like water and more like a wall. Mud sucks at my shoes.');
        var c2 = await api.choice(['(Grab her hand.)', '(Shout over the storm.)']);
        if (c2 === 0) await api.narrate('My fingers close on yellow plastic. Her raincoat sleeve, slick as a fish. It slides right through.');
        else await api.say('luna_teen', 'SALINA! WAIT FOR ME!', { name: 'Luna' });
      } else if (i === 3) {
        await thunder(api, false);
        await api.say('salina_child', 'I think I hear it! Music! Luna, it\'s REAL!', { mood: 'happy' });
      }
      if (i < WP.length - 1) salinaWalk(api, SALINA_AT[i + 2]);
    }
    // the ravine: the light is gone
    api.objective(null);
    api.lockPlayer();
    await api.say('salina_child', 'There\'s a way down! I can see the—', { mood: 'happy' });
    api.sound('ch12:thunder');
    api.flash('#ffffff', 600);
    salinaLight.on = false;
    api.hide('salina_w');
    await api.shake(600, 4);
    await api.narrate('A white flash. A crack so loud I feel it in my teeth. When I can see again, the light is gone.');
    await api.choice(['"Salina!"', '"SALINA!"'], { prompt: 'Shout' });
    await api.narrate('Nothing. Only rain, and the black drop of a ravine at my feet.');
    await api.choice(['"Salina, wave the light!"', '"This isn\'t funny!"'], { prompt: 'Shout again' });
    await api.narrate('Nothing.');
    // the silhouette at the tree line
    api.show('delphin_shadow');
    api.flash('#dfe8ff', 300);
    api.sound('ch12:thunder');
    await api.pan('delphin_shadow', 500);
    await api.wait(600);
    await api.think('Behind me, at the tree line. A shape. Taller than me. A boy\'s shape.');
    api.face('delphin_shadow', 'up');
    await api.wait(400);
    var shadow = G.World.npc('delphin_shadow');
    if (shadow) G.World.walkTo(shadow, { x: 18, y: 2 }, { speed: 30 });
    await api.wait(500);
    api.hide('delphin_shadow');
    await api.think('It turns away. When the lightning goes, so does it. I tell myself it was a tree.');
    await api.cameraReset(500);
    api.unlockPlayer();
    api.set('ch12_lostSalina', true);
    api.set('ch12_sawShadow', true);
    await api.narrate('And under the rain, impossibly, music. Carousel music, thin and bright, somewhere past the ravine.');
    await api.think('She heard it too. She\'ll go toward it. She\'ll be there. She has to be there.');
    api.objective('Find a way across. Follow the music.');
    await api.waitForRoom(ROOM.park);
    api.objective(null);
  }

  async function partPark(api) {
    api.sound('ch12:calliope');
    await api.narrate('A theme park. An abandoned one, its rides in various states of disrepair, and every one of them weeping rain.');
    await api.think('Salina? Salina, are you here?');
    await api.until(function (f) { var n = 0; ['carousel', 'tilt', 'booth', 'music'].forEach(function (k) { if (f['ch12_park_' + k]) n++; }); return n >= 2; }, {
      objective: 'Search the park for Salina',
      targets: ['ch12_carousel', 'ch12_speaker']
    });
    api.objective(null);
    api.lockPlayer();
    api.show('norman');
    var pt = api.playerTile();
    await api.move('norman', [Math.min(25, pt.x + 1), pt.y]);
    api.face('norman', 'player'); api.face('player', 'norman');
    await api.emote('player', '!', 600);
    await api.narrate('I jump back with my hands up like I\'m ready to fight. He is a bear of a man, big and bearded, with eyes so full of sadness I want to hug him.');
    await api.say('norman', 'Woah there. I didn\'t mean to startle you, lassie. It\'s unusual to see people round these parts.', { mood: 'neutral' });
    await api.say('luna_teen', 'My friend. A girl, twelve, yellow raincoat. Have you seen her? We got separated by the ravine.', { name: 'Luna', mood: 'fear' });
    await api.say('norman', 'No one\'s come through that gate in nine years but you.', { mood: 'sad' });
    var c = await api.choice(['Please. Help me look.', 'She has to be here. She heard the music too.']);
    await api.say('norman', 'Then we look. My name is Norman. I used to be the supervisor of this here park. When the order went out for all the parks to shut down, I took my keys and I shut myself in with it.');
    await api.fadeOut(600);
    await api.slides([{ style: 'black', text: 'Norman takes his lantern. We walk the fence line, shouting her name into the woods, until my voice is gone and the lantern is the only warm thing left.' }]);
    await api.fadeIn(600);
    await api.say('norman', 'Nothing, lassie. Not a trace, not in this. Storm like this, a smart girl finds a hollow and waits it out. We\'ll go again at first light.', { mood: 'sad' });
    await api.think('First light. She\'s smart. She\'s waiting it out. She\'s smart.');
    await api.say('norman', 'Most of the rides are down and the food\'s not what it used to be. But the music is strong and the most important ride of them all is still running hard.');
    await api.say('norman', 'Howdja like to give the roller coaster a try? Better than sitting and shaking.');
    await api.narrate('He jangles a ring of keys. I should say no. I am fourteen, and it is the only thing I have ever dreamed about.');
    api.unlockPlayer();
    api.objective('Climb into the coaster car');
    await api.waitForInteract('ch12_car');
    api.objective(null);
    await api.say('norman', 'Remember to keep your arms and legs inside the vehicle and enjoy your ride. Screaming is encouraged, as is waving your arms.', { mood: 'happy' });
    await api.fadeOut(400);
    var r = await api.minigame('coaster', {});
    api.set('ch12_coasterLeans', r.hits || 0);
    await api.fadeIn(400);
    await api.narrate('I\'ll never forget it. The way joy turned to terror and then tragedy in the span of ten seconds.');
    await api.narrate('The last picture of my parents, arm in arm, floated out of my pocket on the drop and caught in the spokes. Ripped to shreds, right in front of me.');
    await api.think('It was like someone told me I could have the world, then laughed at me for believing him.');
  }

  async function partDawn(api) {
    await api.fadeOut(900);
    await api.slides([{ style: 'black', text: 'At dawn Norman walks me back. He doesn\'t try to talk me out of anything. At the Columbus fence he squeezes my shoulder and is gone.' }]);
    api.set('ch12_dawn', true);
    await api.goRoom(ROOM.yard, { at: mk(ROOM.yard, 'dawnLuna', [14, 3]), facing: 'down', fade: false });
    api.show('delphin_teen');
    await api.fadeIn(900);
    api.lockPlayer();
    await api.narrate('Grey light. Still raining. And in the yard, soaked through, waiting: Delphin. Sixteen. He has been out here all night.');
    var dp = G.World.npc('delphin_teen');
    var pt = api.playerTile();
    await api.move('delphin_teen', [pt.x, pt.y + 1]);
    api.face('delphin_teen', 'up');
    await api.say('delphin_teen', 'Where is she?', { name: 'Delphin', mood: 'fear' });
    await api.choice(['(Open your mouth. Nothing comes out.)', '(Shake your head.)'], { prompt: 'Where is she?' });
    await api.say('delphin_teen', 'Where is she, Luna? WHERE IS SHE?', { name: 'Delphin', mood: 'angry' });
    api.sound('ch12:slap');
    api.flash('#ff3030', 200);
    await api.shake(300, 4);
    await api.narrate('The slap turns my whole head. He looks at me like he wants to set me on fire so he can have the pleasure of sweeping away the ashes.');
    if (dp) G.World.walkTo(dp, { x: 9, y: 10 }, { speed: 50 });
    await api.wait(900);
    api.hide('delphin_teen');
    await api.narrate('He leaves me standing there in the rain.');
    api.show('staffer');
    await api.move('staffer', [pt.x, pt.y + 1]);
    await api.say('staffer', 'He says it was your idea. Running off. Taking a little girl into the woods.', { name: 'Staff', mood: 'angry' });
    api.unlockPlayer();
    await api.fadeOut(500);
    await api.goRoom(ROOM.closet, { fade: false });
    await api.fadeIn(500);
    await api.narrate('The punishment closet under the main stair. It smells of urine. The door does not open for three days.');
    await api.think('A week later they found her at the bottom of the ravine, still holding the bunny. She fell. The cold did the rest.');
    await api.think('And all those years, behind every thought, that shape at the tree line. Turning away.');
    await api.fadeOut(1000, '#000');
    await api.slides([{ style: 'montage', title: 'NOW', text: 'Eighteen years later. An infirmary with more cots than people.' }]);
    api.setPlayer('luna');
    salinaLight.on = false;
    await api.goRoom(ROOM.infirmary, { at: mk(ROOM.infirmary, 'bedside', [4, 2]), facing: 'left', fade: false });
    api.face('delphin', 'player');
    await api.fadeIn(800);
    api.set('ch12_phase', 'secret');
  }

  /* ======================= 4. THE SECRET ================================ */
  async function partSecret(api) {
    var trust = api.get('m_delphin', 15);
    await api.say('luna', 'I was there that night. I lost her light at the ravine. I came back with nothing and you were waiting in the yard.', { mood: 'sad' });
    var unprompted = trust >= 50;
    if (!unprompted) {
      await api.say('delphin', 'And I slapped you. I remember. You want an apology, red? Get in line behind the nurse.', { mood: 'angry' });
      await api.think('He\'s already halfway out of the conversation. I have to say this exactly right. Three things. Only the true ones.');
      var prompts = [
        { text: 'I saw someone at the tree line that night.', good: true, reply: ['...Lots of trees in a forest, red.', 'sad'] },
        { text: 'Did someone really take her?', good: false, reply: ['Someone took her. Don\'t you dare.', 'angry'] },
        { text: 'You were there, weren\'t you?', good: true, reply: ['...', 'fear'] },
        { text: 'You blamed me so you wouldn\'t have to blame yourself.', good: false, reply: ['Get out. Twenty minutes is up.', 'angry'] },
        { text: 'I never told anyone. Not in eighteen years.', good: true, reply: ['Why not? You could have. You should have.', 'cry'] }
      ];
      var good = 0, bad = 0;
      while (good < 3 && bad < 3) {
        var avail = prompts.filter(function (p) { return !p.used; });
        var auto = 0; avail.forEach(function (p, j) { if (p.good && !avail[auto].good) auto = j; });
        var i = await api.choice(avail.map(function (p) { return p.text; }), { autoPick: auto, prompt: 'Say the true thing (' + good + '/3)' });
        var pk = avail[i]; pk.used = true;
        await api.say('luna', pk.text);
        await api.say('delphin', pk.reply[0], { mood: pk.reply[1] });
        if (pk.good) good++; else { bad++; await api.think(bad >= 2 ? 'Wrong again. He\'s shaking. So am I.' : 'Wrong. Not that.'); }
      }
      if (good < 3) await api.think('I\'ve said every wrong thing there is. And still, after a long time, he talks.');
    } else {
      await api.narrate('He doesn\'t look at me. He looks at the bunny on his calf.');
      await api.say('delphin', 'Don\'t. You don\'t have to say it, red. You saw me. I always knew you saw me.', { mood: 'sad' });
    }
    await api.say('delphin', 'I followed you. I saw her light across the ravine. I could have reached her. I turned back.', { mood: 'cry' });
    await api.say('delphin', 'I\'ve told everyone someone took her because I couldn\'t say the one who left her was me.', { mood: 'cry' });
    api.set('f_delphin_secret', true);
    await api.think('Eighteen years of rehearsing one sentence. I almost don\'t recognise it when it comes out.');
    await api.say('luna', 'I\'m so sorry about what happened with Salina.', { mood: 'cry' });
    var f = await api.choice([
      { text: 'I forgive you. Forgive me too.' },
      { text: 'I can\'t. Not yet.' }
    ]);
    if (f === 0) {
      api.set('f_salina_forgiven', true);
      api.set('m_delphin', Math.min(100, trust + 15));
      await api.say('delphin', 'You were fourteen. I was sixteen. Some days I still think I was the grown-up.', { mood: 'cry' });
      await api.say('luna', 'You were just a kid too. And you\'re still here. She\'d want you to fight. You think letting your leg rot is what she\'d want?');
    } else {
      api.set('f_salina_forgiven', false);
      api.set('m_delphin', Math.min(100, trust + 5));
      await api.say('delphin', 'That\'s fair. That\'s more than fair.', { mood: 'sad' });
      await api.say('luna', 'But I know she loved you. And she\'d hate seeing you like this.');
    }
    await api.narrate('He lets out a shaky breath, the fight draining out of him.');
    await api.say('delphin', 'You\'re a pain in the ass, you know that?', { mood: 'tired' });
    await api.say('luna', 'Yeah. Now let the nurse do his job before I stitch you up myself.', { mood: 'happy' });
    api.set('ch12_medicOut', false);
    api.addNpc({ id: 'medic', at: mk(ROOM.infirmary, 'door', [8, 3]), spec: 'medic', facing: 'left' });
    await api.say('medic', 'Nineteen minutes. I was getting attached to the rock.', { mood: 'smug' });
  }

  /* ======================= 5. ANNETTE ================================== */
  async function partAnnette(api) {
    api.set('ch12_phase', 'annette');
    await api.fadeOut(500);
    await api.titleCard('Tuesday evening', '');
    await api.fadeIn(500);
    await api.think('Annette is knitting in the lounge. Seeing her lounging about without a care sends fire raging through my chest. Kessie will never casually clean again.');
    api.objective('Confront Annette (the lounge, ground floor)');
    await api.waitForInteract('annette');
    api.objective(null);
    await api.narrate('She doesn\'t look surprised to see me. She smiles, the same smile that made me trust her. Love me, it says. I can tell you need it.');
    await api.say('annette', 'Luna. How are you coping, my dear? Kessie\'s death must have been so hard on you, poor thing.', { mood: 'happy' });
    if (api.get('f_attacked_annette', true)) {
      await api.say('annette', 'And look at that bruise on your neck. The chip does leave a mark. Temper, temper.', { mood: 'smug' });
    }
    await api.say('luna', 'You told the Judge about Kessie. About her son. She trusted me, and you used me to destroy her.', { mood: 'angry' });
    await api.say('annette', 'Destroy her? No dear, I didn\'t destroy her. This place did. The system did. I just... expedited what they would\'ve done eventually.', { mood: 'neutral' });
    var points = [
      { id: 'tea', text: 'The tea. You drugged me.', lines: [
        ['annette', 'Chamomile, valerian, and something a little stronger. You held out longer than most, dear. I was quite proud.', 'smug'],
        ['annette', 'And the report? The sweetest little favour from Miss Malcont. She does so love a tidy transcript.', 'happy']] },
      { id: 'kessie', text: 'At least she died quick? You call that quick?', lines: [
        ['annette', 'And what would ye have done, girl? Sat on that secret and watched them drag it out of her anyway?', 'neutral'],
        ['annette', 'You\'re angry because you feel responsible. She told you something she shouldn\'t have, and now she\'s dead. You want to put that guilt somewhere, so here I am.', 'neutral']] },
      { id: 'carol', text: 'Carol. You set her up.', lines: [
        ['annette', 'Carol set herself up the moment she smiled for the men who mocked that waiter. I only held the door.', 'smug'],
        ['annette', 'A girl like that was never going to last. I made it quick-like and useful.', 'neutral']] },
      { id: 'isaiah', text: 'What did you tell Isaiah?', lines: [
        ['annette', 'The truth, as he needed to hear it. That you gave Kessie up to save your own skin.', 'happy'],
        ['annette', 'He\'s a sweet boy. Sweet boys believe grandmothers. It\'s practically the law.', 'smug']] }
    ];
    var asked = 0;
    while (true) {
      var opts = points.filter(function (p) { return !p.used; }).map(function (p) { return { text: p.text, id: p.id }; });
      if (asked >= 2) opts.push({ text: 'Why did you kill them? The men.', id: 'why' });
      var i = await api.choice(opts.map(function (o) { return o.text; }), { prompt: 'Push her on...', autoPick: asked >= 2 ? opts.length - 1 : 0 });
      var o = opts[i];
      if (o.id === 'why') break;
      var pt = points.filter(function (p) { return p.id === o.id; })[0]; pt.used = true; asked++;
      await api.say('luna', o.text, { mood: 'angry' });
      for (var k = 0; k < pt.lines.length; k++) await api.say(pt.lines[k][0], pt.lines[k][1], { mood: pt.lines[k][2] });
      if (o.id === 'isaiah') api.set('ch12_knowsIsaiahLie', true);
    }
    await api.say('luna', 'Why don\'t you tell me why you killed them? Why you played judge, jury and executioner?');
    await api.say('annette', 'Because someone had to. These men weren\'t just rich; they were untouchable. Politicians. CEOs. They could buy their way out of any charge.', { mood: 'angry' });
    await api.say('annette', 'Let me ask you something, Luna. Have you ever been powerless? Truly powerless? The kind where no one will believe you, no one will help you, and the person hurting you knows it?', { mood: 'neutral' });
    await api.think('The group home. Nights clutching Waverly, praying no one would come knocking. My silence gives me away.');
    await api.say('annette', 'That\'s what they counted on. I posed as a maid in their mansions and smiled while they ordered me around. And when they showed me who they were, I made sure they couldn\'t hurt anyone else.');
    var c = await api.choice([
      'You still killed them.',
      'Part of me understands. That\'s what scares me.',
      'She was trying to find her son, Annette.'
    ]);
    if (c === 0) { await api.say('annette', 'Yes. And I\'d do it again.', { mood: 'smug' }); api.set('m_annette', Math.max(0, api.get('m_annette', 40) - 3)); }
    else if (c === 1) { await api.say('annette', 'Good. Fear is just understanding with its shoes off.', { mood: 'happy' }); api.set('m_annette', Math.min(100, api.get('m_annette', 40) + 5)); }
    else { await api.say('annette', 'And what about you? What are you trying to save? Your daughter? Yourself? You want to hate me, but you\'re not that different from me.', { mood: 'neutral' }); }
    await api.say('annette', 'This world is broken, Luna. It\'s twisted and cruel, and it\'s designed to keep people like us at the bottom. So tell me, what are you going to do about it?', { mood: 'smug' });
    await api.think('I don\'t answer. I can\'t. Because deep down, I don\'t know.');
  }

  /* ======================= 6. THE QUIET WEEK =========================== */
  var SLOTS = ['Wednesday morning', 'Wednesday afternoon', 'Thursday'];
  async function partQuietWeek(api) {
    await api.fadeOut(700);
    api.set('ch12_phase', 'hub');
    await api.titleCard('Wednesday, 31 January', 'The quiet week');
    await api.goRoom(ROOM.lunaRoom, { at: mk(ROOM.lunaRoom, 'wake', [6, 3]), facing: 'down', fade: false });
    await api.fadeIn(700);
    await api.narrate('The mansion is weirdly quiet. Despite the excessive amount of space, for three weeks I was always running into the others. Not anymore.');
    await api.think('No more reading for hours. Nobody votes for a woman leafing through books. Talk to them. Assume the cameras are everywhere.');
    api.approval(true);
    for (var s = 0; s < SLOTS.length; s++) {
      api.set('ch12_slotUsed', false);
      api.set('ch12_slotN', s);
      await api.until(function (f) { return f.ch12_slotUsed; }, {
        objective: SLOTS[s] + ': tell Waverly stories to the kitchen camera, play the arcade, or visit Delphin (infirmary)',
        targets: ['ch12_kcam']
      });
      api.objective(null);
      if (s === 1 || s === 2) await nightCheck(api, s === 1 ? 'Wednesday night' : 'Thursday night');
      if (s < SLOTS.length - 1) {
        await api.fadeOut(500);
        await api.titleCard(SLOTS[s + 1], s + 1 === 2 ? 'Thursday, 1 February' : '');
        await api.fadeIn(500);
      }
    }
    api.approval(false);
    api.set('ch12_phase', 'friday');
  }

  async function nightCheck(api, label) {
    var aud = api.approval();
    if (aud >= 60 && !api.get('f_luxury_used')) {
      api.set('f_luxury_used', true);
      api.set('ch12_luxuryNight', true);
      api.sound('success');
      await api.screen ? api.slides([{ style: 'screen', title: 'NIGHTLY RANKING', text: '#1  LUNA BARTLEY\n\nTonight you sleep in the Luxury Room.' }]) : null;
      await api.think('Number one. The audience likes the mother who tells stories. Fine. Let them.');
      api.objective('Go to the Luxury Room (east end of the bedroom hall)');
      await api.waitForRoom(ROOM.luxury);
      api.objective('Lie down');
      await api.waitForInteract('ch12_luxbed');
      api.objective(null);
      await api.narrate('The only room in the house with no cameras. No Eye in the smoke detector. No lens in a book spine.');
      await api.think('I don\'t know what to do with my face when nobody is watching it. So I let it do whatever it wants.');
      await api.narrate('I cry until I fall asleep. It is the best night I have had in a month.');
      api.set('ch12_luxuryNight', false);
      await api.goRoom(ROOM.lunaRoom, { at: mk(ROOM.lunaRoom, 'wake', [6, 3]), facing: 'down' });
    } else {
      await api.fadeOut(400);
      await api.slides([{ style: 'black', text: label + '. Midnight. The lullaby plays through the walls. I am ranked ' + (aud >= 50 ? 'second' : 'third') + ' tonight, and I fall asleep counting my stories instead of sheep.' }]);
      await api.goRoom(ROOM.lunaRoom, { at: mk(ROOM.lunaRoom, 'wake', [6, 3]), facing: 'down', fade: false });
      await api.fadeIn(400);
    }
  }

  /* ======================= 7. DOLL ROOM: THE OPEN VOTE ================= */
  async function partDollRoom(api) {
    await api.fadeOut(600);
    await api.titleCard('Friday, 2 February', 'Private vote');
    await api.goRoom(ROOM.infirmary, { at: mk(ROOM.infirmary, 'bedside', [4, 2]), facing: 'left', fade: false });
    api.set('ch12_medicOut', true); api.remove('medic');
    await api.fadeIn(600);
    await api.narrate('Delphin is discharged the morning of the vote with a stern warning to keep the wound clean and stay off the leg. I scoop his books into a bag.');
    await api.say('delphin', 'Did they ever announce which one of us lost the competition?');
    await api.say('luna', 'No. I assume they\'ll do that today.');
    await api.say('delphin', 'Trader may have. But the Judge seems to be the one calling the shots now. What if he decides to shake things up?', { mood: 'tired' });
    await api.say('luna', 'Then there\'s nothing we can do about it besides wait and see.');
    await api.say('delphin', 'You sure have changed lately.', { mood: 'smug' });
    await api.say('luna', 'Yeah, well. Living on the edge of death will do that to a person.');
    await api.fadeOut(700);
    api.set('ch12_delphinGone', true);
    api.setPlayer('luna');
    await api.goRoom(ROOM.doll, { at: mk(ROOM.doll, 'luna', [8, 9]), facing: 'up', fade: false });
    await api.fadeIn(700);
    await api.narrate('The Doll Room, five minutes early. Nobody outside. The door swings open. Dolls look down from every shelf, red streaks trailing from hollow eyes.');
    await api.narrate('Samantha isn\'t alone in the centre of the room anymore. Beside her stands a throne crusted with jewels, fit for a king or a wannabe dictator.');
    api.objective('Look at Samantha');
    await api.waitForTalk('samantha');
    await api.until(function (f) { return (f.ch12_bops || 0) >= 2; }, { objective: 'Samantha is rocking. Bop her again?', target: 'samantha' });
    api.objective(null);
    api.lockPlayer();
    api.show('judge');
    await api.say('judge', 'Enough.', { mood: 'neutral' });
    await api.narrate('The soft word, spoken so deliberately, has me standing at attention before I realise it. Of course a control freak like the Judge would also be early.');
    await api.say('judge', 'Are you quite finished abusing government property?', { mood: 'smug' });
    await api.choice(['(Nod wordlessly.)'], {});
    await api.say('judge', 'Very well. Take your seat. Your fellow compatriots should be arriving shortly.');
    await api.move('player', mk(ROOM.doll, 'lunaSeat', [7, 7]));
    api.face('player', 'up');
    api.show('delphin2'); api.show('annette2'); api.show('isaiah2');
    await api.narrate('Delphin limps in and takes the chair beside mine. Our united front. Annette and Isaiah arrive together and sit across from us. Her hand rests on his shoulder.');
    await api.narrate('The Judge checks his watch. And again. A few minutes later, Trader slinks through the door.');
    api.show('trader');
    await api.say('trader', 'Sorry I\'m late. Had to take a few calls.', { mood: 'smug' });
    api.face('judge', 'trader');
    await api.say('judge', 'You incompetent fool. Do you think this show runs on luck? Or that the viewers tune in for your juvenile theatrics?', { mood: 'angry' });
    await api.narrate('Trader\'s jaw tightens. His smirk goes, replaced by raw humiliation. His fingers flex and curl, but he stays rooted to the spot.');
    await api.say('judge', 'Speak, boy. You may be incompetent, but I expect an explanation for the disaster you\'ve let this show become.', { mood: 'angry' });
    await api.say('trader', 'Yes, sir. I don\'t know, sir. Suppose it all just got away from me.', { mood: 'sad' });
    await api.say('judge', 'Pathetic.');
    var pity = await api.choice(['(Enjoy it.)', '(Something twists inside you.)'], { prompt: 'Trader shrinks under his father\'s shadow' });
    await api.think(pity === 0
      ? 'I should revel in it after everything he\'s done. I try. It tastes like the closet under the stairs.'
      : 'I imagine growing up under that man\'s thumb. I felt it for a week. Trader lived it. And yet he chose to enforce it. How much of that choice was his?');
    api.onAir(true);
    api.approval(true);
    api.lowerThird('THE DOLL ROOM', 'Week 4 private vote • LIVE', 5000);
    await api.say('judge', 'Enough wasting time. The results of the last competition are in. Mr. Blueford finished first. He is immune.');
    var carried = api.get('f_carried_delphin', true);
    await api.say('judge', carried
      ? 'Mr. Neutrino. You crossed the threshold together with Miss Bartley. But your trailing foot crossed after hers. You lost. Congratulations on your failure.'
      : 'Mr. Neutrino. Your feet crossed the finish line mere seconds after Miss Bartley\'s. You lost. Congratulations on your failure.', { mood: 'smug' });
    await api.say('delphin', 'Thanks for the pep talk, Judge. Really inspires confidence.', { mood: 'smug' });
    await api.say('judge', 'Today we are changing things up. The private vote will not be private. You will each cast your vote and make your explanation here, in front of everyone.');
    await api.think('Open voting. No subtlety. No strategy. Everyone sees your cards.');
    await openVote(api);
  }

  async function openVote(api) {
    await api.say('judge', 'Miss Bartley. You will vote first.');
    await api.narrate('My legs shake on the way to the centre of the room. The dolls watch my back. I take the pen.');
    // Only Luna and Annette are eligible (Isaiah immune, Delphin the loser, no self-votes).
    var spoiled = 0, named = null;
    while (!named) {
      var opts = [{ text: 'Annette.', id: 'annette' }];
      if (!spoiled) opts.push({ text: 'Delphin.', id: 'delphin' }, { text: 'Isaiah.', id: 'isaiah' }, { text: 'Myself.', id: 'luna' });
      var i = await api.choice(opts.map(function (o) { return o.text; }), { prompt: 'Write a name on the ballot', autoPick: 0 });
      var o = opts[i];
      if (o.id === 'annette') { named = 'annette'; break; }
      spoiled++;
      api.sound('buzzer');
      if (o.id === 'delphin') await api.say('judge', 'Mr. Neutrino lost the competition. He cannot be named. The ballot is spoiled. Another.', { mood: 'angry' });
      else if (o.id === 'isaiah') await api.say('judge', 'Mr. Blueford is immune. Spoiled. Another.', { mood: 'angry' });
      else await api.say('judge', 'A contestant may not name herself, Miss Bartley. This is a vote, not a confession. Another.', { mood: 'smug' });
      api.approvalAdd(-2);
      await api.think('Two names left on the board that count. Mine and hers.');
    }
    await api.say('luna', 'Annette. She\'s too manipulative. Too dangerous. She\'s playing all of us.', { mood: 'angry' });
    await api.narrate('Annette raises an eyebrow and says nothing.');
    await api.say('delphin', 'Annette. No hard feelings, Granny, but you\'re too smart for your own good.', { mood: 'smug' });
    await api.say('annette', 'None taken, dear.', { mood: 'happy' });
    await api.narrate('Isaiah hesitates, eyes darting between Annette and me. Annette leans over and whispers in his ear. He nods, shoulders slumping.');
    await api.say('isaiah', 'Luna. She... betrayed Kessie. She\'s not who we think she is.', { mood: 'sad' });
    await api.think('She got to him. She painted me the villain, and the Judge\'s stare keeps me nailed to my chair.');
    await api.say('annette', 'Luna. I\'m afraid she\'s lost sight of what really matters. Redemption.', { mood: 'smug' });
    await api.think('What an absolute hypocrite.');
    api.lowerThird('OPEN VOTE', 'LUNA 2  •  ANNETTE 2', 5000);
    await api.say('judge', 'It\'s a tie. Two votes for Luna. Two for Annette.');
    await api.narrate('He turns to Trader, slowly, so the cameras get it.');
    await api.say('judge', 'As the new host, it falls to me to decide the tiebreaker.', { mood: 'smug' });
    await api.narrate('Trader\'s head snaps up. For a moment something breaks through his mask. Then the smirk comes back.');
    await api.say('trader', 'Well. This should be fun.', { mood: 'smug' });
  }

  /* ======================= 8. CHECKERS ================================= */
  var TAUNTS = {
    1: async function (api) {
      await api.say('annette', 'You know, Luna, you remind me a bit of myself when I was younger. A little too idealistic, a little too trusting.', { mood: 'smug' });
      var c = await api.choice(['And you remind me of what happens when people let the world corrupt them.', '(Say nothing. Watch the board.)'], { timer: 8, timeoutPick: 1 });
      if (c === 0) { await api.say('annette', 'Corruption? No, darling. Survival. There\'s a difference. You\'ll understand when you\'re older. If you get the chance.', { mood: 'smug' }); api.approvalAdd(2); }
      else await api.say('annette', 'Quiet ones. I always liked the quiet ones. They hide the best things.', { mood: 'happy' });
    },
    2: async function (api) {
      await api.say('annette', 'I\'ve been thinking. When I win, maybe I\'ll pay Waverly a visit. You know, offer her a guiding hand.', { mood: 'smug' });
      await api.think('Ice floods my veins.');
      var c = await api.choice(['You stay away from her.', 'Touch her and I will find you. Chip or no chip.'], { timer: 8, timeoutPick: 0 });
      await api.say('luna', c === 0 ? 'You stay away from her.' : 'Touch her and I will find you. Chip or no chip.', { mood: 'angry' });
      await api.say('annette', 'Relax. It\'s only a thought. Someone\'s going to have to raise her once you\'re gone.', { mood: 'happy' });
      await api.say('luna', 'I\'m not going anywhere.', { mood: 'angry' });
      await api.say('annette', 'A bold claim. But boldness doesn\'t always win the game.', { mood: 'smug' });
      api.approvalAdd(c === 0 ? 3 : 1);
    },
    3: async function (api) {
      await api.say('annette', 'You know, Luna, your fate was sealed the moment Isaiah believed what I told him.', { mood: 'smug' });
      await api.say('luna', 'What did you just say?', { mood: 'shock' });
      await api.say('annette', 'Oh, don\'t look so shocked. I told him you betrayed Kessie. That you threw her under the bus to save yourself. Sweet boy bought every word.', { mood: 'happy' });
      var c = await api.choice(['You lied.', '(Look at Isaiah.)'], { timer: 8, timeoutPick: 0 });
      if (c === 0) await api.say('luna', 'You lied.', { mood: 'angry' });
      else api.face('player', 'isaiah2');
      api.face('isaiah2', 'annette2');
      await api.emote('isaiah2', '!', 700);
      await api.say('isaiah', 'You... you lied? You told me she... how could you?', { mood: 'shock' });
      await api.say('annette', 'Because, dear boy, I play to win. And you? You were just another piece on the board.', { mood: 'smug' });
      await api.say('isaiah', 'But what about what Kessie said before she died? She spoke directly to Luna!', { mood: 'cry' });
      await api.say('luna', 'We\'ll deal with that later. Right now, I\'m still in this.');
      await api.say('annette', 'For now.', { mood: 'smug' });
      api.set('m_isaiah', Math.min(100, api.get('m_isaiah', 30) + 15));
      api.set('ch12_isaiahKnows', true);
    }
  };
  async function partCheckers(api) {
    await api.say('judge', 'Respect and redemption. Two concepts that seem to escape most of you. Redemption is not won with brute force or cheap theatrics. It is earned through patience, strategy, and the strength to persevere under pressure.');
    await api.say('judge', 'This game, simple as it may appear, mirrors life. Each move you make has consequences. Each piece you sacrifice is a choice. Annette and Luna, you will play.', { mood: 'smug' });
    await api.say('annette', 'Well now, it\'s been years since I\'ve played a children\'s game. But I do recall being quite good at them.', { mood: 'happy' });
    await api.say('judge', 'Begin.');
    var state = null, res = null, pauseAt = [1, 5, 9];
    while (true) {
      res = await api.minigame('checkers', { state: state, pauseAt: pauseAt });
      state = res.state || state;
      if (res.done || !res.pause) break;
      // a taunt interrupt: the clock is paused while dialogue runs
      var key = pauseAt.indexOf(res.pause) + 1;
      if (TAUNTS[key] && !api.get('ch12_taunt' + key)) { api.set('ch12_taunt' + key, true); await TAUNTS[key](api); }
      if (key === 2) await api.say('delphin', 'Never thought checkers could be this intense.', { mood: 'shock' });
    }
    // any taunt the board never reached still happens (every path)
    for (var k = 1; k <= 3; k++) if (!api.get('ch12_taunt' + k)) { api.set('ch12_taunt' + k, true); await TAUNTS[k](api); }
    api.set('ch12_checkersWinner', res.winner || 'r');
    api.set('ch12_checkersReason', res.reason || '');
    if (res.winner === 'b') {
      // the player won on the board: the host voids it
      api.sound('sting');
      await api.narrate('Annette\'s last red piece clatters off the table. For one second the room is completely silent. I won.');
      await api.think('I won. I actually...');
      await api.say('judge', 'Stop.', { mood: 'neutral' });
      await api.say('judge', 'As host, I have reviewed the footage. Miss Bartley\'s jump on the twelfth move left a piece in a square she had already vacated. An illegal capture.', { mood: 'smug' });
      await api.say('luna', 'That\'s not true. Play it back. Play it back on the screen!', { mood: 'angry' });
      await api.say('judge', 'Each piece you sacrifice is a choice, Miss Bartley. You chose wrongly. The game is awarded to Mrs. Dunphy.', { mood: 'smug' });
      await api.say('annette', 'Checkers is a lot like life. You can plan all you want, but sometimes the only way to win is to play dirty.', { mood: 'smug' });
      await api.think('She didn\'t even have to cheat. She just had to be the one he wanted.');
      api.approvalAdd(4);
    } else if (res.winner === 'draw') {
      await api.narrate('The pieces circle each other until nobody can take anything. The Judge\'s chair creaks forward.');
      await api.say('judge', 'A stalemate is a failure to commit. The host rules for the player who never hesitated. Mrs. Dunphy.', { mood: 'smug' });
      await api.say('annette', 'Checkers is a lot like life. You can plan all you want, but sometimes the only way to win is to play dirty.', { mood: 'smug' });
    } else {
      await api.say('annette', 'Checkers is a lot like life. You can plan all you want, but sometimes the only way to win is to play dirty.', { mood: 'smug' });
      await api.narrate('Her piece lands on my last remaining king. The Judge\'s chair creaks forward.');
      await api.say('judge', 'Annette wins.', { mood: 'neutral' });
    }
  }

  /* ======================= 9. ENDING =================================== */
  async function partEnding(api) {
    await api.narrate('Annette rises slowly, brushing nonexistent dust from her skirt.');
    await api.say('annette', 'Good game.', { mood: 'smug' });
    await api.narrate('She leans in close, breath warm against my ear.');
    await api.say('annette', 'Good luck, sweetheart. You\'ll need it.', { mood: 'smug' });
    api.remove('annette2');
    await api.say('delphin', 'Damn. That was brutal.', { mood: 'sad' });
    await api.say('judge', 'Tomorrow the nation decides. Miss Bartley. Mr. Neutrino. The public vote.', { mood: 'smug' });
    api.lowerThird(null);
    await api.tv([
      { speaker: 'judge', headline: 'PUBLIC VOTE 3: LUNA vs DELPHIN', text: 'The mother or the arsonist. Only one of them leaves with their life. Your vote saves. Vote responsibly.', tag: 'LIVE', ticker: 'TONIGHT: THE PEOPLE DECIDE • ' }
    ]);
    api.onAir(false);
    await api.think('Me or Delphin. Eighteen years to find him again, and the whole country gets to pick which one of us stays.');
    if (api.get('f_salina_forgiven')) await api.think('At least, this time, we are not leaving anything unsaid.');
    api.approval(false);
  }
})();
