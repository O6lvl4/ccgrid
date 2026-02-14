import { memo } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { rehypeTwemoji } from '../../utils/twemoji';
import { markdownComponents } from '../CodeBlock';
import { cleanSdkOutput } from '../../utils/outputParser';

export const proseClass = 'prose prose-sm max-w-none prose-pre:bg-gray-100 prose-pre:border prose-pre:border-gray-200 prose-code:text-blue-600 prose-headings:text-gray-900 prose-p:text-gray-700 prose-li:text-gray-700 prose-strong:text-gray-900 prose-a:text-blue-600';

const remarkPlugins = [remarkGfm, remarkBreaks];
const rehypePlugins = [rehypeTwemoji];

export const MemoMarkdown = memo(function MemoMarkdown({ content, bare }: { content: string; bare?: boolean }) {
  const md = (
    <Markdown remarkPlugins={remarkPlugins} rehypePlugins={rehypePlugins} components={markdownComponents}>
      {cleanSdkOutput(content)}
    </Markdown>
  );
  if (bare) return md;
  return <div className={proseClass}>{md}</div>;
});
