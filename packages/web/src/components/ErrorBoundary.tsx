import { Component, type ReactNode } from 'react';

export class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f7f8fa',
        }}>
          <div style={{
            maxWidth: 480,
            padding: 24,
            background: '#ffffff',
            borderRadius: 16,
            border: '1px solid #fecaca',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
          }}>
            <span style={{ fontSize: 15, fontWeight: 800, color: '#ef4444' }}>
              Rendering Error
            </span>
            <pre style={{
              maxHeight: 256,
              overflow: 'auto',
              background: '#f9fafb',
              borderRadius: 12,
              padding: 14,
              margin: 0,
              fontSize: 12,
              color: '#3c4257',
              fontFamily: 'monospace',
              whiteSpace: 'pre-wrap',
              lineHeight: 1.5,
              border: '1px solid #f0f1f3',
            }}>
              {this.state.error.message}
              {'\n'}
              {this.state.error.stack}
            </pre>
            <button
              onClick={() => this.setState({ error: null })}
              style={{
                alignSelf: 'flex-start',
                padding: '6px 18px',
                borderRadius: 14,
                border: 'none',
                background: '#0ab9e6',
                color: '#fff',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'background 0.18s',
                boxShadow: '0 2px 8px rgba(10, 185, 230, 0.25)',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#09a8d2'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#0ab9e6'; }}
            >
              Retry
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
