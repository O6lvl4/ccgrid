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
        width: 56,
        background: '#1a1d24',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        flexShrink: 0,
        paddingTop: 14,
        gap: 6,
      }}
    >
      {/* Logo */}
      <div
        style={{
          width: 40,
          height: 40,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 10,
          borderRadius: 12,
          background: 'rgba(10, 185, 230, 0.15)',
        }}
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <rect x="1" y="1" width="7.5" height="7.5" rx="2" fill="#0ab9e6"/>
          <rect x="11.5" y="1" width="7.5" height="7.5" rx="2" fill="#0ab9e6" opacity="0.6"/>
          <rect x="1" y="11.5" width="7.5" height="7.5" rx="2" fill="#0ab9e6" opacity="0.6"/>
          <rect x="11.5" y="11.5" width="7.5" height="7.5" rx="2" fill="#0ab9e6"/>
        </svg>
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
              width: 40,
              height: 40,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 12,
              border: 'none',
              background: isActive ? 'rgba(10, 185, 230, 0.18)' : 'transparent',
              cursor: 'pointer',
              transition: 'background 0.18s, transform 0.12s',
              position: 'relative',
            }}
            onMouseEnter={e => {
              if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
              e.currentTarget.style.transform = 'scale(1.08)';
            }}
            onMouseLeave={e => {
              if (!isActive) e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            {isActive && (
              <div
                style={{
                  position: 'absolute',
                  left: -4,
                  top: 10,
                  bottom: 10,
                  width: 3,
                  borderRadius: 3,
                  background: '#0ab9e6',
                  boxShadow: '0 0 6px rgba(10, 185, 230, 0.5)',
                }}
              />
            )}
            <TwemojiIcon emoji={emoji} size={18} />
          </button>
        );
      })}
    </div>
  );
}
