import { useState } from 'react';
import { useStore } from '../../../store/useStore';
import { useApi } from '../../../hooks/useApi';
import { NewSkillSpecDialog } from '../../dialogs/NewSkillSpecDialog';

const SKILL_TYPE_COLORS: Record<string, { bg: string; fg: string }> = {
  official: { bg: '#dbeafe', fg: '#1e40af' },
  external: { bg: '#dcfce7', fg: '#166534' },
  internal: { bg: '#f3f4f6', fg: '#374151' },
};

export function SkillPanel() {
  const skillSpecs = useStore(s => s.skillSpecs);
  const setSkillSpecs = useStore(s => s.setSkillSpecs);
  const navigate = useStore(s => s.navigate);
  const route = useStore(s => s.route);
  const api = useApi();

  const currentSpecId = route.view === 'skill_spec_detail' ? route.specId : null;
  const [showCreate, setShowCreate] = useState(false);

  const handleDelete = async (id: string) => {
    try {
      await api.deleteSkillSpec(id);
      setSkillSpecs(skillSpecs.filter(s => s.id !== id));
    } catch (err) {
      console.error('Failed to delete skill spec:', err);
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
          Skills
        </span>
        <button
          onClick={() => setShowCreate(true)}
          title="New skill spec"
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

      {/* Skill list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px 8px' }}>
        {skillSpecs.length === 0 ? (
          <div style={{ padding: '24px 8px', textAlign: 'center' }}>
            <span style={{ fontSize: 12, color: '#9ca3af' }}>No skills yet</span>
          </div>
        ) : (
          skillSpecs.map(spec => {
            const isActive = spec.id === currentSpecId;
            const colors = SKILL_TYPE_COLORS[spec.skillType] ?? SKILL_TYPE_COLORS.internal;
            return (
              <div
                key={spec.id}
                role="button"
                onClick={() => navigate({ view: 'skill_spec_detail', specId: spec.id })}
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
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      padding: '1px 6px',
                      borderRadius: 9999,
                      backgroundColor: colors.bg,
                      color: colors.fg,
                      flexShrink: 0,
                    }}
                  >
                    {spec.skillType}
                  </span>
                </div>
                {spec.description && (
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
                    {spec.description}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <NewSkillSpecDialog open={showCreate} onClose={() => setShowCreate(false)} />
    </>
  );
}
