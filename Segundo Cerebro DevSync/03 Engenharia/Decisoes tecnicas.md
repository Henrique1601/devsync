---
tipo: engenharia
versao: "0.8.0"
atualizado: 2026-10-17
tags: [devsync, engenharia]
cssclasses: [devsync]
fontes: ["docs/ADR-001.md","docs/ADR-002.md"]
---
# 🧭 Decisões técnicas

As decisões registram a arquitetura e garantem que o DevSync permaneça seguro, previsível e sem dependências desnecessárias.

| Decisão | Motivo | Consequência |
| --- | --- | --- |
| AI Morning Catch-Up & Retomada de Contexto com Fallback Heurístico | Reintroduzir o desenvolvedor no contexto de trabalho instantaneamente ao mudar de ambiente (Casa vs Trabalho) | Analisa commits e diffs, extrai pendências técnicas (`TODO`/`FIXME`), sugere próximos passos e persiste automaticamente na nota diária do Obsidian sem depender obrigatoriamente de chaves externas de IA |
| HUD Spotlight Command Palette com IPC Nativo e Redimensionamento Dinâmico | Transformar o HUD passivo numa ferramenta de ação e navegação rápida instantânea | Janela frameless redimensiona dinamicamente entre 320x52 (pílula) e 460x420 (Spotlight), integrando busca fuzzy, atalhos rápidos (`Alt+C` para VS Code, `Alt+G` para GitHub, `Alt+D` para Diffs, `Enter` para sincronizar) |
| Protocolo MCP via stdio (17 ferramentas) | Integração de nível de sistema para agentes de IA autônomos | Adição de `devsync_catch_up` permitindo que LLMs invoquem o briefing matinal |
| P2P Direct LAN com UDP Beacon (Porta 48123) | Permite que instâncias do DevSync na mesma rede local se descubram sem configuração de IP | Descoberta automática zero-configuração via broadcasts UDP a cada 5 segundos |
| Git Bundles binários para transporte P2P | Sincroniza commits completos diretamente entre máquinas sem depender de servidor remoto ou GitHub | Comunicação direta e à prova de quedas de conexão externa à internet |
| Git Worktrees isoladas em `.devsync/worktrees/` | Permite sincronizar branches secundárias em background sem trocar a branch ativa | O desenvolvedor não sofre interrupções no editor nem stashes forçados |
| Repo Scout com interrupção em `.git` | Varre pastas do disco descobrindo repositórios sem perder tempo descendo em submódulos | Descoberta rápida e cadastro em lote sem travar a thread de execução |
| DevSync Dynamic HUD (Janela Frameless Translúcida) | Fornece feedback visual contínuo e não-intrusivo diretamente na área de trabalho | Janela flutuante reposicionável via drag-and-drop com status, métricas e atalho `Ctrl+Shift+H` |
| Diário de Bordo automatizado no Obsidian | Centraliza histórico e produtividade no Segundo Cérebro em formato Markdown padrão | Criação automática em `05 Registros/YYYY-MM-DD - Resumo Diario.md` |
| Protocolo MCP via stdio (16 ferramentas) | Integração de nível de sistema para agentes de IA autônomos | IA pode invocar scout, worktree sync, resumos e consultas P2P diretamente |
| Pre-Commit Secret Scanner Nativo | Previne vazamento acidental de credenciais para repositórios públicos | Checkpoints são bloqueados se tokens, chaves RSA, AWS ou Gemini forem detectados no diff |
| Resolução Semântica IA + Fallback Heurístico | Reconcilia divergências sem quebrar código quando `GEMINI_API_KEY` estiver presente | Se a IA estiver offline ou desconfigurada, a heurística semântica resolve com segurança |
| Editor Visual 3-Way de Conflitos | Oferece controle visual granular sobre o merge antes de salvar no disco | O desenvolvedor inspeciona HEAD, Upstream e o código final antes da persistência |
| Atalhos Globais de Sistema (`Ctrl+Shift+S`, `Ctrl+Shift+D`, `Ctrl+Shift+H`) | Permite sincronização instantânea em background durante o fluxo de trabalho | Acesso sem necessidade de abrir a interface gráfica |
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
| Coordenador como PWA | Acesso móvel nativo sem necessidade de app store | Manifest e touch controls em qualquer celular |

← [[00 Comece aqui]]
