/* ================================================================
   quiz-supabase.js — Biblioteca Digital Medieval
   Funcionalidades:
   1. Aviso obrigatório antes do primeiro clique em cada quiz
   2. Quiz realizado UMA vez — travamento local + Supabase
   3. Envio automático de resultados ao professor (Supabase)
   4. Remove botões "Tentar novamente" / "Refazer"
   ================================================================ */
(function () {
  'use strict';

  /* ── Credenciais ── */
  var SUPA_URL  = 'https://vgceathgwvtmjxbdpecr.supabase.co';
  var SUPA_ANON = 'sb_publishable_ba-g-ww4KwM2Wq0x2vsGVg_x_9pTqUQ';

  var bookPath  = window.location.pathname;
  var LOCK_PRE  = 'bdm-qdone::' + bookPath + '::';

  var db = null;
  var userId = null;
  var _pendingResults = []; // fila para resultados que chegam antes do userId estar pronto

  /* ── Init Supabase ── */
  function initSupa() {
    if (typeof supabase === 'undefined') return;
    var client = supabase.createClient(SUPA_URL, SUPA_ANON);
    db = client;

    // Tenta primeiro via localStorage (custom-auth) — síncrono, sem espera
    try {
      var al = JSON.parse(localStorage.getItem('bdm-aluno') || 'null');
      if (al && al.id) userId = al.id;
    } catch(e) {}

    // Confirma/sobrescreve com sessão Supabase Auth se existir
    client.auth.getSession().then(function (res) {
      var session = res && res.data && res.data.session;
      if (session && session.user && session.user.id) {
        userId = session.user.id;
      }
      // Flush resultados que ficaram na fila enquanto aguardava userId
      if (userId && _pendingResults.length) {
        var pending = _pendingResults.splice(0);
        pending.forEach(function(p) { _doSend(p); });
      }
    }).catch(function(e) {
      console.warn('[BDM Quiz] getSession erro:', e);
    });
  }

  /* ── Book label from page title ── */
  function bookLabel() {
    var t = document.title || '';
    var parts = t.split('|').map(function (s) { return s.trim(); }).filter(Boolean);
    if (parts.length >= 2) return parts.slice(1).join(' · ');
    var m = bookPath.match(/livros\/(\d+)-serie\/([^\/]+)\/(\d+)-bimestre/);
    if (m) return m[1] + 'ª Série · ' + m[2].replace(/-/g, ' ') + ' · ' + m[3] + 'º Bimestre';
    return bookPath;
  }

  /* ── Lock storage ── */
  function isLocked(quizKey) {
    try { return localStorage.getItem(LOCK_PRE + quizKey) === '1'; } catch(e) { return false; }
  }
  function setLocked(quizKey) {
    try { localStorage.setItem(LOCK_PRE + quizKey, '1'); } catch(e) {}
  }

  /* ── Send result to Supabase ── */
  function sendResult(quizId, quizLabelStr, correct, total, answers) {
    if (!db) return;
    var payload = { quizId: quizId, quizLabelStr: quizLabelStr, correct: correct, total: total, answers: answers };
    if (!userId) {
      // userId ainda não resolveu (getSession assíncrono) — enfileira
      _pendingResults.push(payload);
      return;
    }
    _doSend(payload);
  }

  function _doSend(p) {
    if (!db || !userId) return;
    db.from('quiz_results').upsert({
      user_id:      userId,
      book_path:    bookPath,
      book_label:   bookLabel(),
      quiz_id:      p.quizId,
      quiz_label:   p.quizLabelStr,
      correct:      p.correct,
      total:        p.total,
      answers:      p.answers,
      completed_at: new Date().toISOString()
    }, { onConflict: 'user_id,book_path,quiz_id' })
    .then(function(res) {
      if (res && res.error) {
        console.error('[BDM Quiz] Erro ao salvar resultado:', res.error.message, res.error);
      }
    })
    .catch(function(e) {
      console.error('[BDM Quiz] Falha de rede ao salvar resultado:', e);
    });
  }

  /* ── Collect answers from a quiz container ── */
  function collectAnswers(container) {
    if (!container) return { answers: [], correct: 0, total: 0 };
    var answers = [];
    var correct = 0;

    /* Pattern A: .mc-q[data-answered] with .qmc-opt.correct/.wrong */
    var mqCards = container.querySelectorAll('.mc-q[data-answered], .mc-q.answered, .qmc-card.answered');
    if (mqCards.length === 0) {
      /* Pattern B: any .answered card */
      mqCards = container.querySelectorAll('.answered[id]');
    }

    mqCards.forEach(function (card) {
      /* Student was wrong if any option has class 'wrong' */
      var wasWrong = !!(
        card.querySelector('.qmc-opt.wrong, .qmc-opt.mc-wrong, .qmc-opt.sel-wrong, button.wrong')
      );
      answers.push({ questionId: card.id, correct: !wasWrong });
      if (!wasWrong) correct++;
    });

    /* Pattern C: .mc-group (checkMC books) */
    if (answers.length === 0) {
      var groups = container.querySelectorAll('.mc-group');
      groups.forEach(function (g, i) {
        var hasWrong   = !!g.querySelector('.mc-opt.mc-wrong');
        var hasCorrect = !!g.querySelector('.mc-opt.mc-correct');
        var answered   = hasWrong || hasCorrect;
        if (answered) {
          answers.push({ questionId: g.id || ('q' + i), correct: hasCorrect && !hasWrong });
          if (hasCorrect && !hasWrong) correct++;
        }
      });
    }

    return { answers: answers, correct: correct, total: answers.length };
  }

  /* ── Quiz label from container ── */
  function getQuizLabel(container) {
    if (!container) return 'Quiz';
    var titleEl = container.querySelector('.quiz-title, .bloco-title, h3');
    if (titleEl) return titleEl.textContent.trim().replace(/^[\s📊📚⚔️🏰🎨]+/, '').trim();
    return container.id || 'Quiz';
  }

  /* ── Lock a quiz section UI ── */
  function lockSection(container) {
    if (!container) return;
    /* Disable all option buttons */
    container.querySelectorAll('.qmc-opt, .mc-opt, .ativ-mc-opt, .quiz-opt').forEach(function (btn) {
      btn.disabled = true;
    });
    /* Remove all retry/reset buttons */
    container.querySelectorAll(
      '.qrb-retry, .qr-retry, [onclick*="retryQuiz"], [onclick*="resetQuiz"], [onclick*="retryBlocoQuiz"], [onclick*="retryQuizF"]'
    ).forEach(function (btn) { btn.remove(); });
    /* Add "done" notice if not already there */
    if (!container.querySelector('.bdm-done-notice')) {
      var notice = document.createElement('div');
      notice.className = 'bdm-done-notice';
      notice.style.cssText =
        'background:rgba(0,80,20,.2);border:1px solid #4a9a60;border-radius:10px;' +
        'padding:.7rem 1rem;text-align:center;color:#8effa0;font-size:.82rem;margin:1rem 0;';
      notice.textContent = '✅ Quiz já realizado — resultado enviado ao professor.';
      container.appendChild(notice);
    }
  }

  /* ── Warning modal ── */
  var warnedKeys = {};

  function showWarning(quizKey, onConfirm) {
    if (warnedKeys[quizKey]) { onConfirm(); return; }
    warnedKeys[quizKey] = true;

    var overlay = document.createElement('div');
    overlay.style.cssText =
      'position:fixed;inset:0;background:rgba(0,0,0,.88);z-index:99999;' +
      'display:flex;align-items:center;justify-content:center;padding:1rem;';
    overlay.innerHTML =
      '<div style="background:linear-gradient(135deg,#1a0a00,#2d1500);border:2px solid #c4860a;' +
      'border-radius:16px;max-width:360px;width:100%;padding:1.8rem 1.6rem;text-align:center;' +
      'box-shadow:0 0 60px rgba(196,134,10,.35);">' +
        '<div style="font-size:2.2rem;margin-bottom:.6rem">⚠️</div>' +
        '<h3 style="font-family:\'Cinzel\',Georgia,serif;color:#f0d060;font-size:1rem;' +
        'margin-bottom:.7rem;letter-spacing:.06em">ATENÇÃO — QUIZ ÚNICO</h3>' +
        '<p style="color:#f5e8c0;font-size:.88rem;line-height:1.65;margin-bottom:1.3rem">' +
        'Este quiz <strong>só pode ser realizado uma única vez</strong>.<br>' +
        'Seu resultado será enviado diretamente ao professor e não poderá ser alterado.<br><br>' +
        'Tem certeza que deseja começar agora?</p>' +
        '<div style="display:flex;gap:.8rem;justify-content:center">' +
          '<button id="bdm-warn-no" style="font-family:\'Cinzel\',Georgia,serif;font-size:.72rem;' +
          'letter-spacing:.08em;padding:.55rem 1.3rem;border-radius:8px;' +
          'border:1.5px solid rgba(201,168,76,.4);background:rgba(0,0,0,.5);' +
          'color:#c9a870;cursor:pointer">CANCELAR</button>' +
          '<button id="bdm-warn-yes" style="font-family:\'Cinzel\',Georgia,serif;font-size:.72rem;' +
          'letter-spacing:.08em;padding:.55rem 1.3rem;border-radius:8px;' +
          'border:1.5px solid #c4860a;background:linear-gradient(135deg,#6a1010,#c4860a);' +
          'color:#fff;cursor:pointer;font-weight:700">✍ INICIAR QUIZ</button>' +
        '</div>' +
      '</div>';

    document.body.appendChild(overlay);
    overlay.querySelector('#bdm-warn-yes').onclick = function () { overlay.remove(); onConfirm(); };
    overlay.querySelector('#bdm-warn-no').onclick  = function () { overlay.remove(); };
    overlay.onclick = function (e) { if (e.target === overlay) overlay.remove(); };
  }

  /* ── Find quiz section key for a given element ── */
  function getQuizContainer(el) {
    /* Try: named quiz section (quiz01, b1, c01, q1…) */
    var c = el.closest('[id^="quiz"],[id^="b1"],[id^="b2"],[id^="b3"],[id^="b4"],' +
                       '[id^="bloco"],[id^="c0"],[id^="q1"],[id^="q2"],[id^="q3"],' +
                       '[id^="q4"],[id^="q5"],[id^="q6"],[id^="q7"],[id^="q8"]');
    if (c) return c;
    /* Fallback: topico-sec */
    return el.closest('section[id]');
  }

  /* ── Click interception (capture phase) ── */
  var confirmedButtons = (typeof WeakSet !== 'undefined') ? new WeakSet() : null;

  document.addEventListener('click', function (e) {
    var btn = e.target.closest
      ? e.target.closest('.qmc-opt, .mc-opt, .ativ-mc-opt, .quiz-opt')
      : null;
    if (!btn) return;
    /* Already confirmed this click */
    if (confirmedButtons && confirmedButtons.has(btn)) return;

    var container = getQuizContainer(btn);
    var quizKey   = container ? container.id : '_page_';

    /* Block if already locked */
    if (isLocked(quizKey)) {
      e.stopImmediatePropagation();
      e.preventDefault();
      return;
    }

    /* Has any question in container already been answered? */
    var hasAnswered = container && !!(
      container.querySelector(
        '.mc-q[data-answered], .mc-q.answered, .qmc-card.answered, .answered[id],' +
        '.mc-opt.mc-correct, .mc-opt.mc-wrong, .qmc-opt.correct, .qmc-opt.wrong'
      )
    );

    if (hasAnswered) return; /* Quiz already started — no warning needed */

    /* Show warning before first answer */
    e.stopImmediatePropagation();
    e.preventDefault();
    var capturedBtn = btn;
    showWarning(quizKey, function () {
      if (confirmedButtons) confirmedButtons.add(capturedBtn);
      capturedBtn.click();
    });
  }, true);

  /* ── Handle quiz completion via MutationObserver ── */
  function onBannerShown(banner) {
    /* Find parent quiz container */
    var container = banner.closest(
      '.quiz-section, .quiz-section-f, .bloco-quiz, [id^="quiz"], section[id]'
    ) || banner.parentElement;

    /* Derive quiz key: prefer container ID, fallback to banner ID */
    var quizKey = (container && container.id) ? container.id : banner.id;

    if (isLocked(quizKey)) return;
    setLocked(quizKey);

    var data = collectAnswers(container || banner.parentElement);
    var label = getQuizLabel(container || banner.parentElement);
    sendResult(quizKey, label, data.correct, data.total, data.answers);

    /* Remove retry buttons inside this banner and container */
    var scope = container || banner.parentElement;
    if (scope) {
      scope.querySelectorAll(
        '.qrb-retry, .qr-retry, [onclick*="retryQuiz"], [onclick*="resetQuiz"],' +
        '[onclick*="retryBlocoQuiz"], [onclick*="retryQuizF"]'
      ).forEach(function (b) { b.remove(); });
    }
  }

  /* ── Handle checkMC books: detect per-section completion ── */
  function checkSectionComplete(section) {
    var groups = section.querySelectorAll('.mc-group');
    if (!groups.length) return;
    var allDone = true;
    groups.forEach(function (g) {
      if (!g.querySelector('.mc-opt.mc-correct, .mc-opt.mc-wrong')) allDone = false;
    });
    if (!allDone) return;
    var secId = section.id;
    if (isLocked(secId)) return;
    setLocked(secId);
    var data = collectAnswers(section);
    var label = getQuizLabel(section);
    sendResult(secId, label, data.correct, data.total, data.answers);
  }

  window.addEventListener('load', function () {
    /* ── Disable retry/reset functions ── */
    ['resetQuiz','retryQuiz','retryQuizF','retryBlocoQuiz'].forEach(function (fn) {
      if (typeof window[fn] === 'function') window[fn] = function () {};
    });

    /* ── Remove existing retry buttons ── */
    document.querySelectorAll(
      '.qrb-retry, .qr-retry, [onclick*="retryQuiz"], [onclick*="resetQuiz"],' +
      '[onclick*="retryBlocoQuiz"], [onclick*="retryQuizF"]'
    ).forEach(function (btn) { btn.remove(); });

    /* ── Lock already-completed sections ── */
    document.querySelectorAll('[id]').forEach(function (el) {
      if (isLocked(el.id)) lockSection(el);
    });

    /* ── MutationObserver: watch result banners ── */
    var resultBanners = document.querySelectorAll('.quiz-result-banner, .quiz-result');
    if (resultBanners.length > 0) {
      var observer = new MutationObserver(function (mutations) {
        mutations.forEach(function (mut) {
          if (mut.type !== 'attributes' || mut.attributeName !== 'class') return;
          var el = mut.target;
          if (el.classList.contains('show')) onBannerShown(el);
        });
      });
      resultBanners.forEach(function (banner) {
        observer.observe(banner, { attributes: true, attributeFilter: ['class'] });
      });
    }

    /* ── checkMC books: watch for mc-group answers via MutationObserver ── */
    var mcGroups = document.querySelectorAll('.mc-group');
    if (mcGroups.length > 0) {
      var mcObserver = new MutationObserver(function (mutations) {
        mutations.forEach(function (mut) {
          var section = mut.target.closest('section[id]');
          if (section) checkSectionComplete(section);
        });
      });
      mcGroups.forEach(function (g) {
        mcObserver.observe(g, { subtree: true, attributes: true, attributeFilter: ['class', 'disabled'] });
      });
    }

    /* ── Wrap showQuizResult / showResult (extra safety for 1-serie/LP) ── */
    ['showQuizResult', 'showResult'].forEach(function (fnName) {
      var orig = window[fnName];
      if (typeof orig === 'function') {
        window[fnName] = function (qId, correct, total) {
          orig.apply(this, arguments);
          /* Find the result banner by common ID patterns */
          var banner = document.getElementById('qr' + (qId || '').replace('quiz', ''))
                    || document.getElementById('res-' + qId)
                    || document.getElementById(qId + '_banner')
                    || document.getElementById(qId + '-banner')
                    || document.getElementById('qres-' + qId);
          if (banner) onBannerShown(banner);
        };
      }
    });
  });

  /* ── Init ── */
  initSupa();
})();
