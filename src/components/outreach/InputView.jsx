import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, Trash2, Check, X, Copy, Download } from 'lucide-react';
import { calcPerformanceScore, calcPositiveReplyRate, calcMeetingConversionRate, fmtPct, exportCSV } from './OutreachHelpers';
import CampaignForm from './CampaignForm';
import { format } from 'date-fns';

const STATUS_STYLES = {
  Active: 'bg-green-100 text-green-700',
  Paused: 'bg-amber-100 text-amber-700',
  Completed: 'bg-gray-100 text-gray-500',
  Killed: 'bg-red-100 text-red-600',
};

function fmtDate(d) {
  if (!d) return '—';
  try { return format(new Date(d), 'd MMM yyyy'); } catch { return d; }
}

function Th({ children, onClick, sorted }) {
  return (
    <th
      className={`px-3 py-3 text-left text-[11px] font-semibold text-ew-muted uppercase tracking-[0.1em] whitespace-nowrap select-none ${onClick ? 'cursor-pointer hover:text-navy' : ''}`}
      onClick={onClick}
    >
      {children}{sorted ? ' ↓' : ''}
    </th>
  );
}

export default function InputView({ campaigns, onRefresh }) {
  const [showForm, setShowForm] = useState(false);
  const [editCampaign, setEditCampaign] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [filterAudience, setFilterAudience] = useState('All');
  const [filterTP, setFilterTP] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [sortCol, setSortCol] = useState('launchDate');
  const [sortDir, setSortDir] = useState(-1);

  const handleDelete = async (id) => {
    await base44.entities.ApolloOutreachCampaign.delete(id);
    setDeleteId(null);
    onRefresh();
  };

  const handleDuplicate = async (c) => {
    const { id, created_date, updated_date, ...rest } = c;
    await base44.entities.ApolloOutreachCampaign.create({ ...rest, campaignName: rest.campaignName + ' (copy)', variant: 'B' });
    onRefresh();
  };

  const sort = (col) => {
    if (sortCol === col) setSortDir(d => d * -1);
    else { setSortCol(col); setSortDir(-1); }
  };

  let rows = campaigns
    .filter(c => filterAudience === 'All' || c.audienceSegment === filterAudience)
    .filter(c => filterTP === 'All' || c.touchPoint === filterTP)
    .filter(c => filterStatus === 'All' || c.status === filterStatus);

  rows = [...rows].sort((a, b) => {
    const av = a[sortCol] ?? '';
    const bv = b[sortCol] ?? '';
    return sortDir * (av < bv ? -1 : av > bv ? 1 : 0);
  });

  const csvCols = [
    { label: 'Campaign', key: 'campaignName' },
    { label: 'Audience', key: 'audienceSegment' },
    { label: 'TP', key: 'touchPoint' },
    { label: 'Variant', key: 'variant' },
    { label: 'Status', key: 'status' },
    { label: 'Subject Line', key: 'subjectLine' },
    { label: 'Emails Sent', key: 'emailsSent' },
    { label: 'Open Rate %', key: 'openRate' },
    { label: 'Click Rate %', key: 'clickRate' },
    { label: 'Positive Replies', key: 'positiveReplies' },
    { label: 'Meetings Booked', key: 'meetingsBooked' },
  ];

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          {['All','Events','Agencies','Suppliers','Mixed'].map(a => (
            <button key={a} onClick={() => setFilterAudience(a)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors border ${filterAudience === a ? 'bg-navy text-white border-navy' : 'bg-white border-ew-border text-ew-body hover:bg-ew-bg'}`}>
              {a}
            </button>
          ))}
          <span className="w-px h-5 bg-ew-border mx-1" />
          {['All','TP1','TP2','TP3','TP4','TP5','TP6'].map(t => (
            <button key={t} onClick={() => setFilterTP(t)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors border ${filterTP === t ? 'bg-[#8403C5] text-white border-[#8403C5]' : 'bg-white border-ew-border text-ew-body hover:bg-ew-bg'}`}>
              {t}
            </button>
          ))}
          <span className="w-px h-5 bg-ew-border mx-1" />
          {['All','Active','Paused','Completed','Killed'].map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors border ${filterStatus === s ? 'bg-navy text-white border-navy' : 'bg-white border-ew-border text-ew-body hover:bg-ew-bg'}`}>
              {s}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => exportCSV(rows, csvCols, 'outreach-campaigns.csv')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-ew-border bg-white text-ew-body hover:bg-ew-bg rounded-lg transition-colors">
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
          <button onClick={() => { setEditCampaign(null); setShowForm(true); }}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-[#8403C5] text-white rounded-lg hover:bg-[#7002A8] transition-colors">
            <Plus className="w-3.5 h-3.5" /> New Campaign
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-ew-border rounded-xl overflow-x-auto">
        <table className="w-full text-sm min-w-[1200px]">
          <thead className="bg-ew-footer border-b border-ew-border">
            <tr>
              <Th onClick={() => sort('campaignName')} sorted={sortCol === 'campaignName'}>Campaign</Th>
              <Th onClick={() => sort('audienceSegment')} sorted={sortCol === 'audienceSegment'}>Audience</Th>
              <Th>TP</Th>
              <Th>Variant</Th>
              <Th onClick={() => sort('status')} sorted={sortCol === 'status'}>Status</Th>
              <Th onClick={() => sort('launchDate')} sorted={sortCol === 'launchDate'}>Launch date</Th>
              <Th>Subject line</Th>
              <Th onClick={() => sort('emailsSent')} sorted={sortCol === 'emailsSent'}>Sent</Th>
              <Th onClick={() => sort('openRate')} sorted={sortCol === 'openRate'}>Open %</Th>
              <Th onClick={() => sort('clickRate')} sorted={sortCol === 'clickRate'}>Click %</Th>
              <Th>+Reply %</Th>
              <Th onClick={() => sort('meetingsBooked')} sorted={sortCol === 'meetingsBooked'}>Meetings</Th>
              <Th>Score</Th>
              <Th></Th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={14} className="px-4 py-16 text-center text-sm text-ew-muted italic">No campaigns yet. Click "+ New Campaign" to add one.</td></tr>
            )}
            {rows.map((c, i) => {
              const score = calcPerformanceScore(c);
              const prr = calcPositiveReplyRate(c);
              return (
                <tr key={c.id} className={`border-b border-ew-border hover:bg-navy/[0.02] cursor-pointer group ${i % 2 === 1 ? 'bg-[#FAFBFE]' : 'bg-white'}`}
                  onClick={() => { setEditCampaign(c); setShowForm(true); }}>
                  <td className="px-3 py-3 font-semibold text-navy max-w-[180px]">
                    <p className="truncate">{c.campaignName}</p>
                  </td>
                  <td className="px-3 py-3 text-xs text-ew-body whitespace-nowrap">{c.audienceSegment}</td>
                  <td className="px-3 py-3 text-xs font-semibold text-navy">{c.touchPoint}</td>
                  <td className="px-3 py-3">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#F3E8FF] text-[#7E22CE]">{c.variant}</span>
                  </td>
                  <td className="px-3 py-3">
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLES[c.status] || 'bg-gray-100 text-gray-500'}`}>{c.status}</span>
                  </td>
                  <td className="px-3 py-3 text-xs text-ew-muted whitespace-nowrap">{fmtDate(c.launchDate)}</td>
                  <td className="px-3 py-3 max-w-[200px]">
                    <p className="text-xs text-ew-body truncate" title={c.subjectLine}>{c.subjectLine || '—'}</p>
                  </td>
                  <td className="px-3 py-3 text-xs font-medium text-navy">{c.emailsSent ?? '—'}</td>
                  <td className="px-3 py-3 text-xs font-medium text-navy">{c.openRate != null ? c.openRate + '%' : '—'}</td>
                  <td className="px-3 py-3 text-xs font-medium text-navy">{c.clickRate != null ? c.clickRate + '%' : '—'}</td>
                  <td className="px-3 py-3 text-xs font-medium text-navy">{fmtPct(prr)}</td>
                  <td className="px-3 py-3 text-xs font-medium text-navy">{c.meetingsBooked ?? '—'}</td>
                  <td className="px-3 py-3">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${score >= 6 ? 'bg-green-100 text-green-700' : score >= 4 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-600'}`}>
                      {score.toFixed(1)}
                    </span>
                  </td>
                  <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleDuplicate(c)} title="Duplicate" className="p-1.5 rounded text-ew-muted hover:text-navy hover:bg-ew-bg">
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      {deleteId === c.id ? (
                        <>
                          <button onClick={() => handleDelete(c.id)} className="p-1.5 text-white bg-red-500 rounded"><Check className="w-3 h-3" /></button>
                          <button onClick={() => setDeleteId(null)} className="p-1.5 text-ew-muted rounded"><X className="w-3 h-3" /></button>
                        </>
                      ) : (
                        <button onClick={() => setDeleteId(c.id)} className="p-1.5 rounded text-ew-muted hover:text-red-500 hover:bg-red-50">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showForm && (
        <CampaignForm
          campaign={editCampaign}
          onClose={() => { setShowForm(false); setEditCampaign(null); }}
          onSaved={() => { setShowForm(false); setEditCampaign(null); onRefresh(); }}
        />
      )}
    </div>
  );
}