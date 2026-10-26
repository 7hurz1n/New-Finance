(() => {
  'use strict';

  const { reduce, brl, tween, setAnswerer, parseMoney, num, toast } = window.NF;
  const $ = (s) => document.querySelector(s);

  const f = {
    nome: $('#nome'), mat: $('#mat'), emb: $('#emb'), out: $('#out'), margem: $('#margem'),
  };
  const money = [f.mat, f.emb, f.out];
  const ui = {
    form: $('#calcForm'), erro: $('#erro'), custo: $('#custo'), result: $('#result'),
    preco: $('#preco'), texto: $('#texto'), barCost: $('#barCost'),
    lblCost: $('#lblCost'), lblProfit: $('#lblProfit'), vCost: $('#vCost'), vProfit: $('#vProfit'),
    conta: $('#conta'), salvar: $('#salvar'), toast: $('#toast'),
    dlg: $('#saves'), list: $('#savesList'),
  };
  const KEY = 'nf:simulacoes';   // troque por chamadas ao Flask (POST /api/simulacoes) quando tiver o backend
  let last = null;

  /* ---------- Números ---------- */
  const custoTotal = () => money.reduce((sum, el) => sum + parseMoney(el.value), 0);

  /* ---------- Custo total ao vivo + máscara de moeda ---------- */
  money.forEach((el) => {
    el.addEventListener('input', () => { clearError(); tween(ui.custo, custoTotal(), brl, 350); });
    el.addEventListener('focus', () => el.select());
    el.addEventListener('blur', () => { if (el.value.trim()) el.value = brl(parseMoney(el.value)); });
  });
  f.margem.addEventListener('input', clearError);

  /* ---------- Erros ---------- */
  function showError(msg, field) {
    ui.erro.textContent = msg;
    ui.erro.hidden = false;
    field.setAttribute('aria-invalid', 'true');
    field.focus();
  }
  function clearError() {
    ui.erro.hidden = true;
    document.querySelectorAll('[aria-invalid]').forEach((el) => el.removeAttribute('aria-invalid'));
  }

  /* ---------- Cálculo ---------- */
  function calculate() {
    clearError();
    const custo = custoTotal();
    const margem = parseFloat(f.margem.value);

    if (custo <= 0) return showError('Informe pelo menos um custo para calcular o preço.', f.mat);
    if (!Number.isFinite(margem) || margem < 0 || margem >= 100) {
      return showError('Informe uma margem entre 0% e 99%.', f.margem);
    }

    const preco = custo / (1 - margem / 100);
    render({ custo, margem, preco, lucro: preco - custo });
  }

  function render(r) {
    last = r;
    ui.result.classList.remove('is-empty');
    tween(ui.custo, r.custo, brl, 350);
    tween(ui.preco, r.preco, brl, 800);
    tween(ui.vCost, r.custo, brl);
    tween(ui.vProfit, r.lucro, brl);
    ui.texto.textContent = `Com os custos informados, este preço garante uma margem de lucro de ${num(r.margem)}%.`;
    ui.barCost.style.width = `${100 - r.margem}%`;
    ui.lblCost.textContent = `Custos • ${num(100 - r.margem)}%`;
    ui.lblProfit.textContent = `Lucro • ${num(r.margem)}%`;
    const fator = (1 - r.margem / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
    ui.conta.textContent = `${brl(r.custo)} ÷ ${fator} = ${brl(r.preco)}`;
    ui.salvar.disabled = false;

    if (!reduce) {            // pulso no card
      ui.result.classList.remove('is-flash');
      void ui.result.offsetWidth;
      ui.result.classList.add('is-flash');
    }
  }

  function clearAll() {
    clearError();
    [f.nome, ...money, f.margem].forEach((el) => { el.value = ''; });
    last = null;
    ui.result.classList.add('is-empty');
    tween(ui.custo, 0, brl, 350);
    tween(ui.preco, 0, brl, 500);
    tween(ui.vCost, 0, brl, 500);
    tween(ui.vProfit, 0, brl, 500);
    ui.texto.textContent = 'Preencha os custos e a margem para ver o preço sugerido.';
    ui.barCost.style.width = '0%';
    ui.lblCost.textContent = 'Custos • 0%';
    ui.lblProfit.textContent = 'Lucro • 0%';
    ui.conta.textContent = 'Aguardando o cálculo.';
    ui.salvar.disabled = true;
    f.nome.focus();
  }

  ui.form.addEventListener('submit', (e) => { e.preventDefault(); calculate(); });
  $('#limpar').addEventListener('click', clearAll);

  /* ---------- Simulações salvas ---------- */
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; } };
  const store = (list) => { try { localStorage.setItem(KEY, JSON.stringify(list)); return true; } catch { return false; } };

  ui.salvar.addEventListener('click', () => {
    if (!last) return;
    const list = load();
    list.unshift({ id: Date.now(), nome: f.nome.value.trim() || 'Sem nome', ...last, data: new Date().toISOString() });
    toast(store(list.slice(0, 30)) ? 'Simulação salva!' : 'Não foi possível salvar neste navegador.');
  });

  function renderList() {
    const list = load();
    ui.list.replaceChildren();
    if (!list.length) {
      const li = document.createElement('li');
      li.className = 'saves__empty';
      li.textContent = 'Nenhuma simulação salva ainda.';
      ui.list.appendChild(li);
      return;
    }
    list.forEach((s) => {
      const li = document.createElement('li');
      const info = document.createElement('div');
      const nome = document.createElement('strong');
      const meta = document.createElement('span');
      nome.textContent = s.nome;
      meta.textContent = `${brl(s.preco)} • margem ${num(s.margem)}% • ${new Date(s.data).toLocaleDateString('pt-BR')}`;
      info.append(nome, meta);

      const del = document.createElement('button');
      del.type = 'button';
      del.textContent = 'Excluir';
      del.setAttribute('aria-label', `Excluir simulação ${s.nome}`);
      del.addEventListener('click', () => { store(load().filter((x) => x.id !== s.id)); renderList(); });

      li.append(info, del);
      ui.list.appendChild(li);
    });
  }

  $('#ver').addEventListener('click', () => { renderList(); ui.dlg.showModal(); });
  $('#fechar').addEventListener('click', () => ui.dlg.close());
  ui.dlg.addEventListener('click', (e) => { if (e.target === ui.dlg) ui.dlg.close(); });

  /* ---------- Assistente: respostas desta página ---------- */
  setAnswerer((q) => {
    q = q.toLowerCase();
    if (/margem|lucro/.test(q)) return 'A margem é a fatia do preço de venda que vira lucro. Com 30%, de cada R$ 100 vendidos sobram R$ 30 depois de pagar os custos.';
    if (/custo|despesa/.test(q)) return 'Some materiais, embalagem e outras despesas por unidade, como frete, mão de obra, impostos e uma parcela do custo fixo.';
    if (/pre[çc]o|calcul/.test(q)) return 'O preço sugerido é o custo total dividido por (1 − margem). Preencha os custos e a margem e clique em Calcular preço.';
    return null;
  });

  calculate();   // mostra o resultado inicial com a animação de contagem
})();
