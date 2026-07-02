/**
 * Edge Function: short-speech-recognition
 * 短语音识别（百度语音识别，支持wav/m4a，最长60秒）
 *
 * 改造说明（v2）:
 *   - CORS 改用 _shared/cors.ts（统一管理）
 *   - 错误响应改用 _shared/responses.ts
 */

import { handleOptions, jsonError, jsonOk } from '../_shared/responses.ts';

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return handleOptions();
  if (req.method !== 'POST') return jsonError(405, 'Method Not Allowed');

  let speech: string;
  let len: number;
  let format: string;
  let rate: number;
  let cuid: string;

  try {
    const body = await req.json();
    speech = body.speech;
    len = body.len;
    format = body.format ?? 'wav';
    rate = body.rate ?? 16000;
    cuid = body.cuid ?? 'miaoda-edge-cuid';
    if (!speech) throw new Error('Missing speech');
    if (typeof len !== 'number' || len <= 0) throw new Error('Missing or invalid len');
  } catch (err) {
    return jsonError(400, `Invalid request: ${(err as Error).message}`);
  }

  const apiKey = Deno.env.get('INTEGRATIONS_API_KEY');
  if (!apiKey) {
    return jsonError(500, 'Missing INTEGRATIONS_API_KEY. Run: supabase secrets set INTEGRATIONS_API_KEY=<your-key>');
  }

  const upstream = await fetch(
    'https://app-bhs9a5otro5d-api-Aa2PZnjEw5NL-gateway.appmiaoda.com/server_api',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Gateway-Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ format, rate, cuid, speech, len }),
    },
  );

  if (upstream.status === 429 || upstream.status === 402) {
    const errText = await upstream.text();
    return new Response(errText, {
      status: upstream.status,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!upstream.ok) {
    return jsonError(502, `Upstream error: ${upstream.status}`);
  }

  const data = await upstream.json();
  return jsonOk(data);
});
