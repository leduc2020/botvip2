const { readdirSync, readFileSync, writeFileSync, existsSync } = require("fs-extra");
const { resolve } = require("path");

module.exports.config = {
    name: "admin",
    version: "1.0.6",
    hasPermssion: 1,
    credits: "Mirai Team - Modified by Satoru",
    description: "Quản lý và cấu hình ADMIN BOT",
    commandCategory: "Hệ thống",
    usages: "< add/remove | Super Admin & Admin > | < list/only/ibrieng >",
    cooldowns: 2,
    dependencies: {
        "fs-extra": ""
    }
};

module.exports.languages = {
    "vi": {
        "listAdmin": `=== [ DANH SÁCH ADMIN & NGƯỜI HỖ TRỢ ] ===\n━━━━━━━━━━━━━━━━━━\n=== [ ADMIN BOT ] ===\n%1\n\n=== [ NGƯỜI HỖ TRỢ ] ===\n%2\n\nReply số thứ tự để xóa đối tượng tương ứng.`,
        "notHavePermssion": '[ ADMIN ] → Bạn không đủ quyền hạn để có thể sử dụng chức năng "%1"',
        "addedSuccess": '[ ADMIN ] → Đã thêm %1 người dùng trở thành %2:\n\n%3',
        "removedSuccess": '[ ADMIN ] → Đã gỡ vai trò %1 của %2 người dùng:\n\n%3',
        "removedByIndex": '[ ADMIN ] → Đã gỡ thành công %1:\n%2',
        "invalidIndex": '[ ADMIN ] → Số thứ tự không hợp lệ!'
    }
};

module.exports.onLoad = function() {
    const pathData = resolve(__dirname, 'data', 'dataAdbox.json');
    if (!existsSync(pathData)) {
        const obj = {
            adminOnly: {},
            adminbox: {},
            only: {},
            privateChat: {}
        };
        writeFileSync(pathData, JSON.stringify(obj, null, 4));
    }
};

module.exports.handleReply = async function({ api, event, handleReply, getText, Users }) {
    if (event.senderID != handleReply.author) return;
    const { threadID, messageID, body } = event;
    const { configPath } = global.client;
    const config = require(configPath);
    
    const index = parseInt(body);
    if (isNaN(index)) return api.sendMessage(getText("invalidIndex"), threadID, messageID);
    
    let targetArray, targetIndex, roleText;
    const adminLength = config.ADMINBOT.length;
    
    if (index <= adminLength) {
        targetArray = config.ADMINBOT;
        targetIndex = index - 1;
        roleText = "ADMIN BOT";
    } else {
        targetArray = config.NDH;
        targetIndex = index - adminLength - 1;
        roleText = "NGƯỜI HỖ TRỢ";
    }
    
    if (targetIndex < 0 || targetIndex >= targetArray.length) {
        return api.sendMessage(getText("invalidIndex"), threadID, messageID);
    }
    
    const removedUID = targetArray[targetIndex];
    const name = await Users.getNameUser(removedUID);
    
    targetArray.splice(targetIndex, 1);
    if (roleText === "ADMIN BOT") {
        global.config.ADMINBOT.splice(global.config.ADMINBOT.indexOf(removedUID), 1);
    } else {
        global.config.NDH.splice(global.config.NDH.indexOf(removedUID), 1);
    }
    
    writeFileSync(configPath, JSON.stringify(config, null, 4), 'utf8');
    
    return api.sendMessage(
        getText("removedByIndex", roleText, `${removedUID} - ${name}`),
        threadID,
        messageID
    );
};

module.exports.run = async function({ api, event, args, Users, permssion, getText }) {
    const { threadID, messageID, mentions, senderID } = event;
    const { configPath } = global.client;
    const config = require(configPath);
    const mention = Object.keys(mentions);
    
    if (!args[0]) {
        return api.sendMessage(
            `=== [ ADMIN PANEL ] ===\n━━━━━━━━━━━━━━━━━━\n\n` +
            `→ admin list: Xem danh sách quản lý\n` +
            `→ admin add: Thêm quản trị viên\n` +
            `→ admin remove: Gỡ quản trị viên\n` +
            `→ admin addndh: Thêm người hỗ trợ\n` +
            `→ admin removendh: Gỡ người hỗ trợ\n` +
            `→ admin qtvonly: Bật/tắt chế độ QTV\n` +
            `→ admin only: Bật/tắt chế độ Admin\n` +
            `→ admin ibrieng: Bật/tắt chat riêng\n\n` +
            `━━━━━━━━━━━━━━━━━━`,
            threadID, messageID
        );
    }

    const getUids = async (type) => {
        let uids = [];
        if (event.type === "message_reply") {
            uids.push(event.messageReply.senderID);
        } else if (mention.length > 0) {
            uids = mention;
        } else if (args[1] && !isNaN(args[1])) {
            uids.push(args[1]);
        }
        return uids;
    };

    const addUsers = async (uids, type) => {
        const added = [];
        for (const uid of uids) {
            const name = global.data.userName.get(uid) || await Users.getNameUser(uid);
            if (type === "ADMIN" && !config.ADMINBOT.includes(uid)) {
                config.ADMINBOT.push(uid);
                global.config.ADMINBOT.push(uid);
                added.push(`${uid} - ${name}`);
            } else if (type === "NDH" && !config.NDH.includes(uid)) {
                config.NDH.push(uid);
                global.config.NDH.push(uid);
                added.push(`${uid} - ${name}`);
            }
        }
        return added;
    };

    const removeUsers = async (uids, type) => {
        const removed = [];
        for (const uid of uids) {
            const name = global.data.userName.get(uid) || await Users.getNameUser(uid);
            if (type === "ADMIN") {
                const index = config.ADMINBOT.indexOf(uid);
                if (index !== -1) {
                    config.ADMINBOT.splice(index, 1);
                    global.config.ADMINBOT.splice(global.config.ADMINBOT.indexOf(uid), 1);
                    removed.push(`${uid} - ${name}`);
                }
            } else if (type === "NDH") {
                const index = config.NDH.indexOf(uid);
                if (index !== -1) {
                    config.NDH.splice(index, 1);
                    global.config.NDH.splice(global.config.NDH.indexOf(uid), 1);
                    removed.push(`${uid} - ${name}`);
                }
            }
        }
        return removed;
    };

    switch (args[0]) {
        case "list": {
            if (permssion < 2) return api.sendMessage(getText("notHavePermssion", "list"), threadID, messageID);
            
            let adminList = [], ndhList = [];
            let count = 1;
            
            for (const id of config.ADMINBOT) {
                const name = global.data.userName.get(id) || await Users.getNameUser(id);
                adminList.push(`${count++}. ${name}\n→ ID: ${id}`);
            }
            
            for (const id of config.NDH) {
                const name = global.data.userName.get(id) || await Users.getNameUser(id);
                ndhList.push(`${count++}. ${name}\n→ ID: ${id}`);
            }

            return api.sendMessage(
                getText("listAdmin", adminList.join("\n\n"), ndhList.join("\n\n")),
                threadID,
                (error, info) => {
                    global.client.handleReply.push({
                        name: this.config.name,
                        messageID: info.messageID,
                        author: senderID
                    });
                },
                messageID
            );
        }

        case "add": {
            if (permssion !== 3) return api.sendMessage(getText("notHavePermssion", "add"), threadID, messageID);
            const uids = await getUids("ADMIN");
            const added = await addUsers(uids, "ADMIN");
            if (added.length > 0) {
                writeFileSync(configPath, JSON.stringify(config, null, 4), 'utf8');
                return api.sendMessage(getText("addedSuccess", added.length, "ADMIN BOT", added.join("\n")), threadID, messageID);
            }
            break;
        }

        case "addndh": {
            if (permssion !== 3) return api.sendMessage(getText("notHavePermssion", "addndh"), threadID, messageID);
            const uids = await getUids("NDH");
            const added = await addUsers(uids, "NDH");
            if (added.length > 0) {
                writeFileSync(configPath, JSON.stringify(config, null, 4), 'utf8');
                return api.sendMessage(getText("addedSuccess", added.length, "NGƯỜI HỖ TRỢ", added.join("\n")), threadID, messageID);
            }
            break;
        }

        case "remove": {
            if (permssion !== 3) return api.sendMessage(getText("notHavePermssion", "remove"), threadID, messageID);
            const uids = await getUids("ADMIN");
            const removed = await removeUsers(uids, "ADMIN");
            if (removed.length > 0) {
                writeFileSync(configPath, JSON.stringify(config, null, 4), 'utf8');
                return api.sendMessage(getText("removedSuccess", "ADMIN BOT", removed.length, removed.join("\n")), threadID, messageID);
            }
            break;
        }

        case "removendh": {
            if (permssion !== 3) return api.sendMessage(getText("notHavePermssion", "removendh"), threadID, messageID);
            const uids = await getUids("NDH");
            const removed = await removeUsers(uids, "NDH");
            if (removed.length > 0) {
                writeFileSync(configPath, JSON.stringify(config, null, 4), 'utf8');
                return api.sendMessage(getText("removedSuccess", "NGƯỜI HỖ TRỢ", removed.length, removed.join("\n")), threadID, messageID);
            }
            break;
        }

        case "qtvonly": {
            const pathData = resolve(__dirname, 'data', 'dataAdbox.json');
            const database = require(pathData);
            if (permssion < 1) return api.sendMessage("[ ADMIN ] → Cần quyền Quản trị viên trở lên", threadID, messageID);
            
            database.adminbox[threadID] = !database.adminbox[threadID];
            writeFileSync(pathData, JSON.stringify(database, null, 4));
            
            return api.sendMessage(
                `[ ADMIN ] → ${database.adminbox[threadID] ? 
                    "Bật chế độ QTV Only thành công" : 
                    "Tắt chế độ QTV Only thành công"}`,
                threadID, messageID
            );
        }

        case "only": {
            const pathData = resolve(__dirname, 'data', 'dataAdbox.json');
            const database = require(pathData);
            if (permssion < 2) return api.sendMessage("[ ADMIN ] → Cần quyền ADMIN trở lên", threadID, messageID);
            
            database.only[threadID] = !database.only[threadID];
            writeFileSync(pathData, JSON.stringify(database, null, 4));
            
            return api.sendMessage(
                `[ ADMIN ] → ${database.only[threadID] ? 
                    "Bật chế độ Admin Only thành công" : 
                    "Tắt chế độ Admin Only thành công"}`,
                threadID, messageID
            );
        }

        case "ibrieng": {
            const pathData = resolve(__dirname, 'data', 'dataAdbox.json');
            const database = require(pathData);
            if (permssion !== 3) return api.sendMessage("[ ADMIN ] → Cần quyền ADMIN để thực hiện", threadID, messageID);
            
            database.privateChat[threadID] = !database.privateChat[threadID];
            writeFileSync(pathData, JSON.stringify(database, null, 4));
            
            return api.sendMessage(
                `[ ADMIN ] → ${database.privateChat[threadID] ? 
                    "Bật chế độ chat riêng thành công" : 
                    "Tắt chế độ chat riêng thành công"}`,
                threadID, messageID
            );
        }

        default: {
            return api.sendMessage("[ ADMIN ] → Lệnh không hợp lệ! Gõ 'admin' để xem hướng dẫn", threadID, messageID);
        }
    }
};