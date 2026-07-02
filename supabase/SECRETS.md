# Supabase Edge Function 密钥配置指南

本文档列出所有 Edge Function 需要的环境变量，以及如何通过 `supabase secrets set` 配置。

## 必配密钥

### BLUELM_APP_KEY（蓝心大模型 AppKey）

**用途**：5 个对话类 Edge Function 调用 vivo 蓝心大模型
**影响函数**：
- `ai-chat`
- `mock-interview-chat`
- `mock-interview-report`
- `parse-resume-capability`
- `chat-ai-assist`

**获取方式**：在 vivo 开放平台 → 蓝心大模型 → 应用管理中创建应用，获取 AppKey。

**配置命令**：
```bash
supabase secrets set BLUELM_APP_KEY=你的AppKey
```

**验证**：
```bash
# 调用 ai-chat，返回非 "Missing BLUELM_APP_KEY" 即为成功
curl -X POST https://your-project.functions.supabase.co/ai-chat \
  -H "Authorization: Bearer <anon_key>" \
  -H "apikey: <anon_key>" \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"你好"}]}'
```

## 可选密钥

### INTEGRATIONS_API_KEY（miaoda 网关密钥）

**用途**：百度语音识别 / 百度翻译的网关鉴权
**影响函数**：
- `short-speech-recognition`
- `text-translation`

**说明**：这两个函数走 miaoda 网关代理百度能力。如果你的环境仍使用 miaoda 网关，保留此密钥即可；若改为直连百度官方 API，需调整这两个函数的代码。

**配置命令**：
```bash
supabase secrets set INTEGRATIONS_API_KEY=你的网关密钥
```

### WENXIN_API_KEY / WENXIN_SECRET_KEY（文心 ERNIE）

**用途**：`ai-chat` 函数的 fallback 通道（蓝心调用失败时降级到文心）
**影响函数**：
- `ai-chat`

**说明**：可选。如果不配置，`ai-chat` 在蓝心不可用时会直接走 mock 响应。

**配置命令**：
```bash
supabase secrets set WENXIN_API_KEY=你的文心APIKey
supabase secrets set WENXIN_SECRET_KEY=你的文心SecretKey
```

## 重新部署

配置或更新密钥后，需要重新部署对应的 Edge Function 才会生效：

```bash
# 部署单个函数
supabase functions deploy ai-chat
supabase functions deploy mock-interview-chat
supabase functions deploy mock-interview-report
supabase functions deploy parse-resume-capability
supabase functions deploy chat-ai-assist

# 部署全部函数
supabase functions deploy
```

## 查看已配置的密钥

```bash
supabase secrets list
```

> 注意：此命令只显示密钥名，不显示密钥值。

## 删除密钥

```bash
supabase secrets unset SECRET_NAME
```

## BlueLM 技术细节

| 项目 | 值 |
|---|---|
| Endpoint | `https://api-ai.vivo.com.cn/v1/chat/completions` |
| 协议 | OpenAI 兼容 |
| 鉴权 | `Authorization: Bearer <AppKey>` |
| 默认模型 | `Volc-DeepSeek-V3.2`（思考可关） |
| 思维链模型 | `Doubao-Seed-2.0-mini`（默认开思考） |
| 流式格式 | SSE `data: {...}\n\n`，以 `data: [DONE]` 结尾 |
| 官方文档 | https://aigc.vivo.com/#/document/index?id=1745 |

## 安全注意事项

1. **永远不要把真实密钥提交到 git 仓库**（包括 `.env` 文件）
2. `.env` 已加入 `.gitignore`，但历史上的旧提交仍可能包含密钥——如需彻底清除，需用 `git filter-branch` 或轮换密钥
3. `SUPABASE_SERVICE_KEY` 是后端特权密钥，**绝不能暴露到前端构建产物**（`VITE_` 前缀的变量会被打包进前端）
4. 定期在 vivo 开放平台轮换 AppKey
