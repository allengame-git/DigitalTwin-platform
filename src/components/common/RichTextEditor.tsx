/**
 * RichTextEditor — TipTap WYSIWYG 編輯器（共用元件）
 * 工具列：Bold / Italic / H2 / H3 / BulletList / Link
 */
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import { useEffect } from 'react';

interface RichTextEditorProps {
    value: string;
    onChange: (html: string) => void;
    placeholder?: string;
}

export function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
    const editor = useEditor({
        extensions: [
            StarterKit,
            Link.configure({ openOnClick: false }),
        ],
        content: value,
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML());
        },
    });

    // 外部 value 變更時同步（切換模型時）
    useEffect(() => {
        if (editor && value !== editor.getHTML()) {
            editor.commands.setContent(value || '');
        }
    }, [value, editor]);

    if (!editor) return null;

    const btn = (active: boolean) => ({
        background: active ? '#2563eb' : '#f1f5f9',
        color: active ? '#fff' : '#374151',
        border: 'none',
        borderRadius: 4,
        padding: '3px 8px',
        fontSize: 12,
        cursor: 'pointer',
        fontWeight: 500,
    } as React.CSSProperties);

    return (
        <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
            {/* 工具列 */}
            <div style={{ display: 'flex', gap: 4, padding: '6px 8px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', flexWrap: 'wrap' }}>
                <button style={btn(editor.isActive('bold'))} onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleBold().run(); }}>B</button>
                <button style={{ ...btn(editor.isActive('italic')), fontStyle: 'italic' }} onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleItalic().run(); }}>I</button>
                <button style={btn(editor.isActive('heading', { level: 2 }))} onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleHeading({ level: 2 }).run(); }}>H2</button>
                <button style={btn(editor.isActive('heading', { level: 3 }))} onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleHeading({ level: 3 }).run(); }}>H3</button>
                <button style={btn(editor.isActive('bulletList'))} onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleBulletList().run(); }}>&#x2022; 清單</button>
                <button
                    style={btn(editor.isActive('link'))}
                    onMouseDown={e => {
                        e.preventDefault();
                        if (editor.isActive('link')) {
                            editor.chain().focus().unsetLink().run();
                        } else {
                            const url = prompt('輸入連結網址');
                            if (url) editor.chain().focus().setLink({ href: url }).run();
                        }
                    }}
                >
                    Link
                </button>
            </div>

            {/* 編輯區 */}
            <div style={{ position: 'relative' }}>
                <EditorContent
                    editor={editor}
                    style={{ minHeight: 120, padding: '10px 12px', fontSize: 14, lineHeight: 1.6 }}
                />
                {editor.isEmpty && placeholder && (
                    <div style={{
                        position: 'absolute',
                        top: 10,
                        left: 12,
                        color: '#94a3b8',
                        fontSize: 14,
                        pointerEvents: 'none',
                    }}>
                        {placeholder}
                    </div>
                )}
            </div>
        </div>
    );
}
