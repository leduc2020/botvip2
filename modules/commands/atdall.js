const fs = require("fs-extra");
const axios = require("axios");
const qs = require("querystring");

module.exports.config = {
  name: "Downlink",
  version: "2.3.1",
  hasPermssion: 0,
  credits: "gấu lỏ",
  description: "Tải video",
  commandCategory: "Tiện ích",
  usages: "Tự động tải khi có link",
  cooldowns: 5
};

const UA_MOBILE =
  "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36";
const UA_DESKTOP =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36";

const TIMEOUT_HTML = 25_000;
const TIMEOUT_MEDIA = 30_000;

const FSAVE_COOKIE =
  "_ga=GA1.1.651644104.1750425555; PHPSESSID=ok47d858hgdlteh76flbffjc6f; __gads=ID=16733e5ab4e58bf7:T=1750425553:RT=1755494728:S=ALNI_MaqIK2T2wRFqPEy_WLQC35B1qfhcA; __gpi=UID=0000113521187975:T=1750425553:RT=1755494728:S=ALNI_MY_SUQovG8j_GAaZpxzkgD2pn0ALQ; __eoi=ID=17d3d1b3ab422718:T=1750425553:RT=1755494728:S=AA-AfjaR1P3RkOenub5c4jj_9bpF; FCNEC=%5B%5B%22AKsRol_V23ZjJ8iLZfqeTB1E5bmfsKa0WTJqensWxYL8naKHdNpBkcYTMUfIn_r6B9m6mhMHvO08ifkjitjtCJxXp8G5BoQqjhcpEyXMWft83Oj7TS-8unw7udrhemObS8O_Udtq2yjIkZvDs2vNoNA6z3n7c05Rzg%3D%3D%22%5D%5D; _ga_BS5L7X15HP=GS2.1.s1755494727$o5$g1";

function getResolution(s = "") {
  const m = String(s).match(/(\d{3,4})(?=p\b)/i) || String(s).match(/\b(\d{3,4})\b/);
  return m ? parseInt(m[1], 10) : 0;
}
function tryParseJSON(text) { try { return JSON.parse(text); } catch { return null; } }
function extractLinksFromHTML(html) {
  const items = [];
  const aTag = /<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = aTag.exec(html))) {
    const href = m[1];
    const label = m[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (/\.mp4\b|video/i.test(href)) {
      items.push({ url: href, title: label, quality: getResolution(label) || getResolution(href) });
    }
  }
  const mp4Loose = /https?:\/\/[^\s"'<>]+\.mp4[^\s"'<>]*/gi;
  let m2;
  while ((m2 = mp4Loose.exec(html))) {
    const href = m2[0];
    if (!items.find(i => i.url === href)) items.push({ url: href, title: "", quality: getResolution(href) });
  }
  return items;
}
function normalizeFsaveJson(json) {
  const items = [];
  function walk(node) {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) return node.forEach(walk);
    const url = node.url || node.src || node.href;
    const title = node.title || node.label || node.name || "";
    const quality = node.quality || node.q || node.resolution || getResolution(title) || getResolution(url || "");
    if (url && /https?:\/\//i.test(url) && /\.mp4/i.test(url)) {
      items.push({ url, title, quality: typeof quality === "string" ? getResolution(quality) : (quality || 0) });
    }
    Object.values(node).forEach(walk);
  }
  walk(json);
  return items;
}
async function fetchFacebookFromFsave(fbUrl) {
  const payload = qs.stringify({ url: fbUrl });
  const headers = {
    "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
    "X-Requested-With": "XMLHttpRequest",
    "Origin": "https://fsave.net",
    "Referer": "https://fsave.net/vi",
    "User-Agent": UA_MOBILE,
    Cookie: FSAVE_COOKIE
  };
  const resp = await axios.post("https://fsave.net/proxy.php", payload, { headers, timeout: TIMEOUT_HTML });
  const text = typeof resp.data === "string" ? resp.data : JSON.stringify(resp.data);

  let items = [];
  const asJson = tryParseJSON(text);
  if (asJson) items = normalizeFsaveJson(asJson);
  if (!items.length) items = extractLinksFromHTML(text);

  items.sort((a, b) => (b.quality || 0) - (a.quality || 0));
  return items[0] || null;
}
function pickBestVideoFromDownr(videoList) {
  if (!videoList || !videoList.length) return null;
  return (
    videoList.find(v => v.quality === "hd_no_watermark") ||
    videoList.find(v => v.quality === "no_watermark") ||
    videoList[0]
  );
}
async function sendPrettyFail(api, threadID, messageID) {
  const body =
    "" +
    "";
  await api.sendMessage({ body }, threadID, messageID);
}

module.exports.run = async function () { };

module.exports.handleEvent = async function ({ api, event }) {
  const { threadID, messageID, body } = event;
  if (!body) return;

  const urls = body.match(/https?:\/\/[\w\d\-._~:/?#[\]@!$&'()*+,;=%]+/g);
  if (!urls) return;
  const url = urls[0];

  const supported = [
    "facebook.com", "tiktok.com", "v.douyin.com", 
    "instagram.com", "threads.net", "youtube.com",
    "youtu.be", "capcut.com", "threads.com"
  ];
  if (!supported.some(domain => url.includes(domain))) return;

  const isFacebook = /facebook\.com/i.test(url);

  let sent = false;
  try {
    const response = await axios.post(
      "https://downr.org/.netlify/functions/download",
      { url },
      {
        headers: {
          accept: "*/*",
          "content-type": "application/json",
          origin: "https://downr.org",
          referer: "https://downr.org/",
          "user-agent": UA_DESKTOP
        },
        timeout: TIMEOUT_HTML
      }
    );
    const data = response.data;
    if (data && Array.isArray(data.medias)) {
      const title = data.title || "Không có tiêu đề";
      const author = data.author || "Không rõ";
      const header =
        `[${(data.source || "Unknown").toUpperCase()}] - Tự Động Tải\n\n` +
        `👤 Tác giả: ${author}\n💬 Tiêu đề: ${title}`;

      const videoList = data.medias.filter(m => m.type === "video");
      const bestVideo = pickBestVideoFromDownr(videoList);
      const images = data.medias.filter(m => m.type === "image").map(img => img.url);

      const attachments = [];
      for (const imgUrl of images) {
        try {
          const imgStream = (await axios.get(imgUrl, { responseType: "stream", timeout: TIMEOUT_HTML })).data;
          attachments.push(imgStream);
        } catch (e) { console.error("Ảnh lỗi:", e.message); }
      }
      if (bestVideo && bestVideo.url) {
        try {
          const videoStream = (await axios.get(bestVideo.url, { responseType: "stream", timeout: TIMEOUT_MEDIA })).data;
          attachments.push(videoStream);
        } catch (e) { console.error("Video lỗi:", e.message); }
      }
      if (attachments.length) {
        await api.sendMessage({ body: header, attachment: attachments }, threadID, messageID);
        sent = true;
      }
    }
  } catch (e) {
    console.error("Downr lỗi:", e.message);
  }

  if (!sent && isFacebook) {
    try {
      const best = await fetchFacebookFromFsave(url);
      if (best && best.url) {
        const videoStream = (await axios.get(best.url, {
          responseType: "stream",
          timeout: TIMEOUT_MEDIA,
          maxRedirects: 5
        })).data;
        const header = `[FACEBOOK] - Tự động tải \n 👤 Tác giả: \n💬 Tiêu đề: `;
        await api.sendMessage({ body: header, attachment: videoStream }, threadID, messageID);
        sent = true;
      }
    } catch (e) {
      console.error("Fsave lỗi:", e.message);
    }
  }

  if (!sent) {
    await sendPrettyFail(api, threadID, messageID);
  }
};
