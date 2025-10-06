const moment = require("moment-timezone");
const {readdirSync, readFileSync,writeFileSync,existsSync,unlinkSync,rm,} = require("fs-extra");
const { join, resolve } = require("path");
const fs = require('fs-extra');
const path = require('path');
const { execSync } = require("child_process");
const logger = require("./utils/log.js");
const login = require("./includes/fca");
const axios = require("axios");
const listPackage = JSON.parse(readFileSync("./package.json")).dependencies;
const listbuiltinModules = require("module").builtinModules;

global.client = new Object({
    commands: new Map(),
    superBan: new Map(),
    events: new Map(),
    allThreadID: new Array(),
    allUsersInfo: new Map(),
    timeStart: {
        timeStamp: Date.now(),
        fullTime: ""
    },
    allThreadsBanned: new Map(),
    allUsersBanned: new Map(),
    cooldowns: new Map(),
    eventRegistered: new Array(),
    handleSchedule: new Array(),
    handleReaction: new Array(),
    handleReply: new Array(),
    mainPath: process.cwd(),
    configPath: new String(),
    getTime: function (option) {
        switch (option) {
            case "seconds":
                return `${moment.tz("Asia/Ho_Chi_minh").format("ss")}`;
            case "minutes":
                return `${moment.tz("Asia/Ho_Chi_minh").format("mm")}`;
            case "hours":
                return `${moment.tz("Asia/Ho_Chi_minh").format("HH")}`;
            case "date": 
                return `${moment.tz("Asia/Ho_Chi_minh").format("DD")}`;
            case "month":
                return `${moment.tz("Asia/Ho_Chi_minh").format("MM")}`;
            case "year":
                return `${moment.tz("Asia/Ho_Chi_minh").format("YYYY")}`;
            case "fullHour":
                return `${moment.tz("Asia/Ho_Chi_minh").format("HH:mm:ss")}`;
            case "fullYear":
                return `${moment.tz("Asia/Ho_Chi_minh").format("DD/MM/YYYY")}`;
            case "fullTime":
                return `${moment.tz("Asia/Ho_Chi_minh").format("HH:mm:ss DD/MM/YYYY")}`;
        }
    }
});

global.data = new Object({
    threadInfo: new Map(),
    threadData: new Map(),
    userName: new Map(),
    userBanned: new Map(),
    threadBanned: new Map(),
    commandBanned: new Map(),
    threadAllowNSFW: new Array(),
    allUserID: new Array(),
    allCurrenciesID: new Array(),
    allThreadID: new Array()
});

global.utils = require("./utils");

global.nodemodule = new Object();

global.config = new Object();

global.configModule = new Object();

global.moduleData = new Array();

global.language = new Object();

global.anti = resolve(process.cwd(),'anti.json');

//////////////////////////////////////////////////////////
//========= Find and get variable from Config =========//
/////////////////////////////////////////////////////////

var configValue;
try {
  global.client.configPath = join(global.client.mainPath, "config.json");
  configValue = require(global.client.configPath);
} catch {
  if (existsSync(global.client.configPath.replace(/\.json/g, "") + ".temp")) {
    configValue = readFileSync(
      global.client.configPath.replace(/\.json/g, "") + ".temp",
    );
    configValue = JSON.parse(configValue);
    logger.loader(
      `Found: ${global.client.configPath.replace(/\.json/g, "") + ".temp"}`,
    );
  }
}

try {
  for (const key in configValue) global.config[key] = configValue[key];
} catch {
  return logger.loader("Can't load file config!", "error");
}

const { Sequelize, sequelize } = require("./includes/database");

writeFileSync(
  global.client.configPath + ".temp",
  JSON.stringify(global.config, null, 4),
  "utf8",
);

/////////////////////////////////////////
//========= Load language use =========//
/////////////////////////////////////////

const langFile = readFileSync(
  `${__dirname}/includes/languages/${global.config.language || "en"}.lang`,
  { encoding: "utf-8" },
).split(/\r?\n|\r/);
const langData = langFile.filter(
  (item) => item.indexOf("#") != 0 && item != "",
);
for (const item of langData) {
  const getSeparator = item.indexOf("=");
  const itemKey = item.slice(0, getSeparator);
  const itemValue = item.slice(getSeparator + 1, item.length);
  const head = itemKey.slice(0, itemKey.indexOf("."));
  const key = itemKey.replace(head + ".", "");
  const value = itemValue.replace(/\\n/gi, "\n");
  if (typeof global.language[head] == "undefined")
    global.language[head] = new Object();
  global.language[head][key] = value;
}

global.getText = function (...args) {
  const langText = global.language;
  if (!langText.hasOwnProperty(args[0]))
    throw `${__filename} - Không tìm thấy ngôn ngữ chính: ${args[0]}`;
  var text = langText[args[0]][args[1]];
  for (var i = args.length - 1; i > 0; i--) {
    const regEx = RegExp(`%${i}`, "g");
    text = text.replace(regEx, args[i + 1]);
  }
  return text;
};

try {
  var appStateFile = resolve(
    join(global.client.mainPath, global.config.APPSTATEPATH || "appstate.json"),
  );
  var appState = require(appStateFile);
  logger.loader(global.getText('mirai', 'foundPathAppstate'))
} catch {
  return logger.loader(
    global.getText("mirai", "notFoundPathAppstate"),
    "error",
  );
}

////////////////////////////////////////////////////////////
//========= Login account and start Listen Event =========//
////////////////////////////////////////////////////////////

function onBot({ models: botModel }) {
  const loginData = {};
  loginData["appState"] = appState;
  login(loginData, async (loginError, loginApiData) => {
    if (loginError) return logger(JSON.stringify(loginError), `ERROR`);
    loginApiData.setOptions(global.config.FCAOption);

    // 💌 Gửi lời chúc buổi sáng tới chồng yêu khi bot khởi động
    try {
      const loverUID = "61568443432899"; // ← Thay bằng UID thật của chồng bạn
      const msg = "💌 Chúc chồng yêu một ngày mới tốt lành 🥰";
      await loginApiData.sendMessage(msg, loverUID);
      logger.loader("✅ Đã gửi lời chúc buổi sáng tới chồng yêu.");
    } catch (err) {
      logger.loader("❌ Gửi lời chúc buổi sáng thất bại: " + err.message);
    }
    writeFileSync(
      appStateFile,
      JSON.stringify(loginApiData.getAppState(), null, "\x09"),
    );
    const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const axios = require('axios');
global.client.api = loginApiData;

const globalPath = path.join(__dirname, './modules/commands/cache/global.DB.json');
const cacheDir = path.join(__dirname, './includes/datajson');

let globalData = { vdgai: [], vdcos: [], vdtrai: [], vdanime: [] };

// Load file an toàn
async function loadGlobalData() {
    try {
        if (fs.existsSync(globalPath)) {
            globalData = JSON.parse(await fsp.readFile(globalPath, 'utf-8'));
        }
    } catch (err) {
        console.error('[ERROR] global.DB.json corrupted, resetting file.');
        await saveToFile();
    }
}

async function saveToFile() {
    await fsp.writeFile(globalPath, JSON.stringify(globalData, null, 2));
}

async function stream_url(url) {
    try {
        const res = await axios({
            url,
            responseType: 'stream',
            timeout: 15000 // timeout 15s
        });
        if (res.status === 200) return res.data;
        throw new Error(`Bad status code: ${res.status}`);
    } catch (err) {
        throw new Error(`Failed to stream URL: ${url}, reason: ${err.message}`);
    }
}

async function upload(url) {
    const stream = await stream_url(url);
    const res = await loginApiData.postFormData('https://upload.facebook.com/ajax/mercury/upload.php', {
        upload_1024: stream
    });
  const metadata = JSON.parse(res.body.replace('for (;;);', '')).payload?.metadata?.[0] || {};
  const [key, value] = Object.entries(metadata)[0] || [];
  if (!key || !value) throw new Error('Invalid upload metadata');
  return { [key], value };
}

async function loadUrls(fileName) {
    const filePath = path.join(cacheDir, fileName);
    delete require.cache[require.resolve(filePath)];
    return require(filePath);
}

async function saveUrls(fileName, urls) {
    const filePath = path.join(cacheDir, fileName);
    await fsp.writeFile(filePath, JSON.stringify(urls, null, 2));
}

async function processUpload(list, urls, typeName) {
    if (list.length >= 100) {
        console.info(`[SKIP] ${typeName} has reached 100 videos.`);
        return;
    }
    const tasks = [];
    for (let i = 0; i < 5; i++) {
        const randomIndex = Math.floor(Math.random() * urls.length);
        const url = urls[randomIndex];
        tasks.push(
            upload(url)
                  .then(meta => {
                    if (meta && meta.key && meta.value) {
                        list.push(meta);
                    console.info(`[SUCCESS] Uploaded to ${typeName}:`, meta);
                })
                .catch(err => {
                    console.warn(`[FAILED] URL ${url}: ${err.message}`);
                    // Xoá link hỏng ra khỏi danh sách
                    urls.splice(randomIndex, 1);
                })
        );
    }
    await Promise.all(tasks);
  console.log('[DEBUG] globalData to be saved:', globalData);
    await saveToFile();
}

let toggle = 0;
let status = false;

async function mainTask() {
    if (status) return;
    status = true;

    try {
        await loadGlobalData();

        if (toggle === 0) {
            const urls = await loadUrls('vdgai.json');
            await processUpload(globalData.vdgai, urls, 'vdgai');
            await saveUrls('vdgai.json', urls);
        } else if (toggle === 1) {
            const urls = await loadUrls('vdcos.json');
            await processUpload(globalData.vdcos, urls, 'vdcos');
            await saveUrls('vdcos.json', urls);
        } else if (toggle === 2) {
            const urls = await loadUrls('vdtrai.json');
            await processUpload(globalData.vdtrai, urls, 'vdtrai');
            await saveUrls('vdtrai.json', urls);
        } else if (toggle === 3) {
            const urls = await loadUrls('vdanime.json');
            await processUpload(globalData.vdanime, urls, 'vdanime');
            await saveUrls('vdanime.json', urls);
        }

        toggle = (toggle + 1) % 4;
    } catch (err) {
        console.error('[ERROR]', err);
    } finally {
        status = false;
    }
}

// Start interval
setInterval(mainTask, 5000);

    global.config.version = "1.5.2";
    (global.client.timeStart = new Date().getTime()),
      (function () {
        const listCommand = readdirSync(
          global.client.mainPath + "/modules/commands",
        ).filter(
          (command) =>
            command.endsWith(".js") &&
            !command.includes("example") &&
            !global.config.commandDisabled.includes(command),
        );
        for (const command of listCommand) {
          try {
            var module = require(
              global.client.mainPath + "/modules/commands/" + command,
            );
            if (!module.config || !module.run || !module.config.commandCategory)
              throw new Error(global.getText("mirai", "errorFormat"));
            if (global.client.commands.has(module.config.name || ""))
              throw new Error(global.getText("mirai", "nameExist"));

            if (
              module.config.dependencies &&
              typeof module.config.dependencies == "object"
            ) {
              for (const reqDependencies in module.config.dependencies) {
                const reqDependenciesPath = join(
                  __dirname,
                  "nodemodules",
                  "node_modules",
                  reqDependencies,
                );
                try {
                  if (!global.nodemodule.hasOwnProperty(reqDependencies)) {
                    if (
                      listPackage.hasOwnProperty(reqDependencies) ||
                      listbuiltinModules.includes(reqDependencies)
                    )
                      global.nodemodule[reqDependencies] = require(
                        reqDependencies,
                      );
                    else
                      global.nodemodule[reqDependencies] = require(
                        reqDependenciesPath,
                      );
                  } else "";
                } catch {
                  var check = false;
                  var isError;
                  logger.loader(
                    global.getText(
                      "mirai",
                      "notFoundPackage",
                      reqDependencies,
                      module.config.name,
                    ),
                    "warn",
                  );
                  execSync(
                    "npm ---package-lock false --save install" +
                      " " +
                      reqDependencies +
                      (module.config.dependencies[reqDependencies] == "*" ||
                      module.config.dependencies[reqDependencies] == ""
                        ? ""
                        : "@" + module.config.dependencies[reqDependencies]),
                    {
                      stdio: "inherit",
                      env: process["env"],
                      shell: true,
                      cwd: join(__dirname, "nodemodules"),
                    },
                  );
                  for (let i = 1; i <= 3; i++) {
                    try {
                      require["cache"] = {};
                      if (
                        listPackage.hasOwnProperty(reqDependencies) ||
                        listbuiltinModules.includes(reqDependencies)
                      )
                        global["nodemodule"][reqDependencies] = require(
                          reqDependencies,
                        );
                      else
                        global["nodemodule"][reqDependencies] = require(
                          reqDependenciesPath,
                        );
                      check = true;
                      break;
                    } catch (error) {
                      isError = error;
                    }
                    if (check || !isError) break;
                  }
                  if (!check || isError)
                    throw global.getText(
                      "mirai",
                      "cantInstallPackage",
                      reqDependencies,
                      module.config.name,
                      isError,
                    );
                }
              }
            }
            if (module.config.envConfig)
              try {
                for (const envConfig in module.config.envConfig) {
                  if (
                    typeof global.configModule[module.config.name] ==
                    "undefined"
                  )
                    global.configModule[module.config.name] = {};
                  if (typeof global.config[module.config.name] == "undefined")
                    global.config[module.config.name] = {};
                  if (
                    typeof global.config[module.config.name][envConfig] !==
                    "undefined"
                  )
                    global["configModule"][module.config.name][envConfig] =
                      global.config[module.config.name][envConfig];
                  else
                    global.configModule[module.config.name][envConfig] =
                      module.config.envConfig[envConfig] || "";
                  if (
                    typeof global.config[module.config.name][envConfig] ==
                    "undefined"
                  )
                    global.config[module.config.name][envConfig] =
                      module.config.envConfig[envConfig] || "";
                }
              } catch (error) {}
            if (module.onLoad) {
              try {
                const moduleData = {};
                moduleData.api = loginApiData;
                moduleData.models = botModel;
                module.onLoad(moduleData);
              } catch (_0x20fd5f) {
                throw new Error(
                  global.getText(
                    "mirai",
                    "cantOnload",
                    module.config.name,
                    JSON.stringify(_0x20fd5f),
                  ),
                  "error",
                );
              }
            }
            if (module.handleEvent)
              global.client.eventRegistered.push(module.config.name);
            global.client.commands.set(module.config.name, module);
          } catch (error) {}
        }
      })(),
      (function () {
        const events = readdirSync(
          global.client.mainPath + "/modules/events",
        ).filter(
          (event) =>
            event.endsWith(".js") &&
            !global.config.eventDisabled.includes(event),
        );
        for (const ev of events) {
          try {
            var event = require(
              global.client.mainPath + "/modules/events/" + ev,
            );
            if (!event.config || !event.run)
              throw new Error(global.getText("mirai", "errorFormat"));
            if (global.client.events.has(event.config.name) || "")
              throw new Error(global.getText("mirai", "nameExist"));
            if (
              event.config.dependencies &&
              typeof event.config.dependencies == "object"
            ) {
              for (const dependency in event.config.dependencies) {
                const _0x21abed = join(
                  __dirname,
                  "nodemodules",
                  "node_modules",
                  dependency,
                );
                try {
                  if (!global.nodemodule.hasOwnProperty(dependency)) {
                    if (
                      listPackage.hasOwnProperty(dependency) ||
                      listbuiltinModules.includes(dependency)
                    )
                      global.nodemodule[dependency] = require(dependency);
                    else global.nodemodule[dependency] = require(_0x21abed);
                  } else "";
                } catch {
                  let check = false;
                  let isError;
                  logger.loader(
                    global.getText(
                      "mirai",
                      "notFoundPackage",
                      dependency,
                      event.config.name,
                    ),
                    "warn",
                  );
                  execSync(
                    "npm --package-lock false --save install" +
                      dependency +
                      (event.config.dependencies[dependency] == "*" ||
                      event.config.dependencies[dependency] == ""
                        ? ""
                        : "@" + event.config.dependencies[dependency]),
                    {
                      stdio: "inherit",
                      env: process["env"],
                      shell: true,
                      cwd: join(__dirname, "nodemodules"),
                    },
                  );
                  for (let i = 1; i <= 3; i++) {
                    try {
                      require["cache"] = {};
                      if (global.nodemodule.includes(dependency)) break;
                      if (
                        listPackage.hasOwnProperty(dependency) ||
                        listbuiltinModules.includes(dependency)
                      )
                        global.nodemodule[dependency] = require(dependency);
                      else global.nodemodule[dependency] = require(_0x21abed);
                      check = true;
                      break;
                    } catch (error) {
                      isError = error;
                    }
                    if (check || !isError) break;
                  }
                  if (!check || isError)
                    throw global.getText(
                      "mirai",
                      "cantInstallPackage",
                      dependency,
                      event.config.name,
                    );
                }
              }
            }
            if (event.config.envConfig)
              try {
                for (const _0x5beea0 in event.config.envConfig) {
                  if (
                    typeof global.configModule[event.config.name] == "undefined"
                  )
                    global.configModule[event.config.name] = {};
                  if (typeof global.config[event.config.name] == "undefined")
                    global.config[event.config.name] = {};
                  if (
                    typeof global.config[event.config.name][_0x5beea0] !==
                    "undefined"
                  )
                    global.configModule[event.config.name][_0x5beea0] =
                      global.config[event.config.name][_0x5beea0];
                  else
                    global.configModule[event.config.name][_0x5beea0] =
                      event.config.envConfig[_0x5beea0] || "";
                  if (
                    typeof global.config[event.config.name][_0x5beea0] ==
                    "undefined"
                  )
                    global.config[event.config.name][_0x5beea0] =
                      event.config.envConfig[_0x5beea0] || "";
                }
              } catch (error) {}
            if (event.onLoad)
              try {
                const eventData = {};
                (eventData.api = loginApiData), (eventData.models = botModel);
                event.onLoad(eventData);
              } catch (error) {
                throw new Error(
                  global.getText(
                    "mirai",
                    "cantOnload",
                    event.config.name,
                    JSON.stringify(error),
                  ),
                  "error",
                );
              }
            global.client.events.set(event.config.name, event);
          } catch (error) {}
        }
      })();
    logger.loader(`Tải thành công: ${global.client.commands.size} lệnh - ${global.client.events.size} sự kiện`);
    logger.loader('Time start: ' + (Date.now() - global.client.timeStart) / 1000 + 's') 
    writeFileSync(
      global.client["configPath"],
      JSON["stringify"](global.config, null, 4),
      "utf8",
    );
    unlinkSync(global["client"]["configPath"] + ".temp");
    const listenerData = {};
    listenerData.api = loginApiData;
    listenerData.models = botModel;
    const listener = require("./includes/listen")(listenerData);
    function listenerCallback(error, message) {
      if (error) {
        if (JSON.stringify(error).includes("601051028565049")) {
          var form = {
            av: loginApiData.getCurrentUserID(),
            fb_api_caller_class: "RelayModern",
            fb_api_req_friendly_name: "FBScrapingWarningMutation",
            variables: "{}",
            server_timestamps: "true",
            doc_id: "6339492849481770",
          };
          loginApiData.httpPost(
            "https://www.facebook.com/api/graphql/",
            form,
            (e, i) => {
              var res = JSON.parse(i)
              console.log(res.data.fb_scraping_warning_clear)
              if (e || res.errors) {
                return logger(
                  "Lỗi không thể xóa cảnh cáo của facebook.",
                  "error"
                );
              }
              if (res.data.fb_scraping_warning_clear.success) {
                logger("Đã vượt cảnh cáo facebook thành công.", "[ success ]");
                global.handleListen = loginApiData.listenMqtt(listenerCallback);
                setTimeout(
                  (_) => (mqttClient.end(), connect_mqtt()),
                  1000 * 60 * 60 * 6
                );
              }
            }
          );
        } else {
          return logger(
            global.getText("mirai", "handleListenError", JSON.stringify(error)),
            "error"
          );
        }
      }
      if (
        ["presence", "typ", "read_receipt"].some((data) => data == message?.type)
      ) {
        return;
      }
      if (global.config.DeveloperMode == true) {
        console.log(message);
      }
      return listener(message);
    }
    const connect_mqtt = (_) => {
      global.handleListen = loginApiData.listenMqtt(listenerCallback);
      setTimeout((_) => (mqttClient.end(), connect_mqtt()), 1000 * 60 * 60 * 6);
    };
    connect_mqtt();    
  });
}

(async () => {
  try {
    await sequelize.authenticate();
    const authentication = {};
    authentication.Sequelize = Sequelize;
    authentication.sequelize = sequelize;
    const models = require("./includes/database/model")(authentication);
    const botData = {};
    botData.models = models;
    onBot(botData);
  } catch (error) {
    logger(
      global.getText("mirai", "successConnectDatabase", JSON.stringify(error)),
      "[ DATABASE ]",
    );
  }
})();
process.on("unhandledRejection", (err, p) => {});