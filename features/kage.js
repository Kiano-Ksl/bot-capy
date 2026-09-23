// File: features/kage.js
const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');

// Memuat Engine & ROM ke memori saat bot menyala agar instant saat dipanggil
const jsnesCode = fs.readFileSync(path.join(__dirname, 'jsnes.min.js'), 'utf-8');
const romBase64 = fs.readFileSync(path.join(__dirname, 'kage_rom.txt'), 'utf-8').trim();

const htmlPayload = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<style>
        /* VAKSIN ANTI-SELECT & UI SUPER COMPACT WHATSAPP */
        * { margin: 0; padding: 0; box-sizing: border-box; -webkit-tap-highlight-color: transparent; user-select: none !important; touch-action: none !important; outline: none !important; }
        body { background: #150d0d; font-family: -apple-system, sans-serif; overflow: hidden; display: flex; justify-content: center; align-items: flex-start; overscroll-behavior: none; }
        #nes-case { width: 100%; max-width: 360px; background: rgba(255, 255, 255, 0.05); border: 2px solid rgba(239, 68, 68, 0.4); border-radius: 18px; overflow: hidden; display: flex; flex-direction: column; }
        #screen-wrap { width: 100%; height: 260px; background: #000; display: flex; justify-content: center; align-items: center; }
        canvas#nes { width: 100%; height: 100%; object-fit: fill; image-rendering: pixelated; }
        
        #pad { width: 100%; padding: 12px 6px; background: rgba(0, 0, 0, 0.35); display: flex; flex-direction: column; gap: 15px; border-top: 1px solid rgba(239, 68, 68, 0.25); }
        #top-ctrl { display: flex; justify-content: center; gap: 15px; align-items: center; }
        #top-ctrl button { width: 65px; height: 30px; background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(239, 68, 68, 0.35); border-radius: 10px; color: #fff; font-size: 10px; font-weight: 900; }
        
        /* FIX UI: D-Pad dikecilkan, digeser ke kiri, jarak ditata ulang */
        #main-row { display: flex; justify-content: space-between; align-items: center; width: 100%; padding: 0 2px; }
        
        #dpad { display: grid; grid-template-columns: repeat(3, 36px); grid-template-rows: repeat(3, 36px); gap: 2px; background: rgba(0, 0, 0, 0.5); padding: 4px; border-radius: 50%; margin-left: 2px; }
        #dpad button { background: rgba(255, 255, 255, 0.07); color: #fff; border: 1px solid rgba(239, 68, 68, 0.25); border-radius: 8px; font-size: 16px; display: flex; align-items: center; justify-content: center; }
        
        #act { display: flex; gap: 8px; background: rgba(0, 0, 0, 0.5); padding: 8px 12px; border-radius: 35px; border: 1px solid rgba(239, 68, 68, 0.2); margin-right: 2px; }
        #act button { width: 42px; height: 42px; border-radius: 50%; border: none; color: #fff; font-size: 16px; font-weight: bold; background: #ef4444; box-shadow: 0 4px #7f1d1d; }
        
        button:active, button.touching { transform: scale(0.92) translateY(2px); background: #dc2626 !important; box-shadow: 0 1px #7f1d1d !important; }
    </style>
</head>
<body>
    <div id="nes-case">
        <div id="screen-wrap"><canvas id="nes" width="256" height="240"></canvas></div>
        <div id="pad">
            <div id="top-ctrl">
                <button id="sel">SELECT</button><button id="st">START</button>
            </div>
            <div id="main-row">
                <div id="dpad">
                    <button id="u" style="grid-column: 2">▲</button>
                    <button id="l" style="grid-column: 1; grid-row: 2">◀</button>
                    <div style="grid-column: 2; grid-row: 2;"></div>
                    <button id="r" style="grid-column: 3; grid-row: 2">▶</button>
                    <button id="d" style="grid-column: 2; grid-row: 3">▼</button>
                </div>
                <div id="act">
                    <button id="btn-b">B</button><button id="btn-a">A</button>
                </div>
            </div>
        </div>
    </div>

    <!-- ENGINE JSNES -->
    <script>${jsnesCode}</script>

    <!-- LOGIKA GAME & VAKSIN -->
    <script>
        window.oncontextmenu = function(e) { e.preventDefault(); return false; };
        document.body.onselectstart = function(e) { e.preventDefault(); return false; };

        const cv = document.getElementById("nes"),
              cx = cv.getContext("2d", { alpha: false }),
              img = cx.createImageData(256, 240),
              buf = new ArrayBuffer(img.data.length),
              buf8 = new Uint8ClampedArray(buf),
              buf32 = new Uint32Array(buf);

        let audioCtx = null, scriptNode = null;
        const SAMPLE_RATE = 44100, BUFFER_SIZE = 2048, RING_SIZE = 65536;
        const ringL = new Float32Array(RING_SIZE), ringR = new Float32Array(RING_SIZE);
        let writePtr = 0, readPtr = 0;

        function initAudio() {
            if (!audioCtx) {
                try {
                    const AC = window.AudioContext || window.webkitAudioContext;
                    if (AC) {
                        audioCtx = new AC({ sampleRate: SAMPLE_RATE });
                        scriptNode = audioCtx.createScriptProcessor(BUFFER_SIZE, 0, 2);
                        scriptNode.onaudioprocess = (e) => {
                            const outL = e.outputBuffer.getChannelData(0);
                            const outR = e.outputBuffer.getChannelData(1);
                            const count = (writePtr - readPtr + RING_SIZE) % RING_SIZE;
                            if (count < BUFFER_SIZE) {
                                outL.fill(0); outR.fill(0); return;
                            }
                            for (let i = 0; i < outL.length; i++) {
                                outL[i] = ringL[readPtr];
                                outR[i] = ringR[readPtr];
                                readPtr = (readPtr + 1) % RING_SIZE;
                            }
                        };
                        scriptNode.connect(audioCtx.destination);
                    }
                } catch (e) {}
            }
            if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
        }

        const nes = new jsnes.NES({
            onFrame: (fb) => {
                for (let i = 0; i < 256 * 240; i++) buf32[i] = 0xff000000 | fb[i];
                img.data.set(buf8);
                cx.putImageData(img, 0, 0);
            },
            onAudioSample: (l, r) => {
                ringL[writePtr] = l; ringR[writePtr] = r;
                writePtr = (writePtr + 1) % RING_SIZE;
            },
            sampleRate: SAMPLE_RATE
        });

        // Load ROM
        const bin = atob("${romBase64}");
        nes.loadROM(bin);

        let lastTime = 0;
        const FRAME_DURATION = 1000 / 60;
        function loop(now) {
            if (!lastTime) lastTime = now;
            const elapsed = now - lastTime;
            if (elapsed >= FRAME_DURATION) {
                nes.frame();
                lastTime = now - (elapsed % FRAME_DURATION);
            }
            requestAnimationFrame(loop);
        }
        requestAnimationFrame(loop);

        // VAKSIN KONTROL ANTI-WHATSAPP
        const K = {
            u: jsnes.Controller.BUTTON_UP, d: jsnes.Controller.BUTTON_DOWN,
            l: jsnes.Controller.BUTTON_LEFT, r: jsnes.Controller.BUTTON_RIGHT,
            "btn-a": jsnes.Controller.BUTTON_A, "btn-b": jsnes.Controller.BUTTON_B,
            st: jsnes.Controller.BUTTON_START, sel: jsnes.Controller.BUTTON_SELECT,
        };

        Object.keys(K).forEach((id) => {
            const el = document.getElementById(id);
            if (!el) return;
            const press = (e) => { e.preventDefault(); e.stopPropagation(); initAudio(); el.classList.add("touching"); nes.buttonDown(1, K[id]); };
            const release = (e) => { e.preventDefault(); e.stopPropagation(); el.classList.remove("touching"); nes.buttonUp(1, K[id]); };
            el.addEventListener("pointerdown", press, { passive: false });
            el.addEventListener("pointerup", release, { passive: false });
            el.addEventListener("pointercancel", release, { passive: false });
            el.addEventListener("pointerleave", release, { passive: false });
            el.addEventListener("touchstart", press, { passive: false });
            el.addEventListener("touchend", release, { passive: false });
            el.addEventListener("touchcancel", release, { passive: false });
        });
        document.addEventListener("pointerdown", initAudio, { once: true });
        document.addEventListener("touchstart", initAudio, { once: true });
    </script>
</body>
</html>`;

// FUNGSI PENGIRIMAN COMMONJS
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

async function handleKage(sock, msg, from, args) {
    try {
        console.log(`[KAGE] Game dijalankan di chat: ${from}`);
        if (msg.key) {
            await sock.sendMessage(from, { react: { text: '🥷', key: msg.key } }).catch(() => {});
        }
        await kirimForwardSigned(sock, from, htmlPayload, '🥷 SHADOW OF THE NINJA (KAGE)');
    } catch (e) {
        console.error('[KAGE ERROR]', e?.message || e);
        await sock.sendMessage(from, { text: '❌ Gagal memuat game: ' + (e?.message || e) }, { quoted: msg });
    }
}

module.exports = handleKage;