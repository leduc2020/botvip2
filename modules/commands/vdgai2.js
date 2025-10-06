const urls = require("./../../includes/datajson/vdgai.json");
const axios = require("axios");
const fs = require("fs");

module.exports.config = {
  name: "vdgai",
  version: "1.2.0",
  hasPermssion: 0,
  credits: "ta", 
  description: "Gửi gái xinh (có prefix)",
  commandCategory: "Tiện ích",
  usages: "vdgai",
  cooldowns: 0,
};

module.exports.run = async function ({ api, event }) {
  const name = await api.getUserInfo(event.senderID).then(res => res[event.senderID].name);

  // Random URL từ vdgai.json
  const url = urls[Math.floor(Math.random() * urls.length)];

  // Tải video về stream
  try {
    const res = await axios.get(url, { responseType: 'arraybuffer' });
    const path = __dirname + `/cache/${Date.now()}.mp4`;

    fs.mkdirSync(__dirname + `/cache`, { recursive: true });
    fs.writeFileSync(path, res.data);

    // Gửi video lên
    await api.sendMessage({
      body: `Gái xinh đây nè ${name} 😘`,
      attachment: fs.createReadStream(path)
    }, event.threadID, () => {
      // Xoá file sau khi gửi
      fs.existsSync(path) && fs.unlinkSync(path);
    }, event.messageID);

  } catch (err) {
    console.error(`Error sending video:`, err);
    api.sendMessage(`Có lỗi khi tải video, thử lại sau nhé ${name}!`, event.threadID, event.messageID);
  }
};