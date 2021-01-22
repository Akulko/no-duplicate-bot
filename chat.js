const getChatId = (chatId) => chatId.toString().substring(4);
const getMessageLink = (chatId, messageId) => `https://t.me/c/${chatId}/${messageId}`;

module.exports = {
  getChatId,
  getMessageLink,
};