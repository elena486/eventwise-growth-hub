import React, { useState, useEffect } from 'react';
import { Pencil, Lock } from 'lucide-react';
import MentionTextarea from './MentionTextarea';

/**
 * Reusable inline-editable cell component.
 * Props:
 *   value        - current value
 *   onSave(val)  - async save callback
 *   type         - 'text' | 'number' | 'select' | 'date' | 'textarea' | 'boolean'
 *   options      - array of strings (for select)
 *   readOnly     - bool, shows lock icon, no editing
 *   placeholder  - string shown when empty
 *   displayEl    - custom JSX for display mode (e.g. a badge component)
 *   className    - extra classes on wrapper
 *   autoEdit     - bool: immediately open edit mode on mount (for new rows)
 *   min/max      - for number inputs
 */
export default function InlineCell({
  value, onSave, type = 'text', options = [],
  readOnly = false, placeholder = '—',
  displayEl, className = '',
  autoEdit = false,
  min, max,
  section, appUrl, author,
}) {
  const [editing, setEditing] = useState(autoEdit);
  const [draft, setDraft] = useState('');
  const [flash, setFlash] = useState(null); // 'ok' | 'err'

  useEffect(() => {
    if (autoEdit) { setDraft(value ?? ''); setEditing(true); }
  }, [autoEdit]);

  const doSave = async (val) => {
    setEditing(false);
    if (String(val ?? '') === String(value ?? '')) return;
    try {
      await onSave(val);
      setFlash('ok');
      setTimeout(() => setFlash(null), 500);
    } catch {
      setFlash('err');
      setTimeout(() => setFlash(null), 1000);
    }
  };

  const startEdit = () => { setDraft(value ?? ''); setEditing(true); };
  const cancel = () => setEditing(false);

  const flashCls = flash === 'ok' ? 'bg-[#E1F5EE]' : flash === 'err' ? 'bg-red-50' : '';
  const ic = 'w-full text-sm border-2 border-navy rounded-lg px-2 py-1 focus:outline-none bg-white';

  if (readOnly) {
    return (
      <span className={`flex items-center gap-1 ${className}`}>
        {displayEl ?? <span className="text-ew-body">{value || '—'}</span>}
        <Lock className="w-2.5 h-2.5 text-ew-muted opacity-30 shrink-0" />
      </span>
    );
  }

  if (type === 'boolean') {
    return (
      <button
        className={`relative inline-flex h-5 w-9 rounded-full transition-colors ${value ? 'bg-navy' : 'bg-gray-200'} ${flashCls}`}
        onClick={() => doSave(!value)}
      >
        <span className={`inline-block w-3.5 h-3.5 bg-white rounded-full shadow transition-transform mt-0.5 ${value ? 'translate-x-4' : 'translate-x-1'}`} />
      </button>
    );
  }

  if (editing) {
    if (type === 'select') return (
      <select className={ic} value={draft} autoFocus
        onChange={e => doSave(e.target.value)}
        onBlur={() => cancel()}
        onKeyDown={e => { if (e.key === 'Escape') cancel(); }}>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    );

    if (type === 'date') return (
      <input type="date" className={ic} value={draft} autoFocus
        onChange={e => setDraft(e.target.value)}
        onBlur={() => doSave(draft)}
        onKeyDown={e => { if (e.key === 'Enter') doSave(draft); if (e.key === 'Escape') cancel(); }} />
    );

    if (type === 'number') return (
      <input type="number" className={`${ic} w-24`} value={draft} autoFocus
        min={min} max={max}
        onChange={e => setDraft(e.target.value)}
        onBlur={() => doSave(parseFloat(draft) || 0)}
        onKeyDown={e => { if (e.key === 'Enter') doSave(parseFloat(draft) || 0); if (e.key === 'Escape') cancel(); }} />
    );

    if (type === 'textarea') return (
      <MentionTextarea
        className={`${ic} min-h-[60px] resize-none`}
        value={draft}
        autoFocus
        rows={3}
        onChange={setDraft}
        onSave={(val) => doSave(val)}
        onKeyDown={e => { if (e.key === 'Escape') { doSave(draft); cancel(); } }}
        section={section}
        appUrl={appUrl}
        author={author}
      />
    );

    // text
    return (
      <input type="text" className={ic} value={draft} autoFocus
        onChange={e => setDraft(e.target.value)}
        onBlur={() => doSave(draft)}
        onKeyDown={e => { if (e.key === 'Enter') doSave(draft); if (e.key === 'Escape') cancel(); }} />
    );
  }

  return (
    <div
      className={`group relative cursor-pointer rounded px-1 py-0.5 hover:bg-gray-50 transition-colors ${flashCls} ${className}`}
      onClick={startEdit}
    >
      {displayEl ?? (
        <span className={value != null && value !== '' ? '' : 'text-ew-muted-light italic text-xs'}>
          {value != null && value !== '' ? value : placeholder}
        </span>
      )}
      <Pencil className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 text-ew-muted opacity-0 group-hover:opacity-50 transition-opacity pointer-events-none" />
    </div>
  );
}