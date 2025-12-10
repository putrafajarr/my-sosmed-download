const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

async function run(args) {
  return await new Promise(resolve => {
    const proc = spawn("yt-dlp", args);
    let out = "", err = "";
    proc.stdout.on("data", d => out += d);
    proc.stderr.on("data", d => err += d);
    proc.on("close", code => resolve({ code, out, err }));
  });
}

module.exports.downloadWithYtdlp = async ({ id, url, format }) => {
  const folder = path.join(__dirname, "downloads");
  if (!fs.existsSync(folder)) fs.mkdirSync(folder);

  const out = path.join(folder, `${id}.%(ext)s`);
  const args = [url, "-o", out, "--no-mtime", "--no-playlist"];

  if (format === "mp3") {
    args.push("-x", "--audio-format", "mp3", "--audio-quality", "0");
  } else {
    args.push("-f", "bestvideo+bestaudio/best");
  }

  const r = await run(args);
  if (r.code !== 0) {
    return { success: false, message: "Download failed", debug: r.err };
  }

  const file = fs.readdirSync(folder).find(f => f.startsWith(id));
  if (!file) return { success: false, message: "No output file" };

  return {
    success: true,
    filename: file,
    filesize: fs.statSync(path.join(folder, file)).size
  };
};
