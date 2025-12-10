const express = require("express");
const path = require("path");
const fs = require("fs");
const bodyParser = require("body-parser");
const { exec } = require("child_process");
const { v4: uuidv4 } = require("uuid");
const https = require("https");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(express.static("public"));

/*
========================================
  FUNGSI AUTO RESOLVE LINK TIKTOK
========================================
*/
function resolveTikTok(url) {
  return new Promise((resolve) => {
    try {
      https.get(url, (res) => {
        if (res.headers.location) {
          resolve(res.headers.location);
        } else {
          resolve(url);
        }
      }).on("error", () => resolve(url));
    } catch {
      resolve(url);
    }
  });
}

/*
========================================
  GET INFO (AUTO RESOLVE SHORT LINK)
========================================
*/
app.post("/api/info", async (req, res) => {
  let { url } = req.body;
  if (!url) return res.json({ success: false, message: "URL tidak ada" });

  url = await resolveTikTok(url); // FIX vt.tiktok.com → link asli

  const cmd = `yt-dlp -J --user-agent "Mozilla/5.0" "${url}"`;

  exec(cmd, { maxBuffer: 1024 * 1024 * 500 }, (err, stdout, stderr) => {
    if (err || stderr.includes("ERROR")) {
      return res.json({
        success: false,
        message: "Gagal ambil info video",
        debug: stderr
      });
    }

    const info = JSON.parse(stdout);

    // Resolusi anti dobel
    const uniqueFormats = {};
    info.formats.forEach(f => {
      if (f.height && !uniqueFormats[f.height]) {
        uniqueFormats[f.height] = { resolution: f.height + "p" };
      }
    });

    const formats = Object.values(uniqueFormats);

    // FOTO UNLIMITED
    const images = (info.thumbnails || [])
      .map(t => t.url)
      .filter(Boolean);

    res.json({
      success: true,
      title: info.title,
      thumbnail: info.thumbnail,
      formats,
      images
    });
  });
});

/*
========================================
  DOWNLOAD MP4 — AUTO RESOLVE SHORT LINK
========================================
*/
app.get("/download", async (req, res) => {
  let videoUrl = req.query.url;
  if (!videoUrl) return res.send("URL tidak ditemukan");

  videoUrl = await resolveTikTok(videoUrl); // FIX short link

  const filename = uuidv4() + ".mp4";
  const filepath = path.join(__dirname, filename);

  const command = `yt-dlp -f "bestvideo[ext=mp4]+bestaudio[ext=m4a]/mp4" \
  --merge-output-format mp4 \
  --user-agent "Mozilla/5.0" \
  -o "${filepath}" "${videoUrl}"`;

  exec(command, { maxBuffer: 1024 * 1024 * 500 }, (err) => {
    if (err) return res.send("Gagal download video");

    res.download(filepath, "video.mp4", () => fs.unlink(filepath, () => {}));
  });
});

/*
========================================
  DOWNLOAD MP3 — AUTO RESOLVE SHORT LINK
========================================
*/
app.get("/download-mp3", async (req, res) => {
  let videoUrl = req.query.url;
  if (!videoUrl) return res.send("URL tidak ditemukan");

  videoUrl = await resolveTikTok(videoUrl); // FIX short link

  const filename = uuidv4() + ".mp3";
  const filepath = path.join(__dirname, filename);

  const command = `yt-dlp -x --audio-format mp3 --audio-quality 0 \
  --user-agent "Mozilla/5.0" \
  -o "${filepath}" "${videoUrl}"`;

  exec(command, { maxBuffer: 1024 * 1024 * 300 }, () => {
    res.download(filepath, "audio.mp3", () => fs.unlink(filepath, () => {}));
  });
});

/*
========================================
  LOAD UI
========================================
*/
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
