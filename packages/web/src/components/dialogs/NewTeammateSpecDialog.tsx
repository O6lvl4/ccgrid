import { useState } from 'react';
import { useStore } from '../../store/useStore';
import { useApi } from '../../hooks/useApi';
import { DialogOverlay } from './DialogOverlay';

const SKILL_TYPE_COLORS: Record<string, { bg: string; fg: string }> = {
  official: { bg: 'rgba(10, 185, 230, 0.1)', fg: '#0a9ec4' },
  external: { bg: 'rgba(22, 163, 74, 0.1)', fg: '#16a34a' },
  internal: { bg: '#f0f1f3', fg: '#555e6b' },
};

export function NewTeammateSpecDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const specs = useStore(s => s.teammateSpecs);
  const setTeammateSpecs = useStore(s => s.setTeammateSpecs);
  const skillSpecs = useStore(s => s.skillSpecs);
  const api = useApi();

  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [instructions, setInstructions] = useState('');
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const toggleSkill = (id: string) => {
    setSelectedSkillIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleCreate = async () => {
    if (!name.trim() || !role.trim()) return;
    setSubmitting(true);
    try {
      const spec = await api.createSpec({
        name: name.trim(),
        role: role.trim(),
        ...(instructions.trim() ? { instructions: instructions.trim() } : {}),
        ...(selectedSkillIds.length > 0 ? { skillIds: selectedSkillIds } : {}),
      });
      setTeammateSpecs([...specs, spec]);
      setName('');
      setRole('');
      setInstructions('');
      setSelectedSkillIds([]);
      onClose();
    } catch (err) {
      console.error('Failed to create spec:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const canCreate = name.trim() && role.trim() && !submitting;

  return (
    <DialogOverlay open={open} onClose={onClose} title="New Teammate Spec">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#8b95a3', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>Name</div>
            <input
              placeholder="e.g. Frontend"
              value={name}
              onChange={e => setName(e.target.value)}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '8px 12px',
                borderRadius: 10,
                border: '1px solid #e5e7eb',
                background: '#f9fafb',
                color: '#1a1d24',
                fontSize: 13,
                outline: 'none',
                transition: 'border-color 0.15s',
              }}
              onFocus={e => { e.currentTarget.style.borderColor = '#0ab9e6'; }}
              onBlur={e => { e.currentTarget.style.borderColor = '#e5e7eb'; }}
            />
          </div>
          <div style={{ flex: 2 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#8b95a3', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>Role</div>
            <input
              placeholder="e.g. UI implementation specialist"
              value={role}
              onChange={e => setRole(e.target.value)}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '8px 12px',
                borderRadius: 10,
                border: '1px solid #e5e7eb',
                background: '#f9fafb',
                color: '#1a1d24',
                fontSize: 13,
                outline: 'none',
                transition: 'border-color 0.15s',
              }}
              onFocus={e => { e.currentTarget.style.borderColor = '#0ab9e6'; }}
              onBlur={e => { e.currentTarget.style.borderColor = '#e5e7eb'; }}
            />
          </div>
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#8b95a3', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>Instructions (optional)</div>
          <textarea
            placeholder="Detailed instructions for this teammate..."
            value={instructions}
            onChange={e => setInstructions(e.target.value)}
            rows={2}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: '8px 12px',
              borderRadius: 10,
              border: '1px solid #e5e7eb',
              background: '#f9fafb',
              color: '#1a1d24',
              fontSize: 13,
              fontFamily: 'inherit',
              resize: 'vertical',
              outline: 'none',
              lineHeight: 1.5,
              transition: 'border-color 0.15s',
            }}
            onFocus={e => { e.currentTarget.style.borderColor = '#0ab9e6'; }}
            onBlur={e => { e.currentTarget.style.borderColor = '#e5e7eb'; }}
          />
        </div>
        {skillSpecs.length > 0 && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#8b95a3', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>Skills (optional)</div>
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
                const selected = selectedSkillIds.includes(skill.id);
                const colors = SKILL_TYPE_COLORS[skill.skillType] ?? SKILL_TYPE_COLORS.internal;
                return (
                  <div
                    key={skill.id}
                    onClick={() => toggleSkill(skill.id)}
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
          </div>
        )}
        <button
          onClick={handleCreate}
          disabled={!canCreate}
          style={{
            alignSelf: 'flex-start',
            padding: '8px 20px',
            borderRadius: 14,
            border: 'none',
            background: canCreate ? '#0ab9e6' : '#e8eaed',
            color: canCreate ? '#fff' : '#b0b8c4',
            fontSize: 13,
            fontWeight: 700,
            cursor: canCreate ? 'pointer' : 'default',
            transition: 'background 0.18s',
            boxShadow: canCreate ? '0 2px 8px rgba(10, 185, 230, 0.25)' : 'none',
          }}
        >
          {submitting ? 'Creating...' : 'Create Spec'}
        </button>
      </div>
    </DialogOverlay>
  );
}
