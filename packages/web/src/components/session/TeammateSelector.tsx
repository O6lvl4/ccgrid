import type { TeammateSpec } from '@ccgrid/shared';
import { labelStyle, sectionStyle } from './FormStyles';

export function TeammateSelector({ allSpecs, selectedSpecIds, toggleSpec, onManage }: {
  allSpecs: TeammateSpec[];
  selectedSpecIds: Set<string>;
  toggleSpec: (id: string) => void;
  onManage: () => void;
}) {
  if (allSpecs.length === 0) return null;

  return (
    <div style={sectionStyle}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <label style={{ ...labelStyle, marginBottom: 0 }}>Teammates</label>
        <button
          type="button"
          onClick={onManage}
          style={{
            background: 'none',
            border: 'none',
            color: '#0ab9e6',
            fontSize: 11,
            fontWeight: 600,
            cursor: 'pointer',
            padding: 0,
          }}
          onMouseEnter={e => { e.currentTarget.style.textDecoration = 'underline'; }}
          onMouseLeave={e => { e.currentTarget.style.textDecoration = 'none'; }}
        >
          Manage
        </button>
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {allSpecs.map(spec => {
          const selected = selectedSpecIds.has(spec.id);
          return (
            <button
              key={spec.id}
              type="button"
              onClick={() => toggleSpec(spec.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                height: 34,
                padding: '0 14px',
                borderRadius: 17,
                border: selected ? '1.5px solid #0ab9e6' : '1px solid #e5e7eb',
                background: selected ? '#e8f8fd' : '#fff',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { if (!selected) e.currentTarget.style.borderColor = '#d1d5db'; }}
              onMouseLeave={e => { if (!selected) e.currentTarget.style.borderColor = '#e5e7eb'; }}
            >
              <span style={{
                width: 14,
                height: 14,
                borderRadius: 7,
                border: selected ? 'none' : '1.5px solid #d1d5db',
                background: selected ? '#0ab9e6' : '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                transition: 'all 0.15s',
              }}>
                {selected && <span style={{ color: '#fff', fontSize: 10, fontWeight: 800, lineHeight: 1 }}>✓</span>}
              </span>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#3c4257' }}>{spec.name}</span>
              <span style={{ fontSize: 11, color: '#9ca3af' }}>{spec.role}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
