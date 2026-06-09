import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';
import {
  MT_FILE, PREMIUM_FILE, USER_DB, HISTORY_DB,
  BANNED_GROUP_DB, SETTINGS_DB, ALLOWED_FILE, ADMIN_FILE,
  OWNER_ID, GMAIL_DB, DEFAULT_FIX_LIMIT, FIX_LIMIT_RESET_HOURS,
  FIX_API_KEY, FIX_API_ENDPOINT, GMAIL_USER, GMAIL_APP_PASSWORD,
  DEFAULT_BANDING_LIMIT,    // ✅ tambahkan ini
  BANDING_LIMIT_RESET_HOURS // ✅ tambahkan ini
} from './config.js';

// ========== BANDING LIMIT (24h reset) ==========
export function getUserBandingLimit(userId) {
  const user = getUser(userId);
  const now = Date.now();
  const reset = BANDING_LIMIT_RESET_HOURS * 60 * 60 * 1000;
  if (user.last_banding_reset && (now - user.last_banding_reset) >= reset) {
    user.banding_limit = DEFAULT_BANDING_LIMIT;
    user.last_banding_reset = now;
    user.banding_count = 0;
    saveUser(user);
  }
  return user;
}

export function decreaseUserBandingLimit(userId) {
  const user = getUserBandingLimit(userId);
  if (user.banding_limit <= 0) return false;
  user.banding_limit--;
  user.banding_count++;
  saveUser(user);
  return true;
}

export function setUserBandingLimit(userId, newLimit) {
  const user = getUser(userId);
  user.banding_limit = newLimit;
  user.last_banding_reset = Date.now();
  saveUser(user);
}

export function getAllUserBandingLimits() {
  return Object.values(readDb(USER_DB))
    .filter(u => u.id !== OWNER_ID)
    .sort((a, b) => a.banding_limit - b.banding_limit);
}
export function initDbFile(filePath, defaultData) {
  if (!fs.existsSync(filePath)) {
    const dir = path.dirname(filePath);
    if (dir && dir !== '.' && !fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 4), 'utf8');
  }
}

export function initAllDb() {
  initDbFile(MT_FILE, []);
  initDbFile(PREMIUM_FILE, []);
  initDbFile(USER_DB, {});
  initDbFile(HISTORY_DB, []);
  initDbFile(BANNED_GROUP_DB, []);
  initDbFile('groups.json', {});
  initDbFile('owners.json', [OWNER_ID]);
  initDbFile('emails.json', []);
  initDbFile(SETTINGS_DB, { cooldown_duration: 60000, global_cooldown: 0, active_mt_id: 0, active_email_id: 0 });
  initDbFile(GMAIL_DB, []);
}

export function readDb(file) { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { return {}; } }
export function writeDb(file, data) { fs.writeFileSync(file, JSON.stringify(data, null, 4), 'utf8'); }

export let allowedIds = [];
export let adminIds = [];

export function loadData() {
  try { allowedIds = JSON.parse(fs.readFileSync(ALLOWED_FILE, 'utf8')); } catch { allowedIds = []; }
  try { adminIds = JSON.parse(fs.readFileSync(ADMIN_FILE, 'utf8')); } catch { adminIds = []; }
}
export function saveAllowed() { fs.writeFileSync(ALLOWED_FILE, JSON.stringify(allowedIds, null, 2), 'utf8'); }
export function saveAdmin() { fs.writeFileSync(ADMIN_FILE, JSON.stringify(adminIds, null, 2), 'utf8'); }

export function getUser(userId) {
  const users = readDb(USER_DB);
  const defaultUser = {
    id: userId,
    username: 'N/A',
    status: isOwner(userId) ? 'owner' : 'free',
    is_banned: 0,
    last_fix: 0,
    fix_limit: DEFAULT_FIX_LIMIT,
    last_fix_reset: Date.now(),
    fix_count: 0,
    banding_limit: DEFAULT_BANDING_LIMIT,       // ✅ tambahkan ini
    last_banding_reset: Date.now(),             // ✅ tambahkan ini
    banding_count: 0,                           // ✅ tambahkan ini
    referral_points: 0,
    referred_by: null,
    referred_users: []
  };
  return users[userId] ? { ...defaultUser, ...users[userId] } : defaultUser;
}

export function saveUser(user) { const users = readDb(USER_DB); users[user.id] = user; writeDb(USER_DB, users); }
export function saveHistory(data) {
  const history = readDb(HISTORY_DB);
  const newId = history.length > 0 ? history[history.length - 1].id + 1 : 1;
  history.push({ id: newId, ...data, timestamp: new Date().toISOString() });
  writeDb(HISTORY_DB, history);
}

export function getMtTexts() { return readDb(MT_FILE); }
export function getMtTextById(id) { return getMtTexts().find(mt => mt.id === id); }
export function getActiveMt() {
  const settings = readDb(SETTINGS_DB);
  return getMtTextById(settings.active_mt_id || 0);
}

export function loadGmailList() { return readDb(GMAIL_DB); }
function saveGmailList(list) { writeDb(GMAIL_DB, list); }
export function addGmail(email, appPassword, addedBy) {
  const list = loadGmailList();
  if (list.find(g => g.email === email)) return false;
  const newId = list.length > 0 ? list[list.length - 1].id + 1 : 1;
  list.push({ id: newId, email, appPassword, addedBy, addedAt: new Date().toISOString() });
  saveGmailList(list);
  return true;
}
export function removeGmail(email) {
  let list = loadGmailList();
  const before = list.length;
  list = list.filter(g => g.email !== email);
  if (list.length === before) return false;
  saveGmailList(list);
  return true;
}
export function getRandomGmail() {
  const list = loadGmailList();
  return list.length ? list[Math.floor(Math.random() * list.length)] : null;
}

export function getUserFixLimit(userId) {
  const user = getUser(userId);
  const now = Date.now();
  const reset = FIX_LIMIT_RESET_HOURS * 60 * 60 * 1000;
  if (user.last_fix_reset && (now - user.last_fix_reset) >= reset) {
    user.fix_limit = DEFAULT_FIX_LIMIT;
    user.last_fix_reset = now;
    user.fix_count = 0;
    saveUser(user);
  }
  return user;
}
export function decreaseUserFixLimit(userId) {
  const user = getUserFixLimit(userId);
  if (user.fix_limit <= 0) return false;
  user.fix_limit--;
  user.fix_count++;
  saveUser(user);
  return true;
}
export function setUserFixLimit(userId, newLimit) {
  const user = getUser(userId);
  user.fix_limit = newLimit;
  user.last_fix_reset = Date.now();
  saveUser(user);
}
export function getAllUserLimits() {
  return Object.values(readDb(USER_DB))
    .filter(u => u.id !== OWNER_ID)
    .sort((a, b) => a.fix_limit - b.fix_limit);
}

export async function sendEmailViaApi({
  to,
  subject,
  text,
  html,
  gmailUser,
  gmailAppPassword
}) {

  const user = gmailUser || GMAIL_USER;
  const pass = gmailAppPassword || GMAIL_APP_PASSWORD;

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user,
      pass
    }
  });

  const info = await transporter.sendMail({
    from: user,
    to,
    subject,
    text,
    html
  });

  return {
    success: true,
    messageId: info.messageId
  };
}

function isOwner(userId) { return userId === OWNER_ID; }