import { useStore } from '../../store/useStore';

export function ToastStack() {
  const toasts = useStore(s => s.toasts);
  if (toasts.length === 0) return null;
  return (
    <div style={{
      position: 'fixed', bottom: 20, right: 20, zIndex: 900,
      display: 'flex', flexDirection: 'column', gap: 6, maxWidth: 360,
    }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          padding: '10px 16px', borderRadius: 12,
          background: t.type === 'success' ? '#ecfdf5' : '#eff6ff',
          border: `1px solid ${t.type === 'success' ? '#86efac' : '#93c5fd'}`,
          color: t.type === 'success' ? '#065f46' : '#1e40af',
          fontSize: 12, fontWeight: 600,
          boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
          animation: 'toast-in 0.2s ease-out',
        }}>
          {t.type === 'success' ? '\u2713 ' : ''}{t.message}
        </div>
      ))}
      <style>{`
        @keyframes toast-in {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
