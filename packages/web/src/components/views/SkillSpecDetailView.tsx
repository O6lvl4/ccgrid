import { useState, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { InlineEdit } from '../InlineEdit';
import { useApi, type Api } from '../../hooks/useApi';
import type { SkillSpec, PluginSpec } from '@ccgrid/shared';

type SkillType = 'official' | 'external' | 'internal';

const SKILL_TYPE_COLORS: Record<SkillType, { bg: string; color: string; border: string }> = {
  official: { bg: 'rgba(10, 185, 230, 0.08)', color: '#0a9ec4', border: '#0ab9e6' },
  external: { bg: 'rgba(22, 163, 74, 0.08)', color: '#16a34a', border: '#16a34a' },
  internal: { bg: '#f7f8fa', color: '#555e6b', border: '#d1d5db' },
};

const infoRowStyle = { display: 'flex', gap: 16, fontSize: 12 } as const;
const labelStyle = { color: '#8b95a3', width: 100, flexShrink: 0, fontWeight: 500 } as const;

function PluginInfoSection({ spec, plugin, onUpdate, onUninstall }: {
  spec: SkillSpec;
  plugin: PluginSpec | undefined;
  onUpdate: () => Promise<void>;
  onUninstall: () => void;
}) {
  const [updating, setUpdating] = useState(false);
  const handleUpdate = async () => {
    setUpdating(true);
    try { await onUpdate(); } finally { setUpdating(false); }
  };
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 800, color: '#8b95a3', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 }}>
        Plugin Info
      </div>
      <div style={{ background: 'rgba(22, 163, 74, 0.04)', border: '1px solid rgba(22, 163, 74, 0.15)', borderRadius: 14, padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={infoRowStyle}><span style={labelStyle}>Plugin</span><span style={{ color: '#1a1d24', fontWeight: 600 }}>{spec.pluginName}</span></div>
        {plugin && (
          <>
            <div style={infoRowStyle}><span style={labelStyle}>Source</span><span style={{ color: '#555e6b' }}>{plugin.source}</span></div>
            <div style={infoRowStyle}><span style={labelStyle}>Version</span><span style={{ color: '#555e6b' }}>{plugin.version}</span></div>
            <div style={infoRowStyle}><span style={labelStyle}>Author</span><span style={{ color: '#555e6b' }}>{plugin.author}</span></div>
          </>
        )}
        {spec.allowedTools && <div style={infoRowStyle}><span style={labelStyle}>Allowed Tools</span><span style={{ color: '#555e6b' }}>{spec.allowedTools}</span></div>}
        {spec.argumentHint && <div style={infoRowStyle}><span style={labelStyle}>Argument</span><span style={{ color: '#555e6b' }}>{spec.argumentHint}</span></div>}
      </div>
      {plugin && (
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button
            onClick={handleUpdate}
            disabled={updating}
            style={{ padding: '6px 16px', borderRadius: 10, border: '1px solid rgba(22, 163, 74, 0.3)', background: updating ? '#f0f1f3' : 'rgba(22, 163, 74, 0.06)', color: updating ? '#8b95a3' : '#16a34a', fontSize: 12, fontWeight: 600, cursor: updating ? 'default' : 'pointer', transition: 'background 0.15s, border-color 0.15s' }}
            onMouseEnter={e => { if (!updating) { e.currentTarget.style.background = 'rgba(22, 163, 74, 0.12)'; e.currentTarget.style.borderColor = 'rgba(22, 163, 74, 0.5)'; } }}
            onMouseLeave={e => { if (!updating) { e.currentTarget.style.background = 'rgba(22, 163, 74, 0.06)'; e.currentTarget.style.borderColor = 'rgba(22, 163, 74, 0.3)'; } }}
          >
            {updating ? 'Updating...' : 'Update Plugin'}
          </button>
          <button
            onClick={onUninstall}
            style={{ padding: '6px 16px', borderRadius: 10, border: '1px solid rgba(239, 68, 68, 0.3)', background: 'rgba(239, 68, 68, 0.06)', color: '#dc2626', fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'background 0.15s, border-color 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.12)'; e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.5)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.06)'; e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.3)'; }}
          >
            Uninstall Plugin
          </button>
        </div>
      )}
    </div>
  );
}

export function SkillSpecDetailView({ specId, api }: { specId: string; api: Api }) {
  const skillSpecs = useStore(s => s.skillSpecs);
  const setSkillSpecs = useStore(s => s.setSkillSpecs);
  const plugins = useStore(s => s.plugins);
  const setPlugins = useStore(s => s.setPlugins);
  const navigate = useStore(s => s.navigate);
  const goBack = useStore(s => s.goBack);
  const addToast = useStore(s => s.addToast);
  const pluginApi = useApi();

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
              {(() => {
                const c = SKILL_TYPE_COLORS[spec.skillType as SkillType];
                return (
                  <span style={{
                    fontSize: 11,
                    padding: '4px 10px',
                    borderRadius: 8,
                    background: c.bg,
                    color: c.color,
                    border: `1px solid ${c.border}`,
                    fontWeight: 600,
                  }}>
                    {spec.skillType}
                  </span>
                );
              })()}
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

          {/* Plugin info (only for plugin-installed skills) */}
          {spec.pluginName && (
            <PluginInfoSection
              spec={spec}
              plugin={plugins.find(p => p.name === spec.pluginName)}
              onUpdate={async () => {
                const plugin = plugins.find(p => p.name === spec.pluginName);
                if (!plugin) return;
                try {
                  const result = await pluginApi.updatePlugin(plugin.name);
                  setPlugins(plugins.map(p => p.name === plugin.name ? result.plugin : p));
                  const oldSkillIds = new Set(plugin.skillIds);
                  setSkillSpecs([...skillSpecs.filter(s => !oldSkillIds.has(s.id)), ...result.skills]);
                  addToast(`Plugin "${plugin.name}" updated to v${result.plugin.version}`, 'success');
                  if (result.skills.length > 0) {
                    navigate({ view: 'skill_spec_detail', specId: result.skills[0].id });
                  }
                } catch (err) {
                  console.error('Failed to update plugin:', err);
                  addToast(`Update failed: ${err instanceof Error ? err.message : String(err)}`, 'info');
                }
              }}
              onUninstall={async () => {
                const plugin = plugins.find(p => p.name === spec.pluginName);
                if (!plugin) return;
                try {
                  await pluginApi.uninstallPlugin(plugin.name);
                  setSkillSpecs(skillSpecs.filter(s => !plugin.skillIds.includes(s.id)));
                  setPlugins(plugins.filter(p => p.name !== plugin.name));
                  addToast(`Plugin "${plugin.name}" uninstalled`, 'info');
                  navigate({ view: 'skill_spec_list' });
                } catch (err) {
                  console.error('Failed to uninstall plugin:', err);
                }
              }}
            />
          )}

          {/* SKILL.md content */}
          {spec.skillMdContent && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#8b95a3', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 }}>
                SKILL.md
              </div>
              <pre style={{
                padding: '14px 16px',
                borderRadius: 12,
                background: '#f9fafb',
                border: '1px solid #e5e7eb',
                color: '#1a1d24',
                fontSize: 12,
                lineHeight: 1.6,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                overflow: 'auto',
                maxHeight: 400,
                fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace',
              }}>
                {spec.skillMdContent}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
