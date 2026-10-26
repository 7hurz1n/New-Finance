/* =====================================================================
   perfil.js — página "Meu perfil"
   Como funciona:
     • os dados ficam salvos no navegador (localStorage, chave "nf:perfil")
     • cada cartão tem o botão "Editar dados": ele libera os campos;
       clicando de novo ("Salvar dados") valida e salva
     • campo vazio mostra "Não informado" (é o placeholder do input)
   Com o Flask: troque getPerfil/setPerfil por fetch('/api/perfil').
   ===================================================================== */
(() => {
  'use strict';

  const { toast, check, validEmail, validCPF, validCNPJ, validPhone, getPerfil, setPerfil, applyPerfil, setAnswerer } = window.NF;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  const NOME_PADRAO = 'Lucas Oliveira';

  /* ---------- Preencher os campos com o que está salvo ---------- */
  // "area" = a página toda ou só um cartão
  function preencher(area = document) {
    const perfil = getPerfil();
    $$('input[data-key]', area).forEach((input) => {
      const chave = input.dataset.key;
      input.value = perfil[chave] ?? (chave === 'nome' ? NOME_PADRAO : '');
      input.dispatchEvent(new Event('input'));   // aplica a máscara (CPF, telefone...)
    });
    $('#avatarNome').textContent = perfil.nome || NOME_PADRAO;
  }

  /* ---------- Regras de cada campo ---------- */
  // Cada regra devolve true (ok) ou o texto do erro
  const REGRAS = {
    nome:     (v) => v.length >= 3 || 'Informe seu nome completo.',
    email:    (v) => !v || validEmail(v) || 'Digite um e-mail válido.',
    cpf:      (v) => !v || validCPF(v) || 'CPF inválido. Confira os números.',
    telefone: (v) => !v || validPhone(v) || 'Digite o telefone com DDD.',
    cnpj:     (v) => !v || validCNPJ(v) || 'CNPJ inválido. Confira os números.',
  };

  /* ---------- Editar / salvar cada cartão ---------- */
  $$('.pcard').forEach((cartao) => {
    const campos = $$('input[data-key]', cartao);
    const botaoEditar = $('[data-edit]', cartao);
    const botaoCancelar = $('[data-cancel]', cartao);

    // Liga/desliga o modo de edição
    function editando(sim) {
      cartao.classList.toggle('is-editing', sim);
      campos.forEach((c) => { c.readOnly = !sim; check(c, true, ''); });
      botaoCancelar.hidden = !sim;
      $('span', botaoEditar).textContent = sim ? 'Salvar dados' : 'Editar dados';
      $('use', botaoEditar).setAttribute('href', sim ? '#i-check' : '#i-edit');
      if (sim) campos[0].focus();
    }

    function salvar() {
      // confere todos os campos do cartão
      let tudoCerto = true;
      campos.forEach((c) => {
        const regra = REGRAS[c.dataset.key];
        const resultado = regra ? regra(c.value.trim()) : true;
        check(c, resultado === true, resultado);
        if (resultado !== true) tudoCerto = false;
      });
      if (!tudoCerto) return $('[aria-invalid]', cartao).focus();

      // monta { nome: '...', cpf: '...' } e junta com o que já estava salvo
      const novos = Object.fromEntries(campos.map((c) => [c.dataset.key, c.value.trim()]));
      setPerfil({ ...getPerfil(), ...novos });
      applyPerfil();          // atualiza o nome no topo do site
      preencher(cartao);
      editando(false);
      toast('Dados atualizados.');
    }

    botaoEditar.addEventListener('click', () => (cartao.classList.contains('is-editing') ? salvar() : editando(true)));
    botaoCancelar.addEventListener('click', () => { preencher(cartao); editando(false); });
  });

  /* ---------- Atalhos "Nesta página" ---------- */
  $$('.pnav a').forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const alvo = $(link.getAttribute('href'));
      alvo.scrollIntoView({ behavior: window.NF.reduce ? 'auto' : 'smooth', block: 'center' });
      $$('.pnav a').forEach((a) => a.removeAttribute('aria-current'));
      link.setAttribute('aria-current', 'true');
      alvo.classList.remove('is-pulse');
      void alvo.offsetWidth;            // reinicia a animação
      alvo.classList.add('is-pulse');
    });
  });

  // Botões (i): mostram uma explicação curta
  $$('.infobtn').forEach((b) => b.addEventListener('click', () => toast(b.dataset.info)));

  /* ---------- Sair e excluir a conta ---------- */
  function apagar(chaves) {
    [localStorage, sessionStorage].forEach((storage) => {
      try { Object.keys(storage).filter(chaves).forEach((k) => storage.removeItem(k)); } catch { /* sem armazenamento */ }
    });
  }
  $('#sair').addEventListener('click', () => {
    apagar((k) => k === 'nf:sessao');   // só encerra a sessão
    location.href = 'login.html';
  });
  $('#excluir').addEventListener('click', () => $('#dlgExcluir').showModal());
  $('#confirmaExcluir').addEventListener('click', () => {
    apagar((k) => k.startsWith('nf:'));   // apaga tudo do New Finance
    location.href = 'login.html';
  });

  // Fechar janelas (botão X, Cancelar ou clique fora)
  $$('[data-close]').forEach((b) => b.addEventListener('click', () => b.closest('dialog').close()));
  $$('.modal').forEach((d) => d.addEventListener('click', (e) => { if (e.target === d) d.close(); }));

  /* ---------- Assistente ---------- */
  setAnswerer((pergunta) => {
    if (/cpf|cnpj|cnae/i.test(pergunta)) return 'Esses dados são opcionais. Clique em Editar dados no cartão para preencher agora ou deixe para depois.';
    if (/excluir|apagar/i.test(pergunta)) return 'Para excluir a conta, use o botão vermelho no fim da página. Antes de apagar, vamos pedir sua confirmação.';
    return null;
  });

  preencher();
})();
