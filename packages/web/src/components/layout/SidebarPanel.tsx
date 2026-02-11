import { useStore } from '../../store/useStore';
import { SessionPanel } from './panels/SessionPanel';
import { TeammatePanel } from './panels/TeammatePanel';
import { SkillPanel } from './panels/SkillPanel';

export function SidebarPanel() {
  const activeSection = useStore(s => s.activeSection);

  return (
    <div
      style={{
        width: 260,
        borderRight: '1px solid #e5e7eb',
        display: 'flex',
        flexDirection: 'column',
        background: '#ffffff',
        overflow: 'hidden',
        flexShrink: 0,
      }}
    >
      {activeSection === 'sessions' && <SessionPanel />}
      {activeSection === 'teammates' && <TeammatePanel />}
      {activeSection === 'skills' && <SkillPanel />}
    </div>
  );
}
