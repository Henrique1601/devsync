---
tipo: planejamento
versao: "0.5.0"
atualizado: 2026-10-16
tags: [devsync, planejamento]
cssclasses: [devsync]
fontes: ["docs/VALIDATION.md","docs/DEPLOYMENT.md"]
---
# 🛤️ Roadmap

Use esta nota para acompanhar o ciclo de entregas e os próximos passos do DevSync.

## Concluído na Versão 0.5.0

- [x] Repositório oficial publicado no GitHub (`Henrique1601/devsync`).
- [x] Licença oficial MIT e badges no README.
- [x] CI/CD completo com GitHub Actions para testes e compilação de releases.
- [x] Servidor MCP nativo (`devsync mcp`) com 9 ferramentas para agentes de IA.
- [x] Suporte a SQLite transacional no Coordenador via `node:sqlite`.
- [x] Visualizador seguro de Diffs e Safe Stash + Sync.
- [x] Sistema de Notificações Externas (Webhooks para Discord, Telegram e Genérico).
- [x] Painel de Métricas de Produtividade com estimativa de horas salvas e gráfico 7 dias.
- [x] Simulador preditivo de conflitos em memória (`predictConflicts` via `git merge-tree`).
- [x] Diagnóstico de Credenciais Git e chaves SSH.
- [x] Suporte a PWA mobile no painel remoto com manifest e layout touch-friendly.
- [x] Suíte de testes expandida para 50 testes 100% aprovados.

## Próximos Passos (v0.6.0+)

- [ ] Instalação e teste contínuo em paridade total nos dois computadores físicos (Casa e Trabalho).
- [ ] Validação de assinatura de código (code-signing) para suprimir alertas do Windows Defender SmartScreen.
- [ ] Resolução assistida interativa de conflitos direto pela UI do DevSync.
- [ ] Suporte a múltiplos coordenadores remotos (alta disponibilidade).

Procedimento operacional: [[03 Engenharia/Hospedagem e operacao]].

← [[00 Comece aqui]]
