/* =========================================================================
 * game.js: boot, main loop, chapter flow (start / complete / game over),
 * new game / continue.
 * ========================================================================= */
(function () {
  'use strict';
  var G = window.G;
  var U = G.util;
  var Game = (G.Game = {});

  Game.state = null;      // persistent state (flags etc.), see save.js
  Game.session = null;    // {chapterId, alive, n}
  var sessionN = 0;

  /* ---------------- chapter flow ---------------- */
  Game.nextChapterId = function (id) {
    var def = G.chapters[id];
    if (!def || def.hidden) return null;
    var list = G.chapterList(false);
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i + 1] ? list[i + 1].id : null;
    return null;
  };
  function unlock(id) { if (id && Game.state.unlocked.indexOf(id) < 0) Game.state.unlocked.push(id); }
  Game.isUnlocked = function (id) { return G.dev || Game.state.unlocked.indexOf(id) >= 0; };

  function endSession() {
    if (Game.session) Game.session.alive = false;
    Game.session = null;
  }

  /**
   * Start a chapter. opts: {isolated (started via ?chapter=), restoreFlags, skipCard}
   */
  Game.startChapter = function (id, opts) {
    opts = opts || {};
    var def = G.chapters[id];
    if (!def) { G.reportError(new Error('startChapter: chapter "' + id + '" is not registered (check manifest + registerChapter id)'), 'game'); G.Menus.title(); return; }
    endSession();
    var sess = Game.session = { chapterId: id, alive: true, n: ++sessionN };
    G.UI.clear(); G.UI.resetHud(); G.UI.fx.fade = 0; G.UI.fx.tween = null;
    G.Audio.ambient(null);
    G.World.resetSession();
    G.Script.resetChapterState();
    var st = Game.state;
    if (opts.restoreFlags) st.flags = U.copy(opts.restoreFlags);
    // isolated test runs: fill in cross-chapter defaults the chapter declared
    if (def.testDefaults) Object.keys(def.testDefaults).forEach(function (k) { if (st.flags[k] === undefined && (opts.isolated || G.auto)) st.flags[k] = U.copy(def.testDefaults[k]); });
    if (st.flags.approval != null) G.UI.setApproval(st.flags.approval, { instant: true, show: false });
    st.current = id;
    st.chapterStartFlags = U.copy(st.flags);
    st.chapterFlags[id] = U.copy(st.flags);
    unlock(id);
    G.Save.save(st);
    G.testState.chapterStarted = id;
    G.testState.currentChapter = id;
    G.log('[chapter start] ' + id);
    var api = G.Script.makeApi(sess);
    (async function () {
      if (!opts.skipCard && !def.noTitleCard) {
        await G.UI.titleCard(def.title || id, def.number != null && def.number !== '' ? 'Chapter ' + def.number : '', 2600, { kicker: def.kicker });
      }
      if (!sess.alive) return;
      if (typeof def.start === 'function') await def.start(api);
      else if (def.script) await G.Script.run(def.script, api);
      else G.reportError(new Error('chapter ' + id + ' has no start(api) or script'), 'game');
    })().catch(function (e) { if (sess.alive) G.reportError(e, 'chapter ' + id); });
  };

  /** Called by api.completeChapter(). */
  Game.completeChapter = function (nextHint) {
    var sess = Game.session;
    if (!sess || !sess.alive) return;
    sess.alive = false;
    var id = sess.chapterId, def = G.chapters[id];
    G.log('[chapter complete] ' + id);
    G.testState.chapterCompleted.push(id);
    G.testState.flagSnapshots[id] = Object.keys(Game.state.flags).sort();
    var st = Game.state;
    if (st.completed.indexOf(id) < 0) st.completed.push(id);
    var next = nextHint && G.chapters[nextHint] ? nextHint : Game.nextChapterId(id);
    if (nextHint && !G.chapters[nextHint]) G.warn('completeChapter: unknown next chapter "' + nextHint + '"');
    unlock(next);
    st.current = next;
    if (next) { st.chapterStartFlags = U.copy(st.flags); }
    G.Save.save(st);
    G.Script.resetBusy();
    setTimeout(async function () {
      await G.UI.fadeTo(1, 700);
      G.Audio.ambient(null);
      if (next) { Game.startChapter(next); return; }
      G.UI.clear(); G.World.active = false; G.UI.fx.fade = 0; Game.session = null;
      if (def && def.hidden) {
        await G.UI.titleCard(def.title || id, 'Complete', 2200);
        G.Menus.title();
      } else {
        G.testState.gameCompleted = true;
        G.log('[game complete]');
        await G.UI.titleCard((G.manifest.game && G.manifest.game.endTitle) || 'THE END', '', 3500);
        G.Menus.credits(function () { G.Menus.title(); });
      }
    }, 0);
  };

  /** Game over screen; offers retry (restart chapter with its start flags) or quit. */
  Game.gameOver = function (text, opts) {
    opts = opts || {};
    var sess = Game.session;
    if (G.auto) {
      G.reportError(new Error('gameOver reached in autoplay (' + (sess && sess.chapterId) + '): "' + text + '". The default path (choice 0 / autoSolve) must not lose.'), 'auto');
      return U.never();
    }
    return (async function () {
      await G.UI.fadeTo(1, 800, '#200');
      G.UI.clear();
      G.World.active = false;
      G.UI.fx.fade = 0;
      await G.UI.slides([{ title: opts.title || 'JUDGMENT', text: text || 'It is over.', style: 'black' }]);
      if (!sess.alive) return;
      var idx = await G.Dialogue.choose([{ text: 'Try again' }, { text: 'Quit to title' }], { prompt: false });
      if (idx === 0) Game.restartChapter(); else { endSession(); G.Menus.title(); }
      return U.never();
    })();
  };
  Game.restartChapter = function () {
    var id = Game.state.current || (Game.session && Game.session.chapterId);
    if (!id) return G.Menus.title();
    Game.startChapter(id, { restoreFlags: Game.state.chapterStartFlags || {} });
  };
  Game.newGame = function () {
    var keepUnlocked = Game.state ? Game.state.unlocked.slice() : [];
    var keepFlags = Game.state ? Game.state.chapterFlags : {};
    Game.state = G.Save.fresh();
    Game.state.unlocked = keepUnlocked; Game.state.chapterFlags = keepFlags || {};
    var first = G.chapterList(false)[0];
    if (!first) { G.reportError(new Error('No (non-hidden) chapters registered'), 'game'); return; }
    Game.startChapter(first.id);
  };
  Game.continueGame = function () {
    var d = G.Save.load();
    if (!d || !d.current || !G.chapters[d.current]) return Game.newGame();
    Game.state = d;
    Game.startChapter(d.current, { restoreFlags: d.chapterStartFlags || d.flags });
  };
  /** From chapter select: restore the flags this chapter last started with (if known). */
  Game.playChapter = function (id) {
    var snap = Game.state.chapterFlags[id];
    Game.startChapter(id, { restoreFlags: snap || Game.state.flags });
  };
  Game.quitToTitle = function () {
    endSession();
    G.UI.clear(); G.World.active = false; G.UI.fx.fade = 0; G.UI.resetHud(); G.Audio.ambient(null);
    G.Menus.title();
  };

  /* ---------------- main loop ---------------- */
  var last = 0;
  function frame(now) {
    var dt = Math.min(0.05, Math.max(0, (now - last) / 1000) || 0.016);
    last = now;
    try {
      G.Input.poll();
      if (G.Input.pressed('mute')) { G.Save.settings.muted = G.Audio.toggleMute(); G.Save.saveSettings(); G.UI.toast(G.Audio.muted ? 'Sound off' : 'Sound on'); }
      if (G.Input.pressed('menu') && Game.session && !G.UI.paused() && !G.UI.has(function (o) { return o.isMenu; })) { G.Input.consume('menu'); G.Menus.pause(); }
      G.UI.update(dt);
      if (!G.UI.paused()) G.World.update(dt, !G.UI.blocking());
      G.Script.autoTick(dt);
      // render
      G.Render.beginFrame();
      if (G.World.active) {
        G.World.draw();
        var c = G.World.cam;
        G.Render.ui();
        G.Render.ctx.drawImage(G.Render.pxCanvas, c.ox, c.oy);
        if (G.Save.settings.crt) { G.Render.scanlines(0.08); }
        G.Render.vignette(G.World.room && G.World.room.def.vignette != null ? G.World.room.def.vignette : 0.45);
      }
      G.Render.clipGame();
      G.UI.draw();
      G.Render.ctx.restore();
    } catch (e) {
      G.reportError(e, 'frame');
    }
  }
  function loop(now) { frame(now); requestAnimationFrame(loop); }
  function autoLoop() { frame(performance.now()); setTimeout(autoLoop, 4); }

  /* ---------------- boot ---------------- */
  Game.boot = function () {
    try {
      G.Render.init();
      G.Input.init();
      G.Input.listeners.push(function () { G.Audio.unlock(); });
      G.Save.loadSettings();
      Game.state = G.Save.load() || G.Save.fresh();
      // sanity: manifest vs registered chapters
      (G.manifest.chapters || []).forEach(function (c) { if (!G.chapters[c.id]) G.reportError(new Error('Manifest chapter "' + c.id + '" did not register (script error or wrong id in G.registerChapter)'), 'boot'); });
      Object.keys(G.chapters).forEach(function (id) { if (!(G.manifest.chapters || []).some(function (c) { return c.id === id; })) G.warn('chapter ' + id + ' registered but not in manifest'); });
      document.title = (G.manifest.game && G.manifest.game.title) || document.title;
      G.testState.ready = true;
      if (G.auto) autoLoop(); else requestAnimationFrame(function (t) { last = t; loop(t); });
      if (G.params.chapter) {
        if (!G.chapters[G.params.chapter]) { G.reportError(new Error('?chapter=' + G.params.chapter + ' is not registered'), 'boot'); G.Menus.title(); }
        else Game.startChapter(G.params.chapter, { isolated: true, restoreFlags: G.auto ? {} : (Game.state.chapterFlags[G.params.chapter] || Game.state.flags) });
      } else if (G.params.newgame) Game.newGame();
      else G.Menus.title();
    } catch (e) { G.reportError(e, 'boot'); }
  };
})();
