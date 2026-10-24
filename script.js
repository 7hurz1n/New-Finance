(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  // Para onde ir depois do login (ajuste para a sua tela inicial)
  const HOME_URL = 'inicio.html';        // depois do login
  const AFTER_SIGNUP_URL = 'importar.html'; // depois do cadastro (passo 6)

  /* ---------- Fade-in ao carregar ---------- */
  window.addEventListener('load', () => {
    $$('[data-reveal]').forEach((el, i) => setTimeout(() => el.classList.add('is-in'), 120 + i * 160));
  });

  /* ---------- Toast ---------- */
  const toast = $('#toast');
  let toastTimer;
  const showToast = (msg, isError = false) => {
    toast.textContent = msg;
    toast.classList.toggle('error', isError);
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 3200);
  };

  /* ---------- Troca entre LOGIN e CADASTRO ---------- */
  const viewLogin = $('#viewLogin');
  const viewWizard = $('#viewWizard');
  const tabs = $$('.tab');
  const forms = $$('#viewLogin .form');

  const showLogin = () => {
    viewWizard.hidden = true;
    viewLogin.hidden = false;
    viewLogin.animate([{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { duration: 400, easing: 'ease-out' });
  };
  const showRegister = () => {
    viewLogin.hidden = true;
    viewWizard.hidden = false;
    goStep(1);
  };
  tabs.forEach(t => t.addEventListener('click', () => {
    tabs.forEach(x => { x.classList.toggle('is-active', x === t); x.setAttribute('aria-selected', x === t); });
    if (t.dataset.tab === 'register') showRegister();
  }));
  $$('[data-goto]').forEach(a => a.addEventListener('click', e => {
    e.preventDefault();
    if (a.dataset.goto === 'register') showRegister();
  }));

  /* ---------- Mostrar / ocultar senha ---------- */
  $$('.eye:not(#cnpjSearch)').forEach(btn => btn.addEventListener('click', () => {
    const input = $('input', btn.parentElement);
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    $('use', btn).setAttribute('href', show ? '#i-eye' : '#i-eye-off');
    btn.setAttribute('aria-label', show ? 'Ocultar senha' : 'Mostrar senha');
  }));

  /* ---------- Validação + envio ---------- */
  const validators = {
    email: v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
    password: v => v.length >= 6,
    text: v => v.trim().length >= 2,
  };

  forms.forEach(form => {
    const fields = $$('.field', form);

    fields.forEach(f => $('input', f).addEventListener('input', () => f.classList.remove('has-error')));

    form.addEventListener('submit', e => {
      e.preventDefault();
      let ok = true;

      fields.forEach(f => {
        const input = $('input', f);
        const ac = input.getAttribute('autocomplete') || '';
        const kind = ac.includes('password') ? 'password' : ac === 'email' ? 'email' : 'text';
        const valid = validators[kind](input.value);
        f.classList.toggle('has-error', !valid);
        if (!valid) {
          ok = false;
          f.classList.remove('shake');
          void f.offsetWidth; // reinicia a animação
          f.classList.add('shake');
        }
      });
      if (!ok) { showToast('Confira os campos destacados.', true); return; }

      const btn = $('.btn', form);
      const label = $('span', btn);
      const original = label.textContent;
      btn.classList.add('is-loading');
      label.textContent = 'Aguarde…';

      // TODO: troque este setTimeout pela chamada real à sua API
      setTimeout(() => {
        btn.classList.remove('is-loading');
        label.textContent = original;
        showToast(form.dataset.panel === 'login' ? 'Bem-vindo de volta!' : 'Conta criada com sucesso!');
        setTimeout(() => { window.location.href = HOME_URL; }, 900);
      }, 1200);
    });
  });

  /* ============ CADASTRO EM 6 PASSOS ============ */
  const steps = $$('#viewWizard .step');
  const bar = $$('#progressBar i');
  const label = $('#stepLabel');
  let current = 1;

  // Mostra o passo n (e atualiza a barra de progresso)
  function goStep(n, back = false) {
    current = n;
    steps.forEach(st => {
      const on = Number(st.dataset.step) === n;
      st.classList.toggle('is-active', on);
      st.classList.toggle('is-back', on && back);
    });
    bar.forEach((b, i) => b.classList.toggle('is-done', i < n));
    label.textContent = `Passo ${n} de 6`;
    const first = $('.step.is-active input:not([readonly]), .step.is-active textarea');
    if (first) setTimeout(() => first.focus({ preventScroll: true }), 300);
    if (n === 2) startCooldown();
  }

  // Botões "Voltar"
  $$('[data-back]').forEach(b => b.addEventListener('click', () => {
    if (b.dataset.back === 'login') {
      tabs.forEach(x => { x.classList.toggle('is-active', x.dataset.tab === 'login'); x.setAttribute('aria-selected', x.dataset.tab === 'login'); });
      showLogin();
    } else goStep(current - 1, true);
  }));

  // Máscaras (formatação automática enquanto digita)
  const masks = {
    phone: v => { v = v.replace(/\D/g, '').slice(0, 11);
      return v.length > 10 ? v.replace(/(\d\d)(\d{5})(\d{0,4})/, '($1) $2-$3')
           : v.length > 6 ? v.replace(/(\d\d)(\d{4})(\d{0,4})/, '($1) $2-$3')
           : v.length > 2 ? v.replace(/(\d\d)(\d{0,5})/, '($1) $2') : v; },
    cpf: v => v.replace(/\D/g, '').slice(0, 11).replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2'),
    cnpj: v => v.replace(/\D/g, '').slice(0, 14).replace(/(\d{2})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1/$2').replace(/(\d{4})(\d{1,2})$/, '$1-$2'),
  };
  $$('[data-mask]').forEach(i => i.addEventListener('input', () => { i.value = masks[i.dataset.mask](i.value); }));

  // Validação de CPF (dígitos verificadores)
  const cpfOk = v => {
    v = v.replace(/\D/g, '');
    if (v.length !== 11 || /^(\d)\1+$/.test(v)) return false;
    const dv = n => { let sum = 0; for (let i = 0; i < n; i++) sum += v[i] * (n + 1 - i); const r = (sum * 10) % 11; return r === 10 ? 0 : r; };
    return dv(9) === +v[9] && dv(10) === +v[10];
  };

  const rules = {
    name: v => v.trim().split(/\s+/).length >= 2,
    email: v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
    password: v => v.length >= 6,
    text: v => v.trim().length >= 2,
    phone: v => v === '' || v.replace(/\D/g, '').length >= 10,
    cpf: v => v === '' || cpfOk(v),
    cnpj: v => v === '' || v.replace(/\D/g, '').length === 14,
  };

  const flagError = (field, bad) => {
    field.classList.toggle('has-error', bad);
    if (bad) { field.classList.remove('shake'); void field.offsetWidth; field.classList.add('shake'); }
  };

  // Cada passo: valida e avança
  $$('#viewWizard form.step').forEach(form => {
    $$('input, textarea', form).forEach(i => i.addEventListener('input', () => i.closest('.field')?.classList.remove('has-error')));

    form.addEventListener('submit', e => {
      e.preventDefault();
      let ok = true;

      $$('[data-v]', form).forEach(input => {
        const bad = !rules[input.dataset.v](input.value);
        flagError(input.closest('.field'), bad);
        if (bad) ok = false;
      });

      if (current === 2) {
        const code = $$('.otp input', form).map(i => i.value).join('');
        const bad = code.length < 6;
        flagError($('.otp', form).closest('.field'), bad);
        if (bad) ok = false;
        // TODO: valide o código de verdade no servidor
      }

      if (!ok) { showToast('Confira os campos destacados.', true); return; }

      const btn = $('.btn', form), span = $('span', btn), txt = span.textContent;
      btn.classList.add('is-loading'); span.textContent = 'Aguarde…';
      setTimeout(() => {   // TODO: aqui você pode salvar os dados (API) antes de avançar
        btn.classList.remove('is-loading'); span.textContent = txt;
        goStep(current + 1);
      }, 600);
    });
  });

  // Passo 2: caixinhas do código (pula sozinho, aceita colar)
  const otp = $$('.otp input');
  otp.forEach((box, i) => {
    box.addEventListener('input', () => {
      box.value = box.value.replace(/\D/g, '').slice(-1);
      if (box.value && otp[i + 1]) otp[i + 1].focus();
    });
    box.addEventListener('keydown', e => {
      if (e.key === 'Backspace' && !box.value && otp[i - 1]) otp[i - 1].focus();
      if (e.key === 'ArrowLeft' && otp[i - 1]) otp[i - 1].focus();
      if (e.key === 'ArrowRight' && otp[i + 1]) otp[i + 1].focus();
    });
    box.addEventListener('paste', e => {
      e.preventDefault();
      const digits = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, 6);
      digits.split('').forEach((d, k) => { otp[k].value = d; });
      otp[Math.min(digits.length, 5)].focus();
    });
  });

  // Passo 2: "Reenviar código" com espera de 30s
  const resend = $('#resend');
  let cooldown;
  function startCooldown(sec = 30) {
    clearInterval(cooldown);
    resend.disabled = true;
    const tick = () => { resend.textContent = sec > 0 ? `Reenviar código (${sec}s)` : 'Reenviar código'; resend.disabled = sec > 0; if (sec-- <= 0) clearInterval(cooldown); };
    tick(); cooldown = setInterval(tick, 1000);
  }
  resend.addEventListener('click', () => { showToast('Código reenviado!'); startCooldown(); });

  // Passo 5: CNPJ -> CNAE automático (exemplo ilustrativo, sem consulta real)
  const cnpj = $('#w-cnpj'), cnae = $('#w-cnae'), cnaeDesc = $('#w-cnae-desc');
  const cnaeBox = $('#cnaeBox'), cnaeBadge = $('#cnaeBadge'), cnaeNote = $('#cnaeNote');
  const fillCnae = () => {
    cnae.value = '9602-5/01';
    cnaeDesc.value = 'Cabeleireiros, manicure e pedicure';
    cnaeBadge.hidden = false;
    cnaeBox.classList.remove('is-filled'); void cnaeBox.offsetWidth; cnaeBox.classList.add('is-filled');
  };
  cnpj.addEventListener('input', () => { if (cnpj.value.replace(/\D/g, '').length === 14) fillCnae(); });
  $('#cnpjSearch').addEventListener('click', () => {
    if (cnpj.value.replace(/\D/g, '').length === 14) fillCnae();
    else flagError(cnpj.closest('.field'), true);
  });
  $('#cnaeEdit').addEventListener('click', () => {
    [cnae, cnaeDesc].forEach(i => { i.readOnly = false; i.tabIndex = 0; });
    cnaeBadge.hidden = true;
    cnaeNote.textContent = 'Digite o código e a descrição da sua atividade.';
    cnae.focus();
  });

  // Passo 5: pular
  $('#skipLast').addEventListener('click', () => goStep(6));

  // Passo 6: botão final
  $('#goNext').setAttribute('href', AFTER_SIGNUP_URL);

  /* ---------- Assistente flutuante ---------- */
  const chat = $('#chat'), fab = $('#fab'), body = $('#chatBody'), input = $('#chatInput');
  const toggleChat = (open = !chat.classList.contains('is-open')) => {
    chat.classList.toggle('is-open', open);
    chat.setAttribute('aria-hidden', !open);
    if (open) setTimeout(() => input.focus(), 250);
  };
  fab.addEventListener('click', () => toggleChat());
  $('.chat__close').addEventListener('click', () => toggleChat(false));
  $('#openChatLink').addEventListener('click', e => { e.preventDefault(); toggleChat(true); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') toggleChat(false); });

  const addMsg = (text, who) => {
    const p = document.createElement('p');
    p.className = `msg msg--${who}`;
    p.textContent = text;
    body.appendChild(p);
    body.scrollTo({ top: body.scrollHeight, behavior: 'smooth' });
  };
  $('#chatForm').addEventListener('submit', e => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    addMsg(text, 'user');
    input.value = '';
    // TODO: conecte aqui a sua IA / atendimento
    setTimeout(() => addMsg('Obrigado pela mensagem! Em breve conectamos você a uma resposta completa.', 'bot'), 700);
  });
})();