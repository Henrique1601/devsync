---
tipo: referencia
versao: "0.3.0"
atualizado: 2026-10-07
tags: [devsync, referencia]
cssclasses: [devsync]
fontes: ["src/cli.js"]
---
# ⌨️ CLI e comandos

Execute na pasta do DevSync, com Node.js 22+ e Git. O serviço precisa estar ativo para os comandos de controle.

## Iniciar

```powershell
Set-Location "C:/Users/henri/Programacao/Projetos/devsync"
npm start
```

Mantenha esse terminal aberto. Em outro terminal, use os comandos abaixo. Se o desktop já criou o serviço, ele também atende a CLI na mesma configuração local.

## Consultar e cadastrar

```powershell
node src/cli.js help
node src/cli.js status
node src/cli.js dashboard
node src/cli.js diagnose "C:/Projetos/meu-crm"
node src/cli.js add "C:/Projetos/meu-crm"
node src/cli.js clone "https://github.com/usuario/projeto.git" "C:/Projetos/nova-pasta"
node src/cli.js history ID_DO_PROJETO 100
```

Use o ID retornado pelo status. Ele diferencia projetos com nomes iguais. O endereço do dashboard contém um token local; abra no próprio computador e não copie para notas ou mensagens.

## Controlar um projeto

```powershell
node src/cli.js sync ID_DO_PROJETO
node src/cli.js pause ID_DO_PROJETO
node src/cli.js resume ID_DO_PROJETO
node src/cli.js push-on ID_DO_PROJETO
node src/cli.js push-off ID_DO_PROJETO
node src/cli.js checkpoint-on ID_DO_PROJETO
node src/cli.js checkpoint-off ID_DO_PROJETO
node src/cli.js settings ID_DO_PROJETO 30 60 "src/**,README.md"
```

No último comando: intervalo, espera estável e padrões separados por vírgula. O comando **settings** salva regras; não ativa checkpoints nem envio.

A sintaxe também oferece `remote-config <url> <token> <device-id> <nome>`, mas o painel com campo protegido é preferível para inserir tokens sem gravá-los no histórico do terminal.

```powershell
node src/cli.js remote-off
```

## Usar uma configuração isolada

No terminal que inicia o serviço e em cada terminal de controle:

```powershell
$env:DEVSYNC_HOME = "C:/DevSync-testes/config"
```

A variável só vale para aquele processo e seus filhos. Não muda retroativamente um serviço já iniciado. Veja [[03 Engenharia/Dados e seguranca]].

## Encerrar

Use Ctrl+C no terminal do serviço CLI. O desktop tem **Sair** na bandeja. Fechar a janela do desktop apenas a oculta.

← [[00 Comece aqui]]
