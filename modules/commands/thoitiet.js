const axios = require("axios");
const moment = require("moment-timezone");

module.exports.config = {
    name: "thoitiet",
    version: "2.0",
    credits: "Q.Huy",
    description: "Nhận biết điều kiện thời tiết hiện tại",
    commandCategory: "Tiện ích",
    usages: "/weather [vị trí]",
    cooldowns: 3,
};

module.exports.run = async function ({ api, event, args }) {
    const apiKey = "deae5206758c44f38b0184151232208"; // API key của WeatherAPI
    const city = args.join(" ");

    if (!city) {
        return api.sendMessage("Vui lòng cung cấp tên thành phố!", event.threadID, event.messageID);
    }

    const apiUrl = `http://api.weatherapi.com/v1/current.json?key=${apiKey}&q=${encodeURIComponent(city)}`;

    // Đối tượng ánh xạ các trạng thái thời tiết từ tiếng Anh sang tiếng Việt
    const weatherTranslations = {
        "Sunny": "Trời Nắng",
        "Mostly sunny": "Nhiều Nắng",
        "Partly sunny": "Nắng Vài Nơi",
        "Rain showers": "Mưa Rào",
        "T-Storms": "Có Bão",
        "Light rain": "Mưa Nhỏ",
        "Mostly cloudy": "Trời Nhiều Mây",
        "Rain": "Trời Mưa",
        "Heavy T-Storms": "Bão Lớn",
        "Partly cloudy": "Mây Rải Rác",
        "Mostly clear": "Trời Trong Xanh",
        "Cloudy": "Trời Nhiều Mây",
        "Clear": "Trời Trong Xanh, Không Mây",
        "Overcast": "Trời U Ám",
        "Moderate or heavy rain shower": "Mưa Vừa hoặc To",
        "Light rain shower": "Mưa Rào Nhẹ",
        "Patchy rain nearby": "Mưa Rào Gần Đó",
        "Light drizzle": "Mưa Phùn Nhẹ",
        "Drizzle": "Mưa Phùn",
        "Heavy rain": "Mưa Lớn",
        "Moderate rain": "Mưa Vừa",
        "Snow": "Tuyết",
        "Light snow": "Tuyết Nhẹ",
        "Heavy snow": "Tuyết Lớn",
        "Mist": "Sương Mù",
        "Fog": "Sương Mù Dày",
        "Freezing fog": "Sương Mù Lạnh Giá",
        "Patchy light rain": "Mưa Nhẹ Rải Rác",
        "Patchy heavy rain": "Mưa Lớn Rải Rác",
        "Patchy snow nearby": "Tuyết Rải Rác Gần Đó",
        "Thundery outbreaks possible": "Có Khả Năng Có Bão",
    };

    try {
        const response = await axios.get(apiUrl);
        const data = response.data;

        if (data.error) {
            return api.sendMessage("Không tìm thấy thành phố hoặc xảy ra lỗi.", event.threadID, event.messageID);
        }

        const weatherInfo = data.current;
        const currentDateTime = moment().tz(data.location.tz_id).format("HH:mm:ss - DD/MM/YYYY");
        let condition = weatherInfo.condition.text;

        // Kiểm tra xem trạng thái thời tiết có trong weatherTranslations không
        let translatedCondition = weatherTranslations[condition];

        // Nếu không có trong danh sách, tự động dịch bằng MyMemory Translated API
        if (!translatedCondition) {
            try {
                const translateUrl = "https://api.mymemory.translated.net/get";
                const translateResponse = await axios.get(translateUrl, {
                    params: {
                        q: condition,
                        langpair: "en|vi",
                    },
                });
                translatedCondition = translateResponse.data.responseData.translatedText;
            } catch (translateError) {
                console.error(`Lỗi khi dịch trạng thái thời tiết: ${translateError}`);
                translatedCondition = condition; // Giữ nguyên nếu dịch thất bại
            }
        }

        const weatherMessage = `
Thời tiết của ${city} (tính đến ${currentDateTime}):\n
🌡 Nhiệt độ: ${weatherInfo.temp_c}°C (${weatherInfo.temp_f}°F)
✨ Cảm giác như: ${weatherInfo.feelslike_c}°C (${weatherInfo.feelslike_f}°F)
📌 Dự báo: ${translatedCondition}
🌪️ Gió: ${weatherInfo.wind_kph} km/h, ${weatherInfo.wind_dir}
🌀 Áp suất: ${weatherInfo.pressure_mb} mb
💧 Độ ẩm: ${weatherInfo.humidity}%
🧬 Chỉ số tia cực tím: ${weatherInfo.uv}%`;
        const additionalInfo = `
☁️ Mây che phủ: ${weatherInfo.cloud}%
🌧️ Lượng mưa: ${weatherInfo.precip_mm} mm (${weatherInfo.precip_in} in)
🌬️ Gió giật: ${weatherInfo.gust_kph} km/h
        `;

        api.sendMessage(weatherMessage + additionalInfo, event.threadID, event.messageID);
    } catch (error) {
        console.error(`Lỗi khi tìm kiếm dữ liệu thời tiết: ${error}`);
        api.sendMessage(`Lỗi khi tìm kiếm vị trí: ${city}`, event.threadID, event.messageID);
    }
};