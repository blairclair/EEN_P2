/* =========================================================================
 * save.js: localStorage persistence (every access wrapped in try/catch,
 * so the game works when storage is blocked, e.g. some file:// setups).
 * Auto mode (?auto=1) and ?nosave=1 keep everything in memory only.
 *
 * Save data (one slot):
 *   { version, flags, current, chapterStartFlags, completed:[], unlocked:[], chapterFlags:{id: flagsAtStart} }
 * ========================================================================= */
(function () {
  'use strict';
  var G = window.G;
  var S = (G.Save = {});
  var KEY = 'een_play_save_v1', SKEY = 'een_play_settings_v1';
  var mem = {};
  function useMem() { return G.auto || G.params.nosave; }
  function read(k) {
    if (useMem()) return mem[k] || null;
    try { return window.localStorage.getItem(k); } catch (e) { return mem[k] || null; }
  }
  function write(k, v) {
    mem[k] = v;
    if (useMem()) return;
    try { window.localStorage.setItem(k, v); } catch (e) { /* storage unavailable: memory only */ }
  }
  function del(k) { delete mem[k]; if (useMem()) return; try { window.localStorage.removeItem(k); } catch (e) { /* ignore */ } }

  S.settings = { textSpeed: 'normal', volume: 0.7, muted: false, shake: true, crt: true };
  S.loadSettings = function () {
    try { var s = JSON.parse(read(SKEY) || 'null'); if (s) Object.keys(s).forEach(function (k) { S.settings[k] = s[k]; }); } catch (e) { /* ignore */ }
    if (G.params.mute) S.settings.muted = true;
    G.Audio.setVolume(S.settings.volume); G.Audio.setMuted(S.settings.muted);
    return S.settings;
  };
  S.saveSettings = function () { write(SKEY, JSON.stringify(S.settings)); };

  S.fresh = function () { return { version: 1, flags: {}, current: null, chapterStartFlags: {}, completed: [], unlocked: [], chapterFlags: {} }; };
  S.load = function () {
    try {
      var d = JSON.parse(read(KEY) || 'null');
      if (!d || typeof d !== 'object') return null;
      var f = S.fresh();
      Object.keys(f).forEach(function (k) { if (d[k] === undefined) d[k] = f[k]; });
      return d;
    } catch (e) { return null; }
  };
  S.save = function (state) {
    try { write(KEY, JSON.stringify(state)); } catch (e) { G.warn('save failed: ' + e.message); }
  };
  S.has = function () { var d = S.load(); return !!(d && d.current); };
  S.clear = function () { del(KEY); };
})();
