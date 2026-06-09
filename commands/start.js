import { isAdmin, isOwner } from './helpers.js';
import { allowedIds } from '../database.js';
import { VERIFICATION_GROUP_ID1, VERIFICATION_GROUP_ID2, VERIFICATION_GROUP_ID3, GROUP_LINK1, GROUP_LINK2, GROUP_LINK3 } from '../config.js';
import { isConnected } from '../whatsapp.js';
import path from 'path';
import fs from 'fs';

export default function registerStart(bot) {
  bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    let isVerified = false;
    try {
      const member1 = await bot.getChatMember(VERIFICATION_GROUP_ID1, userId);
      const member2 = await bot.getChatMember(VERIFICATION_GROUP_ID2, userId);
      const member3 = await bot.getChatMember(VERIFICATION_GROUP_ID3, userId);

      isVerified =
        [member1, member2, member3].every(
          m => m && ['member', 'administrator', 'creator'].includes(m.status)
        );
    } catch (err) {
      console.error('Verifikasi check error:', err);
      isVerified = false;
    }

    if (!isVerified) {
      const photoPath = path.resolve('./assets/logo.png');
      const photoStream = fs.existsSync(photoPath) ? fs.createReadStream(photoPath) : null;

      return bot.sendPhoto(chatId, photoStream, {
        caption:
          `🚀 CUAN TEAM TOOLS\n\n` +
          `🔐 Kamu belum terverifikasi!\n` +
          `Klik tombol di bawah untuk join semua grup dan verifikasi.`,
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

    // Dashboard user/admin/owner
    const text = `
╔══════════════════════════════╗
║      🚀 CUAN TEAM TOOLS       ║
╚══════════════════════════════╝

👤 USER DASHBOARD
━━━━━━━━━━━━━━━━━━━━━━

🧑 Nama Pengguna : @${msg.from.username || msg.from.first_name}
🏷 Status        : ${isOwner(userId) ? 'OWNER' : isAdmin(userId) ? 'ADMIN' : 'USER'}
📡 Connection    : ${isConnected() ? '🟢 ONLINE' : '🔴 OFFLINE'}

━━━━━━━━━━━━━━━━━━━━━━

⚡ Intelligence System Active
Silakan pilih menu di bawah
`;

    const keyboard = [
      [
        { text: '🔍 CEK BIO', callback_data: 'menu_cekbio' },
        { text: '📂 CEK FILE', callback_data: 'menu_cekbiofile' }
      ],
      [
        { text: '📱 CEK NOMOR', callback_data: 'menu_ceknomor' },
        { text: '📡 CEK RANGE', callback_data: 'menu_cekrange' }
      ],
      [
        { text: '💎 CEK REPE', callback_data: 'menu_cekrepe' },
        { text: '📨 BANDING', callback_data: 'menu_banding' }
      ],
      [
        { text: '🛠 FIX', callback_data: 'menu_fix' }
      ]
    ];

    // Tombol tambahan untuk Admin/Owner
    if (isAdmin(userId) || isOwner(userId)) {
      keyboard.push([
        { text: '➕ ADD KACUNG', callback_data: 'menu_addkacung' },
        { text: '📋 LIST KACUNG', callback_data: 'menu_listkacung' }
      ]);
      keyboard.push([
        { text: '⚡ ADD KACUNG ALL', callback_data: 'menu_addkacungall' }
      ]);
      keyboard.push([
        { text: '📧 ADD GMAIL', callback_data: 'menu_addgmail' },
        { text: '🎁 ADD LIMIT', callback_data: 'menu_addlimit' }
      ]);
      keyboard.push([
        { text: '👑 ADD ADMIN', callback_data: 'menu_addadmin' },
        { text: '🔗 GET PAIRING', callback_data: 'menu_getpairing' }
      ]);
      keyboard.push([
        { text: '📱 GET QR LOGIN', callback_data: 'menu_getqr' },
        { text: '💾 BACKUP DATABASE', callback_data: 'menu_backup' }
      ]);
    }

    await bot.sendMessage(chatId, text, {
      parse_mode: 'HTML',
      reply_markup: { inline_keyboard: keyboard }
    });
  });
}