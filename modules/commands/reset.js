module.exports.config = {
	name: "rs",
	version: "1.0.2",
	hasPermssion: 3,
	credits: "Khánh Milo",
	description: "Khởi động lại bot",
	commandCategory: "admin",
	cooldowns: 5,
	dependencies: {
		"eval": ""
	}
};
module.exports.run = async ({ api, event, args, client, utils }) => {
    const eval = require("eval");
    return api.sendMessage("𝐘𝐮𝐳 đ𝐚𝐧𝐠 𝐤𝐡𝐨̛̉𝐢 đ𝐨̣̂𝐧𝐠 𝐥𝐚̣𝐢 , 𝐯𝐮𝐢 𝐥𝐨̀𝐧𝐠 𝐜𝐡𝐨̛̀", event.threadID, () => eval("module.exports = process.exit(1)", true), event.messageID);

   }
