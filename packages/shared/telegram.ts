export const sendMessage = async (
  botToken: string,
  chatId: string,
  message: string,
) => {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage?chat_id=${chatId}&text=${encodeURIComponent(message)}`;
  await fetch(url);
};
