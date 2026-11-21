/* Pietro Resolve — versão planilha
 * Três abas (Serviços, Clientes, Caixa) com linhas para ir preenchendo.
 * Usa a mesma API (Apps Script) e os mesmos dados do app completo (completo.html).
 * Cada célula salva sozinha quando o Pietro sai dela. */

const API_URL = 'https://script.google.com/macros/s/AKfycbzc9fE0aCkbdBLGSA5WTsVU0X1jOLCS-O8GcgOcZvhd3qVU77UroS5CU5B-wPfKMH5x/exec';
const FORMAS = ['Pix', 'Dinheiro', 'Cartão de débito', 'Cartão de crédito', 'Transferência'];
const SITUACOES = ['Orçamento', 'Aprovado', 'Em execução', 'Concluído', 'Cancelado'];

/* ---------- utilidades ---------- */
const $ = s => document.querySelector(s);
function lerLocal(k) { try { return JSON.parse(localStorage.getItem('pietro_' + k)); } catch { return null; } }
function gravarLocal(k, v) { try { localStorage.setItem('pietro_' + k, JSON.stringify(v)); } catch { /* sem espaço: segue sem guardar */ } }
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const r2 = n => Math.round(n * 100) / 100;
function num(v) {
  let t = String(v ?? '').replace(/[R$\s]/g, '');
  if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.');
  const n = Number(t);
  return Number.isFinite(n) ? n : 0;
}
const fmtMoeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const moeda = v => fmtMoeda.format(num(v));
const valorCampo = v => v === '' || v == null ? '' : num(v).toFixed(2).replace('.', ',');
const n4 = v => String(num(v)).padStart(4, '0');
const hoje = (d = new Date()) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const dataBR = s => s ? String(s).slice(0, 10).split('-').reverse().join('/') : '';
const soDig = t => String(t ?? '').replace(/\D/g, '');
const telBR = t => { const d = soDig(t); return d.length >= 10 ? `(${d.slice(0, 2)}) ${d.slice(2, -4)}-${d.slice(-4)}` : d; };
const chave = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
const nomeCompleto = c => c ? `${c.nome || ''} ${c.sobrenome || ''}`.trim() : '';
const itensDe = a => { try { const l = JSON.parse(a.itens_json || '[]'); return Array.isArray(l) ? l : []; } catch { return []; } };
const waLink = (tel, texto) => `https://wa.me/55${soDig(tel)}?text=${encodeURIComponent(texto)}`;

/* ---------- estado ---------- */
let S = lerLocal('dados');
let sessao = lerLocal('sessao');
let aba = lerLocal('aba_planilha') || 'servicos';
let mes = hoje().slice(0, 7);
let mostrar = 'todos';
const rasc = {};      // o que foi digitado e ainda não voltou salvo: rasc[linha][coluna]
const erros = {};     // linha → motivo de não ter salvo (erro do servidor)
const faltas = {};    // linha → o que falta preencher para poder salvar
const salvando = new Set();
const idDe = {};      // linha nova → id criado
const linhaDe = {};   // id criado → linha nova (mantém a mesma linha na tela)
const novas = { servicos: [], clientes: [], caixa: [] };
let seq = 1;
const vazia = { servicos: 'n' + seq++, clientes: 'n' + seq++, caixa: 'n' + seq++ };

const ativos = l => (l || []).filter(x => x.ativo !== 'não');
const cliPorId = id => (S?.clientes || []).find(c => c.id === id);
const cliPorNome = nome => ativos(S?.clientes).find(c => chave(nomeCompleto(c)) === chave(nome));
const idLinha = k => idDe[k] || (k.startsWith('n') ? null : k);
const k = id => linhaDe[id] || id;

/* ---------- servidor ---------- */
async function api(action, data = {}) {
  const ctrl = new AbortController();
  const tempo = setTimeout(() => ctrl.abort(), 90000);
  try {
    const r = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, sessao, data }),
      signal: ctrl.signal
    });
    const j = await r.json();
    if (j.sessaoExpirada) { sair(); throw new Error(j.error); }
    if (!j.ok) throw new Error(j.error || 'Algo deu errado.');
    if (j.data && j.data.dados) { S = j.data.dados; gravarLocal('dados', S); }
    return j.data;
  } catch (e) {
    if (e.name === 'AbortError') throw new Error('Demorou demais. Confira a internet.');
    if (e instanceof TypeError) throw new Error('Sem internet. Tente de novo.');
    throw e;
  } finally { clearTimeout(tempo); }
}

let tempoAviso;
function aviso(msg, tipo = 'ok') {
  const el = $('#aviso');
  el.textContent = msg;
  el.className = tipo;
  el.hidden = false;
  clearTimeout(tempoAviso);
  tempoAviso = setTimeout(() => { el.hidden = true; }, tipo === 'erro' ? 6000 : 2500);
}
function estado() {
  const e = $('#estado');
  if (!sessao) return (e.textContent = '');
  e.textContent = salvando.size ? '⏳ Salvando…' : Object.keys(erros).length ? '⚠️ Não salvou' : Object.keys(faltas).length ? '✏️ Falta preencher' : '✓ Tudo salvo';
}

/* ---------- valores de cada linha (digitado ou o que está salvo) ---------- */
const qtdTxt = q => String(r2(num(q))).replace('.', ',');
// Itens do atendimento como aparecem na planilha: "2x Quadro" + valor da linha (quantidade × preço)
function itensVis(key) {
  if (rasc[key]?.itens) return rasc[key].itens;
  const a = (S.atendimentos || []).find(x => x.id === idLinha(key));
  const l = a ? itensDe(a).map(i => ({ ...i, nome: (num(i.qtd) !== 1 ? qtdTxt(i.qtd) + 'x ' : '') + (i.nome || ''), valor: valorCampo(r2(num(i.qtd) * num(i.preco))) })) : [];
  return l.length ? l : [{ nome: '', valor: '' }];
}
const itemVazio = i => !String(i.nome || '').trim() && !num(i.valor);
const listaMatDe = a => { try { const l = JSON.parse(a.lista_materiais_json || '[]'); return Array.isArray(l) ? l : []; } catch { return []; } };
// Materiais como aparecem na planilha: loja, material, "70 pç" e o valor da linha (quantidade × preço)
function matsVis(key) {
  if (rasc[key]?.mats) return rasc[key].mats;
  const a = (S.atendimentos || []).find(x => x.id === idLinha(key));
  return a ? listaMatDe(a).map(m => ({ ...m, loja: m.loja || '', qtd: qtdTxt(m.qtd) + (m.unidade && m.unidade !== 'un' ? ' ' + m.unidade : ''), valor: valorCampo(r2(num(m.qtd) * num(m.preco))) })) : [];
}
const matVazio = m => !String(m.nome || '').trim() && !num(m.valor) && !String(m.loja || '').trim();
const r4 = n => Math.round(n * 1e4) / 1e4;
// "70 pç" → 70 e "pç"; vazio → 1 un
function lerQtd(t) {
  const m = String(t || '').trim().match(/^(\d+(?:[.,]\d+)?)\s*(.*)$/);
  if (m) return { qtd: num(m[1]) || 1, unidade: m[2].trim().slice(0, 20) || 'un' };
  return { qtd: 1, unidade: String(t || '').trim().slice(0, 20) || 'un' };
}
function vServico(key) {
  const a = (S.atendimentos || []).find(x => x.id === idLinha(key));
  const d = rasc[key] || {};
  const cliSalvo = a ? cliPorId(a.cliente_id) : null;
  const cliente = d.cliente ?? nomeCompleto(cliSalvo);
  const achado = d.cliente !== undefined ? cliPorNome(d.cliente) : cliSalvo;
  const itens = itensVis(key), mats = matsVis(key);
  const soma = r2(itens.reduce((t, i) => t + num(i.valor), 0));
  const somaMat = r2(mats.reduce((t, m) => t + num(m.valor), 0));
  // Total: o que o servidor calculou; enquanto há mudança sem salvar, uma prévia (mínimo do atendimento + materiais sem taxa)
  const mudou = d.itens || d.mats;
  const minimo = num(S.cfg?.valor_minimo);
  const mao = soma > 0 && soma < minimo ? minimo : soma;
  const matTotal = d.mats ? somaMat : num(a?.valor_materiais);
  return {
    a, achado, itens, mats, soma, somaMat,
    total: a && !mudou ? num(a.valor_total) : r2(mao + num(a?.valor_deslocamento) - num(a?.desconto) + matTotal),
    matTotal: a && !mudou ? num(a.valor_materiais) : matTotal,
    endServ: d.endServ ?? (a?.endereco_servico || ''),
    validade: d.validade ?? (a && num(a.validade_dias) ? String(num(a.validade_dias)) : ''),
    dia: d.dia ?? (a ? String(a.data_agendada || a.data_orcamento || '').slice(0, 10) : ''),
    cliente,
    tel: d.tel ?? (achado ? telBR(achado.telefone) : ''),
    situacao: d.situacao ?? (a ? a.status : 'Orçamento'),
    pago: d.pago ?? (a && a.pagamento === 'Pago' ? a.forma_pagamento || 'Pix' : '')
  };
}
function vCliente(key) {
  const c = (S.clientes || []).find(x => x.id === idLinha(key));
  const d = rasc[key] || {};
  return {
    c,
    nome: d.nome ?? nomeCompleto(c),
    tel: d.tel ?? (c ? telBR(c.telefone) : ''),
    endereco: d.endereco ?? (c?.endereco || ''),
    bairro: d.bairro ?? (c?.bairro || ''),
    obs: d.obs ?? (c?.observacao || '')
  };
}
const diaPadraoCaixa = () => (mes === hoje().slice(0, 7) ? hoje() : mes + '-01');
function vCaixa(key) {
  const l = (S.carteira || []).find(x => x.id === idLinha(key));
  const d = rasc[key] || {};
  return {
    l, auto: l?.automatico === 'sim',
    dia: d.dia ?? (l ? String(l.data).slice(0, 10) : ''),
    tipo: d.tipo ?? (l ? l.tipo : 'Saída'),
    desc: d.desc ?? (l?.descricao || ''),
    valor: d.valor ?? (l ? valorCampo(l.valor) : ''),
    forma: d.forma ?? (l?.forma_pagamento || '')
  };
}

/* ---------- desenho das linhas ---------- */
const inp = (key, c, v, extra = '') => `<input data-k="${key}" data-c="${c}" value="${esc(v)}" ${extra}>`;
const sel = (key, c, v, opcoes, extra = '') => `<select data-k="${key}" data-c="${c}" ${extra}>${opcoes.map(o => {
  const [val, rot] = Array.isArray(o) ? o : [o, o];
  return `<option value="${esc(val)}"${val === v ? ' selected' : ''}>${esc(rot)}</option>`;
}).join('')}</select>`;
const so = (cond, attr) => (cond ? attr : '');

function marca(key, rotulo) {
  if (salvando.has(key)) return `<span class="m-salva" title="Salvando">⏳</span>`;
  if (erros[key]) return `<button class="m-erro" data-acao="erro" data-k="${key}" title="${esc(erros[key])}">⚠️</button>`;
  if (faltas[key]) return `<button class="m-erro" data-acao="falta" data-k="${key}" title="${esc(faltas[key])}">✏️</button>`;
  return rotulo;
}

const COLS = 11; // colunas da aba Serviços
const celNome = (key, i, it) => `<td class="larga">${inp(key, 'nome:' + i, it.nome, `placeholder="${i ? 'Outro serviço' : 'O que vai fazer'}"`)}</td>`;
const celValor = (key, i, it, extra = '') => `<td class="num">${inp(key, 'valor:' + i, it.valor, 'inputmode="decimal" placeholder="0,00"')}${extra}</td>`;

// Cada serviço ocupa a linha principal e, se tiver mais de um item, uma linha por item e outra com o total
function linhaServico(tk) {
  const [key, parte] = tk.split('~');
  const v = vServico(key), a = v.a, nova = !a;
  const cobra = a && !rasc[key]?.itens && num(a.valor_total) !== v.soma ? `<small>cobra ${moeda(a.valor_total)}</small>` : '';
  if (parte === 't') {
    const partes = v.mats.length ? ` <span class="partes">mão de obra ${moeda(v.total - v.matTotal)} + materiais ${moeda(v.matTotal)}</span>` : '';
    return `<tr data-k="${tk}" class="item total"><th class="fixa"></th>
      <td colspan="3" class="rot-total"><b>Total ${moeda(v.total)}</b>${partes}</td><td colspan="${COLS - 4}"></td></tr>`;
  }
  if (parte === 'mh') {
    return `<tr data-k="${tk}" class="mat-cab"><th class="fixa">🧱</th><td>Loja</td><td>Material</td><td class="dir">Valor (R$)</td><td>Qtd</td><td colspan="${COLS - 5}"></td></tr>`;
  }
  if (parte && parte[0] === 'm') {
    const j = Number(parte.slice(1)), m = v.mats[j];
    return `<tr data-k="${tk}" class="item mat"><th class="fixa"><button class="b-fixa" data-acao="tirarMat" data-k="${key}" data-i="${j}" title="Tirar este material" aria-label="Tirar este material">✖</button></th>
      <td>${inp(key, 'mloja:' + j, m.loja, 'list="lista-lojas" autocomplete="off" placeholder="Loja"')}</td>
      <td class="larga">${inp(key, 'mnome:' + j, m.nome, 'placeholder="Material"')}</td>
      <td class="num">${inp(key, 'mvalor:' + j, m.valor, 'inputmode="decimal" placeholder="0,00"')}</td>
      <td>${inp(key, 'mqtd:' + j, m.qtd, 'placeholder="Ex.: 70 pç"')}</td><td colspan="${COLS - 5}"></td></tr>`;
  }
  if (parte) {
    const i = Number(parte);
    return `<tr data-k="${tk}" class="item"><th class="fixa"><button class="b-fixa" data-acao="tirarItem" data-k="${key}" data-i="${i}" title="Tirar este serviço" aria-label="Tirar este serviço">✖</button></th><td class="seta">↳</td>${celNome(key, i, v.itens[i])}${celValor(key, i, v.itens[i])}
      <td colspan="${COLS - 4}"></td></tr>`;
  }
  const fechado = a && a.status === 'Concluído';
  const situacoes = SITUACOES.filter(s => s !== 'Em execução' || v.situacao === 'Em execução');
  const eVazia = key === vazia.servicos;
  return `<tr data-k="${tk}" class="${eVazia ? 'vazia' : ''} ${v.itens.length > 1 ? 'com-itens' : ''} s-${chave(v.situacao).replace(/\s+/g, '-')}">
    <th class="fixa"><span>${marca(key, a ? n4(a.numero) : (eVazia ? '+' : '…'))}</span>${eVazia ? '' : `<button class="b-fixa" data-acao="menuMais" data-k="${key}" title="Mais serviço, material, PDF" aria-label="Mais opções desta linha">＋ mais</button>`}</th>
    <td>${inp(key, 'cliente', v.cliente, 'list="lista-clientes" autocomplete="off" placeholder="Nome do cliente"')}</td>
    ${celNome(key, 0, v.itens[0])}
    ${celValor(key, 0, v.itens[0], v.itens.length === 1 && !v.mats.length ? cobra : '')}
    <td>${sel(key, 'situacao', v.situacao, situacoes, so(fechado, 'disabled'))}</td>
    <td>${sel(key, 'pago', v.pago, [['', 'A receber'], ...FORMAS.map(f => [f, 'Pago · ' + f])], so(nova, 'disabled title="Salve a linha primeiro"'))}</td>
    <td>${inp(key, 'tel', v.tel, 'inputmode="tel" placeholder="(34) 9…"')}</td>
    <td>${inp(key, 'dia', v.dia, 'type="date"')}</td>
    <td class="larga">${inp(key, 'endServ', v.endServ, `placeholder="${esc(v.achado ? 'Igual ao do cliente' : 'Onde é o serviço')}"`)}</td>
    <td class="num">${inp(key, 'validade', v.validade, `inputmode="numeric" placeholder="${num(S.cfg?.validade_orcamento) || 15}"`)}</td>
    <td class="acoes">${a ? `<button data-acao="pdf" data-k="${key}" title="PDF do orçamento">📄</button><button data-acao="whats" data-k="${key}" title="Mandar no WhatsApp">💬</button><button data-acao="apagar" data-k="${key}" title="Apagar">🗑</button>` : ''}</td>
  </tr>`;
}

function linhaCliente(key) {
  const v = vCliente(key), c = v.c;
  return `<tr data-k="${key}" class="${!c && key === vazia.clientes ? 'vazia' : ''}">
    <th class="fixa">${marca(key, key === vazia.clientes ? '+' : '')}</th>
    <td class="larga">${inp(key, 'nome', v.nome, 'placeholder="Nome e sobrenome"')}</td>
    <td>${inp(key, 'tel', v.tel, 'inputmode="tel" placeholder="(34) 9…"')}</td>
    <td class="larga">${inp(key, 'endereco', v.endereco, 'placeholder="Rua e número"')}</td>
    <td>${inp(key, 'bairro', v.bairro)}</td>
    <td class="larga">${inp(key, 'obs', v.obs)}</td>
    <td class="acoes">${c ? `<a href="https://wa.me/55${soDig(c.telefone)}" target="_blank" rel="noopener" title="WhatsApp">💬</a><a href="tel:+55${soDig(c.telefone)}" title="Ligar">📞</a><button data-acao="apagar" data-k="${key}" title="Apagar">🗑</button>` : ''}</td>
  </tr>`;
}

function linhaCaixa(key) {
  const v = vCaixa(key), l = v.l, ro = v.auto ? ' readonly' : '';
  return `<tr data-k="${key}" class="${!l && key === vazia.caixa ? 'vazia' : ''} ${v.auto ? 'auto' : ''} ${v.tipo === 'Entrada' ? 'entrada' : 'saida'}">
    <th class="fixa">${marca(key, key === vazia.caixa ? '+' : '')}</th>
    <td class="larga">${inp(key, 'desc', v.desc, `placeholder="Ex.: gasolina, material"${ro}`)}</td>
    <td class="num">${inp(key, 'valor', v.valor, `inputmode="decimal" placeholder="0,00"${ro}`)}</td>
    <td>${sel(key, 'tipo', v.tipo, ['Entrada', 'Saída'], so(v.auto, 'disabled'))}</td>
    <td>${inp(key, 'dia', v.dia, `type="date"${ro}${so(!l, ` placeholder="${diaPadraoCaixa()}"`)}`)}</td>
    <td>${sel(key, 'forma', v.forma, [['', '—'], ...FORMAS], so(v.auto, 'disabled'))}</td>
    <td class="acoes">${v.auto ? '<small title="Vem do serviço pago">auto</small>' : l ? `<button data-acao="apagar" data-k="${key}" title="Apagar">🗑</button>` : ''}</td>
  </tr>`;
}

/* ---------- quais linhas aparecem em cada aba ---------- */
function chavesServicos() {
  const filtro = {
    todos: () => true,
    orcamentos: a => a.status === 'Orçamento',
    afazer: a => ['Aprovado', 'Em execução'].includes(a.status),
    receber: a => a.pagamento !== 'Pago' && !['Orçamento', 'Cancelado'].includes(a.status),
    concluidos: a => a.status === 'Concluído'
  }[mostrar] || (() => true);
  const l = (S.atendimentos || []).filter(a => filtro(a) || rasc[k(a.id)]).sort((x, y) => num(x.numero) - num(y.numero)).map(a => k(a.id));
  const expandir = key => {
    const n = itensVis(key).length, m = matsVis(key).length;
    return [key, ...Array.from({ length: n - 1 }, (_, i) => `${key}~${i + 1}`),
      ...(m ? [`${key}~mh`, ...Array.from({ length: m }, (_, j) => `${key}~m${j}`)] : []),
      ...(n > 1 || m ? [`${key}~t`] : [])];
  };
  return [...l, ...novas.servicos.filter(n => !idDe[n]), vazia.servicos].flatMap(expandir);
}
function chavesClientes() {
  const l = ativos(S.clientes).sort((x, y) => (linhaDe[x.id] ? 1 : 0) - (linhaDe[y.id] ? 1 : 0) || chave(nomeCompleto(x)).localeCompare(chave(nomeCompleto(y)))).map(c => k(c.id));
  return [...l, ...novas.clientes.filter(n => !idDe[n]), vazia.clientes];
}
function chavesCaixa() {
  const l = (S.carteira || []).filter(c => String(c.data).slice(0, 7) === mes || rasc[k(c.id)])
    .sort((x, y) => String(x.data).localeCompare(String(y.data)) || String(x.criado_em).localeCompare(String(y.criado_em))).map(c => k(c.id));
  return [...l, ...novas.caixa.filter(n => !idDe[n]), vazia.caixa];
}

const ABAS = {
  servicos: {
    chaves: chavesServicos, linha: linhaServico,
    cab: ['Nº', 'Cliente', 'Serviço', 'Valor (R$)', 'Situação', 'Pagamento', 'Telefone', 'Dia', 'Endereço do serviço', 'Validade (dias)', ''],
    topo: () => `<label class="filtro">Mostrar ${sel('', 'mostrar', mostrar, [['todos', 'Todos'], ['orcamentos', 'Orçamentos'], ['afazer', 'A fazer'], ['receber', 'A receber'], ['concluidos', 'Concluídos']], 'data-filtro="mostrar"')}</label>`,
    rodape: () => {
      const l = S.atendimentos || [];
      const t = f => l.filter(f).reduce((s, a) => s + num(a.valor_total), 0);
      return `<div class="tot"><span>Orçamentos em aberto</span><b>${moeda(t(a => a.status === 'Orçamento'))}</b></div>
        <div class="tot"><span>A receber</span><b class="laranja">${moeda(t(a => a.pagamento !== 'Pago' && !['Orçamento', 'Cancelado'].includes(a.status)))}</b></div>
        <div class="tot"><span>Recebido (total)</span><b class="verde">${moeda(t(a => a.pagamento === 'Pago'))}</b></div>`;
    }
  },
  clientes: {
    chaves: chavesClientes, linha: linhaCliente,
    cab: ['', 'Nome', 'Telefone', 'Endereço', 'Bairro', 'Observação', ''],
    topo: () => `<p class="dica">${ativos(S.clientes).length} clientes · nome e telefone são obrigatórios</p>`,
    rodape: () => ''
  },
  caixa: {
    chaves: chavesCaixa, linha: linhaCaixa,
    cab: ['', 'Descrição', 'Valor (R$)', 'Tipo', 'Dia', 'Forma', ''],
    topo: () => `<div class="mes"><button data-acao="mes" data-d="-1" aria-label="Mês anterior">◀</button>
      <b>${new Date(mes + '-15T12:00').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).replace(/^./, c => c.toUpperCase())}</b>
      <button data-acao="mes" data-d="1" aria-label="Próximo mês">▶</button></div>`,
    rodape: () => {
      const l = (S.carteira || []).filter(c => String(c.data).slice(0, 7) === mes);
      const ent = l.filter(c => c.tipo === 'Entrada').reduce((s, c) => s + num(c.valor), 0);
      const sai = l.filter(c => c.tipo === 'Saída').reduce((s, c) => s + num(c.valor), 0);
      return `<div class="tot"><span>Entradas</span><b class="verde">${moeda(ent)}</b></div>
        <div class="tot"><span>Saídas</span><b class="vermelho">${moeda(sai)}</b></div>
        <div class="tot"><span>Sobrou no mês</span><b class="${ent - sai < 0 ? 'vermelho' : ''}">${moeda(ent - sai)}</b></div>`;
    }
  }
};

const lojasUsadas = () => [...new Set((S.atendimentos || []).flatMap(a => listaMatDe(a).map(m => String(m.loja || '').trim())).filter(Boolean))].sort();

/* ---------- pintar a tela ---------- */
function telaLogin() {
  $('#abas').hidden = true;
  $('#b-menu').hidden = true;
  $('#folha').innerHTML = `<form class="login" id="f-login">
    <img src="assets/mascote.jpg" alt="" class="login-foto">
    <h1>Entrar</h1>
    <label>Usuário<input name="login" value="Pietro Fasano" autocomplete="username" required></label>
    <label>Senha<input name="senha" type="password" minlength="6" required autocomplete="current-password"></label>
    <button class="principal">ENTRAR</button>
  </form>`;
  estado();
}

function render() {
  if (!sessao) return telaLogin();
  $('#abas').hidden = false;
  $('#b-menu').hidden = false;
  document.querySelectorAll('#abas [data-aba]').forEach(b => b.classList.toggle('ativa', b.dataset.aba === aba));
  if (!S) { $('#folha').innerHTML = '<p class="dica centro">Buscando seus dados…</p>'; return; }
  const A = ABAS[aba];
  $('#folha').innerHTML = `<div class="topo-folha">${A.topo()}</div>
    <div class="rolagem"><table class="grade g-${aba}">
      <thead><tr>${A.cab.map((c, i) => `<th${i === 0 ? ' class="fixa"' : ''}>${c}</th>`).join('')}</tr></thead>
      <tbody>${A.chaves().map(A.linha).join('')}</tbody>
    </table></div>
    <div class="rodape">${A.rodape()}</div>
    <datalist id="lista-clientes">${ativos(S.clientes).map(c => `<option value="${esc(nomeCompleto(c))}">`).join('')}</datalist>
    <datalist id="lista-lojas">${lojasUsadas().map(l => `<option value="${esc(l)}">`).join('')}</datalist>`;
  estado();
}

// Deixa o elemento velho igual ao novo mexendo só no que mudou (os botões continuam os mesmos e o toque não se perde)
function igualar(velho, novo) {
  if (velho.innerHTML === novo.innerHTML && velho.className === novo.className) return;
  [...velho.attributes].forEach(at => { if (!novo.hasAttribute(at.name)) velho.removeAttribute(at.name); });
  [...novo.attributes].forEach(at => { if (velho.getAttribute(at.name) !== at.value) velho.setAttribute(at.name, at.value); });
  const fv = [...velho.children], fn = [...novo.children];
  const nv = [...velho.childNodes], nn = [...novo.childNodes];
  const mesmoMolde = nv.length === nn.length && nn.every((n, i) => n.nodeType === nv[i].nodeType && (n.nodeType !== 1 || n.tagName === nv[i].tagName) && (n.nodeType === 1 || n.textContent === nv[i].textContent));
  if (fn.length && fv.length === fn.length && mesmoMolde) {
    fn.forEach((f, i) => igualar(fv[i], f));
  } else if (velho.innerHTML !== novo.innerHTML) velho.innerHTML = novo.innerHTML;
}

// Troca só o que mudou: as caixas de texto continuam as mesmas, então o toque e o cursor não se perdem
function atualizarLinha(tr, nova, ativo) {
  tr.className = nova.className;
  [...nova.children].forEach((cel, i) => {
    const velha = tr.children[i];
    if (!velha) return tr.append(cel.cloneNode(true));
    const ctl = cel.querySelector('[data-c]'), ctlV = velha.querySelector('[data-c]');
    if (!ctl || !ctlV || ctl.tagName !== ctlV.tagName) return igualar(velha, cel);
    velha.className = cel.className;
    [...velha.childNodes].forEach(n => { if (n !== ctlV) n.remove(); });
    [...cel.childNodes].forEach(n => { if (n !== ctl) velha.append(n.cloneNode(true)); });
    if (ctlV === ativo) return;
    [...ctlV.attributes].forEach(at => { if (!ctl.hasAttribute(at.name)) ctlV.removeAttribute(at.name); });
    [...ctl.attributes].forEach(at => { if (at.name !== 'value' && ctlV.getAttribute(at.name) !== at.value) ctlV.setAttribute(at.name, at.value); });
    if (ctl.tagName === 'SELECT') { if (ctlV.innerHTML !== ctl.innerHTML) ctlV.innerHTML = ctl.innerHTML; ctlV.value = ctl.value; }
    else if (ctlV.value !== ctl.value) ctlV.value = ctl.value;
  });
}

// Atualiza a tabela sem tirar o cursor de onde o Pietro está digitando
function atualizar() {
  if (!sessao || !S) return render();
  const tbody = document.querySelector('#folha tbody');
  if (!tbody) return render();
  const A = ABAS[aba];
  const ativo = document.activeElement;
  const existentes = new Map([...tbody.children].map(tr => [tr.dataset.k, tr]));
  const vistas = new Set();
  let anterior = null;
  for (const key of A.chaves()) {
    vistas.add(key);
    const t = document.createElement('tbody');
    t.innerHTML = A.linha(key);
    const nova = t.firstElementChild;
    const tr = existentes.get(key);
    if (tr) { atualizarLinha(tr, nova, ativo); }
    const el = tr || nova;
    if (!tr || (el.previousElementSibling !== anterior && !el.contains(ativo))) {
      if (anterior) anterior.after(el); else tbody.prepend(el);
    }
    anterior = el;
  }
  existentes.forEach((tr, key) => { if (!vistas.has(key)) tr.remove(); });
  document.querySelector('#folha .rodape').innerHTML = A.rodape();
  document.querySelector('#folha .topo-folha').innerHTML = A.topo();
  const dl = $('#lista-clientes');
  if (dl) dl.innerHTML = ativos(S.clientes).map(c => `<option value="${esc(nomeCompleto(c))}">`).join('');
  estado();
}

/* ---------- salvar ---------- */
let fila = Promise.resolve();
const naFila = new Set();
function agendar(qual, key) {
  if (naFila.has(key)) return;
  naFila.add(key);
  fila = fila.then(async () => {
    naFila.delete(key);
    const foto = { ...(rasc[key] || {}) };
    if (!Object.keys(foto).length) return;
    salvando.add(key);
    delete erros[key]; delete faltas[key];
    atualizar();
    try {
      const pronto = await SALVAR[qual](key, foto);
      if (pronto !== false) {
        Object.keys(foto).forEach(c => {
          if (c === 'itens' && foto.itens.some(itemVazio)) return; // tem linha em branco esperando: mantém
          if (c === 'mats' && foto.mats.some(matVazio)) return;
          if (rasc[key] && rasc[key][c] === foto[c]) delete rasc[key][c];
        });
        if (rasc[key] && !Object.keys(rasc[key]).length) delete rasc[key];
      }
    } catch (e) {
      erros[key] = e.message;
      aviso(e.message, 'erro');
    } finally {
      salvando.delete(key);
      atualizar();
    }
  });
}

function falta(key, msg) { faltas[key] = msg; return false; }
function criado(key, id, qual) { if (key.startsWith('n')) { idDe[key] = id; linhaDe[id] = key; novas[qual] = novas[qual].filter(n => n !== key); } }

function separarNome(t) {
  const p = String(t).trim().replace(/\s+/g, ' ').split(' ');
  return { nome: p.shift().slice(0, 60), sobrenome: p.join(' ').slice(0, 80) };
}

const SALVAR = {
  async servicos(key) {
    const v = vServico(key);
    if (!v.cliente.trim()) return falta(key, 'Falta o nome do cliente.');
    const preenchidos = v.itens.filter(i => !itemVazio(i));
    if (!preenchidos.length || preenchidos.some(i => !String(i.nome || '').trim())) return falta(key, 'Falta escrever o serviço.');
    // cliente: acha pelo nome; se for novo, cria com o telefone da linha
    let c = cliPorNome(v.cliente);
    const tel = soDig(v.tel);
    if (!c) {
      if (tel.length < 10) return falta(key, 'Cliente novo: preencha o telefone com DDD.');
      c = (await api('salvar', { aba: 'CLIENTES', registro: { ...separarNome(v.cliente), telefone: tel } })).resultado;
    } else if (rasc[key]?.tel !== undefined && tel.length >= 10 && tel !== soDig(c.telefone)) {
      await api('salvar', { aba: 'CLIENTES', registro: { ...c, telefone: tel } });
    }
    let a = v.a;
    const quer = v.situacao;
    const dia = /^\d{4}-\d{2}-\d{2}$/.test(v.dia) ? v.dia : hoje();
    const hora = a && String(a.data_agendada).length >= 16 ? String(a.data_agendada).slice(10, 16) : 'T08:00';
    const base = a ? { ...a } : { material_modo: 'Cliente', deslocamento_tipo: 'Cidade', checklist_json: '{}', lista_materiais_json: '[]' };
    const itens = preenchidos.map(i => {
      const m = String(i.nome).trim().match(/^(\d+(?:[.,]\d+)?)\s*x\s+(.+)$/i); // "2x Quadro" = 2 quadros
      const qtd = m ? num(m[1]) || 1 : 1;
      return { servico_id: i.servico_id || '', categoria: i.categoria || '', unidade: i.unidade || 'un', feito: !!i.feito, desmontagem: !!i.desmontagem,
        nome: (m ? m[2] : String(i.nome)).trim().slice(0, 140), qtd, preco: r4(num(i.valor) / qtd) };
    });
    // Concluído só pelo "finalizar"; aqui salva antes como Aprovado
    const statusSalvar = quer === 'Concluído' ? (a && a.status === 'Concluído' ? 'Concluído' : 'Aprovado') : quer;
    const precisaPagar = v.pago && (!a || a.pagamento !== 'Pago' || a.forma_pagamento !== v.pago);
    const status = precisaPagar && ['Orçamento', 'Cancelado'].includes(statusSalvar) ? 'Aprovado' : statusSalvar;
    const extra = { endereco_servico: v.endServ.trim(), validade_dias: v.validade === '' ? '' : num(v.validade) };
    if (rasc[key]?.mats) {
      const mats = v.mats.filter(m => !matVazio(m));
      if (mats.some(m => !String(m.nome || '').trim())) return falta(key, 'Falta o nome do material.');
      // materiais da planilha: o Pietro compra e cobra o valor da nota, sem taxa (como no orçamento à mão)
      extra.lista_materiais_json = mats.map(m => { const q = lerQtd(m.qtd); return { servico_id: m.servico_id || '', loja: String(m.loja || '').trim(), nome: String(m.nome).trim(), unidade: q.unidade, qtd: q.qtd, preco: r4(num(m.valor) / q.qtd) }; });
      if (mats.length) Object.assign(extra, { material_modo: 'Pietro', margem_material: 0 });
    }
    const r = await api('salvar_atendimento', { registro: { ...base, cliente_id: c.id, itens_json: itens, status, data_agendada: dia + hora, ...extra } });
    if (!a) criado(key, r.resultado.id, 'servicos');
    a = S.atendimentos.find(x => x.id === idLinha(key));
    if (quer === 'Concluído' && a.status !== 'Concluído') {
      await api('finalizar', { id: a.id, pagamento: v.pago && a.pagamento !== 'Pago' ? { forma: v.pago, data: hoje() } : null });
      a = S.atendimentos.find(x => x.id === a.id);
    }
    if (a.pagamento === 'Pago' && (!v.pago || a.forma_pagamento !== v.pago)) {
      await api('estornar_pagamento', { id: a.id });
      a = S.atendimentos.find(x => x.id === a.id);
    }
    if (v.pago && a.pagamento !== 'Pago') await api('registrar_pagamento', { id: a.id, forma: v.pago, data: hoje() });
    if (status !== quer && quer !== 'Concluído' && rasc[key]) delete rasc[key].situacao; // virou Aprovado por causa do pagamento
  },
  async clientes(key) {
    const v = vCliente(key);
    if (!v.nome.trim()) return falta(key, 'Falta o nome.');
    const tel = soDig(v.tel);
    if (tel.length < 10) return falta(key, 'Falta o telefone com DDD.');
    const r = await api('salvar', { aba: 'CLIENTES', registro: { ...(v.c || {}), ...separarNome(v.nome), telefone: tel, endereco: v.endereco.trim(), bairro: v.bairro.trim(), observacao: v.obs.trim() } });
    if (!v.c) criado(key, r.resultado.id, 'clientes');
  },
  async caixa(key) {
    const v = vCaixa(key);
    if (v.auto) return;
    if (!(num(v.valor) > 0)) return falta(key, 'Falta o valor.');
    const dia = /^\d{4}-\d{2}-\d{2}$/.test(v.dia) ? v.dia : diaPadraoCaixa();
    const r = await api('salvar', { aba: 'CARTEIRA', registro: {
      ...(v.l || {}), data: dia, tipo: v.tipo, categoria: v.l?.categoria || 'Outros',
      descricao: v.desc.trim(), valor: num(v.valor), forma_pagamento: v.forma
    } });
    if (!v.l) criado(key, r.resultado.id, 'caixa');
  }
};

/* ---------- mensagens de WhatsApp ---------- */
function mensagem(a) {
  const c = cliPorId(a.cliente_id) || {}, cfg = S.cfg || {};
  const servs = itensDe(a).map(i => `• ${num(i.qtd) !== 1 ? qtdTxt(i.qtd) + 'x ' : ''}${i.nome}${num(i.preco) ? ' – ' + moeda(num(i.qtd) * num(i.preco)) : ''}`).join('\n');
  const pix = cfg.chave_pix ? `\n💳 Chave Pix: ${cfg.chave_pix}` : '';
  if (a.status === 'Orçamento') {
    const mat = num(a.valor_materiais) ? `\n🧱 Materiais – ${moeda(a.valor_materiais)}` : '';
    return `Olá, *${c.nome || ''}*! Aqui é o Pietro, da *Pietro Resolve*. Segue o orçamento nº ${n4(a.numero)}:\n\n${servs}${mat}\n\n💰 *Total: ${moeda(a.valor_total)}*\n✅ Garantia de ${cfg.garantia_dias || 90} dias\n\nPosso agendar? É só me responder com o melhor dia. 🛠️`;
  }
  if (a.pagamento !== 'Pago' && a.status === 'Concluído') {
    return `Olá, *${c.nome || ''}*! Passando para lembrar do pagamento do serviço nº ${n4(a.numero)}: *${moeda(a.valor_total)}*.${pix}\nMuito obrigado!\nPietro · Pietro Resolve 🛠️`;
  }
  return `Olá, *${c.nome || ''}*! Aqui é o Pietro, da *Pietro Resolve*.\nServiço nº ${n4(a.numero)} – ${dataBR(a.data_agendada || a.data_orcamento)}\n${servs}\n💰 ${moeda(a.valor_total)}${a.pagamento !== 'Pago' ? pix : ' · pago ✅'}\n*Chamou, o Pietro resolve.* 🛠️`;
}

/* ---------- ações ---------- */
function sair() {
  sessao = null; S = null;
  gravarLocal('sessao', null); gravarLocal('dados', null);
  render();
}

async function carregar(silencioso) {
  try {
    await api('carregar');
    if (!silencioso) aviso('Dados atualizados!');
  } catch (e) {
    if (sessao) aviso(S ? 'Sem conexão: mostrando os últimos dados.' : e.message, 'erro');
  }
  render();
}

let arquivoPdf = null;
function abrirDialogo(conteudo) { const d = $('#dialogo'); d.innerHTML = conteudo; if (!d.open) d.showModal(); }
function fecharDialogo() { const d = $('#dialogo'); if (d.open) d.close(); }

const ACOES = {
  erro: b => aviso(erros[b.dataset.k], 'erro'),
  falta: b => aviso(faltas[b.dataset.k]),
  maisItem: b => {
    $('#mais').hidden = true;
    const key = b.dataset.k;
    const l = itensVis(key).map(x => ({ ...x }));
    l.push({ nome: '', valor: '' });
    (rasc[key] = rasc[key] || {}).itens = l;
    atualizar();
    const el = document.querySelector(`tr[data-k="${key}~${l.length - 1}"] [data-c^="nome"]`);
    if (el) { el.scrollIntoView({ block: 'nearest', inline: 'nearest' }); el.focus(); }
  },
  menuMais: b => {
    const key = b.dataset.k, a = (S.atendimentos || []).find(x => x.id === idLinha(key));
    const m = $('#mais');
    m.innerHTML = `<button data-acao="maisItem" data-k="${key}">🔧 Mais um serviço</button>
      <button data-acao="maisMat" data-k="${key}">🧱 Material</button>
      ${a ? `<button data-acao="pdf" data-k="${key}">📄 PDF do orçamento</button>
      <button data-acao="whats" data-k="${key}">💬 Mensagem no WhatsApp</button>
      <button data-acao="apagar" data-k="${key}">🗑 Apagar</button>` : ''}`;
    const r = b.getBoundingClientRect();
    m.style.left = Math.min(r.left, innerWidth - 250) + 'px';
    m.style.top = Math.min(r.bottom + 4, innerHeight - 260) + 'px';
    m.hidden = false;
  },
  maisMat: b => {
    $('#mais').hidden = true;
    const key = b.dataset.k;
    const l = matsVis(key).map(x => ({ ...x }));
    l.push({ loja: l.length ? l[l.length - 1].loja : '', nome: '', qtd: '', valor: '' }); // repete a loja da linha de cima
    (rasc[key] = rasc[key] || {}).mats = l;
    atualizar();
    const el = document.querySelector(`tr[data-k="${key}~m${l.length - 1}"] [data-c^="mnome"]`);
    if (el) { el.scrollIntoView({ block: 'nearest', inline: 'nearest' }); el.focus(); }
  },
  tirarMat: b => {
    const key = b.dataset.k;
    (rasc[key] = rasc[key] || {}).mats = matsVis(key).filter((_, i) => i !== Number(b.dataset.i)).map(x => ({ ...x }));
    atualizar();
    agendar('servicos', key);
  },
  pdf: async b => {
    $('#mais').hidden = true;
    const key = b.dataset.k;
    abrirDialogo('<p class="centro">⏳ Salvando e gerando o PDF…<br><small>Pode levar alguns segundos.</small></p>');
    try {
      await fila; // espera o que ainda está sendo salvo
      if (faltas[key] || erros[key]) throw new Error('Arrume a linha antes: ' + (faltas[key] || erros[key]));
      const id = idLinha(key);
      if (!id) throw new Error('Preencha a linha primeiro.');
      const doc = (await api('documento_gerar', { atendimento_id: id, tipo: 'Orçamento' })).resultado;
      const r = await api('documento_baixar', { id: doc.id });
      const bytes = Uint8Array.from(atob(r.base64), ch => ch.charCodeAt(0));
      arquivoPdf = new File([bytes], r.nome, { type: 'application/pdf' });
      const url = URL.createObjectURL(arquivoPdf);
      abrirDialogo(`<h2>📄 Orçamento ${esc(doc.numero)}</h2><p>${esc(doc.cliente_nome)} · ${moeda(doc.valor)}</p>
        <button class="principal" data-acao="enviarPdf" data-k="${key}">💬 Enviar ao cliente</button>
        <a class="botao" href="${url}" target="_blank" rel="noopener">👁 Abrir</a>
        <a class="botao" href="${url}" download="${esc(r.nome)}">⬇ Baixar</a>
        <button class="botao" data-acao="fecharDialogo">Fechar</button>`);
    } catch (e) {
      abrirDialogo(`<p>${esc(e.message)}</p><button class="botao" data-acao="fecharDialogo">Fechar</button>`);
    }
  },
  enviarPdf: async b => {
    const a = S.atendimentos.find(x => x.id === idLinha(b.dataset.k));
    const c = (a && cliPorId(a.cliente_id)) || {};
    const texto = `Olá, ${c.nome || ''}! Segue o orçamento nº ${n4(a?.numero)}. Qualquer dúvida, estou à disposição. Chamou, o Pietro resolve! 🛠️`;
    if (navigator.canShare && navigator.canShare({ files: [arquivoPdf] })) {
      try { await navigator.share({ files: [arquivoPdf], text: texto }); } catch (e) { if (e.name !== 'AbortError') aviso(e.message, 'erro'); }
      return;
    }
    const l = document.createElement('a');
    l.href = URL.createObjectURL(arquivoPdf); l.download = arquivoPdf.name; l.click();
    window.open(waLink(c.telefone, texto + ' (PDF em anexo)'), '_blank', 'noopener');
    aviso('PDF baixado. No WhatsApp, toque no 📎 para anexar.');
  },
  fecharDialogo: () => fecharDialogo(),
  tirarItem: b => {
    const key = b.dataset.k;
    const l = itensVis(key).filter((_, i) => i !== Number(b.dataset.i)).map(x => ({ ...x }));
    (rasc[key] = rasc[key] || {}).itens = l.length ? l : [{ nome: '', valor: '' }];
    atualizar();
    agendar('servicos', key);
  },
  mes: b => {
    const [y, m] = mes.split('-').map(Number);
    mes = hoje(new Date(y, m - 1 + Number(b.dataset.d), 15)).slice(0, 7);
    render();
  },
  whats: b => {
    $('#mais').hidden = true;
    const a = S.atendimentos.find(x => x.id === idLinha(b.dataset.k));
    const c = a && cliPorId(a.cliente_id);
    if (!c) return aviso('Cliente sem telefone.', 'erro');
    window.open(waLink(c.telefone, mensagem(a)), '_blank', 'noopener');
  },
  apagar: async b => {
    $('#mais').hidden = true;
    const key = b.dataset.k, id = idLinha(key);
    const nomes = { servicos: 'este serviço (com fotos e documentos dele)', clientes: 'este cliente', caixa: 'este lançamento' };
    if (!confirm(`Apagar ${nomes[aba]}?`)) return;
    try {
      if (aba === 'servicos') await api('excluir_atendimento', { id });
      else await api('excluir', { aba: aba === 'clientes' ? 'CLIENTES' : 'CARTEIRA', id });
      delete rasc[key]; delete erros[key]; delete faltas[key];
      aviso('Apagado.');
      atualizar();
    } catch (e) { aviso(e.message, 'erro'); }
  },
  atualizar: () => { $('#menu').hidden = true; carregar(); },
  sair: async () => {
    $('#menu').hidden = true;
    if (!confirm('Sair do app?')) return;
    try { await api('logout'); } catch { /* sai mesmo sem internet */ }
    sair();
  }
};

/* ---------- eventos ---------- */
document.addEventListener('click', e => {
  const tab = e.target.closest('[data-aba]');
  if (tab) { aba = tab.dataset.aba; gravarLocal('aba_planilha', aba); render(); rolarFim(); return; }
  if (e.target.closest('#b-menu')) { $('#menu').hidden = !$('#menu').hidden; return; }
  const b = e.target.closest('[data-acao]');
  if (b && ACOES[b.dataset.acao]) { e.preventDefault(); if (b.dataset.acao !== 'menuMais') $('#mais').hidden = true; ACOES[b.dataset.acao](b); return; }
  if (!e.target.closest('#menu')) $('#menu').hidden = true;
  if (!e.target.closest('#mais')) $('#mais').hidden = true;
});

function digitou(el) {
  const key = el.dataset.k;
  if (!key) return false;
  const r = (rasc[key] = rasc[key] || {});
  const [campo, i] = el.dataset.c.split(':');
  if (i !== undefined && campo[0] === 'm') { // material: mloja, mnome, mvalor, mqtd
    const l = matsVis(key).map(x => ({ ...x }));
    l[Number(i)] = { ...l[Number(i)], [campo.slice(1)]: el.value };
    r.mats = l;
  } else if (i !== undefined) {
    const l = itensVis(key).map(x => ({ ...x }));
    l[Number(i)] = { ...l[Number(i)], [campo]: el.value };
    r.itens = l;
  } else r[el.dataset.c] = el.value;
  if (key === vazia[aba]) { // a linha em branco começou a ser usada: aparece outra embaixo
    novas[aba].push(key);
    vazia[aba] = 'n' + seq++;
    atualizar();
  }
  return true;
}
document.addEventListener('input', e => { if (e.target.dataset.c && e.target.tagName === 'INPUT') digitou(e.target); });
document.addEventListener('change', e => {
  const el = e.target;
  if (el.dataset.filtro === 'mostrar') { mostrar = el.value; render(); return; }
  if (!el.dataset.c || !digitou(el)) return;
  if (aba === 'servicos' && el.dataset.c === 'situacao' && el.value === 'Concluído'
    && !confirm('Marcar como Concluído? Gera a nota e o relatório e não volta atrás.')) {
    delete rasc[el.dataset.k].situacao; atualizar(); return;
  }
  if (aba === 'servicos' && el.dataset.c === 'cliente') atualizar(); // mostra o telefone do cliente escolhido
  agendar(aba, el.dataset.k);
});
// Enter desce para a linha de baixo, como numa planilha
document.addEventListener('keydown', e => {
  const el = e.target;
  if (e.key !== 'Enter' || !el.dataset?.c || el.tagName !== 'INPUT') return;
  e.preventDefault();
  const tr = el.closest('tr');
  const col = el.dataset.c.split(':')[0];
  let prox = null;
  for (let t = tr.nextElementSibling; t && !prox; t = t.nextElementSibling) prox = t.querySelector(`[data-c="${col}"], [data-c^="${col}:"]`);
  el.blur();
  if (prox) prox.focus();
});
document.addEventListener('submit', async e => {
  if (e.target.id !== 'f-login') return;
  e.preventDefault();
  const d = Object.fromEntries(new FormData(e.target));
  const b = e.target.querySelector('button');
  b.disabled = true; b.textContent = 'Entrando…';
  try {
    sessao = (await api('login', { login: d.login, senha: d.senha })).sessao;
    gravarLocal('sessao', sessao);
    render();
    await carregar(true);
    rolarFim();
  } catch (err) {
    aviso(err.message, 'erro');
    b.disabled = false; b.textContent = 'ENTRAR';
  }
});
window.addEventListener('beforeunload', e => { if (salvando.size || naFila.size) { e.preventDefault(); e.returnValue = ''; } });

function rolarFim() { const r = document.querySelector('#folha .rolagem'); if (r && aba !== 'clientes') r.scrollTop = r.scrollHeight; }

/* ---------- início ---------- */
render();
rolarFim();
if (sessao) carregar(true).then(rolarFim);
