/* =========================================================================
 * ch08 "The Night Door"
 *
 * Sat 20 Jan 2084: Carol's execution, told from inside Carol's head (3rd person),
 * with the "chin up" dignity minigame (cosmetic) and the injection told through
 * memory. Trader's shaken one-on-one in the Screening Room (on camera).
 * Sun 21 Jan, 02:14: the bedroom door clicks open. The game's first real stealth
 * level, free roam on the shared House maps:
 *   - camera dots: STEADY red = recording, reviewed later by the AI. Walk like you
 *     belong; creeping or loitering in its cone gets you flagged. FLASHING red =
 *     someone is watching live; any time in its cone dispatches a mosquito drone
 *     that arrives 4 s late (be in cover / a blind spot / another room by then).
 *   - stairs are audio-only: walk at full speed there and the sensor hears you.
 *     Hold SHIFT to creep (same key as the generic stealth minigame).
 *   - people (Trader, Ginerva, the Hippo True Believer) see you in their cone.
 *   - garden floodlights are on motion sensors: creep through their light.
 *   - hiding: the walk-in pantry (canon), under the dining table, the supply closet.
 *   Caught = Ginerva/Hippo marches you back and you retry from the checkpoint.
 *   Never gameOver.
 * Pantry eavesdrop (breath-hold minigame), Kessie and Elephant at the fence
 * (bluff), the keypad (eyes shut), the Green Room confession, the run, Annette,
 * and the drugged tea (hallucination: screen warps, answers slip out of Luna's
 * control). Mon 22 Jan: Luna wakes unsure what was real.
 *
 * CROSS-CHAPTER FLAGS (canon/CHAPTERS.md §2)
 *   reads : m_audience (through api.approval()), m_kessie (>=45: Kessie confesses
 *           unprompted, otherwise Luna has to threaten her), m_annette, m_trader_insight
 *   sets  : m_trader_insight +1 (overheard "She looks so much like her"; on every
 *           path), m_kessie (+10 promise / -10 "think about it", -5 threat,
 *           +2 eyes shut), m_annette (+5 the hug), m_audience (one-on-one on camera),
 *           f_kessie_secret_told = true (scripted), n_tea_resisted (0..3)
 * LOCAL FLAGS: ch08_* only.
 *
 * MAPS are keyed by the SHARED ids (canon/SHARED_STATUS.md) so exits link.
 * house_screening_room and house_annette_room fall back to local placeholders
 * (G.shared.has()) until the shared versions land; the ids are in R below.
 * ========================================================================= */
(function () {
  'use strict';

  var T = 16;

  /* ---------------------------------------------------------------------
   * Names, in one place
   * ------------------------------------------------------------------- */
  var R = {
    amph: 'execution_amphitheatre',
    screening: 'house_screening_room',
    luna: 'house_luna_room',
    hall: 'house_bedroom_hall',
    foyer: 'house_foyer',
    red: 'house_red_hall',
    closet: 'house_supply_closet',
    dining: 'house_dining',
    kitchen: 'house_kitchen',
    grounds: 'house_grounds',
    green: 'house_green_room',
    annette: 'house_annette_room'
  };

  function hasShared(id) { return !!(G.shared && G.shared.has && G.shared.has(id)); }
  /** Named point of a shared map (spawn or mark), else the fallback. */
  function at(map, name, fb) {
    var p = hasShared(map) && G.shared.at ? G.shared.at(map, name) : null;
    return p || fb;
  }
  function extra(kind, seed, over) {
    var s = (G.shared && G.shared.extra) ? G.shared.extra(kind, seed) : G.Sprites.randomSpec(seed);
    s = G.cloneDef(s);
    if (over) Object.keys(over).forEach(function (k) { s[k] = over[k]; });
    return s;
  }
  function px(g, x, y, w, h, c) { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), w, h); }

  /* ---------------- maps: shared copy, or placeholder ---------------- */
  function nearestFree(solid, p) {
    if (!solid(p[0], p[1])) return p;
    for (var r = 1; r < 10; r++) for (var dy = -r; dy <= r; dy++) for (var dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
      if (!solid(p[0] + dx, p[1] + dy)) return [p[0] + dx, p[1] + dy];
    }
    return p;
  }
  /**
   * ext: extension for G.shared.map (npcs/objects/zones/lights appended; remove; patch;
   * other keys override) + lockExits: {exitId: {locked, lockedText}}.
   * snap: true = my entity coordinates were authored for the placeholder, so move them
   * onto the nearest floor tile when the shared map is used instead.
   */
  function useMap(id, fb, ext, snap) {
    ext = ext || {};
    var lock = ext.lockExits || {};
    var e = {};
    Object.keys(ext).forEach(function (k) { if (k !== 'lockExits') e[k] = ext[k]; });
    if (hasShared(id)) {
      var base = G.shared.maps[id];
      if (snap) {
        var room = null;
        try { room = G.Map.build(base); } catch (er) { room = null; }
        var solid = function (x, y) { return room ? G.Map.solidAt(room, x, y) : false; };
        ['npcs', 'objects', 'zones'].forEach(function (k) {
          if (!e[k]) return;
          e[k] = e[k].filter(function (o) { return !o.placeholderOnly; }).map(function (o) {
            var c = G.cloneDef(o); if (c.at && !c.wall) c.at = nearestFree(solid, c.at); return c;
          });
        });
      }
      var ids = Object.keys(lock).filter(function (x) { return (base.exits || []).some(function (q) { return q.id === x; }); });
      if (ids.length) {
        e.remove = (e.remove || []).concat(ids);
        e.exits = (e.exits || []).concat(ids.map(function (x) {
          var ex = G.shared.exit(id, x, { locked: lock[x].locked, lockedText: lock[x].lockedText });
          if (lock[x].toAt) { ex.toAt = lock[x].toAt; delete ex.run; }  // upstairs exits resolve toAt in a run() hook
          if (!ex.toAt && ex.to && G.shared.at) { var sp = G.shared.at(ex.to, 'from_' + String(id).replace(/^house_/, '')); if (sp) ex.toAt = sp; }
          return ex;
        }));
      }
      return G.shared.map(id, e);
    }
    var m = G.cloneDef(fb || { name: id, tiles: ['#####', '#.@.#', '#####'], npcs: [], objects: [], zones: [], exits: [] });
    Object.keys(e).forEach(function (k) {
      if (k === 'remove' || k === 'patch') return;
      if (['npcs', 'objects', 'zones', 'lights', 'exits'].indexOf(k) >= 0) m[k] = (m[k] || []).concat(G.cloneDef(e[k]));
      else m[k] = e[k];
    });
    (m.exits || []).forEach(function (x) { if (lock[x.id]) { x.locked = lock[x.id].locked; x.lockedText = lock[x.id].lockedText; } });
    return m;
  }
  var ALWAYS = function () { return true; };

  /* ---------------------------------------------------------------------
   * Props (namespaced ch08:*)
   * ------------------------------------------------------------------- */
  var PROPS = {
    splat: function (g, x, y) { px(g, x + 3, y + 10, 10, 4, '#a81c14'); px(g, x + 1, y + 12, 3, 2, '#c8241c'); px(g, x + 12, y + 9, 3, 2, '#c8241c'); px(g, x + 6, y + 9, 3, 2, '#e05040'); },
    tomatoes: function (g, x, y) { px(g, x + 2, y + 8, 12, 6, '#6a4a2a'); for (var i = 0; i < 4; i++) { px(g, x + 3 + i * 3, y + 6, 3, 3, '#c8241c'); px(g, x + 4 + i * 3, y + 5, 1, 1, '#3a7a20'); } },
    crochet: function (g, x, y, t, o) {
      var c = (o && o.def && o.def.color) || '#c890d8';
      px(g, x + 4, y + 8, 8, 6, c); px(g, x + 5, y + 5, 6, 4, c); px(g, x + 5, y + 4, 2, 2, c); px(g, x + 9, y + 4, 2, 2, c);
      px(g, x + 6, y + 6, 1, 1, '#222'); px(g, x + 9, y + 6, 1, 1, '#222');
      for (var i = 0; i < 4; i++) px(g, x + 4 + i * 2, y + 10, 1, 1, 'rgba(255,255,255,0.35)');
    },
    painting: function (g, x, y, t, o) {
      var pony = o && o.def && o.def.kind === 'pony';
      px(g, x + 1, y + 2, 14, 11, '#6a4a20'); px(g, x + 2, y + 3, 12, 9, pony ? '#9ac0e0' : '#3a4050');
      if (pony) { px(g, x + 3, y + 9, 10, 3, '#6a9a4a'); px(g, x + 5, y + 6, 6, 3, '#c89060'); px(g, x + 10, y + 5, 2, 2, '#c89060'); px(g, x + 6, y + 9, 1, 2, '#c89060'); px(g, x + 9, y + 9, 1, 2, '#c89060'); }
      else { px(g, x + 3, y + 4, 10, 3, '#1e2230'); px(g, x + 7, y + 6, 1, 3, '#f0f0a0'); px(g, x + 8, y + 8, 1, 2, '#f0f0a0'); px(g, x + 2, y + 10, 12, 2, '#2a3a4a'); }
    },
    rocker: function (g, x, y) { px(g, x + 4, y + 2, 8, 9, '#7a4a2a'); px(g, x + 5, y + 3, 6, 6, '#c890d8'); px(g, x + 3, y + 12, 10, 2, '#5a3018'); px(g, x + 4, y + 10, 1, 3, '#5a3018'); px(g, x + 11, y + 10, 1, 3, '#5a3018'); },
    yarn: function (g, x, y) { px(g, x + 3, y + 8, 10, 6, '#8a6a3a'); px(g, x + 4, y + 6, 4, 4, '#b8a0e0'); px(g, x + 8, y + 7, 3, 3, '#9a80c8'); px(g, x + 6, y + 3, 1, 7, '#ccc'); px(g, x + 9, y + 4, 1, 6, '#ccc'); },
    goldmask: function (g, x, y) { px(g, x + 4, y + 9, 8, 5, '#c9a24a'); px(g, x + 3, y + 11, 2, 3, '#c9a24a'); px(g, x + 11, y + 11, 2, 3, '#c9a24a'); px(g, x + 7, y + 13, 2, 3, '#b8912a'); px(g, x + 5, y + 10, 1, 1, '#000'); px(g, x + 10, y + 10, 1, 1, '#000'); },
    screen: function (g, x, y, t) { px(g, x, y + 2, 16, 12, '#0a0a10'); px(g, x + 1, y + 3, 14, 10, Math.sin(t * 5) > 0 ? '#2a1a1a' : '#3a2222'); px(g, x + 5, y + 6, 6, 4, '#c8241c'); }
  };

  /* ---------------------------------------------------------------------
   * Placeholder maps (until the shared versions land). §3 sizes.
   * ------------------------------------------------------------------- */
  var screeningFb = {
    name: 'Screening Room',
    tiles: ['#EEEEEE#', '#......#', '#cccccc#', '#......#', '#cccccc#', '#..D...#'.replace('D', '.'), '###D####'],
    spawn: [3, 5], ambient: 'hum', dark: 0.45, playerLight: 30,
    lights: [{ at: [3, 0], r: 70, flicker: true }],
    npcs: [], zones: [],
    objects: [{ id: 'ch08_sr_cam', at: [6, 1], prop: 'camera', placeholderOnly: true }],
    exits: [{ id: 'to_bedroom_hall', at: [3, 6], to: R.hall, toAt: [30, 1], facing: 'down' }]
  };
  var annetteFb = {
    name: 'Annette\'s Room (No. 1)',
    tiles: ['###W####', '#,,,,,b#', '#,,,,,b#', '#,,,,,,#', '#,,RR,,#', '#,,RR,,#', '#,,,,,,#', '###D####'],
    spawn: [3, 6], ambient: 'hum', dark: 0.35, playerLight: 40, tint: '#a06a30', tintAlpha: 0.12,
    lights: [{ at: [2, 2], r: 50 }],
    npcs: [], zones: [], objects: [],
    exits: [{ id: 'to_bedroom_hall', at: [3, 7], to: R.hall, toAt: [9, 1], facing: 'down' }]
  };
  var amphFb = { name: 'Execution Amphitheatre', tiles: ['################', '#ssssssssssssss#', '#ssssssssssssss#', '#______________#', '#nnnnnn__nnnnnn#', '#______________#', '################'], spawn: [7, 5], ambient: 'crowd', npcs: [], objects: [], zones: [], exits: [] };

  /* ---------------------------------------------------------------------
   * STEALTH: free-roam detection layered over the real rooms (UI overlay).
   * ------------------------------------------------------------------- */
  var CAM_MODE = {          // per room: cam id -> 'loop' | 'rec' | 'live' | 'off'
    house_bedroom_hall: { '*': 'loop' },          // Elephant's loop (steady dots, harmless)
    house_luna_room: { smoke_detector: 'loop', bath_cam: 'off' },
    house_foyer: { foyer_stagecam: 'live' },
    house_red_hall: { hall_cam1: 'rec', hall_cam2: 'live', hall_cam3: 'rec' },
    house_kitchen: { kitchen_cam: 'off' },          // canon: not active 23:00-06:00
    house_dining: { dining_cam: 'rec' },
    house_grounds: { '*': 'loop' }                 // Elephant loops the garden cams on Kessie's nights
  };
  var FLOODS = { house_grounds: [[6, 22], [53, 22]] };
  var D2R = Math.PI / 180;

  var SN = { on: false };
  function snReset() {
    SN.alert = 0; SN.susp = 0; SN.noise = 0; SN.gAlert = 0; SN.drone = null;
    SN.caught = null; SN.hidden = false; SN.msg = null; SN.msgT = 0;
  }
  function snMsg(text, secs) { SN.msg = text; SN.msgT = secs || 2.5; }
  function snStart(api, opts) {
    snStop();
    SN.on = true; SN.api = api; SN.t = 0; SN.room = null; SN.guards = []; SN.tick = null; SN.hint = null; SN.hintT = 0;
    snReset();
    SN.ov = { input: false, update: snUpdate, draw: snDraw, ch08: true };
    G.UI.push(SN.ov);
    if (opts && opts.hint) { SN.hint = opts.hint; SN.hintT = opts.hintT || 9; }
  }
  function snStop() {
    if (SN.ov) G.UI.remove(SN.ov);
    SN.ov = null; SN.on = false; SN.tick = null;
    if (G.World && G.World.player) { G.World.player.speed = 72; G.World.player.visible = true; }
  }
  function snHint(text, secs) { SN.hint = text; SN.hintT = secs || 8; }
  function creeping() { var k = G.Input.keysHeld; return !!(k.ShiftLeft || k.ShiftRight); }
  function camsOf(def, rid) {
    var modes = CAM_MODE[rid] || {};
    return (def.cameras || []).map(function (c) {
      var mode = modes[c.id] || modes['*'] || (c.live ? 'live' : 'rec');
      var base = (c.angle == null ? 90 : c.angle) * D2R;
      var ox = c.at[0] * T + 8, oy = c.at[1] * T + 8;
      if (G.Map.solidAt(G.World.room, c.at[0], c.at[1])) { ox += Math.cos(base) * 10; oy += Math.sin(base) * 10; }
      return { id: c.id, mode: mode, x: ox, y: oy, base: base, sweep: (c.sweep == null ? 60 : c.sweep) * D2R, range: c.range || 72, fov: (c.fov || 45) * D2R, speed: c.speed || 0.6, tx: c.at[0], ty: c.at[1] };
    });
  }
  function solidPx(x, y) { return G.Map.solidAt(G.World.room, Math.floor(x / T), Math.floor(y / T)); }
  function los(ax, ay, bx, by) {
    var d = Math.hypot(bx - ax, by - ay), n = Math.ceil(d / 4);
    var at0 = Math.floor(ax / T) + ',' + Math.floor(ay / T);
    for (var i = 1; i < n; i++) {
      var x = ax + (bx - ax) * i / n, y = ay + (by - ay) * i / n;
      if (Math.floor(x / T) + ',' + Math.floor(y / T) === at0) continue;
      if (solidPx(x, y)) return false;
    }
    return true;
  }
  function sees(s, p) {
    var dx = p.x - s.x, dy = p.y - s.y, d = Math.hypot(dx, dy);
    if (d > s.range) return false;
    var a = Math.atan2(dy, dx), diff = Math.atan2(Math.sin(a - s.ang), Math.cos(a - s.ang));
    if (Math.abs(diff) > s.fov / 2) return false;
    return los(s.x, s.y, p.x, p.y);
  }
  function blindAt(def, pt) {
    var res = null;
    (def.blindSpots || []).forEach(function (b) {
      if (pt.x >= b.at[0] && pt.y >= b.at[1] && pt.x < b.at[0] + (b.w || 1) && pt.y < b.at[1] + (b.h || 1)) {
        var audio = /audio|stair/i.test((b.note || '') + b.id);
        if (!res || !audio) res = audio ? 'audio' : 'full';
      }
    });
    return res;
  }
  function dirAng(d) { return { right: 0, down: 90, left: 180, up: 270 }[d] * D2R; }
  function snCovered() {
    var W = G.World, pt = W.playerTile();
    return SN.hidden || blindAt(W.room.def, pt) === 'full';
  }
  function snDispatch(why) {
    if (SN.drone) return;
    SN.drone = { t: 4, room: SN.room, why: why };
    G.log('[ch08 stealth] drone dispatched: ' + why);
    snMsg(why, 3);
    SN.alert = 0; SN.susp = 0; SN.noise = 0;
    G.Audio.play('alarm'); G.UI.flash('#e8323c', 250);
  }
  function snHide(where, at2) {
    var W = G.World;
    SN.hidden = where; SN.hideBack = W.playerTile();
    W.player.visible = false;
    if (at2) W.placePlayer(at2[0], at2[1]);
    G.Audio.play('step');
  }
  function snUnhide() {
    var W = G.World;
    if (SN.hideBack) W.placePlayer(SN.hideBack.x, SN.hideBack.y);
    SN.hidden = false; W.player.visible = true; W.lastTile = W.playerTile(); W.arrivalTile = W.lastTile;
  }

  function snUpdate(dt) {
    if (!SN.on) return;
    var W = G.World;
    if (!W.active || !W.room || !SN.api) return;
    var rid = SN.api.room();
    SN.t += dt;
    if (SN.msgT > 0) SN.msgT -= dt;
    if (SN.hintT > 0) SN.hintT -= dt;
    if (rid !== SN.room) {
      var prev = SN.room; SN.room = rid;
      SN.alert = 0; SN.susp = 0; SN.noise = 0; SN.gAlert = 0;
      if (SN.drone && SN.drone.room !== rid) { SN.drone = null; if (prev) snMsg('You slipped the drone.'); }
      if (SN.hidden) { SN.hidden = false; W.player.visible = true; }
      if (rid === R.foyer && !SN.foyerHinted && W.room.grid[W.playerTile().y] && /stair/.test(W.room.grid[W.playerTile().y][W.playerTile().x])) {
        SN.foyerHinted = true;
        snHint(['THE MAIN STAIR', 'Audio sensors only. Hold SHIFT and creep down.', 'The stagecam below is FLASHING: live.'], 9);
      }
    }
    SN.cams = camsOf(W.room.def, rid);
    SN.cams.forEach(function (c) { c.ang = c.base + Math.sin(SN.t * c.speed) * c.sweep / 2; });
    var busy = G.Script.busy() || G.UI.blocking();
    var creep = creeping();
    W.player.speed = SN.hidden ? 0 : (creep ? 34 : 72);
    if (busy || SN.caught || G.auto) return;
    if (SN.tick) SN.tick(dt, rid);
    if (SN.caught) return;
    if (SN.hidden) {
      var d = G.Input.dir();
      if (d.x || d.y) snUnhide();
      else return droneTick(dt);
    }
    var pt = W.playerTile(), p = { x: W.player.x, y: W.player.y - 6 };
    var blind = blindAt(W.room.def, pt);
    var moving = W.player.moving;
    var liveSeen = false, recSeen = false;
    if (!blind) SN.cams.forEach(function (c) {
      if (c.mode !== 'rec' && c.mode !== 'live') return;
      if (!sees(c, p)) return;
      if (c.mode === 'live') liveSeen = true; else recSeen = true;
    });
    SN.liveSeen = liveSeen; SN.recSeen = recSeen;
    if (liveSeen) SN.alert += dt * 1.5; else SN.alert -= dt * 0.6;
    if (recSeen && moving && creep) SN.susp += dt * 0.9;
    else if (recSeen && !moving) SN.susp += dt * 0.28;
    else SN.susp -= dt * 0.45;
    var tname = (W.room.grid[pt.y] && W.room.grid[pt.y][pt.x]) || '';
    SN.onStair = /stair/.test(tname);
    if (SN.onStair && moving && !creep) SN.noise += dt * 2.2; else SN.noise -= dt * 0.5;
    (FLOODS[rid] || []).forEach(function (f) {
      var fx = f[0] * T + 8, fy = f[1] * T + 8;
      if (Math.hypot(p.x - fx, p.y - fy) < 42 && moving && !creep) SN.alert += dt * 2.4;
    });
    var gSeen = false;
    SN.guards.forEach(function (id) {
      var n = W.npc(id);
      if (!n || !n.visible) return;
      if (sees({ x: n.x, y: n.y - 8, ang: dirAng(n.dir), fov: 80 * D2R, range: creep ? 48 : 66 }, p)) gSeen = id;
    });
    if (gSeen) SN.gAlert += dt * 2.2; else SN.gAlert -= dt;
    if (SN.gAlert >= 1) { SN.caught = 'guard:' + gSeen; G.log('[ch08 stealth] seen by ' + gSeen); G.Audio.play('alarm'); return; }
    if (SN.susp >= 1) snDispatch('The AI flagged you sneaking.');
    if (SN.noise >= 1) snDispatch('The stair sensor heard you.');
    if (SN.alert >= 1) snDispatch(liveSeen ? 'Someone is watching that camera live.' : 'The floodlight flared.');
    ['alert', 'susp', 'noise', 'gAlert'].forEach(function (k) { SN[k] = Math.max(0, Math.min(1, SN[k])); });
    droneTick(dt);
  }
  function droneTick(dt) {
    if (!SN.drone) return;
    SN.drone.t -= dt;
    if (SN.drone.t <= 0) {
      if (snCovered()) { SN.drone = null; snMsg('The drone hums past. It lost you.'); }
      else { SN.drone = null; SN.caught = 'drone'; G.Audio.play('alarm'); }
    }
  }

  function snDraw() {
    if (!SN.on || G.auto) return;
    var W = G.World;
    if (!W.active || !W.room || !SN.cams) return;
    var R2 = G.Render, ctx = R2.ctx, P = R2.PAL;
    var cx = Math.round(W.cam.x), cy = Math.round(W.cam.y);
    var busy = G.Script.busy() || G.UI.blocking();
    function cone(s, col) {
      ctx.save(); ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(s.x - cx, s.y - cy);
      var steps = 16;
      for (var i = 0; i <= steps; i++) {
        var a = s.ang - s.fov / 2 + s.fov * i / steps, r = s.range;
        for (var k = 6; k <= s.range; k += 4) { if (solidPx(s.x + Math.cos(a) * k, s.y + Math.sin(a) * k)) { r = k; break; } }
        ctx.lineTo(s.x + Math.cos(a) * r - cx, s.y + Math.sin(a) * r - cy);
      }
      ctx.closePath(); ctx.fill(); ctx.restore();
    }
    var pulse = 0.5 + 0.5 * Math.sin(SN.t * 8);
    SN.cams.forEach(function (c) {
      if (c.mode === 'off') return;
      if (c.mode === 'live') cone(c, 'rgba(255,40,60,' + (0.16 + 0.1 * pulse) + ')');
      else cone(c, 'rgba(232,50,60,0.09)');
      var on = c.mode !== 'live' || pulse > 0.5;
      ctx.save(); ctx.fillStyle = on ? '#ff3040' : '#501018'; ctx.beginPath(); ctx.arc(c.x - cx, c.y - cy, 2, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    });
    SN.guards.forEach(function (id) {
      var n = W.npc(id);
      if (!n || !n.visible) return;
      cone({ x: n.x, y: n.y - 8, ang: dirAng(n.dir), fov: 80 * D2R, range: creeping() ? 48 : 66 }, 'rgba(255,214,120,0.16)');
    });
    (FLOODS[SN.room] || []).forEach(function (f) {
      ctx.save(); ctx.strokeStyle = 'rgba(255,240,170,0.35)'; ctx.setLineDash([3, 3]); ctx.beginPath();
      ctx.arc(f[0] * T + 8 - cx, f[1] * T + 8 - cy, 42, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    });
    if (SN.drone) {
      var k = Math.max(0, SN.drone.t / 4), dxp = W.player.x - cx + Math.sin(SN.t * 13) * 3, dyp = W.player.y - cy - 14 - k * 120;
      ctx.save(); ctx.fillStyle = '#111'; ctx.fillRect(dxp - 2, dyp - 1, 4, 3);
      ctx.fillStyle = 'rgba(200,200,220,' + (0.4 + 0.4 * pulse) + ')'; ctx.fillRect(dxp - 5, dyp - 2, 3, 1); ctx.fillRect(dxp + 2, dyp - 2, 3, 1);
      ctx.fillStyle = '#ff3040'; ctx.fillRect(dxp, dyp, 1, 1); ctx.restore();
    }
    if (busy) return;
    // status panel
    var y = 26, bars = [];
    if (SN.susp > 0.02) bars.push(['AI FLAG', SN.susp, P.amber]);
    if (SN.alert > 0.02) bars.push(['LIVE EYE', SN.alert, P.red]);
    if (SN.noise > 0.02) bars.push(['NOISE', SN.noise, '#c9b8ff']);
    if (SN.gAlert > 0.02) bars.push(['SEEN', SN.gAlert, '#ffd27a']);
    bars.forEach(function (b) {
      R2.rect(G.W / 2 - 50, y, 100, 9, '#000', 0.55);
      R2.rect(G.W / 2 - 49, y + 1, 98 * b[1], 7, b[2], 0.85);
      R2.text(b[0], G.W / 2, y + 1, { size: 6, align: 'center', color: '#fff' });
      y += 11;
    });
    if (SN.drone) {
      R2.rect(G.W / 2 - 92, y, 184, 12, '#2a0004', 0.8);
      R2.text('MOSQUITO DRONE INBOUND  ' + Math.max(0, SN.drone.t).toFixed(1) + 's  -  GET TO COVER', G.W / 2, y + 3, { size: 7, align: 'center', color: pulse > 0.5 ? '#ff6070' : '#fff' });
      y += 14;
    }
    if (SN.hidden) R2.text('HIDDEN  -  press a direction to come out', G.W / 2, G.H - 64, { size: 7, align: 'center', color: P.teal });
    if (SN.msgT > 0 && SN.msg) R2.text(SN.msg, G.W / 2, G.H - 52, { size: 8, align: 'center', color: P.text });
    if (SN.hintT > 0 && SN.hint) {
      var lines = [].concat(SN.hint), h = 5 + lines.length * 8, bw = 168;
      R2.rect(G.W - bw - 4, 22, bw, h, '#000', 0.6);
      lines.forEach(function (l, i) { R2.text(l, G.W - bw, 25 + i * 8, { size: 5.5, color: i === 0 ? P.amber : P.text }); });
    }
    var cr = creeping();
    R2.text(cr ? 'CREEPING' : '[SHIFT] creep', G.W - 8, G.H - 26, { size: 6, align: 'right', color: cr ? P.teal : P.faint });
    if (SN.onStair) R2.text('STAIRS: audio sensors', G.W - 8, G.H - 34, { size: 6, align: 'right', color: '#c9b8ff' });
  }

  /* ---------------------------------------------------------------------
   * Minigames (all with autoSolve)
   * ------------------------------------------------------------------- */
  var MINIGAMES = {};

  /* chin: Carol keeps her chin up while the tomatoes fly (dignity is cosmetic) */
  MINIGAMES.chin = {
    autoSolve: function () { return { success: true, dignity: 62 }; },
    start: function (ctx) {
      var R2 = ctx.R, P = ctx.PAL, DUR = 13;
      var dig = 0.8, sum = 0, n = 0, toms = [], splats = [], next = 0.6, shake = 0, jeer = [], hits = 0;
      var WORDS = ['SHAME!', 'HARLOT!', 'WHORE!', 'SINNER!', 'LOOK AT HER!', 'BITCH!', 'SHAME!'];
      var PX = ctx.W / 2 - 60, PY = 36, S = 3;
      return new Promise(function (resolve) {
        var done = false;
        ctx.loop(function (dt) {
          if (done) return;
          var t = ctx.t;
          if (ctx.input.pressed('ok') || ctx.input.pressed('up')) { dig = Math.min(1, dig + 0.09); }
          dig = Math.max(0, dig - dt * 0.07);
          sum += dig * dt; n += dt;
          next -= dt;
          if (next <= 0 && t < DUR - 1) {
            next = 0.35 + Math.random() * 0.55;
            var tx = PX + 20 + Math.random() * 80, ty = PY + 20 + Math.random() * 80;
            var sx = Math.random() < 0.5 ? -10 : ctx.W + 10;
            toms.push({ sx: sx, sy: ctx.H - 10 - Math.random() * 40, tx: tx, ty: ty, k: 0, sp: 0.9 + Math.random() * 0.5 });
            if (Math.random() < 0.6) jeer.push({ w: WORDS[Math.floor(Math.random() * WORDS.length)], x: 30 + Math.random() * (ctx.W - 60), y: 150 + Math.random() * 40, t: 0 });
          }
          toms.forEach(function (o) {
            o.k += dt * o.sp;
            if (o.k >= 1 && !o.hit) {
              o.hit = true; hits++;
              splats.push({ x: o.tx - PX, y: o.ty - PY, r: 5 + Math.random() * 7 });
              dig = Math.max(0, dig - 0.15); shake = 0.25; ctx.sound('hit');
            }
          });
          toms = toms.filter(function (o) { return !o.hit; });
          jeer.forEach(function (j) { j.t += dt; }); jeer = jeer.filter(function (j) { return j.t < 1.2; });
          shake = Math.max(0, shake - dt);
          if (t >= DUR) { done = true; var d = Math.round(100 * sum / Math.max(0.01, n)); setTimeout(function () { resolve({ success: d >= 40, dignity: d, hits: hits }); }, 400); }
        }, function (t) {
          var c = R2.ctx;
          R2.rect(0, 0, ctx.W, ctx.H, '#140608');
          for (var i = 0; i < 40; i++) { var hx = (i * 37) % ctx.W, hy = 150 + (i * 13) % 60; R2.rect(hx, hy, 6, 6, '#2a1012'); }
          var sx = shake > 0 ? (Math.random() - 0.5) * 6 : 0;
          var sag = (1 - dig) * 16;
          // gurney frame
          R2.rect(PX - 8 + sx, PY - 8, 136, 150, '#b8c0c8'); R2.rect(PX - 4 + sx, PY - 4, 128, 142, '#e8eef0');
          R2.rect(PX - 8 + sx, PY + 98, 136, 6, '#3a3a40');
          var mood = dig > 0.55 ? 'angry' : dig > 0.25 ? 'sad' : 'cry';
          R2.img(ctx.portrait('carol', mood), PX + sx, PY + sag, S);
          // gag
          R2.rect(PX + 6 + sx, PY + sag + 76, 108, 10, '#1a1a1e'); R2.rect(PX + 50 + sx, PY + sag + 74, 20, 14, '#2a2a30');
          // pulp
          c.save(); c.beginPath(); c.rect(PX + sx, PY + sag, 120, 120); c.clip();
          splats.forEach(function (s) {
            c.fillStyle = 'rgba(176,28,22,0.85)'; c.beginPath(); c.arc(PX + sx + s.x, PY + sag + s.y, s.r, 0, Math.PI * 2); c.fill();
            c.fillStyle = 'rgba(232,90,70,0.8)'; c.beginPath(); c.arc(PX + sx + s.x - 2, PY + sag + s.y - 2, s.r * 0.35, 0, Math.PI * 2); c.fill();
          });
          c.restore();
          if (sag > 4) R2.rect(PX + sx, PY, 120, sag, '#e8eef0');
          // strap
          R2.rect(PX - 8 + sx, PY + 118, 136, 6, '#3a2a1a');
          toms.forEach(function (o) {
            var k = Math.min(1, o.k), x = o.sx + (o.tx - o.sx) * k, y = o.sy + (o.ty - o.sy) * k - Math.sin(k * Math.PI) * 50;
            c.fillStyle = '#c8241c'; c.beginPath(); c.arc(x, y, 4, 0, Math.PI * 2); c.fill(); c.fillStyle = '#3a7a20'; c.fillRect(x - 1, y - 5, 2, 2);
          });
          jeer.forEach(function (j) { R2.text(j.w, j.x, j.y - j.t * 12, { size: 9, font: 'sans', align: 'center', color: '#e8e4d8', alpha: 1 - j.t / 1.2 }); });
          // dignity bar
          R2.rect(ctx.W - 34, 40, 14, 120, '#000', 0.7);
          R2.rect(ctx.W - 32, 42 + 116 * (1 - dig), 10, 116 * dig, dig > 0.4 ? P.gold : P.red);
          R2.text('CHIN', ctx.W - 27, 164, { size: 6, align: 'center', color: P.dim });
          ctx.header('CAROL', 'She can\'t speak. She can still hold her head up.');
          ctx.footer('Tap SPACE / UP to lift your chin');
        });
      });
    }
  };

  /* breath: hold your breath in the pantry (a sip of air at a time) */
  MINIGAMES.breath = {
    autoSolve: function () { return { success: true }; },
    start: function (ctx) {
      var R2 = ctx.R, P = ctx.PAL, DUR = 7.5;
      var pr = 0.15, noise = 0, state = 'play', endT = 0;
      var label = (ctx.params && ctx.params.label) || 'The pantry door';
      return new Promise(function (resolve) {
        ctx.loop(function (dt) {
          if (state !== 'play') { if (ctx.t - endT > 1.1) resolve({ success: state === 'win', gasped: state === 'fail' }); return; }
          var hold = ctx.input.down('ok');
          if (hold) pr += dt * 0.25; else { pr = Math.max(0, pr - dt * 0.55); noise += dt * (pr > 0.05 || ctx.t > 0.4 ? 0.42 : 0); }
          if (pr >= 1 || noise >= 1) { state = 'fail'; endT = ctx.t; ctx.sound('fail'); }
          else if (ctx.t >= DUR) { state = 'win'; endT = ctx.t; ctx.sound('success'); }
          if (Math.floor(ctx.t * 1.2) !== Math.floor((ctx.t - dt) * 1.2)) ctx.sound('heartbeat');
        }, function (t) {
          var k = Math.min(1, ctx.t / DUR), open = Math.sin(Math.min(1, ctx.t / (DUR * 0.85)) * Math.PI);
          R2.rect(0, 0, ctx.W, ctx.H, '#07050a');
          for (var i = 0; i < 9; i++) R2.rect(60, 30 + i * 16, 264, 3, '#1a140e');
          var gx = 186, gw = 4 + open * 46;
          R2.rect(gx - gw / 2, 24, gw, 150, '#e8c890', 0.22 + open * 0.3);
          R2.rect(gx - gw / 2 + 4, 70, Math.max(0, gw - 8) * 0.6, 100, '#100c0a', 0.6 * open);
          var hc = R2.ctx; hc.save(); hc.globalAlpha = 0.6 * open; hc.fillStyle = '#100c0a'; hc.beginPath(); hc.arc(gx - gw / 2 + 4 + Math.max(0, gw - 8) * 0.3, 60, Math.max(1, (gw - 8) * 0.22), 0, Math.PI * 2); hc.fill(); hc.restore();
          for (var s = 0; s < 6; s++) R2.rect(gx - 60, 40 + s * 22, 120, 2, '#f0d8a8', 0.08 + open * 0.08);
          var sh = (Math.random() - 0.5) * pr * 4;
          R2.rect(40 + sh, 150, 70, 10, '#000', 0.6); R2.rect(41 + sh, 151, 68 * pr, 8, pr > 0.8 ? P.red : '#9fb8ff');
          R2.text('LUNGS', 75, 162, { size: 6, align: 'center', color: P.dim });
          R2.rect(274, 150, 70, 10, '#000', 0.6); R2.rect(275, 151, 68 * Math.min(1, noise), 8, P.amber);
          R2.text('BREATH NOISE', 309, 162, { size: 6, align: 'center', color: P.dim });
          if (state === 'fail') R2.text('A gasp escapes you', ctx.W / 2, 96, { size: 14, font: 'serif', style: 'italic', align: 'center', color: P.red });
          if (state === 'win') R2.text('The light narrows. Gone.', ctx.W / 2, 96, { size: 14, font: 'serif', style: 'italic', align: 'center', color: P.think });
          ctx.header('HOLD YOUR BREATH', label);
          ctx.footer('Hold SPACE to hold your breath. Let go for a sip of air - quietly, briefly.');
          void k; void t;
        });
      });
    }
  };

  /* tea: the hallucination. Answers drift toward the truth on their own. */
  MINIGAMES.tea = {
    autoSolve: function (p) { return { success: true, resisted: (p && p.autoResisted != null) ? p.autoResisted : 1, told: true }; },
    start: function (ctx) {
      var R2 = ctx.R, P = ctx.PAL, Q = ctx.params.questions || [];
      var qi = 0, sel = 0, qt = 0, slipT = 1.1, resisted = 0, phase = 'ask', phT = 0, said = '', LIMIT = 7;
      function cur() { return Q[qi]; }
      function opts() {
        var q = cur(); if (!q) return [];
        if (q.final) return ['Tell her everything.', 'Tell her everything.'];
        return q.swap && Math.floor(qt / 1.3) % 2 ? [q.tell, q.resist] : [q.resist, q.tell];
      }
      function isResist(i) { var q = cur(); return !q.final && opts()[i] === q.resist; }
      return new Promise(function (resolve) {
        ctx.loop(function (dt) {
          phT += dt;
          if (phase === 'said') { if (phT > 2.1 || (phT > 0.6 && ctx.input.pressed('ok'))) { qi++; qt = 0; sel = 0; slipT = 1.1; phase = qi >= Q.length ? 'end' : 'ask'; phT = 0; } return; }
          if (phase === 'end') { if (phT > 0.8) resolve({ success: true, resisted: resisted, told: true }); return; }
          var q = cur(); qt += dt;
          var inv = q.invert;
          if (ctx.input.pressed('up') || ctx.input.pressed('down')) { sel = 1 - sel; if (inv && Math.random() < 0.5) sel = 1 - sel; ctx.sound('blip'); }
          slipT -= dt;
          if (slipT <= 0) { slipT = Math.max(0.35, (q.slip || 1.0) - qt * 0.05) * (0.7 + Math.random() * 0.6); if (isResist(sel)) { sel = 1 - sel; ctx.sound('static'); } }
          var pick = ctx.input.pressed('ok') ? sel : (qt >= LIMIT ? (isResist(0) ? 1 : 0) : -1);
          if (pick >= 0) {
            var r = isResist(pick);
            if (r) { resisted++; said = q.resistSay || q.resist; ctx.sound('confirm'); }
            else { said = q.tellSay || q.tell; ctx.sound('reveal'); }
            phase = 'said'; phT = 0;
          }
        }, function (t) {
          var c = R2.ctx, W2 = ctx.W, H2 = ctx.H, q = cur() || Q[Q.length - 1] || {};
          var grd = c.createLinearGradient(0, 0, 0, H2);
          grd.addColorStop(0, '#f7c66a'); grd.addColorStop(0.5, '#f08a5a'); grd.addColorStop(1, '#a8487a');
          c.fillStyle = grd; c.fillRect(0, 0, W2, H2);
          for (var b = 0; b < 14; b++) { var yy = b * 16 + Math.sin(t * 1.3 + b) * 6; R2.rect(0, yy, W2, 4, '#fff3c0', 0.06); }
          c.save(); c.fillStyle = 'rgba(255,250,210,0.8)'; c.beginPath(); c.arc(W2 / 2 + Math.sin(t * 0.7) * 20, 54, 26 + Math.sin(t * 2) * 3, 0, Math.PI * 2); c.fill(); c.restore();
          // the yarn serpent: a coil around the chair
          var cx0 = W2 / 2, cy0 = 112;
          for (var i = 0; i < 70; i++) {
            var a = i * 0.32 + t * 0.6, r = 18 + i * 1.25, x = cx0 + Math.cos(a) * r * 1.35, y = cy0 + Math.sin(a) * r * 0.42 + i * 0.4;
            c.fillStyle = i % 3 ? '#b890d8' : '#d0b0f0'; c.beginPath(); c.arc(x, y, 6 - i * 0.05, 0, Math.PI * 2); c.fill();
            c.fillStyle = 'rgba(80,40,110,0.5)'; c.fillRect(x - 3, y, 6, 1);
          }
          // Annette's face at the serpent's head, melting in strips
          var por = ctx.portrait('annette', 'smug'), hx = cx0 - 30, hy = 58;
          for (var s = 0; s < 20; s++) c.drawImage(por, 0, s * 2, 40, 2, hx + Math.sin(t * 3 + s * 0.6) * (3 + s * 0.3), hy + s * 3, 60, 3.2);
          c.fillStyle = '#c8241c'; c.fillRect(hx + 30 + Math.sin(t * 9) * 2, hy + 62, 2, 6 + Math.abs(Math.sin(t * 6)) * 6);
          c.fillRect(hx + 27, hy + 67 + Math.abs(Math.sin(t * 6)) * 6, 3, 2); c.fillRect(hx + 32, hy + 67 + Math.abs(Math.sin(t * 6)) * 6, 3, 2);
          // the question, letters swimming
          var qtext = phase === 'said' ? '' : (q.ask || '');
          var x0 = W2 / 2 - R2.measure(qtext, 9, 'serif', 'italic') / 2;
          for (var k = 0; k < qtext.length; k++) {
            var ch = qtext[k];
            R2.text(ch, x0, 150 + Math.sin(t * 4 + k * 0.5) * 2.5, { size: 9, font: 'serif', style: 'italic', color: '#2a0a20', shadow: false });
            x0 += R2.measure(ch, 9, 'serif', 'italic');
          }
          if (phase === 'ask') {
            opts().forEach(function (o, i) {
              var y = 166 + i * 14, res = isResist(i), blur = res ? Math.min(1, qt / LIMIT) : 0;
              var on = i === sel;
              R2.rect(70, y - 2, 244, 12, on ? '#2a0a20' : '#000', on ? 0.55 : 0.25);
              var al = res ? Math.max(0.25, 1 - blur * 0.8) : 1;
              var jx = res ? Math.sin(t * 11 + i) * blur * 3 : 0;
              R2.text((on ? '> ' : '  ') + o, 78 + jx, y, { size: 8, color: res ? '#e8e4ff' : '#ffe0a0', alpha: al });
              if (res && blur > 0.3) R2.text(o, 79 + jx + 2, y + 1, { size: 8, color: '#e8e4ff', alpha: al * 0.35 });
            });
            R2.rect(70, 196, 244 * (1 - qt / LIMIT), 2, '#2a0a20', 0.6);
          } else if (phase === 'said') {
            R2.rect(30, 160, W2 - 60, 30, '#000', 0.4);
            R2.text('"' + said + '"', W2 / 2, 166, { size: 9, font: 'serif', style: 'italic', align: 'center', color: '#fff' });
          }
          R2.rect(0, 0, W2, H2, '#ffd080', 0.05 + 0.05 * Math.sin(t * 2));
          ctx.header('CHAMOMILE', 'Annette\'s voice. Sweet as the sun.');
          ctx.footer('UP/DOWN choose, SPACE answer. Hold on to what you mean.');
        });
      });
    }
  };

  /* ---------------------------------------------------------------------
   * Hallucination screen effect (Annette's room): ghosting + heat shimmer
   * ------------------------------------------------------------------- */
  var TEA = { k: 0, ov: null };
  function teaFx(on, k) {
    if (!on) { if (TEA.ov) G.UI.remove(TEA.ov); TEA.ov = null; TEA.k = 0; return; }
    TEA.k = k;
    if (TEA.ov) return;
    TEA.ov = { input: false, t: 0, update: function (dt) { this.t += dt; }, draw: function () {
      if (G.auto || TEA.k <= 0) return;
      var c = G.Render.ctx, cv = c.canvas, t = this.t, k = TEA.k;
      c.save(); c.setTransform(1, 0, 0, 1, 0, 0);
      var bands = 18, bh = Math.ceil(cv.height / bands);
      for (var i = 0; i < bands; i++) {
        var off = Math.sin(t * 2.2 + i * 0.7) * 4 * k * (cv.width / 384);
        c.drawImage(cv, 0, i * bh, cv.width, bh, off, i * bh, cv.width, bh);
      }
      c.globalAlpha = 0.22 * k;
      c.drawImage(cv, Math.sin(t * 0.9) * 10 * k * (cv.width / 384), 0);
      c.globalAlpha = 1;
      c.fillStyle = 'rgba(255,170,90,' + (0.1 + 0.1 * Math.sin(t * 1.5)) * k + ')';
      c.fillRect(0, 0, cv.width, cv.height);
      c.restore();
    } };
    G.UI.push(TEA.ov);
  }

  /* ---------------------------------------------------------------------
   * Footsteps (Trader + Ginerva come down the Red Hall) for the hide beat
   * ------------------------------------------------------------------- */
  var FT = { on: false };
  var FT_APPEAR = 3, FT_SPEED = 1.75, FT_FROM = 39, FT_TO = 13.5;
  function ftStart(api, attempt) {
    FT.on = true; FT.t = 0; FT.tid = 'ch08_tr' + attempt; FT.gid = 'ch08_gi' + attempt; FT.stepT = 0;
    api.addNpc({ id: FT.tid, at: [FT_FROM, 2], spec: 'trader', facing: 'left', turn: false }, R.red);
    api.addNpc({ id: FT.gid, at: [FT_FROM + 1, 3], spec: 'ginerva', facing: 'left', turn: false }, R.red);
    SN.guards = [FT.tid, FT.gid];
    SN.tick = function (dt, rid) {
      if (!FT.on) return;
      FT.t += dt;
      var walk = Math.max(0, FT.t - FT_APPEAR), x = Math.max(FT_TO, FT_FROM - walk * FT_SPEED);
      FT.stepT -= dt;
      if (FT.t > FT_APPEAR - 1 && FT.stepT <= 0) { FT.stepT = 0.55; if (rid === R.red || rid === R.foyer || rid === R.kitchen || rid === R.dining) G.Audio.play('step'); }
      if (rid === R.red) {
        [[FT.tid, 0, 2], [FT.gid, 1, 3]].forEach(function (q) {
          var n = G.World.npc(q[0]); if (!n) return;
          n.visible = FT.t >= FT_APPEAR;
          var wx = (x + q[1]) * T + 8, wy = q[2] * T + T;
          if (Math.abs(n.x - wx) > 14 || Math.abs(n.y - wy) > 4) { n.x = wx; n.y = wy; }
          if (FT.t >= FT_APPEAR && x > FT_TO) { n.queue = [{ x: wx - 6, y: wy }]; n.moveSpeed = FT_SPEED * T; }
          n.dir = 'left';
        });
      }
      if (FT.t > FT_APPEAR && FT.t < FT_APPEAR + 0.1) snMsg('Footsteps. From the east wing. HIDE.', 4);
      if (x <= FT_TO) FT.arrived = true;
    };
  }
  function ftStop(api) {
    if (FT.on) { try { api.remove(FT.tid, R.red); api.remove(FT.gid, R.red); } catch (e) { /* ignore */ } }
    FT.on = false; FT.arrived = false; SN.guards = []; SN.tick = null;
  }
  function hidingSpot(api) {
    var rid = api.room(), p = api.playerTile();
    if (rid === R.kitchen) {
      var pz = at(R.kitchen, 'pantry', [9, 8]);
      if (Math.abs(p.x - pz[0]) <= 1 && Math.abs(p.y - pz[1]) <= 1) return 'pantry';
    }
    if (rid === R.dining && SN.hidden === 'table') return 'table';
    if (rid === R.closet) return 'closet';
    return null;
  }

  /* ---------------------------------------------------------------------
   * Maps
   * ------------------------------------------------------------------- */
  var NIGHT = { dark: 0.68, playerLight: 30 };
  function night(ext, d) { ext.dark = d || NIGHT.dark; ext.playerLight = NIGHT.playerLight; return ext; }

  var crowd = [];
  (function () {
    var seed = 80;
    for (var y = 13; y <= 16; y++) for (var x = 2; x <= 29; x += 3) {
      if (x === 14 || x === 17) continue;
      if ((x + y) % 2) continue;
      crowd.push({ id: 'ch08_c' + x + '_' + y, at: [x, y], spec: extra('audience', seed++), facing: 'up', turn: false });
    }
  })();
  var prisoners = [];
  for (var pi = 3; pi <= 12; pi += 2) prisoners.push({ id: 'ch08_pr' + pi, at: [pi, 20], spec: 'inmate', facing: 'up', turn: false });

  var MAPS = {};
  MAPS[R.amph] = useMap(R.amph, amphFb, {
    remove: ['gallows'], dark: 0.3,
    npcs: crowd.concat(prisoners).concat([
      { id: 'ch08_carol', at: at(R.amph, 'cage', [4, 4]), spec: 'carol', facing: 'right', turn: false },
      { id: 'ch08_judge', at: [26, 4], spec: 'judge', facing: 'left', visible: true, turn: false },
      { id: 'ch08_medic', at: [27, 4], spec: 'medic', facing: 'left', turn: false },
      { id: 'ch08_tb1', at: at(R.amph, 'security_1', [10, 8]), spec: 'tb_hippo', facing: 'down', turn: false },
      { id: 'ch08_tb2', at: at(R.amph, 'security_2', [13, 8]), spec: 'tb_boar', facing: 'down', turn: false },
      { id: 'ch08_tb3', at: at(R.amph, 'security_3', [18, 8]), spec: 'tb_dog', facing: 'down', turn: false },
      { id: 'ch08_tb4', at: at(R.amph, 'security_4', [21, 8]), spec: 'tb_deer', facing: 'down', turn: false },
      { id: 'ch08_mom', at: [12, 18], spec: extra('citizen', 7, { name: 'Mother', outfit: '#6a4a7a' }), facing: 'up', turn: false },
      { id: 'ch08_girl', at: [13, 18], spec: extra('kid', 3, { name: 'Little Girl', outfit: '#e890b0' }), facing: 'up', turn: false },
      { id: 'ch08_pizza', at: [19, 18], spec: 'vendor', facing: 'up', turn: false },
      { id: 'ch08_bookie', at: [26, 20], spec: extra('guest', 12, { name: 'Bookie' }), facing: 'up', turn: false },
      { id: 'ch08_guard', at: [2, 20], spec: 'guard', facing: 'right', turn: false }
    ]),
    objects: [{ id: 'ch08_tomcart', at: [20, 18], prop: 'tomatoes', solid: true }]
  });

  MAPS[R.screening] = useMap(R.screening, screeningFb, {
    dark: 0.5,
    npcs: [
      { id: 'ch08_trader_sr', at: [4, 2], spec: 'trader', facing: 'down' },
      { id: 'ch08_camop', at: [7, 4], spec: 'cameraman', facing: 'left', turn: false }
    ],
    objects: [{ id: 'ch08_sr_screen', at: [5, 1], prop: 'screen', placeholderOnly: true, solid: false, layer: -1 }],
    lockExits: { to_bedroom_hall: { locked: ALWAYS, lockedText: [{ think: 'He hasn\'t dismissed me. Leaving now would be a headline.' }] } }
  }, true);

  MAPS[R.luna] = useMap(R.luna, null, night({
    lockExits: { to_bedroom_hall: { locked: '!ch08_doorOpen', lockedText: [{ think: 'The handle won\'t turn. 23:00 to 06:00, every night. A green button to summon Ginerva, as if.' }] } }
  }, 0.62));

  MAPS[R.hall] = useMap(R.hall, null, night({
    zones: [
      { id: 'ch08_z_annette_door', at: [9, 1], once: true, if: '!ch08_running', run: [{ think: 'Room 1. Annette\'s. A thin line of lamplight under the door. Still awake at this hour?' }] },
      { id: 'ch08_z_carol_door', at: [11, 4], once: true, if: '!ch08_running', run: [{ think: 'Room 2. Carol\'s. Somebody already peeled her name off the door.' }] },
      { id: 'ch08_z_kessie_door', at: [19, 1], once: true, if: '!ch08_running', run: [{ think: 'Room 5. Kessie\'s. The door isn\'t latched. The bed inside is made, and empty.' }] },
      { id: 'ch08_isaiah_zone', at: [17, 1], w: 1, h: 4, if: 'ch08_running' },
      { id: 'ch08_annette_zone', at: [30, 1], w: 1, h: 4, if: 'ch08_running' }
    ],
    lockExits: {
      to_luna_room: { locked: 'ch08_running', lockedText: [{ think: 'Not my room. Not that bed. I can\'t lie still. I have to keep moving.' }] },
      to_screening_room: { locked: ALWAYS, lockedText: [{ think: 'The screening room. I\'ve seen enough on that screen.' }] },
      to_annette_room: { locked: ALWAYS, lockedText: [{ think: 'Annette\'s door. Better not.' }] },
      to_foyer: { locked: 'ch08_running', lockedText: [{ think: 'Not back down there.' }], toAt: [12, 1] }
    }
  }, 0.66));

  MAPS[R.foyer] = useMap(R.foyer, null, night({
    lockExits: { to_grounds: { locked: '!ch08_pantryDone', lockedText: [{ think: 'The jewel door, and its keypad. Four digits I don\'t have. The kitchen first.' }] } }
  }, 0.62));

  MAPS[R.red] = useMap(R.red, null, night({
    lockExits: { to_green_room: { locked: ALWAYS, lockedText: [{ think: 'The blue door. Locked. I don\'t even know what\'s behind it.' }] } }
  }, 0.64));

  MAPS[R.kitchen] = useMap(R.kitchen, null, night({
    patch: {
      kitchen_pantry_door: { examine: [{ narrate: 'A slatted door. The walk-in pantry. From inside you can see out through the slats.' }, { think: 'No camera in there. Not filmed before six.' }] }
    }
  }, 0.72));

  MAPS[R.dining] = useMap(R.dining, null, night({
    patch: {
      dining_table: { examine: async function (api) {
        if (!FT.on) { await api.narrate('Oak, long enough for ten. The tablecloth hangs almost to the floor.'); await api.think('Nobody films the underside of a table.'); return; }
        var c = await api.choice(['(Crawl under the table.)', '(Not here.)']);
        if (c === 0) { snHide('table', at(R.dining, 'under_table', [6, 4])); snMsg('Under the table. The cloth hangs to the floor.', 3); }
      } }
    }
  }, 0.72));

  MAPS[R.closet] = useMap(R.closet, null, { dark: 0.78 });

  MAPS[R.grounds] = useMap(R.grounds, null, night({
    tint: '#1a2a48', tintAlpha: 0.18, ambient: 'drone',
    npcs: [
      { id: 'ch08_hippo', at: [3, 22], spec: 'tb_hippo', path: [[3, 22], [2, 14], [2, 7], [10, 6], [2, 7], [2, 14]], pause: 1.6, speed: 30, if: '!ch08_fenceDone', turn: false },
      { id: 'ch08_kessie', at: at(R.grounds, 'kessie_fence_spot', [46, 3]), spec: 'kessie', facing: 'right', if: '!ch08_fenceDone', turn: false },
      { id: 'ch08_elephant', at: [48, 3], spec: 'elephant_unmasked', facing: 'left', if: '!ch08_fenceDone', turn: false }
    ],
    objects: [{ id: 'ch08_mask', at: [49, 4], prop: 'goldmask', solid: false, if: '!ch08_fenceDone' }],
    zones: [{ id: 'ch08_fence_approach', at: [36, 3], w: 20, h: 6, once: true, run: function (api) { api.set('ch08_atFence', true); } }],
    lights: [{ at: [47, 3], r: 26, flicker: true }]
  }, 0.62));

  MAPS[R.green] = useMap(R.green, null, { dark: 0.4 });

  MAPS[R.annette] = useMap(R.annette, annetteFb, {
    dark: 0.3,
    objects: [
      { id: 'ch08_an_bed', at: [6, 2], placeholderOnly: true, examine: 'Annette\'s quilt. Hand-stitched. Every square a different storm.' },
      { id: 'ch08_an_duck', at: [8, 4], prop: 'crochet', color: '#e0c060', examine: 'A crocheted duck sitting on the rug, as if it fell off the bed. Annette\'s quilt beside it: every square a different storm.' },
      { id: 'ch08_an_croc1', at: [1, 3], prop: 'crochet', color: '#c890d8', examine: 'A crocheted rabbit with button eyes. One ear longer than the other.' },
      { id: 'ch08_an_croc2', at: [8, 5], prop: 'crochet', color: '#90c8a0', examine: 'A crocheted frog. A crocheted hat. A crocheted hat on a crocheted frog.' },
      { id: 'ch08_an_croc3', at: [5, 7], prop: 'crochet', color: '#e8b070', examine: 'A little lion, mid-roar. The stitches are tight. Perfect.' },
      { id: 'ch08_an_storm', at: [2, 0], wall: true, prop: 'painting', kind: 'storm', examine: 'A painting of a storm over a field. Good. Really good.' },
      { id: 'ch08_an_pony', at: [8, 0], wall: true, prop: 'painting', kind: 'pony', examine: 'A pony in a meadow, painted with real tenderness.' },
      { id: 'ch08_an_rocker', at: [7, 7], prop: 'rocker', examine: 'A rocking chair with a lavender cushion. It\'s still rocking, very slightly.' },
      { id: 'ch08_an_yarn', at: [3, 5], prop: 'yarn', placeholderOnly: true, examine: 'Yarn and knitting needles. The needles are long, and very sharp.' }
    ],
    patch: { knitting: { examine: 'Yarn and knitting needles. The needles are long, and very sharp.' } },
    lockExits: { to_bedroom_hall: { locked: ALWAYS, lockedText: [{ think: 'She said to wait. It would be rude to leave.' }] } }
  }, true);

  /* ---------------------------------------------------------------------
   * Helpers for the script
   * ------------------------------------------------------------------- */
  function player() { return G.World.player; }
  function camAt(api, p) { player().visible = false; api.teleport(p); }
  async function caughtScene(api, why) {
    var garden = api.room() === R.grounds;
    G.UI.flash('#e8323c', 300);
    snHint(null, 0);
    if (garden) {
      await api.narrate('A gloved hand closes on the back of my neck. A gold mask, a hippo\'s snout. He doesn\'t say a word. They never do.');
      api.sound('buzzer');
      await api.think('My watch buzzes. Then it burns. He walks me back to the jewel door like a dog to its kennel.');
    } else {
      if (why === 'footsteps') await api.say('trader', 'Well, well. Miss Luna. Bit late for a midnight snack.', { mood: 'smug' });
      else if (why === 'drone') await api.narrate('A whine at my ear. A red pinprick of light. The mosquito drone hangs in front of my face, recording.');
      await api.say('ginerva', 'Contestants are to remain in their rooms after curfew, Miss Bartley. Walk.', { mood: 'angry' });
      await api.narrate('Her ruler taps twice against my wrist. She marches me back up the stairs.');
    }
    SN.fails = (SN.fails || 0) + 1;
    await api.think(SN.fails >= 2 ? 'Again. Slower. Steady dot: walk like you belong. Flashing dot: stay out of its light. Stairs: SHIFT.' : 'Again. And this time, think.');
    await api.fadeOut(400);
  }
  /** Run a free-roam stealth stretch until done() or caught; on caught, back to the checkpoint and retry. */
  async function sneak(api, o) {
    for (;;) {
      SN.caught = null; SN.drone = null;
      await api.until(function (f) { return !!SN.caught || o.done(f, api); }, { objective: o.objective, autoplay: o.autoplay, target: o.target });
      if (!SN.caught) return;
      var why = SN.caught;
      if (o.onCaught) o.onCaught(api);
      await caughtScene(api, why);
      snReset();
      await api.goRoom(o.cp[0], { at: o.cp[1], facing: o.cp[2] || 'down' });
      await api.fadeIn(400);
      if (o.retry) await o.retry(api);
    }
  }

  /* ---------------------------------------------------------------------
   * The eavesdrop (shared by the three hiding spots)
   * ------------------------------------------------------------------- */
  async function eavesdrop(api, where) {
    var tid = 'ch08_trader_e', gid = 'ch08_ginerva_e';
    var room = where === 'pantry' ? R.kitchen : where === 'table' ? R.dining : R.red;
    var inRoom = api.room() === room;
    var entry = where === 'pantry' ? at(R.kitchen, 'from_red_hall', [5, 1]) : where === 'table' ? at(R.dining, 'from_red_hall', [6, 1]) : [24, 2];
    if (inRoom) {
      api.addNpc({ id: tid, at: entry, spec: 'trader', facing: 'down' });
      api.addNpc({ id: gid, at: [entry[0] + 1, entry[1] + 1], spec: 'ginerva', facing: 'down' });
      api.sound('door');
      if (G.World.room) G.World.room.def.dark = 0.3;
      if (where === 'pantry') await api.narrate('The footsteps enter the kitchen. A switch clicks, and a thin bar of light appears under the slats.');
      else await api.narrate('The footsteps turn in. A switch clicks. Light pools around the edge of the tablecloth.');
      await api.move(tid, [entry[0], entry[1] + 2]);
    } else {
      await api.narrate('The footsteps stop right outside the closet door. Two voices, so close I could reach through the wood and touch them.');
    }
    var S = function (who, text, mood) { return api.say(who, text, { mood: mood }); };
    await S('ginerva', 'Mr. Johnson, I must protest this late night summons. We have much to do in the morning and this is highly inappropriate.');
    await S('trader', 'I needed to talk to you and this was the only time I could be sure that we wouldn\'t be overheard. I can trust you, can\'t I?');
    if (where === 'pantry') await S('trader', 'And relax. The kitchen cam doesn\'t come on until six. Nobody films the help making coffee.', 'smug');
    await S('ginerva', 'Of course. But a clandestine meeting between a woman and man in the middle of the night could easily be misinterpreted if discovered.');
    await S('trader', 'Not to worry. I\'m certain no one would dare think anything you do is untoward. Your whole proper act is very convincing, Ginny. By the way, you can drop the mask now. It\'s just us here, after all.', 'smug');
    await api.think('Act? Ginny? He talks like the strict old woman is a costume. Did they know each other before this?');
    await S('ginerva', 'I\'m certain that I have no idea what you could be referring to. And I\'ll thank you to use my proper name.');
    await S('trader', 'As you wish, Miss Ginerva.');
    await S('ginerva', 'Why did you call me here?');
    api.sound('hit'); await api.shake(300, 3);
    await api.narrate('A loud clang. I slap a hand over my own mouth.');
    await S('trader', 'Why was he here? Did you know he was coming?', 'angry');
    await S('ginerva', 'Of course not. I would have informed you had that been the case.');
    await S('trader', 'So, DPE is keeping you out of the loop too. That\'s not good. Do you think they know you\'re holding back?');
    await S('ginerva', 'They have no reason to suspect such a thing.');
    await S('trader', 'Maybe he came on his own. Just to fuck with my head. Yeah, that\'d be just like the old bastard.', 'angry');
    await S('ginerva', 'You are becoming paranoid, Trey.');
    await S('trader', 'Ah, so you do remember.', 'happy');
    await S('ginerva', 'Of course I do. I just see no need to constantly revisit the past like you seem to feel compelled to.');
    await S('trader', 'Seeing him again is fucking with my head. I need a drink.', 'tired');
    var V = {
      pantry: ['A nice glass of gin ought to take the edge off. Want anything, Ginny?', 'His footsteps come straight at the pantry. The slats go bright. The door begins to open.', [6, 8], 'The pantry door is opening'],
      table: ['There\'s a decanter in the sideboard, if memory serves. Want anything, Ginny?', 'A chair scrapes back. A polished white shoe stops an inch from my fingers.', [7, 5], 'Trader is sitting down right next to you'],
      closet: ['Hang on. The old girl keeps a bottle of gin behind the bleach. Want anything, Ginny?', 'The handle turns. A blade of light slides across the mop bucket.', null, 'The closet door is opening']
    }[where];
    await S('trader', V[0]);
    if (inRoom && V[2]) await api.move(tid, V[2]);
    await api.narrate(V[1]);
    api.sound('heartbeat');
    var b = await api.minigame('breath', { label: V[3] });
    if (!b.success) {
      await S('trader', '...Did you hear something?');
      await S('ginerva', 'This house groans, Trey. It is older than both of us.');
    }
    await S('ginerva', 'Do you really think that\'s a good idea? Last time you drank on the premises, you came dangerously close to assaulting a contestant.');
    await api.narrate('The light stops widening. Then it narrows, and it\'s gone. I let out a breath I hadn\'t known I was still holding.');
    if (inRoom) await api.move(tid, [entry[0], entry[1] + 2]);
    await S('trader', 'How do you know about that?');
    await S('ginerva', 'It\'s my job to know such things.');
    await S('trader', 'It wasn\'t my fault, you know. She looks so much like her.', 'sad');
    await api.think('Am I the she? I must be. Then who\'s the her?');
    if (!api.get('ch08_insight')) { api.set('ch08_insight', true); api.add('m_trader_insight', 1); }
    await S('ginerva', 'Nonetheless, you must restrain yourself. If word gets out that one of them is getting special treatment.');
    await S('trader', 'And just how would word get out, Ginerva? Are you going to tell them?', 'angry');
    await S('ginerva', 'No. But I am not the only one who is watching.');
    await S('trader', 'I\'m sorry. This whole thing is stressing me out and when the judge showed up, a part of me just snapped. I know that none of this is your fault.', 'tired');
    await S('ginerva', 'It\'s okay, Trey. But you must not allow your judgement to be compromised. That is how he wins.');
    await S('trader', 'You\'re right. No drinks for me. I\'ll just go to bed, sober and stressed.', 'tired');
    await S('ginerva', 'Good. I will do the same.');
    await S('trader', 'Goodnight, Ginny. I\'m glad we finally had a chance to talk.', 'sad');
    await S('ginerva', 'Goodnight, Trey. I feel the same.');
    if (inRoom) {
      await api.move(tid, entry); await api.move(gid, entry);
      api.remove(tid); api.remove(gid);
      api.sound('door');
      if (G.World.room) G.World.room.def.dark = 0.72;
    }
    await api.narrate('I wait until the footsteps fade into nothing.');
    await api.think('Trader and Ginerva. Trey and Ginny. Closer than advertised. "That is how he wins." Who is he?');
    await api.think('My heart should be sending me back to bed. It isn\'t. It\'s buzzing. The figures at the fence, I still don\'t know who they are.');
  }

  /* =====================================================================
   * PART 1: Carol (3rd person, inside her head)
   * ===================================================================== */
  async function carolVignette(api) {
    await api.slides([{ style: 'screen', title: 'DEPARTMENT OF PUNITIVE ENTERTAINMENT: EXECUTION MEMO',
      text: 'Not to be distributed to any individual not employed by the DPE. Failure to comply: prison time, execution, or participation in a DPE sponsored show.\n\nNAME: Carol Daughtery\nCRIME: Three counts of armed robbery\nVICTIM: Wellsome Farso Bank\nAGE: 28\nDATE: Saturday, January 20th, 2084' }]);
    await api.goRoom(R.amph, { at: [15, 15], fade: true });
    camAt(api, [15, 15]);
    api.onAir(true);
    api.lowerThird('LIVE', 'The Execution of Carol Daughtery', null, 'EEN');
    await api.narrate('The mood of the crowd is different this time. Two whole weeks of show. They know what to expect now, and they revel in it, gossiping with their neighbours about their favourite contestants.');
    await api.pan([26, 19], 900);
    await api.say('ch08_bookie', 'Odds on screaming, two to one! Odds on fainting, five to one! Place your bets with a man you can trust!', { name: 'Bookie' });
    await api.narrate('For the low price of only ten dollars, you can own a shirt with a picture of Carol\'s face when she lost the vote. Limited edition. Only available until she\'s executed.');
    await api.pan([8, 20], 900);
    await api.narrate('A line of men in orange jumpsuits is led in and cuffed to the handholds along the back row. Scare them straight. Keep the public wary.');
    await api.pan([12, 18], 700);
    await api.say('ch08_girl', 'Momma, why are those men all standing like that?', { name: 'Little Girl' });
    await api.say('ch08_mom', 'Because they\'re bad men. They did bad things just like the woman we\'re here to see today, and this is their punishment.', { name: 'Mother' });
    await api.say('ch08_girl', 'Like when you put me in time out for being silly?', { name: 'Little Girl' });
    await api.say('ch08_mom', 'Exactly. I do that to you because I love you and I don\'t want you to end up like these bad men.', { name: 'Mother' });
    await api.narrate('Eighty percent of the men against that wall grew up in group homes that let go of them the day they turned eighteen. The little girl licks her ice cream, chocolate vanilla swirl, and forgets them. They don\'t forget her.');
    api.sound('sting');
    await api.pan(at(R.amph, 'cage', [4, 4]), 900);
    await api.narrate('A bell rings. The Cage is rolled out, and Carol will not be going quietly.');
    var c = await api.choice([
      { text: '"Perverts! Every last one of you!"', value: 'rage' },
      { text: '"You PAID for this? You sick, sad, little..."', value: 'scorn' },
      { text: '(Look for one kind face in the crowd.)', value: 'face' }
    ], { prompt: 'What does Carol scream at them?' });
    api.set('ch08_carolLast', ['rage', 'scorn', 'face'][c]);
    if (c === 0) await api.say('ch08_carol', 'Perverts! Sadists! You want to watch me die so you can go home and feel clean!', { mood: 'angry' });
    else if (c === 1) await api.say('ch08_carol', 'You paid for this? You paid MONEY for this? You sick, sad little people!', { mood: 'angry' });
    else { await api.narrate('Carol searches the stands for one face that isn\'t red. She finds the little girl with the ice cream. The little girl looks away.'); await api.say('ch08_carol', 'Somebody... anybody...', { mood: 'cry' }); }
    await api.pan([19, 18], 800);
    await api.say('ch08_pizza', 'Come one, come all, teach that nasty little bitch a lesson with my plump red tomatoes!', { name: 'Pizza Vendor', mood: 'happy' });
    await api.say('ch08_pizza', 'Sorry, ma\'am.', { name: 'Pizza Vendor', mood: 'sad' });
    await api.narrate('He turns red when a woman with three children glares at his language. Then he goes back to selling tomatoes.');
    await api.pan([15, 5], 900);
    await api.move('ch08_judge', [18, 5], { speed: 30 });
    api.face('ch08_judge', 'left');
    await api.narrate('The judge arrives with the doctor. A white lily in his lapel. Carol snaps at his hand as it comes near. He looks amused, as if she\'s a misbehaving dog.');
    await api.narrate('He signals for a gag. She screams that she will not be silenced. Two True Believers force her jaws open while he pushes it in. Her voice, the blade she\'s been swinging all week, is gone.');
    api.sound('hit');
    await api.say('ch08_judge', 'Thank you all for coming. With the exception of those in the back, you are all fine, upstanding citizens, truly loyal, and I congratulate you on your proper choices.');
    api.sound('applause');
    await api.narrate('Someone boos the prisoners. Then everyone does. The judge raises one hand, and the crowd goes from mob to mild in seconds.');
    await api.say('ch08_judge', 'The woman you see before you has committed grievous crimes and has proven herself incapable of redemption. In just a few moments, she will experience the ultimate punishment. But first, I believe she should be made to understand the consequences of her actions.');
    await api.narrate('The gurney is rolled out, still stained from where John banged his head the week before. Until this moment, Carol truly believed there would be a way out. A pardon. A miracle.');
    await api.move('ch08_carol', [14, 5], { speed: 40 });
    api.placeNpc('ch08_carol', at(R.amph, 'stage_center', [15, 4]), 'down');
    await api.narrate('They strap her down and tilt the gurney upright, so she seems to stand beside him. He strokes her cheek. She shudders and can do nothing about it.');
    await api.say('ch08_judge', 'The reason this woman was chosen for execution is because she was unable to let go of her pride. Those who have too much pride must be brought low as an example to anyone who may be tempted to follow in their path.');
    await api.say('ch08_judge', 'Ladies and gentlemen. Help me teach this harlot the importance of shame.', { mood: 'smug' });
    api.sound('hit'); api.flash('#c8241c', 200);
    await api.narrate('He throws the first tomato into the centre of her chest. It bursts, and the pulp runs down her like she\'s bleeding from the heart.');
    var r = await api.minigame('chin', {});
    api.set('ch08_carolDignity', r.dignity != null ? r.dignity : 50);
    for (var s = 0; s < 6; s++) api.addObject({ id: 'ch08_splat' + s, at: [13 + (s % 3) * 2, 5 + (s > 2 ? 1 : 0)], prop: 'splat', solid: false, layer: -1 });
    await api.narrate(r.dignity >= 50
      ? 'Covered in red, eyes streaming, Carol holds her chin up anyway. In the back row, a prisoner who has forgotten how to hope straightens, just a little. He will tell his cellmates about the woman who looked death in the eye and spat on it.'
      : 'Carol is completely red now. Her blonde hair is dyed with it. Her eyes are closed. Tears run down her cheeks and wash away nothing.');
    await api.narrate('The doctor and the judge lower the gurney, so all she can see is the ceiling and their heads hovering over her. As the needle fills with something blue, she tries to take herself somewhere else.');
    api.onAir(false); api.lowerThird(null); api.ambient(null);
    api.sound('heartbeat');
    await api.slides([
      { style: 'montage', title: 'SALLY', text: 'Carol remembers the day her sister was born, and how happy she was to have someone to play with.' },
      { style: 'montage', title: 'SALLY', text: 'She remembers the day it became clear that Sally was different, and that her parents would pour every hour and every dollar into making her a normal kid.' },
      { style: 'montage', title: 'SIXTEEN', text: 'The judge\'s hand swabs her arm. She remembers the boy she brought home at sixteen, and how, after he left her bed, he went upstairs to Sally\'s. Her parents never believed she hadn\'t known. She resented Sally. She never wanted her hurt. Not like that.' },
      { style: 'montage', title: 'JOHN', text: 'Sally was the reason she chose John first. He was so much like her. The same naivety. So easy to use.' },
      { style: 'montage', title: 'THE SLAP', text: 'Her mother\'s hand across her face, the day she screamed at Sally to just die already.' },
      { style: 'montage', title: 'THE POND', text: 'The two of them dancing round the pond, giggling. Carol and her stupid little sister and the alphabet, for the twentieth time.' },
      { style: 'black', text: 'I\'m sorry, Carol thinks to the universe, and prays it will reach her sister, wherever she is.\nI shouldn\'t have been so mean to you.' }
    ]);
    api.sound('heartbeat');
    await api.slides([
      { style: 'black', text: 'The crowd rages again. They call her a sinner, a whore, a horrible bitch. She knows it\'s true. If only she could do it all over again. If only she could have one more chance.' },
      { style: 'black', text: 'Carol closes her eyes and dies, covered in tomato juice, with insults in her ears and self-loathing in her heart.' }
    ]);
    await api.fadeOut(900);
    await api.tv({ speaker: 'announcer', headline: 'Justice Is Served', text: 'And that\'s a wrap on Carol! Stay tuned: tomorrow, the survivors react. Brought to you by Sunny Grove Orange Juice: squeezed, like a confession.', ticker: 'VOTE RESPONSIBLY • JUSTICE IS ENTERTAINMENT • ', tag: 'EEN' });
  }

  /* =====================================================================
   * PART 2: Trader's one-on-one (Screening Room, on camera)
   * ===================================================================== */
  async function oneOnOne(api) {
    player().visible = true;
    await api.goRoom(R.screening, { at: at(R.screening, 'from_bedroom_hall', [3, 5]), facing: 'up' });
    await api.fadeIn(500);
    api.onAir(true); api.approval(true);
    api.lowerThird('ONE-ON-ONE', 'Luna Bartley & your host', 4000);
    await api.narrate('They replay the first tomato three times, in slow motion, from three angles. A camera hangs a foot from my face, waiting for me to cry.');
    var tr = 'ch08_trader_sr';
    api.face(tr, 'player');
    await api.say(tr, 'Miss Luna. The network likes a reaction shot after an execution, and you have such an expressive face. React.', { mood: 'smug', name: 'Trader' });
    await api.think('His hands are shaking. He keeps putting them in his pockets and taking them out again. The famous smile is all teeth and no eyes.');
    var c = await api.choice([
      '"You hugged her. And then you let them throw tomatoes at her."',
      '"Who was the man with the lily?"',
      '(Say nothing. Watch the screen.)'
    ]);
    if (c === 0) {
      await api.say(tr, 'I don\'t LET anything. I host. There is a difference, and you\'d do well to learn it.', { mood: 'angry', name: 'Trader' });
      await api.say(tr, 'Do you know what the ratings did when that first one hit? Neither do I. Nobody tells me anything anymore.', { mood: 'angry', name: 'Trader' });
      api.approvalAdd(4); api.set('ch08_needled', true);
      await api.think('The audience loves it when the host bleeds. So do I, a little. That scares me.');
    } else if (c === 1) {
      await api.say(tr, 'The Judge is... a guest.', { mood: 'neutral', name: 'Trader' });
      await api.say(tr, 'A very distinguished guest of the Department. You\'ll be polite to him. Everyone is polite to him. Everyone.', { mood: 'tired', name: 'Trader' });
      api.approvalAdd(2);
      await api.think('Same jaw. Same eyes. Neither of them blinks enough. He didn\'t say the word, but I heard it anyway.');
    } else {
      await api.say(tr, 'Silence. Bold choice. It reads as either grief or guilt, and the audience doesn\'t care which.', { mood: 'smug', name: 'Trader' });
      api.approvalAdd(-2);
    }
    await api.say(tr, 'What? What are you looking at? Don\'t. Don\'t you dare look at me like that.', { mood: 'angry', name: 'Trader' });
    await api.narrate('He rakes a hand through his perfect hair. His sleeve rides up his right forearm.');
    var t = await api.choice(['(Look at his arm.)', '(Look away.)']);
    if (t === 0) {
      api.set('ch08_sawTattoo', true);
      await api.narrate('A penguin. Inked on the inside of his forearm, faded green-black, older than the show.');
      await api.say(tr, 'It\'s the company logo, Miss Luna. We\'re all very proud.', { mood: 'smug', name: 'Trader' });
      await api.think('He tugs the sleeve down too fast. Something about it itches at the back of my skull, like a word on the tip of my tongue.');
    }
    await api.say(tr, 'We\'re done. Get some sleep. Big week.', { mood: 'tired', name: 'Trader' });
    await api.say(tr, 'Cut. I said CUT. Are you deaf?', { mood: 'angry', name: 'Trader' });
    api.onAir(false); api.approval(false);
    await api.fadeOut(600);
  }

  /* =====================================================================
   * PART 3: The night door (stealth)
   * ===================================================================== */
  async function nightDoor(api) {
    api.setPlayer('luna_night');
    await api.titleCard('Sunday, 21 January', '02:14', 2400, { kicker: 'THE NIGHT DOOR' });
    await api.goRoom(R.luna, { at: at(R.luna, 'center', [4, 5]), facing: 'up' });
    await api.think('I can\'t sleep. Every time I close my eyes, Carol\'s face, humiliated and covered in tomato pulp, flashes through my mind. Is that the end of the road I\'m on?');
    await api.think('Counting sheep. Breathing three-seven-five. A triangle, flashing over and over. Nothing erases the look on her face when that first tomato hit.');
    api.objective('Pace. Look out the window.', { target: 'window' });
    await api.waitForInteract('window');
    api.objective(null);
    await api.narrate('The garden is black. Then: a flash of light by the fence. A near-silent step. Two shadows, the same two I saw before. A contestant and a True Believer, indistinguishable in the dark.');
    await api.think('I\'m at my door before I can think about it. It won\'t work. I\'m locked in here, remember?');
    api.sound('door');
    await api.emote('player', '!', 900);
    await api.narrate('Click.');
    await api.narrate('My hand finds the knob and turns. No resistance. No lock.');
    await api.think('A fault? A trap? A test from Trader? It doesn\'t matter. It can\'t matter. Carol and John\'s faces flash through my head.');
    var c = await api.choice(['(Open the door.)', '(Get back into bed.)']);
    if (c === 1) {
      await api.narrate('I lie down. I count the cracks in the ceiling. Carol\'s face. John\'s. The door stays unlocked, and the shadows stay at the fence.');
      await api.think('No. If there\'s any chance I can use this, I have to take it.');
    }
    api.set('ch08_doorOpen', true);
    await api.slides([
      { style: 'card', title: 'THE RED-LIGHT TRICK', text: 'Every room has camera dots. STEADY red = recording; the AI reviews it later. Walk like you belong there. Creeping or loitering in its cone gets you flagged.' },
      { style: 'card', title: 'FLASHING RED', text: 'Someone is watching live. Stay out of its cone. If it sees you, a mosquito drone is sent, and it arrives 4 seconds late: be in cover, a blind spot, or another room by then.' },
      { style: 'card', title: 'STAIRS AND PEOPLE', text: 'Stairwells are audio only: hold SHIFT to creep, or the sensors hear you. People see whatever is in front of them. It is between two and three. The AI barely watches the bedroom hall.' }
    ]);

    // ---- A: down to the Red Hall, then the footsteps ----
    snStart(api, { hint: ['STEADY DOTS IN THIS HALL', 'They are steady, not flashing. Walk normally.', 'The main stair is at the west end.'], hintT: 10 });
    await api.goRoom(R.hall, { at: at(R.hall, 'from_luna_room', [14, 1]), facing: 'down' });
    var cpHall = [R.hall, at(R.hall, 'from_luna_room', [14, 1]), 'down'];
    var where = null, attempt = 0;
    while (!where) {
      attempt++;
      await sneak(api, {
        objective: 'Get downstairs. The kitchen is off the Red Hall.',
        done: function () { return api.room() === R.red; },
        autoplay: async function (a) { await a.goRoom(R.red, { at: at(R.red, 'from_foyer', [1, 3]) }); },
        cp: cpHall
      });
      if (api.auto) { await api.goRoom(R.kitchen, { at: at(R.kitchen, 'pantry', [9, 8]) }); where = 'pantry'; break; }
      await api.think('Rounding the corner toward the kitchen, I hear it. Footsteps. From the far end of the hall.');
      await api.think('The front door? Too loud. Run? They\'ll hear me. Hide, then. The kitchen pantry. The dining table. That closet.');
      snHint(['HIDE BEFORE THEY ARRIVE', 'Walk-in pantry (kitchen, SE corner)', 'Under the dining table (face it, press E)', 'Supply closet (under the flashing camera)'], 14);
      ftStart(api, attempt);
      SN.caught = null;
      await api.until(function () { return !!SN.caught || FT.arrived; }, { objective: 'Hide!' });
      var why = SN.caught;
      if (!why) { where = hidingSpot(api); if (!where) why = 'footsteps'; }
      ftStop(api);
      if (!where) {
        SN.caught = null;
        await caughtScene(api, why);
        snReset();
        await api.goRoom(cpHall[0], { at: cpHall[1], facing: 'down' });
        await api.fadeIn(400);
      }
    }
    api.objective(null);
    snHint(null, 0);
    await eavesdrop(api, where);
    if (SN.hidden) snUnhide();
    api.set('ch08_pantryDone', true);

    // ---- B: out the front door ----
    var cpRed = [R.red, at(R.red, 'from_kitchen', [13, 4]), 'down'];
    snHint(['THE FOYER CAMERA FLASHES', 'Someone watches it live. Its reach is short:', 'hug the far walls to the jewel door (south).'], 10);
    await sneak(api, {
      objective: 'Go out the front door.',
      done: function () { return api.room() === R.foyer || api.room() === R.grounds; },
      autoplay: async function (a) { await a.goRoom(R.foyer, { at: at(R.foyer, 'from_red_hall', [12, 5]) }); },
      cp: cpRed
    });
    if (api.room() === R.foyer) await api.think('The jewel door. It\'s ajar. Somebody has wedged it open with a folded slipper.');
    await sneak(api, {
      objective: 'Go out the front door.',
      done: function () { return api.room() === R.grounds; },
      autoplay: async function (a) { await a.goRoom(R.grounds, { at: at(R.grounds, 'from_foyer', [13, 23]) }); },
      cp: cpRed
    });

    // ---- C: the garden ----
    await api.think('Damp, warm air on my face. My first instinct is to run: past the House, over the gate, all the way to Columbus.');
    await api.think('But the chip in my arm would have me dead by morning, and they\'d punish Waverly for it. No. Find out who\'s at that fence.');
    SN.guards = ['ch08_hippo'];
    snHint(['THE GARDEN', 'A True Believer walks the west path.', 'Floodlights are on motion sensors: creep through them.', 'The figures are at the north fence, east side.'], 12);
    await sneak(api, {
      objective: 'Find the figures at the north fence.',
      target: 'ch08_fence_approach',
      done: function (f) { return !!f.ch08_atFence; },
      cp: [R.grounds, at(R.grounds, 'from_foyer', [13, 23]), 'down'],
      onCaught: function (a) { a.set('ch08_atFence', false); }
    });
    api.objective(null);
    snStop();
  }

  /* =====================================================================
   * PART 4: Kessie and Elephant at the fence, the keypad
   * ===================================================================== */
  async function fence(api) {
    var K = 'ch08_kessie', E = 'ch08_elephant';
    await api.pan(K, 700);
    await api.say(E, 'There\'s nothing more I can tell you.', { name: '???', portrait: false });
    await api.narrate('I\'ve never heard that voice before. High and breathy, with a tinkle that makes me think of bells and glitter.');
    await api.say(K, 'Are you sure? Rebecca told me you\'d be able to give me more. I\'ve got the payment, I just need the information.');
    await api.think('I know that voice. Kessie.');
    await api.say(E, 'Let\'s see it then. You understand that I can\'t take this kind of risk without some assurance.', { name: '???', portrait: false });
    await api.narrate('A rustle. Kessie\'s hand passes something into the dark. I lean forward. If I could just get a little closer...');
    api.sound('hit'); await api.shake(250, 2);
    await api.narrate('SNAP.');
    await api.emote(E, '!', 800); await api.emote(K, '!', 600);
    await api.say(E, 'What was that? Is someone there?', { name: '???', portrait: false });
    await api.narrate('She stalks the bushes, giving each one a shake or a kick. Her search is too careful. There\'s no way out. Only one option left: bluff.');
    await api.cameraReset(500);
    api.teleport([42, 4], 'right');
    await api.narrate('I stand up. Kessie\'s hand flies to her mouth. The other woman wears the robes and the gloves, but no mask. A grey braid. Elephant: the one who manhandles us all a little less than the others.');
    await api.say('luna', 'You. Why?');
    await api.think('Very eloquent, Luna. Really knocked them out of the park.');
    await api.say(K, 'How did you get out, honey?', { mood: 'fear' });
    await api.say('luna', 'My door was unlocked.');
    await api.narrate('Kessie and Elephant exchange a look. They don\'t know how that happened either.');
    await api.say(E, 'She\'s seen my face. We silence her. Now.', { name: 'Elephant', mood: 'angry' });
    await api.move(E, [api.playerTile().x + 1, api.playerTile().y], { speed: 50 });
    var c = await api.choice([
      '"I sleepwalk. Always have. Tomorrow I won\'t remember a thing."',
      '"Touch me and I scream. Your loop won\'t cover that."',
      '"I don\'t care what you\'re doing. I just want to get my daughter out."'
    ], { prompt: 'Bluff.' });
    api.set('ch08_bluff', c);
    if (c === 0) await api.say(E, 'Sleepwalkers don\'t ask why.', { name: 'Elephant', mood: 'smug' });
    else if (c === 1) { await api.say(E, '...She knows about the loop.', { name: 'Elephant', mood: 'shock' }); api.add('m_kessie', 0); }
    else await api.say(E, 'Everybody\'s got a daughter. Everybody\'s got a reason.', { name: 'Elephant' });
    await api.say(K, 'Wait. It\'s okay. We can trust her. I know the kind of person she is.');
    await api.say(K, 'Look at her. Is this what the organization stands for? Hurting innocent single mothers trapped in a death game?', { mood: 'angry' });
    await api.say(E, 'I didn\'t sign up for this. Payment or no payment, I\'m outta here.', { name: 'Elephant', mood: 'fear' });
    await api.say(K, 'Wait. I\'ll take care of this. Let\'s meet later to discuss it some more. I\'ve gone to a lot of trouble to get everything you asked for.');
    await api.narrate('Something hungry crosses Elephant\'s face, and is gone.');
    await api.say(E, 'Everything, huh? That\'s pretty impressive. Fine. You know how to contact me. But there better not be any problems. It\'s all of our heads on the line, now.', { name: 'Elephant' });
    await api.say('luna', 'I am still here. And given that my neck is on the same chopping block, I\'d love to know what you two keep dancing around.', { mood: 'angry' });
    await api.say(K, 'Go. I\'ll take care of it.');
    await api.move(E, [49, 3]);
    api.remove('ch08_mask');
    api.setSpec(E, 'elephant');
    api.sound('reveal');
    await api.narrate('She picks something up off the ground. When she straightens, the gold elephant mask is back on, sparkling dangerously in the first grey light of dawn.');
    await api.say(E, 'You better.', { name: 'Elephant' });
    var gap = at(R.grounds, 'fence_gap', [44, 3]);
    await api.move(E, [gap[0], gap[1]]);
    await api.move(E, [gap[0], gap[1] - 2]);
    api.hide(E);
    await api.say(K, 'We should get inside. We\'ll get caught if we stay out here much longer.');
    await api.say('luna', 'Answers, first.', { mood: 'angry' });
    await api.say(K, 'I know where we can go without being overheard. Inside, first.');
    api.set('ch08_fenceDone', true);
    // keypad
    await api.fadeOut(500);
    api.remove(K); api.remove(E); api.remove('ch08_hippo');
    var door = at(R.grounds, 'from_foyer', [13, 23]);
    api.teleport([door[0], door[1]], 'up');
    api.addNpc({ id: 'ch08_kessie_k', at: [door[0] + 2, door[1]], spec: 'kessie', facing: 'up' });
    await api.fadeIn(500);
    await api.narrate('The jewel door has swung shut behind us. Locked. The keypad glows beside it.');
    await api.say('luna', 'Now what? I don\'t suppose you have the code?');
    await api.say('ch08_kessie_k', 'Close your eyes. If it gets out that I shared this, I\'ll lose any chance of further info.', { mood: 'tired' });
    var e = await api.choice(['(Close your eyes. Turn your back so she can see you mean it.)', '(Squint. Just a little.)']);
    if (e === 1) await api.say('ch08_kessie_k', 'Eyes, honey. All the way.', { mood: 'neutral' });
    else api.add('m_kessie', 2);
    await api.fadeOut(200);
    for (var i = 0; i < 4; i++) { api.sound('blip'); await api.wait(380); }
    api.sound('confirm');
    await api.wait(700);
    await api.narrate('Four taps. A whir. We\'re in.');
  }

  /* =====================================================================
   * PART 5: The Green Room
   * ===================================================================== */
  async function greenRoom(api) {
    var K = 'ch08_kessie_g';
    await api.goRoom(R.green, { at: at(R.green, 'center', [4, 4]), facing: 'down', stayDark: true });
    api.addNpc({ id: K, at: at(R.green, 'kessie_spot', [4, 5]), spec: 'kessie', facing: 'up' });
    api.face('player', K);
    await api.fadeIn(600);
    await api.narrate('Kessie leads me through a series of turns to an innocent-looking blue door. Inside: green walls, green floor, green ceiling, not a stick of furniture. Like swimming through algae.');
    await api.say(K, 'Welcome to the green room. They were going to do the private interviews in here, but the board decided to just film things as they happen. No cameras. No mics. We can talk safely here.');
    await api.say('luna', 'Who are you? Do you work for the producers?');
    await api.say(K, 'Never. I\'m a contestant just like you.', { mood: 'fear' });
    var kTrust = api.get('m_kessie', 25);
    if (kTrust >= 45) {
      await api.say(K, 'You deserve answers. I\'ve been meaning to talk to you for a bit anyways. I\'ve just been putting it off.', { mood: 'sad' });
    } else {
      await api.say(K, 'It\'s late, honey. We\'ll talk another time. I promise.', { mood: 'tired' });
      for (var pleas = 0; ; pleas++) {
        var t = await api.choice(['"Tell me, or I tell Trader you\'re cheating. Him and the whole country."', { text: '"Please. I need to know."', if: function () { return pleas < 1; } }]);
        if (t === 0) { api.add('m_kessie', -5); api.set('ch08_threatened', true); await api.say(K, '...You would, too. You\'re so much like her when you set your jaw like that.', { mood: 'sad' }); break; }
        await api.say(K, 'Another time.', { mood: 'sad' });
        await api.think('She\'s going to walk out that door. Unless I make it cost her more to leave than to stay.');
      }
    }
    await api.narrate('She sags against the wall. I sit down next to her, shoulder to shoulder.');
    await api.say('luna', 'I want to know.');
    await api.say(K, 'Of course you do. You\'re so much like your mother.', { mood: 'sad' });
    api.sound('sting');
    await api.say('luna', 'You knew my mother?', { mood: 'shock' });
    await api.say(K, 'Let me start at the beginning.');
    await api.say(K, ['When I was about your age, I had my first and only child. A little boy named Deandre. Such a smart kid. Not unlike your Waverly, from what you\'ve told me.', 'I worked myself to the bone so he might go to school one day and use those talents of his.']);
    await api.say(K, 'You have a daughter, so I don\'t have to tell you about the yearly checkups. But have you ever wondered what they\'re actually testing for?');
    await api.say(K, ['After his three year old checkup, the doctor called me inside for a chat. When I went in, Deandre wasn\'t there anymore.', 'He said my boy had accelerated. That in order to foster his growth, the state was going to send him to a special training school.'], { mood: 'angry' });
    await api.say('luna', 'Not...', { mood: 'fear' });
    await api.say(K, 'Yes. They may as well have ripped out my heart the day they sent my son to be trained as a true believer.', { mood: 'cry' });
    var asked = {};
    var topics = [
      { k: 'tb', text: 'Ask about the True Believer at the fence.' },
      { k: 'mv', text: 'Ask about "Rebecca" and the payment.' },
      { k: 'mom', text: 'Ask about your mother.' }
    ];
    while (!(asked.tb && asked.mv && asked.mom)) {
      var opts = topics.filter(function (o) { return !asked[o.k]; });
      var i = await api.choice(opts.map(function (o) { return o.text; }));
      var k = opts[i].k; asked[k] = true;
      if (k === 'tb') {
        await api.say(K, 'Her name isn\'t mine to give. You know her by the elephant. She loops the cameras on the nights I need them looped.');
        await api.say(K, 'And on the side, I pay her for news of my boy. Every scrap. Where they sent him. What they call him now.', { mood: 'sad' });
        await api.think('Tonight\'s unlocked door. The steady dots in the hall. That was her.');
      } else if (k === 'mv') {
        await api.say(K, 'After they took him, I talked to anyone rumoured to know things. They sent me to others. Eventually I ended up with people who were willing to listen.');
        await api.say(K, 'An underground. Rebecca is the only name I\'ve got. They promised me they\'d get me out, and take me straight to my son, if I did one thing for them.');
        await api.say('luna', 'What thing?');
        await api.say(K, 'Kill Judge Johnson. On a live broadcast.', { mood: 'angry' });
        await api.say(K, 'I robbed a bank on purpose to get onto Trader\'s list. Fifty-four years old, holding up a teller with a water pistol.', { mood: 'smug' });
        await api.think('Kessie. Sweet, smothering Kessie, with her yellow gloves and her apron. A killer in waiting.');
      } else {
        await api.say(K, 'Honey, she was your mother. From the moment I saw you, I knew you were the little girl she spoke about with so much love.', { mood: 'sad' });
        await api.think('Love? My memories show a woman who would stab someone in the back. A man\'s face, blood dribbling down his chin...');
        await api.say(K, 'She worked as a nurse at the Nursery. Where they take children like my Deandre to make them into what they become.');
        await api.say(K, 'I appealed to her as a mother. I asked her how it would feel if her daughter was ripped away from her without warning. And then I asked her to help me bring my son home.');
        await api.say(K, 'She resisted at first, but she came around. We made a plan. I had friends who would hide us all. Me, Deandre, you, and your mother.');
        api.sound('static');
        await api.slides([{ style: 'montage', title: 'MEMORY', text: '"Pack a bag. Anything you want to take with you."' }]);
        await api.think('The night before she was taken. How did I forget that?');
        await api.say(K, 'She didn\'t make it. They caught her before she even made it out the door. I waited at the meeting point all night and most of the next day. When I saw her on the tv the next week, I knew for sure.', { mood: 'cry' });
        await api.say(K, 'I\'m sorry. I never meant to take your momma away from you, I\'m sorry.', { mood: 'cry' });
        await api.narrate('She sinks to her knees. I watch her the way you\'d watch someone through a pane of glass.');
      }
    }
    await api.say(K, 'Please, honey. If anyone finds out, they\'ll never let me near him. Promise me you\'ll keep this between us.', { mood: 'cry' });
    var p = await api.choice(['"I promise."', '"I\'ll think about it."']);
    if (p === 0) { api.add('m_kessie', 10); api.set('ch08_promised', true); await api.say(K, 'Bless you. Bless you, child.', { mood: 'sad' }); }
    else { api.add('m_kessie', -10); await api.say(K, 'That\'s... fair. That\'s fair.', { mood: 'cry' }); }
    await api.narrate('Away. From me. The glass shatters, and my heart along with it. Everything goes sharp: the green, her small hiccuping sobs.');
    api.sound('sting'); await api.shake(400, 3);
    await api.narrate('I run.');
  }

  /* =====================================================================
   * PART 6: The run, Annette, the tea
   * ===================================================================== */
  async function runAndTea(api) {
    api.set('ch08_running', true);
    api.ambient('tension');
    await api.goRoom(R.hall, { at: at(R.hall, 'from_foyer', [3, 2]), facing: 'right' });
    player().speed = 112;
    await api.think('Kessie\'s shouting my name somewhere behind me. I don\'t have a destination. I just know I have to go.');
    api.objective('Run.');
    await api.waitForZone('ch08_isaiah_zone', { objective: 'Run.' });
    var door7 = at(R.hall, 'from_isaiah_room', [24, 1]);
    api.addNpc({ id: 'ch08_isaiah', at: door7, spec: 'isaiah', facing: 'left' });
    await api.say('ch08_isaiah', 'Luna? It\'s not even six. Are you...', { mood: 'tired' });
    await api.narrate('I push past him. He catches himself on the doorframe, rubbing his eyes, and stares after me.');
    api.remove('ch08_isaiah');
    await api.waitForZone('ch08_annette_zone', { objective: 'Run.' });
    api.objective(null);
    var pt = api.playerTile();
    api.addNpc({ id: 'ch08_annette', at: [pt.x + 1, pt.y], spec: 'annette', facing: 'left' });
    api.sound('hit'); await api.shake(350, 4);
    await api.narrate('And I run straight into Annette. She can\'t catch herself like Isaiah did. Her cane slips, and she lands on her bony bottom with a surprised cry.');
    await api.say('luna', 'Oh God. Annette, I\'m sorry, I\'m so sorry, are you hurt?', { mood: 'cry' });
    await api.say('ch08_annette', 'Are you quite alright, dear? You seem a bit... out of sorts.', { mood: 'neutral' });
    await api.narrate('I start to cry. Small tears first, then sobs I can\'t stop.');
    await api.say('ch08_annette', 'Oh my. I suppose you better come with me.', { mood: 'sad' });
    player().speed = 72;
    api.set('ch08_running', false);
    await api.fadeOut(500);
    await api.goRoom(R.annette, { at: [5, 4], facing: 'left', stayDark: true });
    api.addNpc({ id: 'ch08_annette_r', at: [4, 4], spec: 'annette', facing: 'right' });
    await api.fadeIn(600);
    api.ambient('hum');
    await api.narrate('She settles me on her bed and wraps me in a blanket.');
    await api.say('ch08_annette_r', 'I\'ll go make some tea. And then I\'ll come back and we can have a chat about what\'s got you in this state.', { mood: 'happy' });
    var dr = at(R.annette, 'door', [3, 6]);
    await api.move('ch08_annette_r', dr);
    api.hide('ch08_annette_r');
    api.sound('door');
    await api.think('The first time I\'ve been in another contestant\'s room. Same bones as mine. But she\'s made it hers.');
    var bedId = hasShared(R.annette) ? 'bed' : 'ch08_an_bed';
    api.objective('Look around. Sit back down on the bed when you\'re ready.', { target: bedId });
    await api.waitForInteract(bedId);
    api.objective(null);
    await api.think('So this is what Annette does with her spare time. Well. We all need a way to cope.');
    api.sound('door');
    api.show('ch08_annette_r');
    await api.move('ch08_annette_r', [4, 4]);
    api.face('ch08_annette_r', 'player');
    await api.narrate('She comes back with two steaming mugs and hands me one. It warms my palms.');
    var d = await api.choice(['(Drink.)', '(Just hold it.)']);
    if (d === 1) await api.say('ch08_annette_r', 'Drink up, dear. It\'s only chamomile. Did you wonders, it will.', { mood: 'happy' });
    await api.narrate('A sip sends heat through my whole body. I take another. It helps.');
    teaFx(true, 0.25);
    await api.narrate('She clambers up onto the bed beside me: cane, a push, a haul, a grip on the mattress.');
    await api.say('ch08_annette_r', 'Tell Annette what happened.', { mood: 'neutral' });
    await api.choice(['"It\'s nothing. The competition\'s getting to me."', '"It\'s Carol. I keep seeing Carol."'], { prompt: 'Tell her it\'s nothing.' });
    await api.think('I open my mouth to tell her it\'s nothing. What actually comes out is:');
    await api.say('luna', 'My mother died when I was just a kid, and I just found out who did it.', { mood: 'cry' });
    teaFx(true, 0.4);
    await api.say('ch08_annette_r', 'Oh? Just here and now? That certainly is a coincidence.');
    await api.say('luna', 'I hate her.');
    await api.say('ch08_annette_r', 'Your mother?');
    await api.choice(['"No. Nobody. Forget it."', '"I\'m just tired."'], { prompt: 'Don\'t say her name.' });
    await api.say('luna', 'Well, yes, her too. But I was talking about Kessie. It\'s all her fault.', { mood: 'angry' });
    await api.think('That isn\'t... I didn\'t pick that. Did I?');
    teaFx(true, 0.55);
    await api.say('ch08_annette_r', 'Are you saying that Kessie had something to do with your mother\'s death?');
    await api.narrate('She toddles closer and puts her arms around me. Even with me sitting, we\'re about the same height.');
    var h = await api.choice(['(Let her hold you.)', '(Pull away.)']);
    if (h === 1) await api.narrate('I mean to pull away. My arms don\'t get the message.');
    api.add('m_annette', 5);
    await api.narrate('A proper hug. The kind that squeezes the breath out of you and leaves you feeling safe.');
    await api.say('ch08_annette_r', 'I\'m sorry your momma died. If you were my girl, I\'d never have left you no matter what another bitch said.', { mood: 'sad' });
    await api.say('luna', 'She\'s selfish. Cruel. She pretends to be sweet, but she uses people and destroys their lives.', { mood: 'angry' });
    await api.say('ch08_annette_r', 'I always thought so meself, but no other bodies seemed to see through her, so I kept that little tidbit of a thought quiet.');
    await api.say('luna', 'I wish you hadn\'t. I never liked her, but I couldn\'t tell why. I could\'ve done with some warning.');
    teaFx(true, 0.8);
    await api.say('ch08_annette_r', 'You seem confused. Why don\'t you tell old Annette here the whole story, and we\'ll see if I can use my many years of experience to help you figure it all out.', { mood: 'smug' });
    await api.narrate('Her room becomes a bed of clouds, and she is the sun come down to earth to shine on me. Her tongue is a serpent\'s. These aren\'t my thoughts. Does it matter? She\'s the sun.');
    var r = await api.minigame('tea', {
      autoResisted: 1,
      questions: [
        { ask: 'Who was she talking to, dear? Out there at the fence?', resist: 'I didn\'t see. It was dark.', tell: 'A True Believer. The elephant.', tellSay: 'A True Believer. The elephant one. Her mask was off.', slip: 1.4 },
        { ask: 'And what does our Kessie want, hm?', resist: '...I\'m tired, Annette.', tell: 'Her son. They took her son.', tellSay: 'Her son. They took him when he was three. She wants him back.', invert: true, slip: 1.1 },
        { ask: 'Who does she want dead?', resist: 'Nobody wants anybody dead.', tell: 'The Judge. On live TV.', tellSay: 'The Judge. She\'s going to kill the Judge, on live TV.', swap: true, slip: 0.9 },
        { ask: 'No one will love you the way I do so tell me everything you hold in that little noggin of yours my dear.', final: true, tellSay: '...everything.' }
      ]
    });
    var n = Math.max(0, Math.min(3, r.resisted || 0));
    api.set('n_tea_resisted', n);
    api.set('f_kessie_secret_told', true);
    await api.slides([
      { style: 'montage', title: 'SNIPPETS', text: 'Annette holding my hand while I sob out the whole story.' },
      { style: 'montage', title: 'SNIPPETS', text: 'Her practically forcing more tea down my throat while I clamp my jaw shut like the little baby I want to be.' },
      { style: 'montage', title: 'SNIPPETS', text: 'Her stroking my hair, and me thinking: this is what it feels like to be safe. I never knew.' }
    ]);
    teaFx(false);
    await api.fadeOut(900);
  }

  /* =====================================================================
   * PART 7: Morning
   * ===================================================================== */
  async function morning(api) {
    api.setPlayer('luna_night');
    await api.titleCard('Monday, 22 January', 'Morning', 2000);
    await api.goRoom(R.luna, { at: at(R.luna, 'center', [4, 5]), facing: 'down' });
    await api.narrate('I don\'t remember getting back to my own room. But I wake up there, soaked in sweat.');
    await api.think('Had I really talked to Annette? Did I even talk to Kessie? Could the whole thing have been some kind of fever dream?');
    var n = api.get('n_tea_resisted', 0);
    await api.think(n >= 2 ? 'I held something back. I\'m almost sure I held something back.' : n === 1 ? 'I think I kept one thing to myself. I can\'t remember which.' : 'I think I told her everything. I think I told her everything.');
    await api.think('"No one will love you the way I do." Whose voice was that?');
    await api.narrate('I lie there for twenty minutes, clutching the sheets, not moving an inch.');
    api.sound('door');
    await api.say('ginerva', 'Miss Bartley. Up. The cameras are waiting.', { mood: 'neutral' });
    await api.think('Same voice as last night. "Goodnight, Trey." She doesn\'t look at me any differently. I don\'t think she knows. I hope she doesn\'t know.');
  }

  /* =====================================================================
   * REGISTRATION
   * ===================================================================== */
  G.registerChapter({
    id: 'ch08',
    title: 'The Night Door',
    kicker: 'WEEK 2 • SATURDAY',
    maps: MAPS,
    props: PROPS,
    minigames: MINIGAMES,
    testDefaults: { m_audience: 40, m_kessie: 25, m_annette: 40, m_trader_insight: 0 },

    start: async function (api) {
      SN.fails = 0; FT.on = false; teaFx(false); snStop();
      await carolVignette(api);
      await oneOnOne(api);
      await nightDoor(api);
      await fence(api);
      await greenRoom(api);
      await runAndTea(api);
      await morning(api);
      snStop(); teaFx(false);
      api.completeChapter();
    }
  });
})();
