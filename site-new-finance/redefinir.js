/* =====================================================================
   redefinir.js — redefinição de senha em 2 passos
   Passo 1: e-mail + código recebido      Passo 2: nova senha
   O envio do código é simulado. Com o Flask, troque os trechos marcados.
   ===================================================================== */
(() => {
  'use strict';

  const { validEmail, check, toast, codeBoxes, setAnswerer } = window.NF;
  const $ = (s) => document.querySelector(s);

  const passo1 = $('#passo1');
  const passo2 = $('#passo2');
  const email = $('#email');
  const dica = $('#dica');
  const codigo = codeBoxes([...document.querySelectorAll('#codigo input')]);
  let codigoEnviado = false;

  // Mostra um passo e esconde o outro
  function mostrar(passo) {
    passo1.classList.toggle('is-active', passo === 1);
    passo2.classList.toggle('is-active', passo === 2);
    $('#titulo').focus();   // leitores de tela leem o título de novo
  }

  /* ----- Passo 1 ----- */
  passo1.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!check(email, validEmail(email.value), 'Digite o e-mail cadastrado.')) return email.focus();

    // Primeiro clique: "envia" o código
    if (!codigoEnviado) {
      codigoEnviado = true;
      /* >>> TROCAR pelo backend: fetch('/api/enviar-codigo', ...) <<< */
      dica.textContent = `Enviamos um código para ${email.value.trim()}. Digite os 6 números acima.`;
      toast('Código enviado para o seu e-mail.');
      codigo.clear();
      return;
    }

    // Segundo clique: confere o código
    const digitado = codigo.value();
    if (digitado.length < 6) {
      dica.textContent = 'Digite os 6 números do código para continuar.';
      dica.classList.add('is-error');
      return;
    }
    dica.classList.remove('is-error');
    /* >>> TROCAR pelo backend: fetch('/api/verificar-codigo', ...) <<< (aqui qualquer código vale) */
    mostrar(2);
  });

  /* ----- Passo 2 ----- */
  passo2.addEventListener('submit', (e) => {
    e.preventDefault();
    const nova = $('#nova');
    const confirma = $('#confirma');
    const ok = [
      check(nova, nova.value.length >= 8, 'A senha precisa ter pelo menos 8 caracteres.'),
      check(confirma, confirma.value === nova.value, 'As senhas não são iguais.'),
    ].every(Boolean);
    if (!ok) return document.querySelector('[aria-invalid]').focus();

    /* >>> TROCAR pelo backend: fetch('/api/nova-senha', ...) <<< */
    toast('Senha alterada! Entre com a nova senha.');
    setTimeout(() => { location.href = 'login.html'; }, 1400);
  });

  setAnswerer((pergunta) => {
    if (/código|codigo|email|e-mail/i.test(pergunta)) return 'Digite o e-mail da sua conta e clique em Continuar. Enviamos um código de 6 números para ele.';
    return null;
  });
})();
