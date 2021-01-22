const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const phash = require("sharp-phash");
require('dotenv').config();

const { BOT_TOKEN } = process.env;

const getFileUrl = async (fileId) => {
  const { data } = await axios.get(`https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${fileId}`);
  return data.result.file_path;
};
const getFileDownloadUrl = (filePath) => `https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`;

const getImagePHash = async (fileUrl) => {
  try {
    const response = await axios({
      method: 'GET',
      url: fileUrl,
      responseType: 'arraybuffer',
    });

    return phash(response.data)
  } catch(e) {
    console.error(e)
  }
}

const printOldPhotos = (oldPhotos) => {
  let str = '';
  oldPhotos.forEach((i) => {
    str += `${i}\n`;
  });
  return str;
};

module.exports = {
  getFileUrl,
  getFileDownloadUrl,
  printOldPhotos,
  getImagePHash
};
