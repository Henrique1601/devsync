---
tipo: guia
versao: "0.3.0"
atualizado: 2026-10-07
tags: [devsync, guia]
cssclasses: [devsync]
fontes: ["README.md","src/git.js"]
---
# 🏠 Rotina Casa e Trabalho

**Resultado esperado:** continuar o mesmo projeto e branch, com as mudanças já publicadas pelo PC anterior.

## Preparar uma vez

Cadastre o mesmo repositório em cada PC. Os caminhos locais podem ser diferentes. Mantenha a mesma branch para a rotina descrita aqui.

Configure a autenticação Git e escolha se cada PC enviará commits automaticamente. Não precisa de coordenador remoto para sincronizar pelo GitHub.

## Antes de começar

1. Salve ou conclua alterações pendentes do PC atual.
2. Abra o DevSync e confira se o projeto está pausado.
3. Use **Sincronizar agora**.
4. Só comece após entender o resultado: sincronizado ou uma pendência explicada.

## Antes de trocar de computador

1. Salve os arquivos no editor.
2. Crie um commit manual ou aguarde um checkpoint permitido.
3. Inclua arquivos novos manualmente, se houver.
4. Envie os commits: use o Git ou ative **envio de commits** e sincronize.
5. Confira o histórico e se ainda existem commits para enviar.

Uma rotina manual, dentro da pasta do projeto:

```powershell
git status
git add -- src/minha-alteracao.js
git diff --cached
git commit -m "feat: descreve a mudança"
git push
```

Ajuste o arquivo e a mensagem; revise o diff antes do commit. Evite operações Git manuais enquanto o DevSync está sincronizando.

## No outro PC

Abra o projeto e sincronize. Recebimento funciona se o clone estiver sem alterações pendentes, na branch cadastrada e puder avançar por fast-forward.

## Se os dois PCs mudaram a mesma branch

Se ambos criaram commits antes de receber o trabalho do outro, pode haver divergência. Pause a automação e resolva pelo fluxo Git do projeto. O DevSync preserva os históricos e não faz merge, rebase ou push forçado por você.

Veja [[02 Uso/Historico e estados]] e [[04 Problemas/Diagnostico e erros]].

## Checklist de saída

- [ ] Arquivos salvos.
- [ ] Commit criado.
- [ ] Commit enviado.
- [ ] Histórico conferido.
- [ ] Próximo passo anotado em [[05 Registros/Caixa de entrada]] ou em uma sessão.

← [[00 Comece aqui]]
