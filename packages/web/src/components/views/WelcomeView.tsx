export function WelcomeView() {
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 12,
        background: '#f9fafb',
      }}
    >
      <span style={{ fontSize: 40, lineHeight: 1, color: '#818cf8' }}>⊞</span>
      <span style={{ fontSize: 18, fontWeight: 700, color: '#111827' }}>ccgrid</span>
      <span style={{ fontSize: 13, color: '#9ca3af', textAlign: 'center', maxWidth: 300 }}>
        Select a session or spec from the sidebar to get started
      </span>
    </div>
  );
}
