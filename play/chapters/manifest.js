/* =========================================================================
 * chapters/manifest.js: the ordered chapter list + game info.
 * Edit with: node tools/new-chapter.js <id> "<title>" [--number N] [--hidden] [--files a.js,b.js]
 * (chapter agents never edit this file; the orchestrator does.)
 * Each chapter: { id, number, title, files: [paths inside chapters/<id>/], hidden? }
 * New Game plays non-hidden chapters in array order.
 * ========================================================================= */
G.manifest = {
  "game": {
    "title": "LIVE JUDGMENT",
    "subtitle": "a broadcast in many parts",
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
  "chapters": [
    { "id": "ch00", "number": 0, "title": "Rehearsal", "hidden": true, "files": ["chapter.js"] }
  ]
};
