---
tipo: projeto
versao: "0.6.0"
atualizado: 2026-10-16
tags: [devsync, projeto]
cssclasses: [devsync]
fontes: ["package.json","docs/VALIDATION.md"]
---
# ✅ Estado e limites

Esta nota registra o estado observado em **16/10/2026**, na versão **0.6.0**.

## Implementado

- **Zero-Leak Pre-Commit Secret Scanner (`src/secrets.js`):** Motor regex estrito para detecção de chaves privadas (RSA/EC/PGP), tokens GitHub (`ghp_`, `github_pat_`), chaves AWS, chaves Gemini/Google API (`AIzaSy`), chaves OpenAI/Anthropic e webhooks sensíveis (Discord/Slack). Bloqueia checkpoints automáticos imediatamente caso detecte vazamento no diff e oferece varredura sob demanda via UI, CLI e MCP.
- **Resolução Semântica de Conflitos com IA & Heurística (`src/ai.js`):** Motor de resolução que aciona a API Gemini (`gemini-2.5-flash`) quando a chave `GEMINI_API_KEY` estiver configurada, com fallback determinístico robusto (`heuristicMerge`) que remove marcadores Git e preserva adições exclusivas sem quebrar arquivos.
- **Visualizador & Editor 3-Way de Conflitos na UI Local:** Interface com 3 painéis (Local HEAD, Incoming Remoto e Código Mesclado Editável), permitindo ao desenvolvedor acionar a IA ou heurística, ajustar linhas diretamente e gravar a resolução no repositório com um clique.
- **Global Hotkeys & Menu de Atalhos no Windows (`desktop/main.cjs`):** Registro de atalhos globais de sistema `Ctrl+Shift+S` (sincronizar todos os projetos com notificação nativa) e `Ctrl+Shift+D` (abrir painel principal), além de atalhos documentados no menu de contexto do Tray.
- **Sincronização & Envio de Tags Git (`src/git.js`):** Fetch e push com suporte nativo à opção `--tags`, garantindo que versões, marcos e releases fiquem 100% sincronizados entre Casa e Trabalho.
- **Expansão do Servidor MCP Nativo (`devsync mcp`):** Agora com 12 ferramentas disponíveis para agentes de IA (incluindo `devsync_scan_secrets`, `devsync_ai_resolve_conflict` e `devsync_resolve_conflict`).
- **Notificações Externas Multi-Canal (Webhooks):** Integração com Discord (embeds com cores semânticas), Telegram (markdown estruturado com chat_id) e Genérico (JSON POST HTTP/HTTPS).
- **Painel de Métricas de Produtividade & Heatmap:** Cálculo de total de sincronizações, taxa de sucesso, commits transferidos, estimativa de horas salvas e histograma de atividade de 7 dias.
- **Simulador Preditivo de Conflitos em Memória (`predictConflicts`):** Simulação sem mutação de arquivos no disco usando `git merge-tree` e `git merge-base`.
- **Coordenador PWA Responsivo & SQLite Transacional:** Web App Manifest (`/manifest.json`), touch targets otimizados e persistência via `node:sqlite` nativo sem C++ compilado.

## Evidência da entrega

A suíte completa de testes conta com **55 testes aprovados (100% verde)** sem falhas, cobrindo varredura de segredos, resolução por IA/heurística, sincronização Git, conflitos, webhooks, métricas, protocolo MCP, coordinator SQLite, service lock e atualizações.

## Repositório e Lançamentos

| Recurso | Detalhes |
| --- | --- |
| Repositório GitHub Oficial | `https://github.com/Henrique1601/devsync` |
| Releases Geradas | `v0.3.0`, `v0.4.0`, `v0.5.0` e `v0.6.0` |
| Binários Compilados | Instalador NSIS (`.exe`) e Versão Portátil (`.exe`) |
| Pipeline de CI/CD | GitHub Actions com testes e compilação automatizada |

## Limites do produto

- A reconciliação automática ainda é restrita a avanço direto (fast-forward) por política estrita de preservação do trabalho. Conflitos divergentes acionam o simulador preditivo e a ferramenta de resolução 3-Way com IA para validação assistida pelo desenvolvedor.

← [[00 Comece aqui]]
