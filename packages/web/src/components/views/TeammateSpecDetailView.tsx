import { useState, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { InlineEdit } from '../InlineEdit';
import type { Api } from '../../hooks/useApi';

const SKILL_TYPE_COLORS: Record<string, { bg: string; fg: string }> = {
  official: { bg: 'rgba(10, 185, 230, 0.1)', fg: '#0a9ec4' },
  external: { bg: 'rgba(22, 163, 74, 0.1)', fg: '#16a34a' },
  internal: { bg: '#f0f1f3', fg: '#555e6b' },
};

export function TeammateSpecDetailView({ specId, api }: { specId: string; api: Api }) {
  const specs = useStore(s => s.teammateSpecs);
  const setTeammateSpecs = useStore(s => s.setTeammateSpecs);
  const skillSpecs = useStore(s => s.skillSpecs);
  const navigate = useStore(s => s.navigate);
  const goBack = useStore(s => s.goBack);

  const spec = specs.find(s => s.id === specId);
  const [instructions, setInstructions] = useState(spec?.instructions ?? '');

  useEffect(() => {
    if (!spec) navigate({ view: 'teammate_spec_list' });
  }, [spec, navigate]);

  useEffect(() => {
    setInstructions(spec?.instructions ?? '');
  }, [spec?.instructions]);

  if (!spec) return null;

  const updateField = async (field: 'name' | 'role' | 'instructions', value: string) => {
    try {
      const updated = await api.updateSpec(specId, { [field]: value });
      setTeammateSpecs(specs.map(s => s.id === specId ? updated : s));
    } catch (err) {
      console.error('Failed to update spec:', err);
    }
  };

  const handleInstructionsSave = () => {
    if (instructions !== (spec.instructions ?? '')) {
      updateField('instructions', instructions);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '14px 24px',
        background: '#ffffff',
        borderBottom: '1px solid #f0f1f3',
        flexShrink: 0,
      }}>
        <span
          style={{
            fontSize: 12,
            color: '#b0b8c4',
            cursor: 'pointer',
            lineHeight: 1,
            fontWeight: 600,
            transition: 'color 0.15s',
          }}
          onClick={goBack}
          onMouseEnter={e => { e.currentTarget.style.color = '#1a1d24'; }}
          onMouseLeave={e => { e.currentTarget.style.color = '#b0b8c4'; }}
        >
          ← Back
        </span>
        <InlineEdit value={spec.name} onSave={(v) => updateField('name', v)} fontSize={15} fontWeight="700" />
        <span
          style={{
            fontSize: 11,
            color: '#b0b8c4',
            cursor: 'pointer',
            marginLeft: 'auto',
            fontWeight: 500,
            transition: 'color 0.15s',
          }}
          onClick={async () => {
            await api.deleteSpec(specId);
            setTeammateSpecs(specs.filter(s => s.id !== specId));
          }}
          onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; }}
          onMouseLeave={e => { e.currentTarget.style.color = '#b0b8c4'; }}
        >
          Delete
        </span>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 640, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
          {/* Metadata */}
          <div style={{
            background: '#f9fafb',
            border: '1px solid #f0f1f3',
            borderRadius: 14,
            padding: '14px 18px',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <span style={{ fontSize: 12, color: '#8b95a3', width: 80, flexShrink: 0, fontWeight: 500 }}>Name</span>
              <InlineEdit value={spec.name} onSave={(v) => updateField('name', v)} fontSize={13} fontWeight="500" />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <span style={{ fontSize: 12, color: '#8b95a3', width: 80, flexShrink: 0, fontWeight: 500 }}>Role</span>
              <InlineEdit value={spec.role} onSave={(v) => updateField('role', v)} fontSize={13} fontWeight="500" />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <span style={{ fontSize: 12, color: '#8b95a3', width: 80, flexShrink: 0, fontWeight: 500 }}>Created</span>
              <span style={{ fontSize: 12, color: '#555e6b' }}>{new Date(spec.createdAt).toLocaleString()}</span>
            </div>
          </div>

          {/* Skills */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#8b95a3', textTransform: 'uppercase', letterSpacing: 0.8 }}>
                Skills
              </div>
              <span
                style={{
                  fontSize: 11,
                  color: '#0ab9e6',
                  cursor: 'pointer',
                  fontWeight: 600,
                  transition: 'color 0.15s',
                }}
                onClick={() => navigate({ view: 'skill_spec_list' })}
                onMouseEnter={e => { e.currentTarget.style.color = '#09a8d2'; }}
                onMouseLeave={e => { e.currentTarget.style.color = '#0ab9e6'; }}
              >
                Manage Skills
              </span>
            </div>
            {skillSpecs.length === 0 ? (
              <span style={{ fontSize: 12, color: '#b0b8c4', fontStyle: 'italic' }}>
                No skills defined yet
              </span>
            ) : (
              <div style={{
                background: '#f9fafb',
                border: '1px solid #f0f1f3',
                borderRadius: 12,
                padding: 8,
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
              }}>
                {skillSpecs.map(skill => {
                  const selected = spec.skillIds?.includes(skill.id) ?? false;
                  const colors = SKILL_TYPE_COLORS[skill.skillType] ?? SKILL_TYPE_COLORS.internal;
                  const toggleSkill = async () => {
                    const current = spec.skillIds ?? [];
                    const next = selected
                      ? current.filter(id => id !== skill.id)
                      : [...current, skill.id];
                    try {
                      const updated = await api.updateSpec(specId, { skillIds: next });
                      setTeammateSpecs(specs.map(s => s.id === specId ? updated : s));
                    } catch (err) {
                      console.error('Failed to update skills:', err);
                    }
                  };
                  return (
                    <div
                      key={skill.id}
                      onClick={toggleSkill}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '7px 10px',
                        borderRadius: 8,
                        cursor: 'pointer',
                        transition: 'background 0.12s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#f0f1f3'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                    >
                      <div style={{
                        width: 18,
                        height: 18,
                        borderRadius: 5,
                        border: `2px solid ${selected ? '#0ab9e6' : '#d1d5db'}`,
                        background: selected ? '#0ab9e6' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        transition: 'all 0.15s',
                      }}>
                        {selected && (
                          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                            <path d="M2 5L4 7L8 3" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </div>
                      <span style={{ fontSize: 12, color: '#1a1d24', fontWeight: 500, flex: 1 }}>
                        {skill.name}
                      </span>
                      <span style={{
                        fontSize: 10,
                        fontWeight: 600,
                        padding: '2px 8px',
                        borderRadius: 8,
                        backgroundColor: colors.bg,
                        color: colors.fg,
                      }}>
                        {skill.skillType}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Instructions */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#8b95a3', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 }}>
              Instructions
            </div>
            <textarea
              value={instructions}
              onChange={e => setInstructions(e.target.value)}
              onBlur={handleInstructionsSave}
              placeholder="Detailed instructions for this teammate..."
              rows={10}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                minHeight: 200,
                padding: '12px 14px',
                borderRadius: 12,
                border: '1px solid #e5e7eb',
                background: '#f9fafb',
                color: '#1a1d24',
                fontSize: 13,
                fontFamily: 'inherit',
                lineHeight: 1.6,
                resize: 'vertical',
                outline: 'none',
                transition: 'border-color 0.15s',
              }}
              onFocus={e => { e.currentTarget.style.borderColor = '#0ab9e6'; }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
