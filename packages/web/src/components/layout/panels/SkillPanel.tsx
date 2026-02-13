import { useState } from 'react';
import { useStore } from '../../../store/useStore';
import { useApi } from '../../../hooks/useApi';
import { NewSkillSpecDialog } from '../../dialogs/NewSkillSpecDialog';

const SKILL_TYPE_COLORS: Record<string, { bg: string; fg: string }> = {
  official: { bg: 'rgba(10, 185, 230, 0.10)', fg: '#0a9ec4' },
  external: { bg: 'rgba(34, 197, 94, 0.10)', fg: '#16a34a' },
  internal: { bg: '#f0f1f3', fg: '#555e6b' },
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
          Skills
        </span>
        <button
          onClick={() => setShowCreate(true)}
          title="New skill spec"
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

      {/* Skill list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 10px 10px' }}>
        {skillSpecs.length === 0 ? (
          <div style={{ padding: '32px 8px', textAlign: 'center' }}>
            <span style={{ fontSize: 12, color: '#b0b8c4' }}>No skills yet</span>
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
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: '2px 7px',
                      borderRadius: 10,
                      backgroundColor: colors.bg,
                      color: colors.fg,
                      flexShrink: 0,
                      letterSpacing: 0.2,
                    }}
                  >
                    {spec.skillType}
                  </span>
                </div>
                {spec.description && (
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
