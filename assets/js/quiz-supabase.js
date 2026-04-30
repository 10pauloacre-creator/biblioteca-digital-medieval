/* ================================================================
   quiz-supabase.js v2 — Biblioteca Digital Medieval
   Fluxo:
   1. Cada questão: aviso único antes do primeiro clique → resposta travada
   2. Ao concluir todas as questões: aparece botão "Enviar Resultado"
   3. Clique em Enviar: grava no Supabase → trava seção → confirmação
   4. Se falhar: botão volta, mostra mensagem de erro para tentar de novo
   5. QUIZ_VERSION='2' limpa localStorage antigo em todos os dispositivos
   ================================================================ */
(function () {
  'use strict';

  var SUPA_URL     = 'https://vgceathgwvtmjxbdpecr.supabase.co';
  var SUPA_ANON    = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZnY2VhdGhnd3Z0bWp4YmRwZWNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzMzIzODgsImV4cCI6MjA5MTkwODM4OH0.RDNkFfHMv0URRiCvptZDtglyU8XUOf95BGB-qnrPlew';
  var QUIZ_VERSION = '2';

  var bookPath = window.location.pathname;
  var LOCK_PRE = 'bdm-qdone::' + bookPath + '::';

  var db     = null;
  var userId = null;

  /* ════════════════════════════════════════════════════════════
     RESET DE VERSÃO — limpa localStorage antigo em todos os devices
  ════════════════════════════════════════════════════════════ */
  function checkVersion() {
    try {
      if (localStorage.getItem('bdm-quiz-version') === QUIZ_VERSION) return;
      var del = [];
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && k.indexOf('bdm-qdone::') === 0) del.push(k);
      }
      del.forEach(function(k) { localStorage.removeItem(k); });
      localStorage.setItem('bdm-quiz-version', QUIZ_VERSION);
    } catch(e) {}
  }

  /* ════════════════════════════════════════════════════════════
     INIT SUPABASE
  ════════════════════════════════════════════════════════════ */
  function initSupa() {
    if (typeof supabase === 'undefined') return;
    db = supabase.createClient(SUPA_URL, SUPA_ANON);

    try {
      var al = JSON.parse(localStorage.getItem('bdm-aluno') || 'null');
      if (al && al.id) userId = al.id;
    } catch(e) {}

    db.auth.getSession().then(function(res) {
      var s = res && res.data && res.data.session;
      if (s && s.user && s.user.id) userId = s.user.id;
    }).catch(function() {});
  }

  /* ════════════════════════════════════════════════════════════
     BOOK LABEL
  ════════════════════════════════════════════════════════════ */
  function bookLabel() {
    var t = document.title || '';
    var parts = t.split('|').map(function(s) { return s.trim(); }).filter(Boolean);
    if (parts.length >= 2) return parts.slice(1).join(' · ');
    var m = bookPath.match(/livros\/(\d+)-serie\/([^\/]+)\/(\d+)-bimestre/);
    if (m) return m[1] + 'ª Série · ' + m[2].replace(/-/g,' ') + ' · ' + m[3] + 'º Bimestre';
    return bookPath;
  }

  /* ════════════════════════════════════════════════════════════
     LOCK STORAGE
  ════════════════════════════════════════════════════════════ */
  function isLocked(quizKey) {
    try {
      var v = localStorage.getItem(LOCK_PRE + quizKey);
      if (!v) return false;
      var obj = JSON.parse(v);
      return !!(obj && obj.done);
    } catch(e) { return false; }
  }

  function getLockData(quizKey) {
    try {
      var v = localStorage.getItem(LOCK_PRE + quizKey);
      if (!v) return null;
      return JSON.parse(v);
    } catch(e) { return null; }
  }

  function setLocked(quizKey, correct, total, label, answers) {
    try {
      localStorage.setItem(LOCK_PRE + quizKey, JSON.stringify({
        done:    1,
        correct: correct != null ? correct : 0,
        total:   total   != null ? total   : 0,
        label:   label   || quizKey,
        answers: answers || [],
        synced:  false
      }));
    } catch(e) {}
  }

  function markSynced(quizKey) {
    try {
      var data = getLockData(quizKey);
      if (data) {
        data.synced = true;
        localStorage.setItem(LOCK_PRE + quizKey, JSON.stringify(data));
      }
    } catch(e) {}
  }

  /* ════════════════════════════════════════════════════════════
     ENVIO AO SUPABASE
  ════════════════════════════════════════════════════════════ */
  function _doSend(quizId, label, correct, total, answers, onSuccess, onError) {
    if (!db || !userId) {
      if (onError) onError('Usuário não identificado. Faça login novamente.');
      return;
    }
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
        console.error('[BDM quiz] Falha:', res.error.message, res.error);
        if (onError) onError(res.error.message);
        return;
      }
      if (onSuccess) onSuccess();
    })
    .catch(function(err) {
      console.error('[BDM quiz] Erro de rede:', err);
      if (onError) onError('Erro de rede. Verifique sua conexão.');
    });
  }

  /* ════════════════════════════════════════════════════════════
     BOTÃO "ENVIAR RESULTADO"
  ════════════════════════════════════════════════════════════ */
  function addSendButton(container, quizKey, correct, total, label, answers) {
    if (!container) return;
    if (container.querySelector('.bdm-send-wrap')) return;

    var wrong = total - correct;
    var score = correct + ' acerto' + (correct !== 1 ? 's' : '') +
                ' · ' + wrong + ' erro' + (wrong !== 1 ? 's' : '');

    var wrap = document.createElement('div');
    wrap.className = 'bdm-send-wrap';
    wrap.style.cssText =
      'text-align:center;margin:1.4rem 0 .6rem;padding:.6rem 1rem;' +
      'border-top:1px solid rgba(201,168,76,.2);';

    var info = document.createElement('div');
    info.style.cssText =
      'font-size:.8rem;color:#c9a870;margin-bottom:.75rem;letter-spacing:.03em;';
    info.textContent = '📊 Resultado: ' + score + ' — envie para registrar seus pontos.';
    wrap.appendChild(info);

    var btn = document.createElement('button');
    btn.className = 'bdm-send-btn';
    btn.style.cssText =
      'font-family:\'Cinzel\',Georgia,serif;font-size:.8rem;letter-spacing:.1em;font-weight:700;' +
      'padding:.7rem 2rem;border-radius:8px;cursor:pointer;transition:all .25s;' +
      'border:2px solid #c4860a;background:linear-gradient(135deg,#5a0e0e,#c4860a);' +
      'color:#fff;text-shadow:0 1px 2px rgba(0,0,0,.6);' +
      'box-shadow:0 0 24px rgba(196,134,10,.35);';
    btn.textContent = '📨 ENVIAR RESULTADO AO PROFESSOR';
    wrap.appendChild(btn);

    var errEl = document.createElement('div');
    errEl.style.cssText =
      'color:#ff8888;font-size:.76rem;margin-top:.55rem;display:none;';
    wrap.appendChild(errEl);

    btn.onclick = function() {
      btn.disabled = true;
      btn.style.opacity = '.55';
      btn.textContent = '⏳ Enviando…';
      errEl.style.display = 'none';

      _doSend(quizKey, label, correct, total, answers,
        function() {
          markSynced(quizKey);
          wrap.innerHTML =
            '<div style="background:rgba(0,90,20,.25);border:1px solid #4a9a60;border-radius:10px;' +
            'padding:.85rem 1.2rem;color:#8effa0;font-size:.85rem;line-height:1.5;">' +
            '✅ Resultado enviado!<br>' +
            '<span style="font-size:.75rem;opacity:.8">Acertos somam pontos · Erros subtraem pontos</span>' +
            '</div>';
          lockSection(container);
        },
        function(msg) {
          btn.disabled = false;
          btn.style.opacity = '1';
          btn.textContent = '📨 ENVIAR RESULTADO AO PROFESSOR';
          errEl.textContent = '⚠️ ' + (msg || 'Falha ao enviar. Verifique sua conexão e tente novamente.');
          errEl.style.display = 'block';
        }
      );
    };

    container.appendChild(wrap);
  }

  /* ════════════════════════════════════════════════════════════
     TRAVAR SEÇÃO (questões desabilitadas, retry removido)
  ════════════════════════════════════════════════════════════ */
  function lockSection(container) {
    if (!container) return;
    container.querySelectorAll('.qmc-opt, .mc-opt, .ativ-mc-opt, .quiz-opt').forEach(function(b) {
      b.disabled = true;
    });
    container.querySelectorAll(
      '.qrb-retry, .qr-retry, [onclick*="retryQuiz"], [onclick*="resetQuiz"],' +
      '[onclick*="retryBlocoQuiz"], [onclick*="retryQuizF"]'
    ).forEach(function(b) { b.remove(); });
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
      var wasWrong = !!(card.querySelector('.qmc-opt.wrong,.qmc-opt.mc-wrong,.qmc-opt.sel-wrong,button.wrong'));
      answers.push({ questionId: card.id, correct: !wasWrong });
      if (!wasWrong) correct++;
    });

    if (!answers.length) {
      container.querySelectorAll('.mc-group').forEach(function(g, i) {
        var hasWrong   = !!g.querySelector('.mc-opt.mc-wrong');
        var hasCorrect = !!g.querySelector('.mc-opt.mc-correct');
        if (hasWrong || hasCorrect) {
          answers.push({ questionId: g.id || ('q' + i), correct: hasCorrect && !hasWrong });
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
     DETECÇÃO DE CONTAINER
  ════════════════════════════════════════════════════════════ */
  function getQuizContainer(el) {
    var c = el.closest('[id^="quiz"],[id^="b1"],[id^="b2"],[id^="b3"],[id^="b4"],' +
                       '[id^="bloco"],[id^="c0"],[id^="q1"],[id^="q2"],[id^="q3"],' +
                       '[id^="q4"],[id^="q5"],[id^="q6"],[id^="q7"],[id^="q8"]');
    return c || el.closest('section[id]');
  }

  /* ════════════════════════════════════════════════════════════
     DETECÇÃO DE CONCLUSÃO
  ════════════════════════════════════════════════════════════ */
  function onBannerShown(banner) {
    var container = banner.closest(
      '.quiz-section,.quiz-section-f,.bloco-quiz,[id^="quiz"],section[id]'
    ) || banner.parentElement;

    var quizKey = (container && container.id) ? container.id : banner.id;
    if (isLocked(quizKey)) return;

    var data  = collectAnswers(container || banner.parentElement);
    var label = getQuizLabel(container || banner.parentElement);

    setLocked(quizKey, data.correct, data.total, label, data.answers);

    var scope = container || banner.parentElement;
    if (scope) {
      scope.querySelectorAll(
        '.qrb-retry,.qr-retry,[onclick*="retryQuiz"],[onclick*="resetQuiz"],' +
        '[onclick*="retryBlocoQuiz"],[onclick*="retryQuizF"]'
      ).forEach(function(b) { b.remove(); });
      addSendButton(scope, quizKey, data.correct, data.total, label, data.answers);
    }
  }

  function checkSectionComplete(section) {
    var groups = section.querySelectorAll('.mc-group');
    if (!groups.length) return;
    var allDone = true;
    groups.forEach(function(g) {
      if (!g.querySelector('.mc-opt.mc-correct,.mc-opt.mc-wrong')) allDone = false;
    });
    if (!allDone) return;
    var secId = section.id;
    if (isLocked(secId)) return;
    var data  = collectAnswers(section);
    var label = getQuizLabel(section);
    setLocked(secId, data.correct, data.total, label, data.answers);
    addSendButton(section, secId, data.correct, data.total, label, data.answers);
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
        '<p style="color:#f5e8c0;font-size:.88rem;line-height:1.7;margin-bottom:1.3rem">' +
        'Este quiz <strong>só pode ser realizado uma única vez</strong>.<br>' +
        'Responda todas as questões e clique em<br><strong>📨 Enviar Resultado</strong> ao terminar.<br><br>' +
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
      '.mc-q[data-answered],.mc-q.answered,.qmc-card.answered,.answered[id],' +
      '.mc-opt.mc-correct,.mc-opt.mc-wrong,.qmc-opt.correct,.qmc-opt.wrong'
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
     WINDOW LOAD
  ════════════════════════════════════════════════════════════ */
  window.addEventListener('load', function() {
    ['resetQuiz','retryQuiz','retryQuizF','retryBlocoQuiz'].forEach(function(fn) {
      if (typeof window[fn] === 'function') window[fn] = function() {};
    });

    document.querySelectorAll(
      '.qrb-retry,.qr-retry,[onclick*="retryQuiz"],[onclick*="resetQuiz"],' +
      '[onclick*="retryBlocoQuiz"],[onclick*="retryQuizF"]'
    ).forEach(function(b) { b.remove(); });

    // Restaura estado visual dos quizzes já feitos
    document.querySelectorAll('[id]').forEach(function(el) {
      var data = getLockData(el.id);
      if (!data || !data.done) return;
      lockSection(el);
      if (data.synced) {
        // Já enviado: mostra confirmação
        if (!el.querySelector('.bdm-send-wrap,.bdm-done-notice')) {
          var notice = document.createElement('div');
          notice.className = 'bdm-done-notice';
          notice.style.cssText =
            'background:rgba(0,80,20,.2);border:1px solid #4a9a60;border-radius:10px;' +
            'padding:.7rem 1rem;text-align:center;color:#8effa0;font-size:.82rem;margin:1rem 0;';
          notice.textContent = '✅ Resultado enviado ao professor.';
          el.appendChild(notice);
        }
      } else {
        // Feito mas não enviado: mostra botão de enviar
        addSendButton(el, el.id, data.correct || 0, data.total || 0, data.label || el.id, data.answers || []);
      }
    });

    /* MutationObserver: banners de resultado */
    var resultBanners = document.querySelectorAll('.quiz-result-banner, .quiz-result');
    if (resultBanners.length) {
      var obs = new MutationObserver(function(mutations) {
        mutations.forEach(function(mut) {
          if (mut.type === 'attributes' && mut.attributeName === 'class') {
            if (mut.target.classList.contains('show')) onBannerShown(mut.target);
          }
        });
      });
      resultBanners.forEach(function(b) {
        obs.observe(b, { attributes: true, attributeFilter: ['class'] });
      });
    }

    /* MutationObserver: mc-groups */
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
      window[fnName] = function(qId) {
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
  checkVersion();
  initSupa();
})();
