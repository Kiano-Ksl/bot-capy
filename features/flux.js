// File: features/flux.js
const axios = require('axios');

async function handleFlux(sock, msg, from, sender, fullTextToSearch, command) {

    const regex = new RegExp(`^\\${command}\\s+`, 'i');
    const prompt = fullTextToSearch.replace(regex, '').trim();

    if (!prompt) {
        return sock.sendMessage(from, { 
            text: `🎨 *AI Image Generator*\n\n> Masukkan deskripsi gambar yang ingin dibuat.\n\n*Contoh:*\n> ${command} kucing oren memakai jas hujan di tengah badai neon bergaya anime` 
        }, { quoted: msg });
    }

    await sock.sendMessage(from, { react: { text: '🎨', key: msg.key } });
    await sock.sendMessage(from, { text: `⏳ *Menggambar:*\n_"${prompt}"_\n\nTunggu sebentar ya, AI sedang melukis...` }, { quoted: msg });

    try {
        console.log(`\n🎨 [FLUX] Memproses gambar untuk: ${prompt}`);
        const endpoint = `https://fast-flux-demo.replicate.workers.dev/api/generate-image?text=${encodeURIComponent(prompt)}`;

        const res = await axios.get(endpoint, {
            responseType: 'arraybuffer',
            validateStatus: () => true 
        });

        const contentType = res.headers['content-type'] || '';
        let imageToSend = null;

        if (contentType.includes('application/json')) {
            const jsonStr = Buffer.from(res.data).toString('utf-8');
            const j = JSON.parse(jsonStr);

            if (j.url) imageToSend = { url: j.url };
            else if (Array.isArray(j.images) && j.images.length) imageToSend = { url: j.images[0] };
            else if (j.image && typeof j.image === 'string') {
                if (j.image.startsWith('http')) {
                    imageToSend = { url: j.image };
                } else {
                    let b64 = j.image.replace(/^data:.*;base64,/, '');
                    imageToSend = Buffer.from(b64, 'base64');
                }
            } else {
                const maybe = j.output || j.result || j.data;
                if (maybe) {
                    if (typeof maybe === 'string' && maybe.startsWith('http')) imageToSend = { url: maybe };
                    else if (Array.isArray(maybe) && maybe.length) {
                        const first = maybe[0];
                        if (typeof first === 'string' && first.startsWith('http')) imageToSend = { url: first };
                        else if (typeof first === 'string' && first.startsWith('data:')) {
                            let b64 = first.replace(/^data:.*;base64,/, '');
                            imageToSend = Buffer.from(b64, 'base64');
                        }
                    }
                }
            }

            if (!imageToSend) throw new Error('Format JSON dari API tidak dikenali atau kosong.');

        } else if (contentType.startsWith('image/') || contentType === '') {
            // Jika API langsung membalas dengan file Gambar Murni
            imageToSend = res.data;
        } else {
            throw new Error('Response dari API bukan gambar atau JSON yang valid.');
        }

        const captionText = `✨ *Hasil AI:*\n> _${prompt}_`;

        if (Buffer.isBuffer(imageToSend)) {
            await sock.sendMessage(from, { image: imageToSend, caption: captionText }, { quoted: msg });
        } else {
            await sock.sendMessage(from, { image: { url: imageToSend.url }, caption: captionText }, { quoted: msg });
        }

        await sock.sendMessage(from, { react: { text: '✅', key: msg.key } });
        console.log(`✅ [LOG] Gambar Flux sukses dikirim!`);

    } catch (error) {
        console.error('[FLUX Error]', error.message);
        await sock.sendMessage(from, { react: { text: '❌', key: msg.key } });
        sock.sendMessage(from, { text: `❌ *Gagal menghasilkan gambar.*\n\nServer AI mungkin sedang sibuk atau deskripsi terlalu rumit. Coba lagi nanti!` }, { quoted: msg });
    }
}

module.exports = handleFlux;