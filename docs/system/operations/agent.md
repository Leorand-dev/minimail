# 🤖 AI Agent 操作

Minimall 所有功能均通过 REST API 暴露，AI Agent（如 Hermes、Claude Code、OpenAI Codex、DeepSeek 等）可通过 API 密钥自主操作。

## 获取 API 密钥

1. 登录 Minimail
2. 左侧「🔑 API 密钥」→ 新建密钥
3. 复制令牌（格式：`wm_xxxxxxxx...`）
4. **一次性显示**，关闭后不可查看

## Agent 认证

```bash
# 方式 1: Bearer Token（推荐）
Authorization: Bearer wm_xxxxxxxx...

# 方式 2: API Key Header
X-API-Key: wm_xxxxxxxx...
```

Agent 持有令牌后拥有与 Web 用户**相同的操作权限**。

## Agent 能力全景

| 领域 | 能力 | API 端点 |
|------|------|----------|
| 📥 邮件 | 读取收件箱 | `GET /api/mail/folders` + `GET /api/mail/messages` |
| ✉️ 邮件 | 发送邮件 | `POST /api/mail/send` |
| 📂 邮件 | 文件夹管理 | `POST/DELETE /api/mail/folders` |
| 📝 笔记 | 创建/查询/搜索 | `POST/GET /api/notes` + `GET /api/notes/search` |
| 🏷️ 笔记 | 标签管理 | `POST/PUT/DELETE /api/notes/tags/*` |
| 📎 笔记 | 置顶/归档/恢复 | `POST /api/notes/{id}/pin\|restore` |
| 👤 通讯录 | 联系人 CRUD | `GET/POST/PUT/DELETE /api/contacts/*` |
| 🔑 自身管理 | 密钥管理 | `POST/DELETE /api/auth/tokens/*` |

## 工作流示例

### Agent 日常记录

```bash
# 1. 登录获取令牌
TOKEN=$(curl -s -X POST http://localhost:8000/api/auth/login \
  -d '{"email":"agent@example.com","password":"***"}' \
  -H "Content-Type: application/json" | jq -r '.access_token')

# 2. 查询待办邮件
curl -s -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8000/api/mail/messages?folder=INBOX&page_size=5"

# 3. 将决策记录到笔记库
curl -s -X POST http://localhost:8000/api/notes \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "# 架构决策\n\n选择 PostgreSQL 16 作为主数据库。",
    "tags": ["adr", "database"]
  }'

# 4. 搜索相关知识
curl -s "http://localhost:8000/api/notes/search?q=postgresql+配置" \
  -H "Authorization: Bearer $TOKEN"
```

### Agent 管理标签

```bash
# 创建标签
curl -s -X POST http://localhost:8000/api/notes/tags \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"important"}'

# 重命名标签（自动合并同名）
curl -s -X PUT http://localhost:8000/api/notes/tags/important \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"new_name":"critical"}'

# 删除标签（从所有笔记中移除）
curl -s -X DELETE http://localhost:8000/api/notes/tags/old-tag \
  -H "Authorization: Bearer $TOKEN"
```

## 开发中特性

| 特性 | 状态 | 说明 |
|------|:----:|------|
| Webhook | 📋 | 邮件到达/笔记更新时触发 |
| MCP 协议 | 📋 | Model Context Protocol 原生支持 |
| 语义搜索 | 📋 | pgvector + embedding 语义检索 |
