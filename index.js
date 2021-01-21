require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const {
  readdir, readFile, writeFile, existsSync, mkdirSync, createWriteStream,
} = require('fs-extra');
const path = require('path');
const compareImages = require('resemblejs/compareImages');

// Initialize bot connection
const { BOT_TOKEN } = process.env;
const telegram = new TelegramBot(BOT_TOKEN, { polling: true });
if (!existsSync(path.join(__dirname, 'pics'))) {
  mkdirSync(path.join(__dirname, 'pics'));
}

telegram.on('message', async (msg) => {
  if (!msg.photo) return;
  try {
    const chatId = (msg.chat.id).toString().substring(4);
    const messageLink = `https://t.me/c/${chatId}/${Number(msg.message_id).toString()}`;
    const directoryPath = path.join(__dirname, `pics/${chatId}`);

    const filePath = await getFileUrl(msg.photo[0].file_id);
    const fileDownloadUrl = getFileDownloadUrl(filePath);

    const image = await downloadFile(fileDownloadUrl, directoryPath);

    const files = await readdir(directoryPath);

    if (!existsSync(path.resolve(directoryPath, 'imgHistory.json'))) {
      await writeFile(
        path.resolve(directoryPath, 'imgHistory.json'),
        JSON.stringify([{ messageLink, image, date: Date.now() }], null, 2),
      );
    }

    const imgHistory = require(path.join(directoryPath, 'imgHistory.json'));
    imgHistory.push({ messageLink, image, date: Date.now() });
    await writeFile(path.resolve(directoryPath, 'imgHistory.json'), JSON.stringify(imgHistory, null, 2));
    const bayans = [];
    for (file of files) {
      if (path.extname(file) !== '.jpg') continue;
      const diff = await getDiff(path.resolve(directoryPath, image), path.resolve(directoryPath, file));
      // console.log('----- \n', 'mismatch: ', diff, '\n', 'bayan:  ', image, '\n', 'imageToCompare: ', file)
      if (+diff < 5) {
        bayans.push(file);
      }
    }
    const bayansHistory = imgHistory
      .filter((i) => bayans.includes(i.image))
      .filter((j) => +j.messageLink.split('/').pop() !== msg.message_id);
    if (bayansHistory.length) {
      telegram.sendMessage(msg.chat.id, `@${msg.from.username} Ты шо лох? Уже кидали: \n${printBayans(bayansHistory)}`);
    }
  } catch (e) {
    console.log('jopa oshibka', e);
  }
});

// const getChatId = (chatId) => chatId.startsWith('-') ? chatId.substring(4) : chatId.substring(3);

const getFileUrl = async (fileId) => {
  const { data } = await axios.get(`https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${fileId}`);
  return data.result.file_path;
};

const getFileDownloadUrl = (filePath) => `https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`;

const downloadFile = async (fileUrl, directoryPath) => {
  const fileName = path.basename(fileUrl);
  if (await !existsSync(directoryPath)) {
    await mkdirSync(directoryPath);
  }
  const localFilePath = path.resolve(directoryPath, fileName);
  try {
    const response = await axios({
      method: 'GET',
      url: fileUrl,
      responseType: 'stream',
    });

    const download = createWriteStream(localFilePath);

    await new Promise((resolve, reject) => {
      response.data.pipe(download);
      download.on('close', resolve);
      download.on('error', console.error);
    });
    return fileName;
  } catch (err) {
    throw new Error(err);
  }
};

async function getDiff(file1, file2) {
  const options = {
    output: {
      errorColor: {
        red: 255,
        green: 0,
        blue: 255,
      },
      errorType: 'movement',
      transparency: 0.3,
      largeImageThreshold: 1200,
      useCrossOrigin: false,
      outputDiff: true,
    },
    scaleToSameSize: true,
    ignore: 'antialiasing',
  };

  const data = await compareImages(await readFile(file1), await readFile(file2), options);
  return data.misMatchPercentage;
}

const printBayans = (bayans) => {
  let str = '';
  bayans.forEach((i) => {
    str += `${i.messageLink}\n`;
  });
  return str;
};
