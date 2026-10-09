# PROMPT DE CRIAÇÃO DE APLICATIVO — "Chamou, o Pietro resolve."
### App do Pietro Fasano · Marido de aluguel em Uberaba – MG
### WebApp (GitHub Pages) + Banco de Dados (Google Planilhas + Google Drive)

> **Como usar:** revise o escopo, ajuste o que está entre `[COLCHETES]` e cole o bloco **PROMPT** (seção 2) inteiro na IA.
> Junto com o prompt, envie a pasta `assets/` (foto do Pietro e cartão de visita).

---

## 1. ESCOPO (resumo para você analisar)

| Item | Definição |
|---|---|
| **Usuário** | Só o **Pietro Fasano** (sogro), pelo celular, na rua |
| **Princípio** | **Extremamente simples**: tela inicial com botões grandes, poucos campos, quase tudo por toque |
| **Identidade visual** | A mesma do cartão de visita: amarelo + azul-marinho, fonte Poppins, foto do Pietro em círculo, slogan *"Chamou, o Pietro resolve."* |
| **Frontend** | HTML + CSS + JavaScript puro no **GitHub Pages** |
| **Banco de dados** | **Google Planilha** no Drive (cada aba = uma tabela) |
| **Fotos e PDFs** | Pastas no **Google Drive** (privadas) |
| **API** | **Google Apps Script** publicado como "App da Web" |
| **Custo** | Zero |

### Arquitetura

```
[Celular do Pietro]
        │
        ▼
[GitHub Pages: index.html + app.js + style.css + assets/]
        │  HTTPS POST (JSON)
        ▼
[Google Apps Script: Code.gs + modelos de PDF]
        │                         │
        ▼                         ▼
[Google Planilha: dados]   [Google Drive: Fotos/ e Documentos/ (PDFs)]
```

### Tela inicial (o "painel de botões")

```
┌──────────────────────────────────────┐
│ (foto) Olá, Pietro!                  │
│ Hoje: 2 serviços · A receber R$ 380  │
├──────────────────┬───────────────────┤
│ 📝 NOVO          │ 🔧 EXECUÇÃO       │
│   ORÇAMENTO      │   (fotos)         │
├──────────────────┼───────────────────┤
│ 👤 CLIENTES      │ 🧰 SERVIÇOS       │
├──────────────────┼───────────────────┤
│ 💰 CARTEIRA      │ 📊 DASHBOARD      │
├──────────────────┼───────────────────┤
│ 📁 ARQUIVO       │ ⚙️ AJUSTES        │
└──────────────────┴───────────────────┘
```

### Fluxo de trabalho

```
Cliente chama no WhatsApp
 → 👤 Cadastra cliente (nome, sobrenome, telefone, endereço: obrigatórios)
 → 📝 Toca nos serviços → app soma + deslocamento → gera MENSAGEM PRONTA no WhatsApp
 → Cliente aprova → marca APROVADO e agenda dia/hora
 → 🔧 Execução: 📷 foto ANTES → anota o que aconteceu (📷 DURANTE) → materiais usados → 📷 foto DEPOIS
 → Finaliza → app gera 2 PDFs: NOTA DE SERVIÇO (recibo) + RELATÓRIO DE QUALIDADE
 → Registra pagamento (entra na 💰 Carteira) → envia PDFs ao cliente pelo WhatsApp
 → Tudo fica guardado no 📁 Arquivo e aparece no 📊 Dashboard
```

### Funcionalidades (versão 1)

| Botão | O que faz |
|---|---|
| **Login** | Usuário fixo **Pietro Fasano**. No primeiro acesso ele **cria a senha**, que fica salva na planilha de forma criptografada (hash). Depois, entra com ela. |
| **👤 Clientes** | Cadastro com **nome, sobrenome, telefone e endereço obrigatórios**. Busca, histórico e botões para ligar, abrir no WhatsApp ou no Maps. |
| **🧰 Serviços** | Catálogo pronto com os **preços médios do briefing de Uberaba** (seção 3), já cadastrado. Dá para editar o preço, incluir ou desativar serviços. |
| **📝 Novo orçamento** | Escolhe o cliente e toca nos serviços. O total sai somado, com deslocamento e valor mínimo. **Gera a mensagem profissional no WhatsApp** com um toque. |
| **🔧 Execução** | Fotos antes, durante e depois, anotações, materiais usados e checklist de qualidade. Ao finalizar, **gera a Nota de Serviço e o Relatório de Qualidade em PDF**. |
| **💰 Carteira** | Entradas (pagamentos recebidos) e saídas (material, combustível, ferramentas, MEI...). Mostra o saldo do mês. |
| **📊 Dashboard** | Visão por semana e por mês, com filtros por período, cliente, serviço, categoria e status. Mostra números e gráficos simples. |
| **📁 Arquivo** | Todas as notas, relatórios e orçamentos em PDF, com filtro por data, cliente, tipo ou número. Dá para **abrir e enviar ao cliente**. |
| **⚙️ Ajustes** | Valores padrão (deslocamento, mínimo, margem do material), chave Pix, trocar senha e sair. |

### Fora do escopo (versão 1)

Nota fiscal eletrônica (a "Nota de Serviço" é um **recibo**, não NFS-e), cliente agendar sozinho, lembretes automáticos, vários usuários, modo totalmente offline.

### Valores padrão de cobrança (do briefing, editáveis em Ajustes)

| Item | Padrão |
|---|---|
| Deslocamento em Uberaba (fixo) | `R$ [20,00]` ← **defina o valor** |
| Deslocamento fora da cidade | R$ 2,00 por km (faixa do briefing: 1,50 a 2,50) |
| Valor mínimo por atendimento | R$ 70,00 |
| Taxa de visita/orçamento presencial | R$ 65,00 (abatida se o serviço for fechado) |
| Margem sobre material comprado pelo Pietro | 12% (faixa: 10 a 15%) |
| Garantia do serviço | 90 dias (Código de Defesa do Consumidor) |

---

## 2. PROMPT (copie daqui para baixo)

````text
Você é um desenvolvedor sênior pragmático. Crie um aplicativo web EXTREMAMENTE SIMPLES, INTUITIVO e
FÁCIL DE USAR para o Pietro Fasano, marido de aluguel em Uberaba – MG (WhatsApp (34) 99120-5525),
organizar clientes, orçamentos, execução dos serviços com fotos, documentos em PDF e o financeiro.

# 1. PÚBLICO E PRINCÍPIOS
- Um único usuário: Pietro Fasano, pessoa madura e pouco familiarizada com tecnologia.
- Uso pelo CELULAR, na rua, às vezes com sinal fraco e mãos ocupadas.
- Regras de simplicidade (obrigatórias):
  - Tela inicial = grade de 8 botões grandes com ícone + texto. Nada de menus escondidos.
  - Toda tela tem botão "← Voltar" grande no topo e título claro.
  - Máximo de 1 ação principal por tela, em botão grande amarelo no rodapé.
  - Preferir tocar a digitar: listas de seleção, botões +/−, valores pré-preenchidos.
  - Fonte mínima 18px, botões com no mínimo 56px de altura, alto contraste.
  - Mensagens curtas e humanas: "Salvo!", "Sem internet, tente de novo", nunca códigos de erro.
- Interface em português do Brasil. Datas dd/mm/aaaa, horas 24h, moeda R$ 1.234,56.

# 2. IDENTIDADE VISUAL (igual ao cartão de visita já criado — arquivos em assets/)
- Cores: amarelo #F5C518 (destaque, botões principais), azul-marinho #17337A (cabeçalhos, botões
  secundários), texto azul-escuro #14254F, fundo creme #FFFDF5, verde #1E8E3E para "pago/concluído",
  vermelho #C62828 para "cancelado/saída".
- Fonte: Poppins (Google Fonts), títulos em negrito.
- Foto do Pietro em círculo com borda branca: assets/pietro.png.
- Slogan: "Chamou, o Pietro resolve." e "Com sorriso incluso."
- Tela de login reproduz a frente do cartão (assets/cartao-frente.png como referência visual):
  fundo amarelo, "Marido de aluguel", nome "Pietro Fasano" grande em azul, slogan e foto.
- Os PDFs usam o mesmo cabeçalho: faixa amarela, foto, nome, "Marido de aluguel · Uberaba – MG",
  telefone, e rodapé azul com o slogan.
- manifest.json + ícone (foto do Pietro) para "Adicionar à tela inicial" do celular.

# 3. ARQUITETURA OBRIGATÓRIA (custo zero)
1. Frontend estático (HTML + CSS + JavaScript puro, SEM frameworks, SEM build, SEM bibliotecas;
   gráficos em SVG feito à mão) hospedado no GitHub Pages.
2. Banco de dados: Google Planilha. Cada aba é uma tabela; linha 1 = cabeçalho.
3. Arquivos: pasta privada no Google Drive "App Pietro Fasano", com subpastas
   Fotos/AAAA/MM/<numero_atendimento>/ e Documentos/AAAA/MM/.
4. API: Google Apps Script vinculado à planilha, publicado como "App da Web"
   (Executar como: Eu / Quem pode acessar: Qualquer pessoa).
5. Comunicação: fetch POST com Content-Type "text/plain;charset=utf-8" (evita CORS/preflight),
   JSON { action, sessao, data } → resposta { ok, data, error }.
6. NENHUM dado de cliente, senha ou chave no código do GitHub (repositório público).

# 4. ARQUIVOS A ENTREGAR
Frontend (GitHub):
- index.html, style.css, app.js (constante API_URL no topo), manifest.json
- assets/pietro.png, assets/cartao-frente.png (já existem, apenas referenciar)
Backend (Apps Script):
- Code.gs (roteamento, autenticação, CRUD, regras, fotos, PDFs, resumos)
- NotaServico.html e RelatorioQualidade.html (modelos HTML que viram PDF)
- Orcamento.html (modelo de orçamento em PDF, opcional ao envio por WhatsApp)
Documentação:
- README.md: instalação passo a passo para leigo (seção 13).

# 5. LOGIN E SENHA
- Usuário fixo: "Pietro Fasano" (aceitar com ou sem acento/maiúsculas e espaços extras).
- Primeiro acesso: se não existir senha na aba USUARIO, a tela pede "Crie sua senha"
  (mínimo 6 caracteres, campo de confirmação, botão 👁 para mostrar a senha).
- A senha é salva na aba USUARIO como hash SHA-256 com salt aleatório
  (Utilities.computeDigest + Utilities.getUuid). NUNCA salvar a senha pura.
- Login gera um token de sessão aleatório, válido por 30 dias, salvo na aba SESSOES (hash do token +
  validade). O frontend guarda o token no localStorage para não pedir senha toda hora.
- Toda ação da API (exceto login/criar_senha) valida a sessão.
- Bloqueio: 5 senhas erradas → aguardar 15 minutos.
- Em Ajustes: "Trocar senha" (pede a atual) e "Sair".
- Esqueceu a senha: o README explica que basta apagar o conteúdo das colunas senha_hash e salt
  na aba USUARIO; no próximo acesso o app pede para criar uma nova.

# 6. BANCO DE DADOS (abas da planilha)
USUARIO: login | senha_hash | salt | tentativas | bloqueado_ate | criado_em | atualizado_em
SESSOES: token_hash | expira_em | criado_em
CLIENTES: id | nome | sobrenome | telefone | endereco | bairro | cidade | observacao | ativo |
  criado_em | atualizado_em
SERVICOS: id | categoria | nome | unidade | preco_min | preco_max | preco | observacao |
  dica_manutencao | revisao_meses | ativo
ATENDIMENTOS: id | numero | cliente_id | itens_json | subtotal_servicos | deslocamento_tipo |
  km | valor_deslocamento | desconto | valor_materiais_cliente | valor_total | status |
  data_orcamento | data_agendada | data_inicio | data_conclusao | ocorrencias | checklist_json |
  recomendacoes_extra | pagamento | forma_pagamento | data_pagamento | criado_em | atualizado_em
FOTOS: id | atendimento_id | tipo (Antes/Durante/Depois) | legenda | file_id | data
MATERIAIS: id | atendimento_id | descricao | quantidade | valor_unitario | valor_total |
  comprado_por (Pietro/Cliente) | repassar_cliente (sim/não) | data
CARTEIRA: id | data | tipo (Entrada/Saída) | categoria | descricao | valor | forma_pagamento |
  atendimento_id | cliente_id | automatico (sim/não) | criado_em
DOCUMENTOS: id | tipo (Orçamento/Nota de Serviço/Relatório de Qualidade) | numero | atendimento_id |
  cliente_id | cliente_nome | data | valor | file_id | nome_arquivo | criado_em
CONFIG (chave | valor): nome_profissional, telefone, cidade, chave_pix, deslocamento_cidade,
  valor_km, valor_minimo, taxa_visita, margem_material, garantia_dias, mensagem_rodape

Função setup() no Code.gs: cria abas, cabeçalhos, pastas do Drive, CONFIG padrão e o catálogo
de serviços da seção 7 (só se ainda não existirem — pode rodar mais de uma vez sem duplicar).

Status do atendimento: Orçamento → Aprovado → Em execução → Concluído (ou Cancelado).
Pagamento: Pendente / Pago. Forma: Pix, Dinheiro, Cartão de débito, Cartão de crédito, Transferência.

# 7. CATÁLOGO INICIAL DE SERVIÇOS (preço = média da faixa do briefing de Uberaba, só mão de obra)
Formato: categoria ; serviço ; unidade ; mín ; máx ; preço ; dica de manutenção ; revisão (meses)

Elétrica ; Troca de tomada ou interruptor ; ponto ; 40 ; 80 ; 60 ; Não sobrecarregar com benjamins/T. Se esquentar, escurecer ou faiscar, desligar o disjuntor e chamar. ; 12
Elétrica ; Tomada/interruptor adicional (mesma visita) ; ponto ; 20 ; 40 ; 30 ; Idem tomada. ; 12
Elétrica ; Instalação de chuveiro elétrico ; un ; 80 ; 150 ; 115 ; Não mudar a temperatura com o chuveiro ligado. Limpar o crivo a cada 3 meses. Disjuntor e fio compatíveis com a potência. ; 12
Elétrica ; Troca de resistência de chuveiro ; un ; 50 ; 80 ; 65 ; Nunca ligar a chave elétrica sem água correndo. Limpar o crivo a cada 3 meses. ; 6
Elétrica ; Instalação de luminária ou plafon ; un ; 60 ; 120 ; 90 ; Usar lâmpada LED na potência indicada. Limpar com pano seco e luz desligada. ; 12
Elétrica ; Instalação de lustre grande ; un ; 150 ; 250 ; 200 ; Conferir a fixação no teto a cada 12 meses. Limpar desligado. ; 12
Elétrica ; Instalação de ventilador de teto ; un ; 120 ; 200 ; 160 ; Limpar as pás a cada 2 meses. Se balançar, reapertar e balancear. ; 6
Elétrica ; Troca de disjuntor ; un ; 80 ; 150 ; 115 ; Se desarmar com frequência, revisar o circuito. Nunca trocar por disjuntor maior. ; 12
Elétrica ; Novo ponto aparente (canaleta) ; ponto ; 120 ; 200 ; 160 ; Manter a canaleta fechada e não exceder a carga do ponto. ; 12
Elétrica ; Campainha ou interfone simples ; un ; 80 ; 150 ; 115 ; Trocar as pilhas (modelo sem fio) a cada 12 meses. ; 12
Hidráulica ; Troca de torneira ou misturador ; un ; 60 ; 100 ; 80 ; Não forçar ao fechar. Limpar o arejador a cada 3 meses. ; 12
Hidráulica ; Troca de sifão ou engate flexível ; un ; 50 ; 90 ; 70 ; Evitar gordura e restos de comida no ralo. Conferir vazamentos a cada 6 meses. ; 6
Hidráulica ; Reparo de válvula de descarga ; un ; 90 ; 180 ; 135 ; Não segurar o acionamento. Revisar o reparo a cada 2 anos. ; 24
Hidráulica ; Reparo de caixa acoplada ; un ; 70 ; 130 ; 100 ; Teste mensal: pingar corante na caixa; se colorir o vaso sem dar descarga, há vazamento. ; 12
Hidráulica ; Troca ou reparo de registro ; un ; 100 ; 200 ; 150 ; Abrir e fechar todos os registros a cada 6 meses para não travarem. ; 6
Hidráulica ; Desentupimento de pia ou vaso ; un ; 100 ; 200 ; 150 ; Usar peneira no ralo. Não jogar óleo, papel, fio dental ou lenço umedecido. ; 6
Hidráulica ; Instalação de vaso sanitário ; un ; 150 ; 250 ; 200 ; Não subir no vaso. Se balançar, chamar para reapertar e refazer a vedação. ; 12
Hidráulica ; Instalação de pia, cuba ou tanque ; un ; 150 ; 300 ; 225 ; Refazer o silicone de vedação a cada 12 a 18 meses. ; 12
Hidráulica ; Instalação de filtro ou purificador ; un ; 80 ; 150 ; 115 ; Trocar o refil no prazo do fabricante (cerca de 6 meses). ; 6
Instalações ; Suporte de TV até 55" ; un ; 100 ; 180 ; 140 ; Não pendurar objetos na TV. Conferir a fixação a cada 12 meses. ; 12
Instalações ; Suporte de TV acima de 55" ou articulado ; un ; 150 ; 250 ; 200 ; Não forçar o braço articulado além do limite. Conferir a fixação a cada 12 meses. ; 12
Instalações ; Quadro ou espelho ; peça ; 30 ; 60 ; 45 ; Evitar locais úmidos. Conferir o nível e a fixação a cada 12 meses. ; 12
Instalações ; Prateleira ; un ; 40 ; 80 ; 60 ; Respeitar a carga máxima do suporte. Não apoiar peso na ponta. ; 12
Instalações ; Cortina, varão ou persiana ; janela ; 70 ; 150 ; 110 ; Abrir e fechar pelo bastão, sem puxar o tecido. Lubrificar o trilho a cada 12 meses. ; 12
Instalações ; Varal de teto ou de parede ; un ; 80 ; 150 ; 115 ; Não exceder a carga. Trocar as cordas a cada 2 anos. ; 24
Instalações ; Kit de acessórios de banheiro ; kit ; 80 ; 150 ; 115 ; Limpar com produto neutro, sem abrasivos. ; 12
Instalações ; Barra de apoio (segurança/idosos) ; un ; 80 ; 150 ; 115 ; Testar a firmeza a cada 6 meses. Nunca usar toalheiro como apoio. ; 6
Instalações ; Câmera Wi-Fi ; un ; 100 ; 200 ; 150 ; Manter o aplicativo e o firmware atualizados. Limpar a lente a cada 3 meses. ; 12
Montagem ; Criado-mudo, cômoda ou rack ; un ; 70 ; 120 ; 95 ; Reapertar os parafusos após 30 dias e a cada 6 meses. Não arrastar o móvel. ; 6
Montagem ; Cama ou beliche ; un ; 90 ; 160 ; 125 ; Reapertar os parafusos após 30 dias e a cada 6 meses. ; 6
Montagem ; Guarda-roupa de 2 a 3 portas ; un ; 150 ; 250 ; 200 ; Regular portas e dobradiças a cada 6 meses. Evitar umidade encostada na parede. ; 6
Montagem ; Guarda-roupa casal de 6 portas ; un ; 250 ; 450 ; 350 ; Regular portas e trilhos a cada 6 meses. Não arrastar. ; 6
Montagem ; Cozinha compacta ; conjunto ; 250 ; 500 ; 375 ; Não sobrecarregar os armários aéreos. Reapertar as dobradiças a cada 6 meses. ; 6
Montagem ; Desmontagem de móvel ; un ; — ; — ; 55% da montagem ; Guardar os parafusos em saquinhos identificados. ; 0
Pintura ; Pintura de parede ; m² ; 15 ; 30 ; 22,50 ; Esperar 30 dias para lavar. Limpar com pano úmido e sabão neutro. ; 24
Pintura ; Cômodo pequeno completo (paredes e teto) ; cômodo ; 300 ; 600 ; 450 ; Esperar 30 dias para lavar. Ventilar o cômodo para evitar mofo. ; 36
Pintura ; Portão ou grade ; un ; 150 ; 400 ; 275 ; Retocar pontos de ferrugem logo que surgirem. Revisar a cada 12 meses. ; 12
Pintura ; Retoques e reparo de massa ; serviço ; 100 ; 200 ; 150 ; Evitar pancadas até a cura completa (7 dias). ; 24
Portas ; Troca de fechadura comum ; un ; 80 ; 150 ; 115 ; Lubrificar com grafite em pó a cada 6 meses (não usar óleo). ; 6
Portas ; Instalação de fechadura digital ; un ; 150 ; 300 ; 225 ; Trocar as pilhas ao primeiro aviso. Manter a chave mecânica fora de casa. ; 6
Portas ; Ajuste de porta que arrasta ; porta ; 70 ; 150 ; 110 ; Lubrificar as dobradiças a cada 6 meses. Evitar bater a porta. ; 6
Portas ; Troca de dobradiças ; porta ; 50 ; 100 ; 75 ; Lubrificar a cada 6 meses. ; 6
Portas ; Olho mágico ou trinco extra ; un ; 50 ; 80 ; 65 ; Lubrificar o trinco a cada 6 meses. ; 12
Manutenção ; Limpeza de caixa d'água até 1.000 L ; un ; 150 ; 250 ; 200 ; Manter a tampa bem fechada. Limpar a cada 6 meses. ; 6
Manutenção ; Limpeza de calhas ; serviço ; 150 ; 350 ; 250 ; Limpar antes das chuvas (set/out) e depois (abr). ; 6
Manutenção ; Refazer rejunte de box ou banheiro ; serviço ; 150 ; 350 ; 250 ; Evitar cloro puro. Aplicar impermeabilizante de rejunte a cada 12 meses. ; 12
Manutenção ; Troca de silicone de pia ou box ; serviço ; 60 ; 120 ; 90 ; Refazer a cada 12 a 18 meses ou quando escurecer. ; 12
Manutenção ; Recolocar azulejo ou piso solto ; ponto ; 80 ; 150 ; 115 ; Se outras peças soarem ocas ao bater, avisar: é sinal de descolamento. ; 12
Manutenção ; Troca de telhas quebradas ; serviço ; 100 ; 250 ; 175 ; Revisar o telhado antes das chuvas. Não subir sem equipamento de segurança. ; 12
Pacotes ; Hora técnica ; hora ; 80 ; 150 ; 115 ; — ; 0
Pacotes ; Meia diária "Lista da casa" (4 h) ; pacote ; 200 ; 300 ; 250 ; — ; 6
Pacotes ; Diária (8 h) ; pacote ; 350 ; 550 ; 450 ; — ; 6
Pacotes ; Pacote mudança ; pacote ; 500 ; 1200 ; 850 ; — ; 0
Taxas ; Visita técnica / orçamento presencial ; un ; 50 ; 80 ; 65 ; Abatida se o serviço for fechado. ; 0

Na tela de Serviços mostrar a faixa "R$ mín – máx (média Uberaba)" abaixo do preço, como referência.

# 8. TELAS E FUNCIONALIDADES

## 8.1 Login
Visual da frente do cartão. Campo usuário já preenchido "Pietro Fasano", campo senha, botão ENTRAR.
No primeiro acesso: "Bem-vindo, Pietro! Crie sua senha" (senha + confirmar).

## 8.2 Início
Cabeçalho amarelo com foto, "Olá, Pietro!" e 3 números do dia: serviços de hoje, a receber,
orçamentos aguardando resposta. Abaixo, "Próximo serviço" (cliente, hora, bairro, botão Maps).
Grade de 8 botões: Novo orçamento, Execução, Clientes, Serviços, Carteira, Dashboard, Arquivo, Ajustes.

## 8.3 👤 Clientes
- Lista com busca por nome ou telefone; botão "+ Novo cliente".
- Formulário: Nome*, Sobrenome*, Telefone (WhatsApp)*, Endereço (rua, número, complemento)*,
  Bairro, Cidade (padrão Uberaba), Observação (ex.: "tem cachorro", "portaria pede documento").
- * obrigatórios: o botão SALVAR só funciona com eles preenchidos; destacar em vermelho o que falta.
- Telefone com máscara (34) 99999-9999, teclado numérico, salvo só com dígitos.
- Avisar se já existir cliente com o mesmo telefone.
- Ficha do cliente: botões 📞 Ligar, 💬 WhatsApp, 📍 Maps, histórico de atendimentos,
  total já pago e botão "Novo orçamento para este cliente".

## 8.4 🧰 Serviços
- Lista agrupada por categoria (Elétrica, Hidráulica, Instalações, Montagem, Pintura, Portas,
  Manutenção, Pacotes, Taxas), com preço e unidade.
- Tocar para editar preço, dica de manutenção e revisão; "+ Novo serviço"; desativar (não apaga).

## 8.5 📝 Novo orçamento
Tela única, de cima para baixo:
1. Cliente: busca rápida ou "+ cadastrar agora" (abre o cadastro e volta já selecionado).
2. Serviços: abas de categoria e cartões grandes. TOCAR = adiciona (quantidade 1).
   Cada item escolhido aparece com botões − / + para quantidade e preço editável.
   Pintura de parede pede m² (teclado numérico).
3. Deslocamento: dois botões "Uberaba (R$ 20,00)" ou "Fora da cidade" (pede km × R$ 2,00).
4. Desconto (opcional) e Observação (opcional).
5. Material: escolha "Cliente compra (envio a lista)" ou "Pietro compra (repasse + 12%)".
6. TOTAL grande sempre visível no rodapé. Se o total ficar abaixo do valor mínimo (R$ 70),
   aplicar o mínimo e mostrar o aviso "valor mínimo do atendimento".
7. Botão principal: "💬 ENVIAR ORÇAMENTO NO WHATSAPP"
   → salva o atendimento como "Orçamento" com número sequencial (ORC-0001)
   → abre https://wa.me/55<telefone>?text=<mensagem codificada com encodeURIComponent>.
   Botão secundário: "📄 Gerar PDF do orçamento" (salva em Documentos e no Arquivo).

Modelo da mensagem do WhatsApp (gerado automaticamente; usar *negrito* do WhatsApp):
---
Olá, *{nome}*! Tudo bem? 😊
Aqui é o *Pietro Fasano*, marido de aluguel em Uberaba.
Segue o orçamento que combinamos:

📋 *Orçamento nº {numero}* · {data}
📍 {endereco} – {bairro}

🔧 *Serviços*
• {qtd}x {serviço} – R$ {valor}
• ...
🚗 Deslocamento – R$ {valor}
{🏷️ Desconto – R$ {valor}}

💰 *Total da mão de obra: R$ {total}*
🧱 Material: {"por conta do cliente, envio a lista" | "incluso conforme combinado"}

✅ Preço fechado, combinado antes de começar
✅ Garantia de 90 dias no serviço
✅ Local limpo e organizado no final
💳 Pix, dinheiro ou cartão. Chave Pix: {chave_pix}
⏳ Orçamento válido por 15 dias.

Posso agendar? É só me responder com o melhor dia e horário. 🛠️
*Chamou, o Pietro resolve.*
(34) 99120-5525
---

Na lista de orçamentos: botões "✅ Aprovado" (pede data/hora do serviço), "🔁 Reenviar" e
"❌ Cancelado".

## 8.6 🔧 Execução (fotos e registro do serviço)
- Lista de atendimentos Aprovados e Em execução, por data. Tocar abre o atendimento.
- Botão grande "▶ INICIAR SERVIÇO" (grava data_inicio, status Em execução).
- Três botões grandes de câmera: 📷 ANTES · 📷 DURANTE · 📷 DEPOIS
  (input type="file" accept="image/*" capture="environment"; permitir várias fotos de cada).
  - Antes de enviar, reduzir a foto no navegador (canvas, lado maior 1280px, JPEG qualidade 0.7).
  - Enviar CADA foto assim que tirada (uma requisição por foto) para não perder nada,
    com barra "Enviando foto…". Se falhar, guardar na fila (IndexedDB) e tentar de novo.
  - Salvar no Drive em Fotos/AAAA/MM/<numero>/ e registrar na aba FOTOS. Legenda opcional.
  - Miniaturas das fotos na tela, com opção de apagar uma foto tirada por engano.
- "📝 O que aconteceu": campo de texto grande para as ocorrências (dica na tela: "toque no 🎤 do
  teclado para falar em vez de digitar").
- Serviços do orçamento como checklist (✔ feito). Permitir "+ serviço extra" (recalcula o total).
- "🧱 Materiais usados": descrição, quantidade, valor unitário, quem comprou (Pietro/Cliente).
  Material comprado pelo Pietro: entra como SAÍDA na Carteira (categoria Material) e é cobrado do
  cliente com a margem configurada.
- "✅ Checklist de qualidade" (marcar antes de finalizar): Serviço testado e funcionando ·
  Local limpo e organizado · Cliente conferiu o serviço · Orientações de uso repassadas.
- Recomendações extras (texto opcional, somado às dicas automáticas do catálogo).
- Botão "🏁 FINALIZAR E GERAR DOCUMENTOS":
  - Exige pelo menos 1 foto ANTES e 1 foto DEPOIS, e o checklist marcado (avisar o que falta).
  - Status Concluído, data_conclusao.
  - Gera os 2 PDFs (seção 9), salva no Drive e na aba DOCUMENTOS.
  - Pergunta: "Já recebeu?" → Sim: forma de pagamento + data (padrão hoje) → cria ENTRADA na
    Carteira e marca Pago. Não: fica Pendente (aparece em "A receber").
  - Tela final com botões: "💬 Enviar documentos ao cliente" e "🏠 Início".

## 8.7 💰 Carteira
- Topo: Saldo do mês = Entradas − Saídas, com 3 cartões (Entradas verde, Saídas vermelho, Saldo azul)
  e seletor de mês (‹ outubro 2026 ›).
- Botões "+ Entrada" e "− Saída".
  - Entrada manual: valor, data, forma, descrição, cliente (opcional).
  - Saída: valor, data, categoria (Material, Combustível, Ferramentas, Alimentação, Celular/Internet,
    MEI/DAS, Manutenção do veículo, Outros), descrição.
- Lançamentos automáticos: pagamento de atendimento (Entrada) e material comprado pelo Pietro (Saída),
  marcados com o selo "auto".
- Lista de lançamentos do mês com filtro Entrada/Saída/categoria; tocar para editar ou excluir.
- Seção "A receber": atendimentos concluídos e não pagos, com botão "Recebi" e "💬 Lembrar cliente"
  (mensagem educada no WhatsApp com valor e chave Pix).

## 8.8 📊 Dashboard
- Seletor de período: Esta semana · Este mês · Mês passado · Personalizado (de/até).
- Filtros: Cliente · Serviço · Categoria · Status · Forma de pagamento (todos opcionais; botão "Limpar").
- Cartões: Faturado (pago) · Gastos · Lucro · Nº de serviços · Ticket médio · A receber ·
  Orçamentos enviados × aprovados (% de aprovação).
- Gráficos simples em SVG puro (barras, com valores escritos sobre as barras):
  1. Faturado × Gastos por semana (no mês) ou por dia (na semana)
  2. Top 5 serviços (quantidade e valor)
  3. Top 5 clientes (valor)
  4. Gastos por categoria
- Tabela final com os atendimentos do filtro e botão "Exportar CSV" (separador ";", UTF-8 com BOM).
- Cálculos feitos no backend (ação "dashboard") para o celular não pesar.

## 8.9 📁 Arquivo (notas, relatórios e orçamentos)
- Lista de todos os documentos, do mais recente para o mais antigo.
- Filtros: Data (dia específico ou período) · Cliente · Tipo (Orçamento / Nota / Relatório) · Número.
- Cada item mostra: tipo, número, cliente, data e valor. Botões:
  - 👁 Abrir (visualizar o PDF)
  - 💬 Enviar ao cliente: usar a Web Share API com o arquivo PDF (navigator.share com files), que
    no celular abre o WhatsApp com o PDF anexado; se o navegador não suportar, baixar o PDF e abrir
    o WhatsApp do cliente com uma mensagem pronta ("Olá {nome}, segue a nota de serviço nº...").
  - ⬇ Baixar
- Os PDFs NUNCA ficam públicos no Drive: o backend devolve o arquivo em base64 só para sessão válida.
- Na ficha de cada atendimento, atalho para os documentos dele.

## 8.10 ⚙️ Ajustes
Editar CONFIG (deslocamento na cidade, valor por km, valor mínimo, taxa de visita, margem de material,
chave Pix, garantia), Trocar senha, Sair, versão do app.

# 9. DOCUMENTOS EM PDF (gerados no Apps Script)
Como gerar: montar o HTML a partir do modelo (HtmlService.createTemplateFromFile), embutir as fotos
como base64 (data URI, reduzidas a cerca de 800px), converter com
Utilities.newBlob(html, 'text/html').getAs('application/pdf') e salvar em Documentos/AAAA/MM/.
Nomes: NS-0001_2026-10-09_Nome-Sobrenome.pdf, RQ-0001_..., ORC-0001_...
Numeração sequencial por tipo, gerada com LockService.
Todos com o cabeçalho e o rodapé da identidade visual (seção 2), tamanho A4, fácil de ler no celular.

## 9.1 Nota de Serviço (recibo) — NS-0001
- Dados do prestador: Pietro Fasano · Marido de aluguel · Uberaba – MG · (34) 99120-5525
- Dados do cliente: nome completo, telefone, endereço
- Nº, data do orçamento, data de execução
- Tabela de serviços: qtd, descrição, unidade, valor unitário, total
- Deslocamento, desconto, materiais repassados (com a margem, se houver)
- TOTAL em destaque; situação do pagamento (Pago em dd/mm via Pix / Pendente) e chave Pix
- Garantia: "Garantia de 90 dias sobre a mão de obra, conforme o Código de Defesa do Consumidor."
- Observação: "Este documento é um recibo de prestação de serviço e não substitui nota fiscal."
- Linha de assinatura: Pietro Fasano
- Fotos: 1 de ANTES e 1 de DEPOIS em miniatura, lado a lado

## 9.2 Relatório de Qualidade — RQ-0001
- Cabeçalho, cliente, endereço, nº do atendimento, data e duração (início → conclusão)
- Serviços executados (checklist marcado)
- Registro fotográfico: todas as fotos ANTES × DEPOIS lado a lado, e as fotos DURANTE com legenda
- "O que foi feito / ocorrências": texto registrado na execução
- Materiais aplicados (descrição e quantidade)
- Checklist de qualidade (✔ testado, ✔ limpo, ✔ cliente conferiu, ✔ orientações repassadas)
- "Recomendações de manutenção para maior vida útil": dica_manutencao de cada serviço executado
  (sem repetir) + recomendações extras escritas pelo Pietro
- "Próxima revisão sugerida": data de conclusão + o MENOR revisao_meses (> 0) dos serviços feitos
- Garantia de 90 dias e contato para chamar novamente
- Frase final: "Obrigado pela confiança! Chamou, o Pietro resolve."

# 10. BACKEND (Code.gs)
- doPost(e) roteando as ações: criar_senha, login, logout, trocar_senha, config_ler, config_salvar,
  clientes_*, servicos_*, atendimentos_*, foto_enviar, foto_apagar, materiais_*, finalizar,
  carteira_*, dashboard, documentos_listar, documento_baixar, documento_gerar, resumo_inicio.
- Validar a sessão em toda ação protegida.
- Validar e higienizar as entradas: tipos, obrigatórios (cliente: nome, sobrenome, telefone,
  endereço), tamanho máximo, telefone só dígitos (10 ou 11), valores ≥ 0, foto só JPEG até 2 MB.
- LockService em toda gravação; Utilities.getUuid() para ids; datas criado/atualizado automáticas.
- Ler cada aba de uma vez com getValues() (nunca célula por célula); gravar com setValues.
- Exclusão sempre lógica (ativo = "não"), com confirmação no frontend.
- Retornar sempre JSON via ContentService; erros com mensagem amigável em português.
- Regras de valores:
  valor_total = subtotal_servicos + valor_deslocamento + materiais repassados (com margem) − desconto;
  nunca abaixo do valor_minimo; nunca negativo. Atendimento Cancelado não entra em nenhum total.
  Desmontagem = 55% do preço de montagem do mesmo móvel.

# 11. FRONTEND (app.js)
- Uma única página com "telas" trocadas por JavaScript (hash na URL: #inicio, #clientes...),
  para o botão Voltar do celular funcionar.
- Função única api(action, data) com carregamento, tempo limite de 30 s e mensagem amigável.
- Guardar no localStorage a última lista de clientes e serviços, para abrir rápido com sinal fraco
  (aviso "sem internet: mostrando dados salvos").
- Botões ficam desabilitados enquanto salvam (evita gravar em dobro).
- Escapar todo texto exibido (evitar injeção de HTML).
- Acessível: labels em todos os campos, foco visível, teclado numérico para telefone e valores
  (inputmode="numeric" ou "decimal").
- Funcionar em Chrome (Android) e Safari (iPhone) atuais.

# 12. TESTES QUE A IA DEVE CONFERIR ANTES DE ENTREGAR
- Primeiro acesso cria a senha; segundo acesso só entra com a senha certa; 5 erros bloqueiam.
- Cliente sem algum campo obrigatório não salva.
- Orçamento com 2 serviços + deslocamento soma certo e a mensagem do WhatsApp sai formatada.
- Orçamento abaixo de R$ 70 vira R$ 70.
- Finalizar sem foto ANTES ou DEPOIS é bloqueado com aviso claro.
- Finalizar gera NS e RQ com as fotos, e eles aparecem no Arquivo.
- Pagamento gera Entrada na Carteira; material do Pietro gera Saída.
- Dashboard bate com a Carteira no mesmo período.

# 13. INSTALAÇÃO (README.md para leigo, passos numerados)
1. Criar uma Google Planilha "App Pietro Fasano" no Drive.
2. Extensões > Apps Script > colar Code.gs e criar os arquivos NotaServico.html,
   RelatorioQualidade.html e Orcamento.html.
3. Executar setup() e autorizar (Drive e Planilhas).
4. Implantar > Nova implantação > App da Web (Executar como: Eu; Acesso: Qualquer pessoa) > copiar a URL.
5. Colar a URL em API_URL no app.js.
6. Criar o repositório no GitHub, enviar index.html, style.css, app.js, manifest.json e a pasta assets/;
   ativar o GitHub Pages (Settings > Pages > branch main).
7. Abrir o link no celular do Pietro > criar a senha > menu do navegador > "Adicionar à tela inicial".
8. Problemas comuns: erro de CORS; falta de autorização; URL mudou após nova implantação (usar
   "Gerenciar implantações" > editar > Nova versão, que mantém a mesma URL); esqueci a senha (seção 5).

# 14. REGRAS DE ENTREGA
- Código simples, comentado em português, sem dependências externas (exceto a fonte Poppins).
- Entregar cada arquivo COMPLETO, pronto para copiar e colar, sem "..." nem trechos omitidos.
- Ao final, listar as limitações conhecidas e sugestões para a versão 2.
````

---

## 3. CHECKLIST PARA VOCÊ AJUSTAR ANTES DE USAR

- [ ] **Valor do deslocamento dentro de Uberaba** (deixei R$ 20,00 como sugestão; o briefing só traz o valor por km fora da cidade)
- [ ] Chave Pix do Pietro (é cadastrada depois, em Ajustes, e **não** vai no código)
- [ ] Preços do catálogo: estão na **média** das faixas. O briefing sugere começar um pouco abaixo, então avalie se baixa uns 10%
- [ ] Margem sobre material (12%) e valor mínimo (R$ 70)
- [ ] Validade do orçamento (15 dias) e texto da mensagem do WhatsApp
- [ ] A foto em `assets/pietro.png` (recortada do cartão) ficou boa? Se tiver uma foto melhor, é só substituir

> **Privacidade (LGPD):** o app guarda nome, telefone e endereço dos clientes, além de fotos dentro das casas deles. Tudo fica **somente** na planilha e nas pastas privadas do Drive do Pietro. Nada vai para o GitHub, e os PDFs não ficam com link público. Use uma senha forte e não compartilhe a URL do Apps Script.
