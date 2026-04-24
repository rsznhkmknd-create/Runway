import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { BetaBanner } from '@/components/marketing/beta-banner'
import { MarketingNav } from '@/components/marketing/marketing-nav'
import { HeroSection } from '@/components/marketing/hero-section'
import { FeaturesMarquee } from '@/components/marketing/features-marquee'
import { HowItWorks } from '@/components/marketing/how-it-works'
import { PricingSection } from '@/components/marketing/pricing-section'
import { FinalCTA } from '@/components/marketing/final-cta'
import { MarketingFooter } from '@/components/marketing/marketing-footer'

export default async function HomePage() {
  const { userId } = await auth()
  if (userId) redirect('/dashboard')

  return (
    <main className="min-h-screen bg-[#111827] text-white font-sans antialiased selection:bg-[#00C48C]/30 selection:text-white">
      {/* Sticky top stack: beta banner + nav */}
      <div className="sticky top-0 z-40">
        <BetaBanner />
        <MarketingNav />
      </div>

      <HeroSection />
      <FeaturesMarquee />
      <HowItWorks />
      <PricingSection />
      <FinalCTA />
      <MarketingFooter />
    </main>
  )
}
