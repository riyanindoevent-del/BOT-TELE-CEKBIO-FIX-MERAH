import { isAdmin } from './helpers.js';
import { allowedIds, saveAllowed, loadData } from '../database.js';

  [
  { text:'📧 ADD GMAIL', callback_data:'menu_addgmail' },
  { text:'🎁 ADD LIMIT', callback_data:'menu_addlimit' }
]

export default function registerAdminCommands(bot) {
  bot.onText(/\/addkacung/, async (msg) => {
    const chatId = msg.chat.id;
    if (!isAdmin(msg.from.id)) return bot.sendMessage(chatId, '❌ Hanya admin.');
    const args = msg.text.split(' ').slice(1);
    if (!args.length) return bot.sendMessage(chatId, '❌ Format: /addkacung <id>');
    const id = parseInt(args[0]);
    if (!allowedIds.includes(id)) { allowedIds.push(id); saveAllowed(); bot.sendMessage(chatId, `✅ ID ${id} ditambahkan.`); }
    else bot.sendMessage(chatId, `ℹ️ Sudah ada.`);
  });

  bot.onText(/\/addkacungall/, async (msg) => {
    const chatId = msg.chat.id;
    if (!isAdmin(msg.from.id)) return bot.sendMessage(chatId, '❌ Hanya admin.');
    const ids = msg.text.replace('/addkacungall','').trim().split(/[\s,\n]+/).filter(n=>n).map(Number).filter(n=>!isNaN(n));
    if (!ids.length) return bot.sendMessage(chatId, '❌ Format: /addkacungall <id1> <id2> ...');
    let added = 0;
    ids.forEach(id => {
      if (!allowedIds.includes(id)) { allowedIds.push(id); added++; }
    });
    saveAllowed();
    bot.sendMessage(chatId, `✅ ${added} ID ditambahkan.`);
  });

  bot.onText(/\/listkacungid/, async (msg) => {
    const chatId = msg.chat.id;
    if (!isAdmin(msg.from.id)) return bot.sendMessage(chatId, '❌ Hanya admin.');
    loadData();
    if (!allowedIds.length) return bot.sendMessage(chatId, '📋 Tidak ada ID.');
    const text = `<b>Daftar ID Diizinkan</b>\n\n${allowedIds.map((id,i)=>`${i+1}. ${id}`).join('\n')}`;
    await bot.sendMessage(chatId, text, {parse_mode:'HTML'});
  });
}
