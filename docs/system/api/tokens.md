# 🔑 API 密钥 API

## GET /api/auth/tokens

获取当前用户的所有 API 密钥。

→ 200
```json
[{"id": "...", "name": "我的密钥", "prefix": "wm_abc...", "created_at": "..."}]
```

## POST /api/auth/tokens

创建新 API 密钥。

```json
{"name": "我的密钥"}
```

→ 201
```json
{"id": "...", "name": "我的密钥", "token": "wm_xxxxxxxx...", "prefix": "wm_abc..."}
```

> ⚠️ `token` 仅在此响应中返回一次，关闭后不可查看。

## PUT /api/auth/tokens/{id}

更新密钥信息。

```json
{"name": "新名称"}
```

## DELETE /api/auth/tokens/{id}

撤销密钥。之后该密钥发起的请求将返回 401。
