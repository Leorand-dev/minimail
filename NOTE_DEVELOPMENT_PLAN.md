# 笔记库 Note — 开发方案

> 英文名：**note** · 中文名：**笔记库**
> 基于 Memos (usememos/memos) 架构解构后的自实现方案

---

## 1. 项目背景

Minimail 当前是一套完整的 Web 邮件系统（FastAPI + React），现需扩展笔记功能，提供类似 Memos 的轻量 Markdown 笔记体验，并与邮件系统深度集成。

### 为什么要自实现而非直接部署 Memos

| 因素 | 直接部署 Memos sidecar | 自实现笔记模块 |
|------|------------------------|----------------|
| 技术栈 | Go + React → 跨语言维护 | Python + React → 统一栈 |
| 认证 | 需额外 SSO 桥接 | 复用 Minimail JWT |
| 数据库 | 需独立实例 | 复用 PostgreSQL |
| UI 一致性 | Radix + 不同设计语言 | Tailwind + 原生产品风格 |
| 集成深度 | iframe / API 对接 | 共享搜索/通讯录/路由 |
| 运维 | 多容器升级/备份/监控 | 单一部署单元 |

---

## 2. 功能规格

### 2.1 核心功能

| 功能 | 说明 | 优先级 |
|------|------|:------:|
| **笔记 CRUD** | 创建、阅读、编辑、删除笔记 | P0 |
| **Markdown 编辑** | 基于 TipTap 的 Markdown 编辑器，支持实时预览 | P0 |
| **时间线布局** | 按创建时间倒序排列，卡片式展示 | P0 |
| **AI Agent 笔记操作** | Agent 通过 API 进行笔记的创建/查询/搜索/摘要 | P0 |
| **AI 笔记索引** | 笔记内容向量化，Agent 可检索作为上下文 | P0 |
| **标签系统** | `#tag` 在 Markdown 中自动提取为标签，侧栏过滤 | P1 |
| **搜索** | 全文搜索笔记标题+内容 | P1 |
| **可见性控制** | Private / Public 两级可见性 | P1 |
| **置顶** | 重要笔记置顶到列表顶部 | P1 |
| **归档** | 软删除，可恢复 | P1 |

### 2.2 AI Agent 集成

Agent（Hermes / Claude Code / OpenAI Codex 等）是笔记库的**首要用户之一**。Agent 通过 API 直接操作笔记，实现日常记录、上下文记忆、知识索引等场景。

| Agent 场景 | 说明 | API |
|-----------|------|-----|
| **记录决策** | Agent 在工作过程中自动创建笔记记录技术决策 | `POST /api/notes` |
| **查询笔记** | Agent 读取已有笔记获取上下文 | `GET /api/notes/{id}` |
| **搜索知识** | Agent 全文搜索笔记库获取相关信息 | `GET /api/notes/search?q=` |
| **更新进展** | Agent 更新任务/进度笔记 | `PUT /api/notes/{id}` |
| **语义检索** | Agent 通过向量相似度检索最相关笔记 | `POST /api/notes/search/semantic` |
| **自动摘要** | Agent 从对话/邮件中提取要点写入笔记 | `POST /api/notes/from-context` |
| **标签管理** | Agent 整理和归档笔记标签 | `GET /api/notes/tags` |

**认证方式**：Agent 使用现有的 API Token（`Authorization: Bearer <token>`），与用户手动操作共享同一权限模型。

```bash
# Agent 创建笔记示例
curl -X POST https://minimail.dev/api/notes \
  -H "Authorization: Bearer <agent-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "# 2026-07-06 部署记录\n\n今天部署了 v0.12，包含:\n- IMAP 状态指示器\n- 富文本编辑器\n- 搜索增强",
    "visibility": "private",
    "tags": ["deploy", "v0.12"]
  }'

# Agent 语义搜索示例
curl -X POST https://minimail.dev/api/notes/search/semantic \
  -H "Authorization: Bearer <agent-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "IMAP 连接配置方法",
    "top_k": 5
  }'
```

### 2.3 索引与检索

笔记内容需要纳入 Agent 可检索的范围，方案分两个阶段：

**Phase A — 基础全文检索（P0）**
- 使用 PostgreSQL `tsvector` 全文索引
- `to_tsvector('chinese', content)` 支持中文分词
- Agent 通过 `GET /api/notes/search?q=` 检索

**Phase B — 语义检索（P1）**
- 接入 Minimail 后端 AI 推理端点（已有 `<llm-endpoint>`）
- 笔记内容经过 embedding 模型转为向量
- 使用 pgvector 扩展存储向量
- Agent 通过 `POST /api/notes/search/semantic` 执行相似度搜索

```
用户提问 → Agent 收到 → 语义搜索笔记库 → 找到相关笔记 → 作为上下文 → 生成回答
```

### 2.4 扩展功能

| 功能 | 说明 | 优先级 |
|------|------|:------:|
| **评论/线程** | 在笔记下嵌套评论（parent_id 实现） | P2 |
| **@提及** | 编辑器内 `@联系人`，支持通讯录完成 | P2 |
| **附件上传** | 拖拽图片/文件，自动附加到笔记 | P2 |
| **反应 (Reaction)** | Emoji 反应 | P2 |
| **快捷键 (Shortcut)** | 保存过滤条件为快捷侧栏入口 | P2 |
| **RSS Feed** | 公开笔记的 RSS 订阅 | P2 |

### 2.5 邮件集成特性

| 集成点 | 实现方式 |
|--------|----------|
| **邮件 → 笔记** | 预览面板操作菜单「转为笔记」，自动提取主题+正文 |
| **通讯录 → @提及** | 笔记编辑器内 `@` 触发联系人自动完成 |
| **统一搜索** | 顶部搜索框同时搜索邮件 + 笔记 |
| **API 密钥保护** | 笔记 API 同样受现有 API Token 认证保护 |

---

## 3. 技术架构

### 3.1 架构总览

```
┌──────────────────────────────────────────────────────────┐
│                  前端 React + TypeScript                   │
│  ┌─────────────┐  ┌──────────┐  ┌──────────────────────┐ │
│  │ MemosPage   │  │ Zustand  │  │ Components (Tailwind) │ │
│  │ (笔记主面板)  │  │ store    │  │ MemoList/MemoEditor/ │ │
│  │             │  │          │  │ MemoCard/MemoDetail   │ │
│  └─────────────┘  └──────────┘  └──────────────────────┘ │
│              axios /api/memos/*                           │
├──────────────────────────────────────────────────────────┤
│                  后端 Python FastAPI                       │
│  ┌──────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │ Auth JWT │  │ /api/memos   │  │ SQLAlchemy 2.0    │  │
│  │ (复用)   │  │ CRUD + 搜索   │  │ async + PostgreSQL│  │
│  └──────────┘  └──────────────┘  └───────────────────┘  │
├──────────────────────────────────────────────────────────┤
│                       PostgreSQL                          │
│  ┌──────────────┐  ┌──────────────┐                      │
│  │ memos 表     │  │ postgresql   │                      │
│  │ (笔记核心)    │  │ ARRAY(tags)  │                      │
│  └──────────────┘  └──────────────┘                      │
└──────────────────────────────────────────────────────────┘
```

### 3.2 技术选型

| 层 | 技术 | 理由 |
|----|------|------|
| **后端** | FastAPI + SQLAlchemy 2.0 async | 与现有栈一致 |
| **数据库** | PostgreSQL | 与现有实例一致 |
| **Markdown 渲染** | Python `markdown` + `bleach` (服务端) / `react-markdown` (客户端) | 双端渲染 |
| **编辑器** | TipTap (现有) → Markdown 模式 | 复用已有组件 |
| **搜索** | PostgreSQL `tsvector` 全文搜索 | 无需额外服务 |
| **状态管理** | Zustand (新增 memos store) | 与现有模式一致 |
| **UI** | Tailwind CSS 4 | 与现有风格一致 |

### 3.3 数据模型

```python
class Note(Base):
    """笔记核心表"""
    __tablename__ = "notes"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID, primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id"), nullable=False, index=True
    )
    content: Mapped[str] = mapped_column(Text, nullable=False)  # Markdown 源码
    # 可见性: private / public
    visibility: Mapped[str] = mapped_column(String(16), default="private")
    pinned: Mapped[bool] = mapped_column(default=False)
    # 评论/线程关联: parent_id 非空即为某笔记的评论
    parent_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("notes.id"), nullable=True
    )
    # 状态: active / archived
    row_status: Mapped[str] = mapped_column(String(16), default="active")
    # PostgreSQL 原生数组存储标签
    tags: Mapped[list[str]] = mapped_column(
        postgresql.ARRAY(String(64)), default=list
    )
    created_at: Mapped[datetime] = mapped_column(
        server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        server_default=func.now(), onupdate=func.now()
    )

    # 关系
    user: Mapped["User"] = relationship(back_populates="notes")
    reactions: Mapped[list["NoteReaction"]] = relationship(
        back_populates="note", cascade="all, delete-orphan"
    )
```

```python
class NoteTag(Base):
    """标签聚合表（可选，也可从 tags[] 列提取）"""
    __tablename__ = "note_tags"
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(64), nullable=False)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    note_count: Mapped[int] = mapped_column(default=0)
    __table_args__ = (UniqueConstraint("name", "user_id"),)
```

```python
class NoteReaction(Base):
    """表情反应"""
    __tablename__ = "note_reactions"
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    note_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("notes.id"))
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    emoji: Mapped[str] = mapped_column(String(32))
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    __table_args__ = (UniqueConstraint("note_id", "user_id", "emoji"),)
```

### 3.4 API 路由设计

```
笔记 CRUD
──────────────────────────────────────────────────────────
GET    /api/notes                列表 (分页 + 标签/可见性过滤)
POST   /api/notes                创建
GET    /api/notes/{id}           详情 (含评论)
PUT    /api/notes/{id}           更新 (content/visibility/pinned)
DELETE /api/notes/{id}           删除 (软删除 → row_status=archived)
POST   /api/notes/{id}/pin       切换置顶
POST   /api/notes/{id}/restore   恢复归档

标签
──────────────────────────────────────────────────────────
GET    /api/notes/tags           用户标签列表 (含计数)

反应
──────────────────────────────────────────────────────────
POST   /api/notes/{id}/reactions 添加/移除反应

搜索 (Agent 可用)
──────────────────────────────────────────────────────────
GET    /api/notes/search?q=      全文搜索 (tsvector)
POST   /api/notes/search/semantic  语义搜索 (pgvector, P1)

Agent 专用
──────────────────────────────────────────────────────────
POST   /api/notes/from-context    从对话/邮件提取内容创建笔记
```

### 3.5 分页设计

采用**游标分页**（cursor-based pagination），避免大偏移量的性能问题：

```
GET /api/notes?page_size=20&cursor=<last_created_at>
```

响应包含 `next_page_token` 用于翻页。

---

## 4. 前端组件设计

### 4.1 组件树

```
MemosPage                            ← 主面板 (替代 mail 视图)
├── MemoToolbar                      ← 顶部操作栏
│   ├── 搜索输入框                    ← 全文搜索笔记
│   ├── 标签过滤器                    ← 下拉选择标签
│   ├── 可见性过滤器                   ← 全部/私人/公开
│   └── 新建笔记按钮                  ← ✏️ 新建
├── MemoList                         ← 笔记列表
│   ├── MemoCard (for each)          ← 单条笔记卡片
│   │   ├── 用户头像 + 时间戳
│   │   ├── Markdown 渲染内容
│   │   ├── 标签列表 (chip)
│   │   ├── 操作菜单 (编辑/归档/置顶/删除)
│   │   └── 反应行
│   └── 加载更多                      ← 游标分页
└── MemoEditor (弹窗/侧栏)            ← 新建/编辑
    ├── TipTap Markdown 编辑器
    └── 可见性/标签输入
```

### 4.2 状态管理

新建 `frontend/src/stores/memos.ts`：

```typescript
interface MemosState {
  memos: Note[];
  notes: Note[];           // notes 别名, 二者同步
  tags: string[];
  activeTag: string | null;
  searchQuery: string;
  filterVisibility: string; // '' / 'private' / 'public'
  loading: boolean;
  cursor: string | null;
  hasMore: boolean;
  editingNote: Note | null; // null = 新建模式

  // Actions
  fetchNotes: () => Promise<void>;
  createNote: (content: string, visibility?: string) => Promise<void>;
  updateNote: (id: string, data: Partial<Note>) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  togglePin: (id: string) => Promise<void>;
  fetchTags: () => Promise<void>;
}
```

### 4.3 路由集成

在 `MailLayout` 的 `activeView` 枚举增加 `'memos'`：

```typescript
export type MailView = 'mail' | 'compose' | 'settings' | 'contacts' | 'apikeys' | 'profile' | 'docs' | 'memos';
```

侧栏新增入口：

```
📝 笔记库     ← 新增, 与 📥 统一收件箱 同级
```

笔记视图使用与邮件一致的 **55px Header**：

```
┌────────────────────────────────────────────────────────┐
│ 🅼 Minimail   ← 返回    笔记库           [🔍] [用户菜单] │ ← 55px
├────────────────────────────────────────────────────────┤
│ 📝 笔记库     全部 · 私人 · 公开    ✏️ 新建笔记          │
├────────────────────────────────────────────────────────┤
│ 📌 置顶笔记                                            │
│ ┌──────────────────────────────────────────────────┐  │
│ │ 📌 #架构设计 #笔记   昨天 14:30       📎 📷       │  │
│ │ 我们决定使用 PostgreSQL tsvector 做全文搜索...     │  │
│ │ 👍 3  💬 2                                        │  │
│ └──────────────────────────────────────────────────┘  │
│                                                       │
│ 普通笔记                                              │
│ ┌──────────────────────────────────────────────────┐  │
│ │ #快速记录                     刚刚                │  │
│ │ 今天部署了 Minimail v0.12...                      │  │
│ │ ℹ️ 私人                                             │  │
│ └──────────────────────────────────────────────────┘  │
│ ┌──────────────────────────────────────────────────┐  │
│ │ #工作             #tasks     07/05               │  │
│ │ 本周需要完成 Phase 2 的测试...                    │  │
│ │ 🌍 公开    👍 1                                    │  │
│ └──────────────────────────────────────────────────┘  │
│                                                       │
│ [加载更多]                                             │
└────────────────────────────────────────────────────────┘
```

---

## 5. 与邮件系统的集成点

### 5.1 邮件 → 笔记

**预览面板**增加「📝 转为笔记」按钮：

```
点击 → MemoEditor 弹窗
        - 主题自动填入笔记第一行 (# 标题)
        - 正文自动填入 Markdown 正文
        - 发件人/收件人自动转为 @联系人
        - 用户可编辑后保存
```

### 5.2 统一搜索

```
顶部搜索框 (当前仅搜索邮件)
         ↓
扩展为同时搜索「邮件 + 笔记」
         ↓
结果区分为两个 Tab: 📧 邮件 (N) | 📝 笔记 (M)
```

### 5.3 API 密钥共享

笔记 API 端点使用与邮件 API 相同的 `api_token` 认证中间件：

```
Authorization: Bearer <api-token>
→ 所有 /api/memos/* 路由
```

---

## 6. 实施计划

### Phase 1 — 数据库 + API 核心 (≈4h)

| 任务 | 产出 |
|------|------|
| 创建 `Note`、`NoteTag`、`NoteReaction` 模型 | `backend/app/models/memo.py` |
| Alembic 迁移脚本 | `migrations/versions/xxx_add_notes.py` |
| Pydantic schemas (NoteCreate/NoteUpdate/NoteResponse) | `backend/app/schemas/memo.py` |
| CRUD API 路由 | `backend/app/api/memos.py` |
| 列表: 分页 + 过滤 + 排序 | GET /api/notes |
| 全文搜索 (tsvector) | GET /api/notes/search |
| 标签路由 | GET /api/notes/tags |
| 注册到 app.main | `app.include_router(memos.router, ...)` |

### Phase 2 — AI Agent 集成 (≈4h)

| 任务 | 产出 |
|------|------|
| API Token 认证中间件适配笔记路由 | 复用 `get_current_user` |
| Agent 专用端点: `POST /api/notes/from-context` | 从文本提取关键信息创建笔记 |
| 语义检索基础设施: 配置 AI embedding 端点 | `backend/app/services/embedding.py` |
| 笔记内容向量化触发 (创建/更新时) | SQLAlchemy event + embedding 调用 |
| pgvector 迁移 + 向量索引 | `CREATE INDEX ON notes USING ivfflat (embedding vector_cosine_ops)`  |
| 语义搜索端点: `POST /api/notes/search/semantic` | 余弦相似度 top-k 检索 |
| Agent 使用文档 + curl 示例 | `docs/agent-notes.md` |

### Phase 3 — 前端基础 (≈4h)

| 任务 | 产出 |
|------|------|
| Zustand store (memos) | `frontend/src/stores/memos.ts` |
| API 函数 | `frontend/src/api/memos.ts` |
| MemosPage + MemoList + MemoCard | `frontend/src/features/memos/` |
| MemoEditor (TipTap Markdown) | `frontend/src/features/memos/MemoEditor.tsx` |
| 路由集成: activeView='memos' + 侧栏入口 | MailLayout + FolderSidebar |
| Markdown 渲染 (react-markdown) | MemoCard 内部 |

### Phase 4 — 标签 + 搜索 + 可见性 (≈2h)

| 任务 | 产出 |
|------|------|
| 标签过滤侧栏 | MemoToolbar 标签下拉 |
| 可见性切换 (全部/私人/公开) | 过滤逻辑 |
| 搜索 UI | 笔记内搜索框 |
| 置顶/归档交互 | Pin icon + 归档菜单 |

### Phase 5 — 邮件集成 (≈2h)

| 任务 | 产出 |
|------|------|
| 预览面板「转为笔记」按钮 | PreviewPane 扩展 |
| 自动提取邮件内容 → 笔记草稿 | 邮件→Markdown 转换 |
| 统一搜索 Tab | Toolbar 搜索扩展 |

### Phase 6 — 评论/反应 + @提及 (≈3h)

| 任务 | 产出 |
|------|------|
| 评论 (parent_id 线程) | MemoDetail 评论区 |
| 反应 (Emoji Reaction) | MemoCard 反应栏 |
| @提及组件 | 复用 AutocompleteInput |
| 通讯录集成 | @触发联系人完成 |

---

## 7. 与 Memos 的差异对比

| 功能 | Memos | Minimail Note | 理由 |
|------|-------|---------------|------|
| 后端语言 | Go (Echo) | Python (FastAPI) | 统一栈 |
| 数据库 | 可选 SQLite/MySQL/PG | PostgreSQL 固定 | 复用现有 |
| 编辑器 | 纯文本 → Markdown 渲染 | TipTap WYSIWYG + Markdown | 复用已有 |
| gRPC API | 支持 (Protobuf) | 仅 REST | 简化 |
| SSE 实时 | 支持 | 暂不支持 | 可后续加入 |
| Webhook | 支持 | 暂不支持 | 可后续加入 |
| SSO | GitHub/Google OIDC | 暂不支持 | 可复用现有用户系统 |
| 附件 | 拖拽上传 | TipTap 内置上传 | 复用编辑器能力 |
| AI 转写 | OpenAI Whisper | 暂不支持 | 可后续加入 |

---

## 8. 参考

- [usememos/memos](https://github.com/usememos/memos) — Memos 开源笔记系统 (Go + React)
- [Memos API 文档](https://usememos.com/docs/api) — REST + gRPC 接口定义
- [Memos AGENTS.md](https://github.com/usememos/memos/blob/main/AGENTS.md) — 项目架构代码映射
