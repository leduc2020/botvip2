'use strict';
/* eslint-disable linebreak-style */

const chalk = require('chalk');
var isHexcolor = require('is-hexcolor');
var getText = function(...Data) {
	var Main = (Data.splice(0,1)).toString();
	for (let i = 0; i < Data.length; i++) Main = Main.replace(RegExp(`%${i + 1}`, 'g'), Data[i]);
	return Main;
};
function getType(obj) {
    return Object.prototype.toString.call(obj).slice(8, -1);
}

// Biến để kiểm soát chỉ in lỗi appstate 1 lần
let printedAppstateError = false;

module.exports = {
	Normal: function(Str, Data ,Callback) {
		if (isHexcolor(global.Fca.Require.FastConfig.MainColor) != true) {
			this.Warning(getText(global.Fca.Require.Language.Index.InvaildMainColor,global.Fca.Require.FastConfig.MainColor),process.exit(0));
		}
		else console.log(chalk.hex(global.Fca.Require.FastConfig.MainColor).bold(`${global.Fca.Require.FastConfig.MainName || '[ FCA-HZI ]'} > `) + Str);
		if (getType(Data) == 'Function' || getType(Data) == 'AsyncFunction') {
			return Data();
		}
		if (Data) {
			return Data;
		}
		if (getType(Callback) == 'Function' || getType(Callback) == 'AsyncFunction') {
			Callback();
		}
		else return Callback;
	},
	Warning: function(str, callback) {
		console.log(chalk.magenta.bold('[ FCA-WARNING ] > ') + chalk.yellow(str));
		if (getType(callback) == 'Function' || getType(callback) == 'AsyncFunction') {
			callback();
		}
		else return callback;
	},
	Error: function(str, callback) {
		if (!str) {
			console.log(chalk.magenta.bold('[ FCA-ERROR ] > ') + chalk.red("Already Faulty, Please Contact: Facebook.com/Lazic.Kanzu"));
		}

		// Nếu phát hiện lỗi Appstate
		if (typeof str === "string" && str.includes("Appstate")) {
			if (!printedAppstateError) {
				console.log(chalk.magenta.bold('[ FCA-ERROR ] > ') + chalk.red(str));
				console.log("⛔ Phát hiện lỗi Appstate! Đang chạy node login...");
				printedAppstateError = true;

				const { spawn } = require("child_process");
				const child = spawn("node", ["login"], {
					stdio: "inherit",
					shell: true,
				});

				child.on("close", (code) => {
					console.log(`✅ Đã chạy xong node login với mã ${code}`);
					console.log("🔁 Đang thoát bot để restart với Appstate mới...");
					process.exit(282);
				});
			}
			return;
		}

		console.log(chalk.magenta.bold('[ FCA-ERROR ] > ') + chalk.red(str));

		if (getType(callback) == 'Function' || getType(callback) == 'AsyncFunction') {
			callback();
		}
		else return callback;
	},
	Success: function(str, callback) {
		console.log(chalk.hex('#9900FF').bold(`${global.Fca.Require.FastConfig.MainName || '[ FCA-HZI ]'} > `) + chalk.green(str));
		if (getType(callback) == 'Function' || getType(callback) == 'AsyncFunction') {
			callback();
		}
		else return callback;
	},
	Info: function(str, callback) {
		console.log(chalk.hex('#9900FF').bold(`${global.Fca.Require.FastConfig.MainName || '[ FCA-HZI ]'} > `) + chalk.blue(str));
		if (getType(callback) == 'Function' || getType(callback) == 'AsyncFunction') {
			callback();
		}
		else return callback;
	}
};
