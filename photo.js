const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const compareImages = require('resemblejs/compareImages');
require('dotenv').config();

const { BOT_TOKEN } = process.env;

const getFileUrl = async (fileId) => {
  const { data } = await axios.get(`https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${fileId}`);
  return data.result.file_path;
};
const getFileDownloadUrl = (filePath) => `https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`;
const downloadFile = async (fileUrl, directoryPath) => {
  const fileName = path.basename(fileUrl);
  if (!fs.existsSync(directoryPath)) {
    fs.mkdirSync(directoryPath);
  }
  const localFilePath = path.resolve(directoryPath, fileName);
  try {
    const response = await axios({
      method: 'GET',
      url: fileUrl,
      responseType: 'stream',
    });

    const download = fs.createWriteStream(localFilePath);

    await new Promise((resolve) => {
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

  const data = await compareImages(await fs.readFile(file1), await fs.readFile(file2), options);
  return data.misMatchPercentage;
}
const printOldPhotos = (oldPhotos) => {
  let str = '';
  oldPhotos.forEach((i) => {
    str += `${i.messageLink}\n`;
  });
  return str;
};

module.exports = {
  getFileUrl,
  getFileDownloadUrl,
  downloadFile,
  getDiff,
  printOldPhotos,
};
