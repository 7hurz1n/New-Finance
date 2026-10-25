(() => {
  /* ============ 1. Atalhos e configurações ============ */
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  const LOGIN_URL = 'login.html';   // para onde voltar depois de redefinir a senha

  /* ============ 2. Funções de apoio ============ */
  // Aviso que aparece na parte de baixo da tela
  const toast = $('#toast');
  let toastTimer;
  const showToast = (msg, isError = false) => {
    toast.textContent = msg;
    toast.classList.toggle('error', isError);
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 3200);
  };

  // Marca (ou limpa) o erro de um campo, com a animação de tremer
  const flagError = (field, bad) => {
    field.classList.toggle('has-error', bad);
    if (bad) { field.classList.remove('shake'); void field.offsetWidth; field.classList.add('shake'); }
  };

  // Liga o estado "carregando" no botão, espera um pouco e executa a ação
  const withLoading = (btn, action, ms = 700) => {
    const span = $('span', btn), txt = span.textContent;
    btn.classList.add('is-loading'); span.textContent = 'Aguarde…';
    setTimeout(() => { btn.classList.remove('is-loading'); span.textContent = txt; action(); }, ms);
  };

  const emailOk = v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

  /* ============ 3. Animação ao carregar ============ */
  window.addEventListener('load', () => $('[data-reveal]').classList.add('is-in'));

  /* ============ 4. Troca entre as 2 telas ============ */
  const views = $$('.view');
  const goView = (n, back = false) => {
    views.forEach(v => {
      const on = Number(v.dataset.view) === n;
      v.classList.toggle('is-active', on);
      v.classList.toggle('is-back', on && back);
    });
    const first = $('.view.is-active input:not(:disabled)');
    if (first) setTimeout(() => first.focus({ preventScroll: true }), 300);
  };
  $('#backToVerify').addEventListener('click', () => goView(1, true));

  /* ============ 5. TELA 1: e-mail + código ============ */
  const formVerify = $('#formVerify');
  const email = $('#email');
  const otp = $$('#otp input');
  const lead = $('#verifyLead');
  const resend = $('#resend');
  let codeSent = false;          // false = ainda vai pedir o e-mail | true = já enviou o código

  // Liga ou desliga as caixinhas do código
  const setOtpEnabled = on => otp.forEach(b => { b.disabled = !on; if (!on) b.value = ''; });

  // "Reenviar código" com espera de 30 segundos
  let cooldown;
  const startCooldown = (sec = 30) => {
    clearInterval(cooldown);
    const tick = () => {
      resend.textContent = sec > 0 ? `Reenviar código (${sec}s)` : 'Reenviar código';
      resend.disabled = sec > 0;
      if (sec-- <= 0) clearInterval(cooldown);
    };
    tick(); cooldown = setInterval(tick, 1000);
  };

  // Se a pessoa mudar o e-mail depois de enviar o código, volta ao início
  email.addEventListener('input', () => {
    email.closest('.field').classList.remove('has-error');
    if (codeSent) {
      codeSent = false;
      setOtpEnabled(false);
      resend.hidden = true;
      lead.textContent = 'Insira seu e-mail cadastrado para receber o código';
    }
  });

  // Caixinhas do código: pulam sozinhas, voltam com Backspace, aceitam colar
  otp.forEach((box, i) => {
    box.addEventListener('input', () => {
      box.closest('.field').classList.remove('has-error');
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

  // Envia o código (TODO: troque pela chamada real à sua API)
  const sendCode = () => {
    codeSent = true;
    setOtpEnabled(true);
    resend.hidden = false;
    startCooldown();
    lead.textContent = `Enviamos um código para ${email.value}`;
    showToast('Código enviado! Confira seu e-mail.');
    otp[0].focus();
  };

  resend.addEventListener('click', () => { showToast('Código reenviado!'); startCooldown(); });

  // O mesmo botão "Continuar" faz duas coisas, dependendo do momento
  formVerify.addEventListener('submit', e => {
    e.preventDefault();
    const btn = $('[type="submit"]', formVerify);

    if (!codeSent) {
      // 1º clique: valida o e-mail e envia o código
      const bad = !emailOk(email.value);
      flagError(email.closest('.field'), bad);
      if (bad) return showToast('Confira o e-mail digitado.', true);
      withLoading(btn, sendCode);
    } else {
      // 2º clique: valida o código e vai para a tela da nova senha
      const code = otp.map(b => b.value).join('');
      const bad = code.length < 6;
      flagError($('#otp').closest('.field'), bad);
      if (bad) return showToast('Digite os 6 dígitos do código.', true);
      // TODO: valide o código de verdade no servidor
      withLoading(btn, () => goView(2));
    }
  });

  /* ============ 6. TELA 2: nova senha ============ */
  const formNew = $('#formNew');
  const pass1 = $('#pass1'), pass2 = $('#pass2');

  // Mostrar / ocultar senha
  $$('.eye').forEach(btn => btn.addEventListener('click', () => {
    const input = $('input', btn.parentElement);
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    $('use', btn).setAttribute('href', show ? '#i-eye' : '#i-eye-off');
    btn.setAttribute('aria-label', show ? 'Ocultar senha' : 'Mostrar senha');
  }));

  [pass1, pass2].forEach(i => i.addEventListener('input', () => i.closest('.field').classList.remove('has-error')));

  formNew.addEventListener('submit', e => {
    e.preventDefault();
    const bad1 = pass1.value.length < 6;
    const bad2 = pass1.value !== pass2.value;
    flagError(pass1.closest('.field'), bad1);
    flagError(pass2.closest('.field'), !bad1 && bad2);   // só compara se a 1ª estiver correta
    if (bad1 || bad2) return showToast('Confira os campos destacados.', true);

    // TODO: envie a nova senha para a sua API
    withLoading($('[type="submit"]', formNew), () => {
      showToast('Senha redefinida com sucesso!');
      setTimeout(() => { window.location.href = LOGIN_URL; }, 1200);
    }, 900);
  });

  /* ============ 7. Assistente flutuante ============ */
  const chat = $('#chat'), fab = $('#fab'), chatBody = $('#chatBody'), chatInput = $('#chatInput');

  const toggleChat = (open = !chat.classList.contains('is-open')) => {
    chat.classList.toggle('is-open', open);
    chat.setAttribute('aria-hidden', !open);
    if (open) setTimeout(() => chatInput.focus(), 250);
  };
  fab.addEventListener('click', () => toggleChat());
  $('#openChatLink').addEventListener('click', e => { e.preventDefault(); toggleChat(true); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') toggleChat(false); });
  document.addEventListener('click', e => {            // clicar fora fecha o chat
    if (!chat.contains(e.target) && !fab.contains(e.target) && !$('#openChatLink').contains(e.target)) toggleChat(false);
  });

  const addMsg = (text, who) => {
    const p = document.createElement('p');
    p.className = `msg msg--${who}`;
    p.textContent = text;
    chatBody.appendChild(p);
    chatBody.scrollTo({ top: chatBody.scrollHeight, behavior: 'smooth' });
  };
  $('#chatForm').addEventListener('submit', e => {
    e.preventDefault();
    const text = chatInput.value.trim();
    if (!text) return;
    addMsg(text, 'user');
    chatInput.value = '';
    // TODO: conecte aqui a sua IA
    setTimeout(() => addMsg('Obrigado pela mensagem! Em breve conectamos você a uma resposta completa.', 'bot'), 700);
  });
})();
