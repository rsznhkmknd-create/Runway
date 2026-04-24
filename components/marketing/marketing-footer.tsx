import FinsightLogo from '@/components/ui/FinsightLogo'

export function MarketingFooter() {
  return (
    <footer className="border-t border-white/[0.06] py-10">
      <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <FinsightLogo size={20} />
          <span className="font-semibold text-[13px] text-white">Finsight</span>
        </div>
        <p className="text-[12px] text-white/40 tracking-tight">
          © {new Date().getFullYear()} Finsight · Tu CFO digital
        </p>
      </div>
    </footer>
  )
}
