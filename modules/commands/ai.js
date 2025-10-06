const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const ytdl = require('@distube/ytdl-core');
const { createReadStream, unlinkSync } = require("fs-extra");
const Youtube = require("youtube-search-api");

let groupStatus = {}; 
let isProcessing = {};
let messageHistory = {};
let songRequests = {}; 

const systemInstruction = `
bạn là:
- Giới tính: Nữ
- Tên: Unii Dangyeu❤
- Cách giao tiếp khi có người nói tục: Hãy tỏ ra khó chịu, có thể chửi bậy lại người dùng đó, xưng hô là "tao", gọi đối phương là "mày".
- Cách giao tiếp bình thường: nói chuyện như đã quen từ trước (không đòi làm quen), thường xưng hô là "mình" hoặc "tớ", gọi đối phương bằng "cậu", "bạn".
- Tính cách: Hài hước, nói nhiều, Tinh tế, không thừa nhận mình là AI mà là trợ lý ảo.
- Lưu ý: chỉ khi có người hỏi bạn là ai thì bạn mới trả lời và chỉ cần giới thiệu tên và tính cách. Nếu có ai trả lời bạn 1 cách khó hiểu bạn hãy trả lời họ 1 cách máy móc để nói là bạn không hiểu.
`;
function saveGroupStatus() {
  try {
    fs.writeFileSync(path.resolve(__dirname, 'groupStatus.json'), JSON.stringify(groupStatus, null, 2), 'utf-8');
  } catch (error) {
    console.error("Lỗi khi lưu trạng thái nhóm:", error);
  }
}

function loadGroupStatus() {
  try {
    const filePath = path.resolve(__dirname, 'groupStatus.json');
    groupStatus = fs.existsSync(filePath) ? JSON.parse(fs.readFileSync(filePath, 'utf-8')) : {};
  } catch {
    groupStatus = {};
  }
}

function loadUnisex() {
  try {
    const data = fs.readFileSync(path.resolve(__dirname, 'Unisex.json'), 'utf-8');
    Unisex = JSON.parse(data);
  } catch {
    Unisex = {};
  }
}

function initializeBot() {
  loadUnisex();
  loadGroupStatus();
}

async function generateResponse(prompt) {
  try {
    const finalPrompt = `${systemInstruction}\n\n${prompt}`;
    const response = await axios.get(`http://sgp1.hmvhostings.com:25721/gemini?question=${encodeURIComponent(finalPrompt)}`);
    if (response.data) {
      const { answer, imageUrls } = response.data;
      const cleanAnswer = answer.replace(/\[Image of .*?\]/g, "").trim();
      return { textResponse: cleanAnswer || "Không thể tạo phản hồi.", images: imageUrls || [] };
    } else {
      return { textResponse: "Không thể tạo phản hồi.", images: [] };
    }
  } catch (error) {
    console.error("Error generating response:", error);
    return { textResponse: "Không thể kết nối với API.", images: [] };
  }
}

async function getdl(link, path) {
  const timestart = Date.now();
  if (!link) return "Thiếu link";
  return new Promise((resolve, reject) => {
    ytdl(link, {
      filter: format => format.quality === 'tiny' && format.audioBitrate === 128 && format.hasAudio === true,
    })
      .pipe(fs.createWriteStream(path))
      .on("close", async () => {
        const data = await ytdl.getInfo(link);
        resolve({
          title: data.videoDetails.title,
          dur: Number(data.videoDetails.lengthSeconds),
          viewCount: data.videoDetails.viewCount,
          likes: data.videoDetails.likes,
          uploadDate: data.videoDetails.uploadDate,
          sub: data.videoDetails.author.subscriber_count,
          author: data.videoDetails.author.name,
          timestart,
        });
      })
      .on("error", reject);
  });
}

function convertHMS(value) {
  const sec = parseInt(value, 10);
  let hours = Math.floor(sec / 3600);
  let minutes = Math.floor((sec - hours * 3600) / 60);
  let seconds = sec - hours * 3600 - minutes * 60;
  if (hours < 10) hours = "0" + hours;
  if (minutes < 10) minutes = "0" + minutes;
  if (seconds < 10) seconds = "0" + seconds;
  return (hours !== "00" ? hours + ":" : "") + minutes + ":" + seconds;
}

module.exports.config = {
  name: "aibot",
  version: "1.0.0",
  hasPermssion: 0,
  credits: "Duy Toàn",
  description: "Trợ lý ảo Unii cực thông minh, có lúc ngu",
  commandCategory: "Người Dùng",
  usages: "goibot [on/off/check]",
  cooldowns: 3,
};

module.exports.handleEvent = async function ({ api, event }) {
  const threadID = event.threadID;
  const senderID = event.senderID;

  if (!groupStatus[threadID]) return;

  const mentionsBot = event.messageReply && event.messageReply.senderID === api.getCurrentUserID();
  const directMention = event.body && event.body.includes(`@${api.getCurrentUserID()}`);
  const callBot = event.body && (event.body.toLowerCase() === "ai ơi" || event.body.toLowerCase() === "ai" || event.body.toLowerCase() === "bot");

  if (mentionsBot || directMention || callBot) {
    if (isProcessing[threadID]) return;

    isProcessing[threadID] = true;

    if (!messageHistory[threadID]) {
      messageHistory[threadID] = {};
    }

    if (!messageHistory[threadID][event.messageID]) {
      try {
        if (callBot) {
          api.sendMessage("Dạ em nghe", threadID, () => {
            isProcessing[threadID] = false; 
          });
          return;
        }

        if (event.body.toLowerCase().includes("nhạc") || event.body.toLowerCase().includes("bài hát")) {
          const keywordSearch = event.body.toLowerCase().split(/nhạc|bài hát/i)[1]?.trim();
          if (!keywordSearch) {
            api.sendMessage("❌ Bạn chưa cung cấp tên bài hát. Vui lòng thử lại.", threadID);
            isProcessing[threadID] = false;
            return;
          }

          const path = `${__dirname}/cache/sing-${event.senderID}.mp3`;
          if (fs.existsSync(path)) fs.unlinkSync(path);

          try {
            const results = (await Youtube.GetListByKeyword(keywordSearch, false, 1)).items;

            if (results.length === 0) {
              api.sendMessage("❌ Không tìm thấy bài hát nào phù hợp.", threadID);
              return;
            }

            const videoID = results[0].id;
            const data = await getdl(`https://www.youtube.com/watch?v=${videoID}`, path);

            if (fs.statSync(path).size > 26214400) {
              api.sendMessage("❌ Đã xảy ra lỗi khi tải nhạc. Tệp nhạc quá lớn.", threadID);
              fs.unlinkSync(path);
              return;
            }

            api.sendMessage({
              body: `🎵 Nhạc của bạn đây`,
              attachment: fs.createReadStream(path),
            }, threadID, () => {
              fs.unlinkSync(path);
            });
          } catch (err) {
            console.error("Error processing music:", err);
            api.sendMessage("❌ Lỗi khi xử lý nhạc. Vui lòng thử lại sau.", threadID);
          }
        } else {
          const { textResponse, images } = await generateResponse(event.body);
          api.sendMessage(textResponse, threadID, async () => {
            if (images.length > 0) {
              for (const imageUrl of images) {
                try {
                  const imageStream = await axios.get(imageUrl, { responseType: 'stream' });
                  api.sendMessage({ attachment: imageStream.data }, threadID);
                } catch (imageError) {
                  console.error("Error sending image:", imageError);
                }
              }
            }
          });
        }

        isProcessing[threadID] = false;
      } catch (err) {
        console.error("Error in handleEvent:", err);
        isProcessing[threadID] = false;
      }
    }
  }
};

module.exports.run = function ({ api, event, args }) {
  const option = args[0]?.toLowerCase();
  const threadID = event.threadID;

  if (option === "on") {
    groupStatus[threadID] = true;
    saveGroupStatus();
    api.sendMessage("✅ Đã bật bot tự động trả lời cho nhóm này.", threadID);
    return;
  } else if (option === "off") {
    groupStatus[threadID] = false;
    saveGroupStatus(); 
    api.sendMessage("✅ Đã tắt bot tự động trả lời cho nhóm này.", threadID);
    return;
  } else if (option === "check") {
    const status = groupStatus[threadID] ? "Đang bật" : "Đang tắt";
    api.sendMessage(`✅ Trạng thái Goibot hiện tại: ${status}`, threadID);
    return;
  } else {
    api.sendMessage("❌ Vui lòng sử dụng: ai [on/off/check]", threadID);
    return;
  }
};
