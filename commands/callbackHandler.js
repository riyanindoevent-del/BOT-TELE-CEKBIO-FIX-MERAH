import { allowedIds, saveAllowed } from '../database.js';
import { VERIFICATION_GROUP_ID1, VERIFICATION_GROUP_ID2, VERIFICATION_GROUP_ID3, GROUP_LINK1, GROUP_LINK2, GROUP_LINK3 } from '../config.js';
import path from 'path';
import { isAdmin, isOwner } from './helpers.js';
import { isConnected } from '../whatsapp.js';
import fs from 'fs';

export default function registerCallbackHandler(bot) {
  bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    const userId = query.from.id;
    const data = query.data;

    await bot.answerCallbackQuery(query.id);

    try {
      if (data === 'check_verification') {
        let members = [];
        try {
          const m1 = await bot.getChatMember(VERIFICATION_GROUP_ID1, userId);
          const m2 = await bot.getChatMember(VERIFICATION_GROUP_ID2, userId);
          const m3 = await bot.getChatMember(VERIFICATION_GROUP_ID3, userId);
          members = [m1, m2, m3];
        } catch (err) {
          console.error('getChatMember error:', err);
          return bot.sendMessage(chatId, '❌ Bot belum bisa cek grup. Pastikan bot jadi ADMIN.');
        }

        const isMember = members.every(m => m && ['member','administrator','creator'].includes(m.status));

        if (!isMember) {
          const photoPath = path.resolve('./assets/logo.png');
          const photoStream = fs.existsSync(photoPath) ? fs.createReadStream(photoPath) : null;
          return bot.sendPhoto(chatId, photoStream, {
            caption: '🔐 Kamu belum terverifikasi, join semua grup di bawah!',
            reply_markup: {
              inline_keyboard: [
                [{ text: '📢 Channel Cuan Team', url: GROUP_LINK1 }],
                [{ text: '📢 Report OTP & Fix Cuan Team', url: GROUP_LINK2 }],
                [{ text: '📢 Free Number Gacha Ivas Cuan Team', url: GROUP_LINK3 }],
                [{ text: '✅ VERIFIKASI SEKARANG', callback_data: 'check_verification' }]
              ]
            }
          });
        }

        if (!allowedIds.includes(userId)) {
          allowedIds.push(userId);
          saveAllowed();
          await bot.sendMessage(chatId, '✅ BERHASIL VERIFIKASI - CUAN TEAM TOOLS');
        } else {
          await bot.sendMessage(chatId, 'ℹ️ Kamu sudah terverifikasi sebelumnya.');
        }
        return;
      }

      // Callback menu lama tetap sama
      const menus = {
        menu_cekbio: `🔍 CEK BIO\n\nContoh:\n/cekbio 6281234567890`,
        menu_cekbiofile: `📂 CEK BIO FILE\n\nKirim file TXT lalu gunakan:\n/cekbiofile`,
        menu_ceknomor: `📱 CEK NOMOR TERDAFTAR\n\nContoh:\n/ceknomorterdaftar 6281234567890`,
        menu_cekrange: `📡 CEK RANGE\n\nContoh:\n/cekrange 62812xxxxxxx`,
        menu_cekrepe: `💎 CEK REPE\n\nContoh:\n/cekrepe 6281234567890`,
        menu_banding: `📨 BANDING WA\n\nContoh:\n/banding 6281234567890`,
        menu_fix: `🛠 FIX WA\n\nContoh:\n/fix 6281234567890`,

        // Hanya untuk Admin & Owner
        menu_addkacung: '➕ ADD KACUNG\n\nContoh:\n/addkacung 123456789',
        menu_addkacungall: '⚡ ADD KACUNG ALL\n\nContoh:\n/addkacungall 123456789 987654321',
        menu_listkacung: '📋 LIST KACUNG\n\nContoh:\n/listkacungid',
        menu_addgmail: '📧 ADD GMAIL\n\nContoh:\n/addgmail email@gmail.com | apppassword',
        menu_addlimit: '🎁 ADD LIMIT\n\nContoh:\n/addlimit 123456789 100',
        menu_addadmin: '👑 ADD ADMIN\n\nContoh:\n/addadmin 123456789',
        menu_getpairing: '🔗 GET PAIRING\n\nContoh:\n/getpairing',
        menu_getqr: '📱 GET QR LOGIN\n\nContoh:\n/getqr',
        menu_backup: '💾 BACKUP DATABASE\n\nContoh:\n/backup'
      };

      if (menus[data]) {
        await bot.sendMessage(chatId, menus[data]);
      }

    } catch (error) {
      console.error('Callback Error:', error);
      await bot.sendMessage(chatId, '❌ Terjadi kesalahan saat memproses menu.');
    }
  });
}