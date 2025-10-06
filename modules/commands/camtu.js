const fs = require("fs-extra");
const path = require("path");

const dataPath = path.join(__dirname, "camtu_data.json");
if (!fs.existsSync(dataPath)) fs.writeFileSync(dataPath, JSON.stringify({}));

const MAX_VIOLATION = 5;
const RESET_AFTER_MS = 15 * 60 * 1000;
const protectedUsers = ["100004249838132"]; // ID không bao giờ bị kick

module.exports.config = {
  name: "camtu",
  version: "4.5.0",
  hasPermssion: 0,
  credits: "tramanhdev",
  description: "Quản lý từ cấm, tự động kick nếu vi phạm nhiều",
  commandCategory: "group",
  usages: ".camtu on/off/add/list/del",
  cooldowns: 3
};

module.exports.handleEvent = async function ({ api, event }) {
  const { threadID, senderID, body } = event;
  if (!body || !threadID) return;

  const data = JSON.parse(fs.readFileSync(dataPath));
  if (!data[threadID] || !data[threadID].enabled) return;

  const thread = data[threadID];
  const msg = body.toLowerCase();

  const matched = thread.words.some(word => msg.includes(word));
  if (!matched) return;

  const now = Date.now();
  if (!thread.users[senderID]) thread.users[senderID] = { count: 0, lastTime: now };
  const user = thread.users[senderID];

  if (now - user.lastTime > RESET_AFTER_MS) user.count = 0;

  user.count += 1;
  user.lastTime = now;
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));

  if (user.count >= MAX_VIOLATION) {
    const threadInfo = await api.getThreadInfo(threadID);
    const isAdmin = threadInfo.adminIDs.some(e => e.id === senderID);
    const isProtected = protectedUsers.includes(senderID);

    if (isAdmin || isProtected) {
      api.sendMessage(
        `⚠️ ${isProtected ? "Vì bạn là chồng của Yuz nên" : "Bạn là quản trị viên nên"} không bị kick.\nTuy nhiên hãy chú ý từ ngữ nhé!`,
        threadID,
        event.messageID
      );
      user.count = 0;
      fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
      return;
    }

    try {
      await api.removeUserFromGroup(senderID, threadID);
      delete thread.users[senderID];
      fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
      api.sendMessage(`🚫 Người dùng ${senderID} đã bị kick do vi phạm từ cấm quá 5 lần.`, threadID);
    } catch (e) {
      api.sendMessage("❌ Không thể kick người dùng. Bot không đủ quyền.", threadID);
    }
  } else {
    api.sendMessage(`⚠️ Cảnh báo: bạn đã vi phạm từ cấm (${user.count}/5).`, threadID, event.messageID);
  }
};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, senderID, messageReply } = event;
  const command = args[0];

  const threadInfo = await api.getThreadInfo(threadID);
  const isAdmin = threadInfo.adminIDs.some(e => e.id === senderID);
  if (!isAdmin) return api.sendMessage("🚫 Bạn cần là quản trị viên nhóm để dùng lệnh này.", threadID);

  const data = JSON.parse(fs.readFileSync(dataPath));
  if (!data[threadID]) data[threadID] = { enabled: true, words: [], users: {} };
  const thread = data[threadID];

  switch (command) {
    case "on":
      thread.enabled = true;
      fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
      return api.sendMessage("✅ Đã bật lọc từ cấm.", threadID);

    case "off":
      thread.enabled = false;
      fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
      return api.sendMessage("🔕 Đã tắt lọc từ cấm.", threadID);

    case "list":
      if (!thread.words.length)
        return api.sendMessage("📭 Nhóm chưa có từ cấm nào.", threadID);
      return api.sendMessage(`📕 Danh sách từ cấm:\n→ ${thread.words.join(", ")}`, threadID);

    case "add":
      if (!messageReply || !messageReply.body)
        return api.sendMessage("⚠️ Hãy reply tin nhắn chứa từ cần cấm.", threadID);
      const wordsToAdd = messageReply.body.toLowerCase().split(/\s+/).filter(w => w.length > 1);
      const newWords = wordsToAdd.filter(w => !thread.words.includes(w));
      thread.words.push(...newWords);
      fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
      return api.sendMessage(
        newWords.length
          ? `✅ Đã thêm từ: ${newWords.join(", ")}`
          : "⚠️ Không có từ mới nào được thêm.",
        threadID
      );

    case "del":
      if (args[1] === "all") {
        if (!thread.words.length)
          return api.sendMessage("📭 Không có từ nào để xóa.", threadID);
        thread.words = [];
        fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
        return api.sendMessage("🗑️ Đã xoá toàn bộ từ cấm trong nhóm.", threadID);
      }

      const target = args[1]?.toLowerCase();
      if (!target) return api.sendMessage("⚠️ Dùng: .camtu del <từ> hoặc .camtu del all", threadID);
      const index = thread.words.indexOf(target);
      if (index === -1)
        return api.sendMessage("❌ Từ không nằm trong danh sách cấm.", threadID);
      thread.words.splice(index, 1);
      fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
      return api.sendMessage(`🗑️ Đã xoá từ: ${target}`, threadID);

    default:
      return api.sendMessage(
        `📌 Dùng lệnh:\n` +
        `→ .camtu on/off: Bật/Tắt lọc từ\n` +
        `→ .camtu add (reply): Thêm từ cấm\n` +
        `→ .camtu del <từ>: Xoá từ cấm\n` +
        `→ .camtu del all: Xoá toàn bộ từ\n` +
        `→ .camtu list: Xem danh sách từ cấm`,
        threadID
      );
  }
};
