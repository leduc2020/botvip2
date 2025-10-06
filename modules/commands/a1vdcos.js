module.exports.config = {
  name: "a2",
  version: "1.0.1",
  hasPermssion: 0,
  credits: "Vihoo",
  description: "chỉ cần nhắn cos sẽ auto random vd cos",
  commandCategory: "Người dùng",
  usages: "",
  cooldowns: 0,
denpendencies: {
  "fs-extra": "",
  "request": ""
}

};
module.exports.handleEvent = async ({ api, event, Threads }) => {
   if (event.body.indexOf("Vdcos")==0 ||
       event.body.indexOf("Ccos")==0 || 
       event.body.indexOf("mp4vdcos")==0 || 
       event.body.indexOf("mp4Vdcos")==0 || 
       event.body.indexOf("cosplay")==0 || 
       event.body.indexOf("Cosplay")==0 || 
       event.body.indexOf("videocosplay")==0 ||
       event.body.indexOf("bot ơi có videocos không")==0 || 
       event.body.indexOf("bot ơi có video cosplay không")==0 || 
       event.body.indexOf("Bot ơi video cosplay đâu")==0 || 
       event.body.indexOf("bot cho xem vdcos di")==0) {
const axios = global.nodemodule["axios"];
const request = global.nodemodule["request"];
const fs = global.nodemodule["fs-extra"];
api.sendMessage("Hình như bạn muốn xem cosplay thì phải\nChờ mình xíu mình gửi liền.", event.threadID, event.messageID);
var link = [
"https://i.imgur.com/PMXqb03.mp4",
"https://i.imgur.com/D0CfjOC.mp4",
"https://i.imgur.com/rlwLsAd.mp4",
"https://i.imgur.com/NxuGpyY.mp4",
"https://i.imgur.com/FtOwkEr.mp4",
"https://i.imgur.com/cOpLchf.mp4",
"https://i.imgur.com/zX1j6qj.mp4",
"https://i.imgur.com/rDlL1Na.mp4",
"https://i.imgur.com/h1lPRdd.mp4",
"https://i.imgur.com/DXiUGIl.mp4",
"https://i.imgur.com/5tTDXag.mp4",
"https://i.imgur.com/vCDaMy7.mp4",
"https://i.imgur.com/4inh6e3.mp4",
"https://i.imgur.com/s7g9dZx.mp4",
"https://i.imgur.com/JcaWIE8.mp4",
"https://i.imgur.com/PMXqb03.mp4",
"https://i.imgur.com/whPnQd8.mp4",
"https://i.imgur.com/xSmh5fW.mp4",
"https://i.imgur.com/zVFeFej.mp4",
"https://i.imgur.com/X2p1dSP.mp4",
"https://i.imgur.com/J60nMnB.mp4",
"https://i.imgur.com/LzW5TlY.mp4",
"https://i.imgur.com/fta95D6.mp4",
"https://i.imgur.com/0ttaX24.mp4",
"https://i.imgur.com/fOhy1GB.mp4",
"https://i.imgur.com/avMqsWi.mp4",
"https://i.imgur.com/b4e2d0h.mp4",
"https://i.imgur.com/kEq1aDt.mp4",
"https://i.imgur.com/ERHhddU.mp4",
"https://i.imgur.com/xvaDl8l.mp4",
"https://i.imgur.com/ZXb6Bb9.mp4"
          ];
     var callback = () => api.sendMessage({body:`Số video hiện có: ${link.length}`,attachment: fs.createReadStream(__dirname + "/cache/vdcos.mp4")}, event.threadID, () => fs.unlinkSync(__dirname + "/cache/vdcos.mp4"), event.messageID);  
      return request(encodeURI(link[Math.floor(Math.random() * link.length)])).pipe(fs.createWriteStream(__dirname+"/cache/vdcos.mp4")).on("close",() => callback());
}
                                                                                                         }
module.exports.run = async({api,event,args,Users,Threads,Currencies}) => {

   };