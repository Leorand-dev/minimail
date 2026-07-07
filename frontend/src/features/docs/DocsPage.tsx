/**
 * DocsPage — 系统文档查看器
 *
 * 嵌入 Sidebar 导航 + Markdown 内容渲染
 * 内容从后端 /system-docs 端点获取
 */

import { useEffect, useState, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import api from '@/api/client';

interface DocEntry {
  path: string;
  title: string;
  icon?: string;
  children?: DocEntry[];
}

const DOC_NAV: DocEntry[] = [
  {
    path: 'system/index.md',
    title: '系统文档',
    icon: '📖',
    children: [
      {
        path: 'system/operations/index.md',
        title: '操作说明',
        icon: '🛠️',
        children: [
          { path: 'system/operations/quickstart.md', title: '快速开始', icon: '⚡' },
          { path: 'system/operations/email.md', title: '邮件系统', icon: '📧' },
          { path: 'system/operations/notes.md', title: '笔记库', icon: '📝' },
          { path: 'system/operations/contacts.md', title: '通讯录', icon: '👤' },
          { path: 'system/operations/settings.md', title: '设置', icon: '⚙️' },
          { path: 'system/operations/agent.md', title: 'AI Agent', icon: '🤖' },
        ],
      },
      {
        path: 'system/api/index.md',
        title: 'API 参考',
        icon: '🔌',
        children: [
          { path: 'system/api/auth.md', title: '认证', icon: '🔐' },
          { path: 'system/api/mail.md', title: '邮件', icon: '📧' },
          { path: 'system/api/notes.md', title: '笔记库', icon: '📝' },
          { path: 'system/api/contacts.md', title: '通讯录', icon: '👤' },
          { path: 'system/api/tokens.md', title: 'API 密钥', icon: '🔑' },
          { path: 'system/api/settings.md', title: '设置', icon: '⚙️' },
        ],
      },
    ],
  },
];

export default function DocsPage() {
  const [content, setContent] = useState('');
  const [currentPath, setCurrentPath] = useState('system/index.md');
  const [loading, setLoading] = useState(true);
  const contentRef = useRef<HTMLDivElement>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['系统文档']));


  useEffect(() => {
    setLoading(true);
    api.get(`/system-docs/${currentPath}`)
      .then((res) => {
        setContent(typeof res.data === 'string' ? res.data : JSON.stringify(res.data));
      })
      .catch(() => {
        setContent('# 文档加载失败\n\n请稍后重试。');
      })
      .finally(() => setLoading(false));
  }, [currentPath]);

  return (
    <div className="h-full flex flex-col">
      <div className="h-[55px] flex items-center px-4 border-b border-gray-200 bg-white shrink-0">
        <h2 className="text-base font-semibold text-gray-800">📄 系统文档</h2>
        <span className="ml-3 text-xs text-gray-400">操作说明 + API 参考</span>
        <a
          href="/redoc"
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto px-3 py-1.5 text-xs bg-[#066da5] text-white rounded-md hover:bg-[#05588a] transition-colors"
        >
          OpenAPI /redoc ↗
        </a>
      </div>
      <div className="flex-1 flex overflow-hidden">
        {/* 左侧: 文档导航 */}
        <nav className="w-52 border-r border-gray-200 bg-gray-50 p-2 overflow-y-auto shrink-0">
          {DOC_NAV.map((section) => (
            <div key={section.title}>
              <button
                onClick={() => {
                  if (expandedSections.has(section.title)) {
                    setExpandedSections(new Set([...expandedSections].filter((s) => s !== section.title)));
                  } else {
                    setExpandedSections(new Set([...expandedSections, section.title]));
                  }
                }}
                className="w-full flex items-center gap-1 px-2 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:bg-gray-200 rounded"
              >
                <span className="text-[10px]">{expandedSections.has(section.title) ? '▼' : '▶'}</span>
                {section.icon} {section.title}
              </button>
              {expandedSections.has(section.title) && section.children && (
                <div className="ml-2 space-y-0.5 mt-0.5">
                  {renderNavTree(section.children, currentPath, setCurrentPath)}
                </div>
              )}
            </div>
          ))}
        </nav>

        {/* 右侧: 文档内容 */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="space-y-3 animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-1/3" />
              <div className="h-4 bg-gray-200 rounded w-2/3" />
              <div className="h-4 bg-gray-200 rounded w-1/2" />
              <div className="h-20 bg-gray-200 rounded" />
            </div>
          ) : (
            <div
              ref={contentRef}
              className="overflow-y-auto prose prose-sm max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-a:text-[#066da5] prose-code:text-pink-600 prose-pre:bg-gray-50 prose-pre:border prose-pre:border-gray-200"
            >
              <ReactMarkdown>{content}</ReactMarkdown>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function renderNavTree(
  items: DocEntry[],
  currentPath: string,
  setCurrentPath: (p: string) => void,
  depth = 0,
): React.ReactNode {
  return items.map((item) => {
    if (item.children) {
      return (
        <div key={item.title}>
          <div className="flex items-center gap-1 px-2 py-1 text-xs text-gray-400">
            {item.icon} {item.title}
          </div>
          <div className="ml-2 space-y-0.5">
            {renderNavTree(item.children, currentPath, setCurrentPath, depth + 1)}
          </div>
        </div>
      );
    }
    return (
      <button
        key={item.path}
        onClick={() => setCurrentPath(item.path)}
        className={`w-full text-left px-2 py-1 text-xs rounded transition-colors ${
          currentPath === item.path
            ? 'bg-[#066da5]/10 text-[#066da5] font-medium'
            : 'text-gray-600 hover:bg-gray-100'
        }`}
      >
        {item.title}
      </button>
    );
  });
}
