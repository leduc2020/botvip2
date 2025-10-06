module.exports.config = {
  name: "listban",
  version: "1.0.0",
  hasPermssion: 2,
  credits: "ManhG",
  description: "Xem danh sách ban của nhóm hoặc của người dùng",
  commandCategory: "Admin",
  usages: "[thread/user]",
  cooldowns: 5,
  images: [],
};

module.exports.handleReply = async function ({ api, Users, Threads, handleReply, event }) {
  const { threadID, messageID, body, senderID } = event;
  if (parseInt(senderID) !== parseInt(handleReply.author)) return;

  const indicesToUnban = body.split(" ").map(n => parseInt(n) - 1);
  const itemsToUnban = indicesToUnban.map(idx => handleReply.listBanned[idx]).filter(Boolean);

  if (itemsToUnban.length === 0) {
    return api.sendMessage("Không tìm thấy mục tương ứng để unban. Hãy kiểm tra lại số thứ tự.", threadID);
  }

  for (let item of itemsToUnban) {
    const uidMatch = item.match(/UID: (\d+)/);
    const tidMatch = item.match(/TID: (\d+)/);
    const id = uidMatch ? uidMatch[1] : tidMatch ? tidMatch[1] : null;

    if (!id) continue;

    let data;
    if (handleReply.type === "unbanthread") {
      data = (await Threads.getData(id)).data || {};
      data.banned = 0;
      data.reason = null;
      data.dateAdded = null;
      await Threads.setData(id, { data });
      global.data.threadBanned.delete(id);
    } else {
      data = (await Users.getData(id)).data || {};
      data.banned = 0;
      data.reason = null;
      data.dateAdded = null;
      await Users.setData(id, { data });
      global.data.userBanned.delete(id);
    }
  }

  const messageContent = itemsToUnban.map((item, idx) => `${idx + 1}. ${item}`).join("\n");
  api.sendMessage(`📌 Thực thi unban [true/false]\n──────────────────\n\n${messageContent}`, threadID, () => {
    api.unsendMessage(messageID);
  });
};

module.exports.run = async function ({ event, api, Users, args, Threads }) {
  const { threadID, messageID } = event;
  const queryType = args[0]?.toLowerCase();

  if (["thread", "t", "-t"].includes(queryType)) {
    const threadBanned = Array.from(global.data.threadBanned.keys());
    const listBanned = await Promise.all(threadBanned.map(async (id, idx) => {
      const name = global.data.threadInfo.get(id)?.threadName || "Tên không tồn tại";
      const reason = global.data.threadBanned.get(id)?.reason || "Không rõ";
      const date = global.data.threadBanned.get(id)?.dateAdded || "Không rõ";
      return `${idx + 1}. ${name}\n🔰 TID: ${id}\n📋 Lí do: ${reason}\n⏰ Time ban: ${date}`;
    }));

    if (listBanned.length === 0) {
      return api.sendMessage("Không có nhóm nào bị ban 😻", threadID, messageID);
    }

    api.sendMessage(
      `=== [ LISTBAN THREAD ] ===\n──────────────────\n📝 Hiện tại gồm có ${listBanned.length} nhóm bị ban\n\n${listBanned.join("\n\n")}\n\n📌 Reply (phản hồi) tin nhắn này + số thứ tự, có thể rep nhiều số, cách nhau bằng dấu cách nếu muốn unban thread tương ứng`,
      threadID,
      (error, info) => {
        if (error) return console.error(error);
        global.client.handleReply.push({
          name: this.config.name,
          messageID: info.messageID,
          author: event.senderID,
          type: 'unbanthread',
          listBanned: listBanned.map(item => item.match(/🔰 TID: (\d+)/)?.[0].trim())
        });
      }
    );
  } else if (["user", "u", "-u"].includes(queryType)) {
    const userBanned = Array.from(global.data.userBanned.keys());
    const listBanned = await Promise.all(userBanned.map(async (id, idx) => {
      const name = global.data.userName.get(id) || await Users.getNameUser(id);
      const reason = global.data.userBanned.get(id)?.reason || "Không rõ";
      const date = global.data.userBanned.get(id)?.dateAdded || "Không rõ";
      return `${idx + 1}. ${name}\n🔰 UID: ${id}\n📋 Lí do: ${reason}\n⏰ Time ban: ${date}`;
    }));

    if (listBanned.length === 0) {
      return api.sendMessage("Không có người dùng bị ban 😻", threadID, messageID);
    }

    api.sendMessage(
      `=== [ LISTBAN USER ] ===\n──────────────────\n📝 Hiện tại có ${listBanned.length} người dùng bị ban\n\n${listBanned.join("\n\n")}\n\n📌 Reply (phản hồi) tin nhắn này + số thứ tự, có thể rep nhiều số, cách nhau bằng dấu cách nếu muốn unban user tương ứng`,
      threadID,
      (error, info) => {
        if (error) return console.error(error);
        global.client.handleReply.push({
          name: this.config.name,
          messageID: info.messageID,
          author: event.senderID,
          type: 'unbanuser',
          listBanned: listBanned.map(item => item.match(/🔰 UID: (\d+)/)?.[0].trim())
        });
      }
    );
  } else {
    global.utils.throwError(this.config.name, threadID, messageID);
  }
};