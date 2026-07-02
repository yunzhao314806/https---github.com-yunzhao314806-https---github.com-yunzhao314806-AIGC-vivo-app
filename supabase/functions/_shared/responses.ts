/**
 * 统一 HTTP 响应辅助 — 7 个 Edge Function 共用
 *
 * 用法:
 *   import { jsonError, jsonOk, handleOptions } from '../_shared/responses.ts';
 *   if (req.method === 'OPTIONS') return handleOptions();
 *   if (req.method !== 'POST') return jsonError(405, 'Method Not Allowed');
 *   return jsonOk({ report });
 */

import { corsHeaders } from './cors.ts';

/** 处理 CORS 预检请求 */
export function handleOptions(): Response {
  return new Response(null, { headers: corsHeaders });
}

/** 返回 JSON 错误响应 */
export function jsonError(status: number, message: string, extra?: Record<string, unknown>): Response {
  const body: Record<string, unknown> = { error: message };
  if (extra) Object.assign(body, extra);
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/** 返回 JSON 成功响应 */
export function jsonOk(data: unknown): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
