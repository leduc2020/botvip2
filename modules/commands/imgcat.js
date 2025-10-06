const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

module.exports = {
  config: {
    name: "imgcat",
    version: "1.3.1",
    author: "ChatGPT & Rst",
    description: "Chuyển đổi ảnh/video từ Imgur sang Catbox",
    usage: "[link1] [link2] ... hoặc reply chứa link",
    commandCategory: "Công Cụ",
    cooldowns: 5
  },

  run: async function ({ api, event, args }) {
    let links = [];

    // Làm sạch và lấy link từ reply
    if (event.type === "message_reply" && event.messageReply.body) {
      const cleanBody = event.messageReply.body.replace(/["[\],]/g, '');
      links = cleanBody.match(/https?:\/\/(?:i\.)?imgur\.com\/[^\s]+/g) || [];
    }

    // Làm sạch và lấy link từ args
    if (args.length > 0) {
      const rawInput = args.join(" ").replace(/["[\],]/g, '');
      const fromArgs = rawInput.match(/https?:\/\/(?:i\.)?imgur\.com\/[^\s]+/g) || [];
      links = links.concat(fromArgs);
    }

    if (links.length === 0) {
      return api.sendMessage("Vui lòng nhập hoặc reply ít nhất một liên kết imgur hợp lệ.", event.threadID, event.messageID);
    }

    // Lọc trùng và giới hạn số lượng link
    links = [...new Set(links)];
    if (links.length > 1000) {
      return api.sendMessage("Chỉ cho phép tối đa 300 liên kết mỗi lần.", event.threadID, event.messageID);
    }

    api.sendMessage(`Đang chuyển đổi ${links.length} liên kết...`, event.threadID);

    // Tạo thư mục cache nếu chưa có
    const cacheDir = path.join(__dirname, "cache");
    if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir);

    // Chuẩn hóa link Imgur
    function normalizeImgurLink(link) {
      if (!link.includes("i.imgur.com")) {
        const id = link.split("/").pop().split(".")[0];
        return `https://i.imgur.com/${id}.jpg`;
      }
      return link;
    }

    links = links.map(normalizeImgurLink);

    const results = [];

    for (const imgurUrl of links) {
      try {
        const res = await axios.get(imgurUrl, {
          responseType: 'arraybuffer',
          headers: { "User-Agent": "Mozilla/5.0" }
        });

        // Xác định phần mở rộng
        let ext = path.extname(imgurUrl.split("?")[0]);
        if (!ext || ext === "") {
          const contentType = res.headers['content-type'];
          if (contentType.includes('image/png')) ext = ".png";
          else if (contentType.includes('image/gif')) ext = ".gif";
          else if (contentType.includes('image/jpeg')) ext = ".jpg";
          else if (contentType.includes('image/webp')) ext = ".webp";
          else if (contentType.includes('video/mp4')) ext = ".mp4";
          else if (contentType.includes('video/webm')) ext = ".webm";
          else ext = ".jpg";
        }

        // Lưu file tạm
        const uniqueID = Date.now() + "_" + Math.floor(Math.random() * 10000);
        const filePath = path.join(cacheDir, `temp_${uniqueID}${ext}`);
        fs.writeFileSync(filePath, Buffer.from(res.data));

        // Upload lên Catbox
        const form = new FormData();
        form.append("reqtype", "fileupload");
        form.append("fileToUpload", fs.createReadStream(filePath));

        const upload = await axios.post("https://catbox.moe/user/api.php", form, {
          headers: form.getHeaders()
        });

        fs.unlinkSync(filePath);
        results.push(`"${upload.data}",`);
      } catch (err) {
        console.error(`Lỗi với ${imgurUrl}:`, err.message || err);
        const errorMsg = err.response?.status
          ? `${err.response.status} - ${err.response.statusText}`
          : err.message || "Không rõ lỗi";
        results.push(`• ${imgurUrl} → Lỗi: ${errorMsg}`);
      }
    }

    const success = results.filter(r => !r.includes("Lỗi"));
    const failed = results.filter(r => r.includes("Lỗi"));

    return api.sendMessage(
      `${success.join("\n")}${failed.length ? `\n\nLỗi:\n${failed.join("\n")}` : ""}`,
      event.threadID, event.messageID
    );
  }
};
