---
tipo: guia
versao: "0.3.0"
atualizado: 2026-10-07
tags: [devsync, guia]
cssclasses: [devsync]
fontes: ["src/checkpoint.js","src/rules.js"]
---
# ⚙️ Checkpoints e regras

**Checkpoint cria commit. Envio publica commit.** São permissões independentes e começam desativadas.

## Configurar no painel

Em **Projetos**, abra **Regras de sincronização e checkpoints**, salve as regras e depois ative as opções desejadas.

| Regra | Padrão | Faixa |
| --- | --- | --- |
| Verificar a cada | 30 segundos | 15 a 3.600 segundos |
| Esperar sem alterações | 60 segundos | 30 a 3.600 segundos |
| Arquivos permitidos | `**` | 1 a 50 padrões, até 200 caracteres cada |

## Escolher padrões

Um por linha:

```text
src/**
README.md
```

| Padrão | Seleciona |
| --- | --- |
| `src/**` | Arquivos dentro de src e subpastas |
| `*.md` | Markdown na raiz |
| `**/*.md` | Markdown na raiz e em subpastas |
| `?` | Um caractere dentro de um nome, sem cruzar / |
| `**` | Todos os arquivos que já estão no HEAD |

Use `/` como separador. Caminhos absolutos, `..`, regras negativas e segmentos `.git` são rejeitados.

## O que pode entrar no checkpoint

Alterações ou exclusões de arquivos já existentes no último commit e dentro dos padrões. Arquivos novos, mesmo adicionados ao índice, exigem commit manual. Alterações fora da lista ficam preservadas.

Arquivos novos pendentes ou alterações excluídas ainda podem deixar o projeto com estado **Alterações locais pendentes**, impedindo recebimento.

## Como a espera funciona

A estabilidade é medida a partir da primeira observação do diff dos arquivos selecionados. O checkpoint ocorre na verificação seguinte ao fim da espera. Por isso, 60 segundos de espera não significam exatamente 60 segundos após salvar. Reiniciar o serviço reinicia a observação.

Mudanças continuam chegando enquanto você edita; a espera recomeça se o diff selecionado mudar.

## Quando não cria commit

Durante operação Git, branch diferente, HEAD destacado ou divergência já conhecida. Nomes sensíveis como `.env`, chaves e arquivos de credenciais bloqueiam os checkpoints selecionados.

A proteção por nome não reconhece todos os segredos. Revise `.gitignore`, arquivos rastreados e padrões antes de ativar.

## Exemplo controlado

1. Comece num repositório de teste.
2. Permita apenas `README.md`.
3. Ative checkpoints, mantendo envio desativado.
4. Altere e salve o README; aguarde as verificações.
5. Confira **Checkpoint criado** no [[02 Uso/Historico e estados|Histórico]] e o commit no Git.
6. Só ative envio quando decidir publicar os commits.

Detalhes técnicos: [[03 Engenharia/Decisoes tecnicas]].

← [[00 Comece aqui]]
