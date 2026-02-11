import { useStore, type SidebarSection } from '../../store/useStore';
import { TwemojiIcon } from '../../utils/twemoji';

const SECTIONS: { section: SidebarSection; emoji: string; label: string }[] = [
  { section: 'sessions', emoji: '💬', label: 'Sessions' },
  { section: 'teammates', emoji: '👥', label: 'Teammates' },
  { section: 'skills', emoji: '🔧', label: 'Skills' },
];

export function IconRail() {
  const activeSection = useStore(s => s.activeSection);
  const setActiveSection = useStore(s => s.setActiveSection);

  return (
    <div
      style={{
        width: 48,
        background: '#1a1a2e',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        flexShrink: 0,
        paddingTop: 12,
        gap: 4,
      }}
    >
      {/* Logo */}
      <div
        style={{
          width: 36,
          height: 36,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 12,
        }}
      >
        <span style={{ fontSize: 20, color: '#818cf8', lineHeight: 1 }}>⊞</span>
      </div>

      {/* Section icons */}
      {SECTIONS.map(({ section, emoji, label }) => {
        const isActive = activeSection === section;
        return (
          <button
            key={section}
            title={label}
            onClick={() => setActiveSection(section)}
            style={{
              width: 36,
              height: 36,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 8,
              border: 'none',
              background: isActive ? 'rgba(129, 140, 248, 0.2)' : 'transparent',
              cursor: 'pointer',
              transition: 'background 0.15s',
              position: 'relative',
            }}
            onMouseEnter={e => {
              if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
            }}
            onMouseLeave={e => {
              if (!isActive) e.currentTarget.style.background = 'transparent';
            }}
          >
            {isActive && (
              <div
                style={{
                  position: 'absolute',
                  left: -6,
                  top: 8,
                  bottom: 8,
                  width: 3,
                  borderRadius: 2,
                  background: '#818cf8',
                }}
              />
            )}
            <TwemojiIcon emoji={emoji} size={16} />
          </button>
        );
      })}
    </div>
  );
}
