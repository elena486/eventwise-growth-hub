import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { FileText } from 'lucide-react';
import DashboardTab from '@/components/outreach/DashboardTab';
import CampaignsTab from '@/components/outreach/CampaignsTab';
import HistoryTab from '@/components/outreach/HistoryTab';
import WeeklyReportModal from '@/components/outreach/WeeklyReportModal';
import OutreachEmptyState from '@/components/outreach/OutreachEmptyState';

export default function OutreachAnalytics() {
  const { user } = useAuth();
  const [snapshots, setSnapshots] = useState([]);
  const [subjectLines, setSubjectLines] = useState([]);
  const [uploads, setUploads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showReport, setShowReport] = useState(false);

  const load = async () => {
    const [snaps, sls, ups] = await Promise.all([
      base44.entities.OutreachWeeklySnapshot.list('-weekCommencing', 500),
      base44.entities.OutreachSubjectLine.list('-weekCommencing', 500),
      base44.entities.ApolloWeeklyUpload.list('-uploadedAt', 500),
    ]);
    setSnapshots(snaps);
    setSubjectLines(sls);
    setUploads(ups);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const canGenerate = () => {
    if (user?.role === 'admin') return true;
    const name = (user?.full_name || '').toLowerCase();
    return ['george', 'elena', 'chris'].some(n => name.includes(n));
  };

  const hasData = snapshots.length > 0;

  return (
    <div className="flex-1 bg-[#F6F6FB] overflow-y-auto font-dm">
      {/* Sub-header */}
      <div className="bg-white border-b border-ew-border px-8 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-navy">Outreach Analytics</h1>
          <p className="text-xs text-ew-muted mt-0.5">Apollo campaign performance — weekly snapshots, trends and reports</p>
        </div>
        {canGenerate() && (
          <button
            onClick={() => setShowReport(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-[#1D9E75] text-white rounded-lg hover:bg-[#17a35f] transition-colors"
          >
            <FileText className="w-3.5 h-3.5" /> Generate Weekly Report
          </button>
        )}
      </div>

      <div className="p-8">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-6 h-6 border-2 border-[#8403C5]/20 border-t-[#8403C5] rounded-full animate-spin" />
          </div>
        ) : !hasData ? (
          <OutreachEmptyState onGenerate={() => setShowReport(true)} canGenerate={canGenerate()} />
        ) : (
          <>
            {/* Tab switcher */}
            <div className="flex items-center gap-1 mb-6">
              {[
                { key: 'dashboard', label: 'Dashboard' },
                { key: 'campaigns', label: 'Campaigns' },
                { key: 'history', label: 'History' },
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${activeTab === tab.key ? 'bg-[#8403C5] text-white' : 'text-ew-body hover:text-navy bg-white border border-ew-border'}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {activeTab === 'dashboard' && <DashboardTab snapshots={snapshots} subjectLines={subjectLines} uploads={uploads} onRefresh={load} />}
            {activeTab === 'campaigns' && <CampaignsTab snapshots={snapshots} />}
            {activeTab === 'history' && <HistoryTab uploads={uploads} snapshots={snapshots} subjectLines={subjectLines} />}
          </>
        )}
      </div>

      {showReport && (
        <WeeklyReportModal
          onClose={() => setShowReport(false)}
          onSaved={() => { setShowReport(false); load(); }}
        />
      )}
    </div>
  );
}