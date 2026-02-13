const DOT: Record<string, { color: string; pulse?: boolean }> = {
  starting:    { color: '#eab308' },
  running:     { color: '#22c55e', pulse: true },
  completed:   { color: '#8b95a3' },
  error:       { color: '#ef4444' },
  working:     { color: '#0ab9e6', pulse: true },
  idle:        { color: '#8b95a3' },
  stopped:     { color: '#b0b8c4' },
  pending:     { color: '#b0b8c4' },
  in_progress: { color: '#0ab9e6', pulse: true },
};

export function StatusBadge({ status, showLabel = true }: { status: string; showLabel?: boolean }) {
  const d = DOT[status] ?? DOT.pending;

  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      flexShrink: 0,
      lineHeight: 1,
      padding: '3px 10px',
      borderRadius: 12,
      background: `${d.color}14`,
    }}>
      <div
        className={d.pulse ? 'animate-pulse' : undefined}
        style={{
          width: 7,
          height: 7,
          minWidth: 7,
          minHeight: 7,
          borderRadius: '50%',
          backgroundColor: d.color,
          flexShrink: 0,
          boxShadow: d.pulse ? `0 0 6px ${d.color}` : 'none',
        }}
      />
      {showLabel && (
        <span style={{
          fontSize: 11,
          fontWeight: 600,
          color: d.color,
          letterSpacing: 0.2,
          lineHeight: 1,
        }}>
          {status}
        </span>
      )}
    </div>
  );
}
