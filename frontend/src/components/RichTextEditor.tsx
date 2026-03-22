import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import { useEffect, useRef } from 'react';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
}

function ToolbarBtn({ onClick, active, title, children }: {
  onClick: () => void; active?: boolean; title: string; children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onMouseDown={e => {
        e.preventDefault();
        e.stopPropagation();
        onClick();
      }}
      title={title}
      className={`px-2 py-1 text-xs rounded transition-colors ${
        active ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'
      }`}
    >
      {children}
    </button>
  );
}

export default function RichTextEditor({ value, onChange, placeholder, minHeight = '8rem' }: RichTextEditorProps) {
  // Track whether the last HTML change came from the editor itself (to avoid feedback loops)
  const isInternalChange = useRef(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
    ],
    content: value || '',
    shouldRerenderOnTransaction: true,
    onUpdate: ({ editor }) => {
      isInternalChange.current = true;
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none px-3 py-2',
        style: `min-height: ${minHeight}`,
        'data-placeholder': placeholder ?? '',
      },
    },
  });

  // Only sync external value changes (e.g. modal open/reset), not echoes of our own edits
  useEffect(() => {
    if (!editor) return;
    if (isInternalChange.current) {
      isInternalChange.current = false;
      return;
    }
    if (value !== editor.getHTML()) {
      editor.commands.setContent(value || '');
    }
  }, [value, editor]);

  if (!editor) return null;

  return (
    <div className="border border-gray-300 rounded-md overflow-hidden focus-within:ring-1 focus-within:ring-blue-500 focus-within:border-blue-500">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1 border-b border-gray-200 bg-gray-50">
        <ToolbarBtn onClick={() => { editor.view.focus(); editor.commands.toggleBold(); }} active={editor.isActive('bold')} title="Bold">
          <strong>B</strong>
        </ToolbarBtn>
        <ToolbarBtn onClick={() => { editor.view.focus(); editor.commands.toggleItalic(); }} active={editor.isActive('italic')} title="Italic">
          <em>I</em>
        </ToolbarBtn>
        <ToolbarBtn onClick={() => { editor.view.focus(); editor.commands.toggleUnderline(); }} active={editor.isActive('underline')} title="Underline">
          <span className="underline">U</span>
        </ToolbarBtn>
        <div className="w-px h-4 bg-gray-300 mx-1" />
        <ToolbarBtn onClick={() => { editor.view.focus(); editor.commands.toggleHeading({ level: 3 }); }} active={editor.isActive('heading', { level: 3 })} title="Heading">
          H
        </ToolbarBtn>
        <ToolbarBtn onClick={() => { editor.view.focus(); editor.commands.toggleBulletList(); }} active={editor.isActive('bulletList')} title="Bullet list">
          • List
        </ToolbarBtn>
        <ToolbarBtn onClick={() => { editor.view.focus(); editor.commands.toggleOrderedList(); }} active={editor.isActive('orderedList')} title="Numbered list">
          1. List
        </ToolbarBtn>
        <div className="w-px h-4 bg-gray-300 mx-1" />
        <ToolbarBtn onClick={() => { editor.view.focus(); editor.commands.setTextAlign('left'); }} active={editor.isActive({ textAlign: 'left' })} title="Align left">
          ←
        </ToolbarBtn>
        <ToolbarBtn onClick={() => { editor.view.focus(); editor.commands.setTextAlign('center'); }} active={editor.isActive({ textAlign: 'center' })} title="Align center">
          ↔
        </ToolbarBtn>
        <ToolbarBtn onClick={() => { editor.view.focus(); editor.commands.setTextAlign('right'); }} active={editor.isActive({ textAlign: 'right' })} title="Align right">
          →
        </ToolbarBtn>
        <div className="w-px h-4 bg-gray-300 mx-1" />
        <ToolbarBtn onClick={() => { editor.view.focus(); editor.commands.toggleBlockquote(); }} active={editor.isActive('blockquote')} title="Blockquote">
          ❝
        </ToolbarBtn>
        <ToolbarBtn onClick={() => { editor.view.focus(); editor.commands.setHardBreak(); }} title="Line break">
          ↵
        </ToolbarBtn>
        <ToolbarBtn onClick={() => { editor.view.focus(); editor.commands.undo(); }} title="Undo">
          ↩
        </ToolbarBtn>
        <ToolbarBtn onClick={() => { editor.view.focus(); editor.commands.redo(); }} title="Redo">
          ↪
        </ToolbarBtn>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
