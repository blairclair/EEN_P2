/* =========================================================================
 * ch07 "Sorry Enough"  (Week 2: Mon 15 - Fri 19 Jan 2084)
 *
 * Beats: Darla's podcast cold open -> competition 2, the sandbag confession
 * (custom endurance + sincerity minigame "sandbags", judged by Dr. Harman) ->
 * the reward / punishment wheels -> Monday-night ranking (Carol ousted; the
 * Luxury Room scene if Luna is #1) -> the sabotage mystery (Joe on the lounge
 * wall, clues, the shredded Falsville book and the torn photo) -> Friday: the
 * Judge's first visit (the tonal turn) -> the blindfolded walk with the
 * Columbus closet flashback -> the Confessional slip -> the same-day count ->
 * public vote 2 (a VOTE TO SAVE: Annette's landslide over Carol) -> the wave
 * goodbye and "So this is how it is."
 *
 * Cross-chapter flags (CHAPTERS.md §2):
 *   READS  m_audience (via api.approval()), f_luxury_used, f_helped_waiter,
 *          f_kept_photo (default true), f_alliance_delphin, m_isaiah, m_delphin
 *   WRITES m_audience (api.approval / approvalAdd only), f_luxury_used,
 *          m_isaiah (+10 comforting him), m_waverly (-5 if the photo is torn),
 *          m_delphin (small +/- from the vote), m_annette (small)
 * Local flags: ch07_* (see code).
 *
 * Shared maps: keyed by the shared ids below. While a shared room has not
 * landed yet, a minimal local placeholder with the same id is used.
 * ========================================================================= */
(function () {
  'use strict';

  /* ---------------------------------------------------------------------
   * Shared names (one place).
   * ------------------------------------------------------------------- */
  var ROOM = {
    sandbags: 'house_gym_sandbags',
    courtroom: 'house_gym_courtroom',
    redHall: 'house_red_hall',
    lounge: 'house_lounge',
    kitchen: 'house_kitchen',
    bedHall: 'house_bedroom_hall',
    lunaRoom: 'house_luna_room',
    luxury: 'house_luxury_room',
    doll: 'house_doll_room',
    confessional: 'house_confessional',
    foyer: 'house_foyer',
    serviceStair: 'house_service_stair',
    closet: 'columbus_closet'
  };

  function sdata() { return (G.shared && G.shared.data) || {}; }
  /** Named spawn from the shared data, else the local fallback tile. */
  function spawn(map, from, fb) {
    var s = sdata().spawns;
    if (G.shared.has(map) && s && s[map] && s[map][from]) return s[map][from];
    return fb;
  }
  /** Named staging mark from the shared data, else the local fallback tile. */
  function mark(map, name, fb) {
    var m = sdata().marks;
    if (G.shared.has(map) && m && m[map] && m[map][name]) return m[map][name];
    return fb;
  }
  /** Shared room (deep copy + our entities) or our local placeholder. */
  function room(id, ext, fallback) {
    ext = ext || {};
    if (G.shared.has(id)) return G.shared.map(id, ext);
    var m = {};
    Object.keys(fallback).forEach(function (k) { m[k] = fallback[k]; });
    ['npcs', 'objects', 'zones', 'exits', 'lights'].forEach(function (k) { m[k] = (fallback[k] || []).concat(ext[k] || []); });
    Object.keys(ext).forEach(function (k) { if (['npcs', 'objects', 'zones', 'exits', 'lights', 'remove'].indexOf(k) < 0) m[k] = ext[k]; });
    return m;
  }

  /* ---------------------------------------------------------------------
   * Small drawing helpers (custom props / minigames)
   * ------------------------------------------------------------------- */
  function px(g, c, x, y, w, h) { g.fillStyle = c; g.fillRect(x, y, w, h); }

  var PROPS = {
    sandbag: function (g, x, y) { px(g, '#6a5434', x + 2, y + 6, 12, 8); px(g, '#8a7048', x + 3, y + 7, 10, 3); px(g, '#4a3a22', x + 7, y + 6, 2, 8); },
    sandpile: function (g, x, y) { px(g, '#6a5434', x + 1, y + 8, 14, 7); px(g, '#7d6640', x + 3, y + 3, 10, 6); px(g, '#8a7048', x + 4, y + 4, 8, 2); },
    emptymat: function (g, x, y) { px(g, '#2a2a30', x + 3, y + 3, 10, 2); px(g, '#e8e4d8', x + 6, y + 6, 4, 1); },
    wheel: function (g, x, y, t) {
      var cols = ['#e8323c', '#f2b33d', '#7a1218', '#e8e4d8', '#3fc1c9', '#b6f24a'];
      for (var i = 0; i < 6; i++) { g.fillStyle = cols[i]; g.beginPath(); g.moveTo(x + 8, y + 7); g.arc(x + 8, y + 7, 7, i * Math.PI / 3, (i + 1) * Math.PI / 3); g.fill(); }
      px(g, '#222', x + 7, y + 13, 2, 3);
    },
    doll: function (g, x, y) { px(g, '#f0d8c8', x + 5, y + 4, 6, 6); px(g, '#c01020', x + 6, y + 7, 1, 3); px(g, '#c01020', x + 9, y + 7, 1, 3); px(g, '#111', x + 6, y + 6, 1, 1); px(g, '#111', x + 9, y + 6, 1, 1); px(g, '#8a2a4a', x + 4, y + 10, 8, 5); },
    samantha: function (g, x, y, t) {
      // giant doll over two tiles: blood-red palm-leaf hair, icy eyes, purple lips, a gavel
      px(g, '#b0101a', x - 2, y - 6, 36, 6); px(g, '#d01a24', x + 2, y - 9, 6, 4); px(g, '#d01a24', x + 24, y - 9, 6, 4);
      px(g, '#f4dccc', x + 3, y - 1, 26, 15); px(g, '#7fe8ff', x + 9, y + 3, 3, 3); px(g, '#7fe8ff', x + 20, y + 3, 3, 3);
      px(g, '#7a2a8a', x + 12, y + 9, 8, 3); px(g, '#e8323c', x + 1, y + 14, 30, 2);
      px(g, '#6a4020', x + 28, y + 6, 2, 8); px(g, '#8a5a30', x + 26, y + 4, 6, 3);
      if (Math.sin(t * 2) > 0.6) px(g, '#e8323c', x + 15, y - 4, 2, 2); // she is the camera
    },
    cage: function (g, x, y) {
      px(g, '#1a1a20', x, y + 2, 32, 13);
      for (var i = 0; i <= 32; i += 4) px(g, '#9a9aa8', x + i, y, 1, 15);
      px(g, '#9a9aa8', x, y, 32, 1); px(g, '#9a9aa8', x, y + 14, 32, 1);
      px(g, '#333', x + 2, y + 15, 3, 1); px(g, '#333', x + 27, y + 15, 3, 1);
    },
    joe: function (g, x, y) {
      // the blood-red drawing of Joe, spanning three wall tiles
      px(g, 'rgba(150,10,16,0.9)', x - 12, y + 1, 40, 14);
      px(g, '#d01a24', x + 2, y + 1, 12, 3);     // bun
      px(g, '#d01a24', x - 1, y + 4, 18, 9);     // face
      px(g, '#4a0006', x + 3, y + 7, 2, 2); px(g, '#4a0006', x + 11, y + 7, 2, 2);
      px(g, '#2a0004', x + 6, y + 10, 4, 3);     // mouth open in pain
      px(g, '#a00810', x - 10, y + 12, 2, 4); px(g, '#a00810', x + 22, y + 13, 2, 3); px(g, '#a00810', x + 18, y + 3, 1, 5);
    },
    yarn: function (g, x, y, t) { g.strokeStyle = '#b89ae0'; g.lineWidth = 1; g.beginPath(); g.moveTo(x + 4, y + 12); g.quadraticCurveTo(x + 9, y + 4, x + 12, y + 13); g.stroke(); if (Math.sin(t * 4) > 0.5) px(g, '#fff', x + 8, y + 7, 1, 1); },
    compact: function (g, x, y, t) { px(g, '#ff7ab8', x + 5, y + 9, 7, 5); px(g, '#ffd0e4', x + 6, y + 10, 5, 2); px(g, '#c01020', x + 10, y + 12, 2, 1); if (Math.sin(t * 4) > 0.5) px(g, '#fff', x + 7, y + 8, 1, 1); },
    shreddedbook: function (g, x, y) { px(g, '#2a6a3a', x + 3, y + 5, 10, 7); px(g, '#e9dfc4', x + 1, y + 11, 4, 2); px(g, '#e9dfc4', x + 11, y + 3, 3, 2); px(g, '#e9dfc4', x + 13, y + 10, 3, 3); px(g, '#c01020', x + 6, y + 8, 3, 1); },
    leader: function (g, x, y) { px(g, '#c9b27a', x + 3, y + 3, 10, 10); px(g, '#e0c9a0', x + 6, y + 5, 4, 4); px(g, '#2a2a3a', x + 5, y + 9, 6, 4); },
    bucket: function (g, x, y) { px(g, '#8a8a96', x + 4, y + 7, 8, 7); px(g, '#cde', x + 5, y + 7, 6, 2); }
  };

  var TILES = {
    mat: { color: '#141418', color2: '#24242c', pattern: 'plates' },
    redcarpet: { color: '#7a0e16', color2: '#5a0a10', pattern: 'stripes' },
    redrug: { color: '#6a0c12', color2: '#801018', pattern: 'noise' },
    closeddoor: { base: 'door', solid: true },
    dollshelf: {
      solid: true, base: 'floor',
      draw: function (g, x, y, info) {
        px(g, '#3a2418', x, y, 16, 16); px(g, '#5a3a24', x, y + 7, 16, 1); px(g, '#5a3a24', x, y + 15, 16, 1);
        var o = Math.floor(info.r * 6);
        px(g, '#f0d8c8', x + 2 + o % 3, y + 2, 4, 4); px(g, '#c01020', x + 3 + o % 3, y + 4, 1, 3);
        px(g, '#f0d8c8', x + 9, y + 9 + o % 2, 4, 4); px(g, '#c01020', x + 10, y + 11 + o % 2, 1, 3);
      }
    },
    leaderwall: {
      wall: true, solid: true, color: '#3a3428', color2: '#2a2620', pattern: 'plain',
      draw: function (g, x, y, info) {
        px(g, '#2a2620', x, y, 16, 16);
        px(g, '#c9b27a', x + 2, y + 2, 12, 11); px(g, '#e0c9a0', x + 6, y + 4, 4, 4); px(g, '#2a2a3a', x + 5, y + 8, 6, 5);
        if (info.r > 0.5) px(g, '#111', x + 7, y + 5, 1, 1);
      }
    },
    holo: { anim: true, solid: true, wall: true, draw: function (g, x, y, info) {
      px(g, '#081420', x, y, 16, 16); var a = 0.35 + 0.25 * Math.sin(info.t * 2 + info.tx);
      g.fillStyle = 'rgba(63,193,201,' + a + ')'; g.fillRect(x + 1, y + 2, 14, 12);
      if ((info.tx + Math.floor(info.t * 3)) % 4 === 0) px(g, '#b6f24a', x + 3, y + 6, 10, 2);
    } }
  };

  /* ---------------------------------------------------------------------
   * MINIGAME 1: "sandbags", the sincerity endurance test.
   *  - HOLD phases: alternate LEFT / RIGHT to steady your arms. Stamina drains
   *    faster with every sandbag.
   *  - ASK phases: Dr. Harman asks; pick an answer (UP/DOWN + SPACE) while
   *    your arms keep burning. Defensive or performative = "Not sorry enough"
   *    + a sandbag (the question is asked again). Honest = the next question.
   *  - Honest through the last question -> "Enough... Forgiven."
   *  - Stamina 0 -> Luna's arms drop (not last: Annette already fell).
   * Result: {success, outcome:'forgiven'|'endured'|'dropped', bags, honest, performative, defensive}
   * ------------------------------------------------------------------- */
  var SANDBAG_QS = [
    { q: 'Luna Bartley. Why did you commit your crime?', a: [
      { t: 'I ended a pregnancy. An illegal one.', k: 'honest' },
      { t: 'Because your laws left me no other choice.', k: 'defensive' },
      { t: '(To the lens) I was lost. This show has shown me the light.', k: 'performative' }
    ] },
    { q: 'Do you regret it?', a: [
      { t: 'Every day.', k: 'honest' },
      { t: 'I regret getting caught.', k: 'defensive' },
      { t: '(Squeeze out a tear) With all my heart, Doctor. Bless the Great Leader.', k: 'performative' }
    ] },
    { q: 'Why?', a: [
      { t: 'I wanted to live. I wanted to survive. But I still dream of her. Sometimes I think I hear her voice.', k: 'honest' },
      { t: 'Does it matter? You decided before I opened my mouth.', k: 'defensive' },
      { t: 'Because life is sacred, and now I finally see that.', k: 'performative' }
    ] },
    { q: 'What would you say to your victim?', a: [
      { t: 'I\'m sorry. I thought I was doing the right thing. But I miss her. I miss her, and she never even existed.', k: 'honest' },
      { t: 'She wasn\'t a victim. She was never born.', k: 'defensive' },
      { t: '(Turn to the camera) Mommy has found redemption, sweetheart.', k: 'performative' }
    ] }
  ];
  var HARMAN_NO = { defensive: ['Defensive. Not sorry.', 'Not sorry enough.', 'You are arguing with me. Weight.'],
    performative: ['Performance is not penance.', 'The camera is not your confessor. Not sorry enough.', 'Pretty. Not sorry enough.'] };
  var CLIMAX = [
    'I\'m sorry. I\'m sorry, baby. I\'m so sorry I didn\'t give you a chance.',
    'I didn\'t know how to love you. I didn\'t know how to raise you. I was scared. And I should have been braver.'
  ];

  var sandbags = {
    autoSolve: function () { return { success: true, outcome: 'forgiven', bags: 0, honest: 4, performative: 0, defensive: 0 }; },
    start: function (ctx) {
      var R = ctx.R, P = ctx.PAL, W = ctx.W;
      var qs = SANDBAG_QS, qi = 0, stamina = 100, bags = 0, honest = 0, perf = 0, def = 0, answers = 0;
      var phase = 'intro', phT = 0, sel = 0, lastKey = null, tapCd = 0, wob = 0, msg = '', msgC = '#fff', dropT = -9, climaxI = 0, outcome = null;
      var MAXANS = 8;
      function drain() { return 3.2 + bags * 3.4; }
      function setPhase(p) { phase = p; phT = 0; }
      return new Promise(function (resolve) {
        ctx.loop(function (dt) {
          var I = ctx.input; phT += dt; tapCd -= dt; wob += dt;
          if (phase === 'intro') { if (phT > 2.2 || (phT > 0.4 && I.pressed('ok'))) { I.consume('ok'); setPhase('hold'); } return; }
          if (phase === 'hold' || phase === 'ask') {
            stamina -= drain() * dt * (phase === 'ask' ? 0.55 : 1);
            if (I.pressed('left') || I.pressed('right')) {
              var k = I.pressed('left') ? 'left' : 'right';
              if (k !== lastKey && tapCd <= 0) { stamina += 2.6; tapCd = 0.09; lastKey = k; ctx.sound('step'); }
              else { stamina -= 0.6; }
            }
            stamina = Math.min(100, stamina);
            if (stamina <= 0) { stamina = 0; outcome = 'dropped'; ctx.sound('fail'); G.UI.flash('#e8323c', 300); setPhase('end'); return; }
          }
          if (phase === 'hold') { if (phT > 3.6) { setPhase('ask'); sel = 0; ctx.sound('blip'); } return; }
          if (phase === 'ask') {
            var opts = qs[qi].a;
            if (I.repeat('up')) { sel = (sel + opts.length - 1) % opts.length; ctx.sound('blip'); }
            if (I.repeat('down')) { sel = (sel + 1) % opts.length; ctx.sound('blip'); }
            if (I.pressed('ok') && phT > 0.5) {
              I.consume('ok'); var a = opts[sel]; answers++;
              if (a.k === 'honest') {
                honest++; qi++; msg = qi >= qs.length ? '...' : (qi === 2 ? 'Louder.' : 'Go on.'); msgC = P.text; ctx.sound('confirm');
              } else {
                if (a.k === 'performative') perf++; else def++;
                bags++; dropT = ctx.t; var pool = HARMAN_NO[a.k]; msg = pool[(perf + def) % pool.length]; msgC = P.red; ctx.sound('hit'); G.UI.flash('#7a1218', 160);
              }
              setPhase('reply');
            }
            return;
          }
          if (phase === 'reply') {
            if (phT > 1.6 || (phT > 0.5 && I.pressed('ok'))) {
              I.consume('ok');
              if (qi >= qs.length) { setPhase('climax'); climaxI = 0; ctx.sound('heartbeat'); }
              else if (answers >= MAXANS) { outcome = 'endured'; setPhase('end'); }
              else setPhase('hold');
            }
            return;
          }
          if (phase === 'climax') {
            if (phT > 2.6 || (phT > 0.6 && I.pressed('ok'))) {
              I.consume('ok'); climaxI++; phT = 0;
              if (climaxI >= CLIMAX.length) { outcome = 'forgiven'; ctx.sound('reveal'); G.UI.flash('#ffffff', 500); setPhase('end'); }
            }
            return;
          }
          if (phase === 'end') {
            if (phT > 2.4 || (phT > 0.8 && I.pressed('ok'))) {
              I.consume('ok');
              resolve({ success: outcome !== 'dropped', outcome: outcome, bags: bags, honest: honest, performative: perf, defensive: def });
            }
          }
        }, function (t) {
          var g = R.ctx;
          var grad = g.createLinearGradient(0, 0, 0, ctx.H); grad.addColorStop(0, '#101016'); grad.addColorStop(1, '#040406');
          g.fillStyle = grad; g.fillRect(0, 0, W, ctx.H);
          // spotlight on the mat
          g.save(); g.globalAlpha = 0.18; g.fillStyle = '#ffe9c0'; g.beginPath(); g.moveTo(170, 23); g.lineTo(214, 23); g.lineTo(262, 190); g.lineTo(122, 190); g.fill(); g.restore();
          R.rect(132, 126, 120, 8, '#18181e'); R.rect(132, 126, 120, 2, '#2a2a34');
          // Luna, arms out, palms up. Arms sag as stamina falls.
          var sag = (100 - stamina) / 100 * 16, shake = stamina < 35 ? Math.sin(t * 40) * (35 - stamina) / 20 : 0;
          var spec = 'luna';
          R.img(ctx.sprite(spec, 'down', 0), 192 - 24, 56, 3);
          var ay = 103 + sag * 0.6 + shake;
          R.rect(140, ay, 30, 5, '#d8b8a0'); R.rect(214, ay, 30, 5, '#d8b8a0');
          R.rect(136, ay - 1, 5, 7, '#e8cbb4'); R.rect(243, ay - 1, 5, 7, '#e8cbb4');
          for (var b = 0; b < bags; b++) {
            var side = b % 2 === 0 ? 0 : 1, row = Math.floor(b / 2);
            var bx = side ? 220 : 142, by = ay - 8 - row * 8;
            if (b === bags - 1 && ctx.t - dropT < 0.25) by -= (0.25 - (ctx.t - dropT)) * 160;
            R.rect(bx, by, 22, 8, '#6a5434'); R.rect(bx + 2, by + 1, 18, 3, '#8a7048'); R.rect(bx + 10, by, 2, 8, '#4a3a22');
          }
          ctx.header('COMPETITION 2 • SORRY ENOUGH', 'BAGS ' + bags + '   SINCERITY ' + honest + '/' + qs.length);
          R.recDot && R.recDot(W - 16, 30, t);
          // stamina bar
          var sc = stamina > 50 ? P.neon : stamina > 25 ? P.amber : P.red;
          R.text('ARMS', 10, 30, { size: 7, color: P.dim });
          R.rect(10, 40, 12, 120, '#222'); R.rect(11, 41 + 118 * (1 - stamina / 100), 10, 118 * stamina / 100, sc);
          // Dr. Harman
          R.img(ctx.portrait('harman', phase === 'end' && outcome === 'forgiven' ? 'neutral' : 'smug'), 30, 30, 1);
          R.text('DR. HARMAN', 30, 72, { size: 6, color: P.dim });
          if (phase === 'intro') {
            R.panel(76, 30, 296, 34, {});
            R.text('Arms out. Palms up.', 84, 36, { size: 9, color: '#fff' });
            R.text('Alternate ← → to steady your arms. Answer with ↑ ↓ SPACE.', 84, 50, { size: 7, color: P.dim });
          } else if (phase === 'hold') {
            R.panel(76, 30, 296, 22, {});
            R.text(qi === 0 ? 'He walks the line. He reaches your mat.' : 'He waits. The weight waits with him.', 84, 37, { size: 8, color: P.think, style: 'italic', font: 'serif' });
            var on = Math.floor(t * 4) % 2 === 0;
            R.text((on ? '←' : '→') + '  STEADY  ' + (on ? '→' : '←'), W / 2, 196 - 14, { size: 10, align: 'center', color: '#fff' });
          } else if (phase === 'ask' || phase === 'reply') {
            var q = qs[Math.min(qi, qs.length - 1)];
            R.panel(76, 30, 296, 22, {});
            R.text(phase === 'reply' && msg ? msg : q.q, 84, 37, { size: 9, color: phase === 'reply' ? msgC : '#fff' });
            if (phase === 'ask') {
              var oy = 192 - q.a.length * 15 - 6;
              R.panel(40, oy - 4, 304, q.a.length * 15 + 6, { accent: P.amber });
              q.a.forEach(function (o, i) {
                var lines = R.wrap(o.t, 290, 7);
                R.text((i === sel ? '▸ ' : '  ') + lines[0] + (lines.length > 1 ? '…' : ''), 46, oy + i * 15, { size: 7, color: i === sel ? '#ffe9a0' : P.dim });
              });
              var full = R.wrap(q.a[sel].t, 296, 7);
              if (full.length > 1) { R.rect(40, oy - 26, 304, 20, '#000', 0.8); full.slice(0, 2).forEach(function (l, i) { R.text(l, 46, oy - 24 + i * 9, { size: 7, color: '#fff' }); }); }
            }
          } else if (phase === 'climax') {
            R.rect(0, 0, W, ctx.H, '#000', 0.35);
            var lines2 = R.wrap(CLIMAX[Math.min(climaxI, CLIMAX.length - 1)], 300, 10, 'serif', 'italic');
            lines2.forEach(function (l, i) { R.text(l, W / 2, 60 + i * 14, { size: 10, align: 'center', font: 'serif', style: 'italic', color: P.think }); });
          } else if (phase === 'end') {
            var txt = outcome === 'forgiven' ? 'ENOUGH.  FORGIVEN.' : outcome === 'dropped' ? 'YOUR ARMS GIVE OUT' : 'STILL STANDING. NOT FORGIVEN.';
            R.rect(0, 92, W, 26, outcome === 'dropped' ? P.redDark : '#000', 0.85);
            R.text(txt, W / 2, 98, { size: 14, align: 'center', font: 'sans', color: outcome === 'forgiven' ? '#fff' : outcome === 'dropped' ? '#fff' : P.amber });
          }
          R.scanlines(0.12); R.vignette(0.5);
        });
      });
    }
  };

  /* ---------------------------------------------------------------------
   * MINIGAME 2: "wheel", the reward / punishment wheel (a set piece).
   * params {title, wedges:[...], land:index, spinner:'Kessie', colors}
   * ------------------------------------------------------------------- */
  var wheel = {
    autoSolve: function (p) { return { success: true, landed: p.wedges[p.land] }; },
    start: function (ctx) {
      var p = ctx.params, R = ctx.R, P = ctx.PAL, n = p.wedges.length;
      var seg = Math.PI * 2 / n, target = Math.PI * 2 * 4 + (Math.PI * 1.5 - (p.land + 0.5) * seg);
      var ang = 0, state = 'wait', stT = 0, clickPrev = 0;
      var cols = p.colors || ['#e8323c', '#2a2a34', '#f2b33d', '#3a1020', '#3fc1c9', '#1a2a3a'];
      return new Promise(function (resolve) {
        ctx.loop(function (dt) {
          var I = ctx.input;
          if (state === 'wait') { if (ctx.t > 1.2 || I.pressed('ok')) { I.consume('ok'); state = 'spin'; stT = ctx.t; ctx.sound('select'); } return; }
          if (state === 'spin') {
            var k = Math.min(1, (ctx.t - stT) / 4.2), e = 1 - Math.pow(1 - k, 3);
            ang = target * e;
            var c = Math.floor((ang + seg / 2) / seg); if (c !== clickPrev) { clickPrev = c; ctx.sound('blip'); }
            if (k >= 1) { state = 'done'; stT = ctx.t; ctx.sound('sting'); }
            return;
          }
          if (state === 'done' && ctx.t - stT > 0.8 && (I.pressed('ok') || ctx.t - stT > 3)) { I.consume('ok'); resolve({ success: true, landed: p.wedges[p.land] }); }
        }, function (t) {
          var g = R.ctx;
          g.fillStyle = '#0a0608'; g.fillRect(0, 0, ctx.W, ctx.H);
          ctx.header(p.title || 'THE WHEEL', (p.spinner || '') + ' spins');
          var cx = ctx.W / 2, cy = 118, r = 78;
          for (var i = 0; i < n; i++) {
            g.fillStyle = cols[i % cols.length]; g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, r, ang + i * seg, ang + (i + 1) * seg); g.closePath(); g.fill();
            g.save(); g.translate(cx, cy); g.rotate(ang + (i + 0.5) * seg);
            R.text(p.wedges[i], 12, -3, { size: 5, color: '#fff', ctx: g });
            g.restore();
          }
          g.strokeStyle = '#e8c15a'; g.lineWidth = 3; g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.stroke();
          R.rect(cx - 4, cy - 4, 8, 8, '#e8c15a');
          g.fillStyle = '#fff'; g.beginPath(); g.moveTo(cx - 7, cy - r - 10); g.lineTo(cx + 7, cy - r - 10); g.lineTo(cx, cy - r + 6); g.fill();
          if (state === 'done') {
            R.rect(0, ctx.H - 30, ctx.W, 18, P.redDark, 0.9);
            R.text(p.wedges[p.land].toUpperCase(), ctx.W / 2, ctx.H - 27, { size: 11, align: 'center', font: 'sans', color: '#fff' });
          } else if (state === 'wait') ctx.footer('[SPACE] spin');
          R.scanlines(0.12); R.vignette(0.45);
        });
      });
    }
  };

  /* ---------------------------------------------------------------------
   * MINIGAME 3: "blindfold", the walk to the Confessional in the dark.
   * Black screen, sound only. A gloved hand steers you: press the direction
   * you feel (←↑→) before the hand tightens. SPACE = breathe (lowers panic).
   * Panic never fails you (they just drag you on); it only shapes the text.
   * params {cues:[{dir, text}], part}
   * ------------------------------------------------------------------- */
  var blindfold = {
    autoSolve: function () { return { success: true, panic: 20, missed: 0 }; },
    start: function (ctx) {
      var p = ctx.params, R = ctx.R, P = ctx.PAL, cues = p.cues;
      var i = 0, state = 'feel', stT = 0, panic = p.panic || 25, missed = 0, msg = '', breathCd = 0, flashT = -9;
      var glyph = { left: '←', right: '→', up: '↑' };
      return new Promise(function (resolve) {
        ctx.loop(function (dt) {
          var I = ctx.input; breathCd -= dt;
          panic = Math.min(100, panic + dt * 3.5);
          if (I.pressed('ok') && breathCd <= 0) { I.consume('ok'); panic = Math.max(0, panic - 14); breathCd = 1.2; msg = 'In. Two. Three. Out.'; }
          if (Math.floor(ctx.t * (0.8 + panic / 60)) !== Math.floor((ctx.t - dt) * (0.8 + panic / 60))) ctx.sound('heartbeat');
          if (state === 'feel') {
            var c = cues[i], lim = 2.6;
            var got = ['left', 'right', 'up'].filter(function (d) { return I.pressed(d); })[0];
            if (got) {
              if (got === c.dir) { ctx.sound('step'); msg = 'You follow the hand.'; panic = Math.max(0, panic - 4); }
              else { ctx.sound('miss'); msg = 'The glove clamps down on your arm.'; panic = Math.min(100, panic + 16); missed++; flashT = ctx.t; }
              state = 'step'; stT = ctx.t;
            } else if (ctx.t - stT > lim) { ctx.sound('miss'); msg = 'The glove clamps down. You are steered anyway.'; panic = Math.min(100, panic + 18); missed++; flashT = ctx.t; state = 'step'; stT = ctx.t; }
            return;
          }
          if (state === 'step' && ctx.t - stT > 1.1) {
            i++; stT = ctx.t;
            if (i >= cues.length) { state = 'done'; } else state = 'feel';
            return;
          }
          if (state === 'done' && ctx.t - stT > 0.6) resolve({ success: true, panic: Math.round(panic), missed: missed });
        }, function (t) {
          var g = R.ctx;
          g.fillStyle = '#000'; g.fillRect(0, 0, ctx.W, ctx.H);
          var pulse = (panic / 100) * (0.5 + 0.5 * Math.sin(t * (4 + panic / 12)));
          R.vignette(0.2 + pulse * 0.8);
          if (ctx.t - flashT < 0.3) R.rect(0, 0, ctx.W, ctx.H, '#3a0006', 0.6);
          R.static(0.04 + panic / 900);
          var c = cues[Math.min(i, cues.length - 1)];
          if (state === 'feel') {
            R.text(c.text, ctx.W / 2, 70, { size: 9, align: 'center', font: 'serif', style: 'italic', color: P.think });
            var a = 0.15 + 0.25 * Math.sin(t * 6);
            if (c.dir === 'left') R.text(glyph.left, 30, 96, { size: 22, color: '#fff', alpha: a });
            if (c.dir === 'right') R.text(glyph.right, ctx.W - 50, 96, { size: 22, color: '#fff', alpha: a });
            if (c.dir === 'up') R.text(glyph.up, ctx.W / 2 - 8, 26, { size: 22, color: '#fff', alpha: a });
          }
          if (msg) R.text(msg, ctx.W / 2, 140, { size: 7, align: 'center', color: P.dim });
          R.text('PANIC', 10, ctx.H - 26, { size: 6, color: P.faint });
          R.rect(40, ctx.H - 25, 80, 4, '#222'); R.rect(40, ctx.H - 25, 80 * panic / 100, 4, panic > 70 ? P.red : P.amber);
          ctx.footer('Feel the hand: ← ↑ →    [SPACE] breathe');
        });
      });
    }
  };

  /* ---------------------------------------------------------------------
   * MINIGAME 4: "savecount", the public-vote holoscreen. VOTE TO SAVE:
   * MORE saves survives. Contestants don't vote; the player watches.
   * params {left:{id, name, final}, right:{...}, seconds}
   * ------------------------------------------------------------------- */
  var savecount = {
    autoSolve: function (p) { var sv = p.left.final >= p.right.final ? p.left.id : p.right.id; return { success: true, saved: sv, eliminated: sv === p.left.id ? p.right.id : p.left.id, tally: (function () { var o = {}; o[p.left.id] = p.left.final; o[p.right.id] = p.right.final; return o; })() }; },
    start: function (ctx) {
      var p = ctx.params, R = ctx.R, P = ctx.PAL, dur = p.seconds || 11, state = 'count', stT = 0;
      var res = savecount.autoSolve(p);
      function val(side, k) { var curve = side.curve || 1; return Math.floor(side.final * Math.pow(k, curve)); }
      return new Promise(function (resolve) {
        ctx.loop(function (dt) {
          var I = ctx.input;
          if (state === 'count') {
            if (Math.floor(ctx.t * 3) !== Math.floor((ctx.t - dt) * 3)) ctx.sound('blip');
            if (ctx.t > dur || (ctx.t > 1 && I.pressed('ok'))) { I.consume('ok'); state = 'done'; stT = ctx.t; ctx.sound('sting'); }
            return;
          }
          if (ctx.t - stT > 0.8 && (I.pressed('ok') || ctx.t - stT > 4)) { I.consume('ok'); resolve(res); }
        }, function (t) {
          var g = R.ctx;
          var grad = g.createLinearGradient(0, 0, 0, ctx.H); grad.addColorStop(0, '#04161c'); grad.addColorStop(1, '#020608'); g.fillStyle = grad; g.fillRect(0, 0, ctx.W, ctx.H);
          ctx.header(p.title || 'PUBLIC VOTE', 'TAP SAVE IN THE APP • MORE SAVES SURVIVES');
          var k = state === 'count' ? Math.min(1, ctx.t / dur) : 1;
          var mins = Math.max(0, Math.ceil(10 * (1 - k)));
          R.text('VOTING CLOSES IN ' + mins + ':00', ctx.W / 2, 28, { size: 8, align: 'center', color: P.amber });
          [p.left, p.right].forEach(function (s, i) {
            var x = i === 0 ? 70 : ctx.W - 150, v = val(s, k);
            var lose = state === 'done' && res.eliminated === s.id;
            R.rect(x - 4, 40, 88, 120, lose ? P.redDark : '#0a2a32', 0.8);
            R.stroke(x - 4, 40, 88, 120, lose ? P.red : P.teal, 1);
            R.img(ctx.portrait(s.id, lose ? 'cry' : state === 'done' ? 'smug' : 'fear'), x + 20, 48, 1.1);
            R.text(s.name.toUpperCase(), x + 40, 98, { size: 9, align: 'center', font: 'sans', color: '#fff' });
            R.text('SAVES', x + 40, 112, { size: 6, align: 'center', color: P.dim });
            R.text(v.toLocaleString('en-US'), x + 40, 122, { size: 13, align: 'center', font: 'mono', color: lose ? '#fff' : P.neon });
            var bw = 78 * Math.min(1, v / Math.max(p.left.final, p.right.final));
            R.rect(x + 1, 146, 78, 6, '#111'); R.rect(x + 1, 146, bw, 6, lose ? P.red : P.teal);
          });
          R.text('VS', ctx.W / 2, 92, { size: 14, align: 'center', font: 'sans', color: P.faint });
          if (state === 'done') {
            R.rect(0, ctx.H - 36, ctx.W, 22, P.red, 0.9);
            var nm = res.saved === p.left.id ? p.left.name : p.right.name, ln = res.eliminated === p.left.id ? p.left.name : p.right.name;
            R.text(nm.toUpperCase() + ' IS SAVED. ' + ln.toUpperCase() + ' FACES JUDGMENT.', ctx.W / 2, ctx.H - 31, { size: 10, align: 'center', font: 'sans', color: '#fff' });
          }
          R.scanlines(0.18); R.vignette(0.4);
        });
      });
    }
  };

  /* ---------------------------------------------------------------------
   * MAPS. Keys are the SHARED ids so cross-room exits link. Each room is a
   * deep copy of the shared location plus ch07 entities; if a shared room is
   * ever missing, a minimal placeholder of the same size/door is used.
   * ------------------------------------------------------------------- */
  var LEG = { a: 'mat', e: 'redcarpet', r: 'redrug', y: 'dollshelf', Y: 'leaderwall', H: 'holo' };

  /** Minimal walled placeholder of the shared room's size, door + spawn. */
  function ph(name, w, h, door, exitId, to, extra) {
    var rows = [];
    for (var y = 0; y < h; y++) {
      var r = '';
      for (var x = 0; x < w; x++) r += (x === door[0] && y === door[1]) ? 'D' : (x === 0 || y === 0 || x === w - 1 || y === h - 1) ? '#' : '.';
      rows.push(r);
    }
    var sp = [Math.min(w - 2, Math.max(1, door[0])), Math.min(h - 2, Math.max(1, door[1]))];
    var m = { name: name, tiles: rows, legend: LEG, spawn: sp, ambient: 'hum',
      exits: exitId ? [{ id: exitId, at: door, to: to }] : [] };
    if (extra) Object.keys(extra).forEach(function (k) { m[k] = extra[k]; });
    return m;
  }
  /** Copy of a shared door with a lock condition (falls back to a plain def). */
  function lockedExit(map, id, cond, text, fbAt) {
    var over = { locked: cond, lockedText: text };
    if (G.shared.exit && G.shared.has(map)) return G.shared.exit(map, id, over);
    return { id: id, at: fbAt || [0, 0], to: null, locked: cond, lockedText: text };
  }
  function always() { return true; }
  function cam(id, at, text) { return { id: id, at: at, prop: 'camera', examine: [{ think: text || 'A red dot. Solid. Recording.' }, { sound: 'camera' }] }; }

  // --- Gym fallbacks: same 24x20 shell, door and marks as loc_gym_offsite.js
  function gymRows(fill) {
    var rows = [], y, x;
    for (y = 0; y < 20; y++) {
      var r = '';
      for (x = 0; x < 24; x++) {
        var c = '.';
        if (y < 2 || y === 19 || x === 23 || x === 0) c = '#';
        else if (x === 21) c = 'G';
        else if (x === 22) c = '#';
        else if (y >= 15) c = 'n';
        if (x === 0 && (y === 9 || y === 10)) c = 'D';
        r += (fill && fill(x, y)) || c;
      }
      rows.push(r);
    }
    return rows;
  }
  var fbSandbags = {
    name: 'Gymnasium: The Arena',
    tiles: gymRows(function (x, y) { return (y === 9 && x >= 5 && x <= 17 && x % 2 === 1) ? 'a' : null; }),
    legend: LEG, spawn: [1, 9], ambient: 'crowd', dark: 0.3, lights: [{ at: [11, 9], r: 90 }],
    objects: [cam('ch07_camA', [2, 1]), cam('ch07_camB', [19, 1])],
    exits: [{ id: 'to_red_hall', at: [0, 9], to: 'house_red_hall' }]
  };
  var fbCourt = {
    name: 'Gymnasium: The Courtroom',
    tiles: gymRows(function (x, y) { if (y === 2 && x >= 7 && x <= 13) return 'p'; if (x === 10 && y >= 9 && y <= 12) return 'e'; if (y === 0 && x >= 5 && x <= 15) return 'H'; return null; }),
    legend: LEG, spawn: [1, 9], ambient: 'crowd', dark: 0.3, lights: [{ at: [10, 8], r: 72 }],
    objects: [cam('ch07_camC', [2, 1]), cam('ch07_camD', [19, 1]), { id: 'cage', at: [10, 13], draw: PROPS.cage, solid: true, layer: 1 }],
    exits: [{ id: 'to_red_hall', at: [0, 9], to: 'house_red_hall' }]
  };

  /* --- positions (shared marks first; literals equal the shared values) --- */
  var SB = ROOM.sandbags, CT = ROOM.courtroom, DL = ROOM.doll;
  function MAT(n) { return mark(SB, 'mat_' + n, [3 + n * 2, 9]); }
  function above(p, d) { return [p[0], p[1] - (d || 1)]; }

  /* --- the holoscreen shows the two condemned and their SAVE counters --- */
  var HOLO = { l: 'Carol', r: 'Annette', lv: '—', rv: '—' };

  var CAST = {
    harman: { name: 'Dr. Harman', skin: '#ecd6c4', hair: '#2a2a2a', hairStyle: 'slick', outfit: '#f2f2f2', outfit2: '#3a3a44', style: 'coat', height: 'tall', build: 'slim', accessory: ['glasses', 'badge'], voice: 250, bg: '#1e2228' },
    suit: { name: 'Suited Man', skin: '#d8b090', hair: '#3a2a20', hairStyle: 'slick', outfit: '#22242c', outfit2: '#22242c', style: 'suit', accessory: 'tie', accent: '#8a1a2a', voice: 240 },
    suit2: { extends: 'suit', skin: '#b08060', hair: '#9a9a9a' },
    suit3: { extends: 'suit', skin: '#f0d0b8', hair: '#c9a24a', hairStyle: 'short' }
  };

  function maps() {
    var m = {}, R = ROOM;
    var noLeave = [{ think: 'Not now. A True Believer is standing in the doorway with folded hands.' }];

    m[SB] = room(SB, {
      remove: ['mat_7', 'to_red_hall'],
      exits: [lockedExit(SB, 'to_red_hall', always, noLeave, [0, 9])],
      objects: [{ id: 'ch07_johnmat', at: MAT(7), solid: false, examine: [{ think: 'The seventh mat. John\'s. Nobody stands on it. His absence thuds in my chest like a second heartbeat.' }] }],
      npcs: [
        { id: 'ch07_isaiah', spec: 'isaiah', at: MAT(1), facing: 'up', talk: [['isaiah', 'Did you know the average sandbag weighs about thirty-five pounds? I am trying very hard not to know that right now.', 'fear']] },
        { id: 'ch07_carol', spec: 'carol', at: MAT(2), facing: 'up', talk: [{ if: 'f_helped_waiter', then: [['carol', 'Saint Luna. Gonna kneel for the sandbags too? Help them carry themselves?', 'smug']], else: [['carol', 'Don\'t look at me. I\'m in the zone.', 'angry']] }] },
        { id: 'ch07_kessie', spec: 'kessie', at: MAT(3), facing: 'up', talk: [['kessie', 'Keep your elbows soft, sweetie. Lock \'em and they\'ll give out on you. I lifted laundry for thirty years.', 'happy']] },
        { id: 'ch07_delphin', spec: 'delphin', at: MAT(5), facing: 'up', talk: [['delphin', 'A sincerity contest. On television. Red, I think they finally invented a game I\'m genetically incapable of winning.', 'smug']] },
        { id: 'ch07_annette', spec: 'annette', at: MAT(6), facing: 'up', talk: [['annette', 'Don\'t you worry about me, girl. These old arms have carried worse than sand.', 'happy']] },
        { id: 'ch07_harman', spec: 'harman', at: mark(SB, 'harman', [11, 5]), facing: 'down', talk: [['harman', 'Take your mat, Miss Bartley. Mat four. Sincerity is punctual.']] },
        { id: 'ch07_trader', spec: 'trader', at: mark(SB, 'trader', [14, 5]), facing: 'down', talk: [['trader', 'Mat four, darling. Front and centre. The camera loves a redhead in pain.', 'smug']] },
        { id: 'ch07_boar', spec: 'tb_boar', at: [MAT(1)[0] + 1, MAT(1)[1]], facing: 'up', turn: false },
        { id: 'ch07_dog', spec: 'tb_dog', at: [MAT(2)[0] + 1, MAT(2)[1]], facing: 'up', turn: false },
        { id: 'ch07_elephant', spec: 'tb_elephant', at: [MAT(4)[0] + 1, MAT(4)[1]], facing: 'up', turn: false, talk: [{ think: 'Elephant. Slightly shorter than the others. The gold mask doesn\'t turn toward me, but I feel it anyway.' }] },
        { id: 'ch07_hippo', spec: 'tb_hippo', at: [MAT(6)[0] + 1, MAT(6)[1]], facing: 'up', turn: false }
      ],
      zones: [{ id: 'ch07_mymat', at: MAT(4), w: 1, h: 1 }]
    }, fbSandbags);

    // take positions from the shared fixtures we replace, so later moves in shared/ carry over
    var ctBase = G.shared.has(CT) ? G.shared.map(CT) : { objects: [] };
    function sharedAt(id, fb) { var o = (ctBase.objects || []).filter(function (e) { return e.id === id; })[0]; return o ? o.at.slice() : fb; }
    var holoSrc = (ctBase.objects || []).filter(function (e) { return e.id === 'holoscreen'; })[0] || {};
    var holo = { id: 'ch07_holo', at: sharedAt('holoscreen', [5, 2]), prop: 'gx_holoscreen', solid: !!holoSrc.solid, layer: holoSrc.layer != null ? holoSrc.layer : -1, wTiles: holoSrc.wTiles || 11,
      left: function () { return HOLO.l; }, right: function () { return HOLO.r; },
      leftVotes: function () { return HOLO.lv; }, rightVotes: function () { return HOLO.rv; },
      examine: [{ think: 'Carol and Annette, twenty feet tall. Two SAVE counters underneath, blank as headstones.' }] };
    m[CT] = room(CT, {
      remove: G.shared.has(CT) ? ['holoscreen', 'jury_7', 'to_red_hall'] : ['to_red_hall'],
      exits: [lockedExit(CT, 'to_red_hall', always, noLeave, [0, 9])],
      objects: G.shared.has(CT) ? [holo, { id: 'jury_7', at: sharedAt('jury_7', [3, 6]), prop: 'gx_mannequin', headless: true, examine: [{ think: 'One juror has lost its head. It rolled under the jury rail. Nobody has picked it up.' }] }] : []
    }, fbCourt);

    m[R.redHall] = room(R.redHall, {}, ph('The Red Hall', 42, 6, [13, 5], 'to_kitchen', R.kitchen));
    m[R.foyer] = room(R.foyer, {}, ph('Foyer', 14, 11, [13, 5], 'to_red_hall', R.redHall));
    m[R.serviceStair] = room(R.serviceStair, {
      remove: ['to_doll_room'],
      exits: [lockedExit(R.serviceStair, 'to_doll_room', '!ch07_friday', [{ think: 'The top floor. Contestants only go up there escorted.' }], [4, 1])]
    }, ph('Service Stair', 7, 8, [0, 2], 'to_bedroom_hall', R.bedHall));
    m[R.lounge] = room(R.lounge, {
      objects: [
        { id: 'ch07_joe', at: [6, 0], draw: PROPS.joe, solid: true, layer: 1, if: '!ch07_wallClean' },
        { id: 'ch07_compact', at: [9, 2], draw: PROPS.compact, solid: false, if: '!ch07_clueCompact' }
      ]
    }, ph('The Lounge', 14, 10, [6, 9], 'to_red_hall', R.redHall));
    m[R.kitchen] = room(R.kitchen, {}, ph('The Kitchen', 12, 11, [5, 0], 'to_red_hall', R.redHall));
    m[R.bedHall] = room(R.bedHall, {
      remove: ['to_luxury_room'],
      exits: [lockedExit(R.bedHall, 'to_luxury_room', '!ch07_lunaTop', [{ think: 'The Luxury Room. Number one only. Not me. Not tonight.' }], [35, 5])],
      objects: [{ id: 'ch07_yarn', at: [25, 1], draw: PROPS.yarn, solid: false, if: '!ch07_clueYarn' }]
    }, ph('Bedroom Hall', 42, 6, [14, 0], 'to_luna_room', R.lunaRoom));
    m[R.lunaRoom] = room(R.lunaRoom, {}, ph('Room No. 3', 15, 10, [4, 9], 'to_bedroom_hall', R.bedHall, {
      objects: [{ id: 'window', at: [4, 0] }, { id: 'tablet', at: [2, 0] }] }));
    m[R.luxury] = room(R.luxury, {}, ph('The Luxury Room', 12, 10, [5, 0], 'to_bedroom_hall', R.bedHall, {
      objects: [{ id: 'lux_bed', at: [2, 3] }] }));
    m[DL] = room(DL, {
      remove: ['to_service_stair', 'to_confessional'],
      exits: [lockedExit(DL, 'to_service_stair', always, [{ think: 'Two True Believers in the doorway. Nobody leaves before the vote.' }], [3, 13]),
        lockedExit(DL, 'to_confessional', always, [{ think: 'Not without the blindfold. That\'s the new rule.' }], [22, 6])]
    }, ph('The Doll Room', 23, 14, [3, 13], null, null, { ambient: 'drone' }));
    m[R.confessional] = room(R.confessional, {
      remove: ['to_doll_room'],
      npcs: [
        { id: 'ch07_don', spec: 'tb_dog', at: [1, 3], facing: 'up', turn: false },
        { id: 'ch07_stephy', spec: 'tb_deer', at: [3, 3], facing: 'up', turn: false }
      ]
    }, ph('The Confessional', 5, 5, [2, 4], null, null, { ambient: 'drone', objects: [{ id: 'ballot_box', at: [2, 1], prop: 'votebox' }] }));
    m[R.closet] = room(R.closet, {
      ambient: 'drone', dark: 0.85, playerLight: 20, tint: '#100808', tintAlpha: 0.3,
      objects: [
        { id: 'ch07_closetdoor', at: [1, 3], solid: true, examine: [
          { think: 'Locked. The staff member who locked me in said he\'d be back soon. It was less of a promise and more of a threat.' },
          { set: { ch07_closetDoor: true } }] },
        { id: 'ch07_closetwall', at: [1, 0], examine: [{ think: 'Not even enough space to lie down. The smell of piss. I wasn\'t the first kid stuck in here and I won\'t be the last.' }] }
      ]
    }, ph('Columbus House: the closet', 4, 4, [1, 3], null, null));
    return m;
  }

  /* --- private-vote count: built from Luna's slip (a vote AGAINST) ------- */
  function countOrder(lunaPick) {
    // Draw order from the box. Carol has 4 valid votes from the others whatever
    // Luna writes, plus Carol's own spoiled vote for Annette. ([when-npc-votes-are-a9c8])
    return ['carol', 'carol', 'carol', 'SPOILED', lunaPick, 'carol'];
  }

  G.registerChapter({
    id: 'ch07',
    title: 'Sorry Enough',
    kicker: 'WEEK 2',
    maps: maps(),
    tiles: TILES,
    props: PROPS,
    cast: CAST,
    minigames: { sandbags: sandbags, wheel: wheel, blindfold: blindfold, savecount: savecount },
    testDefaults: { m_audience: 40, m_isaiah: 30, m_delphin: 40, m_waverly: 60, m_annette: 40, f_luxury_used: false, f_helped_waiter: true, f_kept_photo: true, f_alliance_delphin: true },

    start: async function (api) {
      var R = ROOM;

      /* ===============================================================
       * 0. Cold open: Dancing With the Damned
       * ============================================================= */
      await api.tv([
        { speaker: 'darla', headline: 'DANCING WITH THE DAMNED', tag: 'PODCAST', text: 'Hey there everyone and welcome to another episode of Dancing With the Damned! Here to talk about the record-breaking first execution of Right to Life is its host, Trader Johnson.' },
        { speaker: 'trader', mood: 'happy', headline: 'DANCING WITH THE DAMNED', tag: 'PODCAST', text: 'Great to be here, Darla. I\'m a big fan. Long time listener, first time speaker.' },
        { speaker: 'darla', headline: 'DANCING WITH THE DAMNED', tag: 'PODCAST', text: 'Any fun off-camera stories you can share with the fans?' },
        { speaker: 'trader', mood: 'smug', headline: 'DANCING WITH THE DAMNED', tag: 'PODCAST', text: 'Well, there was this one time Carol and Kessie got into the most hilarious fight. Afraid I can\'t say more. Those interactions are DPE property, you see.' },
        { speaker: 'trader', mood: 'happy', headline: 'HIDDEN CAMERA PROJECT', tag: 'AD', text: 'Five cameras hidden around the House, and the contestants are completely unaware. Only 149.99. Binge it as it happens, or save it to fill the empty hole in your chest once the show ends.', ticker: 'CODE DARLASDEALS • 15% OFF • ' }
      ]);

      /* ===============================================================
       * 1. Monday: Competition 2, the sandbags
       * ============================================================= */
      await api.titleCard('Monday', 'Competition 2', 2200, { kicker: 'WEEK 2 • 15 JAN 2084' });
      await api.goRoom(SB, { at: spawn(SB, 'from_red_hall', [1, 9]), facing: 'right' });
      api.onAir(true);
      api.approval(true);
      await api.say('trader', 'Welcome to your second opportunity for salvation.', { mood: 'happy' });
      await api.think('Seven beds have become seven black mats, spaced equidistant across the floor. We stand in a line, minus John.');
      api.objective('Take your mat (No. 4). Talk to the others first, if you like.', { target: 'ch07_mymat' });
      await api.waitForZone('ch07_mymat');
      api.objective(null);
      api.lockPlayer();
      api.teleport(MAT(4), 'up');
      var HQ = above(MAT(4));
      await api.move('ch07_harman', HQ);
      api.face('ch07_harman', 'down');
      api.lowerThird('DR. HARMAN', 'Evaluator of Sincerity', 3500);
      await api.narrate('A tall, gaunt man in a white coat, with the kind of glasses that make him look like a parody of intellect. His name tag reads Dr. Harman.');
      await api.say('harman', 'I am your evaluator today. My role is to determine the sincerity of your repentance. If you are not sorry enough, you will be given a chance to become sorrier.');
      await api.emote('ch07_delphin', '♪', 700);
      await api.narrate('Delphin lets out a low chuckle. Dr. Harman ignores him.');
      await api.say('harman', 'Extend your arms. Palms up.');
      await api.think('True Believers appear at each station like summoned ghosts. Elephant stands beside me. Dog plants himself next to Carol, practically vibrating with excitement.');

      // Isaiah, Carol and Kessie go first
      await api.move('ch07_harman', above(MAT(1)));
      api.face('ch07_harman', 'down');
      await api.say('harman', 'Why did you commit your crime?');
      await api.say('isaiah', 'I didn\'t... it wasn\'t really a crime, I just...', { mood: 'fear' });
      await api.say('harman', 'Not sorry enough.');
      api.sound('hit'); await api.shake(200, 2);
      await api.narrate('Boar drops a sandbag onto Isaiah\'s arms. He gasps.');
      await api.move('ch07_harman', above(MAT(2)));
      api.face('ch07_harman', 'down');
      await api.say('carol', 'I did what I had to. But I regret how it ended.');
      await api.say('harman', 'Defensive. Not sorry.');
      api.sound('hit'); await api.shake(200, 2);
      await api.move('ch07_harman', above(MAT(3)));
      api.face('ch07_harman', 'down');
      await api.say('kessie', 'I took money that wasn\'t mine, Doctor. Folks got scared because of me. I\'m sorry for that. I truly am.', { mood: 'sad' });
      await api.say('harman', 'Hm. Proceed.');
      await api.move('ch07_harman', HQ);
      api.face('ch07_harman', 'down');
      await api.think('One by one, every answer gets dissected and punished. Every stumble of tone has a weight attached. When he reaches me, his eyes seem to glint.');

      var sb = await api.minigame('sandbags', {});
      api.set('ch07_sandOutcome', sb.outcome || 'forgiven');
      api.set('ch07_bags', sb.bags || 0);
      if (sb.outcome === 'forgiven') {
        await api.say('harman', 'Enough.');
        await api.say('harman', 'Forgiven.');
        await api.think('For a flicker of a moment, the peace is real. A stillness inside me I haven\'t felt in years. And I almost believe it.');
        if (sb.bags > 0) await api.narrate('Elephant had hesitated over every bag. Then placed each one with something like care. Now Elephant lifts them off the same way.');
        api.approvalAdd(+5);
      } else if (sb.outcome === 'dropped') {
        await api.narrate('Your arms fold. The sand hits the mat with a sound like a body.');
        await api.say('harman', 'Weak flesh. Noted.');
        await api.think('I\'m not last. Annette went down before me. Small mercies, measured in pounds.');
        api.approvalAdd(-5);
      } else {
        await api.say('harman', 'Still standing. Still not sorry enough. We are out of time, Miss Bartley. You are not out of guilt.');
      }
      if ((sb.performative || 0) > 0) { api.approvalAdd(+(sb.performative)); await api.think('The audience ate up the tears, though. They always do. Even the fake ones. Especially the fake ones.'); }
      if ((sb.defensive || 0) > 1) api.approvalAdd(-2);

      // Delphin, then Annette's fall
      await api.move('ch07_harman', above(MAT(5)));
      api.face('ch07_harman', 'down');
      await api.say('harman', 'Mr. Neutrino. Do you regret it?');
      await api.say('delphin', 'The fire? Every day. The Christmas party wasn\'t supposed to be there. Four people. I count them when I can\'t sleep.', { mood: 'tired' });
      await api.say('harman', 'Better. Not enough.');
      api.sound('hit');
      await api.move('ch07_harman', above(MAT(6)));
      api.face('ch07_harman', 'down');
      await api.say('annette', 'Oh, I\'m sorry as a wet cat, Doctor. Sorrier every minute these arms stay up.', { mood: 'happy' });
      await api.say('harman', 'Not sorry enough.');
      api.sound('hit'); await api.wait(300);
      api.sound('hit'); await api.wait(300);
      await api.narrate('Annette lasts longer than anyone expected. But her arms tremble early, and when the third weight lands, her knees buckle.');
      api.sound('hit'); await api.shake(500, 3);
      await api.emote('ch07_annette', '!', 600);
      api.face('ch07_annette', 'down');
      await api.narrate('She hits the mat with a soft grunt.');
      await api.say('harman', 'Disqualified.');
      await api.narrate('It ends with sobs and silence. Kessie stands through all of it, elbows soft, eyes closed.');
      await api.say('harman', 'Mrs. Burgington. Forgiven. The rest of you... adequate.');

      // Wheels
      await api.move('ch07_harman', mark(SB, 'harman', [11, 5]));
      await api.move('ch07_trader', [MAT(4)[0] + 1, MAT(4)[1] - 2]);
      api.face('ch07_trader', 'down');
      api.lowerThird('KESSIE', 'Winner • Competition 2', 3000);
      await api.say('trader', 'Kessie! Our winner! Immune from Friday\'s private vote, and she gets a spin on the reward wheel!', { mood: 'happy' });
      await api.minigame('wheel', { title: 'THE REWARD WHEEL', spinner: 'Kessie', land: 0,
        wedges: ['Call a Loved One', 'Steak Dinner', 'Hot Bath', 'Letter Home', 'Extra Sleep', 'Spa Hour'],
        colors: ['#3fc1c9', '#1a2a3a', '#f2b33d', '#2a1a3a', '#b6f24a', '#1a3a2a'] });
      await api.say('trader', 'A phone call to the one you love most! Who will it be, Kessie?', { mood: 'happy' });
      await api.say('kessie', 'No one for me to call, hun. Give it to somebody who has somebody.', { mood: 'sad' });
      await api.think('She answered too quickly. Kessie always answers too quickly.');
      await api.say('trader', 'Ah, Annette. So close. But the body betrays where the heart perseveres.', { mood: 'sad' });
      await api.say('annette', 'You want a cookie for that line or are you just practicing for your next funeral gig?', { mood: 'smug' });
      await api.say('trader', 'Spin the wheel.', { mood: 'smug' });
      await api.narrate('Hippo wheels out a garish red wheel. Annette gives it a crank like she\'s starting a broken blender.');
      await api.minigame('wheel', { title: 'THE PUNISHMENT WHEEL', spinner: 'Annette', land: 4,
        wedges: ['Sleep Deprivation', 'Public Shaming', 'Solitary', 'Cold Shower', 'No Food – 24 Hours', 'Verbal Flagellation'] });
      await api.say('annette', 'Well. Guess it\'s water for dinner.', { mood: 'tired' });
      await api.say('trader', 'Let this be a reminder to everyone watching: redemption requires more than words. It demands weight.', { mood: 'smug' });
      await api.think('Annette goes straight to Friday\'s public vote. The lights dim. The silence that follows feels heavier than any sandbag.');
      api.onAir(false);
      api.approval(false);
      api.unlockPlayer();

      /* ===============================================================
       * 2. Monday night: the ranking, Carol's ruckus, the Luxury Room
       * ============================================================= */
      await api.fadeOut(600);
      await api.goRoom(R.lunaRoom, { at: spawn(R.lunaRoom, 'from_bedroom_hall', [4, 8]), facing: 'up', fade: false });
      await api.fadeIn(600);
      var aud = api.approval();
      var lunaTop = aud >= 60 && !api.get('f_luxury_used', false);
      api.set('ch07_lunaTop', lunaTop);
      api.onInteract('window', [{ think: 'The garden. Pink blossoms in January, lit up like a postcard nobody will ever send.' }, { set: { ch07_lookedRoom: true } }]);
      api.onInteract('tablet', [{ think: 'The tablet won\'t turn off. Tonight\'s "curated memory" is a stock photo of a girl on a swing. She isn\'t Waverly. She isn\'t even close.' }]);
      await api.think('Room No. 3. Pink comforter. Sheets too cold. The Eye in the smoke detector.');
      await api.until(function (f) { return f.ch07_lookedRoom; }, { objective: 'Look out of the window', target: 'window' });
      api.objective(null);
      api.sound('alarm');
      await api.narrate('Your watch buzzes against your wrist. The nightly ranking.');
      var lunaPos = lunaTop ? 1 : aud >= 50 ? 2 : aud >= 35 ? 4 : 5;
      var order = lunaTop ? ['LUNA', 'DELPHIN', 'CAROL', 'KESSIE', 'ISAIAH', 'ANNETTE']
        : lunaPos === 2 ? ['DELPHIN', 'LUNA', 'CAROL', 'KESSIE', 'ISAIAH', 'ANNETTE']
        : lunaPos === 4 ? ['DELPHIN', 'CAROL', 'KESSIE', 'LUNA', 'ISAIAH', 'ANNETTE']
        : ['DELPHIN', 'CAROL', 'KESSIE', 'ISAIAH', 'LUNA', 'ANNETTE'];
      await api.slides([{ style: 'screen', title: 'NIGHTLY RANKING • MON 15 JAN', text: order.map(function (n, i) { return (i + 1) + '. ' + n + (i === 0 ? '   * LUXURY ROOM' : ''); }).join('\n') + '\n\nCumulative audience points. Your approval: ' + Math.round(aud) + '.' }]);
      if (lunaTop) await api.think('Number one. Me. The Luxury Room. The only room in the House without a camera.');
      else await api.think('Delphin. Number one. Carol has held that spot since the first night. This is going to be loud.');

      // Carol's ruckus outside the Luxury Room
      var LUXD = spawn(R.bedHall, 'from_luxury_room', [35, 4]);
      api.addNpc({ id: 'ch07_rk_carol', spec: 'carol', at: LUXD, facing: 'down' }, R.bedHall);
      api.addNpc({ id: 'ch07_rk_delphin', spec: 'delphin', at: lunaTop ? [LUXD[0] - 3, LUXD[1] - 1] : [LUXD[0] + 1, LUXD[1]], facing: 'left' }, R.bedHall);
      api.addNpc({ id: 'ch07_rk_ginerva', spec: 'ginerva', at: [LUXD[0] + 2, LUXD[1] - 2], facing: 'left' }, R.bedHall);
      api.objective('Something is crashing in the hall. Go and see.', { target: 'to_bedroom_hall' });
      await api.waitForRoom(R.bedHall);
      api.objective(null);
      api.lockPlayer();
      api.sound('hit'); await api.shake(300, 2);
      await api.say('carol', 'That\'s MY room! I was number one! I\'ve been number one since the first night!', { mood: 'angry' });
      await api.movePlayer([LUXD[0] - 4, LUXD[1] - 2]);
      api.face('player', 'right');
      if (lunaTop) {
        api.face('ch07_rk_carol', 'player');
        await api.say('carol', api.get('f_helped_waiter', false) ? 'YOU? They picked Saint Kneels-for-the-Help over me? What did you do, cry on cue?' : 'YOU? What did you do, cry on cue?', { mood: 'angry' });
        await api.say('ginerva', 'Miss Daughtery. The ranking is the will of the audience. Lower your voice, or I shall lower it for you.');
        var c1 = await api.choice(['"It\'s one night, Carol."', '"Take it up with the audience."', '(Say nothing. Wait her out.)']);
        if (c1 === 0) await api.say('carol', 'One night is all it takes in here! You don\'t get it! Nobody gets it!', { mood: 'cry' });
        else if (c1 === 1) { api.approvalAdd(+2); await api.say('carol', 'I AM the audience\'s! I was theirs first!', { mood: 'angry' }); }
        else await api.think('It doesn\'t sound like anger. It sounds like a kid who\'s been put in the closet.');
      } else {
        await api.say('delphin', 'Sleep tight, blondie. I\'ll describe the pillows to you tomorrow. In great detail.', { mood: 'smug' });
        api.sound('hit');
        await api.narrate('Carol pounds the Luxury Room door with both fists until her nails crack.');
        await api.say('ginerva', 'Miss Daughtery. The ranking is the will of the audience. Lower your voice, or I shall lower it for you.');
        var c2 = await api.choice(['"Carol. Go to bed. It\'s one night."', '"Delphin, stop poking her."', '(Stay out of it.)']);
        if (c2 === 0) await api.say('carol', 'Don\'t you DARE pity me. One night is all it takes in here!', { mood: 'cry' });
        else if (c2 === 1) { await api.say('delphin', 'Fine, fine. Poking suspended. Pending review.', { mood: 'smug' }); api.add('m_delphin', 1); }
        else await api.think('Insecurity behind every outburst. I know the shape of it. I grew up surrounded by it.');
      }
      api.sound('hit');
      await api.narrate('Ginerva\'s ruler cracks against the wall. Carol flinches and goes, mascara running, to No. 2.');
      await api.move('ch07_rk_carol', spawn(R.bedHall, 'from_carol_room', [11, 4]));
      api.remove('ch07_rk_carol', R.bedHall);
      api.remove('ch07_rk_ginerva', R.bedHall);
      if (!lunaTop) await api.narrate('Delphin gives you a two-finger salute and shuts the Luxury Room door behind him.');
      else await api.narrate('Delphin grins, mouths "Number one, red," and slopes off to No. 6.');
      api.remove('ch07_rk_delphin', R.bedHall);
      api.unlockPlayer();

      if (lunaTop) {
        api.onInteract('lux_bed', async function (api) {
          await api.narrate('The bed swallows you. Real down. Warm sheets. No Eye in the smoke detector. No smoke detector at all.');
          await api.think('Nobody is watching. Nobody is watching.');
          await api.think('And then it comes, all at once, like a dam.');
          await api.narrate('For the first time since the white room, you cry properly. Loud, ugly, hiccuping, the kind of crying you can\'t do with a lens on you.');
          await api.think('John\'s applause. The sandbags. The little girl who never existed. Waverly\'s hand-me-down sweater. Momma.');
          var cx = await api.choice(['(Say her name out loud.)', '(Just cry until there\'s nothing left.)']);
          if (cx === 0) await api.say('luna', 'Waverly. Mommy\'s coming. I promise. I promise, baby.', { mood: 'cry' });
          else await api.think('Nothing left. Then a little more. Then sleep.');
          api.set('ch07_luxDone', true);
        });
        api.objective('Go to the Luxury Room', { target: 'to_luxury_room' });
        await api.waitForRoom(R.luxury);
        api.objective(null);
        api.set('f_luxury_used', true);
        api.ambient(null);
        await api.think('No dot. No lens. I check the corners twice. Then the lamp. Then under the bed.');
        await api.until(function (f) { return f.ch07_luxDone; }, { objective: 'Lie down on the bed', target: 'lux_bed' });
        api.objective(null);
      } else {
        api.objective('Go back to your room and sleep', { target: 'to_luna_room' });
        await api.waitForRoom(R.lunaRoom);
        api.objective(null);
        await api.think('A lullaby at midnight through the speakers. Delphin is sleeping in the only room where nobody is watching. Good for him. Somebody should.');
      }

      /* ===============================================================
       * 3. Wednesday: the sabotage
       * ============================================================= */
      await api.fadeOut(700);
      await api.titleCard('Wednesday', 'Three days after John', 2200, { kicker: 'WEEK 2 • 17 JAN' });
      await api.goRoom(R.kitchen, { at: [3, 5], facing: 'up', fade: false });
      await api.fadeIn(700);
      await api.think('Carol has been degrading fast since John. She screams at Annette to get away from her, even when Annette is nowhere near. It\'s hard to watch.');
      await api.think('I read the Falsville book every day. The magical pixie forest. As long as I can go on an adventure there, I can make it through the day.' + (api.get('f_kept_photo', true) ? ' Waverly\'s photo is my bookmark.' : ''));
      api.sound('alarm');
      await api.narrate('A scream. From the lounge. It sounds like Isaiah.');
      await api.think('I drop the book on the island and run.');
      api.addNpc({ id: 'ch07_l_isaiah', spec: 'isaiah', at: [1, 7], facing: 'right' }, R.lounge);
      api.objective('Find Isaiah (the lounge, off the Red Hall)', { target: 'to_red_hall' });
      await api.waitForRoom(R.lounge);
      api.objective(null);
      api.lockPlayer();
      await api.narrate('Isaiah is crouched in the corner, shaking, hands over his eyes. Without a word he lifts one hand and points at the far wall.');
      await api.pan([6, 1], 900);
      api.sound('sting');
      await api.narrate('A beautiful boy with his hair in a tight bun, his mouth open in an expression of extreme pain. Drawn across the dead wall screen in something red and sticky.');
      await api.cameraReset(600);
      api.unlockPlayer();
      await api.waitForInteract('ch07_l_isaiah', { objective: 'Go to Isaiah' });
      api.lockPlayer();
      await api.say('isaiah', 'It\'s Joe. It\'s... that\'s Joe.', { mood: 'cry' });
      await api.say('luna', 'Who would have done something like this? Does anyone here even know what Joe looks like?');
      await api.say('isaiah', 'I had a picture in my room. I couldn\'t find it last night but I thought I must have left it in a book or something.', { mood: 'cry' });
      var cI = await api.choice([
        '(Kneel. Put yourself between him and the wall.) "Don\'t look at it. Look at me."',
        '"Breathe, Isaiah. Tell me a fact. Any fact."',
        '"It\'s the producers. It\'s what they do. Get up before the cameras get more."'
      ]);
      if (cI === 0) {
        api.add('m_isaiah', 10);
        await api.say('isaiah', 'Okay. Okay. You have freckles. Did you know freckles are clusters of melanin? Sorry. Sorry.', { mood: 'sad' });
        await api.think('Something about this kid screams vulnerable and sets off every protective instinct I have.');
      } else if (cI === 1) {
        api.add('m_isaiah', 10);
        await api.say('isaiah', 'H-honey never spoils. They found it in the pyramids. Three thousand years. Still... still good.', { mood: 'sad' });
        await api.say('luna', 'Still good. Like you. Come on.');
      } else {
        api.add('m_isaiah', 2);
        await api.say('isaiah', 'R-right. Right. Cameras.', { mood: 'fear' });
        await api.think('Too hard. He flinched from me like I was the wall.');
      }
      api.addNpc({ id: 'ch07_l_kessie', spec: 'kessie', at: [5, 7], facing: 'up' }, R.lounge);
      api.addObject({ id: 'ch07_l_bucket', at: [4, 7], draw: PROPS.bucket, solid: true }, R.lounge);
      await api.say('kessie', 'Oh, sweet Lord. Go on, hun, take him upstairs. I\'ll get this off the wall. Soap gets out anything if you\'re mean enough with it.', { mood: 'sad' });
      await api.fadeOut(500);
      api.set('ch07_wallClean', true);
      api.remove('ch07_joe', R.lounge);
      api.remove('ch07_l_isaiah', R.lounge);
      api.remove('ch07_l_kessie', R.lounge);
      api.remove('ch07_l_bucket', R.lounge);
      await api.narrate('You lead Isaiah to his room and hold his hand until he cries himself to sleep.');
      await api.goRoom(R.bedHall, { at: spawn(R.bedHall, 'from_isaiah_room', [24, 1]), facing: 'down', fade: false });
      await api.fadeIn(500);
      api.unlockPlayer();
      await api.think('Exhausted. Physically, emotionally. I need my book.');

      // Light investigation: clues are optional; the kitchen ends it.
      api.onInteract('ch07_yarn', async function (api) {
        api.set('ch07_clueYarn', true);
        await api.narrate('Snagged on a splinter of Isaiah\'s door frame: a single strand of lavender yarn.');
        await api.think('Lavender. Annette\'s cardigan is lavender. Half the knitting in this House is lavender. It means nothing.');
        await api.think('I feel a twinge of suspicion. I force it down.');
        api.remove('ch07_yarn', R.bedHall);
      });
      api.onInteract('ch07_compact', async function (api) {
        api.set('ch07_clueCompact', true);
        await api.narrate('Wedged by the couch: Carol\'s pink compact. Flecks of red, dry, in the hinge.');
        await api.think('Carol\'s. Obviously Carol\'s. Left exactly where someone would find it.');
        await api.think('Carol never leaves that compact anywhere. She sleeps with it.');
        api.remove('ch07_compact', R.lounge);
      });
      api.addNpc({ id: 'ch07_k_delphin', spec: 'delphin', at: [1, 5], facing: 'up' }, R.kitchen);
      api.addNpc({ id: 'ch07_k_annette', spec: 'annette', at: [3, 5], facing: 'up' }, R.kitchen);
      api.addNpc({ id: 'ch07_k_carol', spec: 'carol', at: [4, 2], facing: 'up' }, R.kitchen);
      api.addObject({ id: 'ch07_book', at: [3, 4], draw: PROPS.shreddedbook, solid: true, layer: 1 }, R.kitchen);
      api.objective('Get your book from the kitchen (look around on the way, if you like)', { target: 'to_kitchen' });
      await api.waitForRoom(R.kitchen);
      api.objective(null);
      api.lockPlayer();
      await api.narrate('Delphin and Annette stand in front of the island, murmuring. Carol is at the stove, humming to herself, frying bread.');
      api.face('ch07_k_delphin', 'player'); api.face('ch07_k_annette', 'player');
      await api.say('delphin', 'Stop. You don\'t want to see this.', { mood: 'sad' });
      await api.say('annette', 'He\'s right, girl. Go back to your room. Spare yourself the pain.', { mood: 'sad' });
      await api.choice(['(Push past them.)']);
      await api.move('ch07_k_annette', [2, 5]);
      await api.movePlayer([3, 5]);
      api.face('player', 'up');
      api.sound('sting');
      await api.narrate('The book. My book. Pages torn out and scribbled over. Every character\'s eyes gouged out, their smiles ruby red with amateur fangs.');
      if (api.get('f_kept_photo', true)) {
        await api.narrate('And the bookmark. Waverly\'s photo. Torn clean in two: her face on one half, her hand on the other.');
        api.add('m_waverly', -5);
        api.set('ch07_photoTorn', true);
        await api.think('It\'s just paper. It\'s just paper. It\'s the only paper I have.');
      }
      api.face('ch07_k_carol', 'down');
      await api.say('carol', 'I told you so. Told ya, told ya, told ya.', { mood: 'smug' });
      await api.narrate('Manic laughter bubbles out of her. She doubles over with it.');
      var cL = await api.choice(['(Lunge at her.)', '(Hold still. Grip the island until it hurts.)']);
      if (cL === 0) { await api.shake(400, 3); await api.narrate('Delphin grabs you under the arms a fraction of a second before you get there.'); }
      else await api.narrate('Your nails bite the marble. Delphin steps in close anyway, ready.');
      await api.say('delphin', 'She\'s not worth it. Think about what they\'ll do to you.', { mood: 'angry' });
      await api.say('annette', 'She\'s a cold one, alright. She\'ll dull your flames if you let her. Burn bright with me, girl. You don\'t need to take revenge. She\'ll be done at the end of the week.');
      await api.say('carol', 'You think I did this. It wasn\'t me. It was her! Why do you all keep believing her over me?', { mood: 'angry' });
      await api.say('delphin', 'Uh, I don\'t know, Carol. Maybe because you\'ve literally been a bitch the entire time we\'ve known you.', { mood: 'smug' });
      await api.say('carol', 'Why are you doing this to me?', { mood: 'cry' });
      await api.say('annette', 'I pity you for being such a confused soul.', { mood: 'sad' });
      api.sound('hit'); await api.shake(300, 3);
      await api.narrate('Before anyone can react, Annette is on the floor and Carol is standing over her with her arms outstretched.');
      var cA = await api.choice([
        { text: '(Help Annette up.) "That was out of bounds. You should tell Trader."' },
        { text: '"Carol. Did you draw Joe? Your compact had red in it."', if: 'ch07_clueCompact' },
        { text: '"Annette... there was lavender yarn on Isaiah\'s door."', if: 'ch07_clueYarn' }
      ]);
      if (cA === 1) {
        await api.say('carol', 'NO! Somebody stole my compact two days ago! Nobody listens!', { mood: 'cry' });
        await api.think('She sounds like she means it. Carol always sounds like she means it.');
      } else if (cA === 2) {
        await api.say('annette', 'Lavender, dear? Half the yarn in this House is lavender. I gave Isaiah a scarf. Help me up now, there\'s a good girl.', { mood: 'sad' });
        await api.think('Of course. Look at her. Four foot nine and on the floor. I push the thought away so hard it leaves a mark.');
        api.add('m_annette', -2);
      } else {
        api.add('m_annette', 3);
      }
      await api.say('carol', 'Oh, please. I barely touched her.', { mood: 'smug' });
      await api.narrate('You haul Annette up and hand her the cane.');
      await api.say('annette', 'Stay away from me. Don\'t make me whoop you one like your momma obviously should have.', { mood: 'angry' });
      await api.say('carol', 'You don\'t know nothing about my momma.', { mood: 'angry' });
      await api.say('luna', 'Enough. Haven\'t you hurt enough people today? Just get out of here. GO!', { mood: 'angry' });
      await api.say('carol', 'It\'s not my fault.', { mood: 'cry' });
      await api.move('ch07_k_carol', spawn(R.kitchen, 'from_red_hall', [5, 1]));
      api.remove('ch07_k_carol', R.kitchen);
      api.sound('door');
      await api.say('delphin', 'She was bad before but now she\'s actually gotten worse. I didn\'t know that was possible.', { mood: 'tired' });
      await api.say('luna', 'She\'s got to go.');
      await api.say('delphin', 'I can\'t disagree with you there, buddy.');
      if (api.get('ch07_clueYarn') || api.get('ch07_clueCompact')) await api.think('Lavender thread. A compact Carol never puts down. I fold the thoughts up small and put them somewhere I won\'t look.');
      await api.think('Delphin and I, an alliance forged in the fires of doom, will be voting for Carol again. Maybe this time it will stick.');
      api.unlockPlayer();

      /* ===============================================================
       * 4. Friday: the Doll Room. The Judge.
       * ============================================================= */
      await api.fadeOut(800);
      api.set('ch07_friday', true);
      await api.titleCard('Friday', 'The second private vote', 2200, { kicker: 'WEEK 2 • 19 JAN' });
      var DOOR = spawn(DL, 'from_service_stair', [3, 12]);
      var TR = [8, 2];
      [['ch07_d_kessie', 'kessie', mark(DL, 'chair_1', [7, 3]), 'down'], ['ch07_d_delphin', 'delphin', mark(DL, 'chair_7', [4, 7]), 'right'],
        ['ch07_d_isaiah', 'isaiah', mark(DL, 'chair_5', [10, 9]), 'up'], ['ch07_d_carol', 'carol', mark(DL, 'chair_3', [12, 5]), 'left'],
        ['ch07_d_annette', 'annette', mark(DL, 'chair_4', [12, 7]), 'left'], ['ch07_d_trader', 'trader', TR, 'down'],
        ['ch07_d_don', 'tb_dog', [14, 11], 'up'], ['ch07_d_stephy', 'tb_deer', [15, 11], 'up'], ['ch07_d_cam', 'cameraman', [14, 3], 'left']
      ].forEach(function (n) { api.addNpc({ id: n[0], spec: n[1], at: n[2], facing: n[3] }, DL); });
      api.addNpc({ id: 'ch07_d_judge', spec: 'judge', at: DOOR, facing: 'up', visible: false }, DL);
      await api.goRoom(DL, { at: [4, 6], facing: 'right', fade: false });
      await api.fadeIn(800);
      api.onAir(true); api.approval(true);
      api.lockPlayer();
      await api.think('Somebody cleaned up after Carol\'s great doll massacre. Samantha leers from the top shelf, arms open, as if she\'d suffocate me if I stepped into them.');
      await api.think('Trader has been missing from set since Monday. Since the hallway. Is he avoiding us?');
      await api.say('trader', 'Welcome... to the second private vote. Unfortunately, we\'ll be saying goodbye to another of your number today. But know that whoever departs should be proud of all they achieved.', { mood: 'happy' });
      await api.say('trader', 'I can only hope I\'ve done enough to save them from eternal damnation. But as always, only your choices can determine whether or not you shall be redeemed.', { mood: 'sad' });
      await api.say('trader', 'Kessie, as last competition\'s winner, you vote first. Now where are our True Believers...');

      // ---- THE TURN ----
      api.ambient(null);
      api.sound('door');
      await api.wait(500);
      await api.say('trader', 'Ah. There you are -');
      api.show('ch07_d_judge');
      await api.pan('ch07_d_judge', 1200);
      api.sound('heartbeat');
      await api.wait(700);
      await api.say('trader', 'What are you doing here?', { mood: 'fear' });
      await api.move('ch07_d_judge', [DOOR[0] + 2, DOOR[1] - 3], { speed: 18 });
      api.sound('heartbeat');
      await api.move('ch07_d_judge', [9, 6], { speed: 18 });
      api.sound('heartbeat');
      await api.move('ch07_d_judge', [TR[0] + 1, TR[1]], { speed: 18 });
      api.face('ch07_d_judge', 'left'); api.face('ch07_d_trader', 'right');
      await api.narrate('A deliberate step. A handkerchief tucked into the breast pocket of an immaculate charcoal suit. In the other pocket, a single white lily.');
      await api.slides([
        { style: 'montage', title: 'Last Saturday', text: 'The man who knelt beside John. Who wiped his arm. "They want to see you suffer."' },
        { style: 'montage', title: 'Before all this', text: 'The face on the clinic-lobby television, the night I walked home bleeding.' }
      ]);
      await api.think('Perfectly coiffed brown hair. Side by side with Trader, the resemblance is striking. Trader holds his eyes for one breath. Then he flushes and lowers his head.');
      api.face('ch07_d_trader', 'down');
      await api.think('I\'ve never seen Trader cowed. Not once.');
      api.ambient('drone');
      api.face('ch07_d_judge', 'down');
      await api.say('judge', 'Not to worry. I\'m merely here to observe.', { mood: 'smug' });
      await api.say('judge', 'Aren\'t you going to introduce me to your... compatriots?', { mood: 'smug' });
      await api.say('trader', 'Competitors. This is Judge Johnson.', { mood: 'angry' });
      api.lowerThird('JUDGE SILAS JOHNSON', 'Department of Punitive Entertainment', 4200);
      await api.say('delphin', 'Johnson? You mean like -', { mood: 'shock' });
      await api.say('trader', 'That doesn\'t matter. Let\'s just get back to what we were doing.', { mood: 'angry' });
      await api.move('ch07_d_judge', [10, 1], { speed: 22 });
      api.face('ch07_d_judge', 'down');
      await api.say('judge', 'Do continue.');
      await api.cameraReset(700);
      await api.narrate('He settles beside Samantha, hands folded primly in his lap, and snaps his fingers. Two True Believers glide in from the corner. Trader looks very close to vomiting.');
      await api.move('ch07_d_don', [8, 4]); await api.move('ch07_d_stephy', [6, 4]);
      await api.narrate('Kessie lets them take her by the arms and march her out. Trader stares into thin air.');
      api.hide('ch07_d_kessie');
      await api.narrate('When the True Believers return, the Judge beckons Trader over. You strain your ears and catch only pieces.');
      await api.move('ch07_d_trader', [9, 2]);
      await api.say('Judge (whisper)', 'Why... between... waste...', { portrait: false });
      await api.say('Trader (whisper)', '...traditional... wait...', { portrait: false });
      await api.say('Judge (whisper)', '...stupid... obedience.', { portrait: false });
      await api.move('ch07_d_trader', TR);
      api.face('ch07_d_trader', 'down');
      api.show('ch07_d_kessie');
      await api.say('trader', 'We\'ll be doing things a bit differently this week. The votes will be counted today. The audience has already been informed.', { mood: 'tired' });
      await api.think('Something tells me Trader wasn\'t informed nearly as early as his audience was. And he isn\'t happy about it at all.');
      await api.say('delphin', 'Any idea what\'s going on there?', { mood: 'smug' });
      var cJ = await api.choice(['"Deep tension."', '(Watch the Judge. Memorise him.)', '(Look at Carol. She hasn\'t looked up once.)']);
      if (cJ === 0) await api.say('delphin', 'Deep tension. Red, that\'s the understatement of the century.', { mood: 'smug' });
      else if (cJ === 1) await api.think('His watch is nicer than Trader\'s. He checks it like the room owes him time.');
      else await api.think('Carol is examining her nails, minutely, as if the answer is written on them.');
      await api.narrate('Judge Johnson levels a steely glare at you. Delphin goes. Carol. Then Isaiah. Then Annette. And finally, it\'s your turn.');
      api.onAir(false); api.approval(false);

      /* ===============================================================
       * 5. The blindfold walk + the Columbus closet
       * ============================================================= */
      await api.move('ch07_d_don', [5, 6]);
      await api.move('ch07_d_stephy', [4, 5]);
      api.face('player', 'right');
      await api.say('luna', 'Hey, can we actually not do this? I come from one of the group homes. I\'m not trying to be difficult, I swear. I just don\'t think I can do that.');
      await api.narrate('No response. Stephy grips your arms. Don lifts the blindfold to your head. Little shudders overtake you.');
      api.ambient(null);
      await api.fadeOut(300, '#000');
      await api.minigame('blindfold', { cues: [
        { dir: 'up', text: 'A hand flat between your shoulder blades. Forward.' },
        { dir: 'left', text: 'Pressure on your right shoulder. Turn left.' },
        { dir: 'up', text: 'Footsteps beside you. Two pairs, perfectly in sync.' }
      ] });
      await api.slides([{ style: 'black', text: '"True believer! True believer!"\n\nI\'m eight. New at Columbus. The kids in my section stole my clothes and left me an oversized black hoodie. They spit in my face as I run past.' }]);
      api.setPlayer('luna_child_columbus');
      await api.goRoom(R.closet, { at: spawn(R.closet, 'from_columbus_lounge', [1, 2]), facing: 'down', fade: false });
      await api.fadeIn(600);
      api.ambient('drone');
      api.unlockPlayer();
      await api.think('The closet. Dark, like it was then. The other kids have long since left. No one wanted to be the next target.');
      await api.until(function (f) { return f.ch07_closetDoor; }, { objective: 'Try the door', target: 'ch07_closetdoor' });
      api.objective(null);
      await api.think('He won\'t humiliate me. Whatever small amount of control I can cling to, I will. I\'ll stay strong.');
      api.lockPlayer();
      await api.fadeOut(400, '#000');
      api.setPlayer('luna');
      var bf2 = await api.minigame('blindfold', { panic: 45, cues: [
        { dir: 'up', text: 'The hand returns. Forward. Stairs. You count them anyway.' },
        { dir: 'right', text: 'Fingers on your left arm, steering. Right.' },
        { dir: 'up', text: '"Do you guys practise that walking-together thing you do?" Nothing.' },
        { dir: 'left', text: 'Clenched on your arm, steering you left. Like a horse.' }
      ] });
      api.set('ch07_panic', bf2.panic || 0);

      /* ===============================================================
       * 6. The Confessional
       * ============================================================= */
      await api.goRoom(R.confessional, { at: mark(R.confessional, 'seat', [2, 2]), facing: 'up', fade: false });
      await api.fadeIn(500);
      api.unlockPlayer();
      await api.think('The knot loosens. Light floods back in. Thank goodness. I can breathe again.');
      await api.think('A room not much bigger than the closet from my nightmares. Three walls of the Great Leader. One white wall that smells of fresh paint. A camera buzzing like a wasp in a jar. A box shaped like a toaster.');
      api.onAir(true);
      await api.waitForInteract('ballot_box', { objective: 'Take a ballot slip from the box' });
      api.lockPlayer();
      await api.narrate('A slip. Every name except Kessie\'s (the winner) and Annette\'s (the loser), each beside a tick box printed in elegant black ink.');
      var pv = await api.minigame('vote', {
        title: 'PRIVATE VOTE 2', prompt: 'Name who is NOT serious about redemption',
        candidates: ['carol', 'delphin', 'isaiah'],
        mode: 'eliminate', reveal: false, autoPick: 'carol'
      });
      var pick = pv.choice || 'carol';
      api.set('ch07_lunaVote', pick);
      await api.think('I hold it up to the camera. The slowly blinking red dot makes me think of the monsters in horror movies. You always notice their eyes just as it\'s too late to run.');
      if (pick === 'carol') {
        var cR = await api.choice([
          '"Today, I\'m voting for Carol again. Those of you who have been watching should understand why. She\'s out of control. She needs to be stopped."',
          '"Carol. I\'m not proud of it. I\'m just tired."'
        ]);
        if (cR === 0) api.approvalAdd(+3);
      } else if (pick === 'delphin') {
        await api.choice(['"Delphin. Because everyone else is voting Carol, and somebody should make this look like a contest."']);
        api.add('m_delphin', -5); api.approvalAdd(-2);
        await api.think('A wasted vote dressed up as strategy. He\'ll see it on the replay.');
      } else {
        await api.choice(['"Isaiah. He\'s too fragile for this place. Maybe I\'m sparing him." The words taste like rust.']);
        api.add('m_isaiah', -5); api.approvalAdd(-3);
      }
      await api.think('Was that enough? Probably not. The audience won\'t be satisfied until they\'ve scooped out my insides and left them on the dinner table.');
      await api.say('luna', 'I\'m finished.');
      await api.narrate('Stephy tucks the vote box into a robe with endless pockets. Don lifts the blindfold. You bow your head.');
      await api.fadeOut(400, '#000');
      api.onAir(false);

      /* ===============================================================
       * 7. The same-day count
       * ============================================================= */
      api.placeNpc('ch07_d_don', [2, 11], 'up'); api.placeNpc('ch07_d_stephy', [15, 11], 'up');
      await api.goRoom(DL, { at: [4, 6], facing: 'right', fade: false });
      await api.fadeIn(500);
      api.onAir(true); api.approval(true);
      await api.think('The tension in here got worse while I was gone. Like trying to breathe through a mouthful of mouldy bread.');
      await api.narrate('Stephy brings Trader the box, the votes practically overflowing. He bangs his hand against it. A clang echoes through the room. Everyone, including Trader, jumps.');
      var cQ = await api.choice(['(Raise your hand.) "I thought we didn\'t count until the day after."', '(Keep your head down.)']);
      if (cQ === 0) {
        await api.say('trader', 'We changed it. Any more questions?', { mood: 'angry' });
        await api.think('Maybe it\'s the dangerous glint in his eye. Nobody has more questions.');
      }
      await api.say('judge', 'Is that it?', { mood: 'smug' });
      await api.say('trader', 'What do you mean?');
      await api.say('judge', 'You just read the names, then. No fanfare, no drama, no silly little dances. It\'s no wonder about the ratings.', { mood: 'smug' });
      await api.say('trader', 'If you have any suggestions, I would be happy to take them into account.', { mood: 'angry' });
      await api.say('judge', 'No, go on. But do hurry up. I have important places to be.');
      var seq = countOrder(pick), tally = { carol: 0, delphin: 0, isaiah: 0 }, spoiled = 0;
      var ordinals = ['The first vote', 'Second', 'Third', 'The fourth vote', 'The fifth', 'The sixth and final vote'];
      function tallyText() {
        var parts = ['CAROL ' + tally.carol];
        if (tally.delphin) parts.push('DELPHIN ' + tally.delphin);
        if (tally.isaiah) parts.push('ISAIAH ' + tally.isaiah);
        if (spoiled) parts.push('SPOILED ' + spoiled);
        return parts.join('  •  ');
      }
      var majorityCalled = false;
      for (var vi = 0; vi < seq.length; vi++) {
        var v = seq[vi];
        api.sound('heartbeat');
        if (v === 'SPOILED') {
          spoiled++;
          await api.say('trader', ordinals[vi] + ' is for... Annette. Who is not on the ballot. Spoiled!', { mood: 'smug' });
          await api.think('Carol lets out a small sigh, relieved to hear another name called for once. Then she realises it\'s her own ballot that was thrown out.');
        } else {
          tally[v]++;
          var nm = v.charAt(0).toUpperCase() + v.slice(1);
          var line = ordinals[vi] + ' is for ' + nm + '.';
          if (vi === seq.length - 1) line = 'The sixth and final vote is for... what a surprise, it\'s ' + nm + '.';
          else if (v === 'carol' && tally.carol === 4 && !majorityCalled) { line = 'Another vote for Carol. That\'s four votes and the majority, but I\'ll read the last one just for fun.'; majorityCalled = true; }
          await api.say('trader', line, { mood: 'happy' });
          if (v !== 'carol') await api.emote(v === 'delphin' ? 'ch07_d_delphin' : 'ch07_d_isaiah', '!', 700);
        }
        api.lowerThird('BALLOT COUNT', tallyText());
      }
      api.lowerThird(null);
      await api.narrate('Carol has her hand over her mouth. She sniffs and wipes her nose on her sleeve. Kessie offers a pack of tissues; Carol bats it away.');
      await api.say('trader', 'How\'s it feel, Carol? Second time in a row. ' + (tally.carol === 5 ? 'Every single valid vote was for you.' : 'Nearly everyone here voted for you.') + ' You have no allies left.', { mood: 'smug' });
      await api.say('kessie', 'Isn\'t that enough? No need to kick the girl while she\'s down.', { mood: 'sad' });
      await api.say('carol', 'I don\'t need you defending me. None of you assholes have what it takes to beat me, no matter how many votes you throw. I\'ll always be back.', { mood: 'angry' });
      await api.say('kessie', 'Have it your way.', { mood: 'tired' });
      await api.say('trader', 'Ladies. No catfights. At the end of the day the only thing that matters are the viewers. Half an hour, and then Carol and Annette plead their case to the public. Meanwhile, I\'m greeting some guests.', { mood: 'happy' });
      api.sound('door');
      await api.narrate('About ten men in perfectly tailored suits stream in. They shake Trader\'s hand in turns. None of them offer their names. Then they flock to the Judge and jostle each other to sit beside him.');
      await api.think('Trader watches it with a frown, and hangs back.');
      api.onAir(false); api.approval(false);
      await api.fadeOut(700);

      /* ===============================================================
       * 8. Public vote 2 (the Courtroom). A VOTE TO SAVE.
       * ============================================================= */
      var defL = mark(CT, 'defendant_left', [8, 8]), defR = mark(CT, 'defendant_right', [12, 8]);
      var host = mark(CT, 'host_floor', [10, 5]);
      var seat = function (n, fb) { return mark(CT, 'contestant_' + n, fb); };
      var JUDGE_AT = [5, 15];
      [['ch07_c_trader', 'trader', host, 'down'], ['ch07_c_kessie', 'kessie', seat(1, [17, 4]), 'left'], ['ch07_c_delphin', 'delphin', seat(2, [17, 5]), 'left'],
        ['ch07_c_isaiah', 'isaiah', seat(4, [17, 7]), 'left'], ['ch07_c_carol', 'carol', [14, 14], 'left'], ['ch07_c_annette', 'annette', [13, 14], 'right'],
        ['ch07_c_judge', 'judge', JUDGE_AT, 'up'], ['ch07_c_s1', 'suit', [4, 14], 'up'], ['ch07_c_s2', 'suit2', [6, 14], 'up'], ['ch07_c_s3', 'suit3', [5, 16], 'up'],
        ['ch07_c_s4', 'suit', [3, 14], 'up'], ['ch07_c_s5', 'suit2', [7, 14], 'up'], ['ch07_c_s6', 'suit3', [16, 15], 'up'],
        ['ch07_c_elephant', 'tb_elephant', mark(CT, 'tb_left', [7, 12]), 'up'], ['ch07_c_dog', 'tb_dog', mark(CT, 'tb_right', [13, 12]), 'up']
      ].forEach(function (n) { api.addNpc({ id: n[0], spec: n[1], at: n[2], facing: n[3] }, CT); });
      api.onInteract('ch07_c_kessie', [['kessie', 'Five minutes to talk for your life. Lord. I hope she finds the words, whichever one of them it is.', 'sad']]);
      api.onInteract('ch07_c_isaiah', [['isaiah', 'Statistically, the contestant who speaks second wins sixty-one percent of the time. I made that up. I don\'t know why I made that up.', 'fear']]);
      api.onInteract('ch07_c_delphin', [['delphin', 'Ten suits and a lily. Feels less like a vote and more like a shareholder meeting.', 'smug']]);
      api.onInteract('ch07_c_judge', [{ think: 'His eyes slide over me like I\'m furniture. Then they come back. Slowly.' }]);
      ['ch07_c_s1', 'ch07_c_s2', 'ch07_c_s3', 'ch07_c_s4', 'ch07_c_s5', 'ch07_c_s6'].forEach(function (id, i) {
        api.onInteract(id, [{ narrate: ['The man doesn\'t look at you. He\'s checking an app on a phone thinner than a playing card.', 'A signet ring. No name tag. He smells of a cologne that costs more than Waverly\'s school year.', 'He laughs at something the Judge didn\'t say.'][i % 3] }]);
      });
      HOLO.lv = '—'; HOLO.rv = '—';
      await api.goRoom(CT, { at: spawn(CT, 'from_red_hall', [1, 9]), facing: 'right', fade: false });
      await api.fadeIn(700);
      api.unlockPlayer();
      await api.think('The gym dressed as a courtroom again. Mannequin jurors in clown paint. The Cage at the end of the red carpet. The men in suits fill the front of the bleachers around the Judge.');
      await api.narrate('By the bleachers, Annette has toddled over to Carol and plopped down beside her. They talk softly. Carol\'s head comes up, slowly.');
      await api.waitForInteract('ch07_c_annette', { objective: 'Half an hour. Look around, or check on Carol and Annette.' });
      api.lockPlayer();
      await api.say('annette', 'Perhaps the girl has regrets after all. Just offering her an old lady\'s perspective, dear. Go on now. Shoo.', { mood: 'happy' });
      api.face('ch07_c_carol', 'player');
      await api.emote('ch07_c_carol', '!', 800);
      await api.think('When Carol pushes herself to her feet, the fight is back in her eyes. She\'s almost vibrating with rage.');
      api.sound('applause');
      await api.say('trader', 'Places, everyone! We are LIVE!', { mood: 'happy' });
      await api.movePlayer(seat(3, [17, 6]));
      api.face('player', 'left');
      await api.move('ch07_c_carol', defL);
      await api.move('ch07_c_annette', defR);
      api.face('ch07_c_carol', 'down'); api.face('ch07_c_annette', 'down');
      api.onAir(true); api.approval(true);
      api.lowerThird('PUBLIC VOTE 2', 'Carol Daughtery vs Annette Dunphy • LIVE');
      await api.say('trader', 'Annette and Carol. The reason we\'re here is because justice must be served. Today, the people will decide which of you have shown capable of repentance, and which will be judged unforgiven and cast into the depths of hell.', { mood: 'happy' });
      await api.say('trader', 'Carol, as the loser of the private vote, you may go first. Speak to the audience. Convince them why you deserve to live.');
      api.lowerThird('CAROL DAUGHTERY', 'Three counts, armed robbery • 5 minutes');
      await api.say('carol', 'I don\'t get why everyone hates me. I\'m not doing anything most people wouldn\'t do. It\'s life or death, and I\'m being judged for choosing life.', { mood: 'angry' });
      await api.narrate('Annette snorts softly, chin on her cane, eyes closed, smiling like she\'s savouring a private joke.');
      await api.say('carol', 'Everyone here thinks she\'s so innocent. They\'ve all fallen for the sweet grandmother act. You all see everything that happens, right? I wasn\'t the one to draw that picture. I didn\'t rip up that book. It was all her.', { mood: 'angry' });
      await api.say('carol', 'She hates me, don\'t you see? She\'s crazy but she makes me seem crazy. She\'s just like my mom. No one believes me. You believe me, right? Please believe me. I don\'t want to die.', { mood: 'cry' });
      await api.say('carol', 'I have a sister. She needs me. Please let me go. I\'ll do better, I swear. I\'m sorry, I really am. I just want to go home.', { mood: 'cry' });
      await api.think('She was such a proud woman when we started. This place has ripped her apart and rebuilt her as something broken. It\'s like looking into a mirror that shows my own future if I\'m not careful.');
      await api.move('ch07_c_trader', [defL[0] + 1, defL[1] - 1]);
      await api.narrate('Trader steps forward and wraps Carol in his arms. She buries her face in his chest. His white shirt grows damp. He whispers something that only makes her cry harder.');
      await api.say('trader', 'Thank you, Carol. I can definitely tell you\'re feeling a lot of regret. It\'s been a pleasure to watch you grow. Unfortunately, your time is up.', { mood: 'sad' });
      await api.narrate('A cough from the bleachers. The Judge. Trader looks nervously at his watch, and moves on.');
      await api.move('ch07_c_trader', host);
      api.face('ch07_c_trader', 'down');
      api.lowerThird('ANNETTE DUNPHY', 'First public vote • 5 minutes');
      await api.say('annette', 'Thass better. Wouldn\'t want any distractions when talking to you fine people, now would I? Me body ain\'t as rubbery as it used to be.', { mood: 'happy' });
      api.sound('applause');
      await api.say('annette', 'First of all, you all need to forgive that there girl. It ain\'t her fault she\'s distressed. I still want you to vote for me though. Can\'t be helping that one. Livin\'s just something I like to do.', { mood: 'happy' });
      await api.say('annette', 'You wanna watch more bimbo bullying? Go visit anywhere with more than one twelve-year-old in a room. You wanna watch a mystery with an old lady who keeps ye on your toes and twists and turns? That\'s entertainment. That\'s why ye all voting for me.', { mood: 'smug' });
      api.lowerThird(null);
      await api.say('delphin', 'Brutal, huh? Didn\'t know the old lady had it in her. Who do you think will win?', { mood: 'smug' });
      var cW = await api.choice(['"I\'d rather keep Annette than Carol, any day."', '"Carol. The viewers love her drama."', '"I don\'t know. I don\'t want to know."']);
      if (cW === 0) await api.say('delphin', 'My vote\'s on blondie. She\'s like a fly, you know? No matter how many times we swat at her, she keeps buzzing. She might just win this whole thing.', { mood: 'smug' });
      else if (cW === 1) await api.say('delphin', 'Right? She\'s like a fly. No matter how many times we swat at her, she keeps buzzing.', { mood: 'smug' });
      else await api.say('delphin', 'Fair. My money\'s on blondie anyway. She\'s like a fly.', { mood: 'tired' });
      await api.think('It\'s amazing how fast we\'ve learned to talk about each other\'s deaths. An eavesdropper would think we were picking who goes on a luxury vacation.');
      await api.say('trader', 'Ladies and gentlemen, pull up your apps. One tap. SAVE. On your marks, get set... vote!', { mood: 'happy' });
      await api.narrate('The suited men all draw phones straight out of a rich-men\'s catalogue. Judge Johnson stays perfectly still.');
      var sv = await api.minigame('savecount', {
        title: 'PUBLIC VOTE 2 • VOTE TO SAVE', seconds: 11,
        left: { id: 'carol', name: 'Carol', final: 61204, curve: 1.6 },
        right: { id: 'annette', name: 'Annette', final: 348977, curve: 0.55 }
      });
      HOLO.lv = '61,204'; HOLO.rv = '348,977';
      api.set('ch07_publicSaved', sv.saved || 'annette');
      api.sound('sting');
      await api.say('delphin', 'Guess I was wrong.', { mood: 'tired' });
      await api.narrate('Carol doesn\'t put up a fight. She seems more shocked than anything. Elephant takes her dainty wrist. Dog puts a hand on the small of her back. Together they drag-shove her down the red carpet to the Cage.');
      var CAGE = mark(CT, 'cage', [10, 13]);
      await api.move('ch07_c_elephant', [CAGE[0] - 1, CAGE[1] - 1]);
      await api.move('ch07_c_dog', [CAGE[0] + 1, CAGE[1] - 1]);
      await api.move('ch07_c_carol', [CAGE[0], CAGE[1] - 1]);
      api.face('ch07_c_carol', 'up');
      await api.say('carol', 'No. Please, no.', { mood: 'cry' });

      /* ===============================================================
       * 9. The wave goodbye
       * ============================================================= */
      await api.say('trader', 'Everyone wave goodbye to Carol.', { mood: 'smug' });
      await api.think('We stare at him like he\'s grown a second head. Does he really expect us to take part in something so disgusting?');
      await api.say('trader', 'Do it.', { mood: 'angry' });
      await api.say('kessie', 'Best not provoke him. Goodbye, Carol. I hope you find peace, hun.', { mood: 'sad' });
      await api.say('delphin', 'You\'re one tough chick. You\'ll be okay, I can tell.', { mood: 'sad' });
      await api.say('isaiah', 'I\'m sorry. I wish it didn\'t have to be like this. No one should have to die.', { mood: 'cry' });
      await api.say('annette', 'You was a worthy opponent. Not many could match wits with me like this.', { mood: 'happy' });
      await api.think('Everyone looks at me, hands still dancing their solemn goodbyes.');
      var cG = await api.choice([
        '(Raise your hand.) "You were a pain, but you don\'t deserve this... No one deserves this."',
        '(Wave.) "Goodbye, Carol."',
        '(Keep your hands at your sides. Stare at Trader.)'
      ]);
      if (cG === 0) {
        await api.say('luna', 'You were a pain, but you don\'t deserve this.', { mood: 'sad' });
        await api.say('luna', 'No one deserves this.', { mood: 'angry' });
        api.approvalAdd(+5);
        await api.think('Trader looks taken aback by how powerful a moment his taunt has made.');
      } else if (cG === 1) {
        await api.say('luna', 'Goodbye, Carol.', { mood: 'sad' });
      } else {
        api.approvalAdd(-3);
        await api.think('He can make me watch. He can\'t make me wave.');
      }
      api.ambient(null);
      await api.say('judge', 'That\'s enough.', { mood: 'angry' });
      await api.narrate('The Judge rises. The men around him scatter as he walks straight through them, as if he expects them to part.');
      await api.move('ch07_c_judge', [host[0] + 1, host[1] + 1], { speed: 30 });
      api.face('ch07_c_judge', 'up'); api.face('ch07_c_trader', 'down');
      api.ambient('drone');
      await api.say('judge', 'How can you allow such disrespect?', { mood: 'angry' });
      await api.say('trader', 'And just what would you have me do? This is good television. Dramatic, emotional, touching.');
      await api.say('judge', 'Sanction them. Show these criminals that you mean business.', { mood: 'angry' });
      await api.say('trader', 'Oh, they\'re aware. I see no need to punish them for complying with my instructions.');
      await api.narrate('The Judge grabs Trader\'s arm and squeezes until it turns white. Trader shows no reaction. He just stares steadily into his father\'s eyes.');
      api.sound('heartbeat'); await api.wait(600); api.sound('heartbeat');
      await api.say('judge', 'So this is how it is. Are you certain this is the choice you want to make?', { mood: 'smug' });
      await api.say('trader', 'I have no idea what you\'re talking about.');
      await api.say('judge', 'Very well then.');
      await api.move('ch07_c_judge', spawn(CT, 'from_red_hall', [1, 9]), { speed: 34 });
      api.hide('ch07_c_judge');
      api.sound('door');
      await api.narrate('Trader takes a few deep breaths. He leans against the bench and rests his head in his hands.');
      await api.say('trader', 'Take her away.', { mood: 'tired' });
      api.onAir(false); api.approval(false);
      await api.slides([
        { style: 'montage', title: 'Friday night', text: 'They roll the Cage through the door. Carol doesn\'t look up once.' },
        { style: 'montage', title: 'Friday night', text: 'The five of us are left standing in a line, hands flapping uselessly, unwilling or unable to put them down.' }
      ]);
      api.unlockPlayer();
      api.completeChapter();
    }
  });
})();
