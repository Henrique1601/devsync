---
tipo: engenharia
versao: "0.6.0"
atualizado: 2026-10-16
tags: [devsync, engenharia]
cssclasses: [devsync]
fontes: ["docs/ADR-001.md","docs/ADR-002.md"]
---
# 🧭 Decisões técnicas

As decisões registram a arquitetura e garantem que o DevSync permaneça seguro, previsível e sem dependências desnecessárias.

| Decisão | Motivo | Consequência |
| --- | --- | --- |
| Pre-Commit Secret Scanner Nativo | Previne vazamento acidental de credenciais para repositórios públicos | Checkpoints são bloqueados se tokens, chaves RSA, AWS ou Gemini forem detectados no diff |
| Resolução Semântica IA + Fallback Heurístico | Reconcilia divergências sem quebrar código quando `GEMINI_API_KEY` estiver presente | Se a IA estiver offline ou desconfigurada, a heurística semântica resolve com segurança |
| Editor Visual 3-Way de Conflitos | Oferece controle visual granular sobre o merge antes de salvar no disco | O desenvolvedor inspeciona HEAD, Upstream e o código final antes da persistência |
| Atalhos Globais de Sistema (`Ctrl+Shift+S`, `Ctrl+Shift+D`) | Permite sincronização instantânea em background durante o fluxo de trabalho | Acesso sem necessidade de abrir a interface gráfica |
| Sincronização de Git Tags (`--tags`) | Garante paridade de releases, versões e marcos entre computadores | Tags criadas em um PC são automaticamente enviadas e recebidas pelo outro |
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
| Protocolo MCP via stdio (12 ferramentas) | Integração universal com agentes autônomos (Claude, Cursor, Antigravity) | DevSync vira ferramenta de infraestrutura para IA |
| Coordenador como PWA | Acesso móvel nativo sem necessidade de app store | Manifest e touch controls em qualquer celular |

← [[00 Comece aqui]]
