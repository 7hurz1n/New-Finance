(() => {
  'use strict';

  const { reduce, setAnswerer, toast } = window.NF;
  const $ = (s, r = document) => r.querySelector(s);
  const MAX = 10 * 1024 * 1024;   // 10 MB
  const KEY = 'nf:contas';        // troque por chamadas ao Flask (GET /api/contas) quando tiver o backend

  const DEFAULTS = [
    { banco: 'Banco Cora', tipo: 'Negócio', ultimo: '2026-10-05' },
    { banco: 'Nubank', tipo: 'Pessoal', ultimo: '2026-10-12' },
  ];
  const load = () => {
    try { const v = JSON.parse(localStorage.getItem(KEY)); if (Array.isArray(v) && v.length) return v; } catch { /* usa o padrão */ }
    return structuredClone(DEFAULTS);
  };
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(contas)); } catch { /* sem armazenamento */ } };
  let contas = load();

  const ui = {
    drop: $('#drop'), input: $('#arquivo'), file: $('#file'), name: $('#fileName'), size: $('#fileSize'),
    remove: $('#fileRemove'), send: $('#enviar'), prog: $('#prog'), bar: $('#progBar'),
    alerta: $('#alerta'), tbody: $('#contas'), add: $('#addConta'),
  };

  /* ---------- Helpers ---------- */
  const sizeTxt = (b) => (b < 1048576 ? `${Math.max(1, Math.round(b / 1024))} KB` : `${(b / 1048576).toFixed(1).replace('.', ',')} MB`);
  const dateTxt = (iso) => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d).toLocaleDateString('pt-BR'); };
  const todayIso = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  const svgIcon = (id) => {
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    const use = document.createElementNS(NS, 'use');
    svg.setAttribute('class', 'icon');
    use.setAttribute('href', `#i-${id}`);
    svg.appendChild(use);
    return svg;
  };

  /* ---------- Contas conectadas ---------- */
  function renderContas() {
    ui.tbody.replaceChildren();
    contas.forEach((c, i) => {
      const tr = document.createElement('tr');
      tr.style.setProperty('--i', i);

      const t1 = document.createElement('td');
      const bank = document.createElement('span');
      bank.className = 'bank';
      bank.append(svgIcon(c.tipo === 'Negócio' ? 'bank' : 'user'), c.banco);
      t1.appendChild(bank);

      const t2 = document.createElement('td');
      t2.textContent = c.tipo;
      const t3 = document.createElement('td');
      t3.textContent = dateTxt(c.ultimo);

      tr.append(t1, t2, t3);
      ui.tbody.appendChild(tr);
    });
  }

  /* ---------- Escolha do arquivo ---------- */
  function showAlert(title, text) {
    $('strong', ui.alerta).textContent = title;
    $('p', ui.alerta).textContent = text;
    ui.alerta.hidden = false;
  }
  function clearFile() {
    ui.input.value = '';
    ui.file.hidden = true;
    ui.send.disabled = true;
  }

  function pick(file) {
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['pdf', 'ofx'].includes(ext)) {
      clearFile();
      return showAlert('Não conseguimos ler o arquivo enviado.', 'Confira se o arquivo é mesmo um PDF ou OFX e tente novamente.');
    }
    if (file.size > MAX) {
      clearFile();
      return showAlert('O arquivo é grande demais.', 'O limite é de 10 MB. Tente exportar um período menor.');
    }
    ui.alerta.hidden = true;
    ui.name.textContent = file.name;
    ui.size.textContent = `${ext.toUpperCase()} • ${sizeTxt(file.size)}`;
    ui.file.hidden = false;
    ui.send.disabled = false;
  }

  ui.input.addEventListener('change', () => pick(ui.input.files[0]));
  ui.remove.addEventListener('click', () => { clearFile(); ui.input.focus(); });

  ['dragenter', 'dragover'].forEach((ev) => ui.drop.addEventListener(ev, (e) => {
    e.preventDefault();
    ui.drop.classList.add('is-over');
  }));
  ['dragleave', 'dragend'].forEach((ev) => ui.drop.addEventListener(ev, () => ui.drop.classList.remove('is-over')));
  ui.drop.addEventListener('drop', (e) => {
    e.preventDefault();
    ui.drop.classList.remove('is-over');
    const files = e.dataTransfer.files;
    if (!files.length) return;
    try { ui.input.files = files; } catch { /* navegador sem suporte: usa o arquivo direto */ }
    pick(files[0]);
  });
  // Evita que o navegador abra o arquivo se ele for solto fora da área.
  ['dragover', 'drop'].forEach((ev) => window.addEventListener(ev, (e) => e.preventDefault()));

  /* ---------- Envio (simulado) ---------- */
  function done(tipo) {
    ui.prog.hidden = true;
    const rotulo = tipo === 'PJ' ? 'Negócio' : 'Pessoal';
    const conta = contas.find((c) => c.tipo === rotulo);
    if (conta) conta.ultimo = todayIso();
    else contas.push({ banco: 'Nova conta', tipo: rotulo, ultimo: todayIso() });
    save();
    renderContas();
    clearFile();
    toast('Extrato enviado! Estamos organizando seus dados.');
  }

  ui.send.addEventListener('click', () => {
    const file = ui.input.files[0];
    if (!file) return;
    const tipo = $('input[name="tipo"]:checked').value;
    ui.send.disabled = true;
    ui.prog.hidden = false;
    ui.bar.style.width = '0%';

    /* Com o backend Flask, troque a animação abaixo por:
         const fd = new FormData(); fd.append('arquivo', file); fd.append('tipo', tipo);
         const r = await fetch('/api/extratos', { method: 'POST', body: fd });
         if (!r.ok) -> showAlert(...) ; senão -> done(tipo) */
    const ms = reduce ? 0 : 1600, t0 = performance.now();
    const step = (now) => {
      const p = ms ? Math.min((now - t0) / ms, 1) : 1;
      ui.bar.style.width = `${p * 100}%`;
      if (p < 1) requestAnimationFrame(step); else done(tipo);
    };
    requestAnimationFrame(step);
  });

  ui.add.addEventListener('click', () => {
    ui.drop.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
    ui.input.focus({ preventScroll: true });
    ui.drop.classList.add('is-pulse');
    setTimeout(() => ui.drop.classList.remove('is-pulse'), 1700);
  });

  /* ---------- Assistente: respostas desta página ---------- */
  setAnswerer((q) => {
    q = q.toLowerCase();
    if (/pdf|ofx|arquivo|formato/.test(q)) return 'Aceitamos PDF e OFX. O OFX costuma ser mais preciso porque já vem organizado pelo banco.';
    if (/extrato|onde|encontr/.test(q)) return 'No app do seu banco procure por Extrato ou Movimentações, escolha o período e exporte em PDF ou OFX.';
    return null;
  });

  renderContas();
  if (location.hash === '#erro') showAlert('Não conseguimos ler o último arquivo enviado.', 'Confira se o arquivo é mesmo um PDF ou OFX e tente novamente.');   // prévia do aviso do Figma
})();
