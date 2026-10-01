// File: features/instagram.js
const axios = require("axios");
const FormData = require("form-data");
const cheerio = require("cheerio");

// Fungsi mencari link IG dari pesan
function extractLink(textToParse) {
    const urlRegex = /(https?:\/\/[^\s]+)/g; 
    const links = textToParse.match(urlRegex);
    return links ? links.find(l => l.includes('instagram')) : null;
}

// Mesin Scraper (SnapInsta Top) dari SC yang kamu kirim
async function igdl(url) {
    const form = new FormData();
    form.append("url", url);
    form.append("action", "post");

    const res = await axios.post("https://snapinsta.top/action.php", form, {
        headers: {
            ...form.getHeaders(),
            "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Mobile Safari/537.36",
            "accept": "*/*",
            "origin": "https://snapinsta.top",
            "referer": "https://snapinsta.top/"
        }
    });

    const $ = cheerio.load(res.data);
    const downloads = [];

    $(".download-items__btn a").each((_, el) => {
        let path = $(el).attr("href");
        if (!path) return;
        if (!path.startsWith("http")) path = "https://snapinsta.top" + path;
        downloads.push(path);
    });

    return {
        status: downloads.length ? 200 : 404,
        download: downloads
    };
}

// Jembatan Penghubung Bot (Handler)
async function handleInstagram(sock, msg, from, fullTextToSearch) {
    const url = extractLink(fullTextToSearch);
    if (!url) return sock.sendMessage(from, { text: '⚠️ Link Instagram tidak valid.' }, { quoted: msg });

    await sock.sendMessage(from, { text: '⏳ Mengunduh menggunakan SC baru (SnapInsta)...' }, { quoted: msg });

    try {
        console.log(`🔄 [IG] Mencoba SC SnapInsta...`);
        let res = await igdl(url);

        if (res.status !== 200 || !res.download.length) {
            throw new Error("Tidak ada media yang ditemukan.");
        }

        // SC aslinya mendownload dalam bentuk Buffer, kita ikuti persis
        for (let vidUrl of res.download) {
            let buf = (await axios.get(vidUrl, { responseType: "arraybuffer" })).data;
            buf = Buffer.from(buf);

            // Cek kode unik di awal file: jika "ftyp" berarti formatnya MP4 (Video)
            if (buf.slice(4, 8).toString() === "ftyp") {
                await sock.sendMessage(from, { video: buf, caption: '✅ SC Baru Berhasil!' }, { quoted: msg });
            } else {
                await sock.sendMessage(from, { image: buf, caption: '✅ SC Baru Berhasil!' }, { quoted: msg });
            }
        }
        
        console.log(`✅ [IG] SC Baru Berhasil dikirim!`);

    } catch (e) {
        console.log(`❌ [IG] SC Baru Gagal:`, e.message);
        await sock.sendMessage(from, { text: `❌ SC Baru Gagal: ${e.message}\n(Ini biasanya karena diblokir oleh pihak webnya)` }, { quoted: msg });
    }
}

module.exports = handleInstagram;