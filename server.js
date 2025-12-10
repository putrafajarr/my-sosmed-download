const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const morgan = require("morgan");
const path = require("path");
const { downloadWithYtdlp } = require("./downloader");
const { v4: uuidv4 } = require("uuid");

const app = express();
app.use(bodyParser.json({ limit: "50mb" }));
app.use(cors());
app.use(morgan("tiny"));

app.use("/", express.static(path.join(__dirname, "public")));
app.use("/downloads", express.static(path.join(__dirname, "downloads")));

app.post("/api/download", async (req, res) => {
  try {
    const { url, format = "mp4" } = req.body;
    if (!url) return res.json({ success: false, message: "Missing URL" });

    const id = uuidv4();
    const result = await downloadWithYtdlp({ id, url, format });

    if (!result.success) return res.json(result);

    const base = process.env.APP_URL || `http://localhost:${process.env.PORT || 3000}`;
    return res.json({
      success: true,
      filename: result.filename,
      filesize: result.filesize,
      url: `${base}/downloads/${result.filename}`
    });

  } catch (e) {
    return res.json({ success: false, message: e.message });
  }
});

app.listen(3000, () => console.log("RUNNING PORT 3000"));
