/* =========================================================================
 * chapters/manifest.js: the ordered chapter list + game info.
 * Edit with: node tools/new-chapter.js <id> "<title>" [--number N] [--hidden] [--files a.js,b.js]
 * (chapter agents never edit this file; the orchestrator does.)
 * Each chapter: { id, number, title, files: [paths inside chapters/<id>/], hidden? }
 * shared: [paths relative to play/] loaded after the engine, before all chapters.
 * New Game plays non-hidden chapters in array order.
 * ========================================================================= */
G.manifest = {
  "game": {
    "flagDefaults": { "m_audience": 40, "m_delphin": 15, "m_isaiah": 30, "m_kessie": 25, "m_annette": 40, "m_waverly": 60, "m_trader_insight": 0 },
    "title": "RIGHT TO LIFE",
    "subtitle": "the nation decides who deserves to live",
    "network": "CH 1 • LIVE",
    "endTitle": "THE END",
    "ticker": "TONIGHT: THE PEOPLE DECIDE • VOTE RESPONSIBLY • JUSTICE IS ENTERTAINMENT • ",
    "credits": [
      "ADAPTED FROM THE NOVEL",
      "",
      "ENGINE",
      "Procedural canvas engine — no image or audio files",
      "",
      "CHAPTERS",
      "Built in parallel by many hands"
    ]
  },
  "shared": ["shared/tiles.js", "shared/cast.js", "shared/locations.js", "shared/loc_upstairs.js", "shared/loc_gym_offsite.js"],
  "chapters": [
    { "id": "ch00", "number": 0, "title": "Rehearsal", "hidden": true, "files": ["chapter.js"] },
    { "id": "ch01", "number": 1, "title": "One Day, But Not Today", "files": ["chapter.js"] },
    { "id": "ch02", "number": 2, "title": "Prisoner 739", "files": ["chapter.js"] },
    { "id": "ch03", "number": 3, "title": "Right to Life", "files": ["chapter.js"] },
    { "id": "ch04", "number": 4, "title": "The Morality Test", "files": ["chapter.js"] },
    { "id": "ch05", "number": 5, "title": "The Tribunal", "files": ["chapter.js"] },
    { "id": "ch06", "number": 6, "title": "Applause", "files": ["chapter.js"] },
    { "id": "ch07", "number": 7, "title": "Sorry Enough", "files": ["chapter.js"] },
    { "id": "ch08", "number": 8, "title": "The Night Door", "files": ["chapter.js"] },
    { "id": "ch09", "number": 9, "title": "Friends and Family", "files": ["chapter.js"] },
    { "id": "ch10", "number": 10, "title": "Honesty", "files": ["chapter.js"] },
    { "id": "ch11", "number": 11, "title": "The Maze", "files": ["chapter.js"] },
    { "id": "ch12", "number": 12, "title": "The Night in the Rain", "files": ["chapter.js"] },
    { "id": "ch13", "number": 13, "title": "Ashamed of Yourselves", "files": ["chapter.js"] },
    { "id": "ch14", "number": 14, "title": "Lie Detector", "files": ["chapter.js"] },
    { "id": "ch15", "number": 15, "title": "Right to Live", "files": ["chapter.js"] },
    { "id": "ch16", "number": 16, "title": "They Saved Each Other", "files": ["chapter.js"] }
  ]
};
