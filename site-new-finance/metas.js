(() => {
  'use strict';

  const { brl, num, tween, setAnswerer, parseMoney, toast } = window.NF;
  const $ = (s, r = document) => r.querySelector(s);
  const KEY = 'nf:metas';   // troque por chamadas ao Flask (GET/POST /api/metas) quando tiver o backend

  /* A primeira meta da lista é a "meta em destaque". `unidade` = meta medida em etapas, não em R$. */
  const DEFAULTS = [
    { id: 1, nome: 'Aumentar o lucro', desc: 'Um objetivo claro ajuda você a decidir melhor e a fazer seu negócio crescer.', alvo: 2000, atual: 1200, prazo: '2026-10-31', icon: 'trend' },
    { id: 2, nome: 'Criar uma reserva do negócio', alvo: 5000, atual: 3000, prazo: '2026-12-31', icon: 'coins' },
    { id: 3, nome: 'Concluir minha trilha de aprendizado', alvo: 4, atual: 1, prazo: '', icon: 'cap', unidade: 'módulos' },
  ];

  const load = () => {
    try { const v = JSON.parse(localStorage.getItem(KEY)); if (Array.isArray(v) && v.length) return v; } catch { /* usa o padrão */ }
    return structuredClone(DEFAULTS);
  };
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(goals)); } catch { /* sem armazenamento */ } };
  let goals = load();

  /* ---------- Helpers ---------- */
  const el = (tag, cls, text) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  };
  const icon = (id) => {
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    const use = document.createElementNS(NS, 'use');
    svg.setAttribute('class', 'icon');
    use.setAttribute('href', `#i-${id}`);
    svg.appendChild(use);
    return svg;
  };
  const curOf = (g) => (g.unidade ? num : brl);                                        // valor atual: "1" ou "R$ 1.200,00"
  const fullOf = (g) => (g.unidade ? (n) => `${num(n)} ${g.unidade}` : brl);         // com unidade: "4 módulos"
  const fieldOf = (g, n) => (g && g.unidade ? String(n) : brl(n));
  const pctOf = (g) => (g.alvo > 0 ? Math.min(100, Math.round((g.atual / g.alvo) * 100)) : 0);
  const pctTxt = (v) => `${Math.round(v)}%`;
  const prazoLabel = (iso) => {
    if (!iso) return 'Sem prazo definido';
    const [y, m, d] = iso.split('-').map(Number);
    return 'Prazo: ' + new Date(y, m - 1, d).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  /* ---------- Renderização ---------- */
  function renderFeature() {
    const g = goals[0], cur = curOf(g), full = fullOf(g), p = pctOf(g);
    $('#fTitulo').textContent = g.nome;
    $('#fDesc').textContent = g.desc || '';
    $('#fDesc').hidden = !g.desc;
    tween($('#fAtual'), g.atual, cur);
    $('#fAlvo').textContent = `de ${full(g.alvo)}`;
    const falta = g.atual >= g.alvo ? 'Meta concluída' : `Falta ${full(g.alvo - g.atual)}`;
    $('#fMeta').textContent = `${falta} • ${prazoLabel(g.prazo)}`;
    tween($('#fPct'), p, pctTxt, 1000);
    requestAnimationFrame(() => { $('#fBar').style.width = `${p}%`; });
    $('#fRing').setAttribute('aria-label', `${p}% do caminho`);
    requestAnimationFrame(() => { $('#fArc').style.strokeDashoffset = 100 - p; });
  }

  function renderGoals() {
    const box = $('#goals');
    box.replaceChildren();
    goals.slice(1).forEach((g, i) => {
      const p = pctOf(g);
      const card = el('article', 'goal');
      card.style.setProperty('--i', i);

      const top = el('div', 'goal__top');
      const ic = el('i', 'goal__icon');
      ic.appendChild(icon(g.icon || 'target'));
      const pc = el('span', 'goal__pct', '0%');
      top.append(ic, pc);

      const bar = el('div', 'progress');
      const fill = el('span');
      bar.setAttribute('role', 'progressbar');
      bar.setAttribute('aria-label', `Progresso de ${g.nome}`);
      bar.setAttribute('aria-valuemin', '0');
      bar.setAttribute('aria-valuemax', '100');
      bar.setAttribute('aria-valuenow', String(p));
      bar.appendChild(fill);

      const btn = el('button', 'btn btn--sm', 'Ver detalhes ');
      btn.type = 'button';
      btn.appendChild(icon('arrow'));
      btn.addEventListener('click', () => openEdit(g.id));

      card.append(top, el('h3', null, g.nome), el('p', 'goal__sub', `${curOf(g)(g.atual)} de ${fullOf(g)(g.alvo)}`), bar, el('p', 'goal__foot', prazoLabel(g.prazo)), btn);
      box.appendChild(card);

      tween(pc, p, pctTxt, 1000);
      requestAnimationFrame(() => requestAnimationFrame(() => { fill.style.width = `${p}%`; }));
    });
  }

  function renderStats() {
    const done = goals.filter((g) => pctOf(g) >= 100).length;
    const int = (v) => String(Math.round(v));
    tween($('#stAndamento'), goals.length - done, int, 700);
    tween($('#stConquistas'), 3 + done, int, 700);   // 3 conquistas fixas + metas concluídas
  }

  function render() { renderFeature(); renderGoals(); renderStats(); }

  /* ---------- Criar / editar meta ---------- */
  const dm = {
    dlg: $('#dlgMeta'), form: $('#formMeta'), title: $('#dmTitle'), nome: $('#mNome'),
    alvo: $('#mAlvo'), atual: $('#mAtual'), prazo: $('#mPrazo'), erro: $('#mErro'), del: $('#mDel'),
  };
  let editing = null;   // meta em edição (null = criando)

  function openEdit(id) {
    editing = id == null ? null : goals.find((g) => g.id === id) || null;
    dm.title.textContent = editing ? 'Editar meta' : 'Nova meta';
    dm.nome.value = editing ? editing.nome : '';
    dm.alvo.value = editing ? fieldOf(editing, editing.alvo) : '';
    dm.atual.value = editing ? fieldOf(editing, editing.atual) : brl(0);
    dm.prazo.value = editing ? editing.prazo : '';
    dm.erro.hidden = true;
    dm.del.hidden = !editing || goals.length < 2;
    dm.dlg.showModal();
  }

  [dm.alvo, dm.atual].forEach((input) => {
    input.addEventListener('focus', () => input.select());
    input.addEventListener('blur', () => {
      if (input.value.trim() && !(editing && editing.unidade)) input.value = brl(parseMoney(input.value));
    });
  });

  function fail(box, msg, field) {
    box.textContent = msg;
    box.hidden = false;
    field.focus();
  }
  function finish(dlg, msg) {
    save();
    dlg.close();
    render();
    toast(msg);
  }
  function celebrate(before, g) {
    return before < 100 && pctOf(g) >= 100 ? 'Meta concluída! Parabéns!' : null;
  }

  dm.form.addEventListener('submit', (e) => {
    e.preventDefault();
    const nome = dm.nome.value.trim();
    const alvo = parseMoney(dm.alvo.value);
    const atual = parseMoney(dm.atual.value);
    if (!nome) return fail(dm.erro, 'Dê um nome para a meta.', dm.nome);
    if (alvo <= 0) return fail(dm.erro, 'Informe um valor maior que zero para a meta.', dm.alvo);

    if (editing) {
      const before = pctOf(editing);
      Object.assign(editing, { nome, alvo, atual, prazo: dm.prazo.value });
      finish(dm.dlg, celebrate(before, editing) || 'Meta atualizada.');
    } else {
      const g = { id: Date.now(), nome, alvo, atual, prazo: dm.prazo.value, icon: 'target' };
      goals.push(g);
      finish(dm.dlg, celebrate(0, g) || 'Meta criada!');
    }
  });

  dm.del.addEventListener('click', () => {
    if (!editing) return;
    goals = goals.filter((g) => g !== editing);
    finish(dm.dlg, 'Meta excluída.');
  });

  $('#novaMeta').addEventListener('click', () => openEdit(null));
  $('#fEdit').addEventListener('click', () => openEdit(goals[0].id));

  /* ---------- Atualizar progresso ---------- */
  const dp = { dlg: $('#dlgProg'), form: $('#formProg'), nome: $('#pNome'), valor: $('#pValor') };
  let progGoal = null;

  $('#fProg').addEventListener('click', () => {
    progGoal = goals[0];
    dp.nome.textContent = `${progGoal.nome} • meta de ${fullOf(progGoal)(progGoal.alvo)}`;
    dp.valor.value = fieldOf(progGoal, progGoal.atual);
    dp.dlg.showModal();
  });
  dp.valor.addEventListener('focus', () => dp.valor.select());
  dp.valor.addEventListener('blur', () => {
    if (dp.valor.value.trim() && !(progGoal && progGoal.unidade)) dp.valor.value = brl(parseMoney(dp.valor.value));
  });
  dp.form.addEventListener('submit', (e) => {
    e.preventDefault();
    const before = pctOf(progGoal);
    progGoal.atual = parseMoney(dp.valor.value);
    finish(dp.dlg, celebrate(before, progGoal) || 'Progresso atualizado.');
  });

  /* ---------- Fechar janelas ---------- */
  document.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => b.closest('dialog').close()));
  document.querySelectorAll('.modal').forEach((d) => d.addEventListener('click', (e) => { if (e.target === d) d.close(); }));

  /* ---------- Assistente: respostas desta página ---------- */
  setAnswerer((q) => {
    q = q.toLowerCase();
    if (/meta|objetivo/.test(q)) return 'Metas pequenas e com prazo funcionam melhor. Em vez de "economizar mais", tente "guardar R$ 300 por mês até dezembro".';
    if (/progresso|atualizar/.test(q)) return 'Clique em Atualizar progresso na meta em destaque e informe quanto você já alcançou. O anel e a barra se ajustam sozinhos.';
    return null;
  });

  render();
})();
