// File: features/flappy.js
const { randomUUID } = require('crypto');

const FLAPPY_HTML = String.raw`<style>
* { 
    box-sizing: border-box; margin: 0; padding: 0; 
    -webkit-tap-highlight-color: transparent; 
    -webkit-touch-callout: none !important; 
    -webkit-user-select: none !important; 
    user-select: none !important; 
    touch-action: none !important; 
    outline: none !important; 
}

body { 
    background: #070a12; font-family: system-ui, -apple-system, sans-serif; 
    color: #fff; display: flex; justify-content: center; align-items: flex-start; 
    padding: 10px; overscroll-behavior: none; overflow: hidden; 
}

.app { 
    width: 100%; max-width: 400px; background: #1e293b; 
    border-radius: 18px; padding: 12px; 
    border: 2px solid #334155; box-shadow: 0 10px 30px rgba(0,0,0,0.8); 
}

.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.title { font-size: 24px; font-weight: 900; color: #00f3ff; text-shadow: 0 0 10px rgba(0,243,255,0.5); letter-spacing: 1px; }

.btn-sound { 
    background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); 
    color: #fff; width: 38px; height: 38px; border-radius: 10px; font-size: 18px; 
    cursor: pointer; display: grid; place-items: center; 
}
.btn-sound:active { transform: scale(0.92); }

.stats { 
    display: flex; justify-content: space-between; align-items: center; 
    background: rgba(0,0,0,0.3); padding: 8px 14px; border-radius: 12px; 
    margin-bottom: 10px; border: 1px solid rgba(255,255,255,0.05);
}
.stat-box { font-size: 11px; font-weight: 700; color: #94a3b8; letter-spacing: 1px; }
.stat-val { font-size: 17px; font-weight: 900; color: #fff; margin-left: 4px; }
.time-badge { background: rgba(255,255,255,0.1); padding: 3px 8px; border-radius: 8px; color: #facc15; font-size: 11px; font-weight: 800; }

.screen-wrap { 
    position: relative; width: 100%; aspect-ratio: 3/4; 
    border-radius: 12px; overflow: hidden; border: 2px solid #0f172a; 
    background: #080b12; cursor: pointer; 
}
canvas#game { width: 100%; height: 100%; display: block; }

.overlay { 
    position: absolute; inset: 0; background: rgba(0,0,0,0.65); backdrop-filter: blur(2px); 
    display: flex; flex-direction: column; align-items: center; justify-content: center; 
    text-align: center; pointer-events: none; 
}
.hidden { display: none !important; }

.msg-title { font-size: 34px; font-weight: 900; margin-bottom: 15px; text-shadow: 0 4px 10px rgba(0,0,0,0.8); }
.t-ready { color: #facc15; }
.t-crash { color: #ef4444; }

.blink-tap { 
    font-size: 14px; font-weight: 800; color: #fff; background: rgba(0,243,255,0.25); 
    padding: 10px 24px; border-radius: 20px; border: 2px solid #00f3ff; 
    letter-spacing: 1px;
}
</style>

<body>
<div class="app">
  <div class="header">
    <div class="title">FLAPPY</div>
    <button id="btnSound" class="btn-sound" type="button">🔊</button>
  </div>
  
  <div class="stats">
    <div class="stat-box">SCORE <span class="stat-val" id="score">0</span></div>
    <div class="stat-box" id="timeBadge">☀️ SIANG</div>
    <div class="stat-box">BEST <span class="stat-val" id="best">0</span></div>
  </div>

  <div class="screen-wrap" id="touchArea">
    <canvas id="game" width="300" height="400"></canvas>
    
    <div class="overlay" id="overlay">
      <h1 class="msg-title t-ready" id="msgTitle">READY?</h1>
      <div class="blink-tap" id="msgSub">TAP TO FLY</div>
    </div>
  </div>
</div>

<script>
window.onerror = function() { return true; };
window.oncontextmenu = function(e) { e.preventDefault(); return false; };
document.body.onselectstart = function(e) { e.preventDefault(); return false; };

(function() {
  var c = document.getElementById('game');
  var x = c.getContext('2d');
  var scoreEl = document.getElementById('score');
  var bestEl = document.getElementById('best');
  var timeBadge = document.getElementById('timeBadge');
  var overlay = document.getElementById('overlay');
  var msgTitle = document.getElementById('msgTitle');
  var msgSub = document.getElementById('msgSub');
  var btnSound = document.getElementById('btnSound');
  var touchArea = document.getElementById('touchArea');

  var W = 300;
  var H = 400;
  var GROUND_Y = 330;

  var state = 'ready';
  var bird = { x: 60, y: 180, vy: 0 };
  var pipes = [];
  var buildings = [];
  var score = 0;
  var best = 0;
  var lastTime = 0;
  var spawnTimer = 0;
  var bgOffset = 0;

  try {
    best = parseInt(localStorage.getItem('flappy_best_sc') || '0', 10) || 0;
  } catch(e) {}
  bestEl.textContent = best;

  var palettes = [
    { t: [86,189,248], b: [186,230,253], c: [255,255,255], g: [16,185,129], s: '☀️ SIANG', col: '#facc15' },
    { t: [244,63,94],  b: [251,146,60],  c: [255,220,200], g: [180,83,9],   s: '🌇 SENJA', col: '#fb923c' },
    { t: [15,23,42],   b: [30,41,59],    c: [100,116,139], g: [6,78,59],    s: '🌙 MALAM', col: '#94a3b8' }
  ];
  var currC = { t: [86,189,248], b: [186,230,253], c: [255,255,255], g: [16,185,129] };

  function lerp(start, end, amt) { return (1 - amt) * start + amt * end; }
  function toRGB(a, alpha) {
    if (alpha === undefined) alpha = 1;
    return 'rgba(' + Math.floor(a[0]) + ',' + Math.floor(a[1]) + ',' + Math.floor(a[2]) + ',' + alpha + ')';
  }

  function initBuildings() {
    buildings = [];
    var bx = 0;
    while(bx < W + 80) {
      buildings.push({ x: bx, w: 30 + Math.random()*35, h: 40 + Math.random()*90 });
      bx += 25 + Math.random()*25;
    }
  }

  // --- AUDIO SYSTEM AMAN ---
  var AC = null;
  var MUTED = false;
  var bgmNext = 0;
  var bgmStep = 0;

  function initAudio() {
    if (!AC) {
      try {
        var ACClass = window.AudioContext || window.webkitAudioContext;
        if (ACClass) AC = new ACClass();
      } catch(e) {}
    }
    if (AC && AC.state === 'suspended') {
      try { AC.resume(); } catch(e) {}
    }
  }

  function tone(f, d, type, vol, at) {
    if (!AC || MUTED) return;
    try {
      var n = AC.currentTime + (at || 0);
      var o = AC.createOscillator();
      var g = AC.createGain();
      o.type = type || 'square';
      o.frequency.setValueAtTime(f, n);
      g.gain.setValueAtTime(vol || 0.2, n);
      g.gain.exponentialRampToValueAtTime(0.0001, n + d);
      o.connect(g);
      g.connect(AC.destination);
      o.start(n);
      o.stop(n + d + 0.02);
    } catch(e) {}
  }

  function sFlap() { tone(450, 0.08, 'sine', 0.8); tone(650, 0.12, 'sine', 0.8, 0.04); }
  function sScore() { tone(880, 0.08, 'square', 0.4); tone(1320, 0.12, 'square', 0.4, 0.08); }
  function sDie() { tone(180, 0.3, 'sawtooth', 0.5); }

  var mel = [392, 0, 330, 0, 261, 0, 330, 0, 392, 0, 330, 0, 261, 0, 330, 0, 440, 0, 349, 0, 293, 0, 349, 0, 440, 0, 349, 0, 293, 0, 349, 0];
  var bas = [130, 0, 0, 0, 130, 0, 0, 0, 130, 0, 0, 0, 130, 0, 0, 0, 146, 0, 0, 0, 146, 0, 0, 0, 146, 0, 0, 0, 146, 0, 0, 0];

  function playBGM() {
    if (!AC || MUTED || state !== 'play') return;
    var spb = 0.14;
    while(bgmNext < AC.currentTime + 0.1) {
      var s = bgmStep % 32;
      var at = Math.max(0, bgmNext - AC.currentTime);
      if (mel[s]) tone(mel[s], 0.14, 'square', 0.12, at);
      if (bas[s]) tone(bas[s], 0.18, 'triangle', 0.15, at);
      bgmStep++;
      bgmNext += spb;
    }
  }

  document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
      if (AC) try { AC.suspend(); } catch(e) {}
    } else {
      if (AC && !MUTED) try { AC.resume(); } catch(e) {}
    }
  });

  // --- GAMEPLAY ---
  function resetGame() {
    bird.x = 60;
    bird.y = 180;
    bird.vy = 0;
    pipes = [];
    score = 0;
    bgOffset = 0;
    spawnTimer = 40;
    scoreEl.textContent = '0';
    initBuildings();
    overlay.classList.add('hidden');
    state = 'play';
    if (AC) bgmNext = AC.currentTime;
    flap();
  }

  function flap() {
    bird.vy = -6.5;
    sFlap();
  }

  function addPipe() {
    var gap = 120;
    var top = 40 + Math.random() * 140;
    pipes.push({ x: W + 10, top: top, bottom: top + gap, passed: false });
  }

  function gameOver() {
    state = 'dead';
    sDie();
    if (score > best) {
      best = score;
      bestEl.textContent = best;
      try { localStorage.setItem('flappy_best_sc', String(best)); } catch(e) {}
    }
    msgTitle.textContent = 'CRASHED!';
    msgTitle.className = 'msg-title t-crash';
    msgSub.textContent = 'TAP TO RETRY';
    overlay.classList.remove('hidden');
  }

  function update(dt) {
    bird.vy += 0.45 * dt;
    bird.y += bird.vy * dt;
    spawnTimer -= dt;
    bgOffset += 2.8 * dt;

    if (spawnTimer <= 0) {
      addPipe();
      spawnTimer = 85;
    }

    for (var i = 0; i < buildings.length; i++) {
      buildings[i].x -= 0.6 * dt;
    }
    buildings = buildings.filter(function(b) { return b.x + b.w > -40; });
    var lastB = buildings[buildings.length - 1];
    if (!lastB || lastB.x < W) {
      buildings.push({ x: W + 10, w: 30 + Math.random()*35, h: 40 + Math.random()*90 });
    }

    for (var j = 0; j < pipes.length; j++) {
      var p = pipes[j];
      p.x -= 2.8 * dt;

      if (!p.passed && p.x + 40 < bird.x) {
        p.passed = true;
        score++;
        scoreEl.textContent = score;
        sScore();
      }

      if (bird.x + 10 > p.x && bird.x - 10 < p.x + 40 && (bird.y - 10 < p.top || bird.y + 10 > p.bottom)) {
        gameOver();
        return;
      }
    }

    pipes = pipes.filter(function(p) { return p.x > -50; });

    if (bird.y < 0 || bird.y + 10 > GROUND_Y) {
      bird.y = Math.min(bird.y, GROUND_Y - 10);
      gameOver();
    }
  }

  function draw() {
    var phase = Math.floor(score / 10) % 3;
    var pT = palettes[phase];
    timeBadge.textContent = pT.s;
    timeBadge.style.color = pT.col;

    for (var i = 0; i < 3; i++) {
      currC.t[i] = lerp(currC.t[i], pT.t[i], 0.03);
      currC.b[i] = lerp(currC.b[i], pT.b[i], 0.03);
      currC.c[i] = lerp(currC.c[i], pT.c[i], 0.03);
      currC.g[i] = lerp(currC.g[i], pT.g[i], 0.03);
    }

    var bg = x.createLinearGradient(0, 0, 0, GROUND_Y);
    bg.addColorStop(0, toRGB(currC.t));
    bg.addColorStop(1, toRGB(currC.b));
    x.fillStyle = bg;
    x.fillRect(0, 0, W, H);

    if (phase === 2) {
      x.fillStyle = 'rgba(255,255,255,0.4)';
      for (var s = 0; s < 6; s++) {
        x.fillRect((s * 80 + score * 2) % W, 20 + (s % 4) * 40, 2, 2);
      }
    }

    x.fillStyle = toRGB(currC.c, 0.6);
    for (var bi = 0; bi < buildings.length; bi++) {
      var b = buildings[bi];
      x.fillRect(b.x, GROUND_Y - b.h, b.w, b.h);
    }

    for (var pi = 0; pi < pipes.length; pi++) {
      var p = pipes[pi];
      x.fillStyle = '#22c55e';
      x.fillRect(p.x, 0, 40, p.top);
      x.fillRect(p.x, p.bottom, 40, GROUND_Y - p.bottom);

      x.fillStyle = '#166534';
      x.fillRect(p.x + 32, 0, 8, p.top);
      x.fillRect(p.x + 32, p.bottom, 8, GROUND_Y - p.bottom);

      x.fillStyle = '#4ade80';
      x.fillRect(p.x - 3, p.top - 14, 46, 14);
      x.fillRect(p.x - 3, p.bottom, 46, 14);
      x.fillStyle = '#166534';
      x.fillRect(p.x + 35, p.top - 14, 8, 14);
      x.fillRect(p.x + 35, p.bottom, 8, 14);
    }

    x.fillStyle = toRGB(currC.g);
    x.fillRect(0, GROUND_Y, W, H - GROUND_Y);

    x.fillStyle = 'rgba(0,0,0,0.2)';
    for (var gx = -30; gx < W; gx += 30) {
      x.fillRect(gx + (bgOffset % 30), GROUND_Y + 10, 12, 5);
      x.fillRect(gx + 15 + (bgOffset % 30), GROUND_Y + 30, 18, 5);
    }

    var dof = x.createLinearGradient(0, GROUND_Y - 20, 0, H);
    dof.addColorStop(0, 'rgba(0,0,0,0)');
    dof.addColorStop(0.2, 'rgba(0,0,0,0.4)');
    dof.addColorStop(1, 'rgba(0,0,0,0.8)');
    x.fillStyle = dof;
    x.fillRect(0, GROUND_Y - 20, W, H - GROUND_Y + 20);

    x.save();
    x.translate(bird.x, bird.y);
    x.rotate(Math.max(-0.4, Math.min(0.7, bird.vy * 0.05)));

    x.fillStyle = 'rgba(0,0,0,0.3)';
    x.beginPath();
    x.arc(2, 4, 11, 0, Math.PI * 2);
    x.fill();

    x.fillStyle = (state === 'play' || state === 'ready') ? '#facc15' : '#ef4444';
    x.beginPath();
    x.arc(0, 0, 11, 0, Math.PI * 2);
    x.fill();

    x.fillStyle = '#fb923c';
    x.fillRect(5, -2, 10, 5);
    x.fillStyle = '#0f172a';
    x.fillRect(2, -6, 3, 3);

    x.fillStyle = '#fef08a';
    var wingY = (state === 'play' && bird.vy < 0) ? -2 : 2;
    x.beginPath();
    x.ellipse(-4, wingY, 5, 3, 0, 0, Math.PI * 2);
    x.fill();

    x.restore();
  }

  function loop(timestamp) {
    if (!lastTime) lastTime = timestamp;
    var dt = Math.min((timestamp - lastTime) / 16.67, 2.0);
    lastTime = timestamp;

    if (state === 'play') {
      update(dt);
      playBGM();
    }

    draw();
    requestAnimationFrame(loop);
  }

  // --- KONTROL SENTUHAN ---
  function onScreenTap(e) {
    if (e && e.cancelable) e.preventDefault();
    initAudio();

    if (state === 'ready' || state === 'dead') {
      resetGame();
    } else if (state === 'play') {
      flap();
    }
  }

  touchArea.addEventListener('pointerdown', onScreenTap);

  function toggleSound(e) {
    if (e && e.cancelable) e.preventDefault();
    if (e) e.stopPropagation();
    initAudio();
    MUTED = !MUTED;
    btnSound.textContent = MUTED ? '🔇' : '🔊';
    if (!MUTED && state === 'play' && AC) {
      bgmNext = AC.currentTime;
    }
  }

  btnSound.addEventListener('pointerdown', toggleSound);

  initBuildings();
  draw();
  requestAnimationFrame(loop);
})();
</script>
</body>`;

async function kirimForwardSigned(sock, chatId, html, judul) {
    const data = Buffer.from(JSON.stringify({
        __typename: 'GenAIUnifiedResponse',
        response_id: randomUUID(),
        sections: [{
            __typename: 'GenAIUnifiedResponseSection',
            view_model: {
                __typename: 'GenAISingleLayoutViewModel',
                primitive: {
                    __typename: 'GenAIaeacdsnwHtmlPrimitive',
                    payload: html,
                    trusted_sources: []
                }
            }
        }]
    })).toString('base64');

    return sock.relayMessage(chatId, {
        messageContextInfo: {
            deviceListMetadata: {},
            deviceListMetadataVersion: 2,
            botMetadata: {
                messageDisclaimerText: "",
                botResponseId: randomUUID()
            }
        },
        botForwardedMessage: {
            message: {
                richResponseMessage: {
                    messageType: 1,
                    submessages: [{ messageType: 2, messageText: judul }],
                    unifiedResponse: { data },
                    contextInfo: {
                        forwardingScore: 1,
                        isForwarded: true,
                        forwardedAiBotMessageInfo: { botJid: "867051314767696@bot" },
                        forwardOrigin: 4
                    }
                }
            }
        }
    }, {});
}

async function handleFlappy(sock, msg, from, args) {
    try {
        console.log(`[FLAPPY] Game dijalankan di chat: ${from}`);
        if (msg.key) {
            await sock.sendMessage(from, { react: { text: '🐦', key: msg.key } }).catch(() => {});
        }
        await kirimForwardSigned(sock, from, FLAPPY_HTML, '🐦 FLAPPY BIRD');
    } catch (e) {
        console.error('[FLAPPY ERROR]', e?.message || e);
        await sock.sendMessage(from, { text: '❌ Gagal memuat game: ' + (e?.message || e) }, { quoted: msg });
    }
}

module.exports = handleFlappy;