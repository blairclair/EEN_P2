/* =========================================================================
 * shared/tiles.js: House tile types and props (loaded before all chapters).
 * Every name here is GLOBAL: use it from any map legend ('q': 'h_bed_queen') or as an
 * object prop ({ id:'x', at:[3,1], prop:'cam_live' }).
 *
 * Palette ("broadcast noir"): deep aubergine walls, blood-red carpet, gold trim,
 * cold teal screens, and red recording lights everywhere.
 *
 * TILES (h_ prefix):
 *  walls:  h_wall (damask wallpaper) h_wall_cream h_wall_red (red room) h_wall_gold (Trader)
 *          h_wall_green h_wall_white h_wall_gym h_wall_brick h_wall_stone h_leader_wall (Great Leader photos)
 *          h_doll_wall (shelves of dolls) h_mirror_strip h_obs_glass (audience glass, solid) h_curtain_red
 *          h_screen_wall (holoscreen, animated) h_window_garden h_window_rain (animated rain)
 *  floors: h_parquet h_redcarpet h_marble h_kitchen_tile h_rubber h_starfloor h_green_floor
 *          h_gold_carpet h_concrete_wet h_gravel h_lawn h_bluetile h_stage_boards h_stairs h_path
 *          h_spot (spotlit floor) h_drain h_mat (black sandbag mat) h_soakmat ("Soak It Up")
 *  doors (walkable): h_door h_door_jewel h_door_blue h_door_gold h_door_num h_door_double h_door_slat
 *          h_door_steel h_gate
 *  solid furniture: h_bed_queen h_bed_plain h_cot h_armchair h_couch_leather h_couch_velvet
 *          h_island h_bench_bolted h_banquet h_shelf_tall h_desk_gold h_desk h_vanity h_toilet_auto
 *          h_bidet h_fridge_big h_bleachers h_jury_box h_judge_bench h_bandstage h_hedge h_bush
 *          h_almond h_fence h_beam h_weights h_punchbag h_folding_chair (walkable) h_throne
 *          h_chair_row (walkable) h_shelf_supply h_bunk h_counter_lobby h_tablet_wall
 * PROPS: cam_rec cam_live cam_eye stagecam (wheeled tall-neck) speaker poster_obey poster_private
 *        portrait_leader penguin_logo sign_library chandelier (layer 1) star_hang (layer 1) stars_drift
 *        noose_fountain photo_wall mannequin mannequin_headless cage gallows gurney stake woodpile
 *        ballot_toaster samantha doll doll_kneel stool red_button nightstand booklet dpe_pen
 *        lullaby_speaker vr_bed iv_stand tool_tray sandbag metronome gauze_screen holo_counter
 *        mic_stand drum_kit wheel_fortune jackpot pinball gnome keypad floodlight cuffs gas_can
 *        candle candelabra plate_dinner kettle tea_tray mop bleach falsville book_open laptop
 *        trophy key_dish numberplate wristwatch photo_waverly fridge_note bear_toy bunny_toy
 *        vigil_candles checkers green_button shower_panel blood_mat drone
 * ========================================================================= */
(function () {
  'use strict';
  var G = window.G, U = G.util, T = 16;
  function px(g, x, y, w, h, c) { g.fillStyle = c; g.fillRect(x, y, w, h); }
  function speck(g, x, y, c, n, seed, a) { var r = U.rng('sp' + seed); g.fillStyle = c; g.globalAlpha = a == null ? 1 : a; for (var i = 0; i < n; i++) g.fillRect(x + Math.floor(r() * T), y + Math.floor(r() * T), 1, 1); g.globalAlpha = 1; }

  /* --------------------------------------------------------------- walls
   * wall(top, face, decorate) -> 3/4 wall: top view when another wall is below, front face otherwise. */
  function wall(top, face, deco) {
    return function (g, x, y, info) {
      if (!info.face) {
        px(g, x, y, T, T, top); px(g, x, y, T, 1, U.shade(top, 0.14)); speck(g, x, y, U.shade(top, -0.25), 4, info.tx * 7 + info.ty, 0.6);
        return;
      }
      px(g, x, y, T, T, face);
      px(g, x, y, T, 2, top); px(g, x, y + 2, T, 1, U.shade(face, 0.2));     // crown moulding
      if (deco) deco(g, x, y, info, face);
      px(g, x, y + T - 3, T, 3, U.shade(face, -0.4));                      // skirting
      px(g, x, y + T - 3, T, 1, U.shade(face, -0.15));
      px(g, x, y + T - 1, T, 1, 'rgba(0,0,0,0.55)');
    };
  }
  var damask = function (g, x, y, info, f) {
    var d = U.shade(f, -0.18), l = U.shade(f, 0.1);
    px(g, x + 3, y + 5, 2, 1, d); px(g, x + 2, y + 6, 4, 2, d); px(g, x + 3, y + 8, 2, 1, d);
    px(g, x + 11, y + 8, 2, 1, d); px(g, x + 10, y + 9, 4, 2, d); px(g, x + 11, y + 11, 2, 1, d);
    px(g, x, y + 4, T, 1, l); px(g, x + (info.tx % 2) * 8, y + 3, 1, 10, U.shade(f, -0.08));
  };
  var wainscot = function (g, x, y, info, f) {
    px(g, x, y + 8, T, 5, U.shade(f, -0.12)); px(g, x, y + 8, T, 1, U.shade(f, 0.15));
    px(g, x + 2, y + 9, 5, 3, U.shade(f, -0.2)); px(g, x + 9, y + 9, 5, 3, U.shade(f, -0.2));
  };
  var plainLine = function (g, x, y, info, f) { px(g, x + 3 + Math.floor(info.r * 8), y + 4, 1, 8, U.shade(f, -0.07)); };
  var tilesFace = function (g, x, y, info, f) { for (var yy = 5; yy < 13; yy += 4) px(g, x, y + yy, T, 1, U.shade(f, -0.12)); px(g, x + (info.ty % 2) * 8 + 4, y + 3, 1, 10, U.shade(f, -0.12)); };
  var brickFace = function (g, x, y, info, f) { for (var r = 0; r < 3; r++) { px(g, x, y + 3 + r * 4 + 3, T, 1, U.shade(f, -0.3)); var o = r % 2 ? 0 : 4; px(g, x + o, y + 3 + r * 4, 1, 3, U.shade(f, -0.3)); px(g, x + o + 8, y + 3 + r * 4, 1, 3, U.shade(f, -0.3)); } };

  var TILES = {
    h_wall: { solid: true, wall: true, draw: wall('#1a1220', '#3c2440', damask) },
    h_wall_cream: { solid: true, wall: true, draw: wall('#241c22', '#b8a888', wainscot) },
    h_wall_red: { solid: true, wall: true, draw: wall('#3a3a10', '#7a0a14', function (g, x, y, info, f) { px(g, x + 4 + Math.floor(info.r * 6), y + 3, 1, 9, U.shade(f, -0.2)); if (info.r > 0.6) px(g, x + 9, y + 6, 1, 5, '#4a0408'); }) },
    h_wall_gold: { solid: true, wall: true, draw: wall('#3a2a0a', '#b8902a', function (g, x, y, info, f) { px(g, x + 1, y + 4, 14, 8, U.shade(f, -0.1)); px(g, x + 1, y + 4, 14, 1, '#f0d070'); px(g, x + 7, y + 4, 2, 8, '#f0d070'); }) },
    h_wall_green: { solid: true, wall: true, draw: wall('#0e3a1a', '#1f8a3a', plainLine) },
    h_wall_white: { solid: true, wall: true, draw: wall('#3a3c40', '#d8dcdc', tilesFace) },
    h_wall_gym: { solid: true, wall: true, draw: wall('#1a1c22', '#3a4250', function (g, x, y, info, f) { px(g, x, y + 7, T, 2, '#e8323c'); px(g, x, y + 9, T, 1, '#1a1c22'); }) },
    h_wall_brick: { solid: true, wall: true, draw: wall('#2a1a16', '#6a3428', brickFace) },
    h_wall_stone: { solid: true, wall: true, draw: wall('#1a1a1e', '#4a4a52', brickFace) },
    h_leader_wall: { solid: true, wall: true, draw: wall('#1a1220', '#3c2440', function (g, x, y, info) {
      px(g, x + 2, y + 4, 12, 9, '#c9a24a'); px(g, x + 3, y + 5, 10, 7, '#2a3040');
      px(g, x + 6, y + 6, 4, 4, '#d8a888'); px(g, x + 6, y + 6, 4, 1, '#3a2a1a'); px(g, x + 5, y + 10, 6, 2, '#1a2a5a');
      if (info.r > 0.5) { px(g, x + 3, y + 10, 2, 2, '#e8c890'); px(g, x + 11, y + 10, 2, 2, '#c89060'); } // children
    }) },
    h_doll_wall: { solid: true, wall: true, draw: function (g, x, y, info) {
      px(g, x, y, T, T, '#2a1a14'); var rr = U.rng('doll' + info.tx + ':' + info.ty);
      for (var s = 0; s < 2; s++) {
        var sy = y + s * 8; px(g, x, sy + 7, T, 1, '#4a3020');
        for (var d = 0; d < 3; d++) { var dx = x + 1 + d * 5; var sk = ['#f2d8c8', '#e8c0a0', '#c89070'][Math.floor(rr() * 3)];
          px(g, dx, sy + 1, 4, 3, sk); px(g, dx, sy + 1, 4, 1, ['#e8c040', '#5a2a1a', '#c84020', '#1a1a1a'][Math.floor(rr() * 4)]);
          px(g, dx + 1, sy + 2, 1, 1, '#000'); px(g, dx + 2, sy + 2, 1, 1, '#000'); px(g, dx + 1, sy + 3, 1, 2, '#a01020');   // red streaks from hollow eyes
          px(g, dx, sy + 4, 4, 3, ['#d86a9a', '#7a9ae8', '#e8e0d0', '#9a5ad8'][Math.floor(rr() * 4)]); }
      }
      if (info.face) px(g, x, y + T - 1, T, 1, 'rgba(0,0,0,0.6)');
    } },
    h_mirror_strip: { solid: true, wall: true, anim: true, draw: function (g, x, y, info) {
      wall('#1c1c24', '#c8ccd0', null)(g, x, y, info); if (!info.face) return;
      var mode = Math.floor(info.t / 6) % 3; // forest / throne / fairy (the red button cycles them in ch03)
      var c = ['#2a5a3a', '#6a1a2a', '#8a5aa8'][mode];
      px(g, x, y + 4, T, 7, '#9ab0c0'); px(g, x, y + 7, T, 4, U.rgba(c, 0.55));
      px(g, x + ((info.tx * 5) % 12), y + 5, 2, 1, 'rgba(255,255,255,0.6)'); px(g, x, y + 4, T, 1, '#e8e8e8');
    } },
    h_obs_glass: { solid: true, wall: true, anim: true, draw: function (g, x, y, info) {
      px(g, x, y, T, T, '#0a1418'); px(g, x, y, T, 2, '#2a3a44'); px(g, x, y + T - 2, T, 2, '#2a3a44');
      px(g, x + 1, y + 2, T - 2, T - 4, '#16303a');
      // silhouettes of the paying audience behind the glass
      var b = Math.sin(info.t * 0.8 + info.tx * 1.7 + info.ty) > 0.2;
      px(g, x + 4, y + 6 + (b ? 0 : 1), 4, 3, '#0a1014'); px(g, x + 3, y + 9 + (b ? 0 : 1), 6, 5, '#0a1014');
      if (info.ty % 2) px(g, x + 10, y + 5, 3, 3, '#0a1014'), px(g, x + 9, y + 8, 5, 6, '#0a1014');
      px(g, x + 2, y + 3, 1, 4, 'rgba(180,230,255,0.35)'); px(g, x + 3, y + 3, 1, 2, 'rgba(180,230,255,0.25)');
    } },
    h_curtain_red: { solid: true, wall: true, draw: function (g, x, y, info) {
      px(g, x, y, T, T, '#6a0a14'); for (var i = 0; i < T; i += 4) { px(g, x + i, y, 2, T, '#8a1420'); px(g, x + i + 2, y, 1, T, '#3a0408'); }
      px(g, x, y, T, 2, '#c9a24a'); if (info.face) px(g, x, y + T - 2, T, 2, '#2a0408');
    } },
    h_screen_wall: { solid: true, wall: true, anim: true, draw: function (g, x, y, info) {
      px(g, x, y, T, T, '#060810'); var on = 0.5 + 0.5 * Math.sin(info.t * 1.3 + info.tx * 0.3);
      px(g, x, y + 1, T, T - 3, U.rgba('#0e3a4a', 0.6 + 0.3 * on));
      g.fillStyle = 'rgba(63,193,201,0.18)'; for (var yy = 2; yy < T - 2; yy += 2) g.fillRect(x, y + yy, T, 1);
      if ((info.tx + Math.floor(info.t * 2)) % 7 === 0) px(g, x + 3, y + 5, 10, 2, 'rgba(232,50,60,0.6)');
      px(g, x, y + T - 2, T, 2, '#1a1a22');
    } },
    h_window_garden: { solid: true, wall: true, draw: function (g, x, y, info) {
      wall('#1a1220', '#3c2440', null)(g, x, y, info); if (!info.face) return;
      px(g, x + 2, y + 3, 12, 10, '#c9a24a'); px(g, x + 3, y + 4, 10, 8, '#1a2a3a');
      px(g, x + 4, y + 8, 3, 3, '#e8a0b8'); px(g, x + 9, y + 7, 3, 4, '#e8a0b8'); px(g, x + 3, y + 11, 10, 1, '#2a4a2a');
      px(g, x + 8, y + 4, 1, 8, '#c9a24a'); px(g, x + 4, y + 5, 2, 1, 'rgba(255,255,255,0.4)');
    } },
    h_window_rain: { solid: true, wall: true, anim: true, draw: function (g, x, y, info) {
      wall('#2a1a14', '#4a3020', null)(g, x, y, info); if (!info.face) return;
      px(g, x + 2, y + 3, 12, 10, '#3a2a1a'); px(g, x + 3, y + 4, 10, 8, '#1a222e');
      for (var i = 0; i < 4; i++) { var ry = (Math.floor(info.t * 18 + i * 5 + info.tx * 3) % 8); px(g, x + 4 + i * 2, y + 4 + ry, 1, 2, 'rgba(160,190,230,0.6)'); }
      px(g, x + 8, y + 4, 1, 8, '#3a2a1a');
    } },

    h_roof: { solid: true, draw: function (g, x, y, info) {   // slate roof of the House seen from above (grounds map)
      px(g, x, y, T, T, '#23202a'); for (var i = 0; i < 4; i++) { var o = (i + info.ty) % 2 ? 0 : 4; px(g, x, y + i * 4 + 3, T, 1, '#16141c'); px(g, x + o, y + i * 4, 1, 3, '#16141c'); px(g, x + o + 8, y + i * 4, 1, 3, '#16141c'); }
      if (info.r > 0.85) px(g, x + 5, y + 5, 3, 2, '#2e2a36');
    } },
    // engine furniture re-based onto house parquet (the engine versions sit on its lighter 'floor')
    h_plant: { solid: true, base: 'h_parquet', draw: function (g, x, y, i) { G.registry.tiles.plant.draw(g, x, y, i); } },
    h_lamp: { solid: true, base: 'h_parquet', draw: function (g, x, y, i) { G.registry.tiles.lamp.draw(g, x, y, i); } },
    h_chair: { base: 'h_parquet', draw: function (g, x, y) { px(g, x + 4, y + 2, 8, 3, '#3a1e14'); px(g, x + 4, y + 2, 8, 1, '#c9a24a'); px(g, x + 4, y + 5, 8, 6, '#6a1a2a'); px(g, x + 5, y + 6, 6, 4, '#8a2a3a'); px(g, x + 4, y + 11, 1, 3, '#2a140c'); px(g, x + 11, y + 11, 1, 3, '#2a140c'); } },
    /* ------------------------------------------------------------- floors */
    h_parquet: { draw: function (g, x, y, info) {
      px(g, x, y, T, T, '#3a2618');
      for (var i = 0; i < 4; i++) { var c = (i + info.tx + info.ty) % 2 ? '#43301e' : '#352214'; px(g, x + (i % 2) * 8, y + Math.floor(i / 2) * 8, 8, 8, c); }
      for (var j = 0; j < 4; j++) { if ((info.tx + info.ty + j) % 2) px(g, x + (j % 2) * 8, y + Math.floor(j / 2) * 8 + 3, 8, 1, '#2a1a10'); else px(g, x + (j % 2) * 8 + 3, y + Math.floor(j / 2) * 8, 1, 8, '#2a1a10'); }
    } },
    h_redcarpet: { draw: function (g, x, y, info) {
      px(g, x, y, T, T, '#7a0e18'); speck(g, x, y, '#5a0810', 10, info.tx * 3 + info.ty, 0.7); speck(g, x, y, '#9a1a24', 5, info.tx + info.ty * 9, 0.6);
    } },
    h_marble: { draw: function (g, x, y, info) {
      px(g, x, y, T, T, '#a8a29a'); px(g, x, y + T - 1, T, 1, '#8a847c'); px(g, x + T - 1, y, 1, T, '#8a847c');
      var r = info.r; px(g, x + 2 + Math.floor(r * 6), y + 3, 5, 1, '#948e86'); px(g, x + 6 + Math.floor(r * 4), y + 4, 1, 5, '#9a948c'); px(g, x + 3, y + 10, 4, 1, '#b2aca4');
    } },
    h_kitchen_tile: { color: '#a29e94', color2: '#46444a', pattern: 'checker' },
    h_bluetile: { draw: function (g, x, y, info) { px(g, x, y, T, T, '#3a6a9a'); px(g, x, y + T - 1, T, 1, '#2a4a6a'); px(g, x + T - 1, y, 1, T, '#2a4a6a'); px(g, x + 2, y + 2, 5, 1, 'rgba(255,255,255,0.25)'); void info; } },
    h_rubber: { draw: function (g, x, y, info) { px(g, x, y, T, T, '#25272c'); speck(g, x, y, '#30333a', 12, info.tx * 5 + info.ty, 1); if (info.ty % 6 === 0) px(g, x, y, T, 1, '#e8c15a'); } },
    h_starfloor: { anim: true, draw: function (g, x, y, info) {
      px(g, x, y, T, T, '#120c1c'); px(g, x, y, T, 1, '#1a1228'); px(g, x, y, 1, T, '#1a1228');
      var tw = Math.sin(info.t * 2.5 + info.tx * 1.3 + info.ty * 2.1);
      if (tw > 0.6) px(g, x + ((info.tx * 7) % 13) + 1, y + ((info.ty * 5) % 13) + 1, 1, 1, '#fff6c0');
      if (tw < -0.85) px(g, x + 8, y + 8, 1, 1, '#c9a24a');
    } },
    h_green_floor: { color: '#1f8a3a', color2: '#1a7a32', pattern: 'tiles' },
    h_gold_carpet: { draw: function (g, x, y, info) { px(g, x, y, T, T, '#8a6a1a'); speck(g, x, y, '#a8842a', 8, info.tx * 3 + info.ty, 0.8); px(g, x + 7, y + 7, 2, 2, '#c9a24a'); } },
    h_concrete_wet: { draw: function (g, x, y, info) { px(g, x, y, T, T, '#3a3a40'); speck(g, x, y, '#2a2a30', 12, info.tx + info.ty * 3, 0.8); if (info.r > 0.7) px(g, x + 3, y + 9, 7, 2, '#4a1418'); } },
    h_gravel: { draw: function (g, x, y, info) { px(g, x, y, T, T, '#8a8478'); speck(g, x, y, '#6a645a', 20, info.tx * 11 + info.ty, 1); speck(g, x, y, '#a8a296', 10, info.tx + info.ty * 13, 1); } },
    h_lawn: { draw: function (g, x, y, info) { px(g, x, y, T, T, '#2e5a2a'); px(g, x, y + (info.tx % 2) * 8, T, 1, '#346430'); speck(g, x, y, '#244a22', 10, info.tx * 3 + info.ty, 1); } },
    h_path: { draw: function (g, x, y, info) { px(g, x, y, T, T, '#6a5a48'); speck(g, x, y, '#5a4a3a', 12, info.tx * 3 + info.ty * 5, 1); } },
    h_stage_boards: { draw: function (g, x, y, info) { px(g, x, y, T, T, '#1d1726'); for (var i = 0; i < 4; i++) px(g, x, y + i * 4 + 3, T, 1, '#140f1c'); px(g, x + (info.tx * 5) % 16, y + 5, 3, 1, 'rgba(255,255,255,0.07)'); } },
    h_stairs: { draw: function (g, x, y) { px(g, x, y, T, T, '#2a1a14'); for (var i = 0; i < 4; i++) { px(g, x, y + i * 4, T, 3, '#5a3a24'); px(g, x, y + i * 4, T, 1, '#7a5034'); } px(g, x + 6, y, 4, T, 'rgba(122,14,24,0.85)'); } },
    h_spot: { draw: function (g, x, y) { px(g, x, y, T, T, '#3a3046'); px(g, x + 1, y + 1, 14, 14, '#5a4c6a'); px(g, x + 4, y + 4, 8, 8, '#7a6a8a'); } },
    h_drain: { draw: function (g, x, y) { px(g, x, y, T, T, '#3a3a40'); px(g, x + 4, y + 4, 8, 8, '#1a1a1e'); for (var i = 5; i < 12; i += 2) px(g, x + i, y + 5, 1, 6, '#4a4a52'); px(g, x + 5, y + 10, 6, 2, '#4a0a10'); } },
    h_mat: { draw: function (g, x, y) { px(g, x, y, T, T, '#25272c'); px(g, x + 1, y + 1, 14, 14, '#0e0e12'); px(g, x + 1, y + 1, 14, 1, '#2a2a30'); } },
    h_soakmat: { draw: function (g, x, y) { px(g, x, y, T, T, '#8a1a24'); px(g, x + 1, y + 1, 14, 14, '#a8202c'); px(g, x + 3, y + 6, 10, 1, '#f0d0d0'); px(g, x + 4, y + 8, 8, 1, '#f0d0d0'); } },

    /* -------------------------------------------------------------- doors */
    h_door: { door: true, draw: doorDraw('#5a3a24', '#7a5034', '#d8b860') },
    h_door_num: { door: true, draw: doorDraw('#e8e2d4', '#f8f4ea', '#c9a24a', true) },
    h_door_blue: { door: true, draw: doorDraw('#1a4aa8', '#3a6ad8', '#e8e8e8') },
    h_door_gold: { door: true, draw: doorDraw('#a8842a', '#e8c15a', '#fff6c0') },
    h_door_steel: { door: true, draw: doorDraw('#4a4e58', '#6a707a', '#e8323c') },
    h_door_slat: { door: true, draw: function (g, x, y) { px(g, x, y, T, T, '#1a1220'); px(g, x + 2, y + 1, 12, 15, '#5a4030'); for (var i = 3; i < 15; i += 2) px(g, x + 3, y + i, 10, 1, '#2a1a10'); } },
    h_door_double: { door: true, draw: function (g, x, y, info) { px(g, x, y, T, T, '#1a1c22'); px(g, x + 1, y + 1, 14, 15, '#3a2a1a'); px(g, x + 2, y + 2, 12, 14, '#6a4a2a'); px(g, x + (info.tx % 2 ? 1 : 14), y + 2, 1, 14, '#2a1a10'); px(g, x + 4, y + 4, 8, 4, '#4a3018'); px(g, x + 4, y + 9, 1, 3, '#c9a24a'); } },
    h_door_jewel: { door: true, draw: function (g, x, y) {
      px(g, x, y, T, T, '#1a1220'); px(g, x + 1, y, 14, 16, '#0a0408');   // a gaping maw
      px(g, x + 2, y + 1, 12, 15, '#4a1a2a'); px(g, x + 3, y + 2, 10, 14, '#6a2238');
      [[4, 9, '#e8323c'], [6, 11, '#3ac8e8'], [9, 11, '#e8c15a'], [11, 9, '#7ae83a'], [5, 7, '#c83ae8'], [10, 7, '#3a7ae8']].forEach(function (j) { px(g, x + j[0], y + j[1], 1, 2, j[2]); }); // crooked-teeth jewels round the knob
      px(g, x + 7, y + 9, 2, 2, '#f0d070');
    } },
    h_gate: { door: true, draw: function (g, x, y) {
      px(g, x, y, T, T, '#7a7468'); for (var i = 1; i < T; i += 3) px(g, x + i, y, 1, T, '#1a1a1e'); px(g, x, y + 2, T, 1, '#1a1a1e'); px(g, x, y + 13, T, 1, '#1a1a1e');
      px(g, x + 5, y + 5, 6, 6, '#c9a24a'); px(g, x + 6, y + 6, 4, 4, '#111'); px(g, x + 7, y + 8, 2, 2, '#eee'); // DPE penguin crest
    } },

    /* ------------------------------------------------------ outdoors */
    h_hedge: { solid: true, draw: function (g, x, y, info) { px(g, x, y, T, T, '#1e3a1c'); px(g, x, y, T, 4, '#2e5a2a'); speck(g, x, y, '#3a6a32', 14, info.tx * 3 + info.ty, 1); px(g, x, y + T - 2, T, 2, '#122410'); } },
    h_bush: { solid: true, base: 'h_lawn', draw: function (g, x, y) { px(g, x + 2, y + 4, 12, 10, '#2a4a24'); px(g, x + 4, y + 2, 8, 4, '#3a6a32'); px(g, x + 3, y + 13, 10, 2, 'rgba(0,0,0,0.3)'); } },
    h_almond: { solid: true, base: 'h_lawn', draw: function (g, x, y, info) {
      px(g, x + 3, y + 13, 10, 3, 'rgba(0,0,0,0.3)'); px(g, x + 7, y + 8, 2, 7, '#4a3020');
      px(g, x + 1, y + 1, 14, 9, '#d888a8'); px(g, x + 3, y, 10, 2, '#e8a0bc'); speck(g, x, y - 6, '#f8d0e0', 10, info.tx + info.ty * 7, 1);
      px(g, x + 2, y + 8, 4, 2, '#b86888');
    } },
    h_fence: { solid: true, draw: function (g, x, y, info) {
      px(g, x, y, T, T, info.ty > 3 ? '#2e5a2a' : '#3a3a40');
      for (var i = 1; i < T; i += 4) { px(g, x + i, y, 2, T - 2, '#141418'); px(g, x + i, y, 2, 1, '#6a6a72'); }
      px(g, x, y + 4, T, 2, '#141418'); px(g, x, y + 11, T, 2, '#141418');
    } },

    /* ------------------------------------------------------- furniture */
    h_bed_queen: { solid: true, base: 'h_parquet', draw: function (g, x, y, info) {
      px(g, x, y + 1, T, 15, '#e8a8c8'); px(g, x, y + 1, T, 1, '#f8c8e0');
      if (info.ty % 2 === 0) { px(g, x + 1, y + 2, 6, 4, '#f8f0f4'); px(g, x + 9, y + 2, 6, 4, '#f8f0f4'); px(g, x, y, T, 2, '#c9a24a'); }
      else { px(g, x, y + 4, T, 1, '#d898b8'); px(g, x, y + 10, T, 1, '#d898b8'); px(g, x, y + 14, T, 2, '#8a5a6a'); }
      speck(g, x, y, '#f0c0d8', 6, info.tx, 1);
    } },
    h_bed_plain: { solid: true, base: 'h_parquet', draw: function (g, x, y) { px(g, x + 1, y + 1, 14, 14, '#2a2a30'); px(g, x + 2, y + 2, 12, 4, '#e8e4dc'); px(g, x + 2, y + 6, 12, 8, '#4a5a7a'); px(g, x + 2, y + 6, 12, 1, '#6a7a9a'); } },
    h_cot: { solid: true, base: 'h_bluetile', draw: function (g, x, y) { px(g, x + 1, y + 1, 14, 14, '#5a5e66'); px(g, x + 2, y + 2, 12, 12, '#c8ccd0'); px(g, x + 2, y + 2, 12, 3, '#e8ecee'); px(g, x + 1, y + 15, 2, 1, '#2a2a2a'); px(g, x + 13, y + 15, 2, 1, '#2a2a2a'); } },
    h_bunk: { solid: true, base: 'floor', draw: function (g, x, y) { px(g, x + 1, y, 14, 16, '#5a4a3a'); px(g, x + 2, y + 1, 12, 6, '#8a8a90'); px(g, x + 2, y + 9, 12, 6, '#8a8a90'); px(g, x + 2, y + 1, 4, 2, '#d8d4cc'); px(g, x + 2, y + 9, 4, 2, '#d8d4cc'); } },
    h_armchair: { solid: true, base: 'h_parquet', draw: function (g, x, y) { px(g, x + 2, y + 2, 12, 12, '#5a2a3a'); px(g, x + 2, y + 2, 12, 4, '#4a1e2c'); px(g, x + 2, y + 6, 2, 8, '#4a1e2c'); px(g, x + 12, y + 6, 2, 8, '#4a1e2c'); px(g, x + 4, y + 7, 8, 6, '#7a3a4e'); px(g, x + 3, y + 14, 10, 1, '#1a0e12'); } },
    h_couch_leather: { solid: true, base: 'h_marble', draw: function (g, x, y) { px(g, x, y + 3, T, 11, '#3a1e14'); px(g, x, y + 3, T, 5, '#2a140c'); px(g, x + 1, y + 2, 1, 6, '#2a140c'); px(g, x + 1, y + 8, 14, 5, '#5a2e1e'); px(g, x + 3, y + 9, 2, 1, '#7a4a2e'); px(g, x, y + 14, T, 1, '#120804'); } },
    h_couch_velvet: { solid: true, base: 'h_parquet', draw: function (g, x, y, info) { px(g, x, y + 2, T, 12, '#4a1a5a'); px(g, x, y + 2, T, 4, '#3a1048'); px(g, x + 1, y + 7, 14, 6, '#6a2a7a'); if (info.r > 0.4) { px(g, x + 4, y + 5, 6, 4, '#e8c15a'); px(g, x + 5, y + 6, 4, 1, '#a8202c'); } px(g, x, y + 14, T, 1, '#1a0820'); } },
    h_island: { solid: true, base: 'h_kitchen_tile', draw: function (g, x, y, info) { px(g, x, y + 1, T, 12, '#e8e4dc'); px(g, x, y + 1, T, 1, '#ffffff'); px(g, x + 2 + Math.floor(info.r * 8), y + 4, 5, 1, '#c8c4bc'); px(g, x + 9, y + 8, 1, 3, '#cfcac0'); px(g, x, y + 13, T, 3, '#5a5048'); } },
    h_bench_bolted: { solid: true, base: 'h_kitchen_tile', draw: function (g, x, y) { px(g, x, y + 5, T, 5, '#7a7e86'); px(g, x, y + 5, T, 1, '#9aa0aa'); px(g, x + 3, y + 10, 2, 5, '#3a3c42'); px(g, x + 11, y + 10, 2, 5, '#3a3c42'); px(g, x + 3, y + 14, 2, 1, '#c8c8c8'); px(g, x + 11, y + 14, 2, 1, '#c8c8c8'); } },
    h_banquet: { solid: true, base: 'h_parquet', draw: function (g, x, y, info) { px(g, x, y + 2, T, 11, '#5a3a22'); px(g, x, y + 2, T, 1, '#7a5432'); px(g, x, y + 13, T, 2, '#2a1a10'); px(g, x, y + 5, T, 4, '#e8e0d0'); if (info.tx % 2) { px(g, x + 6, y + 3, 4, 3, '#e8e4dc'); } } },
    h_shelf_tall: { solid: true, base: 'h_parquet', draw: function (g, x, y, info) {
      px(g, x, y, T, T, '#2a1a10'); px(g, x, y, T, 1, '#5a3a20'); var cols = ['#7a2a2a', '#2a4a7a', '#4a6a2a', '#8a7a4a', '#4a2a5a', '#2a5a5a'];
      for (var s = 0; s < 3; s++) { px(g, x, y + 5 + s * 5, T, 1, '#4a2e18'); for (var b = 0; b < 7; b++) px(g, x + 1 + b * 2, y + 1 + s * 5 + (b % 3 === 0 ? 1 : 0), 2, 4 - (b % 3 === 0 ? 1 : 0), cols[(b + s * 2 + info.tx * 3) % 6]); }
    } },
    h_desk_gold: { solid: true, base: 'h_gold_carpet', draw: function (g, x, y) { px(g, x, y + 2, T, 11, '#c9a24a'); px(g, x, y + 2, T, 1, '#f0d070'); px(g, x, y + 13, T, 2, '#6a4a10'); px(g, x + 3, y + 4, 4, 3, '#f8f0d0'); px(g, x + 10, y + 4, 3, 3, '#1a1a1a'); } },
    h_desk: { solid: true, base: 'h_parquet', draw: function (g, x, y) { px(g, x + 1, y + 3, 14, 9, '#5a3a24'); px(g, x + 1, y + 3, 14, 1, '#7a5034'); px(g, x + 1, y + 12, 14, 3, '#2a1a10'); px(g, x + 4, y + 5, 5, 4, '#e8e0d0'); px(g, x + 10, y + 5, 1, 4, '#1a1a1a'); } },
    h_vanity: { solid: true, base: 'h_marble', draw: function (g, x, y) { px(g, x, y + 2, T, 10, '#e8e4dc'); px(g, x, y + 2, T, 1, '#fff'); px(g, x + 3, y + 4, 10, 6, '#9aa8b0'); px(g, x + 7, y + 2, 2, 3, '#c9a24a'); px(g, x, y + 12, T, 3, '#8a8478'); } },
    h_toilet_auto: { solid: true, base: 'h_marble', draw: function (g, x, y) { px(g, x + 4, y + 1, 8, 4, '#f0f0f0'); px(g, x + 3, y + 5, 10, 9, '#fafafa'); px(g, x + 5, y + 7, 6, 5, '#9ab8c8'); px(g, x + 7, y + 2, 2, 1, '#3fc1c9'); } },
    h_bidet: { solid: true, base: 'h_marble', draw: function (g, x, y) { px(g, x + 4, y + 4, 8, 10, '#fafafa'); px(g, x + 5, y + 6, 6, 6, '#9ab8c8'); px(g, x + 7, y + 4, 2, 2, '#c9a24a'); } },
    h_fridge_big: { solid: true, base: 'h_kitchen_tile', draw: function (g, x, y, info) { px(g, x, y, T, T, '#b8bcc4'); px(g, x, y, T, 1, '#e0e4ea'); px(g, x + (info.tx % 2 ? 0 : 15), y, 1, T, '#7a7e86'); px(g, x + (info.tx % 2 ? 2 : 13), y + 4, 1, 8, '#5a5e66'); } },
    h_bleachers: { solid: true, draw: function (g, x, y, info) { px(g, x, y, T, T, '#1a1c22'); for (var i = 0; i < 3; i++) { px(g, x, y + 1 + i * 5, T, 3, '#4a505a'); px(g, x, y + 1 + i * 5, T, 1, '#6a707a'); } if (info.r > 0.55) { px(g, x + 3, y + 3, 3, 3, '#7a5a4a'); px(g, x + 3, y + 6, 3, 2, '#3a3a4a'); } } },
    h_jury_box: { solid: true, base: 'h_rubber', draw: function (g, x, y) { px(g, x, y + 8, T, 8, '#5a1a1a'); px(g, x, y + 8, T, 1, '#c9a24a'); px(g, x + 4, y + 1, 8, 8, '#e8e0d8'); px(g, x + 5, y + 3, 1, 1, '#000'); px(g, x + 9, y + 3, 1, 1, '#000'); px(g, x + 5, y + 4, 1, 3, '#3a7ae8'); px(g, x + 6, y + 6, 4, 1, '#e8323c'); px(g, x + 4, y + 1, 8, 1, '#e8323c'); } },
    h_judge_bench: { solid: true, wall: true, draw: function (g, x, y, info) { px(g, x, y, T, T, '#2a1210'); px(g, x, y, T, 3, '#c9a24a'); if (info.face) { px(g, x, y + 3, T, 13, '#4a1a14'); px(g, x + 2, y + 5, 12, 8, '#3a120e'); px(g, x + 6, y + 6, 4, 5, '#c9a24a'); px(g, x, y + T - 1, T, 1, '#000'); } } },
    h_bandstage: { solid: true, draw: function (g, x, y, info) { px(g, x, y, T, T, '#2a1a3a'); px(g, x, y, T, 1, '#c9a24a'); px(g, x, y + T - 3, T, 3, '#1a0e24'); if (info.r > 0.6) px(g, x + 5, y + 4, 6, 5, '#e8c15a'); } },
    h_beam: { solid: false, base: 'h_rubber', draw: function (g, x, y) { px(g, x, y + 7, T, 3, '#c8a878'); px(g, x, y + 7, T, 1, '#e8c898'); px(g, x, y + 10, T, 1, '#1a1a1a'); } },
    h_weights: { solid: true, base: 'h_rubber', draw: function (g, x, y) { px(g, x + 1, y + 7, 14, 2, '#8a8a92'); px(g, x + 1, y + 4, 3, 8, '#1a1a1e'); px(g, x + 12, y + 4, 3, 8, '#1a1a1e'); px(g, x + 1, y + 13, 14, 2, '#3a3a40'); } },
    h_punchbag: { solid: true, base: 'h_rubber', draw: function (g, x, y) { px(g, x + 7, y, 2, 3, '#555'); px(g, x + 4, y + 3, 8, 11, '#8a1a1a'); px(g, x + 4, y + 3, 8, 1, '#aa2a2a'); px(g, x + 5, y + 14, 6, 1, 'rgba(0,0,0,0.4)'); } },
    h_folding_chair: { base: 'h_parquet', draw: function (g, x, y) { px(g, x + 4, y + 2, 8, 3, '#7a7e86'); px(g, x + 4, y + 6, 8, 5, '#9aa0aa'); px(g, x + 4, y + 11, 1, 4, '#4a4e56'); px(g, x + 11, y + 11, 1, 4, '#4a4e56'); } },
    h_chair_row: { base: 'h_gold_carpet', draw: function (g, x, y) { px(g, x + 1, y + 3, 14, 4, '#5a1a2a'); px(g, x + 1, y + 7, 14, 5, '#7a2a3a'); px(g, x + 7, y + 3, 2, 9, '#3a0e18'); } },
    h_throne: { solid: true, base: 'h_parquet', draw: function (g, x, y) { px(g, x + 2, y, 12, 15, '#c9a24a'); px(g, x + 4, y + 2, 8, 8, '#8a1a2a'); px(g, x + 3, y + 10, 10, 4, '#a8202c'); [[4, 1, '#3ac8e8'], [11, 1, '#e8323c'], [7, 0, '#7ae83a']].forEach(function (j) { px(g, x + j[0], y + j[1], 2, 2, j[2]); }); } },
    h_shelf_supply: { solid: true, base: 'concrete', draw: function (g, x, y) { px(g, x, y, T, T, '#3a3a40'); px(g, x, y + 7, T, 1, '#5a5a62'); px(g, x, y + 15, T, 1, '#5a5a62'); px(g, x + 2, y + 2, 3, 5, '#e8e8e0'); px(g, x + 2, y + 2, 3, 1, '#3a7ae8'); px(g, x + 7, y + 3, 3, 4, '#e8e8e0'); px(g, x + 11, y + 10, 4, 5, '#c8c020'); px(g, x + 3, y + 10, 5, 5, '#7a8a9a'); } },
    h_counter_lobby: { solid: true, base: 'h_bluetile', draw: function (g, x, y) { px(g, x, y + 3, T, 10, '#1a2a4a'); px(g, x, y + 3, T, 2, '#e8e8f0'); px(g, x, y + 13, T, 2, '#0a1428'); } },
    h_tablet_wall: { solid: true, wall: true, anim: true, draw: function (g, x, y, info) {
      wall('#241c22', '#b8a888', wainscot)(g, x, y, info); if (!info.face) return;
      px(g, x + 1, y + 3, 14, 9, '#0a0a10'); var f = Math.floor(info.t / 4) % 3;
      px(g, x + 2, y + 4, 12, 7, ['#3a2a1a', '#2a3a4a', '#4a3a1a'][f]); px(g, x + 6, y + 5, 4, 4, '#b98a62'); px(g, x + 5, y + 4, 6, 2, '#4a2c1a'); // "curated memories" of Waverly
      px(g, x + 2, y + 10, 12, 1, 'rgba(63,193,201,0.5)');
    } }
  };
  function doorDraw(c, cl, knob, plate) {
    return function (g, x, y) {
      px(g, x, y, T, T, '#1a1220'); px(g, x + 2, y + 1, 12, 15, U.shade(c, -0.45));
      px(g, x + 3, y + 2, 10, 14, c); px(g, x + 3, y + 2, 10, 1, cl);
      px(g, x + 4, y + 4, 8, 4, U.shade(c, -0.15)); px(g, x + 4, y + 10, 8, 4, U.shade(c, -0.15));
      px(g, x + 11, y + 9, 1, 1, knob);
      if (plate) px(g, x + 6, y + 3, 4, 2, '#c9a24a');
    };
  }
  G.shared.registerTiles(TILES);

  /* ================================================================ PROPS
   * fn(g, x, y, t, obj): x,y = tile top-left (low-res px). obj.def carries the object's fields,
   * so a few props read options: numberplate {n:3}, cam_* {facing:'down'|'left'|'right'}, poster_* {text}.
   */
  function blink(t, hz) { return Math.floor(t * (hz || 2)) % 2 === 0; }
  var PROPS = {
    // --- surveillance (CHAPTERS §3 camera contract: SOLID red = recording, FLASHING red = watched live)
    cam_rec: function (g, x, y, t, o) { camBody(g, x, y, o); px(g, x + 4, y + 3, 2, 2, '#ff2030'); g.globalAlpha = 0.25; px(g, x + 3, y + 2, 4, 4, '#ff2030'); g.globalAlpha = 1; },
    cam_live: function (g, x, y, t, o) { camBody(g, x, y, o); if (blink(t, 3)) { px(g, x + 4, y + 3, 2, 2, '#ff4050'); g.globalAlpha = 0.35; px(g, x + 2, y + 1, 6, 6, '#ff2030'); g.globalAlpha = 1; } else px(g, x + 4, y + 3, 2, 2, '#4a0a10'); },
    cam_eye: function (g, x, y, t) { px(g, x + 5, y + 2, 6, 3, '#e8e4dc'); px(g, x + 7, y + 3, 2, 1, '#222'); if (blink(t, 0.5)) px(g, x + 7, y + 3, 1, 1, '#ff2030'); }, // hidden "Eye" (smoke detector / book spine)
    stagecam: function (g, x, y, t) { // tall-necked wheeled camera
      px(g, x + 3, y + 14, 10, 2, 'rgba(0,0,0,0.4)'); px(g, x + 4, y + 12, 8, 2, '#2a2a30'); px(g, x + 4, y + 14, 2, 2, '#111'); px(g, x + 10, y + 14, 2, 2, '#111');
      px(g, x + 7, y - 4, 2, 16, '#3a3a42'); px(g, x + 3, y - 9, 10, 6, '#1a1a20'); px(g, x + 12, y - 8, 3, 4, '#0a0a0e'); px(g, x + 13, y - 7, 1, 2, '#3fc1c9');
      px(g, x + 4, y - 8, 2, 1, blink(t, 2) ? '#ff2030' : '#4a0a10');
    },
    drone: function (g, x, y, t) { var b = Math.round(Math.sin(t * 9) * 1); px(g, x + 5, y + 4 + b, 6, 3, '#2a2a30'); px(g, x + 2, y + 3 + b, 4, 1, '#888'); px(g, x + 10, y + 3 + b, 4, 1, '#888'); px(g, x + 7, y + 5 + b, 2, 1, blink(t, 4) ? '#ff2030' : '#300'); },
    speaker: function (g, x, y) { px(g, x + 4, y + 2, 8, 6, '#1a1a20'); for (var i = 3; i < 7; i++) px(g, x + 5, y + i, 6, 1, i % 2 ? '#3a3a42' : '#1a1a20'); },
    // --- propaganda
    poster_obey: function (g, x, y) { posterBase(g, x, y, '#a8202c'); px(g, x + 6, y + 3, 4, 4, '#e8c15a'); px(g, x + 5, y + 7, 6, 3, '#1a1a1a'); px(g, x + 4, y + 11, 8, 1, '#f2efe8'); },  // "Obedience Is Beauty"
    poster_private: function (g, x, y) { posterBase(g, x, y, '#1a2a5a'); px(g, x + 5, y + 4, 6, 3, '#f2efe8'); px(g, x + 7, y + 5, 2, 1, '#1a1a1a'); px(g, x + 4, y + 9, 8, 1, '#e8c15a'); px(g, x + 4, y + 11, 6, 1, '#e8c15a'); }, // "Nothing You Feel Is Private"
    portrait_leader: function (g, x, y) { px(g, x + 1, y + 1, 14, 12, '#c9a24a'); px(g, x + 2, y + 2, 12, 10, '#2a2a3a'); px(g, x + 6, y + 3, 4, 4, '#d8a888'); px(g, x + 6, y + 3, 4, 1, '#3a2a1a'); px(g, x + 5, y + 7, 6, 4, '#1a2a5a'); px(g, x + 3, y + 8, 2, 3, '#e8c890'); px(g, x + 11, y + 8, 2, 3, '#a87050'); px(g, x + 9, y + 8, 2, 2, '#f2efe8'); },
    penguin_logo: function (g, x, y) { px(g, x + 4, y + 2, 8, 11, '#111'); px(g, x + 6, y + 5, 4, 7, '#f2efe8'); px(g, x + 6, y + 3, 1, 1, '#fff'); px(g, x + 9, y + 3, 1, 1, '#fff'); px(g, x + 7, y + 4, 2, 1, '#e8a020'); px(g, x + 5, y + 13, 2, 1, '#e8a020'); px(g, x + 9, y + 13, 2, 1, '#e8a020'); },
    sign_library: function (g, x, y, t) { var a = 0.75 + 0.25 * Math.sin(t * 9) * (Math.sin(t * 0.7) > 0.9 ? 1 : 0); g.globalAlpha = a; px(g, x + 1, y + 4, 14, 6, '#0a2a4a'); px(g, x + 2, y + 5, 12, 1, '#3ac8ff'); px(g, x + 2, y + 7, 9, 1, '#3ac8ff'); g.globalAlpha = 1; },
    // --- ballroom
    chandelier: function (g, x, y, t) { px(g, x + 7, y - 6, 2, 6, '#8a6a20'); px(g, x + 2, y, 12, 2, '#c9a24a'); px(g, x + 4, y + 2, 8, 2, '#c9a24a'); for (var i = 0; i < 5; i++) { px(g, x + 2 + i * 3, y - 1, 1, 1, '#fff6c0'); px(g, x + 3 + i * 2, y + 4, 1, 2, '#e8f0ff'); } g.globalAlpha = 0.15 + 0.05 * Math.sin(t * 2); px(g, x - 4, y - 4, 24, 14, '#ffe9a0'); g.globalAlpha = 1; },
    star_hang: function (g, x, y, t, o) { var s = (o && o.tx) || 0; var sw = Math.round(Math.sin(t * 1.2 + s) * 1); px(g, x + 7 + sw, y - 8, 1, 6, 'rgba(220,220,220,0.4)'); var c = '#f0d070'; px(g, x + 7 + sw, y - 3, 1, 5, c); px(g, x + 5 + sw, y - 1, 5, 1, c); px(g, x + 6 + sw, y - 2, 3, 3, c); if (Math.sin(t * 3 + s) > 0.7) px(g, x + 7 + sw, y - 1, 1, 1, '#fff'); },
    stars_drift: function (g, x, y, t, o) { var s = (o && o.tx) || 0; for (var i = 0; i < 4; i++) { var sx = x + ((i * 37 + s * 13) % 48) - 16, sy = y - 10 + Math.round(Math.sin(t + i + s) * 2) + (i * 7) % 12; px(g, sx + 1, sy, 1, 3, '#f0d070'); px(g, sx, sy + 1, 3, 1, '#f0d070'); } },
    noose_fountain: function (g, x, y, t) { // chocolate fountain shaped like a noose
      px(g, x + 2, y + 12, 12, 3, '#c9a24a'); px(g, x + 3, y + 10, 10, 2, '#e8c15a'); px(g, x + 7, y - 6, 2, 16, '#c9a24a');
      px(g, x + 4, y - 12, 8, 7, '#5a2a12'); px(g, x + 6, y - 10, 4, 3, '#120604'); // the loop
      var d = Math.floor(t * 8) % 6; px(g, x + 5, y - 5 + d, 1, 2, '#4a2010'); px(g, x + 10, y - 4 + ((d + 3) % 6), 1, 2, '#4a2010');
      px(g, x + 4, y + 10, 8, 1, '#4a2010'); px(g, x + 7, y - 5, 2, 15, '#5a2a12');
    },
    photo_wall: function (g, x, y) { px(g, x, y + 1, 16, 13, '#1a1220'); for (var i = 0; i < 3; i++) { px(g, x + 1 + i * 5, y + 2, 4, 5, '#c9a24a'); px(g, x + 2 + i * 5, y + 3, 2, 3, '#d8a888'); px(g, x + 1 + i * 5, y + 8, 4, 5, '#c9a24a'); px(g, x + 2 + i * 5, y + 9, 2, 2, '#2a3040'); } },
    mic_stand: function (g, x, y) { px(g, x + 7, y + 2, 2, 12, '#333'); px(g, x + 6, y, 4, 3, '#aaa'); px(g, x + 4, y + 14, 8, 1, '#222'); },
    drum_kit: function (g, x, y) { px(g, x + 3, y + 6, 10, 7, '#a8202c'); px(g, x + 4, y + 7, 8, 5, '#e8e0d0'); px(g, x, y + 3, 4, 2, '#e8c15a'); px(g, x + 12, y + 3, 4, 2, '#e8c15a'); },
    candelabra: function (g, x, y, t) { px(g, x + 7, y + 6, 2, 8, '#c9a24a'); px(g, x + 3, y + 6, 10, 1, '#c9a24a'); [3, 7, 12].forEach(function (cx) { px(g, cx + x, y + 3, 1, 3, '#f0ead8'); px(g, cx + x, y + 1 + (Math.sin(t * 9 + cx) > 0 ? 0 : 1), 1, 2, '#ffb030'); }); },
    candle: function (g, x, y, t) { px(g, x + 7, y + 8, 2, 6, '#f0ead8'); px(g, x + 7, y + 6 + (Math.sin(t * 11) > 0 ? 0 : 1), 2, 2, '#ffb030'); },
    vigil_candles: function (g, x, y, t) { for (var i = 0; i < 5; i++) { px(g, x + 1 + i * 3, y + 9, 2, 5, '#e8e0d0'); if (Math.sin(t * 7 + i * 2) > -0.6) px(g, x + 1 + i * 3, y + 7, 2, 2, '#ffb030'); } },
    plate_dinner: function (g, x, y) { px(g, x + 4, y + 5, 8, 6, '#f2efe8'); px(g, x + 6, y + 7, 4, 2, '#8a3a1a'); },
    // --- courtroom / votes
    mannequin: function (g, x, y) { mannequin(g, x, y, true); },
    mannequin_headless: function (g, x, y) { mannequin(g, x, y, false); px(g, x + 3, y + 13, 4, 2, '#e8e0d8'); },
    cage: function (g, x, y) { // Saint-Bernard-size cage on wheels, chains at each corner
      px(g, x, y + 2, 16, 12, 'rgba(0,0,0,0.25)'); for (var i = 0; i < 16; i += 3) px(g, x + i, y + 1, 1, 13, '#8a8e96');
      px(g, x, y + 1, 16, 1, '#aab0ba'); px(g, x, y + 13, 16, 1, '#6a6e76'); px(g, x + 1, y + 14, 2, 2, '#111'); px(g, x + 13, y + 14, 2, 2, '#111');
      px(g, x - 1, y, 1, 2, '#c8c8c8'); px(g, x + 16, y, 1, 2, '#c8c8c8');
    },
    holo_counter: function (g, x, y, t, o) { px(g, x + 1, y + 2, 14, 10, '#0a1a2a'); px(g, x + 2, y + 3, 12, 2, '#3fc1c9'); var n = Math.floor(t * 7 + ((o && o.tx) || 0) * 3) % 10; for (var i = 0; i < 3; i++) px(g, x + 3 + i * 4, y + 7, 3, 3, (n + i) % 3 ? '#e8e8e8' : '#3fc1c9'); },
    ballot_toaster: function (g, x, y) { px(g, x + 2, y + 6, 12, 8, '#c8ccd2'); px(g, x + 2, y + 6, 12, 1, '#eef0f4'); px(g, x + 4, y + 5, 3, 2, '#1a1a1a'); px(g, x + 9, y + 5, 3, 2, '#1a1a1a'); px(g, x + 14, y + 9, 1, 3, '#1a1a1a'); px(g, x + 5, y + 4, 1, 2, '#f2efe8'); },
    gavel_block: function (g, x, y) { px(g, x + 3, y + 6, 6, 3, '#6a3a1a'); px(g, x + 8, y + 7, 6, 1, '#8a5a2a'); px(g, x + 4, y + 11, 8, 2, '#4a2a10'); },
    // --- doll room
    samantha: function (g, x, y, t) { // giant doll: blood-red palm-leaf hair, icy blue eyes, puffy purple lips, beach-ball face, gavel. She is the camera.
      px(g, x - 4, y - 14, 24, 8, '#a8101c'); for (var i = 0; i < 6; i++) px(g, x - 6 + i * 5, y - 16 + (i % 2) * 2, 3, 6, '#c8182a');
      px(g, x - 2, y - 10, 20, 18, '#f4dcd0'); px(g, x - 3, y - 6, 22, 10, '#f4dcd0');
      px(g, x + 1, y - 4, 4, 3, '#f2f8ff'); px(g, x + 11, y - 4, 4, 3, '#f2f8ff'); px(g, x + 2, y - 4, 2, 3, '#3ab8f0'); px(g, x + 12, y - 4, 2, 3, '#3ab8f0');
      px(g, x + 2, y - 3, 1, 1, blink(t, 1.5) ? '#ff2030' : '#000'); // the camera lives in her eye
      px(g, x + 5, y + 3, 6, 3, '#7a2aa8'); px(g, x + 6, y + 4, 4, 1, '#4a0a6a'); px(g, x - 1, y, 3, 2, '#f0a8b0'); px(g, x + 14, y, 3, 2, '#f0a8b0');
      px(g, x - 2, y + 8, 20, 6, '#e8e0f0'); px(g, x + 16, y + 4, 2, 8, '#6a3a1a'); px(g, x + 14, y + 2, 6, 3, '#8a5a2a');
    },
    doll: function (g, x, y, t, o) { var k = ((o && o.tx) || 0) % 3; px(g, x + 5, y + 4, 6, 5, '#f2d8c8'); px(g, x + 5, y + 3, 6, 2, ['#e8c040', '#5a2a1a', '#c84020'][k]); px(g, x + 6, y + 6, 1, 1, '#000'); px(g, x + 9, y + 6, 1, 1, '#000'); px(g, x + 6, y + 7, 1, 2, '#a01020'); px(g, x + 7, y + 8, 2, 1, '#a01020'); px(g, x + 4, y + 9, 8, 6, ['#d86a9a', '#7a9ae8', '#e8e0d0'][k]); },
    doll_kneel: function (g, x, y) { px(g, x + 4, y + 2, 8, 6, '#141218'); px(g, x + 5, y + 3, 6, 4, '#d4a83a'); px(g, x + 6, y + 4, 1, 1, '#000'); px(g, x + 9, y + 4, 1, 1, '#000'); px(g, x + 3, y + 8, 10, 7, '#141218'); },
    checkers: function (g, x, y) { px(g, x + 1, y + 2, 14, 12, '#2a1a10'); for (var i = 0; i < 6; i++) for (var j = 0; j < 5; j++) if ((i + j) % 2) px(g, x + 2 + i * 2, y + 3 + j * 2, 2, 2, '#e8e0d0'); px(g, x + 4, y + 5, 2, 2, '#c8202c'); px(g, x + 10, y + 9, 2, 2, '#111'); },
    // --- executions
    gallows: function (g, x, y) { px(g, x + 1, y - 26, 3, 40, '#4a2e18'); px(g, x + 1, y - 26, 16, 3, '#4a2e18'); px(g, x + 12, y - 23, 1, 8, '#c8b088'); px(g, x + 10, y - 15, 5, 5, '#c8b088'); px(g, x + 11, y - 14, 3, 3, 'rgba(0,0,0,0)'); px(g, x - 2, y + 12, 22, 3, '#3a2010'); px(g, x + 8, y + 10, 8, 2, '#1a0e06'); },
    gurney: function (g, x, y) { px(g, x, y + 4, 16, 7, '#e8eef0'); px(g, x, y + 4, 16, 1, '#fff'); px(g, x + 2, y + 6, 12, 1, '#3a3a40'); px(g, x + 2, y + 9, 12, 1, '#3a3a40'); px(g, x + 1, y + 11, 1, 4, '#8a8e96'); px(g, x + 14, y + 11, 1, 4, '#8a8e96'); px(g, x + 15, y - 4, 1, 9, '#8a8e96'); px(g, x + 13, y - 4, 3, 3, '#c8e8f0'); },
    stake: function (g, x, y) { px(g, x + 7, y - 18, 3, 32, '#4a2e18'); px(g, x + 1, y + 9, 14, 6, '#5a3a20'); for (var i = 0; i < 4; i++) px(g, x + 1 + i * 4, y + 8 + (i % 2), 3, 6, '#6a4a28'); px(g, x + 6, y - 6, 5, 2, '#8a8e96'); },
    woodpile: function (g, x, y) { for (var i = 0; i < 3; i++) for (var j = 0; j < 3 - i; j++) { px(g, x + 1 + j * 5 + i * 2, y + 10 - i * 4, 4, 4, '#6a4a28'); px(g, x + 2 + j * 5 + i * 2, y + 11 - i * 4, 2, 2, '#c89a5a'); } },
    gas_can: function (g, x, y) { px(g, x + 4, y + 5, 8, 9, '#c82020'); px(g, x + 4, y + 5, 8, 1, '#e84040'); px(g, x + 10, y + 3, 2, 3, '#1a1a1a'); px(g, x + 5, y + 8, 6, 3, '#e8c15a'); },
    cuffs: function (g, x, y, t, o) { var s = Math.round(Math.sin(t * 0.8 + ((o && o.tx) || 0)) * 1); px(g, x + 7, y - 10, 1, 12, '#6a5a4a'); px(g, x + 5 + s, y + 2, 3, 3, '#7a4a2a'); px(g, x + 8 + s, y + 2, 3, 3, '#7a4a2a'); px(g, x + 6 + s, y + 3, 1, 1, '#1a1a1a'); px(g, x + 9 + s, y + 3, 1, 1, '#1a1a1a'); },
    // --- competitions
    vr_bed: function (g, x, y) { px(g, x + 1, y + 1, 14, 14, '#2a2a34'); px(g, x + 2, y + 2, 12, 12, '#e8eef0'); px(g, x + 3, y + 2, 10, 3, '#fafafa'); px(g, x + 1, y + 6, 1, 2, '#3fc1c9'); px(g, x + 14, y + 6, 1, 2, '#3fc1c9'); px(g, x + 5, y + 1, 6, 1, '#1a1a1a'); },
    iv_stand: function (g, x, y, t) { px(g, x + 7, y - 6, 1, 20, '#8a8e96'); px(g, x + 5, y - 6, 4, 5, 'rgba(200,232,240,0.85)'); px(g, x + 4, y + 13, 7, 1, '#4a4e56'); px(g, x + 10, y + 2, 4, 4, '#1a1a1a'); px(g, x + 11, y + 3, 2, 1, blink(t, 1.2) ? '#4aff8a' : '#1a4a2a'); },
    tool_tray: function (g, x, y) { px(g, x + 1, y + 5, 14, 7, '#f2efe8'); px(g, x + 1, y + 5, 14, 1, '#ffffff'); px(g, x + 3, y + 7, 4, 1, '#c9a24a'); px(g, x + 3, y + 9, 5, 1, '#c8e8f0'); px(g, x + 9, y + 7, 1, 4, '#9aa0aa'); px(g, x + 11, y + 8, 3, 1, '#9aa0aa'); },
    sandbag: function (g, x, y) { px(g, x + 3, y + 5, 10, 9, '#8a7a5a'); px(g, x + 3, y + 5, 10, 2, '#a8946a'); px(g, x + 7, y + 3, 2, 3, '#5a4a32'); },
    metronome: function (g, x, y, t) { px(g, x + 4, y + 2, 8, 13, '#4a2a14'); px(g, x + 5, y + 3, 6, 11, '#2a1408'); var a = Math.sin(t * 3) * 3; px(g, x + 7 + Math.round(a), y + 4, 1, 8, '#c9a24a'); },
    gauze_screen: function (g, x, y, t) { g.globalAlpha = 0.35; px(g, x, y - 10, 16, 22, '#e8e8f0'); g.globalAlpha = 0.25 + 0.15 * Math.sin(t * 2); px(g, x + 3, y - 6, 10, 12, '#3fc1c9'); g.globalAlpha = 1; },
    wheel_fortune: function (g, x, y, t) { px(g, x + 1, y, 14, 14, '#c9a24a'); var a = t * 1.5; for (var i = 0; i < 6; i++) { var cx = x + 8 + Math.round(Math.cos(a + i) * 5), cy = y + 7 + Math.round(Math.sin(a + i) * 5); px(g, cx - 1, cy - 1, 2, 2, ['#e8323c', '#3a7ae8', '#7ae83a'][i % 3]); } px(g, x + 7, y + 6, 2, 2, '#fff'); px(g, x + 7, y + 14, 2, 2, '#4a2a14'); },
    jackpot: function (g, x, y, t) { px(g, x + 2, y, 12, 15, '#8a1a2a'); px(g, x + 3, y + 3, 10, 4, '#111'); for (var i = 0; i < 3; i++) px(g, x + 4 + i * 3, y + 4, 2, 2, ['#e8c15a', '#e8323c', '#3fc1c9'][(i + Math.floor(t * 5)) % 3]); px(g, x + 3, y + 1, 10, 1, blink(t, 4) ? '#ffe070' : '#8a6a20'); },
    pinball: function (g, x, y, t) { px(g, x + 2, y, 12, 15, '#1a2a5a'); px(g, x + 3, y + 1, 10, 10, '#2a4aa8'); px(g, x + 5 + Math.round(Math.sin(t * 4) * 3), y + 3 + Math.round(Math.cos(t * 3) * 3), 2, 2, '#e8e8e8'); px(g, x + 3, y + 12, 10, 2, '#e8c15a'); },
    // --- grounds
    gnome: function (g, x, y) { px(g, x + 6, y + 2, 4, 5, '#c8202c'); px(g, x + 7, y, 2, 2, '#c8202c'); px(g, x + 6, y + 7, 4, 2, '#f0c8a0'); px(g, x + 6, y + 9, 4, 3, '#e8e8e8'); px(g, x + 5, y + 11, 6, 4, '#3a6ab0'); px(g, x + 5, y + 15, 6, 1, 'rgba(0,0,0,0.35)'); },
    keypad: function (g, x, y, t) { px(g, x + 5, y + 4, 6, 8, '#2a2a30'); for (var i = 0; i < 3; i++) for (var j = 0; j < 3; j++) px(g, x + 6 + i * 2, y + 6 + j * 2, 1, 1, '#9aa0aa'); px(g, x + 6, y + 5, 4, 1, blink(t, 0.7) ? '#4aff8a' : '#1a4a2a'); },
    floodlight: function (g, x, y) { px(g, x + 7, y + 4, 2, 11, '#3a3a42'); px(g, x + 4, y, 8, 5, '#2a2a30'); px(g, x + 5, y + 1, 6, 3, '#fff6d0'); },
    // --- house life
    stool: function (g, x, y) { px(g, x + 4, y + 6, 8, 3, '#e8e4dc'); px(g, x + 5, y + 9, 1, 5, '#9aa0aa'); px(g, x + 10, y + 9, 1, 5, '#9aa0aa'); },
    red_button: function (g, x, y, t) { px(g, x + 5, y + 6, 6, 5, '#3a3a42'); px(g, x + 6, y + 6, 4, 3, blink(t, 0.6) ? '#ff3040' : '#c82030'); },
    green_button: function (g, x, y) { px(g, x + 5, y + 5, 6, 6, '#2a2a30'); px(g, x + 6, y + 6, 4, 4, '#3ae860'); px(g, x + 7, y + 7, 1, 1, '#c8ffd0'); },
    nightstand: function (g, x, y) { px(g, x + 2, y + 4, 12, 10, '#e8e0e8'); px(g, x + 2, y + 4, 12, 1, '#fff'); px(g, x + 3, y + 9, 10, 1, '#b8a8b8'); px(g, x + 7, y + 11, 2, 1, '#c9a24a'); },
    booklet: function (g, x, y, t) { var b = Math.sin(t * 3) * 0.5; px(g, x + 3, y + 6 + b, 10, 7, '#1a1a1a'); px(g, x + 4, y + 7 + b, 8, 5, '#f2efe8'); px(g, x + 7, y + 8 + b, 2, 3, '#111'); px(g, x + 7, y + 9 + b, 1, 1, '#e8a020'); },
    dpe_pen: function (g, x, y) { px(g, x + 4, y + 8, 8, 1, '#111'); px(g, x + 11, y + 8, 1, 1, '#c9a24a'); },
    lullaby_speaker: function (g, x, y, t) { px(g, x + 5, y + 3, 6, 5, '#e8e0e8'); px(g, x + 6, y + 4, 4, 3, '#b8a8b8'); if (blink(t, 0.4)) px(g, x + 11, y + 2, 2, 1, '#e8a0c8'); },
    shower_panel: function (g, x, y, t) { px(g, x + 3, y + 2, 10, 8, '#1a1a24'); px(g, x + 4, y + 3, 8, 6, '#3fc1c9'); px(g, x + 5, y + 5, 6, 1, '#f2efe8'); if (blink(t, 1)) px(g, x + 5, y + 7, 3, 1, '#f2efe8'); },
    kettle: function (g, x, y, t) { px(g, x + 4, y + 6, 8, 7, '#c8ccd2'); px(g, x + 6, y + 4, 4, 2, '#1a1a1a'); px(g, x + 12, y + 8, 2, 2, '#c8ccd2'); g.globalAlpha = 0.35; px(g, x + 12 + Math.round(Math.sin(t * 3)), y + 3, 1, 4, '#fff'); g.globalAlpha = 1; },
    tea_tray: function (g, x, y) { px(g, x + 1, y + 7, 14, 6, '#c9a24a'); px(g, x + 3, y + 5, 4, 4, '#f2efe8'); px(g, x + 9, y + 5, 4, 4, '#f2efe8'); px(g, x + 4, y + 5, 2, 1, '#8a5a2a'); px(g, x + 10, y + 5, 2, 1, '#8a5a2a'); },
    mop: function (g, x, y) { px(g, x + 9, y - 6, 1, 18, '#8a6a3a'); px(g, x + 6, y + 11, 7, 4, '#d8d0b8'); },
    bleach: function (g, x, y) { px(g, x + 4, y + 4, 4, 10, '#f2efe8'); px(g, x + 5, y + 2, 2, 2, '#3a7ae8'); px(g, x + 9, y + 6, 4, 8, '#f2efe8'); px(g, x + 10, y + 4, 2, 2, '#e8323c'); },
    falsville: function (g, x, y) { px(g, x + 4, y + 5, 8, 9, '#2a6a3a'); px(g, x + 4, y + 5, 1, 9, '#1a4a2a'); px(g, x + 6, y + 7, 4, 3, '#e8c15a'); },
    book_open: function (g, x, y) { px(g, x + 2, y + 7, 12, 6, '#f2efe8'); px(g, x + 7, y + 7, 2, 6, '#c8c0b0'); px(g, x + 3, y + 9, 3, 1, '#888'); px(g, x + 10, y + 9, 3, 1, '#888'); },
    laptop: function (g, x, y, t) { px(g, x + 3, y + 4, 10, 6, '#1a1a1a'); px(g, x + 4, y + 5, 8, 4, blink(t, 0.5) ? '#3fc1c9' : '#2a8a90'); px(g, x + 2, y + 10, 12, 2, '#5a5a62'); },
    trophy: function (g, x, y) { px(g, x + 5, y + 3, 6, 5, '#e8c15a'); px(g, x + 3, y + 4, 2, 2, '#e8c15a'); px(g, x + 11, y + 4, 2, 2, '#e8c15a'); px(g, x + 7, y + 8, 2, 3, '#c9a24a'); px(g, x + 5, y + 11, 6, 2, '#8a6a20'); },
    key_dish: function (g, x, y) { px(g, x + 3, y + 8, 10, 4, '#c9a24a'); px(g, x + 4, y + 7, 8, 1, '#f0d070'); px(g, x + 5, y + 8, 3, 1, '#8a8e96'); px(g, x + 9, y + 9, 2, 1, '#6a5a3a'); },
    numberplate: function (g, x, y, t, o) { var n = String((o && o.def && o.def.n) || '?'); px(g, x + 5, y + 2, 6, 5, '#c9a24a'); px(g, x + 6, y + 3, 4, 3, '#1a1220'); g.fillStyle = '#f0d070'; g.font = '5px monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(n, x + 8, y + 4.6); },
    photo_waverly: function (g, x, y) { px(g, x + 4, y + 4, 8, 9, '#f2efe8'); px(g, x + 5, y + 5, 6, 6, '#4a5a6a'); px(g, x + 6, y + 6, 4, 4, '#b98a62'); px(g, x + 6, y + 5, 4, 2, '#4a2c1a'); px(g, x + 4, y + 8, 8, 1, 'rgba(0,0,0,0.25)'); },
    fridge_note: function (g, x, y) { px(g, x + 4, y + 4, 8, 7, '#f8f0a0'); px(g, x + 5, y + 6, 6, 1, '#3a3a8a'); px(g, x + 5, y + 8, 4, 1, '#3a3a8a'); px(g, x + 7, y + 3, 2, 2, '#e8323c'); },
    bear_toy: function (g, x, y) { px(g, x + 5, y + 6, 6, 7, '#8a5a32'); px(g, x + 5, y + 4, 2, 2, '#8a5a32'); px(g, x + 9, y + 4, 2, 2, '#8a5a32'); px(g, x + 6, y + 7, 1, 1, '#111'); px(g, x + 9, y + 7, 1, 1, '#111'); px(g, x + 7, y + 9, 2, 1, '#c8a07a'); },
    bunny_toy: function (g, x, y) { px(g, x + 5, y + 7, 6, 6, '#9a9aa0'); px(g, x + 6, y + 2, 1, 5, '#9a9aa0'); px(g, x + 9, y + 2, 1, 5, '#9a9aa0'); px(g, x + 6, y + 9, 1, 1, '#111'); px(g, x + 9, y + 9, 1, 1, '#111'); },
    wristwatch: function (g, x, y, t) { px(g, x + 4, y + 7, 8, 3, '#1a1a1a'); px(g, x + 6, y + 6, 4, 5, '#0a0a0a'); px(g, x + 7, y + 7, 2, 3, blink(t, 1) ? '#3fc1c9' : '#1a5a60'); },
    blood_mat: function (g, x, y) { px(g, x + 1, y + 3, 14, 10, '#a8202c'); px(g, x + 3, y + 6, 10, 1, '#f0d0d0'); px(g, x + 4, y + 8, 8, 1, '#f0d0d0'); }
  };
  function camBody(g, x, y, o) {
    var f = (o && o.def && o.def.facing) || 'down';
    px(g, x + 2, y + 1, 9, 5, '#1c1c22'); px(g, x + 2, y + 1, 9, 1, '#3a3a42');
    if (f === 'left') px(g, x, y + 2, 3, 3, '#0a0a0e'); else if (f === 'right') px(g, x + 10, y + 2, 3, 3, '#0a0a0e'); else px(g, x + 5, y + 5, 3, 2, '#0a0a0e');
    px(g, x + 6, y, 1, 1, '#555');
  }
  function posterBase(g, x, y, c) { px(g, x + 3, y + 1, 10, 13, '#1a1a1a'); px(g, x + 3, y + 1, 10, 12, c); px(g, x + 3, y + 1, 10, 1, U.shade(c, 0.25)); }
  function mannequin(g, x, y, head) {
    px(g, x + 3, y + 3, 10, 10, '#e8e0d8'); px(g, x + 3, y + 3, 10, 1, '#fff'); px(g, x + 2, y + 7, 2, 6, '#d8d0c8'); px(g, x + 12, y + 7, 2, 6, '#d8d0c8');
    if (head) { px(g, x + 4, y - 5, 8, 8, '#f0e8e0'); px(g, x + 5, y - 3, 2, 2, '#1a1a8a'); px(g, x + 9, y - 3, 2, 2, '#1a1a8a'); px(g, x + 5, y - 1, 1, 3, '#3a7ae8'); px(g, x + 6, y + 1, 4, 1, '#e8323c'); px(g, x + 4, y - 5, 8, 1, '#e8323c'); px(g, x + 7, y - 2, 2, 1, '#e8323c'); }
    else px(g, x + 6, y + 1, 4, 2, '#8a8078');
  }
  G.shared.registerProps(PROPS);
})();
