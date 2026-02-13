import { useState, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { InlineEdit } from '../InlineEdit';
import type { Api } from '../../hooks/useApi';

const SKILL_TYPE_OPTIONS = ['official', 'external', 'internal'] as const;
type SkillType = typeof SKILL_TYPE_OPTIONS[number];

const SKILL_TYPE_COLORS: Record<SkillType, { bg: string; color: string; border: string }> = {
  official: { bg: 'rgba(10, 185, 230, 0.08)', color: '#0a9ec4', border: '#0ab9e6' },
  external: { bg: 'rgba(22, 163, 74, 0.08)', color: '#16a34a', border: '#16a34a' },
  internal: { bg: '#f7f8fa', color: '#555e6b', border: '#d1d5db' },
};

export function SkillSpecDetailView({ specId, api }: { specId: string; api: Api }) {
  const skillSpecs = useStore(s => s.skillSpecs);
  const setSkillSpecs = useStore(s => s.setSkillSpecs);
  const navigate = useStore(s => s.navigate);
  const goBack = useStore(s => s.goBack);

  const spec = skillSpecs.find(s => s.id === specId);
  const [description, setDescription] = useState(spec?.description ?? '');

  useEffect(() => {
    if (!spec) navigate({ view: 'skill_spec_list' });
  }, [spec, navigate]);

  useEffect(() => {
    setDescription(spec?.description ?? '');
  }, [spec?.description]);

  if (!spec) return null;

  const updateField = async (field: 'name' | 'description' | 'skillType', value: string) => {
    try {
      const updated = await api.updateSkillSpec(specId, { [field]: value });
      setSkillSpecs(skillSpecs.map(s => s.id === specId ? updated : s));
    } catch (err) {
      console.error('Failed to update skill spec:', err);
    }
  };

  const handleDescriptionSave = () => {
    if (description !== (spec.description ?? '')) {
      updateField('description', description);
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
            await api.deleteSkillSpec(specId);
            setSkillSpecs(skillSpecs.filter(s => s.id !== specId));
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
              <span style={{ fontSize: 12, color: '#8b95a3', width: 80, flexShrink: 0, fontWeight: 500 }}>Type</span>
              <div style={{ display: 'flex', gap: 4 }}>
                {SKILL_TYPE_OPTIONS.map(opt => {
                  const active = spec.skillType === opt;
                  const c = SKILL_TYPE_COLORS[opt];
                  return (
                    <button
                      key={opt}
                      onClick={() => updateField('skillType', opt)}
                      style={{
                        fontSize: 11,
                        padding: '4px 10px',
                        borderRadius: 8,
                        cursor: 'pointer',
                        background: active ? c.bg : 'transparent',
                        color: active ? c.color : '#8b95a3',
                        border: `1px solid ${active ? c.border : '#e5e7eb'}`,
                        fontWeight: active ? 600 : 400,
                        transition: 'all 0.15s',
                      }}
                      onMouseEnter={e => { if (!active) e.currentTarget.style.borderColor = c.border; }}
                      onMouseLeave={e => { if (!active) e.currentTarget.style.borderColor = '#e5e7eb'; }}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <span style={{ fontSize: 12, color: '#8b95a3', width: 80, flexShrink: 0, fontWeight: 500 }}>Created</span>
              <span style={{ fontSize: 12, color: '#555e6b' }}>{new Date(spec.createdAt).toLocaleString()}</span>
            </div>
          </div>

          {/* Description */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#8b95a3', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 }}>
              Description
            </div>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              onBlur={handleDescriptionSave}
              placeholder="Describe what this skill does..."
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
