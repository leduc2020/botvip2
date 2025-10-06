/**
 * Command cardinfo - Tạo thẻ thông tin người dùng
 * 
 * Module này tạo ra một thẻ thông tin đẹp mắt cho người dùng
 * hiển thị thông tin cơ bản như tên, ID, ảnh đại diện và các thông số khác
 * Hỗ trợ nhiều loại nền khác nhau (anime, gái, phong cảnh)
 * 
 * @author TuanDev
 * @version 1.0
 */

module.exports.config = {
    name: "cardinfo",
    version: "1.0",
    hasPermssion: 0,
    credits: "TuanDev",
    description: "Tạo thẻ thông tin người dùng với nhiều loại nền và màu viền tùy chọn",
    commandCategory: "Thông Tin",
    usages: "Sử dụng lệnh và làm theo hướng dẫn để chọn nền và màu viền",
    cooldowns: 5,
    dependencies: {
        "fs-extra": "",
        "axios": "",
        "canvas": "",
        "jimp": ""
    }
};

module.exports.handleReply = async function({ api, event, handleReply }) {
    const { threadID, senderID } = event;
    const userInput = event.body.trim();
    
    // Kiểm tra xem người reply có phải là người đã gọi lệnh không
    if (senderID !== handleReply.author) return;
    
    // Xử lý dựa vào loại reply
    switch (handleReply.type) {
        // Người dùng đang chọn nền
        case "chooseBackground":
            const bgChoice = parseInt(userInput);
            if (bgChoice >= 1 && bgChoice <= 6) {
                // Chuyển đổi lựa chọn thành loại nền
                const bgTypes = ["anime", "congnghe", "den", "cute", "love", "sexy"];
                const bgType = bgTypes[bgChoice - 1];
                
                // Gửi menu chọn màu
                const colorMenu = "🎨 CHỌN MÀU VIỀN 🎨\n" +
                    "1. Đỏ 🔴\n" +
                    "2. Xanh dương 🔵\n" +
                    "3. Lục 🟢\n" +
                    "4. Vàng 🟡\n" +
                    "5. Tím 🟣\n" +
                    "6. Hồng 🌸\n" +
                    "7. Cam 🟠\n" +
                    "8. Đen ⚫\n" +
                    "9. Trắng ⚪\n" +
                    "10. Tím 💜\n" +
                    "11. Bạc 💎\n" +
                    "12. Vàng 🏆\n" +
					"13. Không màu\n" +
					"➤ Trả lời số tương ứng";
                
                return api.sendMessage(colorMenu, threadID, (error, info) => {
                    if (error) return api.sendMessage("❌ Đã xảy ra lỗi khi gửi menu màu.", threadID);
                    
                    // Lưu lại thông tin trong handleReply
                    global.client.handleReply.push({
                        name: this.config.name,
                        messageID: info.messageID,
                        author: senderID,
                        type: "chooseColor",
                        bgType: bgType
                    });
                });
            } else {
                return api.sendMessage("❌ Vui lòng chọn đúng số từ 1 đến 3.", threadID);
            }
            break;
            
        // Người dùng đang chọn màu
        case "chooseColor":
            const colorChoice = parseInt(userInput);
            if (colorChoice >= 1 && colorChoice <= 13) {
                // Danh sách màu viền
                const colors = [
                    "#f70000", // Đỏ - 1
                    "#0073e6", // Xanh dương - 2
                    "#00a651", // Lục - 3
                    "#ffcc00", // Vàng - 4
                    "#9c27b0", // Tím - 5
                    "#e91e63", // Hồng - 6
                    "#ff5722", // Cam - 7
                    "#212121", // Đen - 8
                    "#ffffff", // Trắng - 9
                    "#6a0dad", // Tím đậm - 10
                    "#c0c0c0", // Bạc - 11
                    "#ffd700", // Vàng kim - 12
					"#100000"  // Không màu -13
                ];
                
                const borderColor = colors[colorChoice - 1];
                
                // Thông báo đang xử lý
                api.sendMessage(`⏳ Đang tạo thẻ thông tin với nền ${handleReply.bgType} và màu viền đã chọn...`, threadID);
                
                // Tạo thẻ thông tin
                createCard(api, event, handleReply.bgType, borderColor);
            } else {
                api.sendMessage("❌ Vui lòng chọn đúng số từ 1 đến 15.", threadID);
            }
            break;
    }
};

module.exports.run = async function ({ api, event, args }) {
    const { threadID, messageID, senderID } = event;
    
    // Gửi menu chọn nền
    const bgMenu = "CHỌN LOẠI NỀN \n\n" +
        "Vui lòng trả lời tin nhắn này với số tương ứng:\n\n" +
        "1-Nền Anime\n" +
        "2-Nền công nghệ\n" +
		"3-Nền đen nam tính\n" +
		"4-Nền dễ thương\n" +
		"5-Nền lãng mạng\n" +
        "6-Nền sexy girl\n\n" +
        "👉 Trả lời số để chọn loại nền";
    
    return api.sendMessage(bgMenu, threadID, (error, info) => {
        if (error) return api.sendMessage("❌ Đã xảy ra lỗi khi gửi menu.", threadID, messageID);
        
        // Lưu vào global để xử lý reply
        global.client.handleReply.push({
            name: this.config.name,
            messageID: info.messageID,
            author: senderID,
            type: "chooseBackground"
        });
    });
};

// Hàm tạo thẻ thông tin
async function createCard(api, event, bgType, borderColor) {
    const fs = global.nodemodule["fs-extra"];
    const axios = global.nodemodule["axios"];
    const { threadID, senderID } = event;
    
    try {
        // Xác định ID người dùng cần lấy thông tin
        let targetID = senderID;
        
        // Đảm bảo thư mục cache tồn tại
        if (!fs.existsSync("/cache")) {
            fs.mkdirSync("/cache", { recursive: true });
        }
        
        // Lấy thông tin người dùng từ API Facebook
        const userInfo = await api.getUserInfo(targetID);
        const user = userInfo[targetID];
        
        if (!user) {
            return api.sendMessage("❌ Không thể lấy thông tin người dùng.", threadID);
        }
        
        // Lấy thông tin thread nếu đây là nhóm
        const threadInfo = await api.getThreadInfo(threadID);
        
        // Các thông tin cơ bản
        const userName = user.name || "Không xác định";
        const userGender = user.gender === "MALE" ? "Nam" : user.gender === "FEMALE" ? "Nữ" : "Không xác định";
        const userBirthday = user.birthday || "Không xác định";
        
        // Tìm biệt danh trong nhóm
        const nickname = threadInfo.nicknames && threadInfo.nicknames[targetID] || "Không có";
        
        // Tính toán vai trò trong nhóm
        let role = "Thành viên";
        if (threadInfo.adminIDs && threadInfo.adminIDs.some(item => item.id === targetID)) {
            role = "Quản trị viên";
        }
        if (targetID === api.getCurrentUserID()) {
            role = "BOT";
        }
        
        // Chọn ảnh nền dựa trên loại nền
        const bgImages = {
            anime: ["https://files.catbox.moe/9iq0h1.jpeg"],
			congnghe: ["https://files.catbox.moe/8yiftk.jpeg"],
			den: ["https://files.catbox.moe/93w2eq.jpeg"],
			cute: ["https://files.catbox.moe/vkil77.jpeg"],
			love: ["https://files.catbox.moe/0su28i.jpeg"],
            sexy: ["https://files.catbox.moe/xsvz99.jpeg"]
        };
		
	
        
        // Lấy ngẫu nhiên một ảnh từ loại nền đã chọn
        const backgroundImages = bgImages[bgType] || bgImages.anime;
        const randomIndex = Math.floor(Math.random() * backgroundImages.length);
        const backgroundUrl = backgroundImages[randomIndex];
        
        // Tạo các đường dẫn file tạm
        const random = Math.floor(Math.random() * 99999);
        const avatarPath = `/cache/avatar_${random}.png`;
        
        // Tải avatar
        let avatarUrl = user.thumbSrc;
        if (!avatarUrl) {
            return api.sendMessage("❌ Không thể lấy ảnh đại diện.", threadID);
        }
        
        // Tải avatar
        const avatarResponse = await axios.get(avatarUrl, {
            responseType: "arraybuffer",
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)',
                'Referer': 'https://www.facebook.com/'
            }
        });
        
        // Lưu avatar vào cache
        fs.writeFileSync(avatarPath, Buffer.from(avatarResponse.data));
        
        // Kiểm tra canvas và jimp có tồn tại không
        const canvas = global.nodemodule["canvas"];
        const jimp = global.nodemodule["jimp"];
        
        if (canvas && jimp) {
            try {
                const { registerFont, createCanvas } = canvas;
                
                // Tạo canvas
                const card = createCanvas(900, 500);
                const ctx = card.getContext('2d');
                
                // Tải hình ảnh nền
                try {
                    // URL ảnh nền từ loại nền đã chọn
                    console.log("Đang tải ảnh nền trực tiếp từ URL...");
                    const backgroundImg = await canvas.loadImage(backgroundUrl);
                    console.log("Đã tải ảnh nền thành công");
                    
                    // Tính toán tỷ lệ để lấp đầy tốt hơn và không cắt nội dung quan trọng
                    const imgRatio = backgroundImg.width / backgroundImg.height;
                    const canvasRatio = 900 / 500;
                    let drawWidth, drawHeight, offsetX = 0, offsetY = 0;
                    
                    // Ưu tiên lấp đầy theo chiều rộng
                    drawWidth = 920; // Thêm một chút để lấp đầy tốt hơn
                    drawHeight = drawWidth / imgRatio;
                    
                    // Nếu chiều cao vượt quá kích thước canvas, căn chỉnh phần trên dưới
                    if (drawHeight > 500) {
                        offsetY = (500 - drawHeight) / 2;
                    } else {
                        // Trường hợp hiếm: nếu ảnh quá rộng, căn giữa theo chiều cao
                        drawHeight = 500;
                        drawWidth = 500 * imgRatio;
                        offsetX = (900 - drawWidth) / 2;
                    }
                    
                    // Vẽ ảnh nền giữ nguyên tỷ lệ
                    ctx.drawImage(backgroundImg, offsetX, offsetY, drawWidth, drawHeight);
                    
                    // Thêm hiệu ứng overlay để văn bản dễ đọc hơn (độ trong suốt 0.1)
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
                    ctx.fillRect(0, 0, 900, 500);
                } catch (bgError) {
                    // Nếu có lỗi khi tải ảnh nền, vẽ nền đơn giản
                    ctx.fillStyle = '#1a1a2e';
                    ctx.fillRect(0, 0, 900, 500);
                    console.error("Lỗi khi tải ảnh nền:", bgError.message);
                }
                
                // Vẽ khung viền với màu đã chọn - Tạo hiệu ứng "dập nổi"
                // Hiệu ứng bóng đổ bên ngoài
                ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
                ctx.shadowBlur = 15;
                ctx.shadowOffsetX = 3;
                ctx.shadowOffsetY = 3;
                
                // Vẽ khung viền với màu đã chọn
                ctx.strokeStyle = borderColor;
                ctx.lineWidth = 8;
                
                // Vẽ khung viền theo từng phần để tạo khoảng cách và hình răng cưa ở hai góc trên
                ctx.beginPath();
                
                // Đoạn trên (có khoảng cách và răng cưa ở hai góc)
                ctx.moveTo(25, 20);  // Thêm khoảng cách ở góc trái
                ctx.lineTo(875, 20); // Phần trên
                
                // Đoạn bên phải 
                ctx.moveTo(875, 20);
                ctx.lineTo(875, 480);
                
                // Đoạn dưới
                ctx.moveTo(875, 480);
                ctx.lineTo(25, 480);
                
                // Đoạn bên trái
                ctx.moveTo(25, 480);
                ctx.lineTo(25, 20);
                
                // Vẽ viền
                ctx.stroke();
                
                // Tắt hiệu ứng bóng đổ cho các phần tiếp theo
                ctx.shadowColor = 'transparent';
                ctx.shadowBlur = 0;
                ctx.shadowOffsetX = 0;
                ctx.shadowOffsetY = 0;
                
                // Tải và vẽ avatar trong khung tròn
                try {
                    const avatarImage = await canvas.loadImage(avatarPath);
                    
                    // Vị trí và kích thước avatar - Điều chỉnh để phần đầu avatar ngang bằng với băng đen tên
                    const avatarSize = 140;
                    const avatarX = 120;
                    // Điều chỉnh vị trí Y để phần đầu avatar (y - size/2) ngang bằng với băng đen (y=110)
                    const avatarY = 110 + avatarSize/2;
                    
                    // Tạo hiệu ứng viền phát sáng cho avatar
                    ctx.shadowColor = borderColor;
                    ctx.shadowBlur = 15;
                    ctx.shadowOffsetX = 0;
                    ctx.shadowOffsetY = 0;
                    
                    // Vẽ khung tròn ngoài cùng với hiệu ứng phát sáng
                    ctx.beginPath();
                    ctx.arc(avatarX, avatarY, avatarSize/2 + 10, 0, Math.PI * 2);
                    ctx.fillStyle = 'white';
                    ctx.fill();
                    
                    // Vẽ viền màu cho avatar
                    ctx.strokeStyle = borderColor;
                    ctx.lineWidth = 5;
                    ctx.stroke();
                    
                    // Tắt hiệu ứng phát sáng
                    ctx.shadowColor = 'transparent';
                    ctx.shadowBlur = 0;
                    
                    // Vẽ avatar trong khung tròn (clip)
                    ctx.save();
                    ctx.beginPath();
                    ctx.arc(avatarX, avatarY, avatarSize/2, 0, Math.PI * 2);
                    ctx.closePath();
                    ctx.clip();
                    
                    // Vẽ avatar vào khung đã cắt
                    ctx.drawImage(avatarImage, avatarX - avatarSize/2, avatarY - avatarSize/2, avatarSize, avatarSize);
                    ctx.restore();
                    
                } catch (avatarError) {
                    console.error("Lỗi khi tải avatar:", avatarError.message);
                }
                
                // Vẽ tiêu đề
                ctx.textAlign = 'center';
                
                // Vẽ viền đen của tiêu đề (tạo hiệu ứng nổi 3D)
                ctx.font = 'bold 46px Arial, Helvetica, sans-serif';
                ctx.fillStyle = 'black';
                ctx.fillText('THÔNG TIN NGƯỜI DÙNG', 450, 75);
                
                // Vẽ tiêu đề chính
                ctx.font = 'bold 45px Arial, Helvetica, sans-serif';
                ctx.fillStyle = borderColor;
                ctx.fillText('THÔNG TIN NGƯỜI DÙNG', 450, 75);
                
                // Vẽ khung thông tin chính - Bắt đầu sau avatar
                ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
                // Băng đen bắt đầu từ sau avatar, để có khoảng cách nhỏ với viền đỏ và avatar
                ctx.fillRect(230, 110, 635, 60);
                
                // Vẽ tên người dùng
                ctx.textAlign = 'left';
                ctx.font = 'bold 38px Arial, Helvetica, sans-serif';
                ctx.fillStyle = 'white';
                
                // Nếu tên quá dài thì cắt bớt
                let displayName = userName;
                if (displayName.length > 18) {
                    displayName = displayName.substring(0, 15) + "...";
                }
                
                ctx.fillText(displayName, 280, 155);
                
                // Vẽ khung thông tin chi tiết lớn bên phải
                ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
                // Định vị giống như hình ảnh mẫu - bắt đầu sau avatar
                ctx.fillRect(230, 180, 635, 250);
                
                // Thêm viền đỏ cho khung thông tin chi tiết
                ctx.strokeStyle = borderColor;
                ctx.lineWidth = 3;
                ctx.strokeRect(230, 180, 635, 250);
                
                // Vẽ các thông tin chi tiết
                ctx.fillStyle = 'white';
                ctx.font = '25px Arial, Helvetica, sans-serif';
                
                const infoStartY = 225;
                const lineHeight = 35;
                
                ctx.fillText(`➤ ID: ${targetID}`, 280, infoStartY);
                ctx.fillText(`➤ Giới tính: ${userGender}`, 280, infoStartY + lineHeight);
                ctx.fillText(`➤ Sinh nhật: ${userBirthday}`, 280, infoStartY + lineHeight * 2);
                ctx.fillText(`➤ Biệt danh: ${nickname}`, 280, infoStartY + lineHeight * 3);
                ctx.fillText(`➤ Vai trò: ${role}`, 280, infoStartY + lineHeight * 4);
                
                
                // Lưu thẻ thông tin
                const outputPath = `/cache/card_${random}.png`;
                const buffer = card.toBuffer('image/png');
                fs.writeFileSync(outputPath, buffer);
                
                // Gửi thẻ thông tin
                api.sendMessage(
                    {
                        attachment: fs.createReadStream(outputPath)
                    },
                    threadID,
                    () => {
                        // Dọn dẹp các file tạm
                        if (fs.existsSync(avatarPath)) fs.unlinkSync(avatarPath);
                        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
                    }
                );
                
            } catch (canvasError) {
                console.error("Lỗi khi tạo card với canvas:", canvasError.message);
                api.sendMessage(`❌ Lỗi khi tạo card: ${canvasError.message}`, threadID);
            }
        } else {
            // Hiển thị thông báo lỗi nếu không thể tạo thẻ
            api.sendMessage("❌ Không thể tạo thẻ thông tin do thiếu thư viện canvas hoặc jimp.", threadID);
        }
    } catch (error) {
        console.error("Lỗi khi tạo thẻ thông tin:", error);
        api.sendMessage(`❌ Đã xảy ra lỗi khi tạo thẻ thông tin: ${error.message}`, threadID);
    }
}