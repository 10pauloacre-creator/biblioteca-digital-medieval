// ═══════════════════════════════════════════════════════════════
// Edge Function: send-push
// Envia Web Push para alunos com subscription ativa.
//
// Deploy:
//   supabase functions deploy send-push --no-verify-jwt
//
// Secrets necessários (supabase secrets set):
//   VAPID_SUBJECT      → mailto:10pauloacre@gmail.com
//   VAPID_PUBLIC_KEY   → BKw7urUddI6ygJGYfinHsaabglB5AVJW3rLeP6YMHVkzMjVYqDtUvsPJYxAc5ffHUeUju-DhoynkZv-i4drB4NU
//   VAPID_PRIVATE_KEY  → -m-eAaqNmmrwAN15his9e6KdOWkG5gRk2DA5-Rjthww
// ═══════════════════════════════════════════════════════════════

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function b64url(data: Uint8Array): string {
  return btoa(String.fromCharCode(...data))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function b64urlDecode(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - s.length % 4);
  return Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + pad), c => c.charCodeAt(0));
}

// Constrói envelope PKCS8 mínimo para P-256 (sem public key)
function buildPkcs8(rawPriv: Uint8Array): ArrayBuffer {
  const seq = new Uint8Array([
    0x30, 0x41,
    0x02, 0x01, 0x00,
    0x30, 0x13,
      0x06, 0x07, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x02, 0x01,
      0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x03, 0x01, 0x07,
    0x04, 0x27,
      0x30, 0x25,
        0x02, 0x01, 0x01,
        0x04, 0x20, ...rawPriv,
  ]);
  return seq.buffer;
}

async function buildVapidJWT(audience: string): Promise<string> {
  const subject    = Deno.env.get('VAPID_SUBJECT')     || 'mailto:10pauloacre@gmail.com';
  const pubKeyB64  = Deno.env.get('VAPID_PUBLIC_KEY')  || '';
  const privKeyB64 = Deno.env.get('VAPID_PRIVATE_KEY') || '';
  if (!pubKeyB64 || !privKeyB64) throw new Error('VAPID keys not set');

  const exp     = Math.floor(Date.now() / 1000) + 12 * 3600;
  const header  = b64url(new TextEncoder().encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const payload = b64url(new TextEncoder().encode(JSON.stringify({ aud: audience, exp, sub: subject })));
  const input   = `${header}.${payload}`;

  const rawPriv = b64urlDecode(privKeyB64);
  const privKey = await crypto.subtle.importKey(
    'pkcs8', buildPkcs8(rawPriv),
    { name: 'ECDSA', namedCurve: 'P-256' },
    false, ['sign']
  );
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, privKey, new TextEncoder().encode(input));
  const jwt = `${input}.${b64url(new Uint8Array(sig))}`;

  return `vapid t=${jwt},k=${pubKeyB64}`;
}

async function sendPush(sub: { endpoint: string; p256dh: string; auth_key: string }): Promise<boolean> {
  try {
    const origin     = new URL(sub.endpoint).origin;
    const authHeader = await buildVapidJWT(origin);

    // Envia push sem body — o Service Worker usa o texto padrão configurado
    const res = await fetch(sub.endpoint, {
      method: 'POST',
      headers: {
        'Authorization':  authHeader,
        'TTL':            '86400',
        'Content-Length': '0',
      },
    });
    return res.status === 201 || res.status === 200 || res.status === 202;
  } catch {
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')              ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('endpoint,p256dh,auth_key');

    if (!subs?.length) {
      return new Response(JSON.stringify({ sent: 0, total: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const results = await Promise.allSettled(subs.map(s => sendPush(s)));
    const sent    = results.filter(r => r.status === 'fulfilled' && (r as PromiseFulfilledResult<boolean>).value).length;

    return new Response(JSON.stringify({ sent, total: subs.length }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
