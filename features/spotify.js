// File: features/spotify.js
const axios = require('axios');

function formatNumber(num) {
    return num?.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

async function handleSpotify(sock, msg, from, fullTextToSearch, command) {

    const regex = new RegExp(`^\\${command}\\s+`, 'i');
    const query = fullTextToSearch.replace(regex, '').trim();

    if (!query) {
        return sock.sendMessage(from, { text: `⚠️ Masukkan link Spotify atau judul lagu.\n\nContoh:\n${command} https://open.spotify.com/track/...\n${command} payung teduh` }, { quoted: msg });
    }

    const isLink = /open\.spotify\.com\/track/i.test(query);
    await sock.sendMessage(from, { text: `⏳ Sedang memproses Spotify ${isLink ? 'Link' : 'Search'}...` }, { quoted: msg });

    try {
        if (isLink) {

            console.log(`\n🔄 [SPOTIFY] Mengunduh via Link...`);
            const apiUrl = `https://api.nexray.eu.cc/downloader/spotify?url=${encodeURIComponent(query)}`;
            const res = await axios.get(apiUrl);
            const data = res.data;

            if (!data.status || !data.result || !data.result.url) throw new Error('Gagal mengambil lagu dari link');

            const { title, artist, url } = data.result;
            const filename = `${artist || "Spotify"} - ${title || "Audio"}.mp3`;

            await sock.sendMessage(from, {
                audio: { url: url },
                mimetype: "audio/mpeg",
                fileName: filename,
                ptt: false 
            }, { quoted: msg });

            console.log('✅ [LOG] Spotify Link sukses dikirim!');

        } else {

            console.log(`\n🔄 [SPOTIFY] Mencari judul lagu...`);
            const api = `https://api.nexray.web.id/downloader/spotifyplay?q=${encodeURIComponent(query)}`;
            const { data } = await axios.get(api);

            if (!data.status || !data.result) throw new Error('Lagu tidak ditemukan');

            const v = data.result;
            const caption = `
🎵 *𝗦𝗣𝗢𝗧𝗜𝗙𝗬* 🎵

👤 *Artist:* ${v.artist}
📝 *Title:* ${v.title}
💿 *Album:* ${v.album}
⏱️ *Duration:* ${v.duration}
🔥 *Popularity:* ${formatNumber(v.popularity)}
            `.trim();

            // Kirim Cover 
            await sock.sendMessage(from, {
                image: { url: v.thumbnail },
                caption: caption
            }, { quoted: msg });

            // Kirim  MP3
            await sock.sendMessage(from, {
                audio: { url: v.download_url },
                mimetype: 'audio/mpeg',
                fileName: v.title + '.mp3'
            }, { quoted: msg });

            console.log('✅ [LOG] Spotify Search & Audio sukses dikirim!');
        }
    } catch (error) {
        console.error("❌ [Spotify Error]", error.message);
        sock.sendMessage(from, { text: `❌ Terjadi kesalahan saat memproses Spotify. Lagu mungkin tidak ditemukan atau server sedang down.` }, { quoted: msg });
    }
}

module.exports = handleSpotify;