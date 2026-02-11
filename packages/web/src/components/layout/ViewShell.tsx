import { IconRail } from './IconRail';
import { SidebarPanel } from './SidebarPanel';

export function ViewShell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ height: '100vh', display: 'flex', background: '#f9fafb' }}>
      <IconRail />
      <SidebarPanel />
      <div
        role="main"
        style={{
          flex: 1,
          overflow: 'hidden',
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {children}
      </div>
    </div>
  );
}
