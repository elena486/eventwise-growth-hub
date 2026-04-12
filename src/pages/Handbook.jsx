import React from 'react';
import { ExternalLink } from 'lucide-react';

const HANDBOOK_URL = ''; // Elena to fill in Google Doc URL

function Section({ title, children }) {
  return (
    <div className="mb-8">
      <h2 className="text-sm font-bold text-navy uppercase tracking-wide mb-3 border-b border-ew-border pb-2">{title}</h2>
      {children}
    </div>
  );
}

function Table({ headers, rows }) {
  return (
    <div className="bg-white border border-ew-border rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-ew-footer border-b border-ew-border">
          <tr>
            {headers.map(h => <th key={h} className="text-left text-xs font-semibold text-ew-muted px-4 py-2">{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-ew-border last:border-0">
              {row.map((cell, j) => (
                <td key={j} className={`px-4 py-2.5 text-sm ${j === 0 ? 'font-semibold text-navy' : 'text-ew-body'}`}>
                  {typeof cell === 'string' && cell.startsWith('http') ? (
                    <a href={cell} target="_blank" rel="noreferrer" className="text-navy hover:underline flex items-center gap-1">{cell} <ExternalLink className="w-3 h-3 shrink-0" /></a>
                  ) : cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BulletSection({ title, items }) {
  return (
    <div className="mb-4">
      <p className="text-xs font-bold text-navy uppercase tracking-wide mb-2">{title}</p>
      <ul className="space-y-1">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-ew-body">
            <span className="text-ew-muted mt-1">•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Handbook() {
  return (
    <div className="flex-1 bg-ew-bg overflow-y-auto font-dm">
      <div className="max-w-5xl mx-auto p-8">
        {/* Header + Open Full Handbook */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-navy mb-4">Team Handbook</h1>
          <a
            href={HANDBOOK_URL || '#'}
            target="_blank"
            rel="noreferrer"
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-colors ${HANDBOOK_URL ? 'bg-navy text-white hover:bg-navy/90' : 'bg-ew-bg border border-ew-border text-ew-muted cursor-not-allowed'}`}
          >
            Open Full Handbook → <ExternalLink className="w-4 h-4" />
          </a>
          <p className="text-xs text-ew-muted mt-2">Full handbook lives in Google Docs — use the button above to open it. The key reference info below is a quick-access summary.</p>
        </div>

        {/* Section 1 — Team & Roles */}
        <Section title="1. Team & Roles">
          <Table
            headers={['Name', 'Role', 'Responsibilities']}
            rows={[
              ['Chris Carter', 'CEO', 'Sales, product direction, client relationships, investor comms, CS oversight'],
              ['Elena Brouckaert', 'Head of Ops & Marketing', 'Marketing, reporting, internal tooling, operations, content strategy, proposals'],
              ['Martinique', 'Customer Success', 'Onboarding, client health, renewals, day-to-day client support'],
              ['George', 'SDR', 'Outbound lead generation, prospecting, LinkedIn outreach'],
              ['Ramesh', 'Fractional CRO', 'Sales strategy, pipeline oversight, CRO function (~2 days/week)'],
              ['Sreeja', 'QA', 'Product testing, bug tracking, release validation'],
            ]}
          />
          <p className="text-xs text-ew-muted mt-2">Note: Elena is based in South Africa (SAST, UTC+2). Rest of team UK-based. Account for 2-hour time difference on calls.</p>
        </Section>

        {/* Section 2 — Tech Stack */}
        <Section title="2. Tech Stack">
          <Table
            headers={['Tool', "What it's for", 'Owner', 'Status']}
            rows={[
              ['Eventwise HQ (Base44)', 'Internal ops platform — all modules', 'Elena', 'Active'],
              ['Apollo.io', 'Outbound CRM, sequences, contact database', 'George / Chris', 'Active'],
              ['Framer', 'Website (eventwise.com)', 'Elena', 'Active'],
              ['GitHub Pages (elena486/eventwise-assets)', 'HTML sales deck + client deck embedded in Framer', 'Elena', 'Active'],
              ['GA4 + Google Search Console', 'Website analytics', 'Elena', 'Active'],
              ['Looker Studio', 'Marketing dashboard', 'Elena', 'Active'],
              ['Mailchimp', 'Client newsletter', 'Elena', 'Active'],
              ['Tally', 'Forms (Form ID: q4W2Gg). Replaced Typeform.', 'Elena', 'Active'],
              ['Canva', 'Design assets', 'Elena', 'Active'],
              ['Google Workspace', 'Email, Drive, Docs, Calendar — all team', 'All', 'Active'],
              ['Monday.com', 'Being cancelled — replaced by Apollo + Eventwise HQ', 'Elena', 'Cancelling'],
              ['Notion', 'Being cancelled — replaced by Eventwise HQ + Google Docs', 'Elena', 'Cancelling'],
              ['Typeform', 'Replaced by Tally', 'Elena', 'Cancelled'],
              ['Figma', 'Cancelled — not in use', '—', 'Cancelled'],
            ]}
          />
          <p className="text-xs text-ew-muted mt-2">Credentials are not stored here. See [password manager / secure doc link] for logins.</p>
        </Section>

        {/* Section 3 — Key Assets & Links */}
        <Section title="3. Key Assets & Links">
          <Table
            headers={['Asset', 'Link']}
            rows={[
              ['Website', 'https://eventwise.com'],
              ['Sales Deck', 'https://elena486.github.io/eventwise-assets/eventwise-sales-deck.html'],
              ['Client Retention Deck', 'https://elena486.github.io/eventwise-assets/eventwise-client-deck.html'],
              ['GitHub Repo', 'https://github.com/elena486/eventwise-assets'],
              ['Tally Form', 'https://tally.so/r/q4W2Gg'],
              ['Looker Studio', '[add link]'],
              ['Brand', 'Navy #242450 / Purple #8403C5 / Steel #5777AB / Font: DM Sans'],
            ]}
          />
        </Section>

        {/* Section 4 — Key Processes */}
        <Section title="4. Key Processes">
          <div className="bg-white border border-ew-border rounded-xl p-5 space-y-6">
            <BulletSection title="Sprint Cadence" items={[
              'Weekly updates submitted every Monday by all team via the Sprints tab',
              'Chris reviews CEO dashboard — RAG per person, trend charts, custom date range',
              'Monthly sprint retrospective reviewed by Elena and Chris on their regular call',
            ]} />
            <BulletSection title="Marketing Reporting" items={[
              'Monthly reports built and sent from Marketing > Reporting tab',
              'Sent to Chris by the 5th of each month',
              'Looker Studio dashboard updated monthly as the visual companion',
            ]} />
            <BulletSection title="Sales & Pipeline" items={[
              'Outbound managed in Apollo by George',
              'Active deals tracked in Pipeline tab — when Closed Won, client record auto-created in CS tab',
              'Proposals generated and sent from Proposals tab',
            ]} />
            <BulletSection title="Customer Success & Onboarding" items={[
              'All clients tracked in CS tab — Martinique primary owner',
              '9-step onboarding checklist per client',
              'Health scores reviewed monthly — Red accounts flagged immediately',
              'Renewals auto-flagged 60 days in advance',
            ]} />
            <BulletSection title="Content & LinkedIn" items={[
              'Chris LinkedIn content ghostwritten and scheduled by Elena — target 3–4 posts/month',
              'Content tracked in Marketing > Content Hub tab',
              'Client newsletter monthly via Mailchimp',
            ]} />
            <BulletSection title="Website" items={[
              'Framer for all page edits — Elena owns',
              'HTML decks on GitHub Pages — push to repo to update, no Framer changes needed',
            ]} />
          </div>
        </Section>

        {/* Section 5 — Key External Contacts */}
        <Section title="5. Key External Contacts">
          <Table
            headers={['Name', 'Organisation', 'Context']}
            rows={[
              ['John Rostron', 'CEO, AIF', 'Key industry partner. Target for Festival Congress 2027 sponsorship + Finance Roundtable.'],
              ['Archie Edwards', 'Content / Agency', 'Contact for content shoot days — Eventwise and In The Loop Accounts.'],
            ]}
          />
        </Section>
      </div>
    </div>
  );
}