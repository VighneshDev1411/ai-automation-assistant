// src/components/workflow/UXRefinements.tsx
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/components/ui/use-toast'
import {
  Accessibility,
  Eye,
  Keyboard,
  MousePointer,
  Volume2,
  Contrast,
  ZoomIn,
  Clock,
  Palette,
  Monitor,
  Smartphone,
  Tablet,
  Settings,
  CheckCircle,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Lightbulb,
  Users,
  Heart,
  Gauge
} from 'lucide-react'

interface AccessibilityTest {
  id: string
  name: string
  description: string
  category: 'color' | 'keyboard' | 'screen-reader' | 'motion' | 'timing'
  status: 'pass' | 'fail' | 'warning' | 'pending'
  score?: number
  details?: string
  suggestion?: string
}

interface UXMetric {
  id: string
  name: string
  value: number
  target: number
  unit: string
  status: 'good' | 'warning' | 'poor'
  trend: 'up' | 'down' | 'stable'
}

const mockAccessibilityTests: AccessibilityTest[] = [
  {
    id: '1',
    name: 'Color Contrast Ratio',
    description: 'Check if text has sufficient contrast against background',
    category: 'color',
    status: 'pass',
    score: 4.8,
    details: 'All text elements meet WCAG AA standards (4.5:1 minimum)',
    suggestion: 'Consider increasing contrast for better readability'
  },
  {
    id: '2',
    name: 'Keyboard Navigation',
    description: 'Verify all interactive elements are keyboard accessible',
    category: 'keyboard',
    status: 'warning',
    score: 3.2,
    details: 'Some workflow nodes lack proper tab order',
    suggestion: 'Add tabindex attributes to workflow builder nodes'
  },
  {
    id: '3',
    name: 'Screen Reader Support',
    description: 'Check if content is properly announced by screen readers',
    category: 'screen-reader',
    status: 'pass',
    score: 4.5,
    details: 'Most elements have appropriate ARIA labels',
    suggestion: 'Add more descriptive labels for complex interactions'
  },
  {
    id: '4',
    name: 'Motion Sensitivity',
    description: 'Respect user preferences for reduced motion',
    category: 'motion',
    status: 'fail',
    score: 2.1,
    details: 'Animations do not respect prefers-reduced-motion',
    suggestion: 'Add CSS media query for reduced motion preferences'
  },
  {
    id: '5',
    name: 'Timing Controls',
    description: 'Provide controls for time-sensitive content',
    category: 'timing',
    status: 'pass',
    score: 4.0,
    details: 'Auto-save and timeout warnings are implemented',
    suggestion: 'Consider adding more granular timing controls'
  }
]

const mockUXMetrics: UXMetric[] = [
  {
    id: '1',
    name: 'Page Load Time',
    value: 1.2,
    target: 2.0,
    unit: 's',
    status: 'good',
    trend: 'down'
  },
  {
    id: '2',
    name: 'Time to Interactive',
    value: 2.8,
    target: 3.0,
    unit: 's',
    status: 'good',
    trend: 'stable'
  },
  {
    id: '3',
    name: 'Cumulative Layout Shift',
    value: 0.15,
    target: 0.1,
    unit: '',
    status: 'warning',
    trend: 'up'
  },
  {
    id: '4',
    name: 'First Contentful Paint',
    value: 0.9,
    target: 1.8,
    unit: 's',
    status: 'good',
    trend: 'down'
  }
]

export function UXRefinements() {
  const [accessibilityTests, setAccessibilityTests] = useState<AccessibilityTest[]>(mockAccessibilityTests)
  const [uxMetrics, setUXMetrics] = useState<UXMetric[]>(mockUXMetrics)
  const [isRunningTests, setIsRunningTests] = useState(false)
  const [preferences, setPreferences] = useState({
    highContrast: false,
    reducedMotion: false,
    largeFonts: false,
    screenReader: false,
    keyboardOnly: false
  })
  const [fontSize, setFontSize] = useState([16])
  const [animationSpeed, setAnimationSpeed] = useState([1])
  const { toast } = useToast()

  const runAccessibilityTests = async () => {
    setIsRunningTests(true)
    
    // Simulate running tests
    for (let i = 0; i < accessibilityTests.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 800))
      
      setAccessibilityTests(prev => prev.map((test, index) => 
        index === i 
          ? { ...test, status: 'pending' as const }
          : test
      ))
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Update with results
    setAccessibilityTests(prev => prev.map(test => ({
      ...test,
      status: Math.random() > 0.3 ? 'pass' : Math.random() > 0.5 ? 'warning' : 'fail'
    })))
    
    setIsRunningTests(false)
    
    toast({
      title: 'Accessibility Tests Complete',
      description: 'All tests have been completed. Check results below.',
    })
  }

  const getTestStatusIcon = (status: string) => {
    switch (status) {
      case 'pass':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case 'fail':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'pending':
        return <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const getTestStatusBadge = (status: string) => {
    switch (status) {
      case 'pass':
        return <Badge className="badge-success">Pass</Badge>
      case 'warning':
        return <Badge className="badge-warning">Warning</Badge>
      case 'fail':
        return <Badge className="badge-error">Fail</Badge>
      case 'pending':
        return <Badge className="badge-info">Running</Badge>
      default:
        return <Badge className="badge-neutral">Pending</Badge>
    }
  }

  const getMetricStatusColor = (status: string) => {
    switch (status) {
      case 'good':
        return 'text-green-600 dark:text-green-400'
      case 'warning':
        return 'text-yellow-600 dark:text-yellow-400'
      case 'poor':
        return 'text-red-600 dark:text-red-400'
      default:
        return 'text-gray-600 dark:text-gray-400'
    }
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <span className="text-red-500">↗</span>
      case 'down':
        return <span className="text-green-500">↘</span>
      case 'stable':
        return <span className="text-gray-500">→</span>
      default:
        return null
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'color':
        return <Palette className="h-4 w-4" />
      case 'keyboard':
        return <Keyboard className="h-4 w-4" />
      case 'screen-reader':
        return <Volume2 className="h-4 w-4" />
      case 'motion':
        return <MousePointer className="h-4 w-4" />
      case 'timing':
        return <Clock className="h-4 w-4" />
      default:
        return <Settings className="h-4 w-4" />
    }
  }

  const overallScore = accessibilityTests.reduce((sum, test) => sum + (test.score || 0), 0) / accessibilityTests.length

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Accessibility className="h-5 w-5" />
              <CardTitle>UX Refinement & Accessibility</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={runAccessibilityTests}
                disabled={isRunningTests}
                variant="outline"
              >
                {isRunningTests ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Running Tests...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Run Accessibility Tests
                  </>
                )}
              </Button>
            </div>
          </div>
          <CardDescription>
            Ensure your workflow builder meets accessibility standards and provides an excellent user experience.
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs defaultValue="accessibility" className="space-y-6">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="accessibility">Accessibility</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="preferences">User Preferences</TabsTrigger>
          <TabsTrigger value="testing">Device Testing</TabsTrigger>
        </TabsList>

        {/* Accessibility Tab */}
        <TabsContent value="accessibility" className="space-y-6">
          {/* Overall Score */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gauge className="h-5 w-5" />
                Accessibility Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center">
                <div className="relative w-32 h-32">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-primary">
                        {overallScore.toFixed(1)}
                      </div>
                      <div className="text-sm text-muted-foreground">out of 5.0</div>
                    </div>
                  </div>
                  <svg className="w-32 h-32 transform -rotate-90">
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="none"
                      className="text-muted/30"
                    />
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="none"
                      strokeDasharray={`${(overallScore / 5) * 351.86} 351.86`}
                      className="text-primary"
                    />
                  </svg>
                </div>
              </div>
              
              <div className="mt-6 grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-red-600">
                    {accessibilityTests.filter(t => t.status === 'fail').length}
                  </div>
                  <div className="text-sm text-muted-foreground">Failed</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Test Results */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Test Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {accessibilityTests.map(test => (
                  <Card key={test.id} className="clean-card">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className="flex items-center gap-2 mt-1">
                            {getCategoryIcon(test.category)}
                            {getTestStatusIcon(test.status)}
                          </div>
                          
                          <div className="space-y-2">
                            <div className="flex items-center gap-3">
                              <h3 className="font-semibold">{test.name}</h3>
                              {getTestStatusBadge(test.status)}
                              {test.score && (
                                <Badge variant="outline" className="text-xs">
                                  {test.score.toFixed(1)}/5.0
                                </Badge>
                              )}
                            </div>
                            
                            <p className="text-sm text-muted-foreground">
                              {test.description}
                            </p>
                            
                            {test.details && (
                              <p className="text-sm bg-muted/30 p-2 rounded">
                                {test.details}
                              </p>
                            )}
                            
                            {test.suggestion && (
                              <div className="flex items-start gap-2 text-sm text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/20 p-2 rounded">
                                <Lightbulb className="h-4 w-4 mt-0.5" />
                                <span>{test.suggestion}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <Button size="sm" variant="outline">
                          <Eye className="h-4 w-4 mr-1" />
                          Details
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-6">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gauge className="h-5 w-5" />
                UX Performance Metrics
              </CardTitle>
              <CardDescription>
                Key metrics that impact user experience and workflow builder performance.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {uxMetrics.map(metric => (
                  <Card key={metric.id} className="clean-card">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold">{metric.name}</h3>
                        <div className="flex items-center gap-1">
                          {getTrendIcon(metric.trend)}
                          <Badge className={
                            metric.status === 'good' ? 'badge-success' :
                            metric.status === 'warning' ? 'badge-warning' : 'badge-error'
                          }>
                            {metric.status}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className={`text-2xl font-bold ${getMetricStatusColor(metric.status)}`}>
                          {metric.value}{metric.unit}
                        </div>
                        
                        <div className="text-sm text-muted-foreground">
                          Target: {metric.target}{metric.unit}
                        </div>
                        
                        <div className="w-full bg-muted/30 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              metric.status === 'good' ? 'bg-green-500' :
                              metric.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                            style={{
                              width: `${Math.min((metric.value / metric.target) * 100, 100)}%`
                            }}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Performance Recommendations */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5" />
                Performance Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded border border-yellow-200 dark:border-yellow-800">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                  <div>
                    <div className="font-medium text-yellow-800 dark:text-yellow-200">
                      Reduce Layout Shifts
                    </div>
                    <div className="text-sm text-yellow-700 dark:text-yellow-300">
                      Consider adding skeleton loaders for workflow nodes to prevent layout shifts during loading.
                    </div>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-950/20 rounded border border-green-200 dark:border-green-800">
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
                  <div>
                    <div className="font-medium text-green-800 dark:text-green-200">
                      Excellent Load Times
                    </div>
                    <div className="text-sm text-green-700 dark:text-green-300">
                      Your application loads quickly and provides immediate user feedback.
                    </div>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-950/20 rounded border border-blue-200 dark:border-blue-800">
                  <Lightbulb className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                  <div>
                    <div className="font-medium text-blue-800 dark:text-blue-200">
                      Optimize Bundle Size
                    </div>
                    <div className="text-sm text-blue-700 dark:text-blue-300">
                      Consider code splitting for the workflow builder to reduce initial bundle size.
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* User Preferences Tab */}
        <TabsContent value="preferences" className="space-y-6">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Accessibility Preferences
              </CardTitle>
              <CardDescription>
                Customize the interface to meet individual accessibility needs.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>High Contrast Mode</Label>
                      <div className="text-sm text-muted-foreground">
                        Increase contrast for better visibility
                      </div>
                    </div>
                    <Switch
                      checked={preferences.highContrast}
                      onCheckedChange={(checked) =>
                        setPreferences(prev => ({ ...prev, highContrast: checked }))
                      }
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Reduced Motion</Label>
                      <div className="text-sm text-muted-foreground">
                        Minimize animations and transitions
                      </div>
                    </div>
                    <Switch
                      checked={preferences.reducedMotion}
                      onCheckedChange={(checked) =>
                        setPreferences(prev => ({ ...prev, reducedMotion: checked }))
                      }
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Large Fonts</Label>
                      <div className="text-sm text-muted-foreground">
                        Increase font size for better readability
                      </div>
                    </div>
                    <Switch
                      checked={preferences.largeFonts}
                      onCheckedChange={(checked) =>
                        setPreferences(prev => ({ ...prev, largeFonts: checked }))
                      }
                    />
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Screen Reader Support</Label>
                      <div className="text-sm text-muted-foreground">
                        Enhanced screen reader announcements
                      </div>
                    </div>
                    <Switch
                      checked={preferences.screenReader}
                      onCheckedChange={(checked) =>
                        setPreferences(prev => ({ ...prev, screenReader: checked }))
                      }
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Keyboard Only Navigation</Label>
                      <div className="text-sm text-muted-foreground">
                        Optimize for keyboard-only users
                      </div>
                    </div>
                    <Switch
                      checked={preferences.keyboardOnly}
                      onCheckedChange={(checked) =>
                        setPreferences(prev => ({ ...prev, keyboardOnly: checked }))
                      }
                    />
                  </div>
                </div>
              </div>
              
              <div className="space-y-4 pt-4 border-t">
                <div className="space-y-2">
                  <Label>Font Size: {fontSize[0]}px</Label>
                  <Slider
                    value={fontSize}
                    onValueChange={setFontSize}
                    max={24}
                    min={12}
                    step={1}
                    className="w-full"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Animation Speed: {animationSpeed[0]}x</Label>
                  <Slider
                    value={animationSpeed}
                    onValueChange={setAnimationSpeed}
                    max={2}
                    min={0.1}
                    step={0.1}
                    className="w-full"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Preview */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Preview</CardTitle>
              <CardDescription>
                See how your preferences affect the interface.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div 
                className={`p-4 border rounded-lg transition-all ${
                  preferences.highContrast ? 'bg-white text-black border-black dark:bg-black dark:text-white dark:border-white' : 'bg-muted/30'
                }`}
                style={{
                  fontSize: preferences.largeFonts ? `${fontSize[0] * 1.2}px` : `${fontSize[0]}px`,
                  animationDuration: preferences.reducedMotion ? '0s' : `${1 / animationSpeed[0]}s`
                }}
              >
                <h3 className="font-semibold mb-2">Sample Workflow Node</h3>
                <p className="text-sm mb-3">
                  This is how your workflow builder will appear with current accessibility settings.
                </p>
                <Button size="sm" className={preferences.reducedMotion ? '' : 'animate-pulse'}>
                  Sample Action
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Device Testing Tab */}
        <TabsContent value="testing" className="space-y-6">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Monitor className="h-5 w-5" />
                Device & Browser Testing
              </CardTitle>
              <CardDescription>
                Test workflow builder across different devices and browsers.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { name: 'Desktop', icon: Monitor, status: 'pass', details: 'Chrome, Firefox, Safari' },
                  { name: 'Tablet', icon: Tablet, status: 'warning', details: 'iPad, Android tablets' },
                  { name: 'Mobile', icon: Smartphone, status: 'fail', details: 'iOS Safari, Chrome Mobile' }
                ].map(device => (
                  <Card key={device.name} className="clean-card">
                    <CardContent className="p-4 text-center">
                      <device.icon className="h-12 w-12 mx-auto mb-3 text-primary" />
                      <h3 className="font-semibold mb-2">{device.name}</h3>
                      <div className="mb-3">
                        {getTestStatusBadge(device.status)}
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        {device.details}
                      </p>
                      <Button size="sm" variant="outline" className="w-full">
                        Test Now
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Browser Compatibility */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Browser Compatibility</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { name: 'Chrome', version: '120+', status: 'pass', usage: '65%' },
                  { name: 'Firefox', version: '121+', status: 'pass', usage: '12%' },
                  { name: 'Safari', version: '17+', status: 'warning', usage: '18%' },
                  { name: 'Edge', version: '120+', status: 'pass', usage: '4%' },
                  { name: 'Opera', version: '106+', status: 'pass', usage: '1%' }
                ].map(browser => (
                  <div key={browser.name} className="flex items-center justify-between p-3 bg-muted/30 rounded">
                    <div className="flex items-center gap-3">
                      {getTestStatusIcon(browser.status)}
                      <div>
                        <div className="font-medium">{browser.name}</div>
                        <div className="text-sm text-muted-foreground">Version {browser.version}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">{browser.usage}</div>
                      <div className="text-xs text-muted-foreground">usage</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Responsive Testing */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Responsive Breakpoints</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { name: 'Mobile', width: '375px', status: 'warning', issues: ['Node spacing too tight', 'Touch targets too small'] },
                  { name: 'Tablet', width: '768px', status: 'pass', issues: [] },
                  { name: 'Desktop', width: '1024px+', status: 'pass', issues: [] }
                ].map(breakpoint => (
                  <div key={breakpoint.name} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        {getTestStatusIcon(breakpoint.status)}
                        <div>
                          <div className="font-medium">{breakpoint.name}</div>
                          <div className="text-sm text-muted-foreground">{breakpoint.width}</div>
                        </div>
                      </div>
                      {getTestStatusBadge(breakpoint.status)}
                    </div>
                    
                    {breakpoint.issues.length > 0 && (
                      <div className="mt-3 space-y-1">
                        {breakpoint.issues.map((issue, index) => (
                          <div key={index} className="text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
                            <XCircle className="h-3 w-3" />
                            {issue}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Action Buttons */}
      <Card className="glass-card">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
            <div className="text-sm text-muted-foreground">
              Last tested: {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}
            </div>
            
            <div className="flex gap-3">
              <Button variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Re-run All Tests
              </Button>
              
              <Button className="btn-shine">
                <Heart className="h-4 w-4 mr-2" />
                Apply Improvements
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}green-600">
                    {accessibilityTests.filter(t => t.status === 'pass').length}
                  </div>
                  <div className="text-sm text-muted-foreground">Passed</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-yellow-600">
                    {accessibilityTests.filter(t => t.status === 'warning').length}
                  </div>
                  <div className="text-sm text-muted-foreground">Warnings</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-