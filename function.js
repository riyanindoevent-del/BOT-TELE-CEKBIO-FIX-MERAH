import fs from 'fs';
import csv from 'csv-parser';
import XLSX from 'xlsx';
import { PassThrough } from 'stream';
import axios from 'axios';
import { RANDOM_NAMES, APPEAL_MESSAGES } from './config.js';

// Deteksi nomor repe
export function isRepeNumber(number) {
  const numStr = number.toString();
  if (/(\d)\1{2,}/.test(numStr)) return true;
  const digits = numStr.split('').map(Number);
  let sequentialUp = true, sequentialDown = true;
  for (let i = 1; i < digits.length; i++) {
    if (digits[i] !== digits[i-1] + 1) sequentialUp = false;
    if (digits[i] !== digits[i-1] - 1) sequentialDown = false;
  }
  if (sequentialUp || sequentialDown) return true;
  if (numStr === numStr.split('').reverse().join('')) return true;
  if (numStr.length % 2 === 0) {
    const half = numStr.length / 2;
    if (numStr.slice(0, half) === numStr.slice(half)) return true;
  }
  return false;
}

export function getVerificationPercentage(number) {
  const numStr = number.toString();
  if (isRepeNumber(number)) return 99;
  if (/(\d)\1{3,}/.test(numStr)) return 95;
  if (/(\d)\1{2,}/.test(numStr)) return 90;
  const digits = numStr.split('').map(Number);
  let sequentialUp = true, sequentialDown = true;
  for (let i = 1; i < digits.length; i++) {
    if (digits[i] !== digits[i-1] + 1) sequentialUp = false;
    if (digits[i] !== digits[i-1] - 1) sequentialDown = false;
  }
  if (sequentialUp || sequentialDown) return 85;
  if (numStr.length >= 6) {
    if (numStr.length % 2 === 0) {
      const half = numStr.length / 2;
      if (numStr.slice(0, half) === numStr.slice(half)) return 80;
    }
    if (/(\d)\1(\d)\2(\d)\3/.test(numStr)) return 75;
  }
  if (numStr.length >= 12) return 70;
  if (numStr.length >= 10) return 60;
  if (numStr.length >= 8) return 50;
  return 40;
}

export function getJamPercentage(bio, setAt, metaBusiness) {
  let base = 50;
  if (bio && bio.length > 0) {
    if (bio.length > 100) base -= 20;
    else if (bio.length > 50) base -= 15;
    else if (bio.length > 20) base -= 10;
    else base -= 5;
  } else base += 15;
  if (setAt) {
    const diffDays = Math.ceil(Math.abs(new Date() - new Date(setAt)) / 86400000);
    if (diffDays < 30) base -= 20;
    else if (diffDays < 90) base -= 10;
    else if (diffDays > 365) base += 15;
    else if (diffDays > 730) base += 25;
  } else base += 10;
  if (metaBusiness) base -= 25;
  return Math.max(10, Math.min(90, Math.round(base / 10) * 10));
}

export function createProgressBar(current, total, length = 20) {
  const filled = Math.round((current / total) * length);
  return `[${'█'.repeat(filled)}${'░'.repeat(length - filled)}]`;
}

export function getRandomName() {
  return RANDOM_NAMES[Math.floor(Math.random() * RANDOM_NAMES.length)];
}

export function getRandomAppealMessage(name, number) {
  return APPEAL_MESSAGES[Math.floor(Math.random() * APPEAL_MESSAGES.length)]
    .replace('(NAME)', name).replace('+NUMBER', number);
}

export async function checkMetaBusiness(whatsappSock, jid) {
  try {
    const bp = await whatsappSock.getBusinessProfile(jid);
    return bp ? { isBusiness: true, businessData: bp } : { isBusiness: false, businessData: null };
  } catch { return { isBusiness: false, businessData: null }; }
}

export function createBioResultFile(results, total, source = 'Input Manual') {
  const filename = `hasil_cekbio_${Date.now()}.txt`;
  let c = `HASIL CEK BIO SEMUA USER\n\n✅ Total nomor dicek : ${total}\n📳 Dengan Bio : ${results.filter(r=>r.registered&&r.bio&&r.bio.length>0).length}\n📵 Tanpa Bio : ${results.filter(r=>r.registered&&(!r.bio||r.bio.length===0)).length}\n🚫 Tidak Terdaftar : ${results.filter(r=>!r.registered).length}\n📁 Sumber : ${source}\n\n----------------------------------------\n\n`;
  const withBio = results.filter(r=>r.registered&&r.bio);
  if (withBio.length) {
    c += `✅ NOMOR YANG ADA BIO NYA (${withBio.length})\n\n`;
    const grouped = {};
    withBio.forEach(r=>{
      const y = r.setAt ? new Date(r.setAt).getFullYear() : 'Tidak Diketahui';
      (grouped[y] = grouped[y]||[]).push(r);
    });
    Object.keys(grouped).sort((a,b)=>a==='Tidak Diketahui'?1:b==='Tidak Diketahui'?-1:parseInt(a)-parseInt(b)).forEach(y=>{
      c += `Tahun ${y}\n\n`;
      grouped[y].forEach(r=>{
        c += `└─ 📅 ${r.number}\n   └─ 📝 "${r.bio}"\n`;
        if (r.setAt) {
          const d = new Date(r.setAt).toLocaleString('id-ID');
          c += `      └─ ⏰ ${d}\n`;
        }
        c += `      └─ ${r.metaBusiness?'✅ Meta Business':'❌ Tidak Meta Business'}\n      └─ 📮 ${r.jamPercentage||getJamPercentage(r.bio,r.setAt,r.metaBusiness)}% Tidak Ngejam\n\n`;
      });
    });
  }
  fs.writeFileSync(filename, c);
  return filename;
}

export function createRepeResultFile(regRepe, notRegRepe, notRepe) {
  const fn = `repe_result_${Date.now()}.txt`;
  let c = `📚 Hasil cek repe\n\n`;
  if (regRepe.length) c += `Nokos Repe terdaftar\n`+regRepe.map((r,i)=>`✅ ${i+1}. ${r.number}`).join('\n')+'\n\n';
  if (notRegRepe.length) c += `Nokos Repe tidak terdaftar\n`+notRegRepe.map((n,i)=>`❌ ${i+1}. ${n}`).join('\n')+'\n\n';
  if (notRepe.registered.length) c += `Nomor biasa terdaftar\n`+notRepe.registered.map((n,i)=>`📱 ${i+1}. ${n}`).join('\n')+'\n\n';
  if (notRepe.notRegistered.length) c += `Nomor biasa tidak terdaftar\n`+notRepe.notRegistered.map((n,i)=>`🚫 ${i+1}. ${n}`).join('\n');
  fs.writeFileSync(fn, c);
  return fn;
}

export async function readTxtFile(buf) { return buf.toString('utf8').split(/[\r\n]+/).filter(s=>s.trim()); }
export async function readCsvFile(buf) {
  return new Promise((ok,no)=>{
    const ns=[], s=new PassThrough(); s.end(buf);
    s.pipe(csv()).on('data',r=>Object.values(r).forEach(v=>{if(v)ns.push(v.toString().trim())})).on('end',()=>ok(ns)).on('error',no);
  });
}
export async function readXlsxFile(buf) {
  const wb = XLSX.read(buf,{type:'buffer'}), ns=[];
  wb.SheetNames.forEach(sn=>XLSX.utils.sheet_to_json(wb.Sheets[sn],{header:1}).flat().forEach(v=>{if(v)ns.push(v.toString().trim())}));
  return ns;
}
export async function processFile(buf, name) {
  const ext = name.split('.').pop().toLowerCase();
  switch(ext){
    case 'txt': return await readTxtFile(buf);
    case 'csv': return await readCsvFile(buf);
    case 'xlsx': return await readXlsxFile(buf);
    default: throw new Error(`Format ${ext} tidak didukung.`);
  }
}
export function getFileSourceType(name) {
  const ext = name.split('.').pop().toLowerCase();
  return ext==='txt'?'File TXT':ext==='csv'?'File CSV':ext==='xlsx'?'File XLSX':'File';
}
export async function downloadTelegramFile(bot, fileId) {
  const link = await bot.getFileLink(fileId);
  const res = await axios({method:'GET',url:link,responseType:'arraybuffer'});
  return Buffer.from(res.data);
}