/* =========================================================================
 * loader.js: loads every chapter's script files listed in
 * chapters/manifest.js by appending classic <script> tags one after another
 * (works on file://, unlike fetch/ES modules), then boots the game.
 * A file that fails to load is recorded in G.testState.errors; loading continues.
 * ========================================================================= */
(function () {
  'use strict';
  var G = window.G;
  var files = [];
  // shared assets first (after the engine, before every chapter)
  (G.manifest.shared || []).forEach(function (f) { files.push(f); });
  (G.manifest.chapters || []).forEach(function (c) {
    (c.files && c.files.length ? c.files : ['chapter.js']).forEach(function (f) { files.push('chapters/' + c.id + '/' + f); });
  });
  var i = 0;
  function next() {
    if (i >= files.length) { G.Game.boot(); return; }
    var src = files[i++];
    var s = document.createElement('script');
    s.src = src;
    s.onload = next;
    s.onerror = function () { G.reportError(new Error('Failed to load ' + src + ' (missing file or listed wrongly in manifest)'), 'loader'); next(); };
    document.body.appendChild(s);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', next); else next();
})();
