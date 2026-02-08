import { useState } from 'react';
import { Button, Input, ScrollView, Text, TextArea, XStack, YStack } from 'tamagui';
import { useStore } from '../../store/useStore';
import type { Api } from '../../hooks/useApi';

export function TeammateSpecListView({ api }: { api: Api }) {
  const specs = useStore(s => s.teammateSpecs);
  const setTeammateSpecs = useStore(s => s.setTeammateSpecs);
  const navigate = useStore(s => s.navigate);

  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [instructions, setInstructions] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleCreate = async () => {
    if (!name.trim() || !role.trim()) return;
    setSubmitting(true);
    try {
      const spec = await api.createSpec({
        name: name.trim(),
        role: role.trim(),
        ...(instructions.trim() ? { instructions: instructions.trim() } : {}),
      });
      setTeammateSpecs([...specs, spec]);
      setName('');
      setRole('');
      setInstructions('');
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
            <YStack py="$6" items="center">
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
                  <XStack items="center" gap="$2">
                    <Text fontWeight="600" fontSize={13} color="$gray12" flex={1}>{spec.name}</Text>
                    <Text fontSize={11} color="$gray9">{spec.role}</Text>
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
