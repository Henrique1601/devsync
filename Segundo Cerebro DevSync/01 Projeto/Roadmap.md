---
tipo: planejamento
versao: "0.8.0"
atualizado: 2026-10-17
tags: [devsync, planejamento]
cssclasses: [devsync]
fontes: ["docs/VALIDATION.md","docs/DEPLOYMENT.md"]
---
# 🛤️ Roadmap

Use esta nota para acompanhar o ciclo de entregas e os próximos passos do DevSync.

## Concluído na Versão 0.8.0 (Next-Gen AI Catch-Up & Spotlight HUD)

- [x] **AI Morning Catch-Up & Context Resume:** Briefing matinal inteligente analisando commits recebidos/enviados, detecção de pendências (`TODO`, `FIXME`, `HACK`), geração de próximos passos e registro automático no diário do Obsidian (`05 Registros/YYYY-MM-DD - Resumo Diario.md`). Fallback determinístico sem necessidade de API externa.
- [x] **HUD Spotlight Command Palette & Instant Switcher:** Expansão dinâmica da pílula HUD para menu de comando estilo Spotlight/Raycast (460x420 px), busca fuzzy de repositórios, atalhos rápidos (`Enter` sincroniza, `Alt+C` abre no VS Code, `Alt+G` abre no GitHub, `Alt+D` abre diff, `Esc` recolhe) e visualizador integrado do Catch-Up Matinal.
- [x] **Expansão do Servidor MCP para 17 Ferramentas:** Ferramenta corporativa `devsync_catch_up` adicionada para consumo por agentes autônomos.

## Concluído na Versão 0.7.0 (Next-Gen Innovation Release)

- [x] **AI Conventional Commit Generator & Diário de Bordo no Obsidian:** Análise semântica e heurística de diffs para gerar mensagens padronizadas e relatórios diários de produtividade no Obsidian.
- [x] **P2P Direct LAN Sync via UDP Beacon e Git Bundles:** Sincronização direta na rede local entre Casa e Trabalho mesmo sem internet ou GitHub.
- [x] **Repo Scout (Auto-Discovery de Repositórios & Cadastro em Lote):** Varredura inteligente de pastas para cadastrar múltiplos repositórios com 1 clique.
- [x] **Multi-Branch Sync via Git Worktrees Isoladas:** Sincronização em segundo plano de branches secundárias sem interferir na branch ativa do desenvolvedor.
- [x] **DevSync Dynamic HUD:** Pílula flutuante translúcida no desktop do Windows (atalho `Ctrl+Shift+H`) com status em tempo real e sincronização instantânea.
- [x] **Expansão MCP para 16 Ferramentas:** Ferramentas dedicadas para agentes de IA realizarem scout, worktree sync, resumos no Obsidian e consultas P2P.

## Concluído na Versão 0.6.0

- [x] Motor Zero-Leak Pre-Commit Secret Scanner (`src/secrets.js`).
- [x] Resolução Semântica de Conflitos com IA e Fallback Heurístico (`src/ai.js`).
- [x] Interface Visual & Editor 3-Way de Conflitos na UI Local (`ui/`).
- [x] Atalhos Globais de Sistema (`Ctrl+Shift+S`, `Ctrl+Shift+D`) no Desktop Windows (`desktop/main.cjs`).
- [x] Sincronização e envio de Tags Git (`src/git.js`).
- [x] Expansão do Servidor MCP para 12 ferramentas corporativas.

## Concluído na Versão 0.5.0

- [x] Repositório oficial publicado no GitHub (`Henrique1601/devsync`).
- [x] CI/CD completo com GitHub Actions para testes e compilação de releases.
- [x] Sistema de Notificações Externas (Webhooks para Discord, Telegram e Genérico).
- [x] Painel de Métricas de Produtividade com estimativa de horas salvas e gráfico 7 dias.
- [x] Simulador preditivo de conflitos em memória (`predictConflicts` via `git merge-tree`).
- [x] Diagnóstico de Credenciais Git e chaves SSH no Onboarding.
- [x] Suporte a PWA mobile no painel remoto com manifest e layout touch-friendly.

## Próximos Passos (v0.8.0+)

- [ ] Validação de assinatura de código (code-signing) com certificado EV para suprimir alertas do Windows Defender SmartScreen.
- [ ] Suporte a múltiplos coordenadores remotos em cluster (alta disponibilidade).
- [ ] Criptografia end-to-end com curvas elípticas (Ed25519) nos payloads P2P LAN.

Procedimento operacional: [[03 Engenharia/Hospedagem e operacao]].

← [[00 Comece aqui]]
