/* =====================================================================
   common.js — funções usadas por TODAS as páginas
   Carregue este arquivo ANTES do script da página.
   Tudo fica guardado em window.NF (ex.: NF.brl(5000) devolve "R$ 5.000,00").

   Partes:
     1) Formatação de números e dinheiro
     2) Contador animado
     3) Aviso rápido (toast)
     4) Máscaras (CPF, CNPJ, telefone) e validações
     5) Erro embaixo de um campo
     6) Mostrar/ocultar senha e caixinhas do código de 6 dígitos
     7) Perfil salvo no navegador
     8) Assistente (chat)
   ===================================================================== */
(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);

  // Pessoas com "reduzir movimento" ligado no sistema não veem animações
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 1) Formatação ---------- */
  const moeda = (casas) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: casas, maximumFractionDigits: casas });
  const brl  = (v) => moeda(2).format(v).replace(/\u00a0/g, ' ');   // R$ 1.234,56
  const brl0 = (v) => moeda(0).format(v).replace(/\u00a0/g, ' ');   // R$ 1.235
  const pct  = (v) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%';
  const signed = (v) => `${v < 0 ? '-' : '+'} ${brl(Math.abs(v))}`;  // + R$ 10,00
  const num = (n) => n.toLocaleString('pt-BR', { maximumFractionDigits: 2 });

  // Transforma o que a pessoa digitou em número: "R$ 1.234,56" -> 1234.56
  function parseMoney(s) {
    s = String(s).replace(/[^\d.,]/g, '');
    if (!s) return 0;
    if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
    else if (!/^\d+\.\d{1,2}$/.test(s)) s = s.replace(/\./g, '');   // "1.500" = mil e quinhentos
    const n = parseFloat(s);
    return Number.isFinite(n) ? n : 0;
  }

  /* ---------- 2) Contador animado ---------- */
  // Faz o número do elemento "contar" até o valor final. fmt = função que formata (ex.: brl)
  function tween(el, to, fmt, ms = 900) {
    const from = Number(el.dataset.v ?? 0);   // valor anterior (guardado no próprio elemento)
    el.dataset.v = to;
    cancelAnimationFrame(el._raf);
    if (reduce) { el.textContent = fmt(to); return; }
    const inicio = performance.now();
    const passo = (agora) => {
      const p = Math.min((agora - inicio) / ms, 1);   // 0 -> 1
      const suave = 1 - Math.pow(1 - p, 3);           // começa rápido e desacelera
      el.textContent = fmt(from + (to - from) * suave);
      if (p < 1) el._raf = requestAnimationFrame(passo);
    };
    el._raf = requestAnimationFrame(passo);
  }

  /* ---------- 3) Aviso rápido ---------- */
  // Precisa de <div class="toast" id="toast" role="status"></div> na página
  let toastTimer;
  function toast(msg) {
    const el = $('#toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('is-on'), 2400);
  }

  /* ---------- 4) Máscaras e validações ---------- */
  const digits = (s) => String(s).replace(/\D/g, '');   // deixa só os números

  // Encaixa os números num modelo: ('12345', '000.000') -> '123.45'
  function encaixar(numeros, modelo) {
    let saida = '', i = 0;
    for (const c of modelo) {
      if (i >= numeros.length) break;
      saida += c === '0' ? numeros[i++] : c;
    }
    return saida;
  }
  const MASCARAS = {
    cpf:  { max: 11, modelo: () => '000.000.000-00' },
    cnpj: { max: 14, modelo: () => '00.000.000/0000-00' },
    cnae: { max: 7,  modelo: () => '0000-0/00' },
    tel:  { max: 11, modelo: (d) => (d.length > 10 ? '(00) 00000-0000' : '(00) 0000-0000') },
  };
  // Formata o campo enquanto a pessoa digita. Uso: <input data-mask="cpf">
  function maskInput(input, tipo) {
    const m = MASCARAS[tipo];
    const formatar = () => {
      const d = digits(input.value).slice(0, m.max);
      input.value = encaixar(d, m.modelo(d));
    };
    input.addEventListener('input', formatar);
    if (input.value) formatar();
  }
  document.querySelectorAll('[data-mask]').forEach((i) => maskInput(i, i.dataset.mask));

  function validCPF(s) {
    const d = digits(s);
    if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
    const digito = (n) => {                       // calcula o dígito verificador
      let soma = 0;
      for (let i = 0; i < n; i++) soma += Number(d[i]) * (n + 1 - i);
      const r = (soma * 10) % 11;
      return r === 10 ? 0 : r;
    };
    return digito(9) === Number(d[9]) && digito(10) === Number(d[10]);
  }
  function validCNPJ(s) {
    const d = digits(s);
    if (d.length !== 14 || /^(\d)\1{13}$/.test(d)) return false;
    const digito = (n) => {
      const pesos = n === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
      let soma = 0;
      for (let i = 0; i < n; i++) soma += Number(d[i]) * pesos[i];
      const r = soma % 11;
      return r < 2 ? 0 : 11 - r;
    };
    return digito(12) === Number(d[12]) && digito(13) === Number(d[13]);
  }
  const validEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(s).trim());
  const validPhone = (s) => [10, 11].includes(digits(s).length);

  /* ---------- 5) Erro embaixo de um campo ---------- */
  // fieldError(campo, 'mensagem') mostra o erro; fieldError(campo, '') apaga.
  function fieldError(input, msg) {
    const lugar = input.closest('.pw, .with-btn, .with-icon') || input;   // onde o erro entra depois
    let erro = lugar.nextElementSibling;
    if (!(erro && erro.classList.contains('field__err'))) erro = null;

    if (!msg) {                                   // sem mensagem = limpar
      if (erro) erro.remove();
      input.removeAttribute('aria-invalid');
      input.removeAttribute('aria-describedby');
      return;
    }
    if (!erro) {
      erro = document.createElement('p');
      erro.className = 'field__err';
      erro.id = `${input.id || 'campo'}-erro`;
      erro.setAttribute('role', 'alert');
      lugar.insertAdjacentElement('afterend', erro);
    }
    erro.textContent = msg;
    input.setAttribute('aria-invalid', 'true');
    input.setAttribute('aria-describedby', erro.id);
  }
  // Atalho: mostra/limpa o erro e devolve true se o campo está certo
  function check(input, ok, msg) {
    fieldError(input, ok ? '' : msg);
    return ok;
  }
  // Ao digitar num campo com erro, o erro some
  document.addEventListener('input', (e) => {
    if (e.target.matches && e.target.matches('[aria-invalid]')) fieldError(e.target, '');
  });

  /* ---------- 6) Senha e código de 6 dígitos ---------- */
  // Botão do olhinho: <div class="pw"><input type="password"><button class="pw__toggle">
  document.querySelectorAll('.pw__toggle').forEach((btn) => {
    const input = btn.parentElement.querySelector('input');
    btn.addEventListener('click', () => {
      const mostrar = input.type === 'password';
      input.type = mostrar ? 'text' : 'password';
      btn.setAttribute('aria-pressed', String(mostrar));
      btn.setAttribute('aria-label', mostrar ? 'Ocultar senha' : 'Mostrar senha');
      btn.querySelector('use').setAttribute('href', mostrar ? '#i-eye-off' : '#i-eye');
    });
  });

  // Liga as 6 caixinhas do código: avança sozinho, apaga voltando, aceita colar.
  function codeBoxes(caixas) {
    caixas.forEach((caixa, i) => {
      caixa.addEventListener('input', () => {
        caixa.value = digits(caixa.value).slice(-1);
        if (caixa.value && caixas[i + 1]) caixas[i + 1].focus();
      });
      caixa.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && !caixa.value && caixas[i - 1]) { caixas[i - 1].value = ''; caixas[i - 1].focus(); e.preventDefault(); }
        if (e.key === 'ArrowLeft' && caixas[i - 1]) caixas[i - 1].focus();
        if (e.key === 'ArrowRight' && caixas[i + 1]) caixas[i + 1].focus();
      });
      caixa.addEventListener('paste', (e) => {
        const d = digits(e.clipboardData.getData('text')).slice(0, caixas.length);
        if (!d) return;
        e.preventDefault();
        [...d].forEach((c, k) => { caixas[k].value = c; });
        caixas[Math.min(d.length, caixas.length - 1)].focus();
      });
      caixa.addEventListener('focus', () => caixa.select());
    });
    return {
      value: () => caixas.map((c) => c.value).join(''),
      clear: () => { caixas.forEach((c) => { c.value = ''; }); caixas[0].focus(); },
    };
  }

  /* ---------- 7) Perfil salvo no navegador ---------- */
  // Com o backend Flask, troque por GET/PUT /api/perfil.
  const getPerfil = () => { try { return JSON.parse(localStorage.getItem('nf:perfil')) || {}; } catch { return {}; } };
  const setPerfil = (p) => { try { localStorage.setItem('nf:perfil', JSON.stringify(p)); } catch { /* sem armazenamento */ } };
  // Mostra o nome salvo no topo do site (e em qualquer lugar com data-perfil-nome)
  function applyPerfil() {
    const nome = getPerfil().nome;
    if (!nome) return;
    document.querySelectorAll('.account__text b, [data-perfil-nome]').forEach((el) => { el.textContent = nome; });
  }
  applyPerfil();

  /* ---------- 8) Assistente (chat) ---------- */
  const RESPOSTA_PADRAO = 'Ainda estou em fase de testes, mas já posso ajudar com metas, extratos, lucro e preço. Qual deles te interessa?';
  // Cada página troca isto com NF.setAnswerer(funcao). A função pode ser async
  // e chamar o Flask: fetch('/api/chat', ...)
  let responder = () => RESPOSTA_PADRAO;

  // Botões que abrem/fecham o chat: o botão amarelo flutuante (#fab) e/ou qualquer [data-chat-toggle]
  const botoes = [...document.querySelectorAll('#fab, [data-chat-toggle]')];
  const chat = $('#chat'), log = $('#chatLog'), form = $('#chatForm'), campo = $('#chatInput');

  if (botoes.length && chat) {
    chat.inert = true;   // fechado = não recebe foco do teclado

    const abrirFechar = (forcar) => {
      const abrir = forcar ?? !chat.classList.contains('is-open');
      chat.classList.toggle('is-open', abrir);
      chat.inert = !abrir;
      botoes.forEach((b) => {
        b.classList.toggle('is-open', abrir);
        b.classList.remove('is-new');
        b.setAttribute('aria-expanded', String(abrir));
        if (b.classList.contains('fab')) b.setAttribute('aria-label', abrir ? 'Fechar assistente' : 'Abrir assistente');
      });
      if (abrir) setTimeout(() => campo.focus(), 250);
    };
    botoes.forEach((b) => b.addEventListener('click', () => abrirFechar()));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') abrirFechar(false); });

    const novaMensagem = (quem, conteudo) => {
      const p = document.createElement('p');
      p.className = `msg msg--${quem}`;              // msg--user ou msg--bot
      if (conteudo instanceof Node) p.appendChild(conteudo); else p.textContent = conteudo;
      log.appendChild(p);
      log.scrollTop = log.scrollHeight;
      return p;
    };

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const pergunta = campo.value.trim();
      if (!pergunta) return;
      novaMensagem('user', pergunta);
      campo.value = '';

      const pontinhos = document.createElement('span');   // "digitando…"
      pontinhos.className = 'typing';
      pontinhos.innerHTML = '<span></span><span></span><span></span>';
      const balao = novaMensagem('bot', pontinhos);

      const espera = new Promise((ok) => setTimeout(ok, reduce ? 0 : 900));
      try {
        const [texto] = await Promise.all([Promise.resolve(responder(pergunta)), espera]);
        balao.textContent = texto || RESPOSTA_PADRAO;
      } catch {
        balao.textContent = 'Não consegui responder agora. Tente de novo em instantes.';
      }
      log.scrollTop = log.scrollHeight;
    });
  }

  window.NF = {
    reduce, brl, brl0, pct, signed, num, parseMoney, tween, toast,
    digits, validCPF, validCNPJ, validEmail, validPhone,
    fieldError, check, codeBoxes, getPerfil, setPerfil, applyPerfil,
    setAnswerer: (fn) => { responder = fn; },
  };
})();
