/**
 * RichTextEditor — TipTap WYSIWYG 編輯器（共用元件）
 * 工具列：格式、標題、清單、對齊、連結、插入圖片、插入表格
 */
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import { Image } from '@tiptap/extension-image';
import { TableKit } from '@tiptap/extension-table';
import { TextAlign } from '@tiptap/extension-text-align';
import { Underline } from '@tiptap/extension-underline';
import { useCallback, useEffect, useRef, useState } from 'react';

interface RichTextEditorProps {
    value: string;
    onChange: (html: string) => void;
    placeholder?: string;
    /** 上傳圖片 → 回傳可存取 URL */
    onImageUpload?: (file: File) => Promise<string>;
}

// ── Table insert popover ──────────────────────────────────────────────────────

function TablePopover({ onInsert, onClose }: {
    onInsert: (rows: number, cols: number) => void;
    onClose: () => void;
}) {
    const [rows, setRows] = useState(3);
    const [cols, setCols] = useState(3);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) onClose();
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [onClose]);

    return (
        <div ref={ref} style={popoverStyle} onMouseDown={e => e.stopPropagation()}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 10 }}>插入表格</div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                <label style={labelStyle}>
                    列數（Row）
                    <input
                        type="number" min={1} max={20} value={rows}
                        onChange={e => setRows(Math.max(1, Math.min(20, +e.target.value)))}
                        style={numInputStyle}
                    />
                </label>
                <label style={labelStyle}>
                    欄數（Col）
                    <input
                        type="number" min={1} max={10} value={cols}
                        onChange={e => setCols(Math.max(1, Math.min(10, +e.target.value)))}
                        style={numInputStyle}
                    />
                </label>
            </div>
            <button
                onMouseDown={e => { e.preventDefault(); onInsert(rows, cols); }}
                style={insertBtnStyle}
            >
                插入
            </button>
        </div>
    );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function RichTextEditor({ value, onChange, placeholder, onImageUpload }: RichTextEditorProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [showTablePop, setShowTablePop] = useState(false);
    const [uploading, setUploading] = useState(false);

    const editor = useEditor({
        extensions: [
            StarterKit,
            Underline,
            Link.configure({ openOnClick: false }),
            Image.configure({ inline: false, allowBase64: false }),
            TableKit,
            TextAlign.configure({ types: ['heading', 'paragraph'] }),
        ],
        content: value,
        onUpdate: ({ editor }) => onChange(editor.getHTML()),
    });

    // 外部 value 變更時同步（切換模型時）
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => {
        if (editor && value !== editor.getHTML()) {
            editor.commands.setContent(value || '');
        }
    }, [value]);

    const insertImageByUrl = useCallback(() => {
        if (!editor) return;
        const url = prompt('輸入圖片網址');
        if (url) editor.chain().focus().setImage({ src: url }).run();
    }, [editor]);

    const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!editor || !onImageUpload) return;
        const file = e.target.files?.[0];
        if (!file) return;
        e.target.value = '';
        setUploading(true);
        try {
            const url = await onImageUpload(file);
            editor.chain().focus().setImage({ src: url }).run();
        } catch {
            alert('圖片上傳失敗');
        } finally {
            setUploading(false);
        }
    }, [editor, onImageUpload]);

    const insertTable = useCallback((rows: number, cols: number) => {
        if (!editor) return;
        editor.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run();
        setShowTablePop(false);
    }, [editor]);

    if (!editor) return null;

    const tb = (active: boolean, disabled = false) => ({
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minWidth: 28, height: 26, padding: '0 6px',
        background: active ? '#2563eb' : 'transparent',
        color: active ? '#fff' : disabled ? '#c0cfe0' : '#374151',
        border: '1px solid',
        borderColor: active ? '#2563eb' : 'transparent',
        borderRadius: 5,
        fontSize: 12,
        fontWeight: 500,
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'background 0.12s, color 0.12s',
        userSelect: 'none' as const,
        flexShrink: 0,
    } as React.CSSProperties);

    const sep = <div style={{ width: 1, background: '#e5e7eb', margin: '0 3px', alignSelf: 'stretch' }} />;

    return (
        <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'visible', background: '#fff' }}>
            {/* ── Toolbar ── */}
            <div style={{
                display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center',
                padding: '5px 8px', background: '#f8fafc',
                borderBottom: '1px solid #e2e8f0', borderRadius: '8px 8px 0 0',
                position: 'relative',
            }}>
                {/* 格式 */}
                <button title="粗體 (Ctrl+B)" style={tb(editor.isActive('bold'))}
                    onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleBold().run(); }}>
                    <b>B</b>
                </button>
                <button title="斜體 (Ctrl+I)" style={{ ...tb(editor.isActive('italic')), fontStyle: 'italic' }}
                    onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleItalic().run(); }}>
                    <i>I</i>
                </button>
                <button title="底線 (Ctrl+U)" style={{ ...tb(editor.isActive('underline')), textDecoration: 'underline' }}
                    onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleUnderline().run(); }}>
                    U
                </button>

                {sep}

                {/* 標題 */}
                {([1, 2, 3] as const).map(level => (
                    <button key={level} title={`標題 ${level}`}
                        style={tb(editor.isActive('heading', { level }))}
                        onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleHeading({ level }).run(); }}>
                        H{level}
                    </button>
                ))}

                {sep}

                {/* 清單 */}
                <button title="項目清單" style={tb(editor.isActive('bulletList'))}
                    onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleBulletList().run(); }}>
                    &#x2022;&#x2014;
                </button>
                <button title="編號清單" style={tb(editor.isActive('orderedList'))}
                    onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleOrderedList().run(); }}>
                    1&#x2014;
                </button>

                {sep}

                {/* 對齊 */}
                <button title="靠左" style={tb(editor.isActive({ textAlign: 'left' }))}
                    onMouseDown={e => { e.preventDefault(); editor.chain().focus().setTextAlign('left').run(); }}>
                    &#8676;
                </button>
                <button title="置中" style={tb(editor.isActive({ textAlign: 'center' }))}
                    onMouseDown={e => { e.preventDefault(); editor.chain().focus().setTextAlign('center').run(); }}>
                    &#8676;&#8677;
                </button>
                <button title="靠右" style={tb(editor.isActive({ textAlign: 'right' }))}
                    onMouseDown={e => { e.preventDefault(); editor.chain().focus().setTextAlign('right').run(); }}>
                    &#8677;
                </button>

                {sep}

                {/* 連結 */}
                <button title="插入連結"
                    style={tb(editor.isActive('link'))}
                    onMouseDown={e => {
                        e.preventDefault();
                        if (editor.isActive('link')) {
                            editor.chain().focus().unsetLink().run();
                        } else {
                            const url = prompt('輸入連結網址');
                            if (url) editor.chain().focus().setLink({ href: url }).run();
                        }
                    }}>
                    Link
                </button>

                {sep}

                {/* 圖片：URL */}
                <button title="插入圖片網址" style={tb(false)} onMouseDown={e => { e.preventDefault(); insertImageByUrl(); }}>
                    圖↗
                </button>
                {/* 圖片：上傳（需要 onImageUpload prop） */}
                {onImageUpload && (
                    <button title="上傳圖片" disabled={uploading}
                        style={tb(false, uploading)}
                        onMouseDown={e => { e.preventDefault(); fileInputRef.current?.click(); }}>
                        {uploading ? '…' : '圖↑'}
                    </button>
                )}
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleFileSelect}
                />

                {sep}

                {/* 表格 */}
                <div style={{ position: 'relative' }}>
                    <button title="插入表格"
                        style={tb(showTablePop)}
                        onMouseDown={e => { e.preventDefault(); e.stopPropagation(); setShowTablePop(v => !v); }}>
                        表格
                    </button>
                    {showTablePop && (
                        <TablePopover onInsert={insertTable} onClose={() => setShowTablePop(false)} />
                    )}
                </div>

                {/* 表格操作（僅在游標位於表格內時顯示） */}
                {editor.isActive('table') && <>
                    {sep}
                    <button title="新增列" style={tb(false)}
                        onMouseDown={e => { e.preventDefault(); editor.chain().focus().addRowAfter().run(); }}>+列</button>
                    <button title="新增欄" style={tb(false)}
                        onMouseDown={e => { e.preventDefault(); editor.chain().focus().addColumnAfter().run(); }}>+欄</button>
                    <button title="刪除列" style={tb(false)}
                        onMouseDown={e => { e.preventDefault(); editor.chain().focus().deleteRow().run(); }}>－列</button>
                    <button title="刪除欄" style={tb(false)}
                        onMouseDown={e => { e.preventDefault(); editor.chain().focus().deleteColumn().run(); }}>－欄</button>
                    <button title="刪除表格" style={{ ...tb(false), color: '#dc2626' }}
                        onMouseDown={e => { e.preventDefault(); editor.chain().focus().deleteTable().run(); }}>✕表</button>
                </>}
            </div>

            {/* ── Editor area ── */}
            <div style={{ position: 'relative' }}>
                <EditorContent
                    editor={editor}
                    style={{ minHeight: 160, padding: '10px 12px', fontSize: 14, lineHeight: 1.65 }}
                />
                {editor.isEmpty && placeholder && (
                    <div style={{
                        position: 'absolute', top: 10, left: 12,
                        color: '#94a3b8', fontSize: 14, pointerEvents: 'none',
                    }}>
                        {placeholder}
                    </div>
                )}
            </div>

            {/* ── Table & Image global styles injected once ── */}
            <style>{editorCSS}</style>
        </div>
    );
}

// ── Popover styles ────────────────────────────────────────────────────────────

const popoverStyle: React.CSSProperties = {
    position: 'absolute',
    top: 32,
    left: 0,
    zIndex: 200,
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    padding: '12px 14px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
    minWidth: 200,
};

const labelStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    fontSize: 11,
    color: '#64748b',
    fontWeight: 500,
    flex: 1,
};

const numInputStyle: React.CSSProperties = {
    width: '100%',
    padding: '5px 8px',
    border: '1px solid #e2e8f0',
    borderRadius: 5,
    fontSize: 13,
    outline: 'none',
    color: '#1e293b',
    boxSizing: 'border-box',
};

const insertBtnStyle: React.CSSProperties = {
    width: '100%',
    padding: '6px 0',
    background: '#2563eb',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
};

// ── Scoped CSS for table and image rendering inside editor ────────────────────

const editorCSS = `
.tiptap table {
    border-collapse: collapse;
    width: 100%;
    margin: 8px 0;
    table-layout: fixed;
}
.tiptap table td,
.tiptap table th {
    border: 1px solid #cbd5e1;
    padding: 6px 10px;
    font-size: 13px;
    vertical-align: top;
    min-width: 60px;
    word-break: break-word;
}
.tiptap table th {
    background: #f1f5f9;
    font-weight: 600;
    color: #374151;
}
.tiptap table tr:nth-child(even) td {
    background: #f8fafc;
}
.tiptap img {
    max-width: 100%;
    height: auto;
    border-radius: 4px;
    display: block;
    margin: 6px 0;
}
.tiptap p { margin: 0 0 4px; }
.tiptap h1 { font-size: 20px; font-weight: 700; margin: 12px 0 6px; }
.tiptap h2 { font-size: 17px; font-weight: 700; margin: 10px 0 5px; }
.tiptap h3 { font-size: 15px; font-weight: 600; margin: 8px 0 4px; }
.tiptap ul, .tiptap ol { padding-left: 20px; margin: 4px 0; }
.tiptap a { color: #2563eb; text-decoration: underline; }
.selectedCell { background: #dbeafe !important; }
`;
