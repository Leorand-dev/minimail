# 类 Roundcube Mail System — 完整开发计划与开发文档

> 基于 Roundcube Webmail 的架构分析，融合 **AI Agent 自动化操作**能力，构建新一代智能邮件系统。

---

## 一、系统分析报告：Roundcube 架构拆解

### 1.1 项目概览

| 维度 | 数据 |
|------|------|
| 学习对象 | [Roundcube Webmail](https://github.com/roundcube/roundcubemail) — 浏览器端 IMAP 邮件客户端 |
| 语言 | PHP 8.1+ (后端), JavaScript/jQuery (前端), LESS (样式) |
| 数据库 | MariaDB/MySQL, PostgreSQL, SQLite (三种驱动) |
| 协议 | IMAP (收), SMTP (发), Sieve (过滤规则), LDAP (通讯录) |
| 代码量 | 13,685 commits，~50 万行 |
| 架构 | 自研 PHP 框架 (Roundcube Framework)，MVC-like |
| 插件 | 30+ 官方插件，通过 Hook API 扩展 |
| 皮肤 | Elastic (响应式, LESS 编译), 可换肤 |
| 用户 | 7.1k Stars, 1.8k Forks |

### 1.2 目录结构分析

```
roundcubemail/
├── index.php                  # 入口 (前端控制器)
├── composer.json              # PHP 依赖管理
├── jsdeps.json                # JS 依赖 (jQuery 等)
├── config/                    # 配置 (数据库, IMAP, SMTP, 插件)
├── program/
│   ├── actions/               # 控制器层 (mail, contacts, settings, login, utils)
│   ├── include/               # 引导 / 核心函数
│   ├── js/                    # 前端 JS (app.js, 各模块)
│   ├── lib/Roundcube/         # 框架核心 (~50 个类)
│   │   ├── rcube.php          # 单例应用容器
│   │   ├── rcube_imap.php     # IMAP 协议实现
│   │   ├── rcube_smtp.php     # SMTP 发送
│   │   ├── rcube_storage.php  # 存储抽象层
│   │   ├── rcube_message.php  # 邮件解析 (MIME)
│   │   ├── rcube_mime.php     # MIME 编解码
│   │   ├── rcube_user.php     # 用户认证
│   │   ├── rcube_session.php  # 会话管理
│   │   ├── rcube_db.php       # 数据库抽象 (PDO)
│   │   ├── rcube_cache.php    # 缓存层
│   │   ├── rcube_contacts.php # 通讯录
│   │   ├── rcube_ldap.php     # LDAP 集成
│   │   ├── rcube_plugin.php   # 插件基类
│   │   ├── rcube_plugin_api.php  # 插件引擎
│   │   ├── rcube_output.php   # 输出/模板引擎
│   │   └── rcube_utils.php    # 工具函数
│   ├── localization/          # 国际化 (~70 种语言)
│   └── resources/             # 静态资源
├── plugins/                   # 30+ 插件 (acl, archive, enigma, managesieve, password...)
├── skins/elastic/             # 皮肤 (LESS, 模板, 图片)
├── SQL/                       # 数据库建表脚本 (mysql/pg/sqlite)
├── bin/                       # CLI 工具
├── installer/                 # Web 安装向导
├── tests/                     # 测试
├── logs/                      # 日志
└── temp/                      # 临时文件
```

### 1.3 请求处理流程

```
index.php (入口)
  → program/include/startup.php (环境初始化)
    → rcube_config (加载配置)
    → rcube_session (启动会话)
    → rcube_db (数据库连接)
    → rcube_user (认证)
  → program/actions/ (路由)
    ├── mail/index.php   → 邮件列表/阅读/发送
    ├── contacts/        → 通讯录
    ├── settings/        → 设置
    └── login/           → 登录
  → 输出渲染 (通过 rcube_output → 皮肤模板)
```

### 1.4 核心功能清单

| 模块 | 功能 |
|------|------|
| **邮件** | IMAP 文件夹浏览, 邮件列表 (分页/排序), 邮件阅读 (HTML/纯文本), 撰写/回复/转发, 附件 (上传/下载/预览), MIME 解码, 邮件搜索, 标记 (星标/已读/旗标), 批量操作 (移动/删除/标记), 拖拽排序, 会话线程 |
| **通讯录** | 联系人管理 (增删改), 群组, LDAP 集成, vCard 导入/导出, CSV 导入, 自动完成 |
| **设置** | 个人偏好, 多身份签名, 响应式布局, 皮肤选择, 暗色模式 |
| **安全** | PGP 加密 (Enigma), 垃圾邮件标记, DKIM/SPF, XSS 过滤 (washtml), 连接加密 |
| **过滤** | Sieve 管理 (managesieve), 自动归档 |
| **国际化** | ~70 种语言, RTL 支持 |
| **扩展** | 30+ 插件, Hook API |

---

## 二、技术选型 (现代技术栈)

| 层 | 推荐技术 | 选择理由 |
|---|---------|---------|
| **后端语言** | Python 3.11+ | FastAPI, asyncio, 生态丰富 |
| **Web 框架** | FastAPI | 异步, Pydantic 校验, OpenAPI 自动生成 |
| **数据库** | PostgreSQL + Redis | 唯一 DB 驱动, pgvector 支持, 缓存/会话 |
| **ORM** | SQLAlchemy 2.0 + Alembic | 异步, 迁移管理 |
| **前端** | React 18 + TypeScript + Vite | 组件化, 类型安全, 快速 HMR |
| **UI 库** | shadcn/ui + Tailwind CSS 4 | 响应式, 暗色模式, 自定义主题 |
| **状态管理** | Zustand | 轻量, TypeScript 友好 |
| **IMAP** | `aiosmtplib` + `imaplib` (async 封装) | 标准协议, 异步兼容 |
| **SMTP** | `aiosmtplib` | 异步发送 |
| **MIME** | `mailparser` + 自定义 | RFC 2822 解析 |
| **认证** | JWT (access + refresh) | 无状态, OAuth2-ready |
| **部署** | Docker + Docker Compose | 一键部署 |
| **CI** | GitHub Actions | lint, test, build, deploy |
| **AI Agent** | MCP Protocol + OpenAI Function Calling | 标准 Agent 接口 |
| **向量搜索** | pgvector (PostgreSQL 扩展) | 无需额外组件 |

---

## 五、前端页面设计规范（Roundcube Elastic 风格）

> 本系统前端 UI 设计全面学习 [Roundcube Webmail](https://github.com/roundcube/roundcubemail) 的 **Elastic 皮肤**布局和交互模式，结合 React 现代前端技术栈实现。

### 5.1 布局系统

Roundcube Elastic 的核心布局是**三栏可切换布局**。本系统完全继承此设计：

```
┌─────────────────────────────────────────────────────────┐
│  #layout               ┌─── 三栏弹性布局 ───┐           │
│  ┌────────┬──────────────┬────────────────────────────┐  │
│  │        │              │                            │  │
│  │ sidebar│     list     │        content             │  │
│  │ ~250px │   ~350px     │        (flex)              │  │
│  │        │              │                            │  │
│  │文件夹  │  邮件列表    │   邮件预览 / 内容          │  │
│  │树状列表│  排序表头    │   iframe 嵌入 / 全页       │  │
│  │未读数  │  发件人/主题 │   发件人信息               │  │
│  │配额    │  日期/大小   │   附件列表                 │  │
│  │        │  分页导航    │   正文渲染                 │  │
│  └────────┴──────────────┴────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

**布局容器结构**（直接参考 Roundcube mail.html 源码）：

```html
<div id="layout">
  <!-- sidebar: 文件夹列表 -->
  <div id="layout-sidebar" class="listbox" role="navigation">
    <div class="header">
      <span class="header-title username"><!-- 用户名 --></span>
    </div>
    <div id="folderlist-content" class="scroller">
      <!-- mailboxlist treelist listing folderlist -->
    </div>
    <div class="footer"><!-- quota widget --></div>
  </div>

  <!-- list: 邮件列表 -->
  <div id="layout-list" class="listbox selected">
    <div id="messagelist-header" class="header">
      <a class="task-menu-button" />           ← 左上汉堡菜单
      <span class="header-title" />             ← 当前文件夹名
      <div class="toolbar menu">               ← select / threads / options 按钮
      <a class="refresh button" />             ← 刷新
    </div>
    <!-- searchbar + searchmenu -->
    <div id="messagelist-content" class="scroller">
      <!-- messagelist listing sortheader fixedheader -->
    </div>
    <!-- pagenav -->
  </div>

  <!-- content: 邮件预览 -->
  <div id="layout-content">
    <div class="header">
      <a class="back-list-button" />           ← 返回列表
      <span class="header-title" />
      <!-- mail-menu: reply/forward/more -->
    </div>
    <div class="iframe-wrapper">
      <iframe id="messagecontframe" />          ← 邮件正文 iframe
    </div>
  </div>
</div>
```

### 5.2 响应式断点（完全参考 Roundcube Elastic）

| 断点 | 宽度 | 布局模式 | 可见面板 | 行为 |
|------|------|---------|---------|------|
| **phone** | ≤ 480px | 单栏 | 一次显示一个面板 | 返回按钮导航；菜单全屏弹出层 |
| **small** | 481-768px | 单栏 | 一次显示一个面板 | 类似 phone，菜单侧滑 |
| **normal** | 769-1200px | 两栏 | 邮件列表 + 预览 | 侧栏默认隐藏，汉堡菜单切换 |
| **large** | > 1200px | 三栏 | 文件夹 + 列表 + 预览 | 全部可见，可选最小化侧栏 |

**CSS class 绑定**（参考 Roundcube ui.js `layout_metadata()`）：
```css
html.layout-large   /* >1200px 三栏全部可见 */
html.layout-normal  /* 769-1200px 两栏 */
html.layout-small   /* 481-768px 单栏 */
html.layout-phone   /* ≤480px 单栏触屏优化 */
```

布局切换通过 `screen_resize()` 函数控制面板 `hidden` class，不涉及路由跳转。每个面板的可见性通过 Zustand store 追踪：

```typescript
// src/stores/layout.ts
interface LayoutStore {
  visiblePane: 'sidebar' | 'list' | 'content';
  previousPane: 'sidebar' | 'list' | 'content';
  screenMode: 'phone' | 'small' | 'normal' | 'large';
  showSidebar: () => void;
  showList: () => void;
  showContent: () => void;
  back: () => void; // 返回上一个面板
}
```

### 5.3 任务切换（顶部导航）

Roundcube 的顶级导航称为 **tasks**，始终固定在页面顶部：

```
┌─ Logo ────┬─ Mail ─┬─ Contacts ─┬─ Settings ─┬─ Logout ─┐
            │        │             │
            │  当前选中任务 (高亮)   │
```

每个任务对应一套独立的三栏布局。React 中实现为：

```tsx
<Routes>
  <Route path="/" element={<AppLayout />}>
    <Route path="mail/*" element={<MailLayout />}>          ← 三栏
    <Route path="contacts/*" element={<ContactsLayout />}>  ← 两栏
    <Route path="settings/*" element={<SettingsLayout />}>  ← 两栏
  </Route>
  <Route path="/login" element={<LoginPage />} />
</Routes>
```

**任务切换行为**：
- 点击顶部导航按钮 → 切换整套布局（面板 state 独立）
- 当前任务在导航栏高亮
- 每个任务记住自己的上次面板状态

---

### 5.4 页面级 UI 规范

#### 5.4.1 登录页（`/login`）

Roundcube 登录页设计。居中卡片，简洁干净：

```
┌─────────────────────────────────────┐
│                                     │
│             [Logo]                  │
│            Minimail                  │
│                                     │
│  ┌─────────────────────────────┐    │
│  │  user@example.com          │    │
│  │  Password                   │    │
│  │                             │    │
│  │  ◉ 记住用户名  ◉ 自动登录   │    │
│  │                             │    │
│  │  [      登录      ]         │    │
│  └─────────────────────────────┘    │
│                                     │
│  语言: [中文 ▼]                     │
│                                     │
│  © 2026 Minimail                    │
└─────────────────────────────────────┘
```

**规范**：
- 单栏居中布局，最大宽度 400px
- Logo + 产品名在上方
- 登录框浅色背景卡片（带圆角 + 阴影）
- 语言选择器在页脚
- 错误消息红色 Alert 显示在登录框上方

---

#### 5.4.2 邮件主视图（`/mail`）— 核心界面

精确还原 Roundcube Elastic 的三栏布局。这是用户最常用的界面。

**大屏模式（>1200px）**：
```
┌─────────────────────────────────────────────────────────────────┐
│ [☰]  Minimail           [📧 Mail] [👤 Contacts] [⚙ Settings]    │
├────────────┬──────────────────────┬──────────────────────────────┤
│  INBOX  230 │  ★ Subject     From     Date    Size │ 发件人: 张三  │
│  Sent    12 │  ─────────────────────────────────── │  to: me       │
│  Drafts   3 │  › Q3预算审批… 张伟   07/06  12KB  ★ │               │
│  Archived   │  › 会议纪要      李芳   07/05  34KB    │ 主题: Q3预算审 │
│  Spam    5  │  › 周报          王强   07/04  8KB     │               │
│  Trash      │  › 客户反馈     陈晨   07/03  22KB  📎 │ 正文内容...  │
│             │  [─────────────── 20/230 ───────────] │               │
│  已用 2.3G  │  [< 1  2  3 ... 12 >]                │ [附件]        │
│  总容量 5G  │                                        │               │
│  [██████    ]│                                        │               │
├────────────┴──────────────────────┴──────────────────────────────┤
│  状态栏: 连接正常 | 最后同步: 1分钟前                              │
└─────────────────────────────────────────────────────────────────┘
```

**关键交互规范**：

| 元素 | 行为 | 参考 Roundcube |
|------|------|---------------|
| 文件夹树 | 展开/折叠子目录；点击切换当前文件夹；右键菜单 | `treelist listing folderlist` |
| 文件夹未读数 | 右侧彩色徽标 | `unreadwrap="%s"` |
| 邮件列表 | 单击=预览加载；双击=全页打开；Shift多选 | `listing messagelist sortheader` |
| 排序表头 | 点击切换排序方向；箭头指示器 | |
| 星标列 | 点击切换；黄色★=已标记 | |
| 附件列 | 📎图标表示有附件 | |
| 预览窗格 | 邮件头+正文；iframe隔离渲染 | `#messagecontframe` |
| 刷新 | 重新同步当前文件夹 | `checkmail` 命令 |
| 搜索 | 立即搜索；展开高级面板 | `#mailsearchform` + `#searchmenu` |
| 分页 | 页码+每页条数 | `pagenav` |

**空状态**：
- 文件夹为空: "收件箱中没有邮件"
- 搜索无结果: "未找到匹配的邮件"
- 未选择邮件时预览窗格: 显示引导文字

**高级搜索面板**（展开式，参考 Roundcube `#searchmenu`）：
```
┌────── 搜索选项 ──────┐
│ ☑ 主题  ☑ 发件人     │
│ ☐ 收件人  ☑ 正文     │
│                      │
│ 类型: [所有邮件 ▼]   │
│ 日期: [一周内 ▼]    │
│ 范围: [当前文件夹 ▼] │
│                      │
│     [   搜索   ]      │
└──────────────────────┘
```

**React 组件树**：
```tsx
<MailLayout>
  <FolderSidebar>
    <FolderTree>
      <FolderNode name="INBOX" unread={230} />
      <FolderNode name="Sent" />
      <FolderNode name="Drafts" />
      <FolderNode name="Spam" unread={5} />
      <FolderNode name="Trash" />
    </FolderTree>
    <QuotaBar used={2.3} total={5} unit="GB" />
  </FolderSidebar>

  <MessageList>
    <ListHeader columns={['flag','subject','from','date','size']} />
    <SearchBar />
    <VirtualList itemHeight={48}>
      <MessageRow subject="..." from="..." date="..." />
    </VirtualList>
    <Pagination page={1} total={230} />
  </MessageList>

  <PreviewPane message={selectedMessage}>
    <MessageHeaders />
    <AttachmentList />
    <MessageBody />
    {!selectedMessage && <EmptyState />}
  </PreviewPane>
</MailLayout>
```

---

#### 5.4.3 邮件阅读页（全屏视图）

双击邮件列表进入全屏阅读：

```
┌──────────────────────────────────────────────────────────────┐
│  ← 返回  [✉] [↩] [↩全部] [↪] [🗑] [✦] [⋯]  │
├──────────────────────────────────────────────────────────────┤
│  发件人: 张伟 <zhangwei@company.com>     SPF ✅ DKIM ✅       │
│  收件人: me [展开]   日期: 2026-07-06 14:30                  │
│  主题: Q3 预算审批方案                                       │
│                                                              │
│  张总您好,                                                   │
│  附件是 Q3 预算审批方案，请查收。                             │
│  主要变更:                                                   │
│  - 研发预算增加 15%                                          │
│                                                              │
│  此致                                                        │
│  张伟                                                        │
│                                                              │
│  附件 (2): [📎 预算方案_v3.xlsx 245KB] [📎 会议纪要.pdf]    │
│                                          [全部下载 ▼]         │
└──────────────────────────────────────────────────────────────┘
```

---

#### 5.4.4 撰写邮件（`/compose`）

两栏布局，左侧编辑器 + 右侧附件选项栏：

```
┌──────────────────────────────────┬──────────────────────────────┐
│  [← 返回] [✉ 发送] [🗑 放弃]   │  ┌── 附件 ────────────────┐ │
├──────────────────────────────────┤  │ [添加附件]              │ │
│  发件人: [me@company.com ▼]     │  │ 📎 预算_v3 245KB [✕] │ │
│  收件人: [zhang@company.com]    │  └────────────────────────┘ │
│  Cc:    [___]                   │  ┌── 选项 ────────────────┐ │
│  Bcc:   [___]                   │  │ 优先级: [普通 ▼]       │ │
│  主题:  [Re: Q3 预算审批方案]    │  │ ☐ 请求阅读回执         │ │
│                                  │  │ ☐ 保存已发送           │ │
│  ┌─ 编辑器 (TipTap) ──────────┐ │  └────────────────────────┘ │
│  │  B I U S 字体 ▼  字号 ▼   │ │                              │
│  │────────────────────────────│ │                              │
│  │  张总您好,                 │ │                              │
│  │                            │ │                              │
│  │  > 附件是Q3预算审批方案...  │ │                              │
│  └────────────────────────────┘ │                              │
└──────────────────────────────────┴──────────────────────────────┘
```

**交互要点**：
- 发件人下拉 = 多身份切换
- 收件人自动完成（通讯录/历史）
- 附件拖拽上传 + 进度条
- 草稿自动保存（60s + 关闭时）
- 引用格式 > 标记
- 右侧面板小屏时隐藏

---

#### 5.4.5 通讯录（`/contacts`）

两栏布局（目录+列表 / 详情）：

```
├──────────────┬───────────────────────────────────────────────┤
│ [新建联系人] │  ┌── 联系人详情 ─────────────────────────┐   │
│              │  │  [👤] 张三    zhang@company.com       │   │
│  [个人地址簿] │  │  手机: +86 138 0000 1234            │   │
│   └─ 同事     │  │  公司: 有限公司 / 研发部            │   │
│   └─ 家人     │  │                                       │   │
│  [公司目录]   │  │  [编辑] [删除] [发送邮件]             │   │
│  [LDAP 查询]  │  └───────────────────────────────────────┘   │
│              │                                                │
│  搜索: [   ] │  张三  zhang@company.com                       │
│              │  张伟  zhangwei@company.com                     │
│  共 35 个联系人│                                                │
└──────────────┴───────────────────────────────────────────────┘
```

---

#### 5.4.6 设置页（`/settings`）

两栏布局（左侧分类，右侧配置表单）：

```
├───────────┬─────────────────────────────────────────────────┤
│  [用户界面]│  ┌── 用户界面 ───────────────────────────┐    │
│  [查看邮件]│  │  每页显示: [50 ▼]  排序: [日期 ▼]    │    │
│  [撰写]    │  │  布局: [宽屏三栏 ▼]  语言: [中文 ▼]  │    │
│  [通讯录]  │  │  主题: [☾ 暗色  ☀ 亮色]             │    │
│  [文件夹]  │  │                                        │    │
│  [身份]    │  │         [保存]                         │    │
│  [过滤规则]│  └────────────────────────────────────────┘    │
│  [Webhooks]│                                                │
└───────────┴─────────────────────────────────────────────────┘
```

---

#### 5.4.7 AI Agent 对话面板（新增）

内嵌在邮件主界面右侧的浮动面板：

```
┌───────── 主界面 ─────────┬─── AI 助手 ────┐
│                          │  [AI] 🤖      │
│   [文件夹] [邮件列表]    │               │
│                          │  AI: 找到了3封│
│                          │  相关邮件...  │
│                          │               │
│                          │  我: 帮我看一 │
│                          │  下附件内容   │
│                          │               │
│                          │  [输入消息...] │
│                          │  [发送]       │
├──────────────────────────┴───────────────┤
│  状态栏                                   │
└──────────────────────────────────────────┘
```

- 浮动面板，覆盖在内容区上方
- 宽度 380px，全视口高度
- 支持 Markdown 渲染、邮件对象引用
- 操作确认按钮在对话气泡内

### 5.5 设计 Token（Tailwind CSS 自定义主题）

```ts
// tailwind.config.ts
export default {
  theme: {
    extend: {
      colors: {
        primary: {    // Roundcube 蓝 #066da5
          DEFAULT: '#066da5',
          hover: '#05588a',
          light: '#e8f4fd',
        },
        sidebar: {
          bg: '#f5f6f7',
          hover: '#e9ecef',
          active: '#d0e2f3',
          text: '#333',
          unread: '#066da5',
        },
        list: {
          bg: '#fff',
          row: '#fff',
          rowAlt: '#fafafa',
          rowHover: '#edf3ff',
          rowSelected: '#c7dbff',
          border: '#e2e5e9',
        },
      },
      spacing: {
        'sidebar': '250px',
        'list-md': '350px',
        'list-lg': '400px',
        'agent-panel': '380px',
      },
      boxShadow: {
        'card': '0 1px 3px rgba(0,0,0,0.08)',
        'popover': '0 4px 12px rgba(0,0,0,0.15)',
      },
    }
  }
}
```

### 5.6 UI 组件对应表

| Roundcube 元素 | 本项目 React 组件 | 说明 |
|---------------|-------------------|------|
| `#layout-sidebar` | `<FolderSidebar>` | 文件夹树 + 配额 |
| `treelist listing folderlist` | `<FolderTree>` + `<FolderNode>` | 树形可折叠文件夹 |
| `#messagelist` | `<MessageList>` + `<VirtualList>` | 虚拟滚动邮件列表 |
| `sortheader` | `<ListHeader>` | 可点击排序表头 |
| `#mailsearchform + #searchmenu` | `<SearchBar>` + `<AdvancedSearch>` | 展开式高级搜索 |
| `#pagenav` | `<Pagination>` | 分页控件 |
| `#messagecontframe` | `<MessageBody>` / `<PreviewPane>` | 邮件正文渲染 |
| `addresslist listing` | `<ContactList>` | 联系人列表 |
| `#directorylist` | `<ContactGroupSidebar>` | 通讯录分组 |
| `task-menu` | `<TopNav>` | 任务切换导航 |
| `.popupmenu` | `<DropdownMenu>` + `<Popover>` | 弹出菜单 |
| `quotadisplay` | `<QuotaBar>` | 邮箱用量进度条 |

### 5.7 从 Roundcube 迁移到本项目的差异

| 方面 | Roundcube (PHP+jQuery) | 本项目 (React) |
|------|----------------------|---------------|
| 布局切换 | 直接 DOM 操作 | Zustand layout store |
| 邮件列表 | jQuery 插件操作 `<table>` | `<VirtualList>` 只渲染可见行 |
| 邮件预览 | `<iframe>` 加载 PHP 页面 | 可选 iframe 或组件内渲染 |
| 搜索 | 服务端搜索 + 客户端刷新 | API 搜索 + 即时过滤 |
| 拖拽 | jQuery UI | `dnd-kit` |
| 主题 | LESS 变量 | Tailwind CSS + `dark:` class |
| 国际化 | PHP 翻译 | `react-intl` |
| 模板 | `roundcube:object` 标签 | JSX 组件 |

---

## 三、完整开发计划 (Phase 0-9)

### Phase 0 — 项目基建 (Week 1)

```
▢ 项目初始化
  ├── 仓库结构:
  │   webmail/
  │   ├── backend/          # FastAPI 后端
  │   ├── frontend/         # React + TypeScript
  │   ├── docker/           # Docker/Compose
  │   └── docs/             # 文档
  ├── Python: FastAPI, uvicorn, sqlalchemy, asyncpg, aiosmtplib, mailparser
  ├── 前端: Vite + React + shadcn/ui + Tailwind + Zustand
  ├── Docker: PostgreSQL + Redis
  └── CI: GitHub Actions (lint + test + build)

▢ 数据库 Schema
  ├── users (id, email, password_hash, name, quota)
  ├── identities (id, user_id, name, email, signature)
  ├── contacts / contact_groups / contact_group_members
  ├── settings (id, user_id, key, value)
  ├── cache / attachments
  └── agent_webhooks / agent_workflows (预留给 Phase 9)

▢ 配置系统
  ├── config.yaml ← Pydantic Settings
  ├── 数据库 URL, IMAP/SMTP 默认, 上传限制
  ├── LLM API 配置 (OpenAI / 自部署 端点)
  └── pgvector 初始化
```

**里程碑**: Docker 环境跑起来，API 返回 "hello world"

---

### Phase 1 — 用户认证 & IMAP 连接 (Week 2)

```
▢ 用户模块
  ├── 注册 / 登录 (JWT, access + refresh token)
  ├── IMAP 账号配置 (host, port, ssl, username, password)
  ├── 连接池管理 (每个用户一个 IMAP 连接, Redis 会话)
  └── OAuth Device Flow (预留给 Agent 接入)

▢ IMAP 协议层
  ├── imap_client.py — 封装 imaplib (异步)
  │   ├── connect(), login(), list_folders()
  │   ├── select_folder(), search(criteria)
  │   ├── fetch(uid_list, parts), store(uid, flags)
  │   ├── copy(uid, folder), delete(uid)
  │   └── idle() — IMAP IDLE 实时推送
  ├── imap_pool.py — 用户级连接池
  └── imap_cache.py — 邮件头缓存 (Redis)

▢ SMTP 发送层
  ├── smtp_client.py
  │   ├── send(from_addr, to_addrs, message)
  │   └── send_raw(raw_message)
  └── 草稿保存 (本地 DB)
```

**里程碑**: 用户登录后能看到邮箱文件夹列表

---

### Phase 2 — 邮件浏览 & 操作 (Week 3-4)

```
▢ 邮件列表 API
  ├── GET /api/mail/folders             → 文件夹树
  ├── GET /api/mail/folders/{id}        → 文件夹详情
  ├── GET /api/mail/messages            → 邮件列表 (分页/排序)
  │   ?folder=INBOX&page=1&page_size=50&sort=date&order=desc
  ├── GET /api/mail/thread/{uid}        → 会话线程分组
  └── GET /api/mail/search?q=xxx&from=yyy&date=zzz

▢ 邮件阅读
  ├── GET /api/mail/messages/{uid}      → 完整邮件
  │   ?parts=all|headers|body|attachments
  ├── MIME 解析引擎
  │   ├── parse_headers()    → From, To, Subject, Date, Message-ID...
  │   ├── parse_body()       → plain text + HTML alternative
  │   ├── parse_attachments()→ 附件提取
  │   └── decode_transfer()  → Base64 / QP / 7bit / 8bit
  ├── HTML 净化
  │   ├── DOMPurify + 白名单标签过滤
  │   ├── script/iframe 移除
  │   └── 图片代理 (避免跟踪像素)
  └── 邮件头安全分析 (SPF/DKIM/DMARC)

▢ 邮件操作
  ├── POST /api/mail/messages/batch     → 批量操作
  │   {action: "move|delete|read|flag|star", uids: [...]}
  ├── POST /api/mail/messages/{uid}/move
  ├── DELETE /api/mail/messages/{uid}
  └── POST /api/mail/messages/{uid}/flag
```

**里程碑**: 可浏览收件箱，阅读邮件，标记已读/星标/删除

---

### Phase 3 — 撰写 & 发送 (Week 5)

```
▢ 邮件撰写
  ├── 新建 / 回复 / 回复全部 / 转发
  ├── HTML 编辑器 (Trix 或 TipTap)
  ├── 附件上传 (分片上传, 进度条)
  ├── 自动保存草稿 (定时 + 关闭前)
  └── 通讯录自动完成 (收件人输入)

▢ 发送引擎
  ├── POST /api/mail/send
  │   ├── 构建 MIME 消息 (multipart/alternative)
  │   ├── 内嵌图片处理 (cid:)
  │   ├── 附件编码 (Base64)
  │   └── SMTP 发送 + 错误处理
  └── 已发送保存 (IMAP APPEND)

▢ 引用格式
  ├── 回复: 原文 > 引用, 逐段缩进
  ├── 转发: 完整原文
  └── 签名: 多身份切换
```

**里程碑**: 可以收发邮件，附件可用

---

### Phase 4 — 通讯录 (Week 6)

```
▢ 联系人管理
  ├── CRUD: GET/POST/PUT/DELETE /api/contacts
  ├── 群组: 联系人分组管理
  ├── 导入/导出: vCard 3.0/4.0, CSV
  └── LDAP 集成: 读远程 LDAP 目录

▢ 增强功能
  ├── 最近联系人 (自动收集)
  ├── 头像显示 (Gravatar)
  ├── 合并重复联系人
  └── 实时模糊搜索
```

**里程碑**: 完整通讯录

---

### Phase 5 — 设置 & 个性化 (Week 7)

```
▢ 用户设置
  ├── 显示偏好: 每页条数, 预览窗格, 主题
  ├── 身份管理: 多邮箱身份 + 签名
  ├── 回复设置: 引用格式, 回复位置
  └── 通知: 新邮件推送 (SSE)

▢ 多语言
  ├── i18n (react-intl), 从 Roundcube 导入语言包
  └── RTL 布局支持

▢ 主题
  ├── 亮色 / 暗色模式 (Tailwind dark:) 
  ├── 自定义主题色
  └── 响应式三断点 (桌面/平板/手机)
```

**里程碑**: 可个性化配置

---

### Phase 6 — 高级功能 (Week 8-10)

```
▢ 邮件过滤 (Sieve)
  ├── 可视化规则编辑器
  ├── POST /api/sieve/rules CRUD
  └── 自动归档 / 自动标记

▢ 安全与加密
  ├── PGP 加密 (OpenPGP.js + python-gnupg)
  ├── 钓鱼检测 (URL 分析 + 发件人伪造检测)
  └── 远程图片拦截

▢ 搜索增强
  ├── IMAP SEARCH (RFC 3501)
  ├── 全文索引 (Elasticsearch 可选)
  └── 高级搜索: 日期范围, 附件类型, 大小

▢ 性能优化
  ├── IMAP 头缓存 (Redis)
  ├── 虚拟列表 (10 万+ 邮件)
  └── 后台同步
```

**里程碑**: 达到 Roundcube 功能对等

---

### Phase 7 — 插件系统 (Week 11)

```
▢ 插件框架
  ├── Plugin 基类 + 事件钩子注册表
  ├── 自动扫描 plugins/*/
  └── 插件配置: WEBMAIL_PLUGINS env

▢ 首批插件 (移植 Roundcube 核心)
  ├── archive       — 自动归档
  ├── markasjunk    — 垃圾邮件标记
  ├── managesieve   — 过滤规则
  ├── enigma        — PGP 加密
  ├── password      — 密码修改
  └── zipdownload   — 批量附件下载
```

**里程碑**: 插件架构可用

---

### Phase 8 — 部署 & 运维 (Week 12)

```
▢ Docker Compose 生产配置
  ├── webmail-api (FastAPI + Uvicorn)
  ├── webmail-frontend (Nginx + React SPA)
  ├── postgres (主数据库 + pgvector)
  ├── redis (缓存 + 会话)
  └── nginx (反向代理 + SSL + Let's Encrypt)

▢ CI/CD
  ├── GitHub Actions: test, lint, build, docker
  └── Helm Chart (K8s 可选)

▢ 监控
  ├── /health, /ready
  ├── Prometheus + Grafana (IMAP 连接数, 延迟, 错误率)
  └── 邮件发送成功率

▢ 文档
  ├── INSTALL.md, UPGRADE.md
  ├── 插件开发指南
  └── OpenAPI/Swagger
```

**里程碑**: 生产就绪

---

### Phase 9 — AI Agent 集成 (Week 13-16)

这是本系统超出 Roundcube 的核心差异化能力。将邮件系统从"用户手动操作"升级为"AI Agent 可编程、可对话、可自动化"的基础设施。

#### 9.1 架构：双通道 Agent 接入

```
┌──────────────────────────────────────────────────────┐
│                   AI Agent 生态                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐  │
│  │OpenAI    │ │ LangChain│ │ CrewAI   │ │ 自定义  │  │
│  │Assistants│ │ Agent    │ │ Agent    │ │ Agent  │  │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └───┬────┘  │
│       │            │            │            │        │
└───────┼────────────┼────────────┼────────────┼────────┘
        │            │            │            │
   ┌────▼────────────▼────────────▼────────────▼─────┐
   │              接入层 (Agent Gateway)               │
   │  ┌────────────────┐ ┌────────────────────────┐  │
   │  │ MCP Server     │ │ OpenAI Tool API        │  │
   │  │ (Model Context │ │ (Function Calling)     │  │
   │  │  Protocol)     │ │                        │  │
   │  └────────┬───────┘ └───────────┬────────────┘  │
   │           │                     │                │
   │  ┌────────▼─────────────────────▼────────────┐  │
   │  │          Agent 服务层                      │  │
   │  │  MailAgentService | ContactAgentService   │  │
   │  └────────────────┬─────────────────────────┘  │
   └───────────────────┼─────────────────────────────┘
                       │
  ┌────────────────────▼──────────────────────────────┐
  │              Minimail Core API                      │
  │  /api/mail/*  /api/contacts/*  /api/settings/*    │
  └────────────────────────────────────────────────────┘
```

#### 9.2 MCP Server (Model Context Protocol)

MCP 是让 LLM 直接操作邮件系统的标准接口，每个邮件操作为一个 Tool：

```python
# backend/agent/mcp_server.py

class MailMCPTools:

    @mcp.tool()
    async def search_emails(query, folder="INBOX", max_results=20,
                            date_from=None, date_to=None) -> list[dict]:
        """按关键词搜索邮件，支持日期过滤."""

    @mcp.tool()
    async def read_email(uid, folder="INBOX") -> dict:
        """读取完整邮件内容 (含附件列表)."""

    @mcp.tool()
    async def send_email(to, subject, body, cc=None, bcc=None,
                         priority="normal") -> dict:
        """发送邮件. body 支持 Markdown (自动转 HTML)."""

    @mcp.tool()
    async def draft_reply(original_uid, style="professional",
                          include_original=True) -> dict:
        """AI 自动生成回复草稿."""

    @mcp.tool()
    async def list_folders() -> list[dict]:
        """列出所有文件夹及未读数."""

    @mcp.tool()
    async def manage_filters(action, rule=None) -> list[dict]:
        """管理邮件过滤规则."""

    @mcp.tool()
    async def search_contacts(query) -> list[dict]:
        """搜索联系人."""

    @mcp.tool()
    async def get_email_thread(uid) -> list[dict]:
        """获取整个邮件会话线程."""
```

#### 9.3 OpenAI Function Calling 兼容

同时暴露 OpenAI 格式的 Tool 定义，让任何支持 Function Calling 的 Agent 直接使用：

```python
MAIL_TOOLS_OPENAI = [
    {
        "type": "function",
        "function": {
            "name": "search_emails",
            "description": "搜索邮件",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string"},
                    "folder": {"type": "string", "enum": ["INBOX","SENT","DRAFTS","TRASH","SPAM"]},
                    "max_results": {"type": "integer", "default": 20},
                    "date_from": {"type": "string", "format": "date"},
                },
                "required": ["query"]
            }
        }
    },
    # ... read_email, send_email, summarize_thread, classify_emails,
    #     get_unread_summary, auto_reply, manage_contacts, draft_reply
    #     共计 12+ 个 Tool
]
```

#### 9.4 事件驱动 Agent (Webhook + SSE)

系统不是被动 API，而是主动推送事件：

| 事件类型 | 说明 |
|---------|------|
| `mail.received` | 新邮件到达 |
| `mail.sent` | 邮件已发送 |
| `mail.classified` | AI 分类完成 |
| `contact.added` | 联系人新增 |
| `filter.triggered` | 过滤规则匹配 |
| `quota.warning` | 容量告警 |
| `agent.action` | Agent 执行操作 |

用户可配置 Webhook（HMAC 签名），将事件推送到外部 Agent 服务。

#### 9.5 Agent 自动工作流引擎

预置的场景化自动工作流：

```
urgent_reply:      high_priority邮件 → AI分类 → AI草拟回复 → 确认发送
daily_digest:      定时 → 聚合未读 → AI摘要 → 发报告
travel_notice:     机票/酒店邮件 → 提取行程 → 加入日历 → 通知
spam_learning:     移入垃圾箱 → 触发贝叶斯训练
contact_sync:      邮件往来高频 → 自动建议添加联系人
out_of_office:     识别 → 自动回复"不在办公室"
```

每个工作流：`事件/定时 → 条件判断 → 多步执行 → 通知/等待批准`

#### 9.6 AI 增强的智能功能

```
┌─ 内置 AI 服务 (给用户, 也给 Agent) ──────────────────────┐

  summarize_thread(uid)      → 邮件线程摘要 + 待办 + 决策
  classify_email(msg)        → 工作/个人/推广/通知/账单
  detect_priority(msg)       → 紧急程度判断
  suggest_folders(msg)       → 建议归档文件夹
  extract_action_items(msg)  → 提取任务 + 截止日期
  detect_phishing(msg)       → 钓鱼检测
  smart_reply_suggestions()  → 3条候选回复
  auto_tag(msg)              → 自动打标签
  generate_digest()          → 每日邮件摘要
  find_related_emails()      → 语义关联邮件搜索
```

#### 9.7 语义搜索 (向量化 + pgvector)

```
新邮件到达 → embedding(标题+正文) → 存入 pgvector
用户搜索时 → embedding(查询) → 语义匹配 → 返回结果

例子: "上个月关于预算审批的邮件"
  → 即使原文没有"预算审批"这四个字, 也能通过语义匹配找到
```

#### 9.8 Agent 认证与权限

```
OAuth 2.0 Device Flow → 用户扫码授权 Agent
或 API Key → 限定 Scope (mail:read, mail:send, contacts:write, ...)
或 JWT → 子用户 Token

每个 Agent 操作都验权:
  mail:read     → search_emails, read_email, list_folders
  mail:send     → send_email, draft_reply, auto_reply
  mail:delete   → delete_email
  contacts:read → search_contacts
  contacts:write→ create/update/delete_contact
```

#### 9.9 对话式邮件操作

用户不再需要手动操作，直接和 AI 对话：

```
用户: "帮我查一下上周张总发的关于预算的邮件"
Agent: (调用 semantic_search + read_email)
      "找到了3封相关邮件: ... 需要我读哪一封?"

用户: "读第3封, 然后帮我回一封确认收到"
Agent: (调用 read_email + draft_reply)
      "回复草稿已生成, 确认发送?"

用户: "发吧"
Agent: (调用 send_email)
      "已发送!"
```

实现：`POST /api/agent/chat` + SSE 流式响应

#### 9.10 API 端点 (Agent 管理)

```
# Agent 配置
GET    /api/agent/tools                → 工具列表 (MCP + OpenAI 双格式)
POST   /api/agent/webhooks             → 注册 Webhook
DELETE /api/agent/webhooks/{id}

# 工作流
GET    /api/agent/workflows            → 工作流列表
POST   /api/agent/workflows            → 创建工作流
PUT    /api/agent/workflows/{id}
DELETE /api/agent/workflows/{id}

# 对话
POST   /api/agent/chat                 → 自然语言操作
POST   /api/agent/chat/send            → 确认发送
POST   /api/agent/chat/cancel          → 取消

# AI 增强
POST   /api/mail/messages/{uid}/summarize
POST   /api/mail/messages/{uid}/classify
POST   /api/mail/messages/{uid}/action-items
POST   /api/mail/messages/{uid}/smart-reply
GET    /api/mail/semantic-search?q=xxx

# 事件
GET    /api/agent/events/stream        → SSE 事件流
```

#### 9.11 开发子阶段 (AI Agent 部分)

| 子阶段 | 内容 | 依赖 |
|--------|------|------|
| **9a** | MCP Server + OpenAI Tool definitions | Core API (Phase 0-3) |
| **9b** | 语义邮件搜索 (pgvector) | Phase 2 邮件索引 |
| **9c** | AI 智能增强 (分类/总结/回复) | LLM API 集成 |
| **9d** | 事件总线 + Webhook 系统 | Phase 9a |
| **9e** | Agent 工作流引擎 | Phase 9a + 9d |
| **9f** | OAuth Device Flow + 权限模型 | Phase 1 用户认证 |
| **9g** | 对话式邮件操作界面 (前端 Chat UI) | Phase 9a-9f |

---

## 四、完整目录结构

```
webmail/
├── backend/
│   ├── app/
│   │   ├── main.py                  # FastAPI 入口
│   │   ├── config.py                # Pydantic Settings
│   │   ├── database.py              # SQLAlchemy 引擎
│   │   ├── models/                  # ORM 模型
│   │   ├── schemas/                 # Pydantic 请求/响应
│   │   ├── api/                     # 路由
│   │   │   ├── auth.py
│   │   │   ├── mail.py
│   │   │   ├── contacts.py
│   │   │   ├── settings.py
│   │   │   ├── sieve.py
│   │   │   └── agent.py             # Agent 对话接口
│   │   ├── services/                # 业务逻辑
│   │   │   ├── imap_service.py
│   │   │   ├── smtp_service.py
│   │   │   ├── mime_parser.py
│   │   │   ├── sieve_service.py
│   │   │   ├── ai_service.py        # AI 增强
│   │   │   ├── embedding_service.py # 向量化
│   │   │   └── semantic_search.py   # 语义搜索
│   │   ├── agent/                   # AI Agent 层 [Phase 9]
│   │   │   ├── mcp_server.py        # MCP 协议
│   │   │   ├── openai_tools.py      # OpenAI Tool
│   │   │   ├── tools/               # 工具实现
│   │   │   ├── events.py            # 事件总线
│   │   │   ├── webhooks.py          # Webhook 调度
│   │   │   ├── workflows.py         # 工作流引擎
│   │   │   ├── triggers.py          # 触发器
│   │   │   ├── auth.py              # Agent OAuth
│   │   │   └── chat.py              # 对话接口
│   │   ├── imap/                    # IMAP 协议
│   │   ├── plugins/                 # 插件系统
│   │   └── utils/
│   ├── tests/
│   ├── alembic/
│   ├── requirements.txt
│   └── Dockerfile
│
├── frontend/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── api/
│   │   ├── components/
│   │   ├── features/
│   │   │   └── mail/
│   │   │   └── contacts/
│   │   │   └── settings/
│   │   │   └── agent-chat/          # Agent 对话 UI [Phase 9g]
│   │   │       ├── ChatPanel.tsx
│   │   │       ├── MessageBubble.tsx
│   │   │       ├── ToolCallCard.tsx
│   │   │       └── ApprovalDialog.tsx
│   │   ├── stores/                  # Zustand
│   │   └── i18n/
│   ├── package.json
│   └── Dockerfile
│
├── docker/
│   ├── docker-compose.yml
│   └── nginx.conf
├── docs/
└── README.md
```

---

## 五、数据库表设计 (含 Agent 相关)

```sql
-- ============================================================
-- 核心表
-- ============================================================

CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           TEXT UNIQUE NOT NULL,
    password_hash   TEXT NOT NULL,
    name            TEXT NOT NULL,
    language        TEXT DEFAULT 'zh_CN',
    theme           TEXT DEFAULT 'light',
    quota_mb        INTEGER DEFAULT 0,
    -- IMAP 配置 (加密存储)
    imap_host       TEXT, imap_port INTEGER DEFAULT 993,
    imap_ssl        BOOLEAN DEFAULT TRUE,
    imap_username   TEXT, imap_password     TEXT,
    -- SMTP 配置 (加密存储)
    smtp_host       TEXT, smtp_port INTEGER DEFAULT 465,
    smtp_ssl        BOOLEAN DEFAULT TRUE,
    smtp_username   TEXT, smtp_password     TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Agent 相关表 (Phase 9)
-- ============================================================

-- Webhook 注册
CREATE TABLE agent_webhooks (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
    url             TEXT NOT NULL,
    secret          TEXT NOT NULL,               -- HMAC 签名密钥
    enabled         BOOLEAN DEFAULT TRUE,
    events          TEXT[] NOT NULL,              -- ['mail.received', 'mail.sent']
    filters         JSONB DEFAULT '{}',          -- 过滤条件
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Agent 工作流
CREATE TABLE agent_workflows (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    enabled         BOOLEAN DEFAULT TRUE,
    trigger_type    TEXT NOT NULL,                -- 'event' | 'cron'
    trigger_config  JSONB NOT NULL,              -- 事件配置 / cron 表达式
    condition       TEXT,                        -- 条件表达式 (可选)
    actions         JSONB NOT NULL,              -- 动作数组
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Agent 操作日志 (审计)
CREATE TABLE agent_audit_log (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
    action          TEXT NOT NULL,                -- 'send_email', 'delete_email'
    tool_name       TEXT NOT NULL,
    input           JSONB,
    output          JSONB,
    approved_by     TEXT,                        -- 'auto' | 'user'
    ip_address      INET,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- API Key (Agent 认证)
CREATE TABLE agent_api_keys (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,               -- 标识用途
    key_hash        TEXT NOT NULL,               -- 哈希存储
    scopes          TEXT[] NOT NULL,             -- ['mail:read', 'mail:send']
    expires_at      TIMESTAMPTZ,
    last_used_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 邮件向量索引 (pgvector)
CREATE TABLE message_embeddings (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
    folder          TEXT NOT NULL,
    uid             INTEGER NOT NULL,
    subject         TEXT,
    from_addr       TEXT,
    date            TIMESTAMPTZ,
    embedding       VECTOR(1536),                -- OpenAI ada-002
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, folder, uid)
);
CREATE INDEX ON message_embeddings USING ivfflat (embedding vector_cosine_ops);
```

---

## 六、核心 API 设计规范

```
# ─── 认证 ───
POST   /api/auth/login            → {access_token, refresh_token}
POST   /api/auth/refresh          → {access_token}
POST   /api/auth/logout

# ─── 邮件 ───
GET    /api/mail/folders
GET    /api/mail/messages         ?folder=INBOX&page=1&page_size=50
GET    /api/mail/messages/{uid}   ?parts=headers|body|attachments|all
POST   /api/mail/send
POST   /api/mail/messages/batch   {action: "move|delete|read|flag", uids: [...]}

# ─── 通讯录 ───
GET    /api/contacts
POST   /api/contacts
PUT    /api/contacts/{id}
DELETE /api/contacts/{id}
POST   /api/contacts/import
GET    /api/contacts/export

# ─── 设置 ───
GET    /api/settings
PUT    /api/settings
GET    /api/identities
POST   /api/identities

# ─── AI Agent ───
GET    /api/agent/tools
POST   /api/agent/webhooks
DELETE /api/agent/webhooks/{id}
GET    /api/agent/workflows
POST   /api/agent/workflows
POST   /api/agent/chat                  # 对话式操作
POST   /api/mail/messages/{uid}/summarize
POST   /api/mail/messages/{uid}/classify
POST   /api/mail/messages/{uid}/smart-reply
GET    /api/mail/semantic-search        ?q=xxx
```

---

## 七、技术难点与风险

| 难点 | 说明 | 方案 |
|------|------|------|
| **IMAP 空闲通知** | 实时推送新邮件 | IMAP IDLE + asyncio + SSE |
| **MIME 解码** | 各种编码格式 (Base64, QP, 7bit) | mailparser 库 + 回归测试 |
| **HTML 安全** | 邮件内恶意脚本 | DOMPurify + CSP + 图片代理 |
| **大附件** | 超大邮件解析性能 | 流式 MIME 解析, 附件懒加载 |
| **大量邮件** | 10 万+ 邮箱 | Redis 头缓存 + 虚拟滚动 |
| **连接池** | 每个用户独立 IMAP 连接 | 异步连接池 + 闲置断开 + 自动重连 |
| **LLM 成本** | AI 功能调用 API 费用 | 缓存 + 模型分级 (本地 vs API) |
| **Agent 安全** | Agent 误操作 / 越权 | 细粒度 Scope + 审批流 + 审计日志 |

---

## 八、测试策略

```
测试金字塔:
        ╱──── E2E ──────────  Playwright (浏览器自动化)
       ╱ ─── Integration ───  API 测试 (GreenMail IMAP mock)
      ╱ ──── Unit ──────────  业务逻辑 + MIME 解析 + Agent Tool

工具:
  后端: pytest + pytest-asyncio + fakeredis + GreenMail
  前端: Vitest + React Testing Library + Playwright
  IMAP mock: GreenMail (嵌入式 IMAP/SMTP 服务器)
  AI mock: pytest-mock (mock LLM API 调用)
  Agent: 端到端 Tool 测试 (mock LLM → 验证 IMAP 操作结果)
```

---

## 九、与 Roundcube 的对比优势

| 方面 | Roundcube | 本项目 |
|------|-----------|--------|
| **前端** | jQuery + 原生 JS | React + TypeScript + 虚拟列表 |
| **API** | PHP 直接输出 HTML | RESTful API + SPA |
| **AI 能力** | 无 | **MCP + Function Calling + 语义搜索 + 工作流** |
| **Agent 集成** | 无 | **Webhook + SSE + 对话式操作 + 12+ Agent Tools** |
| **向量搜索** | 无 | **pgvector 语义搜索** |
| **实时推送** | 轮询 | SSE + WebSocket |
| **性能** | 服务端渲染慢 | API 缓存 + 前端渲染 |
| **部署** | PHP + Apache 手动配置 | Docker Compose 一键部署 |
| **扩展** | PHP Hook | Python 插件 + dual 协议 (MCP + OpenAI) |
| **安全** | 手动 XSS 过滤 | CSP + DOMPurify + 图片代理 + Agent 审计日志 |
| **测试** | 有限 | pytest + Playwright E2E + Agent Tool E2E |

---

## 十、时间线总结

| 周 | Phase | 产出 |
|----|-------|------|
| 1 | Phase 0 基建 | Docker 环境, 数据库, CI |
| 2 | Phase 1 认证+IMAP | 用户登录, 文件夹列表 |
| 3-4 | Phase 2 邮件浏览 | 邮件列表/阅读/操作 |
| 5 | Phase 3 撰写发送 | 收发邮件 |
| 6 | Phase 4 通讯录 | 联系人管理 |
| 7 | Phase 5 个性化 | 设置/多语言/主题 |
| 8-10 | Phase 6 高级功能 | Sieve/PGP/搜索/性能 |
| 11 | Phase 7 插件系统 | 插件框架 + 6 个内置插件 |
| 12 | Phase 8 部署 | Docker Compose 生产就绪 |
| 13-14 | Phase 9a-9c MCP+语义+AI | Agent 基础 + 智能增强 |
| 15 | Phase 9d-9e 事件+工作流 | Webhook + 自动工作流 |
| 16 | Phase 9f-9g 权限+对话UI | OAuth + 对话界面 |

**总计: 16 周 (4 个月)**

前 8 周达到 Roundcube 功能对等，后 4 周建立 AI Agent 基础设施，最后 4 周打磨 Agent 体验与安全。
