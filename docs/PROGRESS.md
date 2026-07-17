# 开发进度记录

最后更新: 2026-07-09 (v0.13 已发布)

## ✅ 已完成

### v0.13 — 邮件签名 + 批量操作 + 深度审计

#### 邮件系统
- [x] 邮件签名: 账户级签名 CRUD (GET/PUT)，富文本编辑器插入
- [x] 批量操作: 多选标记已读/未读/删除/移动 (folder 归档)
- [x] 多账户发件人选择: 撰写页签名联动

#### 3 轮深度审计 (CRITICAL 修复)
- [x] contacts.py 无限递归: 路由 handler 与 import 同名
- [x] Fernet 密钥 3 处不一致: smtp_service/settings/mail → 统一 _decrypt_password
- [x] ComposePage setTimeout 内存泄漏: sendTimerRef + unmount cleanup
- [x] 6 处 `any` 类型 → `unknown` + 类型断言
- [x] Zustand v5 curried form 修复
- [x] NoteTagResponse/NoteResponse 类型修复
- [x] MISC: 未使用 import 清理 + dayjs 补充

#### 前端修复
- [x] 系统文档 HTML 乱码: ReactMarkdown → dangerouslySetInnerHTML
- [x] 批量操作 API URL 对齐: /batch/read → /batch/mark-read

#### 部署配置
- [x] Dockerfile 生产级: 多阶段构建 + HEALTHCHECK + libpq-dev
- [x] docker-compose.yml: 3 服务 (postgres/backend/frontend), ENCRYPTION_KEY 必填
- [x] nginx.conf: SSE 不缓冲 + X-Forwarded-For + 50M 上传
- [x] docker/.env.example: 部署模板
- [x] requirements.txt: 补充 sse-starlette/beautifulsoup4/dnspython

### v0.12 — 笔记库全面上线 + 邮件体验完善

#### 笔记库 (100% 对齐 Memos)
- [x] Phase 1: 数据库 (Note/NoteTag/NoteReaction) + CRUD API + Alembic 迁移
- [x] Phase 3: 前端 MemosPage/MemoCard/MemoEditor/MemoList + Zustand store
- [x] 标签系统: CRUD API + TagsManager + `#tag` 自动提取
- [x] 全文搜索: PostgreSQL tsvector + GIN 索引
- [x] Phase 2: pgvector 语义搜索 + AI Agent from-context 端点
- [x] Phase 5: 邮件→笔记 (from-email) + 统一搜索
- [x] Reaction + 评论/线程 + 附件上传/下载
- [x] 链接元数据 + 内容属性 + PROTECTED 三级可见性
- [x] 公开分享链接 + 快捷键 + SSE 实时同步 + Webhook

#### 系统文档
- [x] 操作指南 7 篇 + API 参考 7 篇 + 入口索引
- [x] HTML 渲染服务 + DocsPage 查看器
- [x] _devdocs/ 25+ 开发记录 (gitignored)

## 📋 计划

### P1 — 邮件体验完善
- [ ] 通知系统（桌面推送 / Web 通知）
- [ ] 邮件附件预览（PDF/图片内联）
- [ ] IMAP idle 推送（实时新邮件）

### P2 — 平台扩展
- [ ] MCP Server（将 Minimail 包装为 MCP）
- [ ] 统一搜索升级（向量 + 关键词混合）

### P3 — 质量
- [ ] 性能优化（IMAP 缓存、大附件 CDN）
- [ ] 更多 IMAP 服务器兼容测试
