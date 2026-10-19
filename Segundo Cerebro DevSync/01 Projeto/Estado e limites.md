---
tipo: projeto
versao: "0.8.0"
atualizado: 2026-10-17
tags: [devsync, projeto]
cssclasses: [devsync]
fontes: ["package.json","docs/VALIDATION.md"]
---
# ✅ Estado e limites

Esta nota registra o estado observado em **17/10/2026**, na versão **0.8.0**.

## Implementado na Versão 0.8.0 (Next-Gen AI Catch-Up & Spotlight HUD)

- **AI Morning Catch-Up & Retomada de Contexto (`src/ai.js`, `src/daemon.js`, `src/history.js`, `src/cli.js`, `src/mcp.js`):** Briefing executivo matinal que analisa commits recentes sincronizados entre Casa e Trabalho, resume destaques em linguagem natural, detecta pendências e tags técnicas (`TODO`, `FIXME`, `HACK`) nos diffs de código, formula sugestões práticas de próximos passos e persiste a seção no Segundo Cérebro do Obsidian (`Segundo Cerebro DevSync/05 Registros/YYYY-MM-DD - Resumo Diario.md`). Possui fallback heurístico 100% determinístico caso `GEMINI_API_KEY` não esteja configurada.
- **HUD Spotlight Command Palette & Instant Switcher (`ui/hud.html`, `desktop/main.cjs`, `desktop/preload.cjs`):** Evolução da pílula translúcida flutuante para um menu Command Palette estilo Spotlight/Raycast (expansão dinâmica para 460x420 px), com busca fuzzy instantânea entre todos os repositórios cadastrados, atalhos ultra-rápidos (`Enter` sincroniza, `Alt+C` abre no VS Code via IPC nativo, `Alt+G` abre no GitHub, `Alt+D` abre diffs, `Esc` fecha) e aba dedicada para leitura do Catch-Up Matinal em cartão executivo.
- **Importação em Lote & Multi-Seleção de Pastas (`src/daemon.js`, `src/cli.js`, `desktop/main.cjs`, `ui/`):** Capacidade de selecionar múltiplas pastas de uma só vez via diálogo nativo do sistema operacional (`choose-folders` com `multiSelections`) ou varrer uma pasta raiz com subprojetos (`devsync import <pasta>` ou pelo painel web). Exibição com barra de ferramentas com contadores, checkboxes de seleção granular, botão mestre "Selecionar Todos" e cadastro em lote atômico (`add-batch`).
- **Expansão do Servidor MCP para 18 Ferramentas Corporativas:** Adição das ferramentas `devsync_catch_up` e `devsync_add_batch` ao servidor MCP nativo via stdio, permitindo que agentes autônomos realizem cadastros em lote e briefings contextuais.

## Implementado na Versão 0.7.0

- **AI Conventional Commit Generator & Diário no Obsidian (`src/ai.js`, `src/checkpoint.js`, `src/history.js`):** Geração inteligente de mensagens de commit seguindo o padrão Conventional Commits (`feat:`, `fix:`, `refactor:`, `docs:`, etc.) baseadas na análise heurística ou semântica dos diffs alterados. Exportação automatizada de resumos diários de produtividade estruturados em Markdown diretamente no Obsidian (`Segundo Cerebro DevSync/05 Registros/YYYY-MM-DD - Resumo Diario.md`).
- **Sincronização Direta P2P na Rede Local LAN (`src/p2p.js`):** Descoberta automática de nós DevSync na mesma rede Wi-Fi / Ethernet via UDP Beacon na porta 48123 sem necessidade de configuração manual de IP. Suporte a empacotamento e desempacotamento direto de commits Git através de Git Bundles binários (`git bundle create / verify / fetch`), garantindo sincronização ultra-rápida mesmo sem acesso à internet ou GitHub.
- **Repo Scout — Descoberta Automática de Repositórios (`src/scout.js`):** Varredura recursiva de diretórios locais para descoberta de repositórios Git, detecção automática de branch ativa, status de alterações pendentes (dirty/clean), URLs de upstream configurados e cadastro de projetos em lote com um único clique pela interface ou comando CLI/MCP.
- **Sincronização Multi-Branch Isolada via Git Worktrees (`src/worktree.js`):** Capacidade de atualizar branches secundárias remotas em background criando worktrees descartáveis e isoladas em `.devsync/worktrees/`, executando checagem de avanço direto (fast-forward) e sincronizando referências locais sem interromper o trabalho na branch atualmente ativa no VS Code / editor.
- **DevSync Dynamic HUD — Pílula Flutuante Translúcida para Windows Desktop (`ui/hud.html`, `desktop/main.cjs`):** Widget de desktop no estilo pill/Dynamic Island, com visual glassmorphism acrílico, sem bordas, reposicionável via drag-and-drop, indicador de status pulsante, métricas em tempo real, atalho global `Ctrl+Shift+H` e sincronização instantânea.
- **Expansão do Servidor MCP para 16 Ferramentas Corporativas:** Adição das ferramentas `devsync_scout`, `devsync_worktree_sync`, `devsync_daily_summary` e `devsync_p2p_peers` para orquestração por agentes autônomos (Cursor, Claude Code, Antigravity).

## Recursos Consolidados das Versões Anteriores

- **Zero-Leak Pre-Commit Secret Scanner (`src/secrets.js`):** Motor regex estrito que detecta e bloqueia credenciais (chaves privadas, tokens GitHub, OpenAI, Gemini, chaves AWS, webhooks) antes da gravação de checkpoints.
- **Resolução Semântica de Conflitos com IA & Heurística (`src/ai.js`):** Motor Gemini AI com fallback determinístico 3-way (`heuristicMerge`).
- **Editor Visual 3-Way de Conflitos na UI Local:** Três painéis com visualização comparativa e aplicação de resoluções com um clique.
- **Atalhos Globais de Sistema no Windows:** `Ctrl+Shift+S` (sincronizar todos), `Ctrl+Shift+D` (abrir painel), `Ctrl+Shift+H` (alternar HUD flutuante).
- **Notificações Multi-Canal (Webhooks):** Discord, Telegram e endpoints JSON genéricos.
- **Painel de Métricas & Produtividade:** Estatísticas consolidadas e histograma de atividade de 7 dias.
- **Coordenador Remoto HTTPS & PWA Responsivo:** Sincronização segura ponto a ponto entre Casa e Trabalho, com suporte a SQLite nativo (`node:sqlite`).

## Evidência da entrega

A suíte completa de testes conta com **100% de aprovação (65 testes verdes)**, cobrindo AI Morning Catch-Up, HUD Spotlight IPC, P2P bundles, repo scout, worktrees isoladas, resumos diários no Obsidian, MCP expandido (17 ferramentas), varredura de segredos, resolução por IA, checkpoints, webhooks e coordenação remota.

## Repositório e Lançamentos

| Recurso | Detalhes |
| --- | --- |
| Repositório GitHub Oficial | `https://github.com/Henrique1601/devsync` |
| Releases Geradas | `v0.3.0`, `v0.4.0`, `v0.5.0`, `v0.6.0`, `v0.7.0` e `v0.8.0` |
| Binários Compilados | Instalador NSIS (`.exe`) e Versão Portátil (`.exe`) |
| Pipeline de CI/CD | GitHub Actions com testes e compilação automatizada |

## Limites do produto

- A sincronização automática direta preserva estritamente o histórico (fast-forward only). Divergências de histórico continuam exigindo revisão assistida por IA ou resolução manual para garantir zero perda de código.

← [[00 Comece aqui]]
