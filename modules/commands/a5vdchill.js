module.exports.config = {
  name: "a5",
  version: "1.0.1",
  hasPermssion: 0,
  credits: "Vihoo",
  description: "chỉ cần nhắn cos sẽ auto random vd chill",
  commandCategory: "Người dùng",
  usages: "",
  cooldowns: 0,
denpendencies: {
  "fs-extra": "",
  "request": ""
}

};
module.exports.handleEvent = async ({ api, event, Threads }) => {
   if (event.body.indexOf("Vdchill")==0 ||
       event.body.indexOf("vdchill")==0) {
const axios = global.nodemodule["axios"];
const request = global.nodemodule["request"];
const fs = global.nodemodule["fs-extra"];
api.sendMessage("Hình như bạn muốn xem video chill thì phải\nChờ mình xíu mình gửi liền.", event.threadID, event.messageID);
var link = [
"https://i.imgur.com/TRl17f7.mp4",
"https://i.imgur.com/yp9z5QN.mp4",
"https://i.imgur.com/qeIxxvn.mp4",
"https://i.imgur.com/LhINDGL.mp4",
"https://i.imgur.com/ygEYdzr.mp4",
"https://i.imgur.com/9thHnST.mp4",
"https://i.imgur.com/AMi9NiT.mp4",
"https://i.imgur.com/l8UisUZ.mp4",
"https://i.imgur.com/BZXJerW.mp4",
"https://i.imgur.com/xJpuVLs.mp4",
"https://i.imgur.com/MOQDCjg.mp4",
"https://i.imgur.com/kz7S5JO.mp4",
"https://i.imgur.com/K4pnAw0.mp4",
"https://i.imgur.com/WrPhJrH.mp4",
"https://i.imgur.com/fsol3MG.mp4",
"https://i.imgur.com/XT0d0a2.mp4",
"https://i.imgur.com/voxsCFv.mp4",
"https://i.imgur.com/QzyFnVK.mp4",
"https://i.imgur.com/BlI7Jbh.mp4",
"https://i.imgur.com/mK44Aod.mp4",
"https://i.imgur.com/UM95eCs.mp4",
"https://i.imgur.com/jDOLZYQ.mp4",
"https://i.imgur.com/xDfgeeD.mp4",
"https://i.imgur.com/iTUuWjl.mp4",
"https://i.imgur.com/WpnFSm5.mp4",
"https://i.imgur.com/nTw4lOF.mp4",
"https://i.imgur.com/5lrWddV.mp4",
"https://i.imgur.com/QRd4BCs.mp4",
"https://i.imgur.com/26ckWFR.mp4",
"https://i.imgur.com/Lzfz1kO.mp4",
"https://i.imgur.com/xVGLkGv.mp4",
"https://i.imgur.com/dXDJzCy.mp4",
"https://i.imgur.com/PPUGhmB.mp4",
"https://i.imgur.com/aZKx6VU.mp4",
"https://i.imgur.com/jG6uBjO.mp4",
"https://i.imgur.com/urLh5YY.mp4"
          ];
     var callback = () => api.sendMessage({body:`Số video hiện có: ${link.length}`,attachment: fs.createReadStream(__dirname + "/cache/vdcos.mp4")}, event.threadID, () => fs.unlinkSync(__dirname + "/cache/vdcos.mp4"), event.messageID);  
      return request(encodeURI(link[Math.floor(Math.random() * link.length)])).pipe(fs.createWriteStream(__dirname+"/cache/vdcos.mp4")).on("close",() => callback());
}
                                                                                                         }
module.exports.run = async({api,event,args,Users,Threads,Currencies}) => {

   };