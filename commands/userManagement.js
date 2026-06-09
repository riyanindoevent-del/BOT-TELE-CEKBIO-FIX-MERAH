import { isOwner } from './helpers.js';
import { readDb, writeDb, getUser, saveUser } from '../database.js';
import { PREMIUM_FILE } from '../config.js';

export default function registerUserManagement(bot) {
  bot.onText(/\/addpremium/, async (msg) => {
    const chatId = msg.chat.id;
    if (!isOwner(msg.from.id)) return bot.sendMessage(chatId, '❌ Hanya owner.');
    const args = msg.text.split(' ').slice(1);
    if (args.length === 0) return bot.sendMessage(chatId, '❌ Format: /addpremium <id>');
    const targetId = parseInt(args[0]);
    const premiumUsers = readDb(PREMIUM_FILE);
    if (premiumUsers.includes(targetId)) return bot.sendMessage(chatId, `ℹ️ ID ${targetId} sudah premium.`);
    premiumUsers.push(targetId);
    writeDb(PREMIUM_FILE, premiumUsers);
    const user = getUser(targetId);
    user.status = 'premium';
    saveUser(user);
    await bot.sendMessage(chatId, `✅ ID ${targetId} menjadi premium.`);
  });

  bot.onText(/\/userinfo/, async (msg) => {
    const chatId = msg.chat.id;
    if (!isOwner(msg.from.id)) return bot.sendMessage(chatId, '❌ Hanya owner.');
    const args = msg.text.split(' ').slice(1);
    if (args.length === 0) return bot.sendMessage(chatId, '❌ Format: /userinfo <id>');
    const targetId = parseInt(args[0]);
    const user = getUser(targetId);
    const info = `👤 Detail User ID ${targetId}\nUsername: @${user.username}\nStatus: ${user.status}\nBanned: ${user.is_banned ? 'YA' : 'TIDAK'}\nLimit /fix: ${user.fix_limit}\nPoin Referral: ${user.referral_points}\nTerakhir /fix: ${user.last_fix ? new Date(user.last_fix).toLocaleString('id-ID') : 'Belum pernah'}`;
    await bot.sendMessage(chatId, info);
  });
}