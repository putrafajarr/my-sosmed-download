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
  AUTO RESOLVE SHORT LINK (TikTok vt.tiktok)
========================================
*/
function autoResolve(url) {
  return new Promise((resolve) => {
    try {
      https.get(url, (res) => {
        const loc = res.headers.location;
        if (loc) resolve(loc);
        else resolve(url);
      }).on("error", () => resolve(url));
    } catch {
      resolve(url);
    }
  });
}

/*
========================================
  API INFO (AUTO RESOLVE SHORT LINK)
========================================
*/
app.post("/api/info", async (req, res) => {
  let { url } = req.body;
  if (!url) return res.json({ success: false, message: "URL tidak ada" });

  // auto resolve vt.tiktok link
  url = await autoResolve(url);

  // yt-dlp resolve javascript redirect internal
  const cmd = `yt-dlp -J --no-check-certificates --user-agent "Mozilla/5.0" "${url}"`;

  exec(cmd, { maxBuffer: 1024 * 1024 * 500 }, (err, stdout, stderr) => {
    if (err || stderr.includes("ERROR")) {
      return res.json({
        success: false,
        message: "Gagal ambil info",
        debug: stderr
      });
    }

    let info;
    try {
      info = JSON.parse(stdout);
    } catch {
      return res.json({ success: false, message: "JSON tidak valid" });
    }

    // Resolusi anti dobel
    const uniqueFormats = {};
    info.formats?.forEach(f => {
      if (f.height && !uniqueFormats[f.height]) {
        uniqueFormats[f.height] = { resolution: f.height + "p" };
      }
    });

    const formats = Object.values(uniqueFormats);

    // FOTO UNLIMITED
    const images = (info.thumbnails || []).map(t => t.url);

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
  DOWNLOAD MP4 (PLAYABLE)
========================================
*/
app.get("/download", async (req, res) => {
  let url = req.query.url;
  if (!url) return res.send("URL tidak ditemukan");

  // resolve short URL
  url = await autoResolve(url);

  const filename = uuidv4() + ".mp4";
  const filepath = path.join(__dirname, filename);

  const command = `yt-dlp --no-check-certificates \
  -f "bestvideo[ext=mp4]+bestaudio[ext=m4a]/mp4" \
  --merge-output-format mp4 \
  --user-agent "Mozilla/5.0" \
  -o "${filepath}" "${url}"`;

  exec(command, { maxBuffer: 1024 * 1024 * 500 }, (err) => {
    if (err) {
      console.log("MP4 ERROR:", err);
      return res.send("Gagal download video");
    }

    res.download(filepath, "video.mp4", () => {
      fs.unlink(filepath, () => {});
    });
  });
});

/*
========================================
  DOWNLOAD MP3
========================================
*/
app.get("/download-mp3", async (req, res) => {
  let url = req.query.url;
  if (!url) return res.send("URL tidak ditemukan");

  url = await autoResolve(url);

  const filename = uuidv4() + ".mp3";
  const filepath = path.join(__dirname, filename);

  const command = `yt-dlp --no-check-certificates \
  -x --audio-format mp3 --audio-quality 0 \
  --user-agent "Mozilla/5.0" \
  -o "${filepath}" "${url}"`;

  exec(command, { maxBuffer: 1024 * 1024 * 300 }, () => {
    res.download(filepath, "audio.mp3", () => fs.unlink(filepath, () => {}));
  });
});

/*
========================================
  LOAD UI PRO
========================================
*/
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => console.log("Server jalan di po
