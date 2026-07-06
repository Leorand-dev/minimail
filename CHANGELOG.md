# Minimail Changelog

所有重要变更均记录在此文件。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，
版本遵循 [Semantic Versioning](https://semver.org/lang/zh-CN/)。

---

## 0.12 — 2026-07-06

### 新增
- **IMAP 状态指示器**: 侧栏底部显示连接状态（🟢 已连接/🔴 未连接）、最后同步时间、手动刷新按钮
- **富文本编辑器**: 写邮件正文替换为 TipTap/ProseMirror 编辑器，支持加粗/斜体/下划线/删除线、标题 H1-H3、无序/有序列表、对齐、引用、代码块、撤销/重做
- **HTML 邮件发送**: 后端支持 `MIMEMultipart("alternative")`，富文本自动打包 HTML + 纯文本双版

### 改进
- 写邮件页发送 `html_body` 和 `text_body` 双格式

### 修复
- **API 调用路径双 `/api/` 前缀**: axios baseURL `/api` 导致所有请求路径如 `/api/auth/me` 实际请求 `//api/...`（34 处修复，影响所有 API 功能）
- **LoginRequest 邮箱格式限制**: `EmailStr` 改为 `str`，现在支持用户名直接登录
- **个人信息修改无法更新用户名**: `UpdateProfileRequest` 新增 `username` 字段，后端关联更新

### 文档
- 侧栏新增「📄 API 文档」入口，内嵌 ReDoc（后改为新窗口打开）
- API 文档审计：修复 34 路由摘要/描述，项目名 Webmail → Minimail

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
