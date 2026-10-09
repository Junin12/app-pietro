/**
 * App da Pietro Resolve (Pietro Fasano) — Reparos a domicílio em Uberaba
 * Backend no Google Apps Script: a planilha é o banco de dados e o Drive guarda fotos e PDFs.
 *
 * 1) Rode setup() uma vez pelo editor (cria abas, catálogo e pastas).
 * 2) Implante como App da Web (Executar como: Eu / Acesso: Qualquer pessoa).
 */

const TZ = 'America/Sao_Paulo';
const LOGIN = 'pietro fasano';
const SESSAO_DIAS = 30;
const MAX_TENTATIVAS = 5;
const BLOQUEIO_MIN = 15;

const ABAS = {
  USUARIO: ['login', 'senha_hash', 'salt', 'tentativas', 'bloqueado_ate', 'criado_em', 'atualizado_em'],
  SESSOES: ['token_hash', 'expira_em', 'criado_em'],
  CLIENTES: ['id', 'nome', 'sobrenome', 'telefone', 'endereco', 'bairro', 'cidade', 'observacao', 'ativo', 'criado_em', 'atualizado_em'],
  SERVICOS: ['id', 'categoria', 'nome', 'unidade', 'preco_min', 'preco_max', 'preco', 'observacao', 'dica_manutencao', 'revisao_meses', 'ativo', 'criado_em', 'atualizado_em'],
  ATENDIMENTOS: ['id', 'numero', 'cliente_id', 'itens_json', 'subtotal_servicos', 'deslocamento_tipo', 'km', 'valor_deslocamento',
    'material_modo', 'valor_materiais', 'desconto', 'valor_total', 'status', 'data_orcamento', 'data_agendada', 'data_inicio',
    'data_conclusao', 'ocorrencias', 'checklist_json', 'recomendacoes_extra', 'observacao', 'pagamento', 'forma_pagamento',
    'data_pagamento', 'criado_em', 'atualizado_em'],
  FOTOS: ['id', 'atendimento_id', 'tipo', 'legenda', 'file_id', 'data', 'ativo'],
  MATERIAIS: ['id', 'atendimento_id', 'descricao', 'quantidade', 'valor_unitario', 'valor_total', 'comprado_por', 'repassar_cliente', 'data', 'ativo'],
  CARTEIRA: ['id', 'data', 'tipo', 'categoria', 'descricao', 'valor', 'forma_pagamento', 'atendimento_id', 'cliente_id', 'origem_id', 'automatico', 'ativo', 'criado_em', 'atualizado_em'],
  DOCUMENTOS: ['id', 'tipo', 'numero', 'atendimento_id', 'cliente_id', 'cliente_nome', 'data', 'valor', 'file_id', 'nome_arquivo', 'ativo', 'criado_em'],
  CONFIG: ['chave', 'valor']
};

const CATEGORIAS = ['Elétrica', 'Hidráulica', 'Instalações', 'Montagem', 'Pintura', 'Portas', 'Manutenção', 'Pacotes', 'Taxas'];
const STATUS = ['Orçamento', 'Aprovado', 'Em execução', 'Concluído', 'Cancelado'];
const FORMAS = ['Pix', 'Dinheiro', 'Cartão de débito', 'Cartão de crédito', 'Transferência'];
const CHECKLIST = ['testado', 'limpo', 'conferido', 'orientado'];
const PREFIXO = { 'Orçamento': 'ORC', 'Nota de Serviço': 'NS', 'Relatório de Qualidade': 'RQ' };
const MODELO = { 'Orçamento': 'Orcamento', 'Nota de Serviço': 'NotaServico', 'Relatório de Qualidade': 'RelatorioQualidade' };

const CONFIG_PADRAO = {
  nome_profissional: 'Pietro Fasano', nome_empresa: 'Pietro Resolve', telefone: '34991205525', cidade: 'Uberaba', chave_pix: '',
  deslocamento_cidade: 20, valor_km: 2, valor_minimo: 70, taxa_visita: 65, margem_material: 12,
  garantia_dias: 90, validade_orcamento: 15, pasta_id: ''
};
const CONFIG_EDITAVEL = {
  chave_pix: { max: 120 }, deslocamento_cidade: { num: 1 }, valor_km: { num: 1 }, valor_minimo: { num: 1 },
  taxa_visita: { num: 1 }, margem_material: { num: 1 }, garantia_dias: { num: 1 }, validade_orcamento: { num: 1 }
};

// Regras de validação de cada tabela editável pelo app
const CAMPOS = {
  CLIENTES: {
    nome: { obr: 1, max: 60, rot: 'Nome' }, sobrenome: { obr: 1, max: 80, rot: 'Sobrenome' },
    telefone: { obr: 1, tel: 1, rot: 'Telefone' }, endereco: { obr: 1, max: 200, rot: 'Endereço' },
    bairro: { max: 80 }, cidade: { max: 80 }, observacao: { max: 500 }
  },
  SERVICOS: {
    categoria: { obr: 1, lista: CATEGORIAS, rot: 'Categoria' }, nome: { obr: 1, max: 120, rot: 'Nome do serviço' },
    unidade: { max: 20 }, preco_min: { num: 1 }, preco_max: { num: 1 }, preco: { obr: 1, num: 1, rot: 'Preço' },
    observacao: { max: 300 }, dica_manutencao: { max: 600 }, revisao_meses: { num: 1 }
  },
  CARTEIRA: {
    data: { obr: 1, data: 1, rot: 'Data' }, tipo: { obr: 1, lista: ['Entrada', 'Saída'], rot: 'Tipo' },
    categoria: { max: 40 }, descricao: { max: 200 }, valor: { obr: 1, num: 1, rot: 'Valor' },
    forma_pagamento: { max: 30 }, cliente_id: { max: 40 }
  },
  MATERIAIS: {
    atendimento_id: { obr: 1, max: 40 }, descricao: { obr: 1, max: 150, rot: 'Descrição' },
    quantidade: { obr: 1, num: 1, rot: 'Quantidade' }, valor_unitario: { num: 1 },
    comprado_por: { obr: 1, lista: ['Pietro', 'Cliente'], rot: 'Quem comprou' }, repassar_cliente: { lista: ['sim', 'não'] },
    data: { data: 1 }
  },
  ATENDIMENTOS: {
    cliente_id: { obr: 1, max: 40, rot: 'Cliente' }, deslocamento_tipo: { lista: ['Cidade', 'Fora'] }, km: { num: 1 },
    valor_deslocamento: { num: 1 }, material_modo: { lista: ['Cliente', 'Pietro'] }, desconto: { num: 1 },
    status: { lista: STATUS }, data_agendada: { max: 16 }, observacao: { max: 500 },
    ocorrencias: { max: 4000 }, recomendacoes_extra: { max: 2000 }
  }
};

// Catálogo inicial: média das faixas do briefing de Uberaba (mão de obra, set/2026)
// [categoria, serviço, unidade, mín, máx, preço, dica de manutenção, revisão em meses]
const CATALOGO = [
  ['Elétrica', 'Troca de tomada ou interruptor', 'ponto', 40, 80, 60, 'Não sobrecarregar com benjamins ou "T". Se esquentar, escurecer ou faiscar, desligar o disjuntor e chamar.', 12],
  ['Elétrica', 'Tomada/interruptor adicional (mesma visita)', 'ponto', 20, 40, 30, 'Não sobrecarregar com benjamins ou "T". Se esquentar, escurecer ou faiscar, desligar o disjuntor e chamar.', 12],
  ['Elétrica', 'Instalação de chuveiro elétrico', 'un', 80, 150, 115, 'Não mudar a temperatura com o chuveiro ligado. Limpar o crivo a cada 3 meses. Disjuntor e fio devem ser compatíveis com a potência.', 12],
  ['Elétrica', 'Troca de resistência de chuveiro', 'un', 50, 80, 65, 'Nunca ligar a chave elétrica sem água correndo. Limpar o crivo a cada 3 meses.', 6],
  ['Elétrica', 'Instalação de luminária ou plafon', 'un', 60, 120, 90, 'Usar lâmpada LED na potência indicada. Limpar com pano seco e com a luz desligada.', 12],
  ['Elétrica', 'Instalação de lustre grande', 'un', 150, 250, 200, 'Conferir a fixação no teto a cada 12 meses. Limpar sempre desligado.', 12],
  ['Elétrica', 'Instalação de ventilador de teto', 'un', 120, 200, 160, 'Limpar as pás a cada 2 meses. Se balançar, reapertar e balancear.', 6],
  ['Elétrica', 'Troca de disjuntor', 'un', 80, 150, 115, 'Se desarmar com frequência, revisar o circuito. Nunca trocar por disjuntor maior.', 12],
  ['Elétrica', 'Novo ponto aparente (canaleta)', 'ponto', 120, 200, 160, 'Manter a canaleta fechada e não exceder a carga do ponto.', 12],
  ['Elétrica', 'Campainha ou interfone simples', 'un', 80, 150, 115, 'Trocar as pilhas (modelo sem fio) a cada 12 meses.', 12],
  ['Hidráulica', 'Troca de torneira ou misturador', 'un', 60, 100, 80, 'Não forçar ao fechar. Limpar o arejador a cada 3 meses.', 12],
  ['Hidráulica', 'Troca de sifão ou engate flexível', 'un', 50, 90, 70, 'Evitar gordura e restos de comida no ralo. Conferir vazamentos a cada 6 meses.', 6],
  ['Hidráulica', 'Reparo de válvula de descarga', 'un', 90, 180, 135, 'Não segurar o acionamento. Revisar o reparo a cada 2 anos.', 24],
  ['Hidráulica', 'Reparo de caixa acoplada', 'un', 70, 130, 100, 'Teste mensal: pingar corante na caixa; se colorir o vaso sem dar descarga, há vazamento.', 12],
  ['Hidráulica', 'Troca ou reparo de registro', 'un', 100, 200, 150, 'Abrir e fechar todos os registros a cada 6 meses para não travarem.', 6],
  ['Hidráulica', 'Desentupimento de pia ou vaso', 'un', 100, 200, 150, 'Usar peneira no ralo. Não jogar óleo, papel, fio dental ou lenço umedecido.', 6],
  ['Hidráulica', 'Instalação de vaso sanitário', 'un', 150, 250, 200, 'Não subir no vaso. Se balançar, chamar para reapertar e refazer a vedação.', 12],
  ['Hidráulica', 'Instalação de pia, cuba ou tanque', 'un', 150, 300, 225, 'Refazer o silicone de vedação a cada 12 a 18 meses.', 12],
  ['Hidráulica', 'Instalação de filtro ou purificador', 'un', 80, 150, 115, 'Trocar o refil no prazo do fabricante (cerca de 6 meses).', 6],
  ['Instalações', 'Suporte de TV até 55"', 'un', 100, 180, 140, 'Não pendurar objetos na TV. Conferir a fixação a cada 12 meses.', 12],
  ['Instalações', 'Suporte de TV acima de 55" ou articulado', 'un', 150, 250, 200, 'Não forçar o braço articulado além do limite. Conferir a fixação a cada 12 meses.', 12],
  ['Instalações', 'Quadro ou espelho', 'peça', 30, 60, 45, 'Evitar locais úmidos. Conferir o nível e a fixação a cada 12 meses.', 12],
  ['Instalações', 'Prateleira', 'un', 40, 80, 60, 'Respeitar a carga máxima do suporte. Não apoiar peso na ponta.', 12],
  ['Instalações', 'Cortina, varão ou persiana', 'janela', 70, 150, 110, 'Abrir e fechar pelo bastão, sem puxar o tecido. Lubrificar o trilho a cada 12 meses.', 12],
  ['Instalações', 'Varal de teto ou de parede', 'un', 80, 150, 115, 'Não exceder a carga. Trocar as cordas a cada 2 anos.', 24],
  ['Instalações', 'Kit de acessórios de banheiro', 'kit', 80, 150, 115, 'Limpar com produto neutro, sem abrasivos.', 12],
  ['Instalações', 'Barra de apoio (segurança/idosos)', 'un', 80, 150, 115, 'Testar a firmeza a cada 6 meses. Nunca usar toalheiro como apoio.', 6],
  ['Instalações', 'Câmera Wi-Fi', 'un', 100, 200, 150, 'Manter o aplicativo e o firmware atualizados. Limpar a lente a cada 3 meses.', 12],
  ['Montagem', 'Criado-mudo, cômoda ou rack', 'un', 70, 120, 95, 'Reapertar os parafusos após 30 dias e a cada 6 meses. Não arrastar o móvel.', 6],
  ['Montagem', 'Cama ou beliche', 'un', 90, 160, 125, 'Reapertar os parafusos após 30 dias e a cada 6 meses.', 6],
  ['Montagem', 'Guarda-roupa de 2 a 3 portas', 'un', 150, 250, 200, 'Regular portas e dobradiças a cada 6 meses. Evitar umidade encostada na parede.', 6],
  ['Montagem', 'Guarda-roupa casal de 6 portas', 'un', 250, 450, 350, 'Regular portas e trilhos a cada 6 meses. Não arrastar.', 6],
  ['Montagem', 'Cozinha compacta', 'conjunto', 250, 500, 375, 'Não sobrecarregar os armários aéreos. Reapertar as dobradiças a cada 6 meses.', 6],
  ['Pintura', 'Pintura de parede', 'm²', 15, 30, 22.5, 'Esperar 30 dias para lavar. Limpar com pano úmido e sabão neutro.', 24],
  ['Pintura', 'Cômodo pequeno completo (paredes e teto)', 'cômodo', 300, 600, 450, 'Esperar 30 dias para lavar. Ventilar o cômodo para evitar mofo.', 36],
  ['Pintura', 'Portão ou grade', 'un', 150, 400, 275, 'Retocar pontos de ferrugem logo que surgirem. Revisar a cada 12 meses.', 12],
  ['Pintura', 'Retoques e reparo de massa', 'serviço', 100, 200, 150, 'Evitar pancadas até a cura completa (7 dias).', 24],
  ['Portas', 'Troca de fechadura comum', 'un', 80, 150, 115, 'Lubrificar com grafite em pó a cada 6 meses (não usar óleo).', 6],
  ['Portas', 'Instalação de fechadura digital', 'un', 150, 300, 225, 'Trocar as pilhas ao primeiro aviso. Manter a chave mecânica fora de casa.', 6],
  ['Portas', 'Ajuste de porta que arrasta', 'porta', 70, 150, 110, 'Lubrificar as dobradiças a cada 6 meses. Evitar bater a porta.', 6],
  ['Portas', 'Troca de dobradiças', 'porta', 50, 100, 75, 'Lubrificar a cada 6 meses.', 6],
  ['Portas', 'Olho mágico ou trinco extra', 'un', 50, 80, 65, 'Lubrificar o trinco a cada 6 meses.', 12],
  ['Manutenção', "Limpeza de caixa d'água até 1.000 L", 'un', 150, 250, 200, 'Manter a tampa bem fechada. Limpar a cada 6 meses.', 6],
  ['Manutenção', 'Limpeza de calhas', 'serviço', 150, 350, 250, 'Limpar antes das chuvas (set/out) e depois (abr).', 6],
  ['Manutenção', 'Refazer rejunte de box ou banheiro', 'serviço', 150, 350, 250, 'Evitar cloro puro. Aplicar impermeabilizante de rejunte a cada 12 meses.', 12],
  ['Manutenção', 'Troca de silicone de pia ou box', 'serviço', 60, 120, 90, 'Refazer a cada 12 a 18 meses ou quando escurecer.', 12],
  ['Manutenção', 'Recolocar azulejo ou piso solto', 'ponto', 80, 150, 115, 'Se outras peças soarem ocas ao bater, avisar: é sinal de descolamento.', 12],
  ['Manutenção', 'Troca de telhas quebradas', 'serviço', 100, 250, 175, 'Revisar o telhado antes das chuvas. Não subir sem equipamento de segurança.', 12],
  ['Pacotes', 'Hora técnica', 'hora', 80, 150, 115, '', 0],
  ['Pacotes', 'Meia diária "Lista da casa" (4 h)', 'pacote', 200, 300, 250, '', 6],
  ['Pacotes', 'Diária (8 h)', 'pacote', 350, 550, 450, '', 6],
  ['Pacotes', 'Pacote mudança', 'pacote', 500, 1200, 850, '', 0],
  ['Taxas', 'Visita técnica / orçamento presencial', 'un', 50, 80, 65, 'Abatida se o serviço for fechado.', 0]
];

/* ============================== SETUP ============================== */

function setup() {
  const ss = planilha_();
  Object.keys(ABAS).forEach(nome => {
    const sh = ss.getSheetByName(nome) || ss.insertSheet(nome);
    const cab = ABAS[nome];
    if (sh.getMaxColumns() < cab.length) sh.insertColumnsAfter(sh.getMaxColumns(), cab.length - sh.getMaxColumns());
    // Texto puro: impede o Sheets de transformar datas, telefones e números "0007"
    sh.getRange(1, 1, sh.getMaxRows(), cab.length).setNumberFormat('@');
    sh.getRange(1, 1, 1, cab.length).setValues([cab]).setFontWeight('bold').setBackground('#F5C518');
    sh.setFrozenRows(1);
  });
  ['Página1', 'Sheet1', 'Planilha1'].forEach(n => {
    const sh = ss.getSheetByName(n);
    if (sh && sh.getLastRow() === 0) ss.deleteSheet(sh);
  });

  const cfg = config_();
  Object.keys(CONFIG_PADRAO).forEach(k => { if (cfg[k] === undefined) aba_('CONFIG').appendRow([k, CONFIG_PADRAO[k]]); });
  mudou_('CONFIG');

  if (!ler('USUARIO').length) aba_('USUARIO').appendRow(['Pietro Fasano', '', '', 0, '', agora(), agora()]);
  mudou_('USUARIO');

  if (!ler('SERVICOS').length) {
    const t = agora();
    const linhas = CATALOGO.map(s => objParaLinha_('SERVICOS', {
      id: Utilities.getUuid(), categoria: s[0], nome: s[1], unidade: s[2], preco_min: s[3], preco_max: s[4], preco: s[5],
      dica_manutencao: s[6], revisao_meses: s[7], ativo: 'sim', criado_em: t, atualizado_em: t
    }));
    aba_('SERVICOS').getRange(2, 1, linhas.length, linhas[0].length).setValues(linhas);
    mudou_('SERVICOS');
  }

  pastaRaiz_();
  testeCalculo();
  Logger.log('Planilha de dados: ' + ss.getUrl());
  Logger.log('Pronto! Agora implante como App da Web.');
}

// Verificação rápida da regra de valores (rode pelo editor se mexer no cálculo)
function testeCalculo() {
  const cfg = { valor_minimo: 70, margem_material: 12 };
  const igual = (a, b, msg) => { if (Math.abs(a - b) > 0.001) throw new Error('Teste falhou: ' + msg + ' (' + a + ' ≠ ' + b + ')'); };
  let r = calcularValores_({ itens_json: '[{"qtd":1,"preco":30}]', valor_deslocamento: 20, desconto: 0 }, [], cfg);
  igual(r.valor_total, 70, 'valor mínimo');
  r = calcularValores_({ itens_json: '[{"qtd":2,"preco":115},{"qtd":1,"preco":60}]', valor_deslocamento: 20, desconto: 10 }, [], cfg);
  igual(r.valor_total, 300, 'soma com deslocamento e desconto');
  r = calcularValores_({ id: 'x', itens_json: '[{"qtd":1,"preco":100}]', valor_deslocamento: 0, desconto: 0 },
    [{ atendimento_id: 'x', comprado_por: 'Pietro', repassar_cliente: 'sim', valor_total: 50, ativo: 'sim' }], cfg);
  igual(r.valor_total, 156, 'material com margem');
  Logger.log('Cálculos OK');
}

/* ============================== API ============================== */

const PUBLICAS = { status_login, criar_senha, login };
const ACOES = {
  carregar: () => ({ dados: carregar_() }),
  logout, trocar_senha, config_salvar, salvar, excluir,
  salvar_atendimento, excluir_atendimento, finalizar, registrar_pagamento, estornar_pagamento,
  salvar_material, excluir_material, foto_enviar, foto_miniatura, fotos_miniaturas, foto_apagar,
  documento_gerar, documento_baixar
};

function doGet() {
  return ContentService.createTextOutput('API do App Pietro Resolve funcionando.');
}

function doPost(e) {
  let res;
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    limparCache_(); // cada requisição sempre começa lendo a planilha atualizada
    const req = JSON.parse(e.postData.contents);
    let fn = PUBLICAS[req.action];
    if (!fn) {
      validarSessao_(req.sessao);
      fn = ACOES[req.action];
    }
    if (!fn) throw erro('Ação desconhecida.');
    res = { ok: true, data: fn(req.data || {}, req) };
  } catch (err) {
    if (!err.amigavel) console.error(err);
    res = { ok: false, error: err.amigavel ? err.message : 'Algo deu errado. Tente de novo.', sessaoExpirada: !!err.sessao };
  } finally {
    lock.releaseLock();
  }
  return ContentService.createTextOutput(JSON.stringify(res)).setMimeType(ContentService.MimeType.JSON);
}

/* ============================== LOGIN ============================== */

function status_login() {
  return { senhaCriada: !!usuario_().senha_hash };
}

function criar_senha(d) {
  const u = usuario_();
  if (u.senha_hash) throw erro('A senha já foi criada. Use a tela de entrar.');
  conferirLogin_(d.login);
  const senha = senhaValida_(d.senha);
  const salt = Utilities.getUuid();
  atualizarLinha_('USUARIO', 2, { senha_hash: hashSenha_(senha, salt), salt, tentativas: 0, bloqueado_ate: '', atualizado_em: agora() });
  return novaSessao_();
}

function login(d) {
  const u = usuario_();
  if (!u.senha_hash) throw erro('Crie sua senha primeiro.');
  if (u.bloqueado_ate && String(u.bloqueado_ate) > agora()) throw erro('Muitas tentativas erradas. Aguarde ' + BLOQUEIO_MIN + ' minutos e tente de novo.');
  const certo = normaliza_(d.login) === LOGIN && hashSenha_(String(d.senha || ''), u.salt) === u.senha_hash;
  if (!certo) {
    const t = num(u.tentativas) + 1;
    const bloqueia = t >= MAX_TENTATIVAS;
    atualizarLinha_('USUARIO', 2, { tentativas: bloqueia ? 0 : t, bloqueado_ate: bloqueia ? depoisDe_(BLOQUEIO_MIN * 60000) : '' });
    SpreadsheetApp.flush();
    throw erro(bloqueia ? 'Muitas tentativas erradas. Aguarde ' + BLOQUEIO_MIN + ' minutos.' : 'Usuário ou senha incorretos.');
  }
  atualizarLinha_('USUARIO', 2, { tentativas: 0, bloqueado_ate: '' });
  return novaSessao_();
}

function logout(d, req) {
  const h = sha_(String(req.sessao || ''));
  apagarLinhas_('SESSOES', s => s.token_hash === h);
  return {};
}

function trocar_senha(d) {
  const u = usuario_();
  if (hashSenha_(String(d.atual || ''), u.salt) !== u.senha_hash) throw erro('A senha atual está errada.');
  const senha = senhaValida_(d.nova);
  const salt = Utilities.getUuid();
  atualizarLinha_('USUARIO', 2, { senha_hash: hashSenha_(senha, salt), salt, atualizado_em: agora() });
  return {};
}

function usuario_() {
  const u = ler('USUARIO')[0];
  if (!u) throw erro('O sistema ainda não foi preparado. Rode a função setup() no Apps Script.');
  return u;
}

function conferirLogin_(login) {
  if (normaliza_(login) !== LOGIN) throw erro('Usuário incorreto. Use: Pietro Fasano');
}

function senhaValida_(s) {
  s = String(s || '');
  if (s.length < 6) throw erro('A senha precisa ter pelo menos 6 caracteres.');
  if (s.length > 100) throw erro('Senha muito longa.');
  return s;
}

function hashSenha_(senha, salt) {
  let h = salt + senha;
  for (let i = 0; i < 300; i++) h = sha_(h + salt); // repetir deixa a senha mais difícil de adivinhar por força bruta
  return h;
}

function novaSessao_() {
  const agoraTxt = agora();
  apagarLinhas_('SESSOES', s => String(s.expira_em) < agoraTxt);
  const token = Utilities.getUuid() + Utilities.getUuid();
  aba_('SESSOES').appendRow([sha_(token), depoisDe_(SESSAO_DIAS * 864e5), agoraTxt]);
  mudou_('SESSOES');
  return { sessao: token };
}

function validarSessao_(token) {
  const h = sha_(String(token || ''));
  const ok = token && ler('SESSOES').some(s => s.token_hash === h && String(s.expira_em) > agora());
  if (!ok) {
    const e = erro('Sua sessão expirou. Entre de novo.');
    e.sessao = true;
    throw e;
  }
}

/* ============================== DADOS GERAIS ============================== */

function carregar_() {
  const cfg = config_();
  delete cfg.pasta_id;
  return {
    cfg,
    clientes: ler('CLIENTES'),
    servicos: ler('SERVICOS'),
    atendimentos: ler('ATENDIMENTOS'),
    fotos: ler('FOTOS').filter(f => f.ativo !== 'não'),
    materiais: ler('MATERIAIS').filter(m => m.ativo !== 'não'),
    carteira: ler('CARTEIRA').filter(c => c.ativo !== 'não'),
    documentos: ler('DOCUMENTOS').filter(d => d.ativo !== 'não')
  };
}

// dev-senior: toda gravação devolve os dados completos; simples para 1 usuário. Se ficar lento (milhares de linhas), devolver só o que mudou.
function comDados(resultado) {
  return { resultado, dados: carregar_() };
}

function config_salvar(d) {
  const novos = limpar_(d, CONFIG_EDITAVEL);
  const sh = aba_('CONFIG');
  const chaves = sh.getRange(1, 1, sh.getLastRow(), 1).getValues().flat();
  Object.keys(novos).forEach(k => {
    const i = chaves.indexOf(k);
    if (i >= 0) sh.getRange(i + 1, 2).setValue(novos[k]);
    else sh.appendRow([k, novos[k]]);
  });
  mudou_('CONFIG');
  return comDados({});
}

function salvar(d) {
  const regras = CAMPOS[d.aba];
  if (!regras || ['CLIENTES', 'SERVICOS', 'CARTEIRA'].indexOf(d.aba) < 0) throw erro('Tabela inválida.');
  const r = d.registro || {};
  const reg = limpar_(r, regras);
  if (d.aba === 'CLIENTES') reg.cidade = reg.cidade || config_().cidade || 'Uberaba';
  if (d.aba === 'CARTEIRA') {
    if (r.id) bloquearAutomatico_(r.id);
    if (!(reg.valor > 0)) throw erro('Informe um valor maior que zero.');
    reg.automatico = 'não';
  }
  return comDados(gravar_(d.aba, r.id, reg));
}

function excluir(d) {
  if (['CLIENTES', 'SERVICOS', 'CARTEIRA'].indexOf(d.aba) < 0) throw erro('Tabela inválida.');
  if (d.aba === 'CARTEIRA') bloquearAutomatico_(d.id);
  return comDados(atualizar_(d.aba, d.id, { ativo: 'não', atualizado_em: agora() }));
}

function bloquearAutomatico_(id) {
  const l = ler('CARTEIRA').find(c => c.id === id);
  if (l && l.automatico === 'sim') throw erro('Este lançamento é automático. Altere pelo atendimento.');
}

/* ============================== ATENDIMENTOS ============================== */

function salvar_atendimento(d) {
  const r = d.registro || {};
  const at = limpar_(r, CAMPOS.ATENDIMENTOS);
  at.itens_json = JSON.stringify(limparItens_(r.itens_json));
  at.checklist_json = JSON.stringify(limparChecklist_(r.checklist_json));
  if (!ler('CLIENTES').some(c => c.id === at.cliente_id)) throw erro('Cliente não encontrado.');

  const antigo = r.id ? acharAt_(r.id) : null;
  at.status = at.status || (antigo ? antigo.status : 'Orçamento');
  if (antigo && antigo.status === 'Concluído' && at.status !== 'Concluído') throw erro('Serviço concluído não muda de situação.');
  if (at.status === 'Concluído' && (!antigo || antigo.status !== 'Concluído')) throw erro('Use o botão Finalizar para concluir o serviço.');
  if (at.status === 'Aprovado' && !at.data_agendada) throw erro('Informe o dia e a hora do serviço.');
  if (at.status === 'Em execução' && !(antigo && antigo.data_inicio)) at.data_inicio = agora();

  at.id = r.id || '';
  Object.assign(at, calcularValores_(at, ler('MATERIAIS'), config_()));
  delete at.id;
  if (antigo) {
    at.atualizado_em = agora();
    return comDados(atualizar_('ATENDIMENTOS', antigo.id, at));
  }
  at.numero = proximoNumero_();
  at.data_orcamento = hoje();
  at.pagamento = 'Pendente';
  return comDados(gravar_('ATENDIMENTOS', null, at));
}

// Regra de valores: mão de obra (serviços + deslocamento − desconto, nunca abaixo do mínimo) + materiais repassados com margem
function calcularValores_(at, materiais, cfg) {
  const itens = typeof at.itens_json === 'string' ? JSON.parse(at.itens_json || '[]') : (at.itens_json || []);
  const sub = itens.reduce((t, i) => t + num(i.qtd) * num(i.preco), 0);
  const base = materiais
    .filter(m => at.id && m.atendimento_id === at.id && m.ativo !== 'não' && m.comprado_por === 'Pietro' && m.repassar_cliente !== 'não')
    .reduce((t, m) => t + num(m.valor_total), 0);
  const mat = base * (1 + num(cfg.margem_material) / 100);
  const bruto = Math.max(sub + num(at.valor_deslocamento) - num(at.desconto), 0);
  const minimo = num(cfg.valor_minimo);
  const mao = sub > 0 && bruto < minimo ? minimo : bruto;
  return { subtotal_servicos: r2(sub), valor_materiais: r2(mat), valor_total: r2(mao + mat) };
}

function recalcular_(id) {
  const at = acharAt_(id);
  return atualizar_('ATENDIMENTOS', id, calcularValores_(at, ler('MATERIAIS'), config_()));
}

function finalizar(d) {
  const at = acharAt_(d.id);
  if (at.status === 'Concluído') throw erro('Este serviço já foi finalizado.');
  if (['Aprovado', 'Em execução'].indexOf(at.status) < 0) throw erro('Só dá para finalizar um serviço aprovado.');
  const fotos = fotosDo_(at.id);
  if (!fotos.some(f => f.tipo === 'Antes') || !fotos.some(f => f.tipo === 'Depois')) throw erro('Tire pelo menos uma foto ANTES e uma DEPOIS.');
  const ck = JSON.parse(at.checklist_json || '{}');
  if (!CHECKLIST.every(c => ck[c])) throw erro('Marque todo o checklist de qualidade.');

  let atual = atualizar_('ATENDIMENTOS', at.id, {
    status: 'Concluído', data_conclusao: agora(), data_inicio: at.data_inicio || agora(), atualizado_em: agora()
  });
  if (d.pagamento) atual = pagar_(atual, d.pagamento);
  const ns = gerarDoc_('Nota de Serviço', atual);
  const rq = gerarDoc_('Relatório de Qualidade', atual);
  return comDados({ ns, rq });
}

// Exclui o atendimento em qualquer situação (até concluído e pago), junto com fotos, PDFs, materiais e lançamentos.
// Os arquivos vão para a lixeira do Drive (recuperáveis por 30 dias).
function excluir_atendimento(d) {
  const at = acharAt_(d.id);
  const lixeira = fileId => { try { DriveApp.getFileById(fileId).setTrashed(true); } catch (e) { /* já removido */ } };
  ler('FOTOS').filter(f => f.atendimento_id === at.id && f.ativo !== 'não').forEach(f => { atualizar_('FOTOS', f.id, { ativo: 'não' }); lixeira(f.file_id); });
  ler('DOCUMENTOS').filter(x => x.atendimento_id === at.id && x.ativo !== 'não').forEach(x => { atualizar_('DOCUMENTOS', x.id, { ativo: 'não' }); lixeira(x.file_id); });
  ler('MATERIAIS').filter(m => m.atendimento_id === at.id && m.ativo !== 'não').forEach(m => atualizar_('MATERIAIS', m.id, { ativo: 'não' }));
  ler('CARTEIRA').filter(c => c.atendimento_id === at.id && c.ativo !== 'não').forEach(c => atualizar_('CARTEIRA', c.id, { ativo: 'não', atualizado_em: agora() }));
  apagarLinhas_('ATENDIMENTOS', a => a.id === at.id);
  return comDados({});
}

function registrar_pagamento(d) {
  const at = acharAt_(d.id);
  if (['Orçamento', 'Cancelado'].indexOf(at.status) >= 0) throw erro('Este atendimento não está aprovado.');
  if (at.pagamento === 'Pago') throw erro('Este serviço já está pago.');
  const atual = pagar_(at, d);
  const ns = atual.status === 'Concluído' ? gerarDoc_('Nota de Serviço', atual) : null; // a nota passa a mostrar "Pago"
  return comDados({ ns });
}

function estornar_pagamento(d) {
  const at = acharAt_(d.id);
  if (at.pagamento !== 'Pago') throw erro('Este serviço não está pago.');
  ler('CARTEIRA').filter(c => c.origem_id === at.id && c.ativo !== 'não')
    .forEach(c => atualizar_('CARTEIRA', c.id, { ativo: 'não', atualizado_em: agora() }));
  const atual = atualizar_('ATENDIMENTOS', at.id, { pagamento: 'Pendente', forma_pagamento: '', data_pagamento: '', atualizado_em: agora() });
  if (atual.status === 'Concluído') gerarDoc_('Nota de Serviço', atual);
  return comDados({});
}

function pagar_(at, p) {
  const forma = String(p.forma || '');
  if (FORMAS.indexOf(forma) < 0) throw erro('Escolha a forma de pagamento.');
  const data = /^\d{4}-\d{2}-\d{2}$/.test(String(p.data || '')) ? p.data : hoje();
  const atual = atualizar_('ATENDIMENTOS', at.id, { pagamento: 'Pago', forma_pagamento: forma, data_pagamento: data, atualizado_em: agora() });
  const cli = ler('CLIENTES').find(c => c.id === at.cliente_id) || {};
  gravar_('CARTEIRA', null, {
    data, tipo: 'Entrada', categoria: 'Serviço', descricao: 'Serviço nº ' + pad4_(at.numero) + ' – ' + nomeCli(cli),
    valor: num(at.valor_total), forma_pagamento: forma, atendimento_id: at.id, cliente_id: at.cliente_id,
    origem_id: at.id, automatico: 'sim'
  });
  return atual;
}

/* ============================== MATERIAIS ============================== */

function salvar_material(d) {
  const r = d.registro || {};
  const m = limpar_(r, CAMPOS.MATERIAIS);
  const at = acharAt_(m.atendimento_id);
  if (['Concluído', 'Cancelado'].indexOf(at.status) >= 0) throw erro('Este atendimento já foi encerrado.');
  if (!(m.quantidade > 0)) throw erro('A quantidade precisa ser maior que zero.');
  m.repassar_cliente = m.repassar_cliente || 'sim';
  m.valor_total = r2(m.quantidade * num(m.valor_unitario));
  m.data = m.data || hoje();
  const salvo = gravar_('MATERIAIS', r.id, m);
  sincronizarSaida_(salvo, at);
  recalcular_(at.id);
  return comDados(salvo);
}

function excluir_material(d) {
  const antes = ler('MATERIAIS').find(x => x.id === d.id);
  if (!antes) throw erro('Material não encontrado.');
  const at = acharAt_(antes.atendimento_id);
  if (['Concluído', 'Cancelado'].indexOf(at.status) >= 0) throw erro('Este atendimento já foi encerrado.');
  const m = atualizar_('MATERIAIS', d.id, { ativo: 'não' });
  sincronizarSaida_(m, at);
  recalcular_(at.id);
  return comDados({});
}

// Material comprado pelo Pietro vira uma saída automática na carteira
function sincronizarSaida_(m, at) {
  const existente = ler('CARTEIRA').find(c => c.origem_id === m.id);
  if (m.comprado_por === 'Pietro' && m.ativo !== 'não') {
    const dados = {
      data: m.data || hoje(), tipo: 'Saída', categoria: 'Material', descricao: 'Material: ' + m.descricao + ' (nº ' + pad4_(at.numero) + ')',
      valor: num(m.valor_total), atendimento_id: at.id, cliente_id: at.cliente_id, origem_id: m.id, automatico: 'sim', ativo: 'sim'
    };
    if (existente) atualizar_('CARTEIRA', existente.id, Object.assign(dados, { atualizado_em: agora() }));
    else gravar_('CARTEIRA', null, dados);
  } else if (existente) {
    atualizar_('CARTEIRA', existente.id, { ativo: 'não', atualizado_em: agora() });
  }
}

/* ============================== FOTOS ============================== */

function foto_enviar(d) {
  const at = acharAt_(d.atendimento_id);
  if (['Aprovado', 'Em execução'].indexOf(at.status) < 0) throw erro('Fotos só podem ser tiradas em serviço aprovado e não finalizado.');
  if (['Antes', 'Durante', 'Depois'].indexOf(d.tipo) < 0) throw erro('Tipo de foto inválido.');
  const bytes = Utilities.base64Decode(String(d.base64 || '').replace(/^data:image\/jpeg;base64,/, ''));
  if (bytes.length > 2.5e6) throw erro('Foto muito grande.');
  if (!(bytes[0] === -1 && bytes[1] === -40)) throw erro('Envie uma foto em JPEG.'); // assinatura FF D8 do JPEG

  const [ano, mes] = hoje().split('-');
  const nome = pad4_(at.numero) + '_' + d.tipo + '_' + Utilities.formatDate(new Date(), TZ, 'yyyyMMdd-HHmmss') + '.jpg';
  const arq = pasta_('Fotos', ano, mes, pad4_(at.numero)).createFile(Utilities.newBlob(bytes, 'image/jpeg', nome));
  if (at.status === 'Aprovado') atualizar_('ATENDIMENTOS', at.id, { status: 'Em execução', data_inicio: at.data_inicio || agora(), atualizado_em: agora() });
  const foto = gravar_('FOTOS', null, {
    atendimento_id: at.id, tipo: d.tipo, legenda: String(d.legenda || '').slice(0, 200), file_id: arq.getId(), data: agora()
  });
  return comDados(foto);
}

function foto_miniatura(d) {
  const f = ler('FOTOS').find(x => x.id === d.id);
  if (!f) throw erro('Foto não encontrada.');
  const arq = DriveApp.getFileById(f.file_id);
  let blob = null;
  try { blob = arq.getThumbnail(); } catch (e) { /* miniatura ainda não gerada pelo Drive */ }
  if (!blob) blob = arq.getBlob();
  return { src: 'data:' + blob.getContentType() + ';base64,' + Utilities.base64Encode(blob.getBytes()) };
}

// Várias miniaturas numa chamada só (a tela de execução abria uma requisição por foto)
function fotos_miniaturas(d) {
  const ids = (Array.isArray(d.ids) ? d.ids : []).slice(0, 40).map(String);
  const fotos = ler('FOTOS');
  const res = {};
  ids.forEach(id => {
    const f = fotos.find(x => x.id === id);
    if (!f) return;
    try {
      const arq = DriveApp.getFileById(f.file_id);
      let blob = null;
      try { blob = arq.getThumbnail(); } catch (e) { /* miniatura ainda não gerada pelo Drive */ }
      if (!blob) blob = arq.getBlob();
      res[id] = 'data:' + blob.getContentType() + ';base64,' + Utilities.base64Encode(blob.getBytes());
    } catch (e) { /* arquivo indisponível: a tela mostra o aviso */ }
  });
  return res;
}

function foto_apagar(d) {
  const f = ler('FOTOS').find(x => x.id === d.id);
  if (!f) throw erro('Foto não encontrada.');
  if (acharAt_(f.atendimento_id).status === 'Concluído') throw erro('Serviço finalizado: as fotos ficam guardadas.');
  atualizar_('FOTOS', f.id, { ativo: 'não' });
  try { DriveApp.getFileById(f.file_id).setTrashed(true); } catch (e) { /* já removida */ }
  return comDados({});
}

function fotosDo_(atId) {
  return ler('FOTOS').filter(f => f.atendimento_id === atId && f.ativo !== 'não');
}

/* ============================== DOCUMENTOS (PDF) ============================== */

function documento_gerar(d) {
  const at = acharAt_(d.atendimento_id);
  if (!PREFIXO[d.tipo]) throw erro('Tipo de documento inválido.');
  if (d.tipo !== 'Orçamento' && at.status !== 'Concluído') throw erro('Nota e relatório são gerados ao finalizar o serviço.');
  return comDados(gerarDoc_(d.tipo, at));
}

function documento_baixar(d) {
  const doc = ler('DOCUMENTOS').find(x => x.id === d.id && x.ativo !== 'não');
  if (!doc) throw erro('Documento não encontrado.');
  const blob = DriveApp.getFileById(doc.file_id).getBlob();
  return { nome: doc.nome_arquivo, base64: Utilities.base64Encode(blob.getBytes()) };
}

function gerarDoc_(tipo, at) {
  const cfg = config_();
  const cli = ler('CLIENTES').find(c => c.id === at.cliente_id) || {};
  const itens = JSON.parse(at.itens_json || '[]');
  const numero = PREFIXO[tipo] + '-' + pad4_(at.numero);
  const fotos = tipo === 'Relatório de Qualidade' ? fotosDo_(at.id) : []; // fotos só no relatório
  const margem = 1 + num(cfg.margem_material) / 100;

  const t = HtmlService.createTemplateFromFile(MODELO[tipo]);
  t.d = {
    titulo: tipo, numero, at, cli, cfg, itens,
    logo: typeof LOGO_BASE64 === 'undefined' ? '' : 'data:image/jpeg;base64,' + LOGO_BASE64,
    valores: resumoValores_(at, itens),
    mats: ler('MATERIAIS').filter(m => m.atendimento_id === at.id && m.ativo !== 'não').map(m => Object.assign(m, {
      cobrado: m.comprado_por === 'Pietro' && m.repassar_cliente !== 'não' ? r2(num(m.valor_total) * margem) : 0
    })),
    fotos: fotos.map(f => ({ tipo: f.tipo, legenda: f.legenda, src: fotoDataUri_(f.file_id) })),
    check: JSON.parse(at.checklist_json || '{}')
  };
  if (tipo === 'Relatório de Qualidade') Object.assign(t.d, dicasERevisao_(itens), { duracao: duracao_(at.data_inicio, at.data_conclusao) });

  const nome = numero + '_' + hoje() + '_' + slug_(nomeCli(cli)) + '.pdf';
  const pdf = Utilities.newBlob(t.evaluate().getContent(), 'text/html', 'doc.html').getAs('application/pdf').setName(nome);
  const [ano, mes] = hoje().split('-');
  const arq = pasta_('Documentos', ano, mes).createFile(pdf);

  // Regerar substitui a versão anterior do mesmo documento
  ler('DOCUMENTOS').filter(x => x.atendimento_id === at.id && x.tipo === tipo && x.ativo !== 'não').forEach(x => {
    atualizar_('DOCUMENTOS', x.id, { ativo: 'não' });
    try { DriveApp.getFileById(x.file_id).setTrashed(true); } catch (e) { /* já removido */ }
  });
  return gravar_('DOCUMENTOS', null, {
    tipo, numero, atendimento_id: at.id, cliente_id: at.cliente_id, cliente_nome: nomeCli(cli),
    data: hoje(), valor: num(at.valor_total), file_id: arq.getId(), nome_arquivo: nome
  });
}

function resumoValores_(at, itens) {
  const sub = r2(itens.reduce((t, i) => t + num(i.qtd) * num(i.preco), 0));
  const desl = num(at.valor_deslocamento), desc = num(at.desconto), mat = num(at.valor_materiais), total = num(at.valor_total);
  const ajuste = r2(total - mat - Math.max(sub + desl - desc, 0));
  return { sub, desl, desc, mat, total, ajuste: ajuste > 0.009 ? ajuste : 0 };
}

function dicasERevisao_(itens) {
  const servicos = ler('SERVICOS');
  const dicas = [];
  let meses = 0;
  itens.forEach(i => {
    const s = servicos.find(x => x.id === i.servico_id);
    if (!s) return;
    const dica = String(s.dica_manutencao || '').trim();
    if (dica && !dicas.some(x => x.dica === dica)) dicas.push({ servico: i.nome, dica });
    const m = num(s.revisao_meses);
    if (m > 0 && (!meses || m < meses)) meses = m;
  });
  let proxima = '';
  if (meses) {
    const d = new Date();
    d.setMonth(d.getMonth() + meses);
    proxima = Utilities.formatDate(d, TZ, 'dd/MM/yyyy');
  }
  return { dicas, proxima, meses };
}

function duracao_(ini, fim) {
  if (!ini || !fim) return '';
  const min = Math.round((new Date(fim) - new Date(ini)) / 60000);
  if (!(min > 0)) return '';
  const h = Math.floor(min / 60);
  return (h ? h + ' h ' : '') + (min % 60) + ' min';
}

function fotoDataUri_(fileId) {
  try {
    const blob = DriveApp.getFileById(fileId).getBlob();
    return 'data:image/jpeg;base64,' + Utilities.base64Encode(blob.getBytes());
  } catch (e) {
    return '';
  }
}

// Usado pelos modelos HTML: <?!= include('Cabecalho', d) ?>
function include(nome, d) {
  const t = HtmlService.createTemplateFromFile(nome);
  t.d = d;
  return t.evaluate().getContent();
}

/* ============================== PASTAS DO DRIVE ============================== */

function pastaRaiz_() {
  const id = config_().pasta_id;
  if (id) {
    try { return DriveApp.getFolderById(id); } catch (e) { /* pasta apagada: cria outra */ }
  }
  const pasta = DriveApp.createFolder('App Pietro Fasano');
  const sh = aba_('CONFIG');
  const chaves = sh.getRange(1, 1, sh.getLastRow(), 1).getValues().flat();
  const i = chaves.indexOf('pasta_id');
  if (i >= 0) sh.getRange(i + 1, 2).setValue(pasta.getId());
  else sh.appendRow(['pasta_id', pasta.getId()]);
  mudou_('CONFIG');
  return pasta;
}

// Guarda o ID de cada subpasta (Fotos/2026/10/0001…) por 6 h: evita percorrer as pastas do Drive a cada foto
function pasta_() {
  const nomes = Array.prototype.slice.call(arguments);
  const cache = CacheService.getScriptCache();
  const chave = 'pasta:' + nomes.join('/');
  const id = cache.get(chave);
  if (id) {
    try {
      const p = DriveApp.getFolderById(id);
      if (!p.isTrashed()) return p;
    } catch (e) { /* pasta apagada: procura de novo */ }
  }
  const pasta = nomes.reduce((pai, nome) => {
    const it = pai.getFoldersByName(nome);
    return it.hasNext() ? it.next() : pai.createFolder(nome);
  }, pastaRaiz_());
  cache.put(chave, pasta.getId(), 21600);
  return pasta;
}

/* ============================== PLANILHA ============================== */

// Cache válido só durante UMA requisição (o Apps Script zera as variáveis globais a cada execução).
// Evita reabrir a planilha e reler a mesma aba várias vezes; toda gravação limpa o cache da aba.
let PLANILHA_ = null;
const ABAS_ABERTAS_ = {};
let LIDOS_ = {};
let CONFIG_LIDA_ = null;

function limparCache_() {
  PLANILHA_ = null;
  Object.keys(ABAS_ABERTAS_).forEach(k => delete ABAS_ABERTAS_[k]);
  LIDOS_ = {};
  CONFIG_LIDA_ = null;
}

function mudou_(nome) {
  delete LIDOS_[nome];
  if (nome === 'CONFIG') CONFIG_LIDA_ = null;
}

// Funciona com o script criado pela planilha (Extensões > Apps Script) ou solto em script.google.com:
// neste caso, o setup() cria a planilha "App Pietro Fasano" no Drive e guarda o ID dela.
function planilha_() {
  if (PLANILHA_) return PLANILHA_;
  const ativa = SpreadsheetApp.getActive();
  if (ativa) return (PLANILHA_ = ativa);
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('PLANILHA_ID');
  if (id) return (PLANILHA_ = SpreadsheetApp.openById(id));
  const nova = SpreadsheetApp.create('App Pietro Fasano');
  props.setProperty('PLANILHA_ID', nova.getId());
  return (PLANILHA_ = nova);
}

function aba_(nome) {
  if (ABAS_ABERTAS_[nome]) return ABAS_ABERTAS_[nome];
  const sh = planilha_().getSheetByName(nome);
  if (!sh) throw erro('Aba ' + nome + ' não existe. Rode a função setup().');
  return (ABAS_ABERTAS_[nome] = sh);
}

function ler(nome) {
  if (!LIDOS_[nome]) {
    const v = aba_(nome).getDataRange().getValues();
    const cab = v.shift() || [];
    LIDOS_[nome] = v.filter(l => l.some(c => c !== '')).map(l => linhaParaObj_(cab, l));
  }
  return LIDOS_[nome].map(o => Object.assign({}, o)); // cópias: quem altera o objeto não suja o cache
}

function linhaParaObj_(cab, l) {
  const o = {};
  cab.forEach((c, j) => { o[c] = l[j] instanceof Date ? Utilities.formatDate(l[j], TZ, "yyyy-MM-dd'T'HH:mm:ss") : l[j]; });
  return o;
}

function objParaLinha_(nome, o) {
  return ABAS[nome].map(c => (o[c] === undefined || o[c] === null ? '' : o[c]));
}

function config_() {
  if (!CONFIG_LIDA_) {
    CONFIG_LIDA_ = {};
    const sh = planilha_().getSheetByName('CONFIG');
    if (sh && sh.getLastRow() >= 2) {
      sh.getRange(2, 1, sh.getLastRow() - 1, 2).getValues().forEach(l => { if (l[0]) CONFIG_LIDA_[l[0]] = l[1]; });
    }
  }
  return Object.assign({}, CONFIG_LIDA_);
}

function gravar_(nome, id, reg) {
  const t = agora();
  if (id) return atualizar_(nome, id, Object.assign(reg, { atualizado_em: t }));
  const novo = Object.assign({ id: Utilities.getUuid(), ativo: 'sim', criado_em: t, atualizado_em: t }, reg);
  aba_(nome).appendRow(objParaLinha_(nome, novo));
  mudou_(nome);
  return linhaParaObj_(ABAS[nome], objParaLinha_(nome, novo));
}

function atualizar_(nome, id, campos) {
  const sh = aba_(nome);
  const n = sh.getLastRow() - 1;
  const ids = n > 0 ? sh.getRange(2, 1, n, 1).getValues().flat().map(String) : [];
  const i = ids.indexOf(String(id));
  if (i < 0) throw erro('Registro não encontrado.');
  return atualizarLinha_(nome, i + 2, campos);
}

function atualizarLinha_(nome, linha, campos) {
  const cab = ABAS[nome];
  const r = aba_(nome).getRange(linha, 1, 1, cab.length);
  const atual = r.getValues()[0];
  const novo = cab.map((c, j) => (campos[c] !== undefined ? campos[c] : atual[j]));
  r.setValues([novo]);
  mudou_(nome);
  return linhaParaObj_(cab, novo);
}

function apagarLinhas_(nome, condicao) {
  const sh = aba_(nome);
  const v = sh.getDataRange().getValues();
  for (let i = v.length - 1; i >= 1; i--) if (condicao(linhaParaObj_(v[0], v[i]))) sh.deleteRow(i + 1);
  mudou_(nome);
}

function acharAt_(id) {
  const at = ler('ATENDIMENTOS').find(a => a.id === id);
  if (!at) throw erro('Atendimento não encontrado.');
  return at;
}

function proximoNumero_() {
  const maior = ler('ATENDIMENTOS').reduce((m, a) => Math.max(m, num(a.numero)), 0);
  return pad4_(maior + 1);
}

/* ============================== VALIDAÇÃO ============================== */

function limpar_(o, regras) {
  const r = {};
  Object.keys(regras).forEach(c => {
    const g = regras[c];
    const rot = g.rot || c;
    let v = o[c] === undefined || o[c] === null ? '' : String(o[c]).trim();
    if (g.tel) v = v.replace(/\D/g, '');
    if (v === '') {
      if (g.obr) throw erro('Preencha: ' + rot + '.');
      r[c] = '';
      return;
    }
    if (g.num) {
      const n = Number(v.replace(',', '.'));
      if (!isFinite(n) || n < 0) throw erro(rot + ' precisa ser um número válido.');
      r[c] = r2(n);
      return;
    }
    if (g.tel && !/^\d{10,11}$/.test(v)) throw erro('Telefone precisa ter DDD + número.');
    if (g.data && !/^\d{4}-\d{2}-\d{2}$/.test(v)) throw erro(rot + ': data inválida.');
    if (g.lista && g.lista.indexOf(v) < 0) throw erro(rot + ': opção inválida.');
    if (v.length > (g.max || 200)) throw erro(rot + ' está muito longo.');
    if (/^[=+@]/.test(v)) v = "'" + v; // impede que o texto vire fórmula na planilha
    r[c] = v;
  });
  return r;
}

function limparItens_(entrada) {
  let itens;
  try { itens = typeof entrada === 'string' ? JSON.parse(entrada) : entrada; } catch (e) { throw erro('Lista de serviços inválida.'); }
  if (!Array.isArray(itens) || !itens.length) throw erro('Escolha pelo menos um serviço.');
  return itens.slice(0, 60).map(i => {
    const qtd = num(i.qtd), preco = num(i.preco);
    if (!(qtd > 0)) throw erro('Confira a quantidade de "' + String(i.nome || '').slice(0, 60) + '".');
    if (preco < 0) throw erro('Preço inválido.');
    return {
      servico_id: String(i.servico_id || '').slice(0, 40), nome: String(i.nome || 'Serviço').slice(0, 140),
      categoria: String(i.categoria || '').slice(0, 40), unidade: String(i.unidade || 'un').slice(0, 20),
      qtd: r2(qtd), preco: r2(preco), feito: !!i.feito, desmontagem: !!i.desmontagem
    };
  });
}

function limparChecklist_(entrada) {
  let o = {};
  try { o = typeof entrada === 'string' ? JSON.parse(entrada || '{}') : (entrada || {}); } catch (e) { o = {}; }
  const r = {};
  CHECKLIST.forEach(c => { r[c] = !!o[c]; });
  return r;
}

/* ============================== UTILIDADES ============================== */

function erro(msg) {
  const e = new Error(msg);
  e.amigavel = true;
  return e;
}

function num(v) {
  const n = Number(String(v === undefined || v === null ? '' : v).replace(',', '.'));
  return isFinite(n) ? n : 0;
}

function r2(n) { return Math.round(n * 100) / 100; }
function pad4_(n) { return String(num(n)).padStart(4, '0'); }
function agora() { return Utilities.formatDate(new Date(), TZ, "yyyy-MM-dd'T'HH:mm:ss"); }
function hoje() { return Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd'); }
function depoisDe_(ms) { return Utilities.formatDate(new Date(Date.now() + ms), TZ, "yyyy-MM-dd'T'HH:mm:ss"); }
function sha_(t) { return Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, t, Utilities.Charset.UTF_8)); }
function normaliza_(s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().replace(/\s+/g, ' ').toLowerCase(); }
function slug_(s) { return normaliza_(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'cliente'; }
function nomeCli(c) { return ((c.nome || '') + ' ' + (c.sobrenome || '')).trim() || 'Cliente'; }

// Formatação usada nos modelos de PDF
function moeda(v) { return 'R$ ' + num(v).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
function dataBR(s) { return s ? String(s).slice(0, 10).split('-').reverse().join('/') : ''; }
function dataHoraBR(s) { return s ? dataBR(s) + (String(s).length > 10 ? ' ' + String(s).slice(11, 16) : '') : ''; }
function telBR(t) { const d = String(t || '').replace(/\D/g, ''); return d.length >= 10 ? '(' + d.slice(0, 2) + ') ' + d.slice(2, -4) + '-' + d.slice(-4) : d; }
function qtdBR(v) { return String(r2(num(v))).replace('.', ','); }
function enderecoCli(c) { return [c.endereco, c.bairro, c.cidade].filter(Boolean).join(', '); }
function quebras(s) {
  return String(s || '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch])).replace(/\n/g, '<br>');
}
