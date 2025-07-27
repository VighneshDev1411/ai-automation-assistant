'use client'

import { useTheme } from '@/hooks/use-theme'
import { ThemeToggle } from '@/components/common/theme-toggle'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useEffect, useState } from 'react'

export default function ThemeTestPage() {
  const { theme, resolvedTheme, systemTheme, setTheme, toggleTheme } =
    useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background transition-all duration-500">
      <div className="container py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-12">
          <div>
            <h1 className="text-6xl font-bold gradient-text mb-4">
              Theme System Test
            </h1>
            <p className="text-lg text-muted-foreground">
              Test the advanced theme switching functionality
            </p>
          </div>
          <ThemeToggle variant="default" />
        </div>

        {/* Theme Status */}
        <Card className="mb-8 glass-card">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Theme Status
              <ThemeToggle variant="icon" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 bg-muted rounded-lg">
                <div className="text-sm text-muted-foreground">
                  Current Theme
                </div>
                <div className="text-xl font-semibold capitalize">{theme}</div>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <div className="text-sm text-muted-foreground">
                  Resolved Theme
                </div>
                <div className="text-xl font-semibold capitalize">
                  {resolvedTheme}
                </div>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <div className="text-sm text-muted-foreground">
                  System Theme
                </div>
                <div className="text-xl font-semibold capitalize">
                  {systemTheme}
                </div>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <div className="text-sm text-muted-foreground">HTML Class</div>
                <div className="text-xl font-semibold">
                  {document.documentElement.className.includes('dark')
                    ? 'dark'
                    : 'light'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Theme Controls */}
        <Card className="mb-8 glass-card">
          <CardHeader>
            <CardTitle>Theme Controls</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
                <div className="flex flex-wrap gap-4">
                  <Button onClick={toggleTheme} variant="outline">
                    Toggle Theme
                  </Button>
                  <Button
                    onClick={() => setTheme('light')}
                    variant={theme === 'light' ? 'default' : 'outline'}
                  >
                    Light Mode
                  </Button>
                  <Button
                    onClick={() => setTheme('dark')}
                    variant={theme === 'dark' ? 'default' : 'outline'}
                  >
                    Dark Mode
                  </Button>
                  <Button
                    onClick={() => setTheme('system')}
                    variant={theme === 'system' ? 'default' : 'outline'}
                  >
                    System Mode
                  </Button>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-4">
                  Theme Toggle Variants
                </h3>
                <div className="flex flex-wrap gap-6 items-center">
                  <div className="flex flex-col items-center gap-2">
                    <ThemeToggle variant="icon" />
                    <span className="text-sm text-muted-foreground">Icon</span>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <ThemeToggle variant="default" />
                    <span className="text-sm text-muted-foreground">
                      Default
                    </span>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <ThemeToggle variant="button" />
                    <span className="text-sm text-muted-foreground">
                      Button Group
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Visual Examples */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Color Examples */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Colors</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded bg-primary"></div>
                  <span className="text-sm">Primary</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded bg-secondary"></div>
                  <span className="text-sm">Secondary</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded bg-muted"></div>
                  <span className="text-sm">Muted</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded bg-accent"></div>
                  <span className="text-sm">Accent</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Typography Examples */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Typography</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <h1 className="text-2xl font-bold">Heading 1</h1>
                <h2 className="text-xl font-semibold">Heading 2</h2>
                <h3 className="text-lg font-medium">Heading 3</h3>
                <p className="text-base">Body text</p>
                <p className="text-sm text-muted-foreground">Muted text</p>
              </div>
            </CardContent>
          </Card>

          {/* Interactive Examples */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Interactive</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Button className="w-full">Primary Button</Button>
                <Button variant="secondary" className="w-full">
                  Secondary Button
                </Button>
                <Button variant="outline" className="w-full">
                  Outline Button
                </Button>
                <Button variant="ghost" className="w-full">
                  Ghost Button
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Gradient Examples */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Gradients</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="h-12 gradient-primary rounded-lg flex items-center justify-center text-white text-sm font-medium">
                  Primary Gradient
                </div>
                <div className="h-12 gradient-secondary rounded-lg flex items-center justify-center text-white text-sm font-medium">
                  Secondary Gradient
                </div>
                <div className="h-12 gradient-animated rounded-lg flex items-center justify-center text-white text-sm font-medium">
                  Animated Gradient
                </div>
              </div>
            </CardContent>
          </Card>
          {/* Glass Effects */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Glass Effects</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative h-32 gradient-mesh rounded-lg p-4">
                <div className="glass p-3 rounded text-white text-sm">
                  Standard Glass
                </div>
                <div className="glass-heavy p-3 rounded text-white text-sm mt-2">
                  Heavy Glass
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Animation Examples */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Animations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="p-3 bg-muted rounded hover-lift cursor-pointer">
                  Hover Lift
                </div>
                <div className="p-3 bg-muted rounded hover-grow cursor-pointer">
                  Hover Grow
                </div>
                <div className="p-3 bg-muted rounded hover-glow cursor-pointer">
                  Hover Glow
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Performance Info */}
        <Card className="mt-8 glass-card">
          <CardHeader>
            <CardTitle>Performance & Features</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-3">✨ Features</h3>
                <ul className="space-y-2 text-sm">
                  <li>✅ System preference detection</li>
                  <li>✅ Persistent storage</li>
                  <li>✅ Smooth transitions (300ms)</li>
                  <li>✅ SSR-safe implementation</li>
                  <li>✅ Custom event emission</li>
                  <li>✅ Analytics tracking ready</li>
                  <li>✅ Multiple toggle variants</li>
                  <li>✅ Accessibility compliant</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-3">🎨 Visual Effects</h3>
                <ul className="space-y-2 text-sm">
                  <li>✅ Glassmorphism effects</li>
                  <li>✅ Gradient backgrounds</li>
                  <li>✅ Smooth color transitions</li>
                  <li>✅ Dynamic theme-color meta</li>
                  <li>✅ Icon rotation animations</li>
                  <li>✅ Backdrop blur support</li>
                  <li>✅ CSS custom properties</li>
                  <li>✅ Reduced motion support</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
