/**
 * MemoEditor — 笔记编辑器
 *
 * TipTap WYSIWYG → 提取纯 Markdown 文本保存
 * 支持标签输入 (逗号分隔)
 */

import { useState, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import type { Note } from '@/api/memos';
import { uploadAttachment } from '@/api/memos';
import type { NoteAttachment } from '@/api/memos';

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
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadedAttachments, setUploadedAttachments] = useState<NoteAttachment[]>([]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      if (!note || uploading) return;
      const files = Array.from(e.dataTransfer.files);
      if (files.length === 0) return;
      setUploading(true);
      try {
        for (const file of files) {
          const result = await uploadAttachment(note.id, file);
          setUploadedAttachments((prev) => [...prev, result]);
        }
      } catch {
        // silently fail
      } finally {
        setUploading(false);
      }
    },
    [note, uploading]
  );

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
    <div
      className={`bg-white rounded-lg border ${
        note && isDragging
          ? 'border-[#066da5] border-2 border-dashed bg-[#066da5]/5'
          : 'border-gray-200'
      }`}
      onDragOver={note ? handleDragOver : undefined}
      onDragLeave={note ? handleDragLeave : undefined}
      onDrop={note ? handleDrop : undefined}
    >
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

      {/* 拖拽上传区 (仅编辑模式) */}
      {note && (
        <div
          className={`px-4 py-2 border-t border-gray-100 text-xs ${
            isDragging
              ? 'bg-[#066da5]/5 text-[#066da5]'
              : 'text-gray-400'
          } transition-colors`}
        >
          {uploading ? (
            <div className="flex items-center gap-2">
              <span className="inline-block w-4 h-4 border-2 border-[#066da5] border-t-transparent rounded-full animate-spin" />
              <span>上传中...</span>
            </div>
          ) : isDragging ? (
            <span>📎 释放以上传文件</span>
          ) : (
            <span>📎 拖拽文件到此处上传附件</span>
          )}
        </div>
      )}

      {/* 已上传附件 */}
      {uploadedAttachments.length > 0 && (
        <div className="px-4 py-2 border-t border-gray-100">
          <div className="flex flex-wrap gap-2">
            {uploadedAttachments.map((att) => (
              <a
                key={att.id}
                href={att.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-gray-50 hover:bg-gray-100 text-xs text-gray-600 hover:text-[#066da5] border border-gray-200 transition-colors"
              >
                <span>📎</span>
                <span className="truncate max-w-[150px]">{att.filename}</span>
              </a>
            ))}
          </div>
        </div>
      )}

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
