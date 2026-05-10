// Edge Function: parse-resume-capability
// 解析简历文本，通过文心大模型生成能力雷达图数据和能力树数据（SSE 流式）
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });

  let resumeText: string;
  let resumeTitle: string;

  try {
    const body = await req.json();
    resumeText = body.resume_text ?? "";
    resumeTitle = body.resume_title ?? "简历";
    if (!resumeText.trim()) throw new Error("resume_text is required");
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

  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content: `请分析以下简历内容，生成能力图谱数据：\n\n【简历标题】${resumeTitle}\n\n【简历内容】\n${resumeText.slice(0, 8000)}`,
    },
  ];

  const upstream = await fetch(
    "https://app-bhs9a5otro5d-api-zYkZz8qovQ1L-gateway.appmiaoda.com/v2/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Gateway-Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ messages, enable_thinking: false }),
    }
  );

  if (!upstream.ok || !upstream.body) {
    const errText = await upstream.text().catch(() => "");
    return new Response(
      JSON.stringify({ error: `Upstream error: ${upstream.status}`, detail: errText }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // 透传 SSE 流
  return new Response(upstream.body, {
    headers: {
      ...corsHeaders,
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
});
