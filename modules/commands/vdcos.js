const fs = require("fs-extra");
const axios = require("axios");
const path = require("path");

module.exports.config = {
  name: "vdcos",
  version: "1.0.1",
  hasPermssion: 0,
  credits: "tùng (fix by GPT)",
  description: "G?i video gái ng?u nhiên",
  commandCategory: "Thu Vi?n",
  usages: "vdgai",
  cooldowns: 5,
};

module.exports.run = async function({ api, event }) {
  try {
    const dataPath = path.join(__dirname, "./../../includes/datajson/vdcos.json");
    if (!fs.existsSync(dataPath)) {
      return api.sendMessage("Chua có file vdgai.json!", event.threadID, event.messageID);
    }

    const videoList = JSON.parse(fs.readFileSync(dataPath, "utf-8"));
    if (!Array.isArray(videoList) || videoList.length === 0) {
      return api.sendMessage("Danh sách video tr?ng!", event.threadID, event.messageID);
    }

    const randomUrl = videoList[Math.floor(Math.random() * videoList.length)];

    // d?m b?o thu m?c cache t?n t?i
    const cacheDir = path.join(__dirname, "cache");
    if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir);

    const tmpPath = path.join(cacheDir, `video_${Date.now()}.mp4`);
    const response = await axios.get(randomUrl, { responseType: "arraybuffer" });
    fs.writeFileSync(tmpPath, Buffer.from(response.data, "binary"));

    api.sendMessage({
      attachment: fs.createReadStream(tmpPath)
    }, event.threadID, () => fs.unlinkSync(tmpPath), event.messageID);
    
  } catch (e) {
    console.error(e);
    return api.sendMessage("Có l?i x?y ra khi g?i video!", event.threadID, event.messageID);
  }
};
