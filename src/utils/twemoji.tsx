import React from 'react';

// Matches emoji characters (Extended_Pictographic + keycap sequences + flag sequences + variation selectors)
const EMOJI_RE = /(\p{Extended_Pictographic}(?:\uFE0F?\u20E3|\uFE0F|[\u{1F3FB}-\u{1F3FF}]|[\u{E0020}-\u{E007E}]+\u{E007F})?(?:\u200D\p{Extended_Pictographic}(?:\uFE0F?|\u20E3|[\u{1F3FB}-\u{1F3FF}]|[\u{E0020}-\u{E007E}]+\u{E007F})?)*)/gu;

function toCodePoint(emoji: string): string {
  const cps: string[] = [];
  for (const ch of emoji) {
    const cp = ch.codePointAt(0);
    if (cp !== undefined && cp !== 0xfe0f) {
      cps.push(cp.toString(16));
    }
  }
  return cps.join('-');
}

const BASE = 'https://cdn.jsdelivr.net/gh/jdecked/twemoji@latest/assets/svg/';

/** Get Twemoji SVG URL for a single emoji */
export function twemojiUrl(emoji: string): string {
  return `${BASE}${toCodePoint(emoji)}.svg`;
}

/** Render a single emoji as a Twemoji <img> */
export function TwemojiIcon({ emoji, size = '1em' }: { emoji: string; size?: string | number }) {
  return (
    <img
      src={twemojiUrl(emoji)}
      alt={emoji}
      className="emoji"
      draggable={false}
      style={{ height: size, width: size }}
    />
  );
}

/**
 * Replace emoji in a text string with Twemoji <img> elements.
 * Returns an array of React nodes (strings + img elements).
 */
export function replaceEmoji(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  EMOJI_RE.lastIndex = 0;
  while ((match = EMOJI_RE.exec(text)) !== null) {
    const emoji = match[1];
    const idx = match.index;

    if (idx > lastIndex) {
      parts.push(text.slice(lastIndex, idx));
    }

    parts.push(
      <img
        key={`${idx}-${emoji}`}
        src={twemojiUrl(emoji)}
        alt={emoji}
        className="emoji"
        draggable={false}
      />,
    );

    lastIndex = idx + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
}

/**
 * rehype plugin for react-markdown: replaces emoji text nodes with <img> elements
 * within the AST, so React controls all DOM nodes (no post-render mutation).
 */
export function rehypeTwemoji() {
  return (tree: any) => {
    visitTextNodes(tree);
  };
}

function visitTextNodes(node: any) {
  if (!node.children) return;

  const newChildren: any[] = [];
  let changed = false;

  for (const child of node.children) {
    if (child.type === 'text' && typeof child.value === 'string') {
      const parts = splitEmoji(child.value);
      if (parts.length > 1) {
        changed = true;
        for (const part of parts) {
          if (part.isEmoji) {
            newChildren.push({
              type: 'element',
              tagName: 'img',
              properties: {
                src: twemojiUrl(part.text),
                alt: part.text,
                className: 'emoji',
                draggable: false,
              },
              children: [],
            });
          } else {
            newChildren.push({ type: 'text', value: part.text });
          }
        }
      } else {
        newChildren.push(child);
      }
    } else {
      visitTextNodes(child);
      newChildren.push(child);
    }
  }

  if (changed) {
    node.children = newChildren;
  }
}

function splitEmoji(text: string): { text: string; isEmoji: boolean }[] {
  const result: { text: string; isEmoji: boolean }[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  EMOJI_RE.lastIndex = 0;
  while ((match = EMOJI_RE.exec(text)) !== null) {
    const idx = match.index;
    if (idx > lastIndex) {
      result.push({ text: text.slice(lastIndex, idx), isEmoji: false });
    }
    result.push({ text: match[1], isEmoji: true });
    lastIndex = idx + match[0].length;
  }

  if (lastIndex < text.length) {
    result.push({ text: text.slice(lastIndex), isEmoji: false });
  }

  return result;
}
