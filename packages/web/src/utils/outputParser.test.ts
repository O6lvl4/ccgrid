import { describe, it, expect } from 'vitest';
import {
  SEPARATOR,
  LEGACY_SEPARATOR,
  SDK_TAG_RE,
  wrapLineNumberedBlocks,
  cleanSdkOutput,
  parseSegments,
  hasUnclosedFence,
  splitIntoChunks,
} from './outputParser';

// ===========================================================================
// wrapLineNumberedBlocks
// ===========================================================================
describe('wrapLineNumberedBlocks', () => {
  it('行番号付き3行以上のブロックをコードフェンスで囲む', () => {
    const input = '     1\tfoo\n     2\tbar\n     3\tbaz';
    const result = wrapLineNumberedBlocks(input);
    expect(result).toBe('```\n     1\tfoo\n     2\tbar\n     3\tbaz\n```');
  });

  it('行番号付き2行以下はフェンスで囲まない', () => {
    const input = '     1\tfoo\n     2\tbar';
    const result = wrapLineNumberedBlocks(input);
    expect(result).toBe(input);
  });

  it('コードフェンス内の行番号はラップしない', () => {
    const input = '```\n     1\tfoo\n     2\tbar\n     3\tbaz\n```';
    const result = wrapLineNumberedBlocks(input);
    expect(result).toBe(input);
  });

  it('→区切り（Claude Code形式）も検出', () => {
    const input = '1→line1\n2→line2\n3→line3';
    const result = wrapLineNumberedBlocks(input);
    expect(result).toContain('```');
  });

  it('コロン区切り（grep形式）も検出', () => {
    const input = '10:match1\n11:match2\n12:match3';
    const result = wrapLineNumberedBlocks(input);
    expect(result).toContain('```');
  });

  it('ダッシュ区切り（grepコンテキスト形式）も検出', () => {
    const input = '10-ctx1\n11-ctx2\n12-ctx3';
    const result = wrapLineNumberedBlocks(input);
    expect(result).toContain('```');
  });

  it('行番号ブロックと通常テキストが混在', () => {
    const input = 'Some text\n     1\tfoo\n     2\tbar\n     3\tbaz\nMore text';
    const result = wrapLineNumberedBlocks(input);
    expect(result).toBe('Some text\n```\n     1\tfoo\n     2\tbar\n     3\tbaz\n```\nMore text');
  });

  it('空文字列', () => {
    expect(wrapLineNumberedBlocks('')).toBe('');
  });

  it('行番号なしテキストはそのまま返す', () => {
    const input = 'Hello world\nNo line numbers here';
    expect(wrapLineNumberedBlocks(input)).toBe(input);
  });

  it('複数の行番号ブロックを個別にラップ', () => {
    const input = '     1\ta\n     2\tb\n     3\tc\nplain\n     10\tx\n     11\ty\n     12\tz';
    const result = wrapLineNumberedBlocks(input);
    const parts = result.split('plain');
    expect(parts[0].trim()).toBe('```\n     1\ta\n     2\tb\n     3\tc\n```');
    expect(parts[1].trim()).toBe('```\n     10\tx\n     11\ty\n     12\tz\n```');
  });
});

// ===========================================================================
// cleanSdkOutput
// ===========================================================================
describe('cleanSdkOutput', () => {
  it('antml:プレフィックス付きタグを除去する', () => {
    const tag = 'antml:invoke';
    const input = `hello <${tag}>world</${tag}> end`;
    const result = cleanSdkOutput(input);
    expect(result).not.toContain(`<${tag}>`);
    expect(result).not.toContain(`</${tag}>`);
  });

  it('tool_use_errorタグを除去する', () => {
    const input = 'before <tool_use_error>err</tool_use_error> after';
    const result = cleanSdkOutput(input);
    expect(result).not.toContain('<tool_use_error>');
  });

  it('system-reminderタグを除去する', () => {
    const input = 'text <system-reminder>reminder</system-reminder> more';
    const result = cleanSdkOutput(input);
    expect(result).not.toContain('<system-reminder>');
  });

  it('3つ以上連続する改行を2つに正規化', () => {
    const input = 'a\n\n\n\nb';
    const result = cleanSdkOutput(input);
    expect(result).toBe('a\n\nb');
  });

  it('行番号ブロックもラップする（cleanSdkOutput経由）', () => {
    const input = '     1\tfoo\n     2\tbar\n     3\tbaz';
    const result = cleanSdkOutput(input);
    expect(result).toContain('```');
  });

  it('空文字列', () => {
    expect(cleanSdkOutput('')).toBe('');
  });
});

// ===========================================================================
// SDK_TAG_RE
// ===========================================================================
describe('SDK_TAG_RE', () => {
  it('自己閉じタグにマッチ', () => {
    const tag = 'antml:thinking';
    expect(`<${tag}/>`.replace(new RegExp(SDK_TAG_RE.source, 'g'), '')).toBe('');
  });

  it('通常のHTMLタグにはマッチしない', () => {
    const input = '<div>hello</div>';
    expect(input.replace(new RegExp(SDK_TAG_RE.source, 'g'), '')).toBe(input);
  });
});

// ===========================================================================
// parseSegments
// ===========================================================================
describe('parseSegments', () => {
  it('セパレータなし → initialのみ', () => {
    const result = parseSegments('Hello world');
    expect(result.initial).toBe('Hello world');
    expect(result.followUps).toHaveLength(0);
  });

  it('空文字列', () => {
    const result = parseSegments('');
    expect(result.initial).toBe('');
    expect(result.followUps).toHaveLength(0);
  });

  it('SEPARATORでフォローアップを分割', () => {
    const input = `Initial response${SEPARATOR}> User question\nAssistant response`;
    const result = parseSegments(input);
    expect(result.initial).toBe('Initial response');
    expect(result.followUps).toHaveLength(1);
    expect(result.followUps[0].userPrompt).toBe('User question');
    expect(result.followUps[0].response).toBe('Assistant response');
  });

  it('LEGACY_SEPARATORでもフォローアップを分割', () => {
    const input = `Initial${LEGACY_SEPARATOR}> Old question\nOld response`;
    const result = parseSegments(input);
    expect(result.initial).toBe('Initial');
    expect(result.followUps).toHaveLength(1);
    expect(result.followUps[0].userPrompt).toBe('Old question');
    expect(result.followUps[0].response).toBe('Old response');
  });

  it('複数のフォローアップ', () => {
    const input = `Init${SEPARATOR}> Q1\nA1${SEPARATOR}> Q2\nA2`;
    const result = parseSegments(input);
    expect(result.initial).toBe('Init');
    expect(result.followUps).toHaveLength(2);
    expect(result.followUps[0].userPrompt).toBe('Q1');
    expect(result.followUps[0].response).toBe('A1');
    expect(result.followUps[1].userPrompt).toBe('Q2');
    expect(result.followUps[1].response).toBe('A2');
  });

  it('複数行の引用ブロック', () => {
    const input = `Init${SEPARATOR}> Line 1\n> Line 2\nResponse`;
    const result = parseSegments(input);
    expect(result.followUps[0].userPrompt).toBe('Line 1\nLine 2');
    expect(result.followUps[0].response).toBe('Response');
  });

  it('引用なしフォローアップ', () => {
    const input = `Init${SEPARATOR}Just a response without quote`;
    const result = parseSegments(input);
    expect(result.followUps).toHaveLength(1);
    expect(result.followUps[0].userPrompt).toBe('');
    expect(result.followUps[0].response).toBe('Just a response without quote');
  });

  it('空のフォローアップパートはスキップ', () => {
    const input = `Init${SEPARATOR}${SEPARATOR}> Q\nA`;
    const result = parseSegments(input);
    expect(result.followUps).toHaveLength(1);
    expect(result.followUps[0].userPrompt).toBe('Q');
  });
});

// ===========================================================================
// hasUnclosedFence
// ===========================================================================
describe('hasUnclosedFence', () => {
  it('フェンスなし → false', () => {
    expect(hasUnclosedFence('plain text')).toBe(false);
  });

  it('開いて閉じたフェンス → false', () => {
    expect(hasUnclosedFence('```\ncode\n```')).toBe(false);
  });

  it('開いたまま → true', () => {
    expect(hasUnclosedFence('```\ncode')).toBe(true);
  });

  it('2回開いて1回閉じ → true', () => {
    expect(hasUnclosedFence('```\ncode\n```\n```\nmore')).toBe(true);
  });

  it('2回開いて2回閉じ → false', () => {
    expect(hasUnclosedFence('```\na\n```\n```\nb\n```')).toBe(false);
  });

  it('空文字列 → false', () => {
    expect(hasUnclosedFence('')).toBe(false);
  });

  it('言語指定付きフェンスも検出', () => {
    expect(hasUnclosedFence('```typescript\ncode')).toBe(true);
  });
});

// ===========================================================================
// splitIntoChunks
// ===========================================================================
describe('splitIntoChunks', () => {
  it('空文字列 → 空配列', () => {
    expect(splitIntoChunks('')).toEqual([]);
  });

  it('CHUNK_SIZE以下 → 1チャンク', () => {
    const small = 'a'.repeat(100);
    const result = splitIntoChunks(small);
    expect(result).toHaveLength(1);
    expect(result[0]).toBe(small);
  });

  it('大きなテキストは複数チャンクに分割', () => {
    const large = Array.from({ length: 200 }, (_, i) => `Line ${i}: ${'x'.repeat(30)}`).join('\n\n');
    const result = splitIntoChunks(large);
    expect(result.length).toBeGreaterThan(1);
    // 全チャンクを結合すると元テキストに戻る
    expect(result.join('')).toBe(large);
  });

  it('コードフェンスの途中で分割しない', () => {
    const fence = '```\n' + 'x\n'.repeat(300) + '```';
    const text = 'before\n\n' + fence + '\n\nafter';
    const result = splitIntoChunks(text);
    // フェンスが分断されていないことを確認
    for (const chunk of result) {
      expect(hasUnclosedFence(chunk)).toBe(false);
    }
  });

  it('閉じフェンスがない場合は残り全部を1チャンクに', () => {
    const text = 'start\n\n```\n' + 'x\n'.repeat(500);
    const result = splitIntoChunks(text);
    // 最後のチャンクにフェンスが開いたまま含まれる
    const lastChunk = result[result.length - 1];
    expect(lastChunk).toContain('```');
  });

  it('分割しても内容が欠落しない', () => {
    const text = Array.from({ length: 100 }, (_, i) => `Paragraph ${i}\n${'word '.repeat(50)}`).join('\n\n');
    const result = splitIntoChunks(text);
    expect(result.join('')).toBe(text);
  });
});
