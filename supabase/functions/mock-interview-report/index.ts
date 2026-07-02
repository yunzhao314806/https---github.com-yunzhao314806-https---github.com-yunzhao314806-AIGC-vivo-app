/**
 * mock-interview-report Edge Function
 * 接收完整对话记录，调用蓝心大模型生成结构化评估报告（雷达图评分 + 题目点评 + 改进建议）
 * 返回 JSON（非流式）
 *
 * 改造说明（v2）:
 *   - 接入 vivo 蓝心大模型（非流式 chatJSON）
 *   - 通过 _shared/bluelm.ts 统一调用，CORS / 错误响应统一
 *   - 关闭思考模式（评估场景需要稳定 JSON 输出）
 */

import { corsHeaders } from '../_shared/cors.ts';
import { handleOptions, jsonError, jsonOk } from '../_shared/responses.ts';
import { chatJSON, getBlueLMApiKey, type BlueLMMessage } from '../_shared/bluelm.ts';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface RequestBody {
  messages: Message[];
  direction: string;
  difficulty: string;
}

const REPORT_PROMPT = `
你是一位专业的技术面试评估专家。请根据以下面试对话，生成一份详细的评估报告。

## 评估维度（雷达图，各 0-100 分）
1. 算法与数据结构
2. 系统设计能力
3. 编程基础
4. 项目与实战经验
5. 沟通表达能力

## 输出格式（必须是合法 JSON，不含其他文字、不含 markdown 代码块）
{
  "overall_score": <0-100 综合分>,
  "radar_data": [
    {"subject": "算法与数据结构", "value": <0-100>},
    {"subject": "系统设计能力", "value": <0-100>},
    {"subject": "编程基础", "value": <0-100>},
    {"subject": "项目与实战经验", "value": <0-100>},
    {"subject": "沟通表达能力", "value": <0-100>}
  ],
  "question_reviews": [
    {
      "question": "<题目摘要>",
      "pros": "<答对/答好的地方>",
      "cons": "<不足或遗漏的地方>",
      "score": <0-100>
    }
  ],
  "suggestions": [
    {
      "dimension": "<薄弱维度名>",
      "advice": "<具体改进建议>",
      "resources": "<推荐学习资源或关键词>"
    }
  ],
  "summary": "<100字以内的整体评价>"
}
`;

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return handleOptions();
  if (req.method !== 'POST') return jsonError(405, 'Method Not Allowed');

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return jsonError(400, 'Invalid JSON');
  }

  const { messages, direction, difficulty } = body;

  const apiKey = getBlueLMApiKey();
  if (!apiKey) {
    return jsonError(500, 'Missing BLUELM_APP_KEY. Run: supabase secrets set BLUELM_APP_KEY=<your-key>');
  }

  const transcript = messages
    .filter(m => m.role !== 'system')
    .map(m => `${m.role === 'assistant' ? '面试官' : '候选人'}：${m.content}`)
    .join('\n');

  const llmMessages: BlueLMMessage[] = [
    {
      role: 'system',
      content: `你是技术面试评估专家，正在评估一场 ${direction} 方向的${difficulty === 'junior' ? '初级' : difficulty === 'senior' ? '高级' : '中级'}面试。`,
    },
    {
      role: 'user',
      content: `${REPORT_PROMPT}\n\n## 面试对话记录\n${transcript}`,
    },
  ];

  try {
    const rawText = await chatJSON({
      messages: llmMessages,
      thinking: false,  // 评估场景关闭思考，确保稳定 JSON 输出
      temperature: 0.3,  // 低温保证稳定性
      max_tokens: 4096,
    });

    // 提取 JSON（模型可能包裹在 markdown 代码块中）
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found in response');
    const report = JSON.parse(jsonMatch[0]);

    return jsonOk({ success: true, report });
  } catch (e) {
    return jsonError(500, `Report generation failed: ${(e as Error).message}`);
  }
});
