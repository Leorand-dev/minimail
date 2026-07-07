# 开发进度记录

最后更新: 2026-07-07 (v0.12 已发布)

## ✅ 已完成

### v0.12 — 笔记库全面上线 + 邮件体验完善

#### 笔记库 (100% 对齐 Memos)
- [x] Phase 1: 数据库 (Note/NoteTag/NoteReaction) + CRUD API + Alembic 迁移
- [x] Phase 3: 前端 MemosPage/MemoCard/MemoEditor/MemoList + Zustand store
- [x] 标签系统: CRUD API + TagsManager + `#tag` 自动提取
- [x] 全文搜索: PostgreSQL tsvector + GIN 索引
- [x] Phase 2: pgvector 语义搜索 + AI Agent from-context 端点
- [x] Phase 5: 邮件→笔记 (from-email) + 统一搜索
- [x] Reaction: 切换式 Emoji 点赞 (👍❤️🎉)
- [x] 评论/线程: parent_id 评论系统
- [x] 附件上传: 拖拽上传 + 下载
- [x] 链接元数据: OG 标签抓取
- [x] 内容属性: has_link/has_code/has_task_list/title
- [x] PROTECTED 可见性: 三级 (private/protected/public)
- [x] 公开分享链接: token 生成 + 无认证解析
- [x] 快捷键: 保存过滤条件快捷入口
- [x] SSE 实时同步: sse-starlette EventSource
- [x] Webhook: note.created/updated/deleted 事件通知

#### 邮件系统
- [x] 多账户发件人选择: 撰写页下拉选择
- [x] 邮箱设置向导: 自动检测 IMAP/SMTP (20+ 服务商)
- [x] 会话模式 (Conversation View): 主题分组

#### 系统优化
- [x] 前端分包: vendor/editor/app 3 chunks <500kB
- [x] 后端统一错误处理: 全局 Exception handler
- [x] API 文档完善: notes.md 25+ 端点
- [x] 全量 UI 美化: 统一 55px Header
- [x] 系统文档: 15 篇 + HTML 渲染服务
- [x] 代码审计: TypeScript 零错误
- [x] Release v0.12: CHANGELOG + GitHub Release + Tag

#### 部署
- [x] Docker Compose 修复 (ENCRYPTION_KEY/迁移/Dockerfile)
- [x] 部署指南: 开发/生产/Docker/Nginx/SSL/备份
- [x] nginx.conf: SSE 不缓冲 + X-Forwarded-For + 文件上传限制

## 📋 进行中 / 计划

- [ ] P3: 动态导入 accounts.ts 警告修复
- [ ] P3: Release v0.13
