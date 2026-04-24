import { BlurFade } from './blur-fade'

type Avatar = {
  initials: string
  /** tailwind bg class */
  bg: string
}

const AVATARS: Avatar[] = [
  { initials: 'MR', bg: 'bg-[#00C48C]' },
  { initials: 'JL', bg: 'bg-[#2ed087]' },
  { initials: 'SC', bg: 'bg-[#00a374]' },
]

export function SocialProof() {
  return (
    <div className="inline-flex items-center gap-3">
      <div className="flex -space-x-2">
        {AVATARS.map((a, i) => (
          <div
            key={a.initials}
            className={[
              'relative w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-[#07160E] ring-2 ring-[#111827]',
              a.bg,
            ].join(' ')}
            style={{ zIndex: AVATARS.length - i }}
          >
            {a.initials}
          </div>
        ))}
        {/* +N counter pill */}
        <div className="relative w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold bg-white/[0.06] text-white/70 ring-2 ring-[#111827] border border-white/[0.08]">
          +97
        </div>
      </div>
      <p className="text-[12.5px] text-white/55 leading-tight">
        Únete a los primeros <span className="text-white font-medium">100 founders</span> en LATAM y España
      </p>
    </div>
  )
}
