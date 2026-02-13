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
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: '#b0b8c4', fontSize: 13 }}>
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
        border: '1px solid #f0f1f3',
        borderRadius: 14,
        padding: 16,
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        transition: 'border-color 0.18s, box-shadow 0.18s, transform 0.12s',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = '#e0e3e8';
        e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.05)';
        e.currentTarget.style.transform = 'translateY(-1px)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = '#f0f1f3';
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      {/* Header: status + name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <StatusBadge status={status} showLabel={false} />
        <span
          style={{
            fontWeight: 700,
            fontSize: 13,
            color: '#1a1d24',
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
            color: '#8b95a3',
            background: '#f0f1f3',
            padding: '3px 8px',
            borderRadius: 8,
            fontWeight: 600,
            letterSpacing: 0.2,
          }}
        >
          {agentType}
        </span>
      </div>

      {/* Output preview */}
      <div
        style={{
          fontSize: 12,
          color: output ? '#555e6b' : '#b0b8c4',
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
