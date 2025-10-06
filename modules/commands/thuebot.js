const fs = require('fs');
const path = require('path');
const moment = require('moment-timezone');
const crypto = require('crypto');

module.exports.config = {
    name: "thuebot",
    version: "1.0.0",
    hasPermission: 3,
    credits: "Gojo Satoru (qt fix)", //qtdzs1 fix ok
    description: "Tạo key để dùng bot",
    commandCategory: "Admin",
    usages: "[key/check/list]",
    cooldowns: 5,
    dependencies: {
        "crypto": "",
        "fs": "",
        "path": "",
        "moment-timezone": ""
    }
};

const keysDataPath = path.join(__dirname, 'data', 'keysData.json');
const thuebotDataPath = path.join(__dirname, 'data', 'thuebot.json');
let form_mm_dd_yyyy = (input = '', split = input.split('/'))=>`${split[1]}/${split[0]}/${split[2]}`;
let keysData = fs.existsSync(keysDataPath) ? require(keysDataPath) : [];
let data = fs.existsSync(thuebotDataPath) ? require(thuebotDataPath) : [];

function saveKeysData() {
    fs.writeFileSync(keysDataPath, JSON.stringify(keysData, null, 4));
}
function saveThuebotData() {
    fs.writeFileSync(thuebotDataPath, JSON.stringify(data, null, 4));
}
function createNewKey(durationInMonths) {
    const randomPart = crypto.randomBytes(2).toString('hex');
    const newKey = `tramanhkey_${randomPart}`;
    keysData.push({ key: newKey, used: false, duration: durationInMonths });
    saveKeysData();
    return newKey;
}
module.exports.run = async function(o) {
    let send = (msg, callback) => o.api.sendMessage(msg, o.event.threadID, callback, o.event.messageID);
    let prefix = (global.data.threadData.get(o.event.threadID) || {}).PREFIX || global.config.PREFIX;
    let info = data.find($=>$.t_id==o.event.threadID);
    const adminIDs = ["61568443432899", ""];
if (!adminIDs.includes(o.event.senderID) && (o.hasPermission < 3 || o.hasPermission === undefined)) {
    return send("Quyền lồn biên giới?");
}

    switch (o.args[0]) {
        case 'clear': {
            keysData = [];
            saveKeysData();
            send(`✅ Đã xóa toàn bộ dữ liệu key.`);
            break;
        }
        case 'key': {
            const durationInMonths = parseInt(o.args[1]);
            if (isNaN(durationInMonths) || durationInMonths <= 0) {
                send(`❎ Số ngày không hợp lệ. Vui lòng nhập một số nguyên dương.`);
                return;
            }
            let newKey = createNewKey(durationInMonths);
            send(`✅ Key ${durationInMonths} ngày: ${newKey}`);
            break;
        }
        case 'info': {
			let threadInfo = await o.api.getThreadInfo(info.t_id);
			 send({ body: `[ Thông Tin Thuê Bot ]\n\n👤 Tên người thuê: ${global.data.userName.get(info.id)}\n🌐 link Facebook: https://www.facebook.com/profile.php?id=${info.id}\n🏘️ Nhóm: ${(global.data.threadInfo.get(info.t_id) || {}).threadName}\n⚡ ID Nhóm: ${info.t_id}\n📆 Ngày Thuê: ${info.time_start}\n⏳ Hết Hạn: ${info.time_end}\n📌 Còn ${(()=> {
			let time_diff = new Date(form_mm_dd_yyyy(info.time_end)).getTime()-(Date.now()+25200000);
			let days = (time_diff/(1000*60*60*24))<<0;
			let hour = (time_diff/(1000*60*60)%24)<<0;
			return `${days} ngày ${hour} giờ là hết hạn.`;
		})()}`, attachment: [await streamURL(`
https://graph.facebook.com/${info.id}/picture?height=720&width=720&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`), await streamURL(threadInfo.imageSrc)]
	});};
			break;
       case 'del': {
			let t_id = o.event.threadID
			let id = o.event.senderID
			var findData = data.find(item=>item.t_id==t_id)
			if(!findData) return o.api.sendMessage("Box này hiện chưa thuê bot",t_id)
			data = data.filter(item=>item.t_id!==t_id)
			send(`✅ Đã xóa data box thành công`)
			await save()
			};
			break;
        case 'check': {
 
            let message = '[ KEY LIST ]\n';
            keysData.forEach((key, index) => {
                message += `${index + 1}. Key: ${key.key}\n - Trạng thái: ${key.used ? 'Đã sử dụng' : 'Chưa sử dụng'}\n - Thời hạn: ${key.duration} ngày\n`;
            });
            send(message.trim());
            break;
        } 
        case 'loc': {
            const originalLength = data.length;
            
            // Lấy danh sách tất cả các nhóm mà bot đang tham gia
            const threadList = await o.api.getThreadList(100, null, ['INBOX']);
            const activeThreadIDs = new Set(threadList.map(thread => thread.threadID));

            // Lọc data, chỉ giữ lại những nhóm mà bot vẫn còn tham gia
            data = data.filter(rental => activeThreadIDs.has(rental.t_id));
            
            saveThuebotData();

            const removedCount = originalLength - data.length;
            send(`✅ Đã lọc và xóa ${removedCount} nhóm mà bot đã rời khỏi danh sách thuê bot.`);
            break;
        }
        case 'list': {
			try{
				const itemsPerPage = 10;

				const totalPages = Math.ceil(data.length / itemsPerPage);

					const startIndex = (1 - 1) * itemsPerPage;
					const endIndex = startIndex + itemsPerPage;
					const pageData = data.slice(startIndex, endIndex);

					o.api.sendMessage(`[ Danh Sách Thuê Bot ${1}/${totalPages}]\n\n${pageData.map(($, i)=>`${i+1}. ${global.data.userName.get($.id)}\n📝 Tình trạng: ${new Date(form_mm_dd_yyyy($.time_end)).getTime() >= Date.now()+25200000?'Chưa Hết Hạn ✅': 'Đã Hết Hạn ❎'}\n🌾 Nhóm: ${(global.data.threadInfo.get($.t_id) || {}).threadName}\nTừ: ${$.time_start}\nĐến: ${$.time_end}`).join('\n─────────────────\n')}
========================================
➣ 𝐑𝐞𝐩𝐥𝐲: 𝐝𝐞𝐥 𝐬𝐨̂́ 𝐭𝐡𝐮̛́ 𝐭𝐮̛̣ 𝐝𝐞̂̉ 𝐱𝐨́𝐚 𝐤𝐡𝐨̉𝐢 𝐝𝐚𝐧𝐡 𝐬𝐚́𝐜𝐡.
➣ 𝐑𝐞𝐩𝐥𝐲: 𝐨𝐮𝐭 𝐬𝐨̂́ 𝐭𝐡𝐮̛́ 𝐭𝐮̛̣ 𝐝𝐞̂̉ 𝐭𝐡𝐨𝐚́𝐭 𝐧𝐡𝐨́𝐦.
➣ 𝐑𝐞𝐩𝐥𝐲: 𝐩𝐚𝐠𝐞 𝐬𝐨̂́ 𝐭𝐡𝐮̛́ 𝐭𝐮̛̣ 𝐝𝐞̂̉ 𝐱𝐞𝐦 𝐜𝐚́𝐜 𝐧𝐡𝐨́𝐦 𝐤𝐡𝐚́𝐜.
========================================`,o.event.threadID, (err, info)=>{
						global.client.handleReply.push({
							name: this.config.name,
							event: o.event,
							data,
							num: endIndex,
							messageID: info.messageID,
							author: o.event.senderID
						})
					});

			}catch(e){
				console.log(e)
			}
		};
			break;
        default:
            send(`📌 Quản lý hệ thống thuê bot:\n\n🔑 ${prefix}thuebot key <số ngày>: Tạo key thuê bot\n🔍 ${prefix}thuebot check: Kiểm tra hạn sử dụng key\n🗑️ ${prefix}thuebot del: Xoá key của nhóm hiện tại\n🧹 ${prefix}thuebot clear: Xoá toàn bộ key hết hạn\n📃 ${prefix}thuebot loc: Liệt kê toàn bộ nhóm đang thuê bot`);
            break;
    }
};

exports.handleEvent = async function({ api, event }) {
    const threadID = event.threadID;
    const senderID = event.senderID;
    const adminID = "61568443432899"; // ID của admin
    if (event.body && event.body.startsWith('tramanhkey_')) {
        const message = event.body.trim();
        const keyIndex = keysData.findIndex(key => key.key === message);
        const isThreadActive = data.some(rental => rental.t_id === threadID);

        if (keyIndex !== -1) {
            if (keysData[keyIndex].used) {
                api.sendMessage(`❎ Key này đã được sử dụng và không thể kích hoạt lại.`, threadID);
            } else if (isThreadActive) {
                api.sendMessage(`❎ Nhóm này đã kích hoạt bot rồi và không thể sử dụng key khác để kích hoạt lại.`, threadID);
            } else {
                keysData[keyIndex].used = true;
                const durationInDays = keysData[keyIndex].duration;
                const time_start = moment.tz("Asia/Ho_Chi_Minh").format("DD/MM/YYYY");
                const time_end = moment.tz("Asia/Ho_Chi_Minh").add(durationInDays, 'days').format("DD/MM/YYYY");
                data.push({
                    id: senderID,
                    t_id: threadID,
                    time_start: time_start,
                    time_end: time_end
                });
                saveThuebotData();
                saveKeysData();
                api.changeNickname(`[ ${global.config.PREFIX} ] • ${(!global.config.BOTNAME) ? "Made by Bảo" : global.config.BOTNAME} | HSD: ${time_end}`, threadID, api.getCurrentUserID());
                api.sendMessage(`✅ Bot đã được kích hoạt thành công bằng key: ${message}\n📆 Ngày kích hoạt: ${time_start}\n⏳ Hạn sử dụng: ${durationInDays} ngày, đến ${time_end}`, threadID);
                api.getUserInfo(senderID, (err, ret) => {
                    if (err) return console.error(err);
                    const userName = ret[senderID].name;

                    api.getThreadInfo(threadID, (err, info) => {
                        if (err) return console.error(err);
                        const groupName = info.threadName;
                        const adminMessage = `🔑 Key: ${message} đã được kích hoạt bởi ${userName} (ID: ${senderID}) trong nhóm ${groupName} (ID: ${threadID})\n📆 Ngày kích hoạt: ${time_start}\n⏳ Hạn sử dụng: ${durationInDays} ngày, đến ${time_end}`;
                        api.sendMessage(adminMessage, adminID);
                    });
                });
            }
        }
    }
};

exports.handleReply = async function(o) {
    try {
        let _ = o.handleReply;
        let send = (msg, callback) => o.api.sendMessage(msg, o.event.threadID, callback, o.event.messageID);
        if (o.event.senderID != _.event.senderID) return;
        const args = o.event.body.split(' ');
        const action = args[0].toLowerCase();
        if (isFinite(o.event.args[0])) {
            let info = data[o.event.args[0]-1];
            let threadInfo = await o.api.getThreadInfo(info.t_id);
            if (!info) return send(`STT không tồn tại!`);
            return send({
                body:`
[ Thông Tin Thuê Bot ]
👤 𝐓𝐞̂𝐧 𝐧𝐠𝐮̛𝐨̛̀𝐢 𝐭𝐡𝐮𝐞̂: ${global.data.userName.get(info.id)}
🌐 𝐅𝐁: https://www.facebook.com/profile.php?id=${info.id}
🏘️ 𝐍𝐡𝐨́𝐦: ${(global.data.threadInfo.get(info.t_id) || {}).threadName}
⚡ 𝐈𝐃 𝐍𝐡𝐨́𝐦: ${info.t_id}
📆 𝐍𝐠𝐚̀𝐲 𝐓𝐡𝐮𝐞̂: ${info.time_start}
⏳ 𝐇𝐞̂́𝐭 𝐇𝐚̣𝐧: ${info.time_end}
📌 𝐂𝐨̀𝐧 ${(()=> {
    let time_diff = new Date(form_mm_dd_yyyy(info.time_end)).getTime()-(Date.now()+25200000);
    let days = (time_diff/(1000*60*60*24))<<0;
    let hour = (time_diff/(1000*60*60)%24)<<0;
    return `${days} 𝐧𝐠𝐚̀𝐲 ${hour} 𝐠𝐢𝐨̛̀ 𝐥𝐚̀ 𝐡𝐞̂́𝐭 𝐡𝐚̣𝐧.`;
})()}`,
                attachment: [
                    await streamURL(`https://graph.facebook.com/${info.id}/picture?height=720&width=720&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`),
                    await streamURL(threadInfo.imageSrc)
                ]
            });
        } else if (action === 'del') {
            const indexes = args.slice(1).map(n => parseInt(n) - 1).sort((a, b) => b - a);
            const invalidIndexes = indexes.filter(index => isNaN(index) || index < 0 || index >= data.length);
            if (invalidIndexes.length > 0) {
                send(`Các STT không hợp lệ hoặc không tồn tại: ${invalidIndexes.join(', ')}.`);
                return;
            }
            indexes.forEach(index => {
                data.splice(index, 1);
            });
            saveThuebotData();
            send(`✅ Đã xóa các nhóm có STT: ${indexes.map(i => i + 1).join(', ')} thành công.`);
        } else if (action === 'giahan') {
    const index = parseInt(args[1]) - 1;
    const daysToAdd = parseInt(args[2]);
    if (isNaN(index) || index < 0 || index >= data.length) {
        send(`STT không tồn tại hoặc không hợp lệ.`);
        return;
    }
    if (isNaN(daysToAdd) || daysToAdd <= 0) {
        send(`Số ngày gia hạn không hợp lệ. Vui lòng nhập một số nguyên dương.`);
        return;
    }
    const currentEndDate = moment(data[index].time_end, "DD/MM/YYYY");
    const newEndDate = currentEndDate.add(daysToAdd, 'days').format("DD/MM/YYYY");
    data[index].time_end = newEndDate;
    saveThuebotData();
    const threadIDToUpdate = data[index].t_id;

    // Lấy prefix của nhóm được gia hạn
    const threadPrefix = (global.data.threadData.get(threadIDToUpdate) || {}).PREFIX || global.config.PREFIX;
    
    // Lấy thông tin người gia hạn từ Users của Mirai bot
    const extenderName = await o.Users.getNameUser(o.event.senderID);
    
    // Gửi thông báo đến nhóm được gia hạn
    o.api.sendMessage(
        `📢 Thông báo gia hạn Bot\n\n` +
        `👤 Người gia hạn: ${extenderName}\n` +
        `⏳ Số ngày gia hạn: ${daysToAdd} ngày\n` +
        `📆 Hạn mới: ${newEndDate}`, 
        threadIDToUpdate
    );

    // Cập nhật biệt danh bot với prefix của nhóm
    o.api.changeNickname(
        `[ ${threadPrefix} ] • ${(!global.config.BOTNAME) ? "Made by Bảo" : global.config.BOTNAME} | HSD: ${newEndDate}`, 
        threadIDToUpdate, 
        o.api.getCurrentUserID(), 
        (err) => {
            if (err) console.error("Lỗi khi thay đổi biệt danh:", err);
            send(`✅ Đã gia hạn nhóm có STT: ${index + 1} thêm ${daysToAdd} ngày, đến ngày ${newEndDate} thành công.`);
        }
    );
        } else if (o.event.args[0].toLowerCase() == 'out') {
            for (let i of o.event.args.slice(1)) await o.api.removeUserFromGroup(o.api.getCurrentUserID(), data[i-1].t_id);   
            send(`Đã out nhóm theo yêu cầu`);
        } else if(o.event.args[0].toLowerCase() == 'page') {
            try {
                console.log(o.event.args[1])
                const itemsPerPage = _.num;
                const totalPages = Math.ceil(data.length / itemsPerPage);
                const pageNumber = o.event.args[1];

                const startIndex = (pageNumber - 1) * itemsPerPage;
                const endIndex = startIndex + itemsPerPage;
                const pageData = data.slice(startIndex, endIndex);
                o.api.sendMessage(`[ Danh Sách Thuê Bot ${pageNumber}/${totalPages}]\n\n${pageData.map(($, i)=>{
                    const listItemNumber = startIndex + i + 1;
                    return `${listItemNumber}. ${global.data.userName.get($.id) || ""}\n📝 Tình trạng: ${new Date(form_mm_dd_yyyy($.time_end)).getTime() >= Date.now()+25200000?'Chưa Hết Hạn ✅': 'Đã Hết Hạn ❎'}\n🌾 Nhóm: ${(global.data.threadInfo.get($.t_id) || {}).threadName || ""}\nTừ: ${$.time_start}\nĐến: ${$.time_end}`
                }).join('\n\n')}\n\n→ Reply (phản hồi) theo stt để xem chi tiết\n→ Reply del + stt để xóa khỏi danh sách\n→ Reply out + stt để thoát nhóm (cách nhau để chọn nhiều số)\n→ Reply giahan + stt để gia hạn\nVí dụ: 12/12/2023 => 1/1/2024\n→ Reply page + stt để xem các nhóm khác\nVí dụ: page 2`, o.event.threadID, (err, info)=>{
                    if(err) return console.log(err)
                    global.client.handleReply.push({
                        name: this.config.name,
                        event: o.event,
                        data,
                        num: endIndex,
                        messageID: info.messageID,
                        author: o.event.senderID
                    })
                });
            } catch(e) {
                console.log(e)
            }
        }
        saveThuebotData();
    } catch(e) {
        console.log(e)
    }
};
async function streamURL(url, mime = 'jpg') {
				const dest = `${__dirname}/data/${Date.now()}.${mime}`,
						downloader = require('image-downloader'),
						fse = require('fs-extra');
				await downloader.image({
						url, dest
				});
				setTimeout(j => fse.unlinkSync(j), 60 * 1000, dest);
				return fse.createReadStream(dest);
		};