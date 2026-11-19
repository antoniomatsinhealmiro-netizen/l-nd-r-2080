import fs from 'node:fs';
import path from 'node:path';

const DB_DIR = path.resolve('data');
const DB_FILE = path.join(DB_DIR, 'groups.json');

function ensureDb() {
  fs.mkdirSync(DB_DIR, { recursive: true });
  if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, '{}', 'utf8');
}
export function readDb() {
  ensureDb();
  try { return JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); }
  catch { return {}; }
}
export function writeDb(db) {
  ensureDb();
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
}
export function getGroup(jid) {
  const db = readDb();
  if (!db[jid]) {
    db[jid] = {
      name: 'Lëndärįø', ownerName: 'Almiro',
      ownerNumber: '258858519051', support: '',
      table: 'A tabela ainda não foi configurada neste grupo.',
      payment: 'Os dados de pagamento ainda não foram configurados neste grupo.',
      nano: {}, nanoEnabled: true, welcome: false, autoReply: true,
      rentals: {}, warnings: {}
    };
    writeDb(db);
  }
  return db[jid];
}
export function updateGroup(jid, patch) {
  const db = readDb();
  const current = db[jid] || getGroup(jid);
  db[jid] = { ...current, ...patch };
  writeDb(db);
  return db[jid];
}
