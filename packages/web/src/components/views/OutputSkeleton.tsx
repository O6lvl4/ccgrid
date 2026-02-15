const SKELETON_CARDS: number[][] = [
  [92, 78, 85, 60],
  [80, 65, 90, 50],
  [70, 88, 55, 82],
];

function SkeletonCard({ lines, delay }: { lines: number[]; delay: number }) {
  return (
    <div style={{
      border: '1px solid #e5e7eb',
      borderRadius: 8,
      backgroundColor: '#ffffff',
      overflow: 'hidden',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px' }}>
        <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#f0f1f3' }} />
        <div style={{ width: 40, height: 12, borderRadius: 4, background: '#f0f1f3' }} />
      </div>
      <div style={{ padding: '0 12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {lines.map((w, i) => (
          <div key={i} className="skeleton-pulse" style={{ height: 12, borderRadius: 4, background: '#f0f1f3', width: `${w}%`, animationDelay: `${(delay + i) * 0.1}s` }} />
        ))}
      </div>
    </div>
  );
}

export function OutputSkeleton() {
  let delay = 0;
  return (
    <div style={{ flex: 1, padding: 16, backgroundColor: '#f9fafb', display: 'flex', flexDirection: 'column', gap: 12 }}>
      {SKELETON_CARDS.map((lines, i) => {
        const d = delay;
        delay += lines.length;
        return <SkeletonCard key={i} lines={lines} delay={d} />;
      })}
      <style>{`
        .skeleton-pulse {
          animation: skeleton-fade 1.2s ease-in-out infinite;
        }
        @keyframes skeleton-fade {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
