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