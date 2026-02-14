import { useState, useMemo } from 'react';
import { useStore } from '../../store/useStore';
import { useApi } from '../../hooks/useApi';
import { DialogOverlay } from './DialogOverlay';
import { ExternalSkillSection } from './ExternalSkillSection';


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

const SKILL_TYPE_COLORS: Record<SkillType, { bg: string; color: string; border: string }> = {
  official: { bg: 'rgba(10, 185, 230, 0.08)', color: '#0a9ec4', border: '#0ab9e6' },
  external: { bg: 'rgba(22, 163, 74, 0.08)', color: '#16a34a', border: '#16a34a' },
  internal: { bg: '#f7f8fa', color: '#555e6b', border: '#d1d5db' },
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {/* Type selector */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#8b95a3', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>Type</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {SKILL_TYPE_OPTIONS.map(opt => {
              const active = skillType === opt;
              const c = SKILL_TYPE_COLORS[opt];
              return (
                <button
                  key={opt}
                  onClick={() => { setSkillType(opt); setSelectedOfficial(null); }}
                  style={{
                    fontSize: 12,
                    padding: '6px 14px',
                    borderRadius: 10,
                    cursor: 'pointer',
                    background: active ? c.bg : 'transparent',
                    color: active ? c.color : '#8b95a3',
                    border: `1px solid ${active ? c.border : '#e5e7eb'}`,
                    fontWeight: active ? 600 : 400,
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.borderColor = c.border; }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.borderColor = '#e5e7eb'; }}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        </div>

        {skillType === 'official' && (
          <OfficialSkillPicker
            existingOfficialNames={existingOfficialNames}
            selectedOfficial={selectedOfficial}
            setSelectedOfficial={setSelectedOfficial}
          />
        )}
        {skillType === 'external' && (
          <ExternalSkillSection
            onInstalled={() => { onClose(); }}
          />
        )}
        {skillType === 'internal' && (
          <CustomSkillForm
            name={name} setName={setName}
            description={description} setDescription={setDescription}
          />
        )}

        {skillType !== 'external' && (() => {
          const isDisabled = skillType === 'official'
            ? !selectedOfficial || submitting
            : !name.trim() || submitting;
          let buttonLabel: string;
          if (submitting) {
            buttonLabel = 'Creating...';
          } else if (skillType === 'official') {
            buttonLabel = 'Add Official Skill';
          } else {
            buttonLabel = 'Create Skill Spec';
          }
          return (
            <button
              onClick={handleCreate}
              disabled={isDisabled}
              style={{
                alignSelf: 'flex-start',
                padding: '8px 20px',
                borderRadius: 14,
                border: 'none',
                background: isDisabled ? '#e8eaed' : '#0ab9e6',
                color: isDisabled ? '#b0b8c4' : '#fff',
                fontSize: 13,
                fontWeight: 700,
                cursor: isDisabled ? 'default' : 'pointer',
                transition: 'background 0.18s',
                boxShadow: isDisabled ? 'none' : '0 2px 8px rgba(10, 185, 230, 0.25)',
              }}
            >
              {buttonLabel}
            </button>
          );
        })()}
      </div>
    </DialogOverlay>
  );
}

function OfficialSkillPicker({ existingOfficialNames, selectedOfficial, setSelectedOfficial }: {
  existingOfficialNames: Set<string>; selectedOfficial: string | null; setSelectedOfficial: (v: string | null) => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ fontSize: 11, color: '#8b95a3' }}>Select an official skill</div>
      {['Workflow', 'Quality', 'Setup', 'Document', 'LSP', 'Other'].map(category => {
        const skills = OFFICIAL_SKILLS.filter(s => s.category === category);
        if (skills.length === 0) return null;
        return (
          <div key={category} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: '#b0b8c4', textTransform: 'uppercase', letterSpacing: 0.5 }}>{category}</div>
            {skills.map(skill => {
              const alreadyAdded = existingOfficialNames.has(skill.name);
              const isSelected = selectedOfficial === skill.name;
              let borderColor: string;
              if (isSelected) borderColor = '#0ab9e6';
              else if (alreadyAdded) borderColor = '#f0f1f3';
              else borderColor = '#e5e7eb';
              let bg: string;
              if (isSelected) bg = 'rgba(10, 185, 230, 0.06)';
              else if (alreadyAdded) bg = '#f9fafb';
              else bg = '#fff';
              return (
                <div key={skill.name}
                  onClick={() => { if (!alreadyAdded) setSelectedOfficial(isSelected ? null : skill.name); }}
                  style={{ padding: '10px 14px', borderRadius: 12, border: `1px solid ${borderColor}`, background: bg, cursor: alreadyAdded ? 'default' : 'pointer', opacity: alreadyAdded ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: 14, transition: 'border-color 0.15s, background 0.15s' }}
                  onMouseEnter={e => { if (!alreadyAdded && !isSelected) e.currentTarget.style.borderColor = '#0ab9e6'; }}
                  onMouseLeave={e => { if (!alreadyAdded && !isSelected) e.currentTarget.style.borderColor = '#e5e7eb'; }}
                >
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: alreadyAdded ? '#8b95a3' : '#1a1d24' }}>{skill.name}</span>
                      {alreadyAdded && <span style={{ fontSize: 10, color: '#b0b8c4', fontStyle: 'italic' }}>Added</span>}
                    </div>
                    <span style={{ fontSize: 11, color: '#8b95a3', lineHeight: 1.4 }}>{skill.description}</span>
                  </div>
                  {isSelected && <span style={{ fontSize: 14, color: '#0ab9e6', fontWeight: 700 }}>✓</span>}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

function CustomSkillForm({ name, setName, description, setDescription }: {
  name: string; setName: (v: string) => void; description: string; setDescription: (v: string) => void;
}) {
  const inputStyle: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '8px 12px', borderRadius: 10, border: '1px solid #e5e7eb', background: '#f9fafb', color: '#1a1d24', fontSize: 13, outline: 'none', transition: 'border-color 0.15s' };
  return (
    <>
      <div>
        <div style={{ fontSize: 11, fontWeight: 800, color: '#8b95a3', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>Name</div>
        <input placeholder="e.g. Code Review" value={name} onChange={e => setName(e.target.value)} style={inputStyle}
          onFocus={e => { e.currentTarget.style.borderColor = '#0ab9e6'; }} onBlur={e => { e.currentTarget.style.borderColor = '#e5e7eb'; }} />
      </div>
      <div>
        <div style={{ fontSize: 11, fontWeight: 800, color: '#8b95a3', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>Description</div>
        <textarea placeholder="Describe what this skill does..." value={description} onChange={e => setDescription(e.target.value)} rows={2}
          style={{ ...inputStyle, fontFamily: 'inherit', resize: 'vertical', lineHeight: 1.5 }}
          onFocus={e => { e.currentTarget.style.borderColor = '#0ab9e6'; }} onBlur={e => { e.currentTarget.style.borderColor = '#e5e7eb'; }} />
      </div>
    </>
  );
}
