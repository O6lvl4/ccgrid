import { useState } from 'react';
import { Button, Checkbox, Input, ScrollView, Text, TextArea, XStack, YStack } from 'tamagui';
import { Check } from '@tamagui/lucide-icons';
import { useStore } from '../../store/useStore';
import type { Api } from '../../hooks/useApi';

const SKILL_TYPE_COLORS: Record<string, { bg: string; fg: string }> = {
  official: { bg: '#dbeafe', fg: '#1e40af' },
  external: { bg: '#dcfce7', fg: '#166534' },
  internal: { bg: '#f3f4f6', fg: '#374151' },
};

export function TeammateSpecListView({ api }: { api: Api }) {
  const specs = useStore(s => s.teammateSpecs);
  const setTeammateSpecs = useStore(s => s.setTeammateSpecs);
  const skillSpecs = useStore(s => s.skillSpecs);
  const navigate = useStore(s => s.navigate);

  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [instructions, setInstructions] = useState('');
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const toggleSkill = (id: string) => {
    setSelectedSkillIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleCreate = async () => {
    if (!name.trim() || !role.trim()) return;
    setSubmitting(true);
    try {
      const spec = await api.createSpec({
        name: name.trim(),
        role: role.trim(),
        ...(instructions.trim() ? { instructions: instructions.trim() } : {}),
        ...(selectedSkillIds.length > 0 ? { skillIds: selectedSkillIds } : {}),
      });
      setTeammateSpecs([...specs, spec]);
      setName('');
      setRole('');
      setInstructions('');
      setSelectedSkillIds([]);
    } catch (err) {
      console.error('Failed to create spec:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteSpec(id);
      setTeammateSpecs(specs.filter(s => s.id !== id));
    } catch (err) {
      console.error('Failed to delete spec:', err);
    }
  };

  return (
    <ScrollView flex={1}>
      <YStack maxWidth={640} alignSelf="center" width="100%" py="$3">
        {/* Create form */}
        <YStack px="$4" pb="$4" gap="$3" borderBottomWidth={1} borderBottomColor="$gray4">
          <Text fontSize={11} fontWeight="600" color="$gray8" textTransform="uppercase" letterSpacing={0.5}>
            New Teammate Spec
          </Text>
          <XStack gap="$2">
            <YStack flex={1}>
              <Text fontSize={11} color="$gray9" mb="$1">Name</Text>
              <Input
                placeholder="e.g. Frontend"
                value={name}
                onChangeText={setName}
                size="$3"
                bg="$gray3"
                borderColor="$gray5"
                focusStyle={{ borderColor: '$blue9' }}
              />
            </YStack>
            <YStack flex={2}>
              <Text fontSize={11} color="$gray9" mb="$1">Role</Text>
              <Input
                placeholder="e.g. UI implementation specialist"
                value={role}
                onChangeText={setRole}
                size="$3"
                bg="$gray3"
                borderColor="$gray5"
                focusStyle={{ borderColor: '$blue9' }}
              />
            </YStack>
          </XStack>
          <YStack>
            <Text fontSize={11} color="$gray9" mb="$1">Instructions (optional)</Text>
            <TextArea
              placeholder="Detailed instructions for this teammate..."
              value={instructions}
              onChangeText={setInstructions}
              numberOfLines={2}
              bg="$gray3"
              borderColor="$gray5"
              focusStyle={{ borderColor: '$blue9' }}
              fontSize={13}
            />
          </YStack>
          {/* Skills selection */}
          {skillSpecs.length > 0 && (
            <YStack gap="$1.5">
              <Text fontSize={11} color="$gray9">Skills (optional)</Text>
              <YStack bg="$gray2" borderColor="$gray4" borderWidth={1} rounded="$3" p="$2" gap="$1">
                {skillSpecs.map(skill => {
                  const selected = selectedSkillIds.includes(skill.id);
                  const colors = SKILL_TYPE_COLORS[skill.skillType] ?? SKILL_TYPE_COLORS.internal;
                  return (
                    <div
                      key={skill.id}
                      onClick={() => toggleSkill(skill.id)}
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
                        onCheckedChange={() => toggleSkill(skill.id)}
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
            </YStack>
          )}
          <Button
            size="$3"
            bg="$blue9"
            color="white"
            fontWeight="600"
            hoverStyle={{ bg: '$blue8' }}
            disabled={!name.trim() || !role.trim() || submitting}
            disabledStyle={{ bg: '$gray5', opacity: 0.6 }}
            rounded="$3"
            alignSelf="flex-start"
            onPress={handleCreate}
          >
            {submitting ? 'Creating...' : 'Create Spec'}
          </Button>
        </YStack>

        {/* Spec list */}
        <YStack px="$4" pt="$3" gap="$3">
          <Text fontSize={11} fontWeight="600" color="$gray8" textTransform="uppercase" letterSpacing={0.5}>
            Specs ({specs.length})
          </Text>
          {specs.length === 0 ? (
            <YStack py="$6" ai="center">
              <Text fontSize={13} color="$gray7">
                No specs yet. Create one above to define reusable teammates.
              </Text>
            </YStack>
          ) : (
            <YStack gap="$2">
              {specs.map(spec => (
                <YStack
                  key={spec.id}
                  bg="$gray2"
                  borderWidth={1}
                  borderColor="$gray4"
                  rounded="$3"
                  cursor="pointer"
                  hoverStyle={{ borderColor: '$gray6' }}
                  onPress={() => navigate({ view: 'teammate_spec_detail', specId: spec.id })}
                  p="$3"
                  gap="$1"
                >
                  <XStack ai="center" gap="$2">
                    <Text fontWeight="600" fontSize={13} color="$gray12" flex={1}>{spec.name}</Text>
                    <Text fontSize={11} color="$gray9">{spec.role}</Text>
                    {(spec.skillIds?.length ?? 0) > 0 && (
                      <Text fontSize={10} color="$blue9" bg="$blue2" px="$1.5" py="$0.5" rounded="$2" fontWeight="600">
                        {spec.skillIds!.length} skills
                      </Text>
                    )}
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
                  {spec.instructions && (
                    <Text fontSize={12} color="$gray8" numberOfLines={2} lineHeight={18}>
                      {spec.instructions}
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
