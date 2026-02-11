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
        style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }}
        onClick={onClose}
      />
      {/* Card */}
      <div
        style={{
          position: 'relative',
          background: '#ffffff',
          borderRadius: 12,
          padding: 24,
          maxWidth: 640,
          width: '90%',
          maxHeight: '80vh',
          overflow: 'auto',
          boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 20,
          }}
        >
          <span style={{ fontWeight: 700, fontSize: 16, color: '#111827' }}>{title}</span>
          <button
            onClick={onClose}
            style={{
              width: 28,
              height: 28,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 6,
              border: 'none',
              background: '#f3f4f6',
              color: '#6b7280',
              fontSize: 14,
              cursor: 'pointer',
              lineHeight: 1,
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#e5e7eb'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#f3f4f6'; }}
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
