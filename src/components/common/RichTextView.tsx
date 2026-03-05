/**
 * RichTextView — 顯示 WYSIWYG HTML 內容（唯讀）
 */
interface RichTextViewProps {
    html: string;
    style?: React.CSSProperties;
}

export function RichTextView({ html, style }: RichTextViewProps) {
    if (!html || /^(<p>(\s|<br[^>]*>)*<\/p>\s*)+$/.test(html)) return null;
    return (
        <>
            <div
                className="rich-text-view"
                style={{ fontSize: 14, lineHeight: 1.7, color: '#1e293b', ...style }}
                dangerouslySetInnerHTML={{ __html: html }}
            />
            <style>{viewCSS}</style>
        </>
    );
}

const viewCSS = `
.rich-text-view table {
    border-collapse: collapse;
    width: 100%;
    margin: 8px 0;
    table-layout: fixed;
}
.rich-text-view table td,
.rich-text-view table th {
    border: 1px solid #cbd5e1;
    padding: 6px 10px;
    font-size: 13px;
    vertical-align: top;
    word-break: break-word;
}
.rich-text-view table th {
    background: #f1f5f9;
    font-weight: 600;
    color: #374151;
}
.rich-text-view table tr:nth-child(even) td {
    background: #f8fafc;
}
.rich-text-view img {
    max-width: 100%;
    height: auto;
    border-radius: 4px;
    display: block;
    margin: 6px 0;
}
.rich-text-view p  { margin: 0 0 4px; }
.rich-text-view h1 { font-size: 20px; font-weight: 700; margin: 12px 0 6px; color: #0f172a; }
.rich-text-view h2 { font-size: 17px; font-weight: 700; margin: 10px 0 5px; color: #1e293b; }
.rich-text-view h3 { font-size: 15px; font-weight: 600; margin: 8px 0 4px; color: #334155; }
.rich-text-view ul, .rich-text-view ol { padding-left: 20px; margin: 4px 0; }
.rich-text-view a  { color: #2563eb; text-decoration: underline; }
`;
