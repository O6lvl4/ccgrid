import { useState, useEffect } from 'react';

export function FileChip({ file, onRemove }: { file: File; onRemove: () => void }) {
  const isImage = file.type.startsWith('image/');
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!isImage) { setUrl(null); return; }
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file, isImage]);

  return (
    <div style={{
      position: 'relative',
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      borderRadius: isImage ? 10 : 12,
      background: '#f5f7fa',
      overflow: 'hidden',
    }}>
      {isImage && url ? (
        <img
          src={url}
          alt={file.name}
          style={{
            width: 56,
            height: 56,
            objectFit: 'cover',
            borderRadius: 10,
            display: 'block',
          }}
        />
      ) : (
        <span style={{ padding: '4px 0 4px 10px', fontSize: 11, color: '#5a6376', fontWeight: 500 }}>
          {file.type === 'application/pdf' ? '\uD83D\uDCC4' : '\uD83D\uDCDD'} {file.name}
        </span>
      )}
      <span
        onClick={onRemove}
        style={{
          ...(isImage ? {
            position: 'absolute' as const,
            top: 2,
            right: 2,
            width: 18,
            height: 18,
            borderRadius: 9,
            background: 'rgba(0,0,0,0.5)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          } : {
            paddingRight: 10,
            color: '#b0b8c4',
          }),
          cursor: 'pointer',
          fontSize: 12,
          lineHeight: 1,
        }}
        onMouseEnter={e => {
          if (isImage) { e.currentTarget.style.background = 'rgba(220,40,40,0.7)'; }
          else { e.currentTarget.style.color = '#e5484d'; }
        }}
        onMouseLeave={e => {
          if (isImage) { e.currentTarget.style.background = 'rgba(0,0,0,0.5)'; }
          else { e.currentTarget.style.color = '#b0b8c4'; }
        }}
      >
        ×
      </span>
    </div>
  );
}
