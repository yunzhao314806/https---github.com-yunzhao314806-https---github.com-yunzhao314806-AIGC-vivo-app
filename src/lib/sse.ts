/**
 * SSE 工具函数 — 用于接收 Edge Function 的流式响应
 * 仅适用于 Web 平台（ky + eventsource-parser）
 */
import ky, { type AfterResponseHook } from 'ky';
import { createParser } from 'eventsource-parser';

export interface StreamRequestOptions {
  /** Edge Function 完整 URL */
  functionUrl: string;
  /** 请求体 */
  requestBody: unknown;
  /** Supabase anon key */
  supabaseAnonKey: string;
  /** 每帧 SSE 数据回调 */
  onData: (data: string) => void;
  /** 完成回调 */
  onComplete: () => void;
  /** 错误回调 */
  onError: (error: Error) => void;
  /** AbortSignal */
  signal?: AbortSignal;
}

/** 发送流式请求到 Supabase Edge Function（SSE 透传模式） */
export async function sendStreamRequest(options: StreamRequestOptions): Promise<void> {
  const { functionUrl, requestBody, supabaseAnonKey, onData, onComplete, onError, signal } = options;

  const sseHook: AfterResponseHook = async (_req, _opts, response) => {
    if (!response.ok || !response.body) return;
    let completed = false;
    const finish = (err?: Error) => {
      if (completed) return;
      completed = true;
      err ? onError(err) : onComplete();
    };

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    const parser = createParser({
      onEvent: (event) => {
        if (event.data) onData(event.data);
      },
    });

    const read = (): void => {
      reader.read().then(({ done, value }) => {
        if (done) { finish(); return; }
        parser.feed(decoder.decode(value, { stream: true }));
        read();
      }).catch((err: Error) => {
        if (signal?.aborted) return;
        finish(err);
      });
    };
    read();
    return response;
  };

  try {
    await ky.post(functionUrl, {
      json: requestBody,
      headers: {
        Authorization: `Bearer ${supabaseAnonKey}`,
        apikey: supabaseAnonKey,
      },
      signal,
      timeout: 30000,
      hooks: { afterResponse: [sseHook] },
    });
  } catch (err) {
    if (!signal?.aborted) onError(err as Error);
  }
}
