import { exec } from 'child_process';
import fs from 'fs';
import { GIT_REMOTE_URL, GIT_BRANCH } from './config.js';

function execCommand(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, { cwd: process.cwd() }, (err, stdout, stderr) => {
      if (err) reject({ error: err, stderr: stderr || err.message });
      else resolve(stdout || stderr);
    });
  });
}

async function configureGitIdentity() {
  try { await execCommand('git config user.name'); } catch(e) {
    await execCommand('git config user.name "Telegram Bot Backup"');
    await execCommand('git config user.email "bot@telegram-backup.local"');
  }
}

async function initGit() {
  await configureGitIdentity();
  if (!fs.existsSync('.git')) {
    await execCommand('git init');
    if (!fs.existsSync('.gitignore')) {
      fs.writeFileSync('.gitignore', `node_modules/\nauth/\nconfig.js\n.env\ndb/*.json\n!db/.gitkeep\n*.log\n.DS_Store\n`);
    }
    if (!fs.existsSync('db')) fs.mkdirSync('db');
    if (!fs.existsSync('db/.gitkeep')) fs.writeFileSync('db/.gitkeep', '');
  }
  try { await execCommand('git rm --cached config.js 2>/dev/null'); } catch(e){}
  try { await execCommand('git remote get-url origin'); } catch(e) { await execCommand(`git remote add origin ${GIT_REMOTE_URL}`); }
  try {
    const currentUrl = (await execCommand('git remote get-url origin')).trim();
    if (currentUrl !== GIT_REMOTE_URL) await execCommand(`git remote set-url origin ${GIT_REMOTE_URL}`);
  } catch(e){}
  try { await execCommand(`git rev-parse --verify ${GIT_BRANCH}`); } catch(e) { await execCommand(`git checkout -b ${GIT_BRANCH}`); }
}

export async function backupNow(onProgress) {
  const progress = (msg) => { console.log(msg); if (onProgress) onProgress(msg); };
  try {
    progress('⚙️ Menginisialisasi Git...');
    await initGit();

    progress('📦 Menambahkan file...');
    await execCommand('git add -A');

    const status = await execCommand('git status --porcelain');
    if (!status.trim()) return { success: true, message: '✅ Tidak ada perubahan. Backup tidak diperlukan.' };

    const timestamp = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
    progress('💾 Melakukan commit...');
    await execCommand(`git commit -m "🤖 Backup - ${timestamp}"`);

    progress('📤 Push ke GitHub...');
    try {
      await execCommand(`git push origin ${GIT_BRANCH}`);
    } catch (pushError) {
      const msg = pushError.stderr || '';
      if (msg.includes('has no upstream branch')) {
        await execCommand(`git push -u origin ${GIT_BRANCH}`);
      } else if (msg.includes('fetch first') || msg.includes('rejected') || msg.includes('divergent') || msg.includes('Need to specify')) {
        // Jika terjadi divergensi / perlu fetch dulu, lakukan force push karena backup satu arah
        progress('🔄 Sinkronisasi paksa...');
        await execCommand(`git push -f origin ${GIT_BRANCH}`);
      } else if (msg.includes('push protection') || msg.includes('GH013')) {
        // Hapus file sensitif yang mungkin lolos
        await execCommand('git rm --cached config.js 2>/dev/null');
        await execCommand('git add -A');
        await execCommand(`git commit --amend -m "🤖 Backup - ${timestamp} (clean)"`);
        await execCommand(`git push -f origin ${GIT_BRANCH}`);
      } else if (msg.includes('Author identity unknown')) {
        await configureGitIdentity();
        await execCommand(`git commit --amend --reset-author --no-edit`);
        await execCommand(`git push origin ${GIT_BRANCH}`);
      } else {
        throw pushError;
      }
    }

    progress('✅ Backup berhasil!');
    return { success: true, message: `✅ Backup berhasil di-push ke GitHub!\n📁 Branch: ${GIT_BRANCH}\n🕒 ${timestamp}` };
  } catch (error) {
    progress('❌ Backup gagal!');
    return { success: false, message: `❌ Backup gagal: ${error.stderr || error.message || error}` };
  }
}