---
tipo: engenharia
versao: "0.3.0"
atualizado: 2026-10-07
tags: [devsync, engenharia]
cssclasses: [devsync]
fontes: ["docs/ADR-001.md","docs/ADR-002.md"]
---
# 🧭 Decisões técnicas

As decisões originais ficam em `docs/ADR-001.md` e `docs/ADR-002.md`. Esta nota ajuda a entender suas consequências no uso.

| Decisão | Motivo | Consequência |
| --- | --- | --- |
| Git transporta código | Reutiliza o histórico e remoto do projeto | Arquivo sem commit não chega ao outro PC |
| Recebimento ff-only | Evita resolver divergências automaticamente | Conflitos precisam de intervenção |
| Desktop na sessão do usuário | Aproveita autenticação Git e dispensa serviço Windows do sistema | Autostart ocorre após login |
| API local compartilhada | Desktop e CLI controlam o mesmo motor | Serviço externo pode continuar após sair do desktop |
| Checkpoint optativo | Commit automático exige escolha do usuário | Cadastro começa sem essa automação |
| Push independente | Criar commit e publicá-lo são decisões distintas | Checkpoint pode existir só localmente |
| Checkpoint só em arquivos do HEAD | Evita incorporar arquivos novos sem revisão | `git add` sozinho não habilita um arquivo novo para checkpoint |
| Histórico JSON limitado | Persistência simples para uso pessoal | Mantém apenas os últimos 1.000 eventos |
| Glob por programação dinâmica | Limita custo de padrões adversariais | Não usa backtracking de regex |
| Aguardar Git e journal | Preserva propriedade até concluir tudo | Shutdown pode aguardar trabalho em curso |
| Polling de 10 segundos no remoto | Reconexão simples e fila para PCs offline | Controle remoto tem latência |
| Coordenador com uma instância | JSON não tem coordenação distribuída | Escala/multiusuário exigem outro armazenamento |
| Atualização por fonte HTTPS optativa | Usuário escolhe a origem do instalador | Precisa publicar e configurar a fonte |

## Quando abrir uma nova decisão

Mudança de banco, autenticação, comportamento de conflitos, permissões de automação ou distribuição merece um registro próprio.

Use [[06 Modelos/Decisao]]: problema, opções, escolha, consequência, validação e referência ao código. Distingua ideia de decisão aprovada e implementação concluída.

Leia [[03 Engenharia/Arquitetura]] para ver como essas decisões se conectam.

← [[00 Comece aqui]]
