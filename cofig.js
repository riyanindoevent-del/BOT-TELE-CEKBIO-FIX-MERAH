console.log('CONFIG LOADED');
import 'dotenv/config';

// ================== Telegram ==================
export const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
export const OWNER_ID = Number(process.env.OWNER_ID);
export const VERIFICATION_GROUP_ID1 = Number(process.env.VERIFICATION_GROUP_ID1 || -1000000000000);
export const VERIFICATION_GROUP_ID2 = Number(process.env.VERIFICATION_GROUP_ID2 || -1000000000000);
export const VERIFICATION_GROUP_ID3 = Number(process.env.VERIFICATION_GROUP_ID3 || -1000000000000);
export const GROUP_LINK1 = process.env.GROUP_LINK1 || '';
export const GROUP_LINK2 = process.env.GROUP_LINK2 || '';
export const GROUP_LINK3 = process.env.GROUP_LINK3 || '';

// ================== WhatsApp ==================
export const MAX_RECONNECT_ATTEMPTS = 20;

// ================== Database ==================
export const MT_FILE = './db/mt.json';
export const PREMIUM_FILE = './db/premium.json';
export const USER_DB = './db/users.json';
export const HISTORY_DB = './db/history.json';
export const BANNED_GROUP_DB = './db/banned_groups.json';
export const SETTINGS_DB = './db/settings.json';
export const GMAIL_DB = './db/gmail.json';
export const ALLOWED_FILE = './allowed.json';
export const ADMIN_FILE = './admins.json';

// ================== Limit ==================
export const DEFAULT_FIX_LIMIT = 10;
export const FIX_LIMIT_RESET_HOURS = 24;
export const DEFAULT_BANDING_LIMIT = 10;
export const BANDING_LIMIT_RESET_HOURS = 24;

// ================== WhatsApp Support Email ==================
export const WHATSAPP_EMAIL = process.env.WHATSAPP_EMAIL;

// ================== Gmail ==================
export const GMAIL_USER = process.env.EMAIL_USER;
export const GMAIL_APP_PASSWORD = process.env.EMAIL_PASS;

// ================== FIX API ==================
export const FIX_API_KEY = process.env.FIX_API_KEY || '';
export const FIX_API_ENDPOINT = process.env.FIX_API_ENDPOINT || '';

// ================== Notification ==================
export const NOTIFICATION_CHANNEL_ID = Number(process.env.NOTIFICATION_CHANNEL_ID || 0);

// ================== GitHub Backup ==================
export const GIT_REMOTE_URL = process.env.GIT_REMOTE_URL || '';
export const GIT_BRANCH = process.env.GIT_BRANCH || 'main';

// ================== Random Name ==================
export const RANDOM_NAMES = [
  'Andi','Budi','Rizky','Fajar','Dimas','Rama','Putra','Agus','Ilham','Aldi'
];

// ================== Banding Template ==================
export const APPEAL_MESSAGES = [
  `Halo WhatsApp Support,\nNomor saya +NUMBER terblokir secara tidak sengaja.\nNama: (NAME)\nMohon dilakukan peninjauan kembali.\nTerima kasih.`,
  `Dear WhatsApp Team,\nSaya pemilik nomor +NUMBER.\nNama pengguna: (NAME)\nMohon bantuan untuk memulihkan akun saya.\nTerima kasih.`
];

// ================== Cooldown ==================
export const COOLDOWN_TIME = 60 * 1000; // 1 menit cooldown non-admin