/**
 * Edge Function: chat-ai-assist
 * 智能沟通辅助：分析对话意图 + 生成标准化回复模板 / 个性化建议（SSE 流式）
 *
 * 改造说明（v2）:
 *   - 接入 vivo 蓝心大模型（OpenAI 兼容协议）
 *   - 通过 _shared/bluelm.ts 统一调用，CORS / 错误响应统一
 *   - 关闭思考模式，确保回复稳定
 *
 * TODO: 前端 src/pages/enterprise/Messages.tsx 暂未接入此函数，待后续接入
 */

import { handleOptions, jsonError } from '../_shared/responses.ts';
import { chatStream, getBlueLMApiKey, type BlueLMMessage } from '../_shared/bluelm.ts';

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return handleOptions();
  if (req.method !== 'POST') return jsonError(405, 'Method Not Allowed');

  let messages: Array<{ role: string; content: string }>;
  let mode: string;
  let context: string;

  try {
    const body = await req.json();
    messages = body.messages;
    mode = body.mode ?? 'suggest'; // "suggest" | "template" | "analyze"
    context = body.context ?? '';
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      throw new Error('Missing messages');
    }
  } catch (err) {
    return jsonError(400, `Invalid request: ${(err as Error).message}`);
  }

  const apiKey = getBlueLMApiKey();
  if (!apiKey) {
    return jsonError(500, 'Missing BLUELM_APP_KEY. Run: supabase secrets set BLUELM_APP_KEY=<your-key>');
  }

  // 根据模式构造系统提示
  const systemPrompts: Record<string, string> = {
    suggest: `你是一名专业的HR招聘沟通顾问。请分析当前对话内容，识别候选人意图（如薪资期望、面试时间、岗位疑问等），并为企业HR提供3-5条简洁的个性化回复建议，每条建议前加"•"。回复要专业、友善、简洁。${context ? `\n\n岗位背景：${context}` : ''}`,
    template: `你是一名专业的HR招聘助手。请根据对话场景，生成标准化的HR回复模板。模板类型包括：面试邀约、薪资谈判、岗位说明、拒绝婉拒、录用通知。每个模板用【模板名称】开头，内容清晰专业。${context ? `\n\n岗位背景：${context}` : ''}`,
    analyze: `你是一名HR招聘分析师。请分析候选人的最近一条消息，识别：1.主要意图 2.情绪倾向（积极/中性/消极）3.关注重点 4.建议HR下一步行动。格式简洁，每项单独一行。`,
  };

  const systemContent = systemPrompts[mode] ?? systemPrompts.suggest;

  // 转换为 BlueLMMessage 格式（强制 role 类型）
  const bluelmMessages: BlueLMMessage[] = [
    { role: 'system', content: systemContent },
    ...messages.map(m => ({
      role: (['system', 'user', 'assistant'].includes(m.role) ? m.role : 'user') as 'system' | 'user' | 'assistant',
      content: m.content,
    })),
  ];

  return await chatStream({
    messages: bluelmMessages,
    thinking: false,
    temperature: 0.7,
    max_tokens: 2048,
  });
});
