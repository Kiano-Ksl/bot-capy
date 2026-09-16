// File: features/sticker.js
const fs = require('fs');
const os = require('os');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const pino = require('pino');

// --- DETEKSI PLATFORM PINTAR ---
let ffmpegPath = 'ffmpeg'; // Default untuk Termux / Linux
if (os.platform() === 'win32') {
    try {
        // Khusus Windows, pakai installer bawaan node_modules
        ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
    } catch (e) {
        console.log('⚠️ @ffmpeg-installer tidak ditemukan, menggunakan ffmpeg bawaan sistem.');
    }
}
// -------------------------------

async function handleSticker(sock, msg, from) {
    const isImage = msg.message.imageMessage || msg.message.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage;
    const isVideo = msg.message.videoMessage || msg.message.extendedTextMessage?.contextInfo?.quotedMessage?.videoMessage;

    if (isImage || isVideo) {
        console.log('\n⏳ [LOG] Sedang memproses stiker...');
        
        let targetMessage = msg;
        if (msg.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
            targetMessage = { key: msg.key, message: msg.message.extendedTextMessage.contextInfo.quotedMessage };
        }

        try {
            // Proses Download 
            const buffer = await downloadMediaMessage(
                targetMessage, 'buffer', {},
                { logger: pino({ level: 'silent' }), reuploadRequest: sock.updateMediaMessage }
            );

            const mediaType = isImage ? 'jpg' : 'mp4';
            const tempInput = `./temp_media_${Date.now()}.${mediaType}`;
            const tempOutput = `./temp_sticker_${Date.now()}.webp`;
            
            // Simpan file sementara
            fs.writeFileSync(tempInput, buffer);
            
            // Siapkan filter standar stiker WhatsApp (Kotak 512x512)
            const filterStr = "scale=512:512:force_original_aspect_ratio=increase,crop=512:512";
            let ffmpegCommand = "";

            if (isImage) {
                // Perintah FFmpeg untuk Gambar
                ffmpegCommand = `"${ffmpegPath}" -i "${tempInput}" -vf "${filterStr}" -vcodec libwebp -y "${tempOutput}"`;
            } else if (isVideo) {
                // Perintah FFmpeg untuk Video (Maks 5 detik)
                ffmpegCommand = `"${ffmpegPath}" -i "${tempInput}" -t 5 -vf "${filterStr},fps=15" -vcodec libwebp -loop 0 -preset default -an -vsync 0 -q:v 25 -compression_level 6 -lossless 0 -y "${tempOutput}"`;
            }

            // Eksekusi perintah FFmpeg
            await execPromise(ffmpegCommand);

            // Cek ukuran file hasil
            const stats = fs.statSync(tempOutput);
            const fileSizeInMB = stats.size / (1024 * 1024);
            
            if (fileSizeInMB > 0.98) {
                await sock.sendMessage(from, { text: `⚠️ *Gagal:* Ukuran stiker *${fileSizeInMB.toFixed(2)} MB* (Melewati batas 1 MB).` }, { quoted: msg });
            } else {
                // Kirim stiker
                await sock.sendMessage(from, { sticker: fs.readFileSync(tempOutput) }, { quoted: msg });
                console.log('✅ [LOG] Stiker sukses dikirim!');
            }
            
            // Hapus file sementara
            if (fs.existsSync(tempInput)) fs.unlinkSync(tempInput);
            if (fs.existsSync(tempOutput)) fs.unlinkSync(tempOutput);

        } catch (err) {
            console.error(err);
            sock.sendMessage(from, { text: '❌ Maaf, terjadi kesalahan saat merender stiker.' }, { quoted: msg });
            // Bersihkan sisa file jika error
            const tempFiles = fs.readdirSync('./').filter(f => f.startsWith('temp_'));
            tempFiles.forEach(f => fs.unlinkSync(f));
        }
    } else {
        await sock.sendMessage(from, { text: '⚠️ Kirim foto/video dengan caption *.s* atau reply pesannya.' }, { quoted: msg });
    }
}

module.exports = handleSticker;