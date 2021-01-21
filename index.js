require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const {
  readdir, readFile, writeFile, existsSync, mkdirSync,
} = require('fs-extra');
const path = require('path');
const photo = require('./photo');
const chat = require('./chat');

// Initialize bot
const { BOT_TOKEN } = process.env;
const telegram = new TelegramBot(BOT_TOKEN, { polling: true });
if (!existsSync(path.join(__dirname, 'pics'))) {
  mkdirSync(path.join(__dirname, 'pics'));
}

telegram.on('message', async (msg) => {
  if (!msg.photo) return;
  try {
    // Get chat info
    const chatId = chat.getChatId(msg.chat.id);
    const messageLink = chat.getMessageLink(chatId, msg.message_id);
    const directoryPath = path.join(__dirname, `pics/${chatId}`);

    // Extract image download link from message
    const filePath = await photo.getFileUrl(msg.photo[0].file_id);
    const fileDownloadUrl = photo.getFileDownloadUrl(filePath);

    // Download image and get old photos list
    const image = await photo.downloadFile(fileDownloadUrl, directoryPath);
    const filesList = await readdir(directoryPath);

    // Create image history if new chat
    if (!existsSync(path.resolve(directoryPath, 'imgHistory.json'))) {
      await writeFile(
        path.resolve(directoryPath, 'imgHistory.json'),
        JSON.stringify([{ messageLink, image, date: Date.now() }], null, 2),
      );
    }

    // Write current photo in image history
    const imgHistory = require(path.join(directoryPath, 'imgHistory.json'));
    imgHistory.push({ messageLink, image, date: Date.now() });
    await writeFile(path.resolve(directoryPath, 'imgHistory.json'), JSON.stringify(imgHistory, null, 2));

    // Compare the current photo with existing ones in the chat
    const oldPhotos = [];
    for (file of filesList) {
      if (path.extname(file) === '.json') continue;
      const diff = await photo.getDiff(path.resolve(directoryPath, image), path.resolve(directoryPath, file));
      // console.log('----- \n', 'mismatch: ', diff, '\n', 'bayan:  ', image, '\n', 'imageToCompare: ', file)
      if (+diff < 5) {
        oldPhotos.push(file);
      }
    }

    // Reply to the duplicator if there is a match
    const oldPhotosHistory = imgHistory
      .filter((i) => oldPhotos.includes(i.image))
      .filter((j) => +j.messageLink.split('/').pop() !== msg.message_id);
    if (oldPhotosHistory.length) {
      telegram.sendMessage(msg.chat.id, `@${msg.from.username} Ты шо лох? Уже кидали: \n${photo.printOldPhotos(oldPhotosHistory)}`, { reply_to_msg_id: msg.message_id });
    }
  } catch (e) {
    console.log('Error in photo handling: ', e);
  }
});
