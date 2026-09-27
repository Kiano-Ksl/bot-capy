const { randomUUID } = require("crypto");

const config = {
  name: "tetris",
  alias: ["blok", "tetrisgame"],
  category: "game",
  description: "Mainkan Tetris langsung di chat lewat GenAI HTML Player",
  usage: ".tetris",
  example: ".tetris"
};

function escapeHtml(text = "") {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function createTetrisGame({ playerName }) {
  const safeName = escapeHtml(playerName || "Sensei");

  return `
<style>
:root { --ink:#fff; --muted:#b9b1c6; --accent:#a992ff; --sys:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; }
* { margin:0; padding:0; box-sizing:border-box; -webkit-tap-highlight-color:transparent; user-select:none; }
html, body { background:transparent; color:var(--ink); font-family:var(--sys); min-height:100vh; -webkit-font-smoothing:antialiased; }
.wrap { min-height:100vh; display:flex; align-items:center; justify-content:center; padding:14px 10px; }
.shell { position:relative; width:100%; max-width:330px; border-radius:18px; overflow:hidden; background:linear-gradient(180deg,#140b22,#0b0614 70%); box-shadow:0 18px 40px rgba(0,0,0,.55); padding:14px 14px 16px; }
.head { display:flex; align-items:center; justify-content:space-between; margin-bottom:10px; }
.head__title { font-size:14px; font-weight:700; letter-spacing:.04em; }
.head__title span { color:var(--accent); }
.head__player { font-size:10px; color:var(--muted); }
.stats { display:flex; gap:8px; margin-bottom:10px; }
.stat { flex:1; background:rgba(255,255,255,.06); border-radius:10px; padding:6px 8px; text-align:center; }
.stat__label { font-size:9px; letter-spacing:.1em; text-transform:uppercase; color:var(--muted); }
.stat__value { font-size:15px; font-weight:700; margin-top:2px; }
.board-row { display:flex; gap:10px; align-items:flex-start; }
.board-wrap { position:relative; flex:1; }
canvas#board { display:block; width:100%; aspect-ratio:1/2; border-radius:10px; background:#0a0512; box-shadow:inset 0 0 0 1px rgba(255,255,255,.08); }
.side { width:64px; display:flex; flex-direction:column; gap:8px; }
.next-box { background:rgba(255,255,255,.06); border-radius:10px; padding:6px; }
.next-box__label { font-size:9px; letter-spacing:.08em; text-transform:uppercase; color:var(--muted); text-align:center; margin-bottom:4px; }
canvas#next { display:block; width:100%; aspect-ratio:1/1; background:#0a0512; border-radius:8px; }
.overlay { position:absolute; inset:0; display:none; align-items:center; justify-content:center; flex-direction:column; gap:10px; background:rgba(6,3,12,.82); border-radius:10px; text-align:center; padding:12px; }
.overlay.is-show { display:flex; }
.overlay__title { font-size:16px; font-weight:700; }
.overlay__desc { font-size:11px; color:var(--muted); line-height:1.5; }
.btn { border:none; border-radius:10px; padding:8px 16px; font-size:12px; font-weight:700; background:var(--accent); color:#140b22; cursor:pointer; }
.controls { margin-top:12px; display:flex; flex-direction:column; gap:8px; }
.controls__row { display:flex; gap:8px; }
.ctrl { flex:1; height:42px; border-radius:10px; border:none; background:rgba(255,255,255,.08); color:var(--ink); display:flex; align-items:center; justify-content:center; font-size:16px; cursor:pointer; }
.ctrl:active { background:rgba(169,146,255,.35); }
.ctrl.wide { flex:2; }
.ctrl svg { width:18px; height:18px; }
.note { margin-top:10px; text-align:center; font-size:9.5px; color:var(--muted); line-height:1.6; }
</style>
<div class="wrap">
<div class="shell">
    <div class="head">
        <div class="head__title">TE<span>TRIS</span></div>
        <div class="head__player">${safeName}</div>
    </div>
    <div class="stats">
        <div class="stat"><div class="stat__label">Score</div><div class="stat__value" id="score">0</div></div>
        <div class="stat"><div class="stat__label">Lines</div><div class="stat__value" id="lines">0</div></div>
        <div class="stat"><div class="stat__label">Level</div><div class="stat__value" id="level">1</div></div>
    </div>
    <div class="board-row">
        <div class="board-wrap">
            <canvas id="board" width="200" height="400"></canvas>
            <div class="overlay is-show" id="overlay">
                <div class="overlay__title" id="overlayTitle">Siap Bermain?</div>
                <div class="overlay__desc" id="overlayDesc">Susun balok, penuhi baris, jangan sampai numpuk ke atas!</div>
                <button class="btn" id="startBtn">Mulai</button>
            </div>
        </div>
        <div class="side">
            <div class="next-box">
                <div class="next-box__label">Next</div>
                <canvas id="next" width="80" height="80"></canvas>
            </div>
        </div>
    </div>
    <div class="controls">
        <div class="controls__row">
            <button class="ctrl" id="btnLeft" aria-label="Kiri"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m15 6-6 6 6 6"/></svg></button>
            <button class="ctrl" id="btnRotate" aria-label="Putar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 3v6h-6"/></svg></button>
            <button class="ctrl" id="btnRight" aria-label="Kanan"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m9 6 6 6-6 6"/></svg></button>
        </div>
        <div class="controls__row">
            <button class="ctrl wide" id="btnDown" aria-label="Turun"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>&nbsp;Soft Drop</button>
            <button class="ctrl wide" id="btnDrop" aria-label="Jatuhkan"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v14"/><path d="m6 11 6 6 6-6"/><path d="M5 21h14"/></svg>&nbsp;Hard Drop</button>
        </div>
    </div>
    <div class="note">Ketuk tombol untuk main. Skor naik tiap baris penuh~</div>
</div>
</div>
<script>
(function(){
"use strict";
const COLS = 10;
const ROWS = 20;
const boardCanvas = document.getElementById("board");
const nextCanvas = document.getElementById("next");
const bctx = boardCanvas.getContext("2d");
const nctx = nextCanvas.getContext("2d");
const scoreEl = document.getElementById("score");
const linesEl = document.getElementById("lines");
const levelEl = document.getElementById("level");
const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlayTitle");
const overlayDesc = document.getElementById("overlayDesc");
const startBtn = document.getElementById("startBtn");
let cell = boardCanvas.width / COLS;
const COLORS = { I: "#5ce1e6", J: "#5c7cfa", L: "#ffa94d", O: "#ffd43b", S: "#69db7c", T: "#c084fc", Z: "#ff6b6b" };
const SHAPES = {
    I: [[1,1,1,1]],
    J: [[1,0,0], [1,1,1]],
    L: [[0,0,1], [1,1,1]],
    O: [[1,1], [1,1]],
    S: [[0,1,1], [1,1,0]],
    T: [[0,1,0], [1,1,1]],
    Z: [[1,1,0], [0,1,1]]
};
const TYPES = Object.keys(SHAPES);
let grid = null; let current = null; let next = null;
let score = 0; let lines = 0; let level = 1;
let dropInterval = 800; let dropTimer = null;
let running = false; let gameOver = false;

function emptyGrid(){ const g = []; for(let r = 0; r < ROWS; r++){ g.push(new Array(COLS).fill(null)); } return g; }
function randomPiece(){
    const type = TYPES[Math.floor(Math.random() * TYPES.length)];
    const shape = SHAPES[type].map(row => row.slice());
    return { type, shape, color: COLORS[type], row: 0, col: Math.floor((COLS - shape[0].length) / 2) };
}
function rotateMatrix(matrix){
    const rows = matrix.length; const cols = matrix[0].length; const result = [];
    for(let c = 0; c < cols; c++){ const row = []; for(let r = rows - 1; r >= 0; r--){ row.push(matrix[r][c]); } result.push(row); }
    return result;
}
function collides(shape, row, col){
    for(let r = 0; r < shape.length; r++){
        for(let c = 0; c < shape[r].length; c++){
            if(!shape[r][c]) continue;
            const gr = row + r; const gc = col + c;
            if(gc < 0 || gc >= COLS || gr >= ROWS) return true;
            if(gr >= 0 && grid[gr][gc]) return true;
        }
    }
    return false;
}
function merge(){
    const { shape, row, col, color } = current;
    for(let r = 0; r < shape.length; r++){
        for(let c = 0; c < shape[r].length; c++){
            if(!shape[r][c]) continue;
            const gr = row + r; const gc = col + c;
            if(gr >= 0){ grid[gr][gc] = color; }
        }
    }
}
function clearLines(){
    let cleared = 0;
    for(let r = ROWS - 1; r >= 0; r--){
        if(grid[r].every(cell => cell)){
            grid.splice(r, 1);
            grid.unshift(new Array(COLS).fill(null));
            cleared++; r++;
        }
    }
    if(cleared > 0){
        const points = [0, 100, 300, 500, 800][cleared] || 1000;
        score += points * level;
        lines += cleared;
        level = 1 + Math.floor(lines / 10);
        dropInterval = Math.max(120, 800 - (level - 1) * 70);
        scoreEl.textContent = score; linesEl.textContent = lines; levelEl.textContent = level;
    }
}
function spawnPiece(){
    current = next; next = randomPiece();
    current.row = 0; current.col = Math.floor((COLS - current.shape[0].length) / 2);
    if(collides(current.shape, current.row, current.col)){ endGame(); }
    drawNext();
}
function moveDown(){
    if(gameOver || !running) return;
    if(!collides(current.shape, current.row + 1, current.col)){ current.row++; }
    else{ merge(); clearLines(); spawnPiece(); }
    draw();
}
function hardDrop(){
    if(gameOver || !running) return;
    while(!collides(current.shape, current.row + 1, current.col)){ current.row++; score += 2; }
    scoreEl.textContent = score;
    merge(); clearLines(); spawnPiece(); draw();
}
function moveHorizontal(dir){
    if(gameOver || !running) return;
    if(!collides(current.shape, current.row, current.col + dir)){ current.col += dir; draw(); }
}
function rotatePiece(){
    if(gameOver || !running) return;
    const rotated = rotateMatrix(current.shape);
    const kicks = [0, -1, 1, -2, 2];
    for(const kick of kicks){
        if(!collides(rotated, current.row, current.col + kick)){
            current.shape = rotated; current.col += kick; draw(); return;
        }
    }
}
function drawCell(ctx, x, y, size, color){
    ctx.fillStyle = color; ctx.fillRect(x, y, size, size);
    ctx.strokeStyle = "rgba(0,0,0,.35)"; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, size - 1, size - 1);
    ctx.fillStyle = "rgba(255,255,255,.18)"; ctx.fillRect(x, y, size, Math.max(2, size * 0.15));
}
function draw(){
    cell = boardCanvas.width / COLS;
    bctx.clearRect(0, 0, boardCanvas.width, boardCanvas.height);
    bctx.strokeStyle = "rgba(255,255,255,.035)"; bctx.lineWidth = 1;
    for(let r = 0; r <= ROWS; r++){ bctx.beginPath(); bctx.moveTo(0, r * cell); bctx.lineTo(boardCanvas.width, r * cell); bctx.stroke(); }
    for(let c = 0; c <= COLS; c++){ bctx.beginPath(); bctx.moveTo(c * cell, 0); bctx.lineTo(c * cell, boardCanvas.height); bctx.stroke(); }
    if(grid){
        for(let r = 0; r < ROWS; r++){
            for(let c = 0; c < COLS; c++){
                if(grid[r][c]){ drawCell(bctx, c * cell, r * cell, cell, grid[r][c]); }
            }
        }
    }
    if(current){
        const { shape, row, col, color } = current;
        for(let r = 0; r < shape.length; r++){
            for(let c = 0; c < shape[r].length; c++){
                if(!shape[r][c]) continue;
                const gr = row + r; const gc = col + c;
                if(gr >= 0){ drawCell(bctx, gc * cell, gr * cell, cell, color); }
            }
        }
    }
}
function drawNext(){
    nctx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
    if(!next) return;
    const shape = next.shape; const size = 16;
    const w = shape[0].length * size; const h = shape.length * size;
    const ox = (nextCanvas.width - w) / 2; const oy = (nextCanvas.height - h) / 2;
    for(let r = 0; r < shape.length; r++){
        for(let c = 0; c < shape[r].length; c++){
            if(!shape[r][c]) continue;
            drawCell(nctx, ox + c * size, oy + r * size, size, next.color);
        }
    }
}
function tick(){
    if(!running || gameOver) return;
    moveDown(); dropTimer = setTimeout(tick, dropInterval);
}
function startGame(){
    clearTimeout(dropTimer); grid = emptyGrid();
    score = 0; lines = 0; level = 1; dropInterval = 800;
    running = true; gameOver = false;
    scoreEl.textContent = "0"; linesEl.textContent = "0"; levelEl.textContent = "1";
    overlayTitle.textContent = "Siap Bermain?"; overlayDesc.textContent = "Susun balok, penuhi baris, jangan sampai numpuk ke atas!"; startBtn.textContent = "Mulai";
    next = randomPiece(); spawnPiece(); draw();
    overlay.classList.remove("is-show");
    dropTimer = setTimeout(tick, dropInterval);
}
function endGame(){
    running = false; gameOver = true; clearTimeout(dropTimer);
    overlayTitle.textContent = "Game Over"; overlayDesc.textContent = "Skor kamu: " + score + " | Baris: " + lines; startBtn.textContent = "Main Lagi";
    overlay.classList.add("is-show"); draw();
}
startBtn.addEventListener("click", startGame);
document.getElementById("btnLeft").addEventListener("click", function(){ moveHorizontal(-1); });
document.getElementById("btnRight").addEventListener("click", function(){ moveHorizontal(1); });
document.getElementById("btnRotate").addEventListener("click", rotatePiece);
document.getElementById("btnDown").addEventListener("click", moveDown);
document.getElementById("btnDrop").addEventListener("click", hardDrop);
document.addEventListener("keydown", function(e){
    if(!running) return;
    if(e.key === "ArrowLeft"){ e.preventDefault(); moveHorizontal(-1); }
    else if(e.key === "ArrowRight"){ e.preventDefault(); moveHorizontal(1); }
    else if(e.key === "ArrowDown"){ e.preventDefault(); moveDown(); }
    else if(e.key === "ArrowUp"){ e.preventDefault(); rotatePiece(); }
    else if(e.key === " "){ e.preventDefault(); hardDrop(); }
});
let touchStartX = 0; let touchStartY = 0;
boardCanvas.addEventListener("touchstart", function(e){ const touch = e.touches[0]; touchStartX = touch.clientX; touchStartY = touch.clientY; }, { passive: true });
boardCanvas.addEventListener("touchend", function(e){
    if(!running) return;
    const touch = e.changedTouches[0]; const dx = touch.clientX - touchStartX; const dy = touch.clientY - touchStartY;
    const absX = Math.abs(dx); const absY = Math.abs(dy);
    if(absX < 20 && absY < 20){ rotatePiece(); return; }
    if(absX > absY){
        if(dx > 25){ moveHorizontal(1); } else if(dx < -25){ moveHorizontal(-1); }
        return;
    }
    if(dy > 25){ moveDown(); }
}, { passive: true });
grid = emptyGrid(); next = randomPiece(); draw(); drawNext();
})();
</script>
`;
}

async function sendGamePlayer(sock, m, html) {
    if (typeof html !== "string" || !html.trim()) throw new Error("HTML game kosong");

    // Menggunakan cara pengiriman dokumen HTML standar seperti game Mario/Dino
    await sock.sendMessage(m.chat, {
        document: Buffer.from(html, 'utf-8'),
        fileName: 'Tetris_Capy.html',
        mimetype: 'text/html',
        caption: `🎮 *TETRIS GAME*\n\nSilakan download dan buka file HTML di atas untuk bermain Tetris!`
    }, { quoted: m });
}
async function handler(m, { sock }) {
  try {
    const playerName = m.pushName || m.name || "Sensei";
    const html = createTetrisGame({ playerName });
    await sendGamePlayer(sock, m, html);
  } catch (error) {
    console.error("[TETRIS ERROR]", error);
    try { await m.reply("〄 *TETRIS GAGAL*\n\n" + `〄 ${error?.message || "Unknown error"}`); } catch {}
  }
}

module.exports = {
  config,
  handler
};