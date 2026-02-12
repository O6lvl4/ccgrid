import { useState } from 'react';
import { YStack, XStack, Text, Button, Input } from 'tamagui';
import { useStore } from '../store/useStore';
import { useApi } from '../hooks/useApi';
import type { PermissionRule } from '@ccgrid/shared';

export function PermissionRulesPanel() {
  const rules = useStore(s => s.permissionRules);
  const api = useApi();
  const [adding, setAdding] = useState(false);
  const [toolName, setToolName] = useState('');
  const [pathPattern, setPathPattern] = useState('');
  const [behavior, setBehavior] = useState<'allow' | 'deny'>('allow');

  const handleAdd = async () => {
    if (!toolName.trim()) return;
    try {
      await api.createPermissionRule({
        toolName: toolName.trim(),
        ...(pathPattern.trim() ? { pathPattern: pathPattern.trim() } : {}),
        behavior,
      });
      setToolName('');
      setPathPattern('');
      setAdding(false);
    } catch (err) {
      console.error('Failed to create rule:', err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deletePermissionRule(id);
    } catch (err) {
      console.error('Failed to delete rule:', err);
    }
  };

  return (
    <YStack gap="$2">
      {rules.length === 0 && !adding && (
        <Text fontSize={12} color="$gray7" fontStyle="italic">
          No rules configured. Rules auto-approve or deny tool requests.
        </Text>
      )}

      {rules.map(rule => (
        <RuleRow key={rule.id} rule={rule} onDelete={handleDelete} />
      ))}

      {adding ? (
        <YStack bg="$gray2" borderWidth={1} borderColor="$gray4" rounded="$3" p="$3" gap="$2">
          <XStack gap="$2" ai="center">
            <Input
              size="$2"
              flex={1}
              placeholder='Tool name (e.g. "Bash", "Write", "*")'
              value={toolName}
              onChangeText={setToolName}
              bg="$gray1"
              borderColor="$gray5"
              fontSize={12}
              fontFamily="monospace"
            />
            <XStack gap={4}>
              {(['allow', 'deny'] as const).map(b => {
                const selected = behavior === b;
                return (
                  <Text
                    key={b}
                    tag="button"
                    fontSize={11}
                    fontWeight={selected ? '600' : '400'}
                    px="$2"
                    py="$1"
                    rounded="$2"
                    cursor="pointer"
                    bg={selected ? (b === 'allow' ? '$green9' : '$red9') : '$gray3'}
                    color={selected ? 'white' : '$gray11'}
                    borderWidth={1}
                    borderColor={selected ? (b === 'allow' ? '$green9' : '$red9') : '$gray5'}
                    onPress={() => setBehavior(b)}
                  >
                    {b}
                  </Text>
                );
              })}
            </XStack>
          </XStack>
          <Input
            size="$2"
            placeholder="Path pattern (optional, e.g. /etc/**)"
            value={pathPattern}
            onChangeText={setPathPattern}
            bg="$gray1"
            borderColor="$gray5"
            fontSize={12}
            fontFamily="monospace"
          />
          <XStack gap="$2" jc="flex-end">
            <Button size="$2" bg="$gray4" color="$gray11" onPress={() => setAdding(false)}>
              Cancel
            </Button>
            <Button
              size="$2"
              bg={toolName.trim() ? '$blue9' : '$gray5'}
              color={toolName.trim() ? 'white' : '$gray8'}
              disabled={!toolName.trim()}
              onPress={handleAdd}
            >
              Add Rule
            </Button>
          </XStack>
        </YStack>
      ) : (
        <Button
          size="$2"
          bg="$gray3"
          color="$gray11"
          borderWidth={1}
          borderColor="$gray5"
          hoverStyle={{ bg: '$gray4' }}
          alignSelf="flex-start"
          onPress={() => setAdding(true)}
        >
          + Add Rule
        </Button>
      )}
    </YStack>
  );
}

function RuleRow({ rule, onDelete }: { rule: PermissionRule; onDelete: (id: string) => void }) {
  const isAllow = rule.behavior === 'allow';
  return (
    <XStack
      ai="center"
      gap="$2"
      bg="$gray2"
      borderWidth={1}
      borderColor="$gray4"
      rounded="$3"
      px="$3"
      py="$2"
    >
      <Text
        fontSize={10}
        fontWeight="700"
        color={isAllow ? '$green11' : '$red11'}
        bg={isAllow ? '$green3' : '$red3'}
        px="$1.5"
        py="$0.5"
        rounded="$2"
        textTransform="uppercase"
      >
        {rule.behavior}
      </Text>
      <Text fontSize={12} fontFamily="monospace" color="$gray12" fontWeight="500">
        {rule.toolName}
      </Text>
      {rule.pathPattern && (
        <Text fontSize={11} fontFamily="monospace" color="$gray8">
          {rule.pathPattern}
        </Text>
      )}
      <XStack flex={1} />
      <Text
        fontSize={11}
        color="$red9"
        cursor="pointer"
        hoverStyle={{ color: '$red11' }}
        onPress={() => onDelete(rule.id)}
      >
        Delete
      </Text>
    </XStack>
  );
}
