import { useMemo } from 'react';
import { useStore } from '../../store/useStore';
import { StatusBadge } from '../StatusBadge';

export function TeammatesTab({ sessionId }: { sessionId: string }) {
  const teammates = useStore(s => s.teammates);
  const navigate = useStore(s => s.navigate);

  const tmList = useMemo(
    () => Array.from(teammates.values()).filter(t => t.sessionId === sessionId),
    [teammates, sessionId],
  );

  if (tmList.length === 0) {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span style={{ color: '#9ca3af', fontSize: 13 }}>
          Teammates will appear here as the lead agent spawns them.
        </span>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto' }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: 12,
          padding: 20,
          maxWidth: 960,
          margin: '0 auto',
          width: '100%',
          boxSizing: 'border-box',
        }}
      >
        {tmList.map(tm => (
          <TeammateCard
            key={tm.agentId}
            name={tm.name ?? tm.agentId.slice(0, 8)}
            status={tm.status}
            agentType={tm.agentType}
            output={tm.output}
            onClick={() => navigate({ view: 'teammate_detail', sessionId, agentId: tm.agentId })}
          />
        ))}
      </div>
    </div>
  );
}

function TeammateCard({
  name,
  status,
  agentType,
  output,
  onClick,
}: {
  name: string;
  status: string;
  agentType: string;
  output?: string;
  onClick: () => void;
}) {
  return (
    <div
      role="button"
      onClick={onClick}
      style={{
        background: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: 8,
        padding: 14,
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        transition: 'border-color 0.15s, box-shadow 0.15s',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = '#d1d5db';
        e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = '#e5e7eb';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {/* Header: status + name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <StatusBadge status={status} showLabel={false} />
        <span
          style={{
            fontWeight: 600,
            fontSize: 13,
            color: '#111827',
            flex: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {name}
        </span>
      </div>

      {/* Agent type badge */}
      <div>
        <span
          style={{
            fontSize: 10,
            color: '#6b7280',
            background: '#f3f4f6',
            padding: '2px 6px',
            borderRadius: 4,
            fontWeight: 500,
          }}
        >
          {agentType}
        </span>
      </div>

      {/* Output preview */}
      <div
        style={{
          fontSize: 12,
          color: output ? '#6b7280' : '#9ca3af',
          fontStyle: output ? 'normal' : 'italic',
          lineHeight: 1.5,
          overflow: 'hidden',
          display: '-webkit-box',
          WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical',
          minHeight: 36,
        }}
      >
        {output ? output.slice(0, 200) : 'No output yet'}
      </div>
    </div>
  );
}
