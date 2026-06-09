import makeWASocket, { useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } from "@whiskeysockets/baileys";
import P from "pino";
import fs from 'fs';
import { MAX_RECONNECT_ATTEMPTS, OWNER_ID } from './config.js';

let whatsappSock = null, isWhatsAppConnected = false, reconnectAttempts = 0, qrCodeString = '', reconnectTimeout = null;
let lastQrLogTime = 0, lastDisconnectLogTime = 0;
let lastConnectedNotifyTime = 0; // ✅ cooldown notifikasi

export function getWhatsAppSock() { return whatsappSock; }
export function isConnected() { return isWhatsAppConnected; }
export function getQrCodeString() { return qrCodeString; }

function getReconnectDelay(attempt) {
  return Math.min(5000 * Math.pow(2, attempt - 1), 120000);
}

export async function startWhatsApp(bot) {
  try {
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      console.log('❌ WhatsApp gagal terhubung setelah beberapa percobaan. Restart bot untuk memulai ulang.');
      try { await bot.sendMessage(OWNER_ID, '❌ WhatsApp gagal terhubung setelah mencapai batas reconnect.'); } catch(e){}
      return;
    }

    const now = Date.now();
    if (reconnectAttempts > 0 && (now - lastDisconnectLogTime < 30000)) {}
    else {
      if (reconnectAttempts > 0) console.log(`🔄 Mencoba reconnect WhatsApp... (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);
      else console.log('🔄 Menghubungkan ke WhatsApp...');
      lastDisconnectLogTime = now;
    }

    const { state, saveCreds } = await useMultiFileAuthState("auth");
    const { version } = await fetchLatestBaileysVersion();

    whatsappSock = makeWASocket({
      version, auth: state,
      logger: P({ level: "silent" }),
      connectTimeoutMs: 60000, keepAliveIntervalMs: 10000,
      browser: ["Ubuntu", "Chrome", "20.0.04"],
      qrTimeout: 40000,
    });

    whatsappSock.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect, qr } = update;
      if (qr) {
        if (!qrCodeString || (Date.now() - lastQrLogTime > 30000)) {
          console.log('📱 QR Code baru tersedia. Gunakan /getqr pada bot Telegram.');
          lastQrLogTime = Date.now();
        }
        qrCodeString = qr;
      }
      if (connection === "close") {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
        if (Date.now() - lastDisconnectLogTime > 30000) console.log("❌ Koneksi WhatsApp terputus");
        lastDisconnectLogTime = Date.now();
        if (shouldReconnect) {
          qrCodeString = ''; isWhatsAppConnected = false;
          const delay = getReconnectDelay(reconnectAttempts + 1);
          if (reconnectTimeout) clearTimeout(reconnectTimeout);
          reconnectTimeout = setTimeout(() => { reconnectAttempts++; startWhatsApp(bot); }, delay);
        } else {
          console.log("❌ WhatsApp logged out, perlu scan QR baru.");
          isWhatsAppConnected = false; qrCodeString = '';
          if (fs.existsSync("./auth")) fs.rmSync("./auth", { recursive: true });
          reconnectAttempts = 0;
          setTimeout(() => startWhatsApp(bot), 3000);
        }
      } else if (connection === "open") {
        isWhatsAppConnected = true; reconnectAttempts = 0; qrCodeString = '';
        console.log(`✅ WhatsApp terhubung sebagai ${whatsappSock.user.id}`);

        // Kirim notifikasi ke owner hanya jika terakhir dikirim > 1 jam yang lalu
        const now = Date.now();
        const oneHour = 3600 * 1000;
        if (now - lastConnectedNotifyTime > oneHour) {
          lastConnectedNotifyTime = now;
          try {
            await bot.sendMessage(OWNER_ID,
              `<b>✅ WhatsApp Berhasil Terhubung!</b>\n\n<b>User ID:</b> ${whatsappSock.user.id}\n<b>Nama:</b> ${whatsappSock.user.name || 'Tidak ada nama'}\n<b>Status:</b> Connected`,
              { parse_mode: 'HTML' }
            );
          } catch(e){}
        }
      }
    });

    whatsappSock.ev.on("creds.update", saveCreds);
    whatsappSock.ev.on('messages.upsert', async (m) => { if (m.type === 'notify') for (const msg of m.messages) {/* silent */} });

  } catch (error) {
    console.error('❌ Error WhatsApp:', error.message);
    const delay = getReconnectDelay(reconnectAttempts + 1);
    setTimeout(() => { reconnectAttempts++; startWhatsApp(bot); }, delay);
  }
}