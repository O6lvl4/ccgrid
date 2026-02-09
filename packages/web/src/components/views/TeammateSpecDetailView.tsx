import { useState, useEffect, useMemo } from 'react';
import { Checkbox, ScrollView, Text, TextArea, XStack, YStack } from 'tamagui';
import { Check } from '@tamagui/lucide-icons';
import { useStore } from '../../store/useStore';
import { InlineEdit } from '../InlineEdit';
import type { Api } from '../../hooks/useApi';

const SKILL_TYPE_COLORS: Record<string, { bg: string; fg: string }> = {
  official: { bg: '#dbeafe', fg: '#1e40af' },
  external: { bg: '#dcfce7', fg: '#166534' },
  internal: { bg: '#f3f4f6', fg: '#374151' },
};

export function TeammateSpecDetailView({ specId, api }: { specId: string; api: Api }) {
  const specs = useStore(s => s.teammateSpecs);
  const setTeammateSpecs = useStore(s => s.setTeammateSpecs);
  const skillSpecs = useStore(s => s.skillSpecs);
  const navigate = useStore(s => s.navigate);
  const goBack = useStore(s => s.goBack);

  const spec = specs.find(s => s.id === specId);
  const [instructions, setInstructions] = useState(spec?.instructions ?? '');

  useEffect(() => {
    if (!spec) navigate({ view: 'teammate_spec_list' });
  }, [spec, navigate]);

  useEffect(() => {
    setInstructions(spec?.instructions ?? '');
  }, [spec?.instructions]);

  if (!spec) return null;

  const updateField = async (field: 'name' | 'role' | 'instructions', value: string) => {
    try {
      const updated = await api.updateSpec(specId, { [field]: value });
      setTeammateSpecs(specs.map(s => s.id === specId ? updated : s));
    } catch (err) {
      console.error('Failed to update spec:', err);
    }
  };

  const handleInstructionsSave = () => {
    if (instructions !== (spec.instructions ?? '')) {
      updateField('instructions', instructions);
    }
  };

  return (
    <YStack flex={1} overflow="hidden">
      {/* Header */}
      <XStack
        px="$4"
        py="$2"
        bg="$gray2"
        borderBottomWidth={1}
        borderBottomColor="$gray4"
        shrink={0}
        ai="center"
        gap="$3"
      >
        <Text
          fontSize={12}
          color="$gray9"
          cursor="pointer"
          hoverStyle={{ color: '$gray12' }}
          onPress={goBack}
        >
          &larr; Back
        </Text>
        <InlineEdit value={spec.name} onSave={(v) => updateField('name', v)} fontSize={15} fontWeight="700" />
        <Text
          fontSize={11}
          color="$gray7"
          cursor="pointer"
          hoverStyle={{ color: '$red9' }}
          marginLeft="auto"
          onPress={async () => {
            await api.deleteSpec(specId);
            setTeammateSpecs(specs.filter(s => s.id !== specId));
          }}
        >
          Delete
        </Text>
      </XStack>

      {/* Content */}
      <ScrollView flex={1}>
        <YStack p="$4" gap="$4" maxWidth={640} alignSelf="center" width="100%">
          {/* Metadata */}
          <YStack bg="$gray2" borderColor="$gray4" borderWidth={1} rounded="$3" p="$3" gap="$2">
            <XStack gap="$3" ai="center">
              <Text fontSize={12} color="$gray8" width={80}>Name</Text>
              <InlineEdit value={spec.name} onSave={(v) => updateField('name', v)} fontSize={13} fontWeight="500" />
            </XStack>
            <XStack gap="$3" ai="center">
              <Text fontSize={12} color="$gray8" width={80}>Role</Text>
              <InlineEdit value={spec.role} onSave={(v) => updateField('role', v)} fontSize={13} fontWeight="500" />
            </XStack>
            <XStack gap="$3" ai="center">
              <Text fontSize={12} color="$gray8" width={80}>Created</Text>
              <Text fontSize={12} color="$gray9">{new Date(spec.createdAt).toLocaleString()}</Text>
            </XStack>
          </YStack>

          {/* Skills */}
          <YStack gap="$2">
            <XStack ai="center" jc="space-between">
              <Text fontSize={11} fontWeight="600" color="$gray8" textTransform="uppercase" letterSpacing={0.5}>
                Skills
              </Text>
              <Text
                fontSize={11}
                color="$blue9"
                cursor="pointer"
                hoverStyle={{ color: '$blue10' }}
                onPress={() => navigate({ view: 'skill_spec_list' })}
              >
                Manage Skills
              </Text>
            </XStack>
            {skillSpecs.length === 0 ? (
              <Text fontSize={12} color="$gray7" fontStyle="italic">
                No skills defined yet
              </Text>
            ) : (
              <YStack bg="$gray2" borderColor="$gray4" borderWidth={1} rounded="$3" p="$2" gap="$1">
                {skillSpecs.map(skill => {
                  const selected = spec.skillIds?.includes(skill.id) ?? false;
                  const colors = SKILL_TYPE_COLORS[skill.skillType] ?? SKILL_TYPE_COLORS.internal;
                  const toggleSkill = async () => {
                    const current = spec.skillIds ?? [];
                    const next = selected
                      ? current.filter(id => id !== skill.id)
                      : [...current, skill.id];
                    try {
                      const updated = await api.updateSpec(specId, { skillIds: next });
                      setTeammateSpecs(specs.map(s => s.id === specId ? updated : s));
                    } catch (err) {
                      console.error('Failed to update skills:', err);
                    }
                  };
                  return (
                    <div
                      key={skill.id}
                      onClick={toggleSkill}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '6px 8px',
                        borderRadius: 6,
                        cursor: 'pointer',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#f3f4f6')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <Checkbox
                        size="$1"
                        checked={selected}
                        onCheckedChange={toggleSkill}
                        bg={selected ? '$blue9' : '$gray4'}
                        borderColor={selected ? '$blue9' : '$gray6'}
                      >
                        <Checkbox.Indicator>
                          <Check size={10} />
                        </Checkbox.Indicator>
                      </Checkbox>
                      <span style={{ fontSize: 12, color: '#111827', fontWeight: 500, flex: 1 }}>
                        {skill.name}
                      </span>
                      <span style={{
                        fontSize: 10,
                        fontWeight: 600,
                        padding: '1px 6px',
                        borderRadius: 9999,
                        backgroundColor: colors.bg,
                        color: colors.fg,
                      }}>
                        {skill.skillType}
                      </span>
                    </div>
                  );
                })}
              </YStack>
            )}
          </YStack>

          {/* Instructions */}
          <YStack gap="$2">
            <Text fontSize={11} fontWeight="600" color="$gray8" textTransform="uppercase" letterSpacing={0.5}>
              Instructions
            </Text>
            <TextArea
              value={instructions}
              onChangeText={setInstructions}
              onBlur={handleInstructionsSave}
              numberOfLines={10}
              placeholder="Detailed instructions for this teammate..."
              bg="$gray2"
              borderColor="$gray4"
              rounded="$3"
              focusStyle={{ borderColor: '$blue9' }}
              fontSize={13}
              lineHeight={20}
              minHeight={200}
            />
          </YStack>
        </YStack>
      </ScrollView>
    </YStack>
  );
}
