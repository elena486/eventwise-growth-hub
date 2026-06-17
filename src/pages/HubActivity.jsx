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

    // Real-time subscription
    const unsub = base44.entities.ActivityLog.subscribe((event) => {
      if (event.type === 'create') {
        setActivities(prev => [event.data, ...prev]);
      }
    });
    return unsub;
  }, [isAdmin]);

  if (!isAdmin) {
    return (
      <div className="px-8 py-16 flex items-center justify-center">
        <p className="text-sm text-[#5777AB]">You don't have access to this section.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="px-8 py-16 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#8403C5]/20 border-t-[#8403C5] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="px-8 py-8 space-y-8 max-w-[1400px] mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#242450]">Hub Activity</h1>
        <p className="text-[13px] text-[#5777AB] mt-1">Team engagement and usage analytics across the hub</p>
      </div>

      {/* Sub-nav tabs */}
      <div className="flex items-center gap-1">
        {[
          { id: 'cards', label: 'Team Cards' },
          { id: 'feed', label: 'Activity Feed' },
          { id: 'analytics', label: 'Analytics' },
        ].map(t => (
          <button key={t.id} onClick={() => setSubTab(t.id)}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${subTab === t.id ? 'bg-[#242450] text-white' : 'text-[#5777AB] hover:bg-[#F6F6FB]'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Sub-sections */}
      {subTab === 'cards' && (
        <div>
          <h3 className="text-[13px] font-semibold text-[#242450] uppercase tracking-[0.06em] mb-4">Team Overview</h3>
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
          <h3 className="text-[13px] font-semibold text-[#242450] uppercase tracking-[0.06em] mb-4">Activity Feed</h3>
          <ActivityFeed activities={activities} />
        </div>
      )}

      {subTab === 'analytics' && (
        <UsageAnalytics activities={activities} />
      )}
    </div>
  );
}