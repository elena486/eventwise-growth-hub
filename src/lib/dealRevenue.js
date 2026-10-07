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

/** Returns the updates object to persist when an ARR field changes (includes recalculated total_arr). */
export function arrFieldUpdates(field, value, deal) {
  const numVal = parseFloat(value) || 0;
  const next = { ...deal, [field]: numVal };
  return { [field]: numVal, total_arr: calcTotalArr(next) };
}