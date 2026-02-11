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

const CODE_FONT = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';

/**
 * Detects `cat -n` style line-numbered output:
 *   "     1\tline content"  (tab separator)
 *   "     1→line content"   (→ U+2192 separator, used by Claude Code)
 */
const LINE_NUM_RE = /^(\s*\d+)[\t\u2192](.*)$/;

function hasLineNumbers(code: string): boolean {
  const lines = code.split('\n').filter(l => l.length > 0);
  if (lines.length < 2) return false;
  const matching = lines.filter(l => LINE_NUM_RE.test(l)).length;
  return matching / lines.length >= 0.8;
}

function stripLineNumbers(code: string): { nums: string[]; content: string } {
  const rawLines = code.endsWith('\n') ? code.slice(0, -1).split('\n') : code.split('\n');
  const nums: string[] = [];
  const contentLines: string[] = [];
  for (const line of rawLines) {
    const m = line.match(LINE_NUM_RE);
    if (m) {
      nums.push(m[1].trim());
      contentLines.push(m[2]);
    } else {
      nums.push('');
      contentLines.push(line);
    }
  }
  return { nums, content: contentLines.join('\n') };
}

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

/** Try to guess language from content heuristics */
function guessLanguage(code: string): string {
  const first = code.trimStart().slice(0, 200);
  if (/^(import |from |export |const |let |var |function |class |=>)/.test(first)) return 'typescript';
  if (/^(def |class |import |from |if __name__)/.test(first)) return 'python';
  if (/^(<\?php|namespace |use )/.test(first)) return 'php';
  if (/^(package |func |import \()/.test(first)) return 'go';
  if (/^(#include|int main|void )/.test(first)) return 'c';
  if (/^(<!DOCTYPE|<html|<div)/.test(first)) return 'html';
  if (/^\{/.test(first) && /\}$/.test(code.trimEnd())) return 'json';
  if (/^(apiVersion:|kind:|metadata:)/.test(first)) return 'yaml';
  if (/^(FROM |RUN |COPY |CMD )/.test(first)) return 'dockerfile';
  if (/^(SELECT |INSERT |CREATE |ALTER |DROP )/i.test(first)) return 'sql';
  if (/^#!\//.test(first) || /^(if \[|for |while |echo |export )/.test(first)) return 'bash';
  if (/^(@description|param |targetScope)/.test(first)) return 'typescript';
  return 'text';
}

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

/** Components object to pass to react-markdown */
export const markdownComponents = {
  code: CodeBlock,
};
