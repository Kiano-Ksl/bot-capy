// File: features/sticker.js
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');
// const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const pino = require('pino');

// ffmpeg.setFfmpegPath(ffmpegInstaller.path);

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
            
            fs.writeFileSync(tempInput, buffer);
            let commandFfmpeg = ffmpeg(tempInput);
            
            if (isVideo) commandFfmpeg.inputOptions(["-t", "5"]); 

            commandFfmpeg.outputOptions([
                    "-vcodec", "libwebp",
                    "-vf", "scale=512:512:force_original_aspect_ratio=increase,crop=512:512,fps=15",
                    "-loop", "0", "-preset", "default", "-an", "-vsync", "0",
                    "-q:v", "25", "-compression_level", "6", "-lossless", "0"
                ])
                .save(tempOutput)
                .on('end', async () => {
                    const stats = fs.statSync(tempOutput);
                    const fileSizeInMB = stats.size / (1024 * 1024);
                    
                    if (fileSizeInMB > 0.98) {
                        await sock.sendMessage(from, { text: `⚠️ *Gagal:* Ukuran stiker *${fileSizeInMB.toFixed(2)} MB* (Melewati batas 1 MB).` }, { quoted: msg });
                    } else {
                        await sock.sendMessage(from, { sticker: fs.readFileSync(tempOutput) }, { quoted: msg });
                        console.log('✅ [LOG] Stiker sukses dikirim!');
                    }
                    
                    if (fs.existsSync(tempInput)) fs.unlinkSync(tempInput);
                    if (fs.existsSync(tempOutput)) fs.unlinkSync(tempOutput);
                })
                .on('error', () => {
                    sock.sendMessage(from, { text: '❌ Maaf, terjadi kesalahan saat merender stiker.' }, { quoted: msg });
                    if (fs.existsSync(tempInput)) fs.unlinkSync(tempInput);
                    if (fs.existsSync(tempOutput)) fs.unlinkSync(tempOutput);
                });
        } catch (err) {
            sock.sendMessage(from, { text: '❌ Maaf, gagal mengunduh media.' }, { quoted: msg });
        }
    } else {
        await sock.sendMessage(from, { text: '⚠️ Kirim foto/video dengan caption *.s* atau reply pesannya.' }, { quoted: msg });
    }
}

module.exports = handleSticker;