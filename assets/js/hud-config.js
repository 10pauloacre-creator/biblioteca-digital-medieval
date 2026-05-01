/* ═══════════════════════════════════════════════════════════════
   HUD CONFIG — Biblioteca Digital Medieval
   Modo de configuração visual com autenticação admin.

   Acesso: botão "⚙ Configurar Layout" no sidebar (qualquer conta).
   Requer credenciais admin para ativar.

   Fluxo:
     1. Clica no botão → modal de auth
     2. Verifica email + senha via Supabase (role = admin)
     3. HUD ativo: sidebar vira lista de elementos por categoria
     4. Clica elemento → overlay + painel de valores em tempo real
     5. Arrasta / redimensiona → valores atualizam
     6. Painel mostra CSS pronto para copiar (PC / APP / WEB-MOBILE)
═══════════════════════════════════════════════════════════════ */
(function () {
'use strict';

/* ── Registro de todos os elementos configuráveis ── */
const REGISTRY = [
  {
    cat: 'Avisos',
    icon: '📜',
    items: [
      { key: 'mago-corner',  name: 'Mago — figura do canto',   sel: '#mago-figure'         },
      { key: 'mago-img',     name: 'Aviso — figura do mago',   sel: '#mago-aviso-mago'     },
      { key: 'mago-board',   name: 'Aviso — painel de avisos', sel: '#mago-aviso-board'    },
      { key: 'mago-txt',     name: 'Aviso — caixa de texto',   sel: '#mago-bubble-text', textEdit: true },
      { key: 'mago-ctr',     name: 'Aviso — contador',         sel: '#mago-counter',       textEdit: true },
      { key: 'mago-ok',      name: 'Aviso — botão Entendi',    sel: '#mago-btn-ok'         },
    ]
  },
  {
    cat: 'Ranking do Poder',
    icon: '⚔',
    items: [
      { key: 'rk-strip',    name: 'Tabela lateral de ranking',  sel: '#ranking-strip'                   },
      { key: 'rk-top5',     name: 'Alunos da tabela',           sel: '#ranking-top5'                    },
      { key: 'rk-name-txt',      name: 'Nome do aluno — texto',     sel: '.rk-name',   textEdit: true, multiSel: true },
      { key: 'rk-pts-txt',       name: 'Pontuação — texto',         sel: '.rk-pts',    textEdit: true, multiSel: true },
      { key: 'rk-avatar-sz',     name: 'Foto do perfil — tamanho',  sel: '.rk-avatar', sizeEdit: true, multiSel: true },
      { key: 'rk-explain',       name: 'Modal de explicação',       sel: '#modal-rk-explain .rk-explain-box'},
      { key: 'rk-explain-close', name: 'Explicação — botão fechar', sel: '.rk-explain-close'            },
      { key: 'rk-full-box',      name: 'Modal lista de escudeiros', sel: '#modal-rk-full .rk-modal-box' },
    ]
  },
  {
    cat: 'Landing',
    icon: '🏰',
    items: [
      { key: 'plaque',       name: 'Placa de entrada',       sel: '.plaque-img-wrapper'  },
      { key: 'books-scene',  name: 'Livros das series',      sel: '.books-scene'         },
      { key: 'serie-btn-1',  name: '1a Serie — botao',       sel: '#serie-btn-1'         },
      { key: 'serie-btn-2',  name: '2a Serie — botao',       sel: '#serie-btn-2'         },
      { key: 'serie-btn-3',  name: '3a Serie — botao',       sel: '#serie-btn-3'         },
      { key: 'pilha',        name: 'Pilha de livros',        sel: '.pilha-livros'        },
      { key: 'games-btn',    name: 'Botao sala de jogos',    sel: '#games-btn'           },
    ]
  },
  {
    cat: 'Navegação',
    icon: '🧭',
    items: [
      { key: 'mago-wrapper', name: 'Notificação — ícone mago', sel: '#mago-wrapper'       },
      { key: 'notif-btn',    name: 'Sino de notificações',     sel: '#notif-btn'          },
      { key: 'chat-btn',     name: 'Chat da guilda',           sel: '#chat-geral-btn'     },
      { key: 'dash-toggle',  name: 'Menu — botão hamburguer',  sel: '#dash-toggle'        },
    ]
  },
  {
    cat: 'Página de Livros',
    icon: '📚',
    items: [
      { key: 'content-header',    name: 'Barra de cabeçalho',    sel: '.content-header'      },
      { key: 'back-btn',          name: 'Botão Voltar',          sel: '.back-btn'            },
      { key: 'serie-name-header', name: 'Nome da série',         sel: '#serie-name-header'   },
      { key: 'tabs-bar',          name: 'Barra de abas',         sel: '#tabs-bar'            },
      { key: 'disc-panel',        name: 'Painel de disciplina',  sel: '.disc-panel'          },
      { key: 'disc-icon',         name: 'Ícone da disciplina',   sel: '.disc-icon'           },
      { key: 'disc-title',        name: 'Título da disciplina',  sel: '.disc-title'          },
      { key: 'books-grid',        name: 'Grade de livros',       sel: '.books-grid'          },
      { key: 'book-card',         name: 'Card do livro',         sel: '.book-card'           },
      { key: 'card-label',        name: 'Etiqueta do bimestre',  sel: '.card-label'          },
      { key: 'btn-access',        name: 'Botão ACESSAR',         sel: '.btn-access'          },
      { key: 'btn-unavail',       name: 'Botão INDISPONÍVEL',    sel: '.btn-unavail'         },
    ]
  },
];

/* ── Estado ── */
let hudActive   = false;
let activeItems = new Map();  // key → { el, overlay, origStyle }
let focusedKey  = null;
let valPanel    = null;
let _sb         = null;
let _drag       = null;
let _resize     = null;

/* ── Detecta interface ── */
function iface() {
  const standalone = window.matchMedia('(display-mode: standalone)').matches
                  || !!navigator.standalone;
  const mobile = window.innerWidth < 900
              || /Mobi|Android/i.test(navigator.userAgent);
  if (standalone) return 'APP';
  if (mobile)     return 'WEB-MOBILE';
  return 'PC';
}

/* ── Init: cria botão no sidebar ── */
function init() {
  const dashItems = document.getElementById('dash-items');
  if (!dashItems) { setTimeout(init, 600); return; }
  if (document.getElementById('dash-hud-btn')) return;

  const sep = document.createElement('div');
  sep.style.cssText = 'height:1px;margin:.4rem .8rem;background:rgba(201,168,76,.15)';
  dashItems.appendChild(sep);

  const btn = document.createElement('button');
  btn.className = 'dash-item';
  btn.id = 'dash-hud-btn';
  btn.innerHTML = '<span class="dash-item-icon">⚙</span> Configurar Layout';
  btn.onclick = openAuthModal;
  dashItems.appendChild(btn);

  _sb = window.supabase
    ? window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON)
    : null;
}

/* ── Modal de autenticação admin ── */
function openAuthModal() {
  if (typeof closeDash === 'function') closeDash();

  let modal = document.getElementById('hud-auth-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'hud-auth-modal';
    modal.style.cssText =
      'position:fixed;inset:0;z-index:50000;background:rgba(0,0,0,.92);' +
      'backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center';
    modal.innerHTML = `
      <div style="background:linear-gradient(160deg,#1e1004,#0d0600);
        border:2px solid rgba(201,168,76,.55);border-radius:10px;
        padding:1.8rem 1.5rem;width:min(320px,90vw);font-family:'Cinzel',serif;
        box-shadow:0 0 60px rgba(201,168,76,.2)">
        <div style="text-align:center;color:#c9a84c;font-size:.88rem;
          letter-spacing:.2em;margin-bottom:.4rem">⚙ MODO CONFIGURAÇÃO</div>
        <p style="font-size:.6rem;color:#666;text-align:center;margin-bottom:1.1rem;
          letter-spacing:.08em">Apenas administradores</p>
        <input id="hud-email" type="email" placeholder="E-mail do admin"
          style="width:100%;box-sizing:border-box;padding:.6rem .8rem;margin-bottom:.55rem;
          background:#1a0e04;border:1px solid rgba(201,168,76,.3);border-radius:5px;
          color:#f0e0b0;font-family:'Cinzel',serif;font-size:.7rem;outline:none;display:block">
        <input id="hud-pwd" type="password" placeholder="Senha"
          style="width:100%;box-sizing:border-box;padding:.6rem .8rem;margin-bottom:.8rem;
          background:#1a0e04;border:1px solid rgba(201,168,76,.3);border-radius:5px;
          color:#f0e0b0;font-family:'Cinzel',serif;font-size:.7rem;outline:none;display:block">
        <div id="hud-auth-err"
          style="color:#f08080;font-size:.58rem;text-align:center;
          margin-bottom:.55rem;min-height:13px"></div>
        <button id="hud-auth-ok"
          style="width:100%;padding:.62rem;
          background:linear-gradient(135deg,#c9a84c,#f0d060,#8a6414);
          border:none;border-radius:5px;font-family:'Cinzel',serif;font-weight:700;
          font-size:.7rem;letter-spacing:.12em;color:#1a0800;cursor:pointer">
          CONFIRMAR ACESSO
        </button>
        <button onclick="document.getElementById('hud-auth-modal').style.display='none'"
          style="width:100%;padding:.38rem;margin-top:.45rem;background:transparent;
          border:1px solid rgba(201,168,76,.15);border-radius:5px;color:#555;
          font-family:'Cinzel',serif;font-size:.58rem;cursor:pointer">CANCELAR</button>
      </div>`;
    document.body.appendChild(modal);
    document.getElementById('hud-auth-ok').onclick = authConfirm;
    document.getElementById('hud-pwd').addEventListener('keydown', e => {
      if (e.key === 'Enter') authConfirm();
    });
  }
  modal.style.display = 'flex';
  setTimeout(() => document.getElementById('hud-email').focus(), 100);
}

async function authConfirm() {
  const email = (document.getElementById('hud-email').value || '').trim();
  const pwd   = document.getElementById('hud-pwd').value || '';
  const btn   = document.getElementById('hud-auth-ok');
  const err   = document.getElementById('hud-auth-err');

  if (!email || !pwd) { err.textContent = 'Preencha email e senha.'; return; }
  btn.disabled = true;
  btn.textContent = '⌛ Verificando…';
  err.textContent = '';

  try {
    if (!_sb) throw new Error('Supabase não disponível');
    const { data, error } = await _sb.auth.signInWithPassword({ email, password: pwd });
    if (error) throw error;
    const { data: prof } = await _sb.from('profiles')
      .select('role').eq('id', data.user.id).single();
    if (!prof || prof.role !== 'admin') {
      err.textContent = 'Apenas administradores podem usar o modo configuração.';
      btn.disabled = false; btn.textContent = 'CONFIRMAR ACESSO';
      return;
    }
    document.getElementById('hud-auth-modal').style.display = 'none';
    activateHUD();
  } catch (e) {
    err.textContent = 'Credenciais inválidas. Tente novamente.';
    btn.disabled = false; btn.textContent = 'CONFIRMAR ACESSO';
  }
}

/* ════════════════════════════════════════
   ATIVAR / DESATIVAR HUD
════════════════════════════════════════ */
function activateHUD() {
  hudActive = true;
  document.body.classList.add('hud-active');

  /* transforma sidebar */
  const title = document.getElementById('dash-title');
  if (title) title.textContent = '⚙ LAYOUT CONFIG';
  const items = document.getElementById('dash-items');
  if (items) items.innerHTML = buildSidebarHTML();

  /* painel de valores (fundo) */
  buildValuePanel();

  /* tag de interface no topo */
  addIfaceTag();

  /* abre sidebar */
  if (typeof toggleDash === 'function') toggleDash();
}

function deactivateHUD() {
  hudActive = false;
  document.body.classList.remove('hud-active');

  /* remove todos os overlays */
  activeItems.forEach((_, k) => _removeOverlay(k));
  activeItems.clear();
  focusedKey = null;

  /* remove painel e tag */
  if (valPanel) { valPanel.remove(); valPanel = null; }
  document.querySelectorAll('.hud-iface-tag').forEach(e => e.remove());

  /* recarrega página para restaurar sidebar */
  location.reload();
}

/* ── Abre o painel de aviso com conteúdo de teste (chamado pelo botão no sidebar) ── */
function showTestMessage() {
  const b = document.getElementById('mago-bubble');
  if (!b) return;
  const txt = document.getElementById('mago-bubble-text');
  if (txt) txt.textContent =
    'Mensagem de teste do Mago Supremo.\n\n' +
    'Este texto representa um aviso enviado pelo professor. ' +
    'Ajuste a posição e o tamanho desta caixa de texto para que caiba bem no pergaminho.';
  const ctr = document.getElementById('mago-counter');
  if (ctr) ctr.textContent = 'Aviso 1 de 2';
  const mi = document.getElementById('mago-aviso-mago');
  if (mi) mi.src = 'assets/images/avatar-mago/mago-1.png';
  b.classList.add('open');
}

/* ── Tag de interface ── */
function addIfaceTag() {
  document.querySelectorAll('.hud-iface-tag').forEach(e => e.remove());
  const tag = document.createElement('div');
  tag.className = 'hud-iface-tag';
  tag.style.cssText =
    'position:fixed;top:0;left:50%;transform:translateX(-50%);' +
    'z-index:50005;background:#c9a84c;color:#1a0800;' +
    'font-family:Cinzel,serif;font-size:.55rem;font-weight:700;' +
    'padding:3px 14px;border-radius:0 0 6px 6px;letter-spacing:.1em;' +
    'pointer-events:none;white-space:nowrap';
  tag.textContent = '⚙ HUD · ' + iface() + ' · ' + window.innerWidth + '×' + window.innerHeight;
  document.body.appendChild(tag);
}

/* ════════════════════════════════════════
   SIDEBAR — LISTA DE ELEMENTOS
════════════════════════════════════════ */
function buildSidebarHTML() {
  let html =
    '<div style="padding:.45rem .85rem;font-family:monospace;font-size:.58rem;' +
    'color:#c9a84c;background:rgba(201,168,76,.07);border-bottom:1px solid rgba(201,168,76,.15)">' +
    '📡 ' + iface() + ' &nbsp;·&nbsp; ' + window.innerWidth + '×' + window.innerHeight + 'px' +
    '</div>';

  REGISTRY.forEach(function (cat) {
    const catId = 'hud-cat-' + cat.cat.replace(/\s/g, '-');
    html +=
      '<button class="hud-cat-hdr" onclick="document.getElementById(\'' + catId + '\')' +
      '.style.display=document.getElementById(\'' + catId + '\').style.display===\'none\'?\'block\':\'none\'"' +
      ' style="display:flex;align-items:center;gap:.5rem;width:100%;padding:.52rem .9rem;' +
      'background:rgba(201,168,76,.05);border:none;border-bottom:1px solid rgba(201,168,76,.12);' +
      'color:#c9a84c;font-family:Cinzel,serif;font-size:.6rem;letter-spacing:.1em;cursor:pointer">' +
      '<span>' + cat.icon + '</span>' + cat.cat +
      '<span style="margin-left:auto;font-size:.48rem;opacity:.5">▼</span></button>' +
      '<div id="' + catId + '" style="display:none">';

    /* botão auxiliar por categoria */
    if (cat.cat === 'Avisos') {
      html +=
        '<button onclick="window._hudShowAviso()" style="display:flex;align-items:center;' +
        'gap:.5rem;width:100%;padding:.42rem .85rem .42rem 1.4rem;' +
        'background:rgba(201,168,76,.08);border:none;' +
        'border-bottom:1px solid rgba(201,168,76,.1);color:#f0d060;' +
        'font-family:Cinzel,serif;font-size:.52rem;letter-spacing:.07em;cursor:pointer">' +
        '▶ Abrir painel de aviso (teste)</button>';
    }
    if (cat.cat === 'Ranking do Poder') {
      html +=
        '<button onclick="window._hudShowRkExplain()" style="display:flex;align-items:center;' +
        'gap:.5rem;width:100%;padding:.42rem .85rem .42rem 1.4rem;' +
        'background:rgba(201,168,76,.08);border:none;' +
        'border-bottom:1px solid rgba(201,168,76,.1);color:#f0d060;' +
        'font-family:Cinzel,serif;font-size:.52rem;letter-spacing:.07em;cursor:pointer">' +
        '▶ Abrir modal de explicação</button>' +
        '<button onclick="window._hudShowRkFull()" style="display:flex;align-items:center;' +
        'gap:.5rem;width:100%;padding:.42rem .85rem .42rem 1.4rem;' +
        'background:rgba(201,168,76,.08);border:none;' +
        'border-bottom:1px solid rgba(201,168,76,.1);color:#f0d060;' +
        'font-family:Cinzel,serif;font-size:.52rem;letter-spacing:.07em;cursor:pointer">' +
        '▶ Abrir lista de escudeiros</button>';
    }
    if (cat.cat === 'Página de Livros') {
      html +=
        '<button onclick="window._hudShowContent()" style="display:flex;align-items:center;' +
        'gap:.5rem;width:100%;padding:.42rem .85rem .42rem 1.4rem;' +
        'background:rgba(201,168,76,.08);border:none;' +
        'border-bottom:1px solid rgba(201,168,76,.1);color:#f0d060;' +
        'font-family:Cinzel,serif;font-size:.52rem;letter-spacing:.07em;cursor:pointer">' +
        '▶ Abrir página de livros (1ª Série)</button>';
    }

    cat.items.forEach(function (item) {
      html +=
        '<button id="hud-btn-' + item.key + '" data-key="' + item.key + '"' +
        ' onclick="window._hudToggle(\'' + item.key + '\',\'' + item.sel.replace(/'/g, "\\'") + '\')"' +
        ' style="display:flex;align-items:center;gap:.55rem;width:100%;' +
        'padding:.48rem .85rem .48rem 1.4rem;background:transparent;border:none;' +
        'border-bottom:1px solid rgba(201,168,76,.05);color:#999;' +
        'font-family:Cinzel,serif;font-size:.56rem;letter-spacing:.07em;' +
        'cursor:pointer;text-align:left;transition:color .15s">' +
        '<span id="hud-dot-' + item.key + '" style="width:7px;height:7px;border-radius:50%;' +
        'background:#2a2a2a;border:1px solid #444;flex-shrink:0;transition:all .2s"></span>' +
        item.name + '</button>';
    });

    html += '</div>';
  });

  html +=
    '<div style="padding:.7rem .8rem;margin-top:.3rem">' +
    '<button onclick="window._hudDeactivate()" style="width:100%;padding:.58rem;' +
    'background:rgba(200,30,30,.12);border:1px solid rgba(200,50,50,.35);border-radius:5px;' +
    'color:#f08080;font-family:Cinzel,serif;font-size:.58rem;letter-spacing:.1em;cursor:pointer">' +
    '✕ Sair do Config</button></div>';

  return html;
}

window._hudDeactivate     = deactivateHUD;
window._hudZFocusedStep   = function (d) { if (focusedKey) _zStep(focusedKey, d); };
window._hudZFocusedTop    = function ()  { if (focusedKey) _zTop(focusedKey); };
window._hudZFocusedBot    = function ()  { if (focusedKey) _zBot(focusedKey); };
window._hudShowAviso      = showTestMessage;
window._hudShowRkExplain  = function () {
  var m = document.getElementById('modal-rk-explain');
  if (m) m.classList.add('open');
};
window._hudShowRkFull = function () {
  var m = document.getElementById('modal-rk-full');
  if (m) m.classList.add('open');
};
window._hudShowContent    = function () {
  if (typeof selectSerie === 'function') selectSerie(1);
};

/* ════════════════════════════════════════
   SELECIONAR / DESSELECIONAR ELEMENTO
════════════════════════════════════════ */
window._hudToggle = function (key, sel) {
  if (activeItems.has(key)) {
    _removeOverlay(key);
    activeItems.delete(key);
    _dotOff(key);
    if (focusedKey === key) { focusedKey = null; _updateValPanel(null, null); }
  } else {
    _selectElem(key, sel);
  }
};

function _selectElem(key, sel) {
  let el = document.querySelector(sel);
  if (!el) { _dotErr(key); return; }

  /* garante elemento visível */
  const wasHidden = getComputedStyle(el).display === 'none';
  if (wasHidden) { el.style.display = ''; el.style.visibility = 'visible'; }

  /* overlay de handles */
  const ov = _createOverlay(key);

  activeItems.set(key, { el, sel, wasHidden, ov,
    origStyle: el.getAttribute('style') || '' });

  _dotOn(key);
  _focusElem(key);
  _positionOverlay(key);
}

function _focusElem(key) {
  if (!activeItems.has(key)) return;
  focusedKey = key;
  const { el } = activeItems.get(key);
  _updateValPanel(key, el);

  /* destaca botão no sidebar */
  document.querySelectorAll('[id^="hud-btn-"]').forEach(function (b) {
    b.style.fontWeight = (b.dataset.key === key) ? '700' : '';
    b.style.color      = (b.dataset.key === key) ? '#4fc3f7' : '';
  });
}

/* ════════════════════════════════════════
   OVERLAY DE HANDLES
════════════════════════════════════════ */
function _createOverlay(key) {
  const ov = document.createElement('div');
  ov.className = 'hud-overlay';
  ov.id = 'hud-ov-' + key;
  ov.style.cssText =
    'position:fixed;z-index:49990;box-sizing:border-box;' +
    'outline:2px dashed #4fc3f7;pointer-events:none';

  /* barra superior: drag + z-index controls */
  const bar = document.createElement('div');
  bar.style.cssText =
    'position:absolute;top:-22px;left:0;right:0;height:22px;' +
    'display:flex;align-items:stretch;pointer-events:all;user-select:none';

  /* área de drag */
  const lbl = document.createElement('div');
  lbl.style.cssText =
    'flex:1;background:#4fc3f7;color:#000;font:bold 10px/1 monospace;' +
    'padding:2px 6px;border-radius:3px 0 0 0;' +
    'cursor:move;white-space:nowrap;display:flex;align-items:center;overflow:hidden';
  lbl.textContent = key;
  lbl.addEventListener('mousedown',  function (e) { _startDrag(e, key); _focusElem(key); });
  lbl.addEventListener('touchstart', function (e) { _startDrag(e, key); }, { passive: false });
  bar.appendChild(lbl);

  /* botões de z-index */
  const zbtnStyle =
    'background:#1a0e04;border:none;border-left:1px solid rgba(201,168,76,.35);' +
    'color:#c9a84c;font-size:11px;padding:0 6px;cursor:pointer;' +
    'line-height:1;font-family:monospace;pointer-events:all;';

  [
    { t: '↑',  title: 'Trazer para frente (+1)',    fn: function () { _zStep(key, +1); } },
    { t: '↓',  title: 'Enviar para trás (−1)',       fn: function () { _zStep(key, -1); } },
    { t: '⤴', title: 'Trazer à frente de tudo',     fn: function () { _zTop(key); } },
    { t: '⤵', title: 'Enviar ao fundo de tudo',     fn: function () { _zBot(key); } },
  ].forEach(function (b, i) {
    const btn = document.createElement('button');
    btn.title = b.title;
    btn.textContent = b.t;
    btn.style.cssText = zbtnStyle + (i === 3 ? 'border-radius:0 3px 0 0' : '');
    btn.addEventListener('mousedown',  function (e) { e.stopPropagation(); });
    btn.addEventListener('touchstart', function (e) { e.stopPropagation(); });
    btn.addEventListener('click',      function (e) { e.stopPropagation(); b.fn(); });
    bar.appendChild(btn);
  });

  ov.appendChild(bar);

  /* 8 handles de resize */
  [
    { cur: 'nw-resize', t: '-5px', l: '-5px' },
    { cur: 'n-resize',  t: '-5px', l: 'calc(50% - 5px)' },
    { cur: 'ne-resize', t: '-5px', r: '-5px' },
    { cur: 'w-resize',  t: 'calc(50% - 5px)', l: '-5px' },
    { cur: 'e-resize',  t: 'calc(50% - 5px)', r: '-5px' },
    { cur: 'sw-resize', b: '-5px', l: '-5px' },
    { cur: 's-resize',  b: '-5px', l: 'calc(50% - 5px)' },
    { cur: 'se-resize', b: '-5px', r: '-5px' },
  ].forEach(function (h) {
    const hEl = document.createElement('div');
    hEl.style.cssText =
      'position:absolute;width:10px;height:10px;background:#4fc3f7;' +
      'border:1.5px solid #fff;border-radius:2px;pointer-events:all;' +
      'cursor:' + h.cur + ';z-index:49991;' +
      (h.t ? 'top:'    + h.t + ';' : '') +
      (h.b ? 'bottom:' + h.b + ';' : '') +
      (h.l ? 'left:'   + h.l + ';' : '') +
      (h.r ? 'right:'  + h.r + ';' : '');
    hEl.addEventListener('mousedown',  function (e) { _startResize(e, key, h.cur); });
    hEl.addEventListener('touchstart', function (e) { _startResize(e, key, h.cur); }, { passive: false });
    ov.appendChild(hEl);
  });

  document.body.appendChild(ov);
  return ov;
}

function _positionOverlay(key) {
  const state = activeItems.get(key);
  if (!state || !state.ov) return;
  const r = state.el.getBoundingClientRect();
  const ov = state.ov;
  ov.style.top    = r.top    + 'px';
  ov.style.left   = r.left   + 'px';
  ov.style.width  = r.width  + 'px';
  ov.style.height = r.height + 'px';
}

function _positionAllOverlays() {
  activeItems.forEach(function (_, k) { _positionOverlay(k); });
}

function _removeOverlay(key) {
  const state = activeItems.get(key);
  if (state && state.ov) state.ov.remove();
}

/* ════════════════════════════════════════
   DRAG
════════════════════════════════════════ */
function _startDrag(e, key) {
  e.stopPropagation();
  if (e.cancelable) e.preventDefault();
  _focusElem(key);

  const state = activeItems.get(key);
  if (!state) return;
  const el   = state.el;
  const rect = el.getBoundingClientRect();
  const cp   = e.touches ? e.touches[0] : e;

  /* força posicionamento livre */
  _makeFixed(el, rect);

  _drag = {
    key,
    sx: cp.clientX, sy: cp.clientY,
    ot: parseFloat(el.style.top)  || 0,
    ol: parseFloat(el.style.left) || 0,
  };
}

function _onDragMove(e) {
  if (!_drag) return;
  if (e.cancelable) e.preventDefault();
  const state = activeItems.get(_drag.key);
  if (!state) return;
  const cp = e.touches ? e.touches[0] : e;
  const dx = cp.clientX - _drag.sx;
  const dy = cp.clientY - _drag.sy;
  state.el.style.top  = (_drag.ot + dy) + 'px';
  state.el.style.left = (_drag.ol + dx) + 'px';
  _positionOverlay(_drag.key);
  if (focusedKey === _drag.key) _updateValPanel(_drag.key, state.el);
}

/* ════════════════════════════════════════
   RESIZE
════════════════════════════════════════ */
function _startResize(e, key, cur) {
  e.stopPropagation();
  if (e.cancelable) e.preventDefault();
  _focusElem(key);

  const state = activeItems.get(key);
  if (!state) return;
  const el   = state.el;
  const rect = el.getBoundingClientRect();
  const cp   = e.touches ? e.touches[0] : e;

  _makeFixed(el, rect);

  _resize = {
    key, cur,
    sx: cp.clientX, sy: cp.clientY,
    ow: rect.width, oh: rect.height,
    ot: rect.top,   ol: rect.left,
  };
}

function _onResizeMove(e) {
  if (!_resize) return;
  if (e.cancelable) e.preventDefault();
  const state = activeItems.get(_resize.key);
  if (!state) return;
  const cp = e.touches ? e.touches[0] : e;
  const dx = cp.clientX - _resize.sx;
  const dy = cp.clientY - _resize.sy;
  const c  = _resize.cur;
  const el = state.el;

  let w = _resize.ow, h = _resize.oh,
      t = _resize.ot, l = _resize.ol;

  if (c.includes('e'))  w = Math.max(30, _resize.ow + dx);
  if (c.includes('s'))  h = Math.max(30, _resize.oh + dy);
  if (c.includes('w')) { w = Math.max(30, _resize.ow - dx); l = _resize.ol + (_resize.ow - w); }
  if (c.includes('n')) { h = Math.max(30, _resize.oh - dy); t = _resize.ot + (_resize.oh - h); }

  el.style.width  = w + 'px';
  el.style.height = h + 'px';
  el.style.top    = t + 'px';
  el.style.left   = l + 'px';

  _positionOverlay(_resize.key);
  if (focusedKey === _resize.key) _updateValPanel(_resize.key, el);
}

/* ════════════════════════════════════════
   Z-INDEX CONTROLS
════════════════════════════════════════ */
function _zCurrent(el) {
  const v = parseInt(getComputedStyle(el).zIndex);
  return isNaN(v) ? 0 : v;
}

function _zStep(key, delta) {
  const state = activeItems.get(key);
  if (!state) return;
  const next = _zCurrent(state.el) + delta;
  state.el.style.zIndex = next;
  if (focusedKey === key) _updateValPanel(key, state.el);
}

function _zTop(key) {
  /* encontra o z-index mais alto entre todos os elementos ativos + 1 */
  let max = 0;
  activeItems.forEach(function (s) { max = Math.max(max, _zCurrent(s.el)); });
  const state = activeItems.get(key);
  if (!state) return;
  state.el.style.zIndex = Math.max(max + 1, 49900);
  if (focusedKey === key) _updateValPanel(key, state.el);
}

function _zBot(key) {
  let min = Infinity;
  activeItems.forEach(function (s) { min = Math.min(min, _zCurrent(s.el)); });
  const state = activeItems.get(key);
  if (!state) return;
  const next = isFinite(min) ? min - 1 : 0;
  state.el.style.zIndex = Math.max(next, 0);
  if (focusedKey === key) _updateValPanel(key, state.el);
}

/* ── Torna elemento posicionável livremente ── */
function _makeFixed(el, rect) {
  const pos = getComputedStyle(el).position;
  if (pos === 'static' || pos === 'relative') {
    el.style.position = 'fixed';
    el.style.margin   = '0';
    el.style.top      = rect.top  + 'px';
    el.style.left     = rect.left + 'px';
    el.style.width    = rect.width  + 'px';
    el.style.height   = rect.height + 'px';
  }
}

/* ── Eventos globais ── */
document.addEventListener('mousemove', function (e) {
  _onDragMove(e); _onResizeMove(e);
});
document.addEventListener('mouseup', function () {
  _drag = null; _resize = null;
});
document.addEventListener('touchmove', function (e) {
  _onDragMove(e); _onResizeMove(e);
}, { passive: false });
document.addEventListener('touchend', function () {
  _drag = null; _resize = null;
});
window.addEventListener('scroll', _positionAllOverlays, { passive: true });
window.addEventListener('resize', function () {
  _positionAllOverlays();
  addIfaceTag();
  if (focusedKey && activeItems.has(focusedKey)) {
    _updateValPanel(focusedKey, activeItems.get(focusedKey).el);
  }
});

/* ════════════════════════════════════════
   PAINEL DE VALORES
════════════════════════════════════════ */
function buildValuePanel() {
  if (valPanel) valPanel.remove();
  valPanel = document.createElement('div');
  valPanel.id = 'hud-val-panel';
  valPanel.style.cssText =
    'position:fixed;bottom:0;left:0;right:0;z-index:50003;' +
    'font-family:monospace;font-size:11px;color:#fff;' +
    'transform:translateY(100%);transition:transform .3s ease;' +
    'box-sizing:border-box';

  /* olho sempre visível no topo do painel */
  const eyeBar = document.createElement('div');
  eyeBar.id = 'hud-eye-bar';
  eyeBar.style.cssText =
    'display:flex;justify-content:center;pointer-events:all';
  const eyeBtn = document.createElement('button');
  eyeBtn.id = 'hud-eye-btn';
  eyeBtn.textContent = '👁';
  eyeBtn.title = 'Ocultar / mostrar painel';
  eyeBtn.style.cssText =
    'background:rgba(6,2,0,.85);border:2px solid #c9a84c;border-bottom:none;' +
    'color:#c9a84c;font-size:14px;padding:2px 14px 0;cursor:pointer;' +
    'border-radius:6px 6px 0 0;line-height:1.6;pointer-events:all';
  eyeBtn.addEventListener('click', _toggleValPanel);
  eyeBar.appendChild(eyeBtn);
  valPanel.appendChild(eyeBar);

  /* corpo ocultável */
  const body = document.createElement('div');
  body.id = 'hud-val-body';
  body.style.cssText =
    'background:rgba(6,2,0,.72);border-top:2px solid #c9a84c;' +
    'backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);' +
    'padding:8px 12px 10px;max-height:42vh;overflow-y:auto;' +
    'box-sizing:border-box';
  body.innerHTML =
    '<div style="color:#444;font-size:10px;text-align:center;padding:.4rem 0">' +
    'Selecione um elemento no sidebar para ver seus valores</div>';
  valPanel.appendChild(body);

  document.body.appendChild(valPanel);
}

let _valPanelHidden = false;

function _toggleValPanel() {
  const body = document.getElementById('hud-val-body');
  const btn  = document.getElementById('hud-eye-btn');
  if (!body) return;
  _valPanelHidden = !_valPanelHidden;
  body.style.display = _valPanelHidden ? 'none' : '';
  btn.textContent    = _valPanelHidden ? '🙈' : '👁';
}

function _updateValPanel(key, el) {
  if (!valPanel) return;
  if (!key || !el) {
    valPanel.style.transform = 'translateY(100%)';
    return;
  }
  valPanel.style.transform = 'translateY(0)';

  const r   = el.getBoundingClientRect();
  const cs  = getComputedStyle(el);
  const vw  = window.innerWidth;
  const vh  = window.innerHeight;
  const inf = iface();

  /* ── valores calculados ── */
  const tv  = r.top;
  const lv  = r.left;
  const rv  = vw - r.right;
  const bv  = vh - r.bottom;
  const wv  = r.width;
  const hv  = r.height;
  const zv  = _zCurrent(el);

  /* ── CSS sugerido ── */
  const css = [
    '/* ' + inf + ' · ' + vw + '×' + vh + ' */',
    'top:     ' + tv.toFixed(0) + 'px;  /* ' + p(tv, vh) + 'vh */',
    'left:    ' + lv.toFixed(0) + 'px;  /* ' + p(lv, vw) + 'vw */',
    'right:   ' + rv.toFixed(0) + 'px;  /* ' + p(rv, vw) + 'vw */',
    'bottom:  ' + bv.toFixed(0) + 'px;  /* ' + p(bv, vh) + 'vh */',
    'width:   ' + wv.toFixed(0) + 'px;  /* ' + p(wv, vw) + 'vw */',
    'height:  ' + hv.toFixed(0) + 'px;  /* ' + p(hv, vh) + 'vh */',
    'z-index: ' + zv + ';',
  ].join('\n');

  const valBody = document.getElementById('hud-val-body');
  if (!valBody) return;
  if (_valPanelHidden) { /* mantém oculto mas atualiza conteúdo */ }
  valBody.innerHTML =
    /* cabeçalho */
    '<div style="display:flex;justify-content:space-between;align-items:center;' +
    'margin-bottom:6px;flex-wrap:wrap;gap:4px">' +
    '<span style="color:#c9a84c;font-weight:bold;font-size:12px">' + key + '</span>' +
    '<span style="background:rgba(201,168,76,.18);padding:2px 8px;border-radius:3px;' +
    'font-size:9px;color:#f0d060">' + inf + ' · ' + vw + '×' + vh + 'px</span>' +
    '</div>' +

    /* grade de métricas (7 itens: 2 linhas de 3 + z-index sozinho) */
    '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:4px;margin-bottom:6px">' +
    _metricBox('top',     tv.toFixed(0)+'px', p(tv,vh)+'vh') +
    _metricBox('left',    lv.toFixed(0)+'px', p(lv,vw)+'vw') +
    _metricBox('right',   rv.toFixed(0)+'px', p(rv,vw)+'vw') +
    _metricBox('bottom',  bv.toFixed(0)+'px', p(bv,vh)+'vh') +
    _metricBox('width',   wv.toFixed(0)+'px', p(wv,vw)+'vw') +
    _metricBox('height',  hv.toFixed(0)+'px', p(hv,vh)+'vh') +
    /* z-index com botões inline */
    '<div style="background:#111;padding:4px 6px;border-radius:3px;display:flex;' +
    'flex-direction:column;gap:3px">' +
    '<div style="color:#666;font-size:9px">z-index</div>' +
    '<div style="display:flex;align-items:center;gap:4px">' +
    '<span id="hud-z-val" style="color:#ff9800;font-size:11px;font-weight:bold;min-width:32px">' + zv + '</span>' +
    '<button onclick="window._hudZFocusedStep(-1)" title="Enviar para trás" ' +
    'style="background:#222;border:1px solid #444;color:#ff9800;font-size:10px;' +
    'padding:1px 5px;cursor:pointer;border-radius:2px;line-height:1.4">↓</button>' +
    '<button onclick="window._hudZFocusedStep(+1)" title="Trazer para frente" ' +
    'style="background:#222;border:1px solid #444;color:#ff9800;font-size:10px;' +
    'padding:1px 5px;cursor:pointer;border-radius:2px;line-height:1.4">↑</button>' +
    '<button onclick="window._hudZFocusedBot()" title="Ao fundo" ' +
    'style="background:#222;border:1px solid #444;color:#aaa;font-size:10px;' +
    'padding:1px 5px;cursor:pointer;border-radius:2px;line-height:1.4">⤵</button>' +
    '<button onclick="window._hudZFocusedTop()" title="À frente de tudo" ' +
    'style="background:#222;border:1px solid #444;color:#aaa;font-size:10px;' +
    'padding:1px 5px;cursor:pointer;border-radius:2px;line-height:1.4">⤴</button>' +
    '</div></div>' +
    '</div>' +

    /* CSS para copiar */
    '<div style="background:#0a0500;border:1px solid rgba(201,168,76,.2);' +
    'border-radius:4px;padding:6px 8px">' +
    '<div style="color:#666;font-size:9px;margin-bottom:3px">CSS para copiar:</div>' +
    '<pre style="margin:0;color:#a8ff78;font-size:10px;white-space:pre-wrap;' +
    'line-height:1.5">' + css + '</pre>' +
    '</div>';

  /* painéis extras conforme flags do registro */
  const regItem = _registryItem(key);
  if (regItem && regItem.multiSel) {
    const noteDiv = document.createElement('div');
    noteDiv.innerHTML = '<div style="background:rgba(79,195,247,.08);border:1px solid rgba(79,195,247,.25);' +
      'border-radius:3px;padding:4px 8px;margin-top:4px;font-size:8px;color:#4fc3f7">' +
      '⚡ Aplicado a todos os <b>' + regItem.sel + '</b> (tabela + modal)</div>';
    valBody.appendChild(noteDiv);
  }
  if (regItem && regItem.textEdit) {
    const txtDiv = document.createElement('div');
    txtDiv.innerHTML = _buildTextControls(key, el);
    valBody.appendChild(txtDiv);
  }
  if (regItem && regItem.sizeEdit) {
    const szDiv = document.createElement('div');
    szDiv.innerHTML = _buildSizeControls(key, el);
    valBody.appendChild(szDiv);
  }
}

/* ════════════════════════════════════════
   EDITOR DE TEXTO
════════════════════════════════════════ */
function _registryItem(key) {
  for (var c = 0; c < REGISTRY.length; c++) {
    for (var i = 0; i < REGISTRY[c].items.length; i++) {
      if (REGISTRY[c].items[i].key === key) return REGISTRY[c].items[i];
    }
  }
  return null;
}

/* mapa de estilos de classe injetados dinamicamente (persistem enquanto o HUD estiver ativo) */
var _classStyles = {};

function _injectClassStyle(sel, prop, val) {
  if (!_classStyles[sel]) _classStyles[sel] = {};
  _classStyles[sel][prop] = val;
  var styleEl = document.getElementById('hud-dynamic-styles');
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'hud-dynamic-styles';
    document.head.appendChild(styleEl);
  }
  var cssText = '';
  Object.keys(_classStyles).forEach(function (s) {
    var decls = Object.keys(_classStyles[s]).map(function (p) {
      var cp = p.replace(/([A-Z])/g, function (m) { return '-' + m.toLowerCase(); });
      return cp + ':' + _classStyles[s][p] + ' !important';
    }).join(';');
    cssText += s + '{' + decls + '}\n';
  });
  styleEl.textContent = cssText;
}

function _buildSizeControls(key, el) {
  var cs  = getComputedStyle(el);
  var sz  = parseFloat(cs.width) || 20;
  var sliderStyle = 'flex:1;accent-color:#4fc3f7;height:4px;cursor:pointer';
  var valStyle    = 'color:#4fc3f7;font-size:10px;min-width:42px;text-align:right';
  var k = key;
  return '<div style="background:#0d0800;border:1px solid rgba(201,168,76,.25);' +
    'border-radius:4px;padding:8px;margin-top:6px">' +
    '<div style="color:#f0d060;font-size:10px;font-weight:bold;' +
    'letter-spacing:.1em;margin-bottom:7px">⬡ DIMENSIONAR</div>' +
    _txtRow('Tamanho',
      '<input type="range" min="12" max="80" step="1" value="' + sz.toFixed(0) + '" ' +
      'oninput="window._hudSzApply(\'' + k + '\',this.value);' +
      'document.getElementById(\'hud-sz-v\').textContent=this.value+\'px\'" ' +
      'style="' + sliderStyle + '">' +
      '<span id="hud-sz-v" style="' + valStyle + '">' + sz.toFixed(0) + 'px</span>') +
    '<div style="background:#050200;border:1px solid rgba(201,168,76,.15);' +
    'border-radius:3px;padding:6px 8px;margin-top:7px">' +
    '<div style="color:#666;font-size:9px;margin-bottom:3px">CSS (copiar):</div>' +
    '<pre id="hud-sz-css" style="margin:0;color:#a8ff78;font-size:9px;' +
    'white-space:pre-wrap;line-height:1.6">' +
    '.rk-avatar       { width:' + sz.toFixed(0) + 'px; height:' + sz.toFixed(0) + 'px; }\n' +
    '.rk-avatar.top1  { width:' + (sz + 3).toFixed(0) + 'px; height:' + (sz + 3).toFixed(0) + 'px; }' +
    '</pre></div></div>';
}

window._hudSzApply = function (key, val) {
  var state = activeItems.get(key);
  if (!state) return;
  var size = parseFloat(val);
  state.el.style.width  = size + 'px';
  state.el.style.height = size + 'px';
  var item = _registryItem(key);
  if (item && item.multiSel) {
    document.querySelectorAll(item.sel).forEach(function (el) {
      el.style.width  = size + 'px';
      el.style.height = size + 'px';
    });
    document.querySelectorAll(item.sel + '.top1').forEach(function (el) {
      el.style.width  = (size + 3) + 'px';
      el.style.height = (size + 3) + 'px';
    });
    _injectClassStyle(item.sel,         'width',  size + 'px');
    _injectClassStyle(item.sel,         'height', size + 'px');
    _injectClassStyle(item.sel + '.top1', 'width',  (size + 3) + 'px');
    _injectClassStyle(item.sel + '.top1', 'height', (size + 3) + 'px');
  }
  var pre = document.getElementById('hud-sz-css');
  if (pre) pre.textContent =
    '.rk-avatar       { width:' + size + 'px; height:' + size + 'px; }\n' +
    '.rk-avatar.top1  { width:' + (size + 3) + 'px; height:' + (size + 3) + 'px; }';
};

function _rgbToHex(rgb) {
  var m = rgb.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!m) return '#000000';
  return '#' + [m[1], m[2], m[3]].map(function (x) {
    return ('0' + parseInt(x).toString(16)).slice(-2);
  }).join('');
}

function _txtCSS(el) {
  var cs = getComputedStyle(el);
  var fs = parseFloat(cs.fontSize) || 13;
  var lhRaw = cs.lineHeight;
  var lh = lhRaw === 'normal' ? '1.5' : (parseFloat(lhRaw) / fs).toFixed(2);
  var ls = parseFloat(cs.letterSpacing) || 0;
  return [
    'font-size:      ' + cs.fontSize + ';',
    'line-height:    ' + lh + ';',
    'letter-spacing: ' + ls.toFixed(2) + 'px;',
    'color:          ' + cs.color + ';',
    'font-family:    ' + cs.fontFamily + ';',
    'text-align:     ' + cs.textAlign + ';',
    'white-space:    ' + cs.whiteSpace + ';',
    'padding:        ' + cs.padding + ';',
  ].join('\n');
}

function _txtRow(label, ctrl) {
  return '<div style="display:flex;align-items:center;gap:6px;margin-bottom:5px">' +
    '<span style="color:#888;font-size:9px;width:68px;flex-shrink:0">' + label + '</span>' +
    ctrl + '</div>';
}

function _buildTextControls(key, el) {
  var cs  = getComputedStyle(el);
  var fs  = parseFloat(cs.fontSize) || 13;
  var lhRaw = cs.lineHeight;
  var lh  = lhRaw === 'normal' ? 1.5 : parseFloat(lhRaw) / fs;
  var ls  = parseFloat(cs.letterSpacing) || 0;
  var col = _rgbToHex(cs.color);
  var ta  = cs.textAlign;
  var ws  = cs.whiteSpace;
  var k   = key;

  var fonts = [
    "'IM Fell English', serif",
    "'Cinzel', serif",
    "'Cinzel Decorative', serif",
    "serif", "sans-serif"
  ];
  var fontOpts = fonts.map(function (f) {
    var name = f.split(',')[0].replace(/'/g, '').trim();
    var sel  = cs.fontFamily.indexOf(name) >= 0 ? ' selected' : '';
    return '<option value="' + f + '"' + sel + '>' + name + '</option>';
  }).join('');

  var wsOpts = ['normal','pre-line','pre-wrap','nowrap'].map(function (w) {
    return '<option value="' + w + '"' + (ws === w ? ' selected' : '') + '>' + w + '</option>';
  }).join('');

  var alignIcons = { left: '⬅', center: '↔', right: '➡', justify: '☰' };
  var alignBtns = ['left','center','right','justify'].map(function (a) {
    var active = ta === a
      ? 'background:#4fc3f7;color:#000'
      : 'background:#222;color:#aaa';
    return '<button id="hud-ta-' + k + '-' + a + '" ' +
      'onclick="window._hudTxtApply(\'' + k + '\',\'textAlign\',\'' + a + '\')" ' +
      'style="' + active + ';border:1px solid #444;padding:3px 7px;' +
      'cursor:pointer;border-radius:2px;font-size:12px;line-height:1">' +
      alignIcons[a] + '</button>';
  }).join('');

  var sliderStyle = 'flex:1;accent-color:#4fc3f7;height:4px;cursor:pointer';
  var valStyle = 'color:#4fc3f7;font-size:10px;min-width:42px;text-align:right';

  return '<div style="background:#0d0800;border:1px solid rgba(201,168,76,.25);' +
    'border-radius:4px;padding:8px;margin-top:6px">' +
    '<div style="color:#f0d060;font-size:10px;font-weight:bold;' +
    'letter-spacing:.1em;margin-bottom:7px">✏ EDITAR TEXTO</div>' +

    /* Font size */
    _txtRow('Tamanho',
      '<input type="range" min="6" max="72" step="0.5" value="' + fs.toFixed(1) + '" ' +
      'oninput="window._hudTxtApply(\'' + k + '\',\'fontSize\',this.value+\'px\');' +
      'document.getElementById(\'hud-fs-v\').textContent=parseFloat(this.value).toFixed(1)+\'px\'" ' +
      'style="' + sliderStyle + '">' +
      '<span id="hud-fs-v" style="' + valStyle + '">' + fs.toFixed(1) + 'px</span>') +

    /* Line height */
    _txtRow('Entrelinha',
      '<input type="range" min="0.8" max="3.5" step="0.05" value="' + lh.toFixed(2) + '" ' +
      'oninput="window._hudTxtApply(\'' + k + '\',\'lineHeight\',this.value);' +
      'document.getElementById(\'hud-lh-v\').textContent=parseFloat(this.value).toFixed(2)" ' +
      'style="' + sliderStyle + '">' +
      '<span id="hud-lh-v" style="' + valStyle + '">' + lh.toFixed(2) + '</span>') +

    /* Letter spacing */
    _txtRow('Espaç.letra',
      '<input type="range" min="-2" max="10" step="0.1" value="' + ls.toFixed(1) + '" ' +
      'oninput="window._hudTxtApply(\'' + k + '\',\'letterSpacing\',this.value+\'px\');' +
      'document.getElementById(\'hud-ls-v\').textContent=parseFloat(this.value).toFixed(1)+\'px\'" ' +
      'style="' + sliderStyle + '">' +
      '<span id="hud-ls-v" style="' + valStyle + '">' + ls.toFixed(1) + 'px</span>') +

    /* Color */
    _txtRow('Cor do texto',
      '<input type="color" value="' + col + '" ' +
      'oninput="window._hudTxtApply(\'' + k + '\',\'color\',this.value);' +
      'document.getElementById(\'hud-col-v\').textContent=this.value" ' +
      'style="width:38px;height:26px;border:1px solid #444;background:none;cursor:pointer;padding:0;border-radius:3px">' +
      '<span id="hud-col-v" style="' + valStyle + ';font-size:9px">' + col + '</span>') +

    /* Font family */
    _txtRow('Fonte',
      '<select onchange="window._hudTxtApply(\'' + k + '\',\'fontFamily\',this.value)" ' +
      'style="flex:1;background:#1a0e04;border:1px solid #444;color:#ccc;' +
      'font-size:9px;padding:3px 4px;border-radius:3px">' + fontOpts + '</select>') +

    /* Text align */
    _txtRow('Alinhamento',
      '<div style="display:flex;gap:3px">' + alignBtns + '</div>') +

    /* White space */
    _txtRow('Quebra linha',
      '<select onchange="window._hudTxtApply(\'' + k + '\',\'whiteSpace\',this.value)" ' +
      'style="flex:1;background:#1a0e04;border:1px solid #444;color:#ccc;' +
      'font-size:9px;padding:3px 4px;border-radius:3px">' + wsOpts + '</select>') +

    /* Padding */
    _txtRow('Padding',
      '<input type="range" min="0" max="40" step="1" value="' + (parseFloat(cs.paddingTop)||0).toFixed(0) + '" ' +
      'oninput="var v=this.value+\'px\';window._hudTxtApply(\'' + k + '\',\'padding\',v);' +
      'document.getElementById(\'hud-pd-v\').textContent=this.value+\'px\'" ' +
      'style="' + sliderStyle + '">' +
      '<span id="hud-pd-v" style="' + valStyle + '">' + (parseFloat(cs.paddingTop)||0).toFixed(0) + 'px</span>') +

    /* CSS do texto */
    '<div style="background:#050200;border:1px solid rgba(201,168,76,.15);' +
    'border-radius:3px;padding:6px 8px;margin-top:7px">' +
    '<div style="color:#666;font-size:9px;margin-bottom:3px">CSS do texto (copiar):</div>' +
    '<pre id="hud-txt-css" style="margin:0;color:#ffd700;font-size:9px;' +
    'white-space:pre-wrap;line-height:1.6">' + _txtCSS(el) + '</pre>' +
    '</div>' +
    '</div>';
}

window._hudTxtApply = function (key, prop, val) {
  var state = activeItems.get(key);
  if (!state) return;
  state.el.style[prop] = val;
  /* multiSel: propaga para todos os elementos da classe e injeta stylesheet */
  var item = _registryItem(key);
  if (item && item.multiSel) {
    document.querySelectorAll(item.sel).forEach(function (el) {
      el.style[prop] = val;
    });
    _injectClassStyle(item.sel, prop, val);
  }
  var pre = document.getElementById('hud-txt-css');
  if (pre) pre.textContent = _txtCSS(state.el);
  /* atualiza botões de alinhamento */
  if (prop === 'textAlign') {
    ['left','center','right','justify'].forEach(function (a) {
      var b = document.getElementById('hud-ta-' + key + '-' + a);
      if (!b) return;
      b.style.background = (a === val) ? '#4fc3f7' : '#222';
      b.style.color      = (a === val) ? '#000'    : '#aaa';
    });
  }
};

function _metricBox(label, px, rel) {
  return '<div style="background:#111;padding:4px 6px;border-radius:3px">' +
    '<div style="color:#666;font-size:9px">' + label + '</div>' +
    '<div style="color:#4fc3f7;font-size:11px;font-weight:bold">' + px + '</div>' +
    '<div style="color:#888;font-size:9px">' + rel + '</div></div>';
}

function p(val, total) {
  return (val / total * 100).toFixed(1);
}

/* ── Dots no sidebar ── */
function _dotOn(key) {
  const d = document.getElementById('hud-dot-' + key);
  if (d) { d.style.background='#4fc3f7'; d.style.border='1px solid #4fc3f7';
           d.style.boxShadow='0 0 5px #4fc3f7'; }
  const b = document.getElementById('hud-btn-' + key);
  if (b) b.style.color = '#4fc3f7';
}
function _dotOff(key) {
  const d = document.getElementById('hud-dot-' + key);
  if (d) { d.style.background='#2a2a2a'; d.style.border='1px solid #444';
           d.style.boxShadow=''; }
  const b = document.getElementById('hud-btn-' + key);
  if (b) { b.style.color=''; b.style.fontWeight=''; }
}
function _dotErr(key) {
  const d = document.getElementById('hud-dot-' + key);
  if (!d) return;
  d.style.background = '#f08080';
  setTimeout(function() { _dotOff(key); }, 1400);
}

/* ── Arranque ── */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

}());
