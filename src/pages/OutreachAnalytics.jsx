import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import InputView from '@/components/outreach/InputView';
import AnalyticsView from '@/components/outreach/AnalyticsView';
import CampaignView from '@/components/outreach/CampaignView';
import WeeklyReportModal from '@/components/outreach/WeeklyReportModal';
import { FileText } from 'lucide-react';

export default function OutreachAnalytics() {
  const [campaigns, setCampaigns] = useState([]);
  const [salesAssets, setSalesAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('input'); // 'input' | 'analytics' | 'campaign'
  const [showReport, setShowReport] = useState(false);

  const load = async () => {
    const [data, assets] = await Promise.all([
      base44.entities.ApolloOutreachCampaign.list('-launchDate', 500),
      base44.entities.SalesAsset.list(),
    ]);
    setCampaigns(data);
    setSalesAssets(assets);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // Keyboard shortcut: Cmd+N to open input view (new campaign form)
  useEffect(() => {
    const onNew = () => setView('input');
    window.addEventListener('ew-new-entry', onNew);
    return () => window.removeEventListener('ew-new-entry', onNew);
  }, []);

  return (
    <div className="flex-1 bg-[#F7F7F8] overflow-y-auto font-dm">
      {/* Sub-header */}
      <div className="bg-white border-b border-ew-border px-8 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-navy">Outreach Analytics</h1>
          <p className="text-xs text-ew-muted mt-0.5">Apollo campaign performance — subject lines, assets, trends</p>
        </div>
        <div className="flex items-center gap-3">
          {(view === 'input' || view === 'campaign') && (
            <button
              onClick={() => setShowReport(true)}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-[#1D9E75] text-white rounded-lg hover:bg-[#17a35f] transition-colors"
            >
              <FileText className="w-3.5 h-3.5" /> Generate Weekly Report
            </button>
          )}
          {/* Toggle */}
          <div className="flex items-center gap-1 bg-[#F7F7F8] border border-ew-border rounded-xl p-1">
            <button
              onClick={() => setView('input')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${view === 'input' ? 'bg-navy text-white shadow-sm' : 'text-ew-body hover:text-navy'}`}
          >
            ✏️ Input View
          </button>
          <button
            onClick={() => setView('analytics')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${view === 'analytics' ? 'bg-[#8403C5] text-white shadow-sm' : 'text-ew-body hover:text-navy'}`}
          >
            📊 Analytics View
          </button>
          <button
            onClick={() => setView('campaign')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${view === 'campaign' ? 'bg-[#1D9E75] text-white shadow-sm' : 'text-ew-body hover:text-navy'}`}
          >
            🎯 Campaign View
          </button>
          </div>
        </div>
      </div>

      <div className="p-8">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-6 h-6 border-2 border-[#8403C5]/20 border-t-[#8403C5] rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {view === 'input' && <InputView campaigns={campaigns} onRefresh={load} />}
            {view === 'analytics' && <AnalyticsView campaigns={campaigns} salesAssets={salesAssets} />}
            {view === 'campaign' && <CampaignView campaigns={campaigns} />}
          </>
        )}
      </div>

      {showReport && (
        <WeeklyReportModal campaigns={campaigns} onClose={() => setShowReport(false)} />
      )}
    </div>
  );
}