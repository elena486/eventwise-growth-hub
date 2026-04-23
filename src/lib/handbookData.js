export const DEFAULT_HANDBOOK = {
  sections: [
    {
      id: 'company', label: '🏢 Company', expanded: true,
      pages: [
        {
          id: 'about', title: 'About Eventwise', type: 'content',
          description: '',
          content: `Eventwise is a UK-based B2B SaaS platform for event financial management. We provide budgeting, approvals, P&L tracking, and accounting integrations for festivals, event organisers, and agencies.\n\nFounded by Chris Carter. Based in the UK. Elena works remotely from South Africa.\n\nWe are currently raising a seed round and are in active growth mode.`,
          updatedAt: '2025-01-01',
        },
        {
          id: 'brand', title: 'Brand Guidelines', type: 'content',
          description: '',
          content: `Colours:\n- Navy: #242450\n- Purple: #8403C5\n- Steel Blue: #5777AB\n- Green: #1D9E75\n- Off-white: #F6F6FB\n\nFont: DM Sans (primary), fallback: Arial\n\nLogo: White version for dark backgrounds, dark version for light backgrounds.\nTone of voice: Direct, warm, honest. Not corporate. Not salesy. Always specific over vague.`,
          updatedAt: '2025-01-01',
        },
        {
          id: 'techstack', title: 'Tech Stack', type: 'content',
          description: '',
          content: `Tool — What it's for — Owner — Status\n\nEventwise HQ (Base44) — Internal ops platform — all modules — Elena — Active\nApollo.io — Outbound CRM, sequences, contact database — George / Chris — Active\nFramer — Website (eventwise.com) — Elena — Active\nGitHub Pages (elena486/eventwise-assets) — HTML sales deck + client deck embedded in Framer — Elena — Active\nGA4 + Google Search Console — Website analytics — Elena — Active\nLooker Studio — Marketing dashboard — Elena — Active\nBeehiiv — Client newsletter (replaced Mailchimp) — Elena — Active\nTally — Forms — Form ID: q4W2Gg. Replaced Typeform. — Elena — Active\nCanva — Design assets — Elena — Active\nGoogle Workspace — Email, Drive, Docs, Calendar — all team — All — Active\nMonday.com — Being cancelled — replaced by Apollo + Eventwise HQ — Elena — Cancelling\nNotion — Being cancelled — replaced by Eventwise HQ + Google Docs — Elena — Cancelling\nTypeform — Replaced by Tally — Elena — Cancelled\nFigma — Cancelled — not in use — — Cancelled`,
          updatedAt: '2025-01-01',
        },
      ],
    },
    {
      id: 'team', label: '👥 Team', expanded: true,
      pages: [
        {
          id: 'team-roles', title: 'Team & Roles', type: 'content',
          description: '',
          content: `Chris Carter — CEO — Sales, product direction, client relationships, investor comms, CS oversight\nElena Brouckaert — Head of Ops & Marketing — Marketing, reporting, internal tooling, operations, content strategy, proposals\nMartinique — Customer Success — Onboarding, client health, renewals, day-to-day client support\nGeorge — SDR — Outbound lead generation, prospecting, LinkedIn outreach\nRamesh — Fractional CRO — Sales strategy, pipeline oversight, CRO function (~2 days/week)\nSreeja — QA — Product testing, bug tracking, release validation\nDavid — CFO — Financial oversight, investor reporting, board management, funding round management\n\n⏰ Note: Elena is based in South Africa (SAST, UTC+2). Rest of team UK-based. Account for 2-hour time difference on calls.`,
          updatedAt: '2025-01-01',
        },
        {
          id: 'contacts', title: 'Key Contacts', type: 'content',
          description: '',
          content: `John Rostron — CEO, AIF (Association of Independent Festivals) — john@aiforg.com\nContext: Key industry partner. Target for Festival Congress 2027 sponsorship + Finance Roundtable.\n\nArchie Edwards — Content / Agency\nContext: Contact for content shoot days — Eventwise and In The Loop Accounts.`,
          updatedAt: '2025-01-01',
        },
        {
          id: 'timeoff', title: 'Holiday & Time Off', type: 'link',
          description: 'Time off requests and records are managed in the HR section of Operations.',
          links: [
            { id: 1, label: 'Go to HR →', url: 'internal:hr', note: '' },
          ],
          updatedAt: '2025-01-01',
        },
      ],
    },
    {
      id: 'hr-people', label: '👤 HR & People', expanded: true,
      pages: [
        {
          id: 'employee-handbook', title: 'Employee Handbook', type: 'content',
          description: 'Full company policies, benefits, and employment terms.',
          content: `<h2>Introduction</h2>
<p>Welcome to Eventwise. This handbook covers our company policies, procedures, and benefits. While it covers many topics, it may not address every situation — reach out to Elena or Chris with any questions.</p>

<h2>Core Values</h2>
<p><strong>Innovation</strong> — We constantly seek new ways to improve our software and services.<br/><strong>Efficiency</strong> — We strive to streamline event management processes for our clients.<br/><strong>Collaboration</strong> — We believe in the power of teamwork, both internally and for our clients.<br/><strong>Client-Centric</strong> — Our clients' success is our success.<br/><strong>Adaptability</strong> — We help our clients prepare for every possible scenario.</p>

<h2>Employment Basics</h2>
<p><strong>Employment types:</strong> Full-time (40hrs/week), Part-time (under 40hrs/week), Temporary/Freelance/Contracted.</p>
<p><strong>Probationary period:</strong> 6 months for all new employees. Performance closely monitored — period may be extended.</p>
<p><strong>Work hours:</strong> Monday to Friday, 9:00 AM – 5:00 PM. Flexible schedules available depending on role.</p>
<p><strong>Pay:</strong> Monthly via bank transfer on the last day of the month. Payslip provided detailing tax, pension, and NI contributions.</p>
<p><strong>Contracted/Freelance:</strong> Paid monthly on receipt of a correct invoice at the agreed amount.</p>

<h2>Employee Benefits</h2>
<p><strong>Pension:</strong> Statutory contribution of 3% of salary.</p>
<p><strong>Flexible work hours:</strong> Available upon management approval. Employees may work extra hours during the week to take a half day on Friday or Monday, provided work is up to date and performance is excellent. Not a contractual change. Flexible Working Application form available from HR for any other flexibility requests.</p>
<p><strong>Paid Time Off (PTO):</strong></p>
<ul>
<li>Vacation: 25 days per year, accrued monthly, plus England and Wales Bank Holidays.</li>
<li>Everyone must take the Christmas/New Year office closure period from their 25 days.</li>
<li>Holidays cannot be taken within 2 weeks before or after a festival an employee is working on, except with management approval.</li>
<li>Personal days: Birthday day off (1 day/year) + 3 volunteering days annually.</li>
</ul>
<p><strong>Volunteering day conditions:</strong> Proposal must be submitted to management before activities; funding requests considered case-by-case; must be scheduled October–March; all proposals approved before proceeding.</p>
<p><strong>Professional development:</strong> Reimbursement available for job-related courses and certifications. Prior management approval required before enrolling.</p>

<h2>Workplace Policies</h2>
<p><strong>Code of Conduct:</strong> All employees must conduct themselves professionally, ethically, and respectfully. We are committed to equal opportunities and a workplace free from discrimination on any protected characteristic. Harassment and bullying are disciplinary offences treated as gross misconduct.</p>
<p><strong>Dress Code:</strong> Business casual. Professional attire when meeting clients or attending events.</p>
<p><strong>Confidentiality:</strong> All employees must sign an NDA and comply with data protection policies. Data protection training is mandatory when requested.</p>
<p><strong>Social Media:</strong> Use good judgment. Do not share confidential information or speak negatively about the company or clients. Remove references to working here when you leave.</p>
<p><strong>Conflict of Interest:</strong> Disclose any situations where personal interests may conflict with company interests.</p>

<h2>Leave Policies</h2>
<p><strong>Bank Holidays (8 per year):</strong> New Year's Day, Good Friday, Easter Monday, Early May bank holiday, Spring bank holiday, Summer bank holiday, Christmas Day, Boxing Day.</p>
<p><strong>Maternity Leave:</strong> 12 months total. Statutory maternity leave and pay per current UK regulations.</p>
<p><strong>Paternity Leave:</strong> Statutory paternity leave and pay per current UK regulations.</p>
<p><strong>Shared Parental Leave:</strong> Eligible parents/adopters can share childcare during the first year of birth or adoption.</p>
<p><strong>Parental Leave:</strong> Up to 18 weeks unpaid leave to care for a child up to age 18, based on statutory entitlements.</p>
<p><strong>Bereavement Leave:</strong> Up to 5 days paid leave for immediate family members. Additional Parental Bereavement Leave per statutory criteria.</p>
<p><strong>Unpaid Carer's Leave:</strong> Up to one week unpaid to care for a dependant with a long-term care need.</p>

<h2>Sickness Absence</h2>
<p><strong>Reporting:</strong> Notify your line manager on the first day of absence before your normal start time. Provide: nature of illness, expected length, contact details, any urgent work needing attention. A fit note from your GP is required after 7 calendar days.</p>
<p><strong>Sick Pay:</strong> Statutory Sick Pay (SSP) if off for 4+ days in a row. SSP payable for up to 28 weeks. Must earn average of at least £123/week to qualify (2023/2024 rate).</p>
<p><strong>Return to Work:</strong> Inform manager of return date as soon as possible. Return-to-work interview required. Fit note required for absences over 7 days.</p>
<p><strong>Long-term absence:</strong> Defined as over 4 weeks. May involve occupational health assessment, reasonable adjustments, or phased return.</p>
<p><strong>Frequent short-term absences:</strong> Reviewed if: 3+ instances in a rolling 3 months, 5+ instances in a rolling 12 months, or a noticeable pattern (e.g. always Mondays/Fridays). Reviews aim to understand causes and offer support — not punitive by default.</p>

<h2>Performance Management</h2>
<p><strong>Formal reviews:</strong> Every 12 months with informal check-ins quarterly.</p>
<p><strong>Goal setting:</strong> Individual and team goals set with managers, aligned to company objectives.</p>
<p><strong>Development plans:</strong> Each employee has a personalised development plan.</p>

<h2>Health and Safety</h2>
<p><strong>Safety:</strong> Follow all safety protocols and report hazards immediately.</p>
<p><strong>Alcohol & Drugs:</strong> Not permitted during working hours or on company premises. At business/client social functions outside work, moderate drinking is expected — consuming drugs on any such occasion is strictly forbidden.</p>
<p><strong>Emergency procedures:</strong> Evacuation routes and assembly points posted throughout the office. Read the office welcome pack and procedures.</p>
<p><strong>Accidents or injuries:</strong> Report immediately to manager and HR. Submit the accident/injury form: <a href="https://forms.gle/1ox6KDeME94JCCPE6">https://forms.gle/1ox6KDeME94JCCPE6</a></p>

<h2>IT and Communication</h2>
<p><strong>Company equipment:</strong> Laptop and phone provided for business use. Limited personal use permitted. Look after equipment carefully — damage, loss, or theft may result in deductions from final pay. All equipment must be returned on the last day of employment.</p>
<p><strong>Email:</strong> Primarily for business purposes. All communications may be monitored.</p>
<p><strong>Software:</strong> Only approved software may be installed on company devices.</p>

<h2>Travel and Expenses</h2>
<p>All business travel must be approved in advance. Choose cost-effective options and obtain VAT receipts where possible.</p>
<p><strong>Expense reporting:</strong> Submit with valid receipts within 30 days to chris@eventwise.com and david@eventwise.com. Reimbursement within 2 weeks, included in monthly salary.</p>

<h2>Disciplinary Procedures</h2>
<p><strong>Progressive discipline:</strong> Verbal warning → Written warning → Final written warning → Termination. All matters investigated before formal hearing. 48 hours' advance notice of any disciplinary hearing. Employees have the right to be accompanied by a colleague or Trade Union Rep. Verbal warnings live for 6 months; written warnings for 12 months. Gross misconduct (e.g. theft, fraud, violence, serious data breach) may result in summary dismissal without notice.</p>
<p><strong>Grievance:</strong> Raise with your immediate supervisor first. Escalate to HR or management if unresolved. Do not use the grievance process for disciplinary appeals.</p>
<p><strong>Whistleblowing:</strong> Report concerns about underhand or illegal practices to your supervisor or HR directly. All disclosures handled in confidence.</p>

<h2>Termination</h2>
<p><strong>Resignation:</strong> Provide at least one month's written notice to your manager, unless contract states otherwise.</p>
<p><strong>Exit interview:</strong> All departing employees invited to participate.</p>
<p><strong>Return of property:</strong> All company property must be returned on or before the last day.</p>

<h2>Event-Specific Policies</h2>
<p><strong>On-site behaviour:</strong> Maintain professional behaviour at all times when representing Eventwise at events.</p>
<p><strong>Client interaction:</strong> Always be courteous, responsive, and solution-oriented.</p>
<p><strong>Event safety:</strong> Familiarise yourself with venue-specific safety procedures for each event.</p>

<h2>Software and Training</h2>
<p>All employees should be familiar with Eventwise platform features. Regular training sessions provided. Training resources and support documentation available in Eventwise Wiki (accessible via Eventwise HQ top navigation).</p>

<h2>Sustainability</h2>
<p>We encourage sustainable practices in our operations and client events. Suggestions for improving our environmental impact are welcome. Employees are encouraged to participate in company-sponsored volunteering activities.</p>`,
          updatedAt: '2026-04-23',
        },
        {
          id: 'employee-onboarding-checklist', title: 'Employee Onboarding Checklist', type: 'content',
          description: 'Standard checklist for all new team members joining Eventwise.',
          content: `<h2>👋 Welcome to the team!</h2>
<p>Use this checklist when you join. Your onboarding buddies are <strong>Chris Carter</strong> and <strong>Elena Brouckaert</strong> — reach out to either of us if you need anything.</p>

<h2>Day 1</h2>
<ul>
<li>☐ Read your onboarding deck</li>
<li>☐ Set up your hardware and software</li>
<li>☐ Get access to: Eventwise HQ (your main ops platform) / Google Workspace (email, Drive, Calendar) / Relevant Google Chat channels / Eventwise platform / Apollo (Sales team only)</li>
<li>☐ Meet Chris and Elena — intro call on your first day</li>
<li>☐ Go through Brand Guidelines (Eventwise Wiki → Company → Brand Guidelines)</li>
</ul>

<h2>First Week</h2>
<ul>
<li>☐ Read the Employee Handbook (Eventwise Wiki → HR & People → Employee Handbook)</li>
<li>☐ Fill out your employee profile</li>
<li>☐ Sign the NDA</li>
<li>☐ Learn about your role, first project, and objectives — speak to your manager</li>
<li>☐ Read security and data privacy guidelines</li>
<li>☐ Familiarise yourself with the Eventwise platform (you're selling/supporting it — know it)</li>
</ul>

<h2>First Month</h2>
<ul>
<li>☐ Submit your first weekly sprint update (every Monday via Eventwise HQ → Sprints tab)</li>
<li>☐ Complete any role-specific training or onboarding as discussed with your manager</li>
</ul>

<h2>Useful Links</h2>
<p><em>All live in Eventwise Wiki:</em></p>
<ul>
<li>Company info and values: Wiki → Company → About Eventwise</li>
<li>Tech stack: Wiki → Company → Tech Stack</li>
<li>Team and contacts: Wiki → Team → Team & Roles</li>
<li>Time off requests: Eventwise HQ → Operations → HR</li>
<li>Submit a request to Elena: Eventwise HQ → Operations → Requests</li>
</ul>
<p><em>Note to Elena: Update the new hire's name, role, and any role-specific access items before sharing this checklist with them.</em></p>`,
          updatedAt: '2026-04-23',
        },
        {
          id: 'important-contacts', title: 'Important Contacts', type: 'content',
          description: 'Key internal and external contacts for HR, IT, and support.',
          content: `<h2>HR Department</h2>
<p><strong>Chris Carter</strong> — chris@eventwise.com — +447747568996<br/><strong>Elena Brouckaert</strong> — elena@eventwise.com — +447445319847</p>

<h2>IT and Tech Support</h2>
<p><strong>General IT:</strong> Chris Carter — chris@eventwise.com — +447747568996<br/><strong>Websites:</strong> Justice Annan — justide14@gmail.com<br/><strong>Software development:</strong> Matt Hadfield (Senior Software Developer, Synergitech) — matt@synergitech.co.uk</p>

<h2>Forms and Documents</h2>
<ul>
<li><strong>Accident or Injury Form:</strong> <a href="https://forms.gle/1ox6KDeME94JCCPE6">https://forms.gle/1ox6KDeME94JCCPE6</a></li>
<li><strong>Professional Development Plan Template:</strong> <a href="https://docs.google.com/document/d/1NvYgDhppKOaHp3wKf7cyswQkiUFkWMiG7sD7f2QK6u0/edit">Open in Google Docs</a></li>
<li><strong>Expense Report Template:</strong> [add link]</li>
<li><strong>Software Training Material:</strong> [add link]</li>
</ul>`,
          updatedAt: '2026-04-23',
        },
      ],
    },
    {
      id: 'sales', label: '💼 Sales', expanded: false,
      pages: [
        {
          id: 'sales-process', title: 'Sales Process', type: 'link',
          description: 'Our end-to-end sales process from lead to close.',
          links: [
            { id: 1, label: 'Sales Process Flowchart (PDF)', url: 'https://eventwise-company.monday.com/protected_static/30452037/resources/148396224/Flowchart.pdf', note: '⚠️ Download this PDF before Monday is cancelled — this file will break when Monday is cancelled.' },
          ],
          updatedAt: '2025-01-01',
        },
        {
          id: 'icp', title: 'ICP & Lead Scoring', type: 'link',
          description: 'Ideal Customer Profile definition and MQL to SQL scoring criteria.',
          links: [
            { id: 1, label: 'MQL to SQL Handover Process (PDF)', url: 'https://eventwise-company.monday.com/protected_static/30452037/resources/146558472/MQL-to-SQL-Handover-Process.pdf', note: '⚠️ Download this PDF before Monday is cancelled.' },
            { id: 2, label: 'Add Google Doc link here', url: '', note: '' },
          ],
          updatedAt: '2025-01-01',
        },
        {
          id: 'sales-assets', title: 'Sales Assets', type: 'link',
          description: 'All sales collateral — videos, one-pagers, decks, tools — lives in the Sales tab.',
          links: [
            { id: 1, label: 'Go to Sales Assets →', url: 'internal:assets', note: '' },
          ],
          updatedAt: '2025-01-01',
        },
        {
          id: 'proposals', title: 'Proposals', type: 'link',
          description: 'Proposals are generated and managed in the Sales tab.',
          links: [
            { id: 1, label: 'Go to Proposals →', url: 'internal:proposal', note: '' },
          ],
          updatedAt: '2025-01-01',
        },
        {
          id: 'competitors-link', title: 'Competitor Intelligence', type: 'link',
          description: 'Full competitor analysis lives in the Operations tab.',
          links: [
            { id: 1, label: 'Go to Competitors →', url: 'internal:competitors', note: '' },
          ],
          updatedAt: '2025-01-01',
        },
      ],
    },
    {
      id: 'cs', label: '🎯 Customer Success', expanded: false,
      pages: [
        {
          id: 'cs-overview', title: 'CS Overview & Processes', type: 'content',
          description: '',
          content: `All active clients are tracked in the Customer Success tab — Martinique is primary owner.\n\nKey processes:\n- New clients go through a 9-step onboarding checklist tracked per client in the Onboarding view\n- Health scores reviewed monthly — Red accounts flagged immediately\n- Renewal dates auto-flagged 60 days in advance\n- "No Reply" button available on client records to log unanswered outreach — explains to Chris why health scores may not be improving`,
          updatedAt: '2025-01-01',
        },
        {
          id: 'health-guide', title: 'Health Scoring Guide', type: 'link',
          description: "Martinique's communication strategy and health score action guide — what to do when each score is low.",
          links: [
            { id: 1, label: 'Open Health Scoring Guide →', url: '', note: "Upload Martinique's CS communication strategy PDF here once available." },
          ],
          updatedAt: '2025-01-01',
        },
        {
          id: 'onboarding-process', title: 'Onboarding Process', type: 'content',
          description: '',
          content: `Standard onboarding has 4 phases:\n\nPhase 1 — Foundation: Kick-off call, budget processes mapped, approval workflows mapped, account categories configured, account set up reviewed and signed off.\n\nPhase 2 — Configuration: Xero connected, ticket sellers connected, first budget uploaded, integrations tested.\n\nPhase 3 — Enablement: Team roles mapped to Eventwise, training programme built, live training session completed, post-training drop-in done.\n\nPhase 4 — Launch: Final system checks, go-live confirmed, dedicated support call booked, monthly check-in scheduled.`,
          updatedAt: '2025-01-01',
        },
        {
          id: 'client-guides', title: 'Client User Guides', type: 'link',
          description: 'Platform guides for clients — to be built out as Eventwise develops.',
          links: [
            { id: 1, label: 'Budget Creation User Guide', url: '', note: '' },
            { id: 2, label: 'Event Creation User Guide', url: '', note: '' },
            { id: 3, label: 'Purchasing User Guide', url: '', note: '' },
            { id: 4, label: 'Ticketing & Revenue User Guide', url: '', note: '' },
            { id: 5, label: 'Reporting — Budget vs Actuals Guide', url: '', note: '' },
            { id: 6, label: 'Organisation Dashboard Features', url: '', note: '' },
          ],
          updatedAt: '2025-01-01',
          footerNote: 'These guides are currently being developed. Add Google Doc or PDF links as each guide is completed.',
        },
      ],
    },
    {
      id: 'marketing', label: '📣 Marketing', expanded: false,
      pages: [
        {
          id: 'marketing-overview', title: 'Marketing Overview', type: 'content',
          description: '',
          content: `Monthly reports produced by Elena covering: Website (GA4), Chris LinkedIn, Eventwise LinkedIn, Newsletter.\nReports built and sent from Marketing > Reporting tab — sent to Chris by the 5th of each month.\nContent tracked in Marketing > Content Hub tab.\nChris LinkedIn content ghostwritten and scheduled by Elena — target 3–4 posts/month.\nNewsletter sent monthly via Beehiiv.`,
          updatedAt: '2025-01-01',
        },
        {
          id: 'linkedin-strategy', title: 'LinkedIn Strategy', type: 'link',
          description: "Chris's LinkedIn content strategy, voice guidelines, and content pillars.",
          links: [
            { id: 1, label: 'Open LinkedIn Content Strategy →', url: '', note: '' },
          ],
          updatedAt: '2025-01-01',
        },
        {
          id: 'aif', title: 'AIF / Festival Congress', type: 'content',
          description: '',
          content: `Target: Sponsor the morning coffee slot at Festival Congress 2027 and host a Finance Roundtable session.\nKey contact: John Rostron, CEO of AIF (john@aiforg.com).\nStatus: Proposal in development. Elena managing outreach.`,
          updatedAt: '2025-01-01',
        },
        {
          id: 'survey', title: 'Industry Research Survey', type: 'content',
          description: '',
          content: `"The State of Event Finance in the UK 2026" — industry research survey planned as a lead magnet and PR asset.\nStatus: In planning. Add survey link here when live.`,
          updatedAt: '2025-01-01',
        },
      ],
    },
    {
      id: 'operations', label: '⚙️ Operations', expanded: false,
      pages: [
        {
          id: 'sprints', title: 'Sprint Cadence', type: 'content',
          description: '',
          content: `Sprints run monthly. Weekly updates submitted every Monday by all team via the Sprints tab.\nChris reviews the CEO dashboard — RAG per person, trend charts, custom date range.\nSprint retrospective reviewed by Elena and Chris on their regular call at end of each month.`,
          updatedAt: '2025-01-01',
        },
        {
          id: 'website-tech', title: 'Website & Tech', type: 'content',
          description: '',
          content: `Website: eventwise.com — hosted on Framer. Elena owns all page edits.\nHTML marketing assets (sales deck, client deck) hosted on GitHub Pages — push to repo to update, no Framer changes needed.\nRepo: https://github.com/elena486/eventwise-assets\nPost any content changes to GA4 as annotations so traffic changes can be explained in monthly reports.`,
          updatedAt: '2025-01-01',
        },
        {
          id: 'qa', title: 'QA Process', type: 'link',
          description: 'QA testing, bug tracking, and release processes — owned by Sreeja.',
          links: [
            { id: 1, label: 'Go to Bug Tracker →', url: 'internal:bugs', note: 'QA daily testing and releases boards currently still on Monday.com — pending migration to a dedicated QA tool. Discuss with Sreeja before cancelling Monday.' },
          ],
          updatedAt: '2025-01-01',
        },
      ],
    },
    {
      id: 'links', label: '🔗 Links & Assets', expanded: false,
      pages: [
        {
          id: 'key-links', title: 'Key Links', type: 'content',
          description: '',
          content: `Website — https://eventwise.com\nSales Deck — https://elena486.github.io/eventwise-assets/eventwise-sales-deck.html\nClient Retention Deck — https://elena486.github.io/eventwise-assets/eventwise-client-deck.html\nGitHub Repo — https://github.com/elena486/eventwise-assets\nTally Form — https://tally.so/r/q4W2Gg\nLooker Studio — (add link)\nBrand constants — Navy #242450 / Purple #8403C5 / Steel #5777AB / Font: DM Sans`,
          updatedAt: '2025-01-01',
        },
        {
          id: 'google-handbook', title: 'Google Doc Handbook', type: 'link',
          description: 'The full company handbook also exists as a Google Doc for sharing externally or printing.',
          links: [
            { id: 1, label: 'Open Full Handbook (Google Doc) →', url: '', note: '' },
          ],
          updatedAt: '2025-01-01',
        },
      ],
    },
    {
      id: 'templates', label: '📋 Templates', expanded: false,
      pages: [
        {
          id: 'templates-lib', title: 'Templates Library', type: 'link',
          description: 'Reusable templates for proposals, emails, onboarding docs, and more.',
          links: [
            { id: 1, label: 'Subscription Proposal Template', url: '', note: '' },
            { id: 2, label: 'Budget Template (Excel — Ungated)', url: 'https://docs.google.com/spreadsheets/d/1v_IIVick-InHSlf_9aJEsGmyYPgVr1OznylKZ-sR830/edit', note: '' },
            { id: 3, label: 'Budget Template (Excel — Gated/Gumroad)', url: 'https://gumroad.com/products/byabo/edit', note: '' },
            { id: 4, label: 'Event Budget Control Guide', url: 'https://www.canva.com/design/DAG1S6DDXWE/3KE8H45g3ocdcoAp-si5Eg/view', note: '' },
          ],
          updatedAt: '2025-01-01',
          allowAddLinks: true,
        },
      ],
    },
  ],
};

export const INTERNAL_NAV = {
  'internal:hr': { tab: 'hr', label: 'Operations → Time Off Requests' },
  'internal:assets': { tab: 'assets', label: 'Sales → Assets' },
  'internal:proposal': { tab: 'proposal', label: 'Sales → Proposals' },
  'internal:competitors': { tab: 'competitors', label: 'Operations → Competitors' },
  'internal:bugs': { tab: 'bugs', label: 'Customer Success → Bug Tracker' },
};