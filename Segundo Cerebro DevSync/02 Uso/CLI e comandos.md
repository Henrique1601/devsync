---
tipo: referencia
versao: "0.5.0"
atualizado: 2026-10-16
tags: [devsync, referencia]
cssclasses: [devsync]
fontes: ["src/cli.js"]
---
# ⌨️ CLI e comandos

Execute na pasta do DevSync, com Node.js 22+ e Git. O serviço precisa estar ativo para os comandos de controle.

## Iniciar

```powershell
Set-Location "C:/Users/henri/Programacao/Projetos/devsync"
npm start
```

## Consultar e cadastrar

```powershell
node src/cli.js help
node src/cli.js status
node src/cli.js metrics
node src/cli.js dashboard
node src/cli.js diagnose "C:/Projetos/meu-crm"
node src/cli.js add "C:/Projetos/meu-crm"
node src/cli.js clone "https://github.com/usuario/projeto.git" "C:/Projetos/nova-pasta"
node src/cli.js history ID_DO_PROJETO 100
```

## Controle e diagnóstico Git

```powershell
node src/cli.js sync ID_DO_PROJETO
node src/cli.js sync-all
node src/cli.js diff ID_DO_PROJETO
node src/cli.js predict-conflicts ID_DO_PROJETO
node src/cli.js stash-sync ID_DO_PROJETO [--no-pop]
node src/cli.js pause ID_DO_PROJETO
node src/cli.js resume ID_DO_PROJETO
node src/cli.js push-on ID_DO_PROJETO
node src/cli.js push-off ID_DO_PROJETO
node src/cli.js checkpoint-on ID_DO_PROJETO
node src/cli.js checkpoint-off ID_DO_PROJETO
node src/cli.js settings ID_DO_PROJETO 30 60 "src/**,README.md"
```

## Webhooks e Notificações

```powershell
node src/cli.js webhook-config "https://discord.com/api/webhooks/..." discord
node src/cli.js webhook-config "https://api.telegram.org/bot.../sendMessage" telegram CHAT_ID
node src/cli.js webhook-test
node src/cli.js webhook-off
```

## Servidor MCP (Agentes de IA)

Para conectar ferramentas como Claude Code, Cursor ou Antigravity:

```powershell
node src/cli.js mcp
```

## Painel remoto e Coordenador

```powershell
node src/cli.js check-remote "https://seu-coordenador.com"
node src/cli.js remote-config "https://seu-coordenador.com" TOKEN DEVICE_ID "Casa"
node src/cli.js remote-off
node src/cli.js coordinator
```

← [[00 Comece aqui]]
