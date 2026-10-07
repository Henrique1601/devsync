---
tipo: engenharia
versao: "0.3.0"
atualizado: 2026-10-07
tags: [devsync, engenharia]
cssclasses: [devsync]
fontes: ["package.json","docs/VALIDATION.md"]
---
# 🧪 Ambiente e validação

## Requisitos

- Git.
- Node.js 22+ para executar serviço, CLI e coordenador a partir do código.
- Dependências npm para desenvolver ou empacotar o desktop.
- Windows x64 para o instalador entregue.
- Docker com engine ativo para validar a opção VPS localmente.

O coordenador usa módulos nativos Node e não depende de Git ou Electron para operar.

## Executar e empacotar

Na raiz do projeto:

```powershell
npm ci
npm test
npm run desktop
```

Para empacotar, em uma execução separada:

```powershell
npm run dist
```

Os artefatos ficam em `dist`. O build usa publicação desativada: gerar não significa hospedar.

Para usar apenas o serviço:

```powershell
npm start
```

## Verificações por tipo de mudança

| Mudança | Validação útil |
| --- | --- |
| Motor Git/checkpoints | Suíte Git temporária, preservação de alterações e contagens |
| Histórico/regras | Persistência, filtros, limites, entradas inválidas e glob adversarial |
| Interface | Cadastro, diagnóstico, regras, histórico, teclado e layout estreito |
| Desktop/atualizador | IPC e smoke empacotado; fluxo de atualização controlado |
| Coordenador | Auth, origem, fila offline, restart, ack e revogação |
| Hospedagem | HTTPS, persistência, backup/restore e healthcheck |

## Última evidência registrada

Em 07/10/2026, a entrega 0.3 teve **36 testes aprovados**, executável empacotado validado e audit de produção sem vulnerabilidades reportadas. O manifesto de atualização correspondeu ao SHA-512 do instalador.

Não houve deploy real, teste real nos dois PCs ou atualização de instalação completa. O Docker estava sem engine Linux ativo. Consulte o [relatório original](../../docs/VALIDATION.md).

## Smoke sem alterar a configuração real

```powershell
$env:DEVSYNC_HOME = "C:/DevSync-testes/smoke"
& "./dist/win-unpacked/DevSync.exe" --smoke-test
```

Esse teste abre um perfil isolado, verifica o bridge e encerra. Ele não substitui instalação, autostart ou atualização real. Evite rodá-lo enquanto outra instância desse perfil estiver aberta.

Antes de mudanças no código, preserve um checkpoint Git. Registre os resultados em [[06 Modelos/Sessao de trabalho]].

← [[00 Comece aqui]]
