import { useState, useMemo } from 'react';
import { Button, Input, Text, TextArea, XStack, YStack } from 'tamagui';
import { useStore } from '../../store/useStore';
import { useApi } from '../../hooks/useApi';
import { DialogOverlay } from './DialogOverlay';

const SKILL_TYPE_OPTIONS = ['official', 'external', 'internal'] as const;
type SkillType = typeof SKILL_TYPE_OPTIONS[number];

const OFFICIAL_SKILLS: { name: string; description: string; category: string }[] = [
  { name: 'commit', category: 'Workflow', description: 'Git commitメッセージを生成してコミットを作成する' },
  { name: 'commit-push-pr', category: 'Workflow', description: 'コミット、プッシュ、PR作成をワンステップで実行する' },
  { name: 'code-review', category: 'Workflow', description: '5つの並列エージェントで自動コードレビューを実行する' },
  { name: 'pr-review-toolkit', category: 'Workflow', description: '6つの専門エージェントでPRレビュー' },
  { name: 'feature-dev', category: 'Workflow', description: '7フェーズの構造化されたフィーチャー開発ワークフロー' },
  { name: 'code-simplifier', category: 'Workflow', description: 'コードの簡素化と改善を提案する' },
  { name: 'frontend-design', category: 'Quality', description: '本格的なフロントエンドUIを生成する' },
  { name: 'security-guidance', category: 'Quality', description: 'セキュリティ上の問題を警告する' },
  { name: 'explanatory-output-style', category: 'Quality', description: '教育的な解説を付加する' },
  { name: 'learning-output-style', category: 'Quality', description: 'インタラクティブな学習モード' },
  { name: 'claude-code-setup', category: 'Setup', description: 'Claude Codeプロジェクトの初期セットアップ' },
  { name: 'claude-md-management', category: 'Setup', description: 'CLAUDE.mdファイルの監査・改善' },
  { name: 'plugin-dev', category: 'Setup', description: 'プラグインのスキャフォールドと開発' },
  { name: 'agent-sdk-dev', category: 'Setup', description: 'Agent SDKアプリケーションのセットアップ' },
  { name: 'hookify', category: 'Setup', description: 'カスタムフックの作成と管理' },
  { name: 'docx', category: 'Document', description: 'Word文書の作成と編集' },
  { name: 'pdf', category: 'Document', description: 'PDFドキュメントの生成と操作' },
  { name: 'pptx', category: 'Document', description: 'PowerPointプレゼンテーションの作成と編集' },
  { name: 'xlsx', category: 'Document', description: 'Excelスプレッドシートの作成と編集' },
  { name: 'typescript-lsp', category: 'LSP', description: 'TypeScript Language Server' },
  { name: 'pyright-lsp', category: 'LSP', description: 'Python (Pyright) Language Server' },
  { name: 'rust-analyzer-lsp', category: 'LSP', description: 'Rust Analyzer' },
  { name: 'gopls-lsp', category: 'LSP', description: 'Go Language Server' },
  { name: 'clangd-lsp', category: 'LSP', description: 'C/C++ (clangd) Language Server' },
  { name: 'jdtls-lsp', category: 'LSP', description: 'Java (Eclipse JDT) Language Server' },
  { name: 'kotlin-lsp', category: 'LSP', description: 'Kotlin Language Server' },
  { name: 'swift-lsp', category: 'LSP', description: 'Swift Language Server' },
  { name: 'php-lsp', category: 'LSP', description: 'PHP Language Server' },
  { name: 'lua-lsp', category: 'LSP', description: 'Lua Language Server' },
  { name: 'csharp-lsp', category: 'LSP', description: 'C# Language Server' },
  { name: 'ralph-loop', category: 'Other', description: '完了まで同じタスクを反復する自己参照型AIループ' },
  { name: 'claude-opus-4-5-migration', category: 'Other', description: 'Opus 4.5へのモデル移行を自動化' },
];

const SKILL_TYPE_COLORS: Record<SkillType, { bg: string; color: string }> = {
  official: { bg: '$blue3', color: '$blue10' },
  external: { bg: '$green3', color: '$green10' },
  internal: { bg: '$gray3', color: '$gray10' },
};

export function NewSkillSpecDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const skillSpecs = useStore(s => s.skillSpecs);
  const setSkillSpecs = useStore(s => s.setSkillSpecs);
  const api = useApi();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [skillType, setSkillType] = useState<SkillType>('internal');
  const [selectedOfficial, setSelectedOfficial] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const existingOfficialNames = useMemo(
    () => new Set(skillSpecs.filter(s => s.skillType === 'official').map(s => s.name)),
    [skillSpecs],
  );

  const handleCreate = async () => {
    if (skillType === 'official') {
      if (!selectedOfficial) return;
      const official = OFFICIAL_SKILLS.find(s => s.name === selectedOfficial);
      if (!official) return;
      setSubmitting(true);
      try {
        const spec = await api.createSkillSpec({
          name: official.name,
          description: official.description,
          skillType: 'official',
        });
        setSkillSpecs([...skillSpecs, spec]);
        setSelectedOfficial(null);
        onClose();
      } catch (err) {
        console.error('Failed to create skill spec:', err);
      } finally {
        setSubmitting(false);
      }
    } else {
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
        onClose();
      } catch (err) {
        console.error('Failed to create skill spec:', err);
      } finally {
        setSubmitting(false);
      }
    }
  };

  return (
    <DialogOverlay open={open} onClose={onClose} title="New Skill Spec">
      <YStack gap="$3">
        {/* Type selector */}
        <YStack>
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
                onPress={() => { setSkillType(opt); setSelectedOfficial(null); }}
              >
                {opt}
              </Text>
            ))}
          </XStack>
        </YStack>

        {skillType === 'official' ? (
          <YStack gap="$3">
            <Text fontSize={11} color="$gray9">Select an official skill</Text>
            {['Workflow', 'Quality', 'Setup', 'Document', 'LSP', 'Other'].map(category => {
              const skills = OFFICIAL_SKILLS.filter(s => s.category === category);
              if (skills.length === 0) return null;
              return (
                <YStack key={category} gap="$1.5">
                  <Text fontSize={10} fontWeight="600" color="$gray7" textTransform="uppercase" letterSpacing={0.5}>
                    {category}
                  </Text>
                  {skills.map(skill => {
                    const alreadyAdded = existingOfficialNames.has(skill.name);
                    const isSelected = selectedOfficial === skill.name;
                    return (
                      <XStack
                        key={skill.name}
                        px="$3"
                        py="$2"
                        rounded="$2"
                        borderWidth={1}
                        borderColor={isSelected ? '$blue9' : alreadyAdded ? '$gray3' : '$gray5'}
                        bg={isSelected ? '$blue2' : alreadyAdded ? '$gray2' : '$gray1'}
                        cursor={alreadyAdded ? 'default' : 'pointer'}
                        opacity={alreadyAdded ? 0.5 : 1}
                        hoverStyle={alreadyAdded ? {} : { borderColor: '$blue7' }}
                        onPress={() => { if (!alreadyAdded) setSelectedOfficial(isSelected ? null : skill.name); }}
                        ai="center"
                        gap="$3"
                      >
                        <YStack flex={1} gap="$0.5">
                          <XStack ai="center" gap="$2">
                            <Text fontSize={13} fontWeight="600" color={alreadyAdded ? '$gray8' : '$gray12'}>
                              {skill.name}
                            </Text>
                            {alreadyAdded && (
                              <Text fontSize={10} color="$gray7" fontStyle="italic">Added</Text>
                            )}
                          </XStack>
                          <Text fontSize={11} color="$gray8" lineHeight={16}>
                            {skill.description}
                          </Text>
                        </YStack>
                        {isSelected && (
                          <Text fontSize={14} color="$blue9">✓</Text>
                        )}
                      </XStack>
                    );
                  })}
                </YStack>
              );
            })}
          </YStack>
        ) : (
          <>
            <YStack>
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
          </>
        )}

        <Button
          size="$3"
          bg="$blue9"
          color="white"
          fontWeight="600"
          hoverStyle={{ bg: '$blue8' }}
          disabled={skillType === 'official' ? !selectedOfficial || submitting : !name.trim() || submitting}
          disabledStyle={{ bg: '$gray5', opacity: 0.6 }}
          rounded="$3"
          alignSelf="flex-start"
          onPress={handleCreate}
        >
          {submitting ? 'Creating...' : skillType === 'official' ? 'Add Official Skill' : 'Create Skill Spec'}
        </Button>
      </YStack>
    </DialogOverlay>
  );
}
