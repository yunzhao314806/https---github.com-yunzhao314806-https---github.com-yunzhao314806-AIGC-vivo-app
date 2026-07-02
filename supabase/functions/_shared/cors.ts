/**
 * 统一 CORS 头 — 7 个 Edge Function 共用
 *
 * 用法:
 *   import { corsHeaders } from '../_shared/cors.ts';
 *   if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
 */
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Max-Age': '86400',
};
