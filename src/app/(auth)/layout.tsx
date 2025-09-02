// src/app/(auth)/layout.tsx
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left side - Modern hero section with improved alignment */}
      <div className="relative hidden lg:flex bg-gradient-to-br from-blue-600 via-purple-600 to-blue-800">
        {/* Background effects */}
        <div className="absolute inset-0 bg-black/20" />
        
        {/* Improved Content Container with perfect centering */}
        <div className="relative z-10 flex items-center justify-center p-8 xl:p-12 w-full">
          <div className="text-white flex flex-col items-center justify-center max-w-md mx-auto">
            {/* Logo Section - Better proportions and spacing */}
            <div className="flex flex-col items-center text-center mb-12">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 rounded-3xl backdrop-blur mb-6 hover:scale-105 transition-transform duration-300">
                <span className="text-3xl font-bold">CF</span>
              </div>
              <div className="space-y-2">
                <h1 className="text-4xl font-bold tracking-tight">CogniFlow</h1>
                <p className="text-blue-100 text-lg font-medium">Enterprise Grade Workflows</p>
              </div>
            </div>

            {/* Hero Content - Better vertical rhythm */}
            <div className="text-center space-y-8">
              <div className="space-y-4">
                <h2 className="text-4xl xl:text-5xl font-bold leading-tight tracking-tight">
                  Build Powerful 
                  <span className="block text-yellow-300 mt-1">AI Workflows</span>
                </h2>
                
                <p className="text-xl text-blue-100 leading-relaxed">
                  Connect apps, automate processes, and let AI handle the complexity.
                </p>
              </div>

              {/* Features - Perfect center alignment */}
              <div className="space-y-4">
                <div className="flex items-center justify-center gap-4 p-3 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 hover:bg-white/15 transition-all duration-300">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="text-xl">⚡</span>
                  </div>
                  <span className="text-blue-100 font-medium">10x faster automation</span>
                </div>
                
                <div className="flex items-center justify-center gap-4 p-3 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 hover:bg-white/15 transition-all duration-300">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="text-xl">🤖</span>
                  </div>
                  <span className="text-blue-100 font-medium">AI-powered intelligence</span>
                </div>
                
                <div className="flex items-center justify-center gap-4 p-3 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 hover:bg-white/15 transition-all duration-300">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="text-xl">🔒</span>
                  </div>
                  <span className="text-blue-100 font-medium">Enterprise security</span>
                </div>
              </div>

              {/* Additional testimonial/trust element */}
              {/* <div className="pt-8 border-t border-white/10">
                <div className="flex items-center justify-center gap-2 text-blue-100">
                  <div className="flex -space-x-2">
                    <div className="w-8 h-8 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full border-2 border-white/20"></div>
                    <div className="w-8 h-8 bg-gradient-to-r from-green-400 to-blue-500 rounded-full border-2 border-white/20"></div>
                    <div className="w-8 h-8 bg-gradient-to-r from-purple-400 to-pink-500 rounded-full border-2 border-white/20"></div>
                  </div>
                  <span className="text-sm font-medium ml-2">Trusted by 10+ teams</span>
                </div>
              </div> */}
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