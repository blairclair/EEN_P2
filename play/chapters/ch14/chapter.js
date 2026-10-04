/* =========================================================================
 * ch14 "Lie Detector"   (Mon 5 Feb -> Thu 8 Feb night, 2084)
 *
 * Competition 4 in the Doll Room: the lie detector, implemented with the
 * canon rules EXACTLY (CHAPTERS.md ch14). The machine reads BELIEF, not fact.
 * Inside round 10 the player plays Franchesca's last round of "The Last Light"
 * (playable flashback, cut to static). Luna is forced to speak to Trader
 * (non-competitor -> all points void), Trader is dragged out, Luna loses and
 * is confined to her room; Ginerva visits.
 *
 * SCORING (per guesser):           answer LIE  + guess TRUTH -> answerer +2
 *                                  answer LIE  + guess LIE   -> answerer -2, guesser +1
 *                                  answer TRUE + guess TRUTH -> answerer +1, guesser +1
 *                                  answer TRUE + guess LIE   -> guesser -3
 *   Speaking to anyone but a fellow contestant or the Judge (host) voids all
 *   your points. Lowest total -> public vote.
 *   NPC answers and NPC guesses are fixed (CHAPTERS table). The player picks
 *   Luna's answers (R3, R6, R8; R12 is forced: she believes she'd betray anyone
 *   for Waverly, so "Yes" reads LIE) and Luna's guesses (every other round).
 *   The forced question to Trader after R10 zeroes Luna. A brute force of all
 *   4096 player branches shows Luna is strictly last on every path (margin >= 1);
 *   the canon path gives Annette 17 / Isaiah 10 / Luna 1 (or 17/11/-3 when
 *   m_isaiah < 55). The loser is still derived from the scores at runtime.
 *   Every Luna input is an api.choice (option 0 = canon) so ?pick=random
 *   exercises the guarantee; the 'detector' minigame is only the transparent
 *   reveal/scoreboard overlay.
 *
 * CROSS-CHAPTER FLAGS
 *   reads: m_isaiah (>=55 -> Isaiah guesses TRUTH on Luna's final "Yes"),
 *          f_isaiah_reconciled, n_tea_resisted, f_vr_self_sacrifice,
 *          f_mem_penguin_arm, f_note3_decoded, f_kessie_secret_told, m_audience
 *   sets:  m_trader_insight (+1 optional "Look at him", +1 Trader's outburst,
 *          +1 Ginerva's confession; clamped 0-7), f_promised_ginerva,
 *          m_isaiah (small +/- in the game, -20 floor 20 at the fallout),
 *          m_audience
 * LOCAL FLAGS: ch14_*
 * SHARED MAPS: house_doll_room (marks chair_1/5/6, center, judge_throne, trader_stand,
 *   door; patches samantha/window_rain; extras.judgeThrone), house_luna_room (marks
 *   center, door, window_spot; extras.falsvilleBook). Box fallbacks reuse the shared ids.
 * ========================================================================= */
(function () {
  'use strict';

  var H = { doll: 'house_doll_room', luna: 'house_luna_room', arena: 'last_light' };

  /* ---------------------------------------------------------------------
   * SCORING CORE (pure; mirrored by the scratchpad brute-force check)
   * ------------------------------------------------------------------- */
  var NAME = { A: 'Annette', L: 'Luna', I: 'Isaiah' };
  var SPEC = { A: 'annette', L: 'luna', I: 'isaiah' };
  var RULES = [
    'Answer LIE, guess TRUTH: answerer +2',
    'Answer LIE, guess LIE: answerer -2, guesser +1',
    'Answer TRUE, guess TRUTH: answerer +1, guesser +1',
    'Answer TRUE, guess LIE: guesser -3',
    'Speak to anyone but a contestant or the Judge: ALL your points void',
    'Lowest total goes to the public vote'
  ];
  function scoreRound(s, ans, truth, guesses) {
    var after = { A: s.A, L: s.L, I: s.I }, lines = [];
    guesses.forEach(function (q) {
      var d = {}, rule;
      if (!truth && q.g === 'T') { rule = 0; d[ans] = 2; }
      else if (!truth) { rule = 1; d[ans] = -2; d[q.k] = 1; }
      else if (q.g === 'T') { rule = 2; d[ans] = 1; d[q.k] = 1; }
      else { rule = 3; d[q.k] = -3; }
      Object.keys(d).forEach(function (k) { after[k] += d[k]; });
      var parts = Object.keys(d).map(function (k) { return NAME[k] + ' ' + (d[k] > 0 ? '+' : '') + d[k]; });
      lines.push({ k: q.k, g: q.g, rule: rule, d: d,
        text: NAME[q.k] + ' guessed ' + (q.g === 'T' ? 'TRUTH' : 'LIE') + ' on ' + (truth ? 'a truth' : 'a lie') + '  >  ' + parts.join(', ') });
    });
    return { after: after, lines: lines };
  }
  function lowest(s) {
    var ks = ['A', 'L', 'I'].sort(function (a, b) { return s[a] - s[b]; });
    return { k: ks[0], tie: s[ks[0]] === s[ks[1]] };
  }

  /* live state, reset at chapter start */
  var ST = { s: { A: 0, L: 0, I: 0 }, screen: 'idle', hist: [] };

  /* ---------------------------------------------------------------------
   * MAPS
   * ------------------------------------------------------------------- */
  /* Staging positions come from the shared rooms' marks (G.shared.data.marks);
   * the fallbacks are the shared rooms' own coordinates. (constraint: fallback
   * maps reuse the SHARED entity ids so autoplay targets survive either way) */
  var MK = (G.shared && G.shared.data && G.shared.data.marks) || {};
  function mk(map, name, fb) { var m = MK[map] && MK[map][name]; return m ? [m[0], m[1]] : fb; }
  var DOLL_POS = {
    seatA: mk(H.doll, 'chair_1', [7, 3]), seatL: mk(H.doll, 'chair_6', [6, 9]), seatI: mk(H.doll, 'chair_5', [10, 9]),
    console: mk(H.doll, 'center', [8, 6]), screen: [8, 2], samantha: mk(H.doll, 'samantha', [8, 1]),
    throne: mk(H.doll, 'judge_throne', [11, 1]), judge: [12, 2], ginerva: [13, 3],
    trader: mk(H.doll, 'trader_stand', [8, 10]), door: mk(H.doll, 'door', [3, 12]),
    mouse: [5, 10], dog: [11, 10], frog: [6, 2], cart: [14, 5],
    win1: [13, 10], win2: [14, 10], win3: [15, 10]
  };
  var LUNA_POS = { arrive: mk(H.luna, 'center', [4, 5]), door: mk(H.luna, 'door', [4, 8]), window: mk(H.luna, 'window_spot', [4, 1]), plate: [2, 7] };

  /** Minimal box room used only if a shared room is missing (same ids/coords as the shared room). */
  function boxTiles(w, h, door) {
    var rows = [];
    for (var y = 0; y < h; y++) { var r = ''; for (var x = 0; x < w; x++) r += (y === 0 || y === h - 1 || x === 0 || x === w - 1) ? '#' : '.'; rows.push(r); }
    rows[door[1]] = rows[door[1]].slice(0, door[0]) + 'D' + rows[door[1]].slice(door[0] + 1);
    return rows;
  }
  var screenDraw = function (g, x, y, t) {
    var m = ST.screen, c = m === 'truth' ? '#1fae4a' : m === 'lie' ? '#d8202c' : '#203040';
    g.fillStyle = '#0a0c12'; g.fillRect(x - 16, y - 4, 48, 15);
    g.fillStyle = c; g.globalAlpha = m === 'idle' ? 0.6 : (0.75 + 0.25 * Math.sin(t * 6)); g.fillRect(x - 15, y - 3, 46, 13); g.globalAlpha = 1;
    g.fillStyle = '#e8f0f8';
    if (m === 'truth') { g.fillRect(x - 6, y + 2, 28, 3); }
    else if (m === 'lie') { g.fillRect(x - 2, y + 2, 20, 3); }
    else { for (var i = 0; i < 9; i++) g.fillRect(x - 12 + i * 5, y + 3 + Math.round(2 * Math.sin(t * 3 + i)), 3, 1); }
  };
  var consoleDraw = function (g, x, y, t) {
    g.fillStyle = '#2a2c34'; g.fillRect(x + 2, y + 4, 12, 10); g.fillStyle = '#4a4e5a'; g.fillRect(x + 3, y + 5, 10, 3);
    g.fillStyle = (Math.floor(t * 3) % 2) ? '#e8323c' : '#5a1a1a'; g.fillRect(x + 4, y + 10, 2, 2);
    g.fillStyle = '#1fae4a'; g.fillRect(x + 9, y + 10, 2, 2);
    g.strokeStyle = '#1a1a1a'; g.lineWidth = 1; g.beginPath(); g.moveTo(x + 2, y + 8); g.lineTo(x - 18, y + 20); g.moveTo(x + 14, y + 8); g.lineTo(x + 34, y + 20); g.moveTo(x + 8, y + 4); g.lineTo(x + 8, y - 22); g.stroke();
  };
  var cartDraw = function (g, x, y) {
    g.fillStyle = '#5a5e66'; g.fillRect(x + 2, y + 5, 12, 8); g.fillStyle = '#2a2a2a'; g.fillRect(x + 3, y + 13, 2, 2); g.fillRect(x + 11, y + 13, 2, 2);
    g.strokeStyle = '#c84a2a'; g.beginPath(); g.moveTo(x + 4, y + 6); g.quadraticCurveTo(x + 8, y - 2, x + 12, y + 6); g.stroke();
    g.fillStyle = '#9a9a9a'; g.fillRect(x + 6, y + 3, 4, 3);
  };
  var trayDraw = function (g, x, y) { g.fillStyle = '#c9a24a'; g.fillRect(x + 2, y + 8, 12, 2); g.fillStyle = '#e8e4dc'; g.fillRect(x + 4, y + 5, 3, 3); g.fillRect(x + 9, y + 5, 3, 3); };
  var plateDraw = function (g, x, y) { g.fillStyle = '#e8e4dc'; g.fillRect(x + 3, y + 6, 10, 6); g.fillStyle = '#7a4a2a'; g.fillRect(x + 6, y + 8, 4, 2); };

  var LOTTO = {
    lotto_old: { name: 'Lottery Winner', skin: '#f0d8c8', hair: '#d8d8d8', hairStyle: 'bun', outfit: '#5a4a6a', outfit2: '#3a3040', style: 'dress', accessory: 'glasses', height: 'short', voice: 560 },
    lotto_man: { name: 'Lottery Winner', skin: '#c89a78', hair: '#3a2414', hairStyle: 'slick', outfit: '#2a5a8a', outfit2: '#1a2a3a', style: 'suit', accessory: 'tie', voice: 330 },
    lotto_woman: { name: 'Lottery Winner', skin: '#d8b090', hair: '#5a3a2a', hairStyle: 'ponytail', outfit: '#6a5a4a', outfit2: '#3a3430', style: 'coat', build: 'slim', voice: 430 }
  };

  /* --- Doll Room content (talk handlers for the pre-competition free roam) --- */
  var SAMANTHA_EXAMINE = [{ think: 'Samantha. Blood-red palm-leaf hair, icy blue eyes, a gavel in her fist. She\'s the room\'s camera.' }, { think: 'Delphin loved that doll. I think? Sometimes it was hard to tell when he was joking.' }];
  var WINDOW_EXAMINE = [{ think: 'Rain on the window over the parking lot. It\'s always raining in this room.' }];
  function dollExt(P) {
    var X = (G.shared && G.shared.data.upstairs && G.shared.data.upstairs.extras) || {};
    var throne = X.judgeThrone ? Object.assign({}, X.judgeThrone, { examine: [{ think: 'A jeweled throne beside Samantha. Since the checkers game it has belonged to the Judge.' }] })
      : { id: 'judge_throne', at: P.throne, prop: 'up_throne', solid: true, layer: 1, examine: [{ think: 'A jeweled throne beside Samantha.' }] };
    return {
      name: 'The Doll Room',
      ambient: 'tension',
      tint: '#3a0a14', tintAlpha: 0.12,
      npcs: [
        { id: 'ch14_isaiah', spec: 'isaiah', at: P.seatI, facing: 'up', talk: async function (api) {
          if (api.get('f_isaiah_reconciled', true)) {
            await api.say('isaiah', 'They took the Joe photo off my nightstand this morning. "Distracting." I counted the seconds it took me to stop shaking. Forty.', { mood: 'sad' });
            await api.say('luna', 'Whatever they throw at us today, we answer it together.');
            await api.say('isaiah', 'Same team. Until the scoreboard says otherwise.', { mood: 'neutral' });
          } else {
            await api.say('isaiah', 'I am reading. Or I would be, if they had not confiscated the book.', { mood: 'tired' });
          }
        } },
        { id: 'ch14_annette', spec: 'annette', at: P.seatA, facing: 'down', talk: async function (api) {
          if (api.get('f_vr_self_sacrifice', true)) await api.say('annette', 'Our little martyr. Ready to bleed for the cameras again, dear?', { mood: 'smug' });
          else await api.say('annette', 'Sit, dear. You hover like a waitress hoping for a tip.', { mood: 'smug' });
          await api.think('Three of us left. One of them poisoned Kessie with a teacup. The other one I promised to protect.');
        } },
        { id: 'ch14_trader', spec: 'trader', at: P.trader, facing: 'left', turn: false, talk: async function (api) {
          await api.narrate('Trader stands rigid against the wall, hands clasped behind his back, eyes on the floor. When he glances up, his eyes are a wild animal\'s, tracking the Judge.');
          await api.say('trader', '...Not now, Miss Luna. Please.', { mood: 'sad' });
        } },
        { id: 'ch14_ginerva', spec: 'ginerva', at: P.ginerva, facing: 'left', talk: async function (api) {
          await api.say('ginerva', 'Sit down. The True Believers will assist you in preparation. Do not resist their instruction.', { mood: 'angry' });
          await api.say('ginerva', 'Hopefully you all have more sense than a common sea slug, but past performance dictates that I spell it out nonetheless.');
          await api.think('Every few minutes she darts a look at Trader and whips it back before anyone sees. He does the same. Childhood friends, alone together in one room.');
        } },
        { id: 'ch14_judge', spec: 'judge', at: P.judge, facing: 'down', talk: [['judge', 'Your seat, Miss Luna. The nation is waiting to see what you are made of.', 'smug']] },
        { id: 'ch14_mouse', spec: 'tb_mouse', at: P.mouse, facing: 'right', talk: [{ think: 'Tall and reedy, a gold mouse face. Elephant\'s replacement. Whoever picked this one vetted them twice.' }] },
        { id: 'ch14_dog', spec: 'tb_dog', at: P.dog, facing: 'left', talk: [{ think: 'Dog. Familiar, as familiar as a mask can be.' }] },
        { id: 'ch14_frog', spec: 'tb_frog', at: P.frog, facing: 'down', talk: [{ think: 'Frog. The one who gagged Delphin with a glove.' }] },
        { id: 'ch14_win1', spec: LOTTO.lotto_old, at: P.win1, facing: 'up', visible: false, talk: [['ch14_win1', 'I do hope there won\'t be language.', 'neutral']] },
        { id: 'ch14_win2', spec: LOTTO.lotto_man, at: P.win2, facing: 'up', visible: false, talk: [['ch14_win2', 'Seven hours on the bus. Worth every minute!', 'happy']] },
        { id: 'ch14_win3', spec: LOTTO.lotto_woman, at: P.win3, facing: 'up', visible: false, talk: [['ch14_win3', 'Don\'t smile at me.', 'angry']] }
      ],
      objects: [
        throne,
        { id: 'ch14_console', at: P.console, draw: consoleDraw, examine: [{ think: 'A console with three bundles of wire running out of it, one to each chair. A red light blinks. A green one waits.' }] },
        { id: 'ch14_screen', at: P.screen, solid: false, layer: 1, draw: screenDraw, examine: [{ think: 'A holoscreen. Blank, for now. It hums like it\'s thinking.' }] },
        { id: 'ch14_cart', at: P.cart, draw: cartDraw, examine: [{ think: 'A cart full of wires. Is it my imagination, or did one of them just spark?' }] }
      ],
      patch: {
        samantha: { examine: SAMANTHA_EXAMINE },
        window_rain: { examine: WINDOW_EXAMINE },
        chair_6: { examine: [{ think: 'My chair. Wires already taped to the backrest.' }] },
        tb_statue_right: { examine: 'The kneeling statue\'s painted mask has been chipped by a thumbnail. Someone in here once got bored enough to try.' }
      }
    };
  }
  function buildDoll() {
    var P = DOLL_POS, ext = dollExt(P), m;
    if (G.shared && G.shared.has(H.doll)) m = G.shared.map(H.doll, ext);
    else {
      m = ext; delete m.patch;
      m.tiles = boxTiles(18, 14, [3, 13]); m.spawn = P.door; m.placeholder = true;
      m.objects = m.objects.concat([
        { id: 'samantha', at: [8, 0], prop: 'samantha', examine: SAMANTHA_EXAMINE },
        { id: 'window_rain', at: [2, 0], examine: WINDOW_EXAMINE }
      ]);
      [[7, 3], [10, 3], [12, 5], [12, 7], [10, 9], [6, 9], [4, 7], [4, 5]].forEach(function (c, i) { m.objects.push({ id: 'chair_' + (i + 1), at: c, prop: 'h_folding_chair', solid: false }); });
    }
    m.ch14Pos = P;
    return m;
  }

  /* --- Luna's room (confinement) --- */
  function lunaExt(P) {
    var X = (G.shared && G.shared.data.upstairs && G.shared.data.upstairs.extras) || {};
    var book = Object.assign({ id: 'falsville_book', at: [6, 1], prop: 'up_book', layer: 1 }, X.falsvilleBook || {});
    return {
      name: 'Room No. 3 (locked)',
      ambient: 'hum', dark: 0.25, playerLight: 50,
      remove: ['booklet'],
      objects: [book, { id: 'ch14_plate', at: P.plate, solid: false, layer: 1, draw: plateDraw }],
      patch: {
        window: { examine: [{ think: 'The garden. Pink almond blossoms in January. Somewhere past the fence is a road, and somewhere past the road is Waverly.' }] },
        smoke_detector: { examine: [{ think: 'The smoke detector. "Eye". It never blinks.' }] }
      }
    };
  }
  function buildLuna() {
    var P = LUNA_POS, ext = lunaExt(P), m;
    if (G.shared && G.shared.has(H.luna)) m = G.shared.map(H.luna, ext);
    else {
      m = ext; delete m.patch; delete m.remove;
      m.tiles = boxTiles(10, 10, [4, 9]); m.spawn = P.arrive; m.placeholder = true;
      m.objects = m.objects.concat([
        { id: 'window', at: [4, 0], examine: [{ think: 'Sealed.' }] }, { id: 'bed', at: [7, 2], prop: 'h_bed_queen' },
        { id: 'tablet', at: [2, 0], solid: false }, { id: 'desk', at: [1, 7] }
      ]);
    }
    m.ch14Pos = P;
    return m;
  }

  /* --- The Last Light arena (2060): round sand floor, ring of white lights --- */
  function arenaTiles() {
    var w = 20, h = 13, cx = 9.5, cy = 6.5, rows = [];
    for (var y = 0; y < h; y++) {
      var r = '';
      for (var x = 0; x < w; x++) {
        if (y === 0) r += 'C';
        else if (x === 0 || x === w - 1 || y === h - 1) r += '#';
        else { var d = Math.sqrt((x - cx) * (x - cx) + (y - cy) * (y - cy) * 1.4); r += d < 5.6 ? 'a' : 'w'; }
      }
      rows.push(r);
    }
    return rows;
  }
  var ARENA_LIGHTS = [];
  (function () { for (var i = 0; i < 10; i++) { var a = i / 10 * Math.PI * 2; ARENA_LIGHTS.push({ at: [Math.round(9.5 + Math.cos(a) * 5.5), Math.round(6.5 + Math.sin(a) * 4.6)], r: 34 }); } })();
  var arena = {
    name: 'The Last Light (2060)',
    tiles: arenaTiles(),
    legend: { a: 'ch14:sand', w: 'h_stage_boards', C: 'h_curtain_red' },
    spawn: [9, 10],
    ambient: 'crowd', dark: 0.5, playerLight: 30, tint: '#40382a', tintAlpha: 0.15,
    lights: ARENA_LIGHTS.concat([{ at: [9, 6], r: 64 }]),
    npcs: [
      { id: 'ch14_opp', name: 'Pratt', at: [9, 4], spec: { name: 'Pratt', skin: '#d8b090', hair: '#2a1a10', hairStyle: 'buzz', outfit: '#6a6e76', outfit2: '#6a6e76', style: 'jumpsuit', accessory: ['number', 'beard'], height: 'tall', build: 'broad', voice: 200 },
        path: [[6, 4], [13, 4], [13, 8], [6, 8]], pause: 0.6, speed: 34, turn: false }
    ],
    objects: [
      { id: 'ch14_banner', at: [9, 0], prop: 'penguin_logo', solid: false, layer: 1, examine: 'The DPE penguin, ten feet tall, smiling down on the sand.' },
      { id: 'ch14_wingsL', at: [1, 6], solid: false, examine: [{ think: 'The wings. Darkness, and something moving in it.' }] }
    ]
  };

  /* ---------------------------------------------------------------------
   * DETECTOR OVERLAY (custom minigame): transparent reveal + scoreboard.
   * modes: 'rules' | 'round' | 'forfeit' | 'final'
   * ------------------------------------------------------------------- */
  var detector = {
    autoSolve: function () { return { success: true }; },
    start: function (ctx) {
      var p = ctx.params, R = ctx.R, P = ctx.PAL, W = ctx.W, Hh = ctx.H;
      var mode = p.mode || 'round';
      var phase = 0, phT = 0, gRev = 0, lRev = 0, flick = 0;
      var GREEN = '#2fd86a', RED = '#ff3a46', AMBER = '#f0c040';
      return new Promise(function (resolve) {
        ctx.loop(function (dt) {
          var I = ctx.input; phT += dt;
          var skip = I.pressed('ok'); if (skip) I.consume('ok');
          if (mode === 'round') {
            if (phase === 0 && (phT > 1.0 || skip)) { phase = 1; phT = 0; skip = false; }
            if (phase === 1) {
              if (phT > 0.75 || skip) { if (gRev < p.guesses.length) { gRev++; ctx.sound('blip'); phT = 0; } else { phase = 2; phT = 0; ctx.sound('heartbeat'); } skip = false; }
            }
            if (phase === 2) { flick += dt; if (phT > 1.3 || skip) { phase = 3; phT = 0; ctx.sound(p.truth ? 'success' : 'buzzer'); skip = false; } }
            if (phase === 3) {
              if (phT > 0.9 || skip) { if (lRev < p.lines.length) { lRev++; ctx.sound('select'); phT = 0; } else { phase = 4; phT = 0; ctx.sound('confirm'); } skip = false; }
            }
            if (phase === 4 && phT > 0.5 && skip) resolve({ success: true });
          } else {
            if (phase === 0 && (phT > 0.8 || skip)) { phase = 1; phT = 0; ctx.sound(mode === 'forfeit' ? 'buzzer' : mode === 'final' ? 'sting' : 'confirm'); skip = false; }
            if (phase === 1 && phT > 0.4 && skip) resolve({ success: true });
          }
        }, function (t) {
          var g = R.ctx;
          var grad = g.createLinearGradient(0, 0, 0, Hh); grad.addColorStop(0, '#120a16'); grad.addColorStop(1, '#040308');
          g.fillStyle = grad; g.fillRect(0, 0, W, Hh);
          var hi = -1;
          if (mode === 'round') hi = phase === 3 && lRev > 0 ? p.lines[lRev - 1].rule : phase === 4 ? -1 : -1;
          if (mode === 'forfeit') hi = 4;
          if (mode === 'final') hi = 5;

          if (mode === 'rules') {
            ctx.header('LIE DETECTOR', 'THE RULES');
            R.panel(24, 30, W - 48, 160);
            R.text('Each contestant asks each other contestant two questions.', W / 2, 38, { size: 7, align: 'center', color: '#fff' });
            R.text('The answerer chooses: TRUTH or LIE. The other two each guess.', W / 2, 48, { size: 7, align: 'center', color: '#fff' });
            R.text('The wires read the answerer. The screen reveals. Then, for EACH guesser:', W / 2, 58, { size: 7, align: 'center', color: P.dim });
            for (var i = 0; i < 4; i++) {
              R.rect(40, 72 + i * 15, W - 80, 13, '#000', 0.45);
              R.text(RULES[i], W / 2, 75 + i * 15, { size: 8, align: 'center', color: i < 2 ? '#ffb0b0' : '#b0ffc8' });
            }
            var a = Math.min(1, phT * 2);
            R.rect(40, 136, W - 80, 15, P.red, 0.25 * a + (phase ? 0.15 : 0));
            R.text('NEW: ' + RULES[4], W / 2, 139, { size: 8, align: 'center', color: '#fff', alpha: a });
            R.text('You may speak to each other and to the Judge (host). Mr. Trader Johnson, the guests', W / 2, 155, { size: 6, align: 'center', color: P.dim, alpha: a });
            R.text('and the audience are non-competitors.  ' + RULES[5] + '.', W / 2, 163, { size: 6, align: 'center', color: P.dim, alpha: a });
            if (phase) ctx.footer('[E] begin');
            R.scanlines(0.12); R.vignette(0.35);
            return;
          }

          ctx.header('LIE DETECTOR', mode === 'round' ? 'ROUND ' + p.n + ' OF 12' : mode === 'forfeit' ? 'RULE VIOLATION' : 'FINAL STANDINGS');

          // --- right: scoreboard ---
          var showAfter = (mode === 'round' && phase === 4) || (mode !== 'round' && phase >= 1);
          var sc = showAfter ? p.after : p.before;
          R.panel(250, 28, 126, 86);
          R.text('SCORES', 313, 31, { size: 6, align: 'center', color: P.dim });
          var order = mode === 'final' ? ['A', 'L', 'I'].sort(function (a, b) { return p.after[b] - p.after[a]; }) : ['A', 'L', 'I'];
          order.forEach(function (k, i) {
            var y = 40 + i * 24;
            var lowK = mode === 'final' && phase >= 1 && k === p.loser;
            if (lowK) R.rect(252, y - 2, 122, 23, P.red, 0.35 + 0.15 * Math.sin(t * 5));
            R.img(ctx.portrait(SPEC[k], lowK ? 'fear' : 'neutral'), 254, y, 0.5);
            R.text(NAME[k].toUpperCase(), 278, y + 2, { size: 7, color: '#fff' });
            var v = sc[k];
            R.text(String(v), 368, y + 1, { size: 14, align: 'right', color: lowK ? '#fff' : v < 0 ? RED : '#fff', font: 'sans' });
            var dlt = p.after[k] - p.before[k];
            if (showAfter && mode === 'round' && dlt) R.text((dlt > 0 ? '+' : '') + dlt, 278, y + 11, { size: 7, color: dlt > 0 ? GREEN : RED });
            if (mode === 'forfeit' && k === 'L') R.text(phase >= 1 ? 'was ' + p.before.L + ' : VOID' : '', 278, y + 11, { size: 7, color: RED });
          });

          // --- right: rules ---
          R.panel(250, 118, 126, 82, { accent: '#444' });
          R.text('RULES (per guesser)', 313, 121, { size: 6, align: 'center', color: P.dim });
          var ry = 130;
          [0, 1, 2, 3, 4, 5].forEach(function (i) {
            var lines = R.wrap(RULES[i], 118, 5.5);
            var hh = lines.length * 6.5 + 1;
            if (i === hi) R.rect(252, ry - 1, 122, hh, i === 4 || i === 5 ? P.red : (i < 2 ? '#7a1a20' : '#1a6a34'), 0.8);
            lines.forEach(function (ln, j) { R.text(ln, 255, ry + j * 6.5, { size: 5.5, color: i === hi ? '#fff' : '#a8a4b0', style: '' }); });
            ry += hh + 1;
          });

          // --- left panel ---
          R.panel(8, 28, 236, 172);
          if (mode === 'round') {
            R.text(NAME[p.asker].toUpperCase() + ' asks ' + NAME[p.ans].toUpperCase(), 16, 33, { size: 6, color: P.dim });
            var ql = R.wrap(p.question, 220, 7);
            ql.slice(0, 3).forEach(function (ln, j) { R.text(ln, 16, 42 + j * 9, { size: 7, color: '#fff' }); });
            var ay = 42 + Math.min(3, ql.length) * 9 + 3;
            var al = R.wrap('"' + p.answer + '"', 220, 7, 'serif', 'italic');
            al.slice(0, 3).forEach(function (ln, j) { R.text(ln, 16, ay + j * 9, { size: 7, color: AMBER, font: 'serif', style: 'italic' }); });
            var gy = 100;
            p.guesses.forEach(function (q, j) {
              if (j >= gRev) { R.text(NAME[q.k] + ' guesses ...', 16, gy + j * 10, { size: 7, color: '#555' }); return; }
              R.text(NAME[q.k] + (q.k === 'L' ? ' (you)' : '') + ' guesses', 16, gy + j * 10, { size: 7, color: '#ddd' });
              R.text(q.g === 'T' ? 'TRUTH' : 'LIE', 130, gy + j * 10, { size: 7, color: q.g === 'T' ? GREEN : RED });
            });
            // result
            var by = 124;
            R.rect(16, by, 220, 20, '#000', 0.6);
            if (phase === 2) {
              var on = Math.floor(flick * 12) % 2;
              R.text(on ? 'TRUTH' : 'LIE', 126, by + 3, { size: 14, align: 'center', font: 'sans', color: on ? GREEN : RED, alpha: 0.6 });
            } else if (phase >= 3) {
              R.rect(16, by, 220, 20, p.truth ? '#0e5a26' : '#6a0a12', 0.9);
              R.text(p.truth ? 'TRUTH' : 'LIE', 126, by + 3, { size: 14, align: 'center', font: 'sans', color: '#fff' });
            } else R.text('reading...', 126, by + 6, { size: 7, align: 'center', color: '#555' });
            p.lines.forEach(function (ln, j) {
              if (j >= lRev) return;
              var segs = R.wrap(ln.text, 220, 6);
              segs.forEach(function (s, k2) { R.text(s, 16, 150 + j * 20 + k2 * 7, { size: 6, color: j === lRev - 1 && phase === 3 ? '#fff' : '#bbb' }); });
            });
            if (p.note && phase === 4) R.text(p.note, 126, 190, { size: 6, align: 'center', color: P.dim });
            ctx.footer(phase === 4 ? '[E] continue' : '[E] skip ahead');
          } else if (mode === 'forfeit') {
            R.text('LUNA spoke to a non-competitor:', 126, 40, { size: 8, align: 'center', color: '#fff' });
            R.text('"' + p.said + '"  (to Trader)', 126, 54, { size: 7, align: 'center', color: AMBER, font: 'serif', style: 'italic' });
            if (phase >= 1) {
              R.rect(16, 80, 220, 30, '#6a0a12', 0.9);
              R.text('ALL POINTS VOID', 126, 84, { size: 14, align: 'center', font: 'sans', color: '#fff' });
              R.text('Luna ' + p.before.L + '  >  0', 126, 100, { size: 7, align: 'center', color: '#fff' });
              R.text('Contestants may speak only to each other or the Judge.', 126, 124, { size: 6, align: 'center', color: P.dim });
              ctx.footer('[E] continue');
            }
          } else if (mode === 'final') {
            R.text('After twelve rounds:', 126, 40, { size: 8, align: 'center', color: '#fff' });
            ['A', 'I', 'L'].forEach(function (k, j) { R.text(NAME[k] + '  ' + p.after[k], 126, 58 + j * 14, { size: 9, align: 'center', color: k === p.loser ? RED : '#fff' }); });
            if (phase >= 1) {
              R.rect(16, 110, 220, 24, P.red, 0.9);
              R.text(NAME[p.loser].toUpperCase() + ' LOSES: PUBLIC VOTE', 126, 116, { size: 10, align: 'center', font: 'sans', color: '#fff' });
              ctx.footer('[E] continue');
            }
          }
          R.scanlines(0.12); R.vignette(0.35);
        });
      });
    }
  };

  /* ---------------------------------------------------------------------
   * HELPERS
   * ------------------------------------------------------------------- */
  function addInsight(api, why) {
    var v = Math.min(7, Math.max(0, api.get('m_trader_insight', 0) + 1));
    api.set('m_trader_insight', v);
    api.log('[ch14] m_trader_insight +1 (' + why + ') = ' + v);
  }
  function addIsaiah(api, d) { api.set('m_isaiah', Math.max(0, Math.min(100, api.get('m_isaiah', 30) + d))); }

  /** Run a scored round: compute under the rules, show the overlay, commit. */
  async function scored(api, n, asker, ans, question, answer, truth, guesses, note) {
    var before = { A: ST.s.A, L: ST.s.L, I: ST.s.I };
    var res = scoreRound(before, ans, truth, guesses);
    ST.screen = 'idle';
    await api.minigame('detector', { mode: 'round', n: n, asker: asker, ans: ans, question: question, answer: answer, truth: truth, guesses: guesses, before: before, after: res.after, lines: res.lines, note: note });
    ST.s = res.after;
    ST.screen = truth ? 'truth' : 'lie';
    ST.hist.push(n);
    api.log('[ld] R' + n + ' ' + (truth ? 'TRUTH' : 'LIE') + ' ' + guesses.map(function (q) { return q.k + ':' + q.g; }).join(' ') + ' -> A' + ST.s.A + ' L' + ST.s.L + ' I' + ST.s.I);
    api.lowerThird('ANNETTE ' + ST.s.A + '   ISAIAH ' + ST.s.I + '   LUNA ' + ST.s.L, 'Lie Detector - after round ' + n, 3500);
    return res;
  }
  async function guess(api, prompt) {
    var c = await api.choice([{ text: 'Guess TRUTH.' }, { text: 'Guess LIE.' }], { prompt: prompt });
    return c === 0 ? 'T' : 'L';
  }
  async function guessLieFirst(api, prompt) {
    var c = await api.choice([{ text: 'Guess LIE.' }, { text: 'Guess TRUTH.' }], { prompt: prompt });
    return c === 0 ? 'L' : 'T';
  }

  /* ---------------------------------------------------------------------
   * THE FLASHBACK: The Last Light (play as Franchesca)
   * ------------------------------------------------------------------- */
  async function lastLight(api) {
    api.onAir(false); api.approval(false); api.lowerThird(null); api.objective(null);
    api.flash('#ffffff', 500);
    await api.fadeOut(900, '#ffffff');
    await api.slides([{ style: 'montage', title: '2060', text: 'I was eight. I was watching from the floor of a group-home lounge. I had forgotten. The wires on my neck remember for me.' }]);
    api.setPlayer('franchesca_show');
    await api.goRoom(H.arena, { at: [9, 10], facing: 'up', fade: false });
    await api.fadeIn(900);
    api.onAir(true);
    api.lowerThird('THE LAST LIGHT', 'DPE Rebellion Special - The Final', 4000);
    await api.narrate('An arena of light. Round sand under a ring of white lamps. The penguin smiles down. Somewhere up in the dark, a nation chants.');
    await api.say('Crowd', ['Traitor! Harlot!', 'TRAITOR! HARLOT!'], { portrait: false });
    await api.say('franchesca_show', 'Who\'s the real traitor? Me, or the ones destroying this world?', { mood: 'angry' });
    await api.think('Round six, I held a gun to the back of a man\'s head. All I had to do was pull the trigger. She can come home to me. That was all I wanted.');
    await api.think('He is the last one. Pratt. He hurt children. He hurt everyone in this show, the strong and the weak. He can never walk out of here.');
    await api.think('He is bigger. He is faster. But he only ever looks one way.');
    api.set('ch14_strikeFails', 0);
    api.onInteract('ch14_opp', async function (api2) {
      var n = api2.npc('ch14_opp'), pt = api2.playerTile();
      var nt = { x: Math.floor(n.x / 16), y: Math.floor((n.y - 2) / 16) };
      var f = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[n.dir] || [0, 1];
      var dot = f[0] * (pt.x - nt.x) + f[1] * (pt.y - nt.y);
      if (dot <= 0 || api2.auto) { api2.set('ch14_struck', true); return; }
      api2.add('ch14_strikeFails', 1);
      api2.sound('hit'); api2.flash('#a8202c', 200); await api2.shake(300, 3);
      api2.face('ch14_opp', 'player');
      await api2.say('ch14_opp', ['There she is. Come here, pretty.'], { name: 'Pratt', mood: 'smug' });
      await api2.narrate('He shoves her back across the sand. The crowd howls.');
      var away = [[3, 10], [16, 10], [3, 3], [16, 3]][api2.get('ch14_strikeFails', 1) % 4];
      api2.teleport(away, 'up');
      if (api2.get('ch14_strikeFails', 0) >= 2) await api2.think('Not from the front. Wait for his back. Circle. Then strike.');
    });
    await api.until(function (f) { return f.ch14_struck; }, { objective: 'Get behind Pratt. Strike when his back is turned.', target: 'ch14_opp' });
    api.objective(null);
    api.lockPlayer();
    var q = await api.minigame('qte', { mode: 'timing', title: 'THE LAST ROUND', prompt: 'Strike while his back is turned.', rounds: 3, need: 2 });
    api.set('ch14_strikeClean', !!q.success);
    for (var i = 0; i < 3; i++) { api.sound('hit'); api.flash('#7a0a14', 160); await api.shake(220, 2); await api.wait(220); }
    await api.narrate(q.success
      ? 'She strikes, and strikes, and strikes, until the crowd\'s roar is the only thing in the arena still moving.'
      : 'He turns. He nearly has her. Then she is behind him again, and she does not stop until the crowd\'s roar is the only thing still moving.');
    api.hide('ch14_opp');
    api.sound('applause');
    await api.narrate('Pratt is down. He will not get up. The lights swing to her.');
    // young Trader runs in from the wings
    api.addNpc({ id: 'ch14_ytrader', spec: 'trader_young', at: [1, 6], facing: 'right', turn: false });
    var pt0 = api.playerTile();
    await api.move('ch14_ytrader', [Math.max(1, pt0.x - 1), pt0.y], { speed: 90 });
    api.face('ch14_ytrader', 'player'); api.face('player', 'ch14_ytrader');
    await api.say('trader_young', 'You won. You hear me? You won. I\'ll get you a medic. You won.', { mood: 'happy' });
    await api.narrate('He takes her wrist and raises it high for the cameras. Her blood runs down his arm, over a little inked penguin on the inside of his forearm.');
    await api.emote('ch14_ytrader', '!', 900);
    if (api.get('f_mem_penguin_arm', true)) await api.think('The arm. The penguin. I have seen this arm before. I have seen it lift my mother\'s hand.');
    else await api.think('A penguin. A little inked penguin.');
    await api.say('trader_young', 'How are you feeling?', { mood: 'neutral' });
    await api.say('franchesca_show', 'Powerful. Winning will do that.', { mood: 'smug' });
    // the microphone rises from the sand
    api.sound('reveal');
    api.addObject({ id: 'ch14_mic', at: [9, 3], prop: 'mic_stand' });
    await api.narrate('A microphone stand rises out of the sand at the centre of the ring. The victory speech. The whole country watching, live.');
    api.unlockPlayer();
    await api.waitForInteract('ch14_mic', { objective: 'Step up to the microphone.' });
    api.objective(null);
    api.lockPlayer();
    api.teleport([9, 4], 'up');
    await api.say('franchesca_show', ['Thank you. I\'m not going to thank the DPE.', 'I want to tell you something they don\'t want you to hear. Something a man told me in the dark.'], { mood: 'neutral' });
    // the True Believer steps out of the wings; we SEE him and Trader's face before the feed dies
    api.addNpc({ id: 'ch14_blade', spec: { extends: 'tb', name: 'True Believer', overlay: ['mask_plain', 'gloves_black'] }, at: [18, 4], facing: 'left', turn: false });
    await api.pan([14, 4], 700);
    await api.move('ch14_blade', [12, 4], { speed: 30 });
    await api.narrate('In the wings, a True Believer steps out of the dark. Steel catches the ring of lights.');
    api.face('ch14_ytrader', 'right');
    await api.pan('ch14_ytrader', 600);
    await api.emote('ch14_ytrader', '!', 700);
    await api.say('trader_young', 'No. No, no, no-', { mood: 'fear' });
    await api.cameraReset(400);
    await api.say('franchesca_show', 'I want to tell you about Judge Silas Johnson\'s island-', { mood: 'angry' });
    api.sound('static'); api.ambient('static');
    api.flash('#ffffff', 300);
    await api.slides([{ style: 'montage', title: 'SIGNAL LOST', text: 'WE ARE EXPERIENCING TECHNICAL DIFFICULTIES. PLEASE STAND BY.', ms: 2600 }]);
    await api.fadeOut(500, '#000');
    api.unlockPlayer();
    api.setPlayer('luna');
    api.ambient(null);
  }

  /* ---------------------------------------------------------------------
   * CHAPTER
   * ------------------------------------------------------------------- */
  var maps = {};
  maps[H.doll] = buildDoll();
  maps[H.luna] = buildLuna();
  maps[H.arena] = arena;

  G.registerChapter({
    id: 'ch14',
    title: 'Lie Detector',
    kicker: 'COMPETITION 4',
    maps: maps,
    tiles: { sand: { color: '#c8b088', color2: '#b09870', pattern: 'noise' } },
    minigames: { detector: detector },
    testDefaults: {
      m_isaiah: 55, f_isaiah_reconciled: true, n_tea_resisted: 1, f_vr_self_sacrifice: true,
      f_mem_penguin_arm: true, f_note3_decoded: true, f_kessie_secret_told: true, m_trader_insight: 3, m_audience: 45
    },

    start: async function (api) {
      ST.s = { A: 0, L: 0, I: 0 }; ST.screen = 'idle'; ST.hist = [];
      var DP = maps[H.doll].ch14Pos, LP = maps[H.luna].ch14Pos;
      api.data.dollPos = DP;
      var seat = DP.seatL;

      /* ================= 1. THE DOLL ROOM, BEFORE ================= */
      await api.titleCard('Monday, 5 February', 'The final three', 2400, { kicker: 'WEEK 5' });
      await api.goRoom(H.doll, { at: DP.door, facing: 'up' });
      await api.narrate('Everyone\'s favorite creepy doll room. Chairs in a triangle, wires running from each one to a console. It feels so empty now that there are only three of us left.');
      await api.think('Samantha\'s huge blown-up face looms over all of it. Delphin loved that doll. I think.');
      api.objective('Take your seat. (Look around first, if you dare.)', { target: 'chair_6' });
      await api.waitForInteract('chair_6', { objective: 'Take your seat. (Look around first, if you dare.)' });
      api.objective(null);
      api.lockPlayer();
      api.teleport(seat, 'up');

      // the wiring
      await api.say('ginerva', 'It appears we are about to begin. Your equipment.', { mood: 'angry' });
      await api.narrate('Mouse lays a gloved hand on Luna\'s shoulder and presses down. Not hard. Hard enough. Then a fist in her hair, twisted up into a tight bun. Air on the back of her neck.');
      await api.narrate('A jar of something grey and mushy, a fine-tipped brush. Cold, sticky goo, layer after layer. Then the wires, pressed into it one by one.');
      var still = await api.minigame('qte', { mode: 'timing', title: 'HOLD STILL', prompt: 'Don\'t flinch while Mouse fixes the wires.', rounds: 3, need: 2 });
      if (!still.success) { await api.narrate('Luna flinches. Mouse\'s grip tightens until she stops.'); api.approvalAdd(-2); }
      else await api.think('I hate it when they touch me. I don\'t let it show.');
      await api.say('isaiah', 'According to Article 328 of the morality code, people from traditionally discriminated against races have the right to refuse alterations to parts of them that are important to their culture including their hair.', { mood: 'sad' });
      await api.say('isaiah', 'If I ask you to stop messing with my hair because it\'s a part of my culture, will you?', { mood: 'sad' });
      await api.narrate('Dog lifts each cornrow in turn and paints underneath it anyway.');
      await api.say('annette', 'Sonny, do you really think these fine folks give any hoot about the morality code? Tell me, what about any of this screams moral at you?', { mood: 'smug' });
      var c0 = await api.choice([{ text: '"Just hang in there. Hopefully it\'ll be over soon."' }, { text: '(Say nothing. Don\'t move your neck.)' }]);
      if (c0 === 0) { await api.say('luna', 'Just hang in there, Isaiah. Hopefully it\'ll be over soon.'); addIsaiah(api, 2); }

      // the lottery winners
      await api.narrate('The Judge returns with three strangers in tow.');
      api.show('ch14_win1'); api.show('ch14_win2'); api.show('ch14_win3');
      api.onAir(true); api.approval(true);
      api.lowerThird('RIGHT TO LIFE', 'Competition 4 - The Final Three - LIVE', 4000);
      await api.say('judge', 'Welcome to our three winners. These lucky citizens entered a lottery to observe the last competition we\'ll have here on this show, and have traveled from as far as seven hours away to witness this spectacular event. Please, have a seat.', { mood: 'happy' });
      await api.say('ch14_win1', 'I do hope there won\'t be language. My grandson is watching.', { name: 'Lottery Winner' });
      await api.say('ch14_win2', 'Seven hours on the bus! Worth every minute. Big fan. Big, big fan.', { name: 'Lottery Winner', mood: 'happy' });
      await api.think('A handsome young man with a half-grin that I bet sends women flocking. And a woman not much older than me, hunched like life took more than its share of swings at her.');
      var c1 = await api.choice([{ text: '(Smile at the hunched woman.)' }, { text: '(Keep your eyes on the floor.)' }]);
      if (c1 === 0) { await api.say('ch14_win3', 'Don\'t smile at me.', { name: 'Lottery Winner', mood: 'angry' }); await api.think('Oh well. Worth a try.'); }

      // the name, and Trader sent away
      await api.say('judge', 'Let\'s go over the rules. This competition is called lie detector.');
      await api.narrate('Trader snorts. When every head turns, he lowers his eyes and clasps his hands tighter behind his back.');
      await api.say('trader', 'Sorry. I just remember when I came up with that name. I was really excited to announce it as well.', { mood: 'sad' });
      await api.say('judge', 'Make yourself useful, boy, and go fetch some refreshments for our guests.', { mood: 'angry' });
      await api.move('ch14_trader', DP.door, { speed: 30 });
      api.hide('ch14_trader');
      await api.think('Poor Trader, who put so much effort into designing our deaths, doesn\'t even get to watch the beginning.');
      await api.say('judge', ['Lie detector will judge your ability to see through the masks you all wear. Only when you have made yourselves truly vulnerable will you be able to feel the shame and disgust needed to achieve penance.',
        'You\'ve all been fitted with top-level technology that can detect any lie. One at a time, you will ask each other questions. The questioned contestant may choose whether to answer with the truth or a falsehood. Then the other two will cast their guesses. Each contestant will ask each other contestant two questions.'], { mood: 'smug' });
      await api.say('judge', 'Now, as the theme for this competition is questions, I am going to graciously entertain some of yours. Do not abuse this privilege.');
      var c2 = await api.choice([{ text: '(Raise your hand.) "How does telling lies help us with redemption?"' }, { text: '(Keep your hand down.)' }]);
      if (c2 === 0) {
        await api.say('luna', 'How does telling lies help us with redemption, as you say? Wouldn\'t you want to reward us for the opposite?');
        await api.narrate('The Judge\'s nostrils flare.');
        await api.say('judge', ['You can all thank the stubborn Miss Luna for the fact that you have lost your right to ask questions.',
          'This competition isn\'t about how you choose to answer the questions, but the way you interpret the others\' answers. Being able to see behind the lies of others is a valuable skill for a citizen to possess.'], { mood: 'angry' });
        await api.say('judge', 'And since you are all so eager to flap your lips: from this moment, you will speak only to your fellow contestants, or to me. One word to anyone else, to Mr. Johnson, to our guests, to the audience at home, and every point you hold is void.', { mood: 'smug' });
        api.approvalAdd(-3);
      } else {
        await api.narrate('Silence. The Judge seems almost disappointed.');
        await api.say('judge', 'No questions? Then one more rule, for the sake of order. From this moment, you will speak only to your fellow contestants, or to me. One word to anyone else, to Mr. Johnson, to our guests, to the audience at home, and every point you hold is void.', { mood: 'smug' });
      }
      ST.screen = 'idle';
      await api.minigame('detector', { mode: 'rules' });
      await api.say('judge', 'Since you are so eager to flap those empty lips of yours, Miss Luna, you may ask the first question.', { mood: 'smug' });
      await api.think('He framed it as a favor. Going first isn\'t one. Isaiah. At least that buys me time before I have to come up with something for Annette.');

      /* ================= 2. ROUNDS 1-9 ================= */
      // R1 Luna -> Isaiah
      await api.say('luna', 'Isaiah. If you win the show, what\'s the first thing you\'re going to do when you get out?');
      await api.say('isaiah', 'Probably visit Joe\'s grave. That is, if he even has one.', { mood: 'sad' });
      await api.think('I see no reason for him to lie about this. And he doesn\'t strike me as someone who could lie with a straight face.');
      var g1 = await guess(api, 'Is Isaiah telling the truth?');
      await api.say('annette', 'I agree he means it. Truth.', { mood: 'neutral' });
      await scored(api, 1, 'L', 'I', 'If you win the show, what\'s the first thing you\'re going to do when you get out?', 'Probably visit Joe\'s grave. That is, if he even has one.', true, [{ k: 'L', g: g1 }, { k: 'A', g: 'T' }]);
      await api.narrate('Isaiah exhales sharply, shoulders dropping.');

      // R2 Isaiah -> Annette
      await api.say('judge', 'The next questioner will be Isaiah. Choose your target.');
      await api.say('isaiah', 'Annette. Tell the truth about what really happened with Kessie.');
      await api.say('annette', ['Oh, Isaiah, you make it sound like such a mystery. Did you really think you could fool me into a confession by adding the words "tell the truth"? How adorable.', 'Oh, very well. Since you asked so nicely.'], { mood: 'smug' });
      await api.say('annette', ['Luna told me about Kessie\'s son.', 'Poor Kessie trusted our dear Luna with her deepest secret, and Luna handed it over to me like a token at a slot machine. And, well, perhaps I helped things along just a little.', 'A dash of something special in her tea, just to make sure the night was truly unforgettable.'], { mood: 'smug' });
      var nt = api.get('n_tea_resisted', 0);
      await api.think(nt >= 2 ? 'I fought that tea. I remember fighting it. It wasn\'t enough.' : 'The night of Kessie\'s betrayal always felt strange. Unreal. Now I know why.');
      await api.say('isaiah', 'She\'s telling the truth.', { mood: 'angry' });
      var g2 = await guess(api, 'Is Annette telling the truth?');
      await scored(api, 2, 'I', 'A', 'Tell the truth about what really happened with Kessie.', 'Luna told me about Kessie\'s son... A dash of something special in her tea.', true, [{ k: 'I', g: 'T' }, { k: 'L', g: g2 }]);
      await api.say('annette', 'Well, isn\'t that interesting?', { mood: 'smug' });

      // Trader returns with the tray (main-approved default)
      api.show('ch14_trader');
      api.placeNpc('ch14_trader', DP.trader, 'left');
      api.addObject({ id: 'ch14_tray', at: DP.cart, draw: trayDraw, solid: false, layer: 1 });
      await api.narrate('The door opens. Trader slips back in with a tray of little sandwiches, sets it down for the guests, and takes his place against the wall.');

      // R3 Annette -> Luna
      await api.say('judge', 'The next questioner will be Annette. Choose your target.');
      await api.say('annette', ['Luna. It was quite interesting to learn that your mother was also a contestant on a punitive entertainment show. And even more delicious to learn that Trader was the host.', 'I can\'t quite understand how you didn\'t realize it. He doesn\'t look all that different now than he did then.'], { mood: 'smug' });
      await api.narrate('Across the room, Trader stiffens. A twitch of his fingers. A clench of his jaw. Gone in a second, but I see it.');
      await api.say('annette', 'Her show had such a unique ending. What did you think about the finale?', { mood: 'smug' });
      await api.think('The truth is white noise. I can lie. Or I can say what\'s true.');
      var a3 = await api.choice([{ text: '(Truth) "I don\'t remember the finale at all."' }, { text: '(Lie) "I remember every second of it."' }]);
      var t3 = a3 === 0;
      var ans3 = t3 ? 'I\'m pretty sure I watched it. But my memories of it are all muddled. I don\'t remember the finale at all.' : 'I remember every second of it. She was magnificent.';
      await api.say('luna', ans3);
      await api.say('isaiah', 'She\'s telling the truth.');
      await api.say('annette', 'Truth.', { mood: 'neutral' });
      await scored(api, 3, 'A', 'L', 'Her show had such a unique ending. What did you think about the finale?', ans3, t3, [{ k: 'A', g: 'T' }, { k: 'I', g: 'T' }]);
      if (!t3) await api.think('Two people looked straight at me and believed me. The wires didn\'t.');

      // R4 Luna -> Annette (Annette LIES)
      await api.say('judge', 'Let\'s continue. Miss Luna.', { mood: 'happy' });
      await api.say('luna', 'Annette. What happened at the end of my mother\'s show?');
      await api.narrate('Trader tenses where he stands.');
      await api.say('annette', ['Oh, what a delicious question.', 'Your mother was quite the competitor. Perhaps one of the best they ever had. And in the end, she did what was necessary. She won.'], { mood: 'smug' });
      await api.say('luna', 'How?');
      await api.say('annette', 'The usual way. She killed the final contestant. Quite brutally, if I recall. And oh, the spectacle. Shame she didn\'t make it any further than that. The injuries from the fight were enough to do her in.', { mood: 'smug' });
      await api.think('Trader isn\'t looking at me. He\'s looking at the Judge. Searching. The Judge gives him nothing but a flick of disapproval.');
      var g4 = await guess(api, 'Is Annette telling the truth?');
      await api.say('isaiah', 'Yeah. I think she\'s telling the truth.', { mood: 'neutral' });
      await scored(api, 4, 'L', 'A', 'What happened at the end of my mother\'s show?', 'She won... The injuries from the fight were enough to do her in.', false, [{ k: 'L', g: g4 }, { k: 'I', g: 'T' }]);
      if (g4 === 'T') {
        await api.say('luna', 'You\'re playing with me. Why? Why would you lie about something like that?', { mood: 'angry' });
        await api.say('annette', 'Oh, my dear girl. It\'s a game, isn\'t it? And you? You\'re so easy to toy with.', { mood: 'smug' });
      } else {
        await api.say('annette', 'Look at that. The girl has eyes after all.', { mood: 'smug' });
      }
      await api.say('judge', 'That will be quite enough. Sit down, Luna. Ah, what a fascinating round this is turning out to be.', { mood: 'happy' });

      // R5 Annette -> Isaiah
      await api.say('annette', 'Well, boy. I think the audience is just dying to know... are you a top or a bottom?', { mood: 'smug' });
      var c5 = await api.choice([{ text: '"Annette, seriously?"' }, { text: '(Let it go. Not your fight today.)' }]);
      if (c5 === 0) {
        await api.say('luna', 'Annette, seriously?', { mood: 'angry' });
        await api.say('judge', 'Silence, Luna. It is not your turn to speak.', { mood: 'angry' });
        addIsaiah(api, 3); api.approvalAdd(-2);
      }
      await api.narrate('Trader snorts, barely covering it. A flush creeps up Isaiah\'s neck.');
      await api.say('isaiah', ['Top or bottom is a flawed concept. Neither are strictly necessary.', 'Joe and I sometimes switched positions, but I mostly preferred to be at the bottom.'], { mood: 'tired' });
      await api.say('annette', 'I believe you.', { mood: 'happy' });
      await api.say('judge', 'Luna. You are required to answer. Unless, of course, you would prefer disqualification?', { mood: 'smug' });
      var g5 = await guess(api, 'Is Isaiah telling the truth?');
      await scored(api, 5, 'A', 'I', 'Are you a top or a bottom?', 'Joe and I sometimes switched positions, but I mostly preferred to be at the bottom.', true, [{ k: 'A', g: 'T' }, { k: 'L', g: g5 }]);

      // R6 Isaiah -> Luna
      await api.say('isaiah', ['I\'ll ask Luna.', 'You\'ve talked about growing up in a group home a lot. Most people I knew who grew up in group homes don\'t come off as nearly as intelligent as you do.'], { mood: 'neutral' });
      await api.narrate('A sharp intake of breath. Annette, of all people.');
      await api.say('isaiah', 'I- That came out wrong. I didn\'t mean it like that.', { mood: 'shock' });
      await api.say('luna', 'You\'re asking how I ended up well-read despite my background?');
      await api.say('isaiah', 'Yeah. Exactly.');
      await api.think('The scores are too close. If I want any chance, I need to shift the balance. I could lie. I\'ve never been good at lying on the spot.');
      var a6 = await api.choice([{ text: '(Lie) "A teacher took an interest in me. Private tutoring."' }, { text: '(Truth) "I stole books. From Columbus, from anywhere."' }]);
      var t6 = a6 === 1;
      var ans6 = t6 ? 'I stole them. From the Columbus staff room, from the bins behind the library. I read under the oak tree until it got dark.' : 'A teacher took an interest in me when I was a kid. She gave me private tutoring.';
      await api.say('luna', ans6);
      if (!t6) await api.think('Simple. Clean. Believable. And I can feel every tell on my body. My hands are too still. I blink once, too slow.');
      await api.say('annette', 'She\'s lying.', { mood: 'smug' });
      await api.say('isaiah', 'Yeah. She\'s lying.', { mood: 'sad' });
      await scored(api, 6, 'I', 'L', 'How did you end up so well-read?', ans6, t6, [{ k: 'I', g: 'L' }, { k: 'A', g: 'L' }]);
      await api.think(t6 ? 'I told the truth and they both called me a liar. Good. Let them pay for it.' : 'Annette knew. She threw me off balance with my mother, and I let her.');

      // R7 Luna -> Isaiah
      await api.say('luna', 'Isaiah. Will you ever be able to forgive your mother?');
      await api.narrate('The room stills. Isaiah\'s head snaps toward her. We\'d been throwing each other softballs until now.');
      await api.say('judge', 'Contestant, you have five seconds before I consider this an automatic loss.', { mood: 'angry' });
      await api.say('isaiah', ['It would take a lot.', 'She would have to apologize. Actually apologize. And admit she was wrong.', 'And she\'d have to leave my father.'], { mood: 'cry' });
      await api.narrate('His voice cracks on the last word. And just like that, Isaiah is crying.');
      var g7 = await guess(api, 'Is Isaiah telling the truth?');
      await api.say('annette', 'Oh, the little crybaby is telling the truth of it.', { mood: 'smug' });
      await scored(api, 7, 'L', 'I', 'Will you ever be able to forgive your mother?', 'She would have to apologize. Actually apologize... And she\'d have to leave my father.', true, [{ k: 'L', g: g7 }, { k: 'A', g: 'T' }]);
      var c7 = await api.choice([{ text: '(Say nothing. It\'s just the game.)' }, { text: '"Isaiah. I\'m sorry. I shouldn\'t have."' }]);
      if (c7 === 1) { await api.say('luna', 'Isaiah. I\'m sorry. I shouldn\'t have asked that.'); await api.say('isaiah', '...You asked. I answered. That\'s the game.', { mood: 'sad' }); addIsaiah(api, 2); }
      else await api.think('It\'s just the game. It\'s a cheap excuse, and I know it.');

      // R8 Annette -> Luna
      await api.say('annette', ['Oh, Luna, dear. I do believe it\'s my turn.', 'You and your mother have a lot in common. Both criminals. Both contestants. Makes one wonder if bad parenting is hereditary.', 'So tell me, Luna. Do you think you\'re a better mother than your own mother?'], { mood: 'smug' });
      var a8 = await api.choice([{ text: '(Truth) "That depends..."' }, { text: '(Lie) "Yes. Of course I am."' }]);
      var t8 = a8 === 0;
      var ans8 = t8 ? 'That depends. On whether or not I make it home to Waverly. If I do, then I\'m a better mother. If I don\'t make it home, then I\'m no better than she was.' : 'Yes. Of course I am.';
      if (t8) await api.say('luna', ['That depends.', 'On whether or not I make it home to Waverly. If I do, then I\'m a better mother. If I don\'t make it home, then I\'m no better than she was.'], { mood: 'sad' });
      else await api.say('luna', ans8);
      await api.narrate('In the corner, Trader\'s hands are curled into fists, knuckles white. For the briefest moment he looks... pained. The Judge notices.');
      await api.say('annette', 'Isaiah. Why don\'t you go first?', { mood: 'smug' });
      await api.say('isaiah', 'I- I think Luna is lying.', { mood: 'fear' });
      await api.say('annette', 'Oh, you poor, confused boy. Truth.', { mood: 'smug' });
      await scored(api, 8, 'A', 'L', 'Do you think you\'re a better mother than your own mother?', ans8, t8, [{ k: 'I', g: 'L' }, { k: 'A', g: 'T' }]);

      // R9 Isaiah -> Annette
      await api.say('isaiah', 'Annette. Do you have any regrets about all the people you\'ve hurt?', { mood: 'angry' });
      await api.say('annette', 'No.', { mood: 'smug' });
      await api.narrate('No excuses. No hesitation. Just no.');
      await api.say('isaiah', 'She\'s telling the truth.', { mood: 'sad' });
      var g9 = await guess(api, 'Is Annette telling the truth?');
      await scored(api, 9, 'I', 'A', 'Do you have any regrets about all the people you\'ve hurt?', 'No.', true, [{ k: 'I', g: 'T' }, { k: 'L', g: g9 }]);

      /* ================= 3. ROUND 10 + THE LAST LIGHT ================= */
      await api.think('I hate her because she knows things I need to know. I could die next week. I have to take what I can get.');
      await api.say('luna', 'What happened at the end of my mother\'s show?');
      await api.think('This time I don\'t watch her. I watch Trader. The second my mother\'s name leaves my lips, something in him cracks.');
      await api.say('annette', ['You know, I wasn\'t entirely lying before. I was curious to see if my first version would set off the detectors.', 'Your mother did kill the other contestant, as required. And she was crowned the victor. They asked her if she wanted to give a victory speech. And wouldn\'t you know it, she did.'], { mood: 'smug' });
      await api.say('trader', 'No. Stop this. You can\'t let her say this.', { mood: 'fear' });
      await api.say('judge', ['Are you telling me what I can and cannot allow?', 'I think, Trader, that since you were so determined to create a good show, you should enjoy it.', 'If you feel ashamed, then that is your burden to carry. And perhaps you deserve it.'], { mood: 'smug' });
      await api.narrate('Trader\'s whole body deflates. His face goes utterly, completely blank.');
      await api.say('annette', 'Thank you, darling. Now, where was I? Ah, yes. The victory speech.', { mood: 'happy' });
      await api.think('A victory speech. Lights. A ring of white lights...');

      await lastLight(api);

      // back in the Doll Room
      await api.goRoom(H.doll, { at: seat, facing: 'up', fade: false });
      api.remove('ch14_tray');
      api.addObject({ id: 'ch14_tray', at: DP.cart, draw: trayDraw, solid: false, layer: 1 });
      api.lockPlayer();
      await api.fadeIn(700);
      api.onAir(true); api.approval(true);
      await api.say('annette', ['Your mother didn\'t say what anyone expected. She revealed state secrets that she should have never known. On national television.', 'And then, right there on that stage, with the whole world watching, your mother killed herself.'], { mood: 'smug' });
      await api.say('annette', 'And her last words? Well, they were quite touching. She said...', { mood: 'neutral' });
      api.sound('static');
      await api.tv([{ speaker: 'franchesca_show', mood: 'cry', headline: 'DPE ARCHIVE - THE LAST LIGHT - 2060', text: 'I\'m so sorry, Luna. I love you.', tag: 'ARCHIVE' }]);
      await api.slides([{ style: 'black', text: '"I\'m so sorry, Luna. I love you."', ms: 3800 }]);
      await api.think('Her voice. I\'d forgotten her voice.');
      await api.think('It sounds too neat. Too perfect. Like something Annette would make up just to hurt me. My mother wasn\'t a coward. My mother died a revolutionary.');
      await api.say('isaiah', 'I think she\'s telling the truth.', { mood: 'sad' });
      var g10 = await guessLieFirst(api, 'Is Annette telling the truth?');
      await scored(api, 10, 'L', 'A', 'What happened at the end of my mother\'s show?', 'She revealed state secrets... your mother killed herself. She said, "I\'m so sorry, Luna. I love you."', true, [{ k: 'L', g: g10 }, { k: 'I', g: 'T' }], 'The wires read what the answerer believes.');
      await api.think(g10 === 'L' ? 'Truth. The screen says truth.' : 'Truth. I said truth, and I hate that I believed her.');

      /* ================= 4. THE FORFEIT (compulsory) ================= */
      await api.think('Trader knew something. The secrets. The speech. That night in the hallway, drunk, telling me I\'d betrayed him. That he loved me. He wasn\'t talking to me. He thought I was my mother.');
      await api.think('He\'s a non-competitor. I know the rule. I don\'t care.');
      var fq = await api.choice([{ text: '(Turn to Trader.) "Did you give her the secrets?"' }, { text: '(Turn to Trader.) "It was you. You told her. Didn\'t you?"' }, { text: '(Turn to Trader.) "Look at me. What did you do?"' }], { prompt: 'I can\'t not ask.' });
      var fqText = ['Did you give her the secrets?', 'It was you. You told her. Didn\'t you?', 'Look at me. What did you do?'][fq];
      await api.say('luna', fqText, { mood: 'angry' });
      await api.narrate('Trader flinches.');
      await api.say('judge', 'You are not allowed to speak to a noncompetitor. Even an unimportant piece of trash like Trader.', { mood: 'angry' });
      var befF = { A: ST.s.A, L: ST.s.L, I: ST.s.I };
      var aftF = { A: ST.s.A, L: 0, I: ST.s.I };
      await api.minigame('detector', { mode: 'forfeit', said: fqText, before: befF, after: aftF });
      ST.s = aftF;
      api.log('[ld] FORFEIT Luna ' + befF.L + ' -> 0  (A' + ST.s.A + ' L0 I' + ST.s.I + ')');
      api.approvalAdd(5);
      var look = await api.choice([{ text: 'Look at him.' }, { text: 'Look away.' }]);
      if (look === 0) {
        await api.narrate('Trader doesn\'t answer. He can\'t meet her eyes. He just stands there, silent, a man haunted, as if speaking would only tighten the noose around his neck.');
        await api.think('He loved her. Whatever else he is, he loved her.');
        addInsight(api, 'looked at Trader after the forfeit');
      } else await api.think('I can\'t look at him. Not yet.');

      /* ================= 5. ROUNDS 11-12 ================= */
      await api.say('annette', 'Isaiah. Do you think Luna can be trusted?', { mood: 'smug' });
      await api.narrate('Isaiah hesitates. And that hesitation hurts.');
      await api.say('isaiah', ['I think Luna can be trusted. As long as her own interests aren\'t being threatened.', 'That\'s not a bad thing. That\'s most people. That\'s how you survive.'], { mood: 'sad' });
      await api.say('annette', 'Truth.', { mood: 'smug' });
      var g11 = await guess(api, 'Is Isaiah telling the truth?');
      await scored(api, 11, 'A', 'I', 'Do you think Luna can be trusted?', 'As long as her own interests aren\'t being threatened.', true, [{ k: 'A', g: 'T' }, { k: 'L', g: g11 }]);

      // honest math: can Luna still climb out of last? (best case: both guess TRUTH on a lie = +4)
      var lowOther = Math.min(ST.s.A, ST.s.I);
      if (ST.s.L + 4 < lowOther) await api.think('One question left, and it belongs to Isaiah. I do the math. Even if they both believe a lie, I\'m in last place. All I can do now is be honest.');
      else await api.think('One question left, and it belongs to Isaiah. I do the math. If they both believe me, maybe.');
      await api.say('isaiah', 'Can I trust you?', { mood: 'neutral' });
      await api.think('I picture Waverly. Older, angrier, alone, in a chair just like mine, in front of a host who looks just like Trader.');
      var c12 = await api.choice([{ text: '"Yes."' }, { text: '(Hesitate.)' }]);
      if (c12 === 1) {
        await api.say('judge', 'Answer the question, Miss Luna, or forfeit the competition.', { mood: 'angry' });
      }
      await api.say('luna', 'Yes.', { mood: 'neutral' });
      api.sound('sting');
      await api.say('trader', ['No! Don\'t trust her!', 'The women in her family- They make you love them. And then they hurt you.'], { mood: 'angry' });
      addInsight(api, 'Trader\'s outburst');
      await api.narrate('His eyes flick to the Judge, just for a second, and for the first time Luna sees genuine fear.');
      var isaiahHigh = api.get('m_isaiah', 30) >= 55;
      api.log('[ld] m_isaiah=' + api.get('m_isaiah', 30) + ' -> Isaiah guesses ' + (isaiahHigh ? 'TRUTH' : 'LIE'));
      if (isaiahHigh) await api.say('isaiah', '...Truth.', { mood: 'sad' });
      else await api.say('isaiah', '...Lie. I\'m sorry. Lie.', { mood: 'sad' });
      await api.say('annette', 'Fascinating. I think deep down our little martyr knows exactly what she would do to anyone in this room for that girl of hers. Lie.', { mood: 'smug' });
      await scored(api, 12, 'I', 'L', 'Can I trust you?', 'Yes.', false, [{ k: 'I', g: isaiahHigh ? 'T' : 'L' }, { k: 'A', g: 'L' }], 'The wires read what the answerer believes.');

      // Trader dragged out
      await api.narrate('The Judge lifts a single hand. The door bursts open. Two True Believers.');
      api.addNpc({ id: 'ch14_tbA', spec: 'tb_hippo', at: DP.door, facing: 'up' });
      api.addNpc({ id: 'ch14_tbB', spec: 'tb_boar', at: DP.door, facing: 'up' });
      var tp = api.npc('ch14_trader');
      var tt = { x: Math.floor(tp.x / 16), y: Math.floor((tp.y - 2) / 16) };
      await api.move('ch14_tbA', [tt.x - 1, tt.y], { speed: 60 });
      await api.say('trader', 'Father. Please-', { mood: 'fear' });
      await api.shake(300, 2);
      await api.say('trader', ['Father! I\'m sorry! Please don\'t, Father!'], { mood: 'cry' });
      await api.move('ch14_trader', DP.door, { speed: 40 });
      await api.say('judge', 'You\'re no son of mine.', { mood: 'angry' });
      api.hide('ch14_trader'); api.hide('ch14_tbA'); api.hide('ch14_tbB');
      api.sound('door');
      await api.narrate('The door slams. A silence so thick Luna thinks it might never end.');
      await api.think('The machine didn\'t read my words. It read me. I\'d sell any of them for Waverly. Even him.');

      /* ================= 6. RESULT + FALLOUT ================= */
      var lo = lowest(ST.s);
      api.log('[ld] FINAL A' + ST.s.A + ' I' + ST.s.I + ' L' + ST.s.L + ' loser=' + lo.k + (lo.tie ? ' TIE' : ''));
      await api.minigame('detector', { mode: 'final', before: ST.s, after: ST.s, loser: lo.k });
      api.lowerThird(null);
      await api.say('luna', 'It doesn\'t mean anything. Maybe the detector was wrong-', { mood: 'fear' });
      await api.say('judge', 'Surely you don\'t mean to imply that our top-notch government technology is faulty? I\'ll assume I misunderstood you, so long as it is not repeated.', { mood: 'smug' });
      await api.say('luna', 'Isaiah, we need to work together. For Delphin. For Kessie.');
      await api.say('isaiah', ['Don\'t say their names.', 'Annette may have drugged you, but you were still the one who revealed Kessie\'s secret.'], { mood: 'angry' });
      var cf = await api.choice([{ text: '"Kessie is the reason my mother is dead!"' }, { text: '(Bite it back.)' }]);
      if (cf === 0) {
        await api.say('luna', 'Kessie is the reason my mother is dead!', { mood: 'angry' });
        await api.narrate('Everyone stares. Even Annette looks surprised. Then, slowly, her smile returns.');
        await api.say('annette', 'Oh. So that\'s what it was. That explains why you required so little persuasion to talk.', { mood: 'smug' });
      } else {
        await api.think('Kessie is the reason they caught my mother at the door. I swallow it. It tastes like rust.');
        await api.say('annette', 'Oh, say it, dear. We all heard you think it.', { mood: 'smug' });
      }
      await api.say('isaiah', ['If you turn on people so quickly, then it doesn\'t matter if you have good intentions.', 'I can\'t trust you. I can\'t work with you.'], { mood: 'angry' });
      var mi = api.get('m_isaiah', 30);
      api.set('m_isaiah', mi < 20 ? mi : Math.max(20, mi - 20));
      await api.say('annette', 'Oh, Luna. You just lost your last ally.', { mood: 'smug' });
      var words = ['a single question', 'one question', 'two questions', 'three questions'];
      var ntv = Math.max(0, Math.min(3, api.get('n_tea_resisted', 0)));
      await api.say('annette', ntv === 0 ? 'You didn\'t hold out a single question under my tea, dear. Not one.' : 'You held out ' + words[ntv] + ' under my tea, dear. Not enough.', { mood: 'smug' });
      await api.say('isaiah', ['I will never, ever work with you. You\'re even worse.', 'You\'re both terrible people. And I can\'t wait to be away from you.'], { mood: 'angry' });
      await api.say('judge', ['How fascinating. But we are running out of time.', 'I hereby declare ' + (lo.k === 'L' ? 'Luna' : NAME[lo.k]) + ' the loser of the competition. As her consequence, Luna will be confined to her room until the private vote. One meal a day will be provided.', 'Take her away.'], { mood: 'smug' });
      api.approvalAdd(-5);
      await api.shake(300, 2);
      await api.say('luna', ['No- wait, Isaiah, please!', 'I didn\'t mean to hurt anyone! All I want is Waverly!'], { mood: 'cry' });
      await api.narrate('The last thing she sees before the door slams is his face. Haunted. Cold. Like she has become just another monster to him.');
      api.onAir(false); api.approval(false);
      await api.fadeOut(900);

      /* ================= 7. CONFINEMENT ================= */
      await api.titleCard('Tuesday', 'Confined', 2000);
      api.set('ch14_day', 1);
      await api.goRoom(H.luna, { at: LP.arrive, facing: 'up', fade: false });
      api.unlockPlayer();
      await api.fadeIn(700);
      await api.narrate('The key in the lock is the only warning before Ginerva strolls in, sets a woefully underfilled plate on the desk, and walks away without a word.');
      await api.think('I need the silence. I\'m grateful for that one small kindness.');
      api.set('ch14_ate', false);
      // confinement handlers
      api.onInteract('ch14_plate', async function (a) {
        if (a.get('ch14_ate')) { await a.think('An empty plate. One meal a day. I licked it clean.'); return; }
        a.set('ch14_ate', true);
        await a.narrate('One sausage, a spoon of grey beans, half a slice of bread. Luna eats every crumb.');
        await a.think('I\'ve gone hungry before so Waverly could eat. This is nothing. This is nothing.');
      });
      api.onInteract('tablet', async function (a) {
        await a.think('The wall tablet won\'t turn off. It used to show "curated memories" of Waverly. Today it shows something else.');
        await a.tv([{ speaker: 'franchesca_show', headline: 'THE LAST LIGHT - ON LOOP', text: 'Powerful. Winning will do that.', tag: 'REPLAY' }, { speaker: 'trader_young', headline: 'THE LAST LIGHT - ON LOOP', text: 'You won. You hear me? You won.', tag: 'REPLAY' }]);
        await a.think('Over and over. The win, the wrist, the speech. And then the tape cuts, and starts again.');
        a.set('ch14_sawTablet', true);
      });
      api.onInteract('falsville_book', async function (a) {
        await a.think('The Falsville book Trader brought. "Your daughter mailed this." Inside the cover, Waverly\'s slip of numbers.');
        var dec = a.get('f_note3_decoded', false);
        await a.note({ title: 'Inside the cover', text: '27-12-19-19 / 15-16-20 / 26-15-12 / 19-22-29-12-11 / 15-16-20' + (dec ? '\n\nTELL HIM SHE LOVED HIM' : '') });
        await a.think(dec ? 'Tell him she loved him. "The women in her family. They make you love them." Waverly, how did you know?' : 'I never worked it out. Seven Code. A is eight. Later. When I can think.');
      });
      api.onInteract('bed', async function (a) {
        var d = a.get('ch14_day', 1);
        if (d === 1) {
          var cc = await a.choice([{ text: 'Lie down. Let the day end.' }, { text: 'Not yet.' }]);
          if (cc === 0) a.set('ch14_slept1', true);
        } else await a.think('The silk is too cold. It always is.');
      });
      await api.until(function (f) { return f.ch14_slept1; }, { objective: 'Pass the day. (The bed ends it.)', targets: ['tablet', 'falsville_book', 'ch14_plate', 'bed'] });
      api.objective(null);
      api.lockPlayer();
      await api.narrate('The days flow into each other like a pond into a river. Isaiah\'s face. Waverly\'s twig-like arms. Over and over.');
      await api.fadeOut(800);

      /* ================= 8. GINERVA (Wednesday) ================= */
      api.set('ch14_day', 2);
      await api.titleCard('Wednesday', 'The day before release', 2000);
      api.teleport(LP.arrive, 'up');
      await api.fadeIn(700);
      await api.narrate('The key in the lock. Ginerva, at her usual time, with her usual plate. She sets it down. And then, instead of leaving, she opens her mouth. And closes it again.');
      api.addNpc({ id: 'ch14_gin', spec: 'ginerva', at: LP.door, facing: 'up' });
      api.face('player', 'ch14_gin');
      api.unlockPlayer();
      await api.waitForInteract('ch14_gin', { objective: 'Ginerva is waiting to say something.' });
      api.objective(null);
      api.lockPlayer();
      await api.say('ginerva', 'I was never in favor of you being a part of this. I knew he would get himself into trouble if he got you involved, but he just couldn\'t help himself after that business with your mother.', { mood: 'neutral' });
      await api.say('luna', 'Why are you telling me this?', { mood: 'tired' });
      await api.say('ginerva', 'Propriety is important, make no mistake. Trader was improper and therefore it is only fair that he suffer the consequences. And yet...', { mood: 'sad' });
      await api.say('luna', 'You care about him.');
      await api.think('Not just a childhood friend. She loves him. He only ever gave her the platonic kind back.');
      await api.narrate('Ginerva\'s fist strikes the desk with surprising power. A sausage rolls off the plate and under the bed. Neither of them pays it any mind.');
      await api.say('ginerva', ['Trader\'s life wasn\'t the only one ruined the day your mother decided to throw away her victory.', 'That stupid, stupid man. Now he\'s got himself into a position he can\'t charm his way out of, and there\'s nothing I can do but watch.'], { mood: 'angry' });
      await api.say('luna', 'But aren\'t you the one who turned him in? If you care so much, why would you do that?');
      await api.say('ginerva', 'I was given no choice. Information was reported to me that, had I failed to pass it on, I would have been sanctioned to the highest degree. Silas owns me. He has since I was a girl. I did my best to cushion the blow.', { mood: 'sad' });
      await api.say('ginerva', ['Did you know the Great Leader is watching this season personally?', 'If it ends in disgrace, the Judge loses the succession, and Trader is executed.', 'Trader doesn\'t know. Silas knows.'], { mood: 'fear' });
      addInsight(api, 'Ginerva\'s confession');
      await api.think('His own father knows the rope is around his son\'s neck. And he still had him dragged out like garbage.');
      await api.say('luna', 'Let\'s cut to the chase. What do you want from me?');
      await api.say('ginerva', ['Trader still has... affections for your mother, I believe. Despite what she did to him. He sees a lot of her in you.', 'You have the best chance of getting through to him. If you were to advise him to repent and prostrate himself before his father, there\'s a possibility he would take it under advisement.'], { mood: 'neutral' });
      var gc = await api.choice([{ text: '(Turn over.) "Sorry, but I have no interest in helping that monster."' }, { text: '"...All right. I\'ll talk to him. If I get the chance."' }]);
      if (gc === 0) {
        api.set('f_promised_ginerva', false);
        await api.say('luna', 'Sorry, but I have no interest in helping that monster.', { mood: 'tired' });
        await api.move('ch14_gin', LP.door, { speed: 40 });
        api.remove('ch14_gin');
        api.sound('door');
        await api.narrate('A few seconds later the door closes again. Alone in her own personal hell, Luna stuffs a ball of covers into her mouth, and screams.');
      } else {
        api.set('f_promised_ginerva', true);
        await api.say('luna', 'All right. I\'ll talk to him. If I get the chance.', { mood: 'tired' });
        await api.say('ginerva', 'Thank you.', { mood: 'sad' });
        await api.narrate('For a moment Ginerva looks like she might say something else. She smooths her dress instead, and goes.');
        api.remove('ch14_gin');
        api.sound('door');
        await api.think('I just promised to save the man who sold my mother\'s secrets. For a woman who sold his. This house makes liars of everyone. Even the machine knew that about me.');
      }

      /* ================= 9. THURSDAY NIGHT ================= */
      await api.fadeOut(900);
      api.set('ch14_day', 3);
      await api.slides([{ style: 'black', title: 'Thursday, 8 February', text: 'Tomorrow, the final private vote. Millions of people will tune in to find out who makes the final two.' }]);
      api.teleport(LP.window, 'up');
      await api.fadeIn(700);
      await api.think('The garden under the window, silver in the floodlights. The fence. The road beyond it.');
      await api.think('If it reads what we believe, then Annette only believes the tape. Then I don\'t know what happened to my mother. Not yet.');
      await api.think('Hang on, Waverly. I\'m coming for you soon.');
      api.unlockPlayer();
      api.completeChapter();
    }
  });
})();
