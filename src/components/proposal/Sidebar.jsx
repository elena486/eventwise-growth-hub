import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { PLANS, DEFAULT_ACCOUNTING_SERVICES, ONBOARDING_PACKAGES } from '@/lib/proposalData';
import { FileDown, Sparkles } from 'lucide-react';

export default function Sidebar({ form, setForm, onGenerate, onDownload, hasProposal }) {
  const selectedPlan = PLANS[form.plan];
  const customPriceNum = form.customPrice ? parseFloat(form.customPrice) : null;
  const hasDiscount = customPriceNum && customPriceNum < selectedPlan.price;
  const isAbove = customPriceNum && customPriceNum > selectedPlan.price;
  const discountPercent = hasDiscount
    ? Math.round(((selectedPlan.price - customPriceNum) / selectedPlan.price) * 100)
    : 0;

  const updateField = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const toggleService = (index) => {
    const next = [...form.accountingServices];
    next[index] = !next[index];
    setForm(prev => ({ ...prev, accountingServices: next }));
  };

  return (
    <div className="w-[340px] shrink-0 bg-white border-r border-ew-border h-screen overflow-y-auto flex flex-col">
      <div className="p-6 pb-3 border-b border-ew-border">
        <div className="flex items-center gap-2.5 mb-1">
          <img src="https://media.base44.com/images/public/user_68b97f79c23bb75318e10794/be171ff38_Logo_b1.png" alt="Eventwise" className="h-5" />
        </div>
        <p className="text-ew-muted text-xs mt-1">Proposal Generator</p>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-7">
        {/* Client section */}
        <div>
          <h3 className="text-[11px] font-semibold text-ew-muted uppercase tracking-[0.15em] mb-4">Client</h3>
          <div className="space-y-3">
            <div>
              <Label className="text-xs font-medium text-ew-body mb-1.5 block">Company name</Label>
              <Input
                placeholder="e.g. Festival Republic"
                value={form.companyName}
                onChange={e => updateField('companyName', e.target.value)}
                className="h-9 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs font-medium text-ew-body mb-1.5 block">Contact name</Label>
              <Input
                placeholder="e.g. Sarah Jones"
                value={form.contactName}
                onChange={e => updateField('contactName', e.target.value)}
                className="h-9 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs font-medium text-ew-body mb-1.5 block">Month / Year</Label>
              <Input
                type="month"
                value={form.date}
                onChange={e => updateField('date', e.target.value)}
                className="h-9 text-sm"
              />
            </div>
          </div>
        </div>

        {/* Plan section */}
        <div>
          <h3 className="text-[11px] font-semibold text-ew-muted uppercase tracking-[0.15em] mb-4">Software plan</h3>
          <div className="space-y-3">
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
                placeholder="Leave blank for standard price"
                value={form.customPrice}
                onChange={e => updateField('customPrice', e.target.value)}
                className="h-9 text-sm"
              />
              {hasDiscount && (
                <p className="text-green text-[11px] font-medium mt-1.5">
                  ✓ {discountPercent}% discount vs standard £{selectedPlan.price}/mo
                </p>
              )}
              {isAbove && (
                <p className="text-ew-muted text-[11px] mt-1.5">
                  Custom price above standard rate
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Accounting section */}
        <div>
          <h3 className="text-[11px] font-semibold text-ew-muted uppercase tracking-[0.15em] mb-4">Accounting service</h3>
          <div className="flex items-center gap-2.5 mb-4">
            <Switch
              checked={form.includeAccounting}
              onCheckedChange={v => updateField('includeAccounting', v)}
              id="accounting-toggle"
            />
            <Label htmlFor="accounting-toggle" className="text-sm font-medium text-ew-body cursor-pointer">
              Include accounting service
            </Label>
          </div>
          {form.includeAccounting && (
            <div className="space-y-3">
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
            </div>
          )}
        </div>

        {/* Onboarding section */}
        <div>
          <h3 className="text-[11px] font-semibold text-ew-muted uppercase tracking-[0.15em] mb-4">Onboarding</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <Switch
                checked={form.showAllOnboarding}
                onCheckedChange={v => updateField('showAllOnboarding', v)}
                id="onboarding-all-toggle"
              />
              <Label htmlFor="onboarding-all-toggle" className="text-sm font-medium text-ew-body cursor-pointer">
                Show all 3 packages
              </Label>
            </div>
            {form.showAllOnboarding ? (
              <p className="text-[11px] text-ew-muted leading-snug">
                All three packages will be shown side by side so the client can compare and choose.
              </p>
            ) : (
              <div>
                <Label className="text-xs font-medium text-ew-body mb-1.5 block">Selected package</Label>
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
                <p className="text-[11px] text-ew-muted mt-1.5">Use this when the client has already agreed to a specific package.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Buttons */}
      <div className="p-6 pt-4 border-t border-ew-border space-y-2.5">
        <Button
          onClick={onGenerate}
          className="w-full h-10 bg-navy hover:bg-navy/90 text-white font-semibold text-sm"
        >
          <Sparkles className="w-4 h-4 mr-2" />
          Generate proposal
        </Button>
        <Button
          onClick={onDownload}
          disabled={!hasProposal}
          variant="outline"
          className="w-full h-10 bg-green hover:bg-green/90 text-white font-semibold text-sm border-0 disabled:opacity-40 disabled:bg-green/40"
        >
          <FileDown className="w-4 h-4 mr-2" />
          Download PDF
        </Button>
      </div>
    </div>
  );
}