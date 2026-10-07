---
tipo: planejamento
versao: "0.3.0"
atualizado: 2026-10-07
tags: [devsync, planejamento]
cssclasses: [devsync]
fontes: ["docs/VALIDATION.md","docs/DEPLOYMENT.md"]
---
# 🛤️ Roadmap

Use esta nota para planejar. Os itens abaixo são próximos passos sugeridos, sem promessa de que foram executados.

## Primeiro uso real

- [ ] Instalar a versão 0.3 nos PCs Casa e Trabalho.
- [ ] Cadastrar um repositório de teste nos dois PCs.
- [ ] Confirmar identidade e autenticação Git de cada PC.
- [ ] Enviar um commit de Casa e recebê-lo no Trabalho.
- [ ] Repetir no sentido inverso.
- [ ] Validar fechamento para bandeja e saída pelo menu.
- [ ] Validar autostart após login, se ativado.
- [ ] Registrar o resultado com [[06 Modelos/Sessao de trabalho]].

## Publicação remota

- [ ] Escolher hospedagem e confirmar persistência.
- [ ] Configurar domínio, se usar VPS.
- [ ] Publicar o coordenador com HTTPS.
- [ ] Verificar healthcheck, pareamento e revogação.
- [ ] Testar um pedido enquanto um PC está offline.
- [ ] Reiniciar o servidor e verificar preservação da fila.
- [ ] Testar backup e recuperação.

Procedimento: [[03 Engenharia/Hospedagem e operacao]].

## Distribuição e qualidade

- [ ] Publicar a fonte HTTPS de atualizações.
- [ ] Testar atualização completa de uma versão instalada.
- [ ] Definir assinatura de código para o instalador.
- [ ] Configurar remoto Git para o próprio DevSync.
- [ ] Fazer avaliação completa de acessibilidade.

## Evoluções para discutir

Banco de dados, múltiplos usuários e um fluxo assistido para conflitos precisam de novas decisões. Registre propostas em [[05 Registros/Caixa de entrada]] e formalize com [[06 Modelos/Decisao]].

← [[00 Comece aqui]]
