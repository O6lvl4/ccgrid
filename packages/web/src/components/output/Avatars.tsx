import { TwemojiIcon } from '../../utils/twemoji';

export const AVATAR_COLORS = [
  { bg: '#3b82f6', fg: '#ffffff' },  // blue
  { bg: '#10b981', fg: '#ffffff' },  // green
  { bg: '#f59e0b', fg: '#1a1a1a' },  // amber
  { bg: '#a855f7', fg: '#ffffff' },  // purple
  { bg: '#f43f5e', fg: '#ffffff' },  // rose
  { bg: '#06b6d4', fg: '#1a1a1a' },  // cyan
  { bg: '#84cc16', fg: '#1a1a1a' },  // lime
  { bg: '#f97316', fg: '#ffffff' },  // orange
];

export function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export const AVATAR_SIZE = 28;

export function Avatar({ label, bg, fg }: { label: string; bg: string; fg: string }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: AVATAR_SIZE,
      height: AVATAR_SIZE,
      minWidth: AVATAR_SIZE,
      minHeight: AVATAR_SIZE,
      borderRadius: AVATAR_SIZE / 2,
      backgroundColor: bg,
      flexShrink: 0,
    }}>
      <span style={{
        color: fg,
        fontSize: 13,
        fontWeight: 800,
        lineHeight: 1,
        userSelect: 'none',
      }}>
        {label}
      </span>
    </div>
  );
}

export function LeadAvatar() {
  return <Avatar label="★" bg="#8b5cf6" fg="#ffffff" />;
}

export function UserAvatar() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: AVATAR_SIZE,
      height: AVATAR_SIZE,
      minWidth: AVATAR_SIZE,
      minHeight: AVATAR_SIZE,
      borderRadius: AVATAR_SIZE / 2,
      backgroundColor: '#6366f1',
      flexShrink: 0,
    }}>
      <span style={{
        color: '#ffffff',
        fontSize: 10,
        fontWeight: 800,
        lineHeight: 1,
        userSelect: 'none',
      }}>
        You
      </span>
    </div>
  );
}

export function TeammateAvatar({ name }: { name: string }) {
  const idx = hashString(name) % AVATAR_COLORS.length;
  const { bg, fg } = AVATAR_COLORS[idx];
  const initial = name.charAt(0).toUpperCase();
  return <Avatar label={initial} bg={bg} fg={fg} />;
}

export function FollowUpAvatar() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: AVATAR_SIZE,
      height: AVATAR_SIZE,
      minWidth: AVATAR_SIZE,
      minHeight: AVATAR_SIZE,
      borderRadius: AVATAR_SIZE / 2,
      backgroundColor: '#3b82f6',
      flexShrink: 0,
    }}>
      <TwemojiIcon emoji="↩️" size={13} />
    </div>
  );
}
