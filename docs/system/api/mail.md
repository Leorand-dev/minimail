# 📧 邮件 API

## 文件夹

### GET /api/mail/folders

获取当前用户的所有文件夹列表。

```bash
curl -H "Authorization: Bearer $TOKEN" /api/mail/folders
```

→ 200
```json
[{"name": "INBOX", "unseen": 5, "messages": 20}, ...]
```

### GET /api/mail/account-folders/{account_id}

获取指定邮箱账户的文件夹。

```bash
curl -H "Authorization: Bearer $TOKEN" /api/mail/account-folders/{id}
```

### POST /api/mail/folders

创建文件夹。

```json
{"name": "Work", "account_id": "..."}
```

### DELETE /api/mail/folders

删除文件夹。

```json
{"name": "Work", "account_id": "...", "parent": "INBOX"}
```

## 消息

### GET /api/mail/messages

获取邮件列表。

| 参数 | 说明 | 默认 |
|------|------|------|
| `folder` | 文件夹名 | INBOX |
| `account_id` | 账户 ID | null (统一收件箱) |
| `page` | 页码 | 1 |
| `page_size` | 每页条数 | 50 |
| `search` | 搜索关键词 | — |
| `date_from` / `date_to` | 日期范围 | — |
| `unread_only` | 仅未读 | false |

### GET /api/mail/messages/search

搜索邮件（同 `GET /messages` 的 `search` 参数）。

### GET /api/mail/messages/{uid}

获取单封邮件详情。

| 参数 | 说明 |
|------|------|
| `uid` | 邮件 UID |
| `folder` | 文件夹名 |
| `account_id` | 账户 ID |

### POST /api/mail/messages/{uid}/read

标记为已读。

→ 200

### POST /api/mail/messages/{uid}/unread

标记为未读。

→ 200

### POST /api/mail/messages/{uid}/move

移动到文件夹。

```json
{"target_folder": "Archive", "account_id": "..."}
```

### POST /api/mail/messages/{uid}/delete

删除邮件（移动到 Trash）。

```json
{"account_id": "..."}
```

## 附件

### GET /api/mail/messages/{uid}/attachment/{part_id}

下载附件。

| 参数 | 说明 |
|------|------|
| `folder` | 文件夹名 |
| `account_id` | 账户 ID |

## 发送

### POST /api/mail/send

发送邮件。

```json
{
  "to": ["user@example.com"],
  "cc": [],
  "bcc": [],
  "subject": "主题",
  "body_html": "<p>邮件正文</p>",
  "body_text": "纯文本版本",
  "attachments": ["附件的 MIME part"],
  "account_id": "发送账户 ID"
}
```

## 状态

### GET /api/mail/status

IMAP 连接状态。

→ 200
```json
{"connected": true, "last_sync": "2026-07-07T12:00:00", "accounts": 3}
```

## 演示

### GET /api/mail/demo

快速加载演示数据（无需配置邮箱账户）。

→ 200
```json
{
  "folders": [...],
  "messages": {"messages": [...], "total": 5, "page": 1, "pages": 1}
}
```
