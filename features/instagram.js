// File: features/instagram.js
const { instagram } = require('../lib/instagramdl'); // Memanggil mesin baru dari folder lib

async function handleInstagram(sock, msg, from, fullTextToSearch) {
    const urlRegex = /(https?:\/\/[^\s]+)/g; 
    const links = fullTextToSearch.match(urlRegex);
    const url = links ? links.find(l => l.includes('instagram')) : null;

    if (!url) return sock.sendMessage(from, { text: '⚠️ Link Instagram tidak ditemukan! Kirim link atau reply pesan.' }, { quoted: msg });
    
    await sock.sendMessage(from, { text: '⏳ Mesin mandiri sedang bekerja mengekstrak media...' }, { quoted: msg });
    
    try {
        // Menyalakan mesin instagramdl
        const res = await instagram.download(url);

        if (!res.status) {
            return sock.sendMessage(from, { text: `❌ Gagal mengambil data: ${res.error}` }, { quoted: msg });
        }

        const data = res.result.downloadUrls;
        const captionText = `📸 *BOT CAPY - IG DOWNLOADER*\n👤 *Akun:* ${res.result.author.username}\n\n📝 ${res.result.metadata.caption}`;

        // Jika hasilnya Video
        if (res.result.isVideo && data.videos.length > 0) {
            for (let vid of data.videos) {
                await sock.sendMessage(from, { video: { url: vid.url }, caption: captionText }, { quoted: msg });
            }
        } 
        // Jika hasilnya Gambar / Slide (Postingan foto biasa/banyak foto)
        else if (res.result.isImage && data.images.length > 0) {
            for (let img of data.images) {
                await sock.sendMessage(from, { image: { url: img.url }, caption: captionText }, { quoted: msg });
            }
        } else {
            sock.sendMessage(from, { text: '❌ Media tidak ditemukan di link tersebut.' }, { quoted: msg });
        }

    } catch (e) {
        console.error('❌ Error Mesin IG:', e);
        sock.sendMessage(from, { text: '❌ Terjadi kesalahan fatal pada mesin.' }, { quoted: msg });
    }
}

module.exports = handleInstagram;