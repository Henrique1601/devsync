---
tipo: projeto
versao: "0.3.0"
atualizado: 2026-10-07
tags: [devsync, projeto]
cssclasses: [devsync]
fontes: ["README.md"]
---
# 🎯 Visão do projeto

O DevSync ajuda a continuar um projeto Git no computador de Casa ou do Trabalho. Cada PC tem seu próprio clone e sincroniza a branch cadastrada.

## Problema que resolve

Você termina uma mudança em um PC e precisa encontrá-la no outro. O DevSync verifica o Git, recebe commits por fast-forward e, se você ativar o envio, publica os commits locais.

**GitHub transporta o código.** O **coordenador remoto transporta informações de estado e comandos**. Esses fluxos são independentes: a sincronização Git local funciona sem hospedar o coordenador.

## Componentes que você usa

| Componente | Papel |
| --- | --- |
| Aplicativo Windows | Janela de controle, ícone de bandeja e notificações |
| Serviço local | Executa sincronizações e mantém configurações |
| Painel local | Cadastro, diagnóstico, regras e histórico |
| CLI | Controla o mesmo serviço pelo terminal |
| GitHub ou remoto Git do clone | Guarda e transporta commits |
| Coordenador remoto | Acompanha PCs e guarda solicitações para PCs offline |

## O que conta como trabalho sincronizável

Um arquivo salvo ainda pode estar sem commit. Um commit local ainda pode não ter sido enviado. Só depois de chegar ao remoto ele pode ser recebido no outro PC.

`Salvar arquivo → criar commit → enviar ao remoto → receber no outro PC`.

Checkpoints podem automatizar parte da criação de commits. Envio automático pode automatizar o push. Ambos começam desativados.

## Para quem e para qual escala

A versão atual atende uso pessoal, com armazenamento JSON e uma instância por diretório. Ela preserva alterações locais e pede intervenção quando não pode avançar o histórico com segurança.

Leia [[01 Projeto/Estado e limites]], [[03 Engenharia/Arquitetura]] e [[07 Referencias/Glossario]].

← [[00 Comece aqui]]
