import React, { useState } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import TableEditor from './TableEditor';

const QUILL_MODULES = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ['bold', 'italic', 'underline'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    ['link'],
    ['clean'],
  ],
};

const QUILL_FORMATS = ['header', 'bold', 'italic', 'underline', 'list', 'bullet', 'link'];

// Split HTML content into ordered segments: { type: 'html'|'table', html: string }
// Tables are extracted as standalone segments so they can be edited by TableEditor
// instead of being mangled by Quill.
function splitSegments(html) {
  if (!html) return [];
  const doc = new DOMParser().parseFromString(`<div id="__root">${html}</div>`, 'text/html');
  const root = doc.getElementById('__root');
  const segments = [];
  let currentHtml = '';
  for (const node of Array.from(root.childNodes)) {
    if (node.nodeType === 1 && node.tagName === 'TABLE') {
      if (currentHtml.trim()) {
        segments.push({ type: 'html', html: currentHtml });
        currentHtml = '';
      }
      segments.push({ type: 'table', html: node.outerHTML });
    } else {
      currentHtml += node.nodeType === 3 ? node.textContent : node.outerHTML;
    }
  }
  if (currentHtml.trim()) segments.push({ type: 'html', html: currentHtml });
  return segments;
}

export default function WikiContentEditor({ value, onChange }) {
  const hasTable = value && value.includes('<table');
  const [segments, setSegments] = useState(() => hasTable ? splitSegments(value) : null);

  // No table → plain Quill, unchanged from original behaviour
  if (!hasTable) {
    return (
      <div className="handbook-quill">
        <ReactQuill
          theme="snow"
          defaultValue={value}
          onChange={onChange}
          modules={QUILL_MODULES}
          formats={QUILL_FORMATS}
          placeholder="Write content here…"
          style={{ minHeight: 320 }}
        />
      </div>
    );
  }

  const updateSegment = (i, html) => {
    const next = segments.map((s, idx) => idx === i ? { ...s, html } : s);
    setSegments(next);
    onChange(next.map(s => s.html).join(''));
  };

  return (
    <div className="p-4 space-y-4">
      {segments.map((seg, i) => (
        seg.type === 'table'
          ? <TableEditor key={i} html={seg.html} onChange={html => updateSegment(i, html)} />
          : <div key={i} className="handbook-quill">
              <ReactQuill
                theme="snow"
                defaultValue={seg.html}
                onChange={html => updateSegment(i, html)}
                modules={QUILL_MODULES}
                formats={QUILL_FORMATS}
                style={{ minHeight: 120 }}
              />
            </div>
      ))}
    </div>
  );
}