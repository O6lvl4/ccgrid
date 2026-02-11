import { useState } from 'react';
import { Button, Checkbox, Input, Text, TextArea, XStack, YStack } from 'tamagui';
import { Check } from '@tamagui/lucide-icons';
import { useStore } from '../../store/useStore';
import { useApi } from '../../hooks/useApi';
import { DialogOverlay } from './DialogOverlay';

const SKILL_TYPE_COLORS: Record<string, { bg: string; fg: string }> = {
  official: { bg: '#dbeafe', fg: '#1e40af' },
  external: { bg: '#dcfce7', fg: '#166534' },
  internal: { bg: '#f3f4f6', fg: '#374151' },
};

export function NewTeammateSpecDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const specs = useStore(s => s.teammateSpecs);
  const setTeammateSpecs = useStore(s => s.setTeammateSpecs);
  const skillSpecs = useStore(s => s.skillSpecs);
  const api = useApi();

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
      onClose();
    } catch (err) {
      console.error('Failed to create spec:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DialogOverlay open={open} onClose={onClose} title="New Teammate Spec">
      <YStack gap="$3">
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
    </DialogOverlay>
  );
}
