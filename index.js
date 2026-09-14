// File: index.js
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const qrcode = require('qrcode-terminal');

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

🤖 *AI & GENERATOR*
 ◦ *.ai* <tanya> (Chat Cerdas)
 ◦ *.flux* <prompt> (Bikin Gambar)

🎮 *GAMES*
 ◦ *.ttt* (Main Tic-Tac-Toe)

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

        // FITUR AI
        if (command === '.ai' || command === '!ai') {
            await handleAi(sock, msg, from, sender, fullTextToSearch, command);
        }

        // FITUR FLUX
        if (['.flux', '!flux', '.fluximg', '!fluximg'].includes(command)) {
            await handleFlux(sock, msg, from, sender, fullTextToSearch, command);
        }

    });
}

connectToWhatsApp();