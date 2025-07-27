'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function DesignSystemPage() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light')

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light')
    document.documentElement.classList.toggle('dark')
  }

  return (
    <div className={`min-h-screen bg-background transition-all duration-500 ${theme}`}>
      <div className="container py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-12">
          <div>
            <h1 className="text-6xl font-bold gradient-text mb-4">
              Design System
            </h1>
            <p className="text-lg text-muted-foreground">
              Comprehensive design tokens and components showcase
            </p>
          </div>
          <Button onClick={toggleTheme} className="btn-shine">
            {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
          </Button>
        </div>

        {/* Color Palette */}
        <Card className="mb-8 glass-card">
          <CardHeader>
            <CardTitle className="text-2xl">Color Palette</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Primary Colors */}
              <div>
                <h3 className="font-semibold mb-3">Primary</h3>
                <div className="space-y-2">
                  {[50, 100, 200, 300, 400, 500, 600, 700, 800, 900].map((shade) => (
                    <div key={shade} className="flex items-center gap-3">
                      <div 
                        className="w-12 h-8 rounded shadow-sm"
                        style={{ backgroundColor: `var(--brand-primary-${shade})` }}
                      />
                      <span className="text-sm font-mono">{shade}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Purple Colors */}
              <div>
                <h3 className="font-semibold mb-3">Purple</h3>
                <div className="space-y-2">
                  {[50, 100, 200, 300, 400, 500, 600, 700, 800, 900].map((shade) => (
                    <div key={shade} className="flex items-center gap-3">
                      <div 
                        className="w-12 h-8 rounded shadow-sm"
                        style={{ backgroundColor: `var(--brand-purple-${shade})` }}
                      />
                      <span className="text-sm font-mono">{shade}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Success Colors */}
              <div>
                <h3 className="font-semibold mb-3">Success</h3>
                <div className="space-y-2">
                  {[50, 200, 400, 500, 600, 800].map((shade) => (
                    <div key={shade} className="flex items-center gap-3">
                      <div 
                        className="w-12 h-8 rounded shadow-sm"
                        style={{ backgroundColor: `var(--color-success-${shade})` }}
                      />
                      <span className="text-sm font-mono">{shade}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Neutral Colors */}
              <div>
                <h3 className="font-semibold mb-3">Neutral</h3>
                <div className="space-y-2">
                  {[0, 50, 100, 200, 400, 600, 800, 900].map((shade) => (
                    <div key={shade} className="flex items-center gap-3">
                      <div 
                        className="w-12 h-8 rounded shadow-sm border"
                        style={{ backgroundColor: `var(--neutral-${shade})` }}
                      />
                      <span className="text-sm font-mono">{shade}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Typography */}
        <Card className="mb-8 glass-card">
          <CardHeader>
            <CardTitle className="text-2xl">Typography</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="text-9xl font-black">Heading 9XL</div>
              <div className="text-6xl font-bold">Heading 6XL</div>
              <div className="text-4xl font-bold">Heading 4XL</div>
              <div className="text-2xl font-semibold">Heading 2XL</div>
              <div className="text-xl font-medium">Heading XL</div>
              <div className="text-lg">Large Text</div>
              <div className="text-base">Base Text</div>
              <div className="text-sm text-muted-foreground">Small Text</div>
              <div className="text-xs text-muted-foreground">Extra Small Text</div>
            </div>
          </CardContent>
        </Card>

        {/* Gradients */}
        <Card className="mb-8 glass-card">
          <CardHeader>
            <CardTitle className="text-2xl">Gradients</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="h-24 gradient-primary rounded-lg flex items-center justify-center text-white font-semibold">
                Primary
              </div>
              <div className="h-24 gradient-secondary rounded-lg flex items-center justify-center text-white font-semibold">
                Secondary
              </div>
              <div className="h-24 gradient-success rounded-lg flex items-center justify-center text-white font-semibold">
                Success
              </div>
              <div className="h-24 gradient-to-r rounded-lg flex items-center justify-center text-white font-semibold">
                To Right
              </div>
              <div className="h-24 gradient-radial rounded-lg flex items-center justify-center text-white font-semibold">
                Radial
              </div>
              <div className="h-24 gradient-animated rounded-lg flex items-center justify-center text-white font-semibold">
                Animated
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Glass Effects */}
        <div className="relative mb-8 p-8 gradient-mesh rounded-2xl">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="glass p-6 rounded-xl">
              <h3 className="font-semibold text-white mb-2">Glass Light</h3>
              <p className="text-white/80">Standard glass effect with subtle blur</p>
            </div>
            <div className="glass-heavy p-6 rounded-xl">
              <h3 className="font-semibold text-white mb-2">Glass Heavy</h3>
              <p className="text-white/80">Heavy blur for dramatic effect</p>
            </div>
            <div className="frosted-glass p-6 rounded-xl">
              <h3 className="font-semibold text-white mb-2">Frosted Glass</h3>
              <p className="text-white/80">Saturated frosted glass effect</p>
            </div>
          </div>
        </div>

        {/* Animations */}
        <Card className="mb-8 glass-card">
          <CardHeader>
            <CardTitle className="text-2xl">Animations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Button className="animate-fade-in">Fade In</Button>
              <Button className="animate-slide-in-up">Slide Up</Button>
              <Button className="animate-bounce-in">Bounce In</Button>
              <Button className="animate-pulse">Pulse</Button>
              <Button className="hover-lift">Hover Lift</Button>
              <Button className="hover-grow">Hover Grow</Button>
              <Button className="hover-glow">Hover Glow</Button>
              <Button className="animate-wiggle">Wiggle</Button>
            </div>
          </CardContent>
        </Card>

        {/* Interactive Elements */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-2xl">Interactive Elements</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="flex flex-wrap gap-4">
                <Button>Default</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="destructive">Destructive</Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="card-interactive p-6 border rounded-lg">
                  <h3 className="font-semibold mb-2">Interactive Card</h3>
                  <p className="text-muted-foreground">Hover for lift effect</p>
                </div>
                <div className="card-glow p-6 border rounded-lg">
                  <h3 className="font-semibold mb-2">Glow Card</h3>
                  <p className="text-muted-foreground">Hover for glow effect</p>
                </div>
                <div className="glass-card">
                  <h3 className="font-semibold mb-2">Glass Card</h3>
                  <p className="text-white/80">Glassmorphism effect</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}