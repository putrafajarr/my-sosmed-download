const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const { exec } = require("child_process");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(express.static("public"));

// API untuk ambil info & validasi URL
app.post("/api/info", (req, res) => {
  const { url } = req.body;
  if (!url) {
    return res.json({ success: false, message: "URL tidak ada" });
  }

  const cmd = `yt-dlp --dump-json "${url}"`;

  exec(cmd, { maxBuffer: 1024 * 1024 * 50 }, (err, stdout, stderr) => {
    if (err || stderr.includes("ERROR")) {
      return res.json({
        success: false,
        message: "Gagal mengambil data",
        debug: stderr
      });
    }

    const info = JSON.parse(stdout);
    res.json({
      success: true,
      title: info.title,
      thumbnail: info.thumbnail
    });
  });
});

// STREAM VIDEO (MAIN FUNCTION)
app.get("/download", (req, res) => {
  const videoUrl = req.query.url;
  if (!videoUrl) return res.send("URL tidak ditemukan");

  const command = `yt-dlp -f best --user-agent "Mozilla/5.0" -o - "${videoUrl}"`;

  res.setHeader("Content-Type", "video/mp4");
  res.setHeader("Content-Disposition", "attachment; filename=video.mp4");

  const child = exec(command, { maxBuffer: 1024 * 1024 * 50 });

  child.stdout.pipe(res);

  child.stderr.on("data", (data) => {
    console.log("DL ERROR:", data.toString());
  });
});

// Serve UI
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => console.log("Server running on port", PORT));
