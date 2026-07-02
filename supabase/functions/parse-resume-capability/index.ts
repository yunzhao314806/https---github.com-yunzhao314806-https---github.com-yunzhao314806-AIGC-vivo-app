/**
 * Edge Function: parse-resume-capability
 * 解析简历文本，通过蓝心大模型生成能力雷达图数据和能力树数据（SSE 流式）
 *
 * 改造说明（v2）:
 *   - 接入 vivo 蓝心大模型（OpenAI 兼容协议）
 *   - 通过 _shared/bluelm.ts 统一调用，CORS / 错误响应统一
 *   - 关闭思考模式，确保稳定 JSON 输出
 */

import { handleOptions, jsonError } from '../_shared/responses.ts';
import { chatStream, getBlueLMApiKey, type BlueLMMessage } from '../_shared/bluelm.ts';

const SYSTEM_PROMPT = `你是一名专业的HR顾问和能力评估专家。请根据用户提供的简历内容，分析候选人的综合能力，并输出结构化的能力图谱数据。

输出要求（严格JSON格式，不输出任何其他内容）：
{
  "radar_data": {
    "技术能力": 85,
    "项目经验": 75,
    "学习能力": 80,
    "沟通协作": 70,
    "问题解决": 78,
    "领导力": 60
  },
  "tree_data": {
    "name": "核心能力",
    "children": [
      {
        "name": "技术栈",
        "children": [
          {"name": "Python", "value": 85},
          {"name": "React", "value": 78}
        ]
      },
      {
        "name": "软技能",
        "children": [
          {"name": "沟通表达", "value": 75},
          {"name": "团队协作", "value": 80}
        ]
      }
    ]
  },
  "summary": "该候选人具有扎实的技术背景，在XX领域有丰富经验...",
  "industry": "tech"
}

评分说明：
- 所有分值范围 0-100
- 根据简历内容真实评估，不要虚高
- radar_data 必须包含 6 个维度，可根据简历内容选择最合适的维度名称
- tree_data 根节点下最多 4 个分支，每个分支下 2-6 个叶节点（带value）
- industry 从以下选择：tech / finance / manufacturing / education / medical / other`;

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return handleOptions();
  if (req.method !== 'POST') return jsonError(405, 'Method Not Allowed');

  let resumeText: string;
  let resumeTitle: string;

  try {
    const body = await req.json();
    resumeText = body.resume_text ?? '';
    resumeTitle = body.resume_title ?? '简历';
    if (!resumeText.trim()) throw new Error('resume_text is required');
  } catch (err) {
    return jsonError(400, `Invalid request: ${(err as Error).message}`);
  }

  const apiKey = getBlueLMApiKey();
  if (!apiKey) {
    return jsonError(500, 'Missing BLUELM_APP_KEY. Run: supabase secrets set BLUELM_APP_KEY=<your-key>');
  }

  const messages: BlueLMMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    {
      role: 'user',
      content: `请分析以下简历内容，生成能力图谱数据：\n\n【简历标题】${resumeTitle}\n\n【简历内容】\n${resumeText.slice(0, 8000)}`,
    },
  ];

  // SSE 流式透传（关闭思考，确保稳定 JSON 输出）
  return await chatStream({
    messages,
    thinking: false,
    temperature: 0.3,
    max_tokens: 4096,
  });
});
