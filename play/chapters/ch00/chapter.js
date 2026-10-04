/* =========================================================================
 * ch00 "Rehearsal": REFERENCE / TUTORIAL CHAPTER
 *
 * Copy this file's structure for your chapter. It demonstrates every engine
 * feature: two rooms + a door (with a locked condition), NPCs (static,
 * wandering, path-following), examine objects, a step-on zone, branching
 * dialogue with choices and flags (data-script AND async styles), inner
 * monologue, a cutscene (move / pan / shake / flash), a title card, a TV
 * broadcast overlay, the ON AIR light, the approval meter, a lower third,
 * all four generic minigames, and completion.
 *
 * RULES (see ENGINE_API.md):
 *  - Only touch files in chapters/ch00/.
 *  - Chapter-local flags are prefixed with the chapter id: ch00_xxx.
 *  - Cross-chapter flags are camelCase without prefix (e.g. votedFor).
 *  - Every free-roam wait must be autoplay-able: waitForInteract / waitForZone /
 *    waitForRoom / until({targets}) / objective({target}).
 * ========================================================================= */
(function () {
  'use strict';

  /* ---------------------------------------------------------------------
   * MAPS: ASCII rows + default legend (see ENGINE_API.md "Map legend").
   * Map ids are local; the engine stores them as 'ch00:greenroom'.
   * ------------------------------------------------------------------- */
  var greenroom = {
    name: 'Green Room',
    tiles: [
      '####W####W####D####',
      '#b..b..b.#:KKSOF:.#',
      '#,,,,,,,,#::::::::#',
      '#,,,,,,,,#:::TT:::#',
      '#,,,RR,,,.::::::::#',
      '#,,,RR,,,#:::TT:::#',
      '#hh,,,,,,#::::::::#',
      '#V.,,,,,P#::::::P:#',
      '###################'
    ],
    spawn: [2, 2],                 // default arrival tile (or put '@' in the map)
    ambient: 'hum',                // background drone while in this room
    tint: '#203040', tintAlpha: 0.12,

    npcs: [
      // Static NPC whose dialogue is awaited by the main script (see start()).
      { id: 'handler', at: [14, 2], facing: 'down',
        talk: [['handler', 'Rehearsal is through that door. Move it.']] },
      // Wandering NPC with a DATA-SCRIPT talk handler (choices, flags, labels).
      { id: 'kessie', at: [12, 4], wander: true, radius: 2,
        talk: [
          { if: 'ch00_talkedKessie', then: [['kessie', 'Go on. They hate waiting.']], else: [
            ['kessie', 'First time on the set? Smile at the lenses. Always smile.', 'happy'],
            { choice: [
              { text: 'Why smile?', then: [['kessie', 'Because the audience votes on faces, not facts.']] },
              { text: 'I am not here to perform.', rel: { kessie: -1 }, then: [['kessie', 'Everyone performs. Some of us just admit it.', 'smug']] },
              { text: '(Say nothing.)', goto: 'silent' }
            ] },
            { goto: 'done' },
            { label: 'silent' },
            { think: 'Every word in here is evidence.' },
            { label: 'done' },
            { set: { ch00_talkedKessie: true } }
          ] }
        ] },
      // Path-following NPC with an ASYNC-FUNCTION talk handler.
      { id: 'delphin', at: [3, 3], path: [[3, 3], [7, 3], [7, 6], [3, 6]], pause: 1.5,
        talk: async function (api) {
          await api.say('delphin', 'They pipe the hum in through the vents. It keeps us drowsy.');
          var c = await api.choice(['Can I trust you?', 'Keep your distance.']);
          if (c === 0) { api.rel('delphin', +1); await api.say('delphin', 'Trust is a currency here. Spend it slowly.', { mood: 'smug' }); }
          else { await api.say('delphin', 'Smart.', { mood: 'tired' }); }
          api.set('ch00_talkedDelphin', true);
        } }
    ],

    objects: [
      // Pickup-style note: interacting is awaited by the main script.
      { id: 'note', at: [2, 2], prop: 'note', solid: false },
      // Examine objects: a string = narration; an array = data script; a function = async code.
      { id: 'camera', at: [5, 0], prop: 'camera', examine: [{ think: 'A lens. There is always a lens.' }, { sound: 'camera' }] },
      { id: 'tv', at: [1, 7], examine: async function (api) {
          await api.tv({ speaker: 'trader', headline: 'Rehearsal Night', text: 'Tomorrow, the nation decides. Tonight, we practise our faces.', tag: 'PROMO' });
        } },
      { id: 'beds', at: [4, 1], examine: 'Thin mattresses. Numbered sheets.', again: 'Still numbered.' },
      { id: 'fridge', at: [15, 1], examine: 'Labelled shelves. Your name is already on one.' }
    ],

    zones: [
      // Step-on trigger, fires once: inner monologue.
      { id: 'rugzone', at: [4, 4], w: 2, h: 2, once: true, run: [{ think: 'The rug hides a drain. Why would a bedroom need a drain?' }] }
    ],

    exits: [
      // Door tile in the top wall -> stage. Locked until the note has been read.
      { id: 'toStage', at: [14, 0], to: 'stage', toAt: [9, 10], facing: 'up',
        locked: '!ch00_readNote', lockedText: [{ think: 'Not yet. The note first.' }] }
    ]
  };

  var stage = {
    name: 'Rehearsal Stage',
    tiles: [
      'CCCCCCEEEEEEECCCCCC',
      'CsssssfffffffsssssC',
      'CsssssfffpfffsssssC',
      'CsssssfffffffsssssC',
      'CsssssssssssssssssC',
      'CsssssssssssssssssC',
      '#mmmmmmmmmmmmmmmmm#',
      '#mnnnnnnmmmnnnnnnm#',
      '#mmmmmmmmmmmmmmmmm#',
      '#mnnnnnnmmmnnnnnnm#',
      '#mmmmmmmmmmmmmmmmm#',
      '#########D#########'
    ],
    ambient: 'crowd',
    dark: 0.55,                                            // darkness overlay
    lights: [{ at: [9, 2], r: 70 }, { at: [3, 3], r: 40, flicker: true }, { at: [15, 3], r: 40, flicker: true }],
    npcs: [
      { id: 'trader', at: [9, 3], facing: 'down', talk: [['trader', 'Places, darling. Places.', 'smug']] },
      { id: 'john', at: [5, 4], facing: 'down', talk: 'Do not look at me like that.' },
      { id: 'carol', at: [13, 4], facing: 'down', talk: [['carol', 'I have done this before. It does not get easier.', 'sad']] },
      // Extras: inline sprite specs (procedural) via G.Sprites.randomSpec(seed).
      { id: 'aud1', at: [2, 8], spec: G.Sprites.randomSpec(1), facing: 'up' },
      { id: 'aud2', at: [6, 8], spec: G.Sprites.randomSpec(2), facing: 'up' },
      { id: 'aud3', at: [12, 8], spec: G.Sprites.randomSpec(3), facing: 'up' },
      { id: 'aud4', at: [16, 10], spec: G.Sprites.randomSpec(4), facing: 'up' }
    ],
    objects: [
      { id: 'spot1', at: [6, 1], prop: 'spotlight', solid: false, layer: -1 },
      { id: 'spot2', at: [12, 1], prop: 'spotlight', solid: false, layer: -1 },
      { id: 'mic', at: [10, 2], prop: 'mic', examine: 'The microphone smells of other people\'s fear.' }
    ],
    exits: [{ id: 'toGreen', at: [9, 11], to: 'greenroom', toAt: [14, 1], facing: 'down' }]
  };

  /* ---------------------------------------------------------------------
   * CHAPTER REGISTRATION
   * ------------------------------------------------------------------- */
  G.registerChapter({
    id: 'ch00',
    title: 'Rehearsal',
    maps: { greenroom: greenroom, stage: stage },
    // Per-chapter cast overrides/additions (merged over the built-in cast).
    cast: {
      luna: { outfit: '#2a2a35', outfit2: '#2a2a35', style: 'jumpsuit', accessory: 'number', accent: '#e8323c' }
    },
    // Defaults for cross-chapter flags when this chapter is run in isolation (?chapter=ch00).
    testDefaults: { m_audience: 50 },

    start: async function (api) {
      /* --- Opening: room, narration, inner monologue --- */
      await api.goRoom('greenroom', { at: [2, 2], facing: 'down' });
      await api.narrate('The green room smells of bleach and cheap coffee. Three beds. Three numbers.');
      await api.think('Nine days. Get through nine days, and Waverly gets a future.');

      /* --- Objective 1: talk to the handler (async style, branching) --- */
      api.objective('Talk to the Handler');
      await api.waitForInteract('handler');            // free roam until the player talks to the handler
      await api.say('handler', 'Contestant. You are on in ten. Read your call sheet: it is on your bed.');
      var c = await api.choice([
        { text: 'Yes, sir.', set: { ch00_attitude: 'meek' } },
        { text: 'I read it when I am ready.', set: { ch00_attitude: 'defiant' } },
        { text: '(Glare at the camera.)', if: 'ch00_talkedKessie', set: { ch00_attitude: 'performer' } } // only shown if flag set
      ]);
      if (c === 1) await api.say('handler', 'Ready is a luxury. Read it.', { mood: 'angry' });

      /* --- Objective 2: the coded note -> cipher minigame (numbers) --- */
      api.objective('Read the note on your bed');
      await api.waitForInteract('note');
      await api.note({ title: 'CALL SHEET', text: '27-25-28-26-27 / 21-22 / 22-21-12' });
      await api.think('The Seven Code. Our old game: A is eight.');
      var res = await api.minigame('cipher', {
        // "Seven Code": A=8 ... Z=33; letters separated by '-', words by '/'.
        mode: 'seven', ciphertext: '27-25-28-26-27/21-22/22-21-12', given: ['T'],
        title: 'THE CALL SHEET', hint: 'A = 8, B = 9 ...'
      });
      api.set('ch00_readNote', true);
      api.set('ch00_cipherSolved', !!res.success);
      api.remove('note');                             // remove the object from the room (persists for the chapter)
      await api.think(res.success ? 'Trust no one. Got it.' : 'I will work it out later.');

      /* --- Objective 3: free roam until two flags are set (multi-target) --- */
      await api.until(function (f) { return f.ch00_talkedKessie && f.ch00_talkedDelphin; }, {
        objective: 'Talk to Kessie and Delphin',
        targets: ['kessie', 'delphin']               // autoplay visits these in order
      });

      /* --- Objective 4: go through the (now unlocked) door --- */
      api.objective('Go to the stage');
      await api.waitForRoom('stage');
      api.objective(null);

      /* --- Cutscene: camera pan, NPC movement, shake, flash, title card --- */
      api.lockPlayer();
      await api.pan('trader', 900);
      await api.move('trader', [9, 4]);
      api.face('trader', 'player');
      await api.emote('trader', '!');
      api.sound('sting');
      api.flash('#ffffff', 400);
      await api.shake(500, 3);
      await api.cameraReset(600);
      await api.titleCard('Week 0', 'Rehearsal');
      api.unlockPlayer();

      /* --- Show HUD: ON AIR, approval meter, lower third, TV broadcast --- */
      api.onAir(true);
      api.approval(true);                                    // show the audience meter (flags.m_audience)
      api.lowerThird('LUNA', 'Contestant #9 • Rehearsal');
      await api.tv([
        { speaker: 'trader', headline: 'Rehearsal Night', text: 'Welcome back, citizens! Tonight our contestants practise for the real thing.' },
        { speaker: 'trader', mood: 'happy', headline: 'Your vote matters', text: 'Every smile counts. Every tear counts double.' }
      ]);
      api.lowerThird(null);

      /* --- Data-script style block, with a branch on a previous flag --- */
      await api.run([
        ['trader', 'Luna! Our little rule-breaker. Hit your mark for the cameras.', 'smug'],
        { if: 'ch00_attitude == defiant', then: [['trader', 'And lose the attitude, sweetheart.']] }
      ]);

      /* --- QTE: timing --- */
      var q = await api.minigame('qte', { mode: 'timing', title: 'HIT YOUR MARK', rounds: 3, need: 2, prompt: 'Stop in the spotlight.' });
      api.approvalAdd(q.success ? +8 : -6);
      await api.say('trader', q.success ? 'Gorgeous! The audience adores you.' : 'Clumsy! They love a clumsy one, at first.', { mood: q.success ? 'happy' : 'smug' });

      /* --- Vote: choose-one-of-N with a dramatic reveal --- */
      await api.say('trader', 'Now, a practice vote. Nobody dies tonight. Probably.', { mood: 'smug' });
      var v = await api.minigame('vote', {
        // mode 'save' (default): you vote to SAVE someone; fewest votes faces judgment.
        title: 'PRACTICE VOTE', prompt: 'Vote to save one contestant',
        candidates: ['john', 'carol', 'kessie', 'delphin'],
        votes: [{ voter: 'john', for: 'carol' }, { voter: 'carol', for: 'john' }, { voter: 'kessie', for: 'carol' }, { voter: 'delphin', for: 'john' }],
        autoPick: 'john'
      });
      api.set('ch00_practiceVote', v.choice);
      api.set('ch00_practiceJudged', v.eliminated);          // who got the fewest votes
      api.approvalAdd(v.choice === v.saved ? 5 : -2);         // siding with the crowd pleases the crowd
      await api.think('I wrote a name on a card. That is all it takes here.');

      /* --- Stealth: sneak through a small map --- */
      await api.say('handler', 'Last drill: Lights Out. Get to the supply closet without the cameras seeing you.');
      var s = await api.minigame('stealth', {
        title: 'LIGHTS OUT', prompt: 'Reach the closet',
        map: [
          '################',
          '#@....#........#',
          '#.....#..XX....#',
          '#..XX....XX..#.#',
          '#............#*#',
          '#..XX.....XX...#',
          '#..............#',
          '################'
        ],
        guards: [{ path: [[7, 4], [12, 4], [12, 6], [7, 6]], speed: 28, range: 50, fov: 70 }],
        cameras: [{ at: [8, 1], angle: 90, sweep: 80, range: 56, speed: 0.9 }],
        lives: 3
      });
      api.set('ch00_stealthOk', !!s.success);
      api.onAir(false);
      api.approval(false);

      /* --- Ending: letter + montage slides, then complete --- */
      await api.letter({ title: 'Dear Waverly,', text: 'They rehearse everything here, even the endings. I am learning the steps. I will not miss my mark. I will come back for you.', from: 'Mom' });
      await api.slides([
        { style: 'montage', title: 'Later', text: 'The lights go down. The cameras do not.' }
      ]);
      api.completeChapter();
    }
  });
})();
