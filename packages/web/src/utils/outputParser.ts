export const SEPARATOR = '\n\n<!-- follow-up -->\n\n';
export const LEGACY_SEPARATOR = '\n\n---\n\n';

export const SDK_TAG_RE = /<\/?(?:tool_use_error|antml:[a-z_]+|system-reminder)[^>]*>|<(?:tool_use_error|antml:[a-z_]+|system-reminder)[^>]*\/>/g;

// ---------------------------------------------------------------------------
// Line-number detection — matches cat -n, Claude Code (→), grep (: / -)
// ---------------------------------------------------------------------------
const LINE_NUM_DETECT_RE = /^\s*\d+[\t\u2192:\-]/;

/**
 * Scans text for blocks of consecutive line-numbered lines that are NOT
 * already inside a fenced code block. Wraps qualifying blocks (≥3 lines)
 * in triple-backtick fences so react-markdown treats them as <code>.
 */
function wrapLineNumberedBlocks(text: string): string {
  const lines = text.split('\n');
  const output: string[] = [];
  let inFence = false;
  let numberedBlock: string[] = [];

  function flushBlock() {
    if (numberedBlock.length >= 3) {
      output.push('```');
      output.push(...numberedBlock);
      output.push('```');
    } else {
      output.push(...numberedBlock);
    }
    numberedBlock = [];
  }

  for (const line of lines) {
    if (line.startsWith('```')) {
      if (numberedBlock.length > 0) flushBlock();
      inFence = !inFence;
      output.push(line);
      continue;
    }

    if (inFence) {
      output.push(line);
      continue;
    }

    if (LINE_NUM_DETECT_RE.test(line)) {
      numberedBlock.push(line);
    } else {
      if (numberedBlock.length > 0) flushBlock();
      output.push(line);
    }
  }

  if (numberedBlock.length > 0) flushBlock();

  return output.join('\n');
}

export function cleanSdkOutput(text: string): string {
  const cleaned = text.replace(SDK_TAG_RE, '').replace(/\n{3,}/g, '\n\n');
  return wrapLineNumberedBlocks(cleaned);
}

// ---------------------------------------------------------------------------
// Segment parsing
// ---------------------------------------------------------------------------
export interface ParsedSegments {
  initial: string;
  followUps: { userPrompt: string; response: string }[];
}

export function parseSegments(output: string): ParsedSegments {
  if (!output) return { initial: '', followUps: [] };

  let parts: string[];
  if (output.includes(SEPARATOR)) {
    parts = output.split(SEPARATOR);
  } else if (output.includes(LEGACY_SEPARATOR)) {
    parts = output.split(LEGACY_SEPARATOR);
  } else {
    parts = [output];
  }

  const followUps: { userPrompt: string; response: string }[] = [];
  for (let i = 1; i < parts.length; i++) {
    const part = parts[i].trim();
    if (!part) continue;
    const lines = part.split('\n');
    const quoteLines: string[] = [];
    let restStart = 0;
    for (let j = 0; j < lines.length; j++) {
      if (lines[j].startsWith('> ')) {
        quoteLines.push(lines[j].slice(2));
        restStart = j + 1;
      } else if (quoteLines.length > 0) {
        break;
      } else {
        break;
      }
    }
    const userPrompt = quoteLines.join('\n');
    const response = lines.slice(restStart).join('\n').trim();
    followUps.push({ userPrompt, response });
  }

  return {
    initial: parts[0] ?? '',
    followUps,
  };
}

// ---------------------------------------------------------------------------
// Chunk splitting — respects code fence boundaries
// ---------------------------------------------------------------------------
const CHUNK_SIZE = 3000;

/**
 * Count opening/closing code fences (lines starting with ```) in a text range.
 * Returns true if the number of fences is odd (i.e. we're inside an unclosed fence).
 */
function hasUnclosedFence(text: string): boolean {
  let count = 0;
  let idx = 0;
  while (idx < text.length) {
    const nl = text.indexOf('\n', idx);
    const lineEnd = nl === -1 ? text.length : nl;
    const line = text.slice(idx, lineEnd);
    if (line.startsWith('```')) count++;
    idx = lineEnd + 1;
  }
  return count % 2 !== 0;
}

export function splitIntoChunks(content: string): string[] {
  if (!content) return [];
  if (content.length <= CHUNK_SIZE) return [content];

  const chunks: string[] = [];
  let pos = 0;

  while (pos < content.length) {
    if (pos + CHUNK_SIZE >= content.length) {
      chunks.push(content.slice(pos));
      break;
    }

    // Find paragraph boundary near CHUNK_SIZE
    let breakAt = content.indexOf('\n\n', pos + CHUNK_SIZE - 400);
    if (breakAt === -1 || breakAt > pos + CHUNK_SIZE + 400) {
      breakAt = pos + CHUNK_SIZE;
    } else {
      breakAt += 2; // include the \n\n
    }

    // Ensure we don't split inside a code fence
    const segment = content.slice(pos, breakAt);
    if (hasUnclosedFence(segment)) {
      // Find the closing fence after breakAt
      const searchFrom = breakAt;
      let closingPos = content.indexOf('\n```', searchFrom);
      if (closingPos !== -1) {
        // Move past the closing fence line
        const afterFence = content.indexOf('\n', closingPos + 4);
        breakAt = afterFence === -1 ? content.length : afterFence + 1;
      } else {
        // No closing fence — include everything remaining
        chunks.push(content.slice(pos));
        break;
      }
    }

    chunks.push(content.slice(pos, breakAt));
    pos = breakAt;
  }

  return chunks;
}
