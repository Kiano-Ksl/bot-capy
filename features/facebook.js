// File: features/facebook.js
const axios = require('axios');
const cheerio = require('cheerio');

function extractLink(textToParse) {
    const urlRegex = /(https?:\/\/[^\s]+)/g; 
    const links = textToParse.match(urlRegex);
    if (links) {
        for (let link of links) {
            if (link.includes('facebook.com') || link.includes('fb.watch') || link.includes('fb.gg')) {
                return link; 
            }
        }
    }
    return null;
}

async function handleFacebook(sock, msg, from, fullTextToSearch) {
    const url = extractLink(fullTextToSearch);
    if (!url) return sock.sendMessage(from, { text: '⚠️ Link Facebook tidak ditemukan! Kirim link atau reply pesan.' }, { quoted: msg });
    
    await sock.sendMessage(from, { text: '⏳ Sedang mengunduh video Facebook...' }, { quoted: msg });
    
    try {
        console.log(`\n🔄 [FB] Menjalankan Scraper InstaTiktok...`);
        const SITE_URL = 'https://instatiktok.com/';
        const form = new URLSearchParams();
        form.append('url', url);
        form.append('platform', 'facebook');
        form.append('siteurl', SITE_URL);

        const res = await axios.post(`${SITE_URL}api`, form.toString(), {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'Origin': SITE_URL,
                'Referer': SITE_URL,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                'X-Requested-With': 'XMLHttpRequest'
            }
        });

        const html = res?.data?.html;
        if (!html || res?.data?.status !== 'success') throw new Error('Gagal mengambil data scraper');

        const $ = cheerio.load(html);
        const links = [];

        $('a.btn[href^="http"]').each((_, el) => {
            const link = $(el).attr('href');
            if (link && !links.includes(link)) links.push(link);
        });

        if (links.length === 0) throw new Error('Link download tidak ditemukan di halaman');

        const videoUrl = links.at(-1);

        await sock.sendMessage(from, { 
            video: { url: videoUrl }, 
            caption: '✅ Video Facebook berhasil diunduh!' 
        }, { quoted: msg });
        
        console.log('✅ [LOG] Facebook sukses dikirim!');

    } catch (e) {
        console.log(`⚠️ [LOG] Scraper FB Gagal:`, e.message);
        
        // FALLBACK
        try {
            console.log(`🔄 [FB] Mencoba Fallback API Ryzendesu...`);
            const { data } = await axios.get(`https://api.ryzendesu.vip/api/downloader/fbdl?url=${encodeURIComponent(url)}`, {
                headers: { 'User-Agent': 'Mozilla/5.0' }
            });

            const videoData = data.data || data.result;
            let finalUrl = '';

            if (Array.isArray(videoData)) {
                // Cari resolusi
                const hd = videoData.find(v => v.resolution?.toLowerCase().includes('hd') || v.quality?.toLowerCase().includes('hd'));
                finalUrl = hd ? hd.url : videoData[0].url;
            } else if (videoData?.url) {
                finalUrl = videoData.url;
            }

            if (!finalUrl) throw new Error('Format URL tidak ditemukan di balasan API');

            await sock.sendMessage(from, { 
                video: { url: finalUrl }, 
                caption: '✅ Video Facebook berhasil diunduh!' 
            }, { quoted: msg });
            
            console.log('✅ [LOG] Facebook (Fallback) sukses dikirim!');
        } catch (err) {
            console.log(`❌ [LOG] FB Fallback Error:`, err.message);
            sock.sendMessage(from, { text: `❌ Gagal mengunduh Facebook. Pastikan video bersifat publik (tidak private).` }, { quoted: msg });
        }
    }
}

module.exports = handleFacebook;