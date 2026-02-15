import { describe, it, expect } from 'vitest';
import {
  LINE_NUM_RE,
  hasLineNumbers,
  stripLineNumbers,
  guessLanguage,
} from '../lib/codeBlockUtils';

// ===========================================================================
// LINE_NUM_RE
// ===========================================================================
describe('LINE_NUM_RE', () => {
  it('タブ区切り（cat -n形式）にマッチ', () => {
    const m = '     1\tline content'.match(LINE_NUM_RE);
    expect(m).not.toBeNull();
    expect(m![1]).toBe('     1');
    expect(m![2]).toBe('line content');
  });

  it('→区切り（Claude Code形式）にマッチ', () => {
    const m = '1→line content'.match(LINE_NUM_RE);
    expect(m).not.toBeNull();
    expect(m![1]).toBe('1');
    expect(m![2]).toBe('line content');
  });

  it('コロン区切り（grepマッチ形式）にマッチ', () => {
    const m = '42:matched line'.match(LINE_NUM_RE);
    expect(m).not.toBeNull();
    expect(m![1]).toBe('42');
    expect(m![2]).toBe('matched line');
  });

  it('ダッシュ区切り（grepコンテキスト形式）にマッチ', () => {
    const m = '42-context line'.match(LINE_NUM_RE);
    expect(m).not.toBeNull();
    expect(m![1]).toBe('42');
    expect(m![2]).toBe('context line');
  });

  it('先頭スペース+行番号+タブ', () => {
    const m = '  123\tcontent'.match(LINE_NUM_RE);
    expect(m).not.toBeNull();
    expect(m![1]).toBe('  123');
    expect(m![2]).toBe('content');
  });

  it('数字なしにはマッチしない', () => {
    expect('no numbers here'.match(LINE_NUM_RE)).toBeNull();
  });

  it('空行にはマッチしない', () => {
    expect(''.match(LINE_NUM_RE)).toBeNull();
  });
});

// ===========================================================================
// hasLineNumbers
// ===========================================================================
describe('hasLineNumbers', () => {
  it('80%以上が行番号形式なら true', () => {
    const code = '     1\ta\n     2\tb\n     3\tc\n     4\td\n     5\te';
    expect(hasLineNumbers(code)).toBe(true);
  });

  it('100%が行番号形式', () => {
    const code = '1→a\n2→b\n3→c';
    expect(hasLineNumbers(code)).toBe(true);
  });

  it('1行だけ → false（2行以上必要）', () => {
    expect(hasLineNumbers('     1\tcontent')).toBe(false);
  });

  it('空文字列 → false', () => {
    expect(hasLineNumbers('')).toBe(false);
  });

  it('行番号なしのコード → false', () => {
    const code = 'function foo() {\n  return 42;\n}';
    expect(hasLineNumbers(code)).toBe(false);
  });

  it('80%未満だと false', () => {
    // 5行中3行(60%)が行番号 → false
    const code = '     1\ta\n     2\tb\n     3\tc\nplain\nplain2';
    expect(hasLineNumbers(code)).toBe(false);
  });

  it('ちょうど80%で true', () => {
    // 5行中4行(80%)が行番号
    const code = '     1\ta\n     2\tb\n     3\tc\n     4\td\nplain';
    expect(hasLineNumbers(code)).toBe(true);
  });

  it('空行はフィルタされる', () => {
    const code = '     1\ta\n\n     2\tb\n\n     3\tc';
    expect(hasLineNumbers(code)).toBe(true);
  });
});

// ===========================================================================
// stripLineNumbers
// ===========================================================================
describe('stripLineNumbers', () => {
  it('行番号を除去してnumsとcontentを返す', () => {
    const code = '     1\tfunction foo() {\n     2\t  return 42;\n     3\t}';
    const result = stripLineNumbers(code);
    expect(result.nums).toEqual(['1', '2', '3']);
    expect(result.content).toBe('function foo() {\n  return 42;\n}');
  });

  it('→区切りの行番号除去', () => {
    const code = '1→first\n2→second';
    const result = stripLineNumbers(code);
    expect(result.nums).toEqual(['1', '2']);
    expect(result.content).toBe('first\nsecond');
  });

  it('行番号なし行はそのまま保持', () => {
    const code = '     1\ta\nplain line\n     3\tc';
    const result = stripLineNumbers(code);
    expect(result.nums).toEqual(['1', '', '3']);
    expect(result.content).toBe('a\nplain line\nc');
  });

  it('末尾改行を正しく処理', () => {
    const code = '     1\ta\n     2\tb\n';
    const result = stripLineNumbers(code);
    expect(result.nums).toEqual(['1', '2']);
    expect(result.content).toBe('a\nb');
  });

  it('grep形式（コロン区切り）', () => {
    const code = '10:matched\n11:also matched';
    const result = stripLineNumbers(code);
    expect(result.nums).toEqual(['10', '11']);
    expect(result.content).toBe('matched\nalso matched');
  });

  it('単一行', () => {
    const code = '     1\tonly line';
    const result = stripLineNumbers(code);
    expect(result.nums).toEqual(['1']);
    expect(result.content).toBe('only line');
  });
});

// ===========================================================================
// guessLanguage
// ===========================================================================
describe('guessLanguage', () => {
  it('import文 → typescript', () => {
    expect(guessLanguage('import React from "react";\nconst x = 1;')).toBe('typescript');
  });

  it('export文 → typescript', () => {
    expect(guessLanguage('export function foo() {}')).toBe('typescript');
  });

  it('const文 → typescript', () => {
    expect(guessLanguage('const x = 42;')).toBe('typescript');
  });

  it('def文 → python', () => {
    expect(guessLanguage('def hello():\n    pass')).toBe('python');
  });

  it('<?php → php', () => {
    expect(guessLanguage('<?php\necho "hello";')).toBe('php');
  });

  it('package → go', () => {
    expect(guessLanguage('package main\n\nfunc main() {}')).toBe('go');
  });

  it('func → go', () => {
    expect(guessLanguage('func main() {\n\tfmt.Println("hi")\n}')).toBe('go');
  });

  it('#include → c', () => {
    expect(guessLanguage('#include <stdio.h>\nint main() {}')).toBe('c');
  });

  it('<!DOCTYPE → html', () => {
    expect(guessLanguage('<!DOCTYPE html>\n<html>')).toBe('html');
  });

  it('apiVersion → yaml', () => {
    expect(guessLanguage('apiVersion: v1\nkind: Pod')).toBe('yaml');
  });

  it('FROM → dockerfile', () => {
    expect(guessLanguage('FROM node:18\nRUN npm install')).toBe('dockerfile');
  });

  it('SELECT → sql', () => {
    expect(guessLanguage('SELECT * FROM users WHERE id = 1')).toBe('sql');
  });

  it('#!/bin/bash → bash', () => {
    expect(guessLanguage('#!/bin/bash\necho "hello"')).toBe('bash');
  });

  it('JSONオブジェクト → json', () => {
    expect(guessLanguage('{"key": "value"}')).toBe('json');
  });

  it('JSONオブジェクト（整形済み）→ json', () => {
    expect(guessLanguage('{\n  "key": "value"\n}')).toBe('json');
  });

  it('マッチしない場合 → text', () => {
    expect(guessLanguage('just some random text here')).toBe('text');
  });

  it('空文字列 → text', () => {
    expect(guessLanguage('')).toBe('text');
  });

  it('先頭の空白を無視して判定', () => {
    expect(guessLanguage('   \n  import foo from "bar"')).toBe('typescript');
  });
});
