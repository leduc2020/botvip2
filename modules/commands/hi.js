const fs = require("fs");
const axios = require("axios");
const moment = require("moment-timezone");
const path = require("path");

const KEY = [
    "hello", "hi", "hai", "chào", "chao", "hí", "híí", "hì", "hìì", "lô", "hii", "helo", "hê nhô",
    "xin chào", "2", "helo", "hê nhô", "hi mn", "hello mn"
];

const DEFAULT_GREETINGS = {
    morning_early: [
        "Chúc bạn buổi sáng tràn đầy năng lượng",
        "Chào buổi sáng mới tốt lành nhé"
    ],
    morning: [
        "Chúc bạn buổi sáng vui vẻ"
    ],
    noon: [
        "Chúc bạn buổi trưa vui vẻ",
        "Nghỉ trưa thật ngon giấc nhé"
    ],
    afternoon: [
        "Chúc bạn buổi chiều vui vẻ",
        "Chiều tà rồi, nghỉ ngơi nhé!"
    ],
    evening: [
        "Chúc bạn buổi tối vui vẻ"
    ],
    night: [
        "Khuya rồi, ngủ ngon nhé!",
        "Chúc ngủ ngon nhé"
    ]
};

const AUDIO_PATH = path.join(__dirname, "..", "..", "music", "hi.mp3");
let filePath;

module.exports.config = {
    name: "hi",
    version: "1.3.0",
    hasPermission: 0,
    credits: "TrungAnh",
    description: "Chào hỏi tự động kèm âm thanh và tùy chỉnh câu chào",
    commandCategory: "Tiện ích",
    usages: "[on/off/setaudio/add/remove/list]",
    cooldowns: 5
};

module.exports.onLoad = () => {
    const dir = path.join(__dirname, "data");
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
    }
    
    filePath = path.join(dir, "hi.json");
    if (!fs.existsSync(filePath)) {
        const defaultData = {
            global: {
                customGreetings: {}
            }
        };
        fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2));
    }
};

function getGreeting(hours, threadID) {
    let session;
    let greetings;
    let savedData = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    let customGreetings = savedData.global.customGreetings[hours] || [];

    if (hours >= 0 && hours <= 4) {
        session = "đêm";
        greetings = [...DEFAULT_GREETINGS.night, ...customGreetings];
    } else if (hours > 4 && hours <= 7) {
        session = "sáng sớm";
        greetings = [...DEFAULT_GREETINGS.morning_early, ...customGreetings];
    } else if (hours > 7 && hours <= 11) {
        session = "sáng";
        greetings = [...DEFAULT_GREETINGS.morning, ...customGreetings];
    } else if (hours > 11 && hours <= 13) {
        session = "trưa";
        greetings = [...DEFAULT_GREETINGS.noon, ...customGreetings];
    } else if (hours > 13 && hours <= 17) {
        session = "chiều";
        greetings = [...DEFAULT_GREETINGS.afternoon, ...customGreetings];
    } else if (hours > 17 && hours <= 21) {
        session = "tối";
        greetings = [...DEFAULT_GREETINGS.evening, ...customGreetings];
    } else {
        session = "đêm";
        greetings = [...DEFAULT_GREETINGS.night, ...customGreetings];
    }

    return {
        session,
        greeting: greetings[Math.floor(Math.random() * greetings.length)]
    };
}

module.exports.handleEvent = async function({ event, api, Users }) {
    const { threadID, messageID, body } = event;

    try {
        let savedData = {};
        try {
            const jsonData = fs.readFileSync(filePath, "utf-8");
            savedData = JSON.parse(jsonData);
        } catch (err) {
            console.error("Lỗi đọc file hi.json:", err);
            savedData = {};
        }

        if (typeof savedData[threadID]?.hi === "undefined" || savedData[threadID].hi === true) {
            if (body && KEY.includes(body.toLowerCase())) {
                const hours = parseInt(moment.tz('Asia/Ho_Chi_Minh').format('HH'));
                const { session, greeting } = getGreeting(hours, threadID);

                let name = await Users.getNameUser(event.senderID);
                let mentions = [{ tag: name, id: event.senderID }];

                let msg = {
                    body: `Xin chào ${name}, ${greeting} ❤️`,
                    mentions,
                    attachment: fs.existsSync(AUDIO_PATH) ? fs.createReadStream(AUDIO_PATH) : null
                };

                api.sendMessage(msg, threadID, messageID);
            }
        }
    } catch (error) {
        console.error("Lỗi xử lý tin nhắn chào:", error);
    }
};

module.exports.run = async ({ event, api, args }) => {
    const { threadID, messageID } = event;

    try {
        let savedData = JSON.parse(fs.readFileSync(filePath, "utf-8"));
        if (!savedData.global) savedData.global = { customGreetings: {} };
        
        const command = (args[0] || "").toLowerCase();

        switch (command) {
            case "on":
                savedData[threadID] = { hi: true };
                api.sendMessage("☑️ Đã bật chức năng chào!", threadID, messageID);
                break;
            
            case "off":
                savedData[threadID] = { hi: false };
                api.sendMessage("☑️ Đã tắt chức năng chào!", threadID, messageID);
                break;

            case "setaudio":
                if (!event.messageReply || !event.messageReply.attachments || !event.messageReply.attachments[0].url) {
                    return api.sendMessage("⚠️ Vui lòng reply một file âm thanh để cài đặt!", threadID, messageID);
                }

                const dir = path.join(__dirname, "..", "..", "music");
                if (!fs.existsSync(dir)) {
                    fs.mkdirSync(dir, { recursive: true });
                }

                try {
                    const response = await axios.get(event.messageReply.attachments[0].url, { responseType: 'arraybuffer' });
                    fs.writeFileSync(AUDIO_PATH, Buffer.from(response.data));
                    api.sendMessage("✅ Đã cài đặt âm thanh chào thành công!", threadID, messageID);
                } catch (e) {
                    api.sendMessage("❌ Lỗi khi tải file âm thanh!", threadID, messageID);
                }
                break;

            case "add":
                const hour = parseInt(args[1]);
                if (isNaN(hour) || hour < 0 || hour > 23) {
                    return api.sendMessage("⚠️ Vui lòng nhập giờ hợp lệ (0-23)!", threadID, messageID);
                }
                const greeting = args.slice(2).join(" ");
                if (!greeting) {
                    return api.sendMessage("⚠️ Vui lòng nhập câu chào!", threadID, messageID);
                }
                
                if (!savedData.global.customGreetings[hour]) {
                    savedData.global.customGreetings[hour] = [];
                }
                savedData.global.customGreetings[hour].push(greeting);
                api.sendMessage(`✅ Đã thêm câu chào cho ${hour}h: ${greeting}`, threadID, messageID);
                break;

            case "remove":
                const hourToRemove = parseInt(args[1]);
                const index = parseInt(args[2]) - 1;
                
                if (isNaN(hourToRemove) || !savedData.global.customGreetings[hourToRemove]) {
                    return api.sendMessage("⚠️ Giờ không hợp lệ hoặc không có câu chào tùy chỉnh!", threadID, messageID);
                }
                
                if (isNaN(index) || index < 0 || index >= savedData.global.customGreetings[hourToRemove].length) {
                    return api.sendMessage("⚠️ Số thứ tự câu chào không hợp lệ!", threadID, messageID);
                }
                
                const removed = savedData.global.customGreetings[hourToRemove].splice(index, 1);
                api.sendMessage(`✅ Đã xóa câu chào: ${removed[0]}`, threadID, messageID);
                break;

            case "list":
                const hour2 = parseInt(args[1]);
                if (isNaN(hour2) || hour2 < 0 || hour2 > 23) {
                    let msg = "📝 Danh sách câu chào tùy chỉnh:\n";
                    for (let h in savedData.global.customGreetings) {
                        if (savedData.global.customGreetings[h].length > 0) {
                            msg += `\n${h}h:\n`;
                            savedData.global.customGreetings[h].forEach((greeting, i) => {
                                msg += `${i + 1}. ${greeting}\n`;
                            });
                        }
                    }
                    api.sendMessage(msg, threadID, messageID);
                } else {
                    if (!savedData.global.customGreetings[hour2] || savedData.global.customGreetings[hour2].length === 0) {
                        api.sendMessage(`❌ Không có câu chào tùy chỉnh nào cho ${hour2}h!`, threadID, messageID);
                    } else {
                        let msg = `📝 Câu chào tùy chỉnh cho ${hour2}h:\n`;
                        savedData.global.customGreetings[hour2].forEach((greeting, i) => {
                            msg += `${i + 1}. ${greeting}\n`;
                        });
                        api.sendMessage(msg, threadID, messageID);
                    }
                }
                break;

            default:
                api.sendMessage("⚠️ Vui lòng sử dụng:\n- hi on: Bật chức năng\n- hi off: Tắt chức năng\n- hi setaudio: Cài đặt âm thanh (reply file)\n- hi add [giờ] [câu chào]: Thêm câu chào\n- hi remove [giờ] [số thứ tự]: Xóa câu chào\n- hi list [giờ]: Xem danh sách câu chào", threadID, messageID);
                return;
        }

        fs.writeFileSync(filePath, JSON.stringify(savedData, null, 2));

    } catch (error) {
        console.error("Lỗi xử lý lệnh hi:", error);
        api.sendMessage("❌ Đã có lỗi xảy ra!", threadID, messageID);
    }
};