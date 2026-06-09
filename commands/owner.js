import { isOwner } from './helpers.js';
import {
  allowedIds, adminIds, saveAllowed, saveAdmin, loadData,
  addGmail, removeGmail, loadGmailList,
  setUserFixLimit, getUserFixLimit, getAllUserLimits
} from '../database.js';
import { backupNow } from '../backup.js';
import qrcode from 'qrcode';
import { getQrCodeString, isConnected, getWhatsAppSock } from '../whatsapp.js';
import { GIT_REMOTE_URL, GIT_BRANCH } from '../config.js';
import { exec } from 'child_process';

export default function registerOwnerCommands(bot) {
  // /delkacung
  bot.onText(/\/delkacung/, async (msg) => {
    const chatId = msg.chat.id;
    if (!isOwner(msg.from.id)) return bot.sendMessage(chatId, '❌ Hanya owner.');
    const id = parseInt(msg.text.split(' ')[1]);
    if (!id) return bot.sendMessage(chatId, '❌ Format: /delkacung <id>');
    if (allowedIds.includes(id)) {
      allowedIds = allowedIds.filter(i => i !== id);
      saveAllowed();
      bot.sendMessage(chatId, `✅ ID ${id} dihapus.`);
    } else bot.sendMessage(chatId, '❌ Tidak ditemukan.');
  });

  // /addadmin
  bot.onText(/\/addadmin/, async (msg) => {
    const chatId = msg.chat.id;
    if (!isOwner(msg.from.id)) return bot.sendMessage(chatId, '❌ Hanya owner.');
    const id = parseInt(msg.text.split(' ')[1]);
    if (!id) return bot.sendMessage(chatId, '❌ Format: /addadmin <id>');
    if (!adminIds.includes(id)) { adminIds.push(id); saveAdmin(); bot.sendMessage(chatId, `✅ Admin ${id} ditambahkan.`); }
    else bot.sendMessage(chatId, 'ℹ️ Sudah admin.');
  });

  // /unadmin
  bot.onText(/\/unadmin/, async (msg) => {
    const chatId = msg.chat.id;
    if (!isOwner(msg.from.id)) return bot.sendMessage(chatId, '❌ Hanya owner.');
    const id = parseInt(msg.text.split(' ')[1]);
    if (!id) return bot.sendMessage(chatId, '❌ Format: /unadmin <id>');
    if (adminIds.includes(id)) { adminIds = adminIds.filter(i => i !== id); saveAdmin(); bot.sendMessage(chatId, `✅ Admin ${id} dihapus.`); }
    else bot.sendMessage(chatId, 'ℹ️ Bukan admin.');
  });

  // /listadmin
  bot.onText(/\/listadmin/, async (msg) => {
    const chatId = msg.chat.id;
    if (!isOwner(msg.from.id)) return bot.sendMessage(chatId, '❌ Hanya owner.');
    loadData();
    const text = `<b>Daftar Admin</b>\n👑 Owner: ${OWNER_ID}\n\n${adminIds.map((id,i)=>`${i+1}. ${id}`).join('\n')}`;
    bot.sendMessage(chatId, text, {parse_mode:'HTML'});
  });

  // /getqr
  bot.onText(/\/getqr/, async (msg) => {
    const chatId = msg.chat.id;
    if (!isOwner(msg.from.id)) return bot.sendMessage(chatId, '❌ Hanya owner.');
    if (isConnected()) return bot.sendMessage(chatId, '✅ WhatsApp terhubung.');
    const qr = getQrCodeString();
    if (!qr) return bot.sendMessage(chatId, '❌ QR belum tersedia.');
    try {
      const img = await qrcode.toBuffer(qr, {width:300, margin:2});
      await bot.sendPhoto(chatId, img, {caption:'📱 Scan QR code ini'});
    } catch(e) { bot.sendMessage(chatId, '❌ Gagal generate QR.'); }
  });

  // /getpairing
  bot.onText(/\/getpairing/, async (msg) => {
    const chatId = msg.chat.id;
    if (!isOwner(msg.from.id)) return bot.sendMessage(chatId, '❌ Hanya owner.');
    if (isConnected()) return bot.sendMessage(chatId, '✅ Sudah terhubung.');
    const sock = getWhatsAppSock();
    if (!sock) return bot.sendMessage(chatId, '❌ WhatsApp belum siap.');
    const num = msg.text.split(' ')[1];
    if (!num) return bot.sendMessage(chatId, '❌ Format: /getpairing <nomor>');
    try {
      const code = await sock.requestPairingCode(num);
      const formatted = code.match(/.{1,4}/g)?.join('-') || code;
      await bot.sendMessage(chatId, `<b>Pairing Code</b>\n📞 ${num}\n🔢 ${formatted}`, {parse_mode:'HTML'});
    } catch(e) { bot.sendMessage(chatId, '❌ Gagal mendapatkan pairing code.'); }
  });

  // /addgmail
  bot.onText(/\/addgmail/, async (msg) => {
    const chatId = msg.chat.id;
    if (!isOwner(msg.from.id)) return bot.sendMessage(chatId, '❌ Hanya owner.');
    const parts = msg.text.replace('/addgmail','').trim().split('|').map(p=>p.trim());
    if (parts.length < 2) return bot.sendMessage(chatId, '❌ Format: /addgmail email | app_pass');
    const ok = addGmail(parts[0], parts[1], msg.from.username||'Owner');
    bot.sendMessage(chatId, ok ? `✅ Gmail ${parts[0]} ditambahkan.` : '❌ Sudah terdaftar.');
  });

  // /delgmail
  bot.onText(/\/delgmail/, async (msg) => {
    const chatId = msg.chat.id;
    if (!isOwner(msg.from.id)) return bot.sendMessage(chatId, '❌ Hanya owner.');
    const email = msg.text.replace('/delgmail','').trim();
    if (!email) return bot.sendMessage(chatId, '❌ Format: /delgmail email');
    const ok = removeGmail(email);
    bot.sendMessage(chatId, ok ? `✅ ${email} dihapus.` : '❌ Tidak ditemukan.');
  });

  // /listgmail
  bot.onText(/\/listgmail/, async (msg) => {
    const chatId = msg.chat.id;
    if (!isOwner(msg.from.id)) return bot.sendMessage(chatId, '❌ Hanya owner.');
    const list = loadGmailList();
    if (!list.length) return bot.sendMessage(chatId, '📋 Kosong.');
    let txt = '<b>Daftar Gmail</b>\n\n';
    list.forEach(g => txt += `<b>${g.email}</b> (${g.addedBy})\n`);
    bot.sendMessage(chatId, txt, {parse_mode:'HTML'});
  });

  // /addlimit
  bot.onText(/\/addlimit/, async (msg) => {
    const chatId = msg.chat.id;
    if (!isOwner(msg.from.id)) return bot.sendMessage(chatId, '❌ Hanya owner.');
    const args = msg.text.replace('/addlimit','').trim().split(/\s+/);
    if (args.length < 2) return bot.sendMessage(chatId, '❌ /addlimit <id> <jumlah>');
    const id = parseInt(args[0]), add = parseInt(args[1]);
    if (isNaN(id) || isNaN(add)) return bot.sendMessage(chatId, '❌ ID/jumlah tidak valid.');
    const u = getUserFixLimit(id);
    setUserFixLimit(id, u.fix_limit + add);
    bot.sendMessage(chatId, `✅ Limit user ${id} ditambah ${add}. Total: ${u.fix_limit+add}x`);
  });

  // /dellimit
  bot.onText(/\/dellimit/, async (msg) => {
    const chatId = msg.chat.id;
    if (!isOwner(msg.from.id)) return bot.sendMessage(chatId, '❌ Hanya owner.');
    const id = parseInt(msg.text.replace('/dellimit','').trim());
    if (isNaN(id)) return bot.sendMessage(chatId, '❌ /dellimit <id>');
    setUserFixLimit(id, 0);
    bot.sendMessage(chatId, `✅ Limit user ${id} dihapus.`);
  });

  // /listlimit
  bot.onText(/\/listlimit/, async (msg) => {
    const chatId = msg.chat.id;
    if (!isOwner(msg.from.id)) return bot.sendMessage(chatId, '❌ Hanya owner.');
    const all = getAllUserLimits();
    if (!all.length) return bot.sendMessage(chatId, '📋 Kosong.');
    let txt = '<b>Limit User (terendah)</b>\n\n';
    all.forEach((u,i) => txt += `${i+1}. ID: ${u.id} | Limit: ${u.fix_limit}x\n`);
    bot.sendMessage(chatId, txt, {parse_mode:'HTML'});
  });

  // /backup
  bot.onText(/\/backup/, async (msg) => {
    const chatId = msg.chat.id;
    if (!isOwner(msg.from.id)) return bot.sendMessage(chatId, '❌ Hanya owner.');
    const frames = ['🔄','🔃','🌀','⏳'];
    let fi = 0, prog = '🔄 Memulai backup...';
    const progMsg = await bot.sendMessage(chatId, `${frames[0]} Memulai...`);
    const anim = setInterval(async () => {
      fi = (fi+1) % frames.length;
      try { await bot.editMessageText(`${frames[fi]} ${prog}`, {chat_id:chatId, message_id:progMsg.message_id}); } catch(e){}
    }, 800);
    const res = await backupNow((status) => { prog = status; });
    clearInterval(anim);
    const url = GIT_REMOTE_URL.replace(/^https:\/\/[^@]+@/, 'https://');
    if (res.success) {
      await bot.editMessageText(`✅ Backup Berhasil!\n${res.message}`, {
        chat_id:chatId, message_id:progMsg.message_id,
        reply_markup: { inline_keyboard: [[{text:'🔗 Repository', url}]] }
      });
    } else {
      await bot.editMessageText(`❌ Backup Gagal!\n${res.message}`, {chat_id:chatId, message_id:progMsg.message_id});
    }
  });

  // /installnpm
  bot.onText(/\/installnpm/, async (msg) => {
    const chatId = msg.chat.id;
    if (!isOwner(msg.from.id)) return bot.sendMessage(chatId, '❌ Hanya owner.');
    const pkg = msg.text.replace('/installnpm','').trim();
    if (!pkg) return bot.sendMessage(chatId, '❌ /installnpm <package>');
    const frames = ['📦','⚡','🔧','📦'];
    let fi = 0;
    const pm = await bot.sendMessage(chatId, `📦 Menginstall ${pkg}...`);
    const anim = setInterval(async () => {
      fi = (fi+1) % frames.length;
      try { await bot.editMessageText(`${frames[fi]} Menginstall ${pkg}...`, {chat_id:chatId, message_id:pm.message_id}); } catch(e){}
    }, 800);
    exec(`npm install ${pkg} --save`, {cwd:process.cwd(), timeout:120000}, async (err, stdout, stderr) => {
      clearInterval(anim);
      if (err) {
        const e = (stderr || err.message).substring(0,800);
        await bot.editMessageText(`❌ Gagal install ${pkg}\n\n${e}`, {chat_id:chatId, message_id:pm.message_id}).catch(()=> bot.sendMessage(chatId, `❌ Gagal: ${e}`));
      } else {
        const out = (stdout||'Installed').substring(0,500);
        await bot.editMessageText(`✅ ${pkg} terinstall!\n\n${out}\n🔄 Restart 3 detik...`, {chat_id:chatId, message_id:pm.message_id}).catch(()=> bot.sendMessage(chatId, `✅ ${pkg} terinstall!`));
        setTimeout(() => process.exit(0), 3000);
      }
    });
  });
    
    // ========== LIMIT BANDING ==========
bot.onText(/\/addbandinglimit/, async (msg) => {
  const chatId = msg.chat.id;
  if (!isOwner(msg.from.id)) return bot.sendMessage(chatId, '❌ Hanya owner.');
  const args = msg.text.replace('/addbandinglimit','').trim().split(/\s+/);
  if (args.length < 2) return bot.sendMessage(chatId, '❌ Format: /addbandinglimit <id_user> <jumlah>');
  const targetId = parseInt(args[0]), add = parseInt(args[1]);
  if (isNaN(targetId) || isNaN(add)) return bot.sendMessage(chatId, '❌ ID/jumlah tidak valid.');
  const user = getUserBandingLimit(targetId);
  setUserBandingLimit(targetId, user.banding_limit + add);
  bot.sendMessage(chatId, `✅ Limit banding user ${targetId} ditambah ${add}. Total: ${user.banding_limit + add}x`);
});

bot.onText(/\/delbandinglimit/, async (msg) => {
  const chatId = msg.chat.id;
  if (!isOwner(msg.from.id)) return bot.sendMessage(chatId, '❌ Hanya owner.');
  const targetId = parseInt(msg.text.replace('/delbandinglimit','').trim());
  if (isNaN(targetId)) return bot.sendMessage(chatId, '❌ Format: /delbandinglimit <id_user>');
  setUserBandingLimit(targetId, 0);
  bot.sendMessage(chatId, `✅ Limit banding user ${targetId} dihapus.`);
});

bot.onText(/\/listbandinglimit/, async (msg) => {
  const chatId = msg.chat.id;
  if (!isOwner(msg.from.id)) return bot.sendMessage(chatId, '❌ Hanya owner.');
  const all = getAllUserBandingLimits();
  if (!all.length) return bot.sendMessage(chatId, '📋 Kosong.');
  let txt = '<b>Limit Banding User (terendah)</b>\n\n';
  all.forEach((u, i) => txt += `${i+1}. ID: ${u.id} | Limit: ${u.banding_limit}x\n`);
  bot.sendMessage(chatId, txt, { parse_mode: 'HTML' });
});
}