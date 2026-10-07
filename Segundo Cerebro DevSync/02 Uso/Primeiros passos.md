---
tipo: guia
versao: "0.3.0"
atualizado: 2026-10-07
tags: [devsync, guia]
cssclasses: [devsync]
fontes: ["README.md","src/onboarding.js","ui/index.html"]
---
# 🚀 Primeiros passos

**Resultado esperado:** um projeto cadastrado no painel, com diagnóstico válido e resultado de sincronização visível.

## 1. Preparar o computador

Para o aplicativo Windows, tenha Git instalado e autenticação do seu provedor Git configurada. O instalador já inclui o runtime do aplicativo. Node.js 22+ é necessário apenas para executar o código/CLI diretamente.

No terminal:

```powershell
git --version
```

## 2. Instalar e abrir

Use o [instalador 0.3.0](../../dist/DevSync%20Setup%200.3.0.exe). Abra o DevSync e escolha **Configurar projeto**.

> [!note] Instalador local
> O link depende de o instalador continuar em `dist` ao lado deste cofre. Ele não é versionado no Git. Veja [[02 Uso/Atualizacoes do aplicativo]] se precisar gerar outra cópia.

## 3. Escolher o caminho certo

**Já tenho o clone:** selecione a pasta local, como `C:/Projetos/meu-crm`. Clique **Verificar configuração**, siga as orientações e depois **Cadastrar**.

**Só tenho o link GitHub:** use **Clonar do GitHub**, informe a URL HTTPS e uma nova pasta absoluta. A pasta de destino não deve existir; o diretório pai precisa existir.

Exemplo:
- Repositório: `https://github.com/usuario/projeto.git`
- Destino: `C:/Projetos/projeto`

> [!important] Pasta e URL têm campos diferentes
> O campo **Pasta local do projeto** não aceita o link do GitHub. Esse foi o motivo do erro 400 observado anteriormente.

## 4. Conferir o diagnóstico

O projeto precisa ter Git, branch ativa, pelo menos um commit e upstream. Identidade de commit é necessária para criar checkpoints, embora sua ausência não impeça o cadastro de um clone pronto para receber commits.

Se precisar configurar identidade **neste repositório**:

```powershell
Set-Location "C:/Projetos/meu-crm"
git config user.name "Seu nome"
git config user.email "seu@email"
```

Use sua identidade real. A autenticação de rede será verificada ao sincronizar.

## 5. Confirmar o cadastro

Abra **Projetos**, confira a branch e use **Sincronizar agora**. Em **Histórico**, confira o resultado. Envio e checkpoints ficam desativados até você escolher ativá-los.

Antes de ativar automações, leia [[02 Uso/Checkpoints e regras]]. Para continuar no outro PC: [[02 Uso/Rotina Casa e Trabalho]].

← [[00 Comece aqui]]
