import { useState, useRef, useCallback } from 'react';
import { YStack, XStack, Text, Input, TextArea, Button, Checkbox, ScrollView } from 'tamagui';
import { Check } from '@tamagui/lucide-icons';
import { DirPicker } from './DirPicker';
import { FileChip } from './FileChip';
import { useStore } from '../store/useStore';
import { readFilesAsAttachments, FILE_ACCEPT } from '../utils/fileUtils';
import type { Api } from '../hooks/useApi';

const MODELS = [
  { value: 'claude-sonnet-4-5-20250929', label: 'Sonnet 4.5' },
  { value: 'claude-opus-4-6', label: 'Opus 4.6' },
  { value: 'claude-haiku-4-5-20251001', label: 'Haiku 4.5' },
];

function FieldLabel({ children }: { children: string }) {
  return (
    <Text fontSize={11} fontWeight="500" color="$gray9" mb="$1">
      {children}
    </Text>
  );
}

export function SessionConfig({ api, onCreated }: { api: Api; onCreated?: () => void }) {
  const allSpecs = useStore(s => s.teammateSpecs);
  const navigate = useStore(s => s.navigate);

  const [name, setName] = useState('');
  const [cwd, setCwd] = useState('');
  const [model, setModel] = useState(MODELS[0].value);
  const [selectedSpecIds, setSelectedSpecIds] = useState<Set<string>>(new Set());
  const [permissionMode, setPermissionMode] = useState<'acceptEdits' | 'bypassPermissions'>('acceptEdits');
  const [maxBudget, setMaxBudget] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [customInstructions, setCustomInstructions] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showDirPicker, setShowDirPicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const toggleSpec = (id: string) => {
    setSelectedSpecIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCreate = async () => {
    if (!name.trim() || !cwd.trim() || !taskDescription.trim()) return;
    const budget = maxBudget ? Number(maxBudget) : undefined;
    const selectedSpecs = allSpecs
      .filter(s => selectedSpecIds.has(s.id))
      .map(s => ({ id: s.id, name: s.name, role: s.role, instructions: s.instructions, skillIds: s.skillIds, createdAt: s.createdAt }));
    setSubmitting(true);
    try {
      const files = attachedFiles.length > 0
        ? await readFilesAsAttachments(attachedFiles)
        : undefined;
      await api.createSession({
        name: name.trim(),
        cwd: cwd.trim(),
        model,
        ...(selectedSpecs.length > 0 ? { teammateSpecs: selectedSpecs } : {}),
        ...(budget && budget > 0 ? { maxBudgetUsd: budget } : {}),
        taskDescription: taskDescription.trim(),
        permissionMode,
        ...(customInstructions.trim() ? { customInstructions: customInstructions.trim() } : {}),
        ...(files ? { files } : {}),
      });
      setName('');
      setTaskDescription('');
      setAttachedFiles([]);
      setSelectedSpecIds(new Set());
      onCreated?.();
    } catch (err) {
      console.error('Failed to create session:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    const files: File[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === 'file') {
        const file = item.getAsFile();
        if (file) files.push(file);
      }
    }
    if (files.length > 0) {
      e.preventDefault();
      setAttachedFiles(prev => [...prev, ...files]);
    }
  }, []);

  const canSubmit = name.trim() && cwd.trim() && taskDescription.trim() && !submitting;

  return (
    <YStack gap="$3">
      {/* Name & Directory */}
      <XStack gap="$3">
        <YStack flex={1}>
          <FieldLabel>Name</FieldLabel>
          <Input
            size="$3"
            placeholder="Session name"
            value={name}
            onChangeText={setName}
            bg="$gray3"
            borderColor="$gray5"
            color="$gray12"
            focusStyle={{ borderColor: '$blue9' }}
          />
        </YStack>
        <YStack flex={1}>
          <FieldLabel>Working Directory</FieldLabel>
          <XStack gap="$1">
            <Input
              size="$3"
              flex={1}
              placeholder="/path/to/project"
              value={cwd}
              onChangeText={setCwd}
              bg="$gray3"
              borderColor="$gray5"
              color="$gray12"
              fontFamily="monospace"
              fontSize={12}
              focusStyle={{ borderColor: '$blue9' }}
            />
            <Button
              size="$3"
              bg="$gray4"
              borderColor="$gray5"
              color="$gray11"
              hoverStyle={{ bg: '$gray5' }}
              onPress={() => setShowDirPicker(true)}
            >
              ...
            </Button>
          </XStack>
        </YStack>
      </XStack>

      {showDirPicker && (
        <DirPicker
          initialPath={cwd}
          onSelect={(path) => { setCwd(path); setShowDirPicker(false); }}
          onClose={() => setShowDirPicker(false)}
        />
      )}

      {/* Task Description */}
      <YStack>
        <FieldLabel>Task Description</FieldLabel>
        <div onPaste={handlePaste}>
          <TextArea
            placeholder="What should the team work on?"
            value={taskDescription}
            onChangeText={setTaskDescription}
            numberOfLines={3}
            bg="$gray3"
            borderColor="$gray5"
            color="$gray12"
            fontSize={13}
            focusStyle={{ borderColor: '$blue9' }}
          />
        </div>
      </YStack>

      {/* Custom Instructions */}
      <YStack>
        <FieldLabel>Custom Instructions (optional)</FieldLabel>
        <div onPaste={handlePaste}>
          <TextArea
            placeholder="Lead Agent への追加指示 (コーディング規約、使用言語、注意事項など)"
            value={customInstructions}
            onChangeText={setCustomInstructions}
            numberOfLines={2}
            bg="$gray3"
            borderColor="$gray5"
            color="$gray12"
            fontSize={12}
            focusStyle={{ borderColor: '$blue9' }}
          />
        </div>
      </YStack>

      {/* File Attachments */}
      <YStack>
        <FieldLabel>Attachments (optional)</FieldLabel>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={FILE_ACCEPT}
          style={{ display: 'none' }}
          onChange={(e) => {
            if (e.target.files) {
              setAttachedFiles(prev => [...prev, ...Array.from(e.target.files!)]);
              e.target.value = '';
            }
          }}
        />
        {attachedFiles.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8, alignItems: 'flex-end' }}>
            {attachedFiles.map((f, i) => (
              <FileChip
                key={`${f.name}-${i}`}
                file={f}
                onRemove={() => setAttachedFiles(prev => prev.filter((_, j) => j !== i))}
              />
            ))}
          </div>
        )}
        <Button
          size="$2"
          bg="$gray3"
          color="$gray11"
          borderWidth={1}
          borderColor="$gray5"
          hoverStyle={{ bg: '$gray4' }}
          alignSelf="flex-start"
          onPress={() => fileInputRef.current?.click()}
        >
          + Attach Files
        </Button>
      </YStack>

      {/* Model & Options */}
      <XStack gap="$4">
        <YStack>
          <FieldLabel>Model</FieldLabel>
          <XStack gap={4}>
            {MODELS.map(m => {
              const selected = model === m.value;
              return (
                <Text
                  key={m.value}
                  tag="button"
                  fontSize={12}
                  fontWeight={selected ? '600' : '400'}
                  px="$2"
                  py="$1.5"
                  rounded="$2"
                  cursor="pointer"
                  bg={selected ? '$blue9' : '$gray3'}
                  color={selected ? 'white' : '$gray11'}
                  borderWidth={1}
                  borderColor={selected ? '$blue9' : '$gray5'}
                  hoverStyle={{ bg: selected ? '$blue8' : '$gray4' }}
                  onPress={() => setModel(m.value)}
                >
                  {m.label}
                </Text>
              );
            })}
          </XStack>
        </YStack>

        <YStack>
          <FieldLabel>Permission</FieldLabel>
          <XStack gap={4}>
            {([
              { value: 'acceptEdits' as const, label: 'Accept Edits' },
              { value: 'bypassPermissions' as const, label: 'Bypass All' },
            ]).map(p => {
              const selected = permissionMode === p.value;
              return (
                <Text
                  key={p.value}
                  tag="button"
                  fontSize={12}
                  fontWeight={selected ? '600' : '400'}
                  px="$2"
                  py="$1.5"
                  rounded="$2"
                  cursor="pointer"
                  bg={selected ? (p.value === 'bypassPermissions' ? '$orange9' : '$blue9') : '$gray3'}
                  color={selected ? 'white' : '$gray11'}
                  borderWidth={1}
                  borderColor={selected ? (p.value === 'bypassPermissions' ? '$orange9' : '$blue9') : '$gray5'}
                  hoverStyle={{ bg: selected ? (p.value === 'bypassPermissions' ? '$orange8' : '$blue8') : '$gray4' }}
                  onPress={() => setPermissionMode(p.value)}
                >
                  {p.label}
                </Text>
              );
            })}
          </XStack>
          {permissionMode === 'bypassPermissions' && (
            <Text fontSize={10} color="$orange9" mt="$1">
              All tool executions will be auto-approved without confirmation
            </Text>
          )}
        </YStack>

      </XStack>

      {/* Budget */}
      <YStack>
        <FieldLabel>Budget (USD)</FieldLabel>
        <Input
          size="$3"
          inputMode="decimal"
          placeholder="No limit"
          value={maxBudget}
          onChangeText={setMaxBudget}
          bg="$gray3"
          borderColor="$gray5"
          color="$gray12"
          focusStyle={{ borderColor: '$blue9' }}
          width={120}
        />
      </YStack>

      {/* Teammate Specs */}
      <YStack>
        <XStack ai="center" jc="space-between" mb="$1">
          <Text fontSize={11} fontWeight="500" color="$gray9">Teammate Specs</Text>
          <Text
            fontSize={11}
            color="$blue9"
            cursor="pointer"
            hoverStyle={{ color: '$blue10' }}
            onPress={() => navigate({ view: 'teammate_spec_list' })}
          >
            Manage Specs
          </Text>
        </XStack>

        {allSpecs.length === 0 ? (
          <Text fontSize={12} color="$gray7" fontStyle="italic">
            No specs created yet
          </Text>
        ) : (
          <XStack gap="$2" flexWrap="wrap">
            {allSpecs.map(spec => {
              const selected = selectedSpecIds.has(spec.id);
              return (
                <XStack
                  key={spec.id}
                  items="baseline"
                  gap="$1.5"
                  px="$2"
                  py="$1"
                  rounded="$2"
                  cursor="pointer"
                  bg={selected ? '$blue4' : '$gray3'}
                  borderWidth={1}
                  borderColor={selected ? '$blue7' : '$gray5'}
                  hoverStyle={{ borderColor: selected ? '$blue8' : '$gray6' }}
                  onPress={() => toggleSpec(spec.id)}
                >
                  <Checkbox
                    size="$1"
                    checked={selected}
                    onCheckedChange={() => toggleSpec(spec.id)}
                    bg={selected ? '$blue9' : '$gray4'}
                    borderColor={selected ? '$blue9' : '$gray6'}
                    alignSelf="center"
                  >
                    <Checkbox.Indicator>
                      <Check size={10} />
                    </Checkbox.Indicator>
                  </Checkbox>
                  <Text fontSize={12} color={selected ? '$gray12' : '$gray11'} fontWeight="500">
                    {spec.name}
                  </Text>
                  <Text fontSize={11} color="$gray8">{spec.role}</Text>
                </XStack>
              );
            })}
          </XStack>
        )}
      </YStack>

      {/* Submit */}
      <Button
        size="$3"
        fontWeight="600"
        bg={canSubmit ? '$blue9' : '$gray5'}
        color={canSubmit ? 'white' : '$gray8'}
        hoverStyle={canSubmit ? { bg: '$blue8' } : {}}
        pressStyle={canSubmit ? { bg: '$blue10' } : {}}
        disabled={!canSubmit}
        onPress={handleCreate}
        alignSelf="flex-start"
      >
        {submitting ? 'Starting...' : 'Start Agent Team'}
      </Button>
    </YStack>
  );
}
