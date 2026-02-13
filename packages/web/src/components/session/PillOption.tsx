export function PillOption({ selected, color, label, onClick }: {
  selected: boolean;
  color: string;
  label: string;
  onClick: () => void;
}) {
  const bg = selected ? color : '#f3f4f6';
  const fg = selected ? '#fff' : '#6b7280';
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        height: 30,
        padding: '0 14px',
        borderRadius: 15,
        border: 'none',
        background: bg,
        color: fg,
        fontSize: 12,
        fontWeight: selected ? 700 : 500,
        cursor: 'pointer',
        transition: 'background 0.15s, transform 0.1s',
        boxShadow: selected ? `0 2px 8px ${color}40` : 'none',
      }}
      onMouseEnter={e => { if (!selected) e.currentTarget.style.background = '#e9eaed'; }}
      onMouseLeave={e => { if (!selected) e.currentTarget.style.background = '#f3f4f6'; }}
      onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.96)'; }}
      onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)'; }}
    >
      {label}
    </button>
  );
}
