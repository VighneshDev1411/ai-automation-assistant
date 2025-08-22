export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left side - Modern hero section */}
      <div className="relative hidden lg:flex bg-gradient-to-br from-blue-600 via-purple-600 to-blue-800">
        {/* Background effects */}
        <div className="absolute inset-0 bg-black/20" />
        
        {/* Content */}
        <div className="relative z-10 flex items-center justify-center p-12">
          <div className="max-w-md text-center text-white">
            {/* Logo */}
            <div className="mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-2xl backdrop-blur mb-4">
                <span className="text-2xl font-bold">CF</span>
              </div>
              <h1 className="text-3xl font-bold">CogniFlow</h1>
              <p className="text-blue-100">Enterprise Grade Workflows</p>
            </div>

            {/* Hero content */}
            <div className="space-y-6">
              <h2 className="text-4xl font-bold leading-tight">
                Build Powerful 
                <span className="block text-yellow-300">AI Workflows</span>
              </h2>
              
              <p className="text-xl text-blue-100 leading-relaxed">
                Connect apps, automate processes, and let AI handle the complexity.
              </p>

              {/* Features */}
              <div className="grid gap-4 mt-8">
                <div className="flex items-center gap-3 text-left">
                  <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                    <span className="text-lg">⚡</span>
                  </div>
                  <span className="text-blue-100">10x faster automation</span>
                </div>
                <div className="flex items-center gap-3 text-left">
                  <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                    <span className="text-lg">🤖</span>
                  </div>
                  <span className="text-blue-100">AI-powered intelligence</span>
                </div>
                <div className="flex items-center gap-3 text-left">
                  <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                    <span className="text-lg">🔒</span>
                  </div>
                  <span className="text-blue-100">Enterprise security</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Clean form area */}
      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-6">
          {children}
        </div>
      </div>
    </div>
  )
}