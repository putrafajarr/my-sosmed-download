const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const { exec } = require("child_process");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(express.static("public"));

/*
========================================
  API AMBIL INFO VIDEO
========================================
*/
app.post("/api/info", (req, res) => {
  const { url } = req.body;
  if (!url) return res.json({ success: false, message: "URL tidak ada" });

  const cmd = `yt-dlp -J --user-agent "Mozilla/5.0" "${url}"`;

  exec(cmd, { maxBuffer: 1024 * 1024 * 200 }, (err, stdout, stderr) => {
    if (err || stderr.includes("ERROR")) {
      return res.json({
        success: false,
        message: "Gagal ambil info video",
        debug: stderr
      });
    }

    const info = JSON.parse(stdout);

    // Ambil daftar resolusi (opsional)
    const formats = info.formats
      .filter(f => f.height)
      .map(f => ({
        resolution: f.height + "p",
        format_id: f.format_id
      }));

    res.json({
      success: true,
      title: info.title,
      thumbnail: info.thumbnail,
      formats: formats
    });
  });
});

/*
========================================
  DOWNLOAD MP4 (AMAN UNTUK SEMUA DEVICE)
========================================
*/
app.get("/download", (req, res) => {
  const videoUrl = req.query.url;
  if (!videoUrl) return res.send("URL tidak ditemukan");

  // Format aman secara universal: MP4, H.264, AAC
  const command = `yt-dlp -f "bestvideo[ext=mp4]+bestaudio[ext=m4a]/mp4" \
    --merge-output-format mp4 \
    --user-agent "Mozilla/5.0" \
    -o - "${videoUrl}"`;

  res.setHeader("Content-Type", "video/mp4");
  res.setHeader("Content-Disposition", "attachment; filename=video.mp4");

  const child = exec(command, { maxBuffer: 1024 * 1024 * 300 });
  child.stdout.pipe(res);

  child.stderr.on("data", (data) => {
    console.log("Download Error:", data.toString());
  });
});

/*
========================================
  DOWNLOAD MP3 SAJA
========================================
*/
app.get("/download-mp3", (req, res) => {
  const { url } = req.query;
  if (!url) return res.send("URL tidak ditemukan");

  const command = `yt-dlp -x --audio-format mp3 --audio-quality 0 \
    --user-agent "Mozilla/5.0" -o - "${url}"`;

  res.setHeader("Content-Type", "audio/mpeg");
  res.setHeader("Content-Disposition", "attachment; filename=audio.mp3");

  const child = exec(command, { maxBuffer: 1024 * 1024 * 200 });
  child.stdout.pipe(res);
});

/*
========================================
  LOAD HALAMAN HTML
========================================
*/
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => console.log("Server running on port", PORT));
