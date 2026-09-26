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
    await sock.sendMessage(from, { text: '⏳ Sedang mengunduh media, server API agak lambat akhir-akhir ini, mohon tunggu ya...' }, { quoted: msg });
    
    let success = false;
    let downloadLinks = [];
    const TIMEOUT_MS = 30000; // Naikkan waktu tunggu jadi 30 detik

    // JALUR 1: API Vreden (Endpoint Baru)
    try {
        console.log('\n🔄 [IG] Mencoba API Vreden...');
        let resApi = await axios.get(`https://api.vreden.web.id/api/igdl?url=${encodeURIComponent(cleanUrl)}`, { timeout: TIMEOUT_MS });
        
        if (resApi.data && resApi.data.result) {
            // Tangani respons array maupun objek tunggal
            let items = Array.isArray(resApi.data.result) ? resApi.data.result : [resApi.data.result];
            for (let item of items) {
                if (item.url) downloadLinks.push(item.url);
            }
            if (downloadLinks.length > 0) success = true;
        }
    } catch (e) {
        console.log("⚠️ [LOG] API Vreden Gagal:", e.message);
    }

    // JALUR 2: API Siputzx (Ban Serep)
    if (!success) {
        try {
            console.log('🔄 [IG] Mencoba Fallback Siputzx API...');
            let resApi = await axios.get(`https://api.siputzx.my.id/api/d/igdl?url=${encodeURIComponent(cleanUrl)}`, { timeout: TIMEOUT_MS });
            
            if (resApi.data && resApi.data.data) {
                for (let item of resApi.data.data) {
                    if (item.url) downloadLinks.push(item.url);
                }
                if (downloadLinks.length > 0) success = true;
            }
        } catch (e) {
            console.log("⚠️ [LOG] Siputzx API Gagal:", e.message);
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
                console.error('❌ [LOG] Gagal mengirim media (File terlalu besar atau link mati):', errSend.message);
            }
        }
        console.log('✅ [LOG] Instagram berhasil diproses & dikirim!');
    } else {
        sock.sendMessage(from, { text: '❌ Semua server API sedang down/sibuk. Coba lagi dalam beberapa menit.' }, { quoted: msg });
    }
}

module.exports = handleInstagram;