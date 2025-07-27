import { Metadata } from 'next'
import React from 'react'

export const metadata: Metadata = {
  title: 'Authentication | AI Automation Platform',
  description: 'Sign in to access your automation workflows and AI agents',
}

const AuthLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="min-h-screen flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-mesh relative overflow-hidden">
        <div className="absolute inset-0 bg-black/20" />
        <div className="relative z-10 flex flex-col justify-center px-16 text-white">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <span className="text-white font-bold text-xl">AI</span>
              </div>
              <span className="text-2xl font-bold">Automation Platform</span>
            </div>
            <h1 className="text-4xl font-bold mb-4">
              Automate Everything with AI
            </h1>
            <p className="text-xl text-white/80 mb-8">
              Connect 20+ apps, build workflows, and let AI agents handle the
              rest.
            </p>
          </div>

          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                <span className="text-2xl">🚀</span>
              </div>
              <div>
                <h3 className="font-semibold">10x Faster Workflows</h3>
                <p className="text-white/70">
                  Automate repetitive tasks in minutes
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                <span className="text-2xl">🤖</span>
              </div>
              <div>
                <h3 className="font-semibold">AI-Powered Intelligence</h3>
                <p className="text-white/70">
                  Smart agents that learn and adapt
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                <span className="text-2xl">🔒</span>
              </div>
              <div>
                <h3 className="font-semibold">Enterprise Security</h3>
                <p className="text-white/70">
                  SOC 2 compliant with advanced encryption
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Auth forms */}
      <div className="flex-1 flex flex-col justify-center px-8 sm:px-16 lg:px-24">
        <div className="w-full max-w-md mx-auto">{children}</div>
      </div>
    </div>
  )
}

export default AuthLayout