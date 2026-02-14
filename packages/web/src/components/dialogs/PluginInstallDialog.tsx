import { useState } from 'react';
import { useStore } from '../../store/useStore';
import { useApi } from '../../hooks/useApi';
import { DialogOverlay } from './DialogOverlay';

export function PluginInstallDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const skillSpecs = useStore(s => s.skillSpecs);
  const setSkillSpecs = useStore(s => s.setSkillSpecs);
  const plugins = useStore(s => s.plugins);
  const setPlugins = useStore(s => s.setPlugins);
  const addToast = useStore(s => s.addToast);
  const api = useApi();

  const [source, setSource] = useState('');
  const [alias, setAlias] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInstall = async () => {
    if (!source.trim() || !source.includes('/')) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await api.installPlugin({
        source: source.trim(),
        alias: alias.trim() || undefined,
      });
      setPlugins([...plugins, result.plugin]);
      setSkillSpecs([...skillSpecs, ...result.skills]);
      addToast(`Plugin "${result.plugin.name}" installed (${result.skills.length} skill${result.skills.length > 1 ? 's' : ''})`, 'success');
      setSource('');
      setAlias('');
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to install plugin');
    } finally {
      setSubmitting(false);
    }
  };

  const isValid = source.trim().includes('/');
  const canSubmit = isValid && !submitting;

  const inputStyle = {
    width: '100%',
    boxSizing: 'border-box' as const,
    padding: '8px 12px',
    borderRadius: 10,
    border: '1px solid #e5e7eb',
    background: '#f9fafb',
    color: '#1a1d24',
    fontSize: 13,
    outline: 'none',
    transition: 'border-color 0.15s',
  };

  return (
    <DialogOverlay open={open} onClose={onClose} title="Install Plugin">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#8b95a3', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>
            GitHub Repository
          </div>
          <input
            placeholder="owner/repo (e.g. O6lvl4/codopsy-ts-skill)"
            value={source}
            onChange={e => { setSource(e.target.value); setError(null); }}
            onKeyDown={e => { if (e.key === 'Enter' && canSubmit) handleInstall(); }}
            style={inputStyle}
            onFocus={e => { e.currentTarget.style.borderColor = '#16a34a'; }}
            onBlur={e => { e.currentTarget.style.borderColor = '#e5e7eb'; }}
          />
          <div style={{ fontSize: 11, color: '#b0b8c4', marginTop: 4 }}>
            Repository must contain <code style={{ fontSize: 10, background: '#f0f1f3', padding: '1px 4px', borderRadius: 4 }}>.claude-plugin/plugin.json</code> and <code style={{ fontSize: 10, background: '#f0f1f3', padding: '1px 4px', borderRadius: 4 }}>skills/*/SKILL.md</code>
          </div>
        </div>

        <div>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#8b95a3', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>
            Alias <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span>
          </div>
          <input
            placeholder="e.g. codopsy"
            value={alias}
            onChange={e => setAlias(e.target.value)}
            style={inputStyle}
            onFocus={e => { e.currentTarget.style.borderColor = '#16a34a'; }}
            onBlur={e => { e.currentTarget.style.borderColor = '#e5e7eb'; }}
          />
        </div>

        {error && (
          <div style={{
            padding: '10px 14px',
            borderRadius: 10,
            background: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            color: '#dc2626',
            fontSize: 12,
            lineHeight: 1.5,
          }}>
            {error}
          </div>
        )}

        <button
          onClick={handleInstall}
          disabled={!canSubmit}
          style={{
            alignSelf: 'flex-start',
            padding: '8px 20px',
            borderRadius: 14,
            border: 'none',
            background: canSubmit ? '#16a34a' : '#e8eaed',
            color: canSubmit ? '#fff' : '#b0b8c4',
            fontSize: 13,
            fontWeight: 700,
            cursor: canSubmit ? 'pointer' : 'default',
            transition: 'background 0.18s',
            boxShadow: canSubmit ? '0 2px 8px rgba(22, 163, 74, 0.25)' : 'none',
          }}
        >
          {submitting ? 'Installing...' : 'Install Plugin'}
        </button>
      </div>
    </DialogOverlay>
  );
}
