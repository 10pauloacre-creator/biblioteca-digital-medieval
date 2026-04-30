/* ================================================================
   quiz-supabase.js — Biblioteca Digital Medieval
   Estratégia de envio:
   1. Ao concluir o quiz: salva resultado em localStorage IMEDIATAMENTE
   2. Tenta enviar ao Supabase em segundo plano
   3. Se falhou (offline, erro de auth): ao abrir o livro de novo,
      detecta resultados pendentes e tenta reenviar automaticamente
   4. Aviso obrigatório antes do primeiro clique em cada quiz
   5. Remove botões "Tentar novamente" / "Refazer"
   ================================================================ */
(function () {
  'use strict';

  /* ── Credenciais ── */
  var SUPA_URL  = 'https://vgceathgwvtmjxbdpecr.supabase.co';
  var SUPA_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZnY2VhdGhnd3Z0bWp4YmRwZWNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzMzIzODgsImV4cCI6MjA5MTkwODM4OH0.RDNkFfHMv0URRiCvptZDtglyU8XUOf95BGB-qnrPlew';

  var bookPath = window.location.pathname;
  var LOCK_PRE = 'bdm-qdone::' + bookPath + '::';

  var db     = null;
  var userId = null;

  /* ── Init Supabase ── */
  function initSupa() {
    if (typeof supabase === 'undefined') return;
    var client = supabase.createClient(SUPA_URL, SUPA_ANON);
    db = client;

    // Lê userId via custom-auth de forma síncrona (sem esperar Promise)
    try {
      var al = JSON.parse(localStorage.getItem('bdm-aluno') || 'null');
      if (al && al.id) userId = al.id;
    } catch(e) {}

    // Sobrescreve com Supabase Auth se houver sessão ativa
    client.auth.getSession().then(function(res) {
      var s = res && res.data && res.data.session;
      if (s && s.user && s.user.id) userId = s.user.id;

      // Após ter o userId, tenta reenviar resultados que ficaram pendentes
      if (userId) setTimeout(retrySyncPending, 800);
    }).catch(function() {
      if (userId) setTimeout(retrySyncPending, 800);
    });
  }

  /* ── Book label ── */
  function bookLabel() {
    var t = document.title || '';
    var parts = t.split('|').map(function(s) { return s.trim(); }).filter(Boolean);
    if (parts.length >= 2) return parts.slice(1).join(' · ');
    var m = bookPath.match(/livros\/(\d+)-serie\/([^\/]+)\/(\d+)-bimestre/);
    if (m) return m[1] + 'ª Série · ' + m[2].replace(/-/g,' ') + ' · ' + m[3] + 'º Bimestre';
    return bookPath;
  }

  /* ════════════════════════════════════════════════════════════
     LOCK STORAGE — armazena resultado junto com o travamento
     Formato novo: { done:1, correct:N, total:M, label:'...', synced:false }
     Formato antigo (legado): '1' — detectado e migrado
  ════════════════════════════════════════════════════════════ */
  function isLocked(quizKey) {
    try {
      var v = localStorage.getItem(LOCK_PRE + quizKey);
      if (!v) return false;
      if (v === '1') return true;
      var obj = JSON.parse(v);
      return !!(obj && obj.done);
    } catch(e) { return false; }
  }

  function getLockData(quizKey) {
    try {
      var v = localStorage.getItem(LOCK_PRE + quizKey);
      if (!v) return null;
      if (v === '1') return { done: 1, correct: null, total: null, synced: false, legacy: true };
      return JSON.parse(v);
    } catch(e) { return null; }
  }

  function setLocked(quizKey, correct, total, label, synced) {
    try {
      localStorage.setItem(LOCK_PRE + quizKey, JSON.stringify({
        done:    1,
        correct: correct != null ? correct : 0,
        total:   total   != null ? total   : 0,
        label:   label   || quizKey,
        synced:  !!synced
      }));
    } catch(e) {}
  }

  function markSynced(quizKey) {
    try {
      var data = getLockData(quizKey);
      if (data) {
        data.synced = true;
        data.legacy = false;
        localStorage.setItem(LOCK_PRE + quizKey, JSON.stringify(data));
      }
      // Atualiza texto na UI se o quiz estiver visível
      var container = document.getElementById(quizKey);
      if (container) {
        var notice = container.querySelector('.bdm-done-notice');
        if (notice) notice.textContent = '✅ Quiz já realizado — resultado enviado ao professor.';
      }
    } catch(e) {}
  }

  /* ════════════════════════════════════════════════════════════
     ENVIO AO SUPABASE
  ════════════════════════════════════════════════════════════ */
  function _doSend(quizId, label, correct, total, answers, onSuccess) {
    if (!db || !userId) return;
    db.from('quiz_results').upsert({
      user_id:      userId,
      book_path:    bookPath,
      book_label:   bookLabel(),
      quiz_id:      quizId,
      quiz_label:   label || quizId,
      correct:      correct  || 0,
      total:        total    || 0,
      answers:      answers  || [],
      completed_at: new Date().toISOString()
    }, { onConflict: 'user_id,book_path,quiz_id' })
    .then(function(res) {
      if (res && res.error) {
        console.error('[BDM quiz] Falha ao salvar resultado:', res.error.message, res.error);
        return;
      }
      if (onSuccess) onSuccess();
    })
    .catch(function(err) {
      console.error('[BDM quiz] Erro de rede ao salvar resultado:', err);
    });
  }

  /* Chamado quando um quiz é concluído agora */
  function sendResult(quizId, label, correct, total, answers) {
    // 1. Salva no localStorage IMEDIATAMENTE (não perde mesmo offline)
    setLocked(quizId, correct, total, label, false);

    // 2. Tenta enviar ao Supabase
    if (!db || !userId) return;
    _doSend(quizId, label, correct, total, answers, function() {
      markSynced(quizId);
    });
  }

  /* ════════════════════════════════════════════════════════════
     RETRY AUTOMÁTICO — verifica quais locks não foram sincronizados
     e reenvia ao Supabase ao abrir o livro novamente
  ════════════════════════════════════════════════════════════ */
  function retrySyncPending() {
    if (!db || !userId) return;

    // Coleta todos os quizzes deste livro que estão travados mas não sincronizados
    var pending = [];
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var key = localStorage.key(i);
        if (!key || key.indexOf(LOCK_PRE) !== 0) continue;
        var quizId = key.slice(LOCK_PRE.length);
        var data   = getLockData(quizId);
        if (data && data.done && !data.synced) {
          pending.push({ quizId: quizId, data: data });
        }
      }
    } catch(e) {}

    if (!pending.length) return;

    // Busca quais já existem no Supabase para este usuário + livro
    db.from('quiz_results')
      .select('quiz_id')
      .eq('user_id',   userId)
      .eq('book_path', bookPath)
      .then(function(res) {
        var saved = {};
        ((res && res.data) || []).forEach(function(r) { saved[r.quiz_id] = true; });

        pending.forEach(function(item) {
          if (saved[item.quizId]) {
            // Já existe — apenas marca como sincronizado localmente
            markSynced(item.quizId);
            return;
          }
          // Não existe — reenvia
          var d = item.data;
          _doSend(
            item.quizId,
            d.label || item.quizId,
            d.correct != null ? d.correct : 0,
            d.total   != null ? d.total   : 0,
            [],
            function() { markSynced(item.quizId); }
          );
        });
      })
      .catch(function() {});
  }

  /* ════════════════════════════════════════════════════════════
     COLETAR RESPOSTAS DO DOM
  ════════════════════════════════════════════════════════════ */
  function collectAnswers(container) {
    if (!container) return { answers: [], correct: 0, total: 0 };
    var answers = [];
    var correct = 0;

    var mqCards = container.querySelectorAll('.mc-q[data-answered], .mc-q.answered, .qmc-card.answered');
    if (!mqCards.length) mqCards = container.querySelectorAll('.answered[id]');

    mqCards.forEach(function(card) {
      var wasWrong = !!(card.querySelector('.qmc-opt.wrong, .qmc-opt.mc-wrong, .qmc-opt.sel-wrong, button.wrong'));
      answers.push({ questionId: card.id, correct: !wasWrong });
      if (!wasWrong) correct++;
    });

    if (!answers.length) {
      container.querySelectorAll('.mc-group').forEach(function(g, i) {
        var hasWrong   = !!g.querySelector('.mc-opt.mc-wrong');
        var hasCorrect = !!g.querySelector('.mc-opt.mc-correct');
        if (hasWrong || hasCorrect) {
          answers.push({ questionId: g.id || ('q'+i), correct: hasCorrect && !hasWrong });
          if (hasCorrect && !hasWrong) correct++;
        }
      });
    }

    return { answers: answers, correct: correct, total: answers.length };
  }

  function getQuizLabel(container) {
    if (!container) return 'Quiz';
    var el = container.querySelector('.quiz-title, .bloco-title, h3');
    if (el) return el.textContent.trim().replace(/^[\s📊📚⚔️🏰🎨]+/, '').trim();
    return container.id || 'Quiz';
  }

  /* ════════════════════════════════════════════════════════════
     TRAVAR SEÇÃO NA UI
  ════════════════════════════════════════════════════════════ */
  function lockSection(container) {
    if (!container) return;
    container.querySelectorAll('.qmc-opt, .mc-opt, .ativ-mc-opt, .quiz-opt').forEach(function(btn) {
      btn.disabled = true;
    });
    container.querySelectorAll(
      '.qrb-retry, .qr-retry, [onclick*="retryQuiz"], [onclick*="resetQuiz"], [onclick*="retryBlocoQuiz"], [onclick*="retryQuizF"]'
    ).forEach(function(btn) { btn.remove(); });
    if (!container.querySelector('.bdm-done-notice')) {
      var notice = document.createElement('div');
      notice.className = 'bdm-done-notice';
      notice.style.cssText =
        'background:rgba(0,80,20,.2);border:1px solid #4a9a60;border-radius:10px;' +
        'padding:.7rem 1rem;text-align:center;color:#8effa0;font-size:.82rem;margin:1rem 0;';
      var lockData = getLockData(container.id || '');
      var synced = lockData && lockData.synced;
      notice.textContent = synced
        ? '✅ Quiz já realizado — resultado enviado ao professor.'
        : '✅ Quiz já realizado — resultado salvo (será sincronizado em breve).';
      container.appendChild(notice);
    }
  }

  /* ════════════════════════════════════════════════════════════
     MODAL DE AVISO
  ════════════════════════════════════════════════════════════ */
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
    overlay.querySelector('#bdm-warn-yes').onclick = function() { overlay.remove(); onConfirm(); };
    overlay.querySelector('#bdm-warn-no').onclick  = function() { overlay.remove(); };
    overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };
  }

  /* ════════════════════════════════════════════════════════════
     DETECTAR CONTAINER DO QUIZ
  ════════════════════════════════════════════════════════════ */
  function getQuizContainer(el) {
    var c = el.closest('[id^="quiz"],[id^="b1"],[id^="b2"],[id^="b3"],[id^="b4"],' +
                       '[id^="bloco"],[id^="c0"],[id^="q1"],[id^="q2"],[id^="q3"],' +
                       '[id^="q4"],[id^="q5"],[id^="q6"],[id^="q7"],[id^="q8"]');
    return c || el.closest('section[id]');
  }

  /* ════════════════════════════════════════════════════════════
     INTERCEPTAÇÃO DE CLIQUES
  ════════════════════════════════════════════════════════════ */
  var confirmedButtons = (typeof WeakSet !== 'undefined') ? new WeakSet() : null;

  document.addEventListener('click', function(e) {
    var btn = e.target.closest
      ? e.target.closest('.qmc-opt, .mc-opt, .ativ-mc-opt, .quiz-opt')
      : null;
    if (!btn) return;
    if (confirmedButtons && confirmedButtons.has(btn)) return;

    var container = getQuizContainer(btn);
    var quizKey   = container ? container.id : '_page_';

    if (isLocked(quizKey)) {
      e.stopImmediatePropagation();
      e.preventDefault();
      return;
    }

    var hasAnswered = container && !!(container.querySelector(
      '.mc-q[data-answered], .mc-q.answered, .qmc-card.answered, .answered[id],' +
      '.mc-opt.mc-correct, .mc-opt.mc-wrong, .qmc-opt.correct, .qmc-opt.wrong'
    ));
    if (hasAnswered) return;

    e.stopImmediatePropagation();
    e.preventDefault();
    var capturedBtn = btn;
    showWarning(quizKey, function() {
      if (confirmedButtons) confirmedButtons.add(capturedBtn);
      capturedBtn.click();
    });
  }, true);

  /* ════════════════════════════════════════════════════════════
     DETECÇÃO DE CONCLUSÃO DE QUIZ
  ════════════════════════════════════════════════════════════ */
  function onBannerShown(banner) {
    var container = banner.closest(
      '.quiz-section, .quiz-section-f, .bloco-quiz, [id^="quiz"], section[id]'
    ) || banner.parentElement;

    var quizKey = (container && container.id) ? container.id : banner.id;
    if (isLocked(quizKey)) return;

    var data  = collectAnswers(container || banner.parentElement);
    var label = getQuizLabel(container || banner.parentElement);

    // Salva localmente + envia ao Supabase
    sendResult(quizKey, label, data.correct, data.total, data.answers);

    var scope = container || banner.parentElement;
    if (scope) {
      scope.querySelectorAll(
        '.qrb-retry, .qr-retry, [onclick*="retryQuiz"], [onclick*="resetQuiz"],' +
        '[onclick*="retryBlocoQuiz"], [onclick*="retryQuizF"]'
      ).forEach(function(b) { b.remove(); });
    }
  }

  function checkSectionComplete(section) {
    var groups = section.querySelectorAll('.mc-group');
    if (!groups.length) return;
    var allDone = true;
    groups.forEach(function(g) {
      if (!g.querySelector('.mc-opt.mc-correct, .mc-opt.mc-wrong')) allDone = false;
    });
    if (!allDone) return;
    var secId = section.id;
    if (isLocked(secId)) return;
    var data  = collectAnswers(section);
    var label = getQuizLabel(section);
    sendResult(secId, label, data.correct, data.total, data.answers);
  }

  /* ════════════════════════════════════════════════════════════
     WINDOW LOAD
  ════════════════════════════════════════════════════════════ */
  window.addEventListener('load', function() {
    ['resetQuiz','retryQuiz','retryQuizF','retryBlocoQuiz'].forEach(function(fn) {
      if (typeof window[fn] === 'function') window[fn] = function() {};
    });

    document.querySelectorAll(
      '.qrb-retry, .qr-retry, [onclick*="retryQuiz"], [onclick*="resetQuiz"],' +
      '[onclick*="retryBlocoQuiz"], [onclick*="retryQuizF"]'
    ).forEach(function(btn) { btn.remove(); });

    document.querySelectorAll('[id]').forEach(function(el) {
      if (isLocked(el.id)) lockSection(el);
    });

    /* MutationObserver: banners de resultado */
    var resultBanners = document.querySelectorAll('.quiz-result-banner, .quiz-result');
    if (resultBanners.length) {
      var observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mut) {
          if (mut.type !== 'attributes' || mut.attributeName !== 'class') return;
          if (mut.target.classList.contains('show')) onBannerShown(mut.target);
        });
      });
      resultBanners.forEach(function(b) {
        observer.observe(b, { attributes: true, attributeFilter: ['class'] });
      });
    }

    /* MutationObserver: livros checkMC */
    var mcGroups = document.querySelectorAll('.mc-group');
    if (mcGroups.length) {
      var mcObs = new MutationObserver(function(mutations) {
        mutations.forEach(function(mut) {
          var section = mut.target.closest('section[id]');
          if (section) checkSectionComplete(section);
        });
      });
      mcGroups.forEach(function(g) {
        mcObs.observe(g, { subtree: true, attributes: true, attributeFilter: ['class','disabled'] });
      });
    }

    /* Wrap showQuizResult / showResult */
    ['showQuizResult','showResult'].forEach(function(fnName) {
      var orig = window[fnName];
      if (typeof orig !== 'function') return;
      window[fnName] = function(qId, correct, total) {
        orig.apply(this, arguments);
        var banner = document.getElementById('qr' + (qId||'').replace('quiz',''))
                  || document.getElementById('res-' + qId)
                  || document.getElementById(qId + '_banner')
                  || document.getElementById(qId + '-banner')
                  || document.getElementById('qres-' + qId);
        if (banner) onBannerShown(banner);
      };
    });
  });

  /* ── Init ── */
  initSupa();
})();
