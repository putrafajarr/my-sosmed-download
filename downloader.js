const { exec } = require("child_process");

function download(url) {
  return new Promise((resolve, reject) => {
    const cmd = `yt-dlp -f best --user-agent "Mozilla/5.0" -o - "${url}"`;

    exec(cmd, { maxBuffer: 1024 * 1024 * 50 }, (err, stdout, stderr) => {
      if (err) return reject(stderr);
      resolve(stdout);
    });
  });
}

module.exports = download;
