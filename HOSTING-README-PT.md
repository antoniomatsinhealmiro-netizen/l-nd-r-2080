# Lëndärįø BOT — pacote para hospedagem

Este pacote foi preparado para alojamento Node.js/Docker, não para execução diária no Termux.

## Requisitos da hospedagem
- Node.js 20+ (preferível Node 22) ou Docker.
- Processo worker/serviço que permaneça ativo.
- Armazenamento persistente (volume/disco) montado para `/app/auth` e `/app/data`.
- Acesso aos logs para ler o QR na primeira ligação.
- Reinício automático do processo.

## Opção A — hospedagem Node.js
1. Envia esta pasta para um repositório Git privado.
2. Na hospedagem, cria um serviço Node.js a partir do repositório.
3. Build command: `npm install`
4. Start command: `npm start`
5. Configura as variáveis de ambiente do ficheiro `.env.example`.
6. Configura armazenamento persistente e monta-o para as pastas `auth` e `data`.
7. Consulta os logs do serviço para obter o QR e associa o WhatsApp da conta do bot.
8. Mantém as pastas `auth` e `data` no volume persistente durante atualizações.

## Opção B — hospedagem com Docker
Executa `docker compose up -d --build`.
Consulta os logs com `docker compose logs -f lendar-bot` para ver o QR.

## Muito importante
- Não publiques nem partilhes o QR, a pasta `auth`, credenciais ou variáveis privadas.
- Não apagues `auth`: contém a sessão da conta WhatsApp.
- Sem armazenamento persistente, a sessão pode perder-se quando a hospedagem reiniciar.
- A ligação usa Baileys, uma biblioteca não oficial. Pode desconectar, deixar de funcionar ou provocar restrições na conta. Usa uma conta de teste e respeita as regras do WhatsApp.
- O bot não deve enviar spam. Usa apenas em grupos onde tens autorização.
- Esta é uma base inicial: ainda não implementa os 75 comandos. Aluguer automático, pagamentos, detector fiável de comprovativos e painel web ainda não estão implementados. Confirma pagamentos diretamente no M-Pesa/E-Mola.
- Não há garantia de hospedagem gratuita permanente. Verifica preços, limites, política de processos contínuos e volumes persistentes antes de escolher um fornecedor.
