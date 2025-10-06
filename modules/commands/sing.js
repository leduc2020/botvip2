const fs = require('fs-extra');
const axios = require('axios');
const moment = require("moment-timezone");

this.config = {
  name: "sing",
  aliases: ["music"],
  version: "1.0.0",
  role: 0,
  credits: "Dong Dev, Mhung & Trâm Anh",//ta thêm chút mắm muối
  description: "Phát nhạc thông qua từ khoá tìm kiếm trên YouTube",
  commandCategory: "Tiện ích",
  usages: "sing [từ khoá]",
  cd: 0,
  hasPrefix: true,
  images: []
};

async function ytdlv2(url, type, quality) {
  const header = {
    "accept": "*/*",
    "accept-language": "vi-VN,vi;q=0.9",
    "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
    "cookie": "PHPSESSID=eoddj1bqqgahnhac79rd8kq8lr",
    "origin": "https://iloveyt.net",
    "referer": "https://iloveyt.net/vi2",
    "user-agent": "Mozilla/5.0"
  };

  const { data } = await axios.post("https://iloveyt.net/proxy.php", { url }, { headers: header });
  const mediaId = data.api.mediaItems.filter(i => i.type === type).map(i => i.mediaId);
  const randomMediaId = mediaId[Math.floor(Math.random() * mediaId.length)];

  let s = 1, mediaProccess, i = 0;
  while (i++ < 10) {
    const base_url = "s" + s + ".ytcontent.net";
    mediaProccess = await axios.get(`https://${base_url}/v3/${type.toLowerCase()}Process/${data.api.id}/${randomMediaId}/${quality}`);
    if (!mediaProccess.data.error) break;
    s++;
  }

  return {
    fileUrl: mediaProccess.data.fileUrl,
    title: data.api.title,
    channel: data.api.userInfo,
    videoInfo: data.api.mediaStats
  };
}

async function getdl(link, path) {
  const timestart = Date.now();
  const data = await ytdlv2(link, 'Audio', "128k");
  if (!data) return null;
  const response = await axios.get(data.fileUrl, { responseType: 'arraybuffer' });
  fs.writeFileSync(path, response.data);
  return { title: data.title, timestart };
}

this.handleReply = async function ({ api, event, handleReply }) {
  const id = handleReply.link[event.body - 1];
  if (!id) return api.sendMessage("❎ Số không hợp lệ!", event.threadID, event.messageID);

  // ✅ React ⏳ vào tin nhắn người dùng
  api.setMessageReaction("⏳", event.messageID, event.threadID, (err) => {
    if (err) console.error("Lỗi react ⏳:", err);
  });

  // ✅ Thu hồi tin nhắn danh sách
  api.unsendMessage(handleReply.messageID);

  try {
    const path = `${__dirname}/cache/sin-${event.senderID}.mp3`;
    const data = await getdl(`https://www.youtube.com/watch?v=${id}`, path);

    if (!data || !fs.existsSync(path)) {
      return api.sendMessage("❎ Không thể tải bài nhạc này!", event.threadID, event.messageID);
    }

    if (fs.statSync(path).size > 26214400) {
      fs.unlinkSync(path);
      return api.sendMessage("❎ File quá lớn, vui lòng chọn bài khác!", event.threadID, event.messageID);
    }

    return api.sendMessage({
      body: `[ Âm Nhạc Từ YouTube ]\n──────────────────\n|› 🎬 Title: ${data.title}\n|› 📥 Link tải: https://www.youtubepp.com/watch?v=${id}\n|› ⏳ Thời gian xử lý: ${Math.floor((Date.now() - data.timestart) / 1000)} giây\n──────────────────\n|› ⏰ Time: ${moment.tz("Asia/Ho_Chi_Minh").format("HH:mm:ss | DD/MM/YYYY")}`,
      attachment: fs.createReadStream(path)
    }, event.threadID, () => {
      fs.unlinkSync(path);
      // ✅ React ✅ sau khi gửi xong
      api.setMessageReaction("✅", event.messageID, event.threadID, (err) => {
        if (err) console.error("Lỗi react ✅:", err);
      });
    }, event.messageID);

  } catch (e) {
    console.error("Lỗi:", e);
    return api.sendMessage("❎ Có lỗi xảy ra khi xử lý!", event.threadID, event.messageID);
  }
};

this.run = async function ({ api, event, args }) {
  if (args.length === 0) return api.sendMessage('❎ Phần tìm kiếm không được để trống!', event.threadID, event.messageID);
  const keywordSearch = args.join(" ");
  const path = `${__dirname}/cache/sin-${event.senderID}.mp3`;
  if (fs.existsSync(path)) fs.unlinkSync(path);

  try {
    const Youtube = require('youtube-search-api');
    const data = (await Youtube.GetListByKeyword(keywordSearch, false, 8)).items;
    const link = [];

    const msg = data.map((value, index) => {
      link.push(value.id);
      const length = value.length?.simpleText || "không có thông tin";
      return `|› ${index + 1}. ${value.title}\n|› 👤 Kênh: ${value.channelTitle || "Không có thông tin"}\n|› ⏱️ Thời lượng: ${length}\n──────────────────`;
    }).join('\n');

    return api.sendMessage(`📝 Có ${link.length} kết quả trùng với từ khóa tìm kiếm của bạn:\n──────────────────\n${msg}\n\n📌 Reply (phản hồi) STT để tải nhạc`, event.threadID, (error, info) => {
      global.client.handleReply.push({
        type: 'reply',
        name: this.config.name,
        messageID: info.messageID,
        author: event.senderID,
        link
      });
    }, event.messageID);

  } catch (e) {
    return api.sendMessage('❎ Đã xảy ra lỗi, vui lòng thử lại sau!\n' + e, event.threadID, event.messageID);
  }
};