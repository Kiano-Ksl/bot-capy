// File: features/tiktok.js
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

function formatNumber(num = 0) {
    return Number(num).toLocaleString('id-ID');
}

async function handleTiktok(sock, msg, from, fullTextToSearch) {
    const url = extractLink(fullTextToSearch, 'tiktok');
    if (!url) return sock.sendMessage(from, { text: '⚠️ Link TikTok tidak ditemukan! Kirim link atau reply pesan.' }, { quoted: msg });
    
    const cleanUrl = url.split('?')[0]; 
    await sock.sendMessage(from, { text: '⏳ Mengekstrak data TikTok...' }, { quoted: msg });
    
    try {
        console.log(`\n🔄 [TT] Menembak API TikWM (Smart Detect)...`);
        
        // gunakan API 
        const { data } = await axios.get('https://www.tikwm.com/api/', {
            params: { url: cleanUrl, hd: 1 },
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
        });

        // Validasi API 2
        if (!data || data.code !== 0 || !data.data) {
            return sock.sendMessage(from, { text: `❌ Gagal mengambil data. Pastikan link benar dan akun tidak di-private.` }, { quoted: msg });
        }

        const res = data.data;
        const uploader = res.author?.nickname || res.author?.unique_id || '-';
        const title = res.title || '-';
        const views = formatNumber(res.play_count);
        const likes = formatNumber(res.digg_count);

        const caption = `
👤 *Uploader:* ${uploader}
📝 *Deskripsi:* ${title}
👁️ *Views:* ${views} | ❤️ *Likes:* ${likes}
        `.trim();

        // ==========================================
        if (res.images && res.images.length > 0) {
            console.log(`📸 [LOG] Slide foto terdeteksi! Mengirim ${res.images.length} gambar...`);
            
            // Kirim foto
            for (let i = 0; i < res.images.length; i++) {
                const imgCaption = (i === 0) ? caption : ""; 
                await sock.sendMessage(from, { 
                    image: { url: res.images[i] }, 
                    caption: imgCaption 
                }, { quoted: msg });
            }

            // Kirim lagu/audio
            if (res.music || res.music_info?.play) {
                console.log(`🎵 [LOG] Mengirim audio dari slide...`);
                await sock.sendMessage(from, { text: '⏳ Mengirim lagu dari slide TikTok...' }, { quoted: msg });
                
                const audioUrl = res.music || res.music_info.play;
                await sock.sendMessage(from, { 
                    audio: { url: audioUrl }, 
                    mimetype: 'audio/mpeg' 
                }, { quoted: msg });
            }
            
            console.log('✅ [LOG] TikTok Slide & Audio sukses dikirim!');
        } 
        
        else if (res.hdplay || res.play) {
            console.log(`🎥 [LOG] Video terdeteksi! Mengirim video HD...`);
            const videoUrl = res.hdplay || res.play;
            
            await sock.sendMessage(from, { 
                video: { url: videoUrl }, 
                caption: caption 
            }, { quoted: msg });
            
            console.log('✅ [LOG] TikTok Video sukses dikirim!');
        } 
        
        else {
            sock.sendMessage(from, { text: `❌ Format media tidak dikenali oleh sistem.` }, { quoted: msg });
        }

    } catch (e) {
        console.log(`❌ [LOG] TikTok API Error:`, e.message);
        sock.sendMessage(from, { text: `❌ Terjadi kesalahan pada server API TikTok.` }, { quoted: msg });
    }
}

module.exports = handleTiktok;