# Minimail Changelog

所有重要变更均记录在此文件。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，
版本遵循 [Semantic Versioning](https://semver.org/lang/zh-CN/)。

---

## 0.13 — 2026-07-07

### 修复

#### 🔴 CRITICAL
- **contacts.py 无限递归**: `from app.services.contact import update_contact` 与路由 handler 同名，递归调用自身导致栈溢出 → 重命名 import 为 `svc_update_contact`
- **smtp_service.py Fernet 密钥不一致**: 手动 `Fernet(key.encode())` 派生与集中管理的 `_make_fernet_key()` 不同，加密密码无法解密 → 统一使用 `_decrypt_password()`
- **settings.py + mail.py Fernet 多处不一致**: 3 处独立 Fernet 实例化导致密钥不兼容 → 全部收敛到 `_decrypt_password()`

#### HIGH
- **ComposePage setTimeout 内存泄漏**: 发送成功后 `setTimeout` 未清理 → 添加 `sendTimerRef` + unmount cleanup
- **MemosPage 异步操作未处理**: `handleSave/handleDelete/handleTogglePin` 未 try/catch → API 失败时前端崩溃 → 包装
- **stores/memos.ts Zustand v5**: 非 curried form `create<NotesState>(set => ...)` → `create<NotesState>()((set) => ...)`

#### MEDIUM
- **NoteTagResponse.id 必填 → list_tags 422**: 聚合查询不返回 id，Pydantic 校验失败 → `id: int | None = None`
- **NoteResponseWithReactions 字段重复**: 与 NoteResponse 完全相同的字段重复声明 → 改为继承
- **NoteListResponse.notes 类型固定**: 无法容纳含 reactions 的响应 → 改为 union 类型
- **Tags API 返回状态码**: list_tags 返回码不一致 → 修复
- **6 处 `any` 类型**: auth.ts, SetupPage, ProfilePanel, TagsManager, MailLayout, SettingsPage → `unknown` + 类型断言
- **PreviewPane 反模式**: `document.getElementById` DOM 操作 → React state
- **前端多处未使用 import**: ApiKeysPanel/SearchPanel/Contacts/MailLayout → 清理
- **package.json 缺少 dayjs**: 其他组件引用但未声明 → 补充

#### 部署
- **Docker Compose**: ENCRYPTION_KEY 必填变量、alembic 启动前迁移、端口 80:80
- **requirements.txt**: 补充 sse-starlette/beautifulsoup4/dnspython
- **nginx.conf**: SSE 不缓冲、X-Forwarded-For、client_max_body_size 50M
- **Dockerfile**: 后端 HEALTHCHECK + libpq-dev、前端 npm ci + nginx HEALTHCHECK
- **docker/.env.example**: 部署配置模板

#### UI
- **系统文档 HTML 乱码**: 后端返回 HTML 片段，前端用 `ReactMarkdown` 渲染导致 HTML 标签显示为纯文本 → 改用 `dangerouslySetInnerHTML`

### 改进
- 全量 UI 美化（统一 55px Header、侧栏样式、笔记卡片 hover）
- 前端分包优化（vendor 96kB / editor 412kB / app 430kB，chunk 警告消除）
- 后端统一错误处理（全局 Exception handler）
- 侧栏重构（笔记库独立折叠分区）
- 全量代码审计（3 轮，36 文件修改，0 TypeScript 错误）
- Git 历史脱敏（filter-branch 清理 30 commits）

### 文档
- 部署指南: 开发/生产/Docker/Nginx/SSL/备份
- README_EN.md: 同步中文版 v0.12-13 功能
- INSTALL.md/PROGRESS.md: 更新到 v0.13 进度
- 操作指南 7 篇 + API 参考 7 篇 + 入口索引
- _devdocs/ 25 篇开发记录 (gitignored)

---

## 0.12 — 2026-07-07

### 新增

#### 📝 笔记库 (全面对齐 Memos)
- **笔记 CRUD**: Phase 1 数据库 (Note/NoteTag/NoteReaction) + CRUD API + Alembic 迁移
- **前端笔记库**: Phase 3 MemosPage/MemoList/MemoCard/MemoEditor + Zustand store
- **标签系统**: 后端 CRUD + 前端 TagsManager，支持创建/重命名/删除 + 自动从 `#tag` 语法提取
- **全文搜索**: PostgreSQL tsvector + GIN 索引，支持关键词/标签/可见性过滤
- **语义搜索**: Phase 2 pgvector + ivfflat 索引，外部 AI Agent 传入 embedding 进行余弦相似度搜索
- **AI Agent 集成**: `from-context` 端点 (文本/会议纪要自动创建笔记)，Agent 专用 API
- **邮件→笔记**: `from-email` 端点 + 预览面板「转为笔记」按钮，自动格式化 Markdown + 标签 `email`
- **统一搜索**: `GET /api/search` 跨 notes + mail.messages 表 tsquery 搜索
- **置顶/归档**: 笔记置顶切换 + 软删除/恢复
- **反应 (Reaction)**: 切换式 Emoji 点赞 API (👍❤️🎉)，乐观更新 UI
- **评论/线程**: 基于 parent_id 的评论系统 (表已建 + API + 前端评论区)
- **附件上传**: NoteAttachment 模型 + 文件上传/下载端点 + 拖拽上传 UI
- **链接元数据**: `POST /notes/link-metadata` OG 元数据抓取 (httpx + BeautifulSoup4)
- **内容属性**: has_link/has_code/has_task_list/title 运行时计算，响应中返回 property 字段
- **PROTECTED 可见性**: 三级 (private/protected/public)
- **公开分享链接**: 分享 token 生成 + 无认证解析，设置面板全局开关
- **快捷键**: 保存过滤条件快捷入口，侧栏 + 设置面板管理
- **SSE 实时同步**: sse-starlette EventSource，笔记变更即时推送
- **Webhook**: 事件通知 (note.created/updated/deleted) + HMAC-SHA256 签名

#### 📧 邮件系统体验
- **多账户发件人选择**: 撰写页发件人下拉框，自动加载邮箱账户列表，发送带 account_id
- **邮箱设置向导**: `GET /api/settings/mail/auto-detect`，20+ 服务商预设 (Gmail/QQ/163/126/Outlook/iCloud/Yahoo/阿里云等) + MX 记录匹配 + 通用猜测
- **会话模式 (Conversation View)**: 按主题分组 (Re/Fwd/回复/转发 标准化)，可展开会话树，IMAP 超时回退 demo 数据

#### 📚 系统文档
- **系统文档子项目**: 操作说明 7 篇 + API 参考 7 篇 + 入口索引，Markdown→HTML 渲染
- **DocsPage 查看器**: 左侧导航树 + 右侧 HTML 渲染 (dangerouslySetInnerHTML)

### 改进
- **全量 UI 美化**: 统一 55px Header，侧栏 rounded-lg + shadow-sm，消息行选中 3px 蓝左边框，笔记卡片 hover shadow-sm
- **前端分包优化**: vendor (96 kB) + editor (412 kB) + app (430 kB)，chunk 警告消除
- **后端统一错误处理**: 全局 Exception handler (HTTPException 透传 / ValidationError 422 / 500 日志)
- **侧栏重构**: 笔记库从 NavItem 移出为独立可折叠分区
- **Git 历史脱敏**: filter-branch 清理 30 commits + force push

### 文档
- **API 文档完善**: notes.md 从 12→25+ 端点，index.md 更新 (~70 端点)
- **系统文档**: docs/system/ 完整结构 + 后端 HTML 服务
- **开发文档**: _devdocs/ 21 篇开发记录 (gitignored)

### 修复
- **API 调用路径双 `/api/` 前缀**: axios baseURL `/api` 路径对齐
- **LoginRequest 邮箱格式**: EmailStr → str，支持用户名登录
- **Lazy loading greenlet 错误**: 所有 NoteResponse 改为手动构造，避免 SQLAlchemy async 懒加载

---

## 0.11 — 2026-07-06

### 新增
- **首次部署管理员引导**: 新系统自动检测无用户，跳转 `/setup` 页面初始化管理员（用户名+密码）
- **用户名登录**: 支持用户名或邮箱登录，注册时自动从 email 前缀生成 username
- **用户信息管理**: 个人信息面板（修改显示名称）+ 修改密码（当前密码验证）
- **UserMenu 下拉菜单**: 所有页面 Header 右上角显示头像+N 昵称，下拉菜单快捷入口（个人信息/邮箱设置/API 密钥/退出）
- **多邮箱账户前端支持**: 设置页邮箱账户列表（添加/删除/设默认）

### 改进
- 登录页输入框改为"用户名 / 邮箱"
- UserMenu 昵称靠右对齐（flex-1 占位）
- 设置页支持多邮箱账户 IMAP/SMTP 自动切换

### 变更
- 项目名称 Webmail → **Minimail**
- GitHub 仓库迁移至 `github.com/Leorand-dev/minimail`

### 文档
- README + CHANGELOG + 开发文档 同步更名


## 0.10 — 2026-07-06 (初始发布)

### 新增
- **多邮箱账户支持**: 添加/删除/设默认账户，独立 IMAP/SMTP 配置，密码加密存储
- **回复/转发/全部回复**: 预览面板一键操作，自动预填收件人 + 引用原文，可回复/全部回复/转发
- **附件下载**: 预览面板附件点击直接触发浏览器下载
- **统一页面 Header**: 所有页面顶部 55px 统一工具栏（Logo + 标题 + 操作按钮），与收件箱一致
- **智能错误诊断**: 无邮箱账户时提示"请添加邮件账户"，连接失败时提示"请检查网络或者邮件账户设置"
- **API 密钥管理**: 创建/撤销 API 令牌，范围控制（read/read,write/admin），过期时间设置

### 改进
- 写邮件页全宽自适应，不再限制 max-w-3xl
- 手机端侧栏自动隐藏，非邮件视图全屏展示
- 通讯录搜索防抖（300ms）
- 收件人邮箱格式校验
- 预览面板 iframe sandbox 安全加固
- 设置页工具栏统一样式
- Header 高度统一 55px

### 文档
- README 重写，新增 AI Agent 集成章节
- 新增 DEVELOPMENT_ROADMAP.md 独立开发路线图
- 新增 CHANGELOG.md

---

## 0.4.0 — 2026-07-05

### 新增
- 通讯录 CRUD + 分组管理 + 搜索
- API 密钥管理（创建/撤销/范围控制/过期）
- 撰写页收件人自动完成（通讯录联动）
- 退出登录功能
- 无 IMAP 配置引导"去设置"按钮

### 改进
- 所有功能移至 /mail 页面内（ComposePanel/SettingsPanel/ContactsPanel）
- 侧栏完整导航（写邮件/收件箱/通讯录/API密钥/设置/退出）
- 设置页"测试连接"按钮

---

## 0.3.0 — 2026-07-04

### 新增
- SMTP 邮件发送（支持 SSL/TLS/STARTTLS）
- 设置页 IMAP/SMTP 配置
- 撰写邮件面板（收件人/抄送/密送/主题/正文）
- 设置页密码加密存储（Fernet）

### 改进
- 前端重构为 /mail 路由内面板结构
- 邮件界面三栏响应式布局（手机/平板/桌面）

---

## 0.2.0 — 2026-07-03

### 新增
- IMAP 三栏邮件界面（文件夹树/邮件列表/预览面板）
- IMAP 协议封装（aioimaplib）
- 邮件搜索（IMAP SEARCH + 本地解析）
- 邮件标记（已读/未读）
- 文件夹管理（列表/创建/删除）

---

## 0.1.0 — 2026-07-02

### 新增
- 项目基础设施搭建
- FastAPI 后端骨架 + PostgreSQL
- 用户注册/登录（JWT 双令牌）
- 前端 React + TypeScript + Vite 脚手架
- 登录/注册页面 UI
- Docker Compose 开发环境
- PostgreSQL 自动建表（init_db）
