import { useState } from 'react';
import { useUsage, type RateLimitWindow, type UsageData } from '../../hooks/useUsage';

export function usageColor(pct: number): string {
  if (pct >= 75) return '#ef4444';
  if (pct >= 50) return '#eab308';
  return '#22c55e';
}

function timeUntil(iso: string): string {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return 'now';
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  if (h > 24) return `${Math.floor(h / 24)}d`;
  if (h > 0) return `${h}h${m}m`;
  return `${m}m`;
}

function shortModel(name: string): string {
  if (name.includes('opus-4-6')) return 'Op4.6';
  if (name.includes('opus-4-5')) return 'Op4.5';
  if (name.includes('sonnet-4-5')) return 'So4.5';
  if (name.includes('haiku-4-5')) return 'Ha4.5';
  return name.slice(0, 5);
}

/** Smooth gradient mapped to fill height — only shows colors up to current pct */
function gaugeGradientCSS(pct: number): string {
  if (pct <= 50) {
    return 'linear-gradient(to top, #22c55e, #22c55e)';
  }
  if (pct <= 75) {
    const greenEnd = (50 / pct) * 100;
    return `linear-gradient(to top, #22c55e ${greenEnd}%, #eab308 100%)`;
  }
  const greenEnd = (50 / pct) * 100;
  const yellowEnd = (75 / pct) * 100;
  return `linear-gradient(to top, #22c55e ${greenEnd}%, #eab308 ${yellowEnd}%, #ef4444 100%)`;
}

function GaugeBar({ pct, label }: { pct: number; label: string }) {
  const color = usageColor(pct);

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 3,
    }}>
      <div style={{
        flex: 1,
        width: '100%',
        minWidth: 6,
        borderRadius: 4,
        background: 'rgba(255,255,255,0.04)',
        position: 'relative',
        overflow: 'hidden',
        border: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: `${pct}%`,
          backgroundImage: gaugeGradientCSS(pct),
          borderRadius: 3,
          transition: 'height 1s ease',
          boxShadow: pct > 0 ? `0 0 8px ${color}40, inset 0 0 4px ${color}20` : 'none',
        }} />

        {[25, 50, 75].map(tick => (
          <div key={tick} style={{
            position: 'absolute',
            bottom: `${tick}%`,
            left: 0,
            right: 0,
            height: 1,
            background: 'rgba(255,255,255,0.1)',
            pointerEvents: 'none',
          }} />
        ))}
      </div>

      <span style={{
        fontSize: 7,
        fontWeight: 700,
        fontFamily: 'ui-monospace, monospace',
        color: pct > 0 ? color : 'rgba(255,255,255,0.2)',
        letterSpacing: -0.5,
        lineHeight: 1,
        transition: 'color 1s ease',
      }}>
        {label}
      </span>
    </div>
  );
}

function LimitRow({ label, window }: { label: string; window: RateLimitWindow }) {
  const color = usageColor(window.utilization);
  const pct = window.utilization;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>{label}</span>
        <span style={{ fontSize: 10, fontFamily: 'monospace', color, fontWeight: 700 }}>
          {Math.round(pct)}%
        </span>
      </div>
      <div style={{
        height: 4,
        background: 'rgba(255,255,255,0.08)',
        borderRadius: 2,
        overflow: 'hidden',
      }}>
        <div style={{
          height: '100%',
          width: `${pct}%`,
          background: color,
          borderRadius: 2,
          transition: 'width 0.5s ease',
        }} />
      </div>
      <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.25)', textAlign: 'right' }}>
        {timeUntil(window.resetsAt)}
      </span>
    </div>
  );
}

function UsageTooltip({ usage }: { usage: UsageData }) {
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 0,
        left: 60,
        zIndex: 200,
        background: '#1e2028',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 14,
        padding: '14px 16px',
        minWidth: 210,
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      }}
      onClick={e => e.stopPropagation()}
    >
      <div style={{ fontSize: 11, fontWeight: 700, color: '#fff', marginBottom: 12 }}>
        Plan Usage
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {usage.fiveHour && <LimitRow label="Session (5h)" window={usage.fiveHour} />}
        {usage.sevenDay && <LimitRow label="Weekly — All" window={usage.sevenDay} />}
        {usage.sevenDaySonnet && <LimitRow label="Weekly — Sonnet" window={usage.sevenDaySonnet} />}
        {usage.sevenDayOpus && <LimitRow label="Weekly — Opus" window={usage.sevenDayOpus} />}
      </div>

      {usage.cost && (
        <div style={{ marginTop: 14, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>{usage.cost.month} Cost</span>
            <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#0ab9e6', fontWeight: 700 }}>
              ${usage.cost.totalCostUsd.toFixed(2)}
            </span>
          </div>
          {usage.cost.modelBreakdowns.map(m => (
            <div key={m.modelName} style={{
              display: 'flex', justifyContent: 'space-between', padding: '1px 0',
            }}>
              <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace' }}>
                {shortModel(m.modelName)}
              </span>
              <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace' }}>
                ${m.cost.toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function UsageGaugeArea() {
  const usage = useUsage();
  const [tooltipOpen, setTooltipOpen] = useState(false);

  const sessionPct = usage?.fiveHour?.utilization ?? 0;
  const weeklyPct = usage?.sevenDay?.utilization ?? 0;
  const sonnetPct = usage?.sevenDaySonnet?.utilization ?? 0;

  if (!usage?.fiveHour) {
    return <div style={{ flex: 1 }} />;
  }

  return (
    <>
      {/* Fuel gauge */}
      <div
        style={{
          flex: 1,
          width: '100%',
          display: 'flex',
          alignItems: 'stretch',
          padding: '12px 0 10px',
          position: 'relative',
          cursor: 'pointer',
        }}
        onClick={() => setTooltipOpen(!tooltipOpen)}
        onMouseLeave={() => setTooltipOpen(false)}
      >
        {/* Tick marks */}
        <div style={{ width: 16, position: 'relative', flexShrink: 0 }}>
          {[0, 25, 50, 75, 100].map(tick => (
            <span key={tick} style={{
              position: 'absolute',
              bottom: `${tick}%`,
              right: 2,
              fontSize: 7,
              fontFamily: 'ui-monospace, monospace',
              color: tick === 0 ? 'transparent' : 'rgba(255,255,255,0.2)',
              lineHeight: 1,
              transform: 'translateY(50%)',
            }}>
              {tick}
            </span>
          ))}
        </div>

        {/* Three gauge bars */}
        <div style={{ flex: 1, display: 'flex', gap: 3, paddingRight: 8 }}>
          <GaugeBar pct={sessionPct} label="5h" />
          <GaugeBar pct={weeklyPct} label="W" />
          <GaugeBar pct={sonnetPct} label="So" />
        </div>

        {/* Floating session % */}
        <div style={{
          position: 'absolute',
          right: 2,
          bottom: `${sessionPct}%`,
          transform: 'translateY(50%)',
          fontSize: 8,
          fontWeight: 800,
          fontFamily: 'ui-monospace, monospace',
          color: usageColor(sessionPct),
          textShadow: '0 0 6px rgba(0,0,0,0.8)',
          pointerEvents: 'none',
          transition: 'bottom 1s ease, color 1s ease',
        }}>
          {Math.round(sessionPct)}
        </div>

        {/* Danger zone stripe */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '20%',
          background: 'repeating-linear-gradient(135deg, transparent, transparent 2px, rgba(239,68,68,0.06) 2px, rgba(239,68,68,0.06) 4px)',
          pointerEvents: 'none',
        }} />

        {tooltipOpen && <UsageTooltip usage={usage} />}
      </div>

      {/* Bottom: percentage + reset timer */}
      <div style={{
        paddingBottom: 10,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 2,
      }}>
        <span style={{
          fontSize: 14,
          fontWeight: 800,
          fontFamily: 'ui-monospace, monospace',
          color: usageColor(sessionPct),
          transition: 'color 1s ease',
          lineHeight: 1,
        }}>
          {Math.round(sessionPct)}%
        </span>
        <span style={{
          fontSize: 10,
          fontFamily: 'ui-monospace, monospace',
          color: 'rgba(255,255,255,0.4)',
          lineHeight: 1,
        }}>
          {timeUntil(usage.fiveHour.resetsAt)}
        </span>
      </div>
    </>
  );
}
