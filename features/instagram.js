const axios = require('axios');

function extractLink(textToParse, keyword) {
    const urlRegex = /(https?:\/\/[^\s]+)/g; 
    const links = textToParse.match(urlRegex);
    if (links) {
        for (let link of links) {
            if (link.includes(keyword)) return link; 
        }
    }
    return null;
}

async function handleInstagram(sock, msg, from, fullTextToSearch) {
    const url = extractLink(fullTextToSearch, 'instagram');
    if (!url) return sock.sendMessage(from, { text: '⚠️ Link Instagram tidak ditemukan! Kirim link atau reply pesan.' }, { quoted: msg });
    
    const cleanUrl = url.split('?')[0]; 
    await sock.sendMessage(from, { text: '⏳ Sedang mengambil media Instagram, mohon tunggu...' }, { quoted: msg });
    
    let success = false;
    let downloadLinks = [];

    // JALUR 1: API Ryzendesu (Stabil)
    try {
        console.log('\n🔄 [IG] Mencoba API Ryzendesu...');
        let resApi = await axios.get(`https://api.ryzendesu.vip/api/downloader/igdl?url=${encodeURIComponent(cleanUrl)}`, { timeout: 15000 });
        let data = resApi.data;

        if (data.success && data.data && data.data.length > 0) {
            for (let item of data.data) {
                if (item.url) downloadLinks.push(item.url);
            }
            if (downloadLinks.length > 0) success = true;
        }
    } catch (e) {
        console.log("⚠️ [LOG] API Ryzendesu Gagal:", e.message);
    }

    // JALUR 2: API Nexray (Ban Serep)
    if (!success) {
        try {
            console.log('🔄 [IG] Mencoba Fallback Nexray API...');
            let resApi = await axios.get(`https://api.nexray.eu.cc/downloader/v2/instagram?url=${encodeURIComponent(cleanUrl)}`, { timeout: 15000 });
            let data = resApi.data;

            if (data.status && data.result?.media?.length) {
                for (let item of data.result.media) {
                    downloadLinks.push(item.url);
                }
                success = true;
            }
        } catch (e) {
            console.log("⚠️ [LOG] Nexray API Gagal:", e.message);
        }
    }

    // KIRIM MEDIA
    if (success && downloadLinks.length > 0) {
        for (let mediaUrl of downloadLinks) {
            try {
                let bufResponse = await axios.get(mediaUrl, { responseType: "arraybuffer" });
                let buf = Buffer.from(bufResponse.data);

                if (buf.slice(4, 8).toString() === "ftyp") {
                    await sock.sendMessage(from, { video: buf }, { quoted: msg });
                } else {
                    await sock.sendMessage(from, { image: buf }, { quoted: msg });
                }
            } catch (errSend) {
                console.error('❌ [LOG] Gagal mengirim media:', errSend.message);
            }
        }
        console.log('✅ [LOG] Instagram berhasil diproses & dikirim!');
    } else {
        sock.sendMessage(from, { text: '❌ Gagal mengunduh. Pastikan akun tidak di-private atau server sedang sibuk.' }, { quoted: msg });
    }
}

module.exports = handleInstagram;