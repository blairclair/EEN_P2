/* =========================================================================
 * ui.js: overlay stack, screen effects (fade/flash), HUD (ON AIR,
 * approval meter, lower third, objective), title cards, full-screen slides
 * (montage / TV broadcast / letter / note / screen), toasts, debug overlay.
 *
 * Overlay object: { update(dt, isTop), draw(t), input: bool, pause: bool }
 *   input: receives keyboard when it is the top-most input overlay.
 *   pause: freezes everything below it (pause menu).
 * ========================================================================= */
(function () {
  'use strict';
  var G = window.G;
  var U = G.util;
  var R = G.Render;
  var P = R.PAL;
  var UI = (G.UI = {});

  UI.stack = [];
  UI.t = 0;
  UI.push = function (o) { UI.stack.push(o); return o; };
  UI.remove = function (o) { var i = UI.stack.indexOf(o); if (i >= 0) UI.stack.splice(i, 1); };
  UI.clear = function (keepFn) { UI.stack = UI.stack.filter(function (o) { return keepFn ? keepFn(o) : false; }); };
  UI.has = function (pred) { return UI.stack.some(pred); };
  /** True if an overlay that takes input is open (world input then disabled). */
  UI.blocking = function () { return UI.stack.some(function (o) { return o.input || o.blocksWorld; }); };
  UI.topInput = function () { for (var i = UI.stack.length - 1; i >= 0; i--) if (UI.stack[i].input) return UI.stack[i]; return null; };
  UI.paused = function () { return UI.stack.some(function (o) { return o.pause; }); };

  UI.update = function (dt) {
    UI.t += dt;
    var top = UI.topInput();
    // find highest pausing overlay; only it and those above update
    var start = 0;
    for (var i = UI.stack.length - 1; i >= 0; i--) if (UI.stack[i].pause) { start = i; break; }
    var list = UI.stack.slice(start);
    list.forEach(function (o) {
      try { if (o.update) o.update(dt, o === top); } catch (e) { G.reportError(e, 'overlay update'); UI.remove(o); if (o.reject) o.reject(e); }
    });
    if (!UI.paused()) { updateFx(dt); updateHud(dt); }
    UI.toasts.forEach(function (t) { t.t += dt; });
    UI.toasts = UI.toasts.filter(function (t) { return t.t < t.dur; });
  };
  UI.draw = function () {
    R.ui();
    if (G.World.active) drawHud();
    UI.stack.forEach(function (o) {
      if (o.underFx) return;
      try { if (o.draw) o.draw(UI.t); } catch (e) { G.reportError(e, 'overlay draw'); UI.remove(o); }
    });
    drawFx();
    UI.stack.forEach(function (o) { if (o.underFx === false && o.drawTop) o.drawTop(UI.t); });
    drawToasts();
    if (G.dev) drawDebug();
  };

  /* ---------------- fade / flash ---------------- */
  var fx = { fade: 0, fadeColor: '#000', tween: null, flash: 0, flashColor: '#fff', flashDur: 0.3 };
  UI.fx = fx;
  function updateFx(dt) {
    if (fx.tween) {
      fx.tween.t += dt;
      var k = U.clamp(fx.tween.t / fx.tween.dur, 0, 1);
      fx.fade = U.lerp(fx.tween.from, fx.tween.to, k);
      if (k >= 1) { var r = fx.tween.resolve; fx.tween = null; r(); }
    }
    if (fx.flash > 0) fx.flash = Math.max(0, fx.flash - dt / fx.flashDur);
  }
  function drawFx() {
    if (fx.fade > 0.001) R.rect(0, 0, G.W, G.H, fx.fadeColor, fx.fade);
    if (fx.flash > 0.001) R.rect(0, 0, G.W, G.H, fx.flashColor, fx.flash);
  }
  /** Tween the fade overlay to alpha (0 = clear, 1 = covered). */
  UI.fadeTo = function (alpha, ms, color) {
    if (color) fx.fadeColor = color;
    if (fx.tween) { fx.tween.resolve(); fx.tween = null; }
    if (G.auto || !ms) { fx.fade = alpha; return U.nextTick(); }
    return new Promise(function (resolve) { fx.tween = { from: fx.fade, to: alpha, t: 0, dur: ms / 1000, resolve: resolve }; });
  };
  UI.flash = function (color, ms) { fx.flash = 1; fx.flashColor = color || '#fff'; fx.flashDur = (ms || 300) / 1000; };

  /* ---------------- HUD ---------------- */
  var hud = UI.hud = {
    onAir: false,
    approval: { show: false, value: 50, display: 50, label: 'APPROVAL', pulse: 0, delta: 0 },
    lower: null,   // {title, sub, t, dur}
    objective: null, objT: 0,
    hidden: false
  };
  UI.resetHud = function () {
    hud.onAir = false; hud.approval.show = false; hud.lower = null; hud.objective = null; hud.hidden = false;
  };
  function updateHud(dt) {
    var a = hud.approval;
    a.display += (a.value - a.display) * Math.min(1, dt * 4);
    if (Math.abs(a.value - a.display) < 0.05) a.display = a.value;
    if (a.pulse > 0) a.pulse -= dt;
    if (hud.lower) { hud.lower.t += dt; if (hud.lower.dur && hud.lower.t > hud.lower.dur) hud.lower = null; }
    hud.objT += dt;
  }
  UI.setApproval = function (v, opts) {
    opts = opts || {};
    var a = hud.approval;
    var nv = U.clamp(Math.round(v), 0, 100);
    a.delta = nv - a.value;
    if (a.delta) a.pulse = 1.2;
    a.value = nv;
    if (opts.label) a.label = opts.label;
    if (opts.instant) a.display = nv;
    if (opts.show !== undefined) a.show = opts.show; else a.show = true;
  };
  function drawHud() {
    if (hud.hidden) return;
    var t = UI.t;
    // ON AIR
    if (hud.onAir) {
      var x = G.W - 58, y = 6;
      R.rect(x, y, 52, 13, '#000', 0.6);
      R.rect(x, y, 52, 1, P.red);
      R.recDot(x + 8, y + 7, t);
      R.text('ON AIR', x + 15, y + 3, { size: 8, color: Math.floor(t * 2) % 2 ? '#fff' : '#ffd0d0' });
    }
    // approval meter
    var a = hud.approval;
    if (a.show) {
      var ax = 6, ay = 6, aw = 92;
      R.rect(ax, ay, aw + 8, 22, '#000', 0.6);
      R.rect(ax, ay, aw + 8, 1, P.amber);
      R.text(a.label, ax + 4, ay + 3, { size: 6, color: P.amber });
      R.text(Math.round(a.display) + '%', ax + aw + 4, ay + 3, { size: 6, align: 'right', color: '#fff' });
      R.rect(ax + 4, ay + 12, aw, 6, '#1a1a22');
      var col = a.display < 25 ? P.red : a.display < 50 ? P.amber : P.neon;
      R.rect(ax + 4, ay + 12, aw * a.display / 100, 6, col);
      for (var i = 1; i < 10; i++) R.rect(ax + 4 + aw * i / 10, ay + 12, 0.5, 6, 'rgba(0,0,0,0.5)');
      if (a.pulse > 0 && a.delta) {
        R.text((a.delta > 0 ? '+' : '') + a.delta, ax + aw + 14, ay + 10 - (1.2 - a.pulse) * 6, { size: 8, color: a.delta > 0 ? P.neon : P.red, alpha: Math.min(1, a.pulse) });
      }
    }
    // objective
    if (hud.objective) {
      var oy = a.show ? 32 : 6;
      var alpha = Math.min(1, hud.objT * 2);
      var tw = R.measure(hud.objective, 7) + 16;
      R.rect(6, oy, tw, 12, '#000', 0.45 * alpha);
      R.text('▸ ' + hud.objective, 10, oy + 3, { size: 7, color: P.text, alpha: alpha });
    }
    // lower third
    if (hud.lower) {
      var L = hud.lower, k = U.ease(U.clamp(L.t / 0.4, 0, 1));
      if (L.dur && L.t > L.dur - 0.4) k = U.ease(U.clamp((L.dur - L.t) / 0.4, 0, 1));
      // bottom of the screen like real TV; lifted above the dialogue box while one is open
      var lx = -220 + 228 * k, ly = UI.blocking() ? 104 : G.H - 40;
      var w1 = Math.max(150, R.measure(L.title, 10) + 20), w2 = Math.max(150, R.measure(L.sub || '', 7) + 20);
      R.rect(lx, ly, w1, 16, P.red);
      R.rect(lx, ly, 3, 16, '#fff');
      R.text(L.title, lx + 9, ly + 3, { size: 10, font: 'sans', color: '#fff' });
      if (L.sub) { R.rect(lx, ly + 16, w2, 12, '#111', 0.9); R.text(L.sub, lx + 9, ly + 18, { size: 7, color: '#ddd' }); }
      if (L.tag) { R.rect(lx + w1 - 2, ly, 34, 16, '#fff'); R.text(L.tag, lx + w1 + 15, ly + 4, { size: 7, color: P.red, align: 'center' }); }
    }
  }
  UI.lowerThird = function (title, sub, ms, tag) {
    if (!title) { hud.lower = null; return; }
    hud.lower = { title: title, sub: sub || '', t: 0, dur: ms ? ms / 1000 : 0, tag: tag || 'LIVE' };
  };
  UI.objective = function (text) { if (text !== hud.objective) hud.objT = 0; hud.objective = text || null; };

  /* ---------------- toasts ---------------- */
  UI.toasts = [];
  UI.toast = function (text, color, dur) { UI.toasts.push({ text: text, color: color || P.text, t: 0, dur: dur || 2.5 }); if (UI.toasts.length > 4) UI.toasts.shift(); };
  function drawToasts() {
    UI.toasts.forEach(function (t, i) {
      var a = Math.min(1, t.t * 4, (t.dur - t.t) * 3);
      var w = R.measure(t.text, 7) + 14;
      R.rect(G.W / 2 - w / 2, 30 + i * 14, w, 12, '#000', 0.75 * a);
      R.text(t.text, G.W / 2, 33 + i * 14, { size: 7, align: 'center', color: t.color, alpha: a });
    });
  }

  /* ---------------- title card ---------------- */
  /** Big centred title ("Week 2"). Resolves after ms or on key press. */
  UI.titleCard = function (title, sub, ms, opts) {
    opts = opts || {};
    G.log('[title] ' + title + (sub ? ' / ' + sub : ''));
    if (G.auto) return U.nextTick();
    var dur = (ms || 2600) / 1000;
    return new Promise(function (resolve) {
      var o = {
        input: true, t: 0,
        update: function (dt, top) {
          o.t += dt;
          if (top && o.t > 0.6 && G.Input.pressed('ok')) { G.Input.consume('ok'); o.t = Math.max(o.t, dur - 0.4); }
          if (o.t >= dur) { UI.remove(o); resolve(); }
        },
        draw: function (t) {
          var a = Math.min(1, o.t * 2.5, (dur - o.t) * 2.5);
          R.rect(0, 0, G.W, G.H, opts.bg || '#000', opts.transparent ? 0.6 * a : Math.min(1, a * 1.5));
          R.static(0.04 * a);
          var w = Math.min(G.W - 40, R.measure(title, 26, 'title', '') + 40);
          R.rect(G.W / 2 - w / 2, 92, w, 1, P.red, a);
          R.rect(G.W / 2 - w / 2, 126, w, 1, P.red, a);
          R.text(title, G.W / 2 + 1, 96, { size: 26, font: 'title', style: '', align: 'center', color: '#5a0a10', alpha: a, shadow: false });
          R.text(title, G.W / 2, 95, { size: 26, font: 'title', style: '', align: 'center', color: '#f2efe8', alpha: a });
          if (sub) R.text(sub, G.W / 2, 133, { size: 8, align: 'center', color: P.dim, alpha: a });
          if (opts.kicker) R.text(opts.kicker, G.W / 2, 80, { size: 7, align: 'center', color: P.red, alpha: a });
          void t;
        }
      };
      UI.push(o);
    });
  };

  /* ---------------- slides ----------------
   * slide: {text, title, style:'black'|'montage'|'tv'|'letter'|'note'|'screen'|'card',
   *         speaker (cast id for TV anchor), from, ticker, headline, ms (auto-advance), draw(t, slide)}
   */
  UI.slides = function (slides, opts) {
    opts = opts || {};
    slides = (Array.isArray(slides) ? slides : [slides]).map(function (s) { return typeof s === 'string' ? { text: s } : s; });
    slides.forEach(function (s) { G.log('[slide:' + (s.style || opts.style || 'black') + '] ' + (s.title || s.headline || '') + ' ' + (s.text || '')); });
    if (G.auto) return U.nextTick();
    return new Promise(function (resolve) {
      var idx = 0;
      var o = {
        input: true, t: 0,
        update: function (dt, top) {
          o.t += dt;
          var s = slides[idx];
          var adv = (s.ms && o.t * 1000 >= s.ms) || (top && o.t > 0.35 && G.Input.pressed('ok'));
          if (adv) {
            G.Input.consume('ok');
            G.Audio.play('select');
            idx++; o.t = 0;
            if (idx >= slides.length) { UI.remove(o); resolve(); }
          }
        },
        draw: function (t) {
          var s = slides[idx]; if (!s) return;
          var style = s.style || opts.style || 'black';
          var a = Math.min(1, o.t * 3);
          (SLIDE[style] || SLIDE.black)(s, a, t, o.t);
          if (s.draw) s.draw(t, s, a);
          if (o.t > 0.35 && !s.ms) {
            var c = style === 'letter' || style === 'note' ? '#5a4a3a' : P.dim;
            R.text('▼', G.W - 12, G.H - 14 + Math.round(Math.sin(t * 6)), { size: 8, color: c, shadow: false });
          }
        }
      };
      UI.push(o);
    });
  };
  function centeredText(text, y, size, font, color, a, maxW, style, lh) {
    var lines = R.wrap(text || '', maxW || 300, size, font, style);
    lh = lh || size * 1.45;
    var y0 = y == null ? G.H / 2 - (lines.length * lh) / 2 : y;
    lines.forEach(function (l, i) { R.text(l, G.W / 2, y0 + i * lh, { size: size, font: font, style: style, align: 'center', color: color, alpha: a, shadow: false }); });
    return y0 + lines.length * lh;
  }
  var SLIDE = {
    black: function (s, a) {
      R.rect(0, 0, G.W, G.H, '#030305');
      if (s.title) R.text(s.title.toUpperCase(), G.W / 2, 40, { size: 8, align: 'center', color: P.red, alpha: a });
      centeredText(s.text, null, 10, 'serif', '#e8e4d8', a, 300, '', 15);
    },
    montage: function (s, a, t) {
      R.rect(0, 0, G.W, G.H, '#0a0a10');
      R.static(0.05);
      if (s.title) R.text(s.title.toUpperCase(), 24, 24, { size: 8, color: P.amber, alpha: a });
      centeredText(s.text, null, 10, 'serif', '#e8e4d8', a, 320, 'italic', 15);
      R.vignette(0.7); void t;
    },
    card: function (s, a) {
      R.rect(0, 0, G.W, G.H, '#000');
      R.text(s.title || s.text, G.W / 2, 95, { size: 26, font: 'title', style: '', align: 'center', alpha: a });
      if (s.title && s.text) R.text(s.text, G.W / 2, 133, { size: 8, align: 'center', color: P.dim, alpha: a });
    },
    tv: function (s, a, t, st) {
      // broadcast frame
      var g = R.ctx;
      var grad = g.createLinearGradient(0, 0, 0, G.H);
      grad.addColorStop(0, '#1a0a1e'); grad.addColorStop(1, '#3a0a14');
      g.fillStyle = grad; g.fillRect(0, 0, G.W, G.H);
      // studio light beams
      g.save(); g.globalAlpha = 0.07;
      for (var i = 0; i < 5; i++) { g.fillStyle = '#ffd'; g.beginPath(); g.moveTo(40 + i * 80, 0); g.lineTo(10 + i * 80 + Math.sin(t + i) * 20, G.H); g.lineTo(70 + i * 80 + Math.sin(t + i) * 20, G.H); g.fill(); }
      g.restore();
      if (s.speaker) {
        var por = G.Sprites.portrait(s.speaker, s.mood);
        R.rect(G.W / 2 - 62, 30, 124, 124, '#000', 0.4);
        R.img(por, G.W / 2 - 60, 32, 3);
      }
      // headline lower third
      var head = s.headline || s.title || '';
      if (head) {
        R.rect(0, 140, G.W, 20, P.red);
        R.rect(0, 140, 70, 20, '#fff');
        R.text(s.tag || 'LIVE', 35, 145, { size: 10, font: 'sans', align: 'center', color: P.red, shadow: false });
        R.text(head.toUpperCase(), 78, 144, { size: 11, font: 'sans', color: '#fff' });
      }
      if (s.text) {
        R.rect(0, 160, G.W, 30, '#0c0c12', 0.92);
        var lines = R.wrap(s.text, G.W - 24, 8);
        lines.slice(0, 2).forEach(function (l, i) { R.text(l, 12, 164 + i * 11, { size: 8, color: '#eee', alpha: a }); });
      }
      // ticker
      var tick = s.ticker || (G.manifest.game && G.manifest.game.ticker) || 'STAY TUNED • VOTE RESPONSIBLY • JUSTICE IS ENTERTAINMENT • ';
      R.rect(0, 192, G.W, 12, '#e8c15a');
      var tw = R.measure(tick, 7) + 30;
      var off = -((t * 40) % tw);
      for (var x = off; x < G.W; x += tw) R.text(tick, x, 194, { size: 7, color: '#111', shadow: false });
      // channel bug
      R.rect(8, 8, 74, 14, '#000', 0.6);
      R.recDot(16, 15, t);
      R.text((G.manifest.game && G.manifest.game.network) || 'CH 1 • LIVE', 24, 11, { size: 7, color: '#fff' });
      R.text(clock(), G.W - 10, 11, { size: 7, align: 'right', color: '#fff' });
      R.scanlines(0.2); R.static(0.035); R.vignette(0.5);
      void st;
    },
    letter: function (s, a) {
      R.rect(0, 0, G.W, G.H, '#15110e');
      var x = 52, y = 12, w = G.W - 104, h = G.H - 24;
      R.rect(x + 3, y + 3, w, h, '#000', 0.5);
      R.rect(x, y, w, h, P.paper);
      for (var ly = y + 30; ly < y + h - 8; ly += 13) R.rect(x + 8, ly, w - 16, 0.5, '#b8c0d0');
      R.rect(x + 22, y, 0.5, h, '#d89090');
      if (s.title) R.text(s.title, x + 28, y + 10, { size: 11, font: 'hand', style: '', color: P.paperInk, shadow: false, alpha: a });
      var lines = R.wrap(s.text || '', w - 40, 10, 'hand', '');
      lines.forEach(function (l, i) { R.text(l, x + 28, y + 19 + 13 * (i + (s.title ? 1 : 0)) - 0, { size: 10, font: 'hand', style: '', color: P.paperInk, shadow: false, alpha: a }); });
      if (s.from) R.text('— ' + s.from, x + w - 16, y + h - 18, { size: 10, font: 'hand', style: '', align: 'right', color: P.paperInk, shadow: false, alpha: a });
    },
    note: function (s, a) {
      R.rect(0, 0, G.W, G.H, '#0e0d10');
      R.vignette(0.6);
      var w = 200, h = 120, x = G.W / 2 - w / 2, y = G.H / 2 - h / 2;
      var g = R.ctx; g.save(); g.translate(G.W / 2, G.H / 2); g.rotate(-0.03); g.translate(-G.W / 2, -G.H / 2);
      R.rect(x + 3, y + 4, w, h, '#000', 0.5);
      R.rect(x, y, w, h, '#efe6c8');
      for (var i = 0; i < w; i += 6) R.rect(x + i, y + h - 2 + (i % 12 ? 1 : 0), 6, 2, '#0e0d10');
      var ty = y + 12;
      if (s.title) { R.text(s.title, G.W / 2, ty, { size: 11, font: 'hand', style: '', align: 'center', color: '#2a2420', shadow: false, alpha: a }); ty += 16; }
      var lines = R.wrap(s.text || '', w - 24, 11, 'hand', '');
      lines.forEach(function (l, j) { R.text(l, G.W / 2, ty + j * 14, { size: 11, font: 'hand', style: '', align: 'center', color: '#2a2420', shadow: false, alpha: a }); });
      g.restore();
    },
    screen: function (s, a, t, st) {
      R.rect(0, 0, G.W, G.H, '#020806');
      var shown = Math.floor(st * 60);
      if (s.title) R.text('> ' + s.title.toUpperCase(), 20, 18, { size: 8, color: '#4aff8a', alpha: a });
      var lines = R.wrap(s.text || '', G.W - 40, 8);
      var count = 0;
      lines.forEach(function (l, i) {
        var part = l.slice(0, Math.max(0, shown - count)); count += l.length;
        R.text(part, 20, 36 + i * 12, { size: 8, color: '#8affb0', shadow: false });
      });
      if (Math.floor(t * 2) % 2) R.rect(20, 36 + lines.length * 12, 5, 8, '#4aff8a');
      R.scanlines(0.3);
    }
  };
  UI.SLIDE_STYLES = SLIDE;
  function clock() { var d = new Date(); return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2); }

  /* ---------------- debug overlay (?dev=1) ---------------- */
  UI.debugFlags = false;
  var fps = 60, lastT = performance.now();
  function drawDebug() {
    var now = performance.now(); fps = fps * 0.95 + (1000 / Math.max(1, now - lastT)) * 0.05; lastT = now;
    if (G.Input.pressed('debug')) UI.debugFlags = !UI.debugFlags;
    var W = G.World, lines = [];
    var s = G.Game && G.Game.session;
    lines.push((s ? s.chapterId : '-') + ' | ' + (W.active && W.room ? W.room.def.id : '-') + (W.active ? ' @' + W.playerTile().x + ',' + W.playerTile().y : '') + ' | ' + Math.round(fps) + 'fps' + (G.Script.busy() ? ' | busy' : '') + (G.auto ? ' | AUTO' : ''));
    var y = G.H - 10;
    R.rect(G.W - 190, y - 2, 190, 12, '#000', 0.55);
    R.text(lines[0], G.W - 4, y, { size: 6, align: 'right', color: '#8f8', font: 'mono' });
    if (UI.debugFlags) {
      var fl = G.Game && G.Game.state ? G.Game.state.flags : {};
      var keys = Object.keys(fl).sort();
      R.rect(G.W - 150, 20, 150, Math.min(G.H - 34, 10 + keys.length * 8), '#000', 0.75);
      R.text('FLAGS (` to hide)', G.W - 146, 23, { size: 6, color: P.amber });
      keys.slice(0, 20).forEach(function (k, i) { R.text(k + ' = ' + JSON.stringify(fl[k]), G.W - 146, 32 + i * 8, { size: 6, color: '#ddd' }); });
    }
  }
})();
