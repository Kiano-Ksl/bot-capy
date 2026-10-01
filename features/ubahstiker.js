// File: features/ubahstiker.js
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const sharp = require('sharp');
const axios = require('axios');
const FormData = require('form-data');

// ==========================================
// MESIN EZGIF (LOGIKA TANGGUH DARI togif.js)
// ==========================================
async function webp2mp4(buffer) {
    try {
        const form = new FormData();
        form.append('new-image-url', '');
        form.append('new-image', buffer, { filename: 'sticker.webp', contentType: 'image/webp' });
        form.append('upload', 'Upload!');

        // 1. Upload ke domain utama, biarkan EZGif yang mengarahkan servernya
        const res = await axios.post('https://ezgif.com/webp-to-mp4', form, {
            headers: {
                ...form.getHeaders(),
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        const html = res.data;

        // 2. Parser ID File menggunakan Regex langsung dari togif.js milikmu
        let match = html.match(/href=["'](\/webp-to-mp4\/[^"']+?\.webp\.html)["']/i) ||
                    html.match(/action=["'](?:https:\/\/ezgif\.com)?(\/webp-to-mp4\/[^"']+?\.webp)["']/i) ||
                    html.match(/\/webp-to-mp4\/([^"'<>]+?\.webp)\.html/i) ||
                    html.match(/name=["']file["'][^>]*value=["']([^"']+?\.webp)["']/i);

        if (!match) throw new Error('Struktur web EZGif berubah, gagal ekstrak ID file.');

        let file = match[1];
        if (file.startsWith('/webp-to-mp4/')) {
            file = file.replace('/webp-to-mp4/', '').replace(/\.html$/i, '');
        }

        // 3. Eksekusi Konversi ke MP4
        const form2 = new FormData();
        form2.append('file', file);
        form2.append('background', '#ffffff');
        form2.append('backgroundc', '#ffffff');
        form2.append('repeat', '1');
        form2.append('ajax', 'true');

        const res2 = await axios.post(`https://ezgif.com/webp-to-mp4/${file}?ajax=true`, form2, {
            headers: {
                ...form2.getHeaders(),
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        const html2 = res2.data;
        
        // 4. Ambil link MP4
        const mp4Match = html2.match(/<source[^>]+src=["']([^"']+?\.mp4)["']/i) ||
                         html2.match(/href=["'](\/save\/[^"']+?\.mp4)["']/i) ||
                         html2.match(/(\/\/s\d+\.ezgif\.com\/tmp\/[^"'<>]+?\.mp4)/i);

        if (!mp4Match) throw new Error('Gagal mendapatkan link MP4 dari hasil convert.');

        let mp4Url = mp4Match[1];
        if (mp4Url.startsWith('/save/')) {
            mp4Url = mp4Url.replace('/save/', '//s6.ezgif.com/tmp/');
        }
        if (mp4Url.startsWith('//')) {
            mp4Url = 'https:' + mp4Url;
        }

        // 5. Download hasil MP4
        const resMp4 = await axios.get(mp4Url, { responseType: 'arraybuffer' });
        return Buffer.from(resMp4.data);

    } catch (e) {
        throw new Error(`Gagal mendapatkan ID file dari server EZGif.`);
    }
}

// ==========================================
// JEMBATAN PENGHUBUNG BOT (HANDLER)
// ==========================================
async function handleUbahStiker(sock, msg, from) {
    const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    
    if (!quotedMsg) {
        return sock.sendMessage(from, { text: '⚠️ Silakan reply sebuah stiker dengan perintah *.ubah*' }, { quoted: msg });
    }

    const stickerMsg = quotedMsg.stickerMessage;
    
    if (!stickerMsg) {
        return sock.sendMessage(from, { text: '⚠️ Yang kamu reply bukan stiker!' }, { quoted: msg });
    }

    await sock.sendMessage(from, { text: '⏳ Sedang mengubah stiker...' }, { quoted: msg });

    try {
        const stream = await downloadContentFromMessage(stickerMsg, 'sticker');
        let buffer = Buffer.from([]);
        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk]);
        }

        // Cek bawaan dari Baileys atau cek DNA webp
        const isAnimated = stickerMsg.isAnimated || buffer.includes(Buffer.from('ANIM'));

        if (isAnimated) {
            console.log('🔄 Konversi Stiker Gerak -> MP4...');
            const mp4Buffer = await webp2mp4(buffer);
            await sock.sendMessage(from, { 
                video: mp4Buffer, 
                caption: 'berhasil di ubah' 
            }, { quoted: msg });
        } else {
            console.log('📸 Konversi Stiker Diam -> PNG...');
            const pngBuffer = await sharp(buffer).png().toBuffer();
            await sock.sendMessage(from, { 
                image: pngBuffer, 
                caption: 'berhasil di ubah' 
            }, { quoted: msg });
        }

    } catch (e) {
        console.error('❌ Error Ubah Stiker:', e.message);
        sock.sendMessage(from, { text: `❌ Gagal mengubah stiker: ${e.message}` }, { quoted: msg });
    }
}

module.exports = handleUbahStiker;