import { OWNER_ID, COOLDOWN_TIME } from '../config.js';
import { allowedIds, adminIds } from '../database.js';

export function isOwner(uid) { return uid === OWNER_ID; }
export function isAdmin(uid) { return isOwner(uid) || adminIds.includes(uid); }
export function isAllowed(uid) { return isAdmin(uid) || allowedIds.includes(uid); }

const cooldowns = new Map();
export function checkCooldown(uid) {
  if (isAdmin(uid)) return { allowed: true, remaining: 0 };
  const now = Date.now();
  const last = cooldowns.get(uid);
  if (last && (now - last) < COOLDOWN_TIME) {
    return { allowed: false, remaining: Math.ceil((COOLDOWN_TIME - (now - last)) / 1000) };
  }
  cooldowns.set(uid, now);
  return { allowed: true, remaining: 0 };
}