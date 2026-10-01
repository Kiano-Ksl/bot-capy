// File: features/ubahstiker.js
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const sharp = require('sharp');
const axios = require('axios');
const FormData = require('form-data');

const EZGIF_BASE = 'https://ezgif.com';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

// ==========================================
// MESIN EZGIF (UNTUK STIKER GERAK -> MP4)
// ==========================================
async function webpToMp4Ezgif(buffer) {
    // 1. Upload ke EZGif
    const form = new FormData();
    form.append('new-image', buffer, 'sticker.webp');
    form.append('upload', 'Upload!');

    const resUpload = await axios.post(`${EZGIF_BASE}/webp-to-mp4`, form, {
        headers: { ...form.getHeaders(), 'User-Agent': UA }
    });

    const htmlUpload = resUpload.data;
    const fileMatch = htmlUpload.match(/name="file" value="(.*?)"/);
    if (!fileMatch) throw new Error('Gagal upload ke EZGif.');
    const fileId = fileMatch[1];

    // 2. Convert ke MP4
    const formConvert = new FormData();
    formConvert.append('file', fileId);
    formConvert.append('background', '#ffffff');
    formConvert.append('ajax', 'true');

    const resConvert = await axios.post(`${EZGIF_BASE}/webp-to-mp4/${fileId}?ajax=true`, formConvert, {
        headers: { ...formConvert.getHeaders(), 'User-Agent': UA }
    });

    const htmlConvert = resConvert.data;
    const mp4Match = htmlConvert.match(/<source src="(.*?)"/);
    if (!mp4Match) throw new Error('Gagal mendapatkan link MP4 dari EZGif.');

    let mp4Url = mp4Match[1];
    if (mp4Url.startsWith('//')) mp4Url = 'https:' + mp4Url;

    // 3. Download hasil MP4
    const resMp4 = await axios.get(mp4Url, { responseType: 'arraybuffer' });
    return Buffer.from(resMp4.data);
}

// ==========================================
// JEMBATAN PENGHUBUNG BOT (HANDLER)
// ==========================================
async function handleUbahStiker(sock, msg, from) {
    const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    
    // Cek apakah user mereply sesuatu
    if (!quotedMsg) {
        return sock.sendMessage(from, { text: '⚠️ Silakan reply sebuah stiker dengan perintah *.ubah*' }, { quoted: msg });
    }

    const stickerMsg = quotedMsg.stickerMessage;
    
    // Cek apakah yang direply adalah stiker
    if (!stickerMsg) {
        return sock.sendMessage(from, { text: '⚠️ Yang kamu reply bukan stiker!' }, { quoted: msg });
    }

    await sock.sendMessage(from, { text: '⏳ Sedang mendeteksi dan mengubah stiker...' }, { quoted: msg });

    try {
        // 1. Download Stiker menggunakan fungsi resmi Baileys
        const stream = await downloadContentFromMessage(stickerMsg, 'sticker');
        let buffer = Buffer.from([]);
        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk]);
        }

        // 2. Deteksi Otomatis: Apakah ini stiker gerak (Animated WebP)?
        // Animasi WebP selalu memiliki tag 'ANIM' di dalam headernya
        const isAnimated = buffer.includes(Buffer.from('ANIM'));

        if (isAnimated) {
            console.log('🔄 Mendeteksi stiker GERAK. Memulai konversi ke MP4...');
            const mp4Buffer = await webpToMp4Ezgif(buffer);
            await sock.sendMessage(from, { 
                video: mp4Buffer, 
                caption: '✅ *Stiker Gerak -> Video MP4*' 
            }, { quoted: msg });
        } else {
            console.log('📸 Mendeteksi stiker DIAM. Memulai konversi ke PNG...');
            // Menggunakan Sharp untuk mengubah WebP diam menjadi PNG
            const pngBuffer = await sharp(buffer).png().toBuffer();
            await sock.sendMessage(from, { 
                image: pngBuffer, 
                caption: '✅ *Stiker Diam -> Foto PNG*' 
            }, { quoted: msg });
        }

    } catch (e) {
        console.error('❌ Error Ubah Stiker:', e.message);
        sock.sendMessage(from, { text: `❌ Gagal mengubah stiker: ${e.message}` }, { quoted: msg });
    }
}

module.exports = handleUbahStiker;