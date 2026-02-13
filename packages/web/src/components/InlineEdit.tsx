import { useState, useRef, useEffect } from 'react';

interface InlineEditProps {
  value: string;
  onSave: (value: string) => void;
  fontSize?: number;
  fontWeight?: React.CSSProperties['fontWeight'];
}

export function InlineEdit({ value, onSave, fontSize = 13, fontWeight = '600' }: InlineEditProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== value) {
      onSave(trimmed);
    } else {
      setDraft(value);
    }
    setEditing(false);
  };

  const cancel = () => {
    setDraft(value);
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') cancel();
        }}
        style={{
          fontSize,
          fontWeight,
          color: '#1a1d24',
          background: 'transparent',
          border: 'none',
          borderBottom: '2px solid #0ab9e6',
          outline: 'none',
          padding: '2px 0',
          lineHeight: 1.3,
          fontFamily: 'inherit',
        }}
      />
    );
  }

  return (
    <span
      onClick={() => setEditing(true)}
      style={{
        fontSize,
        fontWeight,
        color: '#1a1d24',
        cursor: 'pointer',
        borderBottom: '1px solid transparent',
        transition: 'border-color 0.15s',
        lineHeight: 1.3,
      }}
      onMouseEnter={e => { e.currentTarget.style.borderBottomColor = '#d1d5db'; }}
      onMouseLeave={e => { e.currentTarget.style.borderBottomColor = 'transparent'; }}
    >
      {value}
    </span>
  );
}
