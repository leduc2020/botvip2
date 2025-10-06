const fs = require("fs");
const path = require("path");

const toggleFile = path.join(__dirname, "data", "ngu.json");

function getToggleData() {
    if (!fs.existsSync(toggleFile)) return {};
    return JSON.parse(fs.readFileSync(toggleFile, "utf-8"));
}

function saveToggleData(data) {
    fs.writeFileSync(toggleFile, JSON.stringify(data, null, 2));
}

module.exports.config = {
    name: "ngungon",
    version: "1.0.3",
    hasPermssion: 0,
    credits: "",
    description: "noprefix",
    commandCategory: "Tiện ích",
    usages: "Ngủ",
    cooldowns: 5,
};

module.exports.handleEvent = function ({ api, event }) {
    const { threadID, messageID, body } = event;
    if (!body) return;

    const toggleData = getToggleData();
    if (toggleData[threadID] === false) return; // lệnh bị tắt trong nhóm này

    const triggerWords = ["ngủ", "nnmd", "Nnmd", "Ngủ đi", "ngủ nha", "chúc ngủ ngon"];
    if (triggerWords.some(word => body.toLowerCase().includes(word))) {
        const audioPath = path.join(__dirname, "noprefix", "ngungon.mp3");

        if (fs.existsSync(audioPath)) {
            const msg = {
                body: "Chúc cậu ngủ ngon!",
                attachment: fs.createReadStream(audioPath),
            };
            return api.sendMessage(msg, threadID, messageID);
        } else {
            return api.sendMessage("Xin lỗi, file âm thanh không tồn tại!", threadID, messageID);
        }
    }
};

module.exports.run = function ({ api, event, args }) {
    const { threadID, messageID } = event;
    const toggleData = getToggleData();

    if (args[0] === "on") {
        toggleData[threadID] = true;
        saveToggleData(toggleData);
        return api.sendMessage("Đã **bật** lệnh 'ngungon' trong nhóm này.", threadID, messageID);
    }

    if (args[0] === "off") {
        toggleData[threadID] = false;
        saveToggleData(toggleData);
        return api.sendMessage("Đã **tắt** lệnh 'ngungon' trong nhóm này.", threadID, messageID);
    }

    return api.sendMessage("Sử dụng: `ngungon on` hoặc `ngungon off`", threadID, messageID);
};
