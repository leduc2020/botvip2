// modules/commands/info.js
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const cheerio = require("cheerio");

module.exports.config = {
  name: "info",
  version: "1.0.0",
  hasPermssion: 0,
  credits: "You & GPT-5",
  description: "Lấy thông tin Facebook (bằng cookie). Thả 😆 để xem bài viết.",
  commandCategory: "Tìm kiếm",
  usages: "[reply|uid|link|@tag]",
  cooldowns: 10
};

// --- HỖ TRỢ: load cookie từ nhiều nơi (data/cookie.json ưu tiên, fallback includes/cookie.txt)
function loadCookie() {
  try {
    // 1) modules/commands/data/cookie.json (chuẩn của nhiều bot)
    const cookieJsonPath = path.resolve(__dirname, "data", "cookie.json");
    if (fs.existsSync(cookieJsonPath)) {
      const raw = fs.readFileSync(cookieJsonPath, "utf8").trim();
      if (raw) {
        try {
          const j = JSON.parse(raw);
          if (j.cookie && j.cookie.trim()) return j.cookie.trim();
        } catch (e) {
          // file có thể là raw cookie string -> handle tiếp
          const maybe = raw.replace(/\r?\n/g, " ").trim();
          if (maybe) return maybe;
        }
      }
    }

    // 2) fallback: includes/cookie.txt (đường dẫn bạn từng dùng)
    // -> tìm ở dự án gốc (2 cấp up)
    const projectRoot = path.resolve(__dirname, "..", "..");
    const includePath1 = path.join(projectRoot, "includes", "cookie.txt");
    const includePath2 = path.join(projectRoot, "includes", "cookie.json");

    if (fs.existsSync(includePath1)) {
      const raw = fs.readFileSync(includePath1, "utf8").trim();
      if (raw) return raw;
    }
    if (fs.existsSync(includePath2)) {
      const raw = fs.readFileSync(includePath2, "utf8").trim();
      try {
        const j = JSON.parse(raw);
        if (j.fb) return j.fb;
        if (j.cookie) return j.cookie;
      } catch (e) {
        if (raw) return raw;
      }
    }

    // nếu không tìm thấy -> null
    return null;
  } catch (e) {
    console.error("[loadCookie] Lỗi đọc cookie:", e.message);
    return null;
  }
}

// --- định dạng thời gian
function convert(time) {
  try {
    const d = new Date(time);
    const pad = n => (n < 10 ? "0" + n : n);
    return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())} | ${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()}`;
  } catch { return time || "❎"; }
}

// --- crawl thông tin cơ bản từ mbasic/facebook (login bằng cookie)
async function getProfileByUID(uid, cookie) {
  try {
    const headers = { cookie, "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" };
    // dùng mbasic vì html ít js, dễ parse
    const url = `https://mbasic.facebook.com/profile.php?id=${uid}`;
    const { data } = await axios.get(url, { headers, timeout: 15000 });
    const $ = cheerio.load(data);

    // tên
    const name = $("title").text().replace(/\\|Facebook/gi, "").trim() || "Không rõ";

    // tiểu sử / about short (thử tìm các block có text)
    let bio = "";
    // mbasic có các thẻ 'div' chứa nội dung tiểu sử, thử tìm
    $("div").each((i, el) => {
      const txt = $(el).text().trim();
      if (!bio && txt && txt.length < 200 && /tiểu sử|intro|bio|about|Giới thiệu|Giới thiệu về/.test(txt) ) {
        bio = txt;
      }
    });
    // fallback: tìm thẻ meta
    if (!bio) bio = $("meta[name='description']").attr("content") || "Không có";

    // avatar (graph api pic - luôn trả redirect hình)
    const avatar = `https://graph.facebook.com/${uid}/picture?width=720&height=720`;

    // cố gắng lấy cover từ html
    let cover = "Không có";
    // mbasic hiển thị background image trong style? fallback scrape facebook web desktop
    try {
      // thử trang desktop để lấy cover nếu mbasic không trả
      const { data: dt2 } = await axios.get(`https://facebook.com/${uid}`, { headers, timeout: 15000 });
      const m = dt2.match(/profile_cover_photo.*?src="([^"]+)"/i) || dt2.match(/coverPhoto":\[\{"url":"([^"]+)"/i);
      if (m && m[1]) cover = m[1].replace(/\\u0025/g, "%");
    } catch (e) {
      // không bắt buộc
    }

    // username / link
    let link = `https://facebook.com/profile.php?id=${uid}`;
    const usernameEl = $("a[href*='profile.php?id']").first().attr("href");
    if (!usernameEl) {
      // tìm link dạng /username
      const maybe = $("a").filter((i, el) => {
        const href = $(el).attr("href") || "";
        return /^\/[A-Za-z0-9.\-_]+$/.test(href) && href.indexOf("profile.php") === -1;
      }).first().attr("href");
      if (maybe) link = `https://facebook.com${maybe}`;
    }

    // locale/timezone - mbasic thường ko cho, để placeholder
    return { name, bio, avatar, cover, link };
  } catch (e) {
    return { error: e.message || "Lỗi khi lấy profile" };
  }
}

// --- lấy 5 bài viết gần đây (dạng text + link nếu có)
async function getPostsByUID(uid, cookie) {
  try {
    const headers = { cookie, "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" };
    const url = `https://mbasic.facebook.com/profile.php?id=${uid}&sk=photos`; // trang profile (posts có thể ở nhiều nơi)
    const { data } = await axios.get(`https://mbasic.facebook.com/profile.php?id=${uid}`, { headers, timeout: 15000 });
    const $ = cheerio.load(data);
    const posts = [];

    // mbasic structure: posts thường ở các div có data-ft or aria-label
    $("div").each((i, el) => {
      const txt = $(el).text().trim();
      if (txt && txt.length > 20 && posts.length < 8) {
        // lọc text quá ngắn, tránh trùng lặp
        if (!posts.includes(txt)) posts.push(txt.slice(0, 700));
      }
    });

    // refine: try to find links to story.php?story_fbid=
    const postLinks = [];
    const matchAll = data.matchAll(/\/story.php\?story_fbid=(\d+)&id=(\d+)/g);
    for (const m of matchAll) {
      if (postLinks.length >= 5) break;
      const pid = m[1];
      postLinks.push(`https://facebook.com/story.php?story_fbid=${pid}&id=${m[2]}`);
    }

    // return up to 5 combined results (prioritize textual posts)
    const final = posts.slice(0, 5).map((p, i) => ({ index: i+1, text: p, link: postLinks[i] || "" }));
    return final;
  } catch (e) {
    return [];
  }
}

// --- MAIN RUN
module.exports.run = async function({ api, event, args }) {
  const cookie = loadCookie();
  if (!cookie) {
    return api.sendMessage("⚠️ Cookie trống hoặc không tìm thấy!\nHãy đặt cookie vào modules/commands/data/cookie.json hoặc includes/cookie.txt", event.threadID, event.messageID);
  }

  // xác định target id
  let id;
  if (Object.keys(event.mentions || {}).length > 0) id = Object.keys(event.mentions)[0];
  else if (event.type === "message_reply" && event.messageReply && event.messageReply.senderID) id = event.messageReply.senderID;
  else if (args && args[0]) {
    // nếu truyền link, tách uid
    const matchId = args[0].match(/(\d{5,})/);
    if (matchId) id = matchId[1];
    else {
      // có thể là username -> leave as is (mbasic supports /username)
      id = args[0];
    }
  } else id = event.senderID;

  // gửi thông báo
  api.sendMessage("🔄 Đang lấy thông tin... (cần vài giây)", event.threadID, event.messageID);

  const info = await getProfileByUID(id, cookie);
  if (info.error) return api.sendMessage("❌ Lỗi: " + info.error, event.threadID, event.messageID);

  // chuẩn bị tin nhắn
  const body = `==== [ THÔNG TIN NGƯỜI DÙNG ] ====
|› Tên: ${info.name}
|› UID: ${id}
|› Link: ${info.link}
|› Tiểu sử: ${info.bio || "Không có"}
|› Ảnh bìa: ${info.cover || "Không có"}
────────────────────
📌 Thả cảm xúc "😆" để xem 5 bài viết gần đây.`;

  // gửi avatar kèm tin nhắn, và push handleReaction để xử lý react
  try {
    const avatarStream = (await axios.get(info.avatar, { responseType: "stream", headers: { "User-Agent": "Mozilla/5.0" } })).data;
    api.sendMessage({ body, attachment: avatarStream }, event.threadID, (err, infoMsg) => {
      if (err) return api.sendMessage(body, event.threadID);
      // đẩy vào global handler (Filebotvip1 style)
      try {
        global.client.handleReaction.push({
          name: module.exports.config.name,
          messageID: infoMsg.messageID,
          author: id // dùng author = uid mục tiêu
        });
      } catch (e) {
        // nếu global.client.handleReaction không tồn tại, tạo mảng tạm
        if (!global.client) global.client = {};
        if (!global.client.handleReaction) global.client.handleReaction = [];
        global.client.handleReaction.push({
          name: module.exports.config.name,
          messageID: infoMsg.messageID,
          author: id
        });
      }
    }, event.messageID);
  } catch (e) {
    // nếu fail gửi ảnh, gửi chỉ text
    api.sendMessage(body, event.threadID, event.messageID);
  }
};

// --- HANDLE REACTION: khi ai đó thả 😆 vào message do lệnh info gửi
module.exports.handleReaction = async function({ api, event, handleReaction }) {
  try {
    if (event.reaction !== "😆") return;
    // đảm bảo là tương tác với message đúng
    if (event.userID !== event.senderID && event.userID !== handleReaction.author && event.userID !== handleReaction.author) {
      // cho phép người request hoặc bất kỳ ai? ở đây cho phép mọi người trigger
    }

    // author chứa uid mục tiêu (theo cách push phía trên)
    const targetUID = handleReaction.author;
    const cookie = loadCookie();
    if (!cookie) return api.sendMessage("⚠️ Cookie lỗi khi lấy bài viết!", event.threadID);

    // lấy bài viết
    api.unsendMessage(handleReaction.messageID); // xoá message info (như code gốc)
    api.sendMessage("📖 Đang lấy bài viết gần đây...", event.threadID);

    const posts = await getPostsByUID(targetUID, cookie);
    if (!posts || posts.length === 0) return api.sendMessage("❎ Không tìm thấy bài viết nào!", event.threadID);

    let out = "📚 5 BÀI VIẾT GẦN ĐÂY:\n──────────────────\n";
    posts.slice(0,5).forEach(p => {
      out += `${p.index}. ${p.text}\n${p.link ? "Link: " + p.link + "\n" : ""}──────────────────\n`;
    });

    return api.sendMessage(out, event.threadID);
  } catch (e) {
    return api.sendMessage("⚠️ Lỗi khi xử lý reaction: " + e.message, event.threadID);
  }
};