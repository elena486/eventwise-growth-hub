// Standardised Topic / Angle options for marketing content items.
// Stored verbatim as the `topicAngle` value when a standard option is chosen.

export const TOPIC_ANGLE_OPTIONS = [
  'The Visibility Gap — decisions made on old/incomplete information',
  'Late Information Is Useless — timing of data, not just accuracy',
  'The 90% Overspend Norm — budget overruns as structural, not personal failure',
  'Supplier Terms Inversion — deposit/payment terms squeezing cash flow',
  'The DIY Finance Director — solo founders doing the CFO job untrained',
  'Industry Behind on Technology — spreadsheets vs. proper infrastructure',
  'Product Feature — a specific Eventwise capability or update',
  'Customer Story / Case Study — a named or anonymised client outcome',
  'Industry Data / Stat — a standalone statistic or research finding',
  'Company Culture / Behind the Scenes — team, hiring, day-to-day',
  'PR / Press Coverage — award, feature, or press mention',
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
export function buildSuggestPrompt(text) {
  const list = TOPIC_ANGLE_OPTIONS.map((o, i) => `${i + 1}. ${o}`).join('\n');
  return `You are classifying a LinkedIn post for Eventwise (a B2B SaaS for event financial management). Pick the SINGLE best-matching topic/angle from this list, based on what the post is fundamentally ABOUT — its subject matter — NOT its format or structure. For example, don't pick "Industry Data / Stat" merely because a number appears; pick it only if the post's purpose is to highlight a standalone statistic or research finding.

${list}

If the post does not clearly map to any of the themes above, return "Other" rather than forcing a weak match.

Post text:
"""
${text}
"""

Return ONLY a JSON object with a single key "suggestion" whose value is the exact chosen label from the list above, or "Other".`;
}