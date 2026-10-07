# DevSync 0.2

Sincronização Git entre seus PCs, com aplicativo de bandeja para Windows, CLI, painel local, coordenador remoto e checkpoints optativos. O GitHub transporta o código; o coordenador acompanha dispositivos e pedidos.

## Usar o aplicativo Windows

Execute `dist/DevSync Setup 0.2.0.exe` e siga o instalador. O aplicativo contém seu próprio runtime; precisa somente de Git instalado e autenticação Git configurada. O instalador ainda não possui certificado de assinatura de um publicador.

Abra DevSync. Para um repositório já baixado, use **Selecionar pasta** e **Cadastrar**. Para baixar um novo, use **Clonar do GitHub**, informe a URL HTTPS e o caminho absoluto de uma nova pasta. O diretório pai precisa existir. Repositórios privados usam as credenciais já configuradas no Git.

Cada projeto usa a branch ativa no cadastro e precisa de commits e upstream. Um clone normal do GitHub costuma configurar o upstream automaticamente. O cadastro informa quando isso estiver faltando.

Fechar a janela mantém o aplicativo e o serviço na bandeja. Clique duas vezes no ícone para abrir. Use **Sair** no menu para encerrar. Selecione **Iniciar com o Windows** para iniciar na bandeja após entrar na sua conta. Isso é inicialização na sessão do usuário, e não um serviço Windows executado antes do login.

Se um serviço CLI já estiver ativo, o desktop conecta a ele. Nesse caso, sair do desktop não encerra o serviço externo. Para migrar ao desktop, encerre primeiro o terminal do serviço com Ctrl+C.

## Executar pelo código

Requisitos: Node.js 22+ e Git. Serviço, CLI e coordenador usam somente módulos nativos e funcionam sem instalar dependências npm.

```powershell
npm start
```

Abra o endereço exibido no terminal. Ele contém um token local de acesso; não o compartilhe. Em outro terminal:

```powershell
node src/cli.js add "C:\Projetos\meu-crm"
node src/cli.js clone "https://github.com/usuario/projeto.git" "C:\Projetos\nova-pasta"
node src/cli.js status
node src/cli.js sync ID_DO_PROJETO
node src/cli.js push-on ID_DO_PROJETO
node src/cli.js checkpoint-on ID_DO_PROJETO
node src/cli.js pause ID_DO_PROJETO
node src/cli.js resume ID_DO_PROJETO
node src/cli.js dashboard
```

Para executar o desktop a partir do código ou gerar o instalador:

```powershell
npm ci
npm run desktop
# Gerar instalador Windows:
npm run dist
```

Em Linux/macOS, serviço e CLI usam os caminhos locais. Esta entrega empacota o desktop para Windows x64. Use o ID em comandos: nomes de projetos podem se repetir em pastas diferentes.

## Trabalho e Casa

1. Cadastre o mesmo repositório em cada PC.
2. Ative **envio de commits** onde quiser enviar automaticamente. O padrão é desativado.
3. Faça seus commits normalmente ou ative checkpoints em cada projeto desejado.
4. A cada 30 segundos, o serviço busca atualizações e aplica somente fast-forward. Se autorizado, envia os commits existentes.
5. No outro PC, o projeto precisa estar na branch cadastrada e em condições de receber atualizações. Pendências aparecem no painel e nas notificações do desktop.

## Checkpoints automáticos

Checkpoints e push são opções independentes e começam desativados. Ativar checkpoints autoriza criar commits após cerca de 60 segundos de estabilidade das diferenças observadas. A verificação acontece a cada 30 segundos. O Git precisa de `user.name` e `user.email` configurados.

Arquivos rastreados alterados e exclusões entram no commit. Arquivos novos não rastreados ficam preservados para inclusão manual com `git add`; arquivos novos já adicionados ao índice entram no próximo commit. Arquivos ainda não salvos no editor não são vistos. Checkpoints não são snapshots de arquivos ignorados pelo Git.

Checkpoints pausam durante operações Git, troca de branch ou divergência já conhecida. Nomes comuns de arquivos sensíveis, como `.env`, `*.key`, `*.pem` e `credentials`, bloqueiam o commit automático. Isso não detecta todo segredo: revise o `.gitignore` e os arquivos rastreados antes de ativar. Checkpoints não enviam commits sem a opção de envio ativada. Arquivos novos pendentes também impedem a sincronização, mesmo após um checkpoint dos arquivos rastreados.

## Painel remoto

O coordenador está implementado como servidor separado com pareamento por token de dispositivo, status de Casa e Trabalho, fila persistente para PCs offline, resultados e revogação. As conexões partem dos PCs; nenhuma porta precisa ser aberta neles.

Consulte [configuração do servidor remoto](docs/REMOTE.md). É possível testar em localhost; para uso entre computadores, hospede o coordenador com HTTPS e armazenamento persistente. O instalador não publica um servidor nem cria uma conta de hospedagem automaticamente.

O painel remoto pode sincronizar, pausar e retomar. Configuração de pastas, checkpoints, clonagem e envio são locais. Os comandos podem ser repetidos após uma perda de conexão antes da confirmação; sincronizar, pausar e retomar são idempotentes.

## Dados e proteções

- Configuração local em `~/.devsync`; `DEVSYNC_HOME` permite isolar outra instância. Contém caminhos de projetos e token do dispositivo, quando conectado. Proteja essa pasta.
- Serviço local ligado somente a `127.0.0.1`, com token aleatório e validação de Host/Origin. Não exponha essa API na rede.
- Recebimento por fast-forward, sem reset, stash, rebase, merge de históricos divergentes ou push forçado.
- Lock por repositório e fila local evitam operações simultâneas do DevSync. Ferramentas Git externas não respeitam esse lock; evite operações manuais durante sincronizações.
- Falhas de rede são tentadas novamente no próximo ciclo. Timeout de 60 segundos por operação Git.
- Use repositórios/configurações Git confiáveis: Git usa seus transportes, helpers e hooks locais.
- Encerramento abrupto pode deixar locks. O serviço recupera automaticamente `~/.devsync/daemon.lock` quando o PID registrado comprovadamente encerrou. Bloqueios recentes, processos ativos e origem incerta são preservados. Locks Git não são removidos automaticamente; confirme que nenhuma sincronização está ativa antes de removê-los.
- Não há resolutor automático de conflitos. Resolva divergências no editor/Git e solicite nova sincronização.

## Verificação

```powershell
npm test
```

Testes usam remotos e clones temporários, sem acessar seus projetos ou GitHub. Cobrem sincronização, push optativo, preservação de alterações, divergência, locks, branches, checkpoints, cadastro e clonagem pela API, autenticação, pareamento, persistência da fila, execução remota e revogação.

Consulte [decisões de arquitetura](docs/ADR-001.md). O coordenador JSON é destinado ao uso pessoal, com uma instância por diretório. Escala maior e múltiplos usuários exigem outra camada de persistência e autenticação.
