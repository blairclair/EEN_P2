/* =========================================================================
 * ch11 "The Maze": Competition 3 (Mon 29 Jan 2084)
 *
 * A real playable labyrinth (35x23, seeded DFS with loops and dead ends) holds
 * three section doors and the egg-shaped centre:
 *   Section Two "The Trial": mirror anteroom, insult hall, recall minigame at the platform
 *   Section One "Crime and Punishment": four exhibit rooms, the King Bear quiz, the pen
 *   Section Three "Love": key behind the screen, pink junk room with videos, Delphin's
 *     scream, kick QTE (ankle), children's room (Waverly / Salina), table push and stack,
 *     the fall, the button spot-the-difference, Delphin's vase injury, insert keys
 *   Hobble with Delphin to the centre; "Together"; gas.
 * Navigation: tilt candelabras to mark the way (they stay tilted), TAB toggles
 * "hand on the wall" (auto-follow the left wall), the "Double trouble" rhyme at forks.
 *
 * Cross-chapter flags (CHAPTERS.md §2)
 *   reads : m_delphin (warmth lines), m_audience, f_note2_decoded (Waverly video thought),
 *           f_attacked_annette (Annette's sneer), f_kessie_secret_told (Luna's guilt)
 *   writes: f_has_pen, f_carried_delphin (always true), m_delphin +10, m_isaiah -5,
 *           m_audience (via api.approval* only)
 * Local flags: ch11_*
 * ========================================================================= */
(function () {
  'use strict';
  var G = window.G;
  var T = 16;

  /* ---------------------------------------------------------------- state
   * Per-run state lives in this closure and is reset in start() (never mutate map defs). */
  var S = {};
  function resetState() {
    S = {
      tilt: {}, tilted: 0, wall: false, tabWas: false, doorStop: null,
      follow: false, lastPt: null, steps: 0,
      keysRisen: false, bear: { stand: 0, eyes: null }, holes: 0,
      big: [5, 4], smallCarried: false, stacked: false, broken: false,
      panelOpen: false, quizTaken: false, hobbleTalk: 0
    };
  }
  resetState();

  /* ---------------------------------------------------------------- pixel helpers */
  function px(g, x, y, w, h, c) { g.fillStyle = c; g.fillRect(x, y, w, h); }
  function shade(c, k) { return G.util.shade(c, k); }
  /** Wall tile with a top (seen from above) and a 3/4 front face plus optional face decoration. */
  function wallTile(top, face, deco) {
    return {
      solid: true, wall: true,
      draw: function (g, x, y, info) {
        if (!info.face) { px(g, x, y, T, T, top); px(g, x, y, T, 1, shade(top, 0.12)); return; }
        px(g, x, y, T, T, face); px(g, x, y, T, 2, top); px(g, x, y + 2, T, 1, shade(face, 0.15));
        if (deco) deco(g, x, y, info);
        px(g, x, y + T - 3, T, 3, shade(face, -0.3)); px(g, x, y + T - 1, T, 1, 'rgba(0,0,0,0.45)');
      }
    };
  }

  /* ---------------------------------------------------------------- tiles */
  var TILES = {
    // the maze: impossibly white walls, mahogany carpet with roses
    mwall: wallTile('#c9c5ba', '#efede7', function (g, x, y, info) { px(g, x + 1, y + 4, 1, 9, '#e0ddd5'); if (info.r > 0.5) px(g, x + 9, y + 4, 1, 9, '#e4e1da'); }),
    rose: {
      draw: function (g, x, y, info) {
        px(g, x, y, T, T, '#4e1a14');
        px(g, x, y, T, 1, '#5a221a');
        var o = (info.tx + info.ty) % 2 ? 0 : 8;
        px(g, x + 3 + o / 2, y + 3, 3, 3, '#8a2a2e'); px(g, x + 4 + o / 2, y + 4, 1, 1, '#b84048'); px(g, x + 2 + o / 2, y + 6, 2, 1, '#2e4a24');
        px(g, x + 10 - o / 2, y + 10, 3, 3, '#8a2a2e'); px(g, x + 11 - o / 2, y + 11, 1, 1, '#b84048'); px(g, x + 13 - o / 2, y + 13, 2, 1, '#2e4a24');
      }
    },
    // the egg-shaped centre: cream walls wreathed in spiked ivy
    eggwall: wallTile('#b8ae94', '#ddd4bd', function (g, x, y, info) {
      for (var i = 0; i < 4; i++) { var xx = x + ((i * 5 + info.tx * 3) % 15); px(g, xx, y + 3 + i * 2, 2, 3, '#3a5a2a'); px(g, xx + 1, y + 2 + i * 2, 1, 1, '#5a8a3a'); }
      px(g, x, y + 3, T, 1, '#4a6a32');
    }),
    ivydoor: {
      draw: function (g, x, y) { px(g, x, y, T, T, '#120c08'); px(g, x, y, 2, T, '#3a5a2a'); px(g, x + 14, y, 2, T, '#3a5a2a'); px(g, x, y, T, 2, '#4a6a32'); }
    },
    finish: { color: '#2a2630', color2: '#3a3442', pattern: 'grid' },
    // section rooms
    bluewall: wallTile('#3a5a80', '#7aa8da'),
    cool: { color: '#a9c6dc', color2: '#93b2ca', pattern: 'tiles' },
    pinkwall: wallTile('#a04070', '#f27fb4', function (g, x, y, info) { if (info.r > 0.4) px(g, x + 3 + Math.floor(info.r * 8), y + 6, 3, 2, '#c03050'); }),
    pinkfloor: {
      draw: function (g, x, y, info) {
        px(g, x, y, T, T, '#f49cc2'); px(g, x, y + T - 1, T, 1, '#e48ab2');
        if (info.r > 0.55) px(g, x + 4, y + 6, 4, 3, '#d2405a');
        if (info.r < 0.2) px(g, x + 9, y + 10, 3, 2, '#8a5a3a');
      }
    },
    nurserywall: wallTile('#a89850', '#ecdc96', function (g, x, y) { px(g, x, y + 8, T, 2, '#9ad0e8'); px(g, x + 4, y + 8, 2, 2, '#e8889a'); }),
    nursery: { color: '#d9c9a6', color2: '#c4b28e', pattern: 'planks' },
    // Section One exhibit walls
    wall_isaiah: wallTile('#8a826a', '#ddd4ba', function (g, x, y, info) { px(g, x + 2, y + 5, 4, 4, '#f4f0e4'); px(g, x + 3, y + 6, 2, 2, '#6a4a3a'); if (info.r > 0.5) { px(g, x + 10, y + 7, 4, 4, '#f4f0e4'); px(g, x + 11, y + 8, 2, 2, '#4a3020'); } }),
    wall_delphin: wallTile('#1e3a7a', '#3a6ad8', function (g, x, y, info) { px(g, x + 3, y + 5, 5, 5, '#1a1410'); px(g, x + 4, y + 7, 3, 3, '#e8762a'); px(g, x + 5, y + 6, 1, 2, '#f8d040'); if (info.r > 0.4) { px(g, x + 10, y + 6, 4, 4, '#1a1410'); px(g, x + 11, y + 7, 2, 3, '#d84a1a'); } }),
    wall_luna: wallTile('#4a4a52', '#8e8e98'),
    wall_annette: wallTile('#2e1a18', '#5e3c38', function (g, x, y, info) { px(g, x + 3, y + 4, 3, 8, '#b8a888'); px(g, x + 3, y + 4, 3, 2, '#d8c8a8'); px(g, x + 4, y + 5, 1, 1, '#000'); px(g, x + 4, y + 8, 2, 2, '#6a1a1a'); if (info.r > 0.35) { px(g, x + 10, y + 5, 3, 8, '#a89878'); px(g, x + 10, y + 5, 3, 2, '#c8b898'); px(g, x + 11, y + 9, 2, 2, '#5a1010'); } }),
    wall_bears: wallTile('#a07888', '#efc0d0', function (g, x, y, info) { var o = info.tx % 2 ? 2 : 8; px(g, x + o, y + 6, 6, 5, '#9a6a3a'); px(g, x + o - 1, y + 5, 2, 2, '#9a6a3a'); px(g, x + o + 5, y + 5, 2, 2, '#9a6a3a'); px(g, x + o + 2, y + 8, 2, 1, '#2a1a10'); }),
    bearfloor: { color: '#d0a2b2', color2: '#bf8fa0', pattern: 'dots' },
    bearshelf: {
      solid: true, base: 'bearfloor',
      draw: function (g, x, y, info) {
        px(g, x, y + 1, T, 14, '#6a4a3a'); px(g, x, y + 8, T, 1, '#4a3020');
        var cols = ['#9a6a3a', '#c89a6a', '#7a4a2a', '#e8d0b0'];
        for (var i = 0; i < 2; i++) { var c = cols[(info.tx + i) % 4]; px(g, x + 2 + i * 7, y + 3, 5, 5, c); px(g, x + 2 + i * 7, y + 2, 1, 1, c); px(g, x + 6 + i * 7, y + 2, 1, 1, c); px(g, x + 3 + i * 7, y + 5, 1, 1, '#000'); px(g, x + 5 + i * 7, y + 5, 1, 1, '#000'); px(g, x + 2 + i * 7, y + 10, 5, 4, cols[(info.tx + i + 2) % 4]); }
      }
    }
  };

  /* ---------------------------------------------------------------- props */
  var PROPS = {
    candelabra: function (g, x, y, t, o) {
      var tilted = !!S.tilt[o.id];
      var fl = function (cx, cy, k) { var f = Math.sin(t * 9 + k * 2 + o.tx) > 0 ? '#ffd860' : '#ffa830'; px(g, cx, cy - 2, 1, 2, f); px(g, cx, cy - 3, 1, 1, '#fff4c0'); };
      px(g, x + 6, y + 11, 4, 2, '#7a5a1a'); // wall plate
      if (!tilted) {
        px(g, x + 7, y + 8, 2, 4, '#c9a24a');
        px(g, x + 3, y + 8, 10, 1, '#c9a24a');
        [3, 7, 12].forEach(function (cx, k) { px(g, x + cx, y + 5, 1, 3, '#f4f0e0'); fl(x + cx, y + 5, k); });
      } else {
        px(g, x + 7, y + 8, 2, 4, '#c9a24a');
        px(g, x + 3, y + 10, 3, 1, '#c9a24a'); px(g, x + 6, y + 9, 3, 1, '#c9a24a'); px(g, x + 9, y + 8, 3, 1, '#c9a24a'); px(g, x + 12, y + 7, 1, 1, '#c9a24a');
        px(g, x + 3, y + 7, 1, 3, '#f4f0e0'); fl(x + 4, y + 7, 0);
        px(g, x + 7, y + 5, 1, 3, '#f4f0e0'); fl(x + 8, y + 5, 1);
        px(g, x + 12, y + 4, 1, 3, '#f4f0e0'); fl(x + 13, y + 4, 2);
        px(g, x + 6, y + 12, 4, 1, '#e8323c'); // she knots a thread of her sleeve on it? no: a red glint of the tilt marker
      }
    },
    speaker: function (g, x, y) { px(g, x + 4, y + 4, 8, 7, '#2a2a30'); for (var i = 0; i < 3; i++) px(g, x + 5, y + 5 + i * 2, 6, 1, '#55555e'); },
    platform: function (g, x, y, t) {
      px(g, x, y + 3, T, 12, '#7a7884'); px(g, x, y + 3, T, 2, '#c9a24a'); px(g, x + 1, y + 13, 14, 2, '#4a4852');
      if (S.keysRisen) { var b = Math.sin(t * 3); [2, 6, 10].forEach(function (k) { px(g, x + k, y + 6 + b, 3, 3, '#e8c15a'); px(g, x + k + 1, y + 9 + b, 1, 3, '#e8c15a'); }); }
    },
    qplatform: function (g, x, y) { px(g, x + 1, y + 4, 14, 10, '#8a6a9a'); px(g, x + 2, y + 5, 12, 8, '#b08ac0'); px(g, x + 1, y + 13, 14, 1, '#5a4a62'); },
    kingbear: function (g, x, y, t) {
      var up = S.bear.stand ? 4 : 0;
      px(g, x + 2, y + 13, 12, 3, '#6a4a7a'); // dais
      px(g, x + 3, y + 6 - up, 10, 8 + up, '#8a5a2a'); // body
      px(g, x + 4, y + 1 - up, 8, 7, '#9a6a3a'); px(g, x + 3, y - up, 2, 2, '#9a6a3a'); px(g, x + 11, y - up, 2, 2, '#9a6a3a');
      px(g, x + 5, y - 3 - up, 6, 2, '#e8c15a'); px(g, x + 5, y - 4 - up, 1, 1, '#e8c15a'); px(g, x + 8, y - 4 - up, 1, 1, '#e8c15a'); px(g, x + 10, y - 4 - up, 1, 1, '#e8c15a');
      var eye = S.bear.eyes === 'g' ? '#40ff70' : S.bear.eyes === 'r' ? '#ff3040' : '#000';
      px(g, x + 6, y + 3 - up, 1, 1, eye); px(g, x + 9, y + 3 - up, 1, 1, eye);
      px(g, x + 6, y + 6 - up, 4, 1, '#111'); // slot mouth
      if (S.bear.stand) { px(g, x + 1, y + 2 - up, 2, 6, '#8a5a2a'); px(g, x + 13, y + 7 - up, 2, 4, '#8a5a2a'); }
    },
    teddy: function (g, x, y, t, o) {
      var c = ['#9a6a3a', '#c89a6a', '#7a4a2a', '#d8b890'][(o.tx + o.ty) % 4];
      px(g, x + 4, y + 8, 8, 6, c); px(g, x + 5, y + 3, 6, 5, c); px(g, x + 4, y + 2, 2, 2, c); px(g, x + 10, y + 2, 2, 2, c);
      px(g, x + 6, y + 5, 1, 1, '#000'); px(g, x + 9, y + 5, 1, 1, '#000'); px(g, x + 7, y + 6, 2, 1, (o.tx % 2) ? '#5a0a10' : '#2a1a10');
    },
    pen: function (g, x, y, t) { var b = Math.sin(t * 3) * 0.5; px(g, x + 4, y + 9 + b, 8, 1, '#1a1a6a'); px(g, x + 11, y + 9 + b, 1, 1, '#c9a24a'); px(g, x + 4, y + 10 + b, 8, 1, '#0a0a3a'); },
    camdot: function (g, x, y) { px(g, x + 6, y + 5, 4, 4, '#2a2a30'); px(g, x + 7, y + 6, 2, 2, '#ff3040'); },
    mugshot: function (g, x, y, t, o) {
      px(g, x + 2, y + 2, 12, 11, '#e8e4d8'); px(g, x + 3, y + 3, 10, 8, '#5a6a7a');
      var sk = { mug_isaiah: '#5e3a24', mug_delphin: '#ecc9a2', mug_luna: '#f2cdb0', mug_annette: '#f2d8c8' }[o.id] || '#d8a888';
      var hr = { mug_isaiah: '#120c08', mug_delphin: '#2a9cf0', mug_luna: '#c4462a', mug_annette: '#f4f4f0' }[o.id] || '#333';
      px(g, x + 6, y + 4, 4, 5, sk); px(g, x + 6, y + 3, 4, 2, hr); px(g, x + 5, y + 9, 6, 2, '#e8752a');
      px(g, x + 3, y + 11, 10, 1, '#222');
    },
    firephoto: function (g, x, y, t) { px(g, x + 3, y + 3, 10, 9, '#f2eee4'); px(g, x + 4, y + 4, 8, 7, '#1a1410'); var f = Math.sin(t * 6) > 0 ? '#f0a020' : '#e8602a'; px(g, x + 6, y + 7, 4, 4, f); px(g, x + 7, y + 5, 2, 2, '#f8e060'); },
    clipping: function (g, x, y) { px(g, x + 3, y + 5, 9, 7, '#e8e2d0'); px(g, x + 4, y + 6, 7, 1, '#333'); px(g, x + 4, y + 8, 5, 1, '#777'); px(g, x + 4, y + 10, 6, 1, '#777'); px(g, x + 6, y + 4, 8, 6, 'rgba(230,224,210,0.9)'); px(g, x + 7, y + 5, 6, 1, '#333'); },
    junk: function (g, x, y, t, o) {
      var k = o.id.charCodeAt(o.id.length - 1);
      var cols = ['#7a6a5a', '#c8b8a0', '#5a7a9a', '#a85a4a', '#e8d8a0', '#6a8a5a'];
      px(g, x + 1, y + 8, 14, 7, '#5a4a40');
      for (var i = 0; i < 6; i++) px(g, x + 1 + ((i * 5 + k) % 11), y + 4 + ((i * 3 + k) % 7), 4, 3, cols[(i + k) % 6]);
      if (S['junk_' + o.id]) px(g, x + 1, y + 14, 14, 1, '#e8323c');
    },
    vase: function (g, x, y) { px(g, x + 6, y + 4, 4, 2, '#3a7ab0'); px(g, x + 5, y + 6, 6, 7, '#4a8ac8'); px(g, x + 6, y + 8, 4, 1, '#e8e8f0'); px(g, x + 5, y + 13, 6, 1, '#2a5a8a'); },
    shards: function (g, x, y) { px(g, x + 3, y + 10, 2, 1, '#4a8ac8'); px(g, x + 8, y + 12, 3, 1, '#4a8ac8'); px(g, x + 12, y + 9, 1, 2, '#4a8ac8'); px(g, x + 5, y + 7, 7, 4, '#6a0a12'); px(g, x + 10, y + 11, 3, 2, '#6a0a12'); },
    table_big: function (g, x, y) {
      px(g, x + 1, y + 5, 14, 6, '#8a6038'); px(g, x + 1, y + 5, 14, 1, '#a87a4a'); px(g, x + 2, y + 11, 2, 4, '#5a3a20'); px(g, x + 12, y + 11, 2, 4, '#5a3a20');
      if (S.stacked && !S.broken) { px(g, x + 4, y - 2, 8, 4, '#9a7048'); px(g, x + 4, y - 2, 8, 1, '#b8885a'); px(g, x + 5, y + 2, 1, 3, '#6a4a2a'); px(g, x + 10, y + 2, 1, 3, '#6a4a2a'); }
      if (S.broken) { px(g, x + 1, y + 9, 6, 2, '#5a3a20'); px(g, x + 9, y + 11, 6, 2, '#5a3a20'); }
    },
    table_small: function (g, x, y) { px(g, x + 3, y + 7, 10, 4, '#9a7048'); px(g, x + 3, y + 7, 10, 1, '#b8885a'); px(g, x + 4, y + 11, 1, 4, '#6a4a2a'); px(g, x + 11, y + 11, 1, 4, '#6a4a2a'); },
    ceilkeys: function (g, x, y, t) { if (S.broken) return; var s = Math.sin(t * 4) > 0; px(g, x + 4, y + 2, 3, 2, '#e8c15a'); px(g, x + 9, y + 3, 3, 2, '#e8c15a'); if (s) { px(g, x + 5, y, 1, 5, '#fff'); px(g, x + 3, y + 2, 5, 1, '#fff'); } },
    keyholes: function (g, x, y) { px(g, x + 1, y + 11, 14, 4, '#20283a'); for (var i = 0; i < 3; i++) px(g, x + 3 + i * 4, y + 12, 2, 2, i < S.holes ? '#e8c15a' : '#05070c'); },
    redbutton: function (g, x, y, t) { px(g, x + 4, y + 6, 8, 6, '#3a3a44'); px(g, x + 5, y + 7, 6, 4, Math.sin(t * 3) > 0 ? '#ff3040' : '#c8202c'); },
    wallpanel: function (g, x, y, t) { if (!S.panelOpen) { px(g, x + 3, y + 4, 10, 9, 'rgba(160,60,100,0.35)'); return; } px(g, x + 3, y + 4, 10, 9, '#2a0a1a'); if (!S.panelKeyTaken) { var b = Math.sin(t * 4); px(g, x + 6, y + 7 + b, 3, 3, '#e8c15a'); px(g, x + 9, y + 8 + b, 3, 1, '#e8c15a'); } },
    ivy: function (g, x, y, t) {
      px(g, x, y - 4, T, T + 4, '#5a3a22'); px(g, x + 2, y - 2, 12, T, '#7a5232'); px(g, x + 2, y - 2, 12, 1, '#9a6a42');
      px(g, x + 4, y + 1, 8, 5, '#6a4628'); px(g, x + 4, y + 8, 8, 5, '#6a4628'); px(g, x + 11, y + 7, 2, 2, '#e8c15a');
      for (var i = 0; i < 8; i++) { px(g, x + (i % 2 ? 13 : 0), y - 3 + i * 2, 3, 2, '#3a6a2a'); px(g, x + (i % 2 ? 15 : 0), y - 3 + i * 2, 1, 1, '#8ac05a'); }
      px(g, x, y - 4, T, 2, '#3a6a2a');
    },
    gas: function (g, x, y, t) { g.globalAlpha = 0.35 + 0.15 * Math.sin(t * 2); px(g, x, y, T, T, '#e8f0e8'); g.globalAlpha = 1; }
  };

  /* ---------------------------------------------------------------- the maze */
  // Generated once (seed 23 DFS on 17x11 cells + 9 loops, 15 dead ends). Centre block = eggwall 'Y'.
  // Doors: (5,0) Section Two, (34,5) Section One, (27,22) Section Three, (17,14) the centre.
  var MAZE_RAW = [
    '#####D#############################',
    '#.....#...#.......#.......#.#.....#',
    '###.#.#.#.#.#####.#.#####.#.#.###.#',
    '#...#...#.#.#...#.......#.#...#...#',
    '#.#####.#.#.#.#.#####.#.#.#####.#.#',
    '#.#...#.#...#.#...#.......#.....#.D',
    '#.#.#.#.#####.###.#.#######.#####.#',
    '#...#.#.....#...#...#.....#.....#.#',
    '#.#.#.#.#.###.#######.###.#.###.#.#',
    '#.#...#.#.#...#######...#.#.#...#.#',
    '#.#.#####.#.#########.#.###.#.###.#',
    '#.#.#.....#...#######.#.#.......#.#',
    '#.#.###.#.#.#.#######.#.#.#####.#.#',
    '#.#...#.......#######.#.#.#...#.#.#',
    '#.###.#######.###D#####.#.#.#.#.#.#',
    '#...#...#...#.........#.#.#.#...#.#',
    '#######.#.#.#########.#.#.###.#.###',
    '#.....#...#.......#...#...#...#...#',
    '#.###.###########.#.#####.#.#####.#',
    '#.#.#.#...........#.#...#...#.....#',
    '#.#.#.#.#####.#####.#.#.#####.###.#',
    '#@#.....#.............#.......#...#',
    '###########################D#######'
  ];
  var MAZE = MAZE_RAW.map(function (row, y) {
    if (y < 8 || y > 14) return row;
    return row.split('').map(function (c, x) { return (x >= 14 && x <= 20 && c === '#') ? 'Y' : c; }).join('');
  });
  function mz(x, y) { return (MAZE[y] || '').charAt(x) || '#'; }
  function open(c) { return c === '.' || c === '@'; }
  function degree(x, y) { var n = 0; [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) { if (mz(x + d[0], y + d[1]) !== '#' && mz(x + d[0], y + d[1]) !== 'Y') n++; }); return n; }
  // Candelabras: on wall tiles whose face shows (floor below), every 3rd tile and at every junction.
  var CANDLES = [];
  for (var cy = 0; cy < MAZE.length - 1; cy++) {
    for (var cx = 0; cx < MAZE[cy].length; cx++) {
      if (mz(cx, cy) !== '#' || !open(mz(cx, cy + 1))) continue;
      var junction = degree(cx, cy + 1) >= 3;
      if (junction || (cx + cy) % 3 === 0) CANDLES.push({ id: 'cdl_' + cx + '_' + cy, at: [cx, cy], junction: junction });
    }
  }
  var DIRS = { up: [0, -1], right: [1, 0], down: [0, 1], left: [-1, 0] }, ORDER = ['up', 'right', 'down', 'left'];
  var DIRNAME = { up: 'the path ahead of me', right: 'the right-hand path', down: 'the way behind me', left: 'the left-hand path' };

  function candleHandler(c) {
    return async function (api) {
      if (c.junction && S.tilt[c.id] == null) {
        var i = await api.choice([
          'Tilt it. Mark this junction.',
          '"Double trouble, choose your bubble…" (Let the rhyme pick.)',
          'Leave it.'
        ]);
        if (i === 1) { await rhyme(api); return; }
        if (i === 2) return;
      }
      S.tilt[c.id] = !S.tilt[c.id];
      if (S.tilt[c.id]) S.tilted++;
      api.sound(S.tilt[c.id] ? 'confirm' : 'cancel');
      if (!api.get('ch11_tiltTaught')) {
        api.set('ch11_tiltTaught', true);
        await api.think(['I press down on the top of the candelabra. It tilts slightly to the right.', 'Relief. A marker. Every tilted one is a place I have already been.']);
      }
    };
  }
  async function rhyme(api) {
    var t = api.playerTile(), opts = [];
    ORDER.forEach(function (d) { var v = DIRS[d]; var c = mz(t.x + v[0], t.y + v[1]); if (c !== '#' && c !== 'Y') opts.push(d); });
    if (!opts.length) opts = ['down'];
    var pick = opts[Math.floor(Math.random() * opts.length)];
    await api.think(['"Double trouble, choose your bubble…" An old nursery rhyme, to calm my nerves.', 'My finger lands on ' + DIRNAME[pick] + '.']);
    api.face('player', pick);
  }

  var maze = {
    name: 'The Maze',
    tiles: MAZE,
    legend: { '#': 'mwall', '.': 'rose', '@': { tile: 'rose', spawn: true }, 'Y': 'eggwall' },
    ambient: 'hum', vignette: 0.5, bg: '#efede7',
    objects: CANDLES.map(function (c) { return { id: c.id, at: c.at, prop: 'candelabra', solid: true, layer: 1, examine: candleHandler(c) }; })
      .concat([
        { id: 'mz_cam1', at: [9, 0], prop: 'camera' }, { id: 'mz_cam2', at: [25, 0], prop: 'camera' },
        { id: 'mz_ivyhint', at: [16, 14], examine: [{ think: 'The walls here are different. Cream, not white, and wreathed in spiked ivy. Whatever is in the middle, this is the outside of it.' }] }
      ]),
    exits: [
      { id: 'to_trial', at: [5, 0], to: 'trial_ante', toAt: [3, 3], facing: 'up' },
      { id: 'to_crime', at: [34, 5], to: 'crime_ante', toAt: [3, 3], facing: 'up',
        locked: '!ch11_trialKey', lockedText: [{ think: ['SECTION ONE: CRIME AND PUNISHMENT, etched above the door. The handle will not turn.', 'A brass plate under it: TRIAL KEY REQUIRED. So the order is theirs, not mine.'] }] },
      { id: 'to_love', at: [27, 22], to: 'love_main', toAt: [5, 6], facing: 'up',
        locked: '!ch11_crimeKey', lockedText: [{ think: ['SECTION 3: LOVE. Well, it doesn\'t get more ominous than that.', 'Locked. The plate under the handle wants a key from Crime and Punishment.'] }] },
      { id: 'to_centre', at: [17, 14], to: 'maze_centre', toAt: [6, 12], facing: 'up',
        locked: '!ch11_loveDone', lockedText: [{ think: ['A grand archway in the ivy wall. Sealed tight.', 'The centre. I can feel it. But not yet: not without every key.'] }] }
    ]
  };

  /* ---------------------------------------------------------------- Section Two: The Trial */
  function ante(name, exitTo, exitAt, lockFlag, back) {
    return {
      name: name,
      tiles: ['QQMQDQQ', 'Q:::::Q', 'Q:::::Q', 'Q:::::Q', 'QQQDQQQ'],
      ambient: 'hum', vignette: 0.35,
      objects: [{ id: lockFlag.replace('ch11_', ''), at: [2, 0] }],
      exits: [
        { id: 'in_' + name.replace(/\W/g, ''), at: [4, 0], to: exitTo, toAt: exitAt, facing: 'right', locked: '!' + lockFlag, lockedText: [{ think: 'The mirror first. They always leave instructions.' }] },
        { id: 'out_' + name.replace(/\W/g, ''), at: [3, 4], to: 'maze', toAt: back.at, facing: back.facing }
      ]
    };
  }
  var trial_ante = ante('Section Two: Anteroom', 'trial_hall', [1, 2], 'ch11_mirrorTrial', { at: [5, 1], facing: 'down' });
  var crime_ante = ante('Section One: Anteroom', 'crime_wing', [1, 8], 'ch11_mirrorCrime', { at: [33, 5], facing: 'left' });

  var INSULTS = [
    { x: 3, who: 'A SHRILL VOICE', text: '"Freaks! No good criminals, all of you. Wasting your lives. You should be put down like the animals you are!"' },
    { x: 6, who: 'A DEEP VOICE', text: '"You\'re selfish. No one will ever love you. You\'re not capable of being loved."' },
    { x: 9, who: 'A CHILD\'S VOICE', text: '"My mommy said I should work hard to avoid being like you."' },
    { x: 12, who: 'A VOICE', text: '"Monster! Look at her face. That\'s what a monster looks like up close."' },
    { x: 15, who: 'A VOICE', text: '"Whore!"' },
    { x: 18, who: 'AN OLD MAN\'S VOICE', text: '"Murderer. That\'s all you are. A murderer in a sweatsuit."' },
    { x: 21, who: 'A VOICE', text: '"Do society a favor and kill yourself!"' },
    { x: 24, who: 'A SOFT VOICE', text: '"I bet you\'ve hurt so many people. I bet you loved it."' },
    { x: 27, who: 'A BORED VOICE', text: '"Waste of air. Change the channel."' },
    { x: 30, who: 'MANY VOICES', text: '"Freaks! Monster! Whore! Murderer!"' }
  ];
  var trial_hall = {
    name: 'The Trial',
    tiles: [
      'QQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQ',
      'QQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQ::::::Q',
      'D::::::::::::::::::::::::::::::::::::Q',
      'Q::::::::::::::::::::::::::::::::::::Q',
      'QQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQ::::::Q',
      'QQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQ'
    ],
    ambient: 'static', tint: '#402030', tintAlpha: 0.1, vignette: 0.6,
    objects: [4, 10, 16, 22, 28].map(function (x) { return { id: 'spk' + x, at: [x, 1], prop: 'speaker', examine: 'A speaker grille, warm to the touch.' }; })
      .concat([
        { id: 'platform', at: [34, 2], prop: 'platform' },
        { id: 'th_cam', at: [33, 0], prop: 'camera' }
      ]),
    zones: INSULTS.map(function (ins, i) {
      return { id: 'ins' + i, at: [ins.x, 2], w: 1, h: 2, if: '!ch11_trialKey', run: async function (api) {
        api.sound(i % 3 === 0 ? 'static' : 'buzzer');
        if (i === 0 || i === 9) api.shake(300, 2);
        await api.say('VOICE', ins.text, { name: ins.who, portrait: false });
        if (i === 2) await api.think('Tears I don\'t remember shedding streak my face. Pay attention to what is being said. Hands down. Keep walking.');
        if (i === 6) await api.think('I press myself to the cool tile like it can anchor me against the storm.');
      } };
    }),
    exits: [{ id: 'hall_out', at: [0, 2], to: 'trial_ante', toAt: [4, 1], facing: 'down' }]
  };

  /* ---------------------------------------------------------------- Section One: Crime and Punishment */
  var crime_wing = {
    name: 'Crime and Punishment',
    tiles: [
      'w1111111w2222222w3333333w4444444w5555555555w',
      'wrrrrrrrwrrrrrrrwrrrrrrrwrrrrrrrwzzzzpppzzzw',
      'wrrrrrrrwrrrrrrrwrrrrrrrwrrrrrrrwppppppppppw',
      'wrrTTTrrwrrTTTrrwrrTTTrrwrrTTTrrwppppppppppw',
      'wrrrrrrrwrrrrrrrwrrrrrrrwrrrrrrrwppppppppppw',
      'wrrrrrrrwrrrrrrrwrrrrrrrwrrrrrrrwppppppppppw',
      'wrrrrrrrwrrrrrrrwrrrrrrrwrrrrrrrwppppppppppw',
      'wwwwDwwwwwwwDwwwwwwwDwwwwwwwDwwwwppppppppppw',
      'DrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrDppppppppppw',
      'wrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrwppppppppppw',
      'wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww'
    ],
    legend: { 'w': 'mwall', 'r': 'rose', '1': 'wall_isaiah', '2': 'wall_delphin', '3': 'wall_luna', '4': 'wall_annette', '5': 'wall_bears', 'p': 'bearfloor', 'z': 'bearshelf' },
    ambient: 'hum', vignette: 0.5,
    objects: [
      // Isaiah
      { id: 'mug_isaiah', at: [4, 0], prop: 'mugshot', examine: [{ think: ['A blown-up mug shot of Isaiah. Hands in chains, eyes so red they are practically purple.', 'He looks completely broken.'] }] },
      { id: 'ph_isaiah1', at: [2, 0], prop: 'photo', examine: [{ think: ['Isaiah and a boy I recognise from the graffiti. Joe.', 'This isn\'t the Isaiah I know. This one is so much happier, hand in hand with the boy he loved. I didn\'t know he could smile like that.'] }] },
      { id: 'ph_isaiah2', at: [6, 0], prop: 'photo', examine: [{ think: 'True happiness is so hard to find in this world. Two people in love had it, and someone yanked it out from under them. The fury surprises me. Breathe. Later.' }] },
      { id: 'clip_isaiah', at: [4, 3], examine: async function (api) {
        await api.note({ title: 'When the Wealthy aren\'t Healthy', text: 'The Tale of an Overprivileged Scion and His Journey into Depravity. (A cartoon Isaiah scowls underneath, nostrils flaring.)' });
        await api.note({ title: 'COURT TRANSCRIPT (excerpt)', text: 'The accused is convicted under Morality Statute 14: "Two people of the same gender who bed each other are violating the will of the many." The court commends the father for the courage to turn in his own son.' });
        api.set('ch11_sawIsaiah', true);
        await api.think('Someone did that to their own child. I knew it from Trader\'s interview. It still doesn\'t fit inside my head.');
      } },
      // Delphin
      { id: 'mug_delphin', at: [12, 0], prop: 'mugshot', examine: [{ think: 'Delphin\'s mug shot. Mouth open in a wide grin, pupils huge, eyeliner leaking so he seems to cry blood. Truly a clown.' }] },
      { id: 'fire1', at: [10, 0], prop: 'firephoto', examine: 'Photos of things on fire. Dumpsters first, then whole buildings. The flames almost seem to wave at me.' },
      { id: 'fire2', at: [14, 0], prop: 'firephoto', examine: 'Government buildings, burning after dark. Never with anyone inside.' },
      { id: 'clip_delphin', at: [12, 3], examine: async function (api) {
        await api.note({ title: 'Mysterious Arsonist Strikes Again', text: 'Fanning the Flames of Resentment Through Our Communities. (An unknown vigilante sets fire to government buildings. Always after dark. Never with people inside.)' });
        await api.note({ title: 'ARSONIST CAUGHT', text: 'Sending Company Christmas Party Up in Flames. 4 Dead and 12 Hospitalized.' });
        api.set('ch11_sawDelphin', true);
        await api.think(api.get('m_delphin', 15) >= 40
          ? ['Poor Delphin. I don\'t believe for a second he meant to hurt anyone. Wrong place, wrong time.', 'That haunted look behind his eyes. I always blamed Columbus for it. Now I wonder how often he lies awake hearing the screams.']
          : ['Four dead. Twelve in the hospital. The boy who taught us to get past the door sensor.', 'I don\'t believe he meant it. I don\'t think I know him well enough anymore to be sure.']);
      } },
      // Luna
      { id: 'mug_luna', at: [20, 0], prop: 'mugshot', examine: [{ think: 'My own face. The night they took me. I look like someone who expected it.' }] },
      { id: 'clip_luna', at: [20, 3], examine: async function (api) {
        await api.note({ title: 'WOMAN CHARGED WITH MURDER OF UNBORN CHILD', text: 'Three months along, prosecutors say. Found at an unlicensed clinic beneath the Fourth Street alley.' });
        await api.think('No need to examine the exhibits. I am already intimately familiar with my own story.');
      } },
      { id: 'luna_poster', at: [18, 7], prop: 'poster', examine: async function (api) {
        await api.note({ title: 'CONTESTANT #9: LUNA BARTLEY', text: 'Crime: the murder of an unborn child (three months\' gestation). "Every life is the nation\'s life."' });
        await api.think('They put it out here in the hall, too. In case anyone walked past my door.');
      } },
      // Annette
      { id: 'mug_annette', at: [28, 0], prop: 'mugshot', examine: [{ think: 'Annette\'s mug shot is the closest to how I knew her. That serene grandmotherly smile. Her cane is missing; she is gripping an arm for balance.' }] },
      { id: 'needle_photo', at: [26, 0], prop: 'photo', examine: [{ think: 'Annette crouched over a body, needle in hand, her arm caught in a True Believer\'s grip. Her face is alight with fiendish glee.' }] },
      { id: 'corpses', at: [30, 0], prop: 'photo', examine: [{ think: ['Horribly desiccated corpses on every wall. Not a single one of them the same person.', 'She\'s sick. How did I never notice? If I had, Kessie might not have-', 'Useless. Tuck it away. Deal with it later.'] }] },
      { id: 'clip_annette', at: [28, 3], examine: async function (api) {
        await api.note({ title: 'WHO IS KILLING OUR GREAT MEN?', text: 'A mysterious murderer of powerful men: politicians, executives. Police now believe the killer posed as a maid and took jobs in the victims\' houses before striking.' });
        api.set('ch11_sawAnnette', true);
        await api.think(['Breathe. Think of Waverly. Breathe again. Waverly. Okay, now keep going.', 'You\'re not a human, you\'re a toaster and toasters don\'t feel, they just toast. That\'s how you get through this. Toast some bread and move on.']);
      } },
      { id: 'cw_cam', at: [8, 7], prop: 'camera' },
      // the teddy-bear room
      { id: 'kingbear', at: [38, 2], prop: 'kingbear', examine: [{ think: 'The King. A crowned bear on a dais, its mouth a perfect straight slot. Robotic. Perfect for a sheet of paper.' }] },
      { id: 'qplatform', at: [38, 6], prop: 'qplatform', solid: false, examine: [{ think: 'A raised platform under a square in the ceiling.' }] },
      { id: 'td1', at: [34, 4], prop: 'teddy', examine: 'Big bears, little bears, grinning bears, gaping bears.' },
      { id: 'td2', at: [42, 4], prop: 'teddy', examine: 'Its glass eyes follow you. Of course they do. One of them is probably a lens.' },
      { id: 'td3', at: [34, 8], prop: 'teddy', examine: 'Worse than the doll room. At least the dolls could pass for people if you squint and smash your head against the wall.' },
      { id: 'td4', at: [42, 8], prop: 'teddy', examine: 'Somebody designed this room. That person should be on the show with us.' },
      { id: 'td5', at: [36, 9], prop: 'teddy' }, { id: 'td6', at: [40, 9], prop: 'teddy' },
      { id: 'camdot', at: [41, 0], prop: 'camdot', examine: [{ think: 'A camera dot in the corner. Solid red, not flashing. Recording, not watching. Nobody is looking at me live.' }] }
    ],
    zones: [
      { id: 'luna_door', at: [20, 7], run: async function (api) {
        if (api.get('ch11_lunaRoomOk')) return;
        await api.think('The next room is mine. I hadn\'t expected that. For some reason I\'d been certain I\'d be last.');
        var i = await api.choice(['Go in.', 'No. I know my own story.']);
        if (i === 0) { api.set('ch11_lunaRoomOk', true); return; }
        await api.movePlayer([20, 8]);
        api.face('player', 'right');
      } },
      { id: 'bearexit', at: [32, 8], if: 'ch11_quizDone', run: async function (api) { api.set('ch11_leftBear', true); } }
    ],
    exits: [{ id: 'wing_out', at: [0, 8], to: 'crime_ante', toAt: [4, 1], facing: 'down' }]
  };

  /* ---------------------------------------------------------------- Section Three: Love */
  var love_main = {
    name: 'Section 3: Love',
    tiles: ['vvDvEEEvDvv', 'vcccccccccv', 'vcccccccccv', 'vcccccccccv', 'vcccccccccv', 'vcccccccccv', 'vcccccccccv', 'vvvvvDvvvvv'],
    legend: { 'v': 'bluewall', 'c': 'cool' },
    ambient: 'hum', vignette: 0.4,
    objects: [
      { id: 'redbutton', at: [7, 0], prop: 'redbutton' },
      { id: 'tape_key', at: [4, 0] },
      { id: 'keyholes', at: [5, 0], prop: 'keyholes', solid: true },
      { id: 'lm_cam', at: [10, 0], prop: 'camera' }
    ],
    zones: [{ id: 'kickzone', at: [8, 1], if: 'ch11_heardScream && !ch11_doorKicked' }],
    exits: [
      { id: 'to_pink', at: [2, 0], to: 'love_pink', toAt: [5, 6], facing: 'up', locked: '!ch11_trapPlayed', lockedText: [{ think: 'That big red button is begging to be pressed first.' }] },
      { id: 'to_kids', at: [8, 0], to: 'love_children', toAt: [5, 6], facing: 'up', locked: '!ch11_doorKicked',
        lockedText: async function (api) {
          if (api.get('ch11_heardScream')) await api.think('Locked. "Delphin!" Kick it. KICK IT.');
          else await api.think(['Locked. Behind it, through the wood, a child\'s voice.', 'My heart stops. I know every voice that age. It\'s not hers. It\'s not hers.']);
        } },
      { id: 'love_out', at: [5, 7], to: 'maze', toAt: [27, 21], facing: 'up', locked: '!ch11_loveDone', lockedText: [{ think: 'Not without my keys. Last out faces the vote.' }] }
    ]
  };
  var love_pink = {
    name: 'The Pink Room',
    tiles: ['kkEEkkkEEkk', 'kqqqqqqqqqk', 'kqqqqqqqqqk', 'kqqqqqqqqqk', 'kqqqqqqqqqk', 'kqqqqqqqqqk', 'kqqqqqqqqqk', 'kkkkkDkkkkk'],
    legend: { 'k': 'pinkwall', 'q': 'pinkfloor' },
    ambient: 'static', vignette: 0.45,
    objects: [
      { id: 'sis_screen', at: [2, 0] },
      { id: 'mom_screen', at: [8, 0] },
      { id: 'pink_panel', at: [5, 0], prop: 'wallpanel', solid: true },
      { id: 'junk1', at: [2, 3], prop: 'junk' },
      { id: 'junk2', at: [5, 2], prop: 'junk' },
      { id: 'junk3', at: [8, 3], prop: 'junk' },
      { id: 'junk4', at: [3, 5], prop: 'junk' },
      { id: 'junk5', at: [7, 5], prop: 'junk' },
      { id: 'vase', at: [9, 5], prop: 'vase', examine: 'A blue vase. I already checked inside it. Twice.' }
    ],
    exits: [{ id: 'pink_out', at: [5, 7], to: 'love_main', toAt: [2, 1], facing: 'down' }]
  };
  var love_children = {
    name: 'The Children\'s Room',
    tiles: ['jjEEjjjEEjj', 'jeeeeeeeeej', 'jeeeeeeeeej', 'jeeeeeeeeej', 'jeeeeeeeeej', 'jeeeeeeeeej', 'jeeeeeeeeej', 'jjjjjDjjjjj'],
    legend: { 'j': 'nurserywall', 'e': 'nursery' },
    ambient: 'static', vignette: 0.45,
    npcs: [{ id: 'delphin', at: [8, 2], spec: 'delphin', facing: 'up', turn: false }],
    objects: [
      { id: 'wav_screen', at: [2, 0] },
      { id: 'sal_screen', at: [7, 0] },
      { id: 'tbl_big', at: [5, 4], prop: 'table_big', solid: true },
      { id: 'tbl_small', at: [8, 5], prop: 'table_small', solid: true, if: '!ch11_smallLifted' },
      { id: 'ceilkeys', at: [5, 2], prop: 'ceilkeys', solid: false, layer: 1 }
    ],
    onEnter: function (api) {
      var o = G.World.find('tbl_big'); if (o) { o.tx = S.big[0]; o.ty = S.big[1]; }
    },
    exits: [{ id: 'kids_out', at: [5, 7], to: 'love_main', toAt: [8, 1], facing: 'down', locked: '!ch11_haveKidsKeys', lockedText: [{ think: 'Not without him. And not without the keys.' }] }]
  };

  /* ---------------------------------------------------------------- the centre */
  var maze_centre = {
    name: 'The Centre',
    tiles: [
      '   YYYYYYY   ',
      '   Y,,,,,Y   ',
      '   Y,,,,,Y   ',
      '   YYYIYYY   ',
      '  YYrrrrrYY  ',
      ' YYrrrrrrrYY ',
      'YYrrrrrrrrrYY',
      'YrrrrrrrrrrrY',
      'YrrrrrrrrrrrY',
      'YrrrrrrrrrrrY',
      'YrrrrrrrrrrrY',
      'YYrrrrrrrrrYY',
      ' YrrrrrrrrrY ',
      ' YYYYYYYYYYY '
    ],
    legend: { 'Y': 'eggwall', 'r': 'rose', ',': 'finish', 'I': 'ivydoor' },
    ambient: 'hum', vignette: 0.55, bg: '#0a0a0c',
    npcs: [
      { id: 'isaiah', at: [5, 1], facing: 'down' },
      { id: 'annette', at: [7, 1], facing: 'down' }
    ],
    objects: [
      { id: 'ivydoor', at: [6, 3], prop: 'ivy', solid: true, layer: 1 },
      { id: 'ctr_cam', at: [9, 0], prop: 'camera' }
    ]
  };

  /* ---------------------------------------------------------------- minigames */
  var RECALL = [
    { t: 'Freaks', ok: true }, { t: 'Selfish', ok: true }, { t: 'Liar', ok: false }, { t: 'Whore', ok: true },
    { t: 'Monster', ok: true }, { t: 'Bad mother', ok: false }, { t: 'Murderer', ok: true }, { t: 'Waste of air', ok: true },
    { t: 'Coward', ok: false }, { t: 'Kill yourself', ok: true }, { t: 'Put down like animals', ok: true }, { t: 'Thief', ok: false }
  ];
  var minigames = {
    // The Trial: recite five opinions the public has chosen, in five minutes.
    recall: {
      autoSolve: function () { return { success: true, picks: ['Whore', 'Monster', 'Murderer', 'Selfish', 'Kill yourself'] }; },
      start: function (ctx) {
        return new Promise(function (resolve) {
          var cur = 0, picked = [], limit = (ctx.params && ctx.params.seconds) || 300, done = false, msg = '';
          var R = ctx.R, I = ctx.input;
          ctx.loop(function () {
            if (done) return;
            var left = limit - ctx.t;
            if (left <= 0) { done = true; ctx.sound('fail'); resolve({ success: false, timeout: true, picks: picked.map(function (i) { return RECALL[i].t; }) }); return; }
            if (I.repeat('left')) { cur = (cur + 11) % 12; ctx.sound('blip'); }
            if (I.repeat('right')) { cur = (cur + 1) % 12; ctx.sound('blip'); }
            if (I.repeat('up')) { cur = (cur + 9) % 12; ctx.sound('blip'); }
            if (I.repeat('down')) { cur = (cur + 3) % 12; ctx.sound('blip'); }
            if (I.pressed('back')) { picked.pop(); ctx.sound('cancel'); }
            if (I.pressed('ok')) {
              var k = picked.indexOf(cur);
              if (k >= 0) { picked.splice(k, 1); ctx.sound('cancel'); }
              else if (picked.length < 5) { picked.push(cur); ctx.sound('select'); }
              if (picked.length === 5) {
                done = true;
                var ok = picked.every(function (i) { return RECALL[i].ok; });
                ctx.sound(ok ? 'success' : 'buzzer');
                setTimeout(function () { resolve({ success: ok, picks: picked.map(function (i) { return RECALL[i].t; }) }); }, 700);
                msg = ok ? 'THAT IS CORRECT.' : 'INCORRECT.';
              }
            }
          }, function () {
            R.rect(0, 0, ctx.W, ctx.H, '#0d0a10');
            R.scanlines && R.scanlines(0.08);
            var left = Math.max(0, limit - ctx.t), mm = Math.floor(left / 60), ss = Math.floor(left % 60);
            ctx.header('THE TRIAL', 'TIME ' + mm + ':' + (ss < 10 ? '0' : '') + ss);
            R.text('Recite five of the opinions the public has chosen.', ctx.W / 2, 28, { size: 8, align: 'center', color: '#e8e4dc' });
            for (var i = 0; i < 12; i++) {
              var col = i % 3, row = Math.floor(i / 3), x = 14 + col * 120, y = 44 + row * 32;
              var sel = picked.indexOf(i), on = i === cur;
              R.panel(x, y, 112, 26, { bg: sel >= 0 ? '#5a1018' : '#1c1822', border: on ? '#e8c15a' : '#3a3442', accent: on ? '#e8c15a' : false });
              R.text(RECALL[i].t, x + 56, y + 9, { size: 8, align: 'center', color: sel >= 0 ? '#fff' : '#cfc8d8' });
              if (sel >= 0) R.text(String(sel + 1), x + 6, y + 4, { size: 7, color: '#e8c15a' });
            }
            R.text(picked.map(function (i) { return RECALL[i].t; }).join('. ') + (picked.length ? '.' : ''), ctx.W / 2, 176, { size: 8, align: 'center', color: '#e8323c', font: 'serif' });
            if (msg) R.text(msg, ctx.W / 2, 188, { size: 9, align: 'center', color: msg === 'INCORRECT.' ? '#ff5060' : '#60ff90' });
            ctx.footer('Arrows: choose   E: say it / unsay it   Backspace: take back the last one');
          });
        });
      }
    },
    // Isaiah's mother's screen: one button is a slightly different colour.
    buttons: {
      autoSolve: function () { return { success: true, tries: 1 }; },
      start: function (ctx) {
        return new Promise(function (resolve) {
          var R = ctx.R, I = ctx.input, cur = 0, odd = 5, tries = 0, flash = 0, line = 0, done = false;
          var lines = ['"\'Seah, baby, you need to understand that you did wrong…"', '"…and that\'s why your father had to do it."', '"Please. I want my son back, but only if you follow the path of redemption."'];
          var port = ctx.portrait('ch11:isaiah_mom', 'cry') || ctx.portrait('isaiah_mom', 'cry');
          ctx.loop(function (dt) {
            if (done) return;
            flash = Math.max(0, flash - dt);
            if (I.repeat('left')) { cur = (cur + 7) % 8; ctx.sound('blip'); }
            if (I.repeat('right')) { cur = (cur + 1) % 8; ctx.sound('blip'); }
            if (I.repeat('up') || I.repeat('down')) { cur = (cur + 4) % 8; ctx.sound('blip'); }
            if (I.pressed('ok')) {
              tries++;
              if (cur === odd) { done = true; ctx.sound('reveal'); setTimeout(function () { resolve({ success: true, tries: tries }); }, 600); }
              else { ctx.sound('buzzer'); flash = 0.4; line = (line + 1) % lines.length; }
            }
          }, function (t) {
            R.rect(0, 0, ctx.W, ctx.H, '#1a0a14');
            ctx.header('ISAIAH\'S MOTHER', 'RECORDED MESSAGE');
            R.panel(112, 28, 160, 92, { bg: '#0a0a12', border: '#5a4a62' });
            if (port) R.img(port, 160, 34, 2);
            R.text(lines[line], ctx.W / 2, 124, { size: 7, align: 'center', color: '#e8d8e8', font: 'serif', style: 'italic' });
            for (var i = 0; i < 8; i++) {
              var x = 96 + (i % 4) * 50, y = 144 + Math.floor(i / 4) * 22;
              var c = i === odd ? '#5a90e2' : '#4a80d0';
              R.rect(x - 2, y - 2, 28, 18, i === cur ? '#e8c15a' : '#20202a');
              R.rect(x, y, 24, 14, c);
              R.rect(x, y, 24, 2, i === odd ? '#7aaaf0' : '#6a9ae4');
            }
            if (flash > 0) R.rect(0, 0, ctx.W, ctx.H, '#ff2030', flash);
            ctx.footer(tries >= 3 ? 'Delphin: "One of them is a slightly different blue, red. Look closer."' : 'Arrows: choose a button   E: press');
          });
        });
      }
    }
  };

  /* ---------------------------------------------------------------- roam tick: hand on the wall + Delphin follower */
  function mazeTick(api) {
    var W = G.World, I = G.Input;
    if (!W.active) return;
    // Delphin follows (Section Three onward)
    if (S.follow) {
      var pt = W.playerTile();
      var d = api.npc('delphin');
      if (!d) {
        var spot = [pt.x, pt.y + 1];
        if (!W.tileFree(spot[0], spot[1])) spot = [pt.x, pt.y - 1];
        d = api.addNpc({ id: 'delphin', at: spot, spec: 'delphin_hurt', solid: false, turn: false });
        S.lastPt = { x: pt.x, y: pt.y };
      }
      if (d) {
        d.solid = false; d.spec = 'delphin_hurt';
        if (!S.lastPt) S.lastPt = { x: pt.x, y: pt.y };
        if (pt.x !== S.lastPt.x || pt.y !== S.lastPt.y) {
          var dt = W.pxToTile(d.x, d.y);
          if (Math.abs(dt.x - pt.x) + Math.abs(dt.y - pt.y) > 3) { var pp = W.tileToPx(S.lastPt.x, S.lastPt.y); d.x = pp.x; d.y = pp.y; }
          else { d.queue = [W.tileToPx(S.lastPt.x, S.lastPt.y)]; d.moveSpeed = Math.max(30, W.player.speed); }
          S.lastPt = { x: pt.x, y: pt.y }; S.steps++;
        }
      }
    }
    if (api.room() !== 'maze' || G.auto) { S.wall = false; return; }
    var tab = I.down('tab');
    if (tab && !S.tabWas) { S.wall = !S.wall; S.doorStop = null; G.UI.objective(S.objText + (S.wall ? '   [hand on the wall: ON]' : '   [TAB: hand on the wall]')); api.sound(S.wall ? 'confirm' : 'cancel'); }
    S.tabWas = tab;
    if (!S.wall) return;
    var dir = I.dir();
    if (dir.x || dir.y || G.Script.busy() || G.UI.blocking()) { if (dir.x || dir.y) stopWall(); return; }
    var p = W.player;
    if (p.queue && p.queue.length) return;
    var t = W.playerTile();
    // stop beside a door (once per door)
    for (var k in DIRS) { var v = DIRS[k], c = mz(t.x + v[0], t.y + v[1]); if (c === 'D') { var key = (t.x + v[0]) + ',' + (t.y + v[1]); if (S.doorStop !== key) { S.doorStop = key; p.dir = k; stopWall(); return; } } }
    var i0 = ORDER.indexOf(p.dir); if (i0 < 0) i0 = 0;
    var tries = [3, 0, 1, 2];
    for (var j = 0; j < 4; j++) {
      var nd = ORDER[(i0 + tries[j]) % 4], vv = DIRS[nd], nx = t.x + vv[0], ny = t.y + vv[1];
      if (open(mz(nx, ny))) { p.dir = nd; p.queue = [W.tileToPx(nx, ny)]; p.moveSpeed = p.speed * 0.9; p.onArrive = null; return; }
    }
  }
  function stopWall() { S.wall = false; G.UI.objective(S.objText + '   [TAB: hand on the wall]'); }
  /** Free roam with the maze tick running (hand on the wall, follower) until cond holds. */
  function roam(api, text, cond, opts) {
    opts = opts || {};
    S.objText = text;
    var shown = text + (api.room() === 'maze' || opts.maze ? '   [TAB: hand on the wall]' : '');
    var o = { target: opts.target, targets: opts.targets, autoplay: opts.autoplay };
    api.objective(shown, o);
    return api.until(function (f) { mazeTick(api); return cond(f, api); }).then(function () { S.wall = false; });
  }

  async function pa(api, lines) { api.sound('static'); await api.say('judge', lines, { name: 'JUDGE JOHNSON (SPEAKERS)', portrait: false }); }
  function watch(api, text) { api.lowerThird('WATCH', text, 4200); api.sound('blip'); }

  /* ================================================================ CHAPTER */
  G.registerChapter({
    id: 'ch11',
    title: 'The Maze',
    kicker: 'WEEK 4 • MONDAY 29 JANUARY',
    maps: { maze: maze, trial_ante: trial_ante, trial_hall: trial_hall, crime_ante: crime_ante, crime_wing: crime_wing, love_main: love_main, love_pink: love_pink, love_children: love_children, maze_centre: maze_centre },
    tiles: TILES,
    props: PROPS,
    minigames: minigames,
    cast: {
      delphin_hurt: { name: 'Delphin', skin: '#ecc9a2', hair: '#2a9cf0', hairStyle: 'bun', eyes: '#2a1a10', outfit: '#e8752a', outfit2: '#5a1018', style: 'casual', height: 'tall', build: 'broad', accessory: 'bandage', voice: 360, bg: '#14243a', overlay: ['stubble', 'eyeliner', 'tattoo'] },
      annette_sister: { name: 'Annette\'s Sister', skin: '#f2d8c8', hair: '#e8e4e0', hairStyle: 'bun', eyes: '#4a5a7a', outfit: '#8aa8c8', outfit2: '#6a88a8', style: 'dress', height: 'short', build: 'slim', voice: 520, bg: '#22283a' },
      isaiah_mom: { name: 'Isaiah\'s Mother', skin: '#5e3a24', hair: '#1a100a', hairStyle: 'bun', eyes: '#1a0e08', outfit: '#2a3a7a', outfit2: '#2a3a7a', style: 'dress', accessory: 'earrings', voice: 480, bg: '#1a1a30' }
    },
    testDefaults: { m_audience: 40, m_delphin: 35, m_isaiah: 30, f_alliance_delphin: true, f_kessie_secret_told: true, f_attacked_annette: true, f_note2_decoded: true },

    start: async function (api) {
      resetState();

      /* ---------------- wake & rules ---------------- */
      await api.goRoom('maze', { at: [1, 21], facing: 'up', fade: true });
      await api.think('Why does my arm feel like a limp snake?');
      await api.narrate(['I\'d been lying on it for who-knows-how-long. I shake out the pins and needles, and only then take in where I am.',
        'Walls in the shape of a giant plus sign. Rich mahogany carpet patterned with roses. White walls, impossibly white, lined with old-fashioned candelabras at exact intervals.',
        'I peek around a corner. Then another. Endless corridors of sameness, repeating like a sick joke.']);
      api.onAir(true);
      api.approval(true);
      api.lowerThird('RIGHT TO LIFE', 'Competition 3 • The Maze • LIVE');
      await pa(api, ['"Good evening, contestants. Welcome to your next competition. As you can see, you\'re no longer in the mansion. We call this little arena The Maze."']);
      await api.think('His show, huh? For someone in a cut-throat race to be the next Great Leader, he sure has a lot of time for us pathetic criminals.');
      await pa(api, ['"You\'ve each been placed in separate corners. There are three sections in total, each with specific requirements. Complete them to earn the keys you\'ll need to exit."',
        '"The last to finish will be subject to a private vote. But don\'t get too comfortable: none of you may leave until the maze is complete. Slovenly behavior will not be tolerated."',
        '"The first to complete the maze will receive an advantage in the next competition, provided they are still amongst your number. Begin now."']);
      api.lowerThird(null);
      await api.think(['No time to think. Waverly. Everything I do is for her.', 'I need a system. Something to mark my path. (Face a candelabra and press E to tilt it. TAB puts a hand on the wall and follows it.)']);

      /* ---------------- maze leg 1: find Section Two ---------------- */
      await roam(api, 'Find a section door', function () { return api.room() === 'trial_ante'; }, { target: 'room:trial_ante' });
      await sectionTwo(api);

      /* ---------------- maze leg 2: Section One ---------------- */
      watch(api, 'Isaiah: Section One  •  Annette: Section One  •  Delphin: Section Two');
      await roam(api, 'Find Section One: Crime and Punishment', function () { return api.room() === 'crime_ante'; }, { target: 'room:crime_ante', maze: true });
      await sectionOne(api);

      /* ---------------- maze leg 3: Section Three ---------------- */
      watch(api, 'Isaiah: Section One  •  Annette: Section Three  •  Delphin: Section Three');
      await api.think('The last section is the hardest to find. Hand on the wall. Tilt as I go. Don\'t think about how long it\'s taking.');
      await roam(api, 'Find Section 3: Love', function () { return api.room() === 'love_main'; }, { target: 'room:love_main', maze: true });
      await sectionThree(api);

      /* ---------------- hobble to the centre ---------------- */
      await hobble(api);
      await centre(api);
    }
  });

  /* ================================================================ SECTION TWO */
  async function sectionTwo(api) {
    await api.titleCard('Section Two', 'The Trial', 2200);
    await api.narrate('A claustrophobically small room. No roses, no candelabras: cold, blank tile. After the maze it is almost a relief. A mirror on the far wall, marred by what look like scribbles. A second door.');
    api.objective('Read the mirror', { target: 'mirrorTrial' });
    await api.waitForInteract('mirrorTrial');
    await api.note({ title: 'Written on the mirror', text: 'Enter through the door to find the truth about yourself. The key is located at the end of the hall. To obtain it, pay attention to what is being said along the way. Further instructions will be provided when you have reached the key\'s location.' });
    api.set('ch11_mirrorTrial', true);
    await api.think(['Truth. What truth? What could they throw at me that I haven\'t already endured?',
      'Were those circles under my eyes always that huge, or is this one of those trick mirrors? I\'ve put on weight, too. I haven\'t actually seen myself since the night of the banquet.',
      'This isn\'t the time to sit gazing into my own eyes.']);
    await roam(api, 'Go through the door. Pay attention to what is said.', function () { return api.room() === 'trial_hall'; }, { target: 'room:trial_hall' });
    await api.narrate('The moment I step through, a cacophony of voices slams into me like a physical blow. Shrieking, jeering, venomous words cascading from the walls.');

    while (!api.get('ch11_trialKey')) {
      await roam(api, 'Reach the platform at the end of the hall', function () { return api.room() === 'trial_hall'; }, {});
      api.objective('Reach the platform at the end of the hall', { target: 'platform' });
      await api.waitForInteract('platform');
      api.sound('alarm');
      await api.say('VOICE', '"The contestant will now stand on the platform and recite five of the opinions the public has chosen. Failure to do so will result in an immediate transfer to the beginning of the hall. You have five minutes."', { name: 'A MECHANICAL VOICE', portrait: false });
      await api.think('Five minutes. Five opinions. I close my eyes, steady my breath, and step up.');
      var r = await api.minigame('recall', { seconds: 300 });
      if (r.success) {
        await api.think('Words cannot describe how humiliating it is. Like tearing off a piece of my soul and feeding it to the viewers with each word.');
        await api.say('luna', '"' + (r.auto ? 'Whore. Monster. Murderer. Selfish. Kill yourself' : r.picks.join('. ')) + '."', { mood: 'sad' });
        api.approvalAdd(+4);
        api.sound('success');
        await api.say('VOICE', '"That is correct. Dismount the platform to receive your reward."', { name: 'A MECHANICAL VOICE', portrait: false });
        S.keysRisen = true;
        api.sound('reveal');
        await api.narrate('The middle of the platform hollows itself, sinks into the earth and rises back up with three golden keys.');
        await api.say('VOICE', '"Retrieve the key that belongs to you. Taking another competitor\'s key is strictly forbidden and will result in elimination from the competition."', { name: 'A MECHANICAL VOICE', portrait: false });
        var tookOwn = false;
        while (!tookOwn) {
          var k = await api.choice(['Take the key labelled LUNA.', 'Take the key labelled DELPHIN.', 'Take the key labelled ANNETTE.'], { autoPick: 0 });
          if (k === 0) tookOwn = true;
          else {
            api.sound('buzzer');
            await api.say('VOICE', '"Warning. That key does not belong to you. Elimination is final."', { name: 'A MECHANICAL VOICE', portrait: false });
            await api.think(k === 1 ? 'Delphin\'s. If I held onto it he would be stuck in here for good. No.' : 'For one second I want to. Leave her in here with her own voices. No. Not like that.');
          }
        }
        S.keysRisen = false;
        api.set('ch11_trialKey', true);
        await api.think('Only Isaiah\'s key is already gone. Of course it is.');
      } else {
        api.approvalAdd(-3);
        await api.say('VOICE', r.timeout ? '"Time has expired. Transfer to the beginning of the hall."' : '"Incorrect. Those were not the public\'s opinions. Transfer to the beginning of the hall."', { name: 'A MECHANICAL VOICE', portrait: false });
        await api.fadeOut(400);
        await api.goRoom('trial_hall', { at: [1, 2], facing: 'right' });
        await api.fadeIn(400);
        await api.think('Again. Hands down. Listen to every one of them this time.');
      }
    }
    await roam(api, 'Get out of here', function () { return api.room() === 'maze'; }, { target: 'room:maze' });
    await api.think('I hold my breath as I reach the door, half convinced it won\'t open. It does. I run.');
  }

  /* ================================================================ SECTION ONE */
  async function sectionOne(api) {
    await api.titleCard('Section One', 'Crime and Punishment', 2200);
    api.objective('Read the mirror', { target: 'mirrorCrime' });
    await api.waitForInteract('mirrorCrime');
    await api.note({ title: 'Written on the mirror', text: 'It\'s time to reveal your deepest selves. There are four total rooms behind this door. Each one is dedicated to the crimes of a remaining contestant. Study the exhibits closely.' });
    api.set('ch11_mirrorCrime', true);
    await roam(api, 'Go through', function () { return api.room() === 'crime_wing'; }, { target: 'room:crime_wing' });

    // Annette caning past
    api.addNpc({ id: 'annette', at: [12, 7], spec: 'annette', facing: 'down' });
    api.lockPlayer();
    await api.move('annette', [12, 9]);
    await api.move('annette', [3, 9], { speed: 26 });
    api.face('annette', 'player');
    await api.emote('annette', '…', 700);
    await api.narrate('Annette. She sneers at me but doesn\'t stop, caning her way past.');
    if (api.get('f_attacked_annette', true)) await api.say('annette', '"Mind your temper, dear. Your neck is still purple."', { mood: 'smug' });
    var c = await api.choice(['(Say something. Decry what she did.)', '(Let her go. Now is not the time.)']);
    if (c === 0) { await api.say('luna', '"You-"', { mood: 'angry' }); await api.think('I open my mouth to say anything at all. Then I close it again. Not here. Not on her schedule.'); }
    await api.move('annette', [1, 9]);
    api.remove('annette');
    api.unlockPlayer();

    await api.until(function (f) { return f.ch11_sawIsaiah && f.ch11_sawDelphin && f.ch11_sawAnnette; }, {
      objective: 'Study the exhibits (the bear room is at the end of the hall)',
      targets: ['clip_isaiah', 'clip_delphin', 'clip_annette']
    });
    await api.think('I\'ve seen everything I need. Through the last door.');

    // The King Bear quiz
    await roam(api, 'Enter the teddy-bear room', function () { var t = api.playerTile(); return t.x >= 33; }, { target: 'qplatform' });
    await api.narrate('A chamber lined with, I kid you not, teddy bears. In the centre, another raised platform. On a dais, a crowned bear with a slot for a mouth.');
    var Q = [
      { q: 'Which morality law did Isaiah violate?', o: ['(a) A man shall not engage in sexual activity outside the bounds of sacred marriage vows.', '(b) Copulation without the intention of procreation is filthy and immoral.', '(c) Two people of the same gender who bed each other are violating the will of the many.'], c: 2, short: ['Circle (a): outside sacred marriage vows', 'Circle (b): without intention of procreation', 'Circle (c): same gender, the will of the many'] },
      { q: 'How many people did Delphin kill and wound during his time as an arsonist?', o: ['(a) 0 dead, 4 wounded', '(b) 4 dead, 12 wounded', '(c) 12 dead, 6 wounded'], c: 1, short: ['Circle (a): 0 dead, 4 wounded', 'Circle (b): 4 dead, 12 wounded', 'Circle (c): 12 dead, 6 wounded'] },
      { q: 'How old was Luna\'s unborn child before the murder?', o: ['(a) 2 months', '(b) 3 months', '(c) 7 months'], c: 1, short: ['Circle (a): 2 months', 'Circle (b): 3 months', 'Circle (c): 7 months'] },
      { q: 'How did Annette gain the trust of her victims before ruthlessly murdering them?', o: ['(a) She posed as a maid and took jobs in their houses', '(b) She became a beggar to make men underestimate her', '(c) She climbed the corporate ladder and invited her victims to meetings'], c: 0, short: ['Circle (a): posed as a maid', 'Circle (b): became a beggar', 'Circle (c): the corporate ladder'] }
    ];
    var qi = 0, wrongs = 0;
    while (qi < Q.length) {
      api.objective('Stand on the platform', { target: 'qplatform' });
      await api.waitForInteract('qplatform');
      api.sound('door');
      await api.narrate(qi === 0 ? 'The ceiling grinds. A square of it slides away and a sheet of paper and a pen flutter down to me.' : 'Another paper falls from the ceiling to the platform.');
      var q = Q[qi];
      await api.note({ title: 'CRIMES AND CRIMINALS TEST • ' + (qi + 1), text: q.q + '\n\n' + q.o.join('\n') + '\n\nFill in the answer and insert into the mouth of the king.' });
      if (qi === 0 && wrongs === 0) await api.think('I know Isaiah\'s crime, but which law did it say? Think. Picture the papers on the table.');
      if (qi === 2) await api.think('Since we seem to be going in order of rooms, mine is next. I squeeze the pen so tight it bulges against my hand.');
      var a = await api.choice(q.short, { autoPick: q.c });
      if (qi === 2) await api.think('Like I could ever forget.');
      api.objective('Post the answer in the King Bear\'s mouth', { target: 'kingbear' });
      await api.waitForInteract('kingbear');
      S.bear.stand = 1; api.sound('hit');
      await api.wait(300);
      if (a === q.c) {
        S.bear.eyes = 'g'; api.sound('success');
        await api.narrate(qi === 0 ? 'The bear jerks from a squat to standing. Its arm extends toward me and, after a few nerve-wracking seconds, thrusts upward. A ding. Its empty black eyes turn green.' : 'Up. Salute. Ding. Green.');
        qi++;
      } else {
        S.bear.eyes = 'r'; api.sound('buzzer'); api.approvalAdd(-2); wrongs++;
        await api.narrate('The bear stands. Its eyes flash red. A flat tone. The ceiling grinds again: a fresh sheet. Question one.');
        await api.think(wrongs > 1 ? 'Back to the exhibits if I have to. The answers are out there on those tables.' : 'Start over. Just checking the answers takes a whole minute. Don\'t get it wrong again.');
        qi = 0;
      }
      await api.wait(400);
      S.bear.stand = 0; S.bear.eyes = null;
    }
    api.sound('reveal');
    await api.narrate('Mercifully, two keys drop through the grate: one with my name, one with Isaiah\'s. And a note: deposit any keys that are not yours into the mouth.');
    api.set('ch11_crimeKey', true);
    api.objective('Return Isaiah\'s key to the King Bear', { target: 'kingbear' });
    await api.waitForInteract('kingbear');
    await api.narrate('Isaiah\'s key goes into the slot. The King swallows it without ceremony.');
    api.set('ch11_quizDone', true);
    api.addObject({ id: 'pen', at: [37, 6], prop: 'pen', solid: false, examine: async function (api2) {
      if (api2.get('f_has_pen') || api2.get('ch11_penLeft')) return;
      await api2.think(['The pen. Nowhere in the instructions did they say to get rid of the pen.', 'Not a weapon I could do much damage with. Not like the knitting needles Annette is somehow allowed to tote around the mansion.']);
      var p = await api2.choice(['Slip it into my pocket.', 'Feed it to the King with the rest.']);
      if (p === 0) {
        api2.set('f_has_pen', true); api2.remove('pen'); api2.sound('confirm');
        await api2.think('I glance at the dot in the corner. Solid red, not flashing. Hopefully someone else is being featured right now. It never hurts to have an unexpected boon.');
      } else {
        api2.set('ch11_penLeft', true); api2.set('f_has_pen', false); api2.remove('pen');
        await api2.think('Better not. Not on camera.');
      }
    } });
    await api.until(function (f) { return f.ch11_leftBear; }, { objective: 'Leave the bear room', targets: ['pen', 'bearexit'] });

    // Isaiah outside the door
    api.addNpc({ id: 'isaiah', at: [30, 9], spec: 'isaiah', facing: 'right' });
    api.lockPlayer();
    await api.movePlayer([31, 8]);
    api.face('player', 'isaiah');
    await api.narrate('I almost knock over Isaiah. He is waiting outside the quiz room with his hands in his pockets. The door must stay locked while someone is inside.');
    await api.think('His eyes beg me for the answers.');
    var e = await api.choice(['"You\'ve got this. If you paid any attention at all. But don\'t let it hurt you, or you\'ll lose focus."', '"I can\'t, Isaiah. There\'s a lens in every bear."']);
    if (e === 0) { api.add('m_isaiah', 2); await api.think('Goddamn kid makes me so weak.'); }
    await api.say('isaiah', '"Thank you."');
    await api.narrate('He takes his glasses off, rubs them on his shirt and puts them back on, just as smeared as before.');
    await api.say('isaiah', ['"Kessie. Before she died, she said-"', '…']);
    await api.say('isaiah', '"Nevermind. Did you know octopuses have three hearts? Two of them stop when they swim."', { mood: 'tired' });
    await api.think('I shut my eyes.');
    await api.say('luna', '"We should talk about the Kessie thing. But not right now. When we get back, okay?"');
    await api.say('isaiah', '"I\'m gonna-"');
    await api.say('luna', '"Oh. Go ahead."');
    await api.move('isaiah', [32, 8]);
    await api.move('isaiah', [34, 8]);
    api.remove('isaiah');
    api.unlockPlayer();
    await api.think('Of course he wants to know what Kessie said. I\'ll have to have the same talk with Delphin. But first, Annette and I will have a little chat about betrayal.');
    await roam(api, 'Back to the maze', function () { return api.room() === 'maze'; }, { target: 'room:maze' });
  }

  /* ================================================================ SECTION THREE */
  async function sectionThree(api) {
    await api.titleCard('Section 3', 'Love', 2200);
    await api.narrate('No mirror room this time. An open space, cool-blue walls, two doors on the far wall. A large screen where the mirror would be, and a big red button that\'s begging to be pressed.');
    api.objective('Press the red button', { target: 'redbutton' });
    await api.waitForInteract('redbutton');
    await api.tv([
      { speaker: 'trader_host', mood: 'happy', headline: 'SECTION 3: LOVE', tag: 'REC', text: '"Hello, contestant! Congratulations on making it to this section. You\'ll notice this one is a bit different. There is no quiz at the end or memorization required. All you have to do is find the keys."' },
      { speaker: 'trader_host', mood: 'smug', headline: 'SECTION 3: LOVE', tag: 'REC', text: '"Each contestant has three keys hidden around the section with their name on them. One is in this room and one behind each door. Once you\'ve found all the keys, return here and insert them into the holes at the bottom of the screen." (He winks and makes kissy lips at the camera.)' }
    ]);
    api.set('ch11_trapPlayed', true);
    await api.think('The holes, tiny burrows in the rough frame, I hadn\'t noticed until he mentioned them.');

    // key 1, behind the screen
    api.objective('Find the key in this room', { target: 'tape_key' });
    await api.waitForInteract('tape_key');
    await api.narrate('Behind the screen: a key with my name on it, taped on with an adhesive so sticky I can\'t budge it.');
    var y = await api.choice(['Yank it.', 'Spit on my finger and rub, like a stain on my daughter\'s face.'], { autoPick: 1 });
    if (y === 0) { api.sound('miss'); await api.think('It doesn\'t move. My nail bends back. Okay. Mom method.'); }
    api.sound('confirm');
    await api.think('Years of motherhood: spit, rub, hard. That does the trick. One key.');
    api.set('ch11_key1', true);

    // pink room
    await roam(api, 'Search behind the doors', function () { return api.room() === 'love_pink'; }, { target: 'room:love_pink' });
    await api.narrate(['Like stepping into a cartoon of a burst pig. Fluorescent pink everywhere, red splotches and smears, the occasional suspicious brown tinge.', 'And the noise. Two screens, two videos. More behind the other doors.']);
    await api.tv({ speaker: 'annette_sister', headline: 'A SISTER REMEMBERS', tag: 'REC', text: '"My sister was always a monster. I remember this one time we were playing hide and seek, and she trapped me in the cellar."' });
    await api.tv({ speaker: 'isaiah_mom', mood: 'sad', headline: 'A MOTHER\'S PLEA', tag: 'REC', text: '"\'Seah, baby, you need to understand that you did wrong and that\'s why your father had to do it. What kind of example would he be setting for the little ones if he just let that kind of thing slide?"' });
    await api.think('I understand the nefariousness of this section now. I\'m supposed to be looking for keys, and here I am watching these videos instead.');
    var junkLines = {
      junk1: ['A vase, a cracked teapot, a stray towel. I fold it. Why am I folding it?', { tv: { speaker: 'annette_sister', headline: 'A SISTER REMEMBERS', tag: 'REC', text: '"Everyone acted surprised when she was caught, but not me. I always knew."' } }],
      junk2: ['Picture frames with no pictures. Doorknobs with no doors. No key.'],
      junk3: ['A pot. I slam it down harder than I mean to and it cracks. Faster.', { tv: { speaker: 'isaiah_mom', mood: 'cry', headline: 'A MOTHER\'S PLEA', tag: 'REC', text: '"Please. I want my son back, but only if you follow the path of redemption." (Her deep blue eyeshadow runs down her cheeks.)' } }],
      junk4: ['Shoes. Hundreds of mismatched shoes. A child\'s sandal. I put it down very gently.'],
      junk5: ['The bottom of the last pile. Nothing. The room looks like an earthquake ran through it.']
    };
    Object.keys(junkLines).forEach(function (id) {
      api.onInteract(id, async function (a2) {
        if (S['junk_' + id]) { await a2.think('Already searched. Nothing.'); return; }
        S['junk_' + id] = true; a2.sound('step');
        var L = junkLines[id];
        await a2.think(L[0]);
        if (L[1]) {
          var w = await a2.choice(['Keep digging.', '(Stop and watch the screen.)']);
          await a2.tv(L[1].tv);
          if (w === 1) { a2.approvalAdd(+1); await a2.think('The voices seep into my soul. Stop it. Dig.'); }
        }
        a2.add('ch11_junkN', 1);
      });
    });
    await api.until(function (f) { return (f.ch11_junkN || 0) >= 5; }, { objective: 'Search the junk piles for your key', targets: ['junk1', 'junk2', 'junk3', 'junk4', 'junk5'] });
    await api.think(['I haven\'t found a single key, and now I\'m going to have to start all over again. I\'ve only made things harder for myself.', 'Maybe in the next room there will be a video for me. Maybe I\'ll see her.']);

    // the scream
    api.sound('sting'); await api.shake(500, 3);
    await api.say('VOICE', '"AAAAAAH-"', { name: '???', portrait: false });
    await api.narrate('A desperate scream, the kind that only comes when a heart shatters to pieces. Then bellowing sobs and gasping breath. I know that voice.');
    await api.think('Delphin.');
    api.set('ch11_heardScream', true);
    await roam(api, 'Get to Delphin', function () { return api.room() === 'love_main'; }, { target: 'room:love_main' });
    api.objective('The second door', { target: 'kickzone' });
    await api.waitForZone('kickzone');
    api.lockPlayer(); api.face('player', 'up');
    api.sound('door');
    await api.say('luna', ['"Delphin!"', '"Delphin, open the door!"'], { mood: 'fear' });
    await api.narrate('It rattles, that sound that drives people crazy about locked doors everywhere. A low moan from the other side. More sobs.');
    await api.think('After everyone I\'ve left behind, everyone I\'ve betrayed, I have the chance to help him. If I can just get through this door.');
    for (var kk = 1; kk <= 3; kk++) {
      await api.minigame('qte', { mode: 'timing', rounds: 1, need: 1, speed: 1 + kk * 0.2, title: 'KICK ' + kk, prompt: kk < 3 ? 'Karate kick. Hit the green.' : 'Again. Harder.' });
      api.sound('hit'); await api.shake(250 + kk * 100, 2 + kk);
      if (kk === 1) await api.think('Pain sears through my right foot. Again.');
      if (kk === 2) await api.think('It holds. My ankle screams. Again.');
    }
    api.sound('door');
    await api.narrate('The door lets out a little click. The sound of unlocking. I hop on my left foot, then put the right one down, gingerly. Tender. Throbbing. If I go slow, I can keep going.');
    api.approvalAdd(+5);
    api.set('ch11_doorKicked', true); api.set('ch11_ankle', true);
    G.World.player.speed = 52;
    api.unlockPlayer();
    await roam(api, 'Get to Delphin', function () { return api.room() === 'love_children'; }, { target: 'room:love_children' });

    // children's room
    await api.narrate('Delphin is on the floor, curled into a ball, hands pressed over his ears, sobbing into his chest. Two screens. This room is populated by children.');
    await api.tv([
      { speaker: 'waverly', mood: 'happy', headline: 'A MESSAGE FROM WAVERLY', tag: 'REC', text: '"My momma promised me that she\'s coming back for me. I\'m doing lots of pictures for her so when we get home they can all go up on the fridge."' },
      { speaker: 'waverly', mood: 'happy', headline: 'A MESSAGE FROM WAVERLY', tag: 'REC', text: '(She holds up a drawing: the two of them holding hands in a park. It is good. Really good.)' }
    ]);
    var ww = await api.choice(['(Stay. Just a little longer.)', '(Turn my back on her. Delphin first.)']);
    if (ww === 0) {
      api.approvalAdd(+3);
      await api.think(['Is this the same girl who trotted out scribbles of sunsets before all this? Real talent. I make a mental note to look into art programs.', 'Then it hits me. If I get out of this alive and free, she won\'t be an underprivileged kid anymore.']);
      if (api.get('f_note2_decoded')) await api.think('Grandma is Trader\'s weak point. What else have you found out, Wavey? What are you doing in there?');
    }
    await api.think('Much as it pains me, I turn my back on her sweet summer voice and raise my mental walls as high as they go. Mostly.');
    api.objective('Delphin', { target: 'delphin' });
    await api.waitForInteract('delphin');
    await api.narrate('I rest a hand on his shoulder. He jumps, raises his head an inch, groans, and lowers it again. So I sit next to him.');
    await api.tv({ speaker: 'salina', mood: 'happy', headline: 'A MESSAGE FOR DELPHIN', tag: 'REC', text: '"My brother is the absolute best at being silly. He even wins contests with his jokes."' });
    await api.think(['A girl a little older than Waverly. Black bob, a blue clip, a yellow raincoat, a grey stuffed bunny in her lap. That cheeky grin.', 'Salina. Eleven years old, forever.']);
    await api.say('luna', '"Delphin. It\'s her. It\'s really her."', { mood: 'cry' });
    await api.say('delphin', '"Don\'t."', { mood: 'cry' });
    await api.narrate('He raises his head. His eyes are bloodshot, like he\'s been rubbing them nonstop. He says it to the lens in the corner, not to me.');
    await api.say('delphin', '"She\'s gone. Has been for eighteen years now."', { mood: 'cry' });
    await api.think('Eighteen years. The rain. I can\'t. Not here, not on their camera. Behind the pain, the anger: at Trader, at the Judge, at whatever sicko in an office dreamt this up. He doesn\'t deserve this. None of us do.');
    var dd = await api.choice(['"If you feel like you can move, get out of this room. It\'s not good for you. I\'m going to find our keys."', '(Lean my shoulder into his. Say nothing for a moment.)']);
    if (dd === 1) {
      api.add('m_delphin', 2);
      await api.narrate(api.get('m_delphin', 15) >= 40 ? 'He leans back, just slightly. Thirty-four years old and shaking like the boy in the yard.' : 'He goes stiff. Then, after a long moment, he doesn\'t pull away.');
      await api.say('luna', '"I\'m going to find our keys."');
    }
    await api.narrate('He lowers his head and resumes those small, hopeless sobs.');

    // finding the keys
    api.onInteract('wav_screen', [{ think: 'Nothing behind her screen. Just her voice, through the wall, into my bones.' }]);
    api.onInteract('sal_screen', [{ think: 'Nothing behind it.' }]);
    api.onInteract('ceilkeys', async function (a2) {
      if (!a2.get('ch11_spotted')) { a2.set('ch11_spotted', true); await a2.think(['I turn my gaze skyward to pray for a miracle and find one. The keys are glued to the ceiling.', 'Delphin could reach them. He\'s in no state. I need something to stand on.']); }
      else await a2.think('Up there. Out of reach. Get a table under it.');
    });
    await api.until(function (f) { return f.ch11_spotted; }, { objective: 'Find the keys', targets: ['wav_screen', 'ceilkeys'] });

    // table puzzle: push the big table under the glint, stack the small one on top
    api.onInteract('tbl_big', async function (a2) {
      if (S.smallCarried && S.big[0] === 5 && S.big[1] === 2) { S.stacked = true; S.smallCarried = false; a2.sound('hit'); await a2.think('The small table on top of the big one. The whole thing sways.'); return; }
      if (S.smallCarried) { await a2.think('Not here. The keys are above that glint. Get the big table under it first.'); return; }
      var W = G.World, p = W.player, v = DIRS[p.dir], nx = S.big[0] + v[0], ny = S.big[1] + v[1];
      var pt = W.playerTile();
      if (pt.x + v[0] !== S.big[0] || pt.y + v[1] !== S.big[1] || !W.tileFree(nx, ny) || ny < 1) { a2.sound('miss'); await a2.think('It won\'t go that way.'); return; }
      var o = W.find('tbl_big'); S.big = [nx, ny]; if (o) { o.tx = nx; o.ty = ny; }
      a2.sound('step');
      if (nx === 5 && ny === 2) await a2.think('Right under the keys. Now something to stack on it.');
    });
    api.onInteract('tbl_small', async function (a2) {
      S.smallCarried = true; a2.set('ch11_smallLifted', true); a2.remove('tbl_small'); a2.sound('confirm');
      await a2.think('The smaller table. Light enough to carry, even on this ankle.');
    });
    await api.until(function () { return S.stacked; }, {
      objective: 'Push the big table under the keys, then stack the small one',
      autoplay: async function (a2) { var o = G.World.find('tbl_big'); S.big = [5, 2]; if (o) { o.tx = 5; o.ty = 2; } if (G.World.find('tbl_small')) { a2.set('ch11_smallLifted', true); a2.remove('tbl_small'); } S.stacked = true; }
    });
    api.objective('Climb up', { target: 'tbl_big' });
    api.onInteract('tbl_big', null);
    await api.waitForInteract('tbl_big');
    api.lockPlayer();
    await api.narrate('My ankle throbs as I climb. Two tables up and I\'m still not tall enough. Tip toe. That gets me the height, and the tables start to shake, my knees knocking along with them.');
    await api.minigame('qte', { mode: 'mash', target: 22, time: 5, title: 'SPIT AND RUB', prompt: 'Mash E: rub the glue off before the tables give' });
    await api.narrate('I manage to grab my own key as the tables heave. The bottom one makes a splintering noise I really don\'t like. Delphin\'s key, rub, rub, got it-');
    S.broken = true;
    api.sound('hit'); api.flash('#ffffff', 200); await api.shake(600, 4);
    var dn = api.npc('delphin');
    await api.move('delphin', [5, 3], { speed: 120 });
    api.teleport([5, 3], 'down');
    if (dn) { api.placeNpc('delphin', [5, 4], 'up'); }
    await api.narrate('The bottom table breaks in two and I plummet, straight into the waiting arms of my ally, who has hauled himself up just in time. A broken ankle in here would have been a death sentence.');
    await api.say('luna', '"Thanks."');
    await api.say('delphin', '"Don\'t worry about it. Let\'s get out of here."');
    await api.say('luna', '"I couldn\'t agree more."');
    api.set('ch11_haveKidsKeys', true);
    api.unlockPlayer();
    S.follow = true; S.lastPt = null;

    // back to the pink room together
    await roam(api, 'Back to the pink room', function () { return api.room() === 'love_pink'; }, { target: 'room:love_pink' });
    await api.say('luna', '"I couldn\'t find the key in here."');
    await api.say('delphin', '"I got it."');
    api.placeNpc('delphin', [8, 1], 'up');
    await api.say('delphin', '"Really did a number on this place, didn\'t you?"', { mood: 'smug' });
    await api.say('luna', '"I may have moved a thing or two."');
    await api.think('He\'s acting normal again. That worries me more than the sobbing. Nobody gets through grief that fast.');
    await api.say('delphin', '"Look at the buttons under the mom screen, red. One of these is not like the others."');
    api.objective('Find the odd button on Isaiah\'s mother\'s screen', { target: 'mom_screen' });
    await api.waitForInteract('mom_screen');
    await api.minigame('buttons', {});
    S.panelOpen = true; api.sound('door');
    await api.narrate('A panel in the wall slides open. One more key: mine. Everyone else has already cleared this room.');
    api.objective('Take the key', { target: 'pink_panel' });
    await api.waitForInteract('pink_panel');
    S.panelKeyTaken = true; api.sound('confirm');

    // the vase
    api.lockPlayer();
    await api.say('luna', '"Let\'s hurry."');
    await api.move('delphin', [9, 4]);
    api.face('delphin', 'down');
    await api.narrate('Delphin nods. But before we go, he picks up the vase and examines it.');
    api.remove('vase');
    api.sound('sting');
    await api.say('delphin', '"RRRAAAAGH!"', { mood: 'angry' });
    api.sound('hit'); api.flash('#ffffff', 250); await api.shake(500, 4);
    api.addObject({ id: 'shards', at: [9, 5], prop: 'shards', solid: false, layer: -1 });
    api.setSpec('delphin', 'delphin_hurt');
    await api.narrate('A scream of primal rage. The vase explodes into hundreds of shards that shoot up at him, slashing his skin. When the dust clears he is covered in little cuts, and one concerningly large slash across his left thigh is leaking, then gushing, blood.');
    await api.say('luna', '"Are you okay?"', { mood: 'fear' });
    await api.narrate('His eyes are clear.');
    await api.say('delphin', '"I guess that was kind of stupid."', { mood: 'tired' });
    await api.think('I laugh. It feels good, so I do it again.');
    await api.say('luna', '"Yeah, pretty stupid alright. Can you walk?"', { mood: 'happy' });
    await api.say('delphin', '"Maybe. Can you?"');
    await api.narrate('"Yeah," I say, and prove myself wrong in three steps. I nearly fall; I catch his shoulder; he catches a table.');
    await api.say('delphin', '"Let\'s do it together."');
    api.unlockPlayer();
    G.World.player.speed = 36;

    // insert the keys
    await roam(api, 'Insert the keys under the screen', function () { return api.room() === 'love_main'; }, { target: 'room:love_main' });
    api.objective('Insert the keys under the screen', { target: 'keyholes' });
    await api.waitForInteract('keyholes');
    for (var h = 0; h < 3; h++) { S.holes = h + 1; api.sound('confirm'); await api.wait(350); }
    await api.narrate('Click. Click. Click. Delphin fumbles his in beside mine, leaving a smear of red on the frame. Somewhere in the walls, a lock lets go.');
    api.set('ch11_loveDone', true);
    api.add('m_delphin', 0);
  }

  /* ================================================================ HOBBLE */
  async function hobble(api) {
    watch(api, 'Isaiah: FINISHED  •  Annette: FINISHED  •  Delphin + Luna: Section 3');
    await api.think('Out of Section Three. Now the centre. He leans on me as much as I lean on him, a four-legged monster taking its first steps. Hand on the wall. Tilt as we go.');
    await roam(api, 'Hobble to the centre of the maze', function () { return api.room() === 'maze'; }, { target: 'room:maze' });
    S.steps = 0;
    var talk = async function () {
      S.hobbleTalk = 1;
      api.lockPlayer();
      await api.say('delphin', '"Hey. Just so you know, I don\'t believe what the old lady said about you and Kessie. I know you\'re not like that."', { mood: 'tired' });
      await api.think('I stop. He teeters forward and I have to yank him back by the shoulder.');
      await api.say('luna', '"What did Annette say about me and Kessie?"');
      await api.say('delphin', '"Do you think we should tilt them a bit further? Just so we can be sure we\'ll recognise them. Only this one-"');
      await api.say('luna', '"Delphin."');
      await api.say('delphin', ['"I shouldn\'t have brought it up."', '"She just said it was weird how Kessie\'s last words were forgiving you. Made her think you\'re the one who snitched about Kessie looking for her son."']);
      await api.say('luna', '"I see. And was it just you that she told this to?"');
      await api.say('delphin', '"The little prince was there as well. He seemed convinced enough. Not me, though. I know what a stupendous judge of character I am."', { mood: 'smug' });
      if (api.get('f_kessie_secret_told', true)) await api.think('The tea. The warm, sunny haze. I don\'t know what I told her. I don\'t know. Keep it together. You can rest once it\'s over.');
      var c = await api.choice([
        '"I appreciate your faith. I\'m not sure I deserve it. Not from you. Not after everything."',
        '"She\'s lying."'
      ]);
      if (c === 1) await api.say('delphin', '"Obviously. She\'s a professional."');
      else await api.say('delphin', '"Sure," he says, waving a hand. "But you see, it\'s things like this."');
      api.unlockPlayer();
    };
    var talk2 = async function () {
      S.hobbleTalk = 2;
      api.lockPlayer();
      await api.say('delphin', ['"I know you hurt yourself trying to get to me. That in itself is enough proof that you\'re better than most human beings."', '"But clearly that injury isn\'t enough to stop you, whereas I\'d be completely screwed if you left me here. But instead of taking the guaranteed win, you\'re dragging me along with you. Someone who does that doesn\'t also go around betraying people."']);
      api.add('m_delphin', 10);
      await api.say('delphin', '"Besides. I don\'t know why anyone would believe that old lady after we all just found out about all those people she killed."');
      await api.say('luna', '"I\'ll tell you why Kessie forgave me. I promise. Once we get out of here."');
      await api.say('delphin', '"Hey, works for me. And I promise to be the best listener in the world. No interruptions or little pointed comments from me."', { mood: 'happy' });
      await api.say('luna', '"I\'ll believe it when I see it."', { mood: 'happy' });
      await api.say('delphin', '"Hey! Didn\'t we just cover that we\'re supposed to believe in each other without question?"', { mood: 'happy' });
      await api.think('I laugh. How does he do that, even now? He should be visiting kids in hospitals. Hosting his own show where no one gets hurt.');
      api.unlockPlayer();
    };
    S.talkFns = [talk, talk2];
    await roam(api, 'Hobble to the centre of the maze', function () {
      if (S.hobbleTalk === 0 && S.steps >= 5 && !S.talking) { S.talking = true; talk().then(function () { S.talking = false; }); }
      else if (S.hobbleTalk === 1 && S.steps >= 16 && !S.talking) { S.talking = true; talk2().then(function () { S.talking = false; }); }
      return api.room() === 'maze_centre' && !S.talking;
    }, { target: 'room:maze_centre', maze: true });
    if (S.hobbleTalk < 1) await talk();
    if (S.hobbleTalk < 2) await talk2();
  }

  /* ================================================================ CENTRE */
  async function centre(api) {
    S.follow = false;
    if (!api.npc('delphin')) api.addNpc({ id: 'delphin', at: [7, 12], spec: 'delphin_hurt', solid: false });
    api.placeNpc('delphin', [7, 12], 'up');
    api.hide('isaiah'); api.hide('annette');
    await api.narrate('An egg-shaped chamber. Against the back wall, a grand door, the kind you\'d find in front of a ballroom, wreathed in spiked ivy.');
    await api.say('luna', '"I think this is it. We made it to the centre."');
    api.objective('The ivy door', { target: 'ivydoor' });
    await api.waitForInteract('ivydoor');
    api.lockPlayer();
    await api.move('delphin', [7, 4]);
    await api.narrate('No keyholes. I lower Delphin to the floor and smooth my hands over the rich wood, tracing every gouge. No easy answer.');
    await api.narrate('Delphin, watching me with a bemused expression, reaches up his hand and twists the doorknob.');
    api.remove('ivydoor'); api.sound('door');
    api.show('isaiah'); api.show('annette');
    await api.pan([6, 2], 700);
    await api.narrate('The door swings open. Isaiah and Annette are watching us from the other side.');
    await api.cameraReset(500);
    await api.say('luna', '"Looks like we\'re the last ones."');
    await api.say('annette', '"It seems so."', { mood: 'smug' });
    api.approval('+0');
    await api.think(['A part of me I\'m not proud of wants to step across that doorframe right now.', 'You\'ve gotten him this far, a cruel little voice says. Two steps. Left, then right, and this is all over.']);
    await api.say('delphin', ['"It\'s okay."', '"You go ahead. I wouldn\'t have gotten this far if it weren\'t for you. I\'ll be fine in the vote."'], { mood: 'tired' });
    await api.say('delphin', '"Haven\'t you heard? People really like me."', { mood: 'happy' });
    await api.say('luna', '"You\'re the one who figured out how to open the door."');
    await api.say('delphin', '"You just needed to turn the knob. You would have gotten it soon enough."');
    await api.think(['Kessie. Her face as she burned. She trusted me the way he trusts me now.', 'What if he\'s wrong? the mean little voice whispers. She was. Go ahead. What\'s one more body on your list?']);
    await api.emote('annette', '…', 900);
    await api.narrate('Annette smiles at me, the serpentine smile from what I now realise wasn\'t a nightmare. She places her hand on Isaiah\'s shoulder. He tilts his head up at her with a look I have worn myself: the longing for a mother you\'ll never get back.');
    await api.think('She\'s got him fully ensnared.');
    api.add('m_isaiah', -5);
    var c = await api.choice(['(Duck down, throw his arm over my shoulder.) "Together."', '(Step through alone.)']);
    if (c === 1) {
      api.unlockPlayer();
      await api.movePlayer([6, 3]);
      api.lockPlayer();
      await api.wait(500);
      await api.think(['One step. The buzzing in my ears grows to a fever pitch.', 'I won\'t do it. I won\'t be like her. No more betrayals.']);
      api.face('player', 'down');
      await api.movePlayer([6, 4]);
    } else {
      await api.think('I won\'t do it. I won\'t be like her. No more betrayals.');
    }
    await api.say('luna', '"Together. If they want a loser so bad, they can figure it out themselves."', { mood: 'angry' });
    await api.say('delphin', '"Well, I do adore telling the man to stick it. You have my agreement."', { mood: 'happy' });
    api.set('f_carried_delphin', true);
    api.approvalAdd(+8);
    api.teleport([6, 4], 'up');
    api.placeNpc('delphin', [7, 4], 'up');
    await api.move('player', [6, 2], { speed: 30 });
    api.placeNpc('delphin', [7, 2], 'up');
    await api.narrate('Together, we take the last few steps through the doorframe. Annette is no longer smiling. Isaiah just looks confused. We collapse the second we\'re through, a pile of limbs and knobby knees.');
    await pa(api, '"Congratulations on completing your challenge. The results will be given to you upon your return to the mansion."');
    await api.think('Upon your return. So this isn\'t the mansion. Even a place that big couldn\'t hold something this expansive.');
    api.lowerThird(null);
    api.sound('static');
    await api.narrate('The crackling disappears, replaced by a soft hissing. I\'m suddenly so tired. I pinch my arm, hard. It buys me a second.');
    await api.fadeOut(2200, '#e8efe8');
    api.onAir(false);
    await api.think('My last thought before I pass out: Waverly, I hope it helps to see that I did the right thing this time.');
    api.approval(false);
    api.completeChapter();
  }
})();
