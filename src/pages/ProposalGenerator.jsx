import React, { useState, useCallback } from 'react';
import Sidebar from '@/components/proposal/Sidebar';
import ProposalDocument from '@/components/proposal/ProposalDocument';
import { PLANS, PLAN_FEATURES, DEFAULT_ACCOUNTING_SERVICES, ONBOARDING_PACKAGES, ONBOARDING_FEATURES } from '@/lib/proposalData';
import { format } from 'date-fns';

const getInitialForm = () => ({
  companyName: '',
  contactName: '',
  date: format(new Date(), 'yyyy-MM'),
  plan: 'starter',
  customPrice: '',
  includeAccounting: true,
  accountingPrice: '7100',
  accountingServices: DEFAULT_ACCOUNTING_SERVICES.map(() => true),
  onboarding: 'plus',
  showAllOnboarding: false,
});

function buildProposalHTML(proposalData) {
  const pd = proposalData;
  const selectedServices = pd.accountingServices;

  const planFeaturesHTML = pd.planFeatures.map(f => `
    <div style="display:flex;align-items:flex-start;gap:10px;padding:6px 0;">
      <span style="color:#1D9E75;font-weight:700;font-size:14px;flex-shrink:0;">✓</span>
      <span style="color:#3D4563;font-size:14px;line-height:1.4;">${f}</span>
    </div>
  `).join('');

  const accountingServicesHTML = selectedServices.map(s => `
    <div style="display:flex;align-items:flex-start;gap:10px;padding:6px 0;">
      <span style="color:#1D9E75;font-weight:700;font-size:14px;flex-shrink:0;">✓</span>
      <span style="color:#3D4563;font-size:14px;line-height:1.4;">${s}</span>
    </div>
  `).join('');

  const discountBannerHTML = pd.discountPercent > 0 ? `
    <div style="background:#1D9E75;display:flex;align-items:center;gap:16px;padding:16px 32px;print-color-adjust:exact;-webkit-print-color-adjust:exact;">
      <span style="background:rgba(255,255,255,0.2);color:white;font-size:12px;font-weight:600;border-radius:9999px;padding:4px 12px;">${pd.discountPercent}% discount</span>
      <p style="color:white;font-size:14px;font-weight:500;">Custom rate applied — standard price is £${pd.standardPrice}/mo</p>
    </div>
  ` : '';

  const subtitle = pd.includeAccounting
    ? `${pd.planName} Plan + Accounting Service`
    : `${pd.planName} Plan`;

  const formattedDate = pd.date ? format(new Date(pd.date + '-01'), 'MMMM yyyy') : '';

  const pricingCards = pd.includeAccounting ? `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">
      <div style="border:2px solid #1B2A52;border-radius:12px;overflow:hidden;">
        <div style="background:#1B2A52;padding:24px;print-color-adjust:exact;-webkit-print-color-adjust:exact;">
          <p style="font-size:10px;font-weight:600;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:0.15em;margin-bottom:12px;">${pd.planName} Plan</p>
          <div><span style="font-size:30px;font-weight:700;color:white;">£${pd.displayPrice}</span><span style="color:rgba(255,255,255,0.5);font-size:14px;">/mo</span></div>
          <p style="color:rgba(255,255,255,0.4);font-size:12px;margin-top:8px;">Seats and departments included</p>
        </div>
        <div style="padding:24px;">${planFeaturesHTML}</div>
      </div>
      <div style="border:1px solid #E2E5F0;border-radius:12px;overflow:hidden;">
        <div style="background:#F7F8FC;padding:24px;print-color-adjust:exact;-webkit-print-color-adjust:exact;">
          <p style="font-size:10px;font-weight:600;color:#8B92A9;text-transform:uppercase;letter-spacing:0.15em;margin-bottom:12px;">Accounting Service</p>
          <div><span style="font-size:30px;font-weight:700;color:#1B2A52;">£${pd.accountingPriceFormatted}</span><span style="color:#8B92A9;font-size:14px;">/yr</span></div>
          <p style="color:#8B92A9;font-size:12px;margin-top:8px;">Full-service financial management</p>
        </div>
        <div style="padding:24px;">${accountingServicesHTML}</div>
      </div>
    </div>
  ` : `
    <div style="max-width:360px;">
      <div style="border:2px solid #1B2A52;border-radius:12px;overflow:hidden;">
        <div style="background:#1B2A52;padding:24px;print-color-adjust:exact;-webkit-print-color-adjust:exact;">
          <p style="font-size:10px;font-weight:600;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:0.15em;margin-bottom:12px;">${pd.planName} Plan</p>
          <div><span style="font-size:30px;font-weight:700;color:white;">£${pd.displayPrice}</span><span style="color:rgba(255,255,255,0.5);font-size:14px;">/mo</span></div>
          <p style="color:rgba(255,255,255,0.4);font-size:12px;margin-top:8px;">Seats and departments included</p>
        </div>
        <div style="padding:24px;">${planFeaturesHTML}</div>
      </div>
    </div>
  `;

  const platformFeatures = [
    { emoji: '📊', title: 'Live budget control', desc: 'Budgets update in real-time as sales come in and expenses are logged.' },
    { emoji: '✅', title: 'Smart approvals', desc: 'Set rules for purchases and changes. Track who approved what and when.' },
    { emoji: '🧾', title: 'Purchase orders', desc: 'Raise, approve and track POs directly in Eventwise. Full audit trail on every spend.' },
    { emoji: '🎟', title: 'Ticket tracking', desc: 'Live ticket sales from every platform in one dashboard.' },
    { emoji: '💸', title: 'Sales invoicing', desc: 'All revenue streams — tickets, sponsorship, traders — in one place.' },
    { emoji: '🔗', title: 'Xero integration', desc: 'Accounting data syncs in real-time. No manual reconciliation.' },
  ];

  const platformHTML = platformFeatures.map(f => `
    <div style="border:1px solid #E2E5F0;border-radius:8px;padding:20px;">
      <span style="font-size:24px;display:block;margin-bottom:12px;">${f.emoji}</span>
      <h4 style="font-weight:600;color:#1B2A52;font-size:14px;margin-bottom:4px;">${f.title}</h4>
      <p style="color:#8B92A9;font-size:12px;line-height:1.5;">${f.desc}</p>
    </div>
  `).join('');

  const onboardingFeatures = pd.onboardingFeatures.map(f => `
    <div style="display:flex;align-items:flex-start;gap:10px;padding:6px 0;">
      <span style="color:#1D9E75;font-weight:700;font-size:14px;flex-shrink:0;">✓</span>
      <span style="color:#3D4563;font-size:14px;line-height:1.4;">${f}</span>
    </div>
  `).join('');

  const midpoint = Math.ceil(pd.onboardingFeatures.length / 2);
  const col1 = pd.onboardingFeatures.slice(0, midpoint);
  const col2 = pd.onboardingFeatures.slice(midpoint);

  const onboardingCol1 = col1.map(f => `
    <div style="display:flex;align-items:flex-start;gap:10px;padding:6px 0;">
      <span style="color:#1D9E75;font-weight:700;font-size:14px;flex-shrink:0;">✓</span>
      <span style="color:#3D4563;font-size:14px;line-height:1.4;">${f}</span>
    </div>
  `).join('');

  const onboardingCol2 = col2.map(f => `
    <div style="display:flex;align-items:flex-start;gap:10px;padding:6px 0;">
      <span style="color:#1D9E75;font-weight:700;font-size:14px;flex-shrink:0;">✓</span>
      <span style="color:#3D4563;font-size:14px;line-height:1.4;">${f}</span>
    </div>
  `).join('');

  const terms = [
    { title: 'Cancellation', text: "Cancel anytime with 30 days notice. You'll receive a full data export and prorated refund for any unused annual period." },
    { title: 'Your data', text: 'All financial data remains yours. Exported on request and securely deleted within 90 days of termination.' },
    { title: 'Confidentiality', text: 'Strict confidentiality of all financial data and business information, surviving termination indefinitely.' },
  ];

  const termsHTML = terms.map(t => `
    <div style="border:1px solid #E2E5F0;border-radius:8px;padding:20px;flex:1;">
      <h4 style="font-weight:600;color:#1B2A52;font-size:14px;margin-bottom:8px;">${t.title}</h4>
      <p style="color:#8B92A9;font-size:12px;line-height:1.5;">${t.text}</p>
    </div>
  `).join('');

  const steps = ['Consultation call', 'Customise to your workflows', '2-week implementation', 'Go-live with full support'];
  const stepsHTML = steps.map((s, i) => `
    <div style="display:flex;align-items:center;gap:12px;">
      <div style="width:28px;height:28px;border-radius:50%;border:1px solid rgba(255,255,255,0.25);color:white;font-size:12px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;">${i + 1}</div>
      <span style="color:white;font-size:14px;font-weight:500;">${s}</span>
    </div>
  `).join('');

  const timelineSteps = [
    { step: 1, label: 'Foundation', time: 'Day 1–2' },
    { step: 2, label: 'Configuration', time: 'Day 2–3' },
    { step: 3, label: 'Enablement', time: 'Week 1–2' },
    { step: 4, label: 'Launch', time: 'Week 2–3' },
  ];
  const timelineHTML = timelineSteps.map(s => `
    <div style="flex:1;display:flex;flex-direction:column;align-items:center;position:relative;z-index:1;">
      <div style="width:32px;height:32px;border-radius:50%;background:#1B2A52;color:white;font-size:12px;font-weight:700;display:flex;align-items:center;justify-content:center;margin-bottom:8px;print-color-adjust:exact;-webkit-print-color-adjust:exact;">${s.step}</div>
      <p style="font-weight:600;color:#1B2A52;font-size:12px;">${s.label}</p>
      <p style="color:#8B92A9;font-size:11px;">${s.time}</p>
    </div>
  `).join('');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Eventwise Proposal — ${pd.companyName}</title>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
  body { font-family: 'DM Sans', sans-serif; background: white; color: #3D4563; }
  @page { margin: 0; size: A4; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head>
<body>
<div style="max-width:760px;margin:0 auto;background:white;">

  <!-- Cover -->
  <div style="background:#1B2A52;padding:40px 40px 32px;print-color-adjust:exact;-webkit-print-color-adjust:exact;">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:40px;">
      <img src="https://media.base44.com/images/public/user_68b97f79c23bb75318e10794/0142a0222_Logo_w.png" alt="Eventwise" style="height:32px;" />
      <span style="font-size:12px;font-weight:500;color:rgba(255,255,255,0.8);border:1px solid rgba(255,255,255,0.3);border-radius:9999px;padding:6px 16px;letter-spacing:0.05em;">Subscription Proposal</span>
    </div>
    <p style="font-size:11px;font-weight:500;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:0.2em;margin-bottom:12px;">Prepared exclusively for</p>
    <h1 style="font-size:38px;font-weight:700;color:white;line-height:1.1;letter-spacing:-0.02em;margin-bottom:12px;">${pd.companyName}</h1>
    <p style="color:rgba(255,255,255,0.6);font-size:16px;font-weight:500;">${subtitle}</p>
    <div style="border-top:1px solid rgba(255,255,255,0.15);margin-top:32px;padding-top:24px;display:flex;justify-content:space-between;align-items:flex-end;">
      <div>
        <p style="font-size:10px;font-weight:500;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:0.15em;margin-bottom:4px;">Prepared for</p>
        <p style="color:white;font-weight:600;font-size:14px;">${pd.contactName}</p>
      </div>
      <div style="text-align:right;">
        <p style="color:rgba(255,255,255,0.5);font-size:12px;margin-bottom:4px;">${formattedDate}</p>
        <p style="color:white;font-weight:600;font-size:14px;">Chris Carter</p>
        <p style="color:rgba(255,255,255,0.5);font-size:12px;">CEO, Eventwise</p>
      </div>
    </div>
  </div>

  ${discountBannerHTML}

  <!-- Pricing -->
  <div style="padding:40px;">
    <p style="font-size:11px;font-weight:600;color:#1D9E75;text-transform:uppercase;letter-spacing:0.2em;margin-bottom:8px;">Your investment</p>
    <h2 style="font-size:24px;font-weight:700;color:#1B2A52;margin-bottom:32px;">Simple, transparent pricing</h2>
    ${pricingCards}
  </div>

  <!-- Platform features -->
  <div style="padding:40px;border-top:1px solid #E2E5F0;">
    <p style="font-size:11px;font-weight:600;color:#1D9E75;text-transform:uppercase;letter-spacing:0.2em;margin-bottom:8px;">The platform</p>
    <h2 style="font-size:24px;font-weight:700;color:#1B2A52;margin-bottom:8px;">Everything your finance team needs</h2>
    <p style="color:#5A6180;font-size:14px;margin-bottom:32px;max-width:520px;">Built for event teams who are tired of spreadsheets and need real visibility over every pound — from first budget line to post-event P&L.</p>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-bottom:32px;">${platformHTML}</div>
    <div style="border-left:4px solid #1B2A52;background:#EEF0FA;border-radius:0 8px 8px 0;padding:24px;print-color-adjust:exact;-webkit-print-color-adjust:exact;">
      <p style="color:#3D4563;font-size:14px;font-style:italic;line-height:1.6;margin-bottom:12px;">"Eventwise is exactly what our music festival needed. Its interactive features and budget tools transform our planning, helping us stay on budget, catch issues early, and make confident decisions throughout the event lifecycle."</p>
      <p style="color:#1B2A52;font-size:14px;"><strong>Fred Letts</strong>, <span style="color:#8B92A9;">Director — Gottwood Festival</span></p>
    </div>
  </div>

  <!-- Onboarding -->
  <div style="padding:40px;border-top:1px solid #E2E5F0;">
    <p style="font-size:11px;font-weight:600;color:#1D9E75;text-transform:uppercase;letter-spacing:0.2em;margin-bottom:8px;">Getting started</p>
    <h2 style="font-size:24px;font-weight:700;color:#1B2A52;margin-bottom:8px;">We don't disappear after launch</h2>
    <p style="color:#5A6180;font-size:14px;margin-bottom:32px;max-width:520px;">Every client gets a dedicated account manager and a structured onboarding programme to make sure your team is set up for success from day one.</p>

    <p style="font-size:12px;font-weight:600;color:#1B2A52;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:20px;">Implementation timeline</p>
    ${timelineHTML}

    <p style="font-size:12px;font-weight:600;color:#1B2A52;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:20px;margin-top:40px;">${pd.showAllOnboarding ? 'Onboarding packages' : 'Your onboarding package'}</p>
    ${onboardingPackagesHTML}
  </div>

  <!-- CTA -->
  <div style="margin:40px;background:#1B2A52;border-radius:12px;padding:32px;display:flex;gap:32px;align-items:center;print-color-adjust:exact;-webkit-print-color-adjust:exact;">
    <div style="flex:1;">
      <p style="font-size:10px;font-weight:600;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:0.2em;margin-bottom:8px;">Ready to move forward?</p>
      <h3 style="font-size:20px;font-weight:700;color:white;margin-bottom:8px;">Let's get you live in 3 weeks</h3>
      <p style="color:rgba(255,255,255,0.5);font-size:14px;line-height:1.5;">Most clients are up and running — with real data flowing — in under three weeks.</p>
    </div>
    <div style="display:flex;flex-direction:column;gap:12px;flex-shrink:0;">${stepsHTML}</div>
  </div>

  <!-- Footer -->
  <div style="background:#F7F8FC;padding:24px 40px;display:flex;align-items:center;justify-content:space-between;print-color-adjust:exact;-webkit-print-color-adjust:exact;">
    <img src="https://media.base44.com/images/public/user_68b97f79c23bb75318e10794/be171ff38_Logo_b1.png" alt="Eventwise" style="height:24px;" />
    <div style="text-align:right;">
      <p style="color:#8B92A9;font-size:12px;">hello@eventwise.com</p>
      <p style="color:#8B92A9;font-size:12px;">eventwise.com</p>
    </div>
  </div>

</div>
</body>
</html>`;
}

export default function ProposalGenerator() {
  const [form, setForm] = useState(getInitialForm);
  const [proposalData, setProposalData] = useState(null);

  const handleGenerate = useCallback(() => {
    const plan = PLANS[form.plan];
    const customPriceNum = form.customPrice ? parseFloat(form.customPrice) : null;
    const displayPrice = customPriceNum || plan.price;
    const hasDiscount = customPriceNum && customPriceNum < plan.price;
    const discountPercent = hasDiscount
      ? Math.round(((plan.price - customPriceNum) / plan.price) * 100)
      : 0;

    const enabledServices = DEFAULT_ACCOUNTING_SERVICES.filter((_, i) => form.accountingServices[i]);
    const accountingPriceRaw = form.accountingPrice ? parseFloat(form.accountingPrice.replace(/[^0-9.]/g, '')) : 7100;

    const onboardingPkg = ONBOARDING_PACKAGES[form.onboarding];

    const data = {
      companyName: form.companyName,
      contactName: form.contactName,
      date: form.date,
      planName: plan.name,
      planKey: form.plan,
      displayPrice,
      standardPrice: plan.price,
      discountPercent,
      planFeatures: PLAN_FEATURES[form.plan],
      includeAccounting: form.includeAccounting,
      accountingPrice: accountingPriceRaw,
      accountingPriceFormatted: accountingPriceRaw.toLocaleString(),
      accountingServices: enabledServices,
      onboardingKey: form.onboarding,
      onboardingName: onboardingPkg.name,
      onboardingPrice: onboardingPkg.priceLabel,
      onboardingFeatures: ONBOARDING_FEATURES[form.onboarding],
      showAllOnboarding: form.showAllOnboarding,
    };

    setProposalData(data);
  }, [form]);

  const handleDownload = useCallback(() => {
    if (!proposalData) return;
    const html = buildProposalHTML(proposalData);
    const win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 600);
  }, [proposalData]);

  return (
    <div className="flex h-screen font-dm overflow-hidden">
      <Sidebar
        form={form}
        setForm={setForm}
        onGenerate={handleGenerate}
        onDownload={handleDownload}
        hasProposal={!!proposalData}
      />
      <div className="flex-1 bg-ew-bg overflow-y-auto p-8">
        {proposalData ? (
          <ProposalDocument proposalData={proposalData} />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-white shadow-sm flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">📄</span>
              </div>
              <h3 className="text-lg font-semibold text-navy mb-1">No proposal yet</h3>
              <p className="text-ew-muted text-sm">Fill in the details and click Generate</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}