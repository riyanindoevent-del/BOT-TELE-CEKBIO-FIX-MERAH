import { isOwner } from './helpers.js';
import { readDb, writeDb, getMtTexts, getMtTextById } from '../database.js';
import { MT_FILE, SETTINGS_DB } from '../config.js';

export default function registerMtManagement(bot) {
  bot.onText(/\/setmt/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    if (!isOwner(userId)) return bot.sendMessage(chatId, '❌ Hanya owner.');
    const parts = msg.text.replace('/setmt', '').trim().split('|').map(p => p.trim());
    if (parts.length < 3) return bot.sendMessage(chatId, '❌ Format: /setmt <email> | <subjek> | <isi> (pakai {nomor} placeholder)');
    const [to_email, subject, body] = parts;
    if (!body.includes('{nomor}')) return bot.sendMessage(chatId, '❌ Isi wajib mengandung `{nomor}`.');
    const mtTexts = getMtTexts();
    const newId = mtTexts.length > 0 ? mtTexts[mtTexts.length - 1].id + 1 : 1;
    mtTexts.push({ id: newId, to_email, subject, body });
    writeDb(MT_FILE, mtTexts);
    await bot.sendMessage(chatId, `✅ MT ID ${newId} ditambahkan.\nSubjek: ${subject}\nEmail: ${to_email}`);
  });

  bot.onText(/\/setactivemt/, async (msg) => {
    const chatId = msg.chat.id;
    if (!isOwner(msg.from.id)) return bot.sendMessage(chatId, '❌ Hanya owner.');
    const args = msg.text.split(' ').slice(1);
    if (args.length === 0) return bot.sendMessage(chatId, '❌ Format: /setactivemt <id>');
    const id = parseInt(args[0]);
    const mt = getMtTextById(id);
    if (!mt) return bot.sendMessage(chatId, `❌ MT ID ${id} tidak ditemukan.`);
    const settings = readDb(SETTINGS_DB);
    settings.active_mt_id = id;
    writeDb(SETTINGS_DB, settings);
    await bot.sendMessage(chatId, `✅ Template banding aktif diset ke ID ${id} (${mt.subject})`);
  });

  bot.onText(/\/listmt/, async (msg) => {
    const chatId = msg.chat.id;
    if (!isOwner(msg.from.id)) return bot.sendMessage(chatId, '❌ Hanya owner.');
    const mtTexts = getMtTexts();
    const settings = readDb(SETTINGS_DB);
    const activeId = settings.active_mt_id;
    if (mtTexts.length === 0) return bot.sendMessage(chatId, '📋 Tidak ada template.');
    let text = `📋 Daftar Template Banding:\n\n`;
    mtTexts.forEach(mt => {
      text += `ID: ${mt.id} ${mt.id === activeId ? '✅' : ''}\nSubjek: ${mt.subject}\nEmail: ${mt.to_email}\n---\n`;
    });
    await bot.sendMessage(chatId, text);
  });
}