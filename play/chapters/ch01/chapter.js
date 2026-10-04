/* =========================================================================
 * ch01 "One Day, But Not Today"  (prologue)
 *
 * 3 a.m., Fri 12 Oct 2083. Luna wakes Waverly by accident, learns (again) the
 * Seven Code from Waverly's fridge note, leaves a coded reply, walks the night
 * city to an underground clinic, and comes home bleeding.
 *
 * Rooms: luna_apartment (shared map, night), apt_past (flashback: Waverly at 7 invents the code),
 *        street (night), alley (night), tunnels, clinic,
 *        alley_dawn, street_home (morning), apt_home (afternoon).
 * Minigames: cipher (built-in, Seven Code decode), ch01:compose (encode the
 *        reply), stealth (built-in, the enforcer patrol), ch01:bottles (shift the
 *        bottles without clinking), ch01:knock (the knock pattern), qte (ladder,
 *        stairs).
 *
 * Cross-chapter flags (CHAPTERS.md §2):
 *   WRITES  f_code_learned  (always true on exit; the tutorial can be hinted, never skipped)
 *           m_waverly       (default 60 from engine flagDefaults; -5 for "We'll see" about the cats)
 *   READS   none
 * Chapter-local flags: ch01_* (see code).
 * Source: EFP L22-152, D3b L22-162, 3P L39 (knock), R1P L4 (owl clock), L95 (T.J., Arny).
 * ========================================================================= */
(function () {
  'use strict';

  /* ---------------------------------------------------------------------
   * small helpers
   * ------------------------------------------------------------------- */
  function px(g, x, y, w, h, c) { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), w, h); }
  function fill(ch, n) { var s = ''; for (var i = 0; i < n; i++) s += ch; return s; }
  /** put chars into a row string at positions: paint('BBBB', {1:'W', 2:'D'}) */
  function paint(row, at) { var a = row.split(''); Object.keys(at).forEach(function (k) { a[+k] = at[k]; }); return a.join(''); }

  /* ---------------------------------------------------------------------
   * CUSTOM TILES
   * ------------------------------------------------------------------- */
  var tiles = {
    rock: { color: '#3e3128', color2: '#241b15', wall: true, solid: true, pattern: 'bricks',
      draw: function (g, x, y, info) {
        px(g, x, y, 16, 16, info.face ? '#4a3a2e' : '#2a2019');
        var r = info.r;
        px(g, x + 2 + r * 6, y + 3, 4, 3, '#56443a'); px(g, x + 9, y + 8 + r * 4, 5, 3, '#33271f');
        px(g, x + 1, y + 11, 3, 2, '#5c4a3c');
        if (info.face) { px(g, x, y + 13, 16, 3, '#1c1510'); px(g, x + 4, y + 12, 2, 1, '#6a5646'); }
      } },
    cavefloor: { draw: function (g, x, y, info) {
        px(g, x, y, 16, 16, '#3a2f26');
        px(g, x + 3 + info.r * 8, y + 4, 2, 1, '#4c3e32'); px(g, x + 10, y + 11 - info.r * 3, 2, 1, '#2c231c'); px(g, x + 6, y + 13, 1, 1, '#54453a');
      } },
    graffiti: { wall: true, solid: true,
      draw: function (g, x, y, info) {
        px(g, x, y, 16, 16, '#5a3a32');
        for (var j = 0; j < 4; j++) px(g, x, y + j * 4 + 3, 16, 1, '#3e2822');
        var cols = ['#e8323c', '#3fc1c9', '#b6f24a', '#e8c15a', '#c86ae8'];
        var c1 = cols[Math.floor(info.r * 5)], c2 = cols[(Math.floor(info.r * 5) + 2) % 5];
        px(g, x + 2, y + 4, 10, 2, c1); px(g, x + 3, y + 6, 2, 5, c1); px(g, x + 8, y + 7, 5, 2, c2); px(g, x + 10, y + 5, 2, 6, c2);
        if (info.face) px(g, x, y + 14, 16, 2, '#2a1a16');
      } },
    tent: { solid: true, draw: function (g, x, y, info) {
        px(g, x, y, 16, 16, '#5a5a60');
        var c = info.r < 0.5 ? '#3a5a6a' : '#6a5a3a';
        for (var i = 0; i < 7; i++) px(g, x + 8 - i - 1, y + 4 + i, 2 * i + 2, 1, c);
        px(g, x + 1, y + 11, 14, 3, c); px(g, x + 7, y + 7, 2, 7, '#1a1a1a');
      } },
    curtain: { solid: true, draw: function (g, x, y) {
        px(g, x, y, 16, 16, '#6a2f3a');
        for (var i = 0; i < 16; i += 3) px(g, x + i, y, 1, 16, '#4e2029');
        px(g, x, y, 16, 1, '#2a2a2a');
      } },
    wfloor: { color: '#dfe6e8', color2: '#c8d2d6', pattern: 'tiles' },
    weeds: { draw: function (g, x, y, info) {
        px(g, x, y, 16, 16, '#3a3a36');
        px(g, x + 2, y + 6, 1, 6, '#4a6a2a'); px(g, x + 3, y + 4, 1, 8, '#3a5a22'); px(g, x + 9 + info.r * 3, y + 7, 1, 6, '#4a6a2a'); px(g, x + 12, y + 3, 1, 9, '#5a7a32');
      } }
  };

  /* ---------------------------------------------------------------------
   * CUSTOM PROPS  fn(g, x, y, t, obj)
   * ------------------------------------------------------------------- */
  var props = {
    owlclock: function (g, x, y, t) {
      px(g, x + 3, y + 2, 10, 11, '#7a5a3a'); px(g, x + 4, y + 3, 8, 9, '#e8dcc0');
      px(g, x + 5, y + 4, 2, 2, '#222'); px(g, x + 9, y + 4, 2, 2, '#222'); px(g, x + 7, y + 6, 2, 1, '#d89a2a');
      px(g, x + 8, y + 8, 1, 3, '#222'); px(g, x + 8, y + 10, 2, 1, '#222');
      px(g, x + 3, y + 1, 2, 2, '#7a5a3a'); px(g, x + 11, y + 1, 2, 2, '#7a5a3a');
      if (Math.floor(t) % 2) px(g, x + 7, y + 13, 2, 2, '#7a5a3a');
    },
    pbjar: function (g, x, y) { px(g, x + 5, y + 6, 6, 7, '#c88a3a'); px(g, x + 5, y + 5, 6, 2, '#d03030'); px(g, x + 6, y + 9, 4, 2, '#f0e0b0'); },
    bear: function (g, x, y) {
      px(g, x + 4, y + 5, 8, 8, '#8a6a4a'); px(g, x + 3, y + 3, 3, 3, '#8a6a4a'); px(g, x + 10, y + 3, 3, 3, '#8a6a4a');
      px(g, x + 5, y + 6, 1, 1, '#d8c040'); px(g, x + 9, y + 6, 1, 1, '#111'); px(g, x + 7, y + 8, 2, 1, '#3a2a1a'); px(g, x + 11, y + 10, 1, 2, '#ddd');
    },
    books: function (g, x, y) {
      var c = ['#7a2a2a', '#2a4a7a', '#4a6a2a', '#7a6a2a', '#5a2a6a', '#2a6a6a', '#8a4a2a', '#4a4a4a', '#6a2a4a'];
      for (var i = 0; i < 9; i++) px(g, x + 2 + (i % 3) * 4, y + 12 - Math.floor(i / 3) * 3, 4, 3, c[i]);
    },
    fridgenote: function (g, x, y, t, o) { // the note stuck on the fridge door (a bright scrap)
      var b = Math.sin(t * 2) * 0.5;
      px(g, x + 5, y + 4 + b, 6, 6, '#f2efe0'); px(g, x + 6, y + 6 + b, 4, 1, '#c03030'); px(g, x + 6, y + 8 + b, 3, 1, '#c03030');
      px(g, x + 7, y + 3 + b, 2, 1, '#e8323c');
    },
    kitchentable: function (g, x, y) { px(g, x + 1, y + 3, 14, 7, '#6a4a2e'); px(g, x + 1, y + 3, 14, 1, '#8a6a42'); px(g, x + 2, y + 10, 2, 5, '#4a3220'); px(g, x + 12, y + 10, 2, 5, '#4a3220'); },
    crayons: function (g, x, y) { px(g, x + 3, y + 5, 10, 7, '#f0ead8'); px(g, x + 5, y + 7, 3, 1, '#e8323c'); px(g, x + 9, y + 8, 2, 2, '#3fc1c9'); px(g, x + 4, y + 13, 5, 1, '#e8c15a'); },
    streetlamp: function (g, x, y, t, o) {
      var lit = o && o.def && o.def.lit;
      px(g, x + 7, y - 14, 2, 28, '#2a2a30'); px(g, x + 4, y - 16, 8, 3, '#3a3a40');
      px(g, x + 5, y - 13, 6, 2, lit ? (Math.random() < 0.03 ? '#665' : '#ffe9a0') : '#3a3a30');
      px(g, x + 5, y + 13, 6, 2, '#1a1a1e');
    },
    placard: function (g, x, y) { px(g, x + 7, y + 8, 2, 7, '#333'); px(g, x + 1, y + 1, 14, 8, '#e8e0c0'); px(g, x + 1, y + 1, 14, 2, '#c83a3a'); px(g, x + 2, y + 5, 11, 1, '#333'); px(g, x + 2, y + 7, 8, 1, '#333'); },
    bottlepile: function (g, x, y, t, o) {
      var n = o && o.def && o.def.count != null ? o.def.count : 7;
      px(g, x + 1, y + 4, 28, 10, '#3a3a3a'); px(g, x + 2, y + 5, 26, 8, '#555a5a'); // hatch under
      var cols = ['#2a6a3a', '#7a5a2a', '#3a5a6a', '#2a6a3a', '#6a3a2a', '#3a6a5a', '#7a6a2a'];
      for (var i = 0; i < n; i++) { var bx = x + 2 + i * 4, by = y + 3 + (i % 2) * 4; px(g, bx, by, 3, 7, cols[i]); px(g, bx + 1, by - 2, 1, 2, cols[i]); px(g, bx, by + 1, 1, 2, 'rgba(255,255,255,0.35)'); }
      for (var w = 0; w < 4; w++) px(g, x + 1 + w * 8, y + 1, 1, 4, '#4a6a2a');
    },
    hatch: function (g, x, y, t, o) {
      var open = o && o.def && o.def.open;
      px(g, x + 1, y + 3, 28, 12, '#2a2c2c'); px(g, x + 2, y + 4, 26, 10, open ? '#050505' : '#5a6060');
      if (!open) { px(g, x + 2, y + 8, 26, 1, '#3a4040'); px(g, x + 13, y + 6, 4, 2, '#8a9090'); }
    },
    ladder: function (g, x, y) { px(g, x + 3, y - 16, 2, 31, '#d8d8d0'); px(g, x + 11, y - 16, 2, 31, '#d8d8d0'); for (var i = 0; i < 6; i++) px(g, x + 3, y - 14 + i * 5, 10, 1, '#c0c0b8'); },
    torch: function (g, x, y, t) { px(g, x + 7, y + 6, 2, 6, '#5a3a1a'); var f = Math.sin(t * 13) > 0; px(g, x + 6, y + 2, 4, 4, f ? '#ffb030' : '#ff7a20'); px(g, x + 7, y + 1, 2, 2, '#ffe080'); },
    falsewall: function (g, x, y) {
      px(g, x, y - 4, 16, 20, '#4a3a2e'); px(g, x + 2, y - 1, 5, 3, '#56443a'); px(g, x + 9, y + 6, 5, 3, '#33271f');
      px(g, x, y + 13, 16, 3, '#1c1510'); px(g, x + 7, y - 4, 1, 17, '#3a2c22');
    },
    stirrups: function (g, x, y) {
      px(g, x + 3, y + 2, 10, 4, '#cfd6da'); px(g, x + 2, y + 6, 12, 5, '#b8c2c8'); px(g, x + 7, y + 11, 2, 4, '#888');
      px(g, x + 1, y + 10, 2, 3, '#666'); px(g, x + 13, y + 10, 2, 3, '#666'); px(g, x + 3, y + 7, 10, 1, '#5a3a3a');
    },
    tooltray: function (g, x, y) { px(g, x + 2, y + 6, 12, 2, '#d8d8d8'); px(g, x + 7, y + 8, 2, 7, '#888'); px(g, x + 3, y + 5, 3, 1, '#aaa'); px(g, x + 8, y + 5, 1, 1, '#aaa'); px(g, x + 10, y + 4, 3, 2, '#bbb'); },
    clipboard: function (g, x, y) { px(g, x + 4, y + 3, 8, 10, '#8a6a3a'); px(g, x + 5, y + 4, 6, 8, '#f0f0e8'); px(g, x + 6, y + 6, 4, 1, '#111'); px(g, x + 6, y + 8, 4, 1, '#111'); px(g, x + 6, y + 10, 3, 1, '#111'); px(g, x + 6, y + 2, 4, 2, '#999'); },
    drone: function (g, x, y, t) { var b = Math.sin(t * 4) * 2; px(g, x + 4, y + 2 + b, 8, 3, '#2a2a30'); px(g, x + 2, y + 1 + b, 3, 1, '#666'); px(g, x + 11, y + 1 + b, 3, 1, '#666'); if (Math.floor(t * 3) % 2) px(g, x + 7, y + 5 + b, 2, 1, '#ff3040'); }
  };

  /* ---------------------------------------------------------------------
   * CAST (chapter-local; merged over the global cast)
   * ------------------------------------------------------------------- */
  // Recurring characters come from play/shared/cast.js (luna_home, luna_gown, waverly,
  // cat_guide, fienle, enforcer, humbert, judge). Only ch01-only bit parts live here.
  var cast = {
    waverly7: { extends: 'waverly', name: 'Waverly (7)', outfit: '#e86a8a', outfit2: '#6a7aaa' },
    anchor: { name: 'News Anchor', skin: '#f2cdb8', hair: '#e8d070', hairStyle: 'bob', outfit: '#c83a6a', style: 'suit', accessory: 'earrings', voice: 520 },
    tj: { name: 'T.J.', skin: '#c68863', hair: '#1a1412', hairStyle: 'buzz', outfit: '#6a3a3a', outfit2: '#2e3440', style: 'hoodie', height: 'normal', build: 'slim', voice: 360 },
    arny: { name: 'Arny', skin: '#c68863', hair: '#1a1412', hairStyle: 'curly', outfit: '#3a5a4a', outfit2: '#2e3440', style: 'coat', height: 'short', build: 'slim', voice: 420 }
  };

  /* ---------------------------------------------------------------------
   * MAPS
   * ------------------------------------------------------------------- */
  // The studio apartment: the SHARED map 'luna_apartment' (play/shared/loc_gym_offsite.js),
  // patched per variant. variant: 'night' | 'past' (flashback) | 'home' (afternoon, collapse)
  function makeApt(variant) {
    var night = variant === 'night', past = variant === 'past';
    var ext = {
      name: past ? 'Four Years Ago' : 'Apartment 3C',
      remove: ['peanut_butter'],
      npcs: [], zones: [],
      objects: [
        { id: 'table', at: [4, 4], prop: 'kitchentable', solid: true,
          examine: night ? 'The table. One leg is a stack of EduTV pamphlets.' : 'The table.' },
        { id: 'window', at: [7, 0], examine: night
          ? [{ narrate: 'Down on the street, an EEN screen flickers on the corner. Someone is screaming on it. Someone always is.' }, { think: 'Neighborhood Scared Straight. Nobody in this neighbourhood is scared straight. Just scared.' }]
          : past ? 'Afternoon sun. The street is loud with kids. Back then I still thought things would get better.' : 'Bright. Too bright.' }
      ],
      patch: {
        owl_clock: { examine: past ? 'The owl clock. HOPE YOU HAVE A HOOT OF A GOOD DAY. It was already chipped back then.'
          : [{ narrate: 'A chipped owl clock. HOPE YOU HAVE A HOOT OF A GOOD DAY.' }, { think: night ? 'Three a.m. Only an hour until my appointment.' : 'Its eyes tick back and forth. I can\'t read the hands. Everything swims.' }],
          again: night ? [{ think: 'Tick. Tock. The owl doesn\'t care.' }] : null },
        couch: { examine: night ? [{ narrate: 'The lumpy couch. My bed. The springs have opinions.' }, { think: 'She gets the real bed. That was never a question.' }]
          : past ? 'The couch. Newer then. Still lumpy.' : 'The couch.' },
        stove: { examine: night ? 'Two burners. One works, if you jiggle the knob and believe in yourself.' : 'The stove.' },
        books: { examine: night ? [{ narrate: 'Nine books, stolen from Columbus the day they cast me out. Waverly has read every one of them until the spines went soft.' }, { think: 'Turning eighteen was supposed to be a magic trick that let you survive overnight. I brought my own magic.' }] : 'Nine books.' },
        bartholomew: { examine: night ? [{ narrate: 'Bartholomew. I got him for her third birthday. His left eye has gone yellow, and fuzz is leaking from the seam near his back again.' }, { think: 'I\'ll patch him tomorrow. Add it to the list.' }, { set: { ch01_sawBear: true } }] : 'Bartholomew.' }
      }
    };
    if (night) {
      ext.dark = 0.6; ext.playerLight = 36; ext.tint = '#203050'; ext.tintAlpha = 0.18;
      ext.patch.fridge = { prop: 'fridgenote', examine: [{ narrate: 'Nothing but cold air and a slice of rotten bologna.' }, { think: 'And a note from Waverly, stuck to the door. I\'ll read it in a minute.' }] };
      ext.patch.to_street = { locked: '!ch01_readyToGo', lockedText: [{ think: 'Not yet. I can\'t leave her without a note. And without something to eat.' }], toAt: [4, 2], toAtFixed: true, facing: 'down' };
      ext.objects.push(
        { id: 'cupboard', at: [4, 1], examine: [
          { if: 'ch01_foundPB', then: [{ narrate: 'Empty now.' }], else: [
            { narrate: 'I cross my fingers before opening the cupboard. The sour smell of rot. A forgotten brick of bologna, which goes straight in the trash.' },
            { narrate: 'Behind it: half a jar of peanut butter.' },
            { set: { ch01_foundPB: true } }] }] },
        { id: 'pbjar', at: [4, 4], prop: 'pbjar', solid: false, layer: 1, if: 'ch01_pbOnTable' }
      );
      ext.npcs.push({ id: 'waverly', at: [8, 3], facing: 'down', if: 'ch01_waverlyUp' });
    } else if (past) {
      ext.dark = 0; ext.tint = '#ffb060'; ext.tintAlpha = 0.16; ext.vignette = 0.7; ext.ambient = null;
      ext.patch.to_street = { locked: true, lockedText: [{ think: 'Not that door. Not in this memory.' }] };
      ext.npcs.push({ id: 'waverly7', at: [5, 4], spec: 'waverly7', facing: 'left' });
      ext.objects.push({ id: 'crayons', at: [4, 4], prop: 'crayons', solid: false, layer: 1, examine: 'Crayon drawings. A cat. Another cat. A house on a beach with two bedrooms, labelled in careful capitals.' });
    } else {
      ext.dark = 0.2; ext.tint = '#c0a080'; ext.tintAlpha = 0.12; ext.vignette = 0.6;
      ext.patch.to_street = { locked: true, lockedText: [{ think: 'No. Couch.' }] };
      ext.npcs.push({ id: 'home_waverly', spec: 'waverly', at: [8, 3], facing: 'down' });
    }
    return G.shared.map('luna_apartment', ext);
  }

  // The night street (40x12) and its morning copy. Westmost door = our building.
  function makeStreet(variant) {
    var night = variant === 'night';
    var pre = night ? '' : 'home_';
    var B = fill('B', 40), S = fill('-', 40), Rd = fill('=', 40);
    var m = {
      name: night ? 'Ninth Street, 3:40 a.m.' : 'Ninth Street, morning',
      tiles: [
        B,
        paint(B, { 2: 'W', 4: 'D', 7: 'W', 9: 'Z', 12: 'W', 17: 'E', 18: 'E', 19: 'E', 22: 'Z', 26: 'W', 29: 'Z', 32: 'W', 34: 'Z', 36: '_' }),
        paint(S, { 8: 'y', 13: 'y', 28: 'y' }),
        S,
        Rd, Rd, Rd, Rd,
        paint(S, { 15: 'y', 31: 'y', 23: 'y' }),
        S,
        paint(B, { 3: 'W', 10: 'Z', 14: 'W', 20: 'W', 25: 'Z', 30: 'W', 37: 'W' }),
        B
      ],
      legend: { 'Z': 'graffiti', 'y': 'tent' },
      ambient: night ? 'drone' : 'static',
      bg: '#050508',
      npcs: [], objects: [], zones: [], exits: []
    };
    if (night) {
      m.dark = 0.72; m.playerLight = 30; m.tint = '#102040'; m.tintAlpha = 0.2;
      m.lights = [{ at: [2, 3], r: 54 }, { at: [20, 3], r: 54, flicker: true }, { at: [38, 3], r: 50 }, { at: [18, 2], r: 64, flicker: true }];
    } else {
      m.dark = 0.18; m.tint = '#d8c0a0'; m.tintAlpha = 0.14; m.vignette = 0.6;
      m.lights = [];
    }
    [2, 8, 14, 20, 26, 32, 38].forEach(function (x, i) {
      m.objects.push({ id: pre + 'lamp' + i, at: [x, 3], prop: 'streetlamp', lit: night && (i % 3 === 0),
        examine: night ? (i % 3 === 0 ? 'One of the streetlamps that still works. Every third one, roughly. The city calls that maintenance.' : 'A dead streetlamp. The bulb was stolen years ago; the camera bolted under it was not.') : 'A streetlamp, off for the day.' });
    });
    m.objects.push(
      { id: pre + 'screen', at: [18, 1], examine: night ? function (api) { return api.run(SCREEN_NIGHT); } : 'The screen has gone back to an EEN recap. Blood and screams. I can\'t watch.' },
      { id: pre + 'placard', at: [16, 2], prop: 'placard', examine: [{ narrate: '"INITIATIVE 47A9: NEIGHBORHOOD SCARED STRAIGHT. Public screens operate 24 hours by order of the Department of Punitive Entertainment. Tampering is a moral crime."' }, { think: 'They bolted the screens where the soup kitchen used to be. Food for the soul.' }] },
      { id: pre + 'tent1', at: [8, 2], examine: night ? 'A tent. Someone inside is snoring. Someone else is crying very quietly so as not to wake them.' : 'A tent. The flap is zipped.' },
      { id: pre + 'tent2', at: [13, 2], examine: night ? 'A tent with a hand-painted sign: "NOT ABANDONED. DO NOT CLEAR." The enforcers clear it every month anyway.' : 'The same sign. Still not abandoned.' },
      { id: pre + 'tent3', at: [28, 2], examine: night ? 'Shadows stretch into murderers. Tents slump into corpse robbers. In the dark, everything transforms.' : 'Just a tent, in daylight.' },
      { id: pre + 'graf1', at: [9, 1], examine: 'Gang tags, layered over each other like scabs. Under them, older paint: ONE DAY.' },
      { id: pre + 'graf2', at: [22, 1], examine: 'Somebody sprayed a crowned penguin with a noose for a necktie. The DPE logo. Somebody else crossed it out.' },
      { id: pre + 'graf3', at: [34, 1], examine: night ? 'An arrow, sprayed small, pointing at the gap in the wall. Exactly like the directions said.' : 'The arrow, pointing back toward the alley.' },
      { id: pre + 'door', at: [4, 1], examine: night ? 'Our building. Three floors of crumbling hope.' : 'Our building. Three flights of stairs. Three.' }
    );
    if (night) {
      m.npcs.push({ id: 'enf_far', at: [30, 5], spec: 'enforcer', path: [[26, 5], [34, 5]], pause: 2, speed: 22, turn: false,
        talk: [{ narrate: 'The enforcer\'s head swivels. Camera holes, all the way round.' }, { think: 'Don\'t talk to it. Don\'t give it a reason.' }] });
      m.exits.push({ id: 'toAlley', at: [36, 1], to: 'alley', toAt: [3, 14], facing: 'up' });
      m.zones.push({ id: 'patrolZone', at: [23, 2], w: 1, h: 8 });
      m.zones.push({ id: 'smokeZone', at: [6, 2], w: 1, h: 2, once: true, run: [{ think: 'The stoop is empty. Even the smokers are asleep. Good. Fewer witnesses.' }] });
    } else {
      m.npcs.push(
        { id: 'tj', at: [3, 2], spec: 'tj', facing: 'right', talk: [{ narrate: 'T.J. lifts his cigarette in a lazy salute.' }, ['tj', 'Rough night, Miss B?'], { think: 'Good kids. Shame about their mother, but they\'ll be okay. Tough little street rats. Same as I was at their age.' }] },
        { id: 'arny', at: [5, 2], spec: 'arny', facing: 'left', talk: [['arny', 'You look like death warmed over.'], ['tj', 'Arny.'], ['arny', 'What? She does.']] }
      );
      m.zones.push({ id: 'newsZone', at: [20, 2], w: 1, h: 8, once: true });
      // the walk degrades: each step west the world gets darker, redder and slower
      m.zones.push({ id: 'blur1', at: [30, 2], w: 1, h: 8, once: true, run: async function (api) {
        var d = api.G.World.room.def; d.tint = '#802028'; d.tintAlpha = 0.12; d.vignette = 0.75;
        api.sound('heartbeat'); await api.shake(300, 1);
        await api.think('Left foot. Right foot. The sidewalk keeps tilting.');
      } });
      m.zones.push({ id: 'blur2', at: [12, 2], w: 1, h: 8, once: true, run: async function (api) {
        var d = api.G.World.room.def; d.dark = 0.42; d.tint = '#701018'; d.tintAlpha = 0.22; d.vignette = 0.95;
        api.G.World.player.speed = 30;
        api.sound('heartbeat'); await api.shake(500, 2);
        await api.think('Waverly is waiting. She gets anxious when things don\'t go as expected. If she goes for help, I\'ll have a lot of explaining to do.');
      } });
      m.exits.push({ id: 'toStairs', at: [4, 1], to: 'apt_home', toAt: [7, 6], facing: 'up' });
    }
    return m;
  }

  // The graffiti alley (8x16): dead end, weeds, bottles over a hatch.
  function makeAlley(variant) {
    var night = variant === 'night';
    var pre = night ? '' : 'dawn_';
    var m = {
      name: 'The Alley',
      tiles: [
        'BBBBBBBB',
        'BZ""""ZB',
        'B"____"B',
        'B______B',
        'Z______B',
        'B______B',
        'B______Z',
        'B______B',
        'B______B',
        'B______B',
        'Z______B',
        'B______B',
        'B______B',
        'B______B',
        'B______B',
        'BBB__BBB'
      ],
      legend: { 'Z': 'graffiti', '"': 'weeds' },
      ambient: 'tension',
      bg: '#050508',
      dark: night ? 0.7 : 0.25, playerLight: 30, tint: night ? '#102040' : '#c8b8a0', tintAlpha: 0.18,
      lights: night ? [{ at: [5, 8], r: 40, flicker: true }] : [],
      npcs: [], objects: [], zones: [], exits: []
    };
    m.objects.push(
      { id: pre + 'trash1', at: [6, 5], prop: null, examine: 'A trash can. Empty. Even the rats have given up on this street.' },
      { id: pre + 'trash2', at: [1, 8], examine: 'Another trash can, rusted through.' },
      { id: pre + 'algraf', at: [1, 4], examine: 'Graffiti: a cat, smiling, with too many teeth.' }
    );
    if (night) {
      m.tiles[5] = 'B_____uB'; m.tiles[8] = 'Bu_____B'; m.tiles[12] = 'B_____uB';
      m.objects.push({ id: 'bottles', at: [3, 2], prop: 'bottlepile', count: 7 });
      m.npcs.push({ id: 'catmask', at: [4, 2], spec: 'cat_guide', facing: 'down', if: 'ch01_catUp' });
      m.objects.push({ id: 'cam_alley', at: [6, 0], prop: 'camera', solid: false, examine: [{ think: 'A camera, the lens smashed out. Somebody did me a favour.' }] });
    } else {
      m.objects.push({ id: 'dawn_hatch', at: [3, 2], prop: 'hatch', examine: [{ narrate: 'A closed-off hatch. The bottles are back on top of it already, or near enough.' }, { think: 'He\'s nowhere to be found.' }] });
      m.exits.push({ id: 'dawn_out', at: [3, 15], w: 2, h: 1, to: 'street_home', toAt: [36, 2], facing: 'down' });
    }
    return m;
  }

  // The tunnels (27x12): torch-lit cave maze with a false wall at the east end.
  var tunnels = {
    name: 'The Tunnels',
    tiles: [
      'RRRRRRRRRRRRRRRRRRRRRRRRRRR',
      'RxxxRRRRRRRRRRRRRRRRRRRRRRR',
      'RxxxxxxxxRRRRxxxxxxxxxRRRRR',
      'RRRRRRRRxRRRRxRRRRRRRxRRRRR',
      'RxxxxRRRxxxxxxRRRxxxxxRRRRR',
      'RxRRxRRRRRRRRxRRRxRRRRRRRRR',
      'RxRRxxxxxxRRRxxxxxRRRRRRRRR',
      'RxRRRRRRRxRRRRRRRxxxxxxxxxR',
      'RxxxxRRRRxxxxRRRRRRRRRRRxRR',
      'RRRRxRRRRRRRxxxxxxxxxRRRxRR',
      'RRRRxxxxRRRRRRRRRRRRxxxxxRR',
      'RRRRRRRRRRRRRRRRRRRRRRRRRRR'
    ],
    legend: { 'R': 'rock', 'x': 'cavefloor' },
    ambient: 'drone',
    bg: '#000',
    dark: 0.82, playerLight: 26, tint: '#3a2010', tintAlpha: 0.12,
    lights: [{ at: [2, 2], r: 44, flicker: true }, { at: [8, 4], r: 44, flicker: true }, { at: [13, 4], r: 40, flicker: true }, { at: [17, 6], r: 44, flicker: true }, { at: [22, 7], r: 46, flicker: true }, { at: [5, 6], r: 36, flicker: true }, { at: [16, 9], r: 36, flicker: true }],
    npcs: [{ id: 'guide', at: [3, 2], spec: 'cat_guide', facing: 'right', talk: [['catmask', 'Please stick close, ma\'am.']] }],
    objects: [
      { id: 'ladder', at: [2, 1], prop: 'ladder', examine: [{ narrate: 'The long white ladder, stretching further up than I can see.' }, { think: 'It\'s still not too late to turn back, you know.' }] },
      { id: 't1', at: [2, 0], prop: 'torch', solid: false },
      { id: 't2', at: [7, 3], prop: 'torch', solid: false },
      { id: 't3', at: [14, 3], prop: 'torch', solid: false },
      { id: 't4', at: [16, 5], prop: 'torch', solid: false },
      { id: 't5', at: [22, 6], prop: 'torch', solid: false },
      { id: 't6', at: [5, 5], prop: 'torch', solid: false },
      { id: 't7', at: [16, 8], prop: 'torch', solid: false },
      { id: 'falsewall', at: [24, 7], prop: 'falsewall', examine: [{ narrate: 'A dead end. Rock, cold and wet.' }, { think: 'Except the seam down the middle is too straight to be nature.' }] },
      { id: 'scratch', at: [4, 10], examine: [{ narrate: 'Tally marks scratched into the rock at the end of a dead-end tunnel. Hundreds of them.' }, { think: 'How many women came down that ladder? How many of them counted?' }] }
    ],
    zones: [
      { id: 'tz1', at: [6, 2], w: 2, h: 1 },
      { id: 'tz2', at: [11, 4], w: 2, h: 1 },
      { id: 'tz3', at: [15, 6], w: 2, h: 1 },
      { id: 'tz4', at: [20, 7], w: 2, h: 1 },
      { id: 'tzSmell', at: [9, 4], w: 1, h: 1, once: true, run: [{ think: 'Aboveground, every breath tastes of smoke and exhaust. Down here it all feels cleaner, somehow.' }] }
    ],
    exits: [{ id: 'toClinic', at: [25, 7], to: 'clinic', toAt: [3, 6], facing: 'up', if: 'ch01_wallOpen' }]
  };

  // The clinic (8x8): spotless, white, wrong.
  var clinic = {
    name: 'The Clinic',
    tiles: [
      'QQQQQQQQ',
      'QwwwwwbQ',
      'QwwwwwbQ',
      'QwwwwwwQ',
      'QTwwwwwQ',
      'QwwwwwwQ',
      'QwwwwwwQ',
      'QQQDQQQQ'
    ],
    legend: { 'w': 'wfloor' },
    ambient: 'hum',
    bg: '#000',
    tint: '#a0c0c8', tintAlpha: 0.08, vignette: 0.6,
    npcs: [{ id: 'fienle', at: [5, 4], facing: 'left', if: 'ch01_fienleIn' }],
    objects: [
      { id: 'chair', at: [3, 2], prop: 'stirrups', examine: [{ narrate: 'Person-sized, spoon-shaped, with stirrups on the footrests.' }, { think: 'I try not to stare. I\'m rooted in place anyway.' }, { set: { ch01_sawChair: true } }] },
      { id: 'tray', at: [4, 2], prop: 'tooltray', examine: 'A tray of tools, laid out neat as cutlery. I don\'t look long enough to name them.' },
      { id: 'chart', at: [1, 4], prop: 'clipboard', examine: [{ narrate: 'A clipboard. Most of it is blacked out. What isn\'t: "31 years old. One previous birth."' }, { think: 'Two numbers. That\'s all I am down here. It\'s more than I am up there.' }, { set: { ch01_readChart: true } }] },
      { id: 'cbed', at: [6, 1], examine: 'A hospital bed with paper-thin sheets. All comfortingly familiar. That\'s the worst part.' },
      { id: 'cam_check', at: [1, 0], examine: [{ narrate: 'I give the room a quick once-over for cameras.' }, { think: 'None. Maybe the only room in the country without one.' }] }
    ],
    zones: [], exits: []
  };

  /* ---------------------------------------------------------------------
   * DATA SCRIPTS reused in several places
   * ------------------------------------------------------------------- */
  var SCREEN_NIGHT = [
    { tv: [
      { speaker: 'announcer', headline: 'HISTORICAL RE-ENACTMENT', text: 'Tonight on EEN Classics: the Third World War, re-enacted by volunteers from C block. Real uniforms. Real rifles. Real consequences.', tag: 'RERUN', ticker: 'NEIGHBORHOOD SCARED STRAIGHT • INITIATIVE 47A9 • REPORT YOUR NEIGHBOURS • ' },
      { speaker: 'announcer', mood: 'happy', headline: 'FACTION RED ADVANCES', text: 'A soldier curls in on himself, rocking. Another explodes into red mist, and the mob swallows him whole.', tag: 'RERUN' }
    ] },
    { think: 'Bile rises in my throat. I study the sidewalk cracks instead.' },
    { set: { ch01_sawScreen: true } }
  ];

  /* ---------------------------------------------------------------------
   * CUSTOM MINIGAMES
   * ------------------------------------------------------------------- */
  var A26 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  function sevenOf(L) { return A26.indexOf(L) + 8; }

  /* ch01:compose: write a message in the Seven Code by choosing numbers.
   * params: { message: 'I LOVE YOU / BACK SOON', known: ['B','R',...], title, prompt }
   * result: { success:true, mistakes } (always completes: there is no way to fail, only to take longer) */
  var compose = {
    autoSolve: function () { return { success: true, mistakes: 0 }; },
    start: function (ctx) {
      var R = ctx.R, P = ctx.PAL, p = ctx.params || {};
      var raw = String(p.message || 'I LOVE YOU').toUpperCase();
      var lines = raw.split('/').map(function (s) { return s.trim(); });
      var slots = [];
      lines.forEach(function (ln, li) { ln.split(/\s+/).forEach(function (w, wi) { w.split('').forEach(function (L, ci) { slots.push({ L: L, line: li, word: wi, ci: ci, v: null }); }); }); });
      var known = {}; (p.known || []).forEach(function (L) { known[L] = true; });
      var sel = 0, mistakes = 0, done = false, doneT = 0, buf = '', bufT = 0;
      function ok(s) { return s.v === sevenOf(s.L); }
      function allOk() { return slots.every(ok); }
      function setV(v) {
        var s = slots[sel];
        s.v = Math.max(8, Math.min(33, v));
        if (ok(s)) { known[s.L] = true; ctx.sound('select'); }
        else { mistakes++; ctx.sound('blip'); }
        if (allOk()) { done = true; doneT = ctx.t; ctx.sound('success'); }
      }
      return new Promise(function (resolve) {
        ctx.loop(function (dt) {
          var I = ctx.input;
          if (done) { if (ctx.t - doneT > 1.8) resolve({ success: true, mistakes: mistakes }); return; }
          if (buf && ctx.t - bufT > 1.1) buf = '';
          if (I.repeat('left')) { sel = (sel - 1 + slots.length) % slots.length; buf = ''; ctx.sound('blip'); }
          if (I.repeat('right')) { sel = (sel + 1) % slots.length; buf = ''; ctx.sound('blip'); }
          var s = slots[sel];
          if (I.repeat('up')) setV(s.v == null ? 8 : s.v + 1);
          if (I.repeat('down')) setV(s.v == null ? 33 : s.v - 1);
          I.typed.forEach(function (k) {
            if (/^[0-9]$/.test(k)) {
              buf += k; bufT = ctx.t;
              if (buf.length >= 2) {
                var n = +buf; buf = '';
                if (n >= 8 && n <= 33) { setV(n); if (ok(slots[sel])) { for (var j = 1; j <= slots.length; j++) { var q = (sel + j) % slots.length; if (!ok(slots[q])) { sel = q; break; } } } }
                else { ctx.sound('miss'); }
              } else if (+buf >= 4) { // a single digit 4..9 can't start a valid two-digit 8..33 number except 8/9 themselves
                var one = +buf; buf = '';
                if (one >= 8) { setV(one); if (ok(slots[sel])) { for (var j2 = 1; j2 <= slots.length; j2++) { var q2 = (sel + j2) % slots.length; if (!ok(slots[q2])) { sel = q2; break; } } } }
                else ctx.sound('miss');
              }
            }
            if (k === 'Backspace' || k === 'Delete') { slots[sel].v = null; buf = ''; }
          });
          if (I.pressed('ok')) { for (var j3 = 1; j3 <= slots.length; j3++) { var q3 = (sel + j3) % slots.length; if (!ok(slots[q3])) { sel = q3; break; } } }
        }, function (t) {
          R.rect(0, 0, ctx.W, ctx.H, '#100e0c');
          // the fridge door
          R.rect(20, 26, ctx.W - 40, ctx.H - 44, '#d8d8d0');
          R.rect(20, 26, ctx.W - 40, 2, '#f0f0ea');
          R.rect(ctx.W - 34, 60, 4, 50, '#9a9a92');
          // the paper
          var pw = 300, ph = 108, px0 = ctx.W / 2 - pw / 2, py0 = 34;
          R.rect(px0, py0, pw, ph, P.paper);
          R.rect(px0 + pw / 2 - 10, py0 - 4, 20, 8, '#e8323c', 0.8); // magnet
          ctx.header(p.title || 'WRITE THE REPLY', p.prompt || 'Each letter: its place in the alphabet, plus seven');
          var cw = 20, chh = 40;
          lines.forEach(function (ln, li) {
            var words = ln.split(/\s+/);
            var tot = 0; words.forEach(function (w, i) { tot += w.length * cw + (i ? 12 : 0); });
            var x = ctx.W / 2 - tot / 2, y = py0 + 10 + li * (chh + 8);
            words.forEach(function (w, wi) {
              w.split('').forEach(function (L, ci) {
                var idx = -1;
                for (var k = 0; k < slots.length; k++) if (slots[k].line === li && slots[k].word === wi && slots[k].ci === ci) { idx = k; break; }
                var s = slots[idx], isSel = idx === sel && !done;
                if (isSel) R.rect(x + 1, y - 2, cw - 2, chh - 2, '#e8323c', 0.16 + 0.08 * Math.sin(t * 6));
                // the number (what Luna writes)
                var good = ok(s);
                var numTxt = s.v == null ? (isSel && buf ? buf + '_' : '__') : String(s.v);
                R.text(numTxt, x + cw / 2, y + 2, { size: 10, align: 'center', color: s.v == null ? '#9a8a70' : good ? '#1f6a2e' : '#8a1a20', shadow: false, font: 'hand' });
                R.rect(x + 3, y + 16, cw - 6, 1, '#7a6a5a');
                // the plain letter (what it should say) and what the current number spells
                R.text(L, x + cw / 2, y + 19, { size: 8, align: 'center', color: '#5a4a3a', shadow: false });
                if (s.v != null && !good) R.text('=' + A26.charAt(s.v - 8), x + cw / 2, y + 28, { size: 6, align: 'center', color: '#8a1a20', shadow: false });
                x += cw;
              });
              x += 12;
            });
          });
          // helper line for the selected letter
          if (!done) {
            var s = slots[sel], n = A26.indexOf(s.L) + 1;
            var help = known[s.L] ? s.L + ' = ' + sevenOf(s.L) + '  (you already know this one)' : s.L + ' is letter ' + n + ' of the alphabet.   ' + n + ' + 7 = ?';
            R.rect(ctx.W / 2 - 130, py0 + ph + 3, 260, 14, '#2a2622'); R.text(help, ctx.W / 2, py0 + ph + 6, { size: 8, align: 'center', color: '#e8e4d8', shadow: false });
          }
          // the reference strip: letters Luna knows so far
          var ky = ctx.H - 44, kw = (ctx.W - 40) / 26;
          R.rect(20, ky - 3, ctx.W - 40, 22, '#2a2622');
          for (var li2 = 0; li2 < 26; li2++) {
            var LL = A26.charAt(li2), kn = known[LL];
            R.text(LL, 20 + li2 * kw + kw / 2, ky, { size: 7, align: 'center', color: kn ? '#e8e4d8' : '#5c5a6c', shadow: false });
            R.text(kn ? String(sevenOf(LL)) : '·', 20 + li2 * kw + kw / 2, ky + 9, { size: 6, align: 'center', color: kn ? '#e8c15a' : '#5c5a6c', shadow: false });
          }
          if (done) {
            var a = Math.min(1, (ctx.t - doneT) * 3);
            R.rect(ctx.W / 2 - 60, ctx.H / 2 - 12, 120, 24, '#1a3a22', 0.9 * a);
            R.text('WRITTEN', ctx.W / 2, ctx.H / 2 - 6, { size: 12, font: 'sans', align: 'center', color: '#8aff9a', alpha: a });
          }
          ctx.footer('←→ letter   ↑↓ or type the number   E: next blank');
        });
      });
    }
  };

  /* ch01:bottles: move the bottles off the hatch one at a time without clinking.
   * Bottles leaning on others must come off first (lifting a bottle that is propping
   * another one up = clink). Each lift ends with "set it down gently" (stop the hand
   * in the quiet zone). Three clinks = a drone comes: don't press anything until it passes.
   * result: { success:true, clinks, drones } (it always completes) */
  var bottles = {
    autoSolve: function () { return { success: true, clinks: 0, drones: 0 }; },
    start: function (ctx) {
      var R = ctx.R, P = ctx.PAL;
      // x positions (virtual px), lean target index (this bottle rests on that one)
      var B = [
        { x: 104, lean: null, c: '#2a6a3a' }, { x: 128, lean: 0, c: '#7a5a2a' }, { x: 158, lean: null, c: '#3a5a6a' },
        { x: 186, lean: 2, c: '#6a3a2a' }, { x: 214, lean: 3, c: '#3a6a5a' }, { x: 248, lean: null, c: '#7a6a2a' }, { x: 274, lean: 5, c: '#2a6a3a' }
      ];
      B.forEach(function (b) { b.gone = false; b.wob = 0; });
      var sel = 6, state = 'pick', clinks = 0, drones = 0, noise = 0, msg = 'Pick a bottle. ←→ choose, E lift.', msgT = 0;
      var hand = 0, handV = 1, zone = 0.5, zw = 0.22, droneT = 0, droneResets = 0, doneT = 0;
      function propping(i) { return B.some(function (b) { return !b.gone && b.lean === i; }); }
      function remaining() { return B.filter(function (b) { return !b.gone; }).length; }
      function nextSel(d) { for (var k = 1; k <= B.length; k++) { var n = (sel + d * k + B.length * 3) % B.length; if (!B[n].gone) { sel = n; return; } } }
      function clink(text) {
        clinks++; noise++; ctx.sound('ch01:clink'); msg = text; msgT = ctx.t;
        if (noise >= 3) { state = 'drone'; droneT = 3.5; drones++; ctx.sound('alarm'); msg = 'A DRONE. Don\'t move. Don\'t press anything.'; }
      }
      return new Promise(function (resolve) {
        ctx.loop(function (dt) {
          var I = ctx.input;
          B.forEach(function (b) { b.wob = Math.max(0, b.wob - dt * 2); });
          if (state === 'done') { if (ctx.t - doneT > 1.6) resolve({ success: true, clinks: clinks, drones: drones }); return; }
          if (state === 'drone') {
            var anyKey = I.typed.length || ['ok', 'left', 'right', 'up', 'down'].some(function (a) { return I.pressed(a); });
            if (anyKey && droneResets < 3) { droneT = 3.5; droneResets++; ctx.sound('heartbeat'); msg = 'It heard that. Stay still.'; }
            droneT -= dt;
            if (droneT <= 0) { state = 'pick'; noise = 0; droneResets = 0; msg = 'The drone hums away down the street. Breathe.'; msgT = ctx.t; }
            return;
          }
          if (state === 'pick') {
            if (I.repeat('left')) { nextSel(-1); ctx.sound('blip'); }
            if (I.repeat('right')) { nextSel(1); ctx.sound('blip'); }
            if (I.pressed('ok')) {
              if (propping(sel)) {
                // the bottle leaning on this one slides and knocks
                B.forEach(function (b) { if (!b.gone && b.lean === sel) b.wob = 1; });
                clink('CLINK. Something was leaning on that one. Take the top bottles first.');
              } else {
                state = 'carry'; hand = 0; handV = 0.9 + Math.random() * 0.5; zone = 0.3 + Math.random() * 0.4; zw = 0.24 - Math.min(0.08, (7 - remaining()) * 0.012);
                msg = 'Set it down gently: press E when the hand is over the soft weeds.'; msgT = ctx.t; ctx.sound('select');
              }
            }
          } else if (state === 'carry') {
            hand += handV * dt; if (hand > 1) { hand = 1; handV = -Math.abs(handV); } if (hand < 0) { hand = 0; handV = Math.abs(handV); }
            if (I.pressed('ok')) {
              var b = B[sel]; b.gone = true;
              if (Math.abs(hand - zone) <= zw / 2) { ctx.sound('step'); msg = 'Quiet. Good.'; msgT = ctx.t; }
              else clink('CLINK. Glass on glass. Too loud.');
              if (state !== 'drone') state = 'pick';
              if (remaining() === 0) { state = 'done'; doneT = ctx.t; ctx.sound('success'); msg = 'The outline of a metal hatch.'; }
              else nextSel(-1);
            }
          }
        }, function (t) {
          R.rect(0, 0, ctx.W, ctx.H, '#0c0d10');
          ctx.header('THE HATCH', 'Clinks ' + clinks + '   Noise ' + noise + '/3');
          // ground + hatch
          R.rect(60, 70, 264, 84, '#2a2a28');
          R.rect(90, 92, 204, 52, remaining() === 0 ? '#5a6262' : '#3a3e3e');
          R.rect(90, 117, 204, 2, '#2a2e2e'); R.rect(184, 104, 16, 6, '#7a8282');
          // weeds strip (drop zone visual)
          for (var w = 0; w < 30; w++) R.rect(62 + w * 9, 150 - (w % 3) * 3, 2, 8 + (w % 3) * 3, '#3a5a22');
          // bottles
          B.forEach(function (b, i) {
            if (b.gone) return;
            var cx = b.x, by = 128, ang = 0;
            if (b.lean != null && !B[b.lean].gone) ang = (B[b.lean].x < b.x ? -0.42 : 0.42);
            ang += Math.sin(t * 30) * 0.08 * b.wob;
            var g = R.ctx; g.save(); g.translate(cx, by); g.rotate(ang);
            if (i === sel && state !== 'drone' && state !== 'done') { g.fillStyle = 'rgba(232,50,60,' + (0.25 + 0.15 * Math.sin(t * 6)) + ')'; g.fillRect(-10, -48, 20, 52); }
            g.fillStyle = b.c; g.fillRect(-7, -30, 14, 32); g.fillRect(-3, -42, 6, 12);
            g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(-5, -26, 2, 20);
            g.fillStyle = '#1a1a1a'; g.fillRect(-3, -44, 6, 2);
            if (state === 'carry' && i === sel) { g.fillStyle = '#f0cdb4'; g.fillRect(-9, -20, 18, 6); }
            g.restore();
          });
          if (state === 'carry') {
            // set-down meter
            var mx = 92, my = 166, mw = 200;
            R.rect(mx, my, mw, 10, '#1a1a1e'); R.rect(mx + (zone - zw / 2) * mw, my, zw * mw, 10, '#3a7a2a');
            R.rect(mx + hand * mw - 2, my - 3, 4, 16, '#f0cdb4');
            R.text('soft', mx + zone * mw, my + 12, { size: 6, align: 'center', color: P.dim });
          }
          if (state === 'drone') {
            var a = 0.35 + 0.2 * Math.sin(t * 4);
            R.rect(0, 0, ctx.W, ctx.H, '#000', 0.45);
            var sx = ctx.W / 2 + Math.sin(t * 1.3) * 140;
            R.ctx.save(); R.ctx.globalAlpha = a; R.ctx.fillStyle = '#e8f0ff';
            R.ctx.beginPath(); R.ctx.moveTo(sx, 24); R.ctx.lineTo(sx - 40, 170); R.ctx.lineTo(sx + 40, 170); R.ctx.closePath(); R.ctx.fill(); R.ctx.restore();
            R.rect(sx - 10, 26, 20, 5, '#2a2a30'); R.rect(sx - 2, 31, 4, 2, Math.floor(t * 3) % 2 ? '#ff3040' : '#601010');
            R.text(Math.ceil(Math.max(0, droneT)) + '', ctx.W / 2, 186, { size: 14, font: 'title', align: 'center', color: P.red });
          }
          R.text(msg, ctx.W / 2, 36, { size: 8, align: 'center', color: state === 'drone' ? P.red : '#e8e4d8' });
          R.text('Bottles left: ' + remaining(), ctx.W / 2, 50, { size: 7, align: 'center', color: P.dim });
          if (state === 'done') R.text('The outline of a metal hatch.', ctx.W / 2, 120, { size: 12, font: 'serif', align: 'center', color: '#e8e4d8' });
          ctx.footer(state === 'drone' ? 'Hold still.' : state === 'carry' ? 'E: set it down' : '←→ choose a bottle   E: lift');
        });
      });
    }
  };

  /* ch01:knock: three knocks, wait two seconds, five knocks, wait four seconds,
   * one loud knock (3P L39). E/Space = knock, ↑ = the loud knock.
   * Tolerances are generous; after two misses the seconds are counted on screen,
   * after five the hatch opens anyway (assisted).
   * result: { success:true, attempts, assisted } */
  var knock = {
    autoSolve: function () { return { success: true, attempts: 1, assisted: false }; },
    start: function (ctx) {
      var R = ctx.R, P = ctx.PAL;
      var ev = [], fails = 0, state = 'play', msg = 'Knock the pattern.', msgC = '#e8e4d8', stT = 0, lastT = -1, flash = 0;
      function groups() {
        var gs = [], cur = null;
        ev.forEach(function (e, i) {
          if (!cur || e.t - ev[i - 1].t >= 1.0) { cur = { n: 0, loud: 0, start: e.t, end: e.t }; gs.push(cur); }
          cur.n++; if (e.loud) cur.loud++; cur.end = e.t;
        });
        return gs;
      }
      function fail(why) { fails++; state = 'fail'; stT = ctx.t; msg = why; msgC = P.red; ctx.sound('miss'); }
      function check(final) {
        var gs = groups();
        var want = [3, 5, 1];
        for (var i = 0; i < gs.length; i++) {
          if (i > 2) return fail('Too many groups. Start again.');
          if (gs[i].loud && i < 2) return fail('The loud one comes last. Start again.');
          if (gs[i].n > want[i]) return fail(i === 0 ? 'Three knocks, not ' + gs[i].n + '.' : i === 1 ? 'Five knocks, not ' + gs[i].n + '.' : 'Just one loud knock.');
          if (i < gs.length - 1 && gs[i].n < want[i]) return fail(i === 0 ? 'Only ' + gs[i].n + ' knock' + (gs[i].n === 1 ? '' : 's') + '. It was three.' : 'Only ' + gs[i].n + '. It was five.');
          if (i > 0) {
            var gap = gs[i].start - gs[i - 1].end;
            if (i === 1 && (gap < 1.3 || gap > 3.0)) return fail(gap < 1.3 ? 'Too quick. Wait two seconds after the three.' : 'Too slow. Two seconds, not ' + gap.toFixed(1) + '.');
            if (i === 2 && (gap < 3.0 || gap > 5.4)) return fail(gap < 3.0 ? 'Too quick. Wait four seconds after the five.' : 'Too slow. Four seconds, not ' + gap.toFixed(1) + '.');
          }
        }
        if (final) {
          if (gs.length === 3 && gs[2].loud === 1 && gs[2].n === 1) { state = 'done'; stT = ctx.t; msg = 'The hatch slides open a few inches.'; msgC = P.neon; ctx.sound('success'); }
          else if (gs.length < 3) fail('The loud knock comes last, after the five.');
        }
      }
      return new Promise(function (resolve) {
        ctx.loop(function (dt) {
          var I = ctx.input;
          flash = Math.max(0, flash - dt * 4);
          if (state === 'done') { if (ctx.t - stT > 1.6) resolve({ success: true, attempts: fails + 1, assisted: false }); return; }
          if (state === 'fail') {
            if (fails >= 5 && ctx.t - stT > 1.2) { resolve({ success: true, attempts: fails, assisted: true }); return; }
            if (ctx.t - stT > 1.6) { state = 'play'; ev = []; lastT = -1; msg = fails >= 2 ? 'Again. Count the seconds this time.' : 'Again.'; msgC = '#e8e4d8'; }
            return;
          }
          var soft = I.pressed('ok'), loud = I.pressed('up');
          if (soft || loud) {
            ev.push({ t: ctx.t, loud: loud }); lastT = ctx.t; flash = 1;
            ctx.sound(loud ? 'ch01:knockloud' : 'ch01:knock');
            check(loud);
          }
          // nothing for 7 seconds mid-pattern = she lost count
          if (state === 'play' && ev.length && ctx.t - lastT > 7) fail('Too long. Whoever is down there will think nobody is coming.');
        }, function (t) {
          R.rect(0, 0, ctx.W, ctx.H, '#0b0b0e');
          ctx.header('THE KNOCK', fails ? 'Tries ' + (fails + 1) : 'As you were taught');
          // the hatch, seen from above, close
          R.rect(92, 50, 200, 90, '#3a3e3e'); R.rect(96, 54, 192, 82, '#5a6262');
          R.rect(96, 94, 192, 2, '#3a4040'); R.rect(182, 82, 20, 8, '#8a9292');
          if (flash > 0) R.rect(96, 54, 192, 82, '#ffffff', flash * 0.25);
          // the remembered instructions
          R.text('Three knocks.  Wait two seconds.  Five knocks.  Wait four seconds.  One loud knock.', ctx.W / 2, 30, { size: 7, align: 'center', color: '#c9bfa4', font: 'serif', style: 'italic' });
          // knock timeline
          var gs = groups(), y = 150, x = 70;
          var want = [3, 5, 1];
          for (var gi = 0; gi < 3; gi++) {
            for (var k = 0; k < want[gi]; k++) {
              var have = gs[gi] && k < gs[gi].n;
              var big = gi === 2;
              R.rect(x, y - (big ? 3 : 0), big ? 12 : 8, big ? 12 : 8, have ? (big ? P.red : P.amber) : '#2a2a32');
              x += big ? 16 : 11;
            }
            if (gi < 2) { R.text(gi === 0 ? '· 2s ·' : '·· 4s ··', x + 14, y, { size: 7, align: 'center', color: P.dim }); x += 34; }
          }
          // heartbeat / seconds counter since the last knock
          if (state === 'play' && lastT >= 0) {
            var since = ctx.t - lastT, beat = since % 1;
            R.ctx.save(); R.ctx.globalAlpha = Math.max(0, 1 - beat * 2.5);
            R.rect(ctx.W / 2 - 3, 70, 6, 6, P.red); R.ctx.restore();
            if (fails >= 2 && since >= 0.9) R.text(Math.floor(since) + '…', ctx.W / 2, 104, { size: 16, font: 'title', align: 'center', color: '#e8e4d8' });
          }
          R.text(msg, ctx.W / 2, 172, { size: 9, align: 'center', color: msgC });
          ctx.footer('E / SPACE: knock     ↑: the loud knock');
        });
      });
    }
  };

  /* ---------------------------------------------------------------------
   * REGISTRATION
   * ------------------------------------------------------------------- */
  G.registerChapter({
    id: 'ch01',
    title: 'One Day, But Not Today',
    kicker: 'FRIDAY, OCTOBER 12, 2083 • 3:00 A.M.',
    maps: {
      luna_apartment: makeApt('night'), apt_past: makeApt('past'), apt_home: makeApt('home'),
      street: makeStreet('night'), street_home: makeStreet('home'),
      alley: makeAlley('night'), alley_dawn: makeAlley('dawn'),
      tunnels: tunnels, clinic: clinic
    },
    cast: cast,
    tiles: tiles,
    props: props,
    minigames: { compose: compose, bottles: bottles, knock: knock },
    testDefaults: { m_waverly: 60 },

    start: async function (api) {
      var W = api.G.World;
      // custom sounds (registered here, not at load time)
      api.G.Audio.custom['ch01:knock'] = function (t) { t.noise(0.07, 0.35, 500); t.tone('sine', 110, 0.1, 0.25); };
      api.G.Audio.custom['ch01:knockloud'] = function (t) { t.noise(0.14, 0.6, 350); t.tone('sine', 70, 0.25, 0.4); };
      api.G.Audio.custom['ch01:clink'] = function (t) { t.tone('triangle', 2400, 0.12, 0.18); t.tone('triangle', 3100, 0.1, 0.12, { delay: 0.05 }); };
      // Luna's look: street clothes until the clinic gown (shared cast ids)
      var meSpec = 'luna_home';
      function ME() { return meSpec; }
      api.setPlayer(meSpec);
      function bumpWaverly(d) { api.set('m_waverly', Math.max(0, Math.min(100, api.get('m_waverly', 60) + d))); }
      function slow(speed) { W.player.speed = speed; }

      /* ============ 1. APARTMENT, 3:00 A.M. ============ */
      await api.slides([{ style: 'black', text: 'Some nights, loving your child means leaving her when it matters most.' }]);
      await api.goRoom('luna_apartment', { at: [5, 2], facing: 'up', fade: true });
      api.sound('door');
      await api.narrate('I stand in the kitchen of our tiny apartment with my head shoved deep into the fridge. Nothing but cold air and a slice of rotten bologna.');
      await api.think('It\'s three a.m. Only an hour until my appointment.');
      api.objective('Look around for food   (move: arrows/WASD · examine: E)', { targets: ['cupboard'] });
      await api.until(function (f) { return f.ch01_foundPB; }, { targets: ['cupboard'] });
      api.objective(null);
      await api.think('Half a jar of peanut butter. It\'ll have to do.');

      // Waverly wakes
      api.sound('step');
      api.set('ch01_waverlyUp', true);
      api.addNpc({ id: 'waverly', at: [8, 3], facing: 'left' });
      await api.wait(300);
      await api.say('waverly', 'Momma?', { mood: 'tired' });
      api.face('player', 'down');
      await api.move('waverly', [6, 3]);
      api.face('player', 'right');
      api.face('waverly', 'player');
      await api.narrate('Waverly peeks around the curtain. Her curls stick out like static, fists clenched, eyes too serious for an eleven-year-old girl.');
      await api.say(ME(), 'Come here. You should be asleep.');
      await api.say('waverly', ['I heard a noise and got worried.', 'If someone broke in, you might not be strong enough to stop them, so I thought I should come help, just in case.']);
      await api.narrate('Here\'s what no one tells you before you have a child: That their smile shines brighter than all the stars in the sky. That each tear they shed carves its way through your heart like a switchblade.');
      var c0 = await api.choice([
        'I\'m sorry for scaring you. But you never have to worry about someone robbing us.',
        'My brave girl. Back to bed, guard duty is over.'
      ]);
      if (c0 === 1) await api.say('waverly', 'Guard duty is never over. That\'s the whole point of guard duty.', { mood: 'neutral' });
      await api.say('waverly', 'Because we don\'t have anything worth stealing?');
      await api.think('That one stings more than it should.');
      await api.say(ME(), 'For now. But one day, we\'ll live in a house on the beach -');
      await api.say('waverly', 'With two bedrooms and all the food we can eat. Steak and potatoes and enough soup to fill a bathtub.', { mood: 'happy' });
      await api.say(ME(), 'That\'s right. And we\'ll spend every day reading and taking walks in the sand.');
      await api.say('waverly', 'I can\'t wait.', { mood: 'happy' });
      await api.say(ME(), 'Me too. But to make that happen, we have to keep working hard. Which means I need to go out to an appointment while you go back to sleep. I\'ll be back by the time you wake up.');
      await api.say('waverly', 'My EduTV class is studying cats tomorrow. Can we go looking for some when you get back so I can do some hands-on observation?');
      await api.think('The urge to back out strikes me like an electric shock. Climb into bed, wrap my arms around my girl, let sleep take me. Maybe, if I hope hard enough, nature will take care of itself.');
      await api.think('Or maybe I\'ll win the lottery. The odds are about the same.');
      var cCats = await api.choice([
        { text: 'Of course. We can make a day of it. Those ferals won\'t know what hit them.', set: { ch01_catsPromised: true } },
        { text: 'We\'ll see.', set: { ch01_catsPromised: false } }
      ]);
      if (cCats === 1) {
        bumpWaverly(-5);
        await api.emote('waverly', '…', 700);
        await api.say('waverly', '"We\'ll see" means no. You told me that. When I was six.', { mood: 'sad' });
        await api.think('I did tell her that. She keeps everything.');
      } else {
        await api.say(ME(), 'I happen to know the location of a colony of ferals living in Balront Park.', { mood: 'happy' });
        await api.emote('waverly', '♥', 700);
      }

      /* ============ 2. THE FRIDGE NOTE: the Seven Code ============ */
      await api.say('waverly', 'Did you read my note? On the fridge. I left it before bed.');
      api.objective('Read Waverly\'s note on the fridge', { target: 'fridge' });
      await api.waitForInteract('fridge');
      api.objective(null);
      await api.note({ title: 'ON THE FRIDGE, IN CRAYON', text: '9-25-16-21-14 / 27-28-21-8' });
      await api.think('Numbers. Our code. It\'s been so long since I worked nights that I\'ve gone rusty.');
      await api.say('waverly', 'You forgot. Momma. You forgot Grandma\'s seven.', { mood: 'shock' });
      await api.say('waverly', 'Grandma\'s seven, Momma. Seven seconds to think, seven to add.');
      await api.think('Seven seconds. My mother\'s rule. Seven seconds is all it takes to overcome your first instinct and process your second thought. Waverly was seven when she turned it into a game…');

      // --- playable flashback: Waverly (7) invents the code ---
      await api.fadeOut(700, '#fff');
      await api.goRoom('apt_past', { at: [7, 5], facing: 'left' });
      await api.fadeIn(700);
      await api.slides([{ style: 'montage', title: 'Four years ago', text: 'I worked nights then. She hated waking up to an empty room.' }]);
      api.objective('Go to Waverly at the table', { target: 'waverly7' });
      await api.waitForInteract('waverly7');
      api.objective(null);
      api.face('waverly7', 'player');
      await api.say('waverly7', 'Momma, Miss Hallaham reads our notes. She says she doesn\'t, but she does. She moves her lips.', { mood: 'angry' });
      await api.say('waverly7', 'So I made a secret code. It\'s Grandma\'s rule. You know how Grandma said seven seconds?', { mood: 'happy' });
      await api.say(ME(), 'Seven seconds to get past your first instinct. I told you that one.');
      await api.say('waverly7', 'So every letter gets seven more. A is the first letter. So A is…?');
      var tries = 0;
      while (true) {
        var qa = await api.choice([{ text: '8', value: 8 }, { text: '1', value: 1 }, { text: '7', value: 7 }], { prompt: 'A is the 1st letter. Add seven.', autoPick: 0 });
        if (qa === 0) break;
        tries++;
        await api.say('waverly7', qa === 1 ? 'No, that\'s just normal A. Everybody knows normal A. You have to add the seven.' : 'Seven is just the seven. A is one, and then you add seven.', { mood: 'neutral' });
      }
      await api.say('waverly7', 'Eight! So B is nine, and C is ten, and it keeps going.', { mood: 'happy' });
      await api.say('waverly7', 'What\'s Z? Z is the last one. Twenty-six.');
      while (true) {
        var qz = await api.choice([{ text: '26', value: 26 }, { text: '33', value: 33 }, { text: '19', value: 19 }], { prompt: 'Z is the 26th letter. Add seven.', autoPick: 1 });
        if (qz === 1) break;
        tries++;
        await api.say('waverly7', qz === 0 ? 'That\'s normal Z! Add the seven, Momma.' : 'You took away seven. You\'re supposed to add it.', { mood: 'neutral' });
      }
      api.set('ch01_quizTries', tries);
      await api.say('waverly7', 'Thirty-three! So no number is ever smaller than eight or bigger than thirty-three. Little lines between the letters, and a big slash between the words.', { mood: 'happy' });
      await api.say('waverly7', 'If Miss Hallaham reads it, she\'ll just think I\'m practising my counting.', { mood: 'smug' });
      await api.think('My genius. Seven years old and already smarter than the whole building.');
      await api.fadeOut(700, '#fff');
      await api.goRoom('luna_apartment', { at: [5, 2], facing: 'up' });
      await api.fadeIn(600);

      // --- decode BRING TUNA ---
      await api.say('waverly', 'See? You remember now. Read it.');
      var cipherParams = { mode: 'seven', ciphertext: '9-25-16-21-14 / 27-28-21-8', title: 'WAVERLY\'S NOTE', prompt: 'Grandma\'s seven: number minus seven = letter', hint: 'A = 8, B = 9, C = 10 ... every letter is its place in the alphabet plus seven' };
      var res = await api.minigame('cipher', cipherParams);
      var helped = 0;
      while (!res.success) {
        helped++;
        if (helped === 1) {
          await api.say('waverly', 'Momma. Nine minus seven is two. Two is B. Do the first one with me.', { mood: 'neutral' });
          res = await api.minigame('cipher', Object.assign({}, cipherParams, { given: ['B'], hint: '9 - 7 = 2 = B.   25 - 7 = 18 = R.   Take seven off, then count letters.' }));
        } else {
          await api.say('waverly', 'Here. I wrote the whole alphabet for you. Don\'t tell anyone.', { mood: 'smug' });
          res = await api.minigame('cipher', Object.assign({}, cipherParams, { given: ['B'], revealKey: true, canGiveUp: false, hint: 'The key is filled in at the bottom: find each number.' }));
        }
      }
      api.set('ch01_decodeHelped', helped);
      api.set('f_code_learned', true);
      await api.think('BRING TUNA.');
      await api.say('waverly', 'For the cats. I was thinking that if we bring some tuna, they might come out and even let me pet them.');
      await api.think('I picture the bare shelves in the fridge. The empty space between the folds of my wallet.');
      await api.say(ME(), 'No promises, but I\'ll see what I can do.');
      await api.think('If a single can of tuna is all it takes to make her happy, I\'ll find a way to make it happen.');
      await api.say(ME(), 'Wavey. If you ever need to tell me something secret, use Grandma\'s seven. Promise?');
      await api.say('waverly', 'I promise. But it\'s not very secret if you forget it.', { mood: 'smug' });
      await api.say('waverly', 'Momma? What kind of appointment is it?');
      var cLie = await api.choice(['A doctor. Just a check-up.', 'Grown-up stuff. Boring grown-up stuff.']);
      await api.say(ME(), cLie === 0 ? 'A doctor. Just a check-up, sweetheart. Nothing to worry about.' : 'Boring grown-up stuff. A doctor. Nothing to worry about.');
      await api.think('The lie sits in my mouth like a stone. Bringing another kid into this world just for it to starve would be cruel. That\'s the truth I can\'t tell her.');

      // tuck her in
      api.objective('Tuck Waverly into bed', { target: 'waverly' });
      await api.move('waverly', [8, 3]);
      api.face('waverly', 'up');
      await api.waitForInteract('waverly');
      api.objective(null);
      await api.narrate('We walk, shoulders brushing, to her corner. She climbs into bed and hugs Bartholomew. He folds into her arms perfectly. I rub her back.');
      await api.say(ME(), 'Whatever your heart desires, Wavey-woo. One day I\'ll get it all for you.');
      await api.fadeOut(900);
      api.hide('waverly');
      await api.say(ME(), 'One day… but not today.', { mood: 'sad' });
      await api.narrate('Here\'s what I would tell anyone who\'s considering having a child: Every time you leave them, it feels like you\'ve left a piece of yourself behind. And you won\'t be whole again until you have them in your arms.');
      await api.fadeIn(900);
      api.teleport([5, 2], 'up');

      /* --- compose the reply on the fridge --- */
      api.objective('Write your reply on the fridge note', { target: 'fridge' });
      await api.waitForInteract('fridge');
      api.objective(null);
      await api.think('She answered me in the code. I answer her the same way. Underneath her note, in my handwriting.');
      await api.minigame('compose', { message: 'I LOVE YOU / BACK SOON', known: ['A', 'B', 'G', 'I', 'N', 'R', 'T', 'U'], title: 'YOUR REPLY', prompt: 'I LOVE YOU · BACK SOON' });
      await api.note({ title: 'ON THE FRIDGE', text: '9-25-16-21-14 / 27-28-21-8\n\n16 / 19-22-29-12 / 32-22-28\n9-8-10-18 / 26-22-22-21' });
      api.set('ch01_replyWritten', true);
      await api.think('I love you. Back soon. Both true. For now.');

      api.objective('Leave the peanut butter on the table', { target: 'table' });
      await api.waitForInteract('table');
      api.set('ch01_pbOnTable', true);
      api.addObject({ id: 'pbjar2', at: [4, 4], prop: 'pbjar', solid: false, layer: 1 });
      await api.narrate('I put the jar on the table where she\'ll see it. If Waverly wakes up again before I get back, at least she\'ll have something to eat.');
      await api.narrate('It\'s not enough. But it\'s something.');
      api.set('ch01_readyToGo', true);

      /* ============ 3. NIGHT STREET ============ */
      api.objective('Go out (the door, bottom left)', { target: 'to_street' });
      await api.waitForRoom('street');
      api.objective(null);
      await api.narrate('The harsh wind claws at my skin as I rush down the empty street, clutching my threadbare jacket. The city is pitch black, and in the dark, everything transforms.');
      await api.think('The directions said: east along Ninth, past the screen, to the alley with the arrow. Don\'t stop. Don\'t talk to anything with a camera for a face.');
      api.objective('Head east along the street');
      await api.waitForZone('patrolZone');
      api.objective(null);

      // the patrol
      api.lockPlayer();
      api.sound('alarm');
      await api.pan([28, 6], 700);
      await api.narrate('An enforcer patrol sweeps the crossing ahead: silver heads, camera holes all the way round. Above them, the drone hums.');
      await api.think('Out after curfew with no shift slip. If they scan me, they\'ll ask where I\'m going. And I can\'t tell them.');
      await api.cameraReset(500);
      api.unlockPlayer();
      var st = await api.minigame('stealth', {
        title: 'THE CROSSING', prompt: 'Reach the far corner unseen (Shift: creep)',
        map: [
          '####################',
          '#@----y-------y----#',
          '#------------------#',
          '#====X=======X=====#',
          '#==================#',
          '#====X=======X=====#',
          '#------------------#',
          '#----y--------y---*#',
          '####################'
        ],
        legend: { 'y': 'tent' },
        guards: [
          { path: [[3, 4], [16, 4]], speed: 26, range: 52, fov: 70, spec: 'enforcer' },
          { path: [[10, 2], [10, 6]], speed: 18, range: 44, fov: 60, spec: 'enforcer' }
        ],
        cameras: [{ at: [9, 0], angle: 90, sweep: 70, range: 70, speed: 0.7, fov: 36 }],
        lives: 3
      });
      api.set('ch01_stealthOk', !!st.success);
      if (!st.success) {
        api.sound('buzzer');
        await api.say('enforcer', 'CITIZEN. CURFEW ADVISORY. STATE YOUR BUSINESS.', { mood: 'neutral' });
        var cEnf = await api.choice(['Night shift. The laundry on Fourth.', '(Say nothing. Keep walking.)']);
        if (cEnf === 0) {
          await api.say('enforcer', 'EMPLOYMENT NOT ON FILE. SOCIAL CREDIT ADJUSTED. PROCEED.');
          await api.think('Ten points gone. I didn\'t have ten points to lose. But it lets me go.');
        } else {
          await api.say('enforcer', 'NON-COMPLIANCE LOGGED. PROCEED.');
          await api.think('Logged. Everything gets logged. But it doesn\'t follow me. Androids don\'t chase what doesn\'t run.');
        }
      } else {
        await api.think('Nobody saw me. Nobody that counts.');
      }
      api.teleport([27, 3], 'right');
      api.objective('Find the alley with the arrow', { target: 'toAlley' });
      await api.waitForRoom('alley');
      api.objective(null);

      /* ============ 4. THE ALLEY HATCH ============ */
      await api.narrate('A graffiti-covered alley that ends in an old wall, laden with overgrown weeds and glass bottles. I\'ve arrived at last.');
      await api.think('Time to begin.');
      api.objective('Uncover the hatch under the bottles', { target: 'bottles' });
      await api.waitForInteract('bottles');
      api.objective(null);
      await api.narrate('I kneel, the moist ground seeping into my jeans. One at a time. Glass is loud, and the night is listening.');
      var bt = await api.minigame('bottles', {});
      api.set('ch01_clinks', bt.clinks || 0);
      api.remove('bottles');
      api.addObject({ id: 'hatch', at: [3, 2], prop: 'hatch' });
      await api.narrate('The outline of a metal hatch forms in the cleared space. I reach for it and freeze, my hand hovering inches from the handle.');
      await api.think('This is it. No more pretending it\'s not happening.');
      await api.think('I close my eyes and picture the hope on Waverly\'s face when she asked me for tuna. The hunger permanently etched into her gaze.');
      api.objective('Knock on the hatch', { target: 'hatch' });
      await api.waitForInteract('hatch');
      api.objective(null);
      await api.think('The voice on the phone was clear. Three knocks. Wait two seconds. Five knocks. Wait four seconds. Then one loud, large knock.');
      var kn = await api.minigame('knock', {});
      api.set('ch01_knockAssisted', !!kn.assisted);
      if (kn.assisted) await api.think('My hands are shaking too much to keep count. I knock anyway, and keep knocking, until something moves under the metal.');

      // the cat mask
      W.find('hatch').def.open = true;
      api.sound('door');
      api.set('ch01_catUp', true);
      api.addNpc({ id: 'catmask', at: [4, 2], spec: 'cat_guide', facing: 'down' });
      await api.emote('player', '!', 700);
      await api.narrate('The hatch slides open a few inches. A hooded figure peers out, face hidden behind a golden mask shaped like a smug-looking cat, its lips curled like it knows something I don\'t.');
      await api.think('Animal mask? Hood? My breath catches. My feet shift back.');
      api.lockPlayer();
      await api.move('player', [3, 4]);
      api.face('player', 'up');
      api.unlockPlayer();
      await api.say('catmask', ['Don\'t worry.', 'I know what this looks like. But I\'m not one of them. I promise.']);
      await api.think('My first instinct is to run. I haven\'t survived this long by taking unnecessary risks.');
      var proof = false, ranOnce = false;
      while (!proof) {
        var cProof = await api.choice([
          { text: 'I\'m gonna need more than that. Got any proof?' },
          { text: '(Run.)' },
          { text: 'Okay. I believe you.', if: function () { return ranOnce; } }
        ], { autoPick: ranOnce ? 2 : 0 });
        if (cProof === 0) proof = true;
        else if (cProof === 1) {
          ranOnce = true;
          api.sound('heartbeat');
          await api.shake(300, 2);
          await api.think('Seven seconds. Mom\'s rule. That\'s all it takes to overcome your first instinct and process your second thought.');
          await api.think('Think. True Believers don\'t talk. This one did. He has to be telling the truth. Right?');
          await api.think('I\'m low on time and I\'m low on chances. Running doesn\'t get Waverly anything.');
        } else {
          await api.say('catmask', 'You don\'t. I can hear it. Ask.');
          proof = true;
        }
      }
      if (cProof !== 0) await api.say(ME(), 'Fine. Got any proof?');
      await api.narrate('He lifts the mask to reveal chapped lips and a pale white nose.');
      await api.say('catmask', 'If I were a True Believer, I\'d be killed for that.');
      await api.narrate('He lowers it again.');
      await api.say(ME(), 'I\'m sorry. It\'s just…');
      await api.say('catmask', 'Never apologize for being cautious. Do you have the key?');
      api.objective('Give him the key');
      var cKey = await api.choice(['(Hand over the emerald stone.)', '(Hesitate, then hand it over.)']);
      api.objective(null);
      if (cKey === 1) await api.think('My hand trembles. Once he has it, I\'m committed.');
      await api.narrate('I pass him the emerald stone I\'d been told to save for this moment.');
      await api.narrate('The hatch groans open and the man emerges, clad in a button-down shirt and slacks under the robe.');
      await api.say('catmask', 'You\'re Luna, right? We\'ve been expecting you. Come on in.');
      await api.narrate('I creep to the edge and peer down. The drop looks endless. A place people go to disappear.');

      /* ============ 5. LADDER AND TUNNELS ============ */
      await api.fadeOut(800);
      api.ambient('drone');
      await api.slides([
        { style: 'black', text: 'A long white ladder stretches further than I can see. One rung at a time. With each step, I sink further into my doubts.' },
        { style: 'black', text: 'It\'s still not too late to turn back, you know. You could still make this work. Go home to Waverly. Raise your children.' },
        { style: 'black', text: 'No. You know that\'s not possible.' }
      ]);
      await api.goRoom('tunnels', { at: [2, 2], facing: 'down' });
      await api.fadeIn(400);
      api.sound('hit');
      await api.shake(450, 3);
      await api.narrate('I\'m so lost in thought I don\'t notice when I reach the bottom. My feet perform an awkward dance before I crash hard on my butt.');
      await api.think('My heart pounds. Running my fingers through the dirt helps. In hindsight, a literal underground facility was always going to be in a cave.');
      await api.say('guide', 'Right this way, ma\'am. Please stick close.');
      var legs = [
        { to: [7, 2], zone: 'tz1', t: 'Right.' },
        { to: [12, 4], zone: 'tz2', t: 'Left. Then right again.' },
        { to: [16, 6], zone: 'tz3', t: 'Another right. Or was it left?' },
        { to: [22, 7], zone: 'tz4', t: 'I stopped keeping track after the fourth right.' }
      ];
      for (var li = 0; li < legs.length; li++) {
        await api.move('guide', legs[li].to, { speed: 46 });
        api.face('guide', 'player');
        api.objective('Follow the masked man', { target: legs[li].zone });
        await api.waitForZone(legs[li].zone);
        api.objective(null);
        await api.think(legs[li].t);
      }
      await api.move('guide', [23, 7], { speed: 40 });
      api.face('guide', 'right');
      await api.narrate('A dead end. He raises a gloved fist and knocks on the rock. Three times.');
      api.sound('ch01:knock'); await api.wait(350); api.sound('ch01:knock'); await api.wait(350); api.sound('ch01:knock');
      await api.wait(400);
      api.sound('reveal');
      await api.shake(500, 2);
      api.remove('falsewall');
      api.set('ch01_wallOpen', true);
      await api.narrate('The stone wall folds open.');
      await api.move('guide', [24, 7], { speed: 40 });
      api.hide('guide');
      api.objective('Go through', { target: 'toClinic' });
      await api.waitForRoom('clinic');
      api.objective(null);

      /* ============ 6. THE CLINIC ============ */
      await api.narrate('A standard doctor\'s office, if a bit bare-bones. Patient charts, an end table full of tools, a hospital bed with paper-thin sheets. All comfortingly familiar.');
      await api.think('Then my gaze snags on the chair.');
      api.objective('Look around', { targets: ['chair', 'chart'] });
      await api.until(function (f) { return f.ch01_sawChair && f.ch01_readChart; }, { targets: ['chair', 'chart'] });
      api.objective(null);
      api.set('ch01_fienleIn', true);
      api.addNpc({ id: 'fienle', at: [3, 6], facing: 'up' });
      api.sound('door');
      await api.move('fienle', [4, 4], { speed: 40 });
      api.face('fienle', 'player');
      api.face('player', 'fienle');
      await api.say('fienle', 'Yes, this is where the procedure will happen. I\'m Doctor Fienle. It\'s nice to meet you.');
      await api.narrate('He thrusts out his hand. Crumbs in his mustache. I flinch at the sudden movement.');
      var cHand = await api.choice(['Pleasure. (Don\'t shake it.)', '(Shake it, quickly.)']);
      if (cHand === 0) await api.narrate('I eye his hand but make no move to shake it. He smiles. It doesn\'t reach his eyes.');
      else await api.narrate('His palm is damp. He holds on a second too long. He smiles. It doesn\'t reach his eyes.');
      await api.say('fienle', 'Don\'t worry, my dear. You\'re in excellent hands. Mine, to be exact.', { mood: 'smug' });
      await api.narrate('He reaches out to stroke my arm. I jerk away, but his smile only widens.');
      await api.say('fienle', 'You are a very beautiful woman. Did anyone ever tell you that?', { mood: 'smug' });
      await api.think('The urge to run strikes again, stronger this time. I\'m alone with the creepy doctor and his cold eyes.');
      await api.say('fienle', 'We\'ll get started right away. Put this on and have a seat. I\'ll return in just a moment.');
      await api.move('fienle', [3, 6], { speed: 40 });
      api.hide('fienle');
      await api.fadeOut(600);
      meSpec = 'luna_gown'; api.setPlayer(meSpec);
      api.teleport([3, 3], 'up');
      await api.narrate('I strip off my clothes, shove the thin gown over my head, climb into the chair and close my eyes. Underneath, I can see all the colors of the rainbow.');
      await api.fadeIn(600);
      await api.think('Life is full of branching paths. Somewhere there\'s another universe, one less cruel, where I\'m in my own bed, asleep without a care in the world.');
      await api.think('Or I\'m with Waverly, laughing as we imagine names for the sister she\'d meet in six months. I envy that version of myself.');
      api.show('fienle');
      await api.move('fienle', [4, 4], { speed: 40 });
      api.face('fienle', 'player');
      await api.say('fienle', 'Excellent! Okay. 31 years old. One previous birth. Any complications I should know about?');
      await api.say(ME(), 'No.');
      await api.think('I hear myself say it, but it feels like I\'m floating miles away.');
      await api.say('fienle', 'Excellent. Some women find it easier to be unconscious for the procedure. Would you prefer to be sedated?');
      await api.think('Do I trust this man with my unconscious body? No. But I don\'t think I can go through with this if I\'m awake.');
      await api.choice([{ text: 'Yes, please.' }, { text: 'No. I want to stay awake.', if: function () { return false; } }], { showDisabled: true });
      await api.think('I regret the words as soon as they pass my tongue.');
      await api.say('fienle', 'Of course. I\'m going to give you a quick poke in the arm. Count down from twenty and when you wake up, this will all be over.');
      await api.think('Funny. That\'s the same thing I told Waverly before I left. I hope I get home in time to keep my promise.');
      api.sound('heartbeat');
      await api.slides([
        { style: 'black', text: 'Twenty.', ms: 900 },
        { style: 'black', text: 'Nineteen.', ms: 900 },
        { style: 'black', text: 'Eighteen…', ms: 1100 },
        { style: 'black', text: 'Thoughts of my daughter soothe me all the way into unconsciousness.' }
      ]);

      /* ============ 7. WAKING, AND THE LADDER ============ */
      await api.fadeOut(10);
      api.hide('fienle');
      api.set('ch01_fienleIn', false);
      api.addNpc({ id: 'catwake', at: [4, 3], spec: 'cat_guide', facing: 'left' });
      api.teleport([3, 3], 'right');
      await api.fadeIn(1200);
      await api.narrate('I wake to someone shaking my shoulder. Through half-lidded eyes, the golden glare of the cat mask shines down on me.');
      await api.say('catwake', 'Hey. Get up. Now.', { mood: 'angry' });
      await api.say('catwake', 'You have to go. Your procedure finished hours ago. The doc\'ll be furious if he finds out I let you stay this long.');
      await api.say(ME(), 'Hours? My daughter. I told her I\'d be right back.', { mood: 'fear' });
      await api.say('catwake', 'Guess you better head out, then.');
      api.sound('hit');
      await api.shake(500, 2);
      await api.narrate('I slide off the chair. The floor rushes up and slams into my knees. An invisible hand has a spoon down my throat and is scooping away my insides.');
      await api.say(ME(), 'What\'s… happening to me? Something… go wrong?', { mood: 'fear' });
      await api.say('catwake', 'Doc said the procedure was smooth. He left a while back. Some women just react a little worse to the sedative.');
      await api.think('A little worse? My body feels scooped out. Hollowed. Like something essential inside me is just… gone.');
      await api.say('catwake', 'Drink lots of fluids and rest up for a few days. Can anyone else watch your daughter?');
      await api.say(ME(), 'A neighbor. But I need to get there first.');
      await api.think('My clothes. They\'re somewhere. I can\'t look for them. I can barely look at all.');
      await api.fadeOut(700);
      await api.narrate('We trudge back through the dim passages, my body limp against his shoulder. Left, right, right. I don\'t count.');
      await api.goRoom('tunnels', { at: [2, 2], facing: 'up' });
      api.hide('guide');
      await api.fadeIn(500);
      await api.say('cat_guide', 'Think you can pull yourself up if I push you from behind?');
      await api.say(ME(), 'Yeah. I\'m actually starting to feel a bit better.');
      await api.think('I\'ll probably pass out the next time I close my eyes, and my stomach is full of nails. But a plan gives me something to hold on to.');
      var l1 = await api.minigame('qte', { mode: 'mash', title: 'THE LADDER', prompt: 'Climb. Every rung is a battle.', target: 26, time: 6, decay: 6 });
      await api.narrate('Halfway up, my grip slips.');
      api.sound('miss');
      await api.shake(300, 3);
      var l2 = await api.minigame('qte', { mode: 'timing', title: 'GRIP', prompt: 'Catch the rung!', rounds: 1, need: 1, speed: 0.8, zone: 0.22 });
      if (l2.success) await api.narrate('My hand finds the rung. His hands push my back, steadying me anyway. A shudder wracks through me, but I keep going.');
      else await api.narrate('My foot scrambles for a hold and finds nothing. The man reacts just in time: his hands slam against my back and hold me to the ladder until my fingers find metal again.');
      api.set('ch01_ladderClean', !!(l1.success && l2.success));

      /* ============ 8. WALK HOME ============ */
      await api.fadeOut(400);
      await api.goRoom('alley_dawn', { at: [3, 3], facing: 'down' });
      await api.fadeIn(800);
      await api.narrate('He shoves me off the last rung and onto the surface. Bits of gravel burrow into my palms. I turn back to thank him.');
      await api.think('Empty alley. Closed-off hatch. He\'s nowhere to be found.');
      await api.narrate('The temperature shift is brutal. Too late, I remember my clothes, discarded in the doctor\'s office. The shirt was trash. But the jacket. Boy, do I miss that jacket.');
      slow(54);
      api.objective('Get home to Waverly', { target: 'dawn_out' });
      await api.waitForRoom('street_home');
      api.objective('Get home to Waverly (west, our building)', { target: 'toStairs' });
      // the news screen: she has to stop and hold onto it
      await api.waitForZone('newsZone');
      api.objective(null);
      api.lockPlayer();
      api.sound('heartbeat');
      await api.shake(500, 2);
      await api.narrate('Another wave of dizziness. With nothing else in sight, I grab the screen to keep myself steady and slowly lower myself to the ground.');
      await api.tv([
        { speaker: 'anchor', mood: 'happy', headline: 'THE SUCCESSION', text: 'Well, there you have it, ladies and gentlemen. We\'re down to only two candidates for Successor to the Great Leader.', tag: 'NEWS', ticker: 'THE GREAT LEADER THANKS YOU FOR YOUR OBEDIENCE • SUCCESSION COVERAGE ALL WEEK • ' },
        { speaker: 'humbert', mood: 'happy', headline: 'SENATOR JEREMY HUMBERT', text: '(Senator Humbert, a smiling older gentleman, kneels to pat a child\'s head.)', tag: 'NEWS' },
        { speaker: 'judge', mood: 'neutral', headline: 'JUDGE SILAS JOHNSON', text: '(Judge Johnson grips a gavel like it\'s his last lifeline. His cold eyes drill through the screen.)', tag: 'NEWS' },
        { speaker: 'anchor', mood: 'happy', headline: 'THE SUCCESSION', text: 'Both Senator Humbert and Judge Johnson are excellent choices. Tough on crime, highly reliable, and smiles to die for.', tag: 'NEWS' }
      ]);
      await api.think('Judge Johnson. I don\'t know much about him, but something in his face makes me uneasy. Maybe it\'s his eyes. Cold and unfeeling.');
      await api.think('How many procedures does it take before someone is no longer the person they were? When the parts are all new, does any of the original remain?');
      await api.narrate('The broadcast changes to another EEN recap, full of blood and screams. I can\'t watch. Slowly, I ease myself back up.');
      api.unlockPlayer();
      slow(40);
      var homeDef = W.room.def;
      homeDef.dark = 0.3; homeDef.tint = '#601018'; homeDef.tintAlpha = 0.16; homeDef.vignette = 0.85;
      api.objective('Get home to Waverly (west, our building)', { target: 'toStairs' });
      await api.waitForRoom('apt_home');
      api.objective(null);
      slow(72);
      api.hud(true);

      /* ============ 9. COLLAPSE ============ */
      api.lockPlayer();
      await api.narrate('The stairs slither in and out of view as I haul myself up, clutching the rail. A valve has opened inside me, and all the adrenaline that got me this far is gushing out.');
      await api.minigame('qte', { mode: 'mash', title: 'THREE FLIGHTS', prompt: 'Keep climbing.', target: 22, time: 7, decay: 5 });
      await api.say(ME(), 'Waverly!', { mood: 'tired' });
      await api.move('player', [2, 4]);
      api.face('player', 'left');
      api.sound('hit');
      await api.shake(400, 2);
      await api.narrate('Our lumpy couch has never looked so appealing. I collapse into it.');
      await api.move('home_waverly', [3, 4], { speed: 70 });
      api.face('home_waverly', 'player');
      await api.say('home_waverly', 'Momma! I was getting so worried and I tried to do the breathing techniques you taught me but it didn\'t help but I also didn\'t want to bother anyone so I -', { mood: 'cry' });
      await api.say(ME(), 'Waverly.', { mood: 'tired' });
      await api.narrate('She puts her hands on my leg. Those same hands grasped my neck when I nursed her as a baby.');
      await api.say('home_waverly', 'You\'re bleeding.', { mood: 'fear' });
      await api.say(ME(), 'What?', { mood: 'tired' });
      await api.say('home_waverly', 'You\'re bleeding a lot.', { mood: 'shock' });
      await api.say(ME(), 'Don\'t worry about it, sweetie. I just need some sleep.', { mood: 'tired' });
      api.sound('heartbeat');
      await api.fadeOut(1400);
      api.ambient(null);
      await api.slides([
        { style: 'black', text: 'The last thing I hear is my daughter\'s footsteps pounding against the floor as she bursts out the door.' },
        { style: 'black', text: '"Miss Hallaham! Miss Hallaham, I need help! Momma is hurt!"' },
        { style: 'black', text: 'Oh no.' },
        { style: 'black', text: 'The darkness defeats me and I black out.' }
      ]);
      api.unlockPlayer();
      api.completeChapter();
    }
  });
})();
