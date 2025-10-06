const fs = require('fs');
const path = require('path');
const axios = require('axios');

module.exports.config = {
  name: "api",
  version: "3.0.0",
  hasPermission: 3,
  credits: "DongDev (mod by Trâm Anh, improved full by ChatGPT)",
  description: "Quản lý link JSON: add, check, filter, stats, export, import, list",
  commandCategory: "Admin",
  usages: "[add/check/stats/export/import/list/start]",
  cooldowns: 5,
  images: [],
};

const allowedUserIDs = ["61568443432899"]; // <-- Thêm ID tại đây

module.exports.run = async ({ api, event, args }) => {
  try {
    if (!allowedUserIDs.includes(event.senderID)) {
      return api.sendMessage("⛔ Bạn không có quyền sử dụng lệnh này.", event.threadID, event.messageID);
    }

    const projectHome = path.resolve('./');
    const srcapi = path.join(projectHome, 'includes/datajson');

    switch (args[0]) {
      case 'add': {
        if (args.length === 1) {
          return api.sendMessage("⚠️ Vui lòng nhập tên tệp", event.threadID, event.messageID);
        }

        const tip = args[1];
        const dataPath = path.join(srcapi, `${tip}.json`);
        if (!fs.existsSync(dataPath)) fs.writeFileSync(dataPath, '[]', 'utf-8');

        let data = [];
        try {
          data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
          if (!Array.isArray(data)) throw new Error('Invalid format');
        } catch (err) {
          console.error(`❌ Lỗi đọc file ${tip}.json: ${err}`);
          return api.sendMessage(`❌ Lỗi đọc file ${tip}.json`, event.threadID, event.messageID);
        }

        if (!event.messageReply || !event.messageReply.attachments?.length) {
          return api.sendMessage("⚠️ Vui lòng reply vào tin nhắn có file cần tải.", event.threadID, event.messageID);
        }

        let newLinks = [];

        for (const i of event.messageReply.attachments) {
          const response = await axios.get(`https://catbox-mnib.onrender.com/upload?url=${encodeURIComponent(i.url)}`);
          if (Array.isArray(response.data)) {
            newLinks.push(...response.data.map(linkObj => linkObj.url));
          } else {
            newLinks.push(response.data.url);
          }
        }

        const beforeCount = data.length;
        const combined = [...data, ...newLinks];
        const uniqueLinks = [...new Set(combined)];
        const addedCount = uniqueLinks.length - beforeCount;

        fs.writeFileSync(dataPath, JSON.stringify(uniqueLinks, null, 2), 'utf-8');

        return api.sendMessage(
          `☑️ Đã thêm ${addedCount} link mới vào ${tip}.json\n` +
          `📌 Tổng link hiện tại: ${uniqueLinks.length}`,
          event.threadID,
          event.messageID
        );
      }

      case 'check': {
        const files = fs.readdirSync(srcapi);
        const results = [];

        for (const file of files) {
          const filePath = path.join(srcapi, file);
          let linksArray = [];

          try {
            linksArray = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
            if (!Array.isArray(linksArray)) throw new Error('Invalid format');
          } catch (err) {
            console.error(`❌ Lỗi đọc file ${file}: ${err}`);
            continue;
          }

          const totalLinks = linksArray.length;

          const checkLinkPromises = linksArray.map(link =>
            axios.head(link, { timeout: 5000 })
              .then(res => res.status === 200 ? 'live' : 'dead')
              .catch(() => 'dead')
          );

          const resultsSettled = await Promise.allSettled(checkLinkPromises);

          const liveCount = resultsSettled.filter(r => r.status === 'fulfilled' && r.value === 'live').length;
          const deadCount = totalLinks - liveCount;

          results.push(`📄 File: ${file}\n📝 Tổng: ${totalLinks}\n✅ Live: ${liveCount}\n❎ Die: ${deadCount}`);

          console.log(`✔️ Done check file ${file} - Live: ${liveCount} - Dead: ${deadCount}`);
        }

        api.sendMessage(
          `${results.join('\n\n')}\n\n📌 Thả ❤️ vào tin nhắn này để lọc các link die`,
          event.threadID,
          (err, info) => {
            global.client.handleReaction.push({
              name: module.exports.config.name,
              messageID: info.messageID,
              author: event.senderID
            });
          },
          event.messageID
        );
        break;
      }

      case 'stats': {
        const files = fs.readdirSync(srcapi);
        let totalLinks = 0;
        const stats = [];

        for (const file of files) {
          const filePath = path.join(srcapi, file);
          let linksArray = [];

          try {
            linksArray = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
            if (!Array.isArray(linksArray)) throw new Error('Invalid format');
          } catch (err) {
            console.error(`❌ Lỗi đọc file ${file}: ${err}`);
            continue;
          }

          stats.push(`📄 ${file}: ${linksArray.length} link`);
          totalLinks += linksArray.length;
        }

        api.sendMessage(
          `📊 Thống kê toàn bộ link:\n\n${stats.join('\n')}\n\n🔹 Tổng tất cả: ${totalLinks} link`,
          event.threadID,
          event.messageID
        );
        break;
      }

      case 'export': {
        if (args.length === 1) {
          return api.sendMessage("⚠️ Vui lòng nhập tên tệp cần export.", event.threadID, event.messageID);
        }

        const tip = args[1];
        const dataPath = path.join(srcapi, `${tip}.json`);

        if (!fs.existsSync(dataPath)) {
          return api.sendMessage(`❌ File ${tip}.json không tồn tại.`, event.threadID, event.messageID);
        }

        api.sendMessage(
          {
            body: `📦 File ${tip}.json đây, bạn có thể tải về.`,
            attachment: fs.createReadStream(dataPath)
          },
          event.threadID,
          event.messageID
        );
        break;
      }

      case 'import': {
        if (!event.messageReply || !event.messageReply.attachments?.length) {
          return api.sendMessage("⚠️ Vui lòng reply vào 1 file JSON để import.", event.threadID, event.messageID);
        }

        const attachment = event.messageReply.attachments[0];
        if (!attachment.name.endsWith('.json')) {
          return api.sendMessage("⚠️ File không phải JSON.", event.threadID, event.messageID);
        }

        const savePath = path.join(srcapi, attachment.name);

        try {
          const response = await axios.get(attachment.url, { responseType: 'stream' });
          const writer = fs.createWriteStream(savePath);

          response.data.pipe(writer);

          writer.on('finish', () => {
            api.sendMessage(`✅ Đã import file ${attachment.name} vào includes/datajson.`, event.threadID, event.messageID);
          });

          writer.on('error', (err) => {
            console.error(err);
            api.sendMessage(`❌ Lỗi import file: ${err}`, event.threadID, event.messageID);
          });
        } catch (err) {
          console.error(err);
          api.sendMessage(`❌ Lỗi tải file: ${err}`, event.threadID, event.messageID);
        }

        break;
      }

      case 'list': {
        const files = fs.readdirSync(srcapi).filter(file => file.endsWith('.json'));

        if (files.length === 0) {
          return api.sendMessage("📂 Chưa có file JSON nào trong includes/datajson.", event.threadID, event.messageID);
        }

        const fileList = files.map((file, index) => `${index + 1}. ${file}`).join('\n');

        api.sendMessage(
          `📂 Danh sách file JSON hiện có:\n\n${fileList}`,
          event.threadID,
          event.messageID
        );
        break;
      }

      case 'start': {
        api.sendMessage(
          `👋 Chào bạn! Đây là bot quản lý link API.\n\n` +
          `Các lệnh hỗ trợ:\n` +
          `✅ /api add <filename> → Thêm link vào file (reply file cần thêm)\n` +
          `✅ /api check → Kiểm tra link live/die\n` +
          `✅ /api stats → Thống kê tổng link\n` +
          `✅ /api export <filename> → Gửi file JSON về chat\n` +
          `✅ /api import → Import 1 file JSON vào bot (reply vào file JSON)\n` +
          `✅ /api list → Xem danh sách các file JSON hiện có\n` +
          `❤️ Thả ❤️ vào tin nhắn sau khi check → tự động xoá link die\n\n` +
          `📌 Lưu ý:\n` +
          `- Bot tự lọc trùng khi thêm link.\n` +
          `- Có log lịch sử lọc link tại: includes/datajson/history.log\n\n` +
          `✨ Chúc bạn sử dụng vui vẻ!`,
          event.threadID,
          event.messageID
        );
        break;
      }

      default:
        api.sendMessage("📝 Dùng: add | check | stats | export | import | list | start", event.threadID, event.messageID);
    }
  } catch (error) {
    console.error(error);
    api.sendMessage(`❎ Đã xảy ra lỗi: ${error}`, event.threadID, event.messageID);
  }
};

module.exports.handleReaction = async ({ event, api, handleReaction }) => {
  if (event.userID !== handleReaction.author) return;
  if (event.reaction !== "♥️") return;

  const srcapi = path.join(path.resolve('./'), 'includes/datajson');
  const files = fs.readdirSync(srcapi);
  let totalRemoved = 0;
  let totalFilesChanged = 0;
  const report = [];

  for (const file of files) {
    const filePath = path.join(srcapi, file);
    let linksArray = [];

    try {
      linksArray = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      if (!Array.isArray(linksArray)) throw new Error('Invalid format');
    } catch (err) {
      console.error(`❌ Lỗi đọc file ${file}: ${err}`);
      continue;
    }

    const checkLinkPromises = linksArray.map(link =>
      axios.head(link, { timeout: 5000 })
        .then(res => res.status === 200 ? link : null)
        .catch(() => null)
    );

    const results = await Promise.allSettled(checkLinkPromises);

    const newLinks = results
      .filter(r => r.status === 'fulfilled' && r.value !== null)
      .map(r => r.value);

    const removedCount = linksArray.length - newLinks.length;
    if (removedCount > 0) {
      fs.writeFileSync(filePath, JSON.stringify(newLinks, null, 2), 'utf-8');
      totalRemoved += removedCount;
      totalFilesChanged++;
      report.push(`📄 ${file}: ❌ ${removedCount} link die đã xoá`);

      const logPath = path.join(srcapi, 'history.log');
      const logLine = `${new Date().toISOString()} | User: ${event.userID} | File: ${file} | Removed: ${removedCount}\n`;
      fs.appendFileSync(logPath, logLine, 'utf-8');
    } else {
      report.push(`📄 ${file}: ✅ Không có link die`);
    }

    console.log(`✔️ Done clean file ${file} - Removed ${removedCount} link die`);
  }

  api.sendMessage(
    `✅ Đã lọc xong.\n` +
    `🔹 Tổng file thay đổi: ${totalFilesChanged}\n` +
    `🔹 Tổng link die đã xoá: ${totalRemoved}\n\n` +
    `${report.join('\n')}`,
    event.threadID
  );
};