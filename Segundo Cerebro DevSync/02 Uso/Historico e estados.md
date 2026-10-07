---
tipo: guia
versao: "0.3.0"
atualizado: 2026-10-07
tags: [devsync, guia]
cssclasses: [devsync]
fontes: ["src/history.js","ui/local.js"]
---
# 🕘 Histórico e estados

Abra **Histórico**, escolha o projeto e use **Atualizar histórico**. A tela exibe até 100 registros; o arquivo guarda até 1.000. A CLI permite consultar até 1.000.

## Ler um registro

- **Origem:** automático, painel/terminal, cadastro ou painel remoto.
- **Estado e motivo:** resultado da verificação ou alteração de regra.
- **Recebidos/enviados:** quantidade de commits daquela sincronização.
- **Checkpoint criado:** informa se houve commit automático.
- **Commits desta verificação:** hashes antes e depois.

Um registro de mudança de regra não é uma nova transferência de commits. Consulte o motivo e a origem. O estado pode refletir a situação do repositório naquele momento.

## Estados e ação esperada

| Estado | Significado | Próxima ação |
| --- | --- | --- |
| Sincronizado | Histórico local alinhado ao acompanhamento remoto na verificação | Continuar trabalhando |
| Alterações locais pendentes | Arquivos modificados ou novos | Revisar e criar commit ou checkpoint permitido |
| Commits para enviar | Commit local ainda não publicado | Revisar e enviar; confira autoPush |
| Atualizações para receber | Remoto tem commits ainda não aplicados | Sincronizar com clone limpo |
| Históricos divergentes | Existem commits exclusivos nos dois lados | Resolver manualmente no Git |
| Pausado | Automação pausada | Retomar quando estiver pronto |
| Operação em andamento | Repositório ocupado | Aguardar e identificar a operação |
| Operação Git em andamento | Merge/rebase/etc. incompleto | Concluir no Git antes de sincronizar |
| Branch alterada | Branch atual difere da cadastrada | Voltar à branch cadastrada para esta rotina |
| HEAD sem branch | Checkout destacado | Selecionar uma branch |
| Falha na sincronização | Git ou configuração precisa de atenção | Diagnóstico e terminal |
| Aguardando verificação | Ainda sem resultado | Aguardar o primeiro ciclo |

## O que o histórico não prova

Ele mostra o resultado da verificação, não garante que o segundo PC já recebeu os commits. Confira o outro dispositivo. Um healthcheck do servidor também não confirma sincronização Git.

## Onde fica

No Windows padrão: `C:/Users/henri/.devsync/history.json`, salvo junto à configuração local. `DEVSYNC_HOME` pode mudar a pasta. O histórico contém metadados, não cópias de código ou tokens.

Para incidentes, anote horário, estado e versão em [[06 Modelos/Incidente]]. Veja [[04 Problemas/Diagnostico e erros]].

![[08 Anexos/Historico DevSync.png]]

← [[00 Comece aqui]]
