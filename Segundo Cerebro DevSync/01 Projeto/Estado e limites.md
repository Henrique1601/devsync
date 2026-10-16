---
tipo: projeto
versao: "0.4.0"
atualizado: 2026-10-16
tags: [devsync, projeto]
cssclasses: [devsync]
fontes: ["package.json","docs/VALIDATION.md"]
---
# ✅ Estado e limites

Esta nota registra o estado observado em **16/10/2026**, na versão **0.4.0**.

## Implementado

- Serviço local, painel com Dark/Light Mode, CLI e desktop Windows com bandeja e ícone oficial.
- Servidor MCP nativo (`devsync mcp`) para orquestração por agentes de IA (Claude, Cursor, Antigravity).
- Sincronização em lote (`Sync All`) via UI, bandeja do Windows e terminal.
- Visualizador de Diffs seguro com realce sintático e ocultação de arquivos sensíveis.
- Stash Seguro + Sincronizar (preserva rascunhos locais, avança por fast-forward e restaura o stash).
- Suporte a persistência transacional SQLite no Coordenador via `node:sqlite` nativo.
- Cadastro de clone existente, clonagem pelo GitHub e diagnóstico de repositório.
- Recebimento por fast-forward e push optativo.
- Checkpoints optativos com mensagens semânticas inteligentes de commit e proteção a segredos.
- Intervalos configuráveis por projeto.
- Histórico persistente de até 1.000 eventos.
- Coordenador com pareamento, fila persistente e revogação.
- Atualizador optativo com download e instalação separados.
- Arquivos de implantação para VPS e Render.

## Evidência da entrega

O relatório do projeto registra **42 testes aprovados (100% verde)**, smoke do executável empacotado e auditoria de produção.

## Preparado, mas dependente de publicação

| Item | Pendência |
| --- | --- |
| Painel remoto pela internet | Escolher host, publicar com HTTPS e persistência |
| Fonte de atualizações | Publicar manifesto, instalador e blockmap em HTTPS |
| Sincronização do próprio código DevSync entre PCs | **Configurado** (repositório remoto conectado em `https://github.com/Henrique1601/devsync`) |

## Ainda não comprovado em ambiente real

- Instalação e uso nos dois computadores do usuário.
- Autenticação real dos projetos privados no GitHub.
- Autostart após reiniciar o Windows.
- Atualização completa substituindo uma instalação anterior.
- Containers executados no Docker local: o engine Linux estava inativo.

## Limites do produto

Não resolve conflitos automaticamente; não sincroniza arquivos não salvos; não inclui arquivos novos em checkpoints; não suporta persistência distribuída com múltiplas instâncias. O instalador ainda não possui assinatura de publicador.

Próximas ações: [[01 Projeto/Roadmap]]. Evidências e critérios: [[03 Engenharia/Ambiente e validacao]].

← [[00 Comece aqui]]
