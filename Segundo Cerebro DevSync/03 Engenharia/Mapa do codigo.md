---
tipo: engenharia
versao: "0.3.0"
atualizado: 2026-10-07
tags: [devsync, engenharia]
cssclasses: [devsync]
fontes: ["package.json","src/daemon.js","src/git.js"]
---
# 🧩 Mapa do código

Parta do comportamento que deseja entender e abra o arquivo responsável. Os caminhos abaixo são relativos à raiz do projeto DevSync.

## Serviço e Git

| Arquivo | Responsabilidade |
| --- | --- |
| `src/cli.js` | Entrada da CLI, daemon e coordenador |
| `src/daemon.js` | API local, cadastro, comandos, fila e agendamento |
| `src/git.js` | Inspeção, fetch, fast-forward, push e lock do clone |
| `src/checkpoint.js` | Seleção de arquivos, estabilidade e commit |
| `src/rules.js` | Validação de regras e matcher de padrões |
| `src/history.js` | Histórico atômico limitado e consulta |
| `src/onboarding.js` | Diagnóstico sem mutação do Git |
| `src/operations.js` | Espera completa de operações e estado ocupado |
| `src/service-lock.js` | Propriedade do serviço e lock residual |
| `src/store.js` | Pasta de dados e gravação JSON |
| `src/remote-client.js` | Heartbeat e execução/ack de comandos remotos |
| `src/coordinator.js` | Servidor remoto, tokens, dispositivos e fila |

## Interface e distribuição

| Arquivo | Responsabilidade |
| --- | --- |
| `ui/index.html` | Estrutura do painel local |
| `ui/local.js` | Telas, formulários e chamadas à API |
| `ui/local.css` | Layout, foco e responsividade |
| `ui/remote.html` | Painel do coordenador |
| `desktop/main.cjs` | Electron, bandeja, janela, serviço e IPC |
| `desktop/preload.cjs` | Métodos restritos expostos à janela |
| `desktop/updates.cjs` | Estado e regras do atualizador |
| `package.json` | Scripts, versão e empacotamento |
| `Dockerfile`, `compose.yaml`, `Caddyfile` | Implantação VPS |
| `render.yaml` | Blueprint de implantação Render |

## Onde procurar testes

- `test/sync.test.js`: fluxo Git, API e CLI.
- `test/history.test.js`: persistência e projeção do histórico.
- `test/rules.test.js`: regras e padrão adversarial.
- `test/operations.test.js`: espera e ocupação.
- `test/remote.test.js`: coordenação, auth e saúde.
- `test/updates.test.js`: controlador do atualizador.
- `test/service-lock.test.js`: proteção do lock de serviço.

## Roteiro de leitura

Para sincronização: `daemon.js → git.js → checkpoint.js → history.js`.

Para controle remoto: `coordinator.js → remote-client.js → daemon.js`.

Para interface: `index.html → local.js → daemon.js`.

Para distribuição: `package.json → main.cjs → preload.cjs → updates.cjs`.

Atalhos às fontes reais: [[07 Referencias/Fontes e atualizacao]].

← [[00 Comece aqui]]
