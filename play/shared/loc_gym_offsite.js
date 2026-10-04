/* =========================================================================
 * shared/loc_gym_offsite.js: the Gymnasium (and every redress) + off-site recurring rooms.
 * Canon: canon/CHAPTERS.md §3. Loaded after locations.js / loc_upstairs.js, before chapters.
 * Tiles and props registered here are prefixed gx_.
 *
 * USE (key your map by the shared id):
 *   maps: { house_gym_courtroom: G.shared.map('house_gym_courtroom', { npcs: [...], remove: ['cage'] }) }
 *   var M = G.shared.data.marks.house_gym_courtroom;   // M.defendant_left -> [8, 8]
 *   var S = G.shared.data.spawns.house_gym_courtroom;  // S.from_red_hall -> [1, 9]
 * Every map def also carries the same `marks` / `spawns` objects (kept by G.shared.map's deep copy).
 * Cross-owner exits look up their arrival tile when used (G.shared.data.spawns[target]['from_<me>']) and
 * auto-LOCK when your chapter did not register the target map, so a lone room never throws.
 *
 * ---------------------------------------------------------------- GYM (24x20, all redresses)
 * Shell shared by all five: west double door (0,9)-(0,10) = exit 'to_red_hall' -> house_red_hall
 * (arrives at house_red_hall spawns.from_gym). Spawn 'from_red_hall' [1,9].
 * East: observation glass x=21, paying audience gallery x=22 (solid). South: bleachers y=15..18
 * (aisles x=5 and x=16 are walkable), walkway y=14. Legend char 'A' = crowded bleacher, 'b' = empty
 * bleacher, 'a' = gallery crowd: override in your legend to empty them, e.g. legend: { A: 'gx_bleacher' }.
 * Marks common to all: door_in [1,9], gallery [20,8], bleachers_aisle_left [5,16], bleachers_aisle_right
 *   [16,16], bleachers_top [16,18], walkway_center [10,14].
 *
 * house_gym (bare): objects beam, rope, punching_bag, weights. Marks: rope [9,3], bag [12,3], beam [5,4].
 *
 * house_gym_courtroom ("Carnival of Justice", ch05/07/13/15):
 *   objects: holoscreen (north wall, props left/right/leftVotes/rightVotes may be strings or functions),
 *   judge_bench, mic, chair_left, chair_right, cage, jury_1..jury_12 (mannequins), robocam_1/2, cam_1/2.
 *   Marks: judge_bench [10,2] (top of the two-storey bench), bench_stairs [7,2], mic [10,7],
 *     defendant_left [8,8], defendant_right [12,8], carpet [10,10], cage [10,13] (the Cage tile; put a
 *     caged NPC here, the bars draw over it), contestant_1..contestant_7 [17,4]..[17,10] (contestants'
 *     bench, facing west), jury_box [6,5] (in front of the box rail), host_floor [10,5], tb_left [7,12], tb_right [13,12],
 *     camera_left [6,12], camera_right [15,12].
 *   Mannequin heads: remove 'jury_7' and re-add it at the same tile ({ id:'jury_7', at:[...], prop:'gx_mannequin', headless:true }.
 *
 * house_gym_vr (ch04): seven beds in a tight circle round tool_tray [11,9]. objects bed_1..bed_7,
 *   iv_1..iv_7, tool_tray, robocam_1. Marks bed_1..bed_7 (= bed tiles), tray [11,9], trader [11,3],
 *   wheel_reward [4,4], wheel_punish [18,4] (where the reward/punishment wheels can stand), plus shell marks.
 *
 * house_gym_ballroom (ch03): hanging stars overlay ('stars'), photo walls of the Great Leader, band stage
 *   with three band extras (gx_band_1..3), noose chocolate fountain ('fountain'), buffet tables,
 *   robocams (robocam_1..3), guest extras gx_guest_1..6. Marks: band_stage [11,6], dance_floor [11,11],
 *   fountain [4,11] (stand south of it: [4,12]), buffet [18,4], keyhole [1,10] (just inside the door),
 *   trader_stage [11,8] (front of the band stage).
 *
 * house_gym_sandbags (ch07): seven black mats in a row. objects mat_1..mat_7 are TILES (examinable ids),
 *   sandbags_left/right piles, podium 'harman_podium'. Marks mat_1..mat_7 [5,9],[7,9]..[17,9],
 *   harman [11,5], trader [14,5].
 *
 * ---------------------------------------------------------------- OFF-SITE
 * execution_amphitheatre (32x24, ch06/08/13): stage y=2..7 with 'gurney' (at stage_center) and 'gallows';
 *   toggle with remove: ['gallows'] or remove: ['gurney']. Robot camera banks rows y=10..12, human seats
 *   y=13..17, chained prisoners row y=19, families' box (west front), VIP box (east). Objects: gurney,
 *   gallows, holoscreen, vendor_1/2 (extras), balloons overlay. Spawn from_cage [5,4] (stage west wing).
 *   Marks: stage_center [15,4], gallows [19,4], cage [5,4], wing_left [5,4], wing_right [26,4],
 *   host [12,5], judge [18,6], security_1..4 [10..21,8], families_box [4,10], vip_box [27,11],
 *   aisle [15,15], prisoners_row [10,19], crowd_front [9,13], vendor [15,17].
 * dpe_hq_lobby (20x14): exits to_dpe_hq_cells (east) -> dpe_hq_cells, to_dpe_hq_studio (north elevators),
 *   to_show_bus (south doors, -> 'show_bus', chapter-owned, auto-locked). Spawns from_show_bus [10,12],
 *   from_dpe_hq_cells [18,7], from_dpe_hq_studio [10,3]. Marks desk [10,5] (receptionist behind desk
 *   at desk_clerk [10,4]), sign [3,2], line_start [10,9].
 * dpe_hq_cells (24x8): exit to_dpe_hq_lobby (west). Spawn from_dpe_hq_lobby [1,5]. Cells along the north;
 *   marks cell_1..cell_6 (inside each cell), cell_luna (the smallest), guard [20,6], corridor [12,6].
 *   Cell fronts are solid bars (no walk-in): put people in a cell by placing them at its mark (goRoom at: / npc at:). Objects tv_1..7, guard_desk, cam_1..3.
 * dpe_hq_studio (22x14, ch09 interview): exit to_dpe_hq_lobby (south). Spawn from_dpe_hq_lobby [11,12].
 *   Marks chair_guest [9,5], chair_host [13,5], table [11,5], plinth [11,2], audience [11,10],
 *   wings [2,6], camera [11,8].
 * columbus_dorm (16x12): exit to_columbus_lounge (south door). Spawn from_columbus_lounge [8,10].
 *   Marks bunk_luna [2,3], bunk_salina [4,3], android [8,6], tv [8,1], door [8,10].
 * columbus_lounge (14x10): exits to_columbus_dorm (north stair), to_columbus_closet (under the stair),
 *   to_columbus_office (east), to_columbus_yard (south back door). Spawns from_columbus_dorm [3,2],
 *   from_columbus_closet [5,3], from_columbus_office [12,5], from_columbus_yard [7,8]. Marks couch [9,3],
 *   toys [10,7], staff [7,5].
 * columbus_closet (4x4 room, 2x2 inside, dark): exit to_columbus_lounge. Spawn from_columbus_lounge [1,2].
 *   Marks inside [2,1].
 * columbus_office (8x6): exit to_columbus_lounge (west). Spawn from_columbus_lounge [1,3].
 *   Marks phone [4,1] (stand at [4,2]), director [5,1].
 * columbus_yard (20x14): exits to_columbus_lounge (south back door), to_woods (gap in the north back
 *   fence, -> 'woods', chapter-owned, auto-locked). Spawns from_columbus_lounge [9,12], from_woods [14,2].
 *   Marks oak [5,6] (reading spot under the tree), fence_gap [14,1], fence [9,2], back_door [9,12].
 * luna_apartment (10x8, ch01/ch16): exit to_street (door, south wall -> 'street', chapter-owned,
 *   auto-locked). Spawn from_street [7,6]. Objects fridge (+ 'fridge_note' none: add your own note),
 *   couch, owl_clock, waverly_bed, bartholomew, books, stove, curtain. Marks couch [1,3] (Luna's bed),
 *   waverly_bed [8,2], fridge [5,2] (stand at [5,2], fridge is [5,1]), door [7,6], kitchen [4,2].
 * ========================================================================= */
(function () {
  'use strict';
  var G = window.G, U = G.util, T = G.TILE || 16;
  function px(g, x, y, w, h, c) { g.fillStyle = c; g.fillRect(x, y, w, h); }
  function tileDraw(name) { return function (g, x, y, info) { var d = G.registry.tiles[name]; if (d && d.draw) d.draw(g, x, y, info); else if (d) G.Map.pattern(g, x, y, d, info); }; }
  G.shared.data.spawns = G.shared.data.spawns || {};
  G.shared.data.marks = G.shared.data.marks || {};

  /* ------------------------------------------------------------------ palette */
  var GOLD = '#d4a83a', RED = '#e8323c', NAVY = '#141826';
  var SKINS = ['#f2cdb0', '#e0b090', '#c08860', '#8a5a3a', '#5a3a28', '#f0d0b8'];
  var SHIRTS = ['#6a3a4a', '#3a4a6a', '#4a5a3a', '#7a6a3a', '#5a3a6a', '#8a8a92', '#2a2a32', '#9a3a3a', '#3a6a6a'];
  var HAIR = ['#1a1412', '#4a3020', '#8a6a3a', '#c8c0b0', '#2a1a10', '#6a2a1a'];

  /* one or two tiny seated spectators per tile (anim: bobbing, phone flashes) */
  function people(g, x, y, info, dim, seed) {
    for (var i = 0; i < 2; i++) {
      var h = U.hash2(info.tx * 2 + i, info.ty, seed || 3);
      if (h < 0.12) continue;                       // empty seat
      var cx = x + 2 + i * 7, bob = Math.sin(info.t * (2 + h * 3) + h * 20) > 0.75 ? -1 : 0;
      var shirt = SHIRTS[Math.floor(h * 97) % SHIRTS.length], skin = SKINS[Math.floor(h * 53) % SKINS.length];
      px(g, cx, y + 8 + bob, 6, 6, dim ? U.shade(shirt, -0.45) : shirt);
      px(g, cx + 1, y + 3 + bob, 4, 5, dim ? U.shade(skin, -0.5) : skin);
      px(g, cx + 1, y + 2 + bob, 4, 2, HAIR[Math.floor(h * 31) % HAIR.length]);
      if (h > 0.55 && Math.sin(info.t * 1.3 + h * 40) > 0.97) px(g, cx + 4, y + 4, 2, 3, '#e8f4ff'); // phone flash
      if (h > 0.85 && Math.sin(info.t * 4 + h * 9) > 0.3) { px(g, cx - 1, y + 1 + bob, 1, 4, dim ? U.shade(skin, -0.5) : skin); } // waving arm
    }
  }
  function bleacher(g, x, y, info) {
    var tier = info.ty % 2;
    px(g, x, y, T, T, tier ? '#2b2531' : '#262029');
    px(g, x, y + 9, T, 3, '#3d3444'); px(g, x, y + 9, T, 1, '#54485e');
    px(g, x, y + 12, T, 4, '#18141c');
    if (info.tx % 4 === 0) px(g, x, y + 12, 1, 4, '#0e0c10');
  }

  /* ------------------------------------------------------------------ tiles */
  G.shared.registerTiles({
    gx_wall: { solid: true, wall: true, draw: function (g, x, y, info) {
      tileDraw('wall')(g, x, y, info);
      if (info.face) { px(g, x, y + 5, T, 2, '#5a1820'); px(g, x, y + 7, T, 1, GOLD); px(g, x, y + 8, T, 5, '#2a2836'); px(g, x + (info.tx % 2) * 8, y + 8, 1, 5, '#22202c'); }
    } },
    gx_leaderwall: { solid: true, wall: true, draw: function (g, x, y, info) { // framed photo of the Great Leader
      tileDraw('gx_wall')(g, x, y, info);
      if (!info.face) return;
      px(g, x + 2, y + 2, 12, 11, GOLD); px(g, x + 3, y + 3, 10, 9, '#2a2a3a');
      px(g, x + 6, y + 4, 4, 4, '#d8b898'); px(g, x + 6, y + 4, 4, 1, '#3a2a1a'); px(g, x + 5, y + 8, 6, 4, '#1a1a2a');
      px(g, x + 7, y + 9, 2, 1, RED);
    } },
    gx_rubber: { color: '#2a3038', color2: '#232830', pattern: 'noise' },
    gx_rubber_line: { draw: function (g, x, y, info) { G.Map.pattern(g, x, y, { color: '#2a3038', color2: '#232830', pattern: 'noise' }, info); px(g, x, y + 7, T, 2, '#8a8462'); } },
    gx_marble: { draw: function (g, x, y, info) {
      px(g, x, y, T, T, (info.tx + info.ty) % 2 ? '#1d1a26' : '#221e2c');
      px(g, x, y, T, 1, '#2a2636'); px(g, x, y, 1, T, '#2a2636');
      if (info.r > 0.6) px(g, x + 3 + Math.floor(info.r * 8), y + 4, 5, 1, 'rgba(212,168,58,0.18)');
    } },
    gx_redcarpet: { draw: function (g, x, y) {
      px(g, x, y, T, T, '#221e2c'); px(g, x + 1, y, 14, T, '#8a1420'); px(g, x + 2, y, 12, T, '#a81a28');
      px(g, x + 1, y, 1, T, GOLD); px(g, x + 14, y, 1, T, GOLD); px(g, x + 4, y + 7, 8, 1, '#c02434');
    } },
    gx_obsglass: { solid: true, anim: true, draw: function (g, x, y, info) {
      px(g, x, y, T, T, '#0e1820'); px(g, x + 1, y, 3, T, '#2a3a48'); px(g, x + 12, y, 4, T, '#16222c');
      g.fillStyle = 'rgba(160,210,255,' + (0.18 + 0.1 * Math.sin(info.t * 0.8 + info.ty * 0.7)) + ')';
      g.fillRect(x + 4, y + ((info.ty * 5) % 12), 6, 2); g.fillRect(x + 5, y + ((info.ty * 5 + 3) % 12), 3, 1);
      px(g, x, y, 1, T, '#5a6a7a'); px(g, x + 15, y, 1, T, '#5a6a7a');
    } },
    gx_gallery: { solid: true, anim: true, draw: function (g, x, y, info) {
      px(g, x, y, T, T, '#0a0c14'); people(g, x, y, info, true, 9);
      g.fillStyle = 'rgba(60,120,200,0.12)'; g.fillRect(x, y, T, T);
    } },
    gx_bleacher: { draw: bleacher },
    gx_bleacher_step: { draw: function (g, x, y, info) { bleacher(g, x, y, info); px(g, x + 3, y + 1, 10, 7, '#3a3240'); px(g, x + 3, y + 1, 10, 1, '#5a4e62'); px(g, x + 7, y, 2, T, '#4a1a22'); } },
    gx_crowd: { solid: true, anim: true, draw: function (g, x, y, info) { bleacher(g, x, y, info); people(g, x, y - 1, info, false, 5); } },
    gx_bench_top: { draw: function (g, x, y) { px(g, x, y, T, T, '#3a2a1a'); px(g, x, y, T, 1, '#5a4228'); px(g, x, y + 8, T, 1, '#2a1e12'); px(g, x + 6, y + 3, 4, 2, '#4a3420'); } },
    gx_bench_desk: { solid: true, draw: function (g, x, y, info) { // the front of the two-storey bench
      px(g, x, y, T, T, '#2a1c12'); px(g, x, y, T, 3, '#6a4a2a'); px(g, x, y, T, 1, GOLD);
      px(g, x + 1, y + 4, 14, 11, '#3a2818'); px(g, x + 2, y + 5, 12, 9, '#4a321e');
      px(g, x, y + 15, T, 1, '#0a0806');
      if (info.tx % 2 === 0) { px(g, x + 5, y + 7, 6, 5, GOLD); px(g, x + 6, y + 8, 4, 3, '#1a1a2a'); px(g, x + 7, y + 9, 2, 1, RED); }
    } },
    gx_stairs: { draw: function (g, x, y) { px(g, x, y, T, T, '#2a1e14'); for (var i = 0; i < 4; i++) { px(g, x + 1, y + i * 4, 14, 3, '#5a4228'); px(g, x + 1, y + i * 4, 14, 1, '#7a5a38'); } } },
    gx_pew: { draw: function (g, x, y) { px(g, x, y, T, T, '#221e2c'); px(g, x + 1, y + 1, 12, 14, '#4a2a1e'); px(g, x + 1, y + 1, 12, 1, '#6a4028'); px(g, x + 1, y + 15, 12, 1, '#1a100a'); } },
    gx_pew_back: { solid: true, draw: function (g, x, y) { px(g, x, y, T, T, '#221e2c'); px(g, x, y, 6, T, '#3a2016'); px(g, x, y, 2, T, '#5a3420'); px(g, x + 6, y, 1, T, '#120a06'); } },
    gx_jury_floor: { solid: true, draw: function (g, x, y) { px(g, x, y, T, T, '#2a1a22'); px(g, x, y + 15, T, 1, '#1a1016'); px(g, x + 2, y + 6, 12, 1, '#3a2430'); } },
    gx_jury_rail: { solid: true, draw: function (g, x, y) { px(g, x, y, T, T, '#221e2c'); px(g, x + 2, y, 5, T, '#5a3a22'); px(g, x + 2, y, 5, 1, GOLD); px(g, x + 3, y, 1, T, '#7a5232'); px(g, x + 7, y, 1, T, '#120a06'); } },
    gx_ballfloor: { draw: function (g, x, y, info) {
      px(g, x, y, T, T, (info.tx + info.ty) % 2 ? '#1a1622' : '#2a2034');
      px(g, x + 2, y + 2, 3, 1, 'rgba(255,240,200,0.12)');
      if (info.r > 0.7) px(g, x + 9, y + 10, 1, 1, 'rgba(255,230,160,0.5)');
    } },
    gx_vrfloor: { anim: true, draw: function (g, x, y, info) {
      px(g, x, y, T, T, '#10141c');
      var dx = info.tx - 11, dy = info.ty - 9, d = Math.sqrt(dx * dx + dy * dy);
      var p = 0.25 + 0.25 * Math.sin(info.t * 2 - d * 0.9);
      g.fillStyle = 'rgba(63,193,201,' + p + ')'; g.fillRect(x, y, T, 1); g.fillRect(x, y, 1, T);
    } },
    gx_mat: { draw: function (g, x, y) { px(g, x, y, T, T, '#2a3038'); px(g, x + 1, y - 0, 14, 16, '#0c0c10'); px(g, x + 1, y, 14, 1, '#2a2a34'); px(g, x + 3, y + 3, 10, 10, '#141418'); } },
    gx_beam: { solid: true, base: 'gx_rubber', draw: function (g, x, y) { px(g, x, y + 6, T, 4, '#b8a070'); px(g, x, y + 6, T, 1, '#d8c090'); px(g, x, y + 10, T, 1, '#4a3a22'); px(g, x + 6, y + 11, 4, 4, '#3a3a42'); } },
    gx_blueTile: { draw: function (g, x, y, info) { px(g, x, y, T, T, '#2a5a8a'); px(g, x, y + 15, T, 1, '#1e4670'); px(g, x + 15, y, 1, T, '#1e4670'); px(g, x + 1, y + 1, 6, 1, '#4a7aaa'); if (info.r > 0.75) px(g, x + 9, y + 9, 3, 1, 'rgba(255,255,255,0.18)'); } },
    gx_bluewall: { solid: true, wall: true, draw: function (g, x, y, info) {
      if (!info.face) { px(g, x, y, T, T, '#14243a'); px(g, x, y, T, 1, '#24344a'); return; }
      px(g, x, y, T, T, '#3a6a9a'); px(g, x, y, T, 2, '#14243a'); px(g, x, y + 2, T, 1, '#5a8aba');
      px(g, x, y + 8, T, 1, '#2a5a8a'); px(g, x, y + 13, T, 3, '#1a3a5a');
    } },
    gx_elevator: { solid: true, wall: true, draw: function (g, x, y, info) {
      tileDraw('gx_bluewall')(g, x, y, info); if (!info.face) return;
      px(g, x + 2, y + 3, 12, 13, '#8a9aaa'); px(g, x + 7, y + 3, 2, 13, '#5a6a7a'); px(g, x + 6, y + 1, 4, 1, '#e8c15a');
    } },
    gx_cellfloor: { color: '#3a3c42', color2: '#2e3036', pattern: 'tiles' },
    gx_studio: { draw: function (g, x, y, info) { px(g, x, y, T, T, (info.tx + info.ty) % 2 ? '#1c1830' : '#221c3a'); px(g, x, y, T, 1, '#2a2446'); } },
    gx_seats: { solid: true, anim: true, draw: function (g, x, y, info) { px(g, x, y, T, T, '#141020'); px(g, x, y + 10, T, 6, '#2a1830'); people(g, x, y - 1, info, false, 21); } },
    gx_robocams: { solid: true, anim: true, draw: function (g, x, y, info) { // a bank of robot cameras in a seat row
      bleacher(g, x, y, info);
      for (var i = 0; i < 2; i++) {
        var cx = x + 2 + i * 7, h = U.hash2(info.tx * 2 + i, info.ty, 41), sw = Math.round(Math.sin(info.t * 0.7 + h * 9) * 1.5);
        px(g, cx + 2, y + 6, 1, 4, '#3a3a42'); px(g, cx + sw, y + 2, 6, 4, '#1a1a20'); px(g, cx + sw, y + 2, 6, 1, '#4a4a56');
        px(g, cx + sw + (sw >= 0 ? 4 : 0), y + 3, 2, 2, '#5a8aaa');
        if (Math.sin(info.t * 3 + h * 30) > 0) px(g, cx + sw + 1, y + 3, 1, 1, RED);
      }
    } },
    gx_prisoners: { solid: true, anim: true, draw: function (g, x, y, info) { // chained prisoners, bused in
      bleacher(g, x, y, info);
      for (var i = 0; i < 2; i++) {
        var cx = x + 2 + i * 7, h = U.hash2(info.tx * 2 + i, info.ty, 77), sh = Math.sin(info.t * 1.5 + h * 12) > 0.9 ? 1 : 0;
        px(g, cx, y + 7, 6, 6, '#d9692b'); px(g, cx + 1, y + 2 + sh, 4, 5, SKINS[Math.floor(h * 53) % 6]);
        px(g, cx + 1, y + 2 + sh, 4, 1, HAIR[Math.floor(h * 31) % 6]);
      }
      px(g, x, y + 11, T, 1, '#9aa0aa'); for (var c = 1; c < T; c += 3) px(g, x + c, y + 10, 1, 1, '#6a6e76');
    } },
    gx_stagefloor: { draw: function (g, x, y, info) { px(g, x, y, T, T, '#2a1e22'); px(g, x, y + 7, T, 1, '#1e1418'); px(g, x, y + 15, T, 1, '#1e1418'); px(g, x + (info.tx * 5) % 12, y + 3, 4, 1, 'rgba(255,255,255,0.06)'); } },
    gx_stagefront: { solid: true, draw: function (g, x, y) { px(g, x, y, T, T, '#120c10'); px(g, x, y, T, 3, '#3a2a30'); px(g, x, y, T, 1, '#6a4a50'); px(g, x, y + 3, T, 13, '#1a1216'); px(g, x + 2, y + 6, 12, 1, '#2a1e22'); px(g, x + 7, y + 3, 2, 2, '#e8c15a'); } },
    gx_boxfloor: { color: '#3a1a22', color2: '#2a1218', pattern: 'noise' },
    gx_rail: { solid: true, draw: function (g, x, y) { px(g, x, y, T, T, '#1a1418'); px(g, x, y + 5, T, 3, GOLD); px(g, x, y + 5, T, 1, '#f0d070'); px(g, x + 3, y + 8, 2, 8, '#6a5420'); px(g, x + 11, y + 8, 2, 8, '#6a5420'); } },
    gx_railv: { solid: true, draw: function (g, x, y) { px(g, x, y, T, T, '#1a1418'); px(g, x + 6, y, 3, T, GOLD); px(g, x + 6, y, 1, T, '#f0d070'); } },
    gx_vipglass: { solid: true, anim: true, draw: function (g, x, y, info) { px(g, x, y, T, T, '#1a2430'); px(g, x, y + 5, T, 6, 'rgba(120,180,220,0.35)'); px(g, x + ((Math.floor(info.t * 6) + info.tx * 5) % 16), y + 5, 2, 6, 'rgba(255,255,255,0.25)'); px(g, x, y + 11, T, 2, GOLD); } },
    gx_bunk: { solid: true, draw: function (g, x, y) { px(g, x, y, T, T, '#3a3a3e'); px(g, x + 1, y, 1, T, '#6a6a72'); px(g, x + 14, y, 1, T, '#6a6a72'); px(g, x + 2, y + 1, 12, 14, '#5a5a62'); px(g, x + 2, y + 1, 12, 3, '#b8b0a0'); px(g, x + 2, y + 6, 12, 1, '#4a4a52'); px(g, x + 2, y + 9, 12, 6, '#4a5a4a'); } },
    gx_oldfloor: { color: '#4a3e34', color2: '#3a3028', pattern: 'planks' },
    gx_linoleum: { color: '#5a5a4a', color2: '#4a4a3c', pattern: 'checker' },
    gx_fence: { solid: true, draw: function (g, x, y, info) { tileDraw('grass')(g, x, y, info); px(g, x, y + 4, T, 2, '#6a5a44'); px(g, x, y + 10, T, 2, '#6a5a44'); for (var i = 1; i < T; i += 5) { px(g, x + i, y + 1, 3, 14, '#8a7a5e'); px(g, x + i, y + 1, 3, 1, '#a8987a'); } } },
    gx_woods: { solid: true, draw: function (g, x, y, info) { px(g, x, y, T, T, '#0e1a10'); var h = info.r; px(g, x + 2 + Math.floor(h * 4), y + 1, 9, 9, '#1a3020'); px(g, x + 4, y + 3, 6, 5, '#24402a'); px(g, x + 6 + Math.floor(h * 3), y + 9, 2, 6, '#2a1e14'); } },
    gx_apt_floor: { color: '#4a4036', color2: '#3a322a', pattern: 'planks' },
    gx_curtain: { solid: true, draw: function (g, x, y) { px(g, x, y, T, T, '#4a4036'); for (var i = 0; i < T; i += 4) { px(g, x + 5, y + i, 6, 3, '#7a5a8a'); px(g, x + 5, y + i + 3, 6, 1, '#5a3a6a'); } px(g, x + 7, y, 2, 1, '#ccc'); } }
  });

  /* ------------------------------------------------------------------ props */
  function txt(g, s, x, y, c, size) { g.fillStyle = c; g.font = (size || 5) + 'px monospace'; g.textAlign = 'center'; g.textBaseline = 'top'; g.fillText(s, x, y); }
  function val(v, d) { v = typeof v === 'function' ? v() : v; return v == null ? d : v; }
  function portrait(g, x, y, seed, t) { // a silhouette head in a frame
    var h = U.hash2(seed, 3, 5);
    px(g, x, y, 22, 20, '#0a0812'); px(g, x + 1, y + 1, 20, 18, h > 0.5 ? '#3a1a4a' : '#1a2a4a');
    px(g, x + 7, y + 4, 8, 8, SKINS[Math.floor(h * 6)]); px(g, x + 6, y + 3, 10, 3, HAIR[Math.floor(h * 6)]);
    px(g, x + 4, y + 13, 14, 6, SHIRTS[Math.floor(h * 9)]);
    g.fillStyle = 'rgba(232,50,60,' + (0.1 + 0.08 * Math.sin(t * 4)) + ')'; g.fillRect(x + 1, y + 1, 20, 18);
  }
  G.shared.registerProps({
    // 20-ft holoscreen; draws 11 tiles wide x 2 tall from its anchor (put the anchor on the wall's left end)
    gx_holoscreen: function (g, x, y, t, o) {
      var d = (o && o.def) || {}, w = (d.wTiles || 11) * T, hgt = 30;
      px(g, x, y + 1, w, hgt, '#06040a'); px(g, x + 1, y + 2, w - 2, hgt - 2, '#160c22');
      var sweep = (t * 40) % (w + 40) - 20;
      g.fillStyle = 'rgba(232,50,60,0.10)'; g.fillRect(x + Math.max(1, sweep), y + 2, 12, hgt - 2);
      g.fillStyle = 'rgba(255,255,255,0.04)'; for (var yy = 3; yy < hgt; yy += 2) g.fillRect(x + 1, y + yy, w - 2, 1);
      var L = val(d.left, null), R = val(d.right, null);
      if (L || R) {
        portrait(g, x + 6, y + 5, 11, t); portrait(g, x + w - 28, y + 5, 29, t);
        txt(g, String(L || '').toUpperCase(), x + 46, y + 6, '#f2efe8'); txt(g, String(R || '').toUpperCase(), x + w - 46, y + 6, '#f2efe8');
        txt(g, 'SAVE ' + val(d.leftVotes, '—'), x + 46, y + 16, '#4aff8a'); txt(g, 'SAVE ' + val(d.rightVotes, '—'), x + w - 46, y + 16, '#4aff8a');
        txt(g, 'VS', x + w / 2, y + 12, GOLD, 7);
      } else {
        txt(g, val(d.title, 'CARNIVAL OF JUSTICE'), x + w / 2, y + 7, GOLD, 7);
        txt(g, val(d.subtitle, 'THE PEOPLE DECIDE • VOTE SAVE'), x + w / 2, y + 18, '#f2efe8');
      }
      if (Math.sin(t * 4) > 0) { px(g, x + 4, y + 3, 3, 3, RED); }
      px(g, x, y + 1, w, 1, GOLD); px(g, x, y + hgt, w, 1, GOLD);
    },
    gx_mannequin: function (g, x, y, t, o) {
      var headless = o && o.def && o.def.headless, h = U.hash2(o ? o.tx : 0, o ? o.ty : 0, 2);
      px(g, x + 4, y + 6, 8, 8, h > 0.5 ? '#3a3a5a' : '#5a2a3a'); px(g, x + 4, y + 6, 8, 1, '#e8e4dc');
      px(g, x + 3, y + 7, 1, 5, '#e8e0d8'); px(g, x + 12, y + 7, 1, 5, '#e8e0d8');
      if (headless) { px(g, x + 7, y + 4, 2, 2, '#e8e0d8'); px(g, x + 6, y + 5, 4, 1, '#8a1420'); return; }
      px(g, x + 5, y - 1, 6, 7, '#efe8e0'); px(g, x + 5, y - 1, 6, 1, '#c8c0b8');
      px(g, x + 6, y + 1, 1, 1, '#1a1a2a'); px(g, x + 9, y + 1, 1, 1, '#1a1a2a');
      px(g, x + 6, y + 2, 1, 2, '#3a8ad0');                      // painted tear
      px(g, x + 6, y + 4, 4, 1, RED); px(g, x + 7, y + 2, 2, 1, '#e86a8a');
    },
    gx_defchair: function (g, x, y) { // high-backed defendant's chair
      px(g, x + 3, y - 4, 10, 9, '#3a0a14'); px(g, x + 3, y - 4, 10, 1, GOLD); px(g, x + 4, y - 3, 8, 7, '#5a1220');
      px(g, x + 3, y + 5, 10, 6, '#6a1626'); px(g, x + 3, y + 11, 2, 4, '#1a0a0e'); px(g, x + 11, y + 11, 2, 4, '#1a0a0e');
    },
    gx_cage: function (g, x, y, t) { // Saint-Bernard-sized cage on wheels (layer 1: bars draw over whoever is inside)
      var x0 = x - 2, y0 = y - 12;
      px(g, x0, y0, 20, 2, '#5a5e66'); px(g, x0, y0 + 24, 20, 3, '#3a3e46');
      for (var i = 0; i <= 18; i += 3) { px(g, x0 + i, y0, 1, 26, '#8a9098'); }
      px(g, x0, y0 + 10, 20, 1, '#5a5e66');
      px(g, x0 + 1, y0 + 27, 3, 2, '#111'); px(g, x0 + 16, y0 + 27, 3, 2, '#111');
      var sw = Math.round(Math.sin(t * 2));
      px(g, x0 - 2, y0 + 2 + sw, 2, 6, '#9aa0aa'); px(g, x0 + 20, y0 + 2 - sw, 2, 6, '#9aa0aa'); // corner chains
    },
    gx_robocam: function (g, x, y, t) { // tall-necked wheeled camera
      var sw = Math.round(Math.sin(t * 0.9) * 2);
      px(g, x + 3, y + 12, 10, 3, '#2a2a30'); px(g, x + 3, y + 15, 2, 1, '#111'); px(g, x + 11, y + 15, 2, 1, '#111');
      px(g, x + 7, y - 4, 2, 16, '#4a4a54');
      px(g, x + 3 + sw, y - 10, 10, 6, '#1a1a20'); px(g, x + 3 + sw, y - 10, 10, 1, '#5a5a66'); px(g, x + 11 + sw, y - 9, 3, 4, '#3a6a8a');
      if (Math.sin(t * 5) > 0) px(g, x + 4 + sw, y - 9, 1, 1, RED);
    },
    gx_vrbed: function (g, x, y, t, o) { // white medical bed, pillow at the outer end (o.def.dir = up|down|left|right)
      var d = (o && o.def && o.def.dir) || 'up';
      var vert = d === 'up' || d === 'down';
      if (vert) { px(g, x + 2, y, 12, 16, '#c8ccd0'); px(g, x + 3, y + 1, 10, 14, '#e8ecf0'); px(g, x + 3, d === 'up' ? y + 1 : y + 11, 10, 4, '#ffffff'); px(g, x + 2, y + 7, 12, 1, '#5a6a7a'); }
      else { px(g, x, y + 2, 16, 12, '#c8ccd0'); px(g, x + 1, y + 3, 14, 10, '#e8ecf0'); px(g, d === 'left' ? x + 1 : x + 11, y + 3, 4, 10, '#ffffff'); px(g, x + 7, y + 2, 1, 12, '#5a6a7a'); }
      g.fillStyle = 'rgba(63,193,201,' + (0.15 + 0.1 * Math.sin(t * 3)) + ')'; g.fillRect(x + 1, y + 1, 14, 14);
    },
    gx_iv: function (g, x, y, t) {
      px(g, x + 7, y + 1, 1, 13, '#9aa0aa'); px(g, x + 4, y + 13, 8, 2, '#5a5e66'); px(g, x + 5, y + 1, 5, 1, '#9aa0aa');
      px(g, x + 4, y + 2, 3, 5, 'rgba(200,230,255,0.85)'); px(g, x + 4, y + 5, 3, 2, '#e8c15a');
      px(g, x + 9, y + 6, 5, 4, '#1a1a20'); px(g, x + 10, y + 7, 3, 1, Math.sin(t * 6) > 0 ? '#4aff8a' : '#2a6a3a');
    },
    gx_tooltray: function (g, x, y) { // porcelain tray of tools
      px(g, x + 6, y + 9, 4, 6, '#d8d8dc'); px(g, x + 1, y + 4, 14, 6, '#f4f2ee'); px(g, x + 1, y + 4, 14, 1, '#ffffff'); px(g, x + 1, y + 9, 14, 1, '#b8b4ae');
      px(g, x + 3, y + 6, 4, 1, '#8a9aa8'); px(g, x + 8, y + 5, 1, 4, '#8a9aa8'); px(g, x + 10, y + 6, 3, 2, '#5a5e66'); px(g, x + 3, y + 8, 2, 1, '#8a1420');
    },
    gx_noose_fountain: function (g, x, y, t) { // chocolate fountain shaped like a noose
      px(g, x + 1, y + 11, 14, 4, '#c9a24a'); px(g, x + 2, y + 9, 12, 3, '#4a2a1a');
      px(g, x + 7, y - 14, 2, 23, '#5a3420');
      g.strokeStyle = '#6a3c22'; g.lineWidth = 2; g.beginPath(); g.ellipse(x + 8, y - 2, 4, 5, 0, 0, Math.PI * 2); g.stroke();
      px(g, x + 6, y - 9, 4, 4, '#4a2a1a');
      var drip = Math.floor(t * 8) % 6; px(g, x + 8, y + 3 + drip, 1, 2, '#3a2010'); px(g, x + 4, y + 9, 2, 1, '#6a4028');
    },
    gx_stars: function (g, x, y, t, o) { // thousands of hanging stars (overlay; draws the whole map from its anchor)
      var d = (o && o.def) || {}, w = (d.wTiles || 24) * T, h = (d.hTiles || 14) * T, n = d.count || 140;
      for (var i = 0; i < n; i++) {
        var a = U.hash2(i, 1, 99), b = U.hash2(i, 2, 99), sx = x + Math.floor(a * w), sy = y + 18 + Math.floor(b * h);
        g.fillStyle = 'rgba(200,200,220,0.18)'; g.fillRect(sx, sy - 6, 1, 6);
        var tw = Math.sin(t * 2 + i) > 0.3;
        px(g, sx - 1, sy, 3, 1, tw ? '#fff6c8' : GOLD); px(g, sx, sy - 1, 1, 3, tw ? '#fff6c8' : GOLD);
      }
    },
    gx_balloons: function (g, x, y, t, o) { // kites and balloons over the amphitheatre
      var d = (o && o.def) || {}, w = (d.wTiles || 32) * T, h = (d.hTiles || 10) * T;
      var cols = [RED, '#3a8ad0', GOLD, '#e86a8a', '#4aff8a', '#f2efe8'];
      for (var i = 0; i < (d.count || 18); i++) {
        var a = U.hash2(i, 4, 7), b = U.hash2(i, 5, 7), sx = x + Math.floor(a * w + Math.sin(t * 0.6 + i) * 3), sy = y + Math.floor(b * h + Math.cos(t * 0.5 + i) * 2);
        if (i % 4 === 0) { px(g, sx, sy, 5, 5, cols[i % 6]); px(g, sx + 1, sy + 1, 3, 3, cols[(i + 2) % 6]); g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(sx + 2, sy + 5, 1, 7); }
        else { px(g, sx, sy, 3, 4, cols[i % 6]); px(g, sx, sy, 1, 1, 'rgba(255,255,255,0.6)'); g.fillStyle = 'rgba(255,255,255,0.2)'; g.fillRect(sx + 1, sy + 4, 1, 5); }
      }
    },
    gx_gurney: function (g, x, y, t) {
      px(g, x - 2, y + 2, 20, 10, '#c8ccd0'); px(g, x - 1, y + 3, 18, 8, '#e8ecf0'); px(g, x - 1, y + 3, 4, 8, '#ffffff');
      px(g, x + 4, y + 3, 1, 8, '#2a2a30'); px(g, x + 11, y + 3, 1, 8, '#2a2a30'); // straps
      px(g, x - 1, y + 12, 1, 3, '#5a5e66'); px(g, x + 16, y + 12, 1, 3, '#5a5e66');
      px(g, x + 18, y - 6, 1, 18, '#9aa0aa'); px(g, x + 17, y - 6, 4, 5, 'rgba(200,230,255,0.8)');
      px(g, x + 20, y + 2, 5, 4, '#1a1a20'); px(g, x + 21, y + 3, 3, 1, Math.sin(t * 6) > 0 ? '#4aff8a' : '#2a6a3a');
    },
    gx_gallows: function (g, x, y, t) {
      px(g, x - 4, y + 6, 24, 9, '#4a3420'); px(g, x - 4, y + 6, 24, 1, '#6a4a2a'); px(g, x + 4, y + 9, 8, 5, '#1a1006'); // trapdoor
      px(g, x - 2, y - 26, 3, 32, '#5a3a22'); px(g, x - 2, y - 26, 16, 3, '#5a3a22');
      var sw = Math.sin(t * 1.2) * 0.8;
      px(g, x + 9 + Math.round(sw), y - 23, 1, 12, '#c8b080');
      g.strokeStyle = '#c8b080'; g.lineWidth = 1; g.beginPath(); g.ellipse(x + 9.5 + sw, y - 8, 2.5, 3.5, 0, 0, Math.PI * 2); g.stroke();
    },
    gx_sandbags: function (g, x, y) { for (var i = 0; i < 5; i++) { var sx = x + (i % 3) * 5, sy = y + 8 - Math.floor(i / 3) * 4; px(g, sx, sy, 6, 5, '#8a7a5a'); px(g, sx, sy, 6, 1, '#a8987a'); px(g, sx + 2, sy + 2, 2, 1, '#5a4a3a'); } },
    gx_bag: function (g, x, y, t) { var sw = Math.round(Math.sin(t * 1.5)); px(g, x + 7, y - 6, 1, 6, '#888'); px(g, x + 4 + sw, y, 8, 13, '#8a1420'); px(g, x + 4 + sw, y, 8, 2, '#a81a28'); px(g, x + 5 + sw, y + 5, 6, 1, '#5a0a10'); },
    gx_rope: function (g, x, y, t) { var sw = Math.sin(t) * 1.5; for (var i = 0; i < 18; i++) px(g, x + 7 + Math.round(sw * i / 18), y - 4 + i, 2, 1, i % 3 ? '#c8b080' : '#a89060'); },
    gx_weights: function (g, x, y) { px(g, x + 1, y + 4, 14, 10, '#2a2a30'); for (var i = 0; i < 3; i++) { px(g, x + 2 + i * 5, y + 2, 3, 10, '#4a4a54'); px(g, x + 2 + i * 5, y + 2, 3, 1, '#7a7a86'); } },
    gx_bigtv: function (g, x, y, t) { px(g, x + 1, y + 2, 14, 10, '#111'); px(g, x + 2, y + 3, 12, 8, Math.sin(t * 5) > 0 ? '#2a1a3a' : '#3a1a2a'); px(g, x + 3, y + 9, 5, 1, RED); px(g, x + 7, y + 12, 2, 2, '#222'); },
    gx_armchair: function (g, x, y, t, o) { var c = (o && o.def && o.def.color) || '#7a3a5a'; px(g, x + 2, y + 1, 12, 6, U.shade(c, -0.25)); px(g, x + 1, y + 5, 14, 9, c); px(g, x + 4, y + 7, 8, 5, U.shade(c, 0.12)); px(g, x + 1, y + 14, 2, 2, '#1a1a1a'); px(g, x + 13, y + 14, 2, 2, '#1a1a1a'); },
    gx_coffeetable: function (g, x, y) { px(g, x + 1, y + 5, 14, 7, '#c8c0b0'); px(g, x + 1, y + 5, 14, 1, '#e8e0d0'); px(g, x + 6, y + 6, 4, 3, '#f2efe8'); px(g, x + 7, y + 6, 2, 1, '#6a3a2a'); },
    gx_plinth: function (g, x, y, t) { px(g, x + 2, y + 6, 12, 9, '#2a2440'); px(g, x + 2, y + 6, 12, 1, GOLD); for (var i = 0; i < 5; i++) { var sx = x + 2 + i * 3, sy = y - 8 + ((i * 7) % 6); g.fillStyle = 'rgba(220,220,240,0.3)'; g.fillRect(sx, sy - 6, 1, 6); px(g, sx - 1, sy, 3, 1, Math.sin(t * 2 + i) > 0 ? '#fff6c8' : GOLD); px(g, sx, sy - 1, 1, 3, Math.sin(t * 2 + i) > 0 ? '#fff6c8' : GOLD); } },
    gx_oak: function (g, x, y, t) { // big oak (anchor = trunk tile; canopy spreads ~2 tiles)
      px(g, x + 5, y - 4, 6, 20, '#4a3020'); px(g, x + 6, y - 4, 2, 20, '#5a3a28'); px(g, x + 2, y + 13, 12, 3, '#3a2418');
      var sw = Math.round(Math.sin(t * 0.8));
      g.fillStyle = 'rgba(16,30,14,0.9)'; g.beginPath(); g.ellipse(x + 8 + sw, y - 14, 28, 18, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#2a4a24'; g.beginPath(); g.ellipse(x + 6 + sw, y - 17, 22, 13, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#3a5e30'; g.beginPath(); g.ellipse(x + 2 + sw, y - 20, 12, 7, 0, 0, Math.PI * 2); g.fill();
    },
    gx_owlclock: function (g, x, y, t) { px(g, x + 4, y + 2, 8, 10, '#8a6a3a'); px(g, x + 5, y + 4, 2, 2, '#f2efe8'); px(g, x + 9, y + 4, 2, 2, '#f2efe8'); px(g, x + 5 + (Math.sin(t * 2) > 0 ? 1 : 0), y + 5, 1, 1, '#111'); px(g, x + 9 + (Math.sin(t * 2) > 0 ? 1 : 0), y + 5, 1, 1, '#111'); px(g, x + 7, y + 7, 2, 1, '#e8a03a'); px(g, x + 6, y + 9, 4, 2, '#d8c8a8'); },
    gx_bear: function (g, x, y) { px(g, x + 5, y + 7, 6, 6, '#8a5a3a'); px(g, x + 6, y + 3, 4, 4, '#9a6a4a'); px(g, x + 5, y + 2, 2, 2, '#8a5a3a'); px(g, x + 9, y + 2, 2, 2, '#8a5a3a'); px(g, x + 7, y + 5, 1, 1, '#111'); },
    gx_books: function (g, x, y) { var c = ['#8a3a3a', '#3a5a8a', '#6a7a3a', '#9a8a5a', '#5a3a6a']; for (var i = 0; i < 9; i++) px(g, x + 2 + (i % 5) * 2 + Math.floor(i / 5), y + 6 - Math.floor(i / 5) * 3, 2, 4 + (i % 2), c[i % 5]); },
    gx_phone: function (g, x, y) { px(g, x + 3, y + 6, 10, 6, '#1a1a1a'); px(g, x + 4, y + 4, 8, 2, '#2a2a2a'); px(g, x + 6, y + 8, 4, 3, '#aaa'); }
  });

  /* ------------------------------------------------------------------ helpers */
  function Grid(w, h, ch) { var r = []; for (var y = 0; y < h; y++) { r.push([]); for (var x = 0; x < w; x++) r[y].push(ch); } this.r = r; this.w = w; this.h = h; }
  Grid.prototype.rect = function (x, y, w, h, ch) { for (var j = y; j < y + h; j++) for (var i = x; i < x + w; i++) if (this.r[j] && i >= 0 && i < this.w) this.r[j][i] = ch; return this; };
  Grid.prototype.set = function (x, y, ch) { return this.rect(x, y, 1, 1, ch); };
  Grid.prototype.box = function (x, y, w, h, wall, fill) { this.rect(x, y, w, h, wall); if (fill) this.rect(x + 1, y + 1, w - 2, h - 2, fill); return this; };
  Grid.prototype.rows = function () { return this.r.map(function (a) { return a.join(''); }); };

  /** An exit into a room that may belong to another owner or a chapter: resolves toAt on use, auto-locks if absent. */
  function xExit(id, at, size, target, fromName, facing, extra) {
    var e = { id: id, at: at, w: size[0], h: size[1], to: target, facing: facing,
      locked: function () { return !G.lookup('maps', target); },
      lockedText: 'It doesn\'t open. Not now.',
      run: function (api, ent) {
        var s = (G.shared.data.spawns[target] || {})[fromName];
        if (s && ent && ent.def && !ent.def.toAtFixed) ent.def.toAt = s;
      } };
    if (extra) Object.keys(extra).forEach(function (k) { e[k] = extra[k]; });
    return e;
  }
  /** An exit inside this file's own set (target spawn is known now). */
  function iExit(id, at, size, target, toAt, facing) {
    var e = xExit(id, at, size, target, null, facing);
    e.toAt = toAt; e.toAtFixed = true; return e;
  }
  function reg(id, def) {
    def.marks = def.marks || {}; def.spawns = def.spawns || {};
    G.shared.data.marks[id] = def.marks; G.shared.data.spawns[id] = def.spawns;
    G.shared.registerMap(id, def);
  }
  function merge(a, b) { var o = {}; Object.keys(a).forEach(function (k) { o[k] = a[k]; }); Object.keys(b || {}).forEach(function (k) { o[k] = b[k]; }); return o; }
  function cam(id, at) { return { id: id, at: at, prop: 'camera', solid: false, layer: 1 }; }

  /* ================================================================== THE GYM */
  var GYM_LEGEND = { '#': 'gx_wall', 'P': 'gx_leaderwall', 'D': 'door', '.': 'gx_rubber', '-': 'gx_rubber_line', 'G': 'gx_obsglass', 'a': 'gx_gallery',
    'b': 'gx_bleacher', '^': 'gx_bleacher_step', 'A': 'gx_crowd', 'm': 'gx_marble', 'r': 'gx_redcarpet', 'J': 'gx_bench_desk', 'j': 'gx_bench_top',
    'k': 'gx_stairs', 'p': 'gx_pew', 'q': 'gx_pew_back', 'z': 'gx_jury_floor', 'y': 'gx_jury_rail', 'o': 'gx_ballfloor', 's': 'stage', 'f': 'spotfloor',
    'T': 'table', 'v': 'gx_vrfloor', 'w': 'gx_mat', 'e': 'gx_beam', 'n': 'podium' };
  var GYM_SPAWNS = { from_red_hall: [1, 9] };
  var GYM_MARKS = { door_in: [1, 9], gallery: [20, 8], bleachers_aisle_left: [5, 16], bleachers_aisle_right: [16, 16], bleachers_top: [16, 18], walkway_center: [10, 14] };
  function gymShell(floor, crowd) {
    var g = new Grid(24, 20, floor);
    g.rect(0, 0, 24, 2, '#').rect(0, 19, 24, 1, '#').rect(0, 0, 1, 20, '#').rect(23, 0, 1, 20, '#');
    g.rect(0, 9, 1, 2, 'D');
    g.rect(21, 2, 1, 17, 'G').rect(22, 2, 1, 17, 'a');
    g.rect(1, 15, 20, 4, crowd || 'A');
    g.rect(5, 15, 1, 4, '^').rect(16, 15, 1, 4, '^');
    return g;
  }
  function gymDef(name, g, extra) {
    var def = { name: name, tiles: g.rows(), legend: GYM_LEGEND, spawn: [1, 9], bg: '#050409', ambient: 'crowd',
      spawns: merge(GYM_SPAWNS, {}), marks: merge(GYM_MARKS, extra.marks),
      npcs: [], objects: [cam('cam_1', [1, 2]), cam('cam_2', [20, 2])], zones: [], lights: [],
      exits: [xExit('to_red_hall', [0, 9], [1, 2], 'house_red_hall', 'from_gym', 'left')] };
    Object.keys(extra).forEach(function (k) {
      if (k === 'marks') return;
      if (['objects', 'npcs', 'lights', 'exits', 'zones'].indexOf(k) >= 0) def[k] = def[k].concat(extra[k]); else def[k] = extra[k];
    });
    return def;
  }

  /* ---------------- house_gym_courtroom: the Carnival of Justice ---------------- */
  (function () {
    var g = gymShell('m');
    g.rect(8, 2, 5, 1, 'j').rect(8, 3, 5, 1, 'J').set(7, 2, 'k').set(13, 2, 'k');
    g.rect(1, 3, 4, 6, 'z').rect(5, 3, 1, 6, 'y');                 // jury box
    g.rect(17, 4, 1, 7, 'p').rect(18, 4, 1, 7, 'q');                // contestants' bench (faces west)
    g.rect(10, 8, 1, 5, 'r');                                       // red carpet: chairs -> Cage
    g.rect(10, 13, 1, 1, 'r');
    var objs = [
      { id: 'holoscreen', at: [5, 0], prop: 'gx_holoscreen', solid: false, layer: -1, wTiles: 11,
        examine: 'A twenty-foot holoscreen. Two empty portrait frames wait for faces. SAVE counters sit under each, blank as headstones.' },
      { id: 'judge_bench', at: [10, 3], examine: 'The judge\'s bench rises two storeys. Whoever sits up there looks down on everyone, which is the point.' },
      { id: 'mic', at: [10, 6], prop: 'mic', examine: 'A microphone on a stand, aimed up at the bench.' },
      { id: 'chair_left', at: [8, 8], prop: 'gx_defchair', solid: false, layer: -1, examine: 'A defendant\'s chair. High-backed, red velvet, built to be looked at.' },
      { id: 'chair_right', at: [12, 8], prop: 'gx_defchair', solid: false, layer: -1, examine: 'The other defendant\'s chair. The carpet runs from between them straight to the Cage.' },
      { id: 'cage', at: [10, 13], prop: 'gx_cage', layer: 1, examine: 'The Cage. Saint-Bernard sized, on wheels, a chain at each corner.' },
      { id: 'robocam_1', at: [6, 12], prop: 'gx_robocam', examine: 'A camera on a long neck, wheeled in close for the reaction shots.' },
      { id: 'robocam_2', at: [15, 12], prop: 'gx_robocam', examine: 'Its lens follows you a half-second late.' }
    ];
    var n = 1;
    for (var yy = 3; yy <= 7; yy += 2) for (var xx = 1; xx <= 4; xx++) {
      objs.push({ id: 'jury_' + n, at: [xx, yy + (xx % 2 ? 0 : 1)], prop: 'gx_mannequin', examine: n === 1 ? 'The jury: painted mannequins in clown makeup with painted tears. Twelve of them, and none of them vote.' : 'A mannequin juror. Painted tears. Painted smile.' });
      n++;
    }
    reg('house_gym_courtroom', gymDef('The Carnival of Justice', g, {
      tint: '#3a0f4a', tintAlpha: 0.1, dark: 0.32, playerLight: 56,
      lights: [{ at: [10, 2], r: 64 }, { at: [10, 8], r: 72 }, { at: [10, 13], r: 44, flicker: true }, { at: [17, 7], r: 56 }, { at: [3, 5], r: 44 }, { at: [10, 16], r: 90 }, { at: [21, 8], r: 60 }, { at: [1, 9], r: 40 }],
      objects: objs,
      marks: { judge_bench: [10, 2], bench_stairs: [7, 2], mic: [10, 7], defendant_left: [8, 8], defendant_right: [12, 8], carpet: [10, 10], cage: [10, 13],
        contestant_1: [17, 4], contestant_2: [17, 5], contestant_3: [17, 6], contestant_4: [17, 7], contestant_5: [17, 8], contestant_6: [17, 9], contestant_7: [17, 10],
        jury_box: [6, 5], host_floor: [10, 5], tb_left: [7, 12], tb_right: [13, 12], camera_left: [6, 12], camera_right: [15, 12] }
    }));
  })();

  /* ---------------- house_gym_vr: seven beds in a tight circle (ch04) ---------------- */
  (function () {
    var g = gymShell('v');
    var objs = [], marks = { tray: [11, 9], trader: [11, 3], wheel_reward: [4, 4], wheel_punish: [18, 4] };
    var BEDS = [[11, 6, 'up'], [13, 7, 'right'], [14, 10, 'right'], [12, 12, 'down'], [10, 12, 'down'], [8, 10, 'left'], [9, 7, 'left']];
    var IVS = [[12, 5], [14, 6], [15, 11], [13, 13], [9, 13], [7, 11], [8, 6]];
    BEDS.forEach(function (b, i) {
      objs.push({ id: 'bed_' + (i + 1), at: [b[0], b[1]], prop: 'gx_vrbed', dir: b[2], examine: i === 0 ? 'Seven beds in a tight circle, heads out, feet toward the tray. Straps at the wrists.' : 'A hospital bed with wrist straps and a VR visor on the pillow.' });
      objs.push({ id: 'iv_' + (i + 1), at: IVS[i], prop: 'gx_iv', examine: 'An IV machine. The bag is already hung.' });
      marks['bed_' + (i + 1)] = [b[0], b[1]];
    });
    objs.push({ id: 'tool_tray', at: [11, 9], prop: 'gx_tooltray', examine: 'A porcelain tray of tools. Clean, white, arranged like cutlery at a dinner party.' });
    objs.push({ id: 'robocam_1', at: [17, 13], prop: 'gx_robocam', examine: 'A camera on a long neck, pointed at the beds.' });
    reg('house_gym_vr', gymDef('Gymnasium (Arena)', g, {
      tint: '#0a3a4a', tintAlpha: 0.12, dark: 0.3, playerLight: 56,
      lights: [{ at: [11, 9], r: 96 }, { at: [21, 8], r: 60 }, { at: [10, 16], r: 80 }, { at: [1, 9], r: 40 }, { at: [11, 3], r: 48 }],
      objects: objs, marks: marks
    }));
  })();

  /* ---------------- house_gym_ballroom (ch03) ---------------- */
  (function () {
    var g = gymShell('o', 'A');
    [3, 7, 15, 19].forEach(function (x) { g.set(x, 1, 'P'); });
    g.rect(9, 5, 5, 3, 's').set(11, 6, 'f');                        // band stage
    g.rect(17, 3, 3, 1, 'T').rect(2, 3, 3, 1, 'T');                 // buffet tables
    var objs = [
      { id: 'stars', at: [0, 0], prop: 'gx_stars', solid: false, layer: 1, wTiles: 21, hTiles: 13, count: 160 },
      { id: 'fountain', at: [4, 11], prop: 'gx_noose_fountain', examine: 'A chocolate fountain. Someone sculpted it into a noose. Guests are dipping strawberries into the loop.' },
      { id: 'buffet', at: [18, 3], examine: 'Silver trays piled with shrimp, tiny cakes, champagne in pyramids. More food than Waverly has seen in a year.' },
      { id: 'buffet_2', at: [3, 3], examine: 'Canapés shaped like little gavels.' },
      { id: 'leader_photos', at: [7, 1], examine: 'The Great Leader, framed in gold, smiling at a child. And again, smiling at a soldier. And again.' },
      { id: 'robocam_1', at: [7, 9], prop: 'gx_robocam', examine: 'A tall-necked camera rolls between the dancers on silent wheels.' },
      { id: 'robocam_2', at: [16, 12], prop: 'gx_robocam', examine: 'It turns to follow you.' },
      { id: 'robocam_3', at: [19, 7], prop: 'gx_robocam', examine: 'The red light blinks. Somewhere, someone is watching this.' }
    ];
    var npcs = [
      { id: 'gx_band_1', at: [10, 5], spec: 'band', facing: 'down', turn: false },
      { id: 'gx_band_2', at: [12, 5], spec: 'band', facing: 'down', turn: false },
      { id: 'gx_band_3', at: [10, 7], spec: G.shared.extra ? G.shared.extra('guest', 'band3', { name: 'Musician', outfit: '#e8c15a', style: 'suit' }) : 'band', facing: 'down', turn: false }
    ];
    var GUESTS = [[3, 6], [6, 4], [15, 5], [18, 10], [14, 13], [7, 13]];
    GUESTS.forEach(function (p, i) { npcs.push({ id: 'gx_guest_' + (i + 1), at: p, spec: G.shared.extra ? G.shared.extra('guest', 'ball' + i) : 'guest', facing: i % 2 ? 'left' : 'down' }); });
    reg('house_gym_ballroom', gymDef('The Ballroom', g, {
      ambient: 'crowd', tint: '#3a2a0a', tintAlpha: 0.1, dark: 0.22, playerLight: 56,
      lights: [{ at: [11, 6], r: 80, flicker: true }, { at: [4, 11], r: 48 }, { at: [18, 3], r: 48 }, { at: [3, 3], r: 40 }, { at: [11, 11], r: 70 }, { at: [10, 16], r: 80 }, { at: [21, 8], r: 60 }, { at: [1, 9], r: 40 }],
      objects: objs, npcs: npcs,
      marks: { band_stage: [11, 6], dance_floor: [11, 11], fountain: [4, 11], buffet: [18, 4], keyhole: [1, 10], trader_stage: [11, 8] }
    }));
  })();

  /* ---------------- house_gym_sandbags (ch07) ---------------- */
  (function () {
    var g = gymShell('.');
    var marks = { harman: [11, 5], trader: [14, 5] }, objs = [];
    for (var i = 0; i < 7; i++) { g.set(5 + i * 2, 9, 'w'); marks['mat_' + (i + 1)] = [5 + i * 2, 9]; objs.push({ id: 'mat_' + (i + 1), at: [5 + i * 2, 9], examine: 'A black mat. Seven in a row. Stand here, arms out, and answer.' }); }
    g.set(11, 4, 'n');
    objs.push({ id: 'harman_podium', at: [11, 4], examine: 'A podium for the questioner.' });
    objs.push({ id: 'sandbags_left', at: [3, 12], prop: 'gx_sandbags', examine: 'Sandbags. Each one is heavier than it looks.' });
    objs.push({ id: 'sandbags_right', at: [19, 12], prop: 'gx_sandbags', examine: 'More sandbags, stacked and waiting.' });
    objs.push({ id: 'robocam_1', at: [8, 12], prop: 'gx_robocam', examine: 'A camera on a long neck, framed on the mats.' });
    reg('house_gym_sandbags', gymDef('Gymnasium (Arena)', g, {
      tint: '#2a1a1a', tintAlpha: 0.1, dark: 0.28, playerLight: 56,
      lights: [{ at: [11, 9], r: 110 }, { at: [11, 4], r: 44 }, { at: [10, 16], r: 80 }, { at: [21, 8], r: 60 }, { at: [1, 9], r: 40 }],
      objects: objs, marks: marks
    }));
  })();

  /* ---------------- house_gym (bare) ---------------- */
  (function () {
    var g = gymShell('.', 'b');
    g.rect(3, 4, 5, 1, 'e');
    g.rect(2, 9, 18, 1, '-');
    var objs = [
      { id: 'beam', at: [5, 4], examine: 'A balance beam, scuffed by somebody else\'s feet.' },
      { id: 'rope', at: [9, 2], prop: 'gx_rope', examine: 'A climbing rope hangs from the double-height ceiling.' },
      { id: 'punching_bag', at: [12, 2], prop: 'gx_bag', examine: 'A red punching bag, still swaying a little.' },
      { id: 'weights', at: [15, 2], prop: 'gx_weights', examine: 'A rack of weights along the north wall.' },
      { id: 'weights_2', at: [16, 2], prop: 'gx_weights', examine: 'Heavier weights.' }
    ];
    reg('house_gym', gymDef('Gymnasium', g, {
      ambient: 'hum', tint: '#1a2a3a', tintAlpha: 0.1,
      objects: objs, marks: { rope: [9, 3], bag: [12, 3], beam: [5, 5] }
    }));
  })();

  /* ================================================================== OFF-SITE */
  function simpleDef(name, g, legend, extra) {
    var def = { name: name, tiles: g.rows(), legend: legend, bg: '#050409', npcs: [], objects: [], zones: [], exits: [], lights: [], spawns: {}, marks: {} };
    Object.keys(extra).forEach(function (k) { def[k] = extra[k]; });
    return def;
  }

  /* ---------------- execution_amphitheatre (ch06/08/13) ---------------- */
  (function () {
    var g = new Grid(32, 22, '_');
    g.rect(0, 0, 32, 2, '#').rect(0, 21, 32, 1, '#').rect(0, 0, 1, 22, '#').rect(31, 0, 1, 22, '#');
    g.rect(3, 2, 26, 5, 'S').rect(1, 2, 2, 5, 'C').rect(29, 2, 2, 5, 'C');      // stage + wing curtains
    g.set(2, 4, 'S').set(29, 4, 'S');                                            // wing openings
    g.rect(1, 7, 30, 1, 'F').rect(15, 7, 2, 1, 'k');                             // stage front + stairs
    g.rect(8, 9, 16, 3, 'R');                                                    // robot camera banks (bottom 3 rows)
    g.rect(1, 9, 7, 1, 'H').rect(7, 10, 1, 2, 'I').rect(1, 10, 6, 2, 'x');      // families' box
    g.rect(24, 9, 7, 1, 'v').rect(24, 10, 1, 3, 'I').rect(25, 10, 6, 3, 'x');   // VIP box
    g.rect(1, 12, 23, 1, 'A').rect(1, 13, 30, 5, 'A');                           // human seats (top rows)
    g.rect(15, 9, 2, 9, '^');                                                    // centre aisle
    g.rect(1, 19, 30, 1, 'X').rect(15, 19, 2, 1, '^');                           // chained prisoners' row
    var objs = [
      { id: 'holoscreen', at: [10, 0], prop: 'gx_holoscreen', solid: false, layer: -1, wTiles: 12, title: 'EXECUTION ENTERTAINMENT NETWORK', subtitle: 'LIVE • VOTE THE METHOD IN THE APP',
        examine: 'The screen over the stage. EXECUTION ENTERTAINMENT NETWORK, in letters taller than a person.' },
      { id: 'gurney', at: [15, 4], prop: 'gx_gurney', examine: 'A gurney with leather straps. An IV stand beside it, the bag already hung.' },
      { id: 'gallows', at: [20, 4], prop: 'gx_gallows', solid: false, layer: -1, examine: 'A gallows. The trapdoor is painted with the network logo.' },
      { id: 'cage', at: [4, 4], prop: 'gx_cage', layer: 1, examine: 'The Cage, wheeled in from the bus.' },
      { id: 'families_box', at: [4, 9], examine: 'The front-row box for the victims\' families. Tissues on every seat, branded.' },
      { id: 'vip_box', at: [27, 9], examine: 'The VIP box, behind glass. Champagne. Nobody in there is watching the stage.' },
      { id: 'balloons', at: [0, 2], prop: 'gx_balloons', solid: false, layer: 1, wTiles: 32, hTiles: 15, count: 22 },
      cam('cam_1', [1, 8]), cam('cam_2', [30, 8])
    ];
    var npcs = [
      { id: 'vendor_1', at: [9, 18], spec: 'vendor', facing: 'up', talk: 'Tomatoes! Two for five! T-shirts!' },
      { id: 'vendor_2', at: [22, 18], spec: 'vendor', facing: 'up', talk: '"I saw them die and all I got was this bloody T-shirt." Very funny. Very collectible.' }
    ];
    reg('execution_amphitheatre', simpleDef('Execution Amphitheatre', g, {
      '#': 'gx_wall', '_': 'concrete', 'S': 'gx_stagefloor', 'C': 'curtain', 'F': 'gx_stagefront', 'k': 'gx_stairs', 'R': 'gx_robocams', 'H': 'gx_rail', 'I': 'gx_railv',
      'x': 'gx_boxfloor', 'v': 'gx_vipglass', 'A': 'gx_crowd', '^': 'gx_bleacher_step', 'X': 'gx_prisoners'
    }, {
      ambient: 'crowd', tint: '#4a0a14', tintAlpha: 0.1, dark: 0.35, playerLight: 50, spawn: [5, 4],
      lights: [{ at: [15, 4], r: 90 }, { at: [20, 4], r: 60 }, { at: [5, 4], r: 44, flicker: true }, { at: [15, 13], r: 90 }, { at: [4, 10], r: 50 }, { at: [27, 11], r: 56 }, { at: [8, 18], r: 60 }, { at: [23, 18], r: 60 }, { at: [10, 19], r: 50, flicker: true }],
      objects: objs, npcs: npcs,
      spawns: { from_cage: [5, 4] },
      marks: { stage_center: [15, 4], stage_front: [15, 6], gallows: [20, 4], cage: [4, 4], wing_left: [5, 4], wing_right: [26, 4], host: [12, 5], judge: [18, 6],
        security_1: [10, 8], security_2: [13, 8], security_3: [18, 8], security_4: [21, 8], families_box: [4, 10], vip_box: [27, 11], aisle: [15, 15],
        prisoners_row: [15, 19], crowd_front: [15, 12], vendor: [15, 18] }
    }));
  })();

  /* ---------------- DPE HQ (ch09) ---------------- */
  (function () {
    var g = new Grid(20, 14, 'o');
    g.rect(0, 0, 20, 2, '#').rect(0, 13, 20, 1, '#').rect(0, 0, 1, 14, '#').rect(19, 0, 1, 14, '#');
    g.rect(9, 1, 2, 1, 'E').set(19, 7, 'D').rect(9, 13, 2, 1, 'D');
    g.rect(7, 5, 6, 1, 'K').set(1, 2, 'P').set(18, 2, 'P').set(1, 11, 'P').set(18, 11, 'P');
    g.rect(2, 8, 1, 3, 'h').rect(17, 8, 1, 3, 'h');
    reg('dpe_hq_lobby', simpleDef('DPE Headquarters: Lobby', g, { '#': 'gx_bluewall', 'E': 'gx_elevator', 'o': 'gx_blueTile' }, {
      ambient: 'hum', spawn: [10, 12], tint: '#2a5a8a', tintAlpha: 0.06,
      objects: [
        { id: 'trespass_sign', at: [3, 1], prop: 'sign', solid: false, examine: '"Trespassing on Government property is a punishable offence and may be punished with fines, imprisonment, or participation in mandatory punitive entertainment."' },
        { id: 'checkin_desk', at: [10, 5], examine: 'A smooth check-in desk. A stack of guest stickers: "DPE Participant".' },
        { id: 'elevators', at: [9, 1], examine: 'Elevators. The buttons only work with a badge.' },
        { id: 'penguin_logo', at: [14, 1], prop: 'poster', solid: false, examine: 'The DPE penguin, smiling.' },
        cam('cam_1', [17, 2]), cam('cam_2', [2, 12])
      ],
      exits: [iExit('to_dpe_hq_cells', [19, 7], [1, 1], 'dpe_hq_cells', [1, 5], 'right'),
        iExit('to_dpe_hq_studio', [9, 2], [2, 1], 'dpe_hq_studio', [11, 12], 'up'),
        xExit('to_show_bus', [9, 13], [2, 1], 'show_bus', 'from_dpe_hq_lobby', 'down')],
      spawns: { from_show_bus: [10, 12], from_dpe_hq_cells: [18, 7], from_dpe_hq_studio: [10, 3] },
      marks: { desk: [10, 6], desk_clerk: [10, 4], sign: [3, 2], line_start: [10, 9], elevators: [10, 2] }
    }));

    var c = new Grid(24, 8, '_');
    c.rect(0, 0, 24, 2, '#').rect(0, 7, 24, 1, '#').rect(0, 0, 1, 8, '#').rect(23, 0, 1, 8, '#');
    c.rect(1, 2, 22, 2, 'c').rect(1, 4, 22, 1, '|').set(0, 5, 'D');
    var CELLS = [[1, 3], [5, 3], [9, 2], [12, 1], [14, 3], [18, 2], [21, 2]];  // [x, width]
    var cobjs = [], cmarks = { guard: [20, 6], corridor: [12, 6] };
    for (var i = 0; i < CELLS.length; i++) {
      var x = CELLS[i][0], w = CELLS[i][1], end = x + w;
      if (end <= 22) c.rect(end, 2, 1, 3, '#');
      var luna = w === 1, nm = luna ? 'cell_luna' : 'cell_' + (i < 3 ? i + 1 : i);
      cobjs.push({ id: 'tv_' + (i + 1), at: [x, 2], prop: 'gx_bigtv', examine: luna ? 'A TV bolted at eye level, so close it fills the cell. It shows the poll. Your face. 16%.' : 'A small TV, playing the network.' });
      cmarks[nm] = [x + w - 1, 3];
    }
    cobjs.push(cam('cam_1', [3, 1]), cam('cam_2', [12, 1]), cam('cam_3', [19, 1]));
    cobjs.push({ id: 'guard_desk', at: [21, 6], prop: 'monitor', examine: 'A guard\'s monitor wall: every cell, every angle.' });
    reg('dpe_hq_cells', simpleDef('DPE Headquarters: Holding Cells', c, { '#': 'gx_bluewall', 'c': 'gx_cellfloor' }, {
      ambient: 'hum', spawn: [1, 5], dark: 0.25, playerLight: 50,
      lights: [{ at: [6, 5], r: 60 }, { at: [17, 5], r: 60 }, { at: [12, 3], r: 30, flicker: true }],
      objects: cobjs,
      exits: [iExit('to_dpe_hq_lobby', [0, 5], [1, 1], 'dpe_hq_lobby', [18, 7], 'left')],
      spawns: { from_dpe_hq_lobby: [1, 5] }, marks: cmarks
    }));

    var s = new Grid(22, 14, 'o');
    s.rect(0, 0, 22, 2, '#').rect(0, 13, 22, 1, '#').rect(0, 0, 1, 14, '#').rect(21, 0, 1, 14, '#');
    s.rect(6, 2, 10, 6, 's').set(11, 13, 'D');
    s.rect(2, 9, 18, 3, 'Q').rect(11, 9, 1, 3, 'o');
    reg('dpe_hq_studio', simpleDef('DPE Headquarters: Studio', s, { '#': 'gx_wall', 'o': 'gx_studio', 'Q': 'gx_seats' }, {
      ambient: 'crowd', spawn: [11, 12], tint: '#3a1a4a', tintAlpha: 0.08, dark: 0.3, playerLight: 50,
      lights: [{ at: [11, 4], r: 90 }, { at: [11, 10], r: 80 }, { at: [3, 10], r: 50 }, { at: [19, 10], r: 50 }],
      objects: [
        { id: 'holoscreen', at: [5, 0], prop: 'gx_holoscreen', solid: false, layer: -1, wTiles: 12, title: 'FRIENDS & FAMILY', subtitle: 'A RIGHT TO LIFE SPECIAL' },
        { id: 'plinth', at: [11, 2], prop: 'gx_plinth', examine: 'A plinth hung with paper stars, like the ball. Somebody\'s idea of whimsy.' },
        { id: 'chair_guest', at: [9, 5], prop: 'gx_armchair', solid: false, color: '#7a3a5a', examine: 'The guest\'s armchair. Soft enough to sink in.' },
        { id: 'chair_host', at: [13, 5], prop: 'gx_armchair', solid: false, color: '#3a4a7a', examine: 'The host\'s armchair, angled to the camera.' },
        { id: 'coffee_table', at: [11, 5], prop: 'gx_coffeetable', examine: 'A coffee table. Two mugs nobody will drink from.' },
        { id: 'robocam_1', at: [8, 8], prop: 'gx_robocam', examine: 'A studio camera.' },
        { id: 'robocam_2', at: [14, 8], prop: 'gx_robocam', examine: 'A studio camera, red light on.' }
      ],
      exits: [iExit('to_dpe_hq_lobby', [11, 13], [1, 1], 'dpe_hq_lobby', [10, 3], 'down')],
      spawns: { from_dpe_hq_lobby: [11, 12] },
      marks: { chair_guest: [9, 5], chair_host: [13, 5], table: [11, 5], plinth: [11, 2], audience: [11, 10], wings: [6, 6], camera: [11, 8], stage_front: [11, 7] }
    }));
  })();

  /* ---------------- Columbus House (ch02/07/12/16 flashbacks) ---------------- */
  (function () {
    var COL = { '#': 'brick', 'o': 'gx_oldfloor', 'u': 'gx_bunk', 'i': 'gx_linoleum', 'k': 'gx_stairs' };
    var d = new Grid(16, 12, 'o');
    d.rect(0, 0, 16, 2, '#').rect(0, 11, 16, 1, '#').rect(0, 0, 1, 12, '#').rect(15, 0, 1, 12, '#');
    d.set(3, 1, 'W').set(12, 1, 'W').set(8, 11, 'D');
    var bunks = [];
    [3, 6].forEach(function (y) { [1, 2, 4, 5, 10, 11, 13, 14].forEach(function (x) { bunks.push([x, y]); }); });
    [1, 2, 13, 14].forEach(function (x) { bunks.push([x, 9]); });
    bunks.forEach(function (b) { d.set(b[0], b[1], 'u'); });
    reg('columbus_dorm', simpleDef('Columbus House: Dorm', d, COL, {
      ambient: 'hum', spawn: [8, 10], tint: '#2a2a3a', tintAlpha: 0.12,
      objects: [
        { id: 'dorm_tv', at: [8, 1], prop: 'gx_bigtv', solid: false, examine: 'The dorm TV. It never turns off.' },
        { id: 'bunk_luna', at: [2, 3], examine: 'Luna\'s bunk. A thin blanket and a book under the pillow.' },
        { id: 'bunk_salina', at: [4, 3], examine: 'Salina\'s bunk. A blue hair clip on the pillow.' },
        cam('cam_1', [14, 2])
      ],
      exits: [iExit('to_columbus_lounge', [8, 11], [1, 1], 'columbus_lounge', [3, 2], 'down')],
      spawns: { from_columbus_lounge: [8, 10] },
      marks: { bunk_luna: [3, 3], bunk_salina: [3, 4], android: [8, 6], tv: [8, 2], door: [8, 10] }
    }));

    var l = new Grid(14, 10, 'o');
    l.rect(0, 0, 14, 2, '#').rect(0, 9, 14, 1, '#').rect(0, 0, 1, 10, '#').rect(13, 0, 1, 10, '#');
    l.rect(2, 1, 2, 1, 'k').set(5, 1, 'D').set(13, 5, 'D').set(7, 9, 'D');
    l.rect(8, 3, 3, 1, 'h').rect(6, 5, 5, 3, 'R').set(1, 7, 'k');
    l.set(1, 7, 'X');
    reg('columbus_lounge', simpleDef('Columbus House: Lounge', l, COL, {
      ambient: 'hum', spawn: [7, 8], tint: '#3a2a1a', tintAlpha: 0.12,
      objects: [
        { id: 'lounge_tv', at: [9, 1], prop: 'gx_bigtv', solid: false, examine: 'The lounge TV. EduTV, all day.' },
        { id: 'toys', at: [10, 7], prop: 'gx_bear', examine: 'Tattered toys. A bear with one eye, a doll with no hair.' },
        { id: 'toy_box', at: [1, 7], examine: 'A toy box. Everything in it is broken in a different way.' },
        { id: 'closet_door', at: [5, 1], examine: 'The closet under the stairs. It smells of urine from here.' },
        cam('cam_1', [12, 2])
      ],
      exits: [iExit('to_columbus_dorm', [2, 1], [2, 1], 'columbus_dorm', [8, 10], 'up'),
        iExit('to_columbus_closet', [5, 1], [1, 1], 'columbus_closet', [1, 2], 'up'),
        iExit('to_columbus_office', [13, 5], [1, 1], 'columbus_office', [1, 3], 'right'),
        iExit('to_columbus_yard', [7, 9], [1, 1], 'columbus_yard', [9, 12], 'down')],
      spawns: { from_columbus_dorm: [3, 2], from_columbus_closet: [5, 2], from_columbus_office: [12, 5], from_columbus_yard: [7, 8] },
      marks: { couch: [9, 4], toys: [10, 6], staff: [7, 4], stairs: [3, 2] }
    }));

    var k = new Grid(4, 4, '#');
    k.rect(1, 1, 2, 2, 'o').set(1, 3, 'D');
    reg('columbus_closet', simpleDef('The Closet', k, COL, {
      ambient: 'drone', spawn: [1, 2], dark: 0.88, playerLight: 18, lights: [{ at: [1, 3], r: 14 }],
      objects: [{ id: 'closet_bucket', at: [2, 1], prop: 'bucket', examine: 'A bucket. The smell is worse down here.' }],
      exits: [iExit('to_columbus_lounge', [1, 3], [1, 1], 'columbus_lounge', [5, 2], 'down')],
      spawns: { from_columbus_lounge: [1, 2] }, marks: { inside: [1, 1] }
    }));

    var o = new Grid(8, 6, 'i');
    o.rect(0, 0, 8, 1, '#').rect(0, 5, 8, 1, '#').rect(0, 0, 1, 6, '#').rect(7, 0, 1, 6, '#');
    o.rect(3, 2, 3, 1, 'd').set(1, 1, 'l').set(6, 1, 'k').set(0, 3, 'D');
    o.set(6, 1, 'P');
    reg('columbus_office', simpleDef('Columbus House: Director\'s Office', o, merge(COL, { 'k': 'shelf' }), {
      ambient: 'hum', spawn: [1, 3],
      objects: [
        { id: 'house_phone', at: [4, 2], prop: 'gx_phone', examine: 'The house phone. The only line out of Columbus.' },
        { id: 'files', at: [1, 1], examine: 'A filing cabinet. Every child in this house is a folder.' }
      ],
      exits: [iExit('to_columbus_lounge', [0, 3], [1, 1], 'columbus_lounge', [12, 5], 'left')],
      spawns: { from_columbus_lounge: [1, 3] }, marks: { phone: [4, 3], director: [4, 1] }
    }));

    var y = new Grid(20, 14, '"');
    y.rect(0, 0, 20, 1, 'w').rect(0, 1, 20, 1, 'f').rect(0, 1, 1, 12, 'f').rect(19, 1, 1, 12, 'f').rect(0, 13, 20, 1, '#');
    y.set(14, 1, 'x').set(14, 0, 'x').set(9, 13, 'D').rect(9, 9, 1, 4, 'x').rect(10, 9, 3, 1, 'x');
    reg('columbus_yard', simpleDef('Columbus House: Yard', y, merge(COL, { 'f': 'gx_fence', 'w': 'gx_woods' }), {
      ambient: 'drone', spawn: [9, 12], tint: '#1a2a3a', tintAlpha: 0.15,
      objects: [
        { id: 'oak', at: [5, 6], prop: 'gx_oak', examine: 'The oak. Luna\'s reading tree. The bark is worn smooth where she leans.' },
        { id: 'fence_gap', at: [14, 1], examine: 'A gap in the back fence. Beyond it, the woods.' }
      ],
      exits: [iExit('to_columbus_lounge', [9, 13], [1, 1], 'columbus_lounge', [7, 8], 'down'),
        xExit('to_woods', [14, 0], [1, 1], 'woods', 'from_columbus_yard', 'up')],
      spawns: { from_columbus_lounge: [9, 12], from_woods: [14, 2] },
      marks: { oak: [5, 7], fence_gap: [14, 1], fence: [9, 2], back_door: [9, 12] }
    }));
  })();

  /* ---------------- luna_apartment (ch01, ch16 memory) ---------------- */
  (function () {
    var a = new Grid(10, 8, 'o');
    a.rect(0, 0, 10, 1, '#').rect(0, 7, 10, 1, '#').rect(0, 0, 1, 8, '#').rect(9, 0, 1, 8, '#');
    a.set(7, 0, 'W').set(7, 7, 'D');
    a.rect(1, 3, 1, 2, 'h').set(3, 1, 'O').set(4, 1, 'K').set(5, 1, 'F');
    a.rect(6, 1, 1, 2, 'c').set(8, 2, 'b');
    reg('luna_apartment', simpleDef('Apartment 3C', a, { '#': 'wall', 'o': 'gx_apt_floor', 'c': 'gx_curtain' }, {
      ambient: 'hum', spawn: [7, 6], dark: 0.45, playerLight: 44, tint: '#1a2a4a', tintAlpha: 0.12,
      lights: [{ at: [7, 1], r: 48 }, { at: [5, 2], r: 30 }],
      objects: [
        { id: 'fridge', at: [5, 1], examine: 'The fridge. Inside: one slice of bologna, going grey. The door is where the notes go.' },
        { id: 'stove', at: [3, 1], examine: 'Two burners. One works.' },
        { id: 'peanut_butter', at: [4, 1], prop: 'cup', solid: false, examine: 'The peanut-butter jar, scraped clean with a spoon.' },
        { id: 'owl_clock', at: [2, 0], prop: 'gx_owlclock', solid: false, examine: '"HOPE YOU HAVE A HOOT OF A GOOD DAY." 3:00 a.m.' },
        { id: 'couch', at: [1, 3], examine: 'The couch. Lumpy. Luna\'s bed.' },
        { id: 'curtain', at: [6, 1], examine: 'A curtain on a wire, so Waverly has a room of her own.' },
        { id: 'waverly_bed', at: [8, 2], examine: 'Waverly\'s bed corner.' },
        { id: 'bartholomew', at: [8, 1], prop: 'gx_bear', solid: false, examine: 'Bartholomew the bear, guarding the pillow.' },
        { id: 'books', at: [7, 1], prop: 'gx_books', solid: false, examine: 'Nine library books. None of them were ever returned.' }
      ],
      exits: [xExit('to_street', [7, 7], [1, 1], 'street', 'from_luna_apartment', 'down')],
      spawns: { from_street: [7, 6] },
      marks: { couch: [2, 3], beside_couch: [2, 4], waverly_bed: [7, 2], waverly_corner: [7, 3], fridge: [5, 2], kitchen: [4, 2], door: [7, 6], window: [7, 1] }
    }));
  })();

  G.shared.data.gx = { Grid: Grid, xExit: xExit, iExit: iExit, reg: reg, cam: cam, people: people };
})();
