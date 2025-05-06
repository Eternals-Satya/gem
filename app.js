const express = require('express');
const multer = require('multer');
const fs = require('fs');
const axios = require('axios');
const path = require('path');
require('dotenv').config();

const app = express();
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

const storage = multer.memoryStorage();
const upload = multer({ storage });

function randomName(ext = ".png") {
    return [...Array(10)].map(() => Math.random().toString(36)[2]).join('') + ext;
}

app.get('/', (req, res) => {
    res.render('index', { imagePath: null, error: null });
});

app.post('/generate', upload.single('image'), async (req, res) => {
    const prompt = req.body.prompt || '';
    const apiKey = process.env.GEMINI_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp-image-generation:generateContent?key=${apiKey}`;
    const headers = { 'Content-Type': 'application/json' };

    let parts = [{ text: prompt }];
    if (req.file) {
        const b64 = req.file.buffer.toString('base64');
        parts.push({
            inline_data: {
                mime_type: req.file.mimetype,
                data: b64
            }
        });
    }

    const body = {
        contents: [{ parts }],
        generationConfig: { responseModalities: ["TEXT", "IMAGE"] }
    };

    try {
        const result = await axios.post(url, body, { headers });
        const base64Img = result.data.candidates[0].content.parts.find(p => p.inlineData).inlineData.data;
        const buffer = Buffer.from(base64Img, 'base64');
        const filename = randomName();
        const filepath = path.join(__dirname, 'public', 'images', filename);
        fs.writeFileSync(filepath, buffer);
        res.render('index', { imagePath: `/images/${filename}`, error: null });
    } catch (err) {
        res.render('index', { imagePath: null, error: "Gagal menghasilkan gambar: " + err.message });
    }
});

app.listen(3000, () => console.log("GGA Web running on http://localhost:3000"));
