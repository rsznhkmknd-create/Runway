import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { MarketingNav } from '@/components/marketing/marketing-nav'
import { HeroSection } from '@/components/marketing/hero-section'
import { FeaturesMarquee } from '@/components/marketing/features-marquee'
import { PricingSection } from '@/components/marketing/pricing-section'
import { FinalCTA } from '@/components/marketing/final-cta'
import { MarketingFooter } from '@/components/marketing/marketing-footer'

export default async function HomePage() {
  const { userId } = await auth()
  if (userId) redirect('/dashboard')

  return (
    <main className="min-h-screen bg-[#111827] text-white font-sans antialiased selection:bg-[#00C48C]/30 selection:text-white">
      <MarketingNav />
      <HeroSection />
      <FeaturesMarquee />
      <PricingSection />
      <FinalCTA />
      <MarketingFooter />
    </main>
  )
}
