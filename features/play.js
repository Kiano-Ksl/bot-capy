// File: features/play.js
const { randomUUID, createDecipheriv } = require('crypto');
const { spawn } = require('child_process');
const sharp = require('sharp'); 

const METADATA_DECRYPTION_KEY = Buffer.from('C5D58EF67A7584E4A29F6C35BBC4EB12', 'hex');
const HEADERS = {
    'Content-Type': 'application/json',
    'Origin': 'https://yt.savetube.me',
    'User-Agent': 'Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 Chrome/130 Mobile Safari/537.36'
};

const FFMPEG_BITRATE = '16k';
const FFMPEG_SAMPLE_RATE = '24000';
const FFMPEG_CHANNELS = '1';
const FFMPEG_CODEC = 'libopus';
const FFMPEG_FORMAT = 'ogg';
const LRCLIB_API = 'https://lrclib.net/api';

function escapeHtml(text = '') {
    return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function formatDuration(sec) {
    if (!Number.isFinite(sec)) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return m + ':' + String(s).padStart(2, '0');
}

/* =========================================================
 * ENGINE YT MUSIC (CORE)
 * ========================================================= */
let ytMusicInstance = null;
async function getYTMusic() {
    if (!ytMusicInstance) {
        const _YTMusicMod = require('ytmusic-api');
        const YTMusic = _YTMusicMod.default || _YTMusicMod;
        ytMusicInstance = new YTMusic();
        await ytMusicInstance.initialize();
    }
    return ytMusicInstance;
}

/* =========================================================
 * MESIN PENCARI LIRIK CERDAS (DURASI TERLAMA)
 * ========================================================= */
async function getLRCLyrics(title, artist) {
    try {
        const params = new URLSearchParams({ q: `${title} ${artist}` });
        const res = await fetch(`${LRCLIB_API}/search?${params.toString()}`, { headers: { Accept: 'application/json' }});
        if (!res.ok) return [];
        const results = await res.json();
        
        if (!Array.isArray(results) || results.length === 0) return [];

        const syncedResults = results.filter(r => r.syncedLyrics);
        let bestMatch = null;

        if (syncedResults.length > 0) {
            syncedResults.sort((a, b) => (b.duration || 0) - (a.duration || 0));
            bestMatch = syncedResults[0]; 
        } else {
            bestMatch = results.find(r => r.plainLyrics);
        }

        if (bestMatch && bestMatch.syncedLyrics) return parseSyncedLyrics(bestMatch.syncedLyrics);
        if (bestMatch && bestMatch.plainLyrics) return plainLyricsToSynced(bestMatch.plainLyrics);
        
        return [];
    } catch { return []; }
}

function parseSyncedLyrics(lrc = '') {
    const result = [];
    const lines = lrc.split(/\r?\n/);
    const regex = /\[(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?\]/g;
    for (const line of lines) {
        const matches = [...line.matchAll(regex)];
        const text = line.replace(regex, '').trim();
        if (!matches.length || !text) continue;
        for (const match of matches) {
            const min = Number(match[1]), sec = Number(match[2]), msText = match[3] || '0';
            const ms = msText.length === 1 ? Number(msText)*100 : msText.length === 2 ? Number(msText)*10 : Number(msText.slice(0,3));
            result.push({ time: min * 60 + sec + ms / 1000, text });
        }
    }
    return result.sort((a, b) => a.time - b.time);
}

function plainLyricsToSynced(lyrics = '') {
    const lines = lyrics.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    return lines.map((text, i) => ({ time: i * 4, text }));
}

/* =========================================================
 * MESIN DOWNLOAD & KOMPRES
 * ========================================================= */
async function savetube(url) {
    const idMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|shorts\/|embed\/))([a-zA-Z0-9_-]{11})/);
    if (!idMatch) throw new Error('URL YouTube tidak valid');
    const videoId = idMatch[1];

    const cdnRes = await fetch('https://media.savetube.vip/api/random-cdn', { headers: HEADERS }).then(v => v.json()).catch(() => null);
    if (!cdnRes?.cdn) throw new Error('CDN Downloader tidak tersedia');
    
    const info = await fetch(`https://${cdnRes.cdn}/v2/info`, { method: 'POST', headers: HEADERS, body: JSON.stringify({ url: `https://www.youtube.com/watch?v=${videoId}` }) }).then(v => v.json()).catch(() => null);
    if (!info?.data) throw new Error('Gagal mengambil data lagu');

    let metadata;
    try {
        const encrypted = Buffer.from(info.data, 'base64');
        const decipher = createDecipheriv('aes-128-cbc', METADATA_DECRYPTION_KEY, encrypted.subarray(0, 16));
        const decrypted = Buffer.concat([decipher.update(encrypted.subarray(16)), decipher.final()]);
        metadata = JSON.parse(decrypted.toString('utf8'));
    } catch { throw new Error('Gagal memproses metadata lagu'); }

    const dl = await fetch(`https://${cdnRes.cdn}/download`, { method: 'POST', headers: HEADERS, body: JSON.stringify({ id: videoId, downloadType: 'audio', quality: '128kbps', key: metadata.key }) }).then(v => v.json()).catch(() => null);
    if (!dl?.data?.downloadUrl) throw new Error('Link download tidak ditemukan');
    return dl.data.downloadUrl;
}

async function compressAudio(inputBuffer) {
    return new Promise((resolve, reject) => {
        let ffmpeg;
        try {
            ffmpeg = spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-i', 'pipe:0', '-vn', '-c:a', FFMPEG_CODEC, '-b:a', FFMPEG_BITRATE, '-ar', FFMPEG_SAMPLE_RATE, '-ac', FFMPEG_CHANNELS, '-application', 'audio', '-f', FFMPEG_FORMAT, 'pipe:1'], { stdio: ['pipe', 'pipe', 'pipe'] });
        } catch (error) { return reject(error); }
        const chunks = [];
        ffmpeg.stdout.on('data', chunk => chunks.push(chunk));
        ffmpeg.on('close', code => {
            if (code !== 0) return reject(new Error('FFmpeg gagal memproses lagu'));
            resolve(Buffer.concat(chunks));
        });
        ffmpeg.stdin.on('error', () => {});
        ffmpeg.stdin.end(inputBuffer);
    });
}

async function getThumbBase64(url) {
    try {
        const res = await fetch(url);
        const raw = Buffer.from(await res.arrayBuffer());
        const resized = await sharp(raw).resize(250, 250, { fit: 'cover' }).jpeg({ quality: 70 }).toBuffer();
        return `data:image/jpeg;base64,${resized.toString('base64')}`;
    } catch { return ''; }
}

/* =========================================================
 * TEMPLATE SPOTIFY GREEN (FIX TOMBOL LOVE SOLID PUTIH)
 * ========================================================= */
function buildSpotifyGreenHTML(title, artist, duration, audioBase64, coverBase64, lyricsData) {
    const safeTitle = escapeHtml(title);
    const safeArtist = escapeHtml(artist);
    const safeImage = coverBase64 || 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
    const lyricsBase64 = Buffer.from(JSON.stringify(lyricsData)).toString('base64');

    return `<style>
    :root { --ink: #ffffff; --muted: #9ca3af; --sys: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    * { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; user-select: none; }
    
    .player-wrapper { width: 100%; display: flex; justify-content: center; padding: 12px 6px; background: transparent; }
    
    .player { 
        position: relative; 
        width: 100%; 
        max-width: 350px; 
        border-radius: 28px; 
        overflow: hidden; 
        background: radial-gradient(circle at 50% 10%, #153b27 0%, #0a1f14 55%, #050d08 100%); 
        border: 1px solid rgba(25, 209, 103, 0.2);
        color: var(--ink); 
        font-family: var(--sys); 
        box-shadow: 0 20px 40px rgba(0,0,0,0.8), inset 0 1px 1px rgba(25,209,103,0.3); 
        display: flex; 
        flex-direction: column; 
    }
    
    .ui { padding: 26px; display: flex; flex-direction: column; flex: 1; }
    
    .header { display: flex; justify-content: space-between; align-items: center; font-size: 10px; font-weight: 800; letter-spacing: 2px; color: #1ed760; text-transform: uppercase; margin-bottom: 22px; }
    .icon { width: 20px; height: 20px; fill: currentColor; }
    
    .cover-container { display: flex; justify-content: center; align-items: center; margin-bottom: 22px; }
    .vinyl { width: 170px; height: 170px; border-radius: 50%; border: 3px solid #143623; background: url('${safeImage}') center/cover no-repeat #080808; box-shadow: 0 15px 30px rgba(0,0,0,0.8), inset 0 0 15px rgba(25,209,103,0.15); position: relative; }
    .vinyl::before { content: ''; position: absolute; inset: 0; border-radius: 50%; background: repeating-radial-gradient(circle at center, transparent 0px, transparent 4px, rgba(25,209,103,0.04) 5px, transparent 6px); }
    .vinyl::after { content: ''; position: absolute; left: 50%; top: 50%; width: 28px; height: 28px; transform: translate(-50%, -50%); border-radius: 50%; background: radial-gradient(circle, #e5e7eb 0 10%, #1ed760 20% 35%, #111 40% 100%); border: 1px solid #143623; box-shadow: 0 0 12px rgba(0,0,0,0.8); }
    .vinyl.playing { animation: spin 4s linear infinite; }
    @keyframes spin { 100% { transform: rotate(360deg); } }
    
    .info-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
    .info-text { display: flex; flex-direction: column; overflow: hidden; padding-right: 12px; }
    .title { font-size: 20px; font-weight: 800; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.3; text-shadow: 0 2px 4px rgba(0,0,0,0.5); }
    .artist { font-size: 14px; color: var(--muted); font-weight: 500; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    
    /* FIX: TOMBOL LOVE DIKLIK JADI SOLID PUTIH */
    .heart { background: none; border: none; color: var(--muted); cursor: pointer; display: flex; align-items: center; justify-content: center; padding: 0; transition: transform 0.2s, color 0.2s; }
    .heart svg { transition: fill 0.2s ease, stroke 0.2s ease; }
    .heart.active { color: #ffffff; transform: scale(1.1); }
    .heart.active svg { fill: #ffffff; stroke: #ffffff; }
    
    .lyricsBox { 
        position: relative; 
        height: 105px; 
        width: 100%;
        overflow: hidden; 
        mask-image: linear-gradient(to bottom, transparent 0%, black 20%, black 80%, transparent 100%); 
        -webkit-mask-image: linear-gradient(to bottom, transparent 0%, black 20%, black 80%, transparent 100%); 
        margin-bottom: 14px; 
    }
    .lyricsContent { 
        position: relative;
        padding: 40px 0; 
        transition: transform 0.3s ease-out; 
        display: flex; 
        flex-direction: column; 
        gap: 8px; 
        width: 100%;
    }
    .lyric-line { 
        font-size: 13.5px; 
        font-weight: 500; 
        color: rgba(255,255,255,0.3); 
        white-space: normal; 
        word-wrap: break-word; 
        overflow-wrap: break-word; 
        line-height: 1.4; 
        transition: all 0.3s ease; 
        transform-origin: left center; 
        text-align: left; 
        width: 100%;
    }
    .lyric-line.active { 
        font-size: 15.5px; 
        font-weight: 700; 
        color: #ffffff; 
        text-shadow: 0 0 10px rgba(255,255,255,0.3); 
        transform: scale(1.02); 
    }
    
    .progress-area { margin-bottom: 14px; width: 100%; }
    .progress-bar-bg { width: 100%; height: 6px; background: rgba(255,255,255,0.15); border-radius: 4px; position: relative; cursor: pointer; }
    .progress-fill { height: 100%; width: 0%; background: #1ed760; border-radius: 4px; pointer-events: none; position: relative; }
    .progress-dot { position: absolute; right: -6px; top: 50%; transform: translateY(-50%); width: 12px; height: 12px; background: #fff; border-radius: 50%; box-shadow: 0 0 5px rgba(0,0,0,0.5); pointer-events: none; }
    .time-row { display: flex; justify-content: space-between; font-size: 11px; color: var(--muted); margin-top: 8px; font-variant-numeric: tabular-nums; font-weight: 600; }
    
    .volume-box { display: flex; align-items: center; gap: 10px; margin-bottom: 18px; padding: 0 4px; }
    .vol-label { font-size: 9px; color: var(--muted); font-weight: 800; letter-spacing: 1px; }
    .vol-slider { width: 100%; height: 6px; accent-color: #1ed760; background: rgba(255,255,255,0.2); border-radius: 4px; cursor: pointer; transition: all 0.3s ease; }
    .vol-slider.muted { accent-color: #374151; background: rgba(255,255,255,0.05); }

    .controls { display: flex; justify-content: space-between; align-items: center; padding: 0 5px; }
    .btn { background: none; border: none; color: var(--ink); cursor: pointer; display: flex; align-items: center; justify-content: center; opacity: 0.75; transition: all 0.2s; padding: 0; }
    .btn:active { transform: scale(0.85); opacity: 1; }
    .btn-play { width: 56px; height: 56px; border-radius: 50%; background: #1ed760; color: #000; opacity: 1; box-shadow: 0 8px 20px rgba(30,215,96,0.4); }
    .btn-play:active { transform: scale(0.95); }
    </style>
    </head>
    <body>
    <div class="player-wrapper">
        <div class="player">
            <div class="ui">
                <div class="header">
                    <svg class="icon" viewBox="0 0 24 24"><path d="M18 9l-6 6-6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/></svg>
                    <span>CAPY PLAYER</span>
                    <svg class="icon" viewBox="0 0 24 24"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>
                </div>
                
                <div class="cover-container">
                    <div class="vinyl" id="musicVinyl"></div>
                </div>
                
                <div class="info-row">
                    <div class="info-text">
                        <div class="title">${safeTitle}</div>
                        <div class="artist">${safeArtist}</div>
                    </div>
                    <button class="heart" id="heartBtn">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                    </button>
                </div>
                
                <div class="lyricsBox">
                    <div class="lyricsContent" id="lyricsContent">
                        <div class="lyric-line">Memuat lirik...</div>
                    </div>
                </div>
                
                <div class="progress-area">
                    <div class="progress-bar-bg" id="progressBarBg">
                        <div class="progress-fill" id="progressFill"><div class="progress-dot"></div></div>
                    </div>
                    <div class="time-row">
                        <span id="musicCurrent">0:00</span>
                        <span id="musicDuration">${duration}</span>
                    </div>
                </div>

                <div class="volume-box">
                    <span class="vol-label">VOL</span>
                    <input class="vol-slider" id="musicVolume" type="range" min="0" max="1" step="0.01" value="0.8">
                </div>
                
                <div class="controls">
                    <button class="btn" id="btn-mute">
                        <svg id="icon-vol-up" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>
                        <svg id="icon-vol-mute" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:none"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>
                    </button>

                    <button class="btn" id="btn-rw"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><text x="12" y="16.5" font-size="7" font-family="sans-serif" font-weight="bold" stroke="none" fill="currentColor" text-anchor="middle">10</text></svg></button>
                    
                    <button class="btn btn-play" id="musicPlay">
                        <svg id="icon-play" width="26" height="26" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                        <svg id="icon-pause" width="26" height="26" viewBox="0 0 24 24" fill="currentColor" style="display:none"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                    </button>
                    
                    <button class="btn" id="btn-fw"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><text x="12" y="16.5" font-size="7" font-family="sans-serif" font-weight="bold" stroke="none" fill="currentColor" text-anchor="middle">10</text></svg></button>
                    <button class="btn"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg></button>
                </div>
            </div>
        </div>
    </div>
    
    <audio id="localMusic" preload="auto" src="data:audio/ogg;base64,${audioBase64}"></audio>
    
    <script>
    (function(){
    const audio = document.getElementById('localMusic');
    const play = document.getElementById('musicPlay');
    const barBg = document.getElementById('progressBarBg');
    const fill = document.getElementById('progressFill');
    const current = document.getElementById('musicCurrent');
    const vinyl = document.getElementById('musicVinyl');
    const lBox = document.getElementById('lyricsContent');
    const iconPlay = document.getElementById('icon-play');
    const iconPause = document.getElementById('icon-pause');
    const heartBtn = document.getElementById('heartBtn');
    
    const volumeSlider = document.getElementById('musicVolume');
    const btnMute = document.getElementById('btn-mute');
    const iconVolUp = document.getElementById('icon-vol-up');
    const iconVolMute = document.getElementById('icon-vol-mute');
    
    let savedVol = 0.8;
    let isMuted = false;
    audio.volume = savedVol;
    
    let lyrics = [];
    try {
        lyrics = JSON.parse(atob('${lyricsBase64}'));
        if(lyrics.length > 0) {
            lBox.innerHTML = lyrics.map((l, i) => '<div class="lyric-line" id="l-'+i+'">'+l.text+'</div>').join('');
        } else {
            lBox.innerHTML = '<div class="lyric-line">🎶 Lirik tidak ditemukan 🎶</div>';
        }
    } catch(e) { lBox.innerHTML = '<div class="lyric-line">🎶 Musik Dimainkan 🎶</div>'; }

    function syncLyrics() {
        if(!lyrics.length) return;
        const t = audio.currentTime;
        let activeIdx = -1;
        for(let i=0; i<lyrics.length; i++){
            if(t >= lyrics[i].time - 0.5) activeIdx = i; 
            else break;
        }
        if(activeIdx !== -1) {
            document.querySelectorAll('.lyric-line').forEach(el => el.classList.remove('active'));
            const activeEl = document.getElementById('l-'+activeIdx);
            if(activeEl) {
                activeEl.classList.add('active');
                /* RUMUS TITIK TENGAH (Tinggi Kotak 105px / 2 = 52.5) */
                const offset = activeEl.offsetTop - 52.5 + (activeEl.offsetHeight / 2); 
                lBox.style.transform = 'translateY(-'+offset+'px)';
            }
        }
    }

    function formatTime(sec){
        if(!Number.isFinite(sec)){ return '0:00'; }
        const m = Math.floor(sec / 60);
        const s = Math.floor(sec % 60);
        return m + ':' + String(s).padStart(2,'0');
    }
    
    function updateProgress(){
        if(!Number.isFinite(audio.duration) || audio.duration <= 0){ return; }
        const percent = (audio.currentTime / audio.duration) * 100;
        fill.style.width = percent + '%';
        current.textContent = formatTime(audio.currentTime);
        syncLyrics();
    }
    
    function setPlaying(){
        iconPlay.style.display = 'none';
        iconPause.style.display = 'block';
        vinyl.classList.add('playing');
    }
    
    function setPaused(){
        iconPlay.style.display = 'block';
        iconPause.style.display = 'none';
        vinyl.classList.remove('playing');
    }
    
    play.addEventListener('click', async function(){
        try{
            if(audio.paused){
                await audio.play();
                setPlaying();
            } else {
                audio.pause();
                setPaused();
            }
        } catch(error){
            vinyl.classList.remove('playing');
        }
    });

    function updateMuteState(muted, volValue) {
        isMuted = muted;
        if (muted) {
            iconVolUp.style.display = 'none';
            iconVolMute.style.display = 'block';
            volumeSlider.classList.add('muted');
        } else {
            iconVolUp.style.display = 'block';
            iconVolMute.style.display = 'none';
            volumeSlider.classList.remove('muted');
        }
        volumeSlider.value = volValue;
        audio.volume = volValue;
    }

    btnMute.addEventListener('click', () => {
        if (isMuted) {
            updateMuteState(false, savedVol > 0 ? savedVol : 0.8);
        } else {
            savedVol = audio.volume;
            updateMuteState(true, 0);
        }
    });

    volumeSlider.addEventListener('input', function(){
        const val = Number(volumeSlider.value);
        if (val > 0) {
            savedVol = val;
            if (isMuted) updateMuteState(false, val); 
            else audio.volume = val;
        } else {
            updateMuteState(true, 0);
        }
    });
    
    heartBtn.addEventListener('click', () => { heartBtn.classList.toggle('active'); });

    document.getElementById('btn-rw').addEventListener('click', () => {
        if(audio.duration) audio.currentTime = Math.max(0, audio.currentTime - 10);
        updateProgress();
    });
    document.getElementById('btn-fw').addEventListener('click', () => {
        if(audio.duration) audio.currentTime = Math.min(audio.duration, audio.currentTime + 10);
        updateProgress();
    });
    
    barBg.addEventListener('pointerdown', function(e){
        if(!Number.isFinite(audio.duration) || audio.duration <= 0){ return; }
        const rect = barBg.getBoundingClientRect();
        const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
        audio.currentTime = (x / rect.width) * audio.duration;
        updateProgress();
    });
    
    audio.addEventListener('timeupdate', function(){ updateProgress(); });
    audio.addEventListener('play', function(){ setPlaying(); });
    audio.addEventListener('pause', function(){ if(!audio.ended){ setPaused(); } });
    audio.addEventListener('ended', function(){
        setPaused();
        fill.style.width = '0%';
        current.textContent = '0:00';
        lBox.style.transform = 'translateY(0px)';
        document.querySelectorAll('.lyric-line').forEach(el => el.classList.remove('active'));
    });
    })();
    </script>
    </body>
    </html>`;
}

/* =========================================================
 * FUNGSI EKSEKUSI UTAMA
 * ========================================================= */
async function handlePlayOnline(sock, msg, from, args) {
    const query = args.join(' ').trim();
    
    if (!query) {
        console.log('\x1b[31m[PLAY]\x1b[0m Perintah ditolak: Pengguna tidak memasukkan judul lagu.');
        return sock.sendMessage(from, { text: '❌ Masukkan judul lagu!\n*Contoh:* .play Nadin Amizah' }, { quoted: msg });
    }

    if (/https?:\/\//i.test(query)) {
        console.log('\x1b[31m[PLAY]\x1b[0m Perintah ditolak: Pengguna memasukkan link url.');
        return sock.sendMessage(from, { text: '❌ Maaf, pencarian via link telah dinonaktifkan.\nSilakan masukkan *Judul Lagu* saja.\n*Contoh:* .play Nadin Amizah' }, { quoted: msg });
    }

    console.log(`\x1b[36m[PLAY]\x1b[0m Menerima permintaan pencarian: "\x1b[1m${query}\x1b[0m"`);
    await sock.sendMessage(from, { text: '⏳ *Mencari lagu di YT Music...*\n_(Tunggu sebentar, proses kompresi FFmpeg sedang berjalan)_' }, { quoted: msg });

    try {
        console.log(`\x1b[33m[PLAY]\x1b[0m Sedang mencari di database YT Music...`);
        const ytm = await getYTMusic();
        const songs = await ytm.search(query);
        
        let track = songs.find(s => s.type === 'SONG');
        if (!track) track = songs.find(s => s.type === 'VIDEO');
        if (!track) track = songs[0];
        
        if (!track || !track.videoId) throw new Error('Lagu tidak ditemukan di YT Music.');

        const title = track.name || track.title || 'Unknown Title';
        
        let artistStr = 'Unknown Artist';
        if (track.artists && Array.isArray(track.artists) && track.artists.length > 0) {
            artistStr = track.artists.map(a => a.name).join(', ');
        } else if (track.artist && track.artist.name) {
            artistStr = track.artist.name;
        } else if (track.author && track.author.name) {
            artistStr = track.author.name;
        }
        const artist = artistStr;
        
        console.log(`\x1b[32m[PLAY]\x1b[0m Lagu ditemukan: "${title}" oleh ${artist}`);
        const durationSec = track.duration || 0;
        const duration = formatDuration(durationSec);
        const thumbUrl = track.thumbnails?.[track.thumbnails.length - 1]?.url || '';
        const ytUrl = `https://www.youtube.com/watch?v=${track.videoId}`;

        console.log(`\x1b[33m[PLAY]\x1b[0m Mengambil lirik dari LRCLIB (mencari durasi terlama)...`);
        let lyricsData = await getLRCLyrics(title, artist);
        
        if (!lyricsData || lyricsData.length === 0) {
            console.log(`\x1b[33m[PLAY]\x1b[0m LRCLIB kosong, mengambil lirik bawaan YT Music...`);
            try {
                const ytLyrics = await ytm.getLyrics(track.videoId);
                let fallback = '';
                if (typeof ytLyrics === 'string') fallback = ytLyrics;
                else if (Array.isArray(ytLyrics)) fallback = ytLyrics.map(i => typeof i === 'string' ? i : (i?.text || i?.lyrics || i?.content || '')).join('\n');
                else fallback = ytLyrics?.lyrics || ytLyrics?.text || ytLyrics?.content || '';
                
                if (fallback) {
                    lyricsData = parseSyncedLyrics(fallback);
                    if (!lyricsData.length) lyricsData = plainLyricsToSynced(fallback);
                }
            } catch (e) {}
        }
        console.log(`\x1b[32m[PLAY]\x1b[0m Lirik berhasil dimuat (${lyricsData.length} baris).`);

        console.log(`\x1b[33m[PLAY]\x1b[0m Mengunduh audio dari server penengah...`);
        const downloadUrl = await savetube(ytUrl);
        const resAudio = await fetch(downloadUrl, { headers: { 'User-Agent': HEADERS['User-Agent'] } });
        if (!resAudio.ok) throw new Error('Gagal mengunduh audio.');
        const originalBuffer = Buffer.from(await resAudio.arrayBuffer());

        console.log(`\x1b[33m[PLAY]\x1b[0m Mengompres audio menggunakan FFmpeg (Ogg/Opus)...`);
        const compressedBuffer = await compressAudio(originalBuffer);
        const audioBase64 = compressedBuffer.toString('base64');
        console.log(`\x1b[32m[PLAY]\x1b[0m Kompresi selesai! Ukuran data: ${(audioBase64.length / 1024).toFixed(2)} KB`);

        console.log(`\x1b[33m[PLAY]\x1b[0m Memproses gambar sampul album...`);
        const coverBase64 = await getThumbBase64(thumbUrl);

        console.log(`\x1b[33m[PLAY]\x1b[0m Merakit antarmuka pemutar musik...`);
        const htmlPayload = buildSpotifyGreenHTML(title, artist, duration, audioBase64, coverBase64, lyricsData);

        const responseId = randomUUID();
        const data = Buffer.from(JSON.stringify({
            __typename: 'GenAIUnifiedResponse',
            response_id: responseId,
            sections: [{
                __typename: 'GenAIUnifiedResponseSection',
                view_model: {
                    __typename: 'GenAISingleLayoutViewModel',
                    primitive: {
                        __typename: 'GenAIaeacdsnwHtmlPrimitive',
                        payload: htmlPayload,
                        trusted_sources: []
                    }
                }
            }]
        })).toString('base64');

        console.log(`\x1b[32m[PLAY]\x1b[0m Mengirim pemutar musik interaktif ke WhatsApp...`);
        await sock.relayMessage(from, {
            messageContextInfo: {
                deviceListMetadata: {},
                deviceListMetadataVersion: 2,
                botMetadata: { messageDisclaimerText: "", botResponseId: responseId }
            },
            botForwardedMessage: {
                message: {
                    richResponseMessage: {
                        messageType: 1,
                        submessages: [{ messageType: 2, messageText: '🎵 ' + title }],
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
        }, { messageId: responseId });

        console.log(`\x1b[32m[ 🚀 SUCCESS ]\x1b[0m Lagu "${title}" berhasil dikirim!\n`);

    } catch (e) {
        console.error('\x1b[31m[PLAY ERROR]\x1b[0m', e);
        await sock.sendMessage(from, { text: '❌ *Gagal memutar lagu:*\n' + (e?.message || e) }, { quoted: msg });
    }
}

module.exports = handlePlayOnline;