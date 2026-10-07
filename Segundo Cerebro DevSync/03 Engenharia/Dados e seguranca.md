---
tipo: engenharia
versao: "0.3.0"
atualizado: 2026-10-07
tags: [devsync, engenharia]
cssclasses: [devsync]
fontes: ["src/store.js","src/history.js","desktop/main.cjs","docs/REMOTE.md"]
---
# 🔐 Dados e segurança

## Onde estão os dados locais

Padrão do usuário deste computador: `C:/Users/henri/.devsync`. Em outro usuário, use sua pasta pessoal. `DEVSYNC_HOME` permite escolher outra configuração.

| Arquivo/pasta | Conteúdo e cuidado |
| --- | --- |
| `config.json` | Projetos, caminhos, opções e token do dispositivo remoto |
| `runtime.json` | Porta, token e PID do serviço atual; dado transitório |
| `history.json` | Até 1.000 eventos de metadados |
| `desktop-updates.json` | Fonte e preferência de atualização |
| `daemon.lock` | Propriedade da instância do serviço |
| `.git/devsync.lock` ou Git common dir | Lock de sincronização do clone |

O perfil e as preferências do Electron também usam a pasta de dados do aplicativo. Autostart é uma preferência do sistema operacional.

## O que vai ao coordenador

ID/nome do computador e nomes, branches e estados dos projetos. O cliente não envia conteúdo do repositório nem caminhos locais. O código continua indo pelo transporte Git.

`coordinator.json` contém tokens individuais e fila de comandos. Ele deve estar em disco persistente privado. O token administrativo fica no ambiente do servidor.

## Fronteiras de acesso

- API local ligada apenas a `127.0.0.1`.
- Token aleatório, Host/Origin validados e CSP no painel.
- Electron com isolamento de contexto, sandbox e IPC limitado.
- Cada PC remoto usa token próprio; administrador pode revogar.
- HTTPS obrigatório para coordenadores fora de localhost.
- Atualização usa fonte confiável, checksum e instalação explícita.

## Proteção do trabalho

O motor não usa reset, stash, merge automático de históricos divergentes ou push forçado. Locks próprios não impedem operações feitas por ferramentas Git externas.

O Git ainda usa helpers e hooks do seu ambiente. Cadastre repositórios confiáveis. Segredos com nomes inesperados não são reconhecidos pela proteção de checkpoints.

## Backup

Encerre o serviço antes de copiar sua configuração local para uma pasta privada. Para recuperar opções e histórico, preserve `config.json`, `history.json` e, se necessário, `desktop-updates.json`. Runtime e lock não são dados para reutilizar em outra instância.

Faça backup consistente do coordenador com ele parado; veja [[03 Engenharia/Hospedagem e operacao]].

## Regra para este segundo cérebro

Registre procedimentos, estados e resultados. Não cole tokens, URLs com token, senhas, chaves, conteúdo de `.env` ou backups de configuração. Também revise as notas antes de sincronizá-las pelo Git.

← [[00 Comece aqui]]
