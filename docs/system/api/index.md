# 🔌 API 参考

Minimail 所有功能通过 REST API 暴露，总计 **62 个端点**。

## 认证方式

所有 API（除 `/login`、`/register`、`/setup`、`/health` 外）需要认证：

```bash
# Bearer Token
Authorization: Bearer <token>

# API Key
X-API-Key: wm_xxxxxxxx...
```

## 基础 URL

```
开发环境: http://localhost:8000
API 前缀: /api (大部分路由)
```

## 端点索引

| 模块 | 端点数 | 文档 |
|------|:------:|------|
|| [🔐 认证](auth.md) | 8 | 登录/注册/Token 刷新/个人信息 |
|| [📧 邮件](mail.md) | 14 | 文件夹/消息/搜索/发送/附件 |
|| [📝 笔记库](notes.md) | **25+** | 笔记 CRUD/搜索/标签/反应/附件/评论/分享/快捷键/Webhook/SSE |
|| [👥 通讯录](contacts.md) | 11 | 联系人/分组/自动完成 |
|| [🔑 API 密钥](tokens.md) | 4 | 创建/列表/删除 Key |
|| [⚙️ 设置](settings.md) | 4 | 邮件设置 + 笔记设置 |
|| [📡 文件](settings.md) | 1 | 附件文件下载 |
|| [🔎 统一搜索](settings.md) | 1 | 跨邮件+笔记搜索 |
|| [📚 系统文档](settings.md) | 1 | Markdown→HTML 文档服务 |
|| **总计** | **~70** | |
| [🩺 健康检查](index.md#健康检查) | 3 | 应用/数据库/Redis 状态 |

## 通用约定

### 分页

列表接口使用**游标分页**：

```json
{
  "notes": [...],
  "next_page_token": "2026-07-07T00:00:00+00:00",
  "total": 100
}
```

- `cursor`: 上一页最后一条的 `created_at` ISO 时间
- `page_size`: 每页条数（默认 20，最大 100）
- 首页请求不传 `cursor`

### 错误格式

```json
{
  "detail": "错误描述信息"
}
```

HTTP 状态码：

| 状态码 | 含义 |
|--------|------|
| 200 | 成功 |
| 201 | 创建成功 |
| 204 | 删除成功（无响应体） |
| 400 | 请求参数错误 |
| 401 | 未认证 |
| 404 | 资源不存在 |
| 422 | 请求体验证失败 |

## 健康检查

```bash
GET /health              # 应用状态
GET /health/db           # 数据库连接
GET /health/redis        # Redis 连接
```

无需认证。
