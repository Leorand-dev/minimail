# 🔐 认证 API

## POST /login

登录获取 JWT 令牌。

```json
{"email": "demo@example.com", "password": "Demo1234!"}
```

→ 200
```json
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "token_type": "bearer",
  "user": {"id": "...", "email": "...", "name": "..."}
}
```

## POST /register

注册新用户。

```json
{"email": "user@example.com", "password": "***", "name": "用户名"}
```

→ 201

## POST /refresh

刷新 Access Token。

```json
{"refresh_token": "eyJ..."}
```

→ 200 `{"access_token": "...", "refresh_token": "..."}`

## GET /me

获取当前用户信息。

→ 200 `{"id": "...", "email": "...", "name": "...", ...}`

## PUT /profile

更新个人资料。

```json
{"name": "新名称", "language": "en_US", ...}
```

→ 200

## PUT /password

修改密码。

```json
{"old_password": "***", "new_password": "***"}
```

→ 200

## POST /setup

首次安装初始化（创建管理员账户）。同 `/register` 格式。

## GET /setup/status

检查是否已初始化。

→ 200 `{"setup_required": true/false}`
