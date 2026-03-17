import React from 'react';
import CoverSection from './CoverSection';
import DiscountBanner from './DiscountBanner';
import PricingSection from './PricingSection';
import PlatformFeatures from './PlatformFeatures';
import OnboardingSection from './OnboardingSection';
import KeyTerms from './KeyTerms';
import CTABlock from './CTABlock';
import ProposalFooter from './ProposalFooter';

export default function ProposalDocument({ proposalData }) {
  if (!proposalData) return null;

  return (
    <div id="proposal-document" className="bg-white rounded-xl shadow-xl max-w-[760px] mx-auto overflow-hidden">
      <CoverSection data={proposalData} />
      <DiscountBanner
        discountPercent={proposalData.discountPercent}
        standardPrice={proposalData.standardPrice}
      />
      <PricingSection data={proposalData} />
      <PlatformFeatures />
      <OnboardingSection data={proposalData} />
      <KeyTerms />
      <CTABlock />
      <ProposalFooter />
    </div>
  );
}