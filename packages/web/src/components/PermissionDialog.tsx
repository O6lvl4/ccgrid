import { useMemo, useState } from 'react';
import { YStack, XStack, Text, Button, ScrollView } from 'tamagui';
import { useStore } from '../store/useStore';
import { useApi } from '../hooks/useApi';
import type { PermissionLogEntry } from '@ccgrid/shared';

const EMPTY_HISTORY: PermissionLogEntry[] = [];

export function PermissionDialog({ sessionId }: { sessionId: string }) {
  const pendingPermissions = useStore(s => s.pendingPermissions);
  const respondToPermission = useStore(s => s.respondToPermission);

  const requests = useMemo(
    () => Array.from(pendingPermissions.values()).filter(p => p.sessionId === sessionId),
    [pendingPermissions, sessionId],
  );

  if (requests.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 20,
        right: 20,
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        maxWidth: 480,
        maxHeight: '60vh',
        overflow: 'auto',
      }}
    >
      {requests.map(req => (
        <PermissionCard
          key={req.requestId}
          req={req}
          onRespond={respondToPermission}
          sessionId={sessionId}
        />
      ))}
    </div>
  );
}

/** Badge to show in the header when there are pending permissions */
export function PermissionBadge({ sessionId }: { sessionId: string }) {
  const pendingPermissions = useStore(s => s.pendingPermissions);
  const count = useMemo(
    () => Array.from(pendingPermissions.values()).filter(p => p.sessionId === sessionId).length,
    [pendingPermissions, sessionId],
  );

  if (count === 0) return null;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '2px 8px',
        borderRadius: 10,
        background: '#fbbf24',
        color: '#78350f',
        fontSize: 11,
        fontWeight: 700,
        animation: 'pulse-badge 1.5s ease-in-out infinite',
      }}
    >
      <span style={{ fontSize: 13 }}>!</span>
      {count} permission{count > 1 ? 's' : ''} pending
      <style>{`
        @keyframes pulse-badge {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
      `}</style>
    </span>
  );
}

function PermissionCard({
  req,
  onRespond,
  sessionId,
}: {
  req: { requestId: string; toolName: string; input: Record<string, unknown>; description?: string; agentId?: string };
  onRespond: (requestId: string, behavior: 'allow' | 'deny', message?: string, updatedInput?: Record<string, unknown>) => void;
  sessionId: string;
}) {
  const api = useApi();
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [parseError, setParseError] = useState(false);

  const handleEdit = () => {
    setEditValue(JSON.stringify(req.input, null, 2));
    setParseError(false);
    setEditing(true);
  };

  const handleChange = (value: string) => {
    setEditValue(value);
    try {
      JSON.parse(value);
      setParseError(false);
    } catch {
      setParseError(true);
    }
  };

  const handleAllow = () => {
    if (editing && !parseError) {
      try {
        const parsed = JSON.parse(editValue);
        const original = JSON.stringify(req.input);
        const edited = JSON.stringify(parsed);
        if (original !== edited) {
          onRespond(req.requestId, 'allow', undefined, parsed);
          return;
        }
      } catch { /* fall through to allow without edit */ }
    }
    onRespond(req.requestId, 'allow');
  };

  return (
    <YStack
      bg="$yellow2"
      borderWidth={1}
      borderColor="$yellow8"
      rounded="$4"
      p="$3"
      gap="$2"
      elevation="$4"
      shadowColor="rgba(0,0,0,0.2)"
      shadowRadius={12}
    >
      <XStack ai="center" gap="$2">
        <Text fontSize={12} fontWeight="700" color="$yellow11">
          Permission Request
        </Text>
        {req.agentId && (
          <Text fontSize={11} color="$gray8" fontFamily="monospace">
            agent: {req.agentId.slice(0, 8)}
          </Text>
        )}
      </XStack>

      <XStack gap="$2" items="baseline">
        <Text fontSize={11} color="$gray9" fontWeight="600" width={50}>Tool</Text>
        <Text fontSize={12} color="$gray12" fontFamily="monospace">{req.toolName}</Text>
      </XStack>

      {req.description && (
        <XStack gap="$2" items="baseline">
          <Text fontSize={11} color="$gray9" fontWeight="600" width={50}>Reason</Text>
          <Text fontSize={12} color="$gray11" flex={1}>{req.description}</Text>
        </XStack>
      )}

      <YStack>
        <XStack jc="space-between" ai="center" mb="$1">
          <Text fontSize={11} color="$gray9" fontWeight="600">Input</Text>
          {!editing && (
            <Button
              size="$1"
              chromeless
              color="$blue10"
              fontSize={11}
              onPress={handleEdit}
            >
              Edit
            </Button>
          )}
          {editing && (
            <Button
              size="$1"
              chromeless
              color="$gray9"
              fontSize={11}
              onPress={() => setEditing(false)}
            >
              Cancel
            </Button>
          )}
        </XStack>

        {editing ? (
          <YStack>
            <textarea
              value={editValue}
              onChange={(e) => handleChange(e.target.value)}
              style={{
                fontFamily: 'monospace',
                fontSize: 11,
                padding: 8,
                borderRadius: 6,
                border: parseError ? '1px solid #e54d2e' : '1px solid #ddd',
                backgroundColor: parseError ? '#fff0ee' : '#f5f5f5',
                minHeight: 80,
                maxHeight: 200,
                resize: 'vertical',
                width: '100%',
                boxSizing: 'border-box',
              }}
            />
            {parseError && (
              <Text fontSize={10} color="$red10" mt="$1">Invalid JSON</Text>
            )}
          </YStack>
        ) : (
          <ScrollView
            horizontal={false}
            maxHeight={120}
            bg="$gray3"
            rounded="$2"
            p="$2"
          >
            <Text fontSize={11} fontFamily="monospace" color="$gray11" whiteSpace="pre-wrap">
              {JSON.stringify(req.input, null, 2)}
            </Text>
          </ScrollView>
        )}
      </YStack>

      <XStack gap="$2" jc="flex-end" mt="$1">
        <Button
          size="$2"
          bg="$gray5"
          color="$gray11"
          hoverStyle={{ bg: '$gray6' }}
          onPress={() => onRespond(req.requestId, 'deny', 'User denied')}
        >
          Deny
        </Button>
        <Button
          size="$2"
          bg="$blue8"
          color="white"
          hoverStyle={{ bg: '$blue7' }}
          fontSize={11}
          onPress={() => {
            api.createPermissionRule({ toolName: req.toolName, behavior: 'allow' }).catch(console.error);
            handleAllow();
          }}
        >
          Always Allow {req.toolName}
        </Button>
        <Button
          size="$2"
          bg="$green9"
          color="white"
          hoverStyle={{ bg: '$green8' }}
          disabled={editing && parseError}
          opacity={editing && parseError ? 0.5 : 1}
          onPress={handleAllow}
        >
          Allow
        </Button>
      </XStack>
    </YStack>
  );
}

/** Collapsible permission history for a session */
export function PermissionHistory({ sessionId }: { sessionId: string }) {
  const [open, setOpen] = useState(false);
  const history = useStore(s => s.permissionHistory.get(sessionId) ?? EMPTY_HISTORY);

  if (history.length === 0) return null;

  return (
    <YStack p="$2">
      <XStack
        ai="center"
        gap="$2"
        cursor="pointer"
        onPress={() => setOpen(!open)}
        py="$1"
      >
        <Text fontSize={11} color="$gray9" userSelect="none">
          {open ? '\u25BC' : '\u25B6'}
        </Text>
        <Text fontSize={11} fontWeight="600" color="$gray9">
          Permission History ({history.length})
        </Text>
      </XStack>
      {open && (
        <ScrollView maxHeight={200} mt="$1">
          <YStack gap="$1">
            {[...history].reverse().map(entry => (
              <PermissionLogRow key={entry.requestId} entry={entry} />
            ))}
          </YStack>
        </ScrollView>
      )}
    </YStack>
  );
}

function PermissionLogRow({ entry }: { entry: PermissionLogEntry }) {
  const bgColor = entry.behavior === 'allow' ? '$green3' : entry.behavior === 'auto' ? '$blue3' : '$red3';
  const fgColor = entry.behavior === 'allow' ? '$green11' : entry.behavior === 'auto' ? '$blue11' : '$red11';
  const label = entry.behavior === 'auto' ? `auto (${entry.rule ?? 'rule'})` : entry.behavior;
  const time = new Date(entry.timestamp).toLocaleTimeString();

  return (
    <XStack ai="center" gap="$2" px="$2" py="$1" bg={bgColor} rounded="$2">
      <Text fontSize={10} fontWeight="700" color={fgColor} width={40}>{label}</Text>
      <Text fontSize={11} fontFamily="monospace" color="$gray11" flex={1}>{entry.toolName}</Text>
      {entry.agentId && (
        <Text fontSize={10} color="$gray8" fontFamily="monospace">{entry.agentId.slice(0, 6)}</Text>
      )}
      <Text fontSize={10} color="$gray8">{time}</Text>
    </XStack>
  );
}
