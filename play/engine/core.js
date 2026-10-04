/* =========================================================================
 * core.js: global namespace, URL params, test state, error capture,
 * utilities and the registries (chapters, maps, cast, tiles, props, minigames).
 *
 * Everything in the engine lives on window.G. No ES modules (they break on
 * file://). Every engine file is an IIFE that adds to G.
 * ========================================================================= */
(function () {
  'use strict';
  var G = (window.G = window.G || {});

  G.VERSION = '1.0.0';
  G.W = 384;          // internal (virtual) resolution
  G.H = 216;
  G.TILE = 16;        // tile size in internal pixels

  /* ---------------- URL params ---------------- */
  var qs;
  try { qs = new URLSearchParams(location.search); } catch (e) { qs = { get: function () { return null; } }; }
  G.params = {
    chapter: qs.get('chapter'),          // ?chapter=ch05  jump straight into a chapter
    dev: qs.get('dev') === '1',          // ?dev=1         unlock all + debug overlay
    auto: qs.get('auto') === '1',        // ?auto=1        autoplay (tests)
    pick: qs.get('pick') || '0',         // ?pick=random | ?pick=N  (auto choice picking)
    newgame: qs.get('newgame') === '1',  // ?newgame=1     start a new game immediately
    mute: qs.get('mute') === '1',
    nosave: qs.get('nosave') === '1'     // ?nosave=1      never touch localStorage
  };
  G.auto = G.params.auto;
  G.dev = G.params.dev;

  /* ---------------- test state ---------------- */
  G.testState = {
    ready: false,              // engine booted, title (or chapter) shown
    chapterStarted: null,      // id of the most recently started chapter
    currentChapter: null,
    chapterCompleted: [],      // ids, in completion order
    errors: [],                // strings
    warnings: [],
    gameCompleted: false,      // set when the final chapter completes
    flagSnapshots: {},         // chapterId -> sorted flag keys at completion
    log: []                    // last ~200 dialogue lines / events (auto mode)
  };

  G.log = function (msg) {
    var l = G.testState.log;
    l.push(String(msg));
    if (l.length > 200) l.shift();
  };

  G.reportError = function (err, where) {
    var msg = (where ? '[' + where + '] ' : '') + (err && err.stack ? err.stack : (err && err.message) || String(err));
    G.testState.errors.push(msg);
    try { console.error('[G] ' + msg); } catch (e) { /* ignore */ }
    if (G.UI && G.UI.toast) G.UI.toast('ERROR: ' + ((err && err.message) || String(err)).slice(0, 80), '#f55');
  };
  G.warn = function (msg) {
    G.testState.warnings.push(String(msg));
    try { console.warn('[G] ' + msg); } catch (e) { /* ignore */ }
  };

  window.addEventListener('error', function (e) {
    G.testState.errors.push('[window.onerror] ' + (e.message || 'error') + ' @ ' + (e.filename || '') + ':' + (e.lineno || ''));
  });
  window.addEventListener('unhandledrejection', function (e) {
    var r = e.reason;
    G.testState.errors.push('[unhandledrejection] ' + (r && r.stack ? r.stack : String(r)));
  });

  /* ---------------- utilities ---------------- */
  var U = (G.util = {});
  U.clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  U.lerp = function (a, b, t) { return a + (b - a) * t; };
  U.ease = function (t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; };
  U.hash = function (str) {
    str = String(str);
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  };
  U.rng = function (seed) { // mulberry32
    var a = (typeof seed === 'number' ? seed : U.hash(seed)) >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  U.hash2 = function (x, y, s) { // deterministic 0..1 for a tile
    var h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 1442695041);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };
  U.copy = function (o) { return o === undefined ? undefined : JSON.parse(JSON.stringify(o)); };
  U.pick = function (arr) { return arr[Math.floor(Math.random() * arr.length)]; };
  U.cap = function (s) { s = String(s); return s.charAt(0).toUpperCase() + s.slice(1); };
  /** Wait using real time. Auto mode: resolves on the next macrotask. */
  U.sleep = function (ms) {
    return new Promise(function (res) { setTimeout(res, G.auto ? 0 : Math.max(0, ms || 0)); });
  };
  U.nextTick = function () { return new Promise(function (res) { setTimeout(res, 0); }); };
  U.never = function () { return new Promise(function () {}); };
  /** Shade a #rrggbb colour: amt -1..1 (negative = darker). */
  U.shade = function (hex, amt) {
    var c = U.parseColor(hex);
    var f = function (v) { return Math.round(amt < 0 ? v * (1 + amt) : v + (255 - v) * amt); };
    return 'rgb(' + f(c[0]) + ',' + f(c[1]) + ',' + f(c[2]) + ')';
  };
  U.parseColor = function (hex) {
    if (!hex) return [128, 128, 128];
    if (hex.charAt(0) === '#') {
      var h = hex.slice(1);
      if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
      var n = parseInt(h, 16);
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    }
    var m = hex.match(/\d+/g);
    return m ? [+m[0], +m[1], +m[2]] : [128, 128, 128];
  };
  U.rgba = function (hex, a) {
    var c = U.parseColor(hex);
    return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')';
  };

  /* ---------------- registries ----------------
   * Chapter-owned assets are stored under "chNN:name". Lookups made while a
   * chapter is running try "chNN:name" first, then the global "name".
   */
  G.registry = { maps: {}, cast: {}, tiles: {}, props: {}, minigames: {} };
  G.chapters = {};          // id -> chapter definition
  G.manifest = G.manifest || { game: {}, chapters: [] };

  /** Current namespace (id of the running chapter) or null. */
  G.ns = function () { return G.Game && G.Game.session ? G.Game.session.chapterId : null; };

  /** Resolve a registry entry by name, trying the chapter namespace first. */
  G.lookup = function (kind, name, ns) {
    if (name == null) return null;
    var reg = G.registry[kind];
    if (typeof name !== 'string') return name; // already a definition
    if (name.indexOf(':') >= 0) return reg[name] || null;
    ns = ns || G.ns();
    if (ns && reg[ns + ':' + name]) return reg[ns + ':' + name];
    return reg[name] || null;
  };
  G.lookupKey = function (kind, name, ns) {
    if (name.indexOf(':') >= 0) return G.registry[kind][name] ? name : null;
    ns = ns || G.ns();
    if (ns && G.registry[kind][ns + ':' + name]) return ns + ':' + name;
    return G.registry[kind][name] ? name : null;
  };

  function nsKey(ns, name) { return name.indexOf(':') >= 0 || !ns ? name : ns + ':' + name; }

  /** Per-chapter bag. Extra files in a chapter folder fill it before or after chapter.js. */
  var bags = {};
  G.chapterBag = function (id) {
    if (!bags[id]) bags[id] = { maps: {}, cast: {}, tiles: {}, props: {}, minigames: {}, data: {} };
    return bags[id];
  };

  /** Register assets into the registry under a namespace (chapter id or null for global). */
  G.registerMap = function (name, def, ns) {
    def.id = nsKey(ns, name); def.ns = ns || null; def.localId = name;
    G.registry.maps[def.id] = def; return def;
  };
  G.registerCast = function (name, spec, ns) {
    var key = nsKey(ns, name);
    var base = G.registry.cast[spec.extends || name];
    var merged = {};
    if (base && (ns || spec.extends)) for (var k in base) merged[k] = base[k];
    for (var k2 in spec) merged[k2] = spec[k2];
    merged.id = key;
    G.registry.cast[key] = merged;
    if (G.Sprites) G.Sprites.clearCache(key);
    return merged;
  };
  G.registerTile = function (name, def, ns) { def.name = nsKey(ns, name); G.registry.tiles[def.name] = def; return def; };
  G.registerProp = function (name, fn, ns) { G.registry.props[nsKey(ns, name)] = fn; };
  /** Minigame: G.registerMinigame('cipher', {start(ctx), autoSolve(params)}) or 'ch05:myGame'. */
  G.registerMinigame = function (id, def) { def.id = id; G.registry.minigames[id] = def; return def; };

  /** Chapters call this from their chapter.js. */
  G.registerChapter = function (def) {
    try {
      if (!def || !def.id) throw new Error('registerChapter: missing id');
      var bag = G.chapterBag(def.id);
      var parts = ['maps', 'cast', 'tiles', 'props', 'minigames'];
      parts.forEach(function (p) {
        var src = Object.assign({}, bag[p], def[p] || {});
        Object.keys(src).forEach(function (name) {
          if (p === 'maps') G.registerMap(name, src[name], def.id);
          else if (p === 'cast') G.registerCast(name, src[name], def.id);
          else if (p === 'tiles') G.registerTile(name, src[name], def.id);
          else if (p === 'props') G.registerProp(name, src[name], def.id);
          else if (p === 'minigames') G.registerMinigame(def.id + ':' + name, src[name]);
        });
      });
      def.bag = bag;
      var m = (G.manifest.chapters || []).filter(function (c) { return c.id === def.id; })[0];
      if (m) {
        if (!def.title) def.title = m.title;
        def.number = m.number;
        def.hidden = !!(def.hidden || m.hidden);
      }
      G.chapters[def.id] = def;
    } catch (e) { G.reportError(e, 'registerChapter'); }
  };

  /* ---------------- shared assets (play/shared/*.js) ----------------
   * Recurring locations / refined cast, built once and reused by chapters.
   * Loaded after the engine and before any chapter (manifest `shared: [...]`).
   */
  function cloneDef(v) { // deep copy that keeps functions
    if (Array.isArray(v)) return v.map(cloneDef);
    if (v && typeof v === 'object' && Object.getPrototypeOf(v) === Object.prototype) {
      var o = {}; Object.keys(v).forEach(function (k) { o[k] = cloneDef(v[k]); }); return o;
    }
    return v;
  }
  G.cloneDef = cloneDef;
  var sharedMaps = {};
  G.shared = {
    maps: sharedMaps,
    data: {},
    /** Register a reusable location (same format as a chapter map). */
    registerMap: function (name, def) { sharedMaps[name] = def; return def; },
    /** Update (merge over) a built-in cast member or add a new one, globally. */
    registerCast: function (id, spec) {
      var base = G.registry.cast[id] || {};
      var merged = Object.assign({}, base, spec);
      delete merged.id;
      return G.registerCast(id, merged);
    },
    /** {name: tileDef} global tile types, usable from every map legend. */
    registerTiles: function (obj) { Object.keys(obj).forEach(function (k) { G.registerTile(k, obj[k]); }); },
    /** {name: fn(g,x,y,t,obj)} global props. */
    registerProps: function (obj) { Object.keys(obj).forEach(function (k) { G.registerProp(k, obj[k]); }); },
    /**
     * Get a deep COPY of a shared map, extended for one chapter:
     *   G.shared.map('house_kitchen', { npcs:[...], objects:[...], zones:[...], exits:[...], lights:[...],
     *                                   remove:['oldNpcId'], ambient:'tension', ...any other map field overrides })
     * Arrays npcs/objects/zones/exits/lights are APPENDED; `legend` is merged; `remove` drops entities by id;
     * `patch: {id: {fields}}` shallow-merges fields (functions allowed) into the shared npc/object/zone/exit with that id;
     * every other key replaces the shared value. The shared original is never mutated.
     */
    map: function (name, ext) {
      var base = sharedMaps[name];
      if (!base) { G.reportError(new Error('G.shared.map: no shared map "' + name + '" (check shared/ files and manifest.shared)'), 'shared'); base = { tiles: ['###', '#@#', '###'] }; }
      var m = cloneDef(base);
      // mark base entities so the engine can prefer chapter-added/patched ones when several share a tile
      ['npcs', 'objects', 'zones', 'exits'].forEach(function (k) { (m[k] || []).forEach(function (e) { e._shared = true; }); });
      ext = ext || {};
      // order: 1) remove shared entities by id, 2) append/override ext fields, 3) patch by id
      if (ext.remove) ['npcs', 'objects', 'zones', 'exits'].forEach(function (k) { if (m[k]) m[k] = m[k].filter(function (e) { return ext.remove.indexOf(e.id) < 0; }); });
      Object.keys(ext).forEach(function (k) {
        var v = cloneDef(ext[k]);
        if (k === 'remove' || k === 'patch') return;
        if (['npcs', 'objects', 'zones', 'exits', 'lights'].indexOf(k) >= 0) m[k] = (m[k] || []).concat(v || []);
        else if (k === 'legend') m.legend = Object.assign({}, m.legend || {}, v);
        else m[k] = v;
      });
      if (ext.patch) Object.keys(ext.patch).forEach(function (id) {
        var hit = null;
        ['npcs', 'objects', 'zones', 'exits'].forEach(function (k) { (m[k] || []).forEach(function (e) { if (!hit && e.id === id) hit = e; }); });
        if (!hit) { G.warn('G.shared.map("' + name + '"): patch target "' + id + '" not found'); G.log('[warn] shared patch: no entity "' + id + '" in ' + name); return; }
        var fields = cloneDef(ext.patch[id]);
        Object.keys(fields).forEach(function (f) { hit[f] = fields[f]; });
        hit._patched = true;
      });
      m.sharedFrom = name;
      return m;
    },
    has: function (name) { return !!sharedMaps[name]; },
    list: function () { return Object.keys(sharedMaps); }
  };

  /** Canon defaults for cross-chapter flags (manifest game.flagDefaults). */
  G.flagDefaults = function () { return (G.manifest.game && G.manifest.game.flagDefaults) || {}; };
  /** Fill every currently-undefined key from flagDefaults (never overwrites). */
  G.applyFlagDefaults = function (flags) {
    var d = G.flagDefaults();
    Object.keys(d).forEach(function (k) { if (flags[k] === undefined) flags[k] = JSON.parse(JSON.stringify(d[k])); });
    return flags;
  };

  /** Ordered list of manifest chapters (only those that registered). */
  G.chapterList = function (includeHidden) {
    return (G.manifest.chapters || []).filter(function (c) {
      return G.chapters[c.id] && (includeHidden || !(c.hidden || G.chapters[c.id].hidden));
    }).map(function (c) { return G.chapters[c.id]; });
  };
})();
