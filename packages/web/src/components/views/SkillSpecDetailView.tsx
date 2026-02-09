import { useState, useEffect } from 'react';
import { ScrollView, Text, TextArea, XStack, YStack } from 'tamagui';
import { useStore } from '../../store/useStore';
import { InlineEdit } from '../InlineEdit';
import type { Api } from '../../hooks/useApi';

const SKILL_TYPE_OPTIONS = ['official', 'external', 'internal'] as const;
type SkillType = typeof SKILL_TYPE_OPTIONS[number];

const SKILL_TYPE_COLORS: Record<SkillType, { bg: string; color: string }> = {
  official: { bg: '$blue3', color: '$blue10' },
  external: { bg: '$green3', color: '$green10' },
  internal: { bg: '$gray3', color: '$gray10' },
};

export function SkillSpecDetailView({ specId, api }: { specId: string; api: Api }) {
  const skillSpecs = useStore(s => s.skillSpecs);
  const setSkillSpecs = useStore(s => s.setSkillSpecs);
  const navigate = useStore(s => s.navigate);
  const goBack = useStore(s => s.goBack);

  const spec = skillSpecs.find(s => s.id === specId);
  const [description, setDescription] = useState(spec?.description ?? '');

  useEffect(() => {
    if (!spec) navigate({ view: 'skill_spec_list' });
  }, [spec, navigate]);

  useEffect(() => {
    setDescription(spec?.description ?? '');
  }, [spec?.description]);

  if (!spec) return null;

  const updateField = async (field: 'name' | 'description' | 'skillType', value: string) => {
    try {
      const updated = await api.updateSkillSpec(specId, { [field]: value });
      setSkillSpecs(skillSpecs.map(s => s.id === specId ? updated : s));
    } catch (err) {
      console.error('Failed to update skill spec:', err);
    }
  };

  const handleDescriptionSave = () => {
    if (description !== (spec.description ?? '')) {
      updateField('description', description);
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
            await api.deleteSkillSpec(specId);
            setSkillSpecs(skillSpecs.filter(s => s.id !== specId));
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
              <Text fontSize={12} color="$gray8" width={80}>Type</Text>
              <XStack gap="$1">
                {SKILL_TYPE_OPTIONS.map(opt => (
                  <Text
                    key={opt}
                    fontSize={11}
                    px="$2"
                    py="$1"
                    rounded="$2"
                    cursor="pointer"
                    bg={spec.skillType === opt ? SKILL_TYPE_COLORS[opt].bg : '$gray2'}
                    color={spec.skillType === opt ? SKILL_TYPE_COLORS[opt].color : '$gray8'}
                    borderWidth={1}
                    borderColor={spec.skillType === opt ? SKILL_TYPE_COLORS[opt].color : '$gray5'}
                    fontWeight={spec.skillType === opt ? '600' : '400'}
                    hoverStyle={{ borderColor: SKILL_TYPE_COLORS[opt].color }}
                    onPress={() => updateField('skillType', opt)}
                  >
                    {opt}
                  </Text>
                ))}
              </XStack>
            </XStack>
            <XStack gap="$3" ai="center">
              <Text fontSize={12} color="$gray8" width={80}>Created</Text>
              <Text fontSize={12} color="$gray9">{new Date(spec.createdAt).toLocaleString()}</Text>
            </XStack>
          </YStack>

          {/* Description */}
          <YStack gap="$2">
            <Text fontSize={11} fontWeight="600" color="$gray8" textTransform="uppercase" letterSpacing={0.5}>
              Description
            </Text>
            <TextArea
              value={description}
              onChangeText={setDescription}
              onBlur={handleDescriptionSave}
              numberOfLines={10}
              placeholder="Describe what this skill does..."
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
