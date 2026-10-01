// File: features/instagram.js
const axios = require('axios');

function extractLink(textToParse) {
    const urlRegex = /(https?:\/\/[^\s]+)/g; 
    const links = textToParse.match(urlRegex);
    return links ? links.find(l => l.includes('instagram')) : null;
}

async function handleInstagram(sock, msg, from, fullTextToSearch) {
    const url = extractLink(fullTextToSearch);
    if (!url) return sock.sendMessage(from, { text: '⚠️ Link Instagram tidak ditemukan! Kirim link atau reply pesan.' }, { quoted: msg });
    
    await sock.sendMessage(from, { text: '⏳ Sedang mengunduh media dari Instagram...' }, { quoted: msg });
    
    try {
        console.log(`\n🔄 [IG] Menjalankan API Ryzendesu...`);
        const { data } = await axios.get(`https://api.ryzendesu.vip/api/downloader/igdl?url=${encodeURIComponent(url)}`, {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });

        const mediaArray = data.data || data.result;

        if (!mediaArray || mediaArray.length === 0) {
            throw new Error('Media tidak ditemukan atau akun di-private.');
        }

        // Looping untuk mengirim semua media
        for (let item of mediaArray) {
            const mediaUrl = item.url;
            if (!mediaUrl) continue;

            // Unduh sebagai data mentah (Buffer)
            const mediaRes = await axios.get(mediaUrl, { 
                responseType: "arraybuffer",
                headers: { 'User-Agent': 'Mozilla/5.0' }
            });
            const buf = Buffer.from(mediaRes.data);

            // Cek DNA file (Magic Bytes): "ftyp" adalah ciri khas file video MP4
            if (buf.length > 8 && buf.slice(4, 8).toString() === "ftyp") {
                await sock.sendMessage(from, { 
                    video: buf, 
                    caption: '✅ *INSTAGRAM DOWNLOADER*' 
                }, { quoted: msg });
            } else {
                await sock.sendMessage(from, { 
                    image: buf, 
                    caption: '✅ *INSTAGRAM DOWNLOADER*' 
                }, { quoted: msg });
            }
        }
        
        console.log('✅ [LOG] Instagram sukses dikirim!');

    } catch (e) {
        console.log(`❌ [LOG] API IG Gagal:`, e.message);
        await sock.sendMessage(from, { text: `❌ Gagal mengunduh Instagram.\nPastikan link valid dan akun tidak di-private.` }, { quoted: msg });
    }
}

module.exports = handleInstagram;