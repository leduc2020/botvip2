const fs = require("fs");
const path = require("path");

const statusDir = path.join(__dirname, "data");
const statusFile = path.join(statusDir, "rankup_set.json");

if (!fs.existsSync(statusDir)) fs.mkdirSync(statusDir, { recursive: true });

module.exports.config = {
  name: "rankup",
  version: "2.0.0",
  hasPermssion: 1,
  credits: "⚡️ - nâng cấp bởi GPT",
  description: "Theo dõi và thông báo cấp độ tu luyện, bật/tắt theo nhóm",
  commandCategory: "Hệ Thống",
  cooldowns: 1
};

function getStatus(threadID) {
  try {
    if (!fs.existsSync(statusFile)) fs.writeFileSync(statusFile, JSON.stringify({}, null, 2));
    const data = JSON.parse(fs.readFileSync(statusFile));
    return data[threadID] ?? false;
  } catch (err) {
    console.error("Lỗi đọc rankup.json:", err);
    return true;
  }
}

function setStatus(threadID, status) {
  try {
    const data = fs.existsSync(statusFile) ? JSON.parse(fs.readFileSync(statusFile)) : {};
    data[threadID] = status;
    fs.writeFileSync(statusFile, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Lỗi ghi rankup.json:", err);
  }
}

function calculateLevel(exp) {
  return Math.floor(Math.sqrt(exp));
}

const levelRanges = [
  { maxExp: 10, rank: "Phàm Nhân", icon: "👣" },
  { maxExp: 100, rank: "Luyện Khí", icon: "🔥" },
  { maxExp: 200, rank: "Trúc Cơ", icon: "🌱" },
  { maxExp: 400, rank: "Kim Đan", icon: "💊" },
  { maxExp: 800, rank: "Nguyên Anh", icon: "🧘" },
  { maxExp: 1200, rank: "Xuất Khiếu", icon: "🌌" },
  { maxExp: 1800, rank: "Luyện Hư", icon: "⚡️" },
  { maxExp: 2500, rank: "Hợp Thể", icon: "🌀" },
  { maxExp: 3200, rank: "Hóa Thần", icon: "☄️" },
  { maxExp: 4000, rank: "Độ Kiếp", icon: "⛈️" },
  { maxExp: 4800, rank: "Chân Tiên", icon: "👼" },
  { maxExp: 5800, rank: "Đại Thừa", icon: "🛕" },
  { maxExp: 7000, rank: "Kim Tiên", icon: "👑" },
  { maxExp: Infinity, rank: "Tiên Đế", icon: "✨" }
];

function getRankInfo(exp) {
  for (let i = 0; i < levelRanges.length; i++) {
    if (exp <= levelRanges[i].maxExp) {
      const prevExp = i === 0 ? 0 : levelRanges[i - 1].maxExp + 1;
      const nextExp = levelRanges[i].maxExp;
      const progress = ((exp - prevExp) / (nextExp - prevExp)) * 100;
      return {
        rank: levelRanges[i].rank,
        icon: levelRanges[i].icon,
        progress: Math.round(progress)
      };
    }
  }
}

module.exports.handleEvent = async function ({ api, event, Currencies, Users }) {
  const { threadID, senderID } = event;
  if (!getStatus(threadID)) return;

  let userData = await Currencies.getData(senderID);
  let exp = userData.exp || 0;
  const oldLevel = calculateLevel(exp);

  exp += 1;
  const newLevel = calculateLevel(exp);
  userData.exp = exp;
  await Currencies.setData(senderID, userData);

  if (isNaN(exp) || newLevel <= oldLevel || newLevel === 1) return;

  const reward = newLevel * 100;
  await Currencies.increaseMoney(senderID, reward);
  const userInfo = await Users.getData(senderID);
  const name = userInfo.name || "Người dùng";
  const { rank, icon, progress } = getRankInfo(exp);

  const msg =
    `⚔️ [Thăng Cấp Tu Luyện] ⚔️\n` +
    `👤 Người tu luyện: ${name}\n` +
    `📈 Tu vi hiện tại: ${icon} ${rank} (Cấp ${newLevel})\n` +
    `💰 Phần thưởng: +${reward}$\n` +
    `🔮 Tiến độ tới cấp tiếp theo: ${progress}%`;

  api.sendMessage(msg, threadID, (err, info) => {
    if (err) return;
    setTimeout(() => api.unsendMessage(info.messageID), 25000);
  });
};

module.exports.run = async function ({ api, event, args, Currencies, Users }) {
  const { threadID, messageID, senderID, mentions, type, messageReply } = event;

  const getRankMessage = async (targetID, name) => {
    const userData = await Currencies.getData(targetID);
    const exp = userData.exp || 0;
    const { rank, icon, progress } = getRankInfo(exp);
    const level = calculateLevel(exp);

    return (
      `⚔️ [Thông Tin Tu Luyện] ⚔️\n` +
      `👤 Người tu luyện: ${name}\n` +
      `📊 Kinh nghiệm: ${exp}\n` +
      `📈 Tu vi hiện tại: ${icon} ${rank} (Cấp ${level})\n` +
      `🔮 Tiến độ tới cấp tiếp theo: ${progress}%`
    );
  };

  if (!args[0]) {
    if (Object.keys(mentions).length > 0) {
      const targetID = Object.keys(mentions)[0];
      const name = mentions[targetID].replace(/@/g, '');
      const msg = await getRankMessage(targetID, name);
      return api.sendMessage(msg, threadID, messageID);
    }

    if (type === "message_reply" && messageReply.senderID) {
      const targetID = messageReply.senderID;
      const name = (await Users.getData(targetID)).name || "Người dùng";
      const msg = await getRankMessage(targetID, name);
      return api.sendMessage(msg, threadID, messageID);
    }

    const userInfo = await Users.getData(senderID);
    const name = userInfo.name || "Người dùng";
    const msg = await getRankMessage(senderID, name);
    return api.sendMessage(msg, threadID, messageID);
  }

  const input = args[0].toLowerCase();

  if (input === "on") {
    if (getStatus(threadID)) return api.sendMessage("✅ Rankup đã bật trước đó.", threadID, messageID);
    setStatus(threadID, true);
    return api.sendMessage("✅ Đã bật tính năng rankup cho nhóm này.", threadID, messageID);
  }

  if (input === "off") {
    if (!getStatus(threadID)) return api.sendMessage("⛔ Rankup đã tắt trước đó.", threadID, messageID);
    setStatus(threadID, false);
    return api.sendMessage("⛔ Đã tắt tính năng rankup cho nhóm này.", threadID, messageID);
  }

  return api.sendMessage("Sai cú pháp. Dùng `rankup on`, `off`, `me`, `@tag`, hoặc reply.", threadID, messageID);
};
