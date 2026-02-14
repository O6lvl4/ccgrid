import { useState } from 'react';
import { useStore } from '../store/useStore';
import { useApi } from '../hooks/useApi';
import type { PermissionRule } from '@ccgrid/shared';

export function PermissionRulesPanel() {
  const rules = useStore(s => s.permissionRules);
  const api = useApi();
  const [adding, setAdding] = useState(false);
  const [toolName, setToolName] = useState('');
  const [pathPattern, setPathPattern] = useState('');
  const [behavior, setBehavior] = useState<'allow' | 'deny'>('allow');

  const handleAdd = async () => {
    if (!toolName.trim()) return;
    try {
      await api.createPermissionRule({
        toolName: toolName.trim(),
        ...(pathPattern.trim() ? { pathPattern: pathPattern.trim() } : {}),
        behavior,
      });
      setToolName('');
      setPathPattern('');
      setAdding(false);
    } catch (err) {
      console.error('Failed to create rule:', err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deletePermissionRule(id);
    } catch (err) {
      console.error('Failed to delete rule:', err);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    boxSizing: 'border-box',
    padding: '8px 12px',
    borderRadius: 10,
    border: '1px solid #e5e7eb',
    background: '#fff',
    color: '#1a1d24',
    fontSize: 12,
    fontFamily: 'monospace',
    outline: 'none',
    transition: 'border-color 0.15s',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {rules.length === 0 && !adding && (
        <span style={{ fontSize: 12, color: '#b0b8c4', fontStyle: 'italic' }}>
          No rules configured. Rules auto-approve or deny tool requests.
        </span>
      )}

      {rules.map(rule => (
        <RuleRow key={rule.id} rule={rule} onDelete={handleDelete} />
      ))}

      {adding && (
        <AddRuleForm
          toolName={toolName} setToolName={setToolName}
          pathPattern={pathPattern} setPathPattern={setPathPattern}
          behavior={behavior} setBehavior={setBehavior}
          inputStyle={inputStyle}
          onCancel={() => setAdding(false)} onAdd={handleAdd}
        />
      )}
      {!adding && (
        <button
          onClick={() => setAdding(true)}
          style={{
            alignSelf: 'flex-start',
            padding: '6px 16px',
            borderRadius: 12,
            border: 'none',
            background: '#f0f1f3',
            color: '#555e6b',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#e8eaed'; }}
          onMouseLeave={e => { e.currentTarget.style.background = '#f0f1f3'; }}
        >
          + Add Rule
        </button>
      )}
    </div>
  );
}

function BehaviorButton({ b, selected, onClick }: { b: string; selected: boolean; onClick: () => void }) {
  const color = b === 'allow' ? '#22c55e' : '#ef4444';
  return (
    <button
      onClick={onClick}
      style={{
        fontSize: 11, fontWeight: selected ? 700 : 500, padding: '5px 10px',
        borderRadius: 10, cursor: 'pointer', border: 'none',
        background: selected ? color : '#e8eaed', color: selected ? '#fff' : '#555e6b',
        textTransform: 'uppercase', letterSpacing: 0.3, transition: 'background 0.15s',
      }}
    >{b}</button>
  );
}

function AddRuleForm({ toolName, setToolName, pathPattern, setPathPattern, behavior, setBehavior, inputStyle, onCancel, onAdd }: {
  toolName: string; setToolName: (v: string) => void;
  pathPattern: string; setPathPattern: (v: string) => void;
  behavior: 'allow' | 'deny'; setBehavior: (v: 'allow' | 'deny') => void;
  inputStyle: React.CSSProperties; onCancel: () => void; onAdd: () => void;
}) {
  const canAdd = !!toolName.trim();
  return (
    <div style={{ background: '#f9fafb', border: '1px solid #f0f1f3', borderRadius: 14, padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          placeholder='Tool name (e.g. "Bash", "Write", "*")'
          value={toolName} onChange={e => setToolName(e.target.value)}
          style={{ ...inputStyle, flex: 1 }}
          onFocus={e => { e.currentTarget.style.borderColor = '#0ab9e6'; }}
          onBlur={e => { e.currentTarget.style.borderColor = '#e5e7eb'; }}
        />
        <div style={{ display: 'flex', gap: 4 }}>
          {(['allow', 'deny'] as const).map(b => (
            <BehaviorButton key={b} b={b} selected={behavior === b} onClick={() => setBehavior(b)} />
          ))}
        </div>
      </div>
      <input
        placeholder="Path pattern (optional, e.g. /etc/**)"
        value={pathPattern} onChange={e => setPathPattern(e.target.value)}
        style={inputStyle}
        onFocus={e => { e.currentTarget.style.borderColor = '#0ab9e6'; }}
        onBlur={e => { e.currentTarget.style.borderColor = '#e5e7eb'; }}
      />
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button onClick={onCancel} style={{ padding: '6px 16px', borderRadius: 12, border: 'none', background: '#e8eaed', color: '#555e6b', fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'background 0.15s' }}
          onMouseEnter={e => { e.currentTarget.style.background = '#dcdfe3'; }}
          onMouseLeave={e => { e.currentTarget.style.background = '#e8eaed'; }}
        >Cancel</button>
        <button onClick={onAdd} disabled={!canAdd} style={{
          padding: '6px 16px', borderRadius: 12, border: 'none',
          background: canAdd ? '#0ab9e6' : '#e8eaed', color: canAdd ? '#fff' : '#b0b8c4',
          fontSize: 12, fontWeight: 700, cursor: canAdd ? 'pointer' : 'default',
          transition: 'background 0.18s, box-shadow 0.18s',
          boxShadow: canAdd ? '0 2px 8px rgba(10, 185, 230, 0.25)' : 'none',
        }}
          onMouseEnter={e => { if (canAdd) e.currentTarget.style.background = '#09a8d2'; }}
          onMouseLeave={e => { if (canAdd) e.currentTarget.style.background = '#0ab9e6'; }}
        >Add Rule</button>
      </div>
    </div>
  );
}

function RuleRow({ rule, onDelete }: { rule: PermissionRule; onDelete: (id: string) => void }) {
  const isAllow = rule.behavior === 'allow';
  const color = isAllow ? '#22c55e' : '#ef4444';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        background: '#f9fafb',
        border: '1px solid #f0f1f3',
        borderRadius: 12,
        padding: '10px 16px',
      }}
    >
      <span style={{
        fontSize: 10,
        fontWeight: 700,
        color: '#fff',
        background: color,
        padding: '3px 8px',
        borderRadius: 8,
        textTransform: 'uppercase',
        letterSpacing: 0.3,
      }}>
        {rule.behavior}
      </span>
      <span style={{ fontSize: 12, fontFamily: 'monospace', color: '#1a1d24', fontWeight: 600 }}>
        {rule.toolName}
      </span>
      {rule.pathPattern && (
        <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#8b95a3' }}>
          {rule.pathPattern}
        </span>
      )}
      <div style={{ flex: 1 }} />
      <button
        onClick={() => onDelete(rule.id)}
        style={{
          border: 'none',
          background: 'transparent',
          fontSize: 11,
          color: '#ef4444',
          fontWeight: 600,
          cursor: 'pointer',
          padding: '4px 8px',
          borderRadius: 8,
          transition: 'background 0.15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = '#fff5f5'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
      >
        Delete
      </button>
    </div>
  );
}
