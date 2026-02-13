import { useState } from 'react';
import { useStore } from '../../../store/useStore';
import { useApi } from '../../../hooks/useApi';
import { NewTeammateSpecDialog } from '../../dialogs/NewTeammateSpecDialog';

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
          padding: '16px 18px 12px',
          flexShrink: 0,
        }}
      >
        <span style={{
          fontSize: 11,
          fontWeight: 800,
          color: '#8b95a3',
          letterSpacing: 0.8,
          textTransform: 'uppercase',
        }}>
          Teammate Specs
        </span>
        <button
          onClick={() => setShowCreate(true)}
          title="New teammate spec"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 26,
            height: 26,
            padding: 0,
            borderRadius: 13,
            border: 'none',
            background: '#0ab9e6',
            color: '#fff',
            fontSize: 15,
            fontWeight: 700,
            cursor: 'pointer',
            lineHeight: 1,
            transition: 'background 0.18s, transform 0.12s, box-shadow 0.18s',
            boxShadow: '0 2px 8px rgba(10, 185, 230, 0.3)',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = '#09a8d2';
            e.currentTarget.style.transform = 'scale(1.1)';
            e.currentTarget.style.boxShadow = '0 3px 12px rgba(10, 185, 230, 0.4)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = '#0ab9e6';
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(10, 185, 230, 0.3)';
          }}
          onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.92)'; }}
          onMouseUp={e => { e.currentTarget.style.transform = 'scale(1.1)'; }}
        >
          +
        </button>
      </div>

      {/* Spec list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 10px 10px' }}>
        {specs.length === 0 ? (
          <div style={{ padding: '32px 8px', textAlign: 'center' }}>
            <span style={{ fontSize: 12, color: '#b0b8c4' }}>No specs yet</span>
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
                  padding: '10px 12px',
                  borderRadius: 12,
                  cursor: 'pointer',
                  background: isActive ? '#f0f7ff' : 'transparent',
                  borderLeft: isActive ? '3px solid #0ab9e6' : '3px solid transparent',
                  marginBottom: 2,
                  transition: 'background 0.18s',
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = '#f9fafb'; }}
                onMouseLeave={e => { e.currentTarget.style.background = isActive ? '#f0f7ff' : 'transparent'; }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: isActive ? 700 : 500,
                      color: '#1a1d24',
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
                        fontWeight: 700,
                        padding: '2px 7px',
                        borderRadius: 10,
                        backgroundColor: 'rgba(10, 185, 230, 0.12)',
                        color: '#0a9ec4',
                        flexShrink: 0,
                        letterSpacing: 0.2,
                      }}
                    >
                      {spec.skillIds!.length}
                    </span>
                  )}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: '#b0b8c4',
                    marginTop: 3,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    letterSpacing: 0.1,
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
