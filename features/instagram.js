// File: features/instagram.js
const { instagram } = require('../lib/instagramdl');
const axios = require('axios');

function extractLink(textToParse) {
    const urlRegex = /(https?:\/\/[^\s]+)/g; 
    const links = textToParse.match(urlRegex);
    return links ? links.find(l => l.includes('instagram')) : null;
}

async function handleInstagram(sock, msg, from, fullTextToSearch) {
    const url = extractLink(fullTextToSearch);
    if (!url) return sock.sendMessage(from, { text: '⚠️ Link Instagram tidak valid.' }, { quoted: msg });
    
    await sock.sendMessage(from, { text: '🕵️‍♂️ Mesin pintar sedang membedah Instagram...' }, { quoted: msg });
    
    try {
        // TAHAP 1: MESIN SPOOFING MANDIRI (Fokus ke Foto & Postingan)
        const res = await instagram.download(url);

        if (res.status && res.result && res.result.downloadUrls) {
            const data = res.result.downloadUrls;
            const captionText = `📸 *IG DOWNLOADER*\n👤 *Akun:* @${res.result.author}\n\n📝 ${res.result.caption}`;
            let hasMedia = false;

            // Prioritas 1: Coba kirim Video jika mesin berhasil dapat
            if (data.videos && data.videos.length > 0) {
                for (let vid of data.videos) {
                    await sock.sendMessage(from, { video: { url: vid.url }, caption: captionText }, { quoted: msg });
                }
                hasMedia = true;
            } 
            // Prioritas 2: Kirim Gambar
            else if (data.images && data.images.length > 0) {
                for (let img of data.images) {
                    await sock.sendMessage(from, { image: { url: img.url }, caption: captionText }, { quoted: msg });
                }
                hasMedia = true;
            }

            // Jika berhasil dapat media, hentikan proses di sini
            if (hasMedia) {
                console.log('✅ [LOG] Instagram (Spoofing) sukses dikirim!');
                return;
            }
        }
        
        throw new Error("Mesin internal gagal menemukan media (Kemungkinan Reels diproteksi).");

    } catch (e) {
        console.log(`⚠️ [LOG] Mesin internal gagal: ${e.message}. Beralih ke API Cadangan...`);
        
        // TAHAP 2: MESIN CADANGAN API VREDEN (Spesialis Reels & Video)
        try {
            const { data } = await axios.get(`https://api.vreden.my.id/api/igdownload?url=${encodeURIComponent(url)}`, {
                headers: { 'User-Agent': 'Mozilla/5.0' }
            });

            const mediaArray = data.result || data.data; 
            if (!mediaArray || mediaArray.length === 0) throw new Error('API Cadangan kosong.');

            for (let item of mediaArray) {
                const mediaUrl = typeof item === 'string' ? item : item.url;
                if (!mediaUrl) continue;

                // Download file mentah untuk mengecek jenisnya secara akurat
                const mediaRes = await axios.get(mediaUrl, { responseType: "arraybuffer" });
                const buf = Buffer.from(mediaRes.data);

                // Cek Magic Bytes "ftyp" (Tanda file MP4/Video)
                if (buf.length > 8 && buf.slice(4, 8).toString() === "ftyp") {
                    await sock.sendMessage(from, { video: buf, caption: '✅ *IG DOWNLOADER*' }, { quoted: msg });
                } else {
                    await sock.sendMessage(from, { image: buf, caption: '✅ *IG DOWNLOADER*' }, { quoted: msg });
                }
            }
            console.log('✅ [LOG] Instagram (API Cadangan) sukses dikirim!');

        } catch (err) {
            console.error('❌ Semua metode IG Gagal:', err.message);
            sock.sendMessage(from, { text: '❌ Media tidak ditemukan. Pastikan link valid dan akun tidak di-private.' }, { quoted: msg });
        }
    }
}

module.exports = handleInstagram;