'use strict';
/* App da Pietro Resolve (Pietro Fasano) — Reparos a domicílio em Uberaba
   Frontend estático (GitHub Pages). Os dados ficam na Google Planilha, acessada pelo Apps Script. */

// Cole aqui a URL do App da Web (Apps Script > Implantar > Gerenciar implantações)
const API_URL = 'https://script.google.com/macros/s/AKfycbzc9fE0aCkbdBLGSA5WTsVU0X1jOLCS-O8GcgOcZvhd3qVU77UroS5CU5B-wPfKMH5x/exec';

const CATEGORIAS = ['Elétrica', 'Hidráulica', 'Instalações', 'Montagem', 'Pintura', 'Portas', 'Manutenção', 'Pacotes', 'Taxas'];
const ICONE_CAT = { 'Elétrica': '⚡', 'Hidráulica': '💧', 'Instalações': '🖼️', 'Montagem': '🛏️', 'Pintura': '🎨', 'Portas': '🚪', 'Manutenção': '🏠', 'Pacotes': '📦', 'Taxas': '🧾' };
const FORMAS = ['Pix', 'Dinheiro', 'Cartão de débito', 'Cartão de crédito', 'Transferência'];
const CAT_SAIDA = ['Material', 'Combustível', 'Ferramentas', 'Alimentação', 'Celular/Internet', 'MEI/DAS', 'Manutenção do veículo', 'Outros'];
const CAT_ENTRADA = ['Serviço', 'Outros'];
const STATUS = ['Orçamento', 'Aprovado', 'Em execução', 'Concluído', 'Cancelado'];
const CHECKLIST = [['testado', 'Serviço testado e funcionando'], ['limpo', 'Local limpo e organizado'], ['conferido', 'Cliente conferiu o serviço'], ['orientado', 'Orientações de uso repassadas']];
const PADRAO_TEL = '\\(\\d{2}\\) \\d{4,5}-\\d{4}';
const MARGEM_DESMONTAGEM = 0.55;

let S = lerLocal('dados');          // cópia dos dados da planilha
let sessao = lerLocal('sessao');
let senhaCriada = null;
let rasc = null;                     // orçamento em edição
let exec = null;                     // anotações do serviço em execução
let fila = lerLocal('fila_fotos') || [];
let enviandoFila = false;
let mesCarteira = hoje().slice(0, 7);
let filtroCarteira = '';
let filtroAts = '';
const dash = { periodo: 'mes', de: '', ate: '', cliente: '', servico: '', categoria: '', status: '', forma: '' };
const filtroArq = { de: '', ate: '', cliente: '', tipo: '', numero: '' };
const miniaturas = {};
const pdfs = {};
const depois = [];

/* ============================== UTILIDADES ============================== */

function lerLocal(k) { try { return JSON.parse(localStorage.getItem('pietro_' + k)); } catch { return null; } }
function gravarLocal(k, v) {
  try { v == null ? localStorage.removeItem('pietro_' + k) : localStorage.setItem('pietro_' + k, JSON.stringify(v)); return true; } catch { return false; }
}

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const num = v => { const n = Number(String(v ?? '').replace(',', '.')); return Number.isFinite(n) ? n : 0; };
const r2 = n => Math.round(n * 100) / 100;
const fmtMoeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const moeda = v => fmtMoeda.format(num(v));
const moedaCurta = v => { const n = num(v); return n >= 1000 ? 'R$ ' + (n / 1000).toFixed(1).replace('.', ',') + ' mil' : 'R$ ' + Math.round(n); };
const n4 = v => String(num(v)).padStart(4, '0');
function hoje(d = new Date()) { return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); }
const dataBR = s => s ? String(s).slice(0, 10).split('-').reverse().join('/') : '';
const dataHoraBR = s => s ? dataBR(s) + (String(s).length > 10 ? ' ' + String(s).slice(11, 16) : '') : '';
const telBR = t => { const d = String(t ?? '').replace(/\D/g, ''); return d.length >= 10 ? `(${d.slice(0, 2)}) ${d.slice(2, -4)}-${d.slice(-4)}` : d; };
const qtdBR = v => String(r2(num(v))).replace('.', ',');
const semAcento = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const soma = (l, campo = 'valor') => l.reduce((t, x) => t + num(x[campo]), 0);
const ativos = l => (l || []).filter(x => x.ativo !== 'não');
const cli = id => S.clientes.find(c => c.id === id);
const atd = id => S.atendimentos.find(a => a.id === id);
const nomeCompleto = c => c ? `${c.nome} ${c.sobrenome}`.trim() : 'Cliente removido';
const enderecoCompleto = c => c ? [c.endereco, c.bairro, c.cidade].filter(Boolean).join(', ') : '';
const itensDe = a => { try { return JSON.parse(a.itens_json || '[]'); } catch { return []; } };
const checkDe = a => { try { return JSON.parse(a.checklist_json || '{}'); } catch { return {}; } };
const resumoItens = a => itensDe(a).map(i => `${qtdBR(i.qtd)}x ${i.nome}`).join(', ');
const fmtQtd = i => qtdBR(i.qtd) + (['m²', 'hora'].includes(i.unidade) ? ' ' + i.unidade : 'x');
const waLink = (tel, texto) => `https://wa.me/55${String(tel ?? '').replace(/\D/g, '')}` + (texto ? '?text=' + encodeURIComponent(texto) : '');
const mapsLink = c => 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(enderecoCompleto(c));

/* HTML seguro: tudo que entra com ${} é escapado, exceto o que já veio de html`` */
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
class Seguro { constructor(s) { this.s = s; } }
const html = (partes, ...vals) => new Seguro(partes.reduce((o, p, i) => o + p + (i < vals.length ? valor(vals[i]) : ''), ''));
function valor(v) {
  if (v == null || v === false) return '';
  if (Array.isArray(v)) return v.map(valor).join('');
  if (v instanceof Seguro) return v.s;
  return esc(v);
}
function pintar(alvo, conteudo) { (typeof alvo === 'string' ? $(alvo) : alvo).innerHTML = valor(conteudo); }

function aviso(msg, tipo = 'ok') {
  const a = $('#aviso');
  a.textContent = msg;
  a.className = tipo;
  a.hidden = false;
  clearTimeout(aviso.t);
  aviso.t = setTimeout(() => { a.hidden = true; }, tipo === 'erro' ? 6000 : 2500);
}
function carregando(on, txt = 'Carregando…') {
  $('#carregando').hidden = !on;
  $('#carregando-txt').textContent = txt;
}
async function tentar(fn) {
  try { await fn(); } catch (e) { carregando(false); aviso(e.message || 'Algo deu errado.', 'erro'); }
}
function abrirDialogo(conteudo) {
  const d = $('#dialogo');
  pintar(d, conteudo);
  if (!d.open) d.showModal();
}
function fecharDialogo() { const d = $('#dialogo'); if (d.open) d.close(); }
function ir(h) {
  if (decodeURIComponent(location.hash) === h) render();
  else location.hash = h;
}
function baixarArquivo(blob, nome) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = nome;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 30000);
}

/* ============================== API ============================== */

async function api(action, data = {}, texto = 'Carregando…') {
  if (API_URL.includes('COLE_AQUI')) throw new Error('Falta configurar a API_URL no app.js (veja o README).');
  if (texto) carregando(true, texto);
  const ctrl = new AbortController();
  const tempo = setTimeout(() => ctrl.abort(), 90000);
  try {
    const r = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // evita o pré-voo de CORS do Apps Script
      body: JSON.stringify({ action, sessao, data }),
      signal: ctrl.signal
    });
    const j = await r.json();
    if (j.sessaoExpirada) { sair(); throw new Error(j.error); }
    if (!j.ok) throw new Error(j.error || 'Algo deu errado.');
    if (j.data && j.data.dados) {
      S = j.data.dados;
      gravarLocal('dados', S);
    }
    return j.data;
  } catch (e) {
    if (e.name === 'AbortError') throw new Error('Demorou demais. Confira a internet e tente de novo.');
    if (e instanceof TypeError) throw new Error('Sem internet ou servidor fora do ar. Tente de novo.');
    throw e;
  } finally {
    clearTimeout(tempo);
    if (texto) carregando(false);
  }
}

/* ============================== ROTAS ============================== */

const TELAS = {
  inicio: tInicio, clientes: tClientes, cliente: tCliente, 'cliente-form': tClienteForm,
  servicos: tServicos, 'servico-form': tServicoForm, orcamento: tOrcamento, atendimentos: tAtendimentos,
  at: tAtendimento, execucao: tExecucao, exec: tExec, carteira: tCarteira, lancamento: tLancamento,
  dashboard: tDashboard, arquivo: tArquivo, ajustes: tAjustes
};

function rota() {
  const [nome, ...resto] = decodeURIComponent(location.hash.slice(1)).split('/');
  return { nome: TELAS[nome] ? nome : 'inicio', id: resto.join('/') };
}

function render() {
  if (!sessao) return tLogin();
  if (!S) return pintar('#app', html`<section class="erro-tela"><p>Não consegui buscar seus dados.</p>
    <button class="botao principal" data-acao="recarregar">Tentar de novo</button></section>`);
  const { nome, id } = rota();
  pintar('#app', TELAS[nome](id));
  depois.splice(0).forEach(f => f());
}

window.addEventListener('hashchange', () => { render(); window.scrollTo(0, 0); });
window.addEventListener('online', () => enviarFila());

/* Eventos: os elementos dizem o que fazem com data-acao, data-form, data-on (digitar) e data-muda (mudar) */
document.addEventListener('click', e => {
  const b = e.target.closest('[data-acao]');
  if (!b || !ACOES[b.dataset.acao]) return;
  e.preventDefault();
  tentar(() => ACOES[b.dataset.acao](b.dataset, b));
});
document.addEventListener('submit', e => {
  const f = e.target;
  const fn = FORMS[f.dataset.form];
  if (!fn) return;
  e.preventDefault();
  const d = Object.fromEntries(new FormData(f));
  if (e.submitter && e.submitter.name) d[e.submitter.name] = e.submitter.value;
  tentar(() => fn(d, f));
});
document.addEventListener('input', e => { const fn = AO_DIGITAR[e.target.dataset.on]; if (fn) fn(e.target); });
document.addEventListener('change', e => { const fn = AO_MUDAR[e.target.dataset.muda]; if (fn) tentar(() => fn(e.target)); });

/* ============================== PEDAÇOS DE TELA ============================== */

const topo = (titulo, voltar = '#inicio') => html`<header class="topo">
  <a class="voltar" href="${voltar}">← Voltar</a><h1>${titulo}</h1><a class="casa" href="#inicio" aria-label="Início">🏠</a></header>`;
const naoEncontrado = () => html`${topo('Não encontrado')}<p class="vazio">Esse registro não existe mais.</p>`;
const selo = s => s ? html`<span class="selo s-${semAcento(s).replace(/\s+/g, '-')}">${s}</span>` : '';
const linkLigar = c => html`<a class="botao" href="tel:+55${String(c.telefone ?? '').replace(/\D/g, '')}">📞 Ligar</a>`;
const linkWhats = (c, texto) => html`<a class="botao" href="${waLink(c.telefone, texto)}" target="_blank" rel="noopener">💬 WhatsApp</a>`;
const linkMaps = c => html`<a class="botao" href="${mapsLink(c)}" target="_blank" rel="noopener">📍 Mapa</a>`;
const contatos = c => c ? html`<div class="acoes3">${linkLigar(c)}${linkWhats(c)}${linkMaps(c)}</div>` : '';
const opcoesSelect = (lista, atual, vazio) => html`${vazio ? html`<option value="">${vazio}</option>` : ''}${lista.map(o => {
  const [v, t] = Array.isArray(o) ? o : [o, o];
  return html`<option value="${v}" ${String(v) === String(atual ?? '') ? 'selected' : ''}>${t}</option>`;
})}`;

function cardAt(a, destino = '#at/') {
  const c = cli(a.cliente_id);
  return html`<a class="item" href="${destino}${a.id}">
    <div><b>nº ${n4(a.numero)} · ${nomeCompleto(c)}</b><small>${resumoItens(a)}</small>
      <small>${a.data_agendada ? '📅 ' + dataHoraBR(a.data_agendada) : 'Orçado em ' + dataBR(a.data_orcamento)}</small></div>
    <div class="dir"><b>${moeda(a.valor_total)}</b>${selo(a.status)}${a.status === 'Concluído' ? selo(a.pagamento) : ''}</div></a>`;
}

/* ============================== LOGIN ============================== */

async function tLogin() {
  if (senhaCriada === null) {
    pintar('#app', html`<p class="vazio">Conectando…</p>`);
    try {
      senhaCriada = (await api('status_login', {}, 'Conectando…')).senhaCriada;
    } catch (e) {
      return pintar('#app', html`<section class="erro-tela"><p>${e.message}</p>
        <button class="botao principal" data-acao="recarregar">Tentar de novo</button></section>`);
    }
  }
  const novo = !senhaCriada;
  pintar('#app', html`<section class="login">
    <div class="login-cartao">
      <p class="mini">Reparos a domicílio</p>
      <h1>Pietro<br>Resolve</h1>
      <p>Chamou, o Pietro resolve.</p>
      <img class="login-foto" src="assets/mascote.jpg" alt="Mascote da Pietro Resolve">
    </div>
    <form class="login-form" data-form="${novo ? 'criarSenha' : 'login'}">
      ${novo ? html`<p class="grande">Bem-vindo, Pietro! 👋<br>Crie sua senha para começar.</p>` : ''}
      <label for="l-login">Usuário</label>
      <input id="l-login" name="login" value="Pietro Fasano" autocomplete="username" required>
      <label for="l-senha">${novo ? 'Crie uma senha (mínimo 6 caracteres)' : 'Senha'}</label>
      <div class="senha"><input id="l-senha" type="password" name="senha" minlength="6" maxlength="100" required
        autocomplete="${novo ? 'new-password' : 'current-password'}">
        <button type="button" data-acao="verSenha" aria-label="Mostrar ou esconder a senha">👁</button></div>
      ${novo ? html`<label for="l-conf">Repita a senha</label>
        <input id="l-conf" type="password" name="confirma" minlength="6" maxlength="100" required autocomplete="new-password">` : ''}
      <button class="botao principal grande">${novo ? 'CRIAR SENHA E ENTRAR' : 'ENTRAR'}</button>
    </form></section>`);
}

function sair() {
  sessao = null;
  S = null;
  senhaCriada = null;
  rasc = exec = null;
  gravarLocal('sessao', null);
  gravarLocal('dados', null);
  if (location.hash) history.replaceState(null, '', location.pathname);
  render();
}

async function entrar(r) {
  sessao = r.sessao;
  gravarLocal('sessao', sessao);
  await iniciar();
}

/* ============================== INÍCIO ============================== */

function tInicio() {
  const h = hoje();
  const ats = S.atendimentos;
  const abertos = ats.filter(a => ['Aprovado', 'Em execução'].includes(a.status));
  const deHoje = abertos.filter(a => String(a.data_agendada).startsWith(h));
  const receber = soma(ats.filter(a => a.status === 'Concluído' && a.pagamento !== 'Pago'), 'valor_total');
  const aguardando = ats.filter(a => a.status === 'Orçamento').length;
  const proximo = abertos.filter(a => String(a.data_agendada) >= h).sort((a, b) => String(a.data_agendada).localeCompare(b.data_agendada))[0];
  const c = proximo && cli(proximo.cliente_id);
  const botoes = [
    ['#orcamento', '📝', 'Novo orçamento', 'destaque'], ['#execucao', '🔧', 'Execução (fotos)', 'azul'],
    ['#clientes', '👤', 'Clientes'], ['#servicos', '🧰', 'Serviços'],
    ['#carteira', '💰', 'Carteira'], ['#dashboard', '📊', 'Dashboard'],
    ['#arquivo', '📁', 'Arquivo'], ['#ajustes', '⚙️', 'Ajustes']
  ];
  return html`<header class="ola"><img src="assets/mascote.jpg" alt="">
      <div><p>Olá, Pietro!</p><small>Pietro Resolve · Reparos a domicílio</small></div>
      <button class="atualizar" data-acao="atualizar" aria-label="Atualizar dados">🔄</button></header>
    <div class="resumo">
      <a href="#execucao"><b>${deHoje.length}</b>serviço(s) hoje</a>
      <a href="#carteira"><b>${moedaCurta(receber)}</b>a receber</a>
      <a href="#atendimentos/Orçamento"><b>${aguardando}</b>orçamento(s) aguardando</a>
    </div>
    ${proximo ? html`<section class="cartao"><small>Próximo serviço</small>
      <b>📅 ${dataHoraBR(proximo.data_agendada)} · ${nomeCompleto(c)}</b>
      <p class="pequeno">${resumoItens(proximo)}</p><p class="pequeno">📍 ${enderecoCompleto(c)}</p>
      <div class="acoes2"><a class="botao" href="${mapsLink(c)}" target="_blank" rel="noopener">📍 Abrir no mapa</a>
      <a class="botao" href="#exec/${proximo.id}">🔧 Executar</a></div></section>` : ''}
    <nav class="grade" aria-label="Menu principal">${botoes.map(([h, i, t, cls]) =>
      html`<a class="tile ${cls || ''}" href="${h}"><span class="ico" aria-hidden="true">${i}</span>${t}</a>`)}</nav>
    <a class="link" href="#atendimentos">📋 Ver todos os atendimentos</a>`;
}

/* ============================== CLIENTES ============================== */

function filtrarClientes(q) {
  const t = semAcento(q).trim(), d = String(q).replace(/\D/g, '');
  return ativos(S.clientes)
    .filter(c => !t || semAcento(nomeCompleto(c)).includes(t) || (d && String(c.telefone).includes(d)))
    .sort((a, b) => nomeCompleto(a).localeCompare(nomeCompleto(b), 'pt-BR'));
}

function listaClientes(q, escolher) {
  const lista = filtrarClientes(q);
  if (!lista.length) return html`<p class="vazio">Nenhum cliente encontrado.</p>`;
  return lista.slice(0, escolher ? 8 : 500).map(c => escolher
    ? html`<button class="item" style="width:100%;font:inherit;text-align:left;cursor:pointer" data-acao="escolherCliente" data-id="${c.id}">
        <div><b>${nomeCompleto(c)}</b><small>${telBR(c.telefone)} · ${c.bairro || c.endereco}</small></div><span aria-hidden="true">›</span></button>`
    : html`<a class="item" href="#cliente/${c.id}"><div><b>${nomeCompleto(c)}</b><small>${telBR(c.telefone)} · ${c.bairro || c.endereco}</small></div><span aria-hidden="true">›</span></a>`);
}

function tClientes() {
  return html`${topo('Clientes')}
    <div class="barra-busca"><label class="sr" for="busca-cli">Buscar cliente</label>
      <input id="busca-cli" type="search" placeholder="🔎 Buscar por nome ou telefone" data-on="buscaClientes" autocomplete="off"></div>
    <div id="lista-clientes">${listaClientes('')}</div>
    <a class="botao principal fixo" href="#cliente-form">+ Novo cliente</a>`;
}

function tClienteForm(id) {
  const c = id ? cli(id) : { cidade: S.cfg.cidade || 'Uberaba' };
  if (!c) return naoEncontrado();
  const voltar = id ? '#cliente/' + id : rasc && rasc.voltar ? '#orcamento' + (rasc.id ? '/' + rasc.id : '') : '#clientes';
  return html`${topo(id ? 'Editar cliente' : 'Novo cliente', voltar)}
    <form data-form="cliente">
      <input type="hidden" name="id" value="${c.id || ''}">
      <p class="dica">Campos com <span class="obrig">*</span> são obrigatórios.</p>
      <label for="c-nome">Nome <span class="obrig">*</span></label>
      <input id="c-nome" name="nome" required maxlength="60" autocapitalize="words" autocomplete="off" value="${c.nome || ''}">
      <label for="c-sobre">Sobrenome <span class="obrig">*</span></label>
      <input id="c-sobre" name="sobrenome" required maxlength="80" autocapitalize="words" autocomplete="off" value="${c.sobrenome || ''}">
      <label for="c-tel">Telefone (WhatsApp) <span class="obrig">*</span></label>
      <input id="c-tel" name="telefone" type="tel" inputmode="numeric" required pattern="${PADRAO_TEL}" maxlength="15"
        placeholder="(34) 99999-9999" title="DDD + número, ex.: (34) 99120-5525" data-on="mascaraTel" value="${telBR(c.telefone)}">
      <label for="c-end">Endereço (rua, número, complemento) <span class="obrig">*</span></label>
      <input id="c-end" name="endereco" required maxlength="200" autocomplete="off" value="${c.endereco || ''}">
      <label for="c-bairro">Bairro</label>
      <input id="c-bairro" name="bairro" maxlength="80" value="${c.bairro || ''}">
      <label for="c-cid">Cidade</label>
      <input id="c-cid" name="cidade" maxlength="80" value="${c.cidade || ''}">
      <label for="c-obs">Observação</label>
      <textarea id="c-obs" name="observacao" maxlength="500" placeholder="Ex.: tem cachorro, portaria pede documento">${c.observacao || ''}</textarea>
      <button class="botao principal fixo">💾 SALVAR CLIENTE</button>
    </form>`;
}

function tCliente(id) {
  const c = cli(id);
  if (!c) return naoEncontrado();
  const hist = S.atendimentos.filter(a => a.cliente_id === id).sort((a, b) => String(b.criado_em).localeCompare(a.criado_em));
  const pago = soma(hist.filter(a => a.pagamento === 'Pago' && a.status !== 'Cancelado'), 'valor_total');
  return html`${topo(nomeCompleto(c), '#clientes')}
    <section class="cartao">
      <p class="grande">📞 ${telBR(c.telefone)}</p>
      <p>📍 ${enderecoCompleto(c)}</p>
      ${c.observacao ? html`<p class="obs">📝 ${c.observacao}</p>` : ''}
      ${contatos(c)}
    </section>
    <button class="botao principal" data-acao="novoOrcamento" data-cliente="${id}">📝 Novo orçamento para este cliente</button>
    <h2>Histórico</h2>
    <p>Total já pago: <b>${moeda(pago)}</b></p>
    ${hist.length ? hist.map(a => cardAt(a)) : html`<p class="vazio">Nenhum atendimento ainda.</p>`}
    <div class="acoes2">
      <a class="botao" href="#cliente-form/${id}">✏️ Editar</a>
      <button class="botao perigo" data-acao="excluir" data-aba="CLIENTES" data-id="${id}" data-volta="#clientes">🗑️ Excluir</button>
    </div>`;
}

/* ============================== SERVIÇOS ============================== */

const faixa = s => num(s.preco_min) || num(s.preco_max) ? `Média Uberaba: ${moeda(s.preco_min)} a ${moeda(s.preco_max)}` : '';

function tServicos() {
  const lista = ativos(S.servicos);
  return html`${topo('Serviços e preços')}
    <p class="dica">Preços de mão de obra. Toque em um serviço para mudar o preço ou a dica de manutenção.</p>
    ${CATEGORIAS.map(cat => {
      const doCat = lista.filter(s => s.categoria === cat);
      if (!doCat.length) return '';
      return html`<details class="grupo"><summary>${ICONE_CAT[cat]} ${cat} (${doCat.length})</summary>
        ${doCat.map(s => html`<a class="item" href="#servico-form/${s.id}">
          <div><b>${s.nome}</b><small>${faixa(s)}</small></div>
          <div class="dir"><b>${moeda(s.preco)}</b><small>por ${s.unidade || 'un'}</small></div></a>`)}</details>`;
    })}
    <a class="botao principal fixo" href="#servico-form">+ Novo serviço</a>`;
}

function tServicoForm(id) {
  const s = id ? S.servicos.find(x => x.id === id) : { categoria: CATEGORIAS[0], unidade: 'un', revisao_meses: 12 };
  if (!s) return naoEncontrado();
  return html`${topo(id ? 'Editar serviço' : 'Novo serviço', '#servicos')}
    <form data-form="servico">
      <input type="hidden" name="id" value="${s.id || ''}">
      <label for="s-cat">Categoria</label>
      <select id="s-cat" name="categoria" required>${opcoesSelect(CATEGORIAS, s.categoria)}</select>
      <label for="s-nome">Nome do serviço</label>
      <input id="s-nome" name="nome" required maxlength="120" value="${s.nome || ''}">
      <div class="acoes2">
        <div><label for="s-preco">Preço (R$)</label>
          <input id="s-preco" name="preco" type="number" inputmode="decimal" min="0" step="0.01" required value="${s.preco ?? ''}"></div>
        <div><label for="s-un">Unidade</label>
          <input id="s-un" name="unidade" maxlength="20" placeholder="un, m², porta…" value="${s.unidade || ''}"></div>
      </div>
      <div class="acoes2">
        <div><label for="s-min">Faixa mínima (R$)</label>
          <input id="s-min" name="preco_min" type="number" inputmode="decimal" min="0" step="0.01" value="${s.preco_min ?? ''}"></div>
        <div><label for="s-max">Faixa máxima (R$)</label>
          <input id="s-max" name="preco_max" type="number" inputmode="decimal" min="0" step="0.01" value="${s.preco_max ?? ''}"></div>
      </div>
      <label for="s-dica">Dica de manutenção (vai para o relatório)</label>
      <textarea id="s-dica" name="dica_manutencao" maxlength="600">${s.dica_manutencao || ''}</textarea>
      <label for="s-rev">Revisão sugerida (meses, 0 = não sugerir)</label>
      <input id="s-rev" name="revisao_meses" type="number" inputmode="numeric" min="0" step="1" value="${s.revisao_meses ?? 0}">
      <button class="botao principal">💾 SALVAR SERVIÇO</button>
      ${id ? html`<button type="button" class="botao perigo" data-acao="excluir" data-aba="SERVICOS" data-id="${id}" data-volta="#servicos">🗑️ Desativar serviço</button>` : ''}
    </form>`;
}

/* ============================== ORÇAMENTO ============================== */

function novoRasc(at) {
  if (at) return { ...at, itens: itensDe(at), cat: CATEGORIAS[0], voltar: false, buscaCli: '' };
  return {
    id: '', cliente_id: '', itens: [], deslocamento_tipo: 'Cidade', km: 0, valor_deslocamento: num(S.cfg.deslocamento_cidade),
    material_modo: 'Cliente', desconto: 0, observacao: '', status: 'Orçamento', cat: CATEGORIAS[0], voltar: false, buscaCli: ''
  };
}

function valorMateriais(atId) {
  if (!atId) return 0;
  const base = soma(ativos(S.materiais).filter(m => m.atendimento_id === atId && m.comprado_por === 'Pietro' && m.repassar_cliente !== 'não'), 'valor_total');
  return r2(base * (1 + num(S.cfg.margem_material) / 100));
}

// Mesma regra do backend: mão de obra nunca abaixo do mínimo + materiais repassados com margem
function calcular(a) {
  const itens = a.itens || itensDe(a);
  const sub = itens.reduce((t, i) => t + num(i.qtd) * num(i.preco), 0);
  const bruto = Math.max(sub + num(a.valor_deslocamento) - num(a.desconto), 0);
  const minimo = num(S.cfg.valor_minimo);
  const mao = sub > 0 && bruto < minimo ? minimo : bruto;
  const mat = valorMateriais(a.id);
  return { sub: r2(sub), mao: r2(mao), mat, total: r2(mao + mat), minimo: mao > bruto };
}

function tOrcamento(id) {
  if (!rasc || (rasc.id || '') !== (id || '')) {
    const at = id ? atd(id) : null;
    if (id && !at) return naoEncontrado();
    if (at && ['Concluído', 'Cancelado'].includes(at.status)) return html`${topo('Orçamento', '#at/' + id)}<p class="vazio">Este atendimento já foi ${at.status.toLowerCase()} e não pode ser editado.</p>`;
    rasc = novoRasc(at);
  }
  const c = cli(rasc.cliente_id);
  const servs = ativos(S.servicos).filter(s => s.categoria === rasc.cat);
  const v = calcular(rasc);
  depois.push(() => { const a = $('.chips .ativo'); if (a) a.parentElement.scrollLeft = a.offsetLeft - 16; });
  return html`${topo(rasc.id ? 'Editar orçamento nº ' + n4(rasc.numero) : 'Novo orçamento', rasc.id ? '#at/' + rasc.id : '#inicio')}
    ${rasc.id ? '' : html`<a class="link" href="#atendimentos/Orçamento">📋 Ver orçamentos já enviados</a>`}

    <h2>1. Cliente</h2>
    ${c ? html`<div class="cartao escolhido"><div><b>${nomeCompleto(c)}</b><small>${telBR(c.telefone)} · ${c.bairro || c.endereco}</small></div>
        <button class="botao pequeno" data-acao="trocarCliente">Trocar</button></div>`
      : html`<label class="sr" for="busca-orc">Buscar cliente</label>
        <input id="busca-orc" type="search" placeholder="🔎 Buscar cliente por nome ou telefone" data-on="buscaCliOrc" autocomplete="off" value="${rasc.buscaCli}">
        <div id="cli-orc">${listaClientes(rasc.buscaCli, true)}</div>
        <button class="botao" data-acao="cadastrarNoOrc">+ Cadastrar cliente novo</button>`}

    <h2>2. Serviços</h2>
    <div class="chips">${CATEGORIAS.map(cat => html`<button class="chip ${cat === rasc.cat ? 'ativo' : ''}" data-acao="categoria" data-cat="${cat}">${ICONE_CAT[cat]} ${cat}</button>`)}</div>
    <div class="servicos">${servs.map(s => {
      const q = rasc.itens.filter(i => i.servico_id === s.id && !i.desmontagem).reduce((t, i) => t + num(i.qtd), 0);
      return html`<button class="serv ${q ? 'marcado' : ''}" data-acao="addServ" data-id="${s.id}">
        <span>${s.nome}</span><b>${moeda(s.preco)}<small>/${s.unidade || 'un'}</small></b>${q ? html`<i class="qtd">✓ ${qtdBR(q)}</i>` : ''}</button>`;
    })}</div>

    <h2>Escolhidos (${rasc.itens.length})</h2>
    ${rasc.itens.length ? rasc.itens.map(itemEscolhido) : html`<p class="vazio">Toque nos serviços acima para adicionar.</p>`}

    <h2>3. Deslocamento</h2>
    <div class="opcoes">
      <button class="opcao ${rasc.deslocamento_tipo === 'Cidade' ? 'ativo' : ''}" data-acao="desloc" data-tipo="Cidade">🏙️ Em ${S.cfg.cidade || 'Uberaba'}<small>${moeda(S.cfg.deslocamento_cidade)}</small></button>
      <button class="opcao ${rasc.deslocamento_tipo === 'Fora' ? 'ativo' : ''}" data-acao="desloc" data-tipo="Fora">🛣️ Fora da cidade<small>${moeda(S.cfg.valor_km)} por km</small></button>
    </div>
    ${rasc.deslocamento_tipo === 'Fora' ? html`<label for="o-km">Distância em km (ida e volta)</label>
      <input id="o-km" type="number" inputmode="decimal" min="0" step="1" value="${rasc.km || ''}" data-on="km">` : ''}
    <label for="v-desloc">Valor do deslocamento (R$)</label>
    <input id="v-desloc" type="number" inputmode="decimal" min="0" step="0.01" value="${rasc.valor_deslocamento}" data-on="campoOrc" data-campo="valor_deslocamento">

    <h2>4. Material</h2>
    <div class="opcoes">
      <button class="opcao ${rasc.material_modo === 'Cliente' ? 'ativo' : ''}" data-acao="materialModo" data-modo="Cliente">🧾 Cliente compra<small>envio a lista</small></button>
      <button class="opcao ${rasc.material_modo === 'Pietro' ? 'ativo' : ''}" data-acao="materialModo" data-modo="Pietro">🛒 Eu compro<small>repasse + ${qtdBR(S.cfg.margem_material)}%</small></button>
    </div>

    <h2>5. Desconto e observação</h2>
    <label for="o-desc">Desconto (R$)</label>
    <input id="o-desc" type="number" inputmode="decimal" min="0" step="0.01" value="${rasc.desconto || ''}" data-on="campoOrc" data-campo="desconto">
    <label for="o-obs">Observação para o cliente (opcional)</label>
    <textarea id="o-obs" maxlength="500" data-on="campoOrc" data-campo="observacao">${rasc.observacao || ''}</textarea>

    <div class="acoes2">
      <button class="botao" data-acao="salvarOrc">💾 Só salvar</button>
      <button class="botao" data-acao="pdfOrc">📄 Gerar PDF</button>
    </div>

    <footer class="rodape-total">
      <div class="valor"><span>Total</span><b id="orc-total">${moeda(v.total)}</b></div>
      <small id="orc-min">${v.minimo ? `Aplicado o valor mínimo do atendimento (${moeda(S.cfg.valor_minimo)})` : ''}</small>
      <button class="botao principal" data-acao="enviarOrc">💬 SALVAR E ENVIAR NO WHATSAPP</button>
    </footer>`;
}

function itemEscolhido(i, k) {
  return html`<div class="escolhido-item">
    <div class="nome"><b>${i.nome}</b><button class="x" data-acao="tirarItem" data-k="${k}" aria-label="Remover ${i.nome}">✕</button></div>
    <div class="linha">
      <div class="qtd-ctrl">
        <button data-acao="qtd" data-k="${k}" data-d="-1" aria-label="Diminuir quantidade">−</button>
        <input type="number" inputmode="decimal" min="0" step="any" value="${i.qtd}" data-on="itemCampo" data-k="${k}" data-campo="qtd" aria-label="Quantidade de ${i.nome}">
        <button data-acao="qtd" data-k="${k}" data-d="1" aria-label="Aumentar quantidade">+</button>
      </div>
      <span>${i.unidade || 'un'} ×</span>
      <label class="preco">R$ <input type="number" inputmode="decimal" min="0" step="0.01" value="${i.preco}" data-on="itemCampo" data-k="${k}" data-campo="preco" aria-label="Preço de ${i.nome}"></label>
    </div>
    ${i.categoria === 'Montagem' && !i.desmontagem && !rasc.itens.some(x => x.desmontagem && x.origem === k)
      ? html`<button class="link" data-acao="desmontagem" data-k="${k}">+ desmontagem também (${Math.round(MARGEM_DESMONTAGEM * 100)}% do valor)</button>` : ''}
  </div>`;
}

function atualizarTotal() {
  const v = calcular(rasc);
  $('#orc-total').textContent = moeda(v.total);
  $('#orc-min').textContent = v.minimo ? `Aplicado o valor mínimo do atendimento (${moeda(S.cfg.valor_minimo)})` : '';
}

async function salvarOrcamento() {
  if (!rasc.cliente_id) throw new Error('Escolha o cliente (passo 1).');
  if (!rasc.itens.length) throw new Error('Escolha pelo menos um serviço (passo 2).');
  if (rasc.itens.some(i => num(i.qtd) <= 0)) throw new Error('Confira as quantidades dos serviços.');
  const { cat, voltar, buscaCli, itens, ...resto } = rasc;
  const r = await api('salvar_atendimento', { registro: { ...resto, itens_json: itens } }, 'Salvando orçamento…');
  gravarLocal('exec_' + r.resultado.id, null); // a lista de serviços mudou: descarta anotações antigas
  if (exec && exec.id === r.resultado.id) exec = null;
  rasc = null;
  return r.resultado;
}

function mensagemOrcamento(at) {
  const c = cli(at.cliente_id), cfg = S.cfg, v = calcular(at);
  const L = [
    `Olá, *${c.nome}*! Tudo bem? 😊`,
    `Aqui é o Pietro, da *Pietro Resolve*, reparos a domicílio em ${cfg.cidade || 'Uberaba'}.`,
    'Segue o orçamento que combinamos:', '',
    `📋 *Orçamento nº ${n4(at.numero)}* · ${dataBR(at.data_orcamento)}`,
    `📍 ${enderecoCompleto(c)}`, '',
    '🔧 *Serviços*',
    ...itensDe(at).map(i => `• ${fmtQtd(i)} ${i.nome} – ${moeda(num(i.qtd) * num(i.preco))}`)
  ];
  if (num(at.valor_deslocamento)) L.push(`🚗 Deslocamento – ${moeda(at.valor_deslocamento)}`);
  if (num(at.desconto)) L.push(`🏷️ Desconto – ${moeda(at.desconto)}`);
  if (v.minimo) L.push(`ℹ️ Aplicado o valor mínimo do atendimento`);
  if (v.mat) L.push(`🧱 Materiais – ${moeda(v.mat)}`);
  L.push('', `💰 *Total: ${moeda(at.valor_total)}*`,
    `🧱 Material: ${at.material_modo === 'Pietro' ? 'eu compro e repasso com a nota fiscal' : 'por conta do cliente, envio a lista'}`);
  if (at.observacao) L.push(`📝 ${at.observacao}`);
  L.push('', '✅ Preço fechado, combinado antes de começar',
    `✅ Garantia de ${cfg.garantia_dias || 90} dias no serviço`,
    '✅ Local limpo e organizado no final',
    `💳 Pix, dinheiro ou cartão${cfg.chave_pix ? '. Chave Pix: ' + cfg.chave_pix : ''}`,
    `⏳ Orçamento válido por ${cfg.validade_orcamento || 15} dias.`, '',
    'Posso agendar? É só me responder com o melhor dia e horário. 🛠️',
    '*Chamou, o Pietro resolve.*', telBR(cfg.telefone));
  return L.join('\n');
}

function mensagemAgendamento(at) {
  const c = cli(at.cliente_id);
  return `Olá, *${c.nome}*! Serviço confirmado ✅\n📅 ${dataBR(at.data_agendada)} às ${String(at.data_agendada).slice(11, 16)}\n📍 ${enderecoCompleto(c)}\n🔧 ${resumoItens(at)}\n\nQualquer mudança, é só me avisar.\n*Chamou, o Pietro resolve.* 🛠️`;
}

function mensagemCobranca(at) {
  const c = cli(at.cliente_id) || {};
  return `Olá, *${c.nome || ''}*! Tudo bem? 😊\nPassando para lembrar do pagamento do serviço nº ${n4(at.numero)}, feito em ${dataBR(at.data_conclusao)}: *${moeda(at.valor_total)}*.` +
    (S.cfg.chave_pix ? `\n💳 Chave Pix: ${S.cfg.chave_pix}` : '') + `\nMuito obrigado!\nPietro · Pietro Resolve 🛠️`;
}

function dialogoWhats(titulo, texto, c, mensagem) {
  abrirDialogo(html`<h2>${titulo}</h2><p>${texto}</p>
    <a class="botao principal" href="${waLink(c.telefone, mensagem)}" target="_blank" rel="noopener">💬 Abrir WhatsApp de ${c.nome}</a>
    <button class="botao" data-acao="fechar">Fechar</button>`);
}

/* ============================== ATENDIMENTOS ============================== */

function tAtendimentos(status) {
  filtroAts = STATUS.includes(status) ? status : '';
  const lista = S.atendimentos.filter(a => !filtroAts || a.status === filtroAts)
    .sort((a, b) => String(b.criado_em).localeCompare(a.criado_em));
  return html`${topo(filtroAts === 'Orçamento' ? 'Orçamentos' : 'Atendimentos')}
    <div class="chips">${[['', 'Todos'], ...STATUS.map(s => [s, s])].map(([v, t]) =>
      html`<a class="chip ${filtroAts === v ? 'ativo' : ''}" style="text-decoration:none;display:flex;align-items:center" href="#atendimentos/${v}">${t} (${S.atendimentos.filter(a => !v || a.status === v).length})</a>`)}</div>
    ${lista.length ? lista.map(a => cardAt(a)) : html`<p class="vazio">Nada por aqui.</p>`}
    <a class="botao principal fixo" href="#orcamento">📝 Novo orçamento</a>`;
}

const linhaValor = (rot, v) => html`<tr><td>${rot}</td><td class="dir">${moeda(v)}</td></tr>`;

function minimoAplicado(a) {
  const sub = itensDe(a).reduce((t, i) => t + num(i.qtd) * num(i.preco), 0);
  return num(a.valor_total) - num(a.valor_materiais) > Math.max(sub + num(a.valor_deslocamento) - num(a.desconto), 0) + 0.009;
}

function tAtendimento(id) {
  const a = atd(id);
  if (!a) return naoEncontrado();
  const c = cli(a.cliente_id);
  const docs = ativos(S.documentos).filter(d => d.atendimento_id === id);
  return html`${topo('Atendimento nº ' + n4(a.numero), '#atendimentos/' + a.status)}
    <section class="cartao">
      ${selo(a.status)} ${['Orçamento', 'Cancelado'].includes(a.status) ? '' : selo(a.pagamento)}
      <h2><a href="#cliente/${a.cliente_id}">${nomeCompleto(c)}</a></h2>
      <p>📍 ${enderecoCompleto(c)}</p>
      ${contatos(c)}
    </section>
    <section class="cartao"><h3>Serviços</h3>
      <table class="tabela"><tbody>
        ${itensDe(a).map(i => linhaValor(`${fmtQtd(i)} ${i.nome}`, num(i.qtd) * num(i.preco)))}
        ${num(a.valor_deslocamento) ? linhaValor('Deslocamento', a.valor_deslocamento) : ''}
        ${num(a.desconto) ? linhaValor('Desconto', -num(a.desconto)) : ''}
        ${minimoAplicado(a) ? html`<tr><td colspan="2"><small>Aplicado o valor mínimo do atendimento</small></td></tr>` : ''}
        ${num(a.valor_materiais) ? linhaValor('Materiais (repasse)', a.valor_materiais) : ''}
      </tbody><tfoot><tr><th>Total</th><th class="dir">${moeda(a.valor_total)}</th></tr></tfoot></table>
      <p class="pequeno">Orçado em ${dataBR(a.data_orcamento)}${a.data_agendada ? ' · Agendado: ' + dataHoraBR(a.data_agendada) : ''}${a.data_conclusao ? ' · Concluído: ' + dataHoraBR(a.data_conclusao) : ''}${a.pagamento === 'Pago' ? ` · Pago em ${dataBR(a.data_pagamento)} (${a.forma_pagamento})` : ''}</p>
      ${a.observacao ? html`<p class="obs">📝 ${a.observacao}</p>` : ''}
    </section>
    <div class="pilha">${acoesAt(a, c)}</div>
    ${docs.length ? html`<h2>📁 Documentos</h2>${docs.map(itemDoc)}` : ''}
    <button class="botao perigo" style="margin-top:28px" data-acao="excluirAt" data-id="${a.id}">🗑️ Excluir ${a.status === 'Orçamento' ? 'orçamento' : 'atendimento'}</button>`;
}

function acoesAt(a, c) {
  switch (a.status) {
    case 'Orçamento': return html`
      <button class="botao principal" data-acao="aprovar" data-id="${a.id}">✅ Cliente aprovou: agendar</button>
      <button class="botao" data-acao="whatsOrc" data-id="${a.id}">💬 Reenviar orçamento no WhatsApp</button>
      <a class="botao" href="#orcamento/${a.id}">✏️ Editar orçamento</a>
      <button class="botao" data-acao="gerarDoc" data-id="${a.id}" data-tipo="Orçamento">📄 Gerar PDF do orçamento</button>
      <button class="botao perigo" data-acao="cancelarAt" data-id="${a.id}">❌ Cliente não aprovou</button>`;
    case 'Aprovado':
    case 'Em execução': return html`
      <a class="botao principal grande" href="#exec/${a.id}">🔧 ${a.status === 'Aprovado' ? 'Ir para a execução' : 'Continuar execução'}</a>
      <button class="botao" data-acao="aprovar" data-id="${a.id}">📅 Remarcar dia e hora</button>
      <a class="botao" href="#orcamento/${a.id}">✏️ Editar serviços e valores</a>
      <button class="botao perigo" data-acao="cancelarAt" data-id="${a.id}">❌ Cancelar atendimento</button>`;
    case 'Concluído': return html`
      ${a.pagamento !== 'Pago'
        ? html`<button class="botao principal" data-acao="pagar" data-id="${a.id}">💰 Registrar pagamento</button>
          ${c ? html`<a class="botao" href="${waLink(c.telefone, mensagemCobranca(a))}" target="_blank" rel="noopener">💬 Lembrar o cliente do pagamento</a>` : ''}`
        : html`<button class="botao" data-acao="estornar" data-id="${a.id}">↩️ Desfazer pagamento</button>`}
      <a class="botao" href="#exec/${a.id}">📷 Ver fotos e anotações</a>`;
    default: return '';
  }
}

async function salvarAt(a, mudancas, texto = 'Salvando…') {
  const r = await api('salvar_atendimento', { registro: { ...a, itens_json: itensDe(a), checklist_json: checkDe(a), ...mudancas } }, texto);
  return r.resultado;
}

const camposPagamento = () => html`<fieldset class="formas"><legend>Forma de pagamento</legend>
  ${FORMAS.map((f, i) => html`<label class="opcao-radio"><input type="radio" name="forma" value="${f}" ${i === 0 ? 'checked' : ''} required> ${f}</label>`)}</fieldset>
  <label for="p-data">Data do pagamento</label><input id="p-data" type="date" name="data" value="${hoje()}" required>`;

/* ============================== EXECUÇÃO ============================== */

function tExecucao() {
  const lista = S.atendimentos.filter(a => ['Aprovado', 'Em execução'].includes(a.status))
    .sort((a, b) => String(a.data_agendada).localeCompare(b.data_agendada));
  return html`${topo('Execução')}
    <p class="dica">Escolha o serviço para tirar as fotos e registrar o que foi feito.</p>
    ${lista.length ? lista.map(a => cardAt(a, '#exec/')) : html`<p class="vazio">Nenhum serviço aprovado no momento.<br>Quando o cliente aprovar um orçamento, ele aparece aqui.</p>`}
    <a class="link" href="#atendimentos/Concluído">Ver serviços já concluídos</a>`;
}

function tExec(id) {
  const a = atd(id);
  if (!a) return naoEncontrado();
  if (!['Aprovado', 'Em execução', 'Concluído'].includes(a.status)) return html`${topo('Execução', '#at/' + id)}<p class="vazio">Este atendimento ainda não foi aprovado.</p>`;
  if (!exec || exec.id !== id) {
    exec = lerLocal('exec_' + id) || { id, ocorrencias: a.ocorrencias || '', recomendacoes_extra: a.recomendacoes_extra || '', itens: itensDe(a), checklist: checkDe(a) };
  }
  const c = cli(a.cliente_id);
  const fechado = a.status === 'Concluído';
  const fotos = ativos(S.fotos).filter(f => f.atendimento_id === id);
  const pend = fila.filter(f => f.atendimento_id === id);
  const mats = ativos(S.materiais).filter(m => m.atendimento_id === id);
  const ro = fechado ? 'disabled' : '';
  depois.push(carregarMiniaturas);
  return html`${topo('Execução nº ' + n4(a.numero), '#at/' + id)}
    <section class="cartao"><b>${nomeCompleto(c)}</b><p>📍 ${enderecoCompleto(c)}</p>
      ${c && c.observacao ? html`<p class="obs">📝 ${c.observacao}</p>` : ''}${contatos(c)}</section>
    ${a.status === 'Aprovado' ? html`<button class="botao principal grande" data-acao="iniciar" data-id="${id}">▶ INICIAR SERVIÇO</button>` : ''}
    ${a.data_inicio ? html`<p class="dica">⏱️ Iniciado em ${dataHoraBR(a.data_inicio)}${fechado ? ' · Concluído em ' + dataHoraBR(a.data_conclusao) : ''}</p>` : ''}

    <h2>📷 Fotos</h2>
    ${pend.length ? html`<div class="alerta">⏳ ${pend.length} foto(s) guardada(s) no celular, aguardando envio.
      <button class="botao pequeno" data-acao="reenviarFotos">Enviar agora</button></div>` : ''}
    ${['Antes', 'Durante', 'Depois'].map(tipo => blocoFotos(a, tipo, fotos, pend, fechado))}

    <h2>✔ Serviços feitos</h2>
    ${exec.itens.map((i, k) => html`<label class="check"><input type="checkbox" ${i.feito ? 'checked' : ''} ${ro} data-muda="feito" data-k="${k}"> ${fmtQtd(i)} ${i.nome}</label>`)}
    ${fechado ? '' : html`<button class="botao" data-acao="servicoExtra" data-id="${id}">+ Serviço extra</button>`}

    <h2>📝 O que aconteceu</h2>
    ${fechado ? '' : html`<p class="dica">Dica: toque no 🎤 do teclado para falar em vez de digitar.</p>`}
    <label class="sr" for="e-ocorr">O que aconteceu</label>
    <textarea id="e-ocorr" rows="5" maxlength="4000" ${fechado ? 'readonly' : ''} data-on="exec" data-campo="ocorrencias" placeholder="Ex.: encontrei o registro travado, troquei o vedante, testei sem vazamento.">${exec.ocorrencias}</textarea>

    <h2>🧱 Materiais usados</h2>
    ${mats.length ? mats.map(m => html`<div class="item"><div><b>${m.descricao}</b>
        <small>${qtdBR(m.quantidade)} × ${moeda(m.valor_unitario)} · comprado por ${m.comprado_por}${m.comprado_por === 'Pietro' && m.repassar_cliente !== 'não' ? ' · cobrado do cliente' : ''}</small></div>
        <div class="dir"><b>${moeda(m.valor_total)}</b>${fechado ? '' : html`<button class="x" data-acao="tirarMaterial" data-id="${m.id}" aria-label="Remover ${m.descricao}">✕</button>`}</div></div>`)
      : html`<p class="vazio">Nenhum material registrado.</p>`}
    ${fechado ? '' : html`<button class="botao" data-acao="novoMaterial" data-id="${id}">+ Adicionar material</button>`}

    <h2>✅ Checklist de qualidade</h2>
    ${CHECKLIST.map(([k, t]) => html`<label class="check"><input type="checkbox" ${exec.checklist[k] ? 'checked' : ''} ${ro} data-muda="check" data-k="${k}"> ${t}</label>`)}

    <h2>💡 Recomendações extras</h2>
    <p class="dica">As dicas de manutenção de cada serviço já entram sozinhas no relatório. Escreva aqui só o que quiser acrescentar.</p>
    <label class="sr" for="e-rec">Recomendações extras</label>
    <textarea id="e-rec" rows="3" maxlength="2000" ${fechado ? 'readonly' : ''} data-on="exec" data-campo="recomendacoes_extra">${exec.recomendacoes_extra}</textarea>

    ${fechado ? html`<a class="botao principal" href="#at/${id}">📁 Ver documentos e pagamento</a>` : html`
      <button class="botao" data-acao="salvarExec" data-id="${id}">💾 Salvar anotações</button>
      <button class="botao principal grande fixo" data-acao="finalizar" data-id="${id}">🏁 FINALIZAR E GERAR DOCUMENTOS</button>`}`;
}

function blocoFotos(a, tipo, fotos, pend, fechado) {
  const doTipo = fotos.filter(f => f.tipo === tipo);
  const pendTipo = pend.filter(f => f.tipo === tipo);
  return html`<div class="bloco-fotos">
    <div class="bloco-topo"><b>${tipo} (${doTipo.length + pendTipo.length})</b>
      ${fechado ? '' : html`<label class="botao foto">📷 ${tipo.toUpperCase()}
        <input class="sr" type="file" accept="image/*" capture="environment" data-muda="foto" data-tipo="${tipo}" data-id="${a.id}"></label>`}</div>
    ${doTipo.length || pendTipo.length ? html`<div class="fotos">
      ${doTipo.map(f => html`<figure><img data-foto="${f.id}" alt="Foto ${tipo.toLowerCase()}" ${miniaturas[f.id] ? html`src="${miniaturas[f.id]}"` : ''}>
        ${fechado ? '' : html`<button class="x" data-acao="apagarFoto" data-id="${f.id}" aria-label="Apagar foto">✕</button>`}</figure>`)}
      ${pendTipo.map(f => html`<figure class="pendente"><img src="${f.base64}" alt="Foto aguardando envio"><span>⏳ enviando</span></figure>`)}
    </div>` : ''}</div>`;
}

// Busca todas as miniaturas que faltam numa chamada só ao servidor
async function carregarMiniaturas() {
  const imgs = $$('img[data-foto]:not([src])');
  const faltam = [...new Set(imgs.map(i => i.dataset.foto).filter(id => !miniaturas[id]))];
  if (faltam.length) {
    try { Object.assign(miniaturas, await api('fotos_miniaturas', { ids: faltam }, null)); } catch { /* sem internet: mostra o aviso */ }
  }
  imgs.forEach(img => {
    const src = miniaturas[img.dataset.foto];
    if (src) img.src = src;
    else img.alt = 'Foto indisponível agora';
  });
}

// Reduz a foto no próprio celular (lado maior 1280 px, JPEG 70%) para enviar rápido mesmo com sinal fraco
function reduzirFoto(arq) {
  return new Promise((ok, falha) => {
    const img = new Image();
    const url = URL.createObjectURL(arq);
    img.onload = () => {
      const f = Math.min(1, 1280 / Math.max(img.naturalWidth, img.naturalHeight));
      const cv = document.createElement('canvas');
      cv.width = Math.round(img.naturalWidth * f);
      cv.height = Math.round(img.naturalHeight * f);
      cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
      URL.revokeObjectURL(url);
      ok(cv.toDataURL('image/jpeg', 0.7));
    };
    img.onerror = () => { URL.revokeObjectURL(url); falha(new Error('Não consegui abrir essa foto.')); };
    img.src = url;
  });
}

// dev-senior: fila no localStorage (cerca de 15 fotos). Se precisar guardar mais offline, trocar por IndexedDB.
function salvarFila() {
  if (!gravarLocal('fila_fotos', fila)) aviso('Memória do navegador cheia: envie as fotos pendentes antes de tirar outras.', 'erro');
}

async function enviarFila() {
  if (enviandoFila || !fila.length || !sessao) return;
  enviandoFila = true;
  let enviadas = 0;
  try {
    for (const f of [...fila]) {
      const r = await api('foto_enviar', { atendimento_id: f.atendimento_id, tipo: f.tipo, base64: f.base64 }, 'Enviando foto…');
      miniaturas[r.resultado.id] = f.base64;
      fila = fila.filter(x => x.tmp !== f.tmp);
      salvarFila();
      enviadas++;
    }
    if (enviadas) aviso(enviadas > 1 ? `${enviadas} fotos salvas!` : 'Foto salva!');
  } catch (e) {
    aviso('A foto ficou guardada no celular e será enviada depois. ' + e.message, 'erro');
  } finally {
    enviandoFila = false;
    if (sessao && S) render();
  }
}

function guardarExec() { gravarLocal('exec_' + exec.id, exec); }

async function salvarExecucao(a, texto) {
  const at = await salvarAt(a, {
    itens_json: exec.itens, ocorrencias: exec.ocorrencias, recomendacoes_extra: exec.recomendacoes_extra, checklist_json: exec.checklist
  }, texto);
  gravarLocal('exec_' + a.id, null);
  return at;
}

/* ============================== CARTEIRA ============================== */

function nomeMes(ym) {
  const [a, m] = ym.split('-').map(Number);
  const t = new Date(a, m - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  return t.charAt(0).toUpperCase() + t.slice(1);
}

const itemLanc = l => html`<a class="item" href="${l.automatico === 'sim' && l.atendimento_id ? '#at/' + l.atendimento_id : '#lancamento/' + l.id}">
  <div><b>${l.descricao || l.categoria}</b><small>${dataBR(l.data)} · ${l.categoria}${l.forma_pagamento ? ' · ' + l.forma_pagamento : ''}${l.automatico === 'sim' ? ' · automático' : ''}</small></div>
  <b class="${l.tipo === 'Entrada' ? 'txt-verde' : 'txt-vermelho'}" style="white-space:nowrap">${l.tipo === 'Entrada' ? '+' : '−'} ${moeda(l.valor)}</b></a>`;

function tCarteira() {
  const doMes = ativos(S.carteira).filter(l => String(l.data).startsWith(mesCarteira));
  const ent = soma(doMes.filter(l => l.tipo === 'Entrada'));
  const sai = soma(doMes.filter(l => l.tipo === 'Saída'));
  const lista = doMes.filter(l => !filtroCarteira || l.tipo === filtroCarteira).sort((a, b) => String(b.data + b.criado_em).localeCompare(a.data + a.criado_em));
  const receber = S.atendimentos.filter(a => a.status === 'Concluído' && a.pagamento !== 'Pago');
  return html`${topo('Carteira')}
    <div class="mes"><button data-acao="mes" data-d="-1" aria-label="Mês anterior">‹</button><b>${nomeMes(mesCarteira)}</b>
      <button data-acao="mes" data-d="1" aria-label="Próximo mês">›</button></div>
    <div class="cards3">
      <div class="card verde"><small>Entradas</small><b>${moeda(ent)}</b></div>
      <div class="card vermelho"><small>Saídas</small><b>${moeda(sai)}</b></div>
      <div class="card"><small>Saldo</small><b class="${ent - sai < 0 ? 'txt-vermelho' : ''}">${moeda(ent - sai)}</b></div>
    </div>
    <div class="acoes2"><a class="botao verde" href="#lancamento/Entrada">+ Entrada</a><a class="botao vermelho" href="#lancamento/Saída">− Saída</a></div>
    ${receber.length ? html`<h2>⏳ A receber: ${moeda(soma(receber, 'valor_total'))}</h2>
      ${receber.map(a => {
        const c = cli(a.cliente_id) || {};
        return html`<div class="item"><div><b>nº ${n4(a.numero)} · ${nomeCompleto(c)}</b><small>Concluído em ${dataBR(a.data_conclusao)}</small>
          <a class="link" href="${waLink(c.telefone, mensagemCobranca(a))}" target="_blank" rel="noopener">💬 Lembrar cliente</a></div>
          <div class="dir"><b>${moeda(a.valor_total)}</b><button class="botao pequeno" data-acao="pagar" data-id="${a.id}">Recebi</button></div></div>`;
      })}` : ''}
    <h2>Lançamentos do mês</h2>
    <div class="chips">${[['', 'Todos'], ['Entrada', 'Entradas'], ['Saída', 'Saídas']].map(([v, t]) =>
      html`<button class="chip ${filtroCarteira === v ? 'ativo' : ''}" data-acao="filtroCarteira" data-v="${v}">${t}</button>`)}</div>
    ${lista.length ? lista.map(itemLanc) : html`<p class="vazio">Nenhum lançamento neste mês.</p>`}`;
}

function tLancamento(id) {
  const novo = id === 'Entrada' || id === 'Saída';
  const l = novo ? { tipo: id, data: hoje(), categoria: id === 'Entrada' ? 'Serviço' : 'Material' } : S.carteira.find(x => x.id === id);
  if (!l) return naoEncontrado();
  if (l.automatico === 'sim') return html`${topo('Lançamento', '#carteira')}<p class="vazio">Lançamento automático: altere pelo atendimento.</p>`;
  const entrada = l.tipo === 'Entrada';
  return html`${topo((novo ? 'Nova ' : 'Editar ') + (entrada ? 'entrada' : 'saída'), '#carteira')}
    <form data-form="lancamento">
      <input type="hidden" name="id" value="${l.id || ''}"><input type="hidden" name="tipo" value="${l.tipo}">
      <label for="l-valor">Valor (R$) <span class="obrig">*</span></label>
      <input id="l-valor" name="valor" type="number" inputmode="decimal" min="0.01" step="0.01" required value="${l.valor ?? ''}">
      <label for="l-data">Data <span class="obrig">*</span></label>
      <input id="l-data" name="data" type="date" required value="${String(l.data).slice(0, 10)}">
      <label for="l-cat">Categoria</label>
      <select id="l-cat" name="categoria">${opcoesSelect(entrada ? CAT_ENTRADA : CAT_SAIDA, l.categoria)}</select>
      <label for="l-desc">Descrição</label>
      <input id="l-desc" name="descricao" maxlength="200" placeholder="${entrada ? 'Ex.: serviço avulso' : 'Ex.: gasolina, broca 8 mm'}" value="${l.descricao || ''}">
      <label for="l-forma">Forma de pagamento</label>
      <select id="l-forma" name="forma_pagamento">${opcoesSelect(FORMAS, l.forma_pagamento, '—')}</select>
      ${entrada ? html`<label for="l-cli">Cliente (opcional)</label>
        <select id="l-cli" name="cliente_id">${opcoesSelect(filtrarClientes('').map(c => [c.id, nomeCompleto(c)]), l.cliente_id, '—')}</select>` : ''}
      <button class="botao principal">💾 SALVAR</button>
      ${novo ? '' : html`<button type="button" class="botao perigo" data-acao="excluir" data-aba="CARTEIRA" data-id="${l.id}" data-volta="#carteira">🗑️ Excluir lançamento</button>`}
    </form>`;
}

/* ============================== DASHBOARD ============================== */

const fimMes = d => hoje(new Date(d.getFullYear(), d.getMonth() + 1, 0));
const dataRef = a => String(a.data_conclusao || a.data_agendada || a.data_orcamento || '').slice(0, 10);

function periodo() {
  const h = new Date();
  if (dash.periodo === 'semana') {
    const ini = new Date(h);
    ini.setDate(h.getDate() - ((h.getDay() + 6) % 7)); // segunda-feira
    const fim = new Date(ini);
    fim.setDate(ini.getDate() + 6);
    return [hoje(ini), hoje(fim)];
  }
  if (dash.periodo === 'mes') return [hoje().slice(0, 8) + '01', fimMes(h)];
  if (dash.periodo === 'passado') { const d = new Date(h.getFullYear(), h.getMonth() - 1, 1); return [hoje(d), fimMes(d)]; }
  return [dash.de || hoje().slice(0, 8) + '01', dash.ate || hoje()];
}

function dadosDash() {
  const [de, ate] = periodo();
  const dentro = s => s && s >= de && s <= ate;
  const temServ = a => (!dash.servico && !dash.categoria) || itensDe(a).some(i => (!dash.servico || i.servico_id === dash.servico) && (!dash.categoria || i.categoria === dash.categoria));
  const atsFiltro = S.atendimentos.filter(a => (!dash.cliente || a.cliente_id === dash.cliente) && (!dash.status || a.status === dash.status) &&
    (!dash.forma || a.forma_pagamento === dash.forma) && temServ(a));
  const ats = atsFiltro.filter(a => dentro(dataRef(a)));
  const comFiltro = dash.cliente || dash.servico || dash.categoria || dash.status || dash.forma;
  const ids = new Set(atsFiltro.map(a => a.id));
  const lanc = ativos(S.carteira).filter(l => dentro(String(l.data).slice(0, 10)) && (!comFiltro || ids.has(l.atendimento_id)));
  const orcados = atsFiltro.filter(a => dentro(String(a.data_orcamento).slice(0, 10)));
  return { de, ate, ats, lanc, orcados };
}

function agruparPorTempo(lanc, de, ate) {
  const ini = new Date(de + 'T12:00');
  const dias = Math.round((new Date(ate + 'T12:00') - ini) / 864e5) + 1;
  const passo = dias <= 7 ? 'dia' : dias <= 62 ? 'semana' : 'mes';
  const chave = s => {
    if (passo === 'dia') return s;
    if (passo === 'mes') return s.slice(0, 7);
    const semanas = Math.floor((new Date(s + 'T12:00') - ini) / (7 * 864e5));
    const d = new Date(ini); d.setDate(ini.getDate() + semanas * 7);
    return hoje(d);
  };
  const grupos = new Map();
  for (let d = new Date(ini); hoje(d) <= ate; d.setDate(d.getDate() + 1)) {
    const k = chave(hoje(d));
    if (!grupos.has(k)) grupos.set(k, { e: 0, s: 0 });
  }
  lanc.forEach(l => { const g = grupos.get(chave(String(l.data).slice(0, 10))); if (g) g[l.tipo === 'Entrada' ? 'e' : 's'] += num(l.valor); });
  const rotulo = k => passo === 'mes' ? nomeMes(k).slice(0, 3) + '/' + k.slice(2, 4) : (passo === 'semana' ? 'sem ' : '') + dataBR(k).slice(0, 5);
  return [...grupos].map(([k, g]) => ({ rotulo: rotulo(k), ...g }));
}

function graficoColunas(grupos) {
  const max = Math.max(1, ...grupos.map(g => Math.max(g.e, g.s)));
  return html`<div class="colunas" role="img" aria-label="Entradas e saídas por período">${grupos.map(g => html`<div class="coluna" title="${g.rotulo}: entradas ${moeda(g.e)}, saídas ${moeda(g.s)}">
      <div class="barras"><div class="b e" style="height:${(g.e / max) * 100}%"></div><div class="b s" style="height:${(g.s / max) * 100}%"></div></div>
      <span>${g.rotulo}</span></div>`)}</div>
    <div class="legenda-g"><span><i style="background:var(--verde)"></i>Entradas</span><span><i style="background:var(--vermelho)"></i>Saídas</span></div>`;
}

function barrasH(lista, vazio) {
  if (!lista.length) return html`<p class="vazio">${vazio}</p>`;
  const max = Math.max(1, ...lista.map(x => x.valor));
  return lista.map(x => html`<div class="hbar"><div class="rot"><span>${x.rotulo}</span><b>${moeda(x.valor)}${x.extra ? ' · ' + x.extra : ''}</b></div>
    <div class="trilho"><div style="width:${(x.valor / max) * 100}%"></div></div></div>`);
}

function top5(mapa) {
  return [...mapa].map(([rotulo, v]) => ({ rotulo, ...v })).sort((a, b) => b.valor - a.valor).slice(0, 5);
}

function tDashboard() {
  const { de, ate, ats, lanc, orcados } = dadosDash();
  const concluidos = ats.filter(a => a.status === 'Concluído');
  const faturado = soma(lanc.filter(l => l.tipo === 'Entrada'));
  const gastos = soma(lanc.filter(l => l.tipo === 'Saída'));
  const aReceber = soma(concluidos.filter(a => a.pagamento !== 'Pago'), 'valor_total');
  const aprovados = orcados.filter(a => !['Orçamento', 'Cancelado'].includes(a.status)).length;
  const ticket = concluidos.length ? soma(concluidos, 'valor_total') / concluidos.length : 0;

  const porServ = new Map(), porCli = new Map(), porCat = new Map();
  concluidos.forEach(a => {
    itensDe(a).forEach(i => {
      const g = porServ.get(i.nome) || { valor: 0, q: 0 };
      g.valor += num(i.qtd) * num(i.preco); g.q += num(i.qtd);
      porServ.set(i.nome, g);
    });
    const n = nomeCompleto(cli(a.cliente_id));
    porCli.set(n, { valor: (porCli.get(n)?.valor || 0) + num(a.valor_total) });
  });
  lanc.filter(l => l.tipo === 'Saída').forEach(l => porCat.set(l.categoria || 'Outros', { valor: (porCat.get(l.categoria || 'Outros')?.valor || 0) + num(l.valor) }));
  const nFiltros = ['cliente', 'servico', 'categoria', 'status', 'forma'].filter(k => dash[k]).length;

  return html`${topo('Dashboard')}
    <div class="chips">${[['semana', 'Esta semana'], ['mes', 'Este mês'], ['passado', 'Mês passado'], ['pers', 'Escolher datas']].map(([v, t]) =>
      html`<button class="chip ${dash.periodo === v ? 'ativo' : ''}" data-acao="periodo" data-v="${v}">${t}</button>`)}</div>
    ${dash.periodo === 'pers' ? html`<div class="datas">
      <div><label for="d-de">De</label><input id="d-de" type="date" value="${de}" data-muda="dashCampo" data-campo="de"></div>
      <div><label for="d-ate">Até</label><input id="d-ate" type="date" value="${ate}" data-muda="dashCampo" data-campo="ate"></div></div>`
      : html`<p class="dica">${dataBR(de)} a ${dataBR(ate)}</p>`}

    <details class="filtros" ${nFiltros ? 'open' : ''}><summary>🔎 Filtros${nFiltros ? ` (${nFiltros} ativo${nFiltros > 1 ? 's' : ''})` : ''}</summary>
      <label for="f-cli">Cliente</label>
      <select id="f-cli" data-muda="dashCampo" data-campo="cliente">${opcoesSelect(filtrarClientes('').map(c => [c.id, nomeCompleto(c)]), dash.cliente, 'Todos')}</select>
      <label for="f-cat">Categoria</label>
      <select id="f-cat" data-muda="dashCampo" data-campo="categoria">${opcoesSelect(CATEGORIAS, dash.categoria, 'Todas')}</select>
      <label for="f-serv">Serviço</label>
      <select id="f-serv" data-muda="dashCampo" data-campo="servico">${opcoesSelect(ativos(S.servicos).filter(s => !dash.categoria || s.categoria === dash.categoria).map(s => [s.id, s.nome]), dash.servico, 'Todos')}</select>
      <label for="f-st">Situação</label>
      <select id="f-st" data-muda="dashCampo" data-campo="status">${opcoesSelect(STATUS, dash.status, 'Todas')}</select>
      <label for="f-forma">Forma de pagamento</label>
      <select id="f-forma" data-muda="dashCampo" data-campo="forma">${opcoesSelect(FORMAS, dash.forma, 'Todas')}</select>
      ${nFiltros ? html`<button class="botao" data-acao="limparDash">Limpar filtros</button>` : ''}
    </details>

    <div class="cards">
      <div class="card verde"><small>Faturado (recebido)</small><b>${moeda(faturado)}</b></div>
      <div class="card vermelho"><small>Gastos</small><b>${moeda(gastos)}</b></div>
      <div class="card"><small>Lucro</small><b class="${faturado - gastos < 0 ? 'txt-vermelho' : ''}">${moeda(faturado - gastos)}</b></div>
      <div class="card amarelo"><small>A receber</small><b>${moeda(aReceber)}</b></div>
      <div class="card"><small>Serviços concluídos</small><b>${concluidos.length}</b></div>
      <div class="card"><small>Ticket médio</small><b>${moeda(ticket)}</b></div>
      <div class="card"><small>Orçamentos enviados</small><b>${orcados.length}</b></div>
      <div class="card"><small>Aprovação</small><b>${orcados.length ? Math.round((aprovados / orcados.length) * 100) : 0}% (${aprovados})</b></div>
    </div>

    <section class="grafico"><h3>Entradas × saídas</h3>${graficoColunas(agruparPorTempo(lanc, de, ate))}</section>
    <section class="grafico"><h3>Top 5 serviços</h3>${barrasH(top5(porServ).map(x => ({ ...x, extra: qtdBR(x.q) + 'x' })), 'Nenhum serviço concluído no período.')}</section>
    <section class="grafico"><h3>Top 5 clientes</h3>${barrasH(top5(porCli), 'Nenhum cliente no período.')}</section>
    <section class="grafico"><h3>Gastos por categoria</h3>${barrasH(top5(porCat), 'Nenhum gasto no período.')}</section>

    <h2>Atendimentos do período (${ats.length})</h2>
    ${ats.length ? ats.sort((a, b) => dataRef(b).localeCompare(dataRef(a))).map(a => cardAt(a)) : html`<p class="vazio">Nenhum atendimento.</p>`}
    ${ats.length ? html`<button class="botao" data-acao="csv">⬇ Exportar planilha (CSV)</button>` : ''}`;
}

/* ============================== ARQUIVO ============================== */

const ICONE_DOC = { 'Orçamento': '📝', 'Nota de Serviço': '🧾', 'Relatório de Qualidade': '📋' };
const itemDoc = d => html`<div class="item"><div><b>${ICONE_DOC[d.tipo] || '📄'} ${d.tipo}</b>
  <small>${d.numero} · ${d.cliente_nome} · ${dataBR(d.data)} · ${moeda(d.valor)}</small></div>
  <button class="botao pequeno" data-acao="doc" data-id="${d.id}">Abrir</button></div>`;

function filtrarDocs() {
  const f = filtroArq;
  const n = f.numero.trim().toUpperCase();
  return ativos(S.documentos)
    .filter(d => (!f.de || String(d.data) >= f.de) && (!f.ate || String(d.data) <= f.ate) && (!f.cliente || d.cliente_id === f.cliente) &&
      (!f.tipo || d.tipo === f.tipo) && (!n || String(d.numero).toUpperCase().includes(n)))
    .sort((a, b) => String(b.criado_em).localeCompare(a.criado_em));
}

function listaDocs() {
  const docs = filtrarDocs();
  return docs.length ? docs.map(itemDoc) : html`<p class="vazio">Nenhum documento encontrado.</p>`;
}

function tArquivo() {
  const f = filtroArq;
  return html`${topo('Arquivo de documentos')}
    <div class="chips">${[['', 'Todos'], ['Nota de Serviço', '🧾 Notas'], ['Relatório de Qualidade', '📋 Relatórios'], ['Orçamento', '📝 Orçamentos']].map(([v, t]) =>
      html`<button class="chip ${f.tipo === v ? 'ativo' : ''}" data-acao="tipoDoc" data-v="${v}">${t}</button>`)}</div>
    <details class="filtros" ${f.de || f.ate || f.cliente || f.numero ? 'open' : ''}><summary>🔎 Procurar por data, cliente ou número</summary>
      <div class="datas">
        <div><label for="a-de">De</label><input id="a-de" type="date" value="${f.de}" data-muda="arqCampo" data-campo="de"></div>
        <div><label for="a-ate">Até</label><input id="a-ate" type="date" value="${f.ate}" data-muda="arqCampo" data-campo="ate"></div>
      </div>
      <label for="a-cli">Cliente</label>
      <select id="a-cli" data-muda="arqCampo" data-campo="cliente">${opcoesSelect(filtrarClientes('').map(c => [c.id, nomeCompleto(c)]), f.cliente, 'Todos')}</select>
      <label for="a-num">Número</label>
      <input id="a-num" type="search" inputmode="numeric" placeholder="Ex.: 12" value="${f.numero}" data-on="arqNumero">
      <button class="botao" data-acao="limparArq">Limpar</button>
    </details>
    <div id="lista-docs">${listaDocs()}</div>`;
}

async function obterPdf(id) {
  if (!pdfs[id]) {
    const r = await api('documento_baixar', { id }, 'Abrindo documento…');
    const bytes = Uint8Array.from(atob(r.base64), ch => ch.charCodeAt(0));
    pdfs[id] = new File([bytes], r.nome, { type: 'application/pdf' });
  }
  return pdfs[id];
}

/* ============================== AJUSTES ============================== */

function tAjustes() {
  const c = S.cfg;
  const campo = (nome, rot, extra = '') => html`<label for="cfg-${nome}">${rot}</label>
    <input id="cfg-${nome}" name="${nome}" type="number" inputmode="decimal" min="0" step="0.01" required value="${c[nome] ?? ''}" ${extra}>`;
  return html`${topo('Ajustes')}
    <form data-form="config">
      <h2>Cobrança</h2>
      ${campo('deslocamento_cidade', `Deslocamento em ${c.cidade || 'Uberaba'} (R$)`)}
      ${campo('valor_km', 'Deslocamento fora da cidade (R$ por km)')}
      ${campo('valor_minimo', 'Valor mínimo do atendimento (R$)')}
      ${campo('taxa_visita', 'Taxa de visita / orçamento presencial (R$)')}
      ${campo('margem_material', 'Margem sobre material comprado por mim (%)')}
      ${campo('garantia_dias', 'Garantia do serviço (dias)')}
      ${campo('validade_orcamento', 'Validade do orçamento (dias)')}
      <label for="cfg-pix">Chave Pix</label>
      <input id="cfg-pix" name="chave_pix" maxlength="120" value="${c.chave_pix || ''}" placeholder="CPF, telefone, e-mail ou chave aleatória">
      <button class="botao principal">💾 SALVAR AJUSTES</button>
    </form>
    <form data-form="senha">
      <h2>Trocar senha</h2>
      <label for="t-atual">Senha atual</label>
      <input id="t-atual" name="atual" type="password" required autocomplete="current-password">
      <label for="t-nova">Nova senha (mínimo 6 caracteres)</label>
      <input id="t-nova" name="nova" type="password" minlength="6" maxlength="100" required autocomplete="new-password">
      <label for="t-conf">Repita a nova senha</label>
      <input id="t-conf" name="confirma" type="password" minlength="6" maxlength="100" required autocomplete="new-password">
      <button class="botao">🔑 Trocar senha</button>
    </form>
    <h2>Aplicativo</h2>
    <button class="botao" data-acao="atualizar">🔄 Atualizar dados</button>
    <button class="botao perigo" data-acao="sairApp">🚪 Sair</button>
    <p class="dica">Seus dados ficam na planilha e nas pastas do Google Drive. As fotos e os PDFs não ficam públicos.</p>`;
}

/* ============================== AÇÕES (cliques) ============================== */

const ACOES = {
  fechar: () => fecharDialogo(),
  recarregar: () => { senhaCriada = null; return iniciar(); },
  atualizar: async () => { await api('carregar', {}, 'Atualizando…'); render(); aviso('Dados atualizados!'); },
  verSenha: (d, b) => { const i = b.previousElementSibling; i.type = i.type === 'password' ? 'text' : 'password'; },
  sairApp: async () => {
    if (!confirm('Sair do aplicativo?')) return;
    try { await api('logout', {}, 'Saindo…'); } catch { /* sai mesmo sem internet */ }
    sair();
  },

  excluir: async d => {
    if (!confirm('Tem certeza que deseja excluir?')) return;
    await api('excluir', { aba: d.aba, id: d.id }, 'Excluindo…');
    aviso('Excluído.');
    ir(d.volta);
  },

  // Orçamento
  novoOrcamento: d => { rasc = novoRasc(); rasc.cliente_id = d.cliente; ir('#orcamento'); },
  categoria: d => { rasc.cat = d.cat; render(); },
  addServ: d => {
    const s = S.servicos.find(x => x.id === d.id);
    const ja = rasc.itens.find(i => i.servico_id === s.id && !i.desmontagem);
    if (ja) ja.qtd = r2(num(ja.qtd) + 1);
    else rasc.itens.push({ servico_id: s.id, nome: s.nome, categoria: s.categoria, unidade: s.unidade || 'un', qtd: 1, preco: num(s.preco) });
    render();
    aviso(`${s.nome} adicionado`);
  },
  qtd: d => {
    const i = rasc.itens[d.k];
    i.qtd = r2(num(i.qtd) + Number(d.d));
    if (i.qtd <= 0) rasc.itens.splice(d.k, 1);
    render();
  },
  tirarItem: d => { rasc.itens.splice(d.k, 1); render(); },
  desmontagem: d => {
    const i = rasc.itens[d.k];
    rasc.itens.push({ ...i, nome: 'Desmontagem – ' + i.nome, preco: r2(num(i.preco) * MARGEM_DESMONTAGEM), desmontagem: true, origem: Number(d.k) });
    render();
  },
  desloc: d => {
    rasc.deslocamento_tipo = d.tipo;
    rasc.valor_deslocamento = d.tipo === 'Cidade' ? num(S.cfg.deslocamento_cidade) : r2(num(rasc.km) * num(S.cfg.valor_km));
    render();
  },
  materialModo: d => { rasc.material_modo = d.modo; render(); },
  trocarCliente: () => { rasc.cliente_id = ''; render(); },
  escolherCliente: d => { rasc.cliente_id = d.id; rasc.buscaCli = ''; render(); },
  cadastrarNoOrc: () => { rasc.voltar = true; ir('#cliente-form'); },
  enviarOrc: async () => {
    const at = await salvarOrcamento();
    ir('#at/' + at.id);
    dialogoWhats(`Orçamento nº ${n4(at.numero)} salvo ✅`, 'Toque abaixo para abrir o WhatsApp com a mensagem pronta.', cli(at.cliente_id), mensagemOrcamento(at));
  },
  salvarOrc: async () => { const at = await salvarOrcamento(); aviso('Orçamento salvo!'); ir('#at/' + at.id); },
  pdfOrc: async () => { const at = await salvarOrcamento(); ir('#at/' + at.id); await ACOES.gerarDoc({ id: at.id, tipo: 'Orçamento' }); },

  // Atendimento
  whatsOrc: d => { const a = atd(d.id); dialogoWhats('Reenviar orçamento', 'A mensagem já vai pronta.', cli(a.cliente_id), mensagemOrcamento(a)); },
  aprovar: d => {
    const a = atd(d.id);
    abrirDialogo(html`<form data-form="agendar"><h2>📅 Dia e hora do serviço</h2>
      <input type="hidden" name="id" value="${a.id}">
      <label for="ag-quando">Quando?</label>
      <input id="ag-quando" type="datetime-local" name="quando" required value="${String(a.data_agendada || '').slice(0, 16)}">
      <button class="botao principal">Confirmar agendamento</button>
      <button type="button" class="botao" data-acao="fechar">Voltar</button></form>`);
  },
  excluirAt: async d => {
    const a = atd(d.id);
    const extras = [];
    if (ativos(S.fotos).some(f => f.atendimento_id === a.id)) extras.push('as fotos');
    if (ativos(S.documentos).some(x => x.atendimento_id === a.id)) extras.push('os PDFs');
    if (ativos(S.carteira).some(l => l.atendimento_id === a.id)) extras.push('os lançamentos da carteira');
    const lista = extras.length > 1 ? extras.slice(0, -1).join(', ') + ' e ' + extras.at(-1) : extras[0];
    const aviso2 = extras.length ? `\n\nIsso também apaga ${lista} deste serviço.` : '';
    if (!confirm(`Excluir o nº ${n4(a.numero)} de ${nomeCompleto(cli(a.cliente_id))}?${aviso2}\n\nNão dá para desfazer pelo app.`)) return;
    await api('excluir_atendimento', { id: a.id }, 'Excluindo…');
    gravarLocal('exec_' + a.id, null);
    fila = fila.filter(f => f.atendimento_id !== a.id);
    salvarFila();
    if (exec && exec.id === a.id) exec = null;
    if (rasc && rasc.id === a.id) rasc = null;
    aviso('Excluído.');
    ir('#atendimentos');
  },
  cancelarAt: async d => {
    if (!confirm('Cancelar este atendimento?')) return;
    await salvarAt(atd(d.id), { status: 'Cancelado' });
    aviso('Atendimento cancelado.');
    render();
  },
  pagar: d => {
    const a = atd(d.id);
    abrirDialogo(html`<form data-form="pagar"><h2>💰 Registrar pagamento</h2>
      <input type="hidden" name="id" value="${a.id}">
      <p>nº ${n4(a.numero)} · ${nomeCompleto(cli(a.cliente_id))}<br>Valor: <b>${moeda(a.valor_total)}</b></p>
      ${camposPagamento()}
      <button class="botao principal">✅ Confirmar recebimento</button>
      <button type="button" class="botao" data-acao="fechar">Voltar</button></form>`);
  },
  estornar: async d => {
    if (!confirm('Desfazer o pagamento? A entrada sai da carteira.')) return;
    await api('estornar_pagamento', { id: d.id }, 'Desfazendo…');
    aviso('Pagamento desfeito.');
    render();
  },
  gerarDoc: async d => {
    const r = await api('documento_gerar', { atendimento_id: d.id, tipo: d.tipo }, 'Gerando PDF…');
    render();
    await ACOES.doc({ id: r.resultado.id });
  },

  // Documentos
  doc: async d => {
    const doc = S.documentos.find(x => x.id === d.id);
    const f = await obterPdf(d.id);
    const url = URL.createObjectURL(f);
    abrirDialogo(html`<h2>${ICONE_DOC[doc.tipo] || '📄'} ${doc.tipo}</h2>
      <p>${doc.numero} · ${doc.cliente_nome} · ${dataBR(doc.data)}</p>
      <button class="botao principal" data-acao="compartilhar" data-id="${doc.id}">💬 Enviar ao cliente</button>
      <a class="botao" href="${url}" target="_blank" rel="noopener">👁 Abrir</a>
      <a class="botao" href="${url}" download="${f.name}">⬇ Baixar</a>
      <button class="botao" data-acao="fechar">Fechar</button>`);
  },
  compartilhar: async d => {
    const doc = S.documentos.find(x => x.id === d.id);
    const f = pdfs[d.id];
    const c = cli(doc.cliente_id) || {};
    const artigo = doc.tipo.startsWith('Nota') ? 'a' : 'o';
    const texto = `Olá, ${c.nome || ''}! Segue ${artigo} ${doc.tipo.toLowerCase()} ${doc.numero}. Qualquer dúvida, estou à disposição. Chamou, o Pietro resolve! 🛠️`;
    if (navigator.canShare && navigator.canShare({ files: [f] })) {
      try { await navigator.share({ files: [f], text: texto }); } catch (e) { if (e.name !== 'AbortError') throw e; }
      return;
    }
    // Navegador sem compartilhamento de arquivo: baixa o PDF e abre o WhatsApp para anexar
    baixarArquivo(f, f.name);
    window.open(waLink(c.telefone, texto + ' (PDF em anexo)'), '_blank', 'noopener');
    aviso('PDF baixado. No WhatsApp, toque no 📎 para anexar.');
  },
  tipoDoc: d => { filtroArq.tipo = d.v; render(); },
  limparArq: () => { Object.assign(filtroArq, { de: '', ate: '', cliente: '', tipo: '', numero: '' }); render(); },

  // Execução
  iniciar: async d => { await salvarAt(atd(d.id), { status: 'Em execução' }, 'Iniciando…'); aviso('Bom trabalho, Pietro! 💪'); render(); },
  reenviarFotos: () => enviarFila(),
  apagarFoto: async d => {
    if (!confirm('Apagar esta foto?')) return;
    await api('foto_apagar', { id: d.id }, 'Apagando…');
    delete miniaturas[d.id];
    render();
  },
  salvarExec: async d => { await salvarExecucao(atd(d.id)); aviso('Anotações salvas!'); render(); },
  servicoExtra: d => {
    abrirDialogo(html`<form data-form="extra"><h2>+ Serviço extra</h2>
      <input type="hidden" name="id" value="${d.id}">
      <label for="x-serv">Serviço</label>
      <select id="x-serv" name="servico" required><option value="">Escolha…</option>
        ${CATEGORIAS.map(cat => html`<optgroup label="${cat}">${ativos(S.servicos).filter(s => s.categoria === cat).map(s =>
          html`<option value="${s.id}">${s.nome} (${moeda(s.preco)})</option>`)}</optgroup>`)}</select>
      <label for="x-qtd">Quantidade</label>
      <input id="x-qtd" name="qtd" type="number" inputmode="decimal" min="0.01" step="any" value="1" required>
      <button class="botao principal">Adicionar</button>
      <button type="button" class="botao" data-acao="fechar">Voltar</button></form>`);
  },
  novoMaterial: d => {
    abrirDialogo(html`<form data-form="material"><h2>🧱 Material usado</h2>
      <input type="hidden" name="atendimento_id" value="${d.id}">
      <label for="m-desc">O que foi usado? <span class="obrig">*</span></label>
      <input id="m-desc" name="descricao" required maxlength="150" placeholder="Ex.: resistência 220 V">
      <div class="acoes2">
        <div><label for="m-q">Quantidade</label><input id="m-q" name="quantidade" type="number" inputmode="decimal" min="0.01" step="any" value="1" required></div>
        <div><label for="m-v">Valor unitário (R$)</label><input id="m-v" name="valor_unitario" type="number" inputmode="decimal" min="0" step="0.01" required></div>
      </div>
      <fieldset class="formas"><legend>Quem comprou?</legend>
        <label class="opcao-radio"><input type="radio" name="comprado_por" value="Pietro" checked> Eu (Pietro)</label>
        <label class="opcao-radio"><input type="radio" name="comprado_por" value="Cliente"> O cliente</label></fieldset>
      <label class="check"><input type="checkbox" name="repassar" value="sim" checked> Cobrar do cliente (+${qtdBR(S.cfg.margem_material)}%), se fui eu que comprei</label>
      <button class="botao principal">Salvar material</button>
      <button type="button" class="botao" data-acao="fechar">Voltar</button></form>`);
  },
  tirarMaterial: async d => {
    if (!confirm('Remover este material?')) return;
    await api('excluir_material', { id: d.id }, 'Removendo…');
    render();
  },
  finalizar: async d => {
    const a = atd(d.id);
    const fotos = ativos(S.fotos).filter(f => f.atendimento_id === d.id);
    const faltam = [];
    if (fila.some(f => f.atendimento_id === d.id)) faltam.push('enviar as fotos pendentes');
    if (!fotos.some(f => f.tipo === 'Antes')) faltam.push('tirar foto ANTES');
    if (!fotos.some(f => f.tipo === 'Depois')) faltam.push('tirar foto DEPOIS');
    CHECKLIST.forEach(([k, t]) => { if (!exec.checklist[k]) faltam.push(`marcar "${t}"`); });
    if (faltam.length) throw new Error('Antes de finalizar, falta: ' + faltam.join(', ') + '.');
    abrirDialogo(html`<form data-form="finalizar"><h2>🏁 Finalizar serviço</h2>
      <input type="hidden" name="id" value="${a.id}">
      <p>Total do serviço: <b>${moeda(a.valor_total)}</b></p>
      <p class="grande">Já recebeu o pagamento?</p>
      ${camposPagamento()}
      <button class="botao principal" name="pago" value="sim">✅ Sim, recebi</button>
      <button class="botao" name="pago" value="nao" formnovalidate>⏳ Ainda não (fica a receber)</button>
      <button type="button" class="botao" data-acao="fechar">Voltar</button></form>`);
  },

  // Carteira e dashboard
  mes: d => {
    const [a, m] = mesCarteira.split('-').map(Number);
    const dt = new Date(a, m - 1 + Number(d.d), 1);
    mesCarteira = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
    render();
  },
  filtroCarteira: d => { filtroCarteira = d.v; render(); },
  periodo: d => { dash.periodo = d.v; render(); },
  limparDash: () => { Object.assign(dash, { cliente: '', servico: '', categoria: '', status: '', forma: '' }); render(); },
  csv: () => {
    const { de, ate, ats } = dadosDash();
    const seguro = v => { const s = String(v ?? ''); return /^[=+\-@]/.test(s) ? "'" + s : s; }; // evita fórmula ao abrir no Excel
    const linhas = [['Número', 'Data', 'Cliente', 'Telefone', 'Serviços', 'Situação', 'Pagamento', 'Forma', 'Total']]
      .concat(ats.map(a => {
        const c = cli(a.cliente_id);
        return [n4(a.numero), dataBR(dataRef(a)), nomeCompleto(c), telBR(c && c.telefone), resumoItens(a), a.status, a.pagamento, a.forma_pagamento || '', num(a.valor_total).toFixed(2).replace('.', ',')];
      }));
    const csv = '﻿' + linhas.map(l => l.map(v => '"' + seguro(v).replace(/"/g, '""') + '"').join(';')).join('\r\n');
    baixarArquivo(new Blob([csv], { type: 'text/csv;charset=utf-8' }), `atendimentos_${de}_a_${ate}.csv`);
  }
};

/* ============================== FORMULÁRIOS ============================== */

const FORMS = {
  login: async d => entrar(await api('login', { login: d.login, senha: d.senha }, 'Entrando…')),
  criarSenha: async d => {
    if (d.senha !== d.confirma) throw new Error('As senhas não são iguais. Digite de novo.');
    const r = await api('criar_senha', { login: d.login, senha: d.senha }, 'Criando sua senha…');
    senhaCriada = true;
    aviso('Senha criada! Guarde bem. 🔑');
    await entrar(r);
  },
  cliente: async d => {
    const tel = d.telefone.replace(/\D/g, '');
    const dup = ativos(S.clientes).find(c => String(c.telefone) === tel && c.id !== d.id);
    if (dup && !confirm(`Já existe ${nomeCompleto(dup)} com este telefone. Salvar mesmo assim?`)) return;
    const r = await api('salvar', { aba: 'CLIENTES', registro: { ...d, telefone: tel } }, 'Salvando cliente…');
    aviso('Cliente salvo!');
    if (rasc && rasc.voltar) {
      rasc.cliente_id = r.resultado.id;
      rasc.voltar = false;
      ir('#orcamento' + (rasc.id ? '/' + rasc.id : ''));
    } else ir('#cliente/' + r.resultado.id);
  },
  servico: async d => {
    await api('salvar', { aba: 'SERVICOS', registro: d }, 'Salvando serviço…');
    aviso('Serviço salvo!');
    ir('#servicos');
  },
  lancamento: async d => {
    await api('salvar', { aba: 'CARTEIRA', registro: d }, 'Salvando…');
    aviso('Lançamento salvo!');
    mesCarteira = d.data.slice(0, 7);
    ir('#carteira');
  },
  agendar: async d => {
    const a = atd(d.id);
    const conflito = S.atendimentos.find(x => x.id !== a.id && ['Aprovado', 'Em execução'].includes(x.status) && String(x.data_agendada).slice(0, 13) === d.quando.slice(0, 13));
    if (conflito && !confirm(`Atenção: ${nomeCompleto(cli(conflito.cliente_id))} já está marcado nesse horário. Agendar mesmo assim?`)) return;
    const at = await salvarAt(a, { status: a.status === 'Orçamento' ? 'Aprovado' : a.status, data_agendada: d.quando }, 'Agendando…');
    render();
    dialogoWhats('Agendado ✅', 'Quer confirmar com o cliente pelo WhatsApp?', cli(at.cliente_id), mensagemAgendamento(at));
  },
  pagar: async d => {
    await api('registrar_pagamento', { id: d.id, forma: d.forma, data: d.data }, 'Registrando pagamento…');
    fecharDialogo();
    aviso('Pagamento registrado! 💰');
    render();
  },
  extra: async d => {
    const s = S.servicos.find(x => x.id === d.servico);
    if (!s) throw new Error('Escolha o serviço.');
    exec.itens.push({ servico_id: s.id, nome: s.nome, categoria: s.categoria, unidade: s.unidade || 'un', qtd: num(d.qtd), preco: num(s.preco), feito: true });
    await salvarExecucao(atd(d.id), 'Adicionando serviço…');
    fecharDialogo();
    aviso('Serviço extra adicionado. O total foi atualizado.');
    render();
  },
  material: async d => {
    const { repassar, ...m } = d;
    await api('salvar_material', { registro: { ...m, repassar_cliente: repassar ? 'sim' : 'não' } }, 'Salvando material…');
    fecharDialogo();
    aviso('Material salvo!');
    render();
  },
  finalizar: async d => {
    await salvarExecucao(atd(d.id), 'Salvando anotações…');
    const r = await api('finalizar', { id: d.id, pagamento: d.pago === 'sim' ? { forma: d.forma, data: d.data } : null },
      'Gerando nota de serviço e relatório… pode levar até 1 minuto');
    exec = null;
    ir('#at/' + d.id);
    abrirDialogo(html`<h2>🎉 Serviço finalizado!</h2>
      <p>A nota de serviço e o relatório de qualidade foram gerados e guardados no Arquivo.</p>
      <button class="botao principal" data-acao="doc" data-id="${r.resultado.ns.id}">🧾 Nota de serviço</button>
      <button class="botao principal" data-acao="doc" data-id="${r.resultado.rq.id}">📋 Relatório de qualidade</button>
      <button class="botao" data-acao="fechar">Fechar</button>`);
  },
  config: async d => {
    await api('config_salvar', d, 'Salvando ajustes…');
    aviso('Ajustes salvos!');
    render();
  },
  senha: async (d, f) => {
    if (d.nova !== d.confirma) throw new Error('As senhas novas não são iguais.');
    await api('trocar_senha', { atual: d.atual, nova: d.nova }, 'Trocando senha…');
    f.reset();
    aviso('Senha trocada! 🔑');
  }
};

/* ============================== DIGITAÇÃO E MUDANÇAS ============================== */

const AO_DIGITAR = {
  buscaClientes: el => pintar('#lista-clientes', listaClientes(el.value)),
  buscaCliOrc: el => { rasc.buscaCli = el.value; pintar('#cli-orc', listaClientes(el.value, true)); },
  mascaraTel: el => {
    const d = el.value.replace(/\D/g, '').slice(0, 11);
    el.value = d.length > 6 ? `(${d.slice(0, 2)}) ${d.slice(2, d.length - 4)}-${d.slice(-4)}` : d.length > 2 ? `(${d.slice(0, 2)}) ${d.slice(2)}` : d;
  },
  itemCampo: el => { rasc.itens[el.dataset.k][el.dataset.campo] = num(el.value); atualizarTotal(); },
  km: el => {
    rasc.km = num(el.value);
    rasc.valor_deslocamento = r2(rasc.km * num(S.cfg.valor_km));
    $('#v-desloc').value = rasc.valor_deslocamento;
    atualizarTotal();
  },
  campoOrc: el => { rasc[el.dataset.campo] = el.dataset.campo === 'observacao' ? el.value : num(el.value); atualizarTotal(); },
  exec: el => { exec[el.dataset.campo] = el.value; guardarExec(); },
  arqNumero: el => { filtroArq.numero = el.value; pintar('#lista-docs', listaDocs()); }
};

const AO_MUDAR = {
  foto: async el => {
    const arquivos = [...el.files];
    el.value = '';
    for (const arq of arquivos) {
      carregando(true, 'Preparando foto…');
      const base64 = await reduzirFoto(arq);
      fila.push({ tmp: Date.now() + '-' + Math.random(), atendimento_id: el.dataset.id, tipo: el.dataset.tipo, base64 });
      salvarFila();
    }
    carregando(false);
    await enviarFila();
  },
  feito: el => { exec.itens[el.dataset.k].feito = el.checked; guardarExec(); },
  check: el => { exec.checklist[el.dataset.k] = el.checked; guardarExec(); },
  dashCampo: el => {
    if (el.dataset.campo === 'categoria') dash.servico = '';
    if (['de', 'ate'].includes(el.dataset.campo)) { const [de, ate] = periodo(); dash.de = de; dash.ate = ate; }
    dash[el.dataset.campo] = el.value;
    render();
  },
  arqCampo: el => { filtroArq[el.dataset.campo] = el.value; render(); }
};

/* ============================== INÍCIO DO APP ============================== */

async function iniciar() {
  if (!sessao || S) render();
  else pintar('#app', html`<p class="vazio">Carregando…</p>`);
  if (!sessao) return;
  try {
    await api('carregar', {}, S ? null : 'Buscando seus dados…');
  } catch (e) {
    if (!sessao) return;
    aviso(S ? 'Sem conexão: mostrando os últimos dados salvos.' : e.message, 'erro');
  }
  render();
  enviarFila();
}

iniciar();
