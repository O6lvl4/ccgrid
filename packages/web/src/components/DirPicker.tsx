import { useState, useEffect, useCallback } from 'react';

interface DirEntry {
  name: string;
  path: string;
}

interface DirListing {
  current: string;
  parent: string;
  dirs: DirEntry[];
}

function PathBreadcrumb({ path, onNavigate }: { path: string; onNavigate: (path: string) => void }) {
  const segments = path.split('/').filter(Boolean);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', minHeight: 20 }}>
      {/* Root */}
      <span
        onClick={() => onNavigate('/')}
        style={{
          fontSize: 12,
          fontFamily: 'monospace',
          color: '#8b95a3',
          cursor: 'pointer',
          padding: '2px 4px',
          borderRadius: 4,
          transition: 'color 0.15s, background 0.15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.color = '#0ab9e6'; e.currentTarget.style.background = '#f0f1f3'; }}
        onMouseLeave={e => { e.currentTarget.style.color = '#8b95a3'; e.currentTarget.style.background = 'transparent'; }}
      >
        /
      </span>

      {segments.map((seg, i) => {
        const segPath = '/' + segments.slice(0, i + 1).join('/');
        const isLast = i === segments.length - 1;
        return (
          <div key={segPath} style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M3.5 2L6.5 5L3.5 8" stroke="#b0b8c4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span
              onClick={isLast ? undefined : () => onNavigate(segPath)}
              style={{
                fontSize: 12,
                fontFamily: 'monospace',
                color: isLast ? '#1a1d24' : '#8b95a3',
                fontWeight: isLast ? 600 : 400,
                cursor: isLast ? 'default' : 'pointer',
                padding: '2px 4px',
                borderRadius: 4,
                transition: 'color 0.15s, background 0.15s',
              }}
              onMouseEnter={e => { if (!isLast) { e.currentTarget.style.color = '#0ab9e6'; e.currentTarget.style.background = '#f0f1f3'; } }}
              onMouseLeave={e => { if (!isLast) { e.currentTarget.style.color = '#8b95a3'; e.currentTarget.style.background = 'transparent'; } }}
            >
              {seg}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function DirPicker({
  initialPath,
  onSelect,
  onClose,
}: {
  initialPath?: string;
  onSelect: (path: string) => void;
  onClose: () => void;
}) {
  const [listing, setListing] = useState<DirListing | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDirs = useCallback(async (path?: string) => {
    setLoading(true);
    try {
      const params = path ? `?path=${encodeURIComponent(path)}` : '';
      const res = await fetch(`/api/dirs${params}`);
      if (res.ok) {
        setListing(await res.json());
      }
    } catch {
      // ignore
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchDirs(initialPath || undefined);
  }, []);

  if (!listing) {
    return (
      <div style={{
        background: '#f9fafb',
        border: '1px solid #f0f1f3',
        borderRadius: 14,
        padding: 20,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <span style={{ fontSize: 12, color: '#8b95a3' }}>Loading...</span>
      </div>
    );
  }

  return (
    <div style={{
      background: '#f9fafb',
      border: '1px solid #f0f1f3',
      borderRadius: 14,
      overflow: 'hidden',
    }}>
      {/* Header: breadcrumb path + up button */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 16px',
        borderBottom: '1px solid #f0f1f3',
        background: '#f7f8fa',
      }}>
        <button
          onClick={() => fetchDirs(listing.parent)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 28,
            height: 28,
            borderRadius: 8,
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#e5e7eb'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M5 10L2 7L5 4" stroke="#8b95a3" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M2 7H9C10.6569 7 12 5.65685 12 4V3" stroke="#8b95a3" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <PathBreadcrumb path={listing.current} onNavigate={fetchDirs} />
        </div>
      </div>

      {/* Directory list */}
      <div style={{ maxHeight: 280, overflow: 'auto' }}>
        {loading && (
          <div style={{ padding: '32px 16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 12, color: '#8b95a3' }}>Loading...</span>
          </div>
        )}
        {!loading && listing.dirs.length === 0 && (
          <div style={{ padding: '32px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M2 5C2 3.89543 2.89543 3 4 3H7.17157C7.70201 3 8.21071 3.21071 8.58579 3.58579L9.41421 4.41421C9.78929 4.78929 10.298 5 10.8284 5H16C17.1046 5 18 5.89543 18 7V15C18 16.1046 17.1046 17 16 17H4C2.89543 17 2 16.1046 2 15V5Z" stroke="#b0b8c4" strokeWidth="1.5" fill="none"/>
            </svg>
            <span style={{ fontSize: 12, color: '#b0b8c4' }}>No subdirectories</span>
          </div>
        )}
        {!loading && listing.dirs.length > 0 && (
          <div style={{ padding: '4px 0' }}>
            {listing.dirs.map(dir => (
              <button
                key={dir.path}
                onClick={() => fetchDirs(dir.path)}
                style={{
                  display: 'flex',
                  width: '100%',
                  padding: '8px 16px',
                  alignItems: 'center',
                  gap: 10,
                  cursor: 'pointer',
                  border: 'none',
                  background: 'transparent',
                  textAlign: 'left',
                  transition: 'background 0.12s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = '#f0f1f3'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M1.5 3.5C1.5 2.67157 2.17157 2 3 2H5.37868C5.77695 2 6.15909 2.15804 6.44065 2.43934L7.06066 3.06066C7.34196 3.34196 7.72435 3.5 8.12132 3.5H11C11.8284 3.5 12.5 4.17157 12.5 5V10.5C12.5 11.3284 11.8284 12 11 12H3C2.17157 12 1.5 11.3284 1.5 10.5V3.5Z" stroke="#8b95a3" strokeWidth="1.2" fill="none"/>
                </svg>
                <span style={{ fontSize: 13, fontFamily: 'monospace', color: '#3c4257', flex: 1 }}>
                  {dir.name}
                </span>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M4.5 2.5L8 6L4.5 9.5" stroke="#b0b8c4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer: selected path + actions */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '10px 16px',
        borderTop: '1px solid #f0f1f3',
        background: '#f7f8fa',
      }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
            <path d="M1.5 3.5C1.5 2.67157 2.17157 2 3 2H5.37868C5.77695 2 6.15909 2.15804 6.44065 2.43934L7.06066 3.06066C7.34196 3.34196 7.72435 3.5 8.12132 3.5H11C11.8284 3.5 12.5 4.17157 12.5 5V10.5C12.5 11.3284 11.8284 12 11 12H3C2.17157 12 1.5 11.3284 1.5 10.5V3.5Z" stroke="#0ab9e6" strokeWidth="1.2" fill="none"/>
          </svg>
          <span style={{
            fontSize: 12,
            fontFamily: 'monospace',
            color: '#3c4257',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            flex: 1,
          }}>
            {listing.current}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#8b95a3',
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer',
              padding: '4px 8px',
              transition: 'color 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = '#1a1d24'; }}
            onMouseLeave={e => { e.currentTarget.style.color = '#8b95a3'; }}
          >
            Cancel
          </button>
          <button
            onClick={() => onSelect(listing.current)}
            style={{
              padding: '6px 16px',
              borderRadius: 12,
              border: 'none',
              background: '#0ab9e6',
              color: '#fff',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'background 0.15s',
              boxShadow: '0 2px 8px rgba(10, 185, 230, 0.25)',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#09a8d2'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#0ab9e6'; }}
          >
            Select Folder
          </button>
        </div>
      </div>
    </div>
  );
}
