import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { format, isToday, isPast, differenceInDays, addDays, startOfWeek, parseISO } from 'date-fns';
import { RefreshCw, UserPlus, Plus, FileText, ClipboardList, ArrowRight, Clock, AlertTriangle } from 'lucide-react';
import { PRIORITY_STYLES } from '@/components/requests/requestStyles';
import { MEMBERS, currentWeekStart } from '@/lib/sprintConfig';

// ── Helpers ────────────────────────────────────────────

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function daysUntil(dateStr) {
  if (!dateStr) return null;
  return differenceInDays(new Date(dateStr), new Date());
}

const CHANGELOG_TYPE_STYLES = {
  'New Feature': 'bg-[#DCFCE7] text-[#15803D]',
  'Improvement': 'bg-[#DBEAFE] text-[#1D4ED8]',
  'Bug Fix': 'bg-[#FEF9C3] text-[#A16207]',
  'Coming Soon': 'bg-[#F3E8FF] text-[#7E22CE]',
};

const AVATAR_COLORS = [
  'bg-[#8403C5]', 'bg-[#1D4ED8]', 'bg-[#15803D]', 'bg-[#A16207]',
  'bg-[#B91C1C]', 'bg-[#7E22CE]', 'bg-[#0284C7]',
];

function getAvatarColor(name) {
  let hash = 0;
  for (let i = 0; i < (name || '').length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(name) {
  return (name || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

// ── Component ──────────────────────────────────────────

export default function HQDashboard({ user, onNavigate, onRefresh }) {
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [overdueLeads, setOverdueLeads] = useState([]);
  const [renewals, setRenewals] = useState([]);
  const [pendingSprints, setPendingSprints] = useState([]);
  const [changelogs, setChangelogs] = useState([]);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const twoDaysFromNow = format(addDays(new Date(), 2), 'yyyy-MM-dd');
      const thirtyDaysFromNow = format(addDays(new Date(), 30), 'yyyy-MM-dd');
      const weekStart = currentWeekStart();

      // Fetch all data in parallel
      const [requests, leads, clients, sprintSubs, changelogEntries] = await Promise.all([
        base44.entities.Request.filter({ archived: { $ne: true } }, '-created_date', 500),
        base44.entities.Lead.list('-created_date', 500),
        base44.entities.Client.list(),
        base44.entities.SprintSubmission.filter({ weekStart }),
        base44.entities.ChangelogEntry.list('-created_date', 10),
      ]);

      // ── Tasks: deadline=today, urgent, or in-progress with deadline within 2 days ──
      const taskFiltered = requests.filter(r => {
        if (r.status === 'Done' || r.status === 'Cancelled') return false;
        if (r.priority === 'Urgent') return true;
        if (r.deadline && isToday(parseISO(r.deadline))) return true;
        if (r.status === 'In Progress' && r.deadline && r.deadline <= twoDaysFromNow) return true;
        return false;
      });
      setTasks(taskFiltered);

      // ── Overdue pipeline actions ──
      const now = new Date();
      const activeStages = ['Closed Won', 'Closed Lost'];
      const overdueFiltered = leads.filter(l => {
        if (!l.nextActionDue) return false;
        if (activeStages.includes(l.stage)) return false;
        if (l.converted) return false;
        return isPast(parseISO(l.nextActionDue));
      });
      overdueFiltered.sort((a, b) => new Date(a.nextActionDue) - new Date(b.nextActionDue));
      setOverdueLeads(overdueFiltered);

      // ── Renewals in next 30 days ──
      const renewalFiltered = clients.filter(c => {
        if (c.status === 'Churn') return false;
        if (!c.renewalDate) return false;
        return c.renewalDate <= thirtyDaysFromNow && (c.renewalDate >= today || isPast(parseISO(c.renewalDate)));
      });
      renewalFiltered.sort((a, b) => new Date(a.renewalDate) - new Date(b.renewalDate));
      setRenewals(renewalFiltered);

      // ── Pending sprint submissions ──
      const submittedIds = new Set(sprintSubs.map(s => s.memberName?.toLowerCase()));
      const pending = MEMBERS.filter(m => !submittedIds.has(m.id)).map(m => ({
        id: m.id,
        name: m.name,
        role: m.role,
        submitted: false,
      }));
      setPendingSprints(pending);

      // ── Latest changelog ──
      setChangelogs(changelogEntries.slice(0, 3));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Re-load when parent triggers refresh
  useEffect(() => {
    if (onRefresh) {
      const handler = () => load();
      window.addEventListener('hq-refresh', handler);
      return () => window.removeEventListener('hq-refresh', handler);
    }
  }, [onRefresh, load]);

  const firstName = (user?.full_name || '').split(' ')[0] || 'there';
  const todayFormatted = format(new Date(), "EEEE, d MMMM yyyy");

  const handleQuickAction = (action) => {
    switch (action) {
      case 'lead':
        sessionStorage.setItem('hq_new_lead', '1');
        onNavigate('pipeline');
        break;
      case 'client':
        sessionStorage.setItem('hq_new_client', '1');
        onNavigate('clients');
        break;
      case 'sprint':
        sessionStorage.setItem('hq_sprint_submit', '1');
        onNavigate('sprints');
        break;
      case 'task':
        sessionStorage.setItem('hq_new_task', '1');
        onNavigate('requests');
        break;
    }
  };

  const handleTaskClick = (task) => {
    sessionStorage.setItem('focus_request_id', task.id);
    onNavigate('requests');
  };

  const handleLeadClick = (lead) => {
    sessionStorage.setItem('focus_lead_id', lead.id);
    onNavigate('pipeline');
  };

  const handleClientClick = (client) => {
    sessionStorage.setItem('focus_client_id', client.id);
    onNavigate('clients');
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#F7F7F8] dark:bg-[#0F0F1A]">
        <div className="w-8 h-8 border-3 border-[#8403C5]/20 border-t-[#8403C5] rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#F7F7F8] dark:bg-[#0F0F1A]">
        <div className="text-center">
          <p className="text-red-500 mb-2">Something went wrong</p>
          <button onClick={load} className="px-4 py-2 text-sm bg-[#8403C5] text-white rounded-lg">Retry</button>
        </div>
      </div>
    );
  }

  const cardClass = "bg-white dark:bg-[#1E1E2E] rounded-xl p-5 flex flex-col";
  const cardShadow = { boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)' };
  const linkClass = "flex items-center gap-1 text-xs font-semibold text-[#8403C5] hover:text-[#6e02a3] mt-auto pt-4 transition-colors";
  const sectionTitleClass = "text-[15px] font-bold text-[#242450] dark:text-white mb-4";

  return (
    <div className="flex-1 bg-[#F7F7F8] dark:bg-[#0F0F1A] overflow-y-auto font-dm">
      <div className="max-w-[1200px] mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#242450] dark:text-white">{getGreeting()}, {firstName}</h1>
            <p className="text-sm text-[#6B7280] dark:text-[#9090B0] mt-1">{todayFormatted}</p>
            <p className="text-[13px] text-[#9CA3AF] dark:text-[#7070A0] mt-0.5">Here's your daily briefing for Eventwise</p>
          </div>
          <button
            onClick={load}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#6B7280] hover:text-[#374151] dark:text-[#9090B0] dark:hover:text-white bg-white dark:bg-[#1E1E2E] rounded-lg border border-[#E5E7EB] dark:border-[#2E2E4E] hover:border-[#D1D5DB] transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            { action: 'lead', icon: Plus, label: 'New Lead' },
            { action: 'client', icon: UserPlus, label: 'Add Client' },
            { action: 'sprint', icon: FileText, label: 'Log Activity' },
            { action: 'task', icon: ClipboardList, label: 'New Task' },
          ].map(qa => (
            <button
              key={qa.action}
              onClick={() => handleQuickAction(qa.action)}
              className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-[#8403C5] bg-white dark:bg-[#1E1E2E] border-2 border-[#8403C5]/20 hover:border-[#8403C5]/40 hover:bg-[#FAF5FF] dark:hover:bg-[#2A1A3E] rounded-xl transition-all"
              style={cardShadow}
            >
              <qa.icon className="w-4 h-4" /> {qa.label}
            </button>
          ))}
        </div>

        {/* Two-column grid */}
        <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-6">
          {/* LEFT COLUMN */}
          <div className="space-y-6">
            {/* Section 1: Tasks */}
            <div className={cardClass} style={cardShadow}>
              <h2 className={sectionTitleClass}>✅ Tasks due today</h2>
              {tasks.length === 0 ? (
                <p className="text-sm text-[#9CA3AF] dark:text-[#7070A0] py-4">No tasks due today — you're on top of it 👍</p>
              ) : (
                <div className="space-y-2">
                  {tasks.slice(0, 8).map(task => (
                    <button
                      key={task.id}
                      onClick={() => handleTaskClick(task)}
                      className="w-full flex items-center gap-3 text-left px-3 py-2.5 rounded-lg hover:bg-[#F9FAFB] dark:hover:bg-[#2D3748] transition-colors group"
                    >
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md shrink-0 ${PRIORITY_STYLES[task.priority] || 'bg-[#F3F4F6] text-[#6B7280]'}`}>
                        {task.priority}
                      </span>
                      <span className="flex-1 text-sm font-medium text-[#111827] dark:text-[#E8E8F0] truncate">
                        {task.title || <span className="italic text-[#9CA3AF]">Untitled</span>}
                      </span>
                      {task.assignedTo && (
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 ${getAvatarColor(task.assignedTo)}`}>
                          {getInitials(task.assignedTo)}
                        </span>
                      )}
                      {task.deadline && (
                        <span className="text-[11px] text-[#9CA3AF] shrink-0">{format(new Date(task.deadline), 'd MMM')}</span>
                      )}
                    </button>
                  ))}
                  {tasks.length > 8 && (
                    <p className="text-xs text-[#9CA3AF] text-center pt-1">+{tasks.length - 8} more</p>
                  )}
                </div>
              )}
              <button onClick={() => onNavigate('requests')} className={linkClass}>
                View all tasks <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {/* Section 2: Overdue pipeline actions */}
            <div className={cardClass} style={cardShadow}>
              <h2 className={sectionTitleClass}>📊 Overdue pipeline actions</h2>
              {overdueLeads.length === 0 ? (
                <p className="text-sm text-[#15803D] dark:text-[#86EFAC] py-4">No overdue pipeline actions ✓</p>
              ) : (
                <div className="space-y-2">
                  {overdueLeads.slice(0, 5).map(lead => {
                    const days = daysUntil(lead.nextActionDue);
                    const overdue = days !== null && days > 0 ? days : 0;
                    return (
                      <button
                        key={lead.id}
                        onClick={() => handleLeadClick(lead)}
                        className="w-full flex items-center gap-3 text-left px-3 py-2.5 rounded-lg hover:bg-[#F9FAFB] dark:hover:bg-[#2D3748] transition-colors group"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[#111827] dark:text-[#E8E8F0] truncate">{lead.companyName || 'Unnamed'}</p>
                          <p className="text-xs text-[#9CA3AF] truncate">{lead.nextAction || 'No action set'}</p>
                        </div>
                        <span className="text-xs font-semibold text-[#B91C1C] dark:text-[#FCA5A5] shrink-0">
                          {overdue} day{overdue !== 1 ? 's' : ''} overdue
                        </span>
                      </button>
                    );
                  })}
                  {overdueLeads.length > 5 && (
                    <p className="text-xs text-[#9CA3AF] text-center pt-1">... and {overdueLeads.length - 5} more overdue</p>
                  )}
                </div>
              )}
              <button onClick={() => onNavigate('pipeline')} className={linkClass}>
                View full pipeline <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="space-y-6">
            {/* Section 3: Renewals */}
            <div className={cardClass} style={cardShadow}>
              <h2 className={sectionTitleClass}>🔄 Renewals in the next 30 days</h2>
              {renewals.length === 0 ? (
                <p className="text-sm text-[#15803D] dark:text-[#86EFAC] py-4">No renewals due in the next 30 days ✓</p>
              ) : (
                <div className="space-y-2">
                  {renewals.slice(0, 6).map(client => {
                    const days = daysUntil(client.renewalDate);
                    const isOverdue = days !== null && days < 0;
                    const isSoon = days !== null && days >= 0 && days <= 7;
                    const label = isOverdue ? `${Math.abs(days)}d overdue` : days === 0 ? 'Today' : `${days}d`;
                    const colorClass = isOverdue ? 'text-[#B91C1C] dark:text-[#FCA5A5]' : isSoon ? 'text-[#A16207] dark:text-[#FDE68A]' : 'text-[#9CA3AF]';
                    return (
                      <button
                        key={client.id}
                        onClick={() => handleClientClick(client)}
                        className="w-full flex items-center gap-3 text-left px-3 py-2.5 rounded-lg hover:bg-[#F9FAFB] dark:hover:bg-[#2D3748] transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[#111827] dark:text-[#E8E8F0] truncate">{client.name}</p>
                          <p className="text-xs text-[#9CA3AF]">{client.renewalDate ? format(new Date(client.renewalDate), 'd MMM yyyy') : '—'}</p>
                        </div>
                        <span className={`text-xs font-semibold shrink-0 ${colorClass}`}>{label}</span>
                        {client.owner && (
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 ${getAvatarColor(client.owner)}`}>
                            {getInitials(client.owner)}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
              <button onClick={() => onNavigate('renewals')} className={linkClass}>
                View all renewals <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {/* Section 4: Sprint submissions */}
            <div className={cardClass} style={cardShadow}>
              <h2 className={sectionTitleClass}>⚡ Pending sprint updates</h2>
              {pendingSprints.length === 0 ? (
                <p className="text-sm text-[#15803D] dark:text-[#86EFAC] py-4">All team members have submitted this week 🎉</p>
              ) : (
                <div className="space-y-2">
                  {pendingSprints.map(member => (
                    <div
                      key={member.id}
                      className="flex items-center gap-3 px-3 py-2.5"
                    >
                      <span className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 ${getAvatarColor(member.name)}`}>
                        {getInitials(member.name)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#111827] dark:text-[#E8E8F0]">{member.name}</p>
                        <p className="text-xs text-[#9CA3AF]">{member.role}</p>
                      </div>
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-[#FEF9C3] text-[#A16207] dark:bg-[#713F12] dark:text-[#FDE68A] shrink-0">
                        Not submitted
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <button onClick={() => handleQuickAction('sprint')} className={linkClass}>
                <Plus className="w-3 h-3" /> Submit Update
              </button>
            </div>

            {/* Section 5: Latest updates */}
            <div className={cardClass} style={cardShadow}>
              <h2 className={sectionTitleClass}>✨ Latest updates</h2>
              {changelogs.length === 0 ? (
                <p className="text-sm text-[#9CA3AF] dark:text-[#7070A0] py-4">No updates yet</p>
              ) : (
                <div className="space-y-2">
                  {changelogs.map(entry => (
                    <div key={entry.id} className="flex items-start gap-3 px-3 py-2.5">
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md shrink-0 ${CHANGELOG_TYPE_STYLES[entry.type] || 'bg-[#F3F4F6] text-[#6B7280]'}`}>
                        {entry.type}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#111827] dark:text-[#E8E8F0] truncate">{entry.title}</p>
                        <p className="text-xs text-[#9CA3AF]">{entry.date || (entry.created_date ? format(new Date(entry.created_date), 'd MMM yyyy') : '')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <button onClick={() => onNavigate('changelog')} className={linkClass}>
                View all updates <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}