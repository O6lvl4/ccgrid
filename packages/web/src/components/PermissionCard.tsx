import { useState } from 'react';
import { useApi } from '../hooks/useApi';

export function PermissionCard({
  req,
  onRespond,
}: {
  req: { requestId: string; toolName: string; input: Record<string, unknown>; description?: string; agentId?: string };
  onRespond: (requestId: string, behavior: 'allow' | 'deny', message?: string, updatedInput?: Record<string, unknown>) => void;
  sessionId: string;
}) {
  const api = useApi();
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [parseError, setParseError] = useState(false);

  const handleEdit = () => {
    setEditValue(JSON.stringify(req.input, null, 2));
    setParseError(false);
    setEditing(true);
  };

  const handleChange = (value: string) => {
    setEditValue(value);
    try {
      JSON.parse(value);
      setParseError(false);
    } catch {
      setParseError(true);
    }
  };

  const handleAllow = () => {
    if (editing && !parseError) {
      try {
        const parsed = JSON.parse(editValue);
        const original = JSON.stringify(req.input);
        const edited = JSON.stringify(parsed);
        if (original !== edited) {
          onRespond(req.requestId, 'allow', undefined, parsed);
          return;
        }
      } catch { /* fall through to allow without edit */ }
    }
    onRespond(req.requestId, 'allow');
  };

  const canAllow = !(editing && parseError);

  return (
    <div style={{
      background: '#fefce8',
      border: '1px solid #facc15',
      borderRadius: 16,
      padding: 16,
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#a16207' }}>
          Permission Request
        </span>
        {req.agentId && (
          <span style={{ fontSize: 11, color: '#8b95a3', fontFamily: 'monospace' }}>
            agent: {req.agentId.slice(0, 8)}
          </span>
        )}
      </div>

      <div style={{ display: 'flex', gap: 10, alignItems: 'baseline' }}>
        <span style={{ fontSize: 11, color: '#8b95a3', fontWeight: 600, width: 50, flexShrink: 0 }}>Tool</span>
        <span style={{ fontSize: 12, color: '#1a1d24', fontFamily: 'monospace' }}>{req.toolName}</span>
      </div>

      {req.description && (
        <div style={{ display: 'flex', gap: 10, alignItems: 'baseline' }}>
          <span style={{ fontSize: 11, color: '#8b95a3', fontWeight: 600, width: 50, flexShrink: 0 }}>Reason</span>
          <span style={{ fontSize: 12, color: '#555e6b', flex: 1 }}>{req.description}</span>
        </div>
      )}

      <InputSection
        editing={editing}
        editValue={editValue}
        parseError={parseError}
        input={req.input}
        onEdit={handleEdit}
        onCancelEdit={() => setEditing(false)}
        onChange={handleChange}
      />

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
        <button
          onClick={() => onRespond(req.requestId, 'deny', 'User denied')}
          style={{
            padding: '6px 16px',
            borderRadius: 12,
            border: 'none',
            background: '#f3f4f6',
            color: '#555e6b',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#e5e7eb'; }}
          onMouseLeave={e => { e.currentTarget.style.background = '#f3f4f6'; }}
        >
          Deny
        </button>
        <button
          onClick={() => {
            api.createPermissionRule({ toolName: req.toolName, behavior: 'allow' }).catch(console.error);
            handleAllow();
          }}
          style={{
            padding: '6px 16px',
            borderRadius: 12,
            border: 'none',
            background: '#0ab9e6',
            color: '#fff',
            fontSize: 11,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'background 0.15s',
            boxShadow: '0 2px 8px rgba(10, 185, 230, 0.25)',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#09a8d2'; }}
          onMouseLeave={e => { e.currentTarget.style.background = '#0ab9e6'; }}
        >
          Always Allow {req.toolName}
        </button>
        <button
          onClick={handleAllow}
          disabled={!canAllow}
          style={{
            padding: '6px 16px',
            borderRadius: 12,
            border: 'none',
            background: canAllow ? '#16a34a' : '#e5e7eb',
            color: canAllow ? '#fff' : '#b0b8c4',
            fontSize: 12,
            fontWeight: 600,
            cursor: canAllow ? 'pointer' : 'default',
            transition: 'background 0.15s',
            boxShadow: canAllow ? '0 2px 8px rgba(22, 163, 74, 0.25)' : 'none',
          }}
          onMouseEnter={e => { if (canAllow) e.currentTarget.style.background = '#15803d'; }}
          onMouseLeave={e => { if (canAllow) e.currentTarget.style.background = '#16a34a'; }}
        >
          Allow
        </button>
      </div>
    </div>
  );
}

function InputSection({ editing, editValue, parseError, input, onEdit, onCancelEdit, onChange }: {
  editing: boolean;
  editValue: string;
  parseError: boolean;
  input: Record<string, unknown>;
  onEdit: () => void;
  onCancelEdit: () => void;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ fontSize: 11, color: '#8b95a3', fontWeight: 600 }}>Input</span>
        <button
          onClick={editing ? onCancelEdit : onEdit}
          style={{
            background: 'none',
            border: 'none',
            color: editing ? '#8b95a3' : '#0ab9e6',
            fontSize: 11,
            fontWeight: 600,
            cursor: 'pointer',
            padding: '2px 6px',
          }}
        >
          {editing ? 'Cancel' : 'Edit'}
        </button>
      </div>

      {editing ? (
        <div>
          <textarea
            value={editValue}
            onChange={(e) => onChange(e.target.value)}
            style={{
              fontFamily: 'monospace',
              fontSize: 11,
              padding: 10,
              borderRadius: 10,
              border: parseError ? '1px solid #ef4444' : '1px solid #e5e7eb',
              backgroundColor: parseError ? '#fef2f2' : '#f9fafb',
              minHeight: 80,
              maxHeight: 200,
              resize: 'vertical',
              width: '100%',
              boxSizing: 'border-box',
              outline: 'none',
              lineHeight: 1.5,
            }}
            onFocus={e => { if (!parseError) e.currentTarget.style.borderColor = '#0ab9e6'; }}
            onBlur={e => { if (!parseError) e.currentTarget.style.borderColor = '#e5e7eb'; }}
          />
          {parseError && (
            <span style={{ fontSize: 10, color: '#ef4444', marginTop: 4, display: 'block' }}>Invalid JSON</span>
          )}
        </div>
      ) : (
        <div style={{
          maxHeight: 120,
          overflow: 'auto',
          background: '#f9fafb',
          borderRadius: 10,
          padding: 10,
          border: '1px solid #f0f1f3',
        }}>
          <pre style={{
            fontSize: 11,
            fontFamily: 'monospace',
            color: '#555e6b',
            whiteSpace: 'pre-wrap',
            margin: 0,
            lineHeight: 1.5,
          }}>
            {JSON.stringify(input, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
