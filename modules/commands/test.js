module.exports = class {
    static get config() {
        return class {
            static name = "test";
            static commandCategory = "Admin";
            // what the heck
        }
    }

    static get run() {
        return async function({ api, event }) {
            api.sendMessage("Hello, World!",
                event.threadID, event.messageID);
        }
    }
}
