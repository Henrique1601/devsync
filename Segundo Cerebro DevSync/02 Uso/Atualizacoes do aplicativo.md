---
tipo: guia
versao: "0.3.0"
atualizado: 2026-10-07
tags: [devsync, guia]
cssclasses: [devsync]
fontes: ["desktop/updates.cjs","desktop/main.cjs","package.json"]
---
# 📦 Atualizações do aplicativo

O atualizador funciona no **aplicativo Windows empacotado**. A execução de desenvolvimento não oferece atualização de instalação.

## Para quem usa

1. Se estiver na versão 0.2, instale manualmente a 0.3 uma vez.
2. Abra **Computador → Atualizações do aplicativo**.
3. Informe a pasta HTTPS publicada por uma fonte que você conhece.
4. Ative **Verificar novas versões automaticamente** e salve.
5. Confirme a confiança na nova fonte no diálogo do aplicativo.
6. Use **Buscar atualização**.
7. Havendo uma nova versão, escolha **Baixar atualização**.
8. Depois, escolha **Instalar e reiniciar** e confirme.

**Verificar não baixa; baixar não instala.** O aplicativo encerra seu serviço antes de abrir o instalador. Se estiver conectado a um serviço CLI externo, esse serviço não pertence ao desktop.

A verificação optativa acontece pouco após abrir o aplicativo e a cada seis horas.

## Para quem publica versões

```powershell
npm ci
npm run dist
```

Publique juntos em uma pasta HTTPS:
- `latest.yml`
- `DevSync Setup 0.3.0.exe` ou o instalador da versão nova
- O `.exe.blockmap` correspondente

Na próxima entrega, incremente a versão antes de gerar os artefatos. Use o manifesto produzido pelo build e confira seu checksum.

Exemplo de pasta: `https://seu-servidor/updates/`. Não informe o arquivo EXE ou YAML no campo da fonte.

## Proteções e limites

A fonte exige HTTPS, sem senha na URL. Arquivos e redirecionamentos ficam restritos à mesma origem e pasta; o download valida checksum. A origem precisa continuar confiável: checksum não substitui assinatura de publicador.

A URL `updates.devsync.invalid` no empacotamento é um placeholder, não um serviço publicado. A versão documentada ainda não tem fonte de versões online nem assinatura de publicador.

Se a instalação falhar depois da parada do serviço, reinicie o DevSync e confira os projetos.

← [[00 Comece aqui]]
