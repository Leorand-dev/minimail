# 📝 笔记库 API

笔记库完整 CRUD + 搜索 + 标签管理，共 **12 个端点**。

## 笔记 CRUD

### POST /api/notes

创建笔记。

```bash
curl -X POST /api/notes \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"content": "# 标题\n\n正文", "tags": ["tag1", "tag2"], "visibility": "private"}'
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|:----:|------|
| `content` | string | ✅ | Markdown 内容 (1-65536 字符) |
| `tags` | string[] | | 标签列表 (最多 20 个) |
| `visibility` | string | | `private` (默认) / `public` |
| `pinned` | bool | | 是否置顶 |
| `parent_id` | UUID | | 父笔记 ID (评论/线程) |

→ 201
```json
{"id": "...", "content": "...", "tags": [...], "created_at": "...", ...}
```

### GET /api/notes

获取笔记列表（游标分页）。

| 参数 | 说明 |
|------|------|
| `page_size` | 每页条数 (默认 20, 最大 100) |
| `cursor` | 上一页最后一条的 created_at |
| `visibility` | `private` / `public` / 空=全部 |
| `tag` | 按标签过滤 |

### GET /api/notes/{id}

获取单条笔记。

### PUT /api/notes/{id}

更新笔记（部分更新）。

```json
{"content": "新内容", "tags": ["new-tag"], "pinned": true}
```

| 字段 | 说明 |
|------|------|
| `content` | 新内容 |
| `tags` | 替换全部标签 |
| `visibility` | `private` / `public` |
| `pinned` | 置顶 |
| `row_status` | `active` / `archived` |

### DELETE /api/notes/{id}

删除笔记（软删除 → `row_status = archived`）。

→ 204

## 置顶 & 恢复

### POST /api/notes/{id}/pin

切换置顶状态。

→ 200 `{"pinned": true/false, ...}`

### POST /api/notes/{id}/restore

恢复已归档笔记。

→ 200 `{"row_status": "active", ...}`

## 搜索

### GET /api/notes/search?q=关键词

全文搜索（PostgreSQL tsvector）。

| 参数 | 说明 |
|------|------|
| `q` | 搜索关键词 |
| `tag` | 按标签过滤 |
| `visibility` | `private` / `public` |
| `page_size` | 每页条数 |
| `cursor` | 游标 |

结果按 `ts_rank` 相关性降序排列。

## 标签管理

### GET /api/notes/tags

获取当前用户所有标签（含笔记计数）。

→ 200
```json
[{"name": "tag1", "note_count": 3}, {"name": "tag2", "note_count": 1}]
```

### POST /api/notes/tags

创建标签。

```json
{"name": "new-tag"}
```

已存在时返回现有标签（不会重复创建）。

### PUT /api/notes/tags/{name}

重命名标签。新名已存在时自动合并计数。

```json
{"new_name": "renamed-tag"}
```

### DELETE /api/notes/tags/{name}

删除标签（从所有笔记中移除）。

→ 204

## 开发中

### POST /api/notes/search/semantic (P1)

语义搜索 — 基于 pgvector + embedding 模型，Phase 2 实现。

### POST /api/notes/from-context (P2)

从文本/邮件提取内容创建笔记 — Agent 专用端点。
