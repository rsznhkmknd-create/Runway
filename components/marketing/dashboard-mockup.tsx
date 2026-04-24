'use client'

/**
 * Abstract, dataless dashboard mockup. Pure geometry in navy/mint.
 * Floats softly to feel alive without being distracting.
 */
export function DashboardMockup() {
  return (
    <div className="relative w-full max-w-[920px] mx-auto">
      {/* float animation keyframe */}
      <style jsx>{`
        @keyframes fs-float-a { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
        @keyframes fs-float-b { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
        @keyframes fs-float-c { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
        @keyframes fs-pulse    { 0%,100% { opacity: 0.55; } 50% { opacity: 1; } }
        .fs-float-a { animation: fs-float-a 6s ease-in-out infinite; }
        .fs-float-b { animation: fs-float-b 7.5s ease-in-out infinite; animation-delay: .6s; }
        .fs-float-c { animation: fs-float-c 8s ease-in-out infinite; animation-delay: 1.1s; }
        .fs-pulse    { animation: fs-pulse 2.4s ease-in-out infinite; }
      `}</style>

      {/* Ambient glow behind the mockup */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-10 rounded-[40px]"
        style={{
          background:
            'radial-gradient(ellipse at center, rgba(0,196,140,0.10), transparent 60%)',
        }}
      />

      <div className="relative rounded-2xl border border-white/[0.07] bg-gradient-to-b from-white/[0.035] to-white/[0.015] p-5 sm:p-7 backdrop-blur-sm shadow-[0_30px_80px_-30px_rgba(0,0,0,0.6)]">
        {/* Fake window chrome */}
        <div className="flex items-center gap-1.5 mb-5">
          <span className="w-2.5 h-2.5 rounded-full bg-white/[0.08]" />
          <span className="w-2.5 h-2.5 rounded-full bg-white/[0.08]" />
          <span className="w-2.5 h-2.5 rounded-full bg-white/[0.08]" />
          <div className="ml-4 h-5 w-32 rounded-md bg-white/[0.04]" />
          <div className="ml-auto flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-full bg-[#00C48C]/15 border border-[#00C48C]/25 px-2 py-0.5 text-[10px] font-semibold text-[#00C48C]">
              <span className="w-1 h-1 rounded-full bg-[#00C48C] fs-pulse" />
              live
            </span>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-4">
          {/* Left rail — abstract sidebar */}
          <div className="col-span-3 hidden sm:flex flex-col gap-2">
            <div className="h-6 w-16 rounded-md bg-[#00C48C]/15 border border-[#00C48C]/25" />
            {[0.7, 0.55, 0.45, 0.6, 0.4].map((w, i) => (
              <div
                key={i}
                className="h-2.5 rounded-full bg-white/[0.06]"
                style={{ width: `${w * 100}%` }}
              />
            ))}
          </div>

          {/* Main area */}
          <div className="col-span-12 sm:col-span-9 space-y-4">
            {/* KPI row */}
            <div className="grid grid-cols-3 gap-3">
              {/* Runway card — mint accent */}
              <div className="fs-float-a rounded-xl border border-[#00C48C]/25 bg-[#00C48C]/[0.06] p-3">
                <div className="h-1.5 w-10 rounded-full bg-[#00C48C]/40 mb-2" />
                <div className="h-5 w-14 rounded-md bg-[#00C48C]/70" />
                <div className="mt-2.5 h-1 w-full rounded-full bg-white/[0.05] overflow-hidden">
                  <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-[#00C48C] to-[#2ed087]" />
                </div>
              </div>
              {/* Burn card */}
              <div className="fs-float-b rounded-xl border border-white/[0.07] bg-white/[0.03] p-3">
                <div className="h-1.5 w-12 rounded-full bg-white/15 mb-2" />
                <div className="h-5 w-16 rounded-md bg-white/25" />
                <div className="mt-2.5 flex gap-0.5 items-end h-5">
                  {[0.4, 0.6, 0.45, 0.7, 0.55, 0.8].map((h, i) => (
                    <div
                      key={i}
                      className="flex-1 rounded-sm bg-white/[0.12]"
                      style={{ height: `${h * 100}%` }}
                    />
                  ))}
                </div>
              </div>
              {/* Receivables */}
              <div className="fs-float-c rounded-xl border border-white/[0.07] bg-white/[0.03] p-3">
                <div className="h-1.5 w-10 rounded-full bg-white/15 mb-2" />
                <div className="h-5 w-12 rounded-md bg-white/25" />
                <div className="mt-2.5 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00C48C]" />
                  <div className="h-1 w-10 rounded-full bg-white/10" />
                </div>
              </div>
            </div>

            {/* Chart area — abstract line */}
            <div className="fs-float-a rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="h-2 w-20 rounded-full bg-white/12" />
                <div className="flex gap-1.5">
                  <div className="h-4 w-10 rounded-md bg-white/[0.06]" />
                  <div className="h-4 w-10 rounded-md bg-[#00C48C]/20 border border-[#00C48C]/25" />
                </div>
              </div>
              {/* Abstract SVG line chart */}
              <svg viewBox="0 0 400 80" className="w-full h-16" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="fs-mockup-grad" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#00C48C" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#00C48C" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path
                  d="M0,55 C40,50 60,30 100,35 C140,40 160,60 200,50 C240,40 260,20 300,25 C340,30 360,15 400,20 L400,80 L0,80 Z"
                  fill="url(#fs-mockup-grad)"
                />
                <path
                  d="M0,55 C40,50 60,30 100,35 C140,40 160,60 200,50 C240,40 260,20 300,25 C340,30 360,15 400,20"
                  fill="none"
                  stroke="#00C48C"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
                {/* endpoint dot */}
                <circle cx="400" cy="20" r="2.5" fill="#00C48C" />
                <circle cx="400" cy="20" r="5" fill="#00C48C" opacity="0.25" />
              </svg>
              {/* x-axis ticks */}
              <div className="mt-2 flex justify-between">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-1 w-4 rounded-full bg-white/[0.06]" />
                ))}
              </div>
            </div>

            {/* Two-column bottom */}
            <div className="grid grid-cols-2 gap-3">
              <div className="fs-float-b rounded-xl border border-white/[0.07] bg-white/[0.02] p-3 space-y-2">
                {[0.8, 0.65, 0.5, 0.7].map((w, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-1 h-1 rounded-full bg-[#00C48C]" />
                    <div
                      className="h-1.5 rounded-full bg-white/[0.08]"
                      style={{ width: `${w * 100}%` }}
                    />
                  </div>
                ))}
              </div>
              <div className="fs-float-c rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
                <div className="flex items-end justify-between h-14">
                  {[0.3, 0.55, 0.4, 0.7, 0.5, 0.85, 0.65].map((h, i) => (
                    <div
                      key={i}
                      className="w-2.5 rounded-sm"
                      style={{
                        height: `${h * 100}%`,
                        background:
                          i % 2 === 0
                            ? 'rgba(255,255,255,0.1)'
                            : 'rgba(0,196,140,0.55)',
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
