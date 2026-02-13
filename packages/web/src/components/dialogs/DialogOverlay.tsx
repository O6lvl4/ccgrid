import type { ReactNode } from 'react';

export function DialogOverlay({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  if (!open) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Backdrop */}
      <div
        style={{ position: 'absolute', inset: 0, background: 'rgba(15,20,30,0.45)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      />
      {/* Card */}
      <div
        style={{
          position: 'relative',
          background: '#ffffff',
          borderRadius: 20,
          maxWidth: 620,
          width: '92%',
          maxHeight: '85vh',
          overflow: 'hidden',
          boxShadow: '0 8px 40px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.04)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '18px 24px',
            borderBottom: '1px solid #f0f1f3',
            flexShrink: 0,
          }}
        >
          <span style={{
            fontWeight: 800,
            fontSize: 15,
            color: '#1a1d24',
            letterSpacing: 0.3,
          }}>
            {title}
          </span>
          <button
            onClick={onClose}
            style={{
              width: 30,
              height: 30,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 15,
              border: 'none',
              background: 'transparent',
              color: '#9ca3af',
              fontSize: 16,
              cursor: 'pointer',
              lineHeight: 1,
              transition: 'background 0.15s, color 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#f3f4f6'; e.currentTarget.style.color = '#555'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#9ca3af'; }}
          >
            ✕
          </button>
        </div>
        {/* Body */}
        <div style={{ padding: '20px 24px 24px', overflow: 'auto', flex: 1 }}>
          {children}
        </div>
      </div>
    </div>
  );
}
