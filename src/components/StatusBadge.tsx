const DOT: Record<string, { color: string; pulse?: boolean }> = {
  starting:    { color: '#eab308' },
  running:     { color: '#22c55e', pulse: true },
  completed:   { color: '#6b7280' },
  error:       { color: '#ef4444' },
  working:     { color: '#3b82f6', pulse: true },
  idle:        { color: '#6b7280' },
  stopped:     { color: '#9ca3af' },
  pending:     { color: '#9ca3af' },
  in_progress: { color: '#3b82f6', pulse: true },
};

export function StatusBadge({ status, showLabel = true }: { status: string; showLabel?: boolean }) {
  const d = DOT[status] ?? DOT.pending;

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, flexShrink: 0, lineHeight: 1 }}>
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
        }}
      />
      {showLabel && (
        <span style={{ fontSize: 11, color: '#6b7280', letterSpacing: 0.2, lineHeight: 1 }}>
          {status}
        </span>
      )}
    </div>
  );
}
