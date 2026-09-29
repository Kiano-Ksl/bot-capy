const { instagram } = require('../lib/instagramdl');

async function handleInstagram(sock, msg, from, fullTextToSearch) {
    const urlRegex = /(https?:\/\/[^\s]+)/g; 
    const links = fullTextToSearch.match(urlRegex);
    const url = links ? links.find(l => l.includes('instagram')) : null;

    if (!url) return sock.sendMessage(from, { text: '⚠️ Link tidak valid.' }, { quoted: msg });
    
    await sock.sendMessage(from, { text: '⏳ Mesin mandiri sedang bekerja...' }, { quoted: msg });
    
    try {
        const res = await instagram.download(url);

        if (!res.status) {
            return sock.sendMessage(from, { text: '❌ Gagal: Akses dibatasi oleh Instagram.' }, { quoted: msg });
        }

        const data = res.result.downloadUrls;
        const captionText = `📸 *IG DOWNLOADER*\n👤 *Akun:* ${res.result?.author?.username || 'Unknown'}\n\n📝 ${res.result?.metadata?.caption || ''}`;

        // Jika berhasil dapat Video
        if (res.result.isVideo && data.videos && data.videos.length > 0) {
            for (let vid of data.videos) {
                await sock.sendMessage(from, { video: { url: vid.url }, caption: captionText }, { quoted: msg });
            }
        } 
        // Jika dapat Gambar / Slide (Atau jika Reels disembunyikan IG dan diganti foto sampul)
        else if (res.result.isImage && data.images && data.images.length > 0) {
            for (let img of data.images) {
                await sock.sendMessage(from, { image: { url: img.url }, caption: captionText }, { quoted: msg });
            }
        } else {
            sock.sendMessage(from, { text: '❌ Media tidak ditemukan atau diblokir Instagram.' }, { quoted: msg });
        }
    } catch (e) {
        console.error('❌ Error IG:', e);
        sock.sendMessage(from, { text: '❌ Terjadi kesalahan sistem.' }, { quoted: msg });
    }
}

module.exports = handleInstagram;