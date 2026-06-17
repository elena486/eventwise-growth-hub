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
  const isAdmin = user?.email?.toLowerCase?.()?.includes?.('elena') || user?.email?.toLowerCase?.()?.includes?.('chris');

  const active = subTab || 'log';

  // Redirect non-admins away from overview
  useEffect(() => {
    if (!isAdmin && active === 'overview') {
      onSubTabChange?.('log');
    }
  }, [isAdmin, active, onSubTabChange]);

  return (
    <div className="flex-1 bg-[#F6F6FB] overflow-y-auto px-8 pb-8 font-dm pt-4">
      {active === 'log' && <LogTime onLogged={() => setRefreshKey(k => k + 1)} />}
      {active === 'timesheet' && <MyTimesheet refresh={refreshKey} />}
      {active === 'overview' && isAdmin && <TeamOverview refresh={refreshKey} />}
    </div>
  );
}