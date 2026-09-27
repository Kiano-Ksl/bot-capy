const axios = require('axios');

async function handleInstagram(sock, msg, from, fullTextToSearch) {
    const urlRegex = /(https?:\/\/[^\s]+)/g; 
    const links = fullTextToSearch.match(urlRegex);
    const url = links ? links.find(l => l.includes('instagram')) : null;

    if (!url) return sock.sendMessage(from, { text: '⚠️ Link tidak valid.' }, { quoted: msg });
    
    await sock.sendMessage(from, { text: '⏳ Sedang mengunduh media...' }, { quoted: msg });
    
    try {
        const apiUrl = `https://api.vreden.web.id/api/igdl?url=${encodeURIComponent(url)}`;
        let response = await axios.get(apiUrl, { timeout: 30000 });
        let data = response.data;

        if (!data || !data.result || (Array.isArray(data.result) && data.result.length === 0)) {
            return sock.sendMessage(from, { text: '❌ Media tidak ditemukan. Pastikan link bukan dari akun Private.' }, { quoted: msg });
        }

        let mediaItems = Array.isArray(data.result) ? data.result : [data.result];
        let captionText = "📸 *IG DOWNLOADER*";

        for (let item of mediaItems) {
            let mediaUrl = item.url;
            if (!mediaUrl) continue;

            let bufResponse = await axios.get(mediaUrl, { responseType: "arraybuffer", timeout: 30000 });
            let buf = Buffer.from(bufResponse.data);

            if (buf.slice(4, 8).toString() === "ftyp") {
                await sock.sendMessage(from, { video: buf, caption: captionText }, { quoted: msg });
            } else {
                await sock.sendMessage(from, { image: buf, caption: captionText }, { quoted: msg });
            }
        }
        
    } catch (e) {
        console.error('❌ Error IG:', e.message);
        sock.sendMessage(from, { text: '❌ Server API sedang sibuk atau link tidak valid.' }, { quoted: msg });
    }
}

module.exports = handleInstagram;