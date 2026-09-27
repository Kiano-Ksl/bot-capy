const { instagram } = require('../lib/instagramdl');
const { XeonInstaMp4 } = require('../lib/XeonInstaMp4');

async function handleInstagram(sock, msg, from, fullTextToSearch) {
    const urlRegex = /(https?:\/\/[^\s]+)/g; 
    const links = fullTextToSearch.match(urlRegex);
    const url = links ? links.find(l => l.includes('instagram')) : null;

    if (!url) return sock.sendMessage(from, { text: '⚠️ Link tidak valid.' }, { quoted: msg });
    
    // Pesan loading simpel
    await sock.sendMessage(from, { text: '⏳ Tunggu sebentar...' }, { quoted: msg });
    
    try {
        let isReel = url.includes('/reel/') || url.includes('/reels/') || url.includes('/tv/');
        let videoUrl = null;
        let captionText = "📸 *IG DOWNLOADER*";

        // 1. Coba pakai mesin utama
        const res = await instagram.download(url);
        
        if (res.status) {
            captionText = `📸 *IG DOWNLOADER*\n👤 *Akun:* ${res.result.author?.username || 'Unknown'}\n\n📝 ${res.result.metadata?.caption || ''}`;
            
            // Jika mesin utama sukses dapat video
            if (res.result.isVideo && res.result.downloadUrls.videos.length > 0) {
                videoUrl = res.result.downloadUrls.videos[0].url;
            } 
            // Jika link-nya Reels tapi mesin utama cuma dapat gambar (kena blokir)
            else if (isReel && res.result.isImage) {
                console.log("⚠️ Mesin utama gagal ambil video Reels, mengalihkan ke mesin SaveFrom...");
            }
            // Jika murni post foto/slide biasa
            else if (res.result.isImage && res.result.downloadUrls.images.length > 0) {
                for (let img of res.result.downloadUrls.images) {
                    await sock.sendMessage(from, { image: { url: img.url }, caption: captionText }, { quoted: msg });
                }
                return; 
            }
        }

        // 2. Jika video gagal diambil mesin utama, jalankan mesin cadangan (XeonInstaMp4)
        if (!videoUrl) {
            try {
                let backupRes = await XeonInstaMp4(url);
                if (backupRes && backupRes.length > 0) {
                    videoUrl = backupRes[0].url; 
                }
            } catch (backupErr) {
                console.log("❌ Mesin cadangan juga gagal:", backupErr.message);
            }
        }

        // 3. Kirim hasilnya
        if (videoUrl) {
            await sock.sendMessage(from, { video: { url: videoUrl }, caption: captionText }, { quoted: msg });
        } else {
            sock.sendMessage(from, { text: '❌ Gagal mengunduh video. Sistem Instagram sedang membatasi akses.' }, { quoted: msg });
        }

    } catch (e) {
        console.error('❌ Error System:', e);
        sock.sendMessage(from, { text: '❌ Terjadi kesalahan pada sistem.' }, { quoted: msg });
    }
}

module.exports = handleInstagram;