// File: features/dino.js
const { randomUUID } = require('crypto');

const DINO_HTML = `<style>
/* CSS ANTI-SELECT WHATSAPP */
*{box-sizing:border-box;margin:0;padding:0;font-family:'Segoe UI',Arial,sans-serif;-webkit-tap-highlight-color:transparent;-webkit-touch-callout: none !important;-webkit-user-select: none !important;user-select: none !important;outline: none !important;}
html,body{width:100%;background:transparent;}
body{padding:8px;overflow-y:auto;overscroll-behavior:none;}

#app{
  max-width:420px;
  margin:0 auto;
  background-color: #0f172a;
  background-image:
    radial-gradient(circle at 50% 0%, #1e293b 0%, transparent 70%),
    linear-gradient(rgba(16,185,129,0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(16,185,129,0.05) 1px, transparent 1px);
  background-size: 100% 100%, 20px 20px, 20px 20px;
  padding:14px;
  border-radius:24px;
  border:2px solid #334155;
  box-shadow:0 12px 30px rgba(0,0,0,0.8), inset 0 0 20px rgba(0,0,0,0.5);
  color:#f8fafc;
}

.hdr{display:flex;flex-direction:column;gap:12px;padding:0 2px 14px;}
.hdr-top{display:flex;justify-content:space-between;align-items:center;width:100%;}
.tt{text-align:left;}
.tt-main{font:900 24px 'Arial Black';color:#10b981;text-shadow:0 0 15px rgba(16,185,129,0.5);letter-spacing:2px;line-height:1;}
.tt-sub{display:block;font:700 8px Arial;letter-spacing:2px;color:#94a3b8;margin-top:4px;}

.mbtn{width:42px;height:42px;border:2px solid rgba(16,185,129,.4);border-radius:12px;background:rgba(0,0,0,.5);color:#fff;font-size:18px;cursor:pointer;display:grid;place-items:center;transition:0.1s;flex-shrink:0;}
.mbtn:active{filter:brightness(1.5);transform:scale(0.95)}

.hrs{display:flex;gap:8px;width:100%;}
.hr{flex:1;background:rgba(0,0,0,.5);border:1px solid rgba(16,185,129,.3);border-radius:10px;padding:8px 4px;text-align:center;box-shadow:inset 0 0 10px rgba(0,0,0,.6);min-width:0;}
.hr i{display:block;font:700 7px Arial;letter-spacing:1px;color:#94a3b8;white-space:nowrap;}
.hr b{display:block;font:900 13px 'Arial Black';color:#34d399;text-shadow:0 0 8px rgba(52,211,153,.4);margin-top:3px;white-space:nowrap;overflow:hidden;}

.gw{position:relative;border:3px solid #334155;border-radius:16px;overflow:hidden;background:#000;box-shadow:0 0 20px rgba(0,0,0,0.5);cursor:pointer}
canvas{width:100%;display:block;}

.over{position:absolute;inset:0;background:rgba(15,23,42,0.85);backdrop-filter:blur(4px);display:flex;flex-direction:column;align-items:center;justify-content:center;transition:opacity 0.2s}
.over.hide{opacity:0;pointer-events:none}
.o-msg{font:900 24px 'Arial Black';color:#10b981;text-shadow:0 0 15px rgba(16,185,129,0.6);margin-bottom:10px;text-align:center;line-height:1}
.o-sub{font:700 12px Arial;color:#cbd5e1;margin-bottom:24px;letter-spacing:1px;text-align:center;line-height:1.5;padding:0 15px}
.o-btn{background:linear-gradient(145deg,#059669,#047857);border:2px solid #34d399;color:#fff;font:900 13px 'Arial Black';padding:12px 28px;border-radius:14px;box-shadow:0 6px 0 #022c22, 0 10px 20px rgba(16,185,129,0.4);cursor:pointer;transition:0.1s}
.o-btn:active{transform:translateY(6px);box-shadow:0 0 0 #022c22, 0 5px 10px rgba(16,185,129,0.4)}

.pads{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:14px}
.pd{height:65px;border:2px solid rgba(255,255,255,.15);border-radius:16px;font:900 17px 'Arial Black';color:#fff;cursor:pointer;box-shadow:0 7px 0 rgba(0,0,0,.6), inset 0 2px 5px rgba(255,255,255,.2);transition:transform 0.05s, box-shadow 0.05s}
.pd:active, .pd.touching{transform:translateY(7px);box-shadow:none;filter:brightness(1.3)}
#duckB{background:linear-gradient(#f59e0b,#d97706 60%,#92400e);text-shadow:0 2px 3px rgba(0,0,0,.6)}
#jumpB{background:linear-gradient(#10b981,#059669 60%,#047857);text-shadow:0 2px 3px rgba(0,0,0,.6)}

#stopB{width:100%;height:44px;margin-top:14px;background:rgba(255,255,255,.05);font-size:12px;border:1px dashed rgba(255,255,255,.2);border-radius:12px;color:#94a3b8;font-weight:bold;cursor:pointer}
#stopB:active, #stopB.touching{background:rgba(255,255,255,.1)}
</style>
<div id="app">
  <div class="hdr">
    <div class="hdr-top">
      <div class="tt">
        <div class="tt-main">DINO</div>
        <div class="tt-sub">JURASSIC EXPEDITION</div>
      </div>
      <button class="mbtn" id="muteB">🔊</button>
    </div>
    <div class="hrs">
      <div class="hr"><i>SCORE</i><b id="sc">0</b></div>
      <div class="hr"><i>BEST</i><b id="bs">0</b></div>
      <div class="hr"><i>TIME</i><b id="sp">SIANG</b></div>
    </div>
  </div>
  <div class="gw">
    <canvas id="cv" width="400" height="300"></canvas>
    <div id="over" class="over">
      <div class="o-msg" id="o-msg">READY?</div>
      <!-- INI ELEMEN YANG SEBELUMNYA HILANG -->
      <div class="o-sub" id="o-sub"></div> 
      <div class="o-btn" id="startB">TAP TO START</div>
    </div>
  </div>
  <div class="pads">
    <button class="pd" id="duckB">⬇ NUNDUK</button>
    <button class="pd" id="jumpB">⬆ LOMPAT</button>
  </div>
  <button id="stopB">↻ RESTART GAME</button>
</div>
<script>
// MATIKAN KLIK KANAN & SELECT TEXT (Anti-Bug WhatsApp)
window.oncontextmenu = function(e) { e.preventDefault(); e.stopPropagation(); return false; };
document.body.onselectstart = function(e) { e.preventDefault(); return false; };
window.onerror=function(){};

(function(){
  const cv = document.getElementById('cv');
  const ctx = cv.getContext('2d');
  const scEl = document.getElementById('sc');
  const bsEl = document.getElementById('bs');
  const spEl = document.getElementById('sp');
  const overEl = document.getElementById('over');
  const oMsg = document.getElementById('o-msg');
  const oSub = document.getElementById('o-sub');
  const mb = document.getElementById('muteB');
  
  let best = 0;
  try { best = parseInt(localStorage.getItem('dino_rev_best') || '0', 10) || 0; } catch(e){}
  bsEl.textContent = best;

  const W = 400;
  const H = 300;
  const groundY = 240;
  
  let state = 'ready'; 
  let score = 0;
  let frame = 0;
  let speed = 4.2;
  let bgOffset = 0;
  
  let framesSinceSpawn = 0;
  let consecutiveCacti = 0;
  
  let obstacles = [];
  let particles = [];
  let clouds = [];
  let mountains = [];
  let airplane = { active: false, x: -50, y: 0, speed: 0 };
  
  let AC = null, MUTED = false;
  try { MUTED = localStorage.getItem('dino_mute') === '1'; } catch(e){}
  if(MUTED) mb.textContent = '🔇';

  function ac() {
    if(!AC){try{AC=new(window.AudioContext||window.webkitAudioContext)()}catch(e){return null;}}
    if(AC && AC.state === 'suspended'){try{AC.resume()}catch(e){}}
    return AC;
  }
  
  function tone(f, d, t, v, at) {
    var a = AC; if(!a || MUTED) return;
    try {
      var n = a.currentTime + (at || 0), o = a.createOscillator(), g = a.createGain();
      o.type = t || 'square'; o.frequency.setValueAtTime(f, n);
      g.gain.setValueAtTime(v || 0.3, n); g.gain.exponentialRampToValueAtTime(0.0001, n + d);
      o.connect(g); g.connect(a.destination); o.start(n); o.stop(n + d + 0.03);
    } catch(e){}
  }
  
  function noiz(d, v, at) {
    var a = AC; if(!a || MUTED) return;
    try {
      var n = a.currentTime + (at || 0), len = Math.floor(a.sampleRate * d), b = a.createBuffer(1, len, a.sampleRate), c = b.getChannelData(0);
      for(let i=0; i<len; i++) c[i] = Math.random() * 2 - 1;
      var s = a.createBufferSource(), g = a.createGain();
      s.buffer = b; g.gain.setValueAtTime(v, n); g.gain.exponentialRampToValueAtTime(0.0001, n + d);
      s.connect(g); g.connect(a.destination); s.start(n); s.stop(n + d + 0.03);
    } catch(e){}
  }

  function sJumpSnd() { tone(440, 0.12, 'sine', 0.45); tone(700, 0.18, 'sine', 0.45, 0.05); }
  function sDuckSnd() { tone(280, 0.12, 'triangle', 0.35); }
  function sScoreSnd() { tone(880, 0.1, 'square', 0.3); tone(1320, 0.15, 'square', 0.3, 0.1); }
  function sDieSnd() { noiz(0.4, 0.5); tone(130, 0.45, 'sawtooth', 0.4); tone(80, 0.55, 'sawtooth', 0.4, 0.1); }

  let bgmNext = 0;
  let bgmStep = 0;
  const lead = [440, 0, 494, 0, 523, 0, 587, 0, 659, 0, 659, 0, 659, 0, 0, 0, 440, 0, 523, 0, 659, 0, 784, 0, 659, 0, 0, 0, 587, 0, 0, 0];
  const bass = [220, 0, 0, 0, 196, 0, 0, 0, 174, 0, 0, 0, 164, 0, 0, 0, 220, 0, 0, 0, 261, 0, 0, 0, 329, 0, 0, 0, 293, 0, 0, 0];
  
  function playBGM() {
    if(!AC || MUTED || state !== 'play') return;
    let spb = 0.15 - Math.min(0.05, score/5000); 
    while(bgmNext < AC.currentTime + 0.1) {
      let s = bgmStep % 32;
      let at = Math.max(0, bgmNext - AC.currentTime);
      if(bass[s]) tone(bass[s], 0.15, 'sawtooth', 0.04, at); 
      if(lead[s]) tone(lead[s], 0.1, 'square', 0.02, at);   
      if(s % 4 === 0) noiz(0.02, 0.015, at); 
      bgmStep++;
      bgmNext += spb;
    }
  }

  // --- SYSTEM EVENT BINDING ANTI-WHATSAPP ---
  function bindTap(id, fn) {
    const btn = document.getElementById(id);
    if(!btn) return;
    const press = (e) => { 
        if(e.cancelable) e.preventDefault(); 
        e.stopPropagation(); 
        btn.classList.add('touching');
        fn(); 
    };
    const release = (e) => {
        if(e.cancelable) e.preventDefault(); 
        e.stopPropagation(); 
        btn.classList.remove('touching');
    }
    btn.addEventListener('touchstart', press, {passive: false});
    btn.addEventListener('touchend', release, {passive: false});
    btn.addEventListener('mousedown', press);
    btn.addEventListener('mouseup', release);
  }

  bindTap('muteB', function() {
    MUTED = !MUTED; mb.textContent = MUTED ? '🔇' : '🔊';
    try{ localStorage.setItem('dino_mute', MUTED ? '1' : '0'); }catch(e){}
    if(!MUTED && state === 'play') bgmNext = ac().currentTime;
  });

  const p = {
    x: 320, y: 0,
    w: 24, h: 28,
    vy: 0, grav: 0.65, jump: -11.5,
    duckTimer: 0 
  };

  function initMountains() {
    mountains = [];
    let mx = W + 50;
    while(mx > -200) {
      let w = 100 + Math.random() * 80;
      let h = 50 + Math.random() * 60;
      let gap = 120 + Math.random() * 180;
      mountains.push({ x: mx, w: w, h: h });
      mx -= (w + gap);
    }
  }

  for(let i=0; i<5; i++) clouds.push({ x: Math.random() * W, y: 20 + Math.random() * 80, speed: 0.5 + Math.random() });

  function sJump() { 
    ac();
    if (p.y + p.h >= groundY || p.duckTimer > 0) {
      p.duckTimer = 0; 
      p.h = 28; 
      p.y = groundY - p.h; 
      p.vy = p.jump; 
      createParts(p.x + 10, groundY, '#cbd5e1', 5); 
      sJumpSnd();
    }
  }
  
  function sDuck() { 
    if(state === 'play' && p.y + p.h >= groundY) {
      ac();
      p.duckTimer = 65; 
      sDuckSnd();
    }
  }

  // Bind semua tombol menggunakan sistem baru
  bindTap('jumpB', sJump);
  bindTap('duckB', sDuck);
  bindTap('startB', startGame);
  bindTap('stopB', () => { state = 'ready'; init(); });

  const palettes = [
    { top1: [56,189,248], top2: [186,230,253], gC: [234,179,8], gL: [161,98,7], str: 'SIANG ☀️', col: '#f59e0b', mt: [148,163,184] },
    { top1: [244,63,94], top2: [251,146,60], gC: [180,83,9], gL: [120,53,15], str: 'SENJA 🌇', col: '#ef4444', mt: [148,163,184] },
    { top1: [15,23,42], top2: [30,41,59], gC: [6,78,59], gL: [2,44,34], str: 'MALAM 🌙', col: '#94a3b8', mt: [51,65,85] }
  ];
  let currC = {
    top1: [...palettes[0].top1], top2: [...palettes[0].top2], 
    gC: [...palettes[0].gC], gL: [...palettes[0].gL], mt: [...palettes[0].mt]
  };

  function lerp(start, end, amt) { return (1 - amt) * start + amt * end; }
  function toRGB(arr) { return 'rgb(' + Math.floor(arr[0]) + ',' + Math.floor(arr[1]) + ',' + Math.floor(arr[2]) + ')'; }

  function init() {
    score = 0;
    speed = 4.2;
    frame = 0;
    framesSinceSpawn = 0;
    consecutiveCacti = 0;
    obstacles = [];
    particles = [];
    airplane.active = false;
    p.y = groundY - p.h;
    p.vy = 0;
    p.duckTimer = 0;
    scEl.textContent = '0';
    
    initMountains();

    if(state === 'ready') {
      overEl.classList.remove('hide');
      oMsg.textContent = 'DINO RUN';
      oMsg.style.color = '#10b981';
      oSub.textContent = '';
    }
  }

  function startGame() {
    ac();
    if(AC) bgmNext = AC.currentTime;
    init();
    state = 'play';
    overEl.classList.add('hide');
  }

  function die() {
    state = 'dead';
    sDieSnd();
    createParts(p.x+p.w/2, p.y+p.h/2, '#ef4444', 30);
    
    if (Math.floor(score) > best) {
      best = Math.floor(score);
      bsEl.textContent = best;
      try { localStorage.setItem('dino_rev_best', String(best)); } catch(e){}
    }
    
    overEl.classList.remove('hide');
    oMsg.textContent = 'CRASHED!';
    oMsg.style.color = '#ef4444';
    oSub.textContent = 'Score Akhir: ' + Math.floor(score);
  }

  function createParts(x, y, c, count) {
    for(let i=0; i<count; i++){
      particles.push({
        x: x, y: y,
        vx: (Math.random() - 0.5) * 8,
        vy: (Math.random() - 1) * 7,
        life: 1, c: c, size: Math.random() * 4 + 2
      });
    }
  }

  function spawnObstacle() {
    const rand = Math.random();
    let type, w, h, y, speedMod = 0;

    if (score < 100) {
      type = 'CACTUS'; 
    } else {
      if (consecutiveCacti >= 2) {
        type = rand < 0.5 ? 'BIRD_LOW' : 'BIRD_HIGH';
      } else {
        if (rand < 0.5) type = 'CACTUS';
        else if (rand < 0.75) type = 'BIRD_LOW';
        else type = 'BIRD_HIGH';
      }
    }

    if (type === 'CACTUS') consecutiveCacti++;
    else consecutiveCacti = 0;

    if (type === 'CACTUS') {
      w = 20 + Math.random() * 8;
      h = 25 + Math.random() * 20;
      y = groundY - h;
    } else if (type === 'BIRD_LOW') {
      w = 26; h = 18;
      y = groundY - h - 10 - Math.random() * 8;
      speedMod = Math.random() * 1.5; 
    } else if (type === 'BIRD_HIGH') {
      w = 26; h = 18;
      y = groundY - 45 - Math.random() * 10;
      speedMod = Math.random() * 2.0;
    }
    
    let minGap = Math.max(65, 95 - Math.floor(score/30));
    obstacles.push({ x: -40, y: y, w: w, h: h, type: type, smod: speedMod });
  }

  function update() {
    if (state !== 'play') return;
    frame++;
    framesSinceSpawn++;
    playBGM();

    p.vy += p.grav;
    p.y += p.vy;

    if (p.duckTimer > 0) {
      p.duckTimer--;
      p.h = 16;
    } else {
      p.h = 28;
    }

    if (p.y + p.h >= groundY) {
      p.y = groundY - p.h;
      p.vy = 0;
    }

    let requiredGap = Math.max(60, 90 - Math.floor(score/30)); 
    if (framesSinceSpawn >= requiredGap) {
      if (Math.random() < 0.08 || framesSinceSpawn > requiredGap + 35) {
        spawnObstacle();
        framesSinceSpawn = 0;
      }
    }

    bgOffset += speed * 0.5;

    mountains.forEach(m => m.x += speed * 0.15);
    mountains = mountains.filter(m => m.x < W + 100);
    
    let minX = mountains.length > 0 ? Math.min(...mountains.map(m => m.x)) : 0;
    if (minX > -50) {
      let w = 100 + Math.random() * 80;
      let h = 50 + Math.random() * 60;
      let gap = 120 + Math.random() * 180;
      mountains.push({ x: minX - w - gap, w: w, h: h });
    }

    for (let i = obstacles.length - 1; i >= 0; i--) {
      let o = obstacles[i];
      o.x += speed + o.smod;

      if (
        p.x < o.x + o.w - 5 &&
        p.x + p.w > o.x + 5 &&
        p.y < o.y + o.h - 5 &&
        p.y + p.h > o.y + 5
      ) {
        die();
      }

      if (o.x > W + 40) obstacles.splice(i, 1);
    }

    if (!airplane.active && Math.random() < 0.0003) {
      airplane.active = true;
      airplane.x = -50;
      airplane.y = 30 + Math.random() * 60;
      airplane.speed = 1.2 + Math.random();
    }
    if (airplane.active) {
      airplane.x += airplane.speed;
      if (airplane.x > W + 50) airplane.active = false;
    }

    for (let i = particles.length - 1; i >= 0; i--) {
      let pt = particles[i];
      pt.x += pt.vx; pt.y += pt.vy; pt.life -= 0.04;
      if (pt.life <= 0) particles.splice(i, 1);
    }

    let oldScore = Math.floor(score);
    score += 0.12;
    speed += 0.001;
    
    if (Math.floor(score) > oldScore && Math.floor(score) % 100 === 0) {
      sScoreSnd();
    }
    
    if (frame % 4 === 0) {
      scEl.textContent = Math.floor(score);
    }
  }

  function draw() {
    let targetPhase = Math.floor(score / 350) % 3;
    let pT = palettes[targetPhase];
    
    spEl.textContent = pT.str;
    spEl.style.color = pT.col;

    for(let i=0; i<3; i++) {
      currC.top1[i] = lerp(currC.top1[i], pT.top1[i], 0.05); 
      currC.top2[i] = lerp(currC.top2[i], pT.top2[i], 0.05);
      currC.gC[i]   = lerp(currC.gC[i],   pT.gC[i],   0.05);
      currC.gL[i]   = lerp(currC.gL[i],   pT.gL[i],   0.05);
      currC.mt[i]   = lerp(currC.mt[i],   pT.mt[i],   0.05);
    }

    let bgGradient = ctx.createLinearGradient(0, 0, 0, H);
    bgGradient.addColorStop(0, toRGB(currC.top1));
    bgGradient.addColorStop(1, toRGB(currC.top2));
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, W, H);

    ctx.font = '36px Arial';
    if (targetPhase === 2) ctx.fillText('🌙', 40, 60);
    else ctx.fillText('☀️', 40, 60);

    ctx.font = '28px Arial';
    clouds.forEach(c => {
      c.x += c.speed;
      if (c.x > W + 30) { c.x = -30; c.y = 20 + Math.random() * 70; }
      ctx.globalAlpha = targetPhase === 2 ? 0.3 : 0.9;
      ctx.fillText('☁️', c.x, c.y);
      ctx.globalAlpha = 1.0;
    });

    if (airplane.active) {
      ctx.font = '24px Arial';
      ctx.globalAlpha = targetPhase === 2 ? 0.4 : 0.8;
      ctx.fillText('🛸', airplane.x, airplane.y);
      ctx.globalAlpha = 1.0;
    }

    mountains.forEach(m => {
      let grad = ctx.createLinearGradient(0, groundY - m.h, 0, groundY);
      let topBlend = \`rgb(\${Math.floor(currC.top2[0]*0.6)}, \${Math.floor(currC.top2[1]*0.6)}, \${Math.floor(currC.top2[2]*0.6)})\`;
      
      grad.addColorStop(0, topBlend);
      grad.addColorStop(0.6, topBlend);
      grad.addColorStop(1, 'rgba(5, 10, 15, 0.9)'); 
      
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(m.x, groundY);
      ctx.lineTo(m.x + m.w/2, groundY - m.h);
      ctx.lineTo(m.x + m.w, groundY);
      ctx.fill();
    });

    ctx.fillStyle = toRGB(currC.gC);
    ctx.fillRect(0, groundY, W, H - groundY);
    
    let bottomShadow = ctx.createLinearGradient(0, groundY - 20, 0, groundY + 10);
    bottomShadow.addColorStop(0, "rgba(0,0,0,0)");
    bottomShadow.addColorStop(1, "rgba(0,0,0,0.6)");
    ctx.fillStyle = bottomShadow;
    ctx.fillRect(0, groundY - 20, W, 30);

    ctx.strokeStyle = toRGB(currC.gL);
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(W, groundY);
    ctx.stroke();

    ctx.fillStyle = toRGB(currC.gL);
    for(let i = -40; i < W; i+= 40) {
      let ox = i + (bgOffset % 40);
      ctx.fillRect(ox, groundY + 8, 6, 4);
      ctx.fillRect(ox + 20, groundY + 20, 10, 4);
    }

    ctx.textAlign = 'center';
    for (let o of obstacles) {
      let emoji = '🌵';
      if (o.type === 'BIRD_LOW' || o.type === 'BIRD_HIGH') {
        emoji = (frame % 20 < 10) ? '🦅' : '🦇';
      }
      ctx.font = o.type === 'CACTUS' ? '32px Arial' : '28px Arial';
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#000';
      ctx.strokeText(emoji, o.x + o.w/2, o.y + o.h - 2);
      ctx.fillText(emoji, o.x + o.w/2, o.y + o.h - 2);
    }
    ctx.textAlign = 'left';

    if (state === 'play' || state === 'ready') {
      ctx.save();
      ctx.translate(p.x + p.w/2, p.y + p.h);
      ctx.font = '34px Arial';
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#000'; 

      if (p.duckTimer > 0) {
        ctx.scale(1.25, 0.55); 
        ctx.strokeText('🦖', -16, 0);
        ctx.fillText('🦖', -16, 0);
      } else {
        let bob = (state === 'play' && p.y + p.h >= groundY && frame % 10 < 5) ? -3 : 0;
        ctx.strokeText('🦖', -16, bob);
        ctx.fillText('🦖', -16, bob);
      }
      ctx.restore();
    }

    if (state === 'play' && p.y + p.h >= groundY && frame % 5 === 0) {
      createParts(p.x + 20, groundY, '#cbd5e1', 1);
    }
    
    for (let pt of particles) {
      ctx.globalAlpha = pt.life;
      ctx.fillStyle = pt.c;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI*2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
  }

  init();
  requestAnimationFrame(loop);
})();
</script>`;

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
                    submessages: [{
                        messageType: 2,
                        messageText: judul
                    }],
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

async function handleDino(sock, msg, from, args) {
    try {
        console.log(`[DINO] Game dijalankan di chat: ${from}`);
        if (msg.key) {
            await sock.sendMessage(from, { react: { text: '🦖', key: msg.key } }).catch(() => {});
        }
        await kirimForwardSigned(sock, from, DINO_HTML, '🦖 DINO RUN');
    } catch (e) {
        console.error('[DINO ERROR]', e?.message || e);
        await sock.sendMessage(from, { text: '❌ Gagal memuat game: ' + (e?.message || e) }, { quoted: msg });
    }
}

module.exports = handleDino;