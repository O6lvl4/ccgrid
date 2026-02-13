import { useState } from 'react';
import { useStore, type SidebarSection } from '../../store/useStore';
import { TwemojiIcon } from '../../utils/twemoji';
import { useUsage, type RateLimitWindow, type UsageData } from '../../hooks/useUsage';

const SECTIONS: { section: SidebarSection; emoji: string; label: string }[] = [
  { section: 'sessions', emoji: '💬', label: 'Sessions' },
  { section: 'teammates', emoji: '👥', label: 'Teammates' },
  { section: 'skills', emoji: '🔧', label: 'Skills' },
];

function usageColor(pct: number): string {
  if (pct > 80) return '#ef4444';
  if (pct > 50) return '#eab308';
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

/** Interpolate green→yellow→red based on percentage */
function gaugeGradientCSS(pct: number): string {
  // Bottom = 0%, top = 100%. Fill stops match the fill height.
  // Color zones baked into the gradient itself so it reads like a fuel gauge.
  const fillEnd = `${pct}%`;
  const fadeEnd = `${Math.min(100, pct + 3)}%`;
  return [
    'linear-gradient(to top,',
    '  #22c55e 0%,',        // green zone (0-40%)
    '  #22c55e 35%,',
    '  #eab308 55%,',       // yellow zone (40-70%)
    '  #ef4444 80%,',       // red zone (70-100%)
    `  #ef4444 ${fillEnd},`,
    `  rgba(255,255,255,0.06) ${fadeEnd},`,
    '  rgba(255,255,255,0.06) 100%',
    ')',
  ].join('');
}

export function IconRail() {
  const activeSection = useStore(s => s.activeSection);
  const setActiveSection = useStore(s => s.setActiveSection);
  const usage = useUsage();
  const [tooltipOpen, setTooltipOpen] = useState(false);

  const sessionPct = usage?.fiveHour?.utilization ?? 0;
  const weeklyPct = usage?.sevenDay?.utilization ?? 0;
  const sonnetPct = usage?.sevenDaySonnet?.utilization ?? 0;

  return (
    <div
      style={{
        width: 56,
        background: '#1a1d24',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        flexShrink: 0,
        paddingTop: 14,
        gap: 6,
        position: 'relative',
      }}
    >
      {/* Logo */}
      <div
        style={{
          width: 40, height: 40,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 10, borderRadius: 12,
          background: 'rgba(10, 185, 230, 0.15)',
        }}
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <rect x="1" y="1" width="7.5" height="7.5" rx="2" fill="#0ab9e6"/>
          <rect x="11.5" y="1" width="7.5" height="7.5" rx="2" fill="#0ab9e6" opacity="0.6"/>
          <rect x="1" y="11.5" width="7.5" height="7.5" rx="2" fill="#0ab9e6" opacity="0.6"/>
          <rect x="11.5" y="11.5" width="7.5" height="7.5" rx="2" fill="#0ab9e6"/>
        </svg>
      </div>

      {/* Section icons */}
      {SECTIONS.map(({ section, emoji, label }) => {
        const isActive = activeSection === section;
        return (
          <button
            key={section}
            title={label}
            onClick={() => setActiveSection(section)}
            style={{
              width: 40, height: 40,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: 12, border: 'none',
              background: isActive ? 'rgba(10, 185, 230, 0.18)' : 'transparent',
              cursor: 'pointer',
              transition: 'background 0.18s, transform 0.12s',
              position: 'relative',
            }}
            onMouseEnter={e => {
              if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
              e.currentTarget.style.transform = 'scale(1.08)';
            }}
            onMouseLeave={e => {
              if (!isActive) e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            {isActive && (
              <div style={{
                position: 'absolute', left: -4, top: 10, bottom: 10, width: 3,
                borderRadius: 3, background: '#0ab9e6',
                boxShadow: '0 0 6px rgba(10, 185, 230, 0.5)',
              }} />
            )}
            <TwemojiIcon emoji={emoji} size={18} />
          </button>
        );
      })}

      {/* ========== FUEL GAUGE AREA ========== */}
      {usage?.fiveHour && (
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
          {/* Tick marks + labels (left side) */}
          <div style={{
            width: 16,
            position: 'relative',
            flexShrink: 0,
          }}>
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

          {/* Three vertical gauge bars */}
          <div style={{
            flex: 1,
            display: 'flex',
            gap: 3,
            paddingRight: 8,
          }}>
            <GaugeBar pct={sessionPct} label="5h" />
            <GaugeBar pct={weeklyPct} label="W" />
            <GaugeBar pct={sonnetPct} label="So" />
          </div>

          {/* Session % floating label at fill level */}
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

          {/* Danger zone stripe (top 20%) */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '20%',
            background: 'repeating-linear-gradient(135deg, transparent, transparent 2px, rgba(239,68,68,0.06) 2px, rgba(239,68,68,0.06) 4px)',
            borderRadius: '0 0 0 0',
            pointerEvents: 'none',
          }} />

          {/* Tooltip */}
          {tooltipOpen && <UsageTooltip usage={usage} />}
        </div>
      )}

      {/* Bottom: reset timer */}
      {usage?.fiveHour && (
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
      )}

      {/* Spacer when no usage data */}
      {!usage?.fiveHour && <div style={{ flex: 1 }} />}
    </div>
  );
}

/** Single vertical gauge bar — fills from bottom, color transitions green→yellow→red */
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
      {/* Track */}
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
        {/* Fill */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: `${pct}%`,
          backgroundImage: gaugeGradientCSS(100),
          borderRadius: 3,
          transition: 'height 1s ease',
          boxShadow: pct > 0 ? `0 0 8px ${color}40, inset 0 0 4px ${color}20` : 'none',
        }} />

        {/* Tick lines inside the bar */}
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

      {/* Label */}
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
