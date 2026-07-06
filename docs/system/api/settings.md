# ⚙️ 设置 API

## 邮箱账户

### GET /api/settings/accounts

获取所有邮箱账户。

→ 200
```json
[{"id": "...", "email": "user@example.com", "imap_host": "imap.example.com", ...}]
```

### POST /api/settings/accounts

添加邮箱账户。

```json
{
  "email": "user@example.com",
  "imap_host": "imap.example.com",
  "imap_port": 993,
  "imap_ssl": true,
  "smtp_host": "smtp.example.com",
  "smtp_port": 465,
  "smtp_ssl": true,
  "username": "user@example.com",
  "password": "***"
}
```

### PUT /api/settings/accounts/{id}

更新邮箱账户。

### DELETE /api/settings/accounts/{id}

删除邮箱账户。

### POST /api/settings/accounts/{id}/default

设为默认发送账户。

## 邮件偏好

### GET /api/settings/mail

获取邮件偏好。

→ 200 `{"messages_per_page": 50, "preview_pane": true, ...}`

### PUT /api/settings/mail

更新邮件偏好。

### POST /api/settings/mail/test

测试 IMAP/SMTP 连接。

```json
{"imap_host": "...", "imap_port": 993, "smtp_host": "...", ...}
```

→ 200 `{"success": true, "imap": "ok", "smtp": "ok"}`
