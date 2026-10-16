---
tipo: planejamento
versao: "0.6.0"
atualizado: 2026-10-16
tags: [devsync, planejamento]
cssclasses: [devsync]
fontes: ["docs/VALIDATION.md","docs/DEPLOYMENT.md"]
---
# 🛤️ Roadmap

Use esta nota para acompanhar o ciclo de entregas e os próximos passos do DevSync.

## Concluído na Versão 0.6.0 (Master Upgrade)

- [x] Motor Zero-Leak Pre-Commit Secret Scanner (`src/secrets.js`).
- [x] Resolução Semântica de Conflitos com IA e Fallback Heurístico (`src/ai.js`).
- [x] Interface Visual & Editor 3-Way de Conflitos na UI Local (`ui/`).
- [x] Atalhos Globais de Sistema (`Ctrl+Shift+S`, `Ctrl+Shift+D`) no Desktop Windows (`desktop/main.cjs`).
- [x] Sincronização e envio de Tags Git (`src/git.js`).
- [x] Expansão do Servidor MCP para 12 ferramentas corporativas.
- [x] Suíte de testes expandida para 55 testes 100% aprovados.

## Concluído na Versão 0.5.0

- [x] Repositório oficial publicado no GitHub (`Henrique1601/devsync`).
- [x] CI/CD completo com GitHub Actions para testes e compilação de releases.
- [x] Sistema de Notificações Externas (Webhooks para Discord, Telegram e Genérico).
- [x] Painel de Métricas de Produtividade com estimativa de horas salvas e gráfico 7 dias.
- [x] Simulador preditivo de conflitos em memória (`predictConflicts` via `git merge-tree`).
- [x] Diagnóstico de Credenciais Git e chaves SSH no Onboarding.
- [x] Suporte a PWA mobile no painel remoto com manifest e layout touch-friendly.

## Próximos Passos (v0.7.0+)

- [ ] Instalação e teste contínuo em paridade total nos dois computadores físicos (Casa e Trabalho).
- [ ] Validação de assinatura de código (code-signing) com certificado EV para suprimir alertas do Windows Defender SmartScreen.
- [ ] Suporte a múltiplos coordenadores remotos em cluster (alta disponibilidade).

Procedimento operacional: [[03 Engenharia/Hospedagem e operacao]].

← [[00 Comece aqui]]
