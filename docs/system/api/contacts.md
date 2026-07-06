# 👤 通讯录 API

## 联系人

### GET /api/contacts

联系人列表。

| 参数 | 说明 |
|------|------|
| `search` | 搜索关键词 |
| `group_id` | 分组过滤 |
| `page` | 页码 |
| `page_size` | 每页条数 |

### GET /api/contacts/autocomplete

收件人自动完成。

| 参数 | 说明 |
|------|------|
| `q` | 关键词（防抖搜索）|
| `limit` | 返回条数上限 |

### GET /api/contacts/{id}

联系人详情。

### POST /api/contacts

创建联系人。

```json
{"name": "张三", "email": "zhang@example.com", "phone": "13800138000", "group_id": "..."}
```

### PUT /api/contacts/{id}

更新联系人。

### DELETE /api/contacts/{id}

删除联系人。

### POST /api/contacts/batch-delete

批量删除。

```json
{"ids": ["id1", "id2", ...]}
```

## 分组

### GET /api/contacts/groups

所有分组。

### POST /api/contacts/groups

创建分组。

```json
{"name": "同事", "color": "#ff6600"}
```

### PUT /api/contacts/groups/{id}

更新分组。

### DELETE /api/contacts/groups/{id}

删除分组（不会删除组内联系人）。
