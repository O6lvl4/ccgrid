import type { Session } from '@ccgrid/shared';
import { PermissionRulesPanel } from '../PermissionRulesPanel';

function SectionLabel({ children }: { children: string }) {
  return (
    <div style={{
      fontSize: 11,
      fontWeight: 800,
      color: '#8b95a3',
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      marginBottom: 10,
    }}>
      {children}
    </div>
  );
}

function InfoRow({ label, children, mono }: { label: string; children: React.ReactNode; mono?: boolean }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'baseline',
      gap: 16,
      padding: '5px 0',
    }}>
      <span style={{ fontSize: 12, color: '#8b95a3', flexShrink: 0, width: 100, fontWeight: 500 }}>
        {label}
      </span>
      <span style={{
        fontSize: 13,
        color: '#1a1d24',
        minWidth: 0,
        flex: 1,
        fontFamily: mono ? 'monospace' : 'inherit',
        ...(mono ? { fontSize: 12, color: '#555e6b' } : {}),
      }}>
        {children}
      </span>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      background: '#f9fafb',
      border: '1px solid #f0f1f3',
      borderRadius: 14,
      padding: '14px 18px',
    }}>
      {children}
    </div>
  );
}

export function OverviewTab({ session }: { session: Session }) {
  const hasBudget = session.maxBudgetUsd != null && session.maxBudgetUsd > 0;
  const budgetPercent = hasBudget
    ? Math.min(100, (session.costUsd / session.maxBudgetUsd!) * 100)
    : 0;
  const totalTokens = session.inputTokens + session.outputTokens;
  let budgetColor = '#0ab9e6';
  if (budgetPercent > 80) budgetColor = '#ef4444';
  else if (budgetPercent > 50) budgetColor = '#eab308';

  return (
    <div style={{ flex: 1, overflow: 'auto' }}>
      <div style={{
        padding: 24,
        display: 'flex',
        flexDirection: 'column',
        gap: 28,
        maxWidth: 640,
        margin: '0 auto',
        width: '100%',
        boxSizing: 'border-box',
      }}>
        {/* Task Description */}
        <div>
          <SectionLabel>Task Description</SectionLabel>
          <Card>
            <p style={{
              fontSize: 13,
              color: '#3c4257',
              whiteSpace: 'pre-wrap',
              lineHeight: 1.6,
              margin: 0,
            }}>
              {session.taskDescription}
            </p>
          </Card>
        </div>

        {/* Configuration */}
        <div>
          <SectionLabel>Configuration</SectionLabel>
          <Card>
            <InfoRow label="Model">{session.model}</InfoRow>
            <InfoRow label="Working Dir" mono>{session.cwd}</InfoRow>
            {hasBudget && (
              <InfoRow label="Budget">${session.maxBudgetUsd!.toFixed(2)}</InfoRow>
            )}
            <InfoRow label="Created">{new Date(session.createdAt).toLocaleString()}</InfoRow>
            {session.sessionId && (
              <InfoRow label="Session ID" mono>{session.sessionId}</InfoRow>
            )}
          </Card>
        </div>

        {/* Teammate Specs */}
        {session.teammateSpecs && session.teammateSpecs.length > 0 && (
          <div>
            <SectionLabel>Teammate Specs</SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {session.teammateSpecs.map((spec, i) => (
                <Card key={i}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                    <span style={{ fontWeight: 700, fontSize: 13, color: '#1a1d24' }}>{spec.name}</span>
                    <span style={{
                      fontSize: 11,
                      color: '#8b95a3',
                      fontWeight: 500,
                      padding: '2px 8px',
                      borderRadius: 8,
                      background: '#f0f1f3',
                    }}>
                      {spec.role}
                    </span>
                  </div>
                  {spec.instructions && (
                    <p style={{
                      color: '#555e6b',
                      marginTop: 8,
                      marginBottom: 0,
                      fontSize: 12,
                      whiteSpace: 'pre-wrap',
                      lineHeight: 1.5,
                    }}>
                      {spec.instructions}
                    </p>
                  )}
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Permission Rules */}
        <div>
          <SectionLabel>Permission Rules</SectionLabel>
          <PermissionRulesPanel />
        </div>

        {/* Cost & Tokens */}
        <div>
          <SectionLabel>Cost & Tokens</SectionLabel>
          <Card>
            {/* Cost */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '5px 0' }}>
              <span style={{ fontSize: 12, color: '#8b95a3', width: 100, flexShrink: 0, fontWeight: 500 }}>Cost</span>
              <span style={{ fontFamily: 'monospace', color: '#1a1d24', fontSize: 14, fontWeight: 700 }}>
                ${session.costUsd.toFixed(4)}
              </span>
              {hasBudget && (
                <span style={{ color: '#b0b8c4', fontSize: 12 }}>/ ${session.maxBudgetUsd!.toFixed(2)}</span>
              )}
            </div>

            {/* Budget bar */}
            {hasBudget && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '5px 0' }}>
                <span style={{ fontSize: 12, color: '#8b95a3', width: 100, flexShrink: 0, fontWeight: 500 }}>Budget</span>
                <div style={{
                  flex: 1,
                  height: 6,
                  background: '#e8eaed',
                  borderRadius: 3,
                  overflow: 'hidden',
                  maxWidth: 200,
                }}>
                  <div style={{
                    height: '100%',
                    borderRadius: 3,
                    background: budgetColor,
                    width: `${budgetPercent}%`,
                    transition: 'width 0.3s ease',
                    boxShadow: `0 0 6px ${budgetColor}40`,
                  }} />
                </div>
                <span style={{ fontSize: 11, color: '#8b95a3', fontFamily: 'monospace', fontWeight: 600 }}>
                  {budgetPercent.toFixed(0)}%
                </span>
              </div>
            )}

            {/* Tokens */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '5px 0' }}>
              <span style={{ fontSize: 12, color: '#8b95a3', width: 100, flexShrink: 0, fontWeight: 500 }}>Tokens</span>
              <span style={{ fontFamily: 'monospace', color: '#1a1d24', fontSize: 13, fontWeight: 600 }}>
                {totalTokens.toLocaleString()}
              </span>
              <span style={{ color: '#b0b8c4', fontSize: 11 }}>
                ({session.inputTokens.toLocaleString()} in / {session.outputTokens.toLocaleString()} out)
              </span>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
