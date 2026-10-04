/* =========================================================================
 * sprites.js: procedural character sprites + portraits from a small spec.
 *
 * SPEC (all optional):
 *  {
 *    name: 'Luna',            // display name in dialogue
 *    skin: '#c9967a',
 *    hair: '#3a2418',
 *    hairStyle: 'short'|'long'|'ponytail'|'bun'|'bob'|'curly'|'buzz'|'bald'|'slick'|'pigtails'|'mohawk'|'afro'|'hood',
 *    outfit: '#5f7f8c',       // top colour
 *    outfit2: '#2e3440',      // pants / skirt colour
 *    style: 'casual'|'hoodie'|'suit'|'robe'|'dress'|'jumpsuit'|'uniform'|'apron'|'coat'|'vr',
 *    height: 'child'|'short'|'normal'|'tall',
 *    build: 'slim'|'normal'|'broad',
 *    accessory: 'glasses'|'tie'|'badge'|'cap'|'mic'|'headset'|'earrings'|'beard'|'scarf'|'number'|'collar'|'shades'|'bandage'
 *               (string or array of strings)
 *    accent: '#e8c15a',       // tie / trim / badge colour
 *    eyes: '#2a1a12',
 *    bg: '#2b2333',           // portrait background
 *    voice: 440,              // typewriter blip pitch (Hz)
 *    mood: 'neutral'          // default portrait mood
 *  }
 * Portrait moods: neutral, happy, sad, angry, shock, smug, tired, cry, fear
 * ========================================================================= */
(function () {
  'use strict';
  var G = window.G;
  var U = G.util;
  var S = (G.Sprites = {});
  S.W = 16; S.H = 28;   // sprite canvas size; feet at the bottom row
  S.PW = 40; S.PH = 40; // portrait canvas size

  var cache = {};
  S.clearCache = function (id) {
    if (!id) { cache = {}; return; }
    Object.keys(cache).forEach(function (k) { if (k.indexOf(id + '|') === 0 || k.indexOf('|' + id + '|') >= 0) delete cache[k]; });
  };

  var DEFAULT = {
    name: '???', skin: '#c9967a', hair: '#3b2a20', hairStyle: 'short', outfit: '#6b6f80', outfit2: '#33364a',
    style: 'casual', height: 'normal', build: 'normal', accessory: null, accent: '#e8c15a', eyes: '#1d1410',
    bg: '#232030', voice: 440
  };

  /** Resolve a spec: string id (cast lookup, chapter-namespaced) or inline object. */
  S.spec = function (idOrSpec) {
    var s = typeof idOrSpec === 'string' ? G.lookup('cast', idOrSpec) : idOrSpec;
    if (!s && typeof idOrSpec === 'string') s = { name: U.cap(idOrSpec) };
    var out = {};
    for (var k in DEFAULT) out[k] = DEFAULT[k];
    if (s && s.extends) { var b = G.lookup('cast', s.extends); if (b) for (var k3 in b) out[k3] = b[k3]; }
    for (var k2 in s) out[k2] = s[k2];
    out.acc = Array.isArray(out.accessory) ? out.accessory : out.accessory ? [out.accessory] : [];
    return out;
  };
  function has(sp, a) { return sp.acc.indexOf(a) >= 0; }
  function specKey(idOrSpec) {
    if (typeof idOrSpec === 'string') { var k = G.lookupKey('cast', idOrSpec); return k || idOrSpec; }
    return 'inline:' + JSON.stringify(idOrSpec);
  }

  /** Deterministic random crowd/extra spec from a seed. */
  S.randomSpec = function (seed, overrides) {
    var r = U.rng('crowd' + seed);
    var skins = ['#f1c9a5', '#e0ac85', '#c68863', '#a46a45', '#7d4b2e', '#5a3420'];
    var hairs = ['#1a1412', '#3b2a20', '#6b4426', '#a8763e', '#d8c27a', '#8c8c8c', '#5a1f1f', '#222'];
    var outfits = ['#5a6b7a', '#7a5a5a', '#5a7a5f', '#7a6f5a', '#6a5a7a', '#4a4a55', '#8a7a4a', '#3f5f6f'];
    var styles = ['short', 'long', 'bob', 'buzz', 'curly', 'bald', 'ponytail', 'bun', 'afro'];
    function p(a) { return a[Math.floor(r() * a.length)]; }
    var s = {
      name: 'Bystander', skin: p(skins), hair: p(hairs), hairStyle: p(styles), outfit: p(outfits),
      outfit2: p(['#2e3440', '#3a3328', '#24283a', '#403040']), style: p(['casual', 'casual', 'coat', 'hoodie']),
      build: p(['slim', 'normal', 'broad']), height: p(['short', 'normal', 'normal', 'tall']),
      accessory: r() < 0.2 ? p(['glasses', 'cap', 'scarf', 'beard']) : null, voice: 300 + Math.floor(r() * 300)
    };
    if (overrides) for (var k in overrides) s[k] = overrides[k];
    return s;
  };

  /* ---------------- built-in cast ----------------
   * Appearances are engine defaults; chapters may override per chapter with
   * `cast: { luna: { outfit:'#d9692b', style:'jumpsuit' } }` (merged over these).
   */
  var CAST = {
    luna: { name: 'Luna', skin: '#d8a888', hair: '#3a2219', hairStyle: 'ponytail', outfit: '#55707c', outfit2: '#2c3340', style: 'hoodie', voice: 430, bg: '#1f2a33' },
    luna_prison: { extends: 'luna', outfit: '#d9692b', outfit2: '#d9692b', style: 'jumpsuit', accessory: 'number' },
    luna_show: { extends: 'luna', outfit: '#2a2a35', outfit2: '#2a2a35', style: 'jumpsuit', accessory: 'number', accent: '#e8323c' },
    waverly: { name: 'Waverly', skin: '#e3b796', hair: '#5a3220', hairStyle: 'pigtails', outfit: '#e2b13c', outfit2: '#4a5a8a', height: 'child', build: 'slim', voice: 680, bg: '#2f2a1e' },
    trader: { name: 'Trader', skin: '#efc7a4', hair: '#e2c76c', hairStyle: 'slick', outfit: '#6a2a8c', outfit2: '#2a1236', style: 'suit', height: 'tall', accessory: ['tie', 'mic'], accent: '#e8c15a', voice: 330, bg: '#3a1030' },
    judge: { name: 'Judge Johnson', skin: '#c99a78', hair: '#d0d0d0', hairStyle: 'short', outfit: '#16161c', outfit2: '#16161c', style: 'robe', accessory: ['glasses', 'collar'], build: 'broad', voice: 240, bg: '#2a2016' },
    john: { name: 'John', skin: '#e2b08a', hair: '#2b1d14', hairStyle: 'buzz', outfit: '#3f6b4c', outfit2: '#283830', build: 'broad', height: 'tall', accessory: 'beard', voice: 260, bg: '#1d2a22' },
    carol: { name: 'Carol', skin: '#f0cfb2', hair: '#b45a34', hairStyle: 'bob', outfit: '#a3405e', outfit2: '#3a2430', style: 'dress', accessory: 'earrings', voice: 520, bg: '#2e1c24' },
    kessie: { name: 'Kessie', skin: '#a36d4a', hair: '#1c120c', hairStyle: 'curly', outfit: '#3f86c8', outfit2: '#283a55', build: 'slim', accessory: 'earrings', voice: 560, bg: '#1b2638' },
    delphin: { name: 'Delphin', skin: '#7a4d32', hair: '#120c0a', hairStyle: 'short', outfit: '#7d63b0', outfit2: '#2c2540', build: 'slim', height: 'tall', accessory: 'glasses', voice: 360, bg: '#241d33' },
    annette: { name: 'Annette', skin: '#f2d2bb', hair: '#9a9a9a', hairStyle: 'bun', outfit: '#c87a3a', outfit2: '#4a3020', style: 'coat', height: 'short', accessory: 'scarf', voice: 480, bg: '#2d2218' },
    isaiah: { name: 'Isaiah', skin: '#5a3624', hair: '#0e0a08', hairStyle: 'afro', outfit: '#b8b8b0', outfit2: '#3a3a40', build: 'broad', accessory: 'beard', voice: 220, bg: '#22221f' },
    handler: { name: 'Handler', skin: '#d6a98a', hair: '#1a1a1a', hairStyle: 'short', outfit: '#1c1c22', outfit2: '#1c1c22', style: 'uniform', accessory: ['headset', 'badge'], accent: '#e8323c', voice: 300, bg: '#1a1a1f' },
    guard: { name: 'Guard', skin: '#c08a68', hair: '#222', hairStyle: 'buzz', outfit: '#2a3550', outfit2: '#1e2538', style: 'uniform', build: 'broad', accessory: ['cap', 'badge'], accent: '#c9b458', voice: 210, bg: '#161c2a' },
    cameraman: { name: 'Camera Op', skin: '#e0b090', hair: '#4a3a2a', hairStyle: 'short', outfit: '#333', outfit2: '#222', accessory: ['headset', 'cap'], voice: 320 },
    inmate: { name: 'Inmate', skin: '#b07a58', hair: '#2a2018', hairStyle: 'buzz', outfit: '#d9692b', outfit2: '#d9692b', style: 'jumpsuit', accessory: 'number', voice: 280 },
    caseworker: { name: 'Caseworker', skin: '#f0d0b8', hair: '#6a4a2a', hairStyle: 'bun', outfit: '#6a7a6a', outfit2: '#3a3a3a', style: 'coat', accessory: ['glasses', 'badge'], voice: 500 },
    child: { name: 'Child', skin: '#d8a888', hair: '#3a2a1a', hairStyle: 'short', outfit: '#7a9aa8', outfit2: '#3a4a5a', height: 'child', build: 'slim', voice: 700 },
    citizen: { name: 'Citizen', skin: '#d8a888', hair: '#4a3a2a', hairStyle: 'short', outfit: '#5a5a66', style: 'coat', voice: 380 },
    narrator: { name: '', voice: 380 },
    announcer: { name: 'Announcer', skin: '#d8b090', hair: '#222', hairStyle: 'slick', outfit: '#222230', style: 'suit', accessory: ['tie', 'headset'], accent: '#e8323c', voice: 300, bg: '#300a10' }
  };
  Object.keys(CAST).forEach(function (k) { G.registerCast(k, CAST[k]); });

  /* ---------------- body sprite ---------------- */
  function geom(sp) {
    var h = sp.height;
    var legH = h === 'child' ? 4 : h === 'short' ? 5 : h === 'tall' ? 7 : 6;
    var torsoH = h === 'child' ? 5 : h === 'tall' ? 8 : 7;
    var headH = h === 'child' ? 7 : 8;
    var tw = sp.build === 'broad' ? 10 : sp.build === 'slim' ? 6 : 8;
    if (h === 'child') tw = Math.min(tw, 6);
    var feet = S.H - 1;
    var legTop = feet - legH + 1;
    var torsoTop = legTop - torsoH;
    var headTop = torsoTop - headH + 1;
    return { legH: legH, torsoH: torsoH, headH: headH, tw: tw, legTop: legTop, torsoTop: torsoTop, headTop: headTop, feet: feet };
  }

  function drawBody(g, sp, dir, frame) {
    function P(x, y, w, h, c) { g.fillStyle = c; g.fillRect(x, y, w || 1, h || 1); }
    var m = geom(sp);
    var side = dir === 'left' || dir === 'right';
    var skin = sp.skin, skinD = U.shade(skin, -0.2);
    var top = sp.outfit, topD = U.shade(top, -0.3), topL = U.shade(top, 0.15);
    var bot = sp.style === 'jumpsuit' ? sp.outfit : sp.outfit2, botD = U.shade(bot, -0.3);
    var hair = sp.hair, hairD = U.shade(hair, -0.3), hairL = U.shade(hair, 0.2);
    var cx = 8;
    var tw = side ? Math.max(5, m.tw - 2) : m.tw;
    var tx = cx - Math.floor(tw / 2);
    var step = frame === 1 ? 1 : frame === 2 ? -1 : 0;
    var robe = sp.style === 'robe', dress = sp.style === 'dress', coat = sp.style === 'coat';

    // legs
    if (!side) {
      var l1 = frame === 1 ? 1 : 0, l2 = frame === 2 ? 1 : 0;
      P(cx - 3, m.legTop, 2, m.legH - l1, bot); P(cx - 3, m.feet - l1, 2, 1, '#151318');
      P(cx + 1, m.legTop, 2, m.legH - l2, bot); P(cx + 1, m.feet - l2, 2, 1, '#151318');
      P(cx + 2, m.legTop, 1, m.legH - 1 - l2, botD);
    } else {
      P(cx - 1 + step, m.legTop, 2, m.legH, botD); P(cx - 1 + step, m.feet, 3, 1, '#151318');
      P(cx - 1 - step, m.legTop, 2, m.legH, bot); P(cx - 1 - step, m.feet, 3, 1, '#151318');
    }
    // long garments over legs
    if (robe) P(tx, m.legTop, tw, m.legH - 1, top), P(tx + tw - 1, m.legTop, 1, m.legH - 1, topD);
    if (dress) P(tx, m.legTop, tw, Math.ceil(m.legH / 2), bot), P(tx + tw - 1, m.legTop, 1, Math.ceil(m.legH / 2), botD);
    if (coat) P(tx, m.legTop, tw, 2, top);

    // torso
    P(tx, m.torsoTop, tw, m.torsoH, top);
    P(tx + tw - 1, m.torsoTop, 1, m.torsoH, topD);
    P(tx, m.torsoTop, tw, 1, topL);
    if (!robe && !dress && sp.style !== 'jumpsuit') P(tx, m.torsoTop + m.torsoH - 1, tw, 1, topD); // waist
    // arms
    var armY = m.torsoTop + 1, armH = m.torsoH - 2;
    if (!side) {
      var sw = frame === 0 ? 0 : 1;
      P(tx - 1, armY + (frame === 1 ? sw : 0), 1, armH, topD); P(tx - 1, armY + armH + (frame === 1 ? sw : 0), 1, 1, skin);
      P(tx + tw, armY + (frame === 2 ? sw : 0), 1, armH, topD); P(tx + tw, armY + armH + (frame === 2 ? sw : 0), 1, 1, skinD);
    } else {
      P(cx + step, armY, 2, armH, topD); P(cx + step, armY + armH, 2, 1, skin);
    }
    // style details (front)
    if (dir === 'down') {
      if (sp.style === 'suit') { P(cx - 1, m.torsoTop, 2, 3, '#e8e4dc'); }
      if (sp.style === 'hoodie') { P(cx - 2, m.torsoTop + m.torsoH - 3, 4, 2, topD); P(cx - 2, m.torsoTop, 1, 2, '#ddd'); P(cx + 1, m.torsoTop, 1, 2, '#ddd'); }
      if (sp.style === 'uniform') { P(tx, m.torsoTop + m.torsoH - 2, tw, 1, '#111'); }
      if (sp.style === 'apron') { P(cx - 2, m.torsoTop + 2, 4, m.torsoH + 2, '#e8e4dc'); }
      if (sp.style === 'coat') { P(cx, m.torsoTop + 1, 1, m.torsoH + 1, topD); }
      if (sp.style === 'vr') { P(tx, m.torsoTop + 2, tw, 1, '#3fc1c9'); }
      if (has(sp, 'tie')) P(cx - 1 + (sp.style === 'suit' ? 0 : 0), m.torsoTop + 1, 1, 4, sp.accent), P(cx, m.torsoTop + 1, 1, 4, U.shade(sp.accent, -0.2));
      if (has(sp, 'badge')) P(tx + 1, m.torsoTop + 2, 2, 2, sp.accent);
      if (has(sp, 'number')) P(tx + tw - 4, m.torsoTop + 2, 3, 2, '#eee'), P(tx + tw - 3, m.torsoTop + 2, 1, 2, '#222');
      if (has(sp, 'collar')) P(cx - 2, m.torsoTop, 4, 1, '#eee');
      if (has(sp, 'scarf')) P(tx, m.torsoTop, tw, 2, sp.accent), P(cx + 1, m.torsoTop + 2, 2, 3, sp.accent);
    } else if (dir === 'up') {
      if (sp.style === 'hoodie') P(cx - 3, m.torsoTop, 6, 2, topD);
      if (has(sp, 'number')) P(cx - 2, m.torsoTop + 2, 4, 3, '#eee'), P(cx - 1, m.torsoTop + 2, 1, 3, '#222');
      if (has(sp, 'scarf')) P(tx, m.torsoTop, tw, 2, sp.accent);
    } else {
      if (has(sp, 'scarf')) P(tx, m.torsoTop, tw, 2, sp.accent);
      if (has(sp, 'tie') && dir === 'right') P(tx + tw - 2, m.torsoTop + 1, 1, 3, sp.accent);
    }
    if (has(sp, 'mic') && dir !== 'up') {
      var mx = side ? cx + step + 2 : tx + tw;
      P(mx, armY + armH - 2, 1, 3, '#222'); P(mx - (side ? 0 : 0), armY + armH - 3, 2, 2, '#888');
    }

    // head
    var hw = 8, hx = cx - 4, hy = m.headTop, hh = m.headH;
    P(hx + 1, hy, hw - 2, hh, skin); P(hx, hy + 1, hw, hh - 2, skin);
    P(hx + hw - 1, hy + 1, 1, hh - 2, skinD);
    var eyeY = hy + Math.floor(hh / 2) + (sp.height === 'child' ? 0 : 0);
    if (dir === 'down') {
      P(hx + 2, eyeY, 1, 1, sp.eyes); P(hx + 5, eyeY, 1, 1, sp.eyes);
      P(hx + 3, hy + hh - 2, 2, 1, U.shade(skin, -0.28)); // mouth hint
    } else if (dir === 'right') {
      P(hx + 5, eyeY, 1, 1, sp.eyes); P(hx + hw, eyeY + 1, 1, 1, skin);
    } else if (dir === 'left') {
      P(hx + 2, eyeY, 1, 1, sp.eyes); P(hx - 1, eyeY + 1, 1, 1, skin);
    }
    // hair
    drawHairSprite(P, sp, dir, hx, hy, hw, hh, hair, hairD, hairL, m);
    // face accessories
    if (has(sp, 'glasses') && dir !== 'up') {
      if (dir === 'down') { P(hx + 1, eyeY, 3, 1, '#111'); P(hx + 4, eyeY, 3, 1, '#111'); P(hx + 2, eyeY, 1, 1, '#9ad'); P(hx + 5, eyeY, 1, 1, '#9ad'); }
      else P(dir === 'right' ? hx + 4 : hx + 1, eyeY, 3, 1, '#111');
    }
    if (has(sp, 'shades') && dir !== 'up') P(dir === 'left' ? hx : hx + 1, eyeY, dir === 'down' ? 6 : 4, 1, '#000');
    if (has(sp, 'beard') && dir !== 'up') P(dir === 'left' ? hx : hx + 1, hy + hh - 3, dir === 'down' ? 6 : 5, 3, hairD);
    if (has(sp, 'cap')) {
      var capC = sp.style === 'uniform' ? sp.outfit : sp.accent;
      P(hx, hy - 1, hw, 3, capC);
      if (dir === 'down') P(hx, hy + 2, hw, 1, U.shade(capC, -0.4));
      if (dir === 'right') P(hx + hw - 1, hy + 2, 3, 1, U.shade(capC, -0.4));
      if (dir === 'left') P(hx - 2, hy + 2, 3, 1, U.shade(capC, -0.4));
    }
    if (has(sp, 'headset')) {
      P(hx, hy, hw, 1, '#222');
      if (dir !== 'right') P(hx - 1, eyeY, 1, 2, '#222');
      if (dir !== 'left') P(hx + hw, eyeY, 1, 2, '#222');
      if (dir === 'down' || dir === 'left') P(hx, eyeY + 2, 2, 1, '#444');
    }
    if (has(sp, 'earrings') && dir !== 'up') { if (dir !== 'right') P(hx - 1, eyeY + 2, 1, 1, '#f2d36b'); if (dir !== 'left') P(hx + hw, eyeY + 2, 1, 1, '#f2d36b'); }
    if (has(sp, 'bandage')) P(hx + 2, hy + 2, 3, 1, '#eee');
  }

  function drawHairSprite(P, sp, dir, hx, hy, hw, hh, hair, hairD, hairL, m) {
    var st = sp.hairStyle;
    if (st === 'bald') { P(hx + 2, hy, 3, 1, U.shade(sp.skin, 0.15)); return; }
    var back = dir === 'up';
    var side = dir === 'left' || dir === 'right';
    // crown, common to most styles
    if (st === 'buzz') { P(hx + 1, hy, hw - 2, 1, hairD); P(hx, hy + 1, hw, 1, hairD); if (back) P(hx, hy, hw, hh - 3, hairD); return; }
    if (st === 'afro' || st === 'curly') {
      var big = st === 'afro' ? 2 : 1;
      P(hx - big, hy - big, hw + big * 2, 3 + big, hair);
      P(hx - big, hy + 1, 2, hh - (st === 'afro' ? 2 : 3), hair); P(hx + hw - 2 + big, hy + 1, 2, hh - (st === 'afro' ? 2 : 3), hair);
      P(hx, hy - big, 2, 1, hairL); P(hx + 4, hy, 1, 1, hairD);
      if (back) P(hx - big, hy, hw + big * 2, hh - 1, hair);
      return;
    }
    if (st === 'mohawk') { P(hx + 3, hy - 2, 2, 4, hair); if (back) P(hx + 3, hy, 2, hh - 2, hair); return; }
    if (st === 'hood') { P(hx - 1, hy - 1, hw + 2, 3, sp.outfit); P(hx - 1, hy, 2, hh, sp.outfit); P(hx + hw - 1, hy, 2, hh, sp.outfit); if (back) P(hx - 1, hy, hw + 2, hh, sp.outfit); return; }
    // standard crown
    P(hx, hy, hw, 2, hair); P(hx + 1, hy - 1, hw - 2, 1, hair);
    P(hx + 2, hy - 1, 2, 1, hairL);
    if (st === 'slick') { P(hx, hy + 2, 1, 2, hair); P(hx + hw - 1, hy + 2, 1, 2, hair); P(hx + 5, hy, 1, 1, hairL); }
    else if (!back) {
      if (dir === 'down') { P(hx, hy + 2, 1, 2, hair); P(hx + hw - 1, hy + 2, 1, 2, hair); P(hx + 1, hy + 2, 2, 1, hair); }
      if (dir === 'right') { P(hx, hy + 2, 3, 3, hair); }
      if (dir === 'left') { P(hx + hw - 3, hy + 2, 3, 3, hair); }
    }
    if (back) P(hx, hy, hw, hh - 2, hair);
    var below = hy + hh;
    if (st === 'long') {
      if (dir === 'down') { P(hx - 1, hy + 1, 2, hh + 3, hair); P(hx + hw - 1, hy + 1, 2, hh + 3, hairD); }
      else if (back) P(hx, hy, hw, hh + 4, hair), P(hx + hw - 1, hy, 1, hh + 4, hairD);
      else P(dir === 'right' ? hx - 1 : hx + hw - 2, hy + 1, 3, hh + 3, hair);
    } else if (st === 'bob') {
      if (dir === 'down') { P(hx - 1, hy + 1, 2, hh - 1, hair); P(hx + hw - 1, hy + 1, 2, hh - 1, hairD); }
      else if (back) P(hx - 1, hy, hw + 2, hh - 1, hair);
      else P(dir === 'right' ? hx - 1 : hx + hw - 2, hy + 1, 3, hh - 1, hair);
    } else if (st === 'ponytail') {
      if (back) P(hx + 3, hy + 2, 2, hh + 3, hairD);
      else if (side) P(dir === 'right' ? hx - 2 : hx + hw, hy + 2, 2, hh, hairD);
    } else if (st === 'bun') {
      if (back || dir === 'down') P(hx + 2, hy - 3, 4, 3, hair), P(hx + 3, hy - 3, 1, 1, hairL);
      else P(dir === 'right' ? hx - 1 : hx + hw - 2, hy - 2, 3, 3, hair);
    } else if (st === 'pigtails') {
      if (!side) { P(hx - 2, hy + 2, 2, 4, hair); P(hx + hw, hy + 2, 2, 4, hair); }
      else P(dir === 'right' ? hx - 2 : hx + hw, hy + 2, 2, 4, hair);
    }
    void below; void m;
  }

  /** Get (cached) sprite canvas. dir: down|up|left|right, frame 0..2 */
  S.get = function (idOrSpec, dir, frame) {
    dir = dir || 'down'; frame = frame || 0;
    var key = specKey(idOrSpec) + '|' + dir + '|' + frame;
    if (cache[key]) return cache[key];
    var sp = S.spec(idOrSpec);
    var c = document.createElement('canvas'); c.width = S.W; c.height = S.H;
    var g = c.getContext('2d');
    try {
      if (dir === 'left') { g.translate(S.W, 0); g.scale(-1, 1); drawBody(g, sp, 'right', frame); }
      else drawBody(g, sp, dir, frame);
    } catch (e) { G.reportError(e, 'sprite ' + key); }
    cache[key] = c;
    return c;
  };

  /* ---------------- portraits ---------------- */
  function drawPortrait(g, sp, mood) {
    function P(x, y, w, h, c) { g.fillStyle = c; g.fillRect(x, y, w || 1, h || 1); }
    var W = S.PW, H = S.PH;
    var child = sp.height === 'child';
    var skin = sp.skin, skinD = U.shade(skin, -0.18), skinDD = U.shade(skin, -0.32), skinL = U.shade(skin, 0.12);
    var hair = sp.hair, hairD = U.shade(hair, -0.35), hairL = U.shade(hair, 0.22);
    var top = sp.outfit, topD = U.shade(top, -0.3), topL = U.shade(top, 0.15);
    // background: vertical two-tone with scanline texture
    P(0, 0, W, H, sp.bg); P(0, 0, W, 12, U.shade(sp.bg, 0.08));
    for (var y = 0; y < H; y += 2) P(0, y, W, 1, 'rgba(0,0,0,0.12)');
    // shoulders
    var sx = child ? 9 : 5, sw = W - sx * 2;
    P(sx + 2, 32, sw - 4, 1, top); P(sx, 33, sw, 7, top); P(sx, 33, sw, 1, topL); P(sx + sw - 3, 33, 3, 7, topD);
    var hx = child ? 12 : 11, hw = child ? 16 : 18, hy = child ? 9 : 7, hh = child ? 21 : 23;
    var cx = hx + hw / 2;
    // neck
    P(cx - 3, hy + hh - 2, 6, 6, skinD);
    // outfit collar details
    if (sp.style === 'suit') { P(cx - 3, 32, 6, 8, '#e8e4dc'); P(cx - 4, 32, 1, 8, topD); P(cx + 3, 32, 1, 8, topD); }
    if (sp.style === 'robe') { P(cx - 4, 32, 8, 2, '#eee'); }
    if (sp.style === 'hoodie') { P(sx + 3, 31, 5, 3, topD); P(sx + sw - 8, 31, 5, 3, topD); P(cx - 3, 34, 1, 4, '#ddd'); P(cx + 2, 34, 1, 4, '#ddd'); }
    if (sp.style === 'uniform') { P(cx - 4, 32, 8, 2, topD); P(cx - 1, 34, 2, 6, topD); }
    if (sp.style === 'jumpsuit') { P(cx - 1, 33, 2, 7, topD); }
    if (sp.style === 'coat') { P(cx - 5, 32, 3, 8, topL); P(cx + 2, 32, 3, 8, topL); P(cx - 2, 33, 4, 7, U.shade(top, -0.45)); }
    if (sp.style === 'apron') { P(cx - 5, 34, 10, 6, '#e8e4dc'); }
    if (has(sp, 'tie')) { P(cx - 1, 33, 2, 1, sp.accent); P(cx - 1, 34, 2, 6, U.shade(sp.accent, -0.15)); }
    if (has(sp, 'collar')) { P(cx - 4, 32, 3, 2, '#f2f2f2'); P(cx + 1, 32, 3, 2, '#f2f2f2'); }
    if (has(sp, 'badge')) { P(sx + 4, 35, 3, 3, sp.accent); P(sx + 5, 36, 1, 1, '#fff'); }
    if (has(sp, 'number')) { P(sx + sw - 10, 35, 6, 4, '#eee'); P(sx + sw - 9, 36, 1, 2, '#222'); P(sx + sw - 7, 36, 2, 2, '#222'); }
    if (has(sp, 'scarf')) { P(sx + 3, 31, sw - 6, 3, sp.accent); P(cx + 2, 34, 3, 6, U.shade(sp.accent, -0.2)); }
    // hair behind head (long styles)
    var st = sp.hairStyle;
    if (st === 'long') { P(hx - 2, hy + 2, hw + 4, hh + 6, hairD); }
    if (st === 'bob') { P(hx - 2, hy + 2, hw + 4, hh - 4, hairD); }
    if (st === 'afro') { P(hx - 5, hy - 5, hw + 10, hh - 2, hair); P(hx - 3, hy - 6, hw + 6, 2, hair); }
    if (st === 'curly') { P(hx - 3, hy - 3, hw + 6, hh - 6, hair); }
    if (st === 'hood') { P(hx - 4, hy - 3, hw + 8, hh + 8, top); P(hx - 2, hy - 1, hw + 4, hh + 6, topD); }
    if (st === 'pigtails') { P(hx - 5, hy + 6, 4, 10, hair); P(hx + hw + 1, hy + 6, 4, 10, hair); P(hx - 5, hy + 6, 4, 1, hairL); }
    // head shape
    P(hx + 2, hy, hw - 4, hh, skin);
    P(hx, hy + 2, hw, hh - 6, skin);
    P(hx + 1, hy + 1, hw - 2, hh - 2, skin);
    P(hx + 3, hy + hh - 1, hw - 6, 1, skinD); // jaw
    P(hx + hw - 3, hy + 3, 2, hh - 7, skinD); P(hx + hw - 2, hy + 5, 1, hh - 10, skinDD);
    P(hx + 2, hy + 2, 2, 3, skinL);
    // ears
    P(hx - 1, hy + 10, 2, 4, skinD); P(hx + hw - 1, hy + 10, 2, 4, skinD);
    // eyes
    var ey = hy + (child ? 11 : 11);
    var lx = Math.round(cx - 6), rx = Math.round(cx + 2);
    var eh = mood === 'shock' || mood === 'fear' ? 3 : 2;
    var eyeTop = mood === 'shock' || mood === 'fear' ? ey - 1 : ey;
    if (mood === 'happy') {
      P(lx, ey, 4, 1, '#1a1210'); P(lx, ey + 1, 1, 1, '#1a1210'); P(lx + 3, ey + 1, 1, 1, '#1a1210');
      P(rx, ey, 4, 1, '#1a1210'); P(rx, ey + 1, 1, 1, '#1a1210'); P(rx + 3, ey + 1, 1, 1, '#1a1210');
    } else {
      P(lx, eyeTop, 4, eh, '#f2efe8'); P(rx, eyeTop, 4, eh, '#f2efe8');
      var px = mood === 'smug' ? 2 : 1;
      P(lx + px, eyeTop, 2, eh, sp.eyes); P(rx + px, eyeTop, 2, eh, sp.eyes);
      P(lx + px, eyeTop, 1, 1, '#fff'); P(rx + px, eyeTop, 1, 1, '#fff');
      if (mood === 'tired' || mood === 'smug') { P(lx, eyeTop, 4, 1, skinD); P(rx, eyeTop, 4, 1, skinD); }
      if (mood === 'cry' || mood === 'sad') { P(lx, eyeTop + eh, 4, 1, skinD); P(rx, eyeTop + eh, 4, 1, skinD); }
    }
    if (mood === 'cry') { P(lx + 1, ey + 3, 1, 4, '#8fd0ff'); P(rx + 2, ey + 3, 1, 3, '#8fd0ff'); }
    if (mood === 'tired') { P(lx, ey + 2, 4, 1, skinDD); P(rx, ey + 2, 4, 1, skinDD); }
    // brows
    var browC = sp.hairStyle === 'bald' ? skinDD : hairD;
    var by = ey - 3;
    if (mood === 'angry') { P(lx, by, 2, 1, browC); P(lx + 2, by + 1, 2, 1, browC); P(rx + 2, by, 2, 1, browC); P(rx, by + 1, 2, 1, browC); }
    else if (mood === 'sad' || mood === 'cry' || mood === 'fear') { P(lx, by + 1, 2, 1, browC); P(lx + 2, by, 2, 1, browC); P(rx, by, 2, 1, browC); P(rx + 2, by + 1, 2, 1, browC); }
    else if (mood === 'shock') { P(lx, by - 1, 4, 1, browC); P(rx, by - 1, 4, 1, browC); }
    else if (mood === 'smug') { P(lx, by + 1, 4, 1, browC); P(rx, by - 1, 4, 1, browC); }
    else { P(lx, by, 4, 1, browC); P(rx, by, 4, 1, browC); }
    // nose
    P(Math.round(cx) - 1, ey + 2, 1, 4, skinD); P(Math.round(cx) - 1, ey + 5, 3, 1, skinDD);
    // mouth
    var my = hy + hh - 6, mc = U.shade(skin, -0.45), lip = '#b0535a';
    var mx = Math.round(cx) - 3;
    if (mood === 'happy') { P(mx, my, 6, 1, mc); P(mx - 1, my - 1, 1, 1, mc); P(mx + 6, my - 1, 1, 1, mc); P(mx + 1, my + 1, 4, 1, lip); }
    else if (mood === 'sad' || mood === 'cry') { P(mx + 1, my, 4, 1, mc); P(mx, my + 1, 1, 1, mc); P(mx + 5, my + 1, 1, 1, mc); }
    else if (mood === 'angry') { P(mx, my, 6, 2, '#3a1414'); P(mx, my, 6, 1, '#eee'); }
    else if (mood === 'shock' || mood === 'fear') { P(mx + 2, my - 1, 3, 3, '#2a0e0e'); }
    else if (mood === 'smug') { P(mx + 1, my, 5, 1, mc); P(mx + 6, my - 1, 1, 1, mc); }
    else { P(mx + 1, my, 4, 1, mc); P(mx + 1, my + 1, 4, 1, U.rgba(lip, 0.5)); }
    // hair (front)
    if (st === 'bald') { P(hx + 4, hy + 1, 5, 1, skinL); }
    else if (st === 'buzz') { P(hx + 1, hy, hw - 2, 3, hairD); P(hx, hy + 2, 2, 5, hairD); P(hx + hw - 2, hy + 2, 2, 5, hairD); }
    else if (st === 'mohawk') { P(cx - 2, hy - 5, 4, 8, hair); P(cx - 2, hy - 5, 1, 8, hairL); }
    else if (st === 'afro') { P(hx - 3, hy - 3, hw + 6, 6, hair); P(hx - 1, hy - 4, 6, 1, hairL); }
    else if (st === 'curly') { for (var i = 0; i < hw + 4; i += 3) P(hx - 2 + i, hy - 2 + (i % 2), 3, 5, i % 2 ? hairD : hair); P(hx - 2, hy, 3, 10, hair); P(hx + hw - 1, hy, 3, 10, hair); }
    else if (st === 'hood') { P(hx, hy - 1, hw, 4, hair); }
    else {
      P(hx - 1, hy - 2, hw + 2, 5, hair); P(hx + 1, hy - 3, hw - 2, 1, hair);
      P(hx + 2, hy - 2, 5, 1, hairL);
      if (st === 'slick') { P(hx + 5, hy - 2, 1, 4, hairD); P(hx + 7, hy - 1, hw - 8, 1, hairL); P(hx - 1, hy + 2, 2, 6, hair); P(hx + hw - 1, hy + 2, 2, 6, hair); }
      else if (st === 'short') { P(hx - 1, hy + 2, 2, 7, hair); P(hx + hw - 1, hy + 2, 2, 7, hair); P(hx + 2, hy + 3, 6, 1, hair); }
      else if (st === 'long' || st === 'bob') { P(hx - 2, hy, 3, hh - (st === 'bob' ? 6 : 0), hair); P(hx + hw - 1, hy, 3, hh - (st === 'bob' ? 6 : 0), hair); P(hx + 1, hy + 3, 7, 1, hair); }
      else if (st === 'ponytail') { P(hx - 1, hy + 2, 2, 6, hair); P(hx + hw - 1, hy + 2, 2, 6, hair); P(hx + hw, hy + 3, 3, 9, hairD); P(hx + 1, hy + 3, 4, 1, hair); }
      else if (st === 'bun') { P(cx - 4, hy - 8, 8, 6, hair); P(cx - 3, hy - 8, 3, 1, hairL); P(hx - 1, hy + 2, 2, 6, hair); P(hx + hw - 1, hy + 2, 2, 6, hair); }
      else if (st === 'pigtails') { P(hx - 1, hy + 2, 2, 6, hair); P(hx + hw - 1, hy + 2, 2, 6, hair); P(hx + 3, hy + 3, 5, 1, hair); }
    }
    // accessories (face)
    if (has(sp, 'glasses')) {
      var gc = '#111';
      P(lx - 1, ey - 1, 6, 1, gc); P(lx - 1, ey + 2, 6, 1, gc); P(lx - 1, ey - 1, 1, 4, gc); P(lx + 4, ey - 1, 1, 4, gc);
      P(rx - 1, ey - 1, 6, 1, gc); P(rx - 1, ey + 2, 6, 1, gc); P(rx - 1, ey - 1, 1, 4, gc); P(rx + 4, ey - 1, 1, 4, gc);
      P(lx + 4, ey, 3, 1, gc); g.fillStyle = 'rgba(160,200,255,0.25)'; g.fillRect(lx, ey, 4, 2); g.fillRect(rx, ey, 4, 2);
    }
    if (has(sp, 'shades')) { P(lx - 1, ey - 1, 6, 4, '#0a0a0a'); P(rx - 1, ey - 1, 6, 4, '#0a0a0a'); P(lx + 4, ey, 3, 1, '#0a0a0a'); P(lx, ey - 1, 2, 1, '#555'); }
    if (has(sp, 'beard')) { P(hx + 1, my - 3, hw - 2, hh - (my - hy) + 3, hairD); P(mx, my - 1, 6, 1, hair); P(mx + 1, my, 4, 1, '#3a1414'); P(hx + 1, my - 6, 2, 4, hairD); P(hx + hw - 3, my - 6, 2, 4, hairD); }
    if (has(sp, 'earrings')) { P(hx - 1, hy + 14, 2, 2, '#f2d36b'); P(hx + hw - 1, hy + 14, 2, 2, '#f2d36b'); }
    if (has(sp, 'cap')) { var capC = sp.style === 'uniform' ? sp.outfit : sp.accent; P(hx - 2, hy - 4, hw + 4, 7, capC); P(hx - 3, hy + 2, hw + 8, 2, U.shade(capC, -0.4)); P(cx - 1, hy - 2, 3, 3, sp.accent); }
    if (has(sp, 'headset')) { P(hx - 2, hy - 3, hw + 4, 1, '#222'); P(hx - 3, hy + 9, 3, 6, '#222'); P(hx + hw, hy + 9, 3, 6, '#222'); P(hx - 1, hy + 15, 1, 4, '#333'); P(hx - 1, my - 1, 6, 1, '#333'); P(hx + 4, my - 2, 2, 2, '#555'); }
    if (has(sp, 'mic')) { P(W - 9, 26, 4, 5, '#9a9a9a'); P(W - 8, 27, 1, 3, '#ccc'); P(W - 8, 31, 2, 9, '#222'); }
    if (has(sp, 'bandage')) { P(hx + 3, hy + 2, 6, 2, '#eee'); P(hx + 5, hy + 2, 1, 2, '#c33'); }
    // frame
    g.fillStyle = 'rgba(0,0,0,0.5)';
    g.fillRect(0, 0, W, 1); g.fillRect(0, H - 1, W, 1); g.fillRect(0, 0, 1, H); g.fillRect(W - 1, 0, 1, H);
  }

  S.portrait = function (idOrSpec, mood) {
    var sp0 = S.spec(idOrSpec);
    mood = mood || sp0.mood || 'neutral';
    var key = 'P|' + specKey(idOrSpec) + '|' + mood;
    if (cache[key]) return cache[key];
    var c = document.createElement('canvas'); c.width = S.PW; c.height = S.PH;
    try { drawPortrait(c.getContext('2d'), sp0, mood); } catch (e) { G.reportError(e, 'portrait'); }
    cache[key] = c;
    return c;
  };
  /** Does this id resolve to a defined character (for portraits in dialogue)? */
  S.exists = function (id) { return typeof id === 'object' || !!G.lookup('cast', id); };
  S.name = function (id) { var s = S.spec(id); return s.name != null ? s.name : U.cap(id); };
})();
