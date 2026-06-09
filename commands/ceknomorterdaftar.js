import { isAllowed, checkCooldown } from './helpers.js';
import { getWhatsAppSock, isConnected } from '../whatsapp.js';
import fs from 'fs';
import { createProgressBar, getFileSourceType } from '../functions.js';

export default function registerCeknomorterdaftar(bot) {
  bot.onText(/\/ceknomorterdaftar/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    if (!isAllowed(userId)) return bot.sendMessage(chatId, '❌ Belum terverifikasi.');
    const cd = checkCooldown(userId);
    if (!cd.allowed) return bot.sendMessage(chatId, `⏰ Tunggu ${cd.remaining} detik.`);
    if (!isConnected()) return bot.sendMessage(chatId, '❌ WhatsApp tidak terhubung.');

    const nums = msg.text.replace('/ceknomorterdaftar','').trim().split(/[\s,\n]+/).filter(n => n);
    if (!nums.length) return bot.sendMessage(chatId, '❌ Format: /ceknomorterdaftar <nomor1> ... (max 300)');

    const totalNumbers = nums.length;
    const valid = nums.slice(0,300).map(n => {
      let c = String(n).replace(/\D/g,'');
      if (c.startsWith('0')) c = '62' + c.substring(1);
      else if (c.startsWith('8')) c = '62' + c;
      return c;
    }).filter(n => n.length >= 10 && n.length <= 15);
    const invalid = totalNumbers - valid.length;

    await bot.sendMessage(chatId,
      `📂 <b>CUAN TEAM TOOLS</b>

📊 Total Nomor : ${totalNumbers}
✅ Valid : ${valid.length}
❌ Tidak Valid : ${invalid}

🚀 Memulai proses cek status...`,
      { parse_mode:'HTML' }
    );
    if (!valid.length) return;

    const sock = getWhatsAppSock();
    let registered = [], notRegistered = [];
    let processed = 0;
    const progressMsg = await bot.sendMessage(chatId, `⏳ Memulai 0/${valid.length}`);

    for (let i=0; i<valid.length; i+=20) {
      const batch = valid.slice(i,i+20);
      const batchResults = await Promise.all(batch.map(async num => {
        try {
          const jid = num + '@s.whatsapp.net';
          const [wa] = await sock.onWhatsApp(jid);
          return wa?.exists ? 'reg' : 'not';
        } catch { return 'not'; }
      }));
      batchResults.forEach((r, idx) => {
        if (r === 'reg') registered.push(batch[idx]);
        else notRegistered.push(batch[idx]);
      });

      processed += batch.length;
      const bar = createProgressBar(processed, valid.length);
      await bot.editMessageText(`⏳ ${bar} ${processed}/${valid.length}`, { chat_id: chatId, message_id: progressMsg.message_id }).catch(()=>{});
      if(i+20 < valid.length) await new Promise(r => setTimeout(r, 1000));
    }

    // File TXT internal untuk backup
    const fileName = `status_${Date.now()}.txt`;
    let content = `╔════════════════════╗
║  CUAN TEAM TOOLS   ║
╚════════════════════╝

📊 HASIL CEK NOMOR
────────────────────────────
Total Nomor       : ${valid.length}
✅ Terdaftar       : ${registered.length}
❌ Tidak Terdaftar : ${notRegistered.length}

Terdaftar:
${registered.join('\n')}

Tidak Terdaftar:
${notRegistered.join('\n')}
`;
    fs.writeFileSync(fileName, content);

    // Kirim ringkasan ke chat
    await bot.sendMessage(chatId,
      `✅ CUAN TEAM FINISHED
━━━━━━━━━━━━━━━━━━
📊 REKAPITULASI
✅ Terdaftar       : ${registered.length}
❌ Tidak Terdaftar : ${notRegistered.length}

📄 File hasil lengkap telah dikirim.`,
      { parse_mode:'HTML' }
    );

    // Hapus file internal setelah beberapa detik
    setTimeout(()=>{try{fs.unlinkSync(fileName);}catch(e){}}, 5000);
    try{await bot.deleteMessage(chatId, progressMsg.message_id);}catch(e){}
  });
}