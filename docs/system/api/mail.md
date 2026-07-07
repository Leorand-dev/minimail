# 📧 邮件 API

## 文件夹

### GET /api/mail/folders
获取当前用户的所有文件夹列表（含未读数）。
```bash
curl -H "Authorization: Bearer ***" /api/mail/folders
```

### GET /api/mail/account-folders/{account_id}
获取指定邮箱账户的文件夹。

### POST /api/mail/folders — 创建文件夹
### DELETE /api/mail/folders — 删除文件夹

## 邮件列表

### GET /api/mail/messages
获取邮件列表（支持分页）。
| 参数 | 说明 |
|------|------|
| `folder` | 文件夹名 (默认 INBOX) |
| `page` / `page_size` | 分页 |
| `sort_field` / `sort_order` | 排序 |

### GET /api/mail/messages/search
搜索邮件（支持关键词 + 日期范围 + 未读筛选）。
| 参数 | 说明 |
|------|------|
| `query` | 搜索关键词 |
| `date_from` / `date_to` | 日期范围 (DD-Mon-YYYY) |
| `unread_only` | 仅未读 |
| `folder` / `page` / `page_size` | 分页 |

### GET /api/mail/messages/{uid}
获取单封邮件详情（含 in_reply_to, message_id, references 用于线程追踪）。

### POST /api/mail/messages/{uid}/read — 标记已读
### POST /api/mail/messages/{uid}/unread — 标记未读
### POST /api/mail/messages/{uid}/move — 移动到文件夹
### POST /api/mail/messages/{uid}/delete — 删除

## 会话

### GET /api/mail/conversations
获取按标准主题分组会话列表。
| 参数 | 说明 |
|------|------|
| `folder` | 文件夹名 |
| `page_size` | 每页会话数 |

主题标准化：自动去除 `Re:`/`Fwd:`/`回复`/`转发` 前缀。
相同主题的消息聚合为一个会话，按最新消息时间降序排列。
IMAP 连接超时自动回退 demo 数据（5s 连接超时）。

## 附件

### GET /api/mail/messages/{uid}/attachment/{part_id}
下载邮件附件。

## 发送

### POST /api/mail/send
发送邮件（支持纯文本/HTML 双格式，支持 account_id 指定发件账户）。

## 邮箱设置向导

### GET /api/settings/mail/auto-detect?email=xxx
自动检测邮箱 IMAP/SMTP 配置。内置 20+ 服务商（Gmail/QQ/163/126/Outlook/iCloud/Yahoo/阿里云等），支持 MX 记录匹配和通用域名猜测。
