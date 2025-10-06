const fs = require('fs');
const path = require('path');

module.exports.config = {
  name: 'autosend',
  version: '1.1.8',
  hasPermssion: 0,
  credits: 'RST & QuocTuan03 (random update by ChatGPT)',
  description: 'Tự động gửi file âm thanh theo giờ Việt Nam. Bật/tắt bằng lệnh!',
  commandCategory: 'Hệ Thống',
  usages: '[on/off]',
  cooldowns: 3
};

// Danh sách file mỗi giờ
const audioSchedule = [
  { timer: '6:00:00 AM', files: ['sang.mp3', 'sang2.mp3'], title: 'Chào buổi sáng' },
  { timer: '10:15:00 AM', files: ['trua.mp3', 'trua2.mp3'], title: 'Giờ nấu ăn' },
  { timer: '5:00:00 PM', files: ['chieumuon.mp3'], title: 'Chào chiều muộn' },
  { timer: '7:00:00 PM', files: ['toi.mp3'], title: 'Giờ ăn tối' },
  { timer: '10:00:00 PM', files: ['ngu.mp3', 'ngu2.mp3', 'ngungon.mp3'], title: 'Chúc ngủ ngon' }
];

const audioDir = path.join(__dirname, 'noprefix');
if (!fs.existsSync(audioDir)) fs.mkdirSync(audioDir, { recursive: true });

const configDir = path.join(__dirname, 'data');
if (!fs.existsSync(configDir)) fs.mkdirSync(configDir, { recursive: true });

const groupConfigPath = path.join(configDir, 'autosend.json');
let lastSentTime = "";
let enabledThreads = new Set();

function loadEnabledThreads() {
  try {
    if (fs.existsSync(groupConfigPath)) {
      const data = fs.readFileSync(groupConfigPath, 'utf8');
      enabledThreads = new Set(JSON.parse(data));
    } else {
      fs.writeFileSync(groupConfigPath, JSON.stringify([]));
    }
  } catch (err) {
    console.error('[autosend] Load error:', err);
  }
}

function saveEnabledThreads() {
  try {
    fs.writeFileSync(groupConfigPath, JSON.stringify([...enabledThreads]), 'utf8');
  } catch (err) {
    console.error('[autosend] Save error:', err);
  }
}

// Kiểm tra từng file trong danh sách
function checkAudioFiles() {
  let missing = [];
  for (const { files, title } of audioSchedule) {
    for (const file of files) {
      if (!fs.existsSync(path.join(audioDir, file))) {
        missing.push(file);
        console.warn(`[autosend] Thiếu file: ${file} (${title})`);
      }
    }
  }
  return missing.length === 0;
}

module.exports.onLoad = async function () {
  loadEnabledThreads();
  if (!checkAudioFiles()) console.warn('[autosend] Một số file âm thanh bị thiếu');

  global.autosendInterval = setInterval(() => {
    try {
      const currentTime = new Date().toLocaleTimeString('en-US', {
        hour12: true,
        timeZone: 'Asia/Ho_Chi_Minh'
      });

      const timeTrimmed = currentTime.replace(/:\d{2}\s/, ':00 ');
      if (timeTrimmed === lastSentTime) return;

      const match = audioSchedule.find(item => item.timer === timeTrimmed);
      if (!match) return;

      lastSentTime = timeTrimmed;

      // Random chọn 1 file
      const selectedFile = match.files[Math.floor(Math.random() * match.files.length)];
      const filePath = path.join(audioDir, selectedFile);

      if (!fs.existsSync(filePath)) {
        console.warn(`[autosend] Không tìm thấy file: ${selectedFile}`);
        return;
      }

      const api = global.client?.api;
      if (!api) return console.error('[autosend] API không khả dụng');

      setTimeout(async () => {
        let sentCount = 0;
        for (const threadID of enabledThreads) {
          try {
            await api.sendMessage({
              body: `🎵 ${match.title} - ${timeTrimmed}\n🔊 File: ${selectedFile}\n⏰ Gửi tự động theo lịch`,
              attachment: fs.createReadStream(filePath)
            }, threadID);
            sentCount++;
            await new Promise(res => setTimeout(res, 300));
          } catch (err) {
            console.error(`[autosend] Lỗi gửi đến ${threadID}:`, err);
          }
        }
        console.log(`[autosend] Gửi thành công ${sentCount}/${enabledThreads.size} nhóm (${match.title})`);
      }, 0);
    } catch (err) {
      console.error('[autosend] Lỗi xử lý:', err);
    }
  }, 5000);
};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID } = event;
  const mode = args[0]?.toLowerCase();

  if (!mode || mode === 'status') {
    return api.sendMessage(
      `📊 Trạng thái tự động:\n➤ Nhóm này: ${enabledThreads.has(threadID) ? 'bật' : 'tắt'}\n\n` +
      `🕒 Lịch trình:\n` +
      audioSchedule.map(item => `➤ ${item.timer} - ${item.title}`).join('\n') + '\n\n' +
      `💡 Dùng:\n➤ autosend on/off/status`,
      threadID, messageID
    );
  }

  if (mode === 'on') {
    enabledThreads.add(threadID);
    saveEnabledThreads();
    return api.sendMessage('✅ Đã bật gửi tự động cho nhóm này', threadID, messageID);
  }

  if (mode === 'off') {
    enabledThreads.delete(threadID);
    saveEnabledThreads();
    return api.sendMessage('❌ Đã tắt gửi tự động cho nhóm này', threadID, messageID);
  }

  return api.sendMessage('❓ Lệnh không hợp lệ. Dùng: autosend [on/off/status]', threadID, messageID);
};
