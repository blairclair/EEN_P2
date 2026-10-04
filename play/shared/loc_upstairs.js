/* shared/loc_upstairs.js: recurring House rooms on F2, F3 and the basement
 * (loaded before all chapters, after locations.js). Owned by one shared-assets agent.
 * See shared/README.md and ENGINE_API.md §15. Layouts follow canon/CHAPTERS.md §3.
 *
 * MAPS (key your chapter maps by these exact ids, e.g. maps: { house_luna_room: G.shared.map('house_luna_room') }):
 *   F2: house_bedroom_hall, house_luna_room, house_annette_room, house_carol_room, house_john_room,
 *       house_kessie_room, house_delphin_room, house_isaiah_room, house_luxury_room, house_infirmary,
 *       house_screening_room
 *   F3: house_doll_room, house_confessional
 *   stairs/basement: house_service_stair, house_red_room
 *
 * CONVENTIONS
 *   - Exits are `to_<room>` (no house_ prefix). Their arrival tile is resolved WHEN USED from
 *     G.shared.data.spawns[target]['from_<this room>'] (fallback: the target's default spawn), so
 *     rooms owned by other files (house_foyer, house_red_hall) can move without breaking us.
 *   - An exit whose target map your chapter did NOT register is locked (bumps back with a line).
 *   - Every map def carries `spawns: { from_<room>: [x,y] }`, `spawnFacing`, `marks: { name: [x,y] }`,
 *     `cameras: [{id, at, angle, sweep, range, fov}]` (stealth-minigame format) and
 *     `blindSpots: [{id, at, w, h, note}]`. Spawns/marks are mirrored into G.shared.data.spawns[id]
 *     and G.shared.data.marks[id].
 *   - Camera props ('up_cam', 'up_smoke_eye'): SOLID red dot = recording. Give the object
 *     `live: <condition>` (flag string, function or true) to make it FLASH (watched live), e.g.
 *     objects: [] can't edit shared ones, so: G.shared.map('house_bedroom_hall', { remove:['cam_west'],
 *     objects:[Object.assign({}, G.shared.data.upstairs.find('house_bedroom_hall','cam_west'), { live:'ch08_live' })] })
 *     or simpler: G.shared.data.upstairs.live(mapExtCopy, ['cam_west'], 'ch08_live') (see helpers below).
 *   - Optional props (NOT placed by default) live in G.shared.data.upstairs.extras:
 *       judgeThrone (doll room, ch12+), checkersTable (doll room), redRoomPyre (array: wood + gasoline),
 *       wavelyPhoto / waverlyPhoto (Luna's taped photo), falsvilleBook (nightstand), nightgown.
 *     Use: objects: [G.shared.data.upstairs.extras.judgeThrone]  or  objects: G.shared.data.upstairs.extras.redRoomPyre
 *   - Stealth: G.shared.data.upstairs.stealth('house_bedroom_hall', {goal:[x,y], guards:[...]}) returns
 *     params for api.minigame('stealth', ...) built from the real room + its cameras.
 *   - Tiles/props registered here are prefixed `up_`.
 */
(function () {
  'use strict';
  var T = 16;
  var D = G.shared.data;
  D.spawns = D.spawns || {};
  D.spawnFacing = D.spawnFacing || {};
  D.marks = D.marks || {};
  var UP = D.upstairs = D.upstairs || {};

  /* ======================================================================
   * drawing helpers
   * ==================================================================== */
  function px(g, x, y, w, h, c) { g.fillStyle = c; g.fillRect(x, y, w, h); }
  // Three small dolls on one shelf, varied by tile position so rows don't repeat.
  var DOLL_DRESS = ['#8a2030', '#5a3a6a', '#2a4a6a', '#6a5a2a', '#3a5a3a'];
  var DOLL_HAIR = ['#e8c070', '#3a2018', '#b04020', '#d8d0c0', '#101010'];
  function dollRow(g, x, y, seed, salt) {
    for (var i = 0; i < 3; i++) {
      var k = (seed * 7 + salt * 3 + i * 5) % 5;
      var dx = x + 1 + i * 5;
      px(g, dx + 1, y, 3, 1, DOLL_HAIR[k]);               // hair
      px(g, dx + 1, y + 1, 3, 2, '#e8d8c8');              // porcelain face
      px(g, dx + 1, y + 1, 1, 1, '#101018');              // hollow eyes
      px(g, dx + 3, y + 1, 1, 1, '#101018');
      px(g, dx + 1, y + 2, 1, 2, '#8a1018');              // red streaks
      px(g, dx, y + 3, 5, 3, DOLL_DRESS[(k + i) % 5]);    // dress
    }
  }
  function shade(hex, amt) {
    var n = parseInt(hex.slice(1), 16), r = (n >> 16) & 255, gg = (n >> 8) & 255, b = n & 255;
    function f(v) { return Math.max(0, Math.min(255, Math.round(amt >= 0 ? v + (255 - v) * amt : v * (1 + amt)))); }
    return '#' + ((1 << 24) + (f(r) << 16) + (f(gg) << 8) + f(b)).toString(16).slice(1);
  }
  function hash(a, b) { var h = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return h - Math.floor(h); }
  var DIG = { 0: '111101101101111', 1: '010110010010111', 2: '111001111100111', 3: '111001111001111', 4: '101101111001001',
    5: '111100111001111', 6: '111100111101111', 7: '111001001001001', 8: '111101111101111', 9: '111101111001111',
    '+': '000010111010000', L: '100100100100111', S: '111100111001111' };
  function glyph(g, ch, x, y, c) {
    var p = DIG[ch]; if (!p) return;
    for (var i = 0; i < 15; i++) if (p[i] === '1') px(g, x + (i % 3), y + Math.floor(i / 3), 1, 1, c);
  }
  /** wall renderer: top colour (seen from above / ceiling edge), face colour + decoration fn(g,x,y,info) */
  function wallFn(top, face, deco) {
    return function (g, x, y, info) {
      if (!info.face) {
        px(g, x, y, T, T, top); px(g, x, y, T, 1, shade(top, 0.12)); px(g, x, y + T - 1, T, 1, shade(top, -0.25));
        return;
      }
      px(g, x, y, T, T, face);
      px(g, x, y, T, 2, top); px(g, x, y + 2, T, 1, shade(face, 0.18));
      if (deco) deco(g, x, y, info);
      px(g, x, y + T - 3, T, 3, shade(face, -0.4));
      px(g, x, y + T - 1, T, 1, 'rgba(0,0,0,0.5)');
    };
  }
  function wallpaper(c2) { // damask-ish stripes
    return function (g, x, y, info) {
      for (var i = 1; i < T; i += 5) px(g, x + i, y + 4, 1, 9, c2);
      px(g, x + 3, y + 7, 1, 1, c2); px(g, x + 8, y + 9, 1, 1, c2); px(g, x + 13, y + 7, 1, 1, c2);
      px(g, x, y + 11, T, 1, shade(c2, -0.2));
    };
  }
  function doorFn(wood, plate, label, frame) {
    return function (g, x, y, info) {
      px(g, x, y, T, T, frame || '#241b24');
      px(g, x + 2, y + 1, 12, 15, '#1a1216');
      px(g, x + 3, y + 2, 10, 14, wood); px(g, x + 3, y + 2, 10, 1, shade(wood, 0.2));
      px(g, x + 4, y + 8, 8, 3, shade(wood, -0.15)); px(g, x + 4, y + 12, 8, 3, shade(wood, -0.15));
      px(g, x + 11, y + 10, 1, 2, '#d8b860');
      if (label != null) {
        var s = String(label);
        var w = s.length * 4 + 1;
        px(g, x + 8 - Math.ceil(w / 2), y + 2, w, 7, plate);
        px(g, x + 8 - Math.ceil(w / 2), y + 8, w, 1, shade(plate, -0.35));
        for (var i = 0; i < s.length; i++) glyph(g, s[i], x + 9 - Math.ceil(w / 2) + i * 4, y + 3, '#1a1216');
      }
    };
  }

  /* ======================================================================
   * tiles (all `up_` prefixed; built-in tiles are reused where they fit)
   * ==================================================================== */
  var WALL_TOP = '#1c1620', WALL_FACE = '#3e2c3c', WALL_PAT = '#4c3648';
  var tiles = {
    up_wall: { solid: true, wall: true, draw: wallFn(WALL_TOP, WALL_FACE, wallpaper(WALL_PAT)) },
    up_wall_plain: { solid: true, wall: true, draw: wallFn(WALL_TOP, '#3a3040', null) },
    up_floor: { color: '#3b2c26', color2: '#2c201c', pattern: 'planks' },
    up_runner: { // plum runner with gold borders (hall)
      draw: function (g, x, y, info) {
        px(g, x, y, T, T, '#4a1e2c');
        for (var i = 0; i < 6; i++) px(g, x + Math.floor(hash(info.tx, info.ty + i) * 16), y + Math.floor(hash(info.ty, info.tx + i) * 16), 1, 1, '#3a1622');
        if (info.ty % 2 === 0) px(g, x, y + 1, T, 1, '#a07a3a'); else px(g, x, y + T - 2, T, 1, '#a07a3a');
        px(g, x + ((info.tx * 7) % 12) + 2, y + 7, 2, 2, '#5c2838');
      }
    },
    up_carpet: { color: '#3a2c3a', color2: '#2e2230', pattern: 'noise' },
    up_rug_pink: { draw: function (g, x, y) { px(g, x, y, T, T, '#7a4a5e'); px(g, x + 1, y + 1, T - 2, T - 2, '#8a5670'); px(g, x + 6, y + 6, 4, 4, '#a06a84'); } },
    up_stair_main: { // carpeted grand stair going down (west end of the hall)
      draw: function (g, x, y, info) {
        px(g, x, y, T, T, '#2a1a20');
        for (var i = 0; i < 4; i++) { px(g, x + i * 4, y, 3, T, shade('#5a2232', -i * 0.08)); px(g, x + i * 4 + 3, y, 1, T, '#140c10'); }
        px(g, x, y, T, 1, '#a07a3a');
      }
    },
    up_stair_service: { // bare worn stair treads
      draw: function (g, x, y, info) {
        px(g, x, y, T, T, '#25221f');
        for (var i = 0; i < 4; i++) { px(g, x, y + i * 4, T, 3, shade('#4a443c', -i * 0.1)); px(g, x, y + i * 4 + 3, T, 1, '#121010'); }
        px(g, x + 3, y + 1, 2, 1, '#5e574d');
      }
    },
    up_stair_up: { // treads going up (lighter at the top)
      draw: function (g, x, y, info) {
        px(g, x, y, T, T, '#25221f');
        for (var i = 0; i < 4; i++) { px(g, x, y + i * 4, T, 3, shade('#5a544a', -(3 - i) * 0.12)); px(g, x, y + i * 4 + 3, T, 1, '#121010'); }
        px(g, x + 6, y + 2, 4, 1, '#c8c0a8'); px(g, x + 7, y + 1, 2, 1, '#c8c0a8');
      }
    },
    up_stair_down: {
      draw: function (g, x, y, info) {
        px(g, x, y, T, T, '#141210');
        for (var i = 0; i < 4; i++) { px(g, x, y + i * 4, T, 3, shade('#4a443c', -i * 0.18)); px(g, x, y + i * 4 + 3, T, 1, '#0a0908'); }
        px(g, x + 6, y + 12, 4, 1, '#c8c0a8'); px(g, x + 7, y + 13, 2, 1, '#c8c0a8');
      }
    },
    up_stair_deep: { // the steep basement flight: nearly black, a red glow at the bottom
      draw: function (g, x, y, info) {
        px(g, x, y, T, T, '#0c0a0a');
        for (var i = 0; i < 4; i++) { px(g, x, y + i * 4, T, 3, shade('#3a2e2c', -i * 0.25)); px(g, x, y + i * 4 + 3, T, 1, '#060505'); }
        px(g, x, y + T - 2, T, 2, '#3a0a0e');
      }
    },
    up_marble: { color: '#cfcac4', color2: '#b8b2ac', pattern: 'tiles',
      draw: function (g, x, y, info) {
        px(g, x, y, T, T, '#d6d1cb'); px(g, x, y + T - 1, T, 1, '#aaa49e'); px(g, x + T - 1, y, 1, T, '#aaa49e');
        var r = hash(info.tx, info.ty);
        px(g, x + Math.floor(r * 10), y + 3, 5, 1, '#bdb6b0'); px(g, x + Math.floor(r * 10) + 4, y + 4, 3, 1, '#bdb6b0');
      }
    },
    up_marble_wall: { solid: true, wall: true, draw: wallFn('#2a2a30', '#d0ccc6', function (g, x, y, info) { px(g, x + 2 + Math.floor(hash(info.tx, 3) * 8), y + 6, 6, 1, '#b4aea8'); px(g, x, y + 9, T, 1, '#bcb6b0'); }) },
    up_window_garden: { // sealed window, night garden with pink almond blossom
      solid: true, wall: true,
      draw: function (g, x, y, info) {
        wallFn(WALL_TOP, WALL_FACE, null)(g, x, y, info);
        if (!info.face) return;
        px(g, x + 2, y + 3, 12, 10, '#5a4a3a');
        px(g, x + 3, y + 4, 10, 8, '#16203a');
        px(g, x + 3, y + 9, 10, 3, '#1e2a24');
        var r = hash(info.tx, 9);
        px(g, x + 4 + Math.floor(r * 3), y + 6, 3, 2, '#c88aa6'); px(g, x + 9, y + 7, 3, 2, '#b07a94'); px(g, x + 6, y + 8, 1, 3, '#2a1e18');
        px(g, x + 8, y + 4, 1, 8, '#5a4a3a'); px(g, x + 3, y + 8, 10, 1, '#5a4a3a');
        px(g, x + 4, y + 5, 1, 1, 'rgba(255,255,255,0.5)');
      }
    },
    up_window_rain: { // doll-room window over the parking lot; it is always raining
      solid: true, wall: true, anim: true,
      draw: function (g, x, y, info) {
        wallFn('#1a1214', '#5a2a2a', null)(g, x, y, info);
        if (!info.face) return;
        px(g, x + 2, y + 3, 12, 10, '#3a2a20');
        px(g, x + 3, y + 4, 10, 8, '#1c2430');
        px(g, x + 3, y + 10, 10, 2, '#2a2e34');
        var t = info.t;
        for (var i = 0; i < 6; i++) {
          var ry = Math.floor((t * 22 + i * 13 + info.tx * 5) % 8);
          px(g, x + 3 + ((i * 3 + info.tx) % 10), y + 4 + ry, 1, 2, 'rgba(160,190,220,0.6)');
        }
        if (Math.sin(t * 0.7 + info.tx) > 0.985) px(g, x + 3, y + 4, 10, 8, 'rgba(220,230,255,0.6)'); // lightning
        px(g, x + 8, y + 4, 1, 8, '#3a2a20');
      }
    },
    up_dollshelf: { // floor-to-ceiling shelf of dolls (wall)
      solid: true, wall: true,
      draw: function (g, x, y, info) {
        if (!info.face) { px(g, x, y, T, T, '#1a1214'); px(g, x, y + T - 1, T, 1, '#0c0809'); return; }
        px(g, x, y, T, T, '#2a1a14'); px(g, x, y, T, 2, '#1a1214');
        dollRow(g, x, y + 2, info.tx, 0); px(g, x, y + 8, T, 1, '#4a3020');
        dollRow(g, x, y + 9, info.tx, 3); px(g, x, y + 15, T, 1, '#4a3020');
      }
    },
    up_dollshelf_side: { // a standing doll bookcase against a side wall (solid, no face)
      solid: true,
      draw: function (g, x, y, info) {
        px(g, x, y, T, T, '#2a1a14'); px(g, x, y, T, 1, '#4a3020');
        dollRow(g, x, y + 1, info.ty, 1); px(g, x, y + 7, T, 1, '#4a3020');
        dollRow(g, x, y + 8, info.ty, 4); px(g, x, y + 14, T, 2, '#4a3020');
      }
    },
    up_doll_floor: { color: '#3a2420', color2: '#2c1a18', pattern: 'planks' },
    up_doll_wall: { solid: true, wall: true, draw: wallFn('#1a1214', '#5a2a2a', wallpaper('#682f30')) },
    up_leader_wall: { // papered with photos of the Great Leader
      solid: true, wall: true,
      draw: function (g, x, y, info) {
        if (!info.face) { px(g, x, y, T, T, '#1a1a1e'); return; }
        px(g, x, y, T, T, '#c8c0a8');
        for (var i = 0; i < 2; i++) for (var j = 0; j < 2; j++) {
          var ox = x + 1 + i * 7, oy = y + 1 + j * 7, r = hash(info.tx + i, info.ty + j);
          px(g, ox, oy, 6, 6, '#e8e2d0'); px(g, ox + 1, oy + 1, 4, 4, r > 0.5 ? '#5a6a7a' : '#7a5a4a');
          px(g, ox + 2, oy + 1, 2, 2, '#d8a888'); px(g, ox + 2, oy + 3, 2, 2, '#2a2a3a');
        }
        px(g, x, y + T - 1, T, 1, 'rgba(0,0,0,0.5)');
      }
    },
    up_white_wall: { solid: true, wall: true, draw: wallFn('#2a2a2e', '#eeeeea', null) },
    up_red_wall: { solid: true, wall: true, draw: wallFn('#8a9a20', '#6a0a12', function (g, x, y, info) { px(g, x + 4 + Math.floor(hash(info.tx, 1) * 8), y + 5, 1, 6, '#4a050a'); }) },
    up_red_floor: {
      draw: function (g, x, y, info) {
        px(g, x, y, T, T, '#3a3432'); px(g, x, y, T, 1, '#2e2a28');
        var r = hash(info.tx, info.ty);
        if (r > 0.72) { px(g, x + Math.floor(r * 9), y + 5, 4, 3, '#3e1a18'); px(g, x + Math.floor(r * 9) + 2, y + 8, 2, 2, '#3e1a18'); }
        px(g, x + Math.floor(r * 14), y + Math.floor(hash(info.ty, info.tx) * 14), 1, 1, '#2a2624');
      }
    },
    up_concrete: { color: '#3a3836', color2: '#2e2c2a', pattern: 'noise' },
    up_stone_wall: { solid: true, wall: true, draw: wallFn('#1a1918', '#4a4642', function (g, x, y, info) { px(g, x, y + 7, T, 1, '#3a3632'); px(g, x + (info.tx % 2) * 8 + 2, y + 3, 1, 4, '#3a3632'); }) },
    up_bed_head: { solid: true, base: 'up_floor', // pink queen bed: headboard + pillows
      draw: function (g, x, y) { px(g, x, y, T, 5, '#5a3a44'); px(g, x, y, T, 1, '#7a5260'); px(g, x + 1, y + 5, T - 2, 11, '#f0c8d8'); px(g, x + 2, y + 6, 12, 5, '#fbeef4'); px(g, x + 2, y + 10, 12, 1, '#d8b0c0'); }
    },
    up_bed_pink: { solid: true, base: 'up_floor',
      draw: function (g, x, y, info) { px(g, x + 1, y, T - 2, 14, '#e48aaa'); px(g, x + 2, y + 2, 4, 3, '#f0a4c0'); px(g, x + 9, y + 7, 4, 3, '#f0a4c0'); px(g, x + 1, y + 13, T - 2, 1, '#b05a7a'); px(g, x, y + 14, T, 2, '#3a2a30'); }
    },
    up_bed_single: { solid: true, base: 'up_floor', // contestant bed body (grey DPE duvet), tiles seamlessly in a 2-wide column
      draw: function (g, x, y, info) { var L = info.tx % 2 === 1; px(g, x + (L ? 1 : 0), y, L ? 15 : 15, 15, '#5a5e6a'); px(g, x + (L ? 1 : 0), y, 15, 1, '#727684'); px(g, x + (L ? 1 : 0), y + 7, 15, 1, '#4e525e'); if (L) px(g, x + 1, y, 1, 15, '#2e2a30'); else px(g, x + 14, y, 1, 15, '#2e2a30'); px(g, x, y + 15, T, 1, '#1a1418'); }
    },
    up_bed_head_grey: { solid: true, base: 'up_floor',
      draw: function (g, x, y, info) { var L = info.tx % 2 === 1; px(g, x, y, T, 5, '#3a3036'); px(g, x, y, T, 1, '#5a4e56'); px(g, x + (L ? 1 : 0), y + 5, 15, 11, '#5a5e6a'); px(g, x + (L ? 3 : 1), y + 6, 12, 5, '#d8d4cc'); px(g, x + (L ? 1 : 0), y + 13, 15, 1, '#727684'); }
    },
    up_nightstand: { solid: true, base: 'up_floor', draw: function (g, x, y) { px(g, x + 2, y + 4, 12, 11, '#4a3226'); px(g, x + 2, y + 4, 12, 2, '#5e4232'); px(g, x + 7, y + 9, 2, 1, '#c9a24a'); px(g, x + 9, y + 1, 3, 4, '#e8d8a0'); px(g, x + 10, y + 5, 1, 1, '#333'); } },
    up_writing_desk: { solid: true, base: 'up_floor', draw: function (g, x, y) { px(g, x, y + 3, T, 9, '#5a3e2c'); px(g, x, y + 3, T, 2, '#6e4e38'); px(g, x + 1, y + 12, 2, 4, '#3a281c'); px(g, x + 13, y + 12, 2, 4, '#3a281c'); } },
    up_wardrobe: { solid: true, base: 'up_floor', draw: function (g, x, y) { px(g, x + 1, y, 14, 16, '#3e2a20'); px(g, x + 2, y + 1, 5, 14, '#4e3628'); px(g, x + 9, y + 1, 5, 14, '#4e3628'); px(g, x + 7, y + 7, 1, 2, '#c9a24a'); px(g, x + 8, y + 7, 1, 2, '#c9a24a'); } },
    up_shower: { solid: true, base: 'up_marble', // glass stall with a touchscreen
      draw: function (g, x, y) { px(g, x + 1, y, 14, 15, '#9ab4c0'); px(g, x + 2, y + 1, 12, 13, '#b8ccd6'); px(g, x + 3, y + 2, 1, 10, 'rgba(255,255,255,0.7)'); px(g, x + 7, y + 3, 2, 2, '#888'); px(g, x + 1, y + 15, 14, 1, '#7a8a94'); }
    },
    up_tub: { solid: true, base: 'up_marble', draw: function (g, x, y) { px(g, x + 1, y + 2, 14, 13, '#f4f2ee'); px(g, x + 3, y + 4, 10, 9, '#a8d0e0'); px(g, x + 3, y + 4, 10, 1, '#c8e4f0'); px(g, x + 7, y + 1, 2, 3, '#c9a24a'); } },
    up_cot_floor: { color: '#34383a', color2: '#2a2e30', pattern: 'tiles' },
    up_cot_under: { solid: true, color: '#34383a', color2: '#2a2e30', pattern: 'tiles' }, // floor under a 1x2 cot prop
    up_mat: { // "Soak It Up" blood-absorbent mat
      draw: function (g, x, y, info) { px(g, x, y, T, T, '#34383a'); px(g, x + 1, y + 1, 14, 14, '#7a2a30'); px(g, x + 2, y + 2, 12, 12, '#8a3438'); if (info.tx % 2 === 0) { px(g, x + 4, y + 6, 8, 1, '#e8d8c8'); px(g, x + 4, y + 8, 6, 1, '#e8d8c8'); } }
    },
    up_lux_floor: { color: '#4a3a24', color2: '#3a2c1a', pattern: 'checker' },
    up_lux_wall: { solid: true, wall: true, draw: wallFn('#2a2010', '#6a5228', function (g, x, y) { px(g, x + 2, y + 4, 12, 8, '#7a6030'); px(g, x + 3, y + 5, 10, 6, '#8a6c38'); px(g, x + 7, y + 7, 2, 2, '#e8c15a'); }) },
    up_bed_lux: { solid: true, base: 'up_lux_floor', draw: function (g, x, y, info) { var L = info.tx % 2 === 1; px(g, x, y, T, T, '#e8c878'); px(g, x, y + 4, T, 1, '#f8e8b8'); if (L) px(g, x, y, 1, T, '#c8a050'); else px(g, x + 15, y, 1, T, '#c8a050'); px(g, x + (L ? 4 : 2), y + 8, 10, 1, '#d8b060'); px(g, x, y + 15, T, 1, '#5a4020'); } },
    up_lux_head: { solid: true, base: 'up_lux_floor', draw: function (g, x, y) { px(g, x, y, T, 6, '#8a6a30'); px(g, x, y, T, 1, '#e8c15a'); px(g, x, y + 6, T, 10, '#f4ecd8'); px(g, x + 2, y + 7, 5, 5, '#fff8ec'); px(g, x + 9, y + 7, 5, 5, '#fff8ec'); } },
    up_screen_seat: { solid: false, base: 'up_carpet', // theatre chair (walkable so NPCs can sit)
      draw: function (g, x, y) { px(g, x + 2, y + 2, 12, 5, '#5a1a24'); px(g, x + 2, y + 2, 12, 1, '#7a2a34'); px(g, x + 3, y + 7, 10, 6, '#6a2030'); px(g, x + 2, y + 13, 1, 2, '#1a1010'); px(g, x + 13, y + 13, 1, 2, '#1a1010'); }
    },
    up_medic_desk: { solid: true, base: 'up_cot_floor', draw: function (g, x, y) { px(g, x, y + 3, T, 10, '#d8dcdc'); px(g, x, y + 3, T, 2, '#eef0f0'); px(g, x + 3, y + 1, 5, 4, '#2a2a2e'); px(g, x + 4, y + 2, 3, 2, '#4aff8a'); px(g, x + 10, y + 5, 3, 2, '#c03040'); } },
    up_cabinet: { solid: true, base: 'up_cot_floor', draw: function (g, x, y) { px(g, x + 1, y, 14, 15, '#c8ccd0'); px(g, x + 2, y + 1, 12, 6, '#a8c8d0'); px(g, x + 2, y + 8, 12, 6, '#b8bcc0'); px(g, x + 4, y + 3, 2, 3, '#e8e8e8'); px(g, x + 8, y + 2, 2, 4, '#c03040'); px(g, x + 7, y + 10, 2, 1, '#555'); } },
    // numbered bedroom doors (hall side) and special doors
    up_door_1: { door: true, draw: doorFn('#5e3a2a', '#c9a24a', 1) },
    up_door_2: { door: true, draw: doorFn('#5e3a2a', '#c9a24a', 2) },
    up_door_3: { door: true, draw: doorFn('#5e3a2a', '#c9a24a', 3) },
    up_door_4: { door: true, draw: doorFn('#5e3a2a', '#c9a24a', 4) },
    up_door_5: { door: true, draw: doorFn('#5e3a2a', '#c9a24a', 5) },
    up_door_6: { door: true, draw: doorFn('#5e3a2a', '#c9a24a', 6) },
    up_door_7: { door: true, draw: doorFn('#5e3a2a', '#c9a24a', 7) },
    up_door_infirmary: { door: true, draw: doorFn('#c8ccd0', '#c03040', '+') },
    up_door_screening: { door: true, draw: doorFn('#2a1a20', '#e8323c', null) },
    up_door_lux: { door: true, draw: doorFn('#8a6a30', '#f0d070', 'L') },
    up_door: { door: true, draw: doorFn('#5e3a2a', '#c9a24a', null) },
    up_door_white: { door: true, draw: doorFn('#e8e4de', '#c9a24a', null, '#b8b2ac') },
    up_door_iron: { door: true, draw: doorFn('#3a3a3e', '#6a0a12', null, '#1a1918') }
  };
  G.shared.registerTiles(tiles);

  /* ======================================================================
   * props
   * ==================================================================== */
  function isLive(obj) { var d = obj && obj.def; return !!(d && d.live != null && G.Script && G.Script.check(d.live)); }
  function redDot(g, x, y, t, obj) {
    if (isLive(obj)) { if (Math.floor(t * 3) % 2 === 0) { px(g, x, y, 2, 2, '#ff2030'); px(g, x - 1, y - 1, 4, 4, 'rgba(255,40,50,0.25)'); } else px(g, x, y, 2, 2, '#5a0a10'); }
    else { px(g, x, y, 2, 2, '#ff3040'); px(g, x - 1, y - 1, 4, 4, 'rgba(255,40,50,0.18)'); }
  }
  function sprite(spec) { try { return G.Sprites.get(spec, 'down', 0); } catch (e) { return null; } }
  var props = {
    up_cam: function (g, x, y, t, obj) { // ceiling dome camera; solid dot = recording, flashing = live
      px(g, x + 4, y + 3, 8, 2, '#1a1a1e'); px(g, x + 5, y + 5, 6, 4, '#2a2a30'); px(g, x + 6, y + 6, 4, 2, '#0a0a0e');
      px(g, x + 5, y + 5, 6, 1, '#4a4a52');
      redDot(g, x + 10, y + 5, t, obj);
    },
    up_smoke_eye: function (g, x, y, t, obj) { // smoke detector that is really a camera ("Eye")
      px(g, x + 5, y + 4, 6, 4, '#e8e6e0'); px(g, x + 6, y + 8, 4, 1, '#c8c6c0'); px(g, x + 6, y + 5, 4, 1, '#bdbab4');
      if (isLive(obj)) { if (Math.floor(t * 3) % 2 === 0) px(g, x + 7, y + 6, 1, 1, '#ff2030'); }
      else px(g, x + 7, y + 6, 1, 1, '#c02030');
    },
    up_tablet: function (g, x, y, t) { // wall tablet that won't turn off: curated memories of Waverly
      px(g, x + 2, y + 3, 12, 9, '#111'); px(g, x + 3, y + 4, 10, 7, '#2a3a5a');
      var k = Math.floor(t / 3) % 3;
      if (k === 0) { px(g, x + 5, y + 5, 4, 3, '#6a4a3a'); px(g, x + 6, y + 8, 3, 3, '#e8c040'); }
      else if (k === 1) { px(g, x + 4, y + 8, 8, 3, '#4a7a4a'); px(g, x + 8, y + 5, 3, 3, '#e8c040'); }
      else { px(g, x + 6, y + 5, 4, 3, '#6a4a3a'); px(g, x + 5, y + 8, 6, 3, '#e8c040'); }
      g.globalAlpha = 0.2 + 0.1 * Math.sin(t * 2); px(g, x + 3, y + 4, 10, 7, '#9ab8ff'); g.globalAlpha = 1;
    },
    up_booklet: function (g, x, y) { // the penguin booklet + DPE pen on the desk
      px(g, x + 2, y + 4, 7, 6, '#e8e4dc'); px(g, x + 3, y + 5, 3, 3, '#1a1a22'); px(g, x + 4, y + 6, 1, 2, '#f4f4f4'); px(g, x + 3, y + 8, 1, 1, '#e89a2a');
      px(g, x + 10, y + 5, 1, 6, '#e8323c'); px(g, x + 10, y + 11, 1, 1, '#ddd');
    },
    up_button_green: function (g, x, y, t) { px(g, x + 5, y + 5, 6, 6, '#2a2a2e'); px(g, x + 6, y + 6, 4, 4, Math.sin(t * 2) > 0 ? '#3ad06a' : '#2aa050'); },
    up_touchpanel: function (g, x, y, t) { px(g, x + 9, y + 3, 5, 6, '#111'); px(g, x + 10, y + 4, 3, 4, Math.sin(t * 4) > -0.6 ? '#3fc1c9' : '#1a5a60'); },
    up_frame: function (g, x, y, t, obj) { // gilt frame on a wall (Great Leader by default)
      px(g, x + 2, y + 3, 12, 10, '#a07a3a'); px(g, x + 3, y + 4, 10, 8, '#2a2a3a');
      px(g, x + 6, y + 5, 4, 3, '#d8a888'); px(g, x + 5, y + 8, 6, 4, '#1a1a2a'); px(g, x + 6, y + 5, 4, 1, '#3a2a1a');
    },
    up_sconce: function (g, x, y, t) { px(g, x + 7, y + 6, 2, 4, '#a07a3a'); px(g, x + 6, y + 4, 4, 3, '#ffe0a0'); g.globalAlpha = 0.15; px(g, x + 3, y + 2, 10, 8, '#ffd080'); g.globalAlpha = 1; },
    up_plant: function (g, x, y) { px(g, x + 5, y + 10, 6, 5, '#6a3a2a'); px(g, x + 4, y + 4, 8, 6, '#2a4a2a'); px(g, x + 6, y + 2, 3, 3, '#3a5a32'); px(g, x + 9, y + 5, 2, 2, '#3a5a32'); },
    up_foldchair: function (g, x, y) { px(g, x + 4, y + 2, 8, 2, '#8a8e94'); px(g, x + 4, y + 4, 1, 4, '#6a6e74'); px(g, x + 11, y + 4, 1, 4, '#6a6e74'); px(g, x + 4, y + 8, 8, 3, '#9aa0a6'); px(g, x + 4, y + 11, 1, 4, '#5a5e64'); px(g, x + 11, y + 11, 1, 4, '#5a5e64'); },
    up_trader_chair: function (g, x, y) { // double-size white leather chair (2 tiles wide)
      px(g, x + 1, y - 4, 30, 8, '#e8e4dc'); px(g, x + 1, y - 4, 30, 1, '#fff'); px(g, x - 1, y + 2, 4, 10, '#d8d4cc'); px(g, x + 29, y + 2, 4, 10, '#d8d4cc');
      px(g, x + 2, y + 4, 28, 8, '#f4f0e8'); px(g, x + 2, y + 12, 28, 2, '#b8b4ac'); px(g, x + 3, y + 14, 2, 2, '#c9a24a'); px(g, x + 27, y + 14, 2, 2, '#c9a24a');
    },
    up_throne: function (g, x, y, t) { // the Judge's jewelled throne
      px(g, x + 2, y - 6, 12, 10, '#c9a24a'); px(g, x + 3, y - 5, 10, 8, '#6a1a2a'); px(g, x + 7, y - 8, 2, 2, '#e8323c');
      px(g, x + 1, y + 4, 14, 8, '#c9a24a'); px(g, x + 2, y + 5, 12, 5, '#7a2232'); px(g, x + 2, y + 12, 2, 3, '#a07a3a'); px(g, x + 12, y + 12, 2, 3, '#a07a3a');
      var s = Math.floor(t * 2) % 3; px(g, x + 3 + s * 4, y - 3, 1, 1, '#9ae8ff'); px(g, x + 12 - s * 3, y + 6, 1, 1, '#f0f0ff');
    },
    up_samantha: function (g, x, y, t, obj) { // giant gavel doll, 2 tiles wide, on the top shelf; her eyes are the camera
      var cx = x + 16, cy = y - 2;
      // palm-leaf hair, blood red
      for (var i = -3; i <= 3; i++) { px(g, cx + i * 4 - 2, cy - 12 + Math.abs(i), 4, 6 + Math.abs(i) * 2, i % 2 ? '#9a0a14' : '#c01420'); }
      // beach-ball face
      g.fillStyle = '#f4d8c8'; g.beginPath(); g.arc(cx, cy + 2, 10, 0, Math.PI * 2); g.fill();
      px(g, cx - 10, cy, 3, 4, '#e8bca8'); px(g, cx + 7, cy, 3, 4, '#e8bca8');
      px(g, cx - 3, cy - 8, 6, 2, '#c01420');
      // icy blue eyes with red streaks
      px(g, cx - 6, cy - 1, 4, 4, '#fff'); px(g, cx + 2, cy - 1, 4, 4, '#fff');
      px(g, cx - 5, cy, 2, 2, '#5ad0ff'); px(g, cx + 3, cy, 2, 2, '#5ad0ff');
      px(g, cx - 5, cy + 3, 1, 3, '#a01018'); px(g, cx + 4, cy + 3, 1, 3, '#a01018');
      // puffy purple lips, rictus grin
      px(g, cx - 4, cy + 6, 8, 3, '#7a2a8a'); px(g, cx - 3, cy + 7, 6, 1, '#f4f0f0');
      // body + gavel
      px(g, cx - 7, cy + 12, 14, 8, '#e8e0f0'); px(g, cx - 7, cy + 12, 14, 2, '#c01420');
      px(g, cx + 8, cy + 6, 2, 10, '#5a3a1a'); px(g, cx + 5, cy + 3, 8, 4, '#7a4a2a');
      redDot(g, cx - 1, cy - 9, t, obj); // the lens
    },
    up_tb_kneel: function (g, x, y, t, obj) { // kneeling True Believer fixture (gold-masked statue)
      var spr = sprite((obj && obj.def && obj.def.spec) || 'tb');
      var H = (G.Sprites && G.Sprites.H) || 28;
      if (spr) g.drawImage(spr, 0, 0, 16, H - 7, x, y + 16 - (H - 7) + 4, 16, H - 7);
      px(g, x + 2, y + 15, 12, 2, '#120a10');
    },
    up_doll: function (g, x, y, t, obj) { // a single creepy doll sitting on the floor
      var c = (obj && obj.def && obj.def.color) || '#d8c8e8';
      px(g, x + 5, y + 4, 6, 6, '#f0d8c8'); px(g, x + 4, y + 3, 8, 2, '#7a3a20'); px(g, x + 6, y + 6, 1, 1, '#111'); px(g, x + 9, y + 6, 1, 1, '#111');
      px(g, x + 6, y + 7, 1, 2, '#a01018'); px(g, x + 7, y + 8, 2, 1, '#600');
      px(g, x + 4, y + 10, 8, 5, c);
    },
    up_toaster: function (g, x, y) { // toaster-shaped ballot box
      px(g, x + 2, y + 5, 12, 9, '#b8bcc4'); px(g, x + 2, y + 5, 12, 2, '#d8dce4'); px(g, x + 4, y + 5, 3, 1, '#1a1a1e'); px(g, x + 9, y + 5, 3, 1, '#1a1a1e');
      px(g, x + 13, y + 8, 2, 2, '#2a2a2e'); px(g, x + 3, y + 12, 10, 1, '#8a8e96'); px(g, x + 6, y + 9, 4, 2, '#e8323c');
    },
    up_slips: function (g, x, y) { px(g, x + 3, y + 7, 7, 5, '#f4f0e4'); px(g, x + 5, y + 6, 7, 5, '#e8e4d8'); px(g, x + 6, y + 7, 5, 1, '#888'); px(g, x + 6, y + 9, 4, 1, '#888'); px(g, x + 3, y + 12, 1, 3, '#333'); },
    up_small_table: function (g, x, y) { px(g, x + 1, y + 4, 14, 8, '#4a3a30'); px(g, x + 1, y + 4, 14, 2, '#5e4a3c'); px(g, x + 2, y + 12, 2, 4, '#2a201a'); px(g, x + 12, y + 12, 2, 4, '#2a201a'); },
    up_checkers: function (g, x, y) { // checkers table (ch12)
      px(g, x + 1, y + 2, 14, 11, '#3a2a20'); for (var i = 0; i < 4; i++) for (var j = 0; j < 4; j++) px(g, x + 2 + i * 3, y + 3 + j * 2, 3, 2, (i + j) % 2 ? '#c8b89a' : '#2a1a14');
      px(g, x + 3, y + 3, 1, 1, '#c01420'); px(g, x + 9, y + 9, 1, 1, '#111'); px(g, x + 3, y + 13, 2, 3, '#2a1a14'); px(g, x + 11, y + 13, 2, 3, '#2a1a14');
    },
    up_cuffs: function (g, x, y, t) { // rusty cuffs hanging from the ceiling on chains
      var sw = Math.round(Math.sin(t * 1.3 + x) * 1);
      for (var i = 0; i < 9; i += 2) px(g, x + 7 + (i > 4 ? sw : 0), y - 8 + i, 2, 1, '#6a5a4a');
      px(g, x + 4 + sw, y + 2, 4, 4, '#7a4a2a'); px(g, x + 5 + sw, y + 3, 2, 2, '#1a1212');
      px(g, x + 9 + sw, y + 2, 4, 4, '#7a4a2a'); px(g, x + 10 + sw, y + 3, 2, 2, '#1a1212');
    },
    up_drain: function (g, x, y) { px(g, x + 4, y + 5, 8, 7, '#1a1616'); for (var i = 0; i < 4; i++) px(g, x + 5 + i * 2, y + 6, 1, 5, '#4a4442'); px(g, x + 3, y + 12, 3, 2, '#3e1a18'); },
    up_wood: function (g, x, y) { px(g, x + 2, y + 7, 12, 3, '#6a4a2a'); px(g, x + 3, y + 10, 11, 3, '#5a3a20'); px(g, x + 1, y + 9, 3, 3, '#8a6a40'); px(g, x + 12, y + 6, 3, 3, '#8a6a40'); },
    up_gascan: function (g, x, y) { px(g, x + 4, y + 4, 8, 11, '#b01818'); px(g, x + 4, y + 4, 8, 1, '#d02a2a'); px(g, x + 9, y + 2, 2, 3, '#2a2a2a'); px(g, x + 5, y + 8, 6, 4, '#e8c040'); },
    up_cot: function (g, x, y) { // prison cot, 1×2 (draws down into the next tile)
      px(g, x + 2, y + 1, 12, 28, '#5a5e64'); px(g, x + 3, y + 2, 10, 26, '#8a8e8a'); px(g, x + 3, y + 2, 10, 5, '#c8c8c0');
      px(g, x + 2, y + 29, 2, 3, '#2a2a2e'); px(g, x + 12, y + 29, 2, 3, '#2a2a2e');
    },
    up_photo_taped: function (g, x, y) { px(g, x + 4, y + 4, 8, 8, '#e8e4d8'); px(g, x + 5, y + 5, 6, 5, '#6a5a4a'); px(g, x + 7, y + 6, 2, 2, '#8a6a4a'); px(g, x + 6, y + 8, 4, 2, '#e8c040'); px(g, x + 3, y + 3, 3, 2, 'rgba(240,240,220,0.7)'); px(g, x + 10, y + 11, 3, 2, 'rgba(240,240,220,0.7)'); },
    up_book: function (g, x, y, t, obj) { var c = (obj && obj.def && obj.def.color) || '#3a6aa8'; px(g, x + 4, y + 7, 8, 6, c); px(g, x + 4, y + 7, 1, 6, shade(c, -0.4)); px(g, x + 6, y + 9, 4, 1, '#f0e8c8'); },
    up_nightgown: function (g, x, y) { px(g, x + 3, y + 5, 10, 9, '#e8e0f0'); px(g, x + 5, y + 4, 6, 2, '#d0c8e0'); px(g, x + 7, y + 6, 2, 1, '#a090c0'); },
    up_knitting: function (g, x, y) { px(g, x + 4, y + 8, 8, 5, '#a888c8'); px(g, x + 3, y + 5, 1, 8, '#c8c8c8'); px(g, x + 12, y + 5, 1, 8, '#c8c8c8'); px(g, x + 10, y + 11, 3, 3, '#7a5aa0'); },
    up_teaset: function (g, x, y) { px(g, x + 3, y + 8, 6, 5, '#e8e8f0'); px(g, x + 9, y + 9, 2, 2, '#e8e8f0'); px(g, x + 4, y + 7, 4, 1, '#c8a0d8'); px(g, x + 11, y + 11, 3, 2, '#e8e8f0'); },
    up_compact: function (g, x, y) { px(g, x + 5, y + 7, 6, 6, '#e85a9a'); px(g, x + 6, y + 8, 4, 4, '#f8a8c8'); px(g, x + 7, y + 9, 2, 2, '#fff'); },
    up_vanity: function (g, x, y) { px(g, x + 1, y + 1, 14, 8, '#e8d0e0'); px(g, x + 3, y + 2, 10, 6, '#b8d0e0'); px(g, x + 4, y + 3, 2, 3, '#fff'); px(g, x + 1, y + 9, 14, 6, '#f0b8d0'); px(g, x + 4, y + 10, 2, 2, '#e8323c'); px(g, x + 9, y + 10, 3, 2, '#f8e0a0'); },
    up_ashtray: function (g, x, y) { px(g, x + 4, y + 9, 8, 4, '#5a5a5e'); px(g, x + 5, y + 10, 6, 2, '#2a2a2a'); px(g, x + 6, y + 9, 4, 1, '#e8e4d8'); px(g, x + 9, y + 8, 1, 1, '#ff6030'); },
    up_sweater_heap: function (g, x, y) { px(g, x + 2, y + 8, 12, 6, '#a8946a'); px(g, x + 4, y + 7, 6, 2, '#b8a47a'); px(g, x + 7, y + 10, 3, 2, '#7a6a4a'); },
    up_gloves: function (g, x, y) { px(g, x + 3, y + 7, 4, 7, '#f0d020'); px(g, x + 9, y + 6, 4, 7, '#f0d020'); px(g, x + 3, y + 6, 1, 2, '#f0d020'); px(g, x + 12, y + 5, 1, 2, '#f0d020'); },
    up_cleaning: function (g, x, y) { px(g, x + 3, y + 6, 4, 8, '#3ab0e0'); px(g, x + 4, y + 4, 2, 2, '#fff'); px(g, x + 8, y + 8, 5, 6, '#e8e8e8'); px(g, x + 9, y + 9, 3, 2, '#c03040'); },
    up_bible: function (g, x, y) { px(g, x + 4, y + 6, 8, 8, '#2a1a14'); px(g, x + 7, y + 8, 2, 4, '#c9a24a'); px(g, x + 6, y + 9, 4, 1, '#c9a24a'); },
    up_hairdye: function (g, x, y) { px(g, x + 4, y + 6, 3, 8, '#2a6ae8'); px(g, x + 4, y + 5, 3, 1, '#eee'); px(g, x + 9, y + 9, 3, 5, '#5aff6a'); px(g, x + 9, y + 8, 3, 1, '#222'); },
    up_bookstack: function (g, x, y) { px(g, x + 3, y + 11, 10, 3, '#8a2a2a'); px(g, x + 4, y + 8, 9, 3, '#2a4a7a'); px(g, x + 3, y + 5, 10, 3, '#4a6a3a'); px(g, x + 5, y + 3, 7, 2, '#c8a050'); },
    up_sneakers: function (g, x, y) { px(g, x + 3, y + 9, 5, 4, '#d02a2a'); px(g, x + 9, y + 10, 5, 4, '#d02a2a'); px(g, x + 3, y + 12, 5, 1, '#fff'); px(g, x + 9, y + 13, 5, 1, '#fff'); },
    up_flowers_gold: function (g, x, y) { px(g, x + 5, y + 9, 6, 6, '#c9a24a'); px(g, x + 4, y + 4, 3, 3, '#f8f0f0'); px(g, x + 9, y + 3, 3, 3, '#e888a8'); px(g, x + 7, y + 5, 2, 2, '#f8f0f0'); px(g, x + 7, y + 7, 1, 2, '#3a6a2a'); },
    up_wallscreen_off: function (g, x, y) { px(g, x + 1, y + 3, 14, 9, '#0a0a0e'); px(g, x + 2, y + 4, 12, 1, '#1a1a22'); },
    up_sign: function (g, x, y, t, obj) { // small wall plaque with a glyph label (def.label: 'F3','F1','B')
      px(g, x + 3, y + 4, 10, 7, '#c8c0a8'); px(g, x + 3, y + 10, 10, 1, '#8a8270');
      var s = String((obj && obj.def && obj.def.label) || '');
      for (var i = 0; i < s.length && i < 2; i++) { if (DIG[s[i]]) glyph(g, s[i], x + 5 + i * 4, y + 5, '#2a1a14'); else if (s[i] === 'F') { px(g, x + 5 + i * 4, y + 5, 3, 1, '#2a1a14'); px(g, x + 5 + i * 4, y + 5, 1, 5, '#2a1a14'); px(g, x + 5 + i * 4, y + 7, 2, 1, '#2a1a14'); } else if (s[i] === 'B') { px(g, x + 5 + i * 4, y + 5, 1, 5, '#2a1a14'); px(g, x + 6 + i * 4, y + 5, 2, 1, '#2a1a14'); px(g, x + 6 + i * 4, y + 7, 2, 1, '#2a1a14'); px(g, x + 6 + i * 4, y + 9, 2, 1, '#2a1a14'); px(g, x + 8 + i * 4, y + 6, 1, 1, '#2a1a14'); px(g, x + 8 + i * 4, y + 8, 1, 1, '#2a1a14'); } }
    },
    up_bulb: function (g, x, y, t) { px(g, x + 7, y - 6, 1, 8, '#2a2a2a'); var f = Math.sin(t * 9) > 0.92 ? '#806040' : '#ffe8a0'; px(g, x + 6, y + 2, 3, 3, f); }
  };
  G.shared.registerProps(props);

  /* ======================================================================
   * map helpers
   * ==================================================================== */
  function grid(w, h, ch) { var a = []; for (var y = 0; y < h; y++) { a.push([]); for (var x = 0; x < w; x++) a[y].push(ch); } return a; }
  function put(gr, x, y, ch) { if (gr[y] && x >= 0 && x < gr[y].length) gr[y][x] = ch; }
  function fill(gr, x, y, w, h, ch) { for (var j = 0; j < h; j++) for (var i = 0; i < w; i++) put(gr, x + i, y + j, ch); }
  function box(gr, x, y, w, h, wall, floor) { fill(gr, x, y, w, h, wall); fill(gr, x + 1, y + 1, w - 2, h - 2, floor); }
  function rows(gr) { return gr.map(function (r) { return r.join(''); }); }
  function short(id) { return id.replace(/^house_/, ''); }

  /** Arrival-tile resolver used by every exit: looks the spawn up WHEN the exit is used. */
  function arrive(target, fromName) {
    return function (api, ent) {
      var sp = D.spawns[target] && D.spawns[target][fromName];
      if (ent && ent.def) {
        if (sp) ent.def.toAt = sp;
        var f = D.spawnFacing[target] && D.spawnFacing[target][fromName];
        if (f) ent.def.facing = f;
      }
    };
  }
  /** true if the running chapter did not register `target` (so the exit should stay shut). */
  function missing(target) { return function () { return !G.lookup('maps', target); }; }
  /**
   * exit('house_bedroom_hall', 'house_luna_room', [4, 9], { w, h, lockedText, locked, facing })
   * -> { id:'to_luna_room', to:'house_luna_room', run: resolver, locked: fn|cond, ... }
   * `locked` given in opts is OR-ed with "map not registered".
   */
  function exit(fromId, target, at, o) {
    o = o || {};
    var miss = missing(target), extra = o.locked;
    var e = {
      id: o.id || ('to_' + short(target)), at: at, w: o.w || 1, h: o.h || 1, to: target,
      run: arrive(target, 'from_' + short(fromId)),
      locked: extra == null ? miss : function () { return miss() || G.Script.check(extra); },
      lockedText: o.lockedText || [{ think: 'Not now.' }]
    };
    if (o.toAt) e.toAt = o.toAt;
    if (o.facing) e.facing = o.facing;
    return e;
  }
  UP.exit = exit; UP.arrive = arrive; UP.missing = missing;

  function cam(id, at, angle, o) {
    o = o || {};
    return { id: id, at: at, prop: o.prop || 'up_cam', solid: o.solid != null ? o.solid : false, layer: 1,
      cam: { angle: angle, sweep: o.sweep != null ? o.sweep : 50, range: o.range || 80, fov: o.fov || 50, speed: o.speed || 0.6 },
      examine: o.examine || [{ think: 'A red light. Someone, somewhere, is keeping score.' }] };
  }
  function reg(id, def) {
    def.id = id;
    def.cameras = (def.objects || []).filter(function (o) { return o.cam; }).map(function (o) {
      return { id: o.id, at: o.at, angle: o.cam.angle, sweep: o.cam.sweep, range: o.cam.range, fov: o.cam.fov, speed: o.cam.speed };
    });
    def.blindSpots = def.blindSpots || [];
    D.spawns[id] = def.spawns || {};
    D.spawnFacing[id] = def.spawnFacing || {};
    D.marks[id] = def.marks || {};
    G.shared.registerMap(id, def);
    return def;
  }
  /** look up a shared fixture def by id (a copy) */
  UP.find = function (mapId, entId) {
    var m = G.shared.maps[mapId]; if (!m) return null;
    var all = [].concat(m.objects || [], m.npcs || [], m.zones || [], m.exits || []);
    for (var i = 0; i < all.length; i++) if (all[i].id === entId) return G.cloneDef(all[i]);
    return null;
  };
  /** make cameras flash (watched live) under a condition, on a map COPY returned by G.shared.map */
  UP.live = function (mapCopy, camIds, cond) {
    (mapCopy.objects || []).forEach(function (o) { if (camIds.indexOf(o.id) >= 0) o.live = cond == null ? true : cond; });
    return mapCopy;
  };
  /** stealth-minigame params built from a shared room (its tiles, legend and cameras) */
  UP.stealth = function (mapId, extra) {
    var m = G.shared.maps[mapId]; if (!m) return extra || {};
    var p = { map: m.tiles.slice(), legend: Object.assign({}, m.legend || {}), cameras: G.cloneDef(m.cameras || []), start: m.spawn };
    Object.keys(extra || {}).forEach(function (k) { p[k] = extra[k]; });
    return p;
  };
  UP.extras = UP.extras || {};

  /* ======================================================================
   * F2: house_bedroom_hall  (40×4 corridor; 42×6 with walls)
   * ------------------------------------------------------------------
   * Doors N: infirmary x4, 1 x9, 3 (Luna) x14, 5 x19, 7 x24, screening x30
   * Doors S: 2 x11, 4 x16, 6 x21, luxury x35
   * West end x1-2: main stair down (to_foyer). East end x39-40: service stair (to_service_stair).
   * exits: to_foyer, to_service_stair, to_annette_room, to_luna_room, to_kessie_room, to_isaiah_room,
   *        to_carol_room, to_john_room, to_delphin_room, to_infirmary, to_screening_room, to_luxury_room
   * spawns: from_foyer [3,2], from_service_stair [38,2], from_<room> = tile in front of its door
   * marks: door_1..door_7, door_infirmary, door_screening, door_luxury (tile in front of each door),
   *        stair_main [3,3], stair_service [38,3], mid [20,2]
   * fixtures: cam_west, cam_east, sconce_1..6, frame_1..3, plant_w, plant_e
   * blind spots: stair_main_bs, stair_service_bs (audio only); whole hall 02:00-03:00 (chapter logic)
   * ================================================================== */
  (function () {
    var ID = 'house_bedroom_hall', W = 42, H = 6;
    var g = grid(W, H, '#');
    fill(g, 1, 1, 40, 4, '.'); fill(g, 3, 2, 36, 2, '=');
    fill(g, 1, 1, 2, 4, '<'); fill(g, 39, 1, 2, 4, '>');
    var N = { infirmary: 4, annette: 9, luna: 14, kessie: 19, isaiah: 24, screening: 30 };
    var S = { carol: 11, john: 16, delphin: 21, luxury: 35 };
    put(g, N.infirmary, 0, 'I'); put(g, N.annette, 0, '1'); put(g, N.luna, 0, '3'); put(g, N.kessie, 0, '5'); put(g, N.isaiah, 0, '7'); put(g, N.screening, 0, 'V');
    put(g, S.carol, 5, '2'); put(g, S.john, 5, '4'); put(g, S.delphin, 5, '6'); put(g, S.luxury, 5, 'X');
    var spawns = { from_foyer: [3, 2], from_service_stair: [38, 2] }, facing = { from_foyer: 'right', from_service_stair: 'left' };
    var marks = { stair_main: [3, 3], stair_service: [38, 3], mid: [20, 2] };
    var exits = [
      exit(ID, 'house_foyer', [1, 1], { h: 4, lockedText: [{ think: 'The main stair. Not now.' }] }),
      exit(ID, 'house_service_stair', [40, 1], { h: 4, lockedText: [{ think: 'The service stair. Not now.' }] })
    ];
    function door(room, num, x, side) {
      var front = side === 'N' ? [x, 1] : [x, 4];
      spawns['from_' + room] = front; facing['from_' + room] = side === 'N' ? 'down' : 'up';
      marks[typeof num === 'number' ? 'door_' + num : 'door_' + num] = front;
      exits.push(exit(ID, 'house_' + room, [x, side === 'N' ? 0 : 5], {
        lockedText: [{ think: typeof num === 'number' ? 'Door ' + num + '. Locked.' : 'Locked.' }]
      }));
    }
    door('infirmary', 'infirmary', N.infirmary, 'N'); door('annette_room', 1, N.annette, 'N'); door('luna_room', 3, N.luna, 'N');
    door('kessie_room', 5, N.kessie, 'N'); door('isaiah_room', 7, N.isaiah, 'N'); door('screening_room', 'screening', N.screening, 'N');
    door('carol_room', 2, S.carol, 'S'); door('john_room', 4, S.john, 'S'); door('delphin_room', 6, S.delphin, 'S'); door('luxury_room', 'luxury', S.luxury, 'S');
    var objects = [
      cam('cam_west', [12, 0], 90, { sweep: 70, range: 96 }),
      cam('cam_east', [28, 0], 90, { sweep: 70, range: 96 }),
      { id: 'frame_1', at: [6, 0], prop: 'up_frame', solid: false, examine: 'The Great Leader, reading to children. The children are not looking at the book.' },
      { id: 'frame_2', at: [21, 0], prop: 'up_frame', solid: false, examine: 'The Great Leader again. His eyes follow you down the hall.' },
      { id: 'frame_3', at: [33, 0], prop: 'up_frame', solid: false, examine: 'A brass plate under the portrait: OBEDIENCE IS BEAUTY.' },
      { id: 'sconce_1', at: [7, 5], prop: 'up_sconce', solid: false, layer: 1 },
      { id: 'sconce_2', at: [13, 5], prop: 'up_sconce', solid: false, layer: 1 },
      { id: 'sconce_3', at: [18, 5], prop: 'up_sconce', solid: false, layer: 1 },
      { id: 'sconce_4', at: [26, 5], prop: 'up_sconce', solid: false, layer: 1 },
      { id: 'sconce_5', at: [32, 5], prop: 'up_sconce', solid: false, layer: 1 },
      { id: 'sconce_6', at: [37, 5], prop: 'up_sconce', solid: false, layer: 1 },
      { id: 'plant_w', at: [3, 1], prop: 'up_plant' },
      { id: 'plant_e', at: [38, 4], prop: 'up_plant' }
    ];
    reg(ID, {
      name: 'Bedroom Hall',
      tiles: rows(g),
      legend: { '#': 'up_wall', '.': 'up_floor', '=': 'up_runner', '<': 'up_stair_main', '>': 'up_stair_service',
        '1': 'up_door_1', '2': 'up_door_2', '3': 'up_door_3', '4': 'up_door_4', '5': 'up_door_5', '6': 'up_door_6', '7': 'up_door_7',
        'I': 'up_door_infirmary', 'V': 'up_door_screening', 'X': 'up_door_lux' },
      spawn: [3, 2], spawns: spawns, spawnFacing: facing, marks: marks,
      ambient: 'hum', tint: '#2a1030', tintAlpha: 0.12, dark: 0.25, playerLight: 40, bg: '#07050a',
      lights: [{ at: [7, 4], r: 44 }, { at: [13, 4], r: 44 }, { at: [18, 4], r: 44 }, { at: [26, 4], r: 44 }, { at: [32, 4], r: 44 }, { at: [37, 4], r: 44 }],
      blindSpots: [{ id: 'stair_main_bs', at: [1, 1], w: 2, h: 4, note: 'stairwell: audio only (running/talking detected)' },
        { id: 'stair_service_bs', at: [39, 1], w: 2, h: 4, note: 'stairwell: audio only' }],
      objects: objects, exits: exits
    });
  })();

  /* ======================================================================
   * F2: house_luna_room  (No. 3; 8×8 room + en-suite marble bathroom to the east)
   * ------------------------------------------------------------------
   * exits: to_bedroom_hall [4,9]
   * spawns: from_bedroom_hall [4,8] (facing up)
   * marks: window_spot [4,1], bed [7,3] (beside the bed, standing), bed_lie [7,2], desk [2,6],
   *        shower [12,2], bath_door [9,3], tablet [2,1], door [4,8], center [4,5], nightstand [6,2]
   * fixtures: window (also window_r), bed, nightstand, desk, booklet, tablet, smoke_detector (hidden cam "Eye"),
   *           ginerva_button, wardrobe, shower, shower_panel, bath_sink, bath_toilet, bath_mirror, bath_cam
   * extras (not placed): UP.extras.waverlyPhoto (taped photo, wall by the bed), UP.extras.falsvilleBook (nightstand),
   *           UP.extras.nightgown (on the bed)
   * ================================================================== */
  (function () {
    var ID = 'house_luna_room';
    var g = grid(15, 10, ' ');
    box(g, 0, 0, 10, 10, '#', '.');
    box(g, 9, 0, 6, 7, 'Q', ':');
    put(g, 9, 3, 'e');                       // bathroom door
    put(g, 4, 0, 'W'); put(g, 5, 0, 'W');   // sealed window, north wall centre
    put(g, 7, 1, 'y'); put(g, 8, 1, 'y'); put(g, 7, 2, 'b'); put(g, 8, 2, 'b'); put(g, 7, 3, 'b'); put(g, 8, 3, 'b'); // queen bed NE
    put(g, 6, 1, 'n');                      // nightstand
    put(g, 1, 7, 'w'); put(g, 2, 7, 'w'); put(g, 2, 6, 'c'); // desk SW + chair
    put(g, 1, 1, 'A');                      // wardrobe (closet: blind spot)
    fill(g, 3, 4, 3, 2, 'R');               // pink rug
    put(g, 4, 9, 'D');                       // door to the hall
    put(g, 12, 1, 'H'); put(g, 13, 1, 'H'); // shower stall
    put(g, 10, 1, 'S'); put(g, 13, 5, 't');
    reg(ID, {
      name: "Luna's Room",
      tiles: rows(g),
      legend: { '#': 'up_wall', '.': 'up_floor', 'Q': 'up_marble_wall', ':': 'up_marble', 'e': 'up_door_white', 'W': 'up_window_garden',
        'y': 'up_bed_head', 'b': 'up_bed_pink', 'n': 'up_nightstand', 'w': 'up_writing_desk', 'A': 'up_wardrobe', 'R': 'up_rug_pink',
        'D': 'up_door', 'H': 'up_shower' },
      spawn: [4, 8], spawns: { from_bedroom_hall: [4, 8] }, spawnFacing: { from_bedroom_hall: 'up' },
      marks: { window_spot: [4, 1], bed: [6, 3], bed_lie: [7, 2], desk: [2, 6], shower: [12, 2], bath_door: [9, 3], tablet: [2, 1], door: [4, 8], center: [4, 5], nightstand: [6, 2] },
      ambient: 'hum', tint: '#3a1a40', tintAlpha: 0.1, dark: 0.2, bg: '#07050a',
      lights: [{ at: [4, 1], r: 40 }, { at: [6, 1], r: 30 }, { at: [12, 3], r: 44 }],
      blindSpots: [{ id: 'wardrobe_bs', at: [1, 2], w: 1, h: 1, note: 'in front of the wardrobe (closet)' }],
      objects: [
        { id: 'window', at: [4, 0], examine: [{ think: 'Sealed. Below, the garden: pink almond blossom in January, a gravel path, and the fence.' }] },
        { id: 'window_r', at: [5, 0], examine: [{ think: 'No latch, no hinge. A window that is only a picture of a window.' }] },
        { id: 'bed', at: [7, 2], examine: [{ think: 'A fluffy pink comforter. Silk sheets, too cold to sleep in.' }] },
        { id: 'nightstand', at: [6, 1], examine: [{ think: 'A little lamp and an empty drawer.' }] },
        { id: 'desk', at: [1, 7], examine: [{ think: 'A writing desk. Everything on it belongs to them.' }] },
        { id: 'booklet', at: [2, 7], prop: 'up_booklet', examine: [{ think: 'The penguin booklet, and a pen stamped DPE.' }] },
        { id: 'tablet', at: [2, 0], prop: 'up_tablet', solid: false, examine: [{ think: "\"Curated memories.\" Waverly, on a loop. There is no off switch." }] },
        { id: 'smoke_detector', at: [7, 0], prop: 'up_smoke_eye', solid: false, cam: { angle: 110, sweep: 0, range: 120, fov: 110 },
          examine: [{ think: 'A smoke detector. The little light never blinks the way smoke detectors blink.' }] },
        { id: 'ginerva_button', at: [5, 9], prop: 'up_button_green', solid: false, examine: [{ think: 'A green button: SUMMON GINERVA. For emergencies after lockdown.' }] },
        { id: 'wardrobe', at: [1, 1], examine: [{ think: 'Grey DPE sweatsuits, all my size. They knew my size.' }] },
        { id: 'shower', at: [12, 1], examine: [{ think: 'A marble shower with a touchscreen. It says WELCOME LUNA.' }] },
        { id: 'shower_panel', at: [13, 1], prop: 'up_touchpanel', examine: [{ think: 'WELCOME LUNA. Steam: 1 to 10. Music: on.' }] },
        { id: 'bath_sink', at: [10, 1], examine: [{ think: 'Gold taps. Warm water whenever I want it. That is how they get you.' }] },
        { id: 'bath_toilet', at: [13, 5], examine: [{ think: 'Even in here, probably.' }] },
        { id: 'bath_mirror', at: [11, 0], prop: 'up_frame', solid: false, draw: function (g2, x, y) { px(g2, x + 2, y + 3, 12, 10, '#c9a24a'); px(g2, x + 3, y + 4, 10, 8, '#9ab0c0'); px(g2, x + 4, y + 5, 2, 5, '#c8dce8'); },
          examine: [{ think: 'Freckles. Red frizz. Still me.' }] },
        cam('bath_cam', [13, 0], 120, { sweep: 0, range: 80, fov: 90, examine: [{ think: 'Filmed, never aired. That is the promise.' }] })
      ],
      exits: [exit(ID, 'house_bedroom_hall', [4, 9], { lockedText: [{ think: 'Locked from the outside.' }] })]
    });
    UP.extras.waverlyPhoto = { id: 'waverly_photo', at: [6, 0], prop: 'up_photo_taped', solid: false, layer: 1, examine: [{ think: 'Waverly. Taped up where I can see it from the bed.' }] };
    UP.extras.wavelyPhoto = UP.extras.waverlyPhoto;
    UP.extras.falsvilleBook = { id: 'falsville_book', at: [6, 1], prop: 'up_book', color: '#3a6aa8', layer: 1, examine: [{ think: 'Falsville. Smuggled out of the library.' }] };
    UP.extras.nightgown = { id: 'nightgown', at: [8, 3], prop: 'up_nightgown', solid: false, layer: 1, examine: [{ think: 'A DPE nightgown, laid out on the bed.' }] };
  })();

  /* ======================================================================
   * F3: house_doll_room  (16×12 + a short corridor east to the confessional)
   * ------------------------------------------------------------------
   * exits: to_service_stair [3,13], to_confessional [22,6]
   * spawns: from_service_stair [3,12] (up), from_confessional [21,6] (left)
   * marks: samantha [8,1] (stand here to face her), judge_throne [11,1], tb_left [6,1], tb_right [11,1]... see below,
   *        checkers_table [8,6], chair_1..chair_8 (folding-chair circle), trader_chair [8,9], trader_stand [8,10],
   *        center [8,6], window [2,1], door [3,12], corridor [19,6], ballot_table [5,2]
   * fixtures: samantha (also the room's camera; `live` makes her lens flash), tb_statue_left, tb_statue_right,
   *           window_rain (+ window_rain_r), chair_1..chair_8, trader_chair, doll_floor_1..3
   * extras (not placed): UP.extras.judgeThrone (at judge_throne), UP.extras.checkersTable (at checkers_table)
   * ================================================================== */
  (function () {
    var ID = 'house_doll_room';
    var g = grid(23, 14, ' ');
    box(g, 0, 0, 18, 14, '#', '.');
    fill(g, 1, 0, 16, 1, 'k');                       // north wall: floor-to-ceiling doll shelves
    put(g, 2, 0, 'r'); put(g, 3, 0, 'r');             // the rain window (north-west)
    fill(g, 1, 2, 1, 9, 'j'); fill(g, 16, 2, 1, 9, 'j'); // side doll shelves
    put(g, 16, 6, '.'); put(g, 16, 5, 'j');
    fill(g, 17, 5, 6, 3, '#'); fill(g, 17, 6, 5, 1, '.'); put(g, 17, 6, 'e'); put(g, 22, 6, 'D'); // corridor
    put(g, 3, 13, 'D');
    var chairs = [[7, 3], [10, 3], [12, 5], [12, 7], [10, 9], [6, 9], [4, 7], [4, 5]];
    var objs = [
      { id: 'samantha', at: [8, 0], prop: 'up_samantha', solid: true, layer: 1, cam: { angle: 90, sweep: 0, range: 200, fov: 120 },
        examine: [{ think: 'Samantha. Blood-red palm-leaf hair, icy blue eyes, a gavel in her fist. Her eyes are the lens.' }] },
      { id: 'samantha_r', at: [9, 0], examine: [{ think: 'Up close, the streaks under her eyes are paint. Mostly.' }] },
      { id: 'tb_statue_left', at: [7, 0], prop: 'up_tb_kneel', spec: 'tb', solid: true, layer: 1, examine: [{ think: 'A True Believer kneels at her side. It has not moved. I think.' }] },
      { id: 'tb_statue_right', at: [10, 0], prop: 'up_tb_kneel', spec: 'tb', solid: true, layer: 1, examine: [{ think: 'Gold mask, black robe, kneeling. Statue or man, it is watching me.' }] },
      { id: 'window_rain', at: [2, 0], examine: [{ think: 'Rain over a three-car parking lot. It is always raining up here.' }] },
      { id: 'window_rain_r', at: [3, 0], examine: [{ think: 'Rain. The room is sauna-hot anyway.' }] },
      { id: 'trader_chair', at: [8, 9], prop: 'up_trader_chair', solid: false, examine: [{ think: "Trader's chair. Twice the size of ours." }] },
      { id: 'doll_floor_1', at: [14, 11], prop: 'up_doll', color: '#c8a8d8', examine: [{ think: 'Red streaks trailing from hollow eyes. Rictus grin.' }] },
      { id: 'doll_floor_2', at: [2, 11], prop: 'up_doll', color: '#a8c8d8', examine: [{ think: 'Someone has sat this one facing the chairs.' }] },
      { id: 'doll_floor_3', at: [15, 2], prop: 'up_doll', color: '#e8b8b8', examine: [{ think: 'Its glass eyes have been scratched out.' }] }
    ];
    var marks = { samantha: [8, 1], judge_throne: [11, 1], checkers_table: [8, 6], trader_chair: [8, 9], trader_stand: [8, 10], center: [8, 6], window: [2, 1], door: [3, 12], corridor: [19, 6], ballot_table: [5, 2] };
    chairs.forEach(function (c, i) {
      objs.push({ id: 'chair_' + (i + 1), at: c, prop: 'up_foldchair', solid: false, examine: [{ think: 'A folding chair, in a circle of folding chairs.' }] });
      marks['chair_' + (i + 1)] = c;
    });
    reg(ID, {
      name: 'The Doll Room',
      tiles: rows(g),
      legend: { '#': 'up_doll_wall', '.': 'up_doll_floor', 'k': 'up_dollshelf', 'j': 'up_dollshelf_side', 'r': 'up_window_rain', 'e': 'up_door', 'D': 'up_door' },
      spawn: [3, 12], spawns: { from_service_stair: [3, 12], from_confessional: [21, 6] }, spawnFacing: { from_service_stair: 'up', from_confessional: 'left' },
      marks: marks,
      ambient: 'drone', tint: '#ff6a20', tintAlpha: 0.1, dark: 0.3, playerLight: 36, bg: '#0a0506',
      lights: [{ at: [8, 2], r: 64, flicker: true }, { at: [2, 1], r: 36 }, { at: [8, 7], r: 56 }, { at: [20, 6], r: 24 }],
      blindSpots: [],
      objects: objs,
      exits: [exit(ID, 'house_service_stair', [3, 13], { lockedText: [{ think: 'A True Believer stands at the stair. Not that way.' }] }),
        exit(ID, 'house_confessional', [22, 6], { lockedText: [{ think: 'The confessional door is shut.' }] })]
    });
    UP.extras.judgeThrone = { id: 'judge_throne', at: [11, 1], prop: 'up_throne', solid: true, layer: 1, examine: [{ think: "A jewelled throne beside Samantha. The Judge's." }] };
    UP.extras.checkersTable = { id: 'checkers_table', at: [8, 6], prop: 'up_checkers', solid: true, examine: [{ think: 'A checkers board, set for two.' }] };
  })();

  /* ======================================================================
   * F3: house_confessional  (3×3)
   * ------------------------------------------------------------------
   * exits: to_doll_room [2,4]
   * spawns: from_doll_room [2,3] (up)
   * marks: seat [2,2] (stand/sit here facing the table), door [2,3], table [2,1]
   * fixtures: confess_table, ballot_box (toaster), ballot_slips, cam_confessional, leader_wall, white_wall
   * ================================================================== */
  (function () {
    var ID = 'house_confessional';
    var g = grid(5, 5, 'P');
    fill(g, 1, 1, 3, 3, '.');
    fill(g, 4, 0, 1, 5, 'Q');                 // the one fresh white wall (east)
    put(g, 2, 4, 'D');
    reg(ID, {
      name: 'The Confessional',
      tiles: rows(g),
      legend: { 'P': 'up_leader_wall', 'Q': 'up_white_wall', '.': 'up_carpet', 'D': 'up_door' },
      spawn: [2, 3], spawns: { from_doll_room: [2, 3] }, spawnFacing: { from_doll_room: 'up' },
      marks: { seat: [2, 2], door: [2, 3], table: [2, 1] },
      ambient: 'tension', tint: '#202040', tintAlpha: 0.1, dark: 0.45, playerLight: 30, bg: '#050508',
      lights: [{ at: [2, 1], r: 40 }],
      objects: [
        { id: 'confess_table', at: [2, 1], prop: 'up_small_table', examine: [{ think: 'A small table. Just enough room for a ballot.' }] },
        { id: 'ballot_box', at: [2, 1], prop: 'up_toaster', layer: 1, examine: [{ think: 'The ballot box is shaped like a toaster. Of course it is.' }] },
        { id: 'ballot_slips', at: [3, 1], prop: 'up_slips', examine: [{ think: 'Ballot slips. Every name except the winner and the loser.' }] },
        cam('cam_confessional', [1, 0], 70, { sweep: 0, range: 64, fov: 90, examine: [{ think: 'A camera with a red light, an arm’s length from my face.' }] }),
        { id: 'leader_wall', at: [2, 0], examine: [{ think: 'The Great Leader: speaking to children, saluting soldiers, staring at me. Three walls of him.' }] },
        { id: 'white_wall', at: [4, 2], examine: [{ think: 'One fresh white wall. Waiting for something.' }] }
      ],
      exits: [exit(ID, 'house_doll_room', [2, 4], { lockedText: [{ think: 'The door is held shut from outside.' }] })]
    });
  })();

  /* ======================================================================
   * house_service_stair: the narrow old service stair (audio sensors only, no cameras)
   * connector: F2 bedroom hall (west door), up to F3 doll room, down to F1 red hall, down to the basement red room
   * ------------------------------------------------------------------
   * exits: to_bedroom_hall [0,2], to_doll_room [4..5,1], to_red_hall [4..5,4], to_red_room [4..5,6]
   * spawns: from_bedroom_hall [1,2] (right), from_doll_room [3,1] (left), from_red_hall [3,4] (left), from_red_room [3,6] (left)
   * marks: landing [2,3], f3 [3,1], f1 [3,4], basement [3,6]
   * fixtures: sign_f3, sign_f1, sign_b, bulb, mic_sensor
   * blind spot: the whole stairwell (audio only: running or talking is detected)
   * ================================================================== */
  (function () {
    var ID = 'house_service_stair';
    var g = grid(7, 8, '#');
    fill(g, 1, 1, 5, 6, '_');
    put(g, 4, 1, '^'); put(g, 5, 1, '^'); put(g, 4, 2, '^'); put(g, 5, 2, '^');
    put(g, 4, 4, 'v'); put(g, 5, 4, 'v');
    put(g, 4, 6, 'z'); put(g, 5, 6, 'z');
    put(g, 0, 2, 'D');
    fill(g, 4, 3, 2, 1, '#'); fill(g, 4, 5, 2, 1, '#');
    reg(ID, {
      name: 'Service Stair',
      tiles: rows(g),
      legend: { '#': 'up_stone_wall', '_': 'up_concrete', '^': 'up_stair_up', 'v': 'up_stair_down', 'z': 'up_stair_deep', 'D': 'up_door' },
      spawn: [1, 2],
      spawns: { from_bedroom_hall: [1, 2], from_doll_room: [3, 1], from_red_hall: [3, 4], from_red_room: [3, 6] },
      spawnFacing: { from_bedroom_hall: 'right', from_doll_room: 'left', from_red_hall: 'left', from_red_room: 'left' },
      marks: { landing: [2, 3], f3: [3, 1], f1: [3, 4], basement: [3, 6] },
      audioOnly: true,
      ambient: 'drone', tint: '#101820', tintAlpha: 0.15, dark: 0.6, playerLight: 34, bg: '#040404',
      lights: [{ at: [2, 3], r: 40, flicker: true }],
      blindSpots: [{ id: 'service_stair_bs', at: [1, 1], w: 5, h: 6, note: 'audio sensors only: walking is safe, running or talking is detected' }],
      objects: [
        { id: 'sign_f3', at: [3, 0], prop: 'up_sign', label: 'F3', solid: false, examine: [{ think: 'Up: the top floor. Contestants only go up escorted.' }] },
        { id: 'sign_f1', at: [6, 4], prop: 'up_sign', label: 'F1', solid: false, examine: [{ think: 'Down: the Red Hall.' }] },
        { id: 'sign_b', at: [6, 6], prop: 'up_sign', label: 'B', solid: false, examine: [{ think: 'Further down. The basement.' }] },
        { id: 'bulb', at: [2, 3], prop: 'up_bulb', solid: false, layer: 1 },
        { id: 'mic_sensor', at: [1, 0], prop: 'up_smoke_eye', solid: false, examine: [{ think: 'No lens. A microphone grille. Walk, don\'t run. Don\'t talk.' }] }
      ],
      exits: [
        exit(ID, 'house_bedroom_hall', [0, 2], { lockedText: [{ think: 'The door to the bedroom hall is locked.' }] }),
        exit(ID, 'house_doll_room', [4, 1], { w: 2, h: 2, lockedText: [{ think: 'Up there is the top floor. Not without an escort.' }] }),
        exit(ID, 'house_red_hall', [4, 4], { w: 2, lockedText: [{ think: 'Down to the Red Hall. Not now.' }] }),
        exit(ID, 'house_red_room', [4, 6], { w: 2, lockedText: [{ think: 'The steps go down into the dark. No.' }] })
      ]
    });
  })();

  /* ======================================================================
   * Basement: house_red_room  (10×10)
   * ------------------------------------------------------------------
   * exits: to_service_stair [2,0]
   * spawns: from_service_stair [2,1] (down)
   * marks: cuffs_center [5,5], stake [5,5] (centre of the wood/gasoline circle), judge [8,2], door [2,1],
   *        line_1..line_6 (contestant line, row 9, x 3..8), trader [7,2], ginerva [3,2]
   * fixtures: cuffs_1, cuffs_2, cuffs_3, drain, cam_red, bulb_red
   * extras (not placed): UP.extras.redRoomPyre (array: wood_1..wood_10 ring + gas_1..gas_3)
   * ================================================================== */
  (function () {
    var ID = 'house_red_room';
    var g = grid(12, 12, '#');
    fill(g, 1, 1, 10, 10, '.');
    put(g, 2, 0, 'D');
    var marks = { cuffs_center: [5, 5], stake: [5, 5], judge: [8, 2], trader: [7, 2], ginerva: [3, 2], door: [2, 1] };
    for (var i = 1; i <= 6; i++) marks['line_' + i] = [2 + i, 9];
    reg(ID, {
      name: 'The Red Room',
      tiles: rows(g),
      legend: { '#': 'up_red_wall', '.': 'up_red_floor', 'D': 'up_door_iron' },
      spawn: [2, 1], spawns: { from_service_stair: [2, 1] }, spawnFacing: { from_service_stair: 'down' },
      marks: marks,
      ambient: 'drone', tint: '#600010', tintAlpha: 0.14, dark: 0.45, playerLight: 30, bg: '#050102',
      lights: [{ at: [5, 5], r: 64, flicker: true }, { at: [2, 1], r: 24 }],
      objects: [
        { id: 'cuffs_1', at: [4, 5], prop: 'up_cuffs', solid: false, layer: 1, examine: [{ think: 'Rusty cuffs on a chain from the ceiling.' }] },
        { id: 'cuffs_2', at: [5, 5], prop: 'up_cuffs', solid: false, layer: 1, examine: [{ think: 'Three pairs. Someone counted us.' }] },
        { id: 'cuffs_3', at: [6, 5], prop: 'up_cuffs', solid: false, layer: 1, examine: [{ think: 'The rust is not all rust.' }] },
        { id: 'drain', at: [5, 7], prop: 'up_drain', solid: false, layer: -1, examine: [{ think: 'A drain in the middle of the floor. Of course there is a drain.' }] },
        { id: 'bulb_red', at: [5, 3], prop: 'up_bulb', solid: false, layer: 1 },
        cam('cam_red', [9, 0], 120, { sweep: 30, range: 140, fov: 80 })
      ],
      exits: [exit(ID, 'house_service_stair', [2, 0], { lockedText: [{ think: 'The iron door does not move.' }] })]
    });
    var pyre = [];
    [[3, 4], [3, 5], [3, 6], [4, 3], [5, 3], [6, 3], [7, 4], [7, 5], [7, 6], [4, 7], [6, 7]].forEach(function (p, i) {
      pyre.push({ id: 'wood_' + (i + 1), at: p, prop: 'up_wood', solid: true, examine: [{ think: 'Firewood, stacked in a ring around the cuffs.' }] });
    });
    [[2, 7], [8, 3], [8, 7]].forEach(function (p, i) {
      pyre.push({ id: 'gas_' + (i + 1), at: p, prop: 'up_gascan', solid: true, examine: [{ think: 'Gasoline. The smell is everywhere.' }] });
    });
    UP.extras.redRoomPyre = pyre;
  })();
  /* ======================================================================
   * F2: contestant rooms (shared 8×8 template, personalised props)
   *   house_annette_room (1), house_carol_room (2), house_john_room (4), house_kessie_room (5),
   *   house_delphin_room (6), house_isaiah_room (7)
   * ------------------------------------------------------------------
   * North-side rooms (1,5,7) have their door in the SOUTH wall [4,9]; south-side rooms (2,4,6) in the NORTH wall [4,0].
   * exits: to_bedroom_hall   spawns: from_bedroom_hall (inside the door)
   * marks: door, bed (standing beside it), bed_lie, desk, center, window_spot (N-side rooms) / wardrobe
   * fixtures (all rooms): bed, nightstand, desk, wardrobe, ginerva_button, smoke_detector (hidden cam), tablet
   *          + personal: annette: knitting, teaset | carol: vanity, compact | john: ashtray, sweater_heap
   *          kessie: gloves, cleaning_kit | delphin: hair_dye, nail_polish | isaiah: book_stack, sneakers, book_open
   * ================================================================== */
  var PERSONAL = {
    annette: { num: 1, side: 'N', name: "Annette's Room", tint: '#5a4a7a', rug: '#6a5a8a', items: [
      { id: 'knitting', at: [3, 5], prop: 'up_knitting', solid: false, examine: [{ think: 'Lavender wool, half a scarf. The needles are very sharp.' }] },
      { id: 'teaset', at: [2, 7], prop: 'up_teaset', layer: 1, examine: [{ think: 'A little tea service. She brought her own cups somehow.' }] }] },
    carol: { num: 2, side: 'S', name: "Carol's Room", tint: '#7a3a5a', rug: '#a04a7a', items: [
      { id: 'vanity', at: [1, 7], prop: 'up_vanity', examine: [{ think: 'A vanity crowded with pink. Every bottle faces the camera.' }] },
      { id: 'compact', at: [2, 7], prop: 'up_compact', layer: 1, examine: [{ think: 'Her pink compact. The mirror is cracked.' }] }] },
    john: { num: 4, side: 'S', name: "John's Room", tint: '#4a4a3a', rug: '#5a5040', items: [
      { id: 'ashtray', at: [2, 7], prop: 'up_ashtray', layer: 1, examine: [{ think: 'An ashtray. Nobody here is allowed to smoke.' }] },
      { id: 'sweater_heap', at: [5, 6], prop: 'up_sweater_heap', solid: false, examine: [{ think: 'A beige sweater on the floor, too big for anyone.' }] }] },
    kessie: { num: 5, side: 'N', name: "Kessie's Room", tint: '#3a5a7a', rug: '#4a6a8a', items: [
      { id: 'gloves', at: [2, 7], prop: 'up_gloves', layer: 1, examine: [{ think: 'Yellow rubber gloves, folded neat as a flag.' }] },
      { id: 'cleaning_kit', at: [6, 7], prop: 'up_cleaning', examine: [{ think: 'Spray bottles, rags, bleach. The cleanest room in the House.' }] }] },
    delphin: { num: 6, side: 'S', name: "Delphin's Room", tint: '#2a4a7a', rug: '#2a5a8a', items: [
      { id: 'hair_dye', at: [2, 7], prop: 'up_hairdye', layer: 1, examine: [{ think: 'Bright blue dye and neon-green nail polish. Still him.' }] },
      { id: 'nail_polish', at: [6, 6], prop: 'up_sweater_heap', solid: false, draw: function (g, x, y) { px(g, x + 3, y + 8, 10, 6, '#e87a20'); px(g, x + 5, y + 10, 6, 1, '#1a1a1a'); }, examine: [{ think: 'An orange T-shirt: LET ME OUT.' }] }] },
    isaiah: { num: 7, side: 'N', name: "Isaiah's Room", tint: '#3a3a5a', rug: '#3a4a6a', items: [
      { id: 'book_stack', at: [6, 7], prop: 'up_bookstack', examine: [{ think: 'Library books, stacked by size. Books may not be removed from the library.' }] },
      { id: 'sneakers', at: [3, 6], prop: 'up_sneakers', solid: false, examine: [{ think: 'Red sneakers. "Kegs." Lined up exactly parallel.' }] },
      { id: 'book_open', at: [2, 7], prop: 'up_book', color: '#8a2a2a', layer: 1, examine: [{ think: 'A hardback, open face down to keep his place.' }] }] }
  };
  Object.keys(PERSONAL).forEach(function (who) {
    var P = PERSONAL[who], ID = 'house_' + who + '_room';
    var g = grid(10, 10, '#');
    fill(g, 1, 1, 8, 8, '.');
    var north = P.side === 'S'; // south-side rooms open to the hall through their NORTH wall
    var doorAt = north ? [4, 0] : [4, 9], inside = north ? [4, 1] : [4, 8];
    put(g, doorAt[0], doorAt[1], 'D');
    // bed: N-side rooms put it NE with a window N; S-side rooms put it SE (window-less, interior)
    var bedTop = north ? 5 : 1;
    put(g, 7, bedTop, 'y'); put(g, 7, bedTop + 1, 'b'); put(g, 7, bedTop + 2, 'b');
    put(g, 8, bedTop, 'y'); put(g, 8, bedTop + 1, 'b'); put(g, 8, bedTop + 2, 'b');
    put(g, 6, bedTop, 'n');
    if (!north) { put(g, 4, 0, 'W'); }
    put(g, 1, north ? 1 : 7, 'w'); put(g, 2, north ? 1 : 7, 'w'); put(g, 2, north ? 2 : 6, 'c');
    put(g, 1, north ? 7 : 1, 'A');
    fill(g, 3, 4, 3, 2, 'R');
    var deskY = north ? 1 : 7;
    var items = P.items.map(function (it) {
      var c = G.cloneDef(it);
      if (north) { // mirror the desk-row items to the north side
        if (c.at[1] === 7) c.at = [c.at[0], 1]; else if (c.at[1] === 6) c.at = [c.at[0], 3];
      }
      return c;
    });
    var marks = { door: inside, bed: [6, bedTop + 1], bed_lie: [7, bedTop + 1], desk: [2, north ? 2 : 6], center: [4, 4], wardrobe: [1, north ? 6 : 2] };
    if (!north) marks.window_spot = [4, 1];
    reg(ID, {
      name: P.name,
      tiles: rows(g),
      legend: { '#': 'up_wall', '.': 'up_floor', 'W': 'up_window_garden', 'y': 'up_bed_head_grey', 'b': 'up_bed_single', 'n': 'up_nightstand',
        'w': 'up_writing_desk', 'A': 'up_wardrobe', 'R': { tile: 'up_rug_' + who }, 'D': 'up_door_' + P.num },
      spawn: inside, spawns: { from_bedroom_hall: inside }, spawnFacing: { from_bedroom_hall: north ? 'down' : 'up' },
      marks: marks,
      ambient: 'hum', tint: P.tint, tintAlpha: 0.08, dark: 0.25, bg: '#07050a',
      lights: [{ at: [6, bedTop], r: 32 }, { at: [2, deskY], r: 36 }],
      blindSpots: [{ id: 'wardrobe_bs', at: marks.wardrobe, w: 1, h: 1, note: 'in front of the wardrobe (closet)' }],
      objects: [
        { id: 'bed', at: [7, bedTop + 1], examine: [{ think: 'Grey DPE linen, made with hospital corners.' }] },
        { id: 'nightstand', at: [6, bedTop], examine: [{ think: 'A lamp and an empty drawer. Same as mine.' }] },
        { id: 'desk', at: [1, deskY], examine: [{ think: 'A writing desk and a DPE pen.' }] },
        { id: 'wardrobe', at: [1, north ? 7 : 1], examine: [{ think: 'Grey sweatsuits, in someone else\'s size.' }] },
        { id: 'ginerva_button', at: [doorAt[0] + 1, doorAt[1]], prop: 'up_button_green', solid: false, examine: [{ think: 'SUMMON GINERVA.' }] },
        { id: 'tablet', at: [6, north ? 9 : 0], prop: 'up_tablet', solid: false, examine: [{ think: 'Curated memories for somebody else. It won\'t turn off either.' }] },
        { id: 'smoke_detector', at: [north ? 2 : 7, north ? 9 : 0], prop: 'up_smoke_eye', solid: false, cam: { angle: north ? 270 : 90, sweep: 0, range: 120, fov: 110 },
          examine: [{ think: 'The same smoke detector. The same little light.' }] }
      ].concat(items),
      exits: [exit(ID, 'house_bedroom_hall', doorAt, { lockedText: [{ think: 'Locked from the outside.' }] })]
    });
    var rugTiles = {}; rugTiles['up_rug_' + who] = { draw: (function (c) { return function (g2, x, y) { px(g2, x, y, T, T, shade(c, -0.2)); px(g2, x + 1, y + 1, T - 2, T - 2, c); px(g2, x + 6, y + 6, 4, 4, shade(c, 0.2)); }; })(P.rug) };
    G.shared.registerTiles(rugTiles);
  });

  /* ======================================================================
   * F2: house_luxury_room  (10×8, east end, door in the NORTH wall; NO CAMERAS at all)
   * ------------------------------------------------------------------
   * exits: to_bedroom_hall [5,0]   spawns: from_bedroom_hall [5,1] (down)
   * marks: bed [3,3], bed_lie [2,3], tub [8,6], center [5,4], door [5,1], couch [6,6]
   * fixtures: lux_bed, lux_tub, lux_flowers, lux_couch, lux_frame, lux_screen_off  (no camera: blind spot = whole room)
   * ================================================================== */
  (function () {
    var ID = 'house_luxury_room';
    var g = grid(12, 10, 'Z');
    fill(g, 1, 1, 10, 8, ',');
    put(g, 5, 0, 'D');
    put(g, 1, 2, 'y'); put(g, 2, 2, 'y'); put(g, 1, 3, 'b'); put(g, 2, 3, 'b'); put(g, 1, 4, 'b'); put(g, 2, 4, 'b');
    put(g, 9, 7, 'u'); put(g, 10, 7, 'u');
    put(g, 6, 7, 'h'); put(g, 7, 7, 'h');
    fill(g, 4, 3, 3, 3, 'R');
    reg(ID, {
      name: 'The Luxury Room',
      tiles: rows(g),
      legend: { 'Z': 'up_lux_wall', ',': 'up_lux_floor', 'D': 'up_door_lux', 'y': 'up_lux_head', 'b': 'up_bed_lux', 'u': 'up_tub', 'h': 'couch', 'R': 'rug' },
      spawn: [5, 1], spawns: { from_bedroom_hall: [5, 1] }, spawnFacing: { from_bedroom_hall: 'down' },
      marks: { bed: [3, 3], bed_lie: [2, 3], tub: [8, 7], center: [5, 4], door: [5, 1], couch: [6, 6] },
      noCameras: true,
      ambient: null, tint: '#c09040', tintAlpha: 0.1, dark: 0.15, bg: '#07050a',
      lights: [{ at: [5, 4], r: 70 }, { at: [2, 3], r: 36 }],
      blindSpots: [{ id: 'luxury_bs', at: [1, 1], w: 10, h: 8, note: 'no cameras, the whole room' }],
      objects: [
        { id: 'lux_bed', at: [2, 3], examine: [{ think: 'A bed like a cake. For one night, no one is watching me sleep.' }] },
        { id: 'lux_tub', at: [9, 7], examine: [{ think: 'A real bathtub. Hot water to the brim.' }] },
        { id: 'lux_couch', at: [6, 7], examine: [{ think: 'Velvet. It smells like money.' }] },
        { id: 'lux_flowers', at: [9, 1], prop: 'up_flowers_gold', examine: [{ think: 'Lilies. They make everything smell like a funeral.' }] },
        { id: 'lux_frame', at: [3, 0], prop: 'up_frame', solid: false, examine: [{ think: 'Even here, the Great Leader. But no lens behind him. I checked.' }] },
        { id: 'lux_screen_off', at: [8, 0], prop: 'up_wallscreen_off', solid: false, examine: [{ think: 'A dark screen. Dark, for once.' }] }
      ],
      exits: [exit(ID, 'house_bedroom_hall', [5, 0], { lockedText: [{ think: 'Not yet. One more minute.' }] })]
    });
  })();

  /* ======================================================================
   * F2: house_infirmary  (10×8, west end, door in the SOUTH wall)
   * ------------------------------------------------------------------
   * exits: to_bedroom_hall [5,9]   spawns: from_bedroom_hall [5,8] (up)
   * marks: cot_1..cot_6 (tile beside each cot, where a visitor stands), cot_1_bed..cot_6_bed (the cot itself:
   *        put a lying NPC there), medic [8,7], desk [8,6], behind_cots [2,1] (blind spot), center [5,5], door [5,8]
   * fixtures: cot_1..cot_6 (1×2 cots, top row), mat_* tiles, medic_desk, cabinet, cam_infirmary
   * blind spot: behind_cots_bs (row y=1 behind the cot heads)
   * ================================================================== */
  (function () {
    var ID = 'house_infirmary';
    var g = grid(12, 10, 'Q');
    fill(g, 1, 1, 10, 8, ':');
    put(g, 5, 9, 'D');
    var cotX = [2, 4, 6, 8, 2, 4], cotY = [2, 2, 2, 2, 5, 5];
    var objs = [], marks = { medic: [8, 7], desk: [9, 6], behind_cots: [2, 1], center: [6, 5], door: [5, 8] };
    for (var i = 0; i < 6; i++) {
      var x = cotX[i], y = cotY[i];
      put(g, x, y, 'z'); put(g, x, y + 1, 'z');          // solid under the cot
      put(g, x + 1, y + 1, 'M');                           // Soak It Up mat beside
      objs.push({ id: 'cot_' + (i + 1), at: [x, y], prop: 'up_cot', solid: true, layer: -1, examine: [{ think: 'A prison cot. Six of them. More cots than there are of us.' }] });
      marks['cot_' + (i + 1)] = [x + 1, y + 1]; marks['cot_' + (i + 1) + '_bed'] = [x, y + 1];
    }
    put(g, 9, 6, 'd'); put(g, 10, 6, 'd'); put(g, 10, 2, 'k'); put(g, 10, 3, 'k');
    objs.push(
      { id: 'medic_desk', at: [9, 6], examine: [{ think: "The medic's desk. A clipboard, a scanner, a bowl of lollipops." }] },
      { id: 'cabinet', at: [10, 2], examine: [{ think: 'Gauze, antiseptic, and a drawer of syringes labelled CHIP.' }] },
      { id: 'mats_sign', at: [7, 0], prop: 'up_sign', solid: false, label: '+', examine: [{ think: 'The mats say SOAK IT UP. Branded. Of course they are.' }] },
      cam('cam_infirmary', [8, 0], 110, { sweep: 40, range: 120, fov: 60 })
    );
    reg(ID, {
      name: 'Infirmary',
      tiles: rows(g),
      legend: { 'Q': 'whitewall', ':': 'up_cot_floor', 'D': 'up_door_infirmary', 'z': { tile: 'up_cot_under' }, 'M': 'up_mat', 'd': 'up_medic_desk', 'k': 'up_cabinet' },
      spawn: [5, 8], spawns: { from_bedroom_hall: [5, 8] }, spawnFacing: { from_bedroom_hall: 'up' },
      marks: marks,
      ambient: 'hum', tint: '#4a7a8a', tintAlpha: 0.1, dark: 0.2, bg: '#06080a',
      lights: [{ at: [5, 3], r: 64 }, { at: [9, 6], r: 36 }],
      blindSpots: [{ id: 'behind_cots_bs', at: [1, 1], w: 9, h: 1, note: 'behind the cot heads' }],
      objects: objs,
      exits: [exit(ID, 'house_bedroom_hall', [5, 9], { lockedText: [{ think: 'Not until the medic says so.' }] })]
    });
  })();

  /* ======================================================================
   * F2: house_screening_room  (8×6, door in the SOUTH wall)
   * ------------------------------------------------------------------
   * exits: to_bedroom_hall [4,7]   spawns: from_bedroom_hall [4,6] (up)
   * marks: seat_1..seat_9 (rows of 3: row 1 front y=3, row 3 back y=5... see below), screen [4,1] (stand facing it),
   *        trader [7,2] (beside the screen, for one-on-ones), door [4,6], face_cam [4,2]
   * fixtures: wall_screen (2 tiles, x3-4 on the north wall; animated), seat_1..9 (walkable seats), cam_face (in your face), cam_rear
   * ================================================================== */
  (function () {
    var ID = 'house_screening_room';
    var g = grid(10, 8, '#');
    fill(g, 1, 1, 8, 6, ',');
    fill(g, 2, 0, 6, 1, 'E');
    put(g, 4, 7, 'D');
    var objs = [], marks = { screen: [4, 1], trader: [8, 2], door: [4, 6], face_cam: [4, 2] }, n = 0;
    [3, 4, 5].forEach(function (y) {
      [2, 3, 6].forEach(function (x) {
        n++; put(g, x, y, 'c');
        marks['seat_' + n] = [x, y];
      });
    });
    objs.push(
      { id: 'wall_screen', at: [4, 0], examine: [{ think: 'The screen. They will show it to us again and again, until it is the only thing we remember.' }] },
      cam('cam_face', [5, 2], 90, { prop: 'up_cam', sweep: 0, range: 64, fov: 80, examine: [{ think: 'A camera on a stalk, a foot from my face. They want my face more than the execution.' }] }),
      cam('cam_rear', [8, 6], 225, { sweep: 20, range: 120, fov: 60 })
    );
    for (var k = 1; k <= 9; k++) objs.push({ id: 'seat_' + k, at: marks['seat_' + k], examine: [{ think: 'A plush red seat, like a cinema. Nobody brought popcorn.' }] });
    reg(ID, {
      name: 'Screening Room',
      tiles: rows(g),
      legend: { '#': 'up_wall', ',': 'up_carpet', 'E': 'screen', 'c': 'up_screen_seat', 'D': 'up_door_screening' },
      spawn: [4, 6], spawns: { from_bedroom_hall: [4, 6] }, spawnFacing: { from_bedroom_hall: 'up' },
      marks: marks,
      ambient: 'static', tint: '#1a2a4a', tintAlpha: 0.15, dark: 0.55, playerLight: 26, bg: '#040408',
      lights: [{ at: [4, 1], r: 72, flicker: true }],
      objects: objs,
      exits: [exit(ID, 'house_bedroom_hall', [4, 7], { lockedText: [{ think: 'They aren\'t done showing us.' }] })]
    });
  })();
})();
