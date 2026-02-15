/**
 * Detects line-numbered output:
 *   "     1\tline content"  (tab separator — cat -n)
 *   "     1→line content"   (→ U+2192 separator — Claude Code)
 *   "1371:line content"     (colon separator — grep match lines)
 *   "1372-line content"     (dash separator — grep context lines)
 */
export const LINE_NUM_RE = /^(\s*\d+)[\t\u2192:\-](.*)$/;

export function hasLineNumbers(code: string): boolean {
  const lines = code.split('\n').filter(l => l.length > 0);
  if (lines.length < 2) return false;
  const matching = lines.filter(l => LINE_NUM_RE.test(l)).length;
  return matching / lines.length >= 0.8;
}

export function stripLineNumbers(code: string): { nums: string[]; content: string } {
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

const LANGUAGE_PATTERNS: [RegExp, string][] = [
  [/^(import |from |export |const |let |var |function |class |=>)/, 'typescript'],
  [/^(def |class |import |from |if __name__)/, 'python'],
  [/^(<\?php|namespace |use )/, 'php'],
  [/^(package |func |import \()/, 'go'],
  [/^(#include|int main|void )/, 'c'],
  [/^(<!DOCTYPE|<html|<div)/, 'html'],
  [/^(apiVersion:|kind:|metadata:)/, 'yaml'],
  [/^(FROM |RUN |COPY |CMD )/, 'dockerfile'],
  [/^(SELECT |INSERT |CREATE |ALTER |DROP )/i, 'sql'],
  [/^(#!\/|if \[|for |while |echo |export )/, 'bash'],
  [/^(@description|param |targetScope)/, 'typescript'],
];

export function guessLanguage(code: string): string {
  const first = code.trimStart().slice(0, 200);
  if (/^\{/.test(first) && /\}$/.test(code.trimEnd())) return 'json';
  return LANGUAGE_PATTERNS.find(([re]) => re.test(first))?.[1] ?? 'text';
}
