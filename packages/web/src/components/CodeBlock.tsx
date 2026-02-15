import { memo, type ReactNode } from 'react';
import { PrismLight as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

// Register only the languages we need (instead of loading all 300+)
import typescript from 'react-syntax-highlighter/dist/esm/languages/prism/typescript';
import javascript from 'react-syntax-highlighter/dist/esm/languages/prism/javascript';
import python from 'react-syntax-highlighter/dist/esm/languages/prism/python';
import php from 'react-syntax-highlighter/dist/esm/languages/prism/php';
import go from 'react-syntax-highlighter/dist/esm/languages/prism/go';
import c from 'react-syntax-highlighter/dist/esm/languages/prism/c';
import markup from 'react-syntax-highlighter/dist/esm/languages/prism/markup';
import json from 'react-syntax-highlighter/dist/esm/languages/prism/json';
import yaml from 'react-syntax-highlighter/dist/esm/languages/prism/yaml';
import docker from 'react-syntax-highlighter/dist/esm/languages/prism/docker';
import sql from 'react-syntax-highlighter/dist/esm/languages/prism/sql';
import bash from 'react-syntax-highlighter/dist/esm/languages/prism/bash';

SyntaxHighlighter.registerLanguage('typescript', typescript);
SyntaxHighlighter.registerLanguage('javascript', javascript);
SyntaxHighlighter.registerLanguage('python', python);
SyntaxHighlighter.registerLanguage('php', php);
SyntaxHighlighter.registerLanguage('go', go);
SyntaxHighlighter.registerLanguage('c', c);
SyntaxHighlighter.registerLanguage('html', markup);
SyntaxHighlighter.registerLanguage('json', json);
SyntaxHighlighter.registerLanguage('yaml', yaml);
SyntaxHighlighter.registerLanguage('dockerfile', docker);
SyntaxHighlighter.registerLanguage('sql', sql);
SyntaxHighlighter.registerLanguage('bash', bash);

import { LINE_NUM_RE, hasLineNumbers, stripLineNumbers, guessLanguage } from '../lib/codeBlockUtils';

// Re-export for backwards compatibility
export { LINE_NUM_RE, hasLineNumbers, stripLineNumbers, guessLanguage };

const CODE_FONT = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';

const LineNumberedCode = memo(function LineNumberedCode({ code, language }: { code: string; language?: string }) {
  const { nums, content } = stripLineNumbers(code);

  return (
    <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden' }}>
      <div
        aria-hidden
        style={{
          userSelect: 'none',
          WebkitUserSelect: 'none',
          textAlign: 'right',
          padding: '16px 0',
          paddingLeft: 12,
          paddingRight: 12,
          backgroundColor: '#1e1e2e',
          color: '#6c7086',
          fontSize: 13,
          lineHeight: '1.45',
          fontFamily: CODE_FONT,
          borderRight: '1px solid #313244',
          flexShrink: 0,
        }}
      >
        {nums.map((n, i) => (
          <div key={i}>{n}</div>
        ))}
      </div>
      <div style={{ flex: 1, overflow: 'auto' }}>
        <SyntaxHighlighter
          language={language ?? guessLanguage(content)}
          style={oneDark}
          customStyle={{
            margin: 0,
            padding: '16px',
            borderRadius: 0,
            fontSize: 13,
            background: '#282a36',
          }}
          codeTagProps={{ style: { fontFamily: CODE_FONT, color: '#abb2bf' } }}
        >
          {content}
        </SyntaxHighlighter>
      </div>
    </div>
  );
});

const HighlightedCode = memo(function HighlightedCode({ code, language }: { code: string; language?: string }) {
  return (
    <SyntaxHighlighter
      language={language ?? guessLanguage(code)}
      style={oneDark}
      customStyle={{
        margin: 0,
        padding: '16px',
        borderRadius: 8,
        fontSize: 13,
        background: '#282a36',
      }}
      codeTagProps={{ style: { fontFamily: CODE_FONT, color: '#abb2bf' } }}
    >
      {code}
    </SyntaxHighlighter>
  );
});

/**
 * Custom code renderer for react-markdown.
 * - Fenced code blocks: syntax highlighting with Prism
 * - cat -n style output: separated line numbers + syntax highlighting
 * - Inline code: plain rendering
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

  const code = typeof children === 'string'
    ? children.replace(/\n$/, '')
    : String(children ?? '').replace(/\n$/, '');

  const langMatch = className?.match(/language-(\w+)/);
  const language = langMatch?.[1];

  if (hasLineNumbers(code)) {
    return <LineNumberedCode code={code} language={language} />;
  }

  return <HighlightedCode code={code} language={language} />;
}

/** Inline image — constrain to thumbnail size */
function InlineImage(props: React.ImgHTMLAttributes<HTMLImageElement>) {
  return (
    <img
      {...props}
      style={{
        maxWidth: 240,
        maxHeight: 180,
        borderRadius: 10,
        objectFit: 'cover',
        display: 'inline-block',
        verticalAlign: 'top',
        margin: '4px 0',
        boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
      }}
    />
  );
}

/** Components object to pass to react-markdown */
export const markdownComponents = {
  code: CodeBlock,
  img: InlineImage,
};
