const axios = require("axios");
const http = require("http");
const https = require("https");

const PATH_REGEX = /instagram\.com\/(p|reel|reels)\/([a-zA-Z0-9_-]+)/;

const httpsAgent = new https.Agent({
    rejectUnauthorized: false,
    keepAlive: true,
    timeout: 30000,
});

const httpAgent = new http.Agent({
    keepAlive: true,
    timeout: 30000,
});

function extractShortcode(url) {
    if (!url) return null;
    const match = url.match(PATH_REGEX);
    return match ? match[2] : null;
}

function extractPath(url) {
    if (!url) return 'p';
    const match = url.match(PATH_REGEX);
    const raw = match ? match[1] : 'p';
    return raw === 'reels' ? 'reel' : raw;
}

function extractEmbedData(html) {
    const handleMatch = html.match(/s\.handle\(\s*(\{.*?\})\s*\)\s*;/);
    if (!handleMatch) return null;

    const outer = JSON.parse(handleMatch[1]);
    const embedData = outer?.require?.[1]?.[3]?.[0];
    if (!embedData?.contextJSON) return null;

    const parsed = JSON.parse(embedData.contextJSON);
    const item = parsed?.gql_data?.shortcode_media;
    if (!item) return null;

    const user = item.owner || {};
    const caption = item.edge_media_to_caption?.edges?.[0]?.node?.text || item.caption || '';

    const resList = item.display_resources || [];
    const bestRes = resList.length > 0
        ? [resList.reduce((max, r) => ((r.config_width || 0) > (max.config_width || 0) ? r : max), resList[0])]
        : [];

    const thumbnails = bestRes.map(r => ({
        url: r.src || '',
        width: r.config_width || 0,
        height: r.config_height || 0,
    }));

    return {
        metadata: {
            id: item.id || '',
            code: item.shortcode || '',
            caption,
            createTime: item.taken_at ? new Date(item.taken_at * 1000).toLocaleString() : '',
            type: item.__typename || '',
            isVideo: !!item.is_video,
            isImage: !item.is_video && !item.video_url,
            videoViewCount: item.video_view_count || 0,
            likeCount: item.edge_liked_by?.count || 0,
            commentCount: item.edge_media_to_comment?.count || 0,
        },
        author: {
            id: user.id || '',
            username: user.username || 'N/A',
            fullName: user.full_name || '',
            profilePic: user.profile_pic_url || '',
            verified: !!user.is_verified,
            followerCount: user.edge_followed_by?.count || 0,
        },
        media: {
            thumbnail: item.display_url || '',
            thumbnails,
            videoUrl: item.video_url || '',
            videoResolution: item.video_url ? getResolution(item.video_url) : '',
        },
    };
}

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

    let bbox;
    try { bbox = JSON.parse(html.slice(start, end)); } catch { return null; }

    const xig = bbox?.__bbox?.result?.data?.xig_polaris_media;
    if (!xig) return null;
    return xig.if_not_gated_logged_out || xig;
}

function uniqueByUrl(arr) {
    const seen = new Set();
    return arr.filter(v => { const k = v.url; return seen.has(k) ? false : seen.add(k); });
}

function getResolution(url) {
    const m = url.match(/stp=.*?[ps](\d+)x(\d+)/);
    if (m) return `${m[1]}x${m[2]}`;
    const efg = url.match(/[?&]efg=([A-Za-z0-9_-]+)/);
    if (efg) {
        try {
            const json = JSON.parse(Buffer.from(efg[1], 'base64url').toString());
            const tag = json.vencode_tag || json.encode_tag || '';
            const rm = tag.match(/\.(\d{3,4})p?[._]/);
            if (rm) return `${rm[1]}x${rm[1]}`;
        } catch {}
    }
    return '';
}

function extractMetaData(html) {
    const getMeta = (prop) => {
        const reg = new RegExp(`<meta[^>]+property=[\"']${prop}[\"'][^>]+content=[\"]([^\"]+)[\"]`);
        const m = html.match(reg);
        return m ? m[1].replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#\d+;/g, '') : '';
    };

    const imageUrl = getMeta('og:image');
    if (!imageUrl) return null;

    const desc = getMeta('og:description');
    const usernameMatch = html.match(/instagram\.com\/([^\/\s\"']+)\/p\//);
    const username = usernameMatch ? usernameMatch[1] : 'N/A';

    const likeMatch = desc.match(/([\d,.]+)\s+likes/);
    const commentMatch = desc.match(/([\d,.]+)\s+comments/);

    let caption = desc;
    if (likeMatch || commentMatch) {
        const prefix = `${likeMatch?.[1] || '0'} likes, ${commentMatch?.[1] || '0'} comments - `;
        caption = desc.replace(prefix, '').trim();
    }

    return {
        metadata: {
            code: getMeta('og:url').match(/\/([a-zA-Z0-9_-]+)\/?$/)?.[1] || '',
            caption,
            type: 'GraphImage',
            isVideo: false,
            isImage: true,
            likeCount: likeMatch ? parseInt(likeMatch[1].replace(/,/g, '')) : 0,
            commentCount: commentMatch ? parseInt(commentMatch[1].replace(/,/g, '')) : 0,
        },
        author: { username },
        media: {
            thumbnail: imageUrl,
            thumbnails: [{ url: imageUrl, width: 0, height: 0 }],
            videoUrl: '',
        },
    };
}

function buildFallbackResult(data) {
    return {
        status: true,
        result: {
            metadata: {
                ...data.metadata,
                isImage: !data.metadata.isVideo
            },
            author: data.author,
            media: {
                total_slides: 1,
                slides: [{
                    slide_id: data.metadata.code,
                    index: 1,
                    images: data.media.thumbnails.length > 0
                        ? [data.media.thumbnails[0]].map(t => ({ url: t.url, resolution: getResolution(t.url) }))
                        : data.media.thumbnail
                            ? [{ url: data.media.thumbnail, resolution: '' }]
                            : [],
                    videos: data.media.videoUrl
                        ? [{ url: data.media.videoUrl, type: 'video/mp4' }]
                        : [],
                }],
            },
        },
    };
}

function buildVideoResult(raw, shortcode) {
    const versions = raw.video_versions || [];
    const user = raw.user || {};
    const captionObj = raw.caption || {};
    const caption = captionObj.text || raw.accessibility_caption || '';

    const thumbnails = (raw.image_versions2?.candidates || []).slice(0, 1).map(c => {
        const res = getResolution(c.url);
        const dims = res ? res.split('x') : [0, 0];
        return { url: c.url, width: +dims[0], height: +dims[1] };
    });

    return {
        status: true,
        result: {
            metadata: {
                id: raw.pk || '',
                code: raw.code || shortcode,
                caption,
                createTime: raw.taken_at ? new Date(raw.taken_at * 1000).toLocaleString() : '',
                type: raw.__typename || 'GraphVideo',
                isVideo: true,
                isImage: false,
                videoViewCount: raw.video_view_count || raw.play_count || 0,
                likeCount: raw.like_count || 0,
                commentCount: raw.comment_count || 0,
            },
            author: {
                id: user.pk || user.id || '',
                username: user.username || 'N/A',
                fullName: user.full_name || '',
                profilePic: user.profile_pic_url || '',
                verified: !!user.is_verified,
                followerCount: user.follower_count || user.edge_followed_by?.count || 0,
            },
            media: {
                thumbnail: raw.display_url || raw.display_uri || '',
                thumbnails,
                videos: uniqueByUrl(versions).map(v => ({
                    url: v.url, type: 'video/mp4', resolution: getResolution(v.url),
                })),
            },
        },
    };
}

function buildSlidesResult(raw) {
    const user = raw.user || {};
    const captionObj = raw.caption || {};
    const caption = captionObj.text || raw.accessibility_caption || '';
    const items = raw.carousel_media || [];

    if (!items.length) {
        const hi = raw.image_versions2?.candidates || [];
        // Ambil hanya 1 gambar beresolusi terbaik dari candidates
        const bestImage = hi.length > 0 ? [hi[0]] : [];
        
        return {
            status: true,
            result: {
                metadata: {
                    code: raw.code || '',
                    caption,
                    type: raw.__typename || '',
                    isVideo: raw.media_type === 2,
                    isImage: raw.media_type !== 2,
                    likeCount: raw.like_count || 0,
                    commentCount: raw.comment_count || 0,
                },
                author: { username: raw.user?.username || 'N/A' },
                media: {
                    total_slides: 1,
                    slides: [{
                        slide_id: raw.code || '',
                        index: 1,
                        images: bestImage.length
                            ? bestImage.map(c => ({ url: c.url, resolution: getResolution(c.url) }))
                            : raw.display_uri
                                ? [{ url: raw.display_uri, resolution: '' }]
                                : [],
                        videos: raw.video_versions?.length
                            ? uniqueByUrl(raw.video_versions).map(v => ({ url: v.url, type: 'video/mp4', resolution: getResolution(v.url) }))
                            : raw.video_url
                                ? [{ url: raw.video_url, type: 'video/mp4', resolution: getResolution(raw.video_url) }]
                                : [],
                    }],
                },
            },
        };
    }

    const slides = items.map((item, i) => {
        const iv2 = item.image_versions2?.candidates || [];
        // Ambil hanya resolusi terbesar (item pertama) per slide
        const bestImage = iv2.length > 0 ? [iv2[0]] : [];
        return {
            slide_id: item.code || item.pk || '',
            index: i + 1,
            images: bestImage.length
                ? bestImage.map(c => ({ url: c.url, resolution: getResolution(c.url) }))
                : item.display_uri
                    ? [{ url: item.display_uri, resolution: '' }]
                    : [],
            videos: uniqueByUrl(item.video_versions || []).map(v => ({ url: v.url, type: 'video/mp4', resolution: getResolution(v.url) })),
        };
    });

    return {
        status: true,
        result: {
            metadata: {
                id: raw.pk || '',
                code: raw.code || '',
                caption,
                createTime: raw.taken_at ? new Date(raw.taken_at * 1000).toLocaleString() : '',
                type: raw.__typename || '',
                isVideo: !!raw.is_video,
                isImage: !raw.is_video && !raw.video_url,
                likeCount: raw.like_count || 0,
                commentCount: raw.comment_count || 0,
            },
            author: {
                username: user.username || 'N/A',
                fullName: user.full_name || '',
                profilePic: user.profile_pic_url || '',
                verified: !!user.is_verified,
            },
            media: { total_slides: slides.length, slides },
        },
    };
}

function convertVideoToSlide(videoResult) {
    if (!videoResult.status || !videoResult.result) {
        return { status: false, error: 'Invalid video result' };
    }

    const data = videoResult.result;
    
    const allThumbnails = [];
    if (data.media.thumbnails && data.media.thumbnails.length > 0) {
        allThumbnails.push({
            url: data.media.thumbnails[0].url,
            resolution: `${data.media.thumbnails[0].width || 0}x${data.media.thumbnails[0].height || 0}`
        });
    } else if (data.media.thumbnail) {
        allThumbnails.push({
            url: data.media.thumbnail,
            resolution: data.media.videoResolution || ''
        });
    }
    
    const allVideos = [];
    if (data.media.videos && data.media.videos.length > 0) {
        allVideos.push(...data.media.videos);
    } else if (data.media.videoUrl) {
        allVideos.push({
            url: data.media.videoUrl,
            type: 'video/mp4',
            resolution: data.media.videoResolution || ''
        });
    }
    
    return {
        status: true,
        result: {
            metadata: {
                ...data.metadata,
                isImage: false
            },
            author: data.author,
            media: {
                total_slides: 1,
                slides: [{
                    slide_id: data.metadata.code || '',
                    index: 1,
                    images: allThumbnails,
                    videos: allVideos
                }]
            }
        }
    };
}

function createCookieJar() {
    let jar = '';

    function parseSetCookie(val) {
        return (val || '').split(',').map(c => c.split(';')[0].trim()).filter(Boolean).join('; ');
    }

    return {
        getCookies() { return jar; },
        setCookies(setCookie) { jar = parseSetCookie(setCookie); },
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
                    },
                    maxRedirects: 0,
                    timeout: 15000,
                });
                
                const setCookie = response.headers['set-cookie'];
                if (setCookie) {
                    this.setCookies(Array.isArray(setCookie) ? setCookie.join(', ') : setCookie);
                }
                return jar;
            } catch (error) {
                if (error.response && error.response.headers['set-cookie']) {
                    const setCookie = error.response.headers['set-cookie'];
                    this.setCookies(Array.isArray(setCookie) ? setCookie.join(', ') : setCookie);
                }
                throw error;
            }
        },
        async fetchWithProtocol(url, extra = {}) {
            try {
                console.log(`🌐 Trying HTTPS: ${url}`);
                const httpsUrl = url.replace(/^http:\/\//, 'https://');
                return await this.fetch(httpsUrl, { ...extra, agent: httpsAgent });
            } catch (error) {
                if (error.code === 'ECONNREFUSED' || 
                    error.code === 'ETIMEDOUT' ||
                    error.code === 'ENOTFOUND' ||
                    error.message.includes('certificate') ||
                    error.message.includes('SSL')) {
                    
                    console.log(`⚠️ HTTPS failed, trying HTTP: ${url}`);
                    const httpUrl = url.replace(/^https:\/\//, 'http://');
                    try {
                        return await this.fetch(httpUrl, { ...extra, agent: httpAgent });
                    } catch (httpError) {
                        console.log(`❌ HTTP also failed: ${httpError.message}`);
                        throw httpError;
                    }
                }
                throw error;
            }
        },
        async fetchWithRetry(url, extra = {}, maxRetries = 3, delay = 2000) {
            let lastError;
            let protocols = ['https', 'http'];
            
            for (let protocol of protocols) {
                for (let attempt = 1; attempt <= maxRetries; attempt++) {
                    try {
                        const protocolUrl = url.replace(/^https?:\/\//, `${protocol}://`);
                        console.log(`🔄 Attempt ${attempt}/${maxRetries} (${protocol}) for ${protocolUrl}`);
                        
                        const result = await this.fetch(protocolUrl, {
                            ...extra,
                            agent: protocol === 'https' ? httpsAgent : httpAgent
                        });
                        
                        if (result.status === 200 || result.status === 302) {
                            console.log(`✅ Success on attempt ${attempt} (${protocol})`);
                            return result;
                        }
                        
                        throw new Error(`HTTP ${result.status}`);
                    } catch (error) {
                        lastError = error;
                        
                        const isTimeout = error.code === 'ECONNABORTED' || 
                                          error.message.includes('timeout') ||
                                          error.message.includes('ETIMEDOUT');
                        
                        const isNetworkError = error.code === 'ENOTFOUND' || 
                                             error.code === 'ECONNREFUSED' ||
                                             error.code === 'ECONNRESET';
                        
                        const isSSLError = error.message.includes('certificate') ||
                                          error.message.includes('SSL') ||
                                          error.message.includes('self signed');
                        
                        if (isTimeout || isNetworkError || isSSLError) {
                            console.log(`⚠️ Attempt ${attempt} (${protocol}) failed: ${error.message}`);
                            if (attempt < maxRetries) {
                                const waitTime = delay * attempt;
                                console.log(`⏳ Retrying in ${waitTime}ms...`);
                                await new Promise(resolve => setTimeout(resolve, waitTime));
                                continue;
                            }
                        } else {
                            throw error;
                        }
                    }
                }
                
                if (protocol === 'https') {
                    console.log(`⚠️ All HTTPS attempts failed, trying HTTP...`);
                }
            }
            
            throw new Error(`Failed after ${maxRetries * 2} attempts: ${lastError.message}`);
        },
        async fetch(url, extra = {}) {
            const headers = {
                'User-Agent': extra.ua || 'Mozilla/5.0 (Linux; Android 15; 25028RN03A) AppleWebKit/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'same-origin',
                'Upgrade-Insecure-Requests': '1',
                ...(extra.headers || {}),
            };
            
            if (jar) headers.Cookie = jar;

            try {
                const response = await axios.get(url, {
                    headers,
                    timeout: extra.timeout || 30000,
                    maxRedirects: 0,
                    agent: extra.agent || httpsAgent,
                    ...(extra.signal ? { signal: extra.signal } : {}),
                });

                const setCookie = response.headers['set-cookie'];
                if (setCookie) {
                    this.setCookies(Array.isArray(setCookie) ? setCookie.join(', ') : setCookie);
                }

                return {
                    text: async () => response.data,
                    headers: response.headers,
                    status: response.status
                };
            } catch (error) {
                if (error.response) {
                    const setCookie = error.response.headers['set-cookie'];
                    if (setCookie) {
                        this.setCookies(Array.isArray(setCookie) ? setCookie.join(', ') : setCookie);
                    }
                    return {
                        text: async () => error.response.data,
                        headers: error.response.headers,
                        status: error.response.status
                    };
                }
                throw error;
            }
        },
    };
}

const instagram = {
    download: async (url, maxRetries = 3, delay = 2000) => {
        try {
            console.log('🔄 Auto detecting content type...');
            const videoResult = await instagram.video(url, maxRetries, delay);
            
            if (videoResult.status && videoResult.result.media.videoUrl) {
                console.log('📹 Content detected as Video');
                const converted = convertVideoToSlide(videoResult);
                
                const downloadUrls = {
                    thumbnail: converted.result.media.slides[0]?.images[0]?.url || null,
                    images: converted.result.media.slides[0]?.images || [],
                    videos: converted.result.media.slides[0]?.videos || []
                };
                
                return {
                    status: true,
                    result: {
                        ...converted.result,
                        downloadUrls,
                        isVideo: true,
                        isImage: false
                    }
                };
            }
            
            console.log('🖼️ No video found, trying as slide...');
            const slideResult = await instagram.slide(url, maxRetries, delay);
            
            if (slideResult.status) {
                const allImages = [];
                const allVideos = [];
                
                if (slideResult.result.media.slides) {
                    slideResult.result.media.slides.forEach(slide => {
                        if (slide.images) allImages.push(...slide.images);
                        if (slide.videos) allVideos.push(...slide.videos);
                    });
                }
                
                const downloadUrls = {
                    thumbnail: slideResult.result.media.thumbnail || null,
                    images: allImages,
                    videos: allVideos
                };
                
                return {
                    status: true,
                    result: {
                        ...slideResult.result,
                        downloadUrls,
                        isVideo: false,
                        isImage: true
                    }
                };
            }
            
            return { status: false, error: 'Failed to fetch content. Neither video nor slide found.' };
        } catch (error) {
            console.error('❌ Error in download:', error.message);
            return { status: false, error: error.message };
        }
    },

    video: async (url, maxRetries = 3, delay = 2000) => {
        const shortcode = extractShortcode(url);
        if (!shortcode) return { status: false, error: 'URL tidak valid atau shortcode tidak ditemukan.' };

        try {
            console.log('📹 Fetching video...');

            const ua = 'Mozilla/5.0 (Linux; Android 15; 25028RN03A) AppleWebKit/537.36';
            const jar = createCookieJar();
            const path = extractPath(url);

            const mainRes = await jar.fetchWithRetry(
                `https://www.instagram.com/${path}/${shortcode}/`,
                { ua },
                maxRetries,
                delay
            );
            let html = await mainRes.text();
            let raw = extractSlideData(html);

            if (!raw) {
                await jar.init(ua);
                const retryRes = await jar.fetchWithRetry(
                    `https://www.instagram.com/${path}/${shortcode}/`,
                    { ua },
                    maxRetries,
                    delay
                );
                html = await retryRes.text();
                raw = extractSlideData(html);
            }

            if (raw) {
                const vidData = buildVideoResult(raw, shortcode);
                if (vidData.result.media.videoUrl) return vidData;
            }

            const embedRes = await jar.fetchWithRetry(
                `https://www.instagram.com/${path}/${shortcode}/embed/captioned/`,
                { ua },
                maxRetries,
                delay
            );
            html = await embedRes.text();
            const data = extractEmbedData(html);
            if (!data) throw new Error('Data video tidak ditemukan.');
            if (!data.media.videoUrl) throw new Error('Post ini tidak memiliki video (bukan Reels).');
            data.media.videos = [{ url: data.media.videoUrl, type: 'video/mp4', resolution: getResolution(data.media.videoUrl) }];
            delete data.media.videoUrl;
            delete data.media.videoResolution;
            return { status: true, result: data };
        } catch (error) {
            console.error('❌ Error Main Process:', error.message);
            return { status: false, error: error.message };
        }
    },

    slide: async (url, maxRetries = 3, delay = 2000) => {
        const shortcode = extractShortcode(url);
        if (!shortcode) return { status: false, error: 'URL tidak valid atau shortcode tidak ditemukan.' };

        try {
            console.log('🖼️ Fetching slide...');

            const ua = 'Mozilla/5.0 (Linux; Android 15; 25028RN03A) AppleWebKit/537.36';
            const jar = createCookieJar();
            const path = extractPath(url);

            const mainRes = await jar.fetchWithRetry(
                `https://www.instagram.com/${path}/${shortcode}/?img_index=2`,
                { ua },
                maxRetries,
                delay
            );
            let html = await mainRes.text();
            let raw = extractSlideData(html);

            if (!raw) {
                await jar.init(ua);
                const retryRes = await jar.fetchWithRetry(
                    `https://www.instagram.com/${path}/${shortcode}/?img_index=2`,
                    { ua },
                    maxRetries,
                    delay
                );
                html = await retryRes.text();
                raw = extractSlideData(html);
            }

            if (!raw) {
                const embedRes = await jar.fetchWithRetry(
                    `https://www.instagram.com/${path}/${shortcode}/embed/captioned/`,
                    { ua },
                    maxRetries,
                    delay
                );
                html = await embedRes.text();
                let data = extractEmbedData(html);
                if (!data) {
                    const fallbackRes = await jar.fetchWithRetry(
                        `https://www.instagram.com/${path}/${shortcode}/`,
                        { ua },
                        maxRetries,
                        delay
                    );
                    html = await fallbackRes.text();
                    data = extractMetaData(html);
                }
                if (!data) throw new Error('Data slide tidak ditemukan.');
                return buildFallbackResult(data);
            }

            return buildSlidesResult(raw);
        } catch (error) {
            console.error('❌ Error Main Process:', error.message);
            return { status: false, error: error.message };
        }
    },
};

module.exports = { instagram };