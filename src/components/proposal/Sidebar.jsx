import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { PLANS, DEFAULT_ACCOUNTING_SERVICES } from '@/lib/proposalData';
import { FileDown, Sparkles, Plus } from 'lucide-react';

function SectionHeader({ label }) {
  return (
    <p className="text-[10px] font-semibold text-ew-muted uppercase tracking-[0.18em]">{label}</p>
  );
}

function Divider() {
  return <div className="border-t border-ew-border" />;
}

export default function Sidebar({ form, setForm, onGenerate, onDownload, hasProposal, leads = [] }) {
  const [companyMode, setCompanyMode] = useState('select');

  const selectedPlan = PLANS[form.plan];
  const customPriceNum = form.customPrice ? parseFloat(form.customPrice) : null;
  const hasDiscount = customPriceNum !== null && !isNaN(customPriceNum) && customPriceNum < selectedPlan.price;
  const isAbove = customPriceNum !== null && !isNaN(customPriceNum) && customPriceNum > selectedPlan.price;
  const discountPercent = hasDiscount
    ? Math.round(((selectedPlan.price - customPriceNum) / selectedPlan.price) * 100)
    : 0;

  const updateField = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const toggleService = (index) => {
    const next = [...form.accountingServices];
    next[index] = !next[index];
    setForm(prev => ({ ...prev, accountingServices: next }));
  };

  // When handoff sets companyName, detect if it's from leads
  useEffect(() => {
    if (form.companyName && leads.some(l => l.companyName === form.companyName)) {
      setCompanyMode('select');
    }
  }, [form.companyName, leads]);

  const handleCompanySelect = (value) => {
    if (value === '__new__') {
      setCompanyMode('new');
      updateField('companyName', '');
      updateField('contactName', '');
    } else {
      const lead = leads.find(l => l.companyName === value);
      setForm(prev => ({
        ...prev,
        companyName: value,
        contactName: lead?.contactName || prev.contactName,
      }));
      setCompanyMode('select');
    }
  };

  const switchToNew = () => {
    setCompanyMode('new');
    updateField('companyName', '');
    updateField('contactName', '');
  };

  const switchToSelect = () => {
    setCompanyMode('select');
    updateField('companyName', '');
  };

  return (
    <div className="w-[320px] shrink-0 bg-white border-r border-ew-border h-screen overflow-y-auto flex flex-col">
      {/* Logo */}
      <div className="px-5 py-4 border-b border-ew-border shrink-0">
        <img
          src="https://media.base44.com/images/public/user_68b97f79c23bb75318e10794/be171ff38_Logo_b1.png"
          alt="Eventwise"
          className="h-4"
        />
        <p className="text-ew-muted text-[11px] mt-1">Proposal Generator</p>
      </div>

      <div className="flex-1 overflow-y-auto">

        {/* ── CLIENT DETAILS ── */}
        <div className="px-5 pt-5 pb-4 space-y-3">
          <SectionHeader label="Client details" />

          {/* Company */}
          <div>
            <Label className="text-xs font-medium text-ew-body mb-1.5 block">Company</Label>
            {companyMode === 'select' ? (
              <div className="space-y-1.5">
                <Select
                  value={leads.some(l => l.companyName === form.companyName) ? form.companyName : ''}
                  onValueChange={handleCompanySelect}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Select company…" />
                  </SelectTrigger>
                  <SelectContent>
                    {leads.map(l => (
                      <SelectItem key={l.id} value={l.companyName}>{l.companyName}</SelectItem>
                    ))}
                    <SelectItem value="__new__">
                      <span className="flex items-center gap-1.5 text-green font-medium">
                        <Plus className="w-3 h-3" /> Add new company
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-1.5">
                <Input
                  placeholder="e.g. Festival Republic"
                  value={form.companyName}
                  onChange={e => updateField('companyName', e.target.value)}
                  className="h-9 text-sm"
                  autoFocus
                />
                {leads.length > 0 && (
                  <button
                    type="button"
                    onClick={switchToSelect}
                    className="text-[11px] text-ew-muted hover:text-navy transition-colors"
                  >
                    ← Back to list
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Contact name */}
          <div>
            <Label className="text-xs font-medium text-ew-body mb-1.5 block">Contact name</Label>
            <Input
              placeholder="e.g. Sarah Jones"
              value={form.contactName}
              onChange={e => updateField('contactName', e.target.value)}
              className="h-9 text-sm"
            />
          </div>

          {/* Contact email */}
          <div>
            <Label className="text-xs font-medium text-ew-body mb-1.5 block">Contact email</Label>
            <Input
              type="email"
              placeholder="e.g. sarah@festival.com"
              value={form.contactEmail}
              onChange={e => updateField('contactEmail', e.target.value)}
              className="h-9 text-sm"
            />
          </div>

          {/* Month/Year + Valid until */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs font-medium text-ew-body mb-1.5 block">Month / Year</Label>
              <Input
                type="month"
                value={form.date}
                onChange={e => updateField('date', e.target.value)}
                className="h-9 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs font-medium text-ew-body mb-1.5 block">Valid until</Label>
              <Input
                type="date"
                value={form.validUntil}
                onChange={e => updateField('validUntil', e.target.value)}
                className="h-9 text-sm"
              />
            </div>
          </div>
        </div>

        <Divider />

        {/* ── PLAN ── */}
        <div className="px-5 pt-4 pb-4 space-y-3">
          <SectionHeader label="Software plan" />

          <div>
            <Label className="text-xs font-medium text-ew-body mb-1.5 block">Plan</Label>
            <Select value={form.plan} onValueChange={v => updateField('plan', v)}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="starter">Starter — £299/mo</SelectItem>
                <SelectItem value="professional">Professional — £499/mo</SelectItem>
                <SelectItem value="business">Business — £799/mo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs font-medium text-ew-body mb-1.5 block">Custom price (optional)</Label>
            <Input
              placeholder={`Standard £${selectedPlan?.price}/mo`}
              value={form.customPrice}
              onChange={e => updateField('customPrice', e.target.value)}
              className="h-9 text-sm"
            />
            {form.customPrice && hasDiscount && (
              <p className="text-green text-[11px] font-medium mt-1.5">
                ✓ {discountPercent}% discount applied vs standard £{selectedPlan.price}/mo
              </p>
            )}
            {form.customPrice && isAbove && (
              <p className="text-ew-muted text-[11px] mt-1.5">
                Custom price above standard rate
              </p>
            )}
          </div>
        </div>

        <Divider />

        {/* ── ACCOUNTING ── */}
        <div className="px-5 pt-4 pb-4 space-y-3">
          <div className="flex items-center justify-between">
            <SectionHeader label="Accounting service" />
            <Switch
              checked={form.includeAccounting}
              onCheckedChange={v => updateField('includeAccounting', v)}
              id="accounting-toggle"
            />
          </div>

          {form.includeAccounting && (
            <>
              <div>
                <Label className="text-xs font-medium text-ew-body mb-1.5 block">Price / yr</Label>
                <Input
                  placeholder="£7,100"
                  value={form.accountingPrice}
                  onChange={e => updateField('accountingPrice', e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-2">
                {DEFAULT_ACCOUNTING_SERVICES.map((service, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <Checkbox
                      checked={form.accountingServices[i]}
                      onCheckedChange={() => toggleService(i)}
                      id={`svc-${i}`}
                      className="mt-0.5"
                    />
                    <Label htmlFor={`svc-${i}`} className="text-xs text-ew-body leading-snug cursor-pointer">
                      {service}
                    </Label>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <Divider />

        {/* ── ONBOARDING ── */}
        <div className="px-5 pt-4 pb-4 space-y-3">
          <div className="flex items-center justify-between">
            <SectionHeader label="Onboarding" />
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-ew-muted">All 3</span>
              <Switch
                checked={form.showAllOnboarding}
                onCheckedChange={v => updateField('showAllOnboarding', v)}
                id="onboarding-all-toggle"
              />
            </div>
          </div>

          {form.showAllOnboarding ? (
            <p className="text-[11px] text-ew-muted leading-snug">
              All three packages shown side by side for comparison.
            </p>
          ) : (
            <Select value={form.onboarding} onValueChange={v => updateField('onboarding', v)}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="essential">Success Essential — Free</SelectItem>
                <SelectItem value="plus">Success Plus — £1,500</SelectItem>
                <SelectItem value="premium">Success Premium — £5,000</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>

        <Divider />

        {/* ── NOTES ── */}
        <div className="px-5 pt-4 pb-5 space-y-3">
          <SectionHeader label="Additional notes" />
          <Textarea
            placeholder="Optional notes from Chris that will appear in the proposal…"
            value={form.notes}
            onChange={e => updateField('notes', e.target.value)}
            className="text-sm h-24 resize-none"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="px-5 py-4 border-t border-ew-border shrink-0 space-y-2">
        <Button
          onClick={onGenerate}
          className="w-full h-9 bg-navy hover:bg-navy/90 text-white font-semibold text-sm"
        >
          <Sparkles className="w-4 h-4 mr-1.5" />
          New proposal ref
        </Button>
        <Button
          onClick={onDownload}
          disabled={!hasProposal}
          variant="outline"
          className="w-full h-9 bg-green hover:bg-green/90 text-white font-semibold text-sm border-0 disabled:opacity-40 disabled:bg-green/40"
        >
          <FileDown className="w-4 h-4 mr-1.5" />
          Download PDF
        </Button>
      </div>
    </div>
  );
}