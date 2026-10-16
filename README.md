# DevSync 0.4

[![CI](https://github.com/Henrique1601/devsync/actions/workflows/ci.yml/badge.svg)](https://github.com/Henrique1601/devsync/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/Henrique1601/devsync)](https://github.com/Henrique1601/devsync/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D22-brightgreen.svg)](https://nodejs.org)

Sincronização Git resiliente entre seus computadores (Casa e Trabalho), com aplicativo de bandeja para Windows, CLI, painel local com Dark/Light mode, servidor MCP para agentes de IA, coordenador remoto e checkpoints optativos. O GitHub transporta o código; o coordenador acompanha dispositivos e pedidos.

## Segundo cérebro no Obsidian

Abra a pasta `Segundo Cerebro DevSync` como cofre no Obsidian e comece por [00 Comece aqui](Segundo%20Cerebro%20DevSync/00%20Comece%20aqui.md). O cofre contém guias de uso, rotina Casa/Trabalho, diagnóstico, arquitetura, mapa Canvas e modelos de decisões, incidentes e sessões de trabalho. Nenhum plugin de comunidade é necessário. Consulte [Como usar este cofre](Segundo%20Cerebro%20DevSync/Como%20usar%20este%20cofre.md).

## Usar o aplicativo Windows

Baixe o executável diretamente na página de [**Releases no GitHub**](https://github.com/Henrique1601/devsync/releases):
- **Instalador (`DevSync.Setup.0.4.0.exe`):** Instala o aplicativo no Windows, cria atalhos no menu iniciar e suporta inicialização automática com o sistema.
- **Portátil (`DevSync.0.4.0.Portable.exe`):** Executável único de arquivo único que roda diretamente sem necessidade de instalação.

O aplicativo contém seu próprio runtime integrado; requer apenas Git instalado no computador e autenticação Git configurada. O instalador ainda não possui certificado de assinatura comercial (ao abrir pela primeira vez, clique em *"Mais informações"* -> *"Executar assim mesmo"*).

Abra o DevSync. Para um repositório já baixado, use **Selecionar pasta** e **Cadastrar**. Para baixar um novo, use **Clonar do GitHub**, informe a URL HTTPS e o caminho absoluto de uma nova pasta. Repositórios privados usam as credenciais já configuradas no Git.

### Novidades da versão 0.4:
- 🌙 **Tema Escuro & Claro:** Seletor de tema no topo com persistência local.
- ⚡ **Sincronização em Lote (`Sync All`):** Botão no aplicativo, bandeja e terminal para atualizar todos os seus projetos de uma só vez.
- 🔍 **Visualizador de Diffs Seguro:** Veja quais arquivos mudaram e commits pendentes com realce sintático, protegendo segredos (`.env`, `*.key`).
- 📦 **Stash Seguro + Sincronizar:** Guarde alterações locais pendentes em Stash seguro, receba as novidades do outro PC por fast-forward e restaure o Stash automaticamente com 1 clique.
- 🤖 **Servidor MCP Nativo:** Controle o DevSync diretamente por agentes de IA (Claude Code, Cursor, Antigravity) via stdio.
- 🗄️ **Coordenador SQLite:** Suporte a banco transacional SQLite usando `node:sqlite` nativo (`DEVSYNC_COORDINATOR_STORAGE=sqlite`).

## Servidor MCP para Agentes de IA

Você pode conectar o DevSync como ferramenta para qualquer assistente ou agente compatível com Model Context Protocol (MCP).

No arquivo de configuração do seu cliente (ex: `claude_desktop_config.json` ou Cursor/Antigravity):

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

Ferramentas disponibilizadas pelo servidor MCP:
- `devsync_status`: Lista projetos cadastrados, branches e status de sincronização.
- `devsync_sync`: Sincroniza um projeto específico.
- `devsync_sync_all`: Sincroniza todos os projetos ativos em lote.
- `devsync_diff`: Inspeciona diff e arquivos modificados com proteção a segredos.
- `devsync_stash_sync`: Executa Stash seguro, puxa o remoto e reaplica alterações.
- `devsync_diagnose`: Avalia integridade Git de qualquer pasta local.
- `devsync_history`: Consulta os últimos eventos e histórico de sincronizações.
- `devsync_pause_resume`: Pausa ou retoma automações de um projeto.

## Executar pelo código e CLI

Requisitos: Node.js 22+ e Git. O daemon e a CLI usam somente módulos nativos e funcionam sem instalar dependências npm.

```powershell
# Iniciar o serviço local em background:
npm start

# Ou executar comandos diretamente pelo terminal:
node src/cli.js status
node src/cli.js sync-all
node src/cli.js diff ID_DO_PROJETO
node src/cli.js stash-sync ID_DO_PROJETO
node src/cli.js sync ID_DO_PROJETO
node src/cli.js check-remote https://seu-coordenador.com
node src/cli.js dashboard
```

Para executar o desktop a partir do código ou compilar o executável:

```powershell
npm ci
npm run desktop
# Compilar instalador e portátil Windows:
npm run dist
```

## Publicar o Coordenador Remoto

O coordenador conecta seus computadores de Casa e Trabalho através de um servidor seguro com HTTPS:

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy)

Consulte [configuração do servidor remoto](docs/REMOTE.md) e [implantação e backups](docs/DEPLOYMENT.md). É possível rodar em VPS com Docker Compose + Caddy (`compose.yaml`) ou no Render com disco persistente (`render.yaml`).

## Verificação e Testes

```powershell
npm test
```

A suíte conta com **42 testes automatizados** cobrindo sincronização Git, fast-forward, preservação de alterações, detecção de divergência, locks anti-duplicação, checkpoints optativos, servidor MCP, Stash seguro, diffs, persistência SQLite e segurança contra ReDoS.

Consulte [decisões iniciais](docs/ADR-001.md), [decisões da versão 0.3](docs/ADR-002.md) e [validação da entrega](docs/VALIDATION.md).
