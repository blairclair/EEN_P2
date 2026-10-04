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
