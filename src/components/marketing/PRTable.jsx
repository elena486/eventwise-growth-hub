import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Trash2, ExternalLink } from 'lucide-react';

export default function PRTable() {
  const [items, setItems] = useState([]);

  const load = () => base44.entities.PRCoverage.list('-date').then(setItems);
  useEffect(() => { load(); }, []);

  const handleDelete = async (id) => {
    await base44.entities.PRCoverage.delete(id);
    load();
  };

  return (
    <div>
      <h2 className="text-base font-bold text-navy mb-4">PR Coverage</h2>
      <div className="bg-white border border-ew-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-ew-footer border-b border-ew-border">
            <tr>
              <th className="text-left text-xs font-semibold text-ew-muted px-4 py-2">Publication</th>
              <th className="text-left text-xs font-semibold text-ew-muted px-4 py-2">Date</th>
              <th className="text-left text-xs font-semibold text-ew-muted px-4 py-2">Headline</th>
              <th className="text-left text-xs font-semibold text-ew-muted px-4 py-2">Link</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-xs text-ew-muted italic">No PR coverage yet</td></tr>
            )}
            {items.map(item => (
              <tr key={item.id} className="border-b border-ew-border last:border-0 hover:bg-navy/[0.02]">
                <td className="px-4 py-2.5 font-medium text-navy">{item.publication}</td>
                <td className="px-4 py-2.5 text-ew-muted">{item.date || '—'}</td>
                <td className="px-4 py-2.5 text-ew-body">{item.headline || '—'}</td>
                <td className="px-4 py-2.5">
                  {item.link ? (
                    <a href={item.link} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-navy hover:underline">
                      <ExternalLink className="w-3 h-3" /> View
                    </a>
                  ) : <span className="text-ew-muted">—</span>}
                </td>
                <td className="px-4 py-2.5">
                  <button onClick={() => handleDelete(item.id)} className="text-ew-muted hover:text-red-500 p-1"><Trash2 className="w-3.5 h-3.5" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}