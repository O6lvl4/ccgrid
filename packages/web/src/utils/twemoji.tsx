import React from 'react';

/**
 * Global error handler for emoji <img> elements.
 * When a Twemoji SVG fails to load (404), replace the <img> with the alt text.
 * Must be called once at app startup.
 */
export function installEmojiErrorHandler() {
  document.addEventListener('error', (e) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'IMG' && target.classList.contains('emoji')) {
      const alt = (target as HTMLImageElement).alt;
      if (alt) {
        const span = document.createElement('span');
        span.textContent = alt;
        target.replaceWith(span);
      }
    }
  }, true); // useCapture to catch errors from img elements
}

// Matches emoji characters:
// - Keycap sequences: [0-9#*] + FE0F? + 20E3
// - Extended_Pictographic with modifiers, ZWJ sequences, flag sequences
const EMOJI_RE = /([0-9#*]\uFE0F?\u20E3|\p{Extended_Pictographic}(?:\uFE0F|[\u{1F3FB}-\u{1F3FF}]|[\u{E0020}-\u{E007E}]+\u{E007F})?(?:\u200D(?:[0-9#*]\uFE0F?\u20E3|\p{Extended_Pictographic}(?:\uFE0F|[\u{1F3FB}-\u{1F3FF}]|[\u{E0020}-\u{E007E}]+\u{E007F})))*)/gu;

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

/** Render a single emoji as a Twemoji <img>, falling back to text on load error */
export function TwemojiIcon({ emoji, size = '1em' }: { emoji: string; size?: string | number }) {
  return (
    <img
      src={twemojiUrl(emoji)}
      alt={emoji}
      className="emoji"
      draggable={false}
      style={{ height: size, width: size }}
      onError={(e) => {
        const span = document.createElement('span');
        span.textContent = emoji;
        (e.target as HTMLElement).replaceWith(span);
      }}
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
        onError={(e) => {
          const span = document.createElement('span');
          span.textContent = emoji;
          (e.target as HTMLElement).replaceWith(span);
        }}
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
interface HastNode {
  type: string;
  tagName?: string;
  value?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
}

export function rehypeTwemoji() {
  return (tree: HastNode) => {
    visitTextNodes(tree);
  };
}

/**
 * Post-render DOM-based Twemoji replacement.
 * Walk all text nodes inside a container and replace emoji chars with <img>.
 * Designed to run asynchronously after the initial paint so it doesn't block rendering.
 */
export function applyTwemojiToElement(container: HTMLElement): void {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];
  while (walker.nextNode()) {
    textNodes.push(walker.currentNode as Text);
  }

  for (const node of textNodes) {
    const text = node.textContent ?? '';
    EMOJI_RE.lastIndex = 0;
    if (!EMOJI_RE.test(text)) continue;

    EMOJI_RE.lastIndex = 0;
    const fragment = document.createDocumentFragment();
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = EMOJI_RE.exec(text)) !== null) {
      const emoji = match[1];
      const idx = match.index;

      if (idx > lastIndex) {
        fragment.appendChild(document.createTextNode(text.slice(lastIndex, idx)));
      }

      const img = document.createElement('img');
      img.src = twemojiUrl(emoji);
      img.alt = emoji;
      img.className = 'emoji';
      img.draggable = false;
      fragment.appendChild(img);

      lastIndex = idx + match[0].length;
    }

    if (lastIndex < text.length) {
      fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
    }

    node.replaceWith(fragment);
  }
}

function emojiPartToNode(part: { text: string; isEmoji: boolean }): HastNode {
  if (part.isEmoji) {
    return {
      type: 'element',
      tagName: 'img',
      properties: {
        src: twemojiUrl(part.text),
        alt: part.text,
        className: 'emoji',
        draggable: false,
      },
      children: [],
    };
  }
  return { type: 'text', value: part.text };
}

function expandTextChild(child: HastNode): { nodes: HastNode[]; changed: boolean } {
  if (child.type !== 'text' || typeof child.value !== 'string') {
    return { nodes: [child], changed: false };
  }
  const parts = splitEmoji(child.value);
  if (parts.length <= 1) return { nodes: [child], changed: false };
  return { nodes: parts.map(emojiPartToNode), changed: true };
}

function visitTextNodes(node: HastNode) {
  if (!node.children) return;

  const newChildren: HastNode[] = [];
  let changed = false;

  for (const child of node.children) {
    const result = expandTextChild(child);
    if (result.changed) {
      changed = true;
      newChildren.push(...result.nodes);
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
