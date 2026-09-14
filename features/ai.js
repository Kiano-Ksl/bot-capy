// File: features/ai.js
const gemini = require('./gemini');
const { AIRich } = require('./rimuru-builder');

const sessions = {};

const systemPrompt = `Kamu adalah asisten AI yang cerdas dan canggih (Bot Capy AI).
Gunakan format markdown secara ketat:
1. Jika membuat daftar perbandingan atau sekumpulan data, SELALU gunakan format tabel markdown (diawali dan diakhiri dengan '|').
2. Jika memberikan kode pemrograman, SELALU bungkus dengan markdown code block (\`\`\`bahasa ... \`\`\`).
3. Gunakan formatting teks tebal (*teks*) untuk menekankan sesuatu, atau hashtag (#) untuk judul / penjelas besar.
Pastikan semua respon terstruktur dengan baik agar sistem AIRich dapat merendernya dengan cantik.`;

async function handleAi(sock, msg, from, sender, fullTextToSearch, command) {
    const regex = new RegExp(`^\\${command}\\s+`, 'i');
    const text = fullTextToSearch.replace(regex, '').trim();

    if (!text) {
        return sock.sendMessage(from, { 
            text: `🤖 *Bot Capy AI*\n\n> Halo! Aku asisten cerdas yang bisa membuat Tabel Native.\n\n*Cara penggunaan:*\n> ${command} <pertanyaan>\n\n*Contoh:*\n> ${command} buatkan tabel perbandingan vue dan react` 
        }, { quoted: msg });
    }

    await sock.sendMessage(from, { react: { text: '🕕', key: msg.key } });
    console.log(`\n🤖 [LOG] Memproses permintaan AI dari ${sender.split('@')[0]}...`);

    const sessionId = sessions[sender] || null;

    try {
        const result = await gemini({
            message: text,
            instruction: systemPrompt,
            sessionId: sessionId
        });

        if (result && result.sessionId) {
            sessions[sender] = result.sessionId; // Menyimpan ingatan
        }

        const replyText = result.text || '';
        
        // Panggil Si Tukang Kayu UI (AIRich) dan masukkan sock WhatsApp kita
        const aiRich = new AIRich(sock);

        const lines = replyText.split('\n');
        let currentTable = [];
        let currentCode = [];
        let inCode = false;
        let codeLang = '';
        let textBuffer = [];

        const flushText = () => {
            if (textBuffer.length > 0) {
                aiRich.addText(textBuffer.join('\n').trim());
                textBuffer = [];
            }
        };

        const flushTable = () => {
            if (currentTable.length > 0) {
                const tableData = currentTable.map(line => {
                    return line.split('|').map(c => c.trim()).filter((_, i, arr) => i !== 0 && i !== arr.length - 1);
                });
                const filteredTableData = tableData.filter(row => !row.every(c => /^[-:]+$/.test(c)));

                if (filteredTableData.length > 0 && filteredTableData.every(row => row.length > 0)) {
                    aiRich.addTable(filteredTableData); // Memicu UI Tabel Asli WA!
                } else {
                    aiRich.addText(currentTable.join('\n'));
                }
                currentTable = [];
            }
        };

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            if (line.trim().startsWith('```')) {
                if (!inCode) {
                    flushText();
                    flushTable();
                    inCode = true;
                    codeLang = line.trim().substring(3).trim() || 'text';
                } else {
                    inCode = false;
                    aiRich.addCode(codeLang, currentCode.join('\n'));
                    currentCode = [];
                }
                continue;
            }

            if (inCode) {
                currentCode.push(line);
                continue;
            }

            if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
                flushText();
                currentTable.push(line.trim());
                continue;
            }

            flushTable();
            textBuffer.push(line);
        }

        flushText();
        flushTable();

        // Kirim Payload Native UI
        await aiRich.send(from, { quoted: msg });
        
        // Reaction Selesai
        await sock.sendMessage(from, { react: { text: '✅', key: msg.key } });
        console.log(`✅ [LOG] AI Native berhasil dikirim!`);

    } catch (error) {
        console.error('[AI Error]', error);
        await sock.sendMessage(from, { react: { text: '☢️', key: msg.key } });
        return sock.sendMessage(from, { text: `❌ Maaf, AI sedang mengalami gangguan saat merakit respon.` }, { quoted: msg });
    }
}

module.exports = handleAi;