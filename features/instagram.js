// File: features/instagram.js
const { instagram } = require('../lib/instagramdl');

function extractLink(textToParse) {
    const urlRegex = /(https?:\/\/[^\s]+)/g; 
    const links = textToParse.match(urlRegex);
    return links ? links.find(l => l.includes('instagram')) : null;
}

async function handleInstagram(sock, msg, from, fullTextToSearch) {
    const url = extractLink(fullTextToSearch);
    if (!url) return sock.sendMessage(from, { text: '⚠️ Link Instagram tidak valid.' }, { quoted: msg });
    
    await sock.sendMessage(from, { text: '⏳ Mesin mandiri sedang bekerja...' }, { quoted: msg });
    
    try {
        // Memanggil mesin scraper mandiri dari folder lib
        const res = await instagram.download(url);

        if (!res.status) {
            return sock.sendMessage(from, { text: `❌ Gagal: Akses dibatasi oleh Instagram.\nDetail: ${res.error}` }, { quoted: msg });
        }

        const data = res.result.downloadUrls;
        const author = res.result.author?.username || res.result.author || 'Unknown';
        const caption = res.result.metadata?.caption || res.result.caption || '';
        const captionText = `📸 *IG DOWNLOADER*\n👤 *Akun:* @${author}\n\n📝 ${caption}`;

        let hasMedia = false;

        // 1. Coba kirim Video (Jika berhasil dapat)
        if (data.videos && data.videos.length > 0) {
            for (let vid of data.videos) {
                await sock.sendMessage(from, { video: { url: vid.url }, caption: captionText }, { quoted: msg });
            }
            hasMedia = true;
        } 
        // 2. Kirim Gambar / Slide (Reels yang diganti foto oleh IG akan masuk ke sini)
        else if (data.images && data.images.length > 0) {
            for (let img of data.images) {
                await sock.sendMessage(from, { image: { url: img.url }, caption: captionText }, { quoted: msg });
            }
            hasMedia = true;
        }

        if (!hasMedia) {
            sock.sendMessage(from, { text: '❌ Media tidak ditemukan. Mungkin hanya foto profil atau akun diprivate.' }, { quoted: msg });
        } else {
            console.log('✅ [LOG] Instagram (Mode Dasar) sukses dikirim!');
        }

    } catch (e) {
        console.error('❌ Error IG:', e);
        sock.sendMessage(from, { text: '❌ Terjadi kesalahan fatal di sistem.' }, { quoted: msg });
    }
}

module.exports = handleInstagram;