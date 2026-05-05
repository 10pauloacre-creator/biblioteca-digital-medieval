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
  var QUIZ_VERSION = '3';

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
      b.style.pointerEvents = 'none';
      b.style.cursor = 'default';
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

    if (!answers.length) {
      container.querySelectorAll('.ativ-q[id][data-answered]').forEach(function(q) {
        var wasWrong = !!q.querySelector('.ativ-mc-opt.wrong');
        answers.push({ questionId: q.id, correct: !wasWrong });
        if (!wasWrong) correct++;
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

  function checkAtivComplete(section) {
    var qs = section.querySelectorAll('.ativ-q[id]');
    if (!qs.length) return;
    var allDone = true;
    qs.forEach(function(q) { if (!q.getAttribute('data-answered')) allDone = false; });
    if (!allDone) return;
    var secId = section.id;
    if (!secId || isLocked(secId)) return;
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
        '<p style="color:#f5e8c0;font-size:.88rem;line-height:1.7;margin-bottom:.8rem">' +
        'Este quiz <strong>só pode ser realizado uma única vez</strong>.<br>' +
        'Responda todas as questões e clique em<br><strong>📨 Enviar Resultado</strong> ao terminar.</p>' +
        '<div style="background:rgba(255,60,60,.12);border:1px solid rgba(255,80,80,.4);' +
        'border-radius:8px;padding:.65rem .9rem;margin-bottom:1rem;font-size:.78rem;' +
        'color:#ffbbbb;line-height:1.55;text-align:left;">' +
        '🚫 <strong>Anti-Cola:</strong> Sair desta aba, trocar de janela ou dividir a tela<br>' +
        'causará o <strong style="color:#ff6666">cancelamento com 0 pontos</strong>.<br>' +
        '📸 A tela possui marca d\'água com seu nome.</div>' +
        '<p style="color:#f5e8c0;font-size:.88rem;margin-bottom:1.3rem">Tem certeza que deseja começar agora?</p>' +
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

    /* MutationObserver: ativ-q (LP 3ª série, C-Humanas 2ª série) */
    var ativQs = document.querySelectorAll('.ativ-q[id]');
    if (ativQs.length) {
      var ativObs = new MutationObserver(function(mutations) {
        mutations.forEach(function(mut) {
          var section = mut.target.closest('section[id]');
          if (section) checkAtivComplete(section);
        });
      });
      ativQs.forEach(function(q) {
        ativObs.observe(q, { attributes: true, attributeFilter: ['data-answered'] });
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

  /* ════════════════════════════════════════════════════════════
     MÓDULO DE SEGURANÇA ANTI-COLA v1
     - Proteção de conteúdo (sem cópia, sem arrastar, sem print)
     - Marca d'água com nome do aluno
     - Monitor de quiz: aba oculta / blur / split screen → cancelamento
     - Intercepta getDisplayMedia (captura de tela via API)
  ════════════════════════════════════════════════════════════ */
  var _sec = {
    v: 0,          // contagem de violações
    done: false,   // quiz cancelado ou todos enviados
    on: false,     // quiz em andamento
    alert: false,  // overlay visível
    ready: false   // período de graça após load
  };

  // Período de graça: ignora eventos nos primeiros 2.5s
  setTimeout(function() { _sec.ready = true; }, 2500);

  // Hook: quiz iniciado (usuário confirma "INICIAR QUIZ")
  var _swOrig = showWarning;
  showWarning = function(qk, cb) {
    // Bloqueia quiz se o app não estiver em tela cheia (janela flutuante / app reduzido)
    // screen.width é a largura física do dispositivo em CSS-px — comparação confiável no mobile
    var sw = screen.width || window.screen.width;
    var isTouch = 'ontouchstart' in window || (navigator.maxTouchPoints || 0) > 0;
    if (isTouch && sw && (window.innerWidth / sw) < 0.84) {
      _secShowOverlay(
        '🪟 O app está em <strong>modo de janela reduzida ou flutuante</strong>.<br><br>' +
        'Por segurança, o quiz só pode ser realizado com o app em ' +
        '<strong style="color:#ffdd55">tela cheia</strong>.<br><br>' +
        '<span style="font-size:.82rem;opacity:.8">Feche a janela flutuante, abra o app ' +
        'normalmente e tente novamente.</span>',
        false
      );
      return; // não inicia o quiz
    }
    _swOrig(qk, function() { _sec.on = true; cb(); });
  };

  // Hook: quiz enviado — verifica se ainda há quizzes pendentes
  var _msOrig = markSynced;
  markSynced = function(k) {
    _msOrig(k);
    if (_sec.done) return;
    setTimeout(function() {
      var found = false;
      try {
        for (var i = 0; i < localStorage.length; i++) {
          var key = localStorage.key(i);
          if (key && key.indexOf(LOCK_PRE) === 0) {
            var d = JSON.parse(localStorage.getItem(key) || 'null');
            if (d && d.done && !d.synced) { found = true; break; }
          }
        }
      } catch(e) {}
      if (!found) _sec.on = false;
    }, 300);
  };

  /* ── Proteção de Conteúdo (mobile-first) ── */
  (function() {
    var s = document.createElement('style');
    s.textContent =
      // Seleção de texto: mobile e desktop
      'body,body *{' +
        '-webkit-user-select:none!important;user-select:none!important;' +
        '-webkit-touch-callout:none!important;' +    // iOS: sem callout no long-press
        '-webkit-tap-highlight-color:transparent;' + // iOS: sem flash de seleção
        'touch-action:pan-y pan-x;' +               // permite scroll, bloqueia zoom por pinça
      '}' +
      // Permitir digitação em campos
      'input,textarea,select{' +
        '-webkit-user-select:text!important;user-select:text!important;' +
        'touch-action:auto!important;' +
      '}' +
      // Imagens: bloquear salvar/arrastar no mobile (iOS long-press)
      'img,picture,video{' +
        'pointer-events:none!important;' +
        '-webkit-user-drag:none!important;' +
        'user-drag:none!important;' +
      '}' +
      // Impressão: html E body + todos os filhos — garante bloqueio no Android Chrome e iOS
      '@media print{' +
        'html,body{display:none!important;visibility:hidden!important;}' +
        '*{display:none!important;visibility:hidden!important;}' +
      '}';
    (document.head || document.documentElement).appendChild(s);

    // beforeprint: sobrepõe tela preta ANTES da renderização para impressão
    // Necessário no mobile porque Android/iOS às vezes ignora @media print
    window.addEventListener('beforeprint', function() {
      var el = document.getElementById('bdm-print-blk') || document.createElement('div');
      el.id = 'bdm-print-blk';
      el.style.cssText =
        'position:fixed;inset:0;background:#000;z-index:2147483647;' +
        'display:flex;align-items:center;justify-content:center;';
      el.innerHTML =
        '<span style="color:#333;font-family:sans-serif;font-size:.9rem">' +
        'Conteúdo protegido</span>';
      document.body.appendChild(el);
      document.documentElement.style.setProperty('display', 'none', 'important');
    });
    window.addEventListener('afterprint', function() {
      var el = document.getElementById('bdm-print-blk');
      if (el) el.remove();
      document.documentElement.style.removeProperty('display');
    });

    // Sem menu de contexto (desktop e Android long-press)
    document.addEventListener('contextmenu', function(e) { e.preventDefault(); }, true);
    document.addEventListener('dragstart',   function(e) { e.preventDefault(); }, true);
    document.addEventListener('keydown', function(e) {
      var k = (e.key || '').toLowerCase();
      var c = e.ctrlKey || e.metaKey;
      if (c && k.length === 1 && 'caaxspuv'.indexOf(k) !== -1) { e.preventDefault(); return; }
      if (k === 'f12' || k === 'printscreen') e.preventDefault();
    }, true);

    // Captura de tela: bloqueada pelo header HTTP Permissions-Policy: display-capture=()
    // Não sobrescrevemos APIs nativas do browser — esse padrão ativa alarmes de segurança
    // do Android (Play Protect, Samsung Knox) e impede a instalação do PWA
  })();

  /* ── Marca d'água com nome do aluno ── */
  function _secWatermark(name) {
    try {
      var old = document.getElementById('bdm-wm');
      if (old) return;
      var cv = document.createElement('canvas');
      cv.width = 340; cv.height = 160;
      var cx = cv.getContext('2d');
      cx.save();
      cx.translate(170, 80); cx.rotate(-Math.PI / 7);
      cx.textAlign = 'center';
      cx.font = 'bold 15px Arial,sans-serif';
      cx.fillStyle = 'rgba(180,130,20,0.11)';
      cx.fillText(name, 0, -4);
      cx.font = '11px Arial,sans-serif';
      cx.fillStyle = 'rgba(180,130,20,0.08)';
      cx.fillText(new Date().toLocaleDateString('pt-BR'), 0, 14);
      cx.restore();
      var wm = document.createElement('div');
      wm.id = 'bdm-wm';
      wm.setAttribute('aria-hidden', 'true');
      wm.style.cssText =
        'position:fixed;inset:0;z-index:9997;pointer-events:none;' +
        'background:url(' + cv.toDataURL() + ') repeat;background-size:340px 160px;';
      document.body.appendChild(wm);
    } catch(e) {}
  }

  /* ── Overlay de alerta personalizado ── */
  function _secShowOverlay(msg, fatal) {
    if (_sec.alert && !fatal) return;
    var old = document.getElementById('bdm-sec-ov');
    if (old) old.remove();
    _sec.alert = true;
    var ov = document.createElement('div');
    ov.id = 'bdm-sec-ov';
    ov.style.cssText =
      'position:fixed;inset:0;z-index:2147483647;background:rgba(0,0,0,.92);' +
      'display:flex;align-items:center;justify-content:center;padding:1.2rem;';
    var clr = fatal ? '#ff4444' : '#f0c040';
    var ico = fatal ? '🚫' : '⚠️';
    var tit = fatal ? 'QUIZ CANCELADO' : 'ATIVIDADE SUSPEITA DETECTADA';
    ov.innerHTML =
      '<div style="background:linear-gradient(135deg,#1a0000,#2a0800);max-width:400px;width:100%;' +
      'border:2px solid ' + clr + ';border-radius:14px;padding:2rem 1.8rem;text-align:center;' +
      'box-shadow:0 0 80px rgba(255,50,50,.5);">' +
        '<div style="font-size:3.5rem;line-height:1;margin-bottom:.8rem">' + ico + '</div>' +
        '<h2 style="font-family:Cinzel,Georgia,serif;color:' + clr + ';font-size:.95rem;' +
        'letter-spacing:.12em;margin-bottom:.9rem">' + tit + '</h2>' +
        '<div style="color:#f5deb0;font-size:.88rem;line-height:1.75;margin-bottom:1.2rem">' + msg + '</div>' +
        (fatal ? '' :
          '<button id="bdm-sec-btn" style="font-family:Cinzel,Georgia,serif;padding:.6rem 2rem;' +
          'border-radius:8px;border:2px solid #c4860a;background:linear-gradient(135deg,#5a0e0e,#c4860a);' +
          'color:#fff;font-weight:700;font-size:.75rem;cursor:pointer;letter-spacing:.08em">ENTENDIDO</button>'
        ) +
      '</div>';
    document.body.appendChild(ov);
    if (!fatal) {
      var btn = document.getElementById('bdm-sec-btn');
      if (btn) btn.onclick = function() { ov.remove(); _sec.alert = false; };
      setTimeout(function() { if (ov.parentNode) { ov.remove(); _sec.alert = false; } }, 7000);
    }
  }

  /* ── Cancelar quiz com 0 pontos ── */
  function _secCancel(reason) {
    if (_sec.done) return;
    _sec.done = true; _sec.on = false;
    var sel =
      '[id^="quiz"],[id^="b1"],[id^="b2"],[id^="b3"],[id^="b4"],' +
      '[id^="bloco"],[id^="c0"],[id^="q1"],[id^="q2"],[id^="q3"],[id^="q4"],[id^="q5"]';
    document.querySelectorAll(sel).forEach(function(c) {
      if (!c.id) return;
      var ld = getLockData(c.id);
      if (ld && ld.synced) return;
      var tot = c.querySelectorAll('.mc-q,.mc-group').length || (ld && ld.total) || 1;
      var ans = [{ cancelled: true, reason: reason }];
      setLocked(c.id, 0, tot, (ld && ld.label) || c.id, ans);
      lockSection(c);
      var sw = c.querySelector('.bdm-send-wrap');
      if (sw) sw.remove();
      _doSend(c.id, (ld && ld.label) || c.id, 0, tot, ans,
        function() { _msOrig(c.id); }, function() {});
      if (!c.querySelector('.bdm-cancelled-notice')) {
        var n = document.createElement('div');
        n.className = 'bdm-cancelled-notice';
        n.style.cssText =
          'background:rgba(80,0,0,.35);border:2px solid #ff4444;border-radius:10px;' +
          'padding:.9rem 1.2rem;text-align:center;margin:1rem 0;';
        n.innerHTML =
          '<strong style="color:#ff5555;font-family:Cinzel,Georgia,serif;display:block;' +
          'margin-bottom:.35rem;font-size:.85rem">🚫 QUIZ CANCELADO</strong>' +
          '<span style="color:#ffaaaa;font-size:.78rem;line-height:1.6">' +
          'Saída de tela detectada. Resultado: <strong>0 pontos</strong>.<br>' +
          'Ação registrada no sistema.</span>';
        c.appendChild(n);
      }
    });
    _secShowOverlay(
      'Saída de tela detectada durante o quiz.<br><br>' +
      '<strong style="color:#ff5555;font-size:1.1em">Resultado: 0 pontos</strong><br><br>' +
      '<span style="font-size:.8rem;opacity:.75">Esta ação foi registrada no sistema do professor.</span>',
      true
    );
  }

  /* ── Processar violação ── */
  var _secLastViol = 0;
  function _secViolate(type, immediate) {
    if (_sec.done || !_sec.ready || !_sec.on) return;
    var now = Date.now();
    if (!immediate && now - _secLastViol < 300) return; // debounce
    _secLastViol = now;
    if (immediate || type === 'split_screen') {
      _secCancel(type); return;
    }
    _sec.v++;
    if (_sec.v >= 2) {
      _secCancel(type);
    } else {
      _secShowOverlay(
        'Você saiu da tela durante o quiz!<br><br>' +
        '<span style="color:#ffdd55">⚠️ ÚLTIMO AVISO</span><br>' +
        'Se sair novamente, o quiz será<br>' +
        '<strong style="color:#ff5555">cancelado com 0 pontos</strong>.',
        false
      );
    }
  }

  /* ── Monitores de detecção (mobile-first) ── */

  // Detecta dispositivo touch UMA vez aqui — usado em todos os monitores abaixo
  var _secIsTouch = 'ontouchstart' in window || (navigator.maxTouchPoints || 0) > 0;

  // Dimensões de referência (viewport real, não pixels físicos do device)
  var _secInitW = window.innerWidth;
  var _secInitH = window.innerHeight;

  // Ao mudar orientação atualiza referência para não gerar falso positivo
  function _secResetRef() {
    setTimeout(function() {
      _secInitW = window.innerWidth;
      _secInitH = window.innerHeight;
    }, 600);
  }
  window.addEventListener('orientationchange', _secResetRef);
  if (screen.orientation) screen.orientation.addEventListener('change', _secResetRef);

  // 1. Tab oculta / app em background (principal sinal no mobile)
  document.addEventListener('visibilitychange', function() {
    if (document.hidden) _secViolate('tab_hidden');
  });

  // 2. Janela sem foco (outro app sobreposto, Alt+Tab no desktop)
  //    Mobile: só conta quando visibilitychange também confirma (evita falsos
  //    disparados por notificações do sistema, teclado, barra de status)
  var _secBlurT = null;
  window.addEventListener('blur', function() {
    clearTimeout(_secBlurT);
    _secBlurT = setTimeout(function() {
      if (!document.hasFocus()) {
        if (_secIsTouch) {
          if (document.hidden) _secViolate('window_blur'); // mobile: exige dupla confirmação
        } else {
          _secViolate('window_blur'); // desktop: blur sozinho já é suficiente
        }
      }
    }, _secIsTouch ? 600 : 400);
  });
  window.addEventListener('focus', function() { clearTimeout(_secBlurT); });

  // 3. Tela dividida / janela reduzida durante quiz (Android split screen, iPad, desktop)
  //    Mobile: usa screen.width como referência absoluta (não _secInitW, que pode ter sido
  //    capturado já dentro de uma janela flutuante)
  //    Teclado virtual → só muda altura, nunca a largura → só checamos largura no mobile
  var _secRzT = null;
  window.addEventListener('resize', function() {
    clearTimeout(_secRzT);
    _secRzT = setTimeout(function() {
      if (!_sec.on || _sec.done) return;
      var sw = screen.width || window.screen.width;
      if (_secIsTouch) {
        // Referência: screen.width (largura física real do dispositivo em CSS px)
        var wRatio = sw ? (window.innerWidth / sw) : (window.innerWidth / _secInitW);
        if (wRatio < 0.84) _secViolate('split_screen', true);
      } else {
        var wr = window.innerWidth  / (screen.width  || 1920);
        var hr = window.innerHeight / (screen.height || 1080);
        if (wr < 0.62 || hr < 0.60) _secViolate('split_screen', true);
      }
    }, 800);
  });

  /* ── Inicializa marca d'água e aviso de janela reduzida após load ── */
  window.addEventListener('load', function() {
    // Aviso não-bloqueante se o app carregou em janela reduzida (antes do quiz)
    var sw = screen.width || window.screen.width;
    if (_secIsTouch && sw && (window.innerWidth / sw) < 0.84) {
      var banner = document.createElement('div');
      banner.id = 'bdm-small-warn';
      banner.style.cssText =
        'position:fixed;top:0;left:0;right:0;z-index:99999;' +
        'background:linear-gradient(90deg,#3a0000,#5a1500);' +
        'border-bottom:2px solid #ff4444;' +
        'padding:.65rem 1rem;text-align:center;' +
        'font-family:Cinzel,Georgia,serif;font-size:.72rem;color:#ffaaaa;' +
        'letter-spacing:.05em;';
      banner.innerHTML =
        '⚠️ App em modo de janela reduzida — quizzes bloqueados até usar tela cheia';
      document.body.appendChild(banner);
    }

    // Marca d'água com nome do aluno
    var nm = '';
    try {
      var al = JSON.parse(localStorage.getItem('bdm-aluno') || 'null');
      nm = (al && (al.nome_completo || al.nome || al.email)) || '';
    } catch(e) {}
    if (nm) {
      _secWatermark(nm);
    } else if (typeof supabase !== 'undefined') {
      try {
        supabase.createClient(SUPA_URL, SUPA_ANON).auth.getSession().then(function(r) {
          var s = r && r.data && r.data.session;
          if (s && s.user) _secWatermark(s.user.email || s.user.id || 'Aluno');
        }).catch(function() {});
      } catch(e) {}
    }
  });

  /* ── Init ── */
  checkVersion();
  initSupa();
})();
