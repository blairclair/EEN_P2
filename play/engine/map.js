/* =========================================================================
 * map.js: tile types, default ASCII legend, props, map building + drawing.
 *
 * A map is ASCII rows + a legend. Each char -> a tile type name.
 * Tile types are procedural (drawn in code) and cached per variant.
 * Custom tile: G.registerTile('neon', {color:'#203', color2:'#f0f', pattern:'grid', solid:false})
 *   patterns: plain|planks|checker|noise|grid|bricks|stripes|dots|tiles|plates
 *   wall:true  => draws a 3/4 "front face" when the tile below is not a wall.
 *   base:'floor' => draw this tile first, then the custom draw on top.
 *   draw(g, x, y, info) => fully custom (g = low-res ctx, x/y = pixel top-left,
 *   info = {r (0..1 per-tile random), face (bool), t (seconds), tx, ty}). Set anim:true if it uses t.
 * ========================================================================= */
(function () {
  'use strict';
  var G = window.G;
  var U = G.util;
  var M = (G.Map = {});
  var T = G.TILE;

  /* ---------------- default legend ---------------- */
  M.LEGEND = {
    '#': 'wall', 'B': 'brick', 'Q': 'whitewall', 'W': 'window', 'D': 'door', 'G': 'glass', 'C': 'curtain', 'E': 'screen',
    '.': 'floor', ',': 'carpet', ':': 'tile', '_': 'concrete', '"': 'grass', '=': 'road', '-': 'sidewalk',
    '~': 'water', ' ': 'void', 'm': 'metal', 's': 'stage', 'g': 'vr', 'R': 'rug', 'x': 'dirt',
    'T': 'table', 'K': 'counter', 'd': 'desk', 'b': 'bed', 'h': 'couch', 'c': 'chair', 'O': 'stove',
    'F': 'fridge', 'S': 'sink', 't': 'toilet', 'k': 'shelf', 'X': 'crate', 'P': 'plant', 'V': 'tv',
    'L': 'lamp', '|': 'bars', 'l': 'locker', 'M': 'mirror', 'n': 'bench', 'p': 'podium', 'u': 'trash',
    'o': 'booth', 'f': 'spotfloor',
    '@': { tile: 'floor', spawn: true }
  };

  /* ---------------- tile drawing helpers ---------------- */
  function px(g, x, y, w, h, c) { g.fillStyle = c; g.fillRect(x, y, w, h); }
  function speckle(g, x, y, c, n, seed, a) {
    var r = U.rng(seed);
    g.fillStyle = c;
    for (var i = 0; i < n; i++) { g.globalAlpha = a == null ? 1 : a; g.fillRect(x + Math.floor(r() * T), y + Math.floor(r() * T), 1, 1); }
    g.globalAlpha = 1;
  }
  /** Generic pattern renderer used by built-ins and custom tiles. */
  M.pattern = function (g, x, y, def, info) {
    var c = def.color || '#555', c2 = def.color2 || U.shade(c, -0.25);
    var seed = info.tx * 31 + info.ty * 17 + (def.seed || 0);
    px(g, x, y, T, T, c);
    switch (def.pattern) {
      case 'planks':
        for (var i = 0; i < 4; i++) {
          px(g, x, y + i * 4 + 3, T, 1, c2);
          var off = ((info.ty * 4 + i) * 7) % 16;
          px(g, x + off, y + i * 4, 1, 3, c2);
        }
        speckle(g, x, y, U.shade(c, 0.1), 6, seed, 0.6);
        break;
      case 'checker':
        var half = 8;
        px(g, x + ((info.tx + info.ty) % 2 ? 0 : half), y, half, half, c2);
        px(g, x + ((info.tx + info.ty) % 2 ? half : 0), y + half, half, half, c2);
        px(g, x, y, T, 1, U.rgba('#000000', 0.15));
        break;
      case 'tiles':
        px(g, x, y + T - 1, T, 1, c2); px(g, x + T - 1, y, 1, T, c2);
        px(g, x + 1, y + 1, 4, 1, U.shade(c, 0.12));
        break;
      case 'grid':
        px(g, x, y, T, 1, c2); px(g, x, y, 1, T, c2);
        break;
      case 'bricks':
        for (var r = 0; r < 4; r++) {
          px(g, x, y + r * 4 + 3, T, 1, c2);
          var o = r % 2 ? 0 : 4;
          px(g, x + o, y + r * 4, 1, 3, c2); px(g, x + o + 8, y + r * 4, 1, 3, c2);
        }
        break;
      case 'stripes':
        for (var s = 0; s < T; s += 4) px(g, x + s, y, 2, T, c2);
        break;
      case 'dots':
        for (var dy = 2; dy < T; dy += 5) for (var dx = 2; dx < T; dx += 5) px(g, x + dx, y + dy, 1, 1, c2);
        break;
      case 'plates':
        px(g, x, y, T, 1, U.shade(c, 0.15)); px(g, x, y, 1, T, U.shade(c, 0.15));
        px(g, x + T - 1, y, 1, T, c2); px(g, x, y + T - 1, T, 1, c2);
        px(g, x + 2, y + 2, 1, 1, c2); px(g, x + 13, y + 2, 1, 1, c2); px(g, x + 2, y + 13, 1, 1, c2); px(g, x + 13, y + 13, 1, 1, c2);
        break;
      case 'noise':
        speckle(g, x, y, c2, 14, seed, 0.8);
        speckle(g, x, y, U.shade(c, 0.12), 8, seed + 99, 0.7);
        break;
      default:
        speckle(g, x, y, c2, 4, seed, 0.4);
    }
  };

  /** Wall drawer: top (seen from above) vs front face. */
  function wallDraw(top, face, faceStyle) {
    return function (g, x, y, info) {
      if (!info.face) {
        px(g, x, y, T, T, top);
        px(g, x, y, T, 1, U.shade(top, 0.12));
        speckle(g, x, y, U.shade(top, -0.2), 5, info.tx * 13 + info.ty, 0.6);
        return;
      }
      px(g, x, y, T, T, face);
      px(g, x, y, T, 2, top); px(g, x, y + 2, T, 1, U.shade(face, 0.18));
      if (faceStyle === 'bricks') M.pattern(g, x, y + 3, { color: face, color2: U.shade(face, -0.25), pattern: 'bricks' }, { tx: info.tx, ty: info.ty }), px(g, x, y, T, 3, top), px(g, x, y + 3, T, 1, U.shade(face, 0.18));
      else if (faceStyle === 'tiles') { for (var yy = 4; yy < 14; yy += 4) px(g, x, y + yy, T, 1, U.shade(face, -0.12)); px(g, x + (info.tx % 2) * 8, y + 3, 1, 11, U.shade(face, -0.12)); }
      else { px(g, x + 3 + Math.floor(info.r * 8), y + 4, 1, 9, U.shade(face, -0.06)); }
      px(g, x, y + T - 3, T, 3, U.shade(face, -0.35)); // baseboard
      px(g, x, y + T - 1, T, 1, 'rgba(0,0,0,0.5)');
    };
  }

  /* ---------------- built-in tile types ---------------- */
  var TILES = {
    floor: { color: '#4f4238', color2: '#3d322a', pattern: 'planks' },
    carpet: { color: '#46323c', color2: '#3a2832', pattern: 'noise' },
    tile: { color: '#9a978c', color2: '#7a776e', pattern: 'checker' },
    concrete: { color: '#4b4b52', color2: '#3d3d44', pattern: 'noise' },
    grass: { color: '#33492f', color2: '#273a24', pattern: 'noise' },
    road: { color: '#29292e', color2: '#202024', pattern: 'noise' },
    sidewalk: { color: '#5e5c64', color2: '#4c4a52', pattern: 'grid' },
    dirt: { color: '#4a3a2a', color2: '#3a2c20', pattern: 'noise' },
    metal: { color: '#474d56', color2: '#353a42', pattern: 'plates' },
    stage: {
      draw: function (g, x, y, info) {
        px(g, x, y, T, T, '#1d1726'); px(g, x, y, T, 1, '#2a2236');
        px(g, x + (info.tx * 5) % 16, y + 4, 3, 1, 'rgba(255,255,255,0.08)');
        px(g, x, y + T - 1, T, 1, '#120e18');
      }
    },
    spotfloor: { // stage floor lit by a spotlight
      draw: function (g, x, y) { px(g, x, y, T, T, '#3a3046'); px(g, x + 2, y + 2, 12, 12, '#4a3e58'); px(g, x + 5, y + 5, 6, 6, '#5a4c6a'); }
    },
    vr: {
      anim: true,
      draw: function (g, x, y, info) {
        px(g, x, y, T, T, '#070a16');
        var pulse = 0.35 + 0.25 * Math.sin(info.t * 2 + (info.tx + info.ty) * 0.4);
        g.fillStyle = 'rgba(63,193,201,' + pulse + ')';
        g.fillRect(x, y, T, 1); g.fillRect(x, y, 1, T);
      }
    },
    water: {
      anim: true,
      draw: function (g, x, y, info) {
        px(g, x, y, T, T, '#1d3346');
        var o = Math.floor(info.t * 4 + info.tx * 3) % 16;
        px(g, x + o, y + 4, 4, 1, '#2f4d66'); px(g, x + (o + 8) % 16, y + 11, 4, 1, '#2f4d66');
      }
    },
    void: { solid: true, color: '#050507', pattern: 'plain', draw: function (g, x, y) { px(g, x, y, T, T, '#050507'); } },
    rug: {
      draw: function (g, x, y) {
        px(g, x, y, T, T, '#6a2b2f'); px(g, x + 1, y + 1, T - 2, T - 2, '#7a3438');
        px(g, x + 3, y + 3, T - 6, T - 6, '#6a2b2f'); px(g, x + 7, y + 7, 2, 2, '#c9a24a');
      }
    },
    wall: { solid: true, wall: true, draw: wallDraw('#25232d', '#4a4656', 'plain') },
    brick: { solid: true, wall: true, draw: wallDraw('#2a2222', '#6a3a30', 'bricks') },
    whitewall: { solid: true, wall: true, draw: wallDraw('#2c2e32', '#a9aba6', 'tiles') },
    curtain: {
      solid: true, wall: true,
      draw: function (g, x, y, info) {
        px(g, x, y, T, T, '#5a0f18');
        for (var i = 0; i < T; i += 4) { px(g, x + i, y, 2, T, '#7a1824'); px(g, x + i + 2, y, 1, T, '#3a0a10'); }
        if (info.face) px(g, x, y + T - 2, T, 2, '#2a0508');
      }
    },
    window: {
      solid: true, wall: true,
      draw: function (g, x, y, info) {
        wallDraw('#25232d', '#4a4656', 'plain')(g, x, y, info);
        if (!info.face) return;
        px(g, x + 3, y + 4, 10, 8, '#1a2a3e'); px(g, x + 3, y + 4, 10, 1, '#555');
        px(g, x + 8, y + 4, 1, 8, '#555'); px(g, x + 3, y + 8, 10, 1, '#555');
        px(g, x + 4, y + 5, 2, 2, 'rgba(180,210,255,0.35)');
      }
    },
    glass: {
      solid: true,
      draw: function (g, x, y) {
        px(g, x, y, T, T, '#2a3540'); px(g, x, y + 6, T, 4, '#4a6070');
        px(g, x + 3, y + 6, 3, 1, 'rgba(255,255,255,0.4)'); px(g, x, y + 10, T, 1, '#1a2028');
      }
    },
    door: {
      solid: false, door: true,
      draw: function (g, x, y, info) {
        px(g, x, y, T, T, '#25232d');
        px(g, x + 2, y + 1, 12, 15, '#2a1d14');
        px(g, x + 3, y + 2, 10, 14, '#6a4a30'); px(g, x + 3, y + 2, 10, 1, '#7a5a3e');
        px(g, x + 4, y + 4, 8, 4, '#5a3e28'); px(g, x + 4, y + 10, 8, 4, '#5a3e28');
        px(g, x + 11, y + 9, 1, 1, '#d8b860');
        void info;
      }
    },
    screen: {
      solid: true, wall: true, anim: true,
      draw: function (g, x, y, info) {
        px(g, x, y, T, T, '#0c0c12');
        var c = Math.sin(info.t * 3 + info.tx) > 0.6 ? '#3a1018' : '#18101e';
        px(g, x + 1, y + 2, T - 2, T - 4, c);
        g.fillStyle = 'rgba(232,50,60,0.25)';
        for (var yy = 3; yy < T - 2; yy += 2) g.fillRect(x + 1, y + yy, T - 2, 1);
        if (info.tx % 3 === 0) px(g, x + 6, y + 6, 4, 4, 'rgba(255,220,220,0.35)');
      }
    },
    // ---- furniture (drawn over a floor base) ----
    table: {
      solid: true, base: 'floor',
      draw: function (g, x, y) { px(g, x + 1, y + 3, 14, 9, '#6b4a32'); px(g, x + 1, y + 3, 14, 1, '#8a6444'); px(g, x + 1, y + 12, 14, 2, '#3a281a'); px(g, x + 2, y + 14, 2, 2, '#2a1c12'); px(g, x + 12, y + 14, 2, 2, '#2a1c12'); }
    },
    counter: {
      solid: true, base: 'tile',
      draw: function (g, x, y) { px(g, x, y + 2, T, 10, '#b8b4aa'); px(g, x, y + 2, T, 1, '#d8d4ca'); px(g, x, y + 12, T, 4, '#5a5048'); px(g, x + 7, y + 13, 2, 1, '#a89060'); }
    },
    desk: {
      solid: true, base: 'floor',
      draw: function (g, x, y) { px(g, x + 1, y + 3, 14, 9, '#4a4a52'); px(g, x + 1, y + 3, 14, 1, '#62626c'); px(g, x + 1, y + 12, 14, 3, '#2a2a30'); px(g, x + 4, y + 4, 6, 4, '#1a2a2a'); px(g, x + 5, y + 5, 4, 2, '#3fc1c9'); }
    },
    bed: {
      solid: true, base: 'floor',
      draw: function (g, x, y) { px(g, x + 1, y + 1, 14, 14, '#3a3036'); px(g, x + 2, y + 2, 12, 4, '#cfc8ba'); px(g, x + 2, y + 6, 12, 8, '#55657a'); px(g, x + 2, y + 6, 12, 1, '#6a7a90'); px(g, x + 1, y + 15, 14, 1, '#1a1418'); }
    },
    couch: {
      solid: true, base: 'floor',
      draw: function (g, x, y) { px(g, x, y + 2, T, 12, '#5a3a3a'); px(g, x, y + 2, T, 4, '#4a2e2e'); px(g, x + 1, y + 7, 6, 5, '#6a4646'); px(g, x + 9, y + 7, 6, 5, '#6a4646'); px(g, x, y + 14, T, 1, '#2a1a1a'); }
    },
    chair: {
      solid: false, base: 'floor',
      draw: function (g, x, y) { px(g, x + 4, y + 2, 8, 3, '#5a3e28'); px(g, x + 4, y + 5, 8, 6, '#6b4a32'); px(g, x + 4, y + 11, 1, 3, '#3a281a'); px(g, x + 11, y + 11, 1, 3, '#3a281a'); }
    },
    bench: {
      solid: true, base: 'concrete',
      draw: function (g, x, y) { px(g, x, y + 5, T, 5, '#5a4636'); px(g, x, y + 5, T, 1, '#7a6046'); px(g, x + 2, y + 10, 2, 4, '#2a2a2a'); px(g, x + 12, y + 10, 2, 4, '#2a2a2a'); }
    },
    stove: {
      solid: true, base: 'tile',
      draw: function (g, x, y) { px(g, x + 1, y + 1, 14, 14, '#c8c8c0'); px(g, x + 1, y + 1, 14, 2, '#e8e8e0'); px(g, x + 3, y + 4, 4, 4, '#222'); px(g, x + 9, y + 4, 4, 4, '#222'); px(g, x + 3, y + 10, 10, 4, '#444'); }
    },
    fridge: {
      solid: true, base: 'tile', wall: false,
      draw: function (g, x, y) { px(g, x + 1, y, 14, 16, '#d8d8d2'); px(g, x + 1, y + 6, 14, 1, '#999'); px(g, x + 12, y + 2, 1, 3, '#888'); px(g, x + 12, y + 8, 1, 5, '#888'); px(g, x + 14, y, 1, 16, '#aaa'); }
    },
    sink: {
      solid: true, base: 'tile',
      draw: function (g, x, y) { px(g, x + 1, y + 2, 14, 11, '#b8b8b0'); px(g, x + 3, y + 4, 10, 7, '#7a8a90'); px(g, x + 7, y + 2, 2, 3, '#ddd'); }
    },
    toilet: {
      solid: true, base: 'tile',
      draw: function (g, x, y) { px(g, x + 4, y + 1, 8, 4, '#ddd'); px(g, x + 3, y + 5, 10, 9, '#e8e8e8'); px(g, x + 5, y + 7, 6, 5, '#9ab'); }
    },
    shelf: {
      solid: true, base: 'floor',
      draw: function (g, x, y, info) {
        px(g, x, y, T, T, '#3a2a1e'); px(g, x, y + 7, T, 1, '#2a1c12'); px(g, x, y + 15, T, 1, '#2a1c12');
        var cols = ['#8a3a3a', '#3a5a8a', '#6a7a3a', '#9a8a5a', '#5a3a6a'];
        for (var i = 0; i < 6; i++) { px(g, x + 1 + i * 2 + (i > 2 ? 1 : 0), y + 2 + (i % 2), 2, 5 - (i % 2), cols[(i + info.tx) % 5]); px(g, x + 1 + i * 2, y + 10, 2, 5, cols[(i * 3 + info.ty) % 5]); }
      }
    },
    crate: {
      solid: true, base: 'concrete',
      draw: function (g, x, y) { px(g, x + 1, y + 1, 14, 14, '#6a5434'); px(g, x + 1, y + 1, 14, 1, '#8a7048'); px(g, x + 1, y + 7, 14, 1, '#4a3a22'); px(g, x + 1, y + 1, 1, 14, '#4a3a22'); px(g, x + 14, y + 1, 1, 14, '#4a3a22'); px(g, x + 2, y + 2, 12, 12, 'rgba(0,0,0,0)'); }
    },
    plant: {
      solid: true, base: 'floor',
      draw: function (g, x, y) { px(g, x + 5, y + 10, 6, 5, '#7a4a2a'); px(g, x + 3, y + 3, 10, 7, '#2f5a2a'); px(g, x + 5, y + 1, 6, 4, '#3d7034'); px(g, x + 4, y + 5, 2, 2, '#4a8a3e'); }
    },
    tv: {
      solid: true, base: 'floor', anim: true,
      draw: function (g, x, y, info) {
        px(g, x + 1, y + 3, 14, 10, '#1a1a1e'); px(g, x + 2, y + 4, 12, 7, Math.sin(info.t * 7) > 0 ? '#2a3a4e' : '#33465e');
        px(g, x + 2 + Math.floor((info.t * 20) % 12), y + 4, 1, 7, 'rgba(255,255,255,0.15)');
        px(g, x + 6, y + 13, 4, 2, '#111');
      }
    },
    lamp: {
      solid: true, base: 'floor',
      draw: function (g, x, y) { px(g, x + 7, y + 6, 2, 9, '#333'); px(g, x + 4, y + 2, 8, 5, '#d8c890'); px(g, x + 5, y + 14, 6, 1, '#222'); g.fillStyle = 'rgba(255,230,160,0.12)'; g.fillRect(x, y, T, T); }
    },
    bars: {
      solid: true, base: 'concrete',
      draw: function (g, x, y) { for (var i = 1; i < T; i += 4) { px(g, x + i, y, 2, T, '#6a6e76'); px(g, x + i, y, 1, T, '#9aa0aa'); } px(g, x, y + 2, T, 2, '#5a5e66'); px(g, x, y + 12, T, 2, '#5a5e66'); }
    },
    locker: {
      solid: true, base: 'metal',
      draw: function (g, x, y) { px(g, x + 1, y, 14, 16, '#4a5a6a'); px(g, x + 8, y, 1, 16, '#2a3440'); px(g, x + 3, y + 2, 3, 1, '#2a3440'); px(g, x + 10, y + 2, 3, 1, '#2a3440'); px(g, x + 6, y + 8, 1, 2, '#aaa'); px(g, x + 10, y + 8, 1, 2, '#aaa'); }
    },
    mirror: {
      solid: true, wall: true,
      draw: function (g, x, y, info) { wallDraw('#25232d', '#4a4656', 'plain')(g, x, y, info); if (info.face) { px(g, x + 3, y + 3, 10, 9, '#9ab0c0'); px(g, x + 4, y + 4, 3, 3, '#d0e0ea'); px(g, x + 3, y + 3, 10, 1, '#c9a24a'); } }
    },
    podium: {
      solid: true, base: 'stage',
      draw: function (g, x, y) { px(g, x + 2, y + 2, 12, 13, '#2a2234'); px(g, x + 2, y + 2, 12, 3, '#e8c15a'); px(g, x + 5, y + 7, 6, 5, '#e8323c'); px(g, x + 7, y + 8, 2, 3, '#fff'); }
    },
    trash: {
      solid: true, base: 'concrete',
      draw: function (g, x, y) { px(g, x + 3, y + 3, 10, 12, '#3a4a3a'); px(g, x + 2, y + 2, 12, 2, '#4a5a4a'); px(g, x + 5, y + 6, 1, 7, '#2a3a2a'); px(g, x + 9, y + 6, 1, 7, '#2a3a2a'); }
    },
    booth: { // confessional chair facing a camera
      solid: true, base: 'carpet',
      draw: function (g, x, y) { px(g, x + 2, y + 2, 12, 12, '#2a1a22'); px(g, x + 3, y + 3, 10, 5, '#7a2030'); px(g, x + 3, y + 8, 10, 5, '#8a2a3a'); px(g, x + 3, y + 3, 10, 1, '#a03a4a'); }
    }
  };
  Object.keys(TILES).forEach(function (k) { G.registerTile(k, TILES[k]); });

  /* ---------------- tile cache + draw ---------------- */
  var tcache = {};
  M.clearCache = function () { tcache = {}; };
  M.tileDef = function (name) { return G.lookup('tiles', name) || G.registry.tiles.floor; };
  M.drawTile = function (g, name, x, y, tx, ty, face, t) {
    var def = M.tileDef(name);
    var r = U.hash2(tx, ty, 7);
    var info = { r: r, face: !!face, t: t || 0, tx: tx, ty: ty };
    if (def.anim) { renderTile(g, def, x, y, info); return; }
    var variant = Math.floor(r * 4);
    var key = def.name + '|' + (face ? 1 : 0) + '|' + variant + '|' + (tx % 2) + (ty % 2) + '|' + (def.pattern === 'planks' ? ty % 4 : 0);
    var c = tcache[key];
    if (!c) {
      c = document.createElement('canvas'); c.width = T; c.height = T;
      var cg = c.getContext('2d');
      // render with a representative tx/ty so variants differ but cache stays small
      renderTile(cg, def, 0, 0, { r: (variant + 0.5) / 4, face: !!face, t: 0, tx: (tx % 2) + variant * 2, ty: ty % 4 });
      tcache[key] = c;
    }
    g.drawImage(c, x, y);
  };
  function renderTile(g, def, x, y, info) {
    try {
      if (def.base) renderTile(g, M.tileDef(def.base), x, y, info);
      if (def.draw) def.draw(g, x, y, info);
      else if (def.wall) wallDraw(def.color2 || U.shade(def.color || '#444', -0.4), def.color || '#4a4656', def.pattern === 'bricks' ? 'bricks' : def.pattern === 'tiles' ? 'tiles' : 'plain')(g, x, y, info);
      else M.pattern(g, x, y, def, info);
    } catch (e) { G.reportError(e, 'tile ' + def.name); def.draw = null; }
  }

  /* ---------------- props (object sprites) ----------------
   * fn(g, x, y, t, obj): x,y = tile top-left in low-res pixels.
   */
  var PROPS = {
    note: function (g, x, y, t) { var b = Math.sin(t * 3) * 0.5; px(g, x + 4, y + 6 + b, 8, 6, '#e9dfc4'); px(g, x + 5, y + 8 + b, 6, 1, '#888'); px(g, x + 5, y + 10 + b, 4, 1, '#888'); },
    letter: function (g, x, y) { px(g, x + 3, y + 5, 10, 7, '#e9dfc4'); px(g, x + 3, y + 5, 10, 1, '#c9bfa4'); px(g, x + 4, y + 6, 4, 3, '#b03030'); },
    camera: function (g, x, y, t) { // wall-mounted surveillance camera
      px(g, x + 3, y + 1, 10, 5, '#2a2a30'); px(g, x + 3, y + 1, 10, 1, '#444'); px(g, x + 11, y + 2, 3, 3, '#111'); px(g, x + 7, y + 6, 2, 3, '#333');
      if (Math.floor(t * 2) % 2 === 0) px(g, x + 4, y + 2, 1, 1, '#ff3040');
    },
    tvset: function (g, x, y, t) { px(g, x + 1, y + 2, 14, 11, '#1a1a1e'); px(g, x + 2, y + 3, 12, 8, Math.sin(t * 7) > 0 ? '#2a3a4e' : '#3a4a62'); px(g, x + 5, y + 13, 6, 2, '#111'); },
    phone: function (g, x, y) { px(g, x + 5, y + 6, 6, 8, '#222'); px(g, x + 6, y + 7, 4, 5, '#3fc1c9'); },
    box: function (g, x, y) { px(g, x + 2, y + 5, 12, 10, '#7a6040'); px(g, x + 2, y + 5, 12, 2, '#9a7a50'); px(g, x + 7, y + 5, 2, 10, '#5a4428'); },
    cup: function (g, x, y) { px(g, x + 6, y + 8, 4, 5, '#ddd'); px(g, x + 10, y + 9, 2, 2, '#ddd'); px(g, x + 7, y + 8, 2, 1, '#6a3a1a'); },
    teacup: function (g, x, y, t) { px(g, x + 4, y + 12, 8, 1, '#ccc'); px(g, x + 5, y + 9, 6, 3, '#e8e8e8'); px(g, x + 11, y + 10, 1, 1, '#e8e8e8'); px(g, x + 6, y + 9, 4, 1, '#8a5a2a'); g.globalAlpha = 0.4; px(g, x + 7 + Math.round(Math.sin(t * 3)), y + 5, 1, 3, '#fff'); g.globalAlpha = 1; },
    mic: function (g, x, y) { px(g, x + 7, y + 4, 2, 11, '#333'); px(g, x + 6, y + 2, 4, 3, '#999'); px(g, x + 5, y + 14, 6, 1, '#222'); },
    gavel: function (g, x, y) { px(g, x + 3, y + 6, 6, 3, '#6a3a1a'); px(g, x + 8, y + 7, 6, 1, '#8a5a2a'); px(g, x + 4, y + 11, 8, 2, '#4a2a10'); },
    photo: function (g, x, y) { px(g, x + 4, y + 4, 8, 9, '#ddd'); px(g, x + 5, y + 5, 6, 6, '#6a7a8a'); px(g, x + 7, y + 6, 2, 2, '#d8a888'); },
    poster: function (g, x, y) { px(g, x + 3, y + 1, 10, 12, '#c83a3a'); px(g, x + 4, y + 2, 8, 6, '#222'); px(g, x + 6, y + 3, 4, 4, '#e8c15a'); px(g, x + 4, y + 9, 8, 1, '#eee'); px(g, x + 4, y + 11, 6, 1, '#eee'); },
    spotlight: function (g, x, y) { px(g, x + 4, y + 4, 8, 6, '#333'); px(g, x + 5, y + 5, 6, 4, '#ffe9a0'); px(g, x + 7, y + 10, 2, 5, '#222'); },
    flowers: function (g, x, y) { px(g, x + 6, y + 9, 4, 5, '#5a7a9a'); px(g, x + 5, y + 5, 2, 2, '#e85a7a'); px(g, x + 9, y + 4, 2, 2, '#e8c15a'); px(g, x + 7, y + 3, 2, 2, '#fff'); px(g, x + 7, y + 6, 1, 3, '#3a6a2a'); },
    bag: function (g, x, y) { px(g, x + 4, y + 7, 8, 7, '#4a3a5a'); px(g, x + 6, y + 5, 4, 2, '#3a2a4a'); },
    key: function (g, x, y, t) { var b = Math.sin(t * 4); px(g, x + 5, y + 8 + b, 3, 3, '#e8c15a'); px(g, x + 8, y + 9 + b, 4, 1, '#e8c15a'); },
    sign: function (g, x, y) { px(g, x + 7, y + 8, 2, 7, '#444'); px(g, x + 2, y + 2, 12, 7, '#d8d0b0'); px(g, x + 3, y + 4, 10, 1, '#333'); px(g, x + 3, y + 6, 7, 1, '#333'); },
    votebox: function (g, x, y) { px(g, x + 2, y + 4, 12, 11, '#2a2234'); px(g, x + 2, y + 4, 12, 2, '#e8323c'); px(g, x + 5, y + 8, 6, 1, '#000'); },
    monitor: function (g, x, y, t) { px(g, x + 2, y + 3, 12, 9, '#111'); px(g, x + 3, y + 4, 10, 7, '#0a2a1a'); px(g, x + 4, y + 5 + Math.floor(t * 2) % 5, 6, 1, '#4aff8a'); px(g, x + 7, y + 12, 2, 3, '#222'); },
    bucket: function (g, x, y) { px(g, x + 4, y + 7, 8, 7, '#7a8a9a'); px(g, x + 4, y + 7, 8, 1, '#aab'); px(g, x + 5, y + 5, 6, 1, '#555'); },
    sparkle: function (g, x, y, t) { if (Math.sin(t * 5) > 0) { px(g, x + 7, y + 5, 1, 5, '#fff'); px(g, x + 5, y + 7, 5, 1, '#fff'); } },
    glow: function (g, x, y, t) { g.globalAlpha = 0.25 + 0.15 * Math.sin(t * 2); px(g, x + 2, y + 2, 12, 12, '#ffe9a0'); g.globalAlpha = 1; },
    blood: function (g, x, y) { px(g, x + 3, y + 8, 7, 4, '#5a0a10'); px(g, x + 9, y + 10, 3, 2, '#5a0a10'); },
    pill: function (g, x, y) { px(g, x + 6, y + 9, 4, 2, '#e8e8e8'); px(g, x + 8, y + 9, 2, 2, '#3fc1c9'); },
    crowdbar: function (g, x, y) { px(g, x, y + 6, 16, 2, '#888'); px(g, x + 2, y + 8, 1, 7, '#666'); px(g, x + 13, y + 8, 1, 7, '#666'); }
  };
  Object.keys(PROPS).forEach(function (k) { G.registerProp(k, PROPS[k]); });

  /* ---------------- build a room from a map definition ----------------
   * returns {def, w, h, grid[y][x] (tile names), solid[y][x], spawn}
   */
  M.build = function (def) {
    var rows = def.tiles || def.map || [];
    var legend = {};
    Object.keys(M.LEGEND).forEach(function (k) { legend[k] = M.LEGEND[k]; });
    if (def.legend) Object.keys(def.legend).forEach(function (k) { legend[k] = def.legend[k]; });
    var h = rows.length, w = 0;
    rows.forEach(function (r) { w = Math.max(w, r.length); });
    var grid = [], spawn = null, markers = {};
    for (var y = 0; y < h; y++) {
      grid.push([]);
      for (var x = 0; x < w; x++) {
        var ch = rows[y].charAt(x) || ' ';
        var e = legend[ch];
        if (e === undefined) { G.warn('map ' + def.id + ': unknown char "' + ch + '" at ' + x + ',' + y); e = 'floor'; }
        var name = typeof e === 'string' ? e : e.tile || 'floor';
        if (typeof e === 'object' && e.spawn) spawn = { x: x, y: y };
        if (typeof e === 'object' && e.marker) (markers[e.marker] = markers[e.marker] || []).push({ x: x, y: y });
        if (!G.lookup('tiles', name, def.ns)) { G.warn('map ' + def.id + ': unknown tile "' + name + '"'); name = 'floor'; }
        grid[y].push(G.lookupKey('tiles', name, def.ns) || name);
      }
    }
    var room = { def: def, w: w, h: h, grid: grid, spawn: def.spawn ? { x: def.spawn[0] != null ? def.spawn[0] : def.spawn.x, y: def.spawn[1] != null ? def.spawn[1] : def.spawn.y } : spawn || { x: 1, y: 1 }, markers: markers };
    return room;
  };
  M.isWall = function (room, x, y) {
    if (x < 0 || y < 0 || x >= room.w || y >= room.h) return false;
    var d = M.tileDef(room.grid[y][x]);
    return !!d.wall;
  };
  M.solidAt = function (room, tx, ty) {
    if (tx < 0 || ty < 0 || tx >= room.w || ty >= room.h) return true;
    var d = M.tileDef(room.grid[ty][tx]);
    return !!d.solid;
  };

  /**
   * Line of sight in pixels between (ax,ay) and (bx,by) across a built room. Samples every 4px.
   * The ORIGIN tile is ignored, so a camera mounted on a solid wall tile can see out of it.
   */
  M.lineOfSight = function (room, ax, ay, bx, by) {
    var d = Math.hypot(bx - ax, by - ay), n = Math.ceil(d / 4);
    var ox = Math.floor(ax / T), oy = Math.floor(ay / T);
    for (var i = 1; i < n; i++) {
      var x = ax + (bx - ax) * i / n, y = ay + (by - ay) * i / n, tx = Math.floor(x / T), ty = Math.floor(y / T);
      if (tx === ox && ty === oy) continue;
      if (M.solidAt(room, tx, ty)) return false;
    }
    return true;
  };
  /** Distance (px, <= range) a ray from (ax,ay) at angle travels before hitting a solid tile; origin tile ignored. */
  M.rayLength = function (room, ax, ay, ang, range, step) {
    step = step || 4;
    var ox = Math.floor(ax / T), oy = Math.floor(ay / T);
    for (var k = step; k <= range; k += step) {
      var tx = Math.floor((ax + Math.cos(ang) * k) / T), ty = Math.floor((ay + Math.sin(ang) * k) / T);
      if (tx === ox && ty === oy) continue;
      if (M.solidAt(room, tx, ty)) return k;
    }
    return range;
  };

  /** Draw the visible tiles of a room into the low-res ctx. cam = top-left pixel. */
  M.draw = function (g, room, camX, camY, t) {
    var x0 = Math.max(0, Math.floor(camX / T)), y0 = Math.max(0, Math.floor(camY / T));
    var x1 = Math.min(room.w - 1, Math.floor((camX + G.W) / T)), y1 = Math.min(room.h - 1, Math.floor((camY + G.H) / T));
    for (var y = y0; y <= y1; y++) {
      for (var x = x0; x <= x1; x++) {
        var name = room.grid[y][x];
        var def = M.tileDef(name);
        var face = def.wall && !M.isWall(room, x, y + 1);
        M.drawTile(g, name, x * T - camX, y * T - camY, x, y, face, t);
        // soft shadow under walls onto floor
        if (!def.wall && y > 0 && M.isWall(room, x, y - 1)) {
          g.fillStyle = 'rgba(0,0,0,0.28)'; g.fillRect(x * T - camX, y * T - camY, T, 3);
        }
      }
    }
  };
})();
