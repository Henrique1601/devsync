# Validação da versão 0.2

Data: 6 de outubro de 2026. Ambiente: Windows, Node.js 24.16.0, Electron 44.6.0.

## Verificado

- Correção de bloqueio residual: três testes adicionais verificam proprietário ativo, recuperação de processo antigo encerrado e preservação de origem incerta. O teste de integração do daemon foi repetido com a correção e passou.

- Suíte Node com 16 testes de integração: sincronização Git, proteção de alterações locais, checkpoints optativos, clonagem sem rede pela API, autenticação e coordenação remota.
- Desktop em configuração isolada: serviço local iniciou, bandeja foi criada e IPC da janela com preload isolado respondeu. Encerramento normal removeu o runtime/lock do serviço criado pelo desktop.
- Navegador: painel local carregou; URL informada no cadastro de pasta exibiu instrução de usar a clonagem; recarga preservou a sessão autenticada; pareamento por token gerou dispositivo; o painel local e o remoto confirmaram estado conectado/online.
- Teste de integração adicional com o daemon real conectado ao coordenador: heartbeat publicou os projetos, comando remoto retomou o projeto e a confirmação foi persistida na fila.
- Instalador NSIS Windows x64 gerado em `dist/DevSync Setup 0.2.0.exe`.
- Executável empacotado em `dist/win-unpacked/DevSync.exe` passou pelo mesmo smoke test: serviço, bandeja e IPC funcionaram, e o encerramento removeu runtime e lock da configuração isolada.
- `npm audit --omit=dev`: nenhuma vulnerabilidade reportada nas dependências de produção. A cadeia de ferramentas de empacotamento reportou 8 alertas moderados transitivos relacionados a `sprintf-js`; nenhuma dessas dependências é incluída no app empacotado.

## Limites da validação

Não houve publicação em domínio HTTPS, instalação nos dois PCs do usuário, execução de clonagem com credenciais reais do GitHub, nem login/reinicialização do Windows para verificar a preferência de inicialização automática. O smoke test lê a preferência e não a altera. Notificações são configuradas para transições de estado; sua apresentação depende das permissões/configurações de notificações do Windows.

Não há baseline visual anterior para comparação, nem auditoria completa de acessibilidade ou métricas de desempenho web. O resultado não afirma cobertura desses aspectos.
