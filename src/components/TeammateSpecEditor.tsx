import type { TeammateSpec } from '../../shared/types';

export function TeammateSpecEditor({
  specs,
  onChange,
}: {
  specs: TeammateSpec[];
  onChange: (specs: TeammateSpec[]) => void;
}) {
  const addSpec = () => {
    onChange([...specs, { id: '', name: '', role: '', createdAt: '' }]);
  };

  const removeSpec = (i: number) => {
    onChange(specs.filter((_, idx) => idx !== i));
  };

  const updateSpec = (i: number, field: keyof TeammateSpec, value: string) => {
    const updated = specs.map((s, idx) => (idx === i ? { ...s, [field]: value } : s));
    onChange(updated);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs text-gray-500">Teammates (空=自動)</label>
        <button
          type="button"
          onClick={addSpec}
          className="text-xs text-blue-400 hover:text-blue-300"
        >
          + 追加
        </button>
      </div>
      {specs.map((spec, i) => (
        <div key={i} className="flex gap-1 items-start">
          <div className="flex-1 space-y-1">
            <div className="flex gap-1">
              <input
                type="text"
                placeholder="名前"
                value={spec.name}
                onChange={e => updateSpec(i, 'name', e.target.value)}
                className="w-1/3 px-2 py-1 text-xs bg-gray-800 border border-gray-700 rounded focus:border-blue-500 focus:outline-none"
              />
              <input
                type="text"
                placeholder="役割 (例: フロントエンド担当)"
                value={spec.role}
                onChange={e => updateSpec(i, 'role', e.target.value)}
                className="flex-1 px-2 py-1 text-xs bg-gray-800 border border-gray-700 rounded focus:border-blue-500 focus:outline-none"
              />
            </div>
            <input
              type="text"
              placeholder="詳細指示 (任意)"
              value={spec.instructions ?? ''}
              onChange={e => updateSpec(i, 'instructions', e.target.value)}
              className="w-full px-2 py-1 text-xs bg-gray-800 border border-gray-700 rounded focus:border-blue-500 focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={() => removeSpec(i)}
            className="px-1.5 py-1 text-xs text-red-500 hover:text-red-400"
            title="削除"
          >
            &times;
          </button>
        </div>
      ))}
    </div>
  );
}
