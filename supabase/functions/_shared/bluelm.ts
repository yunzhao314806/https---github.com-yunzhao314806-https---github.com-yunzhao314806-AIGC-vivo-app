/**
 * BlueLM (蓝心大模型) 统一客户端
 *
 * 文档: https://aigc.vivo.com/#/document/index?id=1745
 * 协议: OpenAI 兼容
 *
 * 部署:
 *   supabase secrets set BLUELM_APP_KEY=<你的 AppKey>
 *
 * 读取:
 *   const apiKey = Deno.env.get('BLUELM_APP_KEY');
 */

import { corsHeaders } from './cors.ts';

/** BlueLM API endpoint */
const BLUELM_ENDPOINT = 'https://api-ai.vivo.com.cn/v1/chat/completions';

/** 默认模型：Volc-DeepSeek-V3.2，思考模式可关，适合面试场景 */
export const DEFAULT_MODEL = 'Volc-DeepSeek-V3.2';

/** 备选模型：默认开启思考，适合需要思维链的场景 */
export const THINKING_MODEL = 'Doubao-Seed-2.0-mini';

export interface BlueLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface BlueLMStreamOptions {
  messages: BlueLMMessage[];
  /** 模型名，默认 Volc-DeepSeek-V3.2 */
  model?: string;
  /** 是否流式，默认 true */
  stream?: true;
  /** 是否开启深度思考，默认 false */
  thinking?: boolean;
  /** 温度，默认 0.7 */
  temperature?: number;
  /** top_p，默认 0.7 */
  top_p?: number;
  /** 最大输出 token */
  max_tokens?: number;
}

export interface BlueLMJSONOptions extends Omit<BlueLMStreamOptions, 'stream'> {
  stream?: false;
}

/** 生成 UUID v4（不依赖外部库） */
function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/** 读取 BlueLM AppKey，未配置时返回 null */
export function getBlueLMApiKey(): string | null {
  const key = Deno.env.get('BLUELM_APP_KEY');
  if (!key || key.trim() === '') return null;
  return key.trim();
}

/** 构造请求体 */
function buildBody(options: BlueLMStreamOptions | BlueLMJSONOptions): Record<string, unknown> {
  const {
    messages,
    model = DEFAULT_MODEL,
    stream = true,
    thinking = false,
    temperature = 0.7,
    top_p = 0.7,
    max_tokens,
  } = options;

  const body: Record<string, unknown> = {
    model,
    messages,
    stream,
    temperature,
    top_p,
  };

  if (max_tokens) body.max_tokens = max_tokens;

  // 深度思考参数（按模型区分）
  if (thinking) {
    if (model.startsWith('Doubao') || model === 'Volc-DeepSeek-V3.2') {
      body.thinking = { type: 'enable' };
    } else if (model === 'qwen3.5-plus') {
      body.enable_thinking = true;
    }
  }

  return body;
}

/**
 * 发起流式请求，返回 SSE Response（透传给前端）。
 *
 * 用法（Edge Function 内）:
 *   const apiKey = getBlueLMApiKey();
 *   if (!apiKey) return jsonError(500, 'Missing BLUELM_APP_KEY');
 *   return await chatStream({ messages, apiKey });
 */
export async function chatStream(options: BlueLMStreamOptions): Promise<Response> {
  const apiKey = getBlueLMApiKey();
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'Missing BLUELM_APP_KEY. Run: supabase secrets set BLUELM_APP_KEY=<your-key>' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  const body = buildBody({ ...options, stream: true });
  const requestId = uuid();

  const upstream = await fetch(`${BLUELM_ENDPOINT}?requestId=${requestId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  // 限流 / 配额超限：直接透传状态码
  if (upstream.status === 429 || upstream.status === 402) {
    const text = await upstream.text();
    return new Response(text, {
      status: upstream.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (!upstream.ok || !upstream.body) {
    const errText = await upstream.text().catch(() => '');
    return new Response(
      JSON.stringify({ error: `BlueLM upstream error: ${upstream.status}`, detail: errText }),
      { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  // SSE 透传
  return new Response(upstream.body, {
    headers: {
      ...corsHeaders,
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

/**
 * 发起非流式请求，返回完整 JSON 文本（自动聚合 SSE 流）。
 *
 * 用法:
 *   const text = await chatJSON({ messages, thinking: false });
 *   const report = JSON.parse(text);
 */
export async function chatJSON(options: BlueLMJSONOptions): Promise<string> {
  const apiKey = getBlueLMApiKey();
  if (!apiKey) {
    throw new Error('Missing BLUELM_APP_KEY. Run: supabase secrets set BLUELM_APP_KEY=<your-key>');
  }

  const body = buildBody({ ...options, stream: false });
  const requestId = uuid();

  const upstream = await fetch(`${BLUELM_ENDPOINT}?requestId=${requestId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!upstream.ok) {
    const errText = await upstream.text().catch(() => '');
    throw new Error(`BlueLM HTTP ${upstream.status}: ${errText}`);
  }

  const data = await upstream.json();
  // OpenAI 兼容格式：choices[0].message.content
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== 'string') {
    throw new Error(`BlueLM response missing content: ${JSON.stringify(data).slice(0, 500)}`);
  }
  return content;
}

/**
 * 发起流式请求，但聚合为完整文本（用于需要流式但又要拿到完整结果的场景）。
 *
 * 用法:
 *   const text = await chatStreamCollect({ messages, thinking: true });
 */
export async function chatStreamCollect(options: BlueLMStreamOptions): Promise<string> {
  const apiKey = getBlueLMApiKey();
  if (!apiKey) {
    throw new Error('Missing BLUELM_APP_KEY. Run: supabase secrets set BLUELM_APP_KEY=<your-key>');
  }

  const body = buildBody({ ...options, stream: true });
  const requestId = uuid();

  const upstream = await fetch(`${BLUELM_ENDPOINT}?requestId=${requestId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!upstream.ok || !upstream.body) {
    const errText = await upstream.text().catch(() => '');
    throw new Error(`BlueLM HTTP ${upstream.status}: ${errText}`);
  }

  const reader = upstream.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let full = '';
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const raw = line.slice(6).trim();
      if (raw === '[DONE]') {
        return full;
      }
      try {
        const chunk = JSON.parse(raw);
        const delta = chunk?.choices?.[0]?.delta?.content;
        if (typeof delta === 'string') full += delta;
      } catch {
        // skip malformed chunk
      }
    }
  }
  return full;
}
