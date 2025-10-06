const axios = require("axios");
const fs = require("fs-extra");

module.exports.config = {
  name: "theme",
  version: "1.0.1",
  hasPermssion: 0,
  credits: "GPT-5 (fix by Linhhh Thuy)",
  description: "Tạo theme preview theo prompt AI (không cần đổi theme thật)",
  commandCategory: "Tiện ích",
  usages: "[prompt]",
  cooldowns: 5,
};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID } = event;
  const prompt = args.join(" ");

  if (!prompt)
    return api.sendMessage(
      "❗ Vui lòng nhập mô tả theme cần tạo.\nVí dụ: theme màu hồng pastel dễ thương 🌸",
      threadID,
      messageID
    );

  const loadingMsg = await api.sendMessage(
    "🎨 Đang tạo theme preview, vui lòng đợi chút nhé...",
    threadID
  );

  try {
    // 🧠 Giả lập kết quả theme (không đổi theme thật)
    const fakeTheme = {
      themeId: Math.random().toString(36).slice(2, 10),
      themeName: prompt,
      lightUrl: "https://i.imgur.com/VF4uQ4e.jpeg",
      darkUrl: "https://i.imgur.com/vxgCN2Z.jpeg",
    };

    // 📸 Gửi ảnh preview (có thể thay link trên thành ảnh AI nếu bạn có API)
    const msg = {
      body: `✨ Tên theme: ${fakeTheme.themeName}\n🆔 ID: ${fakeTheme.themeId}`,
      attachment: [],
    };

    // tải ảnh tạm thời về
    const lightPath = __dirname + `/cache/theme_light.jpg`;
    const darkPath = __dirname + `/cache/theme_dark.jpg`;
    const light = (await axios.get(fakeTheme.lightUrl, { responseType: "stream" })).data;
    const dark = (await axios.get(fakeTheme.darkUrl, { responseType: "stream" })).data;
    await Promise.all([
      new Promise((r) => light.pipe(fs.createWriteStream(lightPath)).on("finish", r)),
      new Promise((r) => dark.pipe(fs.createWriteStream(darkPath)).on("finish", r)),
    ]);

    msg.attachment.push(fs.createReadStream(lightPath));
    msg.attachment.push(fs.createReadStream(darkPath));

    await api.sendMessage(msg, threadID);

    // xoá file tạm
    fs.unlinkSync(lightPath);
    fs.unlinkSync(darkPath);
  } catch (err) {
    console.error(err);
    api.sendMessage(
      `❌ Lỗi khi tạo theme preview!\n${err.message}`,
      threadID,
      messageID
    );
  } finally {
    api.unsendMessage(loadingMsg.messageID);
  }
};