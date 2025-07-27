import Link from 'next/link'
import { ThemeToggle } from '@/components/common/theme-toggle'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted transition-all duration-500">
      <div className="container py-8">
        {/* Header with Login Button */}
        <div className="flex justify-between items-center mb-12">
          <div>
            <h1 className="text-6xl font-bold gradient-text mb-4">
              AI Automation Platform
            </h1>
            <p className="text-lg text-muted-foreground">
              Enterprise-grade workflow automation with AI agents
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="px-6 py-2 rounded-lg border border-border hover:bg-accent transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="px-6 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Get Started
            </Link>
            <ThemeToggle variant="icon" />
          </div>
        </div>

        {/* Progress Cards */}
        <div className="space-y-4 mb-8">
          <div className="glass-card p-6 hover-lift">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-lg mb-2">
                  ✅ Authentication System Complete
                </h3>
                <p className="text-muted-foreground">
                  Beautiful login/register pages with social auth and validation
                </p>
              </div>
              <span className="text-2xl font-bold text-green-500">Hour 9</span>
            </div>
          </div>

          <div className="glass-card p-6 hover-lift opacity-60">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-lg mb-2">
                  🔧 Registration Flow
                </h3>
                <p className="text-muted-foreground">
                  Complete user onboarding with password strength and validation
                </p>
              </div>
              <span className="text-2xl font-bold text-gray-400">Hour 10</span>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4">
          <Link
            href="/profile"
            className="glass-card p-6 hover-lift hover-glow transition-all duration-300 group"
          >
            <div className="text-center">
              <div className="text-3xl mb-2 group-hover:animate-bounce-in">
                👤
              </div>
              <h3 className="font-semibold mb-1">Profile</h3>
              <p className="text-sm text-muted-foreground">User info</p>
            </div>
          </Link>

          <Link
            href="/settings"
            className="glass-card p-6 hover-lift hover-glow transition-all duration-300 group"
          >
            <div className="text-center">
              <div className="text-3xl mb-2 group-hover:animate-bounce-in">
                ⚙️
              </div>
              <h3 className="font-semibold mb-1">Settings</h3>
              <p className="text-sm text-muted-foreground">Account</p>
            </div>
          </Link>

          <Link
            href="/login"
            className="glass-card p-6 hover-lift hover-glow transition-all duration-300 group"
          >
            <div className="text-center">
              <div className="text-3xl mb-2 group-hover:animate-bounce-in">
                🔐
              </div>
              <h3 className="font-semibold mb-1">Login</h3>
              <p className="text-sm text-muted-foreground">Sign in</p>
            </div>
          </Link>

          <Link
            href="/register"
            className="glass-card p-6 hover-lift hover-glow transition-all duration-300 group"
          >
            <div className="text-center">
              <div className="text-3xl mb-2 group-hover:animate-bounce-in">
                📝
              </div>
              <h3 className="font-semibold mb-1">Register</h3>
              <p className="text-sm text-muted-foreground">Sign up</p>
            </div>
          </Link>

          <Link
            href="/design-system"
            className="glass-card p-6 hover-lift hover-glow transition-all duration-300 group"
          >
            <div className="text-center">
              <div className="text-3xl mb-2 group-hover:animate-bounce-in">
                🎨
              </div>
              <h3 className="font-semibold mb-1">Design System</h3>
              <p className="text-sm text-muted-foreground">Colors</p>
            </div>
          </Link>

          <Link
            href="/theme-test"
            className="glass-card p-6 hover-lift hover-glow transition-all duration-300 group"
          >
            <div className="text-center">
              <div className="text-3xl mb-2 group-hover:animate-bounce-in">
                🌙
              </div>
              <h3 className="font-semibold mb-1">Theme Test</h3>
              <p className="text-sm text-muted-foreground">Light/dark</p>
            </div>
          </Link>

          <Link
            href="/layout-test"
            className="glass-card p-6 hover-lift hover-glow transition-all duration-300 group"
          >
            <div className="text-center">
              <div className="text-3xl mb-2 group-hover:animate-bounce-in">
                📱
              </div>
              <h3 className="font-semibold mb-1">Layout Test</h3>
              <p className="text-sm text-muted-foreground">Responsive</p>
            </div>
          </Link>

          <Link
            href="/components"
            className="glass-card p-6 hover-lift hover-glow transition-all duration-300 group"
          >
            <div className="text-center">
              <div className="text-3xl mb-2 group-hover:animate-bounce-in">
                🧩
              </div>
              <h3 className="font-semibold mb-1">Components</h3>
              <p className="text-sm text-muted-foreground">UI library</p>
            </div>
          </Link>

          <Link
            href="/test-supabase"
            className="glass-card p-6 hover-lift hover-glow transition-all duration-300 group"
          >
            <div className="text-center">
              <div className="text-3xl mb-2 group-hover:animate-bounce-in">
                🔧
              </div>
              <h3 className="font-semibold mb-1">Supabase</h3>
              <p className="text-sm text-muted-foreground">Database</p>
            </div>
          </Link>

          <Link
            href="/onboarding"
            className="glass-card p-6 hover-lift hover-glow transition-all duration-300 group"
          >
            <div className="text-center">
              <div className="text-3xl mb-2 group-hover:animate-bounce-in">
                🚀
              </div>
              <h3 className="font-semibold mb-1">Onboarding</h3>
              <p className="text-sm text-muted-foreground">Setup wizard</p>
            </div>
          </Link>
        </div>

        {/* Feature Highlights */}
        <div className="mt-16 text-center">
          <h2 className="text-3xl font-bold mb-8 gradient-text">
            Ready to Get Started?
          </h2>
          <div className="max-w-2xl mx-auto">
            <p className="text-lg text-muted-foreground mb-8">
              Join thousands of teams already automating their workflows with
              AI-powered intelligence.
            </p>
            <div className="flex gap-4 justify-center">
              <Link
                href="/register"
                className="px-8 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
              >
                Start Free Trial
              </Link>
              <Link
                href="/login"
                className="px-8 py-3 border border-border rounded-lg hover:bg-accent transition-colors font-medium"
              >
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
