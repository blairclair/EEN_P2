/* =========================================================================
 * ch13 "Ashamed of Yourselves"  (Fri 2 Feb evening -> Sun 4 Feb 2084)
 *
 * 1. Doll Room, the last thirty minutes: free roam + a memory hub with
 *    Delphin (each memory +5 m_delphin, a 30-minute clock), promises.
 * 2. Courtroom, public vote 3 (a vote to SAVE): the Judge's counting rhyme,
 *    Delphin's speech (laugh -> "ashamed" -> "take to the streets", Frog
 *    gags him), Luna forfeits or speaks, the SAVE count (custom minigame
 *    'savecount'): Luna survives by 200. Margins scale with m_audience; the
 *    200 gap is fixed.
 * 3. Vignette (3rd person, play as Delphin): the amphitheatre, the Council
 *    of Four and Senator Humbert, the hyena and the toy, the patter, the
 *    Council's method vote (vote minigame, rigged), the gallows, the
 *    "blank yourself out" QTE, the joke with no punchline.
 * 4. Screening room: Isaiah's 75 seconds (snap / bite tongue), Annette's
 *    "Power, my dear".
 * 5. Free roam to the library (Trader mopping in the Red Hall): apology,
 *    Joe and Waverly stories, the blank scroll.
 * 6. Saturday night: write the note at the desk (maze pen, or Delphin's
 *    eyeliner), stealth across the Red Hall, tuck it under the bucket in the
 *    supply closet (no camera), glimpse Trader mopping the foyer.
 * 7. Sunday: Trader returns the Falsville book. Note 3 decode (Seven Code).
 *
 * Source: D3b L3341-3640 (farewell, vote, execution, aftermath), ONT L66
 * (speech shape), ONT L120 (Humbert at the execution), LONG L38, PLAN L13.
 * Canon edits: collars -> chips; "Meeting Luna" -> "Seeing Luna again";
 * "first friend I made as an adult" -> "the first friend I ever had";
 * Latin -> Franchesca's counting rhyme; vote to SAVE.
 *
 * CROSS-CHAPTER FLAGS (CHAPTERS.md §2)
 *   Reads:  f_salina_forgiven, f_delphin_secret, m_delphin (>=60 extra
 *           farewell lines), f_has_pen, f_note2_decoded, m_audience,
 *           m_isaiah, f_code_learned
 *   Sets:   m_delphin (+5 per memory), m_audience (+10 forfeit / -5 speak),
 *           m_isaiah (-10 snap, +20 apology), f_isaiah_reconciled,
 *           f_trader_note_left, f_note3_decoded, m_trader_insight (+1 on
 *           decode, max 7), m_waverly (+5 decode / -10 give up)
 * Local flags: ch13_*
 *
 * SHARED ROOMS (keyed by shared id): house_doll_room, house_gym_courtroom,
 * execution_amphitheatre, house_screening_room, house_library,
 * house_bedroom_hall, house_luna_room, house_delphin_room, house_foyer,
 * house_red_hall, house_supply_closet. Amphitheatre/screening NPC tiles snap
 * to the nearest walkable tile as a guard against later layout edits.
 * ========================================================================= */
(function () {
  'use strict';

  var ID = 'ch13';
  var H = {
    doll: 'house_doll_room', court: 'house_gym_courtroom', amph: 'execution_amphitheatre',
    screen: 'house_screening_room', library: 'house_library', bedhall: 'house_bedroom_hall',
    room: 'house_luna_room', delphinRoom: 'house_delphin_room', foyer: 'house_foyer',
    hall: 'house_red_hall', closet: 'house_supply_closet'
  };
  var LOCAL_IDS = Object.keys(H).map(function (k) { return H[k]; });
  var NOTE3 = '27-12-19-19/15-16-20/26-15-12/19-22-29-12-11/15-16-20';      // CANON §8 N3: TELL HIM SHE LOVED HIM
  var NOTE3_SHOWN = '27-12-19-19 / 15-16-20 / 26-15-12 / 19-22-29-12-11 / 15-16-20';

  /* ---------------------------------------------------------------------
   * helpers
   * ------------------------------------------------------------------- */
  function has(name) { return !!(G.shared && G.shared.has && G.shared.has(name)); }
  function mark(mapId, name, fb) {
    var D = G.shared && G.shared.data;
    var v = D && ((D.marks && D.marks[mapId] && D.marks[mapId][name]) || (D.spawns && D.spawns[mapId] && D.spawns[mapId][name]));
    return v ? v.slice() : fb.slice();
  }
  /** Nearest walkable tile to xy in a map def (so NPCs never sit inside walls of a layout we didn't draw). */
  function snap(def, xy) {
    var leg = {}, L = G.Map.LEGEND;
    Object.keys(L).forEach(function (k) { leg[k] = L[k]; });
    Object.keys(def.legend || {}).forEach(function (k) { leg[k] = def.legend[k]; });
    function solid(x, y) {
      var row = def.tiles[y]; if (!row || x < 0 || x >= row.length) return true;
      var t = leg[row[x]]; if (t == null) return true;
      var name = typeof t === 'string' ? t : t.tile;
      var d = G.lookup('tiles', name);
      return !d || !!d.solid;
    }
    var seen = {}, q = [[xy[0], xy[1]]];
    while (q.length) {
      var p = q.shift(), k = p[0] + ',' + p[1];
      if (seen[k]) continue; seen[k] = 1;
      if (!solid(p[0], p[1])) return p;
      if (Object.keys(seen).length > 400) break;
      q.push([p[0] + 1, p[1]], [p[0] - 1, p[1]], [p[0], p[1] + 1], [p[0], p[1] - 1]);
    }
    return xy;
  }
  function clampMeter(api, k, d, max) {
    var v = Math.max(0, Math.min(max || 100, (+api.get(k, 0) || 0) + d));
    api.set(k, v);
    return v;
  }
  function px(g, x, y, w, h, c) { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), w, h); }

  /* Holoscreen state for the courtroom (read by the shared holoscreen prop). */
  var HOLO = { on: false, l: 0, r: 0 };

  /** A shared house/off-site room extended with ch13 content (every ch13 room is shared now). */
  function room(name, ext) {
    if (!has(name)) throw new Error('ch13: shared room missing: ' + name);
    return G.shared.map(name, ext || {});
  }

  /* ---------------------------------------------------------------------
   * CAST (one-offs only; everyone else comes from shared/cast.js)
   * ------------------------------------------------------------------- */
  var cast = {
    frog: { extends: 'tb_frog', name: 'Frog' },
    dog: { extends: 'tb_dog', name: 'Dog' },
    trader_mop: { extends: 'trader', name: 'Trader', outfit: '#d8d4cc', outfit2: '#bdb8ae', accessory: ['bandage'] },
    toy_kid: { extends: 'kid', name: 'Little Boy', outfit: '#3a6ac8' },
    toy_mom: { extends: 'audience', name: 'Mother', hairStyle: 'bun', style: 'coat', outfit: '#6a3a4a' },
    crowd_voice: { name: 'The Crowd' }
  };

  /* ---------------------------------------------------------------------
   * PROPS
   * ------------------------------------------------------------------- */
  var props = {
    eyeliner: function (g, x, y, t) { px(g, x + 5, y + 7, 7, 2, '#111'); px(g, x + 11, y + 7, 2, 2, '#3a3a40'); if (Math.sin(t * 3) > 0.6) px(g, x + 6, y + 6, 1, 1, '#fff'); },
    book13: function (g, x, y) { px(g, x + 3, y + 5, 10, 8, '#3a6aa8'); px(g, x + 3, y + 5, 1, 8, '#22406a'); px(g, x + 5, y + 7, 6, 1, '#e8d080'); px(g, x + 11, y + 4, 2, 3, '#f0ead8'); },
    mopbucket: function (g, x, y, t) { px(g, x + 3, y + 9, 9, 6, '#d8b030'); px(g, x + 3, y + 9, 9, 1, '#f0d050'); px(g, x + 9, y - 6, 1, 16, '#8a6a40'); px(g, x + 7, y + 9, 5, 2, '#c8c8c0'); },
    brick: function (g, x, y) { px(g, x + 3, y + 10, 10, 5, '#9a3a2a'); px(g, x + 3, y + 10, 10, 1, '#c05a40'); },
    scroll: function (g, x, y) { px(g, x + 3, y + 6, 10, 6, '#f2efe4'); px(g, x + 2, y + 5, 2, 8, '#d8d0b8'); px(g, x + 12, y + 5, 2, 8, '#d8d0b8'); }
  };

  /* ---------------------------------------------------------------------
   * MAPS
   * ------------------------------------------------------------------- */
  var UPX = (G.shared && G.shared.data && G.shared.data.upstairs && G.shared.data.upstairs.extras) || {};
  function extra(k, fb) { return UPX[k] ? G.cloneDef(UPX[k]) : fb; }

  var DOLL = {
    delphin: [13, 9], frog: [3, 11], judge: [11, 2], luna: [8, 10]
  };

  function buildMaps() {
    var maps = {};

    /* --- Doll Room: the last thirty minutes --- */
    maps[H.doll] = room(H.doll, {
      npcs: [
        { id: 'delphin', at: DOLL.delphin, spec: 'delphin', facing: 'left', talk: function (api) { return farewell(api); } },
        { id: 'frog', at: DOLL.frog, spec: 'frog', facing: 'up', turn: false,
          talk: [{ narrate: 'Frog does not answer. The gold mask tilts, a fraction, toward the clock on its wrist.' }] },
        { id: 'judge_doll', at: DOLL.judge, spec: 'judge_white', facing: 'down', if: '!ch13_judgeLeft' }
      ],
      objects: [
        extra('judgeThrone', { id: 'judge_throne', at: [11, 1], prop: 'podium', solid: true, examine: [{ think: "The Judge's throne." }] }),
        (function () { var c = extra('checkersTable', { id: 'checkers_table', at: [8, 6], prop: 'box', solid: true }); c.examine = [{ think: "Annette's red king is still sitting on my last square. Nobody has cleared the board. They want me to look at it." }]; return c; })()
      ],
      patch: {
        samantha: { examine: [{ think: 'Samantha. Delphin calls her "the only honest face in the building". Her eyes are the lens.' }, { think: 'I bopped her on the nose this afternoon. I would do it again.' }] },
        window_rain: { examine: [{ think: 'Rain over the parking lot. Thirty minutes of it, and then the rest of my life or none of it.' }] }
      }
    });

    /* --- The courtroom: public vote 3 --- */
    var CM = function (n, fb) { return mark(H.court, n, fb); };
    maps[H.court] = room(H.court, {
      ambient: 'crowd',
      npcs: [
        { id: 'c_judge', at: CM('judge_bench', [10, 2]), spec: 'judge_robe', facing: 'down', turn: false },
        { id: 'c_delphin', at: CM('defendant_left', [8, 8]), spec: 'delphin', facing: 'up', turn: false },
        { id: 'c_frog', at: CM('tb_left', [7, 12]), spec: 'frog', facing: 'up', turn: false },
        { id: 'c_dog', at: CM('tb_right', [13, 12]), spec: 'dog', facing: 'up', turn: false },
        { id: 'c_trader', at: [20, 3], spec: 'trader', facing: 'left', turn: false },
        { id: 'c_isaiah', at: CM('contestant_1', [17, 4]), spec: 'isaiah', facing: 'left', turn: false },
        { id: 'c_annette', at: CM('contestant_2', [17, 5]), spec: 'annette', facing: 'left', turn: false }
      ],
      patch: {
        holoscreen: {
          left: function () { return HOLO.on ? 'LUNA' : null; },
          right: function () { return HOLO.on ? 'DELPHIN' : null; },
          leftVotes: function () { return HOLO.on ? HOLO.l.toLocaleString('en-US') : '—'; },
          rightVotes: function () { return HOLO.on ? HOLO.r.toLocaleString('en-US') : '—'; }
        }
      }
    });

    /* --- The amphitheatre: Delphin's hanging --- */
    var AM = function (n, fb) { return mark(H.amph, n, fb); };
    var cf = AM('crowd_front', [9, 12]);
    var stageFront = AM('stage_front', [15, 6]);
    var amphNpcs = [
      { id: 'a_judge', at: AM('judge', [18, 6]), spec: 'judge_white', facing: 'down', turn: false },
      { id: 'a_medic', at: [AM('gallows', [20, 4])[0] + 1, AM('gallows', [20, 4])[1]], spec: 'medic', facing: 'left', turn: false },
      { id: 'a_tiger', at: [9, 8], spec: 'council_tiger', facing: 'up', turn: false },
      { id: 'a_bear', at: [10, 8], spec: 'council_bear', facing: 'up', turn: false },
      { id: 'a_hyena', at: [11, 8], spec: 'council_hyena', facing: 'up', turn: false },
      { id: 'a_vulture', at: [12, 8], spec: 'council_vulture', facing: 'up', turn: false },
      { id: 'a_humbert', at: [13, 8], spec: 'humbert', facing: 'up', turn: false },
      { id: 'a_kid', at: [6, 8], spec: 'toy_kid', facing: 'right', turn: false },
      { id: 'a_mom', at: [5, 8], spec: 'toy_mom', facing: 'right', turn: false },
      { id: 'a_tb1', at: AM('security_3', [18, 8]), spec: 'tb', facing: 'up', turn: false },
      { id: 'a_tb2', at: AM('security_4', [21, 8]), spec: 'tb', facing: 'up', turn: false }
    ];
    for (var i = 0; i < 6; i++) amphNpcs.push({ id: 'a_fan' + i, at: [cf[0] + 1 + i * 2, cf[1]], spec: G.shared.extra('audience', 1300 + i), facing: 'up', turn: false });
    var amph = room(H.amph, { remove: ['gurney'], npcs: amphNpcs, objects: [{ id: 'ch13_brick', at: AM('gallows', [20, 4]), prop: 'brick', solid: false, layer: -1 }] });
    amph.npcs.forEach(function (n) { if (/^a_/.test(n.id)) n.at = snap(amph, n.at); });
    void stageFront;
    maps[H.amph] = amph;

    /* --- Screening room --- */
    var scr = room(H.screen, {
      npcs: [
        { id: 's_isaiah', at: mark(H.screen, 'seat_1', [3, 2]), spec: 'isaiah', facing: 'up', turn: false, if: '!ch13_isaiahFled' },
        { id: 's_annette', at: mark(H.screen, 'seat_6', [8, 4]), spec: 'annette', facing: 'up', turn: false }
      ]
    });
    scr.npcs.forEach(function (n) { if (/^s_/.test(n.id)) n.at = snap(scr, n.at); });
    maps[H.screen] = scr;

    /* --- Library: Isaiah --- */
    var LM = function (n, fb) { return mark(H.library, n, fb); };
    var ic = LM('isaiah_chair', [7, 6]);
    maps[H.library] = room(H.library, {
      npcs: [{ id: 'isaiah_lib', at: [ic[0], ic[1] + 1], spec: 'isaiah', facing: 'left', turn: false }],
      objects: [{ id: 'ch13_scroll', at: [ic[0] - 1, ic[1] + 2], prop: 'scroll', solid: false, if: 'ch13_scrollOut',
        examine: [{ think: 'The scroll is not blank any more. Two plans, side by side, in Isaiah\'s tiny handwriting.' }] }]
    });

    /* --- Red Hall: Trader mopping in the afternoon --- */
    maps[H.hall] = room(H.hall, {
      npcs: [{ id: 'trader_hall', at: [24, 2], spec: 'trader_mop', facing: 'left', if: 'ch13_phase == afternoon',
        talk: async function (api) {
          await api.think('Trader. Mopping. A True Believer leans on the wall and watches him do it.');
          await api.say('trader', 'Mind the wet floor, Miss Bartley.', { mood: 'tired' });
          await api.think('He doesn\'t look up. When he is done he carries the bucket into the supply closet and shuts the door behind him.');
          api.set('ch13_sawTraderMop', true);
        } }],
      objects: [{ id: 'ch13_hall_bucket', at: [25, 2], prop: 'mopbucket', solid: true, if: 'ch13_phase == afternoon',
        examine: [{ think: 'A yellow mop bucket. The Host of Right to Life\'s new co-star.' }] }]
    });

    /* --- Supply closet --- */
    maps[H.closet] = room(H.closet, {
      patch: { closet_bucket: { prop: 'mopbucket', examine: [{ think: 'His bucket. The mop head is still damp. He comes here every morning.' }] } }
    });

    /* --- Foyer: Trader at night --- */
    maps[H.foyer] = room(H.foyer, {
      npcs: [{ id: 'trader_foyer', at: [8, 8], spec: 'trader_mop', facing: 'left', turn: false, if: 'ch13_noteLeft && !ch13_foyerDone' }]
    });

    /* --- Bedroom hall --- */
    maps[H.bedhall] = room(H.bedhall, {
      objects: [{ id: 'ch13_door6', at: [mark(H.bedhall, 'door_6', [21, 4])[0] + 1, 5], solid: false, layer: 1,
        draw: function (g, x, y) { px(g, x + 3, y + 4, 10, 6, '#f0ead8'); px(g, x + 4, y + 6, 8, 1, '#e8323c'); },
        examine: [{ think: 'Door 6. Somebody has already peeled his name off. Underneath, in marker, someone wrote LET ME OUT.' }, { think: 'His handwriting. Of course it is.' }] }]
    });

    /* --- Luna's room --- */
    maps[H.room] = room(H.room, {
      npcs: [{ id: 'trader_sun', at: mark(H.room, 'door', [4, 8]), spec: 'trader_mop', facing: 'up', if: 'ch13_phase == sunday && !ch13_bookGiven' }],
      // 'desk' is a fixture id in EVERY shared bedroom, so waitForInteract('desk') would fire in Delphin's room too.
      remove: ['desk'],
      objects: [{ id: 'ch13_desk', at: (function () { var d = UPX && G.shared.data.upstairs.find && G.shared.data.upstairs.find(H.room, 'desk'); return d ? d.at : [1, 7]; })(),
        examine: [{ think: 'A writing desk. Everything on it belongs to them.' }] }]
    });

    /* --- Delphin's room (eyeliner) --- */
    var dr = room(H.delphinRoom, {
      objects: [{ id: 'ch13_eyeliner', at: [2, 2], prop: 'eyeliner', solid: false, if: '!ch13_hasEyeliner',
        examine: async function (api) {
          await api.think('His liner pencil, worn down to a stub. He did his eyes every single morning, even the morning of the maze.');
          await api.think('I\'m sorry. I\'m borrowing it. You\'d have insisted.');
          api.set('ch13_hasEyeliner', true);
          api.remove('ch13_eyeliner');
        } }]
    });
    dr.objects.forEach(function (o) { if (o.id === 'ch13_eyeliner') o.at = mark(H.delphinRoom, 'desk', [2, 2]); });   // on the floor by his desk: stand on it to pick it up
    maps[H.delphinRoom] = dr;

    gateExits(maps);
    return maps;
  }

  /* ---------------------------------------------------------------------
   * EXIT GATES: which doors are open in which phase
   * ------------------------------------------------------------------- */
  function needEyeliner(f) { return !f.f_has_pen && !f.ch13_hasEyeliner; }
  var GATE = {};
  GATE[H.library] = { open: function (f) { return f.ch13_phase === 'afternoon'; }, text: 'Not now.' };
  GATE[H.hall] = { open: function (f, from) { return f.ch13_phase === 'afternoon' || (f.ch13_phase === 'night' && (f.ch13_noteWritten || from !== H.foyer)); },
    text: function (f) { return f.ch13_phase === 'night' ? 'Not yet. The note first. Write it before I lose my nerve.' : 'Not now.'; } };
  GATE[H.foyer] = { open: function (f) { return f.ch13_phase === 'afternoon' || f.ch13_phase === 'night'; }, text: 'Not now.' };
  GATE[H.bedhall] = { open: function (f, from) {
    if (f.ch13_phase === 'afternoon') return true;
    if (f.ch13_phase !== 'night') return false;
    if (from === H.room) return f.ch13_noteWritten || needEyeliner(f);
    return true;
  }, text: function (f) { return f.ch13_phase === 'night' ? 'The desk first. The note.' : 'Not now.'; } };
  GATE[H.room] = { open: function (f) { return f.ch13_phase === 'night'; }, text: 'Not now. Isaiah is somewhere in this house on his own.' };
  GATE[H.delphinRoom] = { open: function (f) { return f.ch13_phase === 'night' && needEyeliner(f); }, text: function (f) { return f.ch13_phase === 'night' ? 'I have what I came for.' : 'I can\'t. Not yet.'; } };
  GATE[H.closet] = { open: function (f) { return f.ch13_phase === 'night' && f.ch13_noteWritten; }, text: function (f) { return f.ch13_phase === 'afternoon' ? 'His closet now. Later.' : 'Not now.'; } };

  function gateExits(maps) {
    Object.keys(maps).forEach(function (id) {
      (maps[id].exits || []).forEach(function (e) {
        if (!e.to) return;
        var prev = e.locked, prevText = e.lockedText;
        if (LOCAL_IDS.indexOf(e.to) < 0) return;            // shared logic already locks unregistered targets
        var gate = GATE[e.to];
        if (!gate) { e.locked = function () { return true; }; e.lockedText = [{ think: 'Not that way.' }]; return; }
        e.locked = function (f) { return !gate.open(f, id) || (prev != null ? G.Script.check(prev) : false); };
        e.lockedText = function (api) {
          if (prev != null && G.Script.check(prev) && gate.open(api.flags, id)) return G.Script.runHandler(prevText, null, api);
          return api.think(typeof gate.text === 'function' ? gate.text(api.flags) : gate.text);
        };
      });
    });
  }

  /* ---------------------------------------------------------------------
   * MINIGAME: the SAVE count (holoscreen, two bars, the Judge's countdown)
   * ------------------------------------------------------------------- */
  var minigames = {
    savecount: {
      autoSolve: function (p) { HOLO.on = true; HOLO.l = p.left; HOLO.r = p.right; return { success: true, left: p.left, right: p.right }; },
      start: function (ctx) {
        var p = ctx.params, R = ctx.R, W = ctx.W, Hh = ctx.H, dur = p.duration || 12;
        var lastSec = -1, endT = -1;
        function val(fin, t, phase, amp) {
          var k = Math.min(1, t / dur), e = 1 - Math.pow(1 - k, 2.2);
          var wob = amp * Math.sin(t * 1.7 + phase) * Math.sin(Math.PI * k);
          return Math.max(0, Math.round(fin * e + wob));
        }
        return new Promise(function (resolve) {
          ctx.loop(function () {
            var t = ctx.t;
            if (t < dur) {
              var s = Math.ceil(dur - t);
              if (s !== lastSec) { lastSec = s; if (s <= 10) ctx.sound('blip'); }
            } else if (endT < 0) { endT = t; ctx.sound('reveal'); HOLO.on = true; HOLO.l = p.left; HOLO.r = p.right; }
            if (endT >= 0 && t - endT > 1.2 && (ctx.input.pressed('ok') || t - endT > 7)) resolve({ success: true, left: p.left, right: p.right });
          }, function () {
            var t = Math.min(ctx.t, dur);
            var l = ctx.t >= dur ? p.left : val(p.left, t, 0, 9000), r = ctx.t >= dur ? p.right : val(p.right, t, 1.9, 14000);
            HOLO.on = true; HOLO.l = l; HOLO.r = r;
            R.rect(0, 0, W, Hh, '#07040c');
            R.static(0.05);
            ctx.header(p.title || 'PUBLIC VOTE', 'VOTE TO SAVE • LIVE');
            var max = Math.max(p.left, p.right) * 1.04;
            [[l, 'luna', 'LUNA BARTLEY', 70, p.lunaMood || 'fear'], [r, 'delphin', 'DELPHIN NEUTRINO', 230, p.delphinMood || 'smug']].forEach(function (c) {
              var x = c[3];
              R.panel(x - 4, 34, 92, 128, { accent: '#4aff8a' });
              R.img(ctx.portrait(c[1], c[4]), x + 22, 40, 1);
              R.text(c[2], x + 42, 84, { size: 7, align: 'center', color: '#f2efe8' });
              var bh = Math.round(60 * (c[0] / max));
              R.rect(x + 30, 156 - 60, 24, 60, '#1a1a24');
              R.rect(x + 30, 156 - bh, 24, bh, '#4aff8a', 0.85);
              R.text('SAVE ' + c[0].toLocaleString('en-US'), x + 42, 164, { size: 8, align: 'center', color: '#4aff8a' });
            });
            R.text('VS', W / 2, 92, { size: 14, align: 'center', font: 'title', color: '#d4a83a' });
            if (ctx.t < dur) {
              var s = Math.ceil(dur - ctx.t);
              R.text(s <= 10 ? String(s) : 'CASTING', W / 2, 118, { size: s <= 10 ? 16 : 7, align: 'center', color: '#e8323c' });
              ctx.footer('The Judge taps his gavel in time.');
            } else {
              R.text('THE RESULTS ARE IN', W / 2, 118, { size: 9, align: 'center', color: '#f2efe8' });
              R.text('MARGIN: ' + Math.abs(p.left - p.right) + ' VOTES', W / 2, 132, { size: 7, align: 'center', color: '#d4a83a' });
              ctx.footer('[E] continue');
            }
          });
        });
      }
    }
  };

  /* =====================================================================
   * SCENES
   * =================================================================== */

  /* ---------------- 1. The Doll Room: the last thirty minutes ---------------- */
  var TOPICS = [
    { key: 'banister', text: '"Remember when we slid down the bannisters?"', run: async function (api) {
      await api.say('luna', 'Remember when we slid down the bannisters? And you nearly took out that camera guy?');
      await api.say('delphin', 'How could I forget? Pretty sure I saw my life flash before my eyes.', { mood: 'happy' });
      await api.say('luna', 'You were grinning the whole time.');
      await api.say('delphin', 'What can I say? I\'m a thrill-seeker.', { mood: 'smug' });
    } },
    { key: 'toast', text: '"You still owe me the less burnt toast."', run: async function (api) {
      await api.say('luna', 'You still owe me the less burnt toast. Tuesday. You switched the plates when Ginerva sneezed.');
      await api.say('delphin', 'Allegedly. And the tribunal will note the defendant ate every crumb of the evidence.', { mood: 'smug' });
      await api.think('Stupid arguments. Pranks behind doors. Tag in the empty halls. Little pockets of joy we stole in here.');
    } },
    { key: 'tag', text: '"Tag. In the Columbus yard."', run: async function (api) {
      await api.say('luna', 'Do you remember tag in the Columbus yard? You were "it" for a whole summer.');
      await api.say('delphin', 'Because somebody\'s little shadow was faster than both of us and I refused to admit it.', { mood: 'happy' });
      if (api.get('f_salina_forgiven', true)) {
        await api.say('delphin', 'She used to cheat. Cut through the bushes and come out behind you. Laughing so hard she gave herself away.', { mood: 'sad' });
        await api.think('He can say her name to me now, almost. That\'s new. That\'s eighteen years of new.');
      } else {
        await api.say('delphin', '...Anyway.', { mood: 'sad' });
        await api.think('He stops before her name. We both do.');
      }
    } },
    { key: 'isaiah', text: '"If Isaiah hadn\'t voted for me..."', run: async function (api) {
      await api.say('luna', 'This is my fault. If Isaiah hadn\'t—');
      await api.say('delphin', 'Whoa, whoa, whoa. Don\'t start that martyr thing. It\'s not a good look on you.');
      await api.say('delphin', 'Ah, the rich boy scapegoat. Poor kid finally gets a chance to screw up just like the rest of us, and you want to pin it all on him?', { mood: 'smug' });
      await api.say('luna', 'He voted for me.');
      await api.say('delphin', 'He did. But Annette played him like a violin. Don\'t be too hard on him. He\'s a good kid. Just confused.');
      api.set('ch13_isaiahDefended', true);
    } },
    { key: 'run', text: '"What if we ran for it?"', run: async function (api) {
      await api.say('luna', 'What if we ran for it? If we could get Isaiah to join us, we might stand a chance against the True Believers.');
      await api.say('delphin', 'Big swing there, red. What\'s the plan? Overwhelm him with my charm while you disable the chips?', { mood: 'happy' });
      await api.say('luna', 'I\'m serious.');
      await api.say('delphin', 'And then what? We\'d get five steps past that fence before the chips kicked in and turned us into crispy critters.', { mood: 'sad' });
      await api.say('delphin', 'But hey, doesn\'t hurt to dream, right? I\'ve had more than a few of my own of toppling that asshole.');
      await api.say('luna', 'We have to play the game.');
      await api.say('delphin', 'We do indeed.');
    } },
    { key: 'annette', text: '"Annette needs to go down."', run: async function (api) {
      await api.say('luna', 'Annette needs to go down. She\'s too dangerous.');
      await api.say('delphin', 'That woman\'s like a cockroach. You can stomp and stomp, and she\'ll still scuttle away with half her legs. But yeah, she\'ll get hers.');
      await api.say('luna', 'Optimistic for someone about to beg for his life.');
      await api.say('delphin', 'Hey, I\'m a glass-half-full kind of guy. Even if it\'s filled with poison.', { mood: 'smug' });
      await api.think('He taps his left forearm, where the chip sits under the skin, like it is a joke we both get.');
    } }
  ];
  var MIN_PER_TOPIC = 4;

  async function farewell(api) {
    var done = api.get('ch13_topics', 0);
    var mins = 30 - done * MIN_PER_TOPIC;
    var opts = TOPICS.map(function (t) { return { text: t.text, if: '!ch13_t_' + t.key }; });
    opts.push({ text: '"Promise me something."', if: function (f) { return (f.ch13_topics || 0) >= 2; } });
    opts.push('(Sit with him a moment.)');
    if (mins <= 30 - TOPICS.length * MIN_PER_TOPIC) { await promises(api); return; }
    var c = await api.choice(opts, { prompt: 'Thirty minutes. About ' + mins + ' left.' });
    if (c < TOPICS.length) {
      var t = TOPICS[c];
      await t.run(api);
      api.set('ch13_t_' + t.key, true);
      api.set('ch13_topics', done + 1);
      var v = clampMeter(api, 'm_delphin', +5);
      api.log('m_delphin -> ' + v);
      api.objective('Thirty minutes with Delphin (' + Math.max(0, mins - MIN_PER_TOPIC) + ' left)', { target: 'delphin' });
    } else if (c === TOPICS.length) {
      await promises(api);
    } else {
      await api.think('We sit on the floor with our backs against the wall and say nothing. It is the most comfortable silence I have had in a month.');
    }
  }

  async function promises(api) {
    await api.say('delphin', 'You know, I could always tell the audience to vote for you.');
    await api.say('luna', 'No. I don\'t want to win like that. I\'d never be able to look Waverly in the eye if I let someone sacrifice themself for me.');
    await api.say('delphin', 'You\'re too stubborn for your own good. And way too noble.', { mood: 'smug' });
    await api.say('luna', 'Takes one to know one.');
    if (api.get('f_delphin_secret', true)) {
      await api.say('delphin', 'Funny. You know the worst thing I ever did, and you\'re still sitting on this floor with me.', { mood: 'sad' });
    }
    await api.narrate('When the thirty minutes are nearly up, Delphin pulls her into a hug. She freezes, then holds on like he is the only anchor in a storm.');
    await api.say('luna', 'No matter what happens, Delphin... thank you. For everything. Your sister would be proud of you.');
    if (api.get('f_salina_forgiven', true)) {
      await api.say('delphin', 'Same to you, red.', { mood: 'sad' });
    } else {
      await api.emote('delphin', '…', 1200);
      await api.think('He opens his mouth and nothing comes out. Eighteen years, and I still can\'t give him that, and he still can\'t take it.');
    }
    await api.say('luna', 'I have a favor to ask you. If you do beat me in this vote... you can\'t let Annette win. I really do believe she might go after Waverly purely out of spite.');
    await api.say('delphin', 'I promise. Do you?');
    await api.say('luna', 'I do. And if you do manage to win this whole thing.. Check in on my daughter, will you? I\'m not asking you to raise her. But keep an eye on her. Even a single listening ear can make a huge difference to a kid in the homes.');
    await api.say('delphin', 'You know I will.');
    if (api.get('m_delphin', 15) >= 60) {
      api.set('ch13_extraFarewell', true);
      await api.say('delphin', 'Hey, red. In another world... you\'d have been my best friend.', { mood: 'sad' });
      await api.say('luna', 'In this one too.');
      await api.say('delphin', 'In this one too, red.', { mood: 'happy' });
    }
    api.set('ch13_farewellDone', true);
  }

  async function sceneDoll(api) {
    api.setPlayer('luna');
    await api.goRoom(H.doll, { at: DOLL.luna, facing: 'up' });
    await api.titleCard('Ashamed of Yourselves', 'Friday 2 February, evening', 2600, { kicker: 'WEEK 4' });
    await api.say('judge', 'Luna and Delphin. You will face each other in the public vote. Use the next thirty minutes wisely.', { mood: 'smug' });
    await api.move('judge_doll', [11, 4]);
    await api.move('judge_doll', [5, 12]);
    api.hide('judge_doll');
    api.set('ch13_judgeLeft', true);
    await api.think('He says it like he is handing us a gift. Thirty minutes. Then one of us dies.');
    await api.think('From the very first day I swore I would not get attached to anyone in here. And then a boy who used to teach me how to pick locks at Columbus walked back into my life with blue hair and a joke for everything.');

    await api.until(function (f) { return f.ch13_farewellDone; }, { objective: 'Thirty minutes with Delphin (30 left)', targets: ['delphin'] });
    api.objective(null);
    await api.narrate('Frog raps a gloved knuckle on the door frame. Time.');
    await api.think('We walk into the unknown side by side, knowing only one of us will walk out.');
  }

  /* ---------------- 2. The courtroom: public vote 3 ---------------- */
  async function sceneVote(api) {
    await api.fadeOut(500);
    await api.goRoom(H.court, { at: mark(H.court, 'defendant_right', [12, 8]), facing: 'up', fade: false });
    api.lockPlayer();
    await api.fadeIn(600);
    api.onAir(true);
    api.approval(true);
    api.lowerThird('PUBLIC VOTE 3', 'Bartley vs Neutrino • VOTE TO SAVE');
    await api.think('This is our third public vote. Twice I have stood on the bench and watched people I came to know as more than their crimes try to justify their existence. Today it is my turn.');
    await api.think('The world is watching. Waverly is watching.');
    api.lowerThird(null);
    await api.say('judge', 'You\'ve been given many chances. So many opportunities to prove your worth. And yet you stand before us today, your souls naked and open before the world.');
    await api.say('judge', 'If I had my way, no one who commits the atrocities you\'ve committed would be spared. Perhaps one day, my way will become reality. You each have five minutes to plead your case.');

    // the counting rhyme
    await api.narrate('The Judge closes his eyes and swings his gavel back and forth between them, murmuring under his breath.');
    await api.think('I know that rhythm. Kids do it with their hands in the yard when they have to choose. And before that...');
    await api.slides([{ style: 'montage', title: 'A kitchen, a long time ago', text: '"My mother said to pick the very best one and you... are... it!"' }]);
    await api.think('Mom. That was my mother\'s rhyme. How does he know my mother\'s rhyme?');
    api.set('ch13_heardRhyme', true);
    await api.emote('c_judge', '!', 600);
    await api.say('judge', 'You first, boy. Go on. Engage us.', { mood: 'smug' });

    // Delphin's speech: the laugh, then the shame
    await api.say('delphin', 'Oh, I\'ll engage you alright.');
    await api.move('c_delphin', [mark(H.court, 'mic', [10, 7])[0] - 1, mark(H.court, 'mic', [10, 7])[1]]);
    api.face('c_delphin', 'down');
    await api.say('delphin', 'Evening, America. You know they told me this show was about redemption? I said great. Do you take coupons?', { mood: 'smug' });
    api.sound('applause');
    await api.narrate('The bleachers laugh.');
    await api.say('delphin', 'No, really. I\'ve been redeemed so hard this month my chip has a loyalty card. Two more executions and I get a free one.', { mood: 'happy' });
    api.sound('applause');
    api.approvalAdd(+3);
    await api.narrate('They are beside themselves. A man in the front row is wiping his eyes.');
    await api.say('delphin', 'Oh, you like that, do you?', { mood: 'happy' });
    await api.say('crowd_voice', 'YES!', { portrait: false });
    await api.say('delphin', 'Well, you should all be ashamed of yourselves.');
    await api.narrate('A few uncomfortable chuckles. Then silence.');
    api.shake(300, 2);
    await api.say('delphin', 'I said... YOU SHOULD ALL BE ASHAMED OF YOURSELF!', { mood: 'angry' });
    await api.think('I flinch so hard my shoulder bumps his. He turns and gives me a sweet smile.');
    await api.say('delphin', 'Sorry, Luna.');
    await api.say('delphin', ['Redemption. That\'s why we\'re all here, isn\'t it? How can any of you call this redemption? All you\'re doing is torturing people. Hurting them for your own entertainment.', 'Well I say you\'re all the criminals!'], { mood: 'angry' });
    await api.say('delphin', 'What kind of message do you think it sends if someone like Annette wins? That\'s what you want, isn\'t it? A sociopath on the podium, so you can hold her up and say criminals can\'t be redeemed. Because if any of the rest of us won, you\'d have to deal with some actual reform—');
    await api.say('judge', 'Young man. Surely you aren\'t publicly questioning the government. I don\'t think I have to tell you how foolish that would be.');
    await api.say('delphin', 'What are you going to do? Execute me?', { mood: 'smug' });
    await api.say('delphin', 'Oh no, your honor, I\'m soooo scared. I never thought you might actually kill me.', { mood: 'smug' });
    await api.think('Part of me wants to laugh and part of me wants to cry. I stuff my fist against my mouth until I have hold of myself.');
    await api.say('delphin', 'Whatcha gonna do then, Judgy Judge? Can\'t get me till they vote me, huh?', { mood: 'happy' });
    api.sound('sting'); api.shake(400, 3);
    await api.say('judge', 'I can do anything I want to. I am your supervisor and soon I will be your supreme leader. I make the laws.', { mood: 'angry' });
    await api.say('delphin', 'Not yet. Not until you beat out the other one.');
    await api.say('delphin', 'People of the country! Hear me now. This man is a coward and a liar and worse, he\'s crueler than a skunk in a suit. I demand that he be removed from consideration as Supreme Leader. If you\'re with me, then take to the streets. Make your voices heard.', { mood: 'angry' });
    await api.move('c_frog', [mark(H.court, 'mic', [10, 7])[0] - 1, mark(H.court, 'mic', [10, 7])[1] + 1]);
    api.sound('hit');
    await api.narrate('Frog shoves a gloved hand into his mouth and catches him in a headlock. Delphin bites down.');
    await api.say('judge', 'That was treasonous talk, boy. Even if you won this entire competition, you would be re-arrested the moment you walked out. We must safeguard our glorious nation from those who wish to destroy her.', { mood: 'smug' });
    await api.say('delphin', 'That\'s only if you\'re still in charge by the time this is all over.', { mood: 'angry' });
    await api.narrate('The glove goes straight back in.');

    // Luna's turn
    await api.say('judge', 'And you? Will you also spin a yarn of tragic proportions? Or will you do as you are bid and beg for your life?');
    await api.think('Delphin, in a headlock, still manages a thumbs up. He was so brave. Am I capable of being that brave?');
    var c = await api.choice([
      { text: '"I forfeit my time."', set: { ch13_forfeit: true } },
      { text: '(Plead your case.)', set: { ch13_forfeit: false } }
    ], { prompt: 'Five minutes to plead for your life.' });
    if (c === 0) {
      await api.say('luna', 'No.');
      await api.say('judge', 'No, you will not rebel, or no, you will not beg?');
      await api.say('luna', 'I forfeit my time. Let the audience decide based on what they\'ve seen so far.');
      await api.say('judge', 'Are you quite certain? This is your life that you\'re playing with.');
      await api.say('luna', 'No more than you play with the lives of others.');
      await api.think('Did I really just say that? So much for playing it cool.');
      api.approvalAdd(+10);
      await api.narrate('Somewhere in the bleachers, someone starts to clap, and then remembers where they are and stops.');
    } else {
      var s = await api.choice([
        '"My daughter is eleven. She needs her mother."',
        '"I made one choice. I would make it again."',
        '"This whole show is a—"'
      ], { prompt: 'What do you say?' });
      if (s === 0) {
        await api.say('luna', 'My daughter is eleven. Her name is Waverly. She... she needs her mother, and I...');
        await api.think('Her name comes out of my mouth and the rest of the sentence just goes. I can\'t say her name into those lenses and keep talking.');
      } else if (s === 1) {
        await api.say('luna', 'I made one choice. I was alone and I was scared and I made one choice and I would... I would...');
        await api.think('Would I? On this stage, with the Judge\'s eyes on me, the word sticks.');
      } else {
        await api.say('luna', 'This whole show is a— it\'s a—');
        await api.think('Delphin already said it. Better. Louder. All I have is the end of his sentence.');
      }
      await api.say('judge', 'Time.', { mood: 'smug' });
      api.approvalAdd(-5);
    }

    // the count
    await api.say('judge', 'So be it. Ladies and gentlemen of our glorious nation, you have witnessed the behavior of these two criminals. One of them will walk away, spared by your mercy. Cast your votes now.');
    await api.think('Out of the corner of my eye: Trader, against the wall, head bowed, hands clasped behind his back. He looks smaller than I have ever seen him.');
    var aud = api.approval();
    var base = 1180000 + Math.round(aud * 2600);
    var res = await api.minigame('savecount', { title: 'PUBLIC VOTE 3', left: base + 200, right: base, duration: 14, lunaMood: 'fear', delphinMood: 'smug' });
    api.set('ch13_lunaSaves', res.left || base + 200);
    api.set('ch13_delphinSaves', res.right || base);
    await api.say('judge', 'One. And the results are in! Luna is saved. Delphin, you will now face the consequences of your crimes.');
    await api.think('Two hundred votes. That is all it was. Two hundred people pressed SAVE on their phones while they were eating dinner.');
    api.lowerThird('SAVED BY 200', 'Bartley ' + (base + 200).toLocaleString('en-US') + ' • Neutrino ' + base.toLocaleString('en-US'), 4000);
    await api.say('delphin', 'Hey, red.');
    api.face('c_delphin', 'player'); api.face('player', 'c_delphin');
    await api.say('delphin', 'Don\'t look so guilty. You didn\'t rig the vote. You played fair. And besides, I made you promise, didn\'t I? You\'ve got to make sure Annette doesn\'t win this thing.', { mood: 'happy' });
    await api.say('luna', 'I will. I swear.');
    await api.move('c_frog', mark(H.court, 'carpet', [10, 10]));
    await api.say('delphin', 'Take care of yourself, Luna. And tell Waverly she\'s got a badass for a mom.', { mood: 'happy' });
    await api.move('c_delphin', mark(H.court, 'cage', [10, 13]));
    api.sound('door');
    api.hide('c_delphin'); api.hide('c_frog');
    await api.think('And then he is gone.');
    await api.say('trader', 'Luna... Come on.', { mood: 'sad' });
    api.onAir(false);
    api.approval(false);
    api.unlockPlayer();
  }

  /* ---------------- 3. Vignette: Delphin ---------------- */
  async function sceneExecution(api) {
    await api.fadeOut(700);
    await api.slides([
      { style: 'screen', title: 'DPE EXECUTION MEMO', text: 'NOT FOR DISTRIBUTION.\nNAME: DELPHIN NEUTRINO   AGE: 34\nCRIME: FOUR COUNTS OF ARSON, FOUR COUNTS OF MANSLAUGHTER\nDATE: SATURDAY 3 FEBRUARY 2084' },
      { style: 'montage', title: 'The Amphitheatre', text: 'Tickets have gotten pricey. Delphin is everyone\'s favourite clown, and many will shed tears at his passing. Some because they lost a wager. Some because they grew genuinely attached to this man, this boy, who looked true horror in the eye and decided to joke about it.' }
    ]);
    api.setPlayer('delphin');
    var cage = mark(H.amph, 'cage', [4, 4]);
    await api.goRoom(H.amph, { at: [cage[0] + 1, cage[1]], facing: 'right', fade: false });
    api.lockPlayer();
    await api.fadeIn(800);
    api.onAir(true);
    api.lowerThird('DELPHIN NEUTRINO', 'Execution • live from the Amphitheatre', 4500);
    await api.narrate('This week\'s show has very special guests. The Council of Four, the governing body of the True Believers, in crimson. Most people call them the Four Horsemen. Never in public.');
    await api.pan('a_hyena', 900);
    await api.narrate('Beside them, in a navy suit with a dove on his lapel, Senator Jeremy Humbert smiles warmly at the families around him and shakes a little girl\'s hand.');
    await api.emote('a_humbert', '♥', 800);
    await api.narrate('People throw themselves out of the way of the crimson robes. A little boy drops his toy car, and the hyena\'s polished shoe comes down on it.');
    api.sound('hit');
    await api.emote('a_kid', '!', 700);
    await api.say('toy_mom', 'Please. Forgive my son. He didn\'t mean to drop it. He\'s just a little boy.', { mood: 'fear' });
    await api.narrate('She fails to see the irony.');
    await api.move('a_hyena', [api.npc('a_kid') ? Math.round(api.npc('a_kid').x / 16) + 1 : 7, 8]);
    api.face('a_hyena', 'a_kid');
    await api.narrate('The hyena crouches, holds the crushed car up to its mask as if trying to make sense of it, and offers it back. The boy takes it.');
    await api.say('toy_kid', 'Thank you.', { mood: 'fear' });
    await api.narrate('The hyena pats his head. He flees into his mother\'s arms. She will think about this moment for months: the day her son just barely got away from the Four Horsemen.');
    await api.move('a_hyena', [11, 8]);
    api.face('a_hyena', 'up');
    await api.say('humbert', 'Lovely day for it, Silas.', { mood: 'happy' });
    await api.say('judge', 'Senator. What an... unexpected pleasure.', { mood: 'neutral' });
    await api.narrate('The Judge\'s smile does not move. Humbert\'s does not either. Two men who trained in the same place, showing up where the other least wants them.');
    await api.cameraReset(700);

    await api.narrate('The cage rumbles to the centre of the stage. Delphin collects himself. It is his specialty.');
    var p = await api.choice([
      '(Give them a cheeky wave.)',
      '"Thank you! Pleasure to see you all here today."',
      '(Stare them down.)'
    ], { prompt: 'The crowd roars. Delphin...' });
    if (p === 2) await api.narrate('He stares at the bleachers until the front rows look away. Then, because he can\'t help himself, he winks.');
    else { api.sound('applause'); await api.narrate('The crowd explodes. The bravery, the gumption: it makes them think they could be brave too, if it ever came to it.'); }
    await api.say('delphin', 'Thank you. Pleasure to see you all here, today. I hear the weather is lovely. I hope you all got your steps in.', { mood: 'happy' });
    await api.narrate('Chuckles, some real, some uncomfortable. It was easy to hate Carol. It was easy to be disgusted by John. But Delphin is fun. Delphin is sweet. Delphin is real.');
    await api.say('judge', 'And as a thank you for all their hard work keeping our great country safe, I invite the Council of Four to decide on today\'s method of execution.');
    var j = await api.choice([
      '"So, you must really be ashamed of the way your kid turned out."',
      '(Save your breath.)'
    ], { prompt: 'The Judge is right there.' });
    if (j === 0) {
      await api.say('delphin', 'So, you must really be ashamed of the way your kid turned out. Makes me wonder why you let him run the show in the first place.', { mood: 'smug' });
      await api.narrate('The Judge twitches two fingers. True Believers flood the stage and gag him. Delphin raises both hands, middle fingers up. The crowd gasps. The Judge only smirks.');
    } else {
      await api.narrate('They gag him anyway. They have been doing this long enough to know what is expected of them.');
    }

    // the Council's method vote (rigged; nothing the player picks can change it)
    var v = await api.minigame('vote', {
      title: 'THE COUNCIL DECIDES', prompt: 'Delphin has no vote. Choose anyway.',
      mode: 'eliminate',
      candidates: [
        { id: 'injection', name: 'Injection', spec: 'medic' },
        { id: 'hanging', name: 'Hanging', spec: 'tb' },
        { id: 'firing', name: 'Firing Squad', spec: 'guard' }
      ],
      votes: [{ voter: 'council_tiger', for: 'hanging' }, { voter: 'council_bear', for: 'hanging' }, { voter: 'council_hyena', for: 'hanging' }, { voter: 'council_vulture', for: 'hanging' }],
      voterName: 'Delphin (gagged)', reveal: true, autoPick: 'injection',
      resultText: function () { return 'THE COUNCIL CHOOSES: HANGING'; }
    });
    api.set('ch13_delphinPicked', v.choice || '');
    await api.say('judge', 'Our wise council has decided on a method. This criminal will be hung from the neck for his punishment.');
    await api.narrate('Delphin pales, but refuses to show any fear. At the group home the other kids fed off fear. He is very experienced at hiding it.');

    // to the gallows
    await api.fadeOut(400);
    var gal = mark(H.amph, 'gallows', [20, 4]);
    api.teleport(gal, 'down');
    await api.fadeIn(400);
    await api.narrate('The noose. The brick. The white-coated doctor who has performed every execution so far secures the rope. The bristles scrape. His hands are cuffed. There is nothing to do but wait.');
    await api.narrate('This is the moment Carol and John became afraid. Delphin is different. Delphin knows how to blank himself out. He won\'t give them the show they seek.');
    var q = await api.minigame('qte', { mode: 'timing', rounds: 3, need: 2, speed: 1.2, zone: 0.18, title: 'DON\'T GIVE THEM THE SHOW', prompt: 'Keep your face blank.' });
    api.set('ch13_blank', !!q.success);
    await api.narrate(q.success ? 'His face is a closed door. They get nothing.' : 'His jaw shakes once, and he clamps it, and the cameras miss it by a frame.');
    await api.narrate('The gag comes out. The Judge asks if he has any last words. He doesn\'t need to think very hard. He has had a long time to prepare.');
    await api.say('delphin', 'I have a joke for you all. What did the criminal say to the judge?');
    await api.narrate('The crowd leans forward. At home, people sit on the edge of their couches.');
    await api.wait(900);
    await api.say('delphin', 'I guess you\'ll never know. Get on with it then.', { mood: 'smug' });
    await api.narrate('A universal groan. Then someone laughs. Then another. People slap their knees over the unanswered joke.');
    api.sound('applause');
    api.lowerThird(null);
    await api.fadeOut(300, '#000');
    api.sound('heartbeat');
    await api.slides([
      { style: 'black', text: 'As the audience laughs him to death, the doctor takes the brick away.' },
      { style: 'black', text: 'He thinks about the group home. The bullies who hurt him just to make him sing, as they said. But he got older. Got funny. Suddenly the kids who kept him down wanted a joke.' },
      { style: 'black', text: 'So much of it was never for himself. It was for his sister, his little baby bunny. When she died, a part of him died with her. Setting fires helped, but not enough to fill the hole.' },
      { style: 'black', text: 'Seeing Luna again, seeing the way she fought to save her daughter, gave him something to fight for. No kid deserves to grow up the way the two of them did. Deep in his heart, he hopes Luna can win this thing.' }
    ].concat(api.get('m_delphin', 15) >= 60 ? [{ style: 'black', text: 'In another world she would have been his best friend. In this one too.' }] : []).concat([
      { style: 'black', text: '"Way to go, Delphin!" someone screams. The crowd cheers. He manages one last grin, and sticks out his tongue.' },
      { style: 'black', text: 'It quiets everyone down real fast. After all that laughter, Delphin dies in complete silence, with his tongue sticking out like a taunting child.' }
    ]));
    api.onAir(false);
    api.setPlayer('luna');
    api.unlockPlayer();
  }

  /* ---------------- 4. The screening room ---------------- */
  async function sceneScreening(api) {
    api.set('ch13_phase', 'screening');
    var at = mark(H.screen, 'seat_2', [3, 3]);
    await api.goRoom(H.screen, { at: at, facing: 'up', fade: false });
    api.lockPlayer();
    await api.fadeIn(900);
    await api.think('Delphin is gone. A part of me can\'t believe it. The first friend I ever had, the man who never stopped being a boy... is gone.');
    await api.narrate('The screening room is as silent as the execution chamber. Isaiah, head in his hands, rocking, is the first to break.');
    await api.say('isaiah', 'Did you know that a human can survive up to 75 seconds without air before incurring permanent brain damage?', { mood: 'sad' });
    await api.think('A swell of hatred, unexpected and intensely personal. If he hadn\'t voted for me, it would be Annette swinging from that rope.');
    var c = await api.choice([
      { text: '"It\'s okay not to sound like a robot sometimes. Or is that really how empty you are inside?"', set: { ch13_snapped: true } },
      { text: '(Bite your tongue.)', set: { ch13_snapped: false } }
    ]);
    if (c === 0) {
      await api.say('luna', 'You know, Isaiah. It\'s okay not to sound like a robot sometimes. Or is that really how empty you are inside?', { mood: 'angry' });
      clampMeter(api, 'm_isaiah', -10);
      await api.say('isaiah', 'I... I didn\'t mean to.', { mood: 'cry' });
      await api.narrate('He bolts for the door, nearly tripping over himself.');
      await api.think('Guilt rises in my throat. I push it down. Maybe he\'ll think twice about what he believes from now on.');
    } else {
      await api.think('I hold it behind my teeth until it stops burning. He doesn\'t need me to tell him. He knows exactly what his vote did.');
      await api.say('isaiah', 'I\'m sorry. I\'m going to... I need to go.', { mood: 'cry' });
      await api.narrate('He leaves fast, glasses fogged.');
    }
    api.hide('s_isaiah'); api.set('ch13_isaiahFled', true);
    if (c === 0) await api.say('annette', 'Now that wasn\'t very nice.', { mood: 'smug' });
    else await api.say('annette', 'Poor boy. He always did take things to heart.', { mood: 'smug' });
    await api.say('luna', 'I don\'t remember asking for your opinion.');
    await api.say('annette', 'Tell me. Why do you think I killed all those men?');
    await api.say('luna', 'It sounds like you want to tell me. So why don\'t you just get on with it?');
    await api.say('annette', 'Power, my dear. Those men had all of it and us mere mortals have always been forced to fight over the scraps. I\'ve always been rather talented as a maid. I gave them three months to prove themselves. Those I judged to be immoral sealed their own fate.', { mood: 'smug' });
    await api.say('luna', 'You had no right to make those judgements. How could you know the core of someone in just three months?');
    await api.say('annette', 'Didn\'t I? People do it all the time. How many people did it take to sit down and decide that it was a crime for you to kill that baby of yours? I assure you there wasn\'t a single woman amongst the bunch.');
    var a = await api.choice(['"What did Delphin do that was so bad you had to kill him?"', '"Life isn\'t a game."']);
    if (a === 0) {
      await api.say('luna', 'But what about Delphin? What did he do that was so bad you had to kill him?');
      await api.say('annette', 'I didn\'t kill Delphin. Society did. This twisted system did. All I did was play the game they placed me in.');
    }
    await api.say('luna', 'This isn\'t a game! Life isn\'t a game! These are human beings with lives and loves. Are you even capable of seeing that?', { mood: 'angry' });
    await api.say('annette', 'See, this is why I\'ve always liked you, girl. You remind me of a younger version of myself.');
    await api.say('luna', 'I\'m nothing like you.');
    await api.say('annette', 'Not yet. But give it a few years. Those men I killed? Every single one of them tried to assault me in the three months I worked for them. Still think I had no right to pass judgement?', { mood: 'smug' });
    await api.narrate('She leaves. The door slams, as hard as an old lady with one working hand can slam a heavy door, which is not very hard.');
    api.hide('s_annette');
    await api.think('I have an apology to make. After all, I\'m nothing like that witch. I hope.');
    api.unlockPlayer();
  }

  /* ---------------- 5. The library ---------------- */
  async function sceneLibrary(api) {
    api.set('ch13_phase', 'afternoon');
    api.objective('Find Isaiah (try the library)', { target: 'isaiah_lib' });
    await api.waitForInteract('isaiah_lib');
    api.objective(null);
    api.lockPlayer();
    await api.narrate('He is curled in an armchair. He must have heard her come in, but his eyes stay on the book. He tilts his head like a cat pretending not to listen.');
    await api.say('luna', 'Hey. Whatcha reading?');
    await api.narrate('He places a bookmark, closes the book and holds it up: RECOGNIZING SOCIAL CUES: A Guide to Understanding the Nuances of Interaction. A confused cat on the cover watches two men talk.');
    var snapped = api.get('ch13_snapped', false);
    var c = await api.choice([
      { text: snapped ? '"I\'m sorry I called you a robot."' : '"I\'m sorry. For how I looked at you in there."', value: 'warm' },
      { text: '"Look. About earlier."', value: 'stiff' }
    ], { prompt: 'Oh, Isaiah.' });
    if (c === 0) {
      await api.say('luna', snapped ? 'Oh, Isaiah. I\'m sorry I called you a robot. I know you didn\'t mean to hurt anyone when you voted for me. I\'m just upset about Delphin, is all.' : 'Oh, Isaiah. I\'m sorry. I didn\'t say it, but I thought it, and you saw me think it. You didn\'t mean to hurt anyone.');
      clampMeter(api, 'm_isaiah', +20);
    } else {
      await api.say('luna', 'Look. About earlier. I\'m... it wasn\'t fair. Okay?');
      clampMeter(api, 'm_isaiah', +12);
    }
    api.set('f_isaiah_reconciled', true);
    await api.say('isaiah', 'I know that.', { mood: 'cry' });
    await api.say('isaiah', 'I\'m not upset about what you said. Not too upset, anyway. You were right. I can be a bit robotic at times. Joe always used to tease me about it.', { mood: 'sad' });
    await api.narrate('Gently, she pushes the book down so she can see his face, the way she used to with Waverly when she hid behind her hands.');
    await api.say('luna', 'What else did Joe and you used to do?');
    await api.say('isaiah', 'We used to spend hours just talking. Sitting on my bed, playing with each other\'s hair. He\'d tease me for putting my hair in a bun to read, said I looked like a librarian robot. We talked about our future. I think we both knew there was no chance. That never stopped us from dreaming.', { mood: 'sad' });
    await api.say('luna', 'That sounds really nice. Will you tell me more about him? And then maybe I can tell you some stories about Waverly?');
    await api.narrate('He is overflowing with stories. The joy they stole from prying eyes. How Isaiah, who spent his whole life feeling like an outsider, finally felt whole.');
    var w = await api.choice([
      '(The time she dumped a whole bottle of soap in the bath.)',
      '(The time she fed her dinner to a duck "because he looked hungrier".)',
      '(The drawing she taped over the scribbles on the bathroom wall.)'
    ], { prompt: 'Your turn. Which Waverly story?' });
    if (w === 0) await api.narrate('Bubbles to the ceiling. Bubbles down the stairs. Miss Hallaham in the doorway, saying "Lord have mercy" in three different keys. Isaiah laughs until he cries.');
    else if (w === 1) await api.narrate('A whole fish stick, flung from the bridge with great ceremony. Then a lecture to the duck about table manners. Isaiah snorts and tries to hide it.');
    else await api.narrate('A crayon sun, taped over the worst word on the wall, so "it would have something nice to look at". Isaiah goes quiet and nods.');
    await api.think('For the first time, the idea of the viewers poking their noses into our private moments makes bile rise in my throat. I push it aside. He was vulnerable with me. The least I can do is the same.');
    await api.say('isaiah', 'We need to come up with a plan.');
    await api.say('luna', 'How much can we decide when we don\'t even know who will win the next competition?');
    await api.say('isaiah', 'So we come up with two plans. One for if she wins and one for if either of us wins.');
    await api.say('luna', 'That\'s very logical of— sorry. I didn\'t mean...');
    await api.say('isaiah', 'It\'s okay. I know what you meant. Logic isn\'t a bad thing when it\'s complemented by the ability to express empathy.', { mood: 'happy' });
    await api.narrate('He returns about seventy-three seconds later with a rolled scroll of worn white paper. It is blank.');
    await api.say('isaiah', 'This is just for taking notes in case either of us comes up with something brilliant. To start, I believe our best chance at defeating Annette outright is—');
    var plan = await api.choice([
      { text: '"Make her talk. She can\'t resist an audience."', value: 'talk' },
      { text: '"Watch the tea. Always watch the tea."', value: 'tea' },
      { text: '"Win. Just win, and she can\'t touch us."', value: 'win' }
    ], { prompt: 'Plan A, scribbled on the scroll:' });
    api.set('ch13_plan', ['talk', 'tea', 'win'][plan]);
    api.set('ch13_scrollOut', true);
    await api.narrate('They talk strategy for hours. Some plans feel close enough to grab out of the air. Some feel as far-fetched as a pond in the desert. It helps, just to stay busy.');
    await api.say('isaiah', 'Will you come visit me in prison if I lose?');
    await api.say('luna', 'Of course. But only if you promise to do the same.');
    await api.say('isaiah', 'I don\'t think I deserve to win. I\'m the reason Delphin is dead.', { mood: 'sad' });
    await api.say('luna', 'The only reason Annette went after you is because you\'re a good person, and good people are easier to manipulate. Of all of us, you\'re the one who deserves to win most. I\'m sorry I can\'t just hand it to you. But I\'d never forgive myself if I didn\'t try to get back to Waverly.');
    await api.say('isaiah', 'I understand.', { mood: 'sad' });
    await api.say('isaiah', 'Night, Luna.');
    await api.say('luna', 'Goodnight, Isaiah. I hope you dream of Joe.');
    await api.say('isaiah', 'Me too.');
    api.unlockPlayer();
  }

  /* ---------------- 6. Saturday night: the note ---------------- */
  async function writeNote(api, tool) {
    await api.think(tool === 'pen' ? 'The pen from the maze. I kept it in my sock for five days. Now it gets to do something.' : 'Delphin\'s eyeliner. It smudges like crayon. He would think this was hilarious.');
    await api.think('Left hand. Block letters. Nothing that looks like me.');
    var q = await api.minigame('qte', { mode: 'timing', rounds: 3, need: 2, speed: 0.9, zone: 0.2, title: 'LEFT-HANDED', prompt: 'Steady. Block letters.' });
    api.set('ch13_steadyHand', !!q.success);
    var lines = [];
    // line 1
    for (;;) {
      var a = await api.choice([{ text: '"I KNOW WHAT YOU DID."', if: '!ch13_l1a' }, '"DOES DADDY STILL HOLD YOUR LEASH?"', { text: '"HELP ME GET OUT."', if: '!ch13_l1c' }], { prompt: 'First line:', autoPick: 1 });
      if (a !== 1) api.set(a === 0 ? 'ch13_l1a' : 'ch13_l1c', true);   // a rejected line is crossed out (not offered again)
      if (a === 1) { lines.push('DOES DADDY STILL HOLD YOUR LEASH?'); break; }
      await api.think(a === 0 ? 'Too vague. He has done so many things, he wouldn\'t know which one to be scared of.' : 'No. He\'d hand it to his father before the ink dried. He has to feel it, not pity me.');
    }
    if (api.get('f_note2_decoded', true)) {
      await api.think('Grandma is Trader\'s weak point. Waverly worked that out from a phone. I can use it.');
      for (;;) {
        var b = await api.choice([{ text: '"YOUR MOTHER WOULD CRY."', if: '!ch13_l2a' }, '"SHE WOULD BE ASHAMED OF YOU."'], { prompt: 'Second line:', autoPick: 1 });
        if (b === 0) api.set('ch13_l2a', true);
        if (b === 1) { lines.push('SHE WOULD BE ASHAMED OF YOU.'); break; }
        await api.think('Not his mother. Mine. He knew her. I don\'t know how, but he did. "She" is enough. He\'ll know who.');
      }
    } else {
      await api.think('There is something else, I can feel it, something about who he was before all this. But I never worked out Waverly\'s numbers. Leave it.');
    }
    lines.push('STAND UP.');
    api.set('ch13_noteText', lines.join(' '));
    await api.note({ title: '(no name)', text: lines.join('\n') });
    api.set('ch13_noteWritten', true);
    await api.think('Folded small. Tucked in my waistband. Now I need to get it to him without a single camera seeing where it went.');
  }

  async function sneakHall(api) {
    var hall = G.shared && G.shared.maps && G.shared.maps[H.hall];
    // canon §3: a SOLID red dot only records (AI-reviewed later); only FLASHING (live) cameras count as detection.
    var cams = ((G.shared.data.cameras || {})[H.hall] || []).filter(function (c) { return c.live; }).map(function (c) { return { at: c.at, angle: c.angle, sweep: c.sweep || 60, range: c.range || 64, fov: c.fov || 45, speed: c.speed || 0.7 }; });
    var params = hall ? {
      map: hall.tiles.slice(), legend: G.cloneDef(hall.legend || {}), cameras: cams,
      start: [1, 3], goal: mark(H.hall, 'from_supply_closet', [25, 1])
    } : {
      map: ['##########################', '#@.......................#', '#.....................*..#', '##########################']
    };
    params.title = 'THE RED HALL, 02:40'; params.prompt = 'Reach the supply closet. Creep past the flashing cameras.';
    params.guards = [{ path: [[34, 2], [16, 2], [16, 4], [34, 4]], speed: 26, range: 52, fov: 70, spec: 'dog' }];
    params.lives = 3;
    if (!hall) params.guards = [{ path: [[10, 1], [20, 1]], speed: 24, range: 40, fov: 60, spec: 'dog' }];
    for (var tries = 0; tries < 3; tries++) {
      var r = await api.minigame('stealth', params);
      if (r.success) return true;
      api.set('ch13_caughtTries', tries + 1);
      if (tries < 2) {
        await api.narrate('A mosquito drone whines down the hall, four seconds late. Luna presses herself into the stairwell, where they only listen, and breathes through her mouth until the patrol window turns over.');
      } else {
        await api.narrate('The third time, the hall is empty. Dog has gone to piss. Even True Believers have bladders.');
      }
    }
    return true;
  }

  async function sceneNight(api) {
    await api.fadeOut(600);
    await api.titleCard('Saturday night', 'The doors stay unlocked now', 2200);
    api.set('ch13_phase', 'night');
    await api.goRoom(H.room, { at: mark(H.room, 'desk', [2, 6]), facing: 'down', fade: false });
    await api.fadeIn(600);
    await api.think('The doors don\'t lock any more. Not since the Judge took over the house. "Nobody runs from a chip," he said, like a man telling you the stove is hot.');
    await api.think(api.get('ch13_sawTraderMop', false) ? 'Trader keeps his bucket in the supply closet off the Red Hall. I watched him carry it in. No camera in there.' : 'Trader mops the halls every morning now. He keeps his bucket in the supply closet off the Red Hall. No camera in there.');
    await api.think('He can\'t stand up to his father on his own. Somebody needs to tell him to.');

    if (api.get('f_has_pen', true)) {
      api.objective('Write the note at your desk', { target: 'ch13_desk' });
      await api.waitForInteract('ch13_desk');
      await writeNote(api, 'pen');
    } else {
      api.objective('Write the note at your desk', { target: 'ch13_desk' });
      await api.waitForInteract('ch13_desk');
      await api.think('Nothing to write with. The DPE pen is chained to the desk and it writes in a colour nobody else is allowed to have.');
      await api.think('Delphin\'s things. Nobody has cleared his room yet. He had a liner pencil he used every single morning.');
      await api.until(function (f) { return f.ch13_hasEyeliner; }, { objective: 'Find something to write with in Delphin\'s room (door 6)', targets: ['ch13_eyeliner'] });
      api.objective('Back to your desk', { target: 'ch13_desk' });
      await api.waitForInteract('ch13_desk');
      await writeNote(api, 'eyeliner');
    }

    api.objective('Get to the Red Hall without being seen');
    await api.waitForRoom(H.hall);
    api.objective(null);
    await sneakHall(api);
    await api.goRoom(H.closet, { at: mark(H.closet, 'from_red_hall', [2, 4]), facing: 'up' });
    await api.think('No camera. For the first time in a month, nobody is watching me.');
    api.objective('Leave the note under his bucket', { target: 'closet_bucket' });
    await api.waitForInteract('closet_bucket');
    await api.narrate('She tilts the bucket, slides the folded note under it, and sets it down exactly where it was, in its own wet ring.');
    api.set('f_trader_note_left', true);
    api.set('ch13_noteLeft', true);
    await api.think('Done. Now get back before anyone notices the bed is empty.');
    api.objective('Back to your room');
    await api.waitForRoom(H.foyer);
    api.objective(null);
    api.lockPlayer();
    await api.pan('trader_foyer', 900);
    await api.narrate('In the dark foyer, under the portrait of the Great Leader reading to children, Trader Johnson is mopping. Alone. The left side of his face is swollen purple.');
    await api.move('trader_foyer', [5, 8]);
    await api.move('trader_foyer', [8, 8]);
    await api.think('He hums something. It takes me a second to place it. It is the jingle from his own show.');
    await api.think('He doesn\'t see me. He doesn\'t look up from the floor at all.');
    await api.cameraReset(600);
    api.set('ch13_foyerDone', true);
    api.unlockPlayer();
    api.objective('Back to your room');
    await api.waitForRoom(H.room);
    api.objective(null);
    await api.think('I lie on top of the cold silk sheets with my shoes on and listen to the house until the lullaby plays.');
  }

  /* ---------------- 7. Sunday: the book ---------------- */
  async function sceneSunday(api) {
    await api.fadeOut(600);
    api.set('ch13_phase', 'sunday');
    await api.goRoom(H.room, { at: mark(H.room, 'center', [4, 5]), facing: 'down', fade: false });
    await api.titleCard('Sunday', '4 February', 1800);
    await api.fadeIn(500);
    api.lockPlayer();
    api.sound('door');
    await api.narrate('A knock. Trader, in the doorway, with a book in both hands. He looks at the carpet, the bed, the window. Anywhere but her.');
    api.face('player', 'trader_sun');
    await api.say('trader', 'Your daughter mailed this. Apparently you lost yours.', { mood: 'tired' });
    await api.think('Falsville. Brand new. Mine was shredded in week two, along with everything else they wanted me to lose.');
    var c = await api.choice(['"Thank you."', '(Take it without a word.)', '"Did you read my mail, Mr. Johnson?"']);
    if (c === 2) await api.say('trader', 'Everybody reads your mail, Miss Bartley.', { mood: 'sad' });
    if (c === 0) await api.emote('trader_sun', '…', 800);
    await api.think('For one second his eyes come up, and there is something raw in them, like a man who found a note under his bucket this morning. Then they drop again, and he goes.');
    api.hide('trader_sun');
    api.set('ch13_bookGiven', true);
    api.addObject({ id: 'ch13_book', at: mark(H.room, 'nightstand', [6, 1]), prop: 'book13', solid: false, layer: 1, examine: [{ think: 'Falsville. The cover is new. The spine has never been cracked.' }] });
    api.unlockPlayer();
    api.objective('Look through the book', { target: 'ch13_book' });
    await api.waitForInteract('ch13_book');
    api.objective(null);
    await api.narrate('Inside the front cover, tucked under the flap, a slip of paper. Numbers, in a hand she would know anywhere.');
    await api.note({ title: 'Inside the cover', text: NOTE3_SHOWN });
    await api.think('Seven seconds. Second thoughts. A is eight.');
    var r = await api.minigame('cipher', {
      mode: 'seven', ciphertext: NOTE3, title: 'NOTE 3', prompt: 'Waverly\'s numbers',
      hint: api.get('f_code_learned', true) ? 'Add seven. A = 8, B = 9 ...' : 'A = 8, B = 9 ... each letter is seven more than its place.',
      canGiveUp: true
    });
    if (r.success) {
      api.set('f_note3_decoded', true);
      clampMeter(api, 'm_trader_insight', +1, 7);
      clampMeter(api, 'm_waverly', +5);
      await api.slides([{ style: 'note', title: 'Note 3', text: 'TELL HIM SHE LOVED HIM' }]);
      await api.say('luna', 'Loved who?');
      await api.think('Him. Trader. "She." The same "she" I put in my note last night without knowing why it felt right.');
      await api.say('luna', '...Mom.');
      await api.think('Waverly, what do you know? And who is telling you?');
    } else {
      api.set('f_note3_decoded', false);
      clampMeter(api, 'm_waverly', -10);
      await api.think('The numbers swim. I can\'t. Not today, not with Delphin\'s face every time I close my eyes.');
      await api.think('I fold the slip back into the cover. She sent it all this way, and I can\'t even read it. Some mother.');
    }
    await api.slides([{ style: 'montage', title: 'Sunday night', text: 'Three contestants left. Tomorrow, the lie detector.' }]);
    api.completeChapter();
  }

  /* =====================================================================
   * REGISTRATION
   * =================================================================== */
  G.registerChapter({
    id: ID,
    title: 'Ashamed of Yourselves',
    kicker: 'WEEK 4',
    noTitleCard: true,
    maps: buildMaps(),
    cast: cast,
    props: props,
    minigames: minigames,
    testDefaults: {
      m_audience: 52, m_delphin: 50, m_isaiah: 45, m_waverly: 60, m_trader_insight: 3,
      f_salina_forgiven: true, f_delphin_secret: true, f_has_pen: true, f_note2_decoded: true, f_code_learned: true
    },

    start: async function (api) {
      HOLO.on = false;
      api.set('ch13_phase', 'doll');
      await sceneDoll(api);
      await sceneVote(api);
      await sceneExecution(api);
      await sceneScreening(api);
      await sceneLibrary(api);
      await sceneNight(api);
      await sceneSunday(api);
    }
  });
})();
