---
tipo: referencia
versao: "0.8.0"
atualizado: 2026-10-17
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

## Atalhos Globais de Teclado & Spotlight (Windows Desktop)

| Atalho | Ação |
| --- | --- |
| `Ctrl+Shift+S` | Dispara a sincronização de todos os projetos ativos com notificação |
| `Ctrl+Shift+D` | Abre / foca a janela principal do DevSync |
| `Ctrl+Shift+H` | Alterna a exibição do DevSync Dynamic HUD (pílula flutuante translúcida / Spotlight) |
| `Alt+C` (no HUD) | Abre o projeto selecionado diretamente no VS Code |
| `Alt+G` (no HUD) | Abre o repositório do projeto selecionado no GitHub |
| `Alt+D` (no HUD) | Abre o painel local para inspeção de Diffs do projeto |
| `Enter` (no HUD) | Dispara sincronização instantânea do projeto selecionado |
| `Esc` (no HUD) | Recolhe a Command Palette de volta para a pílula compacta |

## Consultar e cadastrar

```powershell
node src/cli.js help
node src/cli.js status
node src/cli.js metrics
node src/cli.js dashboard
node src/cli.js diagnose "C:/Projetos/meu-crm"
node src/cli.js add "C:/Projetos/meu-crm"
node src/cli.js add-batch "C:/Projetos/app1" "C:/Projetos/app2"
node src/cli.js import "C:/Users/henri/Programacao"
node src/cli.js clone "https://github.com/usuario/projeto.git" "C:/Projetos/nova-pasta"
node src/cli.js history ID_DO_PROJETO 100
```

## AI Morning Catch-Up & Retomada de Contexto

```powershell
# Gerar briefing matinal com IA/heurística e registrar no diário do Obsidian
node src/cli.js catch-up ID_DO_PROJETO

# Briefing do primeiro projeto ativo ou de todos
node src/cli.js catch-up
```

## Repo Scout & Worktrees

```powershell
# Varrer e descobrir repositórios Git em pastas locais
node src/cli.js scout "C:/Users/henri/Programacao"

# Sincronizar branch secundária em background via worktree isolada
node src/cli.js worktree-sync ID_DO_PROJETO feature-login
```

## Diário de Bordo no Obsidian & P2P LAN

```powershell
# Gerar diário de bordo e resumo de produtividade em Markdown no Obsidian
node src/cli.js daily-summary 2026-10-17

# Listar instâncias do DevSync detectadas na rede local via UDP Beacon
node src/cli.js p2p-peers
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

## Varredura de Segredos e Resolução com IA

```powershell
# Escanear diff e alterações em busca de chaves/tokens
node src/cli.js scan-secrets ID_DO_PROJETO

# Resolver conflito em arquivo com inteligência artificial / heurística
node src/cli.js ai-resolve ID_DO_PROJETO caminho/do/arquivo.js
```

## Webhooks e Notificações

```powershell
node src/cli.js webhook-config "https://discord.com/api/webhooks/..." discord
node src/cli.js webhook-config "https://api.telegram.org/bot.../sendMessage" telegram CHAT_ID
node src/cli.js webhook-test
node src/cli.js webhook-off
```

## Servidor MCP (Agentes de IA)

Para conectar ferramentas como Claude Code, Cursor ou Antigravity via stdio com as 16 ferramentas disponíveis:

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
