import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import LogTime from '@/components/time/LogTime';
import MyTimesheet from '@/components/time/MyTimesheet';
import TeamOverview from '@/components/time/TeamOverview';

const SUB_TABS = [
  { id: 'log', label: 'Log Time' },
  { id: 'timesheet', label: 'My Timesheet' },
  { id: 'overview', label: 'Team Overview' },
];

export default function TimeCapacity({ subTab, onSubTabChange }) {
  const { user } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);
  const isAdmin = user?.email?.toLowerCase?.()?.includes('elena') || user?.email?.toLowerCase?.()?.includes('chris');

  // Filter tabs for non-admins
  const visibleTabs = isAdmin ? SUB_TABS : SUB_TABS.filter(t => t.id !== 'overview');

  const active = subTab || 'log';

  useEffect(() => {
    if (!isAdmin && active === 'overview' && visibleTabs.length > 0) {
      onSubTabChange?.(visibleTabs[0].id);
    }
  }, [isAdmin]);

  return (
    <div className="flex-1 bg-[#F6F6FB] overflow-y-auto px-8 pb-8 font-dm">
      {/* Sub-nav */}
      <div className="border-b border-[#EBEBF5] mb-6 flex items-center gap-1 pt-4">
        {visibleTabs.map(t => (
          <button
            key={t.id}
            onClick={() => onSubTabChange?.(t.id)}
            className={`px-4 h-9 text-[13px] font-medium transition-all duration-150 shrink-0 relative ${
              active === t.id ? 'text-[#242450]' : 'text-[#9CA3AF] hover:text-[#5777AB]'
            }`}
          >
            {t.label}
            {active === t.id && <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#8403C5] rounded-t-full" />}
          </button>
        ))}
      </div>

      {active === 'log' && <LogTime onLogged={() => setRefreshKey(k => k + 1)} />}
      {active === 'timesheet' && <MyTimesheet refresh={refreshKey} />}
      {active === 'overview' && isAdmin && <TeamOverview refresh={refreshKey} />}
    </div>
  );
}