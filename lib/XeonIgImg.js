const axios = require('axios');
const cheerio = require('cheerio');

async function XeonIgImg(match) {
    const result = [];
    const form = { url: match, submit: '' };
    try {
        const { data } = await axios.post(`https://downloadgram.org/`, form);
        const $= cheerio.load(data);$('#downloadhere > a').each(function (a, b) {
            const url = $(b).attr('href');
            if (url) result.push(url);
        });
    } catch (e) {
        console.error("XeonIgImg Error:", e.message);
    }
    return result;
}

module.exports.XeonIgImg = XeonIgImg;