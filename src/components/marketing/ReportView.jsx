import React, { useState } from 'react';
import { ArrowLeft, Pencil, Send } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function ReportView({ report, onBack, onEdit, onSent }) {
  const [sending, setSending] = useState(false);

  const parse = (key) => { try { return JSON.parse(report?.[key] || '{}'); } catch { return {}; } };
  const w = parse('websiteData');
  const li = parse('chrisLinkedInData');
  const cp = parse('companyPageData');
  const nl = parse('newsletterData');

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