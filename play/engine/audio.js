/* =========================================================================
 * audio.js: tiny WebAudio synth. No audio files.
 *   G.Audio.play('blip'|'select'|'confirm'|'cancel'|'door'|'sting'|'buzzer'|
 *                'applause'|'static'|'hit'|'miss'|'success'|'fail'|'step'|'reveal'|'heartbeat'|'camera')
 *   G.Audio.ambient('drone'|'tension'|'crowd'|'hum'|'static'|null)
 *   G.Audio.blip(pitch)   typewriter tick
 * The AudioContext is created lazily on the first key press (browser autoplay
 * policy) and never in auto mode.
 * ========================================================================= */
(function () {
  'use strict';
  var G = window.G;
  var A = (G.Audio = {});
  var ac = null, master = null, ambientNodes = null, ambientName = null;
  A.muted = false;
  A.volume = 0.7;

  function ensure() {
    if (ac || G.auto) return ac;
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ac = new AC();
      master = ac.createGain();
      master.gain.value = A.muted ? 0 : A.volume;
      master.connect(ac.destination);
      if (ambientName) { var n = ambientName; ambientName = null; A.ambient(n); }
    } catch (e) { ac = null; }
    return ac;
  }
  A.unlock = function () { ensure(); if (ac && ac.state === 'suspended') ac.resume(); };
  A.setVolume = function (v) { A.volume = v; if (master) master.gain.value = A.muted ? 0 : v; };
  A.setMuted = function (m) { A.muted = !!m; if (master) master.gain.value = A.muted ? 0 : A.volume; };
  A.toggleMute = function () { A.setMuted(!A.muted); return A.muted; };

  function tone(type, freq, dur, vol, opts) {
    if (!ensure() || A.muted) return;
    opts = opts || {};
    var t = ac.currentTime + (opts.delay || 0);
    var o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (opts.slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, opts.slide), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.01, dur / 4));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + dur + 0.02);
  }
  var noiseBuf = null;
  function noise(dur, vol, filterFreq, opts) {
    if (!ensure() || A.muted) return;
    opts = opts || {};
    if (!noiseBuf) {
      noiseBuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
      var d = noiseBuf.getChannelData(0);
      for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    var t = ac.currentTime + (opts.delay || 0);
    var s = ac.createBufferSource(); s.buffer = noiseBuf;
    var f = ac.createBiquadFilter(); f.type = opts.type || 'bandpass'; f.frequency.value = filterFreq || 1200;
    var g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + (opts.attack || 0.01));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(master);
    s.start(t); s.stop(t + dur + 0.05);
  }

  var SFX = {
    blip: function () { tone('square', 520, 0.03, 0.04); },
    select: function () { tone('square', 660, 0.05, 0.06); },
    confirm: function () { tone('square', 523, 0.06, 0.07); tone('square', 784, 0.09, 0.07, { delay: 0.06 }); },
    cancel: function () { tone('square', 330, 0.08, 0.06, { slide: 220 }); },
    door: function () { noise(0.25, 0.25, 400, { type: 'lowpass' }); tone('triangle', 90, 0.2, 0.2); },
    step: function () { noise(0.04, 0.05, 900); },
    sting: function () { tone('sawtooth', 110, 1.4, 0.18, { slide: 55 }); tone('sawtooth', 116, 1.4, 0.12, { slide: 58 }); tone('square', 880, 0.5, 0.05, { slide: 440 }); },
    reveal: function () { [392, 494, 587, 784].forEach(function (f, i) { tone('triangle', f, 0.25, 0.1, { delay: i * 0.08 }); }); },
    buzzer: function () { tone('sawtooth', 140, 0.5, 0.15); tone('square', 147, 0.5, 0.1); },
    applause: function () { for (var i = 0; i < 14; i++) noise(0.12, 0.15, 2000 + Math.random() * 3000, { delay: i * 0.07 + Math.random() * 0.04 }); },
    static: function () { noise(0.5, 0.2, 3000, { type: 'highpass' }); },
    hit: function () { tone('square', 880, 0.08, 0.08); tone('square', 1320, 0.08, 0.06, { delay: 0.05 }); },
    miss: function () { tone('square', 200, 0.15, 0.08, { slide: 100 }); },
    success: function () { [523, 659, 784, 1046].forEach(function (f, i) { tone('square', f, 0.12, 0.07, { delay: i * 0.09 }); }); },
    fail: function () { [392, 330, 262, 196].forEach(function (f, i) { tone('triangle', f, 0.2, 0.1, { delay: i * 0.12 }); }); },
    heartbeat: function () { tone('sine', 60, 0.15, 0.4); tone('sine', 55, 0.15, 0.3, { delay: 0.22 }); },
    camera: function () { noise(0.05, 0.2, 5000, { type: 'highpass' }); tone('square', 1800, 0.03, 0.04, { delay: 0.05 }); },
    alarm: function () { for (var i = 0; i < 4; i++) tone('square', i % 2 ? 660 : 880, 0.18, 0.06, { delay: i * 0.2 }); }
  };
  A.play = function (name) {
    if (G.auto) return;
    try { if (SFX[name]) SFX[name](); else if (A.custom[name]) A.custom[name](A.tools); } catch (e) { /* audio must never crash the game */ }
  };
  /** Chapters can add sounds: G.Audio.custom['ch05:gong'] = function(t){ t.tone('sine',220,1,0.2) } */
  A.custom = {};
  A.tools = { tone: tone, noise: noise };
  A.blip = function (pitch) {
    if (G.auto) return;
    tone('square', pitch || 520, 0.025, 0.035);
  };

  /** Continuous background drone. name: 'drone'|'tension'|'crowd'|'hum'|'static'|null */
  A.ambient = function (name) {
    if (name === ambientName && ambientNodes) return;
    // stop current
    if (ambientNodes && ac) {
      var t = ac.currentTime;
      ambientNodes.gain.gain.setTargetAtTime(0.0001, t, 0.4);
      var old = ambientNodes;
      setTimeout(function () { old.nodes.forEach(function (n) { try { n.stop(); } catch (e) { /* ignore */ } }); }, 1500);
    }
    ambientNodes = null;
    ambientName = name || null;
    if (!name || G.auto || !ensure()) return;
    var g = ac.createGain(); g.gain.value = 0.0001; g.connect(master);
    var nodes = [];
    var lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 500; lp.connect(g);
    function osc(type, f, v) {
      var o = ac.createOscillator(), og = ac.createGain();
      o.type = type; o.frequency.value = f; og.gain.value = v;
      o.connect(og); og.connect(lp); o.start(); nodes.push(o); return o;
    }
    var level = 0.08;
    if (name === 'drone') { osc('sawtooth', 55, 0.4); osc('sawtooth', 55.4, 0.4); osc('sine', 110, 0.2); }
    else if (name === 'tension') {
      osc('sawtooth', 73.4, 0.35); osc('sawtooth', 77.8, 0.3); lp.frequency.value = 350;
      var lfo = ac.createOscillator(), lg = ac.createGain(); lfo.frequency.value = 0.3; lg.gain.value = 200;
      lfo.connect(lg); lg.connect(lp.frequency); lfo.start(); nodes.push(lfo);
    } else if (name === 'hum') { osc('sine', 60, 0.5); osc('sine', 120, 0.25); osc('sine', 180, 0.1); level = 0.05; }
    else if (name === 'crowd' || name === 'static') {
      if (!noiseBuf) noise(0.01, 0.0001, 100);
      var s = ac.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
      lp.frequency.value = name === 'crowd' ? 900 : 4000; s.connect(lp); s.start(); nodes.push(s);
      level = name === 'crowd' ? 0.12 : 0.04;
    } else { osc('sine', 80, 0.3); }
    g.gain.setTargetAtTime(level, ac.currentTime, 0.8);
    ambientNodes = { gain: g, nodes: nodes };
  };
  A.currentAmbient = function () { return ambientName; };
})();
