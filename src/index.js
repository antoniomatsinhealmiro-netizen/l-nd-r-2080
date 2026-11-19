import makeWASocket, {
  useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion
} from '@whiskeysockets/baileys';
import pino from 'pino';
import qrcode from 'qrcode-terminal';
import { getGroup, updateGroup } from './store.js';

const BOT_NAME = process.env.BOT_NAME || 'Lëndärįø';
const OWNER_NAME = process.env.OWNER_NAME || 'Almiro';
const OWNER_NUMBER = (process.env.OWNER_NUMBER || '258858519051').replace(/\D/g, '');
const PREFIX = '.';
const digits = s => (s || '').replace(/\D/g, '');
const textOf = m => m.message?.conversation
  || m.message?.extendedTextMessage?.text
  || m.message?.imageMessage?.caption
  || m.message?.videoMessage?.caption || '';

async function start() {
  const { state, saveCreds } = await useMultiFileAuthState('./auth');
  let version;
  try { ({ version } = await fetchLatestBaileysVersion()); } catch {}
  const sock = makeWASocket({
    auth: state, version, logger: pino({ level: 'silent' }),
    browser: ['Lendar Bot', 'Chrome', '1.0.0'],
    markOnlineOnConnect: false
  });
  sock.ev.on('creds.update', saveCreds);
  sock.ev.on('connection.update', ({ connection, qr, lastDisconnect }) => {
    if (qr) {
      console.log('\\nLeia este QR com o WhatsApp da conta do bot:');
      qrcode.generate(qr, { small: true });
    }
    if (connection === 'open') console.log(`${BOT_NAME} ligado.`);
    if (connection === 'close') {
      const code = lastDisconnect?.error?.output?.statusCode;
      if (code !== DisconnectReason.loggedOut) {
        console.log('Ligação interrompida. A tentar reconectar...');
        setTimeout(() => start().catch(console.error), 3000);
      } else console.log('Sessão terminada. Apaga a pasta auth apenas se quiseres ligar outra conta.');
    }
  });

  sock.ev.on('group-participants.update', async update => {
    const cfg = getGroup(update.id);
    if (!cfg.welcome || update.action !== 'add') return;
    for (const participant of update.participants) {
      await sock.sendMessage(update.id, {
        text: `👋 Bem-vindo(a), @${participant.split('@')[0]}!\\n🤖 ${BOT_NAME}`,
        mentions: [participant]
      });
    }
  });

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;
    for (const msg of messages) {
      if (!msg.message || msg.key.fromMe) continue;
      const jid = msg.key.remoteJid;
      if (!jid || jid === 'status@broadcast') continue;
      const isGroup = jid.endsWith('@g.us');
      const sender = isGroup ? msg.key.participant : jid;
      const body = textOf(msg).trim();
      if (!body) continue;
      const lower = body.toLowerCase();
      const cfg = isGroup ? getGroup(jid) : null;
      let reply = '';

      const menu = () => `🤖 ${BOT_NAME}\\n\\nTabela / 01\\nPagamento / 02\\nMegas / 03\\nIlimitado / 04\\nMenu / 00\\n\\nDono: ${OWNER_NAME}\\n`;
      if (['menu','00','.menu'].includes(lower)) reply = menu();
      else if (['tabela','01'].includes(lower)) reply = isGroup ? cfg.table : 'Pede a tabela no grupo de vendas.';
      else if (['pagamento','02'].includes(lower)) reply = isGroup ? cfg.payment : 'Consulta os dados de pagamento no grupo.';
      else if (['megas','03'].includes(lower)) reply = 'Para ver os pacotes disponíveis, escreve Tabela.';
      else if (['ilimitado','04'].includes(lower)) reply = 'Consulta a disponibilidade do pacote ilimitado com o administrador.';

      if (isGroup && cfg?.autoReply && cfg.nanoEnabled && cfg.nano[lower]) reply = cfg.nano[lower];

      if (isGroup && body.startsWith(PREFIX)) {
        const parts = body.slice(1).trim().split(/\s+/);
        const cmd = (parts.shift() || '').toLowerCase();
        const args = parts;
        const meta = await sock.groupMetadata(jid).catch(() => null);
        const admins = meta?.participants?.filter(p => p.admin).map(p => p.id) || [];
        const botJid = sock.user?.id?.split(':')[0] + '@s.whatsapp.net';
        const isAdmin = admins.includes(sender);
        const isOwner = digits(sender) === OWNER_NUMBER;
        const canManage = isAdmin || isOwner;
        const needAdmin = () => isAdmin ? '' : 'Este comando só pode ser usado por um administrador do grupo.';
        const set = patch => updateGroup(jid, patch);

        if (['ajuda','help'].includes(cmd)) reply = 'Comandos ativos: .verconfig, .settabela, .setpagamento, .setnome, .setdono, .setnumero, .setsuporte, .nano on/off, .nanoadd, .nanolist, .nanodel, .limparnano, .bemvindo on/off, .autoresposta on/off, .alugar, .verprazo, .ping, .dono, .suporte.';
        else if (cmd === 'ping') reply = '🏓 Pong! Lëndärįø está ativo.';
        else if (cmd === 'dono') reply = `Dono: ${OWNER_NAME}\\nWhatsApp: +${OWNER_NUMBER}`;
        else if (cmd === 'suporte') reply = cfg.support || `Fala com ${OWNER_NAME}: +${OWNER_NUMBER}`;
        else if (cmd === 'verconfig') reply = `Grupo: ${meta?.subject || jid}\\nNome: ${cfg.name}\\nBoas-vindas: ${cfg.welcome ? 'ON' : 'OFF'}\\nNANO: ${cfg.nanoEnabled ? 'ON' : 'OFF'}`;
        else if (cmd === 'settabela') reply = canManage ? (set({table: args.join(' ') || 'Tabela não definida.'}), 'Tabela deste grupo atualizada.') : needAdmin();
        else if (cmd === 'setpagamento') reply = canManage ? (set({payment: args.join(' ') || 'Pagamento não definido.'}), 'Pagamento deste grupo atualizado.') : needAdmin();
        else if (cmd === 'setnome') reply = canManage ? (set({name: args.join(' ') || cfg.name}), 'Nome atualizado.') : needAdmin();
        else if (cmd === 'setdono') reply = canManage ? (set({ownerName: args.join(' ') || cfg.ownerName}), 'Nome do responsável atualizado.') : needAdmin();
        else if (cmd === 'setnumero') reply = canManage ? (set({ownerNumber: digits(args.join(' ')) || cfg.ownerNumber}), 'Número do responsável atualizado.') : needAdmin();
        else if (cmd === 'setsuporte') reply = canManage ? (set({support: args.join(' ')}), 'Suporte atualizado.') : needAdmin();
        else if (cmd === 'nano' && ['on','off'].includes((args[0]||'').toLowerCase())) reply = canManage ? (set({nanoEnabled: args[0].toLowerCase()==='on'}), `NANO ${args[0].toUpperCase()}.`) : needAdmin();
        else if (cmd === 'nanoadd') {
          if (!canManage) reply = needAdmin();
          else if (args.length < 2) reply = 'Usa: .nanoadd palavra resposta';
          else { const key=args.shift().toLowerCase(); set({nano:{...cfg.nano,[key]:args.join(' ')}}); reply=`Comando NANO "${key}" guardado.`; }
        }
        else if (cmd === 'nanolist') reply = Object.keys(cfg.nano).length ? Object.keys(cfg.nano).join('\\n') : 'Ainda não há comandos NANO.';
        else if (cmd === 'nanodel') {
          if (!canManage) reply = needAdmin();
          else { const key=(args[0]||'').toLowerCase(); const nano={...cfg.nano}; delete nano[key]; set({nano}); reply='Comando NANO removido.'; }
        }
        else if (cmd === 'limparnano') reply = canManage ? (set({nano:{}}), 'Comandos NANO apagados.') : needAdmin();
        else if (cmd === 'bemvindo' && ['on','off'].includes((args[0]||'').toLowerCase())) reply = canManage ? (set({welcome:args[0]==='on'}), `Boas-vindas ${args[0].toUpperCase()}.`) : needAdmin();
        else if (cmd === 'autoresposta' && ['on','off'].includes((args[0]||'').toLowerCase())) reply = canManage ? (set({autoReply:args[0]==='on'}), `Respostas automáticas ${args[0].toUpperCase()}.`) : needAdmin();
        else if (cmd === 'alugar') reply = canManage ? 'O módulo de aluguer ainda precisa de configuração de cobrança e datas. Não existe cobrança automática nesta versão.' : needAdmin();
        else if (cmd === 'verprazo') reply = 'Este grupo ainda não tem um prazo de aluguer registado.';
        else if (cmd === 'ban' || cmd === 'kick') {
          if (!canManage) reply = needAdmin();
          else {
            const target = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
            if (!target) reply = `Marca o membro. Exemplo: .${cmd} @utilizador`;
            else { await sock.groupParticipantsUpdate(jid,[target],'remove'); reply='Membro removido do grupo.'; }
          }
        }
        else if (cmd === 'promover' || cmd === 'rebaixar') {
          if (!canManage) reply = needAdmin();
          else {
            const target = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
            if (!target) reply = `Marca o membro. Exemplo: .${cmd} @utilizador`;
            else { await sock.groupParticipantsUpdate(jid,[target],cmd==='promover'?'promote':'demote'); reply='Permissões atualizadas.'; }
          }
        }
        else if (cmd === 'fechar' || cmd === 'abrir') {
          if (!canManage) reply = needAdmin();
          else { await sock.groupSettingUpdate(jid,cmd==='fechar'?'announcement':'not_announcement'); reply='Definições do grupo atualizadas.'; }
        }
        else if (cmd === 'link') {
          if (!canManage) reply = needAdmin();
          else { const code=await sock.groupInviteCode(jid); reply=`Link do grupo: https://chat.whatsapp.com/${code}`; }
        }
        else if (cmd === 'status') reply = `🤖 ${BOT_NAME}: online nesta sessão.`;
      }

      if (reply) await sock.sendMessage(jid, { text: reply }, { quoted: msg });
    }
  });
}
start().catch(err => { console.error('Erro ao iniciar:', err); process.exitCode = 1; });
