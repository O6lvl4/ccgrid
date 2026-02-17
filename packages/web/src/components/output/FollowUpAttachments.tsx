import type { FollowUpImage } from '../../store/useStore';

export function FollowUpAttachments({ images }: { images: FollowUpImage[] }) {
  if (images.length === 0) return null;
  const imageFiles = images.filter(img => img.dataUrl && img.mimeType.startsWith('image/'));
  const nonImageFiles = images.filter(img => !img.mimeType.startsWith('image/'));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
      {imageFiles.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {imageFiles.map((img, i) => (
            <img
              key={`${img.name}-${i}`}
              src={img.dataUrl}
              alt={img.name}
              title={img.name}
              style={{
                maxWidth: 160, maxHeight: 120, borderRadius: 8,
                border: '1px solid #e5e7eb', objectFit: 'cover',
              }}
            />
          ))}
        </div>
      )}
      {nonImageFiles.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {nonImageFiles.map((f, i) => (
            <span key={`${f.name}-${i}`} style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '2px 10px', borderRadius: 12,
              background: '#f3f4f6', border: '1px solid #e5e7eb',
              fontSize: 11, color: '#6b7280', fontWeight: 500,
            }}>
              {f.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
