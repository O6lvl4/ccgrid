import { useState, useRef, useCallback } from 'react';
import { DirPicker } from './DirPicker';
import { FileChip } from './FileChip';
import { useStore } from '../store/useStore';
import { readFilesAsAttachments, FILE_ACCEPT } from '../utils/fileUtils';
import { useFileDrop } from '../hooks/useFileDrop';
import { extractPastedFiles } from '../utils/pasteUtils';
import { inputStyle, textareaStyle, labelStyle, sectionStyle, focusBorder, blurBorder } from './session/FormStyles';
import { PillOption } from './session/PillOption';
import { TeammateSelector } from './session/TeammateSelector';
import type { Api } from '../hooks/useApi';
import type { TeammateSpec } from '@ccgrid/shared';

function buildCreateParams(opts: {
  name: string; cwd: string; model: string; taskDescription: string;
  permissionMode: 'acceptEdits' | 'bypassPermissions'; customInstructions: string;
  maxBudget: string; allSpecs: TeammateSpec[]; selectedSpecIds: Set<string>;
  attachedFiles: File[];
}) {
  const budget = opts.maxBudget ? Number(opts.maxBudget) : undefined;
  const selectedSpecs = opts.allSpecs
    .filter(s => opts.selectedSpecIds.has(s.id))
    .map(s => ({ id: s.id, name: s.name, role: s.role, instructions: s.instructions, skillIds: s.skillIds, createdAt: s.createdAt }));
  return {
    name: opts.name.trim(),
    cwd: opts.cwd.trim(),
    model: opts.model,
    ...(selectedSpecs.length > 0 ? { teammateSpecs: selectedSpecs } : {}),
    ...(budget && budget > 0 ? { maxBudgetUsd: budget } : {}),
    taskDescription: opts.taskDescription.trim(),
    permissionMode: opts.permissionMode,
    ...(opts.customInstructions.trim() ? { customInstructions: opts.customInstructions.trim() } : {}),
  };
}

function SubmitButton({ canSubmit, submitting, onClick }: { canSubmit: boolean; submitting: boolean; onClick: () => void }) {
  return (
    <button
      type="button" onClick={onClick} disabled={!canSubmit}
      style={{ alignSelf: 'flex-end', height: 42, padding: '0 28px', borderRadius: 21, border: 'none', background: canSubmit ? '#0ab9e6' : '#e8eaed', color: canSubmit ? '#fff' : '#b0b8c4', fontSize: 14, fontWeight: 800, letterSpacing: 0.4, cursor: canSubmit ? 'pointer' : 'default', transition: 'background 0.2s, transform 0.12s, box-shadow 0.2s', boxShadow: canSubmit ? '0 3px 12px rgba(10,185,230,0.3)' : 'none' }}
      onMouseEnter={e => { if (canSubmit) { e.currentTarget.style.background = '#09a8d2'; e.currentTarget.style.boxShadow = '0 5px 18px rgba(10,185,230,0.4)'; } }}
      onMouseLeave={e => { if (canSubmit) { e.currentTarget.style.background = '#0ab9e6'; e.currentTarget.style.boxShadow = '0 3px 12px rgba(10,185,230,0.3)'; } e.currentTarget.style.transform = 'scale(1)'; }}
      onMouseDown={e => { if (canSubmit) { e.currentTarget.style.transform = 'scale(0.97)'; e.currentTarget.style.boxShadow = '0 1px 6px rgba(10,185,230,0.2)'; } }}
      onMouseUp={e => { if (canSubmit) { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 5px 18px rgba(10,185,230,0.4)'; } }}
    >
      {submitting ? 'Starting...' : 'Start Agent Team'}
    </button>
  );
}

function ModelPermissionBudget({ model, setModel, permissionMode, setPermissionMode, maxBudget, setMaxBudget }: {
  model: string; setModel: (v: string) => void;
  permissionMode: 'acceptEdits' | 'bypassPermissions'; setPermissionMode: (v: 'acceptEdits' | 'bypassPermissions') => void;
  maxBudget: string; setMaxBudget: (v: string) => void;
}) {
  return (
    <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'flex-start' }}>
      <div style={sectionStyle}>
        <label style={labelStyle}>Model</label>
        <div style={{ display: 'flex', gap: 4 }}>
          {MODELS.map(m => <PillOption key={m.value} selected={model === m.value} color="#0ab9e6" label={m.label} onClick={() => setModel(m.value)} />)}
        </div>
      </div>
      <div style={sectionStyle}>
        <label style={labelStyle}>Permission</label>
        <div style={{ display: 'flex', gap: 4 }}>
          <PillOption selected={permissionMode === 'acceptEdits'} color="#0ab9e6" label="Accept Edits" onClick={() => setPermissionMode('acceptEdits')} />
          <PillOption selected={permissionMode === 'bypassPermissions'} color="#f97316" label="Bypass All" onClick={() => setPermissionMode('bypassPermissions')} />
        </div>
        {permissionMode === 'bypassPermissions' && <span style={{ fontSize: 10, color: '#f97316', marginTop: 4 }}>All tool executions will be auto-approved</span>}
      </div>
      <div style={sectionStyle}>
        <label style={labelStyle}>Budget (USD)</label>
        <input type="text" inputMode="decimal" placeholder="No limit" value={maxBudget} onChange={e => setMaxBudget(e.target.value)} style={{ ...inputStyle, width: 100 }} onFocus={focusBorder} onBlur={blurBorder} />
      </div>
    </div>
  );
}

const MODELS = [
  { value: 'claude-sonnet-4-5-20250929', label: 'Sonnet 4.5' },
  { value: 'claude-opus-4-6', label: 'Opus 4.6' },
  { value: 'claude-haiku-4-5-20251001', label: 'Haiku 4.5' },
];

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
    setSubmitting(true);
    try {
      const params = buildCreateParams({ name, cwd, model, taskDescription, permissionMode, customInstructions, maxBudget, allSpecs, selectedSpecIds, attachedFiles });
      const files = attachedFiles.length > 0 ? await readFilesAsAttachments(attachedFiles) : undefined;
      await api.createSession({ ...params, ...(files ? { files } : {}) });
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
    const files = extractPastedFiles(e);
    if (files.length > 0) {
      setAttachedFiles(prev => [...prev, ...files]);
    }
  }, []);

  const addFiles = useCallback((files: File[]) => {
    setAttachedFiles(prev => [...prev, ...files]);
  }, []);

  const { isDragOver, dropHandlers } = useFileDrop(addFiles);

  const canSubmit = name.trim() && cwd.trim() && taskDescription.trim() && !submitting;

  return (
    <div {...dropHandlers} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Name & Directory */}
      <div style={{ display: 'flex', gap: 12 }}>
        <div style={{ ...sectionStyle, flex: 1 }}>
          <label style={labelStyle}>Name</label>
          <input
            type="text"
            placeholder="Session name"
            value={name}
            onChange={e => setName(e.target.value)}
            style={inputStyle}
            onFocus={focusBorder}
            onBlur={blurBorder}
          />
        </div>
        <div style={{ ...sectionStyle, flex: 1 }}>
          <label style={labelStyle}>Working Directory</label>
          <div style={{ display: 'flex', gap: 6 }}>
            <input
              type="text"
              placeholder="/path/to/project"
              value={cwd}
              onChange={e => setCwd(e.target.value)}
              style={{ ...inputStyle, fontFamily: 'ui-monospace, SFMono-Regular, monospace', fontSize: 12 }}
              onFocus={focusBorder}
              onBlur={blurBorder}
            />
            <button
              type="button"
              onClick={() => setShowDirPicker(true)}
              style={{ height: 38, width: 38, minWidth: 38, borderRadius: 10, border: '1px solid #e5e7eb', background: '#f9fafb', color: '#8b95a3', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#f0f1f3'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#f9fafb'; }}
            >...</button>
          </div>
        </div>
      </div>

      {showDirPicker && (
        <DirPicker
          initialPath={cwd}
          onSelect={(path) => { setCwd(path); setShowDirPicker(false); }}
          onClose={() => setShowDirPicker(false)}
        />
      )}

      {/* Task Description */}
      <div style={sectionStyle}>
        <label style={labelStyle}>Task Description</label>
        <textarea
          placeholder="What should the team work on?"
          value={taskDescription}
          onChange={e => setTaskDescription(e.target.value)}
          onPaste={handlePaste}
          rows={3}
          style={textareaStyle}
          onFocus={focusBorder}
          onBlur={blurBorder}
        />
      </div>

      {/* Custom Instructions */}
      <div style={sectionStyle}>
        <label style={labelStyle}>Custom Instructions <span style={{ fontWeight: 400, textTransform: 'none', color: '#b0b8c4' }}>optional</span></label>
        <textarea
          placeholder="Lead Agent への追加指示 (コーディング規約、使用言語、注意事項など)"
          value={customInstructions}
          onChange={e => setCustomInstructions(e.target.value)}
          onPaste={handlePaste}
          rows={2}
          style={{ ...textareaStyle, minHeight: 56 }}
          onFocus={focusBorder}
          onBlur={blurBorder}
        />
      </div>

      {/* Attachments */}
      <div style={{
        ...sectionStyle,
        ...(isDragOver ? { border: '2px dashed #0ab9e6', borderRadius: 12, padding: 12 } : {}),
        transition: 'border 0.15s',
      }}>
        <label style={labelStyle}>Attachments <span style={{ fontWeight: 400, textTransform: 'none', color: '#b0b8c4' }}>optional</span></label>
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
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          style={{ alignSelf: 'flex-start', height: 30, padding: '0 14px', borderRadius: 15, border: '1px solid #e5e7eb', background: '#fff', color: '#8b95a3', fontSize: 12, fontWeight: 500, cursor: 'pointer', transition: 'background 0.15s, border-color 0.15s' }}
          onMouseEnter={e => { e.currentTarget.style.background = '#f9fafb'; e.currentTarget.style.borderColor = '#d1d5db'; }}
          onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#e5e7eb'; }}
        >+ Attach Files</button>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: '#f0f1f3' }} />

      {/* Model & Permission & Budget */}
      <ModelPermissionBudget
        model={model} setModel={setModel}
        permissionMode={permissionMode} setPermissionMode={setPermissionMode}
        maxBudget={maxBudget} setMaxBudget={setMaxBudget}
      />

      {/* Teammate Specs */}
      <TeammateSelector
        allSpecs={allSpecs}
        selectedSpecIds={selectedSpecIds}
        toggleSpec={toggleSpec}
        onManage={() => navigate({ view: 'teammate_spec_list' })}
      />

      {/* Submit */}
      <SubmitButton canSubmit={!!canSubmit} submitting={submitting} onClick={handleCreate} />
    </div>
  );
}
