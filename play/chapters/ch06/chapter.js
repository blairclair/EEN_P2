/* =========================================================================
 * ch06 "Applause"  (Saturday 13 January 2084)
 *
 * 1. DPE execution memo, then John's execution played from John's head
 *    (3rd person, the Execution Amphitheatre): the walk across the stage,
 *    crowd vignettes, the app poll on the method (injection wins and the
 *    player can't change it), Not-Trader, the gurney, the memory set piece
 *    (custom minigame 'memory'), and the applause.
 * 2. Screening Room: Trader's one-on-one on camera ("How do you feel?").
 * 3. Lounge: the aftermath (Kessie, Isaiah, Carol dissociating, Delphin,
 *    Annette knitting, Trader's "Why did it have to be him?",
 *    "Didn't you notice the resemblance?").
 * 4. Bedroom Hall at night: the drunk Trader corners Luna (three timed
 *    beats); Delphin tackles him off.
 * 5. Flashback (Columbus dorm, Luna at 8): her mother on the screen.
 * 6. Library at night: Delphin's alliance. He is her ESTRANGED childhood
 *    friend (canon §0.3), so the pitch is argued against eighteen years of
 *    hostility, not offered to a stranger.
 *
 * Cross-chapter flags (CHAPTERS.md §2):
 *   reads  f_comforted_john   (John's last memory can be Luna at the cage)
 *          m_delphin          (>= 40: warm acceptance, else cautious)
 *          f_refused_vote_bloc (false: Delphin opens "Second time's the charm")
 *          m_audience         (via api.approval)
 *   sets   f_alliance_delphin (always true on exit)
 *          m_delphin          (+10 for the rescue)
 *          m_audience         (+5 if Luna hides behind determination)
 * Local flags: ch06_*.
 * ========================================================================= */
(function () {
  'use strict';

  /* ---------------------------------------------------------------------
   * Cast: only chapter-specific extras; recurring people come from shared.
   * ------------------------------------------------------------------- */
  var X = function (kind, seed, o) { return (G.shared && G.shared.extra) ? G.shared.extra(kind, seed, o) : G.Sprites.randomSpec(seed, o); };
  var cast = {
    not_trader: { extends: 'judge', name: 'Not-Trader' },
    doctor: { extends: 'medic', name: 'Doctor', hairStyle: 'short' },
    voice: { name: 'Voice' }
  };

  /* ---------------------------------------------------------------------
   * Props (pixel art, low-res canvas).
   * ------------------------------------------------------------------- */
  function px(g, x, y, w, h, c) { g.fillStyle = c; g.fillRect(x, y, w, h); }
  var props = {
    gurney: function (g, x, y) {
      // vertical gurney that fully covers the actor standing on this tile
      px(g, x, y - 13, 16, 30, '#2a2a30');
      px(g, x + 1, y - 12, 14, 27, '#e8ecee');
      px(g, x + 4, y - 11, 8, 6, '#e6c4a6'); px(g, x + 4, y - 11, 8, 2, '#5a4630');
      px(g, x + 3, y - 4, 10, 10, '#b8a888'); px(g, x + 4, y + 6, 3, 8, '#4a4a52'); px(g, x + 9, y + 6, 3, 8, '#4a4a52');
      px(g, x + 1, y - 2, 14, 1, '#222'); px(g, x + 1, y + 4, 14, 1, '#222'); px(g, x + 1, y + 10, 14, 1, '#222');
      px(g, x + 15, y - 6, 1, 10, '#8aa'); px(g, x + 16, y - 10, 3, 4, '#bcd');
    },
    dog: function (g, x, y, t) {
      var wag = Math.sin(t * 8) > 0 ? 1 : 0;
      px(g, x + 3, y + 8, 9, 4, '#8a6a4a'); px(g, x + 11, y + 5, 4, 4, '#8a6a4a'); px(g, x + 14, y + 7, 2, 1, '#222');
      px(g, x + 4, y + 12, 1, 3, '#6a4a2a'); px(g, x + 10, y + 12, 1, 3, '#6a4a2a'); px(g, x + 1, y + 7 + wag, 2, 1, '#8a6a4a');
    },
    couch: function (g, x, y, t) {
      // two-tile velvet couch; Trader passed out on it once ch06_traderOnCouch is set
      px(g, x + 1, y + 1, 30, 13, '#3a1a2a'); px(g, x + 2, y + 2, 28, 4, '#6a3a4a'); px(g, x + 2, y + 6, 28, 6, '#5a2a3a');
      px(g, x + 1, y + 4, 3, 9, '#4a2030'); px(g, x + 28, y + 4, 3, 9, '#4a2030'); px(g, x + 3, y + 13, 2, 2, '#1a0a10'); px(g, x + 27, y + 13, 2, 2, '#1a0a10');
      var f = G.Game && G.Game.state && G.Game.state.flags;
      if (!f || !f.ch06_traderOnCouch) return;
      px(g, x + 6, y + 4, 18, 6, '#f2f0ea'); px(g, x + 6, y + 9, 18, 1, '#c8c6c0'); px(g, x + 23, y + 3, 6, 6, '#d8a274'); px(g, x + 24, y + 3, 5, 2, '#e0c068');
      px(g, x + 3, y + 6, 4, 3, '#2a2a30');
      var z = (t * 0.8) % 1;
      g.globalAlpha = 1 - z; px(g, x + 28 + z * 4, y - 2 - z * 8, 3, 1, '#ddd'); px(g, x + 29 + z * 4, y - 1 - z * 8, 1, 1, '#ddd'); px(g, x + 28 + z * 4, y - z * 8, 3, 1, '#ddd'); g.globalAlpha = 1;
    },
    frozen: function (g, x, y, t) {
      // the screening-room screen, frozen on the last frame (abstract, no gore)
      px(g, x - 24, y + 1, 64, 13, '#0c0c12'); px(g, x - 22, y + 2, 60, 11, '#2a3038');
      px(g, x - 2, y + 7, 22, 3, '#e8ecee'); px(g, x + 14, y + 6, 4, 3, '#e6c4a6');
      if (Math.sin(t * 2) > 0) px(g, x + 32, y + 3, 2, 2, '#ff3040');
    }
  };

  /* ---------------------------------------------------------------------
   * MAPS: all shared (play/shared). Keys ARE the shared ids so the
   * cross-room doors link (screening -> hall -> foyer -> red hall -> lounge
   * / library). ONE constants object for every id and mark used below.
   * ------------------------------------------------------------------- */
  var ROOM = {
    amph: 'execution_amphitheatre',
    screening: 'house_screening_room',
    hall: 'house_bedroom_hall',
    foyer: 'house_foyer',
    redHall: 'house_red_hall',
    lounge: 'house_lounge',
    library: 'house_library',
    dorm: 'columbus_dorm'
  };
  // spawn/mark lookup with a literal fallback (marks verified against the shared files 2026-10-04)
  function at(map, name, dflt) { var p = G.shared && G.shared.at ? G.shared.at(map, name) : null; return p || dflt; }
  var MK = {
    cage: at(ROOM.amph, 'from_cage', [5, 4]),
    stage: at(ROOM.amph, 'stage_center', [15, 4]),
    wingR: at(ROOM.amph, 'wing_right', [26, 4]),
    crowd: at(ROOM.amph, 'crowd_front', [15, 12]),
    screenSeat: [4, 4],                                    // the aisle in front of the seats
    screenTrader: at(ROOM.screening, 'trader', [8, 2]),
    screenDoor: at(ROOM.screening, 'door', [4, 6]),
    loungeDoor: at(ROOM.lounge, 'from_red_hall', [6, 8]),
    hallStair: at(ROOM.hall, 'from_foyer', [3, 2]),
    hallDelphin: at(ROOM.hall, 'door_6', [21, 4]),
    nook: at(ROOM.library, 'nook', [10, 2]),
    libDoor: at(ROOM.library, 'from_red_hall', [6, 10])
  };

  // walking along the stage shows John somebody in the crowd
  function vignetteZone(id, x, who, lines, vendor) {
    return { id: id, at: [x, 2], w: 1, h: 5, once: true, run: async function (api) {
      await api.pan(who, 700);
      if (vendor) await api.say('vendor', 'Tomatoes, two for five! T-shirts! "I saw John die and all I got was this bloody T-shirt"!', { mood: 'happy' });
      for (var i = 0; i < lines.length; i++) await api.narrate(lines[i]);
      await api.cameraReset(600);
    } };
  }
  function npc(id, xy, spec, facing) { return { id: id, at: xy, spec: spec, facing: facing || 'up', turn: false }; }
  var amph = G.shared.map(ROOM.amph, {
    remove: ['gurney'],                                   // ours is wheeled in mid-scene (ch06_gurney)
    npcs: [
      npc('tb1', [10, 2], 'tb', 'down'), npc('tb2', [21, 2], 'tb', 'down'),
      { id: 'not_trader', at: MK.wingR, spec: 'not_trader', facing: 'left', visible: false, turn: false },
      { id: 'doctor', at: [14, 3], spec: 'doctor', facing: 'right', visible: false, turn: false },
      npc('sec1', at(ROOM.amph, 'security_1', [10, 8]), 'security', 'down'),
      npc('sec2', at(ROOM.amph, 'security_2', [13, 8]), 'security', 'down'),
      npc('sec3', at(ROOM.amph, 'security_3', [18, 8]), 'security', 'down'),
      npc('sec4', at(ROOM.amph, 'security_4', [21, 8]), 'security', 'down'),
      npc('widow', [4, 10], { extends: 'audience', name: 'The Widow', outfit: '#141418', outfit2: '#141418', hairStyle: 'bun', hair: '#2a1a12' }),
      npc('widow_f1', [2, 10], X('audience', 62)), npc('widow_f2', [5, 11], X('audience', 63)),
      npc('vip1', [26, 11], X('guest', 71)), npc('vip2', [28, 11], X('guest', 72)),
      npc('med', [6, 13], { extends: 'audience', name: 'Medical Student', outfit: '#e8eef0', outfit2: '#3a3a44', hairStyle: 'slick', accessory: 'glasses' }),
      npc('mom', [10, 13], { extends: 'audience', name: 'Mother', outfit: '#6a5a7a', hairStyle: 'long' }),
      npc('girl', [11, 13], 'kid'),
      npc('handler', [21, 13], { extends: 'security', name: 'Dog Handler', outfit: '#3a4a3a', outfit2: '#2a3028', accessory: 'cap' })
    ],
    objects: [
      { id: 'ch06_dog', at: [22, 13], draw: props.dog, solid: true }
    ],
    zones: [
      vignetteZone('z_widow', 7, 'widow', ['The front row is the place of honour. Here sits the wife of the man John killed, with her friends and family.', 'Some genuinely want to support her. Many just want a chance to appear on TV.']),
      vignetteZone('z_med', 9, 'med', ['A medical student. He told his professor that watching an execution would further his studies.', 'What he really wants is to understand why the sight of the light leaving a man\'s eyes wakes something hungry inside him. He\'s top of his class. His parents won\'t allow any less.']),
      vignetteZone('z_mom', 11, 'mom', ['A mother and her daughter clutch hands. They don\'t want to be here. They\'ve been given no choice.', 'The little girl has been saying things in public that stink of sedition. Last week: a knock on the door, an adjustment agent, two True Believers in tow, and tickets it was strongly suggested they accept.']),
      vignetteZone('z_dog', 12, 'handler', ['There\'s even a dog. He sniffs everyone at the turnstile. His handler casts uneasy glances at the stage between treats and praise.', 'He knows this isn\'t right. But work is work, and work pays in a way that unemployment never will.']),
      vignetteZone('z_vendor', 13, 'vendor_1', ['Across the country, thousands stare into their screens, praying: please, if there\'s anyone out there, please don\'t let me be next.', 'But still, they watch. They need the social credit, after all.'], true),
      { id: 'mark', at: [MK.stage[0], 2], w: 1, h: 5 }
    ]
  });

  var screening = G.shared.map(ROOM.screening, {
    npcs: [{ id: 'trader', at: MK.screenTrader, facing: 'left', visible: false }],
    objects: [
      { id: 'ch06_frozen', at: [3, 0], draw: props.frozen, solid: false, layer: 1, examine: [{ think: 'The last frame. He looks like he fell asleep on a bus. I can\'t stop looking at it.' }] }
    ],
    patch: { to_bedroom_hall: { locked: '!ch06_interviewDone', lockedText: [{ think: 'Not yet. He hasn\'t finished with me.' }] } }
  });

  var hall = G.shared.map(ROOM.hall, {
    dark: 0.55, playerLight: 44, ambient: 'tension',
    npcs: [
      { id: 'trader', at: [20, 2], facing: 'left', visible: false, turn: false },
      { id: 'delphin', at: MK.hallDelphin, facing: 'up', visible: false }
    ],
    objects: [
      { id: 'ch06_couch', at: [5, 4], draw: props.couch, solid: true, layer: 1,
        examine: function (api) { return api.has('ch06_traderOnCouch') ? api.think('Snoring. In a white suit. The most powerful man in the House, drooling on a cushion.') : api.narrate('A velvet couch at the top of the stairs. Nobody ever sits on it.'); } }
    ],
    zones: [{ id: 'ambush', at: [8, 1], w: 2, h: 4, if: 'ch06_loungeDone' }],
    patch: {
      to_screening_room: { locked: 'ch06_interviewDone', lockedText: [{ think: 'I am not going back in there.' }] },
      to_luna_room: { locked: true, lockedText: [{ think: 'Locked. The watch decides when I get to sleep.' }] }
    }
  });

  var foyer = G.shared.map(ROOM.foyer);

  var redHall = G.shared.map(ROOM.redHall, {
    patch: {
      to_lounge: { locked: 'ch06_loungeDone', lockedText: [{ think: 'Nobody left in there but Carol and a camera.' }] },
      to_library: { locked: '!ch06_rescued', lockedText: [{ think: 'Not tonight. Bed.' }] }
    }
  });

  var lounge = G.shared.map(ROOM.lounge, {
    npcs: [
      { id: 'trader', at: [6, 2], facing: 'down' },
      { id: 'kessie', at: [1, 4], facing: 'right' },
      { id: 'isaiah', at: [11, 7], facing: 'up' },
      { id: 'carol', at: [7, 4], facing: 'up', turn: false },
      { id: 'delphin', at: [3, 2], facing: 'down' },
      { id: 'annette', at: [11, 4], facing: 'left' },
      { id: 'cameraman', at: [1, 7], facing: 'right', turn: false }
    ],
    patch: {
      lounge_mirror: { examine: [{ think: 'The mirror Carol and Kessie fought over. Tonight nobody wants to look in it.' }] },
      lounge_screen: { examine: [{ think: 'Somebody turned it off. Somebody else turned it back on. The penguin logo floats there, smiling.' }] },
      to_red_hall: { locked: '!ch06_loungeDone', lockedText: [{ think: 'Not yet. I can\'t walk out on them like this.' }] }
    }
  });

  var dorm = G.shared.map(ROOM.dorm, {
    dark: 0.5, tint: '#4a3060', tintAlpha: 0.22, vignette: 0.8, ambient: 'static',
    lights: [{ at: [8, 2], r: 64, flicker: true }],
    npcs: [npc('kid1', [5, 4], 'kid'), npc('kid2', [10, 5], X('kid', 5)), npc('kid3', [11, 7], X('kid', 9), 'left')],
    patch: { to_columbus_lounge: { locked: true, lockedText: [{ think: 'My feet won\'t take me away from the screen.' }] } }
  });

  var library = G.shared.map(ROOM.library, {
    dark: 0.8, playerLight: 34, tint: '#10203a', tintAlpha: 0.25, vignette: 0.6,
    npcs: [{ id: 'delphin', at: MK.nook, facing: 'left' }],
    patch: {
      library_newberry: { examine: [{ think: 'The Newberry Twins, Book 9: Meet a Lion. Waverly would have finished it in an afternoon and made me guess the ending.' }] },
      library_nook: { examine: [{ think: 'The nook. The camera in the book spine can hear you here, but it can\'t see you.' }] }
    }
  });
  library.lights = [{ at: [9, 2], r: 40 }, { at: [2, 10], r: 22, flicker: true }];   // lamps off: replace, not append

  /* ---------------------------------------------------------------------
   * MINIGAMES
   * ------------------------------------------------------------------- */
  // The app poll on the giant screen. John can't vote. The player can't change it.
  var pollGame = {
    autoSolve: function () { return { success: true, method: 'injection' }; },
    start: function (ctx) {
      return new Promise(function (resolve) {
        var lines = ctx.params.lines || [];
        var shown = 0, nextAt = 1.4, done = false, R = ctx.R;
        ctx.loop(function () {
          if (done) return;
          if (shown < lines.length && ctx.t > nextAt) { shown++; nextAt = ctx.t + 2.4; ctx.sound('blip'); }
          if (ctx.input.pressed('ok') && ctx.t > 0.5) {
            if (shown < lines.length) { shown++; nextAt = ctx.t + 2.4; }
            else if (ctx.t > 6) { done = true; ctx.sound('sting'); resolve({ success: true, method: 'injection' }); }
          }
        }, function (t) {
          var prog = Math.min(1, ctx.t / 9);
          var e = prog * prog * (3 - 2 * prog);
          var inj = 50 + 44 * e + Math.sin(t * 7) * 3 * (1 - e);
          var hang = 100 - inj;
          R.rect(0, 0, ctx.W, ctx.H, '#07060a');
          R.rect(40, 14, 304, 112, '#0c0c14'); R.stroke(40, 14, 304, 112, '#c9a24a', 1);
          R.text('THE PEOPLE DECIDE', 192, 22, { size: 12, font: 'sans', align: 'center', color: '#fff' });
          R.text('HOW SHOULD JOHN MCDOHUE BE EXECUTED?', 192, 39, { size: 7, align: 'center', color: '#9a96a8' });
          [['HANGING', hang, '#6a7a8a'], ['INJECTION', inj, '#e8323c']].forEach(function (b, i) {
            var y = 58 + i * 28;
            R.text(b[0], 56, y + 3, { size: 8, color: '#e8e4d8' });
            R.rect(130, y, 180, 14, '#1a1a22');
            R.rect(130, y, 180 * b[1] / 100, 14, b[2]);
            R.text(Math.round(b[1]) + '%', 318, y + 3, { size: 8, color: '#fff' });
          });
          R.text(prog < 1 ? 'VOTES COUNTING  ' + Math.round(40000 * e + t * 13) + '' : 'RESULT: INJECTION', 192, 112, { size: 7, align: 'center', color: prog < 1 ? '#9a96a8' : '#e8323c' });
          for (var i = 0; i < shown; i++) {
            var l = lines[i];
            var y2 = 134 + (i - Math.max(0, shown - 5)) * 14;
            if (i < shown - 5) continue;
            R.text(l, 192, y2, { size: 8, font: 'serif', style: 'italic', align: 'center', color: i === shown - 1 ? '#e8e4d8' : '#6a6878' });
          }
          R.vignette(0.6); R.scanlines(0.15);
          ctx.footer(shown < lines.length ? 'He cannot vote. He cannot speak. He listens.' : (ctx.t > 6 ? 'E to continue' : ''));
        });
      });
    }
  };

  // John's last minutes: memories drift in the dark; the dark closes in; hold one.
  var memoryGame = {
    autoSolve: function (p) {
      var ids = (p.memories || []).map(function (m) { return m.id; });
      return { success: true, memory: p.autoPick && ids.indexOf(p.autoPick) >= 0 ? p.autoPick : ids[0] };
    },
    start: function (ctx) {
      return new Promise(function (resolve) {
        var R = ctx.R, W = ctx.W, H = ctx.H, cx = W / 2, cy = H / 2 - 4;
        var mems = ctx.params.memories.map(function (m, i, a) {
          return { m: m, orbit: 92 - i * (54 / Math.max(1, a.length - 1)), ang: i * (Math.PI * 2 / a.length) + 0.4, spd: 0.18 + (i % 2) * 0.07, alpha: 1, alive: true };
        });
        var cur = { x: cx, y: cy }, held = null, heldT = 0, pulseAt = 2.2, pulse = 0, done = false;
        function pos(o) { return { x: cx + Math.cos(o.ang) * o.orbit * 1.55, y: cy + Math.sin(o.ang) * o.orbit * 0.8 }; }
        function radius() { return Math.max(22, 128 - ctx.t * 4); }   // first memory fades ~9 s, last ~22 s
        ctx.loop(function (dt) {
          if (done) return;
          if (held) {
            heldT += dt;
            if (heldT > 1.2 && ctx.input.pressed('ok')) { done = true; resolve({ success: true, memory: held.m.id }); }
            return;
          }
          var d = ctx.input.dir ? ctx.input.dir() : { x: 0, y: 0 };
          var dx = (ctx.input.down('right') ? 1 : 0) - (ctx.input.down('left') ? 1 : 0);
          var dy = (ctx.input.down('down') ? 1 : 0) - (ctx.input.down('up') ? 1 : 0);
          if (!dx && !dy && d) { dx = d.x || 0; dy = d.y || 0; }
          cur.x += dx * 78 * dt; cur.y += dy * 78 * dt;
          if (ctx.t > pulseAt) { pulse = 1; pulseAt = ctx.t + Math.max(1.1, 2.6 - ctx.t * 0.04); ctx.sound('heartbeat'); cur.x += (Math.random() - 0.5) * 30; cur.y += (Math.random() - 0.5) * 22; }
          pulse = Math.max(0, pulse - dt * 1.6);
          var rad = radius();
          var ddx = (cur.x - cx) / 1.55, ddy = (cur.y - cy) / 0.8, dd = Math.sqrt(ddx * ddx + ddy * ddy);
          if (dd > rad - 4) { cur.x = cx + ddx / dd * (rad - 4) * 1.55; cur.y = cy + ddy / dd * (rad - 4) * 0.8; }
          var alive = 0, last = null;
          mems.forEach(function (o) {
            o.ang += o.spd * dt;
            if (o.alive && o.orbit > rad - 2) { o.alpha -= dt * 0.8; if (o.alpha <= 0) { o.alive = false; ctx.sound('miss'); } }
            if (o.alive) { alive++; last = o; }
          });
          var near = null;
          mems.forEach(function (o) { if (!o.alive) return; var p = pos(o); if (Math.abs(p.x - cur.x) < 14 && Math.abs(p.y - cur.y) < 11) near = o; });
          if (near && ctx.input.pressed('ok')) { held = near; ctx.sound('reveal'); }
          else if (alive === 1 && last.orbit > rad - 10) { held = last; ctx.sound('reveal'); }
          else if (alive === 0) { held = mems[mems.length - 1]; }
        }, function (t) {
          var g = R.ctx, rad = radius();
          R.rect(0, 0, W, H, '#000');
          g.save();
          g.translate(cx, cy); g.scale(1.55, 0.8);
          var grad = g.createRadialGradient(0, 0, 4, 0, 0, rad);
          grad.addColorStop(0, 'rgba(70,30,36,1)'); grad.addColorStop(0.75, 'rgba(30,10,16,1)'); grad.addColorStop(1, 'rgba(0,0,0,1)');
          g.fillStyle = grad; g.beginPath(); g.arc(0, 0, rad, 0, Math.PI * 2); g.fill();
          g.restore();
          mems.forEach(function (o) {
            if (!o.alive && o !== held) return;
            var p = pos(o), a = Math.max(0, o.alpha);
            g.save(); g.globalAlpha = a;
            var gl = g.createRadialGradient(p.x, p.y, 1, p.x, p.y, 13);
            gl.addColorStop(0, o.m.color); gl.addColorStop(1, 'rgba(0,0,0,0)');
            g.fillStyle = gl; g.beginPath(); g.arc(p.x, p.y, 13, 0, Math.PI * 2); g.fill();
            g.fillStyle = '#fff'; g.beginPath(); g.arc(p.x, p.y, 2.5 + Math.sin(t * 3 + o.orbit) * 0.6, 0, Math.PI * 2); g.fill();
            g.restore();
            var near = Math.abs(p.x - cur.x) < 26 && Math.abs(p.y - cur.y) < 20;
            if (!held) R.text(o.m.label, p.x, p.y - 22, { size: near ? 8 : 7, font: 'serif', style: 'italic', align: 'center', color: near ? '#f0e6d8' : '#8a7a80', alpha: a * (near ? 1 : 0.7) });
          });
          if (!held) {
            g.save(); g.fillStyle = 'rgba(255,236,200,0.9)'; g.beginPath(); g.arc(cur.x, cur.y, 3, 0, Math.PI * 2); g.fill();
            g.globalAlpha = 0.25; g.beginPath(); g.arc(cur.x, cur.y, 7, 0, Math.PI * 2); g.fill(); g.restore();
          }
          if (pulse > 0) R.rect(0, 0, W, H, '#a01020', pulse * 0.35);
          R.text(held ? '' : 'Everything is pain. Hold on to something.', W / 2, 8, { size: 8, font: 'serif', style: 'italic', align: 'center', color: '#c8a0a8' });
          if (held) {
            R.rect(30, H / 2 - 30, W - 60, 60, '#000', 0.75);
            R.text(held.m.label, W / 2, H / 2 - 24, { size: 10, font: 'serif', style: 'italic', align: 'center', color: held.m.color });
            R.wrap(held.m.text, W - 90, 8, 'serif', 'italic').forEach(function (l, i) {
              R.text(l, W / 2, H / 2 - 8 + i * 11, { size: 8, font: 'serif', style: 'italic', align: 'center', color: '#e8e4d8', alpha: Math.min(1, heldT * 2) });
            });
          }
          R.vignette(0.8);
          ctx.footer(held ? (heldT > 1.2 ? 'E' : '') : 'ARROWS reach for a memory  •  E hold it  •  the dark is closing');
        });
      });
    }
  };

  /* ---------------------------------------------------------------------
   * Small helpers
   * ------------------------------------------------------------------- */
  function drawMemo(t, s, a) {
    var R = G.Render;
    var W = G.W, H = G.H, x = 60, y = 8, w = W - 120, h = H - 16;
    R.rect(0, 0, W, H, '#0a0a0c');
    R.rect(x + 3, y + 3, w, h, '#000', 0.6);
    R.rect(x, y, w, h, '#e9e4d6');
    var ink = '#1c1a22';
    function tx(str, xx, yy, opt) { var p = { size: 7, color: ink, shadow: false, alpha: a }; Object.keys(opt || {}).forEach(function (k) { p[k] = opt[k]; }); R.text(str, xx, yy, p); }
    tx('DEPARTMENT OF PUNITIVE ENTERTAINMENT', W / 2, y + 8, { size: 9, font: 'sans', align: 'center' });
    tx('EXECUTION MEMO', W / 2, y + 21, { size: 8, align: 'center', color: '#8a1a22' });
    R.rect(x + 10, y + 32, w - 20, 0.6, ink);
    var note = 'Note: This memo is not to be distributed to any individual not employed by the Department of Punitive Entertainment. Failure to comply will lead to penalties such as prison time, execution, or participation in a DPE sponsored show.';
    R.wrap(note, w - 24, 6, 'serif', 'italic').forEach(function (l, i) { tx(l, x + 12, y + 37 + i * 8, { size: 6, font: 'serif', style: 'italic' }); });
    var rows = [['Name', 'John Mcdohue'], ['Crime', 'Murder 2'], ['Victim', 'Thomas Blue - Stockbroker at Golson Sacks'], ['Age', '43'], ['Date', 'January 13th, 2084'], ['Method', 'Audience selection (see app)']];
    rows.forEach(function (r, i) {
      var yy = y + 78 + i * 15;
      tx(r[0].toUpperCase(), x + 14, yy, { size: 7, color: '#5a5660' });
      tx(r[1], x + 70, yy, { size: 8, font: 'serif', style: '' });
      R.rect(x + 68, yy + 11, w - 84, 0.5, '#b8b0a0');
    });
    var g = R.ctx; g.save(); g.globalAlpha = 0.6 * a; g.translate(x + w - 56, y + h - 24); g.rotate(-0.18);
    g.strokeStyle = '#c0202a'; g.lineWidth = 1.5; g.strokeRect(-42, -9, 84, 18);
    R.text('APPROVED FOR BROADCAST', 0, -3, { size: 6, align: 'center', color: '#c0202a', shadow: false });
    g.restore();
  }

  /* ---------------------------------------------------------------------
   * PART 1: John
   * ------------------------------------------------------------------- */
  async function partJohn(api) {
    await api.slides([{ style: 'black', text: '', draw: drawMemo }]);
    api.setPlayer('john');
    await api.goRoom(ROOM.amph, { at: MK.cage, facing: 'right', fade: true });
    api.lockPlayer();
    await api.narrate('The execution chamber is enormous. A former amphitheatre, its vaulted ceilings so high that no creature but a bird could reach the top on its own.');
    await api.pan(MK.crowd, 1400);
    await api.narrate('Cameras fill the bottom three rows, pointing from every angle. Only the top three rows are left for human beings. Kites and balloons are taped up wherever the decorator gave up on order.');
    await api.cameraReset(900);
    api.onAir(true);
    api.lowerThird('EEN LIVE', 'THE PEOPLE DECIDE • JOHN MCDOHUE');
    api.sound('sting');
    await api.narrate('The curtains open. The national anthem blares. The audience stands as one, and salutes as the wheels of the cage roll across the stage.');
    await api.narrate('It\'s time to begin.');
    api.lowerThird(null);
    await api.narrate('So many people in one space. More than John has ever seen at once. All there for him. After all those years of bullying and neglect, he can\'t believe this many people are interested in anything he does.');
    await api.narrate('Even if that thing is his death.');
    api.unlockPlayer();

    await api.waitForZone('mark', { objective: 'Walk to the mark' });
    api.objective(null);
    api.lockPlayer();
    api.teleport(MK.stage, 'down');
    await api.narrate('He\'s parked at the centre of the stage, next to the noose. John wonders if it will hurt. He wonders if anyone would care if it does.');

    // Not-Trader
    api.show('not_trader');
    await api.move('not_trader', [MK.stage[0] + 2, MK.stage[1]], { speed: 34 });
    api.face('not_trader', 'down');
    await api.narrate('There\'s a man on stage now. He\'s not Trader, but someone close. Almost an older version of the television host John has gotten to know over the past week.');
    await api.narrate('He lacks Trader\'s showmanship. He speaks with a firm assurance that makes John want to obey.');
    await api.say('not_trader', 'Citizens. Thank you for coming.');
    await api.say('not_trader', 'You are here to witness justice. As a reward for being such loyal citizens, tonight the method is yours to select.');
    await api.say('not_trader', 'Hanging, or injection. Your app is open. Vote, just like on the show.');
    var poll = await api.minigame('poll', {
      lines: [
        '"I can\'t believe they\'re actually letting us choose. It\'s soo cool that this is an immersive event."',
        '"Yeah, but don\'t you feel a little bad about it? I mean, that guy seems terrified."',
        '"He\'s a criminal. He deserves it."',
        '"Moooom, I\'m thirsty."',
        '"Let\'s go to the snack bar and grab you something."',
        '"Did you catch the game last night?"   "Man, did they fumble that last catch!"'
      ]
    });
    api.set('ch06_method', poll.method || 'injection');
    await api.narrate('These will be the last words he ever hears. No one cares. No one ever cared. The vote is almost unanimous: a chemical, to stop his heart.');

    await api.move('not_trader', [MK.stage[0] + 1, MK.stage[1]], { speed: 30 });
    api.face('not_trader', 'left');
    await api.narrate('Not-Trader crouches down to acknowledge John for the first time. His cold sneer makes John feel disgusting. Worthless. Lower than trash.');
    await api.narrate('He wants to beg the man for forgiveness. Not for the murder he committed, but for the crime of being himself. He can\'t. They injected something to keep his voice from being heard.');
    await api.say('not_trader', ['It\'ll take about half an hour. You\'ll be in agony after ten minutes.', 'They know it too, it was explained in the app. They want to see you suffer.'], { mood: 'smug' });
    await api.narrate('John can tell the man wants to see him suffer too. He\'ll delight in it, even if no trace of it reaches his face.');

    // the gurney
    await api.fadeOut(500);
    api.addObject({ id: 'ch06_gurney', at: MK.stage, draw: props.gurney, solid: false, layer: 1 });
    api.placeNpc('tb1', [MK.stage[0] - 1, MK.stage[1] - 1], 'down'); api.placeNpc('tb2', [MK.stage[0] + 1, MK.stage[1] - 1], 'down');
    api.placeNpc('not_trader', [MK.stage[0] + 2, MK.stage[1]], 'left');
    api.show('doctor');
    await api.fadeIn(500);
    await api.narrate('True Believers flood the stage. They drag in a gurney. John is pulled from beside the noose and strapped to crisp white sheets.');
    await api.narrate('He is asked for his last words.');
    var lw = await api.choice(['(Say nothing.)', '(Try to speak.)']);
    api.set('ch06_johnTriedToSpeak', lw === 1);
    if (lw === 1) await api.narrate('His mouth opens. Nothing comes. Whatever they put in him took his voice hours ago. People haven\'t heard a word he\'s said his entire life. Why would they start now?');
    else await api.narrate('He doesn\'t bother. People haven\'t heard a word he\'s said his entire life.');

    await api.narrate('A man in a white coat and a mask hovers at the edge of his vision. John feels so exposed. An animal with its belly showing.');
    await api.narrate('Not-Trader takes his arm and wipes it with something cold that smells of chemicals. John shudders at the touch, and at the knowledge that this is it.');
    var st = await api.choice(['(Struggle.)', '(Lie still.)']);
    if (st === 0) {
      await api.shake(700, 3);
      await api.narrate('He thrashes against the straps so hard the doctor calls the guards to hold him down. Wouldn\'t want to miss a vein.');
    } else {
      await api.narrate('He doesn\'t resist. What would be the point?');
    }
    api.sound('heartbeat');
    await api.narrate('When the needle goes in, John finds he can make noise after all. Not speech. A low moan that breaks the silent spell over the audience.');
    await api.narrate('They watch, transfixed, for the first few minutes. Then they grow bored, and go back to their conversations.');
    await api.slides([{ style: 'black', text: 'Ten minutes.', ms: 1800 }]);
    api.flash('#801018', 500); api.sound('heartbeat');
    await api.shake(400, 2);
    await api.narrate('The pain begins. His moans become screams. Everything is pain.');
    await api.say('voice', '...honestly, if she doesn\'t get into Westbrook I don\'t know what we\'ll do with her.', { name: 'Voice in the crowd', portrait: false });
    await api.say('voice', 'Is he the one you\'re seeing now? The dentist?', { name: 'Voice in the crowd', portrait: false });
    api.flash('#801018', 500); api.sound('heartbeat');
    await api.narrate('He has gone through so much pain in his life. It comes back to him now, all of it at once, and somewhere inside it is something he could hold on to.');

    // the set piece
    var mems = [
      { id: 'sundays', label: 'Sundays, out back', color: '#8a6a5a', text: 'His father, every Sunday, toughening him up. Even this is his. Even now, the old man\'s hand is the one he finds.' },
      { id: 'sixteen', label: 'Running at sixteen', color: '#5aa0d8', text: 'The night he ran. Cold, and hungry, and homeless. But no one had the right to hurt him anymore.' },
      { id: 'beggar', label: 'The begging spot', color: '#c9a24a', text: 'The beautiful man in the good coat. John would have done anything for him. If only he hadn\'t turned out to be like everyone else.' },
      { id: 'carol', label: '"Care-bear"', color: '#e070a8', text: 'Carol saying his name like it belonged to someone. She was using him. He knew. It was so nice to have someone paying attention.' }
    ];
    var comforted = api.get('f_comforted_john', false);
    if (comforted) mems.push({ id: 'luna', label: 'The woman at the cage', color: '#f0e0b0', text: 'Luna, standing between him and the cane. Nobody had ever stood in front of him before. Not once. Not ever.' });
    var r = await api.minigame('memory', { memories: mems, autoPick: comforted ? 'luna' : 'sixteen' });
    var held = r.memory || (comforted ? 'luna' : 'sixteen');
    api.set('ch06_johnLastMemory', held);

    await api.narrate('The pain lessens. The darkness creeps in. John can no longer see, but he can still hear, and he can still feel. Fingers on his wrist. The doctor tells the crowd: less than a minute.');
    var after = {
      sundays: 'He holds on to the only hand he ever knew, and finds he is too tired to flinch from it.',
      sixteen: 'He holds on to the night he ran. Cold air. An open road. Nobody\'s.',
      beggar: 'He holds on to the good coat, the morning light, the man who never once looked down.',
      carol: 'He holds on to the sound of his name in somebody\'s mouth.',
      luna: 'He holds on to a red-haired woman between him and the cane. Somebody stood up. Somebody stood up for him.'
    };
    await api.narrate(after[held] || after.sixteen);
    await api.narrate('His last coherent thought is one that criminals throughout the world have shared before him. A silent scream into the abyss: I don\'t deserve this.');
    await api.narrate('Not-Trader is talking again. John is so, so tired, but he struggles to catch this one last line. He can\'t. He gives up.');
    api.onAir(false);
    await api.fadeOut(1400, '#000');
    api.ambient(null);
    api.sound('applause');
    await api.slides([
      { style: 'black', text: 'As John fades, he hears applause for the first time in his life…' },
      { style: 'black', text: 'The audience cheering him from one world to the next.' }
    ]);
    api.sound('applause');
    await api.wait(600);
  }

  /* ---------------------------------------------------------------------
   * PART 2: Screening Room
   * ------------------------------------------------------------------- */
  async function partScreening(api) {
    api.setPlayer('luna');
    await api.goRoom(ROOM.screening, { at: MK.screenSeat, facing: 'up', fade: false });
    await api.fadeIn(900);
    api.lockPlayer();
    await api.narrate('The screen freezes on the final frame. John, slack on the white sheets like a discarded doll. No blood. No spectacle. Just the silence after something irreversible.');
    await api.think('I don\'t realise I\'m shaking until my fingers slip from where they\'re clenched against my side.');
    api.sound('camera');
    await api.narrate('A mechanical whir behind me, then a soft click. A camera extends from the ceiling and turns toward me like a predator sniffing a fresh scent.');
    api.onAir(true);
    api.approval(true);
    api.lowerThird('LUNA BARTLEY', 'Reaction cam • Screening Room');
    api.show('trader');
    await api.move('trader', [MK.screenSeat[0] + 1, MK.screenSeat[1]], { speed: 50 });
    api.face('trader', 'player'); api.face('player', 'trader');
    await api.say('trader', 'Luna. How are you feeling?');
    var c = await api.choice([
      { text: 'I feel like I just watched someone I knew die. On television. While being filmed.', set: { ch06_interviewHonest: true } },
      { text: '(Hide behind determination.) "Like I need to win. That\'s all."', set: { ch06_interviewHonest: false } }
    ]);
    if (c === 0) {
      await api.say('trader', 'John was the lowest-ranked contestant. The people spoke.');
      await api.say('luna', 'The people. What would you feel if it was you sitting in this chair? If you had to watch someone gentle and scared get killed because a bunch of strangers thought he was bad TV?');
      await api.say('trader', 'I would never be in that situation.');
      await api.say('luna', 'Right. Because you\'re not a criminal.');
      await api.say('trader', 'Correct.', { mood: 'smug' });
      await api.say('luna', 'He killed one man. How many has this show killed?');
      await api.say('trader', 'None, darling. The show doesn\'t vote. The people vote. I just hold the microphone.');
      await api.say('luna', 'And somebody holds the needle. And everybody claps.');
      await api.say('trader', 'Applause is how a nation says it\'s been heard.', { mood: 'neutral' });
      await api.think('He doesn\'t blink. But his thumb is working at the edge of his handkerchief like he\'s trying to rub a stain out of it.');
      await api.say('luna', 'And yet you get to sleep at night. Convenient.');
    } else {
      await api.say('luna', 'Like I need to win. That\'s all. That\'s all any of us can do now.');
      await api.say('trader', 'Now that is the spirit the people want to see. Simply stupendous.', { mood: 'happy' });
      api.approvalAdd(5);
      await api.think('I said it with my chin up and my eyes dry. I don\'t know who that was. Waverly, please don\'t have been watching.');
    }
    api.lowerThird(null);
    api.sound('buzzer');
    await api.slides([{ style: 'screen', text: 'AUDIENCE RANKINGS UPDATED\nCURRENT STANDING: 2ND' }]);
    await api.think('Of course. Rewarded for the pain. For the tears. For performing humanity in a world that profits off erasing it.');
    await api.say('trader', 'Your housemates are in the lounge. Go on. The people like a group shot.');
    await api.move('trader', MK.screenDoor, { speed: 50 });
    api.hide('trader');
    api.onAir(false);
    api.approval(false);
    api.set('ch06_interviewDone', true);
    api.unlockPlayer();
    await api.think('The red dot stays on. Always recording. Always watching.');
    await api.waitForRoom(ROOM.lounge, { objective: 'Go down to the lounge' });
    api.objective(null);
  }

  /* ---------------------------------------------------------------------
   * PART 3: Lounge
   * ------------------------------------------------------------------- */
  async function partLounge(api) {
    api.lockPlayer();
    await api.narrate('Everyone is here, and nobody is talking. The cameraman stays in the corner, kneeling for reaction shots.');
    api.unlockPlayer();

    api.onInteract('kessie', async function (api) {
      if (api.has('ch06_talkKessie')) { await api.say('kessie', 'I\'m alright. I\'m alright. Go see to the others.', { mood: 'sad' }); return; }
      await api.emote('kessie', '…');
      await api.say('kessie', 'That was sick. I think I\'m going to puke.', { mood: 'sad' });
      var k = await api.choice(['(Rub her back.)', 'Breathe. In through your nose.', 'You don\'t have to watch the next one.']);
      if (k === 2) await api.say('kessie', 'Yes, I do. They check. You know they check.', { mood: 'fear' });
      else await api.say('kessie', 'Two squirts of bleach and a strong stomach. My mama said that\'s all a kitchen needs. I only ever had the bleach.', { mood: 'sad' });
      api.set('ch06_talkKessie', true);
    });
    api.onInteract('isaiah', async function (api) {
      if (api.has('ch06_talkIsaiah')) { await api.say('isaiah', 'I keep counting the seconds of it. I can\'t stop.', { mood: 'sad' }); return; }
      await api.say('isaiah', ['I can\'t believe they all clapped for him.', 'Can you imagine going out like that? Hearing everyone applauding your death?'], { mood: 'shock' });
      var i = await api.choice(['Maybe he didn\'t hear it.', 'It\'s a show. Clapping is what they do.', '(Say nothing.)']);
      if (i === 0) await api.say('isaiah', 'Hearing is the last sense to go. I read that. I wish I hadn\'t.', { mood: 'sad' });
      else if (i === 1) await api.say('isaiah', 'That\'s worse. You know that\'s worse, right?', { mood: 'angry' });
      await api.say('isaiah', 'This is a nightmare.', { mood: 'sad' });
      api.set('ch06_talkIsaiah', true);
    });
    api.onInteract('carol', async function (api) {
      if (api.has('ch06_talkCarol')) { await api.narrate('Carol\'s hands wring against each other like duelling moths, pausing only to wipe away a single tear.'); return; }
      await api.narrate('Carol\'s mouth hangs open, eyes still glued to the screen. She mutters nonsense syllables.');
      await api.say('luna', 'Carol? Are you okay?');
      await api.think('That\'s a stupid question. None of us are okay.');
      api.placeNpc('delphin', freeTile(api, [[6, 4], [8, 4], [8, 5], [6, 5]]), 'right');
      api.face('delphin', 'carol');
      await api.say('delphin', 'I think what she\'s trying to ask is, on a scale from harmless rambling to full-on cannibalism, how crazy are you right now? Because if you\'ve got a sudden hankering for people, I\'d like to leave now.', { mood: 'smug' });
      api.face('carol', 'left');
      await api.narrate('Carol slowly twists her head until she meets my eyes. Her stare is glassy. No hint of recognition.');
      await api.say('carol', 'Carol\'s not here right now.', { mood: 'neutral' });
      await api.say('delphin', 'Oh for fuck\'s sake. Get it together. I can\'t handle this level of nuts. I\'m barely hanging on here as it is.', { mood: 'angry' });
      await api.think('I\'ve seen this before. So has he. At Columbus, some kids found pills, some found blades, and some went so deep inside themselves you couldn\'t pull them back out.');
      await api.think('Carol isn\'t kind. She\'s still a victim of the system, in my book.');
      api.face('carol', 'up');
      api.set('ch06_talkCarol', true);
    });
    api.onInteract('delphin', async function (api) {
      await api.say('delphin', 'Don\'t look at me like that, red. I\'m doing my grieving out loud. It\'s healthier.', { mood: 'tired' });
      var d = await api.choice(['Don\'t call me that.', '(Walk away.)']);
      if (d === 0) await api.say('delphin', 'Eighteen years and that\'s still the line you go with. Noted.', { mood: 'smug' });
      api.set('ch06_talkDelphin', true);
    });
    api.onInteract('annette', async function (api) {
      await api.narrate('Metal against metal. Annette has her knitting needles out again, the scarf taking shape in her lap.');
      await api.think('I don\'t know how she can hold those after what we just watched. The way the point went into his skin. I won\'t be able to touch a needle of any kind for a long time.');
      await api.say('annette', 'Sit down, dearie. You\'re blocking my light.', { mood: 'smug' });
      api.set('ch06_talkAnnette', true);
    });
    api.onInteract('trader', async function (api) {
      await api.narrate('Trader is staring at the blank wall screen as if it\'s still playing.');
      await api.say('trader', 'Not now, sweetheart.', { mood: 'tired' });
    });
    api.onInteract('cameraman', [{ think: 'He kneels when someone cries. He has a little foam pad for it.' }]);

    await api.until(function (f) { return f.ch06_talkKessie && f.ch06_talkIsaiah && f.ch06_talkCarol; }, {
      objective: 'Check on the others', targets: ['kessie', 'isaiah', 'carol']
    });
    api.objective(null);
    api.lockPlayer();

    // Trader breaks
    await api.pan('trader', 600);
    await api.emote('trader', '!');
    await api.narrate('Trader stands abruptly. His face is pale.');
    await api.say('trader', 'Why did it have to be him?', { mood: 'sad' });
    await api.say('kessie', 'Come again?');
    await api.say('trader', 'Nothing. Don\'t worry about it.');
    await api.cameraReset(400);
    await api.move('trader', MK.loungeDoor, { speed: 70 });
    api.hide('trader');
    await api.say('delphin', 'That was interesting. What\'s stuck up his craw?');
    await api.say('luna', 'Probably something to do with this mysterious him, yeah?');
    await api.think('Waverly loves puzzles. My heart throbs.');
    await api.narrate('Annette scoffs and puts down her knitting. Two hands on her cane, she hoists herself up.');
    await api.say('annette', 'Fools. Didn\'t you notice the resemblance? You all make me so tired.', { mood: 'angry' });
    var a = await api.choice(['Resemblance to whom?', '(Let her go.)']);
    if (a === 0) { api.set('ch06_askedResemblance', true); await api.say('annette', 'Use your eyes, dear.', { mood: 'smug' }); }
    await api.move('annette', MK.loungeDoor, { speed: 30 });
    api.hide('annette');
    await api.say('kessie', 'Resemblance? What could she mean by that?');
    await api.think('The man on the stage. An older version of the television host. I saw it and didn\'t let myself see it.');
    await api.say('isaiah', 'Don\'t know. I\'m going to go lie down. I have a lot to think about.', { mood: 'tired' });
    await api.say('delphin', 'Don\'t let us stop you. In fact, let us join you.');
    await api.move('isaiah', MK.loungeDoor, { speed: 60 }); api.hide('isaiah');
    await api.move('delphin', MK.loungeDoor, { speed: 60 }); api.hide('delphin');
    await api.say('kessie', 'There\'s nothing we can do for her. She made her choices. Now she\'ll have to deal with the consequences.', { mood: 'neutral' });
    await api.think('It\'s harsh. Too harsh. She\'s right, though.');
    var s = await api.choice(['(Sit with Carol a while.)', '(Leave her.)']);
    if (s === 0) {
      api.set('ch06_satWithCarol', true);
      await api.narrate('I sit on the carpet beside her. Kessie watches, then goes. Carol doesn\'t look at me. After a long time she speaks, in her own voice.');
      await api.say('carol', 'He asked. Everybody heard him ask.', { mood: 'cry' });
      await api.think('They did. They gave him what he asked for, and then they clapped.');
    } else {
      await api.think('I\'m so tired. I want to lie down, rest my head on that soft pillow, and dream of Waverly.');
    }
    api.set('ch06_loungeDone', true);
    api.unlockPlayer();
    await api.waitForRoom(ROOM.hall, { objective: 'Go up to bed before lockdown' });
    api.objective(null);
  }

  /* ---------------------------------------------------------------------
   * PART 4: the drunk Trader
   * ------------------------------------------------------------------- */
  function freeTile(api, list) {
    var me = api.playerTile();
    for (var i = 0; i < list.length; i++) if (list[i][0] !== me.x || list[i][1] !== me.y) return list[i];
    return list[list.length - 1];
  }
  function timed(api, opts, ms, fallback) { return api.choice(opts, { timer: ms, timeoutPick: fallback }); }
  async function partHall(api) {
    api.lockPlayer();
    await api.slides([{ style: 'screen', text: 'LOCKDOWN 23:00\nTIME REMAINING: 00:14:12\nRETURN TO ROOM 3' }]);
    await api.think('The hallways are dark at night. Spooky. I want to spend as little time in them as possible.');
    api.unlockPlayer();
    await api.waitForZone('ambush', { objective: 'Get to Room 3' });
    api.objective(null);
    api.lockPlayer();
    var me = api.playerTile();
    api.sound('hit');
    await api.shake(300, 2);
    api.show('trader');
    await api.narrate('A crash at the end of the hall. A man stumbles out of the dark.');
    api.placeNpc('trader', [me.x + 8, 2], 'left');
    await api.move('trader', [me.x + 2, 2], { speed: 34 });
    api.face('player', 'trader');
    await api.say('trader', '\'S you. You\'re dead.', { mood: 'cry' });
    await api.think('He reeks of gin. His pupils are huge.');

    // beat 1
    var b1 = await timed(api, ['Not yet. Hopefully never.', '(Duck under his arm.)', '(Freeze.)'], 7, 2);
    api.teleport([me.x, 1], 'down');
    if (b1 === 0) await api.narrate('He doesn\'t seem to process what I said. He keeps coming until my back hits the wall.');
    else if (b1 === 1) await api.narrate('I duck, and he catches a fistful of my sleeve without even looking, and walks me backwards into the wall.');
    else await api.narrate('My legs don\'t move. He keeps coming until my back hits the wall.');
    await api.move('trader', [me.x + 1, 2], { speed: 30 });   // diagonal, so both faces stay visible
    api.face('trader', 'left');
    await api.say('trader', 'Why? Why you do that to me? I love you.', { mood: 'cry' });
    await api.think('What?');

    // beat 2
    var b2 = await timed(api, ['I\'m not her!', '(Push him away.)', '(Freeze.)'], 6, 2);
    if (b2 === 0) {
      api.set('ch06_saidNotHer', true);
      await api.say('trader', 'Not true! I know what you did. You bitch!', { mood: 'angry' });
      await api.think('Her. Not me. Someone he thinks I am. Someone he loved, and hates for it.');
    } else {
      if (b2 === 1) {
        api.set('ch06_pushedTrader', true);
        var q = await api.minigame('qte', { mode: 'mash', target: 34, time: 4, decay: 16, title: 'PUSH HIM OFF', prompt: 'He is so much heavier than he looks.' });
        await api.narrate(q.success && !q.auto ? 'He staggers back half a step, then he\'s on me again, heavier.' : 'I shove with everything I have. He doesn\'t even notice.');
      }
      await api.say('luna', 'Okay. You don\'t know who you\'re talking to. You should get to bed and sleep this off.');
      await api.say('trader', 'Not true! I know what you did. You bitch!', { mood: 'angry' });
    }

    // beat 3
    api.sound('hit');
    await api.shake(300, 3);
    await api.narrate('His hand closes around my wrist. The other comes up toward my face, fingers spread, as if he means to hold it still and look at someone who isn\'t there.');
    var b3 = await timed(api, ['Trader. Look at me. I\'m Luna.', '(Push him.)', '(Freeze.)'], 4, 2);
    if (b3 === 2) await api.think('My body has gone somewhere I can\'t follow. I\'m small again. I can\'t move.');
    else if (b3 === 1) await api.think('I push. It\'s like pushing a wall that breathes gin.');
    else await api.think('He doesn\'t hear his name. He doesn\'t hear mine.');

    // Delphin
    api.show('delphin');
    api.placeNpc('delphin', MK.hallDelphin, 'up');
    await api.move('delphin', [me.x + 2, 3], { speed: 130 });
    api.flash('#ffffff', 200); api.sound('hit');
    await api.shake(500, 4);
    await api.narrate('Something blue hits Trader from the side. Delphin. They go down together on the carpet, and Delphin comes up first.');
    api.placeNpc('trader', [me.x + 3, 3], 'left');
    api.face('delphin', 'right');
    await api.narrate('Trader lies where he fell. His moans turn to snores almost instantly.');
    api.set('ch06_rescued', true);
    api.add('m_delphin', 10);
    if (api.get('m_delphin', 0) > 100) api.set('m_delphin', 100);
    api.face('delphin', 'player');
    await api.say('delphin', 'What was that about?', { mood: 'shock' });
    await api.say('luna', 'I don\'t know. I think -');
    await partFlashback(api);

    // back
    await api.goRoom(ROOM.hall, { at: [me.x, 1], facing: 'down', fade: false });
    api.lockPlayer();
    api.show('delphin'); api.show('trader');
    api.placeNpc('delphin', [me.x + 1, 2], 'left'); api.placeNpc('trader', [me.x + 3, 3], 'left');
    api.face('delphin', 'player');
    await api.fadeIn(500);
    await api.say('delphin', 'Where do you go? When you zone out like that, where do you go?', { mood: 'neutral' });
    await api.say('luna', 'I don\'t understand it myself. I\'ve got these flashes of memories rising to the surface. Like they\'ve been drowning my whole life and only now learned to float.');
    await api.think('I don\'t know why I tell him. Maybe because he\'s the one who pulled a drunk off me. Maybe because there\'s nobody else awake to tell.');
    await api.say('delphin', 'Help me with him. Feet. Don\'t look at his face, it\'s worse when you look.');
    await api.narrate('We drag Trader down the hall by his armpits and his expensive shoes and dump him on the couch at the top of the stairs. He doesn\'t wake.');
    api.hide('trader');
    api.set('ch06_traderOnCouch', true);
    api.placeNpc('delphin', [7, 3], 'left');
    api.teleport([8, 3], 'left');
    await api.say('delphin', 'Library. Now.');
    await api.say('luna', 'It\'s nearly lockdown.');
    await api.say('delphin', 'Then walk. Stairwell\'s audio only. Running gets you noticed, walking doesn\'t.', { mood: 'smug' });
    await api.move('delphin', MK.hallStair, { speed: 60 });
    api.hide('delphin');
    api.unlockPlayer();
    await api.waitForRoom(ROOM.library, { objective: 'Meet Delphin in the library' });
    api.objective(null);
  }

  /* ---------------------------------------------------------------------
   * PART 5: flashback
   * ------------------------------------------------------------------- */
  async function partFlashback(api) {
    api.sound('static');
    await api.fadeOut(700, '#ffffff');
    await api.think('The slow zoom into my head. Everything around me disappearing, replaced by a past I don\'t recognise.');
    api.setPlayer('luna_child_columbus');
    await api.goRoom(ROOM.dorm, { at: [8, 5], facing: 'up', fade: false });
    await api.fadeIn(900);
    await api.think('I\'m eight. The room is full of bunk beds and nobody is sleeping. Everybody is looking at the screen.');
    await api.waitForInteract('dorm_tv', { objective: 'Watch the screen' });
    api.lockPlayer();
    await api.tv([
      { speaker: 'franchesca_show', headline: 'Rebellion Special', text: 'A woman in a grey jumpsuit under hard white lights. Red hair. My hair. My mother.' },
      { speaker: 'franchesca_show', mood: 'neutral', headline: 'Rebellion Special', text: 'A voice behind her, distorted, screaming: "Traitor. Harlot!"' },
      { speaker: 'franchesca_show', mood: 'happy', headline: 'Rebellion Special', text: 'She smiles and shakes her head. "Who\'s the real traitor. Me or the ones destroying this world?"' }
    ]);
    await api.say('kid1', 'That\'s her. That\'s the traitor\'s kid.', { mood: 'smug' });
    await api.think('Every face in the room turns to me.');
    api.sound('static');
    await api.fadeOut(600, '#ffffff');
    api.unlockPlayer();
    api.setPlayer('luna');
  }

  /* ---------------------------------------------------------------------
   * PART 6: the alliance
   * ------------------------------------------------------------------- */
  async function partLibrary(api) {
    api.lockPlayer();
    await api.narrate('The library is dark. Lamps off but the one in the nook, turned down to an ember. The brightest thing in the room is the vibrant blue of Delphin\'s hair.');
    await api.think('The nook. The one place the spine-camera can\'t see. Of course he knows it. He taught me to find places like this.');
    api.unlockPlayer();
    await api.waitForInteract('delphin', { objective: 'Talk to Delphin in the reading nook' });
    api.lockPlayer();
    api.face('delphin', 'player');
    var bloc = api.get('f_refused_vote_bloc', true);
    await api.say('luna', 'What do you want, Delphin? I\'m too tired to play games.');
    if (!bloc) {
      await api.say('delphin', 'Second time\'s the charm.', { mood: 'smug' });
      await api.say('luna', 'I said yes to your vote bloc. You looked at me like I\'d picked your pocket.');
      await api.say('delphin', 'Because you said it too easily, red. This time I want you to mean it.');
    } else {
      await api.say('delphin', 'I\'ll get right to it, then. I think you and I should team up.');
      await api.say('luna', 'I already told you no. In the lounge. Why in the world would I ever go along with one of your plans?');
      await api.say('delphin', 'That was a vote bloc. This is different. This is me asking.', { mood: 'neutral' });
    }
    await api.say('delphin', 'And before you say it: I know. We grew up in the same group home, but we\'re not friends. You\'ve made that abundantly clear.', { mood: 'tired' });

    // her hostility first; the pitch only lands once the history is on the table
    var asked = {};
    for (var guard = 0; guard < 8; guard++) {
      var opts = [
        { text: 'How can I be sure I can trust you? Only one of us can win.', if: function () { return !asked.trust; } },
        { text: 'Eighteen years, Delphin. You slapped me and left me in the rain.', if: function () { return !asked.rain; } },
        { text: 'Why me? Isaiah is smarter. Carol is more ruthless.', if: function () { return !asked.why; } },
        { text: 'What would it even look like?', if: function () { return !asked.what; } },
        { text: 'Get to the point.', if: function () { return asked.rain; } }
      ];
      var q = await api.choice(opts);
      if (q === 0) {
        asked.trust = true;
        await api.say('delphin', 'Not true. Only one of us can walk away with our freedom and the prize money. But the other one can still survive.');
      } else if (q === 1) {
        asked.rain = true;
        api.set('ch06_raisedRain', true);
        await api.narrate('He goes very still. Even the blue of his hair seems to stop moving.');
        await api.say('delphin', 'I know what I did.', { mood: 'sad' });
        await api.say('luna', 'Do you? You told them it was my fault. Three days in the closet under the stairs. I was fourteen.');
        await api.say('delphin', 'And I was sixteen, and my sister was in a ravine.', { mood: 'angry' });
        await api.think('There it is. The flinch behind his eyes. Whatever he\'s carrying from that night, it lives right there, and he guards it like a dog.');
        await api.say('delphin', 'I\'m not asking you to forgive me tonight, red. I\'m asking you to survive. Those are different favours.', { mood: 'tired' });
        await api.think('And I still haven\'t told a soul what I saw at the tree line. He knows I haven\'t.');
      } else if (q === 2) {
        asked.why = true;
        await api.say('delphin', 'You underestimate yourself, red. You are both smart and ruthless when you need to be. I should know. I taught you half of it.', { mood: 'smug' });
        await api.think('He did. Which corridor to cry in. Which adult to cry to. How to lie with your whole face.');
      } else if (q === 3) {
        asked.what = true;
        await api.say('delphin', 'It wouldn\'t have to be much. We share any information we pick up. We promise not to vote for each other. Whatever we need to become the final two, and then we duke it out from there.');
      } else break;
    }

    await api.say('delphin', 'But I think we both know the real reason I want you.');
    await api.say('luna', 'The group home thing.');
    await api.say('delphin', 'That\'s right, the group home thing. Us home kids gotta stick together, during the best of times and the worst. We came from the same place, and we\'ve got the same scars.');
    await api.narrate('He leans into the lamplight and slowly rolls up his sleeve. Big and red, running the length of his forearm: HK-1082903.');
    await api.think('A disciplinary tattoo. The programme that numbered the "worst" home kids and kept them in pods, away from the rest of us. It lasted one year. The tattoos are forever.');
    await api.think('They put him in the pods the month after Salina. I was in the closet when they took him. By the time I came out, he was a number, and he never looked at me again.');
    await api.say('delphin', 'I know you know what this means. And that\'s why I choose you, red. Join me. Become my ally.', { mood: 'neutral' });
    await api.say('delphin', 'Together, we\'ll tear this fucking show apart. We\'ll fly to the top and steal the crown right off Trader\'s head.', { mood: 'smug' });
    await api.think('A little blue flame, deep in my gut. Poor fucking kid. If anyone ever did that to Waverly, there wouldn\'t be enough of them left to bury.');

    var warm = api.get('m_delphin', 15) >= 40;
    var accepted = false;
    for (var tries = 0; tries < 2 && !accepted; tries++) {
      var opts2 = [
        { text: 'Okay. Let\'s win this thing.', if: function () { return warm; } },
        { text: 'Fine. Allies. Not friends.', if: function () { return !warm; } },
        { text: 'No.', if: function () { return tries === 0; } }
      ];
      var ans = await api.choice(opts2);
      if (ans === 2) {
        await api.say('delphin', 'What\'s stopping you? What do you have to lose?');
        await api.think('Only everything in the world. My life. My daughter. Any chance at a better one, all in the bin because of one wrong choice.');
        await api.think('And if I say no, I walk out of here with nobody at all.');
        continue;
      }
      accepted = true;
      api.set('ch06_allianceTone', ans === 0 ? 'warm' : 'cautious');
      if (ans === 0) await api.say('delphin', 'Good. Fuck em. Fuck em all.', { mood: 'happy' });
      else { await api.say('delphin', 'Not friends. Got it. Loud and clear.', { mood: 'tired' }); await api.say('delphin', 'Fuck em anyway. Fuck em all.', { mood: 'smug' }); }
    }
    if (!accepted) { api.set('ch06_allianceTone', warm ? 'warm' : 'cautious'); }
    api.set('f_alliance_delphin', true);
    await api.narrate('He rolls his sleeve back down.');
    await api.say('delphin', 'As part of our alliance, I\'ll help you unlock these mysterious memories.');
    await api.say('luna', 'Wait, I didn\'t -');
    await api.say('delphin', 'Too late. I\'ve decided I\'m helping now.', { mood: 'happy' });
    await api.think('Oh joy. What have I gotten myself into this time?');
    await api.think('Is it really so bad that I agree?');
    await api.fadeOut(1200);
    await api.slides([
      { style: 'black', text: 'Upstairs, Trader snores on a couch in the dark. The cameras keep him company.' },
      { style: 'black', text: 'Somewhere, a recording of a crowd is still applauding.' }
    ]);
  }

  /* ---------------------------------------------------------------------
   * CHAPTER
   * ------------------------------------------------------------------- */
  G.registerChapter({
    id: 'ch06',
    title: 'Applause',
    kicker: 'SATURDAY 13 JANUARY 2084',
    maps: { execution_amphitheatre: amph, house_screening_room: screening, house_bedroom_hall: hall, house_foyer: foyer,
            house_red_hall: redHall, house_lounge: lounge, house_library: library, columbus_dorm: dorm },
    cast: cast,
    minigames: { poll: pollGame, memory: memoryGame },
    testDefaults: { m_audience: 45, m_delphin: 20, f_comforted_john: true, f_refused_vote_bloc: true },

    start: async function (api) {
      await partJohn(api);
      await partScreening(api);
      await partLounge(api);
      await partHall(api);
      await partLibrary(api);
      api.completeChapter();
    }
  });
})();
