// File: features/facebook.js
const axios = require('axios');

// Fungsi untuk mencari link FB di dalam pesan
function extractLink(textToParse) {
    const urlRegex = /(https?:\/\/[^\s]+)/g; 
    const links = textToParse.match(urlRegex);
    if (links) {
        for (let link of links) {
            if (link.includes('facebook.com') || link.includes('fb.watch') || link.includes('fb.gg')) {
                return link; 
            }
        }
    }
    return null;
}

// 1. Mencuri Token dari fbdownloader.to
async function getToken() {
    const url = "https://fbdownloader.to/id";
    const { data: html } = await axios.get(url, {
        headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7"
        }
    });

    const regex = /k_exp="([^"]+)".+?k_token="([^"]+)"/s;
    const match = html.match(regex);
    if (!match) throw new Error("Token tidak ditemukan");

    return {
        k_exp: match[1],
        k_token: match[2]
    };
}

// 2. Mengeksekusi pencarian video
async function fbDownloader(fbUrl) {
    const { k_exp, k_token } = await getToken();

    const payload = new URLSearchParams({
        k_exp,
        k_token,
        p: "home",
        q: fbUrl,
        lang: "id",
        v: "v2",
        W: ""
    });

    const { data } = await axios.post("https://fbdownloader.to/api/ajaxSearch", payload, {
        headers: {
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "X-Requested-With": "XMLHttpRequest",
            "Origin": "https://fbdownloader.to",
            "Referer": "https://fbdownloader.to/id"
        }
    });

    if (!data || !data.data) throw new Error("Gagal mengambil data video");

    const html = data.data;
    const results = [];

    const rowRegex = /<td class="video-quality">(.*?)<\/td>[\s\S]*?(?:href="(.*?)"|data-videourl="(.*?)")/g;
    let match;
    while ((match = rowRegex.exec(html)) !== null) {
        const quality = match[1].trim();
        const url = match[2] || match[3];
        if (quality && url) results.push({ quality, url });
    }

    return results;
}

// 3. Jembatan Penghubung Bot (Handler)
async function handleFacebook(sock, msg, from, fullTextToSearch) {
    const url = extractLink(fullTextToSearch);
    if (!url) return sock.sendMessage(from, { text: '⚠️ Link Facebook tidak ditemukan! Kirim link atau reply pesan.' }, { quoted: msg });
    
    await sock.sendMessage(from, { text: '⏳ Sedang mengunduh video Facebook...' }, { quoted: msg });
    
    try {
        console.log(`\n🔄 [FB] Menjalankan Scraper fbdownloader.to...`);
        const results = await fbDownloader(url);
        
        if (!results || results.length === 0) {
            throw new Error('Video tidak ditemukan. Mungkin akun diprivate.');
        }

        // Cari Kualitas Tertinggi (HD), kalau tidak ada ambil kualitas normal (SD)
        let bestVideo = results.find(v => v.quality.toLowerCase().includes('hd')) || results[0];

        await sock.sendMessage(from, { 
            video: { url: bestVideo.url }, 
            caption: `✅ *FACEBOOK DOWNLOADER*\n\n🎥 Kualitas: ${bestVideo.quality}` 
        }, { quoted: msg });
        
        console.log('✅ [LOG] Facebook sukses dikirim!');

    } catch (e) {
        console.log(`⚠️ [LOG] Scraper FB Gagal:`, e.message);
        
        // MESIN CADANGAN (FALLBACK RYzendesu) 
        try {
            console.log(`🔄 [FB] Mencoba Fallback API Ryzendesu...`);
            const { data } = await axios.get(`https://api.ryzendesu.vip/api/downloader/fbdl?url=${encodeURIComponent(url)}`, {
                headers: { 'User-Agent': 'Mozilla/5.0' }
            });

            const videoData = data.data || data.result;
            let finalUrl = '';

            if (Array.isArray(videoData)) {
                const hd = videoData.find(v => v.resolution?.toLowerCase().includes('hd') || v.quality?.toLowerCase().includes('hd'));
                finalUrl = hd ? hd.url : videoData[0].url;
            } else if (videoData?.url) {
                finalUrl = videoData.url;
            }

            if (!finalUrl) throw new Error('Format URL tidak ditemukan di balasan API');

            await sock.sendMessage(from, { 
                video: { url: finalUrl }, 
                caption: '✅ *FACEBOOK DOWNLOADER* (Mode Cadangan)' 
            }, { quoted: msg });
            
            console.log('✅ [LOG] Facebook (Fallback) sukses dikirim!');
        } catch (err) {
            console.log(`❌ [LOG] FB Fallback Error:`, err.message);
            sock.sendMessage(from, { text: `❌ Gagal mengunduh Facebook. Pastikan video bersifat publik (tidak private/grup tertutup).` }, { quoted: msg });
        }
    }
}

module.exports = handleFacebook;