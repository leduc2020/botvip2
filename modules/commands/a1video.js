module.exports.config = {
  name: "a2",
  version: "2.1.0",
  hasPermssion: 0,
  credits: "dgk",
  description: "Trả lời text ngẫu nhiên khi nhắc đến cosplay hoặc video gái",
  commandCategory: "Thư Viện",
  usages: "",
  cooldowns: 0
};

module.exports.handleEvent = async ({ api, event }) => {
  const { threadID, messageID, body } = event;
  if (!body) return;

  const axios = require("axios");

  const cosKeywords = [
    "vdcos"
  ];
  const girlKeywords = [
    "vdgai"
  ];
    const traiKeywords = [
    "vdtrai"
  ];
      const animeKeywords = [
    "vdanime"
  ];
      const chillKeywords = [
    "vdchill"
  ];

  const cosReplies = [
    "Cosplay à? Mình đang tìm thêm bộ mới nè.",
    "cosplay dễ thương tới đây"
  ];
  const girlReplies = [
    "Video gái liền nè!",
    "Mlem mlem~ Gửi bạn video gái nè!",
    "Video hot girl đây, xem xong nhớ cho 5 sao nha!",
    "Gái xinh tới rồi, coi cẩn thận kẻo xịt máu mũi!"
  ];
  const traiReplies = [
    "Video trai tới liền nè!",
    "Mlem mlem~ Gửi bạn video trai nè!",
    "Bớt mê trai lại nha :))"
  ];
   const animeReplies = [
    "Video anime tới liền nè!",
    "Mlem mlem~ Gửi bạn video anime nè!",
    "Anime ngầu chưa :))"
  ]; 
    const chillReplies = [
    "Video chill tới liền nè!",
    "Gửi bạn video chill nè!"
  ];

  const lowerBody = body.toLowerCase();

  // Nếu nhắc đến cosplay
  if (cosKeywords.some(key => lowerBody.includes(key))) {
    try {
      const randomText = cosReplies[Math.floor(Math.random() * cosReplies.length)];
      const stream = (await axios.get(global.mm("vdcos", "datajson"), { responseType: "stream" })).data;
      return api.sendMessage({ body: randomText, attachment: stream }, threadID, messageID);
    } catch (e) {
      return api.sendMessage("Bot không tìm được video cosplay lúc này, thử lại sau nhé!", threadID, messageID);
    }
  }
  // Nếu nhắc đến video gái
  if (girlKeywords.some(key => lowerBody.includes(key))) {
    try {
      const randomText = girlReplies[Math.floor(Math.random() * girlReplies.length)];
      const stream = (await axios.get(global.mm("vdgai", "datajson"), { responseType: "stream" })).data;
      return api.sendMessage({ body: randomText, attachment: stream }, threadID, messageID);
    } catch (e) {
      return api.sendMessage("Bot không tìm được video gái lúc này, thử lại sau nhé!", threadID, messageID);
    }
  }
    // Nếu nhắc đến trai
  if (traiKeywords.some(key => lowerBody.includes(key))) {
    try {
      const randomText = traiReplies[Math.floor(Math.random() * traiReplies.length)];
      const stream = (await axios.get(global.mm("vdtrai", "datajson"), { responseType: "stream" })).data;
      return api.sendMessage({ body: randomText, attachment: stream }, threadID, messageID);
    } catch (e) {
      return api.sendMessage("Bot không tìm được video trai lúc này, thử lại sau nhé!", threadID, messageID);
    }
  }
    // Nếu nhắc đến anime
  if (animeKeywords.some(key => lowerBody.includes(key))) {
    try {
      const randomText = animeReplies[Math.floor(Math.random() * animeReplies.length)];
      const stream = (await axios.get(global.mm("vdanime", "datajson"), { responseType: "stream" })).data;
      return api.sendMessage({ body: randomText, attachment: stream }, threadID, messageID);
    } catch (e) {
      return api.sendMessage("Bot không tìm được video anime lúc này, thử lại sau nhé!", threadID, messageID);
    }
  }
    // Nếu nhắc đến chill
  if (chillKeywords.some(key => lowerBody.includes(key))) {
    try {
      const randomText = chillReplies[Math.floor(Math.random() * chillReplies.length)];
      const stream = (await axios.get(global.mm("vdchill", "datajson"), { responseType: "stream" })).data;
      return api.sendMessage({ body: randomText, attachment: stream }, threadID, messageID);
    } catch (e) {
      return api.sendMessage("Bot không tìm được video chill lúc này, thử lại sau nhé!", threadID, messageID);
    }
  }
};

module.exports.run = async () => {};
