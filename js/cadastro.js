/* =====================================================================
   cadastro.js — cadastro em 6 passos, tudo na mesma página
   Como funciona:
     • cada passo é um <form class="step"> (o último é uma <div>)
     • só o passo com a classe "is-active" aparece
     • a função go(n) troca de passo e atualiza a barra de progresso
     • o que a pessoa digita fica no objeto "data" e é salvo no fim
   Dica para ver um passo direto: cadastro.html#passo-3
   ===================================================================== */
(() => {
  'use strict';

  const { check, validEmail, validPhone, validCNPJ, validCPF, digits, toast, codeBoxes, getPerfil, setPerfil, applyPerfil, setAnswerer } = window.NF;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  const TOTAL = 6;
  const passos = $$('.step');        // as 6 telas
  const tracos = $$('.progress i');  // os 6 tracinhos da barra
  const data = {};                   // guarda o que foi digitado
  let atual = 1;

  /* ---------- Trocar de passo ---------- */
  function go(n, focar = true) {
    atual = Math.min(Math.max(n, 1), TOTAL);
    passos.forEach((p, i) => p.classList.toggle('is-active', i + 1 === atual));
    tracos.forEach((t, i) => t.classList.toggle('is-done', i < atual));
    $('#rotuloPasso').textContent = `Passo ${atual} de ${TOTAL}`;
    history.replaceState(null, '', `#passo-${atual}`);

    if (atual === 2) iniciarContagem();
    if (focar) $('h2', passos[atual - 1]).focus();   // leitores de tela leem o título novo
  }
  $$('[data-back]').forEach((b) => b.addEventListener('click', () => go(atual - 1)));

  // Mostra o primeiro erro de um formulário
  const focarErro = (form) => $('[aria-invalid]', form).focus();

  /* ---------- Passo 1: dados básicos ---------- */
  $('#step1').addEventListener('submit', (e) => {
    e.preventDefault();
    const f = e.target;
    const ok = [
      check(f.nome, f.nome.value.trim().length >= 3, 'Informe seu nome completo.'),
      check(f.email, validEmail(f.email.value), 'Digite um e-mail válido.'),
      check(f.tel, !f.tel.value || validPhone(f.tel.value), 'Digite o telefone com DDD.'),
      check(f.senha, f.senha.value.length >= 8, 'A senha precisa ter pelo menos 8 caracteres.'),
      check(f.concordoTermos, f.concordoTermos.checked, 'Você precisa concordar com os termos para continuar.'),
    ].every(Boolean);
    if (!ok) return focarErro(f);

    Object.assign(data, { 
      nome: f.nome.value.trim(), 
      email: f.email.value.trim(), 
      telefone: f.tel.value,
      quebrarSenhaAutomatica: f.quebrarSenhaAutomatica.checked 
    });
    
    $('#textoCodigo').textContent = `Enviamos um código para ${data.email}. Isso ajuda a manter sua conta segura.`;
    go(2);
  });

  /* ---------- Passo 2: código de 6 dígitos ---------- */
  const codigo = codeBoxes($$('#codigo input'));
  const dicaCodigo = $('#dicaCodigo');
  const reenviar = $('#reenviar');
  let contador;

  // "Reenviar código" fica desligado por 30 segundos
  function iniciarContagem() {
    clearInterval(contador);
    let faltam = 30;
    const atualizar = () => {
      reenviar.disabled = faltam > 0;
      reenviar.textContent = faltam > 0 ? `Reenviar código em ${faltam}s` : 'Reenviar código';
      if (faltam <= 0) clearInterval(contador);
      faltam--;
    };
    atualizar();
    contador = setInterval(atualizar, 1000);
  }
  reenviar.addEventListener('click', () => {
    toast('Enviamos um novo código.');
    codigo.clear();
    iniciarContagem();
  });

  $('#step2').addEventListener('submit', (e) => {
    e.preventDefault();
    if (codigo.value().length < 6) {
      dicaCodigo.textContent = 'Digite os 6 números do código para continuar.';
      dicaCodigo.classList.add('is-error');
      return;
    }
    dicaCodigo.classList.remove('is-error');
    /* >>> TROCAR pelo backend: fetch('/api/verificar-codigo', ...) <<< (aqui qualquer código vale) */
    go(3);
  });

  /* ---------- Passo 3: CPF (opcional) ---------- */
  $('#step3').addEventListener('submit', (e) => {
    e.preventDefault();
    const cpf = $('#cpf');
    if (!check(cpf, !cpf.value || validCPF(cpf.value), 'CPF inválido. Confira os números.')) return cpf.focus();
    data.cpf = cpf.value;
    go(4);
  });

  /* ---------- Passo 4: o negócio ---------- */
  $('#step4').addEventListener('submit', (e) => {
    e.preventDefault();
    const negocio = $('#negocio');
    if (!check(negocio, negocio.value.trim().length >= 2, 'Informe o nome do seu negócio.')) return negocio.focus();
    data.negocio = negocio.value.trim();
    data.descricao = $('#descricao').value.trim();
    go(5);
  });

  /* ---------- Passo 5: CNPJ e CNAE (opcionais) ---------- */
  const cnpj = $('#cnpj');
  const cnaeInput = $('#cnaeInput');
  const cnae = { codigo: '', nome: '', auto: false };

  function mostrarCnae() {
    $('#cnaeCodigo').textContent = cnae.codigo;
    $('#cnaeNome').textContent = cnae.nome || (cnae.codigo ? '' : 'Será preenchido ao informar o CNPJ.');
    $('#cnaeBadge').hidden = !cnae.auto;
  }

  // DEMONSTRAÇÃO: devolve sempre o mesmo CNAE de exemplo, depois de 0,7 s.
  // >>> TROCAR pelo backend: o Flask consulta o CNPJ (ex.: BrasilAPI) e devolve o CNAE verdadeiro <<<
  function buscarCnae() {
    $('#cnaeNome').textContent = 'Buscando…';
    setTimeout(() => {
      Object.assign(cnae, { codigo: '9602-5/01', nome: 'Cabeleireiros, manicures e pedicures', auto: true });
      mostrarCnae();
    }, 700);
  }

  // Busca sozinho quando o CNPJ completo (e válido) é digitado
  cnpj.addEventListener('input', () => {
    if (cnpj.value.length === 18 && validCNPJ(cnpj.value) && cnaeInput.hidden) buscarCnae();
  });
  $('#buscar').addEventListener('click', () => {
    if (check(cnpj, validCNPJ(cnpj.value), 'CNPJ inválido. Digite os 14 números.')) buscarCnae();
  });

  // "Editar CNAE manualmente": troca a caixinha por um campo para digitar
  $('#cnaeEditar').addEventListener('click', () => {
    cnaeInput.hidden = false;
    cnaeInput.value = cnae.codigo;
    $('#cnaeBox').hidden = true;
    $('#cnaeBadge').hidden = true;
    $('#cnaeDica').textContent = 'Digite os 7 números do CNAE do seu negócio.';
    $('#cnaeEditar').hidden = true;
    cnaeInput.focus();
  });

  const textoCnae = () => (cnaeInput.hidden ? [cnae.codigo, cnae.nome].filter(Boolean).join(' — ') : cnaeInput.value);

  function finalizar(comDados) {
    if (comDados) {
      const ok = [
        check(cnpj, !cnpj.value || validCNPJ(cnpj.value), 'CNPJ inválido. Confira os números.'),
        check(cnaeInput, cnaeInput.hidden || !cnaeInput.value || digits(cnaeInput.value).length === 7, 'O CNAE tem 7 números.'),
      ].every(Boolean);
      if (!ok) return focarErro($('#step5'));
      data.cnpj = cnpj.value;
      data.cnae = textoCnae();
    }
    salvar();
    go(6);
  }
  $('#step5').addEventListener('submit', (e) => { e.preventDefault(); finalizar(true); });
  $('#depois').addEventListener('click', () => finalizar(false));

  // Guarda no navegador (só o que foi preenchido). Com o Flask: fetch('/api/cadastro', ...)
  function salvar() {
    const perfil = getPerfil();
    Object.entries(data).forEach(([chave, valor]) => { if (valor) perfil[chave] = valor; });
    setPerfil(perfil);
    try { localStorage.setItem('nf:sessao', JSON.stringify({ email: data.email || '' })); } catch { /* sem armazenamento */ }
    applyPerfil();
  }

  /* ---------- Começa no passo da URL (#passo-3) ou no 1 ---------- */
  const url = location.hash.match(/^#passo-([1-6])$/);
  go(url ? Number(url[1]) : 1, false);

  setAnswerer((pergunta) => {
    if (/cpf/i.test(pergunta)) return 'Usamos o CPF só para confirmar sua identidade como MEI. É opcional e você pode preencher depois.';
    if (/cnpj|cnae/i.test(pergunta)) return 'O CNPJ identifica seu negócio e o CNAE é a atividade principal dele. Os dois são opcionais agora.';
    return null;
  });
})();
