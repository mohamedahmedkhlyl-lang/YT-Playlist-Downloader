const express = require('express');
const cors = require('cors');
const { exec, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// مجلد التنزيل المباشر
const downloadsFolder = path.join(os.homedir(), 'Downloads', 'playlist-downloader');
if (!fs.existsSync(downloadsFolder)) {
    fs.mkdirSync(downloadsFolder, { recursive: true });
}

// 1. جلب قائمة الفيديوهات
app.post('/api/playlist', (req, res) => {
    let { url } = req.body;
    if (!url) return res.status(400).json({ error: 'الرابط مطلوب' });

    const cmd = `yt-dlp --flat-playlist -j "${url}"`;

    exec(cmd, { maxBuffer: 1024 * 1024 * 20 }, (error, stdout) => {
        if (error) return res.status(500).json({ error: 'فشل جلب القائمة' });

        try {
            const lines = stdout.trim().split('\n').filter(Boolean);
            const videos = lines.map(line => {
                const item = JSON.parse(line);
                return {
                    title: item.title,
                    url: `https://www.youtube.com/watch?v=${item.id}`
                };
            });
            res.json({ videos });
        } catch (e) {
            res.status(500).json({ error: 'خطأ في معالجة البيانات' });
        }
    });
});

// 2. تنزيل سورة واحدة وتحويلها لـ MP3 أصلية مباشرة
app.post('/api/download-single', (req, res) => {
    const { video } = req.body;
    if (!video) return res.status(400).send('لا يوجد عنصر');

    const outputPath = path.join(downloadsFolder, '%(title)s.%(ext)s');
    
    // أمر تحويل MP3 المباشر من yt-dlp
    const args = [
        '-x', 
        '--audio-format', 'mp3', 
        '--audio-quality', '0', 
        '-o', outputPath, 
        video.url
    ];
    
    const child = spawn('yt-dlp', args);

    child.on('close', (code) => {
        if (code === 0) {
            res.json({ success: true });
        } else {
            res.status(500).json({ error: 'حدث خطأ أثناء تنزيل الملف' });
        }
    });
});

const PORT = 3000;
app.listen(PORT, () => console.log(`http://localhost:${PORT}`));

