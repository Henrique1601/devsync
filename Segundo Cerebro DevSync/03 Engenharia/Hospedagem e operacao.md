---
tipo: guia
versao: "0.3.0"
atualizado: 2026-10-07
tags: [devsync, guia]
cssclasses: [devsync]
fontes: ["docs/DEPLOYMENT.md","docs/REMOTE.md","compose.yaml","render.yaml"]
---
# ☁️ Hospedagem e operação

**Resultado esperado:** coordenador acessível por HTTPS, dados persistentes e PCs pareados. Esta etapa estava pendente em 07/10/2026.

## Escolher onde executar

| Opção preparada | Precisa de |
| --- | --- |
| VPS com Docker/Caddy | Servidor Linux, Docker Compose, domínio/DNS e portas 80/443 |
| Render com Blueprint | Repositório publicado, conta e serviço com disco persistente |

O JSON requer uma instância por diretório. Uma função serverless com filesystem efêmero não atende à persistência atual.

## VPS

Na cópia do projeto no servidor:

```sh
cp .env.example .env
chmod 600 .env
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Preencha privadamente `DEVSYNC_ADMIN_TOKEN`, `DEVSYNC_DOMAIN` e `ACME_EMAIL` em `.env`. Use o hostname, sem esquema ou caminho. Não cole o token aqui.

```sh
docker compose config --quiet
docker compose up -d --build
docker compose ps
curl --fail https://devsync.seudominio.com/api/health
```

O Caddy publica HTTPS; a porta do coordenador fica interna. Preserve o Host original no proxy. Configure DNS antes de pedir o certificado.

## Render

Publique o projeto em um repositório escolhido por você e aplique `render.yaml` pelo Blueprint. Revise o custo do serviço/disco antes de contratar. Guarde o token gerado pelo provedor fora do cofre.

O diretório persistente configurado é `/var/data/devsync`. Não substitua por um caminho efêmero.

## Validar antes de depender do servidor

- [ ] HTTPS válido e `/api/health` responde `{"ok":true}`.
- [ ] Pareamento de cada PC com token próprio.
- [ ] Status de projetos aparece.
- [ ] Pedido offline é entregue ao reconectar.
- [ ] Reinício preserva dispositivos e fila.
- [ ] Revogação impede o acesso do dispositivo.
- [ ] Backup e recuperação testados.

O healthcheck confirma apenas que o processo responde; não verifica Git nem se todos os PCs estão sincronizados.

## Backup consistente na VPS

```sh
docker compose stop coordinator
docker compose cp coordinator:/data/coordinator.json ./coordinator-backup.json
chmod 600 ./coordinator-backup.json
docker compose start coordinator
```

O backup contém tokens: guarde em local privado, separado das notas. Preserve os volumes nas atualizações; `down -v` remove dados.

Para recuperação, pare o serviço, restaure um backup compatível no diretório persistente com permissões corretas e valide novamente pareamento e fila. Reverter código sozinho não recupera dispositivos excluídos.

Procedimento completo e referências do provedor: [DEPLOYMENT.md](../../docs/DEPLOYMENT.md).

Depois de publicar: [[02 Uso/Painel remoto]]. Registro de incidente: [[06 Modelos/Incidente]].

← [[00 Comece aqui]]
