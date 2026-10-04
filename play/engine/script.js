/* =========================================================================
 * script.js: the chapter API (`api`), the data-script runner, conditions,
 * interaction/zone/exit handling and the autoplay driver.
 *
 * Every chapter receives one `api` object (bound to its session). When a
 * chapter ends, all pending api promises of that session are abandoned
 * (never resolve), so stale code can't leak into the next chapter.
 * ========================================================================= */
(function () {
  'use strict';
  var G = window.G;
  var U = G.util;
  var S = (G.Script = {});
  var W = G.World;

  var busyCount = 0;
  S.busy = function () { return busyCount > 0; };
  /** Mark a promise as a blocking (cutscene) action: player can't move meanwhile. */
  function block(p) {
    busyCount++;
    var done = false;
    function end() { if (!done) { done = true; busyCount = Math.max(0, busyCount - 1); } }
    return Promise.resolve(p).then(function (v) { end(); return v; }, function (e) { end(); throw e; });
  }
  S.block = block;
  S.resetBusy = function () { busyCount = 0; };

  function flags() { return G.Game.state.flags; }

  /* ---------------- conditions ----------------
   * 'flag'            truthy
   * '!flag'           falsy
   * 'trust>=2'        comparison (>=, <=, >, <, ==, !=); RHS number, true/false, or bare word string
   * 'a && b', 'a || b'
   * function(flags, api) -> bool
   * {flag:'x', gte:2}  (eq, ne, gt, gte, lt, lte)
   * [cond, cond]       all
   */
  S.check = function (c) {
    if (c == null) return true;
    if (typeof c === 'boolean') return c;
    if (typeof c === 'function') { try { return !!c(flags(), S.api()); } catch (e) { G.reportError(e, 'condition'); return false; } }
    if (Array.isArray(c)) return c.every(S.check);
    if (typeof c === 'object') {
      var v = flags()[c.flag];
      if ('eq' in c) return v === c.eq;
      if ('ne' in c) return v !== c.ne;
      if ('gt' in c) return (v || 0) > c.gt;
      if ('gte' in c) return (v || 0) >= c.gte;
      if ('lt' in c) return (v || 0) < c.lt;
      if ('lte' in c) return (v || 0) <= c.lte;
      return !!v;
    }
    var s = String(c).trim();
    if (s.indexOf('||') >= 0) return s.split('||').some(function (p) { return S.check(p); });
    if (s.indexOf('&&') >= 0) return s.split('&&').every(function (p) { return S.check(p); });
    var m = s.match(/^([\w.]+)\s*(>=|<=|==|!=|>|<)\s*(.+)$/);
    if (m) {
      var a = flags()[m[1]], b = m[3].trim();
      var bv = b === 'true' ? true : b === 'false' ? false : b === 'null' ? null : isNaN(+b) ? b.replace(/^['"]|['"]$/g, '') : +b;
      if (typeof bv === 'number' && a == null) a = 0;
      switch (m[2]) {
        case '>=': return a >= bv; case '<=': return a <= bv; case '>': return a > bv; case '<': return a < bv;
        case '==': return a == bv; case '!=': return a != bv; // eslint-disable-line eqeqeq
      }
    }
    if (s.charAt(0) === '!') return !flags()[s.slice(1).trim()];
    return !!flags()[s];
  };

  /** Apply a `set` object: values assign; strings like '+1' / '-2' add. */
  S.applySet = function (obj) {
    if (!obj) return;
    var f = flags();
    Object.keys(obj).forEach(function (k) {
      var v = obj[k];
      if (typeof v === 'string' && /^[+-]\d+(\.\d+)?$/.test(v)) f[k] = S.numBase(k) + parseFloat(v);
      else f[k] = v;
    });
  };
  S.applyAdd = function (obj) {
    if (!obj) return;
    var f = flags();
    Object.keys(obj).forEach(function (k) { f[k] = S.numBase(k) + obj[k]; });
  };
  /** Numeric base for counters: the flag, else G.manifest.game.flagDefaults[k], else 0. */
  S.numBase = function (k) {
    var f = flags();
    if (f[k] !== undefined && f[k] !== null) return +f[k] || 0;
    var d = G.flagDefaults()[k];
    return d !== undefined ? (+d || 0) : 0;
  };

  /* ---------------- audience meter (flags.m_audience) ---------------- */
  S.meterSynced = null;
  /** Current meter value: m_audience, else deprecated `approval`, else 50. */
  S.meterValue = function () {
    var f = G.Game.state.flags;
    if (f.m_audience != null) return f.m_audience;
    if (f.approval != null) return f.approval;
    var d = G.flagDefaults().m_audience;
    return d != null ? d : 50;
  };
  /** Called every frame: keeps HUD, m_audience and the deprecated `approval` alias consistent
   *  even when chapters write the flags directly (api.set('m_audience', 70)). */
  S.syncMeter = function () {
    if (!G.Game.state) return;
    var f = G.Game.state.flags, last = S.meterSynced;
    var m = f.m_audience, a = f.approval;
    var nv;
    if (m != null && m !== last) nv = m;                 // m_audience changed directly
    else if (a != null && a !== last && a !== m) nv = a; // deprecated alias changed directly
    else return;
    nv = U.clamp(Math.round(+nv || 0), 0, 100);
    f.m_audience = nv; f.approval = nv; S.meterSynced = nv;
    G.UI.setApproval(nv, { show: G.UI.hud.approval.show });
  };

  /* ---------------- data-script runner ---------------- */
  function normStep(st) {
    if (typeof st === 'string') return { narrate: st };
    if (Array.isArray(st)) return { say: st[0], text: st[1], mood: st[2] }; // ['luna', 'text', 'sad']
    return st;
  }
  /** Run an array of steps. Returns {goto} if a goto escapes this block, {end} on end. */
  S.run = async function (steps, api, depth) {
    api = api || S.api();
    depth = depth || 0;
    steps = (steps || []).map(normStep);
    var labels = {};
    steps.forEach(function (st, i) { if (st && st.label) labels[st.label] = i; });
    for (var i = 0; i < steps.length; i++) {
      var r = await S.exec(steps[i], api, depth);
      if (r && r.goto != null) {
        if (labels[r.goto] != null) { i = labels[r.goto]; continue; }
        if (depth === 0) { G.reportError(new Error('script: unknown label "' + r.goto + '"'), 'script'); return r; }
        return r;
      }
      if (r && r.end) return r;
    }
    return null;
  };

  S.exec = async function (st, api, depth) {
    if (!st) return null;
    if (st.if !== undefined && !('then' in st) && !('else' in st)) {
      // guard form: {if:'x', say:..} only runs the step if the condition holds
      if (!S.check(st.if)) return null;
    }
    if ('then' in st || 'else' in st) {
      var branch = S.check(st.if) ? st.then : st.else;
      return branch ? S.run(branch, api, depth + 1) : null;
    }
    if (st.label) return null;
    if (st.goto) return { goto: st.goto };
    if (st.end) return { end: true };
    if (st.set) S.applySet(st.set);
    if (st.add) S.applyAdd(st.add);
    if (st.rel) Object.keys(st.rel).forEach(function (k) { api.rel(k, st.rel[k]); });
    if (st.say !== undefined) await api.say(st.say, st.text, st);
    else if (st.narrate !== undefined) await api.narrate(st.narrate, st);
    else if (st.think !== undefined) await api.think(st.think, st);
    else if (st.choice) {
      var opts = st.choice.filter(function (o) { return typeof o === 'string' || o.if == null || S.check(o.if); });
      var idx = await api.choice(opts.map(function (o) { return typeof o === 'string' ? o : o; }), { timer: st.timer, prompt: st.prompt, applyEffects: false });
      var op = opts[idx];
      if (st.store) flags()[st.store] = typeof op === 'object' && op.value !== undefined ? op.value : idx;
      if (typeof op === 'object') {
        if (op.set) S.applySet(op.set);
        if (op.add) S.applyAdd(op.add);
        if (op.rel) Object.keys(op.rel).forEach(function (k) { api.rel(k, op.rel[k]); });
        if (op.then) { var rr = await S.run(op.then, api, depth + 1); if (rr) return rr; }
        if (op.goto) return { goto: op.goto };
      }
    }
    else if (st.wait != null) await api.wait(st.wait);
    else if (st.fadeOut !== undefined) await api.fadeOut(st.fadeOut === true ? undefined : st.fadeOut, st.color);
    else if (st.fadeIn !== undefined) await api.fadeIn(st.fadeIn === true ? undefined : st.fadeIn);
    else if (st.flash !== undefined) api.flash(st.flash === true ? '#fff' : st.flash, st.ms);
    else if (st.shake !== undefined) await api.shake(st.shake === true ? 400 : st.shake, st.mag);
    else if (st.titleCard !== undefined) await api.titleCard(st.titleCard, st.sub, st.ms);
    else if (st.room) await api.goRoom(st.room, st);
    else if (st.sound) api.sound(st.sound);
    else if (st.ambient !== undefined) api.ambient(st.ambient);
    else if (st.move) await api.move(st.move, st.to, st);
    else if (st.face) api.face(st.face, st.dir);
    else if (st.emote) await api.emote(st.emote, st.icon, st.ms);
    else if (st.pan !== undefined) await (st.pan === null || st.pan === 'player' ? api.cameraReset(st.ms) : api.pan(st.pan, st.ms));
    else if (st.minigame) { var res = await api.minigame(st.minigame, st.params || {}); if (st.store) flags()[st.store] = res; if (st.onWin && res && res.success) { var r1 = await S.run(st.onWin, api, depth + 1); if (r1) return r1; } if (st.onLose && !(res && res.success)) { var r2 = await S.run(st.onLose, api, depth + 1); if (r2) return r2; } }
    else if (st.slides) await api.slides(st.slides, st);
    else if (st.tv) await api.tv(st.tv);
    else if (st.letter) await api.letter(st.letter);
    else if (st.note) await api.note(st.note);
    else if (st.onAir !== undefined) api.onAir(st.onAir);
    else if (st.approval !== undefined) api.approval(st.approval);
    else if (st.approvalAdd !== undefined) api.approvalAdd(st.approvalAdd);
    else if (st.audience !== undefined) api.approval(st.audience);
    else if (st.lowerThird !== undefined) api.lowerThird(st.lowerThird && st.lowerThird.title || st.lowerThird, st.lowerThird && st.lowerThird.sub, st.lowerThird && st.lowerThird.ms);
    else if (st.objective !== undefined) api.objective(st.objective, st);
    else if (st.show) api.show(st.show);
    else if (st.hide) api.hide(st.hide);
    else if (st.player) { if (st.player.spec) api.setPlayer(st.player.spec); if (st.player.to) await api.movePlayer(st.player.to, st.player); if (st.player.at) api.teleport(st.player.at, st.player.facing); if (st.player.face) api.face('player', st.player.face); }
    else if (st.call || st.do) { var fn = st.call || st.do; await fn(api); }
    else if (st.complete !== undefined) { api.completeChapter(st.complete === true ? undefined : st.complete); return { end: true }; }
    else if (st.run) { var r3 = await S.run(st.run, api, depth + 1); if (r3) return r3; }
    return null;
  };

  /* ---------------- handlers (talk / examine / zone / room enter) ---------------- */
  S.overrides = {};   // id -> handler (api.onInteract)
  S.counts = {};      // id -> times interacted (this chapter run)
  S.runHandler = async function (h, entity, api) {
    api = api || S.api();
    if (h == null) return;
    if (typeof h === 'function') return h(api, entity);
    if (typeof h === 'string') {
      if (entity && entity.kind === 'npc') return api.say(entity.id, h);
      if (entity && entity.def && entity.def.thought) return api.think(h);
      return api.narrate(h);
    }
    if (Array.isArray(h)) return S.run(h, api);
    if (typeof h === 'object') return S.run([h], api);
  };

  /** Player interacts with an entity (npc/object). */
  S.interact = function (e) {
    if (busyCount > 0 && !G.auto) return Promise.resolve();
    var api = S.api();
    var sess = G.Game.session;
    busyCount++;
    var p = W.player;
    if (e.kind === 'npc') {
      e.busy++;
      e.queue = []; e.moving = false;
      if (e.def.turn !== false) e.dir = W.dirOf(p.x - e.x, p.y - e.y);
    }
    S.counts[e.id] = (S.counts[e.id] || 0) + 1;
    G.Audio.play('select');
    var finish = function () {
      if (e.kind === 'npc') e.busy--;
      if (G.Game.session === sess) busyCount = Math.max(0, busyCount - 1);
      S.markReached(e.id);
    };
    // A chapter script awaiting this interaction takes precedence over the default handler.
    if (W.hasWaiter('interact', e.id)) {
      W.resolveWaiters('interact', e.id, e);
      return new Promise(function (res) { setTimeout(function () { finish(); res(); }, 0); });
    }
    var d = e.def;
    var h = S.overrides[e.id];
    if (h === undefined) {
      if (d.once && S.counts[e.id] > 1) h = d.after !== undefined ? d.after : null;
      else if (d.again !== undefined && S.counts[e.id] > 1) h = d.again;
      else h = d.talk !== undefined ? d.talk : d.examine !== undefined ? d.examine : d.run !== undefined ? d.run : d.onInteract;
    }
    return S.runHandler(h, e, api).catch(function (err) { G.reportError(err, 'interact ' + e.id); }).then(function () {
      finish();
      W.resolveWaiters('interacted', e.id, e);
    });
  };

  S.enterZone = function (z) {
    var d = z.def;
    if (d.if != null && !S.check(d.if)) return Promise.resolve();
    if (d.once && z.fired) return Promise.resolve();
    if (d.once && S.zonesFired[z.id]) return Promise.resolve();
    z.fired++; S.zonesFired[z.id] = true;
    S.markReached(z.id);
    var hadWaiter = W.resolveWaiters('zone', z.id, z);
    var h = d.run || d.onEnter || d.talk || d.examine;
    if (!h) return Promise.resolve();
    if (hadWaiter && d.waiterOnly) return Promise.resolve();
    return block(S.runHandler(h, z)).catch(function (err) { G.reportError(err, 'zone ' + z.id); });
  };
  S.zonesFired = {};

  S.useExit = function (e) {
    var d = e.def, api = S.api();
    if (d.if != null && !S.check(d.if)) return Promise.resolve();
    S.markReached(e.id);
    if (d.locked != null && S.check(d.locked)) {
      // bump the player back off the exit tile
      var p = W.player, back = { up: [0, 1], down: [0, -1], left: [1, 0], right: [-1, 0] }[p.dir] || [0, 1];
      var tt = W.playerTile();
      if (W.tileFree(tt.x + back[0], tt.y + back[1])) W.placePlayer(tt.x + back[0], tt.y + back[1]);
      W.lastTile = W.playerTile();
      return block(S.runHandler(d.lockedText || 'It won\'t open.', { kind: 'exit', def: d }, api));
    }
    G.Audio.play('door');
    var pre = d.run ? block(S.runHandler(d.run, e, api)) : Promise.resolve();
    return pre.then(function () { return api.goRoom(d.to, { at: d.toAt || d.dest || d.spawn, facing: d.facing || W.player.dir, fade: d.fade }); });
  };

  /* ---------------- objectives & autoplay ---------------- */
  S.objectiveState = null;   // {text, target, targets, autoplay}
  S.autoTargets = [];        // stack of ids from waitFor* calls
  S.reached = {};            // ids reached this chapter (for multi-target objectives)
  S.markReached = function (id) { S.reached[id] = (S.reached[id] || 0) + 1; };
  S.resetChapterState = function () {
    S.overrides = {}; S.counts = {}; S.objectiveState = null; S.autoTargets = []; S.reached = {}; S.zonesFired = {};
    busyCount = 0; auto.idle = 0; auto.stall = 0; auto.running = false; auto.lastKey = ''; auto.repeat = 0; auto.reported = false;
  };
  var auto = { idle: 0, stall: 0, running: false, lastKey: '', repeat: 0, reported: false };

  /** Called every frame by the game loop when G.auto. */
  S.autoTick = function (dt) {
    if (!G.auto || !G.Game.session || !G.Game.session.alive || !W.active) return;
    if (busyCount > 0 || G.UI.blocking() || auto.running || G.UI.fx.tween) { auto.idle = 0; return; }
    auto.idle++;
    if (auto.idle < 3) return;
    var job = S.nextAutoJob();
    if (!job) {
      auto.stall += dt;
      if (auto.stall > 4 && !auto.reported) {
        auto.reported = true;
        G.reportError(new Error('autoplay stalled in ' + G.Game.session.chapterId + ': the chapter is idle with no objective. Use api.waitForInteract(id), api.objective(text,{target}) or api.until(fn,{target}) so tests can progress.'), 'auto');
      }
      return;
    }
    auto.stall = 0;
    if (job.key === auto.lastKey) auto.repeat++; else { auto.repeat = 0; auto.lastKey = job.key; }
    if (auto.repeat > 25) {
      if (!auto.reported) { auto.reported = true; G.reportError(new Error('autoplay loop: target "' + job.key + '" reached 25 times without progress in ' + G.Game.session.chapterId), 'auto'); }
      return;
    }
    auto.running = true;
    auto.idle = 0;
    var sess = G.Game.session;
    Promise.resolve().then(job.run).catch(function (e) { G.reportError(e, 'autoplay'); }).then(function () { if (G.Game.session === sess) auto.running = false; else auto.running = false; });
  };
  S.nextAutoJob = function () {
    var api = S.api();
    if (S.autoTargets.length) {
      var t = S.autoTargets[S.autoTargets.length - 1];
      if (t.autoplay) return { key: 'fn:' + t.id, run: function () { return t.autoplay(api); } };
      return { key: t.id, run: function () { return W.autoReach(t.id); } };
    }
    var o = S.objectiveState;
    if (o) {
      if (o.autoplay) return { key: 'obj:' + o.text, run: function () { return o.autoplay(api); } };
      var targets = o.targets || (o.target ? [o.target] : []);
      if (targets.length) {
        var next = targets.filter(function (id) { return !S.reached[id]; })[0] || targets[targets.length - 1];
        return { key: next, run: function () { return W.autoReach(next); } };
      }
    }
    return null;
  };
  function pushTarget(id, autoplay) {
    var t = { id: id, autoplay: autoplay };
    S.autoTargets.push(t);
    return function () { var i = S.autoTargets.indexOf(t); if (i >= 0) S.autoTargets.splice(i, 1); };
  }

  /* ---------------- the api ---------------- */
  var currentApi = null;
  S.api = function () { return currentApi; };

  S.makeApi = function (session) {
    var chapterId = session.chapterId;
    function live() { return session.alive; }
    function guard(fn) {
      return function () {
        if (!live()) return U.never();
        return fn.apply(null, arguments);
      };
    }
    var api = {};
    Object.defineProperty(api, 'flags', { get: function () { return G.Game.state.flags; } });
    Object.defineProperty(api, 'player', { get: function () { return W.player; } });
    api.chapterId = chapterId;
    api.chapter = G.chapters[chapterId];
    api.data = G.chapterBag(chapterId).data;
    api.auto = G.auto;
    api.dev = G.dev;
    api.util = U;
    api.G = G;

    /* ----- flags ----- */
    api.get = function (k, def) { var v = G.Game.state.flags[k]; return v === undefined ? def : v; };
    api.set = function (k, v) { if (typeof k === 'object') S.applySet(k); else G.Game.state.flags[k] = v === undefined ? true : v; };
    api.add = function (k, n) { var f = G.Game.state.flags; f[k] = S.numBase(k) + (n == null ? 1 : n); return f[k]; };
    api.has = function (k) { return !!G.Game.state.flags[k]; };
    api.check = S.check;
    /** Relationship: api.rel('delphin', +1) -> flags.relDelphin; api.rel('delphin') reads. */
    api.rel = function (who, delta) { var k = 'rel' + U.cap(who); if (delta) api.add(k, delta); return api.get(k, 0); };
    /** Chapter-local flag name: api.local('found') -> 'ch05_found'. */
    api.local = function (name) { return chapterId + '_' + name; };

    /* ----- dialogue ----- */
    api.say = guard(function (speaker, text, opts) {
      opts = opts || {};
      if (opts.if != null && !S.check(opts.if)) return Promise.resolve();
      return block(G.Dialogue.show({ kind: 'say', speaker: speaker, text: text, mood: opts.mood, name: opts.name, portrait: opts.portrait }));
    });
    api.narrate = guard(function (text) { return block(G.Dialogue.show({ kind: 'narrate', text: text })); });
    api.think = guard(function (text, opts) { opts = opts || {}; return block(G.Dialogue.show({ kind: 'think', text: text, name: opts.name })); });
    /**
     * api.choice(['A', 'B'])  or  api.choice([{text:'A', if:'flag', set:{...}}, ...], {timer:5, prompt})
     * Resolves to the index in the ORIGINAL array. Options failing `if` are hidden
     * (or shown greyed if {showDisabled:true}).
     */
    api.choice = guard(function (options, opts) {
      opts = opts || {};
      var list = [];
      options.forEach(function (o, i) {
        var ob = typeof o === 'string' ? { text: o } : o;
        var ok = ob.if == null || S.check(ob.if);
        if (ok || opts.showDisabled) list.push({ text: ob.text, disabled: !ok, i: i, ob: ob });
      });
      if (!list.length) { G.warn('choice with no available options'); return Promise.resolve(-1); }
      var autoPick = null;
      if (G.auto && opts.autoPick != null) list.forEach(function (l, j) { if (l.i === opts.autoPick) autoPick = j; });
      return block(G.Dialogue.choose(list, { prompt: opts.prompt, timer: opts.timer, timeoutPick: opts.timeoutPick, autoPick: autoPick })).then(function (j) {
        var it = list[j];
        if (opts.applyEffects !== false && it.ob) { if (it.ob.set) S.applySet(it.ob.set); if (it.ob.add) S.applyAdd(it.ob.add); }
        return it.i;
      });
    });
    api.run = guard(function (steps) { return S.run(steps, api); });

    /* ----- timing & fx ----- */
    api.wait = guard(function (ms) { return block(U.sleep(ms)); });
    api.fadeOut = guard(function (ms, color) { return block(G.UI.fadeTo(1, ms == null ? 600 : ms, color || '#000')); });
    api.fadeIn = guard(function (ms) { return block(G.UI.fadeTo(0, ms == null ? 600 : ms)); });
    api.flash = function (color, ms) { if (live()) G.UI.flash(color, ms); };
    api.shake = guard(function (ms, mag) { W.cam.shakeT = (ms || 400) / 1000; W.cam.shakeMag = mag || 3; return block(U.sleep(ms || 400)); });
    api.titleCard = guard(function (title, sub, ms, opts) { return block(G.UI.titleCard(title, sub, ms, opts)); });
    api.slides = guard(function (slides, opts) { return block(G.UI.slides(slides, opts)); });
    /** TV broadcast overlay: {headline, text, speaker:'trader', ticker, tag} or array of those. */
    api.tv = guard(function (s) { var arr = Array.isArray(s) ? s : [s]; return block(G.UI.slides(arr.map(function (x) { x.style = 'tv'; return x; }))); });
    api.letter = guard(function (s) { if (typeof s === 'string') s = { text: s }; s.style = 'letter'; return block(G.UI.slides([s])); });
    api.note = guard(function (s) { if (typeof s === 'string') s = { text: s }; s.style = 'note'; return block(G.UI.slides([s])); });
    api.screen = guard(function (s) { if (typeof s === 'string') s = { text: s }; s.style = 'screen'; return block(G.UI.slides([s])); });
    api.sound = function (name) { if (live()) G.Audio.play(name); };
    api.ambient = function (name) { if (live()) G.Audio.ambient(name); };

    /* ----- HUD ----- */
    api.onAir = function (on) { if (live()) G.UI.hud.onAir = on !== false; };
    /**
     * Audience meter. SINGLE SOURCE OF TRUTH = flags.m_audience (0..100, canon flag registry name).
     * api.approval(55) set+show; api.approval('+5') / api.approval('-3') add; api.approval(true) show;
     * api.approval(false) hide; api.approval() -> value. `approval` is a DEPRECATED alias kept in sync.
     */
    api.approval = function (v, opts) {
      if (!live()) return 0;
      var f = G.Game.state.flags;
      var cur = S.meterValue();
      if (v === undefined) return cur;
      if (v === false) { G.UI.hud.approval.show = false; return cur; }
      if (v === true) v = cur;
      if (typeof v === 'string' && /^[+-]\d+(\.\d+)?$/.test(v)) v = cur + parseFloat(v);
      var nv = U.clamp(Math.round(+v || 0), 0, 100);
      f.m_audience = nv; f.approval = nv;
      S.meterSynced = nv;
      G.UI.setApproval(nv, opts);
      return nv;
    };
    api.approvalAdd = function (d, opts) { return api.approval(api.approval() + d, opts); };
    api.audience = api.approval; // alias named after the flag
    api.lowerThird = function (title, sub, ms, tag) { if (live()) G.UI.lowerThird(title, sub, ms, tag); };
    /**
     * Show an objective in the HUD AND tell autoplay what to do.
     *   api.objective('Talk to Kessie', {target:'kessie'})
     *   api.objective('Search the room', {targets:['desk','bed','window']})  // autoplay visits each
     *   api.objective('Escape', {autoplay: async (api) => {...}})
     *   api.objective(null)  // clear
     */
    api.objective = function (text, opts) {
      if (!live()) return;
      opts = opts || {};
      if (text && typeof text === 'object') { opts = text; text = opts.text; }
      G.UI.objective(text || null);
      S.objectiveState = text || opts.target || opts.targets || opts.autoplay ? { text: text, target: opts.target, targets: opts.targets, autoplay: opts.autoplay } : null;
      if (text) G.log('[objective] ' + text);
    };
    api.hud = function (visible) { G.UI.hud.hidden = visible === false; };

    /* ----- rooms ----- */
    /** api.goRoom('kitchen', {at:[3,4], facing:'up', fade:true}) */
    api.goRoom = guard(function (id, opts) {
      opts = opts || {};
      return block((async function () {
        var fade = opts.fade !== false && W.active && !G.auto;
        if (fade) await G.UI.fadeTo(1, opts.fadeMs || 260);
        else if (!W.active && !G.auto && opts.fade !== false) G.UI.fx.fade = 1; // first room: fade in from black
        if (!live()) return U.never();
        W.load(id, { at: opts.at, facing: opts.facing });
        var def = W.room.def;
        if (def.ambient !== undefined) G.Audio.ambient(def.ambient);
        G.log('[room] ' + def.id);
        if (G.UI.fx.fade > 0 && opts.stayDark !== true) await G.UI.fadeTo(0, opts.fadeMs || 300);
        var st = W.roomState[def.id];
        var enter = def.onEnter || def.enter;
        if (enter && !(def.enterOnce && st.entered > 1)) await S.runHandler(enter, null, api);
        W.resolveWaiters('room', def.id); W.resolveWaiters('room', def.localId);
      })());
    });
    api.room = function () { return W.room ? W.room.def.localId : null; };

    /* ----- waiting for the player (free roam) ----- */
    /** Resolves when the player interacts with `id`. The default talk/examine handler is skipped. */
    api.waitForInteract = guard(function (id, opts) {
      opts = opts || {};
      if (opts.objective) api.objective(opts.objective);
      var pop = pushTarget(id, opts.autoplay);
      return W.wait('interact', id).then(function (e) { pop(); return e; });
    });
    /** Like waitForInteract but lets the entity's own talk/examine handler run first. */
    api.waitForTalk = guard(function (id, opts) {
      opts = opts || {};
      if (opts.objective) api.objective(opts.objective);
      var pop = pushTarget(id, opts.autoplay);
      return W.wait('interacted', id).then(function (e) { pop(); return e; });
    });
    api.waitForZone = guard(function (id, opts) {
      opts = opts || {};
      if (opts.objective) api.objective(opts.objective);
      var pop = pushTarget(id, opts.autoplay);
      return W.wait('zone', id).then(function (z) { pop(); return z; });
    });
    api.waitForRoom = guard(function (id, opts) {
      opts = opts || {};
      if (opts.objective) api.objective(opts.objective);
      var key = G.lookupKey('maps', id) || id;
      if (W.room && (W.room.def.id === key)) return Promise.resolve();
      var pop = pushTarget('room:' + id, opts.autoplay);
      return W.wait('room', key).then(function () { pop(); });
    });
    /**
     * Wait until fn() is true (checked every frame). For autoplay give
     * {target:'id'} / {targets:[...]} / {autoplay: async api => ...}.
     */
    api.until = guard(function (fn, opts) {
      opts = opts || {};
      if (opts.objective || opts.target || opts.targets || opts.autoplay) api.objective(opts.objective || (S.objectiveState && S.objectiveState.text) || null, { target: opts.target, targets: opts.targets, autoplay: opts.autoplay });
      return new Promise(function (resolve) {
        (function poll() {
          if (!live()) return;
          var ok = false;
          try { ok = fn(G.Game.state.flags, api); } catch (e) { G.reportError(e, 'until'); }
          if (ok) resolve(); else setTimeout(poll, G.auto ? 0 : 50);
        })();
      });
    });
    /** Replace an entity's interaction handler at runtime (null = not interactable). */
    api.onInteract = function (id, handler) { S.overrides[id] = handler; };

    /* ----- entities ----- */
    api.npc = function (id) { return W.npc(id); };
    api.addNpc = function (def, room) { return W.addNpc(def, room); };
    api.addObject = function (def, room) { return W.addObject(def, room); };
    api.remove = function (id, room) { W.remove(id, room); };
    api.show = function (id) { var e = W.find(id); if (e) e.visible = true; };
    api.hide = function (id) { var e = W.find(id); if (e) e.visible = false; };
    function actor(id) { if (id === 'player' || id === 'luna' && !W.npc('luna')) return W.player; return W.npc(id); }
    /** Walk an NPC (or 'player') to a tile with pathfinding. opts: {speed, direct} */
    api.move = guard(function (id, to, opts) {
      var a = actor(id);
      if (!a) { G.warn('move: no npc "' + id + '" in room'); return Promise.resolve(); }
      opts = opts || {};
      var paths = Array.isArray(to) && Array.isArray(to[0]) ? to : [to];
      return block(paths.reduce(function (p, t) { return p.then(function () { return W.walkTo(a, W.xy(t), opts); }); }, Promise.resolve()));
    });
    api.movePlayer = function (to, opts) { return api.move('player', to, opts); };
    api.teleport = function (at, facing) { var p = W.xy(at); W.placePlayer(p.x, p.y); if (facing) W.player.dir = facing; W.lastTile = W.playerTile(); W.arrivalTile = W.lastTile; W.snapCamera(); };
    api.placeNpc = function (id, at, facing) { var n = W.npc(id); if (!n) return; var p = W.tileToPx(W.xy(at).x, W.xy(at).y); n.x = p.x; n.y = p.y; if (facing) n.dir = facing; };
    /** Face: api.face('kessie','left') | api.face('kessie','player') | api.face('player','kessie') */
    api.face = function (id, dir) {
      var a = actor(id); if (!a) return;
      if (dir === 'up' || dir === 'down' || dir === 'left' || dir === 'right') { a.dir = dir; return; }
      var b = actor(dir); if (b) a.dir = W.dirOf(b.x - a.x, b.y - a.y);
    };
    api.emote = guard(function (id, icon, ms) {
      var a = actor(id); if (!a) return Promise.resolve();
      a.emote = { icon: icon || '!', until: W.t + (ms || 900) / 1000 };
      if (icon === '!') G.Audio.play('select');
      return block(U.sleep(ms || 900));
    });
    api.setSpec = function (id, spec) { var a = actor(id); if (a) a.spec = spec; };
    api.setPlayer = function (spec) { W.player.spec = spec; };
    api.lockPlayer = function () { W.lockMove++; };
    api.unlockPlayer = function () { W.lockMove = Math.max(0, W.lockMove - 1); };
    api.playerTile = function () { return W.playerTile(); };

    /* ----- camera ----- */
    /** Pan camera to a tile [x,y] or an npc id. Stays until api.cameraReset(). */
    api.pan = guard(function (target, ms) {
      var px;
      if (typeof target === 'string') { var a = actor(target); if (!a) return Promise.resolve(); px = { x: a.x, y: a.y - 10 }; }
      else { var t = W.xy(target); px = { x: t.x * 16 + 8, y: t.y * 16 + 8 }; }
      return block(W.panTo(px.x, px.y, ms));
    });
    api.cameraReset = guard(function (ms) {
      var t = W.camTarget();
      return block(W.panTo(t.x, t.y, ms || 500).then(function () { W.cam.pan = null; }));
    });
    api.follow = function (id) { W.cam.follow = id || null; };

    /* ----- minigames ----- */
    /** const r = await api.minigame('cipher', {...}); r.success */
    api.minigame = guard(function (id, params) { return block(G.Minigames.run(id, params || {}, chapterId)); });

    /* ----- flow ----- */
    /** Finish this chapter. nextHint: optional chapter id to go to instead of the next in the manifest. */
    api.completeChapter = function (nextHint) { if (live()) G.Game.completeChapter(nextHint); };
    /** Game over / bad ending. Shows text, then offers retry of the chapter. */
    api.gameOver = guard(function (text, opts) { return G.Game.gameOver(text, opts); });
    api.log = function (m) { G.log('[chapter] ' + m); };

    currentApi = api;
    return api;
  };
})();
