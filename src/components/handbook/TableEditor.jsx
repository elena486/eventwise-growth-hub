import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2 } from 'lucide-react';

// Parse an HTML <table> string into { headers: [innerHTML], rows: [[innerHTML]] }
function parseTable(html) {
  try {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const table = doc.querySelector('table');
    if (!table) return { headers: [], rows: [] };
    const headerRow = table.querySelector('thead tr');
    const headers = headerRow
      ? Array.from(headerRow.querySelectorAll('th,td')).map(c => c.innerHTML.trim())
      : [];
    const bodyRows = Array.from(table.querySelectorAll('tbody tr'));
    const rows = bodyRows.map(row =>
      Array.from(row.querySelectorAll('td,th')).map(c => c.innerHTML.trim())
    );
    return { headers, rows };
  } catch {
    return { headers: [], rows: [] };
  }
}

// Serialize back to an HTML <table> string, preserving cell innerHTML exactly
function serializeTable(headers, rows) {
  const thead = headers.length
    ? `<thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>`
    : '';
  const tbody = rows.length
    ? `<tbody>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody>`
    : '';
  return `<table>${thead}${tbody}</table>`;
}

// A single editable cell — uses contentEditable so inner HTML (links, bold etc.) is preserved.
// innerHTML is set via ref only when the prop changes externally, avoiding cursor jumps during typing.
function EditableCell({ html, onBlur, className }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== html) {
      ref.current.innerHTML = html;
    }
  }, [html]);
  return (
    <div
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      onBlur={e => onBlur(e.target.innerHTML)}
      className={className}
    />
  );
}

export default function TableEditor({ html, onChange }) {
  const parsed = parseTable(html);
  const [headers, setHeaders] = useState(parsed.headers);
  const [rows, setRows] = useState(parsed.rows);

  const colCount = headers.length || rows[0]?.length || 0;

  const emit = (newHeaders, newRows) => {
    onChange(serializeTable(newHeaders, newRows));
  };

  const updateHeader = (i, val) => {
    const next = headers.map((h, idx) => idx === i ? val : h);
    setHeaders(next);
    emit(next, rows);
  };

  const updateCell = (r, c, val) => {
    const nextRows = rows.map((row, ri) =>
      ri === r ? row.map((cell, ci) => ci === c ? val : cell) : row
    );
    setRows(nextRows);
    emit(headers, nextRows);
  };

  const addRow = () => {
    const nextRows = [...rows, Array(colCount).fill('')];
    setRows(nextRows);
    emit(headers, nextRows);
  };

  const removeRow = (r) => {
    const nextRows = rows.filter((_, idx) => idx !== r);
    setRows(nextRows);
    emit(headers, nextRows);
  };

  const addColumn = () => {
    const nextHeaders = [...headers, 'New column'];
    const nextRows = rows.map(row => [...row, '']);
    setHeaders(nextHeaders);
    setRows(nextRows);
    emit(nextHeaders, nextRows);
  };

  const removeColumn = (c) => {
    const nextHeaders = headers.filter((_, idx) => idx !== c);
    const nextRows = rows.map(row => row.filter((_, idx) => idx !== c));
    setHeaders(nextHeaders);
    setRows(nextRows);
    emit(nextHeaders, nextRows);
  };

  return (
    <div className="border border-ew-border rounded-xl overflow-hidden">
      <div className="bg-[#242450] px-4 py-2 flex items-center justify-between">
        <span className="text-[11px] font-bold text-white uppercase tracking-wider">Editable Table</span>
        <div className="flex gap-3">
          <button onClick={addRow} className="flex items-center gap-1 text-[11px] text-white/70 hover:text-white">
            <Plus className="w-3 h-3" /> Row
          </button>
          <button onClick={addColumn} className="flex items-center gap-1 text-[11px] text-white/70 hover:text-white">
            <Plus className="w-3 h-3" /> Column
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          {headers.length > 0 && (
            <thead>
              <tr>
                {headers.map((h, i) => (
                  <th key={i} className="relative bg-[#F6F6FB] border border-ew-border p-0" style={{ minWidth: 80 }}>
                    <EditableCell
                      html={h}
                      onBlur={val => updateHeader(i, val)}
                      className="text-[11px] font-semibold text-[#5777AB] uppercase tracking-wide px-2 py-1.5 outline-none focus:bg-[#F0EAF8] min-h-[32px]"
                    />
                    <button onClick={() => removeColumn(i)} className="absolute top-0.5 right-0.5 text-ew-muted hover:text-red-500" title="Remove column">
                      <Trash2 className="w-2.5 h-2.5" />
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
          )}
          <tbody>
            {rows.map((row, r) => (
              <tr key={r} className="group">
                {row.map((cell, c) => (
                  <td key={c} className="border border-ew-border p-0" style={{ minWidth: 80 }}>
                    <EditableCell
                      html={cell}
                      onBlur={val => updateCell(r, c, val)}
                      className="text-xs text-[#1A1A3A] px-2 py-1.5 outline-none focus:bg-[#F0EAF8] min-h-[32px]"
                    />
                  </td>
                ))}
                <td className="border border-ew-border p-0 w-8 align-middle">
                  <button onClick={() => removeRow(r)} className="w-full flex items-center justify-center text-ew-muted hover:text-red-500 opacity-0 group-hover:opacity-100 py-1.5" title="Remove row">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button onClick={addRow} className="w-full flex items-center justify-center gap-1 py-2 text-xs text-[#8403C5] hover:bg-[#F3E8FF] border-t border-ew-border">
        <Plus className="w-3 h-3" /> Add row
      </button>
    </div>
  );
}