/* =========================================================================
 * menus.js: title screen, pause menu, settings, chapter select, credits.
 * ========================================================================= */
(function () {
  'use strict';
  var G = window.G;
  var U = G.util;
  var R = G.Render;
  var P = R.PAL;
  var Mn = (G.Menus = {});

  /**
   * Generic vertical menu overlay.
   * items: [{label | label(): string, action(), disabled, left(), right()}]
   */
  function menu(opts) {
    var o = {
      input: true, isMenu: true, pause: !!opts.pause, sel: 0, t: 0, items: opts.items,
      update: function (dt, top) {
        o.t += dt;
        if (!top) return;
        var I = G.Input, items = o.items.filter(function (it) { return !it.hidden; });
        if (o.sel >= items.length) o.sel = 0;
        var d = I.repeat('up') ? -1 : I.repeat('down') ? 1 : 0;
        if (d) { for (var k = 0; k < items.length; k++) { o.sel = (o.sel + d + items.length) % items.length; if (!items[o.sel].disabled) break; } G.Audio.play('blip'); }
        var it = items[o.sel];
        if (it && I.repeat('left') && it.left) { it.left(); G.Audio.play('blip'); }
        if (it && I.repeat('right') && it.right) { it.right(); G.Audio.play('blip'); }
        if (I.pressed('ok') && o.t > 0.15 && it && !it.disabled) { I.consume('ok'); G.Audio.play('confirm'); it.action && it.action(); }
        if ((I.pressed('menu') || I.pressed('back')) && opts.back && o.t > 0.1) { I.consume('menu'); I.consume('back'); G.Audio.play('cancel'); opts.back(); }
      },
      draw: function (t) {
        if (opts.drawBg) opts.drawBg(t, o);
        var items = o.items.filter(function (it) { return !it.hidden; });
        var x = opts.x != null ? opts.x : G.W / 2, y = opts.y != null ? opts.y : 100, lh = opts.lh || 14;
        if (opts.panel) {
          var w = opts.w || 180, h = items.length * lh + 12 + (opts.title ? 18 : 0);
          R.panel(x - w / 2, y - 8 - (opts.title ? 18 : 0), w, h, {});
        }
        if (opts.title) R.text(opts.title, x, y - 20, { size: 9, align: 'center', color: P.amber });
        items.forEach(function (it, i) {
          var on = i === o.sel;
          var label = typeof it.label === 'function' ? it.label() : it.label;
          var col = it.disabled ? P.faint : on ? '#fff' : P.dim;
          if (on) R.rect(x - (opts.w || 180) / 2 + 6, y + i * lh - 2, (opts.w || 180) - 12, lh - 1, P.red, 0.35);
          R.text((on ? '▶ ' : '') + label + (on ? ' ◀' : ''), x, y + i * lh, { size: opts.size || 9, align: 'center', color: col });
        });
        if (opts.footer) R.text(opts.footer, G.W / 2, G.H - 12, { size: 6, align: 'center', color: P.faint });
      }
    };
    return o;
  }
  Mn.menu = menu;
  function closeAll() { G.UI.clear(function (o) { return !o.isMenu; }); }

  /* ---------------- title ---------------- */
  function drawTitleBg(t) {
    var g = R.ctx;
    R.rect(0, 0, G.W, G.H, '#07060a');
    // static with rolling band
    R.static(0.13);
    var band = (t * 40) % (G.H + 40) - 20;
    R.rect(0, band, G.W, 14, '#fff', 0.04);
    // eye logo (surveillance)
    var cx = G.W / 2, cy = 62;
    g.save();
    g.strokeStyle = 'rgba(232,50,60,0.85)'; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(cx - 34, cy); g.quadraticCurveTo(cx, cy - 26, cx + 34, cy); g.quadraticCurveTo(cx, cy + 26, cx - 34, cy); g.stroke();
    var look = Math.sin(t * 0.7) * 8;
    g.fillStyle = 'rgba(232,50,60,0.9)'; g.beginPath(); g.arc(cx + look, cy, 9, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#07060a'; g.beginPath(); g.arc(cx + look, cy, 4, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#fff'; g.fillRect(cx + look + 2, cy - 4, 2, 2);
    g.restore();
    // title with chromatic offset + glitch
    var game = G.manifest.game || {};
    var title = game.title || 'LIVE JUDGMENT';
    var gl = Math.random() < 0.04 ? (Math.random() * 6 - 3) : 0;
    R.text(title, cx - 1.5 + gl, 92, { size: 30, font: 'title', style: '', align: 'center', color: 'rgba(0,220,255,0.6)', shadow: false });
    R.text(title, cx + 1.5 - gl, 92, { size: 30, font: 'title', style: '', align: 'center', color: 'rgba(255,40,60,0.7)', shadow: false });
    R.text(title, cx, 92, { size: 30, font: 'title', style: '', align: 'center', color: '#f2efe8', shadow: false });
    if (game.subtitle) R.text(game.subtitle, cx, 126, { size: 7, align: 'center', color: P.dim });
    // LIVE bug
    R.rect(8, 8, 40, 13, '#000', 0.6); R.recDot(16, 14.5, t); R.text('LIVE', 22, 11, { size: 7, color: '#fff' });
    R.text('CH 1', G.W - 10, 11, { size: 7, align: 'right', color: '#fff' });
    // ticker
    var tick = game.ticker || 'TONIGHT: THE PEOPLE DECIDE • VOTE RESPONSIBLY • JUSTICE IS ENTERTAINMENT • ';
    R.rect(0, G.H - 24, G.W, 11, P.red);
    var tw = R.measure(tick, 7);
    for (var x = -((t * 30) % tw); x < G.W; x += tw) R.text(tick, x, G.H - 22, { size: 7, color: '#fff', shadow: false });
    R.scanlines(0.25);
    R.vignette(0.7);
  }

  Mn.title = function () {
    closeAll();
    G.World.active = false;
    G.Audio.ambient(null);
    var has = G.Save.has();
    var items = [
      { label: 'Continue', action: function () { closeAll(); G.Game.continueGame(); }, hidden: !has },
      { label: 'New Game', action: function () { closeAll(); G.Game.newGame(); } },
      { label: 'Chapter Select', action: function () { Mn.chapterSelect(); } },
      { label: 'Settings', action: function () { Mn.settings(); } },
      { label: 'Credits', action: function () { Mn.credits(); } }
    ];
    var o = menu({ items: items, y: 138, lh: 12, w: 140, size: 8, drawBg: drawTitleBg, footer: 'ARROWS/WASD move • E/SPACE select • ESC menu • M mute' + (G.dev ? ' • DEV' : '') });
    o.isTitle = true;
    G.UI.push(o);
    return o;
  };

  /* ---------------- pause ---------------- */
  Mn.pause = function () {
    var o;
    function close() { G.UI.remove(o); }
    var items = [
      { label: 'Resume', action: close },
      { label: 'Settings', action: function () { Mn.settings(); } },
      { label: 'Restart Chapter', action: function () { close(); G.Game.restartChapter(); } },
      { label: 'Skip Chapter (dev)', hidden: !G.dev, action: function () { close(); G.Game.completeChapter(); } },
      { label: 'Chapter Select', hidden: !G.dev, action: function () { Mn.chapterSelect(); } },
      { label: 'Quit to Title', action: function () { G.Game.quitToTitle(); } }
    ];
    o = menu({
      items: items, pause: true, panel: true, title: 'PAUSED', y: 80, back: close,
      drawBg: function () { R.rect(0, 0, G.W, G.H, '#000', 0.55); var s = G.Game.session; if (s) R.text((G.chapters[s.chapterId] || {}).title || '', G.W / 2, 40, { size: 8, align: 'center', color: P.dim }); }
    });
    G.UI.push(o);
  };

  /* ---------------- settings ---------------- */
  Mn.settings = function () {
    var s = G.Save.settings, o;
    var speeds = ['slow', 'normal', 'fast', 'instant'];
    function cycleSpeed(d) { s.textSpeed = speeds[(speeds.indexOf(s.textSpeed) + d + speeds.length) % speeds.length]; G.Save.saveSettings(); }
    function vol(d) { s.volume = U.clamp(Math.round((s.volume + d) * 10) / 10, 0, 1); G.Audio.setVolume(s.volume); G.Save.saveSettings(); G.Audio.play('blip'); }
    function back() { G.UI.remove(o); }
    o = menu({
      pause: true, panel: true, title: 'SETTINGS', y: 70, w: 200, back: back,
      items: [
        { label: function () { return 'Text speed: < ' + s.textSpeed + ' >'; }, action: function () { cycleSpeed(1); }, left: function () { cycleSpeed(-1); }, right: function () { cycleSpeed(1); } },
        { label: function () { return 'Volume: < ' + Math.round(s.volume * 10) + ' >'; }, action: function () { vol(0.1); }, left: function () { vol(-0.1); }, right: function () { vol(0.1); } },
        { label: function () { return 'Sound: ' + (s.muted ? 'OFF' : 'ON'); }, action: function () { s.muted = G.Audio.toggleMute(); G.Save.saveSettings(); } },
        { label: function () { return 'Screen shake: ' + (s.shake ? 'ON' : 'OFF'); }, action: function () { s.shake = !s.shake; G.Save.saveSettings(); } },
        { label: function () { return 'CRT scanlines: ' + (s.crt ? 'ON' : 'OFF'); }, action: function () { s.crt = !s.crt; G.Save.saveSettings(); } },
        { label: 'Back', action: back }
      ],
      drawBg: function () { R.rect(0, 0, G.W, G.H, '#000', 0.5); }
    });
    G.UI.push(o);
  };

  /* ---------------- chapter select ---------------- */
  Mn.chapterSelect = function () {
    var list = G.chapterList(G.dev);
    var o, scroll = 0;
    function back() { G.UI.remove(o); }
    var items = list.map(function (c) {
      var unlocked = G.Game.isUnlocked(c.id);
      var num = c.hidden ? '★' : (c.number != null ? c.number : '');
      return {
        label: (num !== '' ? num + '. ' : '') + (unlocked ? c.title : '- locked -') + (G.Game.state.completed.indexOf(c.id) >= 0 ? '  ✓' : ''),
        disabled: !unlocked,
        action: function () { G.Game.quitToTitle(); closeAll(); G.Game.playChapter(c.id); }
      };
    });
    items.push({ label: 'Back', action: back });
    o = menu({ items: items, pause: true, panel: false, y: 40, w: 300, lh: 12, size: 8, back: back,
      drawBg: function () { R.rect(0, 0, G.W, G.H, '#050508', 0.96); R.static(0.04); R.text('CHAPTER SELECT', G.W / 2, 14, { size: 10, align: 'center', color: P.amber }); if (G.dev) R.text('dev: all unlocked', G.W / 2, 26, { size: 6, align: 'center', color: P.faint }); }
    });
    // scrolling for long lists
    var baseDraw = o.draw;
    o.draw = function (t) {
      var vis = Math.floor((G.H - 60) / 12);
      if (o.sel - scroll >= vis) scroll = o.sel - vis + 1;
      if (o.sel < scroll) scroll = o.sel;
      var all = o.items;
      o.items = all.slice(scroll, scroll + vis);
      var sel = o.sel; o.sel -= scroll;
      baseDraw(t);
      o.sel = sel; o.items = all;
    };
    G.UI.push(o);
  };

  /* ---------------- credits ---------------- */
  Mn.credits = function (onDone) {
    var game = G.manifest.game || {};
    var lines = (game.credits || ['A game adaptation', '', 'Engine: procedural canvas, no assets']).slice();
    lines.push('', '', 'Thank you for watching.');
    var o = {
      input: true, isMenu: true, t: 0,
      update: function (dt, top) {
        o.t += dt;
        var end = (lines.length * 14 + G.H) / 22;
        if ((top && o.t > 0.5 && (G.Input.pressed('ok') || G.Input.pressed('menu'))) || o.t > end || G.auto) { G.Input.consume(); G.UI.remove(o); if (onDone) onDone(); }
      },
      draw: function () {
        R.rect(0, 0, G.W, G.H, '#030305');
        R.static(0.03);
        var y0 = G.H - o.t * 22;
        R.text(game.title || 'LIVE JUDGMENT', G.W / 2, y0, { size: 20, font: 'title', style: '', align: 'center' });
        lines.forEach(function (l, i) { R.text(l, G.W / 2, y0 + 40 + i * 14, { size: 8, align: 'center', color: l === l.toUpperCase() && l ? P.amber : P.text }); });
        R.vignette(0.6);
      }
    };
    G.UI.push(o);
  };
})();
