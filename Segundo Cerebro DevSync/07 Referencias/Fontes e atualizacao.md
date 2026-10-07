---
tipo: referencia
versao: "0.3.0"
atualizado: 2026-10-07
tags: [devsync, referencia]
cssclasses: [devsync]
fontes: ["README.md","docs/VALIDATION.md"]
---
# 🔎 Fontes e atualização

Este cofre é a camada de entendimento do projeto. O código e os documentos de implementação sustentam seus fatos.

## Referência da criação

- Versão: `0.3.0`.
- Commit de implementação: `82127ea`.
- Data: `2026-10-07`.
- Números de testes e smoke: evidência do relatório da entrega, não uma nova execução durante a criação das notas.

## Fontes do projeto

Links relativos mantêm a relação com o repositório enquanto o cofre estiver nesta pasta:

| Fonte | Para quê |
| --- | --- |
| [README](../../README.md) | Uso e comportamento do produto |
| [ADR inicial](../../docs/ADR-001.md) | Motor, desktop e coordenador |
| [ADR da 0.3](../../docs/ADR-002.md) | Histórico, regras e atualização |
| [Validação](../../docs/VALIDATION.md) | O que foi testado e limites |
| [Guia remoto](../../docs/REMOTE.md) | Pareamento e coordenador |
| [Deploy](../../docs/DEPLOYMENT.md) | VPS/Render, persistência e backup |
| [package.json](../../package.json) | Versão, scripts e distribuição |
| [Motor Git](../../src/git.js) | Regras efetivas de sincronização |
| [Checkpoints](../../src/checkpoint.js) | Arquivos e criação de commits |
| [Regras](../../src/rules.js) | Intervalos, validação e padrões |
| [CLI](../../src/cli.js) | Comandos disponíveis |
| [Atualizador](../../desktop/updates.cjs) | Download, fonte e instalação |

## Referências do Obsidian

[Abrir uma pasta como cofre](https://help.obsidian.md/vault), [links internos](https://help.obsidian.md/Linking+notes+and+files/Internal+links) e [especificação JSON Canvas](https://jsoncanvas.org/spec/1.0/).

## Atualizar após mudanças

1. Verifique a versão e o commit no repositório.
2. Identifique o comportamento que mudou.
3. Atualize as notas de uso e de engenharia relacionadas.
4. Atualize `versao`, `atualizado` e `fontes` nas propriedades dessas notas.
5. Diferencie “implementado”, “validado” e “publicado”.
6. Registre a mudança com [[06 Modelos/Sessao de trabalho]] ou [[06 Modelos/Decisao]].
7. Confira links e [[01 Projeto/Estado e limites]].

Evite copiar saídas de configuração com tokens. Para validar nomes de comandos e limites, prefira ler o código ou o help atual da CLI.

## Versionamento do cofre

As notas e a configuração visual podem acompanhar o Git do projeto. O workspace pessoal do Obsidian fica ignorado para evitar conflitos entre PCs. Notas futuras precisam ser revisadas antes de publicação, pois a caixa de entrada pode conter informação privada.

Mover apenas o cofre mantém os wikilinks internos, mas pode quebrar links ao código/instalador fora dele. Atualize as referências se mudar sua localização.

← [[00 Comece aqui]]
