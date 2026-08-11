// Standardised Topic / Angle options for marketing content items.
// Stored verbatim as the `topicAngle` value when a standard option is chosen.

export const TOPIC_ANGLE_OPTIONS = [
  'Visibility',
  'Overspend',
  'Cashflow',
  'Technology',
  'Product',
  'Customer',
  'Data',
  'Culture',
  'PR',
];

// True when a stored value exactly matches one of the standardised options.
export function isStandardTopic(value) {
  return typeof value === 'string' && TOPIC_ANGLE_OPTIONS.includes(value);
}

// Maps any stored topicAngle value to a standardised bucket for analytics grouping.
// Legacy free-text values collapse into "Other / uncategorised" so the
// best-performing-topics breakdown isn't fragmented by inconsistent past phrasing.
export function standardiseTopic(value) {
  if (!value || !String(value).trim()) return '(No topic)';
  if (isStandardTopic(value)) return value;
  return 'Other / uncategorised';
}

// Builds the prompt used to ask the AI for the single best-matching topic.
// Mapping is intentionally loose — anything that reasonably connects to a
// category should be assigned to it; "Other" is only for genuinely
// unclassifiable posts.
export function buildSuggestPrompt(text) {
  const list = TOPIC_ANGLE_OPTIONS.map((o, i) => `${i + 1}. ${o}`).join('\n');
  return `You are classifying a LinkedIn post for Eventwise (a B2B SaaS for event financial management). Pick the SINGLE best-matching topic/angle from this list, based on what the post is fundamentally ABOUT — its subject matter — NOT its format or structure:

${list}

Map loosely, not strictly. Examples:
- Supplier deposit/payment terms, budget timing, or cash-flow pressure → "Cashflow"
- Spreadsheets, manual processes, or outdated tooling → "Technology"
- A post naming a specific client outcome or story → "Customer"
- A standalone statistic or research finding → "Data"
- Decisions made on old/incomplete information → "Visibility"
- Budget overruns as a structural problem → "Overspend"
- A specific Eventwise capability or product update → "Product"
- Team, hiring, or day-to-day behind-the-scenes → "Culture"
- An award, press feature, or media mention → "PR"

Only return "Other" if the post genuinely does not connect to any of the categories above — not merely because the connection is loose. When in doubt, pick the closest category rather than "Other".

Post text:
"""
${text}
"""

Return ONLY a JSON object with a single key "suggestion" whose value is the exact chosen label from the list above, or "Other".`;
}