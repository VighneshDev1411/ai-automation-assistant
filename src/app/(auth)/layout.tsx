// src/app/(auth)/layout.tsx
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left side - Stunning animated hero section */}
      <div className="relative hidden lg:flex bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 dark:from-indigo-900 dark:via-purple-900 dark:to-pink-900 overflow-hidden h-screen sticky top-0">
        {/* Animated gradient orbs */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl animate-pulse"></div>
          <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-purple-400 rounded-full mix-blend-multiply filter blur-3xl animate-pulse animation-delay-2000"></div>
          <div className="absolute bottom-1/4 left-1/3 w-96 h-96 bg-pink-400 rounded-full mix-blend-multiply filter blur-3xl animate-pulse animation-delay-4000"></div>
        </div>

        {/* Grid pattern overlay */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjA1IiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-40"></div>

        {/* Content Container */}
        <div className="relative z-10 flex flex-col justify-between p-8 xl:p-12 w-full h-full">
          {/* Top - Logo */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-xl rounded-2xl flex items-center justify-center border border-white/30 shadow-2xl">
              <span className="text-2xl font-black text-white">✨</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">CogniFlow</h1>
              <p className="text-white/70 text-xs font-medium">AI Automation Platform</p>
            </div>
          </div>

          {/* Middle - Hero Content */}
          <div className="space-y-6 max-w-lg flex-1 flex flex-col justify-center">
            <div className="space-y-3">
              <h2 className="text-4xl xl:text-5xl font-bold text-white leading-tight">
                Automate<br />
                <span className="bg-gradient-to-r from-yellow-200 via-pink-200 to-blue-200 bg-clip-text text-transparent">
                  Everything
                </span>
              </h2>

              <p className="text-lg text-white/90 leading-relaxed font-light">
                Build powerful AI-driven workflows in minutes. Connect your tools, automate processes, and scale effortlessly.
              </p>
            </div>

            {/* Feature pills */}
            <div className="flex flex-wrap gap-2">
              {['No-code builder', 'AI-powered', '50+ integrations', 'Enterprise ready'].map((feature, idx) => (
                <div key={idx} className="px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-xs font-medium hover:bg-white/20 transition-all duration-300 cursor-default">
                  {feature}
                </div>
              ))}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-0.5">
                <div className="text-2xl font-bold text-white">10K+</div>
                <div className="text-white/70 text-xs">Workflows</div>
              </div>
              <div className="space-y-0.5">
                <div className="text-2xl font-bold text-white">99.9%</div>
                <div className="text-white/70 text-xs">Uptime</div>
              </div>
              <div className="space-y-0.5">
                <div className="text-2xl font-bold text-white">24/7</div>
                <div className="text-white/70 text-xs">Support</div>
              </div>
            </div>
          </div>

          {/* Bottom - Trust indicator */}
          <div className="flex-shrink-0">
            <div className="flex items-center justify-center gap-3 text-white/80">
              <div className="flex -space-x-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-cyan-400 border-2 border-white/20"></div>
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 border-2 border-white/20"></div>
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-orange-400 border-2 border-white/20"></div>
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-emerald-400 border-2 border-white/20"></div>
              </div>
              <div className="text-sm">
                <span className="font-semibold text-white">Trusted by teams worldwide</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Clean form area with better spacing */}
      <div className="flex items-center justify-center p-6 lg:p-8">
        <div className="w-full max-w-md space-y-6">
          {children}
        </div>
      </div>
    </div>
  )
}