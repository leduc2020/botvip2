module.exports.config = {
  name: "kicktag",
  version: "1.1.0",
  hasPermssion: 1,
  credits: "GPT & RST",
  description: "Tự động kick người dùng khi tag @mọi người (trừ admin)",
  commandCategory: "Quản Trị Viên",
  usages: "antitagall on/off",
  cooldowns: 5
};

const fs = require("fs");
const path = __dirname + "/data/antitagall.json";

let data = fs.existsSync(path) ? JSON.parse(fs.readFileSync(path)) : {};

module.exports.handleEvent = async function({ event, api }) {
  const { threadID, senderID, mentions, messageID } = event;
  if (!data[threadID]) return;

  const mentionAll = Object.keys(mentions || {}).some(uid => mentions[uid] === '@mọi người' || mentions[uid].includes('mọi người'));
  if (!mentionAll) return;

  try {
    const threadInfo = await api.getThreadInfo(threadID);
    const botID = api.getCurrentUserID();

    // Nếu người gửi là admin hoặc là bot, không kick
    if (threadInfo.adminIDs.some(e => e.id == senderID)) return;

    // Nếu bot không phải admin, không kick được
    if (!threadInfo.adminIDs.some(e => e.id == botID)) {
      return api.sendMessage("Bot cần quyền quản trị viên để kick người.", threadID, messageID);
    }

    await api.removeUserFromGroup(senderID, threadID);
  } catch (err) {
    console.error(err);
    return api.sendMessage("Không thể kick người dùng. Có thể họ là admin hoặc bot thiếu quyền.", threadID, messageID);
  }
};

module.exports.run = function({ event, api, args }) {
  const { threadID, messageID } = event;

  if (!args[0]) {
    return api.sendMessage(`Hiện tại trạng thái anti-tagall là: ${data[threadID] ? "BẬT" : "TẮT"}`, threadID, messageID);
  }

  if (args[0].toLowerCase() === "on") {
    data[threadID] = true;
    fs.writeFileSync(path, JSON.stringify(data, null, 2));
    return api.sendMessage("Đã bật chế độ kick khi tag @mọi người (trừ admin).", threadID, messageID);
  }

  if (args[0].toLowerCase() === "off") {
    delete data[threadID];
    fs.writeFileSync(path, JSON.stringify(data, null, 2));
    return api.sendMessage("Đã tắt chế độ kick khi tag @mọi người.", threadID, messageID);
  }

  return api.sendMessage("Sử dụng: antitagall on/off", threadID, messageID);
};
