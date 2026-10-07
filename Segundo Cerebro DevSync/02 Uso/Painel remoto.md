---
tipo: guia
versao: "0.3.0"
atualizado: 2026-10-07
tags: [devsync, guia]
cssclasses: [devsync]
fontes: ["docs/REMOTE.md","src/remote-client.js"]
---
# 🌐 Painel remoto

O coordenador acompanha Casa e Trabalho e permite **sincronizar, pausar e retomar**. Ele não armazena código nem substitui o GitHub.

> [!important] Ainda depende de hospedagem
> A implementação está pronta, mas não foi publicada em uma URL de produção. Primeiro siga [[03 Engenharia/Hospedagem e operacao]] ou teste em localhost.

## Parear um computador

1. Abra a URL HTTPS do coordenador.
2. Informe o token de administrador diretamente no painel.
3. Use **Adicionar computador** e dê um nome, como Casa.
4. Guarde o ID e token do dispositivo em um local privado.
5. No DevSync desse PC, abra **Computador**.
6. Preencha endereço base do servidor, nome, ID e token individual.
7. Clique **Conectar** e confira o status local e remoto.

Repita para Trabalho com um token distinto. O token administrativo não deve ser usado como token do dispositivo.

O endereço base não deve conter caminho, query, fragmento ou credenciais: `https://devsync.seudominio.com`.

## Estado e solicitações

O PC consulta o servidor aproximadamente a cada 10 segundos. O coordenador recebe nomes, branches e estados dos projetos. O tempo até executar um comando também depende de operações já em curso e conexão.

Se o PC estiver offline, o pedido permanece na fila. Ao reconectar, ele recebe os comandos pendentes e confirma o resultado. Um comando pode ser repetido quando a conexão cai antes da confirmação.

## Controles que permanecem locais

Clonar, cadastrar pasta, ativar checkpoints, ativar envio e mudar regras são operações do painel/CLI local. O controle remoto não concede essas autorizações.

## Desconectar

- **Desconectar painel remoto** no PC remove sua configuração de conexão local.
- O controle de desconexão/revogação no painel remoto invalida o token e suas solicitações.
- Repareie para gerar novas credenciais se necessário.

Nenhum token deve ficar neste cofre. Registre apenas que o pareamento foi concluído.

Problemas: [[04 Problemas/Diagnostico e erros]]. Dados: [[03 Engenharia/Dados e seguranca]].

← [[00 Comece aqui]]
