/* =========================================================================
 * minigames.js: minigame framework + generic minigames:
 *   cipher  : decode a symbol / number / shifted-letter message
 *   qte     : timing bar, key sequence, or button mash
 *   vote    : pick one of N portraits, then a dramatic vote reveal
 *   stealth : sneak across a tile map avoiding guard/camera vision cones
 *
 * Register: G.registerMinigame(id, { start(ctx) -> Promise<result>, autoSolve(params) -> result })
 * Chapter-local: put it in your chapter's `minigames: {name: {...}}` -> id 'chNN:name'.
 * A result is always an object; by convention it has `success: bool`.
 *
 * ctx (passed to start):
 *   ctx.params            the params given to api.minigame(id, params)
 *   ctx.loop(update, draw)  register per-frame callbacks: update(dt) / draw(t)
 *   ctx.input             G.Input (pressed('ok'), down('left'), typed[], dir())
 *   ctx.R                 G.Render (text, rect, panel, img, wrap, measure, static ...)
 *   ctx.px                low-res pixel canvas ctx (call ctx.blitPx() after drawing to it)
 *   ctx.sprite(spec,dir,frame) / ctx.portrait(spec,mood)  pixel canvases
 *   ctx.sound(name), ctx.W, ctx.H, ctx.t (seconds since start)
 *   ctx.header(title, subtitle)  standard top banner
 *   ctx.footer(text)             hint line at the bottom
 * ========================================================================= */
(function () {
  'use strict';
  var G = window.G;
  var U = G.util;
  var R = G.Render;
  var P = R.PAL;
  var M = (G.Minigames = {});

  M.run = function (id, params, ns) {
    var def = G.lookup('minigames', id, ns);
    if (!def) { G.reportError(new Error('Unknown minigame "' + id + '"'), 'minigame'); return Promise.resolve({ success: false, error: 'unknown' }); }
    G.log('[minigame] ' + id);
    if (G.auto) {
      var r;
      try { r = def.autoSolve ? def.autoSolve(params) : { success: true }; } catch (e) { G.reportError(e, 'autoSolve ' + id); r = { success: false }; }
      return Promise.resolve(r).then(function (res) { res = res || {}; res.auto = true; G.log('[minigame result] ' + JSON.stringify(res).slice(0, 120)); return U.nextTick().then(function () { return res; }); });
    }
    var cbs = { update: null, draw: null };
    var ov = { input: true, t: 0 };
    var ctx = {
      params: params, input: G.Input, R: R, PAL: P, W: G.W, H: G.H, t: 0, px: G.Render.px,
      loop: function (u, d) { cbs.update = u; cbs.draw = d; },
      sound: function (n) { G.Audio.play(n); },
      sprite: function (s, d, f) { return G.Sprites.get(s, d, f); },
      portrait: function (s, m) { return G.Sprites.portrait(s, m); },
      blitPx: function () { R.ctx.drawImage(R.pxCanvas, 0, 0); },
      header: function (title, sub) {
        R.rect(0, 0, G.W, 22, '#000', 0.75); R.rect(0, 22, G.W, 1, P.red);
        R.text(title || '', 10, 4, { size: 10, font: 'sans', color: '#fff' });
        if (sub) R.text(sub, G.W - 10, 7, { size: 7, align: 'right', color: P.dim });
      },
      footer: function (text) {
        R.rect(0, G.H - 14, G.W, 14, '#000', 0.7);
        R.text(text, G.W / 2, G.H - 11, { size: 7, align: 'center', color: P.dim });
      }
    };
    ov.update = function (dt, top) { ov.t += dt; ctx.t = ov.t; if (top && cbs.update) cbs.update(dt); };
    ov.draw = function (t) { if (cbs.draw) cbs.draw(t); };
    G.UI.push(ov);
    var p;
    try { p = Promise.resolve(def.start(ctx)); } catch (e) { p = Promise.reject(e); }
    return p.then(function (res) { G.UI.remove(ov); G.Input.consume(); return res || { success: true }; },
      function (e) { G.UI.remove(ov); G.reportError(e, 'minigame ' + id); return { success: false, error: String(e) }; });
  };

  /* =====================================================================
   * CIPHER
   * params: {
   *   message: 'MEET AT DAWN',          // plaintext answer (letters + spaces/punctuation)
   *   mode: 'symbols'|'numbers'|'shift'|'tokens',
   *   key: {A:'7', ...},                // optional explicit letter->token map (numbers/tokens)
   *   offset: 0,                         // numbers: A = 1+offset (wraps 1..26)
   *   shift: 3,                          // shift: Caesar shift used to encode
   *   tokens: ['14','15'],               // optional: explicit encoded tokens (mode 'tokens'), paired with message letters
   *   given: ['E','T'],                  // letters pre-filled as hints
   *   title, prompt, hint,               // texts
   *   canGiveUp: true                    // TAB gives up -> {success:false, gaveUp:true}
   * }
   * result: {success, solved, gaveUp, attempts, time, message}
   * ===================================================================== */
  /** Number for a letter in numbers mode: A = 1 + offset (Seven Code: offset 7 -> A=8 ... Z=33). No wrap unless p.wrap. */
  function numFor(ch, p) {
    var n = ch.charCodeAt(0) - 65 + 1 + (p.offset || 0);
    if (p.wrap) n = ((n - 1) % 26 + 26) % 26 + 1;
    return String(n);
  }
  /** Normalise params: presets + parse `ciphertext` like "15-22/8" (letters '-', words '/'). */
  function cipherPrep(p) {
    p = Object.assign({}, p);
    if (p.mode === 'seven') { p.mode = 'numbers'; if (p.offset == null) p.offset = 7; }
    if (p.ciphertext != null) {
      var words = String(p.ciphertext).trim().split(/\s*\/\s*/);
      var toks = [], msg = [];
      var inv = {};
      if (p.key) Object.keys(p.key).forEach(function (L) { inv[String(p.key[L])] = L.toUpperCase(); });
      else for (var i = 0; i < 26; i++) { var L = String.fromCharCode(65 + i); inv[numFor(L, p)] = L; }
      words.forEach(function (w, wi) {
        var parts = w.split(/\s*-\s*|\s+/).filter(Boolean), word = '';
        parts.forEach(function (t) { toks.push(t); word += inv[t] || '?'; });
        msg.push(word);
        void wi;
      });
      if (!p.message) p.message = msg.join(' ');
      p.tokens = toks;
      if (!p.mode || p.mode === 'symbols') p.mode = 'numbers';
    }
    return p;
  }
  M.cipherPrep = cipherPrep;
  function cipherTokens(p) {
    var msg = String(p.message || 'HELLO').toUpperCase();
    var mode = p.mode || 'symbols';
    var out = []; // {ch, tok}  tok null for non-letters
    var ti = 0;
    for (var i = 0; i < msg.length; i++) {
      var ch = msg.charAt(i);
      if (!/[A-Z]/.test(ch)) { out.push({ ch: ch, tok: null }); continue; }
      var tok;
      if (p.tokens) tok = String(p.tokens[ti]);
      else if (p.key && p.key[ch] != null) tok = String(p.key[ch]);
      else if (mode === 'numbers') tok = numFor(ch, p);
      else if (mode === 'shift') tok = String.fromCharCode((ch.charCodeAt(0) - 65 + (p.shift == null ? 3 : p.shift) + 26) % 26 + 65);
      else tok = 'sym:' + ch;
      ti++;
      out.push({ ch: ch, tok: tok });
    }
    return out;
  }
  /** Draw a procedural symbol glyph for a letter (pigpen-ish), centred at x,y, size s. */
  M.drawGlyph = function (letter, x, y, s, color) {
    var g = R.ctx, r = U.rng('glyph' + letter);
    g.save(); g.strokeStyle = color || '#e8e4d8'; g.lineWidth = Math.max(1, s / 8); g.lineCap = 'square';
    var h = s / 2;
    g.beginPath();
    var sides = [[-h, -h, h, -h], [h, -h, h, h], [h, h, -h, h], [-h, h, -h, -h]];
    var n = 0;
    sides.forEach(function (sd) { if (r() < 0.55) { g.moveTo(x + sd[0], y + sd[1]); g.lineTo(x + sd[2], y + sd[3]); n++; } });
    if (n < 2) { g.moveTo(x - h, y + h); g.lineTo(x + h, y + h); g.moveTo(x - h, y - h); g.lineTo(x - h, y + h); }
    if (r() < 0.4) { g.moveTo(x - h, y - h); g.lineTo(x + h, y + h); }
    else if (r() < 0.4) { g.moveTo(x, y - h); g.lineTo(x, y + h); }
    g.stroke();
    if (r() < 0.6) { g.fillStyle = color || '#e8e4d8'; g.beginPath(); g.arc(x + (r() - 0.5) * h, y + (r() - 0.5) * h, s / 9, 0, Math.PI * 2); g.fill(); }
    g.restore();
  };

  G.registerMinigame('cipher', {
    autoSolve: function (p) { p = cipherPrep(p); return { success: true, solved: true, attempts: 1, time: 0, message: String(p.message || '').toUpperCase() }; },
    start: function (ctx) {
      var p = cipherPrep(ctx.params);
      var cells = cipherTokens(p);
      var uniq = [];
      var answer = {};
      cells.forEach(function (c) { if (c.tok && uniq.indexOf(c.tok) < 0) { uniq.push(c.tok); answer[c.tok] = c.ch; } });
      var guess = {};
      (p.given || []).forEach(function (L) { L = L.toUpperCase(); uniq.forEach(function (t) { if (answer[t] === L) guess[t] = L; }); });
      var fixed = {}; Object.keys(guess).forEach(function (k) { fixed[k] = true; });
      var sel = 0; while (fixed[uniq[sel]] && sel < uniq.length - 1) sel++;
      var attempts = 0, solvedT = -1, done = false;
      var A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      // layout: words of cells
      var cw = 18, ch = 34;
      function layout() {
        var lines = [[]], x = 0, maxW = G.W - 30;
        var words = []; var cur = [];
        cells.forEach(function (c) { if (c.ch === ' ') { if (cur.length) words.push(cur); cur = []; } else cur.push(c); });
        if (cur.length) words.push(cur);
        words.forEach(function (wd) {
          var w = wd.length * cw;
          if (x + w > maxW && lines[lines.length - 1].length) { lines.push([]); x = 0; }
          lines[lines.length - 1].push(wd); x += w + cw * 0.6;
        });
        return lines;
      }
      var lines = layout();
      function solved() { return uniq.every(function (t) { return guess[t] === answer[t]; }); }
      return new Promise(function (resolve) {
        ctx.loop(function () {
          var I = ctx.input;
          if (done) { if (ctx.t - solvedT > 1.6) resolve({ success: true, solved: true, attempts: attempts, time: Math.round(solvedT), message: String(p.message).toUpperCase() }); return; }
          if (I.repeat('left')) { do { sel = (sel - 1 + uniq.length) % uniq.length; } while (fixed[uniq[sel]] && Object.keys(fixed).length < uniq.length); ctx.sound('blip'); }
          if (I.repeat('right')) { do { sel = (sel + 1) % uniq.length; } while (fixed[uniq[sel]] && Object.keys(fixed).length < uniq.length); ctx.sound('blip'); }
          var tok = uniq[sel];
          var changed = false;
          if (!fixed[tok]) {
            var cur = guess[tok] ? A.indexOf(guess[tok]) : -1;
            if (I.repeat('up')) { guess[tok] = A.charAt((cur + 1 + 26) % 26); changed = true; }
            if (I.repeat('down')) { guess[tok] = A.charAt((cur - 1 + 26) % 26); changed = true; }
            I.typed.forEach(function (k) {
              if (/^[a-zA-Z]$/.test(k) && !(k.toLowerCase() === 'e' && false)) { guess[tok] = k.toUpperCase(); changed = true; }
              if (k === 'Backspace' || k === 'Delete') { delete guess[tok]; changed = true; }
            });
          }
          if (changed) {
            attempts++; ctx.sound('select');
            if (solved()) { done = true; solvedT = ctx.t; ctx.sound('success'); }
            else if (I.typed.length) { // typing auto-advances to the next unsolved symbol
              for (var k = 1; k <= uniq.length; k++) { var n = (sel + k) % uniq.length; if (!fixed[uniq[n]] && !guess[uniq[n]]) { sel = n; break; } }
            }
          }
          if (p.canGiveUp !== false && I.pressed('tab')) { resolve({ success: false, solved: false, gaveUp: true, attempts: attempts, time: Math.round(ctx.t) }); }
        }, function (t) {
          R.rect(0, 0, G.W, G.H, '#100e0c');
          // paper card
          R.rect(10, 28, G.W - 20, G.H - 50, P.paper);
          R.rect(10, 28, G.W - 20, 2, '#c9bfa4');
          ctx.header(p.title || 'DECODE THE MESSAGE', p.prompt || (p.mode === 'numbers' ? 'Numbers stand for letters' : 'Each symbol is a letter'));
          var y = 40;
          lines.forEach(function (ln) {
            var tot = 0; ln.forEach(function (wd, i) { tot += wd.length * cw + (i ? cw * 0.6 : 0); });
            var x = G.W / 2 - tot / 2;
            ln.forEach(function (wd) {
              wd.forEach(function (c) {
                var isSel = c.tok === uniq[sel] && !done;
                if (isSel) R.rect(x + 1, y - 2, cw - 2, ch, '#e8323c', 0.18 + 0.1 * Math.sin(t * 6));
                if (/^[A-Z]$/.test(c.ch) && c.tok) {
                  if (c.tok.indexOf('sym:') === 0) M.drawGlyph(c.tok.slice(4), x + cw / 2, y + 7, 11, '#2a2420');
                  else R.text(c.tok, x + cw / 2, y + 2, { size: c.tok.length > 2 ? 7 : 9, align: 'center', color: '#2a2420', shadow: false });
                  R.rect(x + 3, y + 26, cw - 6, 1, '#7a6a5a');
                  var gch = guess[c.tok];
                  if (gch) R.text(gch, x + cw / 2, y + 16, { size: 10, align: 'center', color: done ? '#2a7a3a' : fixed[c.tok] ? '#7a6a5a' : '#8a1a20', shadow: false });
                } else {
                  R.text(c.ch, x + cw / 2, y + 16, { size: 10, align: 'center', color: '#2a2420', shadow: false });
                }
                x += cw;
              });
              x += cw * 0.6;
            });
            y += ch + 4;
          });
          if (p.showKey !== false && p.mode !== 'symbols' && p.mode !== 'shift') {
            // reference key: A..Z with their tokens, filled in as letters are correctly decoded
            var known = {};
            uniq.forEach(function (tk) { if (guess[tk] === answer[tk]) known[answer[tk]] = tk; });
            var kx = 16, ky = G.H - 52, kw = (G.W - 32) / 26;
            R.rect(12, ky - 3, G.W - 24, 24, '#d8cdb0');
            for (var li = 0; li < 26; li++) {
              var LL = String.fromCharCode(65 + li);
              var tkn = known[LL] || (p.revealKey ? (p.key && p.key[LL] != null ? String(p.key[LL]) : numFor(LL, p)) : null);
              R.text(LL, kx + li * kw + kw / 2, ky, { size: 7, align: 'center', color: tkn ? '#2a2420' : '#9a8a70', shadow: false });
              R.text(tkn || '·', kx + li * kw + kw / 2, ky + 9, { size: tkn && tkn.length > 2 ? 5 : 6, align: 'center', color: tkn ? '#8a1a20' : '#9a8a70', shadow: false });
            }
          }
          if (p.hint) R.text(p.hint, G.W / 2, G.H - 62, { size: 7, align: 'center', color: '#6a5a4a', shadow: false, style: 'italic' });
          if (done) {
            var a = Math.min(1, (ctx.t - solvedT) * 3);
            R.rect(G.W / 2 - 60, G.H / 2 - 12, 120, 24, '#1a3a22', 0.9 * a);
            R.text('DECODED', G.W / 2, G.H / 2 - 6, { size: 12, font: 'sans', align: 'center', color: '#8aff9a', alpha: a });
          }
          ctx.footer('←→ select   ↑↓ or type a letter   ' + (p.canGiveUp !== false ? '[TAB] give up' : ''));
        });
      });
    }
  });

  /* =====================================================================
   * QTE
   * params: {
   *   mode: 'timing'|'sequence'|'mash',
   *   title, prompt,
   *   rounds: 3, need: 2,          // timing/sequence: rounds played, successes needed
   *   speed: 1,                    // timing: marker speed multiplier
   *   zone: 0.16,                  // timing: target width (0..1)
   *   length: 4, time: 3,          // sequence: arrows per round, seconds per round
   *   target: 30, time: 5, decay: 8  // mash: presses-worth needed, seconds, decay per second
   * }
   * result: {success, hits, misses, score}
   * ===================================================================== */
  G.registerMinigame('qte', {
    autoSolve: function (p) { var r = p.rounds || 3; return { success: true, hits: p.need || r, misses: 0, score: 100 }; },
    start: function (ctx) {
      var p = ctx.params, mode = p.mode || 'timing';
      var rounds = p.rounds || 3, need = p.need != null ? p.need : Math.ceil(rounds * 0.67);
      var hits = 0, misses = 0, round = 0, state = 'ready', stT = 0, msg = '', msgC = '#fff';
      var pos = 0, vel = 0.9 * (p.speed || 1), zone = p.zone || 0.16, zx = 0.5;
      var seq = [], seqI = 0, seqT = 0;
      var meter = 0, mashT = 0;
      var arrows = ['up', 'down', 'left', 'right'], glyph = { up: '↑', down: '↓', left: '←', right: '→' };
      function newRound() {
        state = 'play'; stT = ctx.t;
        if (mode === 'timing') { pos = 0; zx = 0.2 + Math.random() * 0.6; vel = (0.9 + round * 0.25) * (p.speed || 1); }
        if (mode === 'sequence') { seq = []; for (var i = 0; i < (p.length || 4) + Math.floor(round / 2); i++) seq.push(arrows[Math.floor(Math.random() * 4)]); seqI = 0; seqT = p.time || 3; }
        if (mode === 'mash') { meter = 0; mashT = p.time || 5; }
      }
      function endRound(ok, text) {
        if (ok) { hits++; ctx.sound('hit'); } else { misses++; ctx.sound('miss'); }
        msg = text || (ok ? 'HIT!' : 'MISS'); msgC = ok ? P.neon : P.red;
        round++; state = 'between'; stT = ctx.t;
      }
      return new Promise(function (resolve) {
        ctx.loop(function (dt) {
          var I = ctx.input;
          if (state === 'ready') { if (ctx.t > 0.8 || I.pressed('ok')) { I.consume('ok'); newRound(); } return; }
          if (state === 'between') {
            if (ctx.t - stT > 0.8) {
              var totalR = mode === 'mash' ? 1 : rounds;
              if (round >= totalR || hits >= need || misses > totalR - need) { state = 'done'; stT = ctx.t; ctx.sound(hits >= need || (mode === 'mash' && hits) ? 'success' : 'fail'); }
              else newRound();
            }
            return;
          }
          if (state === 'done') {
            if (ctx.t - stT > 1.4) { var ok = mode === 'mash' ? hits > 0 : hits >= need; resolve({ success: ok, hits: hits, misses: misses, score: Math.round(100 * hits / Math.max(1, hits + misses)) }); }
            return;
          }
          if (mode === 'timing') {
            pos += vel * dt; if (pos > 1) { pos = 1; vel = -Math.abs(vel); } if (pos < 0) { pos = 0; vel = Math.abs(vel); }
            if (I.pressed('ok')) { I.consume('ok'); var ok2 = Math.abs(pos - zx) <= zone / 2; endRound(ok2, ok2 ? (Math.abs(pos - zx) < zone / 6 ? 'PERFECT!' : 'HIT!') : 'MISS'); }
          } else if (mode === 'sequence') {
            seqT -= dt;
            if (seqT <= 0) { endRound(false, 'TOO SLOW'); return; }
            for (var i = 0; i < 4; i++) {
              if (I.pressed(arrows[i])) {
                if (arrows[i] === seq[seqI]) { seqI++; ctx.sound('blip'); if (seqI >= seq.length) { endRound(true, 'CLEAN!'); return; } }
                else { endRound(false, 'WRONG KEY'); return; }
              }
            }
          } else if (mode === 'mash') {
            mashT -= dt;
            meter = Math.max(0, meter - (p.decay || 8) * dt);
            if (I.pressed('ok')) { I.consume('ok'); meter += 2.2; ctx.sound('blip'); }
            if (meter >= (p.target || 30)) { endRound(true, 'BREAKTHROUGH!'); return; }
            if (mashT <= 0) endRound(false, 'OUT OF TIME');
          }
        }, function (t) {
          R.rect(0, 0, G.W, G.H, '#0c0a12');
          R.static(0.03);
          // arena lights
          for (var i = 0; i < 6; i++) R.rect(20 + i * 62, 30, 2, 10, i % 2 ? P.red : P.amber, 0.5 + 0.5 * Math.sin(t * 4 + i));
          ctx.header(p.title || (mode === 'mash' ? 'PUSH THROUGH' : mode === 'sequence' ? 'FOLLOW THE SEQUENCE' : 'TIME IT'), mode === 'mash' ? '' : 'Round ' + Math.min(round + 1, rounds) + '/' + rounds + '   Hits ' + hits + '/' + need);
          if (p.prompt) R.text(p.prompt, G.W / 2, 50, { size: 8, align: 'center', color: P.dim });
          if (mode === 'timing') {
            var bx = 42, by = 100, bw = G.W - 84, bh = 16;
            R.rect(bx - 2, by - 2, bw + 4, bh + 4, '#000');
            R.rect(bx, by, bw, bh, '#2a2834');
            R.rect(bx + (zx - zone / 2) * bw, by, zone * bw, bh, P.neon, 0.55);
            R.rect(bx + (zx - zone / 6) * bw, by, zone / 3 * bw, bh, P.neon, 0.9);
            R.rect(bx + pos * bw - 1.5, by - 6, 3, bh + 12, '#fff');
            R.text('[SPACE / E] at the green', G.W / 2, by + 30, { size: 7, align: 'center', color: P.dim });
          } else if (mode === 'sequence') {
            var n = seq.length, sx = G.W / 2 - n * 13;
            seq.forEach(function (a, i) {
              var done = i < seqI;
              R.rect(sx + i * 26, 90, 22, 24, done ? '#1a3a22' : '#2a2834');
              R.text(glyph[a], sx + i * 26 + 11, 93, { size: 14, align: 'center', color: done ? P.neon : '#fff' });
            });
            if (state === 'play') R.rect(G.W / 2 - 80, 125, 160 * Math.max(0, seqT / (p.time || 3)), 4, P.red);
          } else {
            var mw = 200, mx = G.W / 2 - mw / 2, k = Math.min(1, meter / (p.target || 30));
            R.rect(mx - 2, 98, mw + 4, 20, '#000');
            R.rect(mx, 100, mw * k, 16, k > 0.8 ? P.neon : P.amber);
            R.text('MASH [SPACE / E]!', G.W / 2, 124, { size: 9, align: 'center', color: Math.floor(t * 8) % 2 ? '#fff' : P.amber });
            if (state === 'play') R.text(mashT.toFixed(1) + 's', G.W / 2, 80, { size: 10, align: 'center' });
          }
          if (state === 'ready') R.text('GET READY', G.W / 2, 150, { size: 14, font: 'title', style: '', align: 'center', color: P.amber });
          if (state === 'between' || state === 'done') R.text(state === 'done' ? (hits >= need || (mode === 'mash' && hits) ? 'SUCCESS' : 'FAILED') : msg, G.W / 2, 146, { size: 18, font: 'title', style: '', align: 'center', color: state === 'done' ? (hits >= need || (mode === 'mash' && hits) ? P.neon : P.red) : msgC });
          R.scanlines(0.12);
        });
      });
    }
  });

  /* =====================================================================
   * VOTE
   * params: {
   *   candidates: ['john','carol', {id:'x', name:'X', spec:{...}}],
   *   title: 'VOTING CEREMONY', prompt: 'Who goes to judgment?',
   *   votes: [{voter:'john', for:'carol'}, ...],  // other voters, revealed one by one AFTER the player votes
   *   tally: {carol: 3},                           // alternative: just counts added to the player's vote
   *   voterName: 'Luna',                           // label for the player's vote
   *   mode: 'save'|'eliminate',                    // 'save' (default, canon): fewest votes faces judgment
   *   tieBreak: 'carol' | fn(tally)->id,           // who loses a tie
   *   resultText: fn(result) -> string,            // custom result banner
   *   reveal: true,                                // false = skip the reveal phase
   *   autoPick: 'carol'                            // what autoplay picks (default first candidate)
   * }
   * result: {success:true, choice, tally:{...}, eliminated (faces judgment), saved (most-saved / least in eliminate mode), tie:bool}
   * ===================================================================== */
  function voteTally(p, choice) {
    var tally = {};
    p.candidates.forEach(function (c) { tally[typeof c === 'string' ? c : c.id] = 0; });
    if (choice) tally[choice] = (tally[choice] || 0) + 1;
    (p.votes || []).forEach(function (v) { var f = typeof v.for === 'function' ? v.for(choice) : v.for; tally[f] = (tally[f] || 0) + 1; });
    if (p.tally) Object.keys(p.tally).forEach(function (k) { tally[k] = (tally[k] || 0) + p.tally[k]; });
    // mode 'save' (default, canon): most votes = saved, FEWEST votes = faces judgment.
    // mode 'eliminate': most votes = faces judgment.
    var save = (p.mode || 'save') === 'save';
    var keys = Object.keys(tally), best = null, worst = null, tie = false, wtie = false;
    keys.forEach(function (k) {
      if (best === null || tally[k] > tally[best]) { best = k; tie = false; } else if (tally[k] === tally[best]) tie = true;
      if (worst === null || tally[k] < tally[worst]) { worst = k; wtie = false; } else if (tally[k] === tally[worst]) wtie = true;
    });
    if (p.tieBreak && (save ? wtie : tie)) { var tb = typeof p.tieBreak === 'function' ? p.tieBreak(tally) : p.tieBreak; if (tb) { if (save) worst = tb; else best = tb; } }
    return save ? { tally: tally, eliminated: worst, saved: best, tie: wtie } : { tally: tally, eliminated: best, saved: worst, tie: tie };
  }
  M.voteTally = voteTally;
  G.registerMinigame('vote', {
    autoSolve: function (p) {
      var c = p.autoPick || (typeof p.candidates[0] === 'string' ? p.candidates[0] : p.candidates[0].id);
      var t = voteTally(p, c);
      return { success: true, choice: c, tally: t.tally, eliminated: t.eliminated, saved: t.saved, tie: t.tie };
    },
    start: function (ctx) {
      var p = ctx.params;
      var cands = p.candidates.map(function (c) { return typeof c === 'string' ? { id: c, spec: c, name: G.Sprites.name(c) } : { id: c.id, spec: c.spec || c.id, name: c.name || G.Sprites.name(c.spec || c.id) }; });
      var sel = 0, phase = 'pick', phT = 0, choice = null, reveal = [], revI = 0, counts = {}, result = null;
      cands.forEach(function (c) { counts[c.id] = 0; });
      return new Promise(function (resolve) {
        ctx.loop(function (dt) {
          var I = ctx.input;
          phT += dt;
          if (phase === 'pick') {
            if (I.repeat('left')) { sel = (sel - 1 + cands.length) % cands.length; ctx.sound('blip'); }
            if (I.repeat('right')) { sel = (sel + 1) % cands.length; ctx.sound('blip'); }
            if (I.pressed('ok') && phT > 0.3) {
              I.consume('ok'); choice = cands[sel].id; ctx.sound('camera');
              result = voteTally(p, choice);
              reveal = [{ voter: p.voterName || 'Luna', for: choice, you: true }].concat((p.votes || []).map(function (v) { return { voter: G.Sprites.name(v.voter), for: typeof v.for === 'function' ? v.for(choice) : v.for }; }));
              if (p.tally) Object.keys(p.tally).forEach(function (k) { for (var i = 0; i < p.tally[k]; i++) reveal.push({ voter: 'Audience', for: k }); });
              phase = p.reveal === false ? 'done' : 'reveal'; phT = 0;
            }
          } else if (phase === 'reveal') {
            var step = revI < reveal.length ? 1.0 : 0;
            if (revI < reveal.length && phT > step) { counts[reveal[revI].for] = (counts[reveal[revI].for] || 0) + 1; revI++; phT = 0; ctx.sound(revI === reveal.length ? 'sting' : 'heartbeat'); }
            if (revI >= reveal.length && phT > 1.2) { phase = 'result'; phT = 0; ctx.sound('reveal'); }
            if (I.pressed('ok')) { I.consume('ok'); while (revI < reveal.length) { counts[reveal[revI].for]++; revI++; } phase = 'result'; phT = 0; }
          } else if (phase === 'result' || phase === 'done') {
            if (phT > 0.6 && (I.pressed('ok') || phase === 'done')) { I.consume('ok'); resolve({ success: true, choice: choice, tally: result.tally, eliminated: result.eliminated, saved: result.saved, tie: result.tie }); }
          }
        }, function (t) {
          var g = R.ctx;
          var grad = g.createLinearGradient(0, 0, 0, G.H); grad.addColorStop(0, '#1c0612'); grad.addColorStop(1, '#05030a');
          g.fillStyle = grad; g.fillRect(0, 0, G.W, G.H);
          ctx.header(p.title || 'THE VOTE', phase === 'pick' ? (p.prompt || ((p.mode || 'save') === 'save' ? 'Vote to SAVE one contestant' : 'Choose who faces judgment')) : 'COUNTING VOTES');
          var n = cands.length, cw = Math.min(70, (G.W - 20) / n), x0 = G.W / 2 - (n * cw) / 2;
          cands.forEach(function (c, i) {
            var x = x0 + i * cw, on = phase === 'pick' && i === sel;
            var elim = (phase === 'result') && result.eliminated === c.id;
            var y = on ? 38 : 42;
            if (on || elim) { g.save(); g.globalAlpha = 0.25 + 0.15 * Math.sin(t * 5); g.fillStyle = elim ? P.red : '#ffe9a0'; g.beginPath(); g.moveTo(x + cw / 2 - 8, 23); g.lineTo(x + cw / 2 + 8, 23); g.lineTo(x + cw / 2 + 30, 130); g.lineTo(x + cw / 2 - 30, 130); g.fill(); g.restore(); }
            var ps = cw >= 60 ? 1.25 : 1;
            var pw = 40 * ps;
            R.rect(x + cw / 2 - pw / 2 - 2, y - 2, pw + 4, pw + 4, on ? '#fff' : elim ? P.red : '#333');
            R.img(ctx.portrait(c.spec, elim ? 'fear' : on ? 'neutral' : 'neutral'), x + cw / 2 - pw / 2, y, ps);
            if (phase === 'result' && !elim) R.rect(x + cw / 2 - pw / 2, y, pw, pw, '#000', 0.45);
            R.text(c.name, x + cw / 2, y + pw + 5, { size: 7, align: 'center', color: on ? '#fff' : P.dim });
            if (phase !== 'pick') {
              var cnt = counts[c.id] || 0;
              for (var k = 0; k < cnt; k++) R.rect(x + cw / 2 - 8, y + pw + 16 + k * 6, 16, 4, elim ? P.red : P.amber);
              R.text(String(cnt), x + cw / 2, y + pw + 16 + cnt * 6 + 2, { size: 8, align: 'center', color: '#fff' });
            }
          });
          if (phase === 'pick') ctx.footer('←→ choose   [SPACE / E] cast your vote');
          if (phase === 'reveal' && revI > 0) {
            var rv = reveal[revI - 1];
            var txt = (rv.you ? 'You' : rv.voter) + ' voted for ' + G.Sprites.name(rv.for);
            R.rect(0, G.H - 30, G.W, 16, '#000', 0.8);
            R.text(txt.toUpperCase(), G.W / 2, G.H - 27, { size: 9, align: 'center', color: '#fff' });
          }
          if (phase === 'result') {
            var name = G.Sprites.name(result.eliminated);
            R.rect(0, G.H - 34, G.W, 22, P.red, Math.min(1, phT * 3));
            R.text((result.tie ? 'TIE BROKEN — ' : '') + name.toUpperCase() + ' FACES JUDGMENT', G.W / 2, G.H - 30, { size: 12, font: 'sans', align: 'center', color: '#fff' });
          }
          R.scanlines(0.15); R.vignette(0.4);
        });
      });
    }
  });

  /* =====================================================================
   * STEALTH
   * params: {
   *   map: ['#########', '#@......#', ...],  // ASCII (default legend); '@' = start, '*' = goal
   *   legend: {...}, start:[x,y], goal:[x,y], // optional overrides
   *   guards: [{path:[[x,y],[x,y]], speed:30, range:56, fov:70}],   // patrol loop
   *   cameras: [{at:[x,y], angle:90, sweep:60, range:64, speed:0.8}], // angle in degrees (0 = right, 90 = down)
   *   lives: 3, title, prompt, playerSpec:'luna', guardSpec:'guard'
   * }
   * result: {success, caught (times), time}
   * ===================================================================== */
  G.registerMinigame('stealth', {
    autoSolve: function () { return { success: true, caught: 0, time: 0 }; },
    start: function (ctx) {
      var p = ctx.params, T = G.TILE;
      var legend = { '*': { tile: 'floor', marker: 'goal' } };
      if (p.legend) Object.keys(p.legend).forEach(function (k) { legend[k] = p.legend[k]; });
      var room = G.Map.build({ id: 'stealth', tiles: p.map || ['##########', '#@...#..*#', '#....#...#', '#........#', '##########'], legend: legend, ns: G.ns() });
      var start = p.start ? W2(p.start) : room.spawn;
      var goal = p.goal ? W2(p.goal) : (room.markers.goal || [{ x: room.w - 2, y: room.h - 2 }])[0];
      function W2(a) { return Array.isArray(a) ? { x: a[0], y: a[1] } : a; }
      function solid(tx, ty) { return G.Map.solidAt(room, tx, ty); }
      var pl = { x: start.x * T + 8, y: start.y * T + 12, dir: 'down', frame: 0, at: 0 };
      var guards = (p.guards || []).map(function (gd) {
        var path = gd.path.map(W2);
        return { path: path, i: 1 % path.length, x: path[0].x * T + 8, y: path[0].y * T + 12, ang: 0, speed: gd.speed || 30, range: gd.range || 56, fov: (gd.fov || 70) * Math.PI / 180, spec: gd.spec || p.guardSpec || 'guard', frame: 0, at: 0, wait: 0 };
      });
      var cams = (p.cameras || []).map(function (c) { var a = W2(c.at); return { x: a.x * T + 8, y: a.y * T + 8, base: (c.angle || 90) * Math.PI / 180, sweep: (c.sweep == null ? 60 : c.sweep) * Math.PI / 180, range: c.range || 64, speed: c.speed || 0.8, fov: (c.fov || 40) * Math.PI / 180, ang: 0 }; });
      var lives = p.lives || 3, caught = 0, state = 'play', stT = 0, cam = { x: 0, y: 0 };
      function free(x, y) {
        var pts = [[x - 4, y - 4], [x + 3, y - 4], [x - 4, y], [x + 3, y]];
        return pts.every(function (q) { return !solid(Math.floor(q[0] / T), Math.floor(q[1] / T)); });
      }
      function los(ax, ay, bx, by) {
        var d = Math.hypot(bx - ax, by - ay), n = Math.ceil(d / 4);
        for (var i = 1; i < n; i++) { var x = ax + (bx - ax) * i / n, y = ay + (by - ay) * i / n; var d2 = G.Map.tileDef(room.grid[Math.floor(y / T)] && room.grid[Math.floor(y / T)][Math.floor(x / T)] || 'void'); if (d2.solid) return false; }
        return true;
      }
      function sees(s) {
        var dx = pl.x - s.x, dy = (pl.y - 6) - s.y, d = Math.hypot(dx, dy);
        if (d > s.range) return false;
        var a = Math.atan2(dy, dx), diff = Math.atan2(Math.sin(a - s.ang), Math.cos(a - s.ang));
        if (Math.abs(diff) > s.fov / 2) return false;
        return los(s.x, s.y, pl.x, pl.y - 6);
      }
      return new Promise(function (resolve) {
        ctx.loop(function (dt) {
          var I = ctx.input;
          if (state === 'caught') { if (ctx.t - stT > 1.2) { if (lives <= 0) { state = 'fail'; stT = ctx.t; ctx.sound('fail'); } else { pl.x = start.x * T + 8; pl.y = start.y * T + 12; state = 'play'; } } return; }
          if (state === 'win' || state === 'fail') { if (ctx.t - stT > 1.5) resolve({ success: state === 'win', caught: caught, time: Math.round(ctx.t) }); return; }
          var d = I.dir(), sp = 52 * dt * (I.keysHeld.ShiftLeft || I.keysHeld.ShiftRight ? 0.5 : 1);
          if (d.x || d.y) {
            var l = Math.hypot(d.x, d.y);
            if (free(pl.x + d.x / l * sp, pl.y)) pl.x += d.x / l * sp;
            if (free(pl.x, pl.y + d.y / l * sp)) pl.y += d.y / l * sp;
            pl.dir = Math.abs(d.x) > Math.abs(d.y) ? (d.x > 0 ? 'right' : 'left') : (d.y > 0 ? 'down' : 'up');
            pl.at += dt; pl.frame = [1, 0, 2, 0][Math.floor(pl.at / 0.14) % 4];
          } else pl.frame = 0;
          guards.forEach(function (gd) {
            if (gd.wait > 0) { gd.wait -= dt; gd.frame = 0; }
            else {
              var tg = gd.path[gd.i], tx = tg.x * T + 8, ty = tg.y * T + 12;
              var dx = tx - gd.x, dy = ty - gd.y, dd = Math.hypot(dx, dy);
              if (dd < 1) { gd.i = (gd.i + 1) % gd.path.length; gd.wait = 0.8; }
              else { var s = Math.min(dd, gd.speed * dt); gd.x += dx / dd * s; gd.y += dy / dd * s; gd.ang = Math.atan2(dy, dx); gd.at += dt; gd.frame = [1, 0, 2, 0][Math.floor(gd.at / 0.16) % 4]; }
            }
            gd.sx = gd.x; gd.sy = gd.y - 8;
          });
          cams.forEach(function (c) { c.ang = c.base + Math.sin(ctx.t * c.speed) * c.sweep / 2; });
          var spotted = guards.some(function (gd) { return sees({ x: gd.sx, y: gd.sy, ang: gd.ang, fov: gd.fov, range: gd.range }); }) || cams.some(sees);
          if (spotted) { lives--; caught++; state = 'caught'; stT = ctx.t; ctx.sound('alarm'); G.UI.flash('#e8323c', 300); }
          var pt = { x: Math.floor(pl.x / T), y: Math.floor((pl.y - 2) / T) };
          if (pt.x === goal.x && pt.y === goal.y) { state = 'win'; stT = ctx.t; ctx.sound('success'); }
          // camera
          var rw = room.w * T, rh = room.h * T;
          cam.x = rw <= G.W ? (rw - G.W) / 2 : U.clamp(pl.x - G.W / 2, 0, rw - G.W);
          cam.y = rh <= G.H - 24 ? (rh - G.H) / 2 - 6 : U.clamp(pl.y - G.H / 2, -24, rh - G.H);
        }, function (t) {
          var g = ctx.px, cx = Math.round(cam.x), cy = Math.round(cam.y);
          g.setTransform(1, 0, 0, 1, 0, 0);
          g.fillStyle = '#050507'; g.fillRect(0, 0, G.W, G.H);
          G.Map.draw(g, room, cx, cy, t);
          // goal marker
          g.fillStyle = 'rgba(182,242,74,' + (0.35 + 0.25 * Math.sin(t * 5)) + ')';
          g.fillRect(goal.x * T - cx + 2, goal.y * T - cy + 2, T - 4, T - 4);
          // vision cones
          function cone(s, col) {
            g.fillStyle = col; g.beginPath(); g.moveTo(s.x - cx, s.y - cy);
            var steps = 14;
            for (var i = 0; i <= steps; i++) {
              var a = s.ang - s.fov / 2 + s.fov * i / steps, r = s.range;
              for (var k = 4; k <= s.range; k += 4) { var x = s.x + Math.cos(a) * k, y = s.y + Math.sin(a) * k; if (solid(Math.floor(x / T), Math.floor(y / T))) { r = k; break; } }
              g.lineTo(s.x + Math.cos(a) * r - cx, s.y + Math.sin(a) * r - cy);
            }
            g.closePath(); g.fill();
          }
          guards.forEach(function (gd) { cone({ x: gd.sx, y: gd.sy, ang: gd.ang, fov: gd.fov, range: gd.range }, 'rgba(255,220,120,0.22)'); });
          cams.forEach(function (c) { cone(c, 'rgba(232,50,60,0.22)'); g.fillStyle = '#222'; g.fillRect(c.x - cx - 3, c.y - cy - 3, 6, 5); g.fillStyle = Math.floor(t * 3) % 2 ? '#f33' : '#600'; g.fillRect(c.x - cx - 1, c.y - cy - 2, 2, 2); });
          var actors = guards.map(function (gd) { var dir = Math.abs(Math.cos(gd.ang)) > Math.abs(Math.sin(gd.ang)) ? (Math.cos(gd.ang) > 0 ? 'right' : 'left') : (Math.sin(gd.ang) > 0 ? 'down' : 'up'); return { x: gd.x, y: gd.y, spec: gd.spec, dir: dir, frame: gd.frame }; });
          actors.push({ x: pl.x, y: pl.y, spec: p.playerSpec || G.World.player.spec || 'luna', dir: pl.dir, frame: pl.frame });
          actors.sort(function (a, b) { return a.y - b.y; }).forEach(function (a) {
            g.fillStyle = 'rgba(0,0,0,0.35)'; g.beginPath(); g.ellipse(Math.round(a.x) - cx, Math.round(a.y) - cy, 5, 2, 0, 0, Math.PI * 2); g.fill();
            g.drawImage(G.Sprites.get(a.spec, a.dir, a.frame), Math.round(a.x) - cx - 8, Math.round(a.y) - cy - G.Sprites.H + 1);
          });
          // darkness
          g.fillStyle = 'rgba(5,5,15,0.25)'; g.fillRect(0, 0, G.W, G.H);
          ctx.blitPx();
          ctx.header(p.title || 'STAY OUT OF SIGHT', 'Lives ' + Math.max(0, lives) + '   [SHIFT] creep');
          if (p.prompt) R.text(p.prompt, G.W / 2, 26, { size: 7, align: 'center', color: P.dim });
          if (state === 'caught') R.text('SPOTTED!', G.W / 2, G.H / 2 - 10, { size: 20, font: 'title', style: '', align: 'center', color: P.red });
          if (state === 'win') R.text('MADE IT', G.W / 2, G.H / 2 - 10, { size: 20, font: 'title', style: '', align: 'center', color: P.neon });
          if (state === 'fail') R.text('CAUGHT', G.W / 2, G.H / 2 - 10, { size: 20, font: 'title', style: '', align: 'center', color: P.red });
          ctx.footer('Reach the green tile. Avoid the light.');
        });
      });
    }
  });
})();
