const express = require("express");
const path = require("path");
const fs = require("fs");
const bodyParser = require("body-parser");
const { exec } = require("child_process");
const { v4: uuidv4 } = require("uuid");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(express.static("public"));

/*
========================================
  API AMBIL INFO VIDEO (ANTI RESOLUSI DOBEL)
========================================
*/
app.post("/api/info", (req, res) => {
  const { url } = req.body;
  if (!url) return res.json({ success: false, message: "URL tidak ada" });

  const cmd = `yt-dlp -J --user-agent "Mozilla/5.0" "${url}"`;

  exec(cmd, { maxBuffer: 1024 * 1024 * 300 }, (err, stdout, stderr) => {
    if (err || stderr.includes("ERROR")) {
      return res.json({
        success: false,
        message: "Gagal ambil info video",
        debug: stderr
      });
    }

    const info = JSON.parse(stdout);

    // -------------------------
    // ANTI RESOLUSI DOBEL
    // -------------------------
    const uniqueFormats = {};
    info.formats.forEach(f => {
      if (f.height && !uniqueFormats[f.height]) {
        uniqueFormats[f.height] = {
          resolution: f.height + "p",
          format_id: f.format_id
        };
      }
    });

    const formats = Object.values(uniqueFormats);

    res.json({
      success: true,
      title: info.title,
      thumbnail: info.thumbnail,
      formats: formats   // Sudah bersih, tanpa dobel
    });
  });
});

/*
========================================
  DOWNLOAD MP4 (100% PLAYABLE FIX)
========================================
*/
app.get("/download", async (req, res) => {
  const videoUrl = req.query.url;
  if (!videoUrl) return res.send("URL tidak ditemukan");

  const filename = uuidv4() + ".mp4";
  const filepath = path.join(__dirname, filename);

  // Format aman: H.264 + AAC → PLAYABLE DI SEMUA DEVICE
  const command = `yt-dlp -f "bestvideo[ext=mp4]+bestaudio[ext=m4a]/mp4" \
  --merge-output-format mp4 \
  --user-agent "Mozilla/5.0" \
  -o "${filepath}" "${videoUrl}"`;

  exec(command, { maxBuffer: 1024 * 1024 * 500 }, (err, stdout, stderr) => {
    if (err || stderr.includes("ERROR")) {
      console.log("Download Error:", stderr);
      return res.send("Gagal download video");
    }

    res.download(filepath, "video.mp4", () => {
      fs.unlink(filepath, () => {}); // hapus file setelah dikirim
    });
  });
});

/*
========================================
  DOWNLOAD MP3
========================================
*/
app.get("/download-mp3", (req, res) => {
  const videoUrl = req.query.url;
  if (!videoUrl) return res.send("URL tidak ditemukan");

  const filename = uuidv4() + ".mp3";
  const filepath = path.join(__dirname, filename);

  const command = `yt-dlp -x --audio-format mp3 --audio-quality 0 \
  --user-agent "Mozilla/5.0" \
  -o "${filepath}" "${videoUrl}"`;

  exec(command, { maxBuffer: 1024 * 1024 * 300 }, (err, stdout, stderr) => {
    if (err || stderr.includes("ERROR")) {
      console.log("MP3 Error:", stderr);
      return res.send("Gagal download mp3");
    }

    res.download(filepath, "audio.mp3", () => {
      fs.unlink(filepath, () => {});
    });
  });
});

/*
========================================
  LOAD HALAMAN HTML
========================================
*/
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
