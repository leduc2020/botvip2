const puppeteer = require('puppeteer-core');
const fs = require('fs-extra');
const path = require('path');
const sharp = require('sharp');

module.exports.config = {
    name: "cw",
    version: "1.0.0",
    hasPermssion: 0,
    credits: "TatsuYTB",
    description: "Chụp trang cá nhân Facebook",
    commandCategory: "Tiện Ích",
    usages: ["cw"],
    usePrefix: false,
    cooldowns: 5,
    dependencies: {"puppeteer-core": "", "sharp": ""}
};

module.exports.run = async function({ api, event }) {
    let facebookId;

    if (event.type === 'message_reply') {
        facebookId = event.messageReply.senderID;
    } else {
        facebookId = event.senderID;
    }

    if (!facebookId) return api.sendMessage("Đã Xảy Ra Lỗi!", event.threadID);

    const account = "";
    const password = "";

    api.sendMessage("Đang load, chờ tí nhé...", event.threadID, async () => {
        try {
            const browser = await puppeteer.launch({
                executablePath: 'C:/bin/chrome/chrome.exe',
                args: ['--no-sandbox', '--disable-setuid-sandbox'],
            });
            console.log("Browser launched");
            
            const page = await browser.newPage();
            console.log("New page created");

            await page.goto('https://www.facebook.com/login');
            console.log("Navigated to login page");
            
            await page.type('#email', account);
            await page.type('#pass', password);
            await page.click('#loginbutton');
            console.log("Credentials entered");

            await page.waitForNavigation();
            console.log("Logged in and navigated");

            await page.goto(`https://www.facebook.com/${facebookId}`);
            console.log(`Navigated to profile: https://www.facebook.com/${facebookId}`);

            await page.setViewport({ width: 1920, height: 1080 });

            const screenshotPath = path.join(__dirname, 'screenshot.png');
            await page.screenshot({ path: screenshotPath });
            console.log("Screenshot taken");

            await browser.close();
            console.log("Browser closed");

            const editedScreenshotPath = path.join(__dirname, 'edited_screenshot.png');
            await sharp(screenshotPath)
                .modulate({ brightness: 3.6, saturation: 4.5 })
                .toFile(editedScreenshotPath);
            console.log("Screenshot edited");

            const readStream = fs.createReadStream(editedScreenshotPath);

            api.sendMessage({
                body: "[ CAP WALL ]",
                attachment: readStream
            }, event.threadID, (error, info) => {
                if (error) {
                    console.error("Error sending message:", error);
                    api.sendMessage("Đã Xảy Ra Lỗi Khi Gửi Tin Nhắn!", event.threadID);
                } else {
                    console.log("Message sent:", info);
                    fs.unlinkSync(screenshotPath);
                    fs.unlinkSync(editedScreenshotPath);
                    console.log("Screenshot files deleted");
                }
            });

        } catch (error) {
            console.error('Error while taking screenshot:', error);
            api.sendMessage("Đã Xảy Ra Lỗi!", event.threadID);
        }
    });
};
