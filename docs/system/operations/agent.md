# 🤖 AI Agent 操作

Minimail 所有功能均通过 REST API 暴露，AI Agent（如 Hermes、Claude Code、OpenAI Codex、DeepSeek 等）可通过 API 密钥自主操作。

## 获取 API 密钥

1. 登录 Minimail
2. 左侧「🔑 API 密钥」→ 新建密钥
3. 复制令牌（格式：`wm_xxxxxxxx...`）
4. **一次性显示**，关闭后不可查看

## Agent 认证

```bash
# 方式 1: Bearer Token（推荐）
Authorization: Bearer ***

# 方式 2: API Key Header
X-API-Key: ***
```

Agent 持有令牌后拥有与 Web 用户**相同的操作权限**。

## Agent 能力全景

| 领域 | 能力 | API 端点 |
|------|------|----------|
| 📥 邮件 | 读取收件箱 | `GET /api/mail/folders` + `GET /api/mail/messages` |
| ✉️ 邮件 | 发送邮件 | `POST /api/mail/send` |
| 📝 笔记 | 创建/查询/更新/删除 | `GET/POST/PUT/DELETE /api/notes` |
| 🏷️ 笔记 | 标签 CRUD | `GET/POST/PUT/DELETE /api/notes/tags` |
| 🔍 笔记 | 全文搜索 | `GET /api/notes/search?q=xxx` |
| 🧠 笔记 | 语义搜索 | `POST /api/notes/search/semantic` (传入 embedding) |
| 📎 笔记 | 上传附件 | `POST /api/notes/{id}/attachments` |
| 📧→📝 笔记 | 邮件转笔记 | `POST /api/notes/from-email` |
| 💬 笔记 | 添加评论 | `POST /api/notes/{id}/comments` |
| 👍 笔记 | Emoji 反应 | `POST /api/notes/{id}/reactions?emoji=👍` |
| 🔗 笔记 | 公开分享 | `POST /api/notes/{id}/shares` |
| 🌐 笔记 | 链接元数据 | `POST /api/notes/link-metadata` |
| 🎯 笔记 | 自动标签 | `POST /api/notes` 内容中含 `#tag` 自动提取 |
| 🔔 笔记 | Webhook 管理 | `CRUD /api/notes/webhooks` |
| 📡 笔记 | SSE 实时事件 | `GET /api/notes/events` (EventSource) |
| 🔖 笔记 | 快捷键管理 | `CRUD /api/notes/shortcuts` |
| 👤 通讯录 | 联系人 CRUD | `GET/POST/PUT/DELETE /api/contacts/*` |
| 👥 通讯录 | 分组管理 | `GET/POST/PUT/DELETE /api/contact-groups` |
| 🔎 统一搜索 | 跨邮件+笔记 | `GET /api/search?q=xxx` |
| 🔑 自身管理 | API 密钥创建/撤销 | `POST/DELETE /api/auth/tokens` |

## Agent 工作流示例

```bash
# 1. Agent 登录获取令牌
TOKEN=$(curl -s -X POST http://localhost:8000/api/auth/login \
  -d '{"email":"agent@example.com","password":"***"}' \
  -H "Content-Type: application/json" | jq -r '.access_token')

# 2. Agent 查询收件箱
curl -s -H "Authorization: Bearer ***" \
  http://localhost:8000/api/mail/messages?folder=INBOX

# 3. Agent 使用 from-context 创建笔记
curl -s -X POST http://localhost:8000/api/notes/from-context \
  -H "Authorization: Bearer ***" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "会议纪要...",
    "source": "AI Agent",
    "tags": ["会议"]
  }'

# 4. Agent 语义搜索笔记库
curl -s -X POST http://localhost:8000/api/notes/search/semantic \
  -H "Authorization: Bearer ***" \
  -H "Content-Type: application/json" \
  -d '{"query": "架构决策", "top_k": 3}'

# 5. Agent 创建 Webhook
curl -s -X POST http://localhost:8000/api/notes/webhooks \
  -H "Authorization: Bearer ***" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://my-server/webhook", "events": ["note.created"]}'
```

## 公开分享

分享链接 **无需认证**，任何人都可通过 token 查看笔记内容：

```bash
curl https://minimail.example.com/api/shares/{token}
```

## 实时事件

Agent 可通过 SSE 接收笔记变更事件：

```bash
curl -H "Authorization: Bearer ***" \
  https://minimail.example.com/api/notes/events
# → event: note.created
# → data: {"id": "...", "event_type": "note.created", ...}
```
