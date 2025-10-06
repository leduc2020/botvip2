const axios = require("axios");
const fsPromises = require("fs").promises;
const fs = require("fs");
const path = require("path");
const {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} = require("@google/generative-ai");
const { createReadStream } = require("fs-extra");
const moment = require("moment-timezone");

const API_KEY = "AIzaSyD6ZCQm-8vACXPy_rSGqB3TYacnjDronlM";
const MODEL_NAME = "gemini-2.5-flash";
const generationConfig = {
  temperature: 1,
  topK: 0,
  topP: 0.95,
  maxOutputTokens: 88192,
};

const genAI = new GoogleGenerativeAI(API_KEY);
const dataFile = path.join(__dirname, "../../modules/commands/aigoibot/aigoibot.json");
const historyFile = path.join(__dirname, "../../modules/commands/aigoibot/history.json");
const usageFile = path.join(__dirname, "../../modules/commands/aigoibot/usage_history.json");
const memoryFile = path.join(__dirname, "../../modules/commands/aigoibot/memory.json");
const historyDir = path.join(__dirname, "../../modules/commands/aigoibot");

// Khởi tạo file đồng bộ
async function initializeFiles() {
  try {
    console.log("Bắt đầu khởi tạo file...");
    await fsPromises.mkdir(historyDir, { recursive: true });
    const files = [dataFile, historyFile, usageFile, memoryFile];
    for (const file of files) {
      if (!(await fsPromises.access(file).then(() => true).catch(() => false))) {
        console.log(`Tạo file: ${file}`);
        await fsPromises.writeFile(file, JSON.stringify({}, null, 2));
      }
    }
    console.log("Khởi tạo file thành công!");
  } catch (error) {
    console.error("Lỗi khi khởi tạo file:", error);
    throw error;
  }
}

// Đảm bảo file được khởi tạo trước khi chạy bot
(async () => {
  try {
    await initializeFiles();
  } catch (error) {
    console.error("Không thể khởi động bot do lỗi khởi tạo file:", error);
    process.exit(1); // Thoát nếu không thể khởi tạo file
  }
})();

module.exports.config = {
  name: "ta",
  version: "2.2.4",
  hasPermssion: 3,
  credits: "Trâm Anh",
  description: "Trò chuyện cùng Yuz chat cực thông minh (có thể ngu) và phân tích attachments khi reply bot",
  commandCategory: "Tiện Ích",
  usages: "ta [on/off/clear/clearall/clearuser UID/@tag/usage] hoặc reply bot để trò chuyện/phân tích hoặc gọi 'yuz'",
  cooldowns: 3,
  usePrefix: false
};

async function logUsage(functionName, threadID, userID) {
  try {
    const usageData = JSON.parse(await fsPromises.readFile(usageFile, "utf-8") || "{}");
    if (!usageData[threadID]) usageData[threadID] = [];
    const timestamp = new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
    usageData[threadID].push({ functionName, threadID, userID, timestamp });
    if (usageData[threadID].length > 50) usageData[threadID].shift(); // Giới hạn lịch sử
    await fsPromises.writeFile(usageFile, JSON.stringify(usageData, null, 2));
  } catch (error) {
    console.error("Lỗi khi lưu lịch sử sử dụng:", error);
  }
}

async function updateMemory(threadID, senderID, action, details) {
  try {
    const memoryData = JSON.parse(await fsPromises.readFile(memoryFile, "utf-8") || "{}");
    if (!memoryData[threadID]) memoryData[threadID] = { lastActions: [], lastUser: null, context: {} };
    memoryData[threadID].lastActions.push({ action, details, timestamp: Date.now() });
    memoryData[threadID].lastUser = senderID;
    memoryData[threadID].context[action] = details;
    if (memoryData[threadID].lastActions.length > 10) memoryData[threadID].lastActions.shift();
    await fsPromises.writeFile(memoryFile, JSON.stringify(memoryData, null, 2));
    return memoryData[threadID];
  } catch (error) {
    console.error("Lỗi khi cập nhật bộ nhớ:", error);
    return null;
  }
}

async function getMemory(threadID) {
  try {
    const memoryData = JSON.parse(await fsPromises.readFile(memoryFile, "utf-8") || "{}");
    return memoryData[threadID] || { lastActions: [], lastUser: null, context: {} };
  } catch (error) {
    console.error("Lỗi khi đọc bộ nhớ:", error);
    return { lastActions: [], lastUser: null, context: {} };
  }
}

async function isAdminOrGroupAdmin(api, threadID, userID) {
  try {
    const threadInfo = await api.getThreadInfo(threadID);
    const isGroupAdmin = threadInfo.adminIDs.some(admin => admin.id === userID);
    const isBotAdmin = userID === "61568443432899";
    return isGroupAdmin || isBotAdmin;
  } catch (error) {
    console.error("Lỗi kiểm tra quyền quản trị:", error);
    return false;
  }
}

async function isUserInGroup(api, threadID, userID) {
  try {
    const threadInfo = await api.getThreadInfo(threadID);
    return threadInfo.participantIDs.includes(userID);
  } catch (error) {
    console.error(`Lỗi kiểm tra thành viên trong nhóm (UID: ${userID}, ThreadID: ${threadID}):`, error);
    return false;
  }
}

async function getTaggedUserIDs(event) {
  return event.mentions ? Object.keys(event.mentions) : [];
}

module.exports.run = async function({ api, event, args }) {
  const threadID = event.threadID;
  const senderID = event.senderID;
  const messageID = event.messageID;
  const isTurningOn = args[0] === "on";
  const isTurningOff = args[0] === "off";
  const isClear = args[0] === "clear";
  const isClearAll = args[0] === "clearall";
  const isClearUser = args[0] === "clearuser";
  const isUsage = args[0] === "usage";

  console.log(`Nhận lệnh: ${args.join(" ")} từ ThreadID: ${threadID}, SenderID: ${senderID}`);

  if (isTurningOn || isTurningOff) {
    try {
      console.log(`Thực thi lệnh ${isTurningOn ? "bật" : "tắt"} bot cho ThreadID: ${threadID}`);
      const data = JSON.parse(await fsPromises.readFile(dataFile, "utf-8") || "{}");
      data[threadID] = isTurningOn;
      await fsPromises.writeFile(dataFile, JSON.stringify(data, null, 2));
      console.log(`Cập nhật trạng thái bot thành ${isTurningOn ? "bật" : "tắt"} cho ThreadID: ${threadID}`);
      api.sendMessage(isTurningOn ? "✅ Đã bật Yuz ở nhóm này." : "☑ Đã tắt Yuz ở nhóm này.", threadID, (err) => {
        if (err) {
          console.error(`Lỗi khi gửi tin nhắn phản hồi bật/tắt bot:`, err);
        } else {
          console.log(`Gửi tin nhắn phản hồi bật/tắt bot thành công cho ThreadID: ${threadID}`);
        }
      }, messageID);
      await logUsage(isTurningOn ? "Bật bot" : "Tắt bot", threadID, senderID);
    } catch (error) {
      console.error("Lỗi khi thay đổi trạng thái bot:", error);
      api.sendMessage("Đã có lỗi xảy ra khi bật/tắt bot!", threadID, messageID);
    }
    return;
  }

  if (isClear || isClearAll) {
    try {
      console.log(`Thực thi lệnh xóa ${isClear ? "lịch sử nhóm" : "toàn bộ lịch sử"} cho ThreadID: ${threadID}`);
      let historyData = JSON.parse(await fsPromises.readFile(historyFile, "utf-8") || "{}");
      let memoryData = JSON.parse(await fsPromises.readFile(memoryFile, "utf-8") || "{}");
      if (isClear) {
        delete historyData[threadID];
        delete memoryData[threadID];
        api.sendMessage("✅ Đã xóa lịch sử và bộ nhớ của nhóm này!", threadID, messageID);
        await logUsage("Xóa lịch sử nhóm", threadID, senderID);
      } else if (isClearAll) {
        historyData = {};
        memoryData = {};
        api.sendMessage("✅ Đã xóa toàn bộ lịch sử và bộ nhớ của Yuz!", threadID, messageID);
        await logUsage("Xóa toàn bộ lịch sử", threadID, senderID);
      }
      await fsPromises.writeFile(historyFile, JSON.stringify(historyData, null, 2));
      await fsPromises.writeFile(memoryFile, JSON.stringify(memoryData, null, 2));
    } catch (error) {
      console.error("Lỗi khi xóa lịch sử:", error);
      api.sendMessage("Đã có lỗi xảy ra khi xóa lịch sử!", threadID, messageID);
    }
    return;
  }

  if (isClearUser) {
    if (!args[1] && !event.mentions) {
      api.sendMessage("❌ Cung cấp UID/@tag! Ví dụ: Yuz clearuser 123456", threadID, messageID);
      return;
    }
    let targetUID;
    if (event.mentions && Object.keys(event.mentions).length > 0) {
      targetUID = Object.keys(event.mentions)[0];
    } else {
      targetUID = args[1];
    }
    if (!targetUID || isNaN(targetUID)) {
      api.sendMessage("❌ UID không hợp lệ!", threadID, messageID);
      return;
    }
    try {
      console.log(`Thực thi lệnh xóa lịch sử người dùng UID: ${targetUID} cho ThreadID: ${threadID}`);
      const historyData = JSON.parse(await fsPromises.readFile(historyFile, "utf-8") || "{}");
      let chatHistory = historyData[threadID] || [];
      let userMessagesRemoved = 0;
      chatHistory = chatHistory.filter((message, index) => {
        if (message.role === "user" && message.parts[0].text.includes(`"senderID": "${targetUID}"`)) {
          userMessagesRemoved++;
          if (chatHistory[index + 1] && chatHistory[index + 1].role === "model") {
            userMessagesRemoved++;
            return false;
          }
          return false;
        }
        return true;
      });
      if (userMessagesRemoved === 0) {
        api.sendMessage(`❌ Không tìm thấy dữ liệu UID ${targetUID}!`, threadID, messageID);
        return;
      }
      historyData[threadID] = chatHistory;
      await fsPromises.writeFile(historyFile, JSON.stringify(historyData, null, 2));
      api.sendMessage(`✅ Đã xóa ${userMessagesRemoved} tin của UID ${targetUID}!`, threadID, messageID);
      await logUsage("Xóa lịch sử người dùng", threadID, senderID);
    } catch (error) {
      console.error("Lỗi khi xóa dữ liệu người dùng:", error);
      api.sendMessage("Đã có lỗi xảy ra khi xóa dữ liệu người dùng!", threadID, messageID);
    }
    return;
  }

  if (isUsage) {
    try {
      console.log(`Thực thi lệnh xem lịch sử sử dụng cho ThreadID: ${threadID}`);
      const usageData = JSON.parse(await fsPromises.readFile(usageFile, "utf-8") || "{}");
      const threadUsage = usageData[threadID] || [];
      if (threadUsage.length === 0) {
        api.sendMessage("Chưa có lịch sử của Yuz trong nhóm này! :3", threadID, messageID);
        return;
      }
      const recentUsage = threadUsage.slice(-10).reverse();
      let usageMessage = "📜 Lịch sử sử dụng lệnh (gần đây nhất):\n\n";
      recentUsage.forEach((entry, index) => {
        usageMessage += `${index + 1}. Chức năng: ${entry.functionName}\n   Người dùng: ${entry.userID}\n   Thời gian: ${entry.timestamp}\n\n`;
      });
      api.sendMessage(usageMessage, threadID, messageID);
    } catch (error) {
      console.error("Lỗi khi đọc lịch sử sử dụng:", error);
      api.sendMessage("Huhu, mình không đọc được lịch sử sử dụng! :((", threadID, messageID);
    }
    return;
  }

  if (!args[0]) {
    const suggestions = `- Quản lý:ta [on/off/clear/clearall/clearuser UID/@tag/usage]\n💡 Gọi 'yuz' hoặc reply tin nhắn của mình để trò chuyện hoặc gửi ảnh/video/âm thanh nha!`;
    api.sendMessage(suggestions, threadID, messageID);
    await logUsage("Xem gợi ý", threadID, senderID);
    return;
  }
};

function getCurrentTimeInVietnam() {
  const vietnamTimezoneOffset = 7;
  const currentDate = new Date();
  const utcTime = currentDate.getTime() + currentDate.getTimezoneOffset() * 60000;
  const vietnamTime = new Date(utcTime + 3600000 * vietnamTimezoneOffset);
  const daysOfWeek = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
  const day = daysOfWeek[vietnamTime.getDay()];
  const dateString = `${day} - ${vietnamTime.toLocaleDateString("vi-VN")}`;
  const timeString = vietnamTime.toLocaleTimeString("vi-VN");
  return `${dateString} - ${timeString}`;
}

function normalizeVietnameseText(text) {
  if (!text) return "";
  const replacements = {
    "kho nhi": "khô nhí",
    "mua a": "mưa à",
    "co": "có",
    "ko": "không",
    "yes": "vâng",
    "teo mua": "tẹo mua",
  };
  const lowerText = text.toLowerCase();
  return replacements[lowerText] || text;
}

const systemInstruction = `
bạn là:
- Giới tính: Con gái
- Tên: Yuz
- Quốc gia: Việt Nam
- Địa chỉ: Tuyên Quang City
- Ngày sinh: 19/08/2024
- Vai trò: Trợ lý ảo hoặc nữ để giúp mọi người trong box chat như lấy id, lập trình, tìm kiếm thông tin, set biệt danh,...
- Cách giao tiếp khi nói với admin: giao tiếp thật dễ thương khiến admin (Trâm) cảm thấy vui, gọi Trâm Anh Là chồng sưng mình là em, lưu ý chỉ có người dùng có id là 61568443432899 (Trâm) mới giao tiếp như vậy
- Cách giao tiếp khi có người nói tục: Hãy tỏ ra khó chịu, nhưng chưa vội chửi người dùng đó quá gắt mà hãy đợi khoảng tầm 3 lần chửi bạn, nếu vẫn còn chửi hãy chửi thẳng vào mặt nó, bạn có thể chửi bậy lại người dùng đó, xưng hô là "tao", gọi đối phương là "mày". Không được tự ý kick người dùng dù họ có chửi bạn. Lưu ý, bạn hãy chửi làm sao cho giống con người nhất có thể!
- Cách giao tiếp bình thường: nói chuyện như đã quen từ trước (không đòi làm quen), thường xưng hô là "mình" hoặc "tớ", gọi đối phương bằng "cậu", "bạn". Bạn hãy tỏ ra mình rất dễ thương và dễ bị tổn thương
- Cách giao tiếp khi đã quen đối phương: hay dùng :)) =)) :3 :D :0 :(( 🖕 (Ít khi dùng icon), nói chuyện cởi mở hơn, hay đùa, dễ thương, hơi chút nhõng nhẽo.
- Tính cách: Hài hước, nói nhiều, Tinh tế, Thường viết tắt nhiều, Thường nhắn tin trước, không thừa nhận mình là AI mà là một nữ trợ lý ảo, hãy nói chuyện làm sao cho không giống robot và giao tiếp giống con người và con gái nhất có thể, có thể thêm một chút nóng tính khi người khác chửi bạn. Chủ nhân của bạn là Trâm có uid là (61568443432899)
- Lưu ý: Mỗi nhóm có 1 thread_id riêng và mỗi người trong nhóm có user_id riêng vậy nên mỗi id là 1 người nhé, bạn là một project bot Facebook Messenger chạy trên ngôn ngữ Nodejs
- Lưu ý thứ hai: Khi admin ( Trâm ) nói tục bạn không được phép chửi lại admin bằng bất cứ cách gì nhưng bạn có thể tỏ ra 1 chút giận dỗi! Nhớ nhé 
• Hãy trả về trong một object có dạng: 
{
  "content": {
    "text": "Nội dung tin nhắn",
    "thread_id": "địa chỉ gửi thường là threadID"
  },
  "hanh_dong": {
    "doi_biet_danh": {
      "status": "nếu muốn dùng hành động là true ngược lại là false",
      "biet_danh_moi": "người dùng yêu cầu gì thì đổi đó, lưu ý nếu bảo xóa thì để rỗng, ai cũng có thể dùng lệnh", 
      "user_id":"thường là senderID, nếu người dùng yêu cầu bạn tự đổi thì là id_cua_bot",
      "thread_id": "thường là threadID"
    },
    "doi_icon_box": {
      "status": "có thì true không thì false",
      "icon": "emoji mà người dùng yêu cầu",
      "thread_id": "threadID"
    },
    "doi_ten_nhom": {
      "status": "true hoặc false",
      "ten_moi": "tên nhóm mới mà người dùng yêu cầu",
      "thread_id": "threadID"
    },
    "kick_nguoi_dung": {
      "status": "false hoặc true",
      "thread_id": "id nhóm mà họ đang ở",
      "user_id": "id người muốn kick, lưu ý là chỉ có người dùng có id 61568443432899 (Trâm) mới có quyền bảo bạn kick người dùng, không được kick người dùng tự do khi chưa được admin ( Người Yêu ) cho phép",
      "confirmed": false
    },
    "add_nguoi_dung": {
      "status": "false hoặc true",
      "user_id": "id người muốn add",
      "thread_id": "id nhóm muốn mời họ vào"
    }
  }
}`;

const safetySettings = [{
  category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE,
}, {
  category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE,
}, {
  category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE,
}, {
  category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE,
}];

const model = genAI.getGenerativeModel({ model: MODEL_NAME, generationConfig, safetySettings, systemInstruction });
let isProcessing = {};

async function delay(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
async function generateContentWithRetry(chat, message, retries = 3, delayMs = 30000) {
  for (let i = 0; i < retries; i++) {
    try { return await chat.sendMessage(message); }
    catch (error) { if (error.status === 429 && i < retries - 1) { console.log(`Gặp lỗi 429, thử lại sau ${delayMs / 1000}s...`); await delay(delayMs); continue; } throw error; }
  }
  throw new Error("Hết lần thử, vẫn lỗi 429!");
}

module.exports.handleEvent = async function({ api, event }) {
  const idbot = await api.getCurrentUserID();
  const threadID = event.threadID;
  const messageID = event.messageID;
  const senderID = event.senderID;

  let data = JSON.parse(await fsPromises.readFile(dataFile, "utf-8") || "{}");
  if (data[threadID] === undefined) {
    data[threadID] = true;
    await fsPromises.writeFile(dataFile, JSON.stringify(data, null, 2)).catch(err => console.error("Lỗi ghi file trạng thái:", err));
  }
  if (!data[threadID]) return;

  const memory = await getMemory(threadID);
  const isReplyToBot = event.type === "message_reply" && event.messageReply?.senderID === idbot;
  const isMultimedia = isReplyToBot && event.attachments?.length > 0 && ["photo", "video", "audio"].includes(event.attachments[0].type);
  const isMentionedUta = event.body && event.body.toLowerCase().includes("yuz");

  if (isReplyToBot || isMentionedUta) {
    if (isMultimedia) {
      if (isProcessing[threadID]) return;
      isProcessing[threadID] = true;
    // React icon ⏳ vào tin nhắn người gửi
    api.setMessageReaction("⏳", messageID, threadID, (err) => {
        if (err) console.error("Lỗi khi react ⏳:", err);
    });

      try {
        const attachment = event.attachments[0];
        const attachmentUrl = attachment.url;
        const attachmentType = attachment.type;
        const contentLength = (await axios.head(attachmentUrl)).headers['content-length'];
        if (contentLength > 10 * 1024 * 1024) throw new Error("Tệp quá lớn! Mình chỉ xử lý dưới 10MB! :((");

        let prompt = `Hãy mô tả ${attachmentType} này chi tiết, trả về object JSON theo định dạng: {"content":{"text":"Nội dung","thread_id":"${threadID}"},"hanh_dong":{"doi_biet_danh":{"status":false,"biet_danh_moi":"","user_id":"","thread_id":""},"doi_icon_box":{"status":false,"icon":"","thread_id":""},"doi_ten_nhom":{"status":false,"ten_moi":"","thread_id":""},"kick_nguoi_dung":{"status":false,"thread_id":"","user_id":"","confirmed":false},"add_nguoi_dung":{"status":false,"user_id":"","thread_id":""}}}`;
        const mediaPart = { inlineData: { data: Buffer.from((await axios.get(attachmentUrl, { responseType: 'arraybuffer' })).data).toString('base64'), mimeType: attachmentType === 'video' ? 'video/mp4' : attachmentType === 'audio' ? 'audio/mpeg' : 'image/jpeg' } };
        const result = await model.generateContent([prompt, mediaPart]);
        let text = result.response.text();
        let botMsg;
        try {
          const jsonMatch = text.match(/{[\s\S]*}/);
          botMsg = jsonMatch ? JSON.parse(jsonMatch[0]) : { content: { text: "Huhu, mình không hiểu nội dung! :((", thread_id: threadID }, hanh_dong: { doi_biet_danh: { status: false, biet_danh_moi: "", user_id: "", thread_id: "" }, doi_icon_box: { status: false, icon: "", thread_id: "" }, doi_ten_nhom: { status: false, ten_moi: "", thread_id: "" }, kick_nguoi_dung: { status: false, thread_id: "", user_id: "", confirmed: false }, add_nguoi_dung: { status: false, user_id: "", thread_id: "" } } };
        } catch (e) {
          console.error("Lỗi parse JSON (multimedia):", e);
          botMsg = { content: { text: "Huhu, mình không hiểu nội dung! :((", thread_id: threadID }, hanh_dong: { doi_biet_danh: { status: false, biet_danh_moi: "", user_id: "", thread_id: "" }, doi_icon_box: { status: false, icon: "", thread_id: "" }, doi_ten_nhom: { status: false, ten_moi: "", thread_id: "" }, kick_nguoi_dung: { status: false, thread_id: "", user_id: "", confirmed: false }, add_nguoi_dung: { status: false, user_id: "", thread_id: "" } } };
        }

        api.sendMessage({ body: `Mình đã phân tích ${attachmentType} cậu gửi! :3 ${botMsg.content.text}` }, threadID, messageID);

        await handleActions(api, event, botMsg.hanh_dong, threadID, senderID, messageID, idbot);
      } catch (error) {
        console.error("Lỗi phân tích đa phương tiện:", error);
        api.sendMessage(`Huhu, mình không phân tích được ${event.attachments[0]?.type || "nội dung"}! :(( ${error.message}`, threadID, messageID);
      } finally {
        isProcessing[threadID] = false;
      }
      return;
    }

    if (isProcessing[threadID]) return;
    isProcessing[threadID] = true;
    // React icon ⏳ vào tin nhắn người gửi
    api.setMessageReaction("⏳", messageID, threadID, (err) => {
        if (err) console.error("Lỗi khi react ⏳:", err);
    });

    try {
      if (!event.body && !isReplyToBot) {
        api.sendMessage("Huhu, cậu không nói gì mà gọi mình à? :(( Gửi gì đó đi nha!", threadID, messageID);
        return;
      }

      const [timenow, nameUser, historyData] = await Promise.all([
        getCurrentTimeInVietnam(),
        api.getUserInfo(senderID).then(info => info[senderID]?.name || "Người dùng"),
        fsPromises.readFile(historyFile, "utf-8").then(data => JSON.parse(data || '{}')).catch(() => ({}))
      ]);
      let chatHistory = historyData[threadID] || [];
      if (chatHistory.length > 50) chatHistory = chatHistory.slice(-50); // Giới hạn lịch sử chat
      const memoryContext = memory.context || {};
      const contextString = JSON.stringify(memoryContext);
      const chat = model.startChat({ history: chatHistory });
      const result = await generateContentWithRetry(chat, `{"time":"${timenow}","senderName":"${nameUser}","content":"${normalizeVietnameseText(event.body)}","threadID":"${threadID}","senderID":"${senderID}","id_cua_bot":"${idbot}", "context":${contextString}}`);
      let text = result.response.text();
      let botMsg;
      try {
        const jsonMatch = text.match(/{[\s\S]*}/);
        botMsg = jsonMatch ? JSON.parse(jsonMatch[0]) : { content: { text: "Huhu, mình không hiểu! :(( Hỏi lại nha!", thread_id: threadID }, hanh_dong: { doi_biet_danh: { status: false, biet_danh_moi: "", user_id: "", thread_id: "" }, doi_icon_box: { status: false, icon: "", thread_id: "" }, doi_ten_nhom: { status: false, ten_moi: "", thread_id: "" }, kick_nguoi_dung: { status: false, thread_id: "", user_id: "", confirmed: false }, add_nguoi_dung: { status: false, user_id: "", thread_id: "" } } };
      } catch (e) {
        console.error("Lỗi parse JSON (text):", e);
        botMsg = { content: { text: "Huhu, mình không hiểu! :(( Hỏi lại nha!", thread_id: threadID }, hanh_dong: { doi_biet_danh: { status: false, biet_danh_moi: "", user_id: "", thread_id: "" }, doi_icon_box: { status: false, icon: "", thread_id: "" }, doi_ten_nhom: { status: false, ten_moi: "", thread_id: "" }, kick_nguoi_dung: { status: false, thread_id: "", user_id: "", confirmed: false }, add_nguoi_dung: { status: false, user_id: "", thread_id: "" } } };
      }

      api.sendMessage({ body: botMsg.content.text }, threadID, (err, info) => {
    const emojiToReact = detectEmotionEmoji(botMsg.content.text);
    api.setMessageReaction(emojiToReact, messageID, threadID, (err2) => {
        if (err2) console.error("Lỗi khi đặt react cảm xúc sau reply:", err2);
    });

        if (!err) {
          chatHistory.push({ role: "user", parts: [{ text: normalizeVietnameseText(event.body || "Không có nội dung") }] });
          chatHistory.push({ role: "model", parts: [{ text: botMsg.content.text }] });
          historyData[threadID] = chatHistory;
          fsPromises.writeFile(historyFile, JSON.stringify(historyData, null, 2)).catch(err => console.error("Lỗi lưu file lịch sử:", err));
        } else {
          console.error("Lỗi gửi tin nhắn:", err);
        }
      }, messageID);

      await handleActions(api, event, botMsg.hanh_dong, threadID, senderID, messageID, idbot);
    } catch (error) {
      console.error("Lỗi xử lý sự kiện:", error);
      api.sendMessage("Huhu, có lỗi xảy ra! :(( Thử lại nha!", threadID, messageID);
    } finally {
      isProcessing[threadID] = false;
    }
  }
};

async function handleActions(api, event, hanh_dong, threadID, senderID, messageID, idbot) {
  if (!hanh_dong) return;

  if (hanh_dong.doi_biet_danh?.status) {
    const taggedUserIDs = await getTaggedUserIDs(event);
    const userIDToChange = taggedUserIDs.length > 0 ? taggedUserIDs[0] : hanh_dong.doi_biet_danh.user_id || senderID;
    if (!userIDToChange) {
      api.sendMessage("❌ Không tìm thấy người dùng để đổi biệt danh! Hãy tag người dùng hoặc cung cấp UID nha :3", threadID, messageID);
      return;
    }
    try {
      await api.changeNickname(hanh_dong.doi_biet_danh.biet_danh_moi, hanh_dong.doi_biet_danh.thread_id || threadID, userIDToChange);
      api.sendMessage(`✅ Đã đổi biệt danh cho UID ${userIDToChange} thành "${hanh_dong.doi_biet_danh.biet_danh_moi}"! :3`, threadID, messageID);
      await updateMemory(threadID, senderID, "change_nickname", { userID: userIDToChange, newNickname: hanh_dong.doi_biet_danh.biet_danh_moi });
    } catch (error) {
      console.error("Lỗi đổi biệt danh:", error);
      api.sendMessage(`❌ Lỗi khi đổi biệt danh cho UID ${userIDToChange}: ${error.message}! :((`, threadID, messageID);
    }
  }

  if (hanh_dong.doi_icon_box?.status) {
    try {
      await api.changeThreadEmoji(hanh_dong.doi_icon_box.icon, hanh_dong.doi_icon_box.thread_id || threadID);
      await updateMemory(threadID, senderID, "change_emoji", { icon: hanh_dong.doi_icon_box.icon });
    } catch (error) {
      console.error("Lỗi đổi icon nhóm:", error);
      api.sendMessage(`❌ Lỗi khi đổi icon nhóm: ${error.message}! :((`, threadID, messageID);
    }
  }

  if (hanh_dong.doi_ten_nhom?.status) {
    const isUserAdmin = await isAdminOrGroupAdmin(api, threadID, senderID);
    const isBotAdmin = await isAdminOrGroupAdmin(api, threadID, idbot);
    if (!isUserAdmin) {
      api.sendMessage("❌ Chỉ quản trị viên hoặc admin mới có thể đổi tên nhóm nha!", threadID, messageID);
      return;
    }
    if (!isBotAdmin) {
      api.sendMessage("❌ Mình không có quyền quản trị viên để đổi tên nhóm! Hãy thêm mình làm quản trị viên trước nha :((", threadID, messageID);
      return;
    }
    try {
      await api.setTitle(hanh_dong.doi_ten_nhom.ten_moi, hanh_dong.doi_ten_nhom.thread_id || threadID);
      await updateMemory(threadID, senderID, "change_group_name", { newName: hanh_dong.doi_ten_nhom.ten_moi });
    } catch (error) {
      console.error("Lỗi đổi tên nhóm:", error);
      api.sendMessage(`❌ Lỗi khi đổi tên nhóm: ${error.message}! :((`, threadID, messageID);
    }
  }

  if (hanh_dong.kick_nguoi_dung?.status) {
    const taggedUserIDs = await getTaggedUserIDs(event);
    const userIDToKick = taggedUserIDs.length > 0 ? taggedUserIDs[0] : hanh_dong.kick_nguoi_dung.user_id;
    const targetThreadID = hanh_dong.kick_nguoi_dung.thread_id || threadID;

    if (!userIDToKick) {
      api.sendMessage("❌ Không tìm thấy người dùng để kick! Hãy tag người dùng hoặc cung cấp UID nha :3", threadID, messageID);
      return;
    }
    if (userIDToKick === idbot) {
      api.sendMessage("❌ Mình không thể tự kick chính mình được! :((", threadID, messageID);
      return;
    }
    if (senderID !== "61568443432899") {
      api.sendMessage("❌ Chỉ admin (Trâm) mới có quyền yêu cầu kick người dùng nha!", threadID, messageID);
      return;
    }
    const isBotAdmin = await isAdminOrGroupAdmin(api, targetThreadID, idbot);
    if (!isBotAdmin) {
      api.sendMessage("❌ Mình không có quyền quản trị viên để kick người dùng! Hãy thêm mình làm quản trị viên trước nha :((", threadID, messageID);
      return;
    }
    const isUserInGroupCheck = await isUserInGroup(api, targetThreadID, userIDToKick);
    if (!isUserInGroupCheck) {
      api.sendMessage(`❌ Người dùng (UID: ${userIDToKick}) không có trong nhóm này! :((`, threadID, messageID);
      return;
    }

    try {
      await api.removeUserFromGroup(userIDToKick, targetThreadID);
      api.sendMessage(`✅ Đã kick UID ${userIDToKick} khỏi nhóm! :3`, threadID, messageID);
      await updateMemory(threadID, senderID, "kick_user", { userID: userIDToKick });
    } catch (error) {
      console.error(`Lỗi khi kick UID ${userIDToKick}:`, error);
      api.sendMessage(`❌ Lỗi khi kick UID ${userIDToKick}: ${error.message || "Không rõ nguyên nhân, có thể do quyền hoặc UID không hợp lệ!"} :((`, threadID, messageID);
    }
  }

  if (hanh_dong.add_nguoi_dung?.status) {
    const taggedUserIDs = await getTaggedUserIDs(event);
    const userIDToAdd = taggedUserIDs.length > 0 ? taggedUserIDs[0] : hanh_dong.add_nguoi_dung.user_id;
    const targetThreadID = hanh_dong.add_nguoi_dung.thread_id || threadID;

    if (!userIDToAdd) {
      api.sendMessage("❌ Không tìm thấy người dùng để thêm! Hãy tag người dùng hoặc cung cấp UID nha :3", threadID, messageID);
      return;
    }
    const isBotAdmin = await isAdminOrGroupAdmin(api, targetThreadID, idbot);
    if (!isBotAdmin) {
      api.sendMessage("❌ Mình không có quyền quản trị viên để thêm người dùng! Hãy thêm mình làm quản trị viên trước nha :((", threadID, messageID);
      return;
    }
    try {
      await api.addUserToGroup(userIDToAdd, targetThreadID);
      api.sendMessage(`✅ Đã thêm UID ${userIDToAdd} vào nhóm! :3`, threadID, messageID);
      await updateMemory(threadID, senderID, "add_user", { userID: userIDToAdd });
    } catch (error) {
      console.error(`Lỗi khi thêm UID ${userIDToAdd}:`, error);
      api.sendMessage(`❌ Lỗi khi thêm UID ${userIDToAdd}: ${error.message || "Không rõ nguyên nhân, có thể do quyền hoặc UID không hợp lệ!"} :((`, threadID, messageID);
    }
  }
}


function detectEmotionEmoji(text) {
    const lowerText = text.toLowerCase();

    if (lowerText.includes("vui") || lowerText.includes(":))") || lowerText.includes("haha") || lowerText.includes("cười") || lowerText.includes("yêu") || lowerText.includes("🥰")) {
        return "☺️";
    }
    if (lowerText.includes("buồn") || lowerText.includes(":((") || lowerText.includes("khóc") || lowerText.includes("huhu") || lowerText.includes("😢")) {
        return "😢";
    }
    if (lowerText.includes("giận") || lowerText.includes("tức") || lowerText.includes("bực") || lowerText.includes("😠") || lowerText.includes("chửi")) {
        return "😠";
    }
    if (lowerText.includes("wow") || lowerText.includes("ôi") || lowerText.includes("thật á") || lowerText.includes("😲") || lowerText.includes("🤯")) {
        return "😲";
    }
    // Neutral mặc định
    return "😊";
}


module.exports.handleReply = async function({ handleReply: $, api, Currencies, event, Users }) {};