import { Telegraf } from 'telegraf';

let bot: Telegraf | null = null;

export function initTelegramBot(token: string) {
  if (!token) return;
  
  if (bot) {
    try {
      // @ts-ignore
      bot.stop();
    } catch (e) {}
  }

  bot = new Telegraf(token);

  bot.start((ctx) => ctx.reply('Bem-vindo ao AFILIAUTO PRO!'));
  
  bot.launch();
  console.log('Telegram Bot initialized');
}

export async function postToTelegram(chatId: string, copy: string, imageUrl?: string) {
  if (!bot) return;
  try {
    if (imageUrl && imageUrl.startsWith('http')) {
      await bot.telegram.sendPhoto(chatId, imageUrl, { caption: copy });
    } else {
      await bot.telegram.sendMessage(chatId, copy);
    }
  } catch (error) {
    console.error('Error posting to Telegram:', error);
  }
}
