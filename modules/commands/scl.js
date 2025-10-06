const axios = require('axios');
const fs = require('fs');
const path = require('path');
const clientId = 'nFddmw3ZibOug7XKUPPyXjYCElJCcGcv';
exports.config = {
  name: 'scl',
  version: '2.0.0',
  hasPermssion: 0,
  credits: 'DongDev', // Thằng nào đó sân si nên ngứa mắt
  description: 'Tìm kiếm nhạc trên SoundCloud',
  commandCategory: 'Tiện ích',
  usages: '[]',
  cooldowns: 5,
  images: [],
};
function formatDuration(d) {
  const h = Math.floor(d / 3600000);
  const m = Math.floor((d % 3600000) / 60000);
  const s = Math.floor((d % 60000) / 1000);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}
async function search(url, params = {}) {
  const response = await axios.get(url, { params: { ...params, client_id: clientId } });
  return response.data;
}
async function download(url, filename) {
  const writer = fs.createWriteStream(filename);
  const response = await axios({
    url,
    method: 'GET',
    responseType: 'stream'
  });
  response.data.pipe(writer);
  return new Promise((resolve, reject) => {
    writer.on('finish', resolve);
    writer.on('error', reject);
  });
}
exports.run = async function ({ api, event, args }) {
  const query = args.join(" ").trim();
  const { threadID: tid, messageID: mid } = event;
  if (!query) return api.sendMessage("⚠️ Vui lòng nhập từ khóa tìm kiếm", tid, mid);
  try {
    const { collection } = await search('https://api-v2.soundcloud.com/search', { q: query, limit: 20 });
    const data = (collection || []).filter(item => item.title && item.user?.username && item.permalink_url && item.duration).slice(0, 6).map(item => ({
        title: item.title,
        artist: item.user.username,
        permalink_url: item.permalink_url,
        duration: formatDuration(item.duration)
      }));
    if (!data.length) return api.sendMessage('Không tìm thấy kết quả liên quan', tid, mid);
    const messages = data.map((item, index) => `\n${index + 1}. 👤 Tên: ${item.artist}\n📜 Tiêu đề: ${item.title}\n⏰ Thời lượng: ${item.duration}`);
    api.sendMessage(`📝 Danh sách tìm kiếm của từ khóa: ${query}\n${messages.join("\n")}\n\n📌 Reply (phản hồi) theo STT tương ứng để tải nhạc`, tid, (error, info) => {
      if (!error) global.client.handleReply.push({ type: 'reply', name: exports.config.name, messageID: info.messageID, author: event.senderID, data });
    }, mid);
  } catch (error) {
    console.error("❎ Lỗi trong quá trình tìm kiếm:", error);
    api.sendMessage(`❎ Đã xảy ra lỗi trong quá trình tìm kiếm`, tid, mid);
  }
};
exports.handleReply = async function ({ event, api, handleReply }) {
  const { threadID: tid, messageID: mid, body, senderID } = event;
  if (handleReply.author !== senderID) return;
  const choose = parseInt(body.trim());
  if (isNaN(choose) || choose < 1 || choose > handleReply.data.length) return api.sendMessage('❎ Vui lòng nhập số hợp lệ trong danh sách', tid, mid);
  api.unsendMessage(handleReply.messageID);
  const chosenItem = handleReply.data[choose - 1];
  try {
    const trackInfo = await search('https://api-v2.soundcloud.com/resolve', { url: chosenItem.permalink_url });
    const transcoding = trackInfo.media.transcodings.find(t => t.format.protocol === 'progressive');
    if (!transcoding) throw new Error('Không tìm thấy data phù hợp');
    const streamUrl = await search(transcoding.url);
    const fileName = path.join(__dirname, `cache/${Date.now()}.mp3`);
    await download(streamUrl.url, fileName);
    api.sendMessage({ body: `⩺ Tiêu đề: ${trackInfo.title}\n⩺ Thời lượng: ${chosenItem.duration}\n⩺ Tác giả: ${chosenItem.artist}\n⩺ Thể loại: ${trackInfo.genre}\n⩺ Lượt nghe: ${trackInfo.playback_count}\n⩺ Lượt thích: ${trackInfo.likes_count}\n⩺ Lượt bình luận: ${trackInfo.comment_count}\n⩺ Lượt tải: ${trackInfo.download_count}`, attachment: fs.createReadStream(fileName) }, tid, () => {
      fs.unlink(fileName, (err) => { if (err) console.error('❎ Xảy ra lỗi khi xóa tệp:', err)});
    }, mid);
  } catch (error) {
    console.error('❎ Lỗi trong quá trình tải nhạc:', error);
    api.sendMessage(`❎ Đã xảy ra lỗi trong quá trình tải nhạc`, tid, mid);
  }
};