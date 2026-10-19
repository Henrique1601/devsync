# DevSync 0.8

[![CI](https://github.com/Henrique1601/devsync/actions/workflows/ci.yml/badge.svg)](https://github.com/Henrique1601/devsync/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/Henrique1601/devsync)](https://github.com/Henrique1601/devsync/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D22-brightgreen.svg)](https://nodejs.org)

Sincronização Git resiliente e inteligente entre seus computadores (Casa e Trabalho). Conta com aplicativo desktop com bandeja do sistema e HUD Spotlight para Windows, CLI completa, painel local com temas Dark e Light, Servidor MCP nativo para agentes de IA, reconciliação de conflitos e Morning Catch-up com IA (Google Gemini), sincronização P2P LAN, isolamento por Git Worktrees, scanner de segredos em tempo real, webhooks e coordenador remoto com SQLite persistente.

O GitHub transporta o código de forma segura; o coordenador opcional acompanha dispositivos e requisições remotas.

---

## 🧠 Segundo Cérebro no Obsidian

Abra a pasta `Segundo Cerebro DevSync` como cofre no Obsidian e comece por [00 Comece aqui](Segundo%20Cerebro%20DevSync/00%20Comece%20aqui.md). O cofre contém guias de uso, rotina Casa/Trabalho, diagnóstico, arquitetura, mapa Canvas e modelos de decisões, incidentes e diários de bordo gerados automaticamente. Nenhum plugin de comunidade é necessário. Consulte [Como usar este cofre](Segundo%20Cerebro%20DevSync/Como%20usar%20este%20cofre.md).

---

## 💻 Usar o Aplicativo Windows

Baixe o executável diretamente na página de [**Releases no GitHub**](https://github.com/Henrique1601/devsync/releases):
- **Instalador (`DevSync Setup 0.8.0.exe`):** Instala o aplicativo no Windows, cria atalhos no menu iniciar e suporta inicialização automática com o sistema.
- **Portátil (`DevSync 0.8.0 Portable.exe`):** Executável único de arquivo único que roda diretamente sem necessidade de instalação prévia.

O aplicativo contém seu próprio runtime integrado; requer apenas Git instalado no computador e credenciais Git autenticadas.

Abra o DevSync. Para um repositório já existente, use **Selecionar pasta** e **Cadastrar**. Para baixar um novo, use **Clonar do GitHub**, informe a URL HTTPS e o caminho absoluto da pasta destino. Repositórios privados usam as credenciais já configuradas no Git.

---

## ✨ Recursos & Evolução do DevSync

### 🚀 Novidades da Versão 0.8
- 🧠 **AI Morning Catch-up:** Briefing matinal executivo gerado via IA (Google Gemini) que lê os diffs recebidos do outro PC, extrai tarefas/TODOs e injeta a seção de contexto automaticamente na sua nota diária do Obsidian.
- ⚡ **HUD Spotlight Command Palette (`Ctrl+Shift+Space`):** Interface flutuante ultrarrápida estilo Spotlight para busca de repositórios, sincronização instantânea e comandos sem precisar abrir a janela principal.
- 🛡️ **Store Auto-Heal & Fsync:** Camada de armazenamento JSON com durabilidade transacional (gravação atômica via arquivo temporário + `fsync`) e auto-recuperação transparente contra quedas de energia ou arquivos nulos.

### 📡 Versão 0.7
- 🌐 **P2P LAN Sync:** Sincronização direta de commits entre máquinas conectadas na mesma rede local via Git Bundles, sem depender de conexão remota ou push/pull na nuvem.
- 🌿 **Git Worktrees Isolados:** Sincronização contínua de branches secundárias em diretórios paralelos sem interromper ou chavear a branch de trabalho atual.
- 🔭 **Repo Scout:** Descoberta recursiva e automática de repositórios Git no computador com análise de status e registro facilitado.
- 📝 **Obsidian Daily Logs:** Diários diários automáticos registrando commits enviados, recebidos e tempo economizado no seu Segundo Cérebro.
- 🏷️ **AI Conventional Commits:** Sugestão automática de mensagens semânticas padronizadas baseadas nas alterações do código.

### 🔒 Versão 0.6
- 🛡️ **Zero-Leak Secret Scanner:** Varredura proativa em tempo real de diffs e arquivos modificados bloqueando commits de chaves de API, tokens JWT, senhas e certificados privados.
- 🤖 **AI Conflict Resolver:** Reconciliação semântica inteligente de conflitos com Google Gemini 2.5 Flash (`src/ai.js`) e fallback heurístico offline.
- ⌨️ **Global Hotkeys & 3-Way Merge:** Atalhos globais e algoritmos aprofundados para resolução de divergências.

### 🔔 Versão 0.5
- 📢 **Webhooks Integrados:** Notificações em tempo real para Discord, Telegram e endpoints HTTP genéricos a cada sincronização ou erro.
- 📊 **Painel de Métricas:** Cálculo automático de tempo economizado, volume de commits sincronizados e histórico persistente.
- 🔮 **Predição de Conflitos:** Diagnóstico preventivo em memória que prevê potenciais divergências antes do merge.

### 🌙 Versão 0.4
- 🌓 **Tema Escuro & Claro:** Interface refinada com persistência local de preferência.
- ⚡ **Sincronização em Lote (`Sync All`):** Sincronize todos os repositórios cadastrados com um único clique ou comando.
- 🔍 **Visualizador de Diffs Seguro:** Inspeção de arquivos alterados e commits pendentes com proteção contra vazamento de variáveis de ambiente.
- 📦 **Stash Seguro + Sincronizar:** Guarda alterações locais não comitadas, aplica fast-forward do remoto e restaura o stash com 1 clique.
- 🤖 **Servidor MCP Nativo:** Integração com assistentes de IA (Claude Code, Cursor, Antigravity) via Model Context Protocol.
- 🗄️ **Coordenador SQLite:** Suporte a banco SQLite transacional nativo (`node:sqlite`).

---

## 🤖 Servidor MCP para Agentes de IA

Você pode conectar o DevSync como ferramenta nativa para qualquer assistente ou agente de IA compatível com Model Context Protocol (MCP).

No arquivo de configuração do seu assistente (ex: `claude_desktop_config.json` ou Cursor/Antigravity):

```json
{
  "mcpServers": {
    "devsync": {
      "command": "node",
      "args": ["C:\\caminho\\para\\devsync\\src\\cli.js", "mcp"]
    }
  }
}
```

### Ferramentas Disponibilizadas:
| Ferramenta | Descrição |
| :--- | :--- |
| `devsync_status` | Lista repositórios cadastrados, branches ativas e status de sincronização. |
| `devsync_sync` | Sincroniza um projeto específico sob demanda. |
| `devsync_sync_all` | Sincroniza todos os projetos cadastrados em lote. |
| `devsync_diff` | Inspeciona diffs e arquivos modificados com proteção a segredos. |
| `devsync_stash_sync` | Executa Stash seguro, puxa alterações remotas e reaplica modificações locais. |
| `devsync_diagnose` | Avalia a integridade Git e configurações de qualquer pasta local. |
| `devsync_history` | Consulta os últimos eventos e histórico de sincronizações registradas. |
| `devsync_pause_resume` | Pausa ou retoma automações e monitoramento de um projeto. |

---

## 💻 Executar pelo Código e Terminal (CLI)

**Requisitos:** Node.js 22+ e Git. O daemon e a CLI utilizam apenas módulos nativos do Node.js e funcionam sem dependências runtime externas.

```powershell
# Iniciar o serviço local em segundo plano:
npm start

# Comandos principais da CLI:
node src/cli.js status                   # Exibe status e conexão de todos os projetos
node src/cli.js sync-all                 # Sincroniza todos os projetos em lote
node src/cli.js catch-up ID_DO_PROJETO   # Briefing matinal e resumo executivo com IA
node src/cli.js scout C:\Projetos        # Descobre novos repositórios Git automaticamente
node src/cli.js stash-sync ID_DO_PROJETO # Guarda alterações em stash seguro e sincroniza
node src/cli.js diff ID_DO_PROJETO       # Exibe diff seguro sem expor credenciais
node src/cli.js scan-secrets ID_PROJETO  # Executa varredura de segredos
node src/cli.js metrics                  # Exibe métricas e horas economizadas
node src/cli.js daily-summary            # Compila diário de produtividade no Obsidian
node src/cli.js p2p-peers                # Lista nós DevSync detectados na rede local (LAN)
node src/cli.js dashboard                # Exibe URL e token do painel web
```

### Compilar ou Executar o Desktop Electron:

```powershell
npm ci
npm run desktop

# Gerar executáveis Windows (Instalador NSIS e Portátil):
npm run dist
```

---

## ☁️ Publicar o Coordenador Remoto

O coordenador conecta seus computadores de Casa e Trabalho através de um servidor seguro com HTTPS:

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy)

Consulte os guias detalhados de [configuração do servidor remoto](docs/REMOTE.md) e [implantação e backups](docs/DEPLOYMENT.md). É possível rodar em VPS própria com Docker Compose + Caddy (`compose.yaml`) ou em nuvem com disco persistente (`render.yaml`).

---

## 🧪 Verificação & Testes Automatizados

```powershell
npm test
```

A suíte conta com **67 testes automatizados** cobrindo sincronização Git, fast-forward, isolamento com Git Worktrees, P2P LAN com bundles, auto-heal de storage JSON com durabilidade `fsync`, scanner de segredos, predição de conflitos, IA conflict resolver com fallback heurístico, Morning Catch-up, webhooks, servidor MCP, locks anti-duplicação, checkpoints optativos e segurança contra ReDoS.

Consulte [decisões iniciais (ADR-001)](docs/ADR-001.md), [decisões da versão 0.3 (ADR-002)](docs/ADR-002.md) e o relatório de [validação da entrega](docs/VALIDATION.md).

---

## 📄 Licença

Distribuído sob a licença MIT (2026 Henrique Bezerra Dos Santos). Consulte [LICENSE](LICENSE) para mais detalhes.
