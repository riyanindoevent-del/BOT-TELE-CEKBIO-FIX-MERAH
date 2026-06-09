import { isAllowed, isAdmin } from './helpers.js';
import { getUserBandingLimit, decreaseUserBandingLimit } from '../database.js';
import { getRandomName, getRandomAppealMessage, getVerificationPercentage } from '../functions.js';
import { WHATSAPP_EMAIL } from '../config.js';

export default function registerBanding(bot) {
  bot.onText(/\/banding/, async (msg) => {
    const chatId = msg.chat.id,
      userId = msg.from.id;

    if (!isAllowed(userId)) return bot.sendMessage(chatId, '❌ Belum terverifikasi.');

    // Cek limit banding (hanya untuk non‑admin)
    if (!isAdmin(userId)) {
      const userData = getUserBandingLimit(userId);
      if (userData.banding_limit <= 0) {
        return bot.sendMessage(
          chatId,
          `❌ <b>Limit banding habis!</b>\nHubungi owner untuk pembelian limit.`,
          { parse_mode: 'HTML' }
        );
      }
    }

    const args = msg.text.replace('/banding', '').trim().split(/\s+/);
    if (!args[0]) return bot.sendMessage(chatId, '❌ Format: /banding <nomor>');

    let number = args[0].replace(/[^0-9+]/g, '');
    if (number.startsWith('0')) number = '62' + number.substring(1);
    else if (number.startsWith('8')) number = '62' + number;
    if (number.length < 10 || number.length > 15)
      return bot.sendMessage(chatId, '❌ Nomor tidak valid.');

    // Proses banding
    const name = getRandomName();
    const appeal = getRandomAppealMessage(name, number);
    const percent = getVerificationPercentage(number);

    // Kurangi limit untuk non‑admin
    if (!isAdmin(userId)) {
      decreaseUserBandingLimit(userId);
    }

    const sisa = isAdmin(userId) ? '∞' : getUserBandingLimit(userId).banding_limit;
    const text =
      `<b>Hasil Banding</b>\n` +
      `📱 Nomor: +${number}\n` +
      `👤 Nama: ${name}\n` +
      `📊 Verifikasi: ${percent}%\n\n` +
      `📝 <b>Pesan:</b>\n${appeal}\n\n` +
      `📧 Email: ${WHATSAPP_EMAIL}\n` +
      `🔢 Sisa Limit Banding: ${sisa}x`;

    await bot.sendMessage(chatId, text, { parse_mode: 'HTML' });
  });
}