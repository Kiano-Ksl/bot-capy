const axios = require("axios");

// ==========================================
// 1. MESIN SCRAPER (API AZBRY - RIMURU MD)
// ==========================================
async function instagramDownloader(url) {
    const endpoint = "https://api.azbry.com/api/download/instagramv2";
    const response = await axios.get(endpoint, {
        params: { url: url },
        headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
    });

    const data = response.data;
    if (!data || !data.status || !Array.isArray(data.links) || data.links.length === 0) {
        throw new Error("Gagal mengambil media dari API Instagram (Mungkin akun Private)");
    }

    const media = data.links.map((item) => {
        const itemType = String(item.type || "").toLowerCase();
        const itemUrl = String(item.url || "").toLowerCase();
        const isVideo = itemType === "video" || itemType === "mp4" || itemUrl.includes(".mp4");
        return {
            type: isVideo ? "video" : "image",
            url: item.url,
            thumbnail: item.thumbnail || "",
        };
    });

    const firstLink = data.links[0] || {};
    const captionText = firstLink.text && firstLink.text !== "null" ? firstLink.text.trim() : "";
    const authorName = data.author && data.author !== "Unknown" ? data.author : "-";
    const thumbUrl = firstLink.thumbnail || data.thumbnail || "";

    return {
        status: true,
        username: authorName,
        title: captionText || authorName,
        caption: captionText,
        thumbnail: thumbUrl,
        avatar: data.avatar || "",
        media: media,
    };
}

// ==========================================
// 2. JEMBATAN PENGHUBUNG (HANDLER WA)
// ==========================================
const IG_REGEX = /instagram\.com\/(p|reel|reels|stories|tv)\//i;

async function handleInstagram(sock, msg, from, fullTextToSearch) {
    // Ekstrak link dari pesan
    const urlRegex = /(https?:\/\/[^\s]+)/g; 
    const links = fullTextToSearch.match(urlRegex);
    const url = links ? links.find(l => l.includes('instagram')) : null;

    if (!url) {
        return sock.sendMessage(from, { text: '⚠️ Kirimkan link Instagram (Reel/Post/Story) yang valid.' }, { quoted: msg });
    }

    if (!IG_REGEX.test(url)) {
        return sock.sendMessage(from, { text: '❌ URL tidak valid. Gunakan link Instagram (reel/post/story).' }, { quoted: msg });
    }

    await sock.sendMessage(from, { text: '⏳ Sedang mengunduh media dari Instagram...' }, { quoted: msg });

    try {
        // Menyalakan mesin
        const result = await instagramDownloader(url);

        if (!result?.media?.length) {
            return sock.sendMessage(from, { text: '❌ Gagal mengambil media. Pastikan akun tidak di-private.' }, { quoted: msg });
        }

        const isStory = url.includes("/stories/");
        let caption = `📸 *Instagram ${isStory ? "Story" : "Downloader"}*\n\n`;
        if (result.username && result.username !== "-") {
            caption += `👤 *Author*: @${result.username}\n`;
        }
        if (result.caption) {
            caption += `📝 *Caption*:\n${result.caption}\n`;
        }
        caption = caption.trim();

        // Mengirimkan hasil satu per satu (mendukung postingan multi-slide)
        for (const item of result.media) {
            if (item.type === "video" || item.type === "mp4") {
                await sock.sendMessage(
                    from,
                    { video: { url: item.url }, caption: caption },
                    { quoted: msg }
                );
            } else {
                await sock.sendMessage(
                    from,
                    { image: { url: item.url }, caption: caption },
                    { quoted: msg }
                );
            }
            // Kosongkan caption untuk slide ke-2 dan seterusnya agar tidak spam teks
            caption = "";
        }

    } catch (err) {
        console.error('❌ Error IG:', err.message);
        return sock.sendMessage(from, { text: `❌ *Gagal Mengunduh*\n\n> Server sedang sibuk atau link tidak valid.` }, { quoted: msg });
    }
}

module.exports = handleInstagram;