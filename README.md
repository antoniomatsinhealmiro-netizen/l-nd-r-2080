#const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');

// ==========================================
// DADOS DO BOT E DO DONO
// ==========================================
const config = {
    botName: "lendário bote",
    botNumber: "841482598",
    ownerName: "Almiro",
    ownerNumber: "858519051"
};

// ==========================================
// TEXTOS EDITÁVEIS (TABELA E PAGAMENTO)
// ==========================================
let textoTabela = `📊 *TABELA DE MEGAS - LENDÁRIO BOTE*

🔹 1 GB — 20 MT
🔹 2 GB — 38 MT
🔹 5 GB — 90 MT
🔹 10 GB — 175 MT

💳 Envie *!pagamento* para ver os dados de transferência.`;

let textoPagamento = `💳 *DADOS DE PAGAMENTO - LENDÁRIO BOTE*

📲 *M-Pesa / e-Mola:* 841482598 (Almiro)
📞 *Suporte / Dono:* 858519051 (Almiro)

Após transferir, envie o comprovativo aqui junto com o número que vai receber os megas.`;

let boasVindasAtivo = true;

async function iniciarBot() {
    const { state, saveCreds } = await useMultiFileAuthState('./auth_info');

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: true,
        logger: pino({ level: 'silent' })
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) iniciarBot();
        } else if (connection === 'open') {
            console.log(`✅ ${config.botName} (${config.botNumber}) conectado! Dono: ${config.ownerName} (${config.ownerNumber})`);
        }
    });

    // Mensagem automática de boas-vindas em grupos
    sock.ev.on('group-participants.update', async (anu) => {
        if (!boasVindasAtivo) return;
        try {
            if (anu.action === 'add') {
                for (const num of anu.participants) {
                    const userTag = `@${num.split('@')[0]}`;
                    const msgBemVindo = `👋 Bem-vindo(a) ${userTag} ao grupo!

Sou o *${config.botName}*, gerido por *${config.ownerName}*.
Digite *!menu* para ver os comandos ou *!tabela* para ver os pacotes de megas.`;
                    await sock.sendMessage(anu.id, { text: msgBemVindo, mentions: [num] });
                }
            }
        } catch (err) {
            console.log('Erro nas boas-vindas:', err);
        }
    });

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const from = msg.key.remoteJid;
        const isGroup = from.endsWith('@g.us');
        const sender = msg.key.participant || from;
        const isOwner = sender.includes(config.ownerNumber);

        const body =
            msg.message.conversation ||
            msg.message.extendedTextMessage?.text ||
            msg.message.imageMessage?.caption ||
            "";

        const comando = body.trim().toLowerCase();

        // ==========================================
        // COMANDOS PÚBLICOS (CLIENTES E GRUPO)
        // ==========================================
        if (comando === '!menu' || comando === 'menu') {
            const menuTexto = `🤖 *${config.botName.toUpperCase()}*
📱 *Número do Bot:* ${config.botNumber}
👑 *Dono:* ${config.ownerName} (${config.ownerNumber})

📌 *COMANDOS PÚBLICOS:*
• *!menu* — Mostra este menu completo
• *!tabela* — Ver tabela de megas e preços
• *!pagamento* — Dados de pagamento
• *!dono* — Informações do dono (${config.ownerName})
• *!info* — Informações do ${config.botName}
• *!ping* — Testar velocidade do bot

🔐 *COMANDOS DO DONO (${config.ownerName}):*
• *!status* — Ver status do sistema
• *!aviso <texto>* — Enviar aviso geral
• *!settab <texto>* — Alterar tabela de megas
• *!setpag <texto>* — Alterar dados de pagamento
• *!todos <texto>* — Marcar todos do grupo
• *!abrir* — Abrir grupo para mensagens
• *!fechar* — Fechar grupo (só admins falam)
• *!bv on / !bv off* — Ativar/desativar boas-vindas`;
            await sock.sendMessage(from, { text: menuTexto }, { quoted: msg });
        }

        else if (comando === '!tabela' || comando === 'tabela') {
            await sock.sendMessage(from, { text: textoTabela }, { quoted: msg });
        }

        else if (comando === '!pagamento' || comando === 'pagamento') {
            await sock.sendMessage(from, { text: textoPagamento }, { quoted: msg });
        }

        else if (comando === '!dono' || comando === 'dono') {
            const donoTexto = `👑 *DONO DO ${config.botName.toUpperCase()}*

• *Nome:* ${config.ownerName}
• *Número:* ${config.ownerNumber}
• *Bot Oficial:* ${config.botName} (${config.botNumber})`;
            await sock.sendMessage(from, { text: donoTexto }, { quoted: msg });
        }

        else if (comando === '!info' || comando === 'info') {
            const infoTexto = `🤖 *INFORMAÇÕES DO BOT*

• *Nome:* ${config.botName}
• *Número:* ${config.botNumber}
• *Criador / Dono:* ${config.ownerName}
• *Contato do Dono:* ${config.ownerNumber}`;
            await sock.sendMessage(from, { text: infoTexto }, { quoted: msg });
        }

        else if (comando === '!ping') {
            await sock.sendMessage(from, { text: `🏓 Pong! *${config.botName}* está online e respondendo rápido.` }, { quoted: msg });
        }

        // ==========================================
        // COMANDOS EXCLUSIVOS DO DONO (ALMIRO)
        // ==========================================
        else if (comando === '!status') {
            if (!isOwner) return;
            const statusTexto = `⚙️ *STATUS DO SISTEMA*

• *Bot:* ${config.botName}
• *Número do Bot:* ${config.botNumber}
• *Dono:* ${config.ownerName}
• *Número do Dono:* ${config.ownerNumber}
• *Boas-vindas:* ${boasVindasAtivo ? 'Ativado ✅' : 'Desativado ❌'}
• *Estado:* Online ✅`;
            await sock.sendMessage(from, { text: statusTexto }, { quoted: msg });
        }

        else if (comando.startsWith('!aviso ')) {
            if (!isOwner) return;
            const aviso = body.slice(7).trim();
            if (!aviso) return;
            await sock.sendMessage(from, { text: `📢 *COMUNICADO DE ${config.ownerName.toUpperCase()}:*

${aviso}` });
        }

        else if (comando.startsWith('!settab ')) {
            if (!isOwner) return;
            const novaTabela = body.slice(8).trim();
            if (!novaTabela) return;
            textoTabela = novaTabela;
            await sock.sendMessage(from, { text: `✅ Tabela atualizada com sucesso por *${config.ownerName}*!` }, { quoted: msg });
        }

        else if (comando.startsWith('!setpag ')) {
            if (!isOwner) return;
            const novoPagamento = body.slice(8).trim();
            if (!novoPagamento) return;
            textoPagamento = novoPagamento;
            await sock.sendMessage(from, { text: `✅ Dados de pagamento atualizados com sucesso por *${config.ownerName}*!` }, { quoted: msg });
        }

        else if (comando.startsWith('!todos')) {
            if (!isOwner || !isGroup) return;
            const groupMetadata = await sock.groupMetadata(from);
            const participants = groupMetadata.participants.map(p => p.id);
            const mensagemExtra = body.slice(6).trim() || `Atenção pessoal! Chamada geral de *${config.ownerName}*.`;
            await sock.sendMessage(from, {
                text: `📣 *${mensagemExtra}*`,
                mentions: participants
            });
        }

        else if (comando === '!abrir') {
            if (!isOwner || !isGroup) return;
            await sock.groupSettingUpdate(from, 'not_announcement');
            await sock.sendMessage(from, { text: `🔓 Grupo aberto por *${config.ownerName}*. Todos podem enviar mensagens.` });
        }

        else if (comando === '!fechar') {
            if (!isOwner || !isGroup) return;
            await sock.groupSettingUpdate(from, 'announcement');
            await sock.sendMessage(from, { text: `🔒 Grupo fechado por *${config.ownerName}*. Apenas administradores podem enviar mensagens.` });
        }

        else if (comando === '!bv on') {
            if (!isOwner) return;
            boasVindasAtivo = true;
            await sock.sendMessage(from, { text: `✅ Boas-vindas automáticas ativadas!` }, { quoted: msg });
        }

        else if (comando === '!bv off') {
            if (!isOwner) return;
            boasVindasAtivo = false;
            await sock.sendMessage(from, { text: `❌ Boas-vindas automáticas desativadas!` }, { quoted: msg });
        }
    });
}

iniciarBot();

