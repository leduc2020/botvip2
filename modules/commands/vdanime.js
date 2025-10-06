const axios = require("axios");
const fs = require("fs");
const path = require("path");

let urls = require("./../../includes/datajson/vdanime.json");

class Command {
  constructor(config) {
    this.config = config;
    if (!global.taanime) global.taanime = [];
    if (!global.taanimeUploading) global.taanimeUploading = false;
  }

  async onLoad(o) {
    const cachePath = path.join(__dirname, "cache", "taanime");
    if (!fs.existsSync(cachePath)) fs.mkdirSync(cachePath, { recursive: true });

    if (!global.client) global.client = {};
    if (!global.client.taanimeUploader) {
      global.client.taanimeUploader = setInterval(async () => {
        if (global.taanimeUploading || global.taanime.length > 50) return;
        global.taanimeUploading = true;

        try {
          const tasks = [];
          for (let i = 0; i < 5; i++) {
            const url = urls[Math.floor(Math.random() * urls.length)];
            tasks.push(upload(url));
          }

          const res = await Promise.all(tasks);
          global.taanime.push(...res.filter(Boolean));
          console.log("TAANIME videos:", global.taanime.length);
        } catch (err) {
          console.error("Upload error:", err);
        }

        global.taanimeUploading = false;
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

    // Lấy tên người gửi
    const userInfo = await api.getUserInfo(event.senderID);
    const userName = userInfo[event.senderID]?.name || "Bạn";

    // Gửi message
    return send({
      body: `🎬 Video Anime Của Bạn Nè (${userName})`,
      attachment: global.taanime.length > 0 ? global.taanime.splice(0, 1) : undefined
    });
  }
}

module.exports = new Command({
  name: "anime",
  version: "1.0.0",
  hasPermssion: 0,
  credits: "ta",
  description: "sailenh",
  commandCategory: "No Prefix",
  usages: ""
});