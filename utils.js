import * as axios from 'axios'

export 

export const getFileUrl = async (fileId) => {
  const { data } = await axios.get(`https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${fileId}`);
  return data.result.file_path;
};

export const getFileDownloadUrl = (filePath) => `https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`;
