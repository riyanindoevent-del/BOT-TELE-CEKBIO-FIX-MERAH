import bot from './bot.js';
import { initAllDb, loadData, allowedIds, saveAllowed, adminIds } from './database.js';
import { startWhatsApp } from './whatsapp.js';
import { OWNER_ID, VERIFICATION_GROUP_ID1, VERIFICATION_GROUP_ID2, VERIFICATION_GROUP_ID3 } from './config.js';

import registerStart from './commands/start.js';
import registerCekbio from './commands/cekbio.js';
import registerCekbiofile from './commands/cekbiofile.js';
import registerCeknomorterdaftar from './commands/ceknomorterdaftar.js';
import registerCekrange from './commands/cekrange.js';
import registerBanding from './commands/banding.js';
import registerCekrepe from './commands/cekrepe.js';
import registerFix from './commands/fix.js';
import registerMtManagement from './commands/mtManagement.js';
import registerUserManagement from './commands/userManagement.js';
import registerAdminCommands from './commands/admin.js';
import registerOwnerCommands from './commands/owner.js';
import registerCallbackHandler from './commands/callbackHandler.js';

// fungsi isAdmin untuk auto-verification
function isAdmin(uid) {
  return uid === OWNER_ID || adminIds.includes(uid);
}

bot.on('new_chat_members', async (msg) => {
  if (msg.chat.id === VERIFICATION_GROUP_ID1, VERIFICATION_GROUP_ID2, VERIFICATION_GROUP_ID3) {
    for (const mem of msg.new_chat_members) {
      if (!allowedIds.includes(mem.id) && !isAdmin(mem.id)) {
        allowedIds.push(mem.id);
        saveAllowed();
        try {
          await bot.sendMessage(msg.chat.id, `Selamat datang @${mem.username || mem.first_name}! 🎉 Kamu terverifikasi.`);
        } catch (e) {}
      }
    }
  }
});

async function startAll() {
  console.log('🚀 Starting...');
  initAllDb();
  loadData();
  startWhatsApp(bot);

  registerStart(bot);
  registerCekbio(bot);
  registerCekbiofile(bot);
  registerCeknomorterdaftar(bot);
  registerCekrange(bot);
  registerBanding(bot);
  registerCekrepe(bot);
  registerFix(bot);
  registerMtManagement(bot);
  registerUserManagement(bot);
  registerAdminCommands(bot);
  registerOwnerCommands(bot);
  registerCallbackHandler(bot);

  console.log('✅ Bot siap');
  try {
    await bot.sendMessage(OWNER_ID, `<b>🤖 BOT ACTIVE ✅</b>\n📅 ${new Date().toLocaleString('id-ID')}`, { parse_mode: 'HTML' });
  } catch (e) {}
}

process.once('SIGINT', () => { bot.stopPolling(); process.exit(0); });
process.once('SIGTERM', () => { bot.stopPolling(); process.exit(0); });

startAll();