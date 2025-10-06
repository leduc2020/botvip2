const fs = require("fs-extra");
const path = require("path");
const axios = require("axios");

module.exports = {
  config: {
    name: "luatbox",
    version: "1.1.1",
    hasPermssion: 0,
    credits: "TrâmGPT",
    description: "Quản lý luật nhóm bằng ảnh hoặc chữ (chỉ cho 1 ID)",
    commandCategory: "Quản trị nhóm",
    usages: "[add/reset/on/off] [nội dung hoặc reply ảnh]",
    cooldowns: 3
  },

  onLoad: () => {
    const dir = __dirname + "/../cache/luatbox";
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  },

  handleEvent: async ({ api, event }) => {
    const { threadID, body } = event;
    if (!body) return;

    const content = body.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    const keywordRegex = /(luat( box| nhom)?|co luat|luat (dau|gi|sao|o dau)?|nhom nay co luat)/i;
    if (!keywordRegex.test(content)) return;

    const luatPath = path.join(__dirname, `../cache/luatbox/${threadID}`);
    const imagePath = path.join(luatPath, "luat.jpg");
    const textPath = path.join(luatPath, "luat.txt");
    const configPath = path.join(luatPath, "config.json");

    if (!fs.existsSync(configPath)) return;
    const config = fs.existsSync(configPath) ? fs.readJsonSync(configPath) : {};
    if (config.disabled) return;

    if (fs.existsSync(imagePath)) {
      return api.sendMessage({ body: "📌 Luật nhóm đây nè:", attachment: fs.createReadStream(imagePath) }, threadID);
    } else if (fs.existsSync(textPath)) {
      const content = fs.readFileSync(textPath, "utf-8");
      return api.sendMessage(`📌 Luật nhóm:\n${content}`, threadID);
    } else {
      return api.sendMessage("⚠️ Nhóm này chưa cài luật box!", threadID);
    }
  },

  run: async ({ api, event, args }) => {
    const { threadID, messageID, senderID, messageReply } = event;
    const mode = args[0];

    // ✅ Chỉ cho phép ID cố định sử dụng
    if (senderID !== "61568443432899") {
      return api.sendMessage("🚫 Lệnh này chỉ dành cho người điều hành!", threadID, messageID);
    }

    const luatPath = path.join(__dirname, `../cache/luatbox/${threadID}`);
    const imagePath = path.join(luatPath, "luat.jpg");
    const textPath = path.join(luatPath, "luat.txt");
    const configPath = path.join(luatPath, "config.json");

    await fs.ensureDir(luatPath);

    switch (mode) {
      case "add": {
        if (messageReply?.attachments?.[0]?.type === "photo") {
          try {
            const url = messageReply.attachments[0].url;
            const res = await axios.get(url, { responseType: "arraybuffer" });
            fs.writeFileSync(imagePath, res.data);
            fs.removeSync(textPath);
            return api.sendMessage("✅ Đã thêm luật bằng ảnh.", threadID, messageID);
          } catch (err) {
            return api.sendMessage("❌ Lỗi khi tải ảnh. Vui lòng thử lại.", threadID, messageID);
          }
        }

        const content = args.slice(1).join(" ");
        if (!content) return api.sendMessage("❌ Vui lòng nhập nội dung luật hoặc reply ảnh.", threadID, messageID);
        fs.writeFileSync(textPath, content, "utf-8");
        if (fs.existsSync(imagePath)) fs.removeSync(imagePath);
        return api.sendMessage("✅ Đã thêm luật bằng văn bản.", threadID, messageID);
      }

      case "reset": {
        fs.removeSync(imagePath);
        fs.removeSync(textPath);
        return api.sendMessage("🗑️ Đã xóa luật của nhóm.", threadID, messageID);
      }

      case "on":
      case "off": {
        const isOff = mode === "off";
        fs.writeJsonSync(configPath, { disabled: isOff });
        return api.sendMessage(`✅ Đã ${isOff ? "tắt" : "bật"} chế độ hiển thị luật.`, threadID, messageID);
      }

      default: {
        return api.sendMessage(
          "⚙️ Cách dùng lệnh luậtbox:\n" +
          "- `luatbox add [nội dung]`: thêm luật bằng chữ\n" +
          "- `luatbox add` (reply ảnh): thêm luật bằng ảnh\n" +
          "- `luatbox reset`: xóa luật nhóm\n" +
          "- `luatbox on/off`: bật hoặc tắt gửi luật khi có người hỏi\n\n" +
          "⚠️ Chỉ người điều hành (ID: 61568443432899) mới dùng được lệnh này.",
          threadID,
          messageID
        );
      }
    }
  }
};