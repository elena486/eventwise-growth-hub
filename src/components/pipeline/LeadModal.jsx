import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { X } from 'lucide-react';
import { format } from 'date-fns';

const STAGES = ['Contacted', 'Discovery Call', 'Proposal Sent', 'In Negotiation', 'Closed Won', 'Closed Lost'];
const PLANS = ['Starter', 'Professional', 'Business'];

const empty = () => ({
  companyName: '',
  contactName: '',
  plan: 'Starter',
  dealValueMonthly: '',
  stage: 'Contacted',
  nextAction: '',
  lastActivity: format(new Date(), 'yyyy-MM-dd'),
  notes: '',
});

export default function LeadModal({ lead, onSave, onClose }) {
  const [form, setForm] = useState(lead ? { ...lead, dealValueMonthly: lead.dealValueMonthly ?? '' } : empty());

  const update = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.companyName.trim()) return;
    onSave({ ...form, dealValueMonthly: form.dealValueMonthly ? parseFloat(form.dealValueMonthly) : 0 });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-ew-border">
          <h2 className="text-base font-semibold text-navy">{lead ? 'Edit lead' : 'Add new lead'}</h2>
          <button onClick={onClose} className="text-ew-muted hover:text-navy transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs font-medium text-ew-body mb-1.5 block">Company name *</Label>
              <Input value={form.companyName} onChange={e => update('companyName', e.target.value)} placeholder="Festival Republic" className="h-9 text-sm" required />
            </div>
            <div>
              <Label className="text-xs font-medium text-ew-body mb-1.5 block">Contact name</Label>
              <Input value={form.contactName} onChange={e => update('contactName', e.target.value)} placeholder="Sarah Jones" className="h-9 text-sm" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs font-medium text-ew-body mb-1.5 block">Plan</Label>
              <Select value={form.plan || 'Starter'} onValueChange={v => update('plan', v)}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PLANS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-medium text-ew-body mb-1.5 block">Deal value (£/mo)</Label>
              <Input type="number" value={form.dealValueMonthly} onChange={e => update('dealValueMonthly', e.target.value)} placeholder="499" className="h-9 text-sm" />
              {form.dealValueMonthly > 0 && (
                <p className="text-[11px] text-ew-muted mt-1">£{(form.dealValueMonthly * 12).toLocaleString('en-GB')}/yr</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs font-medium text-ew-body mb-1.5 block">Stage</Label>
              <Select value={form.stage || 'Contacted'} onValueChange={v => update('stage', v)}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STAGES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-medium text-ew-body mb-1.5 block">Last activity</Label>
              <Input type="date" value={form.lastActivity} onChange={e => update('lastActivity', e.target.value)} className="h-9 text-sm" />
            </div>
          </div>

          <div>
            <Label className="text-xs font-medium text-ew-body mb-1.5 block">Next action</Label>
            <Input value={form.nextAction} onChange={e => update('nextAction', e.target.value)} placeholder="Follow up Friday" className="h-9 text-sm" />
          </div>

          <div>
            <Label className="text-xs font-medium text-ew-body mb-1.5 block">Notes</Label>
            <Textarea value={form.notes} onChange={e => update('notes', e.target.value)} placeholder="Context, objections, key contacts..." className="text-sm h-20 resize-none" />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="submit" className="flex-1 h-9 bg-navy hover:bg-navy/90 text-white font-semibold text-sm">
              Save lead
            </Button>
            <Button type="button" variant="outline" onClick={onClose} className="flex-1 h-9 text-sm">
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}