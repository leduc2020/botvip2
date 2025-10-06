const axios = require("axios");
const fs = require("fs");
const ytdl = require('@distube/ytdl-core');

// Regex để tìm các liên kết Spotify và CapCut
const regexSpotify = /https:\/\/open\.spotify\.com\/track\/[a-zA-Z0-9]+(\?si=[a-zA-Z0-9]+)?/g;
const regexZingMP3 = /https:\/\/zingmp3\.vn\/bai-hat\/[A-Za-z0-9\-]+\/[A-Za-z0-9]+\.html/g;
const regexCapCut = /https:\/\/www\.capcut\.com\/(t|template-detail|video|clip)\/[a-zA-Z0-9\-\_]+/g;
module.exports = class {
  static config = {
    name: "atdytb",
    version: "1000.0.0",
    hasPermssion: 0,
    credits: "Dgk",
    description: "Tải video từ YouTube, Facebook, TikTok, Pinterest, CapCut và âm thanh từ SoundCloud",
    commandCategory: "Tiện ích",
    usages: "",
    cooldowns: 5
  }

  static run() {}

  static check_url(url) {
    return /^https:\/\//.test(url);
  }

  static async streamURL(url, type) {
    const path = __dirname + `/cache/${Date.now()}.${type}`;
    const res = await axios.get(url, { responseType: 'arraybuffer' });
    fs.writeFileSync(path, res.data);
    setTimeout(() => fs.unlinkSync(path), 1000 * 60);
    return fs.createReadStream(path);
  }

  static convertHMS(value) {
    const sec = parseInt(value, 10);
    let hours = Math.floor(sec / 3600);
    let minutes = Math.floor((sec - (hours * 3600)) / 60);
    let seconds = sec - (hours * 3600) - (minutes * 60);
    if (hours < 10) { hours = "0" + hours; }
    if (minutes < 10) { minutes = "0" + minutes; }
    if (seconds < 10) { seconds = "0" + seconds; }
    return (hours !== '00' ? hours + ':' : '') + minutes + ':' + seconds;
  }

  static formatPublishDate(publishDate) {
    const dateObj = new Date(publishDate);
    const day = dateObj.getDate().toString().padStart(2, '0');
    const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
    const year = dateObj.getFullYear();
    
    const hours = dateObj.getHours();
    const minutes = dateObj.getMinutes().toString().padStart(2, '0');
    const seconds = dateObj.getSeconds().toString().padStart(2, '0');
    
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const formattedHour = (hours % 12 || 12).toString().padStart(2, '0');

    return `${day}/${month}/${year} || ${formattedHour}:${minutes}:${seconds} ${ampm}`;
  }

  static async handleEvent(o) {
    const { threadID: t, messageID: m, body: b } = o.event;
    const send = msg => o.api.sendMessage(msg, t, m);
    const head = t => ` AUTODOWN - [ ${t} ]\n──────────────────`;

    // Kiểm tra liên kết CapCut
    const capCutUrls = b.match(regexCapCut);
if (capCutUrls) {
  for (const url of capCutUrls) {
    try {
      const response = await axios.get(`http://sudo.pylex.xyz:10966/media/url?url=${encodeURIComponent(url)}`);
      const data = response.data;

      if (!data.error && data.medias && data.medias.length > 0) {
        // Lọc video chất lượng cao không có watermark
        const videoMedia = data.medias.find(media => media.type === "video" && media.quality === "HD No Watermark");

        if (videoMedia) {
          send({
            body: `${head('CAPCUT')}\n⩺ Tiêu Đề: ${data.title}\n⩺ Thời gian: ${data.duration}\n⩺ Tác Giả: ${data.author}`,
            attachment: await this.streamURL(videoMedia.url, videoMedia.extension)
          });
        } else {
          console.error("Không tìm thấy video HD không watermark từ CapCut.");
        }
      } else {
        console.error("Không thể tải dữ liệu từ CapCut.");
      }
    } catch (err) {
      console.error("Lỗi khi tải nội dung từ CapCut:", err);
    }
  }
  return;
}
////zing
if (regexZingMP3.test(b)) {
      const zingMP3Urls = b.match(regexZingMP3);
      for (const url of zingMP3Urls) {
        try {
          const response = await axios.get(`https://subhatde.id.vn/zingmp3?link=${encodeURIComponent(url)}`);
          const data = response.data;
          const title = data.title; // Assuming title is returned from the API
          const artist = data.artist;
          const downloadUrl = data.download_url;

          if (downloadUrl) {
            send({
              body: `${head('ZING MP3')}\n⩺ Title: ${title} \n⩺ Artist: ${artist}`,
              attachment: await this.streamURL(downloadUrl, 'mp3')
            });
          } else {
            console.error("Không thể tải dữ liệu từ Zing MP3.");
          }
        } catch (err) {
          console.error("Lỗi khi tải nội dung Zing MP3:", err);
        }
      }
      return;
    }
    // Regex để tìm thông tin từ SoundCloud
    const regex = /(?:Listen to (.+?) by (.+?) on #SoundCloud\s+)?(https?:\/\/(?:on\.soundcloud\.com|soundcloud\.com|m\.soundcloud\.com)\/[^\s]+)/;
const match = b.match(regex);

if (match) {
  const title = match[1]?.trim() || "Không xác định";
  const artist = match[2]?.trim() || "Không xác định";
  const url = match[3].trim();

  try {
    const response = await axios.get(`https://j2-2rfa.onrender.com/media/url?url=${encodeURIComponent(url)}&client_id=YOUR_CLIENT_ID`);
    const data = response.data;

    if (!data.error && data.medias && data.medias.length > 0) {
      const audioData = data.medias[0]; // Lấy thông tin media đầu tiên
      const attachment = await this.streamURL(audioData.url, audioData.extension);

      send({
        body: `${head('SOUNDCLOUD')}\n⩺ Tiêu Đề: ${title}\n⩺ Nghệ Sĩ: ${artist}\n⩺ Thời gian: ${data.duration}\n`,
        attachment: attachment,
      });
    } else {
      console.error('Không tìm thấy dữ liệu hợp lệ để tải xuống từ SoundCloud.');
    }
  } catch (error) {
    console.error('Lỗi khi tải âm thanh từ SoundCloud:', error);
  }
  return;
}
    if (this.check_url(b)) {
      // Kiểm tra liên kết YouTube
      if (/(^https:\/\/)((www)\.)?(youtube|youtu|watch)(PP)*\.(com|be)\//.test(b)) {
        ytdl.getInfo(b).then(async info => {
          let detail = info.videoDetails;
          let format = info.formats.find(f => f.qualityLabel && f.qualityLabel.includes('360p') && f.audioBitrate);

          if (format) {
            const publishDate = this.formatPublishDate(detail.publishDate);
            send({
              body: `${head('YOUTUBE')}\n` +
                    `⩺ Tiêu Đề: ${detail.title}\n` +
                    `⩺ Thời lượng: ${this.convertHMS(Number(detail.lengthSeconds))}\n` +
                    `⩺ Tác giả: ${detail.author.name}\n` +
                    `⩺ Ngày đăng: ${publishDate}\n` +
                    `⩺ Lượt thích: ${detail.likes || 'Không có'}\n` +
                    `⩺ Bình luận: ${detail.comments || 'Không có'}\n` +
                    `⩺ Chia sẻ: ${detail.shares || 'Không có'}`,
              attachment: await this.streamURL(format.url, 'mp4')
            });
          } else {
            console.error('Không tìm thấy định dạng phù hợp cho video YouTube.');
          }
        }).catch(err => console.error('Lỗi khi tải thông tin video YouTube:', err));

      // Kiểm tra liên kết Spotify
      } else if (regexSpotify.test(b)) {
        const spotifyUrls = b.match(regexSpotify);
        for (const url of spotifyUrls) {
          try {
            const response = await axios.get(`https://j2-2rfa.onrender.com/media/url?url=${encodeURIComponent(url)}`);
            const data = response.data;

            if (!data.error && data.medias && data.medias.length > 0) {
              const audioMedia = data.medias.find(media => media.type === "audio");
              if (audioMedia) {
                send({
                  body: `${head('SPOTIFY')}\n⩺ Tiêu Đề: ${data.title}\n⩺ Thời gian: ${data.duration}`,
                  attachment: await this.streamURL(audioMedia.url, audioMedia.extension)
                });
              } else {
                console.error("Không tìm thấy file âm thanh hợp lệ từ Spotify.");
              }
            } else {
              console.error("Không thể tải dữ liệu từ Spotify.");
            }
          } catch (err) {
            console.error("Lỗi khi tải nội dung Spotify:", err);
          }
        }
        return;

      // Kiểm tra liên kết Facebook
      } else if (/^https:\/\/(www\.facebook\.com\/(groups|events|marketplace|watch|share|stories|posts|reel|r|videos|live|gaming)\/|www\.facebook\.com\/[a-zA-Z0-9.]+\/(posts|videos|photos|live|reels)\/|www\.facebook\.com\/share\/v\/[a-zA-Z0-9]+\/|www\.facebook\.com\/permalink\.php\?story_fbid=[0-9]+&id=[0-9]+|www\.facebook\.com\/[a-zA-Z0-9.]+\/?(\?app=fbl)?)/.test(b)) {
    axios.get(`http://sudo.pylex.xyz:10966/media/url?url=${encodeURIComponent(b)}`)
    .then(async res => {
        const data = res.data;

        if (data.error || !data.medias || data.medias.length === 0) {
            console.error('Không thể tải dữ liệu hoặc không có dữ liệu hợp lệ.');
            return;
        }

        const uniqueUrls = new Set();
        const attachments = [];

        // Hàm chuẩn hóa URL (loại bỏ các query không cần thiết)
        const normalizeUrl = (url) => {
            const [baseUrl] = url.split('?'); // Loại bỏ phần `?query` khỏi URL
            return baseUrl;
        };

        // Lọc media hợp lệ và không trùng
        const filteredMedia = data.medias.filter(media => {
            const normalizedUrl = normalizeUrl(media.url);

            // Loại bỏ thumbnail, avatar và URL trùng lặp
            if (normalizedUrl === normalizeUrl(data.thumbnail)) return false;
            if (media.type === 'image' && media.url.includes('s80x80')) return false;
            if (uniqueUrls.has(normalizedUrl)) return false;

            // Thêm URL đã chuẩn hóa vào Set để tránh trùng lặp
            uniqueUrls.add(normalizedUrl);
            return true;
        });

        // Kiểm tra nếu không có media hợp lệ
        if (filteredMedia.length === 0) {
            console.error('Không có media hợp lệ để gửi.');
            return;
        }

        // Tải và gửi media
        for (const media of filteredMedia) {
            try {
                const fileExtension = media.extension || (media.type === 'video' ? 'mp4' : 'jpg');
                const attachment = await this.streamURL(media.url, fileExtension);
                attachments.push(attachment);
            } catch (error) {
                console.error(`Lỗi tải file: ${media.url}`, error);
            }
        }

        if (attachments.length > 0) {
            const messageBody = `${head('FACEBOOK')}\n⩺ Tiêu Đề: ${data.title}\n⩺ Nguồn: ${data.source}`;
            send({ body: messageBody, attachment: attachments });
        } else {
            console.error('Không có file nào được tải xuống thành công.');
        }
    })
    .catch(err => console.error('Lỗi khi tải nội dung Facebook:', err));
      // Kiểm tra liên kết Pinterest
      } else if (/https:\/\/pin\.it\/[a-zA-Z0-9]+/.test(b)) {
        const pinterestUrl = b;
        const apiUrl = `https://pinterestdownloader.io/frontendService/DownloaderService?url=${encodeURIComponent(pinterestUrl)}`;

        axios.get(apiUrl)
          .then(async response => {
            const data = response.data;

            if (data && data.medias && data.medias.length > 0) {
              const message = data.title || 'Pinterest Media';
              const attachments = [];
              let videoFound = false;

              // Iterate through media to find videos
              for (const media of data.medias) {
                if (media.videoAvailable && media.extension === 'mp4') {
                  attachments.push(await this.streamURL(media.url, 'mp4'));
                  videoFound = true;
                  break; // Send the first video found and exit the loop
                }
              }

              if (videoFound) {
                send({ body: `${head('PINTEREST')}\n⩺ Tiêu Đề: ${message}`, attachment: attachments });
              } else {
                // If no video found, check for GIFs and images
                for (const media of data.medias) {
                  if (media.extension === 'gif') {
                    attachments.push(await this.streamURL(media.url, 'gif'));
                    send({ body: `${head('PINTEREST')}\n⩺ Tiêu Đề: ${message}`, attachment: attachments });
                    return; // Send the first GIF found and exit the loop
                  } else if (media.extension === 'jpg' || media.extension === 'png') {
                    attachments.push(await this.streamURL(media.url, media.extension));
                    send({ body: `${head('PINTEREST')}\n⩺ Tiêu Đề: ${message}`, attachment: attachments });
                    return; // Send the first image found and exit the loop
                  }
                }
              }

              if (!videoFound && attachments.length === 0) {
                console.error(`${head('PINTEREST')}\n⩺ Không có nội dung hợp lệ để gửi.`);
              }
            } else {
              console.error('Không có dữ liệu Pinterest nào.');
            }
          })
          .catch(err => {
            console.error('Lỗi khi tải nội dung Pinterest:', err);
          });
     } else if (/(^https:\/\/)((vm|vt|www|v|lite)\.)?(tiktok|douyin)\.com\//.test(b)) {
    // Xử lý logic khi phát hiện liên kết TikTok hoặc Douyin
        const json = await this.infoPostTT(b); // Fetch TikTok post details
        let attachment = [];
        let audioAttachment = null;

        // Attempt to fetch audio
        if (json.music_info && json.music_info.play) {
          audioAttachment = await this.streamURL(json.music_info.play, 'mp3'); // Download audio
          send({
            body: `${head('TIKTOK')}\n⩺  Author: ${json.author.nickname}\n⩺  Tiêu Đề: ${json.title}\n\n💿 Audio:`,
            attachment: audioAttachment // Send audio directly
          });
        }

        // Handle images or video after audio
        if (json.images && json.images.length > 0) {
          for (const imageUrl of json.images) {
            attachment.push(await this.streamURL(imageUrl, 'png')); // Download images
          }
        } else if (json.play) {
          attachment.push(await this.streamURL(json.play, 'mp4')); // Download video
        }

        if (attachment.length > 0) {
          send({
            body: `${head('TIKTOK')}\n⩺  Author: ${json.author.nickname}\n⩺ URL: https://www.tiktok.com/@${json.author.unique_id}\n⩺ Tiêu Đề: ${json.title || json.description || 'Không có tiêu đề'}\n⩺ Lượt Thích: ${json.digg_count}\n⩺ Lượt Bình Luận: ${json.comment_count}\n⩺ Lượt Chia Sẻ: ${json.share_count}\n⩺ Lượt Tải: ${json.download_count}`,
            attachment: attachment
          });
        }

        return; // Exit after handling TikTok
      }
    }
  }

  // Function to fetch TikTok post details
  static async infoPostTT(url) {
    return axios({
      method: 'post',
      url: `https://tikwm.com/api/`,
      data: {
        url
      },
      headers: {
        'content-type': 'application/json'
      }
    }).then(res => res.data.data);
  }
}

exports.handleReaction = async function ({ api, event, Threads, handleReaction }) {
  // Removed reaction handling code
};