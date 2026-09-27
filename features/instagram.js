const { instagram } = require('../lib/instagramdl');

async function handleInstagram(sock, msg, from, fullTextToSearch) {
    const urlRegex = /(https?:\/\/[^\s]+)/g; 
    const links = fullTextToSearch.match(urlRegex);
    const url = links ? links.find(l => l.includes('instagram')) : null;

    if (!url) return sock.sendMessage(from, { text: '⚠️ Link tidak valid atau tidak ditemukan.' }, { quoted: msg });
    
    // Pesan loading yang normal
    await sock.sendMessage(from, { text: '⏳ Sedang mengunduh media...' }, { quoted: msg });
    
    try {
        // Menjalankan mesin mandiri
        const res = await instagram.download(url);

        if (!res.status) {
            return sock.sendMessage(from, { text: '❌ Gagal mengunduh: Akses dibatasi oleh Instagram.' }, { quoted: msg });
        }

        const data = res.result.downloadUrls;
        const captionText = `📸 *IG DOWNLOADER*\n👤 *Akun:* ${res.result?.author?.username || 'Unknown'}\n\n📝 ${res.result?.metadata?.caption || ''}`;

        // 1. Jika berhasil mendapat Video (Reels / Post Video)
        if (res.result.isVideo && data.videos && data.videos.length > 0) {
            for (let vid of data.videos) {
                await sock.sendMessage(from, { video: { url: vid.url }, caption: captionText }, { quoted: msg });
            }
        } 
        // 2. Jika mendapat Gambar (Postingan Foto Biasa / Slide)
        else if (res.result.isImage && data.images && data.images.length > 0) {
            for (let img of data.images) {
                await sock.sendMessage(from, { image: { url: img.url }, caption: captionText }, { quoted: msg });
            }
        } 
        // 3. Jika Instagram memblokir total dan menyembunyikan file
        else {
            sock.sendMessage(from, { text: '❌ Media tidak ditemukan. Sistem keamanan Instagram memblokir permintaan.' }, { quoted: msg });
        }

    } catch (e) {
        console.error('❌ Error Mesin IG:', e);
        sock.sendMessage(from, { text: '❌ Terjadi kesalahan pada sistem.' }, { quoted: msg });
    }
}

module.exports = handleInstagram;