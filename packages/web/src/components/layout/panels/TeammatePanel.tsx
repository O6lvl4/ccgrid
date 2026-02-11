import { useState } from 'react';
import { useStore } from '../../../store/useStore';
import { useApi } from '../../../hooks/useApi';
import { NewTeammateSpecDialog } from '../../dialogs/NewTeammateSpecDialog';

const SKILL_TYPE_COLORS: Record<string, { bg: string; fg: string }> = {
  official: { bg: '#dbeafe', fg: '#1e40af' },
  external: { bg: '#dcfce7', fg: '#166534' },
  internal: { bg: '#f3f4f6', fg: '#374151' },
};

export function TeammatePanel() {
  const specs = useStore(s => s.teammateSpecs);
  const setTeammateSpecs = useStore(s => s.setTeammateSpecs);
  const navigate = useStore(s => s.navigate);
  const route = useStore(s => s.route);
  const api = useApi();

  const currentSpecId = route.view === 'teammate_spec_detail' ? route.specId : null;
  const [showCreate, setShowCreate] = useState(false);

  const handleDelete = async (id: string) => {
    try {
      await api.deleteSpec(id);
      setTeammateSpecs(specs.filter(s => s.id !== id));
    } catch (err) {
      console.error('Failed to delete spec:', err);
    }
  };

  return (
    <>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 16px 10px',
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', letterSpacing: 0.3 }}>
          Teammate Specs
        </span>
        <button
          onClick={() => setShowCreate(true)}
          title="New teammate spec"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 24,
            height: 24,
            padding: 0,
            borderRadius: 6,
            border: '1px solid #e5e7eb',
            background: '#ffffff',
            color: '#6b7280',
            fontSize: 16,
            cursor: 'pointer',
            lineHeight: '24px',
            transition: 'background 0.15s, color 0.15s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = '#f3f4f6';
            e.currentTarget.style.color = '#111827';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = '#ffffff';
            e.currentTarget.style.color = '#6b7280';
          }}
        >
          +
        </button>
      </div>

      {/* Spec list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px 8px' }}>
        {specs.length === 0 ? (
          <div style={{ padding: '24px 8px', textAlign: 'center' }}>
            <span style={{ fontSize: 12, color: '#9ca3af' }}>No specs yet</span>
          </div>
        ) : (
          specs.map(spec => {
            const isActive = spec.id === currentSpecId;
            return (
              <div
                key={spec.id}
                role="button"
                onClick={() => navigate({ view: 'teammate_spec_detail', specId: spec.id })}
                style={{
                  padding: '8px 10px',
                  borderRadius: 6,
                  cursor: 'pointer',
                  background: isActive ? '#f3f4f6' : 'transparent',
                  borderLeft: isActive ? '3px solid #3b82f6' : '3px solid transparent',
                  marginBottom: 2,
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = '#f9fafb'; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = isActive ? '#f3f4f6' : 'transparent'; }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: isActive ? 600 : 500,
                      color: '#111827',
                      flex: 1,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {spec.name}
                  </span>
                  {(spec.skillIds?.length ?? 0) > 0 && (
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        padding: '1px 5px',
                        borderRadius: 9999,
                        backgroundColor: '#dbeafe',
                        color: '#1e40af',
                        flexShrink: 0,
                      }}
                    >
                      {spec.skillIds!.length}
                    </span>
                  )}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: '#9ca3af',
                    marginTop: 2,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {spec.role}
                </div>
              </div>
            );
          })
        )}
      </div>

      <NewTeammateSpecDialog open={showCreate} onClose={() => setShowCreate(false)} />
    </>
  );
}
