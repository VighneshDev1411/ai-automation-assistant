'use client'

import { AppLayout } from '@/components/layout/app-layout'
import { PageHeader } from '@/components/layout/page-header'
import { ResponsiveGrid, GridItem } from '@/components/layout/responsive-grid'
import {
  ResponsiveCard,
  ResponsiveCardGrid,
} from '@/components/ui/responsive-card'
import { ResponsiveContainer } from '@/components/layout/container'
import { Button } from '@/components/ui/button'
import { useBreakpoint } from '@/hooks/use-breakpoint'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Monitor,
  Tablet,
  Smartphone,
  Laptop,
  BarChart3,
  Users,
  Activity,
  TrendingUp,
} from 'lucide-react'

export default function LayoutTestPage() {
  const breakpoint = useBreakpoint()

  return (
    <AppLayout>
      <ResponsiveContainer>
        {/* Page Header */}
        <PageHeader
          title="Responsive Layout System"
          description="Testing mobile-first responsive design with adaptive layouts"
        >
          <Button>Create New</Button>
          <Button variant="outline">Export Data</Button>
        </PageHeader>

        {/* Breakpoint Indicator */}
        <Card className="mb-8 glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Current Breakpoint
              {breakpoint.isSm && <Smartphone className="h-5 w-5" />}
              {breakpoint.isMd && !breakpoint.isLg && (
                <Tablet className="h-5 w-5" />
              )}
              {breakpoint.isLg && !breakpoint.isXl && (
                <Laptop className="h-5 w-5" />
              )}
              {breakpoint.isXl && <Monitor className="h-5 w-5" />}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {breakpoint.active.toUpperCase()}
                </div>
                <div className="text-sm text-muted-foreground">Active</div>
              </div>
              <div className="text-center">
                <div className="text-lg">{breakpoint.isMd ? '✅' : '❌'}</div>
                <div className="text-sm text-muted-foreground">Desktop Nav</div>
              </div>
              <div className="text-center">
                <div className="text-lg">{!breakpoint.isMd ? '✅' : '❌'}</div>
                <div className="text-sm text-muted-foreground">Mobile Nav</div>
              </div>
              <div className="text-center">
                <div className="text-lg">{breakpoint.isLg ? '✅' : '❌'}</div>
                <div className="text-sm text-muted-foreground">Full Layout</div>
              </div>
            </div>
            <div className="mt-4 p-4 bg-muted rounded-lg">
              <h4 className="font-medium mb-2">Breakpoint Details:</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                <div>SM: {breakpoint.isSm ? '✅' : '❌'} (640px+)</div>
                <div>MD: {breakpoint.isMd ? '✅' : '❌'} (768px+)</div>
                <div>LG: {breakpoint.isLg ? '✅' : '❌'} (1024px+)</div>
                <div>XL: {breakpoint.isXl ? '✅' : '❌'} (1280px+)</div>
                <div>2XL: {breakpoint.is2Xl ? '✅' : '❌'} (1536px+)</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Responsive Grid Examples */}
        <div className="space-y-8">
          <div>
            <h2 className="text-2xl font-bold mb-4">Responsive Grid System</h2>

            <ResponsiveGrid
              cols={{ default: 1, md: 2, lg: 4 }}
              gap={6}
              className="mb-6"
            >
              <ResponsiveCard title="Revenue" interactive glassEffect>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold">$42,350</div>
                    <div className="text-sm text-muted-foreground">
                      +12% from last month
                    </div>
                  </div>
                  <BarChart3 className="h-8 w-8 text-primary" />
                </div>
              </ResponsiveCard>

              <ResponsiveCard title="Active Users" interactive glassEffect>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold">2,345</div>
                    <div className="text-sm text-muted-foreground">
                      +5% from last week
                    </div>
                  </div>
                  <Users className="h-8 w-8 text-green-500" />
                </div>
              </ResponsiveCard>

              <ResponsiveCard title="Performance" interactive glassEffect>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold">98.2%</div>
                    <div className="text-sm text-muted-foreground">
                      Uptime this month
                    </div>
                  </div>
                  <Activity className="h-8 w-8 text-blue-500" />
                </div>
              </ResponsiveCard>

              <ResponsiveCard title="Growth" interactive glassEffect>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold">+24%</div>
                    <div className="text-sm text-muted-foreground">
                      Quarter growth
                    </div>
                  </div>
                  <TrendingUp className="h-8 w-8 text-purple-500" />
                </div>
              </ResponsiveCard>
            </ResponsiveGrid>
          </div>

          {/* Complex Layout Example */}
          <div>
            <h2 className="text-2xl font-bold mb-4">
              Complex Responsive Layout
            </h2>

            <ResponsiveGrid cols={{ default: 1, lg: 3 }} gap={6}>
              {/* Main Content - Takes 2 columns on large screens */}
              <GridItem span={{ default: 1, lg: 2 }}>
                <ResponsiveCard title="Workflow Analytics" glassEffect>
                  <div className="space-y-4">
                    <div className="h-48 bg-gradient-mesh rounded-lg flex items-center justify-center">
                      <div className="text-center text-white">
                        <div className="text-6xl mb-2">📊</div>
                        <div className="text-lg font-semibold">
                          Chart Placeholder
                        </div>
                        <div className="text-sm opacity-80">
                          Responsive chart would go here
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="text-center p-4 bg-muted rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">
                          127
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Total Workflows
                        </div>
                      </div>
                      <div className="text-center p-4 bg-muted rounded-lg">
                        <div className="text-2xl font-bold text-green-600">
                          98%
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Success Rate
                        </div>
                      </div>
                      <div className="text-center p-4 bg-muted rounded-lg">
                        <div className="text-2xl font-bold text-purple-600">
                          1.2s
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Avg. Runtime
                        </div>
                      </div>
                    </div>
                  </div>
                </ResponsiveCard>
              </GridItem>

              {/* Sidebar Content */}
              <GridItem span={{ default: 1, lg: 1 }}>
                <div className="space-y-6">
                  <ResponsiveCard title="Quick Actions" glassEffect>
                    <div className="space-y-3">
                      <Button className="w-full justify-start">
                        Create Workflow
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full justify-start"
                      >
                        Import Data
                      </Button>
                      <Button variant="ghost" className="w-full justify-start">
                        View Reports
                      </Button>
                    </div>
                  </ResponsiveCard>

                  <ResponsiveCard title="Recent Activity" glassEffect>
                    <div className="space-y-3">
                      {[
                        {
                          action: 'Workflow completed',
                          time: '2 min ago',
                          status: 'success',
                        },
                        {
                          action: 'New integration added',
                          time: '1 hr ago',
                          status: 'info',
                        },
                        {
                          action: 'Error in Pipeline #3',
                          time: '3 hr ago',
                          status: 'error',
                        },
                      ].map((item, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-3 p-2 rounded"
                        >
                          <div
                            className={`w-2 h-2 rounded-full ${
                              item.status === 'success'
                                ? 'bg-green-500'
                                : item.status === 'error'
                                  ? 'bg-red-500'
                                  : 'bg-blue-500'
                            }`}
                          />
                          <div className="flex-1">
                            <div className="text-sm font-medium">
                              {item.action}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {item.time}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ResponsiveCard>
                </div>
              </GridItem>
            </ResponsiveGrid>
          </div>

          {/* Mobile-Optimized Cards */}
          <div>
            <h2 className="text-2xl font-bold mb-4">
              Mobile-Optimized Components
            </h2>

            <ResponsiveCardGrid className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 8 }, (_, i) => (
                <ResponsiveCard
                  key={i}
                  title={`Feature ${i + 1}`}
                  interactive
                  glassEffect
                >
                  <div className="text-center py-4">
                    <div className="text-3xl mb-2">
                      {['🚀', '⚡', '🎨', '📱', '🔒', '📊', '🤖', '🌐'][i]}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Responsive feature card that adapts to screen size
                    </div>
                  </div>
                </ResponsiveCard>
              ))}
            </ResponsiveCardGrid>
          </div>

          {/* ResponsiveContainer Examples */}
          <div>
            <h2 className="text-2xl font-bold mb-4">ResponsiveContainer Variations</h2>

            <div className="space-y-4">
              <ResponsiveContainer size="sm" className="bg-muted/50 rounded-lg p-4">
                <div className="text-center">
                  <h3 className="font-semibold">Small ResponsiveContainer</h3>
                  <p className="text-sm text-muted-foreground">
                    Max width: 768px
                  </p>
                </div>
              </ResponsiveContainer>

              <ResponsiveContainer size="md" className="bg-muted/50 rounded-lg p-4">
                <div className="text-center">
                  <h3 className="font-semibold">Medium ResponsiveContainer</h3>
                  <p className="text-sm text-muted-foreground">
                    Max width: 1024px
                  </p>
                </div>
              </ResponsiveContainer>

              <ResponsiveContainer size="lg" className="bg-muted/50 rounded-lg p-4">
                <div className="text-center">
                  <h3 className="font-semibold">Large ResponsiveContainer (Default)</h3>
                  <p className="text-sm text-muted-foreground">
                    Max width: 1280px
                  </p>
                </div>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Touch-Friendly Mobile Components */}
          <div>
            <h2 className="text-2xl font-bold mb-4">Touch-Friendly Elements</h2>

            <ResponsiveCard title="Mobile Interactions" glassEffect>
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Button size="lg" className="h-12 touch-manipulation">
                    Large Touch Target
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    className="h-12 touch-manipulation"
                  >
                    Outline Button
                  </Button>
                </div>

                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-medium mb-2">Touch Guidelines:</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• Minimum 44px touch targets</li>
                    <li>• Adequate spacing between elements</li>
                    <li>• Clear visual feedback on tap</li>
                    <li>• Optimized for thumb navigation</li>
                  </ul>
                </div>
              </div>
            </ResponsiveCard>
          </div>
        </div>
      </ResponsiveContainer>
    </AppLayout>
  )
}
