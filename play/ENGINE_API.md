# ENGINE_API: chapter author reference

This is the contract for every chapter agent. The working example of everything here is
`chapters/ch00/chapter.js` ("Rehearsal"). Copy its structure.

---

## 0. Rules (read first)

1. **Only touch `play/chapters/chNN/`** (your own folder). Never edit `index.html`, `engine/*`,
   `chapters/manifest.js`, other chapters, or `test/*`. If you need an engine change, ask the orchestrator.
2. **No ES modules, no `import`/`export`, no `fetch`, no image/audio files.** The game runs by
   double-clicking `index.html` (file://). Write classic scripts wrapped in an IIFE:
   `(function () { 'use strict'; ... })();`
3. Everything is on one global: `window.G`. Don't create other globals.
4. **Registration must be side-effect free.** All chapters are loaded on every page load. Don't play
   sounds, touch the DOM, or start timers at load time; do that inside `start(api)`.
5. Chapter-local flags are prefixed with your id: `ch05_foundKey`. Cross-chapter flags are camelCase
   without a prefix (`votedFor`, `drankTea`, `approval`); see §9.
6. The chapter **must complete under autoplay** (`node test/smoke.js chNN` → PASS) with no console errors.
   See §11.
7. Files in your folder load in the order listed in the manifest (`files`). The default is just `chapter.js`.
   If you need more files, tell the orchestrator the list (e.g. `["data.js","chapter.js"]`).

---

## 1. Running

| URL (open `play/index.html` with…) | Effect |
|---|---|
| *(nothing)* | Title screen: Continue / New Game / Chapter Select / Settings / Credits |
| `?chapter=ch05` | Jump straight into ch05 (uses `testDefaults` for missing flags) |
| `?dev=1` | Unlock all chapters (incl. hidden ch00), debug bar (chapter, room, player tile, fps). Press `` ` `` to toggle a flag list. Pause menu gains "Skip Chapter". |
| `?auto=1` | **Autoplay** (tests): dialogue instant, choices pick option 0, minigames auto-solve, objectives auto-performed, no audio, no localStorage |
| `?pick=random` / `?pick=2` | Autoplay choice picking: random, or index N where available (else first available) |
| `?newgame=1` | Start a New Game immediately |
| `?mute=1`, `?nosave=1` | No sound / never touch localStorage |

Controls: arrows/WASD move · E/Space/Enter interact/advance · Esc pause · M mute.

Smoke test (from `play/`):
```
node test/smoke.js ch05       # one chapter, autoplay, must complete, no errors (120 s timeout)
node test/smoke.js ch05 --pick=random   # also try random branches
node test/smoke.js --all      # New Game → every non-hidden chapter in order → THE END
node test/smoke.js --list
```
Screenshots go to `test/artifacts/`. If you are running in isolation, `?chapter=` + `?auto=1` stops after your chapter.

---

## 2. Registering a chapter

```js
(function () {
  'use strict';
  var kitchen = { /* map, see §3 */ };

  G.registerChapter({
    id: 'ch05',                    // MUST equal the folder name and manifest id
    title: 'Kitchen Duty',         // shown on the chapter title card (manifest title is the fallback)
    maps:  { kitchen: kitchen },   // registered as 'ch05:kitchen'; refer to it as 'kitchen'
    cast:  { luna: { outfit: '#d9692b', style: 'jumpsuit' } },  // overrides/additions, see §4
    tiles: { neon: { color: '#102', color2: '#f0f', pattern: 'grid' } },  // custom tile types, §3.3
    props: { vase: function (g, x, y, t, obj) { g.fillStyle = '#88f'; g.fillRect(x+5, y+6, 6, 8); } },
    minigames: { rhythm: { start: function (ctx) {...}, autoSolve: function (p) { return {success:true}; } } },
    testDefaults: { votedFor: 'carol', m_audience: 40 },  // flags assumed from earlier chapters when run alone
    noTitleCard: false,            // true = skip the "Chapter N / Title" card
    kicker: 'WEEK 2',              // optional small red line above the title card
    start: async function (api) { /* your chapter; see §6 */ api.completeChapter(); }
    // or instead of start: script: [ ...data-script steps... ]
  });
})();
```

**Namespacing.** Maps, cast, tiles, props and minigames you register are stored as `ch05:<name>`.
Lookups made while ch05 runs try `ch05:<name>` first, then the global built-in `<name>`. So you never
type the prefix and can't collide with other chapters. Use the full `'ch04:cell'` form only to reference
another chapter's asset (discouraged).

**Multiple files.** Every file in your folder can add to a shared bag before or after `chapter.js`:
```js
// chapters/ch05/maps.js (listed before chapter.js)
(function () { var C = G.chapterBag('ch05'); C.maps.hallway = { tiles: [...] }; C.data.lines = {...}; })();
```
`registerChapter` merges `bag.maps/cast/tiles/props/minigames` into the chapter. `api.data` is `bag.data`.

---

## 3. Maps (rooms)

### 3.1 Map definition
```js
var cell = {
  name: 'Cell Block C',
  tiles: [                 // ASCII rows; each char → tile via the legend (§3.2). 1 char = 16×16 px
    '#####W#####',
    '#b..|...b.#',
    '#...|.@...#',          // '@' = default spawn (floor)
    '#####D#####'
  ],
  legend: { 'q': 'ch05:neon', 'Z': { tile: 'floor', spawn: true }, 'y': { tile: 'floor', marker: 'guardPost' } },
  spawn: [5, 2],           // alternative to '@'
  ambient: 'drone',        // G.Audio ambient while here: 'drone'|'tension'|'hum'|'crowd'|'static'|null
  tint: '#203040', tintAlpha: 0.12,   // colour wash over the room
  dark: 0.6,               // 0..1 darkness overlay; then lights cut holes:
  lights: [{ at: [3, 1], r: 48, flicker: true }],
  playerLight: 40,         // radius of the light around the player in dark rooms (0 = none)
  vignette: 0.45,          // edge darkening (default 0.45)
  bg: '#07070a',           // colour outside the map
  npcs: [ ... ],  objects: [ ... ],  zones: [ ... ],  exits: [ ... ],
  onEnter: async function (api) { ... },   // or enter: [steps]. Runs every entry (enterOnce: true = first only)
};
```
Coordinates are always **tile coordinates `[x, y]`**, with `[0,0]` at the top-left.
Small maps are centred on screen; big maps scroll with the camera (the screen is 24×13.5 tiles).
Rows can differ in length (missing chars become `' '` = void).

### 3.2 Default legend
| char | tile | solid | | char | tile | solid |
|---|---|---|---|---|---|---|
| `#` | wall (painted) | ✔ | | `T` | table | ✔ |
| `B` | brick wall | ✔ | | `K` | counter | ✔ |
| `Q` | white tiled wall | ✔ | | `d` | desk (with screen) | ✔ |
| `W` | wall with window | ✔ | | `b` | bed | ✔ |
| `D` | door (walkable; pair it with an exit) | | | `h` | couch | ✔ |
| `G` | glass partition | ✔ | | `c` | chair | |
| `C` | stage curtain | ✔ | | `O` | stove | ✔ |
| `E` | LED screen wall (animated) | ✔ | | `F` | fridge | ✔ |
| `.` | wood floor | | | `S` | sink | ✔ |
| `,` | carpet | | | `t` | toilet | ✔ |
| `:` | checker tile floor | | | `k` | bookshelf | ✔ |
| `_` | concrete | | | `X` | crate | ✔ |
| `"` | grass | | | `P` | plant | ✔ |
| `=` | road | | | `V` | TV (animated) | ✔ |
| `-` | sidewalk | | | `L` | lamp | ✔ |
| `~` | water (animated) | ✔* | | `\|` | cell bars | ✔ |
| `' '` | void (black) | ✔ | | `l` | locker | ✔ |
| `m` | metal floor plates | | | `M` | mirror (wall) | ✔ |
| `s` | stage floor | | | `n` | bench | ✔ |
| `f` | spotlit stage floor | | | `p` | podium | ✔ |
| `g` | VR neon grid (animated) | | | `u` | trash can | ✔ |
| `R` | rug | | | `o` | confessional booth chair | ✔ |
| `x` | dirt | | | `@` | floor + spawn | |

\*water is not solid by default; give it `solid` via a custom tile if needed.
Wall-type tiles (`# B Q W C E M`) draw a 3/4 "front face" when the tile below them is not a wall,
so build rooms with a wall row on top and the room reads as having depth.

### 3.3 Custom tiles
```js
tiles: {
  neon:  { color: '#120818', color2: '#f0f', pattern: 'grid' },          // walkable
  pipes: { color: '#334', pattern: 'stripes', solid: true },
  vault: { color: '#556', color2: '#223', wall: true, solid: true, pattern: 'bricks' }, // wall w/ face
  altar: { base: 'stage', solid: true, draw: function (g, x, y, info) { g.fillStyle = '#c9a24a'; g.fillRect(x+3, y+4, 10, 8); } },
  pulse: { anim: true, draw: function (g, x, y, info) { g.fillStyle = 'rgba(255,0,0,' + (0.5 + 0.5*Math.sin(info.t*3)) + ')'; g.fillRect(x, y, 16, 16); } }
}
```
The patterns are `plain|planks|checker|noise|grid|bricks|stripes|dots|tiles|plates`. In `draw(g,x,y,info)`, `g` is the
low-res canvas context, `x,y` the pixel top-left, and `info = {r (0..1 per tile), face (bool), t (seconds), tx, ty}`.
Non-`anim` tiles are cached, so don't use `info.t` unless `anim: true`.

### 3.4 NPCs
```js
{ id: 'kessie',          // unique within your chapter (used by api.* and autoplay)
  at: [12, 4],
  spec: 'kessie',        // cast id or inline spec object (default: the id). `sprite` is an alias
  facing: 'down',        // up|down|left|right
  wander: true, radius: 2,                              // random steps around home
  path: [[3,3],[7,3],[7,6]], pause: 1.5, speed: 40,     // patrol loop (BFS between waypoints)
  talk: <handler>,       // what happens on interact (see 3.8)
  again: <handler>,      // handler for 2nd+ interactions (optional)
  once: true, after: <handler>,   // first time: talk, later: after (null = nothing)
  if: 'ch05_guardAwake', // only present if the condition holds at room entry
  solid: true, visible: true, turn: true   // turn:false = don't turn to face the player
}
```

### 3.5 Objects (examinables / props)
```js
{ id: 'note', at: [2, 2], prop: 'note', solid: false, examine: <handler> }
{ id: 'bed',  at: [4, 1], examine: 'Thin mattress.', again: 'Still thin.' }   // no prop: an existing tile becomes examinable
{ id: 'vase', at: [6, 2], prop: 'vase', examine: [...], if: '!ch05_vaseBroken', layer: 0 }
{ id: 'x', at: [1,1], draw: function (g, x, y, t, obj) {...} }   // inline drawing
```
`solid` defaults to true when there is a prop (false for `note`, `key`, `sparkle`). `layer` can be -1 (behind actors),
0 (normal) or 1 (in front). Objects are interacted with by facing them, or by standing on them when not solid.
`thought: true` makes a plain-string examine render as inner monologue.

**Built-in props:** `note letter camera tvset phone box cup teacup mic gavel photo poster spotlight flowers bag key
sign votebox monitor bucket sparkle glow blood pill crowdbar`.

### 3.6 Zones (step-on triggers)
```js
{ id: 'rugzone', at: [4, 4], w: 2, h: 2, once: true, if: 'cond', run: <handler> }
```
A zone fires when the player enters it (edge-triggered, so not every frame). `once` fires it only once per chapter run.

### 3.7 Exits (doors)
```js
{ id: 'toStage', at: [14, 0], w: 1, h: 1,
  to: 'stage', toAt: [9, 10], facing: 'up',   // destination map (local id), arrival tile, facing
  locked: '!ch05_hasKey', lockedText: [{ think: 'Locked.' }],  // condition → bounce back + handler
  if: 'cond',                                 // exit only active if true
  run: <handler>,                             // runs before the transition
  fade: true }
```
Stepping onto the exit tile triggers it. Exits on the arrival tile don't fire until the player steps off.

### 3.8 Handlers
Anywhere a `<handler>` is accepted (`talk`, `examine`, `run`, `again`, `after`, `onEnter`, `lockedText`):
- **string**: an NPC says it (speaker = that NPC); for objects and zones it is narration (or a thought if `thought: true`)
- **array**: a data-script (§5)
- **function**: `async function (api, entity) { ... }`

While a handler runs, the player can't move. Use `api.onInteract(id, handler)` to replace one at runtime (`null` disables it).

---

## 4. Characters (procedural sprites + portraits)

### 4.1 Built-in cast ids
`luna, luna_prison, luna_show, waverly, trader, judge, john, carol, kessie, delphin, annette, isaiah,
handler, guard, cameraman, inmate, caseworker, child, citizen, announcer, narrator`.
These appearances are engine defaults. If canon describes someone differently, override per chapter:
```js
cast: {
  luna: { outfit: '#d9692b', outfit2: '#d9692b', style: 'jumpsuit', accessory: 'number' }, // merged over built-in luna
  salina: { name: 'Salina', skin: '#c68863', hair: '#1a1412', hairStyle: 'long', outfit: '#7a3a5a' }, // new character
  guard2: { extends: 'guard', name: 'Officer Pike', accessory: ['cap', 'glasses'] }
}
```

### 4.2 Spec fields
| field | values |
|---|---|
| `name` | display name in dialogue |
| `skin`, `hair`, `eyes`, `outfit` (top), `outfit2` (pants/skirt), `accent` (tie/badge/trim), `bg` (portrait bg) | `#rrggbb` |
| `hairStyle` | `short long ponytail bun bob curly buzz bald slick pigtails mohawk afro hood` |
| `style` | `casual hoodie suit robe dress jumpsuit uniform apron coat vr` |
| `height` | `child short normal tall` |
| `build` | `slim normal broad` |
| `accessory` | one or an array of `glasses shades tie badge cap mic headset earrings beard scarf number collar bandage` |
| `voice` | typewriter blip pitch in Hz (child ~680, deep ~220) |
| `mood` | default portrait mood |
| `extends` | base cast id |

**Portrait moods** (`mood` in say): `neutral happy sad angry shock smug tired cry fear`.
Extras: `spec: G.Sprites.randomSpec(seed, {outfit:'#555'})` gives a deterministic random bystander.
The player sprite defaults to `'luna'`; change it with `api.setPlayer('luna_prison')`.

---

## 5. Data-scripts (step arrays)

The compact format. Use it in handlers, in `api.run(steps)`, or as the chapter's `script`.

| step | meaning |
|---|---|
| `'text'` | narration (shorthand) |
| `['kessie', 'Hello.', 'happy']` | say (shorthand: speaker, text, mood) |
| `{say:'kessie', text:'Hi', mood:'sad', name:'???', portrait:false}` | dialogue. `text` may be an array of pages. `{flag}` in text is replaced with the flag's value |
| `{narrate:'The lights die.'}` | narration box (no speaker) |
| `{think:'Breathe.'}` | Luna's inner monologue (italic, blue, no portrait) |
| `{choice:[...], store:'flagName', timer:5}` | choice menu (see below) |
| `{if:'cond', then:[...], else:[...]}` | branch |
| `{if:'cond', say:'x', text:'...'}` | guard: run this single step only if the condition holds |
| `{label:'x'}` / `{goto:'x'}` | jump (labels are found in the current block or any enclosing block) |
| `{end:true}` | stop this script |
| `{set:{a:true, n:'+1', m:'-2'}}` | set flags. A string `'+N'`/`'-N'` **adds** |
| `{add:{trustDelphin:1}}` | add to numeric flags |
| `{rel:{delphin:+1}}` | relationship (flag `relDelphin`) |
| `{wait:500}` | ms |
| `{fadeOut:600, color:'#000'}` / `{fadeIn:600}` | screen fade |
| `{flash:'#fff', ms:300}` / `{shake:400, mag:3}` | fx |
| `{titleCard:'Week 2', sub:'The Kitchen', ms:2600}` | big title card |
| `{room:'kitchen', at:[3,4], facing:'up', fade:true}` | change room |
| `{sound:'sting'}` / `{ambient:'tension'}` | audio (§10) |
| `{move:'kessie', to:[5,3], speed:40}` / `to:[[5,3],[5,6]]` | walk an NPC (or `'player'`) with pathfinding; awaits arrival |
| `{face:'kessie', dir:'left'\|'player'\|'npcId'}` | turn |
| `{emote:'kessie', icon:'!', ms:900}` | speech-bubble icon (`! ? … ♥` or any 1 char) |
| `{pan:[x,y]\|'npcId', ms:800}` / `{pan:'player'}` | camera pan / return |
| `{minigame:'qte', params:{...}, store:'flag', onWin:[...], onLose:[...]}` | run a minigame |
| `{slides:[...], style:'montage'}` / `{tv:{...}}` / `{letter:{...}}` / `{note:{...}}` | full-screen text (§7) |
| `{onAir:true}` / `{approval:55}` / `{approvalAdd:-5}` / `{lowerThird:{title, sub, ms}}` | HUD (§8) |
| `{objective:'Find Waverly', target:'waverly'}` | HUD objective + autoplay target |
| `{show:'id'}` / `{hide:'id'}` | entity visibility |
| `{player:{spec:'luna_prison', to:[x,y], at:[x,y], facing:'up', face:'left'}}` | player ops |
| `{call: async function (api) {...}}` (alias `do`) | escape hatch to code |
| `{run:[...]}` | nested block |
| `{complete:true}` / `{complete:'ch07'}` | complete the chapter (optional next-chapter hint) |

**Choice options:** `'text'` or `{text, if, set, add, rel, then:[...], goto:'label', value}`.
Options whose `if` fails are hidden. `store` saves `value` (or the index) into a flag.
```js
{ choice: [
    { text: 'Drink the tea.', set: { drankTea: true }, then: [['annette', 'Good girl.', 'smug']] },
    { text: 'Pour it in the plant.', set: { drankTea: false }, goto: 'refused' },
    { text: '(Ask about Waverly)', if: 'ch05_heardRumour', rel: { annette: 1 } }
  ] }
```

**Conditions** (used by `if`, `locked`, choice `if`, NPC `if`, `api.check`):
`'flag'`, `'!flag'`, `'n >= 2'` (`>= <= > < == !=`; RHS number / true / false / bare word string), `'a && b'`,
`'a || b'`, `{flag:'n', gte:2}` (`eq ne gt gte lt lte`), arrays (all must hold), or `function (flags, api) { return ...; }`.
A missing numeric flag compares as 0.

---

## 6. The `api` (async code style)

`start(api)` is an `async` function. Every blocking call returns a Promise, so `await` it.
While any blocking call runs, the player can't move. When the chapter ends, pending calls of the old chapter
never resolve (they are abandoned silently).

### Flags
| call | |
|---|---|
| `api.flags` | the live flags object (persistent, shared across chapters) |
| `api.get(k, default)` / `api.set(k, v=true)` / `api.set({...})` | read/write (`set({n:'+1'})` adds) |
| `api.add(k, n=1)` → new value | counter |
| `api.has(k)` / `api.check(cond)` | truthy / condition |
| `api.rel('delphin', +1)` → value; `api.rel('delphin')` reads | relationship (`relDelphin`) |
| `api.local('found')` → `'ch05_found'` | local flag name helper |

### Dialogue
| call | |
|---|---|
| `await api.say('kessie', 'Text', {mood:'sad', name:'Voice', portrait:false})` | text may be an array of pages. Speaker = cast id, NPC id, or any string (name only, no portrait) |
| `await api.narrate('Text')` | narration |
| `await api.think('Text')` | inner monologue |
| `const i = await api.choice(['A','B', {text:'C', if:'flag', set:{...}}], {timer:5, timeoutPick:0, prompt, showDisabled})` | returns the **index in your original array**. `set`/`add` on options are applied. The previous line stays visible as the prompt |
| `await api.run([...steps])` | run a data-script |

### Rooms, free roam and waiting for the player
| call | |
|---|---|
| `await api.goRoom('kitchen', {at:[3,4], facing:'up', fade:true})` | load room (fades, runs `onEnter`) |
| `api.room()` | current local map id |
| `await api.waitForInteract('kessie', {objective:'Talk to Kessie'})` | free roam until the player interacts with that npc/object. **The entity's own `talk`/`examine` is skipped**; your code continues instead |
| `await api.waitForTalk('kessie')` | same, but the entity's own handler runs first |
| `await api.waitForZone('exitZone')` | until the player steps into the zone |
| `await api.waitForRoom('stage')` | until the player arrives in that room (via exits) |
| `await api.until(fn, {objective, target, targets:[..], autoplay})` | until `fn(flags, api)` is true (checked every frame) |
| `api.objective('Find Waverly', {target:'waverly'})` | HUD objective + autoplay instruction. `targets:[...]` = visit each in order; `autoplay: async api => {...}` = custom. `api.objective(null)` clears |
| `api.onInteract(id, handler)` | replace an entity's handler at runtime |

### Entities & camera
| call | |
|---|---|
| `api.npc(id)` | runtime NPC object (`x,y` in px, `dir`, `spec`, `visible`) |
| `api.addNpc(def, room?)` / `api.addObject(def, room?)` / `api.remove(id, room?)` | runtime changes, which persist for the chapter run |
| `api.show(id)` / `api.hide(id)` | visibility |
| `await api.move('kessie', [5,3], {speed:40})` (also `'player'`, and arrays of waypoints) | pathfinding walk |
| `await api.movePlayer([x,y])` / `api.teleport([x,y], 'up')` / `api.placeNpc(id, [x,y], 'left')` | |
| `api.face('kessie', 'left' \| 'player' \| otherId)` / `api.face('player', 'kessie')` | |
| `await api.emote('kessie', '!', 900)` | |
| `api.setPlayer(spec)` / `api.setSpec(id, spec)` | change sprite (cast id or inline spec) |
| `api.lockPlayer()` / `api.unlockPlayer()` | lock movement between non-blocking calls |
| `api.playerTile()` | `{x, y}` |
| `await api.pan([x,y] \| 'npcId', ms)` / `await api.cameraReset(ms)` / `api.follow(id\|null)` | camera |

### Effects & presentation
| call | |
|---|---|
| `await api.wait(ms)` | |
| `await api.fadeOut(ms=600, color)` / `await api.fadeIn(ms=600)` | |
| `api.flash(color, ms)` / `await api.shake(ms, mag)` | |
| `await api.titleCard('Week 2', 'subtitle', ms, {kicker})` | |
| `await api.slides([...], {style})` / `api.tv(...)` / `api.letter(...)` / `api.note(...)` / `api.screen(...)` | §7 |
| `api.sound(name)` / `api.ambient(name\|null)` | §10 |
| `api.onAir(true\|false)` / `api.approval(v)` / `api.approvalAdd(d)` / `api.lowerThird(title, sub, ms, tag)` / `api.hud(false)` | §8 |

### Flow
| call | |
|---|---|
| `api.completeChapter(nextHint?)` | finish. Autosaves, fades, then starts the next manifest chapter (or `nextHint`) with its title card |
| `await api.gameOver('text', {title})` | lose screen → Retry (restart chapter with its start flags) / Quit. **Never reachable on the autoplay path** (reported as an error in auto mode) |
| `api.minigame(id, params)` | §12 |
| `api.chapterId`, `api.auto`, `api.dev`, `api.data`, `api.util`, `api.log(msg)` | misc. `api.util`: `clamp lerp rng(seed) pick cap shade sleep` |

---

## 7. Full-screen text (slides)

`await api.slides([slide, ...], {style})`, with each slide advancing on a key press (or after `ms`):
```js
{ style: 'black'|'montage'|'card'|'tv'|'letter'|'note'|'screen', title, text, ms, draw(t, slide, alpha) }
```
- `black`: serif text on black (time skips). `montage`: italic serif over static with a title tag.
- `card`: big title. `screen`: green terminal typing (VR / computers).
- `tv`: broadcast frame. `{speaker:'trader', mood, headline, text, ticker, tag:'LIVE'}` (shortcut `api.tv(slide | [slides])`).
- `letter`: lined paper, handwriting. `{title:'Dear Waverly,', text, from:'Mom'}` (shortcut `api.letter`).
- `note`: torn scrap. `{title, text}` (shortcut `api.note`).

---

## 8. HUD / show elements

- `api.onAir(true)` shows a blinking ● ON AIR at top right.
- **Audience meter = flag `m_audience`** (0-100, the canon flag-registry name; single source of truth).
  - `api.approval(55)` sets and shows it. `api.approval('+5')` / `api.approval('-3')` add (strings), and `api.approvalAdd(-5)` adds with a floating delta.
  - `api.approval(true)` shows it at its current value (default 50 if never set), `api.approval(false)` hides it, `api.approval()` reads it. `api.audience(...)` is an alias.
  - Data-script: `{approval: 55}`, `{approvalAdd: -5}`, `{audience: '+10'}`.
  - Writing the flag directly (`api.set('m_audience', 70)`, `{set:{m_audience:'+5'}}`) also updates the HUD within a frame.
  - **`approval` is a DEPRECATED alias.** It is kept equal to `m_audience` (writes to either propagate) for old code. Use `m_audience` in new code and in `testDefaults`.
- `api.lowerThird('LUNA', 'Contestant #9', 4000)` slides in a TV caption. Omit `ms` to keep it until `api.lowerThird(null)`.
- `api.objective(text)` shows the objective line.
- The HUD resets (all hidden) at every chapter start; the `m_audience` value persists across chapters.

---

## 9. Flags conventions

- **State persists across chapters** in `api.flags` (saved at chapter start and completion).
- **Cross-chapter flags**: camelCase, no prefix, e.g. `votedFor`, `drankTea`, `relDelphin`, plus names fixed by the canon flag registry (e.g. `m_audience` for the audience meter). The canon registry wins over this doc.
  Document every cross-chapter flag you **write** or **read** in your chapter's header comment, and follow the
  canon flag list if the orchestrator provides one (`canon/`). Always read with a default:
  `api.get('votedFor', 'carol')`, and declare test defaults in `testDefaults` so `?chapter=chNN` works alone.
- **Chapter-local flags**: `chNN_` prefix (`ch05_talkedKessie`). Never read another chapter's local flags.
- **Canon defaults: `G.manifest.game.flagDefaults`** (set by the orchestrator in `chapters/manifest.js`), currently
  `m_audience 40, m_delphin 15, m_isaiah 30, m_kessie 25, m_annette 40, m_waverly 60, m_trader_insight 0`.
  - They are filled in for every key that is still `undefined` at every chapter start: New Game, Continue, Chapter Select, `?chapter=`, and each next chapter.
  - Existing values are never overwritten.
  - In isolated tests a chapter's `testDefaults` are applied first, so they win.
  - Increments on an undefined key use the default as their base, so `api.add('m_waverly', -5)` gives 55, not -5. The same goes for `api.add`, `{add:{...}}`, `set:{k:'+N'}` and `api.rel` (when its flag has a default).
  - Only chapter-local flags need `api.get(k, default)`; registry meters are always defined.
- Relationships: `api.rel(name, delta)` → `rel<Name>` (e.g. `relDelphin`), an integer.
- Flag values must be JSON-serialisable (no functions).
- "Continue" restarts the current chapter from its start with the flags it started with.

---

## 10. Audio

`api.sound(name)`: `blip select confirm cancel door step sting reveal buzzer applause static hit miss success fail heartbeat camera alarm`.
`api.ambient(name)`: `drone tension hum crowd static` or `null`. A map's `ambient` sets it on entry.
Custom: `G.Audio.custom['ch05:gong'] = function (t) { t.tone('sine', 220, 1.2, 0.2); t.noise(0.3, 0.1, 800); }` then `api.sound('ch05:gong')`.
(`tone(type, freq, dur, vol, {slide, delay})`, `noise(dur, vol, filterFreq, {type, delay})`.)

---

## 11. Autoplay (REQUIRED)

`node test/smoke.js chNN` loads `?chapter=chNN&auto=1&dev=1` and waits for your chapter to call `completeChapter`.
In auto mode:
- say/narrate/think/slides/titleCard/fades/waits resolve on the next tick; `move` teleports; minigames call `autoSolve(params)`.
- choices pick the first **available** option (or `?pick=random`, or `api.choice(opts, {autoPick: i})` to force one).
- **When your chapter is idle** (no blocking call running, no overlay), the autopilot performs the current target:
  1. the most recent pending `waitForInteract` / `waitForTalk` / `waitForZone` / `waitForRoom` target, else
  2. the current `api.objective(..., {target | targets | autoplay})`.
  It teleports the player next to the target (switching rooms if needed; it searches all your maps) and interacts,
  steps into the zone or exit, or goes to the room.
- Idle for 4 s with nothing to do gives the error **"autoplay stalled"**. Hitting the same target 25 times without progress gives **"autoplay loop"**.

So a naturally written free-roam chapter works if every "wait for the player" is one of:
```js
await api.waitForInteract('kessie');                                  // simplest
api.objective('Search the room', { targets: ['desk', 'bed', 'vent'] });   // handlers set flags…
await api.until(f => f.ch05_foundKey, { targets: ['desk', 'bed', 'vent'] }); // …until done
api.objective('Escape', { autoplay: async api => { await api.goRoom('roof'); api.set('ch05_escaped'); } });
```
Rules: the option-0 / autoSolve path must reach `completeChapter()` without `gameOver`. Targets must be reachable
(a target hidden by `if:` when autoplay needs it is an error). Locked exits are bypassed by `waitForRoom` autoplay
(it calls `goRoom`), so make sure that is acceptable or use a `target` that unlocks it first.
`G.testState = {ready, chapterStarted, currentChapter, chapterCompleted:[], errors:[], warnings:[], gameCompleted, flagSnapshots, log:[]}`.
`log` holds the last 200 dialogue lines and events, which is useful for debugging (the smoke test prints its tail on failure).

---

## 12. Minigames

Call `const r = await api.minigame(id, params)`. `r.success` is always present (boolean); `r.auto` is true under autoplay.
Each runs as a full-screen overlay.

### 12.1 `cipher`: decode a message
```js
await api.minigame('cipher', {
  mode: 'seven', ciphertext: '27-25-28-26-27/21-22/22-21-12',  // Seven Code (A=8..Z=33): letters '-', words '/'
  given: ['T'],                 // letters pre-filled as hints
  title: 'THE CALL SHEET', prompt: 'Numbers stand for letters', hint: 'A = 8, B = 9 ...',
  showKey: true,                // A-Z reference key that fills in as letters are decoded (default true for numbers)
  revealKey: false,             // true = the whole key is shown from the start
  canGiveUp: true               // TAB gives up → {success:false, gaveUp:true}
});
// other modes:
{ mode: 'symbols', message: 'MEET AT DAWN' }       // procedural glyph per letter
{ mode: 'numbers', message: 'NO', offset: 0 }      // A=1+offset (no wrap; wrap:true to wrap)
{ mode: 'shift', message: 'RUN', shift: 3 }        // Caesar letters
{ message: 'HI', key: { H: '★', I: '◆' } }          // explicit letter→token map
{ ciphertext: '15-22/8', key: {...} }              // ciphertext decoded through your key
```
Controls: ←→ select a symbol, ↑↓ or type a letter (typing jumps to the next blank), Backspace clears.
Result: `{success, solved, gaveUp, attempts, time, message}`.

### 12.2 `qte`: physical challenges
```js
{ mode: 'timing', rounds: 3, need: 2, speed: 1, zone: 0.16, title, prompt }   // stop the marker in the green
{ mode: 'sequence', rounds: 3, need: 2, length: 4, time: 3 }                   // type the arrow sequence in time
{ mode: 'mash', target: 30, time: 5, decay: 8 }                                // mash SPACE to fill the meter
```
Result: `{success, hits, misses, score}`. autoSolve returns success.

### 12.3 `vote`: voting ceremony
```js
const v = await api.minigame('vote', {
  title: 'WEEK 1 VOTE', prompt: 'Vote to save one contestant',
  candidates: ['john', 'carol', 'annette', { id: 'x', name: 'X', spec: {...} }],
  mode: 'save',                 // DEFAULT (canon: the public votes to SAVE) → FEWEST votes = faces judgment
                                // 'eliminate' → MOST votes = faces judgment
  votes: [{ voter: 'john', for: 'carol' }, { voter: 'kessie', for: c => c === 'john' ? 'carol' : 'john' }], // revealed one by one
  tally: { carol: 3 },          // extra anonymous counts ("Audience")
  voterName: 'Luna', reveal: true, tieBreak: 'annette', resultText: r => '...', autoPick: 'carol'
});
// v = {success:true, choice, tally:{id:n}, eliminated, saved, tie}
```
For a scripted outcome, set `votes`/`tally` so the canon result happens regardless of the player's vote.

### 12.4 `stealth`: avoid vision cones
```js
{ map: ['##########', '#@...#..*#', ...],   // default legend; '@' start, '*' goal (or start/goal:[x,y])
  guards: [{ path: [[7,4],[12,4]], speed: 30, range: 56, fov: 70, spec: 'guard' }],
  cameras: [{ at: [8,1], angle: 90, sweep: 60, range: 64, speed: 0.8, fov: 40 }],  // angle: 0=right, 90=down
  lives: 3, title, prompt, playerSpec }
```
Result: `{success, caught, time}`. Shift = creep.

### 12.5 Custom minigames
```js
G.registerChapter({ id: 'ch05', minigames: {
  rhythm: {
    autoSolve: function (params) { return { success: true, score: 10 }; },  // REQUIRED
    start: function (ctx) {
      return new Promise(function (resolve) {
        var score = 0;
        ctx.loop(function update(dt) {
          if (ctx.input.pressed('ok')) { score++; ctx.sound('hit'); }
          if (ctx.t > 5) resolve({ success: score > 5, score: score });
        }, function draw(t) {
          ctx.R.rect(0, 0, ctx.W, ctx.H, '#000');
          ctx.header('RHYTHM', 'score ' + score);
          ctx.R.text('PRESS SPACE', ctx.W / 2, 100, { size: 12, align: 'center' });
          ctx.footer('SPACE to hit');
        });
      });
    }
  } } });
// use: await api.minigame('rhythm', {...})   (resolves to 'ch05:rhythm')
```
`ctx`: `params, loop(update, draw), input (pressed(a), down(a), repeat(a), dir(), typed[], keysHeld), t, W=384, H=216,
R (text, rect, panel, img, wrap, measure, static, scanlines, vignette), PAL, px (low-res canvas ctx) + blitPx(),
sprite(spec, dir, frame), portrait(spec, mood), sound(name), header(title, sub), footer(text)`.
Actions: `up down left right ok menu back tab mute`.
`R.text(str, x, y, {size, color, align, font:'mono'|'title'|'serif'|'hand'|'sans', style:'bold'|'italic'|'', alpha, shadow})`.
Draw in virtual 384×216 coordinates. Text is rendered crisply at native resolution.

---

## 13. Look & feel guidelines
- Resolution is 384×216 internal and tiles are 16 px, so a room is ideally ≤ 24×13 tiles (bigger rooms scroll).
- Put a wall row on top of rooms (the 3/4 face), use `tint`/`dark`/`lights` for mood, and place `camera` props (surveillance is a theme).
- Keep each dialogue line ≤ ~3 box lines (it auto-paginates, but short lines read better).
- Use `think` for Luna's private thoughts, `narrate` for scene-setting, and `tv` for broadcast moments.

---

## 14. Definition of done (chapter checklist)

- [ ] Only files under `chapters/chNN/` were changed; `id` matches the folder and manifest.
- [ ] `node test/smoke.js chNN` → **PASS** (no console errors, no `testState.errors`).
- [ ] `node test/smoke.js chNN --pick=random` passes too (a couple of runs), or choices are safely guarded.
- [ ] Played by hand at least once via `index.html?chapter=chNN&dev=1`: you can walk, facing an interactable shows the yellow marker, nothing is stuck.
- [ ] Every free-roam wait is autoplay-able (§11); no `gameOver` on the default path.
- [ ] Cross-chapter flags are camelCase, documented in the header comment, read with defaults, and listed in `testDefaults`.
- [ ] Chapter-local flags use the `chNN_` prefix.
- [ ] Ends with `api.completeChapter()`.
- [ ] No load-time side effects; no globals besides what's on `G`; no external assets.
- [ ] Minigames used have parameters that fit the scene; custom minigames have `autoSolve`.

---

## 15. Shared assets (`play/shared/`)

Recurring locations and the canonical look of recurring characters are built once in `play/shared/`
(owned by the shared-assets agent; chapter agents only *use* them). Files are listed in
`chapters/manifest.js` → `"shared": [...]` and load **after the engine, before every chapter**.

| API (used inside shared/*.js) | |
|---|---|
| `G.shared.registerMap(name, mapDef)` | a reusable location (map format of §3). Name it with a location prefix: `show_kitchen`, `prison_cell` |
| `G.shared.registerCast(id, spec)` | merges `spec` over the built-in cast member `id` (or adds a new one) **globally**. Chapter `cast` overrides still apply on top |
| `G.shared.registerTiles({name: def})` / `G.shared.registerProps({name: fn})` | global tile types and props, usable in every map |
| `G.shared.data` | free-form shared constants |

**Using a shared location in a chapter:** `G.shared.map(name, ext)` returns a **deep copy** (functions kept) that you
put in your `maps`. The shared original is never mutated, so other chapters are unaffected.
```js
G.registerChapter({ id: 'ch05',
  maps: {
    kitchen: G.shared.map('show_kitchen', {
      npcs:    [{ id: 'annette', at: [4, 3], talk: [['annette', 'Tea?']] }],  // APPENDED to the shared list
      objects: [{ id: 'ch05_cup', at: [2, 2], prop: 'teacup', examine: '...' }],
      zones: [], exits: [], lights: [],                                        // also appended
      remove:  ['kettle'],              // drop shared npcs/objects/zones/exits by id
      legend:  { 'q': 'neon' },         // merged
      ambient: 'tension', dark: 0.3     // any other field REPLACES the shared value
    })
  }, ... });
```
The copy is then registered as your local map (`'ch05:kitchen'`), so `api.goRoom('kitchen')`, exits, autoplay and
`api.remove` all work as usual. `G.shared.has(name)` / `G.shared.list()` let you check what exists.
Shared entity ids are visible to autoplay targets, so avoid reusing them for your own entities.

---

## Engine changelog

Changes after the API freeze. All are backwards compatible.

- **2026-10-04**
  - Added: manifest `shared: [...]` list, loaded by `engine/loader.js` after the engine and before chapters (§15).
  - Added: the `G.shared` namespace (`registerMap`, `registerCast`, `registerTiles`, `registerProps`, `map(name, ext)`, `data`, `has`, `list`) and `G.cloneDef` (a deep copy that keeps functions).
  - Added: `play/shared/` with README and stub files `tiles.js`, `cast.js`, `locations.js`.
  - Changed (visual only): the lower third now sits at the bottom of the screen and lifts above the dialogue box while dialogue or a choice is open.
  - Fixed: `tools/new-chapter.js` preserves the manifest `shared` list when rewriting the manifest.
  - Fixed: an isolated autoplay test (`?chapter=X&auto=1`) stops after chapter X instead of running into the next chapter.

- **2026-10-04 (b)**
  - Changed: the HUD audience meter is bound to flag **`m_audience`** (single source of truth). `api.approval(v)` and `api.approvalAdd(d)` read and write it, and `api.approval('+5')` string deltas, `api.approval(true)` and the alias `api.audience` were added. The `{audience: v}` data-script step was added. Direct flag writes are synced to the HUD every frame. `approval` stays as a deprecated alias kept equal to `m_audience`, and old saves with only `approval` are migrated at chapter start.
  - Fixed: interacting with an NPC on the adjacent tile failed unless the player stood near the far edge of its own tile. NPCs on the faced tile are now always reachable.
  - Fixed: `World.locate` could drop a map from the autoplay target search after a cross-chapter `goRoom('chNN:room')`.
  - Fixed: the `qte` default `need` (when omitted) is now round(rounds*2/3), i.e. 2 of 3, instead of 3 of 3.
- **2026-10-04 (c)**
  - Added: `G.manifest.game.flagDefaults` (canon meter defaults). They fill undefined flags at every chapter start (New Game, Continue, Chapter Select, `?chapter=`, each next chapter) without overwriting. `api.add`, `{add}` and `set` `'+N'` on an undefined key now start from the default instead of 0. Also added `G.flagDefaults()` and `G.applyFlagDefaults(flags)`. The audience meter with no value falls back to `flagDefaults.m_audience` (then 50). `tools/new-chapter.js` preserves the key.
