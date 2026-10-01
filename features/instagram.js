// File: features/instagram.js
const axios = require('axios');

function extractLink(textToParse) {
    const urlRegex = /(https?:\/\/[^\s]+)/g; 
    const links = textToParse.match(urlRegex);
    return links ? links.find(l => l.includes('instagram')) : null;
}

async function handleInstagram(sock, msg, from, fullTextToSearch) {
    const url = extractLink(fullTextToSearch);
    if (!url) return sock.sendMessage(from, { text: '⚠️ Link Instagram tidak ditemukan!' }, { quoted: msg });
    
    await sock.sendMessage(from, { text: '⏳ Sedang menarik Reels/Postingan...' }, { quoted: msg });
    
    // SISTEM GATLING GUN: 3 API berbeda sebagai peluru
    const apis = [
        `https://api.siputzx.my.id/api/d/igdl?url=${encodeURIComponent(url)}`,
        `https://bk9.fun/download/instagram?url=${encodeURIComponent(url)}`,
        `https://api.vreden.web.id/api/igdownload?url=${encodeURIComponent(url)}`
    ];

    let mediaData = null;

    // Bot akan menembak API satu per satu
    for (let api of apis) {
        try {
            console.log(`🔄 [IG] Mencoba peluru API: ${api.split('/')[2]}`);
            const { data } = await axios.get(api, { headers: { 'User-Agent': 'Mozilla/5.0' } });

            // Menyesuaikan struktur data dari masing-masing pembuat API
            let results = data.data || data.result || data.BK9;
            
            if (results && results.length > 0) {
                mediaData = results;
                console.log(`✅ [IG] Sukses ditembus oleh: ${api.split('/')[2]}`);
                break; // Hentikan pencarian jika sudah dapat videonya
            }
        } catch (e) {
            console.log(`⚠️ [IG] ${api.split('/')[2]} Gagal: Meleset.`);
        }
    }

    if (!mediaData) {
        return sock.sendMessage(from, { text: '❌ Semua server gagal menembus Instagram atau link di-private.' }, { quoted: msg });
    }

    try {
        for (let item of mediaData) {
            const mediaUrl = typeof item === 'string' ? item : item.url;
            if (!mediaUrl) continue;

            // Tarik sebagai buffer mentah
            const mediaRes = await axios.get(mediaUrl, { 
                responseType: "arraybuffer",
                headers: { 'User-Agent': 'Mozilla/5.0' }
            });
            const buf = Buffer.from(mediaRes.data);

            // Cek DNA file ("ftyp" = Video MP4)
            if (buf.length > 8 && buf.slice(4, 8).toString() === "ftyp") {
                await sock.sendMessage(from, { video: buf, caption: '✅ *IG DOWNLOADER*' }, { quoted: msg });
            } else {
                await sock.sendMessage(from, { image: buf, caption: '✅ *IG DOWNLOADER*' }, { quoted: msg });
            }
        }
    } catch (err) {
        console.error('❌ Error saat mengirim:', err.message);
        sock.sendMessage(from, { text: `❌ Gagal mengirim file dari server ke WhatsApp.` }, { quoted: msg });
    }
}

module.exports = handleInstagram;