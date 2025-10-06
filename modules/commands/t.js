const stk = "tk"
const pass = "pass"
const name = "name"

const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { createCanvas } = require("canvas");

const DATA_PATH = path.join(__dirname, "cache", "tx_data.json");
const HISTORY_PATH = path.join(__dirname, "cache", "tx_history.json");
const ADMIN_GROUP_ID = "10054936974584618";
const CHECK_INTERVAL = 10000;
const TIMEOUT = 20 * 60 * 1000;

if (!fs.existsSync(DATA_PATH)) fs.writeFileSync(DATA_PATH, "{}");
if (!fs.existsSync(HISTORY_PATH)) fs.writeFileSync(HISTORY_PATH, "{}");

const RATE_PATH = path.join(__dirname, "cache", "tx_rate.json");
if (!fs.existsSync(RATE_PATH)) fs.writeFileSync(RATE_PATH, JSON.stringify({ lose: 0 }));

const RUT_PATH = path.join(__dirname, "cache", "tx_rut.json");
if (!fs.existsSync(RUT_PATH)) fs.writeFileSync(RUT_PATH, "[]");

function getData() {
  return JSON.parse(fs.readFileSync(DATA_PATH, "utf-8"));
}
function setData(data) {
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
}
function getHistory() {
  return JSON.parse(fs.readFileSync(HISTORY_PATH, "utf-8"));
}
function setHistory(data) {
  fs.writeFileSync(HISTORY_PATH, JSON.stringify(data, null, 2));
}
function getRate() {
  return JSON.parse(fs.readFileSync(RATE_PATH, "utf-8"));
}
function setRate(rate) {
  fs.writeFileSync(RATE_PATH, JSON.stringify(rate, null, 2));
}
function getRutList() {
  return JSON.parse(fs.readFileSync(RUT_PATH, "utf-8"));
}
function setRutList(list) {
  fs.writeFileSync(RUT_PATH, JSON.stringify(list, null, 2));
}

function formatMoney(money) {
  return Number(money).toLocaleString("vi-VN");
}

function drawDice(diceArr) {
  const size = 80, gap = 10;
  const canvas = createCanvas(size * diceArr.length + gap * (diceArr.length - 1), size);
  const ctx = canvas.getContext("2d");
  for (let i = 0; i < diceArr.length; i++) {
    ctx.save();
    ctx.translate(i * (size + gap), 0);
    ctx.fillStyle = "#fff";
    ctx.strokeStyle = "#222";
    ctx.lineWidth = 4;
    ctx.fillRect(0, 0, size, size);
    ctx.strokeRect(0, 0, size, size);
    ctx.fillStyle = "#222";
    const dot = (x, y) => {
      ctx.beginPath();
      ctx.arc(x, y, 8, 0, 2 * Math.PI);
      ctx.fill();
    };
    if (diceArr[i] == 1) dot(size / 2, size / 2);
    if (diceArr[i] == 2) dot(size / 4, size / 4), dot((3 * size) / 4, (3 * size) / 4);
    if (diceArr[i] == 3) dot(size / 4, size / 4), dot(size / 2, size / 2), dot((3 * size) / 4, (3 * size) / 4);
    if (diceArr[i] == 4) dot(size / 4, size / 4), dot((3 * size) / 4, size / 4), dot(size / 4, (3 * size) / 4), dot((3 * size) / 4, (3 * size) / 4);
    if (diceArr[i] == 5) dot(size / 4, size / 4), dot((3 * size) / 4, size / 4), dot(size / 2, size / 2), dot(size / 4, (3 * size) / 4), dot((3 * size) / 4, (3 * size) / 4);
    if (diceArr[i] == 6) dot(size / 4, size / 4), dot((3 * size) / 4, size / 4), dot(size / 4, size / 2), dot((3 * size) / 4, size / 2), dot(size / 4, (3 * size) / 4), dot((3 * size) / 4, (3 * size) / 4);
    ctx.restore();
  }
  const filePath = path.join(__dirname, "cache", `dice_${Date.now()}.png`);
  fs.writeFileSync(filePath, canvas.toBuffer());
  return filePath;
}

module.exports.config = {
  name: "t",
  version: "1.0.0",
  hasPermssion: 0,
  credits: "Dũngkon",
  description: "Tài xỉu chuyển khoản tự động, canvas xúc xắc đẹp",
  commandCategory: "Game",
  usages: "tx [nap|tài|xỉu|ví|history|check|list|add|del|rut]",
  cooldowns: 1
};

module.exports.run = async function({ api, event, args }) {
  const { threadID, senderID, messageID, mentions, type, messageReply } = event;
  const data = getData();
  const history = getHistory();
  const rate = getRate();
  const isAdmin = global.config.ADMINBOT?.includes(senderID) || global.config.ADMIN?.includes(senderID);

  if (args[0] == "admin" && args[1] == "rate" && isAdmin) {
    return api.sendMessage(
      `🔎 Tỉ lệ thua tài xỉu hiện tại đang là: ${rate.lose}%`,
      threadID,
      messageID
    );
  }

  if (args[0] == "reset" && isAdmin) {
    setData({});
    setHistory({});
    setRate({ lose: 0 });
    return api.sendMessage("✅ Đã reset toàn bộ data tài xỉu!", threadID, messageID);
  }

  if (args[0] == "admin" && args[1] == "thua" && isAdmin) {
    // Thêm chức năng reset tỉ lệ
    if (args[2] && args[2].toLowerCase() === "reset") {
      rate.lose = null; // null nghĩa là random thật, không ép tỉ lệ
      setRate(rate);
      return api.sendMessage("✅ Đã reset tỉ lệ thua về chế độ ngẫu nhiên!", threadID, messageID);
    }
    const percent = parseInt(args[2]);
    if (isNaN(percent) || percent < 0 || percent > 100)
      return api.sendMessage("❎ Nhập tỉ lệ thua hợp lệ (0-100%)!", threadID, messageID);
    rate.lose = percent;
    setRate(rate);
    if (global.config.ADMIN_GROUPS) {
      global.config.ADMIN_GROUPS.forEach(gid => {
        api.sendMessage(`🔔 Admin vừa chỉnh tỉ lệ thua tài xỉu: ${percent}%`, gid);
      });
    }
    return api.sendMessage(`✅ Đã đặt tỉ lệ thua là ${percent}% (áp dụng cho toàn bộ bot)`, threadID, messageID);
  }

  if (args[0] == "check") {
    const his = history[senderID] || [];
    if (!his.length) return api.sendMessage("Bạn chưa có giao dịch cộng/trừ nào!", threadID, messageID);

    let msg = "🔎 Chi tiết giao dịch cộng/trừ của bạn:\n";
    his.slice(-30).reverse().forEach((h, i) => {
      msg += `${i + 1}. ${h.date || ""} ${h.time || ""} | ${h.type} | ${formatMoney(h.bet)}đ | ${h.result} | ${h.money > 0 ? "+" : ""}${formatMoney(h.money)}đ\n`;
    });

    return api.sendMessage(msg, threadID, messageID);
  }

  if (args[0] == "ví") {
    const balance = data[senderID]?.balance || 0;
    return api.sendMessage(`💰 Số dư tài xỉu của bạn: ${formatMoney(balance)}đ`, threadID, messageID);
  }

  if (args[0] == "history") {
    const his = history[senderID] || [];
    if (!his.length) return api.sendMessage("Bạn chưa có lịch sử chơi tài xỉu!", threadID, messageID);
    let msg = "📜 Lịch sử tài xỉu của bạn:\n";
    his.slice(-10).reverse().forEach((h, i) => {
      msg += `${i + 1}. ${h.time} | ${h.type} | ${formatMoney(h.bet)}đ | ${h.result} | ${h.money > 0 ? "+" : ""}${formatMoney(h.money)}đ\n`;
    });
    return api.sendMessage(msg, threadID, messageID);
  }

  if (args[0] == "list" && isAdmin) {
    let msg = "📋 Danh sách người chơi tài xỉu:\n";
    Object.entries(data).forEach(([uid, info], i) => {
      msg += `${i + 1}. ${uid} | Số dư: ${formatMoney(info.balance)}đ\n`;
    });
    return api.sendMessage(msg, threadID, messageID);
  }

  if ((args[0] == "add" || args[0] == "del") && isAdmin) {
    let targetID = senderID;
    let amount = parseInt(args[1]);
    if (Object.keys(mentions).length == 1) targetID = Object.keys(mentions)[0];
    else if (type == "message_reply") targetID = messageReply.senderID;
    if (isNaN(amount) || amount <= 0) return api.sendMessage("Số tiền không hợp lệ!", threadID, messageID);
    if (!data[targetID]) data[targetID] = { balance: 0 };
    if (args[0] == "add") data[targetID].balance += amount;
    else data[targetID].balance = Math.max(0, data[targetID].balance - amount);
    setData(data);

    const now = new Date();
    const dateStr = now.toLocaleDateString("vi-VN");
    const timeStr = now.toLocaleTimeString("vi-VN");
    if (!history[targetID]) history[targetID] = [];
    history[targetID].push({
      date: dateStr,
      time: timeStr,
      type: args[0] == "add" ? "admin_add" : "admin_del",
      bet: amount,
      result: args[0] == "add" ? "cộng" : "trừ",
      money: args[0] == "add" ? amount : -amount
    });
    setHistory(history);

    return api.sendMessage(
      `✅ Đã ${args[0] == "add" ? "cộng" : "trừ"} ${formatMoney(amount)}đ cho ${targetID == senderID ? "bạn" : "người chơi"}.\nSố dư mới: ${formatMoney(data[targetID].balance)}đ`,
      threadID,
      messageID
    );
  }

  if (args[0] == "nap") {
    const amount = parseInt(args[1]);
    if (isNaN(amount) || amount < 5000) return api.sendMessage("Số tiền nạp tối thiểu là 5.000đ!", threadID, messageID);
    try {
      const res = await axios.get(`https://bank.dungkon.fun/create?amount=${amount}&stk=${stk}&name=${name}`);
      const bill = res.data;
      if (!bill || !bill.id || !bill.qr_image || !bill.note) return api.sendMessage("Không tạo được hóa đơn, thử lại sau!", threadID, messageID);
      const billId = bill.id;
      const qrUrl = bill.qr_image;
      const note = bill.note;
      const tempPath = path.join(__dirname, "cache", `qr_${billId}.jpg`);
      const qrImg = await axios.get(qrUrl, { responseType: "arraybuffer" });
      fs.writeFileSync(tempPath, qrImg.data);
      await api.sendMessage({
        body: `💸 Đơn nạp tiền tài xỉu đã tạo!\n- Số tiền: ${formatMoney(amount)}đ\n- Nội dung chuyển khoản: ${note}\n- Mã hóa đơn: ${billId}\n\nChuyển khoản đúng số tiền và nội dung này. Bot sẽ tự động cộng tiền khi thanh toán thành công.`,
        attachment: fs.createReadStream(tempPath)
      }, threadID, async (err, info) => {
        fs.unlink(tempPath, () => {});
        if (err) return;
        await startCheckNap(api, threadID, senderID, amount, billId, note, messageID);
      }, messageID);
    } catch (e) {
      return api.sendMessage("Lỗi tạo hóa đơn hoặc gửi QR: " + e.message, threadID, messageID);
    }
    return;
  }

  if ((args[0] == "tài" || args[0] == "xỉu") && args[1]) {
    const betType = args[0];
    const betAmount = parseInt(args[1]);
    if (isNaN(betAmount) || betAmount < 1000) return api.sendMessage("Số tiền cược tối thiểu là 1.000đ!", threadID, messageID);
    if (!data[senderID] || data[senderID].balance < betAmount) return api.sendMessage("Bạn không đủ tiền để cược!", threadID, messageID);

    let diceArr, sum, result, win;

    if (rate.lose === 100) {
      do {
        diceArr = [1 + Math.floor(Math.random() * 6), 1 + Math.floor(Math.random() * 6), 1 + Math.floor(Math.random() * 6)];
        sum = diceArr.reduce((a, b) => a + b, 0);
        result = sum >= 11 && sum <= 17 ? "tài" : "xỉu";
      } while (betType == result);
      win = false;
    } else if (rate.lose === 0) {
      do {
        diceArr = [1 + Math.floor(Math.random() * 6), 1 + Math.floor(Math.random() * 6), 1 + Math.floor(Math.random() * 6)];
        sum = diceArr.reduce((a, b) => a + b, 0);
        result = sum >= 11 && sum <= 17 ? "tài" : "xỉu";
      } while (betType != result);
      win = true;
    } else if (rate.lose > 0 && Math.random() < rate.lose / 100) {
      do {
        diceArr = [1 + Math.floor(Math.random() * 6), 1 + Math.floor(Math.random() * 6), 1 + Math.floor(Math.random() * 6)];
        sum = diceArr.reduce((a, b) => a + b, 0);
        result = sum >= 11 && sum <= 17 ? "tài" : "xỉu";
      } while (betType == result);
      win = false;
    } else {
      diceArr = [1 + Math.floor(Math.random() * 6), 1 + Math.floor(Math.random() * 6), 1 + Math.floor(Math.random() * 6)];
      sum = diceArr.reduce((a, b) => a + b, 0);
      result = sum >= 11 && sum <= 17 ? "tài" : "xỉu";
      win = betType == result;
    }

    const moneyChange = win ? betAmount : -betAmount;
    data[senderID].balance += moneyChange;
    setData(data);
    const now = new Date();
    const dateStr = now.toLocaleDateString("vi-VN");
    const timeStr = now.toLocaleTimeString("vi-VN");
    if (!history[senderID]) history[senderID] = [];
    history[senderID].push({
      date: dateStr,
      time: timeStr,
      type: betType,
      bet: betAmount,
      result: result,
      money: moneyChange
    });
    setHistory(history);
    const dicePath = drawDice(diceArr);
    await api.sendMessage({
      body: `🎲 Kết quả: ${diceArr.join(" - ")} (Tổng: ${sum})\nKết quả: ${result.toUpperCase()}\n${win ? "🎉 Bạn thắng!" : "💔 Bạn thua!"}\nSố dư mới: ${formatMoney(data[senderID].balance)}đ`,
      attachment: fs.createReadStream(dicePath)
    }, threadID, () => fs.unlinkSync(dicePath), messageID);
    return;
  }

  if (args[0] == "rut" && args[1] == "check") {
    const rutList = getRutList().filter(r => r.userID == senderID);
    if (!rutList.length) return api.sendMessage("Bạn chưa có đơn rút tiền nào!", threadID, messageID);
    let msg = "📋 Danh sách đơn rút tiền của bạn:\n";
    rutList.forEach((r, i) => {
      msg += `${i + 1}. ${r.status == "pending" ? "⏳ Đang chờ" : r.status == "paid" ? "✅ Đã trả tiền" : "❌ Đã hủy"} | ${r.time} | ${formatMoney(r.amount)}đ | ${r.bankName} | ${r.accountNumber}\n`;
      if (r.status == "cancel") msg += `   Lý do hủy: ${r.note}\n`;
    });
    return api.sendMessage(msg, threadID, messageID);
  }

  if (args[0] == "rut") {
    // Chỉ cho phép từ 20h00 đến 22h30
    // const now = new Date();
    // const hour = now.getHours(), min = now.getMinutes();
    // if (hour < 20 || (hour > 22 || (hour == 22 && min > 30))) {
    //   return api.sendMessage("⏰ Lệnh rút chỉ hoạt động từ 20:00 đến 22:30 mỗi ngày!", threadID, messageID);
    // }
    let step = 1;
    let rutData = { author: senderID, data: {} };
    api.sendMessage("💳 Danh sách ngân hàng hỗ trợ:\n" + bankList.map((b, i) => `${i + 1}. ${b.name} (${b.code})`).join("\n") + "\n\nReply số thứ tự ngân hàng bạn muốn chọn:", threadID, (err, info) => {
      global.client.handleReply.push({
        name: module.exports.config.name,
        messageID: info.messageID,
        step,
        author: senderID,
        rutData
      });
    }, messageID);
    return;
  }

  

  if (args[0] == "rut") {
    let step = 1;
    let rutData = { author: senderID, data: {} };
    api.sendMessage("💳 Danh sách ngân hàng hỗ trợ:\n" + bankList.map((b, i) => `${i + 1}. ${b.name} (${b.code})`).join("\n") + "\n\nReply số thứ tự ngân hàng bạn muốn chọn:", threadID, (err, info) => {
      global.client.handleReply.push({
        name: module.exports.config.name,
        messageID: info.messageID,
        step,
        author: senderID,
        rutData
      });
    }, messageID);
    return;
  }

  if (args[0] == "money" && args[1] == "list" && isAdmin) {
    let page = parseInt(args[2]) || 1;
    let rutList = getRutList();
    if (!rutList.length) return api.sendMessage("Không có đơn rút tiền nào!", threadID, messageID);
    const perPage = 10;
    const maxPage = Math.ceil(rutList.length / perPage);
    if (page < 1) page = 1;
    if (page > maxPage) page = maxPage;
    let msg = `📋 Danh sách đơn rút tiền (Trang ${page}/${maxPage}):\n`;
    rutList.slice((page-1)*perPage, page*perPage).forEach((r, i) => {
      msg += `${(page-1)*perPage+i+1}. ${r.status == "pending" ? "⏳" : r.status == "paid" ? "✅" : "❌"} | ${r.time} | ${r.userID} | ${formatMoney(r.amount)}đ | ${r.bankName} | ${r.accountNumber}\n`;
      if (r.status == "cancel") msg += `   Lý do hủy: ${r.note}\n`;
    });
    msg += "\nReply 'page +số trang' để đổi trang\nReply 'paid +số thứ tự' để xác nhận đã trả tiền\nReply 'del +số thứ tự +lý do' để hủy đơn và cộng lại tiền";
    return api.sendMessage(msg, threadID, (err, info) => {
      global.client.handleReply.push({
        name: module.exports.config.name,
        messageID: info.messageID,
        step: "admin_money_list",
        author: senderID,
        page
      });
    }, messageID);
  }

  return api.sendMessage(
    "❎ Sai cú pháp!\nCác lệnh hỗ trợ:\n- tx nap +số tiền\n- tx tài/xỉu +số tiền cược\n- tx ví\n- tx history\n- tx check\n- tx list (admin)\n- tx add/del +số tiền +@tag/reply (admin)\n- tx rut (rút tiền từ 20h-22h30)",
    threadID,
    messageID
  );
};

async function startCheckNap(api, threadID, uid, amount, billId, note, replyMsgID) {
  const startTime = Date.now();
  async function check() {
    try {
      const res = await axios.get(`http://bank.dungkon.fun/status?taikhoan=${stk}&matkhau=${pass}&id=${billId}`);
      const billStatus = res.data;
      const data = getData();
      if (
        billStatus &&
        billStatus.status === "paid"
      ) {
        if (!data[uid]) data[uid] = { balance: 0 };
        data[uid].balance += amount;
        setData(data);
        return api.sendMessage(
          `✅ Đã nhận được thanh toán!\n- Số tiền: ${formatMoney(amount)}đ\n- Mã hóa đơn: ${billId}\n- Nội dung: ${note}\n\nSố dư mới: ${formatMoney(data[uid].balance)}đ`,
          threadID,
          replyMsgID
        );
      }
      if (Date.now() - startTime > TIMEOUT) {
        return api.sendMessage(
          `⏰ Hóa đơn #${billId} đã hết hạn (quá 20 phút chưa thanh toán).\nMã QR đã bị thu hồi, vui lòng tạo lại hóa đơn mới nếu muốn tiếp tục.`,
          threadID,
          replyMsgID
        );
      }
      setTimeout(check, CHECK_INTERVAL);
    } catch (e) {
      if (Date.now() - startTime > TIMEOUT) {
        return api.sendMessage(
          `⏰ Hóa đơn #${billId} đã hết hạn (quá 20 phút chưa thanh toán).\nMã QR đã bị thu hồi, vui lòng tạo lại hóa đơn mới nếu muốn tiếp tục.`,
          threadID,
          replyMsgID
        );
      }
      setTimeout(check, CHECK_INTERVAL);
    }
  }
  check();
}

const bankList = [
  { code: '970415', name: 'VietinBank' },
  { code: '970436', name: 'Vietcombank' },
  { code: '970448', name: 'OCB' },
  { code: '970418', name: 'BIDV' },
  { code: '970405', name: 'Agribank' },
  { code: '970422', name: 'MB Bank' },
  { code: '970407', name: 'Techcombank' },
  { code: '970416', name: 'ACB' },
  { code: '970432', name: 'VPBank' },
  { code: '970423', name: 'TPBank' },
  { code: '970403', name: 'Sacombank' },
  { code: '970437', name: 'HDBank' },
  { code: '970454', name: 'VietCapitalBank' },
  { code: '970429', name: 'SCB' },
  { code: '970441', name: 'VIB' },
  { code: '970443', name: 'SHB' },
  { code: '970431', name: 'Eximbank' },
  { code: '970426', name: 'MSB' },
  { code: '546034', name: 'CAKE by VPBank' },
  { code: '546035', name: 'Ubank by VPBank' },
  { code: '963388', name: 'TIMO' },
  { code: '971005', name: 'ViettelMoney' },
  { code: '971011', name: 'VNPTMoney' }
];

module.exports.handleReply = async function({ api, event, handleReply }) {
  if (event.senderID !== handleReply.author) return;
  const { step, rutData } = handleReply;

  switch (step) {
    case 1: {
      const idx = parseInt(event.body.trim()) - 1;
      if (isNaN(idx) || idx < 0 || idx >= bankList.length)
        return api.sendMessage("❎ Số thứ tự không hợp lệ! Vui lòng nhập lại.", event.threadID, event.messageID);
      const bank = bankList[idx];
      rutData.data.bankCode = bank.code;
      rutData.data.bankName = bank.name;
      api.sendMessage("Nhập số tài khoản:", event.threadID, (err, info) => {
        handleReply.step = 2;
        handleReply.messageID = info.messageID;
      }, event.messageID);
      break;
    }
    case 2: {
      const stk = event.body.trim();
      if (!/^\d{6,}$/.test(stk))
        return api.sendMessage("❎ Số tài khoản không hợp lệ! Vui lòng nhập lại (ít nhất 6 số).", event.threadID, event.messageID);
      rutData.data.accountNumber = stk;
      api.sendMessage("Nhập tên chủ tài khoản (chỉ chữ in hoa, không dấu, từ 3-40 ký tự):", event.threadID, (err, info) => {
        handleReply.step = 3;
        handleReply.messageID = info.messageID;
      }, event.messageID);
      break;
    }
    case 3: { 
      const name = event.body.trim();
      if (!/^[A-Z ]{3,40}$/.test(name))
        return api.sendMessage("❎ Tên chủ tài khoản không hợp lệ! Vui lòng nhập lại (chỉ chữ in hoa, không dấu, từ 3-40 ký tự).", event.threadID, event.messageID);
      rutData.data.accountName = name;
      const data = getData();
      const balance = data[event.senderID]?.balance || 0;
      api.sendMessage(`Nhập số tiền muốn rút (tối đa ${formatMoney(balance)}đ):`, event.threadID, (err, info) => {
        handleReply.step = 4;
        handleReply.messageID = info.messageID;
      }, event.messageID);
      break;
    }
    case 4: { 
      const data = getData();
      const balance = data[event.senderID]?.balance || 0;
      const amount = parseInt(event.body.trim());
      if (isNaN(amount) || amount <= 0 || amount > balance)
        return api.sendMessage(`❎ Số tiền không hợp lệ hoặc vượt quá số dư (${formatMoney(balance)}đ)!`, event.threadID, event.messageID);
      rutData.data.amount = amount;
      api.sendMessage("Nhập nội dung chuyển khoản (ghi chú):", event.threadID, (err, info) => {
        handleReply.step = 5;
        handleReply.messageID = info.messageID;
      }, event.messageID);
      break;
    }
    case 5: { 
      rutData.data.additionalInfo = event.body.trim();
      const { bankCode, accountNumber, accountName, amount, additionalInfo, bankName } = rutData.data;
      const msg =
        `🔎 Xác nhận thông tin rút tiền:\n` +
        `🏦 Ngân hàng: ${bankName}\n🔢 STK: ${accountNumber}\n👤 Tên: ${accountName}\n💰 Số tiền: ${formatMoney(amount)}đ\n📝 Ghi chú: ${additionalInfo}\n\nReply 'y' để xác nhận, 'n' để hủy.`;
      api.sendMessage(msg, event.threadID, (err, info) => {
        handleReply.step = 6;
        handleReply.messageID = info.messageID;
      }, event.messageID);
      break;
    }
    case 6: { 
      if (event.body.trim().toLowerCase() === "y") {
        const data = getData();
        data[event.senderID].balance -= rutData.data.amount;
        setData(data);

        const { bankCode, accountNumber, accountName, amount, additionalInfo, bankName } = rutData.data;
        const qrUrl = `https://api.vietqr.io/image/${bankCode}-${accountNumber}-wgEtlNH.jpg?accountName=${encodeURIComponent(accountName)}&amount=${encodeURIComponent(amount)}&addInfo=${encodeURIComponent(additionalInfo)}`;
        const cacheDir = path.join(__dirname, 'cache');
        if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir);
        const filePath = path.join(cacheDir, `vietqr_rut_${event.senderID}_${Date.now()}.jpg`);
        let rutList = getRutList();
        const rutId = Date.now().toString();
        try {
          const response = await axios.get(qrUrl, { responseType: 'arraybuffer' });
          fs.writeFileSync(filePath, Buffer.from(response.data, 'binary'));
          rutList.push({
            id: rutId,
            userID: event.senderID,
            threadID: event.threadID,
            bankCode, accountNumber, accountName, amount, additionalInfo, bankName,
            qrPath: filePath,
            status: "pending",
            time: new Date().toLocaleString("vi-VN"),
            note: ""
          });
          setRutList(rutList);

          const msg =
            `📥 Đơn rút tiền mới (#${rutList.length}):\n` +
            `👤 Người chơi: ${event.senderID}\n` +
            `🏦 Ngân hàng: ${bankName}\n` +
            `🔢 STK: ${accountNumber}\n` +
            `👤 Tên: ${accountName}\n` +
            `💰 Số tiền: ${formatMoney(amount)}đ\n` +
            `📝 Ghi chú: ${additionalInfo}\n` +
            `⏰ Thời gian: ${rutList[rutList.length-1].time}`;
          api.sendMessage({
            body: msg,
            attachment: fs.createReadStream(filePath)
          }, ADMIN_GROUP_ID, () => {});
        } catch (error) {
          api.sendMessage("❌ Lỗi tạo/gửi mã QR về admin!", event.threadID, event.messageID);
        }
        api.sendMessage("✅ Đã gửi yêu cầu rút tiền đến admin, vui lòng chờ duyệt!", event.threadID, event.messageID);
      } else {
        api.sendMessage("❌ Đã hủy yêu cầu rút tiền!", event.threadID, event.messageID);
      }
      break;
    }
  }

  if (handleReply.step == "admin_money_list" && event.senderID == handleReply.author) {
    let rutList = getRutList();
    const perPage = 10;
    let page = handleReply.page;
    const args = event.body.trim().split(" ");
    if (args[0] == "page" && args[1]) {
      page = parseInt(args[1]);
      if (isNaN(page) || page < 1) page = 1;
      const maxPage = Math.ceil(rutList.length / perPage);
      if (page > maxPage) page = maxPage;
      let msg = `📋 Danh sách đơn rút tiền (Trang ${page}/${maxPage}):\n`;
      rutList.slice((page-1)*perPage, page*perPage).forEach((r, i) => {
        msg += `${(page-1)*perPage+i+1}. ${r.status == "pending" ? "⏳" : r.status == "paid" ? "✅" : "❌"} | ${r.time} | ${r.userID} | ${formatMoney(r.amount)}đ | ${r.bankName} | ${r.accountNumber}\n`;
        if (r.status == "cancel") msg += `   Lý do hủy: ${r.note}\n`;
      });
      msg += "\nReply 'page +số trang' để đổi trang\nReply 'paid +số thứ tự' để xác nhận đã trả tiền\nReply 'del +số thứ tự +lý do' để hủy đơn và cộng lại tiền";
      return api.sendMessage(msg, event.threadID, (err, info) => {
        global.client.handleReply.push({
          name: module.exports.config.name,
          messageID: info.messageID,
          step: "admin_money_list",
          author: event.senderID,
          page
        });
      }, event.messageID);
    }
    if (args[0] == "paid" && args[1]) {
      const idx = parseInt(args[1]) - 1 + (page-1)*perPage;
      if (isNaN(idx) || !rutList[idx]) return api.sendMessage("❎ Số thứ tự không hợp lệ!", event.threadID, event.messageID);
      rutList[idx].status = "paid";
      setRutList(rutList);
      api.sendMessage(
        `✅ Đơn rút tiền của bạn đã được admin xác nhận trả tiền!\nSố tiền: ${formatMoney(rutList[idx].amount)}đ\nThời gian: ${rutList[idx].time}`,
        rutList[idx].threadID,
        null,
        null,
        [rutList[idx].userID]
      );
      return api.sendMessage("✅ Đã xác nhận trả tiền cho đơn rút!", event.threadID, event.messageID);
    }
    if (args[0] == "del" && args[1]) {
      const idx = parseInt(args[1]) - 1 + (page-1)*perPage;
      if (isNaN(idx) || !rutList[idx]) return api.sendMessage("❎ Số thứ tự không hợp lệ!", event.threadID, event.messageID);
      rutList[idx].status = "cancel";
      rutList[idx].note = args.slice(2).join(" ") || "Không có lý do";
      const data = getData();
      if (!data[rutList[idx].userID]) data[rutList[idx].userID] = { balance: 0 };
      data[rutList[idx].userID].balance += rutList[idx].amount;
      setData(data);
      setRutList(rutList);
      api.sendMessage(
        `❌ Đơn rút tiền của bạn đã bị admin hủy!\nSố tiền: ${formatMoney(rutList[idx].amount)}đ đã được cộng lại vào ví.\nLý do: ${rutList[idx].note}`,
        rutList[idx].threadID,
        null,
        null,
        [rutList[idx].userID]
      );
      return api.sendMessage("✅ Đã hủy đơn và cộng lại tiền!", event.threadID, event.messageID);
    }
    return;
  }
};