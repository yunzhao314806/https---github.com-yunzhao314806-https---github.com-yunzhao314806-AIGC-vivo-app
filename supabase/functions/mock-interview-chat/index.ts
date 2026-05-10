/**
 * mock-interview-chat Edge Function
 * 接收面试历史消息，调用文心大模型（思维链追问模式），透传 SSE 流给前端
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
  messages: Message[];         // 完整对话历史
  direction: string;           // 面试方向
  difficulty: string;          // 难度
  questionIndex: number;       // 当前题号（0-based）
  totalQuestions: number;      // 总题数
  followUpRound: number;       // 当前追问轮次（0=主问题）
  isFinish?: boolean;          // 是否发送结束指令
}

const SYSTEM_PROMPT = (direction: string, difficulty: string, total: number) => `
你是一位专业的技术面试官，正在对候选人进行${direction}方向的${difficultyLabel(difficulty)}面试。
面试共 ${total} 道题，每题主问后可追问 2 轮，深入挖掘技术细节。

## 面试规则
1. 每道主问题需涵盖该方向的核心技术点
2. 根据候选人的回答，用思维链推理（Chain-of-Thought）挖掘技术深度：
   - 如果回答泛泛，追问实现原理或底层机制
   - 如果回答有误，引导候选人重新思考
   - 如果回答优秀，追问边界情况或进阶场景
3. 每轮追问不超过 2 个子问题
4. 语气专业、友好，给候选人思考空间
5. 不要提前透露答案
6. 每条消息只输出面试问题，不输出评价

## 输出格式
- 主问题：直接提问
- 追问：以"追问："开头，针对上一个回答的薄弱点深入
- 进入下一题时：以"【第X题】"标注题号
`;

function difficultyLabel(d: string) {
  const map: Record<string, string> = { junior: '初级', intermediate: '中级', senior: '高级' };
  return map[d] ?? '中级';
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

  const { messages, direction, difficulty, questionIndex, totalQuestions, followUpRound, isFinish } = body;

  const apiKey = Deno.env.get('INTEGRATIONS_API_KEY');
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'Missing API key' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // 构建系统提示 + 面试上下文
  const systemMsg: Message = {
    role: 'system',
    content: SYSTEM_PROMPT(direction, difficulty, totalQuestions),
  };

  // 如果是结束指令，生成总结性收场语
  const extraInstruction: Message | null = isFinish ? {
    role: 'user',
    content: '面试已全部完成，请以面试官的身份对候选人说结束语（不超过 80 字），不包含评分。',
  } : null;

  const fullMessages: Message[] = [
    systemMsg,
    ...messages,
    ...(extraInstruction ? [extraInstruction] : []),
  ];

  // 如果是新题主问，在 messages 末尾注入提示
  if (!isFinish && followUpRound === 0 && messages.length > 0) {
    const lastRole = messages[messages.length - 1]?.role;
    if (lastRole !== 'user') {
      // 说明还没有用户回答，这是开场问第一题
      fullMessages.push({
        role: 'user',
        content: `请出第 ${questionIndex + 1} 题（共 ${totalQuestions} 题）`,
      });
    }
  }

  const upstream = await fetch(
    'https://app-bhs9a5otro5d-api-zYkZz8qovQ1L-gateway.appmiaoda.com/v2/chat/completions',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Gateway-Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ messages: fullMessages, enable_thinking: false }),
    }
  );

  if (upstream.status === 429 || upstream.status === 402) {
    const text = await upstream.text();
    return new Response(text, {
      status: upstream.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (!upstream.ok || !upstream.body) {
    return new Response(JSON.stringify({ error: `Upstream error: ${upstream.status}` }), {
      status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  return new Response(upstream.body, {
    headers: {
      ...corsHeaders,
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Content-Type-Options': 'nosniff',
    },
  });
});
