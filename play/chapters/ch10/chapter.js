/* =========================================================================
 * ch10 "Honesty"  (Thu 25 Jan 2084, night -> Fri 26 Jan, 03:00)
 *
 * The red room: the Judge slaps and disowns Trader, taunts Isaiah, Delphin
 * and Annette, reveals that Trader hosted Franchesca's show (playable memory
 * flash), exposes Ginerva as his informant, and burns Kessie and Elephant
 * during a sermon on honesty. Luna lunges at Annette (or holds back) and is
 * chip-shocked. She wakes at 03:00 to the Judge taking over the show. A crayon
 * drawing slides under her door: on the back, Waverly's Note 2, which the
 * PLAYER decodes (Seven Code, A=8 .. Z=33), unaided first, help on request.
 *
 * Source: D3b L2717-2854 (red room), 2D L2579 (penguin arm), 2D L3062
 * (Judge as host), BEP L18 + CANON §8 (Note 2). Kessie's last words use the
 * CHAPTERS.md ✎ rewrite ("Twenty-four years ago…"). Delphin/Annette beat is
 * new (the draft skipped it). The burning is told in silhouette and sound.
 *
 * Cross-chapter flags (CHAPTERS.md §2)
 *   READS:  f_code_learned, f_code_reply_sent, f_kessie_secret_told, m_kessie,
 *           m_waverly, m_isaiah, m_annette, m_trader_insight, m_audience
 *   SETS:   f_mem_penguin_arm (true), m_trader_insight +2, f_attacked_annette,
 *           m_annette (+5 if Luna holds back), m_isaiah (+5 hand), f_note2_decoded,
 *           m_waverly (+5 decoded / -10 note put away), m_audience (via api.approval*)
 * Local flags: ch10_*  (ch10_examined, ch10_heldHand, ch10_noteHints, ...)
 *
 * Shared maps (G.shared.has() with fallbacks keyed by the shared ids):
 *   house_luna_room, house_bedroom_hall, house_service_stair, house_red_room,
 *   columbus_lounge (memory flash). Red-room staging uses
 *   G.shared.data.marks.house_red_room {cuffs_center, line_1.., judge, door}.
 * ========================================================================= */
(function () {
  'use strict';

  /* ---------------------------------------------------------------------
   * Shared-map plumbing. Maps are KEYED by the shared ids so the shared
   * to_<room> exits link. Each fallback (only used if a shared room is
   * missing) mirrors the shared layout and uses the SAME entity ids, so
   * targets and marks work either way.
   * ------------------------------------------------------------------- */
  var ROOMS = {
    luna: 'house_luna_room',
    hall: 'house_bedroom_hall',
    stair: 'house_service_stair',
    red: 'house_red_room',
    memory: 'columbus_lounge'
  };
  var N2 = '14-25-8-21-11-20-8 / 16-26 / 27-25-8-11-12-25-26 / 30-12-8-18 / 23-22-16-21-27'; // CANON §8 N2
  var N2_PLAIN = 'GRANDMA IS TRADERS WEAK POINT';

  function sdata() { return (G.shared && G.shared.data) || {}; }
  function xy(v) { if (!v) return null; if (Array.isArray(v)) return [v[0], v[1]]; if (v.x != null) return [v.x, v.y]; return null; }
  function hasShared(id) { try { return !!(G.shared && G.shared.has && G.shared.has(id)); } catch (e) { return false; } }
  function mark(mapId, name, fb) { var m = sdata().marks && sdata().marks[mapId]; return (hasShared(mapId) && m && xy(m[name])) || fb; }
  function spawn(mapId, name, fb) { var s = sdata().spawns && sdata().spawns[mapId]; return (hasShared(mapId) && s && xy(s[name])) || fb; }
  /** Shared map + our extension, or our minimal fallback with the same extension appended. */
  function room(id, fallback, ext) {
    if (hasShared(id)) return G.shared.map(id, ext);
    var m = {};
    Object.keys(fallback).forEach(function (k) { m[k] = fallback[k]; });
    var rm = ext.remove || [];
    ['objects', 'npcs', 'exits', 'zones'].forEach(function (k) { if (m[k]) m[k] = m[k].filter(function (e) { return rm.indexOf(e.id) < 0; }); });
    Object.keys(ext).forEach(function (k) {
      if (k === 'remove' || k === 'patch') return;
      if (Array.isArray(ext[k]) && Array.isArray(m[k])) m[k] = m[k].concat(ext[k]);
      else m[k] = ext[k];
    });
    Object.keys(ext.patch || {}).forEach(function (pid) {
      ['objects', 'npcs', 'exits', 'zones'].forEach(function (k) { (m[k] || []).forEach(function (e) {
        if (e.id === pid) Object.keys(ext.patch[pid]).forEach(function (f) { e[f] = ext.patch[pid][f]; });
      }); });
    });
    return m;
  }
  function always() { return true; }

  /* ---------------------------------------------------------------------
   * Custom tiles and props
   * ------------------------------------------------------------------- */
  function px(g, x, y, w, h, c) { g.fillStyle = c; g.fillRect(x, y, w, h); }
  var tiles = {
    bloodwall: { solid: true, wall: true, color: '#6a0c12', color2: '#c5d43a', pattern: 'plain',
      draw: function (g, x, y, info) {
        if (info.face) { px(g, x, y, 16, 16, '#7a0e16'); px(g, x, y + 13, 16, 3, '#4a060a'); px(g, x + (info.tx * 5) % 13, y + 4, 1, 6, '#5a080e'); }
        else { px(g, x, y, 16, 16, '#b8c832'); px(g, x, y + 14, 16, 2, '#8a9a20'); } // chartreuse ceiling seen from above
      } },
    redfloor: { solid: false, color: '#2a0a0c', color2: '#3a1012', pattern: 'noise' },
    steps: { solid: false, draw: function (g, x, y) { px(g, x, y, 16, 16, '#2a2a30'); for (var i = 0; i < 16; i += 4) { px(g, x, y + i, 16, 1, '#4a4a52'); px(g, x, y + i + 1, 16, 1, '#18181c'); } } }
  };
  var props = {
    // rusty cuffs hanging from the ceiling on chains
    cuffs: function (g, x, y, t, o) {
      var sway = Math.round(Math.sin(t * 1.3 + (o.tx || 0)) * 0.6);
      px(g, x + 7 + sway, y - 18, 1, 22, '#8a8a92');
      px(g, x + 5 + sway, y + 3, 5, 3, '#a0a0a8'); px(g, x + 6 + sway, y + 4, 3, 1, '#6a2a1a');
    },
    // a stack of logs
    logs: function (g, x, y) {
      px(g, x + 1, y + 6, 14, 4, '#5a3a1e'); px(g, x + 2, y + 9, 13, 4, '#6a4424'); px(g, x + 1, y + 12, 12, 3, '#4a2e16');
      px(g, x + 1, y + 6, 2, 4, '#c8a070'); px(g, x + 13, y + 9, 2, 4, '#c8a070'); px(g, x + 3, y + 7, 9, 1, '#7a5230');
    },
    // a red gasoline can
    jerrycan: function (g, x, y) {
      px(g, x + 4, y + 4, 9, 11, '#a01818'); px(g, x + 4, y + 4, 9, 2, '#c02828'); px(g, x + 10, y + 1, 2, 4, '#3a3a3a');
      px(g, x + 6, y + 8, 5, 3, '#e8c040');
    },
    drain: function (g, x, y) { px(g, x + 4, y + 5, 8, 6, '#141012'); for (var i = 0; i < 4; i++) px(g, x + 5 + i * 2, y + 5, 1, 6, '#4a4448'); },
    fire: function (g, x, y, t, o) {
      var s = (o.tx * 7 + o.ty * 3) % 10;
      for (var i = 0; i < 5; i++) {
        var h = 8 + ((Math.sin(t * 9 + i * 1.7 + s) + 1) * 5) | 0;
        px(g, x + 1 + i * 3, y + 16 - h, 3, h, i % 2 ? '#e8501a' : '#f08a20');
        px(g, x + 2 + i * 3, y + 16 - (h * 0.6 | 0), 1, h * 0.6 | 0, '#ffd860');
      }
    },
    crayon: function (g, x, y) { px(g, x + 3, y + 9, 10, 6, '#f2ead0'); px(g, x + 5, y + 10, 3, 2, '#e8c43a'); px(g, x + 9, y + 11, 2, 3, '#c4462a'); }
  };

  /* ---------------------------------------------------------------------
   * Cast (pyjamas; Kessie beaten). Shared ids for everyone else.
   * ------------------------------------------------------------------- */
  var cast = {
    delphin_pj: { extends: 'delphin', outfit: '#3a4a6a', outfit2: '#2a3450', style: 'casual' },
    isaiah_pj: { extends: 'isaiah', outfit: '#d8d8e0', outfit2: '#8a8aa0', style: 'casual', overlay: ['cornrows'] },
    annette_pj: { extends: 'annette', outfit: '#e8d0e0', outfit2: '#e8d0e0', style: 'robe' },
    kessie_beaten: { extends: 'kessie', outfit: '#cfc6b4', outfit2: '#cfc6b4', style: 'dress', accessory: 'bandage', overlay: [] },
    shadow_kessie: { name: 'Kessie', skin: '#0a0506', hair: '#0a0506', eyes: '#0a0506', outfit: '#0a0506', outfit2: '#0a0506', style: 'dress', height: 'tall', build: 'broad', overlay: [] },
    shadow_elephant: { name: 'Elephant', skin: '#0a0506', hair: '#0a0506', eyes: '#0a0506', outfit: '#0a0506', outfit2: '#0a0506', style: 'robe', hairStyle: 'hood', overlay: [] }
  };

  /* ---------------------------------------------------------------------
   * MAP: house_luna_room (No. 3). Night. Shared fixtures are patched by id.
   * ------------------------------------------------------------------- */
  var lunaFallback = {
    name: "Luna's Room",
    tiles: [
      '####WW####',
      '#P....Lbb#',
      '#......bb#',
      '#......bb#',
      '#..RRR...#',
      '#..RRR...#',
      '#.c......#',
      '#dd......#',
      '#........#',
      '####D#####'
    ],
    spawn: [4, 8],
    objects: [
      { id: 'window', at: [4, 0] }, { id: 'tablet', at: [2, 0] }, { id: 'bed', at: [7, 2] },
      { id: 'desk', at: [1, 7] }, { id: 'booklet', at: [2, 7] }, { id: 'smoke_detector', at: [7, 0], prop: 'camera', solid: false }
    ],
    exits: [{ id: 'to_bedroom_hall', at: [4, 9], to: ROOMS.hall, toAt: [14, 1], facing: 'down' }]
  };
  var L_DOOR = mark(ROOMS.luna, 'door', [4, 8]);
  var L_BED = mark(ROOMS.luna, 'bed', [6, 3]);
  var L_CENTER = mark(ROOMS.luna, 'center', [4, 5]);
  var lunaRoom = room(ROOMS.luna, lunaFallback, {
    ambient: 'hum', dark: 0.5, playerLight: 46, tint: '#101830', tintAlpha: 0.18,
    lights: [{ at: [4, 1], r: 40 }],
    patch: {
      window: { examine: async function (api) {
          if (api.has('ch10_woke')) { await api.think('The garden is black. No shadows at the fence tonight. There never will be again.'); return; }
          await api.think('The almond blossoms look grey in the floodlights. Sunday night there were two shadows at that fence.');
          await api.think('Kessie hasn\'t come back since the interviews. Her door has stayed shut for two days.');
          api.add('ch10_examined', 1);
        } },
      tablet: { examine: async function (api) {
          await api.narrate('The wall tablet cycles its "curated memories": Waverly blowing out candles on a cake we never had.');
          await api.think('It never turns off. Someone, somewhere, chose these pictures to keep me soft.');
          api.add('ch10_examined', 1);
        } },
      bed: { examine: async function (api) {
          if (api.has('ch10_woke')) { await api.think('The sheets smell of smoke. So does my hair. So do I.'); return; }
          await api.think('Pink comforter, silk sheets too cold to sleep in. I haven\'t slept since the bus.');
          api.add('ch10_examined', 1);
        } },
      desk: { examine: async function (api) {
          if (api.has('ch10_woke')) { await api.think('The DPE pen and the penguin booklet. Plenty of margin to write in.'); return; }
          await api.narrate('The penguin booklet lies open at "Rule 12: A contestant who conceals is a contestant who conspires."');
          api.add('ch10_examined', 1);
        } },
      smoke_detector: { examine: [{ think: 'The smoke detector. Eye. Its red dot is solid tonight. Recording, not watching.' }, { sound: 'camera' }] },
      // The door stays shut until Ginerva knocks, and again after the red room.
      to_bedroom_hall: { locked: '!ch10_summoned || ch10_woke', lockedText: [{ think: 'Locked. It\'s past eleven. The doors lock at eleven.' }] }
    },
    objects: [
      // Waverly's taped photo: the shared extra sits behind the nightstand, so it goes on the free wall by the door.
      { id: 'waverly_photo', at: [3, 0], prop: (sdata().upstairs && sdata().upstairs.extras && sdata().upstairs.extras.waverlyPhoto) ? sdata().upstairs.extras.waverlyPhoto.prop : 'photo', solid: false, layer: 1,
        examine: async function (api) {
          await api.think('Waverly\'s photo, taped back together. Her note is still under the mattress: "I can use that to help you escape."');
          if (!api.get('f_code_reply_sent', true)) await api.think('I never answered her properly. She\'ll think I didn\'t care. Better that than her thinking she can play Trader.');
          else await api.think('Twenty-one, twenty-two. No. Stay safe. Please, Wavey. Count with me and stay safe.');
          api.add('ch10_examined', 1);
        } }
    ]
  });

  /* ---------------------------------------------------------------------
   * MAP: house_bedroom_hall (F2), 42x6.
   * ------------------------------------------------------------------- */
  function hallTiles() {
    var rows = [], x, top = '', bot = '';
    for (x = 0; x < 42; x++) { top += (x === 14 || x === 19) ? 'D' : '#'; bot += '#'; }
    rows.push(top);
    for (var y = 1; y <= 4; y++) rows.push('#' + new Array(41).join(',') + '.#');
    rows.push(bot);
    return rows;
  }
  var hallFallback = {
    name: 'Bedroom Hall',
    tiles: hallTiles(),
    spawn: [14, 1],
    exits: [
      { id: 'to_luna_room', at: [14, 0], to: ROOMS.luna, toAt: [4, 8], facing: 'up' },
      { id: 'to_kessie_room', at: [19, 0], to: 'house_kessie_room' },
      { id: 'to_service_stair', at: [40, 1], h: 4, to: ROOMS.stair, toAt: [1, 2], facing: 'right' }
    ]
  };
  var H_LUNA = spawn(ROOMS.hall, 'from_luna_room', [14, 1]);
  var hall = room(ROOMS.hall, hallFallback, {
    ambient: 'hum', dark: 0.45, playerLight: 40, tint: '#141020', tintAlpha: 0.15,
    patch: {
      to_luna_room: { locked: always, lockedText: [{ think: 'Ginerva is watching me. There\'s no going back in.' }] },
      to_kessie_room: { locked: always, lockedText: [{ narrate: 'Door No. 5. Kessie\'s. A strip of yellow tape has been pressed across the handle.' }, { think: 'Her rubber gloves were still drying on the radiator inside on Tuesday morning.' }] }
    },
    npcs: [
      { id: 'ginerva', at: [H_LUNA[0] + 1, H_LUNA[1] + 1], facing: 'left', talk: [['ginerva', 'I do not repeat myself, Miss Bartley. The service stair. East. Now.', 'angry']] },
      { id: 'delphin', spec: 'delphin_pj', at: [H_LUNA[0] + 9, H_LUNA[1] + 1], facing: 'left', talk: async function (api) {
          if (api.has('ch10_hallDelphin')) { await api.say('delphin', 'Pyjama party in the basement. Can\'t think of a single way that ends well.'); return; }
          await api.say('delphin', 'So. Anyone have any guesses about why we\'re here? We could start a betting pool.');
          var c = await api.choice(['"Kessie isn\'t here."', '"Not funny, Del."', '(Say nothing.)']);
          if (c === 0) await api.say('delphin', 'I noticed. I\'ve been noticing for two days.', { mood: 'sad' });
          if (c === 1) await api.say('delphin', 'It\'s not meant to be funny. It\'s meant to keep my hands from shaking.', { mood: 'tired' });
          if (c === 2) await api.think('His eyeliner is smudged. He slept in it. If he slept.');
          api.set('ch10_hallDelphin', true);
        } },
      { id: 'isaiah', spec: 'isaiah_pj', at: [H_LUNA[0] + 6, H_LUNA[1] + 2], facing: 'up', talk: async function (api) {
          if (api.has('ch10_hallIsaiah')) { await api.say('isaiah', 'Sorry. Sorry. I\'m fine.', { mood: 'sad' }); return; }
          await api.narrate('Isaiah\'s eyes are so red he must have spent all night rubbing them.');
          await api.say('isaiah', 'Does it matter? We\'re all dead anyway.', { mood: 'sad' });
          await api.say('delphin', 'That\'s the spirit, chief.');
          await api.think('Since the interviews he won\'t meet my eyes. Annette sat with him on the bus back.');
          api.set('ch10_hallIsaiah', true);
        } },
      { id: 'annette', spec: 'annette_pj', at: [H_LUNA[0] - 5, H_LUNA[1] + 1], facing: 'right', talk: async function (api) {
          if (api.has('ch10_hallAnnette')) { await api.say('annette', 'Run along, dear. Mustn\'t keep the lady waiting.', { mood: 'smug' }); return; }
          await api.say('annette', 'Evenin\', Luna. Couldn\'t sleep neither? It\'s the old bones. Or the conscience.', { mood: 'happy' });
          var c = await api.choice(['"What did you tell them, Annette?"', '"Goodnight, Annette."']);
          if (c === 0) {
            await api.say('annette', 'Tell who, dear? I\'m an old woman. Nobody listens to a word I say.', { mood: 'smug' });
            await api.think('A part of me wants to confront her right here. Another part says a public fight is exactly what she wants.');
          } else await api.say('annette', 'Manners. Thass better.', { mood: 'smug' });
          api.set('ch10_hallAnnette', true);
        } },
      { id: 'ch10_tb_hall', spec: 'tb_deer', at: [36, 1], facing: 'left', talk: [{ narrate: 'The Deer mask doesn\'t turn. The gold eyes don\'t blink.' }] }
    ]
  });

  /* ---------------------------------------------------------------------
   * MAP: house_service_stair (audio sensors only), 7x8.
   * ------------------------------------------------------------------- */
  var stairFallback = {
    name: 'Service Stair',
    tiles: ['#######', '#_____#', 'D_____#', '#___###', '#_____#', '#___###', '#_____#', '#######'],
    spawn: [1, 2],
    exits: [
      { id: 'to_bedroom_hall', at: [0, 2], to: ROOMS.hall, toAt: [38, 2], facing: 'left' },
      { id: 'to_red_room', at: [4, 6], w: 2, to: ROOMS.red, toAt: [2, 1], facing: 'down' }
    ]
  };
  var stair = room(ROOMS.stair, stairFallback, {
    ambient: 'drone', dark: 0.72, playerLight: 34, tint: '#200808', tintAlpha: 0.12,
    patch: { to_bedroom_hall: { locked: always, lockedText: [{ think: 'Ginerva is right behind me on the landing. Down. Only down.' }] } },
    zones: [
      { id: 'ch10_stair1', at: [1, 3], w: 3, h: 1, once: true, run: [{ think: 'Audio sensors only on this stair. Walk. Don\'t run. Don\'t talk.' }, { sound: 'heartbeat' }] },
      { id: 'ch10_stair2', at: [1, 5], w: 3, h: 1, once: true, run: [{ think: 'It smells of petrol down here. Petrol, and something sweet underneath it.' }] },
      { id: 'ch10_stair3', at: [1, 6], w: 3, h: 1, once: true, run: [{ narrate: 'Ginerva\'s heels make no sound on the steps. Yours sound like gunshots.' }] }
    ]
  });

  /* ---------------------------------------------------------------------
   * MAP: house_red_room (basement), 12x12 with walls. Staging from shared marks.
   * ------------------------------------------------------------------- */
  var redFallback = {
    name: 'The Red Room',
    tiles: ['##D#########', '#__________#', '#__________#', '#__________#', '#__________#', '#__________#', '#__________#', '#__________#', '#__________#', '#__________#', '#__________#', '############'],
    legend: { '#': 'ch10:bloodwall', _: 'ch10:redfloor' },
    spawn: [2, 1],
    objects: [
      { id: 'cuffs_1', at: [4, 5], prop: 'ch10:cuffs', solid: false, layer: 1 },
      { id: 'cuffs_2', at: [5, 5], prop: 'ch10:cuffs', solid: false, layer: 1 },
      { id: 'cuffs_3', at: [6, 5], prop: 'ch10:cuffs', solid: false, layer: 1 },
      { id: 'drain', at: [5, 7], prop: 'ch10:drain', solid: false, layer: -1 },
      { id: 'cam_red', at: [9, 0], prop: 'camera', solid: false }
    ],
    exits: [{ id: 'to_service_stair', at: [2, 0], to: ROOMS.stair, toAt: [3, 6], facing: 'left' }]
  };
  var RM = ROOMS.red;
  var CUFF = mark(RM, 'cuffs_center', [5, 5]);
  var LINE = [mark(RM, 'line_1', [3, 9]), mark(RM, 'line_2', [4, 9]), mark(RM, 'line_4', [6, 9]), mark(RM, 'line_5', [7, 9])];
  var JUDGE_POST = mark(RM, 'judge', [8, 2]);
  var TRADER_POST = mark(RM, 'trader', [7, 2]);
  var GIN_POST = mark(RM, 'ginerva', [3, 2]);
  var DOOR_IN = mark(RM, 'door', [2, 1]);
  var JUDGE_AT = [CUFF[0], LINE[0][1] - 1];             // between the pyre and the line
  var TRADER_CORNER = [1, LINE[0][1] - 1];
  var K_AT = [CUFF[0] - 1, CUFF[1]], E_AT = [CUFF[0] + 1, CUFF[1]];
  var RING_GAP = [CUFF[0], CUFF[1] + 2];                // the ring's south gap (shared pyre leaves it open)
  var DRAIN_AT = [CUFF[0] + 4, CUFF[1] + 1];            // drain moved out of the gap
  var before = function (i) { return [LINE[i][0], LINE[i][1] - 1]; };
  // Pyre: the shared extras (wood ring + gas cans), or the same layout here.
  function pyre() {
    var x = sdata().upstairs && sdata().upstairs.extras && sdata().upstairs.extras.redRoomPyre;
    if (hasShared(RM) && x && x.length) return G.cloneDef(x);
    var out = [];
    [[3, 4], [3, 5], [3, 6], [4, 3], [5, 3], [6, 3], [7, 4], [7, 5], [7, 6], [4, 7], [6, 7]].forEach(function (p, i) { out.push({ id: 'wood_' + (i + 1), at: p, prop: 'ch10:logs', solid: true }); });
    [[2, 7], [8, 3], [8, 7]].forEach(function (p, i) { out.push({ id: 'gas_' + (i + 1), at: p, prop: 'ch10:jerrycan', solid: true }); });
    return out;
  }
  var REDLOOK = { set: { ch10_redLooked: '+1' } };
  function redExt(burning) {
    var py = pyre();
    py.forEach(function (o) {
      o.examine = /^gas/.test(o.id)
        ? [{ narrate: 'A red can. The cap is off. The smell is enough to make your eyes water.' }, { think: 'Petrol. In a basement with no windows.' }, REDLOOK]
        : [{ think: 'Firewood. Split oak, stacked in a ring around the cuffs. There\'s no fireplace in this room.' }, REDLOOK];
    });
    var fires = [];
    if (burning) py.forEach(function (o, i) { if (/^wood/.test(o.id)) fires.push({ id: 'ch10_fire' + i, at: o.at, prop: 'ch10:fire', solid: false, layer: 1 }); });
    var objs = py.concat(fires);
    // the ring is closed from the start, so nobody (the player included) can walk in among the cuffs
    objs.push({ id: 'ch10_logsgap', at: RING_GAP, prop: 'ch10:logs', solid: true, examine: burning ? null : [{ think: 'The ring of wood is closed. Inside it, three pairs of cuffs hang from chains, silver flecked with rust. Even the shackles match the room.' }, { think: 'No way in. No way out, either, for whoever ends up in the middle.' }, REDLOOK] });
    if (burning) objs.push({ id: 'ch10_firegap', at: RING_GAP, prop: 'ch10:fire', solid: false, layer: 1 });
    var npcs = [
      { id: 'isaiah', spec: 'isaiah_pj', at: LINE[0], facing: 'up', talk: async function (api) {
          await api.say('isaiah', 'Did you know the colour red raises your heart rate? There are studies. I wish I didn\'t know that.', { mood: 'fear' });
          api.add('ch10_examined', 1);
        } },
      { id: 'delphin', spec: 'delphin_pj', at: LINE[2], facing: 'up', talk: async function (api) {
          await api.say('delphin', 'I\'ve set a lot of fires, Red. I know what a stack like that is for.', { mood: 'tired' });
          await api.think('He says it lightly. His hands are fists.');
          api.add('ch10_examined', 1);
        } },
      { id: 'annette', spec: 'annette_pj', at: LINE[3], facing: 'up', talk: async function (api) {
          await api.say('annette', 'Lovely colours. Bit loud for my taste. Still, it\'ll hide the stains, won\'t it.', { mood: 'smug' });
          api.add('ch10_examined', 1);
        } },
      { id: 'ginerva', at: GIN_POST, facing: 'down', talk: [['ginerva', 'You will stand where you are put and you will not speak. That is all I am permitted to say.']] },
      { id: 'trader', at: burning ? TRADER_CORNER : DOOR_IN, visible: !!burning, facing: 'right' },
      { id: 'judge', spec: 'judge_white', at: burning ? JUDGE_AT : DOOR_IN, visible: !!burning, facing: 'up' },
      { id: 'kessie', spec: burning ? 'shadow_kessie' : 'kessie_beaten', at: K_AT, visible: !!burning },
      { id: 'elephant', spec: burning ? 'shadow_elephant' : 'tb_elephant', at: E_AT, visible: !!burning },
      { id: 'tb_dog', spec: 'tb_dog', at: [CUFF[0] - 3, CUFF[1]], visible: !!burning },
      { id: 'tb_turtle', spec: 'tb_turtle', at: [CUFF[0] + 3, CUFF[1]], visible: !!burning }
    ];
    if (burning) npcs.forEach(function (n) { n.talk = null; });
    return {
      ambient: burning ? 'drone' : 'tension',
      dark: burning ? 0.62 : 0.3, playerLight: burning ? 0 : 30,
      tint: burning ? '#ff3010' : '#ff0010', tintAlpha: burning ? 0.14 : 0.08,
      lights: burning ? [{ at: K_AT, r: 70, flicker: true }, { at: E_AT, r: 70, flicker: true }, { at: CUFF, r: 50, flicker: true }] : [],
      remove: burning ? ['drain', 'to_service_stair'] : [],
      patch: burning ? {} : {
        drain: { at: DRAIN_AT, examine: [{ think: 'A drain in the floor. Why would a room need a drain.' }, { think: 'I know why.' }, REDLOOK] },
        cuffs_1: { examine: [{ think: 'Three pairs of cuffs, silver, flecked with rust that gives them a reddish tint. Even the shackles match the room.' }, REDLOOK] },
        cuffs_2: { examine: [{ think: 'Three pairs. Someone counted us. Then someone counted again.' }, REDLOOK] },
        cuffs_3: { examine: [{ think: 'The rust is not all rust.' }, REDLOOK] },
        cam_red: { examine: [{ think: 'The dot is flashing. Someone is watching this live.' }, { sound: 'camera' }, REDLOOK] },
        to_service_stair: { locked: always, lockedText: [{ think: 'Ginerva is standing in front of the door, hands folded behind her back.' }] }
      },
      npcs: npcs, objects: objs
    };
  }
  var redRoom = room(RM, redFallback, redExt(false));
  // The burning is a second copy of the same room (fire-lit, no exit), registered as a local map.
  var redBurn = room(RM, redFallback, redExt(true));
  redBurn.exits = [];

  /* ---------------------------------------------------------------------
   * MAP: columbus_lounge as a memory (2060): eight-year-old Luna and the TV.
   * ------------------------------------------------------------------- */
  var memFallback = {
    name: 'Columbus House: Lounge',
    tiles: [
      '##############',
      '#####V########',
      '#............#',
      '#.......hhh..#',
      '#............#',
      '#.....RRRRR..#',
      '#.....RRRRR..#',
      '#.....RRRRR..#',
      '#............#',
      '##############'
    ],
    spawn: [7, 8],
    objects: [{ id: 'lounge_tv', at: [9, 1], solid: false }]
  };
  var memory = room(ROOMS.memory, memFallback, {
    name: 'Columbus House, 2060',
    ambient: 'static', tint: '#a0a0b0', tintAlpha: 0.25, vignette: 0.85, dark: 0.35,
    lights: [{ at: [9, 2], r: 70, flicker: true }],
    remove: ['to_columbus_dorm', 'to_columbus_closet', 'to_columbus_office', 'to_columbus_yard'],
    patch: { lounge_tv: { examine: null } },
    npcs: [
      { id: 'ch10_kid1', spec: G.Sprites.randomSpec(31, { outfit: '#8a8a8a', height: 'child' }), at: [7, 2], facing: 'up', talk: [{ say: 'Kid', text: 'Shh! They\'re gonna say who won!', portrait: false }] },
      { id: 'ch10_kid2', spec: G.Sprites.randomSpec(32, { outfit: '#8a8a8a', height: 'child' }), at: [11, 2], facing: 'up', talk: [{ say: 'Kid', text: 'True believer! True believer\'s mom is on TV!', portrait: false }] },
      { id: 'ch10_kid3', spec: G.Sprites.randomSpec(33, { outfit: '#8a8a8a', height: 'child' }), at: [12, 4], facing: 'up' }
    ]
  });
  var MEM_START = spawn(ROOMS.memory, 'from_columbus_yard', [7, 8]);

  /* ---------------------------------------------------------------------
   * Full-screen drawings (slides). These only run in real play (autoplay skips slides).
   * ------------------------------------------------------------------- */
  function R() { return G.Render; }
  function poly(g, pts, c) { g.fillStyle = c; g.beginPath(); g.moveTo(pts[0], pts[1]); for (var i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]); g.closePath(); g.fill(); }

  // The memory: a TV in a group-home lounge. Her mother on a stage; a tan arm raises her wrist.
  function drawMemory(t, s, a) {
    var r = R(), g = r.ctx, W = G.W, H = G.H;
    r.rect(0, 0, W, H, '#060608');
    var x = 62, y = 18, w = 260, h = 160;
    r.rect(x - 8, y - 8, w + 16, h + 16, '#2a2622'); r.rect(x, y, w, h, '#120a10');
    g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
    // stage lights + crowd
    g.globalAlpha = 0.14 * a; for (var i = 0; i < 4; i++) poly(g, [x + 40 + i * 60, y, x + 10 + i * 60, y + h, x + 70 + i * 60, y + h], '#ffe8c0'); g.globalAlpha = a;
    for (var c = 0; c < 26; c++) { var cx = x + c * 10 + 4, bob = Math.sin(t * 8 + c) * 2; r.rect(cx, y + h - 22 + bob, 8, 22, '#1a1016'); r.rect(cx + 1, y + h - 28 + bob, 6, 6, '#1a1016'); if (c % 3 === 0) r.rect(cx + 2, y + h - 40 + bob - Math.abs(Math.sin(t * 6 + c)) * 6, 2, 12, '#1a1016'); }
    // stage floor
    r.rect(x, y + 104, w, 4, '#3a2a22');
    // Franchesca: red hair, grey jumpsuit, spattered dark (someone else's blood), arm raised
    var fx = x + 120, fy = y + 50;
    r.rect(fx, fy + 14, 18, 40, '#8b8e96'); r.rect(fx + 2, fy + 2, 14, 14, '#f2cdb0');
    r.rect(fx - 3, fy - 2, 24, 8, '#c4462a'); r.rect(fx - 4, fy + 4, 6, 26, '#c4462a'); r.rect(fx + 16, fy + 4, 6, 26, '#c4462a');
    r.rect(fx + 4, fy + 22, 3, 3, '#5a0a10'); r.rect(fx + 10, fy + 30, 4, 2, '#5a0a10'); r.rect(fx + 6, fy + 40, 2, 4, '#5a0a10');
    r.rect(fx + 17, fy - 18, 5, 34, '#8b8e96'); r.rect(fx + 17, fy - 24, 6, 7, '#f2cdb0');           // her raised arm + hand
    // the arm from the shadows: tan, skinny, the penguin across the veins
    var reach = Math.min(1, s._t != null ? s._t : 1);
    r.rect(fx + 22, fy - 22, 110, 6, '#d8a274'); r.rect(fx + 20, fy - 24, 8, 9, '#d8a274');
    r.rect(fx + 120, fy - 24, 24, 10, '#f0eee8'); // white cuff of a sleeve
    var pulse = 0.6 + 0.4 * Math.sin(t * 5);
    r.rect(fx + 44, fy - 21, 7, 4, '#111'); r.rect(fx + 45, fy - 20, 3, 2, '#f2f2f2'); r.rect(fx + 51, fy - 20, 2, 1, '#e8a020');
    g.globalAlpha = 0.25 * pulse * a; r.rect(fx + 40, fy - 25, 16, 12, '#ffffff'); g.globalAlpha = a; void reach;
    g.restore();
    r.static(0.12 + (s.glitch ? 0.4 * Math.abs(Math.sin(t * 13)) : 0), x, y, w, h);
    r.scanlines(0.25);
    if (s.caption) r.text(s.caption, W / 2, H - 22, { size: 8, align: 'center', color: '#e8e4d8', style: 'italic', font: 'serif', alpha: a });
  }
  // The burning: silhouettes against red walls. No detail, only shape, light and smoke.
  function drawBurn(t, s, a) {
    var r = R(), g = r.ctx, W = G.W, H = G.H, lv = s.level || 1;
    var grad = g.createLinearGradient(0, 0, 0, H); grad.addColorStop(0, '#2a0204'); grad.addColorStop(1, '#7a0a0e');
    g.fillStyle = grad; g.fillRect(0, 0, W, H);
    g.globalAlpha = (0.25 + 0.1 * Math.sin(t * 11)) * lv * a; r.rect(0, 0, W, H, '#ff6a20'); g.globalAlpha = a;
    [[150, 'k'], [234, 'e']].forEach(function (p, i) {
      var bx = p[0], sway = Math.sin(t * 2 + i) * (lv > 1 ? 1.5 : 0.5);
      r.rect(bx + 10 + sway, 0, 1, 34, '#120406'); r.rect(bx + 22 + sway, 0, 1, 34, '#120406');
      poly(g, [bx + 8 + sway, 34, bx + 25 + sway, 34, bx + 28 + sway, 120, bx + 5 + sway, 120], '#050102');
      g.fillStyle = '#050102'; g.beginPath(); g.arc(bx + 16 + sway, 40 - (i ? 2 : 0), 9, 0, Math.PI * 2); g.fill();
      if (i === 1) poly(g, [bx + 10 + sway, 36, bx + 22 + sway, 36, bx + 16 + sway, 54], '#050102'); // the trunk of the mask
    });
    var top = H - 30 - lv * 34;
    for (var f = 0; f < 48; f++) {
      var fx = f * 8 + 2, fh = (H - top) * (0.5 + 0.5 * Math.abs(Math.sin(t * 7 + f * 1.3)));
      poly(g, [fx, H, fx + 8, H, fx + 4, H - fh], f % 2 ? '#e8501a' : '#f08a20');
      poly(g, [fx + 2, H, fx + 6, H, fx + 4, H - fh * 0.55], '#ffd860');
    }
    g.globalAlpha = 0.35 * lv * a; for (var sm = 0; sm < 6; sm++) { g.fillStyle = '#1a1214'; g.beginPath(); g.arc((sm * 70 + t * 12) % (W + 60) - 30, 30 + Math.sin(t + sm) * 10, 40, 0, Math.PI * 2); g.fill(); } g.globalAlpha = a;
    r.vignette(0.8);
    if (s.caption) { r.rect(0, H - 34, W, 22, '#000', 0.55 * a); r.text(s.caption, W / 2, H - 29, { size: 8, align: 'center', color: '#f2e8dc', style: 'italic', font: 'serif', alpha: a }); }
  }
  // Waverly's crayon drawing: Luna and Waverly on the steps of a beach house, with cats.
  function drawCrayon(t, s, a) {
    var r = R(), g = r.ctx, W = G.W, H = G.H;
    r.rect(0, 0, W, H, '#0c0b10');
    var x = 70, y = 14, w = 244, h = 176;
    g.save(); g.translate(W / 2, H / 2); g.rotate(0.02); g.translate(-W / 2, -H / 2);
    r.rect(x + 4, y + 5, w, h, '#000', 0.5); r.rect(x, y, w, h, '#f4eedc');
    r.rect(x, y + 120, w, 56, '#e8d48a');                                   // sand
    for (var i = 0; i < w; i += 6) r.rect(x + i, y + 108 + Math.round(Math.sin(i * 0.2) * 2), 6, 12, '#4a8ac8'); // sea
    r.rect(x + 150, y + 54, 70, 58, '#d86a4a'); poly(g, [x + 144, y + 56, x + 226, y + 56, x + 185, y + 24], '#8a3a2a'); // house + roof
    r.rect(x + 176, y + 80, 16, 32, '#6a3a1a'); r.rect(x + 156, y + 64, 14, 12, '#a8d8f0'); r.rect(x + 198, y + 64, 14, 12, '#a8d8f0');
    for (var st = 0; st < 3; st++) r.rect(x + 168 - st * 4, y + 112 + st * 6, 32 + st * 8, 6, '#9a6a3a'); // steps
    // Luna: red scribble hair, tall; Waverly: brown curls, yellow sweater
    r.rect(x + 160, y + 92, 10, 24, '#8b8e96'); g.fillStyle = '#f2cdb0'; g.beginPath(); g.arc(x + 165, y + 86, 6, 0, 7); g.fill();
    g.strokeStyle = '#c4462a'; g.lineWidth = 2; g.beginPath(); for (var k = 0; k < 8; k++) { g.moveTo(x + 158 + k * 2, y + 80); g.lineTo(x + 157 + k * 2 + Math.sin(k) * 3, y + 74); } g.stroke();
    r.rect(x + 196, y + 100, 9, 16, '#e8c43a'); g.fillStyle = '#b98a62'; g.beginPath(); g.arc(x + 200, y + 95, 5, 0, 7); g.fill();
    g.strokeStyle = '#4a2c1a'; g.beginPath(); for (var q = 0; q < 10; q++) { var an = q / 10 * Math.PI * 2; g.moveTo(x + 200 + Math.cos(an) * 5, y + 93 + Math.sin(an) * 5); g.lineTo(x + 200 + Math.cos(an) * 9, y + 93 + Math.sin(an) * 9); } g.stroke();
    r.rect(x + 170, y + 100, 26, 2, '#c4462a');                              // holding hands
    // cats
    [[x + 40, y + 132, '#3a3a3a'], [x + 84, y + 146, '#e8902a'], [x + 120, y + 128, '#f2f2f2']].forEach(function (c) {
      r.rect(c[0], c[1], 16, 9, c[2]); r.rect(c[0] + 12, c[1] - 6, 8, 8, c[2]);
      poly(g, [c[0] + 12, c[1] - 6, c[0] + 14, c[1] - 11, c[0] + 16, c[1] - 6], c[2]); poly(g, [c[0] + 16, c[1] - 6, c[0] + 18, c[1] - 11, c[0] + 20, c[1] - 6], c[2]);
      r.rect(c[0] - 4, c[1] - 4, 2, 8, c[2]);
    });
    g.fillStyle = '#f0d030'; g.beginPath(); g.arc(x + 30, y + 28, 14, 0, 7); g.fill();       // sun
    r.text('ME + MOMMA', x + 14, y + 60, { size: 11, font: 'hand', style: '', color: '#3a6ac8', shadow: false, alpha: a });
    g.restore();
    if (s.caption) r.text(s.caption, W / 2, H - 16, { size: 8, align: 'center', color: '#c8c0b0', style: 'italic', font: 'serif', alpha: a });
  }
  // The back of the drawing: "No!" and the numbers, in pencil.
  function drawBack(t, s, a) {
    var r = R(), g = r.ctx, W = G.W, H = G.H;
    r.rect(0, 0, W, H, '#0c0b10');
    var x = 70, y = 14, w = 244, h = 176;
    g.save(); g.translate(W / 2, H / 2); g.rotate(-0.015); g.translate(-W / 2, -H / 2);
    r.rect(x + 4, y + 5, w, h, '#000', 0.5); r.rect(x, y, w, h, '#efe8d4');
    g.globalAlpha = 0.08 * a; r.rect(x + 150, y + 30, 70, 80, '#d86a4a'); r.rect(x + 20, y + 110, 200, 40, '#e8d48a'); g.globalAlpha = a; // crayon ghosting through
    r.text('No!', x + 18, y + 14, { size: 22, font: 'hand', style: '', color: '#2a2a3a', shadow: false, alpha: a });
    var words = N2.split(/\s*\/\s*/), ly = y + 50;
    words.forEach(function (wd, i) {
      r.text(wd, x + 18 + (i % 2) * 6, ly, { size: 12, font: 'hand', style: '', color: '#2a2a3a', shadow: false, alpha: a });
      ly += 22;
      if (i < words.length - 1) r.text('/', x + w - 30, ly - 16, { size: 10, font: 'hand', style: '', color: '#6a6a7a', shadow: false, alpha: a });
    });
    g.restore();
    if (s.caption) r.text(s.caption, W / 2, H - 16, { size: 8, align: 'center', color: '#c8c0b0', style: 'italic', font: 'serif', alpha: a });
  }

  /* ---------------------------------------------------------------------
   * Custom minigame: the lunge. SPACE lunges; holding ↓ holds yourself back.
   * ------------------------------------------------------------------- */
  var minigames = {
    lunge: {
      autoSolve: function () { return { success: true, lunged: true }; }, // canon: Luna lunges
      start: function (ctx) {
        return new Promise(function (resolve) {
          var rage = 55, hold = 0, done = null, doneT = 0, NEED = 3.6;
          ctx.loop(function (dt) {
            if (done) { if (ctx.t - doneT > 0.9) resolve({ success: true, lunged: done === 'lunge' }); return; }
            var I = ctx.input;
            if (I.pressed('ok')) { done = 'lunge'; doneT = ctx.t; ctx.sound('hit'); return; }
            if (I.down('down')) { hold += dt; rage -= 24 * dt; } else { rage += 20 * dt; }
            rage += 10 * dt; // the smile keeps working on you
            if (rage >= 100) { rage = 100; done = 'lunge'; doneT = ctx.t; ctx.sound('hit'); }
            else if (hold >= NEED) { done = 'hold'; doneT = ctx.t; ctx.sound('confirm'); }
            if (rage < 0) rage = 0;
          }, function (t) {
            var Rr = ctx.R, W = ctx.W, H = ctx.H;
            Rr.rect(0, 0, W, H, '#1a0204');
            Rr.rect(0, 0, W, H, '#ff2a10', 0.08 + 0.06 * Math.sin(t * 9));
            ctx.header('ANNETTE IS SMILING', 'A small smile. Just for you.');
            var por = ctx.portrait('annette_pj', 'smug');
            var sh = (rage / 100) * 2;
            Rr.img(por, W / 2 - 48 + Math.sin(t * 40) * sh, 34 + Math.cos(t * 37) * sh, 2);
            // rage bar
            Rr.rect(60, 148, W - 120, 8, '#2a0a0c'); Rr.rect(60, 148, (W - 120) * rage / 100, 8, rage > 75 ? '#ff3a2a' : '#c8402a');
            Rr.text('RAGE', 56, 148, { size: 7, align: 'right', color: '#e8c0b0' });
            Rr.rect(60, 162, W - 120, 6, '#0a1a14'); Rr.rect(60, 162, (W - 120) * Math.min(1, hold / NEED), 6, '#4ac88a');
            Rr.text('HOLD', 56, 161, { size: 7, align: 'right', color: '#b0e8c0' });
            if (done) Rr.text(done === 'lunge' ? 'YOU LUNGE' : 'YOU STAY WHERE YOU ARE', W / 2, 120, { size: 14, font: 'sans', align: 'center', color: done === 'lunge' ? '#ff6a5a' : '#8ae8aa' });
            ctx.footer('[SPACE] lunge at her     hold [↓] to hold yourself back');
          });
        });
      }
    }
  };

  /* ---------------------------------------------------------------------
   * Helpers
   * ------------------------------------------------------------------- */
  function meter(api, k, d, def, max) {
    var v = api.get(k, def) + d; v = Math.max(0, Math.min(max || 100, v)); api.set(k, v); return v;
  }

  /* ---------------------------------------------------------------------
   * CHAPTER
   * ------------------------------------------------------------------- */
  var maps = {};
  maps[ROOMS.luna] = lunaRoom; maps[ROOMS.hall] = hall; maps[ROOMS.stair] = stair; maps[ROOMS.red] = redRoom;
  maps.red_burning = redBurn; maps[ROOMS.memory] = memory;

  G.registerChapter({
    id: 'ch10',
    title: 'Honesty',
    kicker: 'THURSDAY 25 JANUARY',
    maps: maps,
    cast: cast,
    tiles: tiles,
    props: props,
    minigames: minigames,
    testDefaults: {
      m_audience: 40, m_isaiah: 20, m_annette: 40, m_waverly: 60, m_trader_insight: 1, m_kessie: 35,
      f_code_learned: true, f_code_reply_sent: true, f_note1_read: true, f_kessie_secret_told: true, f_alliance_delphin: true
    },

    start: async function (api) {
      G.Audio.custom['ch10:crackle'] = function (tn) { tn.noise(1.4, 0.22, 900); tn.noise(0.6, 0.12, 3000, { delay: 0.3 }); tn.tone('sawtooth', 70, 1.2, 0.05); };
      G.Audio.custom['ch10:match'] = function (tn) { tn.noise(0.25, 0.3, 4000); tn.tone('sine', 300, 0.3, 0.05, { slide: 120 }); };
      G.Audio.custom['ch10:slap'] = function (tn) { tn.noise(0.08, 0.6, 2500); };
      G.Audio.custom['ch10:knock'] = function (tn) { tn.noise(0.06, 0.5, 400); };

      api.setPlayer('luna_night');

      /* ===== 1. Luna's room, night: the summons ===== */
      await api.goRoom(ROOMS.luna, { at: [4, 3], facing: 'up', fade: true });
      await api.narrate('Thursday night. The lullaby played an hour ago. Nobody in this house is asleep.');
      await api.think('Two days since the interviews. Two days since Kessie\'s son said "Mom?" and fell down. Two days of her door staying shut.');
      if (api.get('f_kessie_secret_told', true)) await api.think('Annette may have done the reporting. But I was the one who told her. Tea or no tea.');
      await api.until(function (f) { return (f.ch10_examined || 0) >= 2; }, { objective: 'Look around your room', targets: ['window', 'waverly_photo'] });
      api.objective(null);
      api.sound('ch10:knock');
      api.set('ch10_summoned', true);
      await api.wait(300);
      await api.narrate('One knock. The lock clicks before the sound has finished.');
      await api.say('ginerva', 'Come.', { name: 'Ginerva (through the door)' });
      await api.think('In my pyjamas. At midnight. She didn\'t even wait for an answer.');
      api.objective('Go out into the hall');
      await api.waitForRoom(ROOMS.hall);

      /* ===== 2. Bedroom hall ===== */
      api.objective(null);
      api.face('ginerva', 'player');
      await api.say('ginerva', 'The four of you will follow me to the basement. Quietly. You may hold your questions. Indefinitely.');
      await api.think('Four. Isaiah, Delphin, Annette and me. Nobody says Kessie\'s name.');
      api.objective('Follow Ginerva to the service stair (east end)');
      await api.waitForRoom(ROOMS.stair);

      /* ===== 3. Service stair ===== */
      api.objective('Go down');
      await api.waitForRoom(ROOMS.red);
      api.objective(null);

      /* ===== 4. The red room: waiting ===== */
      await api.narrate('As soon as you enter, you have to shield your eyes.');
      await api.think('Blood-red walls send spiders crawling through my chest. The ceiling is chartreuse. I can\'t look at it. I\'m going to be sick.');
      await api.think('Three pairs of cuffs hang from the ceiling. Around them, a ring of firewood.');
      api.set('ch10_examined', 0);
      await api.until(function (f) { return (f.ch10_examined || 0) + (f.ch10_redLooked || 0) >= 2; }, {
        objective: 'Wait. (Look around; talk to the others)',
        targets: ['ch10_logsgap', 'isaiah']
      });
      api.objective(null);

      /* ===== 5. Trader storms in; the Judge; the slap ===== */
      api.lockPlayer();
      await api.move('player', LINE[1]); api.face('player', 'up');
      api.onAir(true); api.approval(true);
      api.lowerThird('SPECIAL BROADCAST', 'Honesty', 3500, 'LIVE');
      api.show('trader'); api.sound('door');
      await api.move('trader', [GIN_POST[0] + 1, GIN_POST[1]], { speed: 70 });
      api.face('trader', 'ginerva');
      await api.say('trader', 'I demand to know what you think you\'re doing. I am the host of this show and I will not be summoned like a common criminal.', { mood: 'angry' });
      await api.narrate('Ginerva raises an eyebrow. There isn\'t a person alive who could beat her at poker.');
      await api.say('judge_white', 'I\'ll answer that question.', { name: 'Judge Johnson' });
      api.show('judge');
      await api.move('judge', JUDGE_AT, { speed: 36 });
      api.face('judge', 'down');
      await api.narrate('Judge Johnson wears a blinding white suit that shines against the red. It\'s hard to tear your eyes away.');
      await api.say('trader', 'Judge. Come to congratulate me on the success of the last episode?', { mood: 'happy' });
      api.face('judge', 'trader');
      await api.say('judge', ['I have come…', 'To put an end to your childish nonsense.'], { name: 'Judge Johnson' });
      await api.say('trader', 'My… nonsense?', { mood: 'shock' });
      await api.say('trader', 'But, father, the show is grossing at-');
      await api.move('judge', [GIN_POST[0] + 2, GIN_POST[1]], { speed: 80 });
      api.face('judge', 'trader');
      api.sound('ch10:slap'); api.flash('#ffffff', 120); await api.shake(220, 3);
      await api.narrate('The slap echoes off the red walls. Delphin winces. Isaiah lets out a yelp and covers his mouth. Annette only smiles.');
      await api.say('judge', 'Do not call me father. You don\'t deserve to be my son.', { name: 'Judge Johnson', mood: 'angry' });
      await api.move('trader', TRADER_CORNER, { speed: 50 });
      await api.say('trader', 'I… I\'m sorry. I didn\'t mean to disrespect you.', { mood: 'fear' });
      await api.say('judge', 'Good. We\'ll follow up that lesson in due time, but there is much to do.', { name: 'Judge Johnson' });
      await api.say('trader', 'How can I help you… Sir?', { mood: 'sad' });
      await api.think('After weeks of lording it over us like a king with a magic staff, I should enjoy seeing him brought low. I just feel sorry for him.');
      await api.think('No one deserves to be hit by a parent. That isn\'t what having a child is about.');
      api.face('isaiah', 'player');
      await api.narrate('A sniff beside you. Isaiah has tears running down his face, and he doesn\'t seem to notice.');
      var hand = await api.choice([
        { text: '(Quietly offer him your hand.)', set: { ch10_heldHand: true } },
        { text: '(Keep your eyes on the Judge.)' }
      ]);
      if (hand === 0) {
        meter(api, 'm_isaiah', 5, 30);
        await api.narrate('He does a double take, then gives you a tentative smile, slips his palm into yours and squeezes tight.');
      } else {
        await api.think('Don\'t draw attention. Not here. Not tonight.');
      }

      /* ===== 6. The Judge's address, Isaiah, Delphin, Annette ===== */
      await api.move('judge', JUDGE_AT, { speed: 40 }); api.face('judge', 'down');
      await api.say('judge', ['Ladies and… gentlemen.', 'It has come to my attention that one amongst your number was a traitor, an infiltrator, a harlot. This woman dared to enter my show under false premises. This must not go unpunished.'], { name: 'Judge Johnson' });
      await api.say('trader', 'That was you? I thought maybe-', { mood: 'shock' });
      await api.say('judge', 'Of course it was me, you imbecile. Your mistakes reflect poorly on us both and I won\'t tolerate it any further.', { name: 'Judge Johnson', mood: 'angry' });
      await api.move('judge', before(0), { speed: 40 }); api.face('judge', 'down');
      await api.say('judge', 'Such a shame. Your intelligence could have taken you far if only you\'d had the strength to resist the siren\'s call of immorality. Tell me boy, where is your beloved now? Coming to rescue you with sword and steed, is he?', { name: 'Judge Johnson', mood: 'smug' });
      await api.say('isaiah', 'Did you know that 15 percent of the population are actually born sociopaths?', { mood: 'angry' });
      await api.narrate('The Judge inclines his head, waiting.');
      await api.say('isaiah', 'You know exactly where Joe is. Kessie was right. You are a monster.', { mood: 'angry' });
      await api.say('judge', 'Do not speak that witch\'s name in my presence. Lest you wish to repeat her punishment.', { name: 'Judge Johnson', mood: 'angry' });
      await api.say('isaiah', 'And what punishment will she be getting that could be worse than this?', { mood: 'cry' });
      await api.say('judge', 'Watch closely. I\'m sure you will find the next few minutes to be enlightening.', { name: 'Judge Johnson', mood: 'smug' });
      await api.move('judge', before(2), { speed: 40 }); api.face('judge', 'down');
      await api.say('judge', 'And the arsonist. Still playing the clown at the end of the world?', { name: 'Judge Johnson' });
      await api.say('delphin', 'Somebody has to. You\'re certainly not funny.', { mood: 'smug' });
      await api.narrate('For one long second the Judge simply looks at him, the way a man looks at a stain.');
      await api.move('judge', before(3), { speed: 40 }); api.face('judge', 'down');
      await api.say('judge', 'Mrs. Dunphy. Your service is noted.', { name: 'Judge Johnson', mood: 'neutral' });
      await api.emote('annette', '♥', 700);
      await api.narrate('Annette smiles, takes the hem of her nightdress between two fingers, and curtsies.');
      await api.think('Her service. Noted. For what?');
      if (api.get('f_kessie_secret_told', true)) await api.think('I know for what. I knew on the bus.');

      /* ===== 7. Luna: the list, the reveal, the memory ===== */
      await api.move('judge', before(1), { speed: 40 }); api.face('judge', 'down');
      await api.think('He stops in front of me. I square my shoulders, tuck in my chin and prepare for the worst.');
      await api.say('judge', 'Boy!', { name: 'Judge Johnson', mood: 'angry' });
      await api.say('trader', 'Yes… sir?', { mood: 'fear' });
      await api.say('judge', 'Why is this woman standing in front of me?', { name: 'Judge Johnson' });
      await api.say('trader', 'She\'s made it this far without being a target of the votes. She must have some level of social talent.');
      await api.say('judge', 'That\'s not what I\'m asking you. You were provided a list of potential candidates when you entered the host role for this show. She was not on that list. So I am going to ask you one more time. Why is she here?', { name: 'Judge Johnson', mood: 'angry' });
      await api.say('trader', 'I- I just thought that she would put on a good show. And I was right. Look at how far she\'s come.', { mood: 'fear' });
      await api.say('judge', 'This woman is a prime example of your mistakes to date. Have you even told her the truth about your connection yet?', { name: 'Judge Johnson' });
      await api.narrate('The Judge peers into your eyes, sees the confusion there, and snorts.');
      await api.say('judge', 'Of course not. Once again, I must step in with a guiding hand.', { name: 'Judge Johnson', mood: 'smug' });
      await api.say('trader', 'Judge, please don\'t.', { mood: 'sad' });
      await api.say('judge', 'Never presume to tell me what to do. I thought I beat that lesson into you thoroughly enough last time.', { name: 'Judge Johnson', mood: 'angry' });
      await api.say('judge', 'Have you never wondered why this so-called host has singled you out again and again for special treatment?', { name: 'Judge Johnson' });
      var ans = await api.choice([
        '"I have. But there was never a solid reason to point to."',
        '"He singles everyone out. It\'s his job."',
        '(Say nothing.)'
      ]);
      if (ans === 1) await api.say('judge', 'No. Not everyone.', { name: 'Judge Johnson', mood: 'smug' });
      await api.say('judge', ['Your capabilities are truly pitiable. I\'ll enlighten you.', 'This man, this unfamiliar host, this person who has been tormenting you for weeks, this is not the first time you\'ve seen him, although the last time will have been when you were a young child.'], { name: 'Judge Johnson' });
      api.sound('static'); api.flash('#ffffff', 300);
      await api.fadeOut(400, '#ffffff');

      // ---- playable memory flash (about ten seconds): eight years old, the group-home TV ----
      api.setPlayer('luna_child_columbus');
      api.onAir(false); api.approval(false);
      api.unlockPlayer();
      api.set('ch10_memLooked', false);
      api.onInteract('lounge_tv', function (a2) { a2.set('ch10_memLooked', true); });
      await api.goRoom(ROOMS.memory, { at: MEM_START, facing: 'up', fade: false });
      await api.fadeIn(500);
      await api.narrate('Columbus House. You are eight. The other kids are crowded round the television.');
      var memT0 = Date.now();
      // ten seconds: walk up to the screen, or the memory comes to you anyway
      await api.until(function (f) { return f.ch10_memLooked || Date.now() - memT0 > 10000; }, { objective: 'Get closer to the screen', target: 'lounge_tv' });
      api.objective(null);
      api.sound('applause');
      await api.slides([
        { style: 'black', draw: drawMemory, caption: 'Mom. On the stage. Someone else\'s blood all over her. She won.', ms: 3200 },
        { style: 'black', draw: drawMemory, caption: 'An arm reaches out of the shadows and holds her wrist up in victory. A tan, skinny arm.' },
        { style: 'black', draw: drawMemory, caption: 'It turns over. For one second, across the veins: a penguin.' },
        { style: 'black', draw: drawMemory, glitch: true, caption: 'The crowd roars. Then static.', ms: 1800 }
      ]);
      api.set('f_mem_penguin_arm', true);
      meter(api, 'm_trader_insight', 2, 0, 6);
      api.sound('static');
      await api.fadeOut(300, '#000');
      api.setPlayer('luna_night');
      api.lockPlayer();
      await api.goRoom(RM, { at: LINE[1], facing: 'up', fade: false });
      api.placeNpc('judge', before(1), 'down'); api.show('judge'); api.show('trader');
      api.placeNpc('trader', TRADER_CORNER, 'right');
      api.onAir(true); api.approval(true);
      await api.fadeIn(400);
      await api.think('The penguin. On the inside of his right forearm. "It\'s the company logo, Miss Luna."');
      await api.think('I shake my head. I don\'t believe it. I won\'t believe it. I can\'t.');
      await api.say('judge', 'Yes. You understand now, don\'t you? Who it was that truly killed your mother.', { name: 'Judge Johnson', mood: 'smug' });
      await api.think('He hosted her show. Trader. He was there. He held her hand up while they cheered.');
      await api.emote('trader', '…', 900);
      await api.narrate('Trader examines his fingernails as if they are the most interesting thing he has seen in days.');

      /* ===== 8. Delphin and Isaiah draw his fire ===== */
      await api.say('delphin', 'Leave her alone.', { mood: 'angry' });
      await api.narrate('He has his arms crossed behind his head, trying for casual. The alertness in his eyes undercuts it.');
      await api.say('delphin', 'It\'s easy to bully someone you have power over. No challenge at all. You must get bored, all the way at the top.');
      api.face('judge', 'delphin');
      await api.say('judge', 'Such insolence.', { name: 'Judge Johnson', mood: 'angry' });
      await api.say('delphin', 'That\'s my specialty.', { mood: 'smug' });
      await api.say('isaiah', 'Yeah. Luna hasn\'t done anything to hurt you. Either of you. Why do you keep torturing her like this?', { mood: 'shock' });
      await api.think('I appreciate it, Isaiah. But please don\'t remind him of me.');
      await api.say('judge', 'That\'s it. It\'s time for you all to be taught a vital lesson about your place in this world.', { name: 'Judge Johnson', mood: 'angry' });

      /* ===== 9. Ginerva ===== */
      await api.move('judge', JUDGE_AT, { speed: 40 }); api.face('judge', 'down');
      await api.move('ginerva', [DOOR_IN[0], DOOR_IN[1] + 1], { speed: 30 });
      await api.say('judge', 'Miss Malcont, your help is appreciated as always. I will be sure to give your superiors a positive review. If you would be so kind as to bring in our guests.', { name: 'Judge Johnson' });
      api.face('trader', 'ginerva');
      await api.say('trader', 'You? How could you? After everything we\'ve been through.', { mood: 'shock' });
      await api.narrate('Ginerva looks pained. She says nothing at all.');
      await api.think('Ginny. Trey. His oldest friend. His father\'s eyes.');

      /* ===== 10. Kessie and Elephant are brought in ===== */
      await api.fadeOut(500);
      api.placeNpc('kessie', K_AT, 'down'); api.show('kessie');
      api.placeNpc('elephant', E_AT, 'down'); api.show('elephant');
      api.show('tb_dog'); api.show('tb_turtle');
      api.placeNpc('ginerva', GIN_POST, 'down');
      await api.fadeIn(500);
      await api.narrate('Dog and Turtle drag them in. Elephant, still in her robe and mask, holds her head high in her chains. Kessie is in nothing but a slip.');
      await api.think('Both eyes blackened. Her lip split. Her arms… I don\'t look away. I don\'t let myself look away.');
      if (api.get('m_kessie', 25) >= 45) await api.narrate('As they pull her past, Kessie reaches out a hand toward you. Her fingers brush your sleeve.');
      else await api.narrate('As they pull her past, Kessie reaches out a hand toward you. It falls short.');
      await api.think('This is the hand of the woman I consigned to death. There is no sugarcoating it.');
      await api.narrate('They lock her wrists into the cuffs and haul the chains until her feet dangle above the floor. Then Elephant. Then they stack the last logs tight against the ring.');
      await api.say('judge', 'This is what happens to those who oppose me. Do keep that in mind next time you are feeling belligerent.', { name: 'Judge Johnson' });
      await api.move('judge', before(1), { speed: 40 }); api.face('judge', 'up');
      await api.say('judge', 'And you, Believer. Let them see what kind of face hides under the gold.', { name: 'Judge Johnson', mood: 'smug' });
      api.setSpec('elephant', 'elephant_unmasked');
      await api.narrate('He lifts the elephant mask. Underneath: a middle-aged woman with a grey braid. The woman from the fence.');
      await api.say('judge', 'No. Wear it. Die as what you are.', { name: 'Judge Johnson' });
      api.setSpec('elephant', 'tb_elephant');
      await api.narrate('Dog and Turtle tip the cans. Petrol soaks the logs, carefully, all the way round, never touching the two women. The fumes make your eyes stream.');
      await api.think('They\'re aiming for the most pain possible. They\'ve done this before.');

      /* ===== 11. Kessie's last words ===== */
      await api.narrate('The Judge grips Kessie\'s chin and pulls the gag from her teeth.');
      await api.say('judge', 'Every prisoner executed on this show has been given the right to speak their last words. Consider yourself lucky that I am extending you the same consideration.', { name: 'Judge Johnson' });
      api.lowerThird('KESSIE BURGINGTON', 'Last words', 6000, 'LIVE');
      await api.say('kessie', ['Twenty-four years ago I made a terrible mistake that led to a little girl losing her mother. I\'ve regretted it every day since.', 'In a way, I\'m grateful for this. It\'s a relief to finally get what I deserve.'], { mood: 'cry' });
      await api.narrate('Her eyes find yours. The camera on the wall finds your face.');
      await api.say('kessie', 'Luna. Don\'t let them do to Waverly what they did to Deandre.', { mood: 'sad' });
      await api.say('kessie', 'Honey, don\'t feel bad. This is the way it\'s meant to be.', { mood: 'sad' });
      var lw = await api.choice([
        { text: '"I\'m sorry."', set: { ch10_saidSorry: true } },
        { text: '(Hold her gaze. Say nothing. Let her see it.)' }
      ]);
      if (lw === 0) await api.say('luna', 'I\'m sorry.', { mood: 'cry' });
      else await api.think('I try to put everything into one look. Sorry. Sorry. Sorry.');
      await api.say('kessie', 'I forgive you.', { mood: 'sad' });
      if (lw === 0) { await api.say('luna', 'I\'m sorry.', { mood: 'cry' }); await api.say('kessie', 'I forgive you.', { mood: 'sad' }); }
      api.lowerThird(null);
      await api.narrate('The Judge shoves the gag back between her teeth.');
      await api.say('judge', 'That\'s enough out of you. And the criminals in the audience will kindly refrain from speaking unless they wish to be punished. As you can see, I am not nearly as lenient as the previous host.', { name: 'Judge Johnson' });
      await api.narrate('Trader flushes.');

      /* ===== 12. The match, the sermon, the burning ===== */
      await api.move('judge', JUDGE_AT, { speed: 40 }); api.face('judge', 'up');
      await api.narrate('He takes a box of matches from his pocket.');
      api.sound('ch10:match');
      await api.wait(500);
      api.flash('#ff9a40', 500);
      api.sound('ch10:crackle');
      await api.fadeOut(300, '#200000');
      await api.goRoom('red_burning', { at: LINE[1], facing: 'up', fade: false });
      api.onAir(true); api.approval(true);
      await api.fadeIn(600);
      api.sound('ch10:crackle');
      api.face('judge', 'down');
      await api.say('judge', 'Honesty. A virtue that has been far too neglected in the modern age. Honesty is one of the most important aspects of a functioning society.', { name: 'Judge Johnson' });
      await api.say('judge', 'If the criminal cannot be honest with its betters, then how can it expect to return to society as a functional and contributing member?', { name: 'Judge Johnson' });
      await api.slides([{ style: 'black', draw: drawBurn, level: 1, caption: 'Kessie\'s eyes go wide as the first flames lick up beneath her.' }]);
      api.sound('ch10:crackle');
      await api.say('judge', ['We give you so many opportunities. So many chances to improve yourself, and yet some of you continue to waste them, living a life full of lies and selfishness.', 'You may be asking yourself how it came to this. The answer is clear. You made poor choices. You have no one to blame but yourselves.'], { name: 'Judge Johnson' });
      await api.narrate('Kessie is screaming through the gag now. It is not a sound a person should be able to make.');
      await api.think('I want to hold her. I want to cry. I want to scream. I want to be anywhere but here, and I have to stay, because she\'s looking at me.');
      await api.narrate('Isaiah is bent double, retching. Delphin has turned his face to the wall. His lips are moving: counting, or praying.');
      api.sound('ch10:crackle'); await api.shake(400, 1);
      await api.say('judge', ['How does one get the criminal to conform? The answer is simple.', 'Cold, hard punishment is the only answer. When the criminal learns to fear the hand of justice more than it wishes for the joy of degeneracy, only then can it truly begin the rehabilitation process.'], { name: 'Judge Johnson' });
      await api.slides([
        { style: 'black', draw: drawBurn, level: 2, caption: 'Elephant, who held on longer than anyone could, finally cries out.' },
        { style: 'black', draw: drawBurn, level: 3, caption: 'The gold mask softens in the heat and runs into her face.' }
      ]);
      api.sound('ch10:crackle');

      /* ===== 13. The lunge ===== */
      await api.narrate('Through the smoke, across the line: Annette. Watching the fire, with a small, satisfied smile.');
      await api.think('She did this. She sat with me and poured the tea and then she walked it upstairs to Ginerva like a casserole.');
      var lg = await api.minigame('lunge', {});
      var lunged = lg && lg.lunged !== false;
      api.set('f_attacked_annette', lunged);
      if (lunged) {
        api.approvalAdd(6);
        await api.move('player', [LINE[3][0] - 1, LINE[3][1] + 1], { speed: 140 });
        api.face('player', 'right');
        await api.say('luna', 'You did this! YOU-', { mood: 'angry' });
        await api.say('judge', 'Restrain yourself.', { name: 'Judge Johnson' });
        api.sound('alarm'); api.flash('#c8e8ff', 300); await api.shake(700, 4);
        await api.narrate('The remote in the Judge\'s hand clicks. Fire runs up your left arm from the chip and fills your skull.');
      } else {
        api.approvalAdd(-3);
        meter(api, 'm_annette', 5, 40);
        await api.think('No. Not in front of the cameras. Not where he can use it. Stay where you are.');
        await api.emote('annette', '♥', 800);
        await api.say('annette', 'Good girl. You\'re learning.', { mood: 'smug' });
        await api.narrate('The smoke is thick now, and sweet. Your knees go before you notice them going.');
      }
      api.objective(null);
      await api.fadeOut(1400, '#000');
      await api.slides([{ style: 'black', text: 'The world blackens as surely as the wood. The last thing you see is Trader\'s face.\n\nHe looks horrified.' }]);
      api.onAir(false); api.approval(false); api.lowerThird(null);

      /* ===== 14. Waking, 03:00. The PA. ===== */
      api.unlockPlayer();
      api.set('ch10_woke', true);
      await api.titleCard('Friday 26 January', '03:00', 2200);
      await api.goRoom(ROOMS.luna, { at: L_BED, facing: 'down', fade: true });
      await api.narrate('Your own bed. Your own ceiling. The smell of smoke is in your hair, your sheets, your mouth.');
      if (lunged) await api.think('My left arm is still twitching. The chip. He just pressed a button.');
      api.sound('static');
      await api.say('judge', 'Good morning, contestants. As of this morning I will be overseeing this program personally. Mr. Johnson will assist where he is able.', { name: 'PA: Judge Johnson', portrait: false });
      await api.think('Assist. Where he is able. The way a dog assists.');
      await api.think('Kessie forgave me. I don\'t know what to do with that. I don\'t think I ever will.');
      api.set('ch10_examined', 0);
      await api.until(function (f) { return (f.ch10_examined || 0) >= 1; }, { objective: 'You can\'t sleep', targets: ['waverly_photo'] });
      api.objective(null);

      /* ===== 15. The drawing ===== */
      api.sound('ch10:knock');
      await api.wait(400);
      await api.narrate('A soft scrape at the door. Paper on carpet.');
      await api.say('trader', 'She drew you something.', { name: 'A whisper through the door', portrait: false });
      await api.narrate('Footsteps going away down the hall. Uneven. Then nothing.');
      api.addObject({ id: 'ch10_drawing', at: L_DOOR, prop: 'ch10:crayon', solid: false });
      await api.waitForInteract('ch10_drawing', { objective: 'Pick up what was slid under the door' });
      api.remove('ch10_drawing');
      await api.slides([{ style: 'black', draw: drawCrayon, caption: 'Crayon. You and Waverly on the steps of a beach house. Three cats.' }]);
      await api.think('The beach house. "When we\'re free, Momma, we\'ll live by the sea and have a hundred cats." She was seven. She\'s still drawing it.');
      if (api.get('f_code_reply_sent', true)) await api.think('I told her no. I told her to stay safe. And Trader carried this to my door.');
      else await api.think('I never answered her note. Why is she still writing to me at all?');
      await api.slides([{ style: 'black', draw: drawBack, caption: 'On the back, in her handwriting.' }]);
      await api.think('"No!" And then numbers.');
      if (api.get('f_code_learned', true)) await api.think('Our code. The fridge code. She wrote it in front of him and he carried it like a love letter.');

      /* ===== 16. Decode Note 2: the signature puzzle ===== */
      var hints = 0, solved = false, attempts = 0;
      var hintText = [
        null,
        'Seven seconds. Grandma\'s rule.',
        'A = 8, B = 9, C = 10 …',
        'The whole key, written in the booklet margin.'
      ];
      for (;;) {
        attempts++;
        var params = {
          mode: 'seven', ciphertext: N2,
          title: 'WAVERLY\'S NOTE', prompt: hints === 0 ? 'No!  …and then numbers.' : 'Numbers stand for letters',
          showKey: hints >= 2, revealKey: hints >= 3, canGiveUp: true
        };
        if (hints >= 1) params.hint = hintText[Math.min(hints, 3)];
        if (hints >= 2) params.given = ['A'];
        var res = await api.minigame('cipher', params);
        if (res && res.success) { solved = true; break; }
        // Gave up (TAB). Offer help, one step at a time, or let her sleep on it.
        var opts = [];
        var nextHint = hints + 1;
        if (nextHint === 1) opts.push({ text: 'Think about the fridge. (A nudge)', value: 'hint' });
        if (nextHint === 2) opts.push({ text: 'Write the alphabet out on the booklet. (Show the key as I go, A given)', value: 'hint' });
        if (nextHint === 3) opts.push({ text: 'Write out the whole key. (Full key)', value: 'hint' });
        opts.push({ text: 'Look at it again.', value: 'again' });
        opts.push({ text: 'Put it away for tonight.', value: 'stop' });
        await api.think(attempts === 1 ? 'The numbers swim. My eyes still sting from the smoke.' : 'Still not there.');
        var pick = await api.choice(opts.map(function (o) { return o.text; }));
        var v = opts[pick].value;
        if (v === 'stop') break;
        if (v === 'hint') {
          hints = nextHint;
          if (hints === 1) {
            await api.think('Mom had a rule. "Seven seconds. That\'s all it takes to overcome your initial instinct and process your second thought."');
            await api.think('When Wavey was seven we made the fridge code, and she named it after Grandma\'s rule. Seven.');
          } else if (hints === 2) {
            api.objective('Use the booklet on the desk', { target: 'booklet' });
            await api.waitForInteract('booklet');
            api.objective(null);
            await api.narrate('The DPE pen. The penguin booklet. In the margin you write A, and under it, the first number Waverly ever learned for it.');
            await api.think('A is eight. Add seven. Every number between eight and thirty-three.');
          } else {
            await api.narrate('A=8 B=9 C=10 D=11 E=12 F=13 G=14 H=15 I=16 … the margin fills up, all the way to Z=33.');
          }
        }
      }
      api.set('ch10_noteHints', hints);
      api.set('f_note2_decoded', solved);

      if (solved) {
        meter(api, 'm_waverly', 5, 60);
        await api.slides([{ style: 'note', title: 'No!', text: N2_PLAIN }]);
        await api.think('Grandma is Trader\'s weak point.');
        await api.say('luna', 'Grandma. My mother. What did you find out, Wavey?', { mood: 'shock' });
        await api.think('The arm on the stage. The penguin across the veins. "She looks so much like her."');
        await api.think('She\'s eleven, and she is playing him. On the phone, every night, while I sit in this house being watched.');
        await api.think('"No!" Not "yes, Momma." Not "okay." She heard my numbers and she said no.');
        var keep = await api.choice([
          { text: '(Fold it small. Hide it in the seam of the pillowcase.)', set: { ch10_noteHidden: 'pillow' } },
          { text: '(Tear off the numbers and swallow them.)', set: { ch10_noteHidden: 'swallowed' } }
        ]);
        if (keep === 0) await api.think('The drawing goes on the wall, cats and all. The back of it goes where Eye can\'t see.');
        else await api.think('Paper and pencil lead. I\'ve eaten worse in this house. The cats stay on the wall.');
      } else {
        meter(api, 'm_waverly', -10, 60);
        await api.think('Tomorrow. My eyes won\'t hold the numbers tonight.');
        await api.think('I fold the drawing into the seam of my pillowcase, numbers inside. I\'ll come back to it. I have to.');
      }

      await api.slides([
        { style: 'montage', title: 'Friday, before dawn', text: 'Downstairs, someone is scrubbing the basement floor. The sound goes on until the sun comes up.' }
      ]);
      api.completeChapter();
    }
  });
})();
