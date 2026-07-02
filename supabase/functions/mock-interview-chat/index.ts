/**
 * mock-interview-chat Edge Function
 * 接收面试历史消息，调用蓝心大模型（思维链追问模式），透传 SSE 流给前端
 *
 * 改造说明（v2）:
 *   - 接入 vivo 蓝心大模型（OpenAI 兼容协议）
 *   - 通过 _shared/bluelm.ts 统一调用，CORS / 错误响应统一
 *   - 无密钥时降级返回固定题库，避免 500
 *   - 思维链追问改用 thinking.type=enable（Volc-DeepSeek-V3.2）
 */

import { corsHeaders } from '../_shared/cors.ts';
import { handleOptions, jsonError } from '../_shared/responses.ts';
import { chatStream, getBlueLMApiKey, type BlueLMMessage } from '../_shared/bluelm.ts';

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

/** 无密钥时的降级题库 */
const FALLBACK_QUESTIONS: Record<string, string[]> = {
  '前端开发': [
    '【第1题】请解释 React 中的虚拟 DOM，它解决了什么问题？',
    '【第2题】useEffect 的依赖数组是如何工作的？不传、传空数组、传变量有什么区别？',
    '【第3题】CSS 中 flexbox 和 grid 布局各自适合什么场景？',
    '【第4题】什么是闭包？请举一个实际应用的例子。',
    '【第5题】JavaScript 的事件循环（Event Loop）是如何工作的？宏任务和微任务的区别？',
  ],
  '后端开发': [
    '【第1题】请解释 HTTP/1.1 和 HTTP/2 的主要区别。',
    '【第2题】什么是 RESTful API？它有哪些约束？',
    '【第3题】数据库索引的底层原理是什么？为什么用 B+ 树而不是 B 树？',
    '【第4题】请描述一个分布式事务的解决方案（如两阶段提交、TCC、Saga）。',
    '【第5题】如何设计一个高并发的限流系统？常见的限流算法有哪些？',
  ],
  '算法与数据结构': [
    '【第1题】请分析快速排序的时间复杂度，最坏情况和平均情况分别是什么？',
    '【第2题】什么是动态规划？它和贪心算法有什么区别？',
    '【第3题】请解释红黑树的特性，它相比 AVL 树有什么优势？',
    '【第4题】如何用 O(n) 时间复杂度找到数组中第 K 大的元素？',
    '【第5题】什么是并查集？它适合解决什么类型的问题？',
  ],
};

const DEFAULT_QUESTIONS = FALLBACK_QUESTIONS['前端开发'];

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return handleOptions();
  if (req.method !== 'POST') return jsonError(405, 'Method Not Allowed');

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return jsonError(400, 'Invalid JSON');
  }

  const { messages, direction, difficulty, questionIndex, totalQuestions, followUpRound, isFinish } = body;

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

  // 无密钥降级：返回固定题库
  const apiKey = getBlueLMApiKey();
  if (!apiKey) {
    const bank = FALLBACK_QUESTIONS[direction] ?? DEFAULT_QUESTIONS;
    const questionIdx = Math.min(questionIndex, bank.length - 1);
    const fallbackContent = isFinish
      ? '面试已结束，感谢你的参与！请等待评估报告生成。'
      : bank[questionIdx];

    // 模拟 SSE 流式返回
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const chunk = {
          choices: [{ delta: { content: fallbackContent, role: 'assistant' }, index: 0 }],
        };
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  }

  // 调用 BlueLM（流式透传，开启思维链）
  const bluelmMessages: BlueLMMessage[] = fullMessages.map(m => ({
    role: m.role,
    content: m.content,
  }));

  return await chatStream({
    messages: bluelmMessages,
    thinking: true,  // 面试追问场景开启思维链
    temperature: 0.7,
    max_tokens: 2048,
  });
});
