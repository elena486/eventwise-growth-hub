/**
 * Revenue breakdown helpers for the Deal entity.
 *
 * New ARR fields: software_arr, services_arr, onboarding_fee, total_arr
 * Legacy fields: monthlyValue, annualValue, totalFirstYearValue, onboardingFee, accountingServiceValue
 *
 * total_arr = software_arr + services_arr (onboarding_fee is NEVER included).
 * Where new fields are empty, callers fall back to legacy values so nothing breaks.
 */

/** True if the deal has any of the new ARR fields populated (non-zero). */
export function hasNewRevenueFields(deal) {
  if (!deal) return false;
  return (deal.software_arr || 0) > 0 || (deal.services_arr || 0) > 0;
}

/** total_arr = software_arr + services_arr (empty = 0). Onboarding fee excluded. */
export function calcTotalArr(deal) {
  if (!deal) return 0;
  return (deal.software_arr || 0) + (deal.services_arr || 0);
}

/**
 * Effective ARR: total_arr if the new fields are populated, otherwise legacy
 * annualValue (or monthlyValue * 12).
 */
export function getEffectiveArr(deal) {
  if (!deal) return 0;
  if (hasNewRevenueFields(deal)) return calcTotalArr(deal);
  return deal.annualValue || (deal.monthlyValue || 0) * 12;
}

/** Effective monthly: total_arr / 12 if new fields exist, otherwise legacy monthlyValue. */
export function getEffectiveMrr(deal) {
  if (!deal) return 0;
  if (hasNewRevenueFields(deal)) return calcTotalArr(deal) / 12;
  return deal.monthlyValue || 0;
}

/** Effective onboarding fee: onboarding_fee if populated, otherwise legacy onboardingFee. */
export function getEffectiveOnboardingFee(deal) {
  if (!deal) return 0;
  return deal.onboarding_fee || deal.onboardingFee || 0;
}

/** Effective ARR for a Lead: total_arr if new fields populated, otherwise legacy dealValueMonthly * 12. */
export function getEffectiveLeadArr(lead) {
  if (!lead) return 0;
  const arr = (lead.software_arr || 0) + (lead.services_arr || 0);
  if (arr > 0) return arr;
  return (lead.dealValueMonthly || 0) * 12;
}

/** Returns the updates object to persist when an ARR field changes (includes recalculated total_arr). */
export function arrFieldUpdates(field, value, deal) {
  const numVal = parseFloat(value) || 0;
  const next = { ...deal, [field]: numVal };
  return { [field]: numVal, total_arr: calcTotalArr(next) };
}

/**
 * Compute aggregate revenue metrics for a list of records (leads or deals).
 * getEffectiveArrFn is getEffectiveArr for deals, getEffectiveLeadArr for leads.
 * Returns totals, averages, services share, and a count of records missing
 * the new ARR breakdown (so callers can flag legacy fallback usage).
 */
export function computeRevenueMetrics(records, getEffectiveArrFn) {
  const numRecords = records.length;
  let totalSoftware = 0, totalServices = 0, totalArr = 0, totalOnboarding = 0, missingBreakdown = 0;
  for (const r of records) {
    totalSoftware += (r.software_arr || 0);
    totalServices += (r.services_arr || 0);
    totalArr += getEffectiveArrFn(r);
    totalOnboarding += (r.onboarding_fee || r.onboardingFee || 0);
    if (!hasNewRevenueFields(r)) missingBreakdown++;
  }
  const avgArr = numRecords > 0 ? totalArr / numRecords : 0;
  const servicesShare = totalArr > 0 ? (totalServices / totalArr) * 100 : null;
  return { numRecords, totalSoftware, totalServices, totalArr, totalOnboarding, missingBreakdown, avgArr, servicesShare };
}