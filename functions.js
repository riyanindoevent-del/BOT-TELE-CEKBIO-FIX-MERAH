import fs from 'fs';
import csv from 'csv-parser';
import XLSX from 'xlsx';
import { PassThrough } from 'stream';
import axios from 'axios';
import { RANDOM_NAMES, APPEAL_MESSAGES } from './config.js';

// ========== UTILITAS NOMOR ==========

export function isRepeNumber(number) {
  const numStr = number.toString();
  if (/(\d)\1{2,}/.test(numStr)) return true;
  const digits = numStr.split('').map(Number);
  let sequentialUp = true, sequentialDown = true;
  for (let i = 1; i < digits.length; i++) {
    if (digits[i] !== digits[i - 1] + 1) sequentialUp = false;
    if (digits[i] !== digits[i - 1] - 1) sequentialDown = false;
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
    if (digits[i] !== digits[i - 1] + 1) sequentialUp = false;
    if (digits[i] !== digits[i - 1] - 1) sequentialDown = false;
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

// ========== PERSENTASE "TIDAK NGEJAM" ==========

export function getJamPercentage(bio, setAt, metaBusiness) {
  let basePercentage = 50;
  if (bio && bio.length > 0) {
    if (bio.length > 100) basePercentage -= 20;
    else if (bio.length > 50) basePercentage -= 15;
    else if (bio.length > 20) basePercentage -= 10;
    else basePercentage -= 5;
  } else basePercentage += 15;
  if (setAt) {
    const now = new Date();
    const bioDate = new Date(setAt);
    const diffDays = Math.ceil(Math.abs(now - bioDate) / (1000 * 60 * 60 * 24));
    if (diffDays < 30) basePercentage -= 20;
    else if (diffDays < 90) basePercentage -= 10;
    else if (diffDays > 365) basePercentage += 15;
    else if (diffDays > 730) basePercentage += 25;
  } else basePercentage += 10;
  if (metaBusiness) basePercentage -= 25;
  basePercentage = Math.max(10, Math.min(90, basePercentage));
  return Math.round(basePercentage / 10) * 10;
}

// ========== PROGRESS BAR ==========

export function createProgressBar(current, total, length = 20) {
  const percentage = current / total;
  const filledLength = Math.round(length * percentage);
  const emptyLength = length - filledLength;
  return `[${'█'.repeat(filledLength)}${'░'.repeat(emptyLength)}]`;
}

// ========== NAMA & PESAN ACAK ==========

export function getRandomName() {
  return RANDOM_NAMES[Math.floor(Math.random() * RANDOM_NAMES.length)];
}

export function getRandomAppealMessage(name, number) {
  const randomIndex = Math.floor(Math.random() * APPEAL_MESSAGES.length);
  return APPEAL_MESSAGES[randomIndex]
    .replace('(NAME)', name)
    .replace('+NUMBER', number);
}

// ========== META BUSINESS CHECKER ==========

export async function checkMetaBusiness(whatsappSock, jid) {
  try {
    const businessProfile = await whatsappSock.getBusinessProfile(jid);
    return businessProfile
      ? { isBusiness: true, businessData: businessProfile }
      : { isBusiness: false, businessData: null };
  } catch (error) {
    return { isBusiness: false, businessData: null };
  }
}

// ========== PEMBUATAN FILE HASIL CEK BIO ==========

export function createBioResultFile(results, totalNumbers, sourceType = 'Input Manual') {
  const timestamp = Date.now();
  const filename = `hasil_cekbio_${timestamp}.txt`;
  let fileContent = `HASIL CEK BIO SEMUA USER\n\n`;
  const withBio = results.filter(r => r.registered && r.bio && r.bio.length > 0);
  const withoutBio = results.filter(r => r.registered && (!r.bio || r.bio.length === 0));
  const notRegistered = results.filter(r => !r.registered);
  fileContent += `✅ Total nomor dicek : ${totalNumbers}\n`;
  fileContent += `📳 Dengan Bio       : ${withBio.length}\n`;
  fileContent += `📵 Tanpa Bio        : ${withoutBio.length}\n`;
  fileContent += `🚫 Tidak Terdaftar  : ${notRegistered.length}\n`;
  fileContent += `📁 Sumber Data      : ${sourceType}\n\n`;
  fileContent += '----------------------------------------\n\n';

  if (withBio.length > 0) {
    fileContent += `✅ NOMOR YANG ADA BIO NYA (${withBio.length})\n\n`;
    const groupedByYear = {};
    withBio.forEach(result => {
      if (result.setAt) {
        const year = new Date(result.setAt).getFullYear();
        if (!groupedByYear[year]) groupedByYear[year] = [];
        groupedByYear[year].push(result);
      } else {
        if (!groupedByYear['Tidak Diketahui']) groupedByYear['Tidak Diketahui'] = [];
        groupedByYear['Tidak Diketahui'].push(result);
      }
    });
    const sortedYears = Object.keys(groupedByYear).sort((a, b) => {
      if (a === 'Tidak Diketahui') return 1;
      if (b === 'Tidak Diketahui') return -1;
      return parseInt(a) - parseInt(b);
    });
    sortedYears.forEach(year => {
      fileContent += `Tahun ${year}\n\n`;
      groupedByYear[year].forEach((result, index) => {
        fileContent += `└─ 📅 ${result.number}\n`;
        fileContent += `   └─ 📝 "${result.bio}"\n`;
        if (result.setAt) {
          const date = new Date(result.setAt);
          const dateStr = date.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
          const timeStr = date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          fileContent += `      └─ ⏰ ${dateStr}, ${timeStr}\n`;
        }
        fileContent += `      └─ ${result.metaBusiness ? '✅ Nomor Ini Terdaftar Meta Business' : '❌ Nomor Ini Tidak Ada Meta Businesses'}\n`;
        const jamPercentage = result.jamPercentage || getJamPercentage(result.bio, result.setAt, result.metaBusiness);
        fileContent += `      └─ Untuk Nomor Ini 📮 ${jamPercentage}% Tidak Ngejam\n\n`;
      });
    });
    fileContent += '----------------------------------------\n\n';
  }
  if (withoutBio.length > 0) {
    fileContent += `📵 NOMOR TANPA BIO / PRIVASI (${withoutBio.length})\n\n`;
    withoutBio.forEach((result, index) => {
      fileContent += `${result.number}\n`;
      fileContent += `└─ ${result.metaBusiness ? '✅ Meta Business' : '❌ Tidak Meta Business'}\n`;
      const jamPercentage = result.jamPercentage || getJamPercentage(result.bio, result.setAt, result.metaBusiness);
      fileContent += `└─ Untuk Nomor Ini 📮 ${jamPercentage}% Tidak Ngejam\n\n`;
    });
    fileContent += '\n----------------------------------------\n\n';
  }
  if (notRegistered.length > 0) {
    fileContent += `🚫 NOMOR TIDAK TERDAFTAR (${notRegistered.length})\n\n`;
    notRegistered.forEach((result, index) => {
      fileContent += `${result.number}\n`;
    });
  }
  fs.writeFileSync(filename, fileContent, 'utf8');
  return filename;
}

// ========== PEMBUATAN FILE HASIL REPE ==========

export function createRepeResultFile(registeredRepe, notRegisteredRepe, notRepeNumbers) {
  const timestamp = Date.now();
  const filename = `repe_result_${timestamp}.txt`;
  let fileContent = `📚 Hasil cek repe\n\n`;
  if (registeredRepe.length > 0) {
    fileContent += `Nokos Repe yang terdaftar\n`;
    registeredRepe.forEach((item, index) => {
      fileContent += `✅ ${index + 1}. ${item.number}\n`;
    });
    fileContent += '\n';
  }
  if (notRegisteredRepe.length > 0) {
    fileContent += `Nokos Repe yang tidak terdaftar\n`;
    notRegisteredRepe.forEach((number, index) => {
      fileContent += `❌ ${index + 1}. ${number}\n`;
    });
    fileContent += '\n';
  }
  if (notRepeNumbers.registered.length > 0) {
    fileContent += `Nomor biasa yang terdaftar\n`;
    notRepeNumbers.registered.forEach((number, index) => {
      fileContent += `📱 ${index + 1}. ${number}\n`;
    });
    fileContent += '\n';
  }
  if (notRepeNumbers.notRegistered.length > 0) {
    fileContent += `Nomor biasa yang tidak terdaftar\n`;
    notRepeNumbers.notRegistered.forEach((number, index) => {
      fileContent += `🚫 ${index + 1}. ${number}\n`;
    });
  }
  fs.writeFileSync(filename, fileContent, 'utf8');
  return filename;
}

// ========== PEMBACA FILE (TXT, CSV, XLSX) ==========

export async function readTxtFile(fileBuffer) {
  const content = fileBuffer.toString('utf8');
  return content.split(/[\r\n]+/).filter(num => num.trim().length > 0);
}

export async function readCsvFile(fileBuffer) {
  return new Promise((resolve, reject) => {
    const numbers = [];
    const bufferStream = new PassThrough();
    bufferStream.end(fileBuffer);
    bufferStream
      .pipe(csv())
      .on('data', (row) => {
        Object.values(row).forEach(value => {
          if (value && value.toString().trim().length > 0) numbers.push(value.toString().trim());
        });
      })
      .on('end', () => resolve(numbers))
      .on('error', reject);
  });
}

export async function readXlsxFile(fileBuffer) {
  const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
  const numbers = [];
  workbook.SheetNames.forEach(sheetName => {
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    data.flat().forEach(value => {
      if (value && value.toString().trim().length > 0) numbers.push(value.toString().trim());
    });
  });
  return numbers;
}

export async function processFile(fileBuffer, fileName) {
  const fileExtension = fileName.toLowerCase().split('.').pop();
  switch (fileExtension) {
    case 'txt': return await readTxtFile(fileBuffer);
    case 'csv': return await readCsvFile(fileBuffer);
    case 'xlsx': return await readXlsxFile(fileBuffer);
    default: throw new Error(`Format file ${fileExtension} tidak didukung. Gunakan TXT, CSV, atau XLSX.`);
  }
}

export function getFileSourceType(fileName) {
  const ext = fileName.toLowerCase().split('.').pop();
  switch (ext) {
    case 'txt': return 'File TXT';
    case 'csv': return 'File CSV';
    case 'xlsx': return 'File XLSX';
    default: return 'File';
  }
}

// ========== DOWNLOAD FILE TELEGRAM ==========

export async function downloadTelegramFile(bot, fileId) {
  try {
    const fileLink = await bot.getFileLink(fileId);
    const response = await axios({
      method: 'GET',
      url: fileLink,
      responseType: 'arraybuffer'
    });
    return Buffer.from(response.data);
  } catch (error) {
    throw new Error(`Gagal mengunduh file: ${error.message}`);
  }
}