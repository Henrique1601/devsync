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

## Arquivo de Histórico ou JSON Corrompido / Bytes Nulos

**Sinal:** “Não foi possível iniciar o DevSync — Unexpected token ' '” ou “Unexpected token ... is not valid JSON”.

**Causa:** Reinicialização forçada do computador, queda de energia ou encerramento inesperado do processo durante escrita em disco NTFS no Windows, deixando o arquivo `~/.devsync/history.json` ou `config.json` preenchido com bytes nulos (`\0`) ou truncado.

**Resolução & Auto-Cura:**
1. O DevSync possui mecanismo nativo de auto-cura: ao detectar bytes nulos (`\0`) ou JSON sintaticamente inválido, o arquivo defeituoso é automaticamente colocado em quarentena renomeado para `history.json.corrupt-<timestamp>.bak` e o sistema inicializa um histórico limpo sem travar o aplicativo.
2. As escritas do DevSync utilizam sincronização física em disco (`handle.sync()`) antes do rename atômico para blindar o sistema de arquivos contra preenchimento de clusters vazios pelo Windows.
3. Caso precise recuperar manualmente no terminal:
```powershell
# Verificar se o arquivo está preenchido com nulos
node -e "const fs = require('fs'); console.log(fs.readFileSync(process.env.USERPROFILE + '/.devsync/history.json'))"

# Resetar o histórico mantendo backup
Copy-Item "$env:USERPROFILE\.devsync\history.json" "$env:USERPROFILE\.devsync\history.json.bak"
Set-Content -Path "$env:USERPROFILE\.devsync\history.json" -Value "[]" -Encoding UTF8
```

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


## Alto consumo de CPU e processos transitórios (Travamentos no Windows)

**Sinal:** Processador com 100% de uso, travamentos intermitentes ou lentidão geral no PC enquanto o DevSync está em execução; Gerenciador de Tarefas exibindo criação frequente de processos transitórios (ex: instâncias de git.exe, subprocessos do Node ou renderizadores do Electron).

**Causa mapeada:**
1. **Loop de polling a cada 1 segundo (setInterval no tick() do src/daemon.js):** A cada segundo, o daemon verifica projetos pendentes. Se houver muitos projetos ou repositórios com muitos arquivos, a checagem frequente (inspect, git status --porcelain) dispara comandos Git sucessivos.
2. **Spawns concorrentes de git.exe:** Repositórios grandes com status sujo ou sem upstream podem gerar processos transitórios de Git em rápida sucessão, saturando a fila de I/O e threads do Windows.
3. **Falta de backoff/throttling:** Repositórios em estado de erro ou divergência continuam sendo consultados no ciclo padrão sem intervalo estendido.

**Plano de Melhoria & Mitigação futura:**
1. Aumentar o intervalo base do tick de 1000ms para 3000ms-5000ms quando em repouso.
2. Implementar backoff exponencial para projetos com erros consecutivos.
3. Serializar estritamente execuções de inspeção Git via fila delimitada (concurrency limit = 1 ou 2 simultâneos).
4. Adicionar debounce nas requisições do HUD/Desktop e pausar verificações ativas quando a janela estiver minimizada/ociosa.
## Registrar e confirmar

Use [[06 Modelos/Incidente]] com contexto, passos, resultado esperado e observado. Sem credenciais. Considere resolvido quando o fluxo original funcionar novamente e houver um resultado correspondente no histórico.

← [[00 Comece aqui]]
