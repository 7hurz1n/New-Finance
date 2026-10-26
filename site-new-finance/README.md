# New Finance — guia do projeto

Site feito só com **HTML, CSS e JavaScript puro** (sem biblioteca). Para ver, abra `login.html` ou `index.html` no navegador.
Para usar no Flask, copie tudo para a pasta `static/` (ou `templates/` + `static/`) e troque os links por `url_for('static', filename='...')`.

## Páginas e quem faz o quê

| Página | HTML | CSS (além de `style.css`) | JS (além de `common.js`) |
|---|---|---|---|
| Login | `login.html` | `auth.css` | `login.js` |
| Cadastro em 6 passos | `cadastro.html` | `auth.css`, `cadastro.css` | `cadastro.js` |
| Redefinir senha | `redefinir.html` | `auth.css` | `redefinir.js` |
| Visão geral (dashboard) | `index.html` | — | `script.js` |
| Calculadora de preço | `calculadora.html` | `calculadora.css` | `calculadora.js` |
| Metas | `metas.html` | `metas.css` | `metas.js` |
| Importar extrato | `importar.html` | `importar.css` | `importar.js` |
| Meu perfil | `perfil.html` | `perfil.css` | `perfil.js` |

- **`style.css`**: cores, cabeçalho, rodapé, botões, campos, janelas, chat. É usado em TODAS as páginas.
- **`common.js`**: funções compartilhadas (dinheiro, contador animado, máscaras de CPF/CNPJ/telefone, validações, avisos, chat). Sempre carregue **antes** do JS da página.

## Cores (mude em um lugar só)

No começo do `style.css`:

```css
--bg: #F0F0F0;     /* fundo claro        -> texto PRETO  */
--ink: #0F0F0F;    /* preto              */
--yellow: #DDCE00; /* botões, destaques  -> texto PRETO  */
--teal: #6CC7BD;   /* detalhes           */
--red: #D25750;    /* perigo / excluir   -> texto PRETO  */
--deep: #0C353C;   /* verde escuro       -> texto BRANCO */
```

### Regra de contraste (para não errar ao editar)
- Fundo **verde escuro** (`--deep`): texto **branco** (ou `#d4e0e1` para textos secundários).
- Fundo **claro** (`--bg`) ou **amarelo**: texto **preto** (`--ink`).
- Botão **vermelho**: texto **preto** (branco ficaria com contraste baixo).
- Textos de ajuda sobre fundo claro usam `#3d4f52`; erros usam `#8f2f29`.
- Nunca use texto branco em fundo claro nem texto preto em fundo verde.
Todas as telas foram conferidas automaticamente (WCAG AA, mínimo 4,5:1 para texto normal).

## Animações (todas respeitam "reduzir movimento" do sistema)
- Entrada dos cartões e painéis (`rise`), janelas e avisos (`pop`).
- Contadores de números (`tween` no `common.js`), anel e barras de progresso (Metas).
- Gráfico do dashboard se desenhando; barras e linha da tela de entrada crescendo.
- Troca de passo no cadastro (`slide`), botão do assistente pulsando, "digitando…" no chat.

## O que ainda é de mentira (trocar quando tiver o backend)
Procure por `>>> TROCAR` nos arquivos JS:
- **Login / cadastro / redefinir senha**: aceitam qualquer dado e o código de 6 dígitos (qualquer um vale). Troque por `fetch` ao Flask.
- **CNAE automático** (cadastro, passo 5): devolve sempre o mesmo exemplo. O certo é o Flask consultar o CNPJ.
- **Dados salvos** (perfil, metas, simulações, contas): ficam no `localStorage` (chaves `nf:perfil`, `nf:metas`, `nf:simulacoes`, `nf:contas`, `nf:sessao`).
- **Envio de extrato**: simulado com barra de progresso (o `fetch` está comentado em `importar.js`).
- **Assistente (chat)**: respostas prontas em cada JS (`setAnswerer`). Pode virar `fetch('/api/chat')`.
- O aviso "Não conseguimos ler o último arquivo" (Importar) só aparece em erro; para ver como ficou no Figma abra `importar.html#erro`.

## Dicas rápidas
- Ver um passo do cadastro direto: `cadastro.html#passo-3`.
- Adicionar um ícone: copie um `<symbol>` do bloco "sprite" no topo de qualquer HTML e use `<svg class="icon"><use href="#i-nome"/></svg>`.
- Mudar um texto do assistente: procure `setAnswerer` no JS da página.
