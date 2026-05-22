import { format } from 'date-fns';

/** Format a date value as DD/MM/YYYY, or blank if empty */
export function fmtCsvDate(d) {
  if (!d) return '';
  try { return format(new Date(d), 'dd/MM/yyyy'); } catch { return ''; }
}

/** Format a monetary number as plain integer (no £, no commas) */
export function fmtCsvMoney(n) {
  if (n == null || n === '') return '';
  const num = parseFloat(n);
  if (isNaN(num)) return '';
  return String(Math.round(num));
}

/** Ensure a value is exported as a plain string — never "null" or "undefined" */
export function safe(v) {
  if (v == null || v === 'undefined' || v === 'null') return '';
  return String(v);
}

/**
 * Download an array of row objects as a UTF-8 CSV file.
 * columns: [{ label: string, getValue: (row) => string }]
 */
export function downloadCSV(rows, columns, filename) {
  if (!rows || rows.length === 0) return false;
  const header = columns.map(c => `"${c.label}"`).join(',');
  const body = rows
    .map(row =>
      columns
        .map(c => {
          const val = c.getValue(row) ?? '';
          return `"${String(val).replace(/"/g, '""')}"`;
        })
        .join(',')
    )
    .join('\n');
  // UTF-8 BOM ensures Excel renders £ and special chars correctly
  const csv = '\uFEFF' + header + '\n' + body;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  return true;
}

/** Return today's date as YYYY-MM-DD for use in filenames */
export function todayStr() {
  return format(new Date(), 'yyyy-MM-dd');
}

/** Parse the contacts JSON array on a Lead and return the primary contact fields */
export function getPrimaryContact(lead) {
  try {
    const contacts = JSON.parse(lead.contacts || '[]');
    const primary = contacts.find(c => c.primary) || contacts[0];
    if (primary) {
      return {
        name: [primary.firstName, primary.lastName].filter(Boolean).join(' ') || lead.contactName || '',
        email: primary.email || lead.email || '',
        phone: primary.phone || lead.phone || '',
        jobTitle: primary.jobTitle || lead.jobTitle || '',
      };
    }
  } catch {}
  return {
    name: lead.contactName || '',
    email: lead.email || '',
    phone: lead.phone || '',
    jobTitle: lead.jobTitle || '',
  };
}