import React, { useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import LogTime from '@/components/time/LogTime';
import MyTimesheet from '@/components/time/MyTimesheet';
import TeamOverview from '@/components/time/TeamOverview';
import TaskTemplateManager from '@/components/time/TaskTemplateManager';
import TaskTemplateGate from '@/components/time/TaskTemplateGate';

export default function TimeCapacity({ subTab, onSubTabChange }) {
  const { user } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);
  const isAdmin = user?.email?.toLowerCase?.()?.includes?.('elena') || user?.email?.toLowerCase?.()?.includes?.('chris');

  const active = subTab || 'log';

  return (
    <div className="flex-1 bg-[#F5F6FA] overflow-y-auto px-8 pb-8 font-dm pt-4">
      {active === 'log' && <LogTime onLogged={() => setRefreshKey(k => k + 1)} />}
      {active === 'timesheet' && <MyTimesheet refresh={refreshKey} />}
      {active === 'overview' && isAdmin && <TeamOverview refresh={refreshKey} />}
      {active === 'templates' && isAdmin && <TaskTemplateGate><TaskTemplateManager /></TaskTemplateGate>}
    </div>
  );
}