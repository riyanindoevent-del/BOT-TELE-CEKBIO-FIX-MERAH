import { isAllowed, checkCooldown } from './helpers.js';
import { getWhatsAppSock, isConnected } from '../whatsapp.js';
import { createProgressBar, getFileSourceType, processFile, createBioResultFile } from '../functions.js';
import fs from 'fs';

export default function registerCekrange(bot) {
  bot.onText(/\/cekrange/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    if(!isAllowed(userId)) return bot.sendMessage(chatId, '❌ Belum terverifikasi.');
    const cd = checkCooldown(userId);
    if(!cd.allowed) return bot.sendMessage(chatId, `⏰ Tunggu ${cd.remaining} detik.`);
    if(!isConnected()) return bot.sendMessage(chatId, '❌ WhatsApp tidak terhubung.');

    const numbers = msg.text.replace('/cekrange','').trim().split(/[\s,\n]+/).filter(n=>n);
    if(!numbers.length) return bot.sendMessage(chatId, '❌ Format: /cekrange <nomor1> ... (max 300)');

    const totalNumbers = numbers.length;
    const valid = numbers.slice(0,300).map(n=>{
      let c = String(n).replace(/\D/g,'');
      if(c.startsWith('0')) c='62'+c.substring(1);
      else if(c.startsWith('8')) c='62'+c;
      return c;
    }).filter(n=>n.length>=10 && n.length<=15);
    const invalid = totalNumbers - valid.length;

    await bot.sendMessage(chatId,
      `📂 <b>FILE BERHASIL DIMUAT</b>\n\n` +
      `📊 Total Nomor : ${totalNumbers}\n` +
      `✅ Valid : ${valid.length}\n` +
      `❌ Tidak Valid : ${invalid}\n\n` +
      `🚀 Memulai proses cek range...`,
      { parse_mode:'HTML' }
    );
    if(!valid.length) return;

    let progressMsg = await bot.sendMessage(chatId, `⏳ Memulai 0/${valid.length}`);
    let results = [];
    let processed = 0;
    const sock = getWhatsAppSock();

    for(let i=0; i<valid.length; i+=20){
      const batch = valid.slice(i,i+20);
      const batchResults = await Promise.all(batch.map(async num=>{
        try{
          const jid=num+'@s.whatsapp.net';
          const [wa]=await sock.onWhatsApp(jid);
          return {number:num, registered:wa?.exists||false};
        }catch{
          return {number:num, registered:false};
        }
      }));
      results.push(...batchResults);
      processed+=batch.length;
      const bar = createProgressBar(processed, valid.length);
      await bot.editMessageText(`⏳ ${bar} ${processed}/${valid.length}`, {chat_id:chatId, message_id:progressMsg.message_id}).catch(()=>{});
      if(i+20<valid.length) await new Promise(r=>setTimeout(r,1000));
    }

    // File TXT internal untuk backup
    const file = createBioResultFile(results, valid.length, getFileSourceType('range.txt'));
    fs.writeFileSync(file, fs.readFileSync(file)); // buat backup internal

    // Kirim rekap ke chat
    const totalRegistered = results.filter(r=>r.registered).length;
    const totalNotRegistered = results.filter(r=>!r.registered).length;

    await bot.sendMessage(chatId,
      `✅ CUAN TEAM FINISHED
━━━━━━━━━━━━━━━━━━
📊 REKAPITULASI:
✅ Terdaftar     : ${totalRegistered}
❌ Tidak Terdaftar: ${totalNotRegistered}

📄 File hasil lengkap tersimpan untuk backup.`,
      { parse_mode:'HTML' }
    );

    setTimeout(()=>{try{fs.unlinkSync(file);}catch(e){}},5000);
    try{await bot.deleteMessage(chatId,progressMsg.message_id);}catch(e){}
  });
}