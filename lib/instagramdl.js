const axios = require("axios");
const http = require("http");
const https = require("https");

const PATH_REGEX = /instagram\.com\/(p|reel|reels)\/([a-zA-Z0-9_-]+)/;

const httpsAgent = new https.Agent({ rejectUnauthorized: false, keepAlive: true, timeout: 30000 });
const httpAgent = new http.Agent({ keepAlive: true, timeout: 30000 });

function extractShortcode(url) {
    const match = url ? url.match(PATH_REGEX) : null;
    return match ? match[2] : null;
}

function extractPath(url) {
    if (!url) return 'p';
    const match = url.match(PATH_REGEX);
    const raw = match ? match[1] : 'p';
    return raw === 'reels' ? 'reel' : raw;
}

function getResolution(url) {
    const m = url.match(/stp=.*?[ps](\d+)x(\d+)/);
    if (m) return `${m[1]}x${m[2]}`;
    return '';
}

function uniqueByUrl(arr) {
    const seen = new Set();
    return arr.filter(v => { const k = v.url; return seen.has(k) ? false : seen.add(k); });
}

// MESIN PENYAMARAN (SPOOFING) SEBAGAI MANUSIA
function createCookieJar() {
    let jar = '';
    return {
        getCookies() { return jar; },
        setCookies(setCookie) { 
            jar = (setCookie || '').split(',').map(c => c.split(';')[0].trim()).filter(Boolean).join('; '); 
        },
        async init(ua) {
            try {
                const response = await this.fetchWithProtocol('https://www.instagram.com/', {
                    headers: {
                        'User-Agent': ua,
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                        'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
                        'Sec-Fetch-Dest': 'document',
                        'Sec-Fetch-Mode': 'navigate',
                        'Sec-Fetch-Site': 'none',
                        'Sec-Fetch-User': '?1',
                        'Upgrade-Insecure-Requests': '1',
                    }
                });
                if (response.headers['set-cookie']) this.setCookies(response.headers['set-cookie'].join(', '));
                return jar;
            } catch (e) { return jar; }
        },
        async fetchWithProtocol(url, extra = {}) {
            try {
                return await this.fetch(url.replace(/^http:\/\//, 'https://'), { ...extra, agent: httpsAgent });
            } catch (error) {
                return await this.fetch(url.replace(/^https:\/\//, 'http://'), { ...extra, agent: httpAgent });
            }
        },
        async fetch(url, extra = {}) {
            const headers = {
                'User-Agent': extra.ua || 'Mozilla/5.0 (Linux; Android 15; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'same-origin',
                'Upgrade-Insecure-Requests': '1',
                ...(extra.headers || {}),
            };
            if (jar) headers.Cookie = jar;

            const response = await axios.get(url, {
                headers, timeout: 30000, maxRedirects: 0, agent: extra.agent || httpsAgent,
                validateStatus: (status) => status < 500 // Jangan panik kalau ada redirect
            });

            if (response.headers['set-cookie']) this.setCookies(response.headers['set-cookie'].join(', '));
            return { text: async () => response.data, headers: response.headers, status: response.status };
        }
    };
}

// EKSTRAKTOR DATA DARI DALAM KODE IG
function extractSlideData(html) {
    const idx = html.indexOf('"xig_polaris_media"');
    if (idx === -1) return null;
    const start = html.lastIndexOf('{"__bbox"', idx);
    if (start === -1) return null;
    let depth = 1, end = start + 8;
    for (; end < html.length; end++) {
        if (html[end] === '{') depth++;
        if (html[end] === '}') depth--;
        if (depth === 0) { end++; break; }
    }
    try { 
        const bbox = JSON.parse(html.slice(start, end));
        const xig = bbox?.__bbox?.result?.data?.xig_polaris_media;
        return xig ? (xig.if_not_gated_logged_out || xig) : null;
    } catch { return null; }
}

const instagram = {
    download: async (url) => {
        const shortcode = extractShortcode(url);
        if (!shortcode) return { status: false, error: 'URL tidak valid.' };

        try {
            console.log('🕵️‍♂️ Menyusup ke Instagram sebagai Android 15...');
            const ua = 'Mozilla/5.0 (Linux; Android 15; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';
            const jar = createCookieJar();
            const path = extractPath(url);

            // Inisialisasi pura-pura buka beranda IG dulu biar dikasih Cookie
            await jar.init(ua);

            // Langsung buka link target
            const res = await jar.fetchWithProtocol(`https://www.instagram.com/${path}/${shortcode}/`, { ua });
            const html = await res.text();
            
            const raw = extractSlideData(html);
            if (!raw) throw new Error("Gagal membedah kode sumber Instagram (Mungkin diprivate).");

            const caption = raw.caption?.text || raw.accessibility_caption || '';
            const isVideo = raw.media_type === 2 || !!raw.is_video;
            
            let downloadUrls = { videos: [], images: [] };

            // Jika Carousel / Slide
            if (raw.carousel_media && raw.carousel_media.length > 0) {
                raw.carousel_media.forEach(item => {
                    if (item.video_versions && item.video_versions.length > 0) {
                        downloadUrls.videos.push({ url: item.video_versions[0].url });
                    } else if (item.image_versions2?.candidates?.length > 0) {
                        downloadUrls.images.push({ url: item.image_versions2.candidates[0].url });
                    }
                });
            } else {
                // Jika Single Video / Photo
                if (isVideo && raw.video_versions && raw.video_versions.length > 0) {
                    downloadUrls.videos.push({ url: raw.video_versions[0].url });
                } else if (raw.image_versions2?.candidates?.length > 0) {
                    downloadUrls.images.push({ url: raw.image_versions2.candidates[0].url });
                }
            }

            return {
                status: true,
                result: {
                    author: raw.user?.username || 'Unknown',
                    caption: caption,
                    downloadUrls: downloadUrls,
                    isVideo: downloadUrls.videos.length > 0,
                    isImage: downloadUrls.images.length > 0
                }
            };
        } catch (error) {
            console.error('❌ Taktik Gagal:', error.message);
            return { status: false, error: error.message };
        }
    }
};

module.exports = { instagram };