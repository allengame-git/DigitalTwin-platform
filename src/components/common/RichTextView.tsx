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
        <div
            className="rich-text-view"
            style={{
                fontSize: 14,
                lineHeight: 1.7,
                color: '#1e293b',
                ...style,
            }}
            dangerouslySetInnerHTML={{ __html: html }}
        />
    );
}
