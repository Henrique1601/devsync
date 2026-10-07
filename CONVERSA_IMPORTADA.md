# Contexto importado do ChatGPT — DevSync

Origem: https://chatgpt.com/share/6ac57fb7-ec64-83e8-b42a-78a925b82685

Importado em 6 de outubro de 2026. Este documento resume o conteúdo visível no link compartilhado; não contém o ZIP mencionado na conversa.

## Objetivo e arquitetura proposta

Sincronizar projetos entre dois PCs, identificados como Trabalho e Casa, usando GitHub para transportar o código. O servidor do painel coordena dispositivos e exibe seu estado, sem manter uma segunda cópia dos projetos.

Quatro componentes compartilham o mesmo motor de sincronização:

- Painel web: PCs, projetos, última sincronização, pendências, regras e solicitações de sincronização.
- Aplicativo local: seleção de pastas, conexão do computador e notificações na bandeja do Windows.
- Serviço em segundo plano: monitora projetos e executa Git mesmo com o aplicativo fechado.
- CLI: consulta e controla o mesmo serviço local, evitando operações Git simultâneas no mesmo projeto.

O serviço mantém uma conexão de saída com o servidor para receber solicitações do painel, sem abrir portas no roteador.

## Configuração e comportamento esperados

Selecionar pastas e branches autorizadas em cada máquina. Escolher envio de commits manuais ou checkpoints automáticos. O PC de origem envia commits ao GitHub; o outro recebe quando estiver ligado, conectado e em condições de atualizar o projeto.

- PC desligado ou sem internet: solicitação aguarda seu retorno.
- Alterações locais pendentes: atualização pausa ou segue regra de checkpoint previamente configurada.
- Históricos divergentes: avisa e preserva o trabalho para resolução manual.
- Arquivos ainda não salvos no editor: não podem ser enviados.

Exemplos propostos de comandos:

```powershell
devsync status
devsync add "C:\Projetos\meu-crm"
devsync sync meu-crm
devsync pause meu-crm
devsync resume meu-crm
```

## Ordem de implementação

Começar pelo serviço e CLI para validar sincronização entre dois PCs. Acrescentar aplicativo desktop e painel web depois.

## Mensagens finais e entrega relatada

Usuário: “Ok, ficou claro. Pode ir construindo”

Assistente: “Perfeito, já vou começar a estruturar isso.”

Usuário: “Hmm”

Assistente: “Tô visualizando aqui e já começo a montar a base do projeto.”

O assistente então apresentou um arquivo chamado `devsync-v0.1.0.zip` e relatou uma primeira versão funcional com:

- Serviço que verifica projetos a cada 30 segundos.
- CLI e painel local para cadastro, sincronização e pausa.
- Recebimento automático e envio opcional de commits existentes.
- Pausa diante de alterações locais ou históricos divergentes.

Relatou 11 testes aprovados em Linux, com instalação e validação nos PCs do usuário ainda pendentes. Isso é uma afirmação da conversa original, não uma verificação realizada nesta importação.

Instrução de execução após extrair o pacote, dentro da pasta `devsync`:

```powershell
node src/cli.js daemon
```

O terminal exibiria o endereço do painel; instruções completas estariam no `README.md`. Aplicativo desktop, inicialização automática e painel remoto ficaram para a próxima etapa.
