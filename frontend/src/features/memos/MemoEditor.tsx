/**
 * MemoEditor — 笔记编辑器
 *
 * TipTap WYSIWYG → 提取纯 Markdown 文本保存
 * 支持标签输入 (逗号分隔)
 */

import React, { useState, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import type { Note } from '@/api/memos';

interface MemoEditorProps {
  note: Note | null;  // null = 新建
  onSave: (content: string, tags: string[]) => Promise<void>;
  onCancel: () => void;
}

function ToolbarButton({
  onClick,
  active,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`px-1.5 py-1 text-sm rounded hover:bg-gray-200 transition-colors ${
        active ? 'bg-gray-200 text-gray-900' : 'text-gray-500'
      }`}
      type="button"
    >
      {children}
    </button>
  );
}

export default function MemoEditor({ note, onSave, onCancel }: MemoEditorProps) {
  const [tagsInput, setTagsInput] = useState(note?.tags.join(', ') || '');
  const [saving, setSaving] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Underline,
      Placeholder.configure({ placeholder: '开始写笔记...（支持 Markdown）' }),
    ],
    content: note?.content || '<p></p>',
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[200px] px-4 py-3',
      },
    },
  });

  const handleSave = async () => {
    if (!editor) return;
    const content = editor.getText().trim();
    if (!content) return;

    const tags = tagsInput
      .split(/[,，\s]+/)
      .map((t) => t.trim().replace(/^#/, ''))
      .filter(Boolean);

    setSaving(true);
    try {
      await onSave(content, tags);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {/* 工具栏 */}
      <div className="flex items-center gap-1 px-3 py-2 border-b border-gray-100 flex-wrap">
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleBold().run()}
          active={editor?.isActive('bold')}
          title="粗体"
        >
          <strong>B</strong>
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleItalic().run()}
          active={editor?.isActive('italic')}
          title="斜体"
        >
          <em>I</em>
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleStrike().run()}
          active={editor?.isActive('strike')}
          title="删除线"
        >
          <s>S</s>
        </ToolbarButton>
        <span className="w-px h-4 bg-gray-200 mx-1" />
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
          active={editor?.isActive('heading', { level: 1 })}
          title="标题 1"
        >
          H1
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
          active={editor?.isActive('heading', { level: 2 })}
          title="标题 2"
        >
          H2
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
          active={editor?.isActive('heading', { level: 3 })}
          title="标题 3"
        >
          H3
        </ToolbarButton>
        <span className="w-px h-4 bg-gray-200 mx-1" />
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
          active={editor?.isActive('bulletList')}
          title="无序列表"
        >
          •列表
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          active={editor?.isActive('orderedList')}
          title="有序列表"
        >
          1.列表
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
          active={editor?.isActive('codeBlock')}
          title="代码块"
        >
          {'</>'}
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleBlockquote().run()}
          active={editor?.isActive('blockquote')}
          title="引用"
        >
          "
        </ToolbarButton>
      </div>

      {/* 编辑器 */}
      <EditorContent editor={editor} />

      {/* 标签 */}
      <div className="px-4 py-2 border-t border-gray-100">
        <input
          type="text"
          value={tagsInput}
          onChange={(e) => setTagsInput(e.target.value)}
          placeholder="标签 (逗号分隔)"
          className="w-full text-sm text-gray-500 placeholder-gray-300 focus:outline-none"
        />
      </div>

      {/* 操作按钮 */}
      <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-gray-100 bg-gray-50 rounded-b-lg">
        <button
          onClick={onCancel}
          className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          type="button"
        >
          取消
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-1.5 text-sm bg-[#066da5] text-white rounded-md hover:bg-[#05588a] disabled:opacity-50 transition-colors"
          type="button"
        >
          {saving ? '保存中...' : note ? '保存' : '创建'}
        </button>
      </div>
    </div>
  );
}
