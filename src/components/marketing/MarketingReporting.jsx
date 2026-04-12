import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, Pencil, Eye, Trash2, Globe, BarChart2, Building2, Mail, TrendingUp } from 'lucide-react';
import ReportForm from './ReportForm';
import ReportView from './ReportView';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const STATUS_STYLES = {
  Draft: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  Ready: 'bg-blue-50 text-blue-700 border-blue-200',
  Sent: 'bg-green-50 text-green-700 border-green-200',
};

function fmtK(n) {
  if (n == null || n === '') return '—';
  const num = Number(n);
  if (isNaN(num)) return '—';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return String(num);
}

function MoMChip({ current, prev, suffix = '' }) {
  if (!prev || !current) return <span className="text-xs text-gray-400">— No prior data</span>;
  const diff = current - prev;
  const pct = prev !== 0 ? ((diff / prev) * 100).toFixed(1) : null;
  if (!pct) return null;
  const up = diff >= 0;
  return <span className={`text-xs font-semibold ${up ? 'text-green-600' : 'text-red-500'}`}>{up ? '↑' : '↓'} {Math.abs(pct)}% MoM</span>;
}

export default function MarketingReporting() {
  const [reports, setReports] = useState([]);
  const [view, setView] = useState('dashboard'); // dashboard | trends | form | view
  const [editReport, setEditReport] = useState(null);
  const [viewReport, setViewReport] = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  const [subTab, setSubTab] = useState('dashboard');

  const load = () => base44.entities.MarketingReport.list('-year,-month', 100).then(r => {
    // Sort by year desc, then month desc
    const sorted = r.sort((a, b) => {
      if (b.year !== a.year) return b.year - a.year;
      return MONTHS.indexOf(b.month) - MONTHS.indexOf(a.month);
    });
    setReports(sorted);
  });

  useEffect(() => { load(); }, []);

  const latest = reports[0];
  const prev = reports[1];

  const getWebsite = (r) => { try { return JSON.parse(r?.websiteData || '{}'); } catch { return {}; } };
  const getLinkedIn = (r) => { try { return JSON.parse(r?.chrisLinkedInData || '{}'); } catch { return {}; } };
  const getCompany = (r) => { try { return JSON.parse(r?.companyPageData || '{}'); } catch { return {}; } };
  const getNewsletter = (r) => { try { return JSON.parse(r?.newsletterData || '{}'); } catch { return {}; } };

  const handleDelete = async (id) => {
    await base44.entities.MarketingReport.delete(id);
    load();
  };

  if (view === 'form') return <ReportForm report={editReport} onBack={() => { setView('dashboard'); setEditReport(null); load(); }} />;
  if (view === 'view') return <ReportView report={viewReport} onBack={() => { setView('dashboard'); setViewReport(null); load(); }} onEdit={() => { setEditReport(viewReport); setView('form'); }} onSent={load} />;

  const statCards = latest ? [
    { icon: <Globe className="w-5 h-5" style={{ color: '#8403C5' }} />, label: 'Website Sessions', value: fmtK(getWebsite(latest).sessions), sub: 'GA4', prev: getWebsite(prev)?.sessions, curr: getWebsite(latest).sessions },
    { icon: <BarChart2 className="w-5 h-5" style={{ color: '#8403C5' }} />, label: 'Chris LI Impressions', value: fmtK(getLinkedIn(latest).totalImpressions), sub: 'Personal', prev: getLinkedIn(prev)?.totalImpressions, curr: getLinkedIn(latest).totalImpressions },
    { icon: <Building2 className="w-5 h-5" style={{ color: '#8403C5' }} />, label: 'Company Impressions', value: fmtK(getCompany(latest).totalImpressions), sub: 'Eventwise Page', prev: getCompany(prev)?.totalImpressions, curr: getCompany(latest).totalImpressions },
    { icon: <Mail className="w-5 h-5" style={{ color: '#8403C5' }} />, label: 'Newsletter Open Rate', value: getNewsletter(latest).openRate ? getNewsletter(latest).openRate + '%' : '—', sub: 'Beehiiv', prev: getNewsletter(prev)?.openRate, curr: getNewsletter(latest).openRate },
  ] : [];

  return (
    <div className="flex flex-col flex-1 overflow-hidden bg-[#f5f6fa]">
      {/* Sub nav */}
      <div className="bg-[#1a1f3c] px-6 flex items-center gap-4 shrink-0">
        {['dashboard', 'trends'].map(t => (
          <button key={t} onClick={() => setSubTab(t)}
            className={`flex items-center gap-1.5 px-3 py-3 text-xs font-semibold border-b-2 transition-colors capitalize ${subTab === t ? 'border-white text-white' : 'border-transparent text-gray-400 hover:text-white'}`}>
            {t === 'dashboard' ? <><Globe className="w-3.5 h-3.5" /> Dashboard</> : <><TrendingUp className="w-3.5 h-3.5" /> Trends</>}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {subTab === 'dashboard' && (
          <>
            <div className="flex items-start justify-between mb-5">
              <div>
                <h1 className="text-xl font-bold text-gray-900">Monthly Reports</h1>
                <p className="text-sm text-gray-500">Latest: {latest ? `${latest.month} ${latest.year}` : '—'}</p>
              </div>
              <button onClick={() => { setEditReport(null); setView('form'); }}
                className="flex items-center gap-2 px-4 py-2 bg-[#8403C5] text-white rounded-lg text-sm font-semibold hover:bg-[#6d02a3] transition-colors">
                <Plus className="w-4 h-4" /> New Report
              </button>
            </div>

            {/* Stat cards */}
            {latest && (
              <div className="grid grid-cols-4 gap-4 mb-6">
                {statCards.map((card, i) => (
                  <div key={i} className="bg-white rounded-xl p-5 border border-gray-200">
                    <div className="flex items-start justify-between mb-3">
                      <p className="text-sm text-gray-500">{card.label}</p>
                      <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center">{card.icon}</div>
                    </div>
                    <p className="text-3xl font-bold text-gray-900 mb-1">{card.value}</p>
                    <p className="text-xs text-gray-400 mb-1">{card.sub}</p>
                    {card.curr && card.prev ? <MoMChip current={card.curr} prev={card.prev} /> : <span className="text-xs text-gray-400">— No prior data</span>}
                  </div>
                ))}
              </div>
            )}

            {/* All reports table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-900">All Reports</h3>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left text-xs font-semibold text-gray-400 px-5 py-2.5">Report</th>
                    <th className="text-left text-xs font-semibold text-gray-400 px-5 py-2.5">Status</th>
                    <th className="text-right text-xs font-semibold text-gray-400 px-5 py-2.5">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map(r => (
                    <tr key={r.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                      <td className="px-5 py-3 font-semibold text-gray-900">{r.month} {r.year}</td>
                      <td className="px-5 py-3">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${STATUS_STYLES[r.status] || STATUS_STYLES.Draft}`}>{r.status || 'Draft'}</span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center gap-3 justify-end">
                          <button onClick={() => { setEditReport(r); setView('form'); }} className="text-gray-400 hover:text-gray-700"><Pencil className="w-4 h-4" /></button>
                          <button onClick={() => { setViewReport(r); setView('view'); }} className="text-gray-400 hover:text-gray-700"><Eye className="w-4 h-4" /></button>
                          <button onClick={() => setConfirmId(r.id)} className="text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4 text-red-400" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {reports.length === 0 && (
                    <tr><td colSpan={3} className="px-5 py-8 text-center text-sm text-gray-400 italic">No reports yet. Create your first report.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {subTab === 'trends' && (
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-5">Metric Trends</h2>
            {reports.length < 2 ? (
              <p className="text-sm text-gray-400 italic">Need at least 2 reports to show trends.</p>
            ) : (
              <div className="space-y-5">
                {[
                  { title: 'Website Sessions', data: reports.slice().reverse().map(r => ({ month: `${r.month?.slice(0,3)} ${r.year}`, value: getWebsite(r).sessions })) },
                  { title: 'Chris LI Impressions', data: reports.slice().reverse().map(r => ({ month: `${r.month?.slice(0,3)} ${r.year}`, value: getLinkedIn(r).totalImpressions })) },
                  { title: 'Newsletter Open Rate (%)', data: reports.slice().reverse().map(r => ({ month: `${r.month?.slice(0,3)} ${r.year}`, value: getNewsletter(r).openRate })) },
                ].map(chart => (
                  <div key={chart.title} className="bg-white rounded-xl p-5 border border-gray-200">
                    <p className="text-sm font-semibold text-gray-700 mb-4">{chart.title}</p>
                    <ResponsiveContainer width="100%" height={180}>
                      <LineChart data={chart.data}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Line type="monotone" dataKey="value" stroke="#8403C5" strokeWidth={2} dot={{ r: 3 }} connectNulls />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {confirmId && <ConfirmDialog onConfirm={() => { handleDelete(confirmId); setConfirmId(null); }} onCancel={() => setConfirmId(null)} />}
    </div>
  );
}