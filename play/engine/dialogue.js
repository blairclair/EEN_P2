/* =========================================================================
 * dialogue.js: dialogue box (portrait, name tag, typewriter, pages),
 * narration, inner monologue, and choice menus.
 *
 *   G.Dialogue.show({speaker, text, mood, kind:'say'|'narrate'|'think', name, portrait})  -> Promise
 *   G.Dialogue.choose({options:[{text, disabled}], prompt:{...last line...}})             -> Promise<index>
 * In auto mode both resolve on the next tick (choice = option 0, or ?pick=random|N).
 * ========================================================================= */
(function () {
  'use strict';
  var G = window.G;
  var U = G.util;
  var R = G.Render;
  var P = R.PAL;
  var D = (G.Dialogue = {});

  var BOX = { x: 8, y: 150, w: G.W - 16, h: 60 };
  var LINES = 3, LH = 13, FS = 9;
  D.last = null; // last shown line (used as the prompt behind a choice)

  function speeds() { var s = G.Save ? G.Save.settings.textSpeed : 'normal'; return { slow: 28, normal: 55, fast: 110, instant: 99999 }[s] || 55; }

  /** Resolve speaker info for display. */
  D.speakerInfo = function (speaker, opts) {
    opts = opts || {};
    if (!speaker) return { name: opts.name || '', spec: null };
    var specRef = speaker;
    // an NPC in the current room may carry an inline spec
    var n = G.World.active && G.World.npc(speaker);
    if (n && typeof n.spec === 'object') specRef = n.spec;
    else if (n && typeof n.spec === 'string') specRef = n.spec;
    var exists = G.Sprites.exists(specRef);
    var sp = exists ? G.Sprites.spec(specRef) : null;
    return {
      name: opts.name != null ? opts.name : sp ? sp.name : String(speaker),
      spec: opts.portrait === false || !exists ? null : specRef,
      voice: sp ? sp.voice : 400
    };
  };

  function interp(text) {
    var fl = G.Game && G.Game.state ? G.Game.state.flags : {};
    return String(text).replace(/\{(\w+)\}/g, function (m, k) { return fl[k] != null ? fl[k] : m; });
  }

  /** Split text into pages of LINES lines. */
  function paginate(text, width, style) {
    var pages = [];
    var chunks = Array.isArray(text) ? text : [text];
    chunks.forEach(function (chunk) {
      var lines = R.wrap(interp(chunk), width, FS, 'mono', style);
      for (var i = 0; i < lines.length; i += LINES) pages.push(lines.slice(i, i + LINES));
    });
    return pages;
  }

  D.show = function (o) {
    var kind = o.kind || 'say';
    var info = kind === 'say' ? D.speakerInfo(o.speaker, o) : { name: kind === 'think' ? (o.name || '') : '', spec: null, voice: kind === 'think' ? 360 : 380 };
    var txt = Array.isArray(o.text) ? o.text.join(' / ') : o.text;
    G.log((kind === 'say' ? info.name + ': ' : kind === 'think' ? '(think) ' : '(narrate) ') + interp(txt));
    D.last = { kind: kind, info: info, text: o.text, mood: o.mood };
    if (G.auto) return U.nextTick();
    var hasP = !!info.spec;
    var tx = BOX.x + (hasP ? 54 : 12), tw = BOX.x + BOX.w - tx - 12;
    var style = kind === 'think' ? 'italic' : 'bold';
    var pages = paginate(o.text, tw, style);
    return new Promise(function (resolve) {
      var ov = {
        input: true, page: 0, shown: 0, t: 0, blipC: 0,
        update: function (dt, top) {
          ov.t += dt;
          var pg = pages[ov.page] || [];
          var total = pg.join('').length;
          if (ov.shown < total) {
            var before = Math.floor(ov.shown);
            ov.shown = Math.min(total, ov.shown + speeds() * dt);
            var after = Math.floor(ov.shown);
            if (after > before) {
              ov.blipC += after - before;
              if (ov.blipC >= 2) { ov.blipC = 0; var ch = pg.join('').charAt(after - 1); if (ch !== ' ' && kind !== 'think') G.Audio.blip(info.voice || 440); }
            }
          }
          if (!top) return;
          if (G.Input.pressed('ok')) {
            G.Input.consume('ok');
            if (ov.shown < total) ov.shown = total;
            else {
              ov.page++; ov.shown = 0;
              if (ov.page >= pages.length) { UI_remove(ov); resolve(); }
              else G.Audio.play('select');
            }
          }
        },
        draw: function (t) { drawBox(kind, info, o.mood, pages[ov.page] || [], Math.floor(ov.shown), ov.shown >= (pages[ov.page] || []).join('').length, t, o); }
      };
      G.UI.push(ov);
    });
  };
  function UI_remove(o) { G.UI.remove(o); }

  /** Draw the dialogue box. revealed = number of chars visible on this page. */
  function drawBox(kind, info, mood, lines, revealed, done, t, o) {
    var b = BOX;
    var hasP = !!info.spec;
    var style = kind === 'think' ? 'italic' : 'bold';
    if (kind === 'think') {
      R.panel(b.x, b.y, b.w, b.h, { bg: '#10162a', border: '#3a4a7a', accent: P.think, alpha: 0.88 });
      // dreamy left bar
      R.rect(b.x + 4, b.y + 6, 2, b.h - 12, P.think, 0.6);
    } else if (kind === 'narrate') {
      R.panel(b.x, b.y, b.w, b.h, { bg: '#0d0d12', border: '#2e2e3e', accent: P.faint, alpha: 0.92 });
    } else {
      R.panel(b.x, b.y, b.w, b.h, {});
    }
    if (hasP) {
      var por = G.Sprites.portrait(info.spec, mood);
      R.rect(b.x + 6, b.y + 9, 42, 42, '#000');
      R.img(por, b.x + 7, b.y + 10, 1);
    }
    if (info.name) {
      var nx = b.x + (hasP ? 54 : 10);
      var nw = R.measure(info.name, 8) + 12;
      R.rect(nx, b.y - 9, nw, 12, kind === 'think' ? '#1a2240' : P.panel2);
      R.rect(nx, b.y - 9, nw, 1, kind === 'think' ? P.think : P.red);
      R.text(info.name, nx + 6, b.y - 7, { size: 8, color: kind === 'think' ? P.think : P.amber, style: kind === 'think' ? 'italic' : 'bold' });
    }
    var tx = b.x + (hasP ? 54 : 12);
    var color = kind === 'think' ? P.think : kind === 'narrate' ? '#cfcac0' : P.text;
    var left = revealed;
    lines.forEach(function (line, i) {
      var part = line.slice(0, Math.max(0, left)); left -= line.length;
      R.text(part, tx, b.y + 9 + i * LH, { size: FS, color: color, style: style });
    });
    if (done && !(o && o.noArrow)) R.text('▼', b.x + b.w - 14, b.y + b.h - 13 + Math.round(Math.sin(t * 6)), { size: 8, color: kind === 'think' ? P.think : P.red, shadow: false });
  }

  /** Choose an index for auto mode. */
  D.autoPick = function (opts) {
    var enabled = [];
    opts.forEach(function (o, i) { if (!o.disabled) enabled.push(i); });
    if (!enabled.length) return 0;
    var p = G.params.pick;
    if (p === 'random') return enabled[Math.floor(Math.random() * enabled.length)];
    var n = parseInt(p, 10);
    if (!isNaN(n) && enabled.indexOf(n) >= 0) return n;
    return enabled[0];
  };

  /**
   * Show a choice menu. options: [{text, disabled}] (already filtered by the caller).
   * Returns the index into options.
   */
  D.choose = function (options, opts) {
    opts = opts || {};
    var forced = opts.autoPick != null ? opts.autoPick : null;
    if (G.auto) {
      var pick = forced != null ? forced : D.autoPick(options);
      G.log('[choice] -> ' + options[pick].text);
      return U.nextTick().then(function () { return pick; });
    }
    var prompt = opts.prompt === false ? null : (opts.prompt || D.last);
    return new Promise(function (resolve) {
      var sel = 0;
      while (options[sel] && options[sel].disabled) sel++;
      var maxW = 0;
      options.forEach(function (op) { maxW = Math.max(maxW, R.measure(op.text, 8)); });
      var w = Math.min(G.W - 40, Math.max(120, maxW + 28)), h = options.length * 14 + 8;
      var x = G.W - 8 - w, y = (prompt ? BOX.y - 14 : G.H - 12) - h;
      var ov = {
        input: true, t: 0,
        update: function (dt, top) {
          ov.t += dt;
          if (!top) return;
          var dir = G.Input.repeat('up') ? -1 : G.Input.repeat('down') ? 1 : 0;
          if (dir) {
            var n = sel;
            for (var k = 0; k < options.length; k++) { n = (n + dir + options.length) % options.length; if (!options[n].disabled) break; }
            if (n !== sel) { sel = n; G.Audio.play('blip'); }
          }
          if (G.Input.pressed('ok') && ov.t > 0.15 && !options[sel].disabled) {
            G.Input.consume('ok');
            G.Audio.play('confirm');
            G.UI.remove(ov);
            G.log('[choice] -> ' + options[sel].text);
            resolve(sel);
          }
        },
        draw: function (t) {
          if (prompt) {
            var info = prompt.info || (prompt.kind === 'say' ? D.speakerInfo(prompt.speaker, prompt) : { name: '', spec: null });
            var hasP = !!info.spec;
            var tw = BOX.x + BOX.w - (BOX.x + (hasP ? 54 : 12)) - 12;
            var pages = paginate(prompt.text || '', tw, prompt.kind === 'think' ? 'italic' : 'bold');
            var pg = pages[pages.length - 1] || [];
            drawBox(prompt.kind || 'say', info, prompt.mood, pg, 9999, false, t, { noArrow: true });
          }
          var k = U.ease(Math.min(1, ov.t * 6));
          R.panel(x + (1 - k) * 20, y, w, h, { accent: P.amber });
          options.forEach(function (op, i) {
            var oy = y + 5 + i * 14;
            var on = i === sel;
            if (on) R.rect(x + 3, oy - 1, w - 6, 13, P.red, 0.35);
            R.text((on ? '▶ ' : '  ') + op.text, x + 8, oy + 2, { size: 8, color: op.disabled ? P.faint : on ? '#fff' : P.dim });
          });
          if (opts.timer) {
            var rem = Math.max(0, 1 - ov.t / opts.timer);
            R.rect(x, y + h + 2, w * rem, 2, P.red);
          }
        }
      };
      if (opts.timer) {
        var origUpdate = ov.update;
        ov.update = function (dt, top) {
          origUpdate(dt, top);
          if (ov.t >= opts.timer && G.UI.stack.indexOf(ov) >= 0) {
            G.UI.remove(ov);
            var d = opts.timeoutPick != null ? opts.timeoutPick : sel;
            G.log('[choice timeout] -> ' + options[d].text);
            resolve(d);
          }
        };
      }
      G.UI.push(ov);
    });
  };
})();
