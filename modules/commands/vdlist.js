const fs = require("fs");
const CONFIG_PATH = __dirname + "/vdmedia-config.json";
const COOLDOWN_MS = 8000;

function loadConfig() {
  if (!fs.existsSync(CONFIG_PATH)) {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify({ vdAnime: {}, vdGai: {} }, null, 2));
  }
  global.vdmediaConfig = JSON.parse(fs.readFileSync(CONFIG_PATH));
}
function saveConfig() {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(global.vdmediaConfig, null, 2));
}

if (!global.vdAnimeCooldown) global.vdAnimeCooldown = {};
if (!global.vdGaiCooldown) global.vdGaiCooldown = {};

module.exports.config = {
  name: "vdlist",
  version: "2.2.0",
  hasPermssion: 0,
  credits: "ta + DucLe",
  description: "Quản lý anime/gái xinh qua menu phản hồi",
  commandCategory: "No Prefix",
  usages: "vdlist",
  cooldowns: 0
};

module.exports.onLoad = () => loadConfig();

module.exports.run = async ({ api, event }) => {
  const threadID = event.threadID;
  const anime = global.vdmediaConfig.vdAnime || {};
  const gai   = global.vdmediaConfig.vdGai   || {};

  let threadList;
  try {
    threadList = await api.getThreadList(100, null, ["INBOX"]);
  } catch (e) {
    return api.sendMessage("❌ Không thể lấy danh sách nhóm.", threadID);
  }

  if (!threadList || threadList.length === 0)
    return api.sendMessage("❌ Bot không thấy nhóm nào đang tham gia!", threadID);

  const nameMap = {};
  let msg = "📋 Trạng thái anime/gái theo nhóm\n━━━━━━━━━━━━━━━━━━━━━━━\n";
  let count = 0;

  for (let i = 0; i < threadList.length; i++) {
    const thread = threadList[i];
    if (!thread.isSubscribed) continue;
    const tid = thread.threadID;
    const name = thread.name || `Nhóm ${tid}`;
    const animeOn = anime[tid];
    const gaiOn = gai[tid];
    const isEnabled = animeOn || gaiOn;
    nameMap[++count] = { tid, name };
    msg += `${String.fromCharCode(9311 + count)} ${name} ▸ ${isEnabled ? "✅ Đã bật" : "❌ Đang tắt"}\n`;
  }

  if (count === 0)
    return api.sendMessage("⚠️ Bot không còn trong nhóm nào hợp lệ.", threadID);

  msg += "━━━━━━━━━━━━━━━━━━━━━━━\n📥 Reply số để quản lý nhóm chi tiết";

  api.sendMessage(msg.trim(), threadID, (err, info) => {
    global.client.handleReply.push({
      name: module.exports.config.name,
      type: "selectGroup",
      messageID: info.messageID,
      list: nameMap
    });
  });
};

module.exports.handleReply = async ({ api, event, handleReply }) => {
  const { type, list, tid } = handleReply;
  const threadID = event.threadID;
  const choice = event.body.trim();

  if (type === "selectGroup") {
    const selected = list[parseInt(choice)];
    if (!selected) return api.sendMessage("❌ Số không hợp lệ.", threadID, event.messageID);
    const { tid: gid, name } = selected;
    const animeOn = global.vdmediaConfig.vdAnime[gid] ?? false;
    const gaiOn   = global.vdmediaConfig.vdGai[gid]   ?? false;
    const msg = `🆔 ${name}\n🎬 Anime: ${animeOn ? "✅" : "❌"} | 📸 Gái: ${gaiOn ? "✅" : "❌"}\n\nReply số hành động:\n1. Tắt Anime\n2. Bật Anime\n3. Tắt Gái\n4. Bật Gái\n5. Bật cả 2\n6. Tắt cả 2`;
    return api.sendMessage(msg, threadID, (err, info) => {
      global.client.handleReply.push({
        name: module.exports.config.name,
        type: "toggleOption",
        messageID: info.messageID,
        tid: gid,
        gname: name
      });
    });
  }

  if (type === "toggleOption") {
    switch (choice) {
      case "1": global.vdmediaConfig.vdAnime[tid] = false; break;
      case "2": global.vdmediaConfig.vdAnime[tid] = true; break;
      case "3": global.vdmediaConfig.vdGai[tid] = false; break;
      case "4": global.vdmediaConfig.vdGai[tid] = true; break;
      case "5": global.vdmediaConfig.vdAnime[tid] = true; global.vdmediaConfig.vdGai[tid] = true; break;
      case "6": global.vdmediaConfig.vdAnime[tid] = false; global.vdmediaConfig.vdGai[tid] = false; break;
      default: return api.sendMessage("❌ Không hợp lệ.", threadID, event.messageID);
    }
    saveConfig();
    return api.sendMessage(`✅ Đã cập nhật cài đặt cho nhóm ${handleReply.gname}.`, threadID);
  }
};

module.exports.handleEvent = async ({ api, event }) => {
  const text = event.body?.toLowerCase();
  const threadID = event.threadID;
  if (!text) return;

  const animeTrig = ["anime", "vdanime", "anm", "animegai"];
  if (animeTrig.some(k => text.includes(k))) {
    const isOn = global.vdmediaConfig.vdAnime[threadID];
    if (!isOn) return;
    const last = global.vdAnimeCooldown[threadID] || 0;
    if (Date.now() - last < COOLDOWN_MS) return;
    if (!global.taanime || global.taanime.length === 0)
      return api.sendMessage("⚠️ Không có video anime nào!", threadID);
    const name = await api.getUserInfo(event.senderID).then(r => r[event.senderID].name);
    const attachment = global.taanime.splice(0, 1);
    global.vdAnimeCooldown[threadID] = Date.now();
    return api.sendMessage({ body: `🎬 Anime nè ${name}!`, attachment }, threadID);
  }

  const gaiTrig = ["gái", "gaixinh", "gái xinh", "gái đẹp", "vdgai"];
  if (gaiTrig.some(k => text.includes(k))) {
    const isOn = global.vdmediaConfig.vdGai[threadID];
    if (!isOn) return;
    const last = global.vdGaiCooldown[threadID] || 0;
    if (Date.now() - last < COOLDOWN_MS) return;
    if (!global.ta || global.ta.length === 0)
      return api.sendMessage("⚠️ Không có video gái xinh nào!", threadID);
    const name = await api.getUserInfo(event.senderID).then(r => r[event.senderID].name);
    const attachment = global.ta.splice(0, 1);
    global.vdGaiCooldown[threadID] = Date.now();
    return api.sendMessage({ body: `📸 Gái xinh cho ${name} nè!`, attachment }, threadID);
  }
};
