import { useStore } from '../../store/useStore';
import { TwemojiIcon } from '../../utils/twemoji';
import { Breadcrumb } from './Breadcrumb';
import { SessionSidebar } from './SessionSidebar';

export function ViewShell({ children }: { children: React.ReactNode }) {
  const route = useStore(s => s.route);
  const navigate = useStore(s => s.navigate);
  const showSidebar =
    route.view !== 'session_list' &&
    route.view !== 'teammate_spec_list' &&
    route.view !== 'teammate_spec_detail' &&
    route.view !== 'skill_spec_list' &&
    route.view !== 'skill_spec_detail';

  const isSessionsActive =
    route.view === 'session_list' ||
    route.view === 'session_detail' ||
    route.view === 'teammate_detail' ||
    route.view === 'task_detail';
  const isSpecsActive =
    route.view === 'teammate_spec_list' ||
    route.view === 'teammate_spec_detail';
  const isSkillsActive =
    route.view === 'skill_spec_list' ||
    route.view === 'skill_spec_detail';

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#f9fafb' }}>
      {/* Header */}
      <div
        role="banner"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: '0 20px',
          height: 48,
          background: '#ffffff',
          borderBottom: '1px solid #e5e7eb',
          flexShrink: 0,
        }}
      >
        {/* Logo */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            marginRight: 24,
            cursor: 'pointer',
          }}
          onClick={() => navigate({ view: 'session_list' })}
        >
          <span style={{ fontSize: 18, lineHeight: 1, color: '#3b82f6' }}>⊞</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#111827', letterSpacing: -0.3 }}>
            ccgrid
          </span>
        </div>

        {/* Nav items */}
        <NavPill
          emoji="💬"
          label="Sessions"
          active={isSessionsActive}
          onClick={() => navigate({ view: 'session_list' })}
        />
        <NavPill
          emoji="👥"
          label="Teammates"
          active={isSpecsActive}
          onClick={() => navigate({ view: 'teammate_spec_list' })}
        />
        <NavPill
          emoji="🔧"
          label="Skills"
          active={isSkillsActive}
          onClick={() => navigate({ view: 'skill_spec_list' })}
        />

        {/* Breadcrumb */}
        <div style={{ marginLeft: 'auto' }}>
          <Breadcrumb />
        </div>
      </div>

      {/* Body */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {showSidebar && <SessionSidebar />}
        <div role="main" style={{ flex: 1, overflow: 'hidden', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          {children}
        </div>
      </div>
    </div>
  );
}

function NavPill({
  emoji,
  label,
  active,
  onClick,
}: {
  emoji: string;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '5px 12px',
        borderRadius: 6,
        border: 'none',
        background: active ? '#f3f4f6' : 'transparent',
        color: active ? '#111827' : '#6b7280',
        fontWeight: active ? 600 : 400,
        fontSize: 13,
        cursor: 'pointer',
        lineHeight: 1,
        transition: 'background 0.15s, color 0.15s',
      }}
      onMouseEnter={e => {
        if (!active) (e.currentTarget as HTMLButtonElement).style.background = '#f9fafb';
      }}
      onMouseLeave={e => {
        if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
      }}
    >
      <TwemojiIcon emoji={emoji} size={13} />
      {label}
    </button>
  );
}
