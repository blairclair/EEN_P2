# play/shared: assets reused by many chapters

Recurring locations (Luna's room, kitchen, confessional, arena, stage, hallways…), refined cast
sprite specs and shared tiles/props live here, built ONCE so every chapter draws them the same way.

* Files are listed in `chapters/manifest.js` → `"shared": [...]` (paths relative to `play/`).
  They load **after the engine and before every chapter**, in that order.
* Owned by the shared-assets agent. Chapter agents never edit this folder; they only *use* it.
* Same rules as chapters: classic scripts in an IIFE, no ES modules or fetch, no load-time side
  effects, no image or audio files.

| file | contents | API |
|---|---|---|
| `tiles.js` | shared tile types and props | `G.shared.registerTiles({...})`, `G.shared.registerProps({...})` |
| `cast.js` | canonical appearance of recurring characters | `G.shared.registerCast(id, spec)` (merges over the built-in cast, globally) |
| `locations.js` | recurring rooms | `G.shared.registerMap(name, mapDef)` |

Chapters use a location with a per-chapter deep copy:
```js
maps: {
  kitchen: G.shared.map('show_kitchen', {
    npcs: [{ id: 'annette', at: [4, 3], talk: [...] }],   // appended
    objects: [...], zones: [...], exits: [...],          // appended
    remove: ['kettle'],                                  // drop shared entities by id
    ambient: 'tension'                                   // any other field overrides
  })
}
```
See ENGINE_API.md §15. Name shared maps with a location prefix (`show_kitchen`, `prison_cell`,
`apt_luna_room`) and give their built-in entities stable ids so chapters can `remove` them.

### Spawns, marks and cross-owner exits (convention for all shared owners)
* Chapters key their maps by the shared id: `maps: { house_gym_courtroom: G.shared.map('house_gym_courtroom', {...}) }`.
* Each shared map def carries `spawns: { from_<room>: [x, y] }` (arrival tiles) and `marks: { name: [x, y] }`
  (staging points such as `defendant_left` or `stage_center`). Both are mirrored at
  `G.shared.data.spawns[mapId]` and `G.shared.data.marks[mapId]`:
  `api.goRoom('house_gym_courtroom', { at: G.shared.data.spawns.house_gym_courtroom.from_red_hall })`,
  `{ id: 'carol', at: G.shared.data.marks.house_gym_courtroom.defendant_left }`.
* An exit into another owner's room (`to_red_hall` → `house_red_hall`) resolves its `toAt` when it is used, from
  `G.shared.data.spawns[target]['from_' + thisRoom]`, falling back to the target's default spawn. Its `locked`
  is a function that returns true when the chapter has not registered the target map, so a lone room never
  throws "Unknown map". Redresses of one room (house_gym_*) all look up `from_gym`.
