const axios = require('axios');

async function handleInstagram(sock, msg, from, fullTextToSearch) {
    const urlRegex = /(https?:\/\/[^\s]+)/g; 
    const links = fullTextToSearch.match(urlRegex);
    const url = links ? links.find(l => l.includes('instagram')) : null;

    if (!url) return sock.sendMessage(from, { text: '⚠️ Link Instagram tidak ditemukan! Kirim linknya.' }, { quoted: msg });
    
    const cleanUrl = url.split('?')[0]; 
    await sock.sendMessage(from, { text: '⏳ Sedang mengunduh media, mohon tunggu sebentar...' }, { quoted: msg });
    
    let downloadLinks = [];
    const TIMEOUT_MS = 20000;

    // API 1: AEMT
    try {
        let res = await axios.get(`https://aemt.me/download/igdl?url=${encodeURIComponent(cleanUrl)}`, { timeout: TIMEOUT_MS });
        if (res.data && res.data.result) {
            let items = Array.isArray(res.data.result) ? res.data.result : [res.data.result];
            items.forEach(item => { if (item.url) downloadLinks.push(item.url) });
        }
    } catch (e) { console.log("API 1 Gagal"); }

    // API 2: TIKWMA
    if (downloadLinks.length === 0) {
        try {
            let res = await axios.get(`https://api.tiklydown.eu.org/api/download/ig?url=${encodeURIComponent(cleanUrl)}`, { timeout: TIMEOUT_MS });
            if (res.data && res.data.length > 0) {
                res.data.forEach(item => { if (item.url) downloadLinks.push(item.url) });
            }
        } catch (e) { console.log("API 2 Gagal"); }
    }

    // API 3: BETABOTZ
    if (downloadLinks.length === 0) {
        try {
            let res = await axios.get(`https://api.betabotz.eu.org/api/download/igdowloader?url=${encodeURIComponent(cleanUrl)}&apikey=BetaBotz`, { timeout: TIMEOUT_MS });
            if (res.data && res.data.result && res.data.result.message) {
                res.data.result.message.forEach(item => { if (item.url) downloadLinks.push(item.url) });
            }
        } catch (e) { console.log("API 3 Gagal"); }
    }

    // PROSES PENGIRIMAN
    if (downloadLinks.length > 0) {
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
                console.error('❌ Gagal kirim media');
            }
        }
    } else {
        sock.sendMessage(from, { text: '❌ Maaf, semua server API sedang down. Coba beberapa jam lagi.' }, { quoted: msg });
    }
}

module.exports = handleInstagram;