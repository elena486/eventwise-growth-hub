import React, { useState } from 'react';
import { ArrowLeft, Pencil, Send, Download } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { LOGO_BLACK } from '@/lib/proposalData';

export default function ReportView({ report, onBack, onEdit, onSent }) {
  const [sending, setSending] = useState(false);

  const parse = (key) => { try { return JSON.parse(report?.[key] || '{}'); } catch { return {}; } };
  const w = parse('websiteData');
  const li = parse('chrisLinkedInData');
  const cp = parse('companyPageData');
  const nl = parse('newsletterData');

  const handleDownloadPDF = () => {
    const monthYear = `${report.month} ${report.year}`;
    const rows = (label, val) => val ? `<tr><td style="padding:4px 12px 4px 0;color:#6B7280;font-size:13px;width:200px">${label}</td><td style="padding:4px 0;font-size:13px;font-weight:600;color:#111827">${val}</td></tr>` : '';
    const section = (title, rows) => `<div style="margin-bottom:24px;background:#fff;border-radius:12px;border:1px solid #E5E7EB;padding:20px"><h3 style="font-size:15px;font-weight:700;color:#111827;margin:0 0 12px">${title}</h3><table>${rows}</table></div>`;
    const html = `<!DOCTYPE html><html><head><style>body{font-family:'DM Sans',Arial,sans-serif;background:#F7F7F8;margin:0;padding:0}</style></head><body>
      <div style="background:#242450;padding:20px 32px;display:flex;align-items:center;gap:16px">
        <div style="color:#fff;font-size:20px;font-weight:800;letter-spacing:-0.5px">eventwise</div>
        <div style="color:rgba(255,255,255,0.5);font-size:13px">Monthly Marketing Report</div>
      </div>
      <div style="padding:32px">
        <h1 style="font-size:26px;font-weight:800;color:#242450;margin:0 0 6px">${monthYear} Report</h1>
        <p style="color:#6B7280;font-size:13px;margin:0 0 24px">Status: ${report.status}</p>
        ${section('🌐 Website', [
          rows('Active Users', w.activeUsers), rows('Sessions', w.sessions), rows('New Users', w.newUsers),
          rows('Engaged Sessions (%)', w.engagedSessions), rows('Top Traffic Source', w.topTrafficSource),
          rows('GSC Impressions', w.gscImpressions), rows('GSC Clicks', w.gscClicks), rows('GSC Avg Position', w.gscAvgPosition),
        ].join('') + (w.notes ? `<p style="font-size:13px;color:#374151;border-top:1px solid #F3F4F6;margin-top:12px;padding-top:12px;font-style:italic">${w.notes}</p>` : ''))}
        ${section('👤 Chris LinkedIn', [
          rows('Total Impressions', li.totalImpressions), rows('Unique Members Reached', li.uniqueMembersReached),
          rows('New Followers', li.newFollowers), rows('Engagement', li.engagement), rows('Top Post', li.topPostTitle),
        ].join('') + (li.notes ? `<p style="font-size:13px;color:#374151;border-top:1px solid #F3F4F6;margin-top:12px;padding-top:12px;font-style:italic">${li.notes}</p>` : ''))}
        ${section('🏢 Company Page', [
          rows('Total Impressions', cp.totalImpressions), rows('Unique Visitors', cp.uniqueVisitors),
          rows('New Followers', cp.newFollowers), rows('Posts Published', cp.postsPublished), rows('Engagement', cp.engagement),
        ].join('') + (cp.notes ? `<p style="font-size:13px;color:#374151;border-top:1px solid #F3F4F6;margin-top:12px;padding-top:12px;font-style:italic">${cp.notes}</p>` : ''))}
        ${section('📧 Newsletter', [
          rows('Subject', nl.subjectLine), rows('Send Date', nl.sendDate), rows('List Size', nl.listSize),
          rows('Open Rate', nl.openRate ? nl.openRate + '%' : null), rows('Click Rate', nl.clickRate ? nl.clickRate + '%' : null), rows('Unsubscribes', nl.unsubscribes),
        ].join('') + (nl.notes ? `<p style="font-size:13px;color:#374151;border-top:1px solid #F3F4F6;margin-top:12px;padding-top:12px;font-style:italic">${nl.notes}</p>` : ''))}
        <p style="text-align:center;color:#9CA3AF;font-size:12px;margin-top:32px;border-top:1px solid #E5E7EB;padding-top:16px">Eventwise Monthly Marketing Report — ${monthYear} — Confidential</p>
      </div></body></html>`;
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `Eventwise-Marketing-Report-${monthYear.replace(' ', '-')}.html`;
    a.click(); URL.revokeObjectURL(url);
  };

  const handleSend = async () => {
    setSending(true);
    await base44.integrations.Core.SendEmail({
      to: 'chris@eventwise.com',
      subject: `Marketing Report — ${report.month} ${report.year}`,
      body: `Hi Chris,\n\nThe ${report.month} ${report.year} marketing report is ready for your review.\n\nKey metrics:\n- Website Sessions: ${w.sessions || '—'}\n- Chris LI Impressions: ${li.totalImpressions || '—'}\n- Company Impressions: ${cp.totalImpressions || '—'}\n- Newsletter Open Rate: ${nl.openRate ? nl.openRate + '%' : '—'}\n\nBest,\nElena`,
    });
    await base44.entities.MarketingReport.update(report.id, { status: 'Sent', sentAt: new Date().toISOString() });
    setSending(false);
    onSent();
    onBack();
  };

  const Row = ({ label, value }) => value ? (
    <tr className="border-b border-gray-50 last:border-0">
      <td className="py-2 pr-4 text-xs text-gray-500 w-48">{label}</td>
      <td className="py-2 text-sm text-gray-900 font-medium">{value}</td>
    </tr>
  ) : null;

  return (
    <div className="flex-1 overflow-y-auto bg-[#f5f6fa] p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800"><ArrowLeft className="w-4 h-4" /> Back</button>
          <h2 className="text-xl font-bold text-gray-900">{report.month} {report.year} Report</h2>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${report.status === 'Sent' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>{report.status}</span>
        </div>
        <div className="flex gap-2">
          <button onClick={handleDownloadPDF} className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 bg-white"><Download className="w-4 h-4" /> Download</button>
          <button onClick={onEdit} className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 bg-white"><Pencil className="w-4 h-4" /> Edit</button>
          {report.status === 'Ready' && (
            <button onClick={handleSend} disabled={sending}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#8403C5] text-white rounded-lg text-sm font-semibold hover:bg-[#6d02a3] transition-colors">
              <Send className="w-4 h-4" /> {sending ? 'Sending…' : 'Send to Chris'}
            </button>
          )}
        </div>
      </div>

      <div className="space-y-4 max-w-3xl">
        {/* Website */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-3">Website</h3>
          <table className="w-full"><tbody>
            <Row label="Active Users" value={w.activeUsers} />
            <Row label="Sessions" value={w.sessions} />
            <Row label="New Users" value={w.newUsers} />
            <Row label="Engaged Sessions (%)" value={w.engagedSessions} />
            <Row label="Top Traffic Source" value={w.topTrafficSource} />
            <Row label="GSC Impressions" value={w.gscImpressions} />
            <Row label="GSC Clicks" value={w.gscClicks} />
            <Row label="GSC Avg Position" value={w.gscAvgPosition} />
          </tbody></table>
          {w.notes && <p className="text-sm text-gray-600 mt-3 pt-3 border-t border-gray-100 italic">{w.notes}</p>}
        </div>

        {/* Chris LinkedIn */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-3">Chris LinkedIn</h3>
          <table className="w-full"><tbody>
            <Row label="Total Impressions" value={li.totalImpressions} />
            <Row label="Unique Members Reached" value={li.uniqueMembersReached} />
            <Row label="New Followers" value={li.newFollowers} />
            <Row label="Engagement" value={li.engagement} />
            <Row label="Top Post" value={li.topPostTitle} />
          </tbody></table>
          {li.notes && <p className="text-sm text-gray-600 mt-3 pt-3 border-t border-gray-100 italic">{li.notes}</p>}
        </div>

        {/* Company Page */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-3">Company Page</h3>
          <table className="w-full"><tbody>
            <Row label="Total Impressions" value={cp.totalImpressions} />
            <Row label="Unique Visitors" value={cp.uniqueVisitors} />
            <Row label="New Followers" value={cp.newFollowers} />
            <Row label="Posts Published" value={cp.postsPublished} />
            <Row label="Engagement" value={cp.engagement} />
          </tbody></table>
          {cp.notes && <p className="text-sm text-gray-600 mt-3 pt-3 border-t border-gray-100 italic">{cp.notes}</p>}
        </div>

        {/* Newsletter */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-3">Newsletter</h3>
          <table className="w-full"><tbody>
            <Row label="Subject" value={nl.subjectLine} />
            <Row label="Send Date" value={nl.sendDate} />
            <Row label="List Size" value={nl.listSize} />
            <Row label="Open Rate" value={nl.openRate ? nl.openRate + '%' : null} />
            <Row label="Click Rate" value={nl.clickRate ? nl.clickRate + '%' : null} />
            <Row label="Unsubscribes" value={nl.unsubscribes} />
          </tbody></table>
          {nl.notes && <p className="text-sm text-gray-600 mt-3 pt-3 border-t border-gray-100 italic">{nl.notes}</p>}
        </div>
      </div>
    </div>
  );
}