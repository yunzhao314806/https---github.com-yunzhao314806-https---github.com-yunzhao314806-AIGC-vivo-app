// Edge Function: chat-ai-assist
// 智能沟通辅助：分析对话意图 + 生成标准化回复模板 / 个性化建议（SSE 流式）
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
  }

  let messages: Array<{ role: string; content: string }>;
  let mode: string;
  let context: string;

  try {
    const body = await req.json();
    messages = body.messages;
    mode = body.mode ?? "suggest"; // "suggest" | "template" | "analyze"
    context = body.context ?? "";
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      throw new Error("Missing messages");
    }
  } catch (err) {
    return new Response(
      JSON.stringify({ error: `Invalid request: ${(err as Error).message}` }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const apiKey = Deno.env.get("INTEGRATIONS_API_KEY");
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "Server configuration error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // 根据模式构造系统提示
  const systemPrompts: Record<string, string> = {
    suggest: `你是一名专业的HR招聘沟通顾问。请分析当前对话内容，识别候选人意图（如薪资期望、面试时间、岗位疑问等），并为企业HR提供3-5条简洁的个性化回复建议，每条建议前加"•"。回复要专业、友善、简洁。${context ? `\n\n岗位背景：${context}` : ""}`,
    template: `你是一名专业的HR招聘助手。请根据对话场景，生成标准化的HR回复模板。模板类型包括：面试邀约、薪资谈判、岗位说明、拒绝婉拒、录用通知。每个模板用【模板名称】开头，内容清晰专业。${context ? `\n\n岗位背景：${context}` : ""}`,
    analyze: `你是一名HR招聘分析师。请分析候选人的最近一条消息，识别：1.主要意图 2.情绪倾向（积极/中性/消极）3.关注重点 4.建议HR下一步行动。格式简洁，每项单独一行。`,
  };

  const systemContent = systemPrompts[mode] ?? systemPrompts.suggest;
  const fullMessages = [
    { role: "system", content: systemContent },
    ...messages,
  ];

  const upstream = await fetch(
    "https://app-bhs9a5otro5d-api-zYkZz8qovQ1L-gateway.appmiaoda.com/v2/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Gateway-Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ messages: fullMessages, enable_thinking: false }),
    }
  );

  if (upstream.status === 429 || upstream.status === 402) {
    const errText = await upstream.text();
    return new Response(errText, {
      status: upstream.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!upstream.ok || !upstream.body) {
    return new Response(
      JSON.stringify({ error: `Upstream error: ${upstream.status}` }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  return new Response(upstream.body, {
    headers: {
      ...corsHeaders,
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
});
