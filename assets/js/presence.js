/* ── Módulo de presença online ──────────────────────────────────
   Atualiza last_seen a cada 60 s enquanto o app estiver aberto.
   Suporta alunos (auth customizada via localStorage) e professor
   (Supabase auth). Pausa quando a aba fica oculta.
   ─────────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  var BEAT_MS   = 60000;   // intervalo de heartbeat
  var ONLINE_MS = 120000;  // limiar: 2 min sem ping = offline

  var _db    = null;
  var _timer = null;

  function getDb() {
    if (_db) return _db;
    if (window.supabase && window.SUPABASE_URL && window.SUPABASE_ANON) {
      _db = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON);
    }
    return _db;
  }

  function getStudentId() {
    try {
      var s = JSON.parse(localStorage.getItem('bdm-aluno') || 'null');
      return (s && s.id) ? s.id : null;
    } catch (e) { return null; }
  }

  async function ping() {
    var db = getDb();
    if (!db) return;

    var ids = [];

    // Aluno (auth customizada)
    var sid = getStudentId();
    if (sid) ids.push(sid);

    // Professor (Supabase auth)
    try {
      var res = await db.auth.getSession();
      var uid = res.data && res.data.session && res.data.session.user
               ? res.data.session.user.id : null;
      if (uid && uid !== sid) ids.push(uid);
    } catch (e) {}

    if (!ids.length) return;
    var now = new Date().toISOString();
    for (var i = 0; i < ids.length; i++) {
      try {
        await db.from('presence').upsert({ id: ids[i], last_seen: now }, { onConflict: 'id' });
      } catch (e) {}
    }
  }

  function startBeat() {
    if (_timer) return;
    ping();
    _timer = setInterval(ping, BEAT_MS);
  }

  function stopBeat() {
    clearInterval(_timer);
    _timer = null;
  }

  document.addEventListener('visibilitychange', function () {
    document.hidden ? stopBeat() : startBeat();
  });
  window.addEventListener('beforeunload', stopBeat);

  if (!document.hidden) startBeat();

  // ── API pública ──────────────────────────────────────────────
  window.isOnline = function (lastSeen) {
    if (!lastSeen) return false;
    return Date.now() - new Date(lastSeen).getTime() < ONLINE_MS;
  };
})();
