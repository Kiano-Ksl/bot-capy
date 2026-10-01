// File: features/instagram.js
const { instagram } = require('../lib/instagramdl');

// Ekstrak URL
function extractLink(textToParse) {
    const urlRegex = /(https?:\/\/[^\s]+)/g; 
    const links = textToParse.match(urlRegex);
    return links ? links.find(l => l.includes('instagram')) : null;
}

async function handleInstagram(sock, msg, from, fullTextToSearch) {
    const url = extractLink(fullTextToSearch);
    if (!url) return sock.sendMessage(from, { text: '⚠️ Link tidak valid.' }, { quoted: msg });
    
    await sock.sendMessage(from, { text: '🕵️‍♂️ Mesin pintar sedang membedah Instagram...' }, { quoted: msg });
    
    try {
        const res = await instagram.download(url);

        if (!res.status) {
            return sock.sendMessage(from, { text: `❌ Penyamaran Gagal: ${res.error}` }, { quoted: msg });
        }

        const data = res.result.downloadUrls;
        const captionText = `📸 *IG DOWNLOADER*\n👤 *Akun:* @${res.result.author}\n\n📝 ${res.result.caption}`;

        let hasMedia = false;

        // Kirim Video jika ada
        if (data.videos && data.videos.length > 0) {
            for (let vid of data.videos) {
                await sock.sendMessage(from, { video: { url: vid.url }, caption: captionText }, { quoted: msg });
            }
            hasMedia = true;
        } 
        
        // Kirim Gambar jika ada
        if (data.images && data.images.length > 0) {
            for (let img of data.images) {
                await sock.sendMessage(from, { image: { url: img.url }, caption: captionText }, { quoted: msg });
            }
            hasMedia = true;
        }

        if (!hasMedia) {
            sock.sendMessage(from, { text: '❌ Media tidak ditemukan. Mungkin hanya foto profil atau akun diprivate.' }, { quoted: msg });
        }
    } catch (e) {
        console.error('❌ Error IG:', e);
        sock.sendMessage(from, { text: '❌ Terjadi kesalahan fatal di sistem.' }, { quoted: msg });
    }
}

module.exports = handleInstagram;