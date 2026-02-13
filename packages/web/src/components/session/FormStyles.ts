export const inputStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  height: 38,
  padding: '0 12px',
  borderRadius: 10,
  border: '1px solid #e5e7eb',
  background: '#f9fafb',
  color: '#1a1d24',
  fontSize: 13,
  fontFamily: 'inherit',
  outline: 'none',
  transition: 'border-color 0.15s',
};

export const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  height: 'auto',
  minHeight: 72,
  padding: '10px 12px',
  lineHeight: 1.5,
  resize: 'vertical',
};

export const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: '#8b95a3',
  letterSpacing: 0.4,
  textTransform: 'uppercase',
  marginBottom: 6,
};

export const sectionStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
};

export function focusBorder(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) {
  e.currentTarget.style.borderColor = '#0ab9e6';
}

export function blurBorder(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) {
  e.currentTarget.style.borderColor = '#e5e7eb';
}
