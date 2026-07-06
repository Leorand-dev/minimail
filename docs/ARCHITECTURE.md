# 系统架构文档

## 分层架构

```
┌────────────────────────────────────────────────────┐
│                   前端层 (React SPA)                  │
│  MailView | ComposeView | ContactsView | AgentChat  │
└────────────────────┬───────────────────────────────┘
                     │ REST API (JSON + JWT)
┌────────────────────▼───────────────────────────────┐
│                    接入层                            │
│  ┌──────────────┐  ┌──────────────┐                │
│  │ MCP Server   │  │ OpenAI Tool  │                │
│  │ (Agent 协议) │  │ (Function    │                │
│  │              │  │  Calling)    │                │
│  └──────┬───────┘  └──────┬───────┘                │
└─────────┼─────────────────┼────────────────────────┘
          │                 │
┌─────────▼─────────────────▼────────────────────────┐
│                  业务服务层                          │
│  MailService | ContactService | SieveService       │
│  AIService   | WorkflowEngine  | PluginManager     │
└────────────────────┬───────────────────────────────┘
                     │
┌────────────────────▼───────────────────────────────┐
│                   协议 / 存储层                       │
│  ┌──────────┐ ┌──────────┐ ┌────────────────────┐  │
│  │ IMAP Lib │ │ SMTP Lib │ │ PostgreSQL + Redis  │  │
│  │(RFC 3501)│ │(RFC 5321)│ │ (主存储 + 缓存)     │  │
│  └──────────┘ └──────────┘ └────────────────────┘  │
│  ┌──────────┐ ┌──────────┐ ┌────────────────────┐  │
│  │ LDAP Lib │ │ Sieve    │ │ pgvector            │  │
│  │(通讯录)  │ │(过滤)    │ │ (语义搜索)          │  │
│  └──────────┘ └──────────┘ └────────────────────┘  │
└────────────────────────────────────────────────────┘
```

## 模块职责

### backend/app/api/ — 路由层
接收 HTTP 请求，参数校验，路由分发。不含业务逻辑。

### backend/app/services/ — 业务服务
- `imap_service.py` — IMAP 操作封装
- `smtp_service.py` — SMTP 发送
- `mime_parser.py` — MIME 消息解析
- `sieve_service.py` — 过滤规则
- `ai_service.py` — AI 分类/总结/回复

### backend/app/agent/ — AI Agent 集成
- `mcp_server.py` — MCP 协议服务器
- `openai_tools.py` — OpenAI Function Calling 定义
- `events.py` — 事件总线
- `webhooks.py` — Webhook 调度
- `workflows.py` — Agent 工作流引擎
- `chat.py` — 对话操作接口

### backend/app/imap/ — IMAP 协议
- `client.py` — IMAP 客户端封装
- `pool.py` — 连接池
- `cache.py` — 缓存层

### backend/app/plugins/ — 插件系统
- `base.py` — 插件基类 / Hook 注册表
- `loader.py` — 插件加载器

### frontend/src/features/ — 前端功能模块
- `mail/` — 邮件列表/阅读/撰写
- `contacts/` — 通讯录
- `settings/` — 设置
- `agent-chat/` — Agent 对话面板
- `sieve/` — 过滤规则编辑器

## 数据流

### 邮件浏览流
```
用户点击收件箱
  → React: GET /api/mail/folders
  → FastAPI: IMAPService.list_folders()
  → IMAPPool: 获取/创建用户 IMAP 连接
  → IMAPClient: LIST 命令
  → 返回文件夹树 → 缓存到 Redis → 渲染

用户阅读邮件
  → React: GET /api/mail/messages/{uid}
  → FastAPI: MimeParser.parse(raw_message)
  → HTML 净化 (washtml)
  → 图片代理替换 URL
  → 返回 {headers, body_*, attachments} → 渲染
```

### Agent 操作流
```
用户: "帮我查上周张总的预算邮件"
  → POST /api/agent/chat {message: "..."}
  → AgentChatService: 语义搜索 (pgvector)
  → LLM: 理解意图 + 生成回复
  → 返回 SSE 流式响应

用户: "读第3封, 回确认收到"
  → Agent: read_email(uid=3) → 获取内容
  → LLM: 分析邮件 + 生成回复草稿
  → Agent: draft_reply() → 确认对话框
  → 用户确认 → Agent: send_email() → 完成
```

## 安全模型

```
用户认证: JWT (access token 15m + refresh token 7d)
Agent 认证: API Key (限定 Scope) 或 OAuth Device Flow

权限 Scope:
  mail:read      → 读邮件
  mail:send      → 发邮件 (需要人工确认)
  mail:delete    → 删除邮件
  contacts:read  → 读通讯录
  contacts:write → 写通讯录
  sieve:manage   → 管理过滤规则
  webhook:manage → 管理 Webhook
  agent:execute  → 执行操作

高风险的 Agent 操作 (send, delete) 必须:
  1. 生成预览 + 确认对话框
  2. 用户手动批准
  3. 记录审计日志
```

## 扩展点

| 扩展方式 | 说明 |
|---------|------|
| 插件 Hook | 邮件渲染、发送、UI 菜单等事件点 |
| Agent Tool | 新增 MCP/OpenAI 工具定义 |
| Webhook | 外部服务订阅邮件事件 |
| 工作流 | 配置式自动化场景 |
| 皮肤 | Tailwind 主题变量覆盖 |

## 开发原则

1. **所有外部 I/O 异步化** — asyncio 驱动 IMAP/SMTP/数据库/LLM
2. **IMAP 是源** — 本地数据库只做缓存和增强，不替代 IMAP
3. **Agent 操作可审计** — 每步操作记录 agent_audit_log
4. **高危操作需确认** — send/delete 必须经过用户批准
5. **向后兼容** — API 版本化，插件接口保持稳定
