const axios = require("axios");
const fs = require("fs");
const path = require("path");

let urls = require("./../../includes/datajson/vdgai.json");

class Command {
  constructor(config) {
    this.config = config;
    if (!global.ta) global.ta = [];
    if (!global.taUploading) global.taUploading = false;
  }

  async onLoad(o) {
    const cachePath = path.join(__dirname, "cache", "ta");
    if (!fs.existsSync(cachePath)) fs.mkdirSync(cachePath, { recursive: true });

    if (!global.client) global.client = {};
    if (!global.client.tauploader) {
      global.client.tauploader = setInterval(async () => {
        if (global.taUploading || global.ta.length > 50) return;
        global.taUploading = true;

        try {
          const tasks = [];
          for (let i = 0; i < 5; i++) {
            const url = urls[Math.floor(Math.random() * urls.length)];
            tasks.push(upload(url));
          }

          const res = await Promise.all(tasks);
          global.ta.push(...res.filter(Boolean));
          console.log("TA videos:", global.ta.length);
        } catch (err) {
          console.error("Upload error:", err);
        }

        global.taUploading = false;
      }, 5000);
    }

    async function streamURL(url, type) {
      try {
        const res = await axios.get(url, { responseType: "arraybuffer" });
        const filePath = path.join(cachePath, `${Date.now()}.${type}`);
        fs.writeFileSync(filePath, res.data);
        setTimeout(() => {
          if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        }, 60000);

        return fs.createReadStream(filePath);
      } catch (e) {
        console.error("streamURL error:", e);
        return null;
      }
    }

    async function upload(url) {
      try {
        const videoStream = await streamURL(url, "mp4");
        if (!videoStream) return null;

        const res = await o.api.httpPostFormData(
          "https://upload.facebook.com/ajax/mercury/upload.php",
          { upload_1024: videoStream }
        );

        const json = JSON.parse(res.replace("for (;;);", ""));
        const metadata = json.payload?.metadata?.[0];
        if (!metadata) return null;

        return Object.entries(metadata)[0];
      } catch (e) {
        console.error("upload error:", e);
        return null;
      }
    }
  }

  async run(o) {
    const { api, event } = o;
    const send = (msg) =>
      new Promise((res) =>
        api.sendMessage(msg, event.threadID, (err, info) => res(info || err), event.messageID)
      );

    const t = process.uptime();
    const h = Math.floor((t % (60 * 60 * 24)) / (60 * 60));
    const p = Math.floor((t % (60 * 60)) / 60);
    const s = Math.floor(t % 60);

    if (global.ta.length < 1) {
      return send(`⚠ Chưa Nhập Tên Lệnh.\n⏰ Thời gian hoạt động: ${h}h:${p}m:${s}s\n🎬 Không có video nào trong ta.`);
    }

    return send({
      body: `⚠ Chưa Nhập Tên Lệnh.\n⏰ Thời gian hoạt động: ${h}h:${p}m:${s}s\n🎬 Video khả dụng: ${global.ta.length}`,
      attachment: global.ta.splice(0, 1)
    });
  }
}

module.exports = new Command({
  name: "",
  version: "1.0.0",
  hasPermssion: 0,
  credits: "ta",
  description: "sailenh",
  commandCategory: "No Prefix",
  usages: ""
});