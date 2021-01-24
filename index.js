require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const axios = require("axios");
const {
  readdir,
  readFile,
  writeFile,
  existsSync,
  mkdirSync,
} = require("fs-extra");
const path = require("path");
const photo = require("./photo");
const chat = require("./chat");
const db = require("./db");
const dist = require("sharp-phash/distance");

// Initialize bot
const { BOT_TOKEN } = process.env;
const { Telegraf } = require("telegraf");
const bot = new Telegraf(BOT_TOKEN);
bot.launch();

try {
  bot.on("message", async (ctx) => {
    const { message: msg, telegram } = ctx;
    if (!msg.photo) return;
    try {
      // Get chat info
      const chatId = chat.getChatId(msg.chat.id);
      const messageLink = chat.getMessageLink(chatId, msg.message_id);

      // Extract image download link from message
      const filePath = await photo.getFileUrl(msg.photo[0].file_id);
      const fileDownloadUrl = photo.getFileDownloadUrl(filePath);

      // get image phash
      const phash = await photo.getImagePHash(fileDownloadUrl);

      // Create image history if new chat

      if (!db.has(chatId).value()) {
        db.set(chatId, [{ messageLink, phash, senderId: msg.from.id, date: Date.now() }]).write();
        return;
      }

      const phashHistory = db.get(chatId).value();

      const oldPics = [];

      for (img of phashHistory) {
        if (((await dist(img.phash, phash)) <= 5) && img.sender !== msg.from.id) oldPics.push(img.messageLink);
      }

      db.get(chatId).push({ messageLink, phash, senderId: msg.from.id, date: Date.now() }).write();

      if (!oldPics.length) return;

      const __username = msg.from.username
        ? `@${msg.from.username}`
        : msg.from.first_name;
      telegram.sendMessage(
        msg.chat.id,
        `[${__username}](tg://user?id=${
          msg.from.id
        }) заебал, уже было:\n${photo.printOldPhotos(oldPics)}`,
        { reply_to_msg_id: msg.message_id, parse_mode: "Markdown" }
      );
    } catch (e) {
      console.log("Error in photo handling: ", e);
    }
  });
} catch (e) {
  console.error("Error in bot event: ", e);
}
