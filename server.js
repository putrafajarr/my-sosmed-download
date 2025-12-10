const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const { exec } = require("child_process");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(express.static("public"));

// AMBIL INFO VIDEO + LIST RESOLUSI
app.post("/api/info", (req, res) => {
  const { url } = req.body;
  if (!url) return res.json({ success: false, message: "URL tidak ada" });

  const cmd = `yt-dlp -J --user-agent "Mozilla/5.0" "${url}"`;

  exec(cmd, { maxBuffer: 1024 * 1024 * 50 }, (err, stdout, stderr) => {
    if (err || stderr.includes("ERROR")) {
      return res.json({
        success: false,
        message: "Gagal ambil info",
        debug: stderr
      });
    }

    const info = JSON.parse(stdout);
    const formats = info.formats
      .filter(f => f.height) // hanya video
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

// DOWNLOAD MP4 BERDASARKAN RESOLUSI
app.get("/download", (req, res) => {
  const { url, format_id } = req.query;

  if (!url || !format_id) {
    return res.send("URL / Format ID tidak ditemukan");
  }

  const command = `yt-dlp -f ${format_id} --user-agent "Mozilla/5.0" -o - "${url}"`;

  res.setHeader("Content-Type", "video/mp4");
  res.setHeader("Content-Disposition", `attachment; filename=video-${format_id}.mp4`);

  const child = exec(command, { maxBuffer: 1024 * 1024 * 50 });
  child.stdout.pipe(res);
});

// DOWNLOAD MP3 AUDIO SAJA
app.get("/download-mp3", (req, res) => {
  const { url } = req.query;

  if (!url) return res.send("URL tidak ditemukan");

  const command = `yt-dlp -x --audio-format mp3 --audio-quality 0 --user-agent "Mozilla/5.0" -o - "${url}"`;

  res.setHeader("Content-Type", "audio/mpeg");
  res.setHeader("Content-Disposition", "attachment; filename=audio.mp3");

  const child = exec(command, { maxBuffer: 1024 * 1024 * 50 });
  child.stdout.pipe(res);
});

// Serve halaman utama
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => console.log("Server running on port", PORT));
