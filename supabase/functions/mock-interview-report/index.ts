/**
 * mock-interview-report Edge Function
 * 接收完整对话记录，调用文心大模型生成结构化评估报告（雷达图评分 + 题目点评 + 改进建议）
 * 返回 JSON（非流式）
 */
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

## 输出格式（必须是合法 JSON，不含其他文字）
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

async function callLLM(messages: Message[], apiKey: string): Promise<string> {
  const response = await fetch(
    'https://app-bhs9a5otro5d-api-zYkZz8qovQ1L-gateway.appmiaoda.com/v2/chat/completions',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Gateway-Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ messages, enable_thinking: false }),
    }
  );

  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  if (!response.body) throw new Error('No response body');

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf8');
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
      if (raw === '[DONE]') break;
      try {
        const chunk = JSON.parse(raw);
        full += chunk.choices?.[0]?.delta?.content ?? '';
      } catch { /* skip */ }
    }
  }
  return full;
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
  }

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { messages, direction, difficulty } = body;
  const apiKey = Deno.env.get('INTEGRATIONS_API_KEY');
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'Missing API key' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const transcript = messages
    .filter(m => m.role !== 'system')
    .map(m => `${m.role === 'assistant' ? '面试官' : '候选人'}：${m.content}`)
    .join('\n');

  const llmMessages: Message[] = [
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
    const rawText = await callLLM(llmMessages, apiKey);
    // 提取 JSON（模型可能包裹在 markdown 代码块中）
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found in response');
    const report = JSON.parse(jsonMatch[0]);

    return new Response(JSON.stringify({ success: true, report }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: `Report generation failed: ${(e as Error).message}` }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
