import { type ReactNode } from 'react';

/**
 * Detects `cat -n` style line-numbered output:
 *   "     1\tline content"  (tab separator)
 *   "     1→line content"   (→ U+2192 separator, used by Claude Code)
 * Lines must start with optional spaces + digits + separator.
 */
const LINE_NUM_RE = /^(\s*\d+)[\t\u2192](.*)$/;

function hasLineNumbers(code: string): boolean {
  const lines = code.split('\n').filter(l => l.length > 0);
  if (lines.length < 2) return false;
  // At least 80% of non-empty lines should match the pattern
  const matching = lines.filter(l => LINE_NUM_RE.test(l)).length;
  return matching / lines.length >= 0.8;
}

function LineNumberedCode({ code }: { code: string }) {
  const lines = code.endsWith('\n') ? code.slice(0, -1).split('\n') : code.split('\n');

  const parsed = lines.map(line => {
    const m = line.match(LINE_NUM_RE);
    if (m) return { num: m[1].trim(), content: m[2] };
    return { num: '', content: line };
  });

  return (
    <div style={{ display: 'flex', fontSize: 'inherit', lineHeight: 'inherit' }}>
      <div
        aria-hidden
        style={{
          userSelect: 'none',
          WebkitUserSelect: 'none',
          textAlign: 'right',
          paddingRight: 12,
          color: '#9ca3af',
          borderRight: '1px solid #e5e7eb',
          marginRight: 12,
          flexShrink: 0,
          whiteSpace: 'pre',
        }}
      >
        {parsed.map((l, i) => (
          <div key={i}>{l.num}</div>
        ))}
      </div>
      <div style={{ whiteSpace: 'pre', overflowX: 'auto', flex: 1 }}>
        {parsed.map((l, i) => (
          <div key={i}>{l.content || '\n'}</div>
        ))}
      </div>
    </div>
  );
}

/**
 * Custom code renderer for react-markdown.
 * Detects cat -n style output and renders with separated line numbers.
 * Line numbers are excluded from text selection / copy.
 */
export function CodeBlock({
  children,
  className,
  ...props
}: { children?: ReactNode; className?: string; node?: unknown }) {
  const isInline = !className && typeof children === 'string' && !children.includes('\n');

  if (isInline) {
    return <code className={className} {...props}>{children}</code>;
  }

  const code = typeof children === 'string' ? children : String(children ?? '');

  if (hasLineNumbers(code)) {
    return <LineNumberedCode code={code} />;
  }

  return <code className={className} {...props}>{children}</code>;
}

/** Components object to pass to react-markdown */
export const markdownComponents = {
  code: CodeBlock,
};
