/**
 * Edge Function: text-translation
 * 多语言翻译（百度翻译通用版，支持200+语言）
 *
 * 改造说明（v2）:
 *   - CORS 改用 _shared/cors.ts（统一管理）
 *   - 错误响应改用 _shared/responses.ts
 */

import { corsHeaders } from '../_shared/cors.ts';
import { handleOptions, jsonError, jsonOk } from '../_shared/responses.ts';

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return handleOptions();
  if (req.method !== 'POST') return jsonError(405, 'Method Not Allowed');

  let q: string;
  let from: string;
  let to: string;

  try {
    const body = await req.json();
    q = body.q;
    from = body.from ?? 'auto';
    to = body.to;
    if (!q) throw new Error('Missing q');
    if (!to) throw new Error('Missing to');
  } catch (err) {
    return jsonError(400, `Invalid request: ${(err as Error).message}`);
  }

  const apiKey = Deno.env.get('INTEGRATIONS_API_KEY');
  if (!apiKey) {
    return jsonError(500, 'Missing INTEGRATIONS_API_KEY. Run: supabase secrets set INTEGRATIONS_API_KEY=<your-key>');
  }

  const upstream = await fetch(
    'https://app-bhs9a5otro5d-api-e94GZ5j0PWpa-gateway.appmiaoda.com/rpc/2.0/mt/texttrans/v1',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json;charset=utf-8',
        'X-Gateway-Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ q, from, to }),
    },
  );

  if (upstream.status === 429 || upstream.status === 402) {
    const errText = await upstream.text();
    return new Response(errText, {
      status: upstream.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (!upstream.ok) {
    return jsonError(502, `Upstream error: ${upstream.status}`);
  }

  const data = await upstream.json();
  return jsonOk(data);
});
