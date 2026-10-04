/* =========================================================================
 * world.js: the explorable world: current room, player, NPCs, objects,
 * zones, exits, camera, collisions, interaction, autopilot (auto mode).
 *
 * Coordinates: entities store pixel positions of their FEET (x = centre,
 * y = bottom). Tile (tx,ty) <-> pixel: x = tx*16+8, y = ty*16+13.
 * ========================================================================= */
(function () {
  'use strict';
  var G = window.G;
  var U = G.util;
  var T = G.TILE;
  var W = (G.World = {});

  W.active = false;      // a room is loaded and the world is drawn
  W.room = null;         // built room (see Map.build) + runtime lists
  W.roomState = {};      // per-session persistent room changes: mapId -> {added:[], removed:{}, entered:n}
  W.npcs = []; W.objects = []; W.zones = []; W.exits = [];
  W.t = 0;
  W.waiters = [];        // {type, id, resolve}
  W.player = { x: 0, y: 0, dir: 'down', frame: 0, animT: 0, moving: false, spec: 'luna', visible: true, speed: 72 };
  W.cam = { x: 0, y: 0, follow: null, pan: null, shakeT: 0, shakeMag: 0, ox: 0, oy: 0 };
  W.lockMove = 0;        // >0 = player cannot move (cutscene)
  W.lastTile = null;
  W.zoneInside = {};

  W.tileToPx = function (tx, ty) { return { x: tx * T + 8, y: ty * T + 13 }; };
  W.pxToTile = function (x, y) { return { x: Math.floor(x / T), y: Math.floor((y - 2) / T) }; };
  W.playerTile = function () { return W.pxToTile(W.player.x, W.player.y); };

  function xy(a) { // accept [x,y] or {x,y}
    if (!a) return null;
    if (Array.isArray(a)) return { x: a[0], y: a[1] };
    return { x: a.x, y: a.y };
  }
  W.xy = xy;

  /* ---------------- room loading ---------------- */
  W.resetSession = function () {
    W.roomState = {}; W.room = null; W.active = false; W.npcs = []; W.objects = []; W.zones = []; W.exits = [];
    W.waiters = []; W.lockMove = 0; W.cam.follow = null; W.cam.pan = null; W.cam.shakeT = 0;
    W.player.spec = 'luna'; W.player.visible = true; W.player.dir = 'down'; W.player.speed = 72;
    W.zoneInside = {};
  };
  /** Record a runtime-added def, replacing any earlier def with the same id. */
  function pushAdded(st, def) { st.added = st.added.filter(function (a) { return a.id !== def.id; }); st.added.push(def); delete st.removed[def.id]; }
  function rs(id) { return (W.roomState[id] = W.roomState[id] || { added: [], removed: {}, entered: 0, moved: {} }); }

  /**
   * Load a room (no fade; the script layer handles transitions).
   * opts: {at:[x,y], facing:'down'}
   */
  W.load = function (mapId, opts) {
    opts = opts || {};
    var def = G.lookup('maps', mapId);
    if (!def) throw new Error('Unknown map "' + mapId + '" (did you register it in your chapter\'s maps?)');
    var room = G.Map.build(def);
    W.room = room;
    W.active = true;
    var st = rs(def.id);
    st.entered++;
    // entities
    W.npcs = []; W.objects = []; W.zones = []; W.exits = [];
    var check = G.Script.check;
    // a runtime-added def shadows a map-defined entity with the same id (re-add after remove = one copy)
    var addedIds = {}; st.added.forEach(function (a) { addedIds[a.id] = true; });
    function base(list) { return (list || []).filter(function (e) { return !addedIds[e.id]; }); }
    base(def.npcs).concat(st.added.filter(function (a) { return a.kind !== 'object'; })).forEach(function (n) {
      if (st.removed[n.id]) return;
      if (n.if != null && !check(n.if)) return;
      W.npcs.push(makeNpc(n, st));
    });
    base(def.objects).concat(st.added.filter(function (a) { return a.kind === 'object'; })).forEach(function (o) {
      if (st.removed[o.id]) return;
      if (o.if != null && !check(o.if)) return;
      var p = xy(o.at || o);
      W.objects.push({ id: o.id, kind: 'object', def: o, tx: p.x, ty: p.y, prop: o.prop || o.sprite || null, solid: o.solid != null ? o.solid : !!(o.prop || o.sprite) && o.prop !== 'note' && o.prop !== 'key' && o.prop !== 'sparkle', visible: true, layer: o.layer || 0 });
    });
    (def.zones || []).forEach(function (z) {
      var p = xy(z.at || z);
      W.zones.push({ id: z.id, kind: 'zone', def: z, x: p.x, y: p.y, w: z.w || 1, h: z.h || 1, fired: 0 });
    });
    (def.exits || []).forEach(function (e) {
      var p = xy(e.at || e);
      W.exits.push({ id: e.id || ('exit_' + p.x + '_' + p.y), kind: 'exit', def: e, x: p.x, y: p.y, w: e.w || 1, h: e.h || 1 });
    });
    // player
    var at = xy(opts.at) || room.spawn;
    var pp = W.tileToPx(at.x, at.y);
    W.player.x = pp.x; W.player.y = pp.y;
    if (opts.facing) W.player.dir = opts.facing;
    W.player.moving = false; W.player.frame = 0;
    W.lastTile = { x: at.x, y: at.y };
    W.arrivalTile = { x: at.x, y: at.y }; // exits on the arrival tile don't fire until you step off
    W.zoneInside = {};
    W.zones.forEach(function (z) { if (inRect(at.x, at.y, z)) W.zoneInside[z.id] = true; });
    W.cam.pan = null; W.cam.follow = null;
    W.snapCamera();
    return room;
  };

  function makeNpc(n, st) {
    var p = xy(n.at || n);
    if (st && st.moved[n.id]) p = st.moved[n.id];
    var pp = W.tileToPx(p.x, p.y);
    return {
      id: n.id, kind: 'npc', def: n, spec: n.spec || n.sprite || n.id, x: pp.x, y: pp.y, homeX: p.x, homeY: p.y,
      dir: n.facing || n.dir || 'down', frame: 0, animT: 0, moving: false, queue: [], speed: n.speed || 40,
      behavior: n.wander ? 'wander' : n.path ? 'path' : 'static', pathIdx: 0, waitT: 1 + Math.random() * 2,
      visible: n.visible !== false, solid: n.solid !== false, emote: null, busy: 0, radius: n.radius || 2
    };
  }

  /** Find an entity (npc/object/zone/exit) in the current room by id. */
  W.find = function (id) {
    var lists = [W.npcs, W.objects, W.zones, W.exits];
    for (var i = 0; i < lists.length; i++) for (var j = 0; j < lists[i].length; j++) if (lists[i][j].id === id) return lists[i][j];
    return null;
  };
  W.npc = function (id) { for (var i = 0; i < W.npcs.length; i++) if (W.npcs[i].id === id) return W.npcs[i]; return null; };

  /** Search the running chapter's maps for an entity id. Returns {mapId, kind, def}. */
  W.locate = function (id) {
    var ns = G.ns();
    var maps = G.registry.maps;
    var keys = Object.keys(maps).filter(function (k) { return !ns || maps[k].ns === ns; });
    if (W.room) { var ci = keys.indexOf(W.room.def.id); if (ci >= 0) { keys.splice(ci, 1); keys.unshift(W.room.def.id); } }
    for (var i = 0; i < keys.length; i++) {
      var d = maps[keys[i]];
      var st = W.roomState[d.id];
      var lists = { npc: (d.npcs || []).concat(st ? st.added.filter(function (a) { return a.kind !== 'object'; }) : []), object: (d.objects || []).concat(st ? st.added.filter(function (a) { return a.kind === 'object'; }) : []), zone: d.zones || [], exit: d.exits || [] };
      for (var kind in lists) {
        var arr = lists[kind];
        for (var j = 0; j < arr.length; j++) {
          if (arr[j].id === id && !(st && st.removed[id]) && (arr[j].if == null || G.Script.check(arr[j].if))) return { mapId: d.id, kind: kind, def: arr[j] };
        }
      }
    }
    return null;
  };

  /* ---------------- runtime entity changes ---------------- */
  W.addNpc = function (def, mapId) {
    var id = mapId ? (G.lookupKey('maps', mapId) || mapId) : W.room && W.room.def.id;
    var st = rs(id);
    pushAdded(st, def);
    if (W.room && W.room.def.id === id) { W.npcs = W.npcs.filter(function (x) { return x.id !== def.id; }); var n = makeNpc(def, null); W.npcs.push(n); return n; }
    return null;
  };
  W.addObject = function (def, mapId) {
    def.kind = 'object';
    var id = mapId ? (G.lookupKey('maps', mapId) || mapId) : W.room && W.room.def.id;
    var st = rs(id);
    pushAdded(st, def);
    if (W.room && W.room.def.id === id) {
      W.objects = W.objects.filter(function (x) { return x.id !== def.id; });
      var p = xy(def.at || def);
      var o = { id: def.id, kind: 'object', def: def, tx: p.x, ty: p.y, prop: def.prop || def.sprite || null, solid: def.solid != null ? def.solid : !!(def.prop || def.sprite), visible: true };
      W.objects.push(o); return o;
    }
    return null;
  };
  W.remove = function (id, mapId) {
    var mid = mapId ? (G.lookupKey('maps', mapId) || mapId) : W.room && W.room.def.id;
    var st = rs(mid);
    st.removed[id] = true;
    st.added = st.added.filter(function (a) { return a.id !== id; });
    if (W.room && W.room.def.id === mid) {
      W.npcs = W.npcs.filter(function (n) { return n.id !== id; });
      W.objects = W.objects.filter(function (n) { return n.id !== id; });
    }
  };

  /* ---------------- collision ---------------- */
  function inRect(tx, ty, r) { return tx >= r.x && ty >= r.y && tx < r.x + r.w && ty < r.y + r.h; }
  W.solidTile = function (tx, ty) { return !W.room || G.Map.solidAt(W.room, tx, ty); };
  function boxFree(x, y, self) {
    // player/NPC feet box: 8 wide, 5 tall, ending at feet
    var x0 = x - 4, x1 = x + 3, y0 = y - 4, y1 = y;
    var pts = [[x0, y0], [x1, y0], [x0, y1], [x1, y1]];
    for (var i = 0; i < 4; i++) if (W.solidTile(Math.floor(pts[i][0] / T), Math.floor(pts[i][1] / T))) return false;
    for (var j = 0; j < W.npcs.length; j++) {
      var n = W.npcs[j];
      if (n === self || !n.visible || !n.solid) continue;
      if (Math.abs(n.x - x) < 9 && Math.abs(n.y - y) < 6) return false;
    }
    if (self !== W.player && W.player.visible) {
      if (Math.abs(W.player.x - x) < 9 && Math.abs(W.player.y - y) < 6) return false;
    }
    for (var k = 0; k < W.objects.length; k++) {
      var o = W.objects[k];
      if (!o.solid || !o.visible) continue;
      var ox = o.tx * T, oy = o.ty * T;
      if (x1 >= ox + 2 && x0 < ox + T - 2 && y1 >= oy + 4 && y0 < oy + T - 1) return false;
    }
    return true;
  }
  W.boxFree = boxFree;
  /** Tile free for standing (no solid tile, npc or solid object). */
  W.tileFree = function (tx, ty, ignore) {
    if (W.solidTile(tx, ty)) return false;
    var p = W.tileToPx(tx, ty);
    for (var j = 0; j < W.npcs.length; j++) { var n = W.npcs[j]; if (n !== ignore && n.visible && n.solid && Math.abs(n.x - p.x) < 9 && Math.abs(n.y - p.y) < 8) return false; }
    for (var k = 0; k < W.objects.length; k++) { var o = W.objects[k]; if (o !== ignore && o.solid && o.visible && o.tx === tx && o.ty === ty) return false; }
    return true;
  };

  /** BFS path on tiles (ignores NPCs). Returns array of {x,y} excluding start, or null. */
  W.findPath = function (from, to, maxN) {
    if (!W.room) return null;
    var w = W.room.w, h = W.room.h;
    var key = function (x, y) { return y * w + x; };
    var prev = {}, q = [from], seen = {};
    seen[key(from.x, from.y)] = true;
    var n = 0;
    while (q.length && n++ < (maxN || 5000)) {
      var c = q.shift();
      if (c.x === to.x && c.y === to.y) {
        var path = [], k = key(c.x, c.y);
        while (k !== key(from.x, from.y)) { path.unshift({ x: k % w, y: Math.floor(k / w) }); k = prev[k]; }
        return path;
      }
      var nb = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      for (var i = 0; i < 4; i++) {
        var nx = c.x + nb[i][0], ny = c.y + nb[i][1];
        if (nx < 0 || ny < 0 || nx >= w || ny >= h || seen[key(nx, ny)]) continue;
        if (W.solidTile(nx, ny) && !(nx === to.x && ny === to.y)) continue;
        seen[key(nx, ny)] = true; prev[key(nx, ny)] = key(c.x, c.y);
        q.push({ x: nx, y: ny });
      }
    }
    return null;
  };

  /* ---------------- movement helpers ---------------- */
  function dirOf(dx, dy) { return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'); }
  W.dirOf = dirOf;
  /** Move an actor (npc or player) to a tile along a path. Resolves when arrived. */
  W.walkTo = function (actor, tile, opts) {
    opts = opts || {};
    var from = W.pxToTile(actor.x, actor.y);
    var path = opts.direct ? [tile] : (W.findPath(from, tile) || [tile]);
    return new Promise(function (resolve) {
      if (G.auto || opts.instant) {
        var p = W.tileToPx(tile.x, tile.y);
        if (path.length) { var last = path[path.length - 1], prev = path.length > 1 ? path[path.length - 2] : from; actor.dir = dirOf(last.x - prev.x, last.y - prev.y); }
        actor.x = p.x; actor.y = p.y; actor.queue = []; actor.moving = false;
        if (actor.kind === 'npc') rememberNpc(actor);
        setTimeout(resolve, 0); return;
      }
      actor.queue = path.map(function (t) { return W.tileToPx(t.x, t.y); });
      actor.onArrive = function () { if (actor.kind === 'npc') rememberNpc(actor); resolve(); };
      actor.moveSpeed = opts.speed || (actor === W.player ? 60 : actor.speed || 40);
      if (!actor.queue.length) { actor.onArrive = null; resolve(); }
    });
  };
  function rememberNpc(n) { if (W.room) rs(W.room.def.id).moved[n.id] = W.pxToTile(n.x, n.y); }

  function stepQueue(a, dt) {
    if (!a.queue || !a.queue.length) return false;
    var tgt = a.queue[0];
    var dx = tgt.x - a.x, dy = tgt.y - a.y;
    var d = Math.sqrt(dx * dx + dy * dy);
    var sp = (a.moveSpeed || 40) * dt;
    if (d <= sp) {
      a.x = tgt.x; a.y = tgt.y; a.queue.shift();
      if (!a.queue.length) { a.moving = false; var cb = a.onArrive; a.onArrive = null; if (cb) cb(); return true; }
    } else {
      a.x += dx / d * sp; a.y += dy / d * sp;
      a.dir = dirOf(dx, dy);
    }
    a.moving = true;
    return true;
  }
  function animate(a, dt) {
    if (a.moving) {
      a.animT += dt;
      a.frame = Math.floor(a.animT / 0.14) % 4;
      a.frame = [1, 0, 2, 0][a.frame];
    } else { a.frame = 0; a.animT = 0; }
  }

  /* ---------------- update ---------------- */
  W.update = function (dt, inputAllowed) {
    if (!W.active) return;
    W.t += dt;
    var p = W.player;
    // scripted player movement
    if (stepQueue(p, dt)) { /* cutscene walking */ }
    else if (inputAllowed && W.lockMove <= 0 && !G.Script.busy()) {
      var d = G.Input.dir();
      if (d.x || d.y) {
        var len = Math.sqrt(d.x * d.x + d.y * d.y);
        var sp = p.speed * dt;
        var mx = d.x / len * sp, my = d.y / len * sp;
        var hd = d.x > 0 ? 'right' : 'left', vd = d.y > 0 ? 'down' : 'up';
        if (d.x && d.y) { if (p.dir !== hd && p.dir !== vd) p.dir = hd; }
        else p.dir = d.x ? hd : vd;
        var moved = false;
        if (mx && boxFree(p.x + mx, p.y, p)) { p.x += mx; moved = true; }
        else if (mx && !my) { // corner assist: slide around corners
          for (var k = 1; k <= 6; k++) {
            if (boxFree(p.x + mx, p.y - k, p) && boxFree(p.x, p.y - k, p)) { p.y -= Math.min(sp, 1); moved = true; break; }
            if (boxFree(p.x + mx, p.y + k, p) && boxFree(p.x, p.y + k, p)) { p.y += Math.min(sp, 1); moved = true; break; }
          }
        }
        if (my && boxFree(p.x, p.y + my, p)) { p.y += my; moved = true; }
        else if (my && !mx) {
          for (var k2 = 1; k2 <= 6; k2++) {
            if (boxFree(p.x - k2, p.y + my, p) && boxFree(p.x - k2, p.y, p)) { p.x -= Math.min(sp, 1); moved = true; break; }
            if (boxFree(p.x + k2, p.y + my, p) && boxFree(p.x + k2, p.y, p)) { p.x += Math.min(sp, 1); moved = true; break; }
          }
        }
        p.moving = moved;
        if (moved) { p.stepT = (p.stepT || 0) + dt; if (p.stepT > 0.3) { p.stepT = 0; G.Audio.play('step'); } }
      } else p.moving = false;
      if (G.Input.pressed('ok')) { G.Input.consume('ok'); W.tryInteract(); }
    } else if (!p.queue || !p.queue.length) p.moving = false;
    animate(p, dt);
    // tile triggers
    var pt = W.playerTile();
    if (!W.lastTile || pt.x !== W.lastTile.x || pt.y !== W.lastTile.y) {
      W.lastTile = pt;
      if (W.arrivalTile && (pt.x !== W.arrivalTile.x || pt.y !== W.arrivalTile.y)) W.arrivalTile = null;
      W.checkTriggers(pt);
    }
    // npcs
    W.npcs.forEach(function (n) {
      if (stepQueue(n, dt)) { animate(n, dt); return; }
      n.moving = false;
      if (n.busy <= 0 && !G.Script.busy()) {
        if (n.behavior === 'wander') {
          n.waitT -= dt;
          if (n.waitT <= 0) {
            n.waitT = 1.5 + Math.random() * 3;
            var dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]], dd = dirs[Math.floor(Math.random() * 4)];
            var ct = W.pxToTile(n.x, n.y), tx = ct.x + dd[0], ty = ct.y + dd[1];
            if (Math.abs(tx - n.homeX) <= n.radius && Math.abs(ty - n.homeY) <= n.radius && W.tileFree(tx, ty, n) && !playerOn(tx, ty)) {
              n.queue = [W.tileToPx(tx, ty)]; n.moveSpeed = n.speed * 0.6;
            } else n.dir = ['up', 'down', 'left', 'right'][Math.floor(Math.random() * 4)];
          }
        } else if (n.behavior === 'path') {
          n.waitT -= dt;
          if (n.waitT <= 0) {
            var path = n.def.path, wp = xy(path[n.pathIdx % path.length]);
            n.pathIdx++;
            var pth = W.findPath(W.pxToTile(n.x, n.y), wp) || [];
            n.queue = pth.map(function (t) { return W.tileToPx(t.x, t.y); });
            n.moveSpeed = n.speed * 0.7; n.waitT = n.def.pause != null ? n.def.pause : 1;
          }
        }
      }
      animate(n, dt);
    });
    // emotes expire
    W.npcs.concat([p]).forEach(function (a) { if (a.emote && a.emote.until < W.t) a.emote = null; });
    W.updateCamera(dt);
  };
  function playerOn(tx, ty) { var pt = W.playerTile(); return pt.x === tx && pt.y === ty; }

  W.checkTriggers = function (pt) {
    // exits
    if (!W.arrivalTile) {
      for (var i = 0; i < W.exits.length; i++) {
        var e = W.exits[i];
        if (inRect(pt.x, pt.y, e)) { G.Script.useExit(e); return; }
      }
    }
    // zones (edge-triggered)
    W.zones.forEach(function (z) {
      var inside = inRect(pt.x, pt.y, z);
      if (inside && !W.zoneInside[z.id]) {
        W.zoneInside[z.id] = true;
        G.Script.enterZone(z);
      } else if (!inside) W.zoneInside[z.id] = false;
    });
  };

  /* ---------------- interaction ---------------- */
  W.facingPoint = function () {
    var p = W.player, d = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[p.dir];
    return { x: p.x + d[0] * 11, y: p.y - 3 + d[1] * 11 };
  };
  /** The interactable entity the player is facing (or null). */
  W.facingEntity = function () {
    if (!W.active) return null;
    var fp = W.facingPoint();
    var best = null, bd = 1e9;
    var pt0 = W.playerTile(), dv = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[W.player.dir];
    var ftile = { x: pt0.x + dv[0], y: pt0.y + dv[1] };
    W.npcs.forEach(function (n) {
      if (!n.visible || !W.isInteractable(n)) return;
      var dx = n.x - fp.x, dy = (n.y - 4) - fp.y, d = dx * dx + dy * dy;
      var nt = W.pxToTile(n.x, n.y);
      // pixel reach near the facing point, OR the NPC stands on the tile the player faces
      var near = (Math.abs(dx) < 10 && Math.abs(dy) < 12) || (nt.x === ftile.x && nt.y === ftile.y && Math.abs(n.x - W.player.x) < 26 && Math.abs(n.y - W.player.y) < 26);
      if (near && d < bd) { best = n; bd = d; }
    });
    if (best) return best;
    var ft = { x: Math.floor(fp.x / T), y: Math.floor(fp.y / T) };
    var pt = W.playerTile();
    for (var i = 0; i < W.objects.length; i++) {
      var o = W.objects[i];
      if (!o.visible || !W.isInteractable(o)) continue;
      if ((o.tx === ft.x && o.ty === ft.y) || (o.tx === pt.x && o.ty === pt.y && !o.solid)) return o;
    }
    return null;
  };
  W.isInteractable = function (e) {
    var d = e.def;
    if (d.talk || d.examine || d.run || d.onInteract) return true;
    return W.waiters.some(function (w) { return w.type === 'interact' && w.id === e.id; });
  };
  W.tryInteract = function () {
    var e = W.facingEntity();
    if (e) G.Script.interact(e);
  };

  /* ---------------- waiters ---------------- */
  W.wait = function (type, id) {
    return new Promise(function (resolve) { W.waiters.push({ type: type, id: id, resolve: resolve, session: G.Game.session }); });
  };
  W.hasWaiter = function (type, id) { return W.waiters.some(function (w) { return w.type === type && w.id === id; }); };
  W.resolveWaiters = function (type, id, value) {
    var hit = false;
    W.waiters = W.waiters.filter(function (w) {
      if (w.type === type && w.id === id) { hit = true; if (w.session === G.Game.session) w.resolve(value); return false; }
      return true;
    });
    return hit;
  };

  /* ---------------- camera ---------------- */
  W.camTarget = function () {
    var c = W.cam;
    if (c.follow) {
      var f = typeof c.follow === 'string' ? W.npc(c.follow) : c.follow;
      if (f) return { x: f.x, y: f.y - 10 };
    }
    return { x: W.player.x, y: W.player.y - 10 };
  };
  function clampCam(x, y) {
    var rw = W.room.w * T, rh = W.room.h * T;
    var cx = rw <= G.W ? (rw - G.W) / 2 : U.clamp(x, 0, rw - G.W);
    var cy = rh <= G.H ? (rh - G.H) / 2 : U.clamp(y, 0, rh - G.H);
    return { x: cx, y: cy };
  }
  W.snapCamera = function () {
    if (!W.room) return;
    var t = W.camTarget();
    var c = clampCam(t.x - G.W / 2, t.y - G.H / 2);
    W.cam.x = c.x; W.cam.y = c.y;
  };
  W.updateCamera = function (dt) {
    if (!W.room) return;
    var c = W.cam, want;
    if (c.pan) {
      c.pan.t += dt;
      var k = U.ease(U.clamp(c.pan.t / c.pan.dur, 0, 1));
      want = clampCam(U.lerp(c.pan.fx, c.pan.tx, k), U.lerp(c.pan.fy, c.pan.ty, k));
      c.x = want.x; c.y = want.y;
      if (k >= 1 && c.pan.resolve) { var r = c.pan.resolve; c.pan.resolve = null; r(); }
    } else {
      var t = W.camTarget();
      want = clampCam(t.x - G.W / 2, t.y - G.H / 2);
      var f = 1 - Math.pow(0.0005, dt);
      c.x += (want.x - c.x) * f; c.y += (want.y - c.y) * f;
      if (Math.abs(want.x - c.x) < 0.3) c.x = want.x;
      if (Math.abs(want.y - c.y) < 0.3) c.y = want.y;
    }
    if (c.shakeT > 0) {
      c.shakeT -= dt;
      var m = (G.Save && G.Save.settings.shake === false) ? 0 : c.shakeMag;
      c.ox = (Math.random() * 2 - 1) * m; c.oy = (Math.random() * 2 - 1) * m;
    } else { c.ox = 0; c.oy = 0; }
  };
  /** Pan the camera to a pixel point (centre). Stays there until W.cam.pan = null. */
  W.panTo = function (px, py, ms) {
    var c = W.cam;
    return new Promise(function (resolve) {
      c.pan = { fx: c.x, fy: c.y, tx: px - G.W / 2, ty: py - G.H / 2, t: 0, dur: G.auto ? 0.0001 : (ms || 800) / 1000, resolve: resolve };
      if (G.auto) { var cc = clampCam(c.pan.tx, c.pan.ty); c.x = cc.x; c.y = cc.y; c.pan.resolve = null; setTimeout(resolve, 0); }
    });
  };

  /* ---------------- drawing ---------------- */
  W.draw = function () {
    if (!W.active || !W.room) return;
    var g = G.Render.px;
    var def = W.room.def;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = def.bg || '#07070a';
    g.fillRect(0, 0, G.W, G.H);
    var cx = Math.round(W.cam.x), cy = Math.round(W.cam.y);
    G.Map.draw(g, W.room, cx, cy, W.t);
    // drawables sorted by feet y
    var list = [];
    W.objects.forEach(function (o) { if (o.visible && (o.prop || o.def.draw)) list.push({ y: o.ty * T + (o.layer === -1 ? 0 : o.layer === 1 ? 99 : 12), o: o }); });
    W.npcs.forEach(function (n) { if (n.visible) list.push({ y: n.y, a: n }); });
    if (W.player.visible) list.push({ y: W.player.y + 0.1, a: W.player });
    list.sort(function (a, b) { return a.y - b.y; });
    list.forEach(function (it) {
      if (it.o) {
        var o = it.o, fn = o.def.draw || G.lookup('props', o.prop);
        if (fn) { try { fn(g, o.tx * T - cx, o.ty * T - cy, W.t, o); } catch (e) { G.reportError(e, 'prop ' + o.prop); o.prop = null; } }
        return;
      }
      var a = it.a;
      var sx = Math.round(a.x) - cx, sy = Math.round(a.y) - cy;
      g.fillStyle = 'rgba(0,0,0,0.35)';
      g.beginPath(); g.ellipse(sx, sy, 5, 2, 0, 0, Math.PI * 2); g.fill();
      var spr = G.Sprites.get(a.spec, a.dir, a.frame);
      g.drawImage(spr, sx - 8, sy - G.Sprites.H + 1);
    });
    // lighting
    if (def.dark) drawDarkness(g, def, cx, cy);
    if (def.tint) { g.fillStyle = U.rgba(def.tint, def.tintAlpha != null ? def.tintAlpha : 0.15); g.fillRect(0, 0, G.W, G.H); }
    // emotes + interaction hint
    W.npcs.concat([W.player]).forEach(function (a) {
      if (!a.emote || !a.visible) return;
      var sx = Math.round(a.x) - cx, sy = Math.round(a.y) - cy - G.Sprites.H - 6;
      drawBubble(g, sx, sy, a.emote.icon);
    });
    if (!G.Script.busy() && W.lockMove <= 0 && !G.auto) {
      var fe = W.facingEntity();
      if (fe) {
        var hx, hy;
        if (fe.kind === 'npc') { hx = Math.round(fe.x) - cx; hy = Math.round(fe.y) - cy - G.Sprites.H - 4; }
        else { hx = fe.tx * T + 8 - cx; hy = fe.ty * T - 4 - cy; }
        var bob = Math.round(Math.sin(W.t * 6));
        g.fillStyle = '#000'; g.fillRect(hx - 4, hy - 5 + bob, 9, 8);
        g.fillStyle = '#e8c15a'; g.fillRect(hx - 3, hy - 4 + bob, 7, 6);
        g.fillStyle = '#000'; g.fillRect(hx - 1, hy - 3 + bob, 3, 1); g.fillRect(hx - 1, hy - 1 + bob, 2, 1); g.fillRect(hx - 1, hy + 1 + bob, 3, 1); g.fillRect(hx - 1, hy - 3 + bob, 1, 5);
      }
    }
  };
  function drawBubble(g, x, y, icon) {
    g.fillStyle = '#000'; g.fillRect(x - 6, y - 7, 13, 11);
    g.fillStyle = '#f2efe8'; g.fillRect(x - 5, y - 6, 11, 9); g.fillRect(x - 1, y + 3, 2, 2);
    g.fillStyle = icon === '!' ? '#e8323c' : icon === '♥' ? '#e85a7a' : '#222';
    g.font = 'bold 8px monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(icon, x + 0.5, y - 1);
  }
  var darkC = null;
  function drawDarkness(g, def, cx, cy) {
    if (!darkC) { darkC = document.createElement('canvas'); darkC.width = G.W; darkC.height = G.H; }
    var d = darkC.getContext('2d');
    d.globalCompositeOperation = 'source-over';
    d.clearRect(0, 0, G.W, G.H);
    d.fillStyle = 'rgba(4,4,12,' + def.dark + ')';
    d.fillRect(0, 0, G.W, G.H);
    d.globalCompositeOperation = 'destination-out';
    var lights = (def.lights || []).map(function (l) { var p = xy(l.at || l); return { x: p.x * T + 8 - cx, y: p.y * T + 8 - cy, r: l.r || 48, flicker: l.flicker }; });
    if (def.playerLight !== 0) lights.push({ x: W.player.x - cx, y: W.player.y - 8 - cy, r: def.playerLight || 40 });
    lights.forEach(function (l) {
      var r = l.r * (l.flicker ? 0.9 + Math.random() * 0.1 : 1);
      var gr = d.createRadialGradient(l.x, l.y, 0, l.x, l.y, r);
      gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(0.6, 'rgba(0,0,0,0.6)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      d.fillStyle = gr; d.beginPath(); d.arc(l.x, l.y, r, 0, Math.PI * 2); d.fill();
    });
    g.drawImage(darkC, 0, 0);
  }

  /* ---------------- autopilot (auto mode) ----------------
   * Teleports the player to a target id and performs the natural action:
   * npc/object -> stand adjacent + interact; zone -> step in; exit -> step on;
   * 'room:<mapId>' -> go to the room.
   */
  W.autoReach = function (target) {
    if (typeof target === 'string' && target.indexOf('room:') === 0) {
      return G.Script.api().goRoom(target.slice(5));
    }
    var e = W.find(target);
    var chain = Promise.resolve();
    if (!e) {
      var loc = W.locate(target);
      if (!loc) { G.reportError(new Error('autoplay: cannot find target "' + target + '" in any map of this chapter'), 'auto'); return Promise.resolve(); }
      chain = G.Script.api().goRoom(loc.mapId, { fade: false });
    }
    return chain.then(function () {
      e = W.find(target);
      if (!e) { G.reportError(new Error('autoplay: target "' + target + '" not present after entering its room (check its if: condition)'), 'auto'); return; }
      if (e.kind === 'zone') { W.placePlayer(e.x, e.y); W.lastTile = W.playerTile(); W.zoneInside[e.id] = true; return G.Script.enterZone(e); }
      if (e.kind === 'exit') { W.placePlayer(e.x, e.y); W.arrivalTile = null; return G.Script.useExit(e); }
      var tx = e.kind === 'npc' ? W.pxToTile(e.x, e.y).x : e.tx, ty = e.kind === 'npc' ? W.pxToTile(e.x, e.y).y : e.ty;
      var spots = [[0, 1, 'up'], [-1, 0, 'right'], [1, 0, 'left'], [0, -1, 'down']], placed = false;
      for (var i = 0; i < spots.length; i++) {
        var sx = tx + spots[i][0], sy = ty + spots[i][1];
        if (W.tileFree(sx, sy)) { W.placePlayer(sx, sy); W.player.dir = spots[i][2]; placed = true; break; }
      }
      if (!placed) W.placePlayer(tx, ty + 1), W.player.dir = 'up';
      W.lastTile = W.playerTile(); W.arrivalTile = W.lastTile;
      return G.Script.interact(e);
    });
  };
  W.placePlayer = function (tx, ty) { var p = W.tileToPx(tx, ty); W.player.x = p.x; W.player.y = p.y; W.player.queue = []; };
})();
