/* =====================================================================
   login.js — tela de entrada
   Por enquanto o login é de mentira (aceita qualquer e-mail e senha).
   Com o backend Flask, troque o trecho marcado por um fetch('/api/login').
   ===================================================================== */
(() => {
  'use strict';

  const { validEmail, check, setAnswerer } = window.NF;
  const form = document.querySelector('#loginForm');
  const email = document.querySelector('#email');
  const senha = document.querySelector('#senha');
  const botao = document.querySelector('#entrar');

  form.addEventListener('submit', (e) => {
    e.preventDefault();   // não deixa o navegador recarregar a página

    // 1) confere os campos (check mostra o erro embaixo do campo, se houver)
    const ok = [
      check(email, validEmail(email.value), 'Digite um e-mail válido.'),
      check(senha, senha.value.length > 0, 'Digite sua senha.'),
    ].every(Boolean);
    if (!ok) return document.querySelector('[aria-invalid]').focus();

    // 2) "entra" na conta
    botao.disabled = true;
    botao.firstChild.textContent = 'Entrando… ';

    /* >>> TROCAR pelo backend: fetch('/api/login', { method: 'POST', body: ... }) <<< */
    const onde = document.querySelector('#lembrar').checked ? localStorage : sessionStorage;   // "Manter conectado"
    try { onde.setItem('nf:sessao', JSON.stringify({ email: email.value.trim() })); } catch { /* sem armazenamento */ }

    setTimeout(() => { location.href = 'index.html'; }, 700);
  });

  // Respostas do assistente nesta página
  setAnswerer((pergunta) => {
    if (/senha/i.test(pergunta)) return 'Clique em "Esqueci minha senha" para receber um código no seu e-mail e criar uma nova senha.';
    if (/conta|cadastr|começar/i.test(pergunta)) return 'Para criar sua conta, clique em "Quero começar". São só 6 passos rápidos.';
    return null;
  });
})();
