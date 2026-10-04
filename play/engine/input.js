/* =========================================================================
 * input.js: keyboard state mapped to actions.
 *   up/down/left/right : WASD + arrows
 *   ok                 : E, Space, Enter
 *   cancel / menu      : Escape
 *   mute               : M
 * Use G.Input.down('up') (held) and G.Input.pressed('ok') (this frame).
 * Raw typed characters for minigames: G.Input.typed (array of keys this frame).
 * ========================================================================= */
(function () {
  'use strict';
  var G = window.G;
  var I = (G.Input = {});

  var MAP = {
    ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down',
    ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
    KeyE: 'ok', Space: 'ok', Enter: 'ok', NumpadEnter: 'ok',
    Escape: 'menu', Backspace: 'back', KeyM: 'mute', Backquote: 'debug', Tab: 'tab'
  };
  I.held = {};          // action -> bool
  I.keysHeld = {};      // code -> bool
  var pressedQ = {};    // action -> true (accumulated between frames)
  var typedQ = [];
  I.pressedNow = {};
  I.typed = [];
  I.lastInputTime = 0;
  I.listeners = [];
  I.lastPress = {};     // action -> performance.now() of last (non-repeat) press     // fn(e) called on every keydown (audio unlock etc)

  function onDown(e) {
    var a = MAP[e.code];
    if (a || e.code === 'Tab') e.preventDefault();
    I.lastInputTime = performance.now();
    I.keysHeld[e.code] = true;
    if (!e.repeat) {
      if (a) { pressedQ[a] = true; I.lastPress[a] = performance.now(); }
      typedQ.push(e.key);
    } else if (a && a !== 'ok' && a !== 'menu') {
      pressedQ[a + '_repeat'] = true;
    }
    if (a) I.held[a] = true;
    I.listeners.forEach(function (fn) { try { fn(e); } catch (err) { /* ignore */ } });
  }
  function onUp(e) {
    var a = MAP[e.code];
    I.keysHeld[e.code] = false;
    if (a) {
      // only release the action if no other key mapped to it is held
      var still = Object.keys(MAP).some(function (k) { return MAP[k] === a && I.keysHeld[k]; });
      if (!still) I.held[a] = false;
    }
  }
  I.init = function () {
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    window.addEventListener('blur', function () { I.held = {}; I.keysHeld = {}; });
  };
  /** Called once per frame by the main loop before updates. */
  I.poll = function () {
    I.pressedNow = pressedQ; pressedQ = {};
    I.typed = typedQ; typedQ = [];
  };
  I.down = function (a) { return !!I.held[a]; };
  /** True once on the frame the action was pressed. */
  I.pressed = function (a) { return !!I.pressedNow[a]; };
  /** Like pressed, but also repeats while held (for menu navigation). */
  I.repeat = function (a) { return !!(I.pressedNow[a] || I.pressedNow[a + '_repeat']); };
  /** Consume an action so lower layers don't also see it this frame. */
  I.consume = function (a) { if (a) delete I.pressedNow[a]; else { I.pressedNow = {}; I.typed = []; } };
  /** Edge-latched: was action `a` pressed after time t (performance.now() ms)? Never misses a press between polls. */
  I.pressedSince = function (a, t) { return (I.lastPress[a] || 0) > t; };
  I.now = function () { return performance.now(); };
  /** Direction vector from held keys. */
  I.dir = function () {
    return { x: (I.down('right') ? 1 : 0) - (I.down('left') ? 1 : 0), y: (I.down('down') ? 1 : 0) - (I.down('up') ? 1 : 0) };
  };
})();
