(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const { reduce, brl, brl0, pct, signed, tween, setAnswerer } = window.NF;   // vem de common.js

  /* ---------- Dados de exemplo (troque pelos dados vindos do Flask) ---------- */
  const DIAS = [1, 5, 10, 15, 20, 25, 30];
  const MESES = [
    { nome: 'Julho 2026',    ab: 'jul', mm: '07', receita: 5800,
      pf: [1300, 1350, 1400, 1380, 1450, 1500, 1520],
      pj: [1900, 1950, 2000, 2100, 2050, 2150, 2300] },
    { nome: 'Agosto 2026',   ab: 'ago', mm: '08', receita: 6100,
      pf: [1520, 1480, 1560, 1600, 1620, 1580, 1500],
      pj: [2300, 2350, 2280, 2400, 2250, 2200, 2160] },
    { nome: 'Setembro 2026', ab: 'set', mm: '09', receita: 6700,
      pf: [1500, 1550, 1520, 1600, 1580, 1700, 1800],
      pj: [2160, 2250, 2230, 2500, 2750, 2900, 3200] },
  ];
  let current = MESES.length - 1;

  /* ---------- Gráfico SVG ---------- */
  const svg = $('#chart'), tip = $('#tip'), wrap = $('#chartWrap');
  const W = 640, H = 280, M = { l: 58, r: 74, t: 12, b: 30 };
  const IW = W - M.l - M.r, IH = H - M.t - M.b, MAX = 7500;
  const X = (d) => M.l + ((d - 1) / 29) * IW;
  const Y = (v) => M.t + (1 - v / MAX) * IH;
  const COLORS = ['var(--teal)', 'var(--red)', 'var(--yellow)'];

  function drawChart(m) {
    const total = m.pf.map((v, i) => v + m.pj[i]);
    const series = [m.pf, m.pj, total];
    let s = '';

    [0, 2500, 5000, 7500].forEach((v) => {
      s += `<line class="grid${v === 0 ? ' grid--base' : ''}" x1="${M.l}" x2="${W - M.r}" y1="${Y(v)}" y2="${Y(v)}"/>`;
      s += `<text class="axis" x="${M.l - 10}" y="${Y(v) + 4}" text-anchor="end">R$ ${v.toLocaleString('pt-BR')}</text>`;
    });
    DIAS.forEach((d) => {
      s += `<text class="axis" x="${X(d)}" y="${H - 6}" text-anchor="middle">${String(d).padStart(2, '0')} ${m.ab}</text>`;
    });
    series.forEach((data, k) => {
      const path = DIAS.map((d, i) => `${i ? 'L' : 'M'}${X(d)} ${Y(data[i])}`).join(' ');
      s += `<path class="line" pathLength="1" d="${path}" stroke="${COLORS[k]}" style="transition-delay:${k * 0.12}s"/>`;
    });
    s += '<g class="ends">';
    series.forEach((data, k) => {
      const v = data[data.length - 1];
      s += `<circle cx="${X(30)}" cy="${Y(v)}" r="4" fill="${COLORS[k]}"/>`;
      s += `<text class="end-label" x="${X(30) + 12}" y="${Y(v) + 4}">${brl0(v).replace(',00', '')}</text>`;
    });
    s += '</g>';
    s += `<line class="cross" y1="${M.t}" y2="${H - M.b}"/>`;
    COLORS.forEach((c) => { s += `<circle class="hv" r="4.5" fill="${c}"/>`; });

    svg.classList.remove('is-drawn', 'is-hover');
    svg.innerHTML = s;
    svg.setAttribute('aria-label', `Evolução dos saldos PF, PJ e total em ${m.nome}`);
    void svg.getBoundingClientRect();           // reinicia a animação
    svg.classList.add('is-drawn');
    hideTip();
  }

  function showTip(idx) {
    const m = MESES[current], d = DIAS[idx], x = X(d);
    const vals = [m.pf[idx], m.pj[idx], m.pf[idx] + m.pj[idx]];
    const cross = svg.querySelector('.cross');
    cross.setAttribute('x1', x); cross.setAttribute('x2', x);
    svg.querySelectorAll('.hv').forEach((c, k) => { c.setAttribute('cx', x); c.setAttribute('cy', Y(vals[k])); });
    svg.classList.add('is-hover');

    const names = ['PF', 'PJ', 'Total'];
    tip.innerHTML = `<strong>${String(d).padStart(2, '0')} ${m.ab}</strong>` +
      vals.map((v, k) => `<span><i style="background:${COLORS[k]}"></i>${names[k]} ${brl(v)}</span>`).join('');
    tip.hidden = false;
    const w = svg.getBoundingClientRect().width, px = (x / W) * w;
    tip.style.left = px + 'px';
    tip.classList.toggle('tip--left', px > w * 0.6);
  }
  function hideTip() { tip.hidden = true; svg.classList.remove('is-hover'); }

  wrap.addEventListener('pointermove', (e) => {
    const r = svg.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * W;
    if (x < M.l - 12 || x > W - M.r + 12) return hideTip();
    let idx = 0, best = Infinity;
    DIAS.forEach((d, i) => { const dx = Math.abs(X(d) - x); if (dx < best) { best = dx; idx = i; } });
    showTip(idx);
  });
  wrap.addEventListener('pointerleave', hideTip);

  /* ---------- Atualiza a página para o mês escolhido ---------- */
  function setMonth(i) {
    current = i;
    const m = MESES[i];
    const pf = m.pf.at(-1), pj = m.pj.at(-1), total = pf + pj;
    const start = m.pf[0] + m.pj[0];
    const delta = total - start;
    const lucro = (delta / m.receita) * 100;
    const pfShare = Math.round((pf / total) * 100);

    tween($('#vTotal'), total, brl);
    tween($('#vPf'), pf, brl);
    tween($('#vPj'), pj, brl);
    tween($('#vLucro'), lucro, pct);
    $('#nPf').textContent = `Pessoa física • ${pfShare}% do total`;
    $('#nPj').textContent = `Pessoa jurídica • ${100 - pfShare}% do total`;
    $('#nLucro').textContent = `Lucro: ${brl0(delta)} • Receita: ${brl0(m.receita)}`;

    $('#startLabel').textContent = `Saldo em 01/${m.mm}`;
    tween($('#startVal'), start, brl);
    tween($('#delta'), delta, signed);
    $('#badge').classList.toggle('badge--neg', delta < 0);
    $('#badgeTxt').textContent = delta < 0 ? 'Mês negativo' : 'Mês positivo';

    document.querySelectorAll('[data-month-label]').forEach((el) => { el.textContent = m.nome; });
    document.querySelectorAll('.select__list button').forEach((b) => {
      b.setAttribute('aria-selected', String(+b.dataset.i === i));
    });
    drawChart(m);
  }

  /* ---------- Seletores de mês ---------- */
  function closeSelects() {
    document.querySelectorAll('[data-select]').forEach((sel) => {
      sel.querySelector('.select__list').hidden = true;
      sel.querySelector('.select__btn').setAttribute('aria-expanded', 'false');
    });
  }
  document.querySelectorAll('[data-select]').forEach((sel) => {
    const btn = $('.select__btn', sel), list = $('.select__list', sel);
    list.innerHTML = MESES.map((m, i) =>
      `<li role="presentation"><button type="button" role="option" data-i="${i}">${m.nome}</button></li>`).join('');
    btn.addEventListener('click', () => {
      const willOpen = list.hidden;
      closeSelects();
      list.hidden = !willOpen;
      btn.setAttribute('aria-expanded', String(willOpen));
    });
    list.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      setMonth(+b.dataset.i);
      closeSelects();
      btn.focus();
    });
  });
  document.addEventListener('click', (e) => { if (!e.target.closest('[data-select]')) closeSelects(); });

  /* ---------- Assistente: respostas desta página (o chat fica em common.js) ---------- */
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeSelects(); });

  // Troque por um fetch('/api/chat', ...) para ligar ao backend Flask.
  setAnswerer((q) => {
    q = q.toLowerCase();
    const m = MESES[current];
    const delta = m.pf.at(-1) + m.pj.at(-1) - (m.pf[0] + m.pj[0]);
    if (/meta/.test(q)) return 'Uma boa meta é específica e tem prazo. Exemplo: guardar R$ 500 por mês durante 6 meses para sua reserva de emergência.';
    if (/extrato|importar/.test(q)) return 'Em Importar extratos você envia o arquivo do seu banco e eu organizo as entradas e saídas entre PF e PJ.';
    if (/lucro|margem/.test(q)) return `Em ${m.nome} a variação foi de ${signed(delta)} sobre uma receita de ${brl0(m.receita)}.`;
    return null;
  });

  setMonth(current);
})();
