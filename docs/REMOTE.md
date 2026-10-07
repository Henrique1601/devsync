# Painel remoto

O coordenador é um processo independente. Ele não precisa de Git nem de Electron e não armazena código dos projetos.

## Testar no mesmo computador

Em um terminal PowerShell, na pasta DevSync:

```powershell
$env:DEVSYNC_ADMIN_TOKEN = node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
npm run coordinator
```

Guarde o token gerado em um local privado para reutilizá-lo após reiniciar. Abra http://127.0.0.1:8787 e informe esse token. Use **Adicionar computador** para gerar um ID e token separados para Casa e Trabalho.

No painel local de cada PC, preencha o endereço do coordenador, nome do PC, ID e token do dispositivo. O status deve aparecer no painel remoto em até 10 segundos. O token de administrador nunca deve ser usado como token de dispositivo.

Quando um PC estiver offline, os comandos ficam pendentes em disco. Quando reconectar, recebe até 10 comandos por consulta. A última conexão e o resultado aparecem no painel remoto. Desconectar computador no painel remoto revoga seu token e suas solicitações.

## Acessar entre computadores

Hospede o coordenador em uma máquina sempre disponível, com Node.js 22+ e proxy HTTPS. Configure no ambiente do processo:

```text
DEVSYNC_ADMIN_TOKEN=<token aleatório com pelo menos 32 caracteres>
DEVSYNC_COORDINATOR_HOST=127.0.0.1
DEVSYNC_COORDINATOR_PORT=8787
DEVSYNC_COORDINATOR_HOME=<diretório persistente e privado>
```

O proxy HTTPS deve preservar o Host original e encaminhar as requisições à porta 8787. Configure o serviço para reiniciar após falhas. Mantenha uma única instância por diretório. Não sirva o diretório de dados como conteúdo público. Se estiver em um container, pode usar `0.0.0.0` internamente, com a porta exposta somente ao proxy.

Os dispositivos aceitam HTTP somente em localhost. Para Casa e Trabalho, use `https://seu-dominio`. Não exponha a API local dos PCs: eles fazem as conexões de saída ao coordenador. A implantação em um domínio real não é feita pela geração do instalador.

Faça backup de `coordinator.json`: contém os tokens dos dispositivos e a fila. O administrador é um único usuário com token, sem recuperação de conta ou login social nesta versão. O painel mantém o token de administrador apenas na memória da aba. Fechar/recarregar a aba exige informá-lo novamente.

Comandos remotos permitidos: sincronizar, pausar e retomar. Cadastro de pastas, clonagem, checkpoints e envio automático são controlados localmente.
