const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const { exec } = require("child_process");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(express.static("public"));

// Endpoint download
app.post("/api/download", (req, res) => {
  const { url } = req.body;
  if (!url) return res.json({ success: false, message: "URL not provided" });

  const command = `yt-dlp -f best --user-agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" -o - "${url}"`;

  exec(command, { maxBuffer: 1024 * 1024 * 50 }, (err, stdout, stderr) => {
    if (err || stderr.includes("ERROR")) {
      return res.json({
        success: false,
        message: "Download failed",
        debug: stderr
      });
    }

    res.json({
      success: true,
      message: "Download success",
      data: "Video ready to download"
    });
  });
});

// Serve index.html
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => console.log("Server running on port", PORT));
