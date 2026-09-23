// File: index.js
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const qrcode = require('qrcode-terminal');

const handleBalap = require('./features/balap.js');
const handleKage = require('./features/kage')
const handleFlappy = require('./features/flappy');
const handleHillClimb = require('./features/hillclimb');
const handleMario = require('./features/mario');
const handleDino = require('./features/dino');
const handlePlayOnline = require('./features/play');
const handleSlot = require('./features/slot');
const handleSonic = require('./features/sonic');
const handleCatur = require('./features/catur');
const handleInstagram = require('./features/instagram');
const handleTiktok = require('./features/tiktok');
const handleSticker = require('./features/sticker');
const handleFacebook = require('./features/facebook');
const handleSpotify = require('./features/spotify');
const { handleTictactoeCommand, handleTictactoeMove } = require('./features/tictactoe');
const handleAi = require('./features/ai'); 
const handleFlux = require('./features/flux');

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_session');

    const sock = makeWASocket({
        auth: state,
        logger: pino({ level: 'silent' })
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
            console.log('\n📱 Silakan scan QR Code di bawah ini:');
            qrcode.generate(qr, { small: true });
        }

        if (connection === 'close') {
            const shouldReconnect = lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('⚠️ Koneksi terputus. Mencoba menghubungkan ulang...', shouldReconnect);
            if (shouldReconnect) connectToWhatsApp();
        } else if (connection === 'open') {
            console.log('✅ Bot Capy berhasil terhubung ke WhatsApp!');
        }
    });

    // update grub
    sock.ev.on('group-participants.update', async (update) => {
        const { id, participants, action } = update;
        
        try {
            // ambil metadata 
            const metadata = await sock.groupMetadata(id);
            const groupName = metadata.subject;

            const botId = sock.user.id.split(':')[0] + '@s.whatsapp.net';

            for (let p of participants) {
                let num = typeof p === "object" && p !== null ? (p.jid || p.id || p.lid) : p;
                if (typeof num !== "string" || !num) continue; 

                if (num === botId) continue; 

                // WELCOME
                if (action === 'add') {
                    const welcomeText = `👋 Halo @${num.split('@')[0]}!\n\nSelamat datang di grup *${groupName}* 🎉\nJangan lupa baca deskripsi grup dan patuhi aturan ya!`;
                    
                    await sock.sendMessage(id, { 
                        text: welcomeText, 
                        mentions: [num] 
                    });
                    console.log(`\n👋 [WELCOME] Menyapa ${num.split('@')[0]} di grup ${groupName}`);
                } 
                
                // GOODBYE
                else if (action === 'remove') {
                    const goodbyeText = `Bye @${num.split('@')[0]} 👋\n\nTelah keluar dari grup *${groupName}*. Semoga sukses di luar sana!`;
                    
                    await sock.sendMessage(id, { 
                        text: goodbyeText, 
                        mentions: [num] 
                    });
                    console.log(`\n👋 [GOODBYE] Mengucapkan selamat tinggal ke ${num.split('@')[0]} di grup ${groupName}`);
                }
            }
        } catch (error) {
            console.error('[Welcome/Goodbye Error]', error);
        }
    });

    // pesan masuk
    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return; 

        const text = msg.message.conversation || msg.message.extendedTextMessage?.text || msg.message.imageMessage?.caption || msg.message.videoMessage?.caption || "";
        const from = msg.key.remoteJid;
        const sender = msg.key.participant || msg.key.remoteJid;

        const quotedMsg = msg.message.extendedTextMessage?.contextInfo?.quotedMessage;
        const quotedText = quotedMsg?.conversation || quotedMsg?.extendedTextMessage?.text || quotedMsg?.imageMessage?.caption || quotedMsg?.videoMessage?.caption || "";

        const args = text.trim().split(/\s+/);
        const command = args[0].toLowerCase();

        const fullTextToSearch = text + " " + quotedText;

        // GAME 
        const isGameMove = await handleTictactoeMove(sock, msg, from, sender, text);
        if (isGameMove) return; 

        // 1. MENU UTAMA
        if (command === '.menu' || command === '!menu') {
            const menuText = `
 ───「 🤖 *BOT CAPY* 」───
Halo! Ada yang bisa Capy bantu?

📥 *DOWNLOADER*
 ◦ *.ig* <link> (Instagram)
 ◦ *.tt* <link> (TikTok)
 ◦ *.fb* <link> (Facebook)
 ◦ *.spotify* <judul/link>

🎵 *Music*
 ◦ *.play* <judul>

🤖 *AI & GENERATOR*
 ◦ *.ai* <tanya> (Chat Cerdas)
 ◦ *.flux* <prompt> (Bikin Gambar)

🎮 *GAMES*
 ◦ *.ttt* (Main Tic-Tac-Toe)
 ◦ *.catur* (Main Catur)
 ◦ *.sonik* (Main Sonic)
 ◦ *.slot* (Main Slot)
 ◦ *.dino* (Main Dino)
 ◦ *.mario* (Main super mario)
 ◦ *.hillclimb* (Main hillclimb)
 ◦ *.kage* (Main kage)
 ◦ *.flappy* (Main Flappy Bird)
 ◦ *.balap* (Main Balapan)


🛠️ *TOOLS*
 ◦ *.s* (Ubah Foto/Video jadi Stiker)
            `;
            await sock.sendMessage(from, { text: menuText.trim() }, { quoted: msg });
            console.log(`\n🗣️ [LOG] Pesan menu berhasil dikirim ke: ${from.split('@')[0]}`);
        }

        // STIKER
        if (command === '.s' || command === '!s') {
            await handleSticker(sock, msg, from);
        }

        // DOWNLOADER INSTAGRAM
        if (command === '.ig' || command === '!ig') {
            await handleInstagram(sock, msg, from, fullTextToSearch);
        }

        // DOWNLOADER TIKTOK
        if (command === '.tt' || command === '!tt') {
            await handleTiktok(sock, msg, from, fullTextToSearch);
        }

        // DOWNLOADER FACEBOOK
        if (command === '.fb' || command === '!fb' || command === '.fbdl') {
            await handleFacebook(sock, msg, from, fullTextToSearch);
        }

        // DOWNLOADERSPOTIFY
        if (['.spotify', '!spotify', '.sp', '!sp', '.spdl', '!spdl'].includes(command)) {
            await handleSpotify(sock, msg, from, fullTextToSearch, command);
        }

        // TIC TAC TOUE
        if (command === '.ttt' || command === '!ttt' || command === '.tictactoe') {
            await handleTictactoeCommand(sock, msg, from, sender);
        }

        // CATUR HTML
        if (command === '.catur' || command === '!catur' || command === '.chess') {
            await handleCatur(sock, msg, from);
        }

        // SONIC DASH HTML
        if (command === '.sonik' || command === '.dash' || command === '.speedy') {
            await handleSonic(sock, msg, from);
        }

        // SLOT MACHINE HTML
        if (command === '.slot' || command === '.slots' || command === '.mesin') {
            await handleSlot(sock, msg, from);
        }

        // PLAY ONLINE MUSIC HTML
        if (command === '.play' || command === '.music' || command === '.lagu') {
            await handlePlayOnline(sock, msg, from, args);
        }

        // DINO RUN HTML
        if (command === '.dino' || command === '.dinorun') {
            await handleDino(sock, msg, from, args);
        }

        // FITUR AI
        if (command === '.ai' || command === '!ai') {
            await handleAi(sock, msg, from, sender, fullTextToSearch, command);
        }

        // SUPER MARIO BROS HTML
        if (command === '.mario' || command === '.supermario') {
            await handleMario(sock, msg, from, args);
        }   

        // FLAPPY BIRD
        if (command === '.flappy' || command === '.bird') {
            await handleFlappy(sock, msg, from, args);
        }

        // HILL CLIMB RACING
        if (command === '.hillclimb' || command === '.hcr') {
            await handleHillClimb(sock, msg, from, args);
        }

        // TURBO RACE HTML
        if (command === '.balap' || command === '.racing') {
            await handleBalap(sock, msg, from);
        }   

         // KAGE
        if (command === '.kage' || command === '.hcr') {
        await handleKage(sock, msg, from, args);
        }

        // FITUR FLUX
        if (['.flux', '!flux', '.fluximg', '!fluximg'].includes(command)) {
            await handleFlux(sock, msg, from, sender, fullTextToSearch, command);
        }

    });
}

connectToWhatsApp();