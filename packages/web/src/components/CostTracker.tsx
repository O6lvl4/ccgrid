import type { Session } from '@ccgrid/shared';

export function CostTracker({ session }: { session: Session }) {
  const totalTokens = session.inputTokens + session.outputTokens;
  const hasBudget = session.maxBudgetUsd != null && session.maxBudgetUsd > 0;
  const budgetPercent = hasBudget
    ? Math.min(100, (session.costUsd / session.maxBudgetUsd!) * 100)
    : 0;

  const barColor =
    budgetPercent > 80 ? '#ef4444' : budgetPercent > 50 ? '#eab308' : '#0ab9e6';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginLeft: 'auto', flexShrink: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 12, color: '#8b95a3' }}>Cost:</span>
        <span style={{ fontSize: 12, fontFamily: 'monospace', color: '#1a1d24', fontWeight: 600 }}>
          ${session.costUsd.toFixed(4)}
        </span>
        {hasBudget && (
          <span style={{ fontSize: 12, color: '#b0b8c4' }}>
            / ${session.maxBudgetUsd!.toFixed(2)}
          </span>
        )}
      </div>

      {hasBudget && (
        <div style={{ width: 80, height: 6, background: '#e8eaed', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            borderRadius: 3,
            background: barColor,
            width: `${budgetPercent}%`,
            transition: 'width 0.3s ease',
          }} />
        </div>
      )}

      <span style={{ fontSize: 12, fontFamily: 'monospace', color: '#8b95a3' }}>
        {totalTokens.toLocaleString()} tokens
      </span>
    </div>
  );
}
