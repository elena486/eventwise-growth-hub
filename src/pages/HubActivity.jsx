import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import TeamOverviewCards from '@/components/activity/TeamOverviewCards';
import ActivityFeed from '@/components/activity/ActivityFeed';
import UsageAnalytics from '@/components/activity/UsageAnalytics';

export default function HubActivity() {
  const { user } = useAuth();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subTab, setSubTab] = useState('cards');

  // Admin check
  const isAdmin = user?.email?.toLowerCase().includes('elena') ||
                  user?.email?.toLowerCase().includes('chris') ||
                  user?.full_name?.toLowerCase().includes('elena') ||
                  user?.full_name?.toLowerCase().includes('chris');

  useEffect(() => {
    if (!isAdmin) return;
    const load = async () => {
      setLoading(true);
      try {
        const data = await base44.entities.ActivityLog.list('-created_date', 2000);
        setActivities(data);
      } catch {}
      setLoading(false);
    };
    load();
  }, [isAdmin]);

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-sm text-[#5777AB]">You don't have access to this section.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="w-6 h-6 border-2 border-[#8403C5]/20 border-t-[#8403C5] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="pt-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="page-title">Hub Activity</h2>
          <p className="page-subtitle">Team engagement and usage analytics across the hub</p>
        </div>
        <div className="flex items-center border border-[#EBEBF5] rounded-lg overflow-hidden bg-white">
          {[
            { id: 'cards', label: 'Team Cards' },
            { id: 'feed', label: 'Activity Feed' },
            { id: 'analytics', label: 'Analytics' },
          ].map(t => (
            <button key={t.id} onClick={() => setSubTab(t.id)}
              className={`px-4 py-2 text-sm font-semibold transition-colors ${subTab === t.id ? 'bg-[#242450] text-white' : 'text-[#5777AB] hover:bg-[#F6F6FB]'}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Sub-sections */}
      {subTab === 'cards' && (
        <div>
          <h3 className="section-heading mb-3">Team Overview</h3>
          {activities.length === 0 ? (
            <div className="bg-white border border-[#EBEBF5] rounded-xl px-6 py-16 text-center">
              <p className="text-sm text-[#5777AB]">No activity recorded yet — activity will appear here as the team uses the hub</p>
            </div>
          ) : (
            <TeamOverviewCards activities={activities} />
          )}
        </div>
      )}

      {subTab === 'feed' && (
        <div>
          <h3 className="section-heading mb-3">Activity Feed</h3>
          <ActivityFeed activities={activities} />
        </div>
      )}

      {subTab === 'analytics' && (
        <UsageAnalytics activities={activities} />
      )}
    </div>
  );
}