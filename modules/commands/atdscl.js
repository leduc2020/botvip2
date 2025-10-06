const axios = require('axios');
async function getData(url) {
  try {
    const { data } = await axios({
      method: 'post',
      url: 'https://api.downloadsound.cloud/track',
      headers: { 
        'Accept': 'application/json, text/plain, */*',
        'Accept-Encoding': 'gzip, deflate, br, zstd',
        'Accept-Language': 'vi,en;q=0.9',
        'Content-Type': 'application/json;charset=UTF-8',
        'Origin': 'https://downloadsound.cloud',
        'Priority': 'u=1, i',
        'Referer': 'https://downloadsound.cloud/',
        'Sec-Ch-Ua': '"Google Chrome";v="125", "Chromium";v="125", "Not.A/Brand";v="24"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-site',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'
      },
      data: {
        "url": url
      }
    });
    return {
      title: data.title,
      author: data.author.username,
      url: data.url
    }
  } catch (error) {
    console.error(error);
  }
}
this.config = {
    name: 'atdscl',
    version: '1.1.1',
    hasPermssion: 3,
    credits: 'DongDev', // Thay credits làm chó 🐶
    description: 'Tự động tải xuống khi phát hiện liên kết SoundCloud',
    commandCategory: 'Tiện ích',
    usages: '[]',
    cooldowns: 2
};
function urlify(text) {
  const urlRegex = /(https?:\/\/[^\s]+)/gi;
  const matches = text.match(urlRegex);
  return matches || []; 
}
this.handleEvent = async function({ api, event }) {    
    if (event.senderID == api.getCurrentUserID()) return;
    let streamURL = (url, ext = 'jpg') => require('axios').get(url,{responseType: 'stream'}).then(res => (res.data.path = `tmp.${ext}`, res.data)).catch(e => null);
    const send = (msg, callback) => api.sendMessage(msg, event.threadID, callback, event.messageID);
    const head = app => `[ AUTODOWN - ${app} ]\n────────────────`;
    const urls = urlify(event.body);
    for (const str of urls) {
        if (/soundcloud\.com\//.test(str)) {
          const res = await getData(str);
          let attachment = await streamURL(res.url, 'mp3');
          send({body: `${head('SOUNDCLOUD')}\n⩺ Tiêu đề: ${res.title}\n⩺ Tác giả: ${res.author}`, attachment});
      }
   }
};
this.run=async()=>{};