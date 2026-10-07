# Hospedar o painel remoto

O coordenador foi preparado para publicação. Estes arquivos não criam um servidor nem colocam o painel online por conta própria. É necessário escolher uma conta/provedor ou uma VPS e, para a VPS, informar um domínio. O serviço usa arquivo JSON persistente e deve ter **uma única instância** por diretório de dados. O painel local dos computadores continua privado e faz conexões de saída.

## VPS Linux com Docker e HTTPS

Os arquivos `Dockerfile`, `compose.yaml` e `Caddyfile` executam o coordenador como usuário `node`, com disco persistente, reinício automático e HTTPS. Não há porta pública do coordenador; somente o Caddy publica 80/443. O host precisa ter Docker Compose instalado, DNS do domínio apontando para seu IP e portas 80/443 liberadas.

Na pasta do projeto no servidor:

```sh
cp .env.example .env
chmod 600 .env
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Edite `.env`: copie o token gerado para `DEVSYNC_ADMIN_TOKEN`, informe o hostname em `DEVSYNC_DOMAIN` (por exemplo `devsync.seudominio.com`) e seu email em `ACME_EMAIL`. Guarde o token em um gerenciador de senhas. Não versione `.env`.

```sh
docker compose config --quiet
docker compose up -d --build
docker compose ps
curl --fail https://devsync.seudominio.com/api/health
```

O resultado de saúde é somente `{"ok":true}`. Abra `https://devsync.seudominio.com`, informe o token do administrador e pareie um computador. Nos PCs, configure o endereço HTTPS, o ID e o token individual de cada dispositivo. O token administrativo não deve ser colocado nos PCs como token de dispositivo.

O Caddy emite/renova os certificados e preserva o cabeçalho Host utilizado para verificar a origem do painel. Não altere o Host para `coordinator:8787` e não exponha a porta 8787 diretamente. Consulte [HTTPS automático do Caddy](https://caddyserver.com/docs/automatic-https) e [reverse_proxy](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy).

## Render com disco persistente

`render.yaml` define um serviço Node, uma instância, health check e disco de 1 GB. O token de administrador é gerado pelo Render e fica nas variáveis de ambiente do serviço. A [especificação do Blueprint](https://render.com/docs/blueprint-spec) permite `generateValue` para gerar o segredo; o [disco persistente](https://render.com/docs/disks) exige um serviço pago. Revise os custos apresentados no provedor antes de aplicar.

1. Publique este projeto em um repositório Git autorizado por você.
2. No Render, crie um Blueprint a partir desse repositório e revise o serviço e disco propostos.
3. Após o deploy, guarde `DEVSYNC_ADMIN_TOKEN` exibido na seção Environment do serviço.
4. Acesse a URL HTTPS do serviço e verifique `/api/health` antes de parear os PCs.

Não precisa de domínio próprio: pode usar o endereço HTTPS fornecido pelo Render. O disco fica em `/var/data/devsync`; não mude esse caminho para um diretório efêmero. O plano gratuito não atende esta configuração persistente. Atualizações de um serviço com disco podem ter interrupção; dispositivos reconectam e pedidos já persistidos ficam na fila.

O coordenador usa armazenamento local persistente. Uma publicação como site estático ou função serverless com filesystem efêmero exige primeiro migrar esse armazenamento para um banco de dados. Os arquivos atuais destinam-se à VPS ou ao serviço persistente no Render.

## Verificação, backup e recuperação

Valide a saúde, pareamento, envio de status, um comando com o PC offline, entrega ao reconectar e revogação. Recrie o container/serviço e confirme que os computadores pareados e a fila continuam presentes. A rota de saúde não verifica conectividade dos PCs: ela confirma apenas que o processo HTTP responde.

Na VPS, faça backup consistente com o coordenador parado:

```sh
docker compose stop coordinator
docker compose cp coordinator:/data/coordinator.json ./coordinator-backup.json
chmod 600 ./coordinator-backup.json
docker compose start coordinator
```

`coordinator.json` contém tokens individuais e a fila. Proteja o backup e guarde também o token administrativo fora do arquivo. Preserve os volumes ao atualizar: `docker compose down` os mantém; não use `down -v`. No Render, use a recuperação do disco disponibilizada pelo provedor e confira o JSON após restaurar. Não copie um backup para diretório público do painel.

Para reverter uma atualização, selecione o commit anterior, reconstrua o container com os mesmos volumes (ou use o rollback do provedor) e verifique a saúde e pareamento. Se o formato do JSON tiver mudado, restaure também o backup compatível antes de reiniciar. Sem cópia dos dados, rollback de código não recupera dispositivos excluídos.
