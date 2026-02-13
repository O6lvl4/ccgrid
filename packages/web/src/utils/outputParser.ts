export const SEPARATOR = '\n\n<!-- follow-up -->\n\n';
export const LEGACY_SEPARATOR = '\n\n---\n\n';

export const SDK_TAG_RE = /<\/?(?:tool_use_error|antml:[a-z_]+|system-reminder)[^>]*>|<(?:tool_use_error|antml:[a-z_]+|system-reminder)[^>]*\/>/g;

export function cleanSdkOutput(text: string): string {
  return text.replace(SDK_TAG_RE, '').replace(/\n{3,}/g, '\n\n');
}

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
