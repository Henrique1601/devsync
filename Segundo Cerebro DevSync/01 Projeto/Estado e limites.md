---
tipo: projeto
versao: "0.3.0"
atualizado: 2026-10-07
tags: [devsync, projeto]
cssclasses: [devsync]
fontes: ["package.json","docs/VALIDATION.md"]
---
# ✅ Estado e limites

Esta nota registra o estado observado em **07/10/2026**, na versão **0.3.0**, commit `82127ea`. Revalide quando houver uma nova entrega.

## Implementado

- Serviço local, painel, CLI e desktop Windows com bandeja.
- Cadastro de clone existente, clonagem pelo GitHub e diagnóstico.
- Recebimento por fast-forward e push optativo.
- Checkpoints optativos com seleção de arquivos e espera estável.
- Intervalos configuráveis por projeto.
- Histórico persistente de até 1.000 eventos.
- Coordenador com pareamento, fila persistente e revogação.
- Atualizador optativo com download e instalação separados.
- Arquivos de implantação para VPS e Render.

## Evidência da entrega

O relatório do projeto registra **36 testes aprovados**, smoke do executável empacotado e auditoria de produção sem vulnerabilidades reportadas. Isso descreve aquela execução; não é uma execução nova feita ao criar este cofre.

## Preparado, mas dependente de publicação

| Item | Pendência |
| --- | --- |
| Painel remoto pela internet | Escolher host, publicar com HTTPS e persistência |
| Fonte de atualizações | Publicar manifesto, instalador e blockmap em HTTPS |
| Sincronização do próprio código DevSync entre PCs | Configurar um remoto Git; ele não estava configurado na entrega |

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
