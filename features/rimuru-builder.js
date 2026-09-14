// File: features/rimuru-builder.js
'use strict';

const VERSION = '4.6';

// Baileys
const { generateWAMessageFromContent, prepareWAMessageMedia } = require('@whiskeysockets/baileys');
const crypto = require('crypto');
const sharp = require('sharp');
const ffmpeg = require('fluent-ffmpeg');
const { PassThrough, Readable } = require('stream');

function extractIE(text, { extract = true, hyperlink = true, citation = true, latex = true } = {}) {
    if (!extract) return { text, ie: [], inline_entities: [] };

    const createIE = (type, ie) => {
        if (type == 'hyperlink') {
            return { key: ie.key, metadata: { display_name: ie.text, is_trusted: ie.is_trusted, url: ie.url, __typename: 'GenAIInlineLinkItem' } };
        }
        if (type == 'citation') {
            return { key: ie.key, metadata: { reference_id: ie.reference_id, reference_url: ie.url, reference_title: ie.url, reference_display_name: ie.url, sources: [], __typename: 'GenAISearchCitationItem' } };
        }
        if (type == 'latex') {
            return { key: ie.key, metadata: { latex_expression: ie.text, latex_image: { url: ie.url, width: Number(ie.width) || 100, height: Number(ie.height) || 100 }, font_height: Number(ie.font_height) || 83.333333333333, padding: Number(ie.padding) || 15, __typename: 'GenAILatexItem' } };
        }
    };

    let ie = [], inline_entities = [], result = '', last = 0, citation_index = 1, hyperlink_index = 0, latex_index = 0, stack = [];

    for (let i = 0; i < text.length; i++) {
        if (text[i] == '[' && text[i - 1] != '\\') {
            stack.push(i);
        } else if (text[i] == ']' && (text[i + 1] == '(' || text[i + 1] == '<')) {
            let start = stack.pop();
            if (start == null) continue;

            let open = text[i + 1], close = open == '(' ? ')' : '>', type = open == '(' ? 'link' : 'latex', end = i + 2, depth = 1;

            while (end < text.length && depth) {
                if (text[end] == open && text[end - 1] != '\\') depth++;
                else if (text[end] == close && text[end - 1] != '\\') depth--;
                end++;
            }

            if (depth) continue;

            let raw = text.slice(start + 1, i).trim();
            let url = text.slice(i + 2, end - 1).trim();
            let key, tag, data;

            if (type == 'latex') {
                if (!latex) continue;
                let [txt = '', width = null, height = null, font_height = null, padding = null] = raw.split('|');
                key = `NIXEL_LATEX_${latex_index++}`;
                tag = `{{${key}}}${txt || 'image'}{{/${key}}}`;
                data = { type: 'latex', ie: { key, text: txt, url, width, height, font_height, padding } };
            } else if (raw) {
                if (!hyperlink) continue;
                const trusted = !url.startsWith('!');
                if (!trusted) url = url.slice(1);
                key = `NIXEL_HYPERLINK_${hyperlink_index++}`;
                tag = `{{${key}}}${url}{{/${key}}}`;
                data = { type: 'hyperlink', ie: { key, text: raw, url, is_trusted: trusted } };
            } else {
                if (!citation) continue;
                key = `NIXEL_CITATION_${citation_index - 1}`;
                tag = `{{${key}}}${url}{{/${key}}}`;
                data = { type: 'citation', ie: { reference_id: citation_index++, key, text: '', url } };
            }

            result += text.slice(last, start) + tag;
            last = end;
            ie.push(data);
            const entity = createIE(data.type, data.ie);
            if (entity) inline_entities.push(entity);
            i = end - 1;
        }
    }
    result += text.slice(last);
    return { text: result, ie, inline_entities };
}

async function waitAllPromises(input) {
    const isPromise = (v) => v && typeof v.then === 'function';
    const isObject = (v) => v && typeof v === 'object';

    const deep = async (v) => {
        if (isPromise(v)) return deep(await v);
        if (Array.isArray(v)) return Promise.all(v.map(deep));
        if (isObject(v)) {
            const entries = await Promise.all(Object.entries(v).map(async ([k, val]) => [k, await deep(val)]));
            return Object.fromEntries(entries);
        }
        return v;
    };
    return deep(await input);
}

class Toolkit {
    static extractIE(text, { extract = true, hyperlink = true, citation = true, latex = true } = {}) {
        return extractIE(text, { extract, hyperlink, citation, latex });
    }
    static async resize(buffer, x, y, fit = 'cover') {
        return await sharp(buffer).resize(x, y, { fit, position: 'center', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
    }
    static async waitAllPromises(input) { return await waitAllPromises(input); }
    static async fetchBuffer(url, options = {}, { silent = true } = {}) {
        try {
            let response = await fetch(url, options);
            if (!response.ok) throw Error(`HTTP ${response.status}`);
            return Buffer.from(await response.arrayBuffer());
        } catch (error) {
            if (silent) return Buffer.alloc(0);
            throw error;
        }
    }
    static async toUrl(_client, path, mediaType = 'document') {
        if (!path) throw new Error('Url or buffer needed');
        const media = await prepareWAMessageMedia({ [mediaType]: Buffer.isBuffer(path) ? path : { url: path } }, { upload: _client.waUploadToServer, jid: '@newsletter' });
        return Object.values(media)[0]?.url;
    }
    static async resolveMedia(_client, media, mediaType = 'image', { resolveUrl = false, resolveWAUrl = false, result = 'url', resize = false, width = 300, height = 300 } = {}) {
        const isUrl = (str) => /^https?:\/\/.+/i.test(str);
        const isWAUrl = (str) => /^https?:\/\/[^/]*\.whatsapp\.net\//i.test(str);

        if (Array.isArray(media)) {
            return Promise.all(media.map((item) => Toolkit.resolveMedia(_client, item, mediaType, { resolveUrl, resolveWAUrl, result, resize, width, height })));
        }

        const originalIsBuffer = Buffer.isBuffer(media);

        if (typeof media === 'string' && isUrl(media)) {
            if (isWAUrl(media) && resolveWAUrl) media = await Toolkit.fetchBuffer(media, {}, { silent: true });
            else if (!resolveUrl && result !== 'url') media = await Toolkit.fetchBuffer(media, {}, { silent: true });
            else if (resolveUrl) media = await Toolkit.fetchBuffer(media, {}, { silent: true });
            else if (result === 'url') return media;
        }

        if (typeof media === 'string' && !isUrl(media)) media = Buffer.from(media, 'base64');
        if (!Buffer.isBuffer(media) || !media.length) return;
        if (resize && Buffer.isBuffer(media)) media = await Toolkit.resize(media, width, height);
        if (result === 'buffer') return media;
        if (result === 'base64') return media.toString('base64');
        return Toolkit.toUrl(_client, media, mediaType);
    }
    static getMp4Duration(buffer, { silent = true } = {}) { return 0; /* Dipersingkat agar muat */ }
    static getMp4Preview(videoBuffer, { time, result = 'buffer', resize = true, width = 300, height = 300, silent = true } = {}) {
        return new Promise((resolve) => resolve(Buffer.alloc(0))); /* Dipersingkat agar muat */
    }
}

class BaseBuilder {
    constructor() {
        this._title = ''; this._subtitle = ''; this._body = ''; this._footer = ''; this._contextInfo = {}; this._extraPayload = {};
    }
    setTitle(title) { this._title = title; return this; }
    setSubtitle(subtitle) { this._subtitle = subtitle; return this; }
    setBody(body) { this._body = body; return this; }
    setFooter(footer) { this._footer = footer; return this; }
    setContextInfo(obj) { this._contextInfo = obj; return this; }
    addPayload(obj) { Object.assign(this._extraPayload, obj); return this; }
}

class AIRich extends BaseBuilder {
    #client;
    constructor(client) {
        if (!client) throw new Error('Socket is required');
        super();
        this.#client = client;
        this._contextInfo = {};
        this._submessages = [];
        this._sections = [];
        this._richResponseSources = [];
    }
    addSubmessage(submessage) {
        const items = Array.isArray(submessage) ? submessage : [submessage];
        for (const item of items) this._submessages.push(item);
        return this;
    }
    addSection(section) {
        const items = Array.isArray(section) ? section : [section];
        for (const item of items) this._sections.push(item);
        return this;
    }
    addText(text, { hyperlink = true, citation = true, latex = true } = {}) {
        const { text: extractedText, inline_entities } = extractIE(text, { hyperlink, citation, latex });
        this._submessages.push({ messageType: 2, messageText: extractedText });
        this._sections.push(AIRich.newLayout('Single', { text: extractedText, ...(inline_entities.length && { inline_entities }), __typename: 'GenAIMarkdownTextUXPrimitive' }));
        return this;
    }
    addCode(language, code) {
        const meta = AIRich.tokenizer(code, language);
        this._submessages.push({ messageType: 5, codeMetadata: { codeLanguage: language, codeBlocks: meta.codeBlock } });
        this._sections.push(AIRich.newLayout('Single', { language, code_blocks: meta.unified_codeBlock, __typename: 'GenAICodeUXPrimitive' }));
        return this;
    }
    addTable(table, { hyperlink = true, citation = true, latex = true } = {}) {
        const meta = AIRich.toTableMetadata(table, { hyperlink, citation, latex });
        this._submessages.push({ messageType: 4, tableMetadata: { title: meta.title, rows: meta.rows } });
        this._sections.push(AIRich.newLayout('Single', { rows: meta.unified_rows, __typename: 'GenATableUXPrimitive' }));
        return this;
    }
    async build({ forwarded = true, notification = false, includesUnifiedResponse = true, includesSubmessages = true, quoted, quotedParticipant, ...options } = {}) {
        const forward = forwarded ? { forwardingScore: 1, isForwarded: true, forwardedAiBotMessageInfo: { botJid: '0@bot' }, forwardOrigin: 4 } : {};
        const notif = notification ? { sessionTransparencyMetadata: { disclaimerText: 'Bot Capy AI', hcaId: `hca_${Date.now()}`, sessionTransparencyType: 1 } } : {};
        const qObj = quoted ? { stanzaId: quoted?.key?.id || quoted?.id, participant: quotedParticipant || quoted?.key?.participant || quoted?.key?.remoteJid, quotedType: 0, quotedMessage: typeof quoted === 'object' && quoted !== null ? (quoted.message ?? quoted) : undefined } : {};
        const sections = this._footer ? [...(await waitAllPromises(this._sections)), AIRich.newLayout('Single', { text: this._footer, __typename: 'GenAIMetadataTextPrimitive' })] : [...(await waitAllPromises(this._sections))];

        return {
            messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2, botMetadata: { messageDisclaimerText: this._title, richResponseSourcesMetadata: { sources: this._richResponseSources }, ...notif } },
            ...this._extraPayload,
            botForwardedMessage: {
                message: {
                    richResponseMessage: {
                        messageType: 1,
                        submessages: includesSubmessages ? await waitAllPromises(this._submessages) : [],
                        unifiedResponse: { data: includesUnifiedResponse ? Buffer.from(JSON.stringify({ response_id: crypto.randomUUID(), sections })).toString('base64') : '' },
                        contextInfo: { ...forward, ...qObj, ...this._contextInfo }
                    }
                }
            }
        };
    }
    async send(jid, { forwarded, notification, includesUnifiedResponse, includesSubmessages, ...options } = {}) {
        const msg = await this.build({ forwarded, notification, includesUnifiedResponse, includesSubmessages, ...options });
        return await this.#client.relayMessage(jid, msg, { ...options });
    }
    static tokenizer(code, lang = 'javascript') {
        return {
            codeBlock: [{ codeContent: code, highlightType: 0 }],
            unified_codeBlock: [{ content: code, type: 'DEFAULT' }]
        }; 
    }
    static toTableMetadata(arr, { hyperlink = true, citation = true, latex = true } = {}) {
        const [header, ...rows] = arr;
        const maxLen = Math.max(header.length, ...rows.map((r) => r.length));
        const normalize = (r) => [...r, ...Array(maxLen - r.length).fill('')];

        const unified_rows = [
            { is_header: true, cells: normalize(header) },
            ...rows.map((r) => ({ is_header: false, cells: normalize(r) }))
        ].map((row) => {
            const markdown_cells = row.cells.map((cell) => {
                const extracted = extractIE(cell, { hyperlink, citation, latex });
                return { text: extracted.text, ...(extracted.inline_entities.length ? { inline_entities: extracted.inline_entities } : {}) };
            });
            return { ...row, ...(markdown_cells.some((c) => c.inline_entities?.length) ? { markdown_cells } : {}) };
        });

        const rowsMeta = unified_rows.map((r) => ({ items: r.cells, ...(r.is_header ? { isHeading: true } : {}) }));
        return { title: '', rows: rowsMeta, unified_rows };
    }
    static newLayout(name, data, extra = {}) {
        return { ...extra, view_model: { [Array.isArray(data) ? 'primitives' : 'primitive']: data, __typename: `GenAI${name}LayoutViewModel` } };
    }
}

module.exports = { VERSION, AIRich, Toolkit };