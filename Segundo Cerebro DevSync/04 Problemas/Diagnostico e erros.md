---
tipo: runbook
versao: "0.3.0"
atualizado: 2026-10-07
tags: [devsync, runbook]
cssclasses: [devsync]
fontes: ["src/onboarding.js","src/service-lock.js","src/git.js","README.md"]
---
# 🛠️ Diagnóstico e erros

Comece pelo texto do painel e pelo horário no [[02 Uso/Historico e estados|Histórico]]. Um status HTTP sozinho informa pouco sobre a causa.

## 400 ao cadastrar um link GitHub

**Sinal:** `POST /api/command 400` e mensagem de pasta inválida.

**Causa do caso mostrado:** o campo de pasta recebeu `https://github.com/...`. Ele espera um clone local.

**Resolver:** use **Clonar do GitHub**, informe o link e uma nova pasta absoluta. Ou clone manualmente e cadastre a pasta já criada. Confirme **Projeto cadastrado**.

## Serviço já iniciado ou lock residual

**Sinal:** “Não foi possível iniciar o DevSync — Serviço já iniciado ou lock residual”.

1. Procure o ícone DevSync na bandeja e abra a instância.
2. Confira se um terminal com `npm start` está executando o serviço.
3. Se deseja mudar de CLI para desktop, encerre o serviço pelo Ctrl+C.
4. Para encerrar o desktop, use **Sair** na bandeja.
5. Abra novamente e confira o funcionamento.

O serviço recupera automaticamente locks quando comprova que o dono encerrou. Locks recentes, donos ativos ou origem incerta são preservados. **Não apague locks enquanto existir operação ativa.** Locks Git externos não são removidos pelo DevSync.

Se persistir, registre versão, horário e mensagem; investigue a instância dona antes de qualquer limpeza manual.

## Pasta, Git, commits ou upstream ausentes

Abra **Configurar projeto → Verificar configuração**. No terminal da pasta, os comandos abaixo são de inspeção:

```powershell
git --version
git status
git branch --show-current
git remote -v
git branch -vv
git log -1 --oneline
```

Revise saídas antes de compartilhar: URLs de remotos podem conter credenciais.

Se a branch remota **já existe**, após confirmar o nome:

```powershell
git branch --set-upstream-to=origin/main
```

Troque `main` pela branch certa. Se o próprio DevSync estiver sem remoto, não há como sincronizar seu código até configurar/publicar um repositório de destino.

## Alterações pendentes e arquivos novos

`git status` mostra o que ainda não tem commit. Salve e revise os arquivos. Crie o commit manualmente, ou aguarde um checkpoint que realmente permita os arquivos.

Arquivos novos, mesmo staged, ficam fora do checkpoint. Arquivos excluídos das regras podem continuar bloqueando recebimento.

## Históricos divergentes

Pause o projeto; faça backup/checkpoint do estado e examine os históricos no Git. Resolva pelo fluxo do projeto com revisão humana, depois confira o estado e retome.

Não use reset ou push forçado como atalho para “limpar” o erro: o DevSync parou para preservar as mudanças dos dois lados.

## Falha de autenticação ou rede

O diagnóstico verifica configuração local, não login de rede. Pause o projeto, tente uma operação Git pelo terminal e configure autenticação pelas ferramentas seguras do seu provedor. Retome após confirmar o acesso.

A automação desativa prompts interativos do Git; um pedido de senha pendente não será preenchido pelo aplicativo. Falhas são tentadas novamente no próximo ciclo.

## Painel remoto desconectado

Confira HTTPS, endereço base sem caminho, ID pareado e token individual. Token administrativo e token de dispositivo têm funções diferentes. Revogação exige novo pareamento.

Confirme o servidor e a conexão de saída do PC. O PC offline não pode executar imediatamente um pedido remoto.

## Fonte de atualização sem funcionar

A fonte precisa ser uma pasta HTTPS publicada, com manifesto e artefatos compatíveis. `.invalid` é placeholder. Desenvolvimento não atualiza instalação. Se a instalação falhar após parar o serviço, reinicie o aplicativo.

## Console 401 e mensagens de extensão

Acesso à API sem token resulta em 401. Abra pelo desktop ou pelo endereço exibido pelo serviço. Mensagens de listener assíncrono de extensão não identificam, sozinhas, a causa de uma falha do DevSync; examine o erro da requisição e o texto do painel.

## Registrar e confirmar

Use [[06 Modelos/Incidente]] com contexto, passos, resultado esperado e observado. Sem credenciais. Considere resolvido quando o fluxo original funcionar novamente e houver um resultado correspondente no histórico.

← [[00 Comece aqui]]
