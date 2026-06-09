import { isAllowed, isOwner } from './helpers.js';
import {
  getUserFixLimit, decreaseUserFixLimit, saveHistory,
  getRandomGmail, sendEmailViaApi
} from '../database.js';
import { NOTIFICATION_CHANNEL_ID } from '../config.js';

const TEMPLATE = {
  to: 'android@support.whatsapp.com',
  subject: 'Question support Android',
  text: `Құрметті WhatsApp.\nЖеке нөмірімді тіркеу кезінде мәселе туындады, қызыл суреті бар хабарлама болды "Login not available" ол кезде менің жеке номерім болатын.\nWhatsApp бұл мәселені тез қарап, дұрыс тіркеле аламын деп үміттенемін.\nменің жеке нөмірім +{nomor} \nМұның бәрі меннен [repz] алғыс айту.`
};

function detectCountry(num) {
  const c = num.replace('+', '');
  if (c.startsWith('62')) return '🇮🇩 Indonesia';
  if (c.startsWith('60')) return '🇲🇾 Malaysia';
  if (c.startsWith('1')) return '🇺🇸 USA/Canada';
  if (c.startsWith('44')) return '🇬🇧 UK';
  if (c.startsWith('91')) return '🇮🇳 India';
  if (c.startsWith('81')) return '🇯🇵 Japan';
  return '🌍 Unknown';
}

export default function registerFix(bot) {
  bot.onText(/\/fix/, async (msg) => {
    const chatId = msg.chat.id,
      userId = msg.from.id;
    const username = msg.from.username || msg.from.first_name || 'Unknown';

    if (!isAllowed(userId)) return bot.sendMessage(chatId, '❌ Belum terverifikasi!');

    const args = msg.text.replace('/fix', '').trim().split(/\s+/);
    if (!args[0]) return bot.sendMessage(chatId, '❌ Format: /fix <nomor>');

    let number = args[0].replace(/[^0-9+]/g, '');
    if (number.startsWith('0')) number = '62' + number.substring(1);
    else if (number.startsWith('8')) number = '62' + number;
    if (number.length < 10 || number.length > 15)
      return bot.sendMessage(chatId, '❌ Nomor tidak valid.');

    // Cek limit (kecuali owner)
    if (!isOwner(userId)) {
      const userData = getUserFixLimit(userId);
      if (userData.fix_limit <= 0) {
        return bot.sendMessage(
          chatId,
          `❌ <b>Limit fix habis!</b>\nHubungi owner untuk pembelian limit.`,
          { parse_mode: 'HTML' }
        );
      }
    }

    const gmail = getRandomGmail();
    if (!gmail) return bot.sendMessage(chatId, '❌ Tidak ada Gmail terdaftar.');

    try {
      const body = TEMPLATE.text.replace(/{nomor}/g, number);
      const apiRes = await sendEmailViaApi({
        to: TEMPLATE.to,
        subject: TEMPLATE.subject,
        text: body,
        gmailUser: gmail.email,
        gmailAppPassword: gmail.appPassword
      });

      // Kurangi limit untuk user biasa
      if (!isOwner(userId)) decreaseUserFixLimit(userId);

      saveHistory({
        user_id: userId,
        username,
        command: `/fix ${number}`,
        number_fixed: number,
        email_used: gmail.email,
        details: `messageId: ${apiRes.messageId}`
      });

      const country = detectCountry(number);
      const now = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
      const sisa = isOwner(userId) ? '∞' : getUserFixLimit(userId).fix_limit;

      // Notifikasi channel
      const channelMsg =
        `<b>📨 Fix WhatsApp</b>\n\n` +
        `👤 @${username}\n` +
        `🆔 ${userId}\n` +
        `📱 +${number}\n` +
        `🌍 ${country}\n` +
        `📧 ${gmail.email}\n` +
        `🕒 ${now}\n` +
        `🔢 Sisa Limit: ${sisa}x`;

      try {
        await bot.sendMessage(NOTIFICATION_CHANNEL_ID, channelMsg, { parse_mode: 'HTML' });
      } catch (e) {
        console.error('Gagal kirim notifikasi channel:', e);
      }

      // Balas user
      const userMsg = `✅ Banding <b>${number}</b> berhasil!\n📧 ${gmail.email}\n🔢 Sisa limit: ${sisa}x`;
      await bot.sendMessage(chatId, userMsg, { parse_mode: 'HTML' });
    } catch (error) {
      console.error(error);
      bot.sendMessage(chatId, `❌ Gagal: ${error.message}`);
    }
  });
}