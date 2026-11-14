

```
index.html, style.css, app.js, manifest.json   → telas do app (GitHub Pages)
materiais.js                                    → lista de materiais por serviço + preços estimados (Uberaba)
assets/                                         → foto e ícones do cartão de visita
apps-script/Code.gs                             → backend (regras, login, fotos, PDFs)
apps-script/Logo.gs                             → foto do Pietro para os PDFs
apps-script/*.html                              → modelos dos PDFs
PROMPT_APP.md                                   → escopo e prompt original
```

<!-- manutencao:inicio -->
## Manutenção (resumo)

> Resumo para manter o app. Atualizado em 14/11/2026. Visão de todos os apps: https://wiapps.com.br/documentacao/ (com senha).

- **O que faz:** App do Pietro Fasano, marido de aluguel em Uberaba: clientes, orçamentos, execução com fotos, carteira e PDFs.
- **No ar:** https://junin12.github.io/app-pietro/ · Cópia no wiapps: https://wiapps.com.br/pietro/
- **Rodar no PC:** Abrir index.html; o backend é o Apps Script publicado como App da Web.
- **Publicar:** GitHub Pages (push no main). A cópia do cPanel é manual: reenviar index.html, app.js, style.css, manifest.json e materiais.js.
- **Chaves e senhas:** Não usa chave de servidor: os dados ficam no aparelho. Nunca coloque o valor de uma chave neste arquivo.
<!-- manutencao:fim -->
