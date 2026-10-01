// File: features/ubahstiker.js
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const sharp = require('sharp');
const axios = require('axios');
const FormData = require('form-data');
const cheerio = require('cheerio');

// ==========================================
// MESIN EZGIF (UNTUK STIKER GERAK -> MP4)
// ==========================================
async function webpToMp4(buffer) {
    // 1. Upload ke EZGif dengan pembungkusan (Boundary) yang benar
    const form = new FormData();
    form.append('new-image-url', '');
    form.append('new-image', buffer, { filename: 'sticker.webp', contentType: 'image/webp' });

    // s6.ezgif.com adalah server khusus upload yang paling stabil
    const res = await axios.post('https://s6.ezgif.com/webp-to-mp4', form, {
        headers: form.getHeaders()
    });
    
    const $ = cheerio.load(res.data);
    const file = $('input[name="file"]').val();
    if (!file) throw new Error('Gagal mendapatkan ID file dari server EZGif.');

    // 2. Eksekusi Konversi ke MP4
    const form2 = new FormData();
    form2.append('file', file);
    form2.append('convert', 'Convert WebP to MP4!');

    const res2 = await axios.post(`https://ezgif.com/webp-to-mp4/${file}`, form2, {
        headers: form2.getHeaders()
    });
    
    const $2 = cheerio.load(res2.data);
    const resultUrl = 'https:' + $2('div#output > p.outfile > video > source').attr('src');
    if (!resultUrl || resultUrl === 'https:undefined') throw new Error('Gagal memproses video MP4.');

    // 3. Download hasil MP4
    const resMp4 = await axios.get(resultUrl, { responseType: 'arraybuffer' });
    return Buffer.from(resMp4.data);
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
        // 1. Tarik data stiker
        const stream = await downloadContentFromMessage(stickerMsg, 'sticker');
        let buffer = Buffer.from([]);
        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk]);
        }

        // 2. Deteksi Otomatis
        const isAnimated = buffer.includes(Buffer.from('ANIM'));

        if (isAnimated) {
            console.log('🔄 Konversi Stiker Gerak -> MP4...');
            const mp4Buffer = await webpToMp4(buffer);
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