// File: features/hillclimb.js
const { randomUUID } = require('crypto');

const HILLCLIMB_HTML = String.raw`<style>
/* VAKSIN ANTI-SELECT WHATSAPP */
* { 
    -webkit-tap-highlight-color: transparent; 
    -webkit-touch-callout: none !important; 
    -webkit-user-select: none !important; 
    user-select: none !important; 
    touch-action: none !important; 
    outline: none !important; 
    box-sizing: border-box; 
}

body { 
    margin: 0; background: #070a12; 
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
    display: flex; justify-content: center; align-items: flex-start; 
    padding: 12px; color: #fff; overflow: hidden; overscroll-behavior: none; 
}

/* KOTAK GAME MODERN & CLEAN */
.app { 
    width: 100%; max-width: 420px; 
    background: #1e293b; border-radius: 20px; 
    padding: 15px; 
    box-shadow: 0 10px 30px rgba(0,0,0,0.6); 
    border: 2px solid #334155; 
}

/* HEADER: JUDUL & TOMBOL KONTROL ATAS */
.top-bar { 
    display: flex; justify-content: space-between; align-items: center; 
    margin-bottom: 12px; 
}
.title { font-weight: 900; color: #facc15; font-size: 20px; margin: 0; letter-spacing: 1px; }
.top-actions { display: flex; gap: 8px; }
.btn-icon { 
    background: rgba(255,255,255,0.1); border: none; color: #fff; 
    width: 38px; height: 38px; border-radius: 10px; font-size: 18px; 
    cursor: pointer; display: grid; place-items: center; transition: 0.1s;
}
.btn-icon:active, .btn-icon.touching { transform: scale(0.9); background: rgba(255,255,255,0.2); }

/* LAYAR GAME & HUD */
.screen { 
    position: relative; width: 100%; aspect-ratio: 16/9; 
    background: #38bdf8; border-radius: 14px; overflow: hidden; 
    border: 2px solid #0f172a; box-shadow: inset 0 0 20px rgba(0,0,0,0.4);
}
canvas#game { display: block; width: 100%; height: 100%; }

.hud { 
    position: absolute; top: 10px; left: 15px; right: 15px; 
    display: flex; justify-content: space-between; align-items: center;
    font-weight: 900; color: #fff; text-shadow: 1px 1px 3px #000; font-size: 15px; 
    pointer-events: none; z-index: 5;
}
.hud-score { text-align: right; }
#best { font-size: 10px; color: #cbd5e1; display: block; margin-top: 2px; }

/* OVERLAY KETIKA MATI / START */
.overlay { 
    position: absolute; inset: 0; background: rgba(15,23,42,0.85); backdrop-filter: blur(4px);
    display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 15px; 
    z-index: 10; 
}
.hidden { display: none !important; }
.o-title { font-size: 28px; font-weight: 900; margin: 0; text-shadow: 0 4px 10px rgba(0,0,0,0.5); }
.t-start { color: #22c55e; }
.t-crash { color: #ef4444; }

.btn-start { 
    background: linear-gradient(180deg, #facc15, #ca8a04); color: #000; 
    border: none; font-size: 15px; font-weight: 900; padding: 12px 30px; 
    border-radius: 25px; cursor: pointer; box-shadow: 0 5px 0 #854d0e; 
    transition: 0.1s; letter-spacing: 1px;
}
.btn-start:active, .btn-start.touching { transform: translateY(5px); box-shadow: 0 0 0 transparent; }

/* TOMBOL GAS & REM */
.controls { display: flex; gap: 15px; margin-top: 15px; }
.btn-ctrl { 
    flex: 1; height: 65px; border-radius: 16px; border: none; 
    font-size: 18px; font-weight: 900; color: #fff; cursor: pointer; 
    box-shadow: 0 6px 0 rgba(0,0,0,0.4); transition: 0.1s; letter-spacing: 1px;
}
.btn-brake { background: linear-gradient(#ef4444, #b91c1c); }
.btn-gas { background: linear-gradient(#22c55e, #15803d); }
.btn-ctrl:active, .btn-ctrl.touching { transform: translateY(6px); box-shadow: 0 0 0 transparent; filter: brightness(1.2); }
</style>

<body>
<div class="app">
  <div class="top-bar">
    <h1 class="title">HILL CLIMB</h1>
    <div class="top-actions">
      <button id="btnRestart" class="btn-icon">↻</button>
      <button id="btnSound" class="btn-icon">🔊</button>
    </div>
  </div>

  <div class="screen">
    <div class="hud">
      <span id="coins">🪙 0</span>
      <div class="hud-score">
        <span id="score">0m</span>
        <span id="best">HI: 0m</span>
      </div>
    </div>
    
    <canvas id="game" width="380" height="213"></canvas>

    <div id="startOverlay" class="overlay">
      <h1 class="o-title t-start">READY?</h1>
      <button id="btnStart" class="btn-start">DRIVE</button>
    </div>

    <div id="gameOverOverlay" class="overlay hidden">
      <h1 class="o-title t-crash">CRASHED!</h1>
      <button id="btnRetry" class="btn-start">RETRY</button>
    </div>
  </div>

  <div class="controls">
    <button id="btnBrake" class="btn-ctrl btn-brake">REM</button>
    <button id="btnGas" class="btn-ctrl btn-gas">GAS</button>
  </div>
</div>

<script>
window.oncontextmenu = function(e) { e.preventDefault(); e.stopPropagation(); return false; };
document.body.onselectstart = function(e) { e.preventDefault(); return false; };

(function() {
  const c = document.getElementById('game');
  const ctx = c.getContext('2d');
  const scoreEl = document.getElementById('score');
  const coinsEl = document.getElementById('coins');
  const bestEl = document.getElementById('best');
  const startOverlay = document.getElementById('startOverlay');
  const gameOverOverlay = document.getElementById('gameOverOverlay');
  const btnStart = document.getElementById('btnStart');
  const btnRetry = document.getElementById('btnRetry');
  const btnRestart = document.getElementById('btnRestart');
  const btnSound = document.getElementById('btnSound');
  const btnBrake = document.getElementById('btnBrake');
  const btnGas = document.getElementById('btnGas');

  const WIDTH = c.width;
  const HEIGHT = c.height;

  let audioCtx = null;
  let isMuted = false;
  let engineOsc = null;
  let engineGain = null;

  function initAudio() {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) audioCtx = new AudioContextClass();
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  function startEngineSound() {
    if (isMuted || !audioCtx || engineOsc) return;
    try {
      engineOsc = audioCtx.createOscillator();
      engineGain = audioCtx.createGain();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.setValueAtTime(60, audioCtx.currentTime);
      engineGain.gain.setValueAtTime(0.03, audioCtx.currentTime);
      engineOsc.connect(engineGain);
      engineGain.connect(audioCtx.destination);
      engineOsc.start();
    } catch(e) {}
  }

  function updateEngineSound(speedRatio, isGas) {
    if (isMuted || !engineOsc || !audioCtx) return;
    try {
      const targetFreq = 50 + speedRatio * 180 + (isGas ? 60 : 0);
      const targetGain = isGas ? 0.08 : 0.03;
      engineOsc.frequency.setTargetAtTime(targetFreq, audioCtx.currentTime, 0.1);
      engineGain.gain.setTargetAtTime(targetGain, audioCtx.currentTime, 0.1);
    } catch(e) {}
  }

  function stopEngineSound() {
    if (engineOsc) {
      try { engineOsc.stop(); } catch(e) {}
      engineOsc = null;
      engineGain = null;
    }
  }

  function playSoundEffect(type) {
    if (isMuted) return;
    initAudio();
    if (!audioCtx) return;
    try {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      if (type === 'coin') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1320, audioCtx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
        osc.start(); osc.stop(audioCtx.currentTime + 0.15);
      } else if (type === 'fuel') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.25);
        gain.gain.setValueAtTime(0.18, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.25);
        osc.start(); osc.stop(audioCtx.currentTime + 0.25);
      } else if (type === 'crash') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(180, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + 0.4);
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
        osc.start(); osc.stop(audioCtx.currentTime + 0.4);
      }
    } catch(e) {}
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      stopEngineSound();
      if (audioCtx) audioCtx.suspend();
    } else {
      if (audioCtx && !isMuted) audioCtx.resume();
      if (isPlaying && !isGameOver && !isMuted) startEngineSound();
    }
  });

  window.addEventListener('pagehide', () => {
    stopEngineSound();
    if (audioCtx) audioCtx.suspend();
  });

  function loadBest() {
    let vals = [];
    try { let v = localStorage.getItem('hcr_best'); if (v) vals.push(parseInt(v, 10)); } catch(e) {}
    try { let v = sessionStorage.getItem('hcr_best'); if (v) vals.push(parseInt(v, 10)); } catch(e) {}
    return vals.length ? Math.max(...vals.filter(v => !isNaN(v))) : 0;
  }

  function saveBest(v) {
    let val = String(Math.floor(v));
    try { localStorage.setItem('hcr_best', val); } catch(e) {}
    try { sessionStorage.setItem('hcr_best', val); } catch(e) {}
  }

  let bestScore = loadBest();
  bestEl.textContent = 'HI: ' + bestScore + 'm';

  let chassis, wheelF, wheelR, fuel, distance, coins, particles = [], floatTexts = [];
  let suspOffsetF = 0, suspOffsetR = 0;
  let suspVelF = 0, suspVelR = 0;
  let isPlaying = false;
  let isGameOver = false;
  let isGasPressed = false;
  let isBrakePressed = false;
  let animId = null;
  let lastTime = 0;
  let cameraX = 0, cameraY = 0;
  let items = [];

  function getTerrainHeight(px) {
    if (px < 80) return 160;
    let baseH = 160 + Math.sin(px * 0.005) * 32 + Math.sin(px * 0.013) * 14;

    const houseIndex = Math.floor(px / 850);
    const houseStart = houseIndex * 850 + 680;
    if (px >= houseStart && px <= houseStart + 70) {
      const progress = (px - houseStart) / 70;
      baseH -= Math.sin(progress * Math.PI) * 32;
    }
    const rampIndex = Math.floor(px / 550);
    const rampStart = rampIndex * 550 + 380;
    if (px >= rampStart && px <= rampStart + 45) {
      const progress = (px - rampStart) / 45;
      baseH -= Math.sin(progress * Math.PI) * 26;
    }
    const rockIndex = Math.floor(px / 320);
    const rockStart = rockIndex * 320 + 200;
    if (px >= rockStart && px <= rockStart + 24) {
      const progress = (px - rockStart) / 24;
      baseH -= Math.sin(progress * Math.PI) * 14;
    }
    return baseH;
  }

  function getTerrainSlope(px) {
    const dx = 8;
    return Math.atan2(getTerrainHeight(px + dx) - getTerrainHeight(px - dx), dx * 2);
  }

  function populateItems(startX, endX) {
    for (let px = startX; px < endX; px += 120 + Math.random() * 140) {
      if (px < 220) continue;
      const type = Math.random() < 0.22 ? 'fuel' : 'coin';
      items.push({ x: px, y: getTerrainHeight(px) - 20, type, collected: false });
    }
  }

  function addFloatText(text, x, y, color = '#facc15') {
    floatTexts.push({ text, x, y, alpha: 1.0, color });
  }

  function initGame() {
    const startH = getTerrainHeight(100);
    chassis = { x: 100, y: startH - 18, vx: 0, vy: 0, angle: 0, vAngle: 0 };
    wheelF = { x: 120, y: startH - 8, rot: 0 };
    wheelR = { x: 80, y: startH - 8, rot: 0 };
    suspOffsetF = 0; suspOffsetR = 0;
    suspVelF = 0; suspVelR = 0;
    fuel = 100;
    distance = 0;
    coins = 0;
    particles = [];
    floatTexts = [];
    isGasPressed = false;
    isBrakePressed = false;
    isGameOver = false;
    cameraX = 0;
    cameraY = 0;
    items = [];
    populateItems(220, 2500);
    coinsEl.textContent = '🪙 0';
    scoreEl.textContent = '0m';
  }

  function update(dt) {
    if (!isPlaying || isGameOver) return;

    if (isGasPressed) fuel -= 0.055 * dt;
    else fuel -= 0.009 * dt;
    fuel = Math.max(0, fuel);

    if (fuel <= 0 && Math.abs(chassis.vx) < 0.12) {
      triggerGameOver(); return;
    }

    chassis.vy += 0.28 * dt;
    chassis.vAngle *= 0.92;

    const enginePower = 0.145;
    if (isGasPressed && fuel > 0) {
      chassis.vx += Math.cos(chassis.angle) * enginePower * dt;
      chassis.vy += Math.sin(chassis.angle) * enginePower * dt;
      chassis.vAngle += 0.0045 * dt;
      wheelF.rot += chassis.vx * 0.15;
      wheelR.rot += chassis.vx * 0.15;
    }
    if (isBrakePressed) {
      chassis.vx -= Math.cos(chassis.angle) * (enginePower * 0.55) * dt;
      chassis.vAngle -= 0.006 * dt;
      wheelF.rot += chassis.vx * 0.08;
      wheelR.rot += chassis.vx * 0.08;
    }

    chassis.x += chassis.vx * dt;
    chassis.y += chassis.vy * dt;
    chassis.angle += chassis.vAngle * dt;

    const cosA = Math.cos(chassis.angle);
    const sinA = Math.sin(chassis.angle);
    const springK = 0.26, damping = 0.74;

    suspVelF += (-suspOffsetF) * springK * dt;
    suspVelF *= damping; suspOffsetF += suspVelF * dt;

    suspVelR += (-suspOffsetR) * springK * dt;
    suspVelR *= damping; suspOffsetR += suspVelR * dt;

    wheelF.x = chassis.x + cosA * 20 - sinA * (10 + suspOffsetF);
    wheelF.y = chassis.y + sinA * 20 + cosA * (10 + suspOffsetF);
    wheelR.x = chassis.x - cosA * 20 - sinA * (10 + suspOffsetR);
    wheelR.y = chassis.y - sinA * 20 + cosA * (10 + suspOffsetR);

    const wheelRadius = 10;
    const thF = getTerrainHeight(wheelF.x);
    if (wheelF.y + wheelRadius > thF) {
      const overlap = (wheelF.y + wheelRadius) - thF;
      chassis.y -= overlap * 0.6; suspOffsetF -= overlap * 0.4; suspVelF -= overlap * 0.3;
      chassis.vy *= 0.2; chassis.vx *= 0.985;
      chassis.vAngle += (getTerrainSlope(wheelF.x) - chassis.angle) * 0.08 * dt;
    }
    const thR = getTerrainHeight(wheelR.x);
    if (wheelR.y + wheelRadius > thR) {
      const overlap = (wheelR.y + wheelRadius) - thR;
      chassis.y -= overlap * 0.6; suspOffsetR -= overlap * 0.4; suspVelR -= overlap * 0.3;
      chassis.vy *= 0.2; chassis.vx *= 0.985;
      chassis.vAngle += (getTerrainSlope(wheelR.x) - chassis.angle) * 0.08 * dt;
    }

    suspOffsetF = Math.max(-6, Math.min(6, suspOffsetF));
    suspOffsetR = Math.max(-6, Math.min(6, suspOffsetR));

    wheelF.x = chassis.x + cosA * 20 - sinA * (10 + suspOffsetF);
    wheelF.y = chassis.y + sinA * 20 + cosA * (10 + suspOffsetF);
    wheelR.x = chassis.x - cosA * 20 - sinA * (10 + suspOffsetR);
    wheelR.y = chassis.y - sinA * 20 + cosA * (10 + suspOffsetR);

    const normalizedAngle = Math.abs(Math.atan2(Math.sin(chassis.angle), Math.cos(chassis.angle)));
    const headY = chassis.y - cosA * 14;
    const headX = chassis.x + sinA * 14;
    if (normalizedAngle > 2.2 && headY > getTerrainHeight(headX) - 2) {
      triggerGameOver(); return;
    }

    distance = Math.max(distance, (chassis.x - 100) / 10);
    if (distance > bestScore) {
      bestScore = Math.floor(distance);
      saveBest(bestScore);
    }

    scoreEl.textContent = String(Math.floor(distance)).padStart(4, '0') + 'm';
    bestEl.textContent = 'HI: ' + Math.floor(bestScore) + 'm';
    coinsEl.textContent = '🪙 ' + coins;

    items.forEach(it => {
      if (!it.collected && Math.hypot(chassis.x - it.x, chassis.y - it.y) < 26) {
        it.collected = true;
        if (it.type === 'coin') {
          coins += 10; playSoundEffect('coin'); addFloatText('+10', it.x, it.y, '#facc15');
        } else {
          fuel = Math.min(100, fuel + 45); playSoundEffect('fuel'); addFloatText('+FUEL', it.x, it.y, '#22c55e');
        }
      }
    });

    if (chassis.x + 500 > (items[items.length - 1]?.x || 0)) {
      const lastX = items[items.length - 1]?.x || chassis.x;
      populateItems(lastX + 120, lastX + 1800);
    }

    updateEngineSound(Math.abs(chassis.vx) / 6, isGasPressed);
  }

  function triggerGameOver() {
    isGameOver = true;
    stopEngineSound();
    playSoundEffect('crash');
    gameOverOverlay.classList.remove('hidden');
  }

  function drawSpring(x1, y1, x2, y2) {
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x1, y1);
    const dx = x2 - x1, dy = y2 - y1, steps = 6, nx = -dy * 0.25, ny = dx * 0.25;
    for (let i = 1; i < steps; i++) {
      const t = i / steps, side = (i % 2 === 0) ? 1 : -1;
      ctx.lineTo(x1 + dx * t + nx * side, y1 + dy * t + ny * side);
    }
    ctx.lineTo(x2, y2); ctx.stroke();
  }

  function draw() {
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    if (!isPlaying) return;

    cameraX += (chassis.x - 120 - cameraX) * 0.1;
    cameraY += (chassis.y - 140 - cameraY) * 0.1;

    const cosA = Math.cos(chassis.angle), sinA = Math.sin(chassis.angle);

    if (isGasPressed && Math.random() < 0.6) {
      particles.push({
        x: chassis.x - cosA * 22 + sinA * 4, y: chassis.y - sinA * 22 - cosA * 4,
        vx: -cosA * 2 + (Math.random() - 0.5), vy: -sinA * 2 + (Math.random() - 0.5) - 0.4,
        r: 2.5, alpha: 0.7
      });
    }

    ctx.save(); ctx.translate(-cameraX, -cameraY);

    const skyGrad = ctx.createLinearGradient(0, cameraY, 0, cameraY + HEIGHT);
    skyGrad.addColorStop(0, '#1e293b'); skyGrad.addColorStop(0.4, '#38bdf8'); skyGrad.addColorStop(1, '#bae6fd');
    ctx.fillStyle = skyGrad; ctx.fillRect(cameraX, cameraY, WIDTH, HEIGHT);

    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    for (let px = cameraX - (cameraX % 180); px < cameraX + WIDTH + 180; px += 140) {
      const cloudY = 30 + Math.sin(px * 0.05) * 10;
      ctx.beginPath(); ctx.arc(px, cloudY, 14, 0, Math.PI * 2); ctx.arc(px + 10, cloudY - 4, 18, 0, Math.PI * 2); ctx.arc(px + 24, cloudY, 12, 0, Math.PI * 2); ctx.fill();
    }

    ctx.fillStyle = '#451a03'; ctx.beginPath(); ctx.moveTo(cameraX - 20, cameraY + HEIGHT);
    for (let px = cameraX - 20; px < cameraX + WIDTH + 20; px += 10) ctx.lineTo(px, getTerrainHeight(px));
    ctx.lineTo(cameraX + WIDTH + 20, cameraY + HEIGHT); ctx.fill();

    ctx.fillStyle = '#16a34a'; ctx.beginPath(); ctx.moveTo(cameraX - 20, cameraY + HEIGHT);
    for (let px = cameraX - 20; px < cameraX + WIDTH + 20; px += 10) ctx.lineTo(px, getTerrainHeight(px));
    ctx.lineTo(cameraX + WIDTH + 20, getTerrainHeight(cameraX + WIDTH + 20) + 7);
    for (let px = cameraX + WIDTH + 20; px >= cameraX - 20; px -= 10) ctx.lineTo(px, getTerrainHeight(px) + 7);
    ctx.fill();

    for (let px = cameraX - 40; px < cameraX + WIDTH + 40; px += 20) {
      const houseStart = Math.floor(px / 850) * 850 + 680;
      if (Math.abs(px - houseStart) < 10) {
        const th = getTerrainHeight(houseStart + 35);
        ctx.fillStyle = '#b91c1c'; ctx.fillRect(houseStart + 10, th + 8, 50, 24);
        ctx.strokeStyle = '#7f1d1d'; ctx.lineWidth = 1.5; ctx.strokeRect(houseStart + 10, th + 8, 50, 24);
        ctx.fillStyle = '#fef08a'; ctx.fillRect(houseStart + 18, th + 14, 10, 10);
        ctx.fillStyle = '#78350f'; ctx.fillRect(houseStart + 38, th + 16, 12, 16);
        ctx.fillStyle = '#7c2d12'; ctx.beginPath(); ctx.moveTo(houseStart + 5, th + 8); ctx.lineTo(houseStart + 35, th - 16); ctx.lineTo(houseStart + 65, th + 8); ctx.closePath(); ctx.fill(); ctx.stroke();
      }
      const rampStart = Math.floor(px / 550) * 550 + 380;
      if (Math.abs(px - rampStart) < 10) {
        const th = getTerrainHeight(rampStart + 22);
        ctx.fillStyle = '#d97706'; ctx.beginPath(); ctx.moveTo(rampStart, th + 14); ctx.lineTo(rampStart + 45, th - 12); ctx.lineTo(rampStart + 45, th + 14); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#78350f'; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.fillStyle = '#facc15'; ctx.fillRect(rampStart + 28, th, 12, 3);
      }
      const rockStart = Math.floor(px / 320) * 320 + 200;
      if (Math.abs(px - rockStart) < 10) {
        const th = getTerrainHeight(rockStart + 12);
        ctx.fillStyle = '#64748b'; ctx.beginPath(); ctx.arc(rockStart + 12, th + 4, 10, Math.PI, 0); ctx.fill();
        ctx.strokeStyle = '#334155'; ctx.lineWidth = 1.5; ctx.stroke();
      }
    }

    items.forEach(it => {
      if (it.collected || it.x < cameraX - 20 || it.x > cameraX + WIDTH + 20) return;
      ctx.save(); ctx.translate(it.x, it.y);
      if (it.type === 'coin') {
        ctx.fillStyle = '#facc15'; ctx.beginPath(); ctx.arc(0, 0, 7, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#ca8a04'; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.fillStyle = '#ca8a04'; ctx.font = '9px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('$', 0, 0.5);
      } else {
        ctx.fillStyle = '#ef4444'; ctx.fillRect(-6, -9, 12, 16);
        ctx.fillStyle = '#f8fafc'; ctx.font = 'bold 8px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('GAS', 0, 0);
      }
      ctx.restore();
    });

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i]; p.x += p.vx; p.y += p.vy; p.r += 0.15; p.alpha -= 0.03;
      if (p.alpha <= 0) { particles.splice(i, 1); continue; }
      ctx.fillStyle = 'rgba(210, 210, 220, ' + p.alpha + ')'; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
    }

    for (let i = floatTexts.length - 1; i >= 0; i--) {
      const ft = floatTexts[i]; ft.y -= 0.8; ft.alpha -= 0.025;
      if (ft.alpha <= 0) { floatTexts.splice(i, 1); continue; }
      ctx.fillStyle = ft.color; ctx.globalAlpha = ft.alpha; ctx.font = 'bold 12px system-ui, sans-serif'; ctx.fillText(ft.text, ft.x, ft.y); ctx.globalAlpha = 1.0;
    }

    drawSpring(chassis.x - cosA * 18, chassis.y - sinA * 18, wheelR.x, wheelR.y);
    drawSpring(chassis.x + cosA * 18, chassis.y + sinA * 18, wheelF.x, wheelF.y);

    const wR = 10;
    [wheelF, wheelR].forEach(w => {
      ctx.save(); ctx.translate(w.x, w.y); ctx.rotate(w.rot);
      ctx.fillStyle = '#0f172a'; ctx.beginPath(); ctx.arc(0, 0, wR, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = '#334155';
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) ctx.fillRect(Math.cos(a) * (wR - 1.5) - 1, Math.sin(a) * (wR - 1.5) - 1, 2, 2);
      ctx.fillStyle = '#cbd5e1'; ctx.beginPath(); ctx.arc(0, 0, wR * 0.55, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#475569'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-wR * 0.5, 0); ctx.lineTo(wR * 0.5, 0); ctx.moveTo(0, -wR * 0.5); ctx.lineTo(0, wR * 0.5); ctx.stroke();
      ctx.fillStyle = '#facc15'; ctx.beginPath(); ctx.arc(0, 0, 2, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    });

    ctx.save(); ctx.translate(chassis.x, chassis.y); ctx.rotate(chassis.angle);
    ctx.fillStyle = '#1e293b'; ctx.beginPath(); ctx.arc(-22, -3, 8, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#475569'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = '#dc2626'; ctx.beginPath(); ctx.roundRect(-20, -9, 40, 13, 3); ctx.fill();
    ctx.strokeStyle = '#7f1d1d'; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.fillStyle = '#facc15'; ctx.fillRect(-16, -3, 32, 2.5);
    ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-14, -9); ctx.lineTo(-8, -19); ctx.lineTo(8, -19); ctx.lineTo(14, -9); ctx.stroke();
    ctx.fillStyle = 'rgba(56, 189, 248, 0.5)'; ctx.beginPath(); ctx.moveTo(-6, -18); ctx.lineTo(6, -18); ctx.lineTo(12, -9); ctx.lineTo(-6, -9); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#2563eb'; ctx.fillRect(-3, -15, 7, 6);
    ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.arc(0, -18, 4.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#facc15'; ctx.fillRect(-4.5, -19, 9, 1.5);
    ctx.fillStyle = '#0f172a'; ctx.fillRect(1, -19.5, 3.5, 2.5);
    ctx.fillStyle = '#fef08a'; ctx.beginPath(); ctx.arc(20, -3, 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(254, 240, 138, 0.25)'; ctx.beginPath(); ctx.moveTo(20, -3); ctx.lineTo(48, -14); ctx.lineTo(48, 8); ctx.closePath(); ctx.fill(); ctx.restore();
    ctx.restore();

    ctx.fillStyle = 'rgba(15, 23, 42, 0.75)'; ctx.fillRect(WIDTH - 86, 8, 78, 16);
    ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.strokeRect(WIDTH - 86, 8, 78, 16);
    ctx.fillStyle = fuel < 25 ? '#ef4444' : '#22c55e'; ctx.font = 'bold 9px Arial'; ctx.fillText('⛽', WIDTH - 81, 19);
    ctx.fillStyle = fuel < 25 ? '#ef4444' : (fuel < 50 ? '#eab308' : '#22c55e'); ctx.fillRect(WIDTH - 68, 11, Math.max(0, (fuel / 100) * 55), 10);
  }

  function loop(timestamp) {
    if (!isPlaying) return;
    if (!lastTime) lastTime = timestamp;
    const dt = Math.min((timestamp - lastTime) / 16.67, 2.0);
    lastTime = timestamp;
    update(dt); draw();
    if (!isGameOver) animId = requestAnimationFrame(loop);
  }

  function bindTouch(element, onPress, onRelease) {
    if(!element) return;
    const start = (e) => { if(e.cancelable) e.preventDefault(); e.stopPropagation(); element.classList.add('touching'); onPress(); };
    const end = (e) => { if(e.cancelable) e.preventDefault(); e.stopPropagation(); element.classList.remove('touching'); onRelease(); };
    element.addEventListener('pointerdown', start); element.addEventListener('pointerup', end); element.addEventListener('pointercancel', end);
    element.addEventListener('touchstart', start, { passive: false }); element.addEventListener('touchend', end, { passive: false }); element.addEventListener('touchcancel', end, { passive: false });
    element.addEventListener('mousedown', start); element.addEventListener('mouseup', end); element.addEventListener('mouseleave', end);
  }

  function bindClick(element, fn) {
    if(!element) return;
    const tap = (e) => { if(e.cancelable) e.preventDefault(); e.stopPropagation(); element.classList.add('touching'); setTimeout(() => element.classList.remove('touching'), 100); fn(); };
    element.addEventListener('touchstart', tap, {passive: false}); element.addEventListener('mousedown', tap);
  }

  bindTouch(btnBrake, () => { isBrakePressed = true; }, () => { isBrakePressed = false; });
  bindTouch(btnGas, () => { isGasPressed = true; }, () => { isGasPressed = false; });

  const resetGame = () => {
    initAudio();
    gameOverOverlay.classList.add('hidden');
    startOverlay.classList.add('hidden');
    
    // BUNUH ANIMASI LAMA JIKA MASIH NYANGKUT
    if (animId) cancelAnimationFrame(animId);
    
    isPlaying = true; 
    initGame(); 
    startEngineSound();
    lastTime = 0; 
    animId = requestAnimationFrame(loop);
  };

  bindClick(btnStart, resetGame);
  bindClick(btnRetry, resetGame);
  bindClick(btnRestart, resetGame);

  bindClick(btnSound, () => {
    isMuted = !isMuted; btnSound.textContent = isMuted ? '🔇' : '🔊';
    if (isMuted) stopEngineSound(); else if (isPlaying && !isGameOver) startEngineSound();
  });

  initGame(); draw();
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

async function handleHillClimb(sock, msg, from, args) {
    try {
        console.log(`[HILL CLIMB] Game dijalankan di chat: ${from}`);
        if (msg.key) {
            await sock.sendMessage(from, { react: { text: '🚙', key: msg.key } }).catch(() => {});
        }
        await kirimForwardSigned(sock, from, HILLCLIMB_HTML, '🚙 HILL CLIMB RACING');
    } catch (e) {
        console.error('[HILL CLIMB ERROR]', e?.message || e);
        await sock.sendMessage(from, { text: '❌ Gagal memuat game: ' + (e?.message || e) }, { quoted: msg });
    }
}

module.exports = handleHillClimb;