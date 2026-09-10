import React from 'react';
import { format } from 'date-fns';
import { Check, X } from 'lucide-react';

const ic = 'w-full text-sm border border-[#E5E7EB] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#8403C5]/20 focus:border-[#8403C5] bg-white transition-colors';
const labelCls = 'block text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-[0.08em] mb-1';

const ACCOUNTANT_STATUS_STYLES = {
  'Internal': 'bg-blue-100 text-blue-700',
  'External': 'bg-amber-100 text-amber-700',
  'Eventwise': 'bg-purple-100 text-purple-700',
};
const PRIORITY_TIER_STYLES = {
  'Tier 1': 'bg-red-100 text-red-700',
  'Tier 2': 'bg-amber-100 text-amber-700',
  'Tier 3': 'bg-blue-100 text-blue-700',
  'Tier 4': 'bg-gray-100 text-gray-600',
};

export default function HandoverTab({ client, onSave }) {
  // onSave is the autoSave function: (field, value) => void
  return (
    <div className="space-y-5">
      {/* Status badge */}
      <div className="flex items-center gap-2 flex-wrap">
        {client.handover_status === 'Completed' ? (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700">
            <Check className="w-3.5 h-3.5" /> Handover completed {client.handover_completed_date ? format(new Date(client.handover_completed_date), 'd MMM yyyy') : ''}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700">
            <X className="w-3.5 h-3.5" /> Handover not completed
          </span>
        )}
        {client.handover_priority_tier && (
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${PRIORITY_TIER_STYLES[client.handover_priority_tier] || 'bg-gray-100 text-gray-600'}`}>
            {client.handover_priority_tier}
          </span>
        )}
        {client.accountant_status && (
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${ACCOUNTANT_STATUS_STYLES[client.accountant_status] || 'bg-gray-100 text-gray-600'}`}>
            Accountant: {client.accountant_status}
          </span>
        )}
      </div>

      {/* Fields grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className={labelCls}>Business goals</label>
          <textarea className={`${ic} min-h-[80px] resize-none`} value={client.business_goals || ''} onChange={e => onSave('business_goals', e.target.value)} placeholder="—" />
        </div>

        <div>
          <label className={labelCls}>Client's accountant status</label>
          <select className={ic} value={client.accountant_status || ''} onChange={e => onSave('accountant_status', e.target.value)}>
            <option value="">— Not set —</option>
            <option>Internal</option>
            <option>External</option>
            <option>Eventwise</option>
          </select>
        </div>
        <div>
          <label className={labelCls}>Priority tier</label>
          <select className={ic} value={client.handover_priority_tier || ''} onChange={e => onSave('handover_priority_tier', e.target.value)}>
            <option value="">— Not set —</option>
            <option>Tier 1</option>
            <option>Tier 2</option>
            <option>Tier 3</option>
            <option>Tier 4</option>
          </select>
        </div>

        <div className="col-span-2">
          <label className={labelCls}>Key pain points</label>
          <textarea className={`${ic} min-h-[80px] resize-none`} value={client.key_pain_points || ''} onChange={e => onSave('key_pain_points', e.target.value)} placeholder="—" />
        </div>

        <div className="col-span-2">
          <label className={labelCls}>Red flags</label>
          <textarea className={`${ic} min-h-[60px] resize-none`} value={client.red_flags || ''} onChange={e => onSave('red_flags', e.target.value)} placeholder="—" />
        </div>

        <div className="col-span-2">
          <label className={labelCls}>Objections raised & how addressed</label>
          <textarea className={`${ic} min-h-[80px] resize-none`} value={client.objections_raised_addressed || ''} onChange={e => onSave('objections_raised_addressed', e.target.value)} placeholder="—" />
        </div>

        <div>
          <label className={labelCls}>Conversion risk</label>
          <select className={ic} value={client.conversion_risk || ''} onChange={e => onSave('conversion_risk', e.target.value)}>
            <option value="">— Not set —</option>
            <option>Low</option>
            <option>Medium</option>
            <option>High</option>
          </select>
        </div>

        <div className="col-span-2">
          <label className={labelCls}>Next steps</label>
          <textarea className={`${ic} min-h-[80px] resize-none`} value={client.next_steps || ''} onChange={e => onSave('next_steps', e.target.value)} placeholder="—" />
        </div>

        <div className="col-span-2">
          <label className={labelCls}>Main features demoed</label>
          <textarea className={`${ic} min-h-[80px] resize-none`} value={client.main_features_demoed || ''} onChange={e => onSave('main_features_demoed', e.target.value)} placeholder="—" />
        </div>

        <div className="col-span-2">
          <label className={labelCls}>What resonated with the client</label>
          <textarea className={`${ic} min-h-[80px] resize-none`} value={client.what_resonated || ''} onChange={e => onSave('what_resonated', e.target.value)} placeholder="—" />
        </div>

        <div className="col-span-2">
          <label className={labelCls}>Features promised / included in contract</label>
          <textarea className={`${ic} min-h-[80px] resize-none`} value={client.features_promised || ''} onChange={e => onSave('features_promised', e.target.value)} placeholder="—" />
        </div>

        <div>
          <label className={labelCls}>Uses Xero already</label>
          <div className="flex items-center gap-3 mt-1">
            <button type="button" onClick={() => onSave('uses_xero', !client.uses_xero)}
              className={`relative inline-flex h-5 w-9 rounded-full transition-colors shrink-0 ${client.uses_xero ? 'bg-[#8403C5]' : 'bg-gray-200'}`}>
              <span className={`inline-block w-3.5 h-3.5 bg-white rounded-full shadow transition-transform mt-0.5 ${client.uses_xero ? 'translate-x-4' : 'translate-x-1'}`} />
            </button>
            <span className="text-sm text-[#374151]">{client.uses_xero ? 'Yes' : 'No'}</span>
          </div>
        </div>
        <div>
          <label className={labelCls}>Expected go-live date</label>
          <input type="date" className={ic} value={client.expected_go_live_date || ''} onChange={e => onSave('expected_go_live_date', e.target.value)} />
        </div>

        <div>
          <label className={labelCls}>Current budgeting tool</label>
          <input className={ic} value={client.current_budgeting_tool || ''} onChange={e => onSave('current_budgeting_tool', e.target.value)} placeholder="—" />
        </div>
        <div>
          <label className={labelCls}>Technical / admin contact name</label>
          <input className={ic} value={client.tech_admin_contact_name || ''} onChange={e => onSave('tech_admin_contact_name', e.target.value)} placeholder="—" />
        </div>

        <div className="col-span-2">
          <label className={labelCls}>What would make them convert</label>
          <textarea className={`${ic} min-h-[80px] resize-none`} value={client.what_would_make_them_convert || ''} onChange={e => onSave('what_would_make_them_convert', e.target.value)} placeholder="—" />
        </div>
      </div>
    </div>
  );
}