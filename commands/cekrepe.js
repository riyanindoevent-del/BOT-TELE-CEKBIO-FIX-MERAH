import { isAllowed, checkCooldown } from './helpers.js';
import { getWhatsAppSock, isConnected } from '../whatsapp.js';
import { isRepeNumber, getVerificationPercentage, createRepeResultFile, createProgressBar, getFileSourceType } from '../functions.js';
import fs from 'fs';

export default function registerCekrepe(bot) {
  bot.onText(/\/cekrepe/, async (msg) => {
    const chatId = msg.chat.id, userId = msg.from.id;

    if (!isAllowed(userId)) return bot.sendMessage(chatId, '❌ Belum terverifikasi.');
    const cd = checkCooldown(userId);
    if (!cd.allowed) return bot.sendMessage(chatId, `⏰ Tunggu ${cd.remaining} detik.`);
    if (!isConnected()) return bot.sendMessage(chatId, '❌ WhatsApp tidak terhubung.');

    const nums = msg.text.replace('/cekrepe','').trim().split(/[\s,\n]+/).filter(n => n);
    if (!nums.length) return bot.sendMessage(chatId, '❌ Format: /cekrepe <nomor1> ... (max 300)');

    const totalNumbers = nums.length;
    const valid = nums.slice(0,300).map(n => {
      let c = String(n).replace(/\D/g,'');
      if (c.startsWith('0')) c = '62' + c.substring(1);
      else if (c.startsWith('8')) c = '62' + c;
      return c;
    }).filter(n => n.length >= 10 && n.length <= 15);
    const invalid = totalNumbers - valid.length;

    // Kirim statistik awal
    await bot.sendMessage(chatId,
      `📂 <b>CUAN TEAM TOOLS</b>

📊 Total Nomor : ${totalNumbers}
✅ Valid : ${valid.length}
❌ Tidak Valid : ${invalid}

🚀 Memulai proses cek REPE...`,
      { parse_mode:'HTML' }
    );
    if(!valid.length) return;

    const sock = getWhatsAppSock();
    let regRepe=[], notRegRepe=[], regNorm=[], notRegNorm=[];
    let processed = 0;
    const progressMsg = await bot.sendMessage(chatId, `⏳ Memulai 0/${valid.length}`);

    for (let i=0; i<valid.length; i+=20) {
      const batch = valid.slice(i,i+20);
      const results = await Promise.all(batch.map(async num => {
        try {
          const jid = num + '@s.whatsapp.net';
          const [wa] = await sock.onWhatsApp(jid);
          const exists = wa?.exists;
          const repe = isRepeNumber(num);
          if (exists) return repe ? {num, type:'regRepe'} : {num, type:'regNorm'};
          else return repe ? {num, type:'notRegRepe'} : {num, type:'notRegNorm'};
        } catch { return {num, type:'error'}; }
      }));
      results.forEach(r => {
        if (r.type==='regRepe') regRepe.push({number:r.num, percentage:getVerificationPercentage(r.num)});
        else if (r.type==='notRegRepe') notRegRepe.push(r.num);
        else if (r.type==='regNorm') regNorm.push(r.num);
        else if (r.type==='notRegNorm') notRegNorm.push(r.num);
      });

      processed += batch.length;
      const bar = createProgressBar(processed, valid.length);
      await bot.editMessageText(`⏳ ${bar} ${processed}/${valid.length}`, {chat_id:chatId, message_id:progressMsg.message_id}).catch(()=>{});
      if(i+20<valid.length) await new Promise(r=>setTimeout(r,1000));
    }

    // File TXT internal untuk backup
    const file = createRepeResultFile(regRepe, notRegRepe, {registered:regNorm, notRegistered:notRegNorm});
    fs.writeFileSync(file, fs.readFileSync(file));

    // Kirim ringkasan ke chat
    await bot.sendMessage(chatId,
      `✅ CUAN TEAM FINISHED
━━━━━━━━━━━━━━━━━━
📊 REKAPITULASI:
👑 Repe Terdaftar       : ${regRepe.length}
❌ Repe Tidak Terdaftar  : ${notRegRepe.length}
📱 Normal Terdaftar     : ${regNorm.length}
📵 Normal Tidak Terdaftar: ${notRegNorm.length}

📄 File hasil lengkap tersimpan untuk backup.`,
      { parse_mode:'HTML' }
    );

    // Hapus file internal setelah beberapa detik
    setTimeout(()=> fs.unlinkSync(file), 5000);
    try { await bot.deleteMessage(chatId, progressMsg.message_id); } catch(e){}
  });
}