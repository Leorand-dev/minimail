# 📝 笔记库 API

笔记库完整功能，共 **25+ 个端点**。

## 笔记 CRUD

### POST /api/notes

创建笔记。支持自动标签提取（从 `#tag` 语法）。

```bash
curl -X POST /api/notes \
  -H "Authorization: Bearer ***" \
  -d '{"content": "# 标题\n\n正文 #tag1", "tags": ["手动标签"], "visibility": "private"}'
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|:----:|------|
| `content` | string | ✅ | Markdown 内容 (1-65536 字符) |
| `tags` | string[] | | 手动标签 (自动标签从 #tag 提取) |
| `visibility` | string | | `private` / `protected` / `public` |
| `pinned` | bool | | 是否置顶 |
| `parent_id` | UUID | | 父笔记 ID (评论/线程) |

→ 201
```json
{"id": "...", "content": "...", "tags": ["手动标签", "tag1"], "visibility": "private", "pinned": false, "property": {"has_link": false, "has_code": false, "has_task_list": false, "title": "标题", "auto_tags": ["tag1"]}}
```

### GET /api/notes

获取笔记列表（游标分页）。响应含 reactions + property。

| 参数 | 说明 |
|------|------|
| `page_size` | 每页条数 (默认 20, 最大 100) |
| `cursor` | 上一页最后一条的 created_at |
| `visibility` | `private` / `protected` / `public` / 空=全部 |
| `tag` | 按标签过滤 |

### GET /api/notes/{id}

获取单条笔记详情（含 reactions + property）。

### PUT /api/notes/{id}

更新笔记（部分更新）。修改 content 时重新提取自动标签。

```json
{"content": "新内容 #newtag", "tags": ["new-tag"], "pinned": true}
```

| 字段 | 说明 |
|------|------|
| `content` | 新内容 |
| `tags` | 替换全部标签 |
| `visibility` | `private` / `protected` / `public` |
| `pinned` | 置顶 |
| `row_status` | `active` / `archived` |

### DELETE /api/notes/{id}

删除笔记（软删除 → `row_status = archived`）。→ 204

## 置顶 & 恢复

### POST /api/notes/{id}/pin — 切换置顶
### POST /api/notes/{id}/restore — 恢复归档

## 搜索

### GET /api/notes/search?q=关键词

全文搜索（PostgreSQL tsvector）。按 `ts_rank` 相关性降序。

| 参数 | 说明 |
|------|------|
| `q` | 搜索关键词 |
| `tag` | 按标签过滤 |
| `visibility` | `private` / `protected` / `public` |
| `page_size` / `cursor` | 分页 |

### POST /api/notes/search/semantic

语义搜索 — 外部 AI Agent 传入自己的 embedding 向量。

```json
{
  "embedding": [0.001, -0.002, ...],
  "top_k": 10,
  "tag": "",
  "visibility": ""
}
```

响应按余弦相似度降序排列。

## 标签管理

### GET /api/notes/tags — 获取所有标签（含计数）
### POST /api/notes/tags — 创建标签（重复返回现有）
### PUT /api/notes/tags/{name} — 重命名标签（自动合并计数）
### DELETE /api/notes/tags/{name} — 删除标签（从所有笔记移除）

## Reaction

### POST /api/notes/{id}/reactions?emoji=👍

切换 Emoji 反应（有则移除，无则添加）。响应含 reactions 列表。

## 附件

### POST /api/notes/{id}/attachments

上传附件（multipart/form-data）。

```bash
curl -X POST /api/notes/{id}/attachments \
  -H "Authorization: Bearer ***" \
  -F "file=@photo.jpg"
```

→ 201 `{"id": "...", "filename": "photo.jpg", "size": 12345, "url": "/api/files/{id}", ...}`

### GET /api/notes/{id}/attachments — 获取附件列表

### GET /api/files/{id} — 下载附件文件

## 评论/线程

### POST /api/notes/{id}/comments — 添加评论
### GET /api/notes/{id}/comments — 获取评论列表

评论使用 Note 模型的 `parent_id` 字段实现。

## 链接元数据

### POST /api/notes/link-metadata

抓取 URL 的 Open Graph 元数据。

```json
{"url": "https://github.com"}
```
→ 200 `{"url": "...", "title": "GitHub", "description": "...", "image": "..."}`

## Agent 端点

### POST /api/notes/from-context

外部 AI 传入内容创建笔记（可选附带 embedding）。

```json
{
  "content": "会议纪要...",
  "tags": ["会议"],
  "source": "AI Agent",
  "embedding": [0.001, -0.002, ...]
}
```

### POST /api/notes/from-email

前端传入邮件字段创建笔记。

## 公开分享

### POST /api/notes/{id}/shares

创建分享链接（受 `note_allow_shares` 设置控制）。

```json
{"expires_in_hours": 0}
```

→ 201 `{"id": "...", "token": "...", "url": "/api/shares/{token}"}`

### GET /api/notes/{id}/shares — 查看分享链接列表
### DELETE /api/notes/{id}/shares/{share_id} — 删除分享链接

### GET /api/shares/{token}

**无需认证**。通过分享 token 获取笔记内容。→ 200 NoteResponse

## 快捷键

### GET /api/notes/shortcuts — 获取快捷键列表
### POST /api/notes/shortcuts — 创建快捷键
### PUT /api/notes/shortcuts/{id} — 更新快捷键
### DELETE /api/notes/shortcuts/{id} — 删除快捷键

```json
{"name": "工作笔记", "icon": "💼", "filter_tag": "work", "filter_visibility": "private"}
```

## Webhook

### GET /api/notes/webhooks — 获取 Webhook 列表
### POST /api/notes/webhooks — 创建 Webhook
### PUT /api/notes/webhooks/{id} — 更新 Webhook
### DELETE /api/notes/webhooks/{id} — 删除 Webhook

```json
{"url": "https://example.com/webhook", "events": ["note.created", "note.updated"], "secret": ""}
```

事件：`note.created` / `note.updated` / `note.deleted`

## SSE 实时事件

### GET /api/notes/events

SSE EventSource 端点。需认证。笔记创建/更新/删除时推送 JSON 事件。

```
event: note.created
data: {"id": "...", "event_type": "note.created", ...}
```

## 内容属性（响应体）

所有笔记响应包含 `property` 字段：

```json
{
  "property": {
    "has_link": false,
    "has_code": true,
    "has_task_list": false,
    "has_incomplete_tasks": false,
    "title": "笔记标题",
    "auto_tags": ["tag1", "tag2"]
  }
}
```

## 笔记设置

### GET /api/settings/notes — 获取笔记设置
### PUT /api/settings/notes — 更新笔记设置

```json
{"allow_shares": true}
```
