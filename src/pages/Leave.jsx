import React, { useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { Plus } from 'lucide-react';
import LeaveLogForm from '@/components/leave/LeaveLogForm';
import ApprovalQueue from '@/components/leave/ApprovalQueue';
import WhosOutView from '@/components/leave/WhosOutView';
import MyAvailability from '@/components/leave/MyAvailability';
import LeaveSummary from '@/components/leave/LeaveSummary';

// Elena and Chris can see the Requests (approval) tab
const CAN_APPROVE = ['Elena', 'Chris'];

export default function Leave() {
  const { user } = useAuth();
  const [refresh, setRefresh] = useState(0);
  const [activeTab, setActiveTab] = useState('team-availability');
  const [showForm, setShowForm] = useState(false);

  const firstName = user?.full_name?.split(' ')[0] || '';
  const canApprove = CAN_APPROVE.includes(firstName);

  const handleSaved = () => {
    setRefresh(n => n + 1);
    setShowForm(false);
  };

  const tabs = [
    { id: 'team-availability', label: 'Team Availability' },
    { id: 'my-availability', label: 'My Availability' },
    { id: 'log-time-off', label: 'Log Time Off' },
    ...(canApprove ? [{ id: 'requests', label: 'Approval Requests' }] : []),
    ...(canApprove ? [{ id: 'leave-summary', label: 'Leave Summary' }] : []),
  ];

  return (
    <div className="bg-[#F6F6FB] p-8 font-dm min-h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#242450]">Time Off & Availability</h1>
          <p className="text-sm text-[#5777AB] mt-0.5">Team leave and working availability</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#8403C5] text-white text-sm font-semibold rounded-lg hover:bg-[#6B02A0] transition-colors"
          >
            <Plus className="w-4 h-4" /> Log Time Off
          </button>
          <button
            onClick={() => setActiveTab('my-availability')}
            className="flex items-center gap-1.5 px-4 py-2 bg-white text-[#8403C5] text-sm font-semibold rounded-lg border border-[#8403C5]/30 hover:bg-[#F3E8FF] transition-colors"
          >
            <Plus className="w-4 h-4" /> Log Availability
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-[#EBEBF5]">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2 text-sm font-medium transition-colors relative ${activeTab === t.id ? 'text-[#8403C5] font-semibold' : 'text-[#5777AB] hover:text-[#242450]'}`}>
            {t.label}
            {activeTab === t.id && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#8403C5] rounded-t-full" />}
          </button>
        ))}
      </div>

      {activeTab === 'team-availability' && <WhosOutView refresh={refresh} />}
      {activeTab === 'my-availability' && <MyAvailability />}
      {activeTab === 'log-time-off' && (
        <LeaveLogForm currentUserName={firstName} inline onSaved={handleSaved} onClose={() => setActiveTab('team-availability')} />
      )}
      {activeTab === 'leave-summary' && canApprove && (
        <LeaveSummary currentUserName={firstName} />
      )}
      {activeTab === 'requests' && canApprove && (
        <ApprovalQueue currentUserName={firstName} onApproved={() => setRefresh(n => n + 1)} />
      )}

      {showForm && (
        <LeaveLogForm
          currentUserName={firstName}
          onClose={() => setShowForm(false)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}