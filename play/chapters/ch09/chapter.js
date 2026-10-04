/* =========================================================================
 * ch09 "Friends and Family"  (Tue 23 Jan 2084, week 3)
 *
 * Bus to DPE HQ -> lobby check-in -> Luna's tiny cell (execution-predictions
 * poll) -> Waverly's interview (protect her from Trader's barbs, notice her
 * performance, palm Note 1 in the goodbye tantrum) -> Note 1 in the cell ->
 * the other interviews on the cell TV (Delphin/Jesemie, Isaiah's mother,
 * Kessie exposed: Deandre, "Dean the green") -> bus back -> Luna's room ->
 * Trader's gold office: the unrecorded five-minute call, the Markus deal and
 * Luna's Seven Code reply NO STAY SAFE spoken as "counting practice".
 *
 * Source: D3b L2324-2716 (adapted), CHAPTERS.md ch09, CANON.md §8 (Seven Code).
 *
 * Cross-chapter flags
 *   READS : f_code_learned (pad shows the full key if false), f_kessie_secret_told
 *           (the "Annette." realisation), f_alliance_delphin, m_waverly, m_audience,
 *           m_isaiah, m_delphin
 *   SETS  : f_note1_read (always true), f_code_reply_sent, f_markus_deal,
 *           m_waverly (+/-), m_isaiah (-10 once, bus back), m_delphin (+3 optional),
 *           m_audience via api.approval()/approvalAdd() ONLY.
 * Chapter-local flags: ch09_*
 *
 * Maps: show_bus (local). dpe_hq_lobby / dpe_hq_cells / dpe_hq_studio,
 * house_luna_room, house_trader_office are SHARED ids. Each uses the shared map
 * only when it exists AND provides every staging mark this chapter needs
 * (G.shared.data.marks[id]); otherwise the local fallback below is used.
 * ========================================================================= */
(function () {
  'use strict';

  var CH = 'ch09';
  var SH = G.shared || null;

  /* ---------------- canonical Seven Code reply (CANON.md §8, R1) ---------------- */
  var R1_PLAIN = 'NO STAY SAFE';
  var R1_CIPHER = '21-22/26-27-8-32/26-8-13-12';

  /* ---------------- shared map ids (one constants object) ---------------- */
  var MAP = {
    bus: 'show_bus',                   // local only
    lobby: 'dpe_hq_lobby',
    cells: 'dpe_hq_cells',
    studio: 'dpe_hq_studio',
    lunaRoom: 'house_luna_room',
    office: 'house_trader_office'
  };

  /* ---------------- staging marks for the LOCAL fallback maps ---------------- */
  var LOCAL = {
    show_bus: {
      luna: [7, 4], delphin: [5, 4], annette: [9, 4], kessie: [7, 1], isaiah: [5, 1],
      driver: [16, 1], trader: [15, 3], ginerva: [14, 2], tb: [1, 3],
      isaiah_back: [9, 1], annette_back: [9, 2]
    },
    dpe_hq_lobby: {
      luna_start: [9, 11], trader_desk: [13, 6], ginerva: [10, 7], receptionist: [15, 5],
      kessie: [14, 8], isaiah: [6, 8], annette: [4, 7], delphin: [8, 9],
      guard_a: [7, 12], guard_b: [10, 12], worker_a: [5, 3], worker_b: [16, 10],
      to_cells: [16, 12]
    },
    dpe_hq_cells: {
      corridor_in: [2, 6], luna_cell: [22, 2], luna_cell_door: [22, 4], escort: [21, 4], scratch: [23, 1]
    },
    dpe_hq_studio: {
      luna_enter: [1, 3], luna_seat: [6, 3], waverly_seat: [6, 4], trader_seat: [9, 3],
      guest_door: [14, 3], guest_seat: [9, 4], run_to: [12, 3], hidden: [7, 5],
      judge: [11, 3], dog: [13, 2], turtle: [13, 4], lion_in: [11, 4], kessie_reach: [10, 4]
    },
    house_luna_room: { luna: [4, 4], door: [3, 6] },
    house_trader_office: { luna_enter: [4, 6], trader: [4, 1], chair: [4, 3], ginerva: [5, 6] }
  };

  /** Shared point names that stand in for our local marks (first that exists wins).
   *  A function gets (at) = G.shared.at bound to the map and returns [x,y] or null. */
  var ALIAS = {
    house_trader_office: {
      luna_enter: ['from_red_hall'], trader: ['desk_chair'], chair: ['guest_chair'],
      ginerva: function (at) { var p = at('from_red_hall'); return p ? [p[0] + 1, p[1]] : null; }
    },
    house_luna_room: {
      luna: ['center', 'from_bedroom_hall'],
      door: function (at) { var p = at('from_bedroom_hall') || at('door'); return p ? [p[0], p[1] - 1] : null; }
    },
    dpe_hq_lobby: {
      luna_start: ['from_show_bus'], trader_desk: ['desk'], receptionist: ['desk_clerk'],
      ginerva: fixed([8, 7]), kessie: fixed([12, 9]), isaiah: fixed([6, 9]), annette: fixed([4, 8]), delphin: fixed([14, 9]),
      guard_a: fixed([8, 12]), guard_b: fixed([12, 12]), worker_a: fixed([5, 3]), worker_b: fixed([15, 3]), to_cells: ['from_dpe_hq_cells']
    },
    dpe_hq_cells: {
      corridor_in: ['from_dpe_hq_lobby'], luna_cell: ['cell_luna'],
      luna_cell_door: function (at) { var p = at('cell_luna'); return p ? [p[0], p[1] + 2] : null; },
      escort: function (at) { var p = at('cell_luna'); return p ? [p[0] + 1, p[1] + 2] : null; },
      scratch: function (at) { var p = at('cell_luna'); return p ? [p[0] - 1, p[1]] : null; }
    },
    dpe_hq_studio: {
      luna_enter: ['from_dpe_hq_lobby'], luna_seat: ['chair_guest'], trader_seat: ['chair_host'], guest_door: ['wings'],
      waverly_seat: fixed([8, 5]), guest_seat: fixed([12, 4]), run_to: fixed([8, 6]), hidden: fixed([18, 7]),
      judge: fixed([10, 3]), dog: fixed([9, 4]), turtle: fixed([8, 6]), lion_in: fixed([8, 3]), kessie_reach: fixed([8, 4])
    }
  };
  /** Shared exits that would let Luna wander out of a scripted scene; removed in shared mode. */
  var SHARED_REMOVE = {
    dpe_hq_lobby: ['to_dpe_hq_cells', 'to_dpe_hq_studio', 'to_show_bus'],
    dpe_hq_cells: ['to_dpe_hq_lobby'],
    dpe_hq_studio: ['to_dpe_hq_lobby']
  };
  function fixed(xy) { return function () { return xy; }; }
  function sharedPoint(id, name) {
    var at = function (n) { return SH && typeof SH.at === 'function' ? SH.at(id, n) : ((SH.data && SH.data.marks && SH.data.marks[id]) || {})[n] || null; };
    var al = ALIAS[id] && ALIAS[id][name];
    if (typeof al === 'function') return al(at);
    var names = (al || []).concat([name]);
    for (var i = 0; i < names.length; i++) { var v = at(names[i]); if (v) return Array.isArray(v) ? [v[0], v[1]] : [v.x, v.y]; }
    return null;
  }
  /** Use the shared map only when it exists and resolves every point we stage on. */
  var USING = {};
  function sharedReady(id) {
    if (!SH || typeof SH.has !== 'function' || !SH.has(id)) return false;
    return Object.keys(LOCAL[id] || {}).every(function (k) { return !!sharedPoint(id, k); });
  }
  function M(id, name) {
    var v = USING[id] ? sharedPoint(id, name) : (LOCAL[id] || {})[name];
    return v ? [v[0], v[1]] : [1, 1];
  }
  /** Shared mode: keep only my NPCs/objects that carry a `mark`, re-positioned on the shared points. */
  function pick(id, local) {
    USING[id] = sharedReady(id);
    if (!USING[id]) return local;
    function place(e) { var c = Object.assign({}, e); c.at = sharedPoint(id, e.mark); delete c.mark; return c; }
    return SH.map(id, {
      npcs: (local.npcs || []).filter(function (n) { return n.mark; }).map(place).concat(local.sharedNpcs || []),
      objects: (local.objects || []).filter(function (o) { return o.mark; }).map(place),
      remove: SHARED_REMOVE[id] || []
    });
  }

  function crowd(seed) {
    if (SH && typeof SH.extra === 'function') { try { return SH.extra('audience', seed); } catch (e) { /* fall through */ } }
    return G.Sprites.randomSpec(seed);
  }
  function worker(seed) {
    if (SH && typeof SH.extra === 'function') { try { return SH.extra('citizen', seed, { outfit: '#2a3a5a', style: 'suit' }); } catch (e) { /* fall through */ } }
    return G.Sprites.randomSpec(seed, { outfit: '#2a3a5a' });
  }

  /* ---------------- small drawing helpers for inline props ---------------- */
  function px(g, x, y, w, h, c) { g.fillStyle = c; g.fillRect(x, y, w, h); }
  var drawStar = function (g, x, y, t, o) {
    var s = Math.sin(t * 2 + o.tx) * 0.5 + 0.5;
    px(g, x + 7, y - 6, 1, 8, '#6a6a7a');
    px(g, x + 6, y + 2, 3, 3, s > 0.5 ? '#fff6c0' : '#e8c15a');
    px(g, x + 5, y + 3, 5, 1, '#e8c15a'); px(g, x + 7, y + 1, 1, 5, '#e8c15a');
  };
  var drawBars = function (g, x, y) {
    for (var i = 1; i < 16; i += 3) px(g, x + i, y, 1, 16, '#8a8a96');
    px(g, x, y + 2, 16, 1, '#6a6a76'); px(g, x, y + 12, 16, 1, '#6a6a76');
  };
  var drawPenguin = function (g, x, y) {
    px(g, x + 4, y + 2, 8, 12, '#101018'); px(g, x + 6, y + 5, 4, 8, '#e8e4d8');
    px(g, x + 6, y + 3, 1, 1, '#fff'); px(g, x + 9, y + 3, 1, 1, '#fff'); px(g, x + 7, y + 4, 2, 1, '#f2b33d');
    px(g, x + 5, y + 14, 2, 1, '#f2b33d'); px(g, x + 9, y + 14, 2, 1, '#f2b33d');
  };
  var drawArmchair = function (g, x, y) {
    px(g, x + 1, y + 4, 14, 11, '#5a1a2a'); px(g, x + 2, y + 5, 12, 6, '#8a2a40'); px(g, x + 1, y + 4, 14, 1, '#a8405a');
  };
  var drawKidChair = function (g, x, y) {
    px(g, x + 4, y + 7, 8, 7, '#c9a24a'); px(g, x + 5, y + 8, 6, 3, '#e8c15a'); px(g, x + 4, y + 14, 1, 2, '#8a6a20'); px(g, x + 11, y + 14, 1, 2, '#8a6a20');
  };
  var drawDish = function (g, x, y) {
    px(g, x + 3, y + 6, 10, 4, '#e8c15a'); px(g, x + 4, y + 5, 2, 2, '#b08a30'); px(g, x + 8, y + 4, 1, 3, '#b08a30'); px(g, x + 10, y + 5, 2, 2, '#c9a24a');
  };
  var drawChandelier = function (g, x, y, t) {
    px(g, x + 7, y - 10, 1, 6, '#c9a24a'); px(g, x + 2, y - 4, 12, 2, '#e8c15a');
    var f = Math.sin(t * 5) > 0 ? '#fff6c0' : '#ffe58a';
    px(g, x + 2, y - 6, 1, 2, f); px(g, x + 7, y - 6, 1, 2, f); px(g, x + 13, y - 6, 1, 2, f);
  };
  var drawPhone = function (g, x, y) {
    px(g, x + 3, y + 5, 10, 6, '#e8c15a'); px(g, x + 2, y + 3, 12, 3, '#c9a24a'); px(g, x + 5, y + 7, 6, 3, '#7a5a10');
  };
  var drawSticker = function (g, x, y) { px(g, x + 3, y + 4, 10, 8, '#e8e4d8'); px(g, x + 4, y + 6, 8, 1, '#3a5a8a'); px(g, x + 4, y + 9, 6, 1, '#3a5a8a'); };

  /* =====================================================================
   * MAPS (local fallbacks)
   * ===================================================================== */
  var bus = {
    name: 'The Show Bus',
    tiles: [
      '#WWWWWWWWWWWWWWWWWW#',
      '#zazazazazazazaaaaK#',
      '#zazazazazazazaaaaa#',
      '#aaaaaaaaaaaaaaaaaa#',
      '#zazazazazazazaaaaa#',
      '#zazazazazazazaaaaa#',
      '#WWWWWWWWWWWWWWWWWW#'
    ],
    legend: { z: 'ch09:busseat', a: 'ch09:busfloor' },
    spawn: [7, 4],
    ambient: 'hum', tint: '#3a2a18', tintAlpha: 0.1,
    npcs: [
      { id: 'delphin', at: [5, 4], facing: 'right' },
      { id: 'annette', at: [9, 4], facing: 'right', if: '!ch09_busBack' },
      { id: 'kessie', at: [7, 1], facing: 'right', if: '!ch09_busBack' },
      { id: 'isaiah', at: [5, 1], facing: 'right', if: '!ch09_busBack' },
      { id: 'isaiah_b', spec: 'isaiah', at: [9, 1], facing: 'up', if: 'ch09_busBack' },
      { id: 'annette_b', spec: 'annette', at: [9, 2], facing: 'right', if: 'ch09_busBack' },
      { id: 'driver', at: [16, 1], facing: 'right' },
      { id: 'trader', at: [15, 3], facing: 'left' },
      { id: 'ginerva', at: [14, 2], facing: 'left' },
      { id: 'tb_dog', spec: 'tb_dog', at: [1, 3], facing: 'right' }
    ],
    objects: [
      { id: 'ch09_buscam', at: [12, 0], prop: 'camera', examine: [{ think: 'Even on a bus. Even here.' }] }
    ]
  };

  var lobbyLocal = {
    name: 'DPE Headquarters: Lobby',
    tiles: [
      '##yy####EEEE###yy###',
      '#qqqqqqqqqqqqqqqqqq#',
      '#qqqqqqqqqqqqqqqqqq#',
      '#qPqqqqqqqqqqqqqqPq#',
      '#qqqqqqqqqqqqqqqqqq#',
      '#qqqqqqqqqqqKKKqqqq#',
      '#qqhhqqqqqqqqqqqqqq#',
      '#qqqqqqqqqqqqqqqqqq#',
      '#qqqqqqqqqqqqqqqqqq#',
      '#qPqqqqqqqqqqqqqqPq#',
      '#qqqqqqqqqqqqqqqqqq#',
      '#qqqqqqqqqqqqqqqqqq#',
      '#qqqqqqqqqqqqqqqqqq#',
      '########DD######DD##'
    ],
    legend: { q: 'ch09:bluetile', y: 'ch09:elevator' },
    spawn: [9, 11],
    ambient: 'hum', tint: '#1a3a6a', tintAlpha: 0.08,
    npcs: [
      { id: 'trader', mark: 'trader_desk', at: [13, 6], facing: 'up' },
      { id: 'ginerva', mark: 'ginerva', at: [10, 7], facing: 'down' },
      { id: 'receptionist', mark: 'receptionist', at: [15, 5], facing: 'left' },
      { id: 'kessie', mark: 'kessie', at: [14, 8], facing: 'left' },
      { id: 'isaiah', mark: 'isaiah', at: [6, 8], facing: 'down' },
      { id: 'annette', mark: 'annette', at: [4, 7], facing: 'up' },
      { id: 'delphin', mark: 'delphin', at: [8, 9], facing: 'right' },
      { id: 'tb_deer', spec: 'tb_deer', mark: 'guard_a', at: [7, 12], facing: 'up', turn: false, talk: [{ think: 'Deer. The mask doesn\'t even tilt.' }] },
      { id: 'tb_dog', spec: 'tb_dog', mark: 'guard_b', at: [10, 12], facing: 'up', turn: false, talk: [{ think: 'Dog. "Don", Delphin calls him. Not to his face.' }] },
      { id: 'worker_a', spec: worker(901), mark: 'worker_a', at: [5, 3], wander: true, radius: 2, talk: [{ narrate: 'The man doesn\'t break stride. He doesn\'t even look. You are not a person to him; you are a scheduled event.' }] },
      { id: 'worker_b', spec: worker(902), mark: 'worker_b', at: [16, 10], wander: true, radius: 2, talk: [['worker_b', 'Don\'t talk to me. I\'m on quota.', 'fear']] }
    ],
    objects: [
      { id: 'ch09_sign', at: [11, 5], prop: 'sign', examine: async function (api) {
          await api.note({ title: 'GUESTS: Check-in here', text: 'Trespassing on Government property is a federal crime and may be punished with prison time or participation in mandatory punitive entertainment.' });
          await api.think('Participation. As if we volunteered.');
        } },
      { id: 'ch09_mural', at: [5, 0], draw: drawPenguin, solid: true, examine: [{ think: 'The DPE penguin, marring the walls. Same penguin as on my chip-watch strap. Same penguin on Trader\'s—no. Never mind.' }] },
      { id: 'ch09_promo', at: [9, 0], examine: async function (api) {
          await api.tv({ speaker: 'trader', mood: 'happy', headline: 'FRIENDS & FAMILY', text: 'This week on Right to Life: the people who love our criminals. If anybody does!', ticker: 'REDEMPTION SURVIVOR • VOTE IN THE APP • ', tag: 'PROMO' });
        } },
      { id: 'ch09_elev', at: [2, 0], examine: 'Elevator doors polished to a mirror. A squinting red-haired woman in a grey sweatsuit squints back.' },
      { id: 'ch09_elev2', at: [15, 0], examine: 'STAFF ONLY. The button needs a badge. You have a sticker, at best.' },
      { id: 'ch09_plant', at: [2, 3], examine: 'A plastic plant, dusted daily. Even the leaves are compliant.' },
      { id: 'ch09_door', at: [8, 13], examine: [{ think: 'The way we came in. Two True Believers between me and it. Thirty miles of farmland past that.' }] },
      { id: 'ch09_couch', at: [3, 6], examine: 'Leather couches for real guests. Nobody tells you to sit, so you don\'t.' }
    ]
  };

  var cellsLocal = {
    name: 'DPE Headquarters: Cell Block D',
    tiles: [
      '########################',
      '#mm#mm#mm#mm#mm#mm#mm#m#',
      '#mm#mm#mm#mm#mm#mm#mm#m#',
      '#||#||#||#||#||#||#||#_#',
      '#______________________#',
      '#______________________#',
      '#______________________#',
      '#D######################'
    ],
    spawn: [2, 6],
    ambient: 'drone', tint: '#202838', tintAlpha: 0.18, dark: 0.35,
    lights: [{ at: [22, 1], r: 30 }, { at: [6, 5], r: 50 }, { at: [16, 5], r: 50, flicker: true }],
    playerLight: 24,
    npcs: [],
    objects: [
      { id: 'ch09_bars', at: [22, 3], draw: drawBars, solid: true, examine: 'Bars, close enough together that you could not get a wrist between them.' },
      { id: 'ch09_tv', at: [22, 0], prop: 'tvset', solid: true },
      { id: 'ch09_cam', at: [21, 1], prop: 'camera', solid: true, examine: [{ think: 'A camera right next to the TV, so they can watch me watch.' }, { sound: 'camera' }] },
      { id: 'ch09_scratch', mark: 'scratch', at: [23, 1], solid: true },
      { id: 'ch09_scratch2', at: [4, 1], examine: 'Another cell. Hundreds of little white lines in the brick. Someone kept count of something.' }
    ]
  };

  var studioLocal = {
    name: 'DPE Headquarters: Interview Studio',
    tiles: [
      '#####EEEEEE#####',
      '#ffffffffffffff#',
      '#ffffffffffffff#',
      'DffffffTTffffffD',
      '#ffffffffffffff#',
      '#ssssssssssssss#',
      '#mmmmmmmmmmmmmm#',
      '#nnnnnnmmnnnnnn#',
      '#mmmmmmmmmmmmmm#',
      '#nnnnnnmmnnnnnn#',
      '#mmmmmmmmmmmmmm#',
      '################'
    ],
    spawn: [1, 3],
    ambient: 'crowd', dark: 0.25,
    lights: [{ at: [7, 3], r: 64 }, { at: [3, 2], r: 30, flicker: true }, { at: [12, 2], r: 30, flicker: true }],
    npcs: (function () {
      var list = [
        { id: 'trader', mark: 'trader_seat', at: [9, 3], facing: 'left' },
        { id: 'waverly', spec: 'waverly', mark: 'guest_door', at: [14, 3], facing: 'left', visible: false, if: 'ch09_scene == waverly' },
        { id: 'ginerva', mark: 'guest_door', at: [14, 3], facing: 'left', visible: false, if: 'ch09_scene == waverly' },
        { id: 'delphin', mark: 'luna_seat', at: [6, 3], facing: 'right', if: 'ch09_scene == delphin' },
        { id: 'jesemie', mark: 'guest_seat', at: [9, 4], facing: 'left', if: 'ch09_scene == delphin' },
        { id: 'isaiah', mark: 'luna_seat', at: [6, 3], facing: 'right', if: 'ch09_scene == isaiah' },
        { id: 'isaiah_mom', mark: 'guest_seat', at: [9, 4], facing: 'left', if: 'ch09_scene == isaiah' },
        { id: 'kessie', mark: 'luna_seat', at: [6, 3], facing: 'right', if: 'ch09_scene == kessie' },
        { id: 'lion', spec: 'lion', mark: 'guest_door', at: [14, 3], facing: 'left', visible: false, if: 'ch09_scene == kessie' },
        { id: 'judge', mark: 'guest_door', at: [14, 3], facing: 'left', visible: false, if: 'ch09_scene == kessie' },
        { id: 'tb_dog', spec: 'tb_dog', mark: 'dog', at: [13, 2], facing: 'left', visible: false, if: 'ch09_scene == kessie' },
        { id: 'tb_turtle', spec: 'tb_turtle', mark: 'turtle', at: [13, 4], facing: 'left', visible: false, if: 'ch09_scene == kessie' }
      ];
      var n = 0;
      [8, 10].forEach(function (yy) {
        for (var x = 1; x <= 14; x++) {
          if (x === 7 || x === 8) continue;
          if ((x + yy) % 3 === 0) continue;  // a few empty seats
          list.push({ id: 'aud' + (n++), spec: crowd(900 + n), at: [x, yy], facing: 'up', turn: false });
        }
      });
      return list;
    })(),
    objects: (function () {
      var o = [
        { id: 'ch09_mic', at: [8, 1], prop: 'mic', examine: 'The microphone. Everything said near it belongs to them.' },
        { id: 'ch09_camL', at: [1, 5], prop: 'camera' },
        { id: 'ch09_camR', at: [14, 5], prop: 'camera' },
        { id: 'ch09_chairL', at: [6, 3], draw: drawArmchair, solid: false, layer: -1 },
        { id: 'ch09_chairR', at: [9, 3], draw: drawArmchair, solid: false, layer: -1 }
      ];
      [2, 4, 6, 9, 11, 13].forEach(function (x, i) { o.push({ id: 'ch09_star' + i, at: [x, 1], draw: drawStar, solid: false, layer: 1 }); });
      return o;
    })()
  };

  studioLocal.sharedNpcs = (function () {
    var l = [], n = 0;
    [9, 10, 11].forEach(function (yy) {
      for (var x = 2; x <= 19; x++) {
        if (x === 11 || (x * 7 + yy * 3) % 4 === 0) continue;
        l.push({ id: 'saud' + (n++), spec: crowd(700 + n), at: [x, yy], facing: 'up', turn: false, solid: true });
      }
    });
    return l;
  })();

  var lunaRoomLocal = {
    name: 'Luna\'s Room (No. 3)',
    tiles: [
      '###WW###',
      '#,,,,bb#',
      '#,,,,bb#',
      '#,,,,,,#',
      '#,,,,,,#',
      '#,,,,,,#',
      '#dd,,,,#',
      '###D####'
    ],
    spawn: [4, 4],
    ambient: 'hum', dark: 0.5, tint: '#2a1830', tintAlpha: 0.15,
    lights: [{ at: [3, 1], r: 26 }, { at: [1, 6], r: 22 }],
    playerLight: 30,
    npcs: [{ id: 'ginerva', mark: 'door', at: [3, 6], facing: 'up', visible: false }],
    objects: [
      { id: 'ch09_bed', at: [5, 1] },
      { id: 'ch09_tablet', at: [1, 0], prop: 'monitor', solid: true },
      { id: 'ch09_window', at: [3, 0], examine: [{ think: 'The garden. The fence. Two nights ago Kessie stood out there with Elephant. Tonight there\'s no one.' }] },
      { id: 'ch09_desk', at: [1, 6], examine: 'The DPE pen and the penguin booklet. "Rule 14: Contestants shall not discuss the outcome of Interviews."' },
      { id: 'ch09_eye', at: [6, 0], prop: 'camera', solid: true, examine: [{ think: 'The Eye in the smoke detector. Goodnight, everyone.' }] }
    ]
  };

  var officeLocal = {
    name: 'Trader\'s Office: EXECUTIVE SWEET',
    tiles: [
      '###W##W###',
      '#k,,,,,,P#',
      '#,,dd,,,k#',
      '#,,,,,,hh#',
      '#,,,,,,,,#',
      '#h,,,,,,,#',
      '#l,,,,,,,#',
      '####D#####'
    ],
    spawn: [4, 6],
    ambient: 'hum', tint: '#6a4a10', tintAlpha: 0.16,
    lights: [{ at: [4, 3], r: 70 }],
    npcs: [
      { id: 'trader', mark: 'trader', at: [4, 1], facing: 'down' },
      { id: 'ginerva', mark: 'ginerva', at: [5, 6], facing: 'up' }
    ],
    objects: [
      { id: 'ch09_chair', at: [4, 3], draw: drawKidChair, solid: false, layer: -1 },
      { id: 'ch09_phone', at: [4, 2], draw: drawPhone, solid: true, examine: 'A gold telephone. Of course it is.' },
      { id: 'ch09_keys', at: [3, 2], draw: drawDish, solid: true, examine: async function (api) {
          await api.narrate('A gold dish of antique keys. You turn one over. It doesn\'t fit anything in this room. None of them do.');
          await api.say('trader', 'Collector\'s items, Miss Luna. They open nothing. That\'s what makes them precious.', { mood: 'smug' });
        } },
      { id: 'ch09_trophy', at: [1, 1], examine: 'Trophies. "Most Stupendous Host 2079." "DPE Spirit Award." The engraving on one has been scratched out.' },
      { id: 'ch09_trophy2', at: [8, 2], examine: 'Photographs with politicians. Senator Jeremy Humbert, smiling with a dove pin. The Judge in none of them.' },
      { id: 'ch09_closet', at: [1, 6], examine: 'A closet. Locked. White suits, probably. Rows of them.' },
      { id: 'ch09_plant', at: [8, 1], examine: 'A real plant. The only living thing in here that isn\'t gold.' },
      { id: 'ch09_chand', at: [4, 4], draw: drawChandelier, solid: false, layer: 1 },
      { id: 'ch09_couch', at: [7, 3], examine: 'Plush couches nobody is ever invited to sit on.' }
    ]
  };

  /* =====================================================================
   * COUNTPAD minigame: Luna encodes R1 out loud as "counting practice".
   * Expected numbers come from the ENGINE's Seven Code (cipherPrep mode 'seven').
   * ===================================================================== */
  var NUMW = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
  function numWord(n) {
    n = +n;
    if (n < 20) return NUMW[n];
    var tens = ['', '', 'twenty', 'thirty'][Math.floor(n / 10)];
    return n % 10 ? tens + '-' + NUMW[n % 10] : tens;
  }
  function sevenPlan(cipher) {
    var p = G.Minigames.cipherPrep({ mode: 'seven', ciphertext: cipher });
    var words = String(cipher).split('/').map(function (w) { return w.split('-').length; });
    return { tokens: p.tokens.map(String), message: String(p.message), words: words };
  }

  var countpad = {
    autoSolve: function () { return { success: true, mistakes: 0 }; },
    start: function (ctx) {
      var R = ctx.R, P = ctx.PAL, p = ctx.params || {};
      var plan = sevenPlan(p.ciphertext || R1_CIPHER);
      var letters = plan.message.replace(/ /g, '').split('');
      var wordEnds = {}; var acc = 0; plan.words.forEach(function (n) { acc += n; wordEnds[acc - 1] = true; });
      var idx = 0, entry = '', mistakes = 0, left = p.time || 90, done = false, doneT = 0, flash = 0, flashMsg = '', spoken = [];
      var keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'DEL', '0', 'SAY'];
      var sel = 11;
      function say() {
        if (!entry) { ctx.sound('cancel'); return; }
        if (entry === plan.tokens[idx]) {
          spoken.push(numWord(entry) + (wordEnds[idx] && idx < letters.length - 1 ? '…' : ','));
          idx++; entry = ''; ctx.sound('confirm');
          if (idx >= letters.length) { done = true; doneT = ctx.t; ctx.sound('success'); }
        } else {
          mistakes++; left = Math.max(0, left - 6); entry = ''; flash = 1.4; ctx.sound('buzzer');
          flashMsg = ['Waverly: "Momma, that\'s not how it goes…"', 'Trader glances up from his pen.', 'Waverly: "Huh?"'][mistakes % 3];
        }
      }
      function press(k) {
        if (k === 'DEL') { entry = entry.slice(0, -1); ctx.sound('blip'); }
        else if (k === 'SAY') say();
        else if (entry.length < 2) { entry += k; ctx.sound('select'); }
      }
      return new Promise(function (resolve) {
        ctx.loop(function (dt) {
          var I = ctx.input;
          if (done) { if (ctx.t - doneT > 1.6) resolve({ success: true, mistakes: mistakes, timeLeft: Math.round(left) }); return; }
          left -= dt; if (flash > 0) flash -= dt;
          if (left <= 0) { ctx.sound('fail'); resolve({ success: false, timedOut: true, mistakes: mistakes }); return; }
          if (I.pressed('tab')) { resolve({ success: false, gaveUp: true, mistakes: mistakes }); return; }
          var enterTyped = false;
          (I.typed || []).forEach(function (k) {
            if (/^[0-9]$/.test(k)) press(k);
            else if (k === 'Backspace') press('DEL');
            else if (k === 'Enter') { enterTyped = true; say(); }
          });
          if (I.repeat('left')) { sel = (sel + 11) % 12; ctx.sound('blip'); }
          if (I.repeat('right')) { sel = (sel + 1) % 12; ctx.sound('blip'); }
          if (I.repeat('up')) { sel = (sel + 9) % 12; ctx.sound('blip'); }
          if (I.repeat('down')) { sel = (sel + 3) % 12; ctx.sound('blip'); }
          if (I.pressed('ok') && !enterTyped) press(keys[sel]);
        }, function (t) {
          R.rect(0, 0, ctx.W, ctx.H, '#140e06');
          R.rect(8, 28, 258, 160, P.paper);
          ctx.header(p.title || 'COUNTING PRACTICE', 'LINE ' + Math.floor(left / 60) + ':' + ('0' + Math.floor(left % 60)).slice(-2) + ' • NOT RECORDED');
          R.text('Say it so only she understands.', 137, 33, { size: 7, align: 'center', color: '#6a5a4a', shadow: false, style: 'italic' });
          // letters + number slots
          var cw = 21, gap = 12, x = 18, y = 50;
          letters.forEach(function (L, i) {
            var cur = i === idx && !done;
            if (cur) R.rect(x, y - 3, cw - 2, 40, '#e8323c', 0.15 + 0.1 * Math.sin(t * 6));
            R.text(L, x + (cw - 2) / 2, y, { size: 12, align: 'center', color: '#2a2420', shadow: false, font: 'title' });
            R.rect(x + 2, y + 30, cw - 6, 1, '#7a6a5a');
            var tok = i < idx ? plan.tokens[i] : cur ? entry : '';
            if (tok) R.text(tok, x + (cw - 2) / 2, y + 18, { size: 9, align: 'center', color: i < idx ? '#2a7a3a' : '#8a1a20', shadow: false });
            x += cw;
            if (wordEnds[i] && i < letters.length - 1) { R.text('…', x + gap / 2 - 2, y + 18, { size: 9, align: 'center', color: '#7a6a5a', shadow: false }); x += gap; }
          });
          // what she has heard so far
          var heard = spoken.join(' ');
          R.text('Waverly hears:', 18, 102, { size: 7, color: '#6a5a4a', shadow: false });
          var hl = R.wrap(heard || '…', 236, 8, 'serif', 'italic').slice(-2);   // R.wrap returns lines; it does not draw
          hl.forEach(function (ln, li) { R.text(ln, 18, 110 + li * 9, { size: 8, color: '#2a2420', shadow: false, font: 'serif', style: 'italic' }); });
          // key strip
          var kx = 14, ky = 160, kw = 246 / 26;
          R.rect(10, ky - 4, 254, 24, '#d8cdb0');
          var used = {}; for (var u = 0; u < idx; u++) used[letters[u]] = plan.tokens[u];
          for (var li = 0; li < 26; li++) {
            var LL = String.fromCharCode(65 + li);
            var tk = used[LL] || (p.revealKey || (mistakes >= 2 && li === 0) ? String(li + 8) : null);
            R.text(LL, kx + li * kw + kw / 2, ky, { size: 6, align: 'center', color: tk ? '#2a2420' : '#9a8a70', shadow: false });
            R.text(tk || '·', kx + li * kw + kw / 2, ky + 9, { size: 5, align: 'center', color: tk ? '#8a1a20' : '#9a8a70', shadow: false });
          }
          R.text(p.hint || 'Grandma\'s seven seconds: every letter plus seven. A = 8.', 137, 146, { size: 7, align: 'center', color: '#6a5a4a', shadow: false, style: 'italic' });
          // keypad
          var bx = 276, by = 40, bw = 30, bh = 26;
          R.rect(270, 30, 108, 156, '#1e1a14');
          keys.forEach(function (k, i) {
            var cx = bx + (i % 3) * (bw + 3), cy = by + Math.floor(i / 3) * (bh + 5);
            var on = i === sel;
            R.rect(cx, cy, bw, bh, on ? '#e8c15a' : '#3a3428');
            R.text(k, cx + bw / 2, cy + 8, { size: k.length > 1 ? 7 : 11, align: 'center', color: on ? '#1a1408' : '#e8e4d8', shadow: false, font: 'sans' });
          });
          if (flash > 0) {
            R.rect(18, 130, 238, 13, '#7a1218', Math.min(1, flash));
            R.text(flashMsg, 137, 132, { size: 7, align: 'center', color: '#fff', alpha: Math.min(1, flash), shadow: false });
          }
          if (done) {
            var a = Math.min(1, (t - doneT) * 3);
            R.rect(ctx.W / 2 - 70, ctx.H / 2 - 12, 140, 24, '#1a3a22', 0.9 * a);
            R.text('SHE HEARD YOU', ctx.W / 2, ctx.H / 2 - 6, { size: 12, font: 'sans', align: 'center', color: '#8aff9a', alpha: a });
          }
          ctx.footer('Type digits   ENTER = say it   [TAB] give up');
        });
      });
    }
  };

  /* =====================================================================
   * helpers used in start()
   * ===================================================================== */
  function clamp(v) { return Math.max(0, Math.min(100, Math.round(v))); }
  function meter(api, k, def, d) { var v = clamp(api.get(k, def) + d); api.set(k, v); return v; }
  function bond(api, d) { return meter(api, 'm_waverly', 60, d); }
  function here(id) { return !!(G.World && G.World.find && G.World.find(id)); }
  var CLOCK = { left: 300 };
  function clock(api, spend) {
    CLOCK.left = Math.max(5, CLOCK.left - (spend || 0));
    var m = Math.floor(CLOCK.left / 60), s = ('0' + (CLOCK.left % 60)).slice(-2);
    api.lowerThird('LINE OPEN • ' + m + ':' + s, 'Columbus House, director\'s office • not recorded', undefined, 'CALL');
  }

  /* =====================================================================
   * CHAPTER
   * ===================================================================== */
  var maps = {};
  maps[MAP.bus] = bus;
  maps[MAP.lobby] = pick(MAP.lobby, lobbyLocal);
  maps[MAP.cells] = pick(MAP.cells, cellsLocal);
  maps[MAP.studio] = pick(MAP.studio, studioLocal);
  maps[MAP.lunaRoom] = pick(MAP.lunaRoom, lunaRoomLocal);
  maps[MAP.office] = pick(MAP.office, officeLocal);

  G.registerChapter({
    id: CH,
    title: 'Friends and Family',
    kicker: 'WEEK 3 • TUESDAY 23 JANUARY',
    maps: maps,
    tiles: {
      busfloor: { color: '#34343c', color2: '#2a2a30', pattern: 'plates' },
      busseat: { base: 'ch09:busfloor', draw: function (g, x, y) {
        px(g, x + 1, y + 2, 13, 12, '#5a1a1a'); px(g, x + 2, y + 3, 11, 7, '#8a2a2a'); px(g, x + 12, y + 1, 3, 14, '#3a0e0e'); px(g, x + 2, y + 3, 11, 1, '#a84040');
      } },
      bluetile: { color: '#2f6fa8', color2: '#3a80bc', pattern: 'tiles' },
      elevator: { wall: true, solid: true, draw: function (g, x, y) {
        px(g, x, y, 16, 16, '#5a6a7a'); px(g, x + 1, y + 2, 14, 14, '#b8c4d0'); px(g, x + 7, y + 2, 2, 14, '#5a6a7a'); px(g, x + 6, y, 4, 2, '#e8c15a');
      } }
    },
    cast: {
      receptionist: { name: 'Receptionist', skin: '#e8c4a8', hair: '#1a1210', hairStyle: 'long', outfit: '#3a5a8a', outfit2: '#2a2a3a', style: 'suit', accessory: ['glasses', 'badge'], voice: 560, bg: '#1a2a44' },
      driver: { name: 'Driver', skin: '#c08a68', hair: '#2a2018', hairStyle: 'buzz', outfit: '#2a3550', outfit2: '#1e2538', style: 'uniform', accessory: 'cap', voice: 230 },
      jesemie: { name: 'Jesemie', skin: '#b07a58', hair: '#1a1210', hairStyle: 'buzz', outfit: '#3a3a3a', outfit2: '#1a1a1a', style: 'hoodie', build: 'broad', accessory: 'scarf', voice: 260 },
      isaiah_mom: { name: 'Mrs. Blueford', skin: '#5a3624', hair: '#1a1210', hairStyle: 'bun', outfit: '#6a5a8a', outfit2: '#3a3050', style: 'dress', build: 'slim', accessory: 'glasses', voice: 470, bg: '#22202a' }
    },
    minigames: { countpad: countpad },
    testDefaults: {
      m_audience: 40, m_waverly: 60, m_isaiah: 30, m_delphin: 30, m_kessie: 30,
      f_code_learned: true, f_kessie_secret_told: true, f_alliance_delphin: true
    },

    start: async function (api) {
      CLOCK.left = 300;
      /* --- canon self-check: the engine's Seven Code must decode R1 to exactly NO STAY SAFE --- */
      var plan = sevenPlan(R1_CIPHER);
      if (plan.message !== R1_PLAIN || plan.tokens.join(',') !== '21,22,26,27,8,32,26,8,13,12') {
        G.reportError(new Error('ch09: Seven Code R1 mismatch: ' + plan.message + ' / ' + plan.tokens.join('-')), 'ch09');
      }
      api.set('ch09_scene', 'none');
      api.set('ch09_busBack', false);

      /* =================== 1. THE BUS =================== */
      await api.goRoom(MAP.bus, { at: M('show_bus', 'luna'), facing: 'right' });
      api.lockPlayer();
      await api.narrate('The bus winds along the road, stopping for lights, waiting for gates. Our first time off the property since the show started.');
      await api.narrate('Outside, the bus is painted with the Redemption Survivor logo and all seven of our faces. Carol\'s and John\'s too, up close. It made me want to retch.');
      api.sound('hit');
      await api.shake(400, 3);
      await api.narrate('A pothole. My wrist bangs against the cuff chaining me to the seat.');
      api.face('delphin', 'right');
      await api.say('delphin', 'Hey driver, wanna be a bit more careful with the merchandise? Viewers won\'t buy bruised material after all.', { mood: 'smug' });
      await api.think('Annette is in the row in front of me. Every time I look at the back of her head I hear it: No one will love you the way I do so tell me everything you hold in that little noggin of yours my dear.');
      await api.think('Definitely not real. Just a nightmare, is all. Had to be.');

      var busDone = { win: false, annette: false, delphin: false, kessie: false };
      for (var guard = 0; guard < 8; guard++) {
        var c = await api.choice([
          { text: 'Lean toward Delphin.', if: function () { return !busDone.delphin; } },
          { text: 'Lean forward: "Annette. We need to talk."', if: function () { return !busDone.annette; } },
          { text: 'Look across the aisle at Kessie.', if: function () { return !busDone.kessie; } },
          { text: 'Watch the world go by.', if: function () { return !busDone.win; } },
          { text: '(Close your eyes until the bus stops.)' }
        ], { prompt: 'The bus rattles on.' });
        if (c === 0) {
          busDone.delphin = true;
          await api.say('delphin', 'What\'s up with you? You seem off.');
          var d = await api.choice([
            'I don\'t know. Just not feeling good, I guess.',
            'I think I did something terrible last night.'
          ]);
          if (d === 0) {
            await api.say('delphin', 'Well try to pull it together and we can get you some meds after this. I don\'t like that we\'re here. Something bad is about to go down, I can feel it.', { mood: 'tired' });
          } else {
            meter(api, 'm_delphin', 15, +3);
            await api.say('delphin', 'Then don\'t do it again. Simple.', { mood: 'neutral' });
            await api.say('delphin', 'Whatever it is, pull it together. I don\'t like that we\'re here. Something bad is about to go down, I can feel it.', { mood: 'tired' });
          }
          await api.think('I scratch at my arms until little drops of blood shine through the cracked skin. The pain sharpens everything. Makes me present.');
        } else if (c === 1) {
          busDone.annette = true;
          await api.say('luna', 'We need to talk.');
          api.face('annette', 'left');
          await api.say('annette', 'Do we, dear?', { mood: 'happy' });
          var a = await api.choice(['What did you put in that tea?', '(…Never mind.)']);
          if (a === 0) {
            await api.say('annette', 'Chamomile, sweetheart, and a drop of honey. You were plum wore out. Talked yourself right to sleep.', { mood: 'smug' });
            await api.think('Talked myself to sleep. Talked. About what?');
          } else {
            await api.say('annette', 'Later, then. We\'ve got all the time in the world.', { mood: 'happy' });
          }
          api.face('annette', 'right');
        } else if (c === 2) {
          busDone.kessie = true;
          await api.narrate('Kessie sits very straight, hands folded, humming under her breath. Something about a little green train.');
          await api.say('kessie', 'Don\'t you fret, sugar. Family day. Can\'t be anything but sweet.', { mood: 'happy' });
          await api.think('She answered too quickly. She always answers too quickly when it matters.');
        } else if (c === 3) {
          busDone.win = true;
          await api.narrate('Farms, mostly. Herds of cows. Then a town: people look up to cheer and wave. Children are hoisted onto shoulders to point at us.');
          await api.think('To them we aren\'t criminals. We\'re television stars. I hate that it feels kind of nice.');
        } else break;
      }

      /* =================== 2. DPE HQ LOBBY =================== */
      await api.fadeOut(500);
      await api.narrate('About an hour later the bus grinds to a halt. One at a time we\'re uncuffed from the seats and re-tied to a rope. At the front of it, holding the end like a prize leash: Trader himself.');
      await api.goRoom(MAP.lobby, { at: M('dpe_hq_lobby', 'luna_start'), facing: 'up' });
      api.unlockPlayer();
      await api.narrate('Inside is another world. No screeching cars, no smoke and sickness. Smooth blue tile, people striding past without a glance, a hum in the air designed to make you feel safe.');
      await api.say('receptionist', 'Oh! Mr. Johnson! I\'m a big fan. The way you dance around the stage, it\'s a crime that you aren\'t in theatre.', { mood: 'happy' });
      await api.say('trader', 'You never know. This is just the beginning for me. Anything can happen.', { mood: 'smug' });
      await api.think('She practically falls over. Honestly. I thought we were supposed to be the hidden puppet masters, not the bimbos.');
      await api.narrate('Trader loops the rope over a brass post at the desk while he chats. Enough slack to turn around in. Not enough to run.');

      api.set('ch09_gotPass', false);
      api.onInteract('ginerva', async function (api) {
        if (!api.get('ch09_lobbyTalks', 0) && !api.get('ch09_gaveUpWaiting') && !api.get('ch09_deferredOnce')) {
          api.set('ch09_deferredOnce', true);   // deferral is one-time: any 2nd talk progresses (autoplay-safe under every --pick)
          await api.say('ginerva', 'Passes are not printed yet, Miss Bartley. Stand still. Touch nothing.', { mood: 'neutral' });
          var w = await api.choice(['I\'ll stand still.', 'Fine. (Look around first.)']);
          if (w === 1) return;
          api.set('ch09_gaveUpWaiting', true);
        }
        await api.narrate('Trader hands the printed passes to Ginerva. She goes down the line, sticking them to our shoulders, nose wrinkled as if our shirts might infect her with criminal tendencies.');
        await api.narrate('I flinch away. Her hand goes straight to my back and pushes me into her grasp. Labelled up like a can of soup.');
        await api.note({ title: 'GUEST PASS', text: 'Luna Bartley - DPE Participant' });
        await api.think('Well. At least it doesn\'t just say criminal.');
        api.set('ch09_gotPass', true);
      });
      api.onInteract('kessie', async function (api) {
        api.add('ch09_lobbyTalks');
        await api.say('kessie', 'I\'m not certain who\'d come for me, hun. I don\'t have any family. Maybe they\'ll bring a cake.', { mood: 'happy' });
        await api.think('Her yellow gloves are gone. Her hands won\'t stay still without them.');
      });
      api.onInteract('isaiah', async function (api) {
        api.add('ch09_lobbyTalks');
        await api.say('isaiah', 'They said family. My mom. Or my dad. I don\'t know which one would be worse.', { mood: 'fear' });
        var i = await api.choice(['Your mom. Whatever she says, she\'s your mom.', 'Maybe nobody comes. That might be the best.']);
        if (i === 0) await api.say('isaiah', '…Yeah. Thanks, Luna.', { mood: 'sad' });
        else await api.say('isaiah', 'That\'s… honestly comforting.', { mood: 'tired' });
      });
      api.onInteract('delphin', async function (api) {
        api.add('ch09_lobbyTalks');
        await api.say('delphin', 'Five bucks says she proposes to him before we\'re checked in.', { mood: 'smug' });
        await api.think('He opened his mouth to say something to the receptionist earlier, then thought better of it. Delphin, thinking better of something. Bad sign.');
      });
      api.onInteract('annette', async function (api) {
        api.add('ch09_lobbyTalks');
        await api.say('annette', 'Isn\'t it grand, dear? Like a museum. I never got to go to a museum.', { mood: 'happy' });
      });
      api.onInteract('receptionist', async function (api) {
        api.add('ch09_lobbyTalks');
        await api.say('receptionist', 'Oh my gosh, you\'re the one with the little girl! Everyone in accounting is talking about you!', { mood: 'happy' });
        await api.think('My stomach drops. The one with the little girl. Why would they be talking about her today?');
      });
      api.onInteract('trader', async function (api) {
        await api.say('trader', 'Patience, Miss Luna. Genius takes paperwork.', { mood: 'smug' });
      });
      await api.until(function (f) { return f.ch09_gotPass; }, { objective: 'Wait for your guest pass (Ginerva)', targets: ['ginerva'] });
      api.objective(null);

      /* the march */
      api.lockPlayer();
      await api.narrate('Trader takes up the rope again and leads us deeper in. He drops Kessie at the first cell block, then Isaiah at the next, his eyes following us forlornly. Then Annette. Then Delphin.');
      await api.narrate('Until it\'s just Trader, Ginerva and me. Of course I\'m last.');
      await api.say('trader', 'Luna? I asked you a question. What do you think of the Department of Punitive Entertainment? Pretty cool, huh? We do all the most cutting edge work here.', { mood: 'happy' });
      var m1 = await api.choice([
        'It\'s fine. I\'ve seen better, but it\'s not messy or anything like that.',
        'It\'s very impressive, Trader.',
        '(Say nothing.)'
      ]);
      if (m1 === 0) {
        await api.say('trader', 'Stubborn to the last. But I highly doubt it. There\'s nowhere else on earth like this.', { mood: 'smug' });
        await api.say('luna', 'Shame I might not live long enough to confirm that.');
        await api.say('trader', 'If you don\'t make it out, that\'s because you weren\'t worthy of doing so.', { mood: 'neutral' });
        await api.say('ginerva', 'Mr. Johnson—');
        await api.say('trader', 'You committed a crime, you signed onto our program, and now you participate. Is there some kind of problem?', { mood: 'angry' });
        await api.say('luna', 'No problem. None at all.');
      } else if (m1 === 1) {
        await api.say('trader', 'Isn\'t it? Most people don\'t appreciate the craft.', { mood: 'happy' });
        await api.think('He beams like a little boy. It\'s the most frightening thing I\'ve seen all day.');
      } else {
        api.sound('hit');
        await api.narrate('He gives the rope a little tug. I stumble.');
        await api.say('trader', 'Manners, Miss Luna. Everyone\'s watching. Well. Not here. But soon.', { mood: 'smug' });
      }

      /* =================== 3. THE CELL =================== */
      await api.goRoom(MAP.cells, { at: M('dpe_hq_cells', 'corridor_in'), facing: 'right' });
      if (here('ch09_bars')) api.remove('ch09_bars');
      await api.narrate('A last block of cells. Ginerva unlocks the smallest one and holds the door open. Trader shoves me inside. They turn away without another word.');
      api.sound('door');
      await api.fadeOut(250);
      api.teleport(M('dpe_hq_cells', 'luna_cell'), 'down');
      await api.fadeIn(250);
      if (!USING[MAP.cells]) api.addObject({ id: 'ch09_bars', at: [22, 3], draw: drawBars, solid: true, examine: 'Bars, close enough together that you could not get a wrist between them.' });
      api.sound('door');
      await api.narrate('Half the size of the others. No bench, no blanket, not even a toilet. Just a little television mounted in the top corner, perched next to a camera.');
      api.unlockPlayer();

      api.set('ch09_tvOn', false);
      api.onInteract('ch09_scratch', async function (api) {
        await api.narrate('White lines scratched into the brick. Hundreds of them, from hundreds of people just like me, trying to make the minutes tick a little faster.');
        var s = await api.choice(['Add a line of your own.', 'Scratch a W. Just one letter.', 'Leave it.']);
        if (s === 0) await api.think('One more line. Someone after me will count it.');
        else if (s === 1) await api.think('W. Small, in the corner. Nobody will know what it means but me.');
        api.set('ch09_scratched', true);
      });
      var TV = here('ch09_tv') ? 'ch09_tv' : here('tv_4') ? 'tv_4' : null;
      if (TV) api.onInteract(TV, async function (api) {
        if (api.get('ch09_tvOn')) { await api.think('The screen hums. Waiting for the next thing.'); return; }
        api.set('ch09_tvOn', true);
      });
      if (TV) {
        await api.until(function (f) { return f.ch09_tvOn; }, { objective: 'Pass the time', targets: here('ch09_scratch') ? ['ch09_scratch', TV] : [TV] });
      } else {
        await api.wait(600);
      }
      api.objective(null);
      api.lockPlayer();
      api.sound('static');
      await api.narrate('The television sputters to life.');
      await api.tv([
        { speaker: 'trader', headline: 'Testing', text: 'Testing. If you can hear me, vote yes in your Redemption Survivor apps.', tag: 'LIVE' },
        { speaker: 'trader', mood: 'happy', headline: 'Right to Life • Last week', text: 'Welcome everyone to the next episode of Right to Life! Last week, our contestants sent the cruel and selfish Carol to the public vote.', tag: 'LIVE' },
        { speaker: 'trader', mood: 'smug', headline: 'Right to Life • Last week', text: 'She faced the elderly but mighty Annette, and you saved Annette and sent Carol straight to justice. Thank you to our most loyal citizens who helped teach that little bitch a lesson.', ticker: 'LAUGH TRACK • LAUGH TRACK • ', tag: 'LIVE' }
      ]);
      await api.think('A picture of Carol on the execution table, covered in tomato pulp, mouth half open. Behind it, a laugh track. They didn\'t even see us as human.');
      await api.tv([
        { speaker: 'trader', headline: 'Who will be next?', text: 'Today, we start a new chapter in the stories of our five remaining contestants. Who will be eliminated next? We\'ve opened a poll in your app!', tag: 'LIVE' },
        { speaker: 'trader', mood: 'happy', headline: 'EXECUTION PREDICTIONS', text: 'Isaiah 33% • Kessie 29% • Luna 16% • Annette 12% • Delphin 10%', ticker: 'VOTE CORRECTLY FOR A LIMITED EDITION FEATURE • ', tag: 'POLL' },
        { speaker: 'trader', mood: 'smug', headline: 'EXECUTION PREDICTIONS', text: 'Looks like we have a lot of Delphin fans in the crowd today. Hey, I get it. He\'s a funny guy, but can he do this?', tag: 'LIVE' }
      ]);
      await api.narrate('Trader whips a bouquet of flowers from behind his back. The applause from the silent crowd is resounding.');
      await api.think('Isaiah, thirty-three percent. He\'s eighteen. And me at sixteen. Somewhere in the middle. Middle is where you live.');

      /* escort */
      api.sound('door');
      api.addNpc({ id: 'elephant', spec: 'elephant', at: M('dpe_hq_cells', 'corridor_in'), facing: 'right' });
      api.addNpc({ id: 'tb_deer', spec: 'tb_deer', at: [M('dpe_hq_cells', 'corridor_in')[0], M('dpe_hq_cells', 'corridor_in')[1] + 1], facing: 'right' });
      await api.move('elephant', M('dpe_hq_cells', 'luna_cell_door'));
      await api.move('tb_deer', M('dpe_hq_cells', 'escort'));
      api.face('elephant', 'up');
      await api.narrate('A clank at the bars. Two True Believers: Elephant and Deer. They gesture for me to follow.');
      if (here('ch09_bars')) api.remove('ch09_bars');
      await api.move('elephant', [M('dpe_hq_cells', 'luna_cell_door')[0] - 2, M('dpe_hq_cells', 'luna_cell_door')[1]]);
      await api.fadeOut(250);
      api.teleport(M('dpe_hq_cells', 'luna_cell_door'), 'left');
      await api.fadeIn(250);
      await api.narrate('I keep my eyes locked on Elephant. She won\'t turn her mask my way. Nothing in how she moves says she\'s anything but a loyal True Believer. Deer peels off at the end of the hall.');
      api.remove('tb_deer');
      var e1 = await api.choice(['"Hey. What\'s—"', '(Say nothing. Not here.)']);
      if (e1 === 0) {
        await api.say('luna', 'Hey. What\'s—');
        await api.emote('elephant', '!', 700);
        await api.narrate('She holds up her hand and shakes her head. The mask rattles. Then she opens the door with one gloved hand and shoves me through with the other.');
      } else {
        await api.narrate('Elephant\'s grip tightens on my wrist, just once. Maybe a warning. Maybe a thank you. Then she shoves me through the door.');
      }
      api.remove('elephant');

      /* =================== 4. WAVERLY'S INTERVIEW =================== */
      api.set('ch09_scene', 'waverly');
      await api.goRoom(MAP.studio, { at: M('dpe_hq_studio', 'luna_enter'), facing: 'right' });
      api.lockPlayer();
      api.onAir(true);
      api.approval(true);
      api.lowerThird('FRIENDS & FAMILY', 'A Right to Life special • LIVE from DPE HQ');
      await api.move('player', M('dpe_hq_studio', 'luna_seat'));
      api.face('player', 'right');
      await api.say('trader', 'Luna! Good to see you as always. I think you\'re going to be very excited in a few minutes. We have a very special guest coming to talk to you.', { mood: 'happy' });
      await api.say('luna', 'Um. I guess I\'m excited?');
      await api.say('trader', 'Any guesses who it might be?', { mood: 'smug' });
      var g1 = await api.choice([
        'I don\'t know, Trader. Is it the company president? Because I have a few thoughts on his choice of wallpaper.',
        'I don\'t want to guess. Just tell me.',
        '(Stare into the nearest lens.)'
      ]);
      if (g1 === 0) {
        api.approvalAdd(+4); api.sound('applause');
        await api.think('Hey. That was pretty good.');
        await api.say('trader', 'I\'m sure he\'d be thrilled to hear them. But no, that\'s not it.', { mood: 'smug' });
      } else if (g1 === 1) {
        api.approvalAdd(-2);
        await api.say('trader', 'Where\'s the fun in that?', { mood: 'smug' });
      } else {
        api.approvalAdd(+1);
        await api.say('trader', 'Ooh, smouldering. The viewers love a smoulder.', { mood: 'happy' });
      }
      await api.narrate('He touches his ear. A tiny radio.');
      await api.say('trader', 'Bring her in.');
      await api.think('Her? Could it possibly be… They wouldn\'t. Would they?');
      api.sound('reveal');
      api.lowerThird('NOW PLAYING', '"Hold Tight To Your Baby" • DPE Classics', 3000);
      api.show('waverly');
      await api.wait(500);
      await api.narrate('A door slides open and an old pop song about holding tight to your baby starts to blare. A tiny shoe steps through. Then another. Then all of her.');
      await api.move('player', M('dpe_hq_studio', 'run_to'), { speed: 110 });
      await api.think('She shouldn\'t be here. It isn\'t safe. I can\'t protect her. Don\'t do this.');
      await api.move('waverly', [M('dpe_hq_studio', 'run_to')[0] + 1, M('dpe_hq_studio', 'run_to')[1]]);
      api.face('waverly', 'player'); api.face('player', 'waverly');
      await api.narrate('She stops in front of me, looking expectant. Older than I remember. A world-weariness that wasn\'t there before. Those torn-up hand-me-downs.');
      await api.say('luna', 'Waverly.');
      await api.think('Her name melts on my tongue like peppermint candy. Waverly. Waverly. Waverly.');
      if (api.get('m_waverly', 60) < 40) {
        await api.narrate('For one terrible second she doesn\'t move. Then she does.');
      }
      await api.say('waverly', 'Momma.', { mood: 'happy' });
      await api.emote('waverly', '♥', 900);
      await api.narrate('And she\'s in my arms before I can blink and I\'m holding her and she\'s lighter than sweet bread and I inhale her but her smell is different but that\'s okay because it\'s Waverly, Waverly in my arms and for just one blissful moment, everything is as it should be.');
      api.approvalAdd(+5); api.sound('applause');
      await api.say('trader', 'What a sweet reunion.', { mood: 'smug' });
      await api.say('trader', 'Luna, how does it feel to see Waverly again after all this time?');
      var f1 = await api.choice([
        'It feels like a part of myself that\'s been missing has finally been reconnected.',
        'It\'s wonderful. Thank you so much, Trader.',
        '(You can\'t speak. You just hold her.)'
      ]);
      if (f1 === 0) {
        api.approvalAdd(+3);
        await api.say('trader', 'That\'s wonderful.', { mood: 'happy' });
        await api.say('luna', 'But I know that it\'s going to be agony when she\'s ripped away from me again.');
        await api.say('trader', 'Well, all you have to do is win the competition and you get her back, along with a sizeable chunk of money.', { mood: 'smug' });
      } else if (f1 === 1) {
        api.approvalAdd(+5);
        await api.think('Thanking him. For my own daughter. I want to wash my mouth out.');
        await api.say('trader', 'You\'re very welcome. Isn\'t she polite, folks?', { mood: 'happy' });
      } else {
        api.approvalAdd(+2); bond(api, +2);
        await api.say('trader', 'Speechless! Well, folks, that says it all.', { mood: 'happy' });
      }

      /* perception: she is performing */
      await api.move('waverly', M('dpe_hq_studio', 'waverly_seat'));
      await api.move('player', M('dpe_hq_studio', 'luna_seat'));
      api.face('player', 'right'); api.face('waverly', 'right');
      await api.narrate('Trader smiles down at Waverly. She darts behind my leg. A few seconds later her head tilts out to peek at him. Then she bats at my hand like a cat.');
      var pc = await api.choice([
        { text: '(Something is off. Watch her closely.)' },
        { text: '(She\'s regressed. What have they done to her?)' }
      ], { timer: 7, timeoutPick: 1, prompt: 'She\'s acting like a toddler…' });
      if (pc === 0) {
        api.set('ch09_noticed', true);
        await api.think('Her thumb drifts toward her mouth. She hasn\'t sucked her thumb since she was four. She\'s eleven.');
        await api.think('She\'s performing. Small voice, big eyes. For the cameras. For him. Why?');
      } else {
        await api.think('Could she really have gone backwards this much in a few weeks? My clever girl, hiding behind my leg.');
      }
      await api.say('trader', '\'Scuse me, young miss. Would you mind telling everyone who is watching at home your name?', { mood: 'happy' });
      await api.say('waverly', 'My name is Waverly Annabelle Bartley.', { mood: 'neutral' });
      await api.narrate('She sounds out every syllable.');
      await api.say('trader', 'Wonderful. And how old are you, Miss Waverly Annabelle Bartley?');
      await api.narrate('She holds up both hands, then one more finger, very slowly, as if counting were hard.');
      await api.say('trader', 'Eleven years old, huh? What a great age. Well I have a few questions for you, Miss Waverly, and for your momma as well. Do you think—', { mood: 'happy' });
      await api.say('waverly', 'How many?', { mood: 'neutral' });
      await api.say('trader', 'How many, what? Questions?');
      await api.say('waverly', 'How many people watching?');
      await api.narrate('Trader lowers his voice like he\'s about to share a secret, and motions for her to lean close. My hand finds hers under the table and clutches it tight.');
      await api.say('trader', 'More people than could fill up this entire room.', { mood: 'smug' });
      await api.narrate('Her mouth falls open. Astonished. It\'s so cute I have to pinch myself not to giggle. Trader\'s voice softens. He\'s charmed. Good. If he likes her, he\'s less likely to go after her.');
      if (api.get('ch09_noticed')) await api.think('…Unless that\'s exactly what she wants him to think.');

      await api.say('trader', 'I\'m sure your momma would love to know what you\'ve been up to while she\'s been here in the TV. Why don\'t you tell us about what you\'ve been doing since you left home.');
      await api.narrate('Her face turns solemn. Her thumb goes into her mouth.');
      await api.say('waverly', 'They took me to a Columbus House.', { mood: 'sad' });
      await api.say('trader', 'Oh, a group home. And if I\'m not mistaken, the same one you grew up in.', { mood: 'smug' });
      var c1 = await api.choice(['That\'s correct.', 'Yes. And I\'d burn it to the ground if I could.']);
      if (c1 === 1) { api.approvalAdd(-3); await api.say('trader', 'Arson! On a family special! Folks, she\'s a firecracker.', { mood: 'happy' }); }
      else await api.think('Short and sweet. He already knows all this. Why are we playing this sick game?');
      await api.say('trader', 'And how do you like the House?');
      await api.say('waverly', 'Kids are mean. I don\'t like it there.', { mood: 'sad' });
      await api.narrate('She tugs my shirt, climbs up to stand on her chair, grabs my wrist and leans into my ear. A whole stream of words, quick and grown-up, pours out of her.');
      await api.say('waverly', 'I really don\'t wanna live in the home anymore. Mamma, can I please leave and come live on the TV with you? I promise I\'ll be really really good and not cause any trouble even if Judy Thompson says that I did but I didn\'t I promise.', { mood: 'cry' });
      await api.think('That was my Waverly. Still in there, just a few layers down.');
      await api.say('trader', 'Now, now ladies. It\'s not polite to have private conversations when someone else is in the room. Didn\'t your momma ever teach you that?', { mood: 'smug' });
      await api.say('waverly', 'Momma taught me to say please and thank you and not to whisper and also not to interrupt, mister.', { mood: 'angry' });
      await api.narrate('An entire circus erupts in my heart, complete with elephants and honking clowns. That\'s my girl.');
      await api.say('trader', 'Well, your momma isn\'t exactly the expert on polite behavior given where she\'s ended up.', { mood: 'smug' });

      /* PROTECT: the barb */
      var b1 = await api.choice([
        'Hey! Please don\'t talk like that to my daughter.',
        '(Swallow it. Smile for the camera.)'
      ], { prompt: 'Trader\'s barb hangs in the air.' });
      if (b1 === 0) {
        api.approvalAdd(-1); bond(api, +3);
        await api.think('Immediately I regret it. The safest way to deal with someone like Trader is to bury your pressure points deep.');
        await api.say('trader', 'Your daughter needs to learn to respect those who are above her, which at this moment is pretty much everyone. Clearly, you neglected to teach her some basic lessons. Luckily, she\'s still young.', { mood: 'smug' });
      } else {
        api.approvalAdd(+2); bond(api, -5);
        await api.narrate('I smile. Waverly looks up at me, and something in her face goes very still.');
      }
      await api.say('waverly', 'Momma taught me lots of things. You\'re a meanie, sir. Just like Judy Thompson.', { mood: 'angry' });
      api.sound('sting');
      await api.think('He could break her. One word to the right people and he could break her.');
      var b2 = await api.choice([
        'Waverly, stop. We can talk about it later.',
        'Stop acting like a baby!',
        '(Squeeze her hand under the table and let her finish.)'
      ], { prompt: 'Trader\'s eyes narrow at your daughter.' });
      if (b2 === 0) {
        await api.say('waverly', 'But I—', { mood: 'sad' });
        await api.say('luna', 'Stop. We can talk about it later.');
        await api.narrate('She quiets down and buries her head in her hands. My heart aches for her. But her safety matters more than how she feels right now.');
        await api.say('trader', 'Now that\'s more like it. Perhaps if you make it out of here, you can become a better parent after all.', { mood: 'smug' });
      } else if (b2 === 1) {
        bond(api, -15); api.approvalAdd(+3); api.set('ch09_snapped', true);
        await api.emote('waverly', '…', 900);
        await api.narrate('It comes out louder than I mean it. The audience laughs. Waverly\'s face crumples, and then closes, like a door.');
        await api.say('trader', 'Ha! Discipline! Now that\'s what I like to see.', { mood: 'happy' });
        await api.think('I didn\'t mean it. I meant: be small, be safe. She doesn\'t know that.');
      } else {
        bond(api, +5); api.approvalAdd(-4);
        await api.say('waverly', 'And you\'re not even good at dancing.', { mood: 'angry' });
        await api.narrate('Somebody in the audience snorts. Trader\'s smile freezes for a half-second too long.');
        await api.say('trader', 'Out of the mouths of babes. We\'ll see who\'s laughing, little miss.', { mood: 'angry' });
        await api.think('I made her braver. I may have made her a target.');
      }

      await api.say('trader', 'Now, if we could just get back to my questions… Have you been watching the show at all and cheering your momma on?');
      await api.narrate('She shrinks under our gazes. Her bottom lip trembles. Slowly, she nods.');
      await api.say('waverly', 'I close my eyes during the scary bits. But I like to watch when momma is on the tv.', { mood: 'sad' });
      await api.think('The scary bits. John. Carol. Oh, baby.');
      await api.say('trader', 'Yes of course you do. And do you think your momma will win or do you think she will lose?');
      await api.say('waverly', 'Win, silly.', { mood: 'happy' });
      await api.say('trader', 'And why is that?');
      await api.say('waverly', 'Cause she\'s the smartest. She taught me to count to one-hundred.', { mood: 'happy' });
      await api.think('Counting. She said counting, on live television, looking straight at me. Seven seconds, Grandma\'s rule. Our fridge notes are all counting.');
      await api.say('trader', 'I see. And would it be correct to say that your momma is your favorite person on the show?');
      await api.say('waverly', 'Yeah, and I\'m her number one fan.', { mood: 'happy' });
      var n1 = await api.choice(['That\'s because you\'re my number one girl.', '(Pull her into your side and kiss her curls.)']);
      if (n1 === 0) { bond(api, +5); api.approvalAdd(+3); await api.narrate('We grin at each other, drunk on the temporary high of togetherness.'); }
      else { bond(api, +3); api.approvalAdd(+2); await api.narrate('God, I\'d forgotten how good that felt.'); }
      await api.say('trader', 'So who is your second favorite person on the show?', { mood: 'smug' });
      await api.say('waverly', 'No one.');
      await api.say('trader', 'No? There\'s not a single other person that you like better than all the rest?');
      await api.say('waverly', 'Hmm. Delphin?');
      await api.say('trader', 'Ah, a Delphin fan. Well, you\'re certainly not alone in that. What is it that you like about him?');
      await api.say('waverly', 'Delphin and momma are in the lions.', { mood: 'happy' });
      await api.say('trader', 'The lions?');
      await api.say('luna', 'I think you mean an alliance.');
      await api.say('waverly', 'Yeah, that. Markus said that the lions meant that momma and Delphin would help each other and that he and I should be in lions so that if momma won, he could come and live with us and go to school.', { mood: 'happy' });
      await api.narrate('She turns beet red.');
      await api.say('waverly', 'I wasn\'t supposed to say that.', { mood: 'fear' });
      var mk = await api.choice([
        'Markus, thank you so much for looking after Waverly. Please continue to do so and I promise that when I win, you will have anything you want.',
        '(Squeeze her hand. Don\'t give Trader the name to play with.)'
      ], { prompt: 'Markus. Someone is looking after her.' });
      if (mk === 0) {
        api.set('f_markus_deal', true); api.approvalAdd(+2);
        await api.narrate('I say it to the cameras, wherever they\'re hidden.');
      } else {
        await api.say('luna', 'That\'s okay, baby.');
      }

      await api.say('trader', 'Okay ladies. We\'re almost out of time, but I have one more question before you have to go. You\'re sitting together for the first time in months and you don\'t know if or when you\'ll see each other again. Is there anything either of you would like to say to one another before you part again, possibly for good?');
      var gb = await api.choice([
        'I love you. Be good and work hard. I\'ll come for you soon, okay? Just be the strong girl I know you can be.',
        'Don\'t cry, Wavey-woo. Momma\'s going to win. I promise.'
      ]);
      bond(api, +2);
      if (gb === 0) {
        await api.say('luna', 'I love you.');
        await api.say('luna', 'Be good and work hard. I\'ll try my best to—');
        await api.narrate('I have to stop and wipe my eyes on my sleeve.');
        await api.say('luna', 'I\'ll come for you soon, okay. Just be the strong girl I know you can be.');
      } else {
        await api.say('luna', 'Don\'t cry, Wavey-woo. Momma\'s going to win. I promise.');
      }
      await api.say('trader', 'Beautiful. And you?', { mood: 'happy' });
      await api.say('waverly', 'I don\'t wanna go back.', { mood: 'cry' });
      await api.say('trader', 'Well, that\'s all we have time for today. Can we get a round of applause for our special guest as a thank you for coming all this way?', { mood: 'happy' });
      api.sound('applause');
      await api.narrate('Waverly slaps her hands over her ears and squeezes her eyes shut.');
      var ap = await api.choice(['(Rub her back until the applause stops.)', '(Sit still. The cameras are on you.)']);
      if (ap === 0) { bond(api, +3); await api.narrate('I rub her back until it stops. Until she feels safe enough to look out at the world again.'); }

      /* the tantrum + Note 1 */
      api.show('ginerva');
      await api.move('ginerva', [M('dpe_hq_studio', 'waverly_seat')[0] + 2, M('dpe_hq_studio', 'waverly_seat')[1]]);
      await api.say('ginerva', 'Follow me. I\'ll transport you back to your household.');
      await api.say('waverly', 'No. No!', { mood: 'angry' });
      await api.say('waverly', 'I won\'t, I won\'t, I won\'t.', { mood: 'cry' });
      await api.say('ginerva', 'Pockets, young lady.', { mood: 'angry' });
      await api.narrate('Ginerva grabs for her. Waverly shrieks, high and piercing, and throws herself to the floor.');
      api.sound('alarm'); await api.shake(300, 2);
      await api.say('trader', 'Leave the child be, Ginerva.', { mood: 'neutral' });
      await api.narrate('Ginerva straightens, lips white. Trader looks at the sobbing child thrashing on the floor and sighs.');
      await api.say('trader', 'She\'s your daughter.', { mood: 'tired' });
      await api.narrate('No more words needed. I scoop her up and hold her tight against my shoulder. Her fists beat at my back. My shirt grows damp with her tears.');
      await api.narrate('And then, in the hug, her fist uncurls against my palm. Something folded small and hard. Paper.');
      var q = await api.minigame('qte', { mode: 'timing', title: 'PALM IT', prompt: 'Close your hand when the camera swings away', rounds: 1, need: 1, zone: 0.22, speed: 0.9 });
      if (q.success) {
        api.set('ch09_palmedClean', true);
        await api.think('Into my sleeve. Gone. Nobody saw. I hope nobody saw.');
      } else {
        await api.say('ginerva', 'Hands where I can see them, Miss Bartley.', { mood: 'angry' });
        await api.narrate('I hold them up. Empty. The paper is already in my sleeve. Ginerva\'s eyes narrow, but Trader waves her off.');
      }
      await api.say('luna', 'I\'m sorry.');
      await api.narrate('I hand her to Ginerva, who takes her with the edges of her fingers. Too exhausted to fight, Waverly rests against her. At the door, she perks up.');
      await api.move('ginerva', M('dpe_hq_studio', 'guest_door'));
      await api.say('waverly', 'No.', { mood: 'cry' });
      await api.say('luna', 'I\'ll see you soon. I promise you, Wavery-woo.');
      api.hide('ginerva'); api.hide('waverly');
      await api.say('trader', 'That must have been hard for you.', { mood: 'sad' });
      await api.think('He sounds… almost sorry.');
      await api.say('luna', 'Yeah.');
      await api.say('trader', 'Delphin, next.');
      api.lowerThird(null); api.onAir(false); api.approval(false);

      /* =================== 5. NOTE 1 IN THE CELL =================== */
      await api.goRoom(MAP.cells, { at: M('dpe_hq_cells', 'luna_cell'), facing: 'down' });
      if (!USING[MAP.cells] && !here('ch09_bars')) api.addObject({ id: 'ch09_bars', at: [22, 3], draw: drawBars, solid: true, examine: 'Bars.' });
      await api.narrate('Back in the cell. I sit with my back to the camera and my sleeve in my lap, shaking from the effort of not crying.');
      await api.note({ title: 'folded paper, in pencil', text: 'I want to help! Creepy Trader keeps calling me. I think he likes me. I can use that to help you escape.' });
      api.set('f_note1_read', true);
      await api.think('Of all the things to forget to put in code.');
      await api.think('Trader keeps calling her. Trader. My eleven-year-old. Calling her.');
      var nh = await api.choice(['(Chew it up and swallow it.)', '(Tear it into nothing and scatter it under your heel.)', '(Fold it into your sock. You need to keep it.)']);
      if (nh === 2) { api.set('ch09_keptNote', true); await api.think('Stupid. I know it\'s stupid. It\'s her handwriting.'); }
      else if (nh === 0) await api.think('Pencil and cheap paper. It tastes like the group home.');
      else await api.think('Dust. Just dust now, under my heel, under the camera.');
      bond(api, +0);

      /* the other interviews on the cell TV */
      api.sound('static');
      await api.tv([
        { speaker: 'trader', mood: 'happy', headline: 'FRIENDS & FAMILY • Delphin', text: 'Please welcome Jesemie, an old friend of Delphin\'s from his Columbus days!', tag: 'LIVE' },
        { speaker: 'trader', mood: 'smug', headline: 'FRIENDS & FAMILY • Delphin', text: 'Delphin? Nothing for your old pal? …Nothing? Folks, the strong silent type.', tag: 'LIVE' }
      ]);
      await api.think('Jesemie. I knew that face. Two years above us at Columbus, one of the boys who ran with the older crowd. Gang-mates, by the end. Delphin sits with his arms crossed like a shield, chin up, eyes smouldering into the lens. He never says a word.');
      await api.think('Waverly\'s face when I handed her to Ginerva. Like her faith in the whole world broke along with her heart. I\'m repeating my mother\'s mistakes.');
      var sl = await api.choice(['(Slap your own leg. Hard.)', '(Count to seven. Grandma\'s seven seconds.)']);
      if (sl === 0) await api.think('The sting brings me back. Grieve for a minute. Then get your head back in the game.');
      else await api.think('Seven seconds. That\'s all it takes to overcome your first instinct and process your second thought. One. Two. Three…');
      await api.tv([
        { speaker: 'trader', headline: 'FRIENDS & FAMILY • Isaiah', text: 'I understand that it was the boy\'s father who turned him in. Did you know about it beforehand, and were you in support of that decision?', tag: 'LIVE' }
      ]);
      await api.narrate('Isaiah\'s mother looks at him, and even through the screen I can see her watching him grow up in her head, all the way back to the day he was born.');
      await api.say('isaiah_mom', 'Of course.', { mood: 'sad' });
      await api.think('Her eyes beg him not to believe her. It doesn\'t matter. He\'s already looked away. When she reaches for him, he backs off. It never gets easier to let go of your child, no matter how many times the world makes you.');

      /* Kessie, played out on the studio set as a broadcast */
      api.set('ch09_scene', 'kessie');
      await api.goRoom(MAP.studio, { at: M('dpe_hq_studio', 'hidden'), facing: 'up' });
      api.player.visible = false;
      api.lockPlayer();
      api.onAir(true);
      api.lowerThird('ON YOUR CELL TV', 'FRIENDS & FAMILY • Kessie', undefined, 'LIVE');
      api.ambient('static');
      await api.pan(M('dpe_hq_studio', 'luna_seat'), 400);
      await api.say('trader', 'Kessie! Have you been watching? Wonderful. And who do you think will be coming to talk with you?', { mood: 'happy' });
      await api.say('kessie', 'I\'m not certain. I don\'t have any family and I\'d be flabbergasted if any of my friends were interested in appearing on television.', { mood: 'neutral' });
      await api.say('trader', 'Well get ready to be flabbergasted. Because I think you\'ll find that we\'ve managed to dig up a very close friend indeed.', { mood: 'smug' });
      api.show('lion');
      await api.move('lion', M('dpe_hq_studio', 'lion_in'));
      await api.think('A True Believer. A lion mask. A new one, who hasn\'t been on the show. Did they catch us at the fence after all? No. There would have been consequences.');
      await api.say('kessie', 'I don\'t understand. I don\'t know any true believers. Why are they here?', { mood: 'fear' });
      await api.say('trader', 'Excuse me. I think you might be in the wrong place. We\'re expecting a young Naima Jekil.', { mood: 'neutral' });
      await api.narrate('The Lion tilts its mask. Nothing more.');
      await api.say('trader', 'An easy mistake to make, of course. These halls are filled with twists and turns— oh, in fact, that\'s probably her right now. Excellent. Excellent.', { mood: 'happy' });
      api.show('judge'); api.sound('sting');
      await api.move('judge', M('dpe_hq_studio', 'judge'));
      await api.narrate('It is decidedly not excellent. The judge, the executioner, the villain of every child\'s nightmares, enters stage right.');
      await api.say('trader', 'What are you doing here? Do you have something to do with this?', { mood: 'shock' });
      await api.say('judge', 'I\'m here to clean up your mess.', { mood: 'angry' });
      await api.say('trader', 'Wha-what do you mean?', { mood: 'fear' });
      api.face('judge', 'kessie');
      await api.say('judge', 'This woman has tricked you. She is here under false premises, a liar, a fraud.', { mood: 'angry' });
      await api.say('kessie', 'I don\'t know what—', { mood: 'fear' });
      await api.say('judge', 'Silence, harlot! If I want your opinion, I will ask for it, otherwise you have lost the right to speak.', { mood: 'angry' });
      await api.shake(300, 2);
      if (api.get('f_kessie_secret_told', true)) {
        await api.think('Caught. The day after she confided in me. The day after I passed it on to—');
        await api.think('Annette.');
        await api.think('The woman I trusted. The woman I wanted to be my mother. She went the same way as my real one, and worse: she made me the villain in someone else\'s betrayal.');
        await api.think('I want to rip her apart. Woah. Calm down. This place is making you violent. Don\'t let them win.');
      } else {
        await api.think('Who told? Who could have known?');
      }
      await api.say('judge', 'You wanted a visitor for each of your little toys here. Well I have tired of your childish games and have taken the liberty of assigning the visitor for this traitor myself.');
      await api.say('trader', 'Are you sure? There were no signs.', { mood: 'sad' });
      await api.say('judge', 'Do you doubt me?', { mood: 'smug' });
      await api.say('trader', 'No, of course not. But why do this here? With everyone watching.', { mood: 'fear' });
      await api.say('judge', 'The cameras are broadcasting. I chose to make this a public confrontation because both of you needed a lesson taught.');
      api.face('judge', 'lion');
      await api.say('judge', 'Remove your mask.');
      await api.think('All over the country people must be gasping. A True Believer unmasking in public is a death sentence.');
      await api.wait(600);
      api.setSpec('lion', 'deandre');
      api.sound('reveal');
      await api.narrate('He lowers his hood. A buzz cut. Then, knot by careful knot, the mask. A large man, dark-skinned, a shade darker than Kessie, his face held in a strange expression, as if he\'s forgotten how to work the little muscles. And his eyes. Pond-scum green. Kessie\'s eyes.');
      await api.say('kessie', 'De-deandre?', { mood: 'shock' });
      await api.move('kessie', M('dpe_hq_studio', 'kessie_reach'));
      await api.say('kessie', 'Son. It\'s me. Do you remember me?', { mood: 'cry' });
      api.sound('hit'); await api.shake(200, 2);
      await api.narrate('As she reaches for his face his arm lashes out, faster than a snake, and swipes her hand away. It catches her cheek on the way back.');
      await api.say('kessie', 'What have they done to you? Oh, my poor boy. I should have found you years ago. I\'m so sorry.', { mood: 'cry' });
      await api.say('judge', 'Do you see now? He was never yours. Once a child joins the true believers, they belong to the state. And the state will never give them back.', { mood: 'smug' });
      await api.say('kessie', 'No. He can\'t be.', { mood: 'cry' });
      await api.say('judge', 'He is.');
      await api.say('kessie', 'But I spent so long trying to find him.', { mood: 'cry' });
      await api.say('judge', 'That was foolish of you. And now your punishment will be significantly worse than if you\'d only just accepted his fate.', { mood: 'angry' });
      await api.think('Trader opens his mouth. Looks at his father\'s hand on Kessie\'s shoulder. Turns slightly green. Shuts it. Coward.');
      await api.say('judge', 'What are you waiting for? This is the special guest episode, is it not? Commence with the interviews.');
      await api.say('trader', 'I— As you wish, sir.', { mood: 'tired' });
      await api.narrate('Deandre wrenches his mother\'s arms behind her back and frog-marches her to the table. He sits ramrod-straight at Trader\'s right hand.');
      await api.move('kessie', M('dpe_hq_studio', 'luna_seat'));
      await api.move('lion', M('dpe_hq_studio', 'guest_seat'));
      api.face('kessie', 'right'); api.face('lion', 'left');
      await api.say('trader', 'This is clearly a very emotional moment. How are the two of you feeling?', { mood: 'neutral' });
      await api.narrate('Nothing but the sound of Kessie\'s sniffs.');
      await api.say('kessie', 'Do you remember when I used to read to you every night? You loved books about trains. There was this one book, about a little green train that wouldn\'t stop. I read it so many times that I still have it memorized.', { mood: 'sad' });
      await api.say('kessie', 'The Little Green Train on the Tracks. You couldn\'t put it down. Maybe because the train had a name like yours. Dean.', { mood: 'sad' });
      await api.narrate('She lays her hand on top of her son\'s. He doesn\'t react. But he doesn\'t pull away.');
      await api.say('kessie', 'Dean the green was oh so mean. But his cars were always oh so clean. He ran all day. He ran all night. He ran in hope, he ran in fright. But Dean had such a thing to say. He thought that all should romp and..', { mood: 'sad' });
      await api.wait(900);
      await api.narrate('Deandre\'s face strains, like he can\'t see straight. Trying so, so hard.');
      await api.say('lion', 'Play.', { name: 'Deandre', mood: 'neutral' });
      await api.say('kessie', 'Yes son. He thought that all should romp and play.', { mood: 'cry' });
      await api.say('lion', 'Mom?', { name: 'Deandre', mood: 'sad' });
      await api.say('kessie', 'Yes, that\'s me, my boy. Momma\'s here and I love you so much.', { mood: 'cry' });
      api.sound('hit'); api.flash('#ffffff', 200);
      await api.shake(500, 3);
      await api.narrate('He drops. Lands heavily on his back with an audible clang.');
      await api.say('kessie', 'Deandre? Baby, what\'s going on?', { mood: 'fear' });
      api.show('tb_dog'); api.show('tb_turtle');
      await api.move('tb_dog', [M('dpe_hq_studio', 'luna_seat')[0], M('dpe_hq_studio', 'luna_seat')[1] - 1]);
      await api.move('tb_turtle', [M('dpe_hq_studio', 'luna_seat')[0] - 1, M('dpe_hq_studio', 'luna_seat')[1]]);
      await api.say('judge', 'That\'s enough. You\'ve had your reunion. And it seems like this one\'s training wasn\'t thorough enough. I\'ll have to speak to the instructors.', { mood: 'smug' });
      await api.say('judge', 'I\'ll have him sent for reconditioning immediately.');
      await api.say('kessie', 'You leave him alone!', { mood: 'angry' });
      await api.say('kessie', 'You\'re monsters. Inhuman. How could you do this to a person? You have no feelings.', { mood: 'angry' });
      await api.move('judge', [M('dpe_hq_studio', 'luna_seat')[0] + 1, M('dpe_hq_studio', 'luna_seat')[1] + 1]);
      await api.say('judge', 'If I am so inhuman, do you really believe that it is a wise idea to provoke me?', { mood: 'smug' });
      api.sound('hit');
      await api.emote('kessie', '!', 600);
      await api.narrate('Kessie spits in the Judge\'s face. Trader gasps.');
      await api.say('judge', 'You will regret that.', { mood: 'angry' });
      await api.say('judge', 'Take her away.');
      api.hide('kessie'); api.hide('tb_dog'); api.hide('tb_turtle'); api.hide('lion');
      await api.fadeOut(500);
      api.player.visible = true;
      api.ambient(null);
      api.lowerThird(null); api.onAir(false);

      await api.goRoom(MAP.cells, { at: M('dpe_hq_cells', 'luna_cell'), facing: 'up' });
      await api.tv({ speaker: 'trader', mood: 'tired', headline: 'EXECUTION PREDICTIONS • UPDATED', text: 'KESSIE — EXPOSED', ticker: 'POLL CLOSED • POLL CLOSED • ', tag: 'POLL' });
      await api.think(api.get('f_kessie_secret_told', true) ? 'Annette.' : 'Somebody.');
      await api.think('I was the one who told her. Whatever happens to Kessie now, it has my fingerprints on it.');

      /* =================== 6. BUS BACK =================== */
      api.set('ch09_scene', 'none');
      api.set('ch09_busBack', true);
      await api.goRoom(MAP.bus, { at: M('show_bus', 'luna'), facing: 'right' });
      api.lockPlayer();
      await api.narrate('The bus ride back is sombre. Every screech of the brakes is barely enough to make me look up from my lap. One seat is empty. We all know we won\'t be seeing Kessie again.');
      meter(api, 'm_isaiah', 30, -10);
      await api.narrate('Annette has taken the seat beside Isaiah. She rests her head against the window and settles in for a nap. Isaiah won\'t look at me.');
      var bb = await api.choice(['(Stare at Annette until she opens her eyes.)', '"Isaiah?"', '(Look out the window. Don\'t think.)']);
      if (bb === 0) {
        await api.narrate('She doesn\'t open them. Her mouth curves, just slightly. As if she knows exactly who is staring.');
        await api.think('I\'d thought, if I went to prison, Annette could raise Waverly. Bring her to visit. Now the thought sends bile burning up my throat.');
      } else if (bb === 1) {
        await api.say('luna', 'Isaiah?');
        api.face('isaiah_b', 'right');
        await api.narrate('He turns to the window. Annette pats his knee without opening her eyes.');
        await api.think('What has she told him?');
      } else {
        await api.think('Kessie\'s face when she realised she\'d been made. Waverly\'s face when I handed her over. Every time I blink.');
      }
      if (api.get('f_alliance_delphin', true)) {
        await api.say('delphin', 'Hey. Whatever that was… we\'re still lions. Right?', { mood: 'tired' });
        await api.think('Lions. Waverly\'s word. I nearly lose it, right there on the bus.');
      }

      /* =================== 7. LUNA'S ROOM =================== */
      await api.fadeOut(400);
      await api.narrate('Back at the House we\'re told to go straight to our rooms. No silliness. No conversing. I\'m too exhausted to disobey.');
      await api.goRoom(MAP.lunaRoom, { at: M('house_luna_room', 'luna'), facing: 'up' });
      api.unlockPlayer();
      var TAB = here('ch09_tablet') ? 'ch09_tablet' : 'tablet';
      var BED = here('ch09_bed') ? 'ch09_bed' : here('bed') ? 'bed' : null;
      if (here(TAB)) api.onInteract(TAB, async function (api) {
        await api.narrate('The wall tablet that never turns off. Tonight\'s "curated memory": Waverly at seven, gap-toothed, sticking a note to our fridge.');
        await api.think('They chose that one on purpose. They choose everything on purpose.');
      });
      if (BED) {
        api.onInteract(BED, async function (api) {
          await api.narrate('I change into the soft nightgown and lie down. Every time I close my eyes I see Waverly\'s face when I handed her over. That, and Kessie\'s.');
          api.set('ch09_lay', true);
        });
        await api.until(function (f) { return f.ch09_lay; }, { objective: 'Try to sleep', targets: [BED] });
        api.objective(null);
      }
      api.lockPlayer();
      api.sound('door');
      await api.narrate('About half an hour later, a knock. As usual, Ginerva doesn\'t wait for an answer.');
      if (!here('ginerva')) api.addNpc({ id: 'ginerva', at: M('house_luna_room', 'door'), facing: 'up' });
      api.show('ginerva');
      await api.say('ginerva', 'Mr. Johnson would like to see you in his office.');
      var dc = await api.choice(['Do I have a choice?', '(Get up without a word.)']);
      if (dc === 0) await api.say('ginerva', 'No. You have five minutes to get ready. I will be waiting outside to escort you.');
      else await api.say('ginerva', 'Five minutes. Dress appropriately.');
      api.unlockPlayer();
      await api.waitForInteract('ginerva', { objective: 'Throw on some clothes and follow Ginerva' });
      api.objective(null);
      await api.fadeOut(400);
      await api.narrate('Down hallways I haven\'t explored, to a gold door with a plaque.');
      await api.slides([{ style: 'card', title: 'EXECUTIVE SWEET', text: '(sic)' }]);
      await api.think('I feel the familiar tinge of curiosity and shove it back down. I\'m done finding things out that can be used against people.');

      /* =================== 8. TRADER'S OFFICE =================== */
      await api.goRoom(MAP.office, { at: M('house_trader_office', 'luna_enter'), facing: 'up' });
      if (!here('trader')) api.addNpc({ id: 'trader', at: M('house_trader_office', 'trader'), facing: 'down' });
      await api.narrate('Trader\'s office sparkles the same way Trader does. Gold desk, gold knick-knacks, gold chandelier. A headache forms behind my temples just from looking.');
      await api.say('trader', 'Thank you Miss Malcont, you may go.');
      await api.think('Was it only because I knew their history that I noticed her shoulders stiffen?');
      if (here('ginerva')) api.remove('ginerva');
      await api.say('trader', 'Thanks for coming.', { mood: 'happy' });
      await api.say('luna', 'Well, I didn\'t have much of a choice.');
      await api.say('trader', 'Trust me, you\'ll like this. We\'re just going to have to wait a minute for it to come through. In the meantime, take a seat. Let\'s have a little chat.', { mood: 'happy' });
      var seat = here('ch09_chair') ? 'ch09_chair' : here('office_guest_chair') ? 'office_guest_chair' : 'trader';
      await api.waitForInteract(seat, { objective: seat === 'trader' ? 'Sit down across from Trader' : 'Take a seat (the little gold chair)' });
      api.objective(null);
      api.lockPlayer();
      if (seat !== 'trader') { api.teleport(M('house_trader_office', 'chair'), 'up'); }
      await api.think('His chair is full-sized. Mine is fit for a five-year-old. It makes him tower over me.');
      await api.say('luna', 'Do you chat with all the participants like this?');
      await api.say('trader', 'Only the ones who interest me.', { mood: 'smug' });
      var tk = await api.choice(['And did Kessie… interest you?', 'What\'s this about, Trader?']);
      if (tk === 0) await api.say('trader', 'Let\'s not talk about Kessie.', { mood: 'angry' });
      else await api.say('trader', 'Patience is a virtue, Miss Luna. Not one of yours.', { mood: 'smug' });
      await api.narrate('He leans back, folds his arms behind his head and kicks his feet up on the desk.');
      await api.say('trader', 'Let\'s talk about you, Miss Luna Bartley. I find you very interesting.', { mood: 'smug' });
      await api.say('luna', 'You shouldn\'t. I\'m nothing special.');
      await api.say('trader', 'I don\'t believe that for an instant. Average people don\'t end up on a show like this.');
      api.sound('alarm');
      await api.narrate('The phone rings.');
      await api.say('trader', 'Ah, there they are. Hello? …Understood. Thanks again for this, I really owe you one. Of course, I\'ll come through for that.', { mood: 'happy' });
      await api.narrate('Without looking, he reaches under the desk. Click. The little red light in the corner of the ceiling goes dark.');
      await api.say('trader', 'Hold it up to your ear and just talk normally. This line isn\'t being recorded but you only have five minutes.', { mood: 'neutral' });
      await api.narrate('He settles back in his chair to watch.');
      await api.think('I\'ve never had the money for a phone. I hold it like it might bite.');

      /* =================== 9. THE CALL =================== */
      clock(api, 0);
      await api.say('luna', 'Hello?');
      await api.say('waverly', 'Momma?', { mood: 'sad' });
      await api.say('luna', 'Waverly!');
      await api.say('waverly', 'Momma! I don\'t wanna be here anymore. Please take me home. I wanna go home.', { mood: 'cry' });
      clock(api, 25);
      await api.say('luna', 'I know, baby. I want to go home too but you need to sit tight just a bit longer. I\'ll come for you soon.');
      await api.say('waverly', 'The kids are so mean.', { mood: 'cry' });
      await api.say('luna', 'I know, Wavey, I know.');
      await api.say('waverly', 'They hurt me in my tummy.', { mood: 'cry' });
      await api.think('My hand closes so hard on the phone the plastic creaks.');
      await api.say('luna', 'I\'ll get you out, I promise, but you need to be brave for me. Can you do that? Can you be brave?');
      await api.say('waverly', '…I guess so.', { mood: 'sad' });
      clock(api, 35);
      var md = await api.choice([
        'Listen to me, baby, listen real close. That friend of yours, Markus—',
        'Can you tell a grown-up? Any grown-up?'
      ], { timer: 12, timeoutPick: 0 });
      if (md === 0) {
        await api.say('waverly', 'My lions?');
        await api.say('luna', 'That\'s right, your alliance. I need you to tell him something for me. Tell Markus that if he can make it so that no one hurts you in your tummy again, I will make sure that he will be rich for the rest of his life. Tell him to tell his friends. Waverly is off limits.');
        await api.say('waverly', 'I am?');
        await api.say('luna', 'That\'s right, you are. Make sure to say it to Markus exactly like that. How long has he been in the home?');
        await api.say('waverly', 'His whole life.');
        await api.say('luna', 'Then he\'ll know what to do with it.');
        api.set('f_markus_deal', true);
      } else {
        await api.say('waverly', 'The grown-ups don\'t care, Momma. Markus is the only one who cares.', { mood: 'sad' });
        await api.say('luna', 'Then tell Markus. Tell him Waverly is off limits, and I\'ll make him rich for the rest of his life.');
        api.set('f_markus_deal', true);
      }
      clock(api, 45);
      await api.say('waverly', 'But when are you coming home?');
      await api.say('luna', 'Soon. And Waverly, there\'s something else I need you to do for me. It\'s really important, okay? But it\'s gonna be really hard too.');
      await api.say('waverly', 'What is it?');
      await api.say('luna', 'Don\'t watch the show. If it\'s on when you\'re in the room, walk away. If it\'s on in your dorm after curfew then—');
      await api.say('waverly', 'I can put my fingers in my ears and sing la-la-la.', { mood: 'happy' });
      await api.say('luna', 'That\'s a great idea but don\'t make anyone mad, okay? Also, tell Markus to find a girl to watch you in the dorm if he wants his cut.');
      clock(api, 40);
      await api.think('The note. "I can use that to help you escape." I have to answer it. Trader is three feet away with his feet on the desk, listening to every word.');
      await api.think('She said it herself, on live TV. I taught her to count to one hundred.');

      var reply = await api.choice([
        'Let\'s do your counting, like always. You count with me, okay?',
        'Don\'t you dare help me. Stay away from him.',
        '(Say nothing about the note.)'
      ], { prompt: 'Answer Note 1.' });
      var callEnded = false;
      if (reply === 0) {
        await api.say('waverly', 'Okay, Momma. Like always.', { mood: 'happy' });
        var sent = false;
        for (var attempt = 0; attempt < 2 && !sent; attempt++) {
          var r = await api.minigame('countpad', {
            ciphertext: R1_CIPHER, time: attempt === 0 ? 90 : 75,
            revealKey: !api.get('f_code_learned', true),
            title: attempt === 0 ? 'COUNTING PRACTICE' : 'COUNTING PRACTICE • FROM THE TOP'
          });
          if (r.success) sent = true;
          else if (attempt === 0) {
            await api.say('waverly', 'Momma? You stopped.', { mood: 'neutral' });
            await api.say('luna', 'Sorry, baby. Again. From the top.');
            clock(api, 30);
          }
        }
        if (sent) {
          api.set('f_code_reply_sent', true);
          bond(api, +5);
          await api.say('luna', 'Twenty-one, twenty-two… twenty-six, twenty-seven, eight, thirty-two… twenty-six, eight, thirteen, twelve.');
          await api.narrate('A pause on the line. A long one. I can hear her thinking.');
          await api.say('waverly', '…Twenty-one, twenty-two. Okay, Momma. I got it.', { mood: 'neutral' });
          await api.say('trader', 'Counting practice? Cute.', { mood: 'happy' });
          await api.think('No. Stay safe. He switched the cameras off himself. No AI is ever going to flag a mother counting with her kid.');
        } else {
          api.set('f_code_reply_sent', false);
          bond(api, -10);
          await api.say('waverly', 'Momma, I don\'t get it…', { mood: 'sad' });
          await api.think('My mouth won\'t make the numbers. Not with him watching. I let it go, and I hate myself for it.');
        }
      } else if (reply === 1) {
        api.set('f_code_reply_sent', false);
        bond(api, -25);
        await api.say('luna', 'Don\'t you dare help me. Stay away from him. Do you hear me? Stay away from Trader.');
        await api.emote('trader', '!', 800);
        await api.narrate('Trader\'s feet come down off the desk. He stands. He holds out his hand for the phone.');
        await api.say('waverly', 'But Momma, I— Momma? Momma!', { mood: 'cry' });
        await api.narrate('He takes it. Waverly is crying on the other end as he hangs up.');
        callEnded = true;
      } else {
        api.set('f_code_reply_sent', false);
        bond(api, -10);
        await api.think('Not here. Not with him listening. She\'ll understand. She has to understand.');
      }
      if (api.get('f_code_reply_sent') === undefined) api.set('f_code_reply_sent', false);

      if (!callEnded) {
        clock(api, 50);
        await api.say('waverly', 'Okay, momma. But I really just want to go home now please.', { mood: 'sad' });
        await api.say('luna', 'And you will. But for now, do the things I tell you. I promise I\'ll come for you as soon as I can.');
        await api.say('waverly', 'You pinky swear?');
        var pk = await api.choice(['I\'m holding my pinky up to the phone right now.', 'I swear, baby.']);
        if (pk === 0) {
          await api.say('luna', 'I\'m holding my pinky up to the phone right now. And we both know that no one is allowed to break a pinky promise.');
          bond(api, +3);
        }
        await api.narrate('A tiny giggle. It warms me all the way through. Thank God for this Markus.');
        clock(api, 40);
        await api.narrate('Trader stands and makes a winding motion. Wrap it up.');
        await api.say('luna', 'Okay, little bunny, I have to go now. Stay strong and remember what I told you.');
        await api.say('waverly', 'Please don\'t go.', { mood: 'cry' });
        await api.say('luna', 'I would stay and talk to you for hundreds of years if I could. But I have to go. I\'ll talk to you soon.');
        await api.say('waverly', 'No!', { mood: 'cry' });
        await api.narrate('Trader takes the phone. It must be the housemaster on the other end: he spends the next minute promising to wire the money as soon as possible.');
        await api.say('trader', 'Alright, thanks man.');
      }
      api.lowerThird(null);
      await api.narrate('He looks at me, a snuffling mess, and rustles through his desk drawer. He hands me a tissue.');
      await api.say('luna', 'Why?');
      await api.say('trader', 'That\'s a cool kid you\'ve got. I hope you can appreciate her.', { mood: 'sad' });
      await api.narrate('That sets off the floodworks again. Trader looks like he doesn\'t know what to do, so he just sits there and watches me cry.');

      /* =================== 10. NIGHT =================== */
      await api.fadeOut(600);
      await api.goRoom(MAP.lunaRoom, { at: M('house_luna_room', 'luna'), facing: 'up' });
      if (here('ginerva')) api.hide('ginerva');
      await api.narrate('Back in bed, under the fluffy pink comforter and the sheets that are always too cold.');
      await api.think('It isn\'t until I\'m tucked in that I realise he never actually answered my question.');
      if (api.get('f_code_reply_sent')) await api.think('No. Stay safe. Twenty-one, twenty-two. Please, baby. Please count with me.');
      else await api.think('"I can use that to help you escape." Oh, Waverly. What are you doing?');
      api.completeChapter();
    }
  });
})();
