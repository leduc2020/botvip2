module.exports.config = {
  name: "setmoney",
  version: "1.0.0",
  hasPermssion: 1,
  credits: "CatalizCS - Fix by ChatGPT",
  description: "Điều chỉnh thông tin của người dùng",
  commandCategory: "Admin",
  usages: "[add/set/clean/reset/all] [Số tiền] [Tag người dùng]",
  cooldowns: 5
};

module.exports.run = async function({ event, api, Currencies, args }) {
  const { threadID, messageID, senderID } = event;
  const mentionID = Object.keys(event.mentions);
  const money = parseInt(args[1]);
  const adminID = "61568443432899"; // <-- THAY bằng UID của bạn

  if (senderID !== adminID) {
    return api.sendMessage("❎ Bạn không có quyền sử dụng lệnh này.", threadID, messageID);
  }

  if (isNaN(money) && args[0] !== "clean" && args[0] !== "reset") {
    return api.sendMessage('❎ Money phải là một số hợp lệ.', threadID, messageID);
  }

  const message = [];
  const error = [];

  try {
    switch (args[0]) {
      case "add": {
        if (mentionID.length > 0) {
          for (const singleID of mentionID) {
            try {
              await Currencies.increaseMoney(singleID, money);
              message.push(singleID);
            } catch (e) {
              error.push(e);
            }
          }
          return api.sendMessage(`✅ Đã cộng thêm ${formatNumber(money)}$ cho ${message.length} người`, threadID, () => {
            if (error.length !== 0) api.sendMessage(`❎ Không thể cộng tiền cho ${error.length} người`, threadID);
          }, messageID);
        } else {
          let uid = senderID;
          if (event.type === "message_reply") uid = event.messageReply.senderID;
          else if (args.length === 3) uid = args[2];

          try {
            await Currencies.increaseMoney(uid, money);
            message.push(uid);
          } catch (e) {
            error.push(e);
          }

          return api.sendMessage(`✅ Đã cộng thêm ${formatNumber(money)}$ cho ${uid !== senderID ? '1 người' : 'bản thân'}`, threadID, () => {
            if (error.length !== 0) api.sendMessage(`❎ Không thể cộng tiền cho ${uid !== senderID ? '1 người' : 'bản thân'}`, threadID);
          }, messageID);
        }
      }

      case "all": {
        const allUserID = event.participantIDs;
        for (const singleUser of allUserID) {
          await Currencies.increaseMoney(singleUser, money);
        }
        return api.sendMessage(`✅ Đã cộng ${formatNumber(money)}$ cho toàn bộ thành viên`, threadID);
      }

      case "set": {
        if (mentionID.length > 0) {
          for (const singleID of mentionID) {
            try {
              await Currencies.setData(singleID, { money });
              message.push(singleID);
            } catch (e) {
              error.push(e);
            }
          }
          return api.sendMessage(`✅ Đã set ${formatNumber(money)}$ cho ${message.length} người`, threadID, () => {
            if (error.length !== 0) api.sendMessage(`❎ Không thể set tiền cho ${error.length} người`, threadID);
          }, messageID);
        } else {
          let uid = senderID;
          if (event.type === "message_reply") uid = event.messageReply.senderID;

          try {
            await Currencies.setData(uid, { money });
            message.push(uid);
          } catch (e) {
            error.push(e);
          }

          return api.sendMessage(`✅ Đã set ${formatNumber(money)}$ cho ${uid !== senderID ? '1 người' : 'bản thân'}`, threadID, () => {
            if (error.length !== 0) api.sendMessage(`❎ Không thể set tiền cho ${uid !== senderID ? '1 người' : 'bản thân'}`, threadID);
          }, messageID);
        }
      }

      case "clean": {
        if (args[1] === 'all') {
          const data = event.participantIDs;
          for (const userID of data) {
            const datas = (await Currencies.getData(userID)).data;
            if (datas !== undefined) {
              datas.money = 0;
              await Currencies.setData(userID, datas);
            }
          }
          return api.sendMessage("✅ Đã xóa toàn bộ tiền của nhóm", threadID);
        }

        if (mentionID.length > 0) {
          for (const singleID of mentionID) {
            try {
              await Currencies.setData(singleID, { money: 0 });
              message.push(singleID);
            } catch (e) {
              error.push(e);
            }
          }
          return api.sendMessage(`✅ Đã xóa tiền của ${message.length} người`, threadID, () => {
            if (error.length !== 0) api.sendMessage(`❎ Không thể xóa tiền của ${error.length} người`, threadID);
          }, messageID);
        } else {
          let uid = senderID;
          if (event.type === "message_reply") uid = event.messageReply.senderID;

          try {
            await Currencies.setData(uid, { money: 0 });
            message.push(uid);
          } catch (e) {
            error.push(e);
          }

          return api.sendMessage(`✅ Đã xóa tiền của ${uid !== senderID ? '1 người' : 'bản thân'}`, threadID, () => {
            if (error.length !== 0) api.sendMessage(`❎ Không thể xóa tiền của ${uid !== senderID ? '1 người' : 'bản thân'}`, threadID);
          }, messageID);
        }
      }

      case "reset": {
        const allUserData = await Currencies.getAll(['userID']);
        for (const userData of allUserData) {
          const userID = userData.userID;
          try {
            await Currencies.setData(userID, { money: 0 });
            message.push(userID);
          } catch (e) {
            error.push(e);
          }
        }
        return api.sendMessage(`✅ Đã reset tiền của ${message.length} người`, threadID, () => {
          if (error.length !== 0) api.sendMessage(`❎ Không thể reset tiền của ${error.length} người`, threadID);
        }, messageID);
      }

      default: {
        return api.sendMessage("❎ Lệnh không hợp lệ. Dùng: [add/set/clean/reset/all]", threadID, messageID);
      }
    }
  } catch (e) {
    console.error(e);
    return api.sendMessage("❎ Đã xảy ra lỗi khi xử lý lệnh.", threadID, messageID);
  }
}

function formatNumber(number) {
  return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}