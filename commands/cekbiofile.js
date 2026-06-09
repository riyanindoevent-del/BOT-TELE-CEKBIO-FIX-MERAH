import { isAllowed, checkCooldown } from './helpers.js';
import { getWhatsAppSock, isConnected } from '../whatsapp.js';
import { getJamPercentage, createProgressBar, checkMetaBusiness, createBioResultFile, processFile, getFileSourceType, downloadTelegramFile } from '../functions.js';
import fs from 'fs';

export default function registerCekbiofile(bot) {
  bot.onText(/\/cekbiofile/, async (msg) => {
    const chatId = msg.chat.id, userId = msg.from.id;
    if (!isAllowed(userId)) return bot.sendMessage(chatId, '❌ Belum terverifikasi.');
    const cd = checkCooldown(userId);
    if (!cd.allowed) return bot.sendMessage(chatId, `⏰ Tunggu ${cd.remaining} detik.`);
    if (!isConnected()) return bot.sendMessage(chatId, '❌ WhatsApp tidak terhubung.');
    if (!msg.reply_to_message?.document) return bot.sendMessage(chatId, '❌ Reply file TXT/CSV/XLSX dengan /cekbiofile');

    const doc = msg.reply_to_message.document;
    const fileName = doc.file_name || '';
    const ext = fileName.split('.').pop().toLowerCase();
    if(!['txt','csv','xlsx'].includes(ext)) return bot.sendMessage(chatId, '❌ Format tidak didukung.');

    try {
      const buffer = await downloadTelegramFile(bot, doc.file_id);
      const numbers = await processFile(buffer, fileName);
      const totalNumbers = numbers.length;

      const valid = numbers.slice(0,300).map(n=>{
        let c = String(n).replace(/\D/g,'');
        if(c.startsWith('0')) c='62'+c.substring(1);
        else if(c.startsWith('8')) c='62'+c;
        return c;
      }).filter(n => n.length>=10 && n.length<=15);
      const invalid = totalNumbers - valid.length;

      await bot.sendMessage(
        chatId,
        `📂 <b>FILE BERHASIL DIMUAT</b>\n\n📄 File : ${fileName}\n📊 Total Data : ${totalNumbers}\n✅ Valid : ${valid.length}\n❌ Tidak Valid : ${invalid}\n\n🚀 Memulai proses cek bio...`,
        { parse_mode:'HTML' }
      );

      if(!valid.length) return;

      let progressMsg = await bot.sendMessage(chatId, `⏳ Memulai 0/${valid.length}`);
      let results = [];
      let processed = 0;
      const sock = getWhatsAppSock();

      for(let i=0;i<valid.length;i+=20){
        const batch = valid.slice(i,i+20);
        const batchResults = await Promise.all(batch.map(async num=>{
          try{
            const jid=num+'@s.whatsapp.net';
            const [wa]=await sock.onWhatsApp(jid);
            if(!wa?.exists) return {number:num, registered:false, bio:null, setAt:null, metaBusiness:false};
            let bio=null,setAt=null,meta=false;
            try{
              await new Promise(r=>setTimeout(r,500));
              const status = await sock.fetchStatus(jid);
              if(status?.[0]?.status){ bio=status[0].status.status||''; setAt=status[0].status.setAt?new Date(status[0].status.setAt):null; }
            }catch(e){}
            try{ const b=await checkMetaBusiness(sock,jid); meta=b.isBusiness;}catch(e){}
            return {number:num, registered:true, bio, setAt, metaBusiness:meta, jamPercentage:getJamPercentage(bio,setAt,meta)};
          }catch(e){ return {number:num, registered:false, bio:null, setAt:null, metaBusiness:false}; }
        }));
        results.push(...batchResults);
        processed+=batch.length;
        const bar = createProgressBar(processed, valid.length);
        await bot.editMessageText(`⏳ ${bar} ${processed}/${valid.length}`, {chat_id:chatId,message_id:progressMsg.message_id}).catch(()=>{});
        if(i+20<valid.length) await new Promise(r=>setTimeout(r,1000));
      }

      const file = createBioResultFile(results, valid.length, getFileSourceType(fileName));
      await bot.sendDocument(chatId, file, {
        caption:`<b>Hasil Cek Bio</b>\nTotal: ${valid.length}\nTerdaftar: ${results.filter(r=>r.registered).length}`,
        parse_mode:'HTML'
      });

      const totalRegistered = results.filter(r=>r.registered).length;
      const totalWithBio = results.filter(r=>r.bio && r.registered).length;
      const totalWithoutBio = totalRegistered - totalWithBio;
      const totalNotRegistered = results.filter(r=>!r.registered).length;

      await bot.sendMessage(chatId,
        `✅ CUAN TEAM FINISHED
━━━━━━━━━━━━━━━━━━
📊 REKAPITULASI:
✅ Aktif           : ${totalRegistered}
❌ Tidak Aktif     : ${totalNotRegistered}
📝 Bio Terdeteksi : ${totalWithBio}
📭 Bio Kosong      : ${totalWithoutBio}

📄 File hasil lengkap telah dikirim.`,
        { parse_mode:'HTML' }
      );

      setTimeout(()=>{ try{ fs.unlinkSync(file); }catch(e){} },5000);
      try{ await bot.deleteMessage(chatId, progressMsg.message_id); }catch(e){}

    }catch(e){
      bot.sendMessage(chatId, `❌ Error: ${e.message}`);
    }
  });
}