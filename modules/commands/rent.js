
const moment = require('moment-timezone');
const TIMEZONE = 'Asia/Ho_Chi_Minh';
module.exports.config = {
   name: 'rent',
   version: '1.3.7',
   hasPermssion: 3,
   credits: 'DC-Nam & DongDev source lại& Mod by NgHuy',
   description: 'thuê bot',
   commandCategory: 'Admin',
   usages: '[]',
   cooldowns: 5,
   usePrefix: false,
};
let fs = require('fs');
if (!fs.existsSync(__dirname + '/data'))
   fs.mkdirSync(__dirname + '/data');
let path = __dirname + '/data/thuebot.json';
let data = [];
let save = () => fs.writeFileSync(path, JSON.stringify(data));
if (!fs.existsSync(path)) save();
else data = require(path);
let form_mm_dd_yyyy = (input = '', split = input.split('/')) => `${split[1]}/${split[0]}/${split[2]}`;
let invalid_date = date => /^Invalid Date$/.test(new Date(date));

exports.run = function (o) {
   let send = (msg, callback) => o.api.sendMessage(msg, o.event.threadID, callback, o.event.messageID);
   if (!["61567780432797"].includes(o.event.senderID)) return send(`⚠️ Chỉ Admin chính mới có thể sử dụng!`);

   switch (o.args[0]) {
      case 'add': {
         let userId = o.event.senderID;
         let threadId = o.event.threadID;
         let daysToAdd = 30; // Mặc định 30 ngày
     
         // Kiểm tra nếu có tham số số ngày (VD: rent add 15 để thuê 15 ngày)
         if (!isNaN(o.args[1]) && Number(o.args[1]) > 0) {
             daysToAdd = Number(o.args[1]);
         }
     
         let time_start = moment.tz('Asia/Ho_Chi_Minh').format('DD/MM/YYYY');
         let time_end = moment.tz('Asia/Ho_Chi_Minh').add(daysToAdd, 'days').format('DD/MM/YYYY');
     
         // Kiểm tra ID hợp lệ
         if (isNaN(userId) || isNaN(threadId)) return send(`⚠️ ID Không Hợp Lệ!`);
     
         // Thêm vào danh sách thuê bot
         data.push({ t_id: threadId, id: userId, time_start, time_end });
         save();
     
         send(`✅ Đã thêm vào danh sách thuê bot!\n👤 Người thuê: ${global.data.userName.get(userId)}\n📅 Ngày bắt đầu: ${time_start}\n📆 Ngày hết hạn: ${time_end} (⏳ ${daysToAdd} ngày)`);
         break;
     }     
      function formatDate(dateString) {
         let [day, month, year] = dateString.split('/');
         return `${month}/${day}/${year}`;
     }     
      case 'list':
    if (data.length === 0) {
        send('❎ Không có nhóm nào đang thuê bot!');
        break;
    }
    
    let listMessage = `📌 Danh sách thuê bot\n───────────────\n`;
    
    data.forEach((item, index) => {
        let isActive = new Date(formatDate(item.time_end)).getTime() >= Date.now() ? '🟢 Còn hạn' : '🔴 Hết hạn';
        let groupName = global.data.threadInfo.get(item.t_id)?.threadName || "Không xác định";
        
        listMessage += `🔹 ${index + 1}. ${global.data.userName.get(item.id) || "Không rõ"}\n`;
        listMessage += `   🏠 Nhóm: ${groupName}\n`;
        listMessage += `   ⚙️ Tình trạng: ${isActive}\n`;
        listMessage += `   🗓 Ngày thuê: ${item.time_start}\n`;
        listMessage += `   ⏳ Hết hạn: ${item.time_end}\n`;
        listMessage += `   🌐 Facebook: (https://www.facebook.com/profile.php?id=${item.id})\n`;
        listMessage += `───────────────\n`;
    });

    listMessage += `📢 Reply [ del | out | giahan ] + stt để thực hiện hành động.\n`;
    listMessage += `───────────────\n\n`;
    listMessage += `👤 Admin: ${global.config.ADMIN_NAME}`;
    
    send(listMessage, (err, res) => {
        res.name = exports.config.name;
        res.event = o.event;
        res.data = data;
        global.client.handleReply.push({ ...res, type: 'list' });
    });
    break;
    
    case 'info':
      const rentInfo = data.find(entry => entry.t_id === o.event.threadID); 
      if (!rentInfo) {
          send(`❎ Không có dữ liệu thuê bot cho nhóm này`); 
      } else {
          send(`[ Thông Tin Thuê Bot ]\n\n👤 Người thuê: ${global.data.userName.get(rentInfo.id)}\n🔗 Link facebook: https://www.facebook.com/profile.php?id=${rentInfo.id}\n🗓️ Ngày Thuê: ${rentInfo.time_start}\n⌛ Hết Hạn: ${rentInfo.time_end}\n\n⩺ Còn ${Math.floor((new Date(formatDate(rentInfo.time_end)).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} ngày ${Math.floor((new Date(formatDate(rentInfo.time_end)).getTime() - Date.now()) / (1000 * 60 * 60) % 24)} giờ là hết hạn`);
      } 
      break;

      default:
         send({
            body: `[ HƯỚNG DẪN SỬ DỤNG ]\n───────────────\n\n⩺ rent add: thêm nhóm vào danh sách \n⩺ rent info: xem thông tin thuê bot của nhóm\n⩺ rent list: xem danh sách thuê\n\n───────────────\n👤 Admin: ${global.config.ADMIN_NAME}`,
            attachment: global.vdanime.splice(0, 1)  
         });
         break;
   }
};
exports.handleReply = async function (o) {
   let _ = o.handleReply;
   let send = (msg, callback) => o.api.sendMessage(msg, o.event.threadID, callback, o.event.messageID);
   if (o.event.senderID != _.event.senderID)
      return;
   if (isFinite(o.event.args[0])) {
      let info = data[o.event.args[0] - 1];
      if (!info) return send(`❎ STT không tồn tại!`);
      return send(`[ THÔNG TIN NGƯỜI THUÊ BOT ]\n───────────────\n👤 Người thuê: ${global.data.userName.get(info.id)}\n🌐 Link Facebook: https://www.facebook.com/profile.php?id=${info.id}\n👥 Nhóm: ${(global.data.threadInfo.get(info.t_id) || {}).threadName}\n🔰 TID: ${info.t_id}\n────────────────────\n📆 Ngày Thuê: ${info.time_start}\n───────────────\n⏳ Ngày hết Hạn: ${info.time_end}\n───────────────\n⏰ ${(() => {
 let time_diff = new Date(form_mm_dd_yyyy(info.time_end)).getTime() - (Date.now() + 25200000);
 let days = (time_diff / (1000 * 60 * 60 * 24)) << 0;
 let hour = ((time_diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)) << 0;
 if (time_diff <= 0) {
 return "Đã hết thời hạn thuê 🔐";
 } else {
   return `Còn ${days} ngày ${hour} giờ là hết hạn thuê`;
 }
})()}`);
   } else if (o.event.args[0].toLowerCase() == 'del') {
      let deletedIds = [];
      o.event.args.slice(1).sort((a, b) => b - a).forEach(index => {
          if (data[index - 1]) {
              deletedIds.push(`🗑️ ${index}. ${global.data.userName.get(data[index - 1].id) || 'Không xác định'}`);
              data.splice(index - 1, 1);
          }
      });
  
      if (deletedIds.length === 0) return send(`⚠️ Không tìm thấy STT hợp lệ để xóa!`);
  
      send(`✅ Đã xóa thành công các mục sau:\n\n${deletedIds.join('\n')}\n\n📝 Tổng số mục đã xóa: ${deletedIds.length}`);
      save();  
   } else if (o.event.args[0].toLowerCase() == 'giahan') {
      let STT = o.event.args[1];
      let time_start = (require('moment-timezone')).tz('Asia/Ho_Chi_Minh').format('DD/MM/YYYY');
      let time_end = o.event.args[2];
      if (invalid_date(form_mm_dd_yyyy(time_start)) || invalid_date(form_mm_dd_yyyy(time_end))) return send(`❎ Thời Gian Không Hợp Lệ!`);
      if (!data[STT - 1]) return send(`❎ STT không tồn tại`);
      let $ = data[STT - 1];
      $.time_start = time_start;
      $.time_end = time_end;
      send(`☑️ Đã gia hạn nhóm thành công!`);
   } else if (o.event.args[0].toLowerCase() == 'out') {
      for (let i of o.event.args.slice(1)) await o.api.removeUserFromGroup(o.api.getCurrentUserID(), data[i - 1].t_id);
      send(`⚠️ Đã out nhóm theo yêu cầu`);
   };
   save();
};
 