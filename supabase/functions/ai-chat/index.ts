/**
 * Edge Function: ai-chat
 * AI对话 — 优先蓝心大模型，文心 ERNIE 作为 fallback
 *
 * 改造说明（v2）:
 *   - 接入 vivo 蓝心大模型（OpenAI 兼容协议）作为主通道
 *   - 保留文心 ERNIE 作为 fallback（双轨制，向后兼容）
 *   - 双通道均无密钥时走 mock 响应
 *   - 通过 _shared/bluelm.ts 统一调用
 */

import { corsHeaders } from '../_shared/cors.ts';
import { handleOptions, jsonError, jsonOk } from '../_shared/responses.ts';
import { chatJSON, getBlueLMApiKey, type BlueLMMessage } from '../_shared/bluelm.ts';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return handleOptions();
  if (req.method !== 'POST') return jsonError(405, 'Method Not Allowed');

  try {
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return jsonError(400, '缺少必要参数: messages');
    }

    const lastUserMsg = messages.filter((m: Message) => m.role === 'user').pop();

    // 通道1：优先尝试蓝心大模型
    const bluelmKey = getBlueLMApiKey();
    if (bluelmKey) {
      try {
        const bluelmMessages: BlueLMMessage[] = messages.map((m: Message) => ({
          role: m.role,
          content: m.content,
        }));

        const content = await chatJSON({
          messages: bluelmMessages,
          thinking: false,
          temperature: 0.7,
          max_tokens: 2048,
        });

        return jsonOk({
          choices: [{ message: { role: 'assistant', content } }],
        });
      } catch (e) {
        console.warn('BlueLM 调用失败，降级到文心:', (e as Error).message);
        // 继续走 fallback
      }
    }

    // 通道2：文心 ERNIE fallback
    const WENXIN_API_KEY = Deno.env.get('WENXIN_API_KEY');
    const WENXIN_SECRET_KEY = Deno.env.get('WENXIN_SECRET_KEY');

    if (WENXIN_API_KEY && WENXIN_SECRET_KEY) {
      try {
        // 获取文心 access token
        const tokenRes = await fetch(
          `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${WENXIN_API_KEY}&client_secret=${WENXIN_SECRET_KEY}`,
          { method: 'POST' },
        );
        const tokenData = await tokenRes.json();
        const accessToken = tokenData.access_token;

        if (!accessToken) {
          throw new Error('获取文心API access token失败');
        }

        // 过滤system消息，文心API不支持system角色
        const filteredMessages = messages.filter((m: Message) => m.role !== 'system');
        const systemContent = messages.find((m: Message) => m.role === 'system')?.content || '';

        const chatRes = await fetch(
          `https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/completions_pro?access_token=${accessToken}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              messages: filteredMessages,
              system: systemContent,
              temperature: 0.7,
              top_p: 0.8,
            }),
          },
        );

        const chatData = await chatRes.json();

        if (chatData.error_code) {
          throw new Error(`文心API错误: ${chatData.error_msg}`);
        }

        return jsonOk({
          choices: [{
            message: {
              role: 'assistant',
              content: chatData.result || '抱歉，我暂时无法回应。',
            },
          }],
        });
      } catch (e) {
        console.warn('文心 fallback 也失败，降级到 mock:', (e as Error).message);
        // 继续走 mock
      }
    }

    // 通道3：mock 响应（双通道均无密钥或失败）
    const simulatedResponse = generateMockResponse(lastUserMsg?.content || '');
    return jsonOk({
      choices: [{ message: { role: 'assistant', content: simulatedResponse } }],
    });

  } catch (error) {
    console.error('AI Chat error:', error);
    return jsonError(500, error instanceof Error ? error.message : '服务异常');
  }
});

// 模拟AI响应（无任何API密钥可用时使用）
function generateMockResponse(userMessage: string): string {
  const lowerMsg = userMessage.toLowerCase();

  if (lowerMsg.includes('技能') || lowerMsg.includes('会') || lowerMsg.includes('擅长')) {
    return `感谢你分享技能信息！根据你描述的技能，我来为你分析匹配的岗位方向：

**优势技能评估：**
- 你提到的技能在当前招聘市场有较高需求
- 建议重点关注互联网、科技类企业

**推荐岗位方向：**
1. 中级/高级开发工程师
2. 技术架构师（积累更多经验后）
3. 全栈开发工程师

**下一步建议：**
请告诉我你的**工作年限**和**期望薪资范围**，我可以给出更精准的匹配结果。`;
  }

  if (lowerMsg.includes('工作') || lowerMsg.includes('经验') || lowerMsg.includes('年')) {
    return `了解了你的工作经验！让我帮你分析一下：

**能力评估结果：**
- 综合匹配度：约 72%
- 结构匹配得分：0.70（技能与岗位契合度）
- 规则加成：0.30（经验符合度）

**最匹配岗位推荐：**
1. 前端开发工程师（匹配度82%）
2. 全栈开发工程师（匹配度76%）
3. 技术负责人（匹配度65%，需提升管理经验）

**能力提升建议：**
- 加强系统设计能力（当前需求较高）
- 考虑获取云计算相关认证

请问你对哪个方向更感兴趣？我可以帮你进一步分析该岗位的详细匹配情况。`;
  }

  if (lowerMsg.includes('薪资') || lowerMsg.includes('工资') || lowerMsg.includes('待遇')) {
    return `根据当前市场行情，我为你提供薪资参考：

**当前市场薪资范围（北上广深）：**
- 初级工程师：10K-18K/月
- 中级工程师：18K-30K/月
- 高级工程师：30K-50K/月
- 架构师/技术总监：50K+/月

**影响薪资的关键因素：**
1. 技术栈热门程度（AI/大数据方向溢价20-30%）
2. 公司规模（大厂 > 独角兽 > 创业公司）
3. 工作年限和项目经验

你期望的薪资范围是多少？我可以帮你判断是否符合市场水平，并推荐匹配的职位。`;
  }

  return `你好！我是智聘未来AI匹配助手。我已接收到你的信息：

> "${userMessage.slice(0, 50)}${userMessage.length > 50 ? '...' : ''}"

为了给你提供最准确的岗位匹配分析，我需要进一步了解：

1. **技术技能**：你掌握哪些编程语言/框架/工具？
2. **工作经验**：工作了几年？做过哪类项目？
3. **求职意向**：期望从事什么岗位方向？
4. **地域与薪资**：期望工作城市和薪资范围？

请逐一告诉我这些信息，我会为你生成个性化的岗位匹配报告！`;
}
