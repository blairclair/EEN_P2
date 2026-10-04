/* =========================================================================
 * shared/cast.js: canonical appearance of every recurring character
 * (CHAPTERS.md §4 "Cast sprite sheet"). Loaded before all chapters.
 *
 * G.shared.registerCast(id, spec) merges over the engine built-in spec, globally.
 * Chapters may still override per chapter with `cast: { luna: {...} }`.
 *
 * EXTRA SPEC FIELD `overlay` (added here, shared-only):
 *   overlay: ['mask_lion', 'cane', ...] draws signature details on top of the
 *   procedural sprite AND portrait (masks, hats, canes, books...). This file wraps
 *   G.Sprites.get / G.Sprites.portrait; specs without `overlay` are untouched.
 *   Available overlays (see OVER below):
 *     masks:  mask_elephant mask_lion mask_hippo mask_boar mask_dog mask_deer mask_turtle
 *             mask_frog mask_mouse mask_tiger mask_bear mask_hyena mask_vulture mask_cat mask_plain
 *     head:   hat_cowboy freckles stubble eyeliner lipstick cornrows clip_blue braid android
 *             blindfold
 *     body:   watch cane ruler book bear bunny gloves tattoo lily dove penguin tablet
 *             sneakers phone_string keys hanky remote scars knife_none
 *
 * Variant naming: <id>_<variant>, e.g. luna_ball, luna_child, trader_ball, judge_robe,
 * tb_elephant. `extends` is resolved ONE level only (engine rule), so every variant
 * here extends a base that has no `extends` itself.
 * ========================================================================= */
(function () {
  'use strict';
  var G = window.G, U = G.util, S = G.Sprites;
  // Variants are FLATTENED at registration (base fields copied, then the variant's), so a stale
  // engine field on an existing variant (e.g. luna_prison's old brown hair) can never leak through.
  var reg = function (id, spec) {
    if (spec.extends) {
      var base = G.registry.cast[spec.extends] || {}, flat = {};
      Object.keys(base).forEach(function (k) { if (k !== 'id' && k !== 'extends') flat[k] = base[k]; });
      Object.keys(spec).forEach(function (k) { if (k !== 'extends') flat[k] = spec[k]; });
      G.registerCast(id, flat);       // no ns, no extends -> replaces the entry entirely
    } else G.shared.registerCast(id, spec);
  };

  /* ------------------------------------------------------------------ palette */
  var GOLD = '#d4a83a', GOLD_D = '#9a7420', ROBE = '#141218', CRIMSON = '#6a1020';
  var DPE_GREY = '#8b8e96', DPE_GREY2 = '#5f626b';

  /* ================================================================ CONTESTANTS */
  // Luna: pale, freckled, frizzy red hair in a messy knot, short and thin. Default = House look:
  // grey DPE sweatsuit with a penguin patch + black chip-watch on the left wrist.
  reg('luna', { name: 'Luna', skin: '#f2cdb0', hair: '#c4462a', hairStyle: 'bun', eyes: '#3a5a3a',
    outfit: DPE_GREY, outfit2: DPE_GREY2, style: 'hoodie', height: 'short', build: 'slim',
    accessory: null, accent: '#e8323c', voice: 430, bg: '#1f2a33', overlay: ['freckles', 'watch', 'penguin'] });
  reg('luna_house', { extends: 'luna' });                                       // explicit alias
  reg('luna_show', { extends: 'luna', outfit: DPE_GREY, outfit2: DPE_GREY2, style: 'hoodie', accessory: null });
  reg('luna_home', { extends: 'luna', outfit: '#4a5a48', outfit2: '#2c3340', style: 'coat', overlay: ['freckles'] }); // ch01 street clothes
  reg('luna_gown', { extends: 'luna', outfit: '#b8c8d0', outfit2: '#b8c8d0', style: 'robe', overlay: ['freckles'] }); // ch01 clinic gown
  reg('luna_prison', { extends: 'luna', outfit: '#d9692b', outfit2: '#d9692b', style: 'jumpsuit', accessory: 'number', overlay: ['freckles'] });
  reg('luna_ball', { extends: 'luna', outfit: '#1f9a9a', outfit2: '#1f9a9a', style: 'dress', overlay: ['freckles', 'watch'] }); // ch03 teal ball dress
  reg('luna_night', { extends: 'luna', outfit: '#e8e2ea', outfit2: '#e8e2ea', style: 'robe', hairStyle: 'long', overlay: ['freckles', 'watch'] }); // DPE nightgown
  reg('luna_young', { extends: 'luna', name: 'Luna', outfit: '#6a5040', outfit2: '#3a3040', style: 'coat', hairStyle: 'long', overlay: ['freckles'] }); // 21, birth alley
  reg('luna_teen', { extends: 'luna', name: 'Luna', outfit: '#8a8a8a', outfit2: '#4a4a52', style: 'casual', hairStyle: 'long', height: 'short', overlay: ['freckles'] }); // 14, Columbus uniform (ch12)
  reg('luna_child', { extends: 'luna', name: 'Luna', outfit: '#e0b0c0', outfit2: '#e0b0c0', style: 'robe', hairStyle: 'pigtails', height: 'child', voice: 700, overlay: ['freckles'] }); // 8, pyjamas (ch03 memory)
  reg('luna_child_columbus', { extends: 'luna', name: 'Luna', outfit: '#8a8a8a', outfit2: '#5a5a62', style: 'casual', hairStyle: 'pigtails', height: 'child', voice: 700, overlay: ['freckles'] });

  // Waverly (11): light-brown skin, tight brown curls "like static", hand-me-down yellow sweater, too-short jeans.
  reg('waverly', { name: 'Waverly', skin: '#b98a62', hair: '#4a2c1a', hairStyle: 'afro', eyes: '#2a1a10',
    outfit: '#e8c43a', outfit2: '#4f6f9e', style: 'casual', height: 'child', build: 'slim', voice: 690, bg: '#2f2a1e', overlay: [] });
  reg('waverly_bear', { extends: 'waverly', overlay: ['bear'] });               // with Bartholomew
  reg('waverly_phone', { extends: 'waverly', overlay: ['phone_string'] });      // ch16 flip phone on a string
  reg('waverly_columbus', { extends: 'waverly', outfit: '#8a8a8a', outfit2: '#5a5a62' }); // Columbus grey
  reg('waverly_baby', { extends: 'waverly', name: 'Baby', hairStyle: 'bald', outfit: '#d8d0c0', outfit2: '#d8d0c0', style: 'robe', voice: 900 });

  // Delphin (34): Japanese-American, light skin, shoulder-length BRIGHT BLUE hair in a bun, stubble,
  // eyeliner, orange "LET ME OUT" tee over black jeans, tall and muscular, red forearm tattoo.
  reg('delphin', { name: 'Delphin', skin: '#ecc9a2', hair: '#2a9cf0', hairStyle: 'bun', eyes: '#2a1a10',
    outfit: '#e8752a', outfit2: '#1c1c24', style: 'casual', height: 'tall', build: 'broad', accessory: null,
    voice: 360, bg: '#14243a', overlay: ['stubble', 'eyeliner', 'tattoo'] });
  reg('delphin_ball', { extends: 'delphin', outfit: '#1c1c24', outfit2: '#1c1c24', style: 'suit', accessory: 'tie', accent: '#e8752a' });
  reg('delphin_teen', { extends: 'delphin', name: 'Delphin', hairStyle: 'short', hair: '#151018', outfit: '#8a8a8a', outfit2: '#4a4a52', build: 'slim', overlay: [] }); // 16, Columbus (before the blue)
  reg('delphin_child', { extends: 'delphin', name: 'Delphin', hairStyle: 'short', hair: '#151018', outfit: '#8a8a8a', outfit2: '#4a4a52', height: 'child', build: 'slim', voice: 640, overlay: [] });

  // Isaiah (18): dark brown skin, neat cornrows, oversized round glasses, navy sweater vest over white
  // shirt, red sneakers, skinny, always a hardback book.
  reg('isaiah', { name: 'Isaiah', skin: '#5e3a24', hair: '#120c08', hairStyle: 'buzz', eyes: '#1a0e08',
    outfit: '#25336a', outfit2: '#4a4a52', style: 'casual', height: 'normal', build: 'slim', accessory: 'glasses',
    voice: 400, bg: '#1a2238', overlay: ['cornrows', 'book', 'sneakers', 'collar_white'] });
  reg('isaiah_ball', { extends: 'isaiah', outfit: '#1c1c24', outfit2: '#1c1c24', style: 'suit', accessory: ['glasses', 'tie'], accent: '#c83040' });

  // Annette (76): pale, very wrinkled, gravity-defying white tufts, lavender cardigan, floral dress, tiny, thin black cane.
  reg('annette', { name: 'Annette', skin: '#f2d8c8', hair: '#f4f4f0', hairStyle: 'curly', eyes: '#4a5a7a',
    outfit: '#a890cc', outfit2: '#d88aa8', style: 'dress', height: 'short', build: 'slim', accessory: null,
    voice: 500, bg: '#2a2236', overlay: ['cane', 'wrinkles'] });
  reg('annette_ball', { extends: 'annette', outfit: '#7a5aa8', outfit2: '#7a5aa8' });

  // Kessie (54): dark brown skin, short grey-black natural hair, sky-blue house dress + apron, tall and broad,
  // yellow rubber gloves, scratch scars.
  reg('kessie', { name: 'Kessie', skin: '#6a4028', hair: '#4a4644', hairStyle: 'curly', eyes: '#1a0e08',
    outfit: '#7ab4e4', outfit2: '#7ab4e4', style: 'apron', height: 'tall', build: 'broad', accessory: null,
    voice: 520, bg: '#1b2638', overlay: ['gloves'] });
  reg('kessie_ball', { extends: 'kessie', outfit: '#3a6aa8', outfit2: '#3a6aa8', style: 'dress', overlay: [] });

  // Carol (28): fair, silky platinum-blonde waves, hot-pink dress, tall and slim, pink compact.
  reg('carol', { name: 'Carol', skin: '#f6dcc8', hair: '#f2e8bc', hairStyle: 'long', eyes: '#3a6a9a',
    outfit: '#e8409a', outfit2: '#e8409a', style: 'dress', height: 'tall', build: 'slim', accessory: 'earrings',
    voice: 560, bg: '#3a1830', overlay: ['lipstick_pink'] });
  reg('carol_ball', { extends: 'carol', outfit: '#ff5ab0', outfit2: '#ff5ab0' });

  // John (43): pale, unshaven, greasy thin brown hair, stained too-big beige sweater, short, underweight, stooped.
  reg('john', { name: 'John', skin: '#e6c4a6', hair: '#5a4630', hairStyle: 'slick', eyes: '#3a2a1a',
    outfit: '#b8a888', outfit2: '#4a4638', style: 'casual', height: 'short', build: 'slim', accessory: null,
    voice: 300, bg: '#24221c', overlay: ['stubble', 'stain'] });
  reg('john_ball', { extends: 'john', outfit: '#3a3a40', outfit2: '#3a3a40', style: 'suit', overlay: ['stubble'] });

  /* ================================================================ SHOW STAFF */
  // Trader (46): tanned, sandy-blond swept hair, cerulean eyes, white suit, pocket handkerchief, tall and lean,
  // DPE penguin tattoo inside the RIGHT forearm, a remote in his hand.
  reg('trader', { name: 'Trader', skin: '#d8a274', hair: '#e0c068', hairStyle: 'slick', eyes: '#2a9ad8',
    outfit: '#f0eee8', outfit2: '#e2e0da', style: 'suit', height: 'tall', build: 'slim', accessory: 'tie',
    accent: '#2a9ad8', voice: 330, bg: '#3a1030', overlay: ['hanky', 'remote'] });
  reg('trader_host', { extends: 'trader', accessory: ['tie', 'mic'] });
  reg('trader_ball', { extends: 'trader', overlay: ['hat_cowboy', 'hanky'] });
  reg('trader_racing', { extends: 'trader', style: 'jumpsuit', outfit: '#f4f4f0', outfit2: '#f4f4f0', accessory: null, accent: '#e8323c' });
  reg('trader_young', { extends: 'trader', name: 'Trader', outfit: '#e8e6e0', overlay: ['tattoo_penguin'] }); // ~22, Franchesca's show (ch14)
  reg('trader_child', { extends: 'trader', name: 'Trey', height: 'child', style: 'casual', outfit: '#6a8ab0', outfit2: '#3a3a4a', voice: 680, overlay: [] });

  // Judge Silas Johnson (66): tanned, perfectly coiffed dyed brown hair, charcoal suit with a single white lily, tall, gavel.
  reg('judge', { name: 'Judge Johnson', skin: '#cf9a6c', hair: '#5a3a22', hairStyle: 'slick', eyes: '#2a1a10',
    outfit: '#3a3a42', outfit2: '#2e2e36', style: 'suit', height: 'tall', build: 'normal', accessory: 'tie',
    accent: '#8a1020', voice: 230, bg: '#2a2016', overlay: ['lily'] });
  reg('judge_white', { extends: 'judge', outfit: '#f6f6f2', outfit2: '#ecece6', accent: '#c9a24a' });
  reg('judge_robe', { extends: 'judge', outfit: '#0e0e12', outfit2: '#0e0e12', style: 'robe', accessory: 'collar', overlay: ['lily'] });

  // Ginerva Malcont (47): olive skin, black hair in a painfully tight bun, high-collared plum dress, purple lipstick,
  // thin wooden ruler, glasses on a bead chain.
  reg('ginerva', { name: 'Ginerva', skin: '#c49a6a', hair: '#0e0c10', hairStyle: 'bun', eyes: '#1a0e08',
    outfit: '#5a1e52', outfit2: '#5a1e52', style: 'dress', height: 'normal', build: 'slim', accessory: ['glasses', 'collar'],
    voice: 470, bg: '#2a1028', overlay: ['ruler', 'lipstick'] });

  // Jemessa (DPE handler, 25-ish): pink bob, glitter blazer, tablet.
  reg('jemessa', { name: 'Jemessa', skin: '#f0c8a8', hair: '#ff7ac0', hairStyle: 'bob', eyes: '#2a1a10',
    outfit: '#c8b0e8', outfit2: '#2a2234', style: 'coat', build: 'slim', accessory: 'earrings',
    voice: 620, bg: '#3a1a3a', overlay: ['tablet', 'glitter'] });
  // Generic DPE producer / handler (headset, black)
  reg('handler', { name: 'Handler', skin: '#d6a98a', hair: '#1a1a1a', hairStyle: 'short', outfit: '#1c1c22', outfit2: '#1c1c22',
    style: 'uniform', accessory: ['headset', 'badge'], accent: '#e8323c', voice: 300, bg: '#1a1a1f', overlay: ['tablet'] });
  reg('waiter', { name: 'Waiter', skin: '#c08a68', hair: '#1a1410', hairStyle: 'short', outfit: '#f2f0ea', outfit2: '#1a1a20',
    style: 'suit', accessory: 'tie', accent: '#1a1a20', build: 'slim', voice: 340, bg: '#1a1a1f' });
  reg('cameraman', { name: 'Camera Op', skin: '#e0b090', hair: '#4a3a2a', hairStyle: 'short', outfit: '#26262c', outfit2: '#1a1a20',
    accessory: ['headset', 'cap'], accent: '#e8323c', voice: 320 });
  reg('medic', { name: 'Medic', skin: '#e8c0a0', hair: '#3a2a1a', hairStyle: 'bun', outfit: '#e8eef0', outfit2: '#c8d4da', style: 'coat', accessory: ['glasses'], voice: 450 });

  /* ================================================================ TRUE BELIEVERS */
  // Black hooded robes, ridged black gloves, polished pointed shoes, GOLD animal masks.
  // Face = gold mask (skin colour); the mask overlay adds the animal features.
  var TB = { name: 'True Believer', skin: GOLD, hair: ROBE, hairStyle: 'hood', eyes: '#000', outfit: ROBE, outfit2: ROBE,
    style: 'robe', height: 'tall', build: 'normal', accessory: null, voice: 200, bg: '#100c08', overlay: ['mask_plain', 'gloves_black'] };
  reg('tb', TB);
  reg('truebeliever', { extends: 'tb' });
  ['elephant', 'lion', 'hippo', 'boar', 'dog', 'deer', 'turtle', 'frog', 'mouse'].forEach(function (a) {
    var nm = a.charAt(0).toUpperCase() + a.slice(1);
    var sp = { extends: 'tb', name: nm, overlay: ['mask_' + a, 'gloves_black'] };
    if (a === 'elephant') { sp.height = 'normal'; sp.voice = 420; }
    if (a === 'lion') { sp.build = 'broad'; sp.name = 'Lion'; }
    if (a === 'mouse') { sp.build = 'slim'; }
    if (a === 'hippo' || a === 'boar') sp.build = 'broad';
    reg('tb_' + a, sp);
  });
  reg('elephant', { extends: 'tb', name: 'Elephant', height: 'normal', voice: 420, overlay: ['mask_elephant', 'gloves_black'] });
  reg('lion', { extends: 'tb', name: 'Lion', build: 'broad', overlay: ['mask_lion', 'gloves_black'] });
  reg('elephant_unmasked', { name: 'Elephant', skin: '#e2b896', hair: '#9a9a9a', hairStyle: 'ponytail', eyes: '#3a3a2a', outfit: ROBE, outfit2: ROBE,
    style: 'robe', height: 'normal', voice: 420, bg: '#100c08', overlay: ['braid'] });
  reg('deandre', { name: 'Deandre', skin: '#5a3420', hair: '#120c08', hairStyle: 'buzz', eyes: '#3aa860', outfit: ROBE, outfit2: ROBE,
    style: 'robe', height: 'tall', build: 'broad', voice: 210, bg: '#100c08' });
  // Council of Four: crimson robes, tiger / bear / hyena / vulture masks.
  ['tiger', 'bear', 'hyena', 'vulture'].forEach(function (a) {
    reg('council_' + a, { extends: 'tb', name: 'Council ' + a.charAt(0).toUpperCase() + a.slice(1), outfit: CRIMSON, outfit2: CRIMSON, hair: CRIMSON,
      overlay: ['mask_' + a, 'gloves_black'], bg: '#200408' });
  });

  /* ================================================================ ENFORCEMENT */
  // Androids ("enforcers"): silver humanoids with camera holes all round their heads, numbered, stunners.
  reg('android', { name: 'Enforcer', skin: '#b8bec8', hair: '#8a909a', hairStyle: 'bald', eyes: '#e8323c', outfit: '#7a808a', outfit2: '#5a606a',
    style: 'uniform', height: 'tall', build: 'normal', accessory: 'number', voice: 160, bg: '#101418', overlay: ['android'] });
  reg('enforcer', { extends: 'android' });
  reg('guard', { name: 'Guard', skin: '#c08a68', hair: '#222', hairStyle: 'buzz', outfit: '#2a3550', outfit2: '#1e2538', style: 'uniform',
    build: 'broad', accessory: ['cap', 'badge'], accent: '#c9b458', voice: 210, bg: '#161c2a' });
  reg('guard_android', { extends: 'android', name: 'Guard' });
  reg('security', { name: 'Security', skin: '#a8785a', hair: '#111', hairStyle: 'buzz', outfit: '#141418', outfit2: '#141418', style: 'suit',
    build: 'broad', height: 'tall', accessory: ['shades', 'headset'], voice: 200 });

  /* ================================================================ OFF-SHOW */
  reg('humbert', { name: 'Senator Humbert', skin: '#f0d0b8', hair: '#c8c8d0', hairStyle: 'slick', eyes: '#3a4a6a', outfit: '#1e2a4e', outfit2: '#1a2240',
    style: 'suit', accessory: 'tie', accent: '#8a1a2a', height: 'normal', voice: 280, bg: '#141c30', overlay: ['dove'] });
  reg('markus', { name: 'Markus', skin: '#4a2c1c', hair: '#0e0a08', hairStyle: 'buzz', eyes: '#1a0e08', outfit: '#8a8a8a', outfit2: '#6a6a70',
    style: 'casual', height: 'child', build: 'normal', voice: 560, bg: '#22221f', overlay: ['scab'] });
  reg('franchesca', { name: 'Franchesca', skin: '#f2cdb0', hair: '#c4462a', hairStyle: 'long', eyes: '#3a5a3a', outfit: '#5a8ac8', outfit2: '#5a8ac8',
    style: 'uniform', height: 'normal', build: 'slim', voice: 470, bg: '#1a2a3a', overlay: ['freckles'] });
  reg('franchesca_show', { extends: 'franchesca', outfit: DPE_GREY, outfit2: DPE_GREY, style: 'jumpsuit', accessory: 'number' });
  reg('salina_child', { name: 'Salina', skin: '#ecd0b0', hair: '#0e0c10', hairStyle: 'bob', eyes: '#1a0e08', outfit: '#f0d030', outfit2: '#4a4a52',
    style: 'coat', height: 'child', build: 'slim', voice: 720, bg: '#2a2a1a', overlay: ['clip_blue', 'bunny'] });
  reg('salina', { name: 'Salina', skin: '#ecd0b0', hair: '#0e0c10', hairStyle: 'bob', eyes: '#1a0e08',
    outfit: '#f0d030', outfit2: '#4a4a52', style: 'coat', height: 'child', build: 'slim', voice: 720, bg: '#2a2a1a', overlay: ['clip_blue', 'bunny'] });
  reg('norman', { name: 'Norman', skin: '#d8a888', hair: '#5a3a22', hairStyle: 'short', eyes: '#2a1a10', outfit: '#3a6a3a', outfit2: '#3a3428',
    style: 'coat', height: 'tall', build: 'broad', accessory: 'beard', voice: 220, bg: '#1a2a1a', overlay: ['keys'] });
  reg('hallaham', { name: 'Miss Hallaham', skin: '#e8c8b0', hair: '#c8c0b8', hairStyle: 'bun', outfit: '#7a5a6a', outfit2: '#4a3a40', style: 'coat', height: 'short', voice: 520 });
  reg('fienle', { name: 'Dr. Fienle', skin: '#ecc8b0', hair: '#7a6a5a', hairStyle: 'bald', outfit: '#f0f0f0', outfit2: '#3a3a40', style: 'coat', accessory: ['glasses', 'beard'], voice: 260 });
  reg('dr_jan', { name: 'Dr. Jan', skin: '#d8b090', hair: '#2a2a2a', hairStyle: 'short', outfit: '#f0f0f0', outfit2: '#3a3a40', style: 'coat', accessory: 'glasses', voice: 300 });
  reg('cat_guide', { name: 'Cat Mask', skin: '#e8e4dc', hair: '#1a1a1a', hairStyle: 'hood', outfit: '#2a2a30', outfit2: '#1a1a20', style: 'coat', eyes: '#000', voice: 330, overlay: ['mask_cat'] });
  reg('darla', { name: 'Darla', skin: '#e8c0a0', hair: '#e8a040', hairStyle: 'curly', outfit: '#3a1a4a', outfit2: '#1a1a20', style: 'casual', accessory: ['headset', 'earrings'], voice: 560 });
  reg('caseworker', { name: 'Caseworker', skin: '#f0d0b8', hair: '#6a4a2a', hairStyle: 'bun', outfit: '#6a7a6a', outfit2: '#3a3a3a', style: 'coat', accessory: ['glasses', 'badge'], voice: 500 });
  reg('care_android', { extends: 'android', name: 'Care Unit', outfit: '#c8d0d8', outfit2: '#9aa0aa', accessory: null });

  /* ================================================================ EXTRAS */
  // Rich ball guests / paying audience / bettors, kids, vendors. Use the registered ids directly, or
  // G.shared.extra(kind, seed) for a deterministic variety (inline spec).
  reg('guest', { name: 'Guest', skin: '#ecc8a8', hair: '#3a2a1a', hairStyle: 'slick', outfit: '#1a1a24', outfit2: '#1a1a24', style: 'suit', accessory: 'tie', accent: '#c9a24a', voice: 360 });
  reg('guest_lady', { name: 'Guest', skin: '#f0d0b8', hair: '#d8b860', hairStyle: 'bun', outfit: '#8a1a4a', outfit2: '#8a1a4a', style: 'dress', accessory: 'earrings', voice: 560 });
  reg('kid_fancy', { name: 'Kid', skin: '#f0d0b8', hair: '#6a4426', hairStyle: 'short', outfit: '#3a2a6a', outfit2: '#1a1a24', style: 'suit', height: 'child', voice: 720, overlay: ['hat_top'] });
  reg('audience', { name: 'Audience', skin: '#d8a888', hair: '#3a2a1a', hairStyle: 'short', outfit: '#4a3a5a', outfit2: '#2a2430', style: 'coat', voice: 380 });
  reg('vendor', { name: 'Vendor', skin: '#c89070', hair: '#2a1a10', hairStyle: 'short', outfit: '#c83a3a', outfit2: '#3a3a40', style: 'apron', accessory: 'cap', accent: '#e8c15a', voice: 360 });
  reg('kid', { name: 'Kid', skin: '#c68863', hair: '#1a1412', hairStyle: 'curly', outfit: '#8a8a8a', outfit2: '#5a5a62', height: 'child', build: 'slim', voice: 720 });
  reg('band', { name: 'Musician', skin: '#a46a45', hair: '#1a1412', hairStyle: 'slick', outfit: '#e8c15a', outfit2: '#1a1a20', style: 'suit', accessory: 'tie', accent: '#1a1a20', voice: 300 });

  var SKINS = ['#f1c9a5', '#e0ac85', '#c68863', '#a46a45', '#7d4b2e', '#5a3420', '#f0d8c0'];
  var HAIRS = ['#1a1412', '#3b2a20', '#6b4426', '#a8763e', '#d8c27a', '#8c8c8c', '#5a1f1f', '#e8e0d0'];
  var KINDS = {
    guest: { outfits: ['#1a1a24', '#2a1a3a', '#3a0e18', '#0e2a2a', '#e8e4dc', '#8a1a4a', '#c9a24a', '#1a3a5a'], styles: ['suit', 'dress', 'suit', 'dress', 'coat'], acc: ['tie', 'earrings', 'shades', null, null], over: ['hat_top', null, null, null, 'glitter'] },
    audience: { outfits: ['#4a3a5a', '#3a4a5a', '#5a3a3a', '#3a5a4a', '#6a5a3a', '#2a2a34'], styles: ['coat', 'casual', 'hoodie', 'casual'], acc: [null, 'glasses', 'cap', null], over: [null] },
    kid: { outfits: ['#8a8a8a', '#7a7a80'], styles: ['casual'], acc: [null], over: [null], height: 'child' },
    citizen: { outfits: ['#4a4a52', '#5a5248', '#3a4048', '#524848'], styles: ['coat', 'hoodie', 'casual'], acc: [null, null, 'scarf', 'cap'], over: [null] }
  };
  /** G.shared.extra('guest'|'audience'|'kid'|'citizen', seed, overrides) → inline spec (deterministic). */
  G.shared.extra = function (kind, seed, overrides) {
    var k = KINDS[kind] || KINDS.audience, r = U.rng(kind + ':' + seed);
    function p(a) { return a[Math.floor(r() * a.length)]; }
    var st = p(k.styles), out = p(k.outfits);
    var s = { name: kind === 'guest' ? 'Guest' : kind === 'kid' ? 'Kid' : kind === 'citizen' ? 'Citizen' : 'Audience',
      skin: p(SKINS), hair: p(HAIRS), hairStyle: p(st === 'dress' ? ['long', 'bun', 'bob', 'curly'] : ['short', 'slick', 'buzz', 'bald', 'curly', 'afro', 'bob']),
      outfit: out, outfit2: st === 'dress' ? out : p(['#1a1a20', '#2e3440', '#3a3328']), style: st, accent: p(['#c9a24a', '#e8323c', '#e8e4dc']),
      build: p(['slim', 'normal', 'broad']), height: k.height || p(['short', 'normal', 'normal', 'tall']), voice: 280 + Math.floor(r() * 360) };
    if (k.height === 'child') s.voice = 700;
    var a = p(k.acc); if (a) s.accessory = a;
    var o = p(k.over); if (o) s.overlay = [o];
    if (overrides) for (var key in overrides) s[key] = overrides[key];
    return s;
  };

  /* =================================================================== OVERLAYS
   * Geometry mirrors engine/sprites.js geom() (sprite 16x28, feet on row 27).
   */
  function geom(sp) {
    var h = sp.height;
    var legH = h === 'child' ? 4 : h === 'short' ? 5 : h === 'tall' ? 7 : 6;
    var torsoH = h === 'child' ? 5 : h === 'tall' ? 8 : 7;
    var headH = h === 'child' ? 7 : 8;
    var tw = sp.build === 'broad' ? 10 : sp.build === 'slim' ? 6 : 8;
    if (h === 'child') tw = Math.min(tw, 6);
    var feet = S.H - 1, legTop = feet - legH + 1, torsoTop = legTop - torsoH, headTop = torsoTop - headH + 1;
    return { legH: legH, torsoH: torsoH, headH: headH, tw: tw, legTop: legTop, torsoTop: torsoTop, headTop: headTop, feet: feet };
  }

  var MASK = {
    // features drawn on the face (sprite: head box hx..hx+7, hy..hy+hh-1; eyeY)
    plain: { c: GOLD },
    elephant: { c: '#b8b0a0', ears: '#9a9284', trunk: true },
    lion: { c: GOLD, mane: '#c86a1a' },
    hippo: { c: '#9a8ca0', snout: '#b8aabc', earsSmall: true },
    boar: { c: '#8a5a3a', snout: '#c08a6a', tusks: true },
    dog: { c: GOLD, ears: GOLD_D, floppy: true },
    deer: { c: '#c89a5a', antlers: '#e8d8b0' },
    turtle: { c: '#6a8a4a', shell: '#4a6a32' },
    frog: { c: '#5aa04a', bulge: true },
    mouse: { c: '#a8a8b0', round: '#c8a0a8' },
    tiger: { c: '#e88a2a', stripes: '#1a1010' },
    bear: { c: '#6a4a2a', round: '#5a3a1a' },
    hyena: { c: '#b89a6a', spots: '#4a3a2a' },
    vulture: { c: '#3a3036', beak: '#e8d8a0' },
    cat: { c: '#e8e4dc', catEars: '#e8e4dc' }
  };

  function P(g, x, y, w, h, c) { g.fillStyle = c; g.fillRect(x, y, w, h); }

  // ---- sprite overlays ----
  function spriteOver(g, sp, dir, frame, list) {
    var m = geom(sp), cx = 8, side = dir === 'left' || dir === 'right';
    var hx = cx - 4, hy = m.headTop, hh = m.headH, eyeY = hy + Math.floor(hh / 2);
    var tw = side ? Math.max(5, m.tw - 2) : m.tw, tx = cx - Math.floor(tw / 2);
    var armY = m.torsoTop + 1, armH = m.torsoH - 2;
    var step = frame === 1 ? 1 : frame === 2 ? -1 : 0;
    // hand positions
    var lh = { x: tx - 1, y: armY + armH + (frame === 1 ? 1 : 0) }, rh = { x: tx + tw, y: armY + armH + (frame === 2 ? 1 : 0) };
    var sh = { x: cx + step, y: armY + armH };
    var front = dir === 'down', back = dir === 'up';
    list.forEach(function (o) {
      if (o.indexOf('mask_') === 0) {
        var mk = MASK[o.slice(5)] || MASK.plain;
        if (!back) {
          // mask face plate
          if (front) { P(g, hx + 1, hy + 1, 6, hh - 2, mk.c); P(g, hx + 2, eyeY, 1, 1, '#000'); P(g, hx + 5, eyeY, 1, 1, '#000'); P(g, hx + 6, hy + 1, 1, hh - 2, U.shade(mk.c, -0.25)); }
          else { P(g, hx + 3, hy + 1, 5, hh - 2, mk.c); P(g, hx + 5, eyeY, 1, 1, '#000'); P(g, hx + 8, eyeY + 1, 1, 2, mk.c); }
          if (mk.trunk) { if (front) P(g, hx + 3, eyeY + 1, 2, hh - 2, U.shade(mk.c, -0.12)); else P(g, hx + 8, eyeY + 1, 1, 5, U.shade(mk.c, -0.12)); }
          if (mk.snout) { if (front) P(g, hx + 2, eyeY + 2, 4, 2, mk.snout); else P(g, hx + 7, eyeY + 1, 2, 2, mk.snout); }
          if (mk.tusks) { if (front) { P(g, hx + 1, eyeY + 3, 1, 1, '#fff'); P(g, hx + 6, eyeY + 3, 1, 1, '#fff'); } else P(g, hx + 8, eyeY + 3, 1, 1, '#fff'); }
          if (mk.beak) { if (front) P(g, hx + 3, eyeY + 1, 2, 3, mk.beak); else P(g, hx + 8, eyeY + 1, 2, 2, mk.beak); }
          if (mk.stripes) { P(g, hx + 2, hy + 1, 1, 2, mk.stripes); P(g, hx + 5, hy + 1, 1, 2, mk.stripes); }
          if (mk.spots) { P(g, hx + 2, hy + 2, 1, 1, mk.spots); P(g, hx + 5, eyeY + 2, 1, 1, mk.spots); }
          if (mk.shell) P(g, hx + 2, hy + 1, 4, 2, mk.shell);
        }
        // features visible from every side
        if (mk.ears) { if (!side) { P(g, hx - 2, hy + 2, 2, 5, mk.ears); P(g, hx + 8, hy + 2, 2, 5, mk.ears); } else P(g, hx + 1, hy + 2, 3, 5, mk.ears); }
        if (mk.floppy) { P(g, hx - 1, hy + 2, 1, 5, mk.ears); P(g, hx + 8, hy + 2, 1, 5, mk.ears); }
        if (mk.mane) { P(g, hx - 1, hy - 2, 10, 2, mk.mane); P(g, hx - 2, hy, 2, hh, mk.mane); P(g, hx + 8, hy, 2, hh, mk.mane); if (!back) P(g, hx, hy + hh - 1, 8, 1, mk.mane); else P(g, hx, hy, 8, hh, mk.mane); }
        if (mk.antlers) { P(g, hx + 1, hy - 4, 1, 4, mk.antlers); P(g, hx, hy - 4, 1, 1, mk.antlers); P(g, hx + 6, hy - 4, 1, 4, mk.antlers); P(g, hx + 7, hy - 4, 1, 1, mk.antlers); P(g, hx + 2, hy - 3, 1, 1, mk.antlers); P(g, hx + 5, hy - 3, 1, 1, mk.antlers); }
        if (mk.earsSmall) { P(g, hx + 1, hy - 1, 2, 1, mk.c); P(g, hx + 5, hy - 1, 2, 1, mk.c); }
        if (mk.round) { P(g, hx - 1, hy - 2, 3, 3, mk.round); P(g, hx + 6, hy - 2, 3, 3, mk.round); }
        if (mk.bulge) { if (!back) { P(g, hx + 1, hy - 1, 2, 2, mk.c); P(g, hx + 5, hy - 1, 2, 2, mk.c); if (front) { P(g, hx + 2, hy - 1, 1, 1, '#000'); P(g, hx + 5, hy - 1, 1, 1, '#000'); } } }
        if (mk.catEars) { P(g, hx, hy - 2, 2, 2, mk.catEars); P(g, hx + 6, hy - 2, 2, 2, mk.catEars); }
        return;
      }
      switch (o) {
        case 'freckles': break; // portrait only
        case 'stubble': if (front) P(g, hx + 1, hy + hh - 2, 6, 1, U.rgba('#3a2a1a', 0.45)); break;
        case 'eyeliner': if (front) { P(g, hx + 2, eyeY - 1, 1, 1, '#000'); P(g, hx + 5, eyeY - 1, 1, 1, '#000'); } break;
        case 'cornrows': if (!side || true) { for (var i = 0; i < 4; i++) P(g, hx + 1 + i * 2, hy, 1, back ? hh - 2 : 2, '#2a2018'); } break;
        case 'clip_blue': P(g, side ? hx + 1 : hx + 1, hy, 2, 1, '#3a8af0'); break;
        case 'braid': if (back) P(g, hx + 3, hy + hh - 2, 2, 7, sp.hair); else if (side) P(g, dir === 'right' ? hx - 1 : hx + 8, hy + 3, 1, 7, sp.hair); break;
        case 'android': if (!back) { P(g, hx + 1, hy + 1, 1, 1, '#2a2a30'); P(g, hx + 6, hy + 1, 1, 1, '#2a2a30'); P(g, hx + 3, hy, 2, 1, '#2a2a30'); } else { P(g, hx + 2, hy + 2, 1, 1, '#2a2a30'); P(g, hx + 5, hy + 2, 1, 1, '#2a2a30'); P(g, hx + 3, hy + 5, 1, 1, '#2a2a30'); } if (front) { P(g, hx + 2, eyeY, 1, 1, '#ff3040'); P(g, hx + 5, eyeY, 1, 1, '#ff3040'); } break;
        case 'blindfold': P(g, hx, eyeY - 1, 8, 2, '#1a1a1a'); break;
        case 'hat_cowboy': P(g, hx - 2, hy + 1, 12, 1, '#f2eee4'); P(g, hx, hy - 3, 8, 4, '#f2eee4'); P(g, hx, hy, 8, 1, '#8a6a3a'); P(g, hx + 3, hy - 3, 2, 1, '#d8d2c4'); break;
        case 'hat_top': P(g, hx - 1, hy + 1, 10, 1, '#111'); P(g, hx + 1, hy - 4, 6, 5, '#111'); P(g, hx + 1, hy, 6, 1, '#8a1a2a'); break;
        case 'watch': if (front) P(g, lh.x, lh.y - 1, 1, 1, '#0a0a0a'); else if (dir === 'left') P(g, sh.x, sh.y - 1, 2, 1, '#0a0a0a'); break;
        case 'penguin': if (front) { P(g, tx + 1, m.torsoTop + 2, 2, 2, '#111'); P(g, tx + 1, m.torsoTop + 3, 1, 1, '#eee'); } break;
        case 'gloves': if (!side) { P(g, lh.x, lh.y - 1, 1, 2, '#f0d020'); P(g, rh.x, rh.y - 1, 1, 2, '#f0d020'); } else P(g, sh.x, sh.y - 1, 2, 2, '#f0d020'); break;
        case 'gloves_black': if (!side) { P(g, lh.x, lh.y, 1, 1, '#000'); P(g, rh.x, rh.y, 1, 1, '#000'); } else P(g, sh.x, sh.y, 2, 1, '#000'); P(g, cx - 2, m.feet, 2, 1, '#2a2a2a'); P(g, cx + 1, m.feet, 2, 1, '#2a2a2a'); break;
        case 'cane': if (!back) { var cxp = side ? (dir === 'right' ? sh.x + 2 : sh.x - 1) : rh.x + 1; P(g, cxp, rh.y - 2, 1, m.feet - rh.y + 3, '#111'); P(g, cxp - 1, rh.y - 2, 2, 1, '#111'); } break;
        case 'ruler': if (front) P(g, rh.x + 1, rh.y - 5, 1, 7, '#c89a5a'); else if (side) P(g, sh.x + 2, sh.y - 4, 1, 6, '#c89a5a'); break;
        case 'book': if (front) { P(g, lh.x - 1, lh.y - 2, 2, 4, '#8a2a2a'); P(g, lh.x - 1, lh.y - 2, 2, 1, '#c8a050'); } else if (side) P(g, sh.x, sh.y - 2, 3, 3, '#8a2a2a'); break;
        case 'bear': if (!back) { P(g, cx - 2, m.torsoTop + 2, 4, 4, '#8a5a32'); P(g, cx - 2, m.torsoTop + 1, 1, 1, '#8a5a32'); P(g, cx + 1, m.torsoTop + 1, 1, 1, '#8a5a32'); if (front) P(g, cx - 1, m.torsoTop + 3, 2, 1, '#3a2010'); } break;
        case 'bunny': if (!back) { P(g, rh.x - 1, rh.y - 3, 3, 4, '#9a9aa0'); P(g, rh.x - 1, rh.y - 5, 1, 2, '#9a9aa0'); P(g, rh.x + 1, rh.y - 5, 1, 2, '#9a9aa0'); } break;
        case 'tattoo': if (front) P(g, rh.x, rh.y - 2, 1, 2, '#c82020'); else if (dir === 'left') P(g, sh.x, sh.y - 2, 2, 1, '#c82020'); break;
        case 'tattoo_penguin': if (front) P(g, rh.x, rh.y - 2, 1, 1, '#1a2a4a'); break;
        case 'lily': if (front) { P(g, tx + 1, m.torsoTop + 1, 2, 2, '#ffffff'); P(g, tx + 1, m.torsoTop + 3, 1, 1, '#4a8a3a'); } else if (dir === 'left') P(g, cx - 1, m.torsoTop + 1, 2, 2, '#ffffff'); break;
        case 'hanky': if (front) P(g, tx + 1, m.torsoTop + 1, 2, 1, '#2a9ad8'); break;
        case 'dove': if (front) P(g, tx + 1, m.torsoTop + 1, 1, 1, '#ffffff'); break;
        case 'remote': if (front) P(g, rh.x, rh.y, 1, 2, '#1a1a1a'); else if (side) P(g, sh.x + 1, sh.y, 1, 2, '#1a1a1a'); break;
        case 'tablet': if (front) { P(g, lh.x - 2, lh.y - 3, 3, 4, '#1a1a24'); P(g, lh.x - 1, lh.y - 2, 1, 2, '#3fc1c9'); } else if (side) P(g, sh.x + 1, sh.y - 3, 1, 4, '#1a1a24'); break;
        case 'glitter': if (front) { P(g, tx + 1, m.torsoTop + 2, 1, 1, '#fff6c0'); P(g, tx + tw - 2, m.torsoTop + 4, 1, 1, '#fff6c0'); } break;
        case 'sneakers': if (!side) { P(g, cx - 3, m.feet - (frame === 1 ? 1 : 0), 2, 1, '#e02a2a'); P(g, cx + 1, m.feet - (frame === 2 ? 1 : 0), 2, 1, '#e02a2a'); } else P(g, cx - 1, m.feet, 4, 1, '#e02a2a'); break;
        case 'collar_white': if (front) { P(g, cx - 2, m.torsoTop, 1, 1, '#f2f2f2'); P(g, cx + 1, m.torsoTop, 1, 1, '#f2f2f2'); } break;
        case 'phone_string': if (front) { P(g, cx - 1, m.torsoTop, 1, 3, '#ddd'); P(g, cx - 1, m.torsoTop + 3, 2, 2, '#2a2a30'); } break;
        case 'keys': if (front) P(g, tx + tw - 1, m.legTop, 2, 2, '#c9b458'); break;
        case 'stain': if (front) { P(g, tx + 2, m.torsoTop + 3, 2, 1, '#8a7a58'); P(g, tx + tw - 3, m.torsoTop + 5, 1, 1, '#8a7a58'); } break;
        case 'scab': if (front) P(g, hx + 4, hy + hh - 1, 1, 1, '#8a2a20'); break;
        case 'wrinkles': break;
        case 'lipstick': if (front) P(g, hx + 3, hy + hh - 2, 2, 1, '#7a2a8a'); break;
        case 'lipstick_pink': if (front) P(g, hx + 3, hy + hh - 2, 2, 1, '#e8407a'); break;
      }
    });
  }

  // ---- portrait overlays (40x40; head hx..hx+hw, eyes at ey, lx/rx) ----
  function portraitOver(g, sp, list) {
    var child = sp.height === 'child';
    var hx = child ? 12 : 11, hw = child ? 16 : 18, hy = child ? 9 : 7, hh = child ? 21 : 23;
    var cx = hx + hw / 2, ey = hy + 11, lx = Math.round(cx - 6), rx = Math.round(cx + 2), my = hy + hh - 6;
    list.forEach(function (o) {
      if (o.indexOf('mask_') === 0) {
        var mk = MASK[o.slice(5)] || MASK.plain, c = mk.c, cD = U.shade(c, -0.3), cL = U.shade(c, 0.25);
        // full mask plate over the face
        P(g, hx + 1, hy + 1, hw - 2, hh - 1, c); P(g, hx, hy + 3, hw, hh - 7, c);
        P(g, hx + hw - 3, hy + 2, 2, hh - 4, cD); P(g, hx + 2, hy + 2, 3, 4, cL);
        // eye holes
        P(g, lx, ey - 1, 4, 3, '#000'); P(g, rx, ey - 1, 4, 3, '#000');
        P(g, lx + 1, ey, 1, 1, '#4a3a2a'); P(g, rx + 1, ey, 1, 1, '#4a3a2a');
        P(g, Math.round(cx) - 2, my, 4, 1, cD);
        if (mk.trunk) { P(g, Math.round(cx) - 2, ey + 3, 4, 14, U.shade(c, -0.1)); P(g, Math.round(cx) - 2, ey + 6, 4, 1, cD); P(g, Math.round(cx) - 2, ey + 10, 4, 1, cD); P(g, Math.round(cx) - 1, ey + 16, 3, 2, cD); }
        if (mk.ears) { P(g, hx - 7, hy + 2, 8, 16, mk.ears); P(g, hx + hw - 1, hy + 2, 8, 16, mk.ears); P(g, hx - 5, hy + 5, 4, 9, U.shade(mk.ears, -0.15)); P(g, hx + hw + 1, hy + 5, 4, 9, U.shade(mk.ears, -0.15)); }
        if (mk.floppy) { P(g, hx - 3, hy + 2, 4, 14, mk.ears); P(g, hx + hw - 1, hy + 2, 4, 14, mk.ears); P(g, Math.round(cx) - 2, ey + 3, 4, 3, '#1a1010'); }
        if (mk.mane) { for (var a = 0; a < 26; a++) { var ang = a / 26 * Math.PI * 2, rr = 13 + (a % 2) * 2; P(g, Math.round(cx + Math.cos(ang) * rr) - 2, Math.round(hy + hh / 2 + Math.sin(ang) * rr) - 2, 4, 4, a % 2 ? mk.mane : U.shade(mk.mane, -0.2)); } P(g, Math.round(cx) - 2, ey + 4, 4, 2, '#3a1a0a'); }
        if (mk.snout) { P(g, Math.round(cx) - 5, ey + 4, 10, 6, mk.snout); P(g, Math.round(cx) - 3, ey + 6, 2, 2, cD); P(g, Math.round(cx) + 1, ey + 6, 2, 2, cD); }
        if (mk.tusks) { P(g, Math.round(cx) - 7, ey + 7, 2, 4, '#f2eee4'); P(g, Math.round(cx) + 5, ey + 7, 2, 4, '#f2eee4'); }
        if (mk.earsSmall) { P(g, hx + 1, hy - 2, 4, 3, c); P(g, hx + hw - 5, hy - 2, 4, 3, c); }
        if (mk.antlers) { var ac = mk.antlers; P(g, hx + 2, hy - 9, 2, 10, ac); P(g, hx - 2, hy - 9, 4, 2, ac); P(g, hx + 3, hy - 5, 4, 2, ac); P(g, hx + hw - 4, hy - 9, 2, 10, ac); P(g, hx + hw - 2, hy - 9, 4, 2, ac); P(g, hx + hw - 7, hy - 5, 4, 2, ac); }
        if (mk.shell) { P(g, hx + 2, hy, hw - 4, 6, mk.shell); P(g, hx + 6, hy + 1, 2, 4, cD); P(g, hx + 11, hy + 1, 2, 4, cD); }
        if (mk.bulge) { P(g, lx - 1, ey - 5, 6, 5, c); P(g, rx - 1, ey - 5, 6, 5, c); P(g, lx, ey - 4, 4, 4, '#000'); P(g, rx, ey - 4, 4, 4, '#000'); P(g, lx + 1, ey - 4, 1, 1, '#fff'); P(g, rx + 1, ey - 4, 1, 1, '#fff'); P(g, hx + 3, my, hw - 6, 1, cD); }
        if (mk.round) { P(g, hx - 4, hy - 5, 9, 9, mk.round); P(g, hx + hw - 5, hy - 5, 9, 9, mk.round); P(g, hx - 2, hy - 3, 5, 5, U.shade(mk.round, 0.2)); P(g, hx + hw - 3, hy - 3, 5, 5, U.shade(mk.round, 0.2)); }
        if (mk.stripes) { for (var s2 = 0; s2 < 4; s2++) { P(g, hx + 1, hy + 4 + s2 * 4, 4, 1, mk.stripes); P(g, hx + hw - 5, hy + 4 + s2 * 4, 4, 1, mk.stripes); } P(g, Math.round(cx) - 1, hy + 1, 2, 5, mk.stripes); }
        if (mk.spots) { [[3, 4], [13, 6], [5, 16], [14, 15], [9, 2]].forEach(function (p) { P(g, hx + p[0], hy + p[1], 2, 2, mk.spots); }); }
        if (mk.beak) { P(g, Math.round(cx) - 2, ey + 2, 5, 8, mk.beak); P(g, Math.round(cx) - 1, ey + 10, 4, 2, U.shade(mk.beak, -0.3)); }
        if (mk.catEars) { P(g, hx, hy - 5, 5, 6, c); P(g, hx + hw - 5, hy - 5, 5, 6, c); P(g, hx + 1, hy - 3, 3, 3, '#e8a0a8'); P(g, hx + hw - 4, hy - 3, 3, 3, '#e8a0a8'); P(g, lx, ey - 1, 4, 3, '#000'); }
        return;
      }
      switch (o) {
        case 'freckles': [[3, 14], [5, 15], [4, 16], [7, 15], [12, 14], [14, 15], [13, 16], [10, 15]].forEach(function (p) { P(g, hx + p[0], hy + p[1], 1, 1, U.shade(sp.skin, -0.28)); }); break;
        case 'stubble': for (var sx = hx + 2; sx < hx + hw - 2; sx += 2) for (var sy = my - 2; sy < hy + hh; sy += 2) P(g, sx + (sy % 4 ? 1 : 0), sy, 1, 1, U.rgba('#3a2a1a', 0.55)); break;
        case 'eyeliner': P(g, lx - 1, ey - 1, 5, 1, '#000'); P(g, rx, ey - 1, 5, 1, '#000'); P(g, lx - 1, ey + 2, 1, 1, '#000'); P(g, rx + 4, ey + 2, 1, 1, '#000'); break;
        case 'cornrows': for (var cr = 0; cr < 5; cr++) P(g, hx + 1 + cr * 4, hy - 2, 1, 5, '#2e2418'); break;
        case 'clip_blue': P(g, hx + 1, hy - 1, 5, 2, '#3a8af0'); break;
        case 'braid': P(g, hx + hw, hy + 8, 3, 16, sp.hair); P(g, hx + hw, hy + 12, 3, 1, U.shade(sp.hair, -0.3)); P(g, hx + hw, hy + 17, 3, 1, U.shade(sp.hair, -0.3)); break;
        case 'android': P(g, hx + 1, hy + 1, hw - 2, 1, '#8a909a'); [[3, 3], [9, 2], [15, 3], [2, 8], [16, 8], [5, 19], [13, 19]].forEach(function (p) { P(g, hx + p[0], hy + p[1], 2, 2, '#2a2a30'); }); P(g, lx + 1, ey, 2, 1, '#ff3040'); P(g, rx + 1, ey, 2, 1, '#ff3040'); break;
        case 'blindfold': P(g, hx - 1, ey - 2, hw + 2, 5, '#1a1a1a'); break;
        case 'hat_cowboy': P(g, hx - 6, hy - 1, hw + 12, 3, '#f2eee4'); P(g, hx - 1, hy - 9, hw + 2, 9, '#f2eee4'); P(g, hx - 1, hy - 3, hw + 2, 2, '#8a6a3a'); P(g, Math.round(cx) - 2, hy - 9, 4, 2, '#d8d2c4'); P(g, hx + hw - 2, hy - 8, 2, 6, '#d8d2c4'); break;
        case 'hat_top': P(g, hx - 4, hy - 1, hw + 8, 2, '#111'); P(g, hx + 1, hy - 12, hw - 2, 12, '#111'); P(g, hx + 1, hy - 4, hw - 2, 2, '#8a1a2a'); break;
        case 'penguin': P(g, 9, 34, 4, 5, '#111'); P(g, 10, 36, 2, 3, '#eee'); P(g, 11, 35, 1, 1, '#e8a020'); break;
        case 'lily': P(g, 9, 34, 4, 3, '#fff'); P(g, 10, 33, 2, 1, '#fff'); P(g, 10, 37, 1, 2, '#4a8a3a'); break;
        case 'dove': P(g, 10, 35, 3, 2, '#fff'); P(g, 9, 34, 1, 1, '#fff'); break;
        case 'hanky': P(g, 9, 35, 4, 2, '#2a9ad8'); P(g, 10, 34, 1, 1, '#2a9ad8'); break;
        case 'lipstick': P(g, Math.round(cx) - 2, my, 4, 2, '#7a2a8a'); break;
        case 'lipstick_pink': P(g, Math.round(cx) - 2, my, 4, 2, '#e8407a'); break;
        case 'wrinkles': P(g, lx - 1, ey + 3, 3, 1, U.shade(sp.skin, -0.2)); P(g, rx + 2, ey + 3, 3, 1, U.shade(sp.skin, -0.2)); P(g, hx + 4, hy + 4, 8, 1, U.shade(sp.skin, -0.15)); P(g, Math.round(cx) - 5, my - 1, 1, 3, U.shade(sp.skin, -0.2)); P(g, Math.round(cx) + 4, my - 1, 1, 3, U.shade(sp.skin, -0.2)); break;
        case 'scab': P(g, Math.round(cx) - 1, hy + hh - 2, 3, 2, '#8a2a20'); break;
        case 'glitter': [[7, 35], [12, 38], [28, 34], [32, 37], [25, 39]].forEach(function (p) { P(g, p[0], p[1], 1, 1, '#fff6c0'); }); break;
        case 'phone_string': P(g, Math.round(cx) - 4, 32, 1, 5, '#ddd'); P(g, Math.round(cx) + 3, 32, 1, 5, '#ddd'); P(g, Math.round(cx) - 3, 36, 6, 4, '#2a2a30'); break;
        case 'bear': P(g, 26, 30, 10, 10, '#8a5a32'); P(g, 26, 29, 3, 3, '#8a5a32'); P(g, 33, 29, 3, 3, '#8a5a32'); P(g, 28, 33, 1, 1, '#111'); P(g, 32, 33, 1, 1, '#111'); P(g, 29, 35, 3, 2, '#c8a07a'); break;
        case 'bunny': P(g, 27, 31, 9, 9, '#9a9aa0'); P(g, 28, 24, 2, 8, '#9a9aa0'); P(g, 33, 24, 2, 8, '#9a9aa0'); P(g, 29, 34, 1, 1, '#111'); P(g, 33, 34, 1, 1, '#111'); break;
        case 'gloves': P(g, 4, 36, 5, 4, '#f0d020'); P(g, 31, 36, 5, 4, '#f0d020'); break;
        case 'ruler': P(g, 33, 18, 2, 22, '#c89a5a'); for (var ri = 20; ri < 40; ri += 3) P(g, 33, ri, 1, 1, '#6a4a20'); break;
        case 'cane': P(g, 34, 22, 2, 18, '#111'); P(g, 31, 21, 5, 2, '#111'); break;
        case 'book': P(g, 4, 30, 9, 10, '#8a2a2a'); P(g, 4, 30, 9, 1, '#c8a050'); P(g, 11, 30, 2, 10, '#5a1a1a'); break;
        case 'tablet': P(g, 28, 29, 9, 11, '#1a1a24'); P(g, 29, 30, 7, 8, '#3fc1c9'); break;
        case 'remote': break;
      }
    });
  }

  /* ---- wrap the engine's sprite + portrait getters (only specs with `overlay`) ---- */
  if (S && !S._sharedOverlay) {
    var baseGet = S.get, basePortrait = S.portrait, baseClear = S.clearCache, oc = {};
    var keyOf = function (id) { return typeof id === 'string' ? (G.lookupKey('cast', id) || id) : 'inline:' + JSON.stringify(id); };
    S.get = function (idOrSpec, dir, frame) {
      dir = dir || 'down'; frame = frame || 0;
      var k = keyOf(idOrSpec) + '|' + dir + '|' + frame;
      if (oc[k]) return oc[k];
      var sp = S.spec(idOrSpec), base = baseGet(idOrSpec, dir, frame);
      if (!sp.overlay || !sp.overlay.length) { oc[k] = base; return base; }
      var c = document.createElement('canvas'); c.width = S.W; c.height = S.H;
      var g = c.getContext('2d'); g.drawImage(base, 0, 0);
      try {
        if (dir === 'left') { g.translate(S.W, 0); g.scale(-1, 1); spriteOver(g, sp, 'right', frame, sp.overlay); }
        else spriteOver(g, sp, dir, frame, sp.overlay);
      } catch (e) { G.reportError(e, 'overlay ' + k); }
      oc[k] = c; return c;
    };
    S.portrait = function (idOrSpec, mood) {
      var sp = S.spec(idOrSpec); mood = mood || sp.mood || 'neutral';
      var k = 'P|' + keyOf(idOrSpec) + '|' + mood;
      if (oc[k]) return oc[k];
      var base = basePortrait(idOrSpec, mood);
      if (!sp.overlay || !sp.overlay.length) { oc[k] = base; return base; }
      var c = document.createElement('canvas'); c.width = S.PW; c.height = S.PH;
      var g = c.getContext('2d'); g.drawImage(base, 0, 0);
      try { portraitOver(g, sp, sp.overlay); } catch (e) { G.reportError(e, 'portrait overlay ' + k); }
      g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(0, 0, S.PW, 1); g.fillRect(0, S.PH - 1, S.PW, 1); g.fillRect(0, 0, 1, S.PH); g.fillRect(S.PW - 1, 0, 1, S.PH);
      oc[k] = c; return c;
    };
    S.clearCache = function (id) { oc = {}; return baseClear(id); };
    S._sharedOverlay = true;
  }

  /** Every cast id defined here (for the cast sheet / tests). */
  G.shared.data.castIds = Object.keys(G.registry.cast);
})();
