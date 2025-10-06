const axios = require("axios");
const fs = require("fs");
const path = require("path");

// Đọc danh sách URL ảnh
let urls = require("../../includes/datajson/anhsex.json");

class Command {
  constructor(config) {
    this.config = config;

    if (!global.tagai) global.tagai = [];
    if (!global.tagaiUploading) global.tagaiUploading = false;
  }

  async onLoad(o) {
    const cachePath = path.join(__dirname, "cache", "tagai");
    if (!fs.existsSync(cachePath)) fs.mkdirSync(cachePath, { recursive: true });

    if (!global.client) global.client = {};
    if (!global.client.tagaiUploader) {
      global.client.tagaiUploader = setInterval(async () => {
        if (global.tagaiUploading || global.tagai.length > 50) return;
        global.tagaiUploading = true;

        try {
          const tasks = [];
          for (let i = 0; i < 5; i++) {
            const url = urls[Math.floor(Math.random() * urls.length)];
            tasks.push(downloadImage(url));
          }

          const res = await Promise.all(tasks);
          global.tagai.push(...res.filter(Boolean));
          console.log("TAGAI ảnh đã tải:", global.tagai.length);
        } catch (err) {
          console.error("TAGAI lỗi tải ảnh:", err);
        }

        global.tagaiUploading = false;
      }, 5000);
    }

    // Hàm tải ảnh về local và trả về stream
    async function downloadImage(url) {
      try {
        const res = await axios.get(url, { responseType: "arraybuffer" });
        const ext = path.extname(url).split("?")[0] || ".jpg";
        const filePath = path.join(cachePath, `${Date.now()}${ext}`);
        fs.writeFileSync(filePath, res.data);

        // Tự xoá sau 1 phút
        setTimeout(() => {
          if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        }, 60000);

        return fs.createReadStream(filePath);
      } catch (e) {
        console.error("Lỗi tải ảnh:", url, e.message);
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

    const userInfo = await api.getUserInfo(event.senderID);
    const userName = userInfo[event.senderID]?.name || "Bạn";

    return send({
      body: `🖼️ Ảnh SEX Của Mày Nè (${userName})`,
      attachment: global.tagai.length > 0 ? global.tagai.splice(0, 1) : undefined
    });
  }
}

module.exports = new Command({
  name: "lồn",
  version: "1.0.0",
  hasPermssion: 0,
  credits: "hẹ hẹ",
  description: "Tải ảnh từ URL và gửi khi dùng lệnh",
  commandCategory: "No Prefix",
  usages: ""
});
