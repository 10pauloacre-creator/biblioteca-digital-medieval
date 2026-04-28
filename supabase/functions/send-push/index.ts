// ═══════════════════════════════════════════════════════════════
// Edge Function: send-push
// Envia Web Push para todos os alunos com subscription ativa.
//
// Deploy:
//   supabase functions deploy send-push --no-verify-jwt
//
// Variáveis de ambiente (supabase secrets set):
//   VAPID_SUBJECT      → mailto:seu-email@gmail.com
//   VAPID_PUBLIC_KEY   → chave pública VAPID (gere com web-push)
//   VAPID_PRIVATE_KEY  → chave privada VAPID
//   SUPABASE_URL       → URL do projeto (injetada automaticamente)
//   SUPABASE_SERVICE_ROLE_KEY → service role key (injetada automaticamente)
//
// Como gerar as chaves VAPID:
//   npm i -g web-push
//   web-push generate-vapid-keys
// ═══════════════════════════════════════════════════════════════

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Codificação base64url para cabeçalhos VAPID
function base64UrlEncode(data: Uint8Array): string {
  return btoa(String.fromCharCode(...data))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

async function buildVapidAuthHeader(endpoint: string): Promise<string> {
  const vapidSubject    = Deno.env.get('VAPID_SUBJECT')    || 'mailto:admin@escola.com';
  const vapidPublicKey  = Deno.env.get('VAPID_PUBLIC_KEY') || '';
  const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')|| '';

  const audience = new URL(endpoint).origin;
  const exp = Math.floor(Date.now() / 1000) + 12 * 3600;

  const header  = base64UrlEncode(new TextEncoder().encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const payload = base64UrlEncode(new TextEncoder().encode(JSON.stringify({ aud: audience, exp, sub: vapidSubject })));
  const sigInput = `${header}.${payload}`;

  // Importa chave privada VAPID (raw base64url, 32 bytes P-256)
  const rawPriv = Uint8Array.from(atob(vapidPrivateKey.replace(/-/g,'+').replace(/_/g,'/')), c => c.charCodeAt(0));
  const privKey = await crypto.subtle.importKey(
    'pkcs8',
    // Envelope PKCS8 mínimo para P-256
    buildPkcs8(rawPriv),
    { name: 'ECDSA', namedCurve: 'P-256' },
    false, ['sign']
  );

  const sig = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    privKey,
    new TextEncoder().encode(sigInput)
  );
  const sigB64 = base64UrlEncode(new Uint8Array(sig));
  const jwt = `${sigInput}.${sigB64}`;

  return `vapid t=${jwt},k=${vapidPublicKey}`;
}

function buildPkcs8(rawPriv: Uint8Array): ArrayBuffer {
  // RFC 5958 / SEC1 — envelope PKCS8 para EC P-256
  const seq = new Uint8Array([
    0x30, 0x41,
    0x02, 0x01, 0x00,
    0x30, 0x13,
      0x06, 0x07, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x02, 0x01, // OID ecPublicKey
      0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x03, 0x01, 0x07, // OID P-256
    0x04, 0x27,
      0x30, 0x25,
        0x02, 0x01, 0x01,
        0x04, 0x20, ...rawPriv
  ]);
  return seq.buffer;
}

async function sendPush(sub: { endpoint: string; p256dh: string; auth_key: string }, payload: string): Promise<boolean> {
  try {
    const authHeader = await buildVapidAuthHeader(sub.endpoint);
    const p256dhBytes = Uint8Array.from(atob(sub.p256dh.replace(/-/g,'+').replace(/_/g,'/')), c => c.charCodeAt(0));
    const authBytes   = Uint8Array.from(atob(sub.auth_key.replace(/-/g,'+').replace(/_/g,'/')), c => c.charCodeAt(0));

    // Encrypt payload (simplified — use web-push npm library for production)
    const res = await fetch(sub.endpoint, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'TTL': '86400',
        'Content-Type': 'application/json',
      },
      body: payload,
    });
    return res.ok || res.status === 201;
  } catch (e) {
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' } });
  }

  try {
    const { titulo, texto } = await req.json();

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('endpoint,p256dh,auth_key');

    if (!subs || !subs.length) {
      return new Response(JSON.stringify({ sent: 0 }), { status: 200 });
    }

    const payload = JSON.stringify({ titulo, texto });
    const results = await Promise.allSettled(subs.map(s => sendPush(s, payload)));
    const sent = results.filter(r => r.status === 'fulfilled' && r.value).length;

    return new Response(JSON.stringify({ sent, total: subs.length }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
});
