---
tipo: engenharia
versao: "0.5.0"
atualizado: 2026-10-16
tags: [devsync, engenharia]
cssclasses: [devsync]
fontes: ["docs/ADR-001.md","docs/ADR-002.md"]
---
# 🧭 Decisões técnicas

As decisões registram a arquitetura e garantem que o DevSync permaneça seguro, previsível e sem dependências desnecessárias.

| Decisão | Motivo | Consequência |
| --- | --- | --- |
| Git transporta código | Reutiliza o histórico e remoto do projeto | Arquivo sem commit não chega ao outro PC |
| Recebimento ff-only | Evita resolver divergências automaticamente | Conflitos precisam de intervenção |
| Simulação de conflitos via `git merge-tree` | Permite dry-run em memória sem alterar a árvore de trabalho | Usuário sabe antes se a reconciliação gerará conflitos |
| Webhooks com fetch nativo e AbortSignal | Evita bibliotecas terceiras de requisição HTTP | Suporte zero-dependency com timeout seguro de 6s |
| Agregação de métricas no daemon | Cálculo leve em tempo real baseado no histórico persistente | Estatísticas instantâneas sem banco analítico pesado |
| Desktop na sessão do usuário | Aproveita autenticação Git e dispensa serviço Windows do sistema | Autostart ocorre após login |
| API local compartilhada | Desktop e CLI controlam o mesmo motor | Serviço externo pode continuar após sair do desktop |
| Checkpoint optativo | Commit automático exige escolha do usuário | Cadastro começa sem essa automação |
| Push independente | Criar commit e publicá-lo são decisões distintas | Checkpoint pode existir só localmente |
| Checkpoint só em arquivos do HEAD | Evita incorporar arquivos novos sem revisão | `git add` sozinho não habilita um arquivo novo para checkpoint |
| Histórico JSON limitado | Persistência simples para uso pessoal | Mantém apenas os últimos 1.000 eventos |
| Coordenador SQLite nativo (`node:sqlite`) | Alta performance e integridade ACID para multi-dispositivo | Zero dependências npm no engine Node 22 |
| Protocolo MCP via stdio | Integração universal com agentes autônomos (Claude, Cursor, Antigravity) | DevSync vira ferramenta de infraestrutura para IA |
| Coordenador como PWA | Acesso móvel nativo sem necessidade de app store | Manifest e touch controls em qualquer celular |

← [[00 Comece aqui]]
