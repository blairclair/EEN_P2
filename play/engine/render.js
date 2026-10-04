/* =========================================================================
 * render.js: canvases, integer scaling, letterboxing, text helpers.
 *
 * Two layers:
 *  - G.Render.px : the low-res 384x216 canvas the WORLD is drawn into (pixel art).
 *  - the display canvas: the px canvas is blitted to it with integer scaling,
 *    then UI is drawn on top at native resolution using a transform, so UI
 *    code still uses virtual 384x216 coordinates but text stays crisp.
 * ========================================================================= */
(function () {
  'use strict';
  var G = window.G;
  var U = G.util;

  var R = (G.Render = {});
  R.FONT = {
    mono: '"Menlo","Consolas","DejaVu Sans Mono","Courier New",monospace',
    title: '"Impact","Haettenschweiler","Arial Narrow Bold","Arial Black",sans-serif',
    serif: '"Georgia","Times New Roman",serif',
    hand: '"Bradley Hand","Segoe Print","Chalkboard SE","Comic Sans MS",cursive',
    sans: '"Helvetica Neue","Arial",sans-serif'
  };
  // Shared palette. Moody, desaturated, with a hot broadcast red and a sickly neon.
  R.PAL = {
    ink: '#0b0b10', night: '#14141c', panel: '#1b1b26', panel2: '#252534', line: '#3a3a52',
    text: '#e8e4d8', dim: '#9a96a8', faint: '#5c5a6c',
    red: '#e8323c', redDark: '#7a1218', amber: '#f2b33d', teal: '#3fc1c9', neon: '#b6f24a',
    blue: '#6c8cff', think: '#9fb8ff', paper: '#e9dfc4', paperInk: '#2a2420', gold: '#e8c15a'
  };

  R.init = function () {
    var c = document.getElementById('game');
    if (!c) { c = document.createElement('canvas'); c.id = 'game'; document.body.appendChild(c); }
    R.canvas = c;
    R.ctx = c.getContext('2d');
    R.pxCanvas = document.createElement('canvas');
    R.pxCanvas.width = G.W; R.pxCanvas.height = G.H;
    R.px = R.pxCanvas.getContext('2d');
    R.px.imageSmoothingEnabled = false;
    R.resize();
    window.addEventListener('resize', R.resize);
  };

  R.resize = function () {
    var dpr = window.devicePixelRatio || 1;
    var w = Math.max(1, window.innerWidth), h = Math.max(1, window.innerHeight);
    R.canvas.style.width = w + 'px';
    R.canvas.style.height = h + 'px';
    R.canvas.width = Math.round(w * dpr);
    R.canvas.height = Math.round(h * dpr);
    var s = Math.min(R.canvas.width / G.W, R.canvas.height / G.H);
    if (s >= 1) s = Math.floor(s); // integer scaling, crisp pixels
    R.scale = s;
    R.offX = Math.floor((R.canvas.width - G.W * s) / 2);
    R.offY = Math.floor((R.canvas.height - G.H * s) / 2);
  };

  /** Begin a frame: clear the display canvas to black (letterbox). */
  R.beginFrame = function () {
    var ctx = R.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, R.canvas.width, R.canvas.height);
    R.ui();
  };
  /** Set the display ctx to virtual (384x216) UI coordinates. */
  R.ui = function () {
    R.ctx.setTransform(R.scale, 0, 0, R.scale, R.offX, R.offY);
    R.ctx.imageSmoothingEnabled = false;
  };
  /** Blit the pixel layer onto the display. */
  R.blitPx = function () {
    R.ui();
    R.ctx.drawImage(R.pxCanvas, 0, 0);
  };
  /** Clip UI drawing to the game area (no drawing into the letterbox). */
  R.clipGame = function () {
    R.ctx.save();
    R.ctx.beginPath(); R.ctx.rect(0, 0, G.W, G.H); R.ctx.clip();
  };

  /* ---------------- drawing helpers (virtual coords, display ctx) -------- */
  R.font = function (size, kind, style) {
    return (style ? style + ' ' : '') + size + 'px ' + (R.FONT[kind || 'mono'] || kind);
  };
  /**
   * Draw text. opts: {size, color, align, baseline, font:'mono'|'title'|'serif'|'hand'|'sans',
   * style:'bold'|'italic'|..., shadow:true|color, alpha, ctx}
   */
  R.text = function (str, x, y, opts) {
    opts = opts || {};
    var ctx = opts.ctx || R.ctx;
    ctx.save();
    if (opts.alpha != null) ctx.globalAlpha *= opts.alpha;
    ctx.font = R.font(opts.size || 8, opts.font, opts.style === undefined ? 'bold' : opts.style);
    ctx.textAlign = opts.align || 'left';
    ctx.textBaseline = opts.baseline || 'top';
    if (opts.shadow !== false) {
      ctx.fillStyle = typeof opts.shadow === 'string' ? opts.shadow : 'rgba(0,0,0,0.75)';
      var so = (opts.size || 8) >= 14 ? 1 : 0.5;
      ctx.fillText(str, x + so, y + so);
    }
    ctx.fillStyle = opts.color || R.PAL.text;
    ctx.fillText(str, x, y);
    ctx.restore();
  };
  R.measure = function (str, size, font, style) {
    var ctx = R.ctx;
    ctx.save();
    ctx.font = R.font(size || 8, font, style === undefined ? 'bold' : style);
    var w = ctx.measureText(str).width;
    ctx.restore();
    return w;
  };
  /** Word-wrap text to lines that fit maxW (virtual px). Honours '\n'. */
  R.wrap = function (str, maxW, size, font, style) {
    var ctx = R.ctx;
    ctx.save();
    ctx.font = R.font(size || 8, font, style === undefined ? 'bold' : style);
    var out = [];
    String(str).split('\n').forEach(function (para) {
      var words = para.split(' '), line = '';
      for (var i = 0; i < words.length; i++) {
        var test = line ? line + ' ' + words[i] : words[i];
        if (ctx.measureText(test).width > maxW && line) { out.push(line); line = words[i]; }
        else line = test;
      }
      out.push(line);
    });
    ctx.restore();
    return out;
  };
  R.rect = function (x, y, w, h, color, alpha) {
    var ctx = R.ctx;
    if (alpha != null) { ctx.save(); ctx.globalAlpha *= alpha; }
    ctx.fillStyle = color; ctx.fillRect(x, y, w, h);
    if (alpha != null) ctx.restore();
  };
  R.stroke = function (x, y, w, h, color, lw) {
    var ctx = R.ctx;
    ctx.strokeStyle = color; ctx.lineWidth = lw || 1;
    ctx.strokeRect(x + (lw || 1) / 2, y + (lw || 1) / 2, w - (lw || 1), h - (lw || 1));
  };
  /** The standard UI panel: dark body, bevel, thin accent line. */
  R.panel = function (x, y, w, h, opts) {
    opts = opts || {};
    var ctx = R.ctx;
    ctx.save();
    ctx.globalAlpha = opts.alpha != null ? opts.alpha : 0.94;
    ctx.fillStyle = opts.bg || R.PAL.panel;
    ctx.fillRect(x, y, w, h);
    ctx.globalAlpha = 1;
    ctx.fillStyle = opts.border || R.PAL.line;
    ctx.fillRect(x, y, w, 1); ctx.fillRect(x, y + h - 1, w, 1);
    ctx.fillRect(x, y, 1, h); ctx.fillRect(x + w - 1, y, 1, h);
    if (opts.accent !== false) {
      ctx.fillStyle = opts.accent || R.PAL.red;
      ctx.fillRect(x + 1, y + 1, w - 2, 1);
    }
    ctx.restore();
  };
  /** Draw a pixel-art canvas (sprite/portrait) at virtual coords, scaled. */
  R.img = function (canvas, x, y, scale, ctx) {
    ctx = ctx || R.ctx;
    scale = scale || 1;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(canvas, Math.round(x), Math.round(y), canvas.width * scale, canvas.height * scale);
  };

  /* ---------------- noise / CRT effects ---------------- */
  var noiseCanvas = document.createElement('canvas');
  noiseCanvas.width = 128; noiseCanvas.height = 72;
  var noiseCtx = noiseCanvas.getContext('2d');
  var noiseData = noiseCtx.createImageData(128, 72);
  R.updateNoise = function (intensity) {
    var d = noiseData.data;
    for (var i = 0; i < d.length; i += 4) {
      var v = (Math.random() * 255 * (intensity || 1)) | 0;
      d[i] = v; d[i + 1] = v; d[i + 2] = v + 8; d[i + 3] = 255;
    }
    noiseCtx.putImageData(noiseData, 0, 0);
    return noiseCanvas;
  };
  R.static = function (alpha, x, y, w, h) {
    var ctx = R.ctx;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(R.updateNoise(1), x || 0, y || 0, w || G.W, h || G.H);
    ctx.restore();
  };
  // pre-rendered scanline pattern
  var scan = null;
  R.scanlines = function (alpha) {
    var ctx = R.ctx;
    if (!scan) {
      var c = document.createElement('canvas'); c.width = 1; c.height = 2;
      var g = c.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 1, 1, 1);
      scan = ctx.createPattern(c, 'repeat');
    }
    ctx.save(); ctx.globalAlpha = alpha == null ? 0.18 : alpha;
    ctx.fillStyle = scan; ctx.fillRect(0, 0, G.W, G.H); ctx.restore();
  };
  var vignetteGrad = null;
  R.vignette = function (alpha) {
    var ctx = R.ctx;
    if (!vignetteGrad) {
      vignetteGrad = ctx.createRadialGradient(G.W / 2, G.H / 2, G.H * 0.35, G.W / 2, G.H / 2, G.W * 0.62);
      vignetteGrad.addColorStop(0, 'rgba(0,0,0,0)');
      vignetteGrad.addColorStop(1, 'rgba(0,0,0,1)');
    }
    ctx.save(); ctx.globalAlpha = alpha == null ? 0.55 : alpha;
    ctx.fillStyle = vignetteGrad; ctx.fillRect(0, 0, G.W, G.H); ctx.restore();
  };
  /** Little blinking red "recording" dot. */
  R.recDot = function (x, y, t) {
    if (Math.floor(t * 2) % 2 === 0) {
      R.ctx.fillStyle = R.PAL.red;
      R.ctx.beginPath(); R.ctx.arc(x, y, 2.5, 0, Math.PI * 2); R.ctx.fill();
    }
  };
})();
