import { useState } from 'react';
import { Button, Input, ScrollView, Text, TextArea, XStack, YStack } from 'tamagui';
import { useStore } from '../../store/useStore';
import type { Api } from '../../hooks/useApi';

const SKILL_TYPE_OPTIONS = ['official', 'external', 'internal'] as const;
type SkillType = typeof SKILL_TYPE_OPTIONS[number];

const SKILL_TYPE_COLORS: Record<SkillType, { bg: string; color: string }> = {
  official: { bg: '$blue3', color: '$blue10' },
  external: { bg: '$green3', color: '$green10' },
  internal: { bg: '$gray3', color: '$gray10' },
};

export function SkillSpecListView({ api }: { api: Api }) {
  const skillSpecs = useStore(s => s.skillSpecs);
  const setSkillSpecs = useStore(s => s.setSkillSpecs);
  const navigate = useStore(s => s.navigate);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [skillType, setSkillType] = useState<SkillType>('internal');
  const [submitting, setSubmitting] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      const spec = await api.createSkillSpec({
        name: name.trim(),
        description: description.trim(),
        skillType,
      });
      setSkillSpecs([...skillSpecs, spec]);
      setName('');
      setDescription('');
      setSkillType('internal');
    } catch (err) {
      console.error('Failed to create skill spec:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteSkillSpec(id);
      setSkillSpecs(skillSpecs.filter(s => s.id !== id));
    } catch (err) {
      console.error('Failed to delete skill spec:', err);
    }
  };

  return (
    <ScrollView flex={1}>
      <YStack maxWidth={640} alignSelf="center" width="100%" py="$3">
        {/* Create form */}
        <YStack px="$4" pb="$4" gap="$3" borderBottomWidth={1} borderBottomColor="$gray4">
          <Text fontSize={11} fontWeight="600" color="$gray8" textTransform="uppercase" letterSpacing={0.5}>
            New Skill Spec
          </Text>
          <XStack gap="$2">
            <YStack flex={1}>
              <Text fontSize={11} color="$gray9" mb="$1">Name</Text>
              <Input
                placeholder="e.g. Code Review"
                value={name}
                onChangeText={setName}
                size="$3"
                bg="$gray3"
                borderColor="$gray5"
                focusStyle={{ borderColor: '$blue9' }}
              />
            </YStack>
            <YStack flex={1}>
              <Text fontSize={11} color="$gray9" mb="$1">Type</Text>
              <XStack gap="$1">
                {SKILL_TYPE_OPTIONS.map(opt => (
                  <Text
                    key={opt}
                    fontSize={12}
                    px="$2"
                    py="$1.5"
                    rounded="$2"
                    cursor="pointer"
                    bg={skillType === opt ? SKILL_TYPE_COLORS[opt].bg : '$gray2'}
                    color={skillType === opt ? SKILL_TYPE_COLORS[opt].color : '$gray8'}
                    borderWidth={1}
                    borderColor={skillType === opt ? SKILL_TYPE_COLORS[opt].color : '$gray5'}
                    fontWeight={skillType === opt ? '600' : '400'}
                    hoverStyle={{ borderColor: SKILL_TYPE_COLORS[opt].color }}
                    onPress={() => setSkillType(opt)}
                  >
                    {opt}
                  </Text>
                ))}
              </XStack>
            </YStack>
          </XStack>
          <YStack>
            <Text fontSize={11} color="$gray9" mb="$1">Description</Text>
            <TextArea
              placeholder="Describe what this skill does..."
              value={description}
              onChangeText={setDescription}
              numberOfLines={2}
              bg="$gray3"
              borderColor="$gray5"
              focusStyle={{ borderColor: '$blue9' }}
              fontSize={13}
            />
          </YStack>
          <Button
            size="$3"
            bg="$blue9"
            color="white"
            fontWeight="600"
            hoverStyle={{ bg: '$blue8' }}
            disabled={!name.trim() || submitting}
            disabledStyle={{ bg: '$gray5', opacity: 0.6 }}
            rounded="$3"
            alignSelf="flex-start"
            onPress={handleCreate}
          >
            {submitting ? 'Creating...' : 'Create Skill Spec'}
          </Button>
        </YStack>

        {/* Spec list */}
        <YStack px="$4" pt="$3" gap="$3">
          <Text fontSize={11} fontWeight="600" color="$gray8" textTransform="uppercase" letterSpacing={0.5}>
            Skills ({skillSpecs.length})
          </Text>
          {skillSpecs.length === 0 ? (
            <YStack py="$6" ai="center">
              <Text fontSize={13} color="$gray7">
                No skill specs yet. Create one above to define reusable skills.
              </Text>
            </YStack>
          ) : (
            <YStack gap="$2">
              {skillSpecs.map(spec => (
                <YStack
                  key={spec.id}
                  bg="$gray2"
                  borderWidth={1}
                  borderColor="$gray4"
                  rounded="$3"
                  cursor="pointer"
                  hoverStyle={{ borderColor: '$gray6' }}
                  onPress={() => navigate({ view: 'skill_spec_detail', specId: spec.id })}
                  p="$3"
                  gap="$1"
                >
                  <XStack ai="center" gap="$2">
                    <Text fontWeight="600" fontSize={13} color="$gray12" flex={1}>{spec.name}</Text>
                    <Text
                      fontSize={10}
                      px="$2"
                      py="$1"
                      rounded="$2"
                      bg={SKILL_TYPE_COLORS[spec.skillType as SkillType]?.bg ?? '$gray3'}
                      color={SKILL_TYPE_COLORS[spec.skillType as SkillType]?.color ?? '$gray10'}
                      fontWeight="600"
                    >
                      {spec.skillType}
                    </Text>
                    <Text
                      fontSize={11}
                      color="$gray7"
                      cursor="pointer"
                      hoverStyle={{ color: '$red9' }}
                      onPress={(e: any) => { e.stopPropagation(); handleDelete(spec.id); }}
                    >
                      Delete
                    </Text>
                  </XStack>
                  {spec.description && (
                    <Text fontSize={12} color="$gray8" numberOfLines={2} lineHeight={18}>
                      {spec.description}
                    </Text>
                  )}
                </YStack>
              ))}
            </YStack>
          )}
        </YStack>
      </YStack>
    </ScrollView>
  );
}
