// File: features/instagram.js
const axios = require('axios');
const cheerio = require('cheerio');
const FormData = require('form-data');

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
    await sock.sendMessage(from, { text: '⏳ Sedang mengekstrak media Instagram...' }, { quoted: msg });
    
    let success = false;
    let downloadLinks = [];

    // SCRAPING
    try {
        console.log(`\n🔄 [IG] Menjalankan Scraper Snapinsta...`);
        const form = new FormData();
        form.append("url", cleanUrl);
        form.append("action", "post");

        const res = await axios.post("https://snapinsta.top/action.php", form, {
            headers: {
                ...form.getHeaders(),
                "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
                "accept": "*/*",
                "origin": "https://snapinsta.top",
                "referer": "https://snapinsta.top/"
            }
        });

        const $ = cheerio.load(res.data);
        $(".download-items__btn a").each((_, el) => {
            let path = $(el).attr("href");
            if (!path) return;
            if (!path.startsWith("http")) path = "https://snapinsta.top" + path;
            downloadLinks.push(path);
        });

        if (downloadLinks.length > 0) success = true;
    } catch (e) {
        console.log("⚠️ [LOG] Snapinsta Gagal:", e.message);
    }

    // NEXRAY API
    if (!success) {
        try {
            console.log(`🔄 [IG] Mencoba Fallback Nexray API...`);
            let resApi = await axios.get(`https://api.nexray.eu.cc/downloader/v2/instagram?url=${encodeURIComponent(cleanUrl)}`);
            let data = resApi.data;

            if (data.status && data.result?.media?.length) {
                for (let item of data.result.media) {
                    downloadLinks.push(item.url);
                }
                success = true;
            }
        } catch (e) {
            console.log("⚠️ [LOG] Nexray API Gagal:", e.message);
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
                console.error('❌ [LOG] Gagal mengirim media:', errSend.message);
            }
        }
        console.log('✅ [LOG] Instagram berhasil diproses & dikirim!');
    } else {
        sock.sendMessage(from, { text: '❌ Gagal. Pastikan akun tidak di-private.' }, { quoted: msg });
    }
}

module.exports = handleInstagram;